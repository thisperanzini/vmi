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
  { id: 'propria.manut_tc', bloco: 'Imagem própria: operação', label: 'Manutenção da TC (contrato básico)', un: 'R$/mês', fmt: 'num', def: 11456.81, origem: 'controladoria', fonte: '6% a 8% a.a. do valor à vista (Informações - Validar!G4). Jaime cita plano intermediário de R$ 17 mil/mês com peças.' },
  { id: 'propria.manut_outros', bloco: 'Imagem própria: operação', label: 'Manutenção de ultrassom e RX', un: 'R$/mês', fmt: 'num', def: 7037.5, origem: 'controladoria', fonte: 'Informações - Validar!G5:G7.' },
  { id: 'propria.tubo', bloco: 'Imagem própria: operação', label: 'Provisão do tubo da TC', un: 'R$/mês', fmt: 'num', def: 7270.83, origem: 'controladoria', fonte: 'Tubo de R$ 209 mil a cada 2–3 anos (Santa Casa de Birigui, 2020). Não se aplica com Full Service.' },
  { id: 'propria.tubo_incluir', bloco: 'Imagem própria: operação', label: 'Incluir provisão do tubo', un: '1/0', fmt: 'int', def: 1, origem: 'controladoria', fonte: 'Viabilidade!C20.', ui: { choices: [[1, 'Sim'], [0, 'Não (Full Service)']] } },
  { id: 'propria.manut_inicio_ano', bloco: 'Imagem própria: operação', label: 'Ano em que a manutenção começa', un: 'ano do projeto', fmt: 'int', def: 2, origem: 'controladoria', fonte: 'Garantia de fábrica cobre o 1º ano (Viabilidade!C32).' },
  { id: 'propria.manut_fator', bloco: 'Imagem própria: operação', label: 'Fator sobre a manutenção (sensibilidade)', un: '×', fmt: 'num', def: 1, origem: 'ss', fonte: '1,0 = valores acima. Use 1,5 para testar o plano intermediário.' },
  { id: 'propria.rispacs_mes', bloco: 'Imagem própria: operação', label: 'RIS/PACS: mensalidade', un: 'R$/mês', fmt: 'num', def: 5875, origem: 'pendente', fonte: 'Faixa R$ 1.750 a R$ 10.000 (Informações - Validar). Verificar se o hospital já tem RIS/PACS; opção a investigar à parte.' },
  { id: 'propria.rispacs_impl', bloco: 'Imagem própria: operação', label: 'RIS/PACS: implantação (ano 0)', un: 'R$', fmt: 'num', def: 30000, origem: 'pendente', fonte: 'Faixa R$ 10 mil a R$ 50 mil (Informações - Validar).' },
  { id: 'propria.tc_exh', bloco: 'Imagem própria: operação', label: 'Capacidade da TC: exames por hora', un: 'exames/h', fmt: 'num', def: 3, origem: 'ss', fonte: 'Padrão da ferramenta de financiamento (TC).' },
  { id: 'propria.tc_h', bloco: 'Imagem própria: operação', label: 'Capacidade da TC: horas por dia', un: 'h', fmt: 'num', def: 24, origem: 'ss', fonte: 'Hospital com PS 24 h; 1.400 TC/mês não cabem em 12 h.' },
  { id: 'propria.tc_d', bloco: 'Imagem própria: operação', label: 'Capacidade da TC: dias por mês', un: 'dias', fmt: 'num', def: 30, origem: 'ss', fonte: 'Operação contínua.' },

  /* ---- Cenário ---- */
  { id: 'cenario.volume_var', bloco: 'Cenário de volume', label: 'Variação de volume vs. base', un: '%', fmt: 'pct', def: 0, origem: 'controladoria', fonte: 'Cenário 1 = volume atual; cenário 2 da Controladoria = +30%. Jaime projeta +27,3% para 2027.' },
  { id: 'cenario.cresc_aa', bloco: 'Cenário de volume', label: 'Crescimento anual do volume a partir do ano 2', un: '% a.a.', fmt: 'pct', def: 0, origem: 'controladoria', fonte: 'Viabilidade!C24: volume constante.' },
  { id: 'cenario.reajuste_aa', bloco: 'Cenário de volume', label: 'Reajuste anual de preços e custos', un: '% a.a.', fmt: 'pct', def: 0, origem: 'ss', fonte: '0 = valores constantes, como na planilha. Aplica-se por igual a receita e custos.' },

  /* ---- Financeiro ---- */
  { id: 'fin.alternativa', bloco: 'Parâmetros financeiros', label: 'Alternativa levada ao plano em números', un: 'B/C', fmt: 'txt', def: 'C', origem: 'ss', fonte: 'B = pacote GE financiado pelo HFS em 60x; C = pacote VMI/Alfamed financiado pela melhor linha.', ui: { choices: [['C', 'C · VMI/Alfamed'], ['B', 'B · GE/HFS']] } },
  { id: 'fin.ano_inicio', bloco: 'Parâmetros financeiros', label: 'Ano 1 do projeto', un: 'ano', fmt: 'int', def: 2027, origem: 'ss', fonte: 'Contratação prevista no 1º trimestre de 2027, junto com a negociação do TDC.' },
  { id: 'fin.inicio_op_mes', bloco: 'Parâmetros financeiros', label: 'Meses do ano 1 ainda com a EMG (transição)', un: 'meses', fmt: 'int', def: 3, origem: 'ss', fonte: 'Instalação e sobreposição de equipes; o ganho do ano 1 é proporcional aos meses restantes.' },
  { id: 'fin.horizonte', bloco: 'Parâmetros financeiros', label: 'Horizonte de análise', un: 'anos', fmt: 'int', def: 10, origem: 'ss', fonte: 'Vida útil fiscal de 10 anos (IN RFB 1.700/2017) e prazo do FINAME. Controladoria usou 5.' },
  { id: 'fin.desconto', bloco: 'Parâmetros financeiros', label: 'Taxa de desconto (custo de oportunidade)', un: '% a.a.', fmt: 'pct', def: 0.15, origem: 'controladoria', fonte: 'Viabilidade!C28.' },
  { id: 'fin.vida_util', bloco: 'Parâmetros financeiros', label: 'Vida útil para depreciação', un: 'anos', fmt: 'int', def: 10, origem: 'controladoria', fonte: 'Viabilidade!C29.' },
  { id: 'fin.residual', bloco: 'Parâmetros financeiros', label: 'Valor residual no fim do horizonte', un: '% do valor contábil', fmt: 'pct', def: 0, origem: 'controladoria', fonte: 'Viabilidade!C30: conservador, 0%.' },
  { id: 'fin.tributos', bloco: 'Parâmetros financeiros', label: 'Tributos sobre o resultado', un: '%', fmt: 'pct', def: 0, origem: 'controladoria', fonte: 'Entidade sem fins lucrativos (Viabilidade!C27).' },

  /* ---- Financiamento C ---- */
  { id: 'altC.prazo', bloco: 'Financiamento do pacote C (motor Financiamento VMI)', label: 'Prazo pedido', un: 'meses', fmt: 'int', def: 120, origem: 'ss', fonte: 'FINAME até 120; FGTS-Saúde até 240. O motor reduz ao máximo da linha.' },
  { id: 'altC.carencia', bloco: 'Financiamento do pacote C (motor Financiamento VMI)', label: 'Carência pedida', un: 'meses', fmt: 'int', def: 24, origem: 'ss', fonte: 'FINAME até 24; FGTS-Saúde até 12.' },
  { id: 'altC.inicio', bloco: 'Financiamento do pacote C (motor Financiamento VMI)', label: 'Mês da contratação', un: 'AAAA-MM', fmt: 'txt', def: '2027-03', origem: 'ss', fonte: 'Após a emissão do TDC (dez/26).' },
  { id: 'altC.sistema', bloco: 'Financiamento do pacote C (motor Financiamento VMI)', label: 'Sistema de amortização', un: 'SAC/Price', fmt: 'txt', def: 'SAC', origem: 'ss', fonte: 'Padrão BNDES: SAC.', ui: { choices: [['SAC', 'SAC'], ['Price', 'Price']] } },
  { id: 'altC.carModo', bloco: 'Financiamento do pacote C (motor Financiamento VMI)', label: 'Juros na carência', un: 'pagos/capitalizados', fmt: 'txt', def: 'pagos', origem: 'ss', fonte: 'Padrão FINAME: juros pagos trimestralmente na carência (aqui mensalizados).', ui: { choices: [['pagos', 'Pagos'], ['capitalizados', 'Capitalizados']] } },
  { id: 'altC.linha', bloco: 'Financiamento do pacote C (motor Financiamento VMI)', label: 'Linha escolhida', un: 'id', fmt: 'txt', def: 'auto', origem: 'ss', fonte: '"auto" = 1ª do ranking por custo total.', ui: { linhas: true } },
  { id: 'altC.honorario_pct', bloco: 'Financiamento do pacote C (motor Financiamento VMI)', label: 'Honorário de intermediação', un: '% do financiado', fmt: 'pct', def: 0, origem: 'ss', fonte: 'Oculto nesta versão (0%).' },

  /* ---- Cliente (crédito) ---- */
  { id: 'cliente.natureza', bloco: 'Tomador (ABENSENA)', label: 'Natureza jurídica', un: '', fmt: 'txt', def: 'filantropica', origem: 'deck', fonte: 'Associação Beneficente Nossa Senhora de Nazaré (filantrópica).', ui: { choices: [['filantropica', 'Filantrópica'], ['privada', 'Privada com fins lucrativos']] } },
  { id: 'cliente.uf', bloco: 'Tomador (ABENSENA)', label: 'UF', un: '', fmt: 'txt', def: 'SP', origem: 'deck', fonte: 'Ipiranga, São Paulo.' },
  { id: 'cliente.rob', bloco: 'Tomador (ABENSENA)', label: 'Receita bruta anual (porte BNDES)', un: 'R$', fmt: 'num', def: 99043842 / 8 * 12, origem: 'deck', fonte: 'Receita total jan–ago/26 R$ 99,04 mi anualizada (DRE gerencial). Porte média empresa.' },
  { id: 'cliente.flags.sus_complementar', bloco: 'Tomador (ABENSENA)', label: 'Filantrópica complementar ao SUS, aderente ao Agora Tem Especialistas', un: '1/0', fmt: 'int', def: 1, origem: 'pendente', fonte: 'Hospital 20% filantrópico. Adesão ao programa a confirmar: habilita FGTS-Saúde (Caixa).', ui: { choices: [[1, 'Sim (a confirmar)'], [0, 'Não']] } },
  { id: 'altC.cfi_presumido', bloco: 'Tomador (ABENSENA)', label: 'Tratar o pacote como credenciado (CFI) mesmo com itens sem código', un: '1/0', fmt: 'int', def: 0, origem: 'fonte', fonte: 'Catálogo CFI do BNDES (14/10/2026): Aquila e Dominus L1 constam; a TC Pulsar e a placa DR avulsa não. Com 0, o FINAME só financia os itens com CFI; a TC vai para linha sem exigência de CFI ou recurso próprio.', ui: { choices: [[0, 'Não (catálogo real)'], [1, 'Sim (hipótese: Pulsar credenciada)']] } },

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

