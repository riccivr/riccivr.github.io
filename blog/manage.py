#!/usr/bin/env python3
"""
Bilingual Blog & Site Management Script for riccivr.github.io
Usage:
    python3 manage.py build          # Rebuilds static post HTML files, posts.json, sitemap.xml, feed.xml, and llms.txt
    python3 manage.py new "Title"    # Creates new markdown post templates (en & es)
"""

import os
import re
import json
import datetime
from xml.sax.saxutils import escape

try:
    import markdown
except ImportError:
    markdown = None

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SITE_ROOT = os.path.dirname(BASE_DIR)
POSTS_DIR = os.path.join(BASE_DIR, "posts")
POSTS_JSON = os.path.join(BASE_DIR, "posts.json")
POSTS_DATA_JS = os.path.join(BASE_DIR, "posts-data.js")
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
    "gitcrawl-content-addressable-web-archiver": 4,
    "being-a-good-net-citizen-in-the-ai-era": 3,
    "preserving-the-web-with-git": 2,
    "using-github-as-a-database": 1
}

STATIC_POST_TEMPLATE = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title id="meta-title">{meta_title}</title>
    <link rel="shortcut icon" href="../favicon.ico" type="image/x-icon">
    <meta name="author" content="Ricardo Veronese">
    <link rel="alternate" type="application/rss+xml" title="Ricardo Veronese - Blog RSS Feed" href="https://riccivr.github.io/feed.xml">
    <meta name="description" id="meta-desc" content="{meta_desc}">
    <link rel="canonical" href="{canonical_url}">

    <!-- Open Graph -->
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Ricardo Veronese">
    <meta property="og:title" id="og-title" content="{meta_title}">
    <meta property="og:description" id="og-desc" content="{meta_desc}">
    <meta property="og:url" content="{canonical_url}">
    <meta property="og:image" content="https://riccivr.github.io/riccivr-retro-og.png">

    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" id="tw-title" content="{meta_title}">
    <meta name="twitter:description" id="tw-desc" content="{meta_desc}">
    <meta name="twitter:image" content="https://riccivr.github.io/riccivr-retro-og.png">

    <!-- Schema.org BlogPosting -->
    <script type="application/ld+json">
    {{
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": {schema_title_json},
        "description": {schema_desc_json},
        "author": {{
            "@type": "Person",
            "name": "Ricardo Veronese",
            "url": "https://riccivr.github.io/"
        }},
        "datePublished": "{date_published}",
        "mainEntityOfPage": "{canonical_url}"
    }}
    </script>

    <link rel="stylesheet" href="../style.css">
    <script>
        // Immediately apply saved or system theme and language to avoid FOUC
        (function() {{
            try {{
                const savedTheme = localStorage.getItem('riccivr-theme');
                const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
                if (savedTheme === 'light' || (!savedTheme && prefersLight)) {{
                    document.documentElement.setAttribute('data-theme', 'light');
                }} else {{
                    document.documentElement.removeAttribute('data-theme');
                }}

                const savedLang = localStorage.getItem('riccivr-lang');
                const browserLang = (navigator.language || (navigator.languages && navigator.languages[0]) || '').toLowerCase();
                const activeLang = (savedLang === 'es' || savedLang === 'en') ? savedLang : (browserLang.startsWith('es') ? 'es' : 'en');
                document.documentElement.setAttribute('lang', activeLang);
            }} catch(e) {{}}
        }})();
    </script>
    <style>
        :root {{
            --bg-page: #0c0a07;
            --bg-frame: #110e0a;
            --bg-header: #1a140d;
            --bg-card: #16120b;
            --bg-card-alt: #1c160e;
            --bg-badge: rgba(245, 158, 11, 0.12);
            
            --border-primary: #d97706;
            --border-subtle: rgba(217, 119, 6, 0.45);
            --border-dim: rgba(217, 119, 6, 0.2);
            
            --text-title: #fffbeb;
            --text-heading: #fef08a;
            --text-main: #fde68a;
            --text-muted: #fbbf24;
            --text-dim: #f59e0b;
            --text-code: #fef08a;
            --text-blockquote: #fde68a;
            
            --scanline-color: rgba(245, 158, 11, 0.035);
            --frame-shadow: 0 0 16px rgba(245, 158, 11, 0.2), 0 0 1px rgba(245, 158, 11, 0.4) inset;
            --btn-hover-bg: #f59e0b;
            --btn-hover-text: #110e0a;
            
            --bg-code-block: #080705;
            --bg-inline-code: rgba(245, 158, 11, 0.14);
            --bg-blockquote: rgba(245, 158, 11, 0.08);
            --bg-table-header: rgba(245, 158, 11, 0.18);
        }}

        [data-theme="light"] {{
            --bg-page: #f5efe1;
            --bg-frame: #fcf8f0;
            --bg-header: #ebe0ca;
            --bg-card: #f3ecdb;
            --bg-card-alt: #eae0cb;
            --bg-badge: rgba(146, 64, 14, 0.08);
            
            --border-primary: #92400e;
            --border-subtle: rgba(146, 64, 14, 0.5);
            --border-dim: rgba(146, 64, 14, 0.25);
            
            --text-title: #1a0a01;
            --text-heading: #78350f;
            --text-main: #2b1103;
            --text-muted: #612809;
            --text-dim: #78350f;
            --text-code: #581c87;
            --text-blockquote: #451a03;
            
            --scanline-color: rgba(146, 64, 14, 0.035);
            --frame-shadow: 0 3px 14px rgba(146, 64, 14, 0.18), 0 0 0 1px rgba(146, 64, 14, 0.12) inset;
            --btn-hover-bg: #92400e;
            --btn-hover-text: #fcf8f0;
            
            --bg-code-block: #f7f1e4;
            --bg-inline-code: #eeddc3;
            --bg-blockquote: #f0e6d2;
            --bg-table-header: #ebdcc0;
        }}

        /* Custom retro scrollbar */
        ::-webkit-scrollbar {{
            width: 8px;
            height: 8px;
        }}
        ::-webkit-scrollbar-track {{
            background: var(--bg-page);
        }}
        ::-webkit-scrollbar-thumb {{
            background: var(--border-subtle);
            border-radius: 2px;
        }}
        ::-webkit-scrollbar-thumb:hover {{
            background: var(--border-primary);
        }}

        .post-content pre::-webkit-scrollbar-track {{
            background: var(--bg-code-block);
        }}

        body {{
            background-color: var(--bg-page);
            background-image: linear-gradient(var(--scanline-color) 1px, transparent 1px);
            background-size: 100% 4px;
            font-family: 'Courier New', Courier, monospace;
            color: var(--text-main);
            transition: background-color 0.15s ease, color 0.15s ease;
        }}

        .terminal-frame {{
            box-shadow: var(--frame-shadow);
            border: 2px solid var(--border-primary);
            background-color: var(--bg-frame);
        }}

        .interactive-link {{
            transition: color 0.1s ease, background-color 0.1s ease, border-color 0.1s ease;
            border-color: var(--border-primary);
            color: var(--text-main);
        }}
        .interactive-link:hover {{
            color: var(--btn-hover-text) !important;
            background-color: var(--btn-hover-bg) !important;
        }}

        .theme-border {{ border-color: var(--border-primary); }}
        .theme-border-subtle {{ border-color: var(--border-subtle); }}
        .theme-border-dim {{ border-color: var(--border-dim); }}

        .theme-bg-header {{ background-color: var(--bg-header); }}
        .theme-bg-card {{ background-color: var(--bg-card); }}
        .theme-bg-card-alt {{ background-color: var(--bg-card-alt); }}

        .theme-text-title {{ color: var(--text-title); }}
        .theme-text-heading {{ color: var(--text-heading); }}
        .theme-text-main {{ color: var(--text-main); }}
        .theme-text-muted {{ color: var(--text-muted); }}
        .theme-text-dim {{ color: var(--text-dim); }}

        /* Typography & Markdown Styles */
        .post-content h1 {{
            font-size: clamp(1.2rem, 4.5vw, 1.65rem);
            font-weight: 800;
            color: var(--text-title);
            line-height: 1.35;
            margin-top: 0.25rem;
            margin-bottom: 1rem;
            border-bottom: 2px solid var(--border-primary);
            padding-bottom: 0.5rem;
            text-transform: uppercase;
            word-break: break-word;
            letter-spacing: -0.01em;
        }}
        .post-content h2 {{
            font-size: clamp(1.05rem, 3.8vw, 1.3rem);
            font-weight: 700;
            color: var(--text-heading);
            margin-top: 1.75rem;
            margin-bottom: 0.65rem;
            border-bottom: 1px dashed var(--border-subtle);
            padding-bottom: 0.25rem;
            line-height: 1.35;
            word-break: break-word;
        }}
        .post-content h3 {{
            font-size: clamp(0.95rem, 3.2vw, 1.1rem);
            font-weight: 700;
            color: var(--text-heading);
            margin-top: 1.35rem;
            margin-bottom: 0.45rem;
            line-height: 1.4;
            word-break: break-word;
        }}
        .post-content p {{
            margin-bottom: 1.15rem;
            line-height: 1.7;
            font-size: clamp(0.88rem, 2.5vw, 0.95rem);
            color: var(--text-main);
        }}
        .post-content ul, .post-content ol {{
            margin-bottom: 1.2rem;
            padding-left: 1.25rem;
        }}
        .post-content li {{
            margin-bottom: 0.45rem;
            line-height: 1.65;
            font-size: clamp(0.88rem, 2.5vw, 0.95rem);
        }}
        .post-content a {{
            color: var(--text-heading);
            text-decoration: underline;
            font-weight: bold;
            transition: color 0.1s ease, background-color 0.1s ease;
        }}
        .post-content a:hover {{
            color: var(--btn-hover-text);
            background-color: var(--btn-hover-bg);
            text-decoration: none;
        }}
        .post-content a code {{
            color: inherit !important;
            background-color: transparent !important;
            border: none !important;
            text-decoration: underline;
            padding: 0 !important;
        }}
        .post-content a:hover code {{
            color: var(--btn-hover-text) !important;
            background-color: transparent !important;
        }}
        .post-content code a {{
            color: var(--text-heading) !important;
            text-decoration: underline;
        }}
        .post-content code a:hover {{
            color: var(--btn-hover-text) !important;
            background-color: var(--btn-hover-bg) !important;
        }}
        .post-content blockquote {{
            border-left: 3px solid var(--border-primary);
            background: var(--bg-blockquote);
            padding: 0.75rem 1rem;
            margin: 1.2rem 0;
            font-style: italic;
            color: var(--text-blockquote);
        }}
        .post-content blockquote p {{
            margin-bottom: 0;
            color: var(--text-blockquote);
        }}
        .post-content hr {{
            border: 0;
            border-top: 1px solid var(--border-subtle);
            margin: 2rem 0;
        }}
        .post-content table {{
            width: 100%;
            border-collapse: collapse;
            margin: 1.5rem 0;
            font-size: 0.85rem;
        }}
        .post-content th, .post-content td {{
            border: 1px solid var(--border-subtle);
            padding: 0.5rem 0.75rem;
            text-align: left;
        }}
        .post-content th {{
            background-color: var(--bg-table-header);
            color: var(--text-heading);
            font-weight: bold;
        }}
        .post-content td {{
            color: var(--text-main);
        }}
        .post-content pre, .code-highlight pre {{
            background-color: var(--bg-code-block) !important;
            border: 1px solid var(--border-subtle);
            padding: 1rem;
            overflow-x: auto;
            margin: 1.2rem 0;
            border-radius: 2px;
            color: var(--text-main);
        }}
        .post-content pre code a, .code-highlight pre code a {{
            color: var(--text-heading) !important;
            text-decoration: underline;
        }}
        .post-content code, .code-highlight code {{
            font-family: 'Courier New', Courier, monospace;
            font-size: 0.88rem;
            line-height: 1.5;
        }}
        .post-content p code, .post-content li code {{
            background-color: var(--bg-inline-code);
            color: var(--text-code);
            padding: 0.1rem 0.3rem;
            border: 1px solid var(--border-dim);
            border-radius: 2px;
            font-weight: 600;
        }}

        /* Build-Time Pygments Syntax Highlighting (0 KB JS, 0 ms cost) */
        /* CRT Dark Amber Phosphor Scheme */
        html:not([data-theme="light"]) .code-highlight .k,
        html:not([data-theme="light"]) .code-highlight .kd,
        html:not([data-theme="light"]) .code-highlight .kn,
        html:not([data-theme="light"]) .code-highlight .kp,
        html:not([data-theme="light"]) .code-highlight .kr,
        html:not([data-theme="light"]) .code-highlight .kt,
        html:not([data-theme="light"]) .code-highlight .nt {{
            color: #f59e0b;
            font-weight: bold;
        }}
        html:not([data-theme="light"]) .code-highlight .nf,
        html:not([data-theme="light"]) .code-highlight .nc,
        html:not([data-theme="light"]) .code-highlight .nd,
        html:not([data-theme="light"]) .code-highlight .na,
        html:not([data-theme="light"]) .code-highlight .ne,
        html:not([data-theme="light"]) .code-highlight .fm {{
            color: #fef08a;
            font-weight: 600;
        }}
        html:not([data-theme="light"]) .code-highlight .s,
        html:not([data-theme="light"]) .code-highlight .s1,
        html:not([data-theme="light"]) .code-highlight .s2,
        html:not([data-theme="light"]) .code-highlight .sa,
        html:not([data-theme="light"]) .code-highlight .sb,
        html:not([data-theme="light"]) .code-highlight .sc,
        html:not([data-theme="light"]) .code-highlight .sd,
        html:not([data-theme="light"]) .code-highlight .se,
        html:not([data-theme="light"]) .code-highlight .sh,
        html:not([data-theme="light"]) .code-highlight .si,
        html:not([data-theme="light"]) .code-highlight .sx,
        html:not([data-theme="light"]) .code-highlight .sr,
        html:not([data-theme="light"]) .code-highlight .ss {{
            color: #a3e635;
        }}
        html:not([data-theme="light"]) .code-highlight .m,
        html:not([data-theme="light"]) .code-highlight .mi,
        html:not([data-theme="light"]) .code-highlight .mf,
        html:not([data-theme="light"]) .code-highlight .mh,
        html:not([data-theme="light"]) .code-highlight .mo,
        html:not([data-theme="light"]) .code-highlight .mb,
        html:not([data-theme="light"]) .code-highlight .kc {{
            color: #fb923c;
        }}
        html:not([data-theme="light"]) .code-highlight .c,
        html:not([data-theme="light"]) .code-highlight .c1,
        html:not([data-theme="light"]) .code-highlight .cm,
        html:not([data-theme="light"]) .code-highlight .cp,
        html:not([data-theme="light"]) .code-highlight .cs,
        html:not([data-theme="light"]) .code-highlight .ch {{
            color: #d97706;
            font-style: italic;
        }}
        html:not([data-theme="light"]) .code-highlight .o,
        html:not([data-theme="light"]) .code-highlight .ow {{
            color: #fde68a;
        }}
        html:not([data-theme="light"]) .code-highlight .p {{
            color: #fef08a;
        }}
        html:not([data-theme="light"]) .code-highlight .nb,
        html:not([data-theme="light"]) .code-highlight .bp {{
            color: #fbbf24;
        }}
        html:not([data-theme="light"]) .code-highlight .nv,
        html:not([data-theme="light"]) .code-highlight .vc,
        html:not([data-theme="light"]) .code-highlight .vg,
        html:not([data-theme="light"]) .code-highlight .vi,
        html:not([data-theme="light"]) .code-highlight .vm,
        html:not([data-theme="light"]) .code-highlight .n {{
            color: #fde68a;
        }}

        /* Light Paper Theme Syntax Highlighting - 100% WCAG Compliant */
        [data-theme="light"] .code-highlight .k,
        [data-theme="light"] .code-highlight .kd,
        [data-theme="light"] .code-highlight .kn,
        [data-theme="light"] .code-highlight .kp,
        [data-theme="light"] .code-highlight .kr,
        [data-theme="light"] .code-highlight .kt,
        [data-theme="light"] .code-highlight .nt {{
            color: #9a3412;
            font-weight: bold;
        }}
        [data-theme="light"] .code-highlight .nf,
        [data-theme="light"] .code-highlight .nc,
        [data-theme="light"] .code-highlight .nd,
        [data-theme="light"] .code-highlight .na,
        [data-theme="light"] .code-highlight .ne,
        [data-theme="light"] .code-highlight .fm {{
            color: #78350f;
            font-weight: 600;
        }}
        [data-theme="light"] .code-highlight .s,
        [data-theme="light"] .code-highlight .s1,
        [data-theme="light"] .code-highlight .s2,
        [data-theme="light"] .code-highlight .sa,
        [data-theme="light"] .code-highlight .sb,
        [data-theme="light"] .code-highlight .sc,
        [data-theme="light"] .code-highlight .sd,
        [data-theme="light"] .code-highlight .se,
        [data-theme="light"] .code-highlight .sh,
        [data-theme="light"] .code-highlight .si,
        [data-theme="light"] .code-highlight .sx,
        [data-theme="light"] .code-highlight .sr,
        [data-theme="light"] .code-highlight .ss {{
            color: #14532d;
        }}
        [data-theme="light"] .code-highlight .m,
        [data-theme="light"] .code-highlight .mi,
        [data-theme="light"] .code-highlight .mf,
        [data-theme="light"] .code-highlight .mh,
        [data-theme="light"] .code-highlight .mo,
        [data-theme="light"] .code-highlight .mb,
        [data-theme="light"] .code-highlight .kc {{
            color: #9a3412;
        }}
        [data-theme="light"] .code-highlight .c,
        [data-theme="light"] .code-highlight .c1,
        [data-theme="light"] .code-highlight .cm,
        [data-theme="light"] .code-highlight .cp,
        [data-theme="light"] .code-highlight .cs,
        [data-theme="light"] .code-highlight .ch {{
            color: #713f12;
            font-style: italic;
        }}
        [data-theme="light"] .code-highlight .o,
        [data-theme="light"] .code-highlight .ow {{
            color: #451a03;
        }}
        [data-theme="light"] .code-highlight .p {{
            color: #451a03;
        }}
        [data-theme="light"] .code-highlight .nb,
        [data-theme="light"] .code-highlight .bp {{
            color: #78350f;
        }}
        [data-theme="light"] .code-highlight .nv,
        [data-theme="light"] .code-highlight .vc,
        [data-theme="light"] .code-highlight .vg,
        [data-theme="light"] .code-highlight .vi,
        [data-theme="light"] .code-highlight .vm,
        [data-theme="light"] .code-highlight .n {{
            color: #2b1103;
        }}
    </style>
