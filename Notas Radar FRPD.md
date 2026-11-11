# Radar FRPD Araucanía · Fases 1 a 5

Tablero de decisión para la cartera del Fondo Regional para la Productividad y el Desarrollo (FRPD; D.S. 1.699 de 2024, Ley 21.591), alineado con la Estrategia Regional de Desarrollo (ERD) 2040. Es distinto del tablero Tejido Empresarial.

Artefacto: https://claude.ai/artifact/HVYiFXfPQY1u4hACzUV4WP (privado hasta que se comparta)

Unidades: MM$ = millones de pesos.

## Vistas
**Cartera.** Matriz de 8 territorios ERD × 6 lineamientos CTCI (L1–L6), con las 42 entradas de la minuta DIFOI.
- Las celdas se pueden colorear por:
  - especialización SII (cociente de localización);
  - número de empresas;
  - crecimiento 2014–2024;
  - madurez;
  - financiamiento existente 2019–2026.
- Cada celda abre una ficha con:
  - encaje en el D.S. 1.699 (art. 8 y gastos i–x);
  - alineación con los lineamientos estratégicos regionales (LER) y con el objetivo del territorio;
  - base empresarial SII, con rango de ventas por tramos;
  - financiamiento existente (ANID, CORFO, BIP), exportable a CSV;
  - condiciones habilitantes;
  - evidencia de necesidad según el lineamiento (fase 4);
  - ejecutores posibles con su habilitación;
  - empresas objetivo, exportables a CSV;
  - borrador de perfil de iniciativa redactado con Claude.

**Territorios e infraestructura.**
- Mapa con capas de infraestructura y los indicadores de evidencia territorial.
- Perfil de cada territorio con su financiamiento por fuente y su evidencia territorial.
- Tabla de condiciones habilitantes por comuna.

**Evidencia territorial** (fase 4). Ver la sección de la fase 4.

**Marco normativo.**
- Cobertura del art. 8 por línea de la cartera.
- Tabla "Lo que ya se financia".
- Tabla "Quién puede ejecutar en La Araucanía", con la nómina de la Res. 1/2026 y la Res. 33/2024 desplegables y exportación a CSV.
- Exclusiones (art. 10) y LER.

**Iniciativas BIP.** Explorador de las 5.199 iniciativas 2019–2027, con nombre, monto solicitado, costo total, historial por año, filtros y exportación a CSV.

**Simulador.** Monto de ejemplo de MM$ 10.000, con:
- piso CTCI del art. 7;
- tope de administración del art. 9;
- reserva regional;
- ponderadores de la distribución territorial.

## Hallazgos de la Fase 1
- **Territorios ERD.** Los 8 territorios oficiales coinciden con la agrupación comunal usada.
- **Categorías usadas.** La cartera usa 8 de las 22 categorías del art. 8 y 6 de los 10 gastos del N°3.
  - Sin línea: todo el N°1, las categorías 2a, 2b, 2c, 2f y 2i, y los gastos v, viii, ix y x.
- **Piso CTCI.** 40 de las 42 entradas aportan al piso del 25%.
- **Celdas especializadas sin entrada.** Malleco Norte × L2 (cociente 1,32) y Cautín Sur × L4 (1,11).
- **Brechas habilitantes.**
  - 15 comunas tienen menos de 15% de su red vial pavimentada.
  - El 71% de los puentes tiene tablero de madera.
  - El SAIDI (horas de interrupción eléctrica) más alto está en Melipeuco (16,5 h), Saavedra (9,9 h) y Toltén (7,2 h).

## Fase 2 · Financiamiento existente 2019–2026
Archivos de respaldo: `Documents\DB Araucania\FRPD_fase2`.

**Fuentes.**
- **ANID.** Base de Datos Histórica de proyectos adjudicados (corte 31-12-2025).
  - 834 proyectos ejecutados en la región, por MM$ 118.426.
  - Se asignan a la comuna de la sede de la institución.
- **CORFO InnovaChile.** API de DataInnovación.
  - 131 proyectos, por MM$ 10.253.
  - Se asignan a la comuna de la casa matriz del beneficiario, cruzando su RUT con la nómina SII.
- **BIP.** Banco Integrado de Proyectos, vía BIDAT, años 2019–2027.
  - 5.199 iniciativas en total, de las cuales 1.697 son productivas o habilitantes.
  - El monto es el costo total de la etapa postulada, no lo gastado.
  - Tres montos imposibles quedaron sin valor.

