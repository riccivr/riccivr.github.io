# bugrouter Devlog #1: Arquitectura con Cero Dependencias, Espíritu C99 en Go y la Constitución para Agentes

*Publicado: 27 de octubre de 2026. Categoría: Sistemas & Arquitectura. Tiempo de lectura: ~7 min*
*Etiquetas: Go, bugrouter, Devlog, Arquitectura, MCP, Seguridad, Sistemas, Agentes*

---

Si te has puesto a cacharrear en serio con agentes de IA autónomos que tiran código en tus proyectos, seguro te has estrellado de frente con el mismo saperoco de siempre.

El agente se topa con un test que falla, un panic en una dependencia externa o una herramienta rota del sistema. Decide que lo correcto es reportar el problema y abrir un issue. Lo que pasa a continuación es casi siempre una tragedia:

1. **Confusión de trackers:** El agente adivina dónde está el repositorio. Le abre un bug al mirror personal de alguien en GitHub cuando el proyecto de verdad vive en GitLab, o le escribe al mantenedor de un paquete de npm por un error que viene de la libc de Debian.
2. **Fuga de credenciales:** Con el apuro de pegar los logs de error, el agente le clava al reporte variables de entorno, claves de AWS en texto plano, tokens de GitHub, URIs de bases de datos con usuario y contraseña, y la ruta completa de `/home/ricci`.
3. **Pasan de las plantillas:** Ignora por completo las plantillas de issues del proyecto upstream (los Issue Forms en YAML o los checklists en Markdown) y suelta un párrafo desordenado que los mantenedores cierran a los tres minutos.
4. **Spam de duplicados:** Abre tickets duplicados de vainas que ya estaban reportadas y discutidas desde la semana pasada.

Para resolver este peo de raíz y darle a los agentes de código un puente de triaje blindado, empecé a construir [**`bugrouter`**](https://github.com/riccivr/bugrouter): una CLI autónoma y servidor Model Context Protocol (MCP) en Go con cero dependencias externas, capaz de resolver artefactos a sus trackers canónicos, sanitizar credenciales a nivel de tipos, introspeccionar plantillas, detectar duplicados y dejar borradores listos para revisión con Human-in-the-Loop.

Este es el recuento del Hito 1 (Milestone 1), la constitución técnica detrás del proyecto y por qué escribir Go con mentalidad de C99 marca toda la diferencia.

---

## 1. La Constitución de Ingeniería: Espíritu C99 en Go Moderno

Desde el primer commit, `bugrouter` se diseñó bajo una filosofía estricta documentada en `AGENTS.md`—una constitución técnica que rige tanto el trabajo de los agentes de IA como el mío:

- **Explícito antes que inteligente:** Código en Go plano, procedural y predecible. Nada de jerarquías profundas de interfaces, nada de reflección y nada de abusar de generics.
- **Sesgo de cero dependencias:** Únicamente la librería estándar de Go (`net/http`, `encoding/json`, `os/exec`, `crypto/subtle`, `flag`). Cero paquetes de terceros en `go.mod`. Si para parsear un formato de texto sencillo una librería te pide meter 40 dependencias transitivas, nos escribimos un parser procedural acotado con la librería estándar y listo.
- **Ejecución acotada:** Toda petición de red y todo subproceso exige un `context.Context` con timeout explícito y lectura limitada con `io.LimitReader`. Nunca se confía a ciegas en lo que responda un servidor externo.
- **Manejo explícito de errores:** Prohibido ignorar errores con `_ = ...`. Cada fallo se envuelve con contexto útil (`fmt.Errorf("probe dpkg for %s: %w", bin, err)`).
- **CalVer y Conventional Commits:** Versionado mediante CalVer (`2026.10.0`) y validación estricta de mensajes de commit mediante hooks.

```
┌──────────────────────────────────────────────────────────────┐
│ Constitución para Agentes de bugrouter (AGENTS.md)           │
│ 1. Espíritu C99: flujo procedural, plano y determinista      │
│ 2. Cero Dependencias: exclusivo de librería estándar Go 1.22 │
│ 3. Ejecución Acotada: límites con context.Context y Readers  │
│ 4. Seguridad de Tipos: límite ScrubbedText para credenciales │
│ 5. Commits Quirúrgicos: Conventional Commits con hooks       │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Blindando la frontera de red: `httpx`

Dado que un agente le puede pedir a `bugrouter` que resuelva cualquier URL, dominio corporativo o paquete de software, el cliente HTTP no puede ser un simple `http.DefaultClient`. Eso sería abrirle la puerta de par en par a ataques de Server-Side Request Forgery (SSRF) y DNS-rebinding en la red local.

En `internal/httpx`, construimos un cliente HTTP acotado que implementa:

- **Protección contra SSRF y DNS-Rebinding:** Hooks en el `net.Dialer` que chequean la dirección IP resuelta antes de conectar el socket. Cualquier rango privado (RFC 1918 `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), direcciones de loopback (`127.0.0.0/8`, `::1`), link-local (`169.254.0.0/16`) o CGNAT se rechazan de inmediato.
- **Límites de lectura de body:** Las respuestas pasan por `io.LimitReader` con un tope estricto de 2 MiB, evitando ataques de agotamiento de memoria si un servidor remoto manda un payload infinito.
- **Reintentos y Rate Limiting:** Manejo automático de cabeceras `Retry-After` para respuestas `429 Too Many Requests` y `503 Service Unavailable` con backoff exponencial.

