(function () {
'use strict';

function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

const i18n = {
            es: {
                metaTitle: "Ricardo Veronese - Cloud & Systems Engineer",
                metaDesc: "Ricardo Veronese. Ingeniero de cloud y sistemas. AWS CDK, TypeScript, Python, Rust, C99, sistemas de bajo nivel POSIX e IoT embebido.",
                skipLink: "[SALTAR AL CONTENIDO]",
                sysId: "SYS.ID: riccivr",
                status: "ESTADO: EN LÍNEA",
                langToggle: "[LANG: ES]",
                langAria: "Alternar idioma a inglés (actual: Español)",
                langAnnounce: "Idioma cambiado a español",
                keysOn: "[TECLAS: ACT]",
                keysOff: "[TECLAS: DES]",
                keysAria: "Alternar atajos de navegación por teclado",
                keysAnnounceOn: "Atajos de teclado activados",
                keysAnnounceOff: "Atajos de teclado desactivados",
                modeCrt: "[MODO: CRT]",
                modePaper: "[MODO: PAPEL]",
                themeAria: "Alternar tema visual (actual: CRT)",
                themeAriaPaper: "Alternar tema visual (actual: Papel)",
                themeAnnouncePaper: "Tema cambiado a modo papel",
                themeAnnounceCrt: "Tema cambiado a modo CRT",
                stateBtn: "[JSON]",
                stateAria: "Alternar inspector de estado JSON del sitio [J]",
                stateAnnounceOpen: "Inspector de estado JSON abierto",
                stateAnnounceClose: "Inspector de estado JSON cerrado",
                stateCopyBtn: "[COPIAR]",
                stateCopied: "¡COPIADO!",
                bioRole: "Cloud & Full-Stack Engineer en Enroly",
                bioStack: "AWS · CDK · Remix · React · TypeScript · Python · Rust · C99 · Embedded / IoT",
                bioMotto: "Desarrollando productos full-stack y backends serverless con Remix, React y AWS Lambda. Cacharreando con C de bajo nivel, sistemas embebidos e IoT en mi tiempo libre.",
                navBlog: "[B] Blog",
                navBlogAria: "Ir a la sección de blog y artículos técnicos",
                navEmail: "[C] Correo",
                navEmailAria: "Enviar correo electrónico a Ricardo Veronese",
                navGhAria: "Perfil de GitHub de Ricardo Veronese (se abre en una nueva pestaña)",
                navLiAria: "Perfil de LinkedIn de Ricardo Veronese (se abre en una nueva pestaña)",
                tablistLabel: "Secciones del portafolio",
                tabProjects: "PROYECTOS ACTIVOS",
                tabBlog: "BLOG & ARTÍCULOS",
                tabSkills: "STACK & SKILLS",
                tabContact: "CONTACTO",
                tabAnnounceProjects: "Sección Proyectos Activos mostrada",
                tabAnnounceBlog: "Sección Blog y Artículos mostrada",
                tabAnnounceSkills: "Sección Stack y Habilidades mostrada",
                tabAnnounceContact: "Sección Contacto mostrada",
                beamSub: "CLI de intercambio efímero de archivos y streaming de video local-first en C99",
                beamBadge: "Activo",
                beamDesc: "CLI en C99 que comparte archivos locales mediante enlaces HTTP efímeros con expiración automática. Soporta peticiones HTTP Range (206 Partial Content) para scrubbing instantáneo en reproductores de video nativos (Chrome, Safari, iOS), zero-copy con sendfile(), túneles públicos rápidos de Cloudflare (-p), códigos QR en consola Unicode y piping directo desde autodub.",
                beamTags: ["C99", "POSIX", "HTTP / STREAMING", "VIDEO", "TUNNELING", "CLI", "ZERO-DEP"],
                beamGhAria: "Repositorio beam en GitHub (se abre en una nueva pestaña)",
                autodubSub: "Pipeline CLI de doblaje de video local y síntesis de voz en CPU",
                autodubBadge: "Activo",
                autodubDesc: "Herramienta de línea de comandos que descarga videos con yt-dlp, transcribe el audio en CPU con faster-whisper (cuantización int8), traduce los segmentos y sintetiza la voz doblada con Piper TTS o Edge-TTS. Ajusta la velocidad por segmento con atempo para cuadrar con el video original sin desfase temporal y atenúa el audio de fondo para no perder la música ni los efectos.",
                autodubTags: ["PYTHON", "WHISPER", "TTS", "FFMPEG", "AUDIO PIPELINE", "CLI"],
                autodubGhAria: "Repositorio autodub en GitHub (se abre en una nueva pestaña)",
                dshufSub: "Shuffler balanceado multiclave en C99/POSIX con soporte para streaming",
                dshufBadge: "Activo",
                dshufDesc: "Herramienta CLI y librería de cabecera única en C99/POSIX suckless que espacia elementos con atributos compartidos (artista, álbum, género) usando una heurística voraz de penalización en ventana para evitar repeticiones seguidas en playlists y pipelines UNIX. Soporta streaming infinito con memoria estrictamente acotada O(W) y bindings sin dependencias para C++, Python y TypeScript/WASM.",
                dshufTags: ["C99", "POSIX", "SUCKLESS", "ALGORITMOS", "PIPELINES UNIX", "ZERO-DEP"],
                dshufGhAria: "Repositorio dshuf en GitHub (se abre en una nueva pestaña)",
                gitcrawlSub: "Crawler y archivador web direccionable por contenido sobre repositorios Git",
                gitcrawlBadge: "Activo",
                gitcrawlDesc: "CLI en C99 que rastrea sitios web y guarda snapshots históricos en Markdown directo en repositorios Git (.git/objects). Se salta el working tree escribiendo objetos en memoria a millón, usa compresión delta nativa para ahorrar gigas y te deja auditar cualquier cambio con git diff y git log sin meter bases de datos.",
                gitcrawlTags: ["C99", "GIT PLUMBING", "CRAWLERS", "POSIX", "ZERO-DEP"],
                gitcrawlGhAria: "Repositorio gitcrawl en GitHub (se abre en una nueva pestaña)",
                approxSub: "Filtro y ranker difuso para streams POSIX (no interactivo)",
                approxBadge: "Activo",
                approxDesc: "CLI ultraligera en C99 con cero dependencias para filtrar y ordenar texto en streams usando coincidencia difusa. Usa memoria O(M) con programación dinámica. La armé para meterla en scripts, pipelines UNIX y microcontroladores donde las TUIs interactivas como fzf no dan la talla.",
                approxTags: ["C99", "POSIX", "ALGORITMOS", "EMBEBIDOS / IOT", "ZERO-DEP"],
                unipasteSub: "Formateador universal de streams HTML y texto enriquecido para el portapapeles",
                unipasteBadge: "Activo",
                unipasteDesc: "Parser en C99 que agarra el HTML enredado del portapapeles y lo convierte en Markdown limpiecito. Te arma tablas en cajas ASCII al pelo, parsea listas de tareas, decodifica entidades HTML y le quita los headers raros de Windows sin depender de navegadores ni librerías pesadas.",
                unipasteTags: ["C99", "PARSERS", "MARKDOWN", "SISTEMAS", "ZERO-DEP"],
                clipbridgeSub: "Daemon y bridge universal de portapapeles potenciado por unipaste",
                clipbridgeBadge: "Activo",
                clipbridgeDesc: "Daemon para Windows y Linux que se queda escuchando el portapapeles en segundo plano. Cuando copias cualquier vaina de Slack, Teams o el navegador, le pasa el HTML a unipaste y te actualiza el portapapeles de texto plano al tiro con Markdown listo para pegar.",
                clipbridgeTags: ["C99", "WIN32", "POSIX", "DAEMON", "INTEGRACIÓN"],
                blogIntro: "// Artículos técnicos, arquitectura de sistemas y notas de trabajo",
                featuredTag: "POST_2026.09.14 // SISTEMAS & REDES",
                featuredReading: "Lectura: ~6 min",
                featuredTitle: "beam: streaming de videos efímeros en C99 con peticiones Range y túneles HTTPS",
                featuredSummary: "Servidor HTTP mínimo en C99 para transmitir archivos locales a reproductores nativos mediante peticiones Range (206 Partial Content), remux Faststart de MP4 y túneles rápidos de Cloudflare.",
                featuredBadges: ["#C99", "#beam", "#HTTP", "#Redes", "#POSIX", "#Video"],
                featuredBtn: "[LEER ARTÍCULO ->]",
                featuredBtnAria: "Leer artículo: beam: streaming de videos efímeros en C99 con peticiones Range y túneles HTTPS",
                blogBannerText: "¿Quieres ver más artículos y experimentos?",
                blogBannerBtn: "[VER TODOS LOS POSTS ->]",
                skillsIntro: "// Competencias técnicas y herramientas de uso diario",
                skillCard1Title: "CLOUD & SISTEMAS DISTRIBUIDOS",
                skillCard1Badge: "CORE",
                skillCard1Groups: [
                    {
                        title: "AWS Cloud & Serverless",
                        tags: ["Lambda", "ECS / Fargate", "S3", "RDS / Postgres", "DynamoDB", "API Gateway"]
                    },
                    {
                        title: "Infrastructure as Code (IaC)",
                        tags: ["AWS CDK (TS/Python)", "CloudFormation", "Multi-Stack Pipelines"]
                    },
                    {
                        title: "Full-Stack & APIs",
                        tags: ["Remix", "React", "TypeScript", "Node.js", "REST & GraphQL", "Tailwind CSS"]
                    },
                    {
                        title: "Automatización & Tooling",
                        tags: ["Python Scripts", "Rust CLIs", "Docker", "GitHub Actions CI/CD"]
                    }
                ],
                skillCard2Title: "SISTEMAS, EMBEDDED & IOT",
                skillCard2Badge: "NATIVO",
                skillCard2Groups: [
                    {
                        title: "C99 & Sistemas POSIX",
                        tags: ["C99 sin dependencias", "Pipelines UNIX", "APIs Win32 & Linux", "Daemons & IPC"]
                    },
                    {
                        title: "Sistemas Embebidos & IoT",
                        tags: ["Microcontroladores", "Sensores & Periféricos", "Lógica Firmware", "Telemetría"]
                    },
                    {
                        title: "Algoritmos de Memoria Acotada",
                        tags: ["Prog. Dinámica O(M)", "Búsqueda Difusa", "Parsers de Streams"]
                    },
                    {
                        title: "Calidad, Sanitizers & Debugging",
                        tags: ["ASan (AddressSanitizer)", "UBSan", "Fuzz Testing", "Valgrind"]
                    }
                ],
                contactIntro: "// Canales de contacto",
                contactEmailLabel: "EMAIL:",
                contactEmailBtn: "Enviar",
                contactGhLabel: "GITHUB:",
                contactLiLabel: "LINKEDIN:",
                contactOpenBtn: "Abrir",
                contactGhAria: "Abrir perfil de GitHub de Ricardo Veronese (se abre en una nueva pestaña)",
                contactLiAria: "Abrir perfil de LinkedIn de Ricardo Veronese (se abre en una nueva pestaña)",
                footerText: "Cloud Architecture · Embedded & Systems"
            },
            en: {
                metaTitle: "Ricardo Veronese - Cloud & Systems Engineer",
                metaDesc: "Ricardo Veronese. Cloud and systems engineer. AWS CDK, Remix, React, TypeScript, Python, Rust, C99, POSIX low-level systems, and embedded IoT.",
                skipLink: "[SKIP TO CONTENT]",
                sysId: "SYS.ID: riccivr",
                status: "STATUS: ONLINE",
                langToggle: "[LANG: EN]",
                langAria: "Toggle language to Spanish (current: English)",
                langAnnounce: "Language switched to English",
                keysOn: "[KEYS: ON]",
                keysOff: "[KEYS: OFF]",
                keysAria: "Toggle keyboard navigation shortcuts",
                keysAnnounceOn: "Keyboard shortcuts enabled",
                keysAnnounceOff: "Keyboard shortcuts disabled",
                modeCrt: "[MODE: CRT]",
                modePaper: "[MODE: PAPER]",
                themeAria: "Toggle visual theme (current: CRT)",
                themeAriaPaper: "Toggle visual theme (current: Paper)",
                themeAnnouncePaper: "Theme switched to paper mode",
                themeAnnounceCrt: "Theme switched to CRT mode",
                stateBtn: "[JSON]",
                stateAria: "Toggle site JSON state inspector [J]",
                stateAnnounceOpen: "JSON state inspector opened",
                stateAnnounceClose: "JSON state inspector closed",
                stateCopyBtn: "[COPY]",
                stateCopied: "COPIED!",
                bioRole: "Cloud & Full-Stack Engineer at Enroly",
                bioStack: "AWS · CDK · Remix · React · TypeScript · Python · Rust · C99 · Embedded / IoT",
                bioMotto: "Building full-stack products and serverless backends with Remix, React & AWS Lambda. Tinkering with low-level C, embedded systems & IoT on the side.",
                navBlog: "[B] Blog",
                navBlogAria: "Go to technical blog and articles section",
                navEmail: "[C] Email",
                navEmailAria: "Send email to Ricardo Veronese",
                navGhAria: "Ricardo Veronese's GitHub profile (opens in a new tab)",
                navLiAria: "Ricardo Veronese's LinkedIn profile (opens in a new tab)",
                tablistLabel: "Portfolio sections",
                tabProjects: "ACTIVE PROJECTS",
                tabBlog: "LOGS & ARTICLES",
                tabSkills: "STACK & SKILLS",
                tabContact: "CONTACT",
                tabAnnounceProjects: "Active Projects section displayed",
                tabAnnounceBlog: "Blog and Articles section displayed",
                tabAnnounceSkills: "Stack and Skills section displayed",
                tabAnnounceContact: "Contact section displayed",
                beamSub: "Ephemeral local-first file and video streaming CLI in C99",
                beamBadge: "Active",
                beamDesc: "A C99 CLI tool for local-first ephemeral file and video sharing over short-lived HTTP links. Features full HTTP Range request support (206 Partial Content) for instant native browser video scrubbing (Chrome, Safari, iOS), zero-copy sendfile() I/O, zero-account public HTTPS reverse tunneling via Cloudflare (-p), terminal Unicode QR codes, and direct stdin piping from autodub.",
                beamTags: ["C99", "POSIX", "HTTP / STREAMING", "VIDEO", "TUNNELING", "CLI", "ZERO-DEP"],
                beamGhAria: "beam repository on GitHub (opens in a new tab)",
                autodubSub: "Local CPU-based video dubbing CLI and neural speech synthesis pipeline",
                autodubBadge: "Active",
                autodubDesc: "A local CLI tool that downloads videos with yt-dlp, transcribes speech on CPU with int8 faster-whisper, translates segments, and generates synchronized dubbed audio using Piper TTS or Edge-TTS. It performs dynamic sample-accurate time-stretching with FFmpeg to eliminate timeline drift while ducking the original background audio and music.",
                autodubTags: ["PYTHON", "WHISPER", "TTS", "FFMPEG", "AUDIO PIPELINE", "CLI"],
                autodubGhAria: "autodub repository on GitHub (opens in a new tab)",
                dshufSub: "Suckless multi-key low-discrepancy shuffler with streaming support",
                dshufBadge: "Active",
                dshufDesc: "A suckless POSIX C99 multi-key balanced shuffler and single-header library. It spaces out items sharing attributes (artist, album, genre, tags) using a greedy windowed penalty heuristic to prevent clustering in playlists and Unix pipelines. Features strictly bounded O(W) memory for infinite streams, unbiased SplitMix64/Lemire PRNG, and zero-dependency bindings for C++, Python, and TypeScript/WASM.",
                dshufTags: ["C99", "POSIX", "SUCKLESS", "ALGORITHMS", "UNIX PIPELINES", "ZERO-DEP"],
                dshufGhAria: "dshuf repository on GitHub (opens in a new tab)",
                gitcrawlSub: "Content-addressable web archiver & snapshot engine backed by Git",
                gitcrawlBadge: "Active",
                gitcrawlDesc: "A C99 CLI tool that crawls web pages and commits historical Markdown snapshots directly into Git repositories (.git/objects). It bypasses the working tree by writing in-memory objects, leverages native delta compression to save gigabytes, and lets you audit changes with git diff and git log with zero databases.",
                gitcrawlTags: ["C99", "GIT PLUMBING", "CRAWLERS", "POSIX", "ZERO-DEP"],
                gitcrawlGhAria: "gitcrawl repository on GitHub (opens in a new tab)",
                approxSub: "Non-interactive POSIX fuzzy stream filter and ranker",
                approxBadge: "Active",
                approxDesc: "A small C99 CLI tool that filters and sorts streams of text using fuzzy string matching. It uses an O(M) memory layout with dynamic programming. Built for automated UNIX pipelines, cron jobs, and small devices where you want fuzzy filtering without an interactive terminal UI like fzf.",
                approxTags: ["C99", "POSIX", "ALGORITHMS", "EMBEDDED / IOT", "ZERO-DEP"],
                unipasteSub: "Universal rich-text and HTML clipboard stream formatter",
                unipasteBadge: "Active",
                unipasteDesc: "A C99 stream parser that turns messy clipboard HTML into clean Markdown. It formats tables into ASCII boxes, parses task lists, decodes HTML entities, and strips Windows CF_HTML headers without running a heavy runtime or browser engine.",
                unipasteTags: ["C99", "PARSERS", "MARKDOWN", "SYSTEMS", "ZERO-DEP"],
                clipbridgeSub: "Universal clipboard bridge daemon powered by unipaste",
                clipbridgeBadge: "Active",
                clipbridgeDesc: "A background daemon that listens for OS clipboard events on Windows and Linux. When you copy rich text from apps like Slack, Teams, or browsers, it runs the HTML through unipaste and writes clean Markdown straight into your plain text clipboard slot.",
                clipbridgeTags: ["C99", "WIN32", "POSIX", "DAEMON", "INTEGRATION"],
                blogIntro: "// Technical notes, systems architecture writeups, and research",
                featuredTag: "POST_2026.09.14 // SYSTEMS & NETWORKING",
                featuredReading: "Reading time: ~6 min",
                featuredTitle: "beam: streaming dubbed videos with ephemeral HTTP tunnels and Range requests in C99",
                featuredSummary: "A minimal C99 HTTP server to stream local media directly into native browser players via HTTP Range requests (206 Partial Content), faststart MP4 remuxing, and Cloudflare quick tunnels.",
                featuredBadges: ["#C99", "#beam", "#HTTP", "#Networking", "#POSIX", "#Video"],
                featuredBtn: "[READ POST ->]",
                featuredBtnAria: "Read article: beam: streaming dubbed videos with ephemeral HTTP tunnels and Range requests in C99",
                blogBannerText: "Looking for more writeups and experiments?",
                blogBannerBtn: "[BROWSE ALL POSTS ->]",
                skillsIntro: "// Daily tools and engineering focus",
                skillCard1Title: "CLOUD & DISTRIBUTED SYSTEMS",
                skillCard1Badge: "CORE",
                skillCard1Groups: [
                    {
                        title: "AWS Cloud & Serverless",
                        tags: ["Lambda", "ECS / Fargate", "S3", "RDS / Postgres", "DynamoDB", "API Gateway"]
                    },
                    {
                        title: "Infrastructure as Code (IaC)",
                        tags: ["AWS CDK (TS/Python)", "CloudFormation", "Multi-Stack Pipelines"]
                    },
                    {
                        title: "Full-Stack & APIs",
                        tags: ["Remix", "React", "TypeScript", "Node.js", "REST & GraphQL", "Tailwind CSS"]
                    },
                    {
                        title: "Automation & Tooling",
                        tags: ["Python Scripts", "Rust CLIs", "Docker", "GitHub Actions CI/CD"]
                    }
                ],
                skillCard2Title: "SYSTEMS, EMBEDDED & IOT",
                skillCard2Badge: "NATIVE",
                skillCard2Groups: [
                    {
                        title: "C99 & POSIX Systems",
                        tags: ["Zero-Dep C99", "UNIX Pipelines", "Win32 & Linux APIs", "Daemons & IPC"]
                    },
                    {
                        title: "Embedded Systems & IoT",
                        tags: ["Microcontrollers", "Sensors & Peripherals", "Firmware Logic", "Telemetry"]
                    },
                    {
                        title: "Memory-Bounded Algorithms",
                        tags: ["Dynamic Prog O(M)", "Fuzzy String Search", "Stream Parsers"]
                    },
                    {
                        title: "Quality, Sanitizers & Debugging",
                        tags: ["ASan (AddressSanitizer)", "UBSan", "Fuzz Testing", "Valgrind"]
                    }
                ],
                contactIntro: "// Direct contact",
                contactEmailLabel: "EMAIL:",
                contactEmailBtn: "Send",
                contactGhLabel: "GITHUB:",
                contactLiLabel: "LINKEDIN:",
                contactOpenBtn: "Open",
                contactGhAria: "Open Ricardo Veronese's GitHub profile (opens in a new tab)",
                contactLiAria: "Open Ricardo Veronese's LinkedIn profile (opens in a new tab)",
                footerText: "Cloud Architecture · Embedded & Systems"
            }
        };

function getInitialLanguage() {
    const saved = safeGet('riccivr-lang');
    if (saved === 'es' || saved === 'en') return saved;
    const browserLang = (navigator.language || (navigator.languages && navigator.languages[0]) || '').toLowerCase();
    return browserLang.startsWith('es') ? 'es' : 'en';
}

function getInitialTheme() {
    const saved = safeGet('riccivr-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    return prefersLight ? 'light' : 'dark';
}

function getInitialKeys() {
    return safeGet('riccivr-keys') !== 'off';
}

function buildEntities(lang) {
    const t = i18n[lang] || i18n.es;
    return {
        projects: [
            {
                id: "beam",
                name: "beam",
                badge: t.beamBadge,
                subtitle: t.beamSub,
                description: t.beamDesc,
                tags: t.beamTags,
                repoUrl: "https://github.com/riccivr/beam",
                ariaLabel: t.beamGhAria
            },
            {
                id: "autodub",
                name: "autodub",
                badge: t.autodubBadge,
                subtitle: t.autodubSub,
                description: t.autodubDesc,
                tags: t.autodubTags,
                repoUrl: "https://github.com/riccivr/autodub",
                ariaLabel: t.autodubGhAria
            },
            {
                id: "dshuf",
                name: "dshuf",
                badge: t.dshufBadge,
                subtitle: t.dshufSub,
                description: t.dshufDesc,
                tags: t.dshufTags,
                repoUrl: "https://github.com/riccivr/dshuf",
                ariaLabel: t.dshufGhAria
            },
            {
                id: "gitcrawl",
                name: "gitcrawl",
                badge: t.gitcrawlBadge,
                subtitle: t.gitcrawlSub,
                description: t.gitcrawlDesc,
                tags: t.gitcrawlTags,
                repoUrl: "https://github.com/riccivr/gitcrawl",
                ariaLabel: t.gitcrawlGhAria
            },
            {
                id: "approx",
                name: "approx",
                badge: t.approxBadge,
                subtitle: t.approxSub,
                description: t.approxDesc,
                tags: t.approxTags,
                repoUrl: "https://github.com/riccivr/approx",
                ariaLabel: t.approxGhAria
            },
            {
                id: "unipaste",
                name: "unipaste",
                badge: t.unipasteBadge,
                subtitle: t.unipasteSub,
                description: t.unipasteDesc,
                tags: t.unipasteTags,
                repoUrl: "https://github.com/riccivr/unipaste",
                ariaLabel: t.unipasteGhAria
            },
            {
                id: "clipbridge",
                name: "clipbridge",
                badge: t.clipbridgeBadge,
                subtitle: t.clipbridgeSub,
                description: t.clipbridgeDesc,
                tags: t.clipbridgeTags,
                repoUrl: "https://github.com/riccivr/clipbridge",
                ariaLabel: t.clipbridgeGhAria
            }
        ],
        featuredPost: {
            id: "beam-post",
            tag: t.featuredTag,
            readingTime: t.featuredReading,
            title: t.featuredTitle,
            summary: t.featuredSummary,
            badges: t.featuredBadges,
            buttonText: t.featuredBtn,
            ariaLabel: t.featuredBtnAria,
            url: "./blog/beam-ephemeral-video-streaming-in-c99.html"
        },
        skills: {
            card1Title: t.skillCard1Title,
            card1Badge: t.skillCard1Badge,
            card1Groups: t.skillCard1Groups,
            card2Title: t.skillCard2Title,
            card2Badge: t.skillCard2Badge,
            card2Groups: t.skillCard2Groups
        },
        contact: {
            email: "ricci.vr@gmail.com",
            github: "https://github.com/riccivr",
            linkedin: "https://www.linkedin.com/in/riccivr/",
            rss: lang === 'es' ? './feed-es.xml' : './feed.xml'
        }
    };
}

function createInitialState() {
    const lang = getInitialLanguage();
    const theme = getInitialTheme();
    const shortcuts = getInitialKeys();
    const t = i18n[lang] || i18n.es;

    return {
        "$schema": "https://riccivr.github.io/state.schema.json",
        "tick": 0,
        "timestamp": Date.now(),
        "lastAction": {
            "type": "INIT",
            "payload": null,
            "timestamp": Date.now()
        },
        "meta": {
            "sysId": t.sysId,
            "status": t.status,
            "version": "1.0.0",
            "title": t.metaTitle,
            "description": t.metaDesc
        },
        "config": {
            "lang": lang,
            "theme": theme,
            "shortcutsEnabled": shortcuts,
            "inspectorOpen": false
        },
        "navigation": {
            "activeTab": "projects-content",
            "tabs": [
                { "id": "projects-content", "key": "1", "label": t.tabProjects, "announce": t.tabAnnounceProjects },
                { "id": "blog-content", "key": "2", "label": t.tabBlog, "announce": t.tabAnnounceBlog },
                { "id": "skills-content", "key": "3", "label": t.tabSkills, "announce": t.tabAnnounceSkills },
                { "id": "contact-content", "key": "4", "label": t.tabContact, "announce": t.tabAnnounceContact }
            ]
        },
        "behaviors": {
            "keymap": {
                "I": "TOGGLE_LANG",
                "T": "TOGGLE_THEME",
                "K": "TOGGLE_KEYS",
                "J": "TOGGLE_INSPECTOR",
                "B": "NAVIGATE_BLOG",
                "C": "NAVIGATE_EMAIL",
                "G": "NAVIGATE_GITHUB",
                "L": "NAVIGATE_LINKEDIN",
                "R": "NAVIGATE_RSS",
                "1": "SELECT_TAB:projects-content",
                "P": "SELECT_TAB:projects-content",
                "2": "SELECT_TAB:blog-content",
                "3": "SELECT_TAB:skills-content",
                "S": "SELECT_TAB:skills-content",
                "4": "SELECT_TAB:contact-content"
            }
        },
        "entities": buildEntities(lang),
        "a11y": {
            "lastAnnounced": null
        }
    };
}

// Pure State Reducer (ThePrimeagen Pattern: (state, action) => nextState)
function reduce(state, action) {
    const currentLang = state.config.lang;
    const t = i18n[currentLang] || i18n.es;

    switch (action.type) {
        case 'SET_LANG': {
            const nextLang = action.payload.lang === 'en' ? 'en' : 'es';
            const nextT = i18n[nextLang] || i18n.es;
            return Object.assign({}, state, {
                config: Object.assign({}, state.config, { lang: nextLang }),
                meta: Object.assign({}, state.meta, {
                    sysId: nextT.sysId,
                    status: nextT.status,
                    title: nextT.metaTitle,
                    description: nextT.metaDesc
                }),
                navigation: Object.assign({}, state.navigation, {
                    tabs: [
                        { "id": "projects-content", "key": "1", "label": nextT.tabProjects, "announce": nextT.tabAnnounceProjects },
                        { "id": "blog-content", "key": "2", "label": nextT.tabBlog, "announce": nextT.tabAnnounceBlog },
                        { "id": "skills-content", "key": "3", "label": nextT.tabSkills, "announce": nextT.tabAnnounceSkills },
                        { "id": "contact-content", "key": "4", "label": nextT.tabContact, "announce": nextT.tabAnnounceContact }
                    ]
                }),
                entities: buildEntities(nextLang),
                a11y: { lastAnnounced: nextT.langAnnounce }
            });
        }

        case 'TOGGLE_LANG': {
            const nextLang = state.config.lang === 'es' ? 'en' : 'es';
            return reduce(state, { type: 'SET_LANG', payload: { lang: nextLang } });
        }

        case 'SET_THEME': {
            const nextTheme = action.payload.theme === 'light' ? 'light' : 'dark';
            return Object.assign({}, state, {
                config: Object.assign({}, state.config, { theme: nextTheme }),
                a11y: { lastAnnounced: nextTheme === 'light' ? t.themeAnnouncePaper : t.themeAnnounceCrt }
            });
        }

        case 'TOGGLE_THEME': {
            const nextTheme = state.config.theme === 'light' ? 'dark' : 'light';
            return reduce(state, { type: 'SET_THEME', payload: { theme: nextTheme } });
        }

        case 'SET_KEYS': {
            const enabled = Boolean(action.payload.enabled);
            return Object.assign({}, state, {
                config: Object.assign({}, state.config, { shortcutsEnabled: enabled }),
                a11y: { lastAnnounced: enabled ? t.keysAnnounceOn : t.keysAnnounceOff }
            });
        }

        case 'TOGGLE_KEYS': {
            return reduce(state, { type: 'SET_KEYS', payload: { enabled: !state.config.shortcutsEnabled } });
        }

        case 'SELECT_TAB': {
            const targetId = action.payload.tabId;
            const tab = state.navigation.tabs.find(x => x.id === targetId);
            return Object.assign({}, state, {
                navigation: Object.assign({}, state.navigation, { activeTab: targetId }),
                a11y: { lastAnnounced: tab ? tab.announce : targetId }
            });
        }

        case 'TOGGLE_INSPECTOR': {
            const nextOpen = !state.config.inspectorOpen;
            return Object.assign({}, state, {
                config: Object.assign({}, state.config, { inspectorOpen: nextOpen }),
                a11y: { lastAnnounced: nextOpen ? t.stateAnnounceOpen : t.stateAnnounceClose }
            });
        }

        case 'CLOSE_INSPECTOR': {
            return Object.assign({}, state, {
                config: Object.assign({}, state.config, { inspectorOpen: false }),
                a11y: { lastAnnounced: t.stateAnnounceClose }
            });
        }

        case 'SET_ANNOUNCEMENT': {
            return Object.assign({}, state, {
                a11y: { lastAnnounced: action.payload.message }
            });
        }

        default:
            return state;
    }
}

function announceA11y(message) {
    const announcer = document.getElementById('a11y-announcer');
    if (!announcer || !message) return;
    announcer.textContent = '';
    setTimeout(() => {
        announcer.textContent = message;
    }, 60);
}

function renderSkillGroups(groups) {
    return groups.map(g => `
        <div class="border-b theme-border-dim pb-2.5 last:border-0 last:pb-0">
            <div class="font-bold text-xs sm:text-sm theme-text-heading flex items-center mb-1.5">
                <span class="theme-text-muted mr-1.5 font-mono font-bold">></span> ${g.title}
            </div>
            <div class="flex flex-wrap gap-1.5 pl-3.5">
                ${g.tags.map(t => `<span class="text-[11px] px-2 py-0.5 font-medium rounded-sm" style="background-color: var(--bg-badge); color: var(--text-main);">${t}</span>`).join('')}
            </div>
        </div>
    `).join('');
}

// Declarative UI Renderer: Projects JSON State onto the DOM
function render(state) {
    const lang = state.config.lang;
    const t = i18n[lang] || i18n.es;
    const isLight = state.config.theme === 'light';

    // 1. Document & HTML attributes
    document.documentElement.setAttribute('lang', lang);
    if (isLight) {
        document.documentElement.setAttribute('data-theme', 'light');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }

    // 2. Head meta tags
    const titleEl = document.getElementById('meta-title');
    if (titleEl) titleEl.textContent = state.meta.title;
    const metaDescEl = document.getElementById('meta-desc');
    if (metaDescEl) metaDescEl.setAttribute('content', state.meta.description);
    const ogTitle = document.getElementById('og-title');
    if (ogTitle) ogTitle.setAttribute('content', state.meta.title);
    const ogDesc = document.getElementById('og-desc');
    if (ogDesc) ogDesc.setAttribute('content', state.meta.description);
    const twTitle = document.getElementById('tw-title');
    if (twTitle) twTitle.setAttribute('content', state.meta.title);
    const twDesc = document.getElementById('tw-desc');
    if (twDesc) twDesc.setAttribute('content', state.meta.description);

    // 3. Skip link
    const skipLink = document.getElementById('skip-link');
    if (skipLink) skipLink.textContent = t.skipLink;

    // 4. Header status labels
    const sysId = document.getElementById('sys-id-label');
    if (sysId) sysId.textContent = state.meta.sysId;
    const statusLabel = document.getElementById('status-label');
    if (statusLabel) statusLabel.textContent = state.meta.status;
    const statusMobile = document.getElementById('status-label-mobile');
    if (statusMobile) statusMobile.textContent = state.meta.status;

    // 5. Header toggle buttons
    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) {
        langBtn.textContent = t.langToggle;
        langBtn.setAttribute('aria-label', t.langAria);
        langBtn.setAttribute('title', t.langAria);
    }

    const keysBtn = document.getElementById('keys-toggle');
    if (keysBtn) {
        keysBtn.textContent = state.config.shortcutsEnabled ? t.keysOn : t.keysOff;
        keysBtn.setAttribute('aria-pressed', state.config.shortcutsEnabled ? 'true' : 'false');
        keysBtn.setAttribute('aria-label', t.keysAria);
        keysBtn.setAttribute('title', t.keysAria);
        keysBtn.style.opacity = state.config.shortcutsEnabled ? '1' : '0.6';
    }

    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        themeBtn.textContent = isLight ? t.modePaper : t.modeCrt;
        const themeLabel = isLight ? t.themeAriaPaper : t.themeAria;
        themeBtn.setAttribute('aria-label', themeLabel);
        themeBtn.setAttribute('title', themeLabel);
    }

    const stateBtn = document.getElementById('state-toggle');
    if (stateBtn) {
        stateBtn.textContent = t.stateBtn;
        stateBtn.setAttribute('aria-expanded', state.config.inspectorOpen ? 'true' : 'false');
        stateBtn.setAttribute('aria-label', t.stateAria);
        stateBtn.setAttribute('title', t.stateAria);
        stateBtn.style.backgroundColor = state.config.inspectorOpen ? 'var(--btn-hover-bg)' : '';
        stateBtn.style.color = state.config.inspectorOpen ? 'var(--btn-hover-text)' : '';
    }

    // 6. Bio section
    const bioRole = document.getElementById('bio-role');
    if (bioRole) bioRole.textContent = t.bioRole;
    const bioStack = document.getElementById('bio-stack');
    if (bioStack) bioStack.textContent = t.bioStack;
    const bioMotto = document.getElementById('bio-motto');
    if (bioMotto) bioMotto.textContent = t.bioMotto;

    const navBlog = document.getElementById('nav-btn-blog');
    if (navBlog) {
        navBlog.textContent = t.navBlog;
        navBlog.setAttribute('aria-label', t.navBlogAria);
        navBlog.setAttribute('title', t.navBlogAria);
    }

    const navEmail = document.getElementById('nav-btn-email');
    if (navEmail) {
        navEmail.textContent = t.navEmail;
        navEmail.setAttribute('aria-label', t.navEmailAria);
        navEmail.setAttribute('title', t.navEmailAria);
    }

    const navGh = document.getElementById('nav-btn-gh');
    if (navGh) {
        navGh.setAttribute('aria-label', t.navGhAria);
        navGh.setAttribute('title', t.navGhAria);
    }

    const navLi = document.getElementById('nav-btn-li');
    if (navLi) {
        navLi.setAttribute('aria-label', t.navLiAria);
        navLi.setAttribute('title', t.navLiAria);
    }

    // 7. Navigation Tabs
    const tablist = document.getElementById('portfolio-tablist');
    if (tablist) tablist.setAttribute('aria-label', t.tablistLabel);

    const tabProjects = document.getElementById('tab-projects');
    if (tabProjects) tabProjects.textContent = t.tabProjects;
    const tabBlog = document.getElementById('tab-blog');
    if (tabBlog) tabBlog.textContent = t.tabBlog;
    const tabSkills = document.getElementById('tab-skills');
    if (tabSkills) tabSkills.textContent = t.tabSkills;
    const tabContact = document.getElementById('tab-contact');
    if (tabContact) tabContact.textContent = t.tabContact;

    const tabButtons = Array.from(document.querySelectorAll('.tab-button'));
    const contents = document.querySelectorAll('.content-section');
    tabButtons.forEach(tab => {
        const isSelected = tab.getAttribute('data-target') === state.navigation.activeTab;
        tab.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        tab.setAttribute('tabindex', '0');
        if (isSelected) {
            tab.style.backgroundColor = 'var(--bg-tab-active)';
            tab.style.borderBottom = 'none';
        } else {
            tab.style.backgroundColor = 'transparent';
            tab.style.borderBottom = '';
        }
    });

    contents.forEach(content => {
        if (content.id === state.navigation.activeTab) {
            content.classList.remove('hidden');
        } else {
            content.classList.add('hidden');
        }
    });

    // 8. Projects Section Entities
    state.entities.projects.forEach(p => {
        const sub = document.getElementById(`${p.id}-sub`);
        if (sub) sub.textContent = p.subtitle;
        const badge = document.getElementById(`${p.id}-badge`);
        if (badge) badge.textContent = p.badge;
        const desc = document.getElementById(`${p.id}-desc`);
        if (desc) desc.textContent = p.description;
        const tags = document.getElementById(`${p.id}-tags`);
        if (tags) {
            tags.innerHTML = p.tags.map(tag => `<span class="text-xs px-2 py-0.5 font-medium rounded-sm" style="background-color: var(--bg-badge); color: var(--text-main);">${tag}</span>`).join('');
        }
        const link = document.getElementById(`${p.id}-link`);
        if (link) {
            link.setAttribute('aria-label', p.ariaLabel || p.name);
            link.setAttribute('title', p.ariaLabel || p.name);
        }
    });

    // 9. Blog Section Entities
    const blogIntro = document.getElementById('blog-section-intro');
    if (blogIntro) blogIntro.textContent = t.blogIntro;
    const featuredTag = document.getElementById('featured-post-tag');
    if (featuredTag) featuredTag.textContent = state.entities.featuredPost.tag;
    const featuredReading = document.getElementById('featured-post-reading-time');
    if (featuredReading) featuredReading.textContent = state.entities.featuredPost.readingTime;
    const featuredLink = document.getElementById('featured-post-link');
    if (featuredLink) featuredLink.textContent = state.entities.featuredPost.title;
    const featuredSummary = document.getElementById('featured-post-summary');
    if (featuredSummary) featuredSummary.textContent = state.entities.featuredPost.summary;
    const featuredBadges = document.getElementById('featured-post-badges');
    if (featuredBadges) {
        featuredBadges.innerHTML = state.entities.featuredPost.badges.map(b => `<span class="text-xs px-2 py-0.5 font-medium rounded-sm" style="background-color: var(--bg-badge); color: var(--text-heading);">${b}</span>`).join('');
    }
    const featuredBtn = document.getElementById('featured-post-btn');
    if (featuredBtn) {
        featuredBtn.textContent = state.entities.featuredPost.buttonText;
        if (state.entities.featuredPost.ariaLabel) {
            featuredBtn.setAttribute('aria-label', state.entities.featuredPost.ariaLabel);
            featuredBtn.setAttribute('title', state.entities.featuredPost.ariaLabel);
        }
    }
    const blogBannerText = document.getElementById('blog-banner-text');
    if (blogBannerText) blogBannerText.textContent = t.blogBannerText;
    const blogBannerBtn = document.getElementById('blog-banner-btn');
    if (blogBannerBtn) {
        blogBannerBtn.textContent = t.blogBannerBtn;
        if (t.allPostsAria) {
            blogBannerBtn.setAttribute('aria-label', t.allPostsAria);
            blogBannerBtn.setAttribute('title', t.allPostsAria);
        }
    }

    // 10. Skills Section Entities
    const skillsIntro = document.getElementById('skills-intro');
    if (skillsIntro) skillsIntro.textContent = t.skillsIntro;
    const skill1Title = document.getElementById('skill-card-1-title');
    if (skill1Title) skill1Title.textContent = state.entities.skills.card1Title;
    const skill1Badge = document.getElementById('skill-card-1-badge');
    if (skill1Badge) skill1Badge.textContent = state.entities.skills.card1Badge;
    const skill1List = document.getElementById('skill-card-1-list');
    if (skill1List) skill1List.innerHTML = renderSkillGroups(state.entities.skills.card1Groups);

    const skill2Title = document.getElementById('skill-card-2-title');
    if (skill2Title) skill2Title.textContent = state.entities.skills.card2Title;
    const skill2Badge = document.getElementById('skill-card-2-badge');
    if (skill2Badge) skill2Badge.textContent = state.entities.skills.card2Badge;
    const skill2List = document.getElementById('skill-card-2-list');
    if (skill2List) skill2List.innerHTML = renderSkillGroups(state.entities.skills.card2Groups);

    // 11. Contact Section Entities
    const contactIntro = document.getElementById('contact-intro');
    if (contactIntro) contactIntro.textContent = t.contactIntro;
    const contactEmailLabel = document.getElementById('contact-email-label');
    if (contactEmailLabel) contactEmailLabel.textContent = t.contactEmailLabel;
    const contactEmailBtn = document.getElementById('contact-email-btn');
    if (contactEmailBtn) contactEmailBtn.textContent = t.contactEmailBtn;

    const ghLabel = document.getElementById('contact-gh-label');
    if (ghLabel) ghLabel.textContent = t.contactGhLabel;
    const liLabel = document.getElementById('contact-li-label');
    if (liLabel) liLabel.textContent = t.contactLiLabel;

    const contactGh = document.getElementById('contact-gh-btn');
    if (contactGh) {
        contactGh.textContent = t.contactOpenBtn;
        contactGh.setAttribute('aria-label', t.contactGhAria);
        contactGh.setAttribute('title', t.contactGhAria);
    }
    const contactLi = document.getElementById('contact-li-btn');
    if (contactLi) {
        contactLi.textContent = t.contactOpenBtn;
        contactLi.setAttribute('aria-label', t.contactLiAria);
        contactLi.setAttribute('title', t.contactLiAria);
    }

    const footerRss = document.getElementById('footer-rss-btn');
    if (footerRss) {
        footerRss.setAttribute('href', state.entities.contact.rss);
        footerRss.setAttribute('title', lang === 'es' ? 'Canal RSS en XML (Español) [R]' : 'RSS Feed in XML (English) [R]');
    }

    const footerText = document.getElementById('footer-text');
    if (footerText) footerText.textContent = t.footerText;

    // 12. Interactive State Inspector Modal HUD
    const inspectorModal = document.getElementById('state-inspector-modal');
    if (inspectorModal) {
        if (state.config.inspectorOpen) {
            inspectorModal.style.display = 'flex';
            inspectorModal.classList.remove('hidden');
            const tickEl = document.getElementById('state-inspector-tick');
            if (tickEl) tickEl.textContent = `TICK: ${state.tick}`;
            const copyBtn = document.getElementById('state-inspector-copy');
            if (copyBtn && !copyBtn.dataset.copied) copyBtn.textContent = t.stateCopyBtn || '[COPIAR]';
            const jsonPre = document.getElementById('state-inspector-json');
            if (jsonPre) jsonPre.textContent = JSON.stringify(state, null, 2);
        } else {
            inspectorModal.style.display = 'none';
            inspectorModal.classList.add('hidden');
        }
    }

    // 13. Screen Reader Live Announcer
    if (state.a11y && state.a11y.lastAnnounced) {
        announceA11y(state.a11y.lastAnnounced);
    }
}

// Central State Dispatcher
function dispatch(action) {
    const current = window.__SITE_STATE__ || createInitialState();
    const next = reduce(current, action);
    next.tick = (current.tick || 0) + 1;
    next.timestamp = Date.now();
    next.lastAction = {
        type: action.type,
        payload: action.payload || null,
        timestamp: next.timestamp
    };

    // Persist storage
    safeSet('riccivr-lang', next.config.lang);
    safeSet('riccivr-theme', next.config.theme);
    safeSet('riccivr-keys', next.config.shortcutsEnabled ? 'on' : 'off');

    // Update global state & serialized script tag
    window.__SITE_STATE__ = next;
    const scriptState = document.getElementById('site-state');
    if (scriptState) {
        scriptState.textContent = JSON.stringify(next, null, 2);
    }

    // Re-render UI projection
    try {
        render(next);
    } catch (e) {
        console.error("State render error:", e);
    }

    // Notify agents & testers via CustomEvent
    try {
        window.dispatchEvent(new CustomEvent('site:state-change', { detail: { state: next, action } }));
    } catch (e) {}

    return next;
}

// Axis-Aligned Bounding Box (AABB) spatial layout calculator for testing agents
function getLayoutBoxes() {
    const elementsToTrack = [
        { id: 'lang-toggle', role: 'button' },
        { id: 'keys-toggle', role: 'button' },
        { id: 'theme-toggle', role: 'button' },
        { id: 'state-toggle', role: 'button' },
        { id: 'tab-projects', role: 'tab' },
        { id: 'tab-blog', role: 'tab' },
        { id: 'tab-skills', role: 'tab' },
        { id: 'tab-contact', role: 'tab' },
        { id: 'nav-btn-blog', role: 'link' },
        { id: 'nav-btn-email', role: 'link' },
        { id: 'nav-btn-gh', role: 'link' },
        { id: 'nav-btn-li', role: 'link' },
        { id: 'beam-link', role: 'link' },
        { id: 'autodub-link', role: 'link' },
        { id: 'dshuf-link', role: 'link' },
        { id: 'gitcrawl-link', role: 'link' },
        { id: 'approx-link', role: 'link' },
        { id: 'unipaste-link', role: 'link' },
        { id: 'clipbridge-link', role: 'link' }
    ];

    return elementsToTrack.map(item => {
        const el = document.getElementById(item.id);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const style = typeof window.getComputedStyle === 'function' ? window.getComputedStyle(el) : null;
        return {
            id: item.id,
            role: item.role,
            visible: rect.width > 0 && rect.height > 0 && (!style || style.display !== 'none'),
            aabb: {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                top: Math.round(rect.top),
                left: Math.round(rect.left),
                bottom: Math.round(rect.bottom),
                right: Math.round(rect.right)
            }
        };
    }).filter(Boolean);
}

// Flash visual feedback for shortcut actuation
function flashElement(el) {
    if (!el) return;
    const isTab = el.classList.contains('tab-button');
    const prevBg = el.style.backgroundColor;
    const prevColor = el.style.color;
    el.style.backgroundColor = isTab ? 'var(--bg-tab-hover)' : 'var(--btn-hover-bg)';
    if (!isTab) el.style.color = 'var(--btn-hover-text)';
    setTimeout(() => {
        el.style.backgroundColor = prevBg;
        el.style.color = prevColor;
    }, 200);
}

function initPortfolio() {
    // 1. Initialize Single Source of Truth JSON State
    const state = createInitialState();
    window.__SITE_STATE__ = state;
    window.getSiteState = function() {
        return JSON.parse(JSON.stringify(window.__SITE_STATE__));
    };
    window.dispatch = dispatch;
    window.getLayoutBoxes = getLayoutBoxes;

    // Serialize initial state to script tag
    const scriptState = document.getElementById('site-state');
    if (scriptState) {
        scriptState.textContent = JSON.stringify(state, null, 2);
    }

    // 2. Wire Control Buttons
    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) {
        langBtn.addEventListener('click', (e) => {
            e.preventDefault();
            dispatch({ type: 'TOGGLE_LANG' });
        });
    }

    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            dispatch({ type: 'TOGGLE_THEME' });
        });
    }

    const keysBtn = document.getElementById('keys-toggle');
    if (keysBtn) {
        keysBtn.addEventListener('click', (e) => {
            e.preventDefault();
            dispatch({ type: 'TOGGLE_KEYS' });
        });
    }

    const stateBtn = document.getElementById('state-toggle');
    if (stateBtn) {
        stateBtn.addEventListener('click', (e) => {
            e.preventDefault();
            dispatch({ type: 'TOGGLE_INSPECTOR' });
        });
    }

    const inspectorClose = document.getElementById('state-inspector-close');
    if (inspectorClose) {
        inspectorClose.addEventListener('click', (e) => {
            e.preventDefault();
            dispatch({ type: 'CLOSE_INSPECTOR' });
        });
    }

    const inspectorModal = document.getElementById('state-inspector-modal');
    if (inspectorModal) {
        inspectorModal.addEventListener('click', (e) => {
            if (e.target === inspectorModal) {
                dispatch({ type: 'CLOSE_INSPECTOR' });
            }
        });
    }

    const inspectorCopy = document.getElementById('state-inspector-copy');
    if (inspectorCopy) {
        inspectorCopy.addEventListener('click', (e) => {
            e.preventDefault();
            const jsonText = JSON.stringify(window.__SITE_STATE__, null, 2);
            navigator.clipboard.writeText(jsonText).then(() => {
                const lang = (window.__SITE_STATE__ && window.__SITE_STATE__.config.lang) || 'es';
                const t = i18n[lang] || i18n.es;
                inspectorCopy.dataset.copied = 'true';
                inspectorCopy.textContent = t.stateCopied || '¡COPIADO!';
                setTimeout(() => {
                    delete inspectorCopy.dataset.copied;
                    inspectorCopy.textContent = t.stateCopyBtn || '[COPIAR]';
                }, 1500);
            }).catch(() => {});
        });
    }

    // 3. Tab Interactions
    const tabButtons = Array.from(document.querySelectorAll('.tab-button'));
    tabButtons.forEach((tab, index) => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = tab.getAttribute('data-target');
            if (targetId) {
                dispatch({ type: 'SELECT_TAB', payload: { tabId: targetId } });
            }
        });

        // WAI-ARIA Arrow Navigation for Tablist
        tab.addEventListener('keydown', (e) => {
            let targetIndex = null;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                targetIndex = (index + 1) % tabButtons.length;
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                targetIndex = (index - 1 + tabButtons.length) % tabButtons.length;
            } else if (e.key === 'Home') {
                e.preventDefault();
                targetIndex = 0;
            } else if (e.key === 'End') {
                e.preventDefault();
                targetIndex = tabButtons.length - 1;
            }

            if (targetIndex !== null) {
                tabButtons[targetIndex].focus();
                const targetId = tabButtons[targetIndex].getAttribute('data-target');
                if (targetId) {
                    dispatch({ type: 'SELECT_TAB', payload: { tabId: targetId } });
                }
            }
        });

        tab.addEventListener('mouseenter', () => {
            if (window.__SITE_STATE__ && tab.getAttribute('data-target') !== window.__SITE_STATE__.navigation.activeTab) {
                tab.style.backgroundColor = 'var(--bg-tab-hover)';
            }
        });
        tab.addEventListener('mouseleave', () => {
            if (window.__SITE_STATE__ && tab.getAttribute('data-target') !== window.__SITE_STATE__.navigation.activeTab) {
                tab.style.backgroundColor = 'transparent';
            }
        });
    });

    // 4. Initial Safe Render
    try {
        render(state);
    } catch (err) {
        console.error("Initial render error:", err);
    }

    // 4. Global Keyboard Behaviors
    document.addEventListener('keydown', (e) => {
        const currentState = window.__SITE_STATE__;
        if (!currentState) return;

        // Escape always closes the inspector if open
        if (e.key === 'Escape' && currentState.config.inspectorOpen) {
            dispatch({ type: 'CLOSE_INSPECTOR' });
            return;
        }

        if (!currentState.config.shortcutsEnabled) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        const key = e.key.toUpperCase();
        const actionName = currentState.behaviors.keymap[key];
        if (!actionName) return;

        if (actionName === 'TOGGLE_LANG') {
            flashElement(langBtn);
            dispatch({ type: 'TOGGLE_LANG' });
        } else if (actionName === 'TOGGLE_THEME') {
            flashElement(themeBtn);
            dispatch({ type: 'TOGGLE_THEME' });
        } else if (actionName === 'TOGGLE_KEYS') {
            flashElement(keysBtn);
            dispatch({ type: 'TOGGLE_KEYS' });
        } else if (actionName === 'TOGGLE_INSPECTOR') {
            flashElement(stateBtn);
            dispatch({ type: 'TOGGLE_INSPECTOR' });
        } else if (actionName.startsWith('SELECT_TAB:')) {
            const targetId = actionName.split(':')[1];
            const tab = document.querySelector(`.tab-button[data-target="${targetId}"]`);
            flashElement(tab);
            dispatch({ type: 'SELECT_TAB', payload: { tabId: targetId } });
        } else if (actionName === 'NAVIGATE_BLOG') {
            const blogBtn = document.getElementById('nav-btn-blog');
            flashElement(blogBtn);
            setTimeout(() => { window.location.href = './blog/'; }, 150);
        } else if (actionName === 'NAVIGATE_EMAIL') {
            const emailBtn = document.getElementById('nav-btn-email');
            flashElement(emailBtn);
            window.location.href = `mailto:${currentState.entities.contact.email}`;
        } else if (actionName === 'NAVIGATE_GITHUB') {
            const ghBtn = document.getElementById('nav-btn-gh') || document.querySelector('a[href*="github.com/riccivr"]');
            flashElement(ghBtn);
            window.open(currentState.entities.contact.github, '_blank');
        } else if (actionName === 'NAVIGATE_LINKEDIN') {
            const liBtn = document.getElementById('nav-btn-li') || document.querySelector('a[href*="linkedin.com"]');
            flashElement(liBtn);
            window.open(currentState.entities.contact.linkedin, '_blank');
        } else if (actionName === 'NAVIGATE_RSS') {
            setTimeout(() => { window.location.href = currentState.entities.contact.rss; }, 150);
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPortfolio);
} else {
    initPortfolio();
}
})();

