import json
import math
import os
import re
from glob import glob


def is_num(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)


def safe_num(x, default=0.0):
    return float(x) if is_num(x) else float(default)


def month_key_from_path(path: str) -> str:
    m = re.search(r"Diario_WIND_(\d{4}-\d{2})\.json$", path.replace("\\", "/"))
    return m.group(1) if m else ""


def load_json(path: str):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def effective_saldo_row(row: dict):
    if not isinstance(row, dict):
        return None
    v = row.get("saldo_diario")
    if is_num(v):
        return float(v)
    vg = row.get("_saldo_diario_guardado")
    if is_num(vg):
        return float(vg)
    vi = row.get("imp_final")
    if is_num(vi):
        return float(vi)
    return None


def effective_benef_row(row: dict):
    if not isinstance(row, dict):
        return None
    v = row.get("beneficio_diario")
    if is_num(v):
        return float(v)
    vg = row.get("_beneficio_diario_guardado")
    if is_num(vg):
        return float(vg)
    return None


def effective_benef_acum_row(row: dict):
    if not isinstance(row, dict):
        return None
    v = row.get("beneficio_acumulado")
    if is_num(v):
        return float(v)
    vg = row.get("_beneficio_acum_guardado")
    if is_num(vg):
        return float(vg)
    return None


def client_final_saldo(client: dict) -> float:
    if not isinstance(client, dict):
        return 0.0
    # Prefer saldo_actual if present
    sa = client.get("saldo_actual")
    if is_num(sa) and sa >= 0:
        return float(sa)

    rows = client.get("datos_diarios") or []
    if not isinstance(rows, list):
        return 0.0
    # Last numeric saldo_diario / _saldo_diario_guardado / imp_final
    best = None
    for r in reversed(rows):
        if not isinstance(r, dict):
            continue
        if not is_num(r.get("fila")):
            continue
        if r.get("fila") < 15 or r.get("fila") > 1120:
            continue
        v = effective_saldo_row(r)
        if is_num(v) and v >= 0:
            best = float(v)
            break
    return float(best) if best is not None else 0.0


def client_num(client: dict, idx: int) -> int:
    if isinstance(client, dict) and is_num(client.get("numero_cliente")):
        return int(client.get("numero_cliente"))
    return idx + 1


def build_client_state(client: dict, prev_saldo: float, prev_inc: float):
    rows = client.get("datos_diarios") or []
    rows_sorted = [r for r in rows if isinstance(r, dict) and is_num(r.get("fila")) and 15 <= r.get("fila") <= 1120]
    rows_sorted.sort(key=lambda r: r.get("fila"))

    by_fila = {int(r["fila"]): r for r in rows_sorted}
    return {
        "rows": rows_sorted,
        "by_fila": by_fila,
        "ptr": 0,
        "lastSaldo": float(prev_saldo if is_num(prev_saldo) else 0.0),
        "cumInv": float(prev_inc if is_num(prev_inc) else 0.0),
        "cumBenef": 0.0,
    }


