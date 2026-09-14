# autodub: doblando videos al español para verlos con mi novia

*Publicado: 14 de septiembre de 2026. Categoría: Proyectos & Multimedia. Tiempo de lectura: ~5 min*
*Etiquetas: Python, autodub, FFmpeg, Whisper, Audio, Open Source*

---

Yo consumo una cantidad exagerada de videos todos los días: análisis técnicos, ensayos documentales, historias de computación y cosas raras que me voy encontrando en YouTube.

Cada vez que veo algo que de verdad vale la pena, mi primer impulso es querer compartírselo a mi novia para verlo juntos y comentar la jugada. Pero casi siempre nos topamos con la misma traba: casi todo lo que consumo está en inglés.

Ella entiende inglés y puede leer subtítulos sin problema, pero calarse un documental de media hora leyendo subtítulos cambia toda la dinámica. Los subtítulos te amarran los ojos a la pantalla todo el tiempo. No puedes desviar la mirada ni cinco segundos, no puedes poner el video de fondo mientras cocinas, y tener que leer texto mientras pasan diagramas o animaciones termina siendo un fastidio.

Yo quería que pudiéramos sentarnos a ver los videos relajados, sin fricción. De esa necesidad nació mi proyecto más reciente: [**`autodub`**](https://github.com/riccivr/autodub), una herramienta de terminal que agarra cualquier video y te genera una pista de audio doblada al español y sincronizada de forma local.

---

## 1. Por qué doblar al español es un verdadero rollo

Cuando me puse a pensar en cómo armarlo, la jugada parecía sencilla: transcribir el audio, traducirlo, sintetizar la voz y pegar la pista nueva.

Pero en la práctica la cosa se complica bastante por dos rollos fundamentales: la expansión de sílabas y la atmósfera del audio original.

### El problema de la expansión de sílabas

El español es notablemente más largo que el inglés. En promedio, expresar la misma idea en español requiere entre un 20% y un 30% más de sílabas:

- En inglés: *"I had to run down the hill."* (7 sílabas)
- En español: *"Tuve que bajar corriendo la colina."* (12 sílabas)

Si la persona en el video habla en inglés durante una ventana de 3 segundos, la voz sintetizada en español va a necesitar unos 4.2 segundos para decir lo mismo. Si tiras ese audio en la línea de tiempo a lo loco, la voz se monta encima de la siguiente frase. En menos de dos minutos de video, el desfase se acumula y la voz termina sonando segundos después de que la persona en pantalla ya cerró la boca. Un desastre.

### El matiz regional y las voces robóticas

El español tiene una variedad regional gigantesca. Una traducción literal puede sonar demasiado tiesa, formal o de plano rara dependiendo de los modismos. Y si el video tiene humor, jerga de internet o términos técnicos, los traductores automáticos suelen tropezar feo.

A eso súmale que si usas cualquier motor de voz plano, termina sonando como un GPS de carro del 2005. Si la voz no tiene cadencia ni emoción, le mata toda la gracia al video original.

### El silencio incómodo de apagar el audio original

Muchos scripts de doblaje amateur cometen el error de silenciar por completo la pista de audio original y clavarle la voz sintetizada encima.

El resultado da grima. Se pierden la música de fondo, los efectos de sonido, las risas y la acústica del lugar. El video se siente artificial y muerto, como si fuera un video corporativo de inducción laboral.

---

## 2. Cómo lo resuelve autodub

Diseñé `autodub` con objetivos bien claros: tenía que correr localmente en CPU sin obligarme a tener una tarjeta gráfica dedicada, tenía que mantener sincronía absoluta en videos largos sin desfasarse, y tenía que preservar la atmósfera del audio original.

```
                    ┌────────────────────────────┐
                    │      Video / URL YouTube   │
                    └──────────────┬─────────────┘
                                   │
                                   ▼
                    ┌────────────────────────────┐
                    │  yt-dlp & Extractor FFmpeg │
                    │     WAV 16 kHz Mono        │
                    └──────────────┬─────────────┘
                                   │
                                   ▼
                    ┌────────────────────────────┐
                    │ faster-whisper (int8 CPU)  │
                    │   Segmentos con Timestamp  │
                    └──────────────┬─────────────┘
                                   │
                                   ▼
                    ┌────────────────────────────┐
                    │    Traducción Concurrente  │
                    │    Mapeo Estricto de Tiempo│
                    └──────────────┬─────────────┘
                                   │
                                   ▼
                    ┌────────────────────────────┐
                    │    Piper TTS / Edge-TTS    │
                    │   Síntesis de Audio Crudo  │
                    └──────────────┬─────────────┘
                                   │
                                   ▼
                    ┌────────────────────────────┐
                    │ Alineador PCM en Memoria   │
                    │ - Time-stretch con atempo  │
                    │ - Silencios PCM calculados │
                    └──────────────┬─────────────┘
                                   │
                                   ▼
                    ┌────────────────────────────┐
                    │    Audio Ducking en FFmpeg │
                    │  Voz doblada: 1.0 Volumen  │
                    │  Audio original: 0.15 Vol  │
                    └──────────────┬─────────────┘
                                   │
                                   ▼
                    ┌────────────────────────────┐
                    │    Video Doblado al Pelo   │
                    └────────────────────────────┘
```

### Alineación en memoria sin desfase acumulado

Para resolver el problema del texto largo en español, `autodub` compara la duración del audio sintetizado contra la ventana de tiempo original en inglés.

Si la frase en español dura más que la original, le aplica un filtro de `atempo` con FFmpeg para acelerar ligeramente la reproducción (ajustado entre 1.0x y 1.75x) de forma que encaje dentro del espacio disponible sin que la voz se deforme ni suene como una ardilla.

En lugar de lanzar cientos de procesos pesados de FFmpeg para pegar pedacito por pedacito, `autodub` decodifica las muestras PCM directamente en la memoria RAM. Coloca cada segmento de voz en el byte exacto que le corresponde y rellena las pausas con silencio digital puro. Con esto se eliminan por completo los desfases acumulados en videos largos.

### Preservación de ambiente con audio ducking

Para que el video no pierda vida, `autodub` utiliza un filtro de ducking en FFmpeg:

- Cuando nadie está hablando, el audio original suena a su volumen normal.
- Cuando la voz doblada en español entra en acción, el audio de fondo se atenúa automáticamente al 15% (`--bg-volume 0.15`).

Así se mantienen la música de fondo, los efectos y el tono general del creador sonando limpiecitos por debajo del doblaje.

### Ejecución en CPU local y voces neuronales

Por defecto, `autodub` corre con `faster-whisper` cuantizado en int8 para CPU y sintetiza la voz localmente con `piper-tts`. Corre completamente desconectado sin mandar nada a servidores externos.

Para videos donde queremos voces más expresivas y conversacionales, le agregué la opción `--engine edge-tts`. Con esto se conecta a las voces neuronales de Microsoft, permitiendo elegir acentos específicos en español como `es-ES-AlvaroNeural`, `es-ES-ElviraNeural` o `es-MX-DaliaNeural`.

---

## 3. Uso en la terminal

El flujo de trabajo es un solo comando:

```sh
# Doblar un video de YouTube usando el modelo local Piper en 4 hilos de CPU
./autodub.sh -t 4 "https://www.youtube.com/watch?v=EXAMPLE_ID"

# Doblar con voces neuronales en español latino
./autodub.sh --engine edge-tts --voice es-MX-DaliaNeural -t 4 "https://www.youtube.com/watch?v=EXAMPLE_ID"

# Generar un contenedor MKV con pistas de audio intercambiables (inglés y español)
./autodub.sh --dual-audio /ruta/al/video.mp4
```

Ahora, cuando pillo un video interesante durante el día, le tiro un comando rápido y en unos minutos lo tenemos listo para verlo juntos en el sofá sin tener que clavarnos a leer subtítulos.

El código fuente, manual de instalación y pruebas están disponibles en GitHub: [**`github.com/riccivr/autodub`**](https://github.com/riccivr/autodub).
