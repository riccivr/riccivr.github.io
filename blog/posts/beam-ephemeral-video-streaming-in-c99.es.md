# beam: streaming de videos efímeros en C99 con peticiones Range y túneles HTTPS

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

## 3. De túneles SSH inversos a Cloudflare Quick Tunnels

Compartir un servidor local que corre en `localhost:8080` con alguien fuera de tu red local suele ser un rollo: abrir puertos en el router es imposible bajo CGNAT residencial, el DNS dinámico es tedioso, y configurar daemons persistentes exige registrarse y manejar API keys.

En el primer prototipo de `beam`, resolví esto abriendo un túnel SSH inverso contra `localhost.run`:

```c
/* Prototipo inicial: reenvío de puertos remoto con OpenSSH */
execlp("ssh", "ssh",
       "-T",
       "-o", "StrictHostKeyChecking=no",
       "-o", "UserKnownHostsFile=/dev/null",
       "-o", "ExitOnForwardFailure=yes",
       "-o", "Compression=no",
       "-o", "IPQoS=throughput",
       "-R", port_spec,
       "nokey@localhost.run",
       (char *)NULL);
```

Aunque funcionaba como prueba de concepto, las pruebas en redes celulares revelaron dos problemas serios de arquitectura:

1. **TCP-over-TCP y Head-of-Line Blocking:** Encapsular tráfico HTTP sobre una conexión TCP de SSH provocaba caídas brutales de rendimiento ante la menor pérdida de paquetes.
2. **Cabeceras fragmentadas por latencia:** En conexiones móviles con alta latencia, SSH dividía la petición HTTP en múltiples paquetes. Si el servidor llamaba a `recv()` y recibía únicamente `GET /token HTTP/1.1` antes de que la cabecera `Range:` llegara en el siguiente segmento TCP, `beam` asumía que era una petición sin rango y devolvía un `200 OK` completo desde el byte 0, congelando el reproductor.

Para solucionar esto de raíz, reemplacé el reenvío por SSH por **Cloudflare Quick Tunnels** (`cloudflared`):

```c
/* Implementación actual: Cloudflare Quick Tunnel sin cuentas */
snprintf(origin, sizeof(origin), "http://127.0.0.1:%d", local_port);
bin = getenv("BEAM_TUNNEL_BIN");
if (!bin || !bin[0])
    bin = "cloudflared";
execlp(bin, bin, "tunnel", "--url", origin, "--no-autoupdate", (char *)NULL);
```

Ventajas clave de este cambio:

- **Sin encapsulación SSH:** El tráfico viaja directo desde la red Anycast de Cloudflare hacia el daemon HTTP local. Sin handshakes SSH, sin advertencias de known_hosts y sin bloqueos de TCP sobre TCP.
- **Extracción dinámica de la URL:** `beam` vigila el proceso hijo `cloudflared` mediante una tubería no bloqueante, extrae la URL `https://*.trycloudflare.com` y mantiene el pipe de logs abierto para evitar que `cloudflared` muera por Broken Pipe (SIGPIPE).
- **Propagación en el Edge:** Espera un segundo antes de mostrar el enlace para que las tablas de enrutamiento de Cloudflare se propaguen en el edge antes de que el usuario lo abra.
- **Resiliencia ante caídas:** Si el túnel se cae, `beam` lo levanta de nuevo automáticamente y refresca la URL sin interrumpir las descargas locales.

---

## 4. Rendimiento del sistema: sendfile(), keep-alive y tracking de sesiones Range

Dado que `beam` fue escrito en C99 puro sobre POSIX, optimicé la transmisión para lidiar con las mañas de los reproductores móviles:

### Streaming zero-copy y ajustes de socket
- **Zero-copy con `sendfile(2)`:** En Linux, `beam` transfiere los rangos solicitados directamente desde el descriptor del archivo hacia el socket TCP en el kernel. Los bytes nunca tocan la memoria RAM en espacio de usuario, manteniendo el uso de memoria en unos pocos kilobytes aunque se sirvan videos 4K de varios gigabytes.
- **Ajustes de socket:** Se configuran sockets con `TCP_NODELAY` (desactivando el algoritmo de Nagle para enviar los rangos sin retraso), `TCP_QUICKACK` en Linux para reducir los round-trips de confirmación, y `posix_fadvise(fd, offset, len, POSIX_FADV_SEQUENTIAL)` para forzar lectura anticipada en el page cache del kernel.
- **Conexiones persistentes (`Connection: keep-alive`):** Los reproductores móviles disparan decenas de peticiones Range seguidas. Usar HTTP/1.1 persistente en el mismo socket ahorra el costo de múltiples apretones de manos TCP.
- **Buffer de cabeceras robusto:** Se acumulan bytes hasta encontrar el terminador `\r\n\r\n` con control de tiempo mediante `gettimeofday`. Los bytes sobrantes tras el terminador se conservan para procesar peticiones encoladas (pipelining).

### Manejo de sesiones Range en modo de un solo uso (`-1`)
Un servidor efímero clásico se apaga apenas entrega un archivo completo. Pero los reproductores de video nunca piden el archivo completo de un tirón: hacen decenas de peticiones `206 Partial Content` mientras cargan buffers o el usuario adelanta.

Si `-1` se apagara en la primera petición, el video moriría a los 100 milisegundos.

En `beam`, el flag `-1` cuenta una respuesta Range completada como una sesión de espectador activa. Mientras el reproductor siga pidiendo fragmentos, el servidor sigue vivo. Una vez que todos los workers hijos terminan y expira la ventana de gracia de 2 segundos de keep-alive para clientes inactivos, `beam` se apaga limpiamente.

### Reanudación y controles en vivo
Si cierras `beam` y más tarde quieres volver a compartir el mismo archivo, basta con ejecutar `beam -p -c` (o `beam -r`). Reabre el archivo anterior manteniendo el mismo token, por lo que el enlace ya compartido sigue funcionando.

Además, mientras corre en la consola puedes presionar `[p]` para abrir o reabrir el túnel bajo demanda, `[c]` para copiar el enlace al portapapeles, o `[q]` para salir.

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