def audit_wind(data_dir: str):
    files = glob(os.path.join(data_dir, "Diario_WIND_*.json"))
    files = [f for f in files if month_key_from_path(f)]
    files.sort(key=month_key_from_path)

    report = {
        "sheet": "Diario WIND",
        "months": [month_key_from_path(f) for f in files],
        "issues": [],
        "stats": {
            "months": len(files),
            "issues": 0,
        },
    }

    prev_data = None
    prev_month = None

    for path in files:
        month = month_key_from_path(path)
        data = load_json(path)

        clientes = data.get("clientes") if isinstance(data, dict) else []
        if not isinstance(clientes, list):
            clientes = []

        datos_gen = data.get("datos_diarios_generales") if isinstance(data, dict) else []
        if not isinstance(datos_gen, list):
            datos_gen = []

        # General rows with numeric imp_final > 0
        gen_imp = []
        for d in datos_gen:
            if not isinstance(d, dict):
                continue
            fila = d.get("fila")
            if not is_num(fila) or fila < 15 or fila > 1120:
                continue
            if not d.get("fecha") or d.get("fecha") == "FECHA":
                continue
            imp = d.get("imp_final")
            if is_num(imp) and imp > 0:
                gen_imp.append((int(fila), float(imp)))
        gen_imp.sort(key=lambda x: x[0])

        # Build prev lookups by numero_cliente
        prev_by_num = {}
        prev_inc_by_num = {}
        if prev_data and isinstance(prev_data.get("clientes"), list):
            for i, pc in enumerate(prev_data.get("clientes") or []):
                if not isinstance(pc, dict):
                    continue
                num = client_num(pc, i)
                prev_by_num[num] = pc
                # prev inc total from JSON
                inc_sum = 0.0
                rows = pc.get("datos_diarios") or []
                if isinstance(rows, list):
                    for r in rows:
                        if not isinstance(r, dict):
                            continue
                        fila = r.get("fila")
                        if not is_num(fila) or fila < 15 or fila > 1120:
                            continue
                        if is_num(r.get("incremento")):
                            inc_sum += float(r.get("incremento"))
                prev_inc_by_num[num] = inc_sum

        # Prebuild state per client
        states = []
        for idx, c in enumerate(clientes):
            if not isinstance(c, dict):
                continue
            num = client_num(c, idx)
            prev_client = prev_by_num.get(num)
            prev_saldo = client_final_saldo(prev_client) if prev_client else 0.0
            prev_inc = prev_inc_by_num.get(num, 0.0)
            st = build_client_state(c, prev_saldo, prev_inc)
            states.append((num, c, st))

        # 1) Structural sanity: NaN/inf in client numeric fields
        for num, c, st in states:
            for r in st["rows"]:
                for k in (
                    "incremento",
                    "decremento",
                    "base",
                    "saldo_diario",
                    "beneficio_diario",
                    "beneficio_diario_pct",
                    "beneficio_acumulado",
                    "beneficio_acumulado_pct",
                ):
                    v = r.get(k)
                    if v is None:
                        continue
                    if isinstance(v, (int, float)) and not math.isfinite(v):
                        report["issues"].append(
                            {
                                "month": month,
                                "type": "non_finite_value",
                                "client": num,
                                "fila": int(r.get("fila")) if is_num(r.get("fila")) else None,
                                "field": k,
                                "value": v,
                            }
                        )

        # 2) Reparto: client with base<=0 receiving benefit
        # We simulate the pointer logic used in redistribuirSaldosClientesWIND.
        for fila, imp_final in gen_imp:
            clientes_activos = []
            for num, c, st in states:
                by_fila = st["by_fila"]
                if fila not in by_fila:
                    continue

                rows = st["rows"]
                while st["ptr"] < len(rows) and int(rows[st["ptr"]].get("fila")) < fila:
                    rr = rows[st["ptr"]]
                    s = effective_saldo_row(rr)
                    if is_num(s):
                        st["lastSaldo"] = float(s)
                    b = effective_benef_row(rr)
                    if is_num(b):
                        st["cumBenef"] += float(b)
                    inc_ptr = rr.get("incremento")
                    if is_num(inc_ptr):
                        st["cumInv"] += float(inc_ptr)
                    st["ptr"] += 1

                dato = by_fila[fila]
                inc = safe_num(dato.get("incremento"), 0.0)
                dec = safe_num(dato.get("decremento"), 0.0)
                base = float(st["lastSaldo"] + inc - dec)

                # effective stored fields
                benef = effective_benef_row(dato)
                saldo = effective_saldo_row(dato)

                # Flag if base<=0 but there is any positive saldo/benef in that row
                if base <= 0 and ((is_num(benef) and abs(benef) > 0.01) or (is_num(saldo) and saldo > 0.01)):
                    report["issues"].append(
                        {
                            "month": month,
                            "type": "benefit_or_saldo_with_zero_base",
                            "client": num,
                            "fila": fila,
                            "base": base,
                            "beneficio_diario": benef,
                            "saldo_diario": saldo,
                            "imp_final_general": imp_final,
                        }
                    )

                if base > 0 or inc != 0 or dec != 0:
                    clientes_activos.append((num, base))

            # Consistency check: if we have some effective saldo values, compare sum to imp_final
            # (Only when at least 5 clients have saldo to reduce false positives.)
            # NOTE: Many JSONs store nulls; this is best-effort.
            #
            # If total base is 0 but imp_final > 0 and there are active clients, flag.
            sum_base_pos = sum(b for _, b in clientes_activos if b > 0)
            if sum_base_pos == 0 and imp_final > 0 and len(clientes_activos) > 0:
                report["issues"].append(
                    {
                        "month": month,
                        "type": "imp_final_positive_but_zero_total_base",
                        "fila": fila,
                        "imp_final_general": imp_final,
                        "active_clients": len(clientes_activos),
                    }
                )

        prev_data = data
        prev_month = month

    report["stats"]["issues"] = len(report["issues"])
    return report


def main():
    repo_root = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(repo_root, "datos_mensuales")
    report = audit_wind(data_dir)

    out_json = os.path.join(repo_root, "audit_wind_report.json")
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    # Print a short summary
    print("Diario WIND audit")
    print("Months:", report["stats"]["months"])
    print("Issues:", report["stats"]["issues"])

    # Print top 30 issues
    for i, it in enumerate(report["issues"][:30]):
        print(f"{i+1:02d}", it)

    print("\nReport written:", out_json)


if __name__ == "__main__":
    main()
