# ¿Se puede usar GitHub como base de datos? SQLite, peticiones HTTP Range y archivos planos

*Publicado: 30 de agosto de 2026. Categoría: Arquitectura & Sistemas. Tiempo de lectura: ~4 min*
*Etiquetas: SQLite, GitHub Pages, HTTP Range, Arquitectura, Cloud*

---

Una pregunta común en side projects y sitios estáticos es si se puede usar GitHub como una base de datos persistente.

Sí se puede, pero depende de tus patrones de lectura y escritura. Funciona muy bien para conjuntos de datos estáticos de solo lectura, y bastante mal para escrituras concurrentes en tiempo real.

Aquí te muestro cómo se implementa, cómo funciona SQLite sobre peticiones HTTP Range y las limitaciones operativas a tener en cuenta.

---

## 1. SQLite de solo lectura con peticiones HTTP Range

Un patrón elegante consiste en subir un archivo `.sqlite` a GitHub Pages o Releases y consultarlo directamente desde el navegador sin descargar la base de datos completa.

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

### Cómo funciona:

1. Sistema de archivos virtual (VFS). Librerías como [`sql.js-httpvfs`](https://github.com/phiresky/sql.js-httpvfs) o la compilación oficial de SQLite en WebAssembly reemplazan la interfaz de disco habitual del sistema operativo (`sqlite3_vfs`).
2. Descargas parciales por rango de bytes. En lugar de cargar 300MB en memoria, el navegador envía peticiones HTTP con `Range: bytes=inicio-fin`.
3. Navegación del árbol B (B-Tree). SQLite organiza las tablas e índices en páginas fijas de 4096 bytes. El motor pide únicamente las 2 a 4 páginas necesarias para completar la búsqueda indexada.

### Ventajas:
- Cero costos de infraestructura en CDNs estáticos.
- Caché en el Edge sobre rangos de bytes.
- Consultas rápidas sobre datos estáticos pesados como censos o índices de búsqueda.

---

## 2. Lectura y escritura con commits y la API de GitHub

GitHub no corre servicios como Postgres o MySQL escuchando conexiones TCP directas. Para escribir datos, usas la API REST de GitHub o flujos de trabajo con Git.

### Archivos planos estructurados (JSON / YAML / Markdown)
No hagas commit de archivos binarios `.sqlite` en cada escritura porque los packfiles de Git crecerán demasiado rápido. Es mejor guardar las entidades en archivos de texto plano:

```
data/
  ├── users/
  │    ├── usr_01.json
  │    └── usr_02.json
  └── telemetry/
       └── 2026-08-30.json
```

- Tu aplicación envía una petición `PUT /repos/{owner}/{repo}/contents/{path}` con datos en base64.
- Cada escritura crea un commit con fecha y diffs de texto legibles.

### Issues y Discussions como almacenamiento estructurado
Sistemas de comentarios como [`Giscus`](https://giscus.app/) y [`Utterances`](https://utteranc.es/) guardan comentarios en GitHub Discussions o Issues. Esto te da autenticación de GitHub, filtros de spam y notificaciones sin armar un backend propio.

### GitHub Actions para tareas batch programadas
Flujos automáticos con cron pueden ejecutar scrapers, actualizar archivos JSON o SQLite y hacer commit de los cambios de vuelta al repositorio.

---

## Comparativa

| Característica | GitHub como DB | SQLite Serverless (Turso / D1) | Managed DB (Postgres / RDS) |
| :--- | :--- | :--- | :--- |
| Costo de hosting | $0 | Capa gratuita / Pago por lectura | $15 a $100+/mes |
| Latencia de lectura | 50ms a 300ms (en CDN) | 10ms a 30ms (Edge) | 5ms a 20ms |
| Latencia de escritura | 1s a 5s (commit en Git) | 10ms a 50ms | Menor a 5ms |
| Concurrencia | Riesgo de conflictos al mezclar | Replicación multirregión | Bloqueos ACID por fila |
| Límites de API | 5,000 peticiones/hora | Millones de ops/mes | Límite del pool de conexiones |
| Diffs binarios | Infla la carpeta `.git` | Almacenamiento limpio | Archivos estándar WAL |

---

## Conclusiones

1. Usa GitHub Pages con SQLite VFS si tienes datos de solo lectura que quieras alojar gratis sin mantenimiento.
2. Usa archivos planos con la API de GitHub para escrituras de baja frecuencia donde quieras historial de cambios, como comentarios en blogs o marcadores personales.
3. Evita usar GitHub como base de datos en aplicaciones que requieran escrituras rápidas por debajo del segundo, alta concurrencia o datos privados de clientes.