</head>
<body class="p-2 sm:p-6 md:p-12 min-h-screen">

    <a href="#main-content" id="skip-link" class="skip-link">[SALTAR AL CONTENIDO]</a>
    <div id="a11y-announcer" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>

    <div class="terminal-frame max-w-4xl mx-auto mt-1 sm:mt-4 rounded-lg overflow-hidden">

        <header class="p-2.5 sm:p-3 theme-bg-header border-b theme-border flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div class="flex items-center justify-between sm:justify-start gap-2">
                <span class="text-xs theme-text-muted tracking-wider font-bold truncate max-w-[220px] sm:max-w-none" id="header-sys-id">SYS.ID: riccivr // {slug}</span>
                <span class="status-label-text theme-text-main text-[11px] font-bold uppercase tracking-wider sm:hidden">
                    ESTADO: EN LÍNEA
                </span>
            </div>
            <div class="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2">
                <div class="flex items-center gap-1.5 sm:gap-2">
                    <button id="lang-toggle" class="interactive-link border theme-border px-2 py-0.5 text-[11px] sm:text-xs uppercase font-bold tracking-wider" aria-label="Alternar idioma / Toggle Language [I]" title="Alternar idioma / Toggle Language [I]">
                        [LANG: ES]
                    </button>
                    <button id="keys-toggle" class="interactive-link border theme-border px-2 py-0.5 text-[11px] sm:text-xs uppercase font-bold tracking-wider" aria-pressed="true" aria-label="Alternar atajos de navegación por teclado" title="Alternar atajos de navegación por teclado">
                        [TECLAS: ACT]
                    </button>
                    <button id="theme-toggle" class="interactive-link border theme-border px-2 py-0.5 text-[11px] sm:text-xs uppercase font-bold tracking-wider" aria-label="Alternar tema (CRT / Papel)" title="Alternar tema (CRT / Papel)">
                        [MODO: CRT]
                    </button>
                </div>
                <span class="status-label-text theme-text-main text-xs sm:text-sm font-bold uppercase tracking-wider hidden sm:inline-block ml-2">
                    ESTADO: EN LÍNEA
                </span>
            </div>
        </header>

        <main id="main-content" class="p-3.5 sm:p-6 md:p-8" tabindex="-1">

            <!-- Navigation Controls -->
            <div class="flex flex-wrap items-center justify-between gap-2 pb-3 mb-5 border-b theme-border-subtle text-[11px] sm:text-xs">
                <div class="flex gap-1.5 sm:gap-2">
                    <a href="index.html" id="back-index-btn" class="interactive-link border theme-border px-2.5 py-1 uppercase font-bold whitespace-nowrap" aria-label="Volver a la lista del blog">
                        [<] Volver al Blog
                    </a>
                    <a href="../" id="home-portal-btn" class="interactive-link border theme-border px-2.5 py-1 uppercase font-bold whitespace-nowrap" aria-label="Ir al portal principal">
                        [H] Portal Principal
                    </a>
                </div>
                <div class="flex gap-1.5 sm:gap-2">
                    <button id="copy-link-btn" class="interactive-link border theme-border px-2.5 py-1 uppercase font-bold whitespace-nowrap" aria-label="Copiar enlace de este artículo">
                        [S] Copiar Enlace
                    </button>
                    <a href="https://github.com/riccivr/riccivr.github.io" target="_blank" rel="noopener noreferrer" id="repo-btn" class="interactive-link border theme-border px-2.5 py-1 uppercase font-bold whitespace-nowrap" aria-label="Ver repositorio en GitHub (se abre en nueva pestaña)">
                        [G] Repo
                    </a>
                </div>
            </div>

            <!-- Post Container (Zero-JS Pre-rendered) -->
            <article id="post-article-es" lang="es">
                <div class="post-content">
{post_html_es}
                </div>
            </article>

            <article id="post-article-en" lang="en" style="display: none;">
                <div class="post-content">
{post_html_en}
                </div>
            </article>

            <!-- Bottom Return Navigation -->
            <div class="mt-10 sm:mt-12 pt-6 sm:pt-8 pb-3 sm:pb-4 border-t theme-border-subtle flex justify-between items-center text-xs sm:text-sm">
                <a href="index.html" id="bottom-back-btn" class="interactive-link border theme-border px-3.5 sm:px-4 py-1.5 uppercase font-bold whitespace-nowrap" aria-label="Volver a la lista de artículos">
                    [<] Volver al Blog
                </a>
                <a href="#" onclick="window.scrollTo({{top: 0, behavior: 'smooth'}}); return false;" id="bottom-top-btn" class="interactive-link border theme-border px-3.5 sm:px-4 py-1.5 uppercase font-bold whitespace-nowrap" aria-label="Ir arriba">
                    [^] Arriba
                </a>
            </div>

        </main>

        <footer class="p-3 sm:p-4 border-t theme-border text-xs flex justify-between items-center theme-bg-header">
            <span class="theme-text-muted text-[11px] sm:text-xs font-bold">riccivr.github.io/blog</span>
            <span id="footer-text" class="text-right text-[11px] sm:text-xs theme-text-muted font-mono font-medium">
                {footer_text_es}
            </span>
        </footer>

    </div>

    <!-- Progressive Enhancement Script -->
    <script>
        const i18n = {{
            es: {{
                sysId: "SYS.ID: riccivr // {slug}",
                status: "ESTADO: EN LÍNEA",
                langToggle: "[LANG: ES]",
                keysOn: "[TECLAS: ACT]",
                keysOff: "[TECLAS: DES]",
                modeCrt: "[MODO: CRT]",
                modePaper: "[MODO: PAPEL]",
                backIndex: "[<] Volver al Blog",
                homePortal: "[H] Portal Principal",
                copyLink: "[S] Copiar Enlace",
                copied: "[✓] ¡Copiado!",
                repo: "[G] Repo",
                topBtn: "[^] Arriba",
                footerText: {footer_text_es_json},
                title: {title_es_json},
                metaDesc: {desc_es_json}
            }},
            en: {{
                sysId: "SYS.ID: riccivr // {slug}",
                status: "STATUS: ONLINE",
                langToggle: "[LANG: EN]",
                keysOn: "[KEYS: ON]",
                keysOff: "[KEYS: OFF]",
                modeCrt: "[MODE: CRT]",
                modePaper: "[MODE: PAPER]",
                backIndex: "[<] Return to Blog",
                homePortal: "[H] Home Portal",
                copyLink: "[S] Copy Link",
                copied: "[✓] Copied!",
                repo: "[G] Repo",
                topBtn: "[^] Top",
                footerText: {footer_text_en_json},
                title: {title_en_json},
                metaDesc: {desc_en_json}
            }}
        }};

        function getLanguage() {{
            const saved = localStorage.getItem('riccivr-lang');
            if (saved === 'es' || saved === 'en') return saved;
            const browserLang = (navigator.language || (navigator.languages && navigator.languages[0]) || '').toLowerCase();
            return browserLang.startsWith('es') ? 'es' : 'en';
        }}

        let currentLang = getLanguage();

        function applyLanguageUI() {{
            const t = i18n[currentLang] || i18n.es;
            document.documentElement.setAttribute('lang', currentLang);

            document.querySelectorAll('.status-label-text').forEach(el => el.textContent = t.status);
            document.getElementById('lang-toggle').textContent = t.langToggle;

            const isLight = document.documentElement.getAttribute('data-theme') === 'light';
            document.getElementById('theme-toggle').textContent = isLight ? t.modePaper : t.modeCrt;

            const keysEnabled = localStorage.getItem('riccivr-keys') !== 'off';
            document.getElementById('keys-toggle').textContent = keysEnabled ? t.keysOn : t.keysOff;

            document.getElementById('back-index-btn').textContent = t.backIndex;
            document.getElementById('home-portal-btn').textContent = t.homePortal;
            document.getElementById('copy-link-btn').textContent = t.copyLink;
            document.getElementById('repo-btn').textContent = t.repo;
            document.getElementById('bottom-back-btn').textContent = t.backIndex;
            document.getElementById('bottom-top-btn').textContent = t.topBtn;
            document.getElementById('footer-text').textContent = t.footerText;

            // Toggle language articles
            const artEs = document.getElementById('post-article-es');
            const artEn = document.getElementById('post-article-en');
            if (artEs && artEn) {{
                if (currentLang === 'en') {{
                    artEs.style.display = 'none';
                    artEn.style.display = 'block';
                }} else {{
                    artEs.style.display = 'block';
                    artEn.style.display = 'none';
                }}
            }}

            // Update meta tags
            document.title = `${{t.title}} - Ricardo Veronese`;
            const metaDesc = document.getElementById('meta-desc');
            if (metaDesc) metaDesc.setAttribute('content', t.metaDesc);
            const ogTitle = document.getElementById('og-title');
            if (ogTitle) ogTitle.setAttribute('content', t.title);
            const ogDesc = document.getElementById('og-desc');
            if (ogDesc) ogDesc.setAttribute('content', t.metaDesc);
        }}

        // Theme toggle handling
        const themeBtn = document.getElementById('theme-toggle');
        function updateThemeBtn() {{
            const isLight = document.documentElement.getAttribute('data-theme') === 'light';
            const t = i18n[currentLang] || i18n.es;
            themeBtn.textContent = isLight ? t.modePaper : t.modeCrt;
        }}

        themeBtn.addEventListener('click', () => {{
            const isLight = document.documentElement.getAttribute('data-theme') === 'light';
            if (isLight) {{
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('riccivr-theme', 'dark');
            }} else {{
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('riccivr-theme', 'light');
            }}
            updateThemeBtn();
        }});

        // Language toggle handling
        document.getElementById('lang-toggle').addEventListener('click', () => {{
            currentLang = currentLang === 'es' ? 'en' : 'es';
            localStorage.setItem('riccivr-lang', currentLang);
            applyLanguageUI();
        }});

        // Keyboard shortcuts
        const keysBtn = document.getElementById('keys-toggle');
        let keyboardEnabled = localStorage.getItem('riccivr-keys') !== 'off';

        function updateKeysBtn() {{
            const t = i18n[currentLang] || i18n.es;
            keysBtn.textContent = keyboardEnabled ? t.keysOn : t.keysOff;
        }}

        keysBtn.addEventListener('click', () => {{
            keyboardEnabled = !keyboardEnabled;
            localStorage.setItem('riccivr-keys', keyboardEnabled ? 'on' : 'off');
            updateKeysBtn();
        }});

        // Copy link handler
        const copyBtn = document.getElementById('copy-link-btn');
        copyBtn.addEventListener('click', () => {{
            const url = window.location.href;
            const t = i18n[currentLang] || i18n.es;
            navigator.clipboard.writeText(url).then(() => {{
                const originalText = copyBtn.textContent;
                copyBtn.textContent = t.copied;
                setTimeout(() => {{
                    copyBtn.textContent = originalText;
                }}, 2000);
            }}).catch(() => {{
                prompt("Copia este enlace / Copy this link:", url);
            }});
        }});

        document.addEventListener('keydown', (e) => {{
            if (!keyboardEnabled) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const key = e.key.toLowerCase();
            if (key === 'i') {{
                e.preventDefault();
                document.getElementById('lang-toggle').click();
            }} else if (key === 't') {{
                e.preventDefault();
                themeBtn.click();
            }} else if (key === 'b' || key === '[') {{
                e.preventDefault();
                window.location.href = 'index.html';
            }} else if (key === 'h') {{
                e.preventDefault();
                window.location.href = '../';
            }} else if (key === 's') {{
                e.preventDefault();
                copyBtn.click();
            }} else if (key === 'g') {{
                e.preventDefault();
                window.open('https://github.com/riccivr/riccivr.github.io', '_blank');
            }} else if (key === 'k' || key === '^') {{
                e.preventDefault();
                window.scrollTo({{top: 0, behavior: 'smooth'}});
            }}
        }});

        // Apply initial UI
        applyLanguageUI();
        updateThemeBtn();
        updateKeysBtn();
    </script>
