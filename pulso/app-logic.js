/* ---- app-logic.js ---- */
/* =========================================================================
   LÓGICA DE LA APLICACIÓN — estado del cuestionario, navegación,
   renderizado de preguntas y del reporte final. PPO — Perfil Político
   Organizacional.

   Captura respuestas crudas + tiempo por ítem (sección 7: "guardar
   respuestas crudas, tiempos por ítem y, si es posible, cambios de
   respuesta"). Como el backend real todavía no existe, esa captura queda
   SIMULADA: vive en memoria y se deja un hook fetch() apagado
   (LEADS_ENDPOINT = null) listo para conectarse después, igual que se hizo
   con la captura de lead. AJUSTE piloto: ya NO se expone en window (antes
   window.__sessionLog / window.__lastEngineResult / __lastConfigurations /
   __lastReport) ni se imprime por consola -- ver PROGRESS_KEY más abajo para
   la única persistencia real que existe hoy (el avance del cuestionario en
   localStorage, sin nombre ni correo).
   ========================================================================= */

// Conectado al piloto: Apps Script vinculado a la Google Sheet del piloto
// (ver /sheets_integration/Code.gs y PPO_Sheets_Instrucciones.md). El token
// viaja en cada envío porque esta página es estática y no tiene backend
// propio que lo esconda -- es la misma limitación ya señalada al proponer
// este enfoque, aceptada para un piloto de pocos usuarios.
const LEADS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzj05qBcsUEHRE-K_bjLlZmGXZty6YLRvdflaQcn2oH44e8sWTXhoFBHJQBYE8u2kyW/exec';
const LEADS_TOKEN = '2MVqrUgrTP6hj-bEo_56arooVHv5c8co';

// Recuperación de avance (piloto): guarda SOLO índice/respuestas/tiempos del
// cuestionario en localStorage -- nunca nombre ni correo (eso se pide después
// de terminar las 36 preguntas y no se persiste). Se borra en cuanto se
// termina el cuestionario (ver finishQuiz), así que no sobrevive más allá de
// un cuestionario sin terminar en el mismo navegador/dispositivo.
const PROGRESS_KEY = 'ppo_progress_v1';

function saveProgress() {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({
      index: state.index,
      answers: state.answers,
      answerChanges: state.answerChanges,
      timings: state.timings
    }));
  } catch (e) { /* localStorage no disponible (privado/bloqueado): seguir sin persistir */ }
}

function clearProgress() {
  try { localStorage.removeItem(PROGRESS_KEY); } catch (e) { /* no-op */ }
}

function loadSavedProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.index !== 'number' || parsed.index < 0 || parsed.index >= QUESTIONS.length) return null;
    if (!parsed.answers || typeof parsed.answers !== 'object' || Object.keys(parsed.answers).length === 0) return null;
    return parsed;
  } catch (e) { return null; }
}

const state = {
  index: 0,               // índice de la pregunta actual (0-based)
  answers: {},             // { [questionId]: {value} | {letter} }
  answerChanges: {},        // { [questionId]: número de veces que cambió la respuesta }
  timings: {},             // { [questionId]: { shownAt, answeredAt } }
  lead: null
};

const qContainer = document.getElementById('qContainer');
const progressFill = document.getElementById('progressFill');
const progressLabel = document.getElementById('progressLabel');
const btnNext = document.getElementById('btnNext');
const btnBack = document.getElementById('btnBack');
const btnStart = document.getElementById('btnStart');
const resumeNotice = document.getElementById('resumeNotice');

// Medición: envía el evento a GA4 y Meta Pixel si están cargados; nunca bloquea.
function track(gaName, fbName) {
  try { if (typeof gtag === 'function') gtag('event', gaName); } catch (e) {}
  try { if (typeof fbq === 'function' && fbName) fbq('track', fbName); } catch (e) {}
}
var ctaPodder = document.getElementById('ctaPodder');
if (ctaPodder) ctaPodder.addEventListener('click', function () { track('pulso_cta_podder'); });

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// Si hay avance guardado de un cuestionario sin terminar en este mismo
// navegador, se ofrece continuar en vez de obligar a empezar de nuevo.
const savedProgress = loadSavedProgress();
if (savedProgress && resumeNotice && btnStart) {
  resumeNotice.textContent = 'Ya habías comenzado tu Pulso (ibas en la pregunta ' + (savedProgress.index + 1) + ' de ' + QUESTIONS.length + '). Al continuar, seguirás donde lo dejaste.';
  resumeNotice.hidden = false;
  btnStart.textContent = 'Continuar';
}

btnStart.addEventListener('click', function () { track('pulso_inicio'); });
btnStart.addEventListener('click', () => {
  if (savedProgress) {
    state.index = savedProgress.index;
    state.answers = savedProgress.answers || {};
    state.answerChanges = savedProgress.answerChanges || {};
    state.timings = savedProgress.timings || {};
  }
  showScreen('screen-quiz');
  renderQuestion();
});

function currentAnswerIsSet(q) {
  const a = state.answers[q.id];
  if (!a) return false;
  if (q.format === 'orientacion') return typeof a.value === 'number';
  return !!a.letter;
}

