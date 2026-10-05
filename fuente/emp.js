// ================= FILTROS GLOBALES DE EMPRESAS (barra lateral, portada de Tejido Empresarial) =================
const SECTOR_TIP = 'Privado con fines de lucro, sin fines de lucro (fundaciones, corporaciones, cooperativas, comités de agua) o sector público (municipios y servicios públicos), según el SII.';
const stats = m => {
  let n = 0, t = 0, e = 0, mg = 0, ct = 0, n10 = 0, nom = 0, pub = 0, sfl = 0;
  for (let i = 0; i < N; i++) if (m[i]) { n++; const w = TRAB[i]; t += w; if (w > 0) e++; if (TAM[i] >= 3) mg++; if (CT[i]) ct++; if (w >= 10) n10++; if (NOM[i]) nom++; if (SEC[i] === 2) pub++; if (SEC[i] === 1) sfl++; }
  return { n, t, e, mg, ct, n10, nom, pub, sfl };
};
function comAgg(m) {
  const n = new Float64Array(NC), t = new Float64Array(NC), e = new Float64Array(NC), ct = new Float64Array(NC), mg = new Float64Array(NC);
  for (let i = 0; i < N; i++) if (m[i]) { const c = COM[i]; n[c]++; t[c] += TRAB[i]; if (TRAB[i] > 0) e[c]++; if (CT[i]) ct[c]++; if (TAM[i] >= 3) mg[c]++; }
  return { n, t, e, ct, mg };
}
const REG = stats(ALL), COMALL = comAgg(ALL);
Object.assign(UI, { eM1: 'dens', exDim: 'rub', exMet: 'n', exTop: 12, exTable: false, exAuto: true, eSort: 't', eDir: -1, ePage: 0, hmMet: 'lqn', hmCol: 'lin' });
let CTX = null;
const DIRTY = { cartera: false, territorios: false, empresas: true };

// ---- facetas ----
const FACETS = [
  { k: 'ter', l: 'Territorio ERD 2040', skip: 'geo', K: NT, key: i => TOF[COM[i]], lab: j => TER[j].n, sw: j => TCOL[j], isOn: j => F.ter.has(j), set: j => tog(F.ter, j) },
  { k: 'sec', l: 'Sector', tip: SECTOR_TIP, skip: 'sec', K: 4, key: i => SEC[i], lab: j => SECTORS[j], isOn: j => F.sec.has(j), set: j => tog(F.sec, j), hideZero: true },
  { k: 'com', l: 'Comuna', skip: 'geo', K: NC, key: i => COM[i], lab: CN, isOn: j => F.com.has(j), set: j => tog(F.com, j), scroll: true, search: true, sort: true },
  { k: 'lin', l: 'Lineamiento CTCI', skip: 'lin', K: NL, bits: i => LB[i], lab: j => `${LIN[j].k} · ${LSHORT[LIN[j].k]}`, isOn: j => F.lin.has(j), set: j => tog(F.lin, j) },
  { k: 'ctci', l: 'Foco CTCI (aprox.)', skip: 'ctci', K: 6, order: [1, 2, 3, 4, 5, 0], key: i => CT[i], lab: ctLab, isOn: j => F.ctci.has(j), set: j => tog(F.ctci, j) },
  { k: 'rub', l: 'Rubro', skip: 'rub', K: NR, key: i => RUB[i], lab: j => D.rubros[j].l, isOn: j => F.rub.has(j), set: j => tog(F.rub, j), scroll: true, sort: true },
  { k: 'sub', l: 'Subrubro', skip: 'rub', K: NS, key: i => SUB[i], lab: j => D.subs[j].l, isOn: j => F.sub.has(j), set: j => tog(F.sub, j), scroll: true, search: true, sort: true, limit: 40, closed: true },
  { k: 'act', l: 'Actividad económica', skip: 'rub', K: NA, key: i => ACT[i], lab: j => D.acts[j].l, isOn: j => F.act.has(j), set: j => tog(F.act, j), scroll: true, search: true, sort: true, limit: 40, closed: true },
  { k: 'tam', l: 'Tamaño según ventas', skip: 'tam', K: 5, key: i => TAM[i], lab: j => TAMS[j], isOn: j => F.tam.has(j), set: j => tog(F.tam, j) },
  { k: 'tb', l: 'Trabajadores dependientes', skip: 'tb', K: 5, key: i => TB[i], lab: j => TBS[j], isOn: j => F.tb.has(j), set: j => tog(F.tb, j) },
];
const facetSearch = {};
const facetsHost = $('#facets');
for (const fc of FACETS) {
  const det = document.createElement('details'); det.className = 'facet'; det.open = !fc.closed; det.dataset.k = fc.k;
  det.innerHTML = `<summary><span${fc.tip ? ` title="${esc(fc.tip)}"` : ''}>${esc(fc.l)}</span><span class="on"></span></summary>` + (fc.search ? `<input class="inp fsearch" type="search" placeholder="Buscar ${esc(fc.l.toLowerCase())}" aria-label="Buscar ${esc(fc.l.toLowerCase())}" data-fs="${fc.k}">` : '') + `<div class="flist${fc.scroll ? ' scroll' : ''}"></div>`;
  facetsHost.appendChild(det);
}
facetsHost.addEventListener('input', e => { const k = e.target.dataset.fs; if (k) { facetSearch[k] = norm(e.target.value.trim()); renderFacet(FACETS.find(f => f.k === k)); } });
facetsHost.addEventListener('change', e => {
  const el = e.target; if (!el.dataset.fk) return;
  const fc = FACETS.find(f => f.k === el.dataset.fk); fc.set(+el.dataset.v); FP.preset = null;
  if (fc.k === 'rub' && UI.exAuto) UI.exDim = F.rub.size ? 'sub' : 'rub';
  if (fc.k === 'sub' && UI.exAuto) UI.exDim = F.sub.size ? 'act' : (F.rub.size ? 'sub' : 'rub');
  update();
});
facetsHost.addEventListener('toggle', e => { const det = e.target; if (det.open && det.dataset.k) renderFacet(FACETS.find(f => f.k === det.dataset.k)); }, true);
const facetCounts = {};
let nomCount = 0;
function computeFacetCounts() {
  const cache = {};
  for (const fc of FACETS) {
    const m = cache[fc.skip] || (cache[fc.skip] = mask(new Set([fc.skip])));
    const cnt = new Float64Array(fc.K);
    if (fc.bits) { for (let i = 0; i < N; i++) if (m[i]) { const b = fc.bits(i); if (b) for (let j = 0; j < fc.K; j++) if (b & (1 << j)) cnt[j]++; } }
    else for (let i = 0; i < N; i++) if (m[i]) cnt[fc.key(i)]++;
    facetCounts[fc.k] = cnt;
  }
  const mn = mask(new Set(['nom'])); nomCount = 0; for (let i = 0; i < N; i++) if (mn[i] && NOM[i]) nomCount++;
}
function renderFacet(fc) {
  const det = facetsHost.querySelector(`details[data-k="${fc.k}"]`);
  const on = []; for (let j = 0; j < fc.K; j++) if (fc.isOn(j)) on.push(j);
  det.querySelector('.on').textContent = on.length ? on.length + (on.length === 1 ? ' activo' : ' activos') : '';
  if (!det.open) return;
  const cnt = facetCounts[fc.k]; let idx = fc.order ? fc.order.slice() : [...Array(fc.K).keys()];
  if (fc.k === 'com' && F.ter.size) idx = idx.filter(j => F.ter.has(TOF[j]) || F.com.has(j));
  if (fc.k === 'sub' && F.rub.size) idx = idx.filter(j => F.rub.has(D.subs[j].r) || F.sub.has(j));
  if (fc.k === 'act' && (F.sub.size || F.rub.size)) idx = idx.filter(j => F.act.has(j) || (F.sub.size ? F.sub.has(D.acts[j].s) : F.rub.has(D.subs[D.acts[j].s].r)));
  const q = facetSearch[fc.k]; if (q) idx = idx.filter(j => norm(fc.lab(j)).includes(q) || fc.isOn(j));
  if (fc.hideZero) idx = idx.filter(j => cnt[j] > 0 || fc.isOn(j));
  if (fc.sort) idx.sort((a, b) => (fc.isOn(b) - fc.isOn(a)) || cnt[b] - cnt[a]);
  let more = 0; if (fc.limit && idx.length > fc.limit && !q) { more = idx.length - fc.limit; idx = idx.slice(0, fc.limit); }
  let mx = 1; idx.forEach(j => { if (cnt[j] > mx) mx = cnt[j]; });
  det.querySelector('.flist').innerHTML = idx.map(j => {
    const isOn = fc.isOn(j), c = cnt[j];
    return `<label class="fi${isOn ? ' on' : ''}${c === 0 && !isOn ? ' zero' : ''}" title="${esc(fc.lab(j))}"><input type="checkbox" data-fk="${fc.k}" data-v="${j}"${isOn ? ' checked' : ''}><span class="t"><span>${fc.sw ? `<i class="tsw" style="background:${fc.sw(j)}"></i>` : ''}${esc(fc.lab(j))}</span><span class="bar"><i style="width:${(c / mx * 100).toFixed(1)}%"></i></span></span><span class="c">${f0(c)}</span></label>`;
  }).join('') + (more ? `<div class="fmore">${f0(more)} más · escribe para buscar</div>` : '') + (idx.length ? '' : '<div class="fmore">Sin coincidencias</div>');
}
const STRAT_CHAINS = [
  { id: 'agro', n: 'Cadena Agroalimentaria', icon: '🌾', subs: [0, 26, 24, 23, 21, 91, 96], desc: 'Apoyo agrícola (A016), agroindustria (C103, C105, C106, C107) y comercio de alimentos (G463, G472)' },
  { id: 'for', n: 'Forestal y Madera', icon: '🌲', subs: [6, 10, 11, 12, 16, 47, 56], desc: 'Silvicultura, extracción de madera, aserraderos, tableros y muebles (A021-024, C161, C162, C310)' },
  { id: 'tur', n: 'Turismo y Experiencias', icon: '🏔️', subs: [117, 119, 121, 164, 178, 194, 197], desc: 'Alojamientos, restaurantes, operadores turísticos y servicios recreativos (I551, I561, N791, R931, R932)' },
  { id: 'ebtc', n: 'I+D y Base Tecnológica (EBTC)', icon: '🔬', subs: [156, 157, 154, 58, 36, 125, 133], desc: 'Investigación y desarrollo experimental (M721, M722), laboratorios (M712), biofarma (C210), software (J620, J631)' },
  { id: 'ene', n: 'Energía y Climatización', icon: '⚡', subs: [71, 72, 73, 46, 51], desc: 'Generación ERNC (hidro, solar, eólica), transmisión, distribución, gas, vapor, climatización y equipos eléctricos (D351, D352, D353, C271, C279)' },
  { id: 'const', n: 'Construcción e Instalaciones', icon: '🏗️', subs: [81, 82, 85, 86, 87], desc: 'Edificación, ingeniería civil, instalaciones eléctricas y terminaciones (F410, F421, F432, F433, F439)' },
  { id: 'circ', n: 'Economía Circular', icon: '♻️', subs: [70, 74, 77, 78, 79, 204], desc: 'Gestión y valorización de residuos, chatarra, reciclaje y reparación (E381, E383, C331, S952)' }
];
let ACTIVE_CHAIN = null;

