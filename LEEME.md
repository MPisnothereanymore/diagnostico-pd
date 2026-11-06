# Radar FRPD Araucanía

Tablero de diagnóstico regional para formular iniciativas financiables por el Fondo Regional para la Productividad y el Desarrollo (FRPD, D.S. 1.699 de 2024), alineado con la ERD 2040. DIFOI, Gobierno Regional de La Araucanía. Versión del 2 de octubre de 2026.

## Para usarlo

Abre **`Radar FRPD Araucanía.html`** con doble clic. Se recomienda Chrome o Edge actualizado. El archivo es autosuficiente: trae dentro todos los datos (unos 3 MB comprimidos) y no necesita internet ni instalar nada.

- **Sin internet:** funciona igual. La tipografía se reemplaza por la del sistema y el mapa de iniciativas BIP vuelve a la versión fija (sin acercar ni mover), porque el mapa interactivo usa la librería Leaflet, que se descarga al abrir el tablero.
- **Mapa interactivo de iniciativas BIP:** se acerca con la rueda o los botones y se mueve arrastrando, sin salir de la región. Los fondos «Topográfico» (OpenTopoMap), «Satélite» (Esri World Imagery) y «Calles» (OpenStreetMap) se descargan en línea, por lo que funcionan en la versión web y en la local con internet. En Claude, que bloquea imágenes externas, el mapa se muestra sin fondo. Donde cargan, el mapa parte con el topográfico.
- **Exportaciones CSV:** los botones «Exportar CSV» descargan el archivo a la carpeta de Descargas del navegador. Los CSV usan punto y coma y se abren directamente en Excel.
- **«Redactar borrador» con Claude:** solo funciona en la versión publicada en Claude (el artefacto «Radar FRPD Araucanía» en claude.ai). En el archivo local el botón aparece desactivado.
- **Para compartirlo:** basta enviar el archivo HTML. Quien lo reciba no necesita nada más.

## Contenido de esta carpeta

| Carpeta o archivo | Para qué sirve | ¿Se necesita para usar el tablero? |
|---|---|---|
| `Radar FRPD Araucanía.html` | El tablero completo, con datos incluidos | **Sí, es lo único necesario** |
| `LEEME.md` | Este documento | No |
| `Notas Radar FRPD.md` | Notas de las fases 1 a 5: fuentes, hallazgos, cifras de control y supuestos | No |
| `fuente/` | Código del tablero y paquete de datos, para modificarlo y volver a armarlo | Solo para modificarlo |
| `procesamiento/` | Scripts que construyen el paquete de datos desde las fuentes originales | Solo para actualizar datos |

## Para modificar el tablero (`fuente/`)

| Archivo | Contenido |
|---|---|
| `head.html` | Estilos (CSS) y estructura de las pestañas |
| `app.js` | Lógica principal: Cartera, Territorios, Evidencia territorial, Marco normativo, Iniciativas BIP, Simulador y borrador con Claude |
| `emp.js` | Barra lateral de filtros de empresas y pestaña Empresas, adaptadas del tablero Tejido Empresarial |
| `pack_frpd6.b64` | Paquete de datos (JSON comprimido con gzip y codificado en base64) |
| `obras_geocgr.b64` | Capa opcional de obras georreferenciadas de Geo-CGR para el mapa de iniciativas BIP (paso 7). Si no está, el tablero funciona sin ella |
| `build.py` | Une todo y genera el HTML |

Después de editar, ejecuta en una terminal, dentro de la carpeta `fuente`:

```
python build.py
```

Solo requiere Python 3, sin librerías adicionales. Regenera `Radar FRPD Araucanía.html` en la carpeta principal. También crea `radar_frpd_artefacto.html`, que sirve para volver a publicarlo en Claude.

## Para actualizar los datos (`procesamiento/`)

Los scripts arman el paquete de datos en seis pasos encadenados. Cada uno lee el paquete del paso anterior desde `intermedios/` y escribe el siguiente. Por eso se puede volver a ejecutar solo el paso cuya fuente cambió y los posteriores.

