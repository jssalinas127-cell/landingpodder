/* ---- questions.js ---- */
/* =========================================================================
   THE MANAGEMENT LAB — PPO (Perfil Político Organizacional)
   Banco de preguntas — transcrito verbatim de "Especificación maestra V1"
   (TML_Autodiagnostico_Habilidad_Politica_Especificacion_Maestra_V1.docx,
   nombre de archivo histórico del documento fuente, sin cambios),
   con la clave real de scoring situacional integrada desde
   "TML_Clave_Scoring_Tags_Senales_Claude_V1.docx" (sección 3).

   Reglas seguidas al pie de la letra de esas especificaciones:
   - 36 preguntas, orden fijo, tal como en la sección 5 del doc maestro. No
     se randomiza ni se cambia el texto de ninguna pregunta.
   - No mostrar dimensión, tipo de pregunta ni encabezados internos al usuario.
   - Preguntas 8-9 y 30-31 permanecen adyacentes (ya lo estaban en el orden).
   - Tres formatos: 'orientacion' (escala bipolar 1-10), 'frecuencia'
     (conducta/autorreporte, escala Likert de 5-6 puntos), 'situacional' (A-D).
   - Situacional: escala 0-4 por opción (score), más un raw tag interpretativo
     por opción (describe la estrategia elegida, nunca una conclusión sobre
     la persona). Clave cargada verbatim desde el documento complementario.
     Q31-D es N/A para score (optOut): no reportar adversario no equivale ni
     a competencia ni a incompetencia.
   - dim: array de una o dos dimensiones. Cuando hay dos (preguntas 7, 13,
     18, 23, 26, 31), la primera dimensión listada es la que recibe el
     puntaje (score primario); la segunda es señal secundaria que solo
     alimenta patrones/tags interpretativos, nunca puntos — confirmado
     verbatim en la sección 4 del documento complementario.
   ========================================================================= */

// Códigos cortos de dimensión (uso interno, nunca mostrados al usuario)
// RP = Relación con la política, P = Protección, O = Objetivo,
// D1 = Desempeño, D2 = Destreza, E = Entendimiento del poder, R = Relaciones