function renderQuestion() {
  const q = QUESTIONS[state.index];
  const total = QUESTIONS.length;

  // AJUSTE piloto: se cuenta la pregunta actual como parte del avance (antes
  // quedaba en 97% en la última pregunta y nunca llegaba a 100%).
  progressFill.style.width = Math.round(((state.index + 1) / total) * 100) + '%';
  progressLabel.textContent = 'Pregunta ' + (state.index + 1) + ' de ' + total;

  saveProgress();

  if (!state.timings[q.id]) state.timings[q.id] = { shownAt: Date.now(), answeredAt: null };
  else state.timings[q.id].shownAt = state.timings[q.id].shownAt || Date.now();

  let html = '<div class="q-text">' + escapeHtml(q.text) + '</div>';

  if (q.format === 'orientacion') {
    const existing = state.answers[q.id] ? state.answers[q.id].value : Math.round((q.left.value + q.right.value) / 2);
    html += '<div class="bipolar">' +
      '<div class="bipolar-labels"><p>' + escapeHtml(q.left.text) + '</p><p class="right">' + escapeHtml(q.right.text) + '</p></div>' +
      '<div class="bipolar-slider-row">' +
        '<input type="range" id="rangeInput" min="' + q.left.value + '" max="' + q.right.value + '" value="' + existing + '" ' + (state.answers[q.id] ? '' : 'data-untouched="1"') + '>' +
        '<div class="bipolar-value" id="rangeValue">' + (state.answers[q.id] ? existing : '—') + '</div>' +
      '</div>' +
      '<div class="bipolar-scale-nums"><span>' + q.left.value + '</span><span>' + q.right.value + '</span></div>' +
      '</div>';
  } else {
    html += '<div class="options" id="optionsWrap">';
    q.options.forEach(opt => {
      const selected = state.answers[q.id] && state.answers[q.id].letter === opt.letter;
      html += '<div class="option-card' + (selected ? ' selected' : '') + '" data-letter="' + opt.letter + '">' + escapeHtml(opt.t) + '</div>';
    });
    html += '</div>';
  }

  qContainer.innerHTML = html;

  if (q.format === 'orientacion') {
    const range = document.getElementById('rangeInput');
    const valueEl = document.getElementById('rangeValue');
    range.addEventListener('input', () => {
      valueEl.textContent = range.value;
      registerAnswer(q, { value: parseInt(range.value, 10) });
      btnNext.disabled = false;
    });
    if (state.answers[q.id]) btnNext.disabled = false;
    else btnNext.disabled = true; // requiere interacción explícita, incluso en escalas bipolares
  } else {
    document.querySelectorAll('#optionsWrap .option-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('#optionsWrap .option-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        registerAnswer(q, { letter: card.getAttribute('data-letter') });
        btnNext.disabled = false;
      });
    });
    btnNext.disabled = !currentAnswerIsSet(q);
  }

  btnBack.style.visibility = state.index === 0 ? 'hidden' : 'visible';
  btnNext.textContent = state.index === total - 1 ? 'Ver mi resultado' : 'Siguiente';
}

