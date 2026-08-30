# ¿Se puede usar GitHub como base de datos? SQLite, peticiones HTTP Range y archivos planos

*Publicado: 30 de agosto de 2026. Categoría: Arquitectura & Sistemas. Tiempo de lectura: ~4 min*
*Etiquetas: SQLite, GitHub Pages, HTTP Range, Arquitectura, Cloud*

---

Una pregunta que siempre sale al armar side projects y sitios estáticos es si de pana se puede usar GitHub como una base de datos persistente.

La respuesta corta es que técnicamente sí, pero con sus buenos matices. Funciona fino para conjuntos de datos estáticos de solo lectura, y bastante chimbo si necesitas escrituras concurrentes en tiempo real.

Aquí te muestro cómo se implementa la jugada, cómo funciona SQLite sobre peticiones HTTP Range y las limitaciones operativas que debes tener en cuenta.

---

## 1. SQLite de solo lectura con peticiones HTTP Range

Un patrón bien elegante consiste en subir un archivo `.sqlite` a GitHub Pages o Releases y consultarlo directamente desde el navegador sin tener que bajarte la base de datos completa.

```
Cliente en el navegador (sql.js-httpvfs o SQLite WASM)
Consulta: SELECT * FROM articulos WHERE id = 42;
1. Lee los primeros 100 bytes del header de SQLite
2. Pide la página raíz del B-Tree (Range: bytes=4096-8191)
3. Pide la página hoja con la fila (Range: bytes=16384-...)
                       │
                       ▼ HTTP GET con cabecera Range
GitHub Pages o CDN (archivo database.sqlite)
```

### Cómo funciona la cosa:

1. Sistema de archivos virtual (VFS). Librerías como [`sql.js-httpvfs`](https://github.com/phiresky/sql.js-httpvfs) o el build oficial de SQLite en WebAssembly reemplazan la interfaz de disco habitual del sistema operativo (`sqlite3_vfs`).
2. Descargas selectivas por byte-ranges. En lugar de meterte 300MB a los trancazos en la memoria del navegador, el cliente envía peticiones HTTP con `Range: bytes=inicio-fin`.
3. Navegación del árbol B (B-Tree). Como SQLite organiza las tablas e índices en páginas fijas de 4096 bytes, el motor pide únicamente las 2 a 4 páginas exactas para completar la búsqueda indexada.

### Ventajas:
- Cero costos de infraestructura en CDNs estáticos.
- Caché salvaje en el Edge sobre rangos de bytes.
- Consultas volando sobre datos estáticos pesados como catálogos, censos o índices de búsqueda.

---

## 2. Lectura y escritura con commits y la API de GitHub

GitHub no corre servicios como Postgres o MySQL escuchando conexiones TCP directas. Para modificar datos, interactúas mediante la API REST de GitHub o flujos de trabajo de Git.

### Archivos planos estructurados (JSON / YAML / Markdown)
No te pongas a hacer commit de archivos binarios `.sqlite` en cada escritura porque los packfiles de Git van a inflar el repo a lo loco. Es mil veces mejor guardar las cosas en archivos de texto plano:

```
data/
  ├── users/
  │    ├── usr_01.json
  │    └── usr_02.json
  └── telemetry/
       └── 2026-08-30.json
```

- Tu aplicación envía una petición `PUT /repos/{owner}/{repo}/contents/{path}` con los datos en base64.
- Cada escritura te deja un commit inmutable con fecha y diffs legibles al tiro.

### Issues y Discussions como base de datos estructurada
Sistemas de comentarios como [`Giscus`](https://giscus.app/) y [`Utterances`](https://utteranc.es/) guardan los comentarios en GitHub Discussions o Issues. Esto te da autenticación con GitHub, moderación, filtros de spam y notificaciones listas de fábrica sin tener que pagar un centavo de backend.

### GitHub Actions para tareas batch programadas
Flujos automáticos con cron pueden correr scrapers, actualizar archivos JSON o SQLite y hacer commit del resultado de vuelta al repo sin que tengas que mover un dedo.

---

## Comparativa

| Característica | GitHub como DB | SQLite Serverless (Turso / D1) | Managed DB (Postgres / RDS) |
| :--- | :--- | :--- | :--- |
| Costo de hosting | $0 (Gratis) | Capa gratuita / Pago por lectura | $15 a $100+/mes |
| Latencia de lectura | 50ms a 300ms (en CDN) | 10ms a 30ms (Edge) | 5ms a 20ms |
| Latencia de escritura | 1s a 5s (commit en Git) | 10ms a 50ms | Menor a 5ms |
| Concurrencia | Peligro de merge conflicts | Replicación multirregión | Bloqueos ACID por fila |
| Límites de API | 5,000 peticiones/hora | Millones de ops/mes | Límite del connection pool |
| Diffs binarios | Infla la carpeta `.git` | Almacenamiento limpio | Archivos estándar WAL |

---

## Conclusiones

1. Usa GitHub Pages con SQLite VFS si tienes un dataset estático de solo lectura que quieras alojar gratis sin tener que mantener servidores.
2. Usa archivos planos con la API de GitHub para escrituras esporádicas donde quieras historial y trazabilidad, como comentarios de blogs o marcadores personales.
3. No inventes usar GitHub como base de datos en aplicaciones que requieran escrituras en milisegundos, alto tráfico transaccional o datos privados de clientes.