| Categoría análoga del art. 8 | Fuente | N° | MM$ |
|---|---|---|---|
| N°1 fomento productivo | BIP | 327 | 303.830 |
| N°1 innovación empresarial | CORFO | 131 | 10.253 |
| 1d riego | BIP | 71 | 137.504 |
| 2a conectividad | BIP | 539 | 2.391.413 |
| 2b energía | BIP | 187 | 71.759 |
| 2c residuos | BIP | 92 | 57.522 |
| 2g conectividad digital | BIP | 11 | 23.239 |
| N°3 investigación | ANID | 834 | 118.426 |
| N°3 CTCI con fondos regionales | BIP | 106 | 93.288 |

**Conclusión.** Las categorías que la cartera FRPD no usa ya tienen otras fuentes. Eso respalda que el FRPD se concentre en el N°3 y en capacidades habilitantes.

## Fase 3 · Ejecutores habilitados
Archivos de respaldo: `Documents\DB Araucania\FRPD_fase3`.

**Nómina de privadas (Res. N° 1, 23-feb-2026).**
- Fuente: Subsecretaría de Economía y EMT, primer llamado 2026, transcrita en el anexo de las bases FRPD 2026 del GORE Antofagasta.
- La nómina tiene **103 instituciones privadas sin fines de lucro**. Una cifra de 133 citada antes era errónea.
- **11 tienen presencia en La Araucanía** según la nómina SII:
  - Con casa matriz en la región: Universidad Católica de Temuco, Universidad Autónoma, FUDEA, SOFO, Arca del Sur y Fundación Heroica.
  - Con sucursal: Universidad Santo Tomás, Universidad Mayor, Pontificia Universidad Católica (Villarrica), IP INACAP y Fundación Superación de la Pobreza.
- Hubo una segunda inscripción (Res. Adm. Ex. N° 19 de 30-jun-2026, cierre 20-jul-2026). Su nómina resultante no se pudo verificar.

**Res. Ex. N° 33 de 2024.** Fija 52 categorías de instituciones que pueden recibir recursos de innovación, competitividad y CTCI, entre ellas:
- servicios públicos;
- centros regionales ANID (n° 41, por ejemplo CGNA);
- INIA (n° 23);
- educación superior acreditada 4 años o más (n° 51);
- corporaciones regionales con participación del GORE (n° 52).

**Capacidad científica (proyectos ANID 2019–2026).**
| Institución | Proyectos | Aplicada | MM$ |
|---|---|---|---|
| Universidad de La Frontera | 539 | 107 | 75.391 |
| Universidad Católica de Temuco | 172 | 31 | 19.970 |
| Universidad Autónoma | 77 | 7 | 8.404 |
| CGNA | 10 | 2 | 3.926 |
| INIA Carillanca | 5 | 2 | 751 |

Las demás instituciones tienen poca actividad ANID en la región.

**Sedes privadas de educación superior que no figuran en la nómina del primer llamado.** Son 15, entre ellas:
- Universidad Tecnológica INACAP y CFT INACAP;
- CFT Santo Tomás e IP Santo Tomás;
- IP y CFT Los Lagos;
- AIEP;
- Duoc UC;
- Universidad de Aconcagua.

**Pendiente.** La acreditación institucional (art. 13: 4 años o más) no se pudo obtener de forma automática, porque los sitios de la CNA y de mifuturo.cl no permiten el acceso. El tablero la marca como "Verificar en CNA".

## Fase 4 · Evidencia territorial (pestaña nueva)
Archivos de respaldo: `Documents\DB Araucania\FRPD_datos2`. Script: `prep_ctx.py` (genera `pack_frpd6.b64`).

**Qué agrega el tablero.**
- Pestaña **Evidencia territorial**:
  - 10 indicadores clave regionales;
  - estructura productiva regional (Banco Central);
  - cultivos y plantaciones por territorio (CAF 2021);
  - tabla de 33 indicadores por comuna en 5 grupos: equidad, agua y clima, riesgos, agro, municipio. La tabla se puede ordenar, se exporta a CSV y envía cada indicador al mapa.
- **Ficha de cada celda.** Nueva sección "Evidencia de necesidad". Muestra indicadores según el lineamiento, más equidad y contraparte municipal. Compara territorio y región, e indica la comuna más crítica. En L2, L3 y L5 agrega los cultivos principales.
- **Perfil de territorio.** Agrega un bloque de evidencia.
- **Mapa.** Incorpora los 33 indicadores.
- **Borrador con Claude.** Ahora usa esta evidencia.