function registerAnswer(q, value) {
  if (state.answers[q.id]) {
    state.answerChanges[q.id] = (state.answerChanges[q.id] || 0) + 1;
  }
  state.answers[q.id] = value;
  if (state.timings[q.id]) state.timings[q.id].answeredAt = Date.now();
  saveProgress();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

btnNext.addEventListener('click', () => {
  const q = QUESTIONS[state.index];
  if (!currentAnswerIsSet(q)) return;
  if (state.index < QUESTIONS.length - 1) {
    state.index += 1;
    renderQuestion();
    window.scrollTo({ top: 0, behavior: 'instant' });
  } else {
    finishQuiz();
  }
});

btnBack.addEventListener('click', () => {
  if (state.index > 0) {
    state.index -= 1;
    renderQuestion();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
});

function finishQuiz() {
  // El cuestionario ya se completó: se borra el avance guardado (piloto) --
  // ya no hace falta poder "continuar" un cuestionario que ya se terminó.
  clearProgress();
  showScreen('screen-lead');
}

document.getElementById('leadForm').addEventListener('submit', (e) => {
  e.preventDefault();
  state.lead = {
    name: document.getElementById('leadName').value.trim(),
    email: document.getElementById('leadEmail').value.trim(),
    consent: document.getElementById('leadConsent').checked
  };
  track('pulso_completado', 'Lead');

  showScreen('screen-transition');
  setTimeout(showResults, 1400);
});

// Arma el payload EXACTO que espera Code.gs -- solo los campos aprobados
// (fecha la pone la propia Sheet; nombre/correo; Q1-Q36 respuesta cruda;
// T1-T36 segundos por pregunta; 6 scores PODDER + RP; 7 configuraciones
// narrativas). Nunca incluye signals, raw tags, patrones ni ningún otro
// objeto interno del motor.
function buildSheetsPayload(engineResult, cfg, report) {
  const payload = {
    token: LEADS_TOKEN,
    nombre: state.lead ? state.lead.name : '',
    correo: state.lead ? state.lead.email : '',
    consentimiento: state.lead && state.lead.consent ? 'SI' : 'NO',
    origen: 'landing-podder'
  };

  for (let id = 1; id <= 36; id++) {
    const a = state.answers[id];
    payload['Q' + id] = a ? (a.letter !== undefined ? a.letter : a.value) : '';
    const t = state.timings[id];
    payload['T' + id] = (t && t.answeredAt && t.shownAt)
      ? Math.round((t.answeredAt - t.shownAt) / 100) / 10 // segundos, 1 decimal
      : '';
  }

  // report.podder trae los 6 scores PODDER como {code: 'P'|'O'|'D1'|'D2'|'E'|'R', score10}.
  // cfg usa DESEMPENO/DESTREZA en vez de D1/D2 para las mismas dos dimensiones.
  const scoreByCode = {};
  report.podder.forEach(d => { scoreByCode[d.code] = d.score10; });
  payload.score_proteccion = scoreByCode.P;
  payload.score_objetivo = scoreByCode.O;
  payload.score_desempeno = scoreByCode.D1;
  payload.score_destreza = scoreByCode.D2;
  payload.score_entendimiento_poder = scoreByCode.E;
  payload.score_relaciones = scoreByCode.R;
  payload.score_relacion_politica = report.relacionConPolitica.score10;

  payload.config_proteccion = cfg.P.code || '';
  payload.config_objetivo = cfg.O.code || '';
  payload.config_desempeno = cfg.DESEMPENO.code || '';
  payload.config_destreza = cfg.DESTREZA.code || '';
  payload.config_entendimiento_poder = cfg.E.code || '';
  payload.config_relaciones = cfg.R.code || '';
  payload.config_relacion_politica = cfg.RP.visibleCode || '';

  return payload;
}

// Envío a la Google Sheet del piloto: "fire and forget", nunca bloquea ni
// condiciona que el participante vea su reporte. mode:'no-cors' es
// necesario porque Apps Script (Web App) no agrega cabeceras CORS -- eso
// significa que no podemos leer la respuesta desde el navegador, así que el
// único chequeo real de éxito/fallo se hace mirando la Sheet directamente.
function sendToSheets(payload) {
  if (!LEADS_ENDPOINT) return;
  try {
    fetch(LEADS_ENDPOINT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) })
      .catch(() => {/* no bloquear la experiencia del participante si falla el envío */});
  } catch (e) { /* fetch no disponible o bloqueado: no bloquear la experiencia */ }
}

function showResults() {
  const engineResult = runEngine(QUESTIONS, DIM_ORDER, state.answers);
  const cfg = computeConfigurations(engineResult);
  const report = buildReport(engineResult, cfg, DIM_NAMES, DIM_ORDER);

  sendToSheets(buildSheetsPayload(engineResult, cfg, report));

  document.getElementById('resultsName').textContent = state.lead && state.lead.name
    ? 'El perfil político de ' + state.lead.name.split(' ')[0]
    : 'Tu perfil político';

  document.getElementById('perfilText').textContent = report.perfil;

  renderPodderDims(report.podder, report.relacionConPolitica);

  const favorList = document.getElementById('fortalezasList');
  favorList.innerHTML = report.favor.map(f =>
    '<div class="mini-card"><p class="mini-title">' + escapeHtml(f.title) + '</p><p class="mini-text">' + escapeHtml(f.text) + '</p></div>'
  ).join('');

  const limitaList = document.getElementById('vulnerabilidadesList');
  limitaList.innerHTML = report.limita.map(v =>
    '<div class="mini-card risk"><p class="mini-title">' + escapeHtml(v.title) + '</p><p class="mini-text">' + escapeHtml(v.text) + '</p></div>'
  ).join('');

  showScreen('screen-results');
}

// Número + barra únicamente: SIN texto de banda (ni "Alta"/"Media"/"Baja")
// en ningún elemento visible, tal como exige esta ronda. RP se pinta aparte,
// como meta-dimensión, nunca como una séptima letra de PODDER.
function renderPodderDims(podder, relacionConPolitica) {
  const podderWrap = document.getElementById('podderDims');
  podderWrap.innerHTML = podder.map(d => dimRowHtml(d)).join('');

  const rpWrap = document.getElementById('rpDim');
  rpWrap.innerHTML = dimRowHtml(relacionConPolitica, true);
}

function dimRowHtml(d, isMeta) {
  const pct = Math.max(0, Math.min(100, Math.round((d.score10 / 10) * 100)));
  const scoreLabel = d.score10 === null || d.score10 === undefined ? '—' : d.score10.toFixed(1).replace('.', ',');
  const letter = isMeta ? 'RP' : d.letter;
  return (
    '<div class="dim-row">' +
      '<div class="dim-letter">' + escapeHtml(letter) + '</div>' +
      '<div class="dim-mid">' +
        '<div class="dim-name">' + escapeHtml(d.label) + '</div>' +
        '<div class="dim-track"><div class="dim-fill" style="width:' + pct + '%"></div></div>' +
      '</div>' +
      '<div class="dim-right"><span class="dim-score">' + scoreLabel + '</span></div>' +
    '</div>'
  );
}