function renderStratFacet() {
  const host = $('#f-strat-list');
  const onBadge = $('#f-strat-on');
  if (!host) return;
  const m = mask(new Set(['rub']));
  let maxCnt = 1;
  const counts = STRAT_CHAINS.map(ch => {
    let cnt = 0;
    const sSet = new Set(ch.subs);
    for (let i = 0; i < N; i++) {
      if (m[i] && sSet.has(SUB[i])) {
        const tam = tamOf(TRAMO[i]);
        if (tam === 1 || tam === 2) cnt++;
      }
    }
    if (cnt > maxCnt) maxCnt = cnt;
    return cnt;
  });

  let h = '';
  STRAT_CHAINS.forEach((ch, idx) => {
    const isSel = ACTIVE_CHAIN === ch.id;
    const cnt = counts[idx];
    const pct = ((cnt / maxCnt) * 100).toFixed(1);
    h += `<label class="fi${isSel ? ' on' : ''}${cnt === 0 && !isSel ? ' zero' : ''}" style="cursor:pointer;padding:4px 6px;margin-bottom:2px" title="${esc(ch.desc)}">
      <input type="checkbox" data-chain="${ch.id}" ${isSel ? 'checked' : ''}>
      <span class="t">
        <span><b>${ch.icon}</b> ${esc(ch.n)}</span>
        <span class="bar"><i style="width:${pct}%"></i></span>
      </span>
      <span class="c">${f0(cnt)}</span>
    </label>`;
  });
  host.innerHTML = h;
  if (onBadge) onBadge.textContent = ACTIVE_CHAIN ? '1' : '';
}

if ($('#f-strat-list')) {
  $('#f-strat-list').addEventListener('change', e => {
    const chId = e.target.dataset.chain;
    if (!chId) return;
    if (ACTIVE_CHAIN === chId) {
      ACTIVE_CHAIN = null;
      clearFilters();
    } else {
      ACTIVE_CHAIN = chId;
      const ch = STRAT_CHAINS.find(c => c.id === chId);
      clearFilters();
      ACTIVE_CHAIN = chId;
      ch.subs.forEach(s => F.sub.add(s));
      F.tam.add(1); F.tam.add(2); // MiPyME
      UI.exDim = 'sub';
    }
    FP.preset = ACTIVE_CHAIN ? 'lens-' + ACTIVE_CHAIN : 'all';
    syncInputs();
    update();
  });
}

const renderFacets = () => { FACETS.forEach(renderFacet); $('#f-nom-n').textContent = f0(nomCount); renderStratFacet(); };

// ---- entradas de la barra ----
let qT;
$('#f-q').addEventListener('input', e => { clearTimeout(qT); qT = setTimeout(() => { F.q = norm(e.target.value.trim()); FP.preset = null; update(); }, 220); });
const yrIn = (id, key) => $(id).addEventListener('change', e => { const v = parseInt(e.target.value, 10); F[key] = isFinite(v) ? v : null; FP.preset = null; update(); });
yrIn('#f-y0', 'y0'); yrIn('#f-y1', 'y1');
$('#f-vig').addEventListener('change', e => { F.vig = e.target.checked; FP.preset = null; update(); });
$('#f-nom').addEventListener('change', e => { F.nom = e.target.checked; FP.preset = null; update(); });
const setPer = v => { FP.p0 = +v; $('#f-per').value = String(v); $('#evo-per').value = String(v); update(); };
$('#f-per').addEventListener('change', e => setPer(e.target.value));
$('#evo-per').addEventListener('change', e => setPer(e.target.value));
function clearFilters() { ACTIVE_CHAIN = null; ['ter', 'com', 'lin', 'rub', 'sub', 'act', 'tam', 'tb', 'sec', 'ctci'].forEach(k => F[k].clear()); F.y0 = F.y1 = null; F.vig = false; F.nom = false; F.q = ''; }
function syncInputs() { if (!F.q) $('#f-q').value = ''; $('#f-y0').value = F.y0 ?? ''; $('#f-y1').value = F.y1 ?? ''; $('#f-vig').checked = F.vig; $('#f-nom').checked = F.nom; renderStratFacet(); }
$('#f-reset').addEventListener('click', () => { clearFilters(); FP.preset = 'all'; UI.exDim = 'rub'; UI.exAuto = true; syncInputs(); update(); });
const WORK = $('#work'), RAIL = $('#rail');
const narrow = () => matchMedia('(max-width:1060px)').matches;
$('#rail-open').addEventListener('click', () => { if (narrow()) RAIL.classList.add('open'); else WORK.classList.remove('collapsed'); });
$('#rail-hide').addEventListener('click', () => { if (narrow()) RAIL.classList.remove('open'); else WORK.classList.add('collapsed'); });
$('#rail-close').addEventListener('click', () => RAIL.classList.remove('open'));

// ---- atajos ----
const PRESETS = [
  { k: 'all', g: 'Vistas rápidas', l: 'Toda la región', fn: () => {} },
  { k: 'ctci', g: 'Vistas rápidas', l: 'Oferta CTCI', fn: () => { [1, 2, 3, 4, 5].forEach(j => F.ctci.add(j)); UI.exDim = 'ctci'; } },
  { k: 'dem', g: 'Vistas rápidas', l: 'Demanda potencial de innovación', fn: () => { ['A', 'B', 'C', 'D', 'E'].forEach(k => F.rub.add(RIDX(k))); F.sec.add(0); [2, 3, 4].forEach(j => F.tb.add(j)); UI.exDim = 'sub'; } },
  { k: 'new', g: 'Vistas rápidas', l: 'Emprendimientos 2020+', fn: () => { F.y0 = 2020; F.sec.add(0); UI.exDim = 'rub'; } },
  { k: 'agro', g: 'Vistas rápidas', l: 'Silvoagropecuario', fn: () => { F.rub.add(RIDX('A')); UI.exDim = 'sub'; } },
  { k: 'manu', g: 'Vistas rápidas', l: 'Manufactura', fn: () => { F.rub.add(RIDX('C')); UI.exDim = 'sub'; } },
  { k: 'tur', g: 'Vistas rápidas', l: 'Alojamiento y comidas', fn: () => { F.rub.add(RIDX('I')); UI.exDim = 'sub'; } },

  // Lentes Estratégicos (Cadenas Productivas Clave)
  { k: 'lens-agro', g: 'Cadenas Estratégicas', l: '🌾 Cadena Agroalimentaria', title: 'Apoyo agrícola y poscosecha (A016), agroindustria (C103, C105, C106, C107) y comercio de alimentos (G463, G472) · 3.189 MiPyMEs', fn: () => { [0, 26, 24, 23, 21, 91, 96].forEach(s => F.sub.add(s)); F.tam.add(1); F.tam.add(2); UI.exDim = 'sub'; } },
  { k: 'lens-for', g: 'Cadenas Estratégicas', l: '🌲 Forestal y Madera', title: 'Silvicultura, extracción de madera, aserraderos, tableros y muebles (A021-024, C161, C162, C310) · 929 MiPyMEs', fn: () => { [6, 10, 11, 12, 16, 47, 56].forEach(s => F.sub.add(s)); F.tam.add(1); F.tam.add(2); UI.exDim = 'sub'; } },
  { k: 'lens-tur', g: 'Cadenas Estratégicas', l: '🏔️ Turismo y Experiencias', title: 'Alojamientos, restaurantes, operadores turísticos y servicios recreativos (I551, I561, N791, R931, R932) · 2.402 MiPyMEs', fn: () => { [117, 119, 121, 164, 178, 194, 197].forEach(s => F.sub.add(s)); F.tam.add(1); F.tam.add(2); UI.exDim = 'sub'; } },
  { k: 'lens-ebtc', g: 'Cadenas Estratégicas', l: '🔬 I+D y Base Tecnológica (EBTC)', title: 'Investigación y desarrollo experimental (M721, M722), laboratorios (M712), biofarma (C210), sensores y software (J620, J631) · 331 MiPyMEs', fn: () => { [156, 157, 154, 58, 36, 125, 133].forEach(s => F.sub.add(s)); F.tam.add(1); F.tam.add(2); UI.exDim = 'sub'; } },
  { k: 'lens-ene', g: 'Cadenas Estratégicas', l: '⚡ Energía y Climatización', title: 'Generación ERNC (hidro, eólica, solar), transmisión, distribución, gas, vapor, climatización y equipos eléctricos (D351, D352, D353, C271, C279) · 53 MiPyMEs (80 empresas)', fn: () => { [71, 72, 73, 46, 51].forEach(s => F.sub.add(s)); F.tam.add(1); F.tam.add(2); UI.exDim = 'sub'; } },
  { k: 'lens-const', g: 'Cadenas Estratégicas', l: '🏗️ Construcción e Instalaciones', title: 'Edificación, ingeniería civil, instalaciones eléctricas y terminaciones (F410, F421, F432, F433, F439) · 3.065 MiPyMEs', fn: () => { [81, 82, 85, 86, 87].forEach(s => F.sub.add(s)); F.tam.add(1); F.tam.add(2); UI.exDim = 'sub'; } },
  { k: 'lens-circ', g: 'Cadenas Estratégicas', l: '♻️ Economía Circular', title: 'Gestión y valorización de residuos, chatarra, reciclaje y reparación (E381, E383, C331, S952) · 423 MiPyMEs', fn: () => { [70, 74, 77, 78, 79, 204].forEach(s => F.sub.add(s)); F.tam.add(1); F.tam.add(2); UI.exDim = 'sub'; } },

  ...LIN.map((l, L) => ({ k: 'L' + L, g: 'Lineamiento', l: `${l.k} ${LSHORT[l.k]}`, title: l.n, fn: () => { F.lin.add(L); UI.exDim = 'sub'; } })),
  { k: 'nom', g: 'FRPD', l: 'En nómina Res. 1/2026', title: 'Instituciones privadas sin fines de lucro habilitadas para el primer llamado FRPD 2026 con casa matriz en la región', fn: () => { F.nom = true; UI.exDim = 'com'; } },
];
{
  let h = '', g0 = null;
  PRESETS.forEach(p => { if (p.g !== g0) { h += `${g0 ? '</div>' : ''}<div class="pgrp"><span class="lbl">${esc(p.g)}</span>`; g0 = p.g; } h += `<button class="btn" type="button" data-p="${p.k}" aria-pressed="false"${p.title ? ` title="${esc(p.title)}"` : ''}>${esc(p.l)}</button>`; });
  $('#presets').innerHTML = h + '</div>';
}
$('#presets').addEventListener('click', e => {
  const b = e.target.closest('button[data-p]'); if (!b) return;
  const keepGeo = { ter: new Set(F.ter), com: new Set(F.com) };
  clearFilters(); F.ter = keepGeo.ter; F.com = keepGeo.com; UI.exAuto = true;
  const p = PRESETS.find(x => x.k === b.dataset.p);
  if (p.k.startsWith('lens-')) ACTIVE_CHAIN = p.k.replace('lens-', '');
  p.fn(); FP.preset = p.k; syncInputs(); update();
  if (p.k !== 'all') toast('Vista aplicada: ' + p.l + (hasGeo() ? ' (se mantiene el territorio elegido)' : ''));
});

