// ===== NUTRICIÓN: metabolismo basal, calorías, macros y agua =====
// Fórmula de Mifflin-St Jeor (la más usada en nutrición) + factor de actividad + ajuste según el objetivo.
// Son estimaciones orientativas; no sustituyen a un profesional sanitario.
const SEXES = { f: 'Mujer', m: 'Hombre', x: 'Prefiero no decirlo' };
const ACTIVITY = {
    low:  { label: 'Poco activa', desc: 'Trabajo sentada/o, poco movimiento', f: 1.2 },
    mid:  { label: 'Moderada', desc: 'Camino bastante o paso tiempo de pie', f: 1.3 },
    high: { label: 'Muy activa', desc: 'Trabajo físico o muchas horas en movimiento', f: 1.4 }
};
const MEAL_SPLIT = { morn: 0.15, lunch: 0.40, snack: 0.15, dinner: 0.30 }; // las 4 comidas de la app
const PROTEIN_PER_KG = { muscle: 1.8, fat: 2.0, tone: 1.6, health: 1.4 };
const KCAL_ADJUST = { muscle: 0.10, fat: -0.20, tone: 0, health: 0 };
const FOOD_GUIDE = {
    protein: ['Huevos (≈ 6 g cada uno)', 'Pollo o pavo cocinado (≈ 30 g por 100 g)', 'Atún al natural (≈ 20 g por lata)', 'Pescado blanco o azul (≈ 20 g por 100 g)', 'Legumbres cocidas (≈ 9 g por 100 g)', 'Yogur griego o proteico (≈ 10-15 g por 125 g)'],
    carbs: ['Arroz, pasta o patata', 'Avena y pan integral', 'Fruta fresca', 'Legumbres'],
    fats: ['Aceite de oliva (con medida)', 'Aguacate', 'Frutos secos (un puñado)', 'Pescado azul']
};
const FOOD_TIPS = {
    muscle: 'Reparte la proteína en todas las comidas y pon los hidratos más fuertes alrededor del entreno para tener energía y recuperarte.',
    fat: 'Llena el plato de verdura y proteína (sacian mucho), mide aceites y salsas y deja los hidratos para las comidas con más movimiento.',
    tone: 'Plato equilibrado: ½ verduras, ¼ proteína y ¼ hidratos, con grasas saludables en cantidad moderada.',
    health: 'Come variado y de temporada, prioriza alimentos poco procesados y no te saltes comidas.'
};

const numOr = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; };
const fmtN = n => Math.round(n).toLocaleString('es-ES');
function bodyOk(p) {
    return !!p && SEXES[p.sex] && ACTIVITY[p.activity] && p.age >= 14 && p.age <= 90 && p.height >= 120 && p.height <= 230 && p.weight >= 30 && p.weight <= 250;
}
// Devuelve null si faltan datos del cuerpo
function calcNutrition(p) {
    if (!bodyOk(p)) return null;
    const goal = GOALS[p.goal] ? p.goal : null, days = p.days || 3, notes = [];
    const bmr = Math.round(10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'm' ? 5 : p.sex === 'f' ? -161 : -78));
    const factor = ACTIVITY[p.activity].f + 0.04 * days;           // vida diaria + días de entrenamiento
    const tdee = Math.round(bmr * factor / 10) * 10;
    let adj = goal ? KCAL_ADJUST[goal] : 0;
    if (p.age < 18 && adj < 0) { adj = 0; notes.push('Al ser menor de 18 años no aplicamos déficit de calorías: en crecimiento no es recomendable. Consúltalo con tu médico.'); }
    const tweak = Math.max(-300, Math.min(300, p.kcalAdj || 0)); // ajustes que aceptaste en «Ajuste del plan» (kcal/día)
    let kcal = Math.round((tdee * (1 + adj) + (p.age < 18 && tweak < 0 ? 0 : tweak)) / 10) * 10;
    const floor = Math.max(bmr, p.sex === 'm' ? 1500 : p.sex === 'f' ? 1200 : 1350);
    if ((adj < 0 || tweak < 0) && kcal < floor) { kcal = Math.ceil(floor / 10) * 10; notes.push('Hemos limitado el déficit para que no bajes de un mínimo seguro.'); }
    const protein = Math.round(p.weight * (goal ? PROTEIN_PER_KG[goal] : 1.6));
    const fat = Math.round(Math.max(p.weight * 0.6, kcal * 0.25 / 9));
    const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
    const ml = Math.round(p.weight * 35 / 50) * 50;                 // 35 ml por kg
    const glasses = Math.min(8, Math.max(3, Math.round(ml / 500))); // vaso grande ≈ 500 ml
    const meals = {};
    Object.entries(MEAL_SPLIT).forEach(([k, s]) => { meals[k] = { kcal: Math.round(kcal * s / 10) * 10, protein: Math.round(protein * s) }; });
    return { bmr, tdee, kcal, adj, tweak, protein, fat, carbs, ml, glasses, meals, notes, factor };
}
const myNutrition = () => calcNutrition(getProfile());

