import json
import math
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

ROOT = Path(__file__).resolve().parent
TARGET = ROOT / "datos_mensuales" / "Diario_WIND_2026-01.json"


def is_number(x: Any) -> bool:
    return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(float(x))


def es_celda_manual_general(fila_data: Dict[str, Any], columna: str) -> bool:
    formulas = fila_data.get("formulas") or {}
    bloqueadas = fila_data.get("bloqueadas") or {}
    tiene_formula = bool(str(formulas.get(columna, "")).strip())
    esta_bloqueada = bloqueadas.get(columna) is True
    return (not tiene_formula) and (not esta_bloqueada)


def obtener_ultima_fila_imp_final_manual(hoja: Dict[str, Any]) -> int:
    datos = hoja.get("datos_diarios_generales") or []
    max_fila = 0
    for d in datos:
        if not isinstance(d, dict):
            continue
        fila = d.get("fila")
        if not isinstance(fila, int) or fila < 15 or fila > 1120:
            continue
        fecha = d.get("fecha")
        if not fecha or str(fecha).upper() == "FECHA":
            continue
        if not es_celda_manual_general(d, "imp_final"):
            continue
        imp_final = d.get("imp_final")
        if is_number(imp_final):
            max_fila = max(max_fila, fila)
    return max_fila


def ultima_fila_movimientos_todos_clientes(hoja: Dict[str, Any]) -> int:
    last = 0
    for c in (hoja.get("clientes") or []):
        if not isinstance(c, dict):
            continue
        for d in (c.get("datos_diarios") or []):
            if not isinstance(d, dict):
                continue
            fila = d.get("fila")
            if not isinstance(fila, int):
                continue
            inc = d.get("incremento")
            dec = d.get("decremento")
            if (is_number(inc) and float(inc) != 0) or (is_number(dec) and float(dec) != 0):
                last = max(last, fila)
    return last


def ultima_fila_movimientos_cliente(cliente: Dict[str, Any]) -> int:
    last = 0
    for d in (cliente.get("datos_diarios") or []):
        if not isinstance(d, dict):
            continue
        fila = d.get("fila")
        if not isinstance(fila, int):
            continue
        inc = d.get("incremento")
        dec = d.get("decremento")
        if (is_number(inc) and float(inc) != 0) or (is_number(dec) and float(dec) != 0):
            last = max(last, fila)
    return last


def main() -> int:
    if not TARGET.exists():
        print(f"ERROR: No existe {TARGET}")
        return 2

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = ROOT / f"backup_wind_cleanup_{ts}"
    backup_dir.mkdir(parents=True, exist_ok=True)
    backup_path = backup_dir / TARGET.name
    shutil.copy2(TARGET, backup_path)
    print(f"Backup creado: {backup_path}")

    with TARGET.open("r", encoding="utf-8") as f:
        hoja = json.load(f)

    datos_gen = hoja.get("datos_diarios_generales") or []
    clientes = hoja.get("clientes") or []

    # Mapa general por fila
    gen_by_fila = {}
    for d in datos_gen:
        if isinstance(d, dict) and isinstance(d.get("fila"), int):
            gen_by_fila[int(d["fila"])] = d

    last_manual_imp_final = obtener_ultima_fila_imp_final_manual(hoja)
    last_mov = ultima_fila_movimientos_todos_clientes(hoja)
    limite_general = max((last_manual_imp_final + 1) if last_manual_imp_final > 0 else 0, last_mov)

    cambios = 0

    # 1) General: limpiar imp_inicial fuera de límite
    for d in datos_gen:
        if not isinstance(d, dict):
            continue
        fila = d.get("fila")
        if not isinstance(fila, int) or fila < 15 or fila > 1120:
            continue
        if limite_general > 0 and fila > limite_general:
            if d.get("imp_inicial") not in (None, ""):
                d["imp_inicial"] = None
                cambios += 1

    # 2) General: limpiar beneficios si no hay imp_final manual
    for d in datos_gen:
        if not isinstance(d, dict):
            continue
        fila = d.get("fila")
        if not isinstance(fila, int) or fila < 15 or fila > 1120:
            continue
        tiene_imp_final_manual = bool(es_celda_manual_general(d, "imp_final") and is_number(d.get("imp_final")))
        if tiene_imp_final_manual:
            continue
        for campo in ("benef_euro", "benef_porcentaje", "benef_euro_acum", "benef_porcentaje_acum"):
            if d.get(campo) is not None:
                d[campo] = None
                cambios += 1

    # 3) Clientes: limpiar cálculos fuera de límite / clientes sin movimientos
    campos_calc = (
        "base",
        "saldo_diario",
        "beneficio_diario",
        "beneficio_diario_pct",
        "beneficio_acumulado",
        "beneficio_acumulado_pct",
    )

    for idx, c in enumerate(clientes):
        if not isinstance(c, dict):
            continue
        last_mov_cli = ultima_fila_movimientos_cliente(c)

        if last_mov_cli == 0:
            # Cliente sin movimientos: limpiar todo cálculo
            for row in (c.get("datos_diarios") or []):
                if not isinstance(row, dict):
                    continue
                fila = row.get("fila")
                if not isinstance(fila, int) or fila < 15 or fila > 1120:
                    continue
                for campo in campos_calc:
                    if row.get(campo) is not None:
                        row[campo] = None
                        cambios += 1
            continue

        limite_cli = max(last_mov_cli, last_manual_imp_final)

        for row in (c.get("datos_diarios") or []):
            if not isinstance(row, dict):
                continue
            fila = row.get("fila")
            if not isinstance(fila, int) or fila < 15 or fila > 1120:
                continue

            if fila > limite_cli:
                for campo in campos_calc:
                    if row.get(campo) is not None:
                        row[campo] = None
                        cambios += 1
                continue

            # Dentro de límite: si hay beneficio pero no hay imp_final manual general en esa fila, limpiar beneficios
            dg = gen_by_fila.get(fila)
            ok_imp_final_manual = bool(dg and es_celda_manual_general(dg, "imp_final") and is_number(dg.get("imp_final")))
            if not ok_imp_final_manual:
                for campo in ("beneficio_diario", "beneficio_diario_pct", "beneficio_acumulado_pct"):
                    if row.get(campo) is not None:
                        row[campo] = None
                        cambios += 1

    with TARGET.open("w", encoding="utf-8") as f:
        json.dump(hoja, f, ensure_ascii=False, separators=(",", ":"))

    print(f"OK: Limpieza aplicada sobre {TARGET.name}. Cambios={cambios}. limite_general={limite_general} last_imp_final_manual={last_manual_imp_final}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
