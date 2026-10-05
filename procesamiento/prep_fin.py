# Radar FRPD Araucanía · script de procesamiento (ver LEEME.md en la carpeta principal)
# Ejecutar desde la carpeta "procesamiento", en modo UTF-8:   python -X utf8 prep_fin.py
# Rutas: datos de entrada en C:/Users/mpooley/Documents/DB Araucania/ ; paquetes intermedios en ./intermedios/
"""Fase 2: financiamiento público existente (ANID, CORFO InnovaChile, BIP) para el Radar FRPD."""
import json, gzip, base64, unicodedata, re
import pandas as pd, numpy as np

def U(s): return unicodedata.normalize('NFD', str(s)).encode('ascii', 'ignore').decode().upper()
def norm(s): return U(s).strip()
D = json.loads(gzip.decompress(base64.b64decode(open('intermedios/pack_frpd2.b64').read())))
FR = D['FRPD']; NC = len(D['comunas'])
CIDX = {norm(c['l']): i for i, c in enumerate(D['comunas'])}
CUT2C = {}  # CUT -> comuna idx (from Censo order used in geo)
TOF = [-1] * NC
for ti, t in enumerate(FR['terr']):
    for c in t['c']: TOF[c] = ti
Y0 = 2019
F2 = 'C:/Users/mpooley/Documents/DB Araucania/FRPD_fase2/'

# ---------- clasificador de lineamientos ----------
LKW = {
 'L1': r'\bAGUA|HIDRIC|HIDROL|CUENCA|SEQUIA|CAMBIO CLIMATICO|CLIMA\b|CLIMATIC|RIEGO|\bLAGO|LACUSTR|HUMEDAL|INUNDAC|INCENDIO|ACUIFER|PRECIPITAC|\bSUELO|EROSION|DESERTIF|RESILIEN|RIESGO DE DESASTRE|EVAPOTRANS|GLACIAR|\bAPR\b|AGUA POTABLE|\bCANAL|EMBALSE|ACUMULADOR|NAPA|ADAPTACION',
 'L2': r'BIOTEC|GENETIC|GENOMIC|GENOMA|MOLECULAR|MICROBI|BACTERI|HONGO|FUNGI|ENZIM|SEMILLA|CULTIVO DE TEJIDO|TRANSCRIPT|PROTEOM|CRISPR|PROBIOTIC|BIOPESTIC|BIOCONTROL|BIOESTIMUL|BIOFERTIL|MICORR|BIOPRODUCT|FITOPAT|\bPLAGA|SANIDAD VEGETAL|SANIDAD ANIMAL|VETERINAR|MEJORAMIENTO GENETICO|PROPAGACION|VIVERO|GERMOPLASMA|METABOLIT|BIOACTIV|EXTRACTO',
 'L3': r'ALIMENT|NUTRIC|NUTRACEUT|LACTE|LECHE|QUESO|CARNE|CARNIC|FRUT|BERRIE|ARANDANO|AVELLAN|\bNUEZ|NOGAL|CEREAL|TRIGO|AVENA|LUPINO|LUPIN|LEGUMIN|\bPAPA\b|\bPAPAS|HORTALIZ|HORTIC|\bMIEL|APICOL|APICULT|\bVINO|CERVEZ|INOCUIDAD|POSCOSECHA|POST COSECHA|GASTRONOM|\bPESCA|ACUICULT|MARISC|\bALGAS|OVINO|BOVINO|CAPRIN|GANAD|AGRICOLA|AGRICULTOR|AGROALIMENT|AGROINDUST|HORTALIZ|INVERNADER|LUPINO|QUINOA|CHAMPIN',
 'L4': r'ENERG|ELECTRIF|BIOMASA|\bLENA\b|COMBUSTIB|\bSOLAR|FOTOVOLT|EOLIC|HIDROGENO|BATERI|CALEFACC|CALEFACTOR|BIOGAS|DESCARBON|ALUMBRADO|GEOTERM|TERMOELECT',
 'L5': r'RESIDUO|DESECHO|RECICL|VALORIZ|CIRCULAR|COMPOST|SUBPRODUCT|DESCARTE|RELLENO SANITARIO|PUNTO LIMPIO|BIODEGRAD|PLASTIC|\bLODO|\bRSD\b|REUTILIZ|VERTEDERO|ESTACION DE TRANSFERENCIA',
 'L6': r'DIGITAL|SOFTWARE|INTELIGENCIA ARTIFICIAL|MACHINE LEARNING|APRENDIZAJE AUTOMATICO|APRENDIZAJE PROFUNDO|DEEP LEARNING|BIG DATA|CIENCIA DE DATOS|ANALITICA DE DATOS|ALGORITM|COMPUTAC|SENSOR|\bIOT\b|INTERNET|CIBERSEG|BLOCKCHAIN|ROBOT|TELEDETEC|SATELIT|\bDRON|APLICACION MOVIL|PLATAFORMA (TECNOLOGICA|WEB|DIGITAL)|REALIDAD VIRTUAL|ULTIMA MILLA|FIBRA OPTICA|TELECOMUNIC|\bTIC\b|\bTICS\b|COMERCIO ELECTRONICO|E-COMMERCE|AUTOMATIZ|TRAZABILIDAD',
}
LRX = {k: re.compile(v) for k, v in LKW.items()}
LKEYS = [l['k'] for l in FR['lin']]
def classify(text):
    t = U(text)
    return [i for i, k in enumerate(LKEYS) if LRX[k].search(t)]

