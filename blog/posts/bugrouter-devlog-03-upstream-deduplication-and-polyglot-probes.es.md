# bugrouter Devlog #3: Detección de Duplicados Upstream, Probes Políglotas y Blindaje Red-Team

*Publicado: 29 de octubre de 2026. Categoría: Sistemas & Seguridad. Tiempo de lectura: ~8 min*
*Etiquetas: Go, bugrouter, Devlog, Duplicados, Políglota, Auditoría, Webhooks, Seguridad*

---

Pregúntale a cualquier mantenedor de código abierto cuál es su mayor queja con la ola reciente de agentes de IA para programar, y siempre te va a responder lo mismo:

**Los agentes abren tickets duplicados a cada rato.**

Un agente autónomo que corre un test suite se topa con un `502 Bad Gateway` en un microservicio de autenticación o con un panic al parsear un JSON. El modelo asume que es el primer ser en el universo en presenciar semejante error. Sin fijarse si ya hay un issue abierto, redacta el bug y lo envía. A la mañana siguiente, los mantenedores se despiertan con tres tickets idénticos describiendo el mismo stack trace.

En el Hito 3 (Milestone 3) de `bugrouter`, atacamos tres frentes clave de ingeniería:
1. Construir un motor autónomo de **detección de issues duplicados** para consultar los trackers remotos y avisar antes de mandar nada.
2. Expandir nuestros probes de workspace y sistema a un **ecosistema políglota** (manifiestos de Rust con Cargo, paquetes de Python con pyproject.toml y paquetes de Fedora y Arch Linux).
3. Blindar el Cloud Control Plane con **autenticación Bearer en tiempo constante**, **filtros contra CSRF**, **registros de auditoría append-only en JSONL** y **webhooks firmados con HMAC-SHA256**.

Todo esto, de nuevo, manteniendo la restricción de cero dependencias externas en Go.

---

## 1. Detección de Duplicados Upstream: `internal/dedup`

Para frenar los reportes duplicados antes de que salgan, `bugrouter` consulta la API de búsqueda del tracker remoto usando palabras clave extraídas del título del bug.

En vez de meter una librería pesada de procesamiento de lenguaje natural o una base de datos vectorial, implementamos un algoritmo determinista de coincidencia de tokens:

- **Filtrado de Stop Words:** Limpiamos palabras comunes en inglés (`a`, `the`, `is`, `in`, `failed`, `error`, `bug`, `issue`, `panic`, etc.) que solo meten ruido.
- **Extracción de Términos Relevantes:** Seleccionamos los tokens con mayor carga informativa (hasta 5 tokens) para consultar la API del tracker (`/search/issues` en GitHub, `/issues?search=` en GitLab o `/rest/bug?summary=` en Bugzilla).
- **Puntuación por Solapamiento de Tokens:** Para cada issue devuelto por el servidor, calculamos el porcentaje de solapamiento tipo Jaccard:
  $$\text{Porcentaje de Coincidencia} = \frac{|\text{Tokens}(\text{Consulta}) \cap \text{Tokens}(\text{Título Upstream})|}{|\text{Tokens}(\text{Consulta})|} \times 100$$
- Si un issue existente tiene más de un 20% de solapamiento, `bugrouter` lo adjunta a `draft.PotentialDuplicates` y muestra una advertencia visible en la terminal y en el dashboard web.

