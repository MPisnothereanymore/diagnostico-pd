# Radar FRPD Araucanía · script de procesamiento (ver LEEME.md en la carpeta principal)
# Ejecutar desde la carpeta "procesamiento", en modo UTF-8:   python -X utf8 prep_bip.py
# Rutas: datos de entrada en C:/Users/mpooley/Documents/DB Araucania/ ; paquetes intermedios en ./intermedios/
"""Explorador BIP: todas las iniciativas de La Araucanía postuladas 2019–2027 con su historial por año."""
import json, gzip, base64, re, unicodedata
import pandas as pd, numpy as np

src = open('prep_fin.py').read()
# reutiliza clasificadores de prep_fin (regex de categorías y lineamientos) sin ejecutar el resto
ns = {}
exec(src.split('recs = []')[0], ns)                     # U, D, FR, classify, LKEYS...
exec('import re\nRX = lambda p: re.compile(p)\n' + src[src.index('R_CTCI = '):src.index('nb = {')], ns)
U, classify, bip_cat = ns['U'], ns['classify'], ns['bip_cat']
D = json.loads(gzip.decompress(base64.b64decode(open('intermedios/pack_frpd4.b64').read())))
CIDX = {U(c['l']).strip(): i for i, c in enumerate(D['comunas'])}
exec(src[src.index('CUTS = {'):src.index('assert all(v in CIDX')], ns)
CUTS = ns['CUTS']

b = pd.read_csv('C:/Users/mpooley/Documents/DB Araucania/FRPD_fase2/bip_araucania_2019_2027.csv', sep=';', dtype=str, low_memory=False)
b['cmn'] = pd.to_numeric(b.CMN_CLAVE, errors='coerce')
b = b[(b.cmn.between(9100, 9300)) | (b.REG_CLAVE.isin(['177', '177.0']))].copy()
for k in ['EBI_SOLICITADO', 'EBI_COSTO_TOTAL', 'EBI_ASIGNADO_VIGENTE', 'EBI_GASTO_VIGENTE', 'EBI_GASTO_ANTERIOR']:
    b[k] = pd.to_numeric(b[k], errors='coerce')
b['yr'] = pd.to_numeric(b.EBI_ANO_POSTULA, errors='coerce').astype(int)
b['parte'] = pd.to_numeric(b.EBI_PARTE, errors='coerce').fillna(0).astype(int)
b = b.sort_values(['EBI_CODIGO', 'yr', 'parte'])
last = b.groupby('EBI_CODIGO').tail(1).copy()
SOC = {'10': 'Salud', '11': 'Educación', '17': 'Educación', '12': 'Deporte', '9': 'Vivienda y desarrollo urbano', '13': 'Justicia', '14': 'Seguridad y emergencias', '15': 'Multisectorial', '16': 'Cultura y patrimonio', '6': 'Transporte urbano y otros', '8': 'Aguas lluvia y saneamiento urbano'}
CATS = ['ctci', 'fom', 'rie', 'apr', 'via', 'ene', 'res', 'dig']
def cat_of(r):
    c = bip_cat(r)
    if c: return c
    return 'soc:' + SOC.get(str(r.SEC_CLAVE), 'Otros')
last['cat'] = [cat_of(r) for r in last.itertuples()]
catv = sorted(set(last.cat), key=lambda c: (c.startswith('soc:'), CATS.index(c) if c in CATS else 99, c))
code_i = {c: i for i, c in enumerate(last.EBI_CODIGO)}
def lut(series):
    v = sorted(set(series.fillna('').astype(str)))
    return v, {x: i for i, x in enumerate(v)}
insv, insi = lut(last.EBI_INS_RESPONSABLE.str.title())
finv, fini = lut(last.EBI_FUENTES_FINAN)
etv, eti = lut(b.EBI_ETAPA_POSTULA.str.capitalize())
ratev, ratei = lut(b.EBI_RATE)
OUT = {'via': 2e8, 'apr': 1e8, 'rie': 1e8}
def clean_name(s): return re.sub(r'\s+', ' ', str(s)).strip()
desc = last.EBI_DESCRIPCION.fillna('').map(lambda s: re.sub(r'\s+', ' ', s).strip())
desc = desc.map(lambda s: s if len(s) <= 320 else s[:317].rsplit(' ', 1)[0] + '…')
out = {
    'code': [int(c) for c in last.EBI_CODIGO],
    'n': '\n'.join(clean_name(x) for x in last.EBI_NOMBRE),
    'c': [CIDX[CUTS[int(c)]] if pd.notna(c) and int(c) in CUTS else -1 for c in last.cmn],
    'cat': [catv.index(c) for c in last.cat],
    'L': [sum(1 << i for i in classify(str(n))) for n in last.EBI_NOMBRE],
    'ins': [insi[x] for x in last.EBI_INS_RESPONSABLE.fillna('').astype(str).str.title()],
    'fin': [fini[x] for x in last.EBI_FUENTES_FINAN.fillna('').astype(str)],
    'd': '\n'.join(desc),
    'catv': catv, 'insv': insv, 'finv': finv, 'etv': etv, 'ratev': ratev,
}
# historial (todas las postulaciones), montos en M$ (miles de pesos)
H = {k: [] for k in ['i', 'y', 'e', 's', 't', 'a', 'g', 'r', 'x']}
def num(v): return None if pd.isna(v) else int(round(v))
flag = 0
for r in b.itertuples():
    i = code_i[r.EBI_CODIGO]; cat = catv[out['cat'][i]]
    thr = OUT.get(cat, 5e8 if cat.startswith('soc:') else 3e7)
    x = int((pd.notna(r.EBI_COSTO_TOTAL) and r.EBI_COSTO_TOTAL > thr) or (pd.notna(r.EBI_SOLICITADO) and r.EBI_SOLICITADO > thr))
    flag += x
    H['i'].append(i); H['y'].append(int(r.yr)); H['e'].append(eti[str(r.EBI_ETAPA_POSTULA).capitalize() if isinstance(r.EBI_ETAPA_POSTULA, str) else '']);
    H['s'].append(num(r.EBI_SOLICITADO)); H['t'].append(num(r.EBI_COSTO_TOTAL)); H['a'].append(num(r.EBI_ASIGNADO_VIGENTE)); H['g'].append(num(r.EBI_GASTO_VIGENTE))
    H['r'].append(ratei[r.EBI_RATE if isinstance(r.EBI_RATE, str) else '']); H['x'].append(x)
out['h'] = H
print('iniciativas', len(last), 'postulaciones', len(b), 'filas atípicas', flag)
xx = pd.DataFrame({'i': H['i'], 'x': H['x'], 's': H['s'], 't': H['t']}); xx = xx[xx.x == 1]
for i, g in xx.groupby('i'): print('  atípico', out['code'][i], catv[out['cat'][i]], last.EBI_NOMBRE.iloc[i][:60], g.t.max() / 1000, g.s.max() / 1000)
print(pd.Series([catv[c] for c in out['cat']]).value_counts().to_string())
D['FRPD']['bip'] = out
js = json.dumps(D, ensure_ascii=False, separators=(',', ':'))
b64 = base64.b64encode(gzip.compress(js.encode(), 9)).decode()
open('intermedios/pack_frpd5.b64', 'w').write(b64)
print('b64 MB', len(b64) / 1e6, 'bip KB', len(json.dumps(out, ensure_ascii=False)) // 1024)
