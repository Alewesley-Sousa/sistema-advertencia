"""
Busca o motorista que estava conduzindo um veículo em uma data/hora específica.
Usa a API do Wialon via resource/get_driver_bindings.
"""

import json
import requests
from datetime import datetime

# ══════════════════════════════════════════════════════════════════
# CONFIGURAÇÕES
# ══════════════════════════════════════════════════════════════════
WIALON_API_URL = "https://hst-api.wialon.com/wialon/ajax.html"
WIALON_TOKEN = "00bdf89a68605be49fceaa8ed103fa415A364BF331FECA4EAD1BF07EE373F8534C6CED7E"
RESOURCE_ID = 401168304  # FORCE SERVIÇOS

PLACA = "SBU7G13"
DATA_MULTA = "2026-09-25 10:30:00"
MARGEM_SEGUNDOS = 300  # ± 5 min em volta da multa

# Flags Wialon para motorista:
#   0x1  → dados básicos do item (id, nm, criador, data)
#   0x2  → campos customizados
#   0x10 → dados pessoais (n, p, ls, ct, cd, ...)
FLAGS_DRIVER = 0x1 | 0x2 | 0x10


# ══════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════
def wialon(svc, params, sid=""):
    r = requests.get(WIALON_API_URL, params={
        "svc": svc, "params": json.dumps(params), "sid": sid,
    }, timeout=30)
    r.raise_for_status()
    return r.json()


def fmt(ts):
    return datetime.fromtimestamp(ts).strftime("%d/%m/%Y %H:%M:%S") if ts else "—"


# ══════════════════════════════════════════════════════════════════
# FUNÇÕES
# ══════════════════════════════════════════════════════════════════
def buscar_unit_id(sid, placa):
    """Retorna (unitId, nome) preferindo unidades reais (sem prefixo '(VD)')."""
    resp = wialon("core/search_items", {
        "spec": {
            "itemsType": "avl_unit",
            "propName": "sys_name",
            "propValueMask": f"*{placa}*",
            "sortType": "sys_name",
        },
        "force": 1, "flags": 1, "from": 0, "to": 0,
    }, sid)

    candidatos = resp.get("items", [])
    if not candidatos:
        return None, None

    reais = [u for u in candidatos if not (u.get("nm") or "").upper().startswith("(VD)")]
    escolhida = reais[0] if reais else candidatos[0]
    return escolhida["id"], escolhida.get("nm", "")


def buscar_motorista(sid, driver_id, resource_id=None):
    """
    Retorna dict com dados do motorista a partir do ID.

    Estratégia:
      1. core/search_item com flags 0x1|0x2|0x10 (mais direto)
      2. Se falhar ou vier sem nome, resource/get_driver_info (fallback)
      3. Último recurso: devolve "Motorista #ID"
    """
    if not driver_id:
        return {}

    # ── Tentativa 1: core/search_item ────────────────────────────
    try:
        resp = wialon("core/search_item", {
            "id": int(driver_id),
            "flags": FLAGS_DRIVER,
        }, sid)
        item = (resp or {}).get("item") or {}
        drv = item.get("drv") or {}

        nome = (
            drv.get("n")             # nome real do cadastro
            or item.get("nm")        # nome do item Wialon
            or drv.get("cd")         # código/matrícula
        )

        if nome:
            return {
                "id": driver_id,
                "nome": nome,
                "telefone": drv.get("p"),
                "cnh": drv.get("ls"),
                "cidade": drv.get("ct"),
                "codigo": drv.get("cd"),
            }
    except Exception as e:
        print(f"     ⚠️  core/search_item falhou: {e}")

    # ── Tentativa 2: resource/get_driver_info ────────────────────
    if resource_id:
        try:
            resp = wialon("resource/get_driver_info", {
                "itemId": resource_id,
                "col": [0],
                "id": int(driver_id),
                "flags": FLAGS_DRIVER,
            }, sid)
            drv = (resp or {}).get("driver") or {}
            nome = drv.get("n") or drv.get("cd")
            if nome:
                return {
                    "id": driver_id,
                    "nome": nome,
                    "telefone": drv.get("p"),
                    "cnh": drv.get("ls"),
                    "cidade": drv.get("ct"),
                    "codigo": drv.get("cd"),
                }
        except Exception as e:
            print(f"     ⚠️  get_driver_info falhou: {e}")

    # ── Fallback final ───────────────────────────────────────────
    return {"id": driver_id, "nome": f"Motorista #{driver_id}"}


