#!/usr/bin/env python3
"""
OCS Inventory → Base44 Sync Script
Corre en cualquier PC con acceso a la red interna de ITAC.

Requisitos:
    pip install requests

Uso:
    python ocs_sync.py              # sync completo
    python ocs_sync.py --days 7     # solo equipos con reporte en últimos 7 días
    python ocs_sync.py --preview    # ver cambios sin aplicar
"""

import requests
import base64
import argparse
import json
import math
from datetime import datetime, timezone

# ─────────────────────────────────────────
#  CONFIGURACIÓN — editá estos valores
# ─────────────────────────────────────────
OCS_BASE_URL   = "http://inventario.ad.itac.com.ar/ocsapi/v1"
OCS_USER       = ""          # usuario OCS si requiere auth (dejá vacío si no)
OCS_PASS       = ""          # contraseña OCS si requiere auth

BASE44_APP_URL = "https://TU-APP.base44.app"   # ← reemplazá con tu dominio de app
SYNC_SECRET    = "REEMPLAZA_CON_TU_SECRET"     # ← mismo valor que OCS_SYNC_SECRET en secrets

MAX_DAYS       = 20     # días máximos sin reporte para considerar un equipo activo
BATCH_SIZE     = 50     # equipos por lote al enviar a Base44
TIMEOUT        = 15     # segundos timeout para llamadas OCS
# ─────────────────────────────────────────


def ocs_headers():
    h = {"Content-Type": "application/json", "Accept": "application/json"}
    if OCS_USER and OCS_PASS:
        token = base64.b64encode(f"{OCS_USER}:{OCS_PASS}".encode()).decode()
        h["Authorization"] = f"Basic {token}"
    return h


