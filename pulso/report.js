/* ---- report.js ---- */
/* =========================================================================
   Generador de reporte — PPO (Perfil Político Organizacional)

   Implementa la sección 9 (estructura del reporte, 5 capas A-E) y sigue al
   pie de la letra las reglas de redacción de la sección 11:
   - No diagnostica rasgos psicológicos ni inventa motivaciones.
   - No llama "buena" ni "mala" a la persona.
   - Prioriza patrones cruzados sobre la simple repetición de puntuaciones.
   - Lenguaje ejecutivo, directo, práctico. Nada de coaching/autoayuda.
   - No moraliza la ambición, el poder, la influencia ni la política.
   - Riesgos expresados como hipótesis ("puede hacer que…", "tiendes a…",
     "el perfil sugiere…"), nunca como verdades absolutas.
   - 2-3 fortalezas, 2-3 vulnerabilidades, máximo 3 prioridades.
   - Nunca menciona scoring, respuestas individuales ni tags internos.

   ⚠️ Este es el GENERADOR LOCAL POR PLANTILLAS acordado para el V1 (sin
   backend todavía). Consume EXCLUSIVAMENTE la salida estructurada de
   engine.js (scores, bandas, patrones) — nunca respuestas crudas — tal
   como exige la sección 10. El payload estructurado que arma
   buildStructuredPayload() está listo para, en el futuro, enviarse a un
   LLM real con el prompt de la sección 11 en lugar de usar estas
   plantillas; cambiar de uno a otro no requiere tocar engine.js.

   ⚠️ La BIBLIOTECA TML DE RECOMENDACIONES (RECOMMENDATION_LIBRARY) expande
   las 7 líneas de la sección 12 del documento maestro en contenido
   completo (qué desarrollar / por qué importa / conducta concreta). Esa
   expansión es un PRIMER BORRADOR mío, no texto aprobado por TML letra
   por letra — queda señalado para revisión de Felipe.
   ========================================================================= */

const DIM_DESCRIPTORS = {
  RP: {
    alta: 'asumes con naturalidad que gestionar tu posición dentro de la organización es parte legítima de tu trabajo, no una distracción de él',
    baja: 'tiendes a ver la política organizacional como algo ajeno a tu trabajo real, lo que puede dejarte fuera de decisiones que sí te afectan'
  },
  P: {
    alta: 'detectas con relativa facilidad cuándo algo tiene un trasfondo político y ajustas tu respuesta en consecuencia',
    baja: 'sueles dar el beneficio de la duda por defecto ante señales ambiguas, lo que puede dejarte expuesto ante maniobras que sí tienen intención política'
  },
  O: {
    alta: 'tienes una imagen razonablemente clara de qué quieres conseguir dentro de la organización',
    baja: 'tu sentido de dirección dentro de la organización todavía es difuso, lo que dificulta enfocar tu energía hacia algo concreto'
  },
  D1: {
    alta: 'produces resultados que generan valor real y consistente para el negocio',
    baja: 'tu contribución no siempre se traduce en resultados claramente diferenciales para la organización'
  },
  D2: {
    alta: 'te desenvuelves con soltura en situaciones que exigen tacto, firmeza o buena lectura del momento',
    baja: 'situaciones que exigen tacto, firmeza o buen timing pueden encontrarte todavía dudando cómo actuar'
  },
  E: {
    alta: 'lees con precisión quién realmente tiene influencia en las decisiones importantes, más allá de lo que indica el organigrama',
    baja: 'tiendes a interpretar el poder de forma bastante literal —el cargo, la posición formal—, lo que puede dejarte en desventaja frente a dinámicas más informales'
  },
  R: {
    alta: 'inviertes de forma genuina en relaciones amplias, mucho antes de necesitarlas',
    baja: 'tu red tiende a ser más reactiva y concentrada en tu círculo inmediato'
  }
};

// Texto por patrón — adaptado de la sección 7 del documento complementario
// ("Patrones cruzados que deben conservarse"), reescrito en segunda persona
// con lenguaje de hipótesis ("puede", "tiende a", "sugiere"), nunca como
// verdad absoluta. Reemplaza íntegramente la lista de la versión anterior.
const PATTERN_TEXT = {
  RESULTADOS_SIN_CAPITAL_RELACIONAL: 'confías fuertemente en que los resultados hablarán por sí solos, lo que puede dejarte con menos respaldo relacional del que tu desempeño amerita',
  RESULTADOS_SIN_VISIBILIDAD: 'el valor que generas no siempre se traduce en visibilidad ante las personas correctas, por lo que parte de tu impacto puede pasar desapercibido',
  LEE_PODER_NO_CONSTRUYE_RELACIONES: 'tiendes a leer bien dónde reside el poder —más allá del organigrama—, pero esa lectura no siempre se convierte en relaciones concretas con quienes lo tienen',
  AMBICION_CON_VULNERABILIDAD_POLITICA: 'tu ambición de crecer es clara, pero puede estar avanzando por delante de tu capacidad de protegerte políticamente',
  AMBICION_CON_RED_INSUFICIENTE: 'el deseo de avanzar parece superar, por ahora, la infraestructura relacional que lo sostendría',
  RELACIONES_SIN_RESPALDO_DE_RESULTADOS: 'cuentas con una red valiosa, pero puede no estar suficientemente respaldada por resultados visibles',
  RESISTENCIA_MORAL_A_LA_POLITICA: 'reconoces que la política organizacional importa, pero pareces sentir cierta resistencia a practicarla de forma activa',
  LEGITIMA_POLITICA_PERO_LA_LEE_POCO: 'estás dispuesto a participar políticamente, pero puede faltarte todavía una lectura más fina de cómo funciona realmente el poder a tu alrededor',
  OBJETIVO_SIN_ACCION: 'tienes claridad sobre lo que quieres conseguir, pero esa claridad no siempre se traduce en acciones concretas y sostenidas',
  IDENTIFICA_PODER_PERO_NO_SE_ACERCA: 'identificas bien dónde está el poder, pero no siempre conviertes esa lectura en relaciones con quienes lo tienen',
  RED_INTERNA_SIN_RED_EXTERNA: 'tu capital relacional está fuertemente concentrado dentro de la organización',
  RED_EXTERNA_SIN_PENETRACION_INTERNA: 'cuentas con una red externa valiosa que todavía no se refleja en una red igual de sólida dentro de la organización',
  CONFRONTA_SIN_SUFICIENTE_LECTURA: 'estás dispuesto a asumir tensión o confrontación cuando algo te importa, pero en varias situaciones similares puede que actúes antes de terminar de leer a los actores, sus intereses o el margen real de maniobra',
  LEE_BIEN_PERO_PUEDE_NO_ACTUAR: 'sueles leer bien el contexto antes de moverte, pero esa misma cautela puede llevarte a evitar batallas que, con esa misma calidad de lectura, valdría la pena dar',
  LECTURA_DE_PODER_SIN_CONDUCTA_EQUIVALENTE: 'en situaciones concretas lees con criterio dónde reside el poder, pero ese mismo criterio no siempre se traduce en el hábito sostenido de indagar activamente los intereses y prioridades de quienes pueden afectar tus objetivos',
  POSICIONAMIENTO_SIN_VISIBILIDAD_CONDUCTUAL: 'cuando la situación lo exige, sabes posicionar bien tus resultados y tu contribución, pero ese criterio no siempre se traduce en el hábito de asegurarte, de forma sostenida, de que las personas relevantes los conozcan',
  OBJETIVO_BIEN_PLANTEADO_SIN_ACCION: 'tu objetivo está bien planteado —tienes claridad y un criterio sólido de cómo convertirlo en algo político y concreto—, pero esa claridad todavía no se traduce en acciones sostenidas hacia él',
  // Nuevo (ronda "síntesis narrativa v2"): único patrón cruzado nuevo
  // autorizado por configurations.js -- reemplaza a IDENTIFICA_PODER_PERO_NO_SE_ACERCA
  // y LEE_PODER_NO_CONSTRUYE_RELACIONES (ver QA_Mapeo_Configuraciones_Narrativas_PODDER.md,
  // sección E). Evidencia: lectura del poder (Q5,Q11,Q17,Q24) alta, SEPARADA
  // de la relación deliberada con actores de poder (Q32) baja.
  LEE_PODER_PERO_NO_SE_ACERCA: 'lees con precisión quién concentra el poder real, pero esa lectura todavía no se traduce en acercarte deliberadamente a esos actores ni en construir relación con ellos'
};

