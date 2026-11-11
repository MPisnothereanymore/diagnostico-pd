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

async function loadPack(id = 'pack') {
  const b64 = document.getElementById(id).textContent.trim();
  const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  if (!('DecompressionStream' in window)) throw new Error('este navegador no puede descomprimir los datos; usa una versión reciente de Chrome, Edge, Firefox o Safari');
  const stream = new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(stream).text());
}
let D;
try { D = await loadPack(); } catch (e) { $('#loading').textContent = 'No se pudieron cargar los datos: ' + e.message; return; }
// obras georreferenciadas de Geo-CGR (opcional: el tablero funciona sin ellas)
let OB = null;
try { if (document.getElementById('obras')) OB = await loadPack('obras'); } catch (e) { console.warn('Obras Geo-CGR no disponibles:', e); }
// matriz estratégica art. 8 × ERD/PRFP para la pestaña Formular (opcional)
let MX = null;
try { if (document.getElementById('matriz')) MX = await loadPack('matriz'); } catch (e) { console.warn('Matriz estratégica no disponible:', e); }

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
const lqN = (t, L) => (tN[t] && rN[L] ? (cN[t][L] / tN[t]) / (rN[L] / NSEL) : NaN);
const LQ0 = Array.from({ length: NT }, (_, t) => Array.from({ length: NL }, (_, L) => lqN(t, L)));   // cociente con todas las empresas (Cartera)
// base sin filtros de empresas: Territorios no cambia con la barra de filtros
const SII0 = { tN: [...tN], tT: [...tT], tTpub: [...tTpub], T10: [...T10], sales: [...TSALES], totT, comN: [...comN], comLN: comLN.map(x => [...x]), rN: [...rN] };
const lqCom0 = (c, L) => (SII0.comN[c] && SII0.rN[L] ? (SII0.comLN[c][L] / SII0.comN[c]) / (SII0.rN[L] / N) : NaN);
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
  { k: 'genpot', g: 'ag', l: 'Capacidad instalada de generación eléctrica', u: 'MW · CNE / Coordinador Eléctrico', f: f1, v: cs => cxS('gen_pot', cs), sum: 1 },
  { k: 'geneol', g: 'ag', l: 'Generación eólica instalada', u: 'MW · CNE / Coordinador Eléctrico', f: f1, v: cs => cxS('gen_eol', cs), sum: 1 },
  { k: 'genhid', g: 'ag', l: 'Generación hidroeléctrica instalada', u: 'MW · CNE / Coordinador Eléctrico', f: f1, v: cs => cxS('gen_hid', cs), sum: 1 },
  { k: 'geninj', g: 'ag', l: 'Inyección estimada al SEN', u: 'GWh/año · CNE / Coordinador Eléctrico', f: f1, v: cs => cxS('gen_inj', cs), sum: 1 },
  { k: 'incp', g: 'ri', l: 'Superficie afectada por incendios forestales', u: '% de la superficie comunal · 2024-25 · CONAF', bad: 'high', f: v => pc(v, 2), v: cs => cxS('incha', cs) / (cs.reduce((a, c) => a + KM2(c), 0) * 100) },
  { k: 'incha', g: 'ri', l: 'Hectáreas afectadas por incendios forestales', u: 'ha · 2024-25 · CONAF', f: f0, v: cs => cxS('incha', cs), sum: 1 },
  { k: 'incn', g: 'ri', l: 'Incendios forestales', u: 'N° · 2024-25 · CONAF', f: f0, v: cs => cxS('incn', cs), sum: 1 },
  { k: 'inu', g: 'ri', l: 'Zonas de amenaza de inundación o anegamiento', u: 'km² · PROT, cobertura parcial', f: f1, v: cs => cxS('inu', cs), sum: 1 },
  { k: 'upa', g: 'agro', l: 'Unidades productivas agropecuarias (UPA)', u: 'N° · CAF 2021', f: f0, v: cs => cxS('caf_upa', cs), sum: 1 },
  { k: 'upaa', g: 'agro', l: 'UPA de autoconsumo', u: '% de las UPA · CAF 2021', bad: 'high', f: pc1, v: cs => cxS('caf_upaa', cs) / cxS('caf_upa', cs) },
  { k: 'rie', g: 'agro', l: 'Superficie cultivada con riego', u: '% · CAF 2021', bad: 'low', f: pc1, v: cs => cxS('caf_rie', cs) / (cxS('caf_rie', cs) + cxS('caf_sec', cs)) },
  { k: 'cul', g: 'agro', l: 'Cultivos anuales, frutales y forrajeras', u: 'ha · CAF 2021', f: f0, v: cs => CULT.reduce((a, k) => a + cxS(k, cs), 0), sum: 1 },
  { k: 'bov', g: 'agro', l: 'Existencias de bovinos (total)', u: 'cabezas · CAF 2021 / ODEPA', f: f0, v: cs => cxS('caf_bov', cs), sum: 1 },
  { k: 'bovc', g: 'agro', l: 'Bovinos cárnicos', u: 'cabezas · CAF 2021 / ODEPA', f: f0, v: cs => cxS('caf_bovc', cs), sum: 1 },
  { k: 'bovl', g: 'agro', l: 'Bovinos lácteos / doble propósito', u: 'cabezas · CAF 2021 / ODEPA', f: f0, v: cs => cxS('caf_bovl', cs), sum: 1 },
  { k: 'ovi', g: 'agro', l: 'Existencias de ovinos', u: 'cabezas · CAF 2021 / ODEPA', f: f0, v: cs => cxS('caf_ovi', cs), sum: 1 },
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
  L2: ['bn', 'pla', 'incp', 'cind', 'upa', 'bov'],
  L3: ['upa', 'upaa', 'rie', 'pnt', 'ia', 'bov', 'ovi', 'pra'],
  L4: ['genpot', 'geneol', 'genhid', 'geninj', 'gdc', 'pin', 'rur'],
  L5: ['pla', 'incp', 'upa', 'bov', 'pinv'],
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
const UI = { view: 'cartera', t: TIDX.VCE, L: LIDX.L3, line: null, fOpen: false,
  ter: TIDX.VCE, mInd: 'ter', mLin: LIDX.L3, layers: new Set(['tl']), hbScope: 'ter', hbSort: 'bre', hbDir: -1 };
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
const VIEWS = ['cartera', 'bip', 'territorios', 'empresas', 'evid', 'formular', 'marco'];
const FIRMV = new Set(['empresas']);   // la barra de filtros de empresas solo se muestra en Empresas
const rendered = {};
function setView(v) {
  if (TR_RET && v !== (TR_RET.kind === 'bip' ? 'bip' : 'cartera')) TR_RET = null;
  UI.view = v;
  VIEWS.forEach(k => { const tb = $('#tab-' + k); tb.setAttribute('aria-selected', String(k === v)); tb.tabIndex = k === v ? 0 : -1; $('#v-' + k).hidden = k !== v; });
  $('#work').classList.toggle('norail', !FIRMV.has(v));
  $('#rail').classList.remove('open');
  hideTip();
  if (v === 'cartera') { renderCartera(DIRTY.cartera); DIRTY.cartera = false; }
  if (v === 'territorios') { renderTerritorios(); DIRTY.territorios = false; }
  if (v === 'empresas') renderEmpresas();
  if (v === 'marco' && !rendered.marco) { renderMarco(); rendered.marco = true; }
  if (v === 'formular') renderFormular();
  if (v === 'bip') renderBip();
  if (v === 'evid') renderEvid();
  try { history.replaceState(null, '', '#' + v); } catch (_) {}
}
VIEWS.forEach(k => $('#tab-' + k).addEventListener('click', () => setView(k)));
$('.tabs').addEventListener('keydown', e => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const i = VIEWS.indexOf(UI.view), j = (i + (e.key === 'ArrowRight' ? 1 : -1) + VIEWS.length) % VIEWS.length;
  setView(VIEWS[j]); $('#tab-' + VIEWS[j]).focus();
});

// ================= CARTERA =================
// Tres preguntas, en orden: cuánto hay y qué tan listo está, qué líneas tienen la evidencia levantada y dónde falta.
// Los filtros de empresas no cambian esta pestaña (usa LQ0); sí cambian las cifras de empresas de la ficha.
const FRPD_2026 = 21111;   // MM$ · Ley 21.796, total FRPD La Araucanía 2026 (confirmado por DIFOI el 14-oct-2026)
const MADS = { 3: 'levantada', 2: 'parcial', 1: 'por levantar' };
const TSHORT = { TPLC: 'Temuco–PLC', VCE: 'Valle Central', CSU: 'Cautín Sur', MNO: 'Malleco Norte', NAH: 'Nahuelbuta', COS: 'Costa', AND: 'Andina', LAC: 'Lacustre' };
const CT_L2CH = { L3: 'agro', L4: 'ene', L5: 'circ', L6: 'ebtc' };   // lineamiento -> cadena con que abre Formular; L1 y L2 no tienen cadena equivalente
const CT_MORE = new Set();
const mDots = m => `<span class="dots" aria-hidden="true">${[1, 2, 3].map(i => `<i class="${i <= m ? 'on' : ''}"></i>`).join('')}</span>`;
const cellList = () => { const o = []; for (let t = 0; t < NT; t++) for (let L = 0; L < NL; L++) o.push({ t, L }); return o; };
const lq2 = v => Math.round(v * 100) / 100;   // el cociente tal como se muestra, para que la regla no contradiga la cifra
const lqBand = v => (lq2(v) >= 1.1 ? 'sobre el' : lq2(v) >= 0.9 ? 'similar al' : 'bajo el');
const cellEmpty = (t, L) => !CELL[TER[t].k + '|' + LIN[L].k];
const cellGap = (t, L) => cellEmpty(t, L) && lq2(LQ0[t][L]) >= 1.1;
const lineEnts = ln => ENT.filter(e => e.l === ln.k);
const lineIsInv = ln => ln.a8.length > 0 || ln.g.length > 0;   // sin ítems ni gastos del art. 8 es un encargo de levantamiento
const listY = a => (a.length > 1 ? a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1] : a[0] || '');
// la minuta prevé la línea para más (u otros) territorios que los de sus entradas: se avisa en la fila
const scopeDiff = (ln, es) => { if (ln.terr === 'REGIONAL') return false; const want = ln.terr === 'TODOS' ? TER.map(x => x.k) : ln.terr.split(','), have = new Set(es.map(e => e.t)); return !es.length || want.length !== have.size || want.some(k => !have.has(k)); };
const lineScope = ln => (ln.terr === 'REGIONAL' ? 'alcance regional' : ln.terr === 'TODOS' ? 'todos los territorios' : listY(ln.terr.split(',').map(k => TER[TIDX[k]].n)));
// 0: evidencia levantada en todas sus entradas · 1: en algunas · 2: en ninguna. Sin entradas, manda la madurez de la línea en la minuta.
function lineState(ln) {
  const es = lineEnts(ln);
  if (!es.length) return parseInt(ln.mad, 10) >= 3 ? 0 : 2;
  const n3 = es.filter(e => e.m === 3).length;
  return n3 === es.length ? 0 : n3 ? 1 : 2;
}
const CT_GRP = [
  ['Evidencia levantada en todas sus entradas', 'Lo más cercano a formular. Antes, revisa que las entradas cubran los territorios que la minuta prevé para la línea.'],
  ['Evidencia levantada en algunas entradas', 'Se puede partir por los territorios con evidencia levantada y completar el resto.'],
  ['Sin evidencia levantada todavía', 'Falta levantar o completar la evidencia antes de formular.'],
];
function renderCtSum() {
  const m = { 1: 0, 2: 0, 3: 0 }; ENT.forEach(e => { m[e.m]++; });
  const ct = ENT.filter(e => isCTCI(LINE[e.l])).length, emp = cellList().filter(x => cellEmpty(x.t, x.L)).length, gaps = cellList().filter(x => cellGap(x.t, x.L)).length;
  const inv = LINES.filter(lineIsInv).length, enc = LINES.length - inv;
  const seg = k => (m[k] ? `<span class="m${k}" style="flex:${m[k]}"><b>${m[k]}</b><em>${MADS[k]}</em></span>` : '');
  $('#ct-sum').innerHTML = `<div class="ct-s1"><p class="ct-lead"><b>${f0(inv)}</b> líneas de inversión${enc ? ` y <b>${f0(enc)}</b> ${enc === 1 ? 'encargo' : 'encargos'} de levantamiento` : ''} · <b>${f0(ENT.length)}</b> entradas</p>
      <div class="ct-bar" role="img" aria-label="Entradas según su evidencia: ${m[3]} levantada, ${m[2]} parcial y ${m[1]} por levantar">${seg(3)}${seg(2)}${seg(1)}</div>
      <p class="ct-barleg" aria-hidden="true">${[3, 2, 1].map(k => `<span class="m${k}"><i></i>${m[k]} ${MADS[k]}</span>`).join('')}</p>
      <p class="note">Una entrada es una línea aplicada a un territorio. La barra las cuenta según la madurez de su evidencia en la minuta DIFOI (sept. 2026).</p></div>
    <ul class="ct-facts">
      <li><b>${f0(ct)} de ${f0(ENT.length)}</b> entradas tienen al menos un componente de investigación (N°3 del art. 8), que puede contar para el mínimo de 25% del art. 7. Cuánto cubren se sabrá cuando haya montos.</li>
      <li>FRPD 2026: <b>${f0(FRPD_2026)} MM$</b> (Ley 21.796); ese mínimo equivale a unos ${f0(FRPD_2026 * 0.25)} MM$. La cartera todavía no tiene montos por línea.</li>
      <li><b>${f0(emp)}</b> combinaciones de territorio y lineamiento no tienen entrada; en <b>${f0(gaps)}</b> la base empresarial está sobre el promedio regional. <button type="button" class="linkbtn" id="ct-go-gap">Ver dónde falta</button></li>
    </ul>`;
  $('#ct-go-gap').addEventListener('click', () => { const h = $('#ct-gap-h'); $('#ct-gap').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' }); h.focus({ preventScroll: true }); });
}
function renderBoard() {
  const grp = [[], [], []]; LINES.forEach(ln => grp[lineState(ln)].push(ln));
  const share = ln => { const es = lineEnts(ln); return es.length ? es.filter(e => e.m === 3).length / es.length : 0; };
  grp.forEach(g => g.sort((a, b) => share(b) - share(a) || a.k.localeCompare(b.k)));
  const row = (ln, j) => {
    const es = lineEnts(ln).sort((a, b) => b.m - a.m || TIDX[a.t] - TIDX[b.t]), more = CT_MORE.has(ln.k);
    const lin = ln.ctci.filter(k => LSHORT[k]).map(k => `${k} ${LSHORT[k]}`).join(' · ') || 'Transversal';
    return `<div class="ct-row${UI.fOpen && UI.line === ln.k ? ' on' : ''}" data-line="${ln.k}">
      <span class="code">${ln.k}</span>
      <div class="ct-rn"><h4>${esc(ln.n)}</h4><p class="ct-meta">${esc(lin)}${lineIsInv(ln) ? '' : ' · encargo de levantamiento'}${isCTCI(ln) ? '' : ' · <span title="Sin ítems ni tipos de gasto del N°3 del art. 8: no cuenta para el mínimo de 25%">sin componente N°3</span>'}${ln.terr === 'REGIONAL' && !es.length ? ' · alcance regional' : ''}${scopeDiff(ln, es) ? ` · <span class="warnmk">la minuta la prevé para ${esc(lineScope(ln))}</span>` : ''}</p></div>
      <div class="ct-ter">${es.length ? es.map(e => `<button type="button" class="ct-t${UI.fOpen && UI.t === TIDX[e.t] && UI.L === LIDX[e.c] ? ' on' : ''}" data-t="${TIDX[e.t]}" data-l="${LIDX[e.c]}" aria-label="${ln.k} ${esc(ln.n)}, ${esc(TER[TIDX[e.t]].n)}: evidencia ${MADS[e.m]}. Abrir ficha" title="${esc(TER[TIDX[e.t]].n)} · ${e.c} · evidencia ${MADS[e.m]}">${mDots(e.m)}${TSHORT[e.t]}<span aria-hidden="true">›</span></button>`).join('')
        : `<p class="ct-meta">Sin entradas territoriales. Ubicada según la madurez de la línea en la minuta: ${esc(ln.mad)} de 3.</p>`}</div>
      <div class="ct-ra">${j === 0 ? `<button type="button" class="btn sm" data-fml="${ln.k}">Formular</button>` : ''}<button type="button" class="linkbtn" data-more="${ln.k}" aria-expanded="${more}">Qué financia</button></div>
      ${more ? `<div class="ct-rm"><p>${esc(ln.que)}</p><p><b>Evidencia de la minuta.</b> ${esc(ln.ev)}</p></div>` : ''}</div>`;
  };
  $('#ct-board').innerHTML = grp.map((ls, j) => `<section class="ct-grp" aria-label="${CT_GRP[j][0]}"><div class="ct-gh"><h3>${CT_GRP[j][0]} <span>${pl(ls.length, 'línea', 'líneas')}</span></h3><p>${CT_GRP[j][1]}</p></div>${ls.map(ln => row(ln, j)).join('') || '<p class="note">Ninguna línea en este grupo.</p>'}</section>`).join('');
}
function renderMatrix() {
  let h = '<div class="rh"></div>' + LIN.map(l => `<div class="ch" title="${esc(l.n)}"><b>${l.k}</b><span>${esc(LSHORT[l.k])}</span></div>`).join('');
  for (let t = 0; t < NT; t++) {
    const T = TER[t];
    h += `<div class="rh"><b>${esc(T.n)}</b></div>`;
    for (let L = 0; L < NL; L++) {
      const e = CELL[T.k + '|' + LIN[L].k], gap = cellGap(t, L), on = UI.fOpen && UI.t === t && UI.L === L, v = f2(LQ0[t][L]);
      const lab = e ? `${e.l} ${LINE[e.l].n}: evidencia ${MADS[e.m]}` : `sin entrada; cociente ${v}, base empresarial ${lqBand(LQ0[t][L])} promedio regional`;
      h += `<button type="button" class="cell ${e ? 'has' : gap ? 'gap' : 'empty'}${on ? ' on' : ''}" data-t="${t}" data-l="${L}" title="${esc(lab)}" aria-label="${esc(T.n)}, ${LIN[L].k} ${esc(LSHORT[LIN[L].k])}: ${esc(lab)}. Abrir ficha">${e ? mDots(e.m) : `<span class="v">${v}</span>`}</button>`;
    }
  }
  $('#mx').innerHTML = h;
  $('#mx-leg').innerHTML = `<span class="k">${mDots(3)}evidencia levantada</span><span class="k">${mDots(2)}parcial</span><span class="k">${mDots(1)}por levantar</span><span class="k"><i class="empty">1,00</i>sin entrada: se muestra el cociente de localización</span><span class="k"><i class="gap">1,10</i>sin entrada y con cociente de 1,10 o más</span>`;
  const emp = cellList().filter(x => cellEmpty(x.t, x.L)).sort((a, b) => LQ0[b.t][b.L] - LQ0[a.t][a.L]);
  $('#ct-opp').innerHTML = `<h3 class="lbl">Combinaciones sin entrada · ${emp.length}</h3>` + (emp.length ? `<ul class="ct-ol">${emp.map(x => `<li class="${cellGap(x.t, x.L) ? 'gap' : ''}"><div><b>${esc(TER[x.t].n)} · ${LIN[x.L].k} ${esc(LSHORT[LIN[x.L].k])}</b>
      <span class="sm">Cociente ${f2(LQ0[x.t][x.L])}: base empresarial ${lqBand(LQ0[x.t][x.L])} promedio regional</span></div>
      <div class="ct-ob"><button type="button" class="btn sm" data-t="${x.t}" data-l="${x.L}">Ver ficha</button><button type="button" class="btn sm" data-fm="${x.t},${x.L}">Formular</button></div></li>`).join('')}</ul>` : '<p class="note">Todas las combinaciones tienen entrada.</p>')
    + '<p class="note">El cociente de localización compara el peso del lineamiento en las empresas del territorio con su peso en la región (1,00 = igual; SII 2024). La asignación de subrubros a lineamientos es un supuesto provisional. Una combinación sin entrada no es una brecha por sí sola: revisa su ficha.</p>';
}
// Formular desde la cartera: lleva el territorio, la línea y sus ítems del art. 8. La cadena solo se fija si el lineamiento tiene una equivalente.
function ctFormular(t, L, line, org) {
  const back = { sy: scrollY, ficha: UI.fOpen, fiFrom: FI_FROM, sel: null, ...org };
  closeFicha(true);
  const j = L == null ? -1 : STRAT_CHAINS.findIndex(c => c.id === CT_L2CH[LIN[L].k]);
  fmOpen(t, j, { t, L, line: line || null, ch: j >= 0, back, noEnt: !!(org && org.noEnt) });
}
function ctFormularLine(k) {
  const ln = LINE[k], e = lineEnts(ln).sort((a, b) => b.m - a.m)[0];
  const t = e ? TIDX[e.t] : TIDX[ln.terr.split(',')[0]] ?? FMU.t, L = e ? LIDX[e.c] : LIDX[ln.ctci.find(c => LSHORT[c])] ?? null;
  ctFormular(t, L, k, { sel: `#ct-board button[data-fml="${k}"]`, ficha: false, noEnt: !e });
}
// vuelve desde Formular al punto de partida: misma altura de página, mismo botón y la ficha solo si se salió desde ella
function ctBack(fr) {
  const bk = fr.back || {};
  setView('cartera');
  if (bk.ficha && fr.L != null) openFicha(fr.t, fr.L, bk.fiFrom);
  window.scrollTo(0, bk.sy || 0);
  const el = !bk.ficha && bk.sel && $(bk.sel); if (el) el.focus({ preventScroll: true });
}
// ficha lateral: se abre al elegir un territorio o una celda y no ocupa espacio mientras está cerrada
let FI_FROM = null;
const fiWide = () => innerWidth >= 1280;   // con pantalla ancha el contenido se reacomoda y la ficha no tapa nada
function openFicha(t, L, from, top0) {
  const e = CELL[TER[t].k + '|' + LIN[L].k];
  UI.t = t; UI.L = L; UI.ter = t; UI.line = e ? e.l : null; UI.fOpen = true; FI_FROM = from || null;
  $('#v-cartera').classList.add('fopen');
  renderBoard(); renderMatrix(); renderFicha();
  const f = $('#ficha'); f.hidden = false; f.scrollTop = 0; f.focus({ preventScroll: true });
  const b = FI_FROM && $(`${FI_FROM} [data-t="${t}"][data-l="${L}"]`);
  if (b && top0 != null) scrollBy(0, b.getBoundingClientRect().top - top0); else if (b && fiWide()) b.scrollIntoView({ block: 'nearest' });
}
function closeFicha(quiet) {
  if (!UI.fOpen) return;
  if (TR_RET && TR_RET.kind === 'ficha') TR_RET = null;
  const sel = FI_FROM && `${FI_FROM} [data-t="${UI.t}"][data-l="${UI.L}"]`, b0 = sel && $(sel), top0 = b0 ? b0.getBoundingClientRect().top : null;
  UI.fOpen = false; $('#ficha').hidden = true; $('#v-cartera').classList.remove('fopen'); renderBoard(); renderMatrix();
  const b = sel && $(sel); if (!b) return;
  if (top0 != null) scrollBy(0, b.getBoundingClientRect().top - top0);
  if (!quiet) b.focus({ preventScroll: true });
}
$('#v-cartera').addEventListener('click', ev => {
  if (ev.target.closest('#ficha')) return;
  const fm = ev.target.closest('button[data-fm]'), fl = ev.target.closest('button[data-fml]'), mo = ev.target.closest('button[data-more]'), b = ev.target.closest('button[data-t][data-l]');
  if (fm) { const [t, L] = fm.dataset.fm.split(',').map(Number); ctFormular(t, L, null, { sel: `#ct-opp button[data-fm="${t},${L}"]`, ficha: false }); }
  else if (fl) ctFormularLine(fl.dataset.fml);
  else if (mo) { const k = mo.dataset.more; if (CT_MORE.has(k)) CT_MORE.delete(k); else CT_MORE.add(k); renderBoard(); const n = $(`#ct-board button[data-more="${k}"]`); if (n) n.focus({ preventScroll: true }); }
  else if (b) openFicha(+b.dataset.t, +b.dataset.l, '#' + b.closest('#ct-board, #mx, #ct-opp').id, b.getBoundingClientRect().top);
});
// en pantallas angostas la ficha tapa el contenido: un clic fuera de ella (que no sea en un botón) la cierra
document.addEventListener('click', ev => { if (UI.fOpen && UI.view === 'cartera' && !fiWide() && !ev.target.closest('#ficha') && !ev.target.closest('button')) closeFicha(); });
document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && UI.view === 'cartera' && UI.fOpen) closeFicha(); });

