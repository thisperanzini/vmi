/* ====================================================================
   Premissas padrão — HDA. Cada entrada traz origem e fonte.
   origem: controladoria (planilha Viabilidade v2, jan–jun/26) ·
           jaime (Projeto Radiologia e Proposta Estratégica) ·
           deck (Reunião do Conselho, out/26) · fonte (documento público) ·
           ss (premissa S&S) · pendente (a validar com o hospital)
   ==================================================================== */
var SCHEMA = [
  /* ---- Base realizada (EMG) ---- */
  { id: 'base.meses', bloco: 'Base realizada (jan–jun/26)', label: 'Meses do período realizado', un: 'meses', fmt: 'int', def: 6, origem: 'controladoria', fonte: 'DRE por unidade de negócio, 01/26 a 06/26.' },
  { id: 'base.exames', bloco: 'Base realizada (jan–jun/26)', label: 'Exames no período (convênio + particular)', un: 'exames', fmt: 'int', def: 21408, origem: 'controladoria', fonte: 'Viabilidade!C7. Exclui SUS.' },
  { id: 'base.ticket', bloco: 'Base realizada (jan–jun/26)', label: 'Ticket médio', un: 'R$/exame', fmt: 'num', def: 174, origem: 'controladoria', fonte: 'DRE!D1.' },
  { id: 'base.glosa_pct', bloco: 'Base realizada (jan–jun/26)', label: 'Glosas, descontos e devoluções', un: '% da receita bruta', fmt: 'pct', def: 27546.51 / 3724992, origem: 'controladoria', fonte: 'R$ 27.546,51 sobre R$ 3.724.992 (DRE!C7/C6).' },
  { id: 'base.matmed_pct', bloco: 'Base realizada (jan–jun/26)', label: 'Mat/Med do hospital', un: '% da receita líquida', fmt: 'pct', def: 192741.83 / 3697445.49, origem: 'controladoria', fonte: 'R$ 192.741,83 (DRE!C10).' },
  { id: 'base.rep_med_pct', bloco: 'Base realizada (jan–jun/26)', label: 'Repasse à EMG: médicos', un: '% da receita líquida', fmt: 'pct', def: 820718.2868 / 3697445.49, origem: 'controladoria', fonte: 'R$ 820.718,29 (DRE!C12). Mantido na imagem própria.' },
  { id: 'base.rep_mat_pct', bloco: 'Base realizada (jan–jun/26)', label: 'Repasse à EMG: material', un: '% da receita líquida', fmt: 'pct', def: 532257.13 / 3697445.49, origem: 'controladoria', fonte: 'R$ 532.257,13 (DRE!C13). Zerado na imagem própria.' },
  { id: 'base.rep_bio_pct', bloco: 'Base realizada (jan–jun/26)', label: 'Repasse à EMG: biópsias', un: '% da receita líquida', fmt: 'pct', def: 44196.38 / 3697445.49, origem: 'controladoria', fonte: 'R$ 44.196,38 (DRE!C14). Zerado na imagem própria.' },
  { id: 'base.rep_sala_pct', bloco: 'Base realizada (jan–jun/26)', label: 'Médicos que usam a sala da Radiologia', un: '% da receita líquida', fmt: 'pct', def: 796308.9132 / 3697445.49, origem: 'pendente', fonte: 'R$ 796.308,91 (DRE!C15). Natureza da linha a confirmar com a Controladoria: a planilha a zera na imagem própria. Maior swing do modelo.' },
  { id: 'base.cf_dir_mes', bloco: 'Base realizada (jan–jun/26)', label: 'Custos fixos diretos (equipe do hospital)', un: 'R$/mês', fmt: 'num', def: 1107437.57 / 6, origem: 'controladoria', fonte: 'R$ 1.107.437,57 no semestre (DRE!C18). Iguais nos dois modelos.' },
  { id: 'base.cf_ind_mes', bloco: 'Base realizada (jan–jun/26)', label: 'Custos indiretos (rateio)', un: 'R$/mês', fmt: 'num', def: 601635.64 / 6, origem: 'controladoria', fonte: 'R$ 601.635,64 no semestre (DRE!C21). Iguais nos dois modelos.' },

  /* ---- Volumes por modalidade ---- */
  { id: 'volumes.rx25', bloco: 'Volumes por modalidade (média mensal)', label: 'Raio X 2025', un: 'exames/mês', fmt: 'int', def: 1679, origem: 'jaime', fonte: 'Projeto Radiologia, evolução das médias mensais.' },
  { id: 'volumes.rx26', bloco: 'Volumes por modalidade (média mensal)', label: 'Raio X 2026', un: 'exames/mês', fmt: 'int', def: 2050, origem: 'jaime', fonte: 'Idem (+25%).' },
  { id: 'volumes.tc25', bloco: 'Volumes por modalidade (média mensal)', label: 'Tomografia 2025', un: 'exames/mês', fmt: 'int', def: 1094, origem: 'jaime', fonte: 'Idem.' },
  { id: 'volumes.tc26', bloco: 'Volumes por modalidade (média mensal)', label: 'Tomografia 2026', un: 'exames/mês', fmt: 'int', def: 1400, origem: 'jaime', fonte: 'Idem (+27,7%).' },
  { id: 'volumes.us25', bloco: 'Volumes por modalidade (média mensal)', label: 'Ultrassom 2025', un: 'exames/mês', fmt: 'int', def: 380, origem: 'jaime', fonte: 'Idem.' },
  { id: 'volumes.us26', bloco: 'Volumes por modalidade (média mensal)', label: 'Ultrassom 2026', un: 'exames/mês', fmt: 'int', def: 470, origem: 'jaime', fonte: 'Idem (+36,3%). Os volumes do Jaime incluem todos os pagadores; a base da Controladoria só convênio e particular (3.568/mês).' },

  /* ---- Imagem própria ---- */
  { id: 'propria.matmed_pct', bloco: 'Imagem própria: operação', label: 'Mat/Med na imagem própria', un: '% da receita líquida', fmt: 'pct', def: 192741.83 / 3697445.49, origem: 'pendente', fonte: 'Controladoria mantém 5,2%; nota da planilha sugere ~15% se o material da EMG (R$ 60 mil/mês) passar ao hospital. Validar com Jaime.' },
  { id: 'propria.rep_med_pct', bloco: 'Imagem própria: operação', label: 'Repasse médico na imagem própria', un: '% da receita líquida', fmt: 'pct', def: 820718.2868 / 3697445.49, origem: 'ss', fonte: 'Premissa: mesma equipe médica, mesmo percentual (22,2%). Cada ponto percentual vale ~R$ 74 mil/ano.' },
  { id: 'propria.sala_elimina', bloco: 'Imagem própria: operação', label: 'Zerar "médicos que usam a sala" na imagem própria', un: '1 sim / 0 não', fmt: 'int', def: 1, origem: 'controladoria', fonte: 'A planilha zera a linha. Se a linha for repasse de outras especialidades, pode permanecer.', ui: { choices: [[1, 'Sim (planilha)'], [0, 'Não, mantém']] } },
  { id: 'propria.mat_elimina', bloco: 'Imagem própria: operação', label: 'Zerar repasse de material da EMG', un: '1/0', fmt: 'int', def: 1, origem: 'controladoria', fonte: 'A planilha zera a linha (material passa a ser comprado pelo hospital, ver Mat/Med).', ui: { choices: [[1, 'Sim'], [0, 'Não']] } },
  { id: 'propria.bio_elimina', bloco: 'Imagem própria: operação', label: 'Zerar repasse de biópsias da EMG', un: '1/0', fmt: 'int', def: 1, origem: 'controladoria', fonte: 'A planilha zera a linha.', ui: { choices: [[1, 'Sim'], [0, 'Não']] } },
  { id: 'propria.rispacs_mes', bloco: 'Imagem própria: operação', label: 'RIS/PACS: mensalidade', un: 'R$/mês', fmt: 'num', def: 5875, origem: 'pendente', fonte: 'Faixa R$ 1.750 a R$ 10.000 (Informações - Validar). Verificar se o hospital já tem RIS/PACS; opção a investigar à parte.' },
  { id: 'propria.rispacs_impl', bloco: 'Imagem própria: operação', label: 'RIS/PACS: implantação (ano 0)', un: 'R$', fmt: 'num', def: 30000, origem: 'pendente', fonte: 'Faixa R$ 10 mil a R$ 50 mil (Informações - Validar).' },
  { id: 'propria.tc_exh', bloco: 'Imagem própria: operação', label: 'Capacidade da TC: exames por hora', un: 'exames/h', fmt: 'num', def: 3, origem: 'ss', fonte: 'Padrão da ferramenta de financiamento (TC).' },
  { id: 'propria.tc_h', bloco: 'Imagem própria: operação', label: 'Capacidade da TC: horas por dia', un: 'h', fmt: 'num', def: 24, origem: 'ss', fonte: 'Hospital com PS 24 h; 1.400 TC/mês não cabem em 12 h.' },
  { id: 'propria.tc_d', bloco: 'Imagem própria: operação', label: 'Capacidade da TC: dias por mês', un: 'dias', fmt: 'num', def: 30, origem: 'ss', fonte: 'Operação contínua.' },

  /* ---- Manutenção pós-garantia (alternativas B e C) ---- */
  { id: 'manut.plano', bloco: 'Manutenção pós-garantia (B e C)', label: 'Plano de manutenção contratado', un: 'Ouro/Prata', fmt: 'txt', def: 'ouro', origem: 'ss', fonte: 'Definições da VMI (15/10/2026). Ouro: preventiva e corretiva com cobertura total de peças, incluindo tubo, gerador de alta tensão e sistemas de imagem. Prata: preventiva e corretiva com cobertura parcial, exceto tubo, gerador e sistemas de imagem. Ouro é a prática para TC única com PS 24 h e deixa B e C comparáveis à locação (D), que inclui manutenção total. Valores por item em Investimento e financiamento.', ui: { choices: [['ouro', 'Ouro (cobertura total)'], ['prata', 'Prata (sem tubo, gerador e sistemas de imagem)']] } },
  { id: 'manut.garantia_meses', bloco: 'Manutenção pós-garantia (B e C)', label: 'Garantia de fábrica, a partir da instalação', un: 'meses', fmt: 'int', def: 12, origem: 'controladoria', fonte: 'Garantia de 12 meses (Viabilidade!C32 e pedido do hospital). O contrato começa no 13º mês de operação: com 3 meses de transição no ano 1, a cobrança começa em abril do ano 2.' },
  { id: 'propria.tubo', bloco: 'Manutenção pós-garantia (B e C)', label: 'Provisão do tubo da TC (só no plano Prata)', un: 'R$/mês', fmt: 'num', def: 7270.83, origem: 'controladoria', fonte: 'Tubo de R$ 209 mil a cada 2–3 anos (Santa Casa de Birigui, 2020; Informações - Validar). No Ouro o tubo está coberto.' },
  { id: 'propria.manut_fator', bloco: 'Manutenção pós-garantia (B e C)', label: 'Fator sobre todos os contratos (sensibilidade)', un: '×', fmt: 'num', def: 1, origem: 'ss', fonte: '1,0 = valores por item. Aplica-se também à manutenção embutida no aluguel da locação (D).' },

  /* ---- Cenário ---- */
  { id: 'cenario.volume_var', bloco: 'Cenário de volume', label: 'Variação de volume vs. base', un: '%', fmt: 'pct', def: 0, origem: 'controladoria', fonte: 'Cenário 1 = volume atual; cenário 2 da Controladoria = +30%. Jaime projeta +27,3% para 2027.' },
  { id: 'cenario.cresc_aa', bloco: 'Cenário de volume', label: 'Crescimento anual do volume a partir do ano 2', un: '% a.a.', fmt: 'pct', def: 0, origem: 'controladoria', fonte: 'Viabilidade!C24: volume constante.' },
  { id: 'cenario.reajuste_modo', bloco: 'Cenário de volume', label: 'Inflação nos fluxos', un: '', fmt: 'txt', def: 'ipca', origem: 'fonte', fonte: 'IPCA projetado pelo Focus do Banco Central (02/10/2026): 3,80% em 2028 e 3,51% a partir de 2029, o mesmo cenário que corrige a TLP nas parcelas do FINAME. Aplica-se igual a todos os caminhos: receita, custos, manutenção (B e C) e aluguel (D). O ano 1 fica nos preços da base; as parcelas dos financiamentos são nominais. A taxa de desconto de 15% passa a ser nominal. Com "Taxa fixa" e reajuste 0, volta aos valores constantes da planilha da Controladoria.', ui: { choices: [['ipca', 'IPCA projetado (Focus), em todos os caminhos'], ['fixo', 'Taxa fixa (campo abaixo; 0 = valores constantes)']] } },
  { id: 'cenario.reajuste_aa', bloco: 'Cenário de volume', label: 'Reajuste anual (só com taxa fixa)', un: '% a.a.', fmt: 'pct', def: 0, origem: 'ss', fonte: 'Usado só quando a inflação nos fluxos for "Taxa fixa". 0 = valores constantes, como na planilha. Aplica-se por igual a receita, custos, manutenção e aluguel.' },

  /* ---- Financeiro ---- */
  { id: 'fin.alternativa', bloco: 'Parâmetros financeiros', label: 'Alternativa levada ao plano em números', un: 'B/C/D', fmt: 'txt', def: 'C', origem: 'ss', fonte: 'B = pacote GE financiado pelo HFS em 60x; C = pacote VMI comprado e financiado pela melhor linha; D = pacote VMI em locação de longo prazo, com manutenção inclusa.', ui: { choices: [['C', 'C · VMI, compra financiada'], ['B', 'B · GE/HFS, compra financiada'], ['D', 'D · VMI, locação']] } },
  { id: 'fin.ano_inicio', bloco: 'Parâmetros financeiros', label: 'Ano 1 do projeto', un: 'ano', fmt: 'int', def: 2027, origem: 'ss', fonte: 'Contratação prevista no 1º trimestre de 2027, junto com a negociação do TDC.' },
  { id: 'fin.inicio_op_mes', bloco: 'Parâmetros financeiros', label: 'Meses do ano 1 ainda com a EMG (transição)', un: 'meses', fmt: 'int', def: 3, origem: 'ss', fonte: 'Instalação e sobreposição de equipes; o ganho do ano 1 é proporcional aos meses restantes.' },
  { id: 'fin.horizonte', bloco: 'Parâmetros financeiros', label: 'Horizonte de análise', un: 'anos', fmt: 'int', def: 10, origem: 'ss', fonte: 'Vida útil fiscal de 10 anos (IN RFB 1.700/2017) e prazo do FINAME. Controladoria usou 5.' },
  { id: 'fin.desconto', bloco: 'Parâmetros financeiros', label: 'Taxa de desconto (custo de oportunidade)', un: '% a.a.', fmt: 'pct', def: 0.15, origem: 'controladoria', fonte: 'Viabilidade!C28.' },
  { id: 'fin.vida_util', bloco: 'Parâmetros financeiros', label: 'Vida útil para depreciação', un: 'anos', fmt: 'int', def: 10, origem: 'controladoria', fonte: 'Viabilidade!C29.' },
  { id: 'fin.residual', bloco: 'Parâmetros financeiros', label: 'Valor residual no fim do horizonte', un: '% do valor contábil', fmt: 'pct', def: 0, origem: 'controladoria', fonte: 'Viabilidade!C30: conservador, 0%.' },
  { id: 'fin.tributos', bloco: 'Parâmetros financeiros', label: 'Tributos sobre o resultado', un: '%', fmt: 'pct', def: 0, origem: 'controladoria', fonte: 'Entidade sem fins lucrativos (Viabilidade!C27).' },

  /* ---- Financiamento C ---- */
  { id: 'altC.prazo', bloco: 'Financiamento do pacote C (motor Financiamento VMI)', label: 'Prazo pedido', un: 'meses', fmt: 'int', def: 120, origem: 'ss', fonte: 'FINAME até 120; FGTS-Saúde modalidade I até 60 (Manual de Fomento v002, ago/2026). O motor reduz ao máximo da linha.' },
  { id: 'altC.carencia', bloco: 'Financiamento do pacote C (motor Financiamento VMI)', label: 'Carência pedida', un: 'meses', fmt: 'int', def: 24, origem: 'ss', fonte: 'FINAME até 24; FGTS-Saúde sem carência (1ª parcela em até 45 dias). A carência de 12 meses é da modalidade III, que ainda não foi regulamentada.' },
  { id: 'altC.inicio', bloco: 'Financiamento do pacote C (motor Financiamento VMI)', label: 'Mês da contratação', un: 'AAAA-MM', fmt: 'txt', def: '2027-03', origem: 'ss', fonte: 'Após a emissão do TDC (dez/26).' },
  { id: 'altC.sistema', bloco: 'Financiamento do pacote C (motor Financiamento VMI)', label: 'Sistema de amortização', un: 'SAC/Price', fmt: 'txt', def: 'SAC', origem: 'ss', fonte: 'Padrão BNDES: SAC.', ui: { choices: [['SAC', 'SAC'], ['Price', 'Price']] } },
  { id: 'altC.carModo', bloco: 'Financiamento do pacote C (motor Financiamento VMI)', label: 'Juros na carência', un: 'pagos/capitalizados', fmt: 'txt', def: 'pagos', origem: 'ss', fonte: 'Padrão FINAME: juros pagos trimestralmente na carência (aqui mensalizados).', ui: { choices: [['pagos', 'Pagos'], ['capitalizados', 'Capitalizados']] } },
  { id: 'altC.linha', bloco: 'Financiamento do pacote C (motor Financiamento VMI)', label: 'Linha escolhida', un: 'id', fmt: 'txt', def: 'auto', origem: 'ss', fonte: '"auto" = 1ª do ranking por custo total.', ui: { linhas: true } },
  { id: 'altC.honorario_pct', bloco: 'Financiamento do pacote C (motor Financiamento VMI)', label: 'Honorário de intermediação', un: '% do financiado', fmt: 'pct', def: 0, origem: 'ss', fonte: 'Oculto nesta versão (0%).' },

  /* ---- Locação (alternativa D) ---- */
  { id: 'altD.prazo', bloco: 'Locação do pacote VMI (D)', label: 'Prazo da locação', un: 'meses', fmt: 'int', def: 48, origem: 'vmi', fonte: 'Sugestão da VMI (16/10/2026): 48 meses. A tabela da VMI cota de 12 a 84 meses; acima de 60 o aluguel quase não cai (TC R$ 42,4 mil em 60 m e R$ 42,1 mil em 84 m). O fluxo de 10 anos supõe renovação com equipamento novo ao mesmo aluguel. A aba Investimento simula 24 a 84 meses.', ui: { choices: [[24, '24 meses'], [36, '36 meses'], [48, '48 meses (sugestão VMI)'], [60, '60 meses'], [72, '72 meses'], [84, '84 meses']] } },
  { id: 'altD.fonte', bloco: 'Locação do pacote VMI (D)', label: 'Base do aluguel', un: '', fmt: 'txt', def: 'vmi', origem: 'vmi', fonte: 'Cotação de locação da VMI de 16/10/2026 (R$/mês por prazo) para TC, Aquila S e Aquila D. Itens sem cotação (ultrassons Invictus e placa DR) seguem a composição de custos do locador. "Composição" ignora a cotação e monta todos os itens pelos custos (útil para conferir a proposta).', ui: { choices: [['vmi', 'Cotação VMI (composição só nos itens sem cotação)'], ['composicao', 'Composição de custos em todos os itens']] } },
  { id: 'altD.vmi_manut', bloco: 'Locação do pacote VMI (D)', label: 'A cotação de locação da VMI inclui manutenção?', un: '', fmt: 'txt', def: 'sim', origem: 'vmi', fonte: 'Confirmado em 17/10/2026: o aluguel da VMI já inclui a manutenção, sem contrato à parte depois da garantia. "Não" fica como cenário de comparação (o hospital pagaria o contrato do plano escolhido depois da garantia, como na compra).', ui: { choices: [['sim', 'Sim: aluguel já cobre a manutenção (confirmado)'], ['nao', 'Não: manutenção à parte (só cenário)']] } },
  { id: 'altD.taxa_base', bloco: 'Locação do pacote VMI (D)', label: 'Custo de referência do locador', un: '% a.a.', fmt: 'pct', def: 0.1719, origem: 'fonte', fonte: 'Taxa média PJ de arrendamento mercantil de outros bens, ago/2026: 17,19% a.a. (BCB, SGS 20732). É o custo de um leasing financeiro, em que o banco só corre o risco de crédito.' },
  { id: 'altD.premio', bloco: 'Locação do pacote VMI (D)', label: 'Prêmio da locação operacional', un: 'p.p. a.a.', fmt: 'pct', def: 0.04, origem: 'ss', fonte: 'Risco de valor residual, gestão e troca do equipamento, inadimplência. Calibrado: com 4 p.p. e residual de 25% em 5 anos, o aluguel da TC sai em ~R$ 61 mil/mês, igual ao contrato de locação de TC 128 canais da SMS São Paulo (R$ 62,4 mil/mês, 60 meses, manutenção inclusa; PNCP 2026).' },
  { id: 'altD.trib', bloco: 'Locação do pacote VMI (D)', label: 'Tributos do locador sobre a parcela financeira', un: '% do aluguel', fmt: 'pct', def: 0.0365, origem: 'ss', fonte: 'PIS/COFINS cumulativo (Lucro Presumido). Locação de bem móvel não paga ISS (STF, Súmula Vinculante 31). A partir de 2027 a CBS substitui PIS/COFINS (EC 132/2023, LC 214/2025); o efeito líquido depende dos créditos do locador. A manutenção entra pelo preço do contrato Ouro, que já traz os tributos do serviço.' },
  { id: 'altD.dep_tc', bloco: 'Locação do pacote VMI (D)', label: 'Queda anual do valor de mercado: TC', un: '% a.a.', fmt: 'pct', def: 0.24, origem: 'ss', fonte: 'Define o residual que o locador recupera: 24% a.a. deixa a TC com 25% do valor em 5 anos. Calibrado junto com o prêmio (ver acima).' },
  { id: 'altD.dep_us', bloco: 'Locação do pacote VMI (D)', label: 'Queda anual do valor de mercado: ultrassom', un: '% a.a.', fmt: 'pct', def: 0.30, origem: 'ss', fonte: 'Obsolescência mais rápida: 17% do valor em 5 anos.' },
  { id: 'altD.dep_rx', bloco: 'Locação do pacote VMI (D)', label: 'Queda anual do valor de mercado: RX móvel', un: '% a.a.', fmt: 'pct', def: 0.20, origem: 'ss', fonte: 'Tecnologia mais estável: 33% do valor em 5 anos.' },
  { id: 'altD.dep_dr', bloco: 'Locação do pacote VMI (D)', label: 'Queda anual do valor de mercado: placa DR', un: '% a.a.', fmt: 'pct', def: 0.30, origem: 'ss', fonte: 'Detector portátil: desgaste e risco de queda; 17% do valor em 5 anos.' },

  /* ---- Cliente (crédito) ---- */
  { id: 'cliente.natureza', bloco: 'Tomador (ABENSENA)', label: 'Natureza jurídica', un: '', fmt: 'txt', def: 'filantropica', origem: 'deck', fonte: 'Associação Beneficente Nossa Senhora de Nazaré (filantrópica).', ui: { choices: [['filantropica', 'Filantrópica'], ['privada', 'Privada com fins lucrativos']] } },
  { id: 'cliente.uf', bloco: 'Tomador (ABENSENA)', label: 'UF', un: '', fmt: 'txt', def: 'SP', origem: 'deck', fonte: 'Ipiranga, São Paulo.' },
  { id: 'cliente.rob', bloco: 'Tomador (ABENSENA)', label: 'Receita bruta anual (porte BNDES)', un: 'R$', fmt: 'num', def: 99043842 / 8 * 12, origem: 'deck', fonte: 'Receita total jan–ago/26 R$ 99,04 mi anualizada (DRE gerencial). Porte média empresa.' },
  { id: 'cliente.flags.sus_complementar', bloco: 'Tomador (ABENSENA)', label: 'Filantrópica complementar ao SUS, participante do Agora Tem Especialistas', un: '1/0', fmt: 'int', def: 1, origem: 'pendente', fonte: 'Requisito do FGTS-Saúde (Manual de Fomento v002, item 5.5.1 k): declaração de participação no programa enviada ao Ministério da Saúde. Adesão a confirmar.', ui: { choices: [[1, 'Sim (a confirmar)'], [0, 'Não']] } },
  { id: 'cliente.flags.cebas_sus60', bloco: 'Tomador (ABENSENA)', label: 'Tem CEBAS na modalidade de prestação de serviços com no mínimo 60% ao SUS?', un: '', fmt: 'txt', def: '', origem: 'pendente', fonte: 'Requisito do FGTS-Saúde (Manual de Fomento v002, item 5.5.1 g): CEBAS publicado no DOU, modalidade de prestação anual de serviços ao SUS de no mínimo 60%. Sem resposta, o FGTS-Saúde fica em "depende de confirmação"; com Não, sai da comparação. Hoje o SUS é cerca de 20% do hospital.', ui: { choices: [['', 'Não informado'], ['sim', 'Sim'], ['nao', 'Não']] } },
  { id: 'cliente.sus_creditos_12m', bloco: 'Tomador (ABENSENA)', label: 'Créditos SUS recebidos nos últimos 12 meses', un: 'R$', fmt: 'num', def: 0, origem: 'pendente', fonte: 'Define o limite do FGTS-Saúde: a parcela não pode passar de 35% da média mensal dos créditos SUS dos últimos 12 meses, já descontados outros contratos no Teto MAC (Manual de Fomento v002, item 5.1.2). Zero = não informado.' },
  { id: 'cliente.sus_mac_outros', bloco: 'Tomador (ABENSENA)', label: 'Já tem outros empréstimos consumindo o repasse do SUS (Teto MAC)?', un: '', fmt: 'txt', def: '', origem: 'pendente', fonte: 'Contratos com cessão ou consignação de recebíveis do SUS reduzem a margem do FGTS-Saúde.', ui: { choices: [['', 'Não informado'], ['nao', 'Não'], ['sim', 'Sim']] } },
  { id: 'cliente.sus_mac_parcelas', bloco: 'Tomador (ABENSENA)', label: 'Parcelas desses empréstimos descontadas do Teto MAC', un: 'R$/mês', fmt: 'num', def: 0, origem: 'pendente', fonte: 'Soma das parcelas mensais já consignadas no repasse SUS. Só conta se a pergunta anterior for Sim.' },
  { id: 'altC.cfi_presumido', bloco: 'Tomador (ABENSENA)', label: 'Tratar o pacote como credenciado (CFI) mesmo com itens sem código', un: '1/0', fmt: 'int', def: 1, origem: 'premissa', fonte: 'Catálogo CFI do BNDES (14 e 15/10/2026) e tabela FINAME VMI: Aquila 320 S e Apolo D constam; a TC Pulsar está com credenciamento previsto até dez/2026 (premissa VMI); o ultrassom Invictus e a placa DR avulsa não aparecem. Com 1, o FINAME financia o pacote inteiro (contratação em 2027, depois do credenciamento); com 0, só os itens com código emitido hoje.', ui: { choices: [[1, 'Sim (Pulsar até dez/2026; Invictus e placa DR a resolver)'], [0, 'Não (só códigos emitidos hoje)']] } },

  /* ---- Entidade ---- */
  { id: 'entidade.ebitda_periodo', bloco: 'Hospital: capacidade de crédito', label: 'EBITDA do hospital no período', un: 'R$', fmt: 'num', def: 7166162, origem: 'deck', fonte: 'DRE gerencial jan–ago/26 (7% da receita).' },
  { id: 'entidade.receita_periodo', bloco: 'Hospital: capacidade de crédito', label: 'Receita total no período', un: 'R$', fmt: 'num', def: 99043842, origem: 'deck', fonte: 'DRE gerencial jan–ago/26 (+39% vs 2025).' },
  { id: 'entidade.meses_periodo', bloco: 'Hospital: capacidade de crédito', label: 'Meses do período', un: 'meses', fmt: 'int', def: 8, origem: 'deck', fonte: 'Janeiro a agosto de 2026.' },
  { id: 'entidade.ebitda_cresc_aa', bloco: 'Hospital: capacidade de crédito', label: 'Crescimento do EBITDA do hospital', un: '% a.a.', fmt: 'pct', def: 0, origem: 'ss', fonte: 'Conservador: EBITDA anualizado constante. O plano do CEO mira +50% de faturamento.' },
  { id: 'entidade.caixa', bloco: 'Hospital: capacidade de crédito', label: 'Caixa', un: 'R$', fmt: 'num', def: 2688810, origem: 'deck', fonte: 'Balanço em 31/08/2026.' },
  { id: 'entidade.div_cp', bloco: 'Hospital: capacidade de crédito', label: 'Financiamentos de curto prazo', un: 'R$', fmt: 'num', def: 4187597, origem: 'deck', fonte: 'Balanço em 31/08/2026.' },
  { id: 'entidade.div_lp', bloco: 'Hospital: capacidade de crédito', label: 'Financiamentos de longo prazo', un: 'R$', fmt: 'num', def: 25335872, origem: 'deck', fonte: 'Balanço em 31/08/2026.' },
  { id: 'entidade.tdc_min', bloco: 'Hospital: capacidade de crédito', label: 'TDC: valor estimado (piso)', un: 'R$', fmt: 'num', def: 50000000, origem: 'deck', fonte: 'Transferência do potencial construtivo: R$ 50 a 70 mi; emissão em dez/26, negociação no 1T27.' },
  { id: 'entidade.tdc_mes', bloco: 'Hospital: capacidade de crédito', label: 'TDC: mês da liquidação da dívida', un: 'AAAA-MM', fmt: 'txt', def: '2027-03', origem: 'deck', fonte: 'Negociação no primeiro trimestre de 2027; restauro termina em maio/27.' },
  { id: 'entidade.tdc_liquida', bloco: 'Hospital: capacidade de crédito', label: 'TDC: fração da dívida bancária liquidada', un: '0 a 1', fmt: 'pct', def: 1, origem: 'deck', fonte: '"Oportunidade para liquidar a dívida" (slide 10).' }
];

