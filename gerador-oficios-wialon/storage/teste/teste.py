from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import CellIsRule

wb = Workbook()

# ============ HELPERS ============
def F(**kw): return Font(name="Calibri", **kw)
def P(c): return PatternFill("solid", fgColor=c)
def A(**kw): return Alignment(vertical="center", **kw)
def B(style="thin", color="808080"):
    s = Side(style=style, color=color)
    return Border(left=s, right=s, top=s, bottom=s)
def BOX(l="thin", r="thin", t="thin", b="thin", c="808080"):
    return Border(left=Side(style=l, color=c), right=Side(style=r, color=c),
                  top=Side(style=t, color=c), bottom=Side(style=b, color=c))

# ============ CORES ============
NAVY="1F3864"; AZUL="2E75B6"; AZUL_C="D9E2F3"; CINZA="595959"
CINZA_C="F2F2F2"; AMARELO="FFF2CC"; VERDE="C6EFCE"; VERDE_F="006100"
AZUL_B="DDEBF7"; AZUL_F="1F4E78"; LARANJA="FFEB9C"; LARANJA_F="9C6500"
VERMELHO="FFC7CE"; VERM_F="9C0006"; VERDE_STATUS="70AD47"
LARANJA_STATUS="ED7D31"; VERM_STATUS="C00000"; ROXO="7030A0"; ROXO_C="E4DFEC"
TAB_ESTADO="2E75B6"; TAB_HIST="7030A0"; TAB_DOC="C00000"; TAB_ANALISE="70AD47"

# ============ DADOS ============
dados_ativos = [
    ["ATV-001","ABC1D23","Cavalo","Locado","Locadora X",152340,"B","2026-09-28"],
    ["ATV-002","DEF4G56","Carreta","Próprio","",82300,"A","2026-09-28"],
    ["ATV-003","GHI7J89","Van","Locado","Locadora Y",98750,"C","2026-09-27"],
    ["ATV-004","JKL0M12","Gerador","Próprio","",4200,"D","2026-09-26"],
    ["ATV-005","MNO3P45","Moto","Próprio","",18400,"A","2026-09-25"],
]
dados_sub = [
    ["SUB-001","ATV-001","Motor","Funcional","A","Nenhuma","Baixa"],
    ["SUB-002","ATV-001","Câmbio","Funcional","A","Nenhuma","Baixa"],
    ["SUB-003","ATV-001","Freios","Degradado","B","Trocar pastilhas","Média"],
    ["SUB-004","ATV-002","Motor","Funcional","A","Nenhuma","Baixa"],
    ["SUB-005","ATV-002","Câmbio","Funcional","A","Nenhuma","Baixa"],
    ["SUB-006","ATV-002","Suspensão","Funcional","A","Nenhuma","Baixa"],
    ["SUB-007","ATV-003","Motor","Degradado","B","Revisar injeção","Média"],
    ["SUB-008","ATV-003","Freios","Degradado","C","Trocar discos","Alta"],
    ["SUB-009","ATV-003","Elétrica","Funcional","A","Nenhuma","Baixa"],
    ["SUB-010","ATV-004","Motor","Inoperante","D","Diagnóstico urgente","Alta"],
    ["SUB-011","ATV-004","Bateria","Inoperante","D","Substituir","Alta"],
    ["SUB-012","ATV-004","Alternador","Degradado","C","Revisar","Alta"],
    ["SUB-013","ATV-005","Motor","Funcional","A","Nenhuma","Baixa"],
    ["SUB-014","ATV-005","Freios","Funcional","A","Nenhuma","Baixa"],
    ["SUB-015","ATV-005","Pneus","Funcional","A","Nenhuma","Baixa"],
]
dados_pneus = [
    ["PNE-001","ATV-001","1E","Michelin","295/80",8,"Instalado"],
    ["PNE-002","ATV-001","1D","Michelin","295/80",7,"Instalado"],
    ["PNE-003","ATV-001","2E","Michelin","295/80",6,"Instalado"],
    ["PNE-004","ATV-001","2D","Michelin","295/80",6,"Instalado"],
    ["PNE-005","ATV-001","3E","Bridgestone","295/80",4,"Instalado"],
    ["PNE-006","ATV-001","3D","Bridgestone","295/80",3,"Instalado"],
    ["PNE-007","ATV-002","1E","Pirelli","295/80",9,"Instalado"],
    ["PNE-008","ATV-002","1D","Pirelli","295/80",9,"Instalado"],
    ["PNE-009","ATV-002","2E","Pirelli","295/80",8,"Instalado"],
    ["PNE-010","ATV-002","2D","Pirelli","295/80",8,"Instalado"],
    ["PNE-011","ATV-003","1E","Goodyear","225/75",6,"Instalado"],
    ["PNE-012","ATV-003","1D","Goodyear","225/75",5,"Instalado"],
    ["PNE-013","ATV-003","2E","Goodyear","225/75",2,"Condenado"],
    ["PNE-014","ATV-003","2D","Goodyear","225/75",6,"Instalado"],
    ["PNE-015","ATV-004","-","Pirelli","295/80",2,"Condenado"],
    ["PNE-016","ATV-004","-","Pirelli","295/80",3,"Condenado"],
    ["PNE-017","ATV-005","1E","Michelin","120/70",7,"Instalado"],
    ["PNE-018","ATV-005","1D","Michelin","120/70",6,"Instalado"],
    ["PNE-019","ATV-002","-","Bridgestone","295/80",10,"Estoque"],
    ["PNE-020","ATV-001","-","Michelin","295/80",9,"Estoque"],
]
dados_oco = [
    ["OCO-001","ATV-001","Avaria","Para-choque trincado","Média","Aberta","2026-09-28"],
    ["OCO-002","ATV-001","Pendência","Documento CRLV vencendo","Baixa","Aberta","2026-09-28"],
    ["OCO-003","ATV-001","Falha","Vazamento de óleo","Alta","Em Correção","2026-09-25"],
    ["OCO-004","ATV-002","Pendência","Revisão dos 80.000 km","Baixa","Resolvida","2026-09-20"],
    ["OCO-005","ATV-002","Avaria","Risco na porta lateral","Baixa","Resolvida","2026-09-15"],
    ["OCO-006","ATV-002","Falha","Luz de injeção acesa","Média","Em Correção","2026-09-26"],
    ["OCO-007","ATV-003","Avaria","Para-brisa trincado","Alta","Aberta","2026-09-27"],
    ["OCO-008","ATV-003","Falha","Freio traseiro fraco","Alta","Aberta","2026-09-27"],
    ["OCO-009","ATV-003","Pendência","Seguro a vencer","Média","Aberta","2026-09-24"],
    ["OCO-010","ATV-003","Avaria","Amassado lateral direita","Baixa","Resolvida","2026-09-10"],
    ["OCO-011","ATV-004","Falha","Não liga","Crítica","Aberta","2026-09-26"],
    ["OCO-012","ATV-004","Falha","Bateria descarregando","Crítica","Em Correção","2026-09-26"],
    ["OCO-013","ATV-004","Falha","Alternador com ruído","Alta","Aberta","2026-09-26"],
    ["OCO-014","ATV-004","Pendência","Manutenção preventiva atrasada","Média","Aberta","2026-09-22"],
    ["OCO-015","ATV-004","Avaria","Painel com falha de leitura","Média","Em Correção","2026-09-25"],
    ["OCO-016","ATV-005","Avaria","Retrovisor quebrado","Baixa","Resolvida","2026-09-18"],
    ["OCO-017","ATV-005","Pendência","Troca de óleo agendada","Baixa","Resolvida","2026-09-19"],
    ["OCO-018","ATV-005","Falha","Farol baixo queimado","Baixa","Aberta","2026-09-28"],
    ["OCO-019","ATV-001","Falha","Pneu dianteiro esvaziando","Média","Aberta","2026-09-28"],
    ["OCO-020","ATV-003","Falha","Ar-condicionado sem gelar","Baixa","Aberta","2026-09-28"],
]
dados_inspecoes = [
    ["INS-006","ATV-004","2026-09-26","Kaká","C","D",4200,"Motor travou; bloqueio técnico"],
    ["INS-005","ATV-003","2026-09-27","Kaká","B","C",98750,"Freios e injeção degradaram"],
    ["INS-004","ATV-005","2026-09-25","Kaká","A","A",18400,"Sem alteração"],
    ["INS-003","ATV-002","2026-09-28","Kaká","A","A",82300,"Sem alteração"],
    ["INS-002","ATV-001","2026-09-28","Kaká","A","B",152340,"Freios degradados"],
    ["INS-001","ATV-001","2026-07-15","Kaká","—","A",148000,"Inspeção inicial"],
]
dados_eventos = [
    ["EVE-008","2026-09-28","ATV-001","Inspeção","INS-002","Classificação A → B","A","B","Kaká"],
    ["EVE-007","2026-09-28","ATV-001","Mudança Subativo","SUB-003","Freios: Funcional → Degradado","A","B","Kaká"],
    ["EVE-006","2026-09-28","ATV-001","Ocorrência Aberta","OCO-019","Pneu dianteiro esvaziando","—","Aberta","Kaká"],
    ["EVE-005","2026-09-27","ATV-003","Inspeção","INS-005","Classificação B → C","B","C","Kaká"],
    ["EVE-004","2026-09-26","ATV-004","Ativo Bloqueado","INS-006","Classificação C → D","C","D","Kaká"],
    ["EVE-003","2026-09-25","ATV-001","Ocorrência Aberta","OCO-003","Vazamento de óleo","—","Aberta","Kaká"],
    ["EVE-002","2026-09-20","ATV-002","Ocorrência Resolvida","OCO-004","Revisão concluída","Aberta","Resolvida","Estagiário"],
    ["EVE-001","2026-07-15","ATV-001","Inspeção","INS-001","Inspeção inicial","—","A","Kaká"],
]