---

## 3. El Motor de Resolución en Cascada de 6 Capas

Cuando ejecutas `bugrouter resolve <target>`, el motor evalúa una cascada jerárquica de 6 capas (`internal/resolver`):

```
                       [Target / Query]
                            │
                            ▼
                  [Capa 0: Org Cloud]
            (Catálogo services.json corporativo)
                            │
                            ▼
                 [Capa 1: URL Directa]
         (github.com/org/repo, gitlab.com, etc.)
                            │
                            ▼
                  [Capa 2: Workspace]
         (node_modules, go.mod, Cargo, pyproject)
                            │
                            ▼
                [Capa 3: Paquetes del SO]
         (Debian dpkg/apt, Fedora rpm, Arch pacman)
                            │
                            ▼
                   [Capa 4: Registry]
             (APIs de npm, PyPI, Crates.io)
                            │
                            ▼
                 [Capa 5: Dominio Web]
        (.well-known/bug-report, RFC 9116 security.txt)
                            │
                            ▼
                 [Resolución del Tracker]
       (Nombre Canónico, URL de Tracker, Protocolo)
```

1. **`org-cloud`:** Revisa catálogos de microservicios internos y propiedad de monorepos antes de salir a internet.
2. **`direct-url`:** Reconoce rutas directas en GitHub, GitLab, Codeberg y SourceHut.
3. **`workspace`:** Inspecciona manifiestos locales (`node_modules/paquete/package.json`, `go.mod`, etc.) para sacar el repo upstream exacto y la versión instalada.
4. **`os-pkg`:** Inspecciona binarios del sistema en el gestor de paquetes (ej. `dpkg -S /usr/bin/curl` y `apt-cache show curl`).
5. **`registry`:** Consulta en paralelo los registros públicos de paquetes (`npm`, `PyPI`, `Crates.io`).
6. **`web-domain`:** Rastrea `.well-known/bug-report` y RFC 9116 `security.txt` en dominios SaaS.

Para que las consultas sean instantáneas, los resultados se guardan en `$XDG_CACHE_HOME/bugrouter/targets` con claves hasheadas con SHA-256 y reemplazo atómico de archivos.

---

## 4. Sanitización a Nivel de Tipos: `ScrubbedText`

La mayoría de herramientas tratan la limpieza de secretos como un filtro cosmético: le pasan una expresión regular al texto antes de imprimir y rezan para que no se escape nada. Si a un programador se le olvida llamar al filtro, las credenciales terminan en el issue tracker público.

En `bugrouter`, la seguridad se garantiza en el sistema de tipos de Go:

```go
// ScrubbedText representa texto sanitizado que pasó por
// los filtros de credenciales y rutas personales.
type ScrubbedText string

func Scrub(raw string) ScrubbedText {
    // 1. Claves privadas PEM
    // 2. Cabeceras Bearer / Authorization
    // 3. Tokens conocidos (AWS, GitHub, Stripe, OpenAI, Slack)
    // 4. Asignaciones genéricas de secretos (token=..., secret=...)
    // 5. Credenciales en cadenas de conexión de base de datos
    // 6. Prefijos de carpetas personales (/home/alice -> ~)
    ...
}
```

El adaptador de borradores (`internal/adapter`) no acepta un `string` plano para el título ni para el cuerpo del issue; exige `scrubber.ScrubbedText`. Si un agente intenta generar un borrador sin pasar los datos por el scrubber, el compilador de Go no deja compilar el binario.

---

## 5. Servidor Model Context Protocol (MCP)

En vez de obligar al usuario a escribir scripts raros de bash para comunicarse con modelos de lenguaje, `bugrouter` expone sus herramientas de forma nativa a Claude Code, Cursor, Windsurf y Cline mediante el Model Context Protocol:

```bash
bugrouter mcp
```

Levanta un servidor JSON-RPC 2.0 por stdio con cero librerías externas. En el Hito 1, publicamos las herramientas esenciales:
- `resolve_target`: Resuelve una dependencia o artefacto a su bug tracker upstream.
- `scrub_text`: Limpia trazas de consola y logs de ejecución de cualquier secreto.
- `draft_bug_report`: Genera un borrador estructurado y sanitizado listo para enviar.

Con el Hito 1 cerrado, `bugrouter` ya era capaz de responder con total certeza: *¿A quién le pertenece este bug, qué tracker utiliza y cómo limpiamos el reporte para no filtrar secretos?*

En el Devlog #2 veremos el Hito 2: parsear plantillas de issues sin dependencias, manejar catálogos corporativos y levantar una interfaz web para triaje con Human-in-the-Loop.
