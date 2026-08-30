# Archivar la web con Git: Construyendo un crawler e indexador histórico direccionable por contenido

*Publicado: 30 de agosto de 2026 · Categoría: Sistemas & Arquitectura · Tiempo de lectura: ~6 min*
*Etiquetas: Git, Web Archiving, Crawlers, Sistemas, C99, Arquitectura*

---

La web moderna es notoriamente efímera. Las páginas mutan en silencio, la documentación desaparece durante rediseños corporativos, los términos de servicio se actualizan sin dejar diffs y los links se rompen a una velocidad descomunal.

Aunque servicios públicos como la Wayback Machine de Internet Archive son brutales para preservar la historia visual, están pensados para ver páginas en el navegador y no para **queries programáticas locales, diffs instantáneos en la terminal e integración con pipelines UNIX automatizados**.

Últimamente he estado diseñando e investigando la arquitectura de una herramienta dedicada a crawlear, versionar e indexar el historial web directamente dentro de **repositorios Git**.

Aquí te comparto los hallazgos técnicos, la mecánica interna y las consideraciones de arquitectura detrás de usar Git como un motor de archivado web distribuido y direccionable por contenido.

---

## 1. ¿Por qué usar Git como motor de storage histórico?

En el fondo, Git no es sólo un sistema de control de versiones para código; es un **sistema de archivos estructurado como grafo acíclico dirigido (DAG) y direccionable por contenido**, optimizado a muerte para rastrear texto en evolución.

```
+-------------------------------------------------------------+
| CRAWLER PIPELINE                                            |
|                                                             |
| URL Fetch -> Sanitización DOM -> Normalización Markdown     |
+-------------------------------------------------------------+
                              |
                   Commit atómico del árbol
                              v
+-------------------------------------------------------------+
| GIT OBJECT STORE (.git/objects)                             |
|                                                             |
| Commit Object (Autor, Timestamp, Tree SHA)                  |
|   └── Tree Object (ejemplo.com/docs/)                       |
|         ├── Blob (index.md) -> Delta compression vs v1      |
|         ├── Blob (metadata.json)                            |
|         └── Blob (assets/hero.webp) -> SHA deduplicado      |
+-------------------------------------------------------------+
```

### Ventajas Arquitectónicas Clave

1. **Deduplicación direccionable por contenido**: 
   Cada versión de página, bundle de CSS y asset de imagen se indexa mediante su hash criptográfico (SHA-1/SHA-256). Si 500 subpáginas crawleadas apuntan al mismo stylesheet o avatar, Git almacena el `blob` una sola vez en disco.
2. **Delta compression en packfiles**:
   Cuando un artículo o página de docs cambia apenas un párrafo, la compresión delta por sliding-window de Git (`git pack-objects`) guarda únicamente el byte delta. Sitios pesados crawleados cientos de veces apenas inflan el tamaño del repo comparado con guardar snapshots completos independientes.
3. **Diffs e inspección histórica al instante**:
   Los comandos nativos de Git se convierten en herramientas analíticas poderosas:
   - `git diff v1.0..v2.0 -- ruta/a/pagina.md`: Visualización instantánea en la terminal de líneas agregadas y eliminadas.
   - `git log -p -S "deprecated_feature"`: Auditoría histórica exacta de cuándo se introdujo o borró un parámetro o string en todo el dominio.
   - `git bisect`: Búsqueda binaria automatizada en el historial para encontrar el commit exacto donde ocurrió un breaking change o regresión en un sitio externo.

---

## 2. Pipeline de Ingesta y Normalización

El reto más bravo al archivar páginas web en Git es el **ruido no determinista**.

Si haces commit del HTML crudo directo del response, cada crawl generará diffs falsos por culpa de:
- Tokens CSRF efímeros, cookies de sesión y timestamps dinámicos.
- Slots de publicidad, recomendaciones y IDs de DOM aleatorios.
- Claves JSON desordenadas o variaciones arbitrarias de espacios en blanco.

