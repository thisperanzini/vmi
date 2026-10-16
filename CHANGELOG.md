# Changelog

## 2026-10-15 (noite, 2) · preços VMI no pacote C
- Pacote C com os preços VMI de 15/10/2026: Pulsar 128/64 R$ 1.950.000; ultrassom portátil Invictus R$ 117.000 (×2); Aquila 320 S R$ 139.000; Apolo D (RX digital fixo) R$ 290.000 no lugar do Aquila 500 D; placa DR VMI R$ 107.000. Total R$ 2,72 mi (−7,3% vs GE).
- Invictus e placa DR não aparecem no Catálogo CFI (só FGTS-Saúde ou credenciamento); Apolo D tem CFI 03538246. Manutenção do Apolo pela cotação do Aquila D (proxy).
- Catálogo compartilhado (versão 2026-10-15.2): preços VMI em Aquila 320 S, Apolo D e Pulsar 128; itens Invictus e placa DR VMI.

## 2026-10-15 (noite) · HDA: manutenção pós-garantia e locação
- Manutenção por contrato e por item nas compras (B e C): planos Prata e Ouro (definições VMI), 12 meses de garantia contados da instalação, provisão de tubo só no Prata. Valores VMI para os Aquila; benchmark para o pacote GE e para os itens sem cotação (contratos públicos do PNCP, Jaime). Substitui as linhas agregadas da planilha da Controladoria.
- Alternativa D: locação de longo prazo do pacote VMI/Alfamed. Aluguel por composição de custos (arrendamento PJ do BCB + prêmio, residual por modalidade, tributos, manutenção Ouro), calibrado na locação de TC 128 canais da SMS-SP. Simulação de 36 a 84 meses, locar × possuir no prazo, aluguel de equilíbrio com a compra.
- Alternativas: comparativo A/B/C/D (desembolso, dívida, compromisso mensal, VPL para o hospital, DSCR, riscos); Plano em números, Tese, Simulador, Crédito e exportação .xlsx tratam D.

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
