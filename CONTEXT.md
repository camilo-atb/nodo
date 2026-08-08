# Nodo

Una red de talento donde las personas publican lo que saben hacer, los equipos publican lo que les falta, y un agente conecta ambos lados de forma continua y explicada. Este documento es el glosario: la única definición de cada término del dominio.

## Language

### La red

**Person**:
Participante de la red. Es el único nodo con identidad de sesión.
_Avoid_: usuario, miembro, candidato

**Skill**:
Tag de un vocabulario cerrado. No se crean en runtime.
_Avoid_: tecnología, habilidad, tag

**Need**:
Skill que un Team declara faltante, con prioridad `required` o `nice`.
_Avoid_: requisito, vacante

**Agent**:
Actor de software que participa en la red con identidad propia: aparece en el grafo y en el feed como un participante más. Hay dos, `matchmaker` y `quizmaster`.
_Avoid_: bot, IA, el modelo

**LlmProvider**:
La costura técnica hacia el modelo de lenguaje. Es una sola, compartida por todos los Agent, con una sola credencial. No confundir con Agent: un Agent es un actor del dominio, no una cuenta.
_Avoid_: el agente, la API de IA

**Suggestion**:
Recomendación que un Agent emite sobre un par (Person, Team). Es una *propuesta* de relación, nunca una relación.
_Avoid_: match, recomendación

**Application**:
Solicitud de una Person para integrarse a un Team.
_Avoid_: postulación, candidatura

### Dónde ocurre

**Space**:
Contenedor donde las personas se encuentran para construir algo. Es de tipo `hackathon` —acotado en el tiempo, varios equipos compitiendo— o `project` —abierto, colaborando. Todo Team y toda Idea pertenece a uno.
_Avoid_: evento, comunidad, workspace

**Idea**:
Propuesta de proyecto publicada por una Person. Existe con o sin equipo.
_Avoid_: propuesta, concepto, nota

**Team**:
Grupo que construye un proyecto. Es el vehículo del proyecto: lleva su nombre, su pitch y lo que le falta.
_Avoid_: grupo, squad

**Proyecto**:
No es una entidad. Lo que en conversación se llama «el proyecto» es un Team, o el par Idea + Team cuando la Idea lo engendró. Usar el término preciso.
_Avoid_: siempre — decir Team o Idea

### El tablero

**Board**:
Lienzo colaborativo de un Team, donde su pitch se convierte en un plan. Uno por Team, creado con él.
_Avoid_: pizarra, canvas, sesión

**Note**:
Papelito de texto sobre un Board, con posición, color, votos y reacciones. Nunca «idea»: Idea es otra cosa y es pública.
_Avoid_: idea, tarjeta, card, sticky

### El reto

**Quiz**:
Conjunto de preguntas anclado a los Need de un Team. Se redacta una vez y sirve para varias partidas.
_Avoid_: test, examen, kahoot

**QuizRun**:
Una partida concreta de un Quiz, con sus participantes y su reloj.
_Avoid_: sesión, ronda, juego

**Entry**:
La participación de una Person en un QuizRun. Guarda su puntaje acumulado.
_Avoid_: jugador, participante

### Tiempo real

**Envelope**:
Sobre de un mensaje publicado a un canal. Lleva el evento de dominio, la línea de feed y, si es del canal público, el parche del grafo.
_Avoid_: mensaje, evento, payload

**Efímero**:
Señal que viaja por un canal y no es verdad: sin persistencia, sin orden, sin historial. Un cursor o un arrastre en curso. Lo contrario de estado.
_Avoid_: temporal, volátil

**Marca de agua**:
El último `seq` que Portal asignó a una publicación en un canal. Le dice al cliente qué sobres ya están incluidos en el snapshot que acaba de pedir.
_Avoid_: cursor, offset, watermark
