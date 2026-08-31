#!/usr/bin/env python3
"""
Bilingual Blog & Site Management Script for riccivr.github.io
Usage:
    python3 manage.py build          # Rebuilds posts.json, sitemap.xml, feed.xml, and llms.txt
    python3 manage.py new "Title"    # Creates new markdown post templates (en & es)
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

POST_CHRONO_ORDER = {
    "being-a-good-net-citizen-in-the-ai-era": 3,
    "preserving-the-web-with-git": 2,
    "using-github-as-a-database": 1
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

def parse_markdown_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    title = title_match.group(1) if title_match else "Untitled"

    date = parse_date(content)

    cat_match = re.search(r'(?:Categor[íi]a|Category):\s*([^.·\n*]+)', content, re.IGNORECASE)
    category = cat_match.group(1).strip() if cat_match else "Systems & Architecture"

    paragraphs = [p.strip() for p in re.split(r'\n\s*\n', content) if p.strip()]
    summary = ""
    for p in paragraphs:
        if p.startswith('#') or p.startswith('*') or p.startswith('---') or p.startswith('```'):
            continue
        clean_p = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', p)
        clean_p = re.sub(r'[*_`]', '', clean_p)
        summary = clean_p[:220] + ('...' if len(clean_p) > 220 else '')
        break

    tags_match = re.search(r'(?:Etiquetas|Tags):\s*([^\n*]+)', content, re.IGNORECASE)
    if tags_match:
        tags = [t.strip() for t in tags_match.group(1).split(',')]
    else:
        tags = ["Systems", "Architecture"]

    reading_time = estimate_reading_time(content)

    return {
        "title": title,
        "date": date,
        "category": category,
        "tags": tags,
        "summary": summary,
        "readingTime": reading_time,
        "file": f"posts/{os.path.basename(filepath)}"
    }

def get_post_slugs():
    slugs = set()
    for fname in os.listdir(POSTS_DIR):
        if fname.endswith('.md'):
            # Remove .en.md or .es.md or .md
            base = re.sub(r'\.(?:en|es)\.md$', '', fname)
            base = re.sub(r'\.md$', '', base)
            slugs.add(base)
    return sorted(list(slugs))

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
    print(f"[✓] Generated {SITEMAP_XML}")

def generate_rss(posts):
    now_rfc822 = datetime.datetime.now(datetime.timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")
    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
        '  <channel>',
        f'    <title>{AUTHOR_NAME} - Technical Logs & Systems</title>',
        f'    <link>{SITE_URL}/blog/</link>',
        '    <description>Reflections on cloud architecture, systems engineering, C99, algorithms, and IoT.</description>',
        '    <language>es-ve</language>',
        f'    <lastBuildDate>{now_rfc822}</lastBuildDate>',
        f'    <atom:link href="{SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>'
    ]

    for post in posts:
        post_url = f"{SITE_URL}/blog/post.html?post={post['slug']}"
        meta = post.get('es') or post.get('en') or post
        try:
            dt = datetime.datetime.strptime(post["date"], "%Y-%m-%d")
            pub_date = dt.strftime("%a, %d %b %Y 12:00:00 GMT")
        except Exception:
            pub_date = now_rfc822

        xml_lines.append('    <item>')
        xml_lines.append(f'      <title>{escape(meta["title"])}</title>')
        xml_lines.append(f'      <link>{post_url}</link>')
        xml_lines.append(f'      <guid isPermaLink="true">{post_url}</guid>')
        xml_lines.append(f'      <pubDate>{pub_date}</pubDate>')
        xml_lines.append(f'      <description>{escape(meta["summary"])}</description>')
        for tag in meta.get("tags", []):
            xml_lines.append(f'      <category>{escape(tag)}</category>')
        xml_lines.append('    </item>')

    xml_lines.append('  </channel>')
    xml_lines.append('</rss>')

    with open(FEED_XML, 'w', encoding='utf-8') as f:
        f.write('\n'.join(xml_lines) + '\n')
    print(f"[✓] Generated {FEED_XML}")

def generate_llms_txt(posts):
    lines = [
        f"# {AUTHOR_NAME}",
        "",
        "> Systems & Cloud Engineer specializing in AWS, Cloud Architecture, C99/POSIX low-level systems, parsers, and memory-bounded algorithms.",
        "",
        "## Active Projects",
        "- [approx](https://github.com/riccivr/approx): Non-interactive POSIX fuzzy stream filter and ranker in clean Suckless C with zero dependencies.",
        "- [unipaste](https://github.com/riccivr/unipaste): Zero-dependency POSIX universal rich text & clipboard converter producing structured Markdown and ASCII tables.",
        "- [clipbridge](https://github.com/riccivr/clipbridge): Cross-platform universal clipboard listener daemon powered by unipaste.",
        "",
        "## Engineering Logs & Articles (Bilingual: EN / ES)"
    ]

    for post in posts:
        en_meta = post.get('en') or post
        es_meta = post.get('es') or post
        lines.append(f"- [{en_meta['title']}]({SITE_URL}/blog/{en_meta['file']}) / [{es_meta['title']}]({SITE_URL}/blog/{es_meta['file']}): {en_meta['summary']}")

    lines.extend([
        "",
        "## Machine Feeds & Meta",
        f"- RSS Feed: {SITE_URL}/feed.xml",
        f"- Sitemap: {SITE_URL}/sitemap.xml",
        f"- Website: {SITE_URL}/",
        f"- Blog: {SITE_URL}/blog/",
        "- GitHub: https://github.com/riccivr",
        "- LinkedIn: https://www.linkedin.com/in/riccivr/",
        f"- Email: {AUTHOR_EMAIL}"
    ])

    with open(LLMS_TXT, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')
    print(f"[✓] Generated {LLMS_TXT}")

def cmd_build():
    os.makedirs(POSTS_DIR, exist_ok=True)
    slugs = get_post_slugs()
    posts = []

    for slug in slugs:
        en_file = os.path.join(POSTS_DIR, f"{slug}.en.md")
        es_file = os.path.join(POSTS_DIR, f"{slug}.es.md")
        fallback_file = os.path.join(POSTS_DIR, f"{slug}.md")

        en_meta = parse_markdown_file(en_file) if os.path.exists(en_file) else (parse_markdown_file(fallback_file) if os.path.exists(fallback_file) else None)
        es_meta = parse_markdown_file(es_file) if os.path.exists(es_file) else (parse_markdown_file(fallback_file) if os.path.exists(fallback_file) else None)

        if not en_meta and not es_meta:
            continue

        primary = es_meta or en_meta
        date = primary["date"]
        mtime = os.path.getmtime(es_file if os.path.exists(es_file) else (en_file if os.path.exists(en_file) else fallback_file))

        post_entry = {
            "slug": slug,
            "date": date,
            "title": primary["title"],
            "category": primary["category"],
            "tags": primary["tags"],
            "summary": primary["summary"],
            "readingTime": primary["readingTime"],
            "file": primary["file"],
            "en": en_meta,
            "es": es_meta,
            "_mtime": mtime
        }
        posts.append(post_entry)

    # Sort newest first
    posts.sort(key=lambda x: (x['date'], POST_CHRONO_ORDER.get(x['slug'], x['_mtime'])), reverse=True)

    clean_posts = []
    for p in posts:
        item = dict(p)
        item.pop('_mtime', None)
        clean_posts.append(item)

    with open(POSTS_JSON, 'w', encoding='utf-8') as f:
        json.dump(clean_posts, f, indent=2, ensure_ascii=False)
    print(f"[✓] Indexed {len(clean_posts)} bilingual posts into {POSTS_JSON}")

    generate_sitemap(clean_posts)
    generate_rss(clean_posts)
    generate_llms_txt(clean_posts)

if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2 or sys.argv[1] == 'build':
        cmd_build()
    else:
        print("Usage:\n  python3 manage.py build")