// Títulos DE CARA AL USUARIO para cada patrón — deliberadamente distintos
// de `label` (que es la fórmula interna tipo "X alta + Y baja" usada solo
// para bitácora/depuración). Mostrar la fórmula interna violaría la regla
// de la sección 11: "no menciones... las reglas utilizadas para generar
// el reporte". Estos títulos son encabezados breves, estilo ejecutivo.
const PATTERN_TITLE = {
  RESULTADOS_SIN_CAPITAL_RELACIONAL: 'Resultados que no siempre se traducen en respaldo',
  RESULTADOS_SIN_VISIBILIDAD: 'Impacto que puede pasar desapercibido',
  LEE_PODER_NO_CONSTRUYE_RELACIONES: 'Lectura de poder sin conversión en relaciones',
  AMBICION_CON_VULNERABILIDAD_POLITICA: 'Ambición por delante de tu propia protección',
  AMBICION_CON_RED_INSUFICIENTE: 'Ambición sin suficiente respaldo relacional',
  RELACIONES_SIN_RESPALDO_DE_RESULTADOS: 'Red sólida, resultados menos visibles',
  RESISTENCIA_MORAL_A_LA_POLITICA: 'Resistencia a practicar lo que reconoces necesario',
  LEGITIMA_POLITICA_PERO_LA_LEE_POCO: 'Disposición a participar con lectura de poder aún limitada',
  OBJETIVO_SIN_ACCION: 'Claridad de meta sin acción sostenida',
  IDENTIFICA_PODER_PERO_NO_SE_ACERCA: 'Lectura de poder sin movimiento sobre ella',
  RED_INTERNA_SIN_RED_EXTERNA: 'Red concentrada dentro de la organización',
  RED_EXTERNA_SIN_PENETRACION_INTERNA: 'Red externa fuerte, penetración interna limitada',
  CONFRONTA_SIN_SUFICIENTE_LECTURA: 'Confrontar antes de terminar de leer la situación',
  LEE_BIEN_PERO_PUEDE_NO_ACTUAR: 'Buena lectura que no siempre se convierte en acción',
  LECTURA_DE_PODER_SIN_CONDUCTA_EQUIVALENTE: 'Buen criterio de lectura sin el hábito equivalente',
  POSICIONAMIENTO_SIN_VISIBILIDAD_CONDUCTUAL: 'Sabes posicionarte, pero no siempre lo sostienes',
  OBJETIVO_BIEN_PLANTEADO_SIN_ACCION: 'Un objetivo bien planteado que aún no se mueve',
  LEE_PODER_PERO_NO_SE_ACERCA: 'Lectura de poder sin acercamiento a los actores'
};

