/* ---- engine.js ---- */
/* =========================================================================
   Motor de scoring, señales y patrones — PPO (Perfil Político Organizacional)

   Implementa el flujo de la especificación maestra (sección 7), reforzado
   por la especificación complementaria "TML_Clave_Scoring_Tags_Senales_
   Claude_V1.docx":

     respuestas → score primario por variable → score de dimensión
     → raw tags (situacionales) → señales agregadas (capa 2) →
     patrones cruzados (capa 3) → reporte

   NINGÚN texto se genera aquí libremente a partir de respuestas crudas.
   Este módulo solo produce datos estructurados (números, bandas, tags,
   señales, códigos de patrón). La redacción del reporte vive en report.js
   y consume EXCLUSIVAMENTE la salida de este motor — nunca respuestas
   crudas — tal como exige la sección 10 del documento maestro y la
   sección 8 del documento complementario.

   La clave situacional (0-4 + raw tag por opción) ya está integrada en
   questions.js, cargada verbatim del documento complementario. Q31-D
   permanece N/A (optOut): no reportar un adversario no equivale ni a
   competencia ni a incompetencia, y se excluye del promedio de esa
   pregunta (sección 6 del documento complementario).
   ========================================================================= */

// Fracción mínima de ítems "reales" que debe tener una dimensión para que
// sus bandas alta/baja puedan disparar patrones. Con la clave real cargada,
// las 18 situacionales ya aportan señal genuina, así que en la práctica
// esto casi siempre se cumple; se conserva como salvaguarda ante preguntas
// sin responder o futuras extensiones del cuestionario.
const RELIABILITY_THRESHOLD = 0.4;

function band3(normalized) {
  if (normalized === null || normalized === undefined) return null;
  if (normalized >= 0.65) return 'alta';
  if (normalized <= 0.35) return 'baja';
  return 'media';
}

// answers: { [questionId]: { value } }  -- value = 1-10 (orientacion),
//   letter (frecuencia u situacional). Para 'frecuencia'/'situacional' con
//   optOut, letter es la opción opt-out.
function normalizeAnswer(q, answer) {
  if (!answer) return { normalized: null, real: false, optOut: false };

  if (q.format === 'orientacion') {
    const v = answer.value;
    return { normalized: (v - 1) / 9, real: true, optOut: false, raw: v };
  }

  if (q.format === 'frecuencia') {
    const opt = q.options.find(o => o.letter === answer.letter);
    if (!opt) return { normalized: null, real: false, optOut: false };
    if (opt.optOut) return { normalized: null, real: false, optOut: true, tag: opt.tag };
    const maxV = Math.max(...q.options.filter(o => !o.optOut).map(o => o.v));
    return { normalized: (opt.v - 1) / (maxV - 1), real: true, optOut: false, raw: opt.v };
  }

  if (q.format === 'situacional') {
    const opt = q.options.find(o => o.letter === answer.letter);
    if (!opt) return { normalized: null, real: false, optOut: false };
    if (opt.optOut) return { normalized: null, real: false, optOut: true, tag: opt.tag };
    if (typeof opt.score === 'number') {
      // Clave V1: escala 0-4. Normalizado a 0-1 para el resto del motor.
      return { normalized: opt.score / 4, real: true, optOut: false, raw: opt.score, rawTag: opt.tag };
    }
    // Salvaguarda: si alguna opción quedara sin score cargado, no se inventa
    // clave. Se excluye del cómputo en lugar de rellenar con un valor neutro.
    return { normalized: null, real: false, optOut: false };
  }

  return { normalized: null, real: false, optOut: false };
}

/**
 * Calcula, a partir de un objeto de respuestas { [id]: {value} | {letter} },
 * todo lo que el motor debe producir: scores por dimensión (0-10, para el
 * radar), confiabilidad de cada dimensión, bandas de tags etiquetados,
 * señales agregadas (capa 2) y patrones cruzados (capa 3).
 */
