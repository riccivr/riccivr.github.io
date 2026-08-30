# Archivar la web con Git: construyendo un crawler e indexador histórico

*Publicado: 30 de agosto de 2026. Categoría: Sistemas & Arquitectura. Tiempo de lectura: ~5 min*
*Etiquetas: Git, Web Archiving, Crawlers, Sistemas, C99, Arquitectura*

---

Las páginas web mutan y desaparecen a cada rato. Las empresas borran documentación durante rediseños corporativos, los términos de servicio cambian sin avisar y los links se rompen de la nada.

La Wayback Machine de Internet Archive es una nota para ver páginas en el navegador, pero no está hecha para correr diffs rápidos en local, meterle grep o armar scripts en la terminal.

He estado probando una jugada distinta: crawlear páginas web y guardar todo el historial directamente dentro de repositorios Git.

Aquí te muestro cómo funciona Git como motor de almacenamiento para archivar la web y lo que aprendí armando un prototipo.

---

## 1. Por qué Git funciona brutal como backend de almacenamiento

En el fondo, Git es un almacén de objetos direccionable por contenido estructurado como un grafo acíclico dirigido. Está pensado para rastrear cambios en archivos de texto ocupando el menor espacio posible en disco.

```
Pipeline del crawler
Descarga URL -> Sanitización DOM -> Normalización a Markdown
                       │
                       ▼ Commit atómico
Almacén de objetos Git (.git/objects)
Commit (Autor, Timestamp, Hash del árbol)
  └── Tree (ejemplo.com/docs/)
        ├── Blob (index.md) -> Compresión delta
        ├── Blob (metadata.json)
        └── Blob (assets/hero.webp) -> Deduplicado por SHA
```

### Ventajas clave:

1. Deduplicación por contenido. Git indexa cada archivo por su hash criptográfico. Si 500 páginas crawleadas usan el mismo CSS o la misma foto, Git guarda ese blob una sola vez y listo.
2. Compresión delta en packfiles. Cuando una página de documentación cambia una sola línea, los packfiles de Git (`git pack-objects`) guardan solo la diferencia en bytes. Crawlear un sitio cientos de veces no te va a reventar el disco duplicando el HTML entero.
3. Herramientas estándar de Git. Tienes acceso inmediato a comandos nativos:
   - `git diff v1..v2 -- ruta/a/pagina.md` te muestra los cambios exactos en la terminal.
   - `git log -p -S "parametro_deprecado"` encuentra el commit exacto donde se agregó o borró una palabra en todo el historial.
   - `git bisect` corre pruebas automáticas sobre los snapshots para encontrar cuándo un sitio externo rompió una API.

---

## 2. Ingesta y reducción de ruido

El reto más bravo al meter HTML en Git es el ruido dinámico.

Si haces commit del HTML crudo que devuelve el servidor, cada corrida te va a generar diffs falsos por tokens CSRF, cookies de sesión, banners con fechas y bloques de publicidad aleatorios.

```
Respuesta HTTP en crudo
       │
       ▼
[ Stream de descarga ]
       │
       ▼
[ Sanitizador de DOM ] ──> Quita scripts, pixeles de rastreo y atributos locos
       │
       ▼
[ Parser de streams ]  ──> Convierte el DOM limpio en Markdown normalizado
       │
       ▼
[ Plomería de Git ]    ──> Escribe el commit directo en .git/objects
```

### Esquema de almacenamiento en dos archivos:

Para tener diffs limpios sin perder la respuesta original, cada captura guarda dos archivos:

```
archive/
  └── example.com/
        └── api/
              └── v1/
                    ├── index.md        <-- Markdown limpio para git diff
                    ├── index.html.gz   <-- HTML original comprimido intacto
                    └── metadata.json   <-- Cabeceras HTTP, status code, IP, fecha
```

- `index.md` genera diffs limpiecitos en la terminal con tablas, code fences y listas.
- `metadata.json` guarda cabeceras HTTP, cadenas de redirección y hashes de certificados TLS.

---

## 3. Fragmentación de carpetas

Guardar miles de URLs en una sola carpeta colapsa el rendimiento del sistema de archivos.

Dividir la URL en subcarpetas mantiene los directorios ordenados y volando:

```
https://docs.kernel.org/process/submitting-patches.html
  └── docs.kernel.org/
        └── process/
              └── submitting-patches/
                    ├── index.md
                    └── metadata.json
```

Los query parameters se ordenan alfabéticamente y se guardan en carpetas dedicadas. Los caracteres prohibidos en POSIX y Windows (`:`, `*`, `?`, `"`, `<`, `>`, `|`) se escapan con hashes seguros.

---

## 4. Escribir directo a objetos para meterle chola

Comandos como `git add` y `git checkout` tocan el disco para cada archivo en el directorio de trabajo. En repositorios gigantes con miles de páginas, el disco se vuelve un dolor de cabeza.

Para una ingesta rápida, te saltas el directorio de trabajo por completo y escribes los objetos directo a `.git/objects` usando comandos de plomería de Git o bindings en C:

```
1. Escribir Blob:    git hash-object -w <contenido>     -> Hash del Blob
2. Armar Árbol:      git mktree <definicion_arbol>      -> Hash del Árbol
3. Crear Commit:     git commit-tree <hash_arbol> -p HEAD -> Hash del Commit
4. Actualizar Rama:  git update-ref refs/heads/main <hash_commit>
```

Esto procesa los commits en memoria a millón. Ejecutar `git gc --prune=now` cada cierto tiempo mantiene los packfiles comprimidos al máximo.

---

## 5. Echándole pichón al prototipo

Estoy armando una herramienta CLI standalone basada en esta estructura:

1. Un motor central en C99 para descargas HTTP en streaming y sanitización sin dependencias raras.
2. Un parser de streams basado en la lógica de conversión a Markdown de [`unipaste`](https://github.com/riccivr/unipaste).
3. Búsqueda rápida con [`approx`](https://github.com/riccivr/approx) para encontrar páginas en el historial usando coincidencia difusa directo desde la shell.

Pronto estaré publicando benchmarks y el código en open-source cuando el núcleo en C esté fino.
