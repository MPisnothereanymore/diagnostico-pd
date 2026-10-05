/**
 * ==============================================================================
 * RADAR FRPD ARAUCANÍA — SISTEMA INTEGRADO GOOGLE APPS SCRIPT
 * División de Fomento e Industria (DIFOI) — Gobierno Regional de La Araucanía
 * ==============================================================================
 * Funcionalidades:
 * 1. API GET en vivo: Expone la Cartera de Iniciativas para el Tablero Radar FRPD.
 * 2. Ingesta Diaria ChileCompra: Captura compras públicas y mide Fuga Regional.
 * 3. Menú Interactivo en Google Sheets.
 */

// Ticket oficial validado de Mercado Público
const TICKET_CHILECOMPRA = "2EBB5BBD-F89B-4173-A1F0-D360D98635D4";

// Catálogo de compradores oficiales en La Araucanía (GORE + 32 Municipalidades)
const ORGANISMOS_ARAUCANIA = {
  "7013": { nombre: "GORE La Araucanía", comuna: "Temuco", territorio: "TPLC" },
  "7321": { nombre: "I. Municipalidad de Temuco", comuna: "Temuco", territorio: "TPLC" },
  "90886": { nombre: "I. Municipalidad de Padre Las Casas", comuna: "Padre Las Casas", territorio: "TPLC" },
  "118084": { nombre: "I. Municipalidad de Villarrica", comuna: "Villarrica", territorio: "LAC" },
  "86943": { nombre: "I. Municipalidad de Pucón", comuna: "Pucón", territorio: "LAC" },
  "118093": { nombre: "I. Municipalidad de Curarrehue", comuna: "Curarrehue", territorio: "LAC" },
  "100156": { nombre: "I. Municipalidad de Angol", comuna: "Angol", territorio: "MNO" },
  "113853": { nombre: "I. Municipalidad de Collipulli", comuna: "Collipulli", territorio: "MNO" },
  "118073": { nombre: "I. Municipalidad de Renaico", comuna: "Renaico", territorio: "MNO" },
  "132741": { nombre: "I. Municipalidad de Ercilla", comuna: "Ercilla", territorio: "MNO" },
  "124577": { nombre: "I. Municipalidad de Lautaro", comuna: "Lautaro", territorio: "VCE" },
  "133899": { nombre: "I. Municipalidad de Perquenco", comuna: "Perquenco", territorio: "VCE" },
  "118089": { nombre: "I. Municipalidad de Freire", comuna: "Freire", territorio: "CSU" },
  "116411": { nombre: "I. Municipalidad de Pitrufquén", comuna: "Pitrufquén", territorio: "CSU" },
  "117586": { nombre: "I. Municipalidad de Gorbea", comuna: "Gorbea", territorio: "CSU" },
  "113851": { nombre: "I. Municipalidad de Loncoche", comuna: "Loncoche", territorio: "CSU" },
  "115186": { nombre: "I. Municipalidad de Carahue", comuna: "Carahue", territorio: "COS" },
  "114924": { nombre: "I. Municipalidad de Nueva Imperial", comuna: "Nueva Imperial", territorio: "COS" },
  "115313": { nombre: "I. Municipalidad de Saavedra", comuna: "Saavedra", territorio: "COS" },
  "115280": { nombre: "I. Municipalidad de Teodoro Schmidt", comuna: "Teodoro Schmidt", territorio: "COS" },
  "117582": { nombre: "I. Municipalidad de Toltén", comuna: "Toltén", territorio: "COS" },
  "116945": { nombre: "I. Municipalidad de Purén", comuna: "Purén", territorio: "NAH" },
  "116408": { nombre: "I. Municipalidad de Los Sauces", comuna: "Los Sauces", territorio: "NAH" },
  "115163": { nombre: "I. Municipalidad de Traiguén", comuna: "Traiguén", territorio: "NAH" },
  "138211": { nombre: "I. Municipalidad de Lumaco", comuna: "Lumaco", territorio: "NAH" },
  "124203": { nombre: "I. Municipalidad de Galvarino", comuna: "Galvarino", territorio: "NAH" },
  "165105": { nombre: "I. Municipalidad de Cholchol", comuna: "Cholchol", territorio: "NAH" },
  "116399": { nombre: "I. Municipalidad de Victoria", comuna: "Victoria", territorio: "AND" },
  "119994": { nombre: "I. Municipalidad de Lonquimay", comuna: "Lonquimay", territorio: "AND" },
  "121613": { nombre: "I. Municipalidad de Curacautín", comuna: "Curacautín", territorio: "AND" },
  "121617": { nombre: "I. Municipalidad de Melipeuco", comuna: "Melipeuco", territorio: "AND" },
  "115009": { nombre: "I. Municipalidad de Vilcún", comuna: "Vilcún", territorio: "AND" },
  "129738": { nombre: "I. Municipalidad de Cunco", comuna: "Cunco", territorio: "AND" }
};