| Paso | Script | Qué agrega | Entradas principales | Genera |
|---|---|---|---|---|
| 1 | `prep_frpd.py` | Cartera DIFOI (14 líneas, 42 entradas), territorios ERD, lineamientos L1–L6, D.S. 1.699 y ERD 2040 | `intermedios/pack_tejido_base.b64` (base SII del tablero Tejido Empresarial), `entradas/erd_2040_texto.txt`, comunas del Censo 2024 | `pack_frpd.b64` |
| 2 | `prep_infra.py` | Infraestructura y condiciones habilitantes | Capas de `DB Araucania` (vialidad, puentes, SAIDI, antenas, SSR, IES, etc.) | `pack_frpd2.b64` |
| 3 | `prep_fin.py` | Financiamiento existente ANID, CORFO y BIP 2019–2027 | `entradas/BDH_HISTORICA.csv` (ANID, ver nota), `DB Araucania/FRPD_fase2/` | `pack_frpd3.b64`, `fin.pkl` |
| 4 | `prep_exe.py` | Ejecutores habilitados (Res. 1/2026 y Res. 33/2024) | `entradas/res1_2026.json`, `DB Araucania/FRPD_fase3/q.txt` | `pack_frpd4.b64` |
| 5 | `prep_bip.py` | Explorador de iniciativas BIP | `DB Araucania/FRPD_fase2/bip_araucania_2019_2027.csv` | `pack_frpd5.b64` |
| 6 | `prep_ctx.py` | Evidencia territorial (SAE 2022, Censo 2024, CONADI, ARClim, CONAF, PROT, CAF 2021, SINIM, Banco Central) | `DB Araucania/FRPD_datos2/`, `DB Araucania/Incendios/`, capas demográficas | `../fuente/pack_frpd6.b64` |
| 7 | `prep_geocgr.py` | Obras con coordenadas de Geo-CGR (Contraloría), vinculadas a las iniciativas BIP por código y, para las obras sin código, por similitud de nombre dentro de la comuna (vínculo aproximado). Independiente de los pasos 1 a 6 | `DB Araucania/GeoCGR/geocgr_araucania_2019_2026.json`, o una descarga nueva con `--descargar` | `../fuente/obras_geocgr.b64` |

**Cómo ejecutarlos.** Abre una terminal dentro de la carpeta `procesamiento` y usa el modo UTF-8 de Python para que los acentos se lean bien en Windows:

```
pip install -r requirements.txt
python -X utf8 prep_ctx.py
cd ..\fuente
python build.py
```

**Obras de Geo-CGR (paso 7).** Para traer obras nuevas, ejecuta `python -X utf8 prep_geocgr.py --descargar` desde un computador con acceso a www.contraloria.cl. El script consulta las 32 comunas desde el 01/01/2019 hasta la fecha, reemplaza el JSON de `DB Araucania/GeoCGR/` y regenera la capa; luego vuelve a ejecutar `build.py`. Requiere `pyproj` y `shapely`, que se instalan con geopandas. La carpeta `GeoCGR` también tiene un GeoPackage (`geocgr_araucania_2019_2026.gpkg`, capas de puntos y líneas) para revisar las obras en QGIS.

**Rutas.** Los scripts leen los datos originales desde `C:/Users/mpooley/Documents/DB Araucania/`. Si esa carpeta cambia de lugar, reemplaza esa ruta al inicio de cada script.

**Entradas que no vienen incluidas:**
- **Base histórica ANID** (`BDH_HISTORICA.csv`, unos 23 MB). Descárgala del repositorio público de ANID en GitHub (`ANID-GITHUB/Historico-de-Proyectos-Adjudicados`) y guárdala en `procesamiento/entradas/`. Solo se necesita para el paso 3.
- **Base SII de empresas.** La genera el tablero Tejido Empresarial. Aquí se incluye ya procesada como `intermedios/pack_tejido_base.b64`. Actualizarla con una nueva nómina del SII requiere el procesamiento de ese tablero, que no está en esta carpeta.

**Otras notas:**
- `entradas/sinim_parser.py` es una copia del lector de planillas SINIM del paquete `mcp-sinim`, con licencia MIT (ver `sinim_parser_LICENSE.txt`).
- `intermedios/ctx_comunas.csv` resume por comuna los indicadores de evidencia territorial. Usa códigos cortos; la exportación de la pestaña «Evidencia territorial» del tablero entrega la versión con nombres completos.

## Supuestos provisionales (a validar por DIFOI)

- Correspondencia entre subrubros SII y lineamientos L1–L6. Un subrubro puede contar en más de un lineamiento. Además, L4 está dominado por instaladores eléctricos.
- Clasificación de proyectos ANID, CORFO y BIP por palabras clave del título.
- Ponderadores del simulador.

El detalle de fuentes, fechas de corte y advertencias está en el pie del tablero y en `Notas Radar FRPD.md`.