```
┌──────────────────────────────────────────────────────────────┐
│ Motor de Detección de Duplicados (internal/dedup)            │
│                                                              │
│ Título: "Payment gateway timeout in checkout worker"         │
│                      │                                       │
│                      ▼                                       │
│ [Filtro Stop Words] ──> ["payment", "gateway", "checkout"]   │
│                      │                                       │
│                      ▼                                       │
│ [API de Búsqueda]   ──> Consulta GitHub / GitLab / Bugzilla  │
│                      │                                       │
│                      ▼                                       │
│ [Scorer de Tokens]  ──> Issue #88: "Payment gateway timeout" │
│                         (Solapamiento: 66% ──> Duplicado!)   │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Probes de Workspace Políglotas: Rust y Python

En el Hito 1, nuestro probe de workspace solo entendía `package.json` de Node y `go.mod` de Go. En este hito extendimos `internal/resolver/workspace.go` para cubrir proyectos modernos en Rust y Python:

### Rust (`Cargo.toml` y `Cargo.lock`)
- Parsea dependencias bajo `[dependencies]`, `[dev-dependencies]` y `[build-dependencies]`.
- Resuelve herencia de workspaces en Cargo (`dep.workspace = true`) subiendo por el árbol de directorios.
- Extrae dependencias de git leyendo los repositorios declarados en `Cargo.lock`.
- Inspecciona la sección raíz `[package]` para obtener enlaces de repositorio directo.

### Python (`pyproject.toml`)
- Parsea listas estándar de dependencias PEP 508 y PEP 621 (`dependencies = [...]`).
- Soporta tablas inline de Poetry (`[tool.poetry.dependencies]`).
- Extrae URLs canónicas de `[project.urls]` (`Homepage`, `Repository`, `Bug Tracker`).
- Aplica normalización según PEP 503 y PEP 508 (eliminando extras como `requests[security]`, pasando a minúsculas y cambiando `.` y `-` por `_`).

---

## 3. Consultas a Gestores de Paquetes en Linux: RPM y Pacman

`bugrouter` no se queda solo en librerías de lenguajes. Si un agente se topa con un fallo en un binario del sistema operativo en un servidor o contenedor, puede consultar directamente el paquete del SO.

Ampliamos `OSPackageProbe` para ir más allá del `dpkg` de Debian:
- **Fedora / RHEL / CentOS (`rpm`):** Ejecutamos `rpm -qf <binario>` para ubicar el paquete y luego `rpm -qi <paquete>` para extraer el campo `URL:`. Le damos prioridad a la página oficial del proyecto antes que al tracker de la distribución.
- **Arch Linux (`pacman`):** Ejecutamos `pacman -Qoq <binario>` y `pacman -Qi <paquete>` para obtener la URL original del software.

Toda llamada a subprocesos utiliza `exec.CommandContext` con límites de tiempo estrictos y validación de nombres de binarios con listas blancas.

---

## 4. Blindaje del Cloud Control Plane (Spec 08)

Con el control plane gestionando borradores de fallos en producción, endurecimos toda la capa de seguridad con estándares corporativos:

```
┌──────────────────────────────────────────────────────────────┐
│ Seguridad del Cloud Control Plane (Spec 08)                  │
│                                                              │
│ 1. Auth Bearer en Tiempo Constante (crypto/subtle)           │
│ 2. Filtro de Origen CSRF y Cabeceras Obligatorias            │
│ 3. Registro de Auditoría JSONL Append-Only (Permisos 0600)   │
│ 4. Webhooks con Blindaje SSRF y Firmas HMAC-SHA256           │
└──────────────────────────────────────────────────────────────┘
```

### Autenticación Bearer en Tiempo Constante
Para evitar ataques de temporización (timing attacks), las rutas protegidas (`/api/v1/drafts`, `/api/v1/audit`) comparan los tokens Bearer usando `crypto/subtle.ConstantTimeCompare`. Para que la longitud del token no filtre información, tanto el token configurado como el que llega en la cabecera se pasan primero por SHA-256:

```go
expectedHash := sha256.Sum256([]byte(s.authToken))
tokenHash := sha256.Sum256([]byte(token))
if subtle.ConstantTimeCompare(expectedHash[:], tokenHash[:]) != 1 {
    http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
    return
}
```

### Protección contra CSRF y Validación de Origen
Las rutas que modifican estado (`POST /api/v1/drafts/{id}/approve` y `/discard`) exigen comprobación de origen. Cualquier petición del navegador se bloquea si el `Origin` o `Referer` no coincide con el host. Además, la petición debe incluir el token Bearer o la cabecera personalizada `X-Bugrouter-Request: 1`.

### Log de Auditoría Append-Only en JSONL
Cada acción de triaje se guarda en un log inmutable en `$XDG_STATE_HOME/bugrouter/audit.log` con permisos estrictos `0600`. El servidor expone el endpoint `/api/v1/audit` para leer los eventos más recientes en orden cronológico inverso, con un tope acotado de 1 MiB.

### Webhooks Firmados con HMAC-SHA256
Cuando se aprueba o descarta un ticket, `WebhookNotifier` envía el evento a la URL configurada. El payload viaja firmado con HMAC-SHA256 en la cabecera `X-Bugrouter-Signature: sha256=<hex>` y se despacha a través de `httpx` con timeout de 3 segundos, impidiendo que se usen webhooks falsificados para atacar infraestructura interna.

---

Con el Hito 3 listo, `bugrouter` quedó armado con resolución políglota, detección automática de duplicados y controles de seguridad para entornos enterprise.

En el Devlog #4 veremos el Hito 4: refinar la precisión del scrubber para evitar falsos positivos, pulir la experiencia de la CLI y analizar la revisión técnica que nos hizo un evaluador independiente.