# ================================================================
# ============ 1. ABA CAPA =======================================
# ================================================================
capa = wb.active
capa.title = "CAPA"
capa.sheet_properties.tabColor = NAVY

for col, w in {"A":18,"B":14,"C":18,"D":14,"E":18,"F":14,"G":18,"H":14}.items():
    capa.column_dimensions[col].width = w

# Header institucional
capa.merge_cells("A1:H1")
c = capa["A1"]; c.value = "FORCE  ·  GESTÃO DE ATIVOS E OPERAÇÕES"
c.font = F(size=20, bold=True, color="FFFFFF"); c.fill = P(NAVY)
c.alignment = A(horizontal="center"); capa.row_dimensions[1].height = 42

capa.merge_cells("A2:H2")
c = capa["A2"]; c.value = "Painel de Controle  ·  Passaporte Técnico do Ativo"
c.font = F(size=12, italic=True, color="FFFFFF"); c.fill = P(NAVY)
c.alignment = A(horizontal="center"); capa.row_dimensions[2].height = 24
capa.row_dimensions[3].height = 12

# Cards
cards = [
    ("A", "B", "TOTAL DE ATIVOS",      '=COUNTA(ATIVO_PAI!A2:A1000)',  AZUL),
    ("C", "D", "ATIVOS CRÍTICOS (C+D)", '=COUNTIF(ATIVO_PAI!G2:G1000,"C")+COUNTIF(ATIVO_PAI!G2:G1000,"D")', VERM_STATUS),
    ("E", "F", "ALERTAS ABERTOS",      '=COUNTIF(OCORRENCIAS!F2:F1000,"Aberta")', LARANJA_STATUS),
    ("G", "H", "INSPEÇÕES REGISTRADAS",'=COUNTA(INSPECOES!A2:A1000)', ROXO),
]
for col1, col2, titulo, formula, cor in cards:
    capa.merge_cells(f"{col1}4:{col2}4")
    c = capa[f"{col1}4"]; c.value = titulo
    c.font = F(size=10, bold=True, color="FFFFFF"); c.fill = P(cor)
    c.alignment = A(horizontal="center"); c.border = B()
    capa.merge_cells(f"{col1}5:{col2}5")
    c = capa[f"{col1}5"]; c.value = formula
    c.font = F(size=26, bold=True, color=NAVY); c.fill = P(AZUL_C)
    c.alignment = A(horizontal="center"); c.border = B()

capa.row_dimensions[4].height = 22
capa.row_dimensions[5].height = 42
capa.row_dimensions[6].height = 14

# Atalhos
capa.merge_cells("A7:H7")
c = capa["A7"]; c.value = "ATALHOS RÁPIDOS"
c.font = F(size=12, bold=True, color="FFFFFF"); c.fill = P(AZUL)
c.alignment = A(horizontal="center"); capa.row_dimensions[7].height = 24

atalhos = [
    ("A8:B8", "🪪  Abrir Passaporte",  "PASSAPORTE", NAVY),
    ("C8:D8", "📊  Ver Resumo",         "RESUMO", AZUL),
    ("E8:F8", "📚  Ver Legenda",        "LEGENDA", CINZA),
    ("G8:H8", "📅  Ver Inspeções",      "INSPECOES", ROXO),
]
for ref, texto, alvo, cor in atalhos:
    capa.merge_cells(ref)
    c = capa[ref.split(":")[0]]
    c.value = texto
    c.hyperlink = f"#{alvo}!A1"
    c.font = F(size=11, bold=True, color="FFFFFF", underline="single")
    c.fill = P(cor)
    c.alignment = A(horizontal="center"); c.border = B()
capa.row_dimensions[8].height = 32
capa.row_dimensions[9].height = 14

# Últimas inspeções
capa.merge_cells("A10:H10")
c = capa["A10"]; c.value = "ÚLTIMAS INSPEÇÕES REGISTRADAS"
c.font = F(size=12, bold=True, color="FFFFFF"); c.fill = P(ROXO)
c.alignment = A(horizontal="center"); capa.row_dimensions[10].height = 24

