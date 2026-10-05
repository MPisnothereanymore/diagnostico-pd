# Radar FRPD Araucanía · script de procesamiento (ver LEEME.md en la carpeta principal)
# Ejecutar desde la carpeta "procesamiento", en modo UTF-8:   python -X utf8 prep_frpd.py
# Rutas: datos de entrada en C:/Users/mpooley/Documents/DB Araucania/ ; paquetes intermedios en ./intermedios/
"""Data pack for the Radar FRPD dashboard (phase 1)."""
import json, gzip, base64, unicodedata, re
import geopandas as gpd
from shapely import coverage_simplify

def norm(s): return unicodedata.normalize('NFD', str(s)).encode('ascii', 'ignore').decode().upper().strip()
D = json.loads(gzip.decompress(base64.b64decode(open('intermedios/pack_tejido_base.b64').read())))
CIDX = {norm(c['l']): i for i, c in enumerate(D['comunas'])}

# ---------------- territorios ERD ----------------
TERR = [
 ('TPLC', 'Temuco – Padre Las Casas', ['TEMUCO', 'PADRE LAS CASAS'], 'Servicios especializados, economía del conocimiento, comercio y agricultura periurbana y hortícola.'),
 ('VCE', 'Valle Central', ['LAUTARO', 'PERQUENCO'], 'Al 2040 fortalecerá la actividad industrial y agroindustrial, propiciada por su conectividad física y digital y el parque industrial; desarrollo agrícola y frutícola con cadenas de valor, innovación, asociatividad y encadenamientos productivos.'),
 ('CSU', 'Cautín Sur', ['FREIRE', 'PITRUFQUEN', 'GORBEA', 'LONCOCHE'], 'Al 2040 se consolidará como polo de desarrollo industrial y agroindustrial impulsado por el cooperativismo y asociativismo, con plantas de proceso para agregar valor, diversificación de cadenas de suministro y comercialización, e infraestructura ferroviaria y aeroportuaria para carga y pasajeros.'),
 ('MNO', 'Malleco Norte', ['ANGOL', 'RENAICO', 'COLLIPULLI', 'ERCILLA'], 'Al 2040 se consolidará como plataforma de servicios y de formación técnico-profesional, diversificando actividades productivas y fortaleciendo rubros tradicionales y su relación interregional; fortalecerá la disponibilidad de recursos hídricos y la protección del medio ambiente.'),
 ('NAH', 'Nahuelbuta', ['PUREN', 'LOS SAUCES', 'TRAIGUEN', 'LUMACO', 'GALVARINO', 'CHOLCHOL'], 'Al 2040 fortalecerá los rubros tradicionales con agregación de valor y sostenibilidad en la actividad forestal, con recuperación de suelos, protección del bosque nativo y del recurso hídrico frente a la sequía, e incorporará nuevas actividades agroproductivas acordes a sus aptitudes climáticas.'),
 ('COS', 'Costa Araucanía', ['CARAHUE', 'NUEVA IMPERIAL', 'SAAVEDRA', 'TEODORO SCHMIDT', 'TOLTEN'], 'Al 2040 la agricultura, la pesca y actividades emergentes como el turismo de intereses especiales, la innovación y la denominación de origen de productos locales se desarrollarán en armonía con el ambiente y la cultura lafkenche, con infraestructura productiva y habilitante, acceso al mar e industria para agregar valor.'),
 ('AND', 'Araucanía Andina', ['VICTORIA', 'LONQUIMAY', 'CURACAUTIN', 'MELIPEUCO', 'VILCUN', 'CUNCO'], 'Al 2040 será un destino turístico consolidado de clase mundial en equilibrio con su capacidad de carga, con conservación del patrimonio natural, conectividad por el corredor bioceánico, revalorización de la cultura pehuenche y la vocación productiva de montaña, con agregación de valor e innovación silvoagropecuaria.'),
 ('LAC', 'Araucanía Lacustre', ['VILLARRICA', 'PUCON', 'CURARREHUE'], 'Al 2040 será reconocida por su desarrollo sustentable y diversificación productiva armónica con el patrimonio y la biodiversidad, protegiendo los cuerpos lacustres y la capacidad de carga; turismo basado en paisaje, naturaleza y deporte aventura, rompiendo la estacionalidad e integrándose a la ruta interlagos y trasandina.'),
]
TPLC_NOTE = 'Objetivo territorial resumido; revisar texto completo en la ERD (Tabla 29).'
PRC_SIN = {'ERCILLA', 'TEODORO SCHMIDT', 'VILCUN', 'CUNCO', 'MELIPEUCO', 'PUREN', 'GALVARINO', 'LUMACO', 'CHOLCHOL', 'LOS SAUCES', 'PERQUENCO', 'CURARREHUE'}
for t in TERR:
    for c in t[2]: assert c in CIDX, c
