# extrair_html_pdf.py
#
# Reconstrói HTML + CSS de um PDF a partir da geometria real.
# O resultado é uma reprodução visual fiel, pronta para ser
# posteriormente refatorada em HTML semântico.
#
# Uso:
#   python extrair_html_pdf.py
#
# Dependência (instala sozinho): PyMuPDF

from __future__ import annotations

import sys
import subprocess
import importlib
import base64
import html as html_lib
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

import pymupdf  # noqa: E402


# ════════════════════════════════════════════════════════════════════
#  MAPA DE FONTES — nome técnico do PDF → nome amigável em CSS
# ════════════════════════════════════════════════════════════════════

MAPA_FONTES = {
    "timesnewroman": "Times New Roman",
    "timesnewromanpsmt": "Times New Roman",
    "timesnewromanps-boldmt": "Times New Roman",
    "timesnewromanpsmtitalic": "Times New Roman",
    "timesnewromanps-bolditalicmt": "Times New Roman",
    "arialmt": "Arial",
    "arial-boldmt": "Arial",
    "arialmtitalic": "Arial",
    "arial-boldmtitalic": "Arial",
    "helvetica": "Helvetica",
    "helveticabold": "Helvetica",
    "couriernewpsmt": "Courier New",
    "couriernewps-boldmt": "Courier New",
    "georgia": "Georgia",
    "calibri": "Calibri",
    "cambria": "Cambria",
    "verdana": "Verdana",
    "opensans": "Open Sans",
    "roboto": "Roboto",
}


def limpar_nome_fonte(nome: str) -> str:
    """Remove prefixo de subset (ex: 'ABCDEE+') e devolve nome amigável."""
    if len(nome) > 7 and nome[6] == "+" and nome[:6].isalpha() and nome[:6].isupper():
        nome = nome[7:]

    chave = nome.lower().replace(" ", "").replace("-", "")
    for k, v in MAPA_FONTES.items():
        if k in chave:
            return v

    return nome


def flags_para_peso_estilo(flags: int) -> tuple[str, str, bool]:
    """Devolve (peso_css, estilo_css, is_serif)."""
    italico = bool(flags & (1 << 1))
    serifado = bool(flags & (1 << 2))
    negrito = bool(flags & (1 << 4))
    peso = "700" if negrito else "400"
    estilo = "italic" if italico else "normal"
    return peso, estilo, serifado


# ════════════════════════════════════════════════════════════════════
#  CORES
# ════════════════════════════════════════════════════════════════════

def cor_texto_para_hex(cor: int) -> str:
    """PyMuPDF devolve a cor de texto como inteiro sRGB."""
    return f"#{cor & 0xFFFFFF:06x}"


def cor_vetor_para_css(cor) -> str:
    """PyMuPDF devolve cores de vetor como tuple (0..1)."""
    if cor is None:
        return "none"
    if isinstance(cor, (int, float)):
        return f"#{int(cor) & 0xFFFFFF:06x}"
    if isinstance(cor, (tuple, list)):
        if len(cor) == 1:
            v = int(cor[0] * 255)
            return f"rgb({v},{v},{v})"
        if len(cor) == 3:
            r, g, b = cor
            return f"rgb({int(r*255)},{int(g*255)},{int(b*255)})"
        if len(cor) == 4:
            r, g, b, a = cor
            return f"rgba({int(r*255)},{int(g*255)},{int(b*255)},{a:.3f})"
    return "none"


# ════════════════════════════════════════════════════════════════════
#  SELEÇÃO DE ARQUIVO
# ════════════════════════════════════════════════════════════════════

def escolher_pdf() -> str:
    try:
        import tkinter as tk
        from tkinter import filedialog
    except ImportError:
        print("[erro] tkinter indisponível. No Linux: sudo apt install python3-tk")
        sys.exit(1)

    root = tk.Tk()
    root.withdraw()
    root.update()

    caminho = filedialog.askopenfilename(
        title="Selecione o PDF para extrair HTML/CSS",
        filetypes=[("Arquivos PDF", "*.pdf"), ("Todos", "*.*")],
    )
    root.destroy()

    if not caminho:
        print("[cancelado]")
        sys.exit(0)
    return caminho


# ════════════════════════════════════════════════════════════════════
#  TEXTO — cada span vira uma div posicionada
# ════════════════════════════════════════════════════════════════════

