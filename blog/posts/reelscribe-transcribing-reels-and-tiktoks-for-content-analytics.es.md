# reelscribe: transcribiendo reels y tiktoks con IA local para el trabajo de mi novia

*Publicado: 11 de octubre de 2026. Categoría: Proyectos & Multimedia. Tiempo de lectura: ~5 min*
*Etiquetas: Python, reelscribe, Whisper, Ollama, yt-dlp, CLI*

---

Hace unas semanas armé [`autodub`](https://riccivr.github.io/blog/autodub-automating-video-dubbing-to-spanish.html) y [`beam`](https://riccivr.github.io/blog/beam-ephemeral-video-streaming-in-c99.html) para poder mandarle videos doblados al español a mi novia cuando terminamos de trabajar. Esta vez el problema venía directamente de su propio trabajo diario.

En su trabajo con redes sociales y estrategia de contenido, ella necesita revisar lotes enteros de publicaciones, Reels de Instagram y videos de TikTok de sus clientes. Para sacar analíticas de verdad y tomar decisiones con datos, no basta con ver el número de vistas o likes. Hay que bajar al texto: analizar qué ganchos iniciales retienen a la gente en los primeros tres segundos, qué palabras o estructuras de guion funcionan para vender un producto, qué temas se repiten en los videos exitosos y qué cosas simplemente no sirven.

Hacer ese levantamiento a mano es un castigo:

- Tienes que abrir veinte o treinta enlaces seguidos, muchos compartidos desde el teléfono como enlaces cortos (`vm.tiktok.com/...`) llenos de parámetros basura de rastreo.
- Tienes que escuchar cada video con música de fondo a todo volumen, pausando cada tres segundos para copiar en un documento lo que dice la persona.
- Al terminar de transcribir diez o quince videos, todavía te toca leer todo de arriba a abajo para cruzar patrones y redactar un informe comparativo.

Para quitarle ese trabajo mecánico de encima construí [**`reelscribe`**](https://github.com/riccivr/reelscribe): una herramienta de terminal en WSL que recibe cualquier cantidad de URLs de TikTok o Instagram, resuelve enlaces cortos, transcribe cada video por separado en tres formatos (`.md`, `.srt` y `.json`) usando `faster-whisper` y genera al final un resumen analítico de todo el lote con un modelo local en Ollama.

---

## 1. El flujo completo desde las URLs hasta el análisis

La idea desde el principio fue que ella me pudiera pasar una lista de enlaces tal cual salen al darle "Copiar enlace" desde la app del teléfono o desde el navegador, y que un solo comando dejara toda la carpeta lista para trabajar.

```
┌──────────────────────────────────────────────────────────────┐
│ Entrada: URLs de TikTok / Instagram + Short Links            │
│ (ej. vm.tiktok.com/ZN8BDuYDp/ o urls con ?_r=1&_t=...)       │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ 1. Resolución HTTP y Deduplicación Canónica                  │
│ - Sigue redirecciones 301/302 de short links                 │
│ - Limpia query params de rastreo y filtra duplicados         │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. Extracción con yt-dlp + FFmpeg                            │
│ - Descarga pista de audio en temporal                        │
│ - Extrae metadatos (autor, plataforma, ID, título, duración) │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. Transcripción Local con faster-whisper                    │
│ - Filtro VAD (Voice Activity Detection) contra música/ruido  │
│ - Timestamps exactos por segmento y por palabra              │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. Archivos Individuales por Video                           │
│ - 01_tiktok_autor_id.md   (Metadatos + texto limpio + reloj) │
│ - 01_tiktok_autor_id.srt  (Subtítulos estándar)              │
│ - 01_tiktok_autor_id.json (Datos crudos para analíticas)     │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ 5. Resumen Global con Ollama Local (Qwen 2.5 14B)            │
│ - Cruza todas las transcripciones del lote en local          │
│ - Genera transcriptions/resumen.md con puntos accionables    │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Enlaces cortos, basura de rastreo y deduplicación

Cuando trabajas con enlaces que te mandan por WhatsApp o Slack, casi nunca vienen limpios. Un mismo video de TikTok te puede llegar de dos formas distintas en la misma lista:

1. El enlace largo del navegador con parámetros de sesión: `https://www.tiktok.com/@cliente/video/7691761289726594326?_r=1&_t=ZN-9ASicGAxtaw`
2. El short link generado por la aplicación móvil: `https://vm.tiktok.com/ZN8BDuYDp/`

Si le pasas ambos a un script ingenuo, descarga y transcribe el mismo video dos veces, ensuciando las métricas y el resumen final.

En `reelscribe`, antes de tocar `yt-dlp`, cada URL pasa por `resolve_url()`:

```python
SHORT_LINK_HOSTS = {"vm.tiktok.com", "vt.tiktok.com", "instagr.am"}

def resolve_url(url: str) -> str:
    url = url.strip()
    parsed = urlparse(url)
    host = parsed.netloc.lower()

    if host in SHORT_LINK_HOSTS or "/t/" in parsed.path:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=15) as resp:
            url = resp.geturl()
            parsed = urlparse(url)
            host = parsed.netloc.lower()

    if "tiktok.com" in host or "instagram.com" in host:
        parsed = parsed._replace(query="", fragment="")
        url = urlunparse(parsed)

    return url
```

Con esto el cliente resuelve las redirecciones de los dominios cortos, limpia los parámetros `?_r=1&_t=...` y compara la URL canónica resultante contra un conjunto en memoria. Si el enlace corto y el enlace largo apuntan al mismo video, lo detecta de inmediato y omite el duplicado.

---

## 3. Transcripción limpia con filtro VAD y salida en tres formatos

Los videos cortos de redes sociales tienen una trampa para los modelos de reconocimiento de voz: casi todos tienen música comercial sonando duro de fondo, cortes bruscos y silencios intermedios. Si pasas ese audio crudo por Whisper sin filtros, el modelo suele alucinar frases repetidas durante los compases musicales.

Para evitarlo, `reelscribe` activa el filtro VAD (`vad_filter=True`) integrado en `faster-whisper` con ventanas de silencio de 400 ms y extracción de marcas de tiempo palabra por palabra (`word_timestamps=True`).

Por cada video procesado se guardan tres archivos separados en la carpeta de salida:

1. **Archivo Markdown (`.md`):** pensado para lectura rápida. Incluye la ficha del video (URL canónica, plataforma, autor, ID, duración e idioma), seguida del párrafo de transcripción limpia de corrido y, más abajo, el desglose línea por línea con su minuto y segundo exacto (`[00:00 - 00:06]`).
2. **Archivo de subtítulos (`.srt`):** listo para importar en cualquier editor de video si hace falta reutilizar o subtitular piezas.
3. **Archivo estructurado (`.json`):** contiene todos los metadatos extraídos por `yt-dlp` junto con el arreglo completo de segmentos y cada palabra individual con su segundo de inicio, fin y probabilidad. Esto permite correr scripts de conteo de palabras clave, medir la velocidad de habla (palabras por minuto) o cruzar qué términos aparecen en los videos con mayor retención.

---

## 4. Resumen analítico del lote con Ollama local

Tener veinte archivos `.md` separados resuelve la mitad del trabajo, pero el verdadero ahorro de tiempo está en cruzar todo el lote de una vez.

En lugar de depender de APIs pagas en la nube o copiar y pegar textos en un navegador, conecté el paso final de `reelscribe` directamente a la API HTTP local de **Ollama** (`http://localhost:11434/api/chat`) corriendo `Qwen2.5-14B-Instruct`.

Cuando termina de transcribir el último video de la lista, la herramienta empaqueta todas las transcripciones con sus metadatos (autor, título y texto completo) y le pide al modelo local que genere `transcriptions/resumen.md` estructurado en tres partes:

- **Resumen ejecutivo general:** de qué trata el lote de videos y cuál es el enfoque común de comunicación.
- **Desglose video por video:** qué ofrece, qué gancho utiliza, qué estructura sigue y cuál es el llamado a la acción de cada pieza.
- **Conclusiones e ideas accionables:** qué patrones, ofertas o palabras clave destacan para replicar en futuros guiones.

---

## 5. Uso diario en la terminal

Procesar una tanda de Reels o TikToks toma un solo comando en WSL:

```sh
# Procesar varias URLs (incluyendo short links) y generar el resumen con Ollama
reelscribe "https://vm.tiktok.com/ZN8BDuYDp/" "https://www.instagram.com/reel/EXAMPLE/"

# Procesar una lista completa de un cliente desde un archivo de texto
reelscribe -f cliente_octubre.txt -o transcriptions/cliente_octubre
```

Al terminar, la carpeta queda ordenada con los archivos numerados (`01_tiktok_...`, `02_instagram_...`) y el informe consolidado en `resumen.md`. Lo que antes tomaba una tarde entera de escuchar videos en bucle y tomar notas a mano ahora sale en menos de un minuto corriendo 100% en local.

El código fuente está disponible en GitHub: [**`github.com/riccivr/reelscribe`**](https://github.com/riccivr/reelscribe).
