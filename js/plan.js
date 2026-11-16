// ===== PLAN POR OBJETIVO =====
// Perfil (objetivo, nivel, días, lugar) -> semana de entrenos + rutinas + series/repeticiones.
// Todo son plantillas: es instantáneo, no usa IA y siempre da el mismo resultado para el mismo perfil.
const GOALS = {
    muscle: { label: 'Ganar músculo', emoji: '💪', desc: 'Más peso, menos repeticiones, descansos largos.', tip: 'Come suficiente proteína (reparte 20-30 g por comida) y duerme 7-8 h: el músculo crece en el descanso.' },
    fat:    { label: 'Perder grasa', emoji: '🔥', desc: 'Más repeticiones, descansos cortos y más cardio.', tip: 'El déficit se logra sobre todo comiendo: cuida las raciones, bebe agua y no te saltes la fuerza (protege el músculo).' },
    tone:   { label: 'Tonificar', emoji: '✨', desc: 'Equilibrio entre fuerza y resistencia.', tip: 'Mezcla fuerza y algo de cardio y sé constante: los cambios se notan a partir de las 6-8 semanas.' },
    health: { label: 'Salud y bienestar', emoji: '🌿', desc: 'Moverte con regularidad, sin exigirte de más.', tip: 'Lo importante es la constancia: mejor 3 sesiones suaves cada semana que una excesiva y abandonar.' }
};
const LEVELS = {
    beginner: { label: 'Principiante', desc: 'Empiezo o vuelvo tras un parón', n: 3, f: 1 },
    mid:      { label: 'Intermedio', desc: 'Entreno con regularidad desde hace meses', n: 4, f: 1.4 },
    adv:      { label: 'Avanzado', desc: 'Entreno en serio desde hace más de un año', n: 5, f: 1.8 }
};
const PLACES = { gym: 'Gimnasio (máquinas)', home: 'Casa (mancuernas)' };
const ACT_GYM = 'Sala Pesas (Máquinas guiadas)', ACT_HOME = 'Fuerza en casa (mancuernas)';
const DEFAULT_PROFILE = { goal: 'tone', level: 'beginner', days: 3, place: 'gym' }; // lo que ya hacía la app

// series x repeticiones y descanso (s)
const SCHEMES = {
    muscle: { beginner: [3, '10', 90], mid: [4, '8-10', 90], adv: [4, '6-8', 120] },
    fat:    { beginner: [3, '12-15', 45], mid: [3, '12-15', 45], adv: [4, '12-15', 40] },
    tone:   { beginner: [3, '12', 60], mid: [3, '12', 60], adv: [4, '10-12', 60] },
    health: { beginner: [2, '12', 60], mid: [3, '10-12', 60], adv: [3, '10', 75] }
};
const yt = q => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);