/* Mapa de empréstimos em 31/12/2025 (deck, slide 6). Leasing: parcela estimada pelo saldo ÷ meses restantes. */
var EMPRESTIMOS_PADRAO = [
  { id: 'e1', banco: 'Funsai', mod: 'Mútuo', parcela: 13145.69, fim: '2030-12', saldo: 949283.47, liquida_tdc: true },
  { id: 'e2', banco: 'Bradesco', mod: 'Capital de giro', parcela: 155360.01, fim: '2027-04', saldo: 2230439.52, liquida_tdc: true },
  { id: 'e3', banco: 'Bradesco', mod: 'FGI', parcela: 279738.59, fim: '2030-02', saldo: 7495100.00, liquida_tdc: true },
  { id: 'e4', banco: 'Bradesco', mod: 'Capital de giro', parcela: 89210.69, fim: '2029-10', saldo: 2483626.07, liquida_tdc: true },
  { id: 'e5', banco: 'Bradesco', mod: 'Capital de giro', parcela: 230956.58, fim: '2026-12', saldo: 2500000.00, liquida_tdc: true },
  { id: 'e6', banco: 'Itaú', mod: 'Capital de giro', parcela: 80358.55, fim: '2028-07', saldo: 1767149.07, liquida_tdc: true },
  { id: 'e7', banco: 'Itaú', mod: 'Capital de giro', parcela: 54911.36, fim: '2028-10', saldo: 1700214.02, liquida_tdc: true },
  { id: 'e8', banco: 'Banco do Brasil', mod: 'Capital de giro', parcela: 311337.45, fim: '2028-09', saldo: 6971033.39, liquida_tdc: true },
  { id: 'e9', banco: 'Banco do Brasil', mod: 'Capital de giro', parcela: 138477.92, fim: '2026-09', saldo: 1125000.00, liquida_tdc: true },
  { id: 'e10', banco: 'Arrendamento mercantil', mod: 'Leasing', parcela: 17670, fim: '2028-08', saldo: 565436.13, liquida_tdc: false, obs: 'Parcela estimada: saldo ÷ 32 meses' }
];