// Biblioteca TML de recomendaciones (sección 12), expandida.
// PRIMER BORRADOR — pendiente de aprobación de TML.
const RECOMMENDATION_LIBRARY = {
  VISIBILIDAD_BAJA: {
    title: 'Da visibilidad deliberada a tus resultados',
    why: 'el valor que generas solo se convierte en capital político si las personas correctas lo conocen; sin visibilidad, el reconocimiento queda librado al azar',
    action: 'la próxima vez que cierres algo importante, dedica cinco minutos a decidir quién debería saberlo y cuéntaselo tú mismo, conectándolo con lo que le importa a esa persona'
  },
  RED_INTERNA_BAJA: {
    title: 'Amplía tu red más allá de tu círculo inmediato',
    why: 'una red concentrada en tu jefe, tus pares y tu área te deja dependiente de pocas personas para leer el sistema o conseguir apoyo cuando lo necesitas',
    action: 'durante las próximas cuatro semanas, agenda una conversación breve con alguien de otra área con quien casi no interactúas, sin pedirle nada'
  },
  RED_EXTERNA_BAJA: {
    title: 'Desarrolla relaciones relevantes fuera de la organización',
    why: 'una red puramente interna limita tu perspectiva y tu respaldo el día que decidas moverte o necesites una mirada externa',
    action: 'retoma contacto este mes con una persona de tu red externa, sin una razón transaccional inmediata'
  },
  RELACION_PODER_BAJA: {
    title: 'Construye relación con actores de poder antes de necesitarlos',
    why: 'acercarte a alguien influyente solo cuando necesitas algo de esa persona reduce tu margen de maniobra justo cuando más lo necesitas',
    action: 'identifica a una persona con influencia real sobre tus objetivos y busca una razón legítima para interactuar con ella antes de que se vuelva urgente'
  },
  OBJETIVO_SIN_ACCION: {
    title: 'Convierte tu meta en acciones deliberadas',
    why: 'la claridad sobre lo que quieres conseguir no genera avance por sí sola si no se traduce en pasos concretos y sostenidos',
    action: 'elige una acción pequeña y específica orientada a tu objetivo y prográmala en tu calendario para las próximas dos semanas'
  },
  RESISTENCIA_MORAL_POLITICA: {
    title: 'Revisa tu propia definición de "hacer política"',
    why: 'si asocias la política organizacional únicamente con adular o manipular, es probable que evites comportamientos legítimos —leer intereses, construir relaciones, protegerte— que no tienen nada de deshonesto',
    action: 'la próxima vez que evites una acción política legítima, pregúntate específicamente qué la hace ilegítima antes de descartarla'
  },
  VISIBILIDAD_SIN_RESULTADOS: {
    title: 'Ancla tu visibilidad a resultados verificables',
    why: 'la habilidad política amplifica el impacto de un buen trabajo, pero no puede sustituirlo de forma sostenible',
    action: 'antes de comunicar un logro, verifica que puedas respaldarlo con un resultado concreto y medible, no solo con actividad'
  },
  LECTURA_ANTES_DE_CONFRONTAR: {
    title: 'Completa la lectura antes de asumir la tensión',
    why: 'la disposición a confrontar es un activo, pero si se activa antes de entender bien a los actores, sus intereses o el margen real de maniobra, puede generar un costo relacional mayor al necesario para un resultado incierto',
    action: 'antes de tu próxima confrontación, dedica un momento a identificar qué te falta por entender de la otra parte y qué margen de negociación existe realmente'
  },
  CONVIERTE_LECTURA_EN_ACCION: {
    title: 'Convierte tu buena lectura en movimiento concreto',
    why: 'leer bien una situación política sin actuar sobre esa lectura deja el terreno libre para que otros con peor criterio, pero más disposición a moverse, definan el resultado',
    action: 'la próxima vez que identifiques con claridad que vale la pena dar una batalla, decide de antemano un primer paso concreto antes de que la oportunidad se cierre'
  },
  MAPEA_INTERESES_DE_FORMA_SISTEMATICA: {
    title: 'Convierte tu buena lectura de poder en hábito de indagar intereses',
    why: 'saber leer con criterio una situación de poder puntual no sustituye el hábito sostenido de entender qué priorizan e intereses tienen las personas que pueden afectar tus objetivos',
    action: 'elige a una persona relevante para tus objetivos actuales y dedica una conversación esta semana específicamente a entender sus prioridades, sin pedirle nada más'
  }
};

// Cuando un patrón activo no tiene un tag de recomendación 1:1 en la
// biblioteca de la sección 12, o cuando faltan prioridades y no hay
// patrones suficientes, se recurre a este nudge genérico por dimensión.
// PRIMER BORRADOR — no proviene del documento maestro, requiere revisión.
const FALLBACK_DEV_BY_DIM = {
  RP: { title: 'Trata la política organizacional como parte del trabajo, no como un tema aparte',
        why: 'evitar mentalmente la dimensión política de tu rol no te protege de ella; solo te deja reaccionando en lugar de anticipando',
        action: 'la próxima decisión importante que te sorprenda, pregúntate qué intereses o relaciones pudieron haberla explicado de antemano' },
  P: { title: 'Desarrolla el hábito de leer intención antes de reaccionar',
       why: 'responder de inmediato ante una señal ambigua no deja tiempo para distinguir una diferencia profesional genuina de una maniobra',
       action: 'ante la próxima señal ambigua, espera a observar si se repite un patrón antes de decidir cómo responder' },
  O: { title: 'Precisa qué quieres conseguir en los próximos 12-24 meses',
       why: 'sin un objetivo político concreto, es difícil decidir en qué relaciones, proyectos o conversaciones invertir tu energía',
       action: 'escribe en una frase qué quieres conseguir políticamente este año y qué necesitarías que empezara a ser cierto para lograrlo' },
  D1: { title: 'Conecta tu trabajo con lo que más le importa al negocio ahora mismo',
        why: 'un buen desempeño que no está alineado con las prioridades visibles de la organización captura menos atención de la que merece',
        action: 'la próxima vez que definas tus prioridades, verifica explícitamente cómo se conectan con lo que la dirección está priorizando' },
  D2: { title: 'Practica deliberadamente el ajuste de tono según la situación',
        why: 'la destreza para adaptarte, negociar un conflicto o proyectar autoridad se desarrolla con repetición consciente, no de forma automática',
        action: 'antes de tu próxima conversación difícil, decide de antemano con qué tono y firmeza quieres entrar, en lugar de improvisarlo' },
  E: { title: 'Mapea explícitamente quién influye sobre tus objetivos',
       why: 'sin un mapa de poder explícito, es fácil enfocarse solo en la autoridad formal y perder de vista canales informales que sí deciden',
       action: 'para tu próxima iniciativa importante, escribe quién puede aprobarla, bloquearla o modificarla, más allá del organigrama' },
  R: { title: 'Invierte en relaciones antes de necesitarlas',
       why: 'una red construida solo cuando surge la necesidad rara vez tiene la profundidad o la confianza necesarias en el momento crítico',
       action: 'elige a una persona relevante para tus objetivos futuros y da un paso genuino para conocerla mejor este mes, sin pedirle nada todavía' }
};

