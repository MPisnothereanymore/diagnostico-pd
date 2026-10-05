# Radar FRPD Araucanía · script de procesamiento (ver LEEME.md en la carpeta principal)
# Ejecutar desde la carpeta "procesamiento", en modo UTF-8:   python -X utf8 prep_infra.py
# Rutas: datos de entrada en C:/Users/mpooley/Documents/DB Araucania/ ; paquetes intermedios en ./intermedios/
"""Adds infrastructure / enabling-conditions data to the Radar FRPD pack (phase 1)."""
import json, gzip, base64, unicodedata, re, glob, warnings
import geopandas as gpd, pandas as pd, numpy as np
from shapely import coverage_simplify
warnings.filterwarnings('ignore')

def norm(s): return unicodedata.normalize('NFD', str(s)).encode('ascii', 'ignore').decode().upper().strip()
D = json.loads(gzip.decompress(base64.b64decode(open('intermedios/pack_frpd.b64').read())))
NC = len(D['comunas'])
CIDX = {norm(c['l']): i for i, c in enumerate(D['comunas'])}
ROOT = 'C:/Users/mpooley/Documents/DB Araucania/'
def shp(pat, enc=None):
    f = [x for x in glob.glob(ROOT + '**/*.shp', recursive=True) if pat in x]
    assert len(f) == 1, (pat, f)
    g = gpd.read_file(f[0], encoding=enc) if enc else gpd.read_file(f[0])
    return g
def cidx(name):
    k = norm(name)
    return CIDX.get(k, None)

DEM = ROOT + 'Ámbito Demográfico (formato shapefile)-20260908T202616Z-1-001/Ámbito Demográfico (formato shapefile)/'
com = gpd.read_file(DEM + 'Censo 2024 Región de La Araucanía SHP_R09/Comunal.shp', encoding='utf-8').to_crs(32718).sort_values('CUT').reset_index(drop=True)
minx, miny, maxx, maxy = com.total_bounds; S = 1000.0 / (maxx - minx)
com['ci'] = com.N_COMUNA.map(lambda s: CIDX[norm(s)])
region = com.geometry.union_all()
def X(x): return round((x - minx) * S, 1)
def Y(y): return round((maxy - y) * S, 1)

def join_pts(g):
    g = g[g.geometry.notna() & ~g.geometry.is_empty].copy()
    if g.crs is None: g = g.set_crs(4326)
    g = g.to_crs(32718)
    g = gpd.sjoin(g, com[['ci', 'geometry']], how='left', predicate='within')
    g = g[~g.index.duplicated()]
    return g

ind = {k: [0] * NC for k in ['kmv', 'kmpav', 'kmrip', 'kmtie', 'pue', 'pmad', 'saidi', 'vse', 'ant', 'lte', 'sub', 'ssr', 'ssrb', 'ssrge', 'boc', 'emb', 'ies', 'port', 'aer', 'front',
                             'ipa', 'ipapc', 'ipav', 'rez', 'jn', 'jv', 'jt', 'jr']}
mp = {}

# --- red vial (ya intersectada por comuna; Shape_Le_2 = metros dentro de la comuna)
rv = shp('Red Vial Comunas', 'utf-8')
rv['ci'] = rv.COMUNA.map(cidx)
assert rv.ci.notna().all()
for r in rv.itertuples():
    km = r.Shape_Le_2 / 1000; i = int(r.ci)
    ind['kmv'][i] += km
    if r.CARPETAV == 'Pavimento': ind['kmpav'][i] += km
    elif r.CARPETAV == 'Ripio': ind['kmrip'][i] += km
    else: ind['kmtie'][i] += km
for k in ['kmv', 'kmpav', 'kmrip', 'kmtie']: ind[k] = [round(v, 1) for v in ind[k]]

# --- puentes (sin campo comuna: unión espacial)
pu = join_pts(shp('Puentes'))
print('puentes fuera de región', pu.ci.isna().sum())
pu = pu[pu.ci.notna()]
for r in pu.itertuples():
    i = int(r.ci); ind['pue'][i] += 1; ind['pmad'][i] += int(r.PISO == 'Madera')
mp['pue'] = [[X(p.x), Y(p.y), int(m)] for p, m in zip(pu.geometry, pu.PISO == 'Madera')]

# --- SAIDI 2022, viviendas sin energía, inversión pública, jerarquía de actividades, zonas de rezago (capas comunales)
for pat, fn in [('SAIDI 2022', lambda r, i: ind['saidi'].__setitem__(i, float(r.SAIDI_2022))),
                ('Viviendas sin energ', lambda r, i: ind['vse'].__setitem__(i, int(r.Vivi_noluz))),
                ('Zonas de Rezago', lambda r, i: ind['rez'].__setitem__(i, int(r.Zona)))]:
    g = shp(pat)
    for r in g.itertuples(): fn(r, CIDX[norm(r.COMUNA)])
ip = shp('Inversión Publica 2010-2022')
for r in ip.itertuples():
    i = CIDX[norm(r.COMUNA)]
    ind['ipa'][i] = int(r.IPA_2010_2); ind['ipapc'][i] = int(r.IPA_Percap); ind['ipav'][i] = float(str(r.Inv_Publi_).replace(',', '.'))
