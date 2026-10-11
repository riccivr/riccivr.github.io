# reelscribe: transcribiendo reels y tiktoks con IA local para el trabajo de mi novia

*Publicado: 11 de octubre de 2026. Categoría: Proyectos & Multimedia. Tiempo de lectura: ~5 min*
*Etiquetas: Python, reelscribe, Whisper, Ollama, yt-dlp, CLI*

---

Hace unas semanas armé [`autodub`](https://riccivr.github.io/blog/autodub-automating-video-dubbing-to-spanish.html) y [`beam`](https://riccivr.github.io/blog/beam-ephemeral-video-streaming-in-c99.html) para poder mandarle videos doblados al español a mi novia cuando terminamos de trabajar. Esta vez el rollo venía directamente de su trabajo del día a día.

En su trabajo llevando redes sociales y estrategia de contenido, a ella le toca revisar lotes enteros de publicaciones, Reels de Instagram y videos de TikTok de sus clientes. Para sacar analíticas de verdad y cuadrar qué contenido funciona, ver el número de vistas o likes se queda corto. Tienes que bajar al guion para pillar qué ganchos iniciales retienen a la gente en los primeros tres segundos, qué palabras exactas ayudan a vender un producto, qué temas se repiten en los videos que pegan y qué cosas simplemente no sirven.

Hacer ese levantamiento a mano es un fastidio enorme:

- Te toca abrir veinte o treinta enlaces seguidos, muchos compartidos desde el celular como enlaces cortos `vm.tiktok.com` llenos de parámetros basura de rastreo.
- Tienes que calarte cada video con música de fondo a todo volumen, pausando cada tres segundos para anotar en un documento lo que dice la persona.
- Cuando por fin terminas de transcribir quince videos a pedal, todavía te queda leer todas esas páginas de arriba a abajo para cruzar patrones y armar un informe comparativo.

Para quitarle ese trabajo mecánico de encima construí [**`reelscribe`**](https://github.com/riccivr/reelscribe), una herramienta de terminal en WSL que agarra cualquier cantidad de URLs de TikTok o Instagram, resuelve los enlaces cortos, transcribe cada video por separado en archivos `.md`, `.srt` y `.json` con `faster-whisper` y genera al final un resumen analítico de todo el lote con un modelo local en Ollama.

---

## 1. El flujo completo desde las URLs hasta el análisis

La idea desde el principio fue que ella me pudiera pasar una lista de enlaces tal cual salen al darle al botón de compartir desde la app del celular o desde el navegador, y que un solo comando dejara toda la carpeta lista y ordenada.

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
│ - Descarga pista de audio temporal (soporta cookies.txt)     │
│ - Extrae metadatos (autor, plataforma, ID, título, duración) │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. Transcripción en GPU con faster-whisper                   │
│ - Carga el modelo una sola vez en caché para todo el lote    │
│ - CUDA float16 automático (con fallback a CPU int8) + VAD    │
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
│ - Verifica disponibilidad de Ollama sin bloquear el lote     │
│ - Genera transcriptions/resumen.md con puntos accionables    │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Enlaces cortos, basura de rastreo y deduplicación

Cuando trabajas con enlaces que te mandan por WhatsApp o Slack, casi nunca vienen limpios. Un mismo video de TikTok te puede llegar de dos formas distintas en la misma lista:

1. El enlace largo del navegador con parámetros de sesión como `https://www.tiktok.com/@cliente/video/7691761289726594326?_r=1&_t=ZN-9ASicGAxtaw`
2. El enlace corto generado por la aplicación móvil como `https://vm.tiktok.com/ZN8BDuYDp/`

Si le tiras ambos a un script a lo loco, descarga y transcribe el mismo video dos veces, ensuciando el conteo de palabras y el resumen final.

En `reelscribe`, antes de llamar a `yt-dlp`, cada URL pasa por `resolve_url()`:

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

Con esto el cliente resuelve las redirecciones de los dominios cortos, limpia los parámetros `?_r=1&_t=...` y compara la URL canónica resultante contra un conjunto en memoria. Si el enlace corto y el enlace largo apuntan al mismo video, lo pilla de una vez y salta el duplicado. Y si algún Reel o TikTok pide sesión iniciada, puedes pasarle tus credenciales con `-c cookies.txt` o `--cookies-from-browser`.

---

## 3. Aceleración por GPU, caché del modelo y salida en tres formatos

Apenas probamos la primera versión con lotes reales de su trabajo, mi novia armó y subió la [PR #1](https://github.com/riccivr/reelscribe/pull/1) como usuaria final para meterle varias mejoras de velocidad y comodidad que hacían falta:

- **Aceleración automática con GPU NVIDIA.** Al arrancar con `--device auto`, `reelscribe` precarga dinámicamente `libcublas.so` y `libcudnn.so` desde el entorno virtual, detecta si hay tarjeta NVIDIA para correr en precisión `float16` y cae automáticamente a CPU en `int8` si no consigue CUDA.
- **Caché del modelo por lote.** En vez de volver a cargar `WhisperModel` desde el disco por cada video, el modelo se inicializa en memoria una sola vez al principio y se reutiliza en toda la cola.
- **Parche de compatibilidad con PyAV.** Envuelve `av.open` para limpiar el argumento `metadata_errors` en versiones recientes de PyAV y evitar que la decodificación de audio explote a mitad de camino.

Los videos cortos de redes sociales tienen además una trampa clásica para el reconocimiento de voz. Casi todos traen música comercial sonando duro de fondo, cortes bruscos y silencios intermedios. Si pasas ese audio crudo por Whisper sin filtro, el modelo se vuelve loco inventando frases repetidas durante los compases musicales. Para evitar ese rollo, `reelscribe` activa el filtro de detección de voz `vad_filter=True` con ventanas de silencio de 400 ms y extrae marcas de tiempo palabra por palabra con `word_timestamps=True`.

Por cada video procesado se guardan tres archivos separados en la carpeta de salida:

1. **Archivo Markdown `.md`.** Queda listo para leer de un vistazo. Trae la ficha del video con su URL canónica, plataforma, autor, ID, duración e idioma, seguida del párrafo de transcripción de corrido y el desglose línea por línea con su minuto y segundo exacto.
2. **Archivo de subtítulos `.srt`.** Sirve para meterlo directo en cualquier editor de video si hace falta subtitular o picar clips para el cliente.
3. **Archivo estructurado `.json`.** Guarda todos los metadatos de `yt-dlp` junto con el arreglo completo de segmentos y cada palabra individual con su segundo de inicio, fin y probabilidad. Con esto puedes correr scripts para contar palabras clave, medir la velocidad de habla o cruzar qué términos salen en los videos con mejor retención.

---

## 4. Resumen analítico del lote con Ollama local

Tener veinte archivos `.md` separados te ahorra el trabajo de transcribir, pero lo que de verdad te salva la tarde es cruzar todo el lote de un solo golpe.

En lugar de pagar APIs en la nube o andar copiando y pegando textos en el navegador, conecté el paso final de `reelscribe` directo al servidor HTTP local de Ollama en `http://localhost:11434/api/chat` corriendo `Qwen2.5-14B-Instruct`.

Antes de pedir el resumen, `is_ollama_available()` verifica en 1.5 segundos si el servidor local responde en `/api/tags`. Si tienes Ollama apagado, te avisa por consola y deja intactas todas las transcripciones individuales sin tumbar el proceso. Cuando Ollama está activo, junta todas las transcripciones con sus metadatos y genera `transcriptions/resumen.md` dividido en tres bloques:

- **Resumen ejecutivo general.** Explica de qué va el lote de videos y cuál es la línea de comunicación de la cuenta.
- **Desglose video por video.** Detalla qué ofrece cada pieza, qué gancho usa al abrir, cómo estructura el guion y cuál es el llamado a la acción.
- **Conclusiones e ideas accionables.** Saca en limpio qué patrones, ofertas o palabras clave se repiten para replicarlos en los próximos guiones.

---

## 5. Uso diario en la terminal

Procesar una tanda de Reels o TikToks se reduce a tirar un comando en WSL, pasando los enlaces como argumentos, desde un archivo con `-f` o por `stdin`:

```sh
# Procesar varias URLs en GPU (incluyendo short links) y abrir la carpeta al terminar
reelscribe --open-dir "https://vm.tiktok.com/ZN8BDuYDp/" "https://www.instagram.com/reel/EXAMPLE/"

# Procesar una lista completa de un cliente con cookies y modelo large-v3-turbo
reelscribe -f cliente_octubre.txt -c cookies.txt -m large-v3-turbo -o transcriptions/cliente_octubre
```

Al terminar, la carpeta queda al pelo con todos los archivos numerados y el informe consolidado en `resumen.md`, abriéndose sola en el Explorador de Windows si le pasas `--open-dir`. Lo que antes era una tarde entera escuchando videos en bucle y tomando notas a mano ahora sale en segundos corriendo 100% en local.

El código fuente está disponible en GitHub en [**`github.com/riccivr/reelscribe`**](https://github.com/riccivr/reelscribe).