/**
 * Agrega el menú personalizado al abrir Google Sheets
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("📡 Radar FRPD Araucanía")
    .addItem("🔍 Diagnóstico: Verificar Conexión y Drive", "verificarConfiguracion")
    .addSeparator()
    .addItem("⚡ Sincronizar Compras Públicas de Ayer", "sincronizarComprasAyer")
    .addItem("⏰ Programar Sincronización Automática Diaria (06:00 AM)", "crearTriggerDiario")
    .addSeparator()
    .addItem("🌐 Ver Enlace del Radar FRPD (Web App)", "mostrarUrlApi")
    .addToUi();
}

/**
 * Función de diagnóstico que valida Drive, hojas y concede permisos
 */
function verificarConfiguracion() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cSheet = ss.getSheetByName("1. Cartera_Iniciativas_Viva");
  const pSheet = ss.getSheetByName("Compras_Araucania");
  
  let htmlEncontrado = false;
  let nombreArchivo = "";
  try {
    const archivos = DriveApp.getFilesByName("Radar FRPD Araucanía.html");
    if (archivos.hasNext()) {
      htmlEncontrado = true;
      nombreArchivo = archivos.next().getName();
    }
  } catch (e) {
    Logger.log("Error consultando Drive: " + e);
  }
  
  const lineas = [
    "📡 DIAGNÓSTICO RADAR FRPD DIFOI:",
    "==================================================",
    `1. Hoja de Cartera de Iniciativas: ${cSheet ? "✅ OK (" + Math.max(0, cSheet.getLastRow() - 4) + " iniciativas)" : "❌ Falta hoja '1. Cartera_Iniciativas_Viva'"}`,
    `2. Hoja de Compras Araucanía: ${pSheet ? "✅ OK (" + Math.max(0, pSheet.getLastRow() - 1) + " registros)" : "⚠️ Pendiente (ejecuta 'Sincronizar Compras')"}`,
    `3. Archivo en Google Drive: ${htmlEncontrado ? "✅ ENCONTRADO ('" + nombreArchivo + "')" : "❌ NO ENCONTRADO"}`,
    "==================================================",
    htmlEncontrado 
      ? "🚀 ¡TODO LISTO! La Web App está lista para ser consultada por los funcionarios." 
      : "⚠️ ACCIÓN REQUERIDA:\nSube el archivo 'Radar FRPD Araucanía.html' a tu Google Drive para que la Web App lo despliegue automáticamente."
  ];
  
  SpreadsheetApp.getUi().alert(lineas.join("\n"));
}

/**
 * Sincroniza las Órdenes de Compra del día anterior desde ChileCompra
 */
