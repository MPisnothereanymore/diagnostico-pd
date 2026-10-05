import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

out_dir = r"c:\Users\mpooley\Desktop\workshop\Dashboard Radar FRPD Araucanía"
out_file = os.path.join(out_dir, "CARTERA_INICIATIVAS_FRPD_DIFOI_2026.xlsx")

wb = openpyxl.Workbook()

# Sheets
ws_cartera = wb.active
ws_cartera.title = "1. Cartera_Iniciativas_Viva"

ws_lineas = wb.create_sheet(title="2. Lineas_Estrategicas_FRPD")
ws_orgs = wb.create_sheet(title="3. Organismos_MercadoPublico")
ws_kpis = wb.create_sheet(title="4. Resumen_Ejecutivo")

# Data definitions
TERR_INFO = {
    'TPLC': ('Temuco – Padre Las Casas', 'Temuco, Padre Las Casas'),
    'VCE': ('Valle Central', 'Lautaro, Perquenco'),
    'CSU': ('Cautín Sur', 'Freire, Pitrufquén, Gorbea, Loncoche'),
    'MNO': ('Malleco Norte', 'Angol, Renaico, Collipulli, Ercilla'),
    'NAH': ('Nahuelbuta', 'Purén, Los Sauces, Traiguén, Lumaco, Galvarino, Cholchol'),
    'COS': ('Costa Araucanía', 'Carahue, Nueva Imperial, Saavedra, Teodoro Schmidt, Toltén'),
    'AND': ('Araucanía Andina', 'Victoria, Lonquimay, Curacautín, Melipeuco, Vilcún, Cunco'),
    'LAC': ('Araucanía Lacustre', 'Villarrica, Pucón, Curarrehue')
}

LIN_INFO = {
    'L1': 'Clima y agua',
    'L2': 'Biotecnología',
    'L3': 'Alimentación',
    'L4': 'Energía',
    'L5': 'Economía circular',
    'L6': 'Digitalización'
}

BLOQUES = {
    'A': 'Habilitantes',
    'B': 'Agua, suelo y clima',
    'C': 'Bioeconomía y valor agregado',
    'D': 'Energía, conectividad y digitalización'
}