def imprimir_motorista(info):
    """Imprime os dados do motorista formatados."""
    print(f"  🧑 {info['nome']}  (driverId: {info['id']})")

    extras = []
    if info.get("codigo"):   extras.append(f"Código: {info['codigo']}")
    if info.get("cnh"):      extras.append(f"CNH: {info['cnh']}")
    if info.get("telefone"): extras.append(f"Tel: {info['telefone']}")
    if info.get("cidade"):   extras.append(f"Cidade: {info['cidade']}")

    if extras:
        print(f"     {'  ·  '.join(extras)}")


def preparar_sessao(sid, resource_id, unit_id):
    """Adiciona recurso e unidade à sessão (necessário para consultar bindings)."""
    wialon("core/update_data_flags", {
        "spec": [
            {"type": "id", "data": resource_id, "flags": 0x100 | 0x200 | 0x40000000, "mode": 1},
            {"type": "id", "data": unit_id, "flags": 0x1, "mode": 1},
        ]
    }, sid)


def motorista_no_momento(sid, resource_id, unit_id, ts_multa):
    """Retorna o motorista ativo no instante ts_multa, ou None."""
    ts_from = ts_multa - MARGEM_SEGUNDOS
    ts_to = ts_multa + MARGEM_SEGUNDOS

    bindings = wialon("resource/get_driver_bindings", {
        "resourceId": resource_id,
        "unitId": unit_id,
        "driverId": 0,
        "timeFrom": ts_from,
        "timeTo": ts_to,
    }, sid)

    if not isinstance(bindings, dict) or "error" in bindings:
        print(f"❌ Erro na API: {bindings}")
        return None

    # Filtra só motoristas com eventos reais (ignora os [] vazios)
    eventos = []
    for driver_id, registros in bindings.items():
        if not registros:
            continue
        for reg in registros:
            if isinstance(reg, dict) and "t" in reg and "u" in reg:
                eventos.append({
                    "driverId": int(driver_id),
                    "t": reg["t"],
                    "u": reg["u"],
                })

    eventos.sort(key=lambda e: e["t"])

    # Simula linha do tempo
    motorista_ativo = None
    for ev in eventos:
        if ev["t"] > ts_multa:
            break
        if ev["u"] == unit_id:
            motorista_ativo = ev["driverId"]
        elif ev["u"] == 0:
            motorista_ativo = None

    return {
        "driverId": motorista_ativo,
        "eventos": eventos,
    } if motorista_ativo else {"driverId": None, "eventos": eventos}


# ══════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════
def main():
    print("=" * 70)
    print("  Busca de Motorista por Placa + Data/Hora")
    print("=" * 70)

    # 1. Login
    sid = wialon("token/login", {"token": WIALON_TOKEN})["eid"]
    print("✅ Login OK\n")

    # 2. Placa → unitId
    unit_id, nome = buscar_unit_id(sid, PLACA)
    if not unit_id:
        print(f"❌ Veículo '{PLACA}' não encontrado."); return
    print(f"🚗 {nome} (unitId: {unit_id})")

    # 3. Prepara sessão
    preparar_sessao(sid, RESOURCE_ID, unit_id)
    print("⚙️  Sessão preparada\n")

    # 4. Data → timestamp
    ts_multa = int(datetime.strptime(DATA_MULTA, "%Y-%m-%d %H:%M:%S").timestamp())
    ts_from = ts_multa - MARGEM_SEGUNDOS
    ts_to = ts_multa + MARGEM_SEGUNDOS

    print(f"📅 Multa: {DATA_MULTA}")
    print(f"🔎 Janela: {fmt(ts_from)} → {fmt(ts_to)}\n")

    # 5. Busca
    resultado = motorista_no_momento(sid, RESOURCE_ID, unit_id, ts_multa)

    print("=" * 70)
    if resultado["driverId"]:
        info = buscar_motorista(sid, resultado["driverId"], resource_id=RESOURCE_ID)
        print("  ✅ MOTORISTA NO MOMENTO DA MULTA")
        print("=" * 70)
        imprimir_motorista(info)
        print(f"\n  📋 Eventos no período:")
        for ev in resultado["eventos"]:
            acao = "⬅️  VINCULADO" if ev["u"] == unit_id else "➡️  DESVINCULADO"
            print(f"     • {fmt(ev['t'])}  {acao}  (driver #{ev['driverId']})")
    else:
        print("  ⚠️  Nenhum motorista vinculado nesse instante.")
        if resultado["eventos"]:
            print("\n  Eventos fora da janela exata:")
            for ev in resultado["eventos"]:
                acao = "⬅️  VINCULADO" if ev["u"] == unit_id else "➡️  DESVINCULADO"
                print(f"     • {fmt(ev['t'])}  {acao}  (driver #{ev['driverId']})")
    print("=" * 70)


if __name__ == "__main__":
    main()