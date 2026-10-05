# Radar FRPD Araucanía · script de procesamiento (ver LEEME.md en la carpeta principal)
# Ejecutar desde la carpeta "procesamiento", en modo UTF-8:   python -X utf8 prep_exe.py
# Rutas: datos de entrada en C:/Users/mpooley/Documents/DB Araucania/ ; paquetes intermedios en ./intermedios/
"""Fase 3: ejecutores habilitados (Res. 1/2026 MINECON, Res. 33/2024) con presencia en La Araucanía."""
import json, gzip, base64, re, unicodedata
import pandas as pd

def U(s): return unicodedata.normalize('NFD', str(s)).encode('ascii', 'ignore').decode().upper()
D = json.loads(gzip.decompress(base64.b64decode(open('intermedios/pack_frpd3.b64').read())))
FR = D['FRPD']; CIDX = {U(c['l']).strip(): i for i, c in enumerate(D['comunas'])}
q = open('C:/Users/mpooley/Documents/DB Araucania/FRPD_fase3/q.txt').read()

# ---- Res. 1/2026 (103 instituciones privadas sin fines de lucro) ----
res1 = json.load(open('entradas/res1_2026.json'))
B, E = D['B'], D['E']
bidx = {int(r): i for i, r in enumerate(B['rut'])}
eidx = {}
for i, r in enumerate(E['rut']): eidx.setdefault(int(r), []).append(i)
res1_out = []
for rut, n in res1:
    k = int(rut.split('-')[0])
    pres, cs = '', []
    if k in bidx: pres, cs = 'casa matriz', [B['c'][bidx[k]]]
    elif k in eidx: pres, cs = 'sucursal', sorted({E['c'][j] for j in eidx[k]})
    name = n.split(' / ')[0].strip()
    sigla = n.split(' / ')[1].strip() if ' / ' in n else ''
    res1_out.append({'r': rut, 'n': name.title().replace(' De ', ' de ').replace(' La ', ' la ').replace(' Y ', ' y ').replace(' Del ', ' del ').replace(' Para ', ' para ').replace(' En ', ' en ').replace(' Los ', ' los ').replace(' Las ', ' las ').replace(' El ', ' el '), 's': sigla, 'p': pres, 'c': cs})
print('res1', len(res1_out), 'con presencia', sum(1 for r in res1_out if r['p']))

# ---- Res. 33 (2024): 52 categorías de instituciones beneficiarias ----
a = q.index('Institución', q.index('Res. 33, MINECON')); seg = q[a + len('Institución'):]
lines = [l.strip() for l in seg.split('\n') if l.strip()]
items, cur, pending = {}, None, []
for l in lines:
    m = re.match(r'^(\d{1,2})\s*(.*)$', l)
    if m and 1 <= int(m.group(1)) <= 52 and (int(m.group(1)) == (cur or 0) + 1):
        cur = int(m.group(1)); items[cur] = ' '.join(pending + ([m.group(2)] if m.group(2) else [])); pending = []
    else:
        if cur is not None and items.get(cur) and not pending and not re.match(r'^\d', l) and (l[0].islower() or l.startswith('(') or items[cur].endswith(('de', 'del', 'y', 'la', 'el', 'en', 'para', 'los', 'las', 'Escala', '-'))):
            items[cur] += ' ' + l
        else:
            pending.append(l)
if pending and cur: items[cur] = (items[cur] + ' ' + ' '.join(pending)).strip()
res33 = [re.sub(r'\s+', ' ', items[i]).strip() for i in range(1, 53)]
res33[5] = 'Subsecretaría de Economía y Empresas de Menor Tamaño, a través de sus programas de Desarrollo Productivo Sostenible'
res33[6] = 'La Subsecretaría de Ciencia, Tecnología, Conocimiento e Innovación'
for i, x in enumerate(res33, 1): print(i, x[:110])

# ---- ejecutores con presencia en la región ----
fin = pd.read_pickle('intermedios/fin.pkl')
an = fin[fin.s == 'ANID']; co = fin[fin.s == 'CORFO']
def cap(keys, src=an):
    m = src[src.i.map(lambda s: any(k in U(s) for k in keys))]
    Lc = [int(sum(i in L for L in m.L)) for i in range(6)]
    return {'n': int(len(m)), 'm': round(float(m.m.fillna(0).sum()), 1), 'apl': int((m.g == 'apl').sum()), 'L': Lc}