for i, h in enumerate(["Insp_ID","Data","Ativo","Inspetor","Antes","Depois","Km","Resumo"], start=1):
    c = capa.cell(row=11, column=i, value=h)
    c.font = F(size=10, bold=True, color="FFFFFF"); c.fill = P(CINZA)
    c.alignment = A(horizontal="center"); c.border = B()
capa.row_dimensions[11].height = 20

for n in range(1, 6):
    r = 11 + n
    fill = P(ROXO_C) if (n % 2 == 0) else None
    capa.cell(row=r, column=1, value=f'=IFERROR(INSPECOES!A{n},"")')
    capa.cell(row=r, column=2, value=f'=IFERROR(INSPECOES!C{n},"")')
    capa.cell(row=r, column=3, value=f'=IFERROR(INSPECOES!B{n},"")')
    capa.cell(row=r, column=4, value=f'=IFERROR(INSPECOES!D{n},"")')
    capa.cell(row=r, column=5, value=f'=IFERROR(INSPECOES!E{n},"")')
    capa.cell(row=r, column=6, value=f'=IFERROR(INSPECOES!F{n},"")')
    capa.cell(row=r, column=7, value=f'=IFERROR(INSPECOES!G{n},"")')
    capa.cell(row=r, column=8, value=f'=IFERROR(INSPECOES!H{n},"")')
    for col in range(1, 9):
        cell = capa.cell(row=r, column=col)
        cell.font = F(size=10); cell.alignment = A(horizontal="left", indent=1)
        cell.border = B()
        if fill: cell.fill = fill
    capa.row_dimensions[r].height = 18

capa.row_dimensions[17].height = 14

# Como usar
capa.merge_cells("A18:H18")
c = capa["A18"]; c.value = "COMO USAR ESTA PLANILHA"
c.font = F(size=12, bold=True, color="FFFFFF"); c.fill = P(VERDE_STATUS)
c.alignment = A(horizontal="center"); capa.row_dimensions[18].height = 24

instrucoes = [
    "1.  Selecione um ativo no dropdown do PASSAPORTE para ver a ficha completa.",
    "2.  Quando o Kaká faz uma inspeção, registre em INSPECOES e atualize ATIVO_PAI.",
    "3.  Toda mudança relevante (subativo, pneu, ocorrência) gera linha em EVENTOS.",
    "4.  O RESUMO mostra a situação geral e as pendências. Use a aba ALERTAS.",
    "5.  Classificações, status e tipos estão explicados na aba LEGENDA.",
    "6.  Nunca apague linhas de INSPECOES e EVENTOS. Histórico é sempre adicionado.",
]
for i, txt in enumerate(instrucoes, start=19):
    capa.merge_cells(f"A{i}:H{i}")
    c = capa[f"A{i}"]; c.value = txt
    c.font = F(size=11); c.alignment = A(horizontal="left", indent=1)
    c.border = B()
    capa.row_dimensions[i].height = 20

# ================================================================
# ============ 2. ABA ATIVO_PAI ==================================
# ================================================================
ws = wb.create_sheet("ATIVO_PAI")
ws.sheet_properties.tabColor = TAB_ESTADO
ws.append(["Asset_ID","Placa","Tipo","Proprio_Locado","Locador","Km/Horimetro","Classificacao","Data_Inspecao"])
for r in dados_ativos: ws.append(r)

# ================================================================
# ============ 3. ABA SUBATIVOS ==================================
# ================================================================
ws = wb.create_sheet("SUBATIVOS")
ws.sheet_properties.tabColor = TAB_ESTADO
ws.append(["Sub_ID","Asset_ID","Nome","Estado","Classificacao","Acao","Prioridade"])
for r in dados_sub: ws.append(r)

# ================================================================
# ============ 4. ABA PNEUS ======================================
# ================================================================
ws = wb.create_sheet("PNEUS")
ws.sheet_properties.tabColor = TAB_ESTADO
ws.append(["Pneu_ID","Asset_ID","Posicao","Marca","Medida","Sulco","Status"])
for r in dados_pneus: ws.append(r)

# ================================================================
# ============ 5. ABA OCORRENCIAS ================================
# ================================================================
ws = wb.create_sheet("OCORRENCIAS")
ws.sheet_properties.tabColor = TAB_ESTADO
ws.append(["Oco_ID","Asset_ID","Tipo","Descricao","Gravidade","Status","Data"])
for r in dados_oco: ws.append(r)

# ================================================================
# ============ 6. ABA INSPECOES ==================================
# ================================================================
ws = wb.create_sheet("INSPECOES")
ws.sheet_properties.tabColor = TAB_HIST
ws.append(["Insp_ID","Asset_ID","Data","Inspecionado_Por","Class_Antes","Class_Depois","Km_Horimetro","Resumo"])
for r in dados_inspecoes: ws.append(r)

# ================================================================
# ============ 7. ABA EVENTOS ====================================
# ================================================================
ws = wb.create_sheet("EVENTOS")
ws.sheet_properties.tabColor = TAB_HIST
ws.append(["Evento_ID","Data","Asset_ID","Tipo","Ref_ID","Descricao","Antes","Depois","Responsavel"])
for r in dados_eventos: ws.append(r)

# ================================================================
# ============ RANKING (coluna auxiliar) =========================
# ================================================================
# Ranking vai para coluna seguinte à última coluna de dados
# SUBATIVOS/PNEUS/OCORRENCIAS: última col=G(7) → ranking em H(8)
# INSPECOES: última col=H(8) → ranking em I(9)
# EVENTOS: última col=I(9) → ranking em J(10)
formula_h = '=IF(OR($B{r}="",$B{r}<>PASSAPORTE!$B$4),"",COUNTIF($B$2:$B{r},PASSAPORTE!$B$4))'

ranking_cfg = [
    ("SUBATIVOS",    15, 8, "H"),
    ("PNEUS",        20, 8, "H"),
    ("OCORRENCIAS",  20, 8, "H"),
    ("INSPECOES",     6, 9, "I"),
    ("EVENTOS",       8, 10, "J"),
]
for nome, ultima, col_idx, col_letter in ranking_cfg:
    ws_ref = wb[nome]
    for r in range(2, ultima + 2):
        ws_ref.cell(row=r, column=col_idx, value=formula_h.format(r=r))
    ws_ref.column_dimensions[col_letter].hidden = True

# ================================================================
# ============ RESUMO ============================================
# ================================================================
ws = wb.create_sheet("RESUMO")
ws.sheet_properties.tabColor = TAB_ANALISE

ws.merge_cells("A1:G1")
c = ws["A1"]; c.value = "RESUMO GERAL"
c.font = F(size=16, bold=True, color="FFFFFF"); c.fill = P(NAVY)
c.alignment = A(horizontal="center"); ws.row_dimensions[1].height = 32

