# extrair_fontes.py
#
# Extrai as fontes TTF embutidas em um PDF, revela o nome real
# (lendo a tabela `name` interna do TTF) e gera um CSS @font-face
# pronto para embutir no HTML — garantindo render idêntico em
# qualquer máquina, sem depender de fontes do sistema.
#
# Uso:
#   python extrair_fontes.py

from __future__ import annotations

import sys
import subprocess
import importlib
import base64
from pathlib import Path


# ════════════════════════════════════════════════════════════════════
#  BOOTSTRAP
# ════════════════════════════════════════════════════════════════════

def garantir_dependencia(nome_import: str, nome_pip: str | None = None) -> None:
    pacote = nome_pip or nome_import
    try:
        importlib.import_module(nome_import)
        return
    except ImportError:
        print(f"[setup] Instalando {pacote}...")
    try:
        subprocess.check_call([
            sys.executable, "-m", "pip", "install",
            "--disable-pip-version-check", "-q", pacote,
        ])
    except subprocess.CalledProcessError:
        print(f"[erro] Falha ao instalar {pacote}")
        sys.exit(1)


garantir_dependencia("pymupdf")
garantir_dependencia("fontTools")

import pymupdf           # noqa: E402
from fontTools.ttLib import TTFont, TTLibError  # noqa: E402


# ════════════════════════════════════════════════════════════════════
#  NOMES — tabela `name` do TTF (IDs que interessam)
# ════════════════════════════════════════════════════════════════════
#  Docs: https://learn.microsoft.com/en-us/typography/opentype/spec/name
#
#  nameID 1 = Font Family          (ex: "Times New Roman")
#  nameID 2 = Font Subfamily       (ex: "Regular", "Bold")
#  nameID 3 = Unique ID             (ex: "Monotype:Times New Roman Regular:...")
#  nameID 4 = Full font name        (ex: "Times New Roman Bold")
#  nameID 6 = PostScript name       (ex: "TimesNewRomanPS-BoldMT")
#  nameID 16 = Typographic Family
#  nameID 17 = Typographic Subfamily

def ler_nome_ttf(fonte: TTFont, name_id: int) -> str | None:
    """Lê um campo da tabela `name` do TTF, preferindo idioma en-US."""
    try:
        tabela = fonte["name"]
    except KeyError:
        return None

    # 0x0409 = inglês (EUA)
    for registro in tabela.names:
        if registro.nameID == name_id and registro.platformID == 3:
            try:
                return registro.toUnicode()
            except Exception:
                continue

    # Fallback: qualquer idioma
    for registro in tabela.names:
        if registro.nameID == name_id:
            try:
                return registro.toUnicode()
            except Exception:
                continue

    return None


def analisar_fonte(buffer: bytes) -> dict:
    """Analisa o TTF/OTF embutido e devolve os nomes legíveis."""
    from io import BytesIO

    resultado = {
        "family": None,
        "subfamily": None,
        "full_name": None,
        "postscript_name": None,
        "typo_family": None,
        "typo_subfamily": None,
        "peso_css": "400",
        "estilo_css": "normal",
    }

    try:
        fonte = TTFont(BytesIO(buffer), fontNumber=0, lazy=True)
    except TTLibError as e:
        print(f"[aviso] Não é um TTF/OTF válido: {e}")
        return resultado

    resultado["family"] = ler_nome_ttf(fonte, 1)
    resultado["subfamily"] = ler_nome_ttf(fonte, 2)
    resultado["full_name"] = ler_nome_ttf(fonte, 4)
    resultado["postscript_name"] = ler_nome_ttf(fonte, 6)
    resultado["typo_family"] = ler_nome_ttf(fonte, 16)
    resultado["typo_subfamily"] = ler_nome_ttf(fonte, 17)

    # Deriva peso/estilo para CSS
    sub = (resultado["subfamily"] or "").lower()
    if "bold" in sub:
        resultado["peso_css"] = "700"
    if "italic" in sub or "oblique" in sub:
        resultado["estilo_css"] = "italic"

    return resultado


