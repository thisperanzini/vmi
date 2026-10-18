# Changelog

## 2026-10-18 (tarde) · HDA: honorário da S&S na compra (C)
- Honorário de intermediação da S&S pago pelo hospital: 2% do valor financiado na alternativa C (R$ 54,4 mil), lançado no ano 0 com IOF e tarifa e no custo total do ranking. B e D sem honorário do hospital. Corrigida a unidade da premissa (fração na tela, % no motor).
- Resultado: VPL para o hospital C R$ 9,80 mi, D R$ 9,77 mi, B R$ 9,65 mi. Sumário executivo e Método mostram o honorário.

## 2026-10-18 · HDA: inflação em todos os caminhos e sumário executivo
- Nova premissa "Inflação nos fluxos" (padrão: IPCA projetado pelo Focus de 02/10/2026, o mesmo que corrige a TLP das parcelas do FINAME). Receita, custos, manutenção (B e C) e aluguel (D) são reajustados ano a ano; as parcelas seguem nominais; o ano 1 fica nos preços da base. "Taxa fixa" com 0 volta aos valores constantes da Controladoria.
- Resultado (10 anos, 15% a.a. nominal): VPL para o hospital B R$ 9,65 mi, C R$ 9,86 mi, D R$ 9,77 mi; VPL do projeto R$ 9,81 mi, TIR 82%. Aluguel de equilíbrio D × C: R$ 72,0 mil/mês.
- Rótulo do DSCR: 1,3x é prática dos agentes, não norma do BNDES.

## 2026-10-17 · HDA: manutenção inclusa no aluguel VMI
- Confirmado: o aluguel da VMI inclui a manutenção. Premissa "a cotação inclui manutenção?" passa a "Sim" (origem VMI); "Não" fica como cenário. Banco config/main atualizado.
- Locação em 48 meses: R$ 73.465/mês (aluguel VMI R$ 59.516 + ultrassons e placa DR por composição R$ 13.949). VPL para o hospital em 10 anos: D R$ 8,58 mi, C R$ 8,38 mi, B R$ 8,18 mi.
- Textos de locação, referências de mercado, leitura das alternativas, sumário executivo e pendências reescritos; taxa implícita passa a ser um teto (o aluguel também paga a manutenção).

## 2026-10-16 (noite) · HDA: locação com a tabela real da VMI e sumário executivo
- Alternativa D usa a tabela de locação da VMI de 16/10/2026 (R$/mês por unidade, 12 a 84 meses) para TC, Aquila S e Aquila D (este na linha do RX digital; na compra é o Apolo D). Prazos intermediários por interpolação; ultrassons e placa DR seguem a composição de custos. Prazo padrão 48 meses (sugestão VMI); simulação de 24 a 84 meses.
- Nova premissa "a cotação VMI inclui manutenção?" (padrão: não, a confirmar). Com "não", o hospital paga o contrato do plano escolhido depois da garantia, como média no prazo. Taxa implícita da cotação por item (TC 15,5% a.a.; Aquila S 39%; Aquila D 33%, em 48 m sem manutenção).
- Premissa "base do aluguel" (cotação VMI ou composição de custos em todos os itens); textos de Tese, Alternativas, Plano em números, Método, simulador, tornado e .xlsx refletem a fonte e a manutenção.
- Botão "Sumário executivo": gera na hora, com os números do modelo carregado, recomendação, quadro B/C/D, compra, locação, crédito, pendências com efeito no VPL medido pelo modelo e próximos passos; copia como texto ou baixa .docx (OOXML gerado no navegador).
- Banco: config/main com prazo de locação 48 e tabela VMI nos itens do pacote C.

## 2026-10-16 · base 2026-10-16 · FGTS-Saúde pelo Manual de Fomento v002
- Premissas de André Matheus (S&S, e-mail "Premissas Projeto HDA - Financiamento", 16/10/2026) e anexos da pasta VMI no Drive (Res. CCFGTS 1.152/2026; Manual de Fomento FGTS Saúde v002, vigência 11/08/2026). A modalidade III (investimento, 20 anos, 12 de carência) ainda não foi regulamentada e sai do cálculo.
- Linha FGTS-Saúde refeita como modalidade I (sem destinação específica): até 60 meses, sem carência, 100% do valor, juros 8,66% a.a. + taxa de risco do agente até 3% a.a. + TR, tarifa até 0,5%, agentes Caixa, BB ou BNDES. Modalidade II (reestruturação, até 15 anos) entra como linha informativa.
- Três perguntas novas no caso (aba Cliente da ferramenta e Premissas do HDA): CEBAS na modalidade de prestação de serviços com no mínimo 60% ao SUS; créditos SUS dos últimos 12 meses; outros empréstimos consumindo o repasse SUS (Teto MAC) e suas parcelas.
- Motor: CEBAS "Não" tira a linha; sem resposta ou sem créditos, a linha fica em "depende de confirmação". Margem consignável = 35% da média mensal dos créditos SUS menos o já descontado no Teto MAC; parcela acima da margem bloqueia e mostra o valor máximo financiável e os créditos necessários.
- Kit: grupo G com os documentos do FGTS-Saúde (CEBAS no DOU, extrato de créditos SUS, contratos no Teto MAC, anuência do gestor e termo de cessão, declaração do Agora Tem Especialistas, CNES).
- HDA: card "FGTS-Saúde: requisitos e margem do SUS" em Investimento; plano volta ao FINAME BK MPME por padrão; textos de Tese, Gate 1, simulador, Crédito (modalidade II) e Método atualizados. Campos numéricos aceitam "6.000.000".
- Ferramenta: base guardada no banco com versão anterior à do código deixa de prevalecer.

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