</body>
</html>"""

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

def markdown_to_html(content):
    if markdown:
        md = markdown.Markdown(
            extensions=['fenced_code', 'tables', 'nl2br', 'sane_lists', 'codehilite'],
            extension_configs={
                'codehilite': {
                    'css_class': 'code-highlight',
                    'guess_lang': False,
                    'use_pygments': True,
                    'noclasses': False
                }
            }
        )
        return md.convert(content)
    return "<p>" + content.replace("\n\n", "</p><p>") + "</p>"

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
        if p.startswith('#') or p.startswith('*') or p.startswith('---') or p.startswith('```') or p.startswith('>'):
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
    html_content = markdown_to_html(content)

    return {
        "title": title,
        "date": date,
        "category": category,
        "tags": tags,
        "summary": summary,
        "readingTime": reading_time,
        "html": html_content,
        "file": f"posts/{os.path.basename(filepath)}"
    }

def get_post_slugs():
    slugs = set()
    for fname in os.listdir(POSTS_DIR):
        if fname.endswith('.md'):
            base = re.sub(r'\.(?:en|es)\.md$', '', fname)
            base = re.sub(r'\.md$', '', base)
            slugs.add(base)
    return sorted(list(slugs))

def get_git_commit_hash():
    try:
        import subprocess
        res = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=BASE_DIR, capture_output=True, text=True, check=True)
        return res.stdout.strip() or "master"
    except Exception:
        return "master"

def generate_static_post_html(post_entry):
    slug = post_entry['slug']
    es = post_entry.get('es') or post_entry
    en = post_entry.get('en') or post_entry
    primary = es

    canonical_url = f"{SITE_URL}/blog/{slug}.html"
    meta_title = f"{primary['title']} - {AUTHOR_NAME}"
    meta_desc = primary['summary']

    post_date_raw = post_entry.get('date', '2026-08-30')
    post_date_dot = post_date_raw.replace('-', '.')
    git_hash = get_git_commit_hash()
    footer_text_es = f"REV: {git_hash} // PUBLICADO: {post_date_dot}"
    footer_text_en = f"REV: {git_hash} // PUBLISHED: {post_date_dot}"

    html = STATIC_POST_TEMPLATE.format(
        slug=slug,
        meta_title=escape(meta_title),
        meta_desc=escape(meta_desc),
        canonical_url=canonical_url,
        schema_title_json=json.dumps(primary['title']),
        schema_desc_json=json.dumps(primary['summary']),
        date_published=post_entry['date'],
        post_html_es=es['html'],
        post_html_en=en['html'],
        footer_text_es=escape(footer_text_es),
        footer_text_es_json=json.dumps(footer_text_es),
        footer_text_en_json=json.dumps(footer_text_en),
        title_es_json=json.dumps(es['title']),
        desc_es_json=json.dumps(es['summary']),
        title_en_json=json.dumps(en['title']),
        desc_en_json=json.dumps(en['summary'])
    )

    out_file = os.path.join(BASE_DIR, f"{slug}.html")
    with open(out_file, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"[✓] Generated static post {slug}.html ({footer_text_es})")

def generate_sitemap(posts):
    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        '  <url>',
        f'    <loc>{SITE_URL}/</loc>',
        '    <changefreq>weekly</changefreq>',
        '    <priority>1.0</priority>',
        '  </url>',
        '  <url>',
        f'    <loc>{SITE_URL}/blog/</loc>',
        '    <changefreq>weekly</changefreq>',
        '    <priority>0.9</priority>',
        '  </url>'
    ]

    for post in posts:
        post_url = f"{SITE_URL}/blog/{post['slug']}.html"
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
        post_url = f"{SITE_URL}/blog/{post['slug']}.html"
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
        "- [gitcrawl](https://github.com/riccivr/gitcrawl): Content-addressable web archiver and crawler CLI storing structured Markdown snapshots directly into native Git repositories.",
        "- [approx](https://github.com/riccivr/approx): Non-interactive POSIX fuzzy stream filter and ranker in clean Suckless C with zero dependencies.",
        "- [unipaste](https://github.com/riccivr/unipaste): Zero-dependency POSIX universal rich text & clipboard converter producing structured Markdown and ASCII tables.",
        "- [clipbridge](https://github.com/riccivr/clipbridge): Cross-platform universal clipboard listener daemon powered by unipaste.",
        "",
        "## Engineering Logs & Articles (Bilingual: EN / ES)"
    ]

    for post in posts:
        en_meta = post.get('en') or post
        es_meta = post.get('es') or post
        lines.append(f"- [{en_meta['title']}]({SITE_URL}/blog/{post['slug']}.html) / [{es_meta['title']}]({SITE_URL}/blog/{post['slug']}.html): {en_meta['summary']}")

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
    posts_data_dict = {}

    for p in posts:
        # Generate standalone static HTML file for each post
        generate_static_post_html(p)

        item = dict(p)
        item.pop('_mtime', None)
        
        # Clean JSON without large html strings in posts.json
        clean_item = dict(item)
        if clean_item.get('en') and 'html' in clean_item['en']:
            clean_item_en = dict(clean_item['en'])
            clean_item_en.pop('html', None)
            clean_item['en'] = clean_item_en
        if clean_item.get('es') and 'html' in clean_item['es']:
            clean_item_es = dict(clean_item['es'])
            clean_item_es.pop('html', None)
            clean_item['es'] = clean_item_es
        clean_posts.append(clean_item)

        # Full precompiled dictionary in posts-data.js
        posts_data_dict[p['slug']] = item

    with open(POSTS_JSON, 'w', encoding='utf-8') as f:
        json.dump(clean_posts, f, indent=2, ensure_ascii=False)
    print(f"[✓] Indexed {len(clean_posts)} bilingual posts into {POSTS_JSON}")

    with open(POSTS_DATA_JS, 'w', encoding='utf-8') as f:
        f.write("window.__POSTS_DATA__ = " + json.dumps(posts_data_dict, ensure_ascii=False) + ";\n")
    print(f"[✓] Generated pre-rendered post bundle {POSTS_DATA_JS}")

    generate_sitemap(clean_posts)
    generate_rss(clean_posts)
    generate_llms_txt(clean_posts)

if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2 or sys.argv[1] == 'build':
        cmd_build()
    else:
        print("Usage:\n  python3 manage.py build")