ws["A2"] = "Indicador"; ws["B2"] = "Valor"
ws["A3"] = "Total de ativos";       ws["B3"] = '=COUNTA(ATIVO_PAI!A2:A1000)'
ws["A4"] = "Ativos classe A";       ws["B4"] = '=COUNTIF(ATIVO_PAI!G2:G1000,"A")'
ws["A5"] = "Ativos classe B";       ws["B5"] = '=COUNTIF(ATIVO_PAI!G2:G1000,"B")'
ws["A6"] = "Ativos classe C";       ws["B6"] = '=COUNTIF(ATIVO_PAI!G2:G1000,"C")'
ws["A7"] = "Ativos classe D";       ws["B7"] = '=COUNTIF(ATIVO_PAI!G2:G1000,"D")'
ws["A8"] = "Ocorrências abertas";   ws["B8"] = '=COUNTIF(OCORRENCIAS!F2:F1000,"Aberta")'
ws["A9"] = "Subativos degradados";  ws["B9"] = '=COUNTIF(SUBATIVOS!D2:D1000,"Degradado")'
ws["A10"] = "Subativos inoperantes";ws["B10"] = '=COUNTIF(SUBATIVOS!D2:D1000,"Inoperante")'
ws["A11"] = "Pneus condenados";     ws["B11"] = '=COUNTIF(PNEUS!G2:G1000,"Condenado")'
ws["A12"] = "Inspeções registradas";ws["B12"] = '=COUNTA(INSPECOES!A2:A1000)'
ws["A13"] = "Eventos registrados";  ws["B13"] = '=COUNTA(EVENTOS!A2:A1000)'

for r in range(2, 14):
    ca = ws.cell(row=r, column=1); cb = ws.cell(row=r, column=2)
    ca.font = F(size=11); ca.alignment = A(horizontal="left", indent=1); ca.border = B()
    cb.font = F(size=11, bold=True); cb.alignment = A(horizontal="center"); cb.border = B()
    if r % 2 == 0: ca.fill = P(CINZA_C); cb.fill = P(CINZA_C)
ws["A2"].font = F(size=11, bold=True, color="FFFFFF"); ws["A2"].fill = P(CINZA)
ws["B2"].font = F(size=11, bold=True, color="FFFFFF"); ws["B2"].fill = P(CINZA)

# Bloco pendências
ws["A15"] = "PENDÊNCIAS POR ATIVO"
ws.merge_cells("A15:G15")
ws["A15"].font = F(size=12, bold=True, color="FFFFFF")
ws["A15"].fill = P(AZUL); ws["A15"].alignment = A(horizontal="center")
ws.row_dimensions[15].height = 24

cabs = ["Asset_ID","Placa","Classificação","Ocor. Abertas",
        "Subat. Degradados","Pneus Condenados","Status Geral"]
for i, h in enumerate(cabs, start=1):
    c = ws.cell(row=16, column=i, value=h)
    c.font = F(size=11, bold=True, color="FFFFFF"); c.fill = P(CINZA)
    c.alignment = A(horizontal="center"); c.border = B()

for idx, r in enumerate(dados_ativos, start=17):
    asset = r[0]
    ws.cell(row=idx, column=1, value=asset)
    ws.cell(row=idx, column=2, value=f'=VLOOKUP(A{idx},ATIVO_PAI!A:H,2,0)')
    ws.cell(row=idx, column=3, value=f'=VLOOKUP(A{idx},ATIVO_PAI!A:H,7,0)')
    ws.cell(row=idx, column=4, value=f'=COUNTIFS(OCORRENCIAS!B:B,A{idx},OCORRENCIAS!F:F,"Aberta")')
    ws.cell(row=idx, column=5, value=f'=COUNTIFS(SUBATIVOS!B:B,A{idx},SUBATIVOS!D:D,"Degradado")')
    ws.cell(row=idx, column=6, value=f'=COUNTIFS(PNEUS!B:B,A{idx},PNEUS!G:G,"Condenado")')
    ws.cell(row=idx, column=7, value=(
        f'=IF(OR(C{idx}="D",'
        f'COUNTIFS(SUBATIVOS!B:B,A{idx},SUBATIVOS!D:D,"Inoperante")>0,'
        f'F{idx}>0),"Crítico",'
        f'IF(OR(C{idx}="C",D{idx}>0,E{idx}>0),"Atenção","OK"))'))
    for col in range(1, 8):
        cell = ws.cell(row=idx, column=col)
        cell.border = B(); cell.font = F(size=11); cell.alignment = A(horizontal="center")
        if idx % 2 == 0: cell.fill = P(CINZA_C)

# Cor automática do Status Geral
ws.conditional_formatting.add(f"G17:G{16+len(dados_ativos)}",
    CellIsRule(operator="equal", formula=['"Crítico"'],
               fill=P(VERM_STATUS), font=F(size=11, bold=True, color="FFFFFF")))
ws.conditional_formatting.add(f"G17:G{16+len(dados_ativos)}",
    CellIsRule(operator="equal", formula=['"Atenção"'],
               fill=P(LARANJA_STATUS), font=F(size=11, bold=True, color="FFFFFF")))
ws.conditional_formatting.add(f"G17:G{16+len(dados_ativos)}",
    CellIsRule(operator="equal", formula=['"OK"'],
               fill=P(VERDE_STATUS), font=F(size=11, bold=True, color="FFFFFF")))

linha_alertas = 17 + len(dados_ativos) + 1
ws.cell(row=linha_alertas, column=1, value="ALERTAS — OCORRÊNCIAS ABERTAS")
ws.merge_cells(start_row=linha_alertas, start_column=1, end_row=linha_alertas, end_column=7)
ws.cell(row=linha_alertas, column=1).font = F(size=12, bold=True, color="FFFFFF")
ws.cell(row=linha_alertas, column=1).fill = P(AZUL)
ws.cell(row=linha_alertas, column=1).alignment = A(horizontal="center")
ws.row_dimensions[linha_alertas].height = 24

linha_cab_al = linha_alertas + 1
cabs_al = ["Oco_ID","Asset_ID","Placa","Tipo","Descrição","Gravidade","Status"]
for i, h in enumerate(cabs_al, start=1):
    c = ws.cell(row=linha_cab_al, column=i, value=h)
    c.font = F(size=11, bold=True, color="FFFFFF"); c.fill = P(CINZA)
    c.alignment = A(horizontal="center"); c.border = B()

for n in range(1, 11):
    r = linha_cab_al + n
    ws.cell(row=r, column=1, value="")
    ws.cell(row=r, column=2, value=f'=IF(A{r}="","",VLOOKUP(A{r},OCORRENCIAS!A:B,2,0))')
    ws.cell(row=r, column=3, value=f'=IF(B{r}="","",VLOOKUP(B{r},ATIVO_PAI!A:B,2,0))')
    ws.cell(row=r, column=4, value=f'=IF(A{r}="","",VLOOKUP(A{r},OCORRENCIAS!A:C,3,0))')
    ws.cell(row=r, column=5, value=f'=IF(A{r}="","",VLOOKUP(A{r},OCORRENCIAS!A:D,4,0))')
    ws.cell(row=r, column=6, value=f'=IF(A{r}="","",VLOOKUP(A{r},OCORRENCIAS!A:E,5,0))')
    ws.cell(row=r, column=7, value=f'=IF(A{r}="","",VLOOKUP(A{r},OCORRENCIAS!A:F,6,0))')
    for col in range(1, 8):
        cell = ws.cell(row=r, column=col)
        cell.border = B(); cell.font = F(size=11); cell.alignment = A(horizontal="left", indent=1)