LINES_DATA = [
    ('L-01', 'Red regional de extensionismo tecnológico', 'A', 'TODOS', 'vi, vii, 2g, 2e',
     'Arquitectura permanente que baje la oferta científica regional a la demanda productiva de los siete territorios fuera de Temuco: nodos con contraparte técnica estable, convenio con un Centro Regional ANID y programa universitario territorial.',
     'No existe arquitectura de extensionismo: seis de ocho territorios generan valor exportable sin contraparte científica local; la capacidad se concentra en Temuco (BIOREN UFRO, CGNA, Incubatec).'),
    ('L-02', 'Capacidad de formulación y gobernanza territorial', 'A', 'NAH, COS', '2d, 2e, 2g',
     'Unidades municipales de proyectos y gobernanza con comunidades en los territorios con menor capacidad de formulación, y cierre de la brecha de planificación comunal.',
     '12 de 32 comunas sin Plan Regulador Comunal vigente; Nahuelbuta concentra 5 de 6. Asignar solo por calidad de cartera amplía la brecha que la ERD manda cerrar.'),
    ('L-03', 'Capital humano avanzado con retribución regional', 'A', 'REGIONAL', 'iii, iv',
     'Becas de postgrado en Chile con obligación de retribución en la región y convenios con universidades para atraer talento en áreas definidas por la ERD.',
     'La fuga de capital humano avanzado es una brecha transversal; el mecanismo existe en el reglamento y no está operando.'),
    ('L-04', 'Laboratorio regional de calidad de aguas', 'B', 'TPLC', 'ii',
     'Capacidad regional de análisis de calidad de aguas (equipamiento multiuso, acreditación, operación) con datos abiertos.',
     '83 de las 236 estaciones vigentes de la DGA en la región son de calidad de aguas: la brecha es de laboratorio, no de instrumentación.'),
    ('L-05', 'Contraparte técnica de cuenca y cierre de vacíos de monitoreo', 'B', 'COS, CSU, MNO', '2d, 2e, 3a',
     'Instancia técnica regional que traduzca los Planes Estratégicos de Gestión Hídrica a cartera de inversión y cierre los vacíos de medición.',
     'Cinco de ocho territorios se reparten entre dos o más cuencas; Queule y las franjas costeras suman 1.050 km² sin estaciones.'),
    ('L-06', 'Recuperación de suelos y seguridad hídrica productiva', 'B', 'NAH, VCE, AND', '3a, 3b.ii',
     'Investigación aplicada y transferencia en recuperación de suelos degradados y seguridad hídrica para riego donde erosión y déficit coinciden con producción.',
     'Disponibilidad hídrica proyectada −14,2% al 2050; erosión severa en cordones andinos y costeros; laboratorio de suelos de INIA Carillanca disponible.'),
    ('L-07', 'Capacidad de carga y calidad de sistemas lacustres', 'B', 'LAC', '3a, ii, iv',
     'Línea base e instrumento permanente de medición de capacidad de carga turística y calidad lacustre, con atracción de talento en sustentabilidad turística.',
     'El lago Villarrica tiene norma secundaria desde 2013 y eutroficación documentada; no hay línea base de capacidad de carga.'),
    ('L-08', 'Infraestructura de poscosecha y procesamiento de alimentos', 'C', 'VCE, CSU, MNO, COS, TPLC', '3c, 3a, ii',
     'Equipamiento multiusuario para agregar valor: planta piloto y laboratorio de alimentos, poscosecha frutícola y de frutos secos, productos del mar y tubérculos.',
     'El Parque Industrial y Tecnológico (430 ha) no tiene componente de I+D; Valle Central y Malleco Norte tienen masa crítica alta y capacidad científica baja.'),
    ('L-09', 'Biotecnología aplicada a cultivos, semilla y genética', 'C', 'TPLC, VCE, CSU, COS, NAH', '3c, 3d, vi, i, ii',
     'Desarrollo experimental y transferencia en proteína vegetal, papa-semilla, cultivo de tejidos, mejoramiento genético ganadero y propagación de nativas.',
     'Capacidad instalada en Temuco poco usada por el resto: BIOREN, CGNA (Centro Regional ANID), INIA Carillanca.'),
    ('L-10', 'Alimentos con identidad territorial', 'C', 'AND, LAC, NAH', '3c, 3d, 3b.ii',
     'Valor agregado y diferenciación para productos con identidad de origen: montaña, gastronomía, legumbres, cereales y bebidas.',
     'Tres territorios con vocación oficial en esta línea y sin capacidad científica dedicada; es el puente para financiar el LER 1 vía innovación social (3b.ii).'),
    ('L-11', 'Valorización de residuos y subproductos', 'C', 'TODOS', '3c, 3a, 2h',
     'Desarrollo experimental para transformar residuos y descartes en producto (biomasa forestal, avellana, descarte frutícola, cereales, pesca) e innovación pública en residuos.',
     'Presente en los ocho territorios; la oportunidad está identificada, pero falta caracterizar volumen y tipo de residuo.'),
    ('L-12', 'Transición energética con captura de valor local', 'D', 'MNO, TPLC, NAH, COS', '3a, 3c, 2d, 2g, 2h',
     'Investigación aplicada y desarrollo experimental para que la generación renovable se traduzca en capacidad productiva local: biomasa, calefacción, biocombustibles sólidos, frío renovable para la pesca.',
     'Renaico tiene 9 parques eólicos aprobados (294 aerogeneradores) y 2 solares en evaluación: Malleco Norte soporta la carga ambiental sin capturar el valor.'),
    ('L-13', 'Digitalización productiva y trazabilidad', 'D', 'COS, LAC, CSU, AND, VCE, NAH', '2g, 3d',
     'Herramientas digitales aplicadas a la producción: apoyo técnico agrícola, trazabilidad frutícola, digitalización de pymes turísticas, agricultura de precisión.',
     'Las 993 antenas autorizadas siguen la Ruta 5 y dejan vacíos de cordillera y costa; existe una app agrícola validada en Costa Araucanía.'),
    ('L-14', 'Vocaciones oficiales sin capacidad CTCI mapeada', 'D', 'AND, MNO, NAH, TPLC, LAC', 'Levantamiento CTCI',
     'Encargo de levantamiento, no de inversión: verificar si existe capacidad CTCI en industrias creativas, servicios y formalización del comercio, y productos forestales no madereros.',
     'Tres vocaciones oficiales de la ERD sin capacidad CTCI mapeada en la región.')
]
LINES_MAP = {l[0]: l for l in LINES_DATA}

