# La dualidad de chambear en la nube y tirar código en C99

*Publicado: 9 de septiembre de 2026. Categoría: Carrera & Sistemas. Tiempo de lectura: ~5 min*
*Etiquetas: Carrera, C99, Cloud, TypeScript, PHP, Arquitectura, Reflexiones*

---

Casi toda mi vida profesional en la industria del software ha estado metida de lleno en el mundo del desarrollo web y la infraestructura cloud.

Empecé echando código en PHP y armando aplicaciones con Laravel, lidiando con bases de datos relacionales y sacando lógica de negocio para producción. Con el tiempo, mi día a día fue migrando hacia TypeScript, Node, AWS, arquitecturas serverless y microservicios orientados a eventos.

Pero cuando termino la jornada de trabajo, apago la máquina de la oficina y abro una terminal para programar por puro gusto, mi cerebro me pide algo totalmente distinto. Me pongo a escribir herramientas en C99, armar filtros de streams en POSIX, inventar con hardware embebido y destripar formatos binarios.

Durante mucho tiempo mantuve esa parte bien calladita y guardada para mí. Ahora que este blog y mi página están atiborrados de mis proyectos personales de bajo nivel, me puse a reflexionar sobre lo que eso significa.

---

## 1. Dos formas opuestas de pensar

Trabajar en ingeniería cloud y programar en C a bajo nivel te exigen modelos mentales completamente contrarios.

En la nube, tu trabajo es orquestar abstracciones. Te pasas el día pegando servicios de AWS, definiendo tipos e interfaces en TypeScript, cuadrando rutas de APIs y resolviendo árboles de dependencias. La meta es sacar funcionalidad rápido y que no se caiga. Si una petición HTTP tarda 80 milisegundos en responder, todo el mundo celebra que va volando.

En C99 y en sistemas embebidos, no hay colchón que te salve. No tienes garbage collector, no tienes runtime ni frameworks que te resuelvan la vida. Te toca estar pendiente de:

- El layout exacto de la memoria y los límites de cada buffer.
- Las llamadas al sistema en POSIX y el ciclo de vida de los descriptores de archivo.
- Las líneas de caché y el costo real de cada ciclo de CPU.
- Dejar los binarios diminutos y con cero dependencias externas.

Cambiar de un chip a otro todos los días te hace ver la computación desde los dos extremos de la cuerda.

---

## 2. El hobby que siempre mantuve guardado

Por años mantuve estos dos mundos completamente separados, como si fueran dos personas distintas.

Mi currículum, mi perfil de LinkedIn y mi presencia profesional mostraban al ingeniero pragmático que resuelve en la nube. Resaltaba mi experiencia con PHP, Laravel, TypeScript, bases de datos SQL y pipelines en AWS.

Mis proyectos en C99, mis filtros difusos como [`approx`](https://github.com/riccivr/approx), formateadores como [`unipaste`](https://github.com/riccivr/unipaste) o motores de archivo como [`gitcrawl`](https://github.com/riccivr/gitcrawl) se quedaban en carpetas locales o repositorios escondidos en GitHub.

Hace poco decidí rediseñar esta web personal. En vez de montar la típica página corporativa aburrida con cuatro logos genéricos, me provocó documentar los experimentos y las herramientas de sistemas que de verdad me apasiona construir. El resultado es que la página principal y el blog quedaron repletos de código en C99, estilos CRT y plomería POSIX.

---

## 3. ¿Esto va a confundir a los reclutadores?

Al ver todo esto publicado, me entró una duda honesta: ¿será que esto confunde a los reclutadores o me hace perder oportunidades de trabajo?

Cuando una empresa o un reclutador busca un Senior Full-Stack o un Ingeniero Cloud, esperan ver lo de siempre: React, Node, Laravel, Docker, microservicios o certificaciones de AWS.

Si caen en esta web, se topan de frente con structs en C99, punteros, manejo manual de memoria y artículos sobre los objetos internos de Git. Eso abre varias preguntas:

- ¿Pensará un reclutador que solo me interesa trabajar en sistemas embebidos o drivers?
- ¿Se confundirán los filtros automáticos de recursos humanos al no ver el perfil estándar empaquetado?
- ¿Tener una web llena de proyectos de bajo nivel me quitará oportunidades en el mundo web y cloud?

En una industria donde la gente suele encasillarse en etiquetas súper cuadradas, mostrar dos facetas tan distintas puede parecer raro desde afuera.

---

## 4. Por qué el bajo nivel te hace mejor ingeniero en la nube

A pesar de ese riesgo, estoy convencido de que entender cómo funcionan las tripas del sistema te convierte en un ingeniero cloud mil veces más sólido.

Los runtimes de alto nivel no eliminan la complejidad de la máquina, solo la esconden debajo de la alfombra hasta que algo explota en producción.

Cuando un proceso de Node se queda sin memoria en un contenedor, o una función serverless se traba por agotamiento de sockets bajo mucho tráfico, no resuelves nada metiendo más librerías. Toca entender cómo el sistema operativo gestiona las páginas de memoria, los buffers de red y los eventos de I/O.

Tirar código en C99 y trastear con microcontroladores te mantiene esa intuición afilada:

1. **Cero magia.** Sabes exactamente qué está haciendo el runtime por debajo porque ya has tenido que implementar esas estructuras de datos a mano.
2. **Consciencia de recursos.** Cuando te acostumbras a hacer que un programa quepa en kilobytes de RAM, escribes servicios cloud mucho más ligeros y eficientes por instinto.
3. **Depuración sin pánico.** Si una librería de alto nivel falla con un error críptico, no te asusta leer el código en C de los bindings o tirarle un `strace` al proceso para ver qué está pasando.

Hubiese sido más seguro dejar mi web con un perfil estándar y corporativo. Pero este blog es un registro honesto de cómo pienso, cómo programo y lo que me gusta construir.