// ---- migas (filtros activos) ----
function activeChips() {
  const out = [];
  F.ter.forEach(j => out.push(['g', TER[j].n, () => F.ter.delete(j)]));
  F.com.forEach(j => out.push(['g', CN(j), () => F.com.delete(j)]));
  F.lin.forEach(j => out.push(['l', `${LIN[j].k} ${LSHORT[LIN[j].k]}`, () => F.lin.delete(j)]));
  F.sec.forEach(j => out.push(['a', SECTORS[j], () => F.sec.delete(j)]));
  F.ctci.forEach(j => out.push(['a', 'CTCI: ' + ctLab(j), () => F.ctci.delete(j)]));
  F.rub.forEach(j => out.push(['a', D.rubros[j].l, () => F.rub.delete(j)]));
  if (ACTIVE_CHAIN) {
    const ch = STRAT_CHAINS.find(c => c.id === ACTIVE_CHAIN);
    if (ch) out.push(['a', `${ch.icon} ${ch.n}`, () => { ACTIVE_CHAIN = null; clearFilters(); syncInputs(); update(); }]);
  } else {
    F.sub.forEach(j => out.push(['a', D.subs[j].l, () => F.sub.delete(j)]));
  }
  F.act.forEach(j => out.push(['a', D.acts[j].l, () => F.act.delete(j)]));
  F.tam.forEach(j => out.push(['a', TAMS[j], () => F.tam.delete(j)]));
  F.tb.forEach(j => out.push(['a', TBS[j] + (j ? ' trabajadores' : ''), () => F.tb.delete(j)]));
  if (F.nom) out.push(['a', 'En nómina Res. 1/2026', () => { F.nom = false; }]);
  if (F.y0 != null || F.y1 != null) out.push(['a', 'Inicio ' + (F.y0 ?? '…') + '–' + (F.y1 ?? '…'), () => { F.y0 = F.y1 = null; }]);
  if (F.vig) out.push(['a', 'Solo vigentes', () => { F.vig = false; }]);
  if (F.q) out.push(['a', 'Búsqueda: ' + $('#f-q').value, () => { F.q = ''; $('#f-q').value = ''; }]);
  return out;
}
function filterText(attrOnly) { return activeChips().filter(c => !attrOnly || c[0] === 'a').map(c => c[1]).join(' · ') || 'ninguno'; }
let CHIPS = [];
function renderCrumbs() {
  CHIPS = activeChips();
  $('#crumbs').innerHTML = '<span class="root">La Araucanía</span>' + CHIPS.map((c, i) => `<span class="sep">/</span><span class="chip${c[0] === 'a' ? '' : ' g'}"><span title="${esc(c[1])}">${esc(c[1])}</span><button type="button" data-chip="${i}" aria-label="Quitar filtro ${esc(c[1])}">×</button></span>`).join('');
  $$('#presets button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.p === FP.preset)));
  $('#rail-n').textContent = CHIPS.length ? `(${CHIPS.length})` : '';
}
$('#crumbs').addEventListener('click', e => { const b = e.target.closest('button[data-chip]'); if (!b) return; CHIPS[+b.dataset.chip][2](); FP.preset = null; syncInputs(); update(); });

// ---- recálculo global ----
function update(render = true) {
  computeGeo();
  const M0 = mask();
  const MAt = hasGeo() || hasLin() ? mask(new Set(['geo', 'lin'])) : M0;
  const MG = hasGeo() ? mask(new Set(['geo'])) : M0;
  recomputeSII(MAt);
  const gl = geoList();
  CTX = { M0, MG, st: stats(M0), cg: comAgg(MG), ser: seriesAgg(true), serNG: seriesAgg(false), selCom: new Set(gl.length < NC ? gl : []), geoList: gl };
  CTX.popSel = gl.reduce((a, c) => a + POP[c], 0);
  computeFacetCounts(); renderFacets(); renderCrumbs();
  // la ficha y el perfil siguen al territorio o lineamiento elegido cuando es uno solo
  const ts = new Set(gl.map(c => TOF[c]));
  if (hasGeo() && ts.size === 1) { UI.t = UI.ter = [...ts][0]; }
  if (F.lin.size === 1) UI.L = [...F.lin][0];
  $('#count').innerHTML = `<b>${f0(CTX.st.n)}</b> de ${f0(N)} empresas`;
  $('#tab-emp-n').textContent = anyFilter() ? f0(CTX.st.n) : NF0.format(N);
  UI.ePage = 0;
  DIRTY.cartera = DIRTY.territorios = DIRTY.empresas = true;
  if (!render) return;
  if (UI.view === 'cartera') { renderCartera(true); DIRTY.cartera = false; }
  else if (UI.view === 'territorios') { renderTerritorios(); DIRTY.territorios = false; }
  else if (UI.view === 'empresas') renderEmpresas();
}
function openEmpresas(o) {
  F.ter.clear(); F.com.clear(); F.lin.clear();
  if (o.ter != null) F.ter.add(o.ter);
  if (o.lin != null) { F.lin.add(o.lin); UI.exDim = 'sub'; }
  if (o.ctci) { F.ctci.clear(); [1, 2, 3, 4, 5].forEach(j => F.ctci.add(j)); UI.exDim = 'ctci'; }
  FP.preset = null; UI.exAuto = false; syncInputs(); update(false); setView('empresas');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ================= EMPRESAS (vista Explorar de Tejido Empresarial) =================
const kfmt = v => (v >= 10000 ? NF0.format(Math.round(v / 1000)) + 'k' : v >= 1000 ? NF1.format(v / 1000) + 'k' : f0(v));
const seqRamp = t => ramp(SEQ, t);
function quantBreaks(vals) {
  const v = vals.filter(x => isFinite(x)).sort((a, b) => a - b); if (!v.length) return [0, 0, 0, 0, 0, 0];
  const q = p => { const k = (v.length - 1) * p, lo = Math.floor(k), hi = Math.ceil(k); return v[lo] + (v[hi] - v[lo]) * (k - lo); };
  return [0, 0.2, 0.4, 0.6, 0.8, 1].map(q);
}
const clsOf = (v, br) => { for (let i = 1; i < br.length - 1; i++) if (v <= br[i]) return i - 1; return br.length - 2; };
const lqCls = v => (v < 0.67 ? 0 : v < 0.9 ? 1 : v <= 1.1 ? 2 : v <= 1.5 ? 3 : 4);
const lqPal = () => [DIV.neg, mix(DIV.mid, DIV.neg, 0.5), DIV.mid, mix(DIV.mid, DIV.pos, 0.5), DIV.pos];
const refStats = () => {
  if (!hasGeo()) return { n: REG.n, t: REG.t, ct: REG.ct, mg: REG.mg, sn: SREG.n, st: SREG.t, same: false, filtN: hasLin() || hasAttr() ? CTX.st.n : REG.n };
  const A = CTX.cg, s = a => a.reduce((x, y) => x + y, 0);
  return { n: s(A.n), t: s(A.t), ct: s(A.ct), mg: s(A.mg), sn: CTX.serNG.n, st: CTX.serNG.t, same: hasLin() || hasAttr() };
};
// mapa (sin desplazamiento; clic filtra por comuna)
const LABEL_CORE = new Set(['Temuco', 'Angol', 'Victoria', 'Villarrica', 'Pucón', 'Lautaro', 'Lonquimay', 'Carahue', 'Curacautín', 'Padre Las Casas', 'Nueva Imperial', 'Collipulli', 'Loncoche', 'Cunco', 'Traiguén', 'Purén', 'Toltén']);
function createMapE(host, opt) {
  const svg = svgEl('svg', { viewBox: VB.join(' '), class: 'map-svg static', role: 'img', 'aria-label': 'Mapa de comunas de La Araucanía' });
  const gCom = svgEl('g'), gTer = svgEl('g'), gSel = svgEl('g'), gLab = svgEl('g');
  const paths = D.comunas.map((c, ci) => { const p = svgEl('path', { d: c.d, class: 'com', 'data-ci': ci, 'vector-effect': 'non-scaling-stroke' }); gCom.appendChild(p); return p; });
  TER.forEach(t => gTer.appendChild(svgEl('path', { d: t.d, class: 'ter', 'vector-effect': 'non-scaling-stroke' })));
  D.comunas.forEach((c, ci) => { const t = svgEl('text', { x: c.lx, y: c.ly, class: 'cl', 'text-anchor': 'middle', 'data-ci': ci }); t.textContent = c.l; gLab.appendChild(t); });
  svg.append(gCom, gTer, gSel, gLab); host.appendChild(svg);
  const hov = svgEl('path', { class: 'hovo', 'vector-effect': 'non-scaling-stroke' }); hov.style.display = 'none'; gSel.appendChild(hov);
  function scaleText() {
    const w = svg.getBoundingClientRect().width, k = w ? VB[2] / w : 1;
    gLab.setAttribute('font-size', 11 * k); gLab.setAttribute('stroke-width', 3.2 * k);
    for (const t of gLab.children) t.style.display = (LABEL_CORE.has(t.textContent) || opt.selected().has(+t.dataset.ci)) ? '' : 'none';
  }
  let hoverCi = -1;
  svg.addEventListener('pointermove', e => {
    const ci = e.target.dataset && e.target.dataset.ci != null && e.target.classList.contains('com') ? +e.target.dataset.ci : -1;
    if (ci !== hoverCi) { hoverCi = ci; if (ci >= 0) { hov.setAttribute('d', paths[ci].getAttribute('d')); hov.style.display = ''; } else hov.style.display = 'none'; }
    if (ci >= 0) { const t = opt.tip(ci); showTip(e, t.title, t.rows, t.note); } else hideTip();
  });
  svg.addEventListener('pointerleave', () => { hoverCi = -1; hov.style.display = 'none'; hideTip(); });
  svg.addEventListener('click', e => { const ci = e.target.dataset && e.target.dataset.ci != null ? +e.target.dataset.ci : -1; if (ci >= 0) opt.click(ci); });
  const legend = document.createElement('div'); legend.className = 'legend'; host.after(legend);
  new ResizeObserver(() => scaleText()).observe(svg);
  return {
    legend,
    paint(fills, selected) {
      for (let ci = 0; ci < NC; ci++) paths[ci].style.fill = fills[ci];
      [...gSel.querySelectorAll('.selo')].forEach(p => p.remove());
      selected.forEach(ci => gSel.appendChild(svgEl('path', { d: paths[ci].getAttribute('d'), class: 'selo', 'vector-effect': 'non-scaling-stroke' })));
      scaleText();
    },
  };
}
const MAPIND_E = [
  { k: 'n', l: 'Empresas', short: 'Empresas' },
  { k: 'dens', l: 'Empresas por 1.000 habitantes', short: 'Por 1.000 hab.' },
  { k: 'lq', l: 'Cociente de localización de la selección', short: 'Cociente' },
  { k: 'g', l: 'Crecimiento de empresas', short: 'Crecimiento' },
];
const indLabelE = k => (k === 'g' ? 'Crecimiento de empresas ' + pLab() : MAPIND_E.find(m => m.k === k).l);
function comunaValues(ind) {
  const A = CTX.cg, s = CTX.serNG, v = new Array(NC).fill(NaN), ok = new Array(NC).fill(true), totSel = A.n.reduce((a, b) => a + b, 0);
  for (let c = 0; c < NC; c++) {
    const n = A.n[c];
    if (ind === 'n') v[c] = n;
    else if (ind === 'dens') v[c] = n / POP[c] * 1000;
    else if (ind === 'g') { const a = s.pcy[pIdx() * NC + c], z = s.pcy[LAST * NC + c]; v[c] = a > 0 ? z / a - 1 : NaN; ok[c] = a >= 5; }
    else if (ind === 'lq') { v[c] = COMALL.n[c] && totSel ? (n / COMALL.n[c]) / (totSel / N) : NaN; ok[c] = n >= 3; }
    if (!isFinite(v[c])) ok[c] = false;
  }
  return { v, ok };
}
function fmtInd(ind, x) { if (!isFinite(x)) return '–'; if (ind === 'n') return f0(x); if (ind === 'dens') return f1(x); if (ind === 'g') return pcs(x); if (ind === 'lq') return f2(x); return f1(x); }
let ME = null;
function toggleCom(ci) { tog(F.com, ci); FP.preset = null; update(); }
function comunaTipE(ci) {
  const A = CTX.cg, c = D.comunas[ci], { v } = comunaValues(UI.eM1);
  return { title: c.l + ' · ' + TER[TOF[ci]].n, rows: [[fmtInd(UI.eM1, v[ci]), indLabelE(UI.eM1).toLowerCase()], [f0(A.n[ci]), 'empresas' + (hasLin() || hasAttr() ? ' en la selección' : '')], [f0(A.t[ci]), 'trabajadores dependientes'], [f0(c.pop), 'habitantes (Censo 2024)']], note: F.com.has(ci) ? 'Clic para quitar el filtro' : 'Clic para filtrar por esta comuna' };
}
function renderM1E() {
  if (!ME) ME = createMapE($('#e-m1'), { click: toggleCom, tip: comunaTipE, selected: () => F.com });
  const seg = $('#e-m1-ind');
  seg.innerHTML = MAPIND_E.map(m => `<button type="button" data-k="${m.k}" aria-pressed="${UI.eM1 === m.k}">${m.short}</button>`).join('');
  const ind = UI.eM1, { v, ok } = comunaValues(ind); let fills, rows;
  if (ind === 'lq') { const pal = lqPal(); fills = v.map((x, c) => (ok[c] ? pal[lqCls(x)] : NODATA)); const labs = ['Menos de 0,67', '0,67 – 0,9', '0,9 – 1,1 (similar a la región)', '1,1 – 1,5', 'Más de 1,5']; rows = pal.map((col, i) => [col, labs[i]]).reverse(); }
  else { const br = quantBreaks(v.filter((x, c) => ok[c])); fills = v.map((x, c) => (ok[c] ? SEQ[clsOf(x, br)] : NODATA)); rows = SEQ.map((col, i) => [col, fmtInd(ind, br[i]) + ' – ' + fmtInd(ind, br[i + 1])]).reverse(); }
  if (ok.some(x => !x)) rows.push([NODATA, 'Sin datos suficientes']);
  ME.paint(fills, CTX.selCom);
  ME.legend.innerHTML = `<b>${esc(indLabelE(ind))}</b>` + rows.map(([c, l]) => `<span class="row"><span class="sw" style="background:${c}"></span>${esc(l)}</span>`).join('');
  $('#e-m1-note').textContent = ind === 'lq' && !(hasLin() || hasAttr()) ? 'El cociente compara la selección con el total regional: aplica un filtro de lineamiento, rubro, tamaño, sector o CTCI para usarlo.'
    : ind === 'g' && CTX.serNG.partial ? 'El crecimiento no considera los filtros de actividad, búsqueda, año de inicio, vigencia ni nómina.' : (hasGeo() ? 'Las comunas filtradas se marcan en ámbar; el mapa muestra todas para comparar. Las líneas gruesas son los territorios ERD.' : 'Las líneas gruesas son los límites de los territorios ERD 2040.');
}
$('#e-m1-ind').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; UI.eM1 = b.dataset.k; renderM1E(); });
function renderKpisE() {
  const s = CTX.st, sr = CTX.ser, g = gr(sr.n), gR = gr(SREG.n), R = refStats(), filt = anyFilter();
  const k = [
    ['Empresas', f0(s.n), filt ? pc(s.n / R.n) + ' de la región' + (R.same ? ' (mismo filtro)' : '') + (isFinite(g) ? ' · ' + pcs(g) + ' desde ' + (SY0 + pIdx()) + (sr.partial ? '*' : '') : '') : pcs(gR) + ' desde ' + (SY0 + pIdx())],
    ['Trabajadores dependientes', f0(s.t), filt ? pc(R.t ? s.t / R.t : NaN) + ' de la región' + (R.same ? ' (mismo filtro)' : '') : pcs(grT(SREG.t)) + ' desde ' + (SY0 + pIdxT())],
    ['Empresas empleadoras', f0(s.e), pc(s.n ? s.e / s.n : NaN) + ' de la selección'],
    ['Medianas y grandes', f0(s.mg), pc(s.n ? s.mg / s.n : NaN) + ' · región ' + pc(R.n ? R.mg / R.n : NaN)],
    ['Empresas CTCI (aprox.)', f0(s.ct), pc(s.n ? s.ct / s.n : NaN) + ' · región ' + pc(R.n ? R.ct / R.n : NaN)],
    ['Sin fines de lucro y públicas', f0(s.sfl + s.pub), `${f0(s.sfl)} sin fines de lucro · ${f0(s.pub)} públicas${s.nom ? ` · ${s.nom} en nómina` : ''}`],
  ];
  $('#e-kpis').innerHTML = k.map(([l, v, sub]) => `<div class="kpi"><span class="l">${l}</span><span class="v">${v}</span><span class="s">${sub}</span></div>`).join('');
}
// explorador
const DIMS = [
  { k: 'ter', l: 'Territorio ERD', K: NT, key: i => TOF[COM[i]], lab: j => TER[j].n, click: j => tog(F.ter, j), on: j => F.ter.has(j) },
  { k: 'com', l: 'Comuna', K: NC, key: i => COM[i], lab: CN, click: j => tog(F.com, j), on: j => F.com.has(j) },
  { k: 'lin', l: 'Lineamiento CTCI', K: NL, bits: i => LB[i], ord: [...Array(NL).keys()], lab: j => `${LIN[j].k} · ${LSHORT[LIN[j].k]}`, click: j => { tog(F.lin, j); if (UI.exAuto && F.lin.has(j)) UI.exDim = 'sub'; }, on: j => F.lin.has(j) },
  { k: 'rub', l: 'Rubro (sección CIIU)', K: NR, key: i => RUB[i], lab: RLAB, click: j => { tog(F.rub, j); if (UI.exAuto && F.rub.has(j)) UI.exDim = 'sub'; }, on: j => F.rub.has(j) },
  { k: 'sub', l: 'Subrubro', K: NS, key: i => SUB[i], lab: j => D.subs[j].l, click: j => { tog(F.sub, j); if (UI.exAuto && F.sub.has(j)) UI.exDim = 'act'; }, on: j => F.sub.has(j) },
  { k: 'act', l: 'Actividad económica', K: NA, key: i => ACT[i], lab: j => D.acts[j].l, click: j => tog(F.act, j), on: j => F.act.has(j) },
  { k: 'ctci', l: 'Grupo CTCI (aprox.)', K: 6, ord: [1, 2, 3, 4, 5, 0], key: i => CT[i], lab: ctLab, click: j => tog(F.ctci, j), on: j => F.ctci.has(j) },
  { k: 'tam', l: 'Tamaño según ventas', K: 5, ordered: true, key: i => TAM[i], lab: j => TAMS[j], click: j => tog(F.tam, j), on: j => F.tam.has(j) },
  { k: 'tramo', l: 'Tramo de ventas (13 tramos)', K: 14, ordered: true, key: i => TRAMO[i], lab: j => TRAMOS[j] },
  { k: 'tb', l: 'Tramo de trabajadores', K: 5, ordered: true, key: i => TB[i], lab: j => TBS[j], click: j => tog(F.tb, j), on: j => F.tb.has(j) },
  { k: 'sec', l: 'Sector', K: 4, key: i => SEC[i], lab: j => SECTORS[j], click: j => tog(F.sec, j), on: j => F.sec.has(j) },
  { k: 'forma', l: 'Forma jurídica', K: NFO, key: i => FOR[i], lab: j => D.formas[j] },
  { k: 'coh', l: 'Periodo de inicio de actividades', K: 7, ordered: true, key: i => COH[i], lab: j => COHS[j], click: j => { const r = COHY[j]; if (!r) return; F.y0 = r[0]; F.y1 = r[1]; syncInputs(); } },
];
const METS = [
  { k: 'n', l: 'Empresas' }, { k: 't', l: 'Trabajadores dependientes' }, { k: 'e', l: 'Empresas empleadoras' },
  { k: 'tpe', l: 'Trabajadores por empresa empleadora' }, { k: 'share', l: '% de la selección' },
  { k: 'pen', l: '% del grupo regional en la selección' }, { k: 'lq', l: 'Cociente de localización' },
];
$('#ex-dim').innerHTML = DIMS.map(d => `<option value="${d.k}">${esc(d.l)}</option>`).join('');
$('#ex-met').innerHTML = METS.map(m => `<option value="${m.k}">${esc(m.l)}</option>`).join('');
$('#ex-dim').addEventListener('change', e => { UI.exDim = e.target.value; UI.exAuto = false; renderExplorer(); });
$('#ex-met').addEventListener('change', e => { UI.exMet = e.target.value; renderExplorer(); });
$('#ex-top').addEventListener('change', e => { UI.exTop = +e.target.value; renderExplorer(); });
$('#ex-view').addEventListener('click', () => { UI.exTable = !UI.exTable; renderExplorer(); });
const allAggCache = {};
function groupAgg(dim, m) {
  const n = new Float64Array(dim.K), t = new Float64Array(dim.K), e = new Float64Array(dim.K);
  for (let i = 0; i < N; i++) if (m[i]) {
    if (dim.bits) { const b = dim.bits(i); for (let j = 0; j < dim.K; j++) if (b & (1 << j)) { n[j]++; t[j] += TRAB[i]; if (TRAB[i] > 0) e[j]++; } }
    else { const j = dim.key(i); n[j]++; t[j] += TRAB[i]; if (TRAB[i] > 0) e[j]++; }
  }
  return { n, t, e };
}
function metricVal(met, j, A, all, tot) {
  switch (met) {
    case 'n': return A.n[j]; case 't': return A.t[j]; case 'e': return A.e[j];
    case 'tpe': return A.e[j] ? A.t[j] / A.e[j] : NaN;
    case 'share': return tot ? A.n[j] / tot : NaN;
    case 'pen': return all.n[j] ? A.n[j] / all.n[j] : NaN;
    case 'lq': return all.n[j] && tot ? (A.n[j] / all.n[j]) / (tot / N) : NaN;
  }
}
function fmtMet(met, v) { if (!isFinite(v)) return '–'; if (met === 'share' || met === 'pen') return pc(v, 1); if (met === 'lq') return f2(v); if (met === 'tpe') return f1(v); return f0(v); }
function renderExplorer() {
  $('#ex-dim').value = UI.exDim; $('#ex-met').value = UI.exMet; $('#ex-top').value = String(UI.exTop);
  $('#ex-view').textContent = UI.exTable ? 'Ver barras' : 'Ver tabla';
  const dim = DIMS.find(d => d.k === UI.exDim), met = UI.exMet;
  const A = groupAgg(dim, CTX.M0), all = allAggCache[dim.k] || (allAggCache[dim.k] = groupAgg(dim, ALL)), tot = CTX.st.n;
  let idx = dim.ord ? dim.ord.slice() : [...Array(dim.K).keys()];
  const minN = met === 'lq' || met === 'pen' ? 3 : 1;
  idx = idx.filter(j => A.n[j] >= minN || (dim.on && dim.on(j)));
  if (dim.k === 'tramo') idx = idx.filter(j => j > 0);
  const val = j => metricVal(met, j, A, all, tot);
  if (!dim.ordered && !dim.ord) idx.sort((a, b) => (val(b) || 0) - (val(a) || 0));
  const total = idx.length; idx = idx.slice(0, UI.exTop);
  const note = [];
  if (total > idx.length) note.push(`Se muestran ${idx.length} de ${total} grupos.`);
  if (dim.bits) note.push('Un subrubro puede contar en más de un lineamiento: los grupos no suman el total.');
  if (met === 'lq') note.push('Cociente = participación del grupo en la selección dividida por su participación en la región; la línea marca 1,0. Se omiten grupos con menos de 3 empresas.');
  if (met === 'pen') note.push('Porcentaje de las empresas del grupo (en toda la región) que cumplen los filtros.');
  if (dim.click) note.push('Clic en una barra para filtrar.');
  $('#ex-note').textContent = note.join(' ');
  const host = $('#ex-body');
  if (!idx.length) { host.innerHTML = '<p class="note">No hay empresas con estos filtros.</p>'; return; }
  if (UI.exTable) {
    host.innerHTML = `<div class="tbl-wrap tall"><table><thead><tr><th scope="col">${esc(dim.l)}</th>${METS.map(m => `<th scope="col" class="r">${esc(m.l)}</th>`).join('')}</tr></thead><tbody>` +
      idx.map(j => `<tr><td>${esc(dim.lab(j))}</td>${METS.map(m => `<td class="r m">${fmtMet(m.k, metricVal(m.k, j, A, all, tot))}</td>`).join('')}</tr>`).join('') + '</tbody></table></div>';
    return;
  }
  const vals = idx.map(val); let mx = Math.max(...vals.filter(isFinite), met === 'lq' ? 1.2 : 0); if (!(mx > 0)) mx = 1;
  host.innerHTML = '<div class="bars">' + idx.map((j, r) => {
    const v = vals[r], w = isFinite(v) ? Math.max(0, v / mx * 100) : 0, on = dim.on && dim.on(j), tag = dim.click ? 'button' : 'div';
    const ref = met === 'lq' ? `<u style="left:${(1 / mx * 100).toFixed(1)}%"></u>` : '';
    return `<${tag} ${dim.click ? 'type="button"' : ''} class="brow${on ? ' on' : ''}${dim.click ? '' : ' static'}" data-j="${j}"><span class="bl">${esc(dim.lab(j))}</span><span class="bt"><i style="width:${w.toFixed(1)}%"></i>${ref}</span><span class="bv">${fmtMet(met, v)}</span></${tag}>`;
  }).join('') + '</div>';
  const bars = host.querySelector('.bars');
  const tipFor = (el, ev) => { const j = +el.dataset.j; showTip(ev, dim.lab(j), [[f0(A.n[j]), 'empresas'], [f0(A.t[j]), 'trabajadores'], [f0(A.e[j]), 'empresas empleadoras'], [pc(tot ? A.n[j] / tot : NaN), 'de la selección']], dim.click ? (dim.on && dim.on(j) ? 'Clic para quitar el filtro' : 'Clic para filtrar') : null); };
  bars.addEventListener('pointermove', e => { const el = e.target.closest('.brow'); if (el) tipFor(el, e); else hideTip(); });
  bars.addEventListener('pointerleave', hideTip);
  if (dim.click) bars.addEventListener('click', e => { const el = e.target.closest('.brow'); if (!el) return; hideTip(); dim.click(+el.dataset.j); FP.preset = null; update(); });
}
// evolución
function lineChart(host, series, opts) {
  const W = Math.max(260, host.clientWidth || 320), H = opts.h || 190, l = 50, r = 60, t = 12, b = 24, NP = YEARS.length;
  const all = series.flatMap(s => s.vals.filter(v => isFinite(v)));
  if (!all.length) { host.innerHTML = '<p class="note">Sin datos para esta selección.</p>'; return; }
  let lo = Math.min(...all), hi = Math.max(...all); if (opts.zero) lo = 0;
  const span = hi - lo || hi || 1, raw = span / 4, mag = 10 ** Math.floor(Math.log10(raw)), step = [1, 2, 2.5, 5, 10].map(x => x * mag).find(x => x >= raw);
  const y0 = Math.floor(lo / step) * step, y1 = Math.ceil(hi / step) * step;
  const X = i => l + i * (W - l - r) / (NP - 1), Y = v => H - b - (v - y0) / ((y1 - y0) || 1) * (H - t - b);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="${esc(opts.label)}" style="display:block;overflow:visible">`;
  if (opts.band != null) s += `<rect x="${X(opts.band).toFixed(1)}" y="${t}" width="${(X(NP - 1) - X(opts.band)).toFixed(1)}" height="${H - t - b}" fill="#4CC3B0" fill-opacity=".07"/>`;
  if (opts.gap != null && opts.gap > 0) s += `<text x="${((X(0) + X(opts.gap)) / 2).toFixed(1)}" y="${(t + (H - t - b) / 2).toFixed(1)}" text-anchor="middle" font-size="11" fill="#83929A">dato reservado</text>`;
  for (let v = y0; v <= y1 + 1e-9; v += step) s += `<line x1="${l}" x2="${W - r}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="#232D34"/><text x="${l - 6}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="#83929A">${f0(v)}</text>`;
  YEARS.forEach((yr, i) => { if (+yr % 5 === 0 || i === NP - 1) s += `<text x="${X(i).toFixed(1)}" y="${H - 5}" text-anchor="middle" font-size="11" fill="#83929A">${yr}</text>`; });
  const ends = series.map(se => { let li = -1; se.vals.forEach((v, i) => { if (isFinite(v)) li = i; }); return li >= 0 ? { y: Y(se.vals[li]) + 4 } : null; });
  const ord = ends.map((e, k) => k).filter(k => ends[k]).sort((a, b) => ends[a].y - ends[b].y);
  for (let q = 1; q < ord.length; q++) { const p = ends[ord[q - 1]], c = ends[ord[q]]; if (c.y - p.y < 13) c.y = p.y + 13; }
  series.slice().reverse().forEach((se, ri) => {
    const endY = ends[series.length - 1 - ri]; let d = '', pen = false, lastI = -1;
    se.vals.forEach((v, i) => { if (!isFinite(v)) { pen = false; return; } d += (pen ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1); pen = true; lastI = i; });
    s += `<path d="${d}" fill="none" stroke="${se.color}" stroke-width="2" stroke-linejoin="round"/>`;
    se.vals.forEach((v, i) => { if (isFinite(v)) s += `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="${i === lastI ? 4.5 : 2.2}" fill="${se.color}" stroke="#151C21" stroke-width="${i === lastI ? 2 : 1}"/>`; });
    if (lastI >= 0) s += `<text x="${(X(lastI) + 9).toFixed(1)}" y="${endY.y.toFixed(1)}" font-size="12" font-weight="600" fill="${se.label ? '#E6ECEE' : se.color}">${f0(se.vals[lastI])}</text>`;
  });
  s += `<line class="xh" x1="0" x2="0" y1="${t}" y2="${H - b}" stroke="#E6ECEE" stroke-opacity=".4" style="display:none"/><rect x="${l - 6}" y="0" width="${W - l - r + 12}" height="${H}" fill="transparent" class="hit"/></svg>`;
  host.innerHTML = s;
  const svg = host.querySelector('svg'), xh = svg.querySelector('.xh'), hit = svg.querySelector('.hit');
  hit.addEventListener('pointermove', e => {
    const rect = svg.getBoundingClientRect(), px = (e.clientX - rect.left) / rect.width * W, i = Math.max(0, Math.min(NP - 1, Math.round((px - l) / ((W - l - r) / (NP - 1)))));
    xh.setAttribute('x1', X(i)); xh.setAttribute('x2', X(i)); xh.style.display = '';
    showTip(e, YEARS[i], series.map(se => [isFinite(se.abs[i]) ? se.fmt(se.abs[i]) : 's/d', se.name + (se.idx && isFinite(se.vals[i]) ? ' (índice ' + f0(se.vals[i]) + ')' : '')]), i < TY0 && opts.workers ? 'En 2005–2009 el SII reserva el número de trabajadores de las empresas más grandes.' : null);
  });
  hit.addEventListener('pointerleave', () => { xh.style.display = 'none'; hideTip(); });
}
function renderEvo() {
  const sr = CTX.ser, i0 = pIdx(), i0t = pIdxT(), idx = (a, k) => a.map(v => (a[k] > 0 && isFinite(v) ? v / a[k] * 100 : NaN)), host = $('#evo'), filt = anyFilter();
  $('#evo-leg').hidden = !filt; $('#evo-per').value = String(FP.p0); $('#f-per').value = String(FP.p0);
  $('#evo-sub').textContent = (filt ? `Índice ${SY0 + i0} = 100 · ` : '') + `empresas ${pcs(gr(sr.n))} (${pLab()}) · trabajadores ${pcs(grT(sr.t))} (${pLabT()})`;
  if (!(sr.n[i0] > 0)) { host.innerHTML = `<p class="note">Sin empresas en ${SY0 + i0} para esta selección; elige otro periodo de comparación.</p>`; $('#evo-note').textContent = ''; return; }
  host.innerHTML = '<div class="evo2"><div><div class="note">Empresas</div><div id="evo-a"></div></div><div><div class="note">Trabajadores dependientes</div><div id="evo-b"></div></div></div>';
  const mk = (sel, reg, k) => filt ? [{ name: 'Selección', vals: idx(sel, k), abs: sel, color: '#3987E5', fmt: f0, idx: true, label: true }, { name: 'Región', vals: idx(reg, k), abs: reg, color: '#8C979D', fmt: f0, idx: true }] : [{ name: 'Región', vals: sel, abs: sel, color: '#3987E5', fmt: f0, label: true }];
  lineChart($('#evo-a'), mk(sr.n, SREG.n, i0), { label: `Evolución de empresas ${SY0}-${YEND}`, zero: !filt, band: i0 });
  lineChart($('#evo-b'), mk(sr.t, SREG.t, i0t), { label: `Evolución de trabajadores ${SY0}-${YEND}`, zero: !filt, band: i0t, gap: TY0, workers: true });
  const notes = [];
  if (sr.partial) notes.push('La serie no aplica los filtros de actividad, búsqueda, año de inicio, vigencia ni nómina.');
  if (TY0 > 0) notes.push(`Trabajadores desde ${SY0 + TY0}: en ${SY0}–${SY0 + TY0 - 1} el SII reserva el dato de las empresas con más trabajadores${F.tb.size ? ', por eso el filtro de trabajadores tampoco aplica a esos años' : ''}.`);
  if (sr.tamApprox) notes.push(`En ${SY0}–${SY0 + TY0 - 1} el tramo de ventas está reservado para cerca del 2% de las empresas (las más grandes), que quedan fuera al filtrar por tamaño.`);
  notes.push('Cada año cuenta las empresas con casa matriz en la región al 31 de diciembre; la franja marca el periodo de comparación.');
  $('#evo-note').textContent = notes.join(' ');
}
function renderCre() {
  const host = $('#cre'), m = CTX.M0, cnt = new Map(); let before = 0, recent = 0, tot = 0;
  for (let i = 0; i < N; i++) if (m[i]) { const y = YR[i]; if (!y) continue; tot++; if (y < 2000) before++; else cnt.set(y, (cnt.get(y) || 0) + 1); if (y >= 2020) recent++; }
  $('#cre-sub').textContent = tot ? `${pc(recent / tot, 0)} inició actividades desde 2020 · solo empresas presentes en 2024` : '';
  const years = []; for (let y = 2000; y <= 2025; y++) years.push(y);
  const cats = [['<2000', before], ...years.map(y => [String(y), cnt.get(y) || 0])];
  const W = Math.max(260, host.clientWidth || 300), H = 170, l = 6, r = 6, t = 10, b = 22, bw = (W - l - r) / cats.length, mx = Math.max(1, ...cats.map(c => c[1]));
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="Empresas según año de inicio" style="display:block"><line x1="${l}" x2="${W - r}" y1="${H - b}" y2="${H - b}" stroke="#35434C"/>`;
  cats.forEach(([lab, v], i) => {
    const h = v / mx * (H - t - b), x = l + i * bw + 1, w = Math.max(1, bw - 2), y = H - b - h, col = lab === '<2000' ? '#4A5258' : +lab >= 2020 ? '#3987E5' : '#2A5F9E', rr = Math.min(3, h / 2, w / 2);
    if (h > 0) s += `<path d="M${x},${H - b}V${(y + rr).toFixed(1)}q0,-${rr} ${rr},-${rr}h${Math.max(0, w - 2 * rr).toFixed(1)}q${rr},0 ${rr},${rr}V${H - b}Z" fill="${col}"/>`;
    s += `<rect x="${l + i * bw}" y="${t}" width="${bw}" height="${H - t - b}" fill="transparent" data-i="${i}"/>`;
    if (lab === '<2000') s += `<text x="${x.toFixed(1)}" y="${H - 6}" text-anchor="start" font-size="10.5" fill="#83929A">Antes</text>`;
    else if (['2005', '2010', '2015', '2020', '2025'].includes(lab)) s += `<text x="${(x + w / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="10.5" fill="#83929A">${lab}</text>`;
  });
  host.innerHTML = s + '</svg>';
  host.querySelector('svg').addEventListener('pointermove', e => { const el = e.target.closest('[data-i]'); if (!el) return hideTip(); const c = cats[+el.dataset.i]; showTip(e, c[0] === '<2000' ? 'Antes de 2000' : 'Inicio en ' + c[0], [[f0(c[1]), 'empresas de la selección']]); });
  host.querySelector('svg').addEventListener('pointerleave', hideTip);
}
const TAMCOL = ['#4A5258', '#184F95', '#2A78D6', '#6DA7EC', '#B7D3F6'];
function tamStack(m) {
  const n = [0, 0, 0, 0, 0], t = [0, 0, 0, 0, 0]; let N0 = 0, T0 = 0;
  for (let i = 0; i < N; i++) if (m[i]) { n[TAM[i]]++; t[TAM[i]] += TRAB[i]; N0++; T0 += TRAB[i]; }
  return { n: n.map(x => (N0 ? x / N0 : 0)), t: t.map(x => (T0 ? x / T0 : 0)) };
}
const stackHTML = (arr, title) => `<div class="stack" role="img" aria-label="${esc(title)}">` + arr.map((v, i) => (v > 0 ? `<span style="width:${(v * 100).toFixed(2)}%;background:${TAMCOL[i]}" title="${TAMS[i]}: ${pc(v, 1)}"></span>` : '')).join('') + '</div>';
function renderTam() {
  const s = tamStack(CTX.M0);
  $('#tam').innerHTML = `<div style="display:flex;flex-direction:column;gap:8px"><div class="note">Empresas</div>${stackHTML(s.n, 'Empresas por tamaño')}<div class="note">Trabajadores</div>${stackHTML(s.t, 'Trabajadores por tamaño de empresa')}
  <div class="tamtab" style="margin-top:6px"><span></span><span></span><span class="h">Empresas</span><span class="h">Trab.</span>${TAMS.map((l, i) => `<i style="width:10px;height:10px;border-radius:2px;background:${TAMCOL[i]}"></i><span>${l}</span><span class="r mono">${pc(s.n[i], 1)}</span><span class="r mono">${pc(s.t[i], 1)}</span>`).join('')}</div></div>`;
}
// tabla de empresas
const TCOLS = [
  { k: 'rz', l: 'Empresa', sort: 'rz' }, { k: 'com', l: 'Comuna', sort: 'com' }, { k: 'act', l: 'Rubro · actividad' }, { k: 'lin', l: 'Lin.' },
  { k: 't', l: 'Trab.', sort: 't', r: true }, { k: 'tam', l: 'Tamaño', sort: 'tam' }, { k: 'sec', l: 'Sector · forma' }, { k: 'y', l: 'Inicio', sort: 'y', r: true }, { k: 'ct', l: 'CTCI' },
];
function sortedRows() {
  const m = CTX.M0, rows = []; for (let i = 0; i < N; i++) if (m[i]) rows.push(i);
  const d = UI.eDir, k = UI.eSort;
  const cmp = { t: (a, b) => (TRAB[a] - TRAB[b]) * d, rz: (a, b) => NAMES[a].localeCompare(NAMES[b], 'es') * d, com: (a, b) => CN(COM[a]).localeCompare(CN(COM[b]), 'es') * d || TRAB[b] - TRAB[a], tam: (a, b) => (TRAMO[a] - TRAMO[b]) * d || TRAB[b] - TRAB[a], y: (a, b) => ((YR[a] || 0) - (YR[b] || 0)) * d }[k];
  return rows.sort(cmp);
}
const linCodes = i => LIN.filter((l, L) => LB[i] & (1 << L)).map(l => l.k);
const PAGE = 25;
function renderTable() {
  const rows = sortedRows(), pages = Math.max(1, Math.ceil(rows.length / PAGE)); UI.ePage = Math.min(UI.ePage, pages - 1);
  const slice = rows.slice(UI.ePage * PAGE, UI.ePage * PAGE + PAGE);
  $('#tb-sub').textContent = `${f0(rows.length)} empresas · ordena con los encabezados`;
  const th = c => `<th scope="col" class="${c.r ? 'r' : ''}">${c.sort ? `<button type="button" data-sort="${c.sort}" ${UI.eSort === c.sort ? `aria-sort="${UI.eDir < 0 ? 'descending' : 'ascending'}"` : ''}>${esc(c.l)}${UI.eSort === c.sort ? (UI.eDir < 0 ? ' ↓' : ' ↑') : ''}</button>` : esc(c.l)}</th>`;
  const body = slice.map(i => `<tr><td><strong style="font-weight:600">${esc(NAMES[i])}</strong>${NOM[i] ? ' <span class="pill ct" title="Figura en la Res. 1/2026">Nómina 2026</span>' : ''}<span class="sm mono">${RUT[i]}-${esc(DVS[i])}</span></td><td>${esc(CN(COM[i]))}<span class="sm">${esc(TER[TOF[COM[i]]].n)}</span></td><td>${esc(D.rubros[RUB[i]].l)}<span class="sm">${esc(D.acts[ACT[i]].l)}</span></td><td class="m">${linCodes(i).join(' ') || '–'}</td><td class="r m">${f0(TRAB[i])}</td><td>${TAMS[TAM[i]]}</td><td>${esc(SECTORS[SEC[i]])}<span class="sm">${esc(D.formas[FOR[i]])}</span></td><td class="r m">${YR[i] || '–'}${VIG[i] ? '' : '<span class="sm">Término de giro</span>'}</td><td>${CT[i] ? `<span class="pill ct">${esc(CTG[CT[i] - 1])}</span>` : ''}</td></tr>`).join('');
  $('#tb-wrap').innerHTML = `<table><thead><tr>${TCOLS.map(th).join('')}</tr></thead><tbody>${body || `<tr><td colspan="${TCOLS.length}" class="note">No hay empresas con estos filtros.</td></tr>`}</tbody></table>`;
  $('#tb-pager').innerHTML = `<span>${rows.length ? f0(UI.ePage * PAGE + 1) + '–' + f0(Math.min(rows.length, (UI.ePage + 1) * PAGE)) + ' de ' + f0(rows.length) : ''}</span><span style="display:flex;gap:6px"><button class="btn" type="button" data-pg="-1" ${UI.ePage ? '' : 'disabled'}>Anterior</button><button class="btn" type="button" data-pg="1" ${UI.ePage < pages - 1 ? '' : 'disabled'}>Siguiente</button></span>`;
}
$('#tb-wrap').addEventListener('click', e => { const b = e.target.closest('button[data-sort]'); if (!b) return; const k = b.dataset.sort; if (UI.eSort === k) UI.eDir *= -1; else { UI.eSort = k; UI.eDir = k === 'rz' || k === 'com' ? 1 : -1; } UI.ePage = 0; renderTable(); });
$('#tb-pager').addEventListener('click', e => { const b = e.target.closest('button[data-pg]'); if (!b) return; UI.ePage += +b.dataset.pg; renderTable(); $('#tb-wrap').scrollIntoView({ block: 'nearest' }); });
function exportSel() {
  const rows = sortedRows();
  const lines = [['RUT', 'DV', 'Razón social', 'Territorio ERD', 'Comuna', 'Sección CIIU', 'Rubro', 'Subrubro', 'Actividad económica', 'Lineamientos CTCI (aprox.)', 'Trabajadores dependientes 2024', 'Tramo de ventas', 'Tamaño según ventas', 'Sector', 'Forma jurídica', 'Año inicio', 'Vigente', 'Grupo CTCI (aprox.)', 'En nómina Res. 1/2026', 'Sucursales en La Araucanía']]
    .concat(rows.map(i => [RUT[i], DVS[i], NAMES[i], TER[TOF[COM[i]]].n, CN(COM[i]), D.rubros[RUB[i]].k, D.rubros[RUB[i]].l, D.subs[SUB[i]].l, D.acts[ACT[i]].l, linCodes(i).join(' '), TRAB[i], TRAMOS[TRAMO[i]], TAMS[TAM[i]], SECTORS[SEC[i]], D.formas[FOR[i]], YR[i] || '', VIG[i] ? 'Sí' : 'No', CT[i] ? CTG[CT[i] - 1] : '', NOM[i] ? 'Sí' : 'No', NSUC[i]]));
  saveCSV(lines, 'empresas_radar_frpd_seleccion.csv');
}
$('#tb-csv').addEventListener('click', exportSel);
// especialización por comuna
const HMCOLS = {
  lin: { skip: 'lin', K: NL, bits: i => LB[i], cols: () => [...Array(NL).keys()], head: j => `${esc(LIN[j].k)}<span>${esc(LSHORT[LIN[j].k])}</span>`, full: j => `${LIN[j].k} ${LIN[j].n}`, on: j => F.lin.has(j), set: j => tog(F.lin, j) },
  rub: { skip: 'rub', K: NR, vert: true, key: i => RUB[i], cols: () => [...Array(NR).keys()].filter(j => !['U', '–'].includes(D.rubros[j].k)), head: j => `<span>${esc(D.rubros[j].sh)}</span><b>${esc(D.rubros[j].k)}</b>`, full: j => D.rubros[j].l, on: j => F.rub.has(j), set: j => tog(F.rub, j) },
  ctci: { skip: 'ctci', K: 6, key: i => CT[i], cols: () => [1, 2, 3, 4, 5], head: j => esc(CTG[j - 1]), full: j => CTG[j - 1], on: j => F.ctci.has(j), set: j => tog(F.ctci, j) },
  sec: { skip: 'sec', K: 4, key: i => SEC[i], cols: () => [0, 1, 2], head: j => esc(SECTORS[j]), full: j => SECTORS[j], on: j => F.sec.has(j), set: j => tog(F.sec, j) },
  tam: { skip: 'tam', K: 5, key: i => TAM[i], cols: () => [0, 1, 2, 3, 4], head: j => esc(TAMS[j]), full: j => TAMS[j], on: j => F.tam.has(j), set: j => tog(F.tam, j) },
  tb: { skip: 'tb', K: 5, key: i => TB[i], cols: () => [0, 1, 2, 3, 4], head: j => esc(TBS[j]), full: j => 'Trabajadores: ' + TBS[j], on: j => F.tb.has(j), set: j => tog(F.tb, j) },
};
$('#hm-met').addEventListener('change', e => { UI.hmMet = e.target.value; renderHeat(); });
$('#hm-col').addEventListener('change', e => { UI.hmCol = e.target.value; renderHeat(); });
const COM_ORDER = [...Array(NC).keys()].sort((a, b) => TOF[a] - TOF[b] || COMALL.n[b] - COMALL.n[a]);
let HM = null;
function renderHeat() {
  const C = HMCOLS[UI.hmCol], met = UI.hmMet, cols = C.cols(), m = mask(new Set(['geo', C.skip]));
  const n = Array.from({ length: NC }, () => new Float64Array(C.K)), t = Array.from({ length: NC }, () => new Float64Array(C.K));
  const rn = new Float64Array(NC), rt = new Float64Array(NC), cn = new Float64Array(C.K), ct = new Float64Array(C.K); let TN = 0, TT = 0;
  for (let i = 0; i < N; i++) if (m[i]) {
    const c = COM[i], w = TRAB[i]; rn[c]++; rt[c] += w; TN++; TT += w;
    if (C.bits) { const b = C.bits(i); for (let k = 0; k < C.K; k++) if (b & (1 << k)) { n[c][k]++; t[c][k] += w; cn[k]++; ct[k] += w; } }
    else { const k = C.key(i); n[c][k]++; t[c][k] += w; cn[k]++; ct[k] += w; }
  }
  const val = (c, k) => {
    switch (met) {
      case 'lqn': return rn[c] && cn[k] ? (n[c][k] / rn[c]) / (cn[k] / TN) : NaN;
      case 'lqt': return rt[c] && ct[k] ? (t[c][k] / rt[c]) / (ct[k] / TT) : NaN;
      case 'n': return n[c][k]; case 't': return t[c][k];
      case 'rowp': return rn[c] ? n[c][k] / rn[c] : NaN;
    }
  };
  let mxLog = 1, mxP = 0.01;
  if (met === 'n' || met === 't') COM_ORDER.forEach(c => cols.forEach(k => { mxLog = Math.max(mxLog, Math.log1p(val(c, k))); }));
  if (met === 'rowp') COM_ORDER.forEach(c => cols.forEach(k => { const v = val(c, k); if (isFinite(v)) mxP = Math.max(mxP, v); }));
  const color = (c, k) => { const v = val(c, k); if (!isFinite(v) || n[c][k] < 3) return null; if (met === 'lqn' || met === 'lqt') return lqColor(v); if (met === 'rowp') return seqRamp(v / mxP); return seqRamp(Math.log1p(v) / mxLog); };
  const txt = (c, k) => { const v = val(c, k); if (met === 'lqn' || met === 'lqt') return f1(v); if (met === 'rowp') return pc(v, 0); return kfmt(v); };
  const colW = UI.hmCol === 'rub' ? 'minmax(44px,1fr)' : 'minmax(84px,1fr)';
  let h = `<div class="hgrid" style="grid-template-columns:160px repeat(${cols.length},${colW});grid-auto-rows:minmax(22px,auto)"><div class="hd" style="text-align:left">Comuna</div>`;
  h += cols.map(k => `<div class="hd${C.vert ? ' v' : ''}${C.on(k) ? ' on' : ''}" title="${esc(C.full(k))}">${C.head(k)}</div>`).join('');
  let lastT = -1;
  COM_ORDER.forEach(c => {
    const onR = GEO[c] && hasGeo(), tc = TOF[c];
    if (tc !== lastT) { h += `<div class="hgr" style="grid-column:1/-1"><i style="background:${TCOL[tc]}"></i>${esc(TER[tc].n)}</div>`; lastT = tc; }
    h += `<div class="hrh${onR ? ' on' : ''}"><span>${esc(CN(c))}</span></div>`;
    cols.forEach(k => {
      const col = color(c, k), hl = onR && C.on(k);
      if (!col) h += `<button type="button" class="hcell na${hl ? ' hl' : ''}" data-c="${c}" data-k="${k}" aria-label="${esc(CN(c) + ', ' + C.full(k))}: menos de 3 empresas">·</button>`;
      else h += `<button type="button" class="hcell${hl ? ' hl' : ''}" data-c="${c}" data-k="${k}" style="background:${col};color:${lumi(col) > 0.3 ? '#0E1317' : '#F3F6F7'}" aria-label="${esc(CN(c) + ', ' + C.full(k))}">${txt(c, k)}</button>`;
    });
  });
  $('#hm').innerHTML = h + '</div>'; HM = { n, t, val, C };
  const leg = $('#hm-leg');
  if (met === 'lqn' || met === 'lqt') leg.innerHTML = `<div class="dleg"><div class="g">${[0.33, 0.5, 0.71, 1, 1.41, 2, 3].map(v => `<span style="background:${lqColor(v)}"></span>`).join('')}</div><div class="t"><span>0,3</span><span>1,0</span><span>3,0</span></div></div>`;
  else leg.innerHTML = `<div class="dleg"><div class="g">${[0, .25, .5, .75, 1].map(v => `<span style="background:${seqRamp(v)}"></span>`).join('')}</div><div class="t"><span>Menos</span><span>Más</span></div></div>`;
  $('#hm-note').textContent = '· = menos de 3 empresas. Comunas agrupadas por territorio ERD. La matriz muestra todas las comunas y columnas para comparar; los filtros de territorio y de la columna elegida se marcan en ámbar, y el resto de los filtros se aplica.' + (UI.hmCol === 'lin' ? ' Un subrubro puede contar en más de un lineamiento.' : '') + (UI.hmCol === 'rub' ? ' Se omiten las columnas «organizaciones extraterritoriales» y «sin rubro».' : '');
}
$('#hm').addEventListener('pointermove', e => {
  const el = e.target.closest('.hcell'); if (!el || !HM) return hideTip();
  const c = +el.dataset.c, k = +el.dataset.k, { n, t, val, C } = HM, m = UI.hmMet;
  showTip(e, CN(c) + ' · ' + C.full(k), [[f0(n[c][k]), 'empresas'], [f0(t[c][k]), 'trabajadores'], ...(m === 'lqn' || m === 'lqt' ? [[isFinite(val(c, k)) ? f2(val(c, k)) : '–', 'cociente de localización']] : m === 'rowp' ? [[pc(val(c, k), 1), 'de las empresas de la comuna']] : [])], 'Clic para filtrar por esta comuna y columna');
});
$('#hm').addEventListener('pointerleave', hideTip);
$('#hm').addEventListener('click', e => {
  const el = e.target.closest('.hcell'); if (!el) return; hideTip();
  const c = +el.dataset.c, k = +el.dataset.k, C = HMCOLS[UI.hmCol], already = F.com.size === 1 && F.com.has(c) && C.on(k);
  F.ter.clear();
  if (already) { F.com.clear(); C.set(k); } else { F.com.clear(); F.com.add(c); if (!C.on(k)) C.set(k); }
  FP.preset = null; update();
});
// ================= MATRIZ DE CADENAS ESTRATÉGICAS Y MIPYMES POR TERRITORIO =================