ws.column_dimensions["A"].width = 22
for col in "BCDEFG": ws.column_dimensions[col].width = 20

# ================================================================
# ============ PASSAPORTE ========================================
# ================================================================
ws = wb.create_sheet("PASSAPORTE")
ws.sheet_properties.tabColor = TAB_DOC

for col, w in {"A":22,"B":16,"C":16,"D":16,"E":24,"F":16}.items():
    ws.column_dimensions[col].width = w

ws.merge_cells("A1:F1")
c = ws["A1"]; c.value = "PASSAPORTE TÉCNICO DO ATIVO"
c.font = F(size=20, bold=True, color="FFFFFF"); c.fill = P(NAVY)
c.alignment = A(horizontal="center"); ws.row_dimensions[1].height = 38

ws.merge_cells("A2:F2")
c = ws["A2"]; c.value = "FORCE   ·   Gestão de Ativos e Operações   ·   Documento de Controle Patrimonial"
c.font = F(size=10, italic=True, color="FFFFFF"); c.fill = P(NAVY)
c.alignment = A(horizontal="center"); ws.row_dimensions[2].height = 20
ws.row_dimensions[3].height = 6

c = ws["A4"]; c.value = "SELECIONE O ATIVO"
c.font = F(size=10, bold=True, color="FFFFFF"); c.fill = P(AZUL)
c.alignment = A(horizontal="center"); c.border = B()
ws.merge_cells("B4:C4")
c = ws["B4"]; c.value = "ATV-001"
c.font = F(size=14, bold=True, color=NAVY); c.fill = P(AMARELO)
c.alignment = A(horizontal="center")
c.border = BOX(l="medium", r="medium", t="medium", b="medium", c=NAVY)
c = ws["D4"]; c.value = "STATUS GERAL"
c.font = F(size=10, bold=True, color="FFFFFF"); c.fill = P(AZUL)
c.alignment = A(horizontal="center"); c.border = B()
ws.merge_cells("E4:F4")
status_formula = (
    '=IF(OR(VLOOKUP($B$4,ATIVO_PAI!A:H,7,0)="D",'
    'COUNTIFS(SUBATIVOS!B:B,$B$4,SUBATIVOS!D:D,"Inoperante")>0,'
    'COUNTIFS(PNEUS!B:B,$B$4,PNEUS!G:G,"Condenado")>0),"Crítico",'
    'IF(OR(VLOOKUP($B$4,ATIVO_PAI!A:H,7,0)="C",'
    'COUNTIFS(OCORRENCIAS!B:B,$B$4,OCORRENCIAS!F:F,"Aberta")>0,'
    'COUNTIFS(SUBATIVOS!B:B,$B$4,SUBATIVOS!D:D,"Degradado")>0),"Atenção","OK"))'
)
c = ws["E4"]; c.value = status_formula
c.font = F(size=14, bold=True, color="FFFFFF")
c.alignment = A(horizontal="center")
c.border = BOX(l="medium", r="medium", t="medium", b="medium", c=NAVY)
ws.conditional_formatting.add("E4", CellIsRule(operator="equal", formula=['"Crítico"'], fill=P(VERM_STATUS)))
ws.conditional_formatting.add("E4", CellIsRule(operator="equal", formula=['"Atenção"'], fill=P(LARANJA_STATUS)))
ws.conditional_formatting.add("E4", CellIsRule(operator="equal", formula=['"OK"'], fill=P(VERDE_STATUS)))
ws.row_dimensions[4].height = 32
ws.row_dimensions[5].height = 8

# Bloco 1: Identificação
ws.merge_cells("A6:F6")
c = ws["A6"]; c.value = "  1.   IDENTIFICAÇÃO DO ATIVO"
c.font = F(size=12, bold=True, color="FFFFFF"); c.fill = P(AZUL)
c.alignment = A(horizontal="left"); ws.row_dimensions[6].height = 26

ident = [
    ("Asset ID",         '=IFERROR(VLOOKUP($B$4,ATIVO_PAI!A:H,1,0),"")'),
    ("Placa",            '=IFERROR(VLOOKUP($B$4,ATIVO_PAI!A:H,2,0),"")'),
    ("Tipo",             '=IFERROR(VLOOKUP($B$4,ATIVO_PAI!A:H,3,0),"")'),
    ("Próprio/Locado",   '=IFERROR(VLOOKUP($B$4,ATIVO_PAI!A:H,4,0),"")'),
    ("Locador",          '=IFERROR(VLOOKUP($B$4,ATIVO_PAI!A:H,5,0),"")'),
    ("Km/Horímetro",     '=IFERROR(VLOOKUP($B$4,ATIVO_PAI!A:H,6,0),"")'),
    ("Classificação",    '=IFERROR(VLOOKUP($B$4,ATIVO_PAI!A:H,7,0),"")'),
    ("Data da inspeção", '=IFERROR(VLOOKUP($B$4,ATIVO_PAI!A:H,8,0),"")'),
]
linha = 7
for rotulo, formula in ident:
    c = ws.cell(row=linha, column=1, value=rotulo)
    c.font = F(size=11, bold=True, color=NAVY); c.fill = P(AZUL_C)
    c.alignment = A(horizontal="left", indent=1); c.border = B()
    ws.merge_cells(start_row=linha, start_column=2, end_row=linha, end_column=5)
    v = ws.cell(row=linha, column=2, value=formula)
    v.font = F(size=11); v.alignment = A(horizontal="left", indent=1); v.border = B()
    for col in range(3, 6): ws.cell(row=linha, column=col).border = B()
    ws.cell(row=linha, column=6).border = B()
    ws.row_dimensions[linha].height = 22
    linha += 1

ws.conditional_formatting.add("B13", CellIsRule(operator="equal", formula=['"A"'], fill=P(VERDE), font=F(size=11, bold=True, color=VERDE_F)))
ws.conditional_formatting.add("B13", CellIsRule(operator="equal", formula=['"B"'], fill=P(AZUL_B), font=F(size=11, bold=True, color=AZUL_F)))
ws.conditional_formatting.add("B13", CellIsRule(operator="equal", formula=['"C"'], fill=P(LARANJA), font=F(size=11, bold=True, color=LARANJA_F)))
ws.conditional_formatting.add("B13", CellIsRule(operator="equal", formula=['"D"'], fill=P(VERMELHO), font=F(size=11, bold=True, color=VERM_F)))
ws.row_dimensions[15].height = 8

# Bloco 2: Histórico de inspeções
ws.merge_cells("A16:F16")
c = ws["A16"]; c.value = "  2.   HISTÓRICO DE INSPEÇÕES (5 mais recentes)"
c.font = F(size=12, bold=True, color="FFFFFF"); c.fill = P(ROXO)
c.alignment = A(horizontal="left"); ws.row_dimensions[16].height = 26

