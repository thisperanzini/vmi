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

  /* ---------- DRE mensal de uma configuração (EMG ou Própria) ---------- */
  function dreMensal(m, fator, tipo, anoProj) {
    var b = m.base, p = m.propria, c = m.cenario;
    var reaj = Math.pow(1 + num(c.reajuste_aa), Math.max(0, anoProj - 1));
    var exames = num(b.exames) / num(b.meses) * fator;
    var rb = exames * num(b.ticket) * reaj;
    var glosa = rb * num(b.glosa_pct);
    var rl = rb - glosa;
    var d = { exames: exames, rb: rb, glosa: glosa, rl: rl };
    if (tipo === 'emg') {
      d.matmed = rl * num(b.matmed_pct);
      d.rep_med = rl * num(b.rep_med_pct);
      d.rep_mat = rl * num(b.rep_mat_pct);
      d.rep_bio = rl * num(b.rep_bio_pct);
      d.rep_sala = rl * num(b.rep_sala_pct);
      d.manut = 0; d.rispacs = 0;
    } else {
      d.matmed = rl * num(p.matmed_pct);
      d.rep_med = rl * num(p.rep_med_pct);
      d.rep_mat = num(p.mat_elimina) ? 0 : rl * num(b.rep_mat_pct);
      d.rep_bio = num(p.bio_elimina) ? 0 : rl * num(b.rep_bio_pct);
      d.rep_sala = num(p.sala_elimina) ? 0 : rl * num(b.rep_sala_pct);
      var manutOn = anoProj >= num(p.manut_inicio_ano);
      d.manut = manutOn ? (num(p.manut_tc) + num(p.manut_outros) + (num(p.tubo_incluir) ? num(p.tubo) : 0)) * num(p.manut_fator == null ? 1 : p.manut_fator) * reaj : 0;
      d.rispacs = num(p.rispacs_mes) * reaj;
    }
    d.repasse = d.rep_med + d.rep_mat + d.rep_bio + d.rep_sala;
    d.cv = d.matmed + d.repasse;
    d.mc = rl - d.cv;
    d.cf_dir = num(b.cf_dir_mes) * reaj;
    d.cf_ind = num(b.cf_ind_mes) * reaj;
    d.margem_direta = d.mc - d.cf_dir - d.manut - d.rispacs;
    d.resultado = d.margem_direta - d.cf_ind; /* = EBITDA mensal */
    return d;
  }

  /* ---------- Investimento ---------- */
  function capexDe(itens) {
    var tot = 0, fin = 0, parcelas = 0;
    (itens || []).forEach(function (it) { var v = num(it.qtd) * num(it.preco); tot += v; if (it.fin !== false) fin += v; parcelas += num(it.qtd) * num(it.parcela); });
    return { total: tot, financiavel: fin, parcelaMes: parcelas };
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
    var capex = alt.capex + num(m.propria.rispacs_impl);
    var dep = capex / vida;
    var anos = [], proj = [-capex], ent = [-(capex - (alt.capexFin || 0)) - (alt.custosIni || 0)];
    var acumP = -capex, acumE = ent[0];
    for (var t = 1; t <= H; t++) {
      var fator = (1 + num(c.volume_var)) * Math.pow(1 + num(c.cresc_aa), Math.max(0, t - 2));
      var frac = t === 1 ? (12 - ini) / 12 : 1;
      var e = dreMensal(m, fator, 'emg', t), p = dreMensal(m, fator, 'propria', t);
      var ebitdaEmg = e.resultado * 12, ebitdaProp = p.resultado * 12;
      var inc = (ebitdaProp - ebitdaEmg) * frac;
      var depAno = t <= vida ? dep : 0;
      var ebit = inc - depAno;
      var trib = Math.max(0, ebit) * num(f.tributos);
      var residual = (t === H && num(f.residual) > 0) ? Math.max(0, capex - dep * Math.min(H, vida)) * num(f.residual) : 0;
      var fcp = inc - trib + residual;
      var serv = (alt.servico && alt.servico[t]) || 0;
      var fce = inc - trib - serv + residual;
      acumP += fcp; acumE += fce;
      anos.push({ t: t, ano: num(f.ano_inicio) + t - 1, fator: fator, frac: frac, exames: p.exames * 12, rl: p.rl * 12, ebitdaEmg: ebitdaEmg, ebitdaProp: ebitdaProp, inc: inc, dep: depAno, ebit: ebit, trib: trib, residual: residual, fcp: fcp, servico: serv, juros: (alt.jurosAno && alt.jurosAno[t]) || 0, fce: fce, acumP: acumP, acumE: acumE, dscr: serv > 0 ? inc / serv : null, dre: { emg: e, prop: p } });
      proj.push(fcp); ent.push(fce);
    }
    var r = num(f.desconto);
    var dscrs = anos.map(function (a) { return a.dscr; }).filter(function (x) { return x != null; });
    var pagos = 0; Object.keys(alt.servico || {}).forEach(function (k) { pagos += alt.servico[k]; });
    return {
      anos: anos, capex: capex, proj: proj, ent: ent,
      vpl: npv(proj, r), tir: irr(proj), pb: payback(proj, 0), pbDesc: payback(proj, r),
      vplEnt: npv(ent, r), tirEnt: irr(ent), pbEnt: payback(ent, 0), acumEnt: acumE, acumProj: acumP,
      ir: (function () { var vp = 0; for (var i = 1; i < proj.length; i++) vp += proj[i] / Math.pow(1 + r, i); return capex ? vp / capex : null; })(),
      dscrMin: dscrs.length ? Math.min.apply(null, dscrs) : null, pagos: pagos
    };
  }

  /* ---------- Alternativa B: parcelas fixas informadas pelos fornecedores (HFS/GE) ---------- */
  function altB(m) {
    var itens = m.equip.B, cx = capexDe(itens), rows = [], anoIni = num(m.fin.ano_inicio), mIni = num(m.fin.inicio_op_mes) || 0;
    var n = num(m.equip.B_n) || 60;
    /* parcela constante por item; taxa implícita por item para exibição */
    var implic = itens.map(function (it) { var P = num(it.preco), pm = num(it.parcela), nn = num(it.n) || n; var i = taxaImplicita(P, pm, nn); return { id: it.id, taxaMes: i, taxaAno: i == null ? null : (Math.pow(1 + i, 12) - 1) * 100, totalPago: pm * nn * num(it.qtd), alerta: pm * nn < P ? 'Parcelas somam menos que o valor à vista' : (i === 0 ? 'Sem juros declarados' : '') }; });
    for (var t = 1; t <= n; t++) { var mm = mIni + t; var y = anoIni + Math.floor((mm - 1) / 12); rows.push({ t: t, y: y, m: ((mm - 1) % 12) + 1, parcela: cx.parcelaMes, juros: 0, amort: 0, saldo: null }); }
    var juros = cx.parcelaMes * n - cx.financiavel;
    return { id: 'B', capex: cx.total, capexFin: cx.financiavel, custosIni: 0, servico: servicoPorAnoProj(rows, anoIni), rows: rows, parcela: cx.parcelaMes, n: n, pagos: cx.parcelaMes * n, juros: juros, implic: implic, cetAno: (function () { var i = taxaImplicita(cx.financiavel, cx.parcelaMes, n); return i == null ? null : (Math.pow(1 + i, 12) - 1) * 100; })() };
  }
  function taxaImplicita(P, pm, n) {
    if (!P || !pm || !n) return null;
    if (Math.abs(pm * n - P) < 1e-6) return 0;
    if (pm * n < P) return null;
    var lo = 0, hi = 1;
    for (var k = 0; k < 200; k++) { var mid = (lo + hi) / 2; var pv = pm * (1 - Math.pow(1 + mid, -n)) / mid; if (pv > P) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }

  /* ---------- Alternativa C: pacote VMI/Alfamed financiado pelo Motor (ferramenta Financiamento VMI) ---------- */
  function altC(m, Motor, BASE) {
    var itens = m.equip.C, cx = capexDe(itens), ac = m.altC, cl = m.cliente;
    var cfiInfo = (function () { var com = 0, sem = 0, semItens = []; itens.forEach(function (i) { if (i.fin === false) return; var v = num(i.qtd) * num(i.preco); if (String(i.cfi || '').trim()) com += v; else { sem += v; semItens.push(i.nome); } }); return { com: com, sem: sem, semItens: semItens, todos: sem === 0 && com > 0 }; })();
    var caso = { cliente: { natureza: cl.natureza, uf: cl.uf, rob: num(cl.rob) || null, porte_decl: cl.porte_decl || null },
      operacao: { valor_equip: cx.financiavel, valor_obra: num(ac.valor_obra), valor_financiar: ac.valor_financiar === '' || ac.valor_financiar == null ? null : num(ac.valor_financiar), prazo: num(ac.prazo) || 120, carencia: num(ac.carencia) || 0, inicio: ac.inicio || (num(m.fin.ano_inicio) + '-03'), sistema: ac.sistema || 'SAC', carModo: ac.carModo || 'pagos', equipamento: { cfi: cfiInfo.todos ? 'informado' : (num(ac.cfi_presumido) ? 'presumido' : ''), origem: 'nacional' } },
      flags: clone(cl.flags || {}), honorario_pct: num(ac.honorario_pct) };
    var av = Motor.avaliar(caso, BASE);
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
    var out = { id: 'C', capex: cx.total, capexFin: 0, custosIni: 0, servico: {}, jurosAno: {}, rows: [], av: av, escolha: escolha, caso: caso, cx: cx, cfi: cfiInfo };
    if (escolha) {
      var s = escolha.sim;
      out.capexFin = s.P; out.custosIni = s.iof + s.tarifa + s.honor; out.rows = s.rows; out.servico = servicoPorAnoProj(s.rows, anoIni);
      var jo = {}; s.rows.forEach(function (r) { var k = Math.max(1, r.y - anoIni + 1); jo[k] = (jo[k] || 0) + r.juros; }); out.jurosAno = jo;
      out.parcela = s.parcelaPosCarencia; out.primeira = s.primeiraParcela; out.n = s.n; out.c = s.c; out.pagos = s.pagos; out.juros = s.juros; out.cetAno = s.cet; out.taxaAno1 = s.taxaAno1; out.iof = s.iof; out.avisos = s.avisos;
    }
    return out;
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
    var tc = num(v.tc26) * (1 + num(m.cenario.volume_var));
    return { cap: cap, tc: tc, ocup: cap ? tc / cap : null };
  }

  /* ---------- Cálculo completo ---------- */
  function calcular(m, Motor, BASE) {
    var B = altB(m), C = altC(m, Motor, BASE);
    var A0 = { id: 'A', capex: 0, capexFin: 0, servico: {} };
    var flB = fluxo(m, B), flC = fluxo(m, C);
    var base = { emg: dreMensal(m, 1, 'emg', 2), prop: dreMensal(m, 1, 'propria', 2), prop1: dreMensal(m, 1, 'propria', 1) };
    var fator = 1 + num(m.cenario.volume_var);
    var cen = { emg: dreMensal(m, fator, 'emg', 2), prop: dreMensal(m, fator, 'propria', 2) };
    var sel = m.fin.alternativa === 'B' ? B : C, flSel = m.fin.alternativa === 'B' ? flB : flC;
    var ent = entidade(m, sel, flSel);
    return { B: B, C: C, flB: flB, flC: flC, base: base, cen: cen, sel: sel, flSel: flSel, ent: ent, tc: capacidadeTC(m),
      ganhoMes: cen.prop.resultado - cen.emg.resultado, ganhoMesComParcela: cen.prop.resultado - cen.emg.resultado - (sel.parcela || 0) };
  }

  /* ---------- Sensibilidade (tornado sobre o VPL do projeto, alternativa selecionada) ---------- */
  function sensibilidade(m, Motor, BASE, alavancas) {
    var basev = calcular(m, Motor, BASE).flSel.vpl, out = [];
    alavancas.forEach(function (a) {
      var lo = clone(m), hi = clone(m); a.set(lo, a.lo); a.set(hi, a.hi);
      out.push({ nome: a.nome, lo: calcular(lo, Motor, BASE).flSel.vpl - basev, hi: calcular(hi, Motor, BASE).flSel.vpl - basev, loTxt: a.loTxt, hiTxt: a.hiTxt });
    });
    out.sort(function (x, y) { return Math.max(Math.abs(y.lo), Math.abs(y.hi)) - Math.max(Math.abs(x.lo), Math.abs(x.hi)); });
    return { base: basev, itens: out };
  }

  return { num: num, clone: clone, npv: npv, irr: irr, payback: payback, dreMensal: dreMensal, capexDe: capexDe, fluxo: fluxo, altB: altB, altC: altC, entidade: entidade, calcular: calcular, sensibilidade: sensibilidade, taxaImplicita: taxaImplicita, capacidadeTC: capacidadeTC };
})();
if (typeof module !== 'undefined') module.exports = Engine;
