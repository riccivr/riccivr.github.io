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

## 5. Integración con el Ecosistema CLI

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