// roles de ejercicio -> versión de gimnasio y de casa
const ROLES = {
    vpull:   { gym: ['Jalón al pecho', 'Espalda recta, pecho arriba. Lleva la barra al esternón tirando con los codos sin balancear la espalda.', 15, 'jalon al pecho tecnica'], home: ['Remo inclinado con mancuernas', 'Inclina el torso con la espalda recta y lleva ambas mancuernas hacia las caderas juntando las escápulas.', 6, 'remo inclinado mancuernas tecnica'] },
    hpull:   { gym: ['Remo sentado en polea/máquina', 'Mantén los hombros lejos de las orejas y junta las escápulas atrás al tirar del agarre hacia el abdomen.', 15, 'remo sentado polea tecnica'], home: ['Remo con mancuerna a una mano', 'Apoya una mano y una rodilla, espalda plana, y sube la mancuerna hacia la cadera sin girar el tronco.', 6, 'remo mancuerna una mano tecnica'] },
    biceps:  { gym: ['Curl de bíceps guiado', 'Apoya los brazos firmes sobre el cojín y sube el peso doblando los codos sin mover los hombros.', 10, 'curl biceps maquina tecnica'], home: ['Curl de bíceps con mancuernas', 'Codos pegados al cuerpo. Sube sin balancear y baja despacio.', 4, 'curl biceps mancuernas tecnica'] },
    hammer:  { gym: ['Curl martillo en polea', 'Agarre neutro con la cuerda, codos fijos a los costados y subida controlada.', 10, 'curl martillo polea tecnica'], home: ['Curl martillo con mancuernas', 'Palmas enfrentadas durante todo el movimiento, codos quietos.', 4, 'curl martillo mancuernas tecnica'] },
    rear:    { gym: ['Pájaros en máquina (deltoide posterior)', 'Pecho pegado al respaldo y brazos casi rectos. Abre llevando los codos hacia atrás.', 10, 'pajaros maquina deltoide posterior tecnica'], home: ['Pájaros inclinado con mancuernas', 'Torso inclinado, espalda recta. Abre los brazos en cruz con los codos ligeramente flexionados.', 3, 'pajaros mancuernas inclinado tecnica'] },
    hpush:   { gym: ['Press de pecho en máquina', 'Ajusta el asiento para que las empuñaduras queden a la altura media del pecho. Empuja sin bloquear los codos.', 15, 'press pecho maquina tecnica'], home: ['Press de pecho con mancuernas (en el suelo)', 'Tumbada en el suelo, empuja las mancuernas hacia arriba y baja hasta que los codos toquen el suelo.', 6, 'press pecho mancuernas suelo tecnica'] },
    vpush:   { gym: ['Press militar de hombro', 'Espalda bien pegada al respaldo. Empuja los agarres hacia arriba con control al bajar.', 10, 'press militar maquina tecnica'], home: ['Press de hombros con mancuernas', 'De pie o sentada, empuja las mancuernas sobre la cabeza sin arquear la espalda.', 4, 'press hombros mancuernas tecnica'] },
    triceps: { gym: ['Extensiones de tríceps en polea', 'Codos pegados a los costados y fijos. Estira los brazos hacia abajo apretando la parte posterior del brazo.', 10, 'extension triceps polea tecnica'], home: ['Extensión de tríceps sobre la cabeza', 'Sujeta una mancuerna con las dos manos, codos hacia arriba y quietos; baja detrás de la cabeza y estira.', 4, 'extension triceps mancuerna sobre la cabeza'] },
    fly:     { gym: ['Aperturas en máquina (pec deck)', 'Espalda pegada, codos a la altura del pecho. Junta los brazos al frente sin chocar las manos.', 10, 'aperturas pec deck tecnica'], home: ['Aperturas con mancuernas (en el suelo)', 'Brazos casi rectos; abre hasta que los codos toquen el suelo y vuelve apretando el pecho.', 4, 'aperturas mancuernas suelo tecnica'] },
    lateral: { gym: ['Elevaciones laterales en máquina', 'Sube los codos hasta la altura de los hombros sin encoger los trapecios.', 8, 'elevaciones laterales maquina tecnica'], home: ['Elevaciones laterales con mancuernas', 'Sube los brazos a los lados hasta la altura de los hombros con control, sin impulso.', 3, 'elevaciones laterales mancuernas tecnica'] },
    squat:   { gym: ['Prensa de piernas guiada', 'Pies al ancho de las caderas. Baja despacio flexionando las rodillas a 90º sin despegar la pelvis del asiento.', 25, 'prensa piernas tecnica'], home: ['Sentadilla goblet con mancuerna', 'Sujeta la mancuerna junto al pecho, pies al ancho de los hombros y baja con la espalda recta y las rodillas alineadas con los pies.', 8, 'sentadilla goblet tecnica'] },
    quad:    { gym: ['Leg Extension (Cuádriceps)', 'Ajusta el cojín sobre la parte baja de las espinillas. Extiende las piernas hasta estirarlas casi por completo.', 15, 'leg extension tecnica'], home: ['Zancadas con mancuernas', 'Paso largo al frente, baja la rodilla trasera casi al suelo y empuja con el talón delantero.', 5, 'zancadas mancuernas tecnica'] },
    abductor:{ gym: ['Máquina de Abductores', 'Abre las piernas manteniendo la espalda erguida contra el respaldo para trabajar los glúteos.', 20, 'abductores maquina tecnica'], home: ['Sentadilla sumo con mancuerna', 'Pies muy abiertos y puntas hacia fuera; baja con la espalda recta sujetando la mancuerna entre las piernas.', 8, 'sentadilla sumo mancuerna tecnica'] },
    hamstring:{ gym: ['Curl femoral tumbado', 'Caderas pegadas al banco; flexiona las rodillas llevando los talones hacia los glúteos y baja despacio.', 15, 'curl femoral tumbado maquina tecnica'], home: ['Peso muerto rumano con mancuernas', 'Rodillas ligeramente flexionadas, lleva la cadera atrás con la espalda recta hasta sentir el estiramiento y vuelve.', 6, 'peso muerto rumano mancuernas tecnica'] },
    glute:   { gym: ['Hip thrust en máquina', 'Espalda apoyada, empuja con los talones hasta alinear hombros, caderas y rodillas, y aprieta los glúteos arriba.', 20, 'hip thrust maquina tecnica'], home: ['Puente de glúteo con mancuerna', 'Tumbada boca arriba con la mancuerna sobre la cadera: sube la pelvis apretando los glúteos y baja sin apoyar del todo.', 8, 'puente de gluteo mancuerna tecnica'] },
    calf:    { gym: ['Elevación de gemelos en máquina', 'Sube de puntillas todo lo que puedas, pausa un segundo arriba y baja hasta estirar.', 20, 'elevacion gemelos maquina tecnica'], home: ['Elevación de gemelos con mancuernas', 'De pie con una mancuerna en cada mano, sube de puntillas y baja despacio.', 6, 'elevacion gemelos mancuernas tecnica'] },
    core:    { gym: ['Crunch abdominal en máquina', 'Lleva las costillas hacia la pelvis redondeando el tronco, sin tirar del cuello.', 15, 'crunch abdominal maquina tecnica'], home: ['Rotación rusa con mancuerna', 'Sentada con el tronco inclinado atrás y los pies elevados o apoyados, gira llevando la mancuerna de lado a lado.', 3, 'rotacion rusa mancuerna tecnica'] }
};
// rutinas: listas de roles por orden de importancia (se usan los N primeros según el nivel)
const ROUTINES = {
    pull:   ['vpull', 'hpull', 'biceps', 'rear', 'hammer'],
    push:   ['hpush', 'vpush', 'triceps', 'fly', 'lateral'],
    legs:   ['squat', 'quad', 'abductor', 'hamstring', 'glute', 'calf'],
    upperA: ['hpush', 'vpull', 'vpush', 'hpull', 'biceps', 'triceps'],
    upperB: ['vpush', 'hpull', 'hpush', 'vpull', 'lateral', 'hammer'],
    lowerA: ['squat', 'hamstring', 'glute', 'quad', 'calf', 'abductor'],
    lowerB: ['hamstring', 'quad', 'glute', 'squat', 'abductor', 'calf'],
    fullA:  ['squat', 'hpush', 'vpull', 'vpush', 'core'],
    fullB:  ['glute', 'hpull', 'fly', 'quad', 'core'],
    fullC:  ['hamstring', 'vpush', 'hpull', 'squat', 'lateral']
};
function routinePlan(p) {
    const split = p.goal === 'muscle' || p.goal === 'tone';
    if (p.days <= 2) return ['fullA', 'fullB'];
    if (p.days === 3) return split ? ['pull', 'push', 'legs'] : ['fullA', 'fullB', 'fullC'];
    if (p.days === 4) return ['upperA', 'lowerA', 'upperB', 'lowerB'];
    return ['pull', 'push', 'legs', 'upperA', 'lowerB'];
}

