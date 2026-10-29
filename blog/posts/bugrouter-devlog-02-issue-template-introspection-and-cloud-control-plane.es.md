# bugrouter Devlog #2: Introspección de Plantillas Upstream, Catálogo Org-Cloud y Colas Human-in-the-Loop

*Publicado: 28 de octubre de 2026. Categoría: Sistemas & Cloud. Tiempo de lectura: ~7 min*
*Etiquetas: Go, bugrouter, Devlog, Introspector, Cloud, HITL, OAuth, Seguridad*

---

Una vez que `bugrouter` fue capaz de resolver cualquier dependencia a su tracker canónico y limpiar secretos a nivel de tipos (como vimos en el [Devlog #1](https://riccivr.github.io/blog/bugrouter-devlog-01-architecture-zero-dep-go-and-the-agent-constitution.html)), nos topamos con el segundo gran dolor de cabeza de los agentes de IA:

**Las plantillas de issues upstream no perdonan los textos desordenados.**

Si un agente detecta un fallo en una librería popular o en un repositorio corporativo, casi ningún mantenedor acepta que le suelten una descripción en texto plano sin ton ni son. En GitHub la norma son los Issue Forms en YAML con campos obligatorios y cajas de selección. En GitLab te piden plantillas de Markdown cargadas por query params (`?issuable_template=Bug`). Y en Bugzilla los servidores exigen esquemas REST con campos estrictos de producto y componente.

Cuando un agente ignora estas reglas y abre un ticket con un bloque de texto plano, un bot de triaje le clava una etiqueta de issue inválido al tiro, o un mantenedor humano le cierra el bug con el típico mensaje predeterminado: *"Por favor utiliza la plantilla oficial para reportar errores"*.

En el Hito 2 (Milestone 2), nos propusimos resolver la introspección automática de plantillas, el descubrimiento de servicios en monorepos empresariales y la construcción de un panel de control con colas de revisión Human-in-the-Loop (HITL)—todo sin meter ni una sola librería externa en Go.

---

## 1. Introspección Upstream con Cero Dependencias

Para respetar los formatos de cada proyecto, `bugrouter` tiene que descargar, inspeccionar y parsear plantillas directamente desde las plataformas remotas. Sin embargo, importar librerías pesadas para parsear YAML o HTML violaría de frente la constitución de `AGENTS.md`.

En `internal/introspector`, armamos parsers procedurales línea por línea usando `bufio.Scanner` y funciones de `strings` nativas de Go:

- **Issue Forms en YAML de GitHub (`.github/ISSUE_TEMPLATE/*.yml`):** Consultamos la API de GitHub para listar plantillas, descargamos los formularios candidatos y los parseamos línea a línea. El parser rastrea los niveles de indentación, identifica los bloques `type: textarea` o `type: input` y extrae el `id` y el `attributes.label`.
- **Plantillas en Markdown de GitHub y GitLab (`.github/ISSUE_TEMPLATE/*.md` o `.gitlab/issue_templates/*.md`):** Escaneamos los encabezados de Markdown (`## Descripción`, `### Pasos para reproducir`, `### Entorno`) y extraemos los textos de ayuda y comentarios HTML.
- **Esquemas REST de Bugzilla (`/rest/field/bug` y `/rest/product`):** Para instancias de Bugzilla, consultamos los endpoints nativos de REST para obtener los componentes permitidos, versiones válidas y campos obligatorios de triaje.

```
┌──────────────────────────────────────────────────────────────┐
│ Introspección y Parsing de Esquemas (Cero Dependencias)      │
│                                                              │
│ 1. API GitHub   ───> .github/ISSUE_TEMPLATE/bug.yml          │
│                      └─ Scanner línea por línea (labels/ids) │
│ 2. API GitLab   ───> .gitlab/issue_templates/Bug.md          │
│                      └─ Parser de encabezados Markdown       │
│ 3. Bugzilla REST───> /rest/field/bug & /rest/product/NAME    │
│                      └─ Unmarshaling directo de JSON         │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ Motor de Mapeo Semántico (internal/adapter)                  │
│ - Resumen / Qué pasó        ───> "### Summary"               │
│ - Pasos de reproducción     ───> "### Steps to Reproduce"    │
│ - Comportamiento esperado   ───> "### Behavior"              │
│ - Logs y trazas de error    ───> "### Logs & Traces"         │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Mapeo Semántico y Enlaces Directos Pre-llenados

Con los esquemas ya parseados, `internal/adapter/draft.go` ubica cada dato del reporte en la sección exacta que espera el proyecto remoto.

Si la plantilla tiene un campo llamado `What happened?` o `Describe the bug`, `bugrouter` asigna el contenido de `in.Summary`. Si encuentra `Reproduction Steps` o `Pasos`, le inyecta `in.StepsToReproduce`. Las trazas y logs de consola se envuelven automáticamente en bloques de código Markdown (` ``` `).

Además, `bugrouter` genera URLs con deep-linking listas para abrir con un clic en el navegador:
- **GitHub:** Mapea los IDs de los campos directamente en los parámetros de la URL (`https://github.com/org/repo/issues/new?template=bug.yml&summary=...`).
- **GitLab:** Genera el enlace seleccionando automáticamente la plantilla (`https://gitlab.com/org/repo/-/issues/new?issuable_template=Bug`).
- **Bugzilla:** Arma la cadena de consulta lista para `enter_bug.cgi`.

---

## 3. Catálogo Corporativo: `LayerOrgCloud`

En empresas grandes, los desarrolladores y los agentes no trabajan solo con repositorios públicos en GitHub. Es muy común tener instancias privadas de GitHub Enterprise, servidores locales de GitLab, o enrutar los tickets de ciertos microservicios directo a Jira o Linear.

Para cubrir este escenario, introdujimos la capa **`LayerOrgCloud`** como la Capa 0 de nuestra cascada de resolución. Lee un archivo de catálogo (`services.json`) ubicado en `$XDG_CONFIG_HOME/bugrouter/services.json`, `/etc/bugrouter/services.json` o la variable de entorno `BUGROUTER_SERVICES_FILE`:

```json
{
  "services": [
    {
      "name": "payment-worker",
      "repository_url": "https://git.corp.internal/fintech/payment-worker",
      "tracker": {
        "protocol": "jira",
        "url": "https://jira.corp.internal/projects/PAY"
      }
    }
  ]
}
```

Si un agente pide reportar un bug para `payment-worker`, `bugrouter` lo empareja de inmediato con el catálogo interno y evita hacer consultas innecesarias en internet.

---

## 4. Servidor del Control Plane HTTP (`bugrouter serve`)

Dejar que un agente de IA tenga vía libre para abrir issues automáticamente en repositorios upstream en producción es una receta para el desastre. Un bucle con alucinaciones te puede abrir 50 tickets basura en cuestión de segundos.

Para garantizar que siempre haya un humano supervisando la jugada, levantamos un daemon HTTP de control plane con cero dependencias:

```bash
bugrouter serve --port 8080
```

`internal/cloud` incluye:
1. **Interfaz Web SPA Embebida:** Un dashboard en HTML, CSS y JavaScript servido directamente desde la memoria del binario en Go, sin assets externos ni node_modules.
2. **Almacenamiento Local de Borradores (`DraftStore`):** Los borradores se guardan de forma atómica en `$XDG_DATA_HOME/bugrouter/drafts/<id>.json` con permisos `0600` (lectura y escritura exclusivas para tu usuario).
3. **Revisión en un Clic:** El desarrollador entra a la interfaz, revisa el borrador con los secretos ya sanitizados, valida los encabezados de la plantilla upstream y le da a **Aprobar** o **Descartar**.
4. **Conectores Autenticados a Forges:** Al darle a Aprobar, `ForgeClient` se encarga de enviar el issue a GitHub Enterprise, GitLab Self-Managed, Jira REST o Linear GraphQL usando tokens OAuth o PATs configurados.

```
[Agente vía MCP / CLI] ──> bugrouter draft ──> Guardado Atómico (0600 JSON)
                                                        │
                                                        ▼
[Humano en Navegador] <─── http://localhost:8080 ─── [Cola DraftStore]
       │
   (Aprobar)
       │
       ▼
[ForgeClient Autenticado] ──> Envía el Ticket a la API del Tracker
```

---

## 5. Blindaje y Remediaciones Red-Team (Spec 06.1)

Apenas terminamos el control plane, le metimos una auditoría interna de seguridad tipo Red-Team (Spec 06.1) para tapar posibles vectores de ataque:

1. **Límites de SSRF en ForgeClient:** Originalmente, `ForgeClient` usaba llamadas estándar de red. Lo migramos a `httpx.PostBytes` para garantizar que ninguna URL falsificada pudiera consultar direcciones IP de la red local o interfaces loopback.
2. **Protección contra Path Traversal:** Blindamos la validación del ID de los borradores en todas las rutas y métodos de lectura en disco. Cualquier ID que contenga `/`, `\`, `..` o caracteres no alfanuméricos se descarta de inmediato para evitar que lean archivos arbitrarios del sistema.
3. **Inyección CRLF en Títulos (RFC-822):** En `internal/adapter/draft.go`, agregamos una función de sanitización que elimina saltos de línea `\r` y `\n` en los títulos de los bugs, evitando que alguien inyecte cabeceras SMTP al armar correos para trackers como Debbugs.

Con el Hito 2 terminado, `bugrouter` pasó de ser una simple herramienta de resolución en terminal a convertirse en un puente integral de triaje con supervisión humana.

En el Devlog #3 veremos cómo detectar issues duplicados antes de abrirlos, añadir probes para Rust y Python, y proteger el panel de control con autenticación Bearer en tiempo constante y webhooks firmados con HMAC.
