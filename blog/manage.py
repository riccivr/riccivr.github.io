#!/usr/bin/env python3
"""
Script de administración y descubribilidad del blog para riccivr.github.io
Uso:
    python3 manage.py build          # Reconstruye posts.json, sitemap.xml, feed.xml y llms.txt
    python3 manage.py new "Título"   # Crea una plantilla nueva en Markdown
"""

import os
import re
import json
import datetime
from xml.sax.saxutils import escape

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SITE_ROOT = os.path.dirname(BASE_DIR)
POSTS_DIR = os.path.join(BASE_DIR, "posts")
POSTS_JSON = os.path.join(BASE_DIR, "posts.json")
SITEMAP_XML = os.path.join(SITE_ROOT, "sitemap.xml")
FEED_XML = os.path.join(SITE_ROOT, "feed.xml")
LLMS_TXT = os.path.join(SITE_ROOT, "llms.txt")

SITE_URL = "https://riccivr.github.io"
AUTHOR_NAME = "Ricardo Veronese"
AUTHOR_EMAIL = "ricci.vr@gmail.com"

SPANISH_MONTHS = {
    'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
    'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
    'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12,
    'january': 1, 'february': 2, 'march': 3, 'april': 4,
    'may': 5, 'june': 6, 'july': 7, 'august': 8,
    'september': 9, 'october': 10, 'november': 11, 'december': 12
}

def slugify(text):
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')

def estimate_reading_time(content):
    words = len(re.findall(r'\w+', content))
    minutes = max(1, round(words / 200))
    return f"{minutes} min"

def parse_date(content):
    # Match "30 de agosto de 2026" or "August 30, 2026" or "2026-08-30"
    m_iso = re.search(r'(\d{4}-\d{2}-\d{2})', content)
    if m_iso:
        return m_iso.group(1)

    m_es = re.search(r'(\d{1,2})\s+de\s+([a-zA-Z]+)\s+(?:de\s+)?(\d{4})', content, re.IGNORECASE)
    if m_es:
        day = int(m_es.group(1))
        month_name = m_es.group(2).lower()
        year = int(m_es.group(3))
        month = SPANISH_MONTHS.get(month_name, 8)
        return f"{year:04d}-{month:02d}-{day:02d}"

    m_en = re.search(r'([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})', content)
    if m_en:
        month_name = m_en.group(1).lower()
        day = int(m_en.group(2))
        year = int(m_en.group(3))
        month = SPANISH_MONTHS.get(month_name, 8)
        return f"{year:04d}-{month:02d}-{day:02d}"

    return datetime.date.today().isoformat()

