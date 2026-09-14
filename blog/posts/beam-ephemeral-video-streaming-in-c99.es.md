# beam: streaming de videos efímeros en C99 con peticiones Range y túneles SSH

*Publicado: 14 de septiembre de 2026. Categoría: Sistemas & Redes. Tiempo de lectura: ~6 min*
*Etiquetas: C99, beam, HTTP, Redes, POSIX, Video*

---

En mi artículo anterior expliqué cómo construí [`autodub`](https://riccivr.github.io/blog/autodub-automating-video-dubbing-to-spanish.html) para transcribir, traducir y doblar videos en inglés al español y mandárselos a mi novia, ahorrándole el cansancio de leer subtítulos después de trabajar todo el día frente a una pantalla.

Pero apenas empecé a usar la herramienta en la vida real, me di cuenta de que tenía resuelta solo la mitad del problema.

El pipeline de `autodub` me dejaba un archivo `.mp4` de 300 o 500 MB impecable en mi disco duro. La pregunta inmediata era: ¿cómo se lo hago llegar a ella de una vez y sin fricción?

Las opciones convencionales son todas un fastidio:

- **WhatsApp o Telegram:** comprimen el video hasta volverlo una sopa de píxeles, tardan un siglo subiendo archivos pesados o imponen límites de tamaño arbitrarios.
- **Google Drive, Dropbox o WeTransfer:** implican abrir el navegador, esperar que suba el archivo completo, copiar un enlace y lidiar con almacenamiento en la nube. Peor todavía: Google Drive se queda "procesando el video" durante diez o quince minutos antes de permitir streaming web, obligando a la otra persona a descargar el archivo entero antes de poder reproducir el primer segundo.
- **Nginx, S3 o CloudFront:** levantar un servidor web público o configurar buckets para compartir videos personales de 20 minutos es matar moscas a cañonazos, cuesta dinero y requiere mantenimiento innecesario.

Yo no quería subir nada a la nube. El video ya estaba en mi computadora. Lo único que quería era exponer ese archivo local mediante un enlace web efímero para que ella lo abriera en Safari o Chrome desde su teléfono o laptop, le diera play y comenzara a sonar de inmediato en el reproductor nativo del navegador, con capacidad de adelantar o atrasar la reproducción (seek), y que cuando terminara o pasaran unas horas, el servidor se apagara solo.

Para resolver esto escribí [**`beam`**](https://github.com/riccivr/beam): un servidor HTTP mínimo en C99 puro diseñado para compartir archivos locales mediante enlaces temporales, streaming con peticiones Range y túneles HTTPS automáticos.

---

## 1. El reproductor nativo y las peticiones HTTP Range (206)

Cuando abres un video en un navegador móvil como Safari en iOS o Chrome en Android, el navegador no hace una petición `GET` normal para bajarse el archivo completo de un solo golpe.

Los reproductores modernos dependen del estándar **HTTP Range Requests (RFC 7233)**:

```
Navegador (Cliente)                              beam (Servidor C99)
       │                                                 │
       │─── GET /token (Range: bytes=0-1048575) ────────>│
       │                                                 │ [Lee primeros bytes]
       │<── 206 Partial Content (Content-Range: 0-...) ──│
       │                                                 │
  [Play inmediato]                                       │
       │                                                 │
  [Usuario adelanta al min 15:30]                        │
       │─── GET /token (Range: bytes=35684000-) ────────>│
       │                                                 │ [sendfile() en offset]
       │<── 206 Partial Content (Content-Range: ...) ────│
```

1. El navegador solicita primero unos pocos kilobytes o megabytes para inspeccionar los metadatos del contenedor (`Range: bytes=0-1048575`).
2. Comprueba si el servidor soporta rangos verificando la cabecera `Accept-Ranges: bytes`.
3. Si el usuario arrastra la barra de reproducción hasta la mitad del video, el cliente cancela la descarga actual e inmediatamente dispara una nueva petición con el offset exacto: `Range: bytes=35684000-`.

Si el servidor responde con un simple `200 OK` y empieza a transmitir el archivo desde el byte 0, el reproductor entra en pánico: o bloquea la barra de desplazamiento obligando al usuario a esperar que baje todo el video, o sencillamente se queda en negro.

En `beam` implementé un parser estricto de peticiones Range en C99. Soporta:

- **Rangos abiertos:** `Range: bytes=1024-` (desde el byte 1024 hasta el final del archivo).
- **Rangos cerrados:** `Range: bytes=0-499` (los primeros 500 bytes exactos).
- **Rangos de sufijo:** `Range: bytes=-1000` (los últimos 1000 bytes del archivo).
- **Validación de límites:** si el offset solicitado supera el tamaño real del archivo, responde de inmediato con `416 Range Not Satisfiable` y la cabecera `Content-Range: bytes */TOTAL`.

Al responder con `206 Partial Content` y la cabecera `Content-Disposition: inline`, los navegadores abren el archivo directo en sus controles nativos de video y permiten adelantar o retroceder con latencia casi nula.

---

## 2. El problema del átomo moov en archivos MP4

Hay una trampa muy común al hacer streaming de video en la web con archivos MP4.

En el formato contenedor ISO base media (MP4/MOV), los metadatos del video (duración, resolución, códecs y la tabla de muestras temporales) se almacenan en un bloque llamado átomo **`moov`**. Los datos crudos de video y audio se almacenan en el átomo **`mdat`**.

Por defecto, muchos codificadores colocan el átomo `moov` al **final** del archivo, después de todo el bloque `mdat`:

```
MP4 sin optimizar:
[ ftyp ][                     mdat (500 MB)                     ][ moov (1 MB) ]
  ▲                                                                 ▲
  Inicio                                                            Metadatos al final

MP4 con Faststart (+faststart):
[ ftyp ][ moov (1 MB) ][                     mdat (500 MB)                     ]
  ▲        ▲
  Inicio   Metadatos disponibles en el byte 32 -> Play instantáneo
```

Si el átomo `moov` está al final, el navegador no puede calcular la duración del video ni decodificar los fotogramas iniciales sin haber leído primero esos metadatos. En conexiones móviles o a través de túneles, esto causa demoras enormes antes de que comience el video.

`beam` inspecciona automáticamente el encabezado del archivo. Si detecta que se trata de un archivo MP4 y `ffmpeg` está disponible en el sistema, ejecuta un remux ultra rápido en segundo plano utilizando `-movflags +faststart`. Esto reubica el átomo `moov` al inicio del archivo sin reencodear nada. El proceso toma apenas un par de segundos y garantiza que el video comience a reproducirse en menos de 100 milisegundos.

---

## 3. Túnel HTTPS público efímero sin cuentas ni registros

Compartir un servidor web que corre en `localhost:8080` con alguien que está en otra casa suele requerir abrir puertos en el router (imposible bajo CGNAT residencial), configurar DNS dinámico, o registrarse en servicios como ngrok o Cloudflare Tunnels instalando agentes propietarios.

Para `beam` quería una experiencia con cero fricción: un solo flag `-p` que me diera una URL pública segura con HTTPS listo.

Lo resolví aprovechando el reenvío de puertos remoto de OpenSSH contra `localhost.run`:

```c
execlp("ssh", "ssh",
       "-T",
       "-o", "StrictHostKeyChecking=no",
       "-o", "UserKnownHostsFile=/dev/null",
       "-o", "ExitOnForwardFailure=yes",
       "-o", "Compression=no",
       "-o", "IPQoS=throughput",
       "-o", "TCPKeepAlive=yes",
       "-o", "ServerAliveInterval=15",
       "-R", port_spec,
       "nokey@localhost.run",
       (char *)NULL);
```

Detalles técnicos clave de esta implementación:

1. **`Compression=no`:** los archivos multimedia ya están comprimidos (H.264, AAC). Activar compresión en el túnel SSH no ahorra ancho de banda y solo quema ciclos de CPU en vano.
2. **`IPQoS=throughput`:** le indica al kernel de red que priorice el rendimiento de transferencia continua sobre la baja latencia de paquetes interactivos pequeños.
3. **Manejo de caídas:** `beam` vigila el PID del proceso SSH con `waitpid()`. Si la conexión se cae por fluctuaciones de red, reabre el túnel automáticamente y refresca la URL sin interrumpir el servidor HTTP local.
4. **Seguridad mediante tokens:** cada enlace utiliza un identificador hexadecimal aleatorio de 128 bits (32 caracteres) extraído de `/dev/urandom`. Sin el token exacto, nadie en internet puede listar ni adivinar el archivo servido.

---

## 4. Rendimiento con sendfile() y conexiones persistentes

Dado que `beam` fue escrito desde cero en C99 sin frameworks ni dependencias externas, optimicé la ruta crítica de transferencia:

- **Zero-copy con `sendfile()`:** en sistemas Linux, `beam` transfiere los datos directamente desde el descriptor del archivo en disco hacia el socket TCP en el kernel mediante `sendfile()`. Los datos nunca se copian al espacio de usuario en memoria RAM, lo que reduce el consumo de memoria a casi cero y maximiza la velocidad de transferencia.
- **HTTP/1.1 Keep-Alive:** los reproductores de video realizan decenas de peticiones Range consecutivas para cargar segmentos sucesivos de audio y video. `beam` mantiene el socket abierto mediante `Connection: keep-alive` (con un timeout de inactividad de 15 segundos), evitando el costo de múltiples apretones de manos TCP.
- **Código QR en terminal:** incluye un generador de códigos QR integrado en C (`qr.c`) que dibuja la matriz directamente en la consola usando medios bloques Unicode (`▀`, `█`). Si quiero abrir el enlace en mi propio teléfono mientras estoy en la misma red Wi-Fi, solo apunto la cámara a la pantalla.

---

## 5. La tubería UNIX perfecta con autodub

El motivo principal por el que construí `beam` fue integrarlo de forma natural con `autodub` siguiendo la filosofía UNIX: herramientas pequeñas, enfocadas y conectables mediante pipes.

```sh
# Doblar un video de YouTube y compartirlo públicamente de inmediato
autodub "https://www.youtube.com/watch?v=EXAMPLE_ID" | beam -p -c
```

¿Qué ocurre internamente cuando ejecuto ese comando?

```
┌──────────────────────────────────────────────────────────────┐
│ autodub (Python)                                             │
│ 1. Descarga video con yt-dlp                                 │
│ 2. Transcribe con faster-whisper en CPU                      │
│ 3. Traduce texto y sintetiza con Piper TTS                   │
│ 4. Alinea audio en memoria y aplica ducking con FFmpeg       │
│ 5. Imprime en stdout: "Dubbed: /tmp/autodub/video_es.mp4"    │
└──────────────────────────────┬───────────────────────────────┘
                               │ (pipe en tiempo real)
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ beam (C99)                                                   │
│ 1. Muestra el progreso de autodub en la terminal             │
│ 2. Detecta la ruta del video final cuando el proceso termina │
│ 3. Ejecuta faststart con FFmpeg si es necesario              │
│ 4. Abre el túnel reverso SSH (-p)                            │
│ 5. Copia el enlace HTTPS al portapapeles (-c)                │
│ 6. Dibuja el código QR en la consola                         │
│ 7. Sirve el video con peticiones Range hasta que expire      │
└──────────────────────────────────────────────────────────────┘
```

Cuando `autodub` termina su trabajo, `beam` captura la ruta del archivo generado, levanta el servidor, abre el túnel público, copia el enlace al portapapeles del sistema (usando `clipbridge` o `wl-copy`) y me avisa.

Yo solo tengo que pegar el enlace en el chat con mi novia. Ella hace clic en el enlace desde su teléfono, el video comienza a sonar de inmediato en su navegador sin logins ni publicidad, y yo me desentiendo por completo porque a las 5 horas el servidor expira y se apaga solo.

El código fuente en C99, manual de uso y pruebas unitarias están disponibles en GitHub: [**`github.com/riccivr/beam`**](https://github.com/riccivr/beam).