function sincronizarComprasAyer() {
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  const fechaStr = Utilities.formatDate(ayer, "America/Santiago", "ddMMyyyy");
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Compras_Araucania");
  if (!sheet) {
    sheet = ss.insertSheet("Compras_Araucania");
    sheet.appendRow([
      "FECHA", "CODIGO_OC", "NOMBRE_COMPRA", "ORGANISMO_COMPRADOR", 
      "COMUNA_COMPRADOR", "TERRITORIO_ERD", "RUT_PROVEEDOR", 
      "PROVEEDOR", "COMUNA_PROVEEDOR", "REGION_PROVEEDOR", 
      "ES_PROVEEDOR_LOCAL", "TOTAL_CLP"
    ]);
    sheet.getRange(1, 1, 1, 12)
      .setFontWeight("bold")
      .setBackground("#1F4E78")
      .setFontColor("#FFFFFF");
  }

  let totalNuevas = 0;
  
  for (const [codOrg, infoOrg] of Object.entries(ORGANISMOS_ARAUCANIA)) {
    const url = `https://api.mercadopublico.cl/servicios/v1/publico/ordenesdecompra.json?fecha=${fechaStr}&CodigoOrganismo=${codOrg}&ticket=${TICKET_CHILECOMPRA}`;
    
    try {
      const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (resp.getResponseCode() === 200) {
        const data = JSON.parse(resp.getContentText());
        const listado = data.Listado || [];
        
        for (const item of listado) {
          Utilities.sleep(1100); // Respetar tasa de 1 req/seg de ChileCompra
          const detailUrl = `https://api.mercadopublico.cl/servicios/v1/publico/ordenesdecompra.json?codigo=${item.Codigo}&ticket=${TICKET_CHILECOMPRA}`;
          const dResp = UrlFetchApp.fetch(detailUrl, { muteHttpExceptions: true });
          
          if (dResp.getResponseCode() === 200) {
            const dData = JSON.parse(dResp.getContentText());
            if (dData.Listado && dData.Listado.length > 0) {
              const oc = dData.Listado[0];
              const prov = oc.Proveedor || {};
              const regProv = (prov.Region || "").trim();
              const esLocal = regProv.toLowerCase().includes("araucan") ? "SÍ" : "NO";
              
              sheet.appendRow([
                fechaStr,
                oc.Codigo,
                oc.Nombre,
                infoOrg.nombre,
                infoOrg.comuna,
                infoOrg.territorio,
                prov.RutSucursal || "",
                prov.Nombre || "",
                prov.Comuna || "",
                regProv,
                esLocal,
                oc.Total || 0
              ]);
              totalNuevas++;
            }
          }
        }
      }
    } catch (e) {
      Logger.log("Error consultando " + infoOrg.nombre + ": " + e);
    }
  }
  
  SpreadsheetApp.getUi().alert(`Sincronización finalizada.\nSe registraron ${totalNuevas} nuevas compras de La Araucanía para la fecha ${fechaStr}.`);
}

/**
 * SERVIDOR DE ESCRITURA Y SINCRONIZACIÓN (doPost):
 * Recibe compras públicas en lote desde GitHub Actions e inserta únicamente las que no existan.
 * Operación en bloque (Batch Write): tiempo de ejecución < 0.5 segundos.
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }
    const compras = Array.isArray(payload.compras) ? payload.compras : [];
    if (!compras.length) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "ok",
        insertadas: 0,
        mensaje: "Sin compras para procesar"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("Compras_Araucania");
    if (!sheet) {
      sheet = ss.insertSheet("Compras_Araucania");
      sheet.appendRow([
        "FECHA", "CODIGO_OC", "NOMBRE_COMPRA", "ORGANISMO_COMPRADOR", 
        "COMUNA_COMPRADOR", "TERRITORIO_ERD", "RUT_PROVEEDOR", 
        "PROVEEDOR", "COMUNA_PROVEEDOR", "REGION_PROVEEDOR", 
        "ES_PROVEEDOR_LOCAL", "TOTAL_CLP"
      ]);
      sheet.getRange(1, 1, 1, 12)
        .setFontWeight("bold")
        .setBackground("#1F4E78")
        .setFontColor("#FFFFFF");
    }

    // 1. Obtener códigos de OC existentes para deduplicación instantánea
    const lastRow = sheet.getLastRow();
    const codigosExistentes = new Set();
    if (lastRow > 1) {
      const codValues = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
      for (let i = 0; i < codValues.length; i++) {
        const c = String(codValues[i][0]).trim();
        if (c) codigosExistentes.add(c);
      }
    }

    // 2. Filtrar y preparar filas nuevas en memoria
    const filasNuevas = [];
    for (let i = 0; i < compras.length; i++) {
      const c = compras[i];
      const codOC = String(c.codigoOC || c.codigo || "").trim();
      if (!codOC || codigosExistentes.has(codOC)) continue;
      
      codigosExistentes.add(codOC);
      filasNuevas.push([
        c.fecha || "",
        codOC,
        c.nombre || "",
        c.organismo || "",
        c.comuna || "",
        c.codTerritorio || c.territorio || "",
        c.rutProveedor || "",
        c.proveedor || "",
        c.comunaProveedor || "",
        c.regionProveedor || "",
        c.esLocal ? "SÍ" : "NO",
        Number(c.montoCLP) || 0
      ]);
    }

    // 3. Inserción masiva en un solo llamado (Batch Write <0.5 seg)
    if (filasNuevas.length > 0) {
      const targetStartRow = sheet.getLastRow() + 1;
      sheet.getRange(targetStartRow, 1, filasNuevas.length, 12).setValues(filasNuevas);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "ok",
      insertadas: filasNuevas.length,
      total: sheet.getLastRow() - 1
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      mensaje: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * SERVIDOR WEB Y API GET:
 * 1. Si entra un funcionario desde el navegador: Sirve el Radar FRPD Araucanía completo con datos vivos.
 * 2. Si se consulta por API o JSONP (?action=... o ?callback=...): Devuelve JSON/JSONP.
 */