// =========================================================================
// ETAPA 2 — Integración de la capa interpretativa (configurations.js) en el
// reporte visible. Todo lo de arriba (DIM_DESCRIPTORS, PATTERN_TEXT,
// PATTERN_TITLE, RECOMMENDATION_LIBRARY, FALLBACK_DEV_BY_DIM,
// PATTERN_TO_RECOMMENDATION) se conserva sin cambios -- PATTERN_TEXT/
// PATTERN_TITLE se siguen usando para los patrones cruzados visibles;
// RECOMMENDATION_LIBRARY/FALLBACK_DEV_BY_DIM/buildPrioridades quedan
// definidos pero ya no se llaman desde buildReport (el reporte visible ya
// no muestra un bloque de prioridades separado, por decisión de esta
// ronda), para no tocar ni reordenar código fuera del alcance de este
// encargo.
//
// Título y texto por CONFIGURACIÓN narrativa (P1-P4, O1-O3,
// DESEMPENO_1-4, DESTREZA_1-6, E1-E3, R1-R4, RP1/RP2A/RP2B/RP3). Mismo
// estilo que PATTERN_TEXT/PATTERN_TITLE: segunda persona, lenguaje de
// hipótesis, nunca "bueno"/"malo", nunca tags ni códigos internos.
//
// P3, P4, DESTREZA_4, DESTREZA_5 y E3 quedan documentados aquí por
// completitud (y como salvaguarda ante un futuro ajuste de la clave real
// del motor V1), pero la auditoría de alcanzabilidad de esta ronda
// (qa_scripts/05_config_reachability.js) confirmó que son estructuralmente
// inalcanzables con la clave real actual -- nunca deberían aparecer en un
// reporte real. Ver el resumen de QA para el detalle.
const CONFIG_TITLE = {
  P1: 'Detecta y se regula con criterio',
  P2: 'Detecta bien, reacciona antes de decidir',
  P3: 'Detección limitada, con autorregulación sólida',
  P4: 'Detección y autorregulación aún por desarrollar',
  O1: 'Objetivo claro y activo',
  O2: 'Objetivo claro sin acción sostenida',
  O3: 'Sentido de dirección aún difuso',
  DESEMPENO_1: 'Resultados con visibilidad',
  DESEMPENO_2: 'Impacto que puede pasar desapercibido',
  DESEMPENO_3: 'Visibilidad por delante de resultados diferenciales',
  DESEMPENO_4: 'Resultados y visibilidad aún por consolidar',
  DESTREZA_1: 'Destreza situacional consistente',
  DESTREZA_2: 'Disposición a confrontar sin selección de batallas',
  DESTREZA_3: 'Adaptación con menor disposición al conflicto',
  DESTREZA_4: 'Destreza situacional aún por desarrollar',
  DESTREZA_5: 'Adaptación con menor autoridad/presencia',
  DESTREZA_6: 'Autoridad con menor adaptación',
  E1: 'Lectura de poder que se traduce en acción',
  E2: 'Comprende el poder, aplicación menos sistemática',
  E3: 'Lectura predominantemente formal del poder',
  R1: 'Red amplia y deliberada',
  R2: 'Red deliberada, todavía poco amplia',
  R3: 'Red amplia, menos deliberada',
  R4: 'Red aún por desarrollar',
  RP1: 'Relación con la política consolidada',
  RP2A: 'Relación con la política con matices',
  RP2B: 'Relación con la política con matices',
  RP3: 'Mirada centrada en el mérito'
};

const CONFIG_TEXT = {
  P1: 'detectas cuando algo tiene un trasfondo político y sueles decidir de forma deliberada cómo y cuándo responder, en lugar de reaccionar en el momento',
  P2: 'detectas cuando algo tiene un trasfondo político, pero no siempre logras decidir con calma cómo y cuándo responder, lo que puede llevarte a reaccionar antes de tiempo',
  P3: 'sueles dar el beneficio de la duda ante señales ambiguas, aunque cuando decides responder lo haces de forma deliberada',
  P4: 'sueles dar el beneficio de la duda ante señales ambiguas y, cuando decides responder, puede costarte hacerlo con calma',
  O1: 'tienes una imagen clara de qué quieres conseguir dentro de la organización, y esa claridad se refleja en acciones sostenidas hacia ese objetivo',
  O2: 'tienes claridad sobre lo que quieres conseguir, pero esa claridad no siempre se traduce en acciones concretas y sostenidas',
  O3: 'tu sentido de dirección dentro de la organización todavía es difuso, lo que dificulta enfocar tu energía hacia algo concreto',
  DESEMPENO_1: 'produces resultados diferenciales y además te aseguras de que las personas relevantes los conozcan',
  DESEMPENO_2: 'el valor que generas no siempre se traduce en visibilidad ante las personas correctas, por lo que parte de tu impacto puede pasar desapercibido',
  DESEMPENO_3: 'tienes buena visibilidad ante las personas relevantes, pero tu contribución no siempre se traduce todavía en resultados claramente diferenciales',
  DESEMPENO_4: 'tu contribución no siempre se traduce en resultados claramente diferenciales, y ese impacto tampoco cuenta todavía con visibilidad sostenida ante las personas relevantes',
  DESTREZA_1: 'te desenvuelves con soltura en situaciones que exigen tacto, firmeza, discreción o autoridad, ajustando tu comportamiento según lo que cada momento exige',
  DESTREZA_2: 'estás dispuesto a asumir tensión o confrontación cuando algo te importa, pero no siempre evalúas primero cuánto está en juego antes de decidir si vale la pena asumirla',
  DESTREZA_3: 'te adaptas con soltura a distintos interlocutores, pero tiendes a evitar el conflicto incluso en situaciones donde podría valer la pena sostenerlo',
  DESTREZA_4: 'varias situaciones que exigen tacto, firmeza, discreción o autoridad pueden encontrarte todavía dudando cómo actuar',
  DESTREZA_5: 'te adaptas con soltura a distintos interlocutores, pero esa misma flexibilidad puede diluir la firmeza o presencia con la que te expresas cuando la situación la exige',
  DESTREZA_6: 'proyectas autoridad y firmeza con soltura, pero ajustas menos tu estilo según el interlocutor o el momento, lo que en algunas situaciones puede jugar en tu contra',
  E1: 'lees con precisión quién realmente tiene influencia en las decisiones importantes, y esa lectura se traduce en cómo te relacionas con los actores y sus intereses',
  E2: 'lees razonablemente bien quién tiene influencia en las decisiones importantes, pero trasladar esa lectura a tu relación concreta con actores e intereses es todavía menos sistemático',
  E3: 'tiendes a interpretar el poder principalmente en términos de posición y autoridad formal, más que como una dinámica relacional que puede cambiar con el contexto',
  R1: 'inviertes de forma genuina en relaciones amplias, mucho antes de necesitarlas, y esa inversión no se limita a tu círculo inmediato',
  R2: 'inviertes tiempo genuino en cultivar relaciones antes de necesitarlas, pero esa red todavía no se extiende mucho más allá de tu círculo inmediato',
  R3: 'tu red se extiende razonablemente más allá de tu círculo inmediato, pero esas relaciones no siempre se cultivan de forma deliberada antes de necesitarlas',
  R4: 'tu red tiende a ser más reactiva y concentrada en tu círculo inmediato',
  RP1: 'asumes con naturalidad que gestionar tu posición es parte legítima de tu trabajo, reconoces el papel de los intereses y las relaciones en las decisiones organizacionales, y no cuestionas la legitimidad de ese terreno',
  RP2A: 'entiendes que las decisiones organizacionales están naturalmente influidas por intereses y relaciones, pero no le ves demasiada relevancia a gestionar tu propia posición dentro de ese juego',
  RP2B: 'reconoces el realismo organizacional y consideras relevante gestionar tu posición, pero te cuesta aceptar del todo la legitimidad de ese terreno',
  RP3: 'tiendes a pensar que las decisiones deberían depender fundamentalmente del mérito, los argumentos y los resultados, y te cuesta aceptar cuando intervienen otros factores'
};