jr = shp('Jerarquia de actividades')
for r in jr.itertuples():
    i = CIDX[norm(r.COMUNA)]
    ind['jn'][i] = int(r.Número_de); ind['jv'][i] = round(float(r.Ventas__UF)); ind['jt'][i] = int(r.Número__1); ind['jr'][i] = round(float(r.Renta_Neta))

# --- antenas
an = join_pts(shp('Antenas Ley'))
print('antenas fuera de región', an.ci.isna().sum())
an = an[an.ci.notna()]
an['lte'] = an.TECNOLOGIA.fillna('').str.upper().str.contains('LTE')
for r in an.itertuples():
    i = int(r.ci); ind['ant'][i] += 1; ind['lte'][i] += int(r.lte)
mp['ant'] = [[X(p.x), Y(p.y), int(l)] for p, l in zip(an.geometry, an.lte)]
antY = pd.to_numeric(an.ANIO_DOC.astype(str).str[-4:], errors='coerce')
print('antenas años', antY.min(), antY.max())

# --- subestaciones
su = join_pts(shp('Subestaciones'))
su = su[su.ci.notna()]
su['kv'] = su.TENSION__K.astype(str).str.extract(r'(\d+)')[0]
mp['sub'] = []
for r in su.itertuples():
    i = int(r.ci); ind['sub'][i] += 1
    mp['sub'].append([X(r.geometry.x), Y(r.geometry.y), r.NOMBRE_1.strip().replace('S/E ', 'S/E ').title().replace('S/E', 'S/E'), (r.kv + ' kV') if isinstance(r.kv, str) else 's/i'])

# --- servicios sanitarios rurales (SSR, ex APR) — DOH, act. dic-2025
ssr = gpd.read_file('zip://' + ROOT + 'Ámbito Infraestructura Publica (formato shapefile)-20260908T202623Z-1-001/Ámbito Infraestructura Publica (formato shapefile)/Servicios_Sanitarios_Rurales_shp.zip!Servicios_Sanitarios_Rurales_2026_08_31.shp')
ssr = ssr[ssr.REGION.str.contains('ARAUCAN', na=False)].copy()
ssr = join_pts(ssr)
print('ssr', len(ssr), 'sin comuna', ssr.ci.isna().sum())
ssr['ci2'] = ssr.ci.fillna(ssr.COMUNA.map(cidx))
mp['ssr'] = []
for r in ssr.itertuples():
    if pd.isna(r.ci2): continue
    i = int(r.ci2); ind['ssr'][i] += 1; ind['ssrb'][i] += int(r.BENEF_EST); ind['ssrge'][i] += int(r.GRUP_ELEC == 'SÍ')
    mp['ssr'].append([X(r.geometry.x), Y(r.geometry.y), r.NOMBRE_SSR.title(), int(r.BENEF_EST), int(r.GRUP_ELEC == 'SÍ')])

# --- bocatomas (CNR) y embalses (DOH)
bo = join_pts(shp('Bocatomas')); bo = bo[bo.ci.notna()]
for r in bo.itertuples(): ind['boc'][int(r.ci)] += 1
mp['boc'] = [[X(p.x), Y(p.y)] for p in bo.geometry]
em = shp('Embalses')
em = gpd.GeoDataFrame(em, geometry=gpd.points_from_xy(em.Longitud, em.Latitud), crs=4326)
em = join_pts(em); print('embalses fuera', em.ci.isna().sum()); em = em[em.ci.notna()]
for r in em.itertuples(): ind['emb'][int(r.ci)] += 1
mp['emb'] = [[X(p.x), Y(p.y)] for p in em.geometry]

# --- educación superior (sedes, Mineduc 2020)
es = shp('EdSuperior')
es = gpd.GeoDataFrame(es.drop(columns='geometry'), geometry=gpd.points_from_xy(es.LONGITUD, es.LATITUD), crs=4326)
es = join_pts(es); print('ies sin comuna', es.ci.isna().sum())
es['ci2'] = es.COMUNA.map(cidx).fillna(es.ci)
es['tipo'] = es.TIPO_INST.str.upper().str.replace('ESTATALES', 'ESTATALES').map(lambda t: 'Universidad CRUCH' if 'CRUCH' in t else 'Universidad privada' if 'UNIVERSIDAD' in t else 'Instituto profesional' if 'INSTITUTO' in t else 'CFT')
es['inst'] = es.NOMBRE_INS.str.strip().str.title().str.replace(' De ', ' de ').str.replace(' La ', ' la ').str.replace('Cft ', 'CFT ').str.replace('Ip ', 'IP ').str.replace('Inacap', 'INACAP').str.replace('Duoc Uc', 'Duoc UC').str.replace('Aiep', 'AIEP').str.replace('Protec', 'PROTEC')
ies_list = {}
mp['ies'] = []
seen = set()
for r in es.itertuples():
    i = int(r.ci2)
    key = (r.inst, i)
    if key in seen: continue
    seen.add(key)
    ind['ies'][i] += 1
    ies_list.setdefault(i, []).append([r.inst, r.tipo])
    mp['ies'].append([X(r.geometry.x), Y(r.geometry.y), r.inst, r.tipo])
