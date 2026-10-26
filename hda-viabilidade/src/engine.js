/* ====================================================================
   Engine HDA — viabilidade da internalização do serviço de imagem
   Funções puras: mesma entrada (modelo de premissas), mesma saída.
   Lógica incremental da Controladoria (Viabilidade v2): o ganho do
   projeto é a diferença entre o resultado da Imagem Própria e o
   resultado atual com a EMG, ambos sobre a mesma base de receita.
   Valores em R$ nominais; reajuste anual opcional aplicado a receita
   e custos por igual. Ano 1 do projeto = fin.ano_inicio.
   ==================================================================== */
var Engine = (function () {
  'use strict';
  function num(v) { if (v === null || v === undefined || v === '') return 0; var n = Number(v); return isFinite(n) ? n : 0; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function npv(flows, r) { var s = 0; for (var i = 0; i < flows.length; i++) s += flows[i] / Math.pow(1 + r, i); return s; }
  function irr(flows) {
    var lo = -0.99, hi = 5, f = function (r) { var s = 0; for (var k = 0; k < flows.length; k++) s += flows[k] / Math.pow(1 + r, k); return s; };
    var flo = f(lo), fhi = f(hi); if (!(flo * fhi < 0)) return null;
    for (var it = 0; it < 300; it++) { var mid = (lo + hi) / 2, fm = f(mid); if (Math.abs(fm) < 1e-7) return mid; if (flo * fm < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; } }
    return (lo + hi) / 2;
  }
  /* payback com interpolação linear dentro do ano (igual à planilha da Controladoria) */
  function payback(flows, r) {
    var acc = 0, prev;
    for (var i = 0; i < flows.length; i++) {
      var v = r ? flows[i] / Math.pow(1 + r, i) : flows[i];
      prev = acc; acc += v;
      if (i > 0 && acc >= 0 && prev < 0) return (i - 1) + (-prev / v);
    }
    return null;
  }

  /* ---------- DRE mensal de uma configuração (EMG ou Própria) ----------
     opex (só na própria): { manut, aluguel } em R$/mês de regime, antes do reajuste.
     Sem opex, a própria sai sem manutenção nem aluguel: é a base que o fluxo usa,
     somando depois a manutenção ou o aluguel mês a mês (garantia, início da operação). */
  function dreMensal(m, fator, tipo, anoProj, opex) {
    var b = m.base, p = m.propria, c = m.cenario, su = m.sus || {}, g = num(b.glosa_pct);
    var reaj = reajAno(m, anoProj);
    var exames = num(b.exames) / num(b.meses) * fator;
    var rbConv = exames * num(b.ticket) * reaj;
    /* SUS (chave sus.modo): o atual entra nos dois modelos; o SUS a mais (TC do Agora Tem Especialistas, na capacidade ociosa) só na imagem própria */
    var exS = susAtualOn(m) ? num(su.atual_mes) * fator : 0, rbS = exS * num(su.atual_ticket) * reaj;
    var exA = tipo !== 'emg' && susAteOn(m) ? num(su.tc_mes) : 0, rbA = exA * num(su.tc_valor) * reaj;
    var rb = rbConv + rbS + rbA;
    var glosa = rb * g;
    var rl = rb - glosa;
    var d = { exames: exames, exSus: exS, exSusMais: exA, rbConv: rbConv, rbSus: rbS, rbSusMais: rbA, rlSus: rbS * (1 - g), rlSusMais: rbA * (1 - g), rb: rb, glosa: glosa, rl: rl };
    if (tipo === 'emg') {
      /* nos exames SUS atuais a EMG recebe os mesmos percentuais (sus.atual_emg = "mesmo") ou nada além do contrato ("nada") */
      var rlRep = rl - (su.atual_emg === 'nada' ? d.rlSus : 0);
      d.matmed = rl * num(b.matmed_pct);
      d.rep_med = rlRep * num(b.rep_med_pct);
      d.rep_mat = rlRep * num(b.rep_mat_pct);
      d.rep_bio = rlRep * num(b.rep_bio_pct);
      d.rep_sala = rlRep * num(b.rep_sala_pct);
      d.manut = 0; d.aluguel = 0; d.rispacs = 0;
    } else {
      d.matmed = rl * num(p.matmed_pct);
      d.rep_med = rl * num(p.rep_med_pct);
      d.rep_mat = num(p.mat_elimina) ? 0 : rl * num(b.rep_mat_pct);
      d.rep_bio = num(p.bio_elimina) ? 0 : rl * num(b.rep_bio_pct);
      d.rep_sala = num(p.sala_elimina) ? 0 : rl * num(b.rep_sala_pct);
      d.manut = num(opex && opex.manut) * reaj;
      d.aluguel = num(opex && opex.aluguel) * reaj;
      var exPacs = exames + exS + exA; /* PACS: os exames que estão no modelo (convênio e particular; o SUS só quando a chave o inclui) */
      d.exPacs = exPacs; d.ris = num(p.rispacs_mes) * reaj; d.pacs = pacsEx(m) * exPacs * reaj;
      d.rispacs = d.ris + d.pacs;
    }
    d.repasse = d.rep_med + d.rep_mat + d.rep_bio + d.rep_sala;
    d.cv = d.matmed + d.repasse;
    d.mc = rl - d.cv;
    d.cf_dir = num(b.cf_dir_mes) * reaj;
    d.cf_ind = num(b.cf_ind_mes) * reaj;
    d.margem_direta = d.mc - d.cf_dir - d.manut - d.aluguel - d.rispacs;
    d.resultado = d.margem_direta - d.cf_ind; /* = EBITDA mensal */
    return d;
  }

  /* ---------- Investimento ---------- */
  function capexDe(itens) {
    var tot = 0, fin = 0, parcelas = 0;
    (itens || []).forEach(function (it) { var v = num(it.qtd) * num(it.preco); tot += v; if (it.fin !== false) fin += v; parcelas += num(it.qtd) * num(it.parcela); });
    return { total: tot, financiavel: fin, parcelaMes: parcelas };
  }

  /* ---------- Meses cobrados num ano do projeto ----------
     A operação própria começa no mês (inicio_op_mes + 1) do ano 1. "livres" = meses de operação
     sem cobrança no início (garantia de fábrica para a manutenção; 0 para o aluguel). */
  function mesesDesde(desde, t) { return Math.max(0, 12 * t - Math.max(12 * (t - 1), num(desde))); }
  function mesesAno(m, t, livres) { return mesesDesde((num(m.fin.inicio_op_mes) || 0) + num(livres), t); }

  /* ---------- Ressonância magnética (novo serviço, cenário "com RM") ----------
     A EMG não faz RM: receita e custos da RM são inteiramente incrementais. O equipamento (item id "rm") fica nos
     pacotes B e C e entra no cálculo só com rm.incluir = "sim"; a obra de pré-instalação sai no ano 0.          */
  function rmOn(m) { return !(m.rm && m.rm.incluir === 'nao'); }
  function isRM(it) { return !!it && (it.rm === true || it.id === 'rm'); }
  function ativos(m, itens) { var on = rmOn(m); return (itens || []).filter(function (it) { return on || !isRM(it); }); }
  /* Meses contados de janeiro do ano 1 (0 = jan do ano 1). A RM é aprovada e contratada em rm.aprovacao (AAAA-MM)
     e começa a operar rm.prazo_instalacao meses depois (obra, entrega, comissionamento). */
  function mesIdx(sx) { var mm = /^(\d{4})-(\d{2})/.exec(String(sx || '')); return mm ? (+mm[1]) * 12 + (+mm[2]) - 1 : null; }
  function aprovRM(m) { var a = mesIdx(m.rm && m.rm.aprovacao); return a == null ? 0 : Math.max(0, a - num(m.fin.ano_inicio) * 12); }
  function iniRM(m) {
    var r = m.rm || {};
    if (r.aprovacao == null && r.inicio_mes != null && r.inicio_mes !== '') return num(r.inicio_mes); /* modelos antigos */
    return aprovRM(m) + num(r.prazo_instalacao == null ? 6 : r.prazo_instalacao);
  }
  function anoRM(m) { return Math.floor(aprovRM(m) / 12) + 1; } /* ano-projeto da aprovação da RM (obra) */
  function anoEqRM(m) { return Math.floor(iniRM(m) / 12) + 1; } /* ano-projeto da entrega da RM (equipamento e liberação do financiamento) */
  function mesRMStr(m) { var k = num(m.fin.ano_inicio) * 12 + iniRM(m); return Math.floor(k / 12) + '-' + ('0' + (k % 12 + 1)).slice(-2); }
  function iniItem(m, it) { return isRM(it) ? iniRM(m) : (num(m.fin.inicio_op_mes) || 0); }
  function rampaRM(m, t) { var r = m.rm || {}; return t <= 1 ? (r.rampa1 == null ? 1 : num(r.rampa1)) : t === 2 ? (r.rampa2 == null ? 1 : num(r.rampa2)) : 1; }
  /* rampa pelo mês de operação da RM (j = 1 no primeiro mês): 1º ano, 2º ano, depois regime */
  function rampaOp(m, j) { var r = m.rm || {}; return j <= 12 ? (r.rampa1 == null ? 1 : num(r.rampa1)) : j <= 24 ? (r.rampa2 == null ? 1 : num(r.rampa2)) : 1; }
  /* PACS Sectra: chave de inclusão (propria.pacs_incluir); fora do modelo = custo por exame e implantação zerados */
  function pacsOn(m) { return ((m && m.propria) || {}).pacs_incluir !== 'nao'; }
  function pacsEx(m) { return pacsOn(m) ? num(m.propria && m.propria.pacs_exame) : 0; }
  function pacsImpl(m) { return pacsOn(m) ? num(m.propria && m.propria.pacs_impl) : 0; }
  /* SUS: chave sus.modo — "fora" (padrão; decisão do CEO de 20/10/2026), "atual" (o SUS que o hospital já atende, nos dois modelos)
     ou "ate" (o atual mais o SUS a mais do Agora Tem Especialistas: TC na capacidade ociosa e, com RM, RM; só com equipamento próprio). */
  function susModo(m) { var v = (m && m.sus && m.sus.modo) || 'fora'; return v === 'atual' || v === 'ate' ? v : 'fora'; }
  function susAtualOn(m) { return susModo(m) !== 'fora'; }
  function susAteOn(m) { return susModo(m) === 'ate'; }
  function obraRM(m) { return rmOn(m) ? num(m.rm && m.rm.obra) : 0; }
  function capacidadeRM(m) { var r = m.rm || {}, cap = 2 * (num(r.horas_dia) || 12) * 26, sus = susAteOn(m) ? num((m.sus || {}).rm_mes) : 0, ex = num(r.exames_mes) + sus; return { cap: cap, exames: ex, conv: num(r.exames_mes), sus: sus, ocup: cap ? ex / cap : null }; }
  /* DRE mensal da RM no ano-projeto t; rampa opcional (1 = regime) */
  function rmMensal(m, t, rampa) {
    var r = m.rm || {}, reaj = reajAno(m, t), k = rampa == null ? rampaRM(m, t) : rampa;
    var exC = num(r.exames_mes) * k, exS = susAteOn(m) ? num((m.sus || {}).rm_mes) : 0; /* SUS só com a chave em "ate" (fila SUS: sem rampa) */
    var rbC = exC * num(r.ticket) * reaj, rbS = exS * num((m.sus || {}).rm_valor) * reaj, rb = rbC + rbS, glosa = rb * num(m.base.glosa_pct), rl = rb - glosa;
    var matmed = rl * num(r.matmed_pct), laudo = rl * num(r.rep_med_pct), mc = rl - matmed - laudo;
    var equipe = num(r.equipe_mes) * reaj, energia = num(r.energia_mes) * reaj, outros = num(r.outros_mes) * reaj, fixos = equipe + energia + outros;
    var pacs = pacsEx(m) * (exC + exS) * reaj; /* PACS cobrado por exame também na RM */
    return { exames: exC + exS, exConv: exC, exSus: exS, rampa: k, rbConv: rbC, rbSus: rbS, rb: rb, glosa: glosa, rl: rl, matmed: matmed, laudo: laudo, mc: mc, equipe: equipe, energia: energia, outros: outros, fixos: fixos, pacs: pacs, ebitda: mc - fixos - pacs };
  }
  /* RM no ano-projeto t: valores mensais × meses de operação no ano */
  function rmAno(m, t) {
    if (!rmOn(m)) return null;
    var ini = iniRM(m), o = { meses: 0, rampa: 0 }, ks = Object.keys(rmMensal(m, t, 0)).filter(function (k) { return k !== 'rampa'; });
    ks.forEach(function (k) { o[k] = 0; });
    for (var mo = 12 * (t - 1) + 1; mo <= 12 * t; mo++) {
      if (mo <= ini) continue;
      var d = rmMensal(m, t, rampaOp(m, mo - ini));
      ks.forEach(function (k) { o[k] += d[k]; }); o.meses++; o.rampa += d.rampa;
    }
    o.rampa = o.meses ? o.rampa / o.meses : 0;
    return o;
  }
  /* Reajuste de preços e custos (receita, custos, manutenção, aluguel) no ano-projeto t, relativo ao ano 1.
     "ipca" (padrão): IPCA projetado do Focus, ano a ano — o mesmo cenário que corrige a TLP das parcelas do FINAME;
     depois do último ano projetado, mantém o último valor. "fixo": (1 + reajuste_aa)^(t − 1); 0 = valores constantes.
     As parcelas dos financiamentos são nominais e não passam por aqui.                                              */
  var IPCA_PATH = null;
  function reajAno(m, t) {
    var c = m.cenario || {};
    if ((c.reajuste_modo || 'ipca') === 'ipca' && IPCA_PATH) {
      var anos = Object.keys(IPCA_PATH).map(Number).sort(function (a, b) { return a - b; }), ult = anos[anos.length - 1], f = 1;
      for (var k = 2; k <= t; k++) { var ano = num(m.fin.ano_inicio) + k - 1, v = IPCA_PATH[ano] != null ? IPCA_PATH[ano] : IPCA_PATH[ano > ult ? ult : anos[0]]; f *= 1 + num(v) / 100; }
      return f;
    }
    return Math.pow(1 + num(c.reajuste_aa), Math.max(0, t - 1));
  }
  function ipcaAno(m, t) { return reajAno(m, t) / reajAno(m, Math.max(1, t - 1)) - 1; }
  function fatorManut(m) { return m.propria.manut_fator == null ? 1 : num(m.propria.manut_fator); }

  /* ---------- Manutenção pós-garantia de um pacote (B ou C) ----------
     Por item: contrato Prata (sem tubo, gerador e sistemas de imagem; a TC soma a provisão de tubo)
     ou Ouro (cobertura total). Começa depois da garantia, contada da instalação.               */
  function manutPacote(m, itens) {
    var plano = (m.manut && m.manut.plano) === 'prata' ? 'prata' : 'ouro', G = num(m.manut && m.manut.garantia_meses);
    var fat = fatorManut(m), tubo = num(m.propria.tubo);
    var porItem = (itens || []).map(function (it) {
      var q = num(it.qtd), prata = (num(it.m_prata) + (it.tubo ? tubo : 0)) * q, ouro = num(it.m_ouro) * q;
      return { id: it.id, nome: it.nome, rm: isRM(it), ini: iniItem(m, it), prata: prata * fat, ouro: ouro * fat, usado: (plano === 'prata' ? prata : ouro) * fat, tubo: it.tubo ? tubo * q * fat : 0 };
    });
    var soma = function (k) { return porItem.reduce(function (s, x) { return s + x[k]; }, 0); };
    var mes = soma('usado');
    return { plano: plano, garantia: G, fator: fat, porItem: porItem, prata: soma('prata'), ouro: soma('ouro'), mes: mes,
      ano: function (t) { return porItem.reduce(function (s, x) { return s + x.usado * mesesDesde(x.ini + G, t); }, 0) * reajAno(m, t); } };
  }
  function opexManut(M) { return { tipo: 'manut', mes: M.mes, ano: M.ano }; }
  /* aluguel por linha, cada uma desde a sua instalação (a RM começa depois) */
  function opexAluguel(m, L) { return { tipo: 'aluguel', mes: L.aluguel, ano: function (t) { return L.linhas.reduce(function (s, x) { return s + x.aluguel * mesesDesde(x.ini, t); }, 0) * reajAno(m, t); } }; }

  /* ---------- Locação de longo prazo (alternativa D) ----------
     Fonte por item:
     · "vmi": cotação de locação da VMI por prazo (R$/mês por unidade, it.loc_vmi), com manutenção inclusa
       (confirmado em 17/10/2026). Cenário altD.vmi_manut = "nao": o hospital pagaria o contrato do plano escolhido
       depois da garantia, lançado como média no prazo: contrato × (prazo − garantia) ÷ prazo.
     · "composicao" (itens sem cotação, ou altD.fonte = "composicao"): aluguel montado pelos custos do locador
       parcela financeira = anuidade, à taxa do locador, sobre (valor − VP do valor residual no fim do prazo)
       valor residual     = valor × (1 − queda anual do valor de mercado)^(prazo/12)
       aluguel            = parcela financeira ÷ (1 − tributos do locador) + manutenção Ouro média no prazo
     Prazo fora da tabela da VMI: interpolação linear entre os prazos cotados (extremos: o prazo mais próximo). */
  var DEP_D = { tc: 'dep_tc', us: 'dep_us', rxp: 'dep_rx', rxdr: 'dep_rx', dr: 'dep_dr', rm: 'dep_rm' };
  function depD(m, it) { var d = m.altD || {}, k = DEP_D[it.id]; return k && d[k] != null ? num(d[k]) : 0.25; }
  function cotacaoVmi(it, n) {
    var t = it && it.loc_vmi; if (!t || typeof t !== 'object') return null;
    var ks = Object.keys(t).map(Number).filter(function (k) { return isFinite(k) && num(t[k]) > 0; }).sort(function (a, b) { return a - b; });
    if (!ks.length) return null;
    if (n <= ks[0]) return num(t[ks[0]]);
    if (n >= ks[ks.length - 1]) return num(t[ks[ks.length - 1]]);
    for (var i = 0; i < ks.length - 1; i++) if (n >= ks[i] && n <= ks[i + 1]) { var a = num(t[ks[i]]), b = num(t[ks[i + 1]]); return a + (b - a) * (n - ks[i]) / (ks[i + 1] - ks[i]); }
    return null;
  }
  /* taxa a.a. que faz a anuidade sobre (valor − VP do residual) igualar a parcela informada (bisseção) */
  function taxaLocImplicita(V, RV, n, parcela) {
    if (!(parcela > 0) || !(V > 0)) return null;
    var f = function (i) { var v = Math.pow(1 + i, -n); return (V - RV * v) * (i > 0 ? i / (1 - v) : 1 / n) - parcela; };
    if (f(0) > 0) return null;
    var lo = 0, hi = 0.2; if (f(hi) < 0) return null;
    for (var k = 0; k < 80; k++) { var md = (lo + hi) / 2; if (f(md) > 0) hi = md; else lo = md; }
    return Math.pow(1 + (lo + hi) / 2, 12) - 1;
  }
  function locacao(m, itens, n) {
    var d = m.altD || {}, ra = num(d.taxa_base) + num(d.premio), rm = Math.pow(1 + ra, 1 / 12) - 1, tr = num(d.trib);
    var G = num(m.manut && m.manut.garantia_meses), fat = fatorManut(m), usaVmi = (d.fonte || 'vmi') !== 'composicao', manInclusa = d.vmi_manut === 'sim';
    var plano = (m.manut && m.manut.plano) === 'prata' ? 'prata' : 'ouro', tubo = num(m.propria.tubo);
    var v = Math.pow(1 + rm, -n), fa = rm > 0 ? rm / (1 - v) : 1 / n;
    var linhas = (itens || []).map(function (it) {
      var q = num(it.qtd), V = q * num(it.preco), dep = depD(m, it), rv = Math.pow(1 - dep, n / 12), RV = V * rv;
      var cot = usaVmi ? cotacaoVmi(it, n) : null, proxy = false;
      if (cot == null && usaVmi && it.loc_proxy) { /* sem cotação própria: mesma razão aluguel ÷ preço do item de referência (RM ← TC) */
        var px = (m.equip.C || []).filter(function (x) { return x.id === it.loc_proxy; })[0], cp = px ? cotacaoVmi(px, n) : null;
        if (cp != null && num(px.preco) > 0) { cot = cp / num(px.preco) * num(it.preco); proxy = true; }
      }
      if (cot != null) {
        var base = cot * q, contrato = (plano === 'prata' ? num(it.m_prata) + (it.tubo ? tubo : 0) : num(it.m_ouro)) * q * fat;
        var manSep = manInclusa ? 0 : contrato * Math.max(0, n - G) / n;
        var finImpl = base * (1 - tr); /* teto: trata o aluguel inteiro como parcela financeira; com manutenção inclusa, a taxa efetiva é menor */
        return { id: it.id, nome: it.nome, modelo: it.modelo, rm: isRM(it), ini: iniItem(m, it), qtd: q, V: V, dep: dep, rvPct: rv, RV: RV, fonte: proxy ? 'proxy' : 'vmi', cotUnit: cot, cotModelo: it.loc_vmi_modelo || it.modelo,
          fin: base, trib: 0, man: manSep, manSep: manSep, manLoc: 0, aluguel: base + manSep, taxaImpl: taxaLocImplicita(V, RV, n, finImpl), pctMes: V ? (base + manSep) / V : null };
      }
      var fin = (V - RV * v) * fa, finBruto = tr < 1 ? fin / (1 - tr) : fin;
      var man = num(it.m_ouro) * q * fat * Math.max(0, n - G) / n;
      return { id: it.id, nome: it.nome, modelo: it.modelo, rm: isRM(it), ini: iniItem(m, it), qtd: q, V: V, dep: dep, rvPct: rv, RV: RV, fonte: 'composicao', cotUnit: null, fin: finBruto, finLiq: fin, trib: finBruto - fin, man: man, manSep: 0, manLoc: man, aluguel: finBruto + man, taxaImpl: null, pctMes: V ? (finBruto + man) / V : null };
    });
    var s = function (k) { return linhas.reduce(function (a, x) { return a + (x[k] || 0); }, 0); };
    var V = s('V'), vm = linhas.filter(function (x) { return x.fonte === 'vmi'; }), pxs = linhas.filter(function (x) { return x.fonte === 'proxy'; }), cps = linhas.filter(function (x) { return x.fonte === 'composicao'; });
    return { n: n, taxaAno: ra, taxaMes: rm, linhas: linhas, V: V, RV: s('RV'), fin: s('fin'), trib: s('trib'), man: s('man'), manSep: s('manSep'), manLoc: s('manLoc'), aluguel: s('aluguel'), pctMes: V ? s('aluguel') / V : null,
      usaVmi: usaVmi, manInclusa: manInclusa, plano: plano, nVmi: vm.length, aluguelVmi: vm.reduce(function (a, x) { return a + x.fin; }, 0),
      nProxy: pxs.length, aluguelProxy: pxs.reduce(function (a, x) { return a + x.fin; }, 0), proxyItens: pxs.map(function (x) { return x.nome + (x.modelo ? ' (' + x.modelo + ')' : ''); }),
      aluguelComp: cps.reduce(function (a, x) { return a + x.aluguel; }, 0),
      semCotacao: cps.map(function (x) { return x.nome + (x.modelo ? ' (' + x.modelo + ')' : ''); }) };
  }
  function altD(m) {
    var n = Math.max(12, Math.round(num(m.altD && m.altD.prazo) || 48)), L = locacao(m, ativos(m, m.equip.C), n);
    return { id: 'D', capex: 0, capexFin: 0, custosIni: 0, servico: {}, jurosAno: {}, rows: [], n: n, loc: L, parcela: 0, aluguel: L.aluguel, pagosPrazo: L.aluguel * n, opex: opexAluguel(m, L) };
  }
  /* Comprar o mesmo pacote (C) e usá-lo pelo mesmo prazo da locação, a valor presente pela taxa de desconto:
     entrada + parcelas até o mês n + saldo devedor no mês n + manutenção Ouro após a garantia − valor de mercado no mês n.
     A comparação é com a soma dos aluguéis no prazo, à mesma taxa (vantagem da locação = possuir − alugar).             */
  function custoPossuirC(m, C, n) {
    var k = Math.pow(1 + num(m.fin.desconto), 1 / 12) - 1, vp = function (x, j) { return x / Math.pow(1 + k, j); };
    var G = num(m.manut && m.manut.garantia_meses), fat = fatorManut(m), itens = ativos(m, m.equip.C);
    var M = itens.reduce(function (s, it) { return s + num(it.m_ouro) * num(it.qtd); }, 0) * fat;
    var RV = itens.reduce(function (s, it) { return s + num(it.qtd) * num(it.preco) * Math.pow(1 - depD(m, it), n / 12); }, 0);
    var pvMan = 0, j; for (j = G + 1; j <= n; j++) pvMan += vp(M, j);
    var vista = C.capex + pvMan - vp(RV, n), fin = null, parcelas = 0, saldo = 0;
    if (C.escolha && C.rows && C.rows.length) {
      fin = C.capex - C.capexFin + C.custosIni;
      for (j = 0; j < Math.min(n, C.rows.length); j++) { fin += vp(C.rows[j].parcela, j + 1); parcelas += C.rows[j].parcela; }
      saldo = n < C.rows.length ? C.rows[n - 1].saldo : 0;
      fin += vp(saldo, n) + pvMan - vp(RV, n);
    }
    return { pv: fin == null ? vista : fin, pvVista: vista, financiado: fin != null, parcelas: parcelas, saldo: saldo, M: M, pvMan: pvMan, RV: RV };
  }
  var PRAZOS_D = [24, 36, 48, 60, 72, 84];
  function prazosD(m, C) {
    var k = Math.pow(1 + num(m.fin.desconto), 1 / 12) - 1;
    return PRAZOS_D.map(function (n) {
      var L = locacao(m, ativos(m, m.equip.C), n), D = { id: 'D', capex: 0, capexFin: 0, custosIni: 0, servico: {}, n: n, loc: L, opex: opexAluguel(m, L) };
      var fl = fluxo(m, D), pvAlug = 0; for (var j = 1; j <= n; j++) pvAlug += L.aluguel / Math.pow(1 + k, j);
      var cp = custoPossuirC(m, C, n), anu = pvAlug / (L.aluguel || 1);
      return { n: n, loc: L, aluguel: L.aluguel, pctMes: L.pctMes, totalPrazo: L.aluguel * n, pvAluguel: pvAlug, custoPossuir: cp.pv, custoVista: cp.pvVista, possuir: cp, vantagem: cp.pv - pvAlug, vantagemVista: cp.pvVista - pvAlug,
        equilibrio: cp.pv / anu, /* aluguel em que locar e possuir empatam no prazo */
        vplEnt: fl.vplEnt, acumEnt: fl.acumEnt, fl: fl };
    });
  }
  /* Aluguel em que a locação empata com uma alternativa de compra no VPL para o hospital (horizonte inteiro).
     Escalando todos os aluguéis pelo mesmo fator, o VPL da locação é linear no aluguel mensal:
     VPL(a) = VPL(a0) − (a − a0) × F, F = Σ aluguel do ano ÷ a0 ÷ (1+r)^t (cada linha desde a sua instalação). */
  function equilibrioD(m, D, flD, flAlvo) {
    var r = num(m.fin.desconto), H = Math.max(1, Math.round(num(m.fin.horizonte))), F = 0;
    if (!D.aluguel) return null;
    for (var t = 1; t <= H; t++) F += D.opex.ano(t) / D.aluguel / Math.pow(1 + r, t);
    return F ? D.aluguel - (flAlvo.vplEnt - flD.vplEnt) / F : null;
  }

  /* ---------- Serviço da dívida por ano-projeto a partir de um cronograma mensal ---------- */
  function servicoPorAnoProj(rows, anoInicio) {
    var o = {}; (rows || []).forEach(function (r) { var k = r.y - anoInicio + 1; if (k < 1) k = 1; o[k] = (o[k] || 0) + r.parcela; }); return o;
  }

  /* ---------- Fluxo de caixa de uma alternativa ----------
     alt: { id, capex, capexFin (P liberado), custosIni, servico: {anoProj: valor}, jurosAno:{}, rows }
     retorna: anos[], indicadores                                                       */
  function fluxo(m, alt) {
    var f = m.fin, H = Math.max(1, Math.round(num(f.horizonte))), c = m.cenario;
    var ini = num(f.inicio_op_mes) || 0; /* meses do ano 1 ainda com a EMG */
    var vida = num(f.vida_util) || 10;
    /* Investimento: pacote, RIS e PACS no ano 0; RM: sala no ano da aprovação (recurso próprio) e equipamento no ano da entrega,
       com a parte financiada e os custos do financiamento da RM no ano da entrega. Depreciação de cada parcela a partir do seu ano. */
    var obra = obraRM(m), tR = rmOn(m) ? Math.min(H, anoRM(m)) : 0, tE = rmOn(m) ? Math.min(H, anoEqRM(m)) : 0;
    var eqRM = rmOn(m) ? num(alt.capexRM) : 0, capexRM = eqRM + obra, finRM = num(alt.capexFinRM), ciRM = num(alt.custosIniRM);
    var capex0 = alt.capex - num(alt.capexRM) + num(m.propria.rispacs_impl) + pacsImpl(m);
    var capex = capex0 + capexRM;
    var depAnoT = function (t) { return (t <= vida ? capex0 / vida : 0) + (tE && t >= tE && t < tE + vida ? eqRM / vida : 0) + (tR && t >= tR && t < tR + vida ? obra / vida : 0); };
    var anos = [], proj = [-capex0], ent = [-(capex0 - ((alt.capexFin || 0) - finRM)) - ((alt.custosIni || 0) - ciRM)];
    var acumP = -capex0, acumE = ent[0];
    for (var t = 1; t <= H; t++) {
      var fator = (1 + num(c.volume_var)) * Math.pow(1 + num(c.cresc_aa), Math.max(0, t - 2));
      var frac = t === 1 ? (12 - ini) / 12 : 1;
      var e = dreMensal(m, fator, 'emg', t), p = dreMensal(m, fator, 'propria', t);
      var ebitdaEmg = e.resultado * 12, ebitdaPropBase = p.resultado * 12;
      var incBase = (ebitdaPropBase - ebitdaEmg) * frac;
      var opexAno = alt.opex ? alt.opex.ano(t) : 0; /* manutenção pós-garantia (B, C) ou aluguel (D) */
      var rmA = rmAno(m, t), rmE = rmA ? rmA.ebitda : 0; /* RM: serviço novo, todo incremental */
      var inc = incBase + rmE - opexAno;
      var opReg = alt.opex ? (alt.opex.tipo === 'aluguel' ? { aluguel: alt.opex.mes } : { manut: alt.opex.mes }) : null;
      var depAno = depAnoT(t);
      var ebit = inc - depAno;
      var trib = Math.max(0, ebit) * num(f.tributos);
      var residual = (t === H && num(f.residual) > 0) ? Math.max(0, capex - (function () { var a = 0; for (var k = 1; k <= H; k++) a += depAnoT(k); return a; })()) * num(f.residual) : 0;
      /* obra no ano da aprovação; equipamento, liberação do financiamento e custos na entrega */
      var invP = (t === tR ? obra : 0) + (t === tE ? eqRM : 0), invE = (t === tR ? obra : 0) + (t === tE ? (eqRM - finRM) + ciRM : 0);
      var fcp = inc - trib + residual - invP;
      var serv = (alt.servico && alt.servico[t]) || 0;
      var fce = inc - trib - serv + residual - invE;
      acumP += fcp; acumE += fce;
      anos.push({ t: t, ano: num(f.ano_inicio) + t - 1, fator: fator, frac: frac, exames: p.exames * 12, rl: p.rl * 12, ebitdaEmg: ebitdaEmg, ebitdaPropBase: ebitdaPropBase, incBase: incBase, rm: rmA, rmEbitda: rmE, invRM: invP, invRMHosp: invE, opex: opexAno, opexTipo: alt.opex ? alt.opex.tipo : null, inc: inc, dep: depAno, ebit: ebit, trib: trib, residual: residual, fcp: fcp, servico: serv, juros: (alt.jurosAno && alt.jurosAno[t]) || 0, fce: fce, acumP: acumP, acumE: acumE, dscr: serv > 0 ? inc / serv : null, desembolso: opexAno + serv, dre: { emg: e, prop: dreMensal(m, fator, 'propria', t, opReg) } });
      proj.push(fcp); ent.push(fce);
    }
    var r = num(f.desconto);
    var dscrs = anos.map(function (a) { return a.dscr; }).filter(function (x) { return x != null; });
    var pagos = 0; Object.keys(alt.servico || {}).forEach(function (k) { pagos += alt.servico[k]; });
    var opexTot = anos.reduce(function (s, a) { return s + a.opex; }, 0);
    return { opexTot: opexTot, desembolsoTot: opexTot + pagos + (capex - (alt.capexFin || 0)) + (alt.custosIni || 0),
      anos: anos, capex: capex, capex0: capex0, capexRM: capexRM, tRM: tR, tEqRM: tE, obra: obra, proj: proj, ent: ent,
      vpl: npv(proj, r), tir: irr(proj), pb: payback(proj, 0), pbDesc: payback(proj, r),
      vplEnt: npv(ent, r), tirEnt: irr(ent), pbEnt: payback(ent, 0), acumEnt: acumE, acumProj: acumP,
      ir: (function () { var vp = 0; for (var i = 1; i < proj.length; i++) vp += proj[i] / Math.pow(1 + r, i); return capex ? vp / capex : null; })(),
      dscrMin: dscrs.length ? Math.min.apply(null, dscrs) : null, pagos: pagos
    };
  }

  /* ---------- Alternativa B: parcelas fixas informadas pelos fornecedores (HFS/GE) ---------- */
  function altB(m) {
    var todos = m.equip.B || [], rows = [], anoIni = num(m.fin.ano_inicio), mIni = num(m.fin.inicio_op_mes) || 0;
    var n = num(m.equip.B_n) || 60;
    /* RM sem proposta GE: parcela calculada à taxa implícita dos demais itens financiados do pacote (HFS e fornecedores) */
    var base0 = todos.filter(function (it) { return !isRM(it) && it.fin !== false; }), cx0 = capexDe(base0), iB = taxaImplicita(cx0.financiavel, cx0.parcelaMes, n);
    var efetivos = todos.map(function (it) {
      if (!isRM(it) || (it.parcela_auto === false && num(it.parcela) > 0)) return it;
      var c = clone(it), nn = num(it.n) || n, P = num(it.preco); c.parcela = iB ? P * iB / (1 - Math.pow(1 + iB, -nn)) : P / nn; c.parcelaAuto = true; return c;
    });
    var itens = ativos(m, efetivos), cx = capexDe(itens), cxRM = capexDe(itens.filter(isRM)), cxB0 = capexDe(itens.filter(function (it) { return !isRM(it); }));
    /* parcela constante por item; taxa implícita por item para exibição (lista completa, na ordem da tabela) */
    var implic = efetivos.map(function (it) { var P = num(it.preco), pm = num(it.parcela), nn = num(it.n) || n; var i = taxaImplicita(P, pm, nn); return { id: it.id, taxaMes: i, taxaAno: i == null ? null : (Math.pow(1 + i, 12) - 1) * 100, totalPago: pm * nn * num(it.qtd), parcelaAuto: it.parcelaAuto ? pm : null, fora: isRM(it) && !rmOn(m), alerta: pm * nn < P ? 'Parcelas somam menos que o valor à vista' : (i === 0 ? 'Sem juros declarados' : '') }; });
    /* parcelas do pacote a partir da instalação; as da RM a partir da instalação da RM */
    var acc = {}, add = function (ini, v) { for (var k = 1; k <= n; k++) acc[ini + k] = (acc[ini + k] || 0) + v; };
    add(mIni, cxB0.parcelaMes); if (cxRM.parcelaMes) add(iniRM(m), cxRM.parcelaMes);
    Object.keys(acc).map(Number).sort(function (a, b) { return a - b; }).forEach(function (mm) { rows.push({ t: mm - mIni, y: anoIni + Math.floor((mm - 1) / 12), m: ((mm - 1) % 12) + 1, parcela: acc[mm], juros: 0, amort: 0, saldo: null }); });
    var pagosB = rows.reduce(function (a, r) { return a + r.parcela; }, 0), juros = pagosB - cx.financiavel;
    return { id: 'B', capex: cx.total, capexFin: cx.financiavel, capexRM: cxRM.total, capexFinRM: cxRM.financiavel, custosIni: 0, servico: servicoPorAnoProj(rows, anoIni), rows: rows, parcela: cx.parcelaMes, n: n, pagos: pagosB, juros: juros, implic: implic, cetAno: (function () { var i = taxaImplicita(cx.financiavel, cx.parcelaMes, n); return i == null ? null : (Math.pow(1 + i, 12) - 1) * 100; })() };
  }
  function taxaImplicita(P, pm, n) {
    if (!P || !pm || !n) return null;
    if (Math.abs(pm * n - P) < 1e-6) return 0;
    if (pm * n < P) return null;
    var lo = 0, hi = 1;
    for (var k = 0; k < 200; k++) { var mid = (lo + hi) / 2; var pv = pm * (1 - Math.pow(1 + mid, -n)) / mid; if (pv > P) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }

  /* Memória do Motor dentro de um cálculo: os cenários (RM, PACS, SUS, FIIS, sensibilidades) repetem o mesmo caso de crédito.
     Zerada a cada cálculo completo; resultados só de leitura. */
  var AV = { motor: null, base: null, map: {}, n: 0 };
  function avaliarMemo(Motor, caso, BASE) {
    if (AV.motor !== Motor || AV.base !== BASE) AV = { motor: Motor, base: BASE, map: {}, n: 0 };
    var k = JSON.stringify(caso), v = AV.map[k];
    if (v) return v;
    if (AV.n >= 200) { AV.map = {}; AV.n = 0; }
    v = Motor.avaliar(caso, BASE); AV.map[k] = v; AV.n++;
    return v;
  }

  /* ---------- Alternativa C: pacote VMI financiado pelo Motor (ferramenta Financiamento VMI) ---------- */
  function altC(m, Motor, BASE) {
    var todosC = ativos(m, m.equip.C), cx = capexDe(todosC), ac = m.altC, cl = m.cliente;
    var itens = todosC.filter(function (it) { return !isRM(it); }), itensRM = todosC.filter(isRM), cx0 = capexDe(itens), cxRM = capexDe(itensRM);
    var cfiInfo = (function () { var com = 0, prev = 0, sem = 0, semItens = [], prevItens = []; itens.forEach(function (i) { if (i.fin === false) return; var v = num(i.qtd) * num(i.preco), c = String(i.cfi || '').trim(); if (/^\d+$/.test(c)) com += v; else if (c) { prev += v; prevItens.push(i.nome + ' (' + c + ')'); } else { sem += v; semItens.push(i.nome); } }); return { com: com, prev: prev, sem: sem, semItens: semItens, prevItens: prevItens, todos: sem === 0 && com + prev > 0 }; })();
    var caso = { cliente: { natureza: cl.natureza, uf: cl.uf, rob: num(cl.rob) || null, porte_decl: cl.porte_decl || null, sus_creditos_12m: num(cl.sus_creditos_12m) || null, sus_mac_outros: cl.sus_mac_outros || '', sus_mac_parcelas: num(cl.sus_mac_parcelas) },
      operacao: { valor_equip: cx0.financiavel, valor_obra: num(ac.valor_obra), valor_financiar: ac.valor_financiar === '' || ac.valor_financiar == null ? null : num(ac.valor_financiar), prazo: num(ac.prazo) || 120, carencia: num(ac.carencia) || 0, inicio: ac.inicio || (num(m.fin.ano_inicio) + '-03'), sistema: ac.sistema || 'SAC', carModo: ac.carModo || 'pagos', equipamento: { cfi: cfiInfo.todos ? (cfiInfo.prev > 0 ? 'previsto' : 'informado') : (num(ac.cfi_presumido) ? 'presumido' : ''), cfi_previsao: cfiInfo.prev > 0 ? 'dez/2026' : null, origem: 'nacional' } },
      flags: clone(cl.flags || {}), honorario_pct: num(ac.honorario_pct) * 100 }; /* premissa em fração (0,02); o motor usa % (2) */
    var av = avaliarMemo(Motor, caso, BASE);
    var escolha = null;
    if (ac.linha && ac.linha !== 'auto') {
      var x = av.todas.filter(function (t) { return t.linha.id === ac.linha; })[0];
      if (x && x.sim) {
        var cu = ac.custo && ac.custo !== 'auto' ? x.alternativas.filter(function (a) { return a.custo === ac.custo; })[0] : null;
        escolha = { linha: x.linha, el: x.el, sim: cu || x.sim, rank: x.rank || null };
      }
    }
    if (!escolha && av.ranking.length) escolha = { linha: av.ranking[0].linha, el: av.ranking[0].el, sim: av.ranking[0].sim, rank: 1 };
    var anoIni = num(m.fin.ano_inicio);
    var out = { id: 'C', capex: cx.total, capexRM: cxRM.total, capexFin: 0, capexFinRM: 0, custosIni: 0, custosIniRM: 0, servico: {}, jurosAno: {}, rows: [], av: av, escolha: escolha, caso: caso, cx: cx, cx0: cx0, cfi: cfiInfo };
    if (escolha) {
      var s = escolha.sim, s2 = null;
      /* RM: contrato próprio, na aprovação da RM, na mesma linha e com as mesmas condições do pacote */
      if (cxRM.financiavel > 0) {
        var caso2 = clone(caso); caso2.operacao.valor_equip = cxRM.financiavel; caso2.operacao.valor_obra = 0; caso2.operacao.valor_financiar = null;
        caso2.operacao.inicio = mesRMStr(m); /* liberação na entrega da RM */ caso2.operacao.equipamento = { cfi: itensRM.every(function (i) { return /^\d+$/.test(String(i.cfi || '').trim()); }) ? 'informado' : (num(ac.cfi_presumido) ? 'presumido' : ''), origem: 'nacional' };
        var av2 = avaliarMemo(Motor, caso2, BASE), x2 = av2.todas.filter(function (t) { return t.linha.id === escolha.linha.id; })[0];
        var sim2 = x2 && x2.sim ? (x2.alternativas || []).filter(function (a) { return a.custo === s.custo; })[0] || x2.sim : (av2.ranking[0] ? av2.ranking[0].sim : null);
        if (sim2) { s2 = sim2; out.rmFin = { sim: sim2, linha: x2 && x2.sim ? x2.linha : av2.ranking[0].linha, av: av2, inicio: caso2.operacao.inicio }; }
      }
      var rows = s2 ? mergeRows(s.rows, s2.rows) : s.rows;
      out.capexFin = s.P + (s2 ? s2.P : 0); out.capexFinRM = s2 ? s2.P : 0;
      out.custosIniRM = s2 ? s2.iof + s2.tarifa + s2.honor : 0; out.custosIni = s.iof + s.tarifa + s.honor + out.custosIniRM;
      out.rows = rows; out.servico = servicoPorAnoProj(rows, anoIni);
      var jo = {}; rows.forEach(function (r) { var k = Math.max(1, r.y - anoIni + 1); jo[k] = (jo[k] || 0) + r.juros; }); out.jurosAno = jo;
      out.parcela = s.parcelaPosCarencia + (s2 ? s2.parcelaPosCarencia : 0); out.parcelaPacote = s.parcelaPosCarencia; out.parcelaRM = s2 ? s2.parcelaPosCarencia : 0; out.primeiraRM = s2 ? s2.primeiraParcela : 0;
      out.primeira = s.primeiraParcela; out.n = s.n; out.c = s.c; out.pagos = s.pagos + (s2 ? s2.pagos : 0); out.juros = s.juros + (s2 ? s2.juros : 0); out.cetAno = s.cet; out.taxaAno1 = s.taxaAno1; out.iof = s.iof + (s2 ? s2.iof : 0); out.avisos = s.avisos;
      out.honor = s.honor + (s2 ? s2.honor : 0); out.honorPacote = s.honor; out.honorRM = s2 ? s2.honor : 0;
    }
    return out;
  }
  /* soma dois cronogramas mensais (pacote + RM) pelo mês do calendário */
  function mergeRows(a, b) {
    var map = {};
    [a, b].forEach(function (rs) { (rs || []).forEach(function (r) { var k = r.y * 12 + r.m, o = map[k] || (map[k] = { y: r.y, m: r.m, taxa: r.taxa, saldoIni: 0, juros: 0, amort: 0, parcela: 0, saldo: 0 }); o.saldoIni += num(r.saldoIni); o.juros += r.juros; o.amort += r.amort; o.parcela += r.parcela; o.saldo += num(r.saldo); }); });
    return Object.keys(map).map(Number).sort(function (x, y) { return x - y; }).map(function (k, i) { var o = map[k]; o.t = i + 1; return o; });
  }

  /* ---------- Capacidade de crédito da entidade ---------- */
  function entidade(m, altSel, fl) {
    var e = m.entidade, f = m.fin, anoIni = num(f.ano_inicio), H = Math.max(1, Math.round(num(f.horizonte)));
    var ebitdaBase = num(e.ebitda_periodo) / num(e.meses_periodo) * 12;
    var cresc = num(e.ebitda_cresc_aa);
    var tdcAno = e.tdc_mes ? +String(e.tdc_mes).slice(0, 4) : null, tdcM = e.tdc_mes ? +String(e.tdc_mes).slice(5, 7) : 1;
    var divTot = num(e.div_cp) + num(e.div_lp), caixa = num(e.caixa);
    var linhas = [];
    for (var t = 1; t <= H; t++) {
      var ano = anoIni + t - 1;
      var servAtual = 0, servAtualTdc = 0;
      (e.emprestimos || []).forEach(function (l) {
        var fim = l.fim ? +String(l.fim).slice(0, 4) * 12 + (+String(l.fim).slice(5, 7)) : 0;
        for (var mth = 1; mth <= 12; mth++) {
          var idx = ano * 12 + mth; if (idx > fim) continue;
          servAtual += num(l.parcela);
          var aposTdc = tdcAno && (ano > tdcAno || (ano === tdcAno && mth > tdcM));
          if (!(aposTdc && num(e.tdc_liquida) > 0 && l.liquida_tdc !== false)) servAtualTdc += num(l.parcela);
        }
      });
      var ebitdaEnt = ebitdaBase * Math.pow(1 + cresc, t);
      var a = fl.anos[t - 1];
      var inc = a ? a.inc : 0, servNovo = a ? a.servico : 0;
      var ebitdaTot = ebitdaEnt + inc;
      linhas.push({ t: t, ano: ano, ebitdaEnt: ebitdaEnt, inc: inc, ebitdaTot: ebitdaTot, servAtual: servAtual, servAtualTdc: servAtualTdc, servNovo: servNovo,
        dscrSem: (servAtual + servNovo) > 0 ? ebitdaTot / (servAtual + servNovo) : null,
        dscrSemProj: servAtual > 0 ? ebitdaEnt / servAtual : null,
        dscrCom: (servAtualTdc + servNovo) > 0 ? ebitdaTot / (servAtualTdc + servNovo) : null });
    }
    var dlEbitda = ebitdaBase ? (divTot - caixa) / ebitdaBase : null;
    var dlEbitdaProj = ebitdaBase ? (divTot - caixa + (altSel.capexFin || 0)) / (ebitdaBase + (fl.anos[1] ? fl.anos[1].inc : 0)) : null;
    var dlTdc = Math.max(0, divTot - caixa - num(e.tdc_min) * num(e.tdc_liquida));
    return { linhas: linhas, ebitdaBase: ebitdaBase, divTot: divTot, caixa: caixa, dl: divTot - caixa, dlEbitda: dlEbitda, dlEbitdaProj: dlEbitdaProj, dlAposTdc: dlTdc, receitaAnual: num(e.receita_periodo) / num(e.meses_periodo) * 12 };
  }

  /* ---------- Capacidade da TC ---------- */
  function capacidadeTC(m) {
    var v = m.volumes, p = m.propria;
    var cap = num(p.tc_exh) * num(p.tc_h) * num(p.tc_d);
    var tc0 = num(v.tc26) * (1 + num(m.cenario.volume_var)), sus = susAteOn(m) ? num((m.sus || {}).tc_mes) : 0, tc = tc0 + sus;
    return { cap: cap, tc: tc, tcHoje: tc0, sus: sus, ocup: cap ? tc / cap : null };
  }

  /* ---------- Cálculo completo ---------- */
  function calcular(m, Motor, BASE, opts) {
    IPCA_PATH = (BASE && BASE.macro && BASE.macro.focus && BASE.macro.focus.ipca) || null;
    if (!(opts && opts.leve)) AV = { motor: Motor, base: BASE, map: {}, n: 0 }; /* cálculo completo: memória nova (a base pode ter mudado) */
    var B = altB(m), C = altC(m, Motor, BASE);
    B.manut = manutPacote(m, ativos(m, m.equip.B)); B.opex = opexManut(B.manut);
    C.manut = manutPacote(m, ativos(m, m.equip.C)); C.opex = opexManut(C.manut);
    var D = altD(m);
    var flB = fluxo(m, B), flC = fluxo(m, C), flD = fluxo(m, D);
    var a = m.fin.alternativa, sel = a === 'B' ? B : a === 'D' ? D : C, flSel = a === 'B' ? flB : a === 'D' ? flD : flC;
    /* DRE da imagem (base e cenário) sem a parte da RM no aluguel ou na manutenção: a RM tem DRE própria (out.rm) */
    var opRM = function (alt) { return alt.opex.tipo === 'aluguel' ? alt.loc.linhas.reduce(function (s, x) { return s + (x.rm ? x.aluguel : 0); }, 0) : alt.manut.porItem.reduce(function (s, x) { return s + (x.rm ? x.usado : 0); }, 0); };
    var opRMsel = opRM(sel), opReg = sel.opex.tipo === 'aluguel' ? { aluguel: sel.opex.mes - opRMsel } : { manut: sel.opex.mes - opRMsel };
    var base = { emg: dreMensal(m, 1, 'emg', 2), prop: dreMensal(m, 1, 'propria', 2, opReg) };
    var fator = 1 + num(m.cenario.volume_var);
    var cen = { emg: dreMensal(m, fator, 'emg', 2), prop: dreMensal(m, fator, 'propria', 2, opReg), propBase: dreMensal(m, fator, 'propria', 2) };
    var ent = entidade(m, sel, flSel);
    var rmReg = rmOn(m) ? rmMensal(m, 2, 1) : null; /* RM em regime, preços do ano 2 (mesma base de cen) */
    var out = { B: B, C: C, D: D, flB: flB, flC: flC, flD: flD, base: base, cen: cen, sel: sel, flSel: flSel, ent: ent, tc: capacidadeTC(m),
      rm: { on: rmOn(m), reg: rmReg, cap: capacidadeRM(m), obra: obraRM(m), ini: iniRM(m), aprov: aprovRM(m), ano: anoRM(m), opex: { B: opRM(B), C: opRM(C), D: opRM(D) }, opexSel: opRMsel },
      ganhoMes: cen.prop.resultado - cen.emg.resultado, ganhoMesComParcela: cen.prop.resultado - cen.emg.resultado + (rmReg ? rmReg.ebitda - opRMsel : 0) - (sel.parcela || 0) };
    if (!(opts && opts.leve)) {
      out.entAlt = { B: entidade(m, B, flB), C: entidade(m, C, flC), D: entidade(m, D, flD) };
      out.prazosD = prazosD(m, C);
      D.equilibrioC = equilibrioD(m, D, flD, flC); D.equilibrioB = equilibrioD(m, D, flD, flB);
      out.rm.isolada = rmIsolada(m, C);
      out.sus = susUpside(m);
      out.cenRM = cenariosRM(m, Motor, BASE, out);
      out.cenPACS = cenariosPACS(m, Motor, BASE, out);
      out.cenFIIS = cenariosFIIS(m, Motor, BASE, out);
      out.cenSUS = cenariosSUS(m, Motor, BASE, out);
      out.lcdAuto = lcdAutomatico(m, Motor, BASE, out);
    }
    return out;
  }

  /* SUS: as três posições da chave lado a lado (a RM e o PACS ficam como estão) */
  function cenariosSUS(m, Motor, BASE, out) {
    var modo = susModo(m), r = {};
    ['fora', 'atual', 'ate'].forEach(function (k) {
      var rr = out; if (k !== modo) { var m2 = clone(m); m2.sus = m2.sus || {}; m2.sus.modo = k; rr = calcular(m2, Motor, BASE, { leve: true }); }
      var o = {}; ['B', 'C', 'D'].forEach(function (a) { var fl = rr['fl' + a]; o[a] = { vplEnt: fl.vplEnt, vpl: fl.vpl, tir: fl.tir, pb: fl.pb }; });
      o.resultado = rr.cen.prop.resultado; o.resultadoEmg = rr.cen.emg.resultado; o.ganhoMes = rr.ganhoMes; o.rmReg = rr.rm.reg ? rr.rm.reg.ebitda : null; o.selId = rr.sel.id;
      o.dscr = entidade(k === modo ? m : (function () { var m3 = clone(m); m3.sus = m3.sus || {}; m3.sus.modo = k; return m3; })(), rr.sel, rr.flSel).linhas.slice(0, 2).map(function (l) { return { ano: l.ano, v: l.dscrSem }; });
      r[k] = o;
    });
    var d = function (a, b) { var o = {}; ['B', 'C', 'D'].forEach(function (k) { o[k] = r[a][k].vplEnt - r[b][k].vplEnt; }); return o; };
    var su = m.sus || {}, f1 = reajAno(m, 2);
    /* SUS atual com a outra hipótese de repasse à EMG (o efeito depende de como a EMG é paga no SUS hoje) */
    var mo = clone(m); mo.sus = mo.sus || {}; mo.sus.modo = 'atual'; mo.sus.atual_emg = su.atual_emg === 'nada' ? 'mesmo' : 'nada';
    var ro = calcular(mo, Motor, BASE, { leve: true }), outroEmg = {}; ['B', 'C', 'D'].forEach(function (a) { outroEmg[a] = ro['fl' + a].vplEnt - r.fora[a].vplEnt; });
    /* SUS a mais da RM (vale com a RM ligada): soma ao delta da RM */
    var mr = clone(m); mr.rm = mr.rm || {}; mr.rm.incluir = 'sim'; var upR = susUpside(mr);
    return { modo: modo, v: r, dAtual: d('atual', 'fora'), dMais: d('ate', 'atual'), dTotal: d('ate', 'fora'), dAtualOutroEmg: outroEmg, vplRMsus: upR.vplRM, vplTCsus: upR.vplTC,
      atual: { exames: num(su.atual_mes), ticket: num(su.atual_ticket), rlMes: num(su.atual_mes) * num(su.atual_ticket) * (1 - num(m.base.glosa_pct)) * f1, emg: su.atual_emg === 'nada' ? 'nada' : 'mesmo' } };
  }

  /* FIIS Saúde: só para proponentes da Chamada Pública 2025 (inscrição de 13/10 a 07/11/2025).
     Simula o pacote C no FIIS indireto com o prazo pedido e, se o HDA tiver CEBAS, com 20 anos. */
  function cenariosFIIS(m, Motor, BASE, out) {
    var fl = (m.cliente && m.cliente.flags) || {}, marcado = !!num(fl.fiis_chamada2025), atual = out.C.escolha ? out.C.escolha.linha.id : null;
    function sim(tipo, prazo) {
      var m2 = clone(m); m2.cliente.flags = clone(fl); m2.cliente.flags.fiis_chamada2025 = 1; m2.cliente.flags.fiis_tipo = tipo;
      m2.altC.linha = 'fiis-saude-indireto'; m2.altC.custo = 'auto'; if (prazo) m2.altC.prazo = prazo;
      var r = calcular(m2, Motor, BASE, { leve: true }), e = r.C.escolha;
      if (!e || e.linha.id !== 'fiis-saude-indireto') return null;
      return { tipo: tipo, n: e.sim.n, c: e.sim.c, cet: e.sim.cet, tot: e.sim.custoTotal, taxa1: e.sim.taxaAno1, faixa: e.sim.faixaTotal, parcela: r.C.parcela, vplC: r.flC.vplEnt, delta: r.flC.vplEnt - out.flC.vplEnt, bloqueios: e.el.bloqueios };
    }
    var tipo = fl.fiis_tipo && fl.fiis_tipo !== 'sem_sus' ? fl.fiis_tipo : 'conveniada';
    return { marcado: marcado, emUso: !!(atual && /^fiis-/.test(atual)), tipo: fl.fiis_tipo || '', prazoPedido: num(m.altC.prazo) || 120,
      pedido: sim(tipo, num(m.altC.prazo) || 120), vinte: sim('filantropica_cebas', 240) };
  }

  /* Taxa LCD no BNDES Automático: custo total com a sobretaxa da base e a sobretaxa que empata com a linha em uso no pacote */
  function lcdAutomatico(m, Motor, BASE, out) {
    var C = out.C, av = C.av, e = C.escolha; if (!av || !e) return null;
    var x = av.todas.filter(function (t) { return t.linha.id === 'bndes-automatico'; })[0]; if (!x || !x.sim) return null;
    var lcd = (x.alternativas || []).filter(function (a) { return a.custo === 'LCD'; })[0]; if (!lcd) return null;
    var sb = (BASE.macro.lcd && BASE.macro.lcd.sobretaxa) || { v: 0 }, oo = { sistema: C.caso.operacao.sistema, carModo: C.caso.operacao.carModo };
    function tot(v) {
      var b2 = {}; Object.keys(BASE).forEach(function (k) { b2[k] = BASE[k]; });
      b2.macro = {}; Object.keys(BASE.macro).forEach(function (k) { b2.macro[k] = BASE.macro[k]; });
      b2.macro.lcd = {}; Object.keys(BASE.macro.lcd || {}).forEach(function (k) { b2.macro.lcd[k] = BASE.macro.lcd[k]; }); b2.macro.lcd.sobretaxa = { v: v, min: v, max: v };
      var ctx2 = {}; Object.keys(av.ctx).forEach(function (k) { ctx2[k] = av.ctx[k]; }); ctx2.base = b2;
      return Motor.simular(x.linha, 'LCD', 'base', ctx2, oo).custoTotal;
    }
    var t0 = tot(0), t1 = tot(1), ref = e.sim.custoTotal, be = t1 > t0 ? (ref - t0) / (t1 - t0) : null;
    return { sob: sb.v, sobMin: sb.min, sobMax: sb.max, confirmado: !!(BASE.macro.lcd && BASE.macro.lcd.confirmado), tot: lcd.custoTotal, cet: lcd.cet, n: lcd.n, c: lcd.c, ref: ref, refLinha: e.linha.nome, refCusto: e.sim.custo, empate: be, emUso: e.linha.id === 'bndes-automatico' && e.sim.custo === 'LCD' };
  }

  /* ---------- RM isolada: só o equipamento, a obra, a operação e a manutenção da RM, sem financiamento (preço do pacote C) ---------- */
  function rmIsolada(m, C) {
    if (!rmOn(m)) return null;
    var it = ativos(m, m.equip.C).filter(isRM)[0]; if (!it) return null;
    var H = Math.max(1, Math.round(num(m.fin.horizonte))), r = num(m.fin.desconto), mp = manutPacote(m, [it]), eq = num(it.qtd) * num(it.preco), inv = eq + obraRM(m), tR = Math.min(H, anoRM(m)), tE = Math.min(H, anoEqRM(m)), fl = [0], anos = [];
    for (var t = 1; t <= H; t++) { var a = rmAno(m, t), man = mp.ano(t), iv = (t === tR ? obraRM(m) : 0) + (t === tE ? eq : 0); anos.push({ t: t, ano: num(m.fin.ano_inicio) + t - 1, rm: a, manut: man, inv: iv, fc: a.ebitda - man - iv }); fl.push(a.ebitda - man - iv); }
    /* payback contado a partir do ano do investimento (mesma convenção de payback()) */
    return { inv: inv, tR: tR, equip: num(it.qtd) * num(it.preco), manutMes: mp.mes, anos: anos, fl: fl, vpl: npv(fl, r), tir: irr(fl), pb: payback(fl.slice(tR), 0) };
  }
  /* ---------- SUS: valor incremental fora do modelo (informativo) ----------
     Exames SUS adicionais pelo Agora Tem Especialistas, na capacidade ociosa: margem = receita líquida − laudo − material − PACS.
     Não entra no VPL nem no fluxo; o hospital decidiu manter o SUS fora do caso base. */
  function susUpside(m) {
    var sx = m.sus || {}, p = m.propria, rr = m.rm || {}, g = num(m.base.glosa_pct), H = Math.max(1, Math.round(num(m.fin.horizonte))), r = num(m.fin.desconto);
    var iniTC = num(m.fin.inicio_op_mes) || 0, iniR = rmOn(m) ? iniRM(m) : null, fl = [0], anos = [];
    var mcTC = function (reaj) { var v = num(sx.tc_mes), rl = v * num(sx.tc_valor) * (1 - g) * reaj; return { v: v, rl: rl, mc: rl * (1 - num(p.rep_med_pct) - num(p.matmed_pct)) - pacsEx(m) * v * reaj }; };
    var mcRM = function (reaj) { var v = rmOn(m) ? num(sx.rm_mes) : 0, rl = v * num(sx.rm_valor) * (1 - g) * reaj; return { v: v, rl: rl, mc: rl * (1 - num(rr.rep_med_pct) - num(rr.matmed_pct)) - pacsEx(m) * v * reaj }; };
    for (var t = 1; t <= H; t++) {
      var reaj = reajAno(m, t), a = mcTC(reaj), b = mcRM(reaj), mt = mesesDesde(iniTC, t), mr = iniR == null ? 0 : mesesDesde(iniR, t);
      var tot = a.mc * mt + b.mc * mr; anos.push({ t: t, ano: num(m.fin.ano_inicio) + t - 1, tc: a.mc * mt, rm: b.mc * mr, rl: a.rl * mt + b.rl * mr, total: tot }); fl.push(tot);
    }
    var reg = { tc: mcTC(reajAno(m, 2)), rm: mcRM(reajAno(m, 2)) };
    var flT = [0].concat(anos.map(function (a) { return a.tc; })), flR = [0].concat(anos.map(function (a) { return a.rm; }));
    return { anos: anos, vpl: npv(fl, r), vplTC: npv(flT, r), vplRM: npv(flR, r), reg: reg, regMes: reg.tc.mc + reg.rm.mc, regAno: (reg.tc.mc + reg.rm.mc) * 12, rlAno: (reg.tc.rl + reg.rm.rl) * 12, fl: fl,
      capTC: capacidadeTC(m), capRM: capacidadeRM(m) };
  }

  /* ---------- Cenários com e sem RM, lado a lado, e o volume e o preço em que a RM empata ---------- */
  function resumoAlt(m, alt, fl) {
    var en = entidade(m, alt, fl), a3 = fl.anos[Math.min(2, fl.anos.length - 1)];
    var invH = -fl.ent[0] + fl.anos.reduce(function (a, x) { return a + (x.invRMHosp || 0); }, 0);
    return { capex: fl.capex, fin: alt.capexFin || 0, ano0: invH, vpl: fl.vpl, vplEnt: fl.vplEnt, acumEnt: fl.acumEnt, comp1: (fl.anos[0].servico + fl.anos[0].opex) / 12, comp3: (a3.servico + a3.opex) / 12,
      dscr: en.linhas.slice(0, 3).map(function (l) { return { ano: l.ano, v: l.dscrSem, tdc: l.dscrCom }; }), dlEbitda: en.dlEbitdaProj, inc3: a3.inc };
  }
  /* Com × sem PACS Sectra: as três alternativas no cenário atual e no oposto (a RM fica como está) */
  function cenariosPACS(m, Motor, BASE, out) {
    var on = pacsOn(m), m2 = clone(m); m2.propria.pacs_incluir = on ? 'nao' : 'sim';
    var r2 = calcular(m2, Motor, BASE, { leve: true });
    var res = function (r) { var o = {}; ['B', 'C', 'D'].forEach(function (k) { var fl = r['fl' + k]; o[k] = { vplEnt: fl.vplEnt, vpl: fl.vpl, tir: fl.tir, pb: fl.pb, acumEnt: fl.acumEnt, capex0: fl.capex0 }; }); o.resultado = r.cen.prop.resultado; o.ganhoMes = r.ganhoMes; o.pacsMes = r.cen.prop.pacs; o.selId = r.sel.id; o.dscr = entidade(r === out ? m : m2, r.sel, r.flSel).linhas.slice(0, 2).map(function (l) { return { ano: l.ano, v: l.dscrSem }; }); return o; };
    var cur = res(out), alt = res(r2), com = on ? cur : alt, sem = on ? alt : cur, d = {};
    ['B', 'C', 'D'].forEach(function (k) { d[k] = com[k].vplEnt - sem[k].vplEnt; });
    var ord = function (x) { return ['B', 'C', 'D'].sort(function (a, b) { return x[b].vplEnt - x[a].vplEnt; }); };
    return { on: on, com: com, sem: sem, delta: d, melhorCom: ord(com)[0], melhorSem: ord(sem)[0], exames: (on ? out : r2).cen.prop.exPacs, exame: num(m.propria.pacs_exame), impl: num(m.propria.pacs_impl) };
  }
  function cenariosRM(m, Motor, BASE, out) {
    var on = rmOn(m), m2 = clone(m); m2.rm = m2.rm || {}; m2.rm.incluir = on ? 'nao' : 'sim';
    var r2 = calcular(m2, Motor, BASE, { leve: true }), mc = on ? m : m2;
    var cur = { B: resumoAlt(m, out.B, out.flB), C: resumoAlt(m, out.C, out.flC), D: resumoAlt(m, out.D, out.flD) };
    var alt = { B: resumoAlt(m2, r2.B, r2.flB), C: resumoAlt(m2, r2.C, r2.flC), D: resumoAlt(m2, r2.D, r2.flD) };
    var com = on ? cur : alt, sem = on ? alt : cur, ids = ['B', 'C', 'D'];
    var vpls = function (mm) { var r = calcular(mm, Motor, BASE, { leve: true }); return { B: r.flB.vplEnt, C: r.flC.vplEnt, D: r.flD.vplEnt }; };
    /* VPL para o hospital é linear no volume e no preço da RM (sem tributos): dois pontos bastam */
    var v0 = num(mc.rm.exames_mes), dv = 100, mv = clone(mc); mv.rm.exames_mes = v0 + dv; var a0 = { B: com.B.vplEnt, C: com.C.vplEnt, D: com.D.vplEnt }, av = vpls(mv);
    var itC = (mc.equip.C || []).filter(isRM)[0], p0 = itC ? num(itC.preco) : 0, f = 0.9, mp = clone(mc);
    ['B', 'C'].forEach(function (k) { (mp.equip[k] || []).forEach(function (it) { if (isRM(it)) it.preco = num(it.preco) * f; }); });
    var ap = p0 ? vpls(mp) : null, t0 = num(mc.rm.ticket), dt = 100, mt = clone(mc); mt.rm.ticket = t0 + dt; var at = vpls(mt), eq = {};
    ids.forEach(function (k) {
      var sv = (av[k] - a0[k]) / dv, sp = ap ? (ap[k] - a0[k]) / (p0 * (f - 1)) : 0, st = (at[k] - a0[k]) / dt, alvo = sem[k].vplEnt;
      eq[k] = { delta: com[k].vplEnt - sem[k].vplEnt, porExame: sv, porReal: sp, porTicket: st, volume: sv > 0 ? v0 + (alvo - a0[k]) / sv : null, preco: sp < 0 ? p0 + (alvo - a0[k]) / sp : null, ticket: st > 0 ? t0 + (alvo - a0[k]) / st : null };
    });
    return { on: on, com: com, sem: sem, eq: eq, v0: v0, p0: p0, t0: t0, cap: capacidadeRM(mc) };
  }

  /* ---------- Sensibilidade (tornado sobre o VPL do projeto, alternativa selecionada) ---------- */
  function sensibilidade(m, Motor, BASE, alavancas) {
    var L = { leve: true }, basev = calcular(m, Motor, BASE, L).flSel.vpl, out = [];
    alavancas.forEach(function (a) {
      var lo = clone(m), hi = clone(m); a.set(lo, a.lo); a.set(hi, a.hi);
      out.push({ nome: a.nome, lo: calcular(lo, Motor, BASE, L).flSel.vpl - basev, hi: calcular(hi, Motor, BASE, L).flSel.vpl - basev, loTxt: a.loTxt, hiTxt: a.hiTxt });
    });
    out.sort(function (x, y) { return Math.max(Math.abs(y.lo), Math.abs(y.hi)) - Math.max(Math.abs(x.lo), Math.abs(x.hi)); });
    return { base: basev, itens: out };
  }

  return { num: num, clone: clone, npv: npv, irr: irr, payback: payback, dreMensal: dreMensal, capexDe: capexDe, fluxo: fluxo, altB: altB, altC: altC, altD: altD, entidade: entidade, calcular: calcular, sensibilidade: sensibilidade, taxaImplicita: taxaImplicita, capacidadeTC: capacidadeTC,
    mesesAno: mesesAno, mesesDesde: mesesDesde, rmOn: rmOn, pacsOn: pacsOn, susModo: susModo, susAtualOn: susAtualOn, susAteOn: susAteOn, pacsEx: pacsEx, pacsImpl: pacsImpl, isRM: isRM, ativos: ativos, rmMensal: rmMensal, rmAno: rmAno, capacidadeRM: capacidadeRM, iniRM: iniRM, aprovRM: aprovRM, anoRM: anoRM, anoEqRM: anoEqRM, mesRMStr: mesRMStr, susUpside: susUpside, reajAno: reajAno, ipcaAno: ipcaAno, manutPacote: manutPacote, locacao: locacao, cotacaoVmi: cotacaoVmi, taxaLocImplicita: taxaLocImplicita, custoPossuirC: custoPossuirC, prazosD: prazosD, PRAZOS_D: PRAZOS_D };
})();
if (typeof module !== 'undefined') module.exports = Engine;
