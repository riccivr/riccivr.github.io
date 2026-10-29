# bugrouter Devlog #4: Preparación para Producción v1.0, Precisión del Scrubber y la Revisión Independiente de Código

*Publicado: 29 de octubre de 2026. Categoría: Sistemas & Arquitectura. Tiempo de lectura: ~8 min*
*Etiquetas: Go, bugrouter, Devlog, Code Review, Seguridad, CLI, Arquitectura*

---

Tras cuatro hitos intensos diseñando la cascada del resolver, armando parsers sin dependencias y blindando el Cloud Control Plane (como contamos en el [Devlog #1](https://riccivr.github.io/blog/bugrouter-devlog-01-architecture-zero-dep-go-and-the-agent-constitution.html), [Devlog #2](https://riccivr.github.io/blog/bugrouter-devlog-02-issue-template-introspection-and-cloud-control-plane.html) y [Devlog #3](https://riccivr.github.io/blog/bugrouter-devlog-03-upstream-deduplication-and-polyglot-probes.html)), `bugrouter` ya estaba funcionalmente completo.

Sin embargo, en ingeniería de sistemas, que un software funcione no significa que esté listo para producción.

Antes de dar el salto a la versión v1.0 (`2026.10.0`), necesitábamos limpiar falsos positivos en el redactor, pulir la ergonomía de la CLI para humanos, armar tests de integración golden-path de punta a punta y someter el código a la lupa de un evaluador independiente de software.

Aquí está el detalle de lo que construimos en el Hito 4, el veredicto técnico de la revisión externa y cómo respondimos a cada observación de arquitectura.

---

## 1. Precisión del Scrubber: Eliminando Falsos Positivos

En nuestra primera versión del redactor, la expresión regular para secretos genéricos (`token=`, `password:`, `secret=`) era demasiado agresiva:

```go
// Expresión regular vieja que atrapaba cualquier secuencia sin espacios:
genericSecretRegex = regexp.MustCompile(`(?i)\b(...)\b(\s*[:=]\s*["']?)([^"'\s,;\[][^"'\s,;]*)`)
```

Esto generaba falsos positivos muy fastidiosos en archivos de configuración y fragmentos de código totalmente legítimos:
- `password_required = false` convertía el `false` en `[REDACTED_SECRET]`
- `token_enabled: true` censuraba el `true`
- `secret_key = null` censuraba el `null`
- `token: in` redactaba la preposición `in`

Como el motor de expresiones regulares de la librería estándar de Go (RE2) no soporta negative lookaheads por diseño (para garantizar tiempo de ejecución lineal), no podíamos resolverlo con un truco de regex.

En su lugar, usamos `genericSecretRegex.ReplaceAllStringFunc` para inspeccionar el valor capturado con código procedural:
1. Exigimos que el valor capturado tenga al menos 6 caracteres (sin contar comillas).
2. Mantenemos una tabla de búsqueda con literales no secretos (`true`, `false`, `null`, `nil`, `none`, `undefined`, `yes`, `no`). Si el texto coincide con uno de ellos (insensible a mayúsculas), se deja intacto.

Ahora, `DATABASE_PASSWORD=supersecretpass123` se convierte limpiamente en `[REDACTED_SECRET]`, mientras que los flags booleanos y configuraciones legítimas se conservan sin alteraciones.

---

## 2. Ergonomía de la CLI: `--body-file` y Timeouts Explícitos

Hasta el Hito 3, usar `bugrouter draft` requería pasar flags individuales para `--summary`, `--steps` y `--logs`. Para un agente de IA que interactúa por MCP esto no era problema, pero para un programador humano en la terminal resultaba engorroso.

En este hito agregamos el flag `--body-file`, que acepta tanto la ruta a un archivo Markdown como `-` para leer directo desde stdin:

```bash
bugrouter draft checkout-api --title "Timeout en worker de pagos" --body-file issue.md
cat bug.md | bugrouter draft checkout-api --title "Timeout en worker de pagos" --body-file -
```

Por debajo, la función `parseMarkdownBodyFile` escanea el markdown buscando encabezados estándar (`## Summary`, `## Steps to Reproduce`, `## Logs & Output`). Si los encuentra, descompone el reporte automáticamente en sus campos; si el archivo no tiene encabezados, toma todo el texto como resumen sin perder nada.

Además, añadimos el flag `--timeout` (por defecto 15 segundos) tanto a `resolve` como a `draft`, garantizando que la CLI nunca se quede congelada esperando por una red saturada.

---

## 3. Tests de Integración Golden-Path de Punta a Punta

Para demostrar que todos los paquetes (`httpx`, `cache`, `resolver`, `introspector`, `dedup`, `scrubber`, `adapter`, `cloud`) colaboran como un reloj suizo, armamos `TestGoldenPathDraftAndBodyFile` en `cmd/bugrouter/main_test.go`.

El test levanta un servidor de pruebas `httptest.Server` que simula una instancia de GitHub Enterprise con plantillas de issues y endpoints de búsqueda, configura un catálogo privado `services.json`, genera un markdown con claves reales de AWS y rutas personales `/home/alice` y ejecuta la cadena completa:
1. Resolución del target mediante `LayerOrgCloud`.
2. Introspección remota descargando y parseando el formulario `bug.yml`.
3. Búsqueda y detección de issues duplicados upstream.
4. Sanitización de credenciales y rutas personales a nivel de tipos (`[REDACTED_AWS_KEY]` y `~/secret.txt`).
5. Mapeo semántico a encabezados de plantilla (`### Reproduction Steps`, `### Error Logs`).
6. Guardado atómico en disco con permisos restringidos `0600`.
7. Lectura y verificación de deserialización desde el almacenamiento XDG.

Todo el suite corre y pasa limpiecito bajo el race detector de Go (`go test -race ./...`).

---

## 4. La Revisión Independiente de Código

Le enviamos el repositorio completo a un revisor externo de software para que hiciera una evaluación arquitectónica profunda, enfocándonos netamente en la calidad del diseño y la ingeniería del proyecto.

Este fue su veredicto literal sobre el software:

> **"Calidad general: alta.** Es código Go disciplinado e intencional, escrito por alguien a quien de verdad le importan las restricciones que se propuso.
>
> **Fortalezas:**
> - **La filosofía es excelente y se aplica de forma consistente:** 'Espíritu C99 en Go moderno', cero dependencias externas, explícito antes que inteligente, todo acotado. `AGENTS.md` y `ARCHITECTURE_STATE.md` demuestran una intención arquitectónica real y no un simple volcado de código.
> - **La postura de seguridad es inusualmente sólida para un proyecto joven:** Protección contra SSRF/DNS-rebinding y límites de tamaño de body en `httpx`. Sanitización a nivel de tipos (`ScrubbedText`) en lugar de 'rezar para que el modelo no filtre nada'. Blindaje contra path-traversal en IDs de borradores. Escrituras atómicas con permisos `0600`. Timeouts explícitos y context en cada llamada de red o subproceso.
> - **La cascada del resolver está muy bien diseñada:** Por capas, con prioridades claras, cacheable y con una interfaz de probe limpia. Soportar workspaces (Go, npm, Cargo, Python), paquetes de múltiples distribuciones de Linux, registries y descubrimiento web en una sola herramienta es ambicioso y muy útil.
> - **Separación limpia de responsabilidades:** Los paquetes mapean de forma nítida a sus responsabilidades (resolver, introspector, dedup, scrubber, adapter, cloud, mcp).
> - **Higiene y pruebas presentes:** Race detector en el Makefile, tests en múltiples paquetes, conventional commits con hook de commit-msg y CalVer.
> - **La implementación de MCP es pragmática:** Stdio JSON-RPC con las herramientas que un agente realmente necesita."

El revisor también señaló áreas de mejora concretas, las cuales atacamos de frente en el Hito 4:

1. **"Falta un README (la mayor carencia inmediata)."**  
   *Solución:* Redactamos un `README.md` exhaustivo y de alto valor técnico en la raíz, documentando la instalación, ejemplos de uso de la CLI, las 7 herramientas de MCP, el formato del catálogo `services.json` y la arquitectura de seguridad.
2. **"La CLI se siente un poco cruda (exige muchos flags)."**  
   *Solución:* Implementamos `--body-file` y soporte para piping desde stdin (`-`) con descomposición automática de secciones de Markdown.
3. **"La deduplicación es ligera por ahora (baseline de solapamiento de tokens)."**  
   *Solución:* El solapamiento de tokens con filtrado de stop words ofrece un baseline rapidísimo sin dependencias. Para futuras versiones, tenemos en el roadmap un ranker ligero con TF-IDF sin romper la regla de cero dependencias externas.
4. **"Brechas de cobertura (más registries y paquetes de Windows)."**  
   *Solución:* Ya sumamos Cargo, pyproject, RPM y Pacman en el Hito 3; el soporte para Maven, NuGet y `winget` en Windows está planificado para los próximos ciclos.

---

## 5. El Estado del Sistema en la v1.0

Con los cuatro hitos completados, este es el mapa arquitectónico de `bugrouter` hoy:

```
┌──────────────────────────────────────────────────────────────┐
│                    Sistema bugrouter v1.0                    │
│                                                              │
│  [Agente vía MCP]             [Desarrollador en Terminal]    │
│  (Claude Code / Cursor)       (resolve / draft / serve)      │
│         │                                    │               │
│         └─────────────────┬──────────────────┘               │
│                           │                                  │
│                           ▼                                  │
│            ┌─────────────────────────────┐                   │
│            │   Cascada de 6 Capas        │                   │
│            │   - Org Cloud (services.json│                   │
│            │   - URL Directa (Forges Git)│                   │
│            │   - Workspace (Políglota)   │                   │
│            │   - Paquetes SO (dpkg/rpm)  │                   │
│            │   - Registries (npm, PyPI)  │                   │
│            │   - Dominio Web (RFC 9116)  │                   │
│            └──────────────┬──────────────┘                   │
│                           │                                  │
│                           ▼                                  │
│            ┌─────────────────────────────┐                   │
│            │   Introspector & Deduplicad.│                   │
│            │   - Parsers YAML y Markdown │                   │
│            │   - Scorer Solapam. Tokens  │                   │
│            └──────────────┬──────────────┘                   │
│                           │                                  │
│                           ▼                                  │
│            ┌─────────────────────────────┐                   │
│            │   Scrubber a Nivel de Tipos │                   │
│            │   - Produce ScrubbedText    │                   │
│            │   - Redacta Secretos y Rutas│                   │
│            └──────────────┬──────────────┘                   │
│                           │                                  │
│                           ▼                                  │
│            ┌─────────────────────────────┐                   │
│            │   Cloud Control Plane       │                   │
│            │   - Web UI Embebida (HITL)  │                   │
│            │   - Auth Bearer Tiempo Cte. │                   │
│            │   - CSRF y Auditoría 0600   │                   │
│            │   - Webhooks HMAC-SHA256    │                   │
│            │   - Despacho a Forges       │                   │
│            └─────────────────────────────┘                   │
└──────────────────────────────────────────────────────────────┘
```

Construir `bugrouter` demostró que no hace falta inflar un proyecto con cientos de paquetes de terceros ni crear abstracciones rebuscadas para tener infraestructura sólida para desarrolladores. Aplicando la mentalidad de C99 en Go moderno, acotando cada llamada de red y convirtiendo la seguridad en una garantía a nivel del compilador, se pueden armar herramientas en las que tanto los agentes autónomos como los humanos podemos confiar a ciegas.
