# Radar FRPD Araucanía · script de procesamiento (ver LEEME.md en la carpeta principal)
# Ejecutar desde la carpeta "procesamiento", en modo UTF-8:   python -X utf8 prep_geocgr.py [--descargar] [ruta.json]
"""Obras georreferenciadas de Geo-CGR (Contraloría) para la capa de puntos del mapa de iniciativas BIP.

Paso 7, independiente de los pasos 1 a 6: lee la descarga de Geo-CGR y escribe ../fuente/obras_geocgr.b64,
que build.py incorpora al tablero si existe.

  --descargar   vuelve a consultar Geo-CGR (32 comunas, desde el 01/01/2019 hasta hoy) y reemplaza el JSON.
                La consulta solo funciona desde una red con acceso a www.contraloria.cl.
  ruta.json     descarga ya guardada (por defecto, la de DB Araucania/GeoCGR).

Requiere pyproj y shapely (vienen con geopandas). El vínculo aproximado por nombre usa solo la biblioteca estándar.
"""
import sys, json, gzip, base64, re, time, datetime, unicodedata, urllib.request
from pathlib import Path
from pyproj import Transformer
from shapely.geometry import Point, Polygon, LineString
from shapely.ops import unary_union
from shapely.strtree import STRtree

H = Path(__file__).resolve().parent
args = [a for a in sys.argv[1:] if not a.startswith('--')]
SRC = Path(args[0]) if args else Path('C:/Users/mpooley/Documents/DB Araucania/GeoCGR/geocgr_araucania_2019_2026.json')
API = 'https://www.contraloria.cl/opencgrapp/geocgr/api'

def get(u):
    req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0 (DIFOI GORE Araucania)', 'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.loads(r.read().decode('utf-8'))

if '--descargar' in sys.argv:
    hoy = datetime.date.today().strftime('%d/%m/%Y')
    coms = get(API + '/cartografia/regiones/09/comunas')
    U, nreg = {}, 0
    for c in coms:
        cd = c['CINE_COM']
        lst = get(f'{API}/comunas/{cd}/newobras?from_date=01/01/2019&to_date={hoy}')
        nreg += len(lst)
        for o in lst:
            k = str(o.get('X_EXPE') or o.get('CODPROYECTO'))
            if k not in U: U[k] = dict(o, _comunas=[cd])
            elif cd not in U[k]['_comunas']: U[k]['_comunas'].append(cd)
        print(cd, c['COMUNA'], len(lst)); time.sleep(0.3)
    meta = {'fuente': 'Contraloría General de la República, Geo-CGR (https://www.contraloria.cl/opencgrapp/geocgr/mapa)',
            'consulta': f'api/comunas/{{CUT}}/newobras?from_date=01/01/2019&to_date={hoy}, 32 comunas de La Araucanía',
            'descargado': datetime.datetime.now().isoformat(timespec='seconds'), 'n_registros_api': nreg, 'n_obras': len(U)}
    SRC.parent.mkdir(parents=True, exist_ok=True)
    SRC.write_text(json.dumps({'meta': meta, 'obras': list(U.values())}, ensure_ascii=False), encoding='utf-8')

J = json.loads(SRC.read_text(encoding='utf-8'))
meta, obras = J['meta'], J['obras']
D = json.loads(gzip.decompress(base64.b64decode((H.parent / 'fuente' / 'pack_frpd6.b64').read_text().strip())))
COMS = D['comunas']
BIPSET = set(D['FRPD']['bip']['code'])

# misma proyección del mapa (prep_frpd.py): UTM 18S, origen en los límites de Comunal.shp del Censo 2024
MINX, MAXY, S = 629128.7821792153, 5838267.49994959, 1000.0 / 234350.36251161912
T = Transformer.from_crs(4326, 32718, always_xy=True)
def svg(lon, lat):
    x, y = T.transform(lon, lat)
    return ((x - MINX) * S, (MAXY - y) * S)

# polígonos de comunas del paquete (coordenadas del mapa), para ubicar cada obra
def path_polys(d):
    rings = [[tuple(map(float, p.split(','))) for p in r.split('L')] for r in re.findall(r'M([^MZ]+)Z', d)]
    polys = [Polygon(r) for r in rings if len(r) >= 3]
    return unary_union([p.buffer(0) for p in polys])