ENTRIES = [
    ('L-01', 'TPLC', 'L6', 3), ('L-04', 'TPLC', 'L1', 3), ('L-05', 'COS', 'L1', 3), 
    ('L-05', 'CSU', 'L1', 2), ('L-05', 'MNO', 'L1', 2), ('L-06', 'AND', 'L1', 3), 
    ('L-06', 'VCE', 'L1', 2), ('L-06', 'NAH', 'L1', 3), ('L-07', 'LAC', 'L1', 3),
    ('L-08', 'VCE', 'L3', 3), ('L-08', 'CSU', 'L3', 3), ('L-08', 'COS', 'L3', 3), 
    ('L-08', 'MNO', 'L3', 3), ('L-08', 'TPLC', 'L3', 2), ('L-09', 'TPLC', 'L2', 3), 
    ('L-09', 'VCE', 'L2', 3), ('L-09', 'CSU', 'L2', 2), ('L-09', 'COS', 'L2', 2), 
    ('L-09', 'NAH', 'L2', 1), ('L-10', 'AND', 'L3', 2), ('L-10', 'LAC', 'L3', 2), 
    ('L-10', 'NAH', 'L3', 2), ('L-11', 'NAH', 'L5', 3), ('L-11', 'CSU', 'L5', 3), 
    ('L-11', 'MNO', 'L5', 2), ('L-11', 'TPLC', 'L5', 2), ('L-11', 'VCE', 'L5', 2), 
    ('L-11', 'COS', 'L5', 2), ('L-11', 'AND', 'L5', 1), ('L-11', 'LAC', 'L5', 1),
    ('L-12', 'MNO', 'L4', 3), ('L-12', 'TPLC', 'L4', 2), ('L-12', 'NAH', 'L4', 2), 
    ('L-12', 'COS', 'L4', 2), ('L-13', 'COS', 'L6', 3), ('L-13', 'LAC', 'L6', 2), 
    ('L-13', 'CSU', 'L6', 2), ('L-13', 'AND', 'L6', 1), ('L-13', 'VCE', 'L6', 1), 
    ('L-13', 'NAH', 'L6', 1), ('L-14', 'AND', 'L2', 1), ('L-14', 'MNO', 'L6', 1)
]

# Estilos ejecutivos
font_title = Font(name="Calibri", size=14, bold=True, color="1F4E78")
font_sub = Font(name="Calibri", size=10, italic=True, color="595959")
font_header = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
font_bold = Font(name="Calibri", size=10, bold=True)
font_regular = Font(name="Calibri", size=10)

fill_primary = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
fill_accent = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
fill_zebra = PatternFill(start_color="F9FAFB", end_color="F9FAFB", fill_type="solid")
fill_warn = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid")
fill_ok = PatternFill(start_color="E2EFDA", end_color="E2EFDA", fill_type="solid")

thin_border_side = Side(border_style="thin", color="D9D9D9")
thin_border = Border(left=thin_border_side, right=thin_border_side, top=thin_border_side, bottom=thin_border_side)
thick_bottom = Border(bottom=Side(border_style="medium", color="1F4E78"), left=thin_border_side, right=thin_border_side, top=thin_border_side)

align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)
align_left = Alignment(horizontal="left", vertical="center", wrap_text=True)
align_right = Alignment(horizontal="right", vertical="center")

# ----------------- HOJA 1: CARTERA INICIATIVAS VIVA -----------------
ws_cartera.views.sheetView[0].showGridLines = True
ws_cartera.append(["CARTERA DE INICIATIVAS DE DESARROLLO Y PRODUCTIVIDAD — DIFOI GORE ARAUCANÍA"])
ws_cartera.append(["Gestión Viva y Formulación de Iniciativas FRPD (D.S. 1.699 de 2024 / ERD 2040)"])
ws_cartera.append([])

headers_cartera = [
    "ID_INICIATIVA", "COD_LINEA", "LINEA_ESTRATEGICA", "BLOQUE", 
    "COD_TERR", "TERRITORIO_ERD", "COMUNAS_IMPACTO", "COD_CTCI", 
    "LINEAMIENTO_CTCI", "TITULO_INICIATIVA_FRPD", "ESTADO_GESTION", 
    "MADUREZ_TECNICA", "PRESUPUESTO_M$ (ESTIMADO)", "EJECUTOR_PROPUESTO", 
    "ENCARGADO_DIFOI", "PROBLEMA_BRECHA_TERRITORIAL", "OBJETIVO_DESCRIPCION", 
    "MARCO_ART8_DS1699", "FECHA_ACTUALIZACION"
]
ws_cartera.append(headers_cartera)