```
Payload Web en Crudo
     │
     ▼
[ Headless Fetch / HTTP Stream ]
     │
     ▼
[ Sanitizador de DOM y Ad Stripper ] ──> (Elimina scripts, tracking pixels, atributos volátiles)
     │
     ▼
[ Stream Parser (Motor tipo unipaste) ] ──> (Convierte el DOM enriquecido en Markdown canónico)
     │
     ▼
[ Formateador Canónico ] ──> (Ordena links, normaliza URLs, limpia headers)
     │
     ▼
[ Generador de Árbol Git ] ──> (Escribe objetos directamente sin checkout al working-tree)
```

### Estrategia: Storage en Dos Niveles

Para combinar la legibilidad humana con la fidelidad forense, cada snapshot se guarda en dos archivos:

```
archive/
  └── example.com/
        └── api/
              └── v1/
                    ├── index.md        <-- Markdown normalizado (para git diffs limpios)
                    ├── index.html.gz   <-- Payload HTML original comprimido intacto
                    └── metadata.json   <-- Headers HTTP, status code, IP, TLS cert SHA, fecha
```

- **`index.md`**: Permite diffs impecables e instantáneos en la terminal con tablas, code fences y listas estructuradas.
- **`metadata.json`**: Guarda headers HTTP, content-types, redirect chains y resolución DNS.

---

## 3. Jerarquía y Sharding de Directorios

Al crawlear cientos de dominios o miles de URLs, meter todo en una carpeta plana colapsaría el rendimiento de inodos del filesystem y ralentizaría los recorridos del árbol de Git.

La solución es una descomposición jerárquica que mapea las URLs directamente a rutas de archivos:

```
https://docs.kernel.org/process/submitting-patches.html
  └── docs.kernel.org/
        └── process/
              └── submitting-patches/
                    ├── index.md
                    └── metadata.json
```

### Reglas de Sanitización de Rutas:
- **Query Parameters**: Se ordenan alfabéticamente y se hashean o mapean a carpetas (`?page=2` -> `_params/page_2.json`).
- **Caracteres reservados en el filesystem**: Los caracteres prohibidos en POSIX o Windows (`:`, `*`, `?`, `"`, `<`, `>`, `|`) se escapan de forma determinista usando percent-encoding o hashes seguros.

---

## 4. Estrategias de Rendimiento y Escalabilidad en Git

Comandos de alto nivel como `git checkout` o `git add .` son lentos en repos gigantescos porque obligan al disco a leer y escribir cada archivo en el working tree.

Para un crawler de alta velocidad, nos saltamos el working tree por completo y escribimos directo a la base de datos de objetos usando la **plomería de bajo nivel de Git** (o `libgit2` / bindings en C):

```
1. Escribir Blob:     git hash-object -w <contenido>     -> devuelve Blob SHA
2. Armar Árbol:       git mktree <definicion_arbol>      -> devuelve Tree SHA
3. Crear Commit:      git commit-tree <tree_sha> -p HEAD -> devuelve Commit SHA
4. Actualizar Ref:    git update-ref refs/heads/main <commit_sha>
```

### Ventajas de Rendimiento:
- **Cero I/O en el working tree**: Las instantáneas se inyectan en memoria directo a `.git/objects`.
- **Commits en microsegundos**: Guardar miles de páginas modificadas toma milisegundos en vez de segundos.
- **Mantenimiento automatizado**: Ejecutar periódicamente `git gc --prune=now` mantiene la compresión delta en niveles óptimos.

---

## 5. Próximos Pasos y Roadmap

Actualmente estoy armando el prototipo de una herramienta CLI standalone basada en esta arquitectura:

1. **Core en C99 / POSIX**: Fetcher y sanitizador de streams de alta velocidad con cero dependencias externas.
2. **Motor Markdown Integrado**: Reutilizando la tecnología de parseo de streams de [`unipaste`](https://github.com/riccivr/unipaste) para generar tablas y code fences limpios.
3. **Búsqueda Difusa en el Historial**: Integrando [`approx`](https://github.com/riccivr/approx) para hacer queries difusas ultra rápidas sobre el historial web archivado directamente desde la shell.

¡Pronto estaré publicando benchmarks, el repo en open-source y análisis a fondo de la implementación!