recs = []  # dicts
def add(**kw): recs.append(kw)

# ---------- ANID ----------
an = pd.read_csv('entradas/BDH_HISTORICA.csv', sep=';', encoding='utf-8-sig', low_memory=False)
an = an[an.REGION_EJECUCION.str.contains('ARAUCAN', na=False) & (an.AGNO_FALLO >= Y0)].copy()
an['m'] = pd.to_numeric(an.MONTO_ADJUDICADO, errors='coerce')
an.loc[~an.MONEDA.str.upper().str.contains('M\\$|MILES', na=False), 'm'] = np.nan
PGRP = {'FONDEF': 'apl', 'FONIS': 'apl', 'CORFO': 'apl', 'REGIONAL': 'apl', 'FONDECYT': 'bas', 'PIA': 'cen', 'SCIA': 'cen', 'MILENIO': 'cen', 'FONDEQUIP': 'eqp'}
INST = [('FRONTERA', 'TEMUCO'), ('CATOLICA DE TEMUCO', 'TEMUCO'), ('AUTONOMA', 'TEMUCO'), ('PONTIFICIA UNIVERSIDAD CATOLICA', 'VILLARRICA'), ('GENOMICA NUTRICIONAL', 'TEMUCO'), ('CGNA', 'TEMUCO'),
        ('INVESTIGACIONES AGROPECUARIAS', 'VILCUN'), ('INIA', 'VILCUN'), ('SANTO TOMAS', 'TEMUCO'), ('ARTURO PRAT', 'VICTORIA'), ('UNIVERSIDAD MAYOR', 'TEMUCO'), ('INACAP', 'TEMUCO'), ('DE LOS LAGOS', 'TEMUCO')]
SII_NAMES = {norm(n): int(c) for n, c in zip(D['B']['rz'].split('\n'), D['B']['c'])}
def inst_com(name):
    u = norm(name)
    for k, cm in INST:
        if k in u: return CIDX[cm]
    if u in SII_NAMES: return SII_NAMES[u]
    return -1
ianid = 0
for r in an.itertuples():
    txt = f'{r.NOMBRE_PROYECTO} {r.PALABRAS_CLAVES} {r.DISCIPLINA_DETALLE}'
    c = inst_com(r.INSTITUCION_PRINCIPAL)
    add(s='ANID', y=int(r.AGNO_FALLO), n=re.sub(r'\s+', ' ', str(r.NOMBRE_PROYECTO).replace('_x000d_', ' ').replace('"', '')).strip().capitalize(), c=c, L=classify(txt), m=round(r.m / 1000, 1) if pd.notna(r.m) else None,
        i=str(r.INSTITUCION_PRINCIPAL).title(), p=f'{r.PROGRAMA} · {str(r.INSTRUMENTO).title()}', g=PGRP.get(r.PROGRAMA, 'chv'), a=str(r.AREA_OCDE).capitalize())