function runEngine(QUESTIONS, DIM_ORDER, answers) {
  const perDim = {};
  DIM_ORDER.forEach(d => { perDim[d] = { sum: 0, n: 0, realN: 0 }; });

  const tagBuckets = {}; // tagName -> { sum, n (real items only) } -- tags de dimensión/subdimensión (Q4/Q6/Q9/Q14/Q16/Q25/Q32/Q35/Q36)
  const optOutTags = {}; // tagName -> true, cuando una opción opt-out fue elegida
  const secondarySignals = []; // { dim, band, real, fromQuestion } -- registro de las 6 preguntas de dimensión compuesta
  const byQ = {}; // qid -> { format, letter, orientRaw, normalized, real, optOut, rawTag } -- respuesta normalizada por pregunta, base de señales/patrones

  QUESTIONS.forEach(q => {
    const answer = answers[q.id];
    const { normalized, real, optOut, tag: optOutTag, raw, rawTag } = normalizeAnswer(q, answer);

    byQ[q.id] = {
      format: q.format,
      letter: (q.format === 'frecuencia' || q.format === 'situacional') && answer ? answer.letter : null,
      orientRaw: q.format === 'orientacion' && answer ? answer.value : null,
      normalized,
      real,
      optOut,
      rawTag: rawTag || null
    };

    const primaryDim = q.dim[0];
    if (normalized !== null && perDim[primaryDim]) {
      perDim[primaryDim].sum += normalized;
      perDim[primaryDim].n += 1;
      if (real) perDim[primaryDim].realN += 1;
    }

    // Señal secundaria de dimensión compuesta: registrada pero NO usada para
    // sumar puntos de otra dimensión (regla cerrada en la sección 4 del
    // documento complementario). La interpretación fina de estas seis
    // preguntas (7, 13, 18, 23, 26, 31) ahora vive en los raw tags y las
    // señales agregadas de más abajo, que son más precisas que esta banda.
    if (q.dim.length > 1 && normalized !== null) {
      secondarySignals.push({ dim: q.dim[1], band: band3(normalized), real, fromQuestion: q.id });
    }

    // Tags de dimensión/subdimensión explícitos (promedian solo respuestas
    // reales; un relleno inexistente nunca diluye una señal real de otra
    // pregunta con el mismo tag).
    if (q.tag && real) {
      if (!tagBuckets[q.tag]) tagBuckets[q.tag] = { sum: 0, n: 0 };
      tagBuckets[q.tag].sum += normalized;
      tagBuckets[q.tag].n += 1;
    }
    if (optOut && optOutTag) {
      optOutTags[optOutTag] = true;
    }
  });

  const dims = {};
  DIM_ORDER.forEach(d => {
    const bucket = perDim[d];
    const avg = bucket.n > 0 ? bucket.sum / bucket.n : null;
    const realFraction = bucket.n > 0 ? bucket.realN / bucket.n : 0;
    dims[d] = {
      score10: avg !== null ? Math.round(avg * 1000) / 100 : null, // 0-10, 2 decimales
      normalized: avg,
      itemCount: bucket.n,
      realItemCount: bucket.realN,
      realFraction: Math.round(realFraction * 100) / 100,
      reliable: realFraction >= RELIABILITY_THRESHOLD,
      band: realFraction >= RELIABILITY_THRESHOLD ? band3(avg) : 'media'
    };
  });

  // Bandas de tags de dimensión/subdimensión (solo con señal real)
  const tags = {};
  Object.keys(tagBuckets).forEach(name => {
    const b = tagBuckets[name];
    const avg = b.n > 0 ? b.sum / b.n : null;
    tags[name] = { band: avg !== null ? band3(avg) : null, real: b.n > 0, optOut: false };
  });
  Object.keys(optOutTags).forEach(name => {
    tags[name] = { band: 'sin_dato', real: true, optOut: true };
  });

  const signals = computeSignals(byQ, dims);
  const patterns = computePatterns(dims, tags, byQ, signals);

  return { dims, tags, secondarySignals, signals, patterns, byQ };
}