// --- ficha
let FICHA = null; // contexto de la celda abierta
const FI_OPEN = new Set(), FI_KEEP = /^(Entrada de la cartera|Sin entrada en la cartera|Encaje en el D\.S\. 1\.699)/;
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
  let h = `<div class="fi-h"><div style="flex:1;min-width:0"><div class="eyebrow">Ficha · territorio × lineamiento</div><h2 id="fi-title">${esc(T.n)} · ${Lk} ${esc(LSHORT[Lk])}</h2><p class="note" style="margin-top:4px">${esc(LIN[L].n)}</p></div><div class="loc">${locator(t)}</div><button type="button" class="btn sm" id="fi-x">Cerrar</button></div>`;
  if (e) {
    h += `<div class="fi-sec"><h3>Entrada de la cartera</h3><div class="line-t"><span class="code">${ln.k}</span><b>${esc(ln.n)}</b></div>
      <div class="pills"><span class="pill">Bloque ${ln.b} · ${esc(BLOQ[ln.b])}</span><span class="mad"><span class="dots">${[1, 2, 3].map(i => `<i class="${i <= e.m ? 'on' : ''}"></i>`).join('')}</span>Madurez ${e.m}: ${esc(MADT[e.m].toLowerCase())}</span></div>
      <p><strong>Qué financia.</strong> ${esc(ln.que)}</p><p><strong>Evidencia de la minuta.</strong> ${esc(ln.ev)}</p><div class="ctrls"><button class="btn pri" type="button" id="fi-fm">Formular en este territorio</button></div></div>`;
    const ct = isCTCI(ln);
    h += `<div class="fi-sec"><h3>Encaje en el D.S. 1.699</h3><div class="pills">${ct ? '<span class="pill ct">Tiene componente N°3: puede contar para el mínimo de 25% (art. 7)</span>' : '<span class="pill">Sin componente N°3: no cuenta para el mínimo de 25%</span>'}</div>
      <div class="hab" style="grid-template-columns:auto minmax(0,1fr)">${ln.a8.map(k => `<span class="x" style="text-align:left;color:var(--acc)">${k}</span><span class="n">${esc(A8[k].n)}</span>`).join('')}${ln.g.map(k => `<span class="x" style="text-align:left;color:var(--acc)">gasto ${k}</span><span class="n">${esc(GASTO[k])}</span>`).join('')}</div>
      ${!ln.a8.length && !ln.g.length ? '<p class="note">La minuta no asigna categoría del art. 8: es un encargo de levantamiento.</p>' : ''}</div>`;
  } else {
    h += `<div class="fi-sec"><h3>Sin entrada en la cartera</h3><p>La cartera no tiene entrada para esta combinación. La base empresarial del territorio en el lineamiento ${lq2(LQ0[t][L]) >= 0.9 && lq2(LQ0[t][L]) < 1.1 ? 'es' : 'está'} <strong>${lqBand(LQ0[t][L])} promedio regional</strong> (cociente ${f2(LQ0[t][L])} con todas las empresas; 1,00 = igual a la región).</p>
      ${others.length ? `<p>Líneas de ${Lk} en otros territorios: ${others.map(l => `<button type="button" class="linkbtn" data-line="${l.k}">${l.k}</button> ${esc(l.n)}`).join(' · ')}.</p>` : ''}<div class="ctrls"><button class="btn pri" type="button" id="fi-fm">Formular aquí</button></div></div>`;
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
    const bovT = cxS('caf_bov', T.c), oviT = cxS('caf_ovi', T.c);
    h += top.length ? `<p class="note" style="margin-top:4px"><strong style="color:var(--ink)">Principales cultivos y plantaciones (CAF 2021):</strong> ${top.map(([n, v, r]) => `${esc(n)} ${f0(v)} ha (${pc(v / r, 0)} de la región)`).join(' · ')}.</p>` : '';
    h += `<p class="note" style="margin-top:2px"><strong style="color:var(--ink)">Existencias ganaderas:</strong> ${f0(bovT)} bovinos (${pc(bovT / EVREG.bov, 0)} de la región) · ${f0(oviT)} ovinos (${pc(oviT / EVREG.ovi, 0)} de la región).</p>`;
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
  if (SAMPLE !== null) h += `<div class="fi-sec"><div class="claude"><div class="hd"><div><b style="font-size:14px">Perfil de iniciativa con Claude</b><p class="note">Borrador con los datos de esta ficha: problema, objetivo, encaje normativo, población objetivo y vacíos de información.</p></div>
    <div class="ctrls"><button class="btn warm" type="button" id="cl-go">Redactar borrador</button><button class="btn" type="button" id="cl-stop" hidden>Detener</button><button class="btn" type="button" id="cl-copy" hidden>Copiar</button></div></div>
    <p class="note" id="cl-status"></p><div class="draft" id="cl-out" hidden></div></div></div>`;
  $('#ficha').innerHTML = h;
  if (TR_RET && TR_RET.kind === 'ficha') {
    $('#ficha .fi-h').insertAdjacentHTML('afterend', `<div class="fm-from" id="fi-from">${trFromHtml(TR_RET, 'fi-back', 'fi-fromx')}</div>`);
    $('#fi-back').addEventListener('click', trReturn); $('#fi-fromx').addEventListener('click', () => { TR_RET = null; $('#fi-from').remove(); $('#ficha').focus({ preventScroll: true }); });
  }
  // lo esencial queda a la vista; el resto de las secciones se pliega y recuerda si quedó abierta
  $$('#ficha .fi-sec').forEach(s => {
    const h3 = s.querySelector(':scope > h3'); if (!h3 || FI_KEEP.test(h3.textContent)) return;
    const k = h3.textContent.split(' · ')[0], d = document.createElement('details'), sm = document.createElement('summary'), body = document.createElement('div');
    d.className = 'fi-sec'; d.dataset.k = k; d.open = FI_OPEN.has(k); sm.appendChild(h3); while (s.firstChild) body.appendChild(s.firstChild); d.append(sm, body); s.replaceWith(d);
    d.addEventListener('toggle', () => { if (d.open) FI_OPEN.add(k); else FI_OPEN.delete(k); });
  });
  const secOf = k => $$('#ficha details.fi-sec').find(d => d.dataset.k === k);
  const empS = secOf('Base empresarial');
  if (empS) {
    empS.querySelector('summary h3').textContent = 'Empresas del territorio · SII 2024';
    for (const k of ['Empresas objetivo', 'Oferta de conocimiento']) { const d = secOf(k); if (!d) continue; const lb = document.createElement('h4'); lb.className = 'lbl fi-sub'; lb.textContent = d.querySelector('summary h3').textContent; const body = d.querySelector(':scope > div'); empS.querySelector(':scope > div').append(lb, ...body.childNodes); d.remove(); }
  }
  $('#fi-x').addEventListener('click', () => closeFicha());
  $('#fi-fm').addEventListener('click', () => ctFormular(t, L, e ? e.l : null));
  $$('#ficha [data-line]').forEach(b => b.addEventListener('click', () => selectLine(b.dataset.line)));
  $('#fi-bip').addEventListener('click', () => openBip({ t, L, cat: 'frpd' }));
  $('#fi-ev').addEventListener('click', () => openEvid({ t, g: EVL[Lk].map(k => EVK[k].g)[0] }));
  $('#fi-of').addEventListener('click', () => openEmpresas({ ter: t, ctci: true }));
  $('#fi-emp').addEventListener('click', () => openEmpresas({ ter: t, lin: L }));
  if (DL) { $('#fi-csv').hidden = !firms.length; $('#fi-csv').addEventListener('click', exportFirms); $('#fi-fcsv').hidden = !FICHA.fin.length; $('#fi-fcsv').addEventListener('click', exportFin); }
  wireClaude();
}

// abre la ficha en la primera entrada de una línea
function selectLine(k) { const e = ENT.find(x => x.l === k); if (e) openFicha(TIDX[e.t], LIDX[e.c], '#ct-board'); }
function renderCartera(withFicha) {
  renderCtSum(); renderBoard(); renderMatrix();
  if (UI.fOpen && withFicha) renderFicha();
}