/* Equipamentos: pacote B (proposta do Jaime, GE/CDK, HFS 60x) e pacote C (preços VMI de 15/10/2026).
   m_prata / m_ouro: contrato de manutenção pós-garantia por unidade, R$/mês; tubo: soma a provisão de tubo no Prata. */
var EQUIP_B_PADRAO = [
  { id: 'tc', nome: 'Tomografia computadorizada 64/128 canais, Dual Energy', modelo: 'GE (modelo não informado)', qtd: 1, preco: 1964024.80, parcela: 50524.32, n: 60, fin: true, obs: 'Preço em USD convertido a 5,1604; financiamento direto Banco GEHC (HFS)', m_prata: 11456.81, m_ouro: 17000, tubo: true, m_fonte: 'Prata: 7% a.a. do valor (Controladoria) + provisão de tubo. Ouro: plano GE citado pelo Jaime, R$ 17 mil/mês com peças (contratos públicos de TC com tubo: mediana R$ 16.775/mês).' },
  { id: 'us', nome: 'Ultrassom', modelo: 'GE LOGIQ e (c/ cardio)', qtd: 2, preco: 110000, parcela: 2867.03, n: 60, fin: true, obs: 'R$ 220 mil o par; parcela R$ 5.734,06', m_prata: 1588.62, m_ouro: 2677, m_fonte: 'Ouro: manutenção de ultrassom GE com peças, EBSERH/UFBA, R$ 32.124/ano (PNCP, 2025). Prata: 59,3% do Ouro (razão média das cotações VMI).' },
  { id: 'rxp', nome: 'Raio X portátil', modelo: 'CDK Mascote Dynamic', qtd: 1, preco: 150000, parcela: 2500, n: 60, fin: true, obs: '"Sem juros" em 60x: validar', m_prata: 3900, m_ouro: 6800, m_fonte: 'Proxy: cotação VMI do Aquila S (média SP, 15/10/2026), mesma classe; sem cotação CDK.' },
  { id: 'rxdr', nome: 'Raio X portátil com placa DR', modelo: 'Não informado', qtd: 1, preco: 490000, parcela: 13079, n: 60, fin: true, obs: 'Proposta estratégica cita R$ 500 mil', m_prata: 4600, m_ouro: 7500, m_fonte: 'Proxy: cotação VMI do Aquila D (média SP, 15/10/2026), mesma classe; modelo não informado.' },
  { id: 'dr', nome: 'Placa DR avulsa', modelo: 'Não informado', qtd: 1, preco: 110000, parcela: 1700, n: 60, fin: true, obs: '60 × R$ 1.700 = R$ 102 mil < R$ 110 mil à vista: erro na proposta', m_prata: 0, m_ouro: 700, m_fonte: 'Ouro: diferença entre os contratos VMI do Aquila D e do Aquila S (o detector digital). O Prata não cobre sistemas de imagem.' }
];
var EQUIP_C_PADRAO = [
  { id: 'tc', loc_vmi: { 12: 111245, 24: 67236, 36: 52597, 48: 45299, 60: 42362, 72: 42216, 84: 42112 }, loc_vmi_modelo: 'Tomografia (Pulsar)', loc_vmi_fonte: 'Cotação de locação VMI, 16/10/2026 (R$/mês por unidade)', nome: 'Tomografia computadorizada 64 canais / 128 cortes', modelo: 'VMI Pulsar 128/64', qtd: 1, preco: 1950000, cfi: 'previsto dez/2026', fin: true, obs: 'Preço VMI de 15/10/2026. CFI PREVISTO: não consta no Catálogo CFI em 14/10/2026; premissa VMI (15/10/2026) de credenciamento até dez/2026, antes da contratação (Gate 2, 2T27). O FINAME só contrata com o código emitido. Dual Energy e protocolo cardíaco a confirmar', m_prata: 11375, m_ouro: 16775.26, tubo: true, m_fonte: 'Sem cotação VMI. Prata: 7% a.a. do valor de referência + provisão de tubo. Ouro: mediana de 5 contratos públicos de TC com peças e tubo (PNCP 2025–26), R$ 16.775/mês.' },
  { id: 'us', nome: 'Ultrassom portátil, uso geral', modelo: 'Invictus', qtd: 2, preco: 117000, cfi: '', fin: true, obs: 'Preço VMI de 15/10/2026. Não aparece no Catálogo CFI do BNDES (busca por nome e pelos CNPJs da VMI e da Alfa Med em 15/10/2026): fora do FINAME até o credenciamento; o FGTS-Saúde não exige CFI. Alternativa credenciada: Alfa Med Dominus L1 (CFI 04313989)', m_prata: 1565.82, m_ouro: 2638.59, m_fonte: 'Sem cotação para o Invictus. Ouro: mediana de 4 contratos públicos de ultrassom com peças (R$ 2.405 a R$ 2.878/mês; PNCP 2023–26). Prata: 59,3% do Ouro.' },
  { id: 'rxp', loc_vmi: { 12: 9857, 24: 6551, 36: 5449, 48: 4898, 60: 4568, 72: 4347, 84: 4190 }, loc_vmi_modelo: 'Aquila S', loc_vmi_fonte: 'Cotação de locação VMI, 16/10/2026 (R$/mês por unidade)', nome: 'Raio X móvel analógico', modelo: 'VMI Aquila 320 S', qtd: 1, preco: 139000, cfi: '03538400', fin: true, obs: 'Preço VMI de 15/10/2026. CFI 03538400, válido até 13/03/2030 (tabela FINAME VMI)', m_prata: 3900, m_ouro: 6800, m_fonte: 'Cotação VMI do Aquila S (média SP, 15/10/2026).' },
  { id: 'rxdr', loc_vmi: { 12: 18499, 24: 12379, 36: 10339, 48: 9319, 60: 8706, 72: 8298, 84: 8007 }, loc_vmi_modelo: 'Aquila D', loc_vmi_fonte: 'Cotação de locação VMI, 16/10/2026 (R$/mês por unidade). A VMI cotou a locação do RX digital como Aquila D; na compra o RX digital é o Apolo D (fixo, R$ 290 mil). Confirmar se é o mesmo equipamento.', nome: 'Raio X digital (DR)', modelo: 'VMI Apolo D (fixo)', qtd: 1, preco: 290000, cfi: '03538246', fin: true, obs: 'Preço VMI de 15/10/2026. Apolo é RX fixo (sala), não portátil: o pacote GE prevê RX portátil com placa DR; confirmar o perímetro com o Jaime (alternativa portátil: Aquila 500 D, CFI 04279825). CFI 03538246, válido até 11/03/2030', m_prata: 4600, m_ouro: 7500, m_fonte: 'Sem cotação para o Apolo; proxy: cotação VMI do Aquila D (RX digital, média SP, 15/10/2026).' },
  { id: 'dr', nome: 'Placa DR avulsa', modelo: 'VMI', qtd: 1, preco: 107000, cfi: '', fin: true, obs: 'Preço VMI de 15/10/2026. Detector avulso não aparece no Catálogo CFI do BNDES em 15/10/2026', m_prata: 0, m_ouro: 700, m_fonte: 'Ouro: diferença entre os contratos VMI do Aquila D e do Aquila S (o detector digital). O Prata não cobre sistemas de imagem.' }
];

