// ===== SEGUIMIENTO DE CALORÍAS Y PROTEÍNA DEL DÍA =====
// Cada comida puede llevar kcal y proteína aproximadas (opcional). Se comparan con el objetivo de js/nutrition.js.
// Los valores de HOY viven en dreamfit_state (campo nut); los totales de cada día se guardan en dreamfit_days.
let mealNut = {}; // { morn: {kcal, protein}, lunch: ..., snack: ..., dinner: ... }

const PORTIONS = { light: { label: 'Ligera', f: 0.7 }, normal: { label: 'Normal', f: 1 }, big: { label: 'Fuerte', f: 1.3 } };
const trackingOn = () => DB.getItem('dreamfit_track_nut') !== '0';
function setTracking(on) {
    DB.setItem('dreamfit_track_nut', on ? '1' : '0');
    renderTodayLive();
    showToast(on ? 'Seguimiento de calorías activado' : 'Seguimiento de calorías desactivado');
}
function nutTotals() {
    let kcal = 0, protein = 0, logged = 0;
    Object.values(mealNut).forEach(v => { if (v && (v.kcal > 0 || v.protein > 0)) { logged++; kcal += v.kcal || 0; protein += v.protein || 0; } });
    return { kcal: Math.round(kcal), protein: Math.round(protein), logged };
}
function portionValues(mealKey, id) { // ligera/normal/fuerte respecto al objetivo de esa comida
    const t = nutritionTarget(mealKey); if (!t) return null;
    const f = PORTIONS[id].f;
    return { kcal: Math.round(t.kcal * f / 10) * 10, protein: Math.round(t.protein_g * f) };
}
const cleanNut = v => (v && (v.kcal > 0 || v.protein > 0)) ? { kcal: Math.round(v.kcal) || 0, protein: Math.round(v.protein) || 0 } : null;

// ---- hoja de comida: sección de calorías ----
function renderMealNut() {
    const box = document.getElementById('meal-nut'); if (!box) return;
    box.classList.toggle('hidden', !trackingOn());
    if (!trackingOn()) return;
    const cur = mealNut[mealModalKey] || {};
    document.getElementById('meal-kcal').value = cur.kcal || '';
    document.getElementById('meal-prot').value = cur.protein || '';
    renderPortions();
}
function renderPortions() {
    const box = document.getElementById('meal-portions'); if (!box) return;
    const k = numOr(document.getElementById('meal-kcal').value), p = numOr(document.getElementById('meal-prot').value);
    box.innerHTML = Object.entries(PORTIONS).map(([id, o]) => {
        const v = portionValues(mealModalKey, id); if (!v) return '';
        const on = k === v.kcal && p === v.protein;
        return `<button type="button" aria-pressed="${on}" onclick="pickPortion('${id}')" class="py-2 px-1 rounded-xl border text-center cursor-pointer ${on ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'}"><span class="block text-[11px] font-bold">${o.label}</span><span class="block text-[10px] ${on ? 'text-emerald-100' : 'text-slate-500'}">≈ ${v.kcal} kcal</span></button>`;
    }).join('') || '<p class="col-span-3 text-[11px] text-slate-500">Añade tus datos en Perfil y te propondremos porciones según tu objetivo. Mientras, escribe los números a mano.</p>';
}
function pickPortion(id) {
    const v = portionValues(mealModalKey, id); if (!v) return;
    document.getElementById('meal-kcal').value = v.kcal; document.getElementById('meal-prot').value = v.protein;
    renderPortions();
}
function readMealNut() { // null = vacío; false = valores no válidos
    if (!trackingOn()) return mealNut[mealModalKey] || null;
    const k = numOr(document.getElementById('meal-kcal').value), p = numOr(document.getElementById('meal-prot').value);
    if ((k !== null && (k < 0 || k > 3000)) || (p !== null && (p < 0 || p > 200))) return false;
    return cleanNut({ kcal: k || 0, protein: p || 0 });
}

// ---- tarjeta del día (en Hoy) ----
const nutBar = (label, val, goal, unit) => {
    const pct = Math.min(100, Math.round(val / goal * 100)), over = val > goal * 1.1;
    return `<div><div class="flex justify-between text-[11px] mb-1"><span class="font-semibold text-slate-700">${label}</span><span class="text-slate-500">${fmtN(val)} / ${fmtN(goal)} ${unit}</span></div>
        <div role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="${goal}" aria-valuenow="${val}" class="h-2 bg-slate-100 rounded-full overflow-hidden"><div class="h-2 rounded-full ${over ? 'bg-amber-400' : 'bg-emerald-500'} transition-all" style="width:${pct}%"></div></div></div>`;
};
function renderNutDay() {
    const el = document.getElementById('nut-day'); if (!el) return;
    if (!trackingOn()) { el.innerHTML = `<p class="text-[11px] text-slate-500 flex justify-between gap-2 items-center">Seguimiento de calorías desactivado <button onclick="setTracking(true)" class="font-bold text-emerald-700 underline cursor-pointer">Activar</button></p>`; return; }
    const t = myNutrition(), tot = nutTotals();
    let body;
    if (!tot.logged) body = `<p class="text-[11px] text-slate-500">Apunta tus comidas con calorías aproximadas (<b>Ligera / Normal / Fuerte</b>) y verás cómo vas con tu objetivo.${t ? '' : ' Añade tus datos en Perfil para compararlo.'}</p>`;
    else if (!t) body = `<p class="text-xs text-slate-700">Hoy llevas <b>${fmtN(tot.kcal)} kcal</b> y <b>${tot.protein} g</b> de proteína.</p><p class="text-[11px] text-slate-500">Añade tus datos en Perfil para compararlo con tu objetivo.</p>`;
    else {
        const remK = t.kcal - tot.kcal, remP = t.protein - tot.protein;
        const msg = tot.kcal > t.kcal * 1.1 ? `Hoy te has pasado ≈ ${fmtN(tot.kcal - t.kcal)} kcal. No pasa nada: lo que cuenta es la media de la semana. 💚`
            : remK > 0 ? `Te quedan ≈ ${fmtN(remK)} kcal${remP > 0 ? ` y ≈ ${remP} g de proteína` : ' · ¡proteína conseguida! 💪'}.` : '¡Objetivo del día conseguido! 🎉';
        body = `${nutBar('Calorías', tot.kcal, t.kcal, 'kcal')}${nutBar('Proteína', tot.protein, t.protein, 'g')}<p class="text-[11px] text-slate-600">${msg}</p><p class="text-[10px] text-slate-400">Solo cuenta lo que has apuntado (${tot.logged}/4 comidas).</p>`;
    }
    el.innerHTML = `<div class="space-y-2 bg-slate-50 rounded-xl p-3">${body}<button onclick="setTracking(false)" class="text-[10px] text-slate-400 underline cursor-pointer">Dejar de contar calorías</button></div>`;
}
const nutTag = k => { const v = mealNut[k]; return v && v.kcal > 0 && trackingOn() ? `<span class="text-[10px] font-semibold text-slate-500 whitespace-nowrap">${v.kcal} kcal</span>` : ''; };
