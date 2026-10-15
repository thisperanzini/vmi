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

## Camada de login (auth/)

Código em `auth/`, copiado pelo `build.py` para `netlify/` e para `/entrar` e `/admin` de cada site. Tudo roda no Netlify (Edge Functions, Functions, Blobs); e-mail pelo Resend.

- `auth/edge/gate.ts`: porteiro em todas as rotas; sem cookie de sessão válido (HMAC-SHA256, 7 dias) redireciona para `/entrar`.
- `auth/functions/pedir-codigo.mjs`: código de 6 dígitos por e-mail, só para quem está na lista; limites de 5/hora por e-mail e 20/hora por IP; resposta neutra para e-mails fora da lista.
- `auth/functions/validar-codigo.mjs`: confere (5 tentativas, 10 minutos), emite o cookie `ss_sess` (HttpOnly, Secure, SameSite=Lax), registra o login.
- `auth/functions/log.mjs`: eventos de uso enviados pela página (página aberta, caso aberto, documento gerado, exportação, versão congelada).
- `auth/functions/admin.mjs` + `/admin/`: eventos por mês com filtros e CSV; e-mails avulsos autorizados e bloqueados.
- Quem entra: domínios em `ALLOW_DOMAINS`, administradores em `ADMIN_EMAILS` (variáveis de ambiente do site), e-mails avulsos na página admin (Blobs `config`). As listas são por site.

Variáveis de ambiente (em cada site do Netlify): `SESSION_SECRET` (aleatório, 32+ caracteres; diferente por site), `SITE_ID` (`financiamento` ou `hda`), `SITE_NAME`, `ALLOW_DOMAINS`, `ADMIN_EMAILS`, `RESEND_API_KEY`, `MAIL_FROM` (ex.: `S&S Partners <acesso@sespartners.com.br>`), `SESSION_DAYS` (opcional, padrão 7).

## Fora do claude.ai

Casos, base editada e catálogo ficam no `localStorage` de quem usa. Downloads são diretos. A leitura de documentos por IA (kit) só existe no claude.ai.

## Catálogo CFI: sincronização mensal com o BNDES
- `scripts/cfi-sync.mjs` consulta a API pública do Catálogo CFI (`gateway.apis.bndes.gov.br/catalogoCFI`) pelos CNPJs do catálogo, grava `shared/cfi-bndes.json` (snapshot) e compara com `shared/catalogo.js`: código que sumiu ou deixou de ser "Financiável" vira alerta; item "previsto" (ex.: Pulsar) que aparece credenciado recebe o código; credenciado fora do catálogo é relatado.
- `.github/workflows/cfi-sync.yml` roda no dia 1 de cada mês (ou manualmente em Actions → Run workflow). Sem divergência, publica só a data da consulta em `main`; com divergência, abre um pull request com o relatório. Requer, em Settings → Actions → General, "Allow GitHub Actions to create and approve pull requests".
- As páginas mostram a data da última consulta e o status BNDES por item (painel Catálogo). Validade dos códigos não vem da API: vem da tabela FINAME da VMI (`validade`, `processo`).
- Teste offline: `node scripts/cfi-sync.mjs --dry --from snapshot.json`.