def span_para_html(span: dict, idx: int) -> str:
    texto = span.get("text", "")
    if not texto.strip():
        return ""

    x0, y0, x1, y1 = span["bbox"]
    largura = max(x1 - x0, 0.1)
    altura = max(y1 - y0, 0.1)

    fonte = limpar_nome_fonte(span.get("font", "serif"))
    tamanho = float(span.get("size", 11))
    peso, estilo, serifado = flags_para_peso_estilo(span.get("flags", 0))
    cor = cor_texto_para_hex(span.get("color", 0))

    # line-height: usa a altura real do span, com fallback razoável
    if tamanho > 0:
        line_height = max(min(altura / tamanho, 2.0), 1.0)
    else:
        line_height = 1.2

    generico = "serif" if serifado else "sans-serif"
    familia = f"'{fonte}', {generico}"

    texto_escapado = html_lib.escape(texto)

    return (
        f'<div class="t" data-idx="{idx}" '
        f'data-font="{fonte}" data-size="{tamanho:.2f}" '
        f'style="left:{x0:.3f}pt; top:{y0:.3f}pt; '
        f'width:{largura:.3f}pt; height:{altura:.3f}pt; '
        f'font-family:{familia}; font-size:{tamanho:.2f}pt; '
        f'font-weight:{peso}; font-style:{estilo}; '
        f'line-height:{line_height:.3f}; '
        f'color:{cor};">{texto_escapado}</div>'
    )


# ════════════════════════════════════════════════════════════════════
#  VETORES — timbrado, linhas, retângulos
# ════════════════════════════════════════════════════════════════════

def drawing_para_svg(drawing: dict, idx: int) -> str:
    itens = drawing.get("items", [])
    if not itens:
        return ""

    stroke = cor_vetor_para_css(drawing.get("color"))
    fill = cor_vetor_para_css(drawing.get("fill"))
    largura = float(drawing.get("width") or 0)

    # Dash pattern (ex: "[3 3] 0")
    dash_attr = ""
    dashes = drawing.get("dashes") or ""
    if dashes and dashes != "[] 0":
        try:
            nums = [n for n in dashes.split("[")[1].split("]")[0].split() if n]
            if nums:
                dash_attr = f' stroke-dasharray="{",".join(nums)}"'
        except Exception:
            pass

    paths = []
    for item in itens:
        tipo = item[0]

        if tipo == "l":
            p1, p2 = item[1], item[2]
            paths.append(f"M {p1.x:.3f} {p1.y:.3f} L {p2.x:.3f} {p2.y:.3f}")

        elif tipo == "re":
            rect = item[1]
            paths.append(
                f"M {rect.x0:.3f} {rect.y0:.3f} "
                f"H {rect.x1:.3f} V {rect.y1:.3f} "
                f"H {rect.x0:.3f} Z"
            )

        elif tipo == "qu":
            quad = item[1]
            pts = [quad.ul, quad.ur, quad.lr, quad.ll]
            paths.append(
                f"M {pts[0].x:.3f} {pts[0].y:.3f} " +
                " ".join(f"L {p.x:.3f} {p.y:.3f}" for p in pts[1:]) +
                " Z"
            )

        elif tipo == "c":
            p1, p2, p3, p4 = item[1], item[2], item[3], item[4]
            paths.append(
                f"M {p1.x:.3f} {p1.y:.3f} "
                f"C {p2.x:.3f} {p2.y:.3f}, "
                f"{p3.x:.3f} {p3.y:.3f}, "
                f"{p4.x:.3f} {p4.y:.3f}"
            )

    if not paths:
        return ""

    d = " ".join(paths)
    return (
        f'<path data-idx="{idx}" d="{d}" '
        f'fill="{fill}" stroke="{stroke}" '
        f'stroke-width="{largura:.3f}"{dash_attr} />'
    )


# ════════════════════════════════════════════════════════════════════
#  IMAGENS — logo e afins em base64
# ════════════════════════════════════════════════════════════════════

def imagem_para_data_uri(doc, xref: int) -> str | None:
    try:
        info = doc.extract_image(xref)
        dados = info.get("image")
        ext = info.get("ext", "png")
        if not dados:
            return None
        b64 = base64.b64encode(dados).decode("ascii")
        return f"data:image/{ext};base64,{b64}"
    except Exception as e:
        print(f"[aviso] Imagem xref={xref} falhou: {e}")
        return None