ws_cartera["A1"].font = font_title
ws_cartera["A2"].font = font_sub

for col_idx in range(1, len(headers_cartera) + 1):
    cell = ws_cartera.cell(row=4, column=col_idx)
    cell.font = font_header
    cell.fill = fill_primary
    cell.alignment = align_center
    cell.border = thin_border

madurez_texto = {
    3: "3 - Evidencia levantada / Contraparte identificada",
    2: "2 - Evidencia parcial",
    1: "1 - Por levantar"
}

estado_default = {
    3: "3. En Evaluación Ex-Ante",
    2: "2. Ficha Técnica Completa",
    1: "1. En Formulación"
}

# Insertar 42 iniciativas
for idx, (cod_l, cod_t, cod_ctci, mad) in enumerate(ENTRIES, 1):
    row_num = idx + 4
    linea_info = LINES_MAP[cod_l]
    nombre_linea = linea_info[1]
    bloque_cod = linea_info[2]
    bloque_nom = BLOQUES[bloque_cod]
    nom_terr, comunas_terr = TERR_INFO[cod_t]
    nom_ctci = LIN_INFO[cod_ctci]
    
    ini_id = f"FRPD-{idx:02d}"
    titulo_sugerido = f"{nombre_linea} — Territorio {nom_terr}"
    
    # Presupuesto estimado referencial según madurez y bloque (en MM$)
    presupuesto_ref = 350 if mad == 1 else (650 if mad == 2 else 950)
    
    # Ejecutores según línea
    if cod_l in ['L-01', 'L-03', 'L-09']:
        ejecutor = "Centros Regionales (CGNA), IES Acreditadas (UFRO / UCT)"
    elif cod_l in ['L-04', 'L-05', 'L-07']:
        ejecutor = "DGA, Centros de Investigación, IES Regionales"
    elif cod_l in ['L-02']:
        ejecutor = "Asociaciones Municipales, Universidades Regionales"
    elif cod_l in ['L-08', 'L-10', 'L-11']:
        ejecutor = "INIA Carillanca, Cooperativas Agrícolas, Empresas Sociales"
    elif cod_l in ['L-12']:
        ejecutor = "Agencia de Sostenibilidad Energética, Municipios Malleco/Costa"
    else:
        ejecutor = "Entidades Privadas sin Fines de Lucro habilitadas (Res. 1/2026)"
        
    fila = [
        ini_id,
        cod_l,
        nombre_linea,
        f"{bloque_cod}. {bloque_nom}",
        cod_t,
        nom_terr,
        comunas_terr,
        cod_ctci,
        nom_ctci,
        titulo_sugerido,
        estado_default[mad],
        madurez_texto[mad],
        presupuesto_ref,
        ejecutor,
        "Por Asignar DIFOI",
        linea_info[6], # Brecha
        linea_info[5], # Objetivo
        linea_info[4], # Marco
        "2026-10-02"
    ]
    ws_cartera.append(fila)
    
    # Estilos de fila
    for c_idx in range(1, len(headers_cartera) + 1):
        c = ws_cartera.cell(row=row_num, column=c_idx)
        c.font = font_regular
        c.border = thin_border
        if idx % 2 == 0:
            c.fill = fill_zebra
        if c_idx in [1, 2, 4, 5, 8, 11, 12, 19]:
            c.alignment = align_center
        elif c_idx == 13:
            c.alignment = align_right
            c.number_format = "$#,##0"
        else:
            c.alignment = align_left

# Validaciones de Datos (Dropdowns) en la Hoja de Cartera
dv_estado = DataValidation(type="list", formula1='"1. En Formulación,2. Ficha Técnica Completa,3. En Evaluación Ex-Ante,4. Priorizada FRPD,5. En Convenio / Ejecución"', allow_blank=True)
ws_cartera.add_data_validation(dv_estado)
dv_estado.add(f"K5:K{len(ENTRIES) + 4}")

dv_madurez = DataValidation(type="list", formula1='"3 - Evidencia levantada / Contraparte identificada,2 - Evidencia parcial,1 - Por levantar"', allow_blank=True)
ws_cartera.add_data_validation(dv_madurez)
dv_madurez.add(f"L5:L{len(ENTRIES) + 4}")

