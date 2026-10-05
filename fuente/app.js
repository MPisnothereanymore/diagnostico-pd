(async function () {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const NF0 = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
const NF1 = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const NF2 = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const f0 = v => (isFinite(v) ? NF0.format(Math.round(v)) : '–');
const f1 = v => (isFinite(v) ? NF1.format(v) : '–');
const f2 = v => (isFinite(v) ? NF2.format(v) : '–');
const pc = (v, d = 1) => (isFinite(v) ? (d === 0 ? NF0 : d === 1 ? NF1 : NF2).format(v * 100) + '%' : '–');
const pcs = v => (isFinite(v) ? (v > 0 ? '+' : v < 0 ? '−' : '') + NF0.format(Math.abs(v * 100)) + '%' : '–');
const pl = (n, one, many) => f0(n) + ' ' + (Math.round(n) === 1 ? one : many);
const sum = a => a.reduce((x, y) => x + y, 0);
const SVGNS = 'http://www.w3.org/2000/svg';
const svgEl = (t, a = {}) => { const e = document.createElementNS(SVGNS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

async function loadPack() {
  const b64 = document.getElementById('pack').textContent.trim();
  const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  if (!('DecompressionStream' in window)) throw new Error('este navegador no puede descomprimir los datos; usa una versión reciente de Chrome, Edge, Firefox o Safari');
  const stream = new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(stream).text());
}
let D;
try { D = await loadPack(); } catch (e) { $('#loading').textContent = 'No se pudieron cargar los datos: ' + e.message; return; }

// ================= catálogos =================
const FR = D.FRPD, NC = D.comunas.length;
const TER = FR.terr, NT = TER.length, LIN = FR.lin, NL = LIN.length;
const LSHORT = { L1: 'Clima y agua', L2: 'Biotecnología', L3: 'Alimentación', L4: 'Energía', L5: 'Economía circular', L6: 'Digitalización' };
const LIDX = Object.fromEntries(LIN.map((l, i) => [l.k, i]));
const TIDX = Object.fromEntries(TER.map((t, i) => [t.k, i]));
const TOF = new Int8Array(NC).fill(-1); TER.forEach((t, ti) => t.c.forEach(c => { TOF[c] = ti; }));
const CN = c => D.comunas[c].l;
const POP = D.comunas.map(c => c.pop), POPREG = sum(POP);
const LINES = FR.lines, LINE = Object.fromEntries(LINES.map(l => [l.k, l]));
const ENT = FR.entries;
const CELL = {}; ENT.forEach(e => { CELL[e.t + '|' + e.c] = e; });
const A8 = {}; FR.art8.forEach(g => g.items.forEach(it => { A8[it.k] = { k: it.k, n: it.n, g: g.k }; }));
const A8KEYS = FR.art8.flatMap(g => g.items.map(i => i.k));
const GASTO = Object.fromEntries(FR.gastos.map(g => [g.k, g.n]));
const LERN = Object.fromEntries(FR.ler.map(l => [l.k, l.n]));
const BLOQ = FR.bloques;
const MADT = { 3: 'Evidencia levantada y contraparte identificada', 2: 'Evidencia parcial', 1: 'Evidencia por levantar' };
const isCTCI = ln => ln.a8.some(k => k.startsWith('3')) || ln.g.length > 0;
const lineNums = ln => { const s = new Set(ln.a8.map(k => k[0])); if (ln.g.length) s.add('3'); return s; };
const lineTerrs = ln => (ln.terr === 'TODOS' || ln.terr === 'REGIONAL' ? [] : ln.terr.split(','));
const TCOL = ['--t1', '--t2', '--t3', '--t4', '--t5', '--t6', '--t7', '--t8'].map(css);

// ================= empresas SII =================
const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const B = D.B, N = B.c.length, NS = D.subs.length, NR = D.rubros.length, NA = D.acts.length, NFO = D.formas.length;
const COM = Int8Array.from(B.c), ACT = Int16Array.from(B.a), TRAB = Int32Array.from(B.t), TRAMO = Int8Array.from(B.tr), YR = Int16Array.from(B.y), VIG = Int8Array.from(B.v);
const SEC = Int8Array.from(B.s), FOR = Int16Array.from(B.f), NSUC = Int16Array.from(B.ns);
const SUB = new Int16Array(N), RUB = new Int8Array(N), CT = new Int8Array(N), TAM = new Int8Array(N), TB = new Int8Array(N), COH = new Int8Array(N), LB = new Uint8Array(N);
const tamOf = t => (t <= 1 ? 0 : t <= 4 ? 1 : t <= 7 ? 2 : t <= 9 ? 3 : 4);
const tbOf = n => (n === 0 ? 0 : n <= 9 ? 1 : n <= 49 ? 2 : n <= 199 ? 3 : 4);
const cohOf = y => (!y ? 0 : y < 2000 ? 1 : y < 2010 ? 2 : y < 2015 ? 3 : y < 2020 ? 4 : y < 2023 ? 5 : 6);
const LS = LIN.map(l => { const a = new Uint8Array(NS); l.subs.forEach(s => { a[s] = 1; }); return a; });
const SLB = new Uint8Array(NS); for (let s = 0; s < NS; s++) for (let L = 0; L < NL; L++) if (LS[L][s]) SLB[s] |= 1 << L;
for (let i = 0; i < N; i++) { const s = D.acts[ACT[i]].s; SUB[i] = s; RUB[i] = D.subs[s].r; CT[i] = D.subs[s].k; TAM[i] = tamOf(TRAMO[i]); TB[i] = tbOf(TRAB[i]); COH[i] = cohOf(YR[i]); LB[i] = SLB[s]; }
const NAMES = B.rz.split('\n'), NAMEN = NAMES.map(norm), ACTN = D.acts.map(a => norm(a.l)), RUT = B.rut, DVS = B.dv;
const R1RUT = new Set(FR.res1.map(r => +String(r.r).split('-')[0].replace(/\./g, '')));
const NOM = Uint8Array.from(RUT, r => (R1RUT.has(r) ? 1 : 0));
const TAMS = D.tams, SECTORS = D.sectors, CTG = D.ctci;
const SECSH = ['Privada', 'Sin fines de lucro', 'Pública', 'Otra'];
const TBS = ['Sin trabajadores', '1 a 9', '10 a 49', '50 a 199', '200 o más'];
const COHS = ['Sin fecha', 'Antes de 2000', '2000–2009', '2010–2014', '2015–2019', '2020–2022', '2023–2025'];
const COHY = [null, [null, 1999], [2000, 2009], [2010, 2014], [2015, 2019], [2020, 2022], [2023, 2025]];
const RLAB = j => D.rubros[j].k + ' · ' + D.rubros[j].l;
const RIDX = k => D.rubros.findIndex(r => r.k === k);
const ctLab = j => (j ? CTG[j - 1] : 'Sin clasificación CTCI');
// tramos de ventas anuales del SII (UF); los montos exactos por empresa son reservados (secreto tributario)
const TRAMO_LAB = ['', 'Sin ventas', 'Micro 1', 'Micro 2', 'Micro 3', 'Pequeña 1', 'Pequeña 2', 'Pequeña 3', 'Mediana 1', 'Mediana 2', 'Grande 1', 'Grande 2', 'Grande 3', 'Grande 4'];
const TRAMO_LO = [0, 0, 0, 200, 600, 2400, 5000, 10000, 25000, 50000, 100000, 200000, 600000, 1000000];
const TRAMO_HI = [0, 0, 200, 600, 2400, 5000, 10000, 25000, 50000, 100000, 200000, 600000, 1000000, Infinity];
const tramoTxt = t => (t === 1 ? 'Sin ventas' : t === 13 ? 'Grande 4 · más de 1.000.000 UF' : t > 0 ? `${TRAMO_LAB[t]} · ${NF0.format(TRAMO_LO[t])}–${NF0.format(TRAMO_HI[t])} UF` : 'Sin información');
const TRAMOS = TRAMO_LAB.map((l, t) => (t === 0 ? '' : t === 1 ? 'Sin ventas' : t === 13 ? 'Grande 4 (más de 1 millón UF)' : `${l} (${NF0.format(TRAMO_LO[t])}–${NF0.format(TRAMO_HI[t])} UF)`));
function salesRange(ix) { let lo = 0, hi = 0, open = 0; for (const i of ix) { const t = TRAMO[i]; lo += TRAMO_LO[t] || 0; if (t === 13) open++; else hi += TRAMO_HI[t] || 0; } return { lo, hi, open }; }
const fUF = v => (v >= 1e6 ? NF1.format(v / 1e6) + ' millones de UF' : NF0.format(Math.round(v / 1000)) + ' mil UF');
const salesTxt = r => `entre ${fUF(r.lo)} y ${fUF(r.hi)}${r.open ? `, más ${pl(r.open, 'empresa', 'empresas')} sobre 1 millón de UF (sin tope)` : ''}`;

// series anuales agregadas (comuna × subrubro × tamaño × sector × tramo de trabajadores)
const S = D.S, NSR = S.y.length, SY0 = D.SY0, NY = D.SYN, YEND = SY0 + NY - 1, LAST = NY - 1, TY0 = (D.SYT0 || SY0) - SY0;
const SY = Int8Array.from(S.y), SCI = Int8Array.from(S.ci), SSI = Int16Array.from(S.si), STM = Int8Array.from(S.tm), SSE = Int8Array.from(S.se), STB = Int8Array.from(S.tb), SN = Int32Array.from(S.n), ST = Int32Array.from(S.t);
const YEARS = Array.from({ length: NY }, (_, i) => String(SY0 + i));
const SREG = { n: new Array(NY).fill(0), t: new Array(NY).fill(0) };
for (let r = 0; r < NSR; r++) { SREG.n[SY[r]] += SN[r]; SREG.t[SY[r]] += ST[r]; }
for (let y = 0; y < TY0; y++) SREG.t[y] = NaN;

// ---- filtros globales de empresas (barra lateral, como en Tejido Empresarial) ----
const F = { ter: new Set(), com: new Set(), lin: new Set(), rub: new Set(), sub: new Set(), act: new Set(), tam: new Set(), tb: new Set(), sec: new Set(), ctci: new Set(), nom: false, y0: null, y1: null, vig: false, q: '' };
const FP = { p0: 2014, preset: 'all' };
const pIdx = () => { let i = Math.max(0, Math.min(LAST - 1, FP.p0 - SY0)); if (F.tb.size && i < TY0) i = TY0; return i; };
const pIdxT = () => Math.max(TY0, pIdx());
const pLab = () => `${SY0 + pIdx()}–${YEND}`;
const pLabT = () => `${SY0 + pIdxT()}–${YEND}`;
const grI = (a, i0) => (a && a[i0] > 0 && isFinite(a[i0]) && isFinite(a[LAST]) ? a[LAST] / a[i0] - 1 : NaN);
const gr = a => grI(a, pIdx());
const grT = a => grI(a, pIdxT());
const hasGeo = () => F.ter.size > 0 || F.com.size > 0;
const hasLin = () => F.lin.size > 0;
const hasAttr = () => !!(F.rub.size || F.sub.size || F.act.size || F.tam.size || F.tb.size || F.sec.size || F.ctci.size || F.nom || F.y0 != null || F.y1 != null || F.vig || F.q);
const anyFilter = () => hasGeo() || hasLin() || hasAttr();
const tog = (s, v) => { if (s.has(v)) s.delete(v); else s.add(v); };
function lut(set, size) { const a = new Uint8Array(size); set.forEach(v => { a[v] = 1; }); return a; }
const GEO = new Uint8Array(NC).fill(1);
function computeGeo() { for (let c = 0; c < NC; c++) GEO[c] = (!F.ter.size || F.ter.has(TOF[c])) && (!F.com.size || F.com.has(c)) ? 1 : 0; }
const geoList = () => ALLCOM.filter(c => GEO[c]);
const ALLCOM = [...Array(NC).keys()];
const NOSKIP = new Set();
function mask(skip = NOSKIP) {
  const uG = !skip.has('geo') && hasGeo(), linM = !skip.has('lin') ? [...F.lin].reduce((a, L) => a | (1 << L), 0) : 0;
  const rk = !skip.has('rub'), uR = rk && F.rub.size > 0, uS = rk && F.sub.size > 0, uA = rk && F.act.size > 0;
  const uT = !skip.has('tam') && F.tam.size > 0, uB = !skip.has('tb') && F.tb.size > 0, uE = !skip.has('sec') && F.sec.size > 0, uK = !skip.has('ctci') && F.ctci.size > 0, uN = !skip.has('nom') && F.nom;
  const y0 = F.y0, y1 = F.y1, uV = F.vig, q = F.q, uQ = q.length > 0, qd = /^\d+$/.test(q) ? q : null;
  const lR = lut(F.rub, NR), lS = lut(F.sub, NS), lA = lut(F.act, NA), lT = lut(F.tam, 5), lB = lut(F.tb, 5), lE = lut(F.sec, 4), lK = lut(F.ctci, 6);
  const m = new Uint8Array(N); let n = 0;
  for (let i = 0; i < N; i++) {
    if (uG && !GEO[COM[i]]) continue;
    if (linM && !(LB[i] & linM)) continue;
    if (uR && !lR[RUB[i]]) continue;
    if (uS && !lS[SUB[i]]) continue;
    if (uA && !lA[ACT[i]]) continue;
    if (uT && !lT[TAM[i]]) continue;
    if (uB && !lB[TB[i]]) continue;
    if (uE && !lE[SEC[i]]) continue;
    if (uK && !lK[CT[i]]) continue;
    if (uN && !NOM[i]) continue;
    if (y0 != null && (!YR[i] || YR[i] < y0)) continue;
    if (y1 != null && (!YR[i] || YR[i] > y1)) continue;
    if (uV && !VIG[i]) continue;
    if (uQ && !(NAMEN[i].includes(q) || ACTN[ACT[i]].includes(q) || (qd && String(RUT[i]).startsWith(qd)))) continue;
    m[i] = 1; n++;
  }
  m.n = n; return m;
}
const ALL = new Uint8Array(N).fill(1); ALL.n = N;
// series con los filtros que la serie admite (rubro, subrubro, tamaño, trabajadores, sector, CTCI, lineamiento; territorio opcional)
const seriesPartial = () => F.act.size > 0 || F.nom || F.y0 != null || F.y1 != null || F.vig || F.q.length > 0;
function seriesAgg(useGeo, useLin = true) {
  const lR = lut(F.rub, NR), lS = lut(F.sub, NS), lT = lut(F.tam, 5), lB = lut(F.tb, 5), lE = lut(F.sec, 4), lK = lut(F.ctci, 6);
  const uR = F.rub.size > 0, uS = F.sub.size > 0, uT = F.tam.size > 0, uB = F.tb.size > 0, uE = F.sec.size > 0, uK = F.ctci.size > 0, uG = useGeo && hasGeo();
  const linM = useLin ? [...F.lin].reduce((a, L) => a | (1 << L), 0) : 0;
  const n = new Array(NY).fill(0), t = new Array(NY).fill(0), pcy = new Float64Array(NY * NC);
  for (let r = 0; r < NSR; r++) {
    const c = SCI[r], si = SSI[r];
    if (uG && !GEO[c]) continue;
    if (linM && !(SLB[si] & linM)) continue;
    if (uR && !lR[D.subs[si].r]) continue;
    if (uS && !lS[si]) continue;
    if (uT && !lT[STM[r]]) continue;
    if (uB && !lB[STB[r]]) continue;
    if (uE && !lE[SSE[r]]) continue;
    if (uK && !lK[D.subs[si].k]) continue;
    n[SY[r]] += SN[r]; t[SY[r]] += ST[r]; pcy[SY[r] * NC + c] += SN[r];
  }
  for (let y = 0; y < TY0; y++) { t[y] = NaN; if (uB) { n[y] = NaN; for (let c = 0; c < NC; c++) pcy[y * NC + c] = NaN; } }
  return { n, t, pcy, partial: seriesPartial(), tamApprox: uT && pIdx() < TY0 };
}

// ---- agregados de la cartera (territorio × lineamiento): se recalculan con los filtros que no son de territorio ni de lineamiento ----
const z2 = () => Array.from({ length: NT }, () => new Array(NL).fill(0));
const cN = z2(), cT = z2(), c10 = z2();
const tN = new Array(NT).fill(0), tT = new Array(NT).fill(0), tTpub = new Array(NT).fill(0), rN = new Array(NL).fill(0), rT = new Array(NL).fill(0);
const comN = new Array(NC).fill(0), comLN = Array.from({ length: NC }, () => new Array(NL).fill(0));
const T10 = new Array(NT).fill(0), TSALES = new Array(NT).fill(null);
let totT = 0, NSEL = N, MA = ALL;
const serC = Array.from({ length: NT }, () => Array.from({ length: NL }, () => new Float64Array(NY)));
const serR = Array.from({ length: NL }, () => new Float64Array(NY));
const serT = Array.from({ length: NT }, () => new Float64Array(NY)), serAll = new Float64Array(NY);
function recomputeSII(m) {
  MA = m; NSEL = m.n; totT = 0;
  for (let t = 0; t < NT; t++) { tN[t] = tT[t] = tTpub[t] = T10[t] = 0; cN[t].fill(0); cT[t].fill(0); c10[t].fill(0); }
  rN.fill(0); rT.fill(0); comN.fill(0); comLN.forEach(a => a.fill(0));
  const vig = Array.from({ length: NT }, () => []);
  for (let i = 0; i < N; i++) {
    if (!m[i]) continue;
    const c = COM[i], t = TOF[c], lb = LB[i], w = TRAB[i];
    tN[t]++; tT[t] += w; comN[c]++; totT += w; if (SEC[i] === 2) tTpub[t] += w; if (w >= 10) T10[t]++; if (VIG[i]) vig[t].push(i);
    if (lb) for (let L = 0; L < NL; L++) if (lb & (1 << L)) { cN[t][L]++; cT[t][L] += w; if (w >= 10) c10[t][L]++; rN[L]++; rT[L] += w; comLN[c][L]++; }
  }
  for (let t = 0; t < NT; t++) TSALES[t] = salesRange(vig[t]);
  // series de la matriz: filtros de atributos (sin territorio ni lineamiento)
  const lR = lut(F.rub, NR), lS = lut(F.sub, NS), lT = lut(F.tam, 5), lB = lut(F.tb, 5), lE = lut(F.sec, 4), lK = lut(F.ctci, 6);
  const uR = F.rub.size > 0, uS = F.sub.size > 0, uT = F.tam.size > 0, uB = F.tb.size > 0, uE = F.sec.size > 0, uK = F.ctci.size > 0;
  serT.forEach(a => a.fill(0)); serAll.fill(0); serR.forEach(a => a.fill(0)); serC.forEach(r => r.forEach(a => a.fill(0)));
  for (let r = 0; r < NSR; r++) {
    const si = SSI[r];
    if (uR && !lR[D.subs[si].r]) continue; if (uS && !lS[si]) continue; if (uT && !lT[STM[r]]) continue; if (uB && !lB[STB[r]]) continue; if (uE && !lE[SSE[r]]) continue; if (uK && !lK[D.subs[si].k]) continue;
    const t = TOF[SCI[r]], y = SY[r], n = SN[r], lb = SLB[si];
    serT[t][y] += n; serAll[y] += n;
    if (lb) for (let L = 0; L < NL; L++) if (lb & (1 << L)) { serC[t][L][y] += n; serR[L][y] += n; }
  }
  if (uB) for (let y = 0; y < TY0; y++) { serAll[y] = NaN; serT.forEach(a => { a[y] = NaN; }); serR.forEach(a => { a[y] = NaN; }); serC.forEach(row => row.forEach(a => { a[y] = NaN; })); }
}
recomputeSII(ALL);
const TN0 = tN.slice();   // totales sin filtros (simulador)
const lqN = (t, L) => (tN[t] && rN[L] ? (cN[t][L] / tN[t]) / (rN[L] / NSEL) : NaN);
const lqT = (t, L) => (tT[t] && rT[L] ? (cT[t][L] / tT[t]) / (rT[L] / totT) : NaN);
const lqCom = (c, L) => (comN[c] && rN[L] ? (comLN[c][L] / comN[c]) / (rN[L] / NSEL) : NaN);
const terOn = t => !hasGeo() || TER[t].c.some(c => GEO[c]);
const linOn = L => !hasLin() || F.lin.has(L);

// ================= infraestructura =================
const IN = FR.infra;
const sumC = (k, cs) => cs.reduce((a, c) => a + IN[k][c], 0);
const popC = cs => cs.reduce((a, c) => a + POP[c], 0);
const ALLC = [...Array(NC).keys()];
const HABS = [
  { k: 'pav', l: 'Red vial pavimentada', u: '% de los km', bad: 'low', f: v => pc(v, 0), v: cs => sumC('kmpav', cs) / sumC('kmv', cs), a8: '2a', lin: ['L2', 'L3', 'L5'] },
  { k: 'pmad', l: 'Puentes con tablero de madera', u: '% de los puentes', bad: 'high', f: v => pc(v, 0), v: cs => sumC('pmad', cs) / sumC('pue', cs), a8: '2a', lin: ['L3', 'L5'] },
  { k: 'saidi', l: 'Interrupción eléctrica (SAIDI 2022)', u: 'horas al año', bad: 'high', f: v => f1(v) + ' h', v: cs => cs.reduce((a, c) => a + IN.saidi[c] * POP[c], 0) / popC(cs), a8: '2b', lin: ['L4', 'L1', 'L3'] },
  { k: 'vse', l: 'Viviendas sin energía eléctrica', u: 'por 1.000 hab.', bad: 'high', f: v => f1(v), v: cs => sumC('vse', cs) / popC(cs) * 1000, a8: '2b', lin: ['L4'] },
  { k: 'ant', l: 'Antenas de telefonía móvil', u: 'por 100 km²', bad: 'low', f: v => f1(v), v: cs => sumC('ant', cs) / cs.reduce((a, c) => a + D.comunas[c].km2, 0) * 100, a8: '2g', lin: ['L6'] },
];
const quant = (vals, p) => { const v = vals.filter(isFinite).sort((a, b) => a - b); const k = (v.length - 1) * p, lo = Math.floor(k), hi = Math.ceil(k); return v[lo] + (v[hi] - v[lo]) * (k - lo); };
const HV = {}, HTH = {}, HREG = {};
HABS.forEach(h => {
  HV[h.k] = ALLC.map(c => h.v([c]));
  HTH[h.k] = [quant(HV[h.k], 1 / 3), quant(HV[h.k], 2 / 3)];
  HREG[h.k] = h.v(ALLC);
});
const isGap = (h, v) => (h.bad === 'high' ? v >= HTH[h.k][1] : v <= HTH[h.k][0]);
const BRE = ALLC.map(c => HABS.filter(h => isGap(h, HV[h.k][c])).map(h => h.k));
const terHab = (h, ti) => h.v(TER[ti].c);
// territory status vs region: worse / similar / better (±10% band)
function status(h, v) {
  const r = HREG[h.k], d = (v - r) / r;
  if (!isFinite(d) || Math.abs(d) < 0.1) return 'mid';
  return (h.bad === 'high' ? d > 0 : d < 0) ? 'bad' : 'ok';
}
const ST_LAB = { bad: 'Peor que la región', mid: 'Similar a la región', ok: 'Mejor que la región' };
const IES = FR.iesList;
const iesOfTer = ti => TER[ti].c.flatMap(c => (IES[c] || []).map(x => ({ n: x[0], t: x[1], c })));
const EXE = FR.exe, EXENO = FR.exeNo, RES1 = FR.res1, RES33 = FR.res33;
function exePill(x) { return x.r1 ? '<span class="pill ct" title="Figura en la Res. 1/2026">Nómina 2026</span>' : x.t === 'pub' ? `<span class="pill" title="${esc(x.base)}">Pública</span>` : '<span class="pill warn">Revisar</span>'; }
function exeFor(t, L) {
  const tc = new Set(TER[t].c);
  return EXE.map(x => ({ ...x, inT: x.c.some(c => tc.has(c)) })).filter(x => x.an.L[L] > 0 || x.inT)
    .sort((a, b) => (b.an.L[L] - a.an.L[L]) || (b.inT - a.inT) || (b.an.n - a.an.n)).slice(0, 7);
}
const rezPop = ti => TER[ti].c.filter(c => IN.rez[c] > 0).reduce((a, c) => a + POP[c], 0);

// ================= evidencia territorial (fase 4) =================
const CX = FR.ctx, KM2 = c => D.comunas[c].km2;
const cxS = (k, cs) => cs.reduce((a, c) => a + (CX[k][c] || 0), 0);
const cxW = (k, cs, w) => { let s = 0, W = 0; for (const c of cs) { const v = CX[k][c]; if (v == null) continue; const x = w(c); s += v * x; W += x; } return W ? s / W : NaN; };
const wPop = c => POP[c];
const pc1 = v => pc(v, 1), pcp = v => (isFinite(v) ? NF1.format(v) + '%' : '–');
const sgn = (v, d = 1, u = '') => (isFinite(v) ? (v > 0 ? '+' : v < 0 ? '−' : '') + (d === 0 ? NF0 : d === 2 ? NF2 : NF1).format(Math.abs(v)) + u : '–');
const EVG = { eq: 'Equidad y población', ag: 'Agua y clima', ri: 'Riesgos', agro: 'Agro y uso del suelo', mu: 'Capacidad municipal' };
const EVSRC = { eq: ['sae', 'censo', 'conadi'], ag: ['censo', 'arclim'], ri: ['conaf', 'prot'], agro: ['caf'], mu: ['sinim'] };
const CULT = ['caf_cer', 'caf_leg', 'caf_ind', 'caf_hor', 'caf_fru', 'caf_for'];
const EVI = [
  { k: 'pmd', g: 'eq', l: 'Pobreza multidimensional', u: '% de personas · SAE 2022', bad: 'high', f: pc1, v: cs => cxS('pmdN', cs) / cxS('saeN', cs) },
  { k: 'pin', g: 'eq', l: 'Pobreza por ingresos', u: '% de personas · SAE 2022', bad: 'high', f: pc1, v: cs => cxS('pinN', cs) / cxS('saeN', cs) },
  { k: 'ia', g: 'eq', l: 'Inseguridad alimentaria moderada o severa', u: '% de hogares · SAE 2022', bad: 'high', f: pc1, v: cs => cxW('ia', cs, c => CX.saeN[c]) },
  { k: 'ind', g: 'eq', l: 'Población perteneciente a pueblos indígenas', u: '% · Censo 2024', f: pc1, v: cs => cxS('pind', cs) / cxS('pindb', cs) },
  { k: 'cind', g: 'eq', l: 'Comunidades indígenas registradas', u: 'N° · CONADI', f: f0, v: cs => cxS('cind', cs), sum: 1 },
  { k: 'rur', g: 'eq', l: 'Población rural', u: '% · SINIM', f: pcp, v: cs => cxW('rur', cs, wPop) },
  { k: 'sred', g: 'ag', l: 'Viviendas sin red pública de agua', u: '% de las viviendas ocupadas · Censo 2024', bad: 'high', f: pc1, v: cs => 1 - cxS('vred', cs) / cxS('vagua', cs) },
  { k: 'alj', g: 'ag', l: 'Viviendas abastecidas por camión aljibe', u: 'por 1.000 viviendas · Censo 2024', bad: 'high', f: f1, v: cs => cxS('valj', cs) / cxS('vagua', cs) * 1000 },
  { k: 'prd', g: 'ag', l: 'Cambio proyectado de la precipitación anual', u: '% · ARClim, SSP2-4.5', bad: 'low', f: v => sgn(v, 1, '%'), v: cs => cxW('prd', cs, KM2) },
  { k: 'pr', g: 'ag', l: 'Precipitación anual actual', u: 'mm · ARClim', f: f0, v: cs => cxW('pr', cs, KM2) },
  { k: 'cdd', g: 'ag', l: 'Racha seca máxima actual', u: 'días · ARClim', bad: 'high', f: f1, v: cs => cxW('cdd', cs, KM2) },
  { k: 'sud', g: 'ag', l: 'Aumento de días de verano (máxima sobre 25 °C)', u: 'días al año · ARClim', bad: 'high', f: v => sgn(v, 0), v: cs => cxW('sud', cs, KM2) },
  { k: 'txd', g: 'ag', l: 'Aumento de la temperatura máxima media', u: '°C · ARClim', bad: 'high', f: v => sgn(v, 1, ' °C'), v: cs => cxW('txd', cs, KM2) },
  { k: 'etod', g: 'ag', l: 'Aumento de la evapotranspiración de referencia', u: 'mm al día · ARClim', bad: 'high', f: v => sgn(v, 2), v: cs => cxW('etod', cs, KM2) },
  { k: 'fdd', g: 'ag', l: 'Cambio en días con helada', u: 'días al año · ARClim', f: v => sgn(v, 0), v: cs => cxW('fdd', cs, KM2) },
  { k: 'gdc', g: 'ag', l: 'Grados-día de calefacción (base 15 °C)', u: 'por año · ARClim, ponderado por población', bad: 'high', f: f0, v: cs => cxW('gdc', cs, wPop) },
  { k: 'incp', g: 'ri', l: 'Superficie afectada por incendios forestales', u: '% de la superficie comunal · 2024-25 · CONAF', bad: 'high', f: v => pc(v, 2), v: cs => cxS('incha', cs) / (cs.reduce((a, c) => a + KM2(c), 0) * 100) },
  { k: 'incha', g: 'ri', l: 'Hectáreas afectadas por incendios forestales', u: 'ha · 2024-25 · CONAF', f: f0, v: cs => cxS('incha', cs), sum: 1 },
  { k: 'incn', g: 'ri', l: 'Incendios forestales', u: 'N° · 2024-25 · CONAF', f: f0, v: cs => cxS('incn', cs), sum: 1 },
  { k: 'inu', g: 'ri', l: 'Zonas de amenaza de inundación o anegamiento', u: 'km² · PROT, cobertura parcial', f: f1, v: cs => cxS('inu', cs), sum: 1 },
  { k: 'upa', g: 'agro', l: 'Unidades productivas agropecuarias (UPA)', u: 'N° · CAF 2021', f: f0, v: cs => cxS('caf_upa', cs), sum: 1 },
  { k: 'upaa', g: 'agro', l: 'UPA de autoconsumo', u: '% de las UPA · CAF 2021', bad: 'high', f: pc1, v: cs => cxS('caf_upaa', cs) / cxS('caf_upa', cs) },
  { k: 'rie', g: 'agro', l: 'Superficie cultivada con riego', u: '% · CAF 2021', bad: 'low', f: pc1, v: cs => cxS('caf_rie', cs) / (cxS('caf_rie', cs) + cxS('caf_sec', cs)) },
  { k: 'cul', g: 'agro', l: 'Cultivos anuales, frutales y forrajeras', u: 'ha · CAF 2021', f: f0, v: cs => CULT.reduce((a, k) => a + cxS(k, cs), 0), sum: 1 },
  { k: 'pra', g: 'agro', l: 'Praderas naturales y mejoradas', u: 'ha · CAF 2021', f: f0, v: cs => cxS('caf_pra', cs), sum: 1 },
  { k: 'pla', g: 'agro', l: 'Plantaciones forestales en predios censados', u: 'ha · CAF 2021', f: f0, v: cs => cxS('caf_pla', cs), sum: 1 },
  { k: 'bn', g: 'agro', l: 'Bosque nativo en predios censados', u: 'ha · CAF 2021', f: f0, v: cs => cxS('caf_bn', cs), sum: 1 },
  { k: 'pnt', g: 'agro', l: 'Terrenos productivos no trabajados', u: '% de la superficie censada · CAF 2021', bad: 'high', f: pc1, v: cs => cxS('caf_pnt', cs) / cxS('caf_sup', cs) },
  { k: 'fcm', g: 'mu', l: 'Dependencia del Fondo Común Municipal', u: '% de los ingresos propios · SINIM 2024', bad: 'high', f: pcp, v: cs => cxW('fcm', cs, wPop), avg: 1 },
  { k: 'prof', g: 'mu', l: 'Profesionalización del personal municipal', u: '% · SINIM 2024', bad: 'low', f: pcp, v: cs => cxW('prof', cs, wPop), avg: 1 },
  { k: 'ippc', g: 'mu', l: 'Ingresos propios permanentes por habitante', u: 'miles de $ · SINIM 2024', bad: 'low', f: f0, v: cs => cxW('ippc', cs, wPop), avg: 1 },
  { k: 'pinv', g: 'mu', l: 'Inversión en el gasto municipal', u: '% · SINIM 2024', bad: 'low', f: pcp, v: cs => cxW('pinv', cs, wPop), avg: 1 },
  { k: 'pext', g: 'mu', l: 'Inversión municipal con recursos externos', u: '% · SINIM, promedio 2022–2024', f: pcp, v: cs => cxW('pext', cs, wPop), avg: 1 },
];
const EVK = Object.fromEntries(EVI.map(e => [e.k, e]));
const EVV = {}, EVTH = {}, EVREG = {};
EVI.forEach(e => { EVV[e.k] = ALLC.map(c => e.v([c])); EVTH[e.k] = [quant(EVV[e.k], 1 / 3), quant(EVV[e.k], 2 / 3)]; EVREG[e.k] = e.v(ALLC); });
const evGap = (e, v) => (e.bad === 'high' ? v >= EVTH[e.k][1] : e.bad === 'low' ? v <= EVTH[e.k][0] : false);
function evStatus(e, v) {
  if (!e.bad || e.sum) return 'mid';
  const r = EVREG[e.k], d = (v - r) / Math.abs(r);
  if (!isFinite(d) || Math.abs(d) < 0.1) return 'mid';
  return (e.bad === 'high' ? d > 0 : d < 0) ? 'bad' : 'ok';
}
// comuna con el valor más desfavorable del territorio (o la de mayor valor si el indicador no tiene sentido de «peor»)
const evWorst = (e, cs) => [...cs].filter(c => isFinite(EVV[e.k][c])).sort((a, b) => (e.bad === 'low' ? EVV[e.k][a] - EVV[e.k][b] : EVV[e.k][b] - EVV[e.k][a]))[0];
// indicadores de necesidad por lineamiento (más equidad y contraparte municipal en todas las fichas)
const EVL = {
  L1: ['prd', 'cdd', 'txd', 'etod', 'sred', 'alj', 'rie', 'incp', 'inu'],
  L2: ['bn', 'pla', 'incp', 'cind', 'upa'],
  L3: ['upa', 'upaa', 'rie', 'pnt', 'ia', 'prd', 'sud'],
  L4: ['gdc', 'pin', 'rur'],
  L5: ['pla', 'incp', 'upa', 'pinv'],
  L6: ['rur', 'pin', 'prof'],
};
const evFor = Lk => [...new Set([...EVL[Lk], 'pmd', 'ind', 'fcm', 'prof'])].map(k => EVK[k]);
const SPV = CX.caf_spv;
const spTer = cs => SPV.map((n, j) => cs.reduce((a, c) => a + (CX.caf_sp[c][j] || 0), 0));
const SPREG = spTer(ALLC);
const evVal = (e, cs) => { const v = e.v(cs); return e.sum ? `${e.f(v)}${cs.length < NC && EVREG[e.k] ? ` <small>(${pc(v / EVREG[e.k], 0)} de la región)</small>` : ''}` : e.f(v); };

// ================= financiamiento existente (fase 2) =================
const FN = FR.fin, NFN = FN.s.length, SRCN = FN.meta.src;
const FN_S = Int8Array.from(FN.s), FN_Y = Int16Array.from(FN.y), FN_C = Int8Array.from(FN.c), FN_L = Uint8Array.from(FN.L);
const FN_M = Float64Array.from(FN.m, v => (v == null ? NaN : v));
const FN_N = FN.n.split('\n');
const FN_T = Int8Array.from(FN.c, c => (c >= 0 ? TOF[c] : -1));
const fnI = i => FN.i.v[FN.i.x[i]], fnP = i => FN.p.v[FN.p.x[i]], fnG = i => FN.g.v[FN.g.x[i]];
const S_ANID = SRCN.indexOf('ANID'), S_CORFO = SRCN.indexOf('CORFO'), S_BIP = SRCN.indexOf('BIP');
const BIPCAT = { ctci: 'CTCI e innovación', fom: 'Fomento productivo', rie: 'Riego', apr: 'Agua potable rural', via: 'Conectividad vial, portuaria y ferroviaria', ene: 'Energía', res: 'Residuos', dig: 'Conectividad digital' };
const BIPA8 = { fom: 'N°1', rie: '1d', via: '2a', ene: '2b', res: '2c', dig: '2g', ctci: 'N°3', apr: '–' };
const GLAB = { cid: 'I+D empresarial', apl: 'Aplicada y transferencia', bas: 'Básica (Fondecyt)', cen: 'Centros y anillos', eqp: 'Equipamiento', chv: 'Capital humano y vinculación', inn: 'Innovación empresarial', ent: 'Entorno y difusión' };
const PRODCAT = new Set(['ctci', 'fom', 'rie', 'ene', 'res', 'dig']);
const HABCAT = ['via', 'apr', 'rie', 'ene', 'res', 'dig'];
// un proyecto "cuenta" para una celda si es ANID/CORFO, o BIP productivo o CTCI, y tiene el lineamiento
const fnProd = i => FN_S[i] !== S_BIP || PRODCAT.has(fnG(i));
const fnHasL = (i, L) => (FN_L[i] >> L) & 1;
const finN = z2(), finM = z2();
for (let i = 0; i < NFN; i++) { const t = FN_T[i]; if (t < 0 || !fnProd(i)) continue; for (let L = 0; L < NL; L++) if (fnHasL(i, L)) { finN[t][L]++; if (isFinite(FN_M[i])) finM[t][L] += FN_M[i]; } }
const fnCell = (t, L) => { const o = []; for (let i = 0; i < NFN; i++) if (FN_T[i] === t && fnProd(i) && fnHasL(i, L)) o.push(i); return o; };
const fnRegL = L => { const o = []; for (let i = 0; i < NFN; i++) if (FN_C[i] < 0 && fnProd(i) && fnHasL(i, L)) o.push(i); return o; };
const byAmt = (a, b) => (isFinite(FN_M[b]) ? FN_M[b] : -1) - (isFinite(FN_M[a]) ? FN_M[a] : -1);
const sumM = ix => ix.reduce((a, i) => a + (isFinite(FN_M[i]) ? FN_M[i] : 0), 0);
const mm = v => (v >= 1000 ? f0(v) : v >= 10 ? f0(v) : f1(v)) + ' MM$';
// BIP habilitante por comuna (para mapa y tabla)
const binvC = new Array(NC).fill(0);
for (let i = 0; i < NFN; i++) if (FN_S[i] === S_BIP && FN_C[i] >= 0 && HABCAT.includes(fnG(i)) && isFinite(FN_M[i])) binvC[FN_C[i]] += FN_M[i];
function finRow(i) {
  const s = SRCN[FN_S[i]], g = fnG(i);
  const tag = s === 'BIP' ? `BIP · ${BIPCAT[g]}` : s === 'ANID' ? `ANID · ${GLAB[g] || ''}` : `CORFO · ${GLAB[g] || ''}`;
  return `<div class="firm"><span title="${esc(FN_N[i])}">${esc(FN_N[i])}</span><b>${isFinite(FN_M[i]) ? mm(FN_M[i]) : 's/m'}</b><small>${esc(tag)} · ${FN_Y[i]} · ${esc(fnI(i))}${FN_C[i] >= 0 ? ' · ' + esc(CN(FN_C[i])) : ''}</small></div>`;
}

// ================= estado =================
const UI = { view: 'cartera', t: TIDX.VCE, L: LIDX.L3, mode: 'lq', fb: new Set(), fn: new Set(), fm: new Set(), line: null,
  ter: TIDX.VCE, mInd: 'ter', mLin: LIDX.L3, layers: new Set(['tl', 'ies', 'erd']), hbScope: 'all', hbSort: 'bre', hbDir: -1,
  sim: { monto: 10000, ctci: 30, adm: 3, reg: 15, w: { pop: 40, bre: 20, rez: 15, emp: 15, eq: 10 } } };
const fActive = () => UI.fb.size || UI.fn.size || UI.fm.size || UI.line;
function entryPass(e) {
  const ln = LINE[e.l];
  if (UI.line && e.l !== UI.line) return false;
  if (UI.fb.size && !UI.fb.has(ln.b)) return false;
  if (UI.fm.size && !UI.fm.has(e.m)) return false;
  if (UI.fn.size) { const ns = lineNums(ln); if (![...UI.fn].some(n => ns.has(n))) return false; }
  return true;
}

// ================= colores =================
function hex2rgb(h) { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); }
function mix(a, b, t) { const A = hex2rgb(a), Bc = hex2rgb(b); return '#' + A.map((x, i) => Math.round(x + (Bc[i] - x) * t).toString(16).padStart(2, '0')).join(''); }
function lumi(h) { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; const [r, g, b] = hex2rgb(h); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); }
const SEQ = ['--s1', '--s2', '--s3', '--s4', '--s5'].map(css);
const DIV = { neg: css('--dneg'), mid: css('--dmid'), pos: css('--dpos') };
const BADR = [css('--surf3'), '#5A3631', '#86463C', '#B35D4E', css('--bad')];
const NODATA = css('--nodata'), SURF2 = css('--surf2');
const MADC = { 1: css('--m1'), 2: css('--m2'), 3: css('--m3') };
const lqColor = v => { if (!isFinite(v)) return NODATA; const x = Math.max(-1, Math.min(1, Math.log2(Math.max(v, 1e-6)) / 1.4)); return x < 0 ? mix(DIV.mid, DIV.neg, -x) : mix(DIV.mid, DIV.pos, x); };
const ramp = (pal, t) => { t = Math.max(0, Math.min(1, t)); const p = t * (pal.length - 1), i = Math.min(Math.floor(p), pal.length - 2); return mix(pal[i], pal[i + 1], p - i); };
const inkOn = bg => (lumi(bg) > 0.33 ? '#0E1317' : '#E6ECEE');

// ================= tooltip / toast =================
const tip = $('#tip');
function showTip(ev, title, rows, note) {
  tip.replaceChildren();
  if (title) { const d = document.createElement('div'); d.className = 'tt'; d.textContent = title; tip.appendChild(d); }
  for (const [v, l] of rows || []) { const r = document.createElement('div'); r.className = 'tr'; const b = document.createElement('b'); b.textContent = v; const s = document.createElement('span'); s.textContent = l; r.append(b, s); tip.appendChild(r); }
  if (note) { const d = document.createElement('div'); d.className = 'tn'; d.textContent = note; tip.appendChild(d); }
  tip.hidden = false; placeTip(ev);
}
function placeTip(ev) {
  let x, y;
  if (ev && ev.clientX != null && ev.type !== 'focus' && ev.type !== 'focusin') { x = ev.clientX; y = ev.clientY; }
  else if (ev && ev.target && ev.target.getBoundingClientRect) { const r = ev.target.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top; } else return;
  const w = tip.offsetWidth, h = tip.offsetHeight;
  let L = x + 14, T = y + 14;
  if (L + w > innerWidth - 8) L = x - w - 14;
  if (T + h > innerHeight - 8) T = y - h - 14;
  tip.style.left = Math.max(8, L) + 'px'; tip.style.top = Math.max(8, T) + 'px';
}
const hideTip = () => { tip.hidden = true; };
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 3200); }
window.addEventListener('scroll', hideTip, { passive: true });