# ════════════════════════════════════════════════════════════════════
#  SELEÇÃO DE ARQUIVO
# ════════════════════════════════════════════════════════════════════

def escolher_pdf() -> str:
    try:
        import tkinter as tk
        from tkinter import filedialog
    except ImportError:
        print("[erro] tkinter indisponível.")
        sys.exit(1)

    root = tk.Tk()
    root.withdraw()
    root.update()

    caminho = filedialog.askopenfilename(
        title="Selecione o PDF para extrair as fontes",
        filetypes=[("Arquivos PDF", "*.pdf"), ("Todos", "*.*")],
    )
    root.destroy()

    if not caminho:
        print("[cancelado]")
        sys.exit(0)
    return caminho


# ════════════════════════════════════════════════════════════════════
#  EXTRAÇÃO
# ════════════════════════════════════════════════════════════════════

def extrair_fontes(caminho_pdf: str) -> list[dict]:
    """Extrai cada TTF embutido e devolve os metadados."""
    doc = pymupdf.open(caminho_pdf)
    pasta_saida = Path(caminho_pdf).parent / "fontes-extraidas"
    pasta_saida.mkdir(exist_ok=True)

    # Coleta xrefs únicos com o nome do recurso (F1, F2...) e a extensão
    refs: dict[int, dict] = {}
    for num_pagina in range(doc.page_count):
        page = doc[num_pagina]
        try:
            for info in page.get_fonts(full=True):
                xref = info[0]
                recurso = info[4] or f"xref-{xref}"
                ext = info[1] or "ttf"
                refs[xref] = {"recurso": recurso, "ext": ext}
        except Exception:
            continue

    resultados: list[dict] = []

    for xref, meta in refs.items():
        try:
            ext = meta["ext"]
            basefont, _, tipo, buffer = doc.extract_font(xref)
        except Exception as e:
            print(f"[aviso] xref={xref}: falha extraindo — {e}")
            continue

        if not buffer:
            print(f"[aviso] xref={xref} ({basefont}): sem buffer embutido.")
            continue

        # Analisa o TTF para descobrir o nome real
        info = analisar_fonte(buffer)

        # Nome do arquivo: usa o PostScript name se existir
        nome_base = (
            info["postscript_name"]
            or info["full_name"]
            or info["family"]
            or basefont.replace("+", "-").replace(" ", "_")
        )
        # Limpa caracteres inválidos
        nome_base = "".join(
            c if c.isalnum() or c in "._-" else "_" for c in nome_base
        )

        caminho_fonte = pasta_saida / f"{nome_base}.{ext}"

        with open(caminho_fonte, "wb") as f:
            f.write(buffer)

        info["recurso"] = meta["recurso"]
        info["xref"] = xref
        info["basefont_pdf"] = basefont
        info["tipo_pdf"] = tipo
        info["ext"] = ext
        info["caminho_arquivo"] = str(caminho_fonte)
        info["buffer"] = buffer

        resultados.append(info)

    doc.close()
    return resultados


# ════════════════════════════════════════════════════════════════════
#  GERAÇÃO DO CSS @font-face
# ════════════════════════════════════════════════════════════════════

def gerar_css_base64(fontes: list[dict], familia_alvo: str = "OficioFonte") -> str:
    """
    Gera blocos @font-face com a fonte embutida em base64,
    todos apontando para o mesmo nome de família (`familia_alvo`).
    """
    linhas: list[str] = []
    linhas.append("/* ═══════════════════════════════════════════════════════")
    linhas.append("   FONTES EMBUTIDAS (base64) — extraídas do PDF original")
    linhas.append("   Família: " + familia_alvo)
    linhas.append("   ═══════════════════════════════════════════════════════ */")

    for f in fontes:
        buffer = f["buffer"]
        ext = f["ext"].lower()
        mime = "font/ttf" if ext in ("ttf", "otf") else f"font/{ext}"
        b64 = base64.b64encode(buffer).decode("ascii")

        peso = f["peso_css"]
        estilo = f["estilo_css"]

        linhas.append("")
        linhas.append(f"/* {f['recurso']} · {f['basefont_pdf']} · "
                      f"{f['full_name'] or f['family'] or '?'} */")
        linhas.append("@font-face {")
        linhas.append(f"  font-family: '{familia_alvo}';")
        linhas.append(f"  font-style: {estilo};")
        linhas.append(f"  font-weight: {peso};")
        linhas.append("  font-display: swap;")
        linhas.append(
            f"  src: url('data:{mime};base64,{b64}') format('{ext}');"
        )
        linhas.append("}")

    return "\n".join(linhas)


