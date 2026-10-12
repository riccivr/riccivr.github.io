# d1-pages-starter: conectando GitHub Pages con SQLite serverless mediante Cloudflare D1 y Workers

*Publicado: 12 de octubre de 2026. Categoría: Sistemas & Cloud. Tiempo de lectura: ~5 min*
*Etiquetas: SQLite, Cloudflare D1, Cloudflare Workers, GitHub Pages, CLI, Serverless*

---

Cada vez que quiero armar una herramienta pequeña, un tablero de notas, un registro de correos o un widget interactivo para la web, me gusta mantener dos reglas claras: cero costos fijos mensuales y cero servidores que tener que parchar a las tres de la mañana.

Para el frontend, GitHub Pages resuelve casi todo: alojamiento estático gratuito, CDN global rápido, despliegues automáticos desde Git y 100 GB de transferencia mensual. Pero en cuanto necesitas que los usuarios interactúen y guarden datos de verdad, te chocas contra la pared clásica de la web estática: no hay base de datos donde escribir.

Durante mucho tiempo la recomendación por defecto para proyectos personales fue PlanetScale, hasta que en abril de 2024 eliminaron su plan gratuito y pasaron a cobrar un mínimo de 39 dólares al mes. Tampoco sirve meter un archivo `.sqlite` directo en el repositorio de GitHub Pages: aunque existen experimentos con WebAssembly (`sql.js-httpvfs`) para hacer consultas de solo lectura con peticiones HTTP Range, un archivo en GitHub Pages es público por definición (cualquiera puede descargarse la base de datos entera) y los servidores estáticos rechazan peticiones `POST` o `PUT`, impidiendo que los usuarios guarden datos.

Para resolver este problema de raíz construí [**`d1-pages-starter`**](https://github.com/riccivr/d1-pages-starter): una arquitectura edge que conecta GitHub Pages con **Cloudflare D1** (SQLite nativo serverless) utilizando **Cloudflare Workers** como gateway seguro, acompañada de un CLI interactivo para inicializar proyectos en segundos.

---

## 1. La arquitectura: puente edge entre GitHub Pages y D1

La idea central es separar estrictamente la entrega estática de la persistencia de datos. El navegador descarga el HTML, CSS y JavaScript desde GitHub Pages, y luego realiza peticiones REST al Cloudflare Worker, que se encarga de la validación, los encabezados CORS y la ejecución de sentencias SQL preparadas sobre Cloudflare D1.

```
┌──────────────────────────────────────────────────────────────┐
│ 1. Navegador del Visitante                                   │
│ - Descarga interfaz estática (HTML, CSS, JS)                │
└──────────────────────────────┬───────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
┌──────────────────────────────┐┌──────────────────────────────┐
│ GitHub Pages (Alojamiento)   ││ Cloudflare Worker (Gateway)  │
│ - CDN global estático        ││ - Valida tipos y longitudes  │
│ - 100 GB/mes de ancho banda  ││ - Restringe orígenes con CORS│
│ - 0 ms de arranque en frío   ││ - Conexión nativa env.DB     │
└──────────────────────────────┘└──────────────┬───────────────┘
                                               │
                                               ▼
                                ┌──────────────────────────────┐
                                │ Cloudflare D1 (SQLite Edge)  │
                                │ - Sentencias preparadas SQL  │
                                │ - 5 GB almacenamiento        │
                                │ - 5M lecturas / 100k escrit. │
                                └──────────────────────────────┘
```

Esta estructura tiene tres ventajas técnicas clave:

1. **Cero credenciales en el cliente:** Los navegadores nunca ven una contraseña, token o cadena de conexión a la base de datos. D1 se vincula al Worker de forma nativa mediante `env.DB`, por lo que no existen secretos que puedan filtrarse en bundles de JavaScript.
2. **Cero costos de infraestructura:** GitHub Pages ofrece 100 GB/mes de transferencia; Cloudflare Workers incluye 100.000 peticiones diarias gratuitas; y Cloudflare D1 ofrece 5 GB de almacenamiento, 5 millones de lecturas y 100.000 escrituras al día. Para proyectos personales, herramientas de equipo o prototipos, el costo es de cero dólares al mes.
3. **Emulación local sin conexión:** Con Wrangler puedes ejecutar `wrangler d1 execute --local` para inicializar y probar tu base de datos SQLite directamente en tu máquina local sin enviar un solo paquete a la nube.

---

## 2. Soporte multilenguaje: TypeScript, Rust y Python

Aunque TypeScript suele ser la opción habitual en Cloudflare Workers, no estás atado a un solo runtime. Gracias a WebAssembly, el Worker puede compilarse directamente en **Rust** usando [`worker-rs`](https://github.com/cloudflare/workers-rs), ofreciendo seguridad de tipos estricta y bajo consumo de memoria con soporte nativo para D1:

```rust
use worker::*;
use serde::{Deserialize, Serialize};

#[event(fetch)]
async fn fetch(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    let d1 = env.d1("DB")?;
    let stmt = d1.prepare("SELECT id, name, message FROM posts ORDER BY id DESC LIMIT 50");
    let results = stmt.all().await?.results::<serde_json::Value>()?;
    Response::from_json(&serde_json::json!({ "success": true, "data": results }))
}
```

Para quienes prefieren scripts ligeros sin tooling complejo, Cloudflare Workers también soporta Python nativo mediante Pyodide en WebAssembly.

---

## 3. Un CLI interactivo para inicializar en segundos

Para no tener que copiar carpetas a mano ni pelearse con configuraciones de Wrangler, empaqueté un CLI interactivo inspirado en `bun create` dentro del repositorio:

```bash
# Con bun:
bun create d1-pages mi-app

# Con npx:
npx create-d1-pages mi-app

# O directamente desde el repositorio:
node bin/cli.js
```

El asistente interactivo guía paso a paso al desarrollador por terminal:

* **Base de datos:** Cloudflare D1 (SQLite nativo) o Turso (libSQL distribuido).
* **Lenguaje del backend:** TypeScript, Rust (WebAssembly) o Python.
* **Frontend:** Vanilla JS (cero pasos de compilación), React con Vite y Tailwind CSS, Astro (sitio estático con islas interactivas) o Svelte 5 con runes.
* **Plantilla de datos:** Libro de visitas / feed, formulario de lista de espera con validación, o contadores atómicos de votos y visitas.
* **CI/CD:** Generación automática de flujos de GitHub Actions para desplegar tanto GitHub Pages como el Worker en Cloudflare con cada `git push`.

El proyecto completo, el código del CLI y todas las plantillas están disponibles en código abierto en [**github.com/riccivr/d1-pages-starter**](https://github.com/riccivr/d1-pages-starter) con licencia MIT.