// ================= INSTRUMENTOS DE PLANIFICACIÓN POR COMUNA (datos) =================
// Catastro cargado a mano, sin fuente verificable en el radar salvo el estado «con o sin plan regulador» (ERD 2040, Tabla 14).
// Los campos frpd* y obs no se muestran: son una calificación sin método ni fuente.
const PRC_L = { vigente: 'Vigente', modificacion: 'Vigente, en modificación', formulacion: 'Sin plan, en formulación', limite: 'Sin plan, solo límite urbano', sin: 'Sin plan ni límite urbano' };
const IPT_DATA = [
  { c: 0, com: 'Carahue', ti: 5, terr: 'Costa Araucanía', est: 'vigente', estLbl: 'PRC Vigente', cls: 'vig', color: '#5CBF8A', val: 4, prcAno: 'D.O. 1989', prcDet: 'D.O. 1989 (Mod. 2010; Carahue y Trovolhue)', limAno: '1989', pri: '–', zoit: '–', reg: 'ZUBC Borde Costero · Rezago Costa', rez: true, zubc: true, pladEst: 'vigente', pladLbl: 'Vigente', pladCls: 'vig', pladPer: '2022–2026', pladCol: '#5CBF8A', grdEmerg: 'aprobado', grdEmergLbl: 'Aprobado', grdEmergCls: 'ok', grdRrd: 'aprobado', grdRrdLbl: 'Aprobado', grdRrdCls: 'ok', grdCol: '#5CBF8A', threats: ['water', 'fire'], threatStr: 'Tsunami / Inundación Imperial · Incendios', pladetEst: 'formulacion', pladetLbl: 'En Formulación', pladetCls: 'form', pladetDet: 'Ruta Fluvial Carahue Navegable y humedales', pladetCol: '#5598E7', pacccEst: 'elaboracion', pacccLbl: 'En Elaboración', pacccCls: 'elab', pacccDet: 'En formulación financiamiento FNDR', pacccCol: '#5598E7', adi: '–', adiNom: '–', adiCol: '#354856', descont: '–', descontDet: '–', descontCol: '#354856', frpdNivel: 'Medio-alto', frpdCls: 'medio-alto', frpdVal: 3, frpdCol: '#5598E7', frpdFund: 'PRC consolidado, ZUBC litoral, Rezago Costa y PLADETUR fluvial en curso', obs: 'Zonificación urbana consolidada y ZUBC costera D.S. 475/1994. En formulación de PLADETUR (turismo fluvial río Imperial) y PACCC; rezago Costa y riesgo tsunami/inundación.' },
  { c: 1, com: 'Cholchol', ti: 4, terr: 'Nahuelbuta', est: 'sin', estLbl: 'Sin Instrumento', cls: 'sin', color: '#E07A6B', val: 0, prcAno: 'Sin PRC', prcDet: 'Sin Plan Regulador Comunal ni Límite propio', limAno: '–', pri: '–', zoit: '–', reg: 'Zona de Rezago Nahuelbuta', rez: true, zubc: false, pladEst: 'vencido', pladLbl: 'Vencido', pladCls: 'ven', pladPer: 'Vencido (previo)', pladCol: '#E07A6B', grdEmerg: 'tramite', grdEmergLbl: 'En Trámite', grdEmergCls: 'act', grdRrd: 'pendiente', grdRrdLbl: 'Pendiente', grdRrdCls: 'pend', grdCol: '#E07A6B', threats: ['fire', 'dry'], threatStr: 'Incendios interfaz · Déficit hídrico severo', pladetEst: 'sin', pladetLbl: 'Sin PLADETUR', pladetCls: 'sin', pladetDet: 'Sin instrumento formal', pladetCol: '#A0AAB2', pacccEst: 'pendiente', pacccLbl: 'Pendiente', pacccCls: 'pend', pacccDet: 'Sin inicio formal', pacccCol: '#E07A6B', adi: '–', adiNom: '–', adiCol: '#354856', descont: '–', descontDet: '–', descontCol: '#354856', frpdNivel: 'Bajo', frpdCls: 'bajo', frpdVal: 1, frpdCol: '#E07A6B', frpdFund: 'Sin PRC ni límite, PLADECO vencido y planes GRD/PACCC pendientes', obs: 'Comuna creada en 2004 sin PRC ni límite. Alta dependencia FCM, PLADECO vencido, PACCC y planes GRD pendientes; máxima necesidad de asistencia técnica preparatoria FRPD.' },
  { c: 2, com: 'Cunco', ti: 6, terr: 'Araucanía Andina', est: 'limite', estLbl: 'Solo Límite Urbano', cls: 'lim', color: '#E0974A', val: 1, prcAno: 'Sin PRC', prcDet: 'Sin PRC · Solo Límite Urbano D.O. 1992', limAno: '1992', pri: '–', zoit: '–', reg: '–', rez: false, zubc: false, pladEst: 'actualizacion', pladLbl: 'En Actualización', pladCls: 'act', pladPer: 'En elab. 2024–28', pladCol: '#F2A541', grdEmerg: 'tramite', grdEmergLbl: 'En Trámite', grdEmergCls: 'act', grdRrd: 'elaboracion', grdRrdLbl: 'En Elaboración', grdRrdCls: 'act', grdCol: '#5598E7', threats: ['volc', 'snow'], threatStr: 'Volcán Llaima · Nieve cordillerana', pladetEst: 'formulacion', pladetLbl: 'En Formulación', pladetCls: 'form', pladetDet: 'Circuito Lago Colico y precordillera', pladetCol: '#5598E7', pacccEst: 'pendiente', pacccLbl: 'Pendiente', pacccCls: 'pend', pacccDet: 'En postulación SUBDERE', pacccCol: '#E07A6B', adi: '–', adiNom: '–', adiCol: '#354856', descont: '–', descontDet: '–', descontCol: '#354856', frpdNivel: 'Medio', frpdCls: 'medio', frpdVal: 2, frpdCol: '#F2A541', frpdFund: 'Solo límite urbano histórico; en actualización de PLADECO y turismo Colico', obs: 'Límite urbano histórico sin zonificación interna. En actualización de PLADECO y formulación turística de Lago Colico; expuesta a erupción Llaima y nevadas.' },
  { c: 3, com: 'Curarrehue', ti: 7, terr: 'Araucanía Lacustre', est: 'formulacion', estLbl: 'En Formulación', cls: 'form', color: '#5598E7', val: 2, prcAno: 'En Formulación', prcDet: 'En Formulación (Convenio MINVU) · Límite 1992', limAno: '1992', pri: '–', zoit: 'ZOIT Araucanía Lacustre', reg: 'ZOIT Lacustre · Cuenca Trancura', rez: false, zubc: false, pladEst: 'vencido', pladLbl: 'Vencido', pladCls: 'ven', pladPer: 'Vencido (en diseño)', pladCol: '#E07A6B', grdEmerg: 'aprobado', grdEmergLbl: 'Aprobado', grdEmergCls: 'ok', grdRrd: 'elaboracion', grdRrdLbl: 'En Elaboración', grdRrdCls: 'act', grdCol: '#F2A541', threats: ['volc', 'snow', 'water'], threatStr: 'Volcán Villarrica · Nevadas · Desbordes', pladetEst: 'vigente', pladetLbl: 'Vigente', pladetCls: 'vig', pladetDet: 'PLADETUR 2022–2026 (Turismo Aventura y Mapuche)', pladetCol: '#5CBF8A', pacccEst: 'pendiente', pacccLbl: 'Pendiente', pacccCls: 'pend', pacccDet: 'En formulación municipal', pacccCol: '#E07A6B', adi: '–', adiNom: '–', adiCol: '#354856', descont: 'PDL Lago', descontDet: 'D.S. 26/2023 Cuenca Lago Villarrica', descontCol: '#6BA8F2', frpdNivel: 'Alto', frpdCls: 'alto', frpdVal: 4, frpdCol: '#5CBF8A', frpdFund: 'ZOIT Lacustre, PLADETUR vigente, PDL Lago Villarrica y alta amenaza volcánica', obs: 'ZOIT Lacustre y cuenca Trancura regulada por PDL Lago Villarrica. PLADETUR vigente focalizado en turismo aventura; alta amenaza volcánica del Volcán Villarrica.' },
  { c: 4, com: 'Freire', ti: 2, terr: 'Cautín Sur', est: 'modificacion', estLbl: 'En Modificación', cls: 'mod', color: '#F2A541', val: 3, prcAno: 'D.O. 1985', prcDet: 'PRC Vigente D.O. 1985 · En Actualización Integral', limAno: '1985', pri: '–', zoit: '–', reg: 'Entorno Aeropuerto Regional', rez: false, zubc: false, pladEst: 'actualizacion', pladLbl: 'En Actualización', pladCls: 'act', pladPer: 'En elab. 2024–28', pladCol: '#F2A541', grdEmerg: 'aprobado', grdEmergLbl: 'Aprobado', grdEmergCls: 'ok', grdRrd: 'elaboracion', grdRrdLbl: 'En Elaboración', grdRrdCls: 'act', grdCol: '#F2A541', threats: ['water', 'fire'], threatStr: 'Desborde Río Toltén · Incendios', pladetEst: 'sin', pladetLbl: 'Sin PLADETUR', pladetCls: 'sin', pladetDet: 'Sin instrumento formal', pladetCol: '#A0AAB2', pacccEst: 'elaboracion', pacccLbl: 'En Elaboración', pacccCls: 'elab', pacccDet: 'Convenio FNDR y cuenca Toltén', pacccCol: '#5598E7', adi: 'ADI Huichahue', adiNom: 'Territorio Huichahue (Ríos Toltén/Allipén)', adiCol: '#E29D62', descont: '–', descontDet: '–', descontCol: '#354856', frpdNivel: 'Medio', frpdCls: 'medio', frpdVal: 2, frpdCol: '#F2A541', frpdFund: 'Entorno Aeropuerto Regional, ADI Huichahue y PRC en modificación', obs: 'Amortiguación del Aeropuerto y confluencia fluvial. En actualización urbana y PACCC en elaboración; presencia de comunidades de la ADI Huichahue y riesgo de desborde Toltén.' },
  { c: 5, com: 'Galvarino', ti: 4, terr: 'Nahuelbuta', est: 'formulacion', estLbl: 'En Formulación', cls: 'form', color: '#5598E7', val: 2, prcAno: 'En Formulación', prcDet: 'En Formulación · Límite Urbano D.O. 1995', limAno: '1995', pri: '–', zoit: '–', reg: 'Zona de Rezago Nahuelbuta', rez: true, zubc: false, pladEst: 'vencido', pladLbl: 'Vencido', pladCls: 'ven', pladPer: 'Vencido (en gestión)', pladCol: '#E07A6B', grdEmerg: 'tramite', grdEmergLbl: 'En Trámite', grdEmergCls: 'act', grdRrd: 'pendiente', grdRrdLbl: 'Pendiente', grdRrdCls: 'pend', grdCol: '#E07A6B', threats: ['fire', 'dry'], threatStr: 'Incendios extremos (crítico) · Déficit hídrico', pladetEst: 'sin', pladetLbl: 'Sin PLADETUR', pladetCls: 'sin', pladetDet: 'Sin instrumento formal', pladetCol: '#A0AAB2', pacccEst: 'pendiente', pacccLbl: 'Pendiente', pacccCls: 'pend', pacccDet: 'Sin inicio formal', pacccCol: '#E07A6B', adi: '–', adiNom: '–', adiCol: '#354856', descont: '–', descontDet: '–', descontCol: '#354856', frpdNivel: 'Medio', frpdCls: 'medio', frpdVal: 2, frpdCol: '#F2A541', frpdFund: 'Zona de rezago Nahuelbuta con severo déficit hídrico y riesgo de incendios', obs: 'Zona de rezago Nahuelbuta con severo déficit hídrico y recurrencia crítica de incendios forestales. Requiere apoyo técnico para estructurar PLADECO, PACCC y cartera FRPD.' },
  { c: 6, com: 'Gorbea', ti: 2, terr: 'Cautín Sur', est: 'modificacion', estLbl: 'En Modificación', cls: 'mod', color: '#F2A541', val: 3, prcAno: 'D.O. 1987', prcDet: 'PRC Vigente D.O. 1987 · En Modificación', limAno: '1987', pri: '–', zoit: '–', reg: '–', rez: false, zubc: false, pladEst: 'actualizacion', pladLbl: 'En Actualización', pladCls: 'act', pladPer: 'En elab. 2024–28', pladCol: '#F2A541', grdEmerg: 'aprobado', grdEmergLbl: 'Aprobado', grdEmergCls: 'ok', grdRrd: 'elaboracion', grdRrdLbl: 'En Elaboración', grdRrdCls: 'act', grdCol: '#F2A541', threats: ['water', 'fire'], threatStr: 'Inundación Río Donguil · Incendios', pladetEst: 'sin', pladetLbl: 'Sin PLADETUR', pladetCls: 'sin', pladetDet: 'Sin instrumento formal', pladetCol: '#A0AAB2', pacccEst: 'pendiente', pacccLbl: 'Pendiente', pacccCls: 'pend', pacccDet: 'En postulación SUBDERE', pacccCol: '#E07A6B', adi: '–', adiNom: '–', adiCol: '#354856', descont: '–', descontDet: '–', descontCol: '#354856', frpdNivel: 'Medio', frpdCls: 'medio', frpdVal: 2, frpdCol: '#F2A541', frpdFund: 'PRC en modificación (Lastarria/Quitratúe) y plan emergencia Donguil', obs: 'PRC en modificación para regular Lastarria y Quitratúe. Plan de emergencia municipal aprobado ante anegamientos recurrentes del río Donguil.' },
  { c: 7, com: 'Lautaro', ti: 1, terr: 'Valle Central', est: 'modificacion', estLbl: 'En Modificación', cls: 'mod', color: '#F2A541', val: 3, prcAno: 'D.O. 1986', prcDet: 'PRC Vigente D.O. 1986 (Mod. 2011) · En Mod.', limAno: '1986', pri: '–', zoit: '–', reg: 'Parque Industrial · Eje Ruta 5', rez: false, zubc: false, pladEst: 'vigente', pladLbl: 'Vigente', pladCls: 'vig', pladPer: '2022–2026', pladCol: '#5CBF8A', grdEmerg: 'aprobado', grdEmergLbl: 'Aprobado', grdEmergCls: 'ok', grdRrd: 'aprobado', grdRrdLbl: 'Aprobado', grdRrdCls: 'ok', grdCol: '#5CBF8A', threats: ['water', 'fire'], threatStr: 'Inundación Río Cautín · Incendios interfaz', pladetEst: 'formulacion', pladetLbl: 'En Formulación', pladetCls: 'form', pladetDet: 'Circuito Ferroviario y Parque Industrial', pladetCol: '#5598E7', pacccEst: 'elaboracion', pacccLbl: 'En Elaboración', pacccCls: 'elab', pacccDet: 'Diagnóstico emisiones cuenca Cautín', pacccCol: '#5598E7', adi: '–', adiNom: '–', adiCol: '#354856', descont: 'PDA Estudio', descontDet: 'Macroárea Centro-Sur MP2,5', descontCol: '#F2A541', frpdNivel: 'Medio-alto', frpdCls: 'medio-alto', frpdVal: 3, frpdCol: '#5598E7', frpdFund: 'Parque industrial Ruta 5, PLADECO y GRD vigentes; vigilancia MP2,5', obs: 'Parque industrial Ruta 5 consolidado. Alta madurez de gestión: PLADECO vigente, planes GRD aprobados; en elaboración de PACCC y sujeto a vigilancia atmosférica de MP2,5.' },
  { c: 8, com: 'Loncoche', ti: 2, terr: 'Cautín Sur', est: 'modificacion', estLbl: 'En Modificación', cls: 'mod', color: '#F2A541', val: 3, prcAno: 'D.O. 1983', prcDet: 'PRC Vigente D.O. 1983 · En Actualización Integral', limAno: '1983', pri: '–', zoit: '–', reg: '–', rez: false, zubc: false, pladEst: 'actualizacion', pladLbl: 'En Actualización', pladCls: 'act', pladPer: 'En elab. 2024–28', pladCol: '#F2A541', grdEmerg: 'aprobado', grdEmergLbl: 'Aprobado', grdEmergCls: 'ok', grdRrd: 'elaboracion', grdRrdLbl: 'En Elaboración', grdRrdCls: 'act', grdCol: '#F2A541', threats: ['water', 'fire'], threatStr: 'Inundación riberas · Incendios', pladetEst: 'formulacion', pladetLbl: 'En Formulación', pladetCls: 'form', pladetDet: 'Ruta del Queso y Artesanía', pladetCol: '#5598E7', pacccEst: 'elaboracion', pacccLbl: 'En Elaboración', pacccCls: 'elab', pacccDet: 'Convenio FNDR cuenca Cruces', pacccCol: '#5598E7', adi: '–', adiNom: '–', adiCol: '#354856', descont: '–', descontDet: '–', descontCol: '#354856', frpdNivel: 'Medio', frpdCls: 'medio', frpdVal: 2, frpdCol: '#F2A541', frpdFund: 'Nodo articulador hacia Los Ríos; actualización integral de PRC', obs: 'PRC de 40+ años en actualización integral. Plan de emergencia comunal vigente por desbordes ribereños en invierno y PACCC en formulación.' },
  { c: 9, com: 'Melipeuco', ti: 6, terr: 'Araucanía Andina', est: 'limite', estLbl: 'Solo Límite Urbano', cls: 'lim', color: '#E0974A', val: 1, prcAno: 'Sin PRC', prcDet: 'Sin PRC · Solo Límite Urbano D.O. 1992', limAno: '1992', pri: '–', zoit: 'ZOIT Melipeuco Paraíso Cordillerano', reg: 'ZOIT Cordillerana', rez: false, zubc: false, pladEst: 'vencido', pladLbl: 'Vencido', pladCls: 'ven', pladPer: 'Vencido (previo 2021)', pladCol: '#E07A6B', grdEmerg: 'aprobado', grdEmergLbl: 'Aprobado', grdEmergCls: 'ok', grdRrd: 'elaboracion', grdRrdLbl: 'En Elaboración', grdRrdCls: 'act', grdCol: '#F2A541', threats: ['volc', 'snow'], threatStr: 'Volcán Llaima (crítico) · Aislamiento nieve', pladetEst: 'vigente', pladetLbl: 'Vigente', pladetCls: 'vig', pladetDet: 'PLADETUR 2021–2025 (Geoparque Kutralkura)', pladetCol: '#5CBF8A', pacccEst: 'elaboracion', pacccLbl: 'En Elaboración', pacccCls: 'elab', pacccDet: 'Adaptación cordillerana y bosques', pacccCol: '#5598E7', adi: '–', adiNom: '–', adiCol: '#354856', descont: '–', descontDet: '–', descontCol: '#354856', frpdNivel: 'Alto', frpdCls: 'alto', frpdVal: 4, frpdCol: '#5CBF8A', frpdFund: 'ZOIT Melipeuco, Geoparque Kutralkura (UNESCO) y PLADETUR vigente', obs: 'Destino ecoturístico clave sin PRC. Alto riesgo volcánico Llaima con plan de emergencia aprobado y PLADETUR activo en el Geoparque Kutralkura.' },
  { c: 10, com: 'Nueva Imperial', ti: 5, terr: 'Costa Araucanía', est: 'modificacion', estLbl: 'En Modificación', cls: 'mod', color: '#F2A541', val: 3, prcAno: 'D.O. 1985', prcDet: 'PRC Vigente D.O. 1985 · En Actualización Integral', limAno: '1985', pri: '–', zoit: '–', reg: 'Zona de Rezago Costa', rez: true, zubc: false, pladEst: 'actualizacion', pladLbl: 'En Actualización', pladCls: 'act', pladPer: 'En elab. 2024–28', pladCol: '#F2A541', grdEmerg: 'tramite', grdEmergLbl: 'En Trámite', grdEmergCls: 'act', grdRrd: 'elaboracion', grdRrdLbl: 'En Elaboración', grdRrdCls: 'act', grdCol: '#5598E7', threats: ['water', 'fire'], threatStr: 'Inundación Cholchol/Imperial · Incendios', pladetEst: 'formulacion', pladetLbl: 'En Formulación', pladetCls: 'form', pladetDet: 'Circuito Fluvial Imperial y Borde Río', pladetCol: '#5598E7', pacccEst: 'elaboracion', pacccLbl: 'En Elaboración', pacccCls: 'elab', pacccDet: 'Financiamiento FNDR', pacccCol: '#5598E7', adi: '–', adiNom: '–', adiCol: '#354856', descont: '–', descontDet: '–', descontCol: '#354856', frpdNivel: 'Medio-alto', frpdCls: 'medio-alto', frpdVal: 3, frpdCol: '#5598E7', frpdFund: 'Zona de rezago Costa Araucanía; confluencia de ríos y PACCC en curso', obs: 'Zona de rezago. En actualización integral urbana y formulación de PLADECO 2024–2028; riesgo de crecidas fluviales en confluencia de ríos.' },
  { c: 11, com: 'Padre Las Casas', ti: 0, terr: 'Temuco – Padre Las Casas', est: 'modificacion', estLbl: 'En Modificación', cls: 'mod', color: '#F2A541', val: 3, prcAno: 'D.O. 1993', prcDet: 'PRC Vigente (derivado Temuco 1993) · Propio en trámite', limAno: '1993', pri: 'PRI Temuco - Padre Las Casas', zoit: '–', reg: 'Área Metropolitana Temuco', rez: false, zubc: false, pladEst: 'vigente', pladLbl: 'Vigente', pladCls: 'vig', pladPer: '2022–2026', pladCol: '#5CBF8A', grdEmerg: 'aprobado', grdEmergLbl: 'Aprobado', grdEmergCls: 'ok', grdRrd: 'elaboracion', grdRrdLbl: 'En Elaboración', grdRrdCls: 'act', grdCol: '#F2A541', threats: ['water', 'fire'], threatStr: 'Inundación Río Cautín · Humo / Interfaz', pladetEst: 'sin', pladetLbl: 'Sin PLADETUR', pladetCls: 'sin', pladetDet: 'Articulado con Temuco', pladetCol: '#A0AAB2', pacccEst: 'elaboracion', pacccLbl: 'En Elaboración', pacccCls: 'elab', pacccDet: 'Plan Metropolitano de Adaptación', pacccCol: '#5598E7', adi: 'ADI Huichahue', adiNom: 'Territorio Huichahue', adiCol: '#E29D62', descont: 'PDA Aire', descontDet: 'D.S. 8/2015 Zona Saturada MP2,5 y MP10', descontCol: '#F27878', frpdNivel: 'Alto', frpdCls: 'alto', frpdVal: 4, frpdCol: '#5CBF8A', frpdFund: 'PRI Metropolitano, PDA Atmosférico obligatorio, ADI Huichahue y PLADECO al día', obs: 'Área metropolitana bajo PRI y PDA Atmosférico de alta exigencia. PLADECO vigente, plan de emergencia aprobado y presencia de comunidades de la ADI Huichahue.' },
  { c: 12, com: 'Perquenco', ti: 1, terr: 'Valle Central', est: 'limite', estLbl: 'Solo Límite Urbano', cls: 'lim', color: '#E0974A', val: 1, prcAno: 'Sin PRC', prcDet: 'Sin PRC · Solo Límite Urbano D.O. 1995', limAno: '1995', pri: '–', zoit: '–', reg: 'Eje Ruta 5', rez: false, zubc: false, pladEst: 'vigente', pladLbl: 'Vigente', pladCls: 'vig', pladPer: '2021–2025', pladCol: '#5CBF8A', grdEmerg: 'tramite', grdEmergLbl: 'En Trámite', grdEmergCls: 'act', grdRrd: 'pendiente', grdRrdLbl: 'Pendiente', grdRrdCls: 'pend', grdCol: '#E07A6B', threats: ['fire', 'dry'], threatStr: 'Incendios · Déficit hídrico', pladetEst: 'sin', pladetLbl: 'Sin PLADETUR', pladetCls: 'sin', pladetDet: 'Sin instrumento formal', pladetCol: '#A0AAB2', pacccEst: 'pendiente', pacccLbl: 'Pendiente', pacccCls: 'pend', pacccDet: 'Sin inicio formal', pacccCol: '#E07A6B', adi: '–', adiNom: '–', adiCol: '#354856', descont: 'PDA Estudio', descontDet: 'Macroárea Central MP2,5', descontCol: '#F2A541', frpdNivel: 'Medio', frpdCls: 'medio', frpdVal: 2, frpdCol: '#F2A541', frpdFund: 'Eje Ruta 5 con PLADECO vigente; sin PRC ni PLADETUR propio', obs: 'Sin PRC. Cuenta con PLADECO vigente; instrumentos de GRD y PACCC en gestión ante riesgo de incendios y déficit hídrico.' },
  { c: 13, com: 'Pitrufquén', ti: 2, terr: 'Cautín Sur', est: 'modificacion', estLbl: 'En Modificación', cls: 'mod', color: '#F2A541', val: 3, prcAno: 'D.O. 1987', prcDet: 'PRC Vigente D.O. 1987 · En Modificación', limAno: '1987', pri: '–', zoit: '–', reg: 'Eje Río Toltén', rez: false, zubc: false, pladEst: 'vigente', pladLbl: 'Vigente', pladCls: 'vig', pladPer: '2022–2026', pladCol: '#5CBF8A', grdEmerg: 'aprobado', grdEmergLbl: 'Aprobado', grdEmergCls: 'ok', grdRrd: 'elaboracion', grdRrdLbl: 'En Elaboración', grdRrdCls: 'act', grdCol: '#F2A541', threats: ['water', 'fire'], threatStr: 'Inundación Río Toltén · Incendios', pladetEst: 'sin', pladetLbl: 'Sin PLADETUR', pladetCls: 'sin', pladetDet: 'Sin instrumento formal', pladetCol: '#A0AAB2', pacccEst: 'elaboracion', pacccLbl: 'En Elaboración', pacccCls: 'elab', pacccDet: 'Convenio FNDR cuenca Toltén', pacccCol: '#5598E7', adi: '–', adiNom: '–', adiCol: '#354856', descont: '–', descontDet: '–', descontCol: '#354856', frpdNivel: 'Medio', frpdCls: 'medio', frpdVal: 2, frpdCol: '#F2A541', frpdFund: 'PLADECO y plan emergencia vigentes; ensanche ribereño Río Toltén', obs: 'PLADECO y plan de emergencia vigentes. Modificación de PRC en curso para ribera norte de Río Toltén y ensanche de servicios.' },
  { c: 14, com: 'Pucón', ti: 7, terr: 'Araucanía Lacustre', est: 'modificacion', estLbl: 'En Modificación', cls: 'mod', color: '#F2A541', val: 3, prcAno: 'D.O. 1994', prcDet: 'PRC Vigente D.O. 1994 (Mod. 2017) · En Actualización', limAno: '1994', pri: 'PRI Villarrica - Pucón (D.O. 2002)', zoit: 'ZOIT Araucanía Lacustre', reg: 'PRI Intercomunal · ZOIT · Saturación Lago', rez: false, zubc: false, pladEst: 'vigente', pladLbl: 'Vigente', pladCls: 'vig', pladPer: '2022–2027', pladCol: '#5CBF8A', grdEmerg: 'aprobado', grdEmergLbl: 'Aprobado', grdEmergCls: 'ok', grdRrd: 'aprobado', grdRrdLbl: 'Aprobado', grdRrdCls: 'ok', grdCol: '#5CBF8A', threats: ['volc', 'water', 'fire'], threatStr: 'Volcán Villarrica (lahares) · Saturación lago', pladetEst: 'vigente', pladetLbl: 'Vigente', pladetCls: 'vig', pladetDet: 'PLADETUR 2021–2026 (Destino Sustentable)', pladetCol: '#5CBF8A', pacccEst: 'aprobado', pacccLbl: 'Aprobado', pacccCls: 'apr', pacccDet: 'Plan de Cambio Climático 2023–2030', pacccCol: '#5CBF8A', adi: '–', adiNom: '–', adiCol: '#354856', descont: 'PDL Lago', descontDet: 'D.S. 26/2023 Cuenca Lago Villarrica', descontCol: '#6BA8F2', frpdNivel: 'Muy Alto', frpdCls: 'muy-alto', frpdVal: 5, frpdCol: '#C7A2F0', frpdFund: 'Concurrencia máxima: PRI + ZOIT + PLADETUR + PACCC + PDL Lago + GRD lahares', obs: 'Máxima exigencia de planificación (PRI + ZOIT + PDA Lago). PLADECO, plan de emergencia y RRD aprobados por riesgo laharic extremo.' },
  { c: 15, com: 'Saavedra', ti: 5, terr: 'Costa Araucanía', est: 'vigente', estLbl: 'PRC Vigente', cls: 'vig', color: '#5CBF8A', val: 4, prcAno: 'D.O. 1991', prcDet: 'PRC Vigente D.O. 1991 (Mod. 2011)', limAno: '1991', pri: '–', zoit: '–', reg: 'ZUBC Borde Costero · Rezago Costa', rez: true, zubc: true, pladEst: 'vigente', pladLbl: 'Vigente', pladCls: 'vig', pladPer: '2022–2026', pladCol: '#5CBF8A', grdEmerg: 'aprobado', grdEmergLbl: 'Aprobado', grdEmergCls: 'ok', grdRrd: 'aprobado', grdRrdLbl: 'Aprobado', grdRrdCls: 'ok', grdCol: '#5CBF8A', threats: ['water', 'dry'], threatStr: 'Tsunami / Inundación costera · Déficit hídrico', pladetEst: 'vigente', pladetLbl: 'Vigente', pladetCls: 'vig', pladetDet: 'PLADETUR 2022–2026 (Turismo Mapuche Budi)', pladetCol: '#5CBF8A', pacccEst: 'elaboracion', pacccLbl: 'En Elaboración', pacccCls: 'elab', pacccDet: 'Adaptación costera y cuenca Budi', pacccCol: '#5598E7', adi: 'ADI Lago Budi', adiNom: 'Área Indígena Lago Budi (D.S. 200/1997)', adiCol: '#E29D62', descont: '–', descontDet: '–', descontCol: '#354856', frpdNivel: 'Alto', frpdCls: 'alto', frpdVal: 4, frpdCol: '#5CBF8A', frpdFund: 'ADI Lago Budi, ZUBC costera, Rezago Costa, PLADETUR y PRC al día', obs: 'Puerto Saavedra. Instrumentos al día: PRC con cotas tsunami, ZUBC costera, ADI Lago Budi, PLADETUR y PLADECO vigentes.' },
  { c: 16, com: 'Temuco', ti: 0, terr: 'Temuco – Padre Las Casas', est: 'modificacion', estLbl: 'En Modificación', cls: 'mod', color: '#F2A541', val: 3, prcAno: 'D.O. 2010', prcDet: 'PRC Vigente D.O. 2010 · En Actualización Integral', limAno: '2010', pri: 'PRI Temuco - Padre Las Casas', zoit: '–', reg: 'Capital Regional · Área Metropolitana', rez: false, zubc: false, pladEst: 'vigente', pladLbl: 'Vigente', pladCls: 'vig', pladPer: '2023–2028', pladCol: '#5CBF8A', grdEmerg: 'aprobado', grdEmergLbl: 'Aprobado', grdEmergCls: 'ok', grdRrd: 'aprobado', grdRrdLbl: 'Aprobado', grdRrdCls: 'ok', grdCol: '#5CBF8A', threats: ['water', 'fire'], threatStr: 'Inundación Río Cautín · Interfaz cerros', pladetEst: 'vigente', pladetLbl: 'Vigente', pladetCls: 'vig', pladetDet: 'PLADETUR 2023–2027 (Turismo Urbano y Negocios)', pladetCol: '#5CBF8A', pacccEst: 'aprobado', pacccLbl: 'Aprobado', pacccCls: 'apr', pacccDet: 'Plan Local de Cambio Climático 2024–2030', pacccCol: '#5CBF8A', adi: '–', adiNom: '–', adiCol: '#354856', descont: 'PDA Aire', descontDet: 'D.S. 8/2015 Zona Saturada MP2,5 y MP10', descontCol: '#F27878', frpdNivel: 'Muy Alto', frpdCls: 'muy-alto', frpdVal: 5, frpdCol: '#C7A2F0', frpdFund: 'Capital regional: PRI Metropolitano, PDA Atmosférico, PACCC aprobado y PLADECO al día', obs: 'Capital regional. Máxima robustez: PRI Metropolitano + PDA Atmosférico obligatorio + PACCC aprobado + PLADETUR y PLADECO vigentes + GRD al día con COGRID permanente.' },
  { c: 17, com: 'Teodoro Schmidt', ti: 5, terr: 'Costa Araucanía', est: 'limite', estLbl: 'Solo Límite Urbano', cls: 'lim', color: '#E0974A', val: 1, prcAno: 'Sin PRC', prcDet: 'Sin PRC · Solo Límite Urbano D.O. 1970', limAno: '1970', pri: '–', zoit: '–', reg: 'ZUBC Borde Costero · Rezago Costa', rez: true, zubc: true, pladEst: 'vencido', pladLbl: 'Vencido', pladCls: 'ven', pladPer: 'Vencido (previo 2021)', pladCol: '#E07A6B', grdEmerg: 'tramite', grdEmergLbl: 'En Trámite', grdEmergCls: 'act', grdRrd: 'elaboracion', grdRrdLbl: 'En Elaboración', grdRrdCls: 'act', grdCol: '#5598E7', threats: ['water', 'dry'], threatStr: 'Tsunami / Marejadas · Déficit hídrico', pladetEst: 'sin', pladetLbl: 'Sin PLADETUR', pladetCls: 'sin', pladetDet: 'En formulación preliminar', pladetCol: '#A0AAB2', pacccEst: 'pendiente', pacccLbl: 'Pendiente', pacccCls: 'pend', pacccDet: 'En postulación SUBDERE', pacccCol: '#E07A6B', adi: 'ADI Lago Budi', adiNom: 'Sector Sur Cuenca Budi (D.S. 200/1997)', adiCol: '#E29D62', descont: '–', descontDet: '–', descontCol: '#354856', frpdNivel: 'Medio-alto', frpdCls: 'medio-alto', frpdVal: 3, frpdCol: '#5598E7', frpdFund: 'ADI Lago Budi y ZUBC costera; rezago Costa y necesidad de apoyo técnico', obs: 'Sin PRC (límite 1970) y PLADECO vencido. Comprende sector sur de la ADI Lago Budi y ZUBC costera; requiere fortalecimiento técnico.' },
  { c: 18, com: 'Toltén', ti: 5, terr: 'Costa Araucanía', est: 'vigente', estLbl: 'PRC Vigente', cls: 'vig', color: '#5CBF8A', val: 4, prcAno: 'D.O. 1988', prcDet: 'PRC Vigente D.O. 1988 (Toltén y Queule)', limAno: '1988', pri: '–', zoit: '–', reg: 'ZUBC Borde Costero · Rezago Costa', rez: true, zubc: true, pladEst: 'actualizacion', pladLbl: 'En Actualización', pladCls: 'act', pladPer: 'En elab. 2024–28', pladCol: '#F2A541', grdEmerg: 'aprobado', grdEmergLbl: 'Aprobado', grdEmergCls: 'ok', grdRrd: 'elaboracion', grdRrdLbl: 'En Elaboración', grdRrdCls: 'act', grdCol: '#F2A541', threats: ['water'], threatStr: 'Tsunami Queule · Inundación Río Toltén', pladetEst: 'vigente', pladetLbl: 'Vigente', pladetCls: 'vig', pladetDet: 'PLADETUR 2022–2026 (Pesca Recreativa y Caleta Queule)', pladetCol: '#5CBF8A', pacccEst: 'elaboracion', pacccLbl: 'En Elaboración', pacccCls: 'elab', pacccDet: 'Resiliencia costera y marejadas', pacccCol: '#5598E7', adi: '–', adiNom: '–', adiCol: '#354856', descont: '–', descontDet: '–', descontCol: '#354856', frpdNivel: 'Alto', frpdCls: 'alto', frpdVal: 4, frpdCol: '#5CBF8A', frpdFund: 'Caleta Queule, ZUBC costera, PLADETUR pesquero y PRC vigente ante tsunami', obs: 'PRC vigente en Toltén y Caleta Queule. Plan de emergencia aprobado, PLADETUR pesquero y RRD en curso por exposición a tsunami e inundación fluvial.' },
  { c: 19, com: 'Vilcún', ti: 6, terr: 'Araucanía Andina', est: 'formulacion', estLbl: 'En Formulación', cls: 'form', color: '#5598E7', val: 2, prcAno: 'En Formulación', prcDet: 'En Formulación (Convenio MINVU) · Límite 1970', limAno: '1970', pri: '–', zoit: 'ZOIT Vilcún Cordillera Viva', reg: 'ZOIT Cordillerana · Cajón periurbano', rez: false, zubc: false, pladEst: 'actualizacion', pladLbl: 'En Actualización', pladCls: 'act', pladPer: 'En elab. 2024–28', pladCol: '#F2A541', grdEmerg: 'aprobado', grdEmergLbl: 'Aprobado', grdEmergCls: 'ok', grdRrd: 'aprobado', grdRrdLbl: 'Aprobado', grdRrdCls: 'ok', grdCol: '#5CBF8A', threats: ['volc', 'fire', 'snow'], threatStr: 'Volcán Llaima · Incendios · Nieve', pladetEst: 'vigente', pladetLbl: 'Vigente', pladetCls: 'vig', pladetDet: 'PLADETUR 2022–2026 (Cordillera Viva)', pladetCol: '#5CBF8A', pacccEst: 'elaboracion', pacccLbl: 'En Elaboración', pacccCls: 'elab', pacccDet: 'Adaptación forestal y cuenca Cautín', pacccCol: '#5598E7', adi: '–', adiNom: '–', adiCol: '#354856', descont: '–', descontDet: '–', descontCol: '#354856', frpdNivel: 'Alto', frpdCls: 'alto', frpdVal: 4, frpdCol: '#5CBF8A', frpdFund: 'ZOIT Vilcún Cordillera Viva, PLADETUR vigente y planes GRD/RRD aprobados', obs: 'ZOIT Cordillera Viva. En formulación de PRC y actualización PLADECO; PLADETUR vigente y planes de emergencia/RRD aprobados ante volcán Llaima.' },
  { c: 20, com: 'Villarrica', ti: 7, terr: 'Araucanía Lacustre', est: 'modificacion', estLbl: 'En Modificación', cls: 'mod', color: '#F2A541', val: 3, prcAno: 'D.O. 1985', prcDet: 'PRC Vigente D.O. 1985 (Licán Ray / Ñancul) · En Act.', limAno: '1985', pri: 'PRI Villarrica - Pucón (D.O. 2002)', zoit: 'ZOIT Araucanía Lacustre', reg: 'PRI Intercomunal · ZOIT · PDA Lago', rez: false, zubc: false, pladEst: 'vigente', pladLbl: 'Vigente', pladCls: 'vig', pladPer: '2022–2026', pladCol: '#5CBF8A', grdEmerg: 'aprobado', grdEmergLbl: 'Aprobado', grdEmergCls: 'ok', grdRrd: 'aprobado', grdRrdLbl: 'Aprobado', grdRrdCls: 'ok', grdCol: '#5CBF8A', threats: ['volc', 'water', 'fire'], threatStr: 'Volcán Villarrica · Saturación lago · Interfaz', pladetEst: 'vigente', pladetLbl: 'Vigente', pladetCls: 'vig', pladetDet: 'PLADETUR 2022–2026 (Villarrica Destino Verde)', pladetCol: '#5CBF8A', pacccEst: 'aprobado', pacccLbl: 'Aprobado', pacccCls: 'apr', pacccDet: 'Plan de Acción Cambio Climático 2023–2030', pacccCol: '#5CBF8A', adi: '–', adiNom: '–', adiCol: '#354856', descont: 'PDL Lago', descontDet: 'D.S. 26/2023 Cuenca Lago Villarrica', descontCol: '#6BA8F2', frpdNivel: 'Muy Alto', frpdCls: 'muy-alto', frpdVal: 5, frpdCol: '#C7A2F0', frpdFund: 'Articulador lacustre: PRI + ZOIT + PLADETUR + PACCC + PDL Descontaminación Lago', obs: 'Articulador lacustre. Instrumentos al día: PLADECO vigente, PRI intercomunal, PLADETUR, PACCC aprobado, PDL descontaminación lago y planes de emergencia/RRD aprobados.' },
  { c: 21, com: 'Angol', ti: 3, terr: 'Malleco Norte', est: 'vigente', estLbl: 'PRC Vigente', cls: 'vig', color: '#5CBF8A', val: 4, prcAno: 'D.O. 1989', prcDet: 'PRC Vigente D.O. 1989 (Mod. 2008)', limAno: '1989', pri: '–', zoit: '–', reg: 'Capital Provincial Malleco', rez: false, zubc: false, pladEst: 'vigente', pladLbl: 'Vigente', pladCls: 'vig', pladPer: '2021–2025', pladCol: '#5CBF8A', grdEmerg: 'aprobado', grdEmergLbl: 'Aprobado', grdEmergCls: 'ok', grdRrd: 'aprobado', grdRrdLbl: 'Aprobado', grdRrdCls: 'ok', grdCol: '#5CBF8A', threats: ['fire', 'water'], threatStr: 'Incendios forestales cordillera · Río Vergara', pladetEst: 'vigente', pladetLbl: 'Vigente', pladetCls: 'vig', pladetDet: 'PLADETUR 2022–2026 (Cordillera Nahuelbuta)', pladetCol: '#5CBF8A', pacccEst: 'elaboracion', pacccLbl: 'En Elaboración', pacccCls: 'elab', pacccDet: 'Vulnerabilidad hídrica y de incendios', pacccCol: '#5598E7', adi: '–', adiNom: '–', adiCol: '#354856', descont: '–', descontDet: '–', descontCol: '#354856', frpdNivel: 'Alto', frpdCls: 'alto', frpdVal: 4, frpdCol: '#5CBF8A', frpdFund: 'Capital provincial Malleco, PRC consolidado, PLADETUR y GRD al día', obs: 'Capital provincial de Malleco. PRC consolidado, PLADECO y PLADETUR vigentes, planes de GRD aprobados; puerta de entrada a Parque Nahuelbuta.' },
  { c: 22, com: 'Collipulli', ti: 3, terr: 'Malleco Norte', est: 'vigente', estLbl: 'PRC Vigente', cls: 'vig', color: '#5CBF8A', val: 4, prcAno: 'D.O. 1984', prcDet: 'PRC Vigente D.O. 1984 (Mod. 2012)', limAno: '1984', pri: '–', zoit: '–', reg: 'Zona de Rezago Malleco-Nahuelbuta', rez: true, zubc: false, pladEst: 'actualizacion', pladLbl: 'En Actualización', pladCls: 'act', pladPer: 'En elab. 2024–28', pladCol: '#F2A541', grdEmerg: 'aprobado', grdEmergLbl: 'Aprobado', grdEmergCls: 'ok', grdRrd: 'elaboracion', grdRrdLbl: 'En Elaboración', grdRrdCls: 'act', grdCol: '#F2A541', threats: ['fire'], threatStr: 'Incendios forestales extremos · Quebradas', pladetEst: 'formulacion', pladetLbl: 'En Formulación', pladetCls: 'form', pladetDet: 'Viaducto del Malleco y Geoturismo', pladetCol: '#5598E7', pacccEst: 'elaboracion', pacccLbl: 'En Elaboración', pacccCls: 'elab', pacccDet: 'Convenio FNDR', pacccCol: '#5598E7', adi: '–', adiNom: '–', adiCol: '#354856', descont: '–', descontDet: '–', descontCol: '#354856', frpdNivel: 'Medio-alto', frpdCls: 'medio-alto', frpdVal: 3, frpdCol: '#5598E7', frpdFund: 'Zona de rezago Malleco, PRC vigente, recurrencia crítica de incendios', obs: 'Zona de rezago. PRC vigente y plan de emergencia aprobado; recurrencia extrema de incendios forestales en temporada estival.' },
  { c: 23, com: 'Curacautín', ti: 6, terr: 'Araucanía Andina', est: 'vigente', estLbl: 'PRC Vigente', cls: 'vig', color: '#5CBF8A', val: 4, prcAno: 'D.O. 1987', prcDet: 'PRC Vigente D.O. 1987 (Mod. 2009)', limAno: '1987', pri: '–', zoit: 'ZOIT Curacautín', reg: 'ZOIT · Corredor Bioceánico', rez: false, zubc: false, pladEst: 'vigente', pladLbl: 'Vigente', pladCls: 'vig', pladPer: '2021–2025', pladCol: '#5CBF8A', grdEmerg: 'aprobado', grdEmergLbl: 'Aprobado', grdEmergCls: 'ok', grdRrd: 'aprobado', grdRrdLbl: 'Aprobado', grdRrdCls: 'ok', grdCol: '#5CBF8A', threats: ['volc', 'snow'], threatStr: 'Volcanes Llaima/Lonquimay · Nieve/Aislamiento', pladetEst: 'vigente', pladetLbl: 'Vigente', pladetCls: 'vig', pladetDet: 'PLADETUR 2021–2025 (Termal y Geoturismo)', pladetCol: '#5CBF8A', pacccEst: 'aprobado', pacccLbl: 'Aprobado', pacccCls: 'apr', pacccDet: 'Plan de Acción Climático 2023–2030', pacccCol: '#5CBF8A', adi: '–', adiNom: '–', adiCol: '#354856', descont: '–', descontDet: '–', descontCol: '#354856', frpdNivel: 'Muy Alto', frpdCls: 'muy-alto', frpdVal: 5, frpdCol: '#C7A2F0', frpdFund: 'ZOIT Curacautín, Corredor Bioceánico, PLADETUR, PACCC aprobado y GRD activo', obs: 'ZOIT termal y andina. Instrumentos de planificación, PLADETUR, PACCC aprobado y GRD al día por coexistencia con dos macizos volcánicos activos.' },
  { c: 24, com: 'Ercilla', ti: 3, terr: 'Malleco Norte', est: 'limite', estLbl: 'Solo Límite Urbano', cls: 'lim', color: '#E0974A', val: 1, prcAno: 'Sin PRC', prcDet: 'Sin PRC · Solo Límite Urbano D.O. 1941', limAno: '1941', pri: '–', zoit: '–', reg: 'Zona de Rezago Malleco-Nahuelbuta', rez: true, zubc: false, pladEst: 'vencido', pladLbl: 'Vencido', pladCls: 'ven', pladPer: 'Vencido (en gestión)', pladCol: '#E07A6B', grdEmerg: 'tramite', grdEmergLbl: 'En Trámite', grdEmergCls: 'act', grdRrd: 'pendiente', grdRrdLbl: 'Pendiente', grdRrdCls: 'pend', grdCol: '#E07A6B', threats: ['fire', 'dry'], threatStr: 'Incendios forestales · Déficit hídrico', pladetEst: 'sin', pladetLbl: 'Sin PLADETUR', pladetCls: 'sin', pladetDet: 'Sin instrumento formal', pladetCol: '#A0AAB2', pacccEst: 'pendiente', pacccLbl: 'Pendiente', pacccCls: 'pend', pacccDet: 'Sin inicio formal', pacccCol: '#E07A6B', adi: 'ADI Ercilla', adiNom: 'Área Indígena Ercilla (D.S. 11/2007)', adiCol: '#E29D62', descont: '–', descontDet: '–', descontCol: '#354856', frpdNivel: 'Medio-alto', frpdCls: 'medio-alto', frpdVal: 3, frpdCol: '#5598E7', frpdFund: 'ADI Ercilla y Rezago Malleco; desfase urbano de 80 años y alta vulnerabilidad', obs: 'Rezago Malleco y territorio ADI Ercilla. Desfase de más de 80 años en su límite urbano (1941), PLADECO vencido y planes de GRD en trámite; alta necesidad de apoyo técnico.' },
  { c: 25, com: 'Lonquimay', ti: 6, terr: 'Araucanía Andina', est: 'vigente', estLbl: 'PRC Vigente', cls: 'vig', color: '#5CBF8A', val: 4, prcAno: 'D.O. 1987', prcDet: 'PRC Vigente D.O. 1987 (Mod. 2014)', limAno: '1987', pri: '–', zoit: 'ZOIT Lonquimay', reg: 'ZOIT · Paso Pino Hachado', rez: false, zubc: false, pladEst: 'vigente', pladLbl: 'Vigente', pladCls: 'vig', pladPer: '2022–2026', pladCol: '#5CBF8A', grdEmerg: 'aprobado', grdEmergLbl: 'Aprobado', grdEmergCls: 'ok', grdRrd: 'aprobado', grdRrdLbl: 'Aprobado', grdRrdCls: 'ok', grdCol: '#5CBF8A', threats: ['snow', 'volc'], threatStr: 'Nevadas extremas / Aislamiento · Volcánico', pladetEst: 'vigente', pladetLbl: 'Vigente', pladetCls: 'vig', pladetDet: 'PLADETUR 2022–2026 (Pewenche y Montaña)', pladetCol: '#5CBF8A', pacccEst: 'elaboracion', pacccLbl: 'En Elaboración', pacccCls: 'elab', pacccDet: 'Adaptación a nevadas y sequía estival', pacccCol: '#5598E7', adi: 'ADI Lonquimay', adiNom: 'Área Indígena Alto Biobío / Lonquimay', adiCol: '#E29D62', descont: '–', descontDet: '–', descontCol: '#354856', frpdNivel: 'Muy Alto', frpdCls: 'muy-alto', frpdVal: 5, frpdCol: '#C7A2F0', frpdFund: 'Paso Fronterizo, ZOIT Lonquimay, ADI Pewenche, PLADETUR y GRD al día', obs: 'Paso Fronterizo Pino Hachado, ZOIT Lonquimay y faja Pewenche ADI. PRC, PLADECO y PLADETUR vigentes; plan invernal de emergencia y RRD aprobados.' },
  { c: 26, com: 'Los Sauces', ti: 4, terr: 'Nahuelbuta', est: 'formulacion', estLbl: 'En Formulación', cls: 'form', color: '#5598E7', val: 2, prcAno: 'En Formulación', prcDet: 'En Formulación · Límite Urbano D.O. 1966', limAno: '1966', pri: '–', zoit: '–', reg: 'Zona de Rezago Malleco-Nahuelbuta', rez: true, zubc: false, pladEst: 'actualizacion', pladLbl: 'En Actualización', pladCls: 'act', pladPer: 'En elab. 2024–28', pladCol: '#F2A541', grdEmerg: 'tramite', grdEmergLbl: 'En Trámite', grdEmergCls: 'act', grdRrd: 'elaboracion', grdRrdLbl: 'En Elaboración', grdRrdCls: 'act', grdCol: '#5598E7', threats: ['fire', 'dry'], threatStr: 'Incendios forestales · Déficit hídrico', pladetEst: 'sin', pladetLbl: 'Sin PLADETUR', pladetCls: 'sin', pladetDet: 'Sin instrumento formal', pladetCol: '#A0AAB2', pacccEst: 'pendiente', pacccLbl: 'Pendiente', pacccCls: 'pend', pacccDet: 'En postulación', pacccCol: '#E07A6B', adi: 'ADI Puel Nahuelbuta', adiNom: 'Área Puel Nahuelbuta (D.S. 57/2012)', adiCol: '#E29D62', descont: '–', descontDet: '–', descontCol: '#354856', frpdNivel: 'Medio-alto', frpdCls: 'medio-alto', frpdVal: 3, frpdCol: '#5598E7', frpdFund: 'Rezago Nahuelbuta y ADI Puel Nahuelbuta; primer PRC en formulación', obs: 'Zona de rezago e integrante de ADI Puel Nahuelbuta. En formulación de su primer PRC y actualización de PLADECO; expuesta a severos incendios de interfase y sequía.' },
  { c: 27, com: 'Lumaco', ti: 4, terr: 'Nahuelbuta', est: 'formulacion', estLbl: 'En Formulación', cls: 'form', color: '#5598E7', val: 2, prcAno: 'En Formulación', prcDet: 'En Formulación · Límite histórico D.O. 1939', limAno: '1939', pri: '–', zoit: '–', reg: 'Zona de Rezago Malleco-Nahuelbuta', rez: true, zubc: false, pladEst: 'vencido', pladLbl: 'Vencido', pladCls: 'ven', pladPer: 'Vencido (en diseño)', pladCol: '#E07A6B', grdEmerg: 'tramite', grdEmergLbl: 'En Trámite', grdEmergCls: 'act', grdRrd: 'pendiente', grdRrdLbl: 'Pendiente', grdRrdCls: 'pend', grdCol: '#E07A6B', threats: ['fire', 'dry'], threatStr: 'Incendios forestales masivos · Déficit hídrico', pladetEst: 'sin', pladetLbl: 'Sin PLADETUR', pladetCls: 'sin', pladetDet: 'Sin instrumento formal', pladetCol: '#A0AAB2', pacccEst: 'pendiente', pacccLbl: 'Pendiente', pacccCls: 'pend', pacccDet: 'Sin inicio formal', pacccCol: '#E07A6B', adi: 'ADI Puel Nahuelbuta', adiNom: 'Área Puel Nahuelbuta (D.S. 57/2012)', adiCol: '#E29D62', descont: '–', descontDet: '–', descontCol: '#354856', frpdNivel: 'Medio-alto', frpdCls: 'medio-alto', frpdVal: 3, frpdCol: '#5598E7', frpdFund: 'Rezago Nahuelbuta y ADI Puel Nahuelbuta; límite de 1939 y riesgo de fuego', obs: 'Rezago Nahuelbuta e integrante clave de ADI Puel Nahuelbuta. Límite urbano de 1939 (85 años). PLADECO vencido e instrumentos de GRD pendientes frente a recurrencia crítica de fuego.' },
  { c: 28, com: 'Purén', ti: 4, terr: 'Nahuelbuta', est: 'formulacion', estLbl: 'En Formulación', cls: 'form', color: '#5598E7', val: 2, prcAno: 'En Formulación', prcDet: 'En Formulación · Límite Urbano D.O. 1947', limAno: '1947', pri: '–', zoit: '–', reg: 'Zona de Rezago Malleco-Nahuelbuta', rez: true, zubc: false, pladEst: 'actualizacion', pladLbl: 'En Actualización', pladCls: 'act', pladPer: 'En elab. 2024–28', pladCol: '#F2A541', grdEmerg: 'tramite', grdEmergLbl: 'En Trámite', grdEmergCls: 'act', grdRrd: 'elaboracion', grdRrdLbl: 'En Elaboración', grdRrdCls: 'act', grdCol: '#5598E7', threats: ['fire', 'dry'], threatStr: 'Incendios forestales severos · Sequía', pladetEst: 'sin', pladetLbl: 'Sin PLADETUR', pladetCls: 'sin', pladetDet: 'En formulación patrimonial', pladetCol: '#A0AAB2', pacccEst: 'pendiente', pacccLbl: 'Pendiente', pacccCls: 'pend', pacccDet: 'En postulación SUBDERE', pacccCol: '#E07A6B', adi: 'ADI Puel Nahuelbuta', adiNom: 'Área Puel Nahuelbuta (D.S. 57/2012)', adiCol: '#E29D62', descont: '–', descontDet: '–', descontCol: '#354856', frpdNivel: 'Medio-alto', frpdCls: 'medio-alto', frpdVal: 3, frpdCol: '#5598E7', frpdFund: 'Rezago Nahuelbuta y ADI Puel Nahuelbuta; reconstrucción y plan RRD', obs: 'Zona de rezago Nahuelbuta y ADI Puel Nahuelbuta. Severamente afectada por incendios 2023; en reformulación de PLADECO, PRC y plan RRD.' },
  { c: 29, com: 'Renaico', ti: 3, terr: 'Malleco Norte', est: 'vigente', estLbl: 'PRC Vigente', cls: 'vig', color: '#5CBF8A', val: 4, prcAno: 'D.O. 1987', prcDet: 'PRC Vigente D.O. 1987 (Mod. 2011)', limAno: '1987', pri: '–', zoit: '–', reg: 'Polo ERNC Eólica', rez: false, zubc: false, pladEst: 'vigente', pladLbl: 'Vigente', pladCls: 'vig', pladPer: '2022–2026', pladCol: '#5CBF8A', grdEmerg: 'aprobado', grdEmergLbl: 'Aprobado', grdEmergCls: 'ok', grdRrd: 'elaboracion', grdRrdLbl: 'En Elaboración', grdRrdCls: 'act', grdCol: '#F2A541', threats: ['fire', 'water'], threatStr: 'Incendios forestales · Inundación Río Renaico', pladetEst: 'sin', pladetLbl: 'Sin PLADETUR', pladetCls: 'sin', pladetDet: 'Polo industrial y eólico', pladetCol: '#A0AAB2', pacccEst: 'elaboracion', pacccLbl: 'En Elaboración', pacccCls: 'elab', pacccDet: 'Transición energética cuenca Renaico', pacccCol: '#5598E7', adi: '–', adiNom: '–', adiCol: '#354856', descont: '–', descontDet: '–', descontCol: '#354856', frpdNivel: 'Medio', frpdCls: 'medio', frpdVal: 2, frpdCol: '#F2A541', frpdFund: 'Polo eólico ERNC con PRC y PLADECO vigentes; PACCC en formulación', obs: 'Polo eólico. PRC vigente, PLADECO 2022–2026 y plan de emergencia aprobado; articulado con inversiones de transición energética y PACCC en curso.' },
  { c: 30, com: 'Traiguén', ti: 4, terr: 'Nahuelbuta', est: 'modificacion', estLbl: 'En Modificación', cls: 'mod', color: '#F2A541', val: 3, prcAno: 'D.O. 1986', prcDet: 'PRC Vigente D.O. 1986 · En Modificación', limAno: '1986', pri: '–', zoit: '–', reg: 'Zona de Rezago Malleco-Nahuelbuta', rez: true, zubc: false, pladEst: 'actualizacion', pladLbl: 'En Actualización', pladCls: 'act', pladPer: 'En elab. 2024–28', pladCol: '#F2A541', grdEmerg: 'aprobado', grdEmergLbl: 'Aprobado', grdEmergCls: 'ok', grdRrd: 'elaboracion', grdRrdLbl: 'En Elaboración', grdRrdCls: 'act', grdCol: '#F2A541', threats: ['fire', 'water'], threatStr: 'Incendios forestales · Inundación Río Traiguén', pladetEst: 'formulacion', pladetLbl: 'En Formulación', pladetCls: 'form', pladetDet: 'Patrimonio arquitectónico e histórico', pladetCol: '#5598E7', pacccEst: 'elaboracion', pacccLbl: 'En Elaboración', pacccCls: 'elab', pacccDet: 'Convenio FNDR', pacccCol: '#5598E7', adi: 'ADI Puel Nahuelbuta', adiNom: 'Área Puel Nahuelbuta (D.S. 57/2012)', adiCol: '#E29D62', descont: '–', descontDet: '–', descontCol: '#354856', frpdNivel: 'Medio-alto', frpdCls: 'medio-alto', frpdVal: 3, frpdCol: '#5598E7', frpdFund: 'Rezago Nahuelbuta y ADI Puel Nahuelbuta; PRC y PLADECO en actualización', obs: 'Rezago Nahuelbuta y ADI Puel Nahuelbuta. PRC en modificación y PLADECO en actualización; plan de emergencia aprobado ante crecidas de río e incendios.' },
  { c: 31, com: 'Victoria', ti: 6, terr: 'Araucanía Andina', est: 'modificacion', estLbl: 'En Modificación', cls: 'mod', color: '#F2A541', val: 3, prcAno: 'D.O. 1984', prcDet: 'PRC Vigente D.O. 1984 · En Mod. / Actualización', limAno: '1984', pri: '–', zoit: '–', reg: 'Zona de Rezago Malleco-Nahuelbuta · Nodo UNAP', rez: true, zubc: false, pladEst: 'vigente', pladLbl: 'Vigente', pladCls: 'vig', pladPer: '2021–2025', pladCol: '#5CBF8A', grdEmerg: 'aprobado', grdEmergLbl: 'Aprobado', grdEmergCls: 'ok', grdRrd: 'aprobado', grdRrdLbl: 'Aprobado', grdRrdCls: 'ok', grdCol: '#5CBF8A', threats: ['fire', 'water'], threatStr: 'Incendios forestales · Inundación riberas', pladetEst: 'formulacion', pladetLbl: 'En Formulación', pladetCls: 'form', pladetDet: 'Nodo termal y universitario', pladetCol: '#5598E7', pacccEst: 'elaboracion', pacccLbl: 'En Elaboración', pacccCls: 'elab', pacccDet: 'Convenio FNDR', pacccCol: '#5598E7', adi: '–', adiNom: '–', adiCol: '#354856', descont: 'PDA Estudio', descontDet: 'Macroárea Central MP2,5', descontCol: '#F2A541', frpdNivel: 'Alto', frpdCls: 'alto', frpdVal: 4, frpdCol: '#5CBF8A', frpdFund: 'Nodo universitario y logístico UNAP, PLADECO vigente, planes GRD aprobados', obs: 'Nodo universitario y logístico de Malleco. PLADECO vigente, plan de emergencia y RRD aprobados con SENAPRED; PRC en actualización y rezago Malleco.' },
];

