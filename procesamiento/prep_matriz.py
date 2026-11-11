# Radar FRPD Araucanía · script de procesamiento (ver LEEME.md en la carpeta principal)
# Ejecutar desde la carpeta "procesamiento", en modo UTF-8:   python -X utf8 prep_matriz.py [carpeta _sistema de DIFOI]
"""Matriz estratégica para la pestaña «Formular»: ítems del art. 8 del DS 1.699 y acciones de la ERD y la PRFP.

Paso 8, independiente de los demás. Lee de la carpeta de trabajo de DIFOI:
  07_MATRIZ_ESTRATEGICA.md   sección 2: ítems financiables, con página y si cuentan para el 25% de CTCI
  07_ACCIONES_ERD_PRFP.csv   638 acciones con su ítem, encaje (V, I, D) y alerta del art. 10
y escribe ../fuente/matriz_estrategica.b64, que build.py incorpora al tablero si existe.
No incluye la cartera en formulación, las prioridades ni la hoja de ruta: solo el cruce de documentos públicos.
"""
import sys, csv, json, gzip, base64, re
from pathlib import Path

H = Path(__file__).resolve().parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('C:/Users/mpooley/Desktop/DIFOI/_sistema')
md = (SRC / '07_MATRIZ_ESTRATEGICA.md').read_text(encoding='utf-8')
sec = md[md.index('## 2. Ítems financiables'):md.index('## 3. Matriz resumen')]
# Dos textos se citan según el decreto (D.S. 1.699, art. 8), no según el resumen de la matriz de trabajo:
# corregir también en _sistema/07_MATRIZ_ESTRATEGICA.md de la carpeta DIFOI.
CITA_DECRETO = {'N°2 e': 'Mejora de gestión y operación de financiamiento para los Comités de Desarrollo Productivo y de CTCI regionales', 'N°3 gasto ix': 'I+D y transferencia de institutos tecnológicos públicos (el decreto nombra al Instituto de Desarrollo Agropecuario, ISP, SERNAGEOMIN, IFOP u otros)'}
items = []
for m in re.finditer(r'^\| ([^|]+?) \| ([^|]+?) \| ([^|]+?) \| ([^|]+?) \|$', sec, re.M):
    k, q, p, c = [x.strip().replace('**', '') for x in m.groups()]
    if k in ('Ítem', '---') or set(k) <= set('-'): continue
    grupo = k in ('N°1', 'N°2', 'N°3')
    key = k if grupo else ('N°3 ' + k if k.startswith('gasto') else 'N°' + k)
    q = CITA_DECRETO.get(key, q)
    items.append({'k': key, 'q': q, 'p': p, 'c25': c.startswith('Sí'), 'g': grupo})
IDX = {it['k']: i for i, it in enumerate(items)}
rows = list(csv.DictReader(open(SRC / '07_ACCIONES_ERD_PRFP.csv', encoding='utf-8')))
def lut(vals):
    v = sorted(set(vals)); ix = {x: i for i, x in enumerate(v)}
    return v, [ix[x] for x in vals]
sin = set()
def its(s):
    out = []
    for x in s.split(';'):
        x = x.strip()
        if not x: continue
        if x in IDX: out.append(IDX[x])
        else: sin.add(x)
    return out
linv, lin = lut([f"{r['fuente']} · {r['lineamiento']}" for r in rows])
out = {'meta': {'fuente': 'DIFOI, matriz estratégica FRPD × ERD × PRFP (versión 2026-10-09): DS 1.699 (art. 7–10), ERD 2025-2040 y PRFP 2025-2035', 'n': len(rows)},
       'items': items, 'linv': linv, 'lin': lin,
       'oe': [r['objetivo'] for r in rows], 'l': [r['linea'] for r in rows], 'cod': [r['codigo'] for r in rows],
       'acc': '\n'.join(re.sub(r'\s+', ' ', r['accion']).strip() for r in rows), 'p': [r['pagina'] for r in rows],
       'it': [its(r['items_ds1699']) for r in rows], 'enc': [r['encaje'] for r in rows],
       'a10': [r['alerta_art10'] for r in rows], 'otra': [r['otra_fuente'] for r in rows]}
b64 = base64.b64encode(gzip.compress(json.dumps(out, ensure_ascii=False, separators=(',', ':')).encode(), 9)).decode()
(H.parent / 'fuente' / 'matriz_estrategica.b64').write_text(b64)
print('ítems', len(items), '· acciones', len(rows), '· con ítem', sum(1 for x in out['it'] if x), '· ítems del CSV sin fila en la matriz:', sorted(sin) or 'ninguno', '· b64 KB', len(b64) // 1024)