/* Equipamentos: pacote B (proposta do Jaime, GE/CDK, HFS 60x) e pacote C (VMI/Alfamed, preço a definir = igual ao B por padrão). */
var EQUIP_B_PADRAO = [
  { id: 'tc', nome: 'Tomografia computadorizada 64/128 canais, Dual Energy', modelo: 'GE (modelo não informado)', qtd: 1, preco: 1964024.80, parcela: 50524.32, n: 60, fin: true, obs: 'Preço em USD convertido a 5,1604; financiamento direto Banco GEHC (HFS)' },
  { id: 'us', nome: 'Ultrassom', modelo: 'GE LOGIQ e (c/ cardio)', qtd: 2, preco: 110000, parcela: 2867.03, n: 60, fin: true, obs: 'R$ 220 mil o par; parcela R$ 5.734,06' },
  { id: 'rxp', nome: 'Raio X portátil', modelo: 'CDK Mascote Dynamic', qtd: 1, preco: 150000, parcela: 2500, n: 60, fin: true, obs: '"Sem juros" em 60x: validar' },
  { id: 'rxdr', nome: 'Raio X portátil com placa DR', modelo: 'Não informado', qtd: 1, preco: 490000, parcela: 13079, n: 60, fin: true, obs: 'Proposta estratégica cita R$ 500 mil' },
  { id: 'dr', nome: 'Placa DR avulsa', modelo: 'Não informado', qtd: 1, preco: 110000, parcela: 1700, n: 60, fin: true, obs: '60 × R$ 1.700 = R$ 102 mil < R$ 110 mil à vista: erro na proposta' }
];
var EQUIP_C_PADRAO = [
  { id: 'tc', nome: 'Tomografia computadorizada 64 canais / 128 cortes', modelo: 'VMI Pulsar 128', qtd: 1, preco: 1964024.80, cfi: '', fin: true, obs: 'SEM CFI: não consta no Catálogo CFI do BNDES em 14/10/2026. Só entra em linha sem exigência de CFI (FGTS-Saúde) até o credenciamento. Preço a definir (padrão = GE); Dual Energy e protocolo cardíaco a confirmar' },
  { id: 'us', nome: 'Ultrassom', modelo: 'Alfa Med Dominus L1', qtd: 2, preco: 110000, cfi: '04313989', fin: true, obs: 'Grupo Prime; CFI verificado em 14/10/2026. Preço a definir' },
  { id: 'rxp', nome: 'Raio X móvel', modelo: 'VMI Aquila 320 S', qtd: 1, preco: 150000, cfi: '03538400', fin: true, obs: 'CFI verificado em 14/10/2026. Preço a definir' },
  { id: 'rxdr', nome: 'Raio X móvel digital (DR)', modelo: 'VMI Aquila 500 D', qtd: 1, preco: 490000, cfi: '04279825', fin: true, obs: 'CFI verificado em 14/10/2026. Preço a definir' },
  { id: 'dr', nome: 'Placa DR avulsa', modelo: 'A definir', qtd: 1, preco: 110000, cfi: '', fin: true, obs: 'Detector avulso VMI não consta no catálogo; alternativa: RX fixo Apolo D (CFI 03538246) com detector integrado' }
];

