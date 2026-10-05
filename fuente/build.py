"""Arma el Radar FRPD Araucanía a partir de head.html, app.js, emp.js y el paquete de datos pack_frpd6.b64.

Uso (solo necesita Python 3, sin librerías adicionales):
    python build.py

Genera:
    ../Radar FRPD Araucanía.html   versión para abrir en el computador (doble clic)
    radar_frpd_artefacto.html      versión para volver a publicar como artefacto en Claude
"""
from pathlib import Path

H = Path(__file__).resolve().parent
head = (H / 'head.html').read_text(encoding='utf-8')
app = (H / 'app.js').read_text(encoding='utf-8').replace('// @@EMPRESAS@@', (H / 'emp.js').read_text(encoding='utf-8'))
pack = (H / 'pack_frpd6.b64').read_text(encoding='utf-8').strip()
scripts = '\n<script id="pack" type="application/octet-stream">' + pack + '</script>\n<script>\n' + app + '\n</script>\n'

# versión local: documento HTML completo (codificación, viewport y margen)
cut = head.index('</style>') + len('</style>')
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