**Fuentes.**

| Fuente | Contenido | Obtención |
|---|---|---|
| SAE 2022 (MDSF) | Pobreza por ingresos, pobreza multidimensional e inseguridad alimentaria por comuna | — |
| Censo 2024 (INE) | Población perteneciente a pueblos indígenas y origen del agua de la vivienda | Suma de manzanas y entidades rurales; las unidades suprimidas quedan fuera del numerador y del denominador |
| CONADI | 2.442 comunidades registradas | — |
| ARClim (MMA) | 9 indicadores comunales: presente y cambio proyectado SSP2-4.5 | Precipitación en %; el resto como cambio absoluto |
| CONAF | Incendios de la temporada 2024-25 (1.328 registros, 56 mil ha) | Solo una temporada |
| PROT GORE | Amenaza de inundación | Cobertura parcial; la capa trae cada polígono duplicado, uno por etiqueta |
| CAF 2021 (INE) | Resultados comunales | Servicio ArcGIS del visor del INE |
| SINIM 2024 | 10 variables municipales | El Fondo de Comunas Mineras es 0 en toda la región |
| Banco Central | PIB regional por actividad, PIB a precios corrientes y PIB por habitante | — |

**Hallazgos.**
- **PIB por habitante 2024.** MM$ 8,9, el más bajo de las 16 regiones.
- **Peso en el PIB.** 3,0% del PIB regionalizado en 2025.
- **Crecimiento real 2018–2025.** +22%, frente a +14% del conjunto de regiones.
- **Especialización productiva.**

  | Actividad | Cociente |
  |---|---|
  | Agropecuario-silvícola | 2,27 |
  | Servicios personales | 1,54 |
  | Administración pública | 1,47 |

- **Pobreza multidimensional.** 19,8% en la región. 12 de 32 comunas tienen 25% o más.

  | Comuna | Pobreza multidimensional |
  |---|---|
  | Saavedra | 44,5% |
  | Ercilla | 41,6% |
  | Galvarino | 39,9% |
  | Cholchol | 36,5% |

- **Agua.**
  - El 21,6% de las viviendas no tiene red pública de agua.
  - 13.313 viviendas se abastecen con camión aljibe.
  - Las cifras más altas por cada 1.000 viviendas:

    | Comuna | Camión aljibe |
    |---|---|
    | Saavedra | 283 |
    | Cholchol | 266 |
    | Galvarino | 203 |

- **Clima.** La precipitación proyectada cae 8,2% a mitad de siglo.
- **Riego.** El 17% de la superficie cultivada tiene riego. Curacautín (1,5%) y Saavedra (2,5%) tienen la menor proporción.
- **Municipios.**
  - La dependencia del Fondo Común Municipal ponderada por población es 64,7%.
  - 24 de 32 municipios tienen 75% o más.
  - Saavedra (92,7%) y Toltén (91,8%) son los más dependientes.
- **Patrón general.** La costa y Nahuelbuta concentran pobreza, población indígena, falta de agua y baja capacidad municipal. Ese es el núcleo de la evidencia de necesidad para L1, L3 y L6.

**No incorporado.**
- **Encuesta de I+D y Encuesta de Innovación por región.** El portal Observa no permite acceso automatizado y la página del INE carga los cuadros de forma interactiva. Requiere descarga manual.
- **Decretos de escasez hídrica DGA.** No hay un listado descargable. Se usan como proxy:
  - viviendas con camión aljibe;
  - indicadores de sequía de ARClim.
- **Registro 19.862.** Aporta poco frente a la Res. 1/2026.
- **Acreditación CNA y matrícula SIES.** Siguen bloqueadas por acceso automatizado.

## Fase 5 · Filtros globales y pestaña Empresas (traídos de Tejido Empresarial)
Tejido Empresarial no se modificó; los cambios se hicieron solo en el Radar.

**Barra lateral de filtros (global).**
- Facetas con conteos, como en Tejido Empresarial:
  - territorio ERD;
  - sector (privado con fines de lucro, sin fines de lucro, público);
  - comuna;
  - lineamiento L1–L6;
  - foco CTCI;
  - rubro, subrubro y actividad;
  - tamaño;
  - trabajadores;
  - nómina Res. 1/2026;
  - año de inicio y vigencia;
  - período de comparación;
  - búsqueda.