// ================= mini mapa de ubicación =================
const VB = D.geo.vb;
function locator(ti, extra) {
  const s = TER.map((t, i) => `<path d="${t.d}" fill="${i === ti ? 'var(--sel)' : 'var(--surf3)'}" stroke="var(--bg)" stroke-width="6"/>`).join('');
  return `<svg viewBox="${VB.join(' ')}" role="img" aria-label="Ubicación de ${esc(TER[ti].n)}">${s}${extra || ''}</svg>`;
}

// ================= vistas =================
const VIEWS = ['cartera', 'territorios', 'empresas', 'evid', 'marco', 'bip', 'simulador', 'compras'];
const FIRMV = new Set(['cartera', 'territorios', 'empresas']);
const rendered = {};
function setView(v) {
  UI.view = v;
  VIEWS.forEach(k => { $('#tab-' + k).setAttribute('aria-selected', String(k === v)); $('#v-' + k).hidden = k !== v; });
  $('#work').classList.toggle('norail', !FIRMV.has(v));
  $('#rail').classList.remove('open');
  hideTip();
  if (v === 'cartera') { renderCartera(DIRTY.cartera); DIRTY.cartera = false; }
  if (v === 'territorios') { renderTerritorios(); DIRTY.territorios = false; }
  if (v === 'empresas') renderEmpresas();
  if (v === 'marco' && !rendered.marco) { renderMarco(); rendered.marco = true; }
  if (v === 'simulador') renderSim();
  if (v === 'bip') renderBip();
  if (v === 'evid') renderEvid();
  if (v === 'compras') renderCompras();
  try { history.replaceState(null, '', '#' + v); } catch (_) {}
}
VIEWS.forEach(k => $('#tab-' + k).addEventListener('click', () => setView(k)));
$('.tabs').addEventListener('keydown', e => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const i = VIEWS.indexOf(UI.view), j = (i + (e.key === 'ArrowRight' ? 1 : -1) + VIEWS.length) % VIEWS.length;
  setView(VIEWS[j]); $('#tab-' + VIEWS[j]).focus();
});

// ================= CARTERA =================
function renderKpis() {
  const vis = ENT.filter(entryPass);
  const ctci = vis.filter(e => isCTCI(LINE[e.l])).length, m3 = vis.filter(e => e.m === 3).length;
  const gaps = cellList().filter(x => !CELL[TER[x.t].k + '|' + LIN[x.L].k] && lqN(x.t, x.L) >= 1.1).length;
  const nl = new Set(vis.map(e => e.l)).size;
  const k = (l, v, s) => `<div class="kpi"><span class="l">${l}</span><span class="v">${v}</span><span class="s">${s}</span></div>`;
  $('#kpis').innerHTML = [
    k('Entradas de la cartera', `${vis.length}<small> / ${ENT.length}</small>`, fActive() ? 'con los filtros aplicados' : 'de 48 celdas territorio × lineamiento'),
    k('Líneas de inversión', `${nl}<small> / ${LINES.length}</small>`, nl === LINES.length - 2 && !fActive() ? 'con celdas; L-02 y L-03 son transversales' : 'con entradas visibles'),
    k('Entradas que aportan al piso CTCI', String(ctci), 'de la cartera, con categoría art. 8 N°3 (no son empresas)'),
    k('Evidencia levantada', String(m3), 'entradas en madurez 3 de 3'),
    k('Especialización sin entrada', String(gaps), 'celdas vacías con cociente ≥ 1,1'),
  ].join('');
}
const cellList = () => { const o = []; for (let t = 0; t < NT; t++) for (let L = 0; L < NL; L++) o.push({ t, L }); return o; };

function renderFbar() {
  const tg = (grp, v, lab, title) => `<button type="button" class="tog" data-g="${grp}" data-v="${v}" aria-pressed="${UI[grp].has(grp === 'fm' ? +v : v)}"${title ? ` title="${esc(title)}"` : ''}>${lab}</button>`;
  $('#fbar').innerHTML =
    `<div class="fgrp"><span class="lbl">Bloque</span>${Object.entries(BLOQ).map(([k, n]) => tg('fb', k, `${k} · ${esc(n)}`)).join('')}</div>` +
    `<div class="fgrp"><span class="lbl">Art. 8</span>${tg('fn', '1', 'N°1 Fomento productivo', FR.art8[0].d)}${tg('fn', '2', 'N°2 Desarrollo regional', FR.art8[1].d)}${tg('fn', '3', 'N°3 CTCI', FR.art8[2].d)}</div>` +
    `<div class="fgrp"><span class="lbl">Madurez</span>${[3, 2, 1].map(m => tg('fm', m, `${m} · ${{ 3: 'levantada', 2: 'parcial', 1: 'por levantar' }[m]}`, MADT[m])).join('')}</div>` +
    (UI.line ? `<div class="fgrp"><span class="lbl">Línea</span><button type="button" class="tog" id="f-line" aria-pressed="true" title="Quitar el filtro de línea">${UI.line} ${esc(LINE[UI.line].n)} ✕</button></div>` : '') +
    `<button type="button" class="btn clear" id="f-clear"${fActive() ? '' : ' hidden'}>Quitar filtros</button>`;
  $$('#fbar .tog[data-g]').forEach(b => b.addEventListener('click', () => {
    const g = b.dataset.g, v = g === 'fm' ? +b.dataset.v : b.dataset.v;
    if (UI[g].has(v)) UI[g].delete(v); else UI[g].add(v);
    renderCartera(true);
  }));
  if (UI.line) $('#f-line').addEventListener('click', () => selectLine(null));
  $('#f-clear').addEventListener('click', () => { UI.fb.clear(); UI.fn.clear(); UI.fm.clear(); UI.line = null; renderCartera(true); });
}

