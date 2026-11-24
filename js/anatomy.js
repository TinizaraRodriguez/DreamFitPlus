// Ficha visual de cada ejercicio: figura anatómica (SVG propio) con los músculos trabajados en rojo,
// vídeo real de YouTube (uno por ejercicio) y el error más común. Sin dependencias externas.
const MUSCLE_NAMES = { chest: 'Pecho', shoulder: 'Hombro', rear: 'Hombro posterior', biceps: 'Bíceps', triceps: 'Tríceps', forearm: 'Antebrazo', abs: 'Abdomen', obliques: 'Oblicuos', lats: 'Dorsales', midback: 'Espalda media', lowback: 'Lumbar', glutes: 'Glúteos', quads: 'Cuádriceps', hams: 'Femorales', calves: 'Gemelos' };
// formas dibujadas en la mitad izquierda (se reflejan); c = pieza central, dibujada una sola vez. f = vista frontal, b = trasera
const MUSCLE_SHAPES = {
    chest:    { f: ['M32 38 Q42 35 49 40 L49 55 Q40 58 33 51 Z'] },
    shoulder: { f: ['M25 33 Q31 31 33 38 Q32 46 25 47 Q21 40 25 33 Z'] },
    rear:     { b: ['M25 33 Q31 31 33 38 Q32 46 25 47 Q21 40 25 33 Z'] },
    biceps:   { f: ['M24 48 Q30 47 31 52 L27 70 Q22 72 20 68 Z'] },
    triceps:  { b: ['M24 48 Q30 47 31 52 L27 70 Q22 72 20 68 Z'] },
    forearm:  { f: ['M20 72 L26 74 L21 104 L15 104 Z'], b: ['M20 72 L26 74 L21 104 L15 104 Z'] },
    obliques: { f: ['M35 58 L42 58 L43 96 Q38 94 35 86 Z'] },
    lats:     { b: ['M32 42 L46 56 L44 82 Q38 82 35 70 Z'] },
    glutes:   { b: ['M32 102 Q42 98 49 104 L49 122 Q38 126 32 118 Z'] },
    quads:    { f: ['M33 108 L48 108 L47 148 L37 148 Q32 130 33 108 Z'] },
    hams:     { b: ['M33 126 L48 126 L47 150 L37 150 Q32 140 33 126 Z'] },
    calves:   { b: ['M37 154 L47 154 L45 182 L39 182 Z'] }
};
const MUSCLE_CENTER = {
    abs:      { f: ['M43 58 L57 58 L56 98 Q50 102 44 98 Z'] },
    midback:  { b: ['M38 34 Q50 30 62 34 L56 58 L44 58 Z'] },
    lowback:  { b: ['M44 84 L56 84 L56 100 L44 100 Z'] }
};
const BODY_PATHS = [
    'M30 32 Q50 27 70 32 L66 70 Q64 92 66 104 L34 104 Q36 92 34 70 Z',                  // tronco
    'M30 33 Q22 34 20 44 L16 76 L25 78 L31 48 Z', 'M16 76 L11 108 L19 110 L25 78 Z',  // brazo y antebrazo
    'M32 104 L50 104 L49 152 L36 152 Q31 128 32 104 Z', 'M36 152 L48 152 L46 198 L38 198 Z' // muslo y pierna
];
function bodySvg(view, P, S) {
    const mir = d => `<g transform="translate(100 0) scale(-1 1)">${d}</g>`;
    const body = BODY_PATHS.map(d => `<path d="${d}"/>`).join('');
    const layer = (names, cls) => names.map(n => {
        const half = (MUSCLE_SHAPES[n] || {})[view], mid = (MUSCLE_CENTER[n] || {})[view];
        const h = half ? half.map(d => `<path d="${d}"/>`).join('') : '';
        return `<g class="${cls}">${h}${half ? mir(h) : ''}${mid ? mid.map(d => `<path d="${d}"/>`).join('') : ''}</g>`;
    }).join('');
    return `<svg viewBox="0 0 100 204" class="h-44 w-auto" aria-hidden="true">
        <g fill="#cbd5e1"><circle cx="50" cy="14" r="10"/><rect x="45" y="22" width="10" height="9" rx="3"/>${body}${mir(body)}</g>
        <g fill="#fca5a5">${layer(S, 's')}</g><g fill="#ef4444">${layer(P, 'p')}</g></svg>`;
}
function exerciseFigure(info) {
    if (!info) return '';
    const P = info.p || [], S = (info.s || []).filter(x => !P.includes(x));
    const names = n => n.map(x => MUSCLE_NAMES[x]).filter(Boolean).join(', ');
    return `<div class="df-fig flex items-center justify-center gap-2 bg-slate-50 rounded-xl py-3" role="img" aria-label="Músculos que trabaja: ${names(P)}">${bodySvg('f', P, S)}${bodySvg('b', P, S)}</div>
        <p class="text-xs text-slate-600"><span class="inline-block w-2.5 h-2.5 rounded-full bg-red-500 align-middle"></span> <b>${names(P)}</b>${S.length ? ` · <span class="inline-block w-2.5 h-2.5 rounded-full bg-red-300 align-middle"></span> ${names(S)}` : ''}</p>`;
}
// músculos y error típico por rol; vídeos (ID de YouTube) por rol y lugar
const EXERCISE_INFO = {
    vpull: { p: ['lats'], s: ['biceps', 'midback', 'forearm'], err: 'Echar el cuerpo atrás y tirar con los brazos en vez de con la espalda.' },
    hpull: { p: ['midback', 'lats'], s: ['biceps', 'rear'], err: 'Encoger los hombros o balancear el tronco para mover el peso.' },
    biceps: { p: ['biceps'], s: ['forearm'], err: 'Despegar los codos o impulsarte con la espalda.' },
    hammer: { p: ['biceps', 'forearm'], s: [], err: 'Balancear el cuerpo; sube y baja siempre controlando.' },
    rear: { p: ['rear'], s: ['midback'], err: 'Usar demasiado peso y tirar con la espalda en lugar del hombro.' },
    hpush: { p: ['chest'], s: ['shoulder', 'triceps'], err: 'Bloquear los codos arriba o levantar la espalda del respaldo.' },
    vpush: { p: ['shoulder'], s: ['triceps', 'midback'], err: 'Arquear la zona lumbar para poder subir el peso.' },
    triceps: { p: ['triceps'], s: [], err: 'Mover los codos hacia delante; deben quedar fijos.' },
    fly: { p: ['chest'], s: ['shoulder'], err: 'Abrir demasiado y cargar el hombro; el recorrido debe ser cómodo.' },
    lateral: { p: ['shoulder'], s: [], err: 'Subir por encima de los hombros o balancearte para ayudarte.' },
    squat: { p: ['quads', 'glutes'], s: ['hams'], err: 'Dejar que las rodillas se vayan hacia dentro al empujar.' },
    quad: { p: ['quads'], s: ['glutes'], err: 'Llevar el peso a las puntas de los pies; empuja con el talón.' },
    abductor: { p: ['glutes'], s: ['quads'], err: 'Despegar la espalda del respaldo o rebotar al cerrar.' },
    hamstring: { p: ['hams'], s: ['glutes', 'lowback'], err: 'Levantar la cadera o redondear la espalda baja.' },
    glute: { p: ['glutes'], s: ['hams'], err: 'Arquear la zona lumbar en lugar de subir con los glúteos.' },
    calf: { p: ['calves'], s: [], err: 'Rebotar sin pausa; sube del todo, aguanta un segundo y baja despacio.' },
    core: { p: ['abs', 'obliques'], s: [], err: 'Tirar del cuello o girar solo los brazos sin mover el tronco.' }
};
const EXERCISE_VIDEOS = {
    vpull: { gym: 'WakfOFnr5oM', home: 'radVWm-e81I' }, hpull: { gym: 'nwdptbhYjTw', home: 'ryhxLQUn-cQ' },
    biceps: { gym: 'gqLp6MFRYgI', home: 'rqy0oxx__sU' }, hammer: { gym: 'ZCeAgRrwkS4', home: 'RHdacbwKbTo' },
    rear: { gym: null, home: 'pgxSZCkaP7s' }, hpush: { gym: 'iBAUNsrwWdI', home: 'fXgXwfosyhk' },
    vpush: { gym: '279lKY6gi5o', home: 'SYA1r1J49R8' }, triceps: { gym: 'HAS8uy73HqM', home: 'tBvA2q2WaPE' },
    fly: { gym: 'NfQJyaxAJX8', home: 'suSsXLnTGqk' }, lateral: { gym: 'aKDYtQbCKWY', home: 'aVa9ce3SlSA' },
    squat: { gym: 'hl-EJUQ2yuc', home: '5HHITKuLxUs' }, quad: { gym: 'GMFFZnDz6wE', home: '6SfmtrsF8wQ' },
    abductor: { gym: 'IlLLJZHgfOs', home: 'fluAJnTl-xE' }, hamstring: { gym: '9xbBr5Ytl8c', home: '9j_L1KgpK8Y' },
    glute: { gym: 'c2iJjdXpt1U', home: 'pbqYDNHBWj4' }, calf: { gym: 'HObKQtrmU9g', home: 'VTPnjypEq38' },
    core: { gym: 'DLU0RKjZV2g', home: '0x25yyik3pw' }
};
