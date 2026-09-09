# La dualidad de trabajar en la nube y tirar código en C99

*Publicado: 9 de septiembre de 2026. Categoría: Carrera & Sistemas. Tiempo de lectura: ~4 min*
*Etiquetas: Carrera, C99, Cloud, TypeScript, PHP, Arquitectura, Reflexiones*

---

Llevo más de doce años metido de lleno en el mundo del desarrollo de software, la arquitectura distribuida y la infraestructura cloud.

Empecé allá por 2012 en Venezuela, administrando servidores LAMP, optimizando consultas SQL pesadas, automatizando scrapers en la intranet y echando código en PHP y Laravel. Con los años, ese camino me llevó a mudarme a Madrid, diseñar microservicios en BBVA, procesar catálogos gigantes con colas AMQP y Lambdas en Billionhands, y diseñar arquitecturas cloud y funcionalidades de producto con TypeScript, AWS CDK y backends serverless en Enroly.

Ese es el trabajo del día a día. Paga las cuentas, resuelve problemas de negocio reales y aguanta miles de usuarios en producción.

Pero cuando termino la jornada, apago la máquina de la oficina y abro una terminal para programar por puro gusto, mi cerebro me pide algo totalmente distinto. Me pongo a escribir herramientas en C99, armar filtros de streams en POSIX, inventar con hardware embebido y destripar formatos binarios.

Durante mucho tiempo mantuve esa parte bien calladita y guardada para mí. Ahora que este blog y mi página están atiborrados de mis proyectos personales de bajo nivel, me puse a reflexionar sobre lo que eso significa.

---

## 1. Dos formas opuestas de pensar

Trabajar en ingeniería cloud y programar en C a bajo nivel te exigen modelos mentales completamente contrarios.

En la nube, tu trabajo es orquestar abstracciones. Te pasas el día definiendo infraestructura como código en AWS CDK, tipando interfaces en TypeScript, cuadrando colas de mensajes y resolviendo árboles de dependencias. La meta es sacar funcionalidad sólida rápido. Si una petición HTTP tarda 80 milisegundos en responder, todo el mundo celebra que va volando.

En C99 y en sistemas embebidos, no hay colchón que te salve. No tienes garbage collector, no tienes runtime ni frameworks que te resuelvan la vida. Te toca estar pendiente de:

- El layout exacto de la memoria y los límites de cada buffer.
- Las llamadas al sistema en POSIX y el ciclo de vida de los descriptores de archivo.
- Las líneas de caché y el costo real de cada ciclo de CPU.
- Dejar los binarios diminutos y con cero dependencias externas.

Cambiar de un chip a otro todos los días te hace ver la computación desde los dos extremos de la cuerda.

---

## 2. El hobby que siempre mantuve guardado

Por años mantuve estos dos mundos completamente separados, como si fueran dos personas distintas.

Mi currículum, mi perfil de LinkedIn y mi presencia profesional mostraban al desarrollador senior pragmático que resuelve en la nube. Resaltaba mi experiencia con TypeScript, React, Node, AWS CDK, Lambda@Edge y arquitecturas escalables.

Mis utilidades en C99, parsers de streams y experimentos con microcontroladores se quedaban en carpetas locales o repositorios escondidos.

Hace poco decidí rediseñar esta web personal. En vez de montar la típica página corporativa aburrida con cuatro logos genéricos, me provocó documentar los experimentos y las herramientas de sistemas que de verdad me apasiona construir. El resultado es que la página principal y el blog quedaron repletos de código en C99, estilos CRT y plomería POSIX.

---

## 3. ¿Esto va a confundir a los reclutadores?

Al ver todo esto publicado, me entró una duda honesta: ¿será que esto confunde a los reclutadores o me hace perder oportunidades de trabajo?

Cuando una empresa o un reclutador busca un Senior Full-Stack, Staff Engineer o Arquitecto Cloud, esperan ver lo de siempre: React, Node, TypeScript, AWS, Docker, serverless o microservicios.

Si caen en esta web, se topan de frente con structs en C99, punteros, manejo manual de memoria y utilidades de terminal. Eso abre varias preguntas:

- ¿Pensará un reclutador que solo me interesa trabajar en sistemas embebidos o drivers?
- ¿Se confundirán los filtros automáticos de recursos humanos al no ver el perfil estándar empaquetado?
- ¿Tener una web llena de proyectos personales de bajo nivel me quitará oportunidades en el mundo web y cloud?

En una industria donde la gente suele encasillarse en etiquetas súper cuadradas, mostrar dos facetas tan distintas puede parecer raro desde afuera. Hubiese sido más seguro dejar mi web con un perfil estándar y corporativo, pero esta página es un reflejo honesto de lo que realmente me gusta programar cuando nadie me está pagando.