def imagens_para_html(doc, page, idx_base: int) -> list[str]:
    try:
        infos = page.get_image_info(xrefs=True)
    except Exception:
        return []

    html_imgs: list[str] = []
    for i, info in enumerate(infos):
        xref = info.get("xref", 0)
        bbox = info.get("bbox")
        if not bbox:
            continue

        x0, y0, x1, y1 = bbox
        largura = max(x1 - x0, 0.1)
        altura = max(y1 - y0, 0.1)

        data_uri = imagem_para_data_uri(doc, xref)
        if not data_uri:
            continue

        html_imgs.append(
            f'<img class="img" data-idx="{idx_base + i}" src="{data_uri}" '
            f'style="left:{x0:.3f}pt; top:{y0:.3f}pt; '
            f'width:{largura:.3f}pt; height:{altura:.3f}pt;" '
            f'alt="" />'
        )

    return html_imgs


# ════════════════════════════════════════════════════════════════════
#  PÁGINA — junta tudo em 3 camadas (vetores / imagens / texto)
# ════════════════════════════════════════════════════════════════════

def extrair_pagina(doc, page, num: int) -> tuple[str, dict]:
    rect = page.rect
    largura, altura = rect.width, rect.height

    # 1. Vetores
    try:
        drawings = page.get_drawings()
    except Exception:
        drawings = []

    svgs = []
    for i, d in enumerate(drawings):
        s = drawing_para_svg(d, i)
        if s:
            svgs.append(s)

    # 2. Imagens
    imagens_html = imagens_para_html(doc, page, 10000)

    # 3. Texto
    spans_html: list[str] = []
    texto_dict = page.get_text("dict")
    contador_span = 0
    for bloco in texto_dict.get("blocks", []):
        if bloco.get("type") != 0:
            continue
        for linha in bloco.get("lines", []):
            for span in linha.get("spans", []):
                s = span_para_html(span, contador_span)
                if s:
                    spans_html.append(s)
                    contador_span += 1

    # Camadas
    partes = []

    if svgs:
        partes.append(
            f'<svg class="vetores" xmlns="http://www.w3.org/2000/svg" '
            f'viewBox="0 0 {largura:.3f} {altura:.3f}" '
            f'preserveAspectRatio="none">\n'
            + "\n".join(svgs) +
            "\n</svg>"
        )

    if imagens_html:
        partes.append(
            '<div class="camada-imagens">\n'
            + "\n".join(imagens_html) +
            "\n</div>"
        )

    if spans_html:
        partes.append(
            '<div class="camada-texto">\n'
            + "\n".join(spans_html) +
            "\n</div>"
        )

    estat = {
        "vetores": len(svgs),
        "imagens": len(imagens_html),
        "spans": contador_span,
        "largura_pt": largura,
        "altura_pt": altura,
    }

    return "\n".join(partes), estat


# ════════════════════════════════════════════════════════════════════
#  HTML FINAL
# ════════════════════════════════════════════════════════════════════

def html_pagina(doc, page, num: int, incluir_debug: bool = True) -> tuple[str, dict]:
    inner, estat = extrair_pagina(doc, page, num)
    largura, altura = estat["largura_pt"], estat["altura_pt"]

    debug_css = """
    /* ═══ MODO DEBUG — contorna cada elemento para inspeção ═══ */
    body.debug .t {
      outline: 0.4px solid rgba(220, 38, 38, 0.55);
      background: rgba(254, 226, 226, 0.15);
    }
    body.debug .img {
      outline: 0.6px solid rgba(37, 99, 235, 0.7);
      background: rgba(219, 234, 254, 0.2);
    }
    body.debug .vetores path {
      outline: none;
    }
    body.debug .vetores {
      outline: 0.4px dashed rgba(16, 185, 129, 0.4);
    }
    """ if incluir_debug else ""

    html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>{page.parent.name} — página {num}</title>