function getProfile() { const p = safeParse('dreamfit_profile', null); return p && p.goal ? p : null; }
function profileDone() { return !!safeParse('dreamfit_profile', null); } // también cuenta si se omitió
const eff = () => ({ ...DEFAULT_PROFILE, ...(getProfile() || {}) });
function getScheme(p = eff()) {
    const [sets, reps, rest] = SCHEMES[p.goal][p.level];
    return { sets, reps, rest, label: `${sets}×${reps}`, restLabel: rest >= 60 && rest % 60 === 0 ? rest / 60 + ' min' : rest + ' s' };
}
function planRoutines(p = eff()) {
    const n = LEVELS[p.level].n + (p.goal === 'muscle' && p.level === 'adv' ? 1 : 0), step = p.place === 'home' ? 2 : 2.5;
    return routinePlan(p).map(r => ROUTINES[r].slice(0, n).map(role => {
        const [name, tech, w, q] = ROLES[role][p.place];
        const base = p.place === 'home' ? w * (p.level === 'adv' ? 1.5 : p.level === 'mid' ? 1.25 : 1) : w * LEVELS[p.level].f;
        return { name, tech, videoUrl: yt(q), defaultWeight: Math.max(step, Math.round(base / step) * step) };
    }));
}

// semana: días de fuerza + cardio según objetivo + descansos
function planAgenda(p) {
    const strengthDays = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 3, 4, 5] }[Math.min(5, Math.max(2, p.days))];
    const act = Array(7).fill(null), strength = p.place === 'home' ? ACT_HOME : ACT_GYM;
    strengthDays.forEach(i => act[i] = strength);
    act[6] = 'Descanso Total';
    const free = [0, 1, 2, 3, 4, 5].filter(i => !act[i]);
    const target = { muscle: 1, fat: 3, tone: 2, health: 2 }[p.goal];
    const k = Math.min(target, Math.max(0, free.length - (p.days >= 4 ? 1 : 0)));
    const picks = Array.from({ length: k }, (_, j) => free[Math.floor((j + 0.5) * free.length / k)]);
    picks.forEach((i, j) => act[i] = (j % 2 === 0 || p.place === 'home') ? 'Running (Método CACOS)' : 'Clase: Spinning');
    free.forEach(i => { if (!act[i]) act[i] = 'Descanso Activo / Estiramientos'; });
    const agenda = {};
    daysOfWeek.forEach((d, i) => agenda[d] = { activity: act[i], completed: false });
    return agenda;
}

function applyProfile(p) {
    getWeights(); // si venías de un perfil antiguo, guarda antes tu peso previo en el historial
    const profile = { goal: p.goal, level: p.level, days: p.days, place: p.place, sex: p.sex, age: p.age, height: p.height, weight: p.weight, activity: p.activity, ts: Date.now() };
    DB.setItem('dreamfit_profile', JSON.stringify(profile));
    if (profile.weight && (!getWeights().length || getWeights()[0].kg !== profile.weight)) recordWeight(profile.weight); // arranca (o continúa) el historial de peso
    const cats = getWorkoutCategories();
    [ACT_GYM, ACT_HOME].forEach(c => { if (!cats.includes(c)) cats.push(c); });
    DB.setItem('dreamfit_workout_categories', JSON.stringify(cats));
    DB.setItem('dreamfit_agenda_v2', JSON.stringify(planAgenda(profile)));
    renderAllSelects(); renderAgenda(); renderMonthlyCalendar(); updateTodayBadge();
    if (typeof renderEntrenoTab === 'function') renderEntrenoTab();
    renderGoalCard(); renderNutriCard(); renderWaterCard(); renderTodayLive();
}