# Ajuste de ancho de columnas Hoja 1
col_widths_cartera = {
    'A': 14, 'B': 12, 'C': 34, 'D': 24, 'E': 12, 'F': 25, 'G': 32,
    'H': 12, 'I': 20, 'J': 42, 'K': 24, 'L': 32, 'M': 22, 'N': 35,
    'O': 22, 'P': 45, 'Q': 45, 'R': 20, 'S': 16
}
for col, width in col_widths_cartera.items():
    ws_cartera.column_dimensions[col].width = width

# ----------------- HOJA 2: 14 LÍNEAS ESTRATÉGICAS -----------------
ws_lineas.views.sheetView[0].showGridLines = True
ws_lineas.append(["CATÁLOGO DE LÍNEAS ESTRATÉGICAS DIFOI (MARCO DE INVERSIÓN FRPD 2026)"])
ws_lineas.append(["Alineadas con la ERD 2040 y las tipologías del Art. 8 del D.S. 1.699 de 2024"])
ws_lineas.append([])

headers_lineas = [
    "COD_LINEA", "NOMBRE_LINEA_ESTRATEGICA", "BLOQUE", "TERRITORIOS_APLICACION", 
    "CATEGORIAS_ART8_DS1699", "OBJETIVO_ESTRATEGICO", "BRECHA_O_PROBLEMA_DOCUMENTADO"
]
ws_lineas.append(headers_lineas)

ws_lineas["A1"].font = font_title
ws_lineas["A2"].font = font_sub

for col_idx in range(1, len(headers_lineas) + 1):
    cell = ws_lineas.cell(row=4, column=col_idx)
    cell.font = font_header
    cell.fill = fill_primary
    cell.alignment = align_center
    cell.border = thin_border

for r_idx, l in enumerate(LINES_DATA, 5):
    row = [l[0], l[1], f"{l[2]}. {BLOQUES[l[2]]}", l[3], l[4], l[5], l[6]]
    ws_lineas.append(row)
    for c_idx in range(1, len(headers_lineas) + 1):
        cell = ws_lineas.cell(row=r_idx, column=c_idx)
        cell.font = font_regular
        cell.border = thin_border
        if r_idx % 2 == 0:
            cell.fill = fill_zebra
        if c_idx in [1, 3, 4]:
            cell.alignment = align_center
        else:
            cell.alignment = align_left

col_widths_lineas = {'A': 14, 'B': 36, 'C': 26, 'D': 24, 'E': 24, 'F': 55, 'G': 55}
for col, width in col_widths_lineas.items():
    ws_lineas.column_dimensions[col].width = width


# ----------------- HOJA 3: ORGANISMOS MERCADOPUBLICO -----------------
ws_orgs.views.sheetView[0].showGridLines = True
ws_orgs.append(["ORGANISMOS PÚBLICOS DE LA ARAUCANÍA — CHILECOMPRA (MERCADO PÚBLICO)"])
ws_orgs.append(["Códigos de comprador oficiales para monitoreo de licitaciones y compras públicas"])
ws_orgs.append([])

headers_orgs = ["COD_ORGANISMO", "NOMBRE_ORGANISMO_COMPRADOR", "COMUNA", "TERRITORIO_ERD", "TIPO_ENTIDAD"]
ws_orgs.append(headers_orgs)

ws_orgs["A1"].font = font_title
ws_orgs["A2"].font = font_sub

for col_idx in range(1, len(headers_orgs) + 1):
    cell = ws_orgs.cell(row=4, column=col_idx)
    cell.font = font_header
    cell.fill = fill_primary
    cell.alignment = align_center
    cell.border = thin_border