let SM_SHOW_COMUNAS = false;
const SM_EXPANDED_TERRS = new Set();
let SM_TAM_FILTER = 'mipyme';

function computeStratMatrixData() {
  const tamMode = SM_TAM_FILTER;
  const cMatrix = Array.from({ length: NC }, () => new Int32Array(STRAT_CHAINS.length));
  const tMatrix = Array.from({ length: NT }, () => new Int32Array(STRAT_CHAINS.length));
  const regTotals = new Int32Array(STRAT_CHAINS.length);
  const cTotals = new Int32Array(NC);
  const tTotals = new Int32Array(NT);
  let regGrandTotal = 0;

  const subToChains = Array.from({ length: NS }, () => []);
  STRAT_CHAINS.forEach((ch, chIdx) => {
    ch.subs.forEach(s => { if (s < NS) subToChains[s].push(chIdx); });
  });

  for (let i = 0; i < N; i++) {
    const tr = TRAMO[i];
    const tam = tamOf(tr);
    if (tamMode === 'micro' && tam !== 1) continue;
    if (tamMode === 'peq' && tam !== 2) continue;
    if (tamMode === 'mipyme' && tam !== 1 && tam !== 2) continue;
    if (tamMode === 'all' && tam === 0) continue;

    const s = SUB[i];
    const chList = subToChains[s];
    if (!chList || !chList.length) continue;

    const c = COM[i];
    const t = TOF[c];

    for (let j = 0; j < chList.length; j++) {
      const chIdx = chList[j];
      cMatrix[c][chIdx]++;
      cTotals[c]++;
      if (t >= 0 && t < NT) {
        tMatrix[t][chIdx]++;
        tTotals[t]++;
      }
      regTotals[chIdx]++;
      regGrandTotal++;
    }
  }

  return { cMatrix, tMatrix, regTotals, cTotals, tTotals, regGrandTotal };
}

