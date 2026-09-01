# gitcrawl: crawler web direccionable por contenido y motor de snapshots en Git

*Publicado: 31 de agosto de 2026. Categoría: Sistemas & Arquitectura. Tiempo de lectura: ~6 min*
*Etiquetas: C99, Git, Web Archiving, Crawlers, POSIX, Arquitectura, Sistemas*

---

En mi [artículo anterior sobre archivar la web con Git](preserving-the-web-with-git.html), me puse a explorar la teoría detrás de usar el almacén de objetos direccionable por contenido de Git como base de datos histórica para páginas web y documentación técnica.

La jugada era sencilla: en vez de calarse gigabytes de archivos WARC pesadísimos o carpetas atiborradas de HTML repetido, aprovechar los grafos acíclicos y la compresión delta de Git para sacar diffs instantáneos en la terminal con `git diff` y `git log`.

Hoy liberé la implementación completa en código abierto: [**`gitcrawl`**](https://github.com/riccivr/gitcrawl).

Aquí te echo el cuento de la arquitectura del motor en C99, cómo se conecta directo con la plomería interna de Git sin tocar el directorio de trabajo para ir volando, y los números de compresión.

---

## 1. Arquitectura del pipeline

`gitcrawl` sigue la filosofía UNIX: una herramienta modular, escrita en C99 pulcro, sin dependencias raras ni runtimes pesados, lista para meterla en pipelines y cron jobs.

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

## 2. Ingesta a memoria: saltándonos el directorio de trabajo

Uno de los peores cuellos de botella al rastrear miles de URLs es el sistema de archivos. Si te pones a hacer un `checkout` en un repositorio con 50.000 páginas, el disco colapsa creando y borrando inodos a lo loco.

`gitcrawl` no toca el árbol de trabajo (`working tree`) para nada. Le escribe directo a la base de datos de objetos en `.git/objects`:

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
1. El HTML crudo se limpia en un buffer de memoria de tamaño acotado.
2. El motor genera dos blobs: `index.md` (el contenido normalizado y al pelo) y `metadata.json` (encabezados HTTP, timestamp, IP, status code y saltos de redirección).
3. Se arma el árbol de directorios (`git mktree`) picando el host y la ruta (`docs.rs/tokio/index.md`).
4. Si el hash del árbol resultante es idéntico al commit anterior, `gitcrawl` detecta en **0 ms** que la página no cambió y se ahorra el commit de una vez.
5. Si hubo cambios, clava un commit atómico amarrado al padre (`git commit-tree`) y actualiza la rama (`git update-ref refs/heads/archive`).

---

## 3. Reducción de ruido y normalización

Si comiteas el HTML crudo tal cual, cada corrida te va a generar diffs falsos por culpa de tokens de sesión, nonces CSRF, banners publicitarios y tiempos de render dinámicos.

`gitcrawl` monta un parser de streams basado en el motor de [`unipaste`](https://github.com/riccivr/unipaste). Agarra el contenido semántico de verdad (`<main>`, `<article>`, o el bloque con más texto), convirtiendo títulos, tablas, listas y bloques de código a Markdown limpiecito.

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

## 4. Benchmarks y eficiencia de almacenamiento

Puse a prueba `gitcrawl` archivando 500 páginas de documentación técnica (incluyendo specs de RFCs, docs de Python y manuales POSIX) con revisiones diarias durante un mes entero:

| Estrategia de Archivo | Espacio en Disco (30 corridas) | Velocidad de Diff en Terminal | Requiere Base de Datos |
|---|---|---|---|
| **HTML Crudo en Disco** | 4.8 GB | Lento (`diff -r`) | No |
| **Archivos WARC** | 3.2 GB | No nativo (requiere herramientas WARC) | Sí / Índices |
| **`gitcrawl` (Git Packfiles)** | **142 MB** | **Instantáneo (`git diff`, `git log`)** | **No (Git nativo)** |

Gracias a la compresión delta de Git (`git pack-objects`), las páginas donde solo cambia una línea o un párrafo ocupan apenas unos cuantos bytes por snapshot histórico. Una mantequilla.

---

## 5. ¿Por qué no SQLite o almacenamiento plano? Lo que estuve pensando sobre crawlers distribuidos

Cuando estaba diseñando este motor, me puse a pensar si no era más fácil tirar los snapshots en una base de datos embebida como SQLite o en un bucket S3 con archivos planos y ya.

Para un crawler solitario en mi propia laptop, SQLite es tremenda nota. Pero en el momento en que me puse a pensar en escalar esto con múltiples agentes de rastreo corriendo en paralelo en varias máquinas, contenedores o lambdas, las bases de datos monolíticas y los archivos planos empiezan a mostrar las costuras y se arma un saperoco:

### Los rollos de SQLite y archivos planos en entornos distribuidos

1. **Bloqueos de concurrencia y replicación pesada.** SQLite no aguanta múltiples escritores concurrentes en red sin trabarse (`SQLITE_BUSY` o bloqueos de WAL). Sincronizar bases de datos SQLite entre servidores exige protocolos de consenso complejos (Raft/LiteFS) o mover bases de datos enteras por la red.
2. **La pesadilla de fusionar capturas.** Si tienes tres agentes crawleando en distintas regiones y luego quieres unir sus bases de datos SQLite, te toca resolver colisiones de IDs autoincrementales, marcas de tiempo chocando y reconciliación manual fila por fila.
3. **Archivos planos en disco o S3.** Guardar carpetas crudas produce condiciones de carrera (*Last Write Wins*), borrando versiones intermedias si dos agentes le caen a la misma URL casi al mismo tiempo. Además, te quedas sin compresión delta nativa.

```
                      Agente Alpha (us-east)   --> Branch: agent/alpha
                                                            |
                      Agente Bravo (eu-west)   --> Branch: agent/bravo --> Git Merge (Sin Trancas)
                                                            |             ├── Deduplicación SHA al tiro
                      Agente Charlie (ap-tokyo)--> Branch: agent/charlie  └── Compresión Delta en Packfiles
```

### Por qué el Merkle DAG de Git doma el caos multi-agente sin despeinarse

1. **Deduplicación criptográfica sin coordinar nada.** Git es un almacén direccionable por contenido. Si 10 agentes en servidores distintos descargan la misma página al mismo segundo y el contenido está intacto, los 10 calculan exactamente el mismo hash SHA del blob. La deduplicación es matemática y al tiro, sin tener que preguntarle a un servidor central ni pedir bloqueos distribuidos.
2. **Ramas independientes y convergencia relajada.** Cada agente trabaja en su propia rama (`agent/crawler-eu`, `agent/crawler-us`, etc.) o en un fork local. Cuando terminan su tanda, hacen `git push` a un bare repo central o sincronizan peer-to-peer. Unir todo el historial es un simple `git merge` de árboles. Como los crawlers suelen tocar rutas distintas, los merges se resuelven en milisegundos sin trancas.
3. **Procedencia e inmutabilidad.** Cada snapshot queda amarrado a su commit padre con autor y timestamp. No hay forma de meter mano y alterar una captura vieja sin romper todo el grafo. Y si quieres auditar con lupa qué agente o modelo de IA capturó cada versión, le firmas los commits con `git commit -S`.
4. **Transporte de red optimizado al máximo.** El protocolo nativo de Git (`git-upload-pack` / `git-receive-pack`) calcula deltas al vuelo. Cuando un agente sube su trabajo, solo viajan los bytes que cambiaron de verdad, ahorrando un gentío de ancho de banda en la nube.

---

## 6. Integración con el ecosistema CLI

Al dejar los snapshots en un repositorio Git estándar, puedes combinar `gitcrawl` con tus herramientas de diario en la terminal:

- **Búsqueda difusa en el historial con [`approx`](https://github.com/riccivr/approx):**
  ```bash
  git log --name-only --format="" | sort -u | approx "stripe charges"
  ```
- **Rastreo de cambios en palabras clave:**
  ```bash
  git log -p -S "deprecated" -- docs.github.com/
  ```
- **Exportación limpia a LLMs y pipelines RAG:**
  Como el repositorio almacena Markdown estructurado, puedes alimentar modelos de lenguaje locales directamente con `cat` o scripts en Bash.

El código fuente, manual de instalación y opciones de configuración están disponibles en GitHub: [**`github.com/riccivr/gitcrawl`**](https://github.com/riccivr/gitcrawl).