const QUESTIONS = [

{id:1, format:'orientacion', dim:['RP'], variable:'Relevancia/intencionalidad política',
 text:'¿Dónde te ubicarías entre estas dos posiciones?',
 left:{value:1, text:'La política organizacional distrae de lo verdaderamente importante: hacer bien el trabajo.'},
 right:{value:10, text:'Gestionar deliberadamente mi posición dentro de la organización es parte de hacer bien mi trabajo.'}},

{id:2, format:'frecuencia', dim:['D1'], variable:'Impacto y consistencia de resultados',
 text:'En los últimos doce meses, ¿con qué frecuencia puedes señalar resultados concretos de tu trabajo que hayan producido un impacto relevante para la organización —ingresos, ahorro, crecimiento, reducción de riesgo, productividad u otro resultado importante—?',
 options:[
   {letter:'A', t:'Nunca', v:1},
   {letter:'B', t:'En una ocasión', v:2},
   {letter:'C', t:'En algunas ocasiones', v:3},
   {letter:'D', t:'Frecuentemente', v:4},
   {letter:'E', t:'De manera consistente', v:5}]},

{id:3, format:'situacional', dim:['P'], variable:'Detección de patrones/intención',
 text:'Un colega cuestiona repetidamente tus propuestas en reuniones, pide información adicional y plantea alternativas. ¿Cuál sería tu primera reacción?',
 options:[
   {letter:'A', t:'Asumiría que tenemos diferencias profesionales hasta encontrar evidencia de que hay algo más.', score:2, tag:'PRESUNCION_DIFERENCIA_PROFESIONAL'},
   {letter:'B', t:'Observaría si existe un patrón: cuándo lo hace, frente a quién y qué efecto produce.', score:4, tag:'OBSERVA_PATRON_POLITICO'},
   {letter:'C', t:'Hablaría directamente con él para evitar que la situación deteriore la relación.', score:3, tag:'INTERVIENE_RELACION_TEMPRANO'},
   {letter:'D', t:'Empezaría a preparar mejor mis propuestas para reducir los espacios que tiene para cuestionarlas.', score:2, tag:'RESPONDE_POLITICA_CON_FORTALEZA_TECNICA'}]},

{id:4, format:'frecuencia', dim:['R'], variable:'Amplitud/transversalidad de red interna',
 text:'Pensando en las personas con las que tienes una relación profesional de confianza, ¿qué tan extendida está tu red más allá de tu jefe, tus pares inmediatos y tu propia área?',
 options:[
   {letter:'A', t:'Casi nada', v:1},
   {letter:'B', t:'Poco', v:2},
   {letter:'C', t:'Moderadamente', v:3},
   {letter:'D', t:'Bastante', v:4},
   {letter:'E', t:'Muy extendida', v:5}],
 tag:'RED_INTERNA'},

{id:5, format:'situacional', dim:['E'], variable:'Fuentes y uso del poder: autoridad, influencia, expertise, acceso',
 text:'Necesitas destrabar rápidamente una decisión importante. Solo puedes buscar inicialmente a una de estas personas. ¿A quién tenderías a acudir?',
 options:[
   {letter:'A', t:'Al director responsable formalmente del tema, aunque tienes poca relación con él.', score:3, tag:'RECURRE_AUTORIDAD_FORMAL'},
   {letter:'B', t:'A una gerente que no participa formalmente en la decisión, pero suele ser consultada por varios de quienes sí deciden.', score:4, tag:'RECURRE_INFLUENCIA_INFORMAL'},
   {letter:'C', t:'A un colega con mucha experiencia en el tema y que puede ayudarte a fortalecer los argumentos de la propuesta.', score:2, tag:'RECURRE_EXPERTISE'},
   {letter:'D', t:'A tu jefe, que tiene buena relación con el director y podría ayudarte a abrir la conversación.', score:4, tag:'RECURRE_ACCESO_INTERMEDIADO'}]},

{id:6, format:'orientacion', dim:['D2'], variable:'Ambición',
 text:'¿Dónde te ubicarías entre estas dos posiciones?',
 left:{value:1, text:'Mi prioridad profesional es hacer un trabajo que me resulte interesante y satisfactorio; avanzar en posición o influencia es secundario.'},
 right:{value:10, text:'Tengo una ambición clara de aumentar mi responsabilidad, influencia o impacto y estoy dispuesto a trabajar deliberadamente para conseguirlo.'},
 tag:'AMBICION'},

{id:7, format:'situacional', dim:['P','D1'], variable:'Respuesta a jugada aislada y protección de reconocimiento',
 text:'Un colega presenta ante un directivo una idea en cuyo desarrollo participaste significativamente, sin mencionar tu contribución. Parece ser un episodio aislado. ¿Qué harías?',
 options:[
   {letter:'A', t:'Lo dejaría pasar; reclamar crédito por cada contribución puede perjudicar más de lo que ayuda.', score:1, tag:'CEDE_RECONOCIMIENTO'},
   {letter:'B', t:'Hablaría con él en privado y dejaría claro que espero que mi contribución sea reconocida en adelante.', score:3, tag:'PROTEGE_RECONOCIMIENTO_DIRECTAMENTE'},
   {letter:'C', t:'Buscaría una manera natural de hacer visible mi participación ante las personas relevantes, sin convertir el asunto en una disputa.', score:4, tag:'RECUPERA_VISIBILIDAD_SIN_ESCALAR'},
   {letter:'D', t:'Observaría qué ocurre después antes de decidir si requiere alguna acción.', score:2, tag:'OBSERVA_ANTES_DE_PROTEGER_RECONOCIMIENTO'}]},

{id:8, format:'orientacion', dim:['O'], variable:'Claridad de meta política',
 text:'Si te preguntara ahora mismo qué quieres conseguir políticamente dentro de tu organización durante los próximos 12–24 meses, ¿qué tan clara sería tu respuesta?',
 left:{value:1, text:'No tendría una respuesta concreta.'},
 right:{value:10, text:'Podría describir con bastante precisión qué quiero conseguir.'}},

{id:9, format:'frecuencia', dim:['O'], variable:'Acción deliberada hacia la meta',
 text:'Pensando en ese objetivo, durante los últimos tres meses, ¿con qué frecuencia has realizado acciones deliberadas específicamente orientadas a acercarte a él?',
 dependency:'Debe permanecer inmediatamente después de la pregunta 8.',
 options:[
   {letter:'A', t:'Nunca', v:1},
   {letter:'B', t:'Una vez', v:2},
   {letter:'C', t:'Algunas veces', v:3},
   {letter:'D', t:'Frecuentemente', v:4},
   {letter:'E', t:'Muy frecuentemente', v:5},
   {letter:'F', t:'No tengo un objetivo definido', optOut:true, tag:'OBJETIVO_SIN_DEFINIR'}],
 tag:'OBJETIVO_ACCION'},

{id:10, format:'situacional', dim:['D2'], variable:'Adaptación',
 text:'Un directivo con quien necesitas trabajar valora mensajes breves, decisiones rápidas y posiciones firmes. Tú sueles trabajar mejor explorando alternativas y construyendo consenso. ¿Qué tenderías a hacer?',
 options:[
   {letter:'A', t:'Mantendría mi manera habitual de trabajar; cambiarla demasiado puede hacerme perder autenticidad.', score:1, tag:'PRIORIZA_ESTILO_PROPIO'},
   {letter:'B', t:'Sería considerablemente más breve y categórico con él, aunque no sea mi estilo natural.', score:3, tag:'SOBREADAPTA_ESTILO'},
   {letter:'C', t:'Mantendría mi forma habitual en los asuntos importantes y me adaptaría en los temas de menor importancia.', score:2, tag:'ADAPTACION_SELECTIVA_LIMITADA'},
   {letter:'D', t:'Ajustaría mi forma de interactuar con él siempre que pueda hacerlo sin cambiar el fondo de lo que pienso o quiero conseguir.', score:4, tag:'ADAPTA_FORMA_PRESERVA_FONDO'}]},

{id:11, format:'situacional', dim:['E'], variable:'Dependencia y naturaleza relacional del poder',
 text:'Una persona que antes dependía de ti para acceder a información crítica obtiene una nueva fuente directa y deja de necesitarte. ¿Qué ha ocurrido con la relación de poder entre ustedes?',
 options:[
   {letter:'A', t:'Nada fundamental: el poder depende principalmente de posición, reputación y trayectoria.', score:1, tag:'PODER_COMO_POSICION_REPUTACION'},
   {letter:'B', t:'Tu poder probablemente disminuyó porque se redujo su dependencia de un recurso que controlabas.', score:4, tag:'COMPRENDE_PODER_POR_DEPENDENCIA'},
   {letter:'C', t:'Su poder aumentó únicamente si además obtuvo mayor autoridad formal.', score:0, tag:'EQUIPARA_PODER_CON_AUTORIDAD'},
   {letter:'D', t:'Depende principalmente de la calidad de la relación personal que hayas construido con ella.', score:2, tag:'PODER_COMO_RELACION_PERSONAL'}]},

{id:12, format:'frecuencia', dim:['D1'], variable:'Conocimiento/experiencia diferencial',
 text:'¿Con qué frecuencia buscas desarrollar conocimiento o experiencia que sea simultáneamente difícil de reemplazar y relevante para las prioridades de tu organización?',
 options:[
   {letter:'A', t:'Nunca', v:1},
   {letter:'B', t:'Rara vez', v:2},
   {letter:'C', t:'Algunas veces', v:3},
   {letter:'D', t:'Frecuentemente', v:4},
   {letter:'E', t:'De manera sistemática', v:5}]},

{id:13, format:'situacional', dim:['RP','P'], variable:'Agencia ante una decisión adversa',
 text:'Una decisión que consideras injusta perjudica una iniciativa importante para ti. Después de intentar argumentar tu posición, la decisión se mantiene. ¿Qué se parece más a lo que harías?',
 options:[
   {letter:'A', t:'Continuaría defendiendo mi posición: aceptar la decisión demasiado rápido puede terminar legitimándola.', score:1, tag:'PERSISTE_EN_DISPUTA_DE_JUSTICIA'},
   {letter:'B', t:'Cumpliría la decisión y concentraría mi energía en demostrar con resultados que estaba equivocada.', score:2, tag:'RESPONDE_ADVERSIDAD_CON_RESULTADOS'},
   {letter:'C', t:'Trataría de entender qué intereses y actores produjeron esa decisión y qué puedo hacer para modificar las condiciones hacia adelante.', score:4, tag:'CONVIERTE_ADVERSIDAD_EN_LECTURA_POLITICA'},
   {letter:'D', t:'Buscaría personas que compartan mi lectura para determinar si vale la pena volver a plantear el asunto.', score:3, tag:'BUSCA_COALICION_ANTE_ADVERSIDAD'}]},

{id:14, format:'frecuencia', dim:['D1'], variable:'Visibilidad de resultados y contribución',
 text:'Cuando obtienes un resultado importante, ¿con qué frecuencia te aseguras de que las personas relevantes conozcan el resultado y entiendan tu contribución?',
 options:[
   {letter:'A', t:'Nunca', v:1},
   {letter:'B', t:'Rara vez', v:2},
   {letter:'C', t:'Algunas veces', v:3},
   {letter:'D', t:'Frecuentemente', v:4},
   {letter:'E', t:'Casi siempre', v:5}],
 tag:'VISIBILIDAD'},

{id:15, format:'situacional', dim:['D2'], variable:'Gestión del conflicto',
 text:'Cuando conseguir un resultado importante requiere entrar en conflicto con una persona con la que te interesa mantener una buena relación, ¿qué tiendes a hacer?',
 options:[
   {letter:'A', t:'Busco una alternativa que permita conseguir el resultado sin llevar la relación a un conflicto abierto.', score:2, tag:'EVITA_CONFLICTO_ABIERTO'},
   {letter:'B', t:'Planteo directamente la diferencia y defiendo mi posición, aunque la relación pueda tensionarse.', score:3, tag:'ENTRA_CONFLICTO_DIRECTAMENTE'},
   {letter:'C', t:'Evalúo primero cuánto está en juego antes de decidir si vale la pena asumir el conflicto.', score:4, tag:'SELECCIONA_BATALLAS'},
   {letter:'D', t:'Trato de construir suficiente apoyo alrededor de mi posición antes de plantear abiertamente la diferencia.', score:3, tag:'CONSTRUYE_APOYO_ANTES_CONFLICTO'}]},

{id:16, format:'frecuencia', dim:['R'], variable:'Construcción de relaciones antes de necesitarlas',
 text:'Durante los últimos seis meses, ¿con qué frecuencia has invertido deliberadamente tiempo en desarrollar o mantener una relación profesional importante sin necesitar nada inmediato de esa persona?',
 options:[
   {letter:'A', t:'Nunca', v:1},
   {letter:'B', t:'Una o dos veces', v:2},
   {letter:'C', t:'Algunas veces', v:3},
   {letter:'D', t:'Frecuentemente', v:4},
   {letter:'E', t:'Muy frecuentemente', v:5}],
 tag:'RED_INTERNA'},

{id:17, format:'situacional', dim:['E'], variable:'Lectura de actores, intereses e influencia',
 text:'Quieres impulsar una iniciativa transversal importante. ¿Qué información buscarías primero?',
 options:[
   {letter:'A', t:'Quiénes tienen autoridad formal para aprobarla y cuál es el proceso establecido.', score:2, tag:'MAPEA_PROCESO_FORMAL'},
   {letter:'B', t:'Quiénes pueden aprobarla, bloquearla o modificarla, qué intereses tienen y quién influye sobre ellos.', score:4, tag:'MAPEA_SISTEMA_REAL_DE_DECISION'},
   {letter:'C', t:'Qué áreas se beneficiarán más para construir una argumentación convincente.', score:2, tag:'MAPEA_BENEFICIARIOS'},
   {letter:'D', t:'Quiénes tienen mejor relación con la alta dirección y podrían ayudarte a presentarla.', score:3, tag:'MAPEA_ACCESO_AL_PODER'}]},

{id:18, format:'frecuencia', dim:['P','D2'], variable:'Regulación emocional y deliberación',
 text:'Cuando alguien cuestiona públicamente tu criterio en un asunto que dominas, ¿con qué frecuencia logras decidir deliberadamente si responder, cuándo hacerlo y cómo hacerlo, en lugar de reaccionar en el momento?',
 options:[
   {letter:'A', t:'Nunca', v:1},
   {letter:'B', t:'Rara vez', v:2},
   {letter:'C', t:'Algunas veces', v:3},
   {letter:'D', t:'Frecuentemente', v:4},
   {letter:'E', t:'Casi siempre', v:5}]},

{id:19, format:'situacional', dim:['D1'], variable:'Posicionamiento del desempeño',
 text:'Puedes escoger entre dos proyectos. El primero está muy relacionado con tu experiencia, tiene alta probabilidad de éxito y ocurre principalmente dentro de tu área. El segundo es más incierto, pero es una prioridad de la dirección, involucra varias áreas importantes y tendrá alta exposición. ¿Qué tenderías a hacer?',
 options:[
   {letter:'A', t:'Escoger el primero: construir una trayectoria sólida de resultados es la mejor base para avanzar.', score:2, tag:'PRIORIZA_RESULTADO_SEGURO'},
   {letter:'B', t:'Escoger el segundo: su relevancia y exposición compensan el mayor riesgo.', score:3, tag:'PRIORIZA_EXPOSICION_ESTRATEGICA'},
   {letter:'C', t:'Evaluar cuál de los dos me permite producir mayor valor real para la organización, independientemente de la exposición.', score:3, tag:'PRIORIZA_VALOR_ORGANIZACIONAL'},
   {letter:'D', t:'Evaluar cuál contribuye mejor tanto a las prioridades de la organización como a la posición profesional que quiero construir.', score:4, tag:'INTEGRA_VALOR_Y_POSICIONAMIENTO'}]},

{id:20, format:'orientacion', dim:['RP'], variable:'Realismo organizacional',
 text:'¿Dónde te ubicarías entre estas dos posiciones?',
 left:{value:1, text:'En una organización, las decisiones deberían depender fundamentalmente del mérito, los argumentos y los resultados. Me cuesta aceptar cuando intervienen otros factores.'},
 right:{value:10, text:'Entiendo que, además del mérito y los resultados, las decisiones están naturalmente influidas por intereses, relaciones, percepciones y poder.'}},

{id:21, format:'situacional', dim:['P'], variable:'Respuesta a truco/jugada sucia aislada',
 text:'Descubres que una persona está dando a otros una versión incompleta de una situación que te deja mal parado. ¿Qué tenderías a hacer primero?',
 options:[
   {letter:'A', t:'La confrontaría directamente para detener la situación antes de que se extienda.', score:3, tag:'CONFRONTA_ATAQUE_REPUTACIONAL'},
   {letter:'B', t:'Corregiría la información con las personas relevantes sin entrar en una confrontación personal.', score:3, tag:'CORRIGE_REPUTACION_SIN_CONFRONTAR'},
   {letter:'C', t:'Buscaría entender qué pretende conseguir esa persona antes de decidir cómo responder.', score:4, tag:'DIAGNOSTICA_INTENCION_ANTES_DE_RESPONDER'},
   {letter:'D', t:'Evitaría amplificar el asunto mientras no tenga evidencia de que esté produciendo consecuencias.', score:2, tag:'ESPERA_EVIDENCIA_DE_DANO'}]},

{id:22, format:'situacional', dim:['O'], variable:'Convertir deseo en meta política accionable',
 text:'Una gerente dice: "Quiero que mis ideas tengan más peso en las decisiones de la compañía". ¿Cuál de las siguientes acciones te parecería el mejor siguiente paso?',
 options:[
   {letter:'A', t:'Seguir produciendo propuestas sólidas hasta que su calidad empiece a ser reconocida.', score:1, tag:'CONFIA_INFLUENCIA_AL_DESEMPENO'},
   {letter:'B', t:'Precisar en qué decisiones quiere tener mayor incidencia, quiénes intervienen en ellas y qué tendría que cambiar para lograrlo.', score:4, tag:'CONVIERTE_ASPIRACION_EN_OBJETIVO_POLITICO'},
   {letter:'C', t:'Aumentar su exposición ante la alta dirección para que conozcan mejor sus capacidades.', score:2, tag:'BUSCA_EXPOSICION_SIN_OBJETIVO_ESPECIFICO'},
   {letter:'D', t:'Conversar con su jefe sobre su interés en participar más en decisiones importantes.', score:2, tag:'BUSCA_PATROCINIO_DEL_JEFE'}]},

{id:23, format:'frecuencia', dim:['D2','P'], variable:'Discreción calculada',
 text:'¿Con qué frecuencia evitas compartir información, opiniones o comentarios que pueden ser ciertos, pero cuya divulgación no aporta a tu objetivo y puede tener un costo político?',
 options:[
   {letter:'A', t:'Nunca', v:1},
   {letter:'B', t:'Rara vez', v:2},
   {letter:'C', t:'Algunas veces', v:3},
   {letter:'D', t:'Frecuentemente', v:4},
   {letter:'E', t:'Casi siempre', v:5}]},

{id:24, format:'situacional', dim:['E'], variable:'Alianzas como hipótesis, no como apariencia',
 text:'Dos vicepresidentes parecen tener una relación excelente y apoyarse públicamente. ¿Qué asumirías?',
 options:[
   {letter:'A', t:'Que probablemente forman una alianza que debe incorporarse a cualquier mapa de poder.', score:2, tag:'INFIERE_ALIANZA_POR_APARIENCIA'},
   {letter:'B', t:'Que su buena relación es relevante, pero buscaría evidencia de cómo se comportan cuando sus intereses entran en conflicto.', score:4, tag:'TRATA_ALIANZA_COMO_HIPOTESIS'},
   {letter:'C', t:'Que la relación importa menos que el poder formal que tenga cada uno.', score:1, tag:'PRIORIZA_PODER_FORMAL_SOBRE_RELACIONES'},
   {letter:'D', t:'Que conviene acercarse al más poderoso de los dos antes de intentar entender la relación entre ellos.', score:1, tag:'SE_ACERCA_AL_PODER_SIN_LEER_SISTEMA'}]},

{id:25, format:'situacional', dim:['D1'], variable:'Visibilidad legítima',
 text:'Cuando un proyecto en el que has tenido una contribución importante obtiene buenos resultados, ¿qué ocurre normalmente con el reconocimiento de tu participación?',
 options:[
   {letter:'A', t:'Confío principalmente en que los resultados y las personas que trabajaron conmigo hagan evidente mi contribución.', score:1, tag:'CONFIA_VISIBILIDAD_ESPONTANEA'},
   {letter:'B', t:'Procuro que mi jefe conozca mi contribución, pero rara vez hago algo adicional para darle visibilidad.', score:2, tag:'VISIBILIDAD_LIMITADA_AL_JEFE'},
   {letter:'C', t:'Busco oportunidades naturales para comunicar los resultados y mi contribución a las personas para quienes puede ser relevante.', score:4, tag:'GESTIONA_VISIBILIDAD_RELEVANTE'},
   {letter:'D', t:'Suelo dar mayor protagonismo al resultado y al equipo que a mi contribución individual.', score:2, tag:'PRIORIZA_RECONOCIMIENTO_COLECTIVO'}],
 tag:'VISIBILIDAD'},

{id:26, format:'situacional', dim:['D2','P'], variable:'Conflicto, selección de batalla y capital político',
 text:'En un comité se está por aprobar una decisión con la que estás en fuerte desacuerdo. No es responsabilidad directa de tu área, pero crees que puede tener consecuencias importantes para la compañía. Cuestionarla implicaría enfrentarte a dos personas influyentes que ya han manifestado su apoyo. ¿Qué tenderías a hacer?',
 options:[
   {letter:'A', t:'Plantearía mi desacuerdo en el comité; si considero que el riesgo es importante, es preferible asumir la tensión.', score:3, tag:'CONFRONTA_POR_CONVICCION'},
   {letter:'B', t:'Hablaría primero por separado con algunas de las personas involucradas para entender cuánto espacio existe realmente para modificar la decisión.', score:4, tag:'EXPLORA_ESPACIO_ANTES_DE_CONFRONTAR'},
   {letter:'C', t:'Expresaría mis reservas, pero evitaría convertirme en quien lidere la oposición a una decisión que no corresponde directamente a mi área.', score:2, tag:'LIMITA_CONFLICTO_A_AMBITO_FORMAL'},
   {letter:'D', t:'Buscaría primero a otras personas que compartan mi preocupación antes de decidir si vale la pena enfrentar la decisión.', score:4, tag:'CONSTRUYE_COALICION_ANTES_DE_CONFRONTAR'}]},

{id:27, format:'frecuencia', dim:['E'], variable:'Intereses y prioridades de actores',
 text:'Durante los últimos seis meses, ¿con qué frecuencia has tratado deliberadamente de entender cuáles son las prioridades, intereses o preocupaciones de las personas que pueden afectar tus objetivos?',
 options:[
   {letter:'A', t:'Nunca', v:1},
   {letter:'B', t:'Rara vez', v:2},
   {letter:'C', t:'Algunas veces', v:3},
   {letter:'D', t:'Frecuentemente', v:4},
   {letter:'E', t:'De manera sistemática', v:5}]},

{id:28, format:'situacional', dim:['D2'], variable:'Expresión de autoridad',
 text:'Durante una reunión tensa, alguien te interrumpe varias veces y trata de llevar la conversación hacia otro tema. ¿Qué tenderías a hacer?',
 options:[
   {letter:'A', t:'Elevaría ligeramente mi energía y firmeza para recuperar el control de la conversación.', score:3, tag:'RECUPERA_CONTROL_CON_ENERGIA'},
   {letter:'B', t:'Esperaría un espacio y retomaría con calma el punto que necesito dejar claro.', score:3, tag:'RECUPERA_CONTROL_CON_COMPOSTURA'},
   {letter:'C', t:'Le señalaría directamente que necesito terminar mi argumento antes de continuar.', score:4, tag:'MARCA_LIMITE_CON_AUTORIDAD'},
   {letter:'D', t:'Haría una pregunta que obligue al grupo a volver al asunto central.', score:4, tag:'REDIRIGE_GRUPO_CON_PREGUNTA'}]},

{id:29, format:'frecuencia', dim:['P'], variable:'Feedback y autocorrección',
 text:'En los últimos seis meses, ¿con qué frecuencia has pedido feedback a alguien de confianza sobre cómo estás siendo percibido por personas relevantes de tu organización?',
 options:[
   {letter:'A', t:'Nunca', v:1},
   {letter:'B', t:'Una vez', v:2},
   {letter:'C', t:'Algunas veces', v:3},
   {letter:'D', t:'Frecuentemente', v:4},
   {letter:'E', t:'Muy frecuentemente', v:5}]},

{id:30, format:'situacional', dim:['R'], variable:'Gestión de adversarios',
 text:'Una persona con la que tienes una relación difícil empieza a bloquear una iniciativa importante para ti. ¿Qué tenderías a hacer primero?',
 options:[
   {letter:'A', t:'Fortalecería el apoyo de otras personas para reducir su capacidad de bloquearla.', score:3, tag:'CONTIENE_ADVERSARIO_CON_APOYO'},
   {letter:'B', t:'Trataría de entender qué quiere conseguir, por qué mi iniciativa lo afecta y si existe una posibilidad de alinear intereses.', score:4, tag:'BUSCA_ALINEAR_INTERESES_ADVERSARIO'},
   {letter:'C', t:'Hablaría directamente con ella para poner sobre la mesa el problema y buscar un acuerdo.', score:4, tag:'ABORDA_ADVERSARIO_DIRECTAMENTE'},
   {letter:'D', t:'Escalaría el asunto si su comportamiento está perjudicando una prioridad legítima de la organización.', score:2, tag:'ESCALA_BLOQUEO'}]},

{id:31, format:'situacional', dim:['R','E'], variable:'Lectura del adversario',
 text:'Piensa en una persona que actualmente dificulta un objetivo profesional importante para ti. ¿Cuál de estas afirmaciones se acerca más a tu situación?',
 dependency:'Debe permanecer inmediatamente después de la pregunta 30.',
 options:[
   {letter:'A', t:'Tengo claro qué quiere, por qué se opone y qué podría modificar su posición.', score:4, tag:'COMPRENDE_ADVERSARIO'},
   {letter:'B', t:'Entiendo parcialmente sus motivos, pero no tengo una estrategia clara para manejar la relación.', score:2, tag:'LECTURA_PARCIAL_ADVERSARIO'},
   {letter:'C', t:'Sé que se opone, pero me cuesta entender qué busca realmente.', score:1, tag:'ADVERSARIO_NO_COMPRENDIDO'},
   {letter:'D', t:'No identifico actualmente a ninguna persona que esté interfiriendo significativamente con un objetivo profesional importante.', score:null, optOut:true, tag:'SIN_ADVERSARIO_IDENTIFICADO'}]},

{id:32, format:'frecuencia', dim:['E'], variable:'Construcción de relaciones con actores de poder',
 text:'En los últimos seis meses, ¿con qué frecuencia has hecho esfuerzos deliberados por desarrollar o fortalecer relaciones con personas que tienen poder o influencia relevante en tu organización?',
 options:[
   {letter:'A', t:'Nunca', v:1},
   {letter:'B', t:'Una o dos veces', v:2},
   {letter:'C', t:'Algunas veces', v:3},
   {letter:'D', t:'Frecuentemente', v:4},
   {letter:'E', t:'De manera sistemática', v:5}],
 tag:'RELACION_ACTORES_PODER'},

{id:33, format:'frecuencia', dim:['RP'], variable:'Participación política deliberada',
 text:'Durante los últimos seis meses, ¿con qué frecuencia has dedicado tiempo deliberadamente a fortalecer tu posición dentro de la organización, más allá de cumplir bien con tus responsabilidades?',
 options:[
   {letter:'A', t:'Nunca', v:1},
   {letter:'B', t:'Una o dos veces', v:2},
   {letter:'C', t:'Algunas veces', v:3},
   {letter:'D', t:'Frecuentemente', v:4},
   {letter:'E', t:'Muy frecuentemente', v:5}]},

{id:34, format:'situacional', dim:['D2'], variable:'Expresión de autoridad, síntesis y adaptación',
 text:'Debes presentar una recomendación difícil ante personas considerablemente más senior que tú. ¿Qué describe mejor tu comportamiento habitual?',
 options:[
   {letter:'A', t:'Procuro explicar ampliamente mi razonamiento para demostrar que la recomendación está bien sustentada.', score:2, tag:'COMPENSA_JERARQUIA_CON_EXPLICACION'},
   {letter:'B', t:'Expreso la recomendación de forma breve y clara, sustento los puntos esenciales y manejo las preguntas a medida que aparecen.', score:3, tag:'PROYECTA_AUTORIDAD_CON_SINTESIS'},
   {letter:'C', t:'Introduzco primero el contexto y observo las reacciones antes de comprometerme con una recomendación demasiado categórica.', score:3, tag:'LEE_REACCIONES_ANTES_DE_POSICIONARSE'},
   {letter:'D', t:'Adapto el grado de firmeza y detalle dependiendo de quiénes estén presentes y de cómo evolucione la conversación.', score:4, tag:'ADAPTA_PRESENCIA_AL_CONTEXTO'}]},

{id:35, format:'orientacion', dim:['RP'], variable:'Legitimidad moral de la política',
 text:'¿Dónde te ubicarías entre estas dos posiciones?',
 left:{value:1, text:'La política organizacional implica, en buena medida, adular, manipular o actuar de maneras con las que no me siento cómodo.'},
 right:{value:10, text:'Es posible desenvolverse políticamente, construir poder e influir en otros sin comprometer la integridad personal.'},
 tag:'LEGITIMIDAD_POLITICA'},

{id:36, format:'frecuencia', dim:['R'], variable:'Red profesional externa',
 text:'Durante los últimos seis meses, ¿con qué frecuencia has desarrollado o fortalecido deliberadamente relaciones profesionales relevantes fuera de tu organización?',
 options:[
   {letter:'A', t:'Nunca', v:1},
   {letter:'B', t:'Una o dos veces', v:2},
   {letter:'C', t:'Algunas veces', v:3},
   {letter:'D', t:'Frecuentemente', v:4},
   {letter:'E', t:'Muy frecuentemente', v:5}],
 tag:'RED_EXTERNA'}

];

// Nombres genéricos de dimensión para mostrar en el radar (decisión de Felipe:
// "punto medio" — nombre visible, sin explicación de qué mide ni marca PODDER).
const DIM_NAMES = {
  RP:'Relación con la política',
  P:'Protección',
  O:'Objetivo',
  D1:'Desempeño',
  D2:'Destreza',
  E:'Entendimiento del poder',
  R:'Relaciones'
};
const DIM_ORDER = ['RP','P','O','D1','D2','E','R'];