for i, h in enumerate(["Insp_ID","Data","Inspetor","Class_Antes","Class_Depois","Km"], start=1):
    c = ws.cell(row=17, column=i, value=h)
    c.font = F(size=11, bold=True, color="FFFFFF"); c.fill = P(CINZA)
    c.alignment = A(horizontal="center"); c.border = B()
ws.row_dimensions[17].height = 22

for n in range(1, 6):
    r = 17 + n
    fill = P(ROXO_C) if (n % 2 == 0) else None
    ws.cell(row=r, column=1, value=f'=IFERROR(INDEX(INSPECOES!A:A,MATCH({n},INSPECOES!$I:$I,0)),"")')
    ws.cell(row=r, column=2, value=f'=IFERROR(INDEX(INSPECOES!C:C,MATCH({n},INSPECOES!$I:$I,0)),"")')
    ws.cell(row=r, column=3, value=f'=IFERROR(INDEX(INSPECOES!D:D,MATCH({n},INSPECOES!$I:$I,0)),"")')
    ws.cell(row=r, column=4, value=f'=IFERROR(INDEX(INSPECOES!E:E,MATCH({n},INSPECOES!$I:$I,0)),"")')
    ws.cell(row=r, column=5, value=f'=IFERROR(INDEX(INSPECOES!F:F,MATCH({n},INSPECOES!$I:$I,0)),"")')
    ws.cell(row=r, column=6, value=f'=IFERROR(INDEX(INSPECOES!G:G,MATCH({n},INSPECOES!$I:$I,0)),"")')
    for col in range(1, 7):
        cell = ws.cell(row=r, column=col)
        cell.font = F(size=10); cell.alignment = A(horizontal="left", indent=1)
        cell.border = B()
        if fill: cell.fill = fill
    ws.row_dimensions[r].height = 18
ws.row_dimensions[23].height = 8

# Bloco 3: Últimos eventos
ws.merge_cells("A24:F24")
c = ws["A24"]; c.value = "  3.   ÚLTIMOS EVENTOS (5 mais recentes)"
c.font = F(size=12, bold=True, color="FFFFFF"); c.fill = P(ROXO)
c.alignment = A(horizontal="left"); ws.row_dimensions[24].height = 26

for i, h in enumerate(["Evento_ID","Data","Tipo","Descrição","Antes","Depois"], start=1):
    c = ws.cell(row=25, column=i, value=h)
    c.font = F(size=11, bold=True, color="FFFFFF"); c.fill = P(CINZA)
    c.alignment = A(horizontal="center"); c.border = B()
ws.row_dimensions[25].height = 22

for n in range(1, 6):
    r = 25 + n
    fill = P(ROXO_C) if (n % 2 == 0) else None
    ws.cell(row=r, column=1, value=f'=IFERROR(INDEX(EVENTOS!A:A,MATCH({n},EVENTOS!$J:$J,0)),"")')
    ws.cell(row=r, column=2, value=f'=IFERROR(INDEX(EVENTOS!B:B,MATCH({n},EVENTOS!$J:$J,0)),"")')
    ws.cell(row=r, column=3, value=f'=IFERROR(INDEX(EVENTOS!D:D,MATCH({n},EVENTOS!$J:$J,0)),"")')
    ws.cell(row=r, column=4, value=f'=IFERROR(INDEX(EVENTOS!F:F,MATCH({n},EVENTOS!$J:$J,0)),"")')
    ws.cell(row=r, column=5, value=f'=IFERROR(INDEX(EVENTOS!G:G,MATCH({n},EVENTOS!$J:$J,0)),"")')
    ws.cell(row=r, column=6, value=f'=IFERROR(INDEX(EVENTOS!H:H,MATCH({n},EVENTOS!$J:$J,0)),"")')
    for col in range(1, 7):
        cell = ws.cell(row=r, column=col)
        cell.font = F(size=10); cell.alignment = A(horizontal="left", indent=1)
        cell.border = B()
        if fill: cell.fill = fill
    ws.row_dimensions[r].height = 18
ws.row_dimensions[31].height = 8

# Bloco 4: Subativos
ws.merge_cells("A32:F32")
c = ws["A32"]; c.value = "  4.   SUBATIVOS"
c.font = F(size=12, bold=True, color="FFFFFF"); c.fill = P(AZUL)
c.alignment = A(horizontal="left"); ws.row_dimensions[32].height = 26

for i, h in enumerate(["Sub_ID","Nome","Estado","Classificação","Ação","Prioridade"], start=1):
    c = ws.cell(row=33, column=i, value=h)
    c.font = F(size=11, bold=True, color="FFFFFF"); c.fill = P(CINZA)
    c.alignment = A(horizontal="center"); c.border = B()
ws.row_dimensions[33].height = 22

for n in range(1, 11):
    r = 33 + n
    fill = P(CINZA_C) if (n % 2 == 0) else None
    formulas = [
        f'=IFERROR(INDEX(SUBATIVOS!A:A,MATCH({n},SUBATIVOS!$H:$H,0)),"")',
        f'=IFERROR(INDEX(SUBATIVOS!C:C,MATCH({n},SUBATIVOS!$H:$H,0)),"")',
        f'=IFERROR(INDEX(SUBATIVOS!D:D,MATCH({n},SUBATIVOS!$H:$H,0)),"")',
        f'=IFERROR(INDEX(SUBATIVOS!E:E,MATCH({n},SUBATIVOS!$H:$H,0)),"")',
        f'=IFERROR(INDEX(SUBATIVOS!F:F,MATCH({n},SUBATIVOS!$H:$H,0)),"")',
        f'=IFERROR(INDEX(SUBATIVOS!G:G,MATCH({n},SUBATIVOS!$H:$H,0)),"")',
    ]
    for col, formula in enumerate(formulas, start=1):
        cell = ws.cell(row=r, column=col, value=formula)
        cell.font = F(size=10); cell.alignment = A(horizontal="left", indent=1)
        cell.border = B()
        if fill: cell.fill = fill
    ws.row_dimensions[r].height = 18
ws.row_dimensions[44].height = 8

# Bloco 5: Pneus
ws.merge_cells("A45:F45")
c = ws["A45"]; c.value = "  5.   PNEUS"
c.font = F(size=12, bold=True, color="FFFFFF"); c.fill = P(AZUL)
c.alignment = A(horizontal="left"); ws.row_dimensions[45].height = 26

for i, h in enumerate(["Pneu_ID","Posição","Marca","Medida","Sulco","Status"], start=1):
    c = ws.cell(row=46, column=i, value=h)
    c.font = F(size=11, bold=True, color="FFFFFF"); c.fill = P(CINZA)
    c.alignment = A(horizontal="center"); c.border = B()
ws.row_dimensions[46].height = 22