ORGANISMOS_LISTA = [
    ("7013", "GOBIERNO REGIONAL DE LA ARAUCANIA", "Temuco", "TPLC", "Gobierno Regional"),
    ("7321", "I MUNICIPALIDAD DE TEMUCO", "Temuco", "TPLC", "Municipalidad"),
    ("90886", "I MUNICIPALIDAD DE PADRE LAS CASAS", "Padre Las Casas", "TPLC", "Municipalidad"),
    ("118084", "I MUNICIPALIDAD DE VILLARRICA", "Villarrica", "LAC", "Municipalidad"),
    ("86943", "I MUNICIPALIDAD DE PUCON", "Pucón", "LAC", "Municipalidad"),
    ("118093", "ILUSTRE MUNICIPALIDAD DE CURARREHUE", "Curarrehue", "LAC", "Municipalidad"),
    ("100156", "I MUNICIPALIDAD DE ANGOL", "Angol", "MNO", "Municipalidad"),
    ("113853", "I MUNICIPALIDAD DE COLLIPULLI", "Collipulli", "MNO", "Municipalidad"),
    ("118073", "I MUNICIPALIDAD DE RENAICO", "Renaico", "MNO", "Municipalidad"),
    ("132741", "I MUNICIPALIDAD DE ERCILLA", "Ercilla", "MNO", "Municipalidad"),
    ("124577", "I MUNICIPALIDAD DE LAUTARO", "Lautaro", "VCE", "Municipalidad"),
    ("133899", "I MUNICIPALIDAD DE PERQUENCO", "Perquenco", "VCE", "Municipalidad"),
    ("118089", "I MUNICIPALIDAD DE FREIRE", "Freire", "CSU", "Municipalidad"),
    ("116411", "I MUNICIPALIDAD DE PITRUFQUEN", "Pitrufquén", "CSU", "Municipalidad"),
    ("117586", "Municipalidad de Gorbea", "Gorbea", "CSU", "Municipalidad"),
    ("113851", "I MUNICIPALIDAD DE LONCOCHE", "Loncoche", "CSU", "Municipalidad"),
    ("115186", "I MUNICIPALIDAD DE CARAHUE", "Carahue", "COS", "Municipalidad"),
    ("114924", "I MUNICIPALIDAD DE NUEVA IMPERIAL", "Nueva Imperial", "COS", "Municipalidad"),
    ("115313", "I MUNICIPALIDAD DE SAAVEDRA", "Saavedra", "COS", "Municipalidad"),
    ("115280", "ILUSTRE MUNICIPALIDAD TEODORO SCHMIDT", "Teodoro Schmidt", "COS", "Municipalidad"),
    ("117582", "Ilustre Municipalidad de Tolten", "Toltén", "COS", "Municipalidad"),
    ("116945", "I MUNICIPALIDAD DE PUREN", "Purén", "NAH", "Municipalidad"),
    ("116408", "I MUNICIPALIDAD DE LOS SAUCES", "Los Sauces", "NAH", "Municipalidad"),
    ("115163", "MUNICIPALIDAD DE TRAIGUEN", "Traiguén", "NAH", "Municipalidad"),
    ("138211", "Ilustre Municipalidad de Lumaco", "Lumaco", "NAH", "Municipalidad"),
    ("124203", "Ilustre Municipalidad de Galvarino", "Galvarino", "NAH", "Municipalidad"),
    ("165105", "MUNICIPALIDAD DE CHOLCHOL", "Cholchol", "NAH", "Municipalidad"),
    ("116399", "I MUNICIPALIDAD DE VICTORIA", "Victoria", "AND", "Municipalidad"),
    ("119994", "I MUNICIPALIDAD DE LONQUIMAY", "Lonquimay", "AND", "Municipalidad"),
    ("121613", "I MUNICIPALIDAD DE CURACAUTIN", "Curacautín", "AND", "Municipalidad"),
    ("121617", "ILUSTRE MUNICIPALIDAD MELIPEUCO", "Melipeuco", "AND", "Municipalidad"),
    ("115009", "I MUNICIPALIDAD DE VILCUN", "Vilcún", "AND", "Municipalidad"),
    ("129738", "I MUNICIPALIDAD DE CUNCO", "Cunco", "AND", "Municipalidad"),
    ("7302", "SERVICIO DE SALUD ARAUCANIA NORTE", "Angol", "MNO", "Salud Pública"),
    ("7102", "SERVICIO DE SALUD ARAUCANIA SUR", "Temuco", "TPLC", "Salud Pública")
]

for r_idx, o in enumerate(ORGANISMOS_LISTA, 5):
    ws_orgs.append([o[0], o[1], o[2], o[3], o[4]])
    for c_idx in range(1, len(headers_orgs) + 1):
        cell = ws_orgs.cell(row=r_idx, column=c_idx)
        cell.font = font_regular
        cell.border = thin_border
        if r_idx % 2 == 0:
            cell.fill = fill_zebra
        if c_idx in [1, 3, 4, 5]:
            cell.alignment = align_center
        else:
            cell.alignment = align_left

