# Radar FRPD Araucanía · script de procesamiento (ver LEEME.md en la carpeta principal)
# Ejecutar desde la carpeta "procesamiento", en modo UTF-8:   python -X utf8 prep_ctx.py
# Rutas: datos de entrada en C:/Users/mpooley/Documents/DB Araucania/ ; paquetes intermedios en ./intermedios/
"""Fase 4 · Evidencia territorial: clima (ARClim), agua y riesgos (Censo 2024, CONAF, PROT),
agro (CAF 2021), equidad (SAE 2022, Censo 2024, CONADI), capacidad municipal (SINIM) y PIB regional (BCCh)."""
import json, gzip, base64, unicodedata, glob, importlib.util, re
import pandas as pd, numpy as np, geopandas as gpd

U = lambda s: unicodedata.normalize('NFD', str(s)).encode('ascii', 'ignore').decode().upper().strip()
UP = 'C:/Users/mpooley/Documents/DB Araucania/'
D2 = UP + 'FRPD_datos2/'
D = json.loads(gzip.decompress(base64.b64decode(open('intermedios/pack_frpd5.b64').read())))
NC = len(D['comunas'])
CIDX = {U(c['l']): i for i, c in enumerate(D['comunas'])}
CUTS = {9101: 'TEMUCO', 9102: 'CARAHUE', 9103: 'CUNCO', 9104: 'CURARREHUE', 9105: 'FREIRE', 9106: 'GALVARINO', 9107: 'GORBEA', 9108: 'LAUTARO', 9109: 'LONCOCHE', 9110: 'MELIPEUCO',
        9111: 'NUEVA IMPERIAL', 9112: 'PADRE LAS CASAS', 9113: 'PERQUENCO', 9114: 'PITRUFQUEN', 9115: 'PUCON', 9116: 'SAAVEDRA', 9117: 'TEODORO SCHMIDT', 9118: 'TOLTEN', 9119: 'VILCUN',
        9120: 'VILLARRICA', 9121: 'CHOLCHOL', 9201: 'ANGOL', 9202: 'COLLIPULLI', 9203: 'CURACAUTIN', 9204: 'ERCILLA', 9205: 'LONQUIMAY', 9206: 'LOS SAUCES', 9207: 'LUMACO', 9208: 'PUREN',
        9209: 'RENAICO', 9210: 'TRAIGUEN', 9211: 'VICTORIA'}
CI = {cut: CIDX[n] for cut, n in CUTS.items()}
CUT_OF = {i: cut for cut, i in CI.items()}
def arr(d, nd=None, r=None):
    """d: {cut: value} -> list in pack comuna order"""
    out = [d.get(CUT_OF[i], nd) for i in range(NC)]
    return [None if v is None or (isinstance(v, float) and not np.isfinite(v)) else (round(float(v), r) if r is not None else v) for v in out]
X = {}

# ---- ARClim (MMA): indicadores climáticos comunales, presente y cambio proyectado SSP2-4.5
a = json.load(open(D2 + 'arclim_araucania_clima.json'))
AK = {'pr': 'pr_sum', 'cdd': 'consecutive_dry_days', 'su': 'summer_days', 'hd': 'hot_days', 'fd': 'frost_days', 'tx': 'tasmax_mean', 'eto': 'eto_mean', 'gdc': 'degdays_below_15C', 'r10': 'number_of_heavy_precipitation_days'}
for k, code in AK.items():
    X[k] = arr({int(c): v for c, v in a[f'$CLIMA${code}$annual$present'].items()}, r=2)
    X[k + 'd'] = arr({int(c): v for c, v in a[f'$CLIMA${code}$annual$delta$ssp245'].items()}, r=2)