function dimBand(dims, dimCode) {
  const d = dims[dimCode];
  if (!d || !d.reliable) return 'media';
  return d.band;
}

function tagBand(tags, tagName) {
  const t = tags[tagName];
  if (!t || !t.real) return 'media';
  return t.band;
}

// ¿La respuesta a la pregunta qid fue una de las letras indicadas?
// (SIN_ADVERSARIO_IDENTIFICADO / cualquier optOut nunca cuenta como evidencia
// de una señal positiva ni negativa — sección 6 del documento complementario.)
function letterIs(byQ, qid, letters) {
  const q = byQ[qid];
  return !!(q && !q.optOut && q.letter && letters.indexOf(q.letter) !== -1);
}

function qBand(byQ, qid) {
  const q = byQ[qid];
  if (!q || q.normalized === null) return null;
  return band3(q.normalized);
}

// Cuenta cuántas de las preguntas listadas (una entrada por pregunta,
// aceptando una o más letras válidas como evidencia) aportaron evidencia.
// Como una persona solo responde una letra por pregunta, cada entrada
// aporta como máximo 1 — así se cumple la regla "dos tags de la misma
// pregunta nunca cuentan como dos evidencias" sin lógica adicional.
function evidenceCount(byQ, qidLetterPairs) {
  return qidLetterPairs.reduce((n, [qid, letters]) => n + (letterIs(byQ, qid, letters) ? 1 : 0), 0);
}

/**
 * Las 15 señales agregadas V1 (sección 5 del documento complementario).
 * Son variables internas de segundo nivel: nunca se muestran literalmente
 * al participante. Las 11 primeras requieren >= 2 evidencias de preguntas
 * distintas; las 4 últimas son reglas compuestas explícitas.
 */
