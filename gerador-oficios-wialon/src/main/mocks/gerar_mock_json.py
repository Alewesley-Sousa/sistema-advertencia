import csv
import json
import time

def csv_para_json_wialon(caminho_csv, caminho_json):
    payloads = []

    with open(caminho_csv, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for index, row in enumerate(reader, start=1):
            speed = str(row.get('speed', '90')).strip()
            max_speed = str(row.get('max_speed', '80')).strip()
            pos_time = row.get('pos_time', '10.07.2025 15:52:28').strip()
            unit = row.get('unit', 'ABC-1234 - Veículo').strip()
            lat = float(row.get('latitude', -3.7431))
            lng = float(row.get('longitude', -38.5178))

            tags = {
                "SPEED": speed if "km/h" in speed else f"{speed} km/h",
                "MAX_SPEED": max_speed if "km/h" in max_speed else f"{max_speed} km/h",
                "POS_TIME": pos_time,
                "UNIT": unit
            }

            payload = {
                "item_id": 1546,
                "t": int(time.time()),
                "f": 1536,
                "tp": "task",
                "rt": int(time.time()) + 30,
                "p": {
                    "task_sub_type": 21,
                    "task_reg_type": 1,
                    "task_evt_name": "Excesso de Velocidade",
                    "task_id": f"mock-task-{index}-{int(time.time())}",
                    "task_update_time": int(time.time()),
                    "task_status": 6,
                    "task_priority": 2,
                    "task_assignee": 0,
                    "task_description": "Veículo excedeu o limite máximo de velocidade permitido na via.",
                    "task_tags": json.dumps(tags),
                    "task_comments": "[]",
                    "task_account": 1063,
                    "task_address_x": lat,
                    "task_address_y": lng,
                    "task_done_rejected": 1752152438,
                    "task_params": {}
                }
            }
            payloads.append(payload)

    with open(caminho_json, mode='w', encoding='utf-8') as f:
        json.dump(payloads, f, ensure_ascii=False, indent=2)

    print(f"✅ {len(payloads)} registros convertidos com sucesso para {caminho_json}")

if __name__ == "__main__":
    csv_para_json_wialon("dados_teste.csv", "dados_teste.json")