for n in range(1, 11):
    r = 46 + n
    fill = P(CINZA_C) if (n % 2 == 0) else None
    formulas = [
        f'=IFERROR(INDEX(PNEUS!A:A,MATCH({n},PNEUS!$H:$H,0)),"")',
        f'=IFERROR(INDEX(PNEUS!C:C,MATCH({n},PNEUS!$H:$H,0)),"")',
        f'=IFERROR(INDEX(PNEUS!D:D,MATCH({n},PNEUS!$H:$H,0)),"")',
        f'=IFERROR(INDEX(PNEUS!E:E,MATCH({n},PNEUS!$H:$H,0)),"")',
        f'=IFERROR(INDEX(PNEUS!F:F,MATCH({n},PNEUS!$H:$H,0)),"")',
        f'=IFERROR(INDEX(PNEUS!G:G,MATCH({n},PNEUS!$H:$H,0)),"")',
    ]
    for col, formula in enumerate(formulas, start=1):
        cell = ws.cell(row=r, column=col, value=formula)
        cell.font = F(size=10); cell.alignment = A(horizontal="left", indent=1)
        cell.border = B()
        if fill: cell.fill = fill
    ws.row_dimensions[r].height = 18
ws.row_dimensions[57].height = 8

# Bloco 6: Ocorrências
ws.merge_cells("A58:F58")
c = ws["A58"]; c.value = "  6.   OCORRÊNCIAS"
c.font = F(size=12, bold=True, color="FFFFFF"); c.fill = P(AZUL)
c.alignment = A(horizontal="left"); ws.row_dimensions[58].height = 26

for i, h in enumerate(["Oco_ID","Tipo","Descrição","","Gravidade","Status"], start=1):
    c = ws.cell(row=59, column=i, value=h if h else None)
    c.font = F(size=11, bold=True, color="FFFFFF"); c.fill = P(CINZA)
    c.alignment = A(horizontal="center"); c.border = B()
ws.merge_cells("C59:D59")
ws.row_dimensions[59].height = 22

for n in range(1, 11):
    r = 59 + n
    fill = P(CINZA_C) if (n % 2 == 0) else None
    ws.cell(row=r, column=1, value=f'=IFERROR(INDEX(OCORRENCIAS!A:A,MATCH({n},OCORRENCIAS!$H:$H,0)),"")')
    ws.cell(row=r, column=2, value=f'=IFERROR(INDEX(OCORRENCIAS!C:C,MATCH({n},OCORRENCIAS!$H:$H,0)),"")')
    ws.merge_cells(start_row=r, start_column=3, end_row=r, end_column=4)
    ws.cell(row=r, column=3, value=f'=IFERROR(INDEX(OCORRENCIAS!D:D,MATCH({n},OCORRENCIAS!$H:$H,0)),"")')
    ws.cell(row=r, column=5, value=f'=IFERROR(INDEX(OCORRENCIAS!E:E,MATCH({n},OCORRENCIAS!$H:$H,0)),"")')
    ws.cell(row=r, column=6, value=f'=IFERROR(INDEX(OCORRENCIAS!F:F,MATCH({n},OCORRENCIAS!$H:$H,0)),"")')
    for col in range(1, 7):
        cell = ws.cell(row=r, column=col)
        cell.font = F(size=10); cell.alignment = A(horizontal="left", indent=1)
        cell.border = B()
        if fill: cell.fill = fill
    ws.row_dimensions[r].height = 18
ws.row_dimensions[70].height = 8

# Bloco 7: Registro fotográfico
ws.merge_cells("A71:F71")
c = ws["A71"]; c.value = "  7.   REGISTRO FOTOGRÁFICO"
c.font = F(size=12, bold=True, color="FFFFFF"); c.fill = P(AZUL)
c.alignment = A(horizontal="left"); ws.row_dimensions[71].height = 26

ws.merge_cells("A72:F74")
c = ws["A72"]
c.value = "(inserir aqui as fotos da inspeção ou links das evidências)"
c.font = F(size=10, italic=True, color="808080")
c.alignment = A(horizontal="center")
for r in range(72, 75):
    for col in range(1, 7): ws.cell(row=r, column=col).border = B()
    ws.row_dimensions[r].height = 22
ws.row_dimensions[75].height = 12

# Assinaturas
ws.merge_cells("A76:C76")
c = ws["A76"]; c.value = "________________________________________"
c.font = F(size=11); c.alignment = A(horizontal="center")
ws.merge_cells("D76:F76")
c = ws["D76"]; c.value = "________________________________________"
c.font = F(size=11); c.alignment = A(horizontal="center")
ws.merge_cells("A77:C77")
c = ws["A77"]; c.value = "Kaká — Inspeção Técnica"
c.font = F(size=10, italic=True, color=CINZA); c.alignment = A(horizontal="center")
ws.merge_cells("D77:F77")
c = ws["D77"]; c.value = "Estagiário — Registro Administrativo"
c.font = F(size=10, italic=True, color=CINZA); c.alignment = A(horizontal="center")
ws.row_dimensions[76].height = 22
ws.row_dimensions[77].height = 18

dv = DataValidation(type="list", formula1="=ATIVO_PAI!$A$2:$A$1000", allow_blank=True)
ws.add_data_validation(dv); dv.add(ws["B4"])

ws.page_setup.orientation = "landscape"
ws.page_setup.fitToWidth = 1
ws.page_setup.fitToHeight = 0
ws.sheet_properties.pageSetUpPr.fitToPage = True
ws.page_margins.left = 0.5; ws.page_margins.right = 0.5
ws.page_margins.top = 0.5;  ws.page_margins.bottom = 0.5
ws.print_title_rows = "1:4"
ws.freeze_panes = "A5"

# ================================================================
# ============ LEGENDA ===========================================
# ================================================================
ws = wb.create_sheet("LEGENDA")
ws.sheet_properties.tabColor = "808080"
for col, w in {"A":24,"B":16,"C":70}.items():
    ws.column_dimensions[col].width = w

ws.merge_cells("A1:C1")
c = ws["A1"]; c.value = "LEGENDA  ·  GLOSSÁRIO E REGRAS"
c.font = F(size=16, bold=True, color="FFFFFF"); c.fill = P(NAVY)
c.alignment = A(horizontal="center"); ws.row_dimensions[1].height = 34
ws.row_dimensions[2].height = 10

blocos = [
    ("1. CLASSIFICAÇÃO DO ATIVO (A/B/C/D)", [
        ("A — APTO",              "Verde",    "Operacional, seguro, sem pendência relevante."),
        ("B — APTO COM PENDÊNCIA","Azul",     "Pode operar, mas possui intervenção programável."),
        ("C — CRÍTICO",           "Laranja",  "Risco significativo de indisponibilidade."),
        ("D — INAPTO",            "Vermelho", "Risco incompatível com operação; bloqueio técnico."),
    ]),
    ("2. ESTADO DE SUBATIVO", [
        ("Funcional",  "Verde",    "Operando normalmente."),
        ("Degradado",  "Laranja",  "Opera, mas com desgaste ou falha programável."),
        ("Inoperante", "Vermelho", "Não opera; requer intervenção imediata."),
    ]),
    ("3. STATUS DE PNEU", [
        ("Instalado", "Verde",   "Em uso no veículo."),
        ("Estoque",   "Azul",    "Disponível para uso."),
        ("Condenado", "Vermelho","Fora de uso; descarte ou recapagem."),
    ]),
    ("4. STATUS DE OCORRÊNCIA", [
        ("Aberta",      "Vermelho", "Registrada, sem tratativa iniciada."),
        ("Em Correção", "Laranja",  "Em tratativa."),
        ("Resolvida",   "Verde",    "Finalizada."),
    ]),
    ("5. GRAVIDADE DE OCORRÊNCIA", [
        ("Baixa",   "Cinza",    "Sem impacto imediato."),
        ("Média",   "Amarelo",  "Atenção; pode evoluir."),
        ("Alta",    "Laranja",  "Prioridade; impacto operacional."),
        ("Crítica", "Vermelho", "Risco imediato; ação urgente."),
    ]),
]

