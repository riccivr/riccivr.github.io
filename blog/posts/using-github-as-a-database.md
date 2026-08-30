# ¿Se puede usar GitHub como base de datos? SQLite, peticiones HTTP Range y arquitecturas flat-file

*Publicado: 30 de agosto de 2026 · Categoría: Arquitectura & Sistemas · Tiempo de lectura: ~5 min*
*Etiquetas: SQLite, GitHub Pages, HTTP Range, Arquitectura, Cloud*

---

Una pregunta recurrente al diseñar side projects, sitios estáticos o aplicaciones ligeras es: **¿Se puede utilizar GitHub como una base de datos persistente?**

La respuesta corta es que **técnicamente sí, con sus buenos trade-offs**, dependiendo de si tu carga de trabajo es **read-heavy (sólo lectura)** o si necesitas **escrituras concurrentes en tiempo real**.

Aquí te explico a fondo cómo se implementa hoy en día, los mecanismos técnicos que lo hacen posible (incluyendo queries HTTP Range sobre binarios de SQLite) y las limitaciones que debes tener en cuenta.

---

## 1. El enfoque de SQLite de sólo lectura (Queries HTTP Range)

Uno de los patrones más elegantes consiste en alojar un archivo `.sqlite` precompilado directamente en **GitHub Pages**, **GitHub Releases** o almacenamiento CDN estático, y consultarlo desde el browser sin tener que descargar la base de datos completa.

```
+-------------------------------------------------------------+
| Cliente en el Browser (sql.js-httpvfs / SQLite WASM)        |
|                                                             |
| Query: SELECT * FROM articulos WHERE id = 42;               |
| 1. Lee el header de SQLite (primeros 100 bytes)             |
| 2. Pide la página raíz del B-Tree (Range: bytes=4096-8191)  |
| 3. Pide la página hoja con la fila (Range: bytes=16384-...) |
+-------------------------------------------------------------+
                              |
                     Peticiones HTTP GET / Range
                              v
+-------------------------------------------------------------+
| GitHub Pages / Almacenamiento CDN (Archivo database.sqlite) |
+-------------------------------------------------------------+
```

### ¿Cómo funciona la jugada?

1. **Virtual File System (VFS)**: Librerías como [`sql.js-httpvfs`](https://github.com/phiresky/sql.js-httpvfs) o el build oficial de SQLite en WebAssembly extienden la interfaz del sistema operativo de SQLite (`sqlite3_vfs`).
2. **Fetch selectivo por byte-ranges**: En lugar de bajarse 500 MB a la memoria del browser, el motor lanza requests HTTP con el header `Range: bytes=inicio-fin`.
3. **Navegación del B-Tree**: Dado que SQLite organiza tablas e índices en páginas de tamaño fijo (típicamente 4096 bytes), el motor sólo solicita las 2 a 4 páginas exactas necesarias para resolver una búsqueda indexada.

### Ventajas:
- **Zero server costs**: No tienes que pagar ni mantener servidores dedicados.
- **Escalabilidad y caching infinito**: Las peticiones de bytes estáticos se guardan en la caché de los CDN globales sin esfuerzo.
- **Búsquedas instantáneas en datasets pesados**: Corre fluido con bases de datos de varios gigabytes (censos, catálogos, registros públicos o índices de búsqueda).

---

## 2. El enfoque de Lectura y Escritura: Git Commits y la API de GitHub

GitHub no corre un daemon en background (como Postgres o MySQL) escuchando conexiones TCP directas para transacciones SQL. Para modificar datos, interactúas mediante la **API REST/GraphQL de GitHub** o workflows automatizados de **Git**:

### A. Almacenamiento en archivos planos / Flat-Files (JSON / YAML / Markdown)
En lugar de commitear un archivo binario `.sqlite` que inflaría el historial de Git a lo loco en cada cambio, la información se almacena en archivos individuales:

```
data/
  ├── users/
  │    ├── usr_01.json
  │    └── usr_02.json
  └── telemetry/
       └── 2026-08-30.json
```

- **Writes**: Tu aplicación hace una llamada `PUT /repos/{owner}/{repo}/contents/{path}` con el payload en Base64.
- **Auditabilidad inmutable**: Cada cambio queda registrado en un commit con autor, timestamp y diffs legibles.

### B. Issues y Discussions como Base de Datos Estructurada
Herramientas populares de comentarios como **[Giscus](https://giscus.app/)** y **[Utterances](https://utteranc.es/)** usan las discussions e issues de GitHub como backend de comentarios para blogs estáticos:
- Autenticación manejada directamente con OAuth de GitHub.
- Comentarios y reacciones guardados como entidades estructuradas.
- Moderación y notificaciones listas out-of-the-box sin gastar un centavo.

### C. GitHub Actions como Procesador Batch / Cron
- GitHub Actions puede ejecutar cron jobs programados o activados por webhooks.
- El worker consulta APIs externas, actualiza los datos en JSON o SQLite, corre tests y commitea el resultado de vuelta al repo.

---

## Comparativa Arquitectónica

| Característica | GitHub como DB | SQLite Serverless (Turso / D1) | Managed DB (Postgres / RDS) |
| :--- | :--- | :--- | :--- |
| **Costo de hosting** | $0 (Free tier) | Free tier / Pay per read | ~$15 a $100+/mes |
| **Latencia de lectura** | 50ms – 300ms (en CDN cache) | 10ms – 30ms (En el Edge) | 5ms – 20ms |
| **Latencia de escritura** | 1s – 5s (Ciclo de commit / API) | 10ms – 50ms | < 5ms |
| **Concurrencia** | ❌ Alto riesgo de merge conflicts | ✅ Replicación multirregión | ✅ Transacciones ACID y row locking |
| **Rate limits** | 5,000 requests/hora (auth) | Millones de ops/mes | Límite del connection pool |
| **Diffs binarios** | ⚠️ Infla la carpeta `.git` rápido | Motores de storage limpios | Almacenamiento estándar WAL |

---

## Conclusiones

1. **Usa GitHub Pages + SQLite VFS** si tienes un **dataset estático de sólo lectura** (ej. catálogos, archivos de documentación o índices de búsqueda) que quieras hostear gratis y con cero mantenimiento.
2. **Usa Flat-Files + API de GitHub** si tu aplicación tiene poco volumen de escritura y aprovecha el versionado de Git (ej. CMS, marcadores personales o comentarios de blogs estáticos).
3. **Evita usar GitHub como base de datos** para aplicaciones que necesiten escrituras por debajo del segundo, alto tráfico transaccional, bloqueos relacionales o datos privados que no deban exponerse mediante tokens.
