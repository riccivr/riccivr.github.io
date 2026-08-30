# Archivando la web con Git: Construyendo un historiador web direccionable por contenido

*Publicado: 30 de agosto de 2026 · Categoría: Sistemas y Arquitectura · Tiempo de lectura: ~6 min*
*Etiquetas: Git, Archivado Web, Rastreadores, Sistemas, C99, Arquitectura*

---

La web moderna es notoriamente efímera. Las páginas mutan en silencio, la documentación desaparece durante rediseños corporativos, los términos de servicio se actualizan sin dejar rastro y los enlaces se rompen a una velocidad descomunal.

Aunque iniciativas como la Wayback Machine de Internet Archive son brutales para la preservación histórica, están pensadas principalmente para la visualización humana y no para **consultas programáticas locales, diferencias (`diff`) instantáneas e integración con pipelines UNIX automatizados**.

Últimamente he estado diseñando e investigando la arquitectura de una herramienta dedicada a rastrear, versionar e indexar el historial web directamente dentro de **repositorios Git**.

Aquí te comparto los hallazgos técnicos, la mecánica interna y las consideraciones de diseño detrás de usar Git como un motor de archivado web distribuido y direccionable por contenido.

---

## 1. ¿Por qué usar Git como motor de almacenamiento histórico?

En el fondo, Git no es sólo un sistema de control de versiones para código fuente; es un **sistema de archivos estructurado como grafo acíclico dirigido (DAG) y direccionable por contenido**, hiperoptimizado para rastrear texto en evolución.

```
+-------------------------------------------------------------+
| PIPELINE DEL RASTREADOR                                     |
|                                                             |
| Descarga URL -> Sanitización DOM -> Normalización Markdown  |
+-------------------------------------------------------------+
                              |
                   Commit atómico del árbol
                              v
+-------------------------------------------------------------+
| ALMACÉN DE OBJETOS GIT (.git/objects)                       |
|                                                             |
| Objeto Commit (Autor, Marca de tiempo, Hash del Árbol)      |
|   └── Objeto Tree (ejemplo.com/docs/)                       |
|         ├── Blob (index.md) -> Compresión delta vs v1       |
|         ├── Blob (metadata.json)                            |
|         └── Blob (assets/hero.webp) -> SHA deduplicado      |
+-------------------------------------------------------------+
```

### Ventajas Arquitectónicas Clave

1. **Deduplicación direccionable por contenido**: 
   Cada versión de página, paquete CSS y archivo de imagen se indexa mediante su hash criptográfico (SHA-1/SHA-256). Si 500 subpáginas rastreadas enlazan a la misma hoja de estilo o foto de autor, Git guarda el `blob` una sola vez en el disco.
2. **Compresión delta en packfiles**:
   Cuando un artículo o página de documentación cambia apenas un párrafo, la compresión delta por ventana deslizante de Git (`git pack-objects`) almacena únicamente la diferencia en bytes. Sitios web pesados rastreados cientos de veces apenas inflan el tamaño del repositorio en comparación con guardar archivos completos independientes.
3. **Diferencias (`diff`) e inspección histórica al instante**:
   Los comandos nativos de Git se convierten en herramientas analíticas poderosas:
   - `git diff v1.0..v2.0 -- ruta/a/pagina.md`: Visualización instantánea en la terminal de líneas agregadas y eliminadas.
   - `git log -p -S "funcion_deprecada"`: Auditoría histórica exacta de cuándo se introdujo o borró una frase o parámetro en todo el dominio rastreado.
   - `git bisect`: Búsqueda binaria automatizada en el historial para encontrar el snapshot exacto donde ocurrió un cambio destructivo o regresión en un sitio externo.

---

## 2. Pipeline de Ingesta y Normalización

El desafío más bravo al archivar páginas web en Git es el **ruido no determinista**.

Si haces commit del HTML crudo directo del navegador, cada rastreo generará diffs falsos por culpa de:
- Tokens CSRF efímeros, cookies de sesión y marcas de tiempo dinámicas.
- Espacios publicitarios, recomendaciones y IDs de DOM aleatorios.
- Claves JSON desordenadas o variaciones arbitrarias de espacios en blanco.