// Configuraciones que, por decisión de esta ronda, se leen como algo que
// "juega a favor". Todo lo demás (el resto de configuraciones activas, y
// SIEMPRE los patrones cruzados, que por diseño del motor V1 son señales de
// tensión) se lee como algo que "puede limitar". Ningún código aparece en
// ambos lados.
const CONFIG_FAVOR = new Set(['P1', 'O1', 'DESEMPENO_1', 'DESTREZA_1', 'E1', 'R1', 'RP1']);

// Orden fijo de recorrido (mismo orden PODDER + RP al final) para que la
// selección de items sea determinista y no dependa del orden de inserción.
const CONFIG_DIM_ORDER = ['RP', 'P', 'O', 'DESEMPENO', 'DESTREZA', 'E', 'R'];
const CONFIG_DIM_TO_LETTER = { RP: 'RP', P: 'P', O: 'O', DESEMPENO: 'D1', DESTREZA: 'D2', E: 'E', R: 'R' };

// =========================================================================
// RONDA "SÍNTESIS NARRATIVA v2" (aprobada — ver Propuesta_Sintesis_Narrativa_
// Perfil_v2.md) -- capa exclusivamente narrativa, cero cambios a engine.js
// ni a configurations.js.
//
// Patrones cruzados narrativamente AUTORIZADOS para ser la idea central de
// "Tu perfil político" (Nivel 1) o para aparecer como tarjeta de "Lo que
// puede estar limitándote". El motor y configurations.js pueden seguir
// calculando/emitiendo otros patrones (no se toca nada de eso), pero esta
// lista es la única puerta de entrada narrativa: un patrón fuera de esta
// lista queda descartado en collectConfigFindings, igual que un código sin
// texto aprobado -- mismo mecanismo ya existente, solo con un filtro
// explícito y documentado en vez de un olvido accidental.
//
// Excluidos deliberadamente por absorción/reemplazo (contrastado contra
// QA_Mapeo_Configuraciones_Narrativas_PODDER.md v4 y contra instrucción
// explícita para los casos que ese documento no nombra por código):
//   RESULTADOS_SIN_VISIBILIDAD          -> absorbido por Desempeño-2 (doc v4)
//   RESISTENCIA_MORAL_A_LA_POLITICA     -> absorbido por RP2B (doc v4)
//   OBJETIVO_SIN_ACCION                 -> absorbido por O2 (doc v4)
//   OBJETIVO_BIEN_PLANTEADO_SIN_ACCION  -> absorbido por O2/refinamiento (instrucción)
//   RED_INTERNA_SIN_RED_EXTERNA         -> absorbido por modificadores de R (instrucción)
//   RED_EXTERNA_SIN_PENETRACION_INTERNA -> absorbido por modificadores de R (instrucción)
//   IDENTIFICA_PODER_PERO_NO_SE_ACERCA  -> reemplazado por LEE_PODER_PERO_NO_SE_ACERCA (doc v4)
//   LEE_PODER_NO_CONSTRUYE_RELACIONES   -> reemplazado por LEE_PODER_PERO_NO_SE_ACERCA (doc v4)
//   POSICIONAMIENTO_SIN_VISIBILIDAD_CONDUCTUAL -> su evidencia (Q19) pasó a
//     ser modificador de Desempeño, no configuración/patrón propio (doc v4,
//     sección Desempeño); excluido por el mismo criterio que los anteriores.
const NARRATIVE_AUTHORIZED_PATTERNS = new Set([
  'RESULTADOS_SIN_CAPITAL_RELACIONAL',
  'AMBICION_CON_VULNERABILIDAD_POLITICA',
  'AMBICION_CON_RED_INSUFICIENTE',
  'RELACIONES_SIN_RESPALDO_DE_RESULTADOS',
  'LEGITIMA_POLITICA_PERO_LA_LEE_POCO',
  'CONFRONTA_SIN_SUFICIENTE_LECTURA',
  'LEE_BIEN_PERO_PUEDE_NO_ACTUAR',
  'LECTURA_DE_PODER_SIN_CONDUCTA_EQUIVALENTE',
  'LEE_PODER_PERO_NO_SE_ACERCA'
]);

// Redacción de síntesis para "Tu perfil político" (Nivel 1) -- DISTINTA de
// PATTERN_TEXT a propósito (misma conclusión autorizada, otra manera de
// contarla) para que el resumen nunca reutilice literalmente el texto que
// también puede aparecer en una tarjeta. Un código sin entrada aquí nunca
// se usa como idea central (cae a Nivel 3) -- nunca se inventa texto.
const SYNTHESIS_TEXT = {
  RESULTADOS_SIN_CAPITAL_RELACIONAL: 'En conjunto, tu perfil se apoya más en la fuerza de tus resultados que en el capital relacional que los acompaña. Tu desempeño constituye un activo político, pero cuenta con menos respaldo en relaciones que puedan ampliar su alcance.',
  AMBICION_CON_VULNERABILIDAD_POLITICA: 'Avanzas con una ambición clara, pero ese avance va un paso por delante de tu capacidad de cubrirte políticamente en el camino.',
  AMBICION_CON_RED_INSUFICIENTE: 'Tu ambición de crecer parece ir más rápido que la red que la sostendría — el objetivo está definido, el andamiaje relacional todavía se está construyendo.',
  RELACIONES_SIN_RESPALDO_DE_RESULTADOS: 'Cuentas con una red que constituye un activo político, pero ese capital relacional tiene menos respaldo en resultados o capacidades diferenciales que fortalezcan tu posición.',
  LEGITIMA_POLITICA_PERO_LA_LEE_POCO: 'Tu disposición a jugar el juego político va por delante de tu lectura fina de cómo funciona el poder a tu alrededor — la voluntad está, el mapa todavía se está construyendo.',
  CONFRONTA_SIN_SUFICIENTE_LECTURA: 'Tu disposición a confrontar cuando algo te importa es clara; el riesgo aparece cuando esa disposición se activa antes de terminar de leer a los actores y el margen real de maniobra.',
  LEE_BIEN_PERO_PUEDE_NO_ACTUAR: 'Lees el contexto con cuidado antes de moverte — la misma cautela que te protege puede también dejarte fuera de batallas que, con ese criterio, valdría la pena dar.',
  LECTURA_DE_PODER_SIN_CONDUCTA_EQUIVALENTE: 'Tu lectura puntual del poder es más sólida que tu hábito sostenido de indagar intereses y prioridades ajenas — el criterio aparece en el momento, pero todavía no como práctica constante.',
  LEE_PODER_PERO_NO_SE_ACERCA: 'Tu punto más claro es diagnosticar bien dónde está el poder; lo que todavía no ocurre es que ese diagnóstico se convierta en acercamiento real hacia quienes lo tienen.'
};

