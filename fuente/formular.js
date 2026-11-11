// ================= Formular: recorrido de Paso 0 para levantar una iniciativa =================
// Sigue el método de DIFOI: (1) cuadre con el art. 8 del DS 1.699 y una acción de la ERD o la PRFP, (2) problema, poblaciones
// y causas con dato y fuente, según la guía de formulación del GORE, (3) qué ya se hace y (4) cómo se ejecuta.
// Termina en una ficha de Paso 0 en texto. Etiquetas: [V] verificado con fuente, [I] inferencia, [S] supuesto por validar.
const FM_SRC = { pav: 'red vial comunal, base regional GORE', pmad: 'catastro de puentes, base regional GORE', saidi: 'SAIDI 2022, base regional GORE', ant: 'antenas autorizadas 1997–2020, base regional GORE' };
const FM_A8 = { '2a': 'N°2 a', '2b': 'N°2 b', '2g': 'N°2 g', '1d': 'N°1 d', 'N°3': 'N°3 d' };
const FM_INST = ['Por definir', 'Convocatoria del GORE', 'Convenio con un servicio de competitividad (N°1 a)', 'Transferencia por glosa 13 a concursos CORFO o ANID', 'Programa con un ejecutor habilitado', 'Cofinanciamiento de un instrumento existente'];
const FM_RUB = [['eleg', 'Elegibilidad FRPD', 25, 15], ['pert', 'Pertinencia al diagnóstico', 20, 30], ['evid', 'Evidencia de impacto', 15, 15], ['alin', 'Alineamiento ERD, PRFP y cartera', 15, 15], ['fact', 'Factibilidad de ejecución', 15, 15], ['equi', 'Equidad territorial', 10, 10]];
const FMU = { t: 5, ch: 0, item: -1, acts: new Set(), aq: '', all: false, mipyme: true, gapCom: false, ben: '', probEd: false, propEd: false, inst: 0, sc: {}, idea: '' };
// empresas por cadena: máscara por subrubro
const FM_MASK = new Uint8Array(NS); STRAT_CHAINS.forEach((ch, j) => ch.subs.forEach(s => { if (s < NS) FM_MASK[s] |= 1 << j; }));
function fmStats(cs, ci, opt = {}) {
  const set = new Set(cs), bit = 1 << ci, o = { n: 0, micro: 0, mip: 0, trab: 0 };
  for (let i = 0; i < N; i++) {
    if (!(FM_MASK[SUB[i]] & bit) || !set.has(COM[i])) continue;
    const tam = tamOf(TRAMO[i]); if (tam === 0) continue;
    if (opt.mipyme && tam > 2) continue;
    o.n++; if (tam === 1) o.micro++; if (tam <= 2) o.mip++; o.trab += TRAB[i] > 0 ? TRAB[i] : 0;
  }
  return o;
}
const fmChName = ch => ch.n.replace(/^Cadena /, '').toLowerCase().replace('i+d', 'I+D').replace('(ebtc)', '(EBTC)');
const fmItem = () => (FMU.item >= 0 ? MX.items[FMU.item] : null);
function fmCtx() {
  const T = TER[FMU.t], ch = STRAT_CHAINS[FMU.ch], cell = ifCell('ter', FMU.t, FMU.ch);
  const st = fmStats(T.c, FMU.ch), reg = fmStats(ALLC, FMU.ch);
  const gapComs = T.c.filter(c => ifCell('com', c, FMU.ch).gaps.length);
  const objCs = FMU.gapCom ? gapComs : T.c, obj = fmStats(objCs, FMU.ch, { mipyme: FMU.mipyme });
  const cond = [
    { l: 'Microempresas en la cadena', v: st.n ? st.micro / st.n : NaN, r: reg.micro / reg.n, f: x => pc(x, 0), worse: (a, b) => a > b * 1.05 },
    { l: 'Trabajadores dependientes por empresa', v: st.n ? st.trab / st.n : NaN, r: reg.trab / reg.n, f: f1, worse: (a, b) => a < b * 0.95 },
  ].map(x => ({ ...x, bad: isFinite(x.v) && x.worse(x.v, x.r) }));
  const srcOf = d => (d[0] === 'h' ? FM_SRC[d[1]] : d[0] === 'e' ? EVK[d[1]].u.split(' · ').slice(1).join(' · ') : 'Mineduc 2020') || 'base regional GORE';
  const causas = cell.gaps.flatMap(dm => dm.inds.map((i, j) => ({ i, d: dm.d.ind[j] })).filter(o => o.i.gap).map(o => ({ dim: dm.d.l, txt: `${o.i.l}: ${o.i.txt} (región ${o.i.reg})`, src: srcOf(o.d), inv: dm.inv })));
  return { T, ch, cell, st, reg, gapComs, obj, cond, causas };
}
function fmProbDraft(x) {
  const bad = x.cond.filter(c => c.bad), nom = fmChName(x.ch);
  if (!x.st.n) return '';
  if (!bad.length) return `Las ${f0(x.st.n)} empresas de la cadena ${nom} del territorio ${x.T.n} presentan [condición negativa verificable, con su dato].`;
  const parts = bad.map(c => (c.l.startsWith('Micro') ? `${c.f(c.v)} son microempresas (región ${c.f(c.r)})` : `promedian ${c.f(c.v)} trabajadores (región ${c.f(c.r)})`));
  return `Las ${f0(x.st.n)} empresas de la cadena ${nom} del territorio ${x.T.n} operan a menor escala que la cadena en la región: ${parts.join(' y ')}.`;
}
function fmCheck(txt, kind) {
  const w = [], t = txt.trim();
  if (t.length > 300) w.push(`Supera los 300 caracteres (${t.length}).`);
  if (/falta de|carencia de|ausencia de/i.test(t)) w.push('Evita «falta de…»: describe la condición negativa observable, no la solución que falta.');
  if (/potencial/i.test(t)) w.push('«Potencial no aprovechado» no sirve como problema.');
  if (/\[.*\]/.test(t)) w.push('Quedan campos entre corchetes por completar.');
  if (kind === 'prop' && /\b(entregar|capacitar|implementar|construir|se \w+rán)\b/i.test(t)) w.push('El propósito no describe productos ni actividades, y va en presente («aumentan», «mejoran»).');
  return w;
}
function renderFormular() {
  if (!MX) { $('#fm-body').hidden = true; $('#fm-none').hidden = false; return; }
  if (!rendered.formular) { fmInit(); rendered.formular = true; }
  $('#fm-t').value = FMU.t; $('#fm-ch').value = FMU.ch;
  const x = fmCtx(), st = IF_ST[x.cell.st];
  $('#fm-st').innerHTML = `<span class="ifc ${x.cell.st}">${st.l}</span><span>${esc(st.d)} ${f0(x.st.n)} empresas · cociente de localización ${f2(x.cell.lq)}.</span>`;
  // 1 · cuadre
  const sug = [...new Set([...x.cell.gaps.map(g => FM_A8[g.d.a8]).filter(Boolean), 'N°1 b', 'N°1 g'])];
  const opt = (it, i) => `<option value="${i}">${esc(it.k)} · ${esc(it.q.length > 78 ? it.q.slice(0, 76) + '…' : it.q)}</option>`;
  $('#fm-item').innerHTML = '<option value="-1">Elige un ítem del art. 8…</option>' + `<optgroup label="Sugeridos por las brechas y la cadena [S]">${sug.map(k => MX.items.findIndex(it => it.k === k)).filter(i => i >= 0).map(i => opt(MX.items[i], i)).join('')}</optgroup>`
    + ['N°1', 'N°2', 'N°3'].map(g => `<optgroup label="${g} · ${esc(MX.items.find(it => it.k === g).q)}">${MX.items.map((it, i) => (!it.g && it.k.startsWith(g) ? opt(it, i) : '')).join('')}</optgroup>`).join('');
  $('#fm-item').value = FMU.item;
  const it = fmItem();
  $('#fm-itemd').innerHTML = it ? `<b>${esc(it.k)}</b> · ${esc(it.q)} <span class="m">DS 1.699, p. ${esc(it.p)}</span> · ${it.c25 ? '<span class="pill ok">Suma al 25% de CTCI (art. 7)</span>' : '<span class="pill">No suma al 25% de CTCI</span>'}` : 'El ítem define qué puede financiar el FRPD. Las brechas de infraestructura sugieren por dónde partir, pero la decisión es tuya.';
  fmActs();
  // 2 · problema y evidencia
  $('#fm-pop').innerHTML = `<div class="fm-fun">
    <div><span class="lbl">Potencial</span><b>${f0(x.st.n)}</b><small>empresas de la cadena en el territorio · SII 2024 [V]</small></div>
    <div><span class="lbl">Objetivo</span><b>${f0(x.obj.n)}</b><small><label><input type="checkbox" id="fm-mip"${FMU.mipyme ? ' checked' : ''}> solo micro y pequeñas</label><label><input type="checkbox" id="fm-gc"${FMU.gapCom ? ' checked' : ''}> solo comunas con brecha (${x.gapComs.length} de ${x.T.c.length})</label></small></div>
    <div><span class="lbl">Beneficiaria anual</span><input type="number" id="fm-ben" min="0" inputmode="numeric" placeholder="según presupuesto" value="${esc(FMU.ben)}" aria-label="Población beneficiaria anual"><small id="fm-ben-n"></small></div></div>`;
  fmBen(x);
  $('#fm-cond').innerHTML = `<div class="hab"><span class="h">Condición de la cadena en el territorio</span><span class="h" style="text-align:right">Territorio</span><span class="h" style="text-align:right">Región</span>${x.cond.map(c => `<span class="n">${esc(c.l)}</span><span class="x"><span class="pill ${c.bad ? 'bad' : ''}">${c.f(c.v)}</span></span><span class="x"><small>${c.f(c.r)}</small></span>`).join('')}</div><p class="note">Empresas con ventas informadas de la cadena, frente a la misma cadena en la región · SII, nómina de personas jurídicas 2024 [V]. En rojo, lo que está peor que la región: sirve como condición negativa verificable.</p>`;
  $('#fm-caus').innerHTML = x.causas.length ? `<ul class="fm-ul">${x.causas.map(c => `<li><b>${esc(c.dim)}.</b> ${esc(c.txt)} <span class="m">· ${esc(c.src)} [V]</span>${c.inv.n ? ` <span class="sm">· ${pl(c.inv.n, 'iniciativa BIP', 'iniciativas BIP')} en camino</span>` : ' <span class="pill warn">sin inversión en camino</span>'}</li>`).join('')}</ul><p class="note">Son las brechas de infraestructura que la cadena necesita [S: requisitos por validar]. Deja solo las causas que la iniciativa va a resolver; cada una se conecta después con un componente.</p>` : '<p class="note">La infraestructura que esta cadena necesita no está en brecha en el territorio. Las causas habrá que buscarlas en otra parte: capacidades, mercado, financiamiento o tecnología.</p>';
  const pa = $('#fm-prob'), pr = $('#fm-prop');
  if (!FMU.probEd) pa.value = fmProbDraft(x);
  if (!FMU.propEd) pr.value = x.st.n ? `Las ${FMU.mipyme ? 'micro y pequeñas ' : ''}empresas de la cadena ${fmChName(x.ch)} del territorio ${x.T.n} aumentan [resultado medible].` : '';
  fmCount();
  // 3 · qué ya se hace
  const inT = []; for (let i = 0; i < FN_T.length; i++) if (FN_T[i] === FMU.t) inT.push(i);
  const an = inT.filter(i => FN_S[i] === S_ANID), co = inT.filter(i => FN_S[i] === S_CORFO);
  const bipCat = cat => { let n = 0, t = 0; for (let i = 0; i < NBX; i++) { const c = BX.c[i]; if (c < 0 || TOF[c] !== FMU.t || bxCat(i) !== cat) continue; const rows = BX_ROWS[i], kk = rows[rows.length - 1]; if (kk == null || BXH.y[kk] < IF_Y0) continue; n++; if (!BXH.x[kk]) t += BXH.t[kk] || 0; } return { n, t }; };
  const fom = bipCat('fom'), cti = bipCat('ctci'), ents = ENT.filter(e => e.t === x.T.k);
  const row = (l, v, s, btn) => `<span class="n">${l}</span><span class="x">${v}</span><span class="x"><small>${s}</small></span><span class="x">${btn || ''}</span>`;
  $('#fm-hace').innerHTML = `<div class="hab fm-h4"><span class="h">Fuente</span><span class="h" style="text-align:right">N°</span><span class="h" style="text-align:right">Monto</span><span class="h"></span>
    ${x.cell.dims.map(dm => row(`BIP · ${esc(dm.d.l)} (infraestructura, desde ${IF_Y0})`, f0(dm.inv.n), dm.inv.n ? mmK(dm.inv.t) + ' MM$' : '–', dm.inv.n ? `<button type="button" class="btn sm" data-bip="${dm.d.cat}" data-ti="${dm.d.prog ? '0,3' : '0'}">Ver</button>` : '')).join('')}
    ${row(`BIP · Fomento productivo (desde ${IF_Y0})`, f0(fom.n), fom.n ? mmK(fom.t) + ' MM$' : '–', fom.n ? '<button type="button" class="btn sm" data-bip="fom" data-ti="">Ver</button>' : '')}
    ${row(`BIP · CTCI e innovación (desde ${IF_Y0})`, f0(cti.n), cti.n ? mmK(cti.t) + ' MM$' : '–', cti.n ? '<button type="button" class="btn sm" data-bip="ctci" data-ti="">Ver</button>' : '')}
    ${row('ANID · proyectos con sede en el territorio, 2019–2026', f0(an.length), an.length ? mm(sumM(an)) : '–')}
    ${row('CORFO InnovaChile · beneficiarios del territorio, 2019–2026', f0(co.length), co.length ? mm(sumM(co)) : '–')}
    ${row('Cartera DIFOI · entradas en el territorio', f0(ents.length), ents.length ? esc([...new Set(ents.map(e => e.l))].join(', ')) : '–', ents.length ? '<button type="button" class="btn sm" data-go="cartera">Ver</button>' : '')}</div>
    <p class="note">Sirve para la pregunta de complementariedad y para descartar duplicidad. Las iniciativas BIP de alcance regional no están contadas, y las categorías son una clasificación aproximada [S].</p>`;
  // 4 · cómo se ejecuta
  $('#fm-inst').innerHTML = FM_INST.map((l, i) => `<option value="${i}">${esc(l)}</option>`).join(''); $('#fm-inst').value = FMU.inst;
  const tc = new Set(x.T.c), exT = EXE.filter(e => e.c.some(c => tc.has(c))), a10 = [...new Set([...FMU.acts].map(r => MX.a10[r]).filter(Boolean))];
  $('#fm-exe').innerHTML = `<p>${exT.length ? `<b>${f0(exT.length)}</b> posibles ejecutores con presencia en el territorio: ${f0(exT.filter(e => e.t === 'pub').length)} públicos y ${f0(exT.filter(e => e.r1).length)} privados en la nómina de la Res. 1/2026.` : `Ningún ejecutor habilitado registra presencia en el territorio: tendría que operar desde otro. Hay <b>${f0(EXE.length)}</b> en la región.`} <button type="button" class="btn sm" data-go="marco" data-sc="mk-exe">Ver quién puede ejecutar</button></p>
    <p class="${a10.length ? 'fm-al' : 'note'}">${a10.length ? `Alerta del art. 10 en las acciones elegidas: ${esc(a10.join('; '))}. Exige un objeto directo productivo, de desarrollo regional o de CTCI.` : 'Art. 10: sin alertas en las acciones elegidas. Quedan fuera remuneraciones, empleo público, vivienda, vehículos no imprescindibles, espacios públicos ajenos y eventos.'}</p>`;
  fmRub(); fmFicha();
}
function fmBen(x) { $('#fm-ben-n').innerHTML = FMU.ben && +FMU.ben > x.obj.n ? '<span class="warnmk">Supera la población objetivo.</span>' : 'atención efectiva de cada año; define el criterio de priorización'; }
function fmActs() {
  const box = $('#fm-acts'), it = fmItem();
  if (!it) { box.innerHTML = ''; return; }
  const q = normTxt(FMU.aq.trim()), A = MX._acc, ord = { V: 0, I: 1, D: 2, '': 3 };
  let rows = MX.it.map((x, r) => r).filter(r => MX.it[r].includes(FMU.item) && (!q || normTxt(A[r] + ' ' + MX.l[r]).includes(q)));
  rows.sort((a, b) => (FMU.acts.has(b) - FMU.acts.has(a)) || ord[MX.enc[a]] - ord[MX.enc[b]]);
  const tot = rows.length, show = FMU.all ? rows : rows.slice(0, 8);
  box.innerHTML = (tot ? show.map(r => `<label class="fm-act"><input type="checkbox" data-r="${r}"${FMU.acts.has(r) ? ' checked' : ''}><span><span class="pill ${MX.enc[r] === 'V' ? 'ok' : MX.enc[r] === 'D' ? 'warn' : ''}" title="V: calce casi literal · I: inferencia razonable · D: dudoso, exige foco productivo explícito">${MX.enc[r] || '–'}</span> <b>${esc(fmRef(r))}</b><br>${esc(A[r])}${MX.a10[r] ? ` <span class="pill bad">art. 10: ${esc(MX.a10[r])}</span>` : ''}</span></label>`).join('') : '<p class="note">Ninguna acción de la ERD o la PRFP calza con ese ítem y esa búsqueda.</p>')
    + (tot > 8 ? `<button type="button" class="btn sm" id="fm-all">${FMU.all ? 'Mostrar menos' : `Mostrar las ${tot} acciones`}</button>` : '');
}
const fmRef = r => { const [src, lin] = MX.linv[MX.lin[r]].split(' · '); return src === 'ERD' ? `ERD · ${lin.split(' ').slice(0, 2).join(' ')} · ${MX.oe[r]} · ${MX.l[r].split(' ')[0]} · ${MX.cod[r]} · p. ${MX.p[r]}` : `PRFP · ${MX.cod[r]} · p. ${MX.p[r]}`; };
function fmCount() {
  for (const [id, kind] of [['fm-prob', 'prob'], ['fm-prop', 'prop']]) {
    const t = $('#' + id).value, w = fmCheck(t, kind), n = t.trim().length;
    $('#' + id + '-n').innerHTML = `<b class="${n > 300 ? 'over' : ''}">${n}</b> de 300 caracteres` + (w.length ? `<ul>${w.map(m => `<li>${esc(m)}</li>`).join('')}</ul>` : '');
  }
}
function fmScore(variant) {
  if (FM_RUB.some(r => !FMU.sc[r[0]])) return null;
  return FM_RUB.reduce((a, r) => a + FMU.sc[r[0]] * (variant ? r[3] : r[2]) / 100, 0);
}
function fmRub() {
  const s = fmScore(false), v = fmScore(true);
  $('#fm-rub').innerHTML = `<div class="fm-rub">${FM_RUB.map(r => `<label for="fm-sc-${r[0]}">${esc(r[1])} <small>${r[2]}%</small><select class="sel" id="fm-sc-${r[0]}" data-k="${r[0]}"><option value="">–</option>${[1, 2, 3, 4, 5].map(n => `<option value="${n}"${FMU.sc[r[0]] === n ? ' selected' : ''}>${n}</option>`).join('')}</select></label>`).join('')}</div>
    <p class="fm-tot">${s == null ? 'Asigna los seis puntajes (1 bajo a 5 alto) para ver el total.' : `Puntaje <b>${f2(s)}</b> de 5 · variante con pertinencia 30% y elegibilidad 15%: <b>${f2(v)}</b>`}</p>`;
}
function fmFichaText() {
  const x = fmCtx(), it = fmItem(), acts = [...FMU.acts], s = fmScore(false), v = fmScore(true), prob = $('#fm-prob').value.trim(), prop = $('#fm-prop').value.trim();
  const L = [];
  L.push(`# Ficha de Paso 0 · ${x.ch.n} en ${x.T.n}`, '', `Generada con el Radar FRPD Araucanía el ${new Date().toLocaleDateString('es-CL')}. Etiquetas: [V] verificado con fuente · [I] inferencia · [S] supuesto por validar.`, '');
  L.push('## Idea', FMU.idea.trim() || '(por redactar en una frase: qué se quiere lograr, en quién y dónde)', '');
  L.push('## Cuadre', it ? `- Ítem del art. 8: ${it.k} · ${it.q} (DS 1.699, p. ${it.p}). ${it.c25 ? 'Suma' : 'No suma'} al 25% de CTCI (art. 7).` : '- Ítem del art. 8: por definir.');
  if (acts.length) acts.forEach(r => L.push(`- ${fmRef(r)} · encaje ${MX.enc[r] || 'sin clasificar'}: ${MX._acc[r]}${MX.a10[r] ? ` (alerta art. 10: ${MX.a10[r]})` : ''}`)); else L.push('- Acción de la ERD o la PRFP: por elegir.');
  L.push('', '## Problema', prob || '(por redactar)', `Conteo: ${prob.length} de 300 caracteres.`, '');
  L.push('## Evidencia', `- ${f0(x.st.n)} empresas de la cadena en el territorio; cociente de localización ${f2(x.cell.lq)} (1,00 = región). SII, nómina de personas jurídicas 2024 [V].`);
  x.cond.forEach(c => L.push(`- ${c.l}: ${c.f(c.v)} en el territorio y ${c.f(c.r)} en la región${c.bad ? ' (peor que la región)' : ''}. SII 2024 [V].`));
  L.push('', '## Causas candidatas (infraestructura habilitante)');
  if (x.causas.length) x.causas.forEach(c => L.push(`- ${c.dim}. ${c.txt}. Fuente: ${c.src} [V]. ${c.inv.n ? `${c.inv.n} iniciativa(s) BIP de infraestructura en camino desde ${IF_Y0} (${mmK(c.inv.t)} MM$).` : 'Sin inversión BIP en camino.'} Requisito de la cadena [S].`)); else L.push('- Sin brechas en la infraestructura que la cadena necesita [S]. Las causas están en otra parte.');
  L.push('', '## Poblaciones', `- Potencial: ${f0(x.st.n)} empresas de la cadena en el territorio (SII 2024) [V].`, `- Objetivo: ${f0(x.obj.n)} empresas. Focalización: ${[FMU.mipyme ? 'micro y pequeñas' : 'todos los tamaños', FMU.gapCom ? `comunas con brecha (${x.gapComs.map(CN).join(', ') || 'ninguna'})` : 'todas las comunas del territorio'].join('; ')} [S].`, `- Beneficiaria anual: ${FMU.ben ? f0(+FMU.ben) + ' empresas [S]' : 'por definir según presupuesto'}. Criterio de priorización: por definir.`, '');
  L.push('## Propósito', prop || '(por redactar)', `Conteo: ${prop.length} de 300 caracteres.`, '');
  L.push('## Qué ya se hace', ...[...$('#fm-hace').querySelectorAll('.hab > .n')].map(n => { const v1 = n.nextElementSibling, v2 = v1.nextElementSibling; return `- ${n.textContent.trim()}: ${v1.textContent.trim()} · ${v2.textContent.trim()}`; }), '');
  L.push('## Ejecución', `- Instrumento: ${FM_INST[FMU.inst]}.`, `- ${$('#fm-exe p').textContent.replace('Ver quién puede ejecutar', '').trim()}`, `- ${$('#fm-exe p:last-child').textContent.trim()}`, '');
  L.push('## Priorización (rúbrica DIFOI)', s == null ? '- Sin puntaje: faltan criterios por calificar.' : `- ${FM_RUB.map(r => `${r[1]} ${FMU.sc[r[0]]}`).join(' · ')}`, s == null ? '' : `- Total ${f2(s)} de 5. Variante con pertinencia 30% y elegibilidad 15%: ${f2(v)}.`, '');
  L.push('## Pendientes', '- Validar los requisitos de infraestructura de la cadena y los umbrales de presencia [S].', '- Buscar precedentes en otros GORE antes de descartar una vía de financiamiento.', '- Riesgos y vías comparadas (FRPD N°1, N°2 y N°3; FNDR; sectoriales): por completar.');
  return L.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');
}
function fmFicha() { $('#fm-ficha').textContent = fmFichaText(); }
function fmInit() {
  MX._acc = MX.acc.split('\n');
  $('#fm-t').innerHTML = TER.map((t, i) => `<option value="${i}">${esc(t.n)}</option>`).join('');
  $('#fm-ch').innerHTML = STRAT_CHAINS.map((c, i) => `<option value="${i}">${esc(c.n)}</option>`).join('');
  const reset = () => { FMU.probEd = false; FMU.propEd = false; };
  $('#fm-t').addEventListener('change', e => { FMU.t = +e.target.value; reset(); renderFormular(); });
  $('#fm-ch').addEventListener('change', e => { FMU.ch = +e.target.value; reset(); renderFormular(); });
  $('#fm-item').addEventListener('change', e => { FMU.item = +e.target.value; FMU.acts = new Set(); FMU.all = false; renderFormular(); });
  let qt; $('#fm-aq').addEventListener('input', e => { clearTimeout(qt); qt = setTimeout(() => { FMU.aq = e.target.value; fmActs(); }, 160); });
  $('#fm-acts').addEventListener('change', e => { const r = e.target.dataset.r; if (r == null) return; if (e.target.checked) FMU.acts.add(+r); else FMU.acts.delete(+r); renderFormular(); });
  $('#fm-acts').addEventListener('click', e => { if (e.target.id === 'fm-all') { FMU.all = !FMU.all; fmActs(); } });
  $('#fm-pop').addEventListener('change', e => { if (e.target.id === 'fm-mip') FMU.mipyme = e.target.checked; else if (e.target.id === 'fm-gc') FMU.gapCom = e.target.checked; else return; renderFormular(); });
  $('#fm-pop').addEventListener('input', e => { if (e.target.id !== 'fm-ben') return; FMU.ben = e.target.value; fmBen(fmCtx()); fmFicha(); });
  $('#fm-prob').addEventListener('input', () => { FMU.probEd = true; fmCount(); fmFicha(); });
  $('#fm-prop').addEventListener('input', () => { FMU.propEd = true; fmCount(); fmFicha(); });
  $('#fm-idea').addEventListener('input', e => { FMU.idea = e.target.value; fmFicha(); });
  $('#fm-prob-r').addEventListener('click', () => { FMU.probEd = false; renderFormular(); });
  $('#fm-inst').addEventListener('change', e => { FMU.inst = +e.target.value; fmFicha(); });
  $('#fm-rub').addEventListener('change', e => { const k = e.target.dataset.k; if (!k) return; FMU.sc[k] = +e.target.value || 0; fmRub(); fmFicha(); });
  $('#v-formular').addEventListener('click', e => {
    const b = e.target.closest('button[data-bip]'), g = e.target.closest('button[data-go]');
    if (b) openBip({ t: FMU.t, cat: b.dataset.bip, ti: new Set(b.dataset.ti ? b.dataset.ti.split(',').map(Number) : []) });
    if (g) {
      setView(g.dataset.go);
      // Lleva a la tarjeta de destino: sin esto la pestaña cambia pero la página queda a la altura donde estaba.
      const d = g.dataset.sc && document.getElementById(g.dataset.sc), c = d && (d.closest('section.card') || d);
      if (c) requestAnimationFrame(() => { c.scrollIntoView({ block: 'start' }); c.classList.add('fm-flash'); setTimeout(() => c.classList.remove('fm-flash'), 1600); });
      else window.scrollTo({ top: 0 });
    }
  });
  $('#fm-copy').addEventListener('click', async () => {
    const txt = fmFichaText();
    try { await navigator.clipboard.writeText(txt); toast('Ficha copiada'); }
    catch (e) { const r = document.createRange(); r.selectNodeContents($('#fm-ficha')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('Texto seleccionado: cópialo con Ctrl+C'); }
  });
  $('#fm-dl').addEventListener('click', async () => {
    if (!DL) { toast('La descarga no está disponible en esta vista; usa «Copiar».'); return; }
    const x = fmCtx(), name = `Ficha_Paso0_${normTxt(x.ch.id)}_${normTxt(x.T.k)}_${new Date().toISOString().slice(0, 10)}.md`;
    try { await DL.save({ filename: name, data: new Blob([fmFichaText()], { type: 'text/markdown' }) }); toast('Archivo listo: ' + name); } catch (e) { if (!(e && e.code === 'declined')) toast('No se pudo descargar; usa «Copiar».'); }
  });
}
function fmOpen(t, ch) { FMU.t = t; FMU.ch = ch; FMU.probEd = false; FMU.propEd = false; setView('formular'); window.scrollTo({ top: 0 }); }
