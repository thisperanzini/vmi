/* Base de linhas, taxas e parâmetros — versão 2026-10-09.
   Cada número tem fonte, data e confiança. A página usa esta base como padrão
   e a substitui pela versão salva no banco (config/base), quando houver. */
var BASE_PADRAO = {
  versao: "2026-10-15",
  nota: "Levantamento S&S de 09/10/2026; catálogo CFI verificado em 14/10/2026 e cruzado com a tabela FINAME VMI em 15/10/2026 (validade por item; Pulsar com CFI previsto para dez/2026, premissa VMI); modos internalização/entidade adicionados. Valores de fontes oficiais lidas na data; os marcados 'calculado' derivam de fórmula oficial com insumos oficiais.",

  /* ---------- Macro ---------- */
  macro: {
    selic: { v: 13.75, desde: "2026-09-17", obs: "Copom de 16/09/2026; próxima reunião em 04/11/2026",
      fonte: { t: "BCB – Comunicado 45.963 e SGS 432", u: "https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados?formato=json&dataInicial=01/07/2026&dataFinal=09/10/2026", d: "2026-09-16", c: "alta" } },
    focus: { data: "2026-10-02",
      selic_fim: { 2026: 13.5, 2027: 12.0, 2028: 10.5, 2029: 10.0 },
      ipca: { 2026: 5.01, 2027: 4.30, 2028: 3.80, 2029: 3.51 },
      obs: "Medianas do Focus de 02/10/2026; após 2029 o simulador mantém o último valor.",
      fonte: { t: "BCB – Relatório Focus 02/10/2026", u: "https://www.bcb.gov.br/content/focus/focus/R20261002.pdf", d: "2026-10-02", c: "alta" } },
    tlp_jm: { v: 8.12, mes: "2026-10", obs: "Parcela real da TLP de out/2026 (Jm, a5 = 1,00). TLP = (1+IPCA)×(1+Jm)−1; a parcela real fica fixa no contrato.",
      fonte: { t: "BCB – Comunicado 46.043", u: "https://www.bcb.gov.br/api/conteudo/app/normativos/exibeoutrasnormas?p1=Comunicado&p2=46043", d: "2026-09-30", c: "alta" } },
    pm: { v: 14.53, mes: "2026-10", obs: "Taxa Prefixada (Pm), Lei 14.937/2024 – custo pré do BNDES para grandes empresas",
      fonte: { t: "BCB – Comunicado 46.044", u: "https://www.bcb.gov.br/api/conteudo/app/normativos/exibeoutrasnormas?p1=Comunicado&p2=46044", d: "2026-09-30", c: "alta" } },
    pmm: { v: 14.27, mes: "2026-10", obs: "Taxa Prefixada MPME (PMm) – custo 'Pré FAT MPME' do BNDES",
      fonte: { t: "BCB – Comunicado 46.044", u: "https://www.bcb.gov.br/api/conteudo/app/normativos/exibeoutrasnormas?p1=Comunicado&p2=46044", d: "2026-09-30", c: "alta" } },
    tjlp: { v: 9.29, periodo: "4º tri 2026",
      fonte: { t: "BCB – Comunicado 46.042", u: "https://www.bcb.gov.br/api/conteudo/app/normativos/exibeoutrasnormas?p1=Comunicado&p2=46042", d: "2026-09-30", c: "alta" } },
    tr_am: { v: 0.1616, ref: "out/2026", obs: "TR mensal; o simulador a mantém constante",
      fonte: { t: "BCB – SGS 7811", u: "https://api.bcb.gov.br/dados/serie/bcdata.sgs.7811/dados/ultimos/6?formato=json", d: "2026-10-01", c: "alta" } },
    cdi: { v: 13.65, ref: "08/10/2026",
      fonte: { t: "BCB – SGS 4389", u: "https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados?formato=json&dataInicial=28/09/2026&dataFinal=09/10/2026", d: "2026-10-08", c: "alta" } },
    ipca12: { v: 4.58, ref: "set/2026",
      fonte: { t: "BCB – SGS 13522", u: "https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados?formato=json&dataInicial=01/01/2026&dataFinal=09/10/2026", d: "2026-10-09", c: "alta" } },
    iof: { diaria: 0.0082, adicional: 0.38, obs: "IOF-crédito PJ: 0,0082% ao dia (limitado a 365 dias por parcela) + 0,38% fixo. Há contestação em curso (DLG 176/2025 e ADC 96); o simulador usa a redação do Decreto 12.499/2025.",
      fonte: { t: "Decreto 6.306/2007, art. 7º (red. Dec. 12.499/2025)", u: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2007/decreto/d6306.htm", d: "2026-10-09", c: "media" } },
    bcb: [
      { id: "aq_bens", nome: "PJ – aquisição de outros bens (recursos livres)", sgs: 20729, ref: "ago/2026", v: 19.41 },
      { id: "arrend", nome: "PJ – arrendamento mercantil de outros bens", sgs: 20732, ref: "ago/2026", v: 17.19 },
      { id: "giro365", nome: "PJ – capital de giro acima de 365 dias", sgs: 20723, ref: "ago/2026", v: 22.55 },
      { id: "vendor", nome: "PJ – vendor", sgs: 20734, ref: "ago/2026", v: 18.39 },
      { id: "bndes_inv", nome: "PJ – financiamento de investimentos com recursos do BNDES (direcionado)", sgs: 20765, ref: "ago/2026", v: 11.84 }
    ]
  },

  /* ---------- Dados abertos BNDES (operações contratadas, CNAE 86) ---------- */
  empirico: {
    titulo: "BNDES Dados Abertos – operações indiretas automáticas, CNAE 86, contratadas de 02/01/2025 a 31/08/2026 (censo de 1.060 operações)",
    url: "https://dadosabertos.bndes.gov.br/dataset/operacoes-financiamento/resource/612faa0b-b6be-4b2c-9317-da5dc2c0b901",
    d: "2026-10-02",
    nota: "Campo 'juros': com TLP ou Selic é o spread sobre o custo financeiro (Taxa do BNDES + taxa do agente); com taxa fixa é a taxa total. Estatística por operação, sem ponderar por valor.",
    linhas: [
      { recorte: "FINAME · TLP · todos os portes", n: 76, p25: 4.69, med: 4.89, p75: 5.70, max: 9.35, car: 6, amort: 42 },
      { recorte: "FINAME · TLP · média empresa", n: 48, p25: 4.69, med: 4.69, p75: 5.12, max: 9.03, car: 6, amort: 42 },
      { recorte: "FINAME · TLP · pequena empresa", n: 22, p25: 4.89, med: 5.35, p75: 5.90, max: 9.35, car: 3, amort: 33 },
      { recorte: "FINAME · TLP · imagem e patologia (8640)", n: 34, p25: 4.69, med: 4.89, p75: 5.65, max: 8.51, car: 6, amort: 42 },
      { recorte: "FINAME · taxa fixa · Programa Mais Inovação", n: 47, p25: 12.30, med: 12.50, p75: 12.82, max: 15.08, car: 12, amort: 48 },
      { recorte: "FINAME · taxa fixa · demais instrumentos", n: 21, p25: 20.18, med: 20.76, p75: 21.78, max: 25.95, car: 3, amort: 48 },
      { recorte: "BNDES Automático · TLP · todos os portes", n: 75, p25: 5.40, med: 6.16, p75: 8.22, max: 11.05, car: 6, amort: 48 }
    ],
    agentes: ["Banco do Brasil (72 ops FINAME)", "Banco Votorantim (37)", "Bradesco (20)", "Itaú (10)", "Sicredi (6)", "Santander (4)", "Sicoob (3)", "Banco do Nordeste (2)"]
  },

  /* ---------- Linhas ---------- */
  linhas: [
    {
      id: "finame-bk-mpme", familia: "BNDES", nome: "BNDES Finame – BK Aquisição e Comercialização (MPME)",
      operador: "Agente financeiro credenciado (BB, Bradesco, Itaú, Santander, Sicredi, Sicoob…)", status: "aberta",
      elig: { natureza: ["privada", "filantropica"], portes: ["micro", "pequena", "media"], exige_cfi: true, importado: "nao", ufs: null },
      cond: { part: 100, prazo: 120, carencia: 24, obras: false },
      custos: ["PMm", "TLP"],
      spreads: [
        { nome: "Taxa do BNDES", base: 0.95, min: 0.95, max: 0.95, nne: 0.75, fonte: "f_finame" },
        { nome: "Taxa do agente", base: 3.94, min: 3.74, max: 4.75, fonte: "f_emp", obs: "Sem teto nem referência oficial. Faixa = spread contratado no FINAME TLP de saúde (p25 4,69 · mediana 4,89 · p75 5,70) menos a Taxa do BNDES." }
      ],
      iof: "zero", iof_base: "Dec. 6.306/2007, art. 8º, IX (recursos da FINAME)",
      garantias: "Negociadas com o agente: aval dos sócios, alienação fiduciária do bem; aceita FGI Tradicional, FGI PEAC e FG BNDES-Sebrae.",
      obs: "Exige bem novo, nacional e com código CFI válido no protocolo; a NF deve trazer o código. A Selic está suspensa como custo financeiro (Circ. BNDES 09/2026). Giro associado até 30%.",
      fontes: ["f_finame", "f_bcb_pm", "f_emp", "f_porte"]
    },
    {
      id: "finame-bk-grande", familia: "BNDES", nome: "BNDES Finame – BK Aquisição e Comercialização (grande empresa)",
      operador: "Agente financeiro credenciado", status: "aberta",
      elig: { natureza: ["privada", "filantropica"], portes: ["grande"], exige_cfi: true, importado: "nao", ufs: null },
      cond: { part: 100, prazo: 120, carencia: 24, obras: false },
      custos: ["Pm", "TLP"],
      spreads: [
        { nome: "Taxa do BNDES", base: 0.95, min: 0.95, max: 0.95, nne: 0.75, fonte: "f_finame" },
        { nome: "Taxa do agente", base: 3.94, min: 3.74, max: 4.75, fonte: "f_emp", obs: "Mesma faixa empírica da linha MPME (só 6 operações de grande porte na amostra)." }
      ],
      iof: "zero", iof_base: "Dec. 6.306/2007, art. 8º, IX",
      garantias: "Negociadas com o agente; sem FGI.",
      obs: "Igual à linha MPME, salvo custo financeiro (Pm), FGI e giro associado.",
      fontes: ["f_finame", "f_bcb_pm", "f_emp"]
    },
    {
      id: "finame-mais-inovacao", familia: "BNDES", nome: "BNDES Finame – Programa Mais Inovação (taxa fixa)",
      operador: "Agente financeiro credenciado (concentração em Banco Votorantim)", status: "condicionada",
      elig: { natureza: ["privada"], portes: ["micro", "pequena", "media", "grande"], exige_cfi: true, importado: "nao", ufs: null,
        condicao: { campo: "mais_inovacao", rotulo: "Equipamento enquadrado no Programa Mais Inovação (confirmar com o agente)" } },
      cond: { part: 100, prazo: 120, carencia: 24, obras: false },
      custos: ["EMP_MI"],
      spreads: [],
      iof: "zero", iof_base: "Dec. 6.306/2007, art. 8º, IX",
      garantias: "Negociadas com o agente.",
      obs: "Em 2025–2026 saíram 47 operações de saúde nesse instrumento, a taxa fixa total com mediana de 12,50% a.a. (p25 12,30 · p75 12,82). O enquadramento do equipamento no programa precisa ser confirmado com o agente antes de ofertar.",
      fontes: ["f_emp", "f_maisinov"]
    },
    {
      id: "bndes-automatico", familia: "BNDES", nome: "BNDES Automático – projeto de investimento",
      operador: "Agente financeiro credenciado", status: "aberta",
      elig: { natureza: ["privada", "filantropica"], portes: ["micro", "pequena", "media", "grande"], exige_cfi: true, importado: "nao", ufs: null },
      cond: { part: 100, prazo: 240, carencia: 36, obras: true },
      custos: ["TLP", "PMm"],
      spreads: [
        { nome: "Taxa do BNDES", base: 0.75, min: 0.75, max: 0.95, grande: 0.95, fonte: "f_automatico", obs: "MPME 0,75%; grande empresa de saúde (setor prioritário) 0,95%." },
        { nome: "Taxa do agente", base: 5.41, min: 4.65, max: 7.47, fonte: "f_emp", obs: "Spread contratado no Automático TLP de saúde (p25 5,40 · mediana 6,16 · p75 8,22) menos 0,75." }
      ],
      iof: "regular", iof_base: "Sem alíquota zero específica (incisos XII e XXX do art. 8º revogados)",
      garantias: "Negociadas; aceita FGI e FG BNDES-Sebrae.",
      obs: "Linha para o projeto completo: obra civil, blindagem, gaiola de RF, bunker, instalação e treinamento, além das máquinas credenciadas. Use quando a obra pesa no investimento.",
      fontes: ["f_automatico", "f_emp"]
    },
    {
      id: "fne-saude", familia: "Fundo constitucional", nome: "FNE Saúde Nordeste",
      operador: "Banco do Nordeste", status: "aberta",
      elig: { natureza: ["privada"], portes: ["micro", "pequena", "media", "grande"], exige_cfi: false, importado: "a_confirmar", ufs: ["MA", "PI", "CE", "RN", "PB", "PE", "AL", "SE", "BA"], sudene: true },
      cond: { part: 100, prazo: 240, carencia: 60, obras: true, part_por_porte: { micro: 100, pequena: 100, pm: 90, m1: 80, m2: 70, grande: 70 } },
      custos: ["TFC_FNE"],
      spreads: [],
      iof: "zero", iof_base: "Provável alíquota zero: Dec. 6.306/2007, art. 8º, XV (fundos constitucionais) – confirmar com o BNB",
      garantias: "Alienação fiduciária, aval, fiança, hipoteca, penhor, recebíveis.",
      obs: "Taxa pré-fixada dos fundos constitucionais, sem spread do agente; o valor usado já tem bônus de adimplência (sem bônus em 'máx.'). Participação limitada por porte e localização (70% a 100%). Importado: página omissa.",
      fontes: ["f_fne", "f_tfc"]
    },
    {
      id: "fno-empresarial", familia: "Fundo constitucional", nome: "FNO Amazônia Empresarial (Verde)",
      operador: "Banco da Amazônia", status: "aberta",
      elig: { natureza: ["privada"], portes: ["micro", "pequena", "media", "grande"], exige_cfi: false, importado: "a_confirmar", ufs: ["AC", "AM", "AP", "PA", "RO", "RR", "TO"] },
      cond: { part: 100, prazo: null, carencia: null, obras: true },
      custos: ["TFC_FNO"],
      spreads: [],
      iof: "zero", iof_base: "O Banco da Amazônia anuncia isenção (art. 8º, XV)",
      garantias: "Usuais, mais seguros e conta garantida.",
      obs: "A linha Empresarial exclui saúde 'com linha própria' (o FNO 2026 não tem); a Empresarial Verde cita saúde. Confirmar enquadramento e prazos com o Basa: prazo e carência não são publicados.",
      fontes: ["f_fno", "f_tfc"]
    },
    {
      id: "fco-empresarial", familia: "Fundo constitucional", nome: "FCO Empresarial (comércio e serviços)",
      operador: "Banco do Brasil e repassadores (GoiásFomento, cooperativas)", status: "aberta",
      elig: { natureza: ["privada"], portes: ["micro", "pequena", "media", "grande"], exige_cfi: false, importado: "sem_similar", ufs: ["DF", "GO", "MT", "MS"], valor_max: 20000000 },
      cond: { part: 100, prazo: 144, carencia: 36, obras: true },
      custos: ["TFC_FCO"],
      spreads: [],
      iof: "zero", iof_base: "Provável alíquota zero: Dec. 6.306/2007, art. 8º, XV",
      garantias: "Definidas pelo operador (ex.: GoiásFomento: imóvel ≥ 150% acima de R$ 50 mil).",
      obs: "A programação 2026 prioriza empreendimentos médicos e hospitalares. Importado só sem similar nacional (CFI, ex-tarifário ou anotação Decex). Limite de R$ 20 mi por tomador ao ano.",
      fontes: ["f_fco", "f_tfc"]
    },
    {
      id: "inovacred", familia: "FINEP", nome: "Finep Inovacred (via agência estadual)",
      operador: "GoiásFomento, AgeRio, Fomento Paraná, BDMG, AFEAM, Desenbahia", status: "condicionada",
      elig: { natureza: ["privada"], portes: ["micro", "pequena", "media"], exige_cfi: false, importado: "sim", ufs: ["GO", "RJ", "PR", "MG", "AM", "BA"], valor_min: 150000, valor_max: 15000000,
        condicao: { campo: "projeto_inovacao", rotulo: "Projeto com componente de inovação (exigência Finep)" } },
      cond: { part: 90, prazo: 96, carencia: 24, obras: true },
      custos: ["TR"],
      spreads: [{ nome: "Spread Inovacred", base: 6.068, min: 4.2, max: 6.068, fonte: "f_inovacred", obs: "GoiásFomento 4,2–5,5; BDMG e AgeRio 'a partir de' 6,068." }],
      iof: "zero", iof_base: "Dec. 6.306/2007, art. 8º, XXXI",
      garantias: "Do agente (AFEAM exige garantia real).",
      obs: "Aceita importado e usado (AgeRio). Exige projeto de inovação; não serve para reposição comum de equipamento.",
      fontes: ["f_inovacred"]
    },
    {
      id: "bdmg-investimentos", familia: "Desenvolvimento estadual", nome: "BDMG Investimentos",
      operador: "BDMG", status: "aberta",
      elig: { natureza: ["privada"], portes: ["media", "grande"], rob_min: 16000000, exige_cfi: false, importado: "sim", ufs: ["MG"] },
      cond: { part: 100, prazo: 96, carencia: 24, obras: true },
      custos: ["SELIC"],
      spreads: [{ nome: "Spread BDMG", base: 2.99, min: 2.99, max: 4.29, fonte: "f_bdmg", obs: "'A partir de' Selic + 2,99; CET divulgado de Selic + 4,29." }],
      iof: "regular", iof_base: "Regra geral",
      garantias: "Não informadas na página.",
      obs: "Aceita máquinas importadas novas. Para empresas com receita a partir de R$ 16 mi.",
      fontes: ["f_bdmg"]
    },
    {
      id: "fgts-saude", familia: "Filantrópicos", nome: "FGTS-Saúde / Caixa Hospitais FGTS",
      operador: "Caixa", status: "aberta",
      elig: { natureza: ["filantropica"], portes: ["micro", "pequena", "media", "grande"], exige_cfi: false, importado: "a_confirmar", ufs: null,
        condicao: { campo: "sus_complementar", rotulo: "Filantrópica complementar ao SUS, aderente ao Agora Tem Especialistas" } },
      cond: { part: 95, prazo: 240, carencia: 12, obras: true },
      custos: ["TR"],
      spreads: [
        { nome: "Juros FGTS", base: 8.66, min: 8.66, max: 8.66, fonte: "f_fgts" },
        { nome: "Taxa de risco do agente", base: 3.0, min: 0, max: 3.0, fonte: "f_fgts" }
      ],
      tarifa: 0.5,
      iof: "regular", iof_base: "Não confirmado; filantrópica pode ter não incidência (art. 2º, §3º, III)",
      garantias: "Cessão ou alienação fiduciária, aval, fundos garantidores, recebíveis.",
      obs: "Res. CCFGTS 1.152/2026: R$ 8,5 bi; equipamentos em até 20 anos, obras em até 30. Prorrogado até 2030 (Lei 15.486/2026).",
      fontes: ["f_fgts", "f_fgts_ms"]
    },
    {
      id: "cartao-bndes", familia: "BNDES", nome: "Cartão BNDES",
      operador: "Bancos emissores", status: "informativa",
      elig: { natureza: ["privada"], portes: ["micro", "pequena", "media"], exige_cfi: true, importado: "nao", ufs: null, valor_max: 2000000 },
      cond: { part: 100, prazo: 48, carencia: 0, obras: false },
      custos: [],
      spreads: [],
      iof: "zero", iof_base: "—",
      garantias: "Do emissor.",
      obs: "Até R$ 2 mi por banco emissor, 48 parcelas fixas, itens credenciados no Portal do Cartão. A taxa do mês não foi obtida; o motor não ranqueia esta linha.",
      fontes: ["f_cartao"]
    },
    {
      id: "fiis-saude", familia: "FIIS", nome: "FIIS Saúde – crédito indireto",
      operador: "Agente credenciado pelo BNDES", status: "encerrada",
      elig: { natureza: ["privada", "filantropica"], portes: ["micro", "pequena", "media", "grande"], exige_cfi: true, importado: "sem_similar", ufs: null, valor_max: 50000000,
        condicao: { campo: "fiis_selecionado", rotulo: "Proposta já selecionada pelo CGFIIS (Res. CGFIIS 10/2026)" } },
      cond: { part: 100, prazo: 120, carencia: 24, obras: true },
      custos: ["FIXA_FIIS"],
      spreads: [],
      iof: "regular", iof_base: "Sem alíquota zero específica",
      garantias: "Do agente.",
      obs: "Janela de propostas encerrada (30/06 a 06/07/2026). Só contrata quem foi selecionado. Teto de 12,69% a.a. até 10 anos (FIIS 5,0% × BNDES 1,25% × agente 6,0%).",
      fontes: ["f_fiis", "f_fiis_ms"]
    },
    {
      id: "cdc-banco", familia: "Banco privado", benchmark: true, nome: "CDC/CCB de investimento (recursos livres)",
      operador: "Bancos e cooperativas", status: "aberta",
      elig: { natureza: ["privada", "filantropica"], portes: ["micro", "pequena", "media", "grande"], exige_cfi: false, importado: "sim", ufs: null },
      cond: { part: 100, prazo: 60, carencia: 6, obras: true },
      custos: ["BCB_aq_bens"],
      spreads: [],
      iof: "regular", iof_base: "Dec. 6.306/2007, art. 7º",
      garantias: "Alienação fiduciária do equipamento e aval.",
      obs: "Referência = taxa média do BCB para aquisição de outros bens por PJ. Prazo e carência típicos de mercado (não publicados por banco). Serve de piso de comparação.",
      fontes: ["f_bcb_aq"]
    },
    {
      id: "leasing", familia: "Banco privado", benchmark: true, nome: "Leasing financeiro (arrendamento mercantil)",
      operador: "Bancos e sociedades de arrendamento", status: "aberta",
      elig: { natureza: ["privada", "filantropica"], portes: ["micro", "pequena", "media", "grande"], exige_cfi: false, importado: "sim", ufs: null },
      cond: { part: 100, prazo: 60, carencia: 0, obras: false, prazo_min: 36 },
      custos: ["BCB_arrend"],
      spreads: [],
      iof: "nao_incide", iof_base: "IOF-crédito não incide; incide ISS municipal (LC 116/2003, item 15.09)",
      garantias: "O próprio bem (propriedade do arrendador).",
      obs: "Referência = taxa média do BCB para arrendamento mercantil de outros bens por PJ. Prazo mínimo de 36 meses para bens com vida útil acima de 5 anos (Res. CMN 2.309/1996). Contraprestações dedutíveis no Lucro Real.",
      fontes: ["f_bcb_arr"]
    }
  ],

  fontes: {
    f_finame: { t: "BNDES – Finame BK Aquisição e Comercialização", u: "https://www.bndes.gov.br/wps/portal/site/home/financiamento/produto/bndes-finame-bk-aquisicao-comercializacao", d: "2026-10-09", c: "alta" },
    f_automatico: { t: "BNDES – BNDES Automático", u: "https://www.bndes.gov.br/wps/portal/site/home/financiamento/produto/bndes-automatico", d: "2026-10-09", c: "alta" },
    f_porte: { t: "BNDES – Porte de empresa", u: "https://www.bndes.gov.br/wps/portal/site/home/financiamento/guia/porte-de-empresa", d: "2026-10-09", c: "alta" },
    f_bcb_pm: { t: "BCB – Comunicados 46.043 e 46.044 (TLP, Pm, PMm de out/2026)", u: "https://www.bcb.gov.br/api/conteudo/app/normativos/exibeoutrasnormas?p1=Comunicado&p2=46044", d: "2026-09-30", c: "alta" },
    f_emp: { t: "BNDES Dados Abertos – operações indiretas automáticas (CNAE 86, 2025–2026)", u: "https://dadosabertos.bndes.gov.br/dataset/operacoes-financiamento/resource/612faa0b-b6be-4b2c-9317-da5dc2c0b901", d: "2026-10-02", c: "media" },
    f_maisinov: { t: "BRDE – Folder Mais Inovação 2026", u: "https://brde.com.br/wp-content/uploads/2026/01/Folder-2026-Mais-Inovacao-AGCUR.pdf", d: "2026-01-01", c: "media" },
    f_fne: { t: "BNB – FNE Saúde Nordeste", u: "https://www.bnb.gov.br/fne-saude-nordeste", d: "2026-10-09", c: "alta" },
    f_fno: { t: "Banco da Amazônia – FNO Amazônia Empresarial", u: "https://www.bancoamazonia.com.br/linhas-de-fomento/fno/amazonia-empresarial", d: "2026-10-09", c: "alta" },
    f_fco: { t: "Sudeco – Programação FCO 2026", u: "https://www.gov.br/sudeco/pt-br/assuntos/fundo-constitucional-de-financiamento-do-centro-oeste/programacao-anual-de-financiamento/programacao_fco_2026_11a-ed_ch.pdf/@@display-file/file", d: "2026-09-25", c: "alta" },
    f_tfc: { t: "Res. CMN 5.013/2022 – taxa dos fundos constitucionais (calculado com Com. BCB 45.161, 45.491 e CDR do IBGE)", u: "https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?tipo=Resolu%C3%A7%C3%A3o%20CMN&numero=5013", d: "2026-10-09", c: "media" },
    f_inovacred: { t: "GoiásFomento e AgeRio – Finep Inovacred", u: "https://www.goiasfomento.com/linhas-de-credito/finep/", d: "2026-10-09", c: "media" },
    f_bdmg: { t: "BDMG – BDMG Investimentos", u: "https://www.bdmg.mg.gov.br/grandes-empresas/?bdmg-investimentos", d: "2026-10-09", c: "media" },
    f_fgts: { t: "Res. CCFGTS 1.152/2026", u: "https://www.lex.com.br/resolucao-ccfgts-no-1-152-de-24-de-marco-de-2026/", d: "2026-03-24", c: "media" },
    f_fgts_ms: { t: "Ministério da Saúde – prorrogação do FGTS para filantrópicas", u: "https://www.gov.br/saude/pt-br/assuntos/noticias-ms/2026/agosto/lei-prorroga-aplicacao-de-recursos-do-fgts-a-entidades-hospitalares-filantropicas-que-atuam-no-sus", d: "2026-08-07", c: "alta" },
    f_cartao: { t: "BNDES – Cartão BNDES", u: "https://www.bndes.gov.br/wps/portal/site/home/financiamento/produto/cartao-bndes", d: "2026-10-09", c: "alta" },
    f_fiis: { t: "Casa Civil – Edital CGFIIS 2 (atualizado em 29/06/2026)", u: "https://www.gov.br/casacivil/pt-br/acesso-a-informacao/fundos/fundo-fiis/editais/sei_7675972_edital_2_atualizado.pdf/@@download/file", d: "2026-06-29", c: "alta" },
    f_fiis_ms: { t: "Ministério da Saúde – Chamamento 02/2025 FIIS Saúde (encerrado)", u: "https://www.gov.br/saude/pt-br/acesso-a-informacao/participacao-social/chamamentos-publicos/2025/chamamento-publico-no-02-2025-desid-fiis-saude", d: "2026-09-22", c: "alta" },
    f_bcb_aq: { t: "BCB – SGS 20729 (PJ, aquisição de outros bens)", u: "https://api.bcb.gov.br/dados/serie/bcdata.sgs.20729/dados?formato=json&dataInicial=01/01/2026&dataFinal=09/10/2026", d: "2026-08", c: "alta" },
    f_bcb_arr: { t: "BCB – SGS 20732 (PJ, arrendamento mercantil de outros bens)", u: "https://api.bcb.gov.br/dados/serie/bcdata.sgs.20732/dados?formato=json&dataInicial=01/01/2026&dataFinal=09/10/2026", d: "2026-08", c: "alta" },
    f_circ13: { t: "BNDES – Circ. 13/2022, Anexo I (procedimentos operacionais, versão 21/08/2026)", u: "https://www.bndes.gov.br/sbn/BNDES_online/Arquivos/01-22Cir13-Anexo-I-Procedimentos-Operacionais20260821.pdf", d: "2026-08-21", c: "alta" },
    f_cfi: { t: "BNDES – consulta de produtos credenciados (CFI)", u: "http://bndes.gov.br/consulta-credenciados", d: "2026-10-09", c: "media" },
    f_sigtap: { t: "SIGTAP – Tabela Unificada, competência 08/2026", u: "http://sigtap.datasus.gov.br/", d: "2026-08-14", c: "alta" },
    f_ate: { t: "Portaria SAES/MS 4.282/2026 – incrementos do Agora Tem Especialistas (Conass)", u: "https://www.conass.org.br/?p=57841", d: "2026-06-22", c: "alta" },
    f_1631: { t: "Portaria GM/MS 1.631/2015 – parâmetros (citada em Alencar, Radiol Bras 2024)", u: "https://rb.org.br/export-pdf/3561/e20230094.pdf", d: "2024", c: "media" },
    f_inca: { t: "INCA – nota de revisão da capacidade dos mamógrafos (2015)", u: "https://antigo.inca.gov.br/sites/ufu.sti.inca.local/files//media/document/nota-revisao-capacidade-dos-mamografos-2015_0.pdf", d: "2015-11-01", c: "media" },
    f_joinville: { t: "SMS Joinville – contratação de RM (30 min por exame)", u: "https://www.joinville.sc.gov.br/public/edital/anexo/04a45a346f88d8d8f72082a2539f725d.pdf", d: "2021-05-27", c: "media" },
    f_8516: { t: "Portaria GM/MS 8.516/2025 – radioterapia (720 casos/ano por acelerador)", u: "https://www.cosemssc.org.br/wp-content/uploads/2026/01/3.-Portaria-GM_MS-No-8.516-DE-23-DE-outubro-DE-2025-Portaria-GM_MS-No-8.516-DE-23-DE-outubro-DE-2025-DOU-Imprensa.pdf", d: "2025-10-24", c: "alta" },
    f_senado_rt: { t: "Senado Federal – contrato de radioterapia (pacotes por tratamento)", u: "https://www6g.senado.gov.br/transparencia/licitacoes-e-contratos/contratos/download/365447", d: "2024-07-19", c: "media" },
    f_ans: { t: "Mapa Assistencial ANS via Futuro da Saúde (exames por 1.000 beneficiários, 2024)", u: "https://futurodasaude.com.br/?p=40406", d: "2025-10-14", c: "media" },
    f_lp: { t: "Lei 9.249/1995, arts. 15 e 20 (presunção no Lucro Presumido)", u: "https://www.planalto.gov.br/ccivil_03/leis/l9249.htm", d: "2026-10-09", c: "alta" },
    f_dep: { t: "IN RFB 1.700/2017, Anexo III (vida útil: NCM 9018 e 9022, 10 anos)", u: "http://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=81268", d: "2017", c: "media" }
  },

  /* ---------- Porte ---------- */
  porte: {
    bndes: [{ p: "micro", max: 360000 }, { p: "pequena", max: 4800000 }, { p: "media", max: 300000000 }, { p: "grande", max: Infinity }],
    fundos: [{ p: "micro", max: 360000, fp: "me" }, { p: "pequena", max: 4800000, fp: "me" }, { p: "pm", max: 16000000, fp: "f1" }, { p: "m1", max: 90000000, fp: "f1" }, { p: "m2", max: 300000000, fp: "f15" }, { p: "grande", max: Infinity, fp: "f18" }],
    obs: "Receita operacional bruta anual do grupo econômico (BNDES). Média I até R$ 90 mi; Média II até R$ 300 mi."
  },

  /* Taxa pré dos fundos constitucionais (TFC, investimento, out/2026). base = com bônus de adimplência; max = sem bônus. Calculado. */
  tfc: {
    FNE: { me: [9.03, 9.65], f1: [10.54, 11.43], f15: [13.06, 14.39], f18: [14.57, 16.17] },
    FNO: { me: [9.25, 9.91], f1: [10.85, 11.80], f15: [13.53, 14.95], f18: [15.13, 16.84] },
    FCO: { me: [11.01, 11.98], f1: [13.37, 14.76], f15: [17.31, 19.39], f18: [19.67, 22.17] }
  },
  fiis_teto: 12.69,

  /* ---------- Kit de documentos (planilha-mestre S&S + exigências da Circ. BNDES 13/2022) ---------- */
  kit: [
    { id: "k1", n: "1", cat: "A", nome: "Contrato social / estatuto + alterações consolidadas", ob: "Obrigatório", resp: "Cliente", onde: "Junta Comercial (ex.: JUCESP) ou arquivo da empresa", fmt: "PDF", val: "Versão consolidada vigente", obs: "", ia: "contrato_social" },
    { id: "k2", n: "2", cat: "A", nome: "Ata de eleição da diretoria/administração em vigor", ob: "Se aplicável", resp: "Cliente", onde: "Junta Comercial", fmt: "PDF", val: "Vigente", obs: "Apenas S.A. ou quando houver", ia: null },
    { id: "k3", n: "3", cat: "A", nome: "Cartão CNPJ (comprovante de inscrição e situação cadastral)", ob: "Obrigatório", resp: "Cliente", onde: "Receita Federal (gov.br)", fmt: "PDF", val: "Emitir nos últimos 30 dias", obs: "Situação cadastral deve estar ATIVA", ia: "cartao_cnpj", idade_max: 30, regra_fonte: "Sem prazo legal; recência é política do agente (IN RFB 2.119/2022)" },
    { id: "k4", n: "4", cat: "A", nome: "Comprovante de endereço da sede", ob: "Obrigatório", resp: "Cliente", onde: "Conta de consumo ou contrato de locação", fmt: "PDF", val: "Últimos 90 dias", obs: "", ia: "comprovante_endereco", idade_max: 90, regra_fonte: "Prática bancária; sem prazo legal (Circ. BCB 3.978/2020)" },
    { id: "k5", n: "5", cat: "B", nome: "RG e CPF dos sócios e administradores", ob: "Obrigatório", resp: "Cliente", onde: "Documentos pessoais", fmt: "PDF / imagem", val: "—", obs: "Todos os sócios e signatários. Não é lido nem guardado pela ferramenta.", ia: null },
    { id: "k6", n: "6", cat: "B", nome: "Comprovante de residência dos sócios/administradores", ob: "Obrigatório", resp: "Cliente", onde: "Conta de consumo", fmt: "PDF", val: "Últimos 90 dias", obs: "Não é lido nem guardado pela ferramenta.", ia: null },
    { id: "k7", n: "7", cat: "B", nome: "Procuração com poderes de representação", ob: "Se aplicável", resp: "Cliente", onde: "Cartório", fmt: "PDF", val: "Vigente", obs: "Só se assinar por procurador", ia: null },
    { id: "k8", n: "8", cat: "B", nome: "Declaração de participações societárias", ob: "Se solicitado", resp: "Cliente", onde: "Modelo do agente financeiro", fmt: "PDF", val: "—", obs: "Quando exigido pelo banco", ia: null },
    { id: "k9", n: "9", cat: "C", nome: "CND de Tributos Federais e Dívida Ativa da União", ob: "Obrigatório", resp: "Cliente / Contador", onde: "Receita Federal / PGFN (regularize.pgfn.gov.br)", fmt: "PDF", val: "180 dias (data impressa)", obs: "Negativa ou positiva com efeito de negativa; deve valer na contratação e em cada liberação", ia: "certidao", dias: 180, regra_fonte: "Lei 8.212/1991, art. 47, §5º; Circ. BNDES 13/2022, Anexo I, 4.2.1" },
    { id: "k10", n: "10", cat: "C", nome: "Certificado de Regularidade do FGTS (CRF)", ob: "Obrigatório", resp: "Cliente / Contador", onde: "Caixa (consulta-crf.caixa.gov.br)", fmt: "PDF", val: "30 dias (janela impressa)", obs: "Não existe CRF positivo", ia: "certidao", dias: 30, regra_fonte: "Lei 9.012/1995; Circ. CAIXA 392/2006" },
    { id: "k11", n: "11", cat: "C", nome: "Certidão Negativa de Débitos Trabalhistas (CNDT)", ob: "Obrigatório", resp: "Cliente / Contador", onde: "TST (cndt.tst.jus.br)", fmt: "PDF", val: "180 dias", obs: "Exigência do agente, não da norma do BNDES", ia: "certidao", dias: 180, regra_fonte: "CLT, art. 642-A (Lei 12.440/2011)" },
    { id: "k12", n: "12", cat: "C", nome: "Certidão negativa estadual (ICMS / Sefaz)", ob: "Obrigatório", resp: "Cliente / Contador", onde: "Secretaria da Fazenda estadual", fmt: "PDF", val: "Data impressa (SP: Certidão Única de 90 dias a partir de 14/10/2026)", obs: "Exigência do agente", ia: "certidao", dias: 90, regra_fonte: "SP: Res. Conj. SFP-PGE 1/2026" },
    { id: "k13", n: "13", cat: "C", nome: "Certidão negativa municipal (ISS / tributos mobiliários)", ob: "Obrigatório", resp: "Cliente / Contador", onde: "Prefeitura do município-sede", fmt: "PDF", val: "Data impressa (São Paulo: 180 dias)", obs: "Exigência do agente", ia: "certidao", dias: 180, regra_fonte: "São Paulo: Port. SF 268/2019 e 182/2021" },
    { id: "kc1", n: "+", cat: "C", nome: "Extrato do CADIN ou declaração do cliente", ob: "Obrigatório", resp: "S&S / Cliente", onde: "Agente financeiro / declaração", fmt: "PDF", val: "Na formalização", obs: "Novo: exigido pela Circ. BNDES 13/2022; registro é impeditivo", ia: null, novo: true, regra_fonte: "Lei 10.522/2002, art. 6º-A; Circ. BNDES 13/2022, Anexo I, 4.2.1.7" },
    { id: "kc2", n: "+", cat: "C", nome: "Consulta ao Cadastro de Empregadores (trabalho escravo)", ob: "Obrigatório", resp: "S&S", onde: "Ministério do Trabalho (lista pública)", fmt: "PDF", val: "Na contratação", obs: "Novo: exigido pela Circ. BNDES 13/2022", ia: null, novo: true, regra_fonte: "Port. Interm. 18/2024; Circ. BNDES 13/2022, Anexo I, 4.2.9" },
    { id: "kc3", n: "+", cat: "C", nome: "RAIS ou declaração do eSocial do ano-base", ob: "Obrigatório", resp: "Contador", onde: "eSocial", fmt: "PDF", val: "Ano-base", obs: "Novo: exigido pela Circ. BNDES 13/2022", ia: null, novo: true, regra_fonte: "Circ. BNDES 13/2022, Anexo I, 4.2.1.4" },
    { id: "k14", n: "14", cat: "D", nome: "Balanço Patrimonial + DRE (últimos 2–3 exercícios)", ob: "Obrigatório", resp: "Contador", onde: "Contabilidade da empresa", fmt: "PDF / Excel", val: "Assinados pelo contador", obs: "Base da análise de crédito", ia: "balanco_dre" },
    { id: "k15", n: "15", cat: "D", nome: "Balancete recente do exercício corrente", ob: "Recomendado", resp: "Contador", onde: "Contabilidade", fmt: "PDF / Excel", val: "Atualizado", obs: "Reforça a capacidade de pagamento", ia: "balanco_dre" },
    { id: "k16", n: "16", cat: "D", nome: "Relação / declaração de faturamento (12 meses)", ob: "Recomendado", resp: "Contador", onde: "Contabilidade", fmt: "PDF", val: "Atualizada", obs: "Coerente com as demonstrações", ia: "faturamento" },
    { id: "k17", n: "17", cat: "D", nome: "Demonstrativo de endividamento bancário", ob: "Recomendado", resp: "Cliente", onde: "Empresa", fmt: "PDF / Excel", val: "Atualizado", obs: "Lista de dívidas, saldos e parcelas", ia: "endividamento" },
    { id: "k18", n: "18", cat: "D", nome: "Autorização de consulta ao SCR / Bacen", ob: "Obrigatório", resp: "Cliente", onde: "Formulário do agente financeiro", fmt: "Assinada", val: "—", obs: "Preenchida na etapa bancária", ia: null },
    { id: "k19", n: "19", cat: "E", nome: "Proposta comercial / proforma do fornecedor", ob: "Obrigatório", resp: "Cliente / Fornecedor", onde: "Fornecedor do equipamento", fmt: "PDF", val: "Vigente", obs: "Deve detalhar modelo, valor e condições", ia: "proforma" },
    { id: "k20", n: "20", cat: "E", nome: "Comprovação do Código FINAME (CFI) do equipamento", ob: "Obrigatório", resp: "S&S / Fornecedor", onde: "Consulta CFI no site do BNDES / fornecedor", fmt: "Print / PDF", val: "—", obs: "DECISIVO: bem novo, nacional e credenciado", ia: "cfi" },
    { id: "k21", n: "21", cat: "E", nome: "Ficha técnica / especificação do equipamento", ob: "Recomendado", resp: "Fornecedor", onde: "Fornecedor", fmt: "PDF", val: "—", obs: "", ia: null },
    { id: "k22", n: "22", cat: "E", nome: "Descrição e finalidade do investimento", ob: "Recomendado", resp: "Cliente / S&S", onde: "Elaboração conjunta", fmt: "Texto / PDF", val: "—", obs: "Fortalece o enquadramento (o dossiê traz uma versão)", ia: null },
    { id: "k23", n: "23", cat: "E", nome: "Valor do investimento e percentual a financiar", ob: "Obrigatório", resp: "Cliente", onde: "Empresa", fmt: "Texto", val: "—", obs: "Preenchido automaticamente pela operação", ia: null, auto: "operacao" },
    { id: "k24", n: "24", cat: "F", nome: "Aval dos sócios", ob: "Obrigatório (usual)", resp: "Banco / Cliente", onde: "Definido pelo agente financeiro", fmt: "—", val: "—", obs: "Exigido na maioria das operações", ia: null },
    { id: "k25", n: "25", cat: "F", nome: "Alienação fiduciária do bem financiado", ob: "Usual", resp: "Banco", onde: "Agente financeiro", fmt: "—", val: "—", obs: "Confirmar com o agente: a redação do item 7.3 da Circ. 13/2022 é ambígua", ia: null },
    { id: "k26", n: "26", cat: "F", nome: "Adesão a Fundo Garantidor (FGI)", ob: "Se aplicável", resp: "Banco", onde: "Agente financeiro", fmt: "—", val: "—", obs: "Quando houver insuficiência de garantias (só MPME)", ia: null }
  ],
  kit_cats: { A: "Documentos societários e cadastrais", B: "Sócios e representantes legais", C: "Regularidade fiscal e cadastros", D: "Documentos econômico-financeiros", E: "Operação e bem (equipamento médico)", F: "Garantias" },

  /* ---------- Modalidades (ROI) ---------- */
  modalidades: [
    { id: "rm_15t", nome: "Ressonância magnética 1,5T", un: "exames", exh: 2, h: 12, d: 26, sus: 268.75, ate: 499.88, cap_sus: 5000, dem1000: 207,
      fx: "Produtividade: 30 min por exame (SMS Joinville); SUS: R$ 268,75 em 15 de 16 códigos; Agora Tem Especialistas +86% para habilitados.", f: ["f_sigtap", "f_ate", "f_joinville", "f_1631", "f_ans"] },
    { id: "rm_3t", nome: "Ressonância magnética 3T", un: "exames", exh: 2, h: 12, d: 26, sus: 268.75, ate: 499.88, cap_sus: 5000, dem1000: 207,
      fx: "O SIGTAP não distingue campo; produtividade típica de 2/h (baixa confiança).", f: ["f_sigtap", "f_ate", "f_1631"] },
    { id: "rm_aberta", nome: "Ressonância magnética aberta (0,3–0,4T)", un: "exames", exh: 1.3, h: 12, d: 26, sus: 268.75, ate: 499.88, cap_sus: 5000, dem1000: 207,
      fx: "Campo baixo: 40 a 60 min por exame (baixa confiança).", f: ["f_sigtap", "f_ate"] },
    { id: "tc", nome: "Tomografia computadorizada", un: "exames", exh: 3, h: 12, d: 26, sus: 109.06, ate: 300, cap_sus: null, dem1000: 190,
      fx: "SUS: média simples de 8 códigos (R$ 86,75 a 138,63); Agora Tem Especialistas leva a cerca de R$ 300.", f: ["f_sigtap", "f_ate", "f_ans"] },
    { id: "mamografia", nome: "Mamografia digital", un: "exames", exh: 3, h: 12, d: 26, sus: 45.00, ate: 100, cap_sus: 6758, dem1000: 98,
      fx: "3 exames/h (INCA); rastreamento bilateral R$ 45,00; +122% para habilitados.", f: ["f_sigtap", "f_ate", "f_inca"] },
    { id: "rx_dr", nome: "Raio-X digital fixo", un: "exames", exh: 10, h: 12, d: 26, sus: 8.73, ate: null, cap_sus: null, dem1000: 567,
      fx: "SUS: média simples de 8 códigos (R$ 6,30 a 15,30). Produtividade de memória (baixa confiança).", f: ["f_sigtap", "f_ans"] },
    { id: "rx_movel", nome: "Raio-X móvel", un: "exames", exh: 3, h: 24, d: 30, sus: 8.73, ate: null, cap_sus: null, dem1000: null,
      fx: "No paciente internado o SUS não paga à parte (SH = 0); receita direta só no PS/ambulatório.", f: ["f_sigtap"] },
    { id: "us", nome: "Ultrassonografia", un: "exames", exh: 3, h: 12, d: 26, sus: null, ate: null, cap_sus: null, dem1000: null,
      fx: "Produtividade típica de 20 min por exame (baixa confiança). SUS: valores por região anatômica (SIGTAP 02.05.02): informe o preço praticado.", f: ["f_sigtap"] },
    { id: "arco", nome: "Arco cirúrgico", un: "procedimentos", exh: 0.4, h: 12, d: 22, sus: null, ate: null, cap_sus: null, dem1000: null,
      fx: "O SUS não remunera o uso do arco; a receita vem da AIH dos procedimentos guiados. Informe a receita incremental atribuível.", f: ["f_sigtap"] },
    { id: "acelerador", nome: "Acelerador linear (radioterapia)", un: "tratamentos", mes: 60, sus: 4049.63, ate: null, cap_sus: 720, conv: 15118, dem1000: null,
      fx: "Capacidade: 720 casos/ano por acelerador (Portaria 8.516/2025); SUS por tratamento (média de 8 localizações R$ 4.049,63); convênio: pacote típico R$ 15.118 (contrato do Senado, um pagador).", f: ["f_8516", "f_sigtap", "f_senado_rt"] }
  ],

  /* Premissas de custo sem fonte pública verificada: valores de partida da S&S, sempre a confirmar com o cliente. */
  custos_padrao: {
    rm_15t: { manut: 8, garantia: 12, laudo: 20, insumo: 15 }, rm_3t: { manut: 8, garantia: 12, laudo: 20, insumo: 15 }, rm_aberta: { manut: 7, garantia: 12, laudo: 20, insumo: 5 },
    tc: { manut: 8, garantia: 12, laudo: 20, insumo: 20 }, mamografia: { manut: 6, garantia: 12, laudo: 20, insumo: 2 },
    rx_dr: { manut: 5, garantia: 12, laudo: 15, insumo: 1 }, rx_movel: { manut: 5, garantia: 12, laudo: 15, insumo: 1 }, us: { manut: 6, garantia: 12, laudo: 30, insumo: 3 },
    arco: { manut: 6, garantia: 12, laudo: 0, insumo: 0 }, acelerador: { manut: 8, garantia: 12, laudo: 15, insumo: 50 }
  },

  /* ---------- Catálogo: produtos credenciados (Catálogo CFI do BNDES, 14/10/2026) ---------- */
  catalogo: CATALOGO_VMI,
  catalogo_versao: "2026-10-15",
  cfi_tc_concorrentes: CFI_TC_CONCORRENTES,

  /* Pedidos VMI jan–set/2026 (análise interna enviada em 09/10/2026) */
  pedidos_vmi: { periodo: "jan–set/2026", total: 83515025, privado: 21057115, publico: 62457910, qtd: 234, nota: "Privado 100% small ticket no período." },

  criterios: [
    { id: "dscr", nome: "Cobertura do serviço da dívida (DSCR)", min: 1.3, ref: "Referência pública: ICSD ≥ 1,3 no BNDES Project Finance (apoio direto). No FINAME indireto o critério é do agente.", fonte: "https://www.bndes.gov.br/wps/portal/site/home/financiamento/produto/bndes-project-finance" },
    { id: "lc", nome: "Liquidez corrente", min: 1.0, ref: "Parâmetro S&S (sem número público)." },
    { id: "dl_ebitda", nome: "Dívida líquida / EBITDA (com a operação)", max: 3.0, ref: "Parâmetro S&S (sem número público)." }
  ]
};
if (typeof module !== "undefined") module.exports = BASE_PADRAO;