def ocs_get(path):
    url = f"{OCS_BASE_URL}{path}"
    resp = requests.get(url, headers=ocs_headers(), timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def fetch_section(computer_id, section):
    try:
        data = ocs_get(f"/computer/{computer_id}/{section}")
        wrapper = data.get(str(computer_id), {})
        return wrapper.get(section)
    except Exception:
        return None


def days_since(date_str):
    if not date_str:
        return 9999
    try:
        d = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        delta = datetime.now(timezone.utc) - d
        return delta.days
    except Exception:
        return 9999


def disk_size_to_gb(size_kb):
    if not size_kb or size_kb == 0:
        return ""
    gb = round(size_kb / 1024 / 1024)
    return f"{gb} GB"


def infer_storage_type(disk_name):
    if not disk_name:
        return "HDD"
    n = disk_name.upper()
    if "NVME" in n or "NVM" in n:
        return "NVMe"
    if "SSD" in n or "SOLID" in n:
        return "SSD"
    return "HDD"


def infer_ram_generation(type_str, speed):
    if type_str:
        t = type_str.upper()
        if "DDR5" in t: return "DDR5"
        if "DDR4" in t: return "DDR4"
        if "DDR3" in t: return "DDR3"
    if speed:
        s = int(speed)
        if s >= 4800: return "DDR5"
        if s >= 2133: return "DDR4"
        return "DDR3"
    return "DDR4"


def infer_ram_format(bios_type):
    if not bios_type:
        return "DIMM"
    t = bios_type.upper()
    if "NOTEBOOK" in t or "LAPTOP" in t or "PORTABLE" in t:
        return "SO-DIMM"
    return "DIMM"


def infer_type(asset_number):
    if not asset_number:
        return "cpu"
    return "notebook" if asset_number.upper().startswith("AR2150L") else "cpu"


def clean_processor(raw):
    if not raw:
        return ""
    import re
    return re.sub(r'\s*\[.*?\]\s*', '', raw).strip()


def detect_peripherals(inputs, monitors, usbdevices):
    result = {"mouse": False, "keyboard": False, "monitor": False, "camera": False}
    all_inputs = inputs if isinstance(inputs, list) else []
    all_usb = usbdevices if isinstance(usbdevices, list) else []
    all_monitors = monitors if isinstance(monitors, list) else []

    for inp in all_inputs:
        t = (inp.get("TYPE", "") or inp.get("DESCRIPTION", "") or "").upper()
        if "MOUSE" in t or "POINTING" in t: result["mouse"] = True
        if "KEYBOARD" in t or "TECLADO" in t: result["keyboard"] = True
    for usb in all_usb:
        name = (usb.get("NAME", "") or usb.get("CAPTION", "") or "").upper()
        if "MOUSE" in name: result["mouse"] = True
        if "KEYBOARD" in name or "TECLADO" in name: result["keyboard"] = True
        if "CAMERA" in name or "WEBCAM" in name or "CAM" in name: result["camera"] = True
    if len(all_monitors) > 0:
        result["monitor"] = True

    return result


def normalize_equipment(computer_id, hw, bios, cpus, storages, memories, inputs, monitors, usbdevices):
    bios_entry = (bios[0] if isinstance(bios, list) and bios else bios) or {}
    storage_entry = (storages[0] if isinstance(storages, list) and storages else None)
    mem_list = [m for m in (memories if isinstance(memories, list) else []) if int(m.get("CAPACITY", 0) or 0) > 0]
    first_mem = mem_list[0] if mem_list else {}

    asset_number = (hw.get("NAME") or "").strip()
    serial_number = (bios_entry.get("SSN") or "").strip()
    ram_mb = int(hw.get("MEMORY") or 0)
    ram_gb = f"{round(ram_mb / 1024)} GB" if ram_mb > 0 else ""
    ram_speed_raw = int(first_mem.get("SPEED") or 0)

    periph = detect_peripherals(inputs, monitors, usbdevices)

    return {
        "asset_number": asset_number,
        "type": infer_type(asset_number),
        "brand": (bios_entry.get("SMANUFACTURER") or "").strip(),
        "model": (bios_entry.get("SMODEL") or "").strip(),
        "serial_number": serial_number,
        "username": (hw.get("USERID") or "").strip(),
        "processor_model": clean_processor(hw.get("PROCESSORT")),
        "storage_capacity": disk_size_to_gb(storage_entry.get("DISKSIZE") if storage_entry else None),
        "storage_type": infer_storage_type((storage_entry.get("TYPE") or storage_entry.get("MODEL") or "") if storage_entry else ""),
        "ram_amount": ram_gb,
        "ram_slots": len(mem_list),
        "ram_speed": f"{ram_speed_raw} MHz" if ram_speed_raw > 0 else "",
        "ram_generation": infer_ram_generation(first_mem.get("TYPE"), ram_speed_raw if ram_speed_raw > 0 else None),
        "ram_format": infer_ram_format(bios_entry.get("TYPE")),
        "operating_system": (hw.get("OSNAME") or "").strip(),
        "peripherals_mouse": periph["mouse"],
        "peripherals_keyboard": periph["keyboard"],
        "peripherals_monitor": periph["monitor"],
        "peripherals_camera": periph["camera"],
        "ocs_id": int(computer_id),
        "ocs_lastdate": hw.get("LASTDATE") or "",
        "ocs_is_outdated": False,
        "ocs_days_without_report": 0,
    }


def send_to_base44(computers, mode="sync"):
    url = f"{BASE44_APP_URL}/functions/importOcsData"
    headers = {
        "Content-Type": "application/json",
        "X-Sync-Secret": SYNC_SECRET,
    }
    resp = requests.post(url, headers=headers, json={"computers": computers, "mode": mode}, timeout=60)
    resp.raise_for_status()
    return resp.json()


def main():
    parser = argparse.ArgumentParser(description="Sincroniza OCS Inventory con Base44")
    parser.add_argument("--days", type=int, default=MAX_DAYS,
                        help=f"Solo procesar equipos con reporte en los últimos N días (default: {MAX_DAYS})")
    parser.add_argument("--preview", action="store_true",
                        help="Mostrar cambios sin aplicarlos")
    parser.add_argument("--limit", type=int, default=0,
                        help="Limitar a N equipos (para pruebas)")
    args = parser.parse_args()

    mode = "preview" if args.preview else "sync"
    print(f"\n{'='*55}")
    print(f"  OCS → Base44 Sync  |  modo: {mode.upper()}  |  max {args.days} días")
    print(f"{'='*55}\n")

    # 1. Obtener lista de IDs
    print("Obteniendo lista de IDs desde OCS...")
    id_list = [e["ID"] for e in ocs_get("/computers/listID")]
    print(f"  → {len(id_list)} equipos en OCS")

    if args.limit:
        id_list = id_list[:args.limit]
        print(f"  → Limitando a {args.limit} equipos (modo test)")

    # 2. Filtrar y normalizar
    normalized_map = {}  # deduplicación por serial o asset
    skipped = 0
    errors = 0

    for i, computer_id in enumerate(id_list, 1):
        try:
            hw = fetch_section(computer_id, "hardware")
            if not hw:
                errors += 1
                continue

            report_days = days_since(hw.get("LASTDATE"))
            if report_days > args.days:
                skipped += 1
                continue

            bios, cpus, storages, memories, inputs, monitors, usbdevices = (
                fetch_section(computer_id, "bios"),
                fetch_section(computer_id, "cpus"),
                fetch_section(computer_id, "storages"),
                fetch_section(computer_id, "memories"),
                fetch_section(computer_id, "inputs"),
                fetch_section(computer_id, "monitors"),
                fetch_section(computer_id, "usbdevices"),
            )

            normalized = normalize_equipment(computer_id, hw, bios, cpus, storages, memories, inputs, monitors, usbdevices)

            # Deduplicar: clave por serial o asset
            key = f"SN:{normalized['serial_number'].upper()}" if normalized["serial_number"] \
                  else f"AN:{normalized['asset_number'].upper()}"

            if key in normalized_map:
                existing = normalized_map[key]
                if days_since(normalized["ocs_lastdate"]) < days_since(existing["ocs_lastdate"]):
                    normalized_map[key] = normalized
            else:
                normalized_map[key] = normalized

            if i % 50 == 0:
                print(f"  Procesados {i}/{len(id_list)}...")

        except Exception as e:
            errors += 1
            print(f"  ✗ Error en ID {computer_id}: {e}")

    computers = list(normalized_map.values())
    print(f"\nResumen OCS:")
    print(f"  Total IDs: {len(id_list)}")
    print(f"  Omitidos (sin reporte reciente): {skipped}")
    print(f"  Errores: {errors}")
    print(f"  A sincronizar: {len(computers)}")

    if not computers:
        print("\nNada para sincronizar.")
        return

    # 3. Enviar a Base44 en lotes
    print(f"\nEnviando a Base44 en lotes de {BATCH_SIZE}...")
    total_stats = {"created": 0, "updated": 0, "no_changes": 0, "errors": 0}
    all_preview = []

    batches = math.ceil(len(computers) / BATCH_SIZE)
    for b in range(batches):
        batch = computers[b * BATCH_SIZE:(b + 1) * BATCH_SIZE]
        result = send_to_base44(batch, mode=mode)
        s = result.get("stats", {})
        for k in total_stats:
            total_stats[k] += s.get(k, 0)
        all_preview.extend(result.get("preview", []))
        print(f"  Lote {b+1}/{batches}: +{s.get('created',0)} nuevos, ~{s.get('updated',0)} actualizados, ={s.get('no_changes',0)} sin cambios")

    # 4. Resultado final
    print(f"\n{'='*55}")
    print(f"  RESULTADO FINAL ({mode.upper()})")
    print(f"{'='*55}")
    print(f"  Nuevos creados : {total_stats['created']}")
    print(f"  Actualizados   : {total_stats['updated']}")
    print(f"  Sin cambios    : {total_stats['no_changes']}")
    print(f"  Errores        : {total_stats['errors']}")

    if all_preview:
        print(f"\nDetalle de cambios ({min(len(all_preview), 20)} primeros):")
        for item in all_preview[:20]:
            if item["action"] == "created":
                print(f"  + NUEVO: {item['asset_number']}")
            elif item["action"] == "updated":
                print(f"  ~ ACTUALIZADO: {item['asset_number']}")
                for ch in item.get("changes", []):
                    print(f"      {ch['field']}: '{ch['old']}' → '{ch['new']}'")

    print()


if __name__ == "__main__":
    main()