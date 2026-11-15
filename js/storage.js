const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const initialWorkoutCategories = [
    'Sala Pesas (Máquinas guiadas)',
    'Fuerza en casa (mancuernas)',
    'Running (Método CACOS)',
    'Clase: Body Pump',
    'Clase: Spinning',
    'Descanso Activo / Estiramientos',
    'Descanso Total'
];

const defaultWeeklyAgenda = {
    'Lunes': { activity: 'Sala Pesas (Máquinas guiadas)', completed: false },
    'Martes': { activity: 'Running (Método CACOS)', completed: false },
    'Miércoles': { activity: 'Sala Pesas (Máquinas guiadas)', completed: false },
    'Jueves': { activity: 'Running (Método CACOS)', completed: false },
    'Viernes': { activity: 'Sala Pesas (Máquinas guiadas)', completed: false },
    'Sábado': { activity: 'Clase: Spinning', completed: false },
    'Domingo': { activity: 'Descanso Total', completed: false }
};

function formatDateKey(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getTodayName() {
    const jsDayIndex = new Date().getDay();
    return daysOfWeek[jsDayIndex === 0 ? 6 : jsDayIndex - 1];
}

function getWorkoutCategories() {
    const saved = DB.getItem('dreamfit_workout_categories');
    return saved ? JSON.parse(saved) : [...initialWorkoutCategories]; // copia: quien la modifique no debe tocar la lista original
}

function getLearnedWeights() {
    const saved = DB.getItem('dreamfit_learned_weights');
    return saved ? JSON.parse(saved) : {};
}

function saveLearnedWeight(machineName, weight) {
    const weights = getLearnedWeights();
    weights[machineName] = Number(weight);
    DB.setItem('dreamfit_learned_weights', JSON.stringify(weights));
}

function getAgenda() {
    const saved = DB.getItem('dreamfit_agenda_v2');
    return saved ? JSON.parse(saved) : structuredClone(defaultWeeklyAgenda);
}

function saveAgenda(agenda) {
    DB.setItem('dreamfit_agenda_v2', JSON.stringify(agenda));
    renderAgenda();
    renderMonthlyCalendar();
    updateTodayBadge();
}
const WORKOUT_RE = /\[(Entreno|Fuerza)\]/;

function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function safeParse(key, fallback) {
    try { const v = DB.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
}
function getTodayKey() { return formatDateKey(new Date()); }

// Completado por fecha (no por nombre de día)
function getLog() { return safeParse('dreamfit_log', {}); }
function isDayCompleted(key) { return !!getLog()[key]; }
function setDayCompleted(key, value) {
    const log = getLog();
    if (value) log[key] = true; else delete log[key];
    DB.setItem('dreamfit_log', JSON.stringify(log));
}

// Historial con fecha; acepta entradas antiguas (strings sin fecha)
function getHistory() {
    return safeParse('dreamfit_history', []).map(h => typeof h === 'string' ? { date: null, text: h } : h);
}
function addHistory(text, date = getTodayKey()) {
    const history = getHistory();
    history.unshift({ date, text });
    DB.setItem('dreamfit_history', JSON.stringify(history));
}
function hasWorkoutOn(key) { return getHistory().some(h => h.date === key && WORKOUT_RE.test(h.text)); }

function exportData() {
    const data = {};
    DB.keys().forEach(k => data[k] = DB.getItem(k));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    a.download = 'dreamfit-backup-' + getTodayKey() + '.json';
    a.click();
}
function importData(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            Object.entries(JSON.parse(reader.result)).forEach(([k, v]) => { if (k.startsWith('dreamfit_')) DB.setItem(k, v); });
            location.reload();
        } catch (e) { showToast('Archivo no válido'); }
    };
    reader.readAsText(file);
}

// Cambios de actividad para un día concreto (no tocan la rutina semanal)
function getOverrides() { return safeParse('dreamfit_overrides', {}); }
function setOverride(key, activity) {
    const o = getOverrides();
    if (activity === null) delete o[key]; else o[key] = activity;
    DB.setItem('dreamfit_overrides', JSON.stringify(o));
}
function getPlanFor(key, agenda = getAgenda(), overrides = getOverrides()) {
    if (overrides[key]) return overrides[key];
    const a = agenda[dayNameOf(dateFromKey(key))];
    return a ? a.activity : 'Descanso Total';
}