assert sum(len(t[2]) for t in TERR) == 32

DEM = 'C:/Users/mpooley/Documents/DB Araucania/Ámbito Demográfico (formato shapefile)-20260908T202616Z-1-001/Ámbito Demográfico (formato shapefile)/'
com = gpd.read_file(DEM + 'Censo 2024 Región de La Araucanía SHP_R09/Comunal.shp', encoding='utf-8').to_crs(32718).sort_values('CUT').reset_index(drop=True)
minx, miny, maxx, maxy = com.total_bounds; S = 1000.0 / (maxx - minx)
com['key'] = com.N_COMUNA.map(norm)
tmap = {c: t[0] for t in TERR for c in t[2]}
com['terr'] = com.key.map(tmap)
com['geometry'] = coverage_simplify(com.geometry.values, tolerance=180)
terr_geo = com.dissolve('terr')
def ring_d(coords):
    pts = [(round((x - minx) * S, 1), round((maxy - y) * S, 1)) for x, y, *r in coords]; out = [pts[0]]
    for p in pts[1:]:
        if p != out[-1]: out.append(p)
    return 'M' + 'L'.join(f'{x:g},{y:g}' for x, y in out) + 'Z'
def poly_d(g):
    ps = [g] if g.geom_type == 'Polygon' else list(g.geoms)
    return ''.join(ring_d(p.exterior.coords) + ''.join(ring_d(r.coords) for r in p.interiors) for p in ps if p.area * S * S >= 2)
terr_out = []
for k, name, coms, obj in TERR:
    g = terr_geo.loc[k].geometry
    lp = g.representative_point() if k != 'TPLC' else g.centroid
    ids = [CIDX[c] for c in coms]
    terr_out.append({'k': k, 'n': name, 'c': ids, 'obj': obj, 'd': poly_d(g), 'lx': round((lp.x - minx) * S, 1), 'ly': round((maxy - lp.y) * S, 1),
                     'pop': sum(D['comunas'][i]['pop'] for i in ids), 'pop17': sum(D['comunas'][i]['pop17'] for i in ids),
                     'km2': round(sum(D['comunas'][i]['km2'] for i in ids), 1), 'prcSin': [i for i in ids if norm(D['comunas'][i]['l']) in PRC_SIN],
                     'ci': sum(D['comunas'][i]['ci'] for i in ids)})
for c in D['comunas']: c['prc'] = 0 if norm(c['l']) in PRC_SIN else 1

# ---------------- lineamientos CTCI (provisional sector correspondence) ----------------
SUBL = {s['l']: i for i, s in enumerate(D['subs'])}
def subs_by_prefix(prefixes):
    out = []
    for p in prefixes:
        m = [i for l, i in SUBL.items() if l.lower().startswith(p.lower())]
        assert m, p
        out += m
    return sorted(set(out))