- **Qué recalculan:** la matriz territorio × lineamiento (cocientes y crecimiento dentro de la selección), las fichas, el perfil territorial, el mapa y los CSV.
- **Territorio y lineamiento** atenúan las filas y columnas de la matriz que no corresponden.
- **No cambian:** el simulador y la evidencia territorial.
- La barra se oculta en Evidencia, Marco normativo, BIP y Simulador.

**Atajos.**
- Los 7 de Tejido: Oferta CTCI, Demanda potencial, Emprendimientos 2020+, etc.
- Uno por lineamiento, L1–L6.
- «En nómina Res. 1/2026».

**Pestaña Empresas.** Porta la vista Explorar de Tejido:
- indicadores;
- mapa con los límites de los territorios ERD;
- explorador por grupo, que suma territorio y lineamiento;
- evolución 2005–2024;
- año de inicio;
- tamaño;
- tabla paginada con exportación a CSV;
- especialización por comuna, con columnas por lineamiento, rubro, grupo CTCI, sector, tamaño o trabajadores.

**Ficha.**
- **Bloque «Oferta de conocimiento».** Muestra las empresas de los 5 grupos CTCI del territorio y enlaza a Empresas.
- **Empresas objetivo.** Se desglosan por sector y marcan las que están en la nómina.
- **Indicador renombrado:** «Entradas que aportan al piso CTCI».

**Cifras de control** (iguales a Tejido Empresarial):

| Indicador | Valor |
|---|---|
| Empresas | 42.325 |
| Trabajadores | 279.460 |
| Empresas CTCI | 1.393 |

**Por sector:**

| Sector | Empresas | Trabajadores |
|---|---|---|
| Privadas con fines de lucro | 40.690 | — |
| Sin fines de lucro | 1.555 | — |
| Públicas | 80 | 59.256 (21% del total) |

**Aclaración.** El «40» del Radar son entradas de la cartera que aportan al piso CTCI, no empresas. De las 1.393 empresas CTCI, solo 694 caen en algún lineamiento. Los servicios técnicos y de ingeniería (527) no entran en ninguno; por eso se agregó el bloque «Oferta de conocimiento».

## Indicadores habilitantes (por comuna; el tercio peor se marca como brecha)
| Indicador | Cálculo | Fuente / advertencia |
|---|---|---|
| Red vial pavimentada | % de km | Red vial comunal |
| Puentes de madera | % de puentes | Unión espacial con los límites del Censo 2024 |
| SAIDI 2022 | horas, ponderado por población | Base regional |
| Viviendas sin energía | por 1.000 hab. | Ocho comunas registran exactamente 50 (posible piso de la fuente) |
| Antenas | por 100 km² | Decretos 1997–2020; no reflejan la cobertura actual |

## Ajustes de lectura (11 de noviembre de 2026)
- **Encabezado.** Una línea de propósito; el detalle del contenido pasó al pie, antes de las fuentes.
- **Filtros BIP.** Quedan visibles la búsqueda, el tipo de inversión, el territorio y la categoría. Comuna, lineamiento, año, etapa, financiamiento y RATE están tras «Más filtros». Los filtros activos se muestran como etiquetas que se quitan con un clic.
- **Notas de los mapas.** Las notas largas muestran su primera frase y pliegan el resto.
- **Íconos.** Se quitaron los emojis de botones, listas, cadenas y guías.
- **Pestañas.** Agrupadas en Inversión (Cartera, Iniciativas BIP, Compras Públicas), Diagnóstico (Territorios, Empresas, Evidencia territorial) y Formulación (Marco normativo, Simulador). «Territorios e infraestructura» pasó a llamarse «Territorios». En pantallas de menos de 900 px los rótulos de grupo se ocultan.
- **Mapa BIP.** El botón «Ocultar mapa» lo pliega para llegar a la tabla, y el navegador recuerda la elección.
- **Perfil de territorio.** Las cifras quedan arriba, y las seis secciones siguientes son plegables. Parte abierta solo la de especialización, y el estado se mantiene al cambiar de territorio.
- **Capas de Territorios.** Agrupadas en Referencias, Transporte y conectividad, y Servicios y equipamiento.
- **Unidades.** Los encabezados de los CSV dicen «miles de $» en vez de «M$», para no confundirlos con los MM$ de la pantalla. Los valores no cambian.