// Agua: sin datos del cuerpo se mantiene la meta de siempre (4 vasos ≈ 2 L)
function waterGoal() { const n = myNutrition(); return n ? n.glasses : 4; }
function waterLitres() { const n = myNutrition(); return n ? Math.round(n.glasses * 5) / 10 : 2; }
function renderWaterCard() {
    const box = document.getElementById('water-buttons'); if (!box) return;
    const N = waterGoal();
    box.innerHTML = Array.from({ length: N }, (_, k) => `<button onclick="toggleWater(${k + 1})" class="flex-1 min-w-[2.6rem] py-3 rounded-xl border border-blue-100 bg-blue-50/50 text-slate-500 cursor-pointer" id="w-${k + 1}" aria-label="Vaso ${k + 1}"><i class="fa-solid fa-glass-water" aria-hidden="true"></i></button>`).join('');
    document.getElementById('water-title').innerHTML = `<i class="fa-solid fa-droplet text-blue-500" aria-hidden="true"></i> Hidratación (Meta: ${String(waterLitres()).replace('.', ',')} L)`;
    setWaterUI(waterLevel);
}

// Objetivo por comida (para la IA y para la tarjeta de Recetas)
function nutritionTarget(mealKey) {
    const n = myNutrition(), p = getProfile();
    if (!n || !n.meals[mealKey]) return null;
    return { kcal: n.meals[mealKey].kcal, protein_g: n.meals[mealKey].protein, objective: p.goal };
}

const nutriStat = (v, l, cls = '') => `<div class="rounded-xl p-2.5 text-center ${cls || 'bg-slate-50'}"><p class="text-base font-bold text-slate-900 leading-tight">${v}</p><p class="text-[10px] text-slate-500">${l}</p></div>`;
function nutriNumbersHtml(n) {
    return `<div class="grid grid-cols-3 gap-2">${nutriStat(fmtN(n.bmr), 'kcal metabolismo basal')}${nutriStat(fmtN(n.tdee), 'kcal de mantenimiento')}${nutriStat(fmtN(n.kcal), 'kcal objetivo diario', 'bg-emerald-50')}</div>
    <div class="grid grid-cols-3 gap-2">${nutriStat(n.protein + ' g', 'proteína')}${nutriStat(n.carbs + ' g', 'hidratos')}${nutriStat(n.fat + ' g', 'grasas')}</div>`;
}
function renderNutriCard() {
    const el = document.getElementById('nutri-card'); if (!el) return;
    const p = getProfile(), n = calcNutrition(p);
    if (!n) {
        el.innerHTML = `<h2 class="font-bold text-base text-slate-900 flex items-center gap-2"><i class="fa-solid fa-bullseye text-emerald-600" aria-hidden="true"></i> Tu objetivo nutricional</h2>
            <p class="text-xs text-slate-500">Calcula tu metabolismo basal y cuántas calorías y proteína necesitas según tu objetivo, para recomendarte comidas a tu medida.</p>
            <button onclick="openOnboarding(false)" class="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer hover:bg-emerald-700">Calcular mis calorías</button>`;
        return;
    }
    const g = GOALS[p.goal], rows = Object.keys(MEAL_SPLIT).map(k => `<div class="flex justify-between gap-2 py-1.5 border-b border-slate-100 last:border-0 text-xs"><span class="font-semibold text-slate-700">${MEAL_SHORT[k]}</span><span class="text-slate-500">≈ ${n.meals[k].kcal} kcal · ${n.meals[k].protein} g proteína</span></div>`).join('');
    const li = a => a.map(x => `<li>${x}</li>`).join('');
    el.innerHTML = `<div class="flex justify-between items-center gap-2"><h2 class="font-bold text-base text-slate-900 flex items-center gap-2"><i class="fa-solid fa-bullseye text-emerald-600" aria-hidden="true"></i> Tu objetivo nutricional</h2><span class="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full whitespace-nowrap">${g.emoji} ${g.label}</span></div>
        ${nutriNumbersHtml(n)}
        <div><p class="text-xs font-bold text-slate-700 mb-1">Reparto orientativo del día</p>${rows}</div>
        <details class="text-xs text-slate-600 bg-slate-50 rounded-xl p-3"><summary class="cursor-pointer font-semibold text-slate-800">Alimentos que te convienen</summary>
            <p class="mt-2 text-emerald-800">💡 ${FOOD_TIPS[p.goal]}</p>
            <p class="font-bold text-slate-700 mt-2">Proteínas</p><ul class="list-disc pl-5 space-y-0.5">${li(FOOD_GUIDE.protein)}</ul>
            <p class="font-bold text-slate-700 mt-2">Hidratos</p><ul class="list-disc pl-5">${li(FOOD_GUIDE.carbs)}</ul>
            <p class="font-bold text-slate-700 mt-2">Grasas saludables</p><ul class="list-disc pl-5">${li(FOOD_GUIDE.fats)}</ul></details>
        ${n.notes.map(t => `<p class="text-[11px] text-amber-700 bg-amber-50 rounded-lg p-2">${t}</p>`).join('')}
        <p class="text-[10px] text-slate-400">Estimación orientativa (fórmula Mifflin-St Jeor). No sustituye el consejo de un profesional sanitario. El generador con IA usa estos objetivos por comida.</p>`;
}

async function updateWeight() {
    const p = getProfile(); if (!p) return;
    const v = await UI.prompt({ title: 'Actualizar mi peso', message: 'Recalcularemos tus calorías, macros y agua.', value: p.weight ? String(p.weight) : '', inputType: 'number', inputMode: 'decimal', step: '0.1', placeholder: 'Ej: 68.5', confirmText: 'Guardar' });
    if (v === null) return;
    const kg = numOr(v);
    if (!(kg >= 30 && kg <= 250)) { showToast('Indica un peso válido (entre 30 y 250 kg).'); return; }
    recordWeight(kg); // guarda en el historial y actualiza perfil, calorías, macros y agua
    showToast(`Peso actualizado: ${String(kg).replace('.', ',')} kg`);
}