CPOLY = [path_polys(c['d']) for c in COMS]
TREE = STRtree(CPOLY)
def norm(s): return unicodedata.normalize('NFD', str(s)).encode('ascii', 'ignore').decode().upper().strip()
CIDX = {norm(c['l']): i for i, c in enumerate(COMS)}
CUT2I = {}
for o in obras:
    if o.get('COMUNA') and o.get('TCOMUNA') and norm(o['TCOMUNA']) in CIDX: CUT2I[o['COMUNA']] = CIDX[norm(o['TCOMUNA'])]
def comuna_of(pt):
    hits = [int(i) for i in TREE.query(pt) if CPOLY[int(i)].covers(pt)]
    if hits: return hits[0]
    i = int(TREE.nearest(pt))
    return i if CPOLY[i].distance(pt) < 2.2 else -1      # ~500 m: bordes simplificados del mapa

def geoms(o):
    try: j = json.loads(o.get('SPATIAL_OBJECT') or '')
    except Exception: return [], []
    feats = j.get('features') if j.get('type') == 'Multigeometry' else [j]
    pts, lns = [], []
    for g in feats or []:
        c = g.get('coordinates') or []
        try:
            if g.get('type') == 'Point' and len(c) >= 2: pts.append(svg(float(c[0]), float(c[1])))
            elif g.get('type') == 'Polyline' and len(c) >= 4: lns.append([svg(float(c[i]), float(c[i + 1])) for i in range(0, len(c) - 1, 2)])
        except (TypeError, ValueError):
            pass
    return pts, lns
def bip(o):
    m = re.search(r'(\d{8})', o.get('CODIGO_BIP') or '')
    if not m: m = re.search(r'(\d{8})\s*-\s*\d', (o.get('TITULO') or '') + ' ' + (o.get('DESCRIPCION') or ''))
    c = int(m.group(1)) if m else 0
    return 0 if c in (0, 40000000, 20180000) else c
def lut(vals):
    v = sorted(set(vals)); ix = {x: i for i, x in enumerate(v)}
    return v, [ix[x] for x in vals]
def clean(s, n=170):
    s = re.sub(r'\s+', ' ', str(s or '')).strip().strip('"“”').strip()
    return s if len(s) <= n else s[:n - 1].rsplit(' ', 1)[0] + '…'
def inside(pt): return 0 <= pt[0] <= 1000 and 0 <= pt[1] <= 988.3

rows, PX, PY, PI, LN = [], [], [], [], []
stats = {'sin_geometria': 0, 'fuera_del_mapa': 0, 'en_su_comuna': 0, 'en_otra_comuna': 0}
obras.sort(key=lambda o: (o.get('FECHA') or '', str(o.get('X_EXPE'))))
for o in obras:
    pts, lns = geoms(o)
    pts = [p for p in pts if inside(p)]
    lns = [l for l in lns if any(inside(p) for p in l)]
    if not pts and not lns:
        stats['fuera_del_mapa' if o.get('SPATIAL_OBJECT') and 'coordinates' in o['SPATIAL_OBJECT'] else 'sin_geometria'] += 1
        continue
    k = len(rows)
    ref = Point(pts[0]) if pts else LineString(lns[0]).interpolate(0.5, normalized=True)
    cg = comuna_of(ref)
    decl = [CUT2I[c] for c in o.get('_comunas', []) if c in CUT2I]
    stats['en_su_comuna' if cg in decl else 'en_otra_comuna'] += 1
    for x, y in pts: PX.append(round(x * 10)); PY.append(round(y * 10)); PI.append(k)
    for l in lns:
        ls = LineString(l).simplify(0.35)
        cs = [(round(x, 1), round(y, 1)) for x, y in ls.coords]
        cs = [p for j, p in enumerate(cs) if j == 0 or p != cs[j - 1]]
        if len(cs) >= 2: LN.append([k, 'M' + 'L'.join(f'{x:g},{y:g}' for x, y in cs)])
    f = (o.get('FECHA') or '')[:7]
    rows.append({'t': clean(o.get('TITULO') or o.get('DESCRIPCION')), 's': clean(o.get('SERV_CONTR'), 90).title(), 'k': o.get('CLASIFICACION') or 'Sin clasificación',
                 'b': bip(o), 'c': cg if cg >= 0 else (decl[0] if decl else -1), 'd': 1 if cg in decl else 0,
                 'm': round(float(o.get('MONTO_CONTRATADO') or 0) / 1000), 'y': int(f.replace('-', '')) if re.fullmatch(r'\d{4}-\d{2}', f) else 0,
                 'a': max(0, min(100, round(float(o.get('AVANCE_FIS') or 0)))), 'p': 1 if o.get('FLAG_PARALIZADO') == 'S' else 0,
                 'mp': '' if 'No Existe' in str(o.get('ID_MERCADO_PUB')) else str(o.get('ID_MERCADO_PUB') or ''),
                 'decl': decl, 'desc': str(o.get('DESCRIPCION') or ''), 'tfull': str(o.get('TITULO') or '')})
    rows[-1]['x'] = 1 if rows[-1]['m'] > 5e7 else 0   # más de 50.000 MM$: casi seguro mal registrado (en pesos u otra unidad)