## Tipo de inversión (11 de noviembre de 2026)
- **Filtro.** En la pestaña Iniciativas BIP, el filtro «Tipo de inversión» es de selección múltiple y tiene cinco opciones: infraestructura (2.921), conservación de infraestructura (1.249), equipamiento y vehículos (378), programas (576) y estudios básicos (75). Cada botón muestra cuántas iniciativas quedan con los demás filtros.
- **Criterio.** Se parte de la tipología oficial del BIP (`TIP_CLAVE`: 791 proyecto, 792 programa, 793 estudio básico). Los proyectos se separan por el proceso con que parte su nombre, según la norma de nombres del SNI (proceso + objeto + localización):
  - «Conservación» se clasifica como conservación de infraestructura.
  - «Adquisición» y «Equipamiento» se clasifican como equipamiento y vehículos.
  - Construcción, mejoramiento, reposición, ampliación, habilitación, normalización, instalación, restauración y reparación se clasifican como infraestructura.
- **Coincidencia con el nombre.** La tipología oficial coincide en las 5.199 iniciativas con la que se deduce del nombre, e incluye «Saneamiento» y «Recuperación» entre los programas. Ninguna iniciativa cambia de tipología entre postulaciones.
- **Datos.** `prep_bip.py` (paso 5) agrega los campos `ti` y `tiv` al paquete. En `pack_frpd6.b64` se agregaron con el mismo cálculo sobre `bip_araucania_2019_2027.csv`, sin volver a correr el paso 6.

## Obras georreferenciadas (Geo-CGR, 6 de noviembre de 2026)
- **Fuente.** Contraloría, Geo-CGR, consulta pública por comuna (`api/comunas/{CUT}/newobras`) para las 32 comunas, con obras adjudicadas entre el 01/01/2019 y el 06/11/2026. Descargada con QGIS desde el computador de DIFOI, porque el espacio de trabajo de Claude no tiene acceso al sitio.
- **Cifras.** 3.232 registros, que corresponden a 3.019 obras distintas por expediente. 2.982 traen coordenadas, de las cuales 2.933 caen en la comuna declarada y 49 en otra (revisión en QGIS contra Comunal.shp: 3.003 en la comuna declarada, 17 a menos de 1 km y 27 en otra, ninguna fuera de la región). La capa tiene 5.245 puntos y 787 líneas.
- **Vínculo con el BIP.** 709 obras traen código BIP, que corresponden a 419 códigos distintos. 385 de esos códigos están en la base BIP del radar (7% de las 5.199 iniciativas) y suman 637 obras. Geo-CGR solo registra contratos de obra, no estudios, diseños ni programas, y la mayoría de los servicios no informa el código BIP.
- **Coordenadas del BIP.** La base BIDAT marca 4.395 de las 5.199 iniciativas con georreferenciación (`EBI_TIENE_GEO = 1`), pero no publica las coordenadas; solo trae un texto de localización (`EBI_LOCALIZACION_GEOGRAFICA`). La plataforma BIP Data del MDSF las muestra en su mapa, pero el 06/11/2026 no cargó ni desde Claude ni desde el navegador de DIFOI.
- **Montos atípicos.** 2 obras declaran montos contratados superiores a 50.000 MM$ y se marcan con ⚠.
- **Vínculo aproximado por nombre.** Se usa para las obras sin código BIP y para las que traen un código que no está en la base del radar.
  - *Método.* Similitud coseno TF-IDF entre el título de la obra y el nombre de cada iniciativa, con palabras y pares de palabras, sin tildes, conectores ni nombres de comuna, y con abreviaturas normalizadas (MEJ., CONST., APR y otras).
  - *Candidatas.* Iniciativas de la misma comuna, o regionales con un castigo de 0,08, que tengan alguna postulación a ejecución y cuyo período de postulación cubra el año de la obra, desde un año antes hasta dos después.
  - *Criterio.* Se acepta la mejor candidata si su similitud es de al menos 0,50 y supera a la segunda por 0,10.
  - *Calibración.* Se probó con las 637 obras que sí traen código. El método propone iniciativa para 274 de ellas y acierta en 254, una precisión de 92,7%. Si se quita la iniciativa verdadera de las candidatas, propone una equivocada en 7,1% de los casos.
  - *Resultado.* 416 obras quedan vinculadas por nombre a 379 iniciativas, de las cuales 351 no tenían obras vinculadas por código. Con eso, las iniciativas con al menos una obra pasan de 385 a 736.
  - *Códigos con error.* De las 72 obras con un código que no está en la base, 12 coinciden por nombre con una iniciativa de código casi igual (por ejemplo, 40008587 por 40008585), lo que sugiere errores de digitación en Geo-CGR.
  - *En el tablero.* Estas obras se muestran con símbolo hueco y su similitud. Se pueden ocultar con la casilla «Incluir vínculos por nombre», y el detalle de la iniciativa las lista aparte como «Posibles obras».
