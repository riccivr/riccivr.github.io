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

        function getLanguage() {
            const saved = safeGet('riccivr-lang');
            if (saved === 'es' || saved === 'en') return saved;
            const browserLang = (navigator.language || (navigator.languages && navigator.languages[0]) || '').toLowerCase();
            return browserLang.startsWith('es') ? 'es' : 'en';
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

        function announceA11y(message) {
            const announcer = document.getElementById('a11y-announcer');
            if (!announcer || !message) return;
            announcer.textContent = '';
            setTimeout(() => {
                announcer.textContent = message;
            }, 60);
        }

        function applyLanguage(lang) {
            const t = i18n[lang] || i18n.es;
            document.documentElement.setAttribute('lang', lang);
            
            document.getElementById('meta-title').textContent = t.metaTitle;
            document.getElementById('meta-desc').setAttribute('content', t.metaDesc);
            document.getElementById('og-title').setAttribute('content', t.metaTitle);
            document.getElementById('og-desc').setAttribute('content', t.metaDesc);
            document.getElementById('tw-title').setAttribute('content', t.metaTitle);
            document.getElementById('tw-desc').setAttribute('content', t.metaDesc);

            const skipLink = document.getElementById('skip-link');
            if (skipLink) skipLink.textContent = t.skipLink;

            document.getElementById('sys-id-label').textContent = t.sysId;
            document.getElementById('status-label').textContent = t.status;
            const statusMobile = document.getElementById('status-label-mobile');
            if (statusMobile) statusMobile.textContent = t.status;

            const langBtn = document.getElementById('lang-toggle');
            langBtn.textContent = t.langToggle;
            langBtn.setAttribute('aria-label', t.langAria);
            langBtn.setAttribute('title', t.langAria);

            const isLight = document.documentElement.getAttribute('data-theme') === 'light';
            const themeBtn = document.getElementById('theme-toggle');
            themeBtn.textContent = isLight ? t.modePaper : t.modeCrt;
            const themeLabel = isLight ? t.themeAriaPaper : t.themeAria;
            themeBtn.setAttribute('aria-label', themeLabel);
            themeBtn.setAttribute('title', themeLabel);

            const keysEnabled = safeGet('riccivr-keys') !== 'off';
            const keysBtn = document.getElementById('keys-toggle');
            keysBtn.textContent = keysEnabled ? t.keysOn : t.keysOff;
            keysBtn.setAttribute('aria-label', t.keysAria);
            keysBtn.setAttribute('title', t.keysAria);
            keysBtn.setAttribute('aria-pressed', keysEnabled ? 'true' : 'false');

            document.getElementById('bio-role').textContent = t.bioRole;
            document.getElementById('bio-stack').textContent = t.bioStack;
            document.getElementById('bio-motto').textContent = t.bioMotto;

            const navBlog = document.getElementById('nav-btn-blog');
            navBlog.textContent = t.navBlog;
            navBlog.setAttribute('aria-label', t.navBlogAria);
            navBlog.setAttribute('title', t.navBlogAria);

            const navEmail = document.getElementById('nav-btn-email');
            navEmail.textContent = t.navEmail;
            navEmail.setAttribute('aria-label', t.navEmailAria);
            navEmail.setAttribute('title', t.navEmailAria);

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

            const tablist = document.getElementById('portfolio-tablist');
            if (tablist) tablist.setAttribute('aria-label', t.tablistLabel);

            document.getElementById('tab-projects').textContent = t.tabProjects;
            document.getElementById('tab-blog').textContent = t.tabBlog;
            document.getElementById('tab-skills').textContent = t.tabSkills;
            document.getElementById('tab-contact').textContent = t.tabContact;

            document.getElementById('beam-sub').textContent = t.beamSub;
            document.getElementById('beam-badge').textContent = t.beamBadge;
            document.getElementById('beam-desc').textContent = t.beamDesc;
            document.getElementById('beam-tags').innerHTML = t.beamTags.map(tag => `<span class="text-xs px-2 py-0.5 font-medium rounded-sm" style="background-color: var(--bg-badge); color: var(--text-main);">${tag}</span>`).join('');
            const beamLink = document.getElementById('beam-link');
            if (beamLink) {
                beamLink.setAttribute('aria-label', t.beamGhAria || 'beam');
                beamLink.setAttribute('title', t.beamGhAria || 'beam');
            }

            document.getElementById('autodub-sub').textContent = t.autodubSub;
            document.getElementById('autodub-badge').textContent = t.autodubBadge;
            document.getElementById('autodub-desc').textContent = t.autodubDesc;
            document.getElementById('autodub-tags').innerHTML = t.autodubTags.map(tag => `<span class="text-xs px-2 py-0.5 font-medium rounded-sm" style="background-color: var(--bg-badge); color: var(--text-main);">${tag}</span>`).join('');
            const autodubLink = document.getElementById('autodub-link');
            if (autodubLink) {
                autodubLink.setAttribute('aria-label', t.autodubGhAria || 'autodub');
                autodubLink.setAttribute('title', t.autodubGhAria || 'autodub');
            }

            document.getElementById('dshuf-sub').textContent = t.dshufSub;
            document.getElementById('dshuf-badge').textContent = t.dshufBadge;
            document.getElementById('dshuf-desc').textContent = t.dshufDesc;
            document.getElementById('dshuf-tags').innerHTML = t.dshufTags.map(tag => `<span class="text-xs px-2 py-0.5 font-medium rounded-sm" style="background-color: var(--bg-badge); color: var(--text-main);">${tag}</span>`).join('');
            const dshufLink = document.getElementById('dshuf-link');
            if (dshufLink) {
                dshufLink.setAttribute('aria-label', t.dshufGhAria || 'dshuf');
                dshufLink.setAttribute('title', t.dshufGhAria || 'dshuf');
            }

            document.getElementById('gitcrawl-sub').textContent = t.gitcrawlSub;
            document.getElementById('gitcrawl-badge').textContent = t.gitcrawlBadge;
            document.getElementById('gitcrawl-desc').textContent = t.gitcrawlDesc;
            document.getElementById('gitcrawl-tags').innerHTML = t.gitcrawlTags.map(tag => `<span class="text-xs px-2 py-0.5 font-medium rounded-sm" style="background-color: var(--bg-badge); color: var(--text-main);">${tag}</span>`).join('');
            const gitcrawlLink = document.getElementById('gitcrawl-link');
            if (gitcrawlLink) {
                gitcrawlLink.setAttribute('aria-label', t.gitcrawlGhAria || 'gitcrawl');
                gitcrawlLink.setAttribute('title', t.gitcrawlGhAria || 'gitcrawl');
            }

            document.getElementById('approx-sub').textContent = t.approxSub;
            document.getElementById('approx-badge').textContent = t.approxBadge;
            document.getElementById('approx-desc').textContent = t.approxDesc;
            document.getElementById('approx-tags').innerHTML = t.approxTags.map(tag => `<span class="text-xs px-2 py-0.5 font-medium rounded-sm" style="background-color: var(--bg-badge); color: var(--text-main);">${tag}</span>`).join('');
            const approxLink = document.getElementById('approx-link');
            if (approxLink) {
                approxLink.setAttribute('aria-label', t.approxGhAria || 'approx');
                approxLink.setAttribute('title', t.approxGhAria || 'approx');
            }

            document.getElementById('unipaste-sub').textContent = t.unipasteSub;
            document.getElementById('unipaste-badge').textContent = t.unipasteBadge;
            document.getElementById('unipaste-desc').textContent = t.unipasteDesc;
            document.getElementById('unipaste-tags').innerHTML = t.unipasteTags.map(tag => `<span class="text-xs px-2 py-0.5 font-medium rounded-sm" style="background-color: var(--bg-badge); color: var(--text-main);">${tag}</span>`).join('');
            const unipasteLink = document.getElementById('unipaste-link');
            if (unipasteLink) {
                unipasteLink.setAttribute('aria-label', t.unipasteGhAria || 'unipaste');
                unipasteLink.setAttribute('title', t.unipasteGhAria || 'unipaste');
            }

            document.getElementById('clipbridge-sub').textContent = t.clipbridgeSub;
            document.getElementById('clipbridge-badge').textContent = t.clipbridgeBadge;
            document.getElementById('clipbridge-desc').textContent = t.clipbridgeDesc;
            document.getElementById('clipbridge-tags').innerHTML = t.clipbridgeTags.map(tag => `<span class="text-xs px-2 py-0.5 font-medium rounded-sm" style="background-color: var(--bg-badge); color: var(--text-main);">${tag}</span>`).join('');
            const clipbridgeLink = document.getElementById('clipbridge-link');
            if (clipbridgeLink) {
                clipbridgeLink.setAttribute('aria-label', t.clipbridgeGhAria || 'clipbridge');
                clipbridgeLink.setAttribute('title', t.clipbridgeGhAria || 'clipbridge');
            }

            document.getElementById('blog-section-intro').textContent = t.blogIntro;
            document.getElementById('featured-post-tag').textContent = t.featuredTag;
            document.getElementById('featured-post-reading-time').textContent = t.featuredReading;
            document.getElementById('featured-post-link').textContent = t.featuredTitle;
            document.getElementById('featured-post-summary').textContent = t.featuredSummary;
            document.getElementById('featured-post-badges').innerHTML = t.featuredBadges.map(b => `<span class="text-xs px-2 py-0.5 font-medium rounded-sm" style="background-color: var(--bg-badge); color: var(--text-heading);">${b}</span>`).join('');
            
            const featuredBtn = document.getElementById('featured-post-btn');
            featuredBtn.textContent = t.featuredBtn;
            if (t.featuredBtnAria) {
                featuredBtn.setAttribute('aria-label', t.featuredBtnAria);
                featuredBtn.setAttribute('title', t.featuredBtnAria);
            }

            document.getElementById('blog-banner-text').textContent = t.blogBannerText;
            const blogBannerBtn = document.getElementById('blog-banner-btn');
            blogBannerBtn.textContent = t.blogBannerBtn;
            if (t.allPostsAria) {
                blogBannerBtn.setAttribute('aria-label', t.allPostsAria);
                blogBannerBtn.setAttribute('title', t.allPostsAria);
            }

            document.getElementById('skills-intro').textContent = t.skillsIntro;
            document.getElementById('skill-card-1-title').textContent = t.skillCard1Title;
            document.getElementById('skill-card-1-badge').textContent = t.skillCard1Badge;
            document.getElementById('skill-card-1-list').innerHTML = renderSkillGroups(t.skillCard1Groups);

            document.getElementById('skill-card-2-title').textContent = t.skillCard2Title;
            document.getElementById('skill-card-2-badge').textContent = t.skillCard2Badge;
            document.getElementById('skill-card-2-list').innerHTML = renderSkillGroups(t.skillCard2Groups);

            document.getElementById('contact-intro').textContent = t.contactIntro;
            document.getElementById('contact-email-label').textContent = t.contactEmailLabel;
            document.getElementById('contact-email-btn').textContent = t.contactEmailBtn;
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
                footerRss.setAttribute('href', lang === 'es' ? './feed-es.xml' : './feed.xml');
                footerRss.setAttribute('title', lang === 'es' ? 'Canal RSS en XML (Español) [R]' : 'RSS Feed in XML (English) [R]');
            }

            document.getElementById('footer-text').textContent = t.footerText;
        }

        function initPortfolio() {
            let currentLang = getLanguage();
            applyLanguage(currentLang);

            const langBtn = document.getElementById('lang-toggle');
            langBtn.addEventListener('click', () => {
                currentLang = currentLang === 'es' ? 'en' : 'es';
                safeSet('riccivr-lang', currentLang);
                applyLanguage(currentLang);
                const t = i18n[currentLang] || i18n.es;
                announceA11y(t.langAnnounce);
            });

            const themeBtn = document.getElementById('theme-toggle');
            
            function updateThemeBtn() {
                const isLight = document.documentElement.getAttribute('data-theme') === 'light';
                const t = i18n[currentLang] || i18n.es;
                themeBtn.textContent = isLight ? t.modePaper : t.modeCrt;
                const label = isLight ? t.themeAriaPaper : t.themeAria;
                themeBtn.setAttribute('aria-label', label);
                themeBtn.setAttribute('title', label);
            }

            themeBtn.addEventListener('click', () => {
                const isLight = document.documentElement.getAttribute('data-theme') === 'light';
                const next = isLight ? 'dark' : 'light';
                if (next === 'light') {
                    document.documentElement.setAttribute('data-theme', 'light');
                } else {
                    document.documentElement.removeAttribute('data-theme');
                }
                safeSet('riccivr-theme', next);
                updateThemeBtn();
                syncTabsStyling();
                const t = i18n[currentLang] || i18n.es;
                announceA11y(next === 'light' ? t.themeAnnouncePaper : t.themeAnnounceCrt);
            });

            updateThemeBtn();

            const keysToggleBtn = document.getElementById('keys-toggle');
            function areKeysEnabled() {
                return safeGet('riccivr-keys') !== 'off';
            }
            function updateKeysBtn() {
                if (!keysToggleBtn) return;
                const enabled = areKeysEnabled();
                const t = i18n[currentLang] || i18n.es;
                keysToggleBtn.textContent = enabled ? t.keysOn : t.keysOff;
                keysToggleBtn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
                keysToggleBtn.setAttribute('aria-label', t.keysAria);
                keysToggleBtn.setAttribute('title', t.keysAria);
                keysToggleBtn.style.opacity = enabled ? '1' : '0.6';
            }
            keysToggleBtn.addEventListener('click', () => {
                const currentlyEnabled = areKeysEnabled();
                const nextState = currentlyEnabled ? 'off' : 'on';
                safeSet('riccivr-keys', nextState);
                updateKeysBtn();
                const t = i18n[currentLang] || i18n.es;
                announceA11y(nextState === 'on' ? t.keysAnnounceOn : t.keysAnnounceOff);
            });
            updateKeysBtn();

            const tabButtons = Array.from(document.querySelectorAll('.tab-button'));
            const contents = document.querySelectorAll('.content-section');
            let currentTabId = 'projects-content';

            function syncTabsStyling() {
                const isLight = document.documentElement.getAttribute('data-theme') === 'light';
                tabButtons.forEach(tab => {
                    const isSelected = tab.getAttribute('data-target') === currentTabId;
                    tab.setAttribute('aria-selected', isSelected ? 'true' : 'false');
                    tab.setAttribute('tabindex', '0');
                    if (isSelected) {
                        tab.style.backgroundColor = isLight ? 'var(--bg-tab-active)' : 'var(--bg-tab-active)';
                        tab.style.borderBottom = 'none';
                    } else {
                        tab.style.backgroundColor = 'transparent';
                        tab.style.borderBottom = '';
                    }
                });
            }

            function switchTab(targetId, shouldAnnounce = false) {
                currentTabId = targetId;
                contents.forEach(content => {
                    content.classList.add('hidden');
                });

                const activeContent = document.getElementById(targetId);
                if (activeContent) {
                    activeContent.classList.remove('hidden');
                }
                syncTabsStyling();

                if (shouldAnnounce) {
                    const t = i18n[currentLang] || i18n.es;
                    const map = {
                        'projects-content': t.tabAnnounceProjects,
                        'blog-content': t.tabAnnounceBlog,
                        'skills-content': t.tabAnnounceSkills,
                        'contact-content': t.tabAnnounceContact
                    };
                    announceA11y(map[targetId] || targetId);
                }
            }

            tabButtons.forEach((tab, index) => {
                tab.addEventListener('click', () => {
                    switchTab(tab.getAttribute('data-target'), true);
                });

                // Keyboard arrow navigation for tabs (WAI-ARIA Tablist Pattern)
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
                        switchTab(tabButtons[targetIndex].getAttribute('data-target'), true);
                    }
                });

                tab.addEventListener('mouseenter', () => {
                    if (tab.getAttribute('data-target') !== currentTabId) {
                        tab.style.backgroundColor = 'var(--bg-tab-hover)';
                    }
                });
                tab.addEventListener('mouseleave', () => {
                    if (tab.getAttribute('data-target') !== currentTabId) {
                        tab.style.backgroundColor = 'transparent';
                    }
                });
            });

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

            document.addEventListener('keydown', (e) => {
                if (!areKeysEnabled()) {
                    return;
                }
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                    return;
                }
                if (e.ctrlKey || e.metaKey || e.altKey) {
                    return;
                }

                const key = e.key.toUpperCase();
                
                if (key === 'I') {
                    flashElement(langBtn);
                    langBtn.click();
                } else if (key === 'B') {
                    const blogBtn = document.getElementById('nav-btn-blog');
                    flashElement(blogBtn);
                    setTimeout(() => { window.location.href = './blog/'; }, 150);
                } else if (key === 'C') {
                    const emailBtn = document.getElementById('nav-btn-email');
                    flashElement(emailBtn);
                    window.location.href = 'mailto:ricci.vr@gmail.com';
                } else if (key === 'G') {
                    const ghBtn = document.getElementById('nav-btn-gh') || document.querySelector('a[href="https://github.com/riccivr"]');
                    flashElement(ghBtn);
                    window.open('https://github.com/riccivr', '_blank');
                } else if (key === 'L') {
                    const liBtn = document.getElementById('nav-btn-li') || document.querySelector('a[href*="linkedin.com"]');
                    flashElement(liBtn);
                    window.open('https://www.linkedin.com/in/riccivr/', '_blank');
                } else if (key === 'R') {
                    const currentLang = getLanguage();
                    const targetFeed = currentLang === 'es' ? './feed-es.xml' : './feed.xml';
                    setTimeout(() => { window.location.href = targetFeed; }, 150);
                } else if (key === 'T') {
                    flashElement(themeBtn);
                    themeBtn.click();
                } else if (key === '1' || key === 'P') {
                    const tab = document.getElementById('tab-projects');
                    flashElement(tab);
                    switchTab('projects-content', true);
                } else if (key === '2') {
                    const tab = document.getElementById('tab-blog');
                    flashElement(tab);
                    switchTab('blog-content', true);
                } else if (key === '3' || key === 'S') {
                    const tab = document.getElementById('tab-skills');
                    flashElement(tab);
                    switchTab('skills-content', true);
                } else if (key === '4') {
                    const tab = document.getElementById('tab-contact');
                    flashElement(tab);
                    switchTab('contact-content', true);
                }
            });

            switchTab('projects-content', false);
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initPortfolio);
        } else {
            initPortfolio();
        }