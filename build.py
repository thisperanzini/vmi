#!/usr/bin/env python3
"""Monta as páginas a partir de uma fonte única.

  shared/      base.js (linhas, macro, modalidades) · catalogo.js (CFI) · motor.js · logo.js
  financiamento-vmi/src/   head.html · docs.js · app.js · seed.json
  hda-viabilidade/src/     head.html · engine.js · premissas.js · app.js

Saídas (determinísticas, commitadas):
  dist/financiamento-vmi/index.html      site financiamento (netlify.toml da raiz: publish = dist/financiamento-vmi)
  hda-viabilidade/dist/index.html        site HDA (base directory = hda-viabilidade; seu netlify.toml: publish = dist)
  artifacts/<pasta>.html      mesma página sem o invólucro de site, para publicar no claude.ai
  netlify/functions, netlify/edge-functions, <dist>/entrar, <dist>/admin   camada de login (copiada de auth/)

Uso: python3 build.py            (as duas páginas)
     python3 build.py --check    (só confere a sintaxe dos scripts com node)
"""
import json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
def read(p): return open(os.path.join(ROOT, p), encoding="utf8").read()
def write(p, s):
    os.makedirs(os.path.dirname(os.path.join(ROOT, p)), exist_ok=True)
    open(os.path.join(ROOT, p), "w", encoding="utf8").write(s)

def script(label, code): return "<script>\n/* ===== %s ===== */\n%s\n</script>" % (label, code.strip())

SITE_HEAD = """<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<meta name="description" content="%s">
<link rel="icon" href="data:image/svg+xml,%%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%%3E%%3Crect width='32' height='32' rx='6' fill='%%231c2b4a'/%%3E%%3Ctext x='16' y='22' text-anchor='middle' font-family='Arial' font-weight='700' font-size='15' fill='%%23b8923a'%%3ES%%26S%%3C/text%%3E%%3C/svg%%3E">
<style>:root{color-scheme:light;box-sizing:border-box}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif}img{max-width:100%%}[hidden]:not([hidden=until-found i]){display:none!important}</style>
</head>
<body>
"""

def build_financiamento():
    seed = json.loads(read("financiamento-vmi/src/seed.json"))
    seed_js = "/* Casos e catálogo de partida fora do claude.ai (financiamento-vmi/src/seed.json). */\nwindow.VMI_SEED = " + json.dumps(seed, ensure_ascii=False) + ";"
    parts = [
        read("financiamento-vmi/src/head.html"),
        script("Snapshot BNDES (shared/cfi-bndes.json)", "window.CFI_BNDES = " + read("shared/cfi-bndes.json").strip() + ";"),
        script("Catálogo CFI (shared/catalogo.js)", read("shared/catalogo.js")),
        script("Base de linhas (shared/base.js)", read("shared/base.js")),
        script("Logo (shared/logo.js)", read("shared/logo.js")),
        script("Motor (shared/motor.js)", read("shared/motor.js")),
        script("Documentos (financiamento-vmi/src/docs.js)", read("financiamento-vmi/src/docs.js")),
        script("Seed", seed_js),
        script("Aplicação (financiamento-vmi/src/app.js)", read("financiamento-vmi/src/app.js")),
    ]
    page = "\n".join(parts) + "\n"
    write("artifacts/financiamento-vmi.html", page)
    write("dist/financiamento-vmi/index.html", SITE_HEAD % "Financiamento VMI: project finance para equipamentos VMI (FINAME, BNDES, FGTS-Saúde, fundos). S&S Partners." + page + "</body>\n</html>\n")

def build_hda():
    parts = [
        read("hda-viabilidade/src/head.html"),
        script("Snapshot BNDES (shared/cfi-bndes.json)", "window.CFI_BNDES = " + read("shared/cfi-bndes.json").strip() + ";"),
        script("Catálogo CFI (shared/catalogo.js)", read("shared/catalogo.js")),
        script("Base de linhas (shared/base.js)", read("shared/base.js")),
        script("Motor (shared/motor.js)", read("shared/motor.js")),
        script("Logo (shared/logo.js)", read("shared/logo.js")),
        script("Engine HDA (hda-viabilidade/src/engine.js)", read("hda-viabilidade/src/engine.js")),
        script("Premissas (hda-viabilidade/src/premissas.js)", read("hda-viabilidade/src/premissas.js")),
        script("Aplicação (hda-viabilidade/src/app.js)", read("hda-viabilidade/src/app.js")),
    ]
    page = "\n".join(parts) + "\n"
    write("artifacts/hda-viabilidade.html", page)
    write("hda-viabilidade/dist/index.html", SITE_HEAD % "Hospital Dom Alvarenga: viabilidade da internalização do serviço de imagem com equipamentos VMI/Alfamed. S&S Partners." + page + "</body>\n</html>\n")

AUTH_FUNCS = ["_lib.mjs", "pedir-codigo.mjs", "validar-codigo.mjs", "sair.mjs", "log.mjs", "admin.mjs"]
def build_auth(base, dist):
    """Copia a camada de login (auth/) para o site: funções, edge function e páginas /entrar e /admin."""
    for f in AUTH_FUNCS: write(os.path.join(base, "netlify/functions", f), read("auth/functions/" + f))
    write(os.path.join(base, "netlify/edge-functions/gate.ts"), read("auth/edge/gate.ts"))
    write(os.path.join(dist, "entrar/index.html"), read("auth/pages/entrar.html"))
    write(os.path.join(dist, "admin/index.html"), read("auth/pages/admin.html"))
    write(os.path.join(dist, "robots.txt"), "User-agent: *\nDisallow: /\n")

def check():
    ok = True
    for p in ["shared/base.js", "shared/catalogo.js", "shared/motor.js", "shared/logo.js", "financiamento-vmi/src/docs.js", "financiamento-vmi/src/app.js", "hda-viabilidade/src/engine.js", "hda-viabilidade/src/premissas.js", "hda-viabilidade/src/app.js"]:
        r = subprocess.run(["node", "--check", os.path.join(ROOT, p)], capture_output=True, text=True)
        print(("ok   " if r.returncode == 0 else "ERRO ") + p); ok = ok and r.returncode == 0
        if r.returncode: print(r.stderr[:800])
    return ok

if __name__ == "__main__":
    if not check(): sys.exit(1)
    if "--check" in sys.argv: sys.exit(0)
    build_financiamento(); build_hda()
    build_auth(".", "dist/financiamento-vmi"); build_auth("hda-viabilidade", "hda-viabilidade/dist")
    for p in ["dist/financiamento-vmi/index.html", "hda-viabilidade/dist/index.html", "artifacts/financiamento-vmi.html", "artifacts/hda-viabilidade.html"]:
        print("%7d bytes  %s" % (os.path.getsize(os.path.join(ROOT, p)), p))