- **Uso en el tablero.** El mapa de iniciativas BIP muestra por defecto las obras vinculadas a las iniciativas que pasan los filtros. La opción «Todas las obras» agrega en gris las que no tienen código BIP. Al hacer clic en una obra se abre su iniciativa en la tabla, y el detalle de cada iniciativa lista sus obras.

## Mapas interactivos (Leaflet, 6 de noviembre de 2026)
- **Un solo visor para los tres mapas.** Territorios, Empresas e Iniciativas BIP usan la misma función (`createMapL` en `app.js`). Comparten la máscara regional, los fondos en línea, el control de relleno, la vista regional, la pantalla completa, las etiquetas y la selección. El fondo que se elige en un mapa queda como inicial en los que se abren después.
- **Territorios.** Las capas de infraestructura se dibujan sobre el relleno. Las zonas de rezago van con trama, y la red vial, la transmisión eléctrica, el corredor bioceánico y el ferrocarril como líneas. Puentes y antenas se muestran como puntos. Los SSR, las sedes de educación superior, los puertos, los aeródromos, los pasos fronterizos y las subestaciones tienen ficha al pasar el cursor. Los nombres de territorios y comunas se activan desde la lista de capas, y al hacer clic en una comuna se abre su territorio.
- **Empresas.** Al hacer clic en una comuna se filtra por ella, como antes, y las comunas filtradas se marcan en ámbar.
- **Respaldo.** Sin Leaflet, cada mapa usa su versión SVG anterior.

### Mapa de iniciativas BIP
- **Librería.** Leaflet 1.9.4 desde cdnjs, con su hoja de estilos incrustada. Si la librería no carga (por ejemplo, sin internet), el tablero usa el mapa SVG anterior con las mismas funciones de filtro.
- **Geometría.** Las comunas, los territorios y el contorno regional son los mismos polígonos del paquete (UTM 18S simplificado a 180 m), convertidos a latitud y longitud en el navegador con la proyección inversa. La diferencia con pyproj es menor a 1e-7 grados.
- **Máscara.** Un polígono mundial con el contorno regional como hueco oscurece todo lo que queda fuera de La Araucanía. La navegación se limita a la región ampliada en 30% y el alejamiento mínimo es la vista regional.
- **Mapa base.** Sin fondo incluido: el 06/11/2026 se probó un relieve generado en QGIS (commit d0906e9) y se quitó a pedido de DIFOI. En Claude el mapa se ve sin fondo.
- **Fondos en línea.** OpenTopoMap (topográfico, hasta el nivel 17), Esri World Imagery (satélite, hasta el nivel 18) y OpenStreetMap (calles). Al abrir, el mapa prueba una tesela de cada uno y desactiva con un aviso los que no cargan. El fondo inicial es el primero que carga en el orden topográfico, satélite, calles. Con un fondo en línea, el relleno de las comunas parte en 40–45% para que el fondo se vea.
- **Interacción.** Al hacer clic en una barra del ranking, el mapa vuela a la comuna o el territorio, y «Quitar» vuelve a la región. Las obras abren una ficha con el botón «Ver iniciativa en la tabla». El control de relleno ajusta la opacidad de las comunas. Hay pantalla completa donde el navegador lo permite.

## Supuestos provisionales (a validar por DIFOI)
- Correspondencia entre subrubros SII y lineamientos L1–L6.
- Clasificación de proyectos por palabras clave.
- Ponderadores del simulador.
- Lista de ejecutores públicos: incluye solo las instituciones con actividad o sede verificada en la región.
- Indicadores municipales de territorio y región: promedios ponderados por población.

## Fases siguientes
- Acreditación CNA: requiere una exportación del buscador de la CNA o una tabla entregada por DIFOI.
- Matrícula SIES por sede.
- Encuesta de I+D y Encuesta de Innovación por región (descarga manual desde Observa o INE).
- Nómina del segundo llamado 2026.
- FIA.
- Seguro de cesantía.
- Serie histórica de incendios por comuna (CONAF).

## Archivos de trabajo (sesión)
Todos están en `/home/claude/frpd/`:
- `prep_frpd.py`
- `prep_infra.py`
- `prep_fin.py`
- `prep_exe.py`
- `prep_bip.py`
- `prep_ctx.py`
- `dash/` (`app.js`, `emp.js` con filtros y pestaña Empresas, `head.html`)
