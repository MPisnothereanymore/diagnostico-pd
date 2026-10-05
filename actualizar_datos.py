#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Radar FRPD Araucanía — Automatización de Compras Públicas para GitHub Actions
Consulta directamente la API de Mercado Público (ChileCompra) para el GORE y las 32 municipalidades,
identifica la retención regional vs. fuga a Santiago y actualiza 'datos_radar.json'.
"""

import os
import sys
import json
import time
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path

# Configurar salida UTF-8 segura en Windows y Linux
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Ticket oficial de Mercado Público (configurable por GitHub Secret o valor por defecto)
TICKET_CHILECOMPRA = os.environ.get("CHILECOMPRA_TICKET", "2EBB5BBD-F89B-4173-A1F0-D360D98635D4")
BASE_URL_CHILECOMPRA = "https://api.mercadopublico.cl/servicios/v1/publico/ordenesdecompra.json"
APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwQm9T0XwQzSFrmpXDyECRtkaqHHTswfhO1yIFgqbHxVVwFNaCHQwNYA58OjmrpLlq9cw/exec?action=todo"

# Catálogo oficial de compradores de La Araucanía (GORE + 32 Municipalidades)
ORGANISMOS_ARAUCANIA = {
    "7013": {"nombre": "GORE La Araucanía", "comuna": "Temuco", "territorio": "TPLC"},
    "7321": {"nombre": "I. Municipalidad de Temuco", "comuna": "Temuco", "territorio": "TPLC"},
    "90886": {"nombre": "I. Municipalidad de Padre Las Casas", "comuna": "Padre Las Casas", "territorio": "TPLC"},
    "118084": {"nombre": "I. Municipalidad de Villarrica", "comuna": "Villarrica", "territorio": "LAC"},
    "86943": {"nombre": "I. Municipalidad de Pucón", "comuna": "Pucón", "territorio": "LAC"},
    "118093": {"nombre": "I. Municipalidad de Curarrehue", "comuna": "Curarrehue", "territorio": "LAC"},
    "100156": {"nombre": "I. Municipalidad de Angol", "comuna": "Angol", "territorio": "MNO"},
    "113853": {"nombre": "I. Municipalidad de Collipulli", "comuna": "Collipulli", "territorio": "MNO"},
    "118073": {"nombre": "I. Municipalidad de Renaico", "comuna": "Renaico", "territorio": "MNO"},
    "132741": {"nombre": "I. Municipalidad de Ercilla", "comuna": "Ercilla", "territorio": "MNO"},
    "124577": {"nombre": "I. Municipalidad de Lautaro", "comuna": "Lautaro", "territorio": "VCE"},
    "133899": {"nombre": "I. Municipalidad de Perquenco", "comuna": "Perquenco", "territorio": "VCE"},
    "118089": {"nombre": "I. Municipalidad de Freire", "comuna": "Freire", "territorio": "CSU"},
    "116411": {"nombre": "I. Municipalidad de Pitrufquén", "comuna": "Pitrufquén", "territorio": "CSU"},
    "117586": {"nombre": "I. Municipalidad de Gorbea", "comuna": "Gorbea", "territorio": "CSU"},
    "113851": {"nombre": "I. Municipalidad de Loncoche", "comuna": "Loncoche", "territorio": "CSU"},
    "115186": {"nombre": "I. Municipalidad de Carahue", "comuna": "Carahue", "territorio": "COS"},
    "114924": {"nombre": "I. Municipalidad de Nueva Imperial", "comuna": "Nueva Imperial", "territorio": "COS"},
    "115313": {"nombre": "I. Municipalidad de Saavedra", "comuna": "Saavedra", "territorio": "COS"},
    "115280": {"nombre": "I. Municipalidad de Teodoro Schmidt", "comuna": "Teodoro Schmidt", "territorio": "COS"},
    "117582": {"nombre": "I. Municipalidad de Toltén", "comuna": "Toltén", "territorio": "COS"},
    "116945": {"nombre": "I. Municipalidad de Purén", "comuna": "Purén", "territorio": "NAH"},
    "116408": {"nombre": "I. Municipalidad de Los Sauces", "comuna": "Los Sauces", "territorio": "NAH"},
    "115163": {"nombre": "I. Municipalidad de Traiguén", "comuna": "Traiguén", "territorio": "NAH"},
    "138211": {"nombre": "I. Municipalidad de Lumaco", "comuna": "Lumaco", "territorio": "NAH"},
    "124203": {"nombre": "I. Municipalidad de Galvarino", "comuna": "Galvarino", "territorio": "NAH"},
    "165105": {"nombre": "I. Municipalidad de Cholchol", "comuna": "Cholchol", "territorio": "NAH"},
    "116399": {"nombre": "I. Municipalidad de Victoria", "comuna": "Victoria", "territorio": "AND"},
    "119994": {"nombre": "I. Municipalidad de Lonquimay", "comuna": "Lonquimay", "territorio": "AND"},
    "121613": {"nombre": "I. Municipalidad de Curacautín", "comuna": "Curacautín", "territorio": "AND"},
    "121617": {"nombre": "I. Municipalidad de Melipeuco", "comuna": "Melipeuco", "territorio": "AND"},
    "115009": {"nombre": "I. Municipalidad de Vilcún", "comuna": "Vilcún", "territorio": "AND"},
    "129738": {"nombre": "I. Municipalidad de Cunco", "comuna": "Cunco", "territorio": "AND"}
}

NOMBRES_TERRITORIOS = {
    "TPLC": "Temuco – Padre Las Casas",
    "LAC": "Araucanía Lacustre",
    "MNO": "Malleco Norte",
    "VCE": "Valle Central",
    "CSU": "Cautín Sur",
    "COS": "Costa Araucanía",
    "NAH": "Nahuelbuta",
    "AND": "Araucanía Andina"
}

def consultar_api_chilecompra(url, reintentos=3):
    """Realiza una petición HTTP con User-Agent institucional, pausas y reintentos ante 429."""
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "RadarFRPD-GOREAraucania/1.0 (+https://github.com/)"}
    )
    for intento in range(reintentos):
        # Pausa base de 1.25s entre llamadas para respetar el límite de 1 req/seg de ChileCompra
        time.sleep(1.25)
        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                if resp.status == 200:
                    return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429:
                pausa = (intento + 1) * 2.0
                print(f"  [Límite de tasa 429] Pausando {pausa:.1f}s antes de reintentar...")
                time.sleep(pausa)
                continue
            print(f"  [Aviso] HTTP {e.code} ({url[:65]}...): {e.reason}")
            break
        except Exception as e:
            print(f"  [Aviso] Error de conexión ({url[:65]}...): {e}")
            break
    return None

def sincronizar_compras_fecha(fecha_dt, compras_existentes_map):
    """Consulta las compras de los 33 organismos para una fecha determinada."""
    fecha_str = fecha_dt.strftime("%d%m%Y")
    fecha_legible = fecha_dt.strftime("%d/%m/%Y")
    print(f"\n[Consultando] Compras públicas para fecha: {fecha_legible} ({fecha_str})")
    
    nuevas_compras = []

    for cod_org, info_org in ORGANISMOS_ARAUCANIA.items():
        url_listado = f"{BASE_URL_CHILECOMPRA}?fecha={fecha_str}&CodigoOrganismo={cod_org}&ticket={TICKET_CHILECOMPRA}"
        data_listado = consultar_api_chilecompra(url_listado)
        
        if not data_listado or "Listado" not in data_listado:
            continue
            
        listado = data_listado.get("Listado") or []
        if not listado:
            continue

        print(f"  -> {info_org['nombre']} ({info_org['comuna']}): {len(listado)} órdenes encontradas.")

        for item in listado:
            cod_oc = item.get("Codigo")
            if not cod_oc:
                continue

            # Evitar consultar detalle si ya la tenemos en la base histórica
            if cod_oc in compras_existentes_map:
                continue

            url_detalle = f"{BASE_URL_CHILECOMPRA}?codigo={cod_oc}&ticket={TICKET_CHILECOMPRA}"
            data_detalle = consultar_api_chilecompra(url_detalle)

            if not data_detalle or "Listado" not in data_detalle:
                continue

            detalles = data_detalle.get("Listado") or []
            if not detalles:
                continue

            oc = detalles[0]
            prov = oc.get("Proveedor") or {}
            reg_prov = str(prov.get("Region") or "").strip()
            es_local = "araucan" in reg_prov.lower()
            
            # Monto total
            monto_val = float(oc.get("TotalNeto") or oc.get("Total") or item.get("Total") or 0)
            
            nueva_compra = {
                "fecha": fecha_legible,
                "codigoOC": cod_oc,
                "nombre": oc.get("Nombre") or item.get("Nombre") or "Sin descripción",
                "organismo": info_org["nombre"],
                "comuna": info_org["comuna"],
                "codTerritorio": info_org["territorio"],
                "territorio": NOMBRES_TERRITORIOS.get(info_org["territorio"], info_org["territorio"]),
                "proveedor": prov.get("Nombre") or "Sin proveedor",
                "regionProveedor": reg_prov or "No especificada",
                "esLocal": es_local,
                "montoCLP": monto_val
            }
            nuevas_compras.append(nueva_compra)
            compras_existentes_map[cod_oc] = nueva_compra
            print(f"     [OK] Nueva OC: {cod_oc} | {'Local' if es_local else 'Fuga'} | ${monto_val:,.0f} CLP")

    return nuevas_compras

def main():
    base_dir = Path(__file__).resolve().parent
    json_path = base_dir / "datos_radar.json"
    dist_json_path = base_dir / "dist" / "datos_radar.json"

    # 1. Cargar datos existentes (base histórica y cartera de 42 iniciativas)
    data = {}
    if json_path.exists():
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            print(f"Error cargando datos_radar.json: {e}")

    cartera = data.get("cartera", [])
    cp_existente = data.get("comprasPublicas", {})
    compras_lista = cp_existente.get("ultimasCompras", [])

    print(f"=== Sincronizador de Compras Públicas — Radar FRPD ===")
    print(f"Cartera actual: {len(cartera)} iniciativas.")
    print(f"Base histórica existente: {len(compras_lista)} compras públicas registradas.")

    # Mapa para deduplicación rápida por código OC
    compras_map = {}
    for c in compras_lista:
        cod = c.get("codigoOC") or c.get("codigo")
        if cod:
            t_cod = c.get("codTerritorio") or c.get("territorio")
            c["territorio"] = NOMBRES_TERRITORIOS.get(t_cod, c.get("territorio"))
            compras_map[cod] = c

    # 1.1 Intentar sincronizar iniciativas y compras base desde Apps Script si está disponible
    try:
        req_as = urllib.request.Request(APPS_SCRIPT_URL, headers={"User-Agent": "RadarFRPD/1.0"})
        with urllib.request.urlopen(req_as, timeout=15) as resp_as:
            raw_as = resp_as.read().decode("utf-8").strip()
            if raw_as.startswith("handleLiveSync("):
                raw_as = raw_as[len("handleLiveSync("):].rstrip(");")
            as_data = json.loads(raw_as)
            if "cartera" in as_data and as_data["cartera"]:
                data["cartera"] = as_data["cartera"]
            as_compras = as_data.get("comprasPublicas", {}).get("ultimasCompras", [])
            for c in as_compras:
                cod = c.get("codigoOC") or c.get("codigo")
                if cod and cod not in compras_map:
                    t_cod = c.get("codTerritorio") or c.get("territorio")
                    c["territorio"] = NOMBRES_TERRITORIOS.get(t_cod, c.get("territorio"))
                    compras_map[cod] = c
            print(f"Base consolidada con fuente oficial: {len(compras_map)} compras registradas.")
    except Exception as e:
        print(f"Aviso de sincronización base: {e}")

    # 2. Consultar compras recientes (por defecto ayer, o días configurados)
    dias_atras = int(os.environ.get("DIAS_ATRAS", "1"))
    total_nuevas = 0

    for i in range(1, dias_atras + 1):
        fecha_a_consultar = datetime.now() - timedelta(days=i)
        nuevas = sincronizar_compras_fecha(fecha_a_consultar, compras_map)
        total_nuevas += len(nuevas)

    print(f"\nResumen de ingesta: {total_nuevas} compras públicas nuevas incorporadas.")

    # 3. Consolidar lista completa
    todas_las_compras = list(compras_map.values())
    
    # Recalcular métricas consolidadas
    monto_total = sum(c.get("montoCLP", 0) for c in todas_las_compras)
    monto_local = sum(c.get("montoCLP", 0) for c in todas_las_compras if c.get("esLocal"))
    pct_local = (monto_local / monto_total * 100) if monto_total > 0 else 0.0
    pct_fuga = 100.0 - pct_local

    data["comprasPublicas"] = {
        "totalRegistros": len(todas_las_compras),
        "montoTotalCLP": monto_total,
        "montoRetenidoAraucania": monto_local,
        "porcentajeRetencionLocal": f"{pct_local:.1f}%",
        "porcentajeFugaSantiago": f"{pct_fuga:.1f}%",
        "ultimasCompras": todas_las_compras
    }
    data["fechaActualizacion"] = datetime.now().strftime("%d/%m/%Y %H:%M:%S")

    # 4. Guardar datos actualizados
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Guardado exitoso: {json_path}")

    if dist_json_path.parent.exists():
        with open(dist_json_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Guardado exitoso: {dist_json_path}")

    # 5. Recompilar HTML para mantener bundle sincronizado
    try:
        build_script = base_dir / "fuente" / "build.py"
        if build_script.exists():
            import subprocess
            subprocess.run([sys.executable, str(build_script)], check=True)
            print("Bundle HTML reconstruido con éxito.")
    except Exception as e:
        print(f"Aviso al reconstruir build.py: {e}")

if __name__ == "__main__":
    main()
