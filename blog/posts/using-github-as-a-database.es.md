# ¿Se puede usar GitHub como base de datos? SQLite, peticiones HTTP Range y arquitecturas de archivos planos

*Publicado: 30 de agosto de 2026 · Categoría: Arquitectura y Sistemas · Tiempo de lectura: ~5 min*
*Etiquetas: SQLite, GitHub Pages, HTTP Range, Arquitectura, Cloud*

---

Una pregunta recurrente al diseñar proyectos personales, sitios estáticos o aplicaciones ligeras es: **¿Se puede utilizar GitHub como una base de datos persistente?**

La respuesta corta es que **técnicamente sí, con sus buenos matices**, dependiendo de si tu carga de trabajo es **de sólo lectura** o si necesitas **escrituras concurrentes en tiempo real**.

Aquí te explico a fondo cómo se implementa hoy en día, los mecanismos técnicos que lo hacen posible (incluyendo consultas HTTP Range sobre binarios de SQLite) y las limitaciones que debes tener en cuenta.

---

## 1. El enfoque de SQLite de sólo lectura (Peticiones HTTP Range)

Uno de los patrones más interesantes consiste en alojar un archivo `.sqlite` precompilado directamente en **GitHub Pages**, **GitHub Releases** o almacenamiento estático, y consultarlo desde el navegador sin tener que descargar la base de datos completa.

```
+-------------------------------------------------------------+
| Cliente en el Navegador (sql.js-httpvfs / SQLite WASM)      |
|                                                             |
| Consulta: SELECT * FROM articulos WHERE id = 42;            |
| 1. Lee la cabecera SQLite (primeros 100 bytes)              |
| 2. Pide la página raíz del árbol B (Range: bytes=4096-8191) |
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

1. **Sistema de Archivos Virtual (VFS)**: Librerías como [`sql.js-httpvfs`](https://github.com/phiresky/sql.js-httpvfs) o la compilación oficial de SQLite en WebAssembly extienden la interfaz del sistema operativo de SQLite (`sqlite3_vfs`).
2. **Descarga selectiva por rangos de bytes**: En lugar de bajarse 500 MB a la memoria del navegador, el motor lanza peticiones HTTP con la cabecera `Range: bytes=inicio-fin`.
3. **Recorrido del árbol B (B-Tree)**: Dado que SQLite organiza tablas e índices en páginas de tamaño fijo (típicamente 4096 bytes), el motor sólo solicita las 2 a 4 páginas exactas necesarias para resolver una búsqueda indexada.

### Ventajas:
- **Cero infraestructura de servidor**: No tienes que pagar ni mantener servidores dedicados.
- **Escalabilidad y caché infinita**: Las peticiones de bytes estáticos se guardan en la caché de los CDN globales sin esfuerzo.
- **Búsquedas instantáneas en datasets pesados**: Corre fluido con bases de datos de varios gigabytes (censos, catálogos, registros públicos o índices de búsqueda).

---

## 2. El enfoque de Lectura y Escritura: Commits de Git y API de GitHub

GitHub no corre un servicio en segundo plano (como Postgres o MySQL) escuchando conexiones TCP directas para transacciones SQL. Para modificar datos, interactúas mediante la **API REST/GraphQL de GitHub** o flujos automatizados de **Git**:

### A. Almacenamiento en archivos planos (JSON / YAML / Markdown)
En lugar de subir un archivo binario `.sqlite` que inflaría el historial de Git a lo loco en cada cambio, la información se almacena en archivos individuales:

```
datos/
  ├── usuarios/
  │    ├── usr_01.json
  │    └── usr_02.json
  └── telemetria/
       └── 2026-08-30.json
```

- **Escrituras**: Tu aplicación hace una petición `PUT /repos/{dueño}/{repo}/contents/{ruta}` con el contenido codificado en Base64.
- **Auditoría inmutable**: Cada cambio queda registrado en un commit con autor, fecha y diffs legibles.

### B. Issues y Discusiones como Base de Datos Estructurada
Herramientas populares de comentarios como **[Giscus](https://giscus.app/)** y **[Utterances](https://utteranc.es/)** usan las discusiones e issues de GitHub como backend de comentarios para blogs estáticos:
- Autenticación manejada directamente con OAuth de GitHub.
- Comentarios y reacciones guardados como entidades estructuradas.
- Moderación y notificaciones listas de fábrica sin gastar un centavo.

### C. GitHub Actions como Procesador Batch / Cron
- GitHub Actions puede ejecutar tareas programadas (cron) o activadas por eventos.
- El flujo consulta APIs externas, actualiza los datos en JSON o SQLite, corre pruebas y hace commit del resultado de vuelta al repositorio.

---

## Comparativa Arquitectónica

| Característica | GitHub como Base de Datos | SQLite Serverless (Turso / D1) | Base de Datos Gestionada (Postgres / RDS) |
| :--- | :--- | :--- | :--- |
| **Costo de alojamiento** | $0 (Capa gratuita) | Capa gratuita / Pago por lectura | ~$15 a $100+/mes |
| **Latencia de lectura** | 50ms – 300ms (en caché CDN) | 10ms – 30ms (En el Edge) | 5ms – 20ms |
| **Latencia de escritura** | 1s – 5s (Ciclo de commit / API) | 10ms – 50ms | < 5ms |
| **Concurrencia** | ❌ Alto riesgo de conflictos | ✅ Replicación multirregión | ✅ Transacciones ACID y bloqueo de filas |
| **Límites de API** | 5,000 peticiones/hora (auth) | Millones de ops/mes | Límite del pool de conexiones |
| **Diffs binarios** | ⚠️ Infla la carpeta `.git` rápido | Motores de datos limpios | Almacenamiento estándar WAL |

---

## Conclusiones

1. **Usa GitHub Pages + SQLite VFS** si tienes un **conjunto de datos estático de sólo lectura** (ej. diccionarios, catálogos o índices de búsqueda) que quieras alojar gratis y sin mantenimiento.
2. **Usa Archivos Planos + API de GitHub** si tu aplicación tiene poco volumen de escritura y aprovecha el versionado de Git (ej. CMS, marcadores personales o comentarios de blogs estáticos).
3. **Evita usar GitHub como base de datos** para aplicaciones que necesiten escrituras por debajo del segundo, alto tráfico transaccional, bloqueos relacionales o datos privados que no deban exponerse mediante tokens.