// ================= TERRITORIOS (mapa) =================
const MP = FR.map;
const MAPIND = [
  { k: 'ter', l: 'Territorio ERD' },
  { k: 'bre', l: 'N° de dimensiones de infraestructura en brecha (0–6)' },
  ...HABS.map(h => ({ k: h.k, l: `${h.l} (${h.u})`, hab: h })),
  { k: 'ipt', l: 'Plan regulador comunal (ERD 2040, Tabla 14)' },
  { k: 'ipa', l: 'Inversión pública 2010–2022 por habitante' },
  { k: 'emp', l: 'Empresas por 1.000 habitantes (SII 2024)' },
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
  if (k === 'ipt') return IPT_DATA[c].val;
  if (k.startsWith('ev:')) return EVV[k.slice(3)][c];
  if (k === 'bre') return trData().com[c].length;
  if (k === 'ipa') return IN.ipapc[c] / 1e6;
  if (k === 'emp') return SII0.comN[c] / POP[c] * 1000;
  if (k === 'binv') return binvC[c] * 1000 / POP[c];
  if (k === 'lq') return lqCom0(c, UI.mLin);
  const h = HABS.find(x => x.k === k); return h ? HV[k][c] : NaN;
}
function comFill(k) {
  if (k === 'ter') return ALLC.map(c => TCOL[TOF[c]]);
  if (k === 'ipt') return ALLC.map(c => IPT_DATA[c].color);
  if (k === 'lq') return ALLC.map(c => lqColor(comVal('lq', c)));
  const v = ALLC.map(c => comVal(k, c)), fv = v.filter(isFinite), mn = Math.min(...fv), mx = Math.max(...fv);
  const h = HABS.find(x => x.k === k);
  if (k.startsWith('ev:')) { const e = EVK[k.slice(3)]; return v.map(x => (!isFinite(x) ? NODATA : e.bad ? ramp(BADR, e.bad === 'high' ? (x - mn) / (mx - mn || 1) : (mx - x) / (mx - mn || 1)) : ramp(SEQ, (x - mn) / (mx - mn || 1)))); }
  if (k === 'bre') return v.map(x => ramp(BADR, x / 4));   // 4 o más dimensiones: tono máximo
  if (h) return v.map(x => ramp(BADR, h.bad === 'high' ? (x - mn) / (mx - mn) : (mx - x) / (mx - mn)));
  return v.map(x => ramp(SEQ, (x - mn) / (mx - mn)));
}
function mapLegend(k) {
  const lg = MAP.legend;
  if (k === 'ter') { lg.innerHTML = '<b>Territorios ERD 2040</b>' + TER.map((t, i) => `<span class="row"><span class="sw" style="background:${TCOL[i]}"></span>${esc(t.n)}</span>`).join(''); return; }
  if (k === 'ipt') {
    const n = {}; IPT_DATA.forEach(it => { n[it.est] = (n[it.est] || 0) + 1; });
    lg.innerHTML = '<b>Plan regulador comunal</b>' + [['vigente', '#5CBF8A'], ['modificacion', '#F2A541'], ['formulacion', '#5598E7'], ['limite', '#E0974A'], ['sin', '#E07A6B']]
      .map(([e, c, l = PRC_L[e]]) => `<span class="row"><span class="sw" style="background:${c}"></span>${l} (${n[e] || 0})</span>`).join('');
    return;
  }
  if (k === 'lq') { lg.innerHTML = `<b>Cociente de localización en ${LIN[UI.mLin].k} ${esc(LSHORT[LIN[UI.mLin].k])} (empresas)</b>` + [[0.5, '< 0,6'], [0.8, '0,8'], [1, '1,0'], [1.25, '1,25'], [2, '> 1,7']].map(([v, l]) => `<span class="row"><span class="sw" style="background:${lqColor(v)}"></span>${l}</span>`).join(''); return; }
  const v = ALLC.map(c => comVal(k, c)).filter(isFinite), mn = Math.min(...v), mx = Math.max(...v), it = MAPIND.find(m => m.k === k), h = it.hab;
  if (it.ev) { const e = it.ev, pal = e.bad ? BADR : SEQ; lg.innerHTML = `<b>${esc(e.l)} · ${esc(e.u)}${e.bad ? ' · más rojo = peor' : ''}</b>` + [0, 0.25, 0.5, 0.75, 1].map(q => { const x = e.bad === 'low' ? mx - q * (mx - mn) : mn + q * (mx - mn); return `<span class="row"><span class="sw" style="background:${ramp(pal, q)}"></span>${e.f(x)}</span>`; }).join('') + `<span class="row">Región: ${e.f(EVREG[e.k])}</span>`; return; }
  const fmt = k === 'bre' ? f0 : k === 'ipa' ? x => f1(x) + ' MM$' : k === 'emp' ? f1 : k === 'binv' ? f0 : h.f;
  if (k === 'bre') { lg.innerHTML = `<b>${esc(it.l)}</b>` + [0, 1, 2, 3, 4].map(x => `<span class="row"><span class="sw" style="background:${ramp(BADR, x / 4)}"></span>${x}${x === 4 ? ' o más' : ''}</span>`).join(''); return; }
  const pal = h ? BADR : SEQ;
  lg.innerHTML = `<b>${esc(it.l)}${h ? ' · más rojo = peor' : ''}</b>` + [0, 0.25, 0.5, 0.75, 1].map(q => { const x = h && h.bad === 'low' ? mx - q * (mx - mn) : mn + q * (mx - mn); return `<span class="row"><span class="sw" style="background:${ramp(pal, q)}"></span>${fmt(x)}</span>`; }).join('');
}
// ================= mapas interactivos (Leaflet) =================
// Los tres visores (Territorios, Empresas e Iniciativas BIP) usan createMapL. Si Leaflet no carga (por ejemplo, sin internet),
// cada uno vuelve a su versión SVG fija.
const HAS_LF = typeof window.L !== 'undefined' && typeof window.L.map === 'function';
// coordenadas del mapa (UTM 18S escalado; mismos límites que prep_frpd.py) → latitud y longitud WGS84
const UTM0 = { minx: 629128.7821792153, maxy: 5838267.49994959, s: 1000 / 234350.36251161912 };
function svgLL(x, y) {
  const E = x / UTM0.s + UTM0.minx - 500000, Nn = UTM0.maxy - y / UTM0.s - 10000000;
  const a = 6378137, f = 1 / 298.257223563, k0 = 0.9996, e2 = f * (2 - f), ep2 = e2 / (1 - e2);
  const mu = Nn / k0 / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 ** 3 / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const p1 = mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu) + (21 * e1 * e1 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu) + (151 * e1 ** 3 / 96) * Math.sin(6 * mu) + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);
  const sn = Math.sin(p1), cs = Math.cos(p1), tn = Math.tan(p1);
  const N1 = a / Math.sqrt(1 - e2 * sn * sn), T1 = tn * tn, C1 = ep2 * cs * cs, R1 = a * (1 - e2) / Math.pow(1 - e2 * sn * sn, 1.5), Dd = E / (N1 * k0);
  const lat = p1 - (N1 * tn / R1) * (Dd * Dd / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * Dd ** 4 / 24 + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * Dd ** 6 / 720);
  const lon = (Dd - (1 + 2 * T1 + C1) * Dd ** 3 / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * Dd ** 5 / 120) / cs;
  return [lat * 180 / Math.PI, -75 + lon * 180 / Math.PI];
}
const ringsLL = d => (String(d).match(/M[^MZ]+/g) || []).map(r => r.slice(1).split('L').map(q => { const [x, y] = q.split(',').map(Number); return svgLL(x, y); }));
const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const LF_BASES = [
  { k: 'topo', l: 'Topográfico', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', att: 'Mapa: © <a href="https://opentopomap.org" target="_blank" rel="noopener">OpenTopoMap</a> (CC-BY-SA) · Datos: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>, SRTM', max: 17, op: 45 },
  { k: 'sat', l: 'Satélite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', att: 'Imágenes © <a href="https://www.esri.com" target="_blank" rel="noopener">Esri</a> · Fuente: Esri, Maxar, Earthstar Geographics y GIS User Community', max: 18, op: 40 },
  { k: 'osm', l: 'Calles', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', att: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>', max: 19, op: 45 },
  { k: 'none', l: 'Sin fondo', ok: true },
];
const LF_BASE = Object.fromEntries(LF_BASES.map(b => [b.k, b]));
// prueba de teselas en línea, una vez para todos los mapas (en Claude la política de seguridad las bloquea)
const LF_TILE = {}, LF_WAIT = [], LF_PREF = { base: null };
let LF_PROBED = false, LF_N = 0;
function lfProbe(cb) {
  LF_WAIT.push(cb);
  if (LF_PROBED) { cb(); return; }
  LF_PROBED = true;
  LF_BASES.filter(b => b.url).forEach(b => {
    const im = new Image(), done = ok => { LF_TILE[b.k] = ok; LF_WAIT.forEach(f => f()); };
    im.onload = () => done(true); im.onerror = () => done(false);
    im.src = b.url.replace('{s}', 'a').replace('{z}', '7').replace('{x}', '38').replace('{y}', '78');
  });
}
function lfHatch() {
  if (document.getElementById('lf-hatch')) return;
  const s = svgEl('svg', { width: 0, height: 0, 'aria-hidden': 'true', style: 'position:absolute;width:0;height:0;overflow:hidden' });
  s.innerHTML = '<defs><pattern id="lf-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="9" fill="#F2A541" fill-opacity=".55"/></pattern></defs>';
  document.body.appendChild(s);
}
const lfTip = (ev, t) => (Array.isArray(t) ? showTip(ev, t[0], t[1], t[2]) : showTip(ev, t.title, t.rows, t.note));
// opt: tip(ci), click(ci), selected() → comunas marcadas, terLabels(), hoverTer(), labelMode ('auto' | 'layers'),
//      layerKeys + buildLayer(k, api) para capas adicionales, col (contenedor para pantalla completa), sub ([elemento, texto])
function createMapL(host, opt = {}) {
  const n = ++LF_N;
  let col = opt.col;
  if (!col) { col = document.createElement('div'); host.before(col); col.appendChild(host); }
  col.classList.add('lf-col'); host.classList.add('lf');
  const map = L.map(host, { zoomControl: false, zoomSnap: 0.25, zoomDelta: 0.5, wheelPxPerZoomLevel: 100, maxBoundsViscosity: 0.9, maxZoom: 15, fadeAnimation: !REDUCED, zoomAnimation: !REDUCED, markerZoomAnimation: !REDUCED });
  map.attributionControl.setPrefix(false);
  L.control.zoom({ position: 'topleft', zoomInTitle: 'Acercar', zoomOutTitle: 'Alejar' }).addTo(map);
  L.control.scale({ imperial: false, position: 'bottomleft', maxWidth: 110 }).addTo(map);
  [['base', 200], ['over', 405], ['mask', 410], ['hl', 415], ['pts', 430], ['obras', 450], ['labs', 460]].forEach(([p, z]) => { const pn = map.createPane(p); pn.style.zIndex = z; if (p !== 'pts' && p !== 'obras') pn.style.pointerEvents = 'none'; });
  const C = { sel: css('--sel'), ink: css('--ink'), ink2: css('--ink2'), mid: css('--mid'), bg: css('--mapbg'), line: css('--line2') };
  // comunas (relleno interactivo), territorios y máscara fuera de la región
  const outline = ringsLL(D.geo.outline), rb = L.latLngBounds(outline.flat());
  const comLL = D.comunas.map(c => ringsLL(c.d)), terLL = TER.map(t => ringsLL(t.d));
  let mop = 70, opTouched = false;
  const comL = D.comunas.map((c, ci) => L.polygon(comLL[ci], { weight: 0.8, color: C.bg, opacity: 0.9, fillColor: NODATA, fillOpacity: mop / 100, smoothFactor: 0.6 }).addTo(map));
  L.polygon([[[-85, -180], [-85, 180], [85, 180], [85, -180]], ...outline], { pane: 'mask', stroke: false, fillColor: C.bg, fillOpacity: 0.93, interactive: false }).addTo(map);
  L.polygon(outline, { pane: 'hl', fill: false, color: C.ink2, weight: 1.3, opacity: 0.85, interactive: false }).addTo(map);
  L.layerGroup(terLL.map(r => L.polygon(r, { pane: 'hl', fill: false, color: C.ink, weight: 1.7, opacity: 0.7, interactive: false }))).addTo(map);
  const hov = L.polygon([], { pane: 'hl', fill: false, color: C.ink, weight: 2.2, interactive: false }).addTo(map);
  const selG = L.layerGroup().addTo(map);
  comL.forEach((pg, ci) => {
    pg.on('mouseover', e => { hov.setLatLngs(opt.hoverTer && opt.hoverTer() ? terLL[TOF[ci]] : comLL[ci]); if (opt.tip) lfTip(e.originalEvent, opt.tip(ci)); });
    pg.on('mousemove', e => placeTip(e.originalEvent));
    pg.on('mouseout', () => { hov.setLatLngs([]); hideTip(); });
    pg.on('click', () => { hideTip(); if (opt.click) opt.click(ci); });
  });
  // etiquetas
  const lab = (ll, txt, cls) => L.marker(ll, { pane: 'labs', interactive: false, keyboard: false, icon: L.divIcon({ className: 'lf-lab' + (cls ? ' ' + cls : ''), html: `<span>${esc(txt)}</span>`, iconSize: [0, 0] }) });
  const comLab = D.comunas.map(c => lab(svgLL(+c.lx, +c.ly), c.l)), terLab = TER.map(t => lab(svgLL(+t.lx, +t.ly), t.n, 't'));
  const labG = L.layerGroup().addTo(map);
  let layerSet = new Set(), terSel = [];
  const z0 = () => map.getBoundsZoom(rb, false, L.point(12, 12));
  function labels() {
    labG.clearLayers();
    const sel = new Set(opt.selected ? opt.selected() : []);
    if (opt.labelMode === 'layers') {
      if (layerSet.has('tl')) terLab.forEach(m => labG.addLayer(m));
      if (layerSet.has('cl')) comLab.forEach(m => labG.addLayer(m));
    } else {
      const ter = !!(opt.terLabels && opt.terLabels()), near = map.getZoom() >= z0() + 0.9;
      if (ter) terLab.forEach(m => labG.addLayer(m));
      if (!ter || near) D.comunas.forEach((c, ci) => { if (near || LABEL_CORE.has(c.l) || sel.has(ci)) labG.addLayer(comLab[ci]); });
    }
    comLab.forEach((m, ci) => { const el = m.getElement(); if (el) el.classList.toggle('on', sel.has(ci)); });
    terLab.forEach((m, j) => { const el = m.getElement(); if (el) el.classList.toggle('on', terSel.includes(j)); });
  }
  // capas adicionales (se construyen al activarlas)
  const built = {};
  function setLayers(set) {
    layerSet = new Set(set);
    for (const k of opt.layerKeys || []) {
      if (layerSet.has(k)) { if (!built[k]) built[k] = opt.buildLayer(k, api); if (built[k] && !map.hasLayer(built[k])) built[k].addTo(map); }
      else if (built[k] && map.hasLayer(built[k])) map.removeLayer(built[k]);
    }
    labels();
  }
  // controles bajo el mapa: fondo, relleno, vista regional y pantalla completa
  const tools = document.createElement('div'); tools.className = 'lf-tools';
  tools.innerHTML = `<div class="seg" role="group" aria-label="Mapa base"></div><label class="lf-op" for="lf-op-${n}">Relleno <input type="range" id="lf-op-${n}" min="0" max="100" step="5" value="70"><b>70%</b></label><span class="lf-btn"><button type="button" class="btn sm" data-a="home">Vista regional</button><button type="button" class="btn sm" data-a="full">Pantalla completa</button></span>`;
  const note = document.createElement('p'); note.className = 'note lf-note'; note.hidden = true;
  const legend = document.createElement('div'); legend.className = 'legend';
  host.after(tools); tools.after(note); note.after(legend);
  const segB = tools.querySelector('.seg'), opIn = tools.querySelector('input'), opV = tools.querySelector('.lf-op b'), fullB = tools.querySelector('[data-a="full"]');
  const setOp = v => { mop = v; opIn.value = v; opV.textContent = v + '%'; comL.forEach(pg => pg.setStyle({ fillOpacity: mop / 100 })); };
  let base = 'none', baseL = null, baseTouched = false;
  function setBase(k) {
    if (baseL) { map.removeLayer(baseL); baseL = null; }
    const b = LF_BASE[k]; base = k;
    map.setMaxZoom(b.max || 15);
    if (!opTouched) setOp(b.op || 70);
    if (b.url) {
      baseL = L.tileLayer(b.url, { pane: 'base', attribution: b.att, maxZoom: b.max, subdomains: b.sub || 'abc' }).addTo(map);
      let ok = 0, bad = 0;
      baseL.on('tileload', () => { ok++; });
      baseL.on('tileerror', () => { if (++bad >= 3 && !ok && base === k) { LF_TILE[k] = false; setBase('none'); drawTools(); } });
    }
  }
  function drawTools() {
    segB.innerHTML = LF_BASES.map(b => { const off = b.url ? LF_TILE[b.k] === false : !b.ok; return `<button type="button" data-k="${b.k}" aria-pressed="${base === b.k}"${off ? ' disabled title="No disponible en esta vista"' : ''}>${b.l}</button>`; }).join('');
    const blocked = LF_BASES.filter(b => b.url && LF_TILE[b.k] === false).map(b => b.l.toLowerCase());
    note.hidden = !blocked.length;
    if (blocked.length) note.textContent = `Los fondos en línea (${blocked.length > 1 ? blocked.slice(0, -1).join(', ') + ' y ' + blocked[blocked.length - 1] : blocked[0]}) no cargan en esta vista; ábrelos en la versión web o local del radar. Aquí el mapa se muestra sin fondo.`;
  }
  // fondo inicial: el que se eligió en otro mapa o, si no, el primero disponible en el orden topográfico, satélite, calles
  function autoPick() {
    if (baseTouched) return;
    if (LF_PREF.base && (LF_PREF.base === 'none' || LF_TILE[LF_PREF.base])) { if (base !== LF_PREF.base) setBase(LF_PREF.base); return; }
    for (const b of LF_BASES.filter(x => x.url)) {
      if (LF_TILE[b.k] === undefined) return;
      if (LF_TILE[b.k]) { if (base !== b.k) setBase(b.k); return; }
    }
  }
  segB.addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b || b.disabled) return; baseTouched = true; LF_PREF.base = b.dataset.k; setBase(b.dataset.k); drawTools(); });
  opIn.addEventListener('input', () => { opTouched = true; setOp(+opIn.value); });
  // vista: región completa, sin salir de ella
  function home(anim) { map.fitBounds(rb, { padding: [12, 12], animate: anim && !REDUCED }); }
  tools.querySelector('[data-a="home"]').addEventListener('click', () => home(true));
  const fsOk = !!(col.requestFullscreen && document.fullscreenEnabled);
  fullB.hidden = !fsOk;
  fullB.addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else col.requestFullscreen().catch(() => { fullB.hidden = true; }); });
  document.addEventListener('fullscreenchange', () => { fullB.textContent = document.fullscreenElement === col ? 'Salir de pantalla completa' : 'Pantalla completa'; setTimeout(() => map.invalidateSize(), 60); });
  map.setMaxBounds(rb.pad(0.3));
  home(false);
  map.setMinZoom(Math.floor((z0() - 0.75) * 4) / 4);
  let touched = false; ['pointerdown', 'wheel', 'keydown'].forEach(ev => host.addEventListener(ev, () => { touched = true; }, { passive: true }));
  new ResizeObserver(() => { if (host.clientWidth < 50) return; map.invalidateSize(); map.setMinZoom(Math.floor((z0() - 0.75) * 4) / 4); if (!touched) home(false); }).observe(host);
  map.on('zoomend', () => labels());
  if (opt.sub && opt.sub[0]) opt.sub[0].textContent = opt.sub[1];
  setBase('none'); drawTools(); lfProbe(() => { autoPick(); drawTools(); });
  const api = {
    map, legend, C, comLL, terLL, rb, z0, labels, setLayers, home,
    paint(fills, selected = [], tsel = []) {
      comL.forEach((pg, ci) => pg.setStyle({ fillColor: fills[ci], fillOpacity: mop / 100 }));
      selG.clearLayers();
      for (const ci of selected) selG.addLayer(L.polygon(comLL[ci], { pane: 'hl', fill: false, color: C.sel, weight: 3, interactive: false }));
      terSel = [...tsel];
      for (const j of terSel) selG.addLayer(L.polygon(terLL[j], { pane: 'hl', fill: false, color: C.sel, weight: 3, interactive: false }));
      labels();
    },
    fly(lev, j) {
      const b = lev === 'com' && j >= 0 ? L.latLngBounds(comLL[j].flat()) : lev === 'ter' && j >= 0 ? L.latLngBounds(terLL[j].flat()) : rb;
      map.flyToBounds(b, { padding: [24, 24], maxZoom: 11, animate: !REDUCED, duration: 0.6 });
    },
  };
  return api;
}
// un mapa Leaflet si está disponible; si no, o si falla, la versión SVG
function mapAuto(host, opt, fallback) {
  if (HAS_LF) {
    try { return createMapL(host, opt); }
    catch (e) { console.warn('Leaflet no pudo iniciar; se usa el mapa SVG:', e); const col = host.closest('.lf-col') || host.parentElement; col.querySelectorAll('.lf-tools,.lf-note,.legend').forEach(x => x.remove()); host.classList.remove('lf'); host.replaceChildren(); }
  }
  return fallback();
}
// capas de infraestructura del mapa de Territorios
function lfInfra(k, api) {
  const g = L.layerGroup(), C = api.C, cv = api.ptsR || (api.ptsR = L.canvas({ pane: 'pts', padding: 0.4, tolerance: 2 }));
  const line = (d, o) => ringsLL(d).forEach(r => { if (r.length > 1) g.addLayer(L.polyline(r, { pane: 'over', interactive: false, lineCap: 'round', lineJoin: 'round', ...o })); });
  const dots = (arr, color, w, op) => arr.forEach(p => g.addLayer(L.circleMarker(svgLL(p[0], p[1]), { renderer: cv, pane: 'pts', interactive: false, radius: w / 2, stroke: false, fillColor: color, fillOpacity: op || 0.9 })));
  const hot = (arr, color, w, tipf, sq) => arr.forEach(p => {
    const ll = svgLL(p[0], p[1]);
    const m = sq ? L.marker(ll, { pane: 'pts', keyboard: false, icon: L.divIcon({ className: 'lf-sq', html: `<i style="background:${color}"></i>`, iconSize: [w, w] }) })
      : L.circleMarker(ll, { renderer: cv, pane: 'pts', radius: w / 2, weight: 1, color: C.bg, opacity: 0.9, fillColor: color, fillOpacity: 0.95, bubblingMouseEvents: false });
    m.on('mouseover', e => { const t = tipf(p); showTip(e.originalEvent, t[0], t[1], t[2]); });
    m.on('mousemove', e => placeTip(e.originalEvent));
    m.on('mouseout', hideTip);
    g.addLayer(m);
  });
  if (k === 'rez') { lfHatch(); ALLC.filter(c => IN.rez[c]).forEach(c => g.addLayer(L.polygon(api.comLL[c], { pane: 'over', stroke: false, fillColor: 'url(#lf-hatch)', fillOpacity: 1, interactive: false }))); }
  if (k === 'rut') for (const r of D.geo.rutas) if (r.c !== 'pavimentada') line(r.d, { color: '#D3DCE0', weight: 1.6, opacity: 0.75 });
  if (k === 'elec') { MP.elec.forEach(l => line(l.d, { color: css('--ln-elec'), weight: l.kv >= 200 ? 2.4 : 1.3, opacity: 0.85 })); hot(MP.sub, css('--ln-elec'), 9, p => [p[2], [[p[3], 'tensión']], 'Subestación eléctrica (CEN)'], true); }
  if (k === 'erd') { line(MP.ferro, { color: css('--ln-erd'), weight: 2, dashArray: '7 5' }); line(MP.bioc, { color: css('--ln-erd'), weight: 3.2 }); }
  if (k === 'pue') dots(MP.pue.filter(p => p[2]), css('--pt-pue'), 4, 0.8);
  if (k === 'ant') dots(MP.ant, css('--pt-ant'), 4, 0.75);
  if (k === 'ssr') hot(MP.ssr, css('--pt-ssr'), 7, p => [p[2], [[f0(p[3]), 'beneficiarios estimados'], [p[4] ? 'Sí' : 'No', 'grupo electrógeno']], 'Servicio sanitario rural (DOH)']);
  if (k === 'ies') hot(MP.ies, css('--pt-ies'), 11, p => [p[2], [[p[3], 'tipo']], 'Sede de educación superior (Mineduc 2020)']);
  if (k === 'port') hot(MP.port, css('--pt-port'), 8, p => [p[2], [[p[3] || '–', 'programa']], 'Obra portuaria (DOP)'], true);
  if (k === 'aer') { hot(MP.aer, css('--pt-aer'), 8, p => [p[2], [], 'Red aeroportuaria'], true); hot(MP.front, css('--sel'), 11, p => [p[2], [], 'Paso fronterizo'], true); }
  return g;
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
  svg.addEventListener('pointerup', () => { if (drag && !drag.moved && drag.ci >= 0) trMapPick(drag.ci); drag = null; });
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
  if (k === 'ipt') { rows.push([PRC_L[IPT_DATA[c].est], 'plan regulador comunal']); if (/^D\.O\./.test(IPT_DATA[c].prcAno)) rows.push([IPT_DATA[c].prcAno, 'publicación']); }
  else if (k === 'ter' || k === 'bre') { const g = trData().com[c]; rows.push(g.length ? [g.map(x => IF_DIM[x].l).join(', '), 'en brecha'] : ['Sin dimensiones de infraestructura', 'en brecha']); }
  else if (k === 'ipa') rows.push([f1(IN.ipapc[c] / 1e6) + ' MM$', 'inversión pública 2010–2022 por hab.']);
  else if (k === 'emp') rows.push([f1(comVal('emp', c)), 'empresas por 1.000 hab.']);
  else if (k === 'binv') rows.push([f0(binvC[c]) + ' MM$', `BIP habilitante 2019–2027 (${f0(comVal('binv', c))} mil $ por hab.)`]);
  else if (k === 'lq') rows.push([f2(comVal('lq', c)), `cociente en ${LIN[UI.mLin].k}`]);
  else if (k.startsWith('ev:')) { const e = EVK[k.slice(3)]; rows.push([e.f(EVV[e.k][c]), e.l + ' · ' + e.u]); if (!e.sum) rows.push([e.f(EVREG[e.k]), 'región']); }
  else { const h = HABS.find(x => x.k === k); rows.push([h.f(HV[k][c]), h.l + ' · ' + h.u]); }
  rows.push([f0(POP[c]), 'habitantes (Censo 2024)']);
  const sub = [IN.rez[c] ? 'Zona de rezago' : '', TER[TOF[c]].prcSin.includes(c) ? 'Sin plan regulador vigente' : ''].filter(Boolean).join(' · ');
  return [CN(c), rows, sub];
}
let MAP = null;
function initMap() {
  MAP = mapAuto($('#map'), { tip: comTip, click: trMapPick, labelMode: 'layers', layerKeys: LAYERS.map(l => l.k).filter(k => k !== 'tl' && k !== 'cl'), buildLayer: lfInfra,
    sub: [$('#m-sub'), 'Clic en una comuna para elegir su territorio · rueda o botones para acercar, arrastra para moverte'] }, () => createMap($('#map')));
  if (MAP.map) { const m = MAP; MAP = { legend: m.legend, setLayers: set => m.setLayers(set), paint: (fills, ti) => m.paint(fills, [], ti >= 0 ? [ti] : []) }; }
  const og = {}; MAPIND.forEach(m => { const g = m.grp || 'Territorio e infraestructura'; (og[g] = og[g] || []).push(m); });
  $('#m-ind').innerHTML = Object.entries(og).map(([g, ms]) => `<optgroup label="${esc(g)}">${ms.map(m => `<option value="${m.k}">${esc(m.l)}</option>`).join('')}</optgroup>`).join('');
  $('#m-lin').innerHTML = LIN.map((l, i) => `<option value="${i}">${l.k} · ${esc(LSHORT[l.k])}</option>`).join('');
  $('#m-ind').addEventListener('change', e => { UI.mInd = e.target.value; renderMapOnly(); });
  $('#m-lin').addEventListener('change', e => { UI.mLin = +e.target.value; renderMapOnly(); });
  const lyItem = l => `<label><input type="checkbox" data-layer="${l.k}"${UI.layers.has(l.k) ? ' checked' : ''}>${l.sw ? `<span class="k${l.sw === 'h' ? ' h' : l.line ? ' l' : ''}" style="${l.sw === 'h' ? '' : l.line ? `border-color:${l.sw.startsWith('--') ? `var(${l.sw})` : l.sw}` : `background:var(${l.sw})`}"></span>` : ''}${esc(l.l)}</label>`;
  const LGRP = [['Referencias', ['tl', 'cl', 'rez']], ['Transporte y conectividad', ['rut', 'erd', 'pue', 'port', 'aer']], ['Servicios y equipamiento', ['elec', 'ssr', 'ant', 'ies']]];
  const lyIn = new Set(LGRP.flatMap(g => g[1])), lyRest = LAYERS.filter(l => !lyIn.has(l.k));
  $('#layers').insertAdjacentHTML('beforeend', LGRP.map(([g, ks]) => `<div class="lgrp"><b>${g}</b>${ks.map(k => LAYERS.find(l => l.k === k)).filter(Boolean).map(lyItem).join('')}</div>`).join('') + (lyRest.length ? `<div class="lgrp"><b>Otras</b>${lyRest.map(lyItem).join('')}</div>` : ''));
  $$('#layers [data-layer]').forEach(cb => cb.addEventListener('change', () => { if (cb.checked) UI.layers.add(cb.dataset.layer); else UI.layers.delete(cb.dataset.layer); MAP.setLayers(UI.layers); renderMapNote(); lyCount(); }));
  MAP.setLayers(UI.layers); lyCount();
}
function lyCount() { const n = UI.layers.size; $('#ly-n').textContent = n ? `· ${n} ${n === 1 ? 'activa' : 'activas'}` : ''; }
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
  if (UI.mInd === 'ipt') n.push('Plan regulador: qué comunas no lo tienen vigente viene de la ERD 2040 (Tabla 14); el detalle del estado no está verificado.');
  if (UI.mInd === 'bre') n.push('Una dimensión está en brecha cuando alguno de sus indicadores cae en el tercio peor de las comunas; educación superior, cuando el territorio no tiene sedes.');
  if (UI.mInd === 'vse') n.push('Viviendas sin energía: la capa registra 50 en ocho comunas, lo que sugiere un valor mínimo de la fuente.');
  if (UI.mInd.startsWith('ev:')) { const e = EVK[UI.mInd.slice(3)]; n.push(EVSRC[e.g].map(k => CX.meta[k]).join(' ')); if (e.k === 'inu') n.push('Una comuna sin zonas puede estar fuera del área estudiada.'); }
  setNote($('#m-note'), n.join(' '), 'Más notas de las capas activas');
}
// ================= TERRITORIOS: selector, lectura y tablas por comuna =================
// Tres preguntas por territorio, en orden: en qué destaca, qué lo frena y qué hay en cartera.
// No cambia con los filtros de empresas (usa SII0 y LQ0). «Brecha» es siempre la de las seis dimensiones de infraestructura (IF_DIM, en infra.js).
let TR_C = null;
function trData() {
  if (!TR_C) {
    const com = ALLC.map(c => Object.keys(IF_DIM).filter(k => ifDim(k, [c]).gap));
    TR_C = { com, ter: TER.map((T, ti) => { const dims = Object.keys(IF_DIM).map(k => ifDim(k, T.c)); return { dims, nGap: dims.filter(d => d.gap).length, ch: STRAT_CHAINS.map((c, ci) => ({ ...ifCell('ter', ti, ci), ci })), cg: T.c.filter(c => com[c].length).sort((a, b) => com[b].length - com[a].length || POP[b] - POP[a]) }; }) };
  }
  return TR_C;
}
const fMil = v => (v >= 1e5 ? f0(v / 1000) : f1(v / 1000)) + ' mil';
function renderTerPick() {
  const d = trData().ter;
  $('#tr-pick').innerHTML = TER.map((T, i) => `<button type="button" class="tr-p" data-t="${i}" aria-pressed="${i === UI.ter}" style="--tc:${TCOL[i]}"><b>${esc(T.n)}</b><span>${fMil(T.pop)} hab.</span><span class="g${d[i].nGap ? '' : ' z'}" title="Dimensiones de infraestructura en brecha en el agregado del territorio">Agregado: ${d[i].nGap} de ${d[i].dims.length}</span><span title="Comunas con alguna dimensión en brecha">Comunas: ${d[i].cg.length} de ${T.c.length}</span></button>`).join('');
}
function trSelect(ti, focusSel) {
  if (ti === UI.ter) return;
  UI.ter = ti; renderTerritorios();
  const el = focusSel && $(focusSel); if (el) el.focus({ preventScroll: true });
}
// elegir en el mapa: si la lectura queda fuera de la vista (mapa debajo), se lleva hasta ella
function trMapPick(ci) {
  trSelect(TOF[ci]);
  if (innerWidth <= 1100) { trReveal($('#tprof')); $('#tp-title').focus({ preventScroll: true }); }
}
// de Territorios a Formular, con vuelta al mismo punto
function trFormular(t, ci, sel) { fmOpen(t, ci, { src: 'ter', t, ci, L: null, line: null, ch: ci >= 0, back: { sy: scrollY, sel, ter: UI.ter } }); }
function trBack(fr) {
  const bk = fr.back || {};
  if (bk.ter != null) UI.ter = bk.ter;
  setView('territorios'); window.scrollTo(0, bk.sy || 0);
  const el = bk.sel && $(bk.sel); if (el) el.focus({ preventScroll: true });
}
// de Territorios a una ficha de Cartera o a Iniciativas BIP: se guarda el punto de partida para ofrecer la vuelta
let TR_RET = null;
function trReturn() { const r = TR_RET; if (!r) return; if (UI.fOpen) closeFicha(true); TR_RET = null; trBack({ back: r }); }
const trFromHtml = (r, idB, idX) => `<p><b>Vienes de Territorios:</b> ${esc(TER[r.ter].n)}${r.what ? ` · ${esc(r.what)}` : ''}.</p><div class="ct-ob"><button type="button" class="btn sm" id="${idB}">Volver a Territorios</button><button type="button" class="btn sm" id="${idX}">Quitar este aviso</button></div>`;
function renderBxFrom() { const bf = $('#bx-from'), on = !!(TR_RET && TR_RET.kind === 'bip'); bf.hidden = !on; bf.innerHTML = on ? trFromHtml(TR_RET, 'bx-back', 'bx-fromx') : ''; }
$('#bx-from').addEventListener('click', e => { if (e.target.closest('#bx-back')) trReturn(); else if (e.target.closest('#bx-fromx')) { TR_RET = null; renderBxFrom(); $('#bx-q').focus(); } });
const TR_OPEN = new Set();
const a8Txt = a8 => (a8 === '–' ? 'Fuera de las categorías del art. 8: se financia por otras vías' : `Candidata al FRPD, art. 8 ${a8.startsWith('N') ? a8 : 'N°' + a8[0] + ' letra ' + a8[1]}`);
const chg = v => (Math.round(v * 100) === 0 ? 'sin cambio' : pcs(v));
function renderTprof() {
  const ti = UI.ter, T = TER[ti], D0 = trData(), d = D0.ter[ti], S = SII0;
  const ents = ENT.filter(e => e.t === T.k).sort((a, b) => b.m - a.m || a.c.localeCompare(b.c));
  const lqs = LIN.map((l, L) => ({ L, k: l.k, v: LQ0[ti][L] }));
  const top = lqs.filter(q => lq2(q.v) >= 1.1).sort((a, b) => b.v - a.v);
  const mxq = Math.max(2, ...lqs.map(q => q.v)), x = v => Math.min(100, v / mxq * 100);
  const pres = d.ch.filter(c => c.pres).sort((a, b) => b.n - a.n), aus = d.ch.filter(c => !c.pres);
  const gaps = d.dims.filter(m => m.gap), sinInv = gaps.filter(m => !m.inv.n), nD = d.dims.length;
  const noEnt = lqs.filter(q => cellEmpty(ti, q.L)), n3 = ents.filter(e => e.m === 3).length;
  const ies = iesOfTer(ti), gTot = sum(TER.map(t => t.gore || 0)), rez = T.c.filter(c => IN.rez[c]);
  const inT = []; for (let i = 0; i < NFN; i++) if (FN_T[i] === ti) inT.push(i);
  const tfin = [['ANID (sede en el territorio)', inT.filter(i => FN_S[i] === S_ANID)], ['CORFO InnovaChile', inT.filter(i => FN_S[i] === S_CORFO)]]
    .concat(Object.keys(BIPCAT).map(g => [`BIP · ${BIPCAT[g]}`, inT.filter(i => FN_S[i] === S_BIP && fnG(i) === g)]));
  // las tres conclusiones
  const c1 = `${top.length ? `Lineamientos CTCI sobre el promedio regional: <b>${esc(top.map(q => LSHORT[q.k]).join(' · '))}</b>.` : 'Ningún lineamiento CTCI supera el promedio regional.'} ${pres.length ? `Cadenas presentes y sus empresas: ${pres.map(c => `<b>${esc(ifShort(c.ch))}</b> ${f0(c.n)}`).join(' · ')}.` : 'Ninguna cadena productiva alcanza presencia.'}`;
  const invTxt = !gaps.length ? '' : !sinInv.length ? (gaps.length === 1 ? 'Tiene' : `Las ${gaps.length} tienen`) + ' alguna iniciativa BIP postulada desde 2025.'
    : sinInv.length === gaps.length ? (gaps.length === 1 ? 'No tiene' : 'Ninguna tiene') + ' iniciativas BIP postuladas desde 2025.' : `${sinInv.length} de ellas sin iniciativas BIP postuladas desde 2025.`;
  const comTxt = d.cg.length ? ` Dimensiones en brecha por comuna: ${esc(d.cg.map(c => `${CN(c)} ${D0.com[c].length}`).join(' · '))}.` : '';
  const c2 = (gaps.length ? `<b>${gaps.length} de ${nD}</b> dimensiones de infraestructura en brecha en el agregado del territorio: <b>${esc(gaps.map(m => m.d.l).join(' · '))}</b>. ${invTxt}`
    : `Ninguna de las ${nD} dimensiones de infraestructura está en brecha en el agregado del territorio${d.cg.length ? `, pero ${d.cg.length} de sus ${T.c.length} comunas ${d.cg.length === 1 ? 'tiene' : 'tienen'} alguna` : ''}.`) + comTxt;
  const c3 = `<b>${pl(ents.length, 'entrada', 'entradas')}</b>${ents.length ? `, ${n3} con evidencia levantada` : ''}. ${noEnt.length ? `Sin entrada en ${esc(listY(noEnt.map(q => `${q.k} ${LSHORT[q.k]}${lq2(q.v) >= 1.1 ? ` (cociente ${f2(q.v)}, sobre el promedio)` : ''}`)))}.` : 'Tiene entrada en los seis lineamientos.'}`;
  const dimRow = m => {
    const req = m.gap ? pres.filter(c => (IF_REQ[c.ch.id] || []).includes(m.k)).map(c => ifShort(c.ch)) : [];
    const cg = m.k === 'con' ? [] : T.c.filter(c => D0.com[c].includes(m.k));
    return `<div class="tr-dim${m.gap ? ' gap' : ''}">
      <div class="a"><b>${esc(m.d.l)}</b>${m.inds.map(i => `<small${i.gap ? ' class="g"' : ''}>${i.gap ? '<span aria-hidden="true">▲ </span>' : ''}${esc(i.l)}: <b>${esc(i.txt)}</b>${i.u && !/^(%|horas)/.test(i.u) ? ' ' + esc(i.u) : ''}${m.k === 'con' ? '' : ` · región ${esc(i.reg)}`}${i.gap ? '<span class="sr"> (en el tercio peor)</span>' : ''}</small>`).join('')}${cg.length ? `<small>Comunas en brecha: ${esc(cg.map(CN).join(' · '))}</small>` : ''}</div>
      <div class="b"><span class="pill${m.gap ? ' bad' : ''}">${m.gap ? 'En brecha' : 'Fuera del tercio peor'}</span>${req.length ? `<small>La requieren (supuesto): ${esc(req.join(' · '))}</small>` : ''}</div>
      <div class="c">${m.inv.n ? `<span><b>${pl(m.inv.n, 'iniciativa BIP', 'iniciativas BIP')}</b>${m.k === 'con' ? ` de ${esc(BIPCAT[m.d.cat])}` : ''} ${m.inv.n === 1 ? 'postulada' : 'postuladas'} desde ${IF_Y0} · ${mmK(m.inv.t)} MM$${m.inv.rs ? ` · ${f0(m.inv.rs)} con RS` : ''}</span><button type="button" class="linkbtn" data-cat="${m.d.cat}" data-dim="${esc(m.d.l)}" aria-label="Ver las iniciativas BIP de ${esc(m.d.l)}">Ver estas iniciativas</button>`
        : m.gap ? `<span class="pill warn">Sin iniciativas BIP desde ${IF_Y0}</span><small>${a8Txt(m.d.a8)}</small>` : `<small>Sin iniciativas BIP desde ${IF_Y0}</small>`}</div>
    </div>`;
  };
  const sec = (key, body) => `<details class="psec"${TR_OPEN.has(key) ? ' open' : ''} data-k="${key}"><summary><span class="lbl">${key}</span></summary><div>${body}</div></details>`;
  $('#tprof').innerHTML = `<div class="prof">
    <div class="tr-h"><div><div class="eyebrow">Territorio ERD 2040</div><h2 id="tp-title" tabindex="-1">${esc(T.n)}</h2><p class="note">${esc(T.c.map(CN).join(' · '))}</p></div>
      <button class="btn pri" type="button" id="tp-fm">Formular en este territorio</button></div>
    <ol class="tr-lead" aria-label="Lectura en tres líneas">
      <li><button type="button" class="linkbtn" data-go="tq1">En qué destaca</button><p>${c1}</p></li>
      <li><button type="button" class="linkbtn" data-go="tq2">Qué lo frena</button><p>${c2}</p></li>
      <li><button type="button" class="linkbtn" data-go="tq3">Qué hay en cartera</button><p>${c3}</p></li>
    </ol>
    <div class="tr-stats">
      <div class="stat"><div class="l">Habitantes · Censo 2024</div><div class="v">${f0(T.pop)}</div><div class="s">${pc(T.pop / POPREG, 0)} de la región · ${chg(T.pop / T.pop17 - 1)} desde 2017</div></div>
      <div class="stat"><div class="l">Empresas · SII 2024</div><div class="v">${f0(S.tN[ti])}</div><div class="s">${f1(S.tN[ti] / T.pop * 1000)} por 1.000 hab. · región ${f1(N / POPREG * 1000)}</div></div>
      <div class="stat"><div class="l">Trabajadores dependientes</div><div class="v">${f0(S.tT[ti])}</div><div class="s">${pc(S.tT[ti] / S.totT, 0)} de la región</div></div>
      <div class="stat"><div class="l">Sedes de educación superior</div><div class="v">${ies.length}</div><div class="s">${ies.length ? esc([...new Set(ies.map(i => i.t))].join(', ')) : 'ninguna'}</div></div>
    </div>
    <section class="tr-q" aria-labelledby="tq1"><h3 id="tq1" tabindex="-1">En qué destaca</h3>
      <div class="tr-2">
        <div><span class="lbl">Por lineamiento CTCI · cociente de localización</span>
          ${lqs.map(({ k, v }) => `<div class="lqrow${lq2(v) >= 1.1 ? ' hi' : ''}"><span>${k} ${esc(LSHORT[k])}</span><span class="tr"><i style="width:${x(v)}%"></i><u style="left:${x(1)}%"></u></span><span class="x">${f2(v)}</span></div>`).join('')}
          <p class="note">Cociente: peso entre las empresas del territorio dividido por su peso en la región. La línea vertical marca 1,00 (igual que la región); se destaca desde 1,10.</p></div>
        <div><span class="lbl">Por cadena productiva · las presentes</span>
          ${pres.length ? pres.map(c => `<div class="tr-ch"><span class="n"><b>${esc(ifShort(c.ch))}</b><small>${pl(c.n, 'empresa', 'empresas')} · cociente ${f2(c.lq)}</small><small${c.gaps.length ? ' class="w"' : ''}>${c.gaps.length ? `En brecha, de lo que requiere: ${esc(c.gaps.map(g => g.d.l).join(' · '))}` : 'Sin brechas en lo que requiere'}</small></span><button type="button" class="linkbtn" data-ch="${c.ci}" aria-label="Formular con la cadena ${esc(ifShort(c.ch))}">Formular</button></div>`).join('') : '<p class="note">Ninguna reúne cinco empresas y un peso igual o mayor al regional.</p>'}
          <p class="note">Qué infraestructura requiere cada cadena es un supuesto provisional, a validar por DIFOI.${aus.length ? ` Poco presentes: ${esc(aus.map(c => ifShort(c.ch)).join(' · '))}.` : ''}</p></div>
      </div>
    </section>
    <section class="tr-q" aria-labelledby="tq2"><h3 id="tq2" tabindex="-1">Qué lo frena</h3>
      <div class="tr-dims">${[...gaps, ...d.dims.filter(m => !m.gap)].map(dimRow).join('')}</div>
      <p class="note">Cifras del agregado del territorio. En brecha: algún indicador (▲) cae en el tercio peor de las 32 comunas; en educación superior, el territorio no tiene sedes. Que una iniciativa esté postulada no implica que tenga financiamiento.${rez.length ? ` Zona de rezago: ${esc(listY(rez.map(CN)))}.` : ''}${T.prcSin.length ? ` Sin plan regulador vigente: ${esc(listY(T.prcSin.map(CN)))}.` : ''}</p>
      <div><button type="button" class="linkbtn" id="tp-com">Ver estos indicadores comuna por comuna</button></div>
    </section>
    <section class="tr-q" aria-labelledby="tq3"><h3 id="tq3" tabindex="-1">Qué hay en cartera</h3>
      <div class="tr-ents">${ents.map(e => `<button type="button" class="tr-ent" data-c="${e.c}" data-e="${e.l}">${mDots(e.m)}<span class="n">${esc(LINE[e.l].n)}</span><span class="m">${e.c} ${esc(LSHORT[e.c])} · evidencia ${MADS[e.m]}</span></button>`).join('')}</div>
      <p class="note">Cada fila abre la ficha de esa entrada en Cartera.${noEnt.length ? ` Sin entrada en ${esc(listY(noEnt.map(q => `${q.k} ${LSHORT[q.k]}`)))}.` : ''}</p>
    </section>
  </div>`;
  $('#tprof-x').innerHTML = `<div class="prof"><div><h2 class="tr-xh">Más datos de ${esc(T.n)}</h2></div>
    <div><span class="lbl">Objetivo del territorio en la ERD 2040</span><p class="quote" style="margin-top:7px">${esc(T.obj)}</p></div>
    ${sec('Más cifras', `<div class="stats">
      <div class="stat"><div class="l">Empresas con 10 o más trabajadores</div><div class="v">${f0(S.T10[ti])}</div><div class="s">${pc(S.T10[ti] / S.tN[ti])} de sus empresas</div></div>
      <div class="stat"><div class="l">Trabajo en entidades públicas</div><div class="v">${pc(S.tTpub[ti] / S.tT[ti], 0)}</div><div class="s">de sus trabajadores dependientes</div></div>
      <div class="stat"><div class="l">Ventas anuales (mill. UF)</div><div class="v">${(r => NF1.format(r.lo / 1e6) + '–' + NF1.format(r.hi / 1e6))(S.sales[ti])}</div><div class="s">rango por tramos SII${S.sales[ti].open ? ` + ${S.sales[ti].open} sin tope` : ''}</div></div>
      <div class="stat"><div class="l">Inversión pública 2010–2022</div><div class="v">${T.ipaTpc ? f1(T.ipaTpc / 1e6) : '–'} <small style="font-size:12px;color:var(--muted)">MM$/hab.</small></div><div class="s">${T.ipaT ? f0(T.ipaT / 1000) + ' mil MM$ en total' : ''}</div></div>
      <div class="stat"><div class="l">Inversión GORE 2010–2022</div><div class="v">${T.gore ? pc(T.gore / gTot, 0) : '–'}</div><div class="s">${T.gore ? f0(T.gore) + ' MM$ del total regional' : ''}</div></div>
    </div>`)}
    ${sec('Evidencia territorial', `<div class="hab"><span class="h">Indicador</span><span class="h" style="text-align:right">Territorio</span><span class="h" style="text-align:right">Región</span>
      ${['pmd', 'ind', 'sred', 'alj', 'prd', 'incp', 'upaa', 'rie', 'fcm', 'prof'].map(k => { const e = EVK[k], v = e.v(T.c), g = evGap(e, v); return `<span class="n">${esc(e.l)} <small style="color:var(--muted)">${esc(e.u.split(' · ')[0])}</small></span><span class="x"><span class="pill${g ? ' bad' : ''}">${g ? '<span aria-hidden="true">▲ </span>' : ''}${e.f(v)}${g ? '<span class="sr"> (en el tercio peor)</span>' : ''}</span></span><span class="x"><small>${e.f(EVREG[k])}</small></span>`; }).join('')}</div>
      <p class="note">▲: el valor del territorio cae en el tercio peor de las 32 comunas.</p><div><button class="btn" type="button" id="tp-ev">Ver todos los indicadores por comuna</button></div>`)}
    ${sec('Financiamiento público desde 2019', `<div class="hab"><span class="h">Fuente</span><span class="h" style="text-align:right">N°</span><span class="h" style="text-align:right">Monto</span>
      ${tfin.map(([l, ix]) => `<span class="n">${esc(l)}</span><span class="x">${f0(ix.length)}</span><span class="x"><small>${ix.length ? mm(sumM(ix)) : '–'}</small></span>`).join('')}</div>
      <p class="note">ANID por sede de la institución; CORFO InnovaChile por casa matriz del beneficiario; BIP: iniciativas postuladas 2019–2027 con comuna en el territorio, de todos los tipos de inversión (costo total de la etapa). Por eso las cifras BIP son mayores que las «postuladas desde ${IF_Y0}» de «Qué lo frena».</p><div><button class="btn" type="button" id="tp-bip">Ver las iniciativas BIP del territorio</button></div>`)}
  </div>`;
  $$('#tprof-x details.psec').forEach(det => det.addEventListener('toggle', () => { if (det.open) TR_OPEN.add(det.dataset.k); else TR_OPEN.delete(det.dataset.k); }));
}
// lleva a un bloque de la pestaña; repite el ajuste porque el mapa cambia el alto de la página al iniciarse
function trReveal(el) { const go = () => { const r = el.getBoundingClientRect(); if (r.top < 0 || r.top > innerHeight * 0.4) el.scrollIntoView({ block: 'start' }); }; go(); setTimeout(go, 400); }
function trOpenDet(id) { const d = $(id); d.open = true; trReveal(d); const s = d.querySelector('summary'); if (s) s.focus({ preventScroll: true }); }
$$('#tprof,#tprof-x').forEach(el => el.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const leave = (kind, sel, what) => { TR_RET = { kind, sy: scrollY, sel, ter: UI.ter, what }; };
  if (b.id === 'tp-fm') trFormular(UI.ter, -1, '#tp-fm');
  else if (b.dataset.go) { const h = $('#' + b.dataset.go); h.scrollIntoView({ block: 'start' }); h.focus({ preventScroll: true }); }
  else if (b.dataset.ch != null) trFormular(UI.ter, +b.dataset.ch, `#tprof button[data-ch="${b.dataset.ch}"]`);
  else if (b.dataset.e) { leave('ficha', `#tprof button[data-e="${b.dataset.e}"]`); setView('cartera'); openFicha(UI.ter, LIDX[b.dataset.c]); }
  else if (b.dataset.cat) { leave('bip', `#tprof button[data-cat="${b.dataset.cat}"]`, b.dataset.dim); openBip({ t: UI.ter, cat: b.dataset.cat, y0: IF_Y0, ti: new Set(Object.values(IF_DIM).find(x => x.cat === b.dataset.cat).prog ? [0, 3] : [0]) }); }
  else if (b.id === 'tp-bip') { leave('bip', '#tp-bip'); openBip({ t: UI.ter }); }
  else if (b.id === 'tp-ev') openEvid({ t: UI.ter });
  else if (b.id === 'tp-com') trOpenDet('#tr-com');
}));
$('#tr-pick').addEventListener('click', e => { const b = e.target.closest('button[data-t]'); if (b) trSelect(+b.dataset.t, `#tr-pick button[data-t="${b.dataset.t}"]`); });
// tabla por comuna: los indicadores de cada dimensión de infraestructura
const HCOLS = [
  { k: 'com', l: 'Comuna', s: c => CN(c) },
  { k: 'pop', l: 'Habitantes 2024', r: 1, s: c => POP[c], f: c => f0(POP[c]) },
  ...['pav', 'pmad', 'saidi', 'ant'].map(k => HABS.find(h => h.k === k)).map(h => ({ k: h.k, l: `${h.l.replace(' (SAIDI 2022)', '')} · ${h.u}`, r: 1, s: c => HV[h.k][c], f: c => (h.u.startsWith('%') ? pc(HV[h.k][c], 1) : h.f(HV[h.k][c])), gap: c => isGap(h, HV[h.k][c]) })),
  ...['sred', 'rie'].map(k => EVK[k]).map(e => ({ k: e.k, l: `${e.l} · ${e.u.split(' · ')[0]}`, r: 1, s: c => EVV[e.k][c], f: c => e.f(EVV[e.k][c]), gap: c => evGap(e, EVV[e.k][c]) })),
  { k: 'ies', l: 'Sedes de educación superior', r: 1, s: c => IN.ies[c], f: c => (IN.ies[c] || '–'), gap: c => iesOfTer(TOF[c]).length === 0 },
  { k: 'bre', l: 'Dimensiones en brecha · de 6', r: 1, s: c => trData().com[c].length, f: c => trData().com[c].length },
  { k: 'rez', l: 'Zona de rezago', s: c => IN.rez[c], f: c => (IN.rez[c] ? 'Sí' : '') },
];
const trScope = () => (UI.hbScope === 'ter' ? TER[UI.ter].c : ALLC);
function trScopeSel() { $$('#hb-scope,#ipt-scope').forEach(s => { s.innerHTML = `<option value="ter">Solo ${esc(TER[UI.ter].n)}</option><option value="all">Las 32 comunas</option>`; s.value = UI.hbScope; }); }
function renderHab() {
  const col = HCOLS.find(c => c.k === UI.hbSort) || HCOLS[0];
  const num = v => (typeof v === 'number' && !isFinite(v) ? -Infinity : v);
  const rows = [...trScope()].sort((a, b) => { const p = num(col.s(a)), q = num(col.s(b)); return (typeof p === 'string' ? p.localeCompare(q, 'es') : p - q) * UI.hbDir || POP[b] - POP[a]; });
  $('#hab').innerHTML = `<table><thead><tr>${HCOLS.map(c => `<th class="${c.r ? 'r' : ''}"${UI.hbSort === c.k ? ` aria-sort="${UI.hbDir > 0 ? 'ascending' : 'descending'}"` : ''}><button type="button" data-k="${c.k}">${esc(c.l)}${UI.hbSort === c.k ? (UI.hbDir > 0 ? ' ↑' : ' ↓') : ''}</button></th>`).join('')}</tr></thead><tbody>` +
    rows.map(c => `<tr class="${UI.hbScope === 'all' && TOF[c] === UI.ter ? 'on' : ''}">${HCOLS.map(k => (k.k === 'com' ? `<td><b style="font-weight:600">${esc(CN(c))}</b>${UI.hbScope === 'all' ? `<span class="sm">${esc(TER[TOF[c]].n)}</span>` : ''}</td>` : `<td class="m${k.r ? ' r' : ''}${k.gap && k.gap(c) ? ' flag' : ''}">${k.f(c)}</td>`)).join('')}</tr>`).join('') + '</tbody></table>';
}
$('#hab').addEventListener('click', e => { const b = e.target.closest('th button'); if (!b) return; const k = b.dataset.k; if (UI.hbSort === k) UI.hbDir *= -1; else { UI.hbSort = k; UI.hbDir = k === 'com' ? 1 : -1; } renderHab(); const nb = $(`#hab th button[data-k="${k}"]`); if (nb) nb.focus({ preventScroll: true }); });
$$('#hb-scope,#ipt-scope').forEach(s => s.addEventListener('change', e => { UI.hbScope = e.target.value; trScopeSel(); renderHab(); renderIptTable(); }));
function renderTerritorios() {
  if (!MAP) initMap();
  if (!rendered.infra) { initInfra(); rendered.infra = true; }
  renderTerPick(); renderMapOnly(); renderTprof(); renderInfra(); trScopeSel(); renderHab(); renderIptTable();
}

