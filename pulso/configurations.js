/* ---- configurations.js ---- */
/* =========================================================================
   Capa interpretativa — Configuraciones narrativas PODDER (V1)

   Consume EXCLUSIVAMENTE la salida de runEngine() (dims, tags, byQ, signals,
   patterns) tal como está definida en engine.js. NO modifica ni reimplementa
   las 36 preguntas, el scoring base, los raw tags, las señales ni los
   patrones existentes — el motor V1 queda congelado, sin cambios.

   Esta capa añade una interpretación DENTRO de cada dimensión PODDER
   (configuraciones P1–P4, O1–O3, Desempeño-1..4, Destreza-1..6, E1–E3,
   R1–R4) y de la meta-dimensión Relación con la Política (RP1/RP2A/RP2B/RP3,
   con RP2A/RP2B mostrándose siempre como la misma categoría visible "RP2").
   También decide qué patrones cruzados del motor ya quedaron reemplazados
   y no deben volver a mostrarse (SUPPRESSED_PATTERNS), y calcula el único
   patrón cruzado nuevo autorizado: LEE_PODER_PERO_NO_SE_ACERCA.

   Mapeo aprobado por TML — ver QA_Mapeo_Configuraciones_Narrativas_PODDER.md
   (versión final v4) para la justificación de cada regla, sus niveles de
   soporte y las tensiones/decisiones documentadas.

   Ninguna configuración es obligatoria: si la evidencia relevante cae en
   banda "media" (zona intermedia), el campo `code` queda en null — "sin
   configuración narrativa marcada" — tal como exige el principio general
   de la ronda de decisiones TML. El score de la dimensión se sigue
   mostrando igual, esta capa solo decide si hay o no una interpretación
   narrativa adicional que ofrecer.
   ========================================================================= */

// band3 ya existe como función global (declarada con `function band3(...)`
// en engine.js) cuando este archivo se concatena junto a engine.js en
// index.html (mismo <script>, mismo scope). En Node (pruebas, QA) no hay
// ese scope compartido, así que se importa explícitamente. OJO: el binding
// local se llama `band3Ref`, NUNCA `band3` -- declarar `const band3 = ...`
// en un scope donde ya existe `function band3(){}` es un SyntaxError
// ("Identifier 'band3' has already been declared"), detectado al probar la
// concatenación real dentro de index.html.
const band3Ref = (typeof module !== 'undefined' && module.exports)
  ? require('./engine.js').band3
  : band3;

// Patrones cruzados del motor V1 que quedaron reemplazados por una
// configuración PODDER (o por el nuevo patrón único LEE_PODER_PERO_NO_SE_ACERCA)
// y que, por decisión TML, ya NO deben mostrarse en el reporte narrativo.
// El motor los sigue calculando internamente sin cambios — esta lista solo
// controla qué se muestra, nunca qué se calcula.
const SUPPRESSED_PATTERNS = [
  'OBJETIVO_SIN_ACCION',               // absorbido por O2
  'RESULTADOS_SIN_VISIBILIDAD',        // absorbido por Desempeño-2
  'IDENTIFICA_PODER_PERO_NO_SE_ACERCA',// reemplazado por LEE_PODER_PERO_NO_SE_ACERCA
  'LEE_PODER_NO_CONSTRUYE_RELACIONES', // reemplazado por LEE_PODER_PERO_NO_SE_ACERCA
  'RESISTENCIA_MORAL_A_LA_POLITICA'    // absorbido por RP2 (ruta RP2B), alcance más estrecho — ver hallazgo en el mapeo v4
];