// Nivel 3 (sin patrón cruzado autorizado activo): frase ancla corta por
// dimensión, usada SOLO para nombrar cuál es "el rasgo más definido" sin
// citar el texto de CONFIG_TEXT. Nivel 2 (reglas de contraste) fue evaluado
// y descartado para V1 -- no se implementa.
const FALLBACK_ANCHOR_LABEL = {
  RP: 'tu relación con la política',
  P: 'tu capacidad de detectar y regular tu respuesta política',
  O: 'la claridad de objetivo',
  D1: 'tu desempeño',
  D2: 'tu destreza situacional',
  E: 'tu lectura del poder',
  R: 'tu red de relaciones'
};

function capitalizeSentence(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Recorre el resultado de computeConfigurations() y arma una lista plana de
// "hallazgos" (una configuración activa por dimensión, más los patrones
// cruzados visibles Y narrativamente autorizados), cada uno ya clasificado
// como favor/limita y con su texto/título de cara al usuario resuelto.
// Nunca expone el código interno, solo lo usa para las tablas de arriba.
function collectConfigFindings(cfg) {
  const items = [];
  CONFIG_DIM_ORDER.forEach(dimKey => {
    const entry = cfg[dimKey];
    if (!entry || !entry.code) return;
    const title = CONFIG_TITLE[entry.code];
    const text = CONFIG_TEXT[entry.code];
    if (!title || !text) return; // código sin texto aprobado todavía: se omite, nunca se inventa
    items.push({
      kind: 'config',
      code: entry.code,
      dim: CONFIG_DIM_TO_LETTER[dimKey],
      title,
      text,
      favor: CONFIG_FAVOR.has(entry.code)
    });
  });
  (cfg.visiblePatterns || []).forEach(p => {
    if (!NARRATIVE_AUTHORIZED_PATTERNS.has(p.code)) return; // absorbido/reemplazado -- ver nota arriba, nunca se muestra
    const title = PATTERN_TITLE[p.code];
    const text = PATTERN_TEXT[p.code];
    if (!title || !text) return;
    items.push({ kind: 'pattern', code: p.code, dim: null, title, text, favor: false });
  });
  return items;
}

/**
 * "Tu perfil político" -- síntesis integrada, NUNCA una enumeración/paráfrasis
 * de las tarjetas de abajo (ronda "síntesis narrativa v2", aprobada):
 *
 * Nivel 1 (prioridad): si hay un patrón cruzado narrativamente autorizado
 * activo (NARRATIVE_AUTHORIZED_PATTERNS), se usa como idea central, con una
 * redacción de síntesis (SYNTHESIS_TEXT) DISTINTA de PATTERN_TEXT -- misma
 * conclusión autorizada, nunca el mismo string que pueda aparecer en una
 * tarjeta. Se toma el primero según el orden ya priorizado de
 * cfg.visiblePatterns (no se inventa un criterio de prioridad nuevo).
 *
 * Nivel 2 (reglas de contraste entre configuraciones): evaluado y
 * descartado para V1 -- no se implementa, por decisión explícita.
 *
 * Nivel 3 (fallback, sin patrón activo): resumen corto que solo NOMBRA la
 * dimensión más fuerte (FALLBACK_ANCHOR_LABEL), sin citar CONFIG_TEXT, o un
 * resumen genérico de perfil parejo si no hay ninguna configuración "a
 * favor" activa. Nunca se rellena para alcanzar una longitud mínima.
 *
 * Devuelve { text, usedPatternCode } -- usedPatternCode viaja a
 * buildVulnerabilidadesV2 para excluir ese mismo patrón del pool de
 * tarjetas (regla de no-redundancia semántica aprobada).
 */
function buildPerfilV2(engineResult, cfg, DIM_NAMES) {
  const findings = collectConfigFindings(cfg);
  const topPattern = findings.find(f => f.kind === 'pattern');

  if (topPattern && SYNTHESIS_TEXT[topPattern.code]) {
    return { text: SYNTHESIS_TEXT[topPattern.code], usedPatternCode: topPattern.code };
  }

  // Nivel 3: sin patrón cruzado autorizado activo.
  const favorFindings = findings.filter(f => f.favor);
  const anchor = favorFindings[0] && FALLBACK_ANCHOR_LABEL[favorFindings[0].dim];
  if (anchor) {
    return {
      text: capitalizeSentence(anchor) + ' es hoy el rasgo más definido de tu perfil. El resto de las dimensiones se mantiene relativamente parejo, sin una combinación adicional que destaque con claridad.',
      usedPatternCode: null
    };
  }

  return {
    text: 'Tu perfil se mantiene parejo entre las siete dimensiones, sin una tensión ni una combinación que hoy resulte determinante.',
    usedPatternCode: null
  };
}

function buildFortalezasV2(engineResult, cfg, DIM_NAMES) {
  const findings = collectConfigFindings(cfg).filter(f => f.favor);
  const items = findings.slice(0, 3).map(f => ({ title: f.title, text: capitalizeSentence(f.text) + '.' }));

  if (items.length < 2) {
    const usedDims = new Set(findings.map(f => f.dim));
    const highs = pickTopReliableDims(engineResult.dims, Object.keys(DIM_NAMES), 7, 'desc')
      .filter(d => d.band === 'alta' && !usedDims.has(d.code));
    highs.forEach(h => {
      if (items.length >= 3) return;
      items.push({ title: DIM_NAMES[h.code], text: capitalizeSentence(DIM_DESCRIPTORS[h.code].alta) + '.' });
    });
  }

  if (items.length === 0) {
    items.push({
      title: 'Consistencia general',
      text: 'Tu perfil no muestra extremos marcados: es una base razonable para desarrollar de forma más deliberada las dimensiones específicas que quieras fortalecer.'
    });
  }

  return items.slice(0, 3);
}

/**
 * `excludeCode`: código del patrón usado como idea central de "Tu perfil
 * político" (o null si el párrafo cayó en Nivel 3) -- regla de no-
 * redundancia semántica aprobada: ese mismo hallazgo no vuelve a aparecer
 * aquí. Cuando se excluye, NO se rellena con dimensiones de respaldo ni con
 * el mensaje genérico de "sin señales marcadas": mostrar menos tarjetas es
 * el resultado correcto, y ese mensaje genérico contradiría al resumen de
 * arriba (que sí describió una tensión real). El respaldo con dimensiones
 * bajas solo se activa para el caso genuino de perfiles con poca evidencia
 * (sin patrón activo en absoluto), igual que antes de esta ronda.
 */
function buildVulnerabilidadesV2(engineResult, cfg, DIM_NAMES, excludeCode) {
  const allFindings = collectConfigFindings(cfg).filter(f => !f.favor);
  const findings = excludeCode ? allFindings.filter(f => f.code !== excludeCode) : allFindings;
  // Los patrones cruzados van primero (son hallazgos de mayor precisión,
  // combinan siempre >=2 evidencias), igual que en la versión anterior del
  // reporte; luego las configuraciones que "pueden limitar".
  findings.sort((a, b) => (a.kind === b.kind) ? 0 : (a.kind === 'pattern' ? -1 : 1));

  const items = [];
  const usedTexts = new Set();
  findings.forEach(f => {
    if (items.length >= 3) return;
    if (usedTexts.has(f.text)) return; // nunca duplicar la misma idea narrativa
    items.push({ title: f.title, text: capitalizeSentence(f.text) + '.' });
    usedTexts.add(f.text);
  });

  if (!excludeCode) {
    if (items.length < 2) {
      const usedDims = new Set(allFindings.map(f => f.dim));
      const lows = pickTopReliableDims(engineResult.dims, Object.keys(DIM_NAMES), 7, 'asc')
        .filter(d => d.band === 'baja' && !usedDims.has(d.code));
      lows.forEach(l => {
        if (items.length >= 3) return;
        items.push({ title: DIM_NAMES[l.code], text: capitalizeSentence(DIM_DESCRIPTORS[l.code].baja) + '.' });
      });
    }

    if (items.length === 0) {
      items.push({
        title: 'Sin señales marcadas todavía',
        text: 'Con las respuestas registradas hasta ahora no se observan tensiones pronunciadas; vale la pena revisar este resultado como un primer corte, no como un diagnóstico definitivo.'
      });
    }
  }

  return items.slice(0, 3);
}

// Payload visual de las 6 dimensiones PODDER + RP por separado, SIN banda
// (ni 'alta'/'media'/'baja' ni ningún otro texto de banda): número (0-10) y
// lo que haga falta para pintar la barra. Las configuraciones internas
// (P1, RP2B, etc.) nunca se exponen aquí -- ya se consumieron arriba para
// producir el párrafo y los dos bloques.
function buildPodderVisual(engineResult, DIM_NAMES) {
  const PODDER_DIMS = ['P', 'O', 'D1', 'D2', 'E', 'R'];
  const podder = PODDER_DIMS.map(code => ({
    code,
    letter: code[0],
    label: DIM_NAMES[code],
    score10: engineResult.dims[code].score10
  }));
  const rp = engineResult.dims.RP;
  const relacionConPolitica = { code: 'RP', label: DIM_NAMES.RP, score10: rp.score10 };
  return { podder, relacionConPolitica };
}

function buildReportV2(engineResult, cfg, DIM_NAMES, DIM_ORDER) {
  const visual = buildPodderVisual(engineResult, DIM_NAMES);
  const perfilResult = buildPerfilV2(engineResult, cfg, DIM_NAMES);
  return {
    perfil: perfilResult.text,
    podder: visual.podder,
    relacionConPolitica: visual.relacionConPolitica,
    favor: buildFortalezasV2(engineResult, cfg, DIM_NAMES),
    limita: buildVulnerabilidadesV2(engineResult, cfg, DIM_NAMES, perfilResult.usedPatternCode),
    structuredPayload: buildStructuredPayload(engineResult, DIM_NAMES, DIM_ORDER)
  };
}

const PATTERN_TO_RECOMMENDATION = {
  RESULTADOS_SIN_VISIBILIDAD: 'VISIBILIDAD_BAJA',
  LEE_PODER_NO_CONSTRUYE_RELACIONES: 'RELACION_PODER_BAJA',
  IDENTIFICA_PODER_PERO_NO_SE_ACERCA: 'RELACION_PODER_BAJA',
  RESISTENCIA_MORAL_A_LA_POLITICA: 'RESISTENCIA_MORAL_POLITICA',
  RELACIONES_SIN_RESPALDO_DE_RESULTADOS: 'VISIBILIDAD_SIN_RESULTADOS',
  OBJETIVO_SIN_ACCION: 'OBJETIVO_SIN_ACCION',
  RED_INTERNA_SIN_RED_EXTERNA: 'RED_EXTERNA_BAJA',
  RED_EXTERNA_SIN_PENETRACION_INTERNA: 'RED_INTERNA_BAJA',
  CONFRONTA_SIN_SUFICIENTE_LECTURA: 'LECTURA_ANTES_DE_CONFRONTAR',
  LEE_BIEN_PERO_PUEDE_NO_ACTUAR: 'CONVIERTE_LECTURA_EN_ACCION',
  LECTURA_DE_PODER_SIN_CONDUCTA_EQUIVALENTE: 'MAPEA_INTERESES_DE_FORMA_SISTEMATICA',
  POSICIONAMIENTO_SIN_VISIBILIDAD_CONDUCTUAL: 'VISIBILIDAD_BAJA',
  OBJETIVO_BIEN_PLANTEADO_SIN_ACCION: 'OBJETIVO_SIN_ACCION'
};

function dimLabel(DIM_NAMES, code) { return DIM_NAMES[code]; }

/**
 * Arma el payload estructurado de la sección 8 del documento complementario
 * (equivalente a la sección 10 del documento maestro): lo único que puede
 * recibir un generador narrativo, humano o LLM. Nunca respuestas crudas.
 */
function buildStructuredPayload(engineResult, DIM_NAMES, DIM_ORDER) {
  const dimension_scores = {};
  DIM_ORDER.forEach(d => { dimension_scores[DIM_NAMES[d]] = engineResult.dims[d].score10; });

  const subdimension_findings = Object.fromEntries(
    Object.entries(engineResult.tags).map(([k, v]) => [k.toLowerCase(), v.band])
  );

  const active_signals = Object.entries(engineResult.signals)
    .filter(([, active]) => active)
    .map(([code]) => code);

  const active_patterns = engineResult.patterns.map(p => p.code);
  const discrepancies = engineResult.patterns.filter(p => p.type === 'discrepancia').map(p => p.code);

  return {
    dimension_scores,
    subdimension_findings,
    active_signals,
    active_patterns,
    discrepancies,
    approved_recommendation_ids: [], // biblioteca de recomendaciones aún no aprobada por TML (ver sección 9 del doc. complementario)
    version_cuestionario: 'maestra-v1',
    version_algoritmo: 'engine-v2-clave-situacional-tags-senales'
  };
}

function pickTopReliableDims(dims, DIM_ORDER, n, order) {
  return DIM_ORDER
    .map(d => ({ code: d, ...dims[d] }))
    .filter(d => d.reliable && d.score10 !== null)
    .sort((a, b) => order === 'desc' ? b.score10 - a.score10 : a.score10 - b.score10)
    .slice(0, n);
}

function buildPerfil(engineResult, DIM_NAMES) {
  const { dims, patterns } = engineResult;
  // Solo se usa como "fortaleza" de apertura si la dimensión realmente está
  // en banda 'alta' (no basta con ser la más alta entre las confiables:
  // si todas las dimensiones confiables están en banda 'media'/'baja', no
  // hay ninguna fortaleza genuina de dimensión que anunciar aquí).
  const topDim = pickTopReliableDims(dims, Object.keys(DIM_NAMES), 1, 'desc')
    .filter(d => d.band === 'alta')[0];
  const lowDim = pickTopReliableDims(dims, Object.keys(DIM_NAMES), 1, 'asc')
    .filter(d => d.band === 'baja')[0];
  const topPattern = patterns[0];

  let s = 'Tu perfil muestra que ';
  if (topDim) {
    s += DIM_DESCRIPTORS[topDim.code].alta + '. ';
  } else {
    s += 'presentas una combinación todavía pareja de fortalezas y áreas por desarrollar en cómo te mueves frente al poder dentro de tu organización. ';
  }

  if (topPattern) {
    s += 'Sin embargo, ' + PATTERN_TEXT[topPattern.code] + '. ';
  } else if (lowDim && (!topDim || lowDim.code !== topDim.code)) {
    s += 'Al mismo tiempo, ' + DIM_DESCRIPTORS[lowDim.code].baja + '. ';
  }

  if (patterns.length > 1) {
    const second = patterns[1];
    s += 'A esto se suma que ' + PATTERN_TEXT[second.code] + '. ';
  } else if (lowDim && topPattern) {
    s += 'A esto se suma que ' + DIM_DESCRIPTORS[lowDim.code].baja + '. ';
  }

  s += 'Ninguno de estos rasgos es, por sí mismo, una fortaleza o una debilidad definitiva: su efecto depende de cómo se combinan entre sí y con el contexto en el que te mueves.';
  return s;
}

function buildFortalezas(engineResult, DIM_NAMES) {
  const { dims, patterns } = engineResult;
  const items = [];
  const usedDims = new Set();

  // 1) Dimensiones altas y confiables, priorizando las que no están
  //    "consumidas" por un patrón negativo (para no repetir el mismo punto
  //    dos veces entre fortalezas y vulnerabilidades).
  const patternDimsInvolved = new Set();
  patterns.forEach(p => {
    // Aproximación: si el código del patrón menciona una dimensión con
    // descriptor conocido, se marca como "en tensión" para variar el foco.
  });

  const highs = pickTopReliableDims(dims, Object.keys(DIM_NAMES), 4, 'desc');
  highs.forEach(h => {
    if (items.length >= 3) return;
    if (h.score10 !== null && h.band === 'alta') {
      items.push({ title: DIM_NAMES[h.code], text: 'Tu perfil sugiere que ' + DIM_DESCRIPTORS[h.code].alta + '.' });
      usedDims.add(h.code);
    }
  });

  if (items.length < 2) {
    items.push({
      title: 'Consistencia general',
      text: 'Tu perfil no muestra extremos marcados: es una base razonable para desarrollar de forma más deliberada las dimensiones específicas que quieras fortalecer.'
    });
  }

  return items.slice(0, 3);
}

function buildVulnerabilidades(engineResult, DIM_NAMES) {
  const { dims, patterns } = engineResult;
  const items = [];
  const usedPatternCodes = new Set();

  patterns.slice(0, 3).forEach(p => {
    if (items.length >= 3) return;
    items.push({ title: PATTERN_TITLE[p.code] || p.label, text: 'El perfil sugiere que ' + PATTERN_TEXT[p.code] + '.' });
    usedPatternCodes.add(p.code);
  });

  if (items.length < 2) {
    const lows = pickTopReliableDims(dims, Object.keys(DIM_NAMES), 4, 'asc')
      .filter(d => d.band === 'baja');
    lows.forEach(l => {
      if (items.length >= 3) return;
      items.push({ title: DIM_NAMES[l.code], text: 'Tu perfil sugiere que ' + DIM_DESCRIPTORS[l.code].baja + '.' });
    });
  }

  if (items.length === 0) {
    items.push({
      title: 'Sin señales marcadas todavía',
      text: 'Con las respuestas registradas hasta ahora no se observan tensiones pronunciadas; vale la pena revisar este resultado como un primer corte, no como un diagnóstico definitivo.'
    });
  }

  return items.slice(0, 3);
}

function buildPrioridades(engineResult, DIM_NAMES) {
  const { dims, patterns } = engineResult;
  const priorities = [];
  const usedTags = new Set();

  patterns.forEach(p => {
    if (priorities.length >= 3) return;
    const tag = PATTERN_TO_RECOMMENDATION[p.code];
    if (tag && RECOMMENDATION_LIBRARY[tag] && !usedTags.has(tag)) {
      priorities.push(RECOMMENDATION_LIBRARY[tag]);
      usedTags.add(tag);
    }
  });

  if (priorities.length < 3) {
    const lows = pickTopReliableDims(dims, Object.keys(DIM_NAMES), 7, 'asc').filter(d => d.band !== 'alta');
    for (const l of lows) {
      if (priorities.length >= 3) break;
      const fb = FALLBACK_DEV_BY_DIM[l.code];
      if (fb && !priorities.some(p => p.title === fb.title)) priorities.push(fb);
    }
  }

  return priorities.slice(0, 3);
}

// buildReport() ETAPA 2: ahora requiere también `cfg` (la salida de
// computeConfigurations(engineResult), ver configurations.js) además del
// engineResult crudo del motor V1. La versión anterior (perfil narrativo
// desde patrones+DIM_DESCRIPTORS solamente, radar de 7 puntos con
// fortalezas/vulnerabilidades/prioridades) queda reemplazada por
// buildReportV2 -- las funciones viejas (buildPerfil, buildFortalezas,
// buildVulnerabilidades, buildPrioridades) se conservan arriba sin cambios,
// solo dejan de invocarse desde aquí, para no tocar/reordenar nada fuera
// del alcance de este encargo.
function buildReport(engineResult, cfg, DIM_NAMES, DIM_ORDER) {
  return buildReportV2(engineResult, cfg, DIM_NAMES, DIM_ORDER);
}