/* Referências de mercado usadas nas premissas de manutenção e locação (Portal Nacional de Contratações Públicas, contratos 2023–2026).
   mes = valor global ÷ meses de vigência. */
var PNCP = 'https://pncp.gov.br/app/contratos/';
var BENCH_MANUT = [
  { mod: 'TC', obj: 'Philips Incisive CT, peças inclusive tubos', org: 'Município de Porto Alegre/RS', ano: 2025, total: 402606.12, meses: 24, url: PNCP + '92963560000160/2025/995' },
  { mod: 'TC', obj: 'Neusoft NeuViz 16 canais, peças e 1 tubo/ano', org: 'FMS Itatiaia/RJ', ano: 2026, total: 164304, meses: 12, url: PNCP + '10476365000140/2026/7' },
  { mod: 'TC', obj: 'Canon, peças, 1 tubo/ano e detector', org: 'Município de São Luís/MA', ano: 2026, total: 298764, meses: 12, url: PNCP + '06307102000130/2026/859' },
  { mod: 'TC', obj: 'Tomógrafo, com peças', org: 'Município de Ribeirão Pires/SP', ano: 2026, total: 140100, meses: 12, url: PNCP + '46522967000134/2026/22' },
  { mod: 'TC', obj: 'Canon Aquilion Lightning, reposição de peças', org: 'SES-PE, Hosp. Barão de Lucena', ano: 2026, total: 432000, meses: 12, url: PNCP + '10572048000632/2026/43' },
  { mod: 'US', obj: 'Ultrassom GE, peças e testes de segurança', org: 'EBSERH, Maternidade Climério de Oliveira/BA', ano: 2025, total: 32124, meses: 12, url: PNCP + '15126437000143/2025/1229' },
  { mod: 'US', obj: 'Philips Affiniti 70 G, com peças', org: 'Hospital Militar de Área de São Paulo', ano: 2025, total: 31202.16, meses: 12, url: PNCP + '00394452000103/2025/9480' },
  { mod: 'US', obj: 'Philips Affiniti 70, peças e mão de obra', org: 'Município de Caxias do Sul/RS', ano: 2023, total: 28864.80, meses: 12, url: PNCP + '88830609000139/2023/475' },
  { mod: 'US', obj: 'Mindray M6 portátil, com peças', org: 'Inova Capixaba/ES', ano: 2026, total: 17268, meses: 6, url: PNCP + '36901264000163/2026/247' }
];
var BENCH_LOC = [
  { mod: 'TC', obj: 'Locação de TC 128 canais com manutenção, calibração e treinamento (1 unidade)', org: 'SMS São Paulo, Hosp. Fernando Mauro Pires da Rocha', ano: 2026, total: 3744000, meses: 60, url: PNCP + '13864377000130/2026/303' },
  { mod: 'TC', obj: 'Locação emergencial de TC 64 canais', org: 'Município de São Luís/MA', ano: 2026, total: 660000, meses: 11, url: PNCP + '06307102000130/2026/355' },
  { mod: 'RX', obj: 'Locação de RX móvel para leitos, UTI e PA', org: 'FMS Campina Grande/PB', ano: 2025, total: 114000, meses: 12, url: PNCP + '24513574000121/2025/217' },
  { mod: 'RX', obj: 'Locação de RX móvel com manutenção e treinamento', org: 'FMS Paraúna/GO', ano: 2025, total: 14000, meses: 4, url: PNCP + '11171868000170/2025/43' }
];

