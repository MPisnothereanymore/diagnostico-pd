#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Radar FRPD Araucanía — Actualizador Automático de Datos para GitHub Actions
Descarga la Cartera de Iniciativas y Compras Públicas, normaliza los datos y genera 'datos_radar.json'.
"""

import os
import sys
import json
import urllib.request
from datetime import datetime
from pathlib import Path

# URL del Web App de Apps Script (o endpoint intermediario)
APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwQm9T0XwQzSFrmpXDyECRtkaqHHTswfhO1yIFgqbHxVVwFNaCHQwNYA58OjmrpLlq9cw/exec?action=todo"

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

def obtener_datos_apps_script():
    print(f"[{datetime.now().isoformat()}] Consultando endpoint oficial...")
    req = urllib.request.Request(
        APPS_SCRIPT_URL,
        headers={"User-Agent": "RadarFRPD-Bot/1.0 (+https://github.com/)"}
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        content = resp.read().decode("utf-8").strip()
        if content.startswith("handleLiveSync("):
            content = content[len("handleLiveSync("):].rstrip(");")
        return json.loads(content)

def normalizar_datos(data):
    # Asegurar nombres de territorios en compras
    cp = data.get("comprasPublicas", {})
    compras = cp.get("ultimasCompras", [])
    
    for c in compras:
        cod_t = str(c.get("codTerritorio") or c.get("territorio") or "").strip()
        c["codTerritorio"] = cod_t
        c["territorio"] = NOMBRES_TERRITORIOS.get(cod_t, c.get("territorio") or "Regional")
        
        # Normalizar fecha a string legible si viene como entero (ej. 1102026 -> 01/10/2026)
        f = str(c.get("fecha") or "").strip()
        if f.isdigit() and len(f) in (7, 8):
            p = f.zfill(8)
            c["fecha"] = f"{p[:2]}/{p[2:4]}/{p[4:]}"

    data["fechaActualizacion"] = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    return data

def main():
    base_dir = Path(__file__).resolve().parent
    json_path = base_dir / "datos_radar.json"
    dist_json_path = base_dir / "dist" / "datos_radar.json"

    # Intentar cargar datos existentes como respaldo
    datos_existentes = None
    if json_path.exists():
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                datos_existentes = json.load(f)
        except Exception:
            pass

    try:
        data = obtener_datos_apps_script()
        data = normalizar_datos(data)
        print(f"Datos recibidos con éxito: {len(data.get('cartera', []))} iniciativas, {data.get('comprasPublicas', {}).get('totalRegistros', 0)} compras registradas.")
    except Exception as e:
        print(f"Error consultando endpoint: {e}")
        if datos_existentes:
            print("Utilizando respaldo existente de datos_radar.json")
            data = datos_existentes
        else:
            print("No hay respaldo disponible. Abortando.")
            sys.exit(1)

    # Guardar en raíz
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Guardado: {json_path}")

    # Guardar en dist si existe
    if dist_json_path.parent.exists():
        with open(dist_json_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Guardado: {dist_json_path}")

if __name__ == "__main__":
    main()