# ---------- CORFO InnovaChile ----------
cj = pd.DataFrame(json.load(open(F2 + 'corfo_innovachile_proyectos.json')))
cj = cj[cj.region_ejecucion.str.contains('Araucan', na=False) & (cj['año_adjudicacion'] >= Y0)].copy()
RUT2C = {int(r): int(c) for r, c in zip(D['B']['rut'], D['B']['c'])}
def rut_c(s):
    try: return RUT2C.get(int(str(s).split('-')[0].replace('.', '')), -1)
    except Exception: return -1
CL = {'Recursos Hídricos': 'L1', 'Energético': 'L4', 'Tecnologías de la información': 'L6'}
for r in cj.itertuples():
    txt = f'{r.titulo_del_proyecto} {r.objetivo_general_del_proyecto} {r.sector_economico} {r.mercado_objetivo_final}'
    L = set(classify(txt))
    if r.economia_circular_si_no == 'Sí' or r.tipo_proyecto in ('Economía Circular', 'Habilitador para la EC'): L.add(LKEYS.index('L5'))
    if r.uso_ia == 'IA' or r.tendencia_final in ('Inteligencia Artificial (IA)', 'Internet de las Cosas (IoT)', 'Software de aplicación'): L.add(LKEYS.index('L6'))
    if isinstance(r.ernc, str) and r.ernc: L.add(LKEYS.index('L4'))
    for k, v in CL.items():
        if r.mercado_objetivo_final == k or r.sector_economico == k: L.add(LKEYS.index(v))
    m = pd.to_numeric(r.aprobado_corfo, errors='coerce')
    if not (m > 0): m = pd.to_numeric(r.monto_consolidado_ley, errors='coerce')
    if not (m > 0): m = np.nan
    g = 'cid' if r.foco_apoyo in ('Desarrolla innovación con I+D',) or 'I+D' in str(r.instrumento_homologado) else 'inn' if r.foco_apoyo in ('Desarrolla innovación', 'Consolida y Expande') else 'ent'
    add(s='CORFO', y=int(r.año_adjudicacion), n=str(r.titulo_del_proyecto).strip().capitalize()[:220], c=rut_c(r.rut_beneficiario), L=sorted(L), m=round(m / 1e6, 1) if pd.notna(m) else None,
        i=str(r.razon).title(), p=str(r.instrumento_homologado), g=g, a=str(r.sector_economico))

# ---------- BIP ----------
bp = pd.read_csv(F2 + 'bip_araucania_2019_2027.csv', sep=';', dtype=str, low_memory=False)
bp['cmn'] = pd.to_numeric(bp.CMN_CLAVE, errors='coerce')
bp = bp[(bp.cmn.between(9100, 9300)) | (bp.REG_CLAVE.isin(['177', '177.0']))].copy()
bp['yr'] = pd.to_numeric(bp.EBI_ANO_POSTULA, errors='coerce')
bp = bp.sort_values(['EBI_CODIGO', 'yr']).groupby('EBI_CODIGO').tail(1)
# CUT -> idx: comunas in D are ordered by CUT in Censo shapefile; rebuild from names via a CUT table
CUTS = {9101: 'TEMUCO', 9102: 'CARAHUE', 9103: 'CUNCO', 9104: 'CURARREHUE', 9105: 'FREIRE', 9106: 'GALVARINO', 9107: 'GORBEA', 9108: 'LAUTARO', 9109: 'LONCOCHE', 9110: 'MELIPEUCO',
        9111: 'NUEVA IMPERIAL', 9112: 'PADRE LAS CASAS', 9113: 'PERQUENCO', 9114: 'PITRUFQUEN', 9115: 'PUCON', 9116: 'SAAVEDRA', 9117: 'TEODORO SCHMIDT', 9118: 'TOLTEN', 9119: 'VILCUN',
        9120: 'VILLARRICA', 9121: 'CHOLCHOL', 9201: 'ANGOL', 9202: 'COLLIPULLI', 9203: 'CURACAUTIN', 9204: 'ERCILLA', 9205: 'LONQUIMAY', 9206: 'LOS SAUCES', 9207: 'LUMACO', 9208: 'PUREN',
        9209: 'RENAICO', 9210: 'TRAIGUEN', 9211: 'VICTORIA'}