LIN = [
 ('L1', 'Cambio climático, resiliencia territorial y gestión hídrica', 'Sectores cuya producción depende del agua y el clima, y servicios de agua y saneamiento.',
  ['Actividades de apoyo a la agricultura', 'Acuicultura', 'Cultivo de plantas no perennes', 'Cultivo de plantas perennes', 'Cultivo de productos agricolas en combinacion', 'Ganaderia', 'Propagacion de plantas', 'Silvicultura y otras', 'Captacion, tratamiento', 'Evacuacion de aguas residuales']),
 ('L2', 'Biotecnología y productividad', 'Producción silvoagropecuaria y acuícola, genética animal y vegetal, química y farmacéutica, I+D en ciencias naturales.',
  ['Actividades de apoyo a la agricultura', 'Acuicultura', 'Cultivo de plantas no perennes', 'Cultivo de plantas perennes', 'Cultivo de productos agricolas en combinacion', 'Ganaderia', 'Propagacion de plantas', 'Recoleccion de productos forestales', 'Silvicultura y otras', 'Actividades veterinarias', 'Fabricacion de productos farmaceuticos', 'Fabricacion sustancias quimicas basicas', 'Fabricacion de otros productos quimicos', 'Investigaciones y desarrollo experimental en el campo de las ciencias naturales']),
 ('L3', 'Alimentación saludable y sostenibilidad productiva', 'Cadena alimentaria: producción primaria, pesca y elaboración de alimentos y bebidas.',
  ['Acuicultura', 'Pesca', 'Cultivo de plantas no perennes', 'Cultivo de plantas perennes', 'Cultivo de productos agricolas en combinacion', 'Ganaderia', 'Elaboracion de aceites', 'Elaboracion de bebidas', 'Elaboracion de otros productos alimenticios', 'Elaboracion de productos de molineria', 'Elaboracion de productos lacteos', 'Elaboracion y conservacion de carne', 'Elaboracion y conservacion de frutas', 'Elaboracion y conservacion de pescado']),
 ('L4', 'Transición energética y descarbonización', 'Generación y distribución de energía, equipos e instalaciones eléctricas, y biomasa y leña.',
  ['Generacion, transmision', 'Suministro de vapor', 'Fabricacion de gas', 'Fabricacion de motores, generadores', 'Fabricacion de otros tipos de equipo electrico', 'Instalaciones electricas', 'Extraccion de madera', 'Aserrado y acepilladura', 'Fabricacion de productos de madera']),
 ('L5', 'Economía circular y valorización de recursos', 'Gestión y valorización de residuos, reparación, y sectores generadores de residuos y subproductos (forestal, frutícola, alimentos, pesca).',
  ['Recogida de desechos', 'Tratamiento y eliminacion de desechos', 'Recuperacion de materiales', 'Actividades de descontaminacion', 'Reparacion de productos elaborados de metal', 'Reparacion de computadores', 'Reparacion de efectos personales', 'Cultivo de plantas perennes', 'Extraccion de madera', 'Aserrado y acepilladura', 'Elaboracion de otros productos alimenticios', 'Elaboracion y conservacion de frutas', 'Pesca', 'Elaboracion y conservacion de pescado']),
 ('L6', 'Digitalización e inteligencia artificial para la productividad', 'Proveedores de servicios digitales y telecomunicaciones (oferta regional de digitalización).',
  ['Actividades de programacion informatica', 'Edicion de programas informaticos', 'Procesamiento de datos', 'Otras actividades de servicios de informacion', 'Actividades de telecomunicaciones alambricas', 'Actividades de telecomunicaciones inalambricas', 'Actividades de telecomunicaciones por satelite', 'Otras actividades de telecomunicaciones', 'Reparacion de computadores']),
]
lin_out = [{'k': k, 'n': n, 'desc': d, 'subs': subs_by_prefix(p)} for k, n, d, p in LIN]

# ---------------- ERD catalog ----------------
t = open('entradas/erd_2040_texto.txt').read().replace('\u0002', '')
oes = {}
for m in re.finditer(r'Objetivo Estratégico Regional (\d\.\d+)\s*\n(.*?)(?=\nObjetivo Estratégico Regional|\nLER \d|\nLos \d+ objetivos|\n\n)', t, re.S):
    oes.setdefault(m.group(1), re.sub(r'\s+', ' ', m.group(2)).strip())