// ================= INSTRUMENTOS DE PLANIFICACIÓN POR COMUNA =================
// Catastro cargado a mano (IPT_DATA). Solo el estado «con o sin plan regulador» (ERD 2040, Tabla 14) y las zonas de rezago
// coinciden con una fuente del radar; el resto se muestra plegado y con el aviso de que no está verificado.
const IPTU = { sort: 'com', dir: 1 };
const IPT_SV = { com: it => it.com, est: it => it.val, plad: it => ({ vigente: 2, actualizacion: 1 })[it.pladEst] || 0, grd: it => (it.grdEmerg === 'aprobado' ? 2 : it.grdEmerg === 'tramite' ? 1 : 0) + (it.grdRrd === 'aprobado' ? 2 : it.grdRrd === 'elaboracion' ? 1 : 0), pladet: it => ({ vigente: 2, formulacion: 1 })[it.pladetEst] || 0, paccc: it => ({ aprobado: 2, elaboracion: 1 })[it.pacccEst] || 0 };
function renderIptTable() {
  const wrap = $('#ipt-tbl-wrap'); if (!wrap) return;
  const nSin = sum(TER.map(t => t.prcSin.length));
  $('#ipt-sum').innerHTML = `<b>Catastro sin verificar.</b> Se cargó a mano y el radar no tiene su fuente; confírmalo con el municipio o el servicio antes de citarlo. Lo único contrastado es que ${nSin} de las ${NC} comunas no tienen plan regulador vigente (ERD 2040, Tabla 14) y cuáles son zona de rezago.`;
  const sc = new Set(trScope()), sv = IPT_SV[IPTU.sort] || IPT_SV.com;
  const rows = IPT_DATA.filter(it => sc.has(it.c)).sort((a, b) => { const p = sv(a), q = sv(b); return (typeof p === 'string' ? p.localeCompare(q, 'es') : p - q) * IPTU.dir || a.com.localeCompare(b.com, 'es'); });
  const th = (col, label) => `<th scope="col"${IPTU.sort === col ? ` aria-sort="${IPTU.dir > 0 ? 'ascending' : 'descending'}"` : ''}><button type="button" data-col="${col}">${label}${IPTU.sort === col ? (IPTU.dir > 0 ? ' ↑' : ' ↓') : ''}</button></th>`;
  const sm = t => (t && t !== '–' ? `<span class="ipt-s">${esc(t)}</span>` : '');
  wrap.innerHTML = `<table class="ipt-tbl"><thead><tr>${th('com', 'Comuna')}${th('est', 'Plan regulador')}${th('plad', 'PLADECO')}${th('grd', 'Riesgo de desastres')}${th('pladet', 'Turismo')}${th('paccc', 'Clima y descontaminación')}<th scope="col">Regímenes especiales</th></tr></thead><tbody>
    ${rows.map(it => `<tr class="${UI.hbScope === 'all' && TOF[it.c] === UI.ter ? 'on' : ''}">
      <td><b>${esc(it.com)}</b>${UI.hbScope === 'all' ? sm(TER[TOF[it.c]].n) : ''}</td>
      <td><span class="ipt-badge ${it.cls}">${PRC_L[it.est]}</span>${sm(/^D\.O\./.test(it.prcAno) ? it.prcAno : '')}</td>
      <td><span class="plad-badge ${it.pladCls}">${esc(it.pladLbl)}</span>${sm(it.pladPer)}</td>
      <td><span class="grd-badge ${it.grdEmergCls}" title="Plan comunal de emergencia">Emergencia: ${esc(it.grdEmergLbl.toLowerCase())}</span> <span class="grd-badge ${it.grdRrdCls}" title="Plan de reducción del riesgo de desastres">Reducción: ${esc(it.grdRrdLbl.toLowerCase())}</span>${sm(it.threatStr)}</td>
      <td><span class="pladet-badge ${it.pladetCls}">${esc(it.pladetLbl)}</span>${it.zoit !== '–' ? ` <span class="tag-zoit">${esc(it.zoit)}</span>` : ''}${sm(it.pladetDet)}</td>
      <td><span class="paccc-badge ${it.pacccCls}">PACCC: ${esc(it.pacccLbl.toLowerCase())}</span>${it.descont !== '–' ? ` <span class="${it.descont === 'PDL Lago' ? 'tag-pdl' : 'tag-pda'}">${esc(it.descont)}</span>` : ''}${sm(it.pacccDet)}</td>
      <td>${[it.adi !== '–' ? `<span class="tag-adi" title="${esc(it.adiNom)}">${esc(it.adi)}</span>` : '', it.pri !== '–' ? `<span class="tag-pri">${esc(it.pri)}</span>` : '', it.zubc ? '<span class="tag-zubc" title="Zonificación de uso del borde costero">Borde costero</span>' : '', IN.rez[it.c] ? '<span class="tag-rez">Zona de rezago</span>' : ''].filter(Boolean).join(' ') || '<span style="color:var(--muted)">–</span>'}</td>
    </tr>`).join('')}</tbody></table>`;
}
$('#ipt-tbl-wrap').addEventListener('click', e => { const b = e.target.closest('th button'); if (!b) return; const col = b.dataset.col; if (IPTU.sort === col) IPTU.dir *= -1; else { IPTU.sort = col; IPTU.dir = 1; } renderIptTable(); const nb = $(`#ipt-tbl-wrap th button[data-col="${col}"]`); if (nb) nb.focus({ preventScroll: true }); });
$('#ipt-csv').addEventListener('click', () => {
  const head = ['Comuna', 'Territorio ERD', 'Estado plan regulador', 'Publicación PRC', 'Detalle PRC', 'Límite urbano', 'Plan regulador intercomunal', 'Estado PLADECO', 'Periodo PLADECO', 'Plan de emergencia', 'Plan de reducción del riesgo', 'Amenazas', 'Estado PLADETUR', 'Detalle PLADETUR', 'ZOIT', 'Estado PACCC', 'Detalle PACCC', 'Área de desarrollo indígena', 'Nombre ADI', 'Plan de descontaminación', 'Detalle descontaminación', 'Borde costero (ZUBC)', 'Zona de rezago', 'Verificación'];
  saveCSV([head].concat(IPT_DATA.map(it => [it.com, TER[TOF[it.c]].n, PRC_L[it.est], it.prcAno, it.prcDet, it.limAno, it.pri, it.pladLbl, it.pladPer, it.grdEmergLbl, it.grdRrdLbl, it.threatStr, it.pladetLbl, it.pladetDet, it.zoit, it.pacccLbl, it.pacccDet, it.adi, it.adiNom, it.descont, it.descontDet, it.zubc ? 'Sí' : 'No', IN.rez[it.c] ? 'Sí' : 'No', 'Catastro sin verificar, salvo plan regulador (ERD 2040, Tabla 14) y zona de rezago'])), 'instrumentos_planificacion_comunas_araucania_sin_verificar.csv');
});
$('#ev-ipt-n').textContent = sum(TER.map(t => t.prcSin.length));
{ const bEv = $('#ev-goto-ipt'); if (bEv) bEv.addEventListener('click', () => { UI.hbScope = 'all'; setView('territorios'); trOpenDet('#ipt-card'); }); }

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
function renderGanHeat() {
  const items = [
    { k: 'caf_bovc', n: 'Bovinos cárnicos' },
    { k: 'caf_bovl', n: 'Bovinos lácteos / doble propósito' },
    { k: 'caf_bov',  n: 'Total bovinos' },
    { k: 'caf_ovi',  n: 'Ovinos' }
  ];
  const st = TER.map(T => items.map(it => cxS(it.k, T.c)));
  const reg = items.map(it => cxS(it.k, ALLC));
  const el = $('#ev-gan');
  if (!el) return;
  el.innerHTML = `<table class="heat"><thead><tr><th>Especie ganadera</th>${TER.map((T, i) => `<th class="r" title="${esc(T.n)}"><span style="color:${TCOL[i]}">■</span> ${esc(T.n.replace('Araucanía ', '').replace('Temuco – Padre Las Casas', 'Temuco–PLC').replace('Malleco Norte', 'Malleco N.'))}</th>`).join('')}<th class="r">Región</th></tr></thead><tbody>` +
    items.map((it, j) => `<tr><td>${esc(it.n)}</td>${TER.map((T, i) => { const v = st[i][j], r = reg[j], s = r ? v / r : 0, bg = v ? mix(SURF2, css('--s4'), Math.min(1, s / 0.45)) : 'transparent'; return `<td class="m r" style="background:${bg};color:${v ? inkOn(bg) : 'var(--muted)'}" title="${esc(T.n)}: ${f0(v)} cabezas, ${pc(s, 0)} de la región">${v ? f0(v) : '–'}</td>`; }).join('')}<td class="m r">${f0(reg[j])}</td></tr>`).join('') + '</tbody></table>';
}
function renderEnergyHeat() {
  const items = [
    { k: 'gen_eol', n: 'Generación eólica (MW)' },
    { k: 'gen_hid', n: 'Generación hidroeléctrica (MW)' },
    { k: 'gen_bio', n: 'Biomasa y cogeneración (MW)' },
    { k: 'gen_sol', n: 'Solar fotovoltaica / PMGD (MW)' },
    { k: 'gen_pot', n: 'Capacidad instalada total (MW)' },
    { k: 'gen_inj', n: 'Inyección estimada al SEN (GWh/año)' }
  ];
  const st = TER.map(T => items.map(it => cxS(it.k, T.c)));
  const reg = items.map(it => cxS(it.k, ALLC));
  const el = $('#ev-ener');
  if (!el) return;
  el.innerHTML = `<table class="heat"><thead><tr><th>Tecnología / Matriz</th>${TER.map((T, i) => `<th class="r" title="${esc(T.n)}"><span style="color:${TCOL[i]}">■</span> ${esc(T.n.replace('Araucanía ', '').replace('Temuco – Padre Las Casas', 'Temuco–PLC').replace('Malleco Norte', 'Malleco N.'))}</th>`).join('')}<th class="r">Región</th></tr></thead><tbody>` +
    items.map((it, j) => `<tr><td>${esc(it.n)}</td>${TER.map((T, i) => { const v = st[i][j], r = reg[j], s = r ? v / r : 0, bg = v ? mix(SURF2, css('--s4'), Math.min(1, s / 0.45)) : 'transparent'; return `<td class="m r" style="background:${bg};color:${v ? inkOn(bg) : 'var(--muted)'}" title="${esc(T.n)}: ${f1(v)}, ${pc(s, 0)} de la región">${v ? f1(v) : '–'}</td>`; }).join('')}<td class="m r"><b>${f1(reg[j])}</b></td></tr>`).join('') + '</tbody></table>';
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
    renderEvKpis(); renderPib(); renderCafHeat(); renderGanHeat(); renderEnergyHeat();
    $('#ev-g').innerHTML = Object.entries(EVG).map(([g, l]) => `<button type="button" data-g="${g}" aria-pressed="false">${esc(l)}</button>`).join('');
    $$('#ev-g button').forEach(b => b.addEventListener('click', () => { UI.evG = b.dataset.g; if (!['com', 'pop'].includes(UI.evSort)) { UI.evSort = 'com'; UI.evDir = 1; } renderEvTable(); }));
    $('#ev-scope').addEventListener('change', e => { UI.evScope = e.target.value; renderEvTable(); });
    $('#ev-map').addEventListener('change', e => { UI.evMap = e.target.value; });
    $('#ev-go').addEventListener('click', () => { UI.mInd = 'ev:' + UI.evMap; setView('territorios'); trReveal($('#tr-mapc')); $('#m-ind').focus({ preventScroll: true }); });
    $('#ev-csv').addEventListener('click', exportEvid);
    rendered.evid = true;
  }
  renderEvTable();
}
function exportEvid() {
  const raw = [['saeN', 'Personas (proyección SAE)'], ['pmdN', 'Personas en pobreza multidimensional'], ['pinN', 'Personas en pobreza por ingresos'], ['pind', 'Personas pertenecientes a pueblos indígenas'], ['pindb', 'Personas en unidades censales con dato'], ['vagua', 'Viviendas ocupadas con dato de origen del agua'], ['vred', 'Viviendas con red pública'], ['vpozo', 'Viviendas con pozo o noria'], ['valj', 'Viviendas con camión aljibe'], ['vrio', 'Viviendas con río, vertiente, estero, canal o lago'], ['caf_sup', 'Superficie censada CAF (ha)'], ['caf_rie', 'Superficie regada CAF (ha)'], ['caf_sec', 'Superficie de secano CAF (ha)'], ['caf_upaa', 'UPA de autoconsumo'], ['minv', 'Inversión municipal 2024 (miles de $)'], ['ingp', 'Ingresos propios municipales 2024 (miles de $)']];
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
// tipo de inversión (prep_bip.py): tipología oficial del BIP y, en los proyectos, el proceso del nombre
const BX_TI = BX.ti || [], BX_TIV = BX.tiv || [];
const TI_SHORT = ['Infraestructura', 'Conservación', 'Equipamiento y vehículos', 'Programas', 'Estudios básicos'];
const BX_S = Array.from({ length: NBX }, (_, i) => normTxt(BX.code[i] + ' ' + BX_N[i] + ' ' + BX_INS(i)));
const BXF = { q: '', t: -1, c: -1, cat: '', L: -1, y: 0, y0: 0, e: -1, fin: '', r: -1, ti: new Set(), sort: 's', dir: -1, page: 0, open: new Set() };
// obras de Geo-CGR vinculadas por código BIP
const NOB = OB ? OB.b.length : 0;
const OB_T = OB ? OB.t.split('\n') : [], OB_MP = OB ? OB.mp.split('\n') : [];
const BX_IDX = new Map(BX.code.map((c, i) => [c, i]));
const OB_I = OB ? OB.b.map(c => (c ? BX_IDX.get(c) ?? -1 : -1)) : [];
const BX_OB = Array.from({ length: NBX }, () => []); OB_I.forEach((i, k) => { if (i >= 0) BX_OB[i].push(k); });
const NBX_OB = BX_OB.filter(a => a.length).length, NOB_L = OB_I.filter(i => i >= 0).length;
// vínculo aproximado por nombre (prep_geocgr.py): solo para obras sin código BIP
const OB_IA = OB && OB.ba ? OB.ba.map((c, k) => (c && OB_I[k] < 0 ? BX_IDX.get(c) ?? -1 : -1)) : OB_I.map(() => -1);
const OB_J = OB_I.map((i, k) => (i >= 0 ? i : OB_IA[k]));
const BX_OBA = Array.from({ length: NBX }, () => []); OB_IA.forEach((i, k) => { if (i >= 0) BX_OBA[i].push(k); });
const NOB_A = OB_IA.filter(i => i >= 0).length, NBX_OBA = BX_OBA.filter(a => a.length).length;
const obSim = k => (OB && OB.bs ? f0(OB.bs[k]) + '%' : '');
const obM = k => (OB.x[k] ? 'monto atípico ⚠' : mmK(OB.m[k]) + ' MM$');
const obYm = v => (v ? String(v % 100).padStart(2, '0') + '/' + Math.floor(v / 100) : '–');
const obServ = k => insFix(OB.sv[OB.s[k]]);
const obCom = k => (OB.c[k] >= 0 ? CN(OB.c[k]) : 'sin comuna');
function bxObList(ks, tit, ap) {
  if (!ks || !ks.length) return '';
  return `<div class="lbl" style="margin:12px 0 4px">${esc(tit)} (${f0(ks.length)})</div><ul class="oblist${ap ? ' ap' : ''}">${ks.map(kk => `<li><b>${esc(OB_T[kk])}</b><span class="sm">${esc(obServ(kk))} · ${esc(obCom(kk))} · adjudicada ${obYm(OB.y[kk])} · ${esc(obM(kk))} contratados · avance físico ${f0(OB.a[kk])}%${OB.p[kk] ? ' · <span class="pill bad">Paralizada</span>' : ''}${OB_MP[kk] ? ` · <span class="m">${esc(OB_MP[kk])}</span>` : ''}${ap ? ` · similitud ${obSim(kk)}` : ''}</span></li>`).join('')}</ul>`;
}
function setNote(el, txt, sum) {
  const t = String(txt || '').trim(), m = t.match(/^(.*?[.!?])\s+(\S[\s\S]*)$/);
  if (!m || t.length < 220) { el.textContent = t; return; }
  const open = el.querySelector('details') && el.querySelector('details').open;
  el.innerHTML = `${esc(m[1])}<details class="note-more"${open ? ' open' : ''}><summary>${esc(sum)}</summary><p>${esc(m[2])}</p></details>`;
}
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
function bxList(noGeo, noTi) {
  const q = normTxt(BXF.q.trim()), out = [];
  for (let i = 0; i < NBX; i++) {
    const c = BX.c[i];
    if (!noGeo) {
      if (BXF.t === -2 ? c >= 0 : BXF.t >= 0 && (c < 0 || TOF[c] !== BXF.t)) continue;
      if (BXF.c >= 0 && c !== BXF.c) continue;
    }
    const cat = bxCat(i);
    if (BXF.cat === 'frpd' ? !BX_FRPD.has(cat) : BXF.cat === 'soc' ? !cat.startsWith('soc:') : BXF.cat && cat !== BXF.cat) continue;
    if (BXF.L >= 0 && !((BX.L[i] >> BXF.L) & 1)) continue;
    if (BXF.fin && BX_FIN[i] !== BXF.fin) continue;
    if (!noTi && BXF.ti.size && !BXF.ti.has(BX_TI[i])) continue;
    if (q && !BX_S[i].includes(q)) continue;
    if (BXF.y0) { const rw = BX_ROWS[i]; if (BXH.y[rw[rw.length - 1]] < BXF.y0) continue; }   // última postulación desde ese año
    const ref = bxRef(i); if (!ref) continue;
    if (BXF.e >= 0 && ref.e !== BXF.e) continue;
    if (BXF.r >= 0 && ref.r !== BXF.r) continue;
    out.push({ i, ref });
  }
  if (noGeo || noTi) return out;
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
  $('#bx-clear').addEventListener('click', () => { Object.assign(BXF, { q: '', t: -1, c: -1, cat: '', L: -1, y: 0, y0: 0, e: -1, fin: '', r: -1, ti: new Set(), page: 0 }); BXF.open.clear(); $('#bx-q').value = ''; renderBip(); });
  const mt = $('#bx-mtog'), setMin = v => { $('#bx-mapc').classList.toggle('min', v); mt.textContent = v ? 'Mostrar mapa' : 'Ocultar mapa'; mt.setAttribute('aria-expanded', String(!v)); try { localStorage.setItem('radar-bxmap-min', v ? '1' : ''); } catch (e) {} };
  mt.addEventListener('click', () => setMin(!$('#bx-mapc').classList.contains('min')));
  try { if (localStorage.getItem('radar-bxmap-min')) setMin(true); } catch (e) {}
  $('#bx-more-b').addEventListener('click', () => { const m = $('#bx-more'); m.hidden = !m.hidden; renderBip(); });
  $('#bx-act').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; const k = b.dataset.k; BXF[k] = BX_DEF[k]; BXF.page = 0; BXF.open.clear(); renderBip(); });
  if (BX_TIV.length) $('#bx-ti').addEventListener('click', e => { const b = e.target.closest('button[data-ti]'); if (!b) return; const t = +b.dataset.ti; if (BXF.ti.has(t)) BXF.ti.delete(t); else BXF.ti.add(t); BXF.page = 0; BXF.open.clear(); renderBip(); });
  else $('#bx-ti').hidden = true;
  $('#bx-csv').addEventListener('click', exportBip);
}
const BX_DEF = { t: -1, c: -1, cat: '', L: -1, y: 0, y0: 0, e: -1, fin: '', r: -1 };
const BX_FLAB = { t: 'Territorio', c: 'Comuna', cat: 'Categoría', L: 'Lineamiento', y: 'Año', y0: 'Última postulación desde', e: 'Etapa', fin: 'Financiamiento', r: 'RATE' };
const BX_MORE = ['c', 'L', 'y', 'e', 'fin', 'r'];
const BXPAGE = 50;
let BX_LAST = [];
function renderBip() {
  if (!rendered.bip) { bxInitControls(); rendered.bip = true; }
  renderBxFrom();
  ['t', 'c', 'cat', 'L', 'y', 'e', 'fin', 'r'].forEach(k => { const el = $('#bx-' + (k === 'L' ? 'l' : k)); if (el) el.value = String(BXF[k]); });
  if ($('#bx-q').value !== BXF.q) $('#bx-q').value = BXF.q;
  {
    const act = Object.keys(BX_DEF).filter(k => BXF[k] !== BX_DEF[k]), nMore = act.filter(k => BX_MORE.includes(k)).length, shown = !$('#bx-more').hidden;
    const mb = $('#bx-more-b'); mb.textContent = (shown ? 'Menos filtros' : 'Más filtros') + (nMore && !shown ? ` (${nMore})` : ''); mb.setAttribute('aria-expanded', shown);
    const box = $('#bx-act'); box.hidden = !act.length;
    box.innerHTML = act.map(k => { const el = $('#bx-' + (k === 'L' ? 'l' : k)), o = el && el.selectedOptions[0]; return `<button type="button" class="fchip" data-k="${k}" title="Quitar este filtro"><b>${BX_FLAB[k]}:</b> ${esc(o ? o.textContent.split(' (')[0] : String(BXF[k]))}<i aria-hidden="true">✕</i></button>`; }).join('');
  }
  if (BX_TIV.length) {
    const nT = BX_TIV.map(() => 0); for (const o of bxList(false, true)) nT[BX_TI[o.i]]++;
    $('#bx-ti').innerHTML = `<span class="lbl">Tipo de inversión</span>` + BX_TIV.map((l, t) => `<button type="button" class="tichip" data-ti="${t}" aria-pressed="${BXF.ti.has(t)}" title="${esc(l)}">${esc(TI_SHORT[t] || l)} <span>${f0(nT[t])}</span></button>`).join('')
      + (BXF.ti.size ? `<button type="button" class="btn sm" data-ti-all>Todos los tipos</button>` : '');
    const ta = $('#bx-ti [data-ti-all]'); if (ta) ta.addEventListener('click', () => { BXF.ti = new Set(); BXF.page = 0; renderBip(); });
  }
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
        row += `<tr class="det"><td colspan="9"><div class="bpdet"><div><p>${esc(BX_D[i] || 'Sin descripción.')}</p><p class="note" style="margin-top:8px">${c >= 0 ? `${esc(CN(c))} · ${esc(TER[TOF[c]].n)}` : 'Alcance regional o sin comuna'} · ${esc(catLab(bxCat(i)))} (clasificación aproximada) · Lineamientos inferidos: ${LIN.filter((l, j) => (BX.L[i] >> j) & 1).map(l => l.k).join(', ') || 'ninguno'} · Fuente: ${esc(BX.finv[BX.fin[i]] || 'sin dato')}${BX_TIV.length ? ` · Tipo de inversión: ${esc(BX_TIV[BX_TI[i]])}` : ''}</p>${bxObList(BX_OB[i], 'Obras en Geo-CGR')}${bxObList(BX_OBA[i], 'Posibles obras en Geo-CGR, vínculo aproximado por nombre', true)}</div>
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
  renderBxMap();
}

// ---- mapa de iniciativas por comuna y territorio (aplica todos los filtros salvo territorio y comuna) ----
Object.assign(BXF, { mlev: 'com', mmet: 'n', mpts: 'bip', mapx: true });
const BXMET = [
  { k: 'n', short: 'N° de iniciativas', l: 'Iniciativas', f: v => f0(v) },
  { k: 's', short: 'Solicitado', l: 'Monto solicitado (MM$)', f: v => mmK(v) },
  { k: 't', short: 'Costo total', l: 'Costo total de las etapas (MM$)', f: v => mmK(v) },
  { k: 'pc', short: 'Por habitante', l: 'Costo total por habitante (miles de $)', f: v => (isFinite(v) ? f0(v) : '–') },
];
const BXMK = Object.fromEntries(BXMET.map(m => [m.k, m]));
let BXM = null, BXA = null;
function bxAgg(L = bxList(true)) {
  const z = () => ({ n: 0, s: 0, t: 0, cat: {} });
  const cm = Array.from({ length: NC }, z), tm = TER.map(z), reg = z(), all = z();
  const add = (a, o) => { a.n++; if (!o.ref.x) { a.s += o.ref.s || 0; a.t += o.ref.t || 0; } const k = bxCat(o.i), r = a.cat[k] || (a.cat[k] = { n: 0, t: 0 }); r.n++; if (!o.ref.x) r.t += o.ref.t || 0; };
  for (const o of L) { const c = BX.c[o.i]; add(all, o); if (c >= 0) { add(cm[c], o); add(tm[TOF[c]], o); } else add(reg, o); }
  return { cm, tm, reg, all };
}
const bxVal = (a, pop, m) => (m === 'pc' ? (pop ? a.t / pop : NaN) : a[m]);
const bxUnitVal = (lev, j, m) => (lev === 'ter' ? bxVal(BXA.tm[j], TER[j].pop, m) : bxVal(BXA.cm[j], POP[j], m));
const bxTopCats = (a, n) => Object.entries(a.cat).sort((x, y) => y[1].n - x[1].n).slice(0, n);
function bxPick(lev, j) {
  if (lev === 'reg') { BXF.t = BXF.t === -2 ? -1 : -2; BXF.c = -1; }
  else if (lev === 'ter') { BXF.t = BXF.t === j ? -1 : j; BXF.c = -1; }
  else { BXF.c = BXF.c === j ? -1 : j; BXF.t = -1; }
  BXF.page = 0; BXF.open.clear(); hideTip(); renderBip();
}
function bxMapTip(ci) {
  const ter = BXF.mlev === 'ter', j = ter ? TOF[ci] : ci, a = ter ? BXA.tm[j] : BXA.cm[j], pop = ter ? TER[j].pop : POP[ci];
  const cats = bxTopCats(a, 2).map(([k, r]) => `${catLab(k)} (${f0(r.n)})`).join(' · ');
  const on = ter ? BXF.t === j : BXF.c === ci;
  return { title: ter ? TER[j].n : `${CN(ci)} · ${TER[TOF[ci]].n}`, rows: [[f0(a.n), 'iniciativas'], [mmK(a.s), 'MM$ solicitados'], [mmK(a.t), 'MM$ costo total de las etapas'], [isFinite(a.t / pop) ? f0(a.t / pop) : '–', 'mil $ de costo por habitante']], note: (cats ? 'Más frecuentes: ' + cats + '. ' : '') + (on ? 'Clic para quitar el filtro' : 'Clic para filtrar la tabla') };
}
// ---- capa de obras (Geo-CGR): vinculadas a iniciativas que pasan los filtros del mapa; con «Todas», también las sin código BIP ----
let BXOV = null, BXOV_K = 0;
function bxOvBuild() {
  const gl = svgEl('g', { class: 'obl' }), gp = svgEl('g', { class: 'obp' });
  const rk = k => (OB_I[k] >= 0 ? 2 : OB_IA[k] >= 0 ? 1 : 0);
  const ordL = OB.ln.map((x, j) => j).sort((a, b) => rk(OB.ln[a][0]) - rk(OB.ln[b][0]));
  const ordP = OB.pi.map((x, j) => j).sort((a, b) => rk(OB.pi[a]) - rk(OB.pi[b]));
  const lines = ordL.map(j => { const e = svgEl('path', { d: OB.ln[j][1], 'data-k': OB.ln[j][0], 'vector-effect': 'non-scaling-stroke' }); gl.appendChild(e); return e; });
  const pts = ordP.map(j => { const e = svgEl('circle', { cx: OB.px[j] / 10, cy: OB.py[j] / 10, r: 2, 'data-k': OB.pi[j] }); gp.appendChild(e); return e; });
  BXM.ov.append(gl, gp);
  BXOV = { lines, pts };
}
function bxOvScale(k) {
  if (!BXOV || Math.abs(k - BXOV_K) < 1e-6) return; BXOV_K = k;
  for (const e of BXOV.pts) e.setAttribute('r', (e.classList.contains('l') ? 3.1 : e.classList.contains('a') ? 3 : 2.1) * k);
}
function bxOvVis(L) {
  const vis = new Uint8Array(NOB);
  if (!OB || BXF.mpts === 'off') return vis;
  const ok = new Uint8Array(NBX); for (const o of L) ok[o.i] = 1;
  for (let k = 0; k < NOB; k++) {
    const i = OB_I[k], ia = BXF.mapx ? OB_IA[k] : -1;
    if (i >= 0) { if (ok[i]) vis[k] = 2; } else if (ia >= 0 && ok[ia]) vis[k] = 3; else if (BXF.mpts === 'all' && !(ia >= 0)) vis[k] = 1;
  }
  return vis;
}
function bxOvPaint(vis) {
  if (!BXOV) return;
  const cls = k => (vis[k] === 2 ? 'l' : vis[k] === 3 ? 'a' : vis[k] === 1 ? 'u' : 'h');
  for (const e of BXOV.lines) e.setAttribute('class', cls(+e.dataset.k));
  for (const e of BXOV.pts) e.setAttribute('class', cls(+e.dataset.k));
  BXOV_K = 0; bxOvScale(BXM.k());
}
function bxOvTip(k) {
  const i = OB_I[k];
  return { title: OB_T[k], rows: [[OB.x[k] ? '⚠' : mmK(OB.m[k]), OB.x[k] ? 'monto contratado atípico, probablemente mal registrado' : 'MM$ contratados'], [f0(OB.a[k]) + '%', 'avance físico' + (OB.p[k] ? ' · paralizada' : '')], [obYm(OB.y[k]), 'adjudicación']],
    note: `${obServ(k)} · ${obCom(k)} · ${OB.kv[OB.k[k]]}. ` + (i >= 0 ? `BIP ${BX.code[i]}: ${BX_N[i]}. Clic para verla en la tabla.` : OB_IA[k] >= 0 ? `Posible iniciativa por nombre (similitud ${obSim(k)}): BIP ${BX.code[OB_IA[k]]}, ${BX_N[OB_IA[k]]}. Clic para verla en la tabla.` : 'Sin código BIP en la base del radar.') };
}
function bxOvClick(k) {
  const i = OB_J[k]; if (i < 0) return;
  Object.assign(BXF, { q: String(BX.code[i]), page: 0 }); BXF.open = new Set([i]); hideTip(); renderBip();
  $('#bx-tbl').scrollIntoView({ block: 'start', behavior: 'smooth' });
}
// ---- mapa de iniciativas BIP: mapa común (createMapL) más la capa de obras de Geo-CGR ----
function bxLeafletInit() {
  const base = createMapL($('#bx-m'), { col: $('#bx-mapcol'), tip: bxMapTip, click: ci => bxPick(BXF.mlev, BXF.mlev === 'ter' ? TOF[ci] : ci),
    selected: () => (BXF.c >= 0 ? [BXF.c] : []), terLabels: () => BXF.mlev === 'ter', hoverTer: () => BXF.mlev === 'ter',
    sub: [$('#bx-msub'), 'Rueda o botones para acercar, arrastra para moverte · clic en una comuna, un territorio o una barra del ranking para filtrar la tabla · clic en una obra para ver su ficha'] });
  const { map, C } = base;
  // obras: puntos y líneas en su propia capa
  const obR = L.canvas({ pane: 'obras', padding: 0.4, tolerance: 3 });   // canvas: miles de marcas sin cargar el DOM
  const OBL = OB ? Array.from({ length: NOB }, () => []) : [], OBS = new Uint8Array(NOB);
  if (OB) {
    OB.ln.forEach(([k, d]) => { const ll = ringsLL(d)[0]; if (ll && ll.length > 1) OBL[k].push(L.polyline(ll, { renderer: obR, pane: 'obras', interactive: true, bubblingMouseEvents: false })); });
    OB.pi.forEach((k, j) => OBL[k].push(L.circleMarker(svgLL(OB.px[j] / 10, OB.py[j] / 10), { renderer: obR, pane: 'obras', bubblingMouseEvents: false })));
    OBL.forEach((ls, k) => ls.forEach(l => {
      l.on('mouseover', e => { const t = bxOvTip(k); showTip(e.originalEvent, t.title, t.rows, t.note); l.setStyle({ weight: l instanceof L.CircleMarker ? 2 : 4.5, color: C.ink }); });
      l.on('mousemove', e => placeTip(e.originalEvent));
      l.on('mouseout', () => { hideTip(); obStyle(k, l); });
      l.on('click', e => { hideTip(); L.popup({ maxWidth: 300, autoPanPadding: [20, 20] }).setLatLng(e.latlng).setContent(bxObPopup(k)).openOn(map); });
    }));
  }
  const rOf = lnk => { const g = Math.max(0.7, Math.min(2.2, 1 + (map.getZoom() - base.z0()) * 0.28)); return (lnk ? 4 : 2.6) * g; };
  function obStyle(k, l) {
    const v = OBS[k], lnk = v === 2, ap = v === 3;
    if (l instanceof L.CircleMarker) l.setStyle(ap ? { radius: rOf(true) * 0.95, weight: 1.8, color: C.sel, opacity: 0.95, fillColor: C.sel, fillOpacity: 0.22 }
      : { radius: rOf(lnk), weight: lnk ? 1 : 0.5, color: C.bg, opacity: 0.9, fillColor: lnk ? C.sel : C.mid, fillOpacity: lnk ? 0.95 : 0.75 });
    else l.setStyle({ weight: lnk ? 3 : ap ? 2.6 : 1.8, color: lnk || ap ? C.sel : C.mid, opacity: lnk || ap ? 0.95 : 0.65, dashArray: ap ? '5 4' : null });
  }
  function obras(vis) {
    if (!OB) return;
    let added = false;
    for (let k = 0; k < NOB; k++) {
      const v = vis[k]; if (v === OBS[k]) continue;
      const was = OBS[k]; OBS[k] = v;
      for (const l of OBL[k]) { if (!v) { if (was) map.removeLayer(l); } else { if (!was) l.addTo(map); obStyle(k, l); } }
      if (v && !was) added = true;
    }
    if (added) { for (let k = 0; k < NOB; k++) if (OBS[k] === 3) OBL[k].forEach(l => l.bringToFront()); for (let k = 0; k < NOB; k++) if (OBS[k] === 2) OBL[k].forEach(l => l.bringToFront()); }
  }
  map.on('zoomend', () => { if (OB) for (let k = 0; k < NOB; k++) if (OBS[k]) for (const l of OBL[k]) if (l instanceof L.CircleMarker) l.setRadius(rOf(OBS[k] >= 2) * (OBS[k] === 3 ? 0.95 : 1)); });
  return {
    legend: base.legend, map, fly: base.fly,
    paint(fills, selected, terSel, vis) { base.paint(fills, selected, terSel); obras(vis); },
  };
}
function bxObPopup(k) {
  const i = OB_J[k], ap = OB_I[k] < 0 && i >= 0;
  const row = (l, v) => `<div class="r"><span>${l}</span><b>${v}</b></div>`;
  return `<div class="obp"><h4>${esc(OB_T[k])}</h4>
    ${row('Contrato', OB.x[k] ? '⚠ monto atípico' : esc(mmK(OB.m[k])) + ' MM$')}${row('Adjudicación', obYm(OB.y[k]))}${row('Avance físico', f0(OB.a[k]) + '%' + (OB.p[k] ? ' · paralizada' : ''))}<div class="av"><i style="width:${Math.max(0, Math.min(100, OB.a[k]))}%"></i></div>
    ${row('Comuna', esc(obCom(k)))}${row('Tipo de obra', esc(OB.kv[OB.k[k]]))}
    <div class="sm" style="margin-top:4px">${esc(obServ(k))}${OB_MP[k] ? ` · Mercado Público <span class="m">${esc(OB_MP[k])}</span>` : ''}</div>
    ${i >= 0 ? `<div class="bip${ap ? ' ap' : ''}">${ap ? `<div class="sm" style="margin-bottom:3px">Posible iniciativa · vínculo aproximado por nombre, similitud ${obSim(k)}</div>` : ''}BIP <b>${BX.code[i]}</b> · ${esc(BX_N[i])}<div class="sm">${esc(catLab(bxCat(i)))} · ${BX.c[i] >= 0 ? esc(CN(BX.c[i])) : 'Regional o sin comuna'}</div></div><button type="button" class="btn sm pri" data-obk="${k}">Ver iniciativa en la tabla</button>` : '<p class="sm" style="margin:8px 0 0">Sin código BIP en la base del radar.</p>'}</div>`;
}
document.addEventListener('change', e => { if (e.target && e.target.id === 'bx-mapx') { BXF.mapx = e.target.checked; renderBxMap(); } });
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-obk]'); if (b) { if (BXM && BXM.map) BXM.map.closePopup(); bxOvClick(+b.dataset.obk); } });
function renderBxMap() {
  if (!BXM && HAS_LF) {
    try { BXM = bxLeafletInit(); } catch (e) { console.warn('Leaflet no pudo iniciar; se usa el mapa SVG:', e); BXM = null; $('#bx-mapcol').querySelectorAll('.lf-tools,.lf-note,.legend').forEach(x => x.remove()); $('#bx-m').classList.remove('lf'); $('#bx-m').replaceChildren(); }
    if (BXM) {
      $('#bx-mlev').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; BXF.mlev = b.dataset.k; renderBxMap(); });
      $('#bx-mmet').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; BXF.mmet = b.dataset.k; renderBxMap(); });
      $('#bx-rank').addEventListener('click', e => { const b = e.target.closest('[data-lev]'); if (b) { bxPick(b.dataset.lev, +b.dataset.j); const on = b.dataset.lev === 'com' ? BXF.c === +b.dataset.j : b.dataset.lev === 'ter' ? BXF.t === +b.dataset.j : false; BXM.fly(on ? b.dataset.lev : 'reg', +b.dataset.j); } });
      if (OB) $('#bx-mpts').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; BXF.mpts = b.dataset.k; renderBxMap(); });
      else $('#bx-mpts').hidden = true;
    }
  }
  if (!BXM) {
    BXM = createMapE($('#bx-m'), { click: ci => bxPick(BXF.mlev, BXF.mlev === 'ter' ? TOF[ci] : ci), tip: bxMapTip, selected: () => (BXF.c >= 0 ? new Set([BXF.c]) : new Set()), terLabels: () => BXF.mlev === 'ter', hoverTer: () => BXF.mlev === 'ter',
      ovTip: OB ? bxOvTip : null, ovClick: OB ? bxOvClick : null, onScale: k => bxOvScale(k) });
    if (OB) { bxOvBuild(); $('#bx-mpts').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; BXF.mpts = b.dataset.k; renderBxMap(); }); }
    else $('#bx-mpts').hidden = true;
    $('#bx-mlev').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; BXF.mlev = b.dataset.k; renderBxMap(); });
    $('#bx-mmet').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; BXF.mmet = b.dataset.k; renderBxMap(); });
    $('#bx-rank').addEventListener('click', e => { const b = e.target.closest('[data-lev]'); if (b) bxPick(b.dataset.lev, +b.dataset.j); });
  }
  const BXL = bxList(true);
  BXA = bxAgg(BXL);
  const lev = BXF.mlev, m = BXF.mmet, M = BXMK[m], ter = lev === 'ter';
  const vis = bxOvVis(BXL);
  if (OB) $('#bx-mpts').innerHTML = [['off', 'Sin obras'], ['bip', 'Obras BIP'], ['all', 'Todas las obras']].map(([k, l]) => `<button type="button" data-k="${k}" aria-pressed="${BXF.mpts === k}">${l}</button>`).join('');
  $('#bx-mlev').innerHTML = [['com', 'Comunas'], ['ter', 'Territorios ERD']].map(([k, l]) => `<button type="button" data-k="${k}" aria-pressed="${lev === k}">${l}</button>`).join('');
  $('#bx-mmet').innerHTML = BXMET.map(x => `<button type="button" data-k="${x.k}" aria-pressed="${m === x.k}">${x.short}</button>`).join('');
  // colores por quintiles de las unidades con iniciativas
  const units = ter ? TER.map((t, j) => j) : ALLC, uv = units.map(j => bxUnitVal(lev, j, m));
  const br = quantBreaks(uv.filter(v => v > 0));
  const colOf = v => (v > 0 && isFinite(v) ? SEQ[clsOf(v, br)] : NODATA);
  const fills = ALLC.map(c => colOf(ter ? uv[TOF[c]] : uv[c]));
  if (BXM.map) BXM.paint(fills, BXF.c >= 0 ? [BXF.c] : [], BXF.t >= 0 ? [BXF.t] : [], vis);
  else { BXM.paint(fills, BXF.c >= 0 ? [BXF.c] : [], BXF.t >= 0 ? [BXF.t] : []); bxOvPaint(vis); }
  const rows = SEQ.map((col, i) => [col, M.f(br[i]) + ' – ' + M.f(br[i + 1])]).reverse();
  if (uv.some(v => !(v > 0))) rows.push([NODATA, 'Sin iniciativas con estos filtros']);
  let nL = 0, nU = 0, nA = 0; for (let k = 0; k < NOB; k++) { if (vis[k] === 2) nL++; else if (vis[k] === 3) nA++; else if (vis[k] === 1) nU++; }
  const ptRow = (c, l) => `<span class="row"><svg class="obsw" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="${c === 'u' ? 3.4 : 4.3}" class="${c}"/></svg>${esc(l)}</span>`;
  BXM.legend.innerHTML = `<b>${esc(M.l)} por ${ter ? 'territorio' : 'comuna'}</b>` + rows.map(([c, l]) => `<span class="row"><span class="sw" style="background:${c}"></span>${esc(l)}</span>`).join('') +
    (OB && BXF.mpts !== 'off' ? `<b style="margin-top:4px">Obras con coordenadas (Geo-CGR)</b>` + ptRow('l', `${pl(nL, 'obra vinculada', 'obras vinculadas')} por código BIP`) + (BXF.mapx ? ptRow('a', `${pl(nA, 'obra vinculada', 'obras vinculadas')} por nombre (aproximado)`) : '') + (BXF.mpts === 'all' ? ptRow('u', `${pl(nU, 'obra', 'obras')} sin vínculo con la base del radar`) : '')
      + (NOB_A ? `<label class="row obchk" for="bx-mapx"><input type="checkbox" id="bx-mapx"${BXF.mapx ? ' checked' : ''}> Incluir vínculos por nombre</label>` : '') : '');
  // ranking
  const ord = units.map((j, r) => [j, uv[r]]).sort((a, b) => (b[1] || 0) - (a[1] || 0));
  const mx = Math.max(1e-9, ...ord.map(x => x[1] || 0), m === 'pc' ? 0 : bxVal(BXA.reg, POPREG, m));
  const bar = (lev2, j, lab, sub, v, on) => `<button type="button" class="brow${on ? ' on' : ''}" data-lev="${lev2}" data-j="${j}"><span class="bl" title="${esc(lab)}">${esc(lab)}${sub ? `<small> · ${esc(sub)}</small>` : ''}</span><span class="bt"><i style="width:${Math.max(0, (v || 0) / mx * 100).toFixed(1)}%"></i></span><span class="bv">${M.f(v)}</span></button>`;
  let rk = ord.map(([j, v]) => bar(lev, j, ter ? TER[j].n : CN(j), ter ? '' : TER[TOF[j]].k, v, ter ? BXF.t === j : BXF.c === j)).join('');
  if (m !== 'pc') rk += `<div class="rk-sep">Sin comuna asignada (no aparecen en el mapa)</div>` + bar('reg', -2, 'Regionales o sin comuna', '', bxVal(BXA.reg, 0, m), BXF.t === -2);
  $('#bx-rank').innerHTML = rk;
  // resumen de la selección: qué tipo de inversión concentra
  const selA = BXF.c >= 0 ? BXA.cm[BXF.c] : BXF.t >= 0 ? BXA.tm[BXF.t] : BXF.t === -2 ? BXA.reg : BXA.all;
  const selN = BXF.c >= 0 ? `${CN(BXF.c)} · ${TER[TOF[BXF.c]].n}` : BXF.t >= 0 ? TER[BXF.t].n : BXF.t === -2 ? 'Iniciativas regionales o sin comuna' : 'Toda la región';
  const cats = bxTopCats(selA, 6), cmx = Math.max(1, ...cats.map(x => x[1].n));
  $('#bx-sel').innerHTML = `<div class="bxs-h"><b>${esc(selN)}</b>${BXF.c >= 0 || BXF.t !== -1 ? '<button type="button" class="btn sm" id="bx-msel-x">Quitar</button>' : ''}</div>
    <div class="bxs-k"><span><b>${f0(selA.n)}</b> ${selA.n === 1 ? 'iniciativa' : 'iniciativas'}</span><span><b>${mmK(selA.s)}</b> MM$ solicitados</span><span><b>${mmK(selA.t)}</b> MM$ costo total</span>${OB ? (() => {
      const inSel = k => (BXF.c >= 0 ? OB.c[k] === BXF.c : BXF.t >= 0 ? OB.c[k] >= 0 && TOF[OB.c[k]] === BXF.t : BXF.t === -2 ? BX.c[OB_J[k]] < 0 : true);
      let n = 0, na = 0; const ini = new Set(); for (let k = 0; k < NOB; k++) if (vis[k] >= 2 && inSel(k)) { n++; if (vis[k] === 3) na++; ini.add(OB_J[k]); }
      return BXF.mpts === 'off' ? '' : `<span><b>${f0(n)}</b> ${n === 1 ? 'obra georreferenciada' : 'obras georreferenciadas'} de ${pl(ini.size, 'iniciativa', 'iniciativas')}${na ? ` (${f0(na)} por nombre)` : ''}</span>`;
    })() : ''}</div>
    ${cats.length ? `<div class="lbl" style="margin:8px 0 4px">Categorías más frecuentes</div>${cats.map(([k, r]) => `<div class="bxs-c"><span title="${esc(catLab(k))}">${esc(catLab(k))}</span><span class="bt"><i style="width:${(r.n / cmx * 100).toFixed(1)}%"></i></span><span class="m">${f0(r.n)} · ${mmK(r.t)} MM$</span></div>`).join('')}` : '<p class="note">Sin iniciativas con estos filtros.</p>'}`;
  const xb = $('#bx-msel-x'); if (xb) xb.addEventListener('click', () => { BXF.t = -1; BXF.c = -1; BXF.page = 0; renderBip(); if (BXM && BXM.map) BXM.fly('reg', -1); });
  const nx = BXL.filter(o => o.ref.x).length;
  setNote($('#bx-mnote'), `Cada iniciativa se ubica en la comuna registrada en el BIP; los territorios suman sus comunas. ${f0(BXA.reg.n)} iniciativas de alcance regional o sin comuna (${mmK(BXA.reg.t)} MM$ de costo total) no se pueden ubicar en el mapa y se muestran aparte en el ranking. El mapa aplica todos los filtros de arriba salvo territorio y comuna, y usa la ${BXF.y ? `postulación de ${BXF.y}` : 'última postulación de cada iniciativa'}.${nx ? ` ${pl(nx, 'iniciativa con monto atípico queda', 'iniciativas con montos atípicos quedan')} fuera de los montos.` : ''} Colores por quintiles.${OB ? ` Puntos y líneas: obras de Geo-CGR (Contraloría) adjudicadas desde 2019, ubicadas con las coordenadas que registra cada servicio (descarga del ${OB.meta.descargado.split('-').reverse().join('/')}). ${f0(NBX_OB)} de las ${f0(NBX)} iniciativas tienen al menos una obra vinculada por código BIP; la mayoría de las obras de Geo-CGR no informa código BIP.${NOB_A ? (() => { const v = OB.meta.vinculo_nombre || {}; return ` Otras ${f0(NOB_A)} obras sin código (o con un código que no está en la base) se vincularon por nombre a ${f0(NBX_OBA)} iniciativas de su comuna, con símbolo hueco: vínculo aproximado, a revisar. Probado con las obras que sí traen código, el método acierta ${pc(v.precision, 0)} de las veces que propone una iniciativa.`; })() : ''} Las obras sin vínculo no responden a los filtros. Clic en una obra vinculada para ver su iniciativa en la tabla.` : ''}`, 'Cómo leer este mapa');
}
function exportBip() {
  const lines = [['Código BIP', 'Nombre', 'Institución responsable', 'Comuna', 'Territorio ERD', 'Tipo de inversión', 'Categoría (aprox.)', 'Lineamientos (aprox.)', 'Fuente de financiamiento', 'Año postulación', 'Etapa', 'RATE', 'Solicitado (miles de $)', 'Costo total etapa (miles de $)', 'Asignado vigente (miles de $)', 'Gasto vigente (miles de $)', 'Monto atípico', 'Obras en Geo-CGR (por código)', 'Obras en Geo-CGR (por nombre, aproximado)', 'Descripción (extracto)']];
  for (const { i } of BX_LAST) {
    const c = BX.c[i];
    for (const kk of BX_ROWS[i]) {
      if (BXF.y && BXH.y[kk] !== BXF.y) continue;
      lines.push([BX.code[i], BX_N[i], BX_INS(i), c >= 0 ? CN(c) : '', c >= 0 ? TER[TOF[c]].n : 'Regional', BX_TIV[BX_TI[i]] || '', catLab(bxCat(i)), LIN.filter((l, j) => (BX.L[i] >> j) & 1).map(l => l.k).join(' '), BX.finv[BX.fin[i]], BXH.y[kk], BX.etv[BXH.e[kk]], BX.ratev[BXH.r[kk]], BXH.s[kk] ?? '', BXH.t[kk] ?? '', BXH.a[kk] ?? '', BXH.g[kk] ?? '', BXH.x[kk] ? 'Sí' : '', BX_OB[i].length || '', BX_OBA[i].length || '', BX_D[i]]);
    }
  }
  saveCSV(lines, 'iniciativas_bip_araucania.csv');
}
function openBip(f) { Object.assign(BXF, { q: '', t: -1, c: -1, cat: '', L: -1, y: 0, y0: 0, e: -1, fin: '', r: -1, ti: new Set(), page: 0 }, f); BXF.open.clear(); setView('bip'); window.scrollTo({ top: 0 }); }

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
  const lines = [['Comuna', 'Territorio ERD', 'Habitantes 2024', 'Km red vial', 'Km pavimentados', '% pavimentado', 'Puentes', 'Puentes con tablero de madera', 'SAIDI 2022 (h)', 'Viviendas sin energía', 'Antenas autorizadas', 'Antenas LTE', 'Subestaciones', 'Servicios sanitarios rurales', 'Beneficiarios SSR', 'SSR con grupo electrógeno', 'Bocatomas', 'Embalses', 'Sedes educación superior', 'Inversión pública 2010-2022 (MM$)', 'Inversión pública per cápita ($)', 'BIP habilitante 2019-2027 (MM$)', 'Zona de rezago', 'Dimensiones de infraestructura en brecha']]
    .concat(ALLC.map(c => [CN(c), TER[TOF[c]].n, POP[c], IN.kmv[c], IN.kmpav[c], (HV.pav[c] * 100).toFixed(1), IN.pue[c], IN.pmad[c], IN.saidi[c], IN.vse[c], IN.ant[c], IN.lte[c], IN.sub[c], IN.ssr[c], IN.ssrb[c], IN.ssrge[c], IN.boc[c], IN.emb[c], IN.ies[c], IN.ipa[c], IN.ipapc[c], Math.round(binvC[c]), IN.rez[c] ? 'Sí' : 'No', trData().com[c].map(k => IF_DIM[k].l).join(', ')]));
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
  ['#hb-csv', '#exe-csv', '#bx-csv', '#ev-csv', '#tb-csv'].forEach(id => { const el = $(id); if (el) el.hidden = false; });
}
  update(false);
  setView(VIEWS.includes(h0) ? h0 : 'cartera');
if (HAS_CLAUDE) {
  window.claude.use('downloads').then(d => { DL = d; if (d) { $('#hb-csv').hidden = false; $('#exe-csv').hidden = false; $('#bx-csv').hidden = false; $('#ev-csv').hidden = false; $('#tb-csv').hidden = false; const b = $('#fi-csv'); if (b && FICHA && FICHA.firms.length) { b.hidden = false; b.onclick = exportFirms; } const b2 = $('#fi-fcsv'); if (b2 && FICHA && FICHA.fin && FICHA.fin.length) { b2.hidden = false; b2.onclick = exportFin; } } }).catch(() => {});
  window.claude.use('sample').then(s => { SAMPLE = s || null; wireClaude(); }).catch(() => { SAMPLE = null; wireClaude(); });
}
})();