# ════════════════════════════════════════════════════════════════════
#  MAIN
# ════════════════════════════════════════════════════════════════════

def main() -> None:
    print()
    print("╔" + "═" * 68 + "╗")
    print("║" + " EXTRAÇÃO DE FONTES DO PDF ".center(68) + "║")
    print("╚" + "═" * 68 + "╝")
    print()

    caminho_pdf = escolher_pdf()
    print(f"[pdf] {caminho_pdf}\n")

    print("[1/3] Extraindo fontes embutidas...")
    fontes = extrair_fontes(caminho_pdf)

    if not fontes:
        print("\n[erro] Nenhuma fonte embutida encontrada. O PDF usa")
        print("       fontes do sistema (não embutidas). Nesse caso,")
        print("       use o fallback 'Times New Roman' no CSS.")
        return

    print(f"\n[2/3] Revelando os nomes reais:\n")
    print("-" * 78)
    print(f" {'RECURSO':<10} {'BASE (PDF)':<22} {'NOME REAL':<40}")
    print("-" * 78)

    for f in fontes:
        nome_real = (
            f["full_name"]
            or f["postscript_name"]
            or f["family"]
            or "(desconhecido)"
        )
        print(f" {f['recurso']:<10} {f['basefont_pdf']:<22} {nome_real:<40}")

    print("-" * 78)

    # Mostra também o PostScript name (mais técnico)
    print()
    print(" Detalhes:")
    for f in fontes:
        print(f"   {f['recurso']}:")
        print(f"     Family:      {f['family']}")
        print(f"     Subfamily:   {f['subfamily']}")
        print(f"     Full name:   {f['full_name']}")
        print(f"     PostScript:  {f['postscript_name']}")
        print(f"     CSS peso:    {f['peso_css']}")
        print(f"     CSS estilo:  {f['estilo_css']}")
        print(f"     Arquivo:     {f['caminho_arquivo']}")
        print()

    # Gera CSS com base64
    print("[3/3] Gerando CSS @font-face com base64...")
    css = gerar_css_base64(fontes)

    pasta_pdf = Path(caminho_pdf).parent
    arquivo_css = pasta_pdf / "fontes-extraidas" / "fontes.css"
    arquivo_css.write_text(css, encoding="utf-8")

    print()
    print("─" * 70)
    print(" CONCLUÍDO")
    print("─" * 70)
    print(f" Fontes extraídas: {len(fontes)}")
    print(f" Pasta:            {pasta_pdf / 'fontes-extraidas'}")
    print(f" CSS gerado:       {arquivo_css}")
    print(f" Tamanho do CSS:   {len(css) / 1024:.1f} KB")
    print()
    print(" Como usar no template HTML:")
    print()
    print("   1. Abra o arquivo fontes.css gerado")
    print("   2. Copie TODO o conteúdo")
    print("   3. Cole dentro da tag <style> do seu template,")
    print("      logo no início, antes de qualquer CSS")
    print("   4. Troque a família padrão do body:")
    print()
    print("        font-family: 'OficioFonte', 'Times New Roman', serif;")
    print()
    print("─" * 70)

    # Abre a pasta
    try:
        if sys.platform.startswith("win"):
            import os
            os.startfile(pasta_pdf / "fontes-extraidas")
    except Exception:
        pass


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[cancelado]")
        sys.exit(130)
    except Exception as e:
        import traceback
        print(f"\n[erro] {type(e).__name__}: {e}")
        traceback.print_exc()
        sys.exit(1)