function cellVal(t, L) {
  const e = CELL[TER[t].k + '|' + LIN[L].k];
  if (UI.mode === 'lq') { const v = lqN(t, L); return { v, txt: f2(v), bg: lqColor(v) }; }
  if (UI.mode === 'n') { const v = cN[t][L], mx = Math.max(...cN.flat()); return { v, txt: f0(v), bg: ramp(SEQ, Math.log(1 + v) / Math.log(1 + mx)) }; }
  if (UI.mode === 'g') { const g = gr(serC[t][L]), gR = gr(serR[L]); return { v: g, txt: pcs(g), bg: lqColor((1 + g) / (1 + gR)) }; }
  if (UI.mode === 'fin') { const v = finN[t][L], mx = Math.max(...finN.flat()); return { v, txt: f0(v), bg: v ? ramp(SEQ, Math.log(1 + v) / Math.log(1 + mx)) : NODATA }; }
  return { v: e ? e.m : NaN, txt: '', bg: e ? MADC[e.m] : NODATA };
}
function renderMatrix() {
  const host = $('#mx');
  let h = '<div></div>' + LIN.map((l, L) => `<div class="ch${linOn(L) ? '' : ' dim'}" title="${esc(l.n)}"><b>${l.k}</b><span>${esc(LSHORT[l.k])}</span></div>`).join('');
  for (let t = 0; t < NT; t++) {
    const T = TER[t];
    h += `<button type="button" class="rh${UI.t === t ? ' on' : ''}${terOn(t) ? '' : ' dim'}" data-t="${t}" title="Ver el territorio en el mapa"><b>${esc(T.n)}</b><span>${f0(T.pop)} hab. · ${pl(T.c.length, 'comuna', 'comunas')}</span></button>`;
    for (let L = 0; L < NL; L++) {
      const e = CELL[T.k + '|' + LIN[L].k], cv = cellVal(t, L), ink = inkOn(cv.bg);
      const dim = (fActive() && (!e || !entryPass(e))) || !terOn(t) || !linOn(L);
      const gap = !e && lqN(t, L) >= 1.1;
      const on = UI.t === t && UI.L === L;
      const lab = e ? `${e.l}, madurez ${e.m}` : 'sin entrada';
      h += `<button type="button" class="cell${e ? '' : ' empty'}${gap ? ' gap' : ''}${dim ? ' dim' : ''}${on ? ' on' : ''}" data-t="${t}" data-l="${L}" style="background:${cv.bg};color:${ink}" aria-label="${esc(T.n)}, ${LIN[L].k}: ${lab}" aria-pressed="${on}">` +
        (e ? `<span class="code">${e.l}</span><span class="dots" aria-hidden="true">${[1, 2, 3].map(i => `<i class="${i <= e.m ? 'on' : ''}"></i>`).join('')}</span>` : `<span class="code">Sin entrada</span>`) +
        (cv.txt ? `<span class="v">${cv.txt}</span>` : '') + '</button>';
    }
  }
  host.innerHTML = h;
  $$('.cell', host).forEach(b => {
    b.addEventListener('click', () => { UI.t = +b.dataset.t; UI.L = +b.dataset.l; UI.ter = UI.t; renderMatrix(); renderFicha(); if (innerWidth <= 1100) $('#ficha').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    b.addEventListener('mousemove', ev => cellTip(ev, +b.dataset.t, +b.dataset.l));
    b.addEventListener('mouseleave', hideTip);
  });
  $$('.rh', host).forEach(b => b.addEventListener('click', () => { UI.ter = +b.dataset.t; setView('territorios'); }));
  // leyenda
  const lg = $('#mx-leg');
  const gapk = '<span class="k"><i></i>Especializado sin entrada (cociente ≥ 1,1)</span>';
  if (UI.mode === 'lq' || UI.mode === 'g') {
    const st = [0.5, 0.71, 1, 1.41, 2];
    lg.innerHTML = `<div style="display:flex;flex-direction:column;gap:3px"><div class="g">${st.map(v => `<span style="background:${lqColor(v)}"></span>`).join('')}</div><div class="t"><span>${UI.mode === 'lq' ? 'menos que la región' : 'crece menos'}</span><span>${UI.mode === 'lq' ? 'más' : 'más'}</span></div></div>` +
      `<span>${UI.mode === 'lq' ? 'Cociente de localización: peso del lineamiento en las empresas del territorio ÷ su peso en la región (1,0 = igual)' : `Crecimiento del N° de empresas ${pLab()} comparado con el del mismo lineamiento en la región`}</span>` + gapk;
  } else if (UI.mode === 'fin') {
    lg.innerHTML = `<div style="display:flex;flex-direction:column;gap:3px"><div class="g">${[0, .25, .5, .75, 1].map(v => `<span style="background:${ramp(SEQ, v)}"></span>`).join('')}</div><div class="t"><span>pocos</span><span>muchos</span></div></div><span>Proyectos ANID, CORFO InnovaChile e iniciativas BIP de fomento o CTCI 2019–2026 en el territorio y lineamiento (escala logarítmica). Los proyectos sin comuna (alcance regional) se ven en la ficha.</span>` + gapk;
  } else if (UI.mode === 'n') {
    lg.innerHTML = `<div style="display:flex;flex-direction:column;gap:3px"><div class="g">${[0, .25, .5, .75, 1].map(v => `<span style="background:${ramp(SEQ, v)}"></span>`).join('')}</div><div class="t"><span>pocas</span><span>muchas</span></div></div><span>Empresas del territorio en los subrubros del lineamiento (escala logarítmica)</span>` + gapk;
  } else {
    lg.innerHTML = [3, 2, 1].map(m => `<span class="k"><span style="width:14px;height:12px;border-radius:3px;background:${MADC[m]}"></span>${m} · ${MADT[m]}</span>`).join('') + gapk;
  }
  $('#mx-note').textContent = (hasAttr() ? `Empresas filtradas: ${filterText(true)}. Cocientes y crecimiento se calculan dentro de esa selección. ` : '') + (hasGeo() || hasLin() ? 'Los filtros de territorio y lineamiento atenúan las filas y columnas que no corresponden. ' : '') + 'La asignación de subrubros SII a cada lineamiento es provisional y algunos subrubros (agrícolas, forestales) cuentan en más de un lineamiento. Una celda vacía no es una brecha por sí sola: revisa la ficha.';
}
function cellTip(ev, t, L) {
  const e = CELL[TER[t].k + '|' + LIN[L].k];
  showTip(ev, `${TER[t].n} · ${LIN[L].k} ${LSHORT[LIN[L].k]}`, [
    [f0(cN[t][L]), 'empresas en el lineamiento'], [f2(lqN(t, L)), 'cociente de localización'], [pcs(gr(serC[t][L])), `crecimiento ${pLab()} (región ${pcs(gr(serR[L]))})`], [f0(finN[t][L]), 'proyectos financiados 2019–2026'],
  ], e ? `${e.l} ${LINE[e.l].n} · madurez ${e.m}` : 'Sin entrada en la cartera');
}
$('#mx-mode').addEventListener('change', e => { UI.mode = e.target.value; renderMatrix(); });

// --- ficha
let FICHA = null; // contexto de la celda abierta
function cellFirms(t, L, onlyVig) {
  const out = [], ls = LS[L];
  for (let i = 0; i < N; i++) if (MA[i] && TOF[COM[i]] === t && ls[SUB[i]] && (!onlyVig || VIG[i])) out.push(i);
  return out.sort((a, b) => TRAB[b] - TRAB[a] || (TRAMO[b] - TRAMO[a]));
}
function spark(a, ref) {
  const P0 = pIdx();
  const W = 320, H = 70, p = { l: 4, r: 34, t: 8, b: 16 };
  const ia = [...a].map(v => (a[P0] ? v / a[P0] * 100 : NaN)), ir = [...ref].map(v => (ref[P0] ? v / ref[P0] * 100 : NaN));
  const vals = ia.concat(ir).filter(isFinite), mx = Math.max(...vals, 100), mn = Math.min(...vals, 0);
  const x = i => p.l + i / (NY - 1) * (W - p.l - p.r), y = v => p.t + (1 - (v - mn) / (mx - mn)) * (H - p.t - p.b);
  const path = arr => arr.map((v, i) => (isFinite(v) ? `${i && isFinite(arr[i - 1]) ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}` : '')).join('');
  const last = ia[NY - 1], lastR = ir[NY - 1];
  if (!isFinite(last) || !isFinite(lastR)) return '<p class="note">Sin empresas suficientes en el año base para dibujar la serie con estos filtros.</p>';
  let ly = y(last), lyR = y(lastR); if (Math.abs(ly - lyR) < 11) { if (ly < lyR) { ly -= 5; lyR += 5; } else { ly += 5; lyR -= 5; } }
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="Empresas indexadas ${SY0 + P0} = 100">
    <line x1="${x(P0)}" x2="${x(P0)}" y1="${p.t - 4}" y2="${H - p.b}" stroke="var(--line2)" stroke-dasharray="2 3"/>
    <line x1="${p.l}" x2="${W - p.r}" y1="${y(100)}" y2="${y(100)}" stroke="var(--line)"/>
    <path d="${path(ir)}" fill="none" stroke="var(--data-reg)" stroke-width="1.5"/>
    <path d="${path(ia)}" fill="none" stroke="var(--data)" stroke-width="2.2"/>
    <circle cx="${x(NY - 1)}" cy="${y(last)}" r="3" fill="var(--data)"/>
    <text x="${W - p.r + 5}" y="${ly + 4}" font-size="11" fill="var(--data)" font-family="var(--f-mono)">${f0(last)}</text>
    <text x="${W - p.r + 5}" y="${lyR + 4}" font-size="11" fill="var(--data-reg)" font-family="var(--f-mono)">${f0(lastR)}</text>
    <text x="${p.l}" y="${H - 3}" font-size="10" fill="var(--muted)">${SY0}</text><text x="${x(P0)}" y="${H - 3}" font-size="10" fill="var(--muted)" text-anchor="middle">${SY0 + P0} = 100</text><text x="${W - p.r}" y="${H - 3}" font-size="10" fill="var(--muted)" text-anchor="end">${YEND}</text></svg>`;
}
function renderFicha() {
  const t = UI.t, L = UI.L, T = TER[t], Lk = LIN[L].k, e = CELL[T.k + '|' + Lk], ln = e ? LINE[e.l] : null;
  const firms = cellFirms(t, L, true);
  const subC = new Map(); for (const i of firms) subC.set(SUB[i], (subC.get(SUB[i]) || 0) + 1);
  const topSub = [...subC.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const g = gr(serC[t][L]), gR = gr(serR[L]), lq = lqN(t, L), lqt = lqT(t, L);
  FICHA = { t, L, e, firms, topSub };
  const others = LINES.filter(l => (l.ctci.includes(Lk)) && (!e || l.k !== e.l));
  let h = `<div class="fi-h"><div style="flex:1;min-width:0"><div class="eyebrow">Ficha · territorio × lineamiento</div><h2>${esc(T.n)} · ${Lk} ${esc(LSHORT[Lk])}</h2><p class="note" style="margin-top:4px">${esc(LIN[L].n)}</p></div><div class="loc">${locator(t)}</div></div>`;
  if (e) {
    h += `<div class="fi-sec"><h3>Entrada de la cartera</h3><div class="line-t"><span class="code">${ln.k}</span><b>${esc(ln.n)}</b></div>
      <div class="pills"><span class="pill">Bloque ${ln.b} · ${esc(BLOQ[ln.b])}</span><span class="mad"><span class="dots">${[1, 2, 3].map(i => `<i class="${i <= e.m ? 'on' : ''}"></i>`).join('')}</span>Madurez ${e.m}: ${esc(MADT[e.m].toLowerCase())}</span></div>
      <p><strong>Qué financia.</strong> ${esc(ln.que)}</p><p><strong>Evidencia de la minuta.</strong> ${esc(ln.ev)}</p></div>`;
    if (e.liveEstado || e.liveMonto) {
      h += `<div class="fi-sec" style="background:var(--surf2);border:1px solid var(--line2);border-radius:8px;padding:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <b style="color:var(--acc);font-size:13px">Gestión Viva DIFOI · Monitoreo FRPD</b>
          <span style="font-size:11px;color:var(--muted)">${esc(e.liveFecha || 'Sincronizado')}</span>
        </div>
        <div class="pills">
          <span class="pill" style="border-color:var(--acc);color:var(--acc);font-weight:600">${esc(e.liveEstado || '2. Ficha Técnica Completa')}</span>
          <span class="pill">Presupuesto est.: <b>${e.liveMonto ? '$' + f0(e.liveMonto) + ' MM$' : 'Por definir'}</b></span>
          <span class="pill">Responsable: <b>${esc(e.liveResp || 'Por asignar')}</b></span>
        </div>
        ${e.liveEjecutor ? `<p class="note" style="margin-top:6px"><strong>Ejecutor propuesto:</strong> ${esc(e.liveEjecutor)}</p>` : ''}
      </div>`;
    }
    const ct = isCTCI(ln);
    h += `<div class="fi-sec"><h3>Encaje en el D.S. 1.699</h3><div class="pills">${ct ? '<span class="pill ct">Aporta al piso CTCI del 25 % (art. 7)</span>' : '<span class="pill">No aporta al piso CTCI</span>'}</div>
      <div class="hab" style="grid-template-columns:auto minmax(0,1fr)">${ln.a8.map(k => `<span class="x" style="text-align:left;color:var(--acc)">${k}</span><span class="n">${esc(A8[k].n)}</span>`).join('')}${ln.g.map(k => `<span class="x" style="text-align:left;color:var(--acc)">gasto ${k}</span><span class="n">${esc(GASTO[k])}</span>`).join('')}</div>
      ${!ln.a8.length && !ln.g.length ? '<p class="note">La minuta no asigna categoría del art. 8: es un encargo de levantamiento.</p>' : ''}</div>`;
  } else {
    h += `<div class="fi-sec"><h3>Sin entrada en la cartera</h3><p>${lq >= 1.1 ? `<strong>El territorio está especializado en este lineamiento</strong> (cociente ${f2(lq)}) y la cartera no tiene entrada. Es una celda a revisar antes de cerrar la cartera.` : `La base empresarial del territorio en este lineamiento está ${lq >= 0.9 ? 'en torno al' : 'bajo el'} promedio regional (cociente ${f2(lq)}).`}</p>
      ${others.length ? `<p>Líneas de ${Lk} en otros territorios: ${others.map(l => `<button type="button" class="linkbtn" data-line="${l.k}">${l.k}</button> ${esc(l.n)}`).join(' · ')}.</p>` : ''}</div>`;
  }
  const ler = ln ? ln.ler : [];
  h += `<div class="fi-sec"><h3>Alineación con la ERD 2040</h3>${ler.length ? `<div class="pills">${ler.map(k => `<span class="pill"><b>LER ${k}</b>${esc(LERN[k])}</span>`).join('')}</div>` : ''}
    <p class="quote">${esc(T.obj)}</p><p class="note">Objetivo del territorio ${esc(T.nOficial || T.n)} en la ERD${T.k === 'TPLC' ? ' (resumen; ver texto completo en la ERD, tabla 29)' : ''}.</p></div>`;
  h += `<div class="fi-sec"><h3>Base empresarial · SII 2024</h3>${hasAttr() ? `<p class="note warn">Calculada con los filtros de empresas: ${esc(filterText(true))}.</p>` : ''}<div class="stats">
      <div class="stat"><div class="l">Empresas</div><div class="v">${f0(cN[t][L])}</div><div class="s">${pc(cN[t][L] / tN[t])} del territorio</div></div>
      <div class="stat"><div class="l">Trabajadores</div><div class="v">${f0(cT[t][L])}</div><div class="s">${f0(c10[t][L])} empresas con 10 o más</div></div>
      <div class="stat"><div class="l">Cociente de localización</div><div class="v">${f2(lq)}</div><div class="s">${f2(lqt)} en trabajadores</div></div></div>
      ${spark(serC[t][L], serR[L])}
      <p class="note"><span style="color:var(--data)">■</span> Territorio ${pcs(g)} &nbsp; <span style="color:var(--data-reg)">■</span> Región en el lineamiento ${pcs(gR)} · empresas ${pLab()}</p>
      ${topSub.length ? `<div class="hab" style="grid-template-columns:minmax(0,1fr) auto">${topSub.map(([s, n]) => `<span class="n">${esc(D.subs[s].l)}</span><span class="x">${f0(n)}</span>`).join('')}</div>` : ''}
      <p class="note"><strong style="color:var(--ink)">Ventas anuales estimadas:</strong> ${salesTxt(salesRange(firms))} (suma de los tramos de ventas SII de las ${f0(firms.length)} empresas vigentes; el SII no publica ventas exactas por empresa).</p></div>`;
  const fc = fnCell(t, L).sort(byAmt), fr = fnRegL(L).sort(byAmt);
  const bySrc = (ix, s) => ix.filter(i => FN_S[i] === s);
  const fs = s => { const a = bySrc(fc, s); return `${f0(a.length)}<small style="font-size:12px;color:var(--muted)"> · ${mm(sumM(a))}</small>`; };
  const anA = bySrc(fc, S_ANID).filter(i => fnG(i) === 'apl').length;
  FICHA.fin = fc.concat(fr);
  h += `<div class="fi-sec"><h3>Financiamiento público existente · 2019–2026</h3>
    <div class="stats"><div class="stat"><div class="l">ANID</div><div class="v">${fs(S_ANID)}</div><div class="s">${anA} de investigación aplicada</div></div>
      <div class="stat"><div class="l">CORFO InnovaChile</div><div class="v">${fs(S_CORFO)}</div><div class="s">empresas o entidades del territorio</div></div>
      <div class="stat"><div class="l">BIP fomento y CTCI</div><div class="v">${fs(S_BIP)}</div><div class="s">iniciativas con comuna en el territorio</div></div></div>
    ${fc.length ? `<div>${fc.slice(0, 6).map(finRow).join('')}</div>` : '<p class="note">No hay proyectos de estas fuentes asociados a este territorio y lineamiento. La ausencia puede deberse a que se ejecutan desde Temuco o con alcance regional.</p>'}
    ${fr.length ? `<p class="note" style="margin-top:4px">Además, ${pl(fr.length, 'iniciativa', 'iniciativas')} de alcance regional (sin comuna) en ${Lk}, por ${mm(sumM(fr))}:</p><div>${fr.slice(0, 3).map(finRow).join('')}</div>` : ''}
    <p class="note">ANID se asigna por la sede de la institución, CORFO por la casa matriz del beneficiario (RUT en la nómina SII) y BIP por la comuna de la iniciativa. El lineamiento se infiere del título: es una aproximación. Montos BIP: costo total de la etapa postulada.</p>
    <div class="ctrls"><button class="btn" type="button" id="fi-bip">Ver iniciativas BIP del territorio y lineamiento</button><button class="btn" type="button" id="fi-fcsv" hidden>Exportar ${f0(fc.length + fr.length)} proyectos (CSV)</button></div></div>`;
  h += `<div class="fi-sec"><h3>Condiciones habilitantes del territorio</h3><div class="hab"><span class="h">Indicador</span><span class="h" style="text-align:right">Territorio</span><span class="h" style="text-align:right">Región</span>` +
    HABS.map(hb => { const v = terHab(hb, t), st = status(hb, v); return `<span class="n">${esc(hb.l)} <small style="color:var(--muted)">${esc(hb.u)}</small>${hb.lin.includes(Lk) ? `<em>clave ${Lk}</em>` : ''}</span><span class="x"><span class="pill ${st}" title="${ST_LAB[st]}">${hb.f(v)}</span></span><span class="x"><small>${hb.f(HREG[hb.k])}</small></span>`; }).join('') +
    `<span class="n">Servicios sanitarios rurales${Lk === 'L1' ? '<em>clave L1</em>' : ''}</span><span class="x">${f0(sumC('ssr', T.c))} · ${f0(sumC('ssrb', T.c))} benef.</span><span class="x"><small>${pc(1 - sumC('ssrge', T.c) / Math.max(1, sumC('ssr', T.c)), 0)} sin generador</small></span>` +
    `<span class="n">Bocatomas y embalses${Lk === 'L1' ? '<em>clave L1</em>' : ''}</span><span class="x">${f0(sumC('boc', T.c))} · ${f0(sumC('emb', T.c))}</span><span class="x"><small>región ${f0(sumC('boc', ALLC))} · ${f0(sumC('emb', ALLC))}</small></span>` +
    `<span class="n">Inversión pública 2010–2022 por habitante</span><span class="x">${T.ipaTpc ? f1(T.ipaTpc / 1e6) + ' MM$' : '–'}</span><span class="x"><small>GORE ${T.gore ? f0(T.gore) + ' MM$' : '–'}</small></span>` +
    `</div><p class="note">Color: <span style="color:var(--bad)">peor</span>, igual (±10 %) o <span style="color:var(--ok)">mejor</span> que el promedio regional. ${T.c.some(c => IN.rez[c]) ? `${pl(T.c.filter(c => IN.rez[c]).length, 'comuna', 'comunas')} en zona de rezago.` : ''} ${T.prcSin.length ? `${pl(T.prcSin.length, 'comuna', 'comunas')} sin plan regulador vigente.` : ''}</p></div>`;
  const evs = evFor(Lk);
  FICHA.ev = evs;
  h += `<div class="fi-sec"><h3>Evidencia de necesidad · ${Lk} ${esc(LSHORT[Lk])}</h3>
    <div class="hab" style="grid-template-columns:minmax(0,1fr) auto auto"><span class="h">Indicador</span><span class="h" style="text-align:right">Territorio</span><span class="h" style="text-align:right">Región</span>` +
    evs.map(e => { const v = e.v(T.c), st = evStatus(e, v), w = e.bad && T.c.length > 1 ? evWorst(e, T.c) : null;
      return `<span class="n">${esc(e.l)} <small style="color:var(--muted)">${esc(e.u)}</small>${w != null ? `<small style="display:block;color:var(--muted)">más crítica: ${esc(CN(w))} ${e.f(EVV[e.k][w])}</small>` : ''}</span><span class="x">${e.sum ? evVal(e, T.c) : `<span class="pill ${st}" title="${ST_LAB[st]}">${e.f(v)}</span>`}</span><span class="x"><small>${e.f(EVREG[e.k])}</small></span>`; }).join('') + '</div>';
  if (Lk === 'L2' || Lk === 'L3' || Lk === 'L5') {
    const sp = spTer(T.c), top = SPV.map((n, j) => [n, sp[j], SPREG[j]]).filter(x => x[1] > 0 && (Lk !== 'L3' || x[0] !== 'Eucalipto')).sort((a, b) => b[1] - a[1]).slice(0, 6);
    h += top.length ? `<p class="note" style="margin-top:4px"><strong style="color:var(--ink)">Principales cultivos y plantaciones (CAF 2021):</strong> ${top.map(([n, v, r]) => `${esc(n)} ${f0(v)} ha (${pc(v / r, 0)} de la región)`).join(' · ')}.</p>` : '';
  }
  h += `<p class="note">Verde, gris o rojo: mejor, similar (±10 %) o peor que la región. Fuentes: SAE 2022 (MDSF), Censo 2024, ARClim (cambio a mitad de siglo, escenario SSP2-4.5), CONAF 2024-25, PROT, CAF 2021 y SINIM 2024. Los indicadores municipales del territorio son promedios ponderados por población.</p>
    <div class="ctrls"><button class="btn" type="button" id="fi-ev">Ver las comunas del territorio en «Evidencia territorial»</button></div></div>`;
  const ies = iesOfTer(t);
  const exL = exeFor(t, L);
  FICHA.exe = exL;
  h += `<div class="fi-sec"><h3>Capacidades y ejecutores</h3>${ies.length ? `<p><strong>${pl(ies.length, 'sede', 'sedes')} de educación superior en el territorio</strong> (Mineduc 2020): ${esc([...new Set(ies.map(x => x.n))].slice(0, 8).join(' · '))}${ies.length > 8 ? '…' : ''}.</p>` : '<p><strong>Sin sedes de educación superior en el territorio</strong> (Mineduc 2020): la ejecución dependerá de instituciones de Temuco o de fuera de la región, o de un nodo de extensión (L-01).</p>'}
    ${exL.length ? `<div class="hab" style="grid-template-columns:minmax(0,1fr) auto auto"><span class="h">Ejecutor posible</span><span class="h" style="text-align:right">ANID ${Lk}</span><span class="h" style="text-align:right">Habilitación</span>${exL.map(x => `<span class="n">${esc(x.n)}${x.inT ? '<em>en el territorio</em>' : ''}</span><span class="x">${x.an.L[L] || '–'}</span><span class="x">${exePill(x)}</span>`).join('')}</div>` : ''}
    <p class="note">Ordenados por proyectos ANID 2019–2026 en el lineamiento. Públicas: habilitadas por el art. 11, o por el art. 13 si su acreditación es de 4 años o más. Privadas: deben figurar en la nómina (Res. 1/2026, art. 14) y concursar; las de educación superior, además, requieren acreditación de 4 años o más. Verificar acreditación en la CNA.</p></div>`;
  // oferta de conocimiento: empresas de los grupos CTCI del territorio (aplica los filtros de empresas salvo territorio, lineamiento y grupo CTCI)
  const OFm = mask(new Set(['geo', 'lin', 'ctci'])), ofN = new Array(6).fill(0), ofW = new Array(6).fill(0), ofR = new Array(6).fill(0), ofTop = [];
  for (let i = 0; i < N; i++) { if (!OFm[i] || !CT[i]) continue; const j = CT[i]; ofR[j]++; if (TOF[COM[i]] === t) { ofN[j]++; ofW[j] += TRAB[i]; if (VIG[i]) ofTop.push(i); } }
  ofTop.sort((a, b) => TRAB[b] - TRAB[a]);
  FICHA.of = { n: ofN, w: ofW, r: ofR, top: ofTop.slice(0, 5) };
  h += `<div class="fi-sec"><h3>Oferta de conocimiento · empresas CTCI del territorio</h3>
    <p class="note">Empresas de I+D, TIC y software, servicios técnicos y de ingeniería, manufactura media-alta y alta tecnología, y educación superior: posibles socias o proveedoras de tecnología, distintas de las empresas objetivo del lineamiento. El territorio tiene el ${pc(T.pop / POPREG, 0)} de la población regional.</p>
    <div class="hab" style="grid-template-columns:minmax(0,1fr) auto auto"><span class="h">Grupo CTCI (aprox.)</span><span class="h" style="text-align:right">Empresas</span><span class="h" style="text-align:right">De la región</span>
      ${[1, 2, 3, 4, 5].map(j => `<span class="n">${esc(CTG[j - 1])}</span><span class="x">${f0(ofN[j])} <small>· ${f0(ofW[j])} trab.</small></span><span class="x"><small>${pc(ofR[j] ? ofN[j] / ofR[j] : NaN, 0)}</small></span>`).join('')}
      <span class="n"><b style="color:var(--ink)">Total</b></span><span class="x"><b>${f0(sum(ofN))}</b></span><span class="x"><small>${pc(sum(ofR) ? sum(ofN) / sum(ofR) : NaN, 0)}</small></span></div>
    ${ofTop.length ? `<div>${ofTop.slice(0, 5).map(i => `<div class="firm"><span>${esc(NAMES[i])}</span><b>${f0(TRAB[i])}</b><small>${esc(CN(COM[i]))} · ${esc(ctLab(CT[i]))} · ${esc(D.acts[ACT[i]].l)}</small></div>`).join('')}</div>` : '<p class="note">Sin empresas CTCI vigentes en el territorio con los filtros actuales.</p>'}
    <div class="ctrls"><button class="btn" type="button" id="fi-of">Ver la oferta CTCI del territorio en «Empresas»</button></div></div>`;
  const top = firms.slice(0, 8), secN = [0, 0, 0, 0]; let nomN = 0;
  firms.forEach(i => { secN[SEC[i]]++; if (NOM[i]) nomN++; });
  const secTxt = secN[1] || secN[2] || secN[3] ? `: ${f0(secN[0])} privadas con fines de lucro, ${f0(secN[1])} sin fines de lucro${secN[2] ? ` y ${f0(secN[2])} públicas` : ''}` : '';
  h += `<div class="fi-sec"><h3>Empresas objetivo</h3><p class="note">${pl(firms.length, 'empresa vigente', 'empresas vigentes')} del territorio en los subrubros del lineamiento${secTxt}${nomN ? `; ${nomN} en la nómina Res. 1/2026` : ''}. Ordenadas por trabajadores. Para aislar un tipo de entidad usa «Sector» en la barra de filtros.</p>
    <div>${top.map(i => `<div class="firm"><span>${esc(NAMES[i])}${SEC[i] ? `<em class="tagx">${SECSH[SEC[i]]}</em>` : ''}${NOM[i] ? '<em class="tagx ct">Nómina 2026</em>' : ''}</span><b>${f0(TRAB[i])}</b><small>${esc(CN(COM[i]))} · ${esc(D.subs[SUB[i]].l)} · ventas ${esc(tramoTxt(TRAMO[i]))}</small></div>`).join('')}</div>
    <div class="ctrls"><button class="btn" type="button" id="fi-emp">Ver y filtrar en «Empresas»</button><button class="btn pri" type="button" id="fi-csv" hidden>Exportar ${f0(firms.length)} empresas (CSV)</button></div></div>`;
  h += `<div class="fi-sec"><div class="claude"><div class="hd"><div><b style="font-size:14px">Perfil de iniciativa con Claude</b><p class="note">Borrador con los datos de esta ficha: problema, objetivo, encaje normativo, población objetivo y vacíos de información.</p></div>
    <div class="ctrls"><button class="btn warm" type="button" id="cl-go">Redactar borrador</button><button class="btn" type="button" id="cl-stop" hidden>Detener</button><button class="btn" type="button" id="cl-copy" hidden>Copiar</button></div></div>
    <p class="note" id="cl-status"></p><div class="draft" id="cl-out" hidden></div></div></div>`;
  $('#ficha').innerHTML = h;
  $$('#ficha [data-line]').forEach(b => b.addEventListener('click', () => selectLine(b.dataset.line)));
  $('#fi-bip').addEventListener('click', () => openBip({ t, L, cat: 'frpd' }));
  $('#fi-ev').addEventListener('click', () => openEvid({ t, g: EVL[Lk].map(k => EVK[k].g)[0] }));
  $('#fi-of').addEventListener('click', () => openEmpresas({ ter: t, ctci: true }));
  $('#fi-emp').addEventListener('click', () => openEmpresas({ ter: t, lin: L }));
  if (DL) { $('#fi-csv').hidden = !firms.length; $('#fi-csv').addEventListener('click', exportFirms); $('#fi-fcsv').hidden = !FICHA.fin.length; $('#fi-fcsv').addEventListener('click', exportFin); }
  wireClaude();
}

// --- tabla de líneas
function renderLines() {
  const rows = LINES.map(ln => {
    const ents = ENT.filter(e => e.l === ln.k);
    return `<tr class="click${UI.line === ln.k ? ' on' : ''}" data-line="${ln.k}" tabindex="0">
      <td class="m" style="color:var(--acc)">${ln.k}</td>
      <td style="min-width:240px"><b style="font-weight:600">${esc(ln.n)}</b><span class="sm">Bloque ${ln.b} · ${esc(BLOQ[ln.b])}</span></td>
      <td class="m">${ln.ler.map(k => 'LER ' + k).join('<br>')}</td>
      <td><div class="tchips">${ln.a8.map(k => `<span class="tchip" title="${esc(A8[k].n)}">${k}</span>`).join('')}${ln.g.map(k => `<span class="tchip" title="${esc(GASTO[k])}">g. ${k}</span>`).join('')}${!ln.a8.length && !ln.g.length ? '<span class="sm">levantamiento</span>' : ''}</div></td>
      <td>${isCTCI(ln) ? '<span class="pill ct">Sí</span>' : '<span class="pill">No</span>'}</td>
      <td><div class="tchips">${ents.length ? ents.map(e => `<span class="tchip m${e.m}" title="${esc(TER[TIDX[e.t]].n)} · ${e.c} · madurez ${e.m}">${e.t} ${e.c}</span>`).join('') : `<span class="sm">${ln.terr === 'REGIONAL' ? 'Alcance regional' : 'Todos los territorios'}, sin celda propia</span>`}</div></td></tr>`;
  }).join('');
  $('#lines').innerHTML = `<table><thead><tr><th>Línea</th><th>Nombre</th><th>LER</th><th>Art. 8 / gasto</th><th>Piso CTCI</th><th>Entradas (territorio · lineamiento)</th></tr></thead><tbody>${rows}</tbody></table>`;
  $$('#lines tr[data-line]').forEach(r => {
    const go = () => selectLine(UI.line === r.dataset.line ? null : r.dataset.line);
    r.addEventListener('click', go); r.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });
  $('#ln-clear').hidden = !UI.line;
}
function selectLine(k) {
  UI.line = k;
  if (k) { const e = ENT.find(x => x.l === k); if (e) { UI.t = TIDX[e.t]; UI.L = LIDX[e.c]; } }
  renderCartera(true);
  if (k) $('#mx').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
$('#ln-clear').addEventListener('click', () => selectLine(null));
function renderCartera(withFicha) {
  renderKpis(); renderFbar(); renderMatrix(); renderLines();
  if (withFicha || !rendered.ficha) { renderFicha(); rendered.ficha = true; }
}

// ================= TERRITORIOS (mapa) =================
const MP = FR.map;
const MAPIND = [
  { k: 'ter', l: 'Territorio ERD' },
  { k: 'bre', l: 'N° de brechas habilitantes (0–5)' },
  ...HABS.map(h => ({ k: h.k, l: `${h.l} (${h.u})`, hab: h })),
  { k: 'ipa', l: 'Inversión pública 2010–2022 por habitante' },
  { k: 'emp', l: 'Empresas por 1.000 habitantes (SII 2024, con los filtros de empresas)' },
  { k: 'binv', l: 'Iniciativas BIP habilitantes 2019–2027 (miles de $ por habitante)' },
  { k: 'lq', l: 'Especialización en un lineamiento' },
  ...EVI.map(e => ({ k: 'ev:' + e.k, l: `${e.l} (${e.u.split(' · ')[0]})`, ev: e, grp: EVG[e.g] })),
];
const LAYERS = [
  { k: 'tl', l: 'Nombres de territorios', sw: '' },
  { k: 'cl', l: 'Nombres de comunas', sw: '' },
  { k: 'rez', l: 'Zonas de rezago', sw: 'h' },
  { k: 'ies', l: 'Sedes de educación superior', sw: '--pt-ies' },
  { k: 'erd', l: 'Corredor bioceánico y ferrocarril (iniciativas ERD)', sw: '--ln-erd', line: true },
  { k: 'rut', l: 'Red vial principal', sw: '#D3DCE0', line: true },
  { k: 'elec', l: 'Transmisión eléctrica y subestaciones', sw: '--ln-elec', line: true },
  { k: 'ssr', l: 'Servicios sanitarios rurales', sw: '--pt-ssr' },
  { k: 'ant', l: 'Antenas de telefonía móvil', sw: '--pt-ant' },
  { k: 'pue', l: 'Puentes con tablero de madera', sw: '--pt-pue' },
  { k: 'port', l: 'Obras portuarias y caletas', sw: '--pt-port' },
  { k: 'aer', l: 'Aeródromos y pasos fronterizos', sw: '--pt-aer' },
];
function comVal(k, c) {
  if (k.startsWith('ev:')) return EVV[k.slice(3)][c];
  if (k === 'bre') return BRE[c].length;
  if (k === 'ipa') return IN.ipapc[c] / 1e6;
  if (k === 'emp') return comN[c] / POP[c] * 1000;
  if (k === 'binv') return binvC[c] * 1000 / POP[c];
  if (k === 'lq') return lqCom(c, UI.mLin);
  const h = HABS.find(x => x.k === k); return h ? HV[k][c] : NaN;
}
function comFill(k) {
  if (k === 'ter') return ALLC.map(c => TCOL[TOF[c]]);
  if (k === 'lq') return ALLC.map(c => lqColor(comVal('lq', c)));
  const v = ALLC.map(c => comVal(k, c)), fv = v.filter(isFinite), mn = Math.min(...fv), mx = Math.max(...fv);
  const h = HABS.find(x => x.k === k);
  if (k.startsWith('ev:')) { const e = EVK[k.slice(3)]; return v.map(x => (!isFinite(x) ? NODATA : e.bad ? ramp(BADR, e.bad === 'high' ? (x - mn) / (mx - mn || 1) : (mx - x) / (mx - mn || 1)) : ramp(SEQ, (x - mn) / (mx - mn || 1)))); }
  if (k === 'bre') return v.map(x => ramp(BADR, x / 4));
  if (h) return v.map(x => ramp(BADR, h.bad === 'high' ? (x - mn) / (mx - mn) : (mx - x) / (mx - mn)));
  return v.map(x => ramp(SEQ, (x - mn) / (mx - mn)));
}
function mapLegend(k) {
  const lg = MAP.legend;
  if (k === 'ter') { lg.innerHTML = '<b>Territorios ERD 2040</b>' + TER.map((t, i) => `<span class="row"><span class="sw" style="background:${TCOL[i]}"></span>${esc(t.n)}</span>`).join(''); return; }
  if (k === 'lq') { lg.innerHTML = `<b>Cociente de localización en ${LIN[UI.mLin].k} ${esc(LSHORT[LIN[UI.mLin].k])} (empresas)</b>` + [[0.5, '< 0,6'], [0.8, '0,8'], [1, '1,0'], [1.25, '1,25'], [2, '> 1,7']].map(([v, l]) => `<span class="row"><span class="sw" style="background:${lqColor(v)}"></span>${l}</span>`).join(''); return; }
  const v = ALLC.map(c => comVal(k, c)).filter(isFinite), mn = Math.min(...v), mx = Math.max(...v), it = MAPIND.find(m => m.k === k), h = it.hab;
  if (it.ev) { const e = it.ev, pal = e.bad ? BADR : SEQ; lg.innerHTML = `<b>${esc(e.l)} · ${esc(e.u)}${e.bad ? ' · más rojo = peor' : ''}</b>` + [0, 0.25, 0.5, 0.75, 1].map(q => { const x = e.bad === 'low' ? mx - q * (mx - mn) : mn + q * (mx - mn); return `<span class="row"><span class="sw" style="background:${ramp(pal, q)}"></span>${e.f(x)}</span>`; }).join('') + `<span class="row">Región: ${e.f(EVREG[e.k])}</span>`; return; }
  const fmt = k === 'bre' ? f0 : k === 'ipa' ? x => f1(x) + ' MM$' : k === 'emp' ? f1 : k === 'binv' ? f0 : h.f;
  if (k === 'bre') { lg.innerHTML = `<b>${esc(it.l)}</b>` + [0, 1, 2, 3, 4].map(x => `<span class="row"><span class="sw" style="background:${ramp(BADR, x / 4)}"></span>${x}${x === 4 ? ' o más' : ''}</span>`).join(''); return; }
  const pal = h ? BADR : SEQ;
  lg.innerHTML = `<b>${esc(it.l)}${h ? ' · más rojo = peor' : ''}</b>` + [0, 0.25, 0.5, 0.75, 1].map(q => { const x = h && h.bad === 'low' ? mx - q * (mx - mn) : mn + q * (mx - mn); return `<span class="row"><span class="sw" style="background:${ramp(pal, q)}"></span>${fmt(x)}</span>`; }).join('');
}
function createMap(host) {
  const svg = svgEl('svg', { viewBox: VB.join(' '), class: 'map-svg', role: 'img', 'aria-label': 'Mapa de comunas y territorios de La Araucanía' });
  const defs = svgEl('defs'); defs.innerHTML = '<pattern id="hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="9" fill="#F2A541" fill-opacity=".55"/></pattern>';
  const G = {}; ['com', 'rez', 'ter', 'rut', 'elec', 'erd', 'pue', 'ant', 'ssr', 'ies', 'port', 'aer', 'sel', 'cl', 'tl'].forEach(k => { G[k] = svgEl('g'); });
  const paths = D.comunas.map((c, ci) => { const p = svgEl('path', { d: c.d, class: 'com', 'data-ci': ci, 'vector-effect': 'non-scaling-stroke' }); G.com.appendChild(p); return p; });
  TER.forEach(t => G.ter.appendChild(svgEl('path', { d: t.d, class: 'ter', 'vector-effect': 'non-scaling-stroke' })));
  svg.append(defs, ...['com', 'rez', 'ter', 'rut', 'elec', 'erd', 'pue', 'ant', 'ssr', 'port', 'aer', 'ies', 'sel', 'cl', 'tl'].map(k => G[k]));
  host.appendChild(svg);
  const hov = svgEl('path', { class: 'hovo', 'vector-effect': 'non-scaling-stroke' }); hov.style.display = 'none'; G.sel.appendChild(hov);
  const selP = svgEl('path', { class: 'selo', 'vector-effect': 'non-scaling-stroke' }); G.sel.appendChild(selP);
  let vb = { x: VB[0], y: VB[1], w: VB[2], h: VB[3] };
  const built = {}, ptStroke = [];
  const dots = (arr, color, w, cls, op) => { let d = ''; for (const p of arr) d += `M${p[0]},${p[1]}h0`; const e = svgEl('path', { d, class: 'pt', stroke: color, 'stroke-width': w, 'vector-effect': 'non-scaling-stroke' }); if (op) e.setAttribute('stroke-opacity', op); ptStroke.push([e, w]); return e; };
  const hot = (g, arr, color, w, tipf, shape) => {
    arr.forEach(p => {
      const e = svgEl('path', { d: shape === 'sq' ? `M${p[0] - 0.01},${p[1]}h0.02` : `M${p[0]},${p[1]}h0`, class: 'ptx', stroke: color, 'stroke-width': w, 'stroke-linecap': shape === 'sq' ? 'square' : 'round', 'vector-effect': 'non-scaling-stroke' });
      e.addEventListener('mousemove', ev => { ev.stopPropagation(); const t = tipf(p); showTip(ev, t[0], t[1], t[2]); });
      e.addEventListener('mouseleave', hideTip);
      g.appendChild(e); ptStroke.push([e, w]);
    });
  };
  function build(k) {
    if (built[k]) return; built[k] = true;
    const g = G[k];
    if (k === 'tl') TER.forEach((t, i) => { const tx = svgEl('text', { x: t.lx, y: t.ly, class: 'tl', 'text-anchor': 'middle' }); tx.textContent = t.n; g.appendChild(tx); });
    if (k === 'cl') D.comunas.forEach(c => { const tx = svgEl('text', { x: c.lx, y: c.ly + 14, class: 'cl', 'text-anchor': 'middle' }); tx.textContent = c.l; g.appendChild(tx); });
    if (k === 'rez') ALLC.filter(c => IN.rez[c]).forEach(c => g.appendChild(svgEl('path', { d: D.comunas[c].d, class: 'rez' })));
    if (k === 'rut') { for (const r of D.geo.rutas) if (r.c !== 'pavimentada') g.appendChild(svgEl('path', { d: r.d, class: 'ln', stroke: '#D3DCE0', 'stroke-width': 1.6, 'stroke-opacity': 0.75, 'vector-effect': 'non-scaling-stroke' })); }
    if (k === 'elec') {
      MP.elec.forEach(l => g.appendChild(svgEl('path', { d: l.d, class: 'ln', stroke: css('--ln-elec'), 'stroke-width': l.kv >= 200 ? 2.4 : 1.3, 'stroke-opacity': 0.85, 'vector-effect': 'non-scaling-stroke' })));
      hot(g, MP.sub, css('--ln-elec'), 8, p => [p[2], [[p[3], 'tensión']], 'Subestación eléctrica (CEN)'], 'sq');
    }
    if (k === 'erd') {
      g.appendChild(svgEl('path', { d: MP.ferro, class: 'ln', stroke: css('--ln-erd'), 'stroke-width': 2, 'stroke-dasharray': '7 5', 'vector-effect': 'non-scaling-stroke' }));
      g.appendChild(svgEl('path', { d: MP.bioc, class: 'ln', stroke: css('--ln-erd'), 'stroke-width': 3.2, 'vector-effect': 'non-scaling-stroke' }));
    }
    if (k === 'pue') g.appendChild(dots(MP.pue.filter(p => p[2]), css('--pt-pue'), 3.2, 'pt', 0.8));
    if (k === 'ant') g.appendChild(dots(MP.ant, css('--pt-ant'), 3.4, 'pt', 0.75));
    if (k === 'ssr') hot(g, MP.ssr, css('--pt-ssr'), 6, p => [p[2], [[f0(p[3]), 'beneficiarios estimados'], [p[4] ? 'Sí' : 'No', 'grupo electrógeno']], 'Servicio sanitario rural (DOH)']);
    if (k === 'ies') hot(g, MP.ies, css('--pt-ies'), 11, p => [p[2], [[p[3], 'tipo']], 'Sede de educación superior (Mineduc 2020)']);
    if (k === 'port') hot(g, MP.port, css('--pt-port'), 7, p => [p[2], [[p[3] || '–', 'programa']], 'Obra portuaria (DOP)'], 'sq');
    if (k === 'aer') { hot(g, MP.aer, css('--pt-aer'), 7, p => [p[2], [], 'Red aeroportuaria'], 'sq'); hot(g, MP.front, css('--sel'), 11, p => [p[2], [], 'Paso fronterizo'], 'sq'); }
  }
  function setLayers(set) {
    for (const k of Object.keys(G)) { if (['com', 'ter', 'sel'].includes(k)) continue; if (set.has(k)) { build(k); G[k].style.display = ''; } else G[k].style.display = 'none'; }
    scaleText();
  }
  function pxPerUnit() { const w = svg.getBoundingClientRect().width; return w ? w / vb.w : 1; }
  function scaleText() {
    const k = 1 / pxPerUnit(), zoom = VB[2] / vb.w;
    G.tl.setAttribute('font-size', 14.5 * k); G.tl.setAttribute('stroke-width', 3.6 * k);
    G.cl.setAttribute('font-size', 11 * k); G.cl.setAttribute('stroke-width', 3 * k);
    G.cl.style.opacity = zoom > 1.3 || !UI.layers.has('tl') ? 1 : 0.85;
  }
  function applyVB() { svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`); scaleText(); }
  function clampVB() { const mx = VB[2] * 0.25; vb.x = Math.max(VB[0] - mx, Math.min(VB[0] + VB[2] - vb.w + mx, vb.x)); vb.y = Math.max(VB[1] - mx, Math.min(VB[1] + VB[3] - vb.h + mx, vb.y)); }
  function toVB(e) { const r = svg.getBoundingClientRect(); return { x: vb.x + (e.clientX - r.left) / r.width * vb.w, y: vb.y + (e.clientY - r.top) / r.height * vb.h }; }
  function zoomAt(f, cx, cy) { const nw = Math.max(VB[2] / 14, Math.min(VB[2], vb.w / f)), s = nw / vb.w; vb.x = cx - (cx - vb.x) * s; vb.y = cy - (cy - vb.y) * s; vb.w = nw; vb.h = nw * VB[3] / VB[2]; clampVB(); applyVB(); }
  const reset = () => { vb = { x: VB[0], y: VB[1], w: VB[2], h: VB[3] }; applyVB(); };
  let hoverCi = -1, drag = null, hintT;
  function setHover(ci, e) {
    if (ci !== hoverCi) { hoverCi = ci; if (ci >= 0) { hov.setAttribute('d', paths[ci].getAttribute('d')); hov.style.display = ''; } else hov.style.display = 'none'; }
    if (ci >= 0) { const t = comTip(ci); showTip(e, t[0], t[1], t[2]); } else hideTip();
  }
  svg.addEventListener('pointerdown', e => { if (e.button !== 0) return; const ci = e.target.dataset && e.target.dataset.ci != null ? +e.target.dataset.ci : -1; drag = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y, moved: false, ci, id: e.pointerId }; });
  svg.addEventListener('pointermove', e => {
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 5) { drag.moved = true; try { svg.setPointerCapture(drag.id); } catch (_) {} hideTip(); hov.style.display = 'none'; hoverCi = -1; }
      if (drag.moved) { const k = 1 / pxPerUnit(); vb.x = drag.vx - dx * k; vb.y = drag.vy - dy * k; clampVB(); applyVB(); return; }
    }
    if (e.target.classList.contains('ptx')) return;
    const ci = e.target.dataset && e.target.dataset.ci != null ? +e.target.dataset.ci : -1;
    setHover(ci, e);
  });
  svg.addEventListener('pointerup', () => { if (drag && !drag.moved && drag.ci >= 0) { UI.ter = TOF[drag.ci]; renderTerritorios(); } drag = null; });
  svg.addEventListener('pointercancel', () => { drag = null; });
  svg.addEventListener('pointerleave', () => { if (!drag) setHover(-1); });
  svg.addEventListener('wheel', e => {
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); const p = toVB(e); zoomAt(e.deltaY < 0 ? 1.25 : 0.8, p.x, p.y); }
    else { let h = host.querySelector('.maphint'); if (!h) { h = document.createElement('div'); h.className = 'maphint'; h.textContent = 'Usa Ctrl + rueda (⌘ en Mac) para acercar el mapa'; host.appendChild(h); } h.hidden = false; clearTimeout(hintT); hintT = setTimeout(() => { h.hidden = true; }, 1400); }
  }, { passive: false });
  svg.addEventListener('dblclick', e => { const p = toVB(e); zoomAt(2, p.x, p.y); });
  const tools = document.createElement('div'); tools.className = 'map-tools';
  const mk = (label, icon, fn) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', label); b.title = label; b.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">${icon}</svg>`; b.addEventListener('click', fn); tools.appendChild(b); };
  mk('Acercar', '<path d="M8 3v10M3 8h10"/>', () => zoomAt(1.5, vb.x + vb.w / 2, vb.y + vb.h / 2));
  mk('Alejar', '<path d="M3 8h10"/>', () => zoomAt(1 / 1.5, vb.x + vb.w / 2, vb.y + vb.h / 2));
  mk('Ver toda la región', '<path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4"/>', reset);
  host.appendChild(tools);
  const legend = document.createElement('div'); legend.className = 'legend'; host.after(legend);
  new ResizeObserver(() => scaleText()).observe(svg);
  return {
    legend, setLayers,
    paint(fills, ti) { for (let c = 0; c < NC; c++) paths[c].style.fill = fills[c]; selP.setAttribute('d', ti >= 0 ? TER[ti].d : ''); scaleText(); },
  };
}
function comTip(c) {
  const k = UI.mInd, rows = [];
  rows.push([TER[TOF[c]].n, 'territorio']);
  if (k === 'ter' || k === 'bre') rows.push([BRE[c].length ? BRE[c].map(x => HABS.find(h => h.k === x).l.split(' (')[0]).join(', ') : 'ninguna', 'brechas (tercio peor)']);
  else if (k === 'ipa') rows.push([f1(IN.ipapc[c] / 1e6) + ' MM$', 'inversión pública 2010–2022 por hab.']);
  else if (k === 'emp') rows.push([f1(comVal('emp', c)), 'empresas por 1.000 hab.']);
  else if (k === 'binv') rows.push([f0(binvC[c]) + ' MM$', `BIP habilitante 2019–2027 (${f0(comVal('binv', c))} mil $ por hab.)`]);
  else if (k === 'lq') rows.push([f2(comVal('lq', c)), `cociente en ${LIN[UI.mLin].k}`]);
  else if (k.startsWith('ev:')) { const e = EVK[k.slice(3)]; rows.push([e.f(EVV[e.k][c]), e.l + ' · ' + e.u]); if (!e.sum) rows.push([e.f(EVREG[e.k]), 'región']); }
  else { const h = HABS.find(x => x.k === k); rows.push([h.f(HV[k][c]), h.l + ' · ' + h.u]); }
  rows.push([f0(POP[c]), 'habitantes (Censo 2024)']);
  return [CN(c), rows, IN.rez[c] ? 'Comuna en zona de rezago' : (D.comunas[c].prc ? '' : 'Sin plan regulador comunal vigente')];
}
let MAP = null;
function initMap() {
  MAP = createMap($('#map'));
  const og = {}; MAPIND.forEach(m => { const g = m.grp || 'Territorio e infraestructura'; (og[g] = og[g] || []).push(m); });
  $('#m-ind').innerHTML = Object.entries(og).map(([g, ms]) => `<optgroup label="${esc(g)}">${ms.map(m => `<option value="${m.k}">${esc(m.l)}</option>`).join('')}</optgroup>`).join('');
  $('#m-lin').innerHTML = LIN.map((l, i) => `<option value="${i}">${l.k} · ${esc(LSHORT[l.k])}</option>`).join('');
  $('#m-ind').addEventListener('change', e => { UI.mInd = e.target.value; renderMapOnly(); });
  $('#m-lin').addEventListener('change', e => { UI.mLin = +e.target.value; renderMapOnly(); });
  $('#layers').insertAdjacentHTML('beforeend', LAYERS.map(l => `<label><input type="checkbox" data-layer="${l.k}"${UI.layers.has(l.k) ? ' checked' : ''}>${l.sw ? `<span class="k${l.sw === 'h' ? ' h' : l.line ? ' l' : ''}" style="${l.sw === 'h' ? '' : l.line ? `border-color:${l.sw.startsWith('--') ? `var(${l.sw})` : l.sw}` : `background:var(${l.sw})`}"></span>` : ''}${esc(l.l)}</label>`).join(''));
  $$('#layers [data-layer]').forEach(cb => cb.addEventListener('change', () => { if (cb.checked) UI.layers.add(cb.dataset.layer); else UI.layers.delete(cb.dataset.layer); MAP.setLayers(UI.layers); renderMapNote(); }));
  MAP.setLayers(UI.layers);
}
function renderMapOnly() {
  $('#m-ind').value = UI.mInd; $('#m-lin').value = String(UI.mLin); $('#m-lin-w').hidden = UI.mInd !== 'lq';
  MAP.paint(comFill(UI.mInd), UI.ter); mapLegend(UI.mInd); renderMapNote();
}
function renderMapNote() {
  const n = [];
  if (UI.layers.has('ant')) n.push(`Antenas: ${f0(MP.ant.length)} autorizaciones con decreto entre ${FR.infraMeta.antY[0]} y ${FR.infraMeta.antY[1]}; no reflejan la cobertura actual ni el 5G.`);
  if (UI.layers.has('pue')) n.push(`Puentes: ${f0(MP.pue.filter(p => p[2]).length)} de ${f0(MP.pue.length)} con tablero de madera.`);
  if (UI.layers.has('erd')) n.push('Corredor bioceánico (línea continua) y ferrocarril (discontinua) son trazados de iniciativas del plan de la ERD, no infraestructura existente.');
  if (UI.layers.has('rez')) n.push('Zonas de rezago: Costa Araucanía y el grupo Malleco–Nahuelbuta (Collipulli, Ercilla, Los Sauces, Lumaco, Purén, Traiguén, Victoria).');
  if (UI.mInd === 'vse') n.push('Viviendas sin energía: la capa registra 50 en ocho comunas, lo que sugiere un valor mínimo de la fuente.');
  if (UI.mInd.startsWith('ev:')) { const e = EVK[UI.mInd.slice(3)]; n.push(EVSRC[e.g].map(k => CX.meta[k]).join(' ')); if (e.k === 'inu') n.push('Una comuna sin zonas puede estar fuera del área estudiada.'); }
  $('#m-note').textContent = n.join(' ');
}
function renderTprof() {
  const ti = UI.ter, T = TER[ti];
  const ents = ENT.filter(e => e.t === T.k);
  const lqs = LIN.map((l, L) => ({ L, v: lqN(ti, L) }));
  const mxq = Math.max(2, ...lqs.map(x => x.v));
  const x = v => Math.min(100, v / mxq * 100);
  const ies = iesOfTer(ti), gTot = sum(TER.map(t => t.gore || 0));
  const inT = []; for (let i = 0; i < NFN; i++) if (FN_T[i] === ti) inT.push(i);
  const tfin = [['ANID (sede en el territorio)', inT.filter(i => FN_S[i] === S_ANID)], ['CORFO InnovaChile', inT.filter(i => FN_S[i] === S_CORFO)]]
    .concat(Object.keys(BIPCAT).map(g => [`BIP · ${BIPCAT[g]}`, inT.filter(i => FN_S[i] === S_BIP && fnG(i) === g)]));
  $('#tprof').innerHTML = `<div class="prof">
    <div><div class="eyebrow">Territorio ERD 2040</div><h2>${esc(T.n)}</h2><p class="note">${esc(T.c.map(CN).join(' · '))}</p></div>
    <p class="quote">${esc(T.obj)}</p>
    <div class="stats">
      <div class="stat"><div class="l">Población 2024</div><div class="v">${f0(T.pop)}</div><div class="s">${pcs(T.pop / T.pop17 - 1)} desde 2017</div></div>
      <div class="stat"><div class="l">Empresas SII 2024${hasAttr() ? ' · selección' : ''}</div><div class="v">${f0(tN[ti])}</div><div class="s">${f1(tN[ti] / T.pop * 1000)} por 1.000 hab. (región ${f1(NSEL / POPREG * 1000)})</div></div>
      <div class="stat"><div class="l">Crecimiento ${pLab()}</div><div class="v">${pcs(gr(serT[ti]))}</div><div class="s">región ${pcs(gr(serAll))}</div></div>
      <div class="stat"><div class="l">Trabajadores dependientes</div><div class="v">${f0(tT[ti])}</div><div class="s">${pc(tT[ti] / totT, 0)} de la región${tTpub[ti] ? ` · ${pc(tTpub[ti] / tT[ti], 0)} en entidades públicas` : ''}</div></div>
      <div class="stat"><div class="l">Empresas con 10 o más trabajadores</div><div class="v">${f0(T10[ti])}</div><div class="s">${pc(T10[ti] / tN[ti])} de sus empresas</div></div>
      <div class="stat"><div class="l">Ventas anuales (mill. UF)</div><div class="v">${(r => NF1.format(r.lo / 1e6) + '–' + NF1.format(r.hi / 1e6))(TSALES[ti])}</div><div class="s" title="Suma de los tramos de ventas SII de las empresas vigentes; la estadística comunal del SII (capa regional, año no indicado) incluye personas naturales">rango por tramos SII${TSALES[ti].open ? ` + ${TSALES[ti].open} sin tope` : ''}; SII comunal ${NF1.format(sumC('jv', T.c) / 1e6)}</div></div>
      <div class="stat"><div class="l">Inversión pública 2010–2022</div><div class="v">${T.ipaTpc ? f1(T.ipaTpc / 1e6) : '–'} <small style="font-size:12px;color:var(--muted)">MM$/hab.</small></div><div class="s">${T.ipaT ? f0(T.ipaT / 1000) + ' mil MM$ en total' : ''}</div></div>
      <div class="stat"><div class="l">Inversión GORE 2010–2022</div><div class="v">${T.gore ? pc(T.gore / gTot, 0) : '–'}</div><div class="s">${T.gore ? f0(T.gore) + ' MM$ del total regional' : ''}</div></div>
      <div class="stat"><div class="l">Sedes de educación superior</div><div class="v">${ies.length}</div><div class="s">${ies.length ? esc([...new Set(ies.map(x => x.t))].join(', ')) : 'ninguna'}</div></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:7px"><span class="lbl">Especialización por lineamiento (empresas)</span>
      ${lqs.map(({ L, v }) => `<div class="lqrow"><span>${LIN[L].k} ${esc(LSHORT[LIN[L].k])}</span><span class="tr"><i style="width:${x(v)}%;background:${lqColor(v)}"></i><u style="left:${x(1)}%"></u></span><span class="x">${f2(v)}</span></div>`).join('')}
      <p class="note">La línea vertical marca 1,0: el promedio regional.</p></div>
    <div style="display:flex;flex-direction:column;gap:7px"><span class="lbl">Condiciones habilitantes</span><div class="hab"><span class="h">Indicador</span><span class="h" style="text-align:right">Territorio</span><span class="h" style="text-align:right">Región</span>
      ${HABS.map(hb => { const v = terHab(hb, ti), st = status(hb, v); return `<span class="n">${esc(hb.l)} <small style="color:var(--muted)">${esc(hb.u)}</small></span><span class="x"><span class="pill ${st}" title="${ST_LAB[st]}">${hb.f(v)}</span></span><span class="x"><small>${hb.f(HREG[hb.k])}</small></span>`; }).join('')}</div>
      <p class="note">${T.c.some(c => IN.rez[c]) ? `Zona de rezago: ${esc(T.c.filter(c => IN.rez[c]).map(CN).join(', '))}. ` : ''}${T.prcSin.length ? `Sin plan regulador vigente: ${esc(T.prcSin.map(CN).join(', '))}.` : ''}</p></div>
    <div style="display:flex;flex-direction:column;gap:7px"><span class="lbl">Evidencia territorial</span><div class="hab"><span class="h">Indicador</span><span class="h" style="text-align:right">Territorio</span><span class="h" style="text-align:right">Región</span>
      ${['pmd', 'ind', 'sred', 'alj', 'prd', 'incp', 'upaa', 'rie', 'fcm', 'prof'].map(k => { const e = EVK[k], v = e.v(T.c), st = evStatus(e, v); return `<span class="n">${esc(e.l)} <small style="color:var(--muted)">${esc(e.u.split(' · ')[0])}</small></span><span class="x"><span class="pill ${st}" title="${ST_LAB[st]}">${e.f(v)}</span></span><span class="x"><small>${e.f(EVREG[k])}</small></span>`; }).join('')}</div>
      <div><button class="btn" type="button" id="tp-ev">Ver todos los indicadores por comuna</button></div></div>
    <div style="display:flex;flex-direction:column;gap:7px"><span class="lbl">Financiamiento público 2019–2026</span><div class="hab"><span class="h">Fuente</span><span class="h" style="text-align:right">N°</span><span class="h" style="text-align:right">Monto</span>
      ${tfin.map(([l, ix]) => `<span class="n">${esc(l)}</span><span class="x">${f0(ix.length)}</span><span class="x"><small>${ix.length ? mm(sumM(ix)) : '–'}</small></span>`).join('')}</div>
      <p class="note">ANID por sede de la institución; CORFO InnovaChile por casa matriz del beneficiario; BIP: iniciativas postuladas 2019–2027 con comuna en el territorio (costo total de la etapa).</p><div><button class="btn" type="button" id="tp-bip">Ver las iniciativas BIP del territorio</button></div></div>
    <div style="display:flex;flex-direction:column;gap:7px"><span class="lbl">Entradas de la cartera (${ents.length})</span>
      <div class="tchips">${ents.map(e => `<button type="button" class="tchip m${e.m}" data-c="${e.c}" style="background:none;cursor:pointer" title="${esc(LINE[e.l].n)} · madurez ${e.m}">${e.c} ${e.l}</button>`).join('')}</div>
      <p class="note">Clic en una entrada para abrir su ficha en la cartera.</p></div>
  </div>`;
  $('#tp-bip').addEventListener('click', () => openBip({ t: ti }));
  $('#tp-ev').addEventListener('click', () => openEvid({ t: ti }));
  $$('#tprof [data-c]').forEach(b => b.addEventListener('click', () => { UI.t = ti; UI.L = LIDX[b.dataset.c]; setView('cartera'); renderMatrix(); renderFicha(); $('#ficha').scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
}
// tabla de habilitantes por comuna
const HCOLS = [
  { k: 'com', l: 'Comuna', s: c => CN(c) },
  { k: 'pop', l: 'Habitantes 2024', r: 1, s: c => POP[c], f: c => f0(POP[c]) },
  ...HABS.map(h => ({ k: h.k, l: `${h.l.replace(' (SAIDI 2022)', '')} · ${h.u}`, r: 1, s: c => HV[h.k][c], f: c => h.f(HV[h.k][c]), hab: h })),
  { k: 'ssr', l: 'Servicios sanitarios rurales · benef.', r: 1, s: c => IN.ssrb[c], f: c => `${IN.ssr[c]} · ${f0(IN.ssrb[c])}` },
  { k: 'ies', l: 'Sedes educación superior', r: 1, s: c => IN.ies[c], f: c => (IN.ies[c] || '–') },
  { k: 'ipa', l: 'Inversión pública 2010–22 · MM$/hab.', r: 1, s: c => IN.ipapc[c], f: c => f1(IN.ipapc[c] / 1e6) },
  { k: 'binv', l: 'BIP habilitante 2019–27 · MM$', r: 1, s: c => binvC[c], f: c => f0(binvC[c]) },
  { k: 'rez', l: 'Zona de rezago', s: c => IN.rez[c], f: c => (IN.rez[c] ? 'Sí' : '') },
  { k: 'bre', l: 'Brechas', r: 1, s: c => BRE[c].length, f: c => BRE[c].length },
];
function renderHab() {
  const scope = UI.hbScope === 'ter' ? TER[UI.ter].c : ALLC;
  const col = HCOLS.find(c => c.k === UI.hbSort) || HCOLS[0];
  const rows = [...scope].sort((a, b) => { const x = col.s(a), y = col.s(b); return (typeof x === 'string' ? x.localeCompare(y, 'es') : x - y) * UI.hbDir || POP[b] - POP[a]; });
  $('#hab').innerHTML = `<table><thead><tr>${HCOLS.map(c => `<th class="${c.r ? 'r' : ''}"><button type="button" data-k="${c.k}"${UI.hbSort === c.k ? ` aria-sort="${UI.hbDir > 0 ? 'ascending' : 'descending'}"` : ''}>${esc(c.l)}${UI.hbSort === c.k ? (UI.hbDir > 0 ? ' ↑' : ' ↓') : ''}</button></th>`).join('')}</tr></thead><tbody>` +
    rows.map(c => `<tr class="click${TOF[c] === UI.ter ? ' on' : ''}" data-c="${c}">${HCOLS.map(k => {
      if (k.k === 'com') return `<td><b style="font-weight:600">${esc(CN(c))}</b><span class="sm">${esc(TER[TOF[c]].n)}</span></td>`;
      const cls = k.hab ? (isGap(k.hab, HV[k.k][c]) ? 'flag' : '') : '';
      return `<td class="m${k.r ? ' r' : ''} ${cls}">${k.f(c)}</td>`;
    }).join('')}</tr>`).join('') + '</tbody></table>';
  $$('#hab th button').forEach(b => b.addEventListener('click', () => { const k = b.dataset.k; if (UI.hbSort === k) UI.hbDir *= -1; else { UI.hbSort = k; UI.hbDir = k === 'com' ? 1 : -1; } renderHab(); }));
  $$('#hab tr[data-c]').forEach(r => r.addEventListener('click', () => { UI.ter = TOF[+r.dataset.c]; renderTerritorios(); }));
}
$('#hb-scope').addEventListener('change', e => { UI.hbScope = e.target.value; renderHab(); });
function renderTerritorios() {
  if (!MAP) initMap();
  renderMapOnly(); renderTprof(); renderHab();
  $('#m-title').textContent = 'Territorios ERD 2040 · ' + TER[UI.ter].n;
}

// ================= EVIDENCIA TERRITORIAL =================
Object.assign(UI, { evG: 'eq', evScope: 'all', evSort: 'com', evDir: 1, evMap: 'pmd' });
function openEvid(o) {
  if (o.t != null) { UI.ter = o.t; UI.evScope = 'ter'; }
  if (o.g) UI.evG = o.g;
  setView('evid');
  requestAnimationFrame(() => $('#ev-tblc').scrollIntoView({ behavior: 'smooth', block: 'start' }));
}
const PB = CX.pib, PBL = PB.yrs.length - 1, PB18 = PB.yrs.indexOf(2018);
function renderEvKpis() {
  const pcv = Object.values(PB.pcAll).sort((a, b) => b - a), pcIX = PB.pcIX[PB.pcIX.length - 1], rk = pcv.indexOf(pcIX) + 1;
  const nL = PB.nomY.length - 1, vL = PB.volY.length - 1, v18 = PB.volY.indexOf(2018);
  const gIX = PB.volIX[vL] / PB.volIX[v18] - 1, gR = PB.volReg[vL] / PB.volReg[v18] - 1;
  const nPmd = ALLC.filter(c => EVV.pmd[c] >= 0.25).length, nFcm = ALLC.filter(c => EVV.fcm[c] >= 75).length;
  const incN = cxS('incn', ALLC), incI = cxS('incint', ALLC);
  const k = (l, v, s) => `<div class="kpi"><span class="l">${l}</span><span class="v">${v}</span><span class="s">${s}</span></div>`;
  $('#ev-kpis').innerHTML = [
    k(`PIB por habitante ${PB.pcY[PB.pcY.length - 1]}`, `${f1(pcIX / 1000)}<small> MM$</small>`, rk === pcv.length ? `el más bajo de las ${pcv.length} regiones` : `lugar ${rk} de ${pcv.length} regiones`),
    k(`Participación en el PIB ${PB.nomY[nL]}`, pc(PB.nomIX[nL] / PB.nomReg[nL]), `${f1(PB.nomIX[nL] / 1000)} billones de pesos corrientes; del PIB regionalizado`),
    k(`Crecimiento real 2018–${PB.volY[vL]}`, pcs(gIX), `regiones en conjunto ${pcs(gR)}`),
    k('Pobreza multidimensional', pc(EVREG.pmd), `${nPmd} de ${NC} comunas en 25 % o más · SAE 2022`),
    k('Población indígena', pc(EVREG.ind), `${f0(cxS('cind', ALLC))} comunidades registradas en CONADI`),
    k('Viviendas sin red pública de agua', pc(EVREG.sred), `${f0(cxS('valj', ALLC))} se abastecen con camión aljibe · Censo 2024`),
    k('Precipitación a mitad de siglo', sgn(EVREG.prd, 1, '%'), 'cambio proyectado, escenario SSP2-4.5 · ARClim'),
    k('Incendios forestales 2024-25', `${f0(cxS('incha', ALLC) / 1000)}<small> mil ha</small>`, `${f0(incN)} incendios; ${pc(incI / incN, 0)} intencionales · CONAF`),
    k('Unidades productivas agropecuarias', f0(EVREG.upa), `${pc(EVREG.upaa, 0)} de autoconsumo; ${pc(EVREG.rie, 0)} de la superficie cultivada con riego · CAF 2021`),
    k('Dependencia del Fondo Común Municipal', pcp(EVREG.fcm), `${nFcm} de ${NC} municipios en 75 % o más · SINIM 2024`),
  ].join('');
}
function renderPib() {
  const sh = PB.ix.map((a, j) => ({ j, n: PB.acts[j], s: a[PBL] / PB.ixT[PBL], q: (a[PBL] / PB.ixT[PBL]) / (PB.nat[j][PBL] / PB.natT[PBL]), g: a[PBL] / a[PB18] - 1, gN: PB.nat[j][PBL] / PB.nat[j][PB18] - 1 })).sort((a, b) => b.s - a.s);
  const mx = Math.max(...sh.map(x => x.s));
  $('#ev-pib').innerHTML = `<table><thead><tr><th>Actividad</th><th style="min-width:150px">Peso en el PIB regional ${PB.yrs[PBL]}</th><th class="r">Cociente vs. regiones</th><th class="r">Crecimiento real 2018–${PB.yrs[PBL]}</th><th class="r">Regiones en conjunto</th></tr></thead><tbody>` +
    sh.map(x => `<tr><td>${esc(x.n)}</td><td><div style="display:flex;gap:8px;align-items:center"><div style="flex:1;height:10px;background:var(--surf2);border-radius:2px"><div style="height:10px;border-radius:2px;background:var(--data);width:${x.s / mx * 100}%"></div></div><span class="m" style="font-family:var(--f-mono);font-size:12px;width:44px;text-align:right">${pc(x.s)}</span></div></td>
      <td class="m r"><span class="pill" style="background:${lqColor(x.q)};color:${inkOn(lqColor(x.q))}">${f2(x.q)}</span></td><td class="m r" style="color:${x.g < x.gN - 0.05 ? 'var(--bad)' : x.g > x.gN + 0.05 ? 'var(--ok)' : 'var(--ink)'}">${pcs(x.g)}</td><td class="m r"><small style="color:var(--muted)">${pcs(x.gN)}</small></td></tr>`).join('') + '</tbody></table>';
}
function renderCafHeat() {
  const rows = SPV.map((n, j) => ({ n, j, r: SPREG[j] })).filter(x => x.r >= 500).slice(0, 15);
  const st = TER.map(T => spTer(T.c));
  $('#ev-caf').innerHTML = `<table class="heat"><thead><tr><th>Especie</th>${TER.map((T, i) => `<th class="r" title="${esc(T.n)}"><span style="color:${TCOL[i]}">■</span> ${esc(T.n.replace('Araucanía ', '').replace('Temuco – Padre Las Casas', 'Temuco–PLC').replace('Malleco Norte', 'Malleco N.'))}</th>`).join('')}<th class="r">Región</th></tr></thead><tbody>` +
    rows.map(x => `<tr><td>${esc(x.n)}</td>${TER.map((T, i) => { const v = st[i][x.j], s = v / x.r, bg = v ? mix(SURF2, css('--s4'), Math.min(1, s / 0.45)) : 'transparent'; return `<td class="m r" style="background:${bg};color:${v ? inkOn(bg) : 'var(--muted)'}" title="${esc(T.n)}: ${f0(v)} ha, ${pc(s, 0)} de la región">${v >= 1 ? f0(v) : '–'}</td>`; }).join('')}<td class="m r">${f0(x.r)}</td></tr>`).join('') + '</tbody></table>';
}
function evCols() { return EVI.filter(e => e.g === UI.evG); }
function renderEvTable() {
  $$('#ev-g button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.g === UI.evG)));
  $('#ev-scope').value = UI.evScope;
  $('#ev-scope').options[1].textContent = 'Solo ' + TER[UI.ter].n;
  const cols = evCols();
  $('#ev-map').innerHTML = cols.map(e => `<option value="${e.k}">${esc(e.l)}</option>`).join('');
  if (!cols.some(e => e.k === UI.evMap)) UI.evMap = cols[0].k;
  $('#ev-map').value = UI.evMap;
  const scope = UI.evScope === 'ter' ? TER[UI.ter].c : ALLC;
  const sv = c => (UI.evSort === 'com' ? CN(c) : UI.evSort === 'pop' ? POP[c] : EVV[UI.evSort] ? EVV[UI.evSort][c] : 0);
  const rows = [...scope].sort((a, b) => { const x = sv(a), y = sv(b); if (typeof x === 'string') return x.localeCompare(y, 'es') * UI.evDir; return ((isFinite(x) ? x : -Infinity) - (isFinite(y) ? y : -Infinity)) * UI.evDir; });
  const th = (k, l, r) => `<th class="${r ? 'r' : ''}"><button type="button" data-k="${k}"${UI.evSort === k ? ` aria-sort="${UI.evDir > 0 ? 'ascending' : 'descending'}"` : ''}>${l}${UI.evSort === k ? (UI.evDir > 0 ? ' ↑' : ' ↓') : ''}</button></th>`;
  const tot = UI.evScope === 'ter' ? TER[UI.ter].c : null;
  $('#ev-tbl').innerHTML = `<table><thead><tr>${th('com', 'Comuna')}${th('pop', 'Habitantes 2024', 1)}${cols.map(e => th(e.k, `${esc(e.l)}<span style="display:block;font-weight:400;text-transform:none;letter-spacing:0;color:var(--muted)">${esc(e.u.split(' · ')[0])}</span>`, 1)).join('')}</tr></thead><tbody>` +
    rows.map(c => `<tr class="click${TOF[c] === UI.ter ? ' on' : ''}" data-c="${c}"><td><b style="font-weight:600">${esc(CN(c))}</b><span class="sm">${esc(TER[TOF[c]].n)}</span></td><td class="m r">${f0(POP[c])}</td>${cols.map(e => `<td class="m r${evGap(e, EVV[e.k][c]) ? ' flag' : ''}">${e.f(EVV[e.k][c])}</td>`).join('')}</tr>`).join('') +
    (tot ? `<tr><td><b style="font-weight:600">${esc(TER[UI.ter].n)}</b><span class="sm">territorio</span></td><td class="m r">${f0(popC(tot))}</td>${cols.map(e => `<td class="m r">${e.f(e.v(tot))}</td>`).join('')}</tr>` : '') +
    `<tr><td><b style="font-weight:600">Región</b><span class="sm">${NC} comunas</span></td><td class="m r">${f0(POPREG)}</td>${cols.map(e => `<td class="m r"><b style="font-weight:600">${e.f(EVREG[e.k])}</b></td>`).join('')}</tr></tbody></table>`;
  $('#ev-note').innerHTML = `${EVSRC[UI.evG].map(k => esc(CX.meta[k])).join(' ')}${UI.evG === 'ag' ? ' Viviendas sin red pública: pozo o noria, camión aljibe, o río, vertiente, estero, canal o lago.' : ''}${UI.evG === 'mu' ? ' Territorio y región: promedios ponderados por población.' : ''} ▲ marca el tercio de comunas con el valor más desfavorable en los indicadores que tienen dirección (los conteos y superficies no se marcan).`;
  $$('#ev-tbl th button').forEach(b => b.addEventListener('click', () => { const k = b.dataset.k; if (UI.evSort === k) UI.evDir *= -1; else { UI.evSort = k; UI.evDir = k === 'com' ? 1 : -1; } renderEvTable(); }));
  $$('#ev-tbl tr[data-c]').forEach(r => r.addEventListener('click', () => { UI.ter = TOF[+r.dataset.c]; renderEvTable(); }));
}
function renderEvid() {
  if (!rendered.evid) {
    renderEvKpis(); renderPib(); renderCafHeat();
    $('#ev-g').innerHTML = Object.entries(EVG).map(([g, l]) => `<button type="button" data-g="${g}" aria-pressed="false">${esc(l)}</button>`).join('');
    $$('#ev-g button').forEach(b => b.addEventListener('click', () => { UI.evG = b.dataset.g; if (!['com', 'pop'].includes(UI.evSort)) { UI.evSort = 'com'; UI.evDir = 1; } renderEvTable(); }));
    $('#ev-scope').addEventListener('change', e => { UI.evScope = e.target.value; renderEvTable(); });
    $('#ev-map').addEventListener('change', e => { UI.evMap = e.target.value; });
    $('#ev-go').addEventListener('click', () => { UI.mInd = 'ev:' + UI.evMap; setView('territorios'); });
    $('#ev-csv').addEventListener('click', exportEvid);
    rendered.evid = true;
  }
  renderEvTable();
}
function exportEvid() {
  const raw = [['saeN', 'Personas (proyección SAE)'], ['pmdN', 'Personas en pobreza multidimensional'], ['pinN', 'Personas en pobreza por ingresos'], ['pind', 'Personas pertenecientes a pueblos indígenas'], ['pindb', 'Personas en unidades censales con dato'], ['vagua', 'Viviendas ocupadas con dato de origen del agua'], ['vred', 'Viviendas con red pública'], ['vpozo', 'Viviendas con pozo o noria'], ['valj', 'Viviendas con camión aljibe'], ['vrio', 'Viviendas con río, vertiente, estero, canal o lago'], ['caf_sup', 'Superficie censada CAF (ha)'], ['caf_rie', 'Superficie regada CAF (ha)'], ['caf_sec', 'Superficie de secano CAF (ha)'], ['caf_upaa', 'UPA de autoconsumo'], ['minv', 'Inversión municipal 2024 (M$)'], ['ingp', 'Ingresos propios municipales 2024 (M$)']];
  const FRAC = new Set(['pmd', 'pin', 'ia', 'ind', 'sred', 'incp', 'upaa', 'rie', 'pnt']);
  const plain = e => c => { const v = EVV[e.k][c]; return isFinite(v) ? +(FRAC.has(e.k) ? v * 100 : v).toFixed(3) : ''; };
  const head = ['Comuna', 'Territorio ERD', 'Habitantes 2024', ...EVI.map(e => `${e.l} (${e.u})`), ...raw.map(r => r[1]), 'Categoría agrícola principal (CAF)', ...SPV.map(n => `CAF ${n} (ha)`)];
  const lines = [head].concat(ALLC.map(c => [CN(c), TER[TOF[c]].n, POP[c], ...EVI.map(e => plain(e)(c)), ...raw.map(r => CX[r[0]][c] ?? ''), CX.caf_ppal[c] || '', ...CX.caf_sp[c]]));
  saveCSV(lines, 'evidencia_territorial_comunas_araucania.csv');
}

// ================= MARCO NORMATIVO =================
const focoCorto = f => { const s = f.split('Objetivo Estratégico Regional')[0].trim().split(/(?<=\.)\s+/); return s.slice(0, 2).join(' '); };
function renderMarco() {
  const used = {}; LINES.forEach(ln => { ln.a8.forEach(k => { (used[k] = used[k] || []).push(ln.k); }); ln.g.forEach(k => { (used['g' + k] = used['g' + k] || []).push(ln.k); }); });
  const nA8 = A8KEYS.filter(k => used[k]).length, nG = FR.gastos.filter(g => used['g' + g.k]).length, nC = LINES.filter(isCTCI).length;
  const k = (l, v, s) => `<div class="kpi"><span class="l">${l}</span><span class="v">${v}</span><span class="s">${s}</span></div>`;
  $('#mk-kpis').innerHTML = [k('Piso de investigación (art. 7)', '25 %', 'mínimo del fondo para N°3; bajarlo requiere solicitud a Hacienda'), k('Gastos de administración (art. 9)', '≤ 5 %', 'tope sobre el fondo'),
    k('Categorías del art. 8 usadas', `${nA8}<small> / ${A8KEYS.length}</small>`, 'por al menos una línea'), k('Gastos de N°3 usados', `${nG}<small> / ${FR.gastos.length}</small>`, 'tipos i a x'), k('Líneas que aportan al piso', `${nC}<small> / ${LINES.length}</small>`, 'tienen N°3 o gasto i–x')].join('');
  const cols = `minmax(300px,4fr) repeat(${LINES.length},minmax(30px,.6fr)) 46px`;
  let h = `<div class="cov" style="grid-template-columns:${cols}"><div></div>${LINES.map(l => `<div class="hd" title="${esc(l.n)}">${l.k.replace('L-', '')}</div>`).join('')}<div class="hd">Líneas</div>`;
  const row = (key, code, name) => { const u = used[key] || []; return `<div class="rh${u.length ? '' : ' zero'}" title="${esc(name)}"><b>${code}</b><span>${esc(name)}</span></div>` + LINES.map(l => `<div class="c">${u.includes(l.k) ? `<i title="${esc(l.k + ' · ' + l.n)}"></i>` : ''}</div>`).join('') + `<div class="tot${u.length ? '' : ' zero'}">${u.length || '0'}</div>`; };
  FR.art8.forEach(g => { h += `<div class="grp">N°${g.k} · ${esc(g.n)}</div>`; g.items.forEach(it => { h += row(it.k, it.k, it.n); }); });
  h += `<div class="grp">Gastos financiables en N°3</div>`; FR.gastos.forEach(gs => { h += row('g' + gs.k, gs.k, gs.n); });
  $('#cov').innerHTML = h + '</div>';
  // tarjetas
  const pav15 = ALLC.filter(c => HV.pav[c] < 0.15).length, madR = sumC('pmad', ALLC) / sumC('pue', ALLC);
  const saidiTop = [...ALLC].sort((a, b) => IN.saidi[b] - IN.saidi[a]).slice(0, 3);
  const noN1 = !A8KEYS.filter(x => x.startsWith('1')).some(x => used[x]);
  // lo que ya se financia
  const grp = (f) => { const o = []; for (let i = 0; i < NFN; i++) if (f(i)) o.push(i); return o; };
  const isB = g => i => FN_S[i] === S_BIP && fnG(i) === g;
  const FROWS = [
    ['N°1', 'Fomento de actividades productivas', 'BIP · programas de fomento', grp(isB('fom'))],
    ['N°1', 'Innovación empresarial', 'CORFO InnovaChile', grp(i => FN_S[i] === S_CORFO)],
    ['1d', 'Eficiencia hídrica y riego', 'BIP · riego', grp(isB('rie'))],
    ['2a', 'Conectividad usada por sectores productivos', 'BIP · vialidad, puentes, puertos, ferrocarril', grp(isB('via'))],
    ['2b', 'Energía y descarbonización', 'BIP · electrificación, alumbrado, calefactores', grp(isB('ene'))],
    ['2c', 'Residuos y economía circular', 'BIP · residuos', grp(isB('res'))],
    ['2g', 'Conectividad digital', 'BIP · última milla y telecomunicaciones', grp(isB('dig'))],
    ['N°3', 'Investigación científica y tecnológica', 'ANID (proyectos ejecutados en la región)', grp(i => FN_S[i] === S_ANID)],
    ['N°3', 'CTCI e innovación con fondos regionales', 'BIP · transferencias CTCI', grp(isB('ctci'))],
    ['–', 'Agua potable rural (fuera del ámbito productivo)', 'BIP · APR y servicios sanitarios rurales', grp(isB('apr'))],
  ];
  const mxF = Math.max(...FROWS.map(r => sumM(r[3])));
  $('#mk-fin').innerHTML = `<table><thead><tr><th>Art. 8</th><th>Categoría</th><th>Fuente</th><th class="r">N°</th><th class="r">MM$</th><th style="min-width:160px">Monto (escala logarítmica)</th><th>Mayores</th></tr></thead><tbody>` +
    FROWS.map(([k, n, src, ix]) => { const v = sumM(ix), top = [...ix].sort(byAmt).slice(0, 2); return `<tr><td class="m" style="color:${used[k] || k.startsWith('N') ? 'var(--acc)' : 'var(--sel)'}">${k}</td><td>${esc(n)}${k !== '–' && !k.startsWith('N') && !used[k] ? '<span class="sm" style="color:var(--sel)">sin línea en la cartera FRPD</span>' : ''}</td><td>${esc(src)}</td><td class="m r">${f0(ix.length)}</td><td class="m r">${f0(v)}</td>
      <td><div style="height:10px;background:var(--surf2);border-radius:2px"><div style="height:10px;border-radius:2px;background:var(--data);width:${v ? Math.log10(1 + v) / Math.log10(1 + mxF) * 100 : 0}%"></div></div></td>
      <td><span class="sm" style="color:var(--ink2)">${top.map(i => esc(FN_N[i].slice(0, 70)) + (isFinite(FN_M[i]) ? ` (${f0(FN_M[i])})` : '')).join('<br>')}</span></td></tr>`; }).join('') + '</tbody></table>' +
    '<p class="note" style="margin-top:10px">BIP: iniciativas postuladas 2019–2027 (FNDR, sectoriales y mixtas), última postulación de cada código; monto = costo total de la etapa postulada, no lo gastado. Tres montos BIP con valores imposibles se dejaron sin monto. ANID: fallos 2019–2026 con región de ejecución La Araucanía. CORFO: proyectos InnovaChile adjudicados 2019–2026 (DataInnovación); en Ley I+D se usa el monto certificado.</p>';
  const via = FROWS[3][3], fom = FROWS[0][3], ene = FROWS[4][3];
  // ejecutores
  const isIES = x => /Universidad|Instituto profesional|CFT/.test(x.sub);
  const topL = x => x.an.L.map((v, j) => [v, j]).filter(z => z[0] > 0).sort((p, q) => q[0] - p[0]).slice(0, 3).map(([v, j]) => `${LIN[j].k} ${v}`).join(' · ') || '–';
  $('#mk-exe').innerHTML = `<table><thead><tr><th>Institución</th><th>Habilitación</th><th>Nómina 2026</th><th>Acreditación</th><th class="r">ANID 2019–26</th><th class="r">MM$</th><th>Lineamientos (proyectos ANID)</th></tr></thead><tbody>` +
    EXE.map(x => `<tr><td style="min-width:220px"><b style="font-weight:600">${esc(x.n)}</b><span class="sm">${esc(x.sub)} · ${esc(x.c.map(CN).join(', '))}${x.note ? ' · ' + esc(x.note) : ''}</span></td><td style="min-width:200px"><span class="sm" style="color:var(--ink2)">${esc(x.base)}</span></td>
      <td>${x.r1 ? '<span class="pill ct">Sí</span>' : x.t === 'pub' ? '<span class="pill">No aplica</span>' : '<span class="pill warn">No</span>'}</td>
      <td>${isIES(x) ? '<span class="pill warn" title="El art. 13 exige 4 años o más">Verificar en CNA</span>' : '<span class="sm">No aplica</span>'}</td>
      <td class="m r">${x.an.n ? f0(x.an.n) + `<span class="sm">${x.an.apl} aplicada</span>` : '–'}</td><td class="m r">${x.an.m ? f0(x.an.m) : '–'}</td><td class="m">${topL(x)}</td></tr>`).join('') + '</tbody></table>' +
    `<div style="display:flex;flex-direction:column;gap:6px"><span class="lbl">Sedes privadas de educación superior que no figuran en la nómina del primer llamado 2026</span><div class="tchips">${EXENO.map(x => `<span class="tchip" title="${esc(CN(x.c))}">${esc(x.n)}</span>`).join('')}</div>
      <p class="note">${esc(FR.res1Meta.segundo)} Fuente de la nómina: ${esc(FR.res1Meta.fuente)}.</p></div>
    <details class="ler"><summary><b>Res. 1</b><span>Nómina completa de privadas sin fines de lucro, primer llamado 2026</span><small>${RES1.length} instituciones · ${RES1.filter(r => r.p).length} con presencia en la región</small></summary>
      <div class="tbl-wrap" style="max-height:420px;overflow-y:auto;margin-top:8px"><table><thead><tr><th>RUT</th><th>Institución</th><th>Presencia en La Araucanía (SII)</th></tr></thead><tbody>${[...RES1].sort((p, q) => (q.p ? 1 : 0) - (p.p ? 1 : 0) || p.n.localeCompare(q.n, 'es')).map(r => `<tr><td class="m">${r.r}</td><td>${esc(r.n)}${r.s ? `<span class="sm">${esc(r.s)}</span>` : ''}</td><td>${r.p ? esc(r.p + ' en ' + r.c.map(CN).join(', ')) : '<span class="sm">Sin registro en la nómina SII de la región</span>'}</td></tr>`).join('')}</tbody></table></div></details>
    <details class="ler"><summary><b>Res. 33</b><span>Instituciones que pueden recibir recursos de innovación, competitividad y CTCI (2024)</span><small>${RES33.length} categorías</small></summary><ol>${RES33.map(x => `<li>${esc(x)}</li>`).join('')}</ol></details>`;
  $('#mk-cards').innerHTML = `
    <div class="mcard"><span class="a">Lectura de la cartera</span><h3>${noN1 ? 'Ninguna línea usa el N°1 ni la infraestructura habilitante del N°2' : 'Cobertura de categorías'}</h3>
      <p>La cartera concentra sus categorías en el N°3 y en las capacidades del N°2 (2d, 2e, 2g, 2h). Quedan sin línea el N°1 completo (convenios con SERCOTEC, CORFO o INDAP; productividad; eficiencia hídrica; adaptación) y las inversiones habilitantes 2a, 2b y 2c.</p>
      <p>Esas categorías no están vacías en la región: entre 2019 y 2027 se postularon ${f0(via.length)} iniciativas BIP de conectividad (${mm(sumM(via))}), ${f0(fom.length)} programas de fomento (${mm(sumM(fom))}) y ${f0(ene.length)} de energía. El FRPD puede concentrarse en lo que esas fuentes no cubren.</p><p>Las capas de infraestructura muestran dónde siguen las brechas: ${pav15} comunas con menos de 15 % de su red vial pavimentada, ${pc(madR, 0)} de los puentes con tablero de madera y SAIDI más alto en ${esc(saidiTop.map(c => CN(c) + ' (' + f1(IN.saidi[c]) + ' h)').join(', '))}.</p></div>
    <div class="mcard"><span class="a">Arts. 11 a 15</span><h3>Quién puede ejecutar</h3><ul>${FR.ejec.map(e => `<li><b style="color:var(--ink)">${esc(e.n)}</b> (${esc(e.a)}): ${esc(e.d)}</li>`).join('')}</ul></div>
    <div class="mcard"><span class="a">Art. 10</span><h3>Qué no se puede financiar</h3><ul>${FR.art10.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
  $('#ler').innerHTML = FR.ler.map(l => `<details class="ler"${l.k === 5 ? ' open' : ''}><summary><b>LER ${l.k}</b><span>${esc(l.n)}</span><small>${l.oe.length} objetivos · ${pl(LINES.filter(x => x.ler.includes(l.k)).length, 'línea', 'líneas')}</small></summary>
    <p class="note" style="margin:6px 0 0 56px;max-width:90ch">${esc(focoCorto(l.foco))}</p><ol>${l.oe.map(o => `<li><b>${o.k}</b>${esc(o.t)}</li>`).join('')}</ol></details>`).join('');
}


// ================= INICIATIVAS BIP =================
const normTxt = x => String(x).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const BX = FR.bip, NBX = BX.code.length, BXH = BX.h, NH = BXH.i.length;
const BX_N = BX.n.split('\n'), BX_D = BX.d.split('\n');
const BX_ROWS = Array.from({ length: NBX }, () => []);
for (let k = 0; k < NH; k++) BX_ROWS[BXH.i[k]].push(k);
const BX_YEARS = [...new Set(BXH.y)].sort((a, b) => a - b);
const BX_FRPD = new Set(['ctci', 'fom', 'rie', 'via', 'ene', 'res', 'dig']);
const bxCat = i => BX.catv[BX.cat[i]];
const catLab = c => (c.startsWith('soc:') ? c.slice(4) : BIPCAT[c]);
const RATEL = { RS: 'Recomendado satisfactoriamente', FI: 'Falta información', OT: 'Objetado técnicamente', IN: 'Incumplimiento de normativa', '': 'Sin RATE' };
const finShort = v => (!v || v === 'nan' ? 'Sin dato' : v === 'F.N.D.R.' ? 'FNDR' : v.includes('F.N.D.R') ? 'FNDR y otras' : v === 'SECTORIAL' ? 'Sectorial' : v.includes('SECTORIAL') ? 'Sectorial y otras' : v.charAt(0) + v.slice(1).toLowerCase());
const BX_FIN = Array.from({ length: NBX }, (_, i) => finShort(BX.finv[BX.fin[i]]));
const insFix = x => x.replace(/ (De|Del|La|Las|Los|El|Y|En|Para) /g, m => m.toLowerCase()).replace(/\bMop\b/g, 'MOP').replace(/\bMinvu\b/g, 'MINVU').replace(/\bServiu\b/g, 'SERVIU').replace(/\bIndap\b/g, 'INDAP').replace(/\bSag\b/g, 'SAG');
const BX_INS = i => insFix(BX.insv[BX.ins[i]]);
const etLab = e => (e || '–').replace('Ejecucion', 'Ejecución');
const BX_S = Array.from({ length: NBX }, (_, i) => normTxt(BX.code[i] + ' ' + BX_N[i] + ' ' + BX_INS(i)));
const BXF = { q: '', t: -1, c: -1, cat: '', L: -1, y: 0, e: -1, fin: '', r: -1, sort: 's', dir: -1, page: 0, open: new Set() };
const mmK = v => (v == null ? '–' : v / 1000 >= 100 ? f0(v / 1000) : f1(v / 1000)); // M$ -> MM$
function bxRef(i) {
  let rows = BX_ROWS[i];
  if (BXF.y) rows = rows.filter(k => BXH.y[k] === BXF.y);
  else { const my = Math.max(...rows.map(k => BXH.y[k])); rows = rows.filter(k => BXH.y[k] === my); }
  if (!rows.length) return null;
  const lastk = rows[rows.length - 1];
  let sS = null, tT = null, x = 0;
  for (const k of rows) { if (BXH.s[k] != null) sS = (sS || 0) + BXH.s[k]; if (BXH.t[k] != null) tT = Math.max(tT || 0, BXH.t[k]); x = x || BXH.x[k]; }
  return { rows, y: BXH.y[lastk], s: sS, t: tT, e: BXH.e[lastk], r: BXH.r[lastk], x };
}
function bxList() {
  const q = normTxt(BXF.q.trim()), out = [];
  for (let i = 0; i < NBX; i++) {
    const c = BX.c[i];
    if (BXF.t === -2 ? c >= 0 : BXF.t >= 0 && (c < 0 || TOF[c] !== BXF.t)) continue;
    if (BXF.c >= 0 && c !== BXF.c) continue;
    const cat = bxCat(i);
    if (BXF.cat === 'frpd' ? !BX_FRPD.has(cat) : BXF.cat === 'soc' ? !cat.startsWith('soc:') : BXF.cat && cat !== BXF.cat) continue;
    if (BXF.L >= 0 && !((BX.L[i] >> BXF.L) & 1)) continue;
    if (BXF.fin && BX_FIN[i] !== BXF.fin) continue;
    if (q && !BX_S[i].includes(q)) continue;
    const ref = bxRef(i); if (!ref) continue;
    if (BXF.e >= 0 && ref.e !== BXF.e) continue;
    if (BXF.r >= 0 && ref.r !== BXF.r) continue;
    out.push({ i, ref });
  }
  const k = BXF.sort, d = BXF.dir;
  const val = o => (k === 's' ? (o.ref.x ? -1 : o.ref.s ?? -1) : k === 't' ? (o.ref.x ? -1 : o.ref.t ?? -1) : k === 'y' ? o.ref.y : k === 'code' ? BX.code[o.i] : BX_N[o.i]);
  out.sort((a, b) => { const x = val(a), y = val(b); return (typeof x === 'string' ? x.localeCompare(y, 'es') : x - y) * d; });
  return out;
}
function bxInitControls() {
  const opt = (v, l) => `<option value="${v}">${esc(l)}</option>`;
  $('#bx-t').innerHTML = opt(-1, 'Todos') + opt(-2, 'Regional (sin comuna)') + TER.map((t, i) => opt(i, t.n)).join('');
  $('#bx-c').innerHTML = opt(-1, 'Todas') + [...ALLC].sort((a, b) => CN(a).localeCompare(CN(b), 'es')).map(c => opt(c, CN(c))).join('');
  const frc = BX.catv.filter(c => !c.startsWith('soc:')), soc = BX.catv.filter(c => c.startsWith('soc:'));
  $('#bx-cat').innerHTML = opt('', 'Todas') + opt('frpd', 'Relacionadas con el FRPD (fomento, CTCI, riego, conectividad, energía, residuos, digital)') + frc.map(c => opt(c, catLab(c))).join('') + opt('soc', 'Sociales y urbanas (todas)') + soc.map(c => opt(c, catLab(c))).join('');
  $('#bx-l').innerHTML = opt(-1, 'Todos') + LIN.map((l, j) => opt(j, `${l.k} · ${LSHORT[l.k]}`)).join('');
  $('#bx-y').innerHTML = opt(0, 'Última postulación') + BX_YEARS.map(y => opt(y, y)).join('');
  $('#bx-e').innerHTML = opt(-1, 'Todas') + BX.etv.map((e, j) => (e ? opt(j, etLab(e)) : '')).join('');
  $('#bx-fin').innerHTML = opt('', 'Todas') + [...new Set(BX_FIN)].sort().map(f => opt(f, f)).join('');
  $('#bx-r').innerHTML = opt(-1, 'Todos') + BX.ratev.map((r, j) => opt(j, r ? `${r} · ${RATEL[r] || 'código ' + r}` : 'Sin RATE')).join('');
  const bind = (id, key, num) => $('#' + id).addEventListener('change', e => { BXF[key] = num ? +e.target.value : e.target.value; if (key === 't' && BXF.t !== -1) BXF.c = -1; if (key === 'c' && BXF.c >= 0) BXF.t = -1; BXF.page = 0; BXF.open.clear(); renderBip(); });
  bind('bx-t', 't', 1); bind('bx-c', 'c', 1); bind('bx-cat', 'cat'); bind('bx-l', 'L', 1); bind('bx-y', 'y', 1); bind('bx-e', 'e', 1); bind('bx-fin', 'fin'); bind('bx-r', 'r', 1);
  let qt; $('#bx-q').addEventListener('input', e => { clearTimeout(qt); qt = setTimeout(() => { BXF.q = e.target.value; BXF.page = 0; BXF.open.clear(); renderBip(); }, 180); });
  $('#bx-clear').addEventListener('click', () => { Object.assign(BXF, { q: '', t: -1, c: -1, cat: '', L: -1, y: 0, e: -1, fin: '', r: -1, page: 0 }); BXF.open.clear(); $('#bx-q').value = ''; renderBip(); });
  $('#bx-csv').addEventListener('click', exportBip);
}
const BXPAGE = 50;
let BX_LAST = [];
function renderBip() {
  if (!rendered.bip) { bxInitControls(); rendered.bip = true; }
  ['t', 'c', 'cat', 'L', 'y', 'e', 'fin', 'r'].forEach(k => { const el = $('#bx-' + (k === 'L' ? 'l' : k)); if (el) el.value = String(BXF[k]); });
  if ($('#bx-q').value !== BXF.q) $('#bx-q').value = BXF.q;
  const L = bxList(); BX_LAST = L;
  const ok = L.filter(o => !o.ref.x);
  const sS = ok.reduce((a, o) => a + (o.ref.s || 0), 0), sT = ok.reduce((a, o) => a + (o.ref.t || 0), 0);
  const nRS = L.filter(o => BX.ratev[o.ref.r] === 'RS').length, nF = L.filter(o => BX_FIN[o.i].startsWith('FNDR')).length;
  const k = (l, v, s2) => `<div class="kpi"><span class="l">${l}</span><span class="v">${v}</span><span class="s">${s2}</span></div>`;
  $('#bx-kpis').innerHTML = [k('Iniciativas', f0(L.length), `de ${f0(NBX)} en la región`), k(BXF.y ? `Solicitado para ${BXF.y}` : 'Solicitado (última postulación)', f0(sS / 1000) + '<small> MM$</small>', 'monto pedido para el año presupuestario'),
    k('Costo total de las etapas', f0(sT / 1000) + '<small> MM$</small>', 'diseño, ejecución u otra etapa postulada'), k('Recomendadas (RS)', f0(nRS), `${pc(L.length ? nRS / L.length : NaN, 0)} de las filtradas`), k('Con FNDR', f0(nF), `${pc(L.length ? nF / L.length : NaN, 0)} de las filtradas`)].join('');
  const nx = L.length - ok.length;
  $('#bx-sub').textContent = `${pl(L.length, 'iniciativa', 'iniciativas')}${BXF.y ? ` ${L.length === 1 ? 'postulada' : 'postuladas'} en ${BXF.y}` : ''}. Clic en una fila para ver la descripción y el historial de postulaciones.${nx ? ` ${pl(nx, 'iniciativa tiene', 'iniciativas tienen')} montos atípicos (⚠), excluidos de los totales.` : ''}`;
  const pages = Math.max(1, Math.ceil(L.length / BXPAGE)); BXF.page = Math.min(BXF.page, pages - 1);
  const sl = L.slice(BXF.page * BXPAGE, (BXF.page + 1) * BXPAGE);
  const th = (key, lab, r) => `<th class="${r ? 'r' : ''}">${key ? `<button type="button" data-s="${key}"${BXF.sort === key ? ` aria-sort="${BXF.dir > 0 ? 'ascending' : 'descending'}"` : ''}>${lab}${BXF.sort === key ? (BXF.dir > 0 ? ' ↑' : ' ↓') : ''}</button>` : lab}</th>`;
  const warn = x => (x ? ' <span class="warnmk" title="Monto atípico: probablemente registrado en pesos y no en miles de pesos">⚠</span>' : '');
  $('#bx-tbl').innerHTML = `<table><thead><tr>${th('code', 'Código')}${th('n', 'Iniciativa')}${th('', 'Categoría')}${th('y', 'Año')}${th('', 'Etapa')}${th('', 'Financiamiento')}${th('', 'RATE')}${th('s', 'Solicitado MM$', 1)}${th('t', 'Costo total MM$', 1)}</tr></thead><tbody>` +
    (sl.length ? sl.map(({ i, ref }) => {
      const c = BX.c[i], rate = BX.ratev[ref.r], open = BXF.open.has(i);
      let row = `<tr class="click${open ? ' on' : ''}" data-i="${i}" tabindex="0" aria-expanded="${open}"><td class="m">${BX.code[i]}</td><td style="min-width:260px"><b style="font-weight:500">${esc(BX_N[i])}</b><span class="sm">${esc(BX_INS(i))} · ${c >= 0 ? esc(CN(c)) : 'Regional / sin comuna'}</span></td>
        <td><span class="sm" style="color:var(--ink2)">${esc(catLab(bxCat(i)))}</span></td><td class="m">${ref.y}</td><td>${esc(etLab(BX.etv[ref.e]))}</td><td><span class="sm" style="color:var(--ink2)">${esc(BX_FIN[i])}</span></td>
        <td>${rate ? `<span class="pill${rate === 'RS' ? ' ok' : rate === 'OT' || rate === 'IN' ? ' bad' : rate === 'FI' ? ' warn' : ''}" title="${esc(RATEL[rate] || 'código ' + rate)}">${rate}</span>` : '<span class="sm">–</span>'}</td>
        <td class="m r">${mmK(ref.s)}${warn(ref.x)}</td><td class="m r">${mmK(ref.t)}${warn(ref.x)}</td></tr>`;
      if (open) {
        const hr = BX_ROWS[i];
        row += `<tr class="det"><td colspan="9"><div class="bpdet"><div><p>${esc(BX_D[i] || 'Sin descripción.')}</p><p class="note" style="margin-top:8px">${c >= 0 ? `${esc(CN(c))} · ${esc(TER[TOF[c]].n)}` : 'Alcance regional o sin comuna'} · ${esc(catLab(bxCat(i)))} (clasificación aproximada) · Lineamientos inferidos: ${LIN.filter((l, j) => (BX.L[i] >> j) & 1).map(l => l.k).join(', ') || 'ninguno'} · Fuente: ${esc(BX.finv[BX.fin[i]] || 'sin dato')}</p></div>
          <div class="tbl-wrap"><table><thead><tr><th>Año</th><th>Etapa</th><th>RATE</th><th class="r">Solicitado</th><th class="r">Costo total</th><th class="r">Asignado</th><th class="r">Gastado</th></tr></thead><tbody>${hr.map(kk => `<tr><td class="m">${BXH.y[kk]}</td><td>${esc(etLab(BX.etv[BXH.e[kk]]))}</td><td class="m">${esc(BX.ratev[BXH.r[kk]] || '–')}</td><td class="m r">${mmK(BXH.s[kk])}${warn(BXH.x[kk])}</td><td class="m r">${mmK(BXH.t[kk])}</td><td class="m r">${mmK(BXH.a[kk])}</td><td class="m r">${mmK(BXH.g[kk])}</td></tr>`).join('')}</tbody></table><p class="note" style="margin-top:6px">Montos en MM$. Asignado y gastado: vigentes en el año de la postulación.</p></div></div></td></tr>`;
      }
      return row;
    }).join('') : '<tr><td colspan="9" class="note" style="padding:18px">No hay iniciativas con estos filtros.</td></tr>') + '</tbody></table>';
  $$('#bx-tbl th button').forEach(b => b.addEventListener('click', () => { const k2 = b.dataset.s; if (BXF.sort === k2) BXF.dir *= -1; else { BXF.sort = k2; BXF.dir = (k2 === 'n' || k2 === 'code') ? 1 : -1; } BXF.page = 0; renderBip(); }));
  $$('#bx-tbl tr[data-i]').forEach(r => { const go = () => { const i = +r.dataset.i; if (BXF.open.has(i)) BXF.open.delete(i); else BXF.open.add(i); renderBip(); }; r.addEventListener('click', go); r.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }); });
  $('#bx-pager').innerHTML = `<span>${L.length ? `${f0(BXF.page * BXPAGE + 1)}–${f0(Math.min(L.length, (BXF.page + 1) * BXPAGE))} de ${f0(L.length)}` : ''}</span><span style="display:flex;gap:6px"><button class="btn" type="button" id="bx-prev"${BXF.page ? '' : ' disabled'}>Anterior</button><button class="btn" type="button" id="bx-next"${BXF.page < pages - 1 ? '' : ' disabled'}>Siguiente</button></span>`;
  $('#bx-prev').onclick = () => { BXF.page--; renderBip(); $('#bx-tbl').scrollIntoView({ block: 'start' }); };
  $('#bx-next').onclick = () => { BXF.page++; renderBip(); $('#bx-tbl').scrollIntoView({ block: 'start' }); };
  $('#bx-csv').hidden = !DL;
}
function exportBip() {
  const lines = [['Código BIP', 'Nombre', 'Institución responsable', 'Comuna', 'Territorio ERD', 'Categoría (aprox.)', 'Lineamientos (aprox.)', 'Fuente de financiamiento', 'Año postulación', 'Etapa', 'RATE', 'Solicitado (M$)', 'Costo total etapa (M$)', 'Asignado vigente (M$)', 'Gasto vigente (M$)', 'Monto atípico', 'Descripción (extracto)']];
  for (const { i } of BX_LAST) {
    const c = BX.c[i];
    for (const kk of BX_ROWS[i]) {
      if (BXF.y && BXH.y[kk] !== BXF.y) continue;
      lines.push([BX.code[i], BX_N[i], BX_INS(i), c >= 0 ? CN(c) : '', c >= 0 ? TER[TOF[c]].n : 'Regional', catLab(bxCat(i)), LIN.filter((l, j) => (BX.L[i] >> j) & 1).map(l => l.k).join(' '), BX.finv[BX.fin[i]], BXH.y[kk], BX.etv[BXH.e[kk]], BX.ratev[BXH.r[kk]], BXH.s[kk] ?? '', BXH.t[kk] ?? '', BXH.a[kk] ?? '', BXH.g[kk] ?? '', BXH.x[kk] ? 'Sí' : '', BX_D[i]]);
    }
  }
  saveCSV(lines, 'iniciativas_bip_araucania.csv');
}
function openBip(f) { Object.assign(BXF, { q: '', t: -1, c: -1, cat: '', L: -1, y: 0, e: -1, fin: '', r: -1, page: 0 }, f); BXF.open.clear(); setView('bip'); window.scrollTo({ top: 0 }); }

// ================= SIMULADOR =================
const WLAB = { pop: 'Población (Censo 2024)', bre: 'Brechas habilitantes', rez: 'Población en zona de rezago', emp: 'Base empresarial (SII 2024)', eq: 'Partes iguales' };
function terShares() {
  const sh = {};
  sh.pop = TER.map(t => t.pop / POPREG);
  const bs = TER.map(t => t.c.reduce((a, c) => a + BRE[c].length * POP[c], 0)), bt = sum(bs); sh.bre = bs.map(x => x / bt);
  const rz = TER.map((t, i) => rezPop(i)), rt = sum(rz); sh.rez = rz.map(x => x / rt);
  sh.emp = TN0.map(x => x / N);
  sh.eq = TER.map(() => 1 / NT);
  return sh;
}
const SH = terShares();
function renderSimForm() {
  const s = UI.sim;
  const rng = (id, lab, v, min, max, step, suf) => `<div class="field"><label for="${id}">${lab}<b id="${id}-v">${v}${suf}</b></label><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${v}"></div>`;
  $('#simf').innerHTML = `<div class="field"><label for="s-monto">Monto anual del FRPD (MM$, millones de pesos)</label><input class="inp" id="s-monto" type="number" min="0" step="100" value="${s.monto}"><span class="note">Valor de ejemplo. Ingresa el marco presupuestario aprobado.</span></div>
    ${rng('s-ctci', 'Investigación científica y tecnológica (N°3)', s.ctci, 0, 70, 1, ' %')}
    ${rng('s-adm', 'Gastos de administración', s.adm, 0, 8, 0.5, ' %')}
    ${rng('s-reg', 'Reserva para líneas de alcance regional', s.reg, 0, 50, 1, ' %')}
    <div class="wts"><span class="lbl">Ponderadores de la distribución territorial</span>${Object.keys(WLAB).map(k => rng('w-' + k, WLAB[k], s.w[k], 0, 100, 5, '')).join('')}
    <p class="note">Los ponderadores se normalizan: lo que importa es su peso relativo.</p></div>`;
  const bind = (id, fn) => $('#' + id).addEventListener('input', e => { fn(+e.target.value); const vv = $('#' + id + '-v'); if (vv) vv.textContent = e.target.value + (id.startsWith('w-') ? '' : ' %'); renderSimOut(); });
  bind('s-monto', v => { s.monto = Math.max(0, v || 0); }); bind('s-ctci', v => { s.ctci = v; }); bind('s-adm', v => { s.adm = v; }); bind('s-reg', v => { s.reg = v; });
  Object.keys(WLAB).forEach(k => bind('w-' + k, v => { s.w[k] = v; }));
}
const pn = v => (Number.isInteger(v) ? f0(v) : f1(v));
function renderSimOut() {
  const s = UI.sim, M = s.monto, adm = M * s.adm / 100, ctci = M * s.ctci / 100, rest = Math.max(0, M - adm - ctci);
  const fmt = v => f0(v) + ' MM$';
  $('#sim-sub').textContent = `Sobre ${fmt(M)}: administración, investigación (N°3) y fomento productivo y desarrollo regional (N°1 y N°2).`;
  const seg = (v, col, lab) => (v > 0 ? `<span style="flex:${v};background:${col};color:${inkOn(col)}" title="${lab}: ${fmt(v)}">${v / M >= 0.12 ? lab : ''}</span>` : '');
  $('#sim-split').innerHTML = `<div class="split">${seg(adm, css('--m1'), 'Administración')}${seg(ctci, css('--acc'), 'N°3 investigación')}${seg(rest, css('--data'), 'N°1 y N°2')}</div>
    <div class="hab" style="grid-template-columns:minmax(0,1fr) auto auto;margin-top:10px"><span class="n">Administración (art. 9)</span><span class="x">${fmt(adm)}</span><span class="x"><small>${pn(s.adm)} %</small></span>
    <span class="n">Investigación científica y tecnológica (N°3)</span><span class="x">${fmt(ctci)}</span><span class="x"><small>${pn(s.ctci)} %</small></span>
    <span class="n">Fomento productivo y desarrollo regional (N°1 y N°2)</span><span class="x">${fmt(rest)}</span><span class="x"><small>${pn(100 - s.ctci - s.adm)} %</small></span></div>`;
  const terN3 = TER.map(t => ENT.filter(e => e.t === t.k && isCTCI(LINE[e.l])).length);
  const noN3 = TER.filter((t, i) => !terN3[i]);
  const ck = (ok, txt) => `<div class="check ${ok ? 'ok' : 'no'}"><i>${ok ? '✓' : '!'}</i><span>${txt}</span></div>`;
  $('#sim-checks').innerHTML = ck(s.ctci >= 25, s.ctci >= 25 ? `Cumple el piso del art. 7: ${f0(s.ctci)} % para investigación científica y tecnológica.` : `Bajo el piso del art. 7 (25 %): requiere solicitud fundada al Ministerio de Hacienda.`) +
    ck(s.adm <= 5, s.adm <= 5 ? `Administración dentro del tope del 5 % (art. 9).` : `Administración sobre el tope del 5 % del art. 9.`) +
    ck(s.ctci + s.adm <= 100, s.ctci + s.adm <= 100 ? `La cartera tiene ${ENT.filter(e => isCTCI(LINE[e.l])).length} entradas con categoría N°3 para absorber ${fmt(ctci)}.` : 'La suma de porcentajes supera el 100 %.') +
    (noN3.length ? ck(false, `Sin entradas N°3 en ${esc(noN3.map(t => t.n).join(', '))}: su parte de investigación quedaría sin cartera.`) : ck(true, 'Todos los territorios tienen al menos una entrada con categoría N°3.'));
  // distribución territorial
  const W = s.w, wt = sum(Object.values(W)) || 1;
  const share = TER.map((t, i) => Object.keys(W).reduce((a, k) => a + W[k] / wt * SH[k][i], 0));
  const pool = (M - adm) * (1 - s.reg / 100), poolC = ctci * (1 - s.reg / 100);
  const vals = share.map(x => x * pool), mx = Math.max(...vals, 1);
  const order = [...Array(NT).keys()].sort((a, b) => vals[b] - vals[a]);
  $('#sim-allo').innerHTML = `<div class="arow h"><span>Territorio</span><span>Monto (N°3 en verde agua)</span><span style="text-align:right">MM$</span><span style="text-align:right">$ por hab.</span></div>` +
    order.map(i => `<div class="arow"><span class="n" title="${esc(TER[i].n)}">${esc(TER[i].n)}</span><span class="b"><i style="width:${vals[i] / mx * 100}%"></i><u style="width:${share[i] * poolC / mx * 100}%"></u></span><span class="x">${f0(vals[i])}<small>${pc(share[i], 1)}</small></span><span class="x">${f0(vals[i] * 1e6 / TER[i].pop)}<small>${terN3[i]} de ${ENT.filter(e => e.t === TER[i].k).length} con N°3</small></span></div>`).join('');
  $('#sim-note').textContent = `Monto territorial: ${fmt(pool)} (descontada la administración y la reserva regional de ${fmt((M - adm) * s.reg / 100)}). El D.S. 1.699 no fija una regla de distribución entre territorios: estos ponderadores son un criterio de discusión del GORE, no una asignación.`;
}
function renderSim() { if (!rendered.sim) { renderSimForm(); rendered.sim = true; } renderSimOut(); }

// ================= descargas (CSV) =================
let DL = null;
const csvCell = v => { const s = String(v == null ? '' : v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
async function saveCSV(lines, name) {
  if (!DL) return;
  const text = '﻿' + lines.map(r => r.map(csvCell).join(';')).join('\r\n');
  try { await DL.save({ filename: name, data: new Blob([text], { type: 'text/csv' }) }); toast('Archivo listo: ' + name); }
  catch (e) { if (e && e.code === 'declined') return; toast('No se pudo exportar el archivo en esta vista.'); }
}
function exportFirms() {
  const { t, L, firms } = FICHA, T = TER[t], Lk = LIN[L].k;
  const lines = [['RUT', 'DV', 'Razón social', 'Comuna', 'Territorio ERD', 'Lineamiento CTCI', 'Subrubro', 'Actividad económica', 'Trabajadores dependientes 2024', 'Tamaño según ventas', 'Tramo de ventas SII (código)', 'Tramo de ventas SII', 'Ventas anuales mínimas del tramo (UF)', 'Ventas anuales máximas del tramo (UF)', 'Año inicio', 'Sector', 'Forma jurídica', 'En nómina Res. 1/2026']]
    .concat(firms.map(i => [B.rut[i], B.dv[i], NAMES[i], CN(COM[i]), T.n, Lk + ' ' + LSHORT[Lk], D.subs[SUB[i]].l, D.acts[ACT[i]].l, TRAB[i], D.tams[tamOf(TRAMO[i])], TRAMO[i], tramoTxt(TRAMO[i]), TRAMO_LO[TRAMO[i]] ?? '', TRAMO[i] === 13 ? 'sin tope' : (TRAMO_HI[TRAMO[i]] ?? ''), YR[i] || '', SECTORS[SEC[i]], D.formas[FOR[i]], NOM[i] ? 'Sí' : 'No']));
  const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  saveCSV(lines, `empresas_${slug(T.n)}_${Lk.toLowerCase()}.csv`);
}
function exportFin() {
  const { t, L, fin } = FICHA, T = TER[t], Lk = LIN[L].k;
  const lines = [['Fuente', 'Tipo', 'Año', 'Nombre', 'Institución o beneficiario', 'Programa / etapa', 'Comuna', 'Territorio ERD', 'Monto (MM$)', 'Lineamientos inferidos', 'Referencia']]
    .concat(fin.map(i => { const s = SRCN[FN_S[i]], g = fnG(i); return [s, s === 'BIP' ? BIPCAT[g] : GLAB[g] || '', FN_Y[i], FN_N[i], fnI(i), fnP(i), FN_C[i] >= 0 ? CN(FN_C[i]) : 'Regional / sin comuna', FN_T[i] >= 0 ? TER[FN_T[i]].n : '', isFinite(FN_M[i]) ? FN_M[i] : '', LIN.filter((l, j) => fnHasL(i, j)).map(l => l.k).join(' '), s === 'BIP' ? 'BIP ' + (FN.a[i].split('|')[1] || '') : '']; }));
  const slug = x => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  saveCSV(lines, `financiamiento_${slug(T.n)}_${Lk.toLowerCase()}.csv`);
}
$('#exe-csv').addEventListener('click', () => {
  const lines = [['Institución', 'Tipo', 'Comunas', 'Habilitación', 'En nómina Res. 1/2026', 'Proyectos ANID 2019-2026', 'ANID investigación aplicada', 'ANID MM$', ...LIN.map(l => 'ANID ' + l.k), 'Proyectos CORFO InnovaChile 2019-2026', 'Nota']]
    .concat(EXE.map(x => [x.n, x.sub, x.c.map(CN).join(', '), x.base, x.r1 ? 'Sí' : 'No', x.an.n, x.an.apl, x.an.m, ...x.an.L, x.co.n, x.note]))
    .concat(EXENO.map(x => [x.n, 'Educación superior privada', CN(x.c), 'No figura en la nómina del primer llamado 2026', 'No', '', '', '', '', '', '', '', '', '', '', '']));
  saveCSV(lines, 'ejecutores_frpd_araucania.csv');
});
$('#hb-csv').addEventListener('click', () => {
  const lines = [['Comuna', 'Territorio ERD', 'Habitantes 2024', 'Km red vial', 'Km pavimentados', '% pavimentado', 'Puentes', 'Puentes con tablero de madera', 'SAIDI 2022 (h)', 'Viviendas sin energía', 'Antenas autorizadas', 'Antenas LTE', 'Subestaciones', 'Servicios sanitarios rurales', 'Beneficiarios SSR', 'SSR con grupo electrógeno', 'Bocatomas', 'Embalses', 'Sedes educación superior', 'Inversión pública 2010-2022 (MM$)', 'Inversión pública per cápita ($)', 'BIP habilitante 2019-2027 (MM$)', 'Zona de rezago', 'Brechas (tercio peor)']]
    .concat(ALLC.map(c => [CN(c), TER[TOF[c]].n, POP[c], IN.kmv[c], IN.kmpav[c], (HV.pav[c] * 100).toFixed(1), IN.pue[c], IN.pmad[c], IN.saidi[c], IN.vse[c], IN.ant[c], IN.lte[c], IN.sub[c], IN.ssr[c], IN.ssrb[c], IN.ssrge[c], IN.boc[c], IN.emb[c], IN.ies[c], IN.ipa[c], IN.ipapc[c], Math.round(binvC[c]), IN.rez[c] ? 'Sí' : 'No', BRE[c].map(k => HABS.find(h => h.k === k).l).join(', ')]));
  saveCSV(lines, 'condiciones_habilitantes_comunas_araucania.csv');
});

// ================= Claude (sample) =================
let SAMPLE, sampleCtl = null;
function mdToHtml(md) {
  const lines = esc(md).split(/\r?\n/); let out = '', list = null;
  const inl = s => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>');
  const close = () => { if (list) { out += `</${list}>`; list = null; } };
  for (const raw of lines) {
    const l = raw.trim(); if (!l) { close(); continue; }
    let m;
    if ((m = l.match(/^#{1,4}\s+(.*)$/))) { close(); out += `<h4>${inl(m[1])}</h4>`; }
    else if ((m = l.match(/^[-*•]\s+(.*)$/))) { if (list !== 'ul') { close(); out += '<ul>'; list = 'ul'; } out += `<li>${inl(m[1])}</li>`; }
    else if ((m = l.match(/^\d+[.)]\s+(.*)$/))) { if (list !== 'ol') { close(); out += '<ol>'; list = 'ol'; } out += `<li>${inl(m[1])}</li>`; }
    else { close(); out += `<p>${inl(l)}</p>`; }
  }
  close(); return out;
}
function buildPrompt() {
  const { t, L, e, firms, topSub } = FICHA, T = TER[t], Lk = LIN[L].k, ln = e ? LINE[e.l] : null;
  const data = {
    territorio: T.n, comunas: T.c.map(CN), poblacion_censo_2024: T.pop, objetivo_territorial_ERD: T.obj,
    lineamiento_CTCI: `${Lk} ${LIN[L].n}`,
    entrada_cartera: ln ? { linea: `${ln.k} ${ln.n}`, bloque: BLOQ[ln.b], madurez: `${e.m} de 3 (${MADT[e.m]})`, que_financia: ln.que, evidencia_minuta: ln.ev,
      categorias_art8: ln.a8.map(k => `${k}: ${A8[k].n}`), gastos_N3: ln.g.map(k => `${k}: ${GASTO[k]}`), aporta_piso_CTCI_25: isCTCI(ln), LER: ln.ler.map(k => `LER ${k} ${LERN[k]}`) } : 'Sin entrada en la cartera para esta celda',
    filtros_de_empresas_aplicados: hasAttr() ? filterText(true) : 'ninguno (todas las empresas con casa matriz en la región)',
    oferta_de_conocimiento_CTCI_en_el_territorio: FICHA.of ? Object.fromEntries([1, 2, 3, 4, 5].map(j => [CTG[j - 1], { empresas: FICHA.of.n[j], trabajadores: FICHA.of.w[j] }])) : undefined,
    base_empresarial_SII_2024: { empresas: cN[t][L], porcentaje_del_territorio: +(cN[t][L] / tN[t] * 100).toFixed(1), trabajadores: cT[t][L], empresas_10_o_mas_trabajadores: c10[t][L],
      cociente_localizacion_empresas: +lqN(t, L).toFixed(2), cociente_localizacion_trabajadores: +lqT(t, L).toFixed(2), periodo_crecimiento: pLab(), crecimiento_empresas_pct: +(gr(serC[t][L]) * 100).toFixed(0), crecimiento_region_mismo_lineamiento_pct: +(gr(serR[L]) * 100).toFixed(0),
      subrubros_principales: topSub.map(([s, n]) => ({ subrubro: D.subs[s].l, empresas: n })), empresas_vigentes_objetivo: firms.length, ventas_anuales_estimadas_UF: (r => ({ minimo: r.lo, maximo: r.hi, empresas_sobre_1_millon_UF_sin_tope: r.open, nota: 'suma de tramos de ventas SII, no ventas exactas' }))(salesRange(firms)) },
    condiciones_habilitantes: Object.fromEntries(HABS.map(h => [`${h.l} (${h.u})`, { territorio: h.f(terHab(h, t)), region: h.f(HREG[h.k]) }])),
    servicios_sanitarios_rurales: { sistemas: sumC('ssr', T.c), beneficiarios: sumC('ssrb', T.c) },
    financiamiento_existente_2019_2026: { nota: 'ANID por sede de la institución, CORFO InnovaChile por casa matriz del beneficiario, BIP por comuna; lineamiento inferido del título', en_el_territorio: FICHA.fin.filter(i => FN_C[i] >= 0).slice(0, 12).map(i => ({ fuente: SRCN[FN_S[i]], anio: FN_Y[i], nombre: FN_N[i], institucion: fnI(i), monto_MM$: isFinite(FN_M[i]) ? FN_M[i] : null })), alcance_regional: FICHA.fin.filter(i => FN_C[i] < 0).slice(0, 6).map(i => ({ fuente: SRCN[FN_S[i]], anio: FN_Y[i], nombre: FN_N[i], monto_MM$: isFinite(FN_M[i]) ? FN_M[i] : null })) },
    sedes_educacion_superior: [...new Set(iesOfTer(t).map(x => x.n))],
    ejecutores_posibles: (FICHA.exe || []).map(x => ({ institucion: x.n, tipo: x.sub, en_el_territorio: x.inT, proyectos_ANID_en_el_lineamiento_2019_2026: x.an.L[L], habilitacion: x.base, en_nomina_Res_1_2026: x.r1 })), comunas_en_zona_de_rezago: T.c.filter(c => IN.rez[c]).map(CN), comunas_sin_plan_regulador: T.prcSin.map(CN),
    evidencia_de_necesidad: { nota: 'Territorio vs región; comuna_mas_critica = comuna del territorio con el valor más desfavorable. Fuentes: SAE 2022, Censo 2024, ARClim (SSP2-4.5, mitad de siglo), CONAF 2024-25, PROT (cobertura parcial), CAF 2021, SINIM 2024.',
      indicadores: (FICHA.ev || []).map(e => { const w = e.bad && T.c.length > 1 ? evWorst(e, T.c) : null; return { indicador: `${e.l} (${e.u})`, territorio: e.f(e.v(T.c)), region: e.f(EVREG[e.k]), comuna_mas_critica: w != null ? `${CN(w)} ${e.f(EVV[e.k][w])}` : undefined }; }),
      cultivos_principales_CAF_2021_ha: (() => { const sp = spTer(T.c); return SPV.map((n, j) => [n, sp[j]]).filter(x => x[1] > 0).sort((p, q) => q[1] - p[1]).slice(0, 6).map(([n, v]) => `${n}: ${Math.round(v)} ha`); })() },
    contexto_regional: { PIB_por_habitante: (() => { const v = PB.pcIX[PB.pcIX.length - 1], all = Object.values(PB.pcAll), rk = all.filter(x => x > v).length + 1; return `${f1(v / 1000)} MM$ en ${PB.pcY[PB.pcY.length - 1]}; lugar ${rk} de ${all.length} regiones (${all.length} = el más bajo)`; })(), pobreza_multidimensional_region: pc(EVREG.pmd), poblacion_indigena_region: pc(EVREG.ind) },
    reglas_DS_1699: 'Art. 7: al menos 25% del fondo a investigación científica y tecnológica (N°3). Art. 9: administración hasta 5%. Art. 10 excluye remuneraciones fuera del art. 9, empleo público, vivienda, vehículos salvo imprescindibles, espacios públicos fuera de un proyecto del art. 8, y eventos. Ejecutores: instituciones públicas con funciones de fomento o investigación; IES públicas acreditadas 4 años o más; privadas y entidades sin fines de lucro solo si están en la resolución conjunta del art. 14 y vía concurso.',
  };
  return `Actúas como analista de la División de Fomento e Industria del Gobierno Regional de La Araucanía (Chile). Con SOLO los datos JSON de abajo, redacta en español un borrador de perfil de iniciativa para financiar con el Fondo Regional para la Productividad y el Desarrollo (FRPD, D.S. 1.699 de 2024) en el territorio y lineamiento indicados.

Estructura (Markdown simple, títulos con ##, viñetas con -):
## Problema u oportunidad (con cifras de los datos, incluida la evidencia de necesidad: equidad, agua y clima, riesgos, base agropecuaria)
## Objetivo general y 2–3 objetivos específicos
## Encaje en el D.S. 1.699 (categoría del art. 8, tipo de gasto, si aporta al piso del 25%) y alineación con la ERD
## Población y empresas objetivo
## Complementariedad con lo ya financiado (ANID, CORFO, BIP) y riesgo de duplicación
## Ejecutores posibles y requisitos
## Condiciones habilitantes, capacidad municipal y riesgos
## Información por levantar antes de formular

Reglas: no inventes cifras, montos ni instituciones que no estén en los datos; si infieres algo, preséntalo como hipótesis. Si la celda no tiene entrada en la cartera, plantea si se justifica una y con qué categoría. La correspondencia entre subrubros SII y lineamientos es aproximada. Máximo 650 palabras.

DATOS:
${JSON.stringify(data)}`;
}
function wireClaude() {
  const go = $('#cl-go'), stop = $('#cl-stop'), copy = $('#cl-copy'), out = $('#cl-out'), st = $('#cl-status');
  if (!go) return;
  if (SAMPLE === null) { go.disabled = true; st.textContent = 'Disponible al abrir el radar en Claude.'; return; }
  if (SAMPLE === undefined) { go.disabled = true; st.textContent = 'Conectando con Claude…'; return; }
  go.disabled = false; st.textContent = '';
  let last = '';
  go.onclick = async () => {
    sampleCtl = new AbortController(); go.disabled = true; stop.hidden = false; copy.hidden = true; out.hidden = false; out.innerHTML = '<p class="note">Pensando… el borrador suele comenzar a escribirse en 10 a 40 segundos.</p>'; st.textContent = '';
    try {
      const r = await SAMPLE(buildPrompt(), { signal: sampleCtl.signal, modelTier: 'default', onText: ({ text }) => { last = text; out.innerHTML = mdToHtml(text); } });
      last = r.text; out.innerHTML = mdToHtml(r.text); copy.hidden = false;
      if (r.truncated) st.textContent = 'El borrador quedó cortado; vuelve a intentarlo.';
    } catch (e) {
      if (e && e.text) { last = e.text; out.innerHTML = mdToHtml(e.text); copy.hidden = false; } else if (!(e && e.code === 'cancelled')) out.hidden = true;
      st.textContent = { not_granted: 'No se autorizó el uso de Claude en esta página.', rate_limited: 'Hay demasiadas consultas en curso; espera un momento y vuelve a intentarlo.', cancelled: 'Redacción detenida.' }[e && e.code] || 'No se pudo completar el borrador. Vuelve a intentarlo más tarde.';
      if (e && (e.code === 'not_granted' || e.code === 'unavailable')) go.hidden = true;
    } finally { go.disabled = false; stop.hidden = true; }
  };
  stop.onclick = () => sampleCtl && sampleCtl.abort();
  copy.onclick = async () => { try { await navigator.clipboard.writeText(last); toast('Borrador copiado'); } catch (_) { const rg = document.createRange(); rg.selectNodeContents(out); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(rg); toast('Texto seleccionado: cópialo con Ctrl + C'); } };
}

// @@EMPRESAS@@

// ================= arranque =================
$('#loading').hidden = true; $('#app').hidden = false;
const HAS_CLAUDE = !!(window.claude && typeof window.claude.use === 'function');
if (!HAS_CLAUDE) SAMPLE = null;
const h0 = (location.hash || '').slice(1);
$('#tab-bip-n').textContent = NF0.format(NBX);
// fuera de Claude (archivo abierto en el computador): los CSV se descargan directamente desde el navegador
if (!HAS_CLAUDE) {
  DL = { save: async ({ filename, data }) => { const u = URL.createObjectURL(data), a = document.createElement('a'); a.href = u; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); } };
  ['#hb-csv', '#exe-csv', '#bx-csv', '#ev-csv', '#tb-csv', '#cp-csv'].forEach(id => { const el = $(id); if (el) el.hidden = false; });
}
// ================= Compras Públicas (ChileCompra) =================
let LIVE_COMPRAS = null;
window.LIVE_COMPRAS = null;

const TERR_INFO = {
  'TPLC': { n: 'Temuco – Padre Las Casas', c: 'var(--t1)' },
  'LAC':  { n: 'Araucanía Lacustre', c: 'var(--t8)' },
  'MNO':  { n: 'Malleco Norte', c: 'var(--t4)' },
  'VCE':  { n: 'Valle Central', c: 'var(--t2)' },
  'CSU':  { n: 'Cautín Sur', c: 'var(--t3)' },
  'COS':  { n: 'Costa Araucanía', c: 'var(--t6)' },
  'NAH':  { n: 'Nahuelbuta', c: 'var(--t5)' },
  'AND':  { n: 'Araucanía Andina', c: 'var(--t7)' },
};

function getTerrName(tCode) {
  if (!tCode) return '–';
  const clean = String(tCode).trim();
  if (TERR_INFO[clean]) return TERR_INFO[clean].n;
  for (const info of Object.values(TERR_INFO)) {
    if (info.n.toLowerCase() === clean.toLowerCase()) return info.n;
  }
  return clean;
}

function getTerrColor(tCode) {
  if (!tCode) return 'var(--line)';
  const clean = String(tCode).trim();
  if (TERR_INFO[clean]) return TERR_INFO[clean].c;
  for (const [k, info] of Object.entries(TERR_INFO)) {
    if (info.n.toLowerCase() === clean.toLowerCase()) return info.c;
  }
  return 'var(--acc)';
}

const CPF = {
  q: '',
  terr: '',
  ret: '',
  fecha: '',
  limit: '100',
  sort: 'fecha',
  dir: -1
};
let CP_LAST_LIST = [];

function formatCPFecha(raw) {
  if (!raw) return '–';
  const s = String(raw).trim();
  if (s.includes('/')) return s;
  if (s.includes('-')) {
    const parts = s.split('-');
    if (parts[0].length === 4) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return s;
  }
  if (/^\d{7,8}$/.test(s)) {
    const p = s.padStart(8, '0');
    return `${p.slice(0, 2)}/${p.slice(2, 4)}/${p.slice(4)}`;
  }
  return s;
}

function cpFechaKey(raw) {
  const f = formatCPFecha(raw);
  if (!f || f === '–') return 0;
  const p = f.split('/');
  if (p.length === 3) {
    return parseInt(p[2] + p[1] + p[0], 10) || 0;
  }
  return 0;
}

function updateCPFechaOptions(allPurchases) {
  const selFecha = $('#cp-filter-fecha');
  if (!selFecha) return;
  const curr = selFecha.value || CPF.fecha;
  const setFechas = new Set();
  (allPurchases || []).forEach(c => {
    const f = formatCPFecha(c.fecha);
    if (f && f !== '–') setFechas.add(f);
  });
  const fechasArr = Array.from(setFechas).sort((a, b) => cpFechaKey(b) - cpFechaKey(a));
  const existingValues = Array.from(selFecha.options).map(o => o.value).filter(Boolean);
  const isSame = existingValues.length === fechasArr.length && existingValues.every((v, i) => v === fechasArr[i]);
  if (!isSame) {
    let html = '<option value="">Todas las fechas</option>';
    fechasArr.forEach(f => {
      html += `<option value="${esc(f)}">${esc(f)}</option>`;
    });
    selFecha.innerHTML = html;
    if (setFechas.has(curr)) {
      selFecha.value = curr;
    }
  }
}

function exportComprasCSV() {
  const cp = LIVE_COMPRAS || window.LIVE_COMPRAS || (window.__LIVE_WORKSPACE_DATA__ ? window.__LIVE_WORKSPACE_DATA__.comprasPublicas : null);
  if (!cp) {
    toast('No hay compras cargadas para exportar.');
    return;
  }
  const items = CP_LAST_LIST.length ? CP_LAST_LIST : (cp.ultimasCompras || []);
  if (!items.length) {
    toast('Sin compras para los filtros actuales.');
    return;
  }
  const lines = [
    ['Fecha', 'Código OC', 'Licitación / Compra', 'Organismo Comprador', 'Comuna', 'Territorio ERD 2040', 'Proveedor Adjudicado', 'Región Proveedor', 'Adjudicación Local', 'Monto (CLP)', 'Monto (M$)']
  ];
  for (const c of items) {
    lines.push([
      formatCPFecha(c.fecha),
      c.codigo || c.codigoOC || '',
      c.nombre || '',
      c.organismo || '',
      c.comuna || '',
      getTerrName(c.territorio || c.codTerritorio),
      c.proveedor || '',
      c.regionProveedor || '',
      c.esLocal ? 'Local (Araucanía)' : 'Fuga a Santiago / otras',
      c.montoCLP || 0,
      c.montoCLP ? Math.round(c.montoCLP / 1000) : 0
    ]);
  }
  const dateStr = new Date().toISOString().slice(0, 10);
  saveCSV(lines, `compras_publicas_araucania_${dateStr}.csv`);
}

function renderCompras() {
  const cp = LIVE_COMPRAS || window.LIVE_COMPRAS || (window.__LIVE_WORKSPACE_DATA__ ? window.__LIVE_WORKSPACE_DATA__.comprasPublicas : null);
  const tbl = $('#compras-table');
  if (!cp) {
    if (tbl) tbl.innerHTML = '<p class="note" style="padding:24px;text-align:center">Cargando compras públicas monitoreadas…</p>';
    return;
  }
  const setTxt = (id, val) => { const el = $(id); if (el) el.textContent = val; };

  // Poblar opciones de fechas únicas según los datos recibidos
  updateCPFechaOptions(cp.ultimasCompras);

  const selTerr = $('#cp-filter-terr') ? $('#cp-filter-terr').value : CPF.terr;
  const selRet = $('#cp-filter-ret') ? $('#cp-filter-ret').value : CPF.ret;
  const selFecha = $('#cp-filter-fecha') ? $('#cp-filter-fecha').value : CPF.fecha;
  const selLimit = $('#cp-filter-limit') ? $('#cp-filter-limit').value : CPF.limit;
  const selQ = $('#cp-filter-q') ? $('#cp-filter-q').value.trim() : CPF.q;

  CPF.terr = selTerr;
  CPF.ret = selRet;
  CPF.fecha = selFecha;
  CPF.limit = selLimit;
  CPF.q = selQ;

  let list = (cp.ultimasCompras || []).slice();

  // 1. Filtro por territorio
  if (selTerr) {
    list = list.filter(c => (c.codTerritorio === selTerr || c.territorio === selTerr || getTerrName(c.territorio) === TERR_INFO[selTerr]?.n));
  }

  // 2. Filtro por retención / fuga
  if (selRet === 'local') {
    list = list.filter(c => c.esLocal);
  } else if (selRet === 'fuga') {
    list = list.filter(c => !c.esLocal);
  }

  // 3. Filtro por fecha específica
  if (selFecha) {
    list = list.filter(c => formatCPFecha(c.fecha) === selFecha);
  }

  // 4. Búsqueda por texto (nombre, OC, proveedor, organismo, comuna)
  if (selQ) {
    const qNorm = normTxt(selQ);
    list = list.filter(c => {
      const haystack = normTxt((c.nombre || '') + ' ' + (c.codigo || c.codigoOC || '') + ' ' + (c.proveedor || '') + ' ' + (c.organismo || '') + ' ' + (c.comuna || '') + ' ' + (c.regionProveedor || ''));
      return haystack.includes(qNorm);
    });
  }

  // 5. Ordenamiento interactivo
  if (CPF.sort) {
    const k = CPF.sort, d = CPF.dir;
    list.sort((a, b) => {
      let va = 0, vb = 0;
      if (k === 'fecha') {
        va = cpFechaKey(a.fecha);
        vb = cpFechaKey(b.fecha);
      } else if (k === 'monto') {
        va = a.montoCLP || 0;
        vb = b.montoCLP || 0;
      } else if (k === 'oc') {
        va = a.codigo || a.codigoOC || '';
        vb = b.codigo || b.codigoOC || '';
      } else if (k === 'nombre') {
        va = a.nombre || '';
        vb = b.nombre || '';
      } else if (k === 'proveedor') {
        va = a.proveedor || '';
        vb = b.proveedor || '';
      } else if (k === 'terr') {
        va = getTerrName(a.territorio || a.codTerritorio);
        vb = getTerrName(b.territorio || b.codTerritorio);
      }
      return (typeof va === 'string' ? va.localeCompare(vb, 'es') : va - vb) * d;
    });
  }

  CP_LAST_LIST = list;

  // 6. Recálculo dinámico de KPIs para la selección filtrada
  const hasFilter = !!(selTerr || selRet || selFecha || selQ);
  const fTotal = list.reduce((acc, c) => acc + (c.montoCLP || 0), 0);
  const fLocal = list.filter(c => c.esLocal).reduce((acc, c) => acc + (c.montoCLP || 0), 0);
  const fFuga = fTotal - fLocal;
  const fPct = fTotal > 0 ? ((fLocal / fTotal) * 100).toFixed(1) + '%' : '0%';
  const fFugaPct = fTotal > 0 ? ((1 - fLocal / fTotal) * 100).toFixed(1) + '%' : '0%';
  const fTotalM = Math.round(fTotal / 1000);
  const fLocalM = Math.round(fLocal / 1000);

  if (hasFilter) {
    setTxt('#cp-total-monto', '$' + NF0.format(fTotalM) + ' M$');
    setTxt('#cp-total-regs', `${f0(list.length)} de ${f0(cp.totalRegistros || (cp.ultimasCompras ? cp.ultimasCompras.length : list.length))} compras (${f1(fTotal / 1e6)} MM$)`);
    setTxt('#cp-ret-pct', fPct);
    setTxt('#cp-ret-monto', '$' + NF0.format(fLocalM) + ' M$ adjudicado local');
    setTxt('#cp-fuga-pct', fFugaPct);
  } else {
    const totalCLP = cp.montoTotalCLP || fTotal;
    const localCLP = cp.montoRetenidoAraucania || fLocal;
    const totalM = Math.round(totalCLP / 1000);
    const localM = Math.round(localCLP / 1000);
    setTxt('#cp-total-monto', '$' + NF0.format(totalM) + ' M$');
    setTxt('#cp-total-regs', `${f0(cp.totalRegistros || list.length)} compras públicas (${f1(totalCLP / 1e6)} MM$)`);
    setTxt('#cp-ret-pct', cp.porcentajeRetencionLocal || fPct);
    setTxt('#cp-ret-monto', '$' + NF0.format(localM) + ' M$ adjudicado en la región');
    setTxt('#cp-fuga-pct', cp.porcentajeFugaSantiago || fFugaPct);
  }

  setTxt('#cp-live-time', 'Datos al día · ' + (list.length && list[0].fecha ? formatCPFecha(list[0].fecha) : ''));

  // 7. Corte de compras según selector de cantidad a desplegar
  const lim = selLimit === 'all' ? list.length : (parseInt(selLimit, 10) || 100);
  const desplegadas = list.slice(0, lim);

  const rows = desplegadas.map(c => {
    const isLocal = c.esLocal;
    const badge = isLocal
      ? '<span class="pill" style="background:var(--ok-soft);color:var(--ok);border:1px solid var(--ok);font-weight:600">Local (Araucanía)</span>'
      : '<span class="pill" style="background:var(--bad-soft);color:var(--bad);border:1px solid var(--bad);font-weight:600">Fuga a Santiago</span>';
    const tName = getTerrName(c.territorio || c.codTerritorio);
    const tColor = getTerrColor(c.territorio || c.codTerritorio);
    const montoM = c.montoCLP ? Math.round(c.montoCLP / 1000) : 0;
    const montoTxt = montoM ? '$' + NF0.format(montoM) + ' M$' : '–';
    return `<tr>
      <td class="m">${esc(formatCPFecha(c.fecha))}</td>
      <td class="m" style="color:var(--acc)">${esc(c.codigo || c.codigoOC || '')}</td>
      <td style="max-width:320px"><b style="font-weight:600">${esc(c.nombre || '')}</b><span class="sm">${esc(c.organismo || '')} (${esc(c.comuna || '')})</span></td>
      <td><span class="tchip" style="border-left:3px solid ${tColor};font-weight:600" title="${esc(tName)}">${esc(tName)}</span></td>
      <td style="max-width:260px"><span>${esc(c.proveedor || '')}</span><span class="sm">${esc(c.regionProveedor || '')}</span></td>
      <td style="text-align:center">${badge}</td>
      <td class="num" style="text-align:right;font-weight:600" title="$${NF0.format(c.montoCLP || 0)} CLP">${montoTxt}</td>
    </tr>`;
  }).join('');

  const th = (key, lab, r) => `<th class="${r ? 'r' : ''}">${key ? `<button type="button" data-cpsort="${key}"${CPF.sort === key ? ` aria-sort="${CPF.dir > 0 ? 'ascending' : 'descending'}"` : ''}>${lab}${CPF.sort === key ? (CPF.dir > 0 ? ' ↑' : ' ↓') : ''}</button>` : lab}</th>`;

  if (tbl) {
    tbl.innerHTML = `<table>
      <thead><tr>
        ${th('fecha', 'Fecha')}
        ${th('oc', 'Código OC')}
        ${th('nombre', 'Licitación / Compra')}
        ${th('terr', 'Territorio ERD 2040')}
        ${th('proveedor', 'Proveedor Adjudicado')}
        <th style="text-align:center">Retención Regional</th>
        ${th('monto', 'Monto (M$)', 1)}
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted)">Sin compras para los filtros seleccionados.</td></tr>'}</tbody>
    </table>`;

    $$('#compras-table th button[data-cpsort]').forEach(b => {
      b.addEventListener('click', () => {
        const k = b.dataset.cpsort;
        if (CPF.sort === k) CPF.dir *= -1;
        else { CPF.sort = k; CPF.dir = (k === 'monto' || k === 'fecha') ? -1 : 1; }
        renderCompras();
      });
    });
  }

  // 8. Barra resumen / paginación al pie de la tabla
  const pagerEl = $('#cp-pager');
  if (pagerEl) {
    if (list.length > lim) {
      pagerEl.innerHTML = `<span>Mostrando las primeras <b>${f0(desplegadas.length)}</b> de <b>${f0(list.length)}</b> compras filtradas.</span>` +
        `<span style="display:flex;gap:6px;align-items:center"><button class="btn" type="button" id="cp-show-all">Ver todas (${f0(list.length)})</button></span>`;
      const btnAll = $('#cp-show-all');
      if (btnAll) {
        btnAll.onclick = () => {
          if ($('#cp-filter-limit')) $('#cp-filter-limit').value = 'all';
          CPF.limit = 'all';
          renderCompras();
        };
      }
    } else {
      pagerEl.innerHTML = `<span>Mostrando <b>${f0(list.length)}</b> compras públicas${hasFilter ? ' con los filtros activos' : ''} (${f1(fTotal / 1e6)} MM$).</span>` +
        (list.length ? `<span class="note">Descarga el conjunto filtrado completo en CSV con el botón superior.</span>` : '');
    }
  }
}

window.applyLiveWorkspaceData = function(data) {
  if (!data) return;
  const dot = $('#live-sync-dot'), txt = $('#live-sync-text');
  if (dot) dot.style.background = 'var(--ok)';
  if (txt) txt.textContent = '🟢 Cartera e Indicadores Vivos (DIFOI)';

  if (Array.isArray(data.cartera) && data.cartera.length) {
    data.cartera.forEach(c => {
      const key = (c.codTerr || '') + '|' + (c.codCtci || '');
      const entry = CELL[key];
      if (entry) {
        entry.liveEstado = c.estadoGestion;
        entry.liveMonto = c.presupuestoEstimadoM;
        entry.liveResp = c.encargadoDifoi;
        entry.liveEjecutor = c.ejecutor;
        entry.liveFecha = c.fechaAct;
      }
    });
    if (UI.view === 'cartera') {
      renderKpis();
      if (UI.t != null && UI.L != null) renderFicha();
    }
  }

  if (data.comprasPublicas) {
    LIVE_COMPRAS = data.comprasPublicas;
    window.LIVE_COMPRAS = LIVE_COMPRAS;
    const count = LIVE_COMPRAS.totalRegistros || (LIVE_COMPRAS.ultimasCompras ? LIVE_COMPRAS.ultimasCompras.length : 0);
    const tabCp = $('#tab-cp-n');
    if (tabCp) tabCp.textContent = `${count} OCs`;
    if (UI.view === 'compras') renderCompras();
  }
  toast('Datos del radar actualizados');
};

async function syncRadarData() {
  const dot = $('#live-sync-dot'), txt = $('#live-sync-text');
  if (dot) dot.style.background = 'var(--sel)';
  if (txt) txt.textContent = 'Cargando datos del radar…';

  try {
    const jsonRes = await fetch('./datos_radar.json?_t=' + Date.now());
    if (jsonRes.ok) {
      const staticData = await jsonRes.json();
      if (staticData && (staticData.cartera || staticData.comprasPublicas)) {
        window.__LIVE_WORKSPACE_DATA__ = staticData;
        window.applyLiveWorkspaceData(staticData);
        if (dot) dot.style.background = 'var(--ok)';
        if (txt) txt.textContent = '🟢 Cartera e Indicadores FRPD';
        return;
      }
    }
    throw new Error('Formato de datos no reconocido');
  } catch (err) {
    console.warn('Carga de datos_radar.json no disponible:', err);
    if (!window.__LIVE_WORKSPACE_DATA__) {
      if (dot) dot.style.background = 'var(--muted)';
      if (txt) txt.textContent = '⚪ Modo local (Base de referencia)';
    }
  }
}
const syncLiveWorkspace = syncRadarData;

  update(false);
  setView(VIEWS.includes(h0) ? h0 : 'cartera');
  if ($('#live-sync-badge')) $('#live-sync-badge').addEventListener('click', syncLiveWorkspace);
  if ($('#cp-refresh')) $('#cp-refresh').addEventListener('click', syncLiveWorkspace);
  if ($('#cp-csv')) $('#cp-csv').addEventListener('click', exportComprasCSV);
  if ($('#cp-filter-terr')) $('#cp-filter-terr').addEventListener('change', renderCompras);
  if ($('#cp-filter-fecha')) $('#cp-filter-fecha').addEventListener('change', renderCompras);
  if ($('#cp-filter-ret')) $('#cp-filter-ret').addEventListener('change', renderCompras);
  if ($('#cp-filter-limit')) $('#cp-filter-limit').addEventListener('change', renderCompras);
  
  let cpQt;
  if ($('#cp-filter-q')) {
    $('#cp-filter-q').addEventListener('input', e => {
      clearTimeout(cpQt);
      cpQt = setTimeout(() => {
        CPF.q = e.target.value;
        renderCompras();
      }, 160);
    });
  }

  if ($('#cp-clear')) {
    $('#cp-clear').addEventListener('click', () => {
      CPF.q = '';
      CPF.terr = '';
      CPF.fecha = '';
      CPF.ret = '';
      CPF.limit = '100';
      if ($('#cp-filter-q')) $('#cp-filter-q').value = '';
      if ($('#cp-filter-terr')) $('#cp-filter-terr').value = '';
      if ($('#cp-filter-fecha')) $('#cp-filter-fecha').value = '';
      if ($('#cp-filter-ret')) $('#cp-filter-ret').value = '';
      if ($('#cp-filter-limit')) $('#cp-filter-limit').value = '100';
      renderCompras();
    });
  }
  
  if (window.__LIVE_WORKSPACE_DATA__) {
    window.applyLiveWorkspaceData(window.__LIVE_WORKSPACE_DATA__);
  } else {
    syncLiveWorkspace();
  }

if (HAS_CLAUDE) {
  window.claude.use('downloads').then(d => { DL = d; if (d) { $('#hb-csv').hidden = false; $('#exe-csv').hidden = false; $('#bx-csv').hidden = false; $('#ev-csv').hidden = false; $('#tb-csv').hidden = false; $('#cp-csv').hidden = false; const b = $('#fi-csv'); if (b && FICHA && FICHA.firms.length) { b.hidden = false; b.onclick = exportFirms; } const b2 = $('#fi-fcsv'); if (b2 && FICHA && FICHA.fin && FICHA.fin.length) { b2.hidden = false; b2.onclick = exportFin; } } }).catch(() => {});
  window.claude.use('sample').then(s => { SAMPLE = s || null; wireClaude(); }).catch(() => { SAMPLE = null; wireClaude(); });
}
})();