col_widths_orgs = {'A': 18, 'B': 42, 'C': 22, 'D': 18, 'E': 24}
for col, width in col_widths_orgs.items():
    ws_orgs.column_dimensions[col].width = width


# ----------------- HOJA 4: RESUMEN EJECUTIVO / KPIS -----------------
ws_kpis.views.sheetView[0].showGridLines = True
ws_kpis.append(["RESUMEN DE CONTROL DE CARTERA FRPD — DIFOI GORE ARAUCANÍA"])
ws_kpis.append(["Indicadores clave para presentación a Jefatura y Consejo Regional"])
ws_kpis.append([])

ws_kpis["A1"].font = font_title
ws_kpis["A2"].font = font_sub

# Tarjetas KPI
ws_kpis.merge_cells("A4:C4")
ws_kpis["A4"] = "TOTAL INICIATIVAS EN CARTERA"
ws_kpis["A4"].font = font_bold
ws_kpis["A4"].fill = fill_accent
ws_kpis["A4"].alignment = align_center

ws_kpis.merge_cells("A5:C5")
ws_kpis["A5"] = '=CONTARA(\'1. Cartera_Iniciativas_Viva\'!A5:A46)'
ws_kpis["A5"].font = Font(name="Calibri", size=18, bold=True, color="1F4E78")
ws_kpis["A5"].alignment = align_center
ws_kpis["A5"].border = thin_border

ws_kpis.merge_cells("D4:F4")
ws_kpis["D4"] = "PRESUPUESTO TOTAL ESTIMADO (MM$)"
ws_kpis["D4"].font = font_bold
ws_kpis["D4"].fill = fill_accent
ws_kpis["D4"].alignment = align_center

ws_kpis.merge_cells("D5:F5")
ws_kpis["D5"] = '=SUMA(\'1. Cartera_Iniciativas_Viva\'!M5:M46)'
ws_kpis["D5"].font = Font(name="Calibri", size=18, bold=True, color="1F4E78")
ws_kpis["D5"].alignment = align_center
ws_kpis["D5"].number_format = "$#,##0"
ws_kpis["D5"].border = thin_border

# Tabla por Estado de Gestión
ws_kpis.append([])
ws_kpis.append(["ESTADO DE AVANCE DE INICIATIVAS", "", "", "DISTRIBUCIÓN POR BLOQUE TEMÁTICO", "", ""])
ws_kpis.cell(row=7, column=1).font = font_header
ws_kpis.cell(row=7, column=1).fill = fill_primary
ws_kpis.cell(row=7, column=4).font = font_header
ws_kpis.cell(row=7, column=4).fill = fill_primary

estados = [
    "1. En Formulación",
    "2. Ficha Técnica Completa",
    "3. En Evaluación Ex-Ante",
    "4. Priorizada FRPD",
    "5. En Convenio / Ejecución"
]

bloques_list = [
    "A. Habilitantes",
    "B. Agua, suelo y clima",
    "C. Bioeconomía y valor agregado",
    "D. Energía, conectividad y digitalización"
]

for i in range(max(len(estados), len(bloques_list))):
    r = 8 + i
    # Estado
    if i < len(estados):
        est = estados[i]
        ws_kpis.cell(row=r, column=1, value=est).font = font_regular
        ws_kpis.cell(row=r, column=2, value=f'=CONTAR.SI(\'1. Cartera_Iniciativas_Viva\'!K5:K46, "{est}")').font = font_bold
        ws_kpis.cell(row=r, column=2).alignment = align_center
    # Bloque
    if i < len(bloques_list):
        bloq = bloques_list[i]
        ws_kpis.cell(row=r, column=4, value=bloq).font = font_regular
        ws_kpis.cell(row=r, column=5, value=f'=CONTAR.SI(\'1. Cartera_Iniciativas_Viva\'!D5:D46, "{bloq}")').font = font_bold
        ws_kpis.cell(row=r, column=5).alignment = align_center

col_widths_kpis = {'A': 28, 'B': 14, 'C': 6, 'D': 35, 'E': 14, 'F': 6}
for col, width in col_widths_kpis.items():
    ws_kpis.column_dimensions[col].width = width

wb.save(out_file)
print(f"Archivo generado exitosamente en: {out_file}")