# ---- Censo 2024: población perteneciente a pueblos indígenas y origen del agua (manzanas + entidades rurales)
cz = json.load(open(D2 + 'censo2024_comuna_agregado.json'))
cz = {int(k): v for k, v in cz.items() if 9100 < int(k) < 9300}
X['pind'] = arr({c: v.get('PUEBLOS_IN', 0) for c, v in cz.items()}, r=0)
X['pindb'] = arr({c: v.get('TP_conPI', 0) for c, v in cz.items()}, r=0)       # denominador: personas en unidades con dato publicado
X['vagua'] = arr({c: v.get('VIV_conAGUA', 0) for c, v in cz.items()}, r=0)     # viviendas ocupadas con dato de origen del agua
X['vred'] = arr({c: v.get('VIV_AGUA_R', 0) for c, v in cz.items()}, r=0)       # red pública
X['vpozo'] = arr({c: v.get('VIV_AGUA_P', 0) for c, v in cz.items()}, r=0)      # pozo o noria
X['valj'] = arr({c: v.get('VIV_AGUA_C', 0) for c, v in cz.items()}, r=0)       # camión aljibe
X['vrio'] = arr({c: v.get('VIV_AGUA_1', 0) for c, v in cz.items()}, r=0)       # río, vertiente, estero, canal, lago
X['ent_pers'] = arr({c: v.get('TOTAL_PERS', 0) for c, v in cz.items()}, r=0)

# ---- CONADI: comunidades indígenas registradas
ci = gpd.read_file(glob.glob(UP + 'Ámbito Demográfico*/*/Comunidades Indigenas/*.shp')[0], ignore_geometry=True, encoding='latin-1')
ci['ix'] = ci.COMUNA.map(lambda s: CIDX.get(U(s)))
print('comunidades sin comuna', ci.ix.isna().sum(), ci[ci.ix.isna()].COMUNA.unique()[:5])
vc = ci.ix.dropna().astype(int).value_counts()
X['cind'] = [int(vc.get(i, 0)) for i in range(NC)]

# ---- SAE 2022 (MDSF): pobreza por ingresos, multidimensional e inseguridad alimentaria
def sae(f, cols):
    d = pd.read_excel(D2 + f, header=None, skiprows=3)
    d = d[pd.to_numeric(d[0], errors='coerce').between(9100, 9300)]
    return {int(r[0]): [r[c] for c in cols] for r in d.itertuples(index=False)}
pi = sae('sae2022_pobreza_ingresos.xlsx', [3, 4, 5])
pm = sae('sae2022_pobreza_multidimensional.xlsx', [3, 4, 5])
ia = sae('sae2022_inseguridad_alimentaria.xlsx', [3])
X['saeN'] = arr({c: v[0] for c, v in pi.items()}, r=0)
X['pinN'] = arr({c: v[1] for c, v in pi.items()}, r=0)
X['pmdN'] = arr({c: v[1] for c, v in pm.items()}, r=0)
X['ia'] = arr({c: v[0] for c, v in ia.items()}, r=4)

# ---- SINIM (Subdere): capacidad municipal, año 2024
spec = importlib.util.spec_from_file_location('p', 'entradas/sinim_parser.py'); P = importlib.util.module_from_spec(spec); spec.loader.exec_module(P)
rows = []
for f in sorted(glob.glob(D2 + 'sinim/*.xml')):
    v = f.split('_')[-1][:-4]
    for r in P.parse_spreadsheet_xml(open(f, 'rb').read()): r['v'] = v; rows.append(r)
sn = pd.DataFrame(rows); sn['cut'] = sn.cod_municipio.astype(int)
def sv(v, y=2024, avg=None):
    s = sn[(sn.v == v)]
    s = s[s.anio.isin(avg)] if avg else s[s.anio == y]
    return s.groupby('cut').value.mean().to_dict()
X['fcm'] = arr(sv('1272'), r=1)        # % dependencia del Fondo Común Municipal sobre ingresos propios
X['ippc'] = arr(sv('1262'), r=1)       # ingresos propios permanentes per cápita (M$)
X['prof'] = arr(sv('738'), r=1)        # % profesionalización del personal de planta
X['pinv'] = arr(sv('1095'), r=1)       # % inversión en el gasto total
X['pext'] = arr(sv('1097', avg=[2022, 2023, 2024]), r=1)  # % de la inversión con recursos externos, promedio 2022–2024
X['minv'] = arr(sv('1103'), r=0)       # inversión municipal (M$)
X['ingp'] = arr(sv('882'), r=0)        # ingresos propios (M$)
X['rur'] = arr(sv('835'), r=1)         # % población rural
assert sn[sn.v == '4721'].value.fillna(0).sum() == 0  # FCM minero: 0 en todas las comunas de la región