function modeloPadrao() {
  var m = {};
  SCHEMA.forEach(function (s) { setPath(m, s.id, s.def); });
  m.equip = { B: JSON.parse(JSON.stringify(EQUIP_B_PADRAO)), C: JSON.parse(JSON.stringify(EQUIP_C_PADRAO)), B_n: 60 };
  m.entidade.emprestimos = JSON.parse(JSON.stringify(EMPRESTIMOS_PADRAO));
  m.altC.custo = 'auto'; m.altC.valor_obra = 0; m.altC.valor_financiar = null;
  return m;
}
function setPath(o, path, v) { var p = path.split('.'); for (var i = 0; i < p.length - 1; i++) { if (o[p[i]] == null || typeof o[p[i]] !== 'object') o[p[i]] = {}; o = o[p[i]]; } o[p[p.length - 1]] = v; }
function getPath(o, path) { var p = path.split('.'); for (var i = 0; i < p.length; i++) { if (o == null) return undefined; o = o[p[i]]; } return o; }
if (typeof module !== 'undefined') module.exports = { SCHEMA: SCHEMA, modeloPadrao: modeloPadrao, setPath: setPath, getPath: getPath, EQUIP_B_PADRAO: EQUIP_B_PADRAO, EQUIP_C_PADRAO: EQUIP_C_PADRAO, EMPRESTIMOS_PADRAO: EMPRESTIMOS_PADRAO };