assert all(v in CIDX for v in CUTS.values())
RX = lambda p: re.compile(p)
R_CTCI = RX(r'INNOVAC|\bI\s?\+\s?D|INVESTIGAC|CIENTIF|CIENCIA|TECNOLOG|\bCGNA|GENOMICA|\bINIA\b|CONICYT|\bANID\b|UNIVERSIDAD|\bFIC\b|EXTENSIONIS|LABORATORIO|BIOTEC|PROSPECCION')
R_RES = RX(r'RESIDUO|\bRSD\b|RECICL|COMPOST|RELLENO SANITARIO|PUNTOS? LIMPIOS?|VERTEDERO|ESTACION DE TRANSFERENCIA|CAMION RECOLECTOR|CONTENEDOR')
R_DIG = RX(r'ULTIMA MILLA|FIBRA OPTICA|INTERNET|CONECTIVIDAD DIGITAL|TELECOMUNIC|\bANTENA|\bWIFI|ZONA WIFI|TRANSFORMACION DIGITAL')
R_ENE = RX(r'ELECTRIF|ENERGI|CALEFACTOR|FOTOVOLT|\bSOLAR|ALUMBRADO|EFICIENCIA ENERGETICA')
R_RIE = RX(r'RIEGO|\bCANAL|EMBALSE|ACUMULA|TRANQUE|DRENAJE|\bNAPA|PEQUENAS OBRAS|DERECHOS DE AGUA|BONO LEGAL DE AGUA|ESTANQUE')
R_APR = RX(r'\bAPR\b|AGUA POTABLE|SERVICIO SANITARIO RURAL|\bSSR\b|ABASTO DE AGUA|ABASTECIMIENTO DE AGUA')
R_VIA = RX(r'CAMINO|PUENTE|\bRUTA\b|AERODROMO|AEROPUERTO|FERROV|MUELLE|EMBARCADERO|\bRAMPA|BALSA|CONEXION VIAL|BY ?PASS|CARRETERA|CALETA')
R_URB = RX(r'\bCALLE|PASAJE|VEREDA|\bVILLA\b|POBLACION|PLAZA|ACERA|CICLOV|PARADERO|AVENIDA|\bAV\.')
R_FOM = RX(r'FOMENTO|PRODUCTIV|EMPREND|COMPETITIV|COOPERATIV|TURIS|COMERCIALIZ|\bPYME|MIPYME|CAPITAL SEMILLA|AGRICOL|AGRICULT|GANADER|APICOL|\bPESCA|ACUICULT|SERCOTEC|INDAP|ARTESAN|EXPORTA|PRODUCTORES|FERIA|MERCADO|SAG\b|FORESTAL|OVINO|BOVINO|HORTIC|FRUTIC|DIVERSIFICACION|CRECE|SEMILLA|LECHER|AVELLAN|BERRIES|MINERIA')
R_EDU = RX(r'^(REPOSICION|CONSTRUCCION|CONSERVACION|AMPLIACION|MEJORAMIENTO|NORMALIZACION|HABILITACION|ADQUISICION)\b.*\b(LICEO|ESCUELA|COLEGIO|JARDIN|SALA CUNA|INTERNADO|CESFAM|HOSPITAL)')
OUTL = {'via': 200000, 'apr': 100000}
def bip_cat(r):
    t = U(r.EBI_NOMBRE)
    sec = str(r.SEC_CLAVE)
    if R_CTCI.search(t) and not R_EDU.search(t): return 'ctci'
    if R_RES.search(t): return 'res'
    if R_DIG.search(t) or sec == '7': return 'dig'
    if R_ENE.search(t) or sec == '5': return 'ene'
    if R_RIE.search(t): return 'rie'
    if R_APR.search(t): return 'apr'
    if (sec in ('6', '2') or R_VIA.search(t)) and R_VIA.search(t) and not R_URB.search(t): return 'via'
    if sec in ('1', '2', '3', '4') or (R_FOM.search(t) and t.startswith('TRANSFERENCIA')): return 'fom'
    return None