def parse_post(filepath):
    slug = os.path.splitext(os.path.basename(filepath))[0]
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract title (# Title)
    title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    title = title_match.group(1) if title_match else slug.replace('-', ' ').title()

    date = parse_date(content)

    # Extract category
    cat_match = re.search(r'(?:Categor[íi]a|Category):\s*([^·\n*]+)', content, re.IGNORECASE)
    category = cat_match.group(1).strip() if cat_match else "Sistemas y Arquitectura"

    # Extract summary (first paragraph after title/metadata)
    paragraphs = [p.strip() for p in re.split(r'\n\s*\n', content) if p.strip()]
    summary = ""
    for p in paragraphs:
        if p.startswith('#') or p.startswith('*') or p.startswith('---') or p.startswith('```'):
            continue
        clean_p = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', p)
        clean_p = re.sub(r'[*_`]', '', clean_p)
        summary = clean_p[:220] + ('...' if len(clean_p) > 220 else '')
        break

    # Extract tags
    tags_match = re.search(r'(?:Etiquetas|Tags):\s*([^\n*]+)', content, re.IGNORECASE)
    if tags_match:
        tags = [t.strip() for t in tags_match.group(1).split(',')]
    else:
        tags = ["Sistemas", "Arquitectura"]

    reading_time = estimate_reading_time(content)
    mtime = os.path.getmtime(filepath)

    return {
        "slug": slug,
        "title": title,
        "date": date,
        "category": category,
        "tags": tags,
        "summary": summary,
        "readingTime": reading_time,
        "file": f"posts/{os.path.basename(filepath)}",
        "_mtime": mtime
    }

def generate_sitemap(posts):
    today = datetime.date.today().isoformat()
    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    ]

    # Home page
    xml_lines.append('  <url>')
    xml_lines.append(f'    <loc>{SITE_URL}/</loc>')
    xml_lines.append(f'    <lastmod>{today}</lastmod>')
    xml_lines.append('    <changefreq>weekly</changefreq>')
    xml_lines.append('    <priority>1.0</priority>')
    xml_lines.append('  </url>')

    # Blog index
    xml_lines.append('  <url>')
    xml_lines.append(f'    <loc>{SITE_URL}/blog/</loc>')
    xml_lines.append(f'    <lastmod>{today}</lastmod>')
    xml_lines.append('    <changefreq>daily</changefreq>')
    xml_lines.append('    <priority>0.9</priority>')
    xml_lines.append('  </url>')

    # Each post
    for post in posts:
        post_url = f"{SITE_URL}/blog/post.html?post={post['slug']}"
        xml_lines.append('  <url>')
        xml_lines.append(f'    <loc>{post_url}</loc>')
        xml_lines.append(f'    <lastmod>{post["date"]}</lastmod>')
        xml_lines.append('    <changefreq>monthly</changefreq>')
        xml_lines.append('    <priority>0.8</priority>')
        xml_lines.append('  </url>')

    xml_lines.append('</urlset>')

    with open(SITEMAP_XML, 'w', encoding='utf-8') as f:
        f.write('\n'.join(xml_lines) + '\n')
    print(f"[✓] Generado {SITEMAP_XML}")

def generate_rss(posts):
    now_rfc822 = datetime.datetime.now(datetime.timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")
    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
        '  <channel>',
        f'    <title>{AUTHOR_NAME} - Bitácoras Técnicas y Sistemas</title>',
        f'    <link>{SITE_URL}/blog/</link>',
        '    <description>Reflexiones sobre arquitectura cloud, ingeniería de sistemas, C99, algoritmos y sistemas embebidos IoT.</description>',
        '    <language>es-ve</language>',
        f'    <lastBuildDate>{now_rfc822}</lastBuildDate>',
        f'    <atom:link href="{SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>'
    ]

    for post in posts:
        post_url = f"{SITE_URL}/blog/post.html?post={post['slug']}"
        try:
            dt = datetime.datetime.strptime(post["date"], "%Y-%m-%d")
            pub_date = dt.strftime("%a, %d %b %Y 12:00:00 GMT")
        except Exception:
            pub_date = now_rfc822

        xml_lines.append('    <item>')
        xml_lines.append(f'      <title>{escape(post["title"])}</title>')
        xml_lines.append(f'      <link>{post_url}</link>')
        xml_lines.append(f'      <guid isPermaLink="true">{post_url}</guid>')
        xml_lines.append(f'      <pubDate>{pub_date}</pubDate>')
        xml_lines.append(f'      <description>{escape(post["summary"])}</description>')
        for tag in post.get("tags", []):
            xml_lines.append(f'      <category>{escape(tag)}</category>')
        xml_lines.append('    </item>')

    xml_lines.append('  </channel>')
    xml_lines.append('</rss>')

    with open(FEED_XML, 'w', encoding='utf-8') as f:
        f.write('\n'.join(xml_lines) + '\n')
    print(f"[✓] Generado {FEED_XML}")

