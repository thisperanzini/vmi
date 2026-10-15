# Changelog

## 2026-10-15 · base 2026-10-15 · catálogo 2026-10-15
- Sincronização mensal com o Catálogo CFI do BNDES (scripts/cfi-sync.mjs + GitHub Actions): snapshot em shared/cfi-bndes.json, status BNDES por item e data da última consulta no painel Catálogo; divergências viram pull request.
- Catálogo cruzado com a tabela FINAME da VMI (16 itens): códigos 1:1; cada item ganha `validade` e `processo` (bloco de 2025 vence mar–ago/2029, Cignus 600 em 27/06/2029; bloco de 2026 em mar/2030). Coluna "Validade / previsão" no painel; importação de planilha aceita a coluna.
- TC Pulsar 128/64 com CFI "previsto" (dez/2026, premissa VMI): o motor simula as linhas com CFI e emite aviso de que a contratação depende do código publicado; o kit aponta "código CFI emitido" como pendência.
- Catálogo guardado (banco/navegador) de versão anterior é mesclado com o do código (códigos, validade e fonte do código; preços e itens manuais do guardado). O seed deixa de carregar cópia do catálogo.
- HDA: premissa "pacote credenciado" passa a 1 (Pulsar prevista); engine distingue CFI emitido, previsto e ausente; avisos e narrativa atualizados; Gate 1 ganha a condição "CFI da Pulsar publicado".

## 2026-10-14 (noite) · camada de login
- Login por e-mail + código de uso único (Resend), sessão assinada de 7 dias, porteiro em Edge Function; listas por site (domínios e admins por variável de ambiente, e-mails avulsos na página /admin).
- Logs de acesso e de uso (login, falhas, caso aberto, documento gerado, exportação) em Netlify Blobs, página /admin com filtros e CSV.
- Links "Sair" e "Acessos" no rodapé das duas ferramentas quando hospedadas no domínio.

## 2026-10-14 · base 2026-10-14 · catálogo 2026-10-14
- Catálogo CFI verificado no BNDES por CNPJ: 16 itens VMI Médica, 3 Alfa Med; TC Pulsar não consta; TCs concorrentes credenciadas listadas.
- Modalidade "ultrassom" no motor.
- ROI: modo "internalização de serviço terceirizado" (ganho incremental; imposto incremental zero em Presumido/Simples, 34% do EBIT incremental no Real; filantrópica imune nos dois modos).
- Aba Cliente: dívidas existentes, EBITDA do tomador, evento de desalavancagem; DSCR da entidade ano a ano; seções no estudo e no dossiê.
- Fora do claude.ai: persistência no navegador, downloads diretos, seed com casos CEMAN e HDA; base/catálogo locais só prevalecem se da mesma versão do código.
- Business case HDA: página própria (9 abas) com o motor compartilhado; correção pelo catálogo CFI (Pulsar sem credenciamento).

## 2026-10-09 · base 2026-10-09
- Versão inicial da ferramenta Financiamento VMI (linhas, kit, simulação, ROI greenfield, documentos).