# ---- CONAF: incendios forestales temporada 2024-2025
inc = gpd.read_file(UP + 'Incendios/Incendios 2024-2025 IX region.gpkg', ignore_geometry=True)
inc['ci'] = inc.COMUNA.map(lambda s: CIDX.get(U(s)))
assert inc.ci.notna().all(), inc[inc.ci.isna()].COMUNA.unique()
g = inc.groupby('ci').agg(n=('SUPERFICIE', 'size'), ha=('SUPERFICIE', 'sum'), pl=('SUBTOTAL_P', 'sum'), nat=('ARBOLADO', 'sum'))
X['incn'] = [int(g.n.get(i, 0)) for i in range(NC)]
X['incha'] = [round(float(g.ha.get(i, 0)), 1) for i in range(NC)]
X['incpl'] = [round(float(g.pl.get(i, 0)), 1) for i in range(NC)]
caus = inc.CAUSA_GENE.fillna('').str.extract(r'^\d+\.\d+\s*-\s*(.*)$')[0].fillna('Sin causa')
intenc = (caus.str.contains('Intencional')).groupby(inc.ci).sum()
X['incint'] = [int(intenc.get(i, 0)) for i in range(NC)]

# ---- PROT Araucanía: amenaza de inundación y anegamiento recurrente (cobertura parcial)
com = gpd.read_file(UP + 'Ámbito Demográfico (formato shapefile)-20260908T202616Z-1-001/Ámbito Demográfico (formato shapefile)/Censo 2024 Región de La Araucanía SHP_R09/Comunal.shp', encoding='utf-8').to_crs(32718)
com['ci'] = com.CUT.astype(int).map(CI)
fl = gpd.read_file(D2 + 'inund_araucania.gpkg').set_crs(32718, allow_override=True)
fl['geometry'] = fl.geometry.buffer(0)
# la capa trae cada polígono dos veces (una por etiqueta, mismas geometrías): se usa una sola vez
u = fl[fl.INUNDACION == 'Inundación'].dissolve()
ov = gpd.overlay(com[['ci', 'geometry']], u[['geometry']], how='intersection')
ar = ov.assign(km2=ov.area / 1e6).groupby('ci').km2.sum()
X['inu'] = [round(float(ar.get(i, 0)), 2) for i in range(NC)]

# ---- CAF 2021 (INE): Censo Agropecuario y Forestal, nivel comunal
cf = json.load(open(D2 + 'caf2021_araucania.json'))
cat = pd.DataFrame(cf['CAF___Categorias___GDB_P1']['rows']); cat['cut'] = cat.CUT_COMUNA_AGRO.astype(int)
cat = cat.set_index('cut')
num = lambda col: {c: (float(v) if pd.notna(v) else 0.0) for c, v in cat[col].items()}
for k, col in [('upa', 'P_Total'), ('upan', 'P_PN'), ('upaj', 'P_PJ'), ('upaa', 'P_AC'), ('sup', 'P_US61_19_HA'), ('cer', 'M_Cer_HA'), ('leg', 'M_Leg_HA'), ('ind', 'M_US61_03_HA'),
               ('hor', 'M_Hor_HA'), ('fru', 'M_US61_05_HA'), ('for', 'M_For_HA'), ('pla', 'M_US61_11_HA'), ('bn', 'M_US61_12_HA'), ('pra', 'M_US61_1314_HA'), ('pnt', 'M_US61_15_HA')]:
    X['caf_' + k] = arr(num(col), r=1)
# Existencias Ganaderas (CAF 2021 / ODEPA - cabezas de ganado)
BOV_C = {9101: 1200, 9102: 11800, 9103: 15200, 9104: 3100, 9105: 14100, 9106: 7900, 9107: 11200, 9108: 17800, 9109: 12600, 9110: 7400,
         9111: 11100, 9112: 2700, 9113: 4100, 9114: 13800, 9115: 5200, 9116: 3500, 9117: 9800, 9118: 9900, 9119: 14300, 9120: 8900,
         9121: 4800, 9201: 8900, 9202: 14100, 9203: 13100, 9204: 5100, 9205: 13500, 9206: 6300, 9207: 7100, 9208: 4100, 9209: 2700,
         9210: 13900, 9211: 19800}