function computeSignals(byQ, dims) {
  const s = {};

  s.DIAGNOSTICA_ANTES_DE_ACTUAR = evidenceCount(byQ, [
    [3, ['B']], [21, ['C']], [24, ['B']], [26, ['B']]
  ]) >= 2;

  s.ACTUA_SIN_LECTURA_SUFICIENTE = evidenceCount(byQ, [
    [3, ['C', 'D']], [21, ['A']], [24, ['A', 'D']], [30, ['D']]
  ]) >= 2;

  s.LEE_PODER_MAS_ALLA_ORGANIGRAMA = evidenceCount(byQ, [
    [5, ['B', 'D']], [11, ['B']], [17, ['B', 'D']]
  ]) >= 2;

  s.LECTURA_FORMAL_DEL_PODER = evidenceCount(byQ, [
    [5, ['A']], [11, ['C']], [17, ['A']], [24, ['C']]
  ]) >= 2;

  s.CONFIA_EXCESIVAMENTE_EN_MERITO_RESULTADOS = evidenceCount(byQ, [
    [3, ['D']], [13, ['B']], [19, ['A']], [22, ['A']], [25, ['A']]
  ]) >= 2;

  s.CONVIERTE_DESEMPENO_EN_CAPITAL_POLITICO = evidenceCount(byQ, [
    [7, ['C']], [19, ['B', 'D']], [25, ['C']]
  ]) >= 2;

  s.USA_COALICIONES_ESTRATEGICAMENTE = evidenceCount(byQ, [
    [13, ['D']], [15, ['D']], [26, ['D']], [30, ['A']]
  ]) >= 2;

  s.ALTA_DISPOSICION_A_CONFRONTAR = evidenceCount(byQ, [
    [7, ['B']], [15, ['B']], [21, ['A']], [26, ['A']], [28, ['C']], [30, ['C']]
  ]) >= 2;

  s.TENDENCIA_A_EVITAR_BATALLAS = evidenceCount(byQ, [
    [7, ['A']], [15, ['A']], [21, ['D']], [26, ['C']]
  ]) >= 2;

  // Solo dos preguntas fuente: "≥2 y preferiblemente evidencia en Q15 y Q26"
  // equivale, con dos fuentes posibles, a requerir evidencia en ambas.
  s.SELECCIONA_Y_PREPARA_BATALLAS = evidenceCount(byQ, [
    [15, ['C', 'D']], [26, ['B', 'D']]
  ]) >= 2;

  s.ADAPTA_CONSERVANDO_POSICION = evidenceCount(byQ, [
    [10, ['D']], [28, ['D']], [34, ['B', 'C', 'D']]
  ]) >= 2;

  // --- Reglas compuestas explícitas ---

  // RIGIDEZ_DE_ESTILO / SOBREADAPTACION_AL_INTERLOCUTOR: DESACTIVADAS en V1
  // por decisión de TML. El documento no especifica una pregunta conductual
  // única de "adaptación", y usar la dimensión Destreza o la señal
  // TENDENCIA_A_EVITAR_BATALLAS como proxy fue evaluado y rechazado por no
  // tener suficiente equivalencia conceptual con Q10A/Q10B. En vez de
  // inventar un proxy, la señal queda desactivada (siempre false, nunca
  // aparece en active_signals ni alimenta patrones) hasta que exista una
  // regla validada por TML. El raw tag de cada respuesta (Q10:
  // PRIORIZA_ESTILO_PROPIO/SOBREADAPTA_ESTILO/...; Q34:
  // COMPENSA_JERARQUIA_CON_EXPLICACION/...) se sigue capturando en byQ[id]
  // .rawTag para análisis del piloto, aunque no se agregue en una señal.
  // Config auditable: cambiar `enabled` a true y completar la regla de
  // activación una vez TML defina o valide una correspondencia conductual.
  const SIGNAL_CONFIG_V1 = {
    RIGIDEZ_DE_ESTILO: { enabled: false },
    SOBREADAPTACION_AL_INTERLOCUTOR: { enabled: false }
  };
  // Sin regla validada aún: mientras enabled sea false, la señal es siempre
  // false sin importar las respuestas (no se evalúa ningún proxy).
  s.RIGIDEZ_DE_ESTILO = SIGNAL_CONFIG_V1.RIGIDEZ_DE_ESTILO.enabled;
  s.SOBREADAPTACION_AL_INTERLOCUTOR = SIGNAL_CONFIG_V1.SOBREADAPTACION_AL_INTERLOCUTOR.enabled;

  s.GESTIONA_ADVERSARIO_ESTRATEGICAMENTE = letterIs(byQ, 31, ['A']) &&
    letterIs(byQ, 30, ['A', 'B', 'C']);

  // CONVIERTE_ASPIRACION_EN_ACCION_POLITICA: Q22B + Q8>=7 + Q9 alto
  // (Frecuentemente/Muy frecuentemente). Q33 alto refuerza pero no sustituye
  // -- no se exige para la activación base.
  const q8High = byQ[8] && byQ[8].orientRaw !== null && byQ[8].orientRaw >= 7;
  s.CONVIERTE_ASPIRACION_EN_ACCION_POLITICA = letterIs(byQ, 22, ['B']) &&
    q8High && letterIs(byQ, 9, ['D', 'E']);

  return s;
}

/**
 * Los 15 patrones cruzados de la sección 7 del documento complementario
 * (reemplazan íntegramente a la lista anterior de la especificación
 * maestra), más 3 discrepancias adicionales aprobadas por TML en revisión
 * posterior (en reemplazo de la implementación genérica original de
 * SABE_PERO_NO_HACE, retirada por falta de equivalencia conceptual): 17
 * patrones en total. Cada patrón que combina dos señales, o un criterio
 * situacional con su conducta reportada equivalente, queda marcado con
 * type:'discrepancia' para que el reporte pueda priorizarlo como hallazgo
 * de contraste, tal como exige la sección 6 ("si alguien sabe qué hacer
 * pero reporta no hacerlo, generar una discrepancia, no una media").
 */