linha = 3
for titulo, itens in blocos:
    ws.merge_cells(start_row=linha, start_column=1, end_row=linha, end_column=3)
    c = ws.cell(row=linha, column=1, value=titulo)
    c.font = F(size=12, bold=True, color="FFFFFF"); c.fill = P(AZUL)
    c.alignment = A(horizontal="left", indent=1); ws.row_dimensions[linha].height = 24
    linha += 1
    for nome, cor, desc in itens:
        c = ws.cell(row=linha, column=1, value=nome); c.font = F(size=11, bold=True)
        c.alignment = A(horizontal="left", indent=1); c.border = B()
        c = ws.cell(row=linha, column=2, value=cor); c.font = F(size=11)
        c.alignment = A(horizontal="center"); c.border = B()
        c = ws.cell(row=linha, column=3, value=desc); c.font = F(size=11)
        c.alignment = A(horizontal="left", indent=1); c.border = B()
        ws.row_dimensions[linha].height = 20
        linha += 1
    linha += 1

# Regras de ouro
ws.merge_cells(start_row=linha, start_column=1, end_row=linha, end_column=3)
c = ws.cell(row=linha, column=1, value="6. REGRAS DE OURO")
c.font = F(size=12, bold=True, color="FFFFFF"); c.fill = P(VERDE_STATUS)
c.alignment = A(horizontal="left", indent=1); ws.row_dimensions[linha].height = 24
linha += 1

regras = [
    "Estado atual SOBRESCREVE. Histórico sempre ADICIONA.",
    "Nunca apague linhas de INSPECOES ou EVENTOS.",
    "Toda mudança de classificação exige linha em INSPECOES e EVENTOS.",
    "Toda mudança de subativo, pneu ou ocorrência gera linha em EVENTOS.",
    "Antes de alterar, confira o ID do ativo. Erro de ID quebra as conexões.",
    "Se algo parecer errado, verifique se há espaços extras nos IDs.",
]
for txt in regras:
    ws.merge_cells(start_row=linha, start_column=1, end_row=linha, end_column=3)
    c = ws.cell(row=linha, column=1, value="•  " + txt)
    c.font = F(size=11); c.alignment = A(horizontal="left", indent=1)
    c.border = B(); ws.row_dimensions[linha].height = 20
    linha += 1

# ================================================================
# ============ VALIDAÇÕES DE DADOS ===============================
# ================================================================
# Listas reutilizáveis
listas = {
    "classificacao": '"A,B,C,D"',
    "estado_sub":    '"Funcional,Degradado,Inoperante"',
    "prioridade":    '"Baixa,Média,Alta"',
    "pneu_status":   '"Instalado,Estoque,Condenado,Recapado"',
    "oco_tipo":      '"Avaria,Falha,Pendência"',
    "oco_grav":      '"Baixa,Média,Alta,Crítica"',
    "oco_status":    '"Aberta,Em Correção,Resolvida"',
    "proprio":       '"Próprio,Locado"',
    "tipo_ativo":    '"Cavalo,Carreta,Van,Utilitário,Moto,Gerador,Equipamento"',
    "evento_tipo":   '"Inspeção,Mudança Subativo,Ocorrência Aberta,Ocorrência Resolvida,Pneu Instalado,Pneu Condenado,Ativo Bloqueado,Ativo Liberado,Devolução Locador,Troca de Locador,Vencimento Documento"',
}

def aplicar_validacao(sheet, col_letter, lista_key, limite=500):
    ws_ref = wb[sheet]
    dv = DataValidation(type="list", formula1=listas[lista_key], allow_blank=True,
                        showErrorMessage=True, errorTitle="Valor inválido",
                        error="Escolha um valor da lista.")
    ws_ref.add_data_validation(dv)
    dv.add(f"{col_letter}2:{col_letter}{limite}")

aplicar_validacao("ATIVO_PAI",   "C", "tipo_ativo")
aplicar_validacao("ATIVO_PAI",   "D", "proprio")
aplicar_validacao("ATIVO_PAI",   "G", "classificacao")
aplicar_validacao("SUBATIVOS",   "D", "estado_sub")
aplicar_validacao("SUBATIVOS",   "E", "classificacao")
aplicar_validacao("SUBATIVOS",   "G", "prioridade")
aplicar_validacao("PNEUS",       "G", "pneu_status")
aplicar_validacao("OCORRENCIAS", "C", "oco_tipo")
aplicar_validacao("OCORRENCIAS", "E", "oco_grav")
aplicar_validacao("OCORRENCIAS", "F", "oco_status")
aplicar_validacao("INSPECOES",   "E", "classificacao")
aplicar_validacao("INSPECOES",   "F", "classificacao")
aplicar_validacao("EVENTOS",     "D", "evento_tipo")

# ================================================================
# ============ ESTILO DAS ABAS DE DADOS + FILTROS + FREEZE =======
# ================================================================
for nome in ["ATIVO_PAI","SUBATIVOS","PNEUS","OCORRENCIAS","INSPECOES","EVENTOS"]:
    ws_ref = wb[nome]
    for c in ws_ref[1]:
        c.font = F(size=11, bold=True, color="FFFFFF")
        c.fill = P(AZUL); c.alignment = A(horizontal="center")
    ws_ref.row_dimensions[1].height = 22
    # Autofilter
    ultima_col_letra = "H" if nome in ["ATIVO_PAI"] else (
                       "G" if nome in ["SUBATIVOS","PNEUS","OCORRENCIAS"] else
                       "H" if nome == "INSPECOES" else "I")
    ws_ref.auto_filter.ref = f"A1:{ultima_col_letra}200"
    # Freeze header
    ws_ref.freeze_panes = "A2"
    # Larguras
    for col, w in {"A":14,"B":14,"C":16,"D":18,"E":18,"F":16,"G":16,"H":22,"I":14,"J":14}.items():
        ws_ref.column_dimensions[col].width = w

# Reordena as abas
ordem = ["CAPA","PASSAPORTE","RESUMO","ATIVO_PAI","SUBATIVOS","PNEUS",
         "OCORRENCIAS","INSPECOES","EVENTOS","LEGENDA"]
for i, nome in enumerate(ordem):
    wb.move_sheet(nome, offset=(i - wb.sheetnames.index(nome)))

wb.save("Passaporte_Tecnico.xlsx")
print("Planilha criada com sucesso: Passaporte_Tecnico.xlsx")