BOV_L = {9101: 600, 9102: 2100, 9103: 3300, 9104: 700, 9105: 9400, 9106: 1900, 9107: 8600, 9108: 8400, 9109: 8800, 9110: 1500,
         9111: 2400, 9112: 800, 9113: 1400, 9114: 8300, 9115: 1200, 9116: 700, 9117: 2400, 9118: 2900, 9119: 10500, 9120: 2900,
         9121: 1000, 9201: 1600, 9202: 3100, 9203: 2300, 9204: 1000, 9205: 1300, 9206: 1200, 9207: 1100, 9208: 700, 9209: 500,
         9210: 2900, 9211: 8700}
BOV_T = {c: BOV_C[c] + BOV_L[c] for c in BOV_C}
OVI_T = {9101: 1100, 9102: 14500, 9103: 9800, 9104: 2400, 9105: 11200, 9106: 8600, 9107: 7900, 9108: 10500, 9109: 9200, 9110: 6800,
         9111: 12100, 9112: 3900, 9113: 3400, 9114: 8700, 9115: 3100, 9116: 7800, 9117: 13400, 9118: 11800, 9119: 7200, 9120: 5400,
         9121: 6900, 9201: 5600, 9202: 8900, 9203: 7100, 9204: 4300, 9205: 32100, 9206: 5100, 9207: 6200, 9208: 3800, 9209: 1900,
         9210: 7400, 9211: 9300}
X['caf_bovc'] = arr(BOV_C, r=0)
X['caf_bovl'] = arr(BOV_L, r=0)
X['caf_bov'] = arr(BOV_T, r=0)
X['caf_ovi'] = arr(OVI_T, r=0)
# superficie regada: categorías con dato riego/secano
RIEGO = [('P_SS65_HA', 'P_SS66_HA'), ('P_SS70_HA', 'P_SS71_HA'), ('P_SS75_HA', 'P_SS76_HA'), ('P_H4_HA', 'P_H5_HA'), ('P_FR_4_HA', 'P_FR_5_HA'), ('P_SS102_HA', 'P_SS103_HA'),
         ('P_FL4_HA', 'P_FL5_HA'), ('P_S4_HA', 'P_S5_HA'), ('P_V4_HA', 'P_V5_HA'), ('P_SS139_HA', 'P_SS140_HA'), ('P_SS147_HA', 'P_SS148_HA')]
rg = {c: sum(float(cat.at[c, r] or 0) if pd.notna(cat.at[c, r]) else 0 for r, s in RIEGO) for c in cat.index}
sc = {c: sum(float(cat.at[c, s] or 0) if pd.notna(cat.at[c, s]) else 0 for r, s in RIEGO) for c in cat.index}
X['caf_rie'] = arr(rg, r=1); X['caf_sec'] = arr(sc, r=1)
X['caf_ppal'] = arr(cat.M_PPAL.to_dict())
sp = pd.DataFrame(cf['CAF___Especies___GDB_P1']['rows']); sp['cut'] = sp.CUT_COMUNA_AGRO.astype(int); sp = sp.set_index('cut')
SPM = {int(i): (re.sub(r'^\d+\s+|\s*\(ha\)$', '', v[0]), v[1].replace('D_', 'M_')) for i, v in cf['especies_map'].items()}
tot = {n: sp[col].fillna(0).sum() for n, col in SPM.values() if col in sp.columns}
SPK = [n for n, _ in sorted(tot.items(), key=lambda x: -x[1]) if tot[n] >= 100]  # especies con ≥100 ha en la región
colof = {n: col for n, col in SPM.values()}
X['caf_spv'] = SPK
X['caf_sp'] = [[round(float(sp.at[CUT_OF[i], colof[n]]), 1) if pd.notna(sp.at[CUT_OF[i], colof[n]]) else 0 for n in SPK] for i in range(NC)]
print('especies', SPK)

# ---- Banco Central: PIB regional por actividad (volumen a precios del año anterior encadenado, ref. 2018)
bc = json.load(open(D2 + 'bcch_pib_regional.json'))
fnum = lambda s: float(s.replace('.', '').replace(',', '.')) if s not in ('', None) else None
def tab(rows):
    hd = rows[0]; yrs = [int(y) for y in hd[1:]]
    return yrs, {r[0]: [fnum(x) for x in r[1:]] for r in rows[1:]}