LERN = {1: 'Identidad regional', 2: 'Ordenamiento territorial y sustentabilidad', 3: 'Bienestar social y equidad territorial', 4: 'Institucionalidad y gobernanza', 5: 'Competitividad y dinamización productiva', 6: 'Movilidad y conectividad física y digital'}
focos = [re.sub(r'\s+', ' ', m.group(1)).strip() for m in re.finditer(r'FOCO\s*\n(.*?)\n\s*\n', t, re.S)][:6]
ler_out = [{'k': i, 'n': LERN[i], 'foco': focos[i - 1], 'oe': [{'k': k, 't': v} for k, v in sorted(oes.items(), key=lambda kv: float(kv[0])) if k.startswith(f'{i}.')]} for i in range(1, 7)]
LER5L = [('5.1', 'L1', 'Dinamización y diversificación productiva'), ('5.1', 'L2', 'Sector silvoagropecuario'), ('5.1', 'L3', 'Sector construcción'), ('5.1', 'L4', 'Pesca y acuicultura'), ('5.1', 'L5', 'Sector comercio y servicios'), ('5.1', 'L6', 'Economía tradicional con identidad cultural'), ('5.1', 'L7', 'Patrimonio genético de productos locales'), ('5.1', 'L8', 'Sellos de origen'), ('5.2', 'L9', 'Infraestructura y equipamiento productivo'), ('5.2', 'L10', 'Acumulación, sistemas de riego y eficiencia hídrica'), ('5.2', 'L11', 'Parques industriales y tecnológicos'), ('5.2', 'L12', 'Infraestructura para las exportaciones'), ('5.3', 'L13', 'Canales de comercialización'), ('5.3', 'L14', 'Comercio electrónico'), ('5.3', 'L15', 'Circuitos cortos de comercialización'), ('5.3', 'L16', 'Internacionalización de productos y servicios'), ('5.4', 'L17', 'Planificación turismo'), ('5.4', 'L18', 'Promoción turística'), ('5.4', 'L19', 'Desarrollo turístico'), ('5.5', 'L20', 'Capital humano calificado'), ('5.5', 'L21', 'Fortalecimiento del empleo'), ('5.6', 'L22', 'Coordinación interinstitucional'), ('5.6', 'L23', 'Formalización'), ('5.6', 'L24', 'Competitividad'), ('5.6', 'L25', 'Asociatividad y organización empresarial'), ('5.6', 'L26', 'Inversión privada nacional e IED'), ('5.7', 'L27', 'Ciencia, tecnología, conocimiento e innovación'), ('5.7', 'L28', 'Transformación digital y nuevas tecnologías'), ('5.8', 'L29', 'Sectores y actividades emergentes'), ('5.8', 'L30', 'Industrias creativas'), ('5.8', 'L31', 'Eficiencia energética y energías renovables')]
print('OE count', sum(len(l['oe']) for l in ler_out))