// ---- Helpers de lectura sobre byQ (sin efectos secundarios, solo lectura) ----
function qNorm(byQ, qid) {
  const q = byQ[qid];
  return q && q.normalized !== null && q.normalized !== undefined ? q.normalized : null;
}
function qBand(byQ, qid) {
  const n = qNorm(byQ, qid);
  return n === null ? null : band3Ref(n);
}
function avgNorm(byQ, qids) {
  const vals = qids.map(id => qNorm(byQ, id)).filter(v => v !== null);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
function avgBand(byQ, qids) {
  const a = avgNorm(byQ, qids);
  return a === null ? null : band3Ref(a);
}

// ---- P — Protección ----
// Eje "detección externa": decisión TML de corrección (ronda de reachability)
// — la banda 0.35/0.65 de Q3 nunca alcanza 'baja' con la clave real (el
// score mínimo de Q3 es 2/4), así que P3/P4 quedaban inalcanzables. Se
// reemplaza band3(Q3) por una lectura directa de la ESTRATEGIA elegida
// (rawTag), no de su score numérico:
//   - alta: Q3=B (OBSERVA_PATRON_POLITICO)
//   - baja: Q3=A (PRESUNCION_DIFERENCIA_PROFESIONAL) o Q3=D
//     (RESPONDE_POLITICA_CON_FORTALEZA_TECNICA)
//   - Q3=C (INTERVIENE_RELACION_TEMPRANO) queda INDETERMINADA para este eje
//     (null) — no debe forzar ninguna de las 4 configuraciones.
// Q21 sigue siendo, por decisión TML, apoyo débil que puede CORROBORAR esta
// lectura pero nunca sustituirla: no participa del cálculo de `deteccion`,
// solo queda documentado/disponible para un futuro modificador si TML lo
// pide explícitamente con su propia regla letra-por-letra.
// Eje "autorregulación": promedio de Q18+Q29 (ambos conductuales, sin cambios).
function computeP(byQ) {
  const q3 = byQ[3];
  const q3Tag = q3 && !q3.optOut ? q3.rawTag : null;
  let deteccion = null;
  if (q3Tag === 'OBSERVA_PATRON_POLITICO') deteccion = 'alta';
  else if (q3Tag === 'PRESUNCION_DIFERENCIA_PROFESIONAL' || q3Tag === 'RESPONDE_POLITICA_CON_FORTALEZA_TECNICA') deteccion = 'baja';
  // q3Tag === 'INTERVIENE_RELACION_TEMPRANO' (Q3=C), o sin respuesta: deteccion queda null.

  const autorregulacion = avgBand(byQ, [18, 29]);
  let code = null;
  if (deteccion === 'alta' && autorregulacion === 'alta') code = 'P1';
  else if (deteccion === 'alta' && autorregulacion === 'baja') code = 'P2';
  else if (deteccion === 'baja' && autorregulacion === 'alta') code = 'P3';
  else if (deteccion === 'baja' && autorregulacion === 'baja') code = 'P4';
  return { code, axes: { deteccion, autorregulacion } };
}

// ---- O — Objetivo ----
// Q8 (orientación) = claridad. Q9 (tag OBJETIVO_ACCION) = acción. El motor
// registra el opt-out "sin objetivo definido" (letra F) como un tag
// INDEPENDIENTE, OBJETIVO_SIN_DEFINIR (nunca como .optOut sobre el tag
// OBJETIVO_ACCION en sí — verificado contra engine.js, que usa exactamente
// este mismo patrón en computePatterns para leer el opt-out de Q9), así que
// hay que consultarlo por separado, igual que hace el propio motor. Q22 es
// refinamiento/modificador, nunca activador.
function computeO(byQ, tags) {
  const claridad = qBand(byQ, 8);
  const objetivoSinDefinir = !!(tags.OBJETIVO_SIN_DEFINIR && tags.OBJETIVO_SIN_DEFINIR.optOut);
  const objAccionTag = tags.OBJETIVO_ACCION;
  const accion = objetivoSinDefinir ? 'sin_objetivo' : (objAccionTag ? objAccionTag.band : null);

  let code = null;
  if (claridad === 'alta' && accion === 'alta') code = 'O1';
  else if (claridad === 'alta' && (accion === 'baja' || accion === 'sin_objetivo')) code = 'O2';
  else if (claridad === 'baja' || accion === 'sin_objetivo') code = 'O3';

  const q22 = byQ[22];
  const objetivoBienPlanteado = !!(q22 && !q22.optOut && q22.letter === 'B');

  return { code, axes: { claridad, accion }, modifiers: { objetivoBienPlanteado } };
}

// ---- Desempeño (dimensión interna D1) ----
// Resultados/diferenciación: Q2+Q12 (conductuales). Visibilidad: tag
// VISIBILIDAD ya calculado por el motor (Q14+Q25). Q19 (posicionamiento
// situacional) es modificador, nunca entra en la clasificación base.
function computeDesempeno(byQ, tags) {
  const resultadosDiferenciacion = avgBand(byQ, [2, 12]);
  const visTag = tags.VISIBILIDAD;
  const visibilidad = visTag ? visTag.band : null;
  const posicionamiento = qBand(byQ, 19);

  let code = null;
  if (resultadosDiferenciacion === 'alta' && visibilidad === 'alta') code = 'DESEMPENO_1';
  else if (resultadosDiferenciacion === 'alta' && visibilidad === 'baja') code = 'DESEMPENO_2';
  else if (visibilidad === 'alta' && resultadosDiferenciacion === 'baja') code = 'DESEMPENO_3';
  else if (resultadosDiferenciacion === 'baja' && visibilidad === 'baja') code = 'DESEMPENO_4';

  return { code, axes: { resultadosDiferenciacion, visibilidad }, modifiers: { posicionamiento } };
}

// ---- Destreza (dimensión interna D2) ----
// Ejes por promedio: adaptación=Q10 (único; ya NO se llama "diplomacia"),
// conflicto=avg(Q15,Q26), discreción=Q23 (único, conductual),
// autoridad=avg(Q28,Q34). Ambición (Q6) es modificador, nunca eje propio.
// Orden de prioridad documentado: primero las dos configuraciones ancladas
// en señales ya validadas por QA (más específicas), luego las basadas en
// promedios de 1-2 preguntas propias de D2.
function computeDestreza(byQ, signals) {
  const adaptacion = qBand(byQ, 10);
  const conflicto = avgBand(byQ, [15, 26]);
  const discrecion = qBand(byQ, 23);
  const autoridad = avgBand(byQ, [28, 34]);

  let code = null;
  if (signals.ALTA_DISPOSICION_A_CONFRONTAR && !signals.SELECCIONA_Y_PREPARA_BATALLAS) {
    code = 'DESTREZA_2';
  } else if (adaptacion === 'alta' && signals.TENDENCIA_A_EVITAR_BATALLAS) {
    code = 'DESTREZA_3';
  } else if (adaptacion === 'alta' && conflicto === 'alta' && discrecion === 'alta' && autoridad === 'alta') {
    code = 'DESTREZA_1';
  // DESTREZA_5 — decisión TML de corrección (ronda de reachability): la
  // condición original (adaptacion alta + autoridad==='baja') era
  // inalcanzable porque avg(Q28,Q34) nunca baja de 0.625 con la clave real.
  // Nueva condición: Q10 alta + Q23 alta + autoridad NO-alta (no exige
  // 'baja' específicamente). La narrativa (CONFIG_TEXT, fuera de este
  // archivo) ya describe esto como autoridad/presencia relativamente menos
  // desarrollada, nunca como una deficiencia absoluta.
  } else if (adaptacion === 'alta' && discrecion === 'alta' && autoridad !== 'alta') {
    code = 'DESTREZA_5';
  } else if (autoridad === 'alta' && adaptacion !== 'alta' && discrecion !== 'alta') {
    code = 'DESTREZA_6';
  } else {
    // DESTREZA_4 — decisión TML de corrección (ronda de reachability): el
    // umbral original (>=3 de 4 ejes en 'baja') era inalcanzable porque
    // autoridad y conflicto nunca llegan a 'baja' con la clave real (su
    // promedio mínimo alcanzable es 0.625 y 0.5 respectivamente). Se
    // reemplaza por ">=3 de 4 ejes NO-altos" (incluye 'baja' y 'media').
    //
    // Ajuste TML posterior (ronda de confirmación): ese ">=3 no-altos" hacía
    // que el perfil neutro puro (los 4 ejes en 'media', sin ninguna señal ni
    // hacia arriba ni hacia abajo) activara DESTREZA_4 -- decisión: ese caso
    // exacto debe quedar sin configuración marcada, no DESTREZA_4. Ajuste
    // mínimo: se excluye únicamente cuando los 4 ejes son 'media' a la vez;
    // cualquier otra combinación que cumpla ">=3 no-altos" (incluyendo las
    // que mezclan 'media' con 'baja', o con un único eje 'alta') sigue
    // activando DESTREZA_4 exactamente igual que antes de este ajuste.
    const axesNoAlta = [adaptacion, conflicto, discrecion, autoridad].filter(b => b !== 'alta').length;
    const todosMedia = [adaptacion, conflicto, discrecion, autoridad].every(b => b === 'media');
    if (axesNoAlta >= 3 && !todosMedia) code = 'DESTREZA_4';
  }

  return { code, axes: { adaptacion, conflicto, discrecion, autoridad } };
}

// ---- E — Entendimiento del Poder ----
// Lectura: avg(Q5,Q11,Q17,Q24) — mismo grupo que ya usaba el motor para la
// discrepancia LECTURA_DE_PODER_SIN_CONDUCTA_EQUIVALENTE. Aplicación:
// avg(Q27,Q32). El cruce con Q32 (RELACION_ACTORES_PODER) ya NO es una
// configuración de E: es el único patrón cruzado autorizado
// LEE_PODER_PERO_NO_SE_ACERCA, calculado aquí mismo y expuesto aparte.
//
// E3 — decisión TML de corrección (ronda de reachability): la regla
// original (byQ[5].rawTag==='PODER_COMO_POSICION_REPUTACION' Y
// byQ[11].rawTag==='EQUIPARA_PODER_CON_AUTORIDAD' a la vez) era
// inalcanzable Y estaba mal cableada — ambos raw tags viven como OPCIONES
// ALTERNATIVAS de la MISMA pregunta (Q11: opción A y opción C
// respectivamente), nunca de Q5, así que "los dos presentes a la vez" es
// lógicamente imposible para cualquier persona. Se reemplaza por la señal
// ya calculada por el motor V1 (congelado, sin cambios): `LECTURA_FORMAL_
// DEL_PODER` (>=2 evidencias entre Q5=A, Q11=C, Q17=A, Q24=C — ver
// engine.js computeSignals), que captura la misma idea ("lectura
// predominantemente formal del poder") sin la incompatibilidad de origen.
function computeE(byQ, tags, signals) {
  const lectura = avgBand(byQ, [5, 11, 17, 24]);
  const aplicacion = avgBand(byQ, [27, 32]);

  let code = null;
  if (signals.LECTURA_FORMAL_DEL_PODER === true) code = 'E3';
  else if (lectura === 'alta' && aplicacion === 'alta') code = 'E1';
  else if (lectura !== null && lectura !== 'baja' && aplicacion === 'media') code = 'E2';

  const relacionActoresPoder = tags.RELACION_ACTORES_PODER ? tags.RELACION_ACTORES_PODER.band : null;
  const leePoderPeroNoSeAcerca = lectura === 'alta' && relacionActoresPoder === 'baja';

  return {
    code,
    axes: { lectura, aplicacion },
    crossPattern: { LEE_PODER_PERO_NO_SE_ACERCA: leePoderPeroNoSeAcerca }
  };
}

// ---- R — Relaciones ----
// R1–R4 se calculan solo con Q4 (amplitud) × Q16 (deliberación), ambas red
// interna. Red externa (Q36), manejo de adversarios (Q30/Q31) y relación con
// actores de poder (Q32, aunque vive estructuralmente en E) son modificadores
// narrativos, nunca cambian la configuración base.
function computeR(byQ, tags, signals) {
  const q4 = qBand(byQ, 4);
  const q16 = qBand(byQ, 16);

  let code = null;
  if (q4 === 'alta' && q16 === 'alta') code = 'R1';
  else if (q16 === 'alta' && q4 === 'baja') code = 'R2';
  else if (q4 === 'alta' && q16 === 'baja') code = 'R3';
  else if (q4 === 'baja' && q16 === 'baja') code = 'R4';

  const redExterna = tags.RED_EXTERNA ? tags.RED_EXTERNA.band : null;
  const relacionActoresPoder = tags.RELACION_ACTORES_PODER ? tags.RELACION_ACTORES_PODER.band : null;
  const q31 = byQ[31];
  let manejoAdversarios = 'no_determinado';
  if (signals.GESTIONA_ADVERSARIO_ESTRATEGICAMENTE) manejoAdversarios = 'estrategico';
  else if (q31 && q31.optOut) manejoAdversarios = 'sin_adversario_identificado';
  else if (q31 && q31.rawTag === 'ADVERSARIO_NO_COMPRENDIDO') manejoAdversarios = 'deficiente';

  return { code, axes: { q4, q16 }, modifiers: { redExterna, relacionActoresPoder, manejoAdversarios } };
}

// ---- RP — Relación con la Política (meta-dimensión), cascada aprobada ----
// Orden fijo: Realismo (Q20) → Relevancia (Q1) → Legitimidad (Q35). Si un
// paso relevante cae en banda "media", la cascada se corta ahí y no se marca
// ninguna configuración RP (aunque el score de RP se siga mostrando).
// RP2A y RP2B son dos rutas internas que se muestran siempre como la misma
// categoría visible "RP2".
function computeRP(byQ, signals) {
  const realismo = qBand(byQ, 20);
  const relevancia = qBand(byQ, 1);
  const legitimidad = qBand(byQ, 35);

  let code = null;
  if (realismo === 'baja') {
    code = 'RP3';
  } else if (realismo === 'alta') {
    if (relevancia === 'baja') {
      code = 'RP2A';
    } else if (relevancia === 'alta') {
      if (legitimidad === 'baja') code = 'RP2B';
      else if (legitimidad === 'alta') code = 'RP1';
    }
  }
  // realismo === 'media', o el siguiente paso relevante en 'media': code queda null.

  const visibleCode = (code === 'RP2A' || code === 'RP2B') ? 'RP2' : code;
  const participacion = qBand(byQ, 33); // corroboración/matiz, nunca activador
  const meritoCorrobora = !!signals.CONFIA_EXCESIVAMENTE_EN_MERITO_RESULTADOS; // corrobora RP3, no la activa por sí sola

  return {
    code,
    visibleCode,
    axes: { realismo, relevancia, legitimidad },
    modifiers: { participacion, meritoCorrobora }
  };
}

/**
 * Punto de entrada de la capa interpretativa. Recibe el resultado COMPLETO
 * de runEngine() (motor V1 congelado, sin cambios) y devuelve la
 * configuración narrativa de cada dimensión/meta-dimensión más la lista de
 * patrones cruzados que sí deben mostrarse (ya sin los absorbidos, más el
 * nuevo patrón único LEE_PODER_PERO_NO_SE_ACERCA cuando corresponda).
 */
function computeConfigurations(engineResult) {
  const { byQ, tags, signals, patterns } = engineResult;

  const P = computeP(byQ);
  const O = computeO(byQ, tags);
  const DESEMPENO = computeDesempeno(byQ, tags);
  const DESTREZA = computeDestreza(byQ, signals);
  const E = computeE(byQ, tags, signals);
  const R = computeR(byQ, tags, signals);
  const RP = computeRP(byQ, signals);

  const visiblePatterns = patterns
    .filter(p => SUPPRESSED_PATTERNS.indexOf(p.code) === -1)
    .map(p => ({ code: p.code, label: p.label, type: p.type }));

  if (E.crossPattern.LEE_PODER_PERO_NO_SE_ACERCA) {
    visiblePatterns.push({
      code: 'LEE_PODER_PERO_NO_SE_ACERCA',
      label: 'Lectura de poder alta + relación con actores de poder (Q32) baja',
      type: 'discrepancia'
    });
  }

  return { P, O, DESEMPENO, DESTREZA, E, R, RP, visiblePatterns };
}
