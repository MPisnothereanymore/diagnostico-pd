"""Arma el Radar FRPD Araucanía a partir de head.html, app.js, emp.js, el paquete de datos pack_frpd6.b64
y, si existe, la capa de obras georreferenciadas obras_geocgr.b64.

Uso (solo necesita Python 3, sin librerías adicionales):
    python build.py

Genera:
    ../Radar FRPD Araucanía.html   versión para abrir en el computador (doble clic)
    radar_frpd_artefacto.html      versión para volver a publicar como artefacto en Claude
"""
from pathlib import Path

H = Path(__file__).resolve().parent
head = (H / 'head.html').read_text(encoding='utf-8')
app = (H / 'app.js').read_text(encoding='utf-8').replace('// @@EMPRESAS@@', (H / 'emp.js').read_text(encoding='utf-8') + '\n' + (H / 'infra.js').read_text(encoding='utf-8'))
pack = (H / 'pack_frpd6.b64').read_text(encoding='utf-8').strip()
# capa opcional de obras georreferenciadas (procesamiento/prep_geocgr.py)
obras = H / 'obras_geocgr.b64'
extra = ('\n<script id="obras" type="application/octet-stream">' + obras.read_text(encoding='utf-8').strip() + '</script>') if obras.exists() else ''
scripts = '\n<script id="pack" type="application/octet-stream">' + pack + '</script>' + extra + '\n<script>\n' + app + '\n</script>\n'

# versión local: documento HTML completo (codificación, viewport y margen)
# Leaflet va incrustado (fuente/vendor/), para que los mapas funcionen sin internet
LF_TAG = '<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"></script>'
assert LF_TAG in head
head = head.replace(LF_TAG, '<script>/* Leaflet 1.9.4, BSD-2-Clause, (c) Volodymyr Agafonkin y CloudMade; licencia en fuente/vendor/leaflet-LICENSE.txt */\n' + (H / 'vendor' / 'leaflet-1.9.4.js').read_text(encoding='utf-8').replace('</script', '<\\/script') + '\n</script>')
cut = head.rindex('</style>', 0, head.index('<div')) + len('</style>')   # todo lo anterior al primer <div> va en <head>
local = ('<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
         '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
         + head[:cut] + '\n<style>body{margin:0}</style>\n</head>\n<body>' + head[cut:] + scripts + '</body>\n</html>\n')
(H.parent / 'Radar FRPD Araucanía.html').write_text(local, encoding='utf-8')
(H.parent / 'index.html').write_text(local, encoding='utf-8')

dist = H.parent / 'dist'
dist.mkdir(exist_ok=True)
(dist / 'index.html').write_text(local, encoding='utf-8')

# versión artefacto: el servicio de artefactos agrega el documento envolvente
(H / 'radar_frpd_artefacto.html').write_text(head + scripts, encoding='utf-8')

# Copiar datos_radar.json a dist si existe
datos_src = H.parent / 'datos_radar.json'
if datos_src.exists():
    (dist / 'datos_radar.json').write_text(datos_src.read_text(encoding='utf-8'), encoding='utf-8')

print('Listo:', H.parent / 'Radar FRPD Araucanía.html', f'({len(local) / 1e6:.1f} MB)')
print('Listo para GitHub Pages y Netlify:', dist / 'index.html')
