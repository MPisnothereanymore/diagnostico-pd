// ================= Infraestructura habilitante por cadena productiva =================
// Cruza tres cosas por territorio o comuna: (1) si la cadena ya está presente (empresas SII), (2) si la infraestructura
// que la cadena necesita está en brecha y (3) si hay inversión en camino (BIP y obras de Geo-CGR) para cerrar esa brecha.
// Supuestos provisionales, a validar por DIFOI: los requisitos de cada cadena (IF_REQ) y los umbrales de presencia.

// dimensiones de infraestructura: indicadores ya calculados en el radar y la categoría BIP que las atiende
const IF_DIM = {
  vial: { l: 'Conectividad vial', cat: 'via', a8: '2a', ind: [['h', 'pav'], ['h', 'pmad']] },
  ene: { l: 'Energía eléctrica', cat: 'ene', a8: '2b', ind: [['h', 'saidi']] },
  dig: { l: 'Conectividad digital', cat: 'dig', a8: '2g', ind: [['h', 'ant']] },
  agua: { l: 'Agua potable', cat: 'apr', a8: '–', ind: [['e', 'sred']] },
  rie: { l: 'Riego', cat: 'rie', a8: '1d', ind: [['e', 'rie']], prog: true },
  con: { l: 'Educación superior', cat: 'ctci', a8: 'N°3', ind: [['ies']], prog: true },
};
// requisitos críticos de cada cadena
const IF_REQ = { agro: ['rie', 'ene', 'vial'], for: ['vial', 'ene'], tur: ['vial', 'dig', 'agua'], ebtc: ['dig', 'ene', 'con'], ene: ['ene', 'vial'], const: ['vial', 'ene'], circ: ['vial', 'ene'] };
const IF_ST = {
  sof: { l: 'Sofisticar', d: 'Cadena presente e infraestructura sin brechas: el espacio está en agregar valor.' },
  hab: { l: 'Habilitar', d: 'Cadena presente, pero con brechas de infraestructura que la limitan.' },
  div: { l: 'Diversificar', d: 'Cadena poco presente e infraestructura sin brechas: oportunidad para atraerla.' },
  nop: { l: 'Sin prioridad', d: 'Cadena poco presente y con brechas de infraestructura.' },
};
const IF_Y0 = 2025;   // «en camino»: última postulación desde este año
const IFU = { lev: 'ter', sel: null };