# ---------------- D.S. 1.699 catalog ----------------
ART8 = [
 ('1', 'Fomento de actividades productivas', 'Iniciativas que amplían directamente las capacidades productivas de empresas, industrias o sectores, especialmente desde la incorporación de conocimiento, adopción de tecnologías, innovación empresarial y emprendimiento.', [
   ('1a', 'Convenios con instituciones públicas de competitividad (SERCOTEC, CORFO, INDESPA, SERNATUR, INDAP, entre otras)'),
   ('1b', 'Actividades que mejoren la productividad de las empresas, individual o asociativamente'),
   ('1c', 'Acciones para apoyar a sectores económicos rezagados dentro de la región'),
   ('1d', 'Proyectos regionales que contribuyan a una mayor eficiencia hídrica'),
   ('1e', 'Proyectos que contribuyan a una mayor eficiencia en el uso de recursos naturales'),
   ('1f', 'Infraestructura para la adaptación al cambio climático'),
   ('1g', 'Innovación empresarial a través de servicios públicos o entidades privadas sin fines de lucro'),
   ('1h', 'Emprendimiento: entidades públicas o privadas sin fines de lucro enfocadas en desafíos complejos con espacio para crecer')]),
 ('2', 'Fomento de actividades de desarrollo regional', 'Acciones, competencias y capacidades locales que habilitan el desarrollo productivo de los territorios, la innovación pública y el emprendimiento.', [
   ('2a', 'Infraestructura pública y estudios habilitantes de conectividad usada por sectores productivos (carreteras, puentes, puertos, aeropuertos, ferrocarriles)'),
   ('2b', 'Inversiones habilitantes que contribuyan a la descarbonización'),
   ('2c', 'Inversiones habilitantes para reducir o reutilizar desperdicios (economía circular) y tratar pasivos ambientales'),
   ('2d', 'Planificación territorial, plan de desarrollo logístico y planes estratégicos de energía regional (PEER)'),
   ('2e', 'Gestión y operación de los Comités de Desarrollo Productivo y de CTCI regionales'),
   ('2f', 'Convenios para elaborar o actualizar la Estrategia Regional de Desarrollo'),
   ('2g', 'Bienes públicos y capacidades habilitantes (tecnológicas, institucionales y humanas) para el desarrollo productivo'),
   ('2h', 'Innovación pública con impacto en el ámbito productivo'),
   ('2i', 'Iniciativas asociadas con la Estrategia Regional de Desarrollo')]),
 ('3', 'Promoción de la investigación científica y tecnológica', 'CTCI aplicada para resolver problemas del sector productivo. Debe recibir al menos el 25% del fondo (art. 7).', [
   ('3a', 'Investigación aplicada al ámbito productivo'),
   ('3b.i', 'Innovación de base científico-tecnológica aplicada al ámbito productivo'),
   ('3b.ii', 'Innovación social en el ámbito productivo'),
   ('3c', 'Desarrollo experimental'),
   ('3d', 'Transferencia tecnológica vinculada al ámbito productivo')]),
]
GASTOS = [('i', 'Infraestructura y equipamiento científico para instituciones de educación superior de la región acreditadas (4 años o más)'),
 ('ii', 'Capacidades tecnológicas y equipamiento multiuso para I+D, innovación, emprendimiento y competitividad'),
 ('iii', 'Formación de capital humano avanzado: postgrado en Chile con retribución regional, en sectores estratégicos de la ERD'),
 ('iv', 'Convenios con instituciones de educación superior acreditadas para atraer talento académico en sectores estratégicos de la ERD'),
 ('v', 'Fondos concursables de investigación en sectores estratégicos de la ERD'),
 ('vi', 'Traspaso de recursos a Centros Regionales ANID mediante convenio'),
 ('vii', 'Proyectos del Financiamiento Estructural I+D+i Universitario Territorial y de Frontera (MinCiencia)'),
 ('viii', 'Instrumentos de ANID en la región, desde formación de capacidades hasta centros tecnológicos'),
 ('ix', 'I+D y transferencia de Institutos Tecnológicos Públicos (INIA, ISP, SERNAGEOMIN, IFOP u otros)'),
 ('x', 'Instrumentos de CORFO que promueven I+D y transferencia tecnológica')]
ART10 = ['Remuneraciones distintas de los gastos de administración del art. 9 (tope 5% del fondo)', 'Programas de empleo público', 'Programas de vivienda',
 'Compra o arriendo de vehículos, salvo que sean parte imprescindible de un proyecto del art. 8', 'Construcción o mejoramiento de espacios públicos que no formen parte de un proyecto del art. 8',
 'Congresos, seminarios, eventos masivos, conciertos y similares']