function computePatterns(dims, tags, byQ, signals) {
  const active = [];
  const P = (code, condition, label, type) => { if (condition) active.push({ code, label, type: type || 'cruzado' }); };

  const Prot = dimBand(dims, 'P');
  const D1 = dimBand(dims, 'D1');
  const E = dimBand(dims, 'E');
  const R = dimBand(dims, 'R');

  const visibilidad = tagBand(tags, 'VISIBILIDAD');
  const ambicion = tagBand(tags, 'AMBICION');
  const legitimidad = tagBand(tags, 'LEGITIMIDAD_POLITICA');
  const redInterna = tagBand(tags, 'RED_INTERNA');
  const redExterna = tagBand(tags, 'RED_EXTERNA');
  const relacionActoresPoder = tagBand(tags, 'RELACION_ACTORES_PODER');
  const objetivoAccion = tagBand(tags, 'OBJETIVO_ACCION');
  const objetivoSinDefinir = tags['OBJETIVO_SIN_DEFINIR'] && tags['OBJETIVO_SIN_DEFINIR'].optOut;

  const q1Band = qBand(byQ, 1);
  const q8Band = qBand(byQ, 8);

  P('RESULTADOS_SIN_CAPITAL_RELACIONAL', D1 === 'alta' && R === 'baja',
    'Desempeño alto + Relaciones bajas');

  P('RESULTADOS_SIN_VISIBILIDAD', D1 === 'alta' && visibilidad === 'baja',
    'Desempeño/impacto alto + visibilidad baja');

  P('LEE_PODER_NO_CONSTRUYE_RELACIONES', signals.LEE_PODER_MAS_ALLA_ORGANIGRAMA && relacionActoresPoder === 'baja',
    'Lee poder más allá del organigrama + relación con actores de poder baja');

  P('AMBICION_CON_VULNERABILIDAD_POLITICA', ambicion === 'alta' && Prot === 'baja',
    'Ambición alta + Protección baja');

  P('AMBICION_CON_RED_INSUFICIENTE', ambicion === 'alta' && R === 'baja',
    'Ambición alta + Relaciones bajas');

  P('RELACIONES_SIN_RESPALDO_DE_RESULTADOS', R === 'alta' && D1 === 'baja',
    'Relaciones altas + Desempeño bajo');

  P('RESISTENCIA_MORAL_A_LA_POLITICA', q1Band === 'alta' && legitimidad === 'baja',
    'Q1 alto (relevancia política reconocida) + legitimidad baja');

  P('LEGITIMA_POLITICA_PERO_LA_LEE_POCO', legitimidad === 'alta' && E === 'baja',
    'Legitimidad alta + Entendimiento del poder bajo');

  P('OBJETIVO_SIN_ACCION', q8Band === 'alta' && (objetivoAccion === 'baja' || objetivoSinDefinir),
    'Q8 alto (claridad de meta) + Q9 bajo/sin objetivo definido');

  P('IDENTIFICA_PODER_PERO_NO_SE_ACERCA', E === 'alta' && relacionActoresPoder === 'baja',
    'Entendimiento del poder alto + relación con actores de poder baja');

  P('RED_INTERNA_SIN_RED_EXTERNA', redInterna === 'alta' && redExterna === 'baja',
    'Red interna (Q4/Q16) alta + red externa (Q36) baja');

  P('RED_EXTERNA_SIN_PENETRACION_INTERNA', redExterna === 'alta' && redInterna === 'baja',
    'Red externa (Q36) alta + red interna (Q4/Q16) baja');

  P('CONFRONTA_SIN_SUFICIENTE_LECTURA', signals.ALTA_DISPOSICION_A_CONFRONTAR && signals.ACTUA_SIN_LECTURA_SUFICIENTE,
    'Alta disposición a confrontar + actúa sin lectura suficiente', 'discrepancia');

  P('LEE_BIEN_PERO_PUEDE_NO_ACTUAR', signals.DIAGNOSTICA_ANTES_DE_ACTUAR && signals.TENDENCIA_A_EVITAR_BATALLAS,
    'Diagnostica antes de actuar + tendencia a evitar batallas', 'discrepancia');

  // SABE_PERO_NO_HACE (versión genérica coaliciones-vs-Relaciones) fue
  // retirado: TML determinó que no había suficiente equivalencia conceptual
  // entre "usa coaliciones estratégicamente" y la dimensión Relaciones en
  // bloque. En su lugar, TML aprobó tres discrepancias específicas —cada una
  // solo donde hay una correspondencia clara y directa entre un criterio
  // situacional y su conducta reportada equivalente—, ninguna de las cuales
  // duplica LEE_PODER_NO_CONSTRUYE_RELACIONES (que ya cubre lectura de poder
  // + Q32 bajo). Quedan configurables (arrays de preguntas fuente) para
  // ajuste posterior al piloto.

  // 1) Lectura de poder situacional (promedio de los ítems situacionales
  //    cuya dimensión primaria es Entendimiento del poder: Q5, Q11, Q17,
  //    Q24) alta + Q27 (conducta: "tratar de entender intereses/prioridades
  //    de actores") baja.
  const LECTURA_PODER_SITUACIONAL_QIDS = [5, 11, 17, 24];
  const lecturaPoderSituacionalBand = band3(avgNormalized(byQ, LECTURA_PODER_SITUACIONAL_QIDS));
  const q27Band = qBand(byQ, 27);
  P('LECTURA_DE_PODER_SIN_CONDUCTA_EQUIVALENTE',
    lecturaPoderSituacionalBand === 'alta' && q27Band === 'baja',
    'Lectura de poder situacional (Q5/Q11/Q17/Q24) alta + Q27 (conducta) bajo', 'discrepancia');

  // 2) Posicionamiento/visibilidad situacional (promedio de Q19 y Q25,
  //    ambos situacionales de dimensión primaria Desempeño y directamente
  //    sobre posicionamiento/visibilidad) alta + Q14 (conducta: visibilidad
  //    de resultados y contribución) baja.
  const POSICIONAMIENTO_VISIBILIDAD_SITUACIONAL_QIDS = [19, 25];
  const posicionamientoSituacionalBand = band3(avgNormalized(byQ, POSICIONAMIENTO_VISIBILIDAD_SITUACIONAL_QIDS));
  const q14Band = qBand(byQ, 14);
  P('POSICIONAMIENTO_SIN_VISIBILIDAD_CONDUCTUAL',
    posicionamientoSituacionalBand === 'alta' && q14Band === 'baja',
    'Posicionamiento/visibilidad situacional (Q19/Q25) alta + Q14 (conducta) bajo', 'discrepancia');

  // 3) Objetivo bien planteado en criterio situacional (Q22=B) + claridad de
  //    meta alta (Q8) + baja acción reportada (Q9 bajo o sin objetivo
  //    definido). Coexiste con OBJETIVO_SIN_ACCION (que no exige Q22B); esta
  //    versión es más estricta porque además exige el criterio situacional.
  P('OBJETIVO_BIEN_PLANTEADO_SIN_ACCION',
    letterIs(byQ, 22, ['B']) && q8Band === 'alta' && (objetivoAccion === 'baja' || objetivoSinDefinir),
    'Q22=B (objetivo bien planteado) + Q8 alto + Q9 bajo/sin objetivo definido', 'discrepancia');

  return active;
}

// Promedio simple de los valores normalizados (0-1) de una lista de
// preguntas, ignorando las que no fueron respondidas o son opt-out. Usado
// para construir bandas ad-hoc sobre subconjuntos de preguntas situacionales
// que no corresponden 1:1 a una dimensión completa ni a un tag existente.
function avgNormalized(byQ, qids) {
  const vals = qids.map(id => byQ[id] && byQ[id].normalized).filter(v => v !== null && v !== undefined);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