def generate_llms_txt(posts):
    lines = [
        f"# {AUTHOR_NAME}",
        "",
        "> Ingeniero de Cloud y Sistemas especializado en AWS, arquitecturas distribuidas, desarrollo en bajo nivel con C99/POSIX, parsers y algoritmos de memoria acotada.",
        "",
        "## Proyectos Activos",
        "- [approx](https://github.com/riccivr/approx): Filtro y clasificador de streams difusos POSIX no interactivo en C99 limpio con cero dependencias.",
        "- [unipaste](https://github.com/riccivr/unipaste): Conversor universal de portapapeles y texto enriquecido a Markdown estructurado y tablas ASCII/Unicode con cero dependencias.",
        "- [clipbridge](https://github.com/riccivr/clipbridge): Demonio y puente multiplataforma para el portapapeles potenciado por el motor unipaste.",
        "",
        "## Bitácoras Técnicas y Artículos"
    ]

    for post in posts:
        md_url = f"{SITE_URL}/blog/{post['file']}"
        lines.append(f"- [{post['title']}]({md_url}): {post['summary']}")

    lines.extend([
        "",
        "## Feeds y Metadatos de Máquina",
        f"- Feed RSS: {SITE_URL}/feed.xml",
        f"- Mapa del Sitio (Sitemap): {SITE_URL}/sitemap.xml",
        f"- Portal Web: {SITE_URL}/",
        f"- Blog: {SITE_URL}/blog/",
        "- GitHub: https://github.com/riccivr",
        "- LinkedIn: https://www.linkedin.com/in/riccivr/",
        f"- Correo: {AUTHOR_EMAIL}"
    ])

    with open(LLMS_TXT, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')
    print(f"[✓] Generado {LLMS_TXT}")

POST_CHRONO_ORDER = {
    "being-a-good-net-citizen-in-the-ai-era": 3,
    "preserving-the-web-with-git": 2,
    "using-github-as-a-database": 1
}

def cmd_build():
    os.makedirs(POSTS_DIR, exist_ok=True)
    posts = []
    for fname in os.listdir(POSTS_DIR):
        if fname.endswith('.md'):
            fpath = os.path.join(POSTS_DIR, fname)
            post_meta = parse_post(fpath)
            posts.append(post_meta)

    # Sort newest first using date and explicit chrono sequence / mtime
    posts.sort(key=lambda x: (x['date'], POST_CHRONO_ORDER.get(x['slug'], x['_mtime'])), reverse=True)

    clean_posts = []
    for p in posts:
        item = dict(p)
        item.pop('_mtime', None)
        clean_posts.append(item)

    with open(POSTS_JSON, 'w', encoding='utf-8') as f:
        json.dump(clean_posts, f, indent=2, ensure_ascii=False)
    print(f"[✓] Indexadas {len(clean_posts)} bitácoras en {POSTS_JSON}")

    generate_sitemap(clean_posts)
    generate_rss(clean_posts)
    generate_llms_txt(clean_posts)

def cmd_new(title):
    os.makedirs(POSTS_DIR, exist_ok=True)
    slug = slugify(title)
    filename = f"{slug}.md"
    filepath = os.path.join(POSTS_DIR, filename)

    if os.path.exists(filepath):
        print(f"[!] La publicación ya existe: {filepath}")
        return

    today = datetime.date.today().strftime("%d de agosto de %Y")

    template = f"""# {title}

*Publicado: {today} · Categoría: Sistemas y Arquitectura · Tiempo de lectura: ~4 min*
*Etiquetas: Sistemas, Arquitectura*

---

Escribe la introducción de tu artículo aquí...

## Sección 1

Contenido con formato Markdown estándar, bloques de código y listas.

## Resumen

Conclusiones y puntos clave.
"""
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(template)

    print(f"[✓] Creada nueva bitácora: {filepath}")
    cmd_build()

if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2 or sys.argv[1] == 'build':
        cmd_build()
    elif sys.argv[1] == 'new' and len(sys.argv) > 2:
        cmd_new(sys.argv[2])
    else:
        print("Uso:\n  python3 manage.py build\n  python3 manage.py new \"Título del Artículo\"")
