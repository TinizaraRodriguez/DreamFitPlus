// Animación de la técnica de cada ejercicio: figura articulada (SVG con animación SMIL, sin JS en marcha ni GIFs).
// Cada ejercicio define dos poses (A y B) y la figura se mueve entre ellas con cinemática directa (los huesos no cambian de longitud).
// Ángulos: 0 = hacia abajo, 90 = hacia delante (derecha), 180 = hacia arriba, -90 = hacia atrás. Vista 's' = perfil, 'f' = frontal, 't' = giro (frontal).
const techniqueAnim = (() => {
    const Q = { T: 40, UA: 24, FA: 22, TH: 32, SH: 30, FOOT: 12, FLOOR: 184, TX: 95, CX: 80 };
    const D = Math.PI / 180;
    const tv = (a, l) => [l * Math.sin(a * D), l * Math.cos(a * D)];
    const tp = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
    const mix = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    const mir = p => [2 * Q.CX - p[0], p[1]];
    const lerp = (a, b, t) => Array.isArray(a) ? a.map((x, i) => lerp(x, b[i], t)) : a + (b - a) * t;
    const DEF = { tr: 180, ua: 0, fa: 0, th: 0, sh: 0, ph: 0, hy: 122, ku: 1, kf: 1, dx: 0 };
    const ease = t => t * t * (3 - 2 * t);

    function solveSide(P) {
        let hip, sho;
        if (P.shoulder) { sho = P.shoulder; hip = tp(sho, tv(P.tr, Q.T), -1); }
        else if (P.hip) hip = P.hip;
        else {
            const a = [Q.TX - Q.FOOT * Math.cos(P.ph * D), Q.FLOOR - Q.FOOT * Math.sin(P.ph * D)];
            hip = tp(tp(a, tv(P.sh, Q.SH), -1), tv(P.th, Q.TH), -1);
        }
        sho = sho || tp(hip, tv(P.tr, Q.T));
        const knee = tp(hip, tv(P.th, Q.TH)), ank = tp(knee, tv(P.sh, Q.SH));
        const anchoredToe = !(P.shoulder || P.hip), toe = anchoredToe ? [Q.TX, Q.FLOOR] : [ank[0] + Q.FOOT, ank[1] + 2];
        const el = tp(sho, tv(P.ua, Q.UA)), wr = tp(el, tv(P.fa, Q.FA));
        const pr = {
            torso: [hip, sho], torsoLow: [hip, mix(hip, sho, .5)], torsoUp: [mix(hip, sho, .4), sho],
            uarm: [sho, el], farm: [el, wr], thigh: [hip, knee], shin: [knee, ank], foot: [ank, toe],
            head: tp(sho, tv(P.tr, 13)), chest: tp(sho, tv(P.tr, 11), -1), shoulder: sho, hip
        };
        if (P.th2 !== undefined) { const k2 = tp(hip, tv(P.th2, Q.TH)), a2 = tp(k2, tv(P.sh2, Q.SH)); pr.thigh2 = [hip, k2]; pr.shin2 = [k2, a2]; }
        return { pr, pts: { hip, sho, knee, ank, wrR: wr, wrL: wr, elb: el } };
    }
    function solveFront(P) {
        const cx = Q.CX, hy = P.hy, sy = hy - 40;
        const hipR = [cx + 6, hy], shR = [cx + 12, sy];
        let eR, wR;
        if (P.e) { eR = tp(shR, P.e); wR = tp(eR, P.w); }
        else { eR = tp(shR, tv(P.ua, Q.UA * P.ku)); wR = tp(eR, tv(P.fa, Q.FA * P.kf)); }
        const kR = tp(hipR, tv(P.th, Q.TH)), aR = tp(kR, tv(P.sh, Q.SH));
        const pr = {
            torso: [[cx, hy], [cx, sy]], torsoLow: [[cx, hy - 22], [cx, hy]], torsoUp: [[cx, sy], [cx, sy + 22]],
            uarm: [shR, eR], farm: [eR, wR], uarmL: [mir(shR), mir(eR)], farmL: [mir(eR), mir(wR)],
            thigh: [hipR, kR], shin: [kR, aR], thighL: [mir(hipR), mir(kR)], shinL: [mir(kR), mir(aR)],
            head: [cx, sy - 12], chest: [cx, sy + 9], shoulder: shR, shoulderL: mir(shR), hip: hipR, hipL: mir(hipR)
        };
        return { pr, pts: { hip: [cx, hy], sho: [cx, sy], knee: kR, kneeL: mir(kR), ank: aR, wrR: wR, wrL: mir(wR), elb: eR } };
    }
    function solveTwist(P) {
        const cx = Q.CX, hy = 150, sy = hy - 44, sx = P.dx * .22, H = [cx + P.dx, sy + 26];
        const shR = [cx + 12 + sx, sy], shL = [cx - 12 + sx, sy], hipR = [cx + 6, hy], kR = [cx + 16, hy + 24], aR = [cx + 22, hy + 40];
        const pr = {
            torso: [[cx, hy], [cx + sx, sy]], torsoLow: [[cx, hy], [cx + sx * .5, hy - 22]], torsoUp: [[cx + sx * .4, sy + 20], [cx + sx, sy]],
            uarm: [shR, H], uarmL: [shL, H], thigh: [hipR, kR], shin: [kR, aR], thighL: [mir(hipR), mir(kR)], shinL: [mir(kR), mir(aR)],
            head: [cx + sx, sy - 12], chest: [cx + sx * .6, sy + 10], shoulder: shR, shoulderL: shL, hip: hipR, hipL: mir(hipR)
        };
        return { pr, pts: { hip: [cx, hy], sho: [cx + sx, sy], wrR: H, wrL: H, elb: H } };
    }
    function eqPrims(tokens, pts, P) {
        const out = {}; let i = 0;
        for (const tk of tokens) {
            const [n, arg] = tk.split(':'), a = arg ? arg.split(',').map(Number) : [];
            const k = 'q' + i++;
            if (n === 'db') { out[k] = { dot: pts.wrR, r: 5 }; if (pts.wrL !== pts.wrR) out[k + 'b'] = { dot: pts.wrL, r: 5 }; }
            else if (n === 'handle') { out[k] = { dot: pts.wrR, r: 3 }; if (pts.wrL !== pts.wrR) out[k + 'b'] = { dot: pts.wrL, r: 3 }; }
            else if (n === 'dbc') out[k] = { dot: [Q.CX, pts.wrR[1]], r: 5.5 };
            else if (n === 'cable') out[k] = { seg: [pts.wrR, a], thin: true };
            else if (n === 'ankpad') out[k] = { seg: [tp(pts.ank, tv(P.sh + 90, 9)), tp(pts.ank, tv(P.sh + 90, 9), -1)], thick: true };
            else if (n === 'sled') out[k] = { seg: [tp(pts.ank, tv(215, 16)), tp(pts.ank, tv(215, 16), -1)], thick: true };
            else if (n === 'hipbar') out[k] = { seg: [[pts.hip[0] - 10, pts.hip[1] - 8], [pts.hip[0] + 10, pts.hip[1] - 8]], thick: true };
            else if (n === 'hipdb') out[k] = { dot: [pts.hip[0], pts.hip[1] - 7], r: 5.5 };
            else if (n === 'shpad') out[k] = { seg: [[pts.sho[0] - 6, pts.sho[1] - 6], [pts.sho[0] + 10, pts.sho[1] - 6]], thick: true };
            else if (n === 'kneepads') { out[k] = { dot: pts.knee, r: 4 }; out[k + 'b'] = { dot: pts.kneeL, r: 4 }; }
        }
        return out;
    }
    function statics(tokens, A, floor) {
        const hip = A.hip, s = [`<line x1="10" y1="${floor}" x2="150" y2="${floor}"/>`];
        for (const tk of tokens || []) {
            const [n, arg] = tk.split(':'), a = arg ? arg.split(',').map(Number) : [];
            if (n === 'seat') s.push(`<line x1="${hip[0] - 14}" y1="${hip[1] + 7}" x2="${hip[0] + 28}" y2="${hip[1] + 7}" stroke-width="5"/>`);
            else if (n === 'back') { const e = tp([hip[0] - 9, hip[1] + 5], tv(A.tr, 54)); s.push(`<line x1="${hip[0] - 9}" y1="${hip[1] + 5}" x2="${e[0].toFixed(1)}" y2="${e[1].toFixed(1)}" stroke-width="5"/>`); }
            else if (n === 'line') s.push(`<line x1="${a[0]}" y1="${a[1]}" x2="${a[2]}" y2="${a[3]}" stroke-width="4"/>`);
        }
        return s.join('');
    }
    const HL = { // músculo -> piezas del cuerpo que se resaltan
        chest: { d: ['chest'] }, shoulder: { d: ['shoulder', 'shoulderL'] }, rear: { d: ['shoulder', 'shoulderL'] },
        biceps: { s: ['uarm', 'uarmL'] }, triceps: { s: ['uarm', 'uarmL'] }, forearm: { s: ['farm', 'farmL'] },
        abs: { s: ['torsoLow'] }, obliques: { s: ['torsoLow'] }, lowback: { s: ['torsoLow'] }, lats: { s: ['torsoUp'] }, midback: { s: ['torsoUp'] },
        glutes: { d: ['hip', 'hipL'] }, quads: { s: ['thigh', 'thighL', 'thigh2'] }, hams: { s: ['thigh', 'thighL', 'thigh2'] }, calves: { s: ['shin', 'shinL', 'shin2'] }
    };
    const S = { hip: [55, 154], th: 90, sh: 0 };               // sentado en máquina
    const STAND = {};
    const stand = (A, B, eq, extra) => ({ v: 's', base: STAND, A, B, eq, ...extra });
    const seated = (A, B, eq, st, extra) => ({ v: 's', base: S, A, B, eq, st: st || ['seat', 'back'], ...extra });
    const front = (base, A, B, eq, extra) => ({ v: 'f', base, A, B, eq, ...extra });
    const curl = { A: { ua: 3, fa: 0 }, B: { ua: 3, fa: 155 } };
    const LAT = { A: { ua: 6, fa: 6 }, B: { ua: 88, fa: 80 } };
    const FLY_A = { e: [24, 0], w: [22, 0] }, FLY_B = { e: [-4, 0], w: [-8, 0] };
    const LEG = { th: 3, sh: 3 };
    const SPECS = {
        'vpull.gym': seated({ tr: 188, ua: 175, fa: 175 }, { tr: 192, ua: 15, fa: 150 }, ['cable:60,6', 'handle']),
        'vpull.home': stand({ tr: 135, th: 25, sh: -5, ua: 0, fa: 0 }, { tr: 135, th: 25, sh: -5, ua: -65, fa: 10 }, ['db']),
        'hpull.gym': { v: 's', base: { hip: [50, 150], th: 75, sh: 105 }, A: { tr: 180, ua: 90, fa: 90 }, B: { tr: 190, ua: -15, fa: 90 }, eq: ['cable:150,150', 'handle'], st: ['seat', 'back', 'line:128,130,128,176'] },
        'hpull.home': stand({ tr: 105, th: 12, sh: -5, ua: 0, fa: 0 }, { tr: 105, th: 12, sh: -5, ua: -70, fa: 15 }, ['db'], { st: ['line:80,140,128,140'] }),
        'biceps.gym': seated({ tr: 182, ua: 35, fa: 35 }, { tr: 182, ua: 35, fa: 165 }, ['handle']),
        'biceps.home': stand(curl.A, curl.B, ['db']),
        'hammer.gym': stand(curl.A, { ua: 3, fa: 150 }, ['cable:112,180', 'handle']),
        'hammer.home': stand(curl.A, curl.B, ['db']),
        'rear.gym': front({ hy: 122, ...LEG }, FLY_B, FLY_A, ['handle']),
        'rear.home': front({ hy: 122, ...LEG }, FLY_B, FLY_A, ['db']),
        'hpush.gym': seated({ tr: 184, ua: -80, fa: 80 }, { tr: 184, ua: 90, fa: 90 }, ['handle']),
        'hpush.home': { v: 's', base: { hip: [95, 172], th: 135, sh: 45 }, A: { tr: -90, ua: 100, fa: 180 }, B: { tr: -90, ua: 180, fa: 180 }, eq: ['db'], floor: 178 },
        'vpush.gym': seated({ tr: 184, ua: 20, fa: 170 }, { tr: 184, ua: 176, fa: 176 }, ['handle']),
        'vpush.home': stand({ ua: 20, fa: 170 }, { ua: 178, fa: 178 }, ['db']),
        'triceps.gym': stand({ tr: 175, ua: 2, fa: 95 }, { tr: 175, ua: 2, fa: 12 }, ['cable:100,12', 'handle']),
        'triceps.home': stand({ ua: 178, fa: -30 }, { ua: 180, fa: -180 }, ['db']),
        'fly.gym': front({ hy: 122, ...LEG }, { e: [24, 0], w: [0, -22] }, { e: [-11, 0], w: [0, -22] }, ['handle']),
        'fly.home': front({ hy: 122, ...LEG }, FLY_A, FLY_B, ['db']),
        'lateral.gym': front({ hy: 122, ...LEG }, LAT.A, LAT.B, ['handle']),
        'lateral.home': front({ hy: 122, ...LEG }, LAT.A, LAT.B, ['db']),
        'squat.gym': { v: 's', base: { hip: [60, 150], tr: 225 }, A: { th: 165, sh: 75, ua: 60, fa: 60 }, B: { th: 125, sh: 125, ua: 60, fa: 60 }, eq: ['sled'], st: ['line:45,176,132,112', 'line:40,150,50,170'] },
        'squat.home': stand({ tr: 180, ua: 40, fa: 150 }, { tr: 155, th: 75, sh: -20, ua: 40, fa: 150 }, ['db']),
        'quad.gym': seated({ tr: 185, sh: 0, ua: 10, fa: 10 }, { tr: 185, sh: 88, ua: 10, fa: 10 }, ['ankpad']),
        'quad.home': stand({ th: 0, sh: 0, th2: -12, sh2: -12 }, { th: 80, sh: -10, th2: -30, sh2: -95 }, ['db']),
        'abductor.gym': front({ hy: 122, ua: 5, fa: 5 }, { th: 12, sh: 6 }, { th: 40, sh: 18 }, ['kneepads'], { st: ['line:58,129,102,129'] }),
        'abductor.home': front({ ua: -10, fa: -20 }, { hy: 130, th: 30, sh: 30 }, { hy: 139, th: 60, sh: 12 }, ['dbc']),
        'hamstring.gym': { v: 's', base: { hip: [85, 168], tr: -90, th: 90 }, A: { sh: 90, ua: -95, fa: -95 }, B: { sh: 215, ua: -95, fa: -95 }, eq: ['ankpad'], st: ['line:40,176,125,176'], floor: 184 },
        'hamstring.home': stand({ tr: 180, th: 2, sh: 0 }, { tr: 112, th: 12, sh: 4 }, ['db']),
        'glute.gym': { v: 's', base: { shoulder: [40, 150] }, A: { tr: -113, th: 125, sh: 20 }, B: { tr: -90, th: 95, sh: 15 }, eq: ['hipbar'], st: ['line:22,158,58,158'], floor: 182, noarm: true },
        'glute.home': { v: 's', base: { shoulder: [40, 150] }, A: { tr: -113, th: 125, sh: 20 }, B: { tr: -90, th: 95, sh: 15 }, eq: ['hipdb'], st: ['line:22,158,58,158'], floor: 182, noarm: true },
        'calf.gym': stand({ ph: 0, ua: 10, fa: 10 }, { ph: 45, ua: 10, fa: 10 }, ['shpad']),
        'calf.home': stand({ ph: 0 }, { ph: 45 }, ['db']),
        'core.gym': seated({ tr: 192, ua: 30, fa: 150 }, { tr: 148, ua: 30, fa: 150 }, ['handle']),
        'core.home': { v: 't', base: {}, A: { dx: -28 }, B: { dx: 28 }, eq: ['db'] }
    };

    function frames(reduce) {
        if (reduce) return [0];
        const f = [0, 0, 0]; for (let i = 1; i <= 8; i++) f.push(ease(i / 9));
        f.push(1, 1, 1); for (let i = 1; i <= 8; i++) f.push(ease(1 - i / 9));
        return f;
    }
    function poseAt(spec, t) {
        const A = { ...spec.base, ...spec.A }, B = { ...spec.base, ...spec.B }, P = {};
        for (const k of new Set([...Object.keys(A), ...Object.keys(B), ...Object.keys(DEF)])) {
            const a = A[k] ?? DEF[k] ?? B[k], b = B[k] ?? DEF[k] ?? A[k];
            if (a !== undefined) P[k] = lerp(a, b, t);
        }
        return P;
    }
    function solve(spec, t) {
        const P = poseAt(spec, t), r = spec.v === 's' ? solveSide(P) : spec.v === 'f' ? solveFront(P) : solveTwist(P);
        return { pr: { ...r.pr, ...eqPrims(spec.eq || [], r.pts, P) }, P };
    }
    const f1 = n => n.toFixed(1);
    const segD = s => `M${f1(s[0][0])} ${f1(s[0][1])}L${f1(s[1][0])} ${f1(s[1][1])}`;

    function render(role, place, info, opts = {}) {
        const spec = SPECS[role + '.' + place]; if (!spec) return '';
        const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
        const ts = opts.frame !== undefined ? [opts.frame] : frames(reduce), fr = ts.map(t => solve(spec, t));
        const names = Object.keys(fr[0].pr), dur = '4.4s';
        const els = (name, st) => {
            const p = fr[0].pr[name]; if (!p) return '';
            const isDot = !!p.dot || (Array.isArray(p) && typeof p[0] === 'number'), dots = isDot;
            const getp = f => { const v = f.pr[name]; return v && v.dot ? v.dot : v; };
            const anim = (attr, vals) => ts.length > 1 ? `<animate attributeName="${attr}" values="${vals.join(';')}" dur="${dur}" repeatCount="indefinite"/>` : '';
            if (dots) {
                const r = (p.dot ? p.r : st.r), c = getp(fr[0]);
                return `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${r}" fill="${st.fill}" opacity="${st.o || 1}">${anim('cx', fr.map(f => f1(getp(f)[0])))}${anim('cy', fr.map(f => f1(getp(f)[1])))}</circle>`;
            }
            const sg = p.seg || p;
            const dv = fr.map(f => { const q = f.pr[name]; return segD(q.seg || q); });
            return `<path d="${dv[0]}" fill="none" stroke="${st.stroke}" stroke-width="${st.w}" stroke-linecap="round" opacity="${st.o || 1}">${anim('d', dv)}</path>`;
        };
        const gray = '#94a3b8', base = ['thigh2', 'shin2', 'thighL', 'shinL', 'foot', 'torso', 'thigh', 'shin', 'uarmL', 'farmL', 'uarm', 'farm', 'head'].filter(n => names.includes(n) && !(spec.noarm && /arm/.test(n)))
            .map(n => els(n, n === 'head' ? { fill: gray, r: 8 } : { stroke: gray, w: n === 'torso' ? 11 : 6.5 })).join('');
        const over = (list, color, w, r, o) => (list || []).flatMap(m => [...(HL[m]?.s || []).map(n => [n, 's']), ...(HL[m]?.d || []).map(n => [n, 'd'])])
            .filter(([n]) => names.includes(n) && !(spec.noarm && /arm/.test(n)))
            .map(([n, k]) => els(n, k === 's' ? { stroke: color, w, o } : { fill: color, r, o })).join('');
        const P = (info && info.p) || [], Sd = ((info && info.s) || []).filter(x => !P.includes(x));
        const eq = names.filter(n => /^q/.test(n)).map(n => { const p = fr[0].pr[n]; return els(n, p.thin ? { stroke: '#94a3b8', w: 1.5 } : p.thick ? { stroke: '#334155', w: 5 } : { fill: '#334155' }); }).join('');
        const A = { ...spec.base, ...spec.A }, floor = spec.floor || Q.FLOOR;
        const stat = statics(spec.st, { hip: solve(spec, 0).pr.hip || A.hip, tr: A.tr }, floor);
        const label = (info && info.p ? info.p : []).map(x => MUSCLE_NAMES[x]).filter(Boolean).join(', ');
        return `<div class="rounded-xl bg-slate-50 py-2" role="img" aria-label="Animación de la técnica del ejercicio${label ? '. Trabaja: ' + label : ''}">
            <svg viewBox="0 0 160 200" class="mx-auto h-52 w-auto" aria-hidden="true"><g stroke="#cbd5e1" stroke-linecap="round" fill="none">${stat}</g>${base}${over(Sd, '#fca5a5', 9.5, 7, .9)}${over(P, '#ef4444', 10.5, 8, .95)}${eq}</svg></div>`;
    }
    render.has = (role, place) => !!SPECS[role + '.' + place];
    return render;
})();