function doGet(e) {
  // A. Si se solicitan datos en formato JSON o JSONP
  if (e && e.parameter && (e.parameter.action || e.parameter.callback)) {
    return servirDatosJson(e);
  }

  // B. Si un funcionario abre el enlace en su navegador: Servir el Radar FRPD completo
  let html = "";
  try {
    const archivos = DriveApp.getFilesByName("Radar FRPD Araucanía.html");
    if (archivos.hasNext()) {
      html = archivos.next().getBlob().getDataAsString("UTF-8");
    }
  } catch (err) {
    Logger.log("Error buscando Radar FRPD Araucanía.html en Drive: " + err);
  }

  if (!html) {
    return HtmlService.createHtmlOutput(`
      <div style="font-family:sans-serif;padding:32px;max-width:600px;margin:40px auto;background:#151C21;color:#E6ECEE;border-radius:12px;border:1px solid #28333B">
        <h2 style="color:#4CC3B0;margin-top:0">Radar FRPD Araucanía · DIFOI</h2>
        <p>No se encontró el archivo <b>Radar FRPD Araucanía.html</b> en tu Google Drive.</p>
        <p style="color:#83929A;font-size:13px">Por favor sube el archivo <code>Radar FRPD Araucanía.html</code> a tu Drive institucional para que el sistema lo despliegue automáticamente.</p>
      </div>
    `).setTitle("Radar FRPD Araucanía · DIFOI");
  }

  // Inyectar datos vivos para que cargue instantáneamente sin peticiones adicionales
  const datosVivos = obtenerDatosVivos("todo");
  const inyeccion = `<script>window.DATOS_INICIALES_WORKSPACE = ${JSON.stringify(datosVivos)};</script>`;
  html = html.replace('</head>', inyeccion + '</head>');

  return HtmlService.createHtmlOutput(html)
    .setTitle("Radar FRPD Araucanía · DIFOI GORE")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function servirDatosJson(e) {
  const accion = (e && e.parameter && e.parameter.action) ? e.parameter.action : "todo";
  const respuesta = obtenerDatosVivos(accion);
  const callback = (e && e.parameter && e.parameter.callback) ? e.parameter.callback : null;
  const jsonStr = JSON.stringify(respuesta);

  if (callback) {
    return ContentService.createTextOutput(callback + '(' + jsonStr + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService.createTextOutput(jsonStr)
    .setMimeType(ContentService.MimeType.JSON);
}

function obtenerDatosVivos(accion) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const respuesta = {
    timestamp: new Date().toISOString(),
    fuente: "DIFOI - GORE Araucanía (Google Workspace)"
  };

  // 1. CARTERA DE INICIATIVAS VIVA
  if (accion === "cartera" || accion === "todo") {
    const sheetC = ss.getSheetByName("1. Cartera_Iniciativas_Viva");
    if (sheetC) {
      const dataC = sheetC.getDataRange().getValues();
      const rowsC = dataC.slice(4); // Fila 5 en adelante
      respuesta.cartera = rowsC.map(r => ({
        id: r[0],
        codLinea: r[1],
        linea: r[2],
        bloque: r[3],
        codTerr: r[4],
        territorio: r[5],
        comunas: r[6],
        codCtci: r[7],
        lineamiento: r[8],
        titulo: r[9],
        estadoGestion: r[10],
        madurez: r[11],
        presupuestoEstimadoM: r[12],
        ejecutor: r[13],
        encargadoDifoi: r[14],
        brecha: r[15],
        objetivo: r[16],
        art8: r[17],
        fechaAct: r[18]
      }));
      respuesta.totalIniciativas = respuesta.cartera.length;
    }
  }

  // 2. COMPRAS PÚBLICAS Y FUGA REGIONAL
  if (accion === "compras" || accion === "todo") {
    const sheetComp = ss.getSheetByName("Compras_Araucania");
    if (sheetComp && sheetComp.getLastRow() > 1) {
      const dataComp = sheetComp.getDataRange().getValues();
      const rowsComp = dataComp.slice(1);
      
      const nombresTerritorios = {
        "TPLC": "Temuco – Padre Las Casas",
        "LAC": "Araucanía Lacustre",
        "MNO": "Malleco Norte",
        "VCE": "Valle Central",
        "CSU": "Cautín Sur",
        "COS": "Costa Araucanía",
        "NAH": "Nahuelbuta",
        "AND": "Araucanía Andina"
      };

      const compras = rowsComp.map(r => {
        const codT = String(r[5] || "").trim();
        return {
          fecha: r[0],
          codigoOC: r[1],
          nombre: r[2],
          organismo: r[3],
          comuna: r[4],
          codTerritorio: codT,
          territorio: nombresTerritorios[codT] || codT || "Regional",
          proveedor: r[7],
          regionProveedor: r[9],
          esLocal: r[10] === "SÍ",
          montoCLP: Number(r[11]) || 0
        };
      });

      const totalMonto = compras.reduce((acc, c) => acc + c.montoCLP, 0);
      const montoLocal = compras.filter(c => c.esLocal).reduce((acc, c) => acc + c.montoCLP, 0);
      const pctLocal = totalMonto > 0 ? (montoLocal / totalMonto) * 100 : 0;

      respuesta.comprasPublicas = {
        totalRegistros: compras.length,
        montoTotalCLP: totalMonto,
        montoRetenidoAraucania: montoLocal,
        porcentajeRetencionLocal: pctLocal.toFixed(1) + "%",
        porcentajeFugaSantiago: (100 - pctLocal).toFixed(1) + "%",
        ultimasCompras: compras.slice().reverse() // Todas las compras sincronizadas
      };
    }
  }

  return respuesta;
}

/**
 * Configura el disparador automático diario a las 06:00 AM
 */
function crearTriggerDiario() {
  // Eliminar triggers existentes para evitar duplicados
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "sincronizarComprasAyer") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  ScriptApp.newTrigger("sincronizarComprasAyer")
    .timeBased()
    .atHour(6)
    .everyDays(1)
    .create();
    
  SpreadsheetApp.getUi().alert("✅ Trigger diario activo: Se sincronizará automáticamente todos los días a las 06:00 AM.");
}

function mostrarUrlApi() {
  const url = "https://script.google.com/macros/s/AKfycbwQm9T0XwQzSFrmpXDyECRtkaqHHTswfhO1yIFgqbHxVVwFNaCHQwNYA58OjmrpLlq9cw/exec";
  SpreadsheetApp.getUi().alert(
    "🌐 ENLACE OFICIAL DEL RADAR FRPD ARAUCANÍA:\n\n" +
    url + "\n\n" +
    "📌 Este enlace permite a los funcionarios de GORE Araucanía consultar el Radar interactivo en vivo directamente desde su navegador con acceso institucional."
  );
}