# ---------------- vínculo aproximado por nombre (obras sin código BIP o con un código que no está en la base) ----------------
# Similitud coseno TF-IDF (palabras y pares de palabras) entre el título de la obra y el nombre de cada iniciativa candidata:
# iniciativas de la misma comuna (o regionales, con 0,08 de castigo) que tengan alguna postulación a ejecución y cuyo período
# de postulación cubra el año de la obra (desde un año antes hasta dos después). Se acepta la mejor si su similitud es al menos
# UMBRAL y supera a la segunda por MARGEN. Calibración con las obras que sí traen código: ver el resultado impreso al final.
import math, collections
UMBRAL, MARGEN = 0.50, 0.10
BIP = D['FRPD']['bip']; BN = BIP['n'].split('\n'); BC = BIP['c']; BCODE = {c: i for i, c in enumerate(BIP['code'])}
EJ = BIP['etv'].index('Ejecucion')
YRS = collections.defaultdict(list); TIENE_EJ = [False] * len(BN)
for i, y, e in zip(BIP['h']['i'], BIP['h']['y'], BIP['h']['e']):
    YRS[i].append(y); TIENE_EJ[i] = TIENE_EJ[i] or e == EJ
COMTOK = {t for c in COMS for t in re.findall(r'[A-Z0-9]+', norm(c['l']))}
STOP = set('DE DEL LA LAS LOS EL EN Y E A AL PARA POR CON SIN N NO NRO NUM COMUNA COMUNAS SECTOR SECTORES REGION ARAUCANIA IX PROVINCIA CAUTIN MALLECO '
           'LOCALIDAD CIUDAD URBANO RURAL OTROS OTRAS VARIOS VARIAS ENTRE DESDE HASTA ETAPA'.split())
ABR = {'CONST': 'CONSTRUCCION', 'CONSTRUC': 'CONSTRUCCION', 'CONSTR': 'CONSTRUCCION', 'MEJ': 'MEJORAMIENTO', 'MEJORAM': 'MEJORAMIENTO', 'CONS': 'CONSERVACION',
       'CONSERV': 'CONSERVACION', 'REP': 'REPOSICION', 'REPOS': 'REPOSICION', 'AV': 'AVENIDA', 'AVDA': 'AVENIDA', 'ESC': 'ESCUELA', 'SAPR': 'APR', 'SSR': 'APR',
       'AMPL': 'AMPLIACION', 'NORM': 'NORMALIZACION', 'HAB': 'HABILITACION', 'INST': 'INSTALACION', 'ADQ': 'ADQUISICION', 'PAV': 'PAVIMENTACION', 'PAVIM': 'PAVIMENTACION'}
def toks(txt):
    t = norm(txt)
    for a in ['AGUA POTABLE RURAL', 'SISTEMA DE AGUA POTABLE', 'SISTEMA AGUA POTABLE', 'SERVICIO SANITARIO RURAL', 'SERVICIO DE AGUA POTABLE']: t = t.replace(a, 'APR')
    out = []
    for w in re.findall(r'[A-Z0-9]+', t):
        w = ABR.get(w, w)
        if len(w) == 1 or w in STOP or w in COMTOK: continue
        if len(w) > 4 and w.endswith('ES'): w = w[:-2]
        elif len(w) > 3 and w.endswith('S'): w = w[:-1]
        out.append(w)
    return out
