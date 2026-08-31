# gitcrawl: crawler web direccionable por contenido y motor de snapshots en Git

*Publicado: 31 de agosto de 2026. Categoría: Sistemas & Arquitectura. Tiempo de lectura: ~6 min*
*Etiquetas: C99, Git, Web Archiving, Crawlers, POSIX, Arquitectura, Sistemas*

---

En mi [artículo anterior sobre archivar la web con Git](post.html?post=preserving-the-web-with-git), exploré la teoría detrás de usar el almacén de objetos direccionable por contenido de Git como base de datos histórica para páginas web y documentación técnica.

La idea era simple: en vez de guardar gigabytes de archivos WARC monolíticos o carpetas llenas de HTML duplicado, usar los grafos acíclicos y la compresión delta de Git para tener diffs instantáneos en la terminal con `git diff` y `git log`.

Hoy publiqué la implementación completa en código abierto: [**`gitcrawl`**](https://github.com/riccivr/gitcrawl).

Aquí te explico la arquitectura del motor en C99, cómo interactúa con la plomería interna de Git sin tocar el directorio de trabajo y los benchmarks de compresión.

---

## 1. Arquitectura del Pipeline

`gitcrawl` está diseñado bajo la filosofía UNIX: una herramienta modular, escrita en C99 estricto, sin dependencias pesadas y optimizada para pipelines automatizados y cron jobs.

```
                  ┌────────────────────────────────────────┐
                  │          URL / Stream de Entrada       │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │      Motor HTTP & Conexión POSIX       │
                  │   - Headers, TLS info, Status Codes    │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │          Sanitizador de DOM            │
                  │ - Stripping de scripts, ads y CSRF     │
                  │ - Preservación de tags semánticos      │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │    Parser a Markdown (via unipaste)    │
                  │ - Tablas ASCII / Markdown estructurado │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │      Capa de Plomería Git (C99)        │
                  │  1. Hash-object: Blob Markdown         │
                  │  2. Hash-object: Blob Metadata JSON    │
                  │  3. Mktree: Árbol de directorios       │
                  │  4. Commit-tree: Commit histórico      │
                  │  5. Update-ref: Actualización de rama  │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │         .git/objects (Packfiles)       │
                  └────────────────────────────────────────┘
```

---

## 2. Ingesta a Memoria: Saltándonos el Directorio de Trabajo

Uno de los mayores cuellos de botella al rastrear miles de URLs es el sistema de archivos. Si haces un `checkout` de un repositorio con 50.000 páginas, el disco colapsa creando y borrando inodos.

`gitcrawl` no toca el árbol de trabajo (`working tree`). Interactúa directamente con la base de datos de objetos en `.git/objects`:

```c
/* Estructura básica de inserción directa a la base de objetos */
typedef struct {
    char sha_hex[41];
    size_t size;
    const char *path;
} git_blob_t;

/* Inyecta un blob en memoria sin escribir archivo temporal en disco */
int git_write_blob_stream(const char *data, size_t len, char *out_sha) {
    /* Ejecuta el equivalente de plomería interna: git hash-object -w --stdin */
    return git_plumbing_hash_object(data, len, out_sha);
}
```

Al procesar cada URL:
1. El HTML crudo se sanitiza en un buffer de memoria de tamaño acotado.
2. El motor genera dos blobs: `index.md` (contenido legible normalizado) y `metadata.json` (encabezados HTTP, timestamp, IP, status code y cadena de redirecciones).
3. Se calcula el árbol jerárquico (`git mktree`) fragmentando el host y la ruta (`docs.rs/tokio/index.md`).
4. Si el hash del árbol resultante es idéntico al commit anterior, `gitcrawl` detecta en **0 ms** que la página no cambió y omite el commit.
5. Si hubo cambios, genera un commit atómico vinculado al padre (`git commit-tree`) y mueve la referencia (`git update-ref refs/heads/archive`).

---

## 3. Reducción de Ruido y Normalización

Si haces commit del HTML crudo, cada corrida genera diffs falsos por tokens de sesión, nonces CSRF y tiempos de renderizado dinámico.

`gitcrawl` integra un parser de streams inspirado en el motor de [`unipaste`](https://github.com/riccivr/unipaste). Extrae el contenido semántico principal (`<main>`, `<article>`, o el contenedor con mayor densidad de texto), convirtiendo encabezados, tablas, listas y bloques de código a Markdown limpio.

```markdown
<!-- Diff limpio generado por git diff en una actualización de API -->
--- a/api.stripe.com/v1/charges/index.md
+++ b/api.stripe.com/v1/charges/index.md
@@ -14,3 +14,5 @@
 | `amount` | integer | Monto en centavos |
-| `currency` | string | Código ISO de 3 letras |
+| `currency` | string | Código ISO de 3 letras (ej. usd, eur) |
+| `payment_method` | string | ID del método de pago asociado |
```

---

## 4. Benchmarks y Eficiencia de Almacenamiento

Probamos `gitcrawl` archivando 500 páginas de documentación técnica (incluyendo specs de RFCs, docs de Python y manuales POSIX) con revisiones diarias durante 30 días:

| Estrategia de Archivo | Espacio en Disco (30 corridas) | Velocidad de Diff en Terminal | Requiere Base de Datos |
|---|---|---|---|
| **HTML Crudo en Disco** | 4.8 GB | Lento (`diff -r`) | No |
| **Archivos WARC** | 3.2 GB | No nativo (requiere herramientas WARC) | Sí / Índices |
| **`gitcrawl` (Git Packfiles)** | **142 MB** | **Instantáneo (`git diff`, `git log`)** | **No (Git nativo)** |

Gracias a la compresión delta de Git (`git pack-objects`), las páginas donde solo cambia una línea o un párrafo ocupan apenas unos cuantos bytes por versión histórica.

---

## 5. ¿Por qué no SQLite o almacenamiento plano? La ventaja distribuida y multi-agente

Una de las preguntas más lógicas al diseñar esta herramienta fue: *¿Por qué no meter los snapshots en una base de datos embebida como SQLite, o en un bucket S3 con archivos planos?*

Para un crawler de una sola máquina, SQLite es una maravilla. Pero en el momento en que escalas a un entorno moderno con **múltiples agentes de rastreo concurrentes y distribuidos**, las bases de datos monolíticas y los sistemas de archivos tradicionales muestran sus costuras:

### Los problemas de SQLite y archivos planos en entornos distribuidos:
1. **Bloqueos de concurrencia y replicación pesada:** SQLite no tolera múltiples escritores en red sin caer en bloqueos (`SQLITE_BUSY` o WAL locks). Sincronizar bases de datos SQLite entre servidores requiere protocolos de consenso complejos (Raft/LiteFS) o mover archivos enteros por la red.
2. **Colisiones al fusionar capturas:** Si tienes tres agentes crawleando en distintas regiones y luego quieres combinar sus bases de datos SQLite, te toca lidiar con conflictos de IDs autoincrementales, colisiones de timestamps y reconciliación manual fila por fila.
3. **Archivos planos en disco / S3:** Almacenar carpetas crudas produce condiciones de carrera (*Last Write Wins*), destruyendo versiones intermedias si dos agentes actualizan la misma URL casi al mismo tiempo. Además, no hay compresión delta nativa entre revisiones.

```
                      Agente Alpha (us-east)  ──> Branch: agent/alpha
                                                            │
                      Agente Bravo (eu-west)  ──> Branch: agent/bravo ──> Git Merge (Sin Bloqueos)
                                                            │             ├── Deduplicación SHA automática
                      Agente Charlie (ap-tokyo) ──> Branch: agent/charlie └── Compresión Delta en Packfiles
```

### Por qué el Merkle DAG de Git maneja el caos multi-agente de forma natural:

1. **Deduplicación criptográfica sin coordinación:** Git es un almacén direccionable por contenido. Si 10 agentes en distintos servidores descargan la misma página al mismo segundo y el contenido es idéntico, los 10 calculan el *mismo hash SHA*. La deduplicación es matemática e inmediata, sin necesidad de consultar un servidor central ni adquirir bloqueos distribuidos.
2. **Ramas independientes y convergencia sin dolor:** Cada agente puede trabajar en su propia rama (`agent/crawler-eu`, `agent/crawler-us`, etc.) o en un fork local. Cuando terminan su lote, hacen `git push` a un repositorio central (o peer-to-peer). La reconciliación de todo el historial es un simple `git merge` de árboles. Dado que los crawlers operan sobre rutas disjuntas del árbol de directorios, los merges se resuelven en milisegundos de forma no bloqueante.
3. **Procedencia criptográfica e inmutabilidad:** Cada snapshot queda sellado con el autor, timestamp y hash del commit padre. Es imposible alterar una captura histórica sin invalidar todo el grafo posterior. Puedes firmar commits (`git commit -S`) para auditar qué agente o modelo de IA capturó exactamente cada versión de la web.
4. **Transporte de red ultra-optimizado:** El protocolo nativo de Git (`git-upload-pack` / `git-receive-pack`) calcula deltas al vuelo. Cuando un agente sincroniza su trabajo con la base central, solo viajan los bytes que cambiaron, ahorrando ancho de banda masivo en flujos de trabajo en la nube.

---

## 6. Integración con el Ecosistema CLI

Al guardar los snapshots en un repositorio Git estándar, puedes combinar `gitcrawl` con el resto de tus herramientas de terminal:

- **Búsqueda difusa en el historial con [`approx`](https://github.com/riccivr/approx):**
  ```bash
  git log --name-only --format="" | sort -u | approx "stripe charges"
  ```
- **Rastreo de cambios en palabras clave:**
  ```bash
  git log -p -S "deprecated" -- docs.github.com/
  ```
- **Exportación limpia a LLMs y RAG pipelines:**
  Como el repositorio almacena Markdown estructurado, puedes alimentar modelos de lenguaje locales directamente con `cat` o scripts en Bash.

El código fuente, manual de instalación y opciones de configuración están disponibles en GitHub: [**`github.com/riccivr/gitcrawl`**](https://github.com/riccivr/gitcrawl).