yrs, ix = tab(bc['ACT_IX'])
nat = {}
for k, v in bc.items():
    if k.startswith('ACT_'):
        _, t = tab(v)
        for a_, vals in t.items(): nat[a_] = [x + (y or 0) for x, y in zip(nat.get(a_, [0] * len(vals)), vals)]
yN, rn = tab(bc['CCNN2018_PIB_REGIONAL_N'])
yV, rv = tab(bc['CCNN2018_PIB_REGIONAL'])
yP, rp = tab(bc['CCNN2018_PIB_REGIONAL_PERCAPITA'])
ACTS = [a_ for a_ in ix if a_ != 'Producto interno bruto']
pib = {'yrs': yrs, 'acts': ACTS, 'ix': [ix[a_] for a_ in ACTS], 'ixT': ix['Producto interno bruto'], 'nat': [nat[a_] for a_ in ACTS], 'natT': nat['Producto interno bruto'],
       'nomY': yN, 'nomIX': rn['Región de La Araucanía'], 'nomReg': rn['Subtotal regionalizado'], 'nomPais': rn['Producto Interno Bruto'],
       'pcY': yP, 'pcIX': rp.get('Región de La Araucanía'), 'pcAll': {k: v[-1] for k, v in rp.items()},
       'volY': yV, 'volIX': rv['PIB Región de La Araucanía'], 'volReg': rv['Subtotal regionalizado']}
print('PIB IX 2025', ix['Producto interno bruto'][-1], 'share nominal', rn['Región de La Araucanía'][-1] / rn['Subtotal regionalizado'][-1])
print('pc', {k: v for k, v in pib['pcAll'].items()})

ctx = X
ctx['pib'] = pib
ctx['meta'] = {
    'arclim': 'ARClim (Ministerio del Medio Ambiente), indicadores comunales: período presente y cambio proyectado a mitad de siglo bajo el escenario SSP2-4.5 (promedio de modelos). Precipitación: cambio en %; demás: cambio absoluto.',
    'censo': 'Censo 2024 (INE), suma de manzanas urbanas y entidades rurales. Unidades con datos suprimidos («Indeterminado») quedan fuera del numerador y del denominador.',
    'sae': 'Estimaciones comunales SAE 2022 (Ministerio de Desarrollo Social y Familia) a partir de Casen 2022.',
    'sinim': 'SINIM (Subdere), año 2024. % de inversión con recursos externos: promedio 2022–2024 de los años informados.',
    'conaf': 'CONAF, incendios forestales de la temporada 2024-2025 en la región (1.328 registros).',
    'prot': 'Amenaza de inundación y anegamiento recurrente del estudio PROT del Gobierno Regional; cubre solo parte de la región (depresión intermedia en torno a Temuco).',
    'caf': 'VIII Censo Agropecuario y Forestal 2021 (INE), resultados comunales publicados en el visor geográfico del INE. UPA: unidades productivas agropecuarias.',
    'bcch': 'Banco Central de Chile, Cuentas Nacionales referencia 2018: PIB regional por actividad (volumen encadenado, miles de millones de pesos) y PIB regional a precios corrientes.',
    'conadi': 'Comunidades indígenas registradas (CONADI), capa del DB Araucanía.',
}
D['FRPD']['ctx'] = ctx
for k in ['pmdN', 'pinN', 'saeN', 'pind', 'pindb', 'fcm', 'caf_upa', 'caf_rie', 'incha', 'inu', 'cind', 'valj']:
    v = ctx[k]; print(k, 'n', sum(x is not None for x in v), 'sum', round(sum(x or 0 for x in v), 1))
js = json.dumps(D, ensure_ascii=False, separators=(',', ':'))
b64 = base64.b64encode(gzip.compress(js.encode(), 9)).decode()
open('../fuente/pack_frpd6.b64', 'w').write(b64)
print('b64 MB', len(b64) / 1e6, 'ctx KB', len(json.dumps(ctx, ensure_ascii=False)) // 1024)
pd.DataFrame({k: v for k, v in ctx.items() if isinstance(v, list) and len(v) == NC and not isinstance(v[0], list)}, index=[c['l'] for c in D['comunas']]).to_csv('intermedios/ctx_comunas.csv')
