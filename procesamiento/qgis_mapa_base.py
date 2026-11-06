# Radar FRPD Araucanía · mapa base del mapa interactivo de iniciativas BIP
# Ejecutar en la consola de Python de QGIS (Complementos > Consola de Python > Abrir script > Ejecutar).
"""Renderiza dos imágenes en EPSG:3857 (la proyección de Leaflet) sobre la extensión de la región:

  relieve_3857.png      relieve sombreado sobre fondo oscuro (va bajo el relleno de comunas)
  referencia_3857.png   cuerpos de agua, límites urbanos y red vial, con transparencia (va sobre el relleno)

Después, en una terminal dentro de la carpeta "procesamiento", comprímelas y cópialas a ../fuente/mapa_base/:

  python -c "from PIL import Image; Image.open('relieve_3857.png').convert('L').save('../fuente/mapa_base/relieve.jpg', quality=66, optimize=True, progressive=True); Image.open('referencia_3857.png').convert('RGBA').save('../fuente/mapa_base/referencia.webp', quality=68, method=6, alpha_quality=70)"

Si cambia la extensión, actualiza "bounds" en ../fuente/mapa_base/mapa_base.json con las esquinas que imprime este script.
"""
import math
from qgis.core import (QgsRasterLayer, QgsVectorLayer, QgsMapSettings, QgsMapRendererParallelJob, QgsCoordinateReferenceSystem,
                       QgsCoordinateTransform, QgsProject, QgsFillSymbol, QgsLineSymbol, QgsRuleBasedRenderer,
                       QgsSingleSymbolRenderer, QgsContrastEnhancement, QgsSingleBandGrayRenderer)
from qgis.PyQt.QtCore import QSize
from qgis.PyQt.QtGui import QColor

R = 'C:/Users/mpooley/Documents/DB Araucania/'
OUT = R + 'GeoCGR/'
DEM = R + 'Ámbito Demográfico (formato shapefile)-20260908T202616Z-1-001/Ámbito Demográfico (formato shapefile)/'
IPT = R + 'Instrumentos de Planificación y Ordenamiento Territorial (formato shapefile)-20260908T202612Z-1-001/Instrumentos de Planificación y Ordenamiento Territorial (formato shapefile)/'
INF = R + 'Ámbito Infraestructura Publica (formato shapefile)-20260908T202623Z-1-001/Ámbito Infraestructura Publica (formato shapefile)/'
W3857 = QgsCoordinateReferenceSystem('EPSG:3857')

com = QgsVectorLayer(DEM + 'Censo 2024 Región de La Araucanía SHP_R09/Comunal.shp', 'com', 'ogr')
ext = QgsCoordinateTransform(com.crs(), W3857, QgsProject.instance()).transformBoundingBox(com.extent())
ext.grow(max(ext.width(), ext.height()) * 0.03)
WPX = 2400
HPX = round(WPX * ext.height() / ext.width())

hs = QgsRasterLayer(R + 'hillshadewgs84h18cubico.tif', 'relieve')
ce = QgsContrastEnhancement(hs.dataProvider().dataType(1))
ce.setContrastEnhancementAlgorithm(QgsContrastEnhancement.StretchToMinimumMaximum)
ce.setMinimumValue(60); ce.setMaximumValue(235)
gr = QgsSingleBandGrayRenderer(hs.dataProvider(), 1); gr.setContrastEnhancement(ce)
hs.setRenderer(gr); hs.setOpacity(0.55)

agua = QgsVectorLayer(IPT + 'Inventario Humedales 2020/Inventario de Humedales 2020.shp', 'agua', 'ogr')
agua.setSubsetString("\"ORDEN_2\" IN ('LACUSTRES','RIBERENOS','LAGO SALADO','ESTUARINOS')")
agua.setRenderer(QgsSingleSymbolRenderer(QgsFillSymbol.createSimple({'color': '10,17,22,235', 'outline_style': 'no'})))
urb = QgsVectorLayer(DEM + 'Limite Urbano/Limite Urbano.shp', 'urbano', 'ogr')
urb.setRenderer(QgsSingleSymbolRenderer(QgsFillSymbol.createSimple({'color': '235,238,240,70', 'outline_color': '235,238,240,120', 'outline_width': '0.15'})))
vial = QgsVectorLayer(INF + 'Red Vial/Red Vial.shp', 'vial', 'ogr')
root = QgsRuleBasedRenderer.Rule(None)
for flt, col, w in [("\"ROL\" = 'Ruta 5'", '235,238,240,200', '0.75'),
                    ("\"ROL\" <> 'Ruta 5' AND regexp_match(\"ROL\", '^[A-Z]+-\\\\d{1,2}(-|$)')", '225,230,234,140', '0.4'),
                    ('ELSE', '210,216,220,55', '0.22')]:
    rule = QgsRuleBasedRenderer.Rule(QgsLineSymbol.createSimple({'color': col, 'width': w, 'capstyle': 'round', 'joinstyle': 'round'}),
                                     filterExp=None if flt == 'ELSE' else flt)
    if flt == 'ELSE': rule.setIsElse(True)
    root.appendChild(rule)
vial.setRenderer(QgsRuleBasedRenderer(root))

_jobs = []
def render(layers, bg, path):
    ms = QgsMapSettings(); ms.setDestinationCrs(W3857); ms.setExtent(ext); ms.setOutputSize(QSize(WPX, HPX)); ms.setOutputDpi(144)
    ms.setLayers(layers); ms.setBackgroundColor(bg)
    job = QgsMapRendererParallelJob(ms)
    job.finished.connect(lambda: print('listo', path, job.renderedImage().save(path)))
    job.start(); _jobs.append(job)

render([hs], QColor(17, 24, 29), OUT + 'relieve_3857.png')
render([vial, urb, agua], QColor(0, 0, 0, 0), OUT + 'referencia_3857.png')
Rm = 6378137.0
lat = lambda y: (2 * math.atan(math.exp(y / Rm)) - math.pi / 2) * 180 / math.pi
lon = lambda x: x / Rm * 180 / math.pi
print('bounds', [[round(lat(ext.yMinimum()), 6), round(lon(ext.xMinimum()), 6)], [round(lat(ext.yMaximum()), 6), round(lon(ext.xMaximum()), 6)]])