R1 = {r['r'] for r in res1_out}
C = lambda *ns: sorted(CIDX[U(n)] for n in ns)
EXE = [
 # nombre, tipo, sub, comunas, base legal / habilitación, en Res.1, claves ANID, nota
 ('Universidad de La Frontera', 'pub', 'Universidad estatal', C('Temuco', 'Angol', 'Pucon', 'Padre Las Casas'), 'Art. 13: habilitada si su acreditación es de 4 años o más', False, ['FRONTERA'], 'Incluye BIOREN y CEBIOR'),
 ('Universidad Católica de Temuco', 'priv', 'Universidad privada CRUCH', C('Temuco'), 'Art. 13 y nómina Res. 1/2026', '71918700-5', ['CATOLICA DE TEMUCO'], ''),
 ('Universidad Autónoma de Chile', 'priv', 'Universidad privada', C('Temuco'), 'Art. 13 y nómina Res. 1/2026', '71633300-0', ['AUTONOMA'], 'Casa matriz en Temuco según SII'),
 ('Universidad Santo Tomás', 'priv', 'Universidad privada', C('Temuco'), 'Art. 13 y nómina Res. 1/2026', '71551500-8', ['SANTO TOMAS'], 'CFT e IP Santo Tomás son entidades distintas y no figuran en la nómina'),
 ('Universidad Mayor', 'priv', 'Universidad privada', C('Temuco'), 'Art. 13 y nómina Res. 1/2026', '71500500-K', ['UNIVERSIDAD MAYOR'], ''),
 ('Pontificia Universidad Católica de Chile', 'priv', 'Universidad privada CRUCH', C('Villarrica', 'Temuco'), 'Art. 13 y nómina Res. 1/2026', '81698900-0', ['PONTIFICIA UNIVERSIDAD CATOLICA DE CHILE'], 'Campus Villarrica'),
 ('Instituto Profesional INACAP', 'priv', 'Instituto profesional', C('Temuco'), 'Art. 13 y nómina Res. 1/2026', '87152900-0', ['INACAP'], 'La Universidad Tecnológica y el CFT INACAP no figuran en la nómina'),
 ('Universidad Arturo Prat', 'pub', 'Universidad estatal', C('Victoria'), 'Art. 13: habilitada si su acreditación es de 4 años o más', False, ['ARTURO PRAT'], 'Sede Victoria'),
 ('CFT Estatal de La Araucanía', 'pub', 'CFT estatal', C('Lautaro'), 'Art. 13: habilitado si su acreditación es de 4 años o más', False, ['CFT DE LA REGION DE LA ARAUCANIA', 'CENTRO DE FORMACION TECNICA DE LA REGION DE LA ARAUCANIA'], ''),
 ('Centro de Genómica Nutricional Agroacuícola (CGNA)', 'pub', 'Centro Regional ANID', C('Temuco'), 'Res. 33 n° 41: centros regionales del Programa Regional ANID', False, ['GENOMICA NUTRICIONAL', 'CGNA'], ''),
 ('INIA Carillanca', 'pub', 'Instituto tecnológico público', C('Vilcun'), 'Art. 11 y Res. 33 n° 23', False, ['INVESTIGACIONES AGROPECUARIAS', 'INIA'], ''),
 ('Fundación de Desarrollo Educacional y Tecnológico La Araucanía (FUDEA)', 'priv', 'Fundación', C('Temuco'), 'Nómina Res. 1/2026; debe concursar (art. 12)', '71195600-K', ['FUDEA'], 'Vinculada a la UFRO'),
 ('Sociedad de Fomento Agrícola (SOFO)', 'priv', 'Gremio', C('Temuco'), 'Nómina Res. 1/2026; debe concursar (art. 12)', '81389900-0', ['SOFO', 'SOCIEDAD DE FOMENTO AGRICOLA'], ''),
 ('Fundación de Desarrollo Acción y Sustentabilidad (Arca del Sur)', 'priv', 'Fundación', C('Temuco'), 'Nómina Res. 1/2026; debe concursar (art. 12)', '65199273-7', ['ARCA DEL SUR'], ''),
 ('Fundación Heroica', 'priv', 'Fundación', C('Temuco'), 'Nómina Res. 1/2026; debe concursar (art. 12)', '65199097-1', ['HEROICA'], ''),
 ('Fundación para la Superación de la Pobreza', 'priv', 'Fundación', C('Temuco'), 'Nómina Res. 1/2026; debe concursar (art. 12)', '73051300-3', ['SUPERACION DE LA POBREZA'], 'Sucursal en Temuco'),
]
NOT_LISTED = [('Universidad Tecnológica de Chile INACAP', 'Temuco'), ('CFT INACAP', 'Temuco'), ('CFT Santo Tomás', 'Temuco'), ('IP Santo Tomás', 'Temuco'), ('IP Los Lagos', 'Temuco'), ('CFT Los Lagos', 'Temuco'),
              ('IP AIEP', 'Temuco'), ('IP de Chile', 'Temuco'), ('IP Valle Central', 'Temuco'), ('IP Instituto de Estudios Bancarios Guillermo Subercaseaux', 'Temuco'), ('Universidad de Aconcagua', 'Temuco'),
              ('CFT PROTEC', 'Temuco'), ('CFT Teodoro Wickel Kluwen', 'Temuco'), ('CFT Instituto Superior de Estudios Jurídicos Canon', 'Cunco'), ('IP Duoc UC', 'Villarrica')]
exe_out = []
for n, t, sub, cs, base, r1, keys, note in EXE:
    if r1: assert r1 in R1, r1
    exe_out.append({'n': n, 't': t, 'sub': sub, 'c': cs, 'base': base, 'r1': bool(r1), 'an': cap(keys), 'co': cap(keys, co), 'note': note})
    print(n[:45].ljust(46), exe_out[-1]['an'], exe_out[-1]['co']['n'])
nl_out = [{'n': n, 'c': CIDX[U(c)]} for n, c in NOT_LISTED]
FR['exe'] = exe_out; FR['exeNo'] = nl_out; FR['res1'] = res1_out; FR['res33'] = res33
FR['res1Meta'] = {'fuente': 'Res. N° 1, 23-feb-2026, Subsecretaría de Economía y EMT (primer llamado 2026), transcrita en el anexo de las bases FRPD 2026 del GORE Antofagasta', 'n': len(res1_out),
                  'segundo': 'Res. Adm. Exenta N° 19 (30-jun-2026) abrió una segunda inscripción hasta el 20-jul-2026; su nómina resultante no se pudo verificar.'}
js = json.dumps(D, ensure_ascii=False, separators=(',', ':'))
b64 = base64.b64encode(gzip.compress(js.encode(), 9)).decode()
open('intermedios/pack_frpd4.b64', 'w').write(b64)
print('b64 MB', len(b64) / 1e6)
