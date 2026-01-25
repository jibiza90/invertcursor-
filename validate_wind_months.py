import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


ROOT = Path(__file__).resolve().parent
DATOS_DIR = ROOT / "datos_mensuales"


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
        if not isinstance(fila, int):
            continue
        if fila < 15 or fila > 1120:
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


def map_general_por_fila(hoja: Dict[str, Any]) -> Dict[int, Dict[str, Any]]:
    out: Dict[int, Dict[str, Any]] = {}
    for d in (hoja.get("datos_diarios_generales") or []):
        if isinstance(d, dict) and isinstance(d.get("fila"), int):
            out[int(d["fila"])] = d
    return out


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


@dataclass
class Issue:
    code: str
    message: str
    fila: Optional[int] = None
    cliente_idx: Optional[int] = None
    campo: Optional[str] = None


def validar_mes(path: Path) -> Tuple[int, List[Issue]]:
    with path.open("r", encoding="utf-8") as f:
        hoja = json.load(f)

    issues: List[Issue] = []

    datos_gen = hoja.get("datos_diarios_generales") or []
    clientes = hoja.get("clientes") or []

    last_manual_imp_final = obtener_ultima_fila_imp_final_manual(hoja)
    last_mov = ultima_fila_movimientos_todos_clientes(hoja)

    limite_general = max((last_manual_imp_final + 1) if last_manual_imp_final > 0 else 0, last_mov)

    gen_by_fila = map_general_por_fila(hoja)

    # 1) General: imp_inicial no debe estar relleno tras el límite
    if limite_general > 0:
        for d in datos_gen:
            if not isinstance(d, dict):
                continue
            fila = d.get("fila")
            if not isinstance(fila, int) or fila < 15 or fila > 1120:
                continue
            if fila <= limite_general:
                continue
            if d.get("imp_inicial") not in (None, ""):
                issues.append(
                    Issue(
                        code="GEN_IMP_INICIAL_FUTURO",
                        message=f"imp_inicial debería estar vacío fuera de límite (limite={limite_general})",
                        fila=fila,
                        campo="imp_inicial",
                    )
                )

    # 2) General: beneficios no deberían existir si no hay imp_final manual en esa fila
    for d in datos_gen:
        if not isinstance(d, dict):
            continue
        fila = d.get("fila")
        if not isinstance(fila, int) or fila < 15 or fila > 1120:
            continue
        tiene_imp_final_manual = bool(
            es_celda_manual_general(d, "imp_final") and is_number(d.get("imp_final"))
        )
        if tiene_imp_final_manual:
            continue
        for campo in ("benef_euro", "benef_porcentaje", "benef_euro_acum", "benef_porcentaje_acum"):
            v = d.get(campo)
            # Permitimos 0 como tolerancia por datos antiguos; cualquier otro valor es inconsistencia
            if v is None:
                continue
            if is_number(v) and float(v) == 0:
                continue
            issues.append(
                Issue(
                    code="GEN_BENEF_SIN_IMP_FINAL",
                    message="beneficio no debería existir sin imp_final manual",
                    fila=fila,
                    campo=campo,
                )
            )

    # 3) Clientes: no debe haber cálculos fuera del límite por cliente
    for idx, c in enumerate(clientes):
        if not isinstance(c, dict):
            continue
        last_mov_cli = ultima_fila_movimientos_cliente(c)
        if last_mov_cli == 0:
            # Cliente sin actividad: no debería tener campos calculados
            for d in (c.get("datos_diarios") or []):
                if not isinstance(d, dict):
                    continue
                fila = d.get("fila")
                if not isinstance(fila, int) or fila < 15 or fila > 1120:
                    continue
                for campo in (
                    "base",
                    "saldo_diario",
                    "beneficio_diario",
                    "beneficio_diario_pct",
                    "beneficio_acumulado",
                    "beneficio_acumulado_pct",
                ):
                    v = d.get(campo)
                    if v is None:
                        continue
                    if is_number(v) and float(v) == 0:
                        # tolerancia
                        continue
                    issues.append(
                        Issue(
                            code="CLI_FANTASMA_SIN_MOV",
                            message="cliente sin movimientos tiene valores calculados",
                            fila=fila,
                            cliente_idx=idx,
                            campo=campo,
                        )
                    )
            continue

        limite_cli = max(last_mov_cli, last_manual_imp_final)

        for d in (c.get("datos_diarios") or []):
            if not isinstance(d, dict):
                continue
            fila = d.get("fila")
            if not isinstance(fila, int) or fila < 15 or fila > 1120:
                continue
            if fila > limite_cli:
                for campo in (
                    "base",
                    "saldo_diario",
                    "beneficio_diario",
                    "beneficio_diario_pct",
                    "beneficio_acumulado",
                    "beneficio_acumulado_pct",
                ):
                    v = d.get(campo)
                    if v is None:
                        continue
                    if is_number(v) and float(v) == 0:
                        continue
                    issues.append(
                        Issue(
                            code="CLI_CALC_FUERA_LIMITE",
                            message=f"campo calculado fuera de límite (limite={limite_cli})",
                            fila=fila,
                            cliente_idx=idx,
                            campo=campo,
                        )
                    )

            # 4) Si hay beneficio_diario, debe existir imp_final manual en general para esa fila
            vben = d.get("beneficio_diario")
            if vben is None:
                continue
            if is_number(vben) and float(vben) == 0:
                continue
            dg = gen_by_fila.get(fila)
            ok_imp_final_manual = bool(dg and es_celda_manual_general(dg, "imp_final") and is_number(dg.get("imp_final")))
            if not ok_imp_final_manual:
                issues.append(
                    Issue(
                        code="CLI_BENEF_SIN_IMP_FINAL_GENERAL",
                        message="beneficio_diario existe pero no hay imp_final manual en general para esa fila",
                        fila=fila,
                        cliente_idx=idx,
                        campo="beneficio_diario",
                    )
                )

    return limite_general, issues


def main() -> int:
    if not DATOS_DIR.exists():
        print(f"ERROR: No existe la carpeta {DATOS_DIR}")
        return 2

    files = sorted(DATOS_DIR.glob("Diario_WIND_*.json"))
    if not files:
        print(f"ERROR: No encontré archivos Diario_WIND_*.json en {DATOS_DIR}")
        return 2

    any_errors = False
    print(f"Validando {len(files)} meses de Diario WIND en: {DATOS_DIR}")
    print("-")

    for p in files:
        try:
            limite, issues = validar_mes(p)
        except Exception as e:
            any_errors = True
            print(f"{p.name}: ERROR al leer/validar -> {e}")
            continue

        if not issues:
            print(f"{p.name}: OK (limite_general={limite})")
            continue

        any_errors = True
        print(f"{p.name}: {len(issues)} inconsistencias (limite_general={limite})")
        for it in issues[:12]:
            loc = []
            if it.cliente_idx is not None:
                loc.append(f"cliente={it.cliente_idx + 1}")
            if it.fila is not None:
                loc.append(f"fila={it.fila}")
            if it.campo:
                loc.append(f"campo={it.campo}")
            loc_txt = ", ".join(loc) if loc else ""
            print(f"  - {it.code}: {it.message}{(' [' + loc_txt + ']') if loc_txt else ''}")
        if len(issues) > 12:
            print(f"  ... y {len(issues) - 12} más")

    print("-")
    if any_errors:
        print("Resultado: HAY inconsistencias en algunos meses (ver arriba).")
        return 1

    print("Resultado: TODO OK en todos los meses de Diario WIND.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