def grams(ws): return ws + [a + ' ' + b for a, b in zip(ws, ws[1:])]
DOC_B = [grams(toks(n)) for n in BN]
DOC_O = [grams(toks(r['tfull'] or r['t'])) for r in rows]
DF = collections.Counter(g for d in DOC_B + DOC_O for g in set(d)); NDOC = len(DOC_B) + len(DOC_O)
IDF = {g: math.log((1 + NDOC) / (1 + n)) + 1 for g, n in DF.items()}
def vec(d):
    v = {g: (1 + math.log(n)) * IDF[g] for g, n in collections.Counter(d).items()}
    z = math.sqrt(sum(x * x for x in v.values())) or 1
    return {g: x / z for g, x in v.items()}
VB = [vec(d) for d in DOC_B]; VO = [vec(d) for d in DOC_O]
POR_COM = collections.defaultdict(list)
for i, c in enumerate(BC): POR_COM[c].append(i)
def candidatas(r):
    cs = set(r['decl']) | ({r['c']} if r['c'] >= 0 else set())
    y = r['y'] // 100
    return [i for i in {i for c in cs for i in POR_COM.get(c, [])} | set(POR_COM.get(-1, [])) if TIENE_EJ[i] and min(YRS[i]) - 1 <= y <= max(YRS[i]) + 2]
def mejores(k, excluir=-1):
    vo = VO[k]; sc = []
    for i in candidatas(rows[k]):
        if i == excluir: continue
        vb = VB[i]; cos = sum(x * vb.get(g, 0) for g, x in vo.items())
        sc.append((cos - (0.08 if BC[i] < 0 else 0), i))
    sc.sort(reverse=True)
    return sc[:2]
def acepta(sc): return bool(sc) and sc[0][0] >= UMBRAL and sc[0][0] - (sc[1][0] if len(sc) > 1 else 0) >= MARGEN
BA, BS = [0] * len(rows), [0] * len(rows)
for k, r in enumerate(rows):
    if r['b'] in BCODE: continue
    sc = mejores(k)
    if acepta(sc): BA[k] = BIP['code'][sc[0][1]]; BS[k] = round(min(1, sc[0][0]) * 100)
# calibración: obras con código válido, buscando su iniciativa por nombre (con y sin la verdadera entre las candidatas)
GT = [k for k, r in enumerate(rows) if r['b'] in BCODE]
ok = tot = falsos = 0
for k in GT:
    t = BCODE[rows[k]['b']]; sc = mejores(k)
    if acepta(sc): tot += 1; ok += sc[0][1] == t
    falsos += acepta(mejores(k, excluir=t))
CALIB = {'obras_con_codigo': len(GT), 'vinculadas': tot, 'correctas': ok, 'precision': round(ok / max(1, tot), 3), 'falsos_sin_la_verdadera': round(falsos / max(1, len(GT)), 3)}

sv, si = lut([r['s'] for r in rows]); kv, ki = lut([r['k'] for r in rows])
out = {'meta': {'fuente': meta['fuente'], 'descargado': meta['descargado'][:10], 'consulta': meta['consulta'], 'n': len(rows)},
       't': '\n'.join(r['t'] for r in rows), 'sv': sv, 's': si, 'kv': kv, 'k': ki,
       **{key: [r[key] for r in rows] for key in ['b', 'c', 'd', 'm', 'x', 'y', 'a', 'p']}, 'mp': '\n'.join(r['mp'] for r in rows),
       'px': PX, 'py': PY, 'pi': PI, 'ln': LN, 'ba': BA, 'bs': BS}
out['meta']['vinculo_nombre'] = {'umbral': UMBRAL, 'margen': MARGEN, **CALIB}
js = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
b64 = base64.b64encode(gzip.compress(js.encode(), 9)).decode()
(H.parent / 'fuente' / 'obras_geocgr.b64').write_text(b64)
codes = {r['b'] for r in rows if r['b']}
print('obras', len(rows), 'puntos', len(PX), 'líneas', len(LN), stats)
print('obras con código BIP', sum(1 for r in rows if r['b']), '· códigos distintos', len(codes), '· en la base BIP del radar', len(codes & BIPSET))
print('vínculo por nombre: obras', sum(1 for x in BA if x), '· iniciativas', len({x for x in BA if x}), '· calibración', CALIB)
print('montos atípicos (> 50.000 MM$)', sum(r['x'] for r in rows), '· b64 KB', len(b64) // 1024)