nb = {'tot': len(bp)}
cnt = {}
for r in bp.itertuples():
    cat = bip_cat(r)
    cnt[cat] = cnt.get(cat, 0) + 1
    if not cat: continue
    cm = int(r.cmn) if pd.notna(r.cmn) else 0
    c = CIDX[CUTS[cm]] if cm in CUTS else -1
    m = pd.to_numeric(r.EBI_COSTO_TOTAL, errors='coerce')
    if pd.notna(m) and m / 1000 > OUTL.get(cat, 30000): print('  atípico', cat, r.EBI_NOMBRE[:70], m / 1000); m = np.nan
    fin = str(r.EBI_FUENTES_FINAN)
    add(s='BIP', y=int(r.yr), n=str(r.EBI_NOMBRE).strip().capitalize(), c=c, L=classify(f'{r.EBI_NOMBRE}'), m=round(m / 1000, 1) if pd.notna(m) else None,
        i=str(r.EBI_INS_RESPONSABLE).title(), p=f'{str(r.EBI_ETAPA_POSTULA).capitalize()} · {"FNDR" if "F.N.D.R" in fin else fin.title()}', g=cat,
        a=(str(r.EBI_RATE) if isinstance(r.EBI_RATE, str) else '') + '|' + str(r.EBI_CODIGO))
print('BIP total', nb, cnt)

# ---------- columnar output ----------
SRC = ['ANID', 'CORFO', 'BIP']
df = pd.DataFrame(recs)
print(df.groupby('s').size(), df.groupby('s').m.sum())
print('sin comuna', df[df.c < 0].groupby('s').size())
print('sin lineamiento', df[df.L.map(len) == 0].groupby('s').size())
print(df[df.s == 'BIP'].groupby('g').agg(n=('m', 'size'), mm=('m', 'sum')))
for s in SRC:
    sub = df[df.s == s]
    print(s, {LKEYS[i]: int(sum(i in L for L in sub.L)) for i in range(6)})
# truncated names to keep payload small
fin = {'s': [SRC.index(x) for x in df.s], 'y': df.y.tolist(), 'n': '\n'.join(df.n.str.replace('\n', ' ').str.slice(0, 160)), 'c': df.c.astype(int).tolist(),
       'L': [sum(1 << i for i in L) for L in df.L], 'm': [None if (v is None or (isinstance(v, float) and np.isnan(v))) else v for v in df.m],
       'i': df.i.tolist(), 'p': df.p.tolist(), 'g': df.g.tolist(), 'a': df.a.tolist(),
       'meta': {'y0': Y0, 'src': SRC, 'anidCut': '31-12-2025 (fallos hasta 2026)', 'bipYears': '2019–2027', 'corfoN': int((df.s == 'CORFO').sum())}}
# compress repeated strings: institution & program via lookup tables
for k in ['i', 'p', 'g', 'a']:
    vals = fin[k]
    if k == 'a':
        continue
    u = sorted(set(vals)); idx = {v: j for j, v in enumerate(u)}
    fin[k] = {'v': u, 'x': [idx[v] for v in vals]}
FR['fin'] = fin
js = json.dumps(D, ensure_ascii=False, separators=(',', ':'))
b64 = base64.b64encode(gzip.compress(js.encode(), 9)).decode()
open('intermedios/pack_frpd3.b64', 'w').write(b64)
print('b64 MB', len(b64) / 1e6, 'fin KB', len(json.dumps(fin, ensure_ascii=False)) // 1024)
df.to_pickle('intermedios/fin.pkl')
