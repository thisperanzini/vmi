# Ferramentas VMI · S&S Partners

Fonte única das páginas publicadas em `financiamento.sespartners.com.br` (Netlify) e dos artefatos no claude.ai.

| Pasta | O que é |
|---|---|
| `shared/` | `base.js` (linhas, macro, modalidades, custos padrão), `catalogo.js` (produtos com CFI verificado), `motor.js` (elegibilidade, cronograma, CET, ROI nos dois modos, DSCR da entidade), `logo.js` |
| `financiamento-vmi/src/` | ferramenta Financiamento VMI: `head.html` (markup e CSS), `docs.js` (PDF/XLSX/DOCX), `app.js` (interface e persistência), `seed.json` (casos e catálogo de partida fora do claude.ai) |
| `hda-viabilidade/src/` | business case HDA: `head.html`, `engine.js`, `premissas.js`, `app.js` |
| `dist/financiamento-vmi/` | página montada do site financiamento (`netlify.toml` da raiz) |
| `hda-viabilidade/dist/` | página montada do site HDA (no Netlify, Base directory = `hda-viabilidade`; `hda-viabilidade/netlify.toml`) |
| `artifacts/` | as mesmas páginas sem o invólucro de site, para publicar no claude.ai |

## Fluxo

1. Alterar em `shared/` ou em `*/src/`.
2. `python3 build.py` (confere a sintaxe com `node --check` e monta `dist/` e `artifacts/`).
3. Commit com a mudança descrita (taxa, spread, fórmula, texto) e push na `main`: o Netlify publica em ~1 minuto.
4. Registrar em `CHANGELOG.md`.

Regras: o motor e a base são compartilhados pelas duas páginas; uma mudança de taxa vale para as duas. `dist/` é gerado, nunca editado à mão. A versão da base (`BASE_PADRAO.versao`) e do catálogo (`catalogo_versao`) devem subir a cada alteração de conteúdo: fora do claude.ai, uma base guardada no navegador só prevalece se for da mesma versão do código.

## Fora do claude.ai

Casos, base editada e catálogo ficam no `localStorage` de quem usa. Downloads são diretos. A leitura de documentos por IA (kit) só existe no claude.ai.