function renderStratMatrix() {
  const wrap = $('#strat-matrix-wrap');
  if (!wrap) return;

  const { cMatrix, tMatrix, regTotals, cTotals, tTotals, regGrandTotal } = computeStratMatrixData();

  let h = `<table class="strat-tbl"><thead><tr>
    <th style="min-width:180px">Territorio / Comuna</th>`;
  STRAT_CHAINS.forEach(ch => {
    h += `<th title="${esc(ch.desc)}" style="min-width:115px">${ch.icon} ${esc(ch.n)}</th>`;
  });
  h += `<th style="min-width:90px;font-weight:700">Total</th></tr></thead><tbody>`;

  for (let t = 0; t < NT; t++) {
    const tName = TER[t].n;
    const isExpanded = SM_SHOW_COMUNAS || SM_EXPANDED_TERRS.has(t);
    const arrow = isExpanded ? '▼' : '▶';

    h += `<tr class="terr-row">
      <td>
        <span class="sm-terr-toggle" data-t="${t}" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px" title="Clic para expandir/plegar comunas">
          <span style="font-size:10px;color:var(--acc)">${arrow}</span>
          <span class="tchip" style="border-left:3px solid ${TCOL[t]};font-weight:600">${esc(tName)}</span>
        </span>
      </td>`;
    STRAT_CHAINS.forEach((ch, chIdx) => {
      const val = tMatrix[t][chIdx];
      const cls = val > 0 ? 'val-cell' : 'zero';
      h += `<td class="${cls}" data-t="${t}" data-ch="${chIdx}" title="Filtrar ${esc(ch.n)} en ${esc(tName)}">${val > 0 ? f0(val) : '–'}</td>`;
    });
    h += `<td style="font-weight:700;color:var(--acc)">${f0(tTotals[t])}</td></tr>`;

    if (isExpanded) {
      TER[t].c.forEach(c => {
        const cName = CN(c);
        h += `<tr class="com-row">
          <td style="padding-left:26px">↳ ${esc(cName)}</td>`;
        STRAT_CHAINS.forEach((ch, chIdx) => {
          const val = cMatrix[c][chIdx];
          const cls = val > 0 ? 'val-cell' : 'zero';
          h += `<td class="${cls}" data-c="${c}" data-ch="${chIdx}" title="Filtrar ${esc(ch.n)} en ${esc(cName)}">${val > 0 ? f0(val) : '–'}</td>`;
        });
        h += `<td style="font-weight:600">${f0(cTotals[c])}</td></tr>`;
      });
    }
  }

  // Fila Total Regional
  h += `<tr style="background:var(--surf3);font-weight:700;border-top:2px solid var(--acc)">
    <td><b>TOTAL REGIONAL</b></td>`;
  STRAT_CHAINS.forEach((ch, chIdx) => {
    const val = regTotals[chIdx];
    h += `<td class="val-cell" data-ch="${chIdx}" style="color:var(--acc);font-size:13px" title="Filtrar toda la región en ${esc(ch.n)}">${f0(val)}</td>`;
  });
  h += `<td style="font-size:14px;color:var(--ink);font-weight:800">${f0(regGrandTotal)}</td></tr>`;
  h += `</tbody></table>`;

  wrap.innerHTML = h;
}