function modeloPadrao() {
  var m = {};
  SCHEMA.forEach(function (s) { setPath(m, s.id, s.def); });
  m.equip = { B: JSON.parse(JSON.stringify(EQUIP_B_PADRAO)), C: JSON.parse(JSON.stringify(EQUIP_C_PADRAO)), B_n: 60 };
  m.entidade.emprestimos = JSON.parse(JSON.stringify(EMPRESTIMOS_PADRAO));
  m.altC.custo = 'auto'; m.altC.valor_obra = 0; m.altC.valor_financiar = null;
  return m;
}
/* Itens salvos antes dos contratos de manutenção: completa m_prata, m_ouro, tubo e m_fonte pelo item padrão de mesmo id. */
function completarManut(itens, padrao) {
  (itens || []).forEach(function (it) {
    var d0 = padrao.filter(function (x) { return x.id === it.id; })[0];
    if (it.loc_vmi === undefined && d0 && d0.loc_vmi) { it.loc_vmi = JSON.parse(JSON.stringify(d0.loc_vmi)); it.loc_vmi_modelo = d0.loc_vmi_modelo; it.loc_vmi_fonte = d0.loc_vmi_fonte; }
    if (it.m_ouro != null) return;
    var d = padrao.filter(function (x) { return x.id === it.id; })[0];
    it.m_prata = d ? d.m_prata : 0; it.m_ouro = d ? d.m_ouro : 0; it.tubo = d ? !!d.tubo : false; it.m_fonte = d ? d.m_fonte : 'Item sem contrato informado';
  });
  return itens;
}
function setPath(o, path, v) { var p = path.split('.'); for (var i = 0; i < p.length - 1; i++) { if (o[p[i]] == null || typeof o[p[i]] !== 'object') o[p[i]] = {}; o = o[p[i]]; } o[p[p.length - 1]] = v; }
function getPath(o, path) { var p = path.split('.'); for (var i = 0; i < p.length; i++) { if (o == null) return undefined; o = o[p[i]]; } return o; }
if (typeof module !== 'undefined') module.exports = { BENCH_MANUT: BENCH_MANUT, BENCH_LOC: BENCH_LOC, SCHEMA: SCHEMA, modeloPadrao: modeloPadrao, completarManut: completarManut, setPath: setPath, getPath: getPath, EQUIP_B_PADRAO: EQUIP_B_PADRAO, EQUIP_C_PADRAO: EQUIP_C_PADRAO, EMPRESTIMOS_PADRAO: EMPRESTIMOS_PADRAO };
