# Ser un buen ciudadano de la red en la era de la IA: guía moderna para el rastreo y descubrimiento web

*Publicado: 30 de agosto de 2026. Categoría: Web Standards & Cloud. Tiempo de lectura: ~5 min*
*Etiquetas: Web Standards, IA, SEO, Crawlers, Arquitectura, Semantic Web*

---

Los buscadores cambiaron la web indexando enlaces. Hoy en día, los agentes automatizados, los pipelines RAG y herramientas de búsqueda como Perplexity o Claude recorren sitios web para responder preguntas directamente a los usuarios.

Si un crawler necesita ejecutar 15MB de JavaScript en el cliente para ver tu contenido, va a cerrar la conexión. Muchos agentes de IA tienen límites estrictos de latencia y tokens, por lo que ni siquiera ejecutan JavaScript.

Aquí te dejo varias recomendaciones prácticas para que tu sitio sea fácil de leer por máquinas sin tumbar tu servidor ni pelear con los crawlers.

---

## 1. HTML estático y etiquetas semánticas reales

Googlebot puede levantar instancias de Chromium headless para renderizar SPAs complejas. La mayoría de los bots más pequeños y los crawlers de búsqueda de IA no hacen eso. Mandan una petición GET básica y esperan texto plano en la respuesta.

```
Petición GET del crawler (/articulo)
         │
         ├── SPA pesada de cliente ──> Devuelve <div id="root"></div> ──> Descartado
         │
         └── HTML estático         ──> Devuelve el DOM semántico       ──> Parseado al instante
```

### Qué conviene hacer:
- Devuelve HTML pre-renderizado. Asegúrate de que tus artículos y documentación estén en el cuerpo del HTTP response inicial antes de que corra cualquier script.
- Usa etiquetas HTML5 estándar como `<main>`, `<article>`, `<header>`, `<nav>`, `<aside>` y `<time>`. Los parsers usan estas etiquetas para separar el texto principal de los menús y el pie de página.
- Usa encabezados lógicos de `<h1>` a `<h4>`. Los algoritmos de chunking de los LLM usan los títulos para dividir documentos en fragmentos coherentes.

---

## 2. Publicar un archivo `llms.txt` y feeds de texto plano

El estándar `llms.txt` es un archivo simple en Markdown ubicado en `/llms.txt`. Le da a los modelos de lenguaje un índice limpio con tus páginas y documentación técnica más relevante sin obligarlos a scrapear basura.

```
# Ricardo Veronese

> Herramientas de sistemas en C99, infraestructura cloud y algoritmos.

## Proyectos
- [approx](https://riccivr.github.io/): Filtro de streams difuso POSIX en C99.
- [unipaste](https://riccivr.github.io/): Formateador de HTML del portapapeles a Markdown.

## Artículos principales
- [Archivar la web con Git](https://riccivr.github.io/blog/posts/preserving-the-web-with-git.es.md): Crawling web nativo en Git.
- [¿Se puede usar GitHub como base de datos?](https://riccivr.github.io/blog/posts/using-github-as-a-database.es.md): SQLite VFS mediante peticiones HTTP Range.
```

### Otros feeds útiles:
- Mantén un feed RSS o Atom en `/feed.xml`. Los agentes y lectores de feeds revisan este archivo para encontrar nuevos posts sin tener que rastrear todo el sitio.
- Cuando sea posible, sirve Markdown directamente o deja mirrors `.md` de tus artículos técnicos.

---

## 3. Datos estructurados con Schema.org JSON-LD

Para ayudar a los motores de búsqueda de IA a citar tu nombre, URL original y fecha de publicación correctamente, agrega un bloque JSON-LD en el `<head>` de cada post.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Archivar la web con Git: construyendo un crawler e indexador histórico",
  "author": {
    "@type": "Person",
    "name": "Ricardo Veronese",
    "url": "https://riccivr.github.io"
  },
  "datePublished": "2026-08-30",
  "dateModified": "2026-08-30",
  "description": "Uso de packfiles y plomería de bajo nivel de Git para archivar páginas web.",
  "dependencies": "C99, POSIX, Git"
}
</script>
```

Cuando un agente cita tu artículo en una respuesta, este esquema le permite referenciar el enlace canónico y la fecha real en lugar de inventar detalles.

---

## 4. Reglas claras en `robots.txt`

Bloquear a todos los bots con `User-agent: * Disallow: /` te borra de los índices de búsqueda de IA. Conviene separar los crawlers de búsqueda en tiempo real de los scrapers que bajan datasets masivos para entrenamiento.

```txt
# Permitir bots de búsqueda y citación
User-agent: Google-Extended
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

# Bloquear scrapers masivos de entrenamiento si hace falta
User-agent: CCBot
Disallow: /telemetry/

Crawl-delay: 1
Sitemap: https://riccivr.github.io/sitemap.xml
```

Mantén siempre un archivo `sitemap.xml` con fechas `lastmod` correctas para que los bots no descarguen una y otra vez páginas sin cambios.

---

## 5. Caché HTTP y cortesía de servidor

Un buen sitio web cuida los recursos de su servidor y de los clientes:

1. Soporta cabeceras `ETag` e `If-Modified-Since`. Responder con `HTTP 304 Not Modified` ahorra ancho de banda para ambos lados.
2. Evita retos de Cloudflare o CAPTCHAs en documentación pública. Forzar verificaciones interactivas rompe herramientas de terminal como `curl`, scrapers de consola y lectores CLI.
3. Configura etiquetas Open Graph claras como `og:title`, `og:description` y `rel="canonical"`.

---

## Resumen

| Área | Recomendación | Razón |
| :--- | :--- | :--- |
| Renderizado | HTML estático o DOM del servidor | Parseo rápido, cero dependencia de JS en cliente |
| Semántica | Etiquetas HTML5 estándar | Chunking limpio para pipelines RAG |
| Manifiestos | `/llms.txt` y `/feed.xml` | Bajo consumo de tokens para agentes de IA |
| Atribución | Schema.org JSON-LD | Citas confiables de autor y enlaces originales |
| Caché | `ETag` y `304 Not Modified` | Ahorro de ancho de banda y energía |
| Políticas | `robots.txt` y `sitemap.xml` claros | Control de bots de búsqueda vs scrapers masivos |

Crear para la web moderna implica que el contenido sea cómodo de leer para las personas en el navegador y sencillo de procesar para herramientas automáticas.