EJEC = [('Instituciones públicas', 'Arts. 11 y 15', 'Habilitadas sin autorización adicional si tienen funciones de fomento productivo, desarrollo regional o investigación. Los municipios reciben transferencias del GORE.'),
 ('Educación superior', 'Arts. 11 y 13', 'Públicas acreditadas por 4 años o más quedan habilitadas; las privadas, además, deben estar en la resolución conjunta.'),
 ('Privadas sin fines de lucro', 'Arts. 12–14', 'Solo las incluidas en la resolución conjunta de las Subsecretarías de Economía y de CTCI (visada por DIPRES): 2 años o más de antigüedad, experiencia y sin prohibición de contratar con el Estado. Deben concursar.')]

# ---------------- cartera minuta FRPD ----------------
LINES = [
 ('L-01', 'Red regional de extensionismo tecnológico', 'A', [5, 4], ['L6', 'L2'], ['2g', '2e'], ['vi', 'vii'], 'TODOS', '3',
  'Arquitectura permanente que baje la oferta científica regional a la demanda productiva de los siete territorios fuera de Temuco: nodos con contraparte técnica estable, convenio con un Centro Regional ANID y programa universitario territorial.',
  'No existe arquitectura de extensionismo: seis de ocho territorios generan valor exportable sin contraparte científica local; la capacidad se concentra en Temuco (BIOREN UFRO, CGNA, Incubatec).'),
 ('L-02', 'Capacidad de formulación y gobernanza territorial', 'A', [3, 4], [], ['2d', '2e', '2g'], [], 'NAH,COS', '3',
  'Unidades municipales de proyectos y gobernanza con comunidades en los territorios con menor capacidad de formulación, y cierre de la brecha de planificación comunal.',
  '12 de 32 comunas sin Plan Regulador Comunal vigente; Nahuelbuta concentra 5 de 6. Asignar solo por calidad de cartera amplía la brecha que la ERD manda cerrar.'),
 ('L-03', 'Capital humano avanzado con retribución regional', 'A', [5, 4], ['T'], [], ['iii', 'iv'], 'REGIONAL', '2',
  'Becas de postgrado en Chile con obligación de retribución en la región y convenios con universidades para atraer talento en áreas definidas por la ERD.',
  'La fuga de capital humano avanzado es una brecha transversal; el mecanismo existe en el reglamento y no está operando.'),
 ('L-04', 'Laboratorio regional de calidad de aguas', 'B', [2], ['L1'], [], ['ii'], 'TPLC', '3',
  'Capacidad regional de análisis de calidad de aguas (equipamiento multiuso, acreditación, operación) con datos abiertos.',
  '83 de las 236 estaciones vigentes de la DGA en la región son de calidad de aguas: la brecha es de laboratorio, no de instrumentación.'),
 ('L-05', 'Contraparte técnica de cuenca y cierre de vacíos de monitoreo', 'B', [2, 4], ['L1'], ['2d', '2e', '3a'], [], 'COS,CSU,MNO', '3',
  'Instancia técnica regional que traduzca los Planes Estratégicos de Gestión Hídrica a cartera de inversión y cierre los vacíos de medición.',
  'Cinco de ocho territorios se reparten entre dos o más cuencas; Queule y las franjas costeras suman 1.050 km² sin estaciones.'),
 ('L-06', 'Recuperación de suelos y seguridad hídrica productiva', 'B', [2, 5], ['L1'], ['3a', '3b.ii'], [], 'NAH,VCE,AND', '3',
  'Investigación aplicada y transferencia en recuperación de suelos degradados y seguridad hídrica para riego donde erosión y déficit coinciden con producción.',
  'Disponibilidad hídrica proyectada −14,2% al 2050; erosión severa en cordones andinos y costeros; laboratorio de suelos de INIA Carillanca disponible.'),
 ('L-07', 'Capacidad de carga y calidad de sistemas lacustres', 'B', [2, 5], ['L1'], ['3a'], ['ii', 'iv'], 'LAC', '3',
  'Línea base e instrumento permanente de medición de capacidad de carga turística y calidad lacustre, con atracción de talento en sustentabilidad turística.',
  'El lago Villarrica tiene norma secundaria desde 2013 y eutroficación documentada; no hay línea base de capacidad de carga.'),
 ('L-08', 'Infraestructura de poscosecha y procesamiento de alimentos', 'C', [5], ['L3'], ['3c', '3a'], ['ii'], 'VCE,CSU,MNO,COS,TPLC', '3',
  'Equipamiento multiusuario para agregar valor: planta piloto y laboratorio de alimentos, poscosecha frutícola y de frutos secos, productos del mar y tubérculos.',
  'El Parque Industrial y Tecnológico (430 ha) no tiene componente de I+D; Valle Central y Malleco Norte tienen masa crítica alta y capacidad científica baja.'),
 ('L-09', 'Biotecnología aplicada a cultivos, semilla y genética', 'C', [5], ['L2'], ['3c', '3d'], ['vi', 'i', 'ii'], 'TPLC,VCE,CSU,COS,NAH', '3',
  'Desarrollo experimental y transferencia en proteína vegetal, papa-semilla, cultivo de tejidos, mejoramiento genético ganadero y propagación de nativas.',
  'Capacidad instalada en Temuco poco usada por el resto: BIOREN, CGNA (Centro Regional ANID), INIA Carillanca.'),
 ('L-10', 'Alimentos con identidad territorial', 'C', [1, 5], ['L3'], ['3c', '3d', '3b.ii'], [], 'AND,LAC,NAH', '2',
  'Valor agregado y diferenciación para productos con identidad de origen: montaña, gastronomía, legumbres, cereales y bebidas.',
  'Tres territorios con vocación oficial en esta línea y sin capacidad científica dedicada; es el puente para financiar el LER 1 vía innovación social (3b.ii).'),
 ('L-11', 'Valorización de residuos y subproductos', 'C', [2, 5], ['L5'], ['3c', '3a', '2h'], [], 'TODOS', '2–3',
  'Desarrollo experimental para transformar residuos y descartes en producto (biomasa forestal, avellana, descarte frutícola, cereales, pesca) e innovación pública en residuos.',
  'Presente en los ocho territorios; la oportunidad está identificada, pero falta caracterizar volumen y tipo de residuo.'),
 ('L-12', 'Transición energética con captura de valor local', 'D', [2, 5], ['L4'], ['3a', '3c', '2d', '2g', '2h'], [], 'MNO,TPLC,NAH,COS', '2–3',
  'Investigación aplicada y desarrollo experimental para que la generación renovable se traduzca en capacidad productiva local: biomasa, calefacción, biocombustibles sólidos, frío renovable para la pesca.',
  'Renaico tiene 9 parques eólicos aprobados (294 aerogeneradores) y 2 solares en evaluación: Malleco Norte soporta la carga ambiental sin capturar el valor.'),
 ('L-13', 'Digitalización productiva y trazabilidad', 'D', [6, 5], ['L6'], ['2g', '3d'], [], 'COS,LAC,CSU,AND,VCE,NAH', '1–3',
  'Herramientas digitales aplicadas a la producción: apoyo técnico agrícola, trazabilidad frutícola, digitalización de pymes turísticas, agricultura de precisión.',
  'Las 993 antenas autorizadas siguen la Ruta 5 y dejan vacíos de cordillera y costa; existe una app agrícola validada en Costa Araucanía.'),
 ('L-14', 'Vocaciones oficiales sin capacidad CTCI mapeada', 'D', [1, 5], ['L2', 'L6'], [], [], 'AND,MNO,NAH,TPLC,LAC', '1',
  'Encargo de levantamiento, no de inversión: verificar si existe capacidad CTCI en industrias creativas, servicios y formalización del comercio, y productos forestales no madereros.',
  'Tres vocaciones oficiales de la ERD sin capacidad CTCI mapeada en la región.'),
]
ENTRIES = [('L-01', 'TPLC', 'L6', 3), ('L-04', 'TPLC', 'L1', 3), ('L-05', 'COS', 'L1', 3), ('L-05', 'CSU', 'L1', 2), ('L-05', 'MNO', 'L1', 2),
 ('L-06', 'AND', 'L1', 3), ('L-06', 'VCE', 'L1', 2), ('L-06', 'NAH', 'L1', 3), ('L-07', 'LAC', 'L1', 3),
 ('L-08', 'VCE', 'L3', 3), ('L-08', 'CSU', 'L3', 3), ('L-08', 'COS', 'L3', 3), ('L-08', 'MNO', 'L3', 3), ('L-08', 'TPLC', 'L3', 2),
 ('L-09', 'TPLC', 'L2', 3), ('L-09', 'VCE', 'L2', 3), ('L-09', 'CSU', 'L2', 2), ('L-09', 'COS', 'L2', 2), ('L-09', 'NAH', 'L2', 1),
 ('L-10', 'AND', 'L3', 2), ('L-10', 'LAC', 'L3', 2), ('L-10', 'NAH', 'L3', 2),
 ('L-11', 'NAH', 'L5', 3), ('L-11', 'CSU', 'L5', 3), ('L-11', 'MNO', 'L5', 2), ('L-11', 'TPLC', 'L5', 2), ('L-11', 'VCE', 'L5', 2), ('L-11', 'COS', 'L5', 2), ('L-11', 'AND', 'L5', 1), ('L-11', 'LAC', 'L5', 1),
 ('L-12', 'MNO', 'L4', 3), ('L-12', 'TPLC', 'L4', 2), ('L-12', 'NAH', 'L4', 2), ('L-12', 'COS', 'L4', 2),
 ('L-13', 'COS', 'L6', 3), ('L-13', 'LAC', 'L6', 2), ('L-13', 'CSU', 'L6', 2), ('L-13', 'AND', 'L6', 1), ('L-13', 'VCE', 'L6', 1), ('L-13', 'NAH', 'L6', 1),
 ('L-14', 'AND', 'L2', 1), ('L-14', 'MNO', 'L6', 1)]