```
Payload Web en Crudo
     │
     ▼
[ Descarga Headless / Stream HTTP ]
     │
     ▼
[ Sanitizador de DOM y Filtro de Basura ] ──> (Elimina scripts, píxeles de rastreo, atributos volátiles)
     │
     ▼
[ Parser de Streams (Motor tipo unipaste) ] ──> (Convierte el DOM enriquecido en Markdown canónico)
     │
     ▼
[ Formateador Canónico ] ──> (Ordena enlaces, normaliza URLs, limpia cabeceras)
     │
     ▼
[ Generador de Árbol Git ] ──> (Escribe objetos directamente sin tocar el árbol de trabajo)
```

### Estrategia: Almacenamiento en Dos Niveles

Para combinar la legibilidad humana con la fidelidad forense, cada instantánea se guarda en dos archivos:

```
archivo/
  └── ejemplo.com/
        └── api/
              └── v1/
                    ├── index.md        <-- Markdown normalizado (para diffs limpios en git)
                    ├── index.html.gz   <-- Payload HTML original comprimido intacto
                    └── metadata.json   <-- Cabeceras HTTP, código de estado, IP, SHA TLS, fecha
```

- **`index.md`**: Permite diffs impecables e instantáneos en la terminal con tablas, bloques de código y listas estructuradas.
- **`metadata.json`**: Guarda cabeceras HTTP, tipos de contenido, cadenas de redirección y resolución DNS.

---

## 3. Jerarquía y Fragmentación de Directorios

Al rastrear cientos de dominios o miles de URLs, meter todo en una carpeta plana colapsaría el rendimiento de inodos del sistema de archivos y ralentizaría los recorridos del árbol de Git.

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
- **Parámetros de consulta (Query Params)**: Se ordenan alfabéticamente y se hashean o mapean a carpetas (`?pagina=2` -> `_params/pagina_2.json`).
- **Caracteres reservados en sistemas de archivos**: Los caracteres prohibidos en POSIX o Windows (`:`, `*`, `?`, `"`, `<`, `>`, `|`) se escapan de forma determinista usando codificación porcentual o hashes seguros.

---

## 4. Estrategias de Rendimiento y Escalabilidad en Git

Comandos de alto nivel como `git checkout` o `git add .` son lentos en repositorios gigantes porque obligan al disco a leer y escribir cada archivo en el directorio de trabajo (working directory).

Para un rastreador veloz, nos saltamos el directorio de trabajo por completo y escribimos directo a la base de datos de objetos usando la **plomería de bajo nivel de Git** (o `libgit2` / bindings en C):

```
1. Escribir Blob:     git hash-object -w <contenido>     -> devuelve Hash del Blob
2. Armar Árbol:       git mktree <definicion_arbol>      -> devuelve Hash del Árbol
3. Crear Commit:      git commit-tree <hash_arbol> -p HEAD -> devuelve Hash del Commit
4. Actualizar Rama:   git update-ref refs/heads/main <hash_commit>
```

### Ventajas de Rendimiento:
- **Cero I/O en el directorio de trabajo**: Las instantáneas se inyectan en memoria directo a `.git/objects`.
- **Commits en microsegundos**: Guardar miles de páginas modificadas toma milisegundos en vez de segundos.
- **Mantenimiento automatizado**: Ejecutar periódicamente `git gc --prune=now` mantiene la compresión delta en niveles óptimos.

---

## 5. Próximos Pasos y Hoja de Ruta

Actualmente estoy construyendo el prototipo de una herramienta CLI independiente basada en esta arquitectura:

1. **Núcleo en C99 / POSIX**: Descargador y sanitizador de streams de alta velocidad con cero dependencias externas.
2. **Motor Markdown Integrado**: Reutilizando la tecnología de parseo de streams de [`unipaste`](https://github.com/riccivr/unipaste) para generar tablas y bloques de código limpios.
3. **Búsqueda Difusa en el Historial**: Integrando [`approx`](https://github.com/riccivr/approx) para realizar búsquedas difusas ultra rápidas sobre el historial web archivado directamente desde la terminal.

¡Pronto estaré publicando benchmarks, el repositorio en código abierto y análisis a fondo de la implementación!