<style>
  /* ─── Reset ─────────────────────────────────────────────── */
  *, *::before, *::after {{ box-sizing: border-box; }}
  html, body {{ margin: 0; padding: 0; }}
  body {{
    background: #e5e7eb;
    padding: 24px;
    font-family: system-ui, -apple-system, sans-serif;
  }}

  /* ─── Contêiner da página (A4 em pt) ────────────────────── */
  .pagina {{
    position: relative;
    width: {largura:.3f}pt;
    height: {altura:.3f}pt;
    background: #ffffff;
    margin: 0 auto;
    overflow: hidden;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
  }}

  /* ─── Camadas (empilhamento por z-index) ────────────────── */
  .vetores {{
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
    pointer-events: none;
  }}
  .camada-imagens {{
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
  }}
  .camada-texto {{
    position: absolute;
    inset: 0;
    z-index: 2;
  }}

  /* ─── Elementos ─────────────────────────────────────────── */
  .img {{
    position: absolute;
    display: block;
  }}
  .t {{
    position: absolute;
    white-space: pre;
    overflow: visible;
    /* Sem anti-alias artificial — queremos fidelidade ao PDF */
  }}

  /* ─── Painel de controle (remova em produção) ───────────── */
  .painel {{
    position: fixed;
    top: 12px;
    right: 12px;
    z-index: 100;
    background: #111827;
    color: #f9fafb;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 12px;
    font-family: ui-monospace, monospace;
    box-shadow: 0 4px 16px rgba(0,0,0,0.25);
    display: flex;
    align-items: center;
    gap: 10px;
  }}
  .painel button {{
    background: #374151;
    color: #f9fafb;
    border: none;
    padding: 4px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    font-family: inherit;
  }}
  .painel button:hover {{ background: #4b5563; }}

  {debug_css}
</style>
</head>
<body>

<div class="painel">
  <span>pág {num} · {estat["spans"]} spans · {estat["vetores"]} vetores · {estat["imagens"]} img</span>
  <button onclick="document.body.classList.toggle('debug')">Debug</button>
</div>

<div class="pagina">
{inner}
</div>

</body>
</html>"""

    return html, estat


# ════════════════════════════════════════════════════════════════════
#  MAIN
# ════════════════════════════════════════════════════════════════════

def main() -> None:
    print()
    print("╔" + "═" * 68 + "╗")
    print("║" + " EXTRATOR DE HTML/CSS DE PDF ".center(68) + "║")
    print("╚" + "═" * 68 + "╝")
    print()

    caminho = Path(escolher_pdf())
    pasta = caminho.parent
    nome_base = caminho.stem

    print(f"[arquivo] {caminho}")
    print()

    doc = pymupdf.open(str(caminho))
    total_paginas = doc.page_count

    stats_total = {"spans": 0, "vetores": 0, "imagens": 0}
    arquivos_gerados: list[Path] = []

    for i in range(total_paginas):
        page = doc[i]
        html, estat = html_pagina(doc, page, i + 1)

        destino = pasta / f"{nome_base}_pagina-{i + 1}.html"
        destino.write_text(html, encoding="utf-8")
        arquivos_gerados.append(destino)

        stats_total["spans"] += estat["spans"]
        stats_total["vetores"] += estat["vetores"]
        stats_total["imagens"] += estat["imagens"]

        print(
            f"[pág {i + 1}/{total_paginas}] "
            f"{estat['spans']} spans · "
            f"{estat['vetores']} vetores · "
            f"{estat['imagens']} imagens "
            f"→ {destino.name}"
        )

    # ── HTML combinado com todas as páginas ────────────────────────
    if total_paginas > 1:
        partes = []
        for i in range(total_paginas):
            page = doc[i]
            inner, _ = extrair_pagina(doc, page, i + 1)
            partes.append(f'<div class="pagina">{inner}</div>')

        rect = doc[0].rect
        combinado = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>{nome_base}</title>
<style>
  * {{ box-sizing: border-box; }}
  html, body {{ margin: 0; padding: 0; }}
  body {{ background: #e5e7eb; padding: 24px; }}
  .pagina {{
    position: relative;
    width: {rect.width:.3f}pt;
    height: {rect.height:.3f}pt;
    background: #fff;
    margin: 0 auto 24px;
    overflow: hidden;
    box-shadow: 0 4px 14px rgba(0,0,0,0.12);
  }}
  .vetores {{ position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; }}
  .camada-imagens {{ position: absolute; inset: 0; z-index: 1; pointer-events: none; }}
  .camada-texto {{ position: absolute; inset: 0; z-index: 2; }}
  .img {{ position: absolute; display: block; }}
  .t {{ position: absolute; white-space: pre; }}
</style>
</head>
<body>
{chr(10).join(partes)}
</body>
</html>"""

        destino_comb = pasta / f"{nome_base}_completo.html"
        destino_comb.write_text(combinado, encoding="utf-8")
        arquivos_gerados.append(destino_comb)
        print(f"[combinado]  → {destino_comb.name}")

    doc.close()

    print()
    print("─" * 70)
    print(" CONCLUÍDO")
    print("─" * 70)
    print(f" Páginas:  {total_paginas}")
    print(f" Spans:    {stats_total['spans']}")
    print(f" Vetores:  {stats_total['vetores']}")
    print(f" Imagens:  {stats_total['imagens']}")
    print()

    # Abre a pasta
    try:
        if sys.platform.startswith("win"):
            import os
            os.startfile(pasta)
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