assert len(ENTRIES) == 42 and len({(e[1], e[2]) for e in ENTRIES}) == 42
BLOQUES = {'A': 'Habilitantes', 'B': 'Agua, suelo y clima', 'C': 'Bioeconomía y valor agregado', 'D': 'Energía, conectividad y digitalización'}
lines_out = [{'k': k, 'n': n, 'b': b, 'ler': ler, 'ctci': ct, 'a8': a8, 'g': g, 'terr': terr, 'mad': mad, 'que': que, 'ev': ev} for k, n, b, ler, ct, a8, g, terr, mad, que, ev in LINES]
entries_out = [{'l': l, 't': t_, 'c': c, 'm': m} for l, t_, c, m in ENTRIES]

D['FRPD'] = {'terr': terr_out, 'lin': lin_out, 'ler': ler_out, 'ler5l': [{'oe': a, 'k': b, 'n': c} for a, b, c in LER5L],
             'art8': [{'k': k, 'n': n, 'd': d, 'items': [{'k': a, 'n': b} for a, b in it]} for k, n, d, it in ART8], 'gastos': [{'k': a, 'n': b} for a, b in GASTOS],
             'art10': ART10, 'ejec': [{'n': a, 'a': b, 'd': c} for a, b, c in EJEC], 'lines': lines_out, 'entries': entries_out, 'bloques': BLOQUES, 'tplcNote': TPLC_NOTE}
js = json.dumps(D, ensure_ascii=False, separators=(',', ':'))
b64 = base64.b64encode(gzip.compress(js.encode(), 9)).decode()
open('intermedios/pack_frpd.b64', 'w').write(b64)
print('b64 MB', len(b64) / 1e6, 'terr pops', [(t['k'], t['pop']) for t in terr_out], sum(t['pop'] for t in terr_out))
print({l['k']: len(l['subs']) for l in lin_out})