// empresas por comuna y cadena (misma regla de la matriz de cadenas: empresas con tramo de ventas informado)
const IF_N = Array.from({ length: NC }, () => new Int32Array(STRAT_CHAINS.length)), IF_TOT = new Int32Array(NC);
{
  const s2c = Array.from({ length: NS }, () => []);
  STRAT_CHAINS.forEach((ch, j) => ch.subs.forEach(s => { if (s < NS) s2c[s].push(j); }));
  for (let i = 0; i < N; i++) { if (tamOf(TRAMO[i]) === 0) continue; const c = COM[i]; if (c < 0 || c >= NC) continue; IF_TOT[c]++; for (const j of s2c[SUB[i]] || []) IF_N[c][j]++; }
}
const IF_REGN = STRAT_CHAINS.map((ch, j) => ALLC.reduce((a, c) => a + IF_N[c][j], 0)), IF_REGT = ALLC.reduce((a, c) => a + IF_TOT[c], 0);
// inversión en camino por comuna y categoría BIP
const IF_BIP = {};
for (let i = 0; i < NBX; i++) {
  const c = BX.c[i], cat = bxCat(i); if (c < 0) continue;
  const dim = Object.values(IF_DIM).find(d => d.cat === cat); if (!dim) continue;
  const ti = BX_TI[i]; if (!(ti === 0 || (dim.prog && ti === 3))) continue;
  const rows = BX_ROWS[i], kk = rows[rows.length - 1]; if (kk == null || BXH.y[kk] < IF_Y0) continue;
  const o = ((IF_BIP[cat] = IF_BIP[cat] || {})[c] = IF_BIP[cat][c] || { n: 0, t: 0, rs: 0, ob: 0 });
  o.n++; if (!BXH.x[kk]) o.t += BXH.t[kk] || 0; if (BX.ratev[BXH.r[kk]] === 'RS') o.rs++;
  if (OB && [...BX_OB[i], ...BX_OBA[i]].some(k => OB.a[k] < 100)) o.ob++;
}
const ifCs = (lev, j) => (lev === 'ter' ? TER[j].c : [j]);
function ifInd(def, cs) {
  if (def[0] === 'h') { const h = HABS.find(x => x.k === def[1]), v = h.v(cs); return { l: h.l, u: h.u, txt: h.f(v), reg: h.f(HREG[h.k]), gap: isGap(h, v) }; }
  if (def[0] === 'e') { const e = EVK[def[1]], v = e.v(cs); return { l: e.l, u: e.u.split(' · ')[0], txt: e.f(v), reg: e.f(EVREG[e.k]), gap: evGap(e, v) }; }
  const ti = TOF[cs[0]], n = iesOfTer(ti).length;
  return { l: 'Sedes de educación superior en el territorio', u: '', txt: f0(n), reg: f0(TER.reduce((a, t, k) => a + iesOfTer(k).length, 0)), gap: n === 0 };
}
function ifDim(k, cs) {
  const d = IF_DIM[k], inds = d.ind.map(x => ifInd(x, cs)), inv = { n: 0, t: 0, rs: 0, ob: 0 };
  for (const c of cs) { const o = (IF_BIP[d.cat] || {})[c]; if (o) { inv.n += o.n; inv.t += o.t; inv.rs += o.rs; inv.ob += o.ob; } }
  return { k, d, inds, gap: inds.some(x => x.gap), inv };
}
function ifCell(lev, j, ci) {
  const cs = ifCs(lev, j), ch = STRAT_CHAINS[ci];
  const n = cs.reduce((a, c) => a + IF_N[c][ci], 0), tot = cs.reduce((a, c) => a + IF_TOT[c], 0);
  const lq = tot && IF_REGN[ci] ? (n / tot) / (IF_REGN[ci] / IF_REGT) : 0, pres = lq >= 1 && n >= 5;
  const dims = (IF_REQ[ch.id] || []).map(k => ifDim(k, cs)), gaps = dims.filter(x => x.gap);
  return { ch, n, lq, pres, dims, gaps, st: pres ? (gaps.length ? 'hab' : 'sof') : gaps.length ? 'nop' : 'div', sinInv: gaps.filter(x => !x.inv.n).length };
}
const ifName = (lev, j) => (lev === 'ter' ? TER[j].n : CN(j));
const ifShort = ch => ch.n.replace(/^Cadena /, '').replace(/ \(EBTC\)$/, '').replace(' e Instalaciones', '').replace(' y Experiencias', '').replace(' y Climatización', '');
function renderInfra() {
  const host = $('#if-wrap'); if (!host) return;
  const lev = IFU.lev;
  $('#if-lev').innerHTML = [['ter', 'Territorios'], ['com', 'Comunas']].map(([k, l]) => `<button type="button" data-k="${k}" aria-pressed="${lev === k}">${l}</button>`).join('');
  const rowsJ = lev === 'ter' ? TER.map((t, j) => j) : TER.flatMap(t => [...t.c].sort((a, b) => CN(a).localeCompare(CN(b), 'es')));
  let nHab = 0, nDiv = 0, nSin = 0, h = `<table class="ift"><thead><tr><th>${lev === 'ter' ? 'Territorio' : 'Comuna'}</th>${STRAT_CHAINS.map(ch => `<th title="${esc(ch.desc)}">${esc(ifShort(ch))}</th>`).join('')}</tr></thead><tbody>`;
  let lastT = -1;
  for (const j of rowsJ) {
    if (lev === 'com' && TOF[j] !== lastT) { lastT = TOF[j]; h += `<tr class="ift-g"><th colspan="${STRAT_CHAINS.length + 1}">${esc(TER[lastT].n)}</th></tr>`; }
    h += `<tr><th>${esc(ifName(lev, j))}</th>`;
    STRAT_CHAINS.forEach((ch, ci) => {
      const x = ifCell(lev, j, ci), on = IFU.sel && IFU.sel.lev === lev && IFU.sel.j === j && IFU.sel.ci === ci;
      if (x.st === 'hab') { nHab++; nSin += x.sinInv; } if (x.st === 'div') nDiv++;
      h += `<td><button type="button" class="ifc ${x.st}" data-j="${j}" data-ci="${ci}" aria-pressed="${on}" title="${esc(IF_ST[x.st].d)}">${x.st === 'nop' ? '–' : IF_ST[x.st].l}${x.st === 'hab' ? ` <b>${x.gaps.length}</b>` : ''}</button></td>`;
    });
    h += '</tr>';
  }
  host.innerHTML = h + '</tbody></table>';
  $('#if-sum').innerHTML = `<b>${f0(nHab)}</b> ${nHab === 1 ? 'combinación' : 'combinaciones'} de ${lev === 'ter' ? 'territorio' : 'comuna'} y cadena por habilitar, con <b>${f0(nSin)}</b> ${nSin === 1 ? 'brecha' : 'brechas'} sin inversión en camino. <b>${f0(nDiv)}</b> con infraestructura lista para diversificar.`;
  $('#if-leg').innerHTML = ['sof', 'hab', 'div', 'nop'].map(k => `<span class="row"><span class="ifc ${k}" aria-hidden="true">${k === 'nop' ? '–' : IF_ST[k].l}</span>${esc(IF_ST[k].d)}</span>`).join('');
  renderInfraDet();
  setNote($('#if-note'), `Una cadena se considera presente cuando su peso entre las empresas del lugar iguala o supera al regional y reúne al menos cinco empresas. Una dimensión de infraestructura está en brecha cuando su indicador cae en el tercio peor de las comunas; el número junto a «Habilitar» cuenta las dimensiones en brecha. Los requisitos por cadena son un supuesto provisional, a validar por DIFOI: agroalimentaria (riego, energía, vial); forestal, construcción y economía circular (vial, energía); turismo (vial, digital, agua potable); I+D y base tecnológica (digital, energía, educación superior); energía (energía, vial). Inversión en camino: iniciativas BIP de infraestructura de la categoría, con comuna y última postulación desde ${IF_Y0}; en riego y educación superior se suman los programas. No incluye iniciativas de alcance regional ni conservación. Energía usa las horas de interrupción (SAIDI 2022); conectividad digital, las antenas de telefonía, que no reflejan la fibra ni el 5G.`, 'Criterios y supuestos');
}
function renderInfraDet() {
  const box = $('#if-det'), s = IFU.sel;
  if (!s || s.lev !== IFU.lev) { box.innerHTML = '<p class="note">Elige una celda para ver qué infraestructura necesita esa cadena, cómo está y qué inversión viene en camino.</p>'; return; }
  const x = ifCell(s.lev, s.j, s.ci), cs = ifCs(s.lev, s.j);
  box.innerHTML = `<div class="ifd-h"><div><div class="eyebrow">${esc(ifName(s.lev, s.j))}</div><h3>${esc(x.ch.n)}</h3></div><span class="ifc ${x.st}">${IF_ST[x.st].l}</span></div>
    <p class="note">${esc(IF_ST[x.st].d)} ${f0(x.n)} ${x.n === 1 ? 'empresa' : 'empresas'} de la cadena · cociente de localización ${f2(x.lq)} (1,00 = promedio regional).</p>
    <div class="ifd-t">${x.dims.map(dm => `<div class="ifd-r">
      <div><b>${esc(dm.d.l)}</b>${dm.inds.map(i => `<small>${esc(i.l)}: ${esc(i.txt)}${i.u && !/^(%|horas)/.test(i.u) ? ' ' + esc(i.u) : ''} · región ${esc(i.reg)}</small>`).join('')}</div>
      <div><span class="pill ${dm.gap ? 'bad' : 'ok'}">${dm.gap ? 'En brecha' : 'Sin brecha'}</span></div>
      <div>${dm.inv.n ? `<b>${pl(dm.inv.n, 'iniciativa', 'iniciativas')}</b> en camino<small>${mmK(dm.inv.t)} MM$ · ${f0(dm.inv.rs)} con RS · ${f0(dm.inv.ob)} con obra en ejecución</small><button type="button" class="btn sm" data-cat="${dm.d.cat}">Ver en Iniciativas BIP</button>`
        : dm.gap ? `<span class="pill warn">Sin inversión en camino</span><small>${dm.d.a8 !== '–' ? `Candidata al FRPD, art. 8 ${dm.d.a8.startsWith('N') ? dm.d.a8 : 'N°' + dm.d.a8[0] + ' letra ' + dm.d.a8[1]}` : 'Fuera de las categorías del art. 8; se financia por otras vías'}</small>` : '<small>Sin iniciativas recientes</small>'}</div>
    </div>`).join('')}</div>`;
  box.querySelectorAll('button[data-cat]').forEach(b => b.addEventListener('click', () => openBip({ [s.lev === 'ter' ? 't' : 'c']: s.j, cat: b.dataset.cat, ti: new Set(Object.values(IF_DIM).find(d => d.cat === b.dataset.cat).prog ? [0, 3] : [0]) })));
}
function initInfra() {
  $('#if-lev').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; IFU.lev = b.dataset.k; renderInfra(); });
  $('#if-wrap').addEventListener('click', e => { const b = e.target.closest('button.ifc'); if (!b) return; const j = +b.dataset.j, ci = +b.dataset.ci, s = IFU.sel; IFU.sel = s && s.lev === IFU.lev && s.j === j && s.ci === ci ? null : { lev: IFU.lev, j, ci }; renderInfra(); });
}