function exportStratMatrixCSV() {
  const { cMatrix, tMatrix, regTotals, cTotals, tTotals, regGrandTotal } = computeStratMatrixData();
  const dateStr = new Date().toISOString().slice(0, 10);
  const lines = [];
  lines.push(['Tipo', 'Territorio_ERD', 'Comuna', ...STRAT_CHAINS.map(ch => ch.n), 'Total']);

  for (let t = 0; t < NT; t++) {
    const tName = TER[t].n;
    lines.push(['TERRITORIO', tName, '–', ...STRAT_CHAINS.map((_, i) => tMatrix[t][i]), tTotals[t]]);
    TER[t].c.forEach(c => {
      lines.push(['COMUNA', tName, CN(c), ...STRAT_CHAINS.map((_, i) => cMatrix[c][i]), cTotals[c]]);
    });
  }
  lines.push(['TOTAL_REGIONAL', 'La Araucania', 'Todas las comunas', ...STRAT_CHAINS.map((_, i) => regTotals[i]), regGrandTotal]);
  saveCSV(lines, `matriz_cadenas_estrategicas_araucania_${SM_TAM_FILTER}_${dateStr}.csv`);
}

// Eventos de la matriz estratégica
if ($('#strat-matrix-wrap')) {
  $('#strat-matrix-wrap').addEventListener('click', e => {
    const toggle = e.target.closest('.sm-terr-toggle');
    if (toggle) {
      const t = +toggle.dataset.t;
      if (SM_EXPANDED_TERRS.has(t)) SM_EXPANDED_TERRS.delete(t);
      else SM_EXPANDED_TERRS.add(t);
      renderStratMatrix();
      return;
    }

    const cell = e.target.closest('td.val-cell');
    if (!cell) return;

    const chIdx = cell.dataset.ch != null ? +cell.dataset.ch : null;
    const t = cell.dataset.t != null ? +cell.dataset.t : null;
    const c = cell.dataset.c != null ? +cell.dataset.c : null;

    if (chIdx != null) {
      clearFilters();
      const ch = STRAT_CHAINS[chIdx];
      ACTIVE_CHAIN = ch.id;
      ch.subs.forEach(s => F.sub.add(s));
      if (SM_TAM_FILTER === 'micro') F.tam.add(1);
      else if (SM_TAM_FILTER === 'peq') F.tam.add(2);
      else if (SM_TAM_FILTER === 'mipyme') { F.tam.add(1); F.tam.add(2); }

      if (c != null) F.com.add(c);
      else if (t != null) F.ter.add(t);

      UI.exDim = 'sub';
      syncInputs();
      update();
      toast(`Filtro aplicado: ${ch.n}` + (c != null ? ` · ${CN(c)}` : t != null ? ` · ${TER[t].n}` : ''));
      const tbWrap = $('#tb-wrap');
      if (tbWrap) tbWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

if ($('#sm-tam')) {
  $('#sm-tam').addEventListener('change', e => {
    SM_TAM_FILTER = e.target.value;
    renderStratMatrix();
  });
}

if ($('#sm-toggle-com')) {
  $('#sm-toggle-com').addEventListener('click', () => {
    SM_SHOW_COMUNAS = !SM_SHOW_COMUNAS;
    $('#sm-toggle-com').textContent = SM_SHOW_COMUNAS ? 'Plegar a 8 territorios' : 'Desplegar 32 comunas';
    renderStratMatrix();
  });
}

if ($('#sm-csv')) {
  $('#sm-csv').addEventListener('click', exportStratMatrixCSV);
}

function renderEmpresas() {
  if (!CTX) return;
  if (!DIRTY.empresas) return;
  DIRTY.empresas = false;
  renderKpisE(); renderM1E(); renderExplorer(); renderEvo(); renderCre(); renderTam(); renderStratMatrix(); renderTable(); renderHeat();
}