print('ies únicas', len(seen), {D['comunas'][k]['l']: len(v) for k, v in ies_list.items()})

# --- portuaria, aeródromos, complejos fronterizos
po = join_pts(shp('Infraestructura Portuaria'))
po = po[po.ci.notna()].drop_duplicates('DESCOBRA')
mp['port'] = []
for r in po.itertuples():
    ind['port'][int(r.ci)] += 1; mp['port'].append([X(r.geometry.x), Y(r.geometry.y), r.DESCOBRA.title(), str(r.PROGRAMA).title() if isinstance(r.PROGRAMA, str) else ''])
ae = join_pts(shp('Red Aeroportuaria')); ae = ae[ae.ci.notna()]
mp['aer'] = []
for r in ae.itertuples():
    ind['aer'][int(r.ci)] += 1; mp['aer'].append([X(r.geometry.x), Y(r.geometry.y), 'Aeródromo ' + r.AERODROMOS])
fr = join_pts(shp('Complejos Fronterizos')); fr = fr[fr.ci.notna()]
mp['front'] = []
for r in fr.itertuples():
    ind['front'][int(r.ci)] += 1; mp['front'].append([X(r.geometry.x), Y(r.geometry.y), r.Name])
print('front', [(f[2]) for f in mp['front']])

# --- líneas: red eléctrica (transmisión), iniciativas ERD de ferrocarril y corredor bioceánico
def line_d(geom, tol=150):
    geom = geom.simplify(tol)
    ls = [geom] if geom.geom_type == 'LineString' else [g for g in getattr(geom, 'geoms', []) if g.geom_type == 'LineString']
    out = ''
    for l in ls:
        pts = [(X(x), Y(y)) for x, y, *r in l.coords]
        if len(pts) < 2: continue
        out += 'M' + 'L'.join(f'{x:g},{y:g}' for x, y in pts)
    return out
el = shp('Red de electricidad').to_crs(32718)
el['geometry'] = el.geometry.force_2d().intersection(region.buffer(200))
el = el[~el.geometry.is_empty]
el['kv'] = pd.to_numeric(el.TENSION_KV, errors='coerce')
mp['elec'] = [{'kv': int(r.kv) if pd.notna(r.kv) else 0, 'n': str(r.Nombre).strip().title(), 'd': line_d(r.geometry)} for r in el.itertuples()]
mp['elec'] = [e for e in mp['elec'] if e['d']]
fe = shp('Red Ferroviaria').to_crs(32718); fe['geometry'] = fe.geometry.force_2d().intersection(region.buffer(200))
bi = shp('Corredor Bioc').to_crs(32718); bi['geometry'] = bi.geometry.force_2d().intersection(region.buffer(200))
mp['ferro'] = line_d(fe.geometry.union_all())
mp['bioc'] = line_d(bi.geometry.union_all())

# --- territorios oficiales ERD: validar composición e inversión GORE
for f in glob.glob(ROOT + '**/Territorios ERD Araucanía 2040*/*.shp', recursive=True):
    g = gpd.read_file(f)
    name = g.Territorio.iloc[0]
    ids = sorted(CIDX[norm(c)] for c in g.COMUNA)
    t = [t for t in D['FRPD']['terr'] if sorted(t['c']) == ids]
    assert len(t) == 1, (name, ids)
    t[0]['nOficial'] = name
est = shp('Estadistica Territorios ERD')
num = lambda s: int(re.sub(r'[^\d]', '', str(s)))
for r in est.itertuples():
    i = CIDX[norm(r.COMUNA)]
    t = [t for t in D['FRPD']['terr'] if i in t['c']][0]
    t['gore'] = num(r.IPA_GORE_2); t['ipaT'] = num(r.IPA_2010_2); t['ipaTpc'] = num(r.IPA_PerCap)
    t['ipaTv'] = float(str(r.Var_IPA_20).replace('%', '').replace('.', '').replace(',', '.'))
print([(t['k'], t.get('nOficial'), t.get('gore')) for t in D['FRPD']['terr']])

D['FRPD']['infra'] = ind
D['FRPD']['iesList'] = {str(k): v for k, v in ies_list.items()}
D['FRPD']['map'] = mp
D['FRPD']['infraMeta'] = {'antY': [int(antY.min()), int(antY.max())]}
js = json.dumps(D, ensure_ascii=False, separators=(',', ':'))
b64 = base64.b64encode(gzip.compress(js.encode(), 9)).decode()
open('intermedios/pack_frpd2.b64', 'w').write(b64)
print('b64 MB', len(b64) / 1e6, {k: len(json.dumps(v)) // 1024 for k, v in mp.items()})
pd.set_option('display.width', 250)
df = pd.DataFrame(ind); df.insert(0, 'com', [c['l'] for c in D['comunas']])
print(df.to_string())
