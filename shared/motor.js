/* Motor determinístico: porte, elegibilidade, taxas, cronograma, CET, ROI.
   Funções puras: mesma entrada, mesma saída. Sem chamadas externas. */
var Motor = (function () {
  "use strict";
  var UF_N = ["AC", "AM", "AP", "PA", "RO", "RR", "TO"];
  var UF_NE = ["MA", "PI", "CE", "RN", "PB", "PE", "AL", "SE", "BA"];
  var PORTE_NOME = { micro: "Microempresa", pequena: "Pequena empresa", media: "Média empresa", grande: "Grande empresa" };

  function num(v) { if (v === null || v === undefined || v === "") return null; var n = Number(String(v).replace(/\s/g, "")); return isFinite(n) ? n : null; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function porteBNDES(rob, base) {
    if (rob == null) return null;
    var f = base.porte.bndes;
    for (var i = 0; i < f.length; i++) if (rob <= f[i].max) return f[i].p;
    return "grande";
  }
  function faixaFundos(rob, base) {
    if (rob == null) return null;
    var f = base.porte.fundos;
    for (var i = 0; i < f.length; i++) if (rob <= f[i].max) return f[i];
    return f[f.length - 1];
  }
  function regiaoNNE(uf) { return UF_N.indexOf(uf) >= 0 || UF_NE.indexOf(uf) >= 0; }

  /* Caminhos anuais a partir do Focus (mantém o último ano). */
  function ipcaAno(ano, base) {
    var p = base.macro.focus.ipca, anos = Object.keys(p).map(Number).sort();
    if (p[ano] != null) return p[ano];
    return ano < anos[0] ? p[anos[0]] : p[anos[anos.length - 1]];
  }
  function selicMediaAno(ano, base) {
    var f = base.macro.focus.selic_fim, anos = Object.keys(f).map(Number).sort();
    var ini = ano <= anos[0] ? base.macro.selic.v : (f[ano - 1] != null ? f[ano - 1] : f[anos[anos.length - 1]]);
    var fim = f[ano] != null ? f[ano] : f[anos[anos.length - 1]];
    return (ini + fim) / 2;
  }
  function bcb(id, base) { var x = base.macro.bcb.filter(function (b) { return b.id === id; })[0]; return x ? x.v : null; }

  /* Custo financeiro anual (% a.a.) para um ano-calendário e cenário. */
  function custoFinanceiro(custo, ano, cen, ctx) {
    var b = ctx.base, m = b.macro;
    switch (custo) {
      case "PMm": return { r: m.pmm.v, rot: "Pré FAT MPME (PMm) " + fmtP(m.pmm.v), fixo: true };
      case "Pm": return { r: m.pm.v, rot: "Pré FAT (Pm) " + fmtP(m.pm.v), fixo: true };
      case "TLP": var ip = ipcaAno(ano, b); return { r: ((1 + ip / 100) * (1 + m.tlp_jm.v / 100) - 1) * 100, rot: "TLP = IPCA + " + fmtP(m.tlp_jm.v), fixo: false };
      case "TR": return { r: (Math.pow(1 + m.tr_am.v / 100, 12) - 1) * 100, rot: "TR (" + fmtP(m.tr_am.v, 4) + " a.m.)", fixo: false };
      case "SELIC": return { r: selicMediaAno(ano, b), rot: "Selic (Focus)", fixo: false };
      case "EMP_MI": var e = b.empirico.linhas.filter(function (l) { return /Mais Inova/.test(l.recorte); })[0];
        var v = cen === "min" ? e.p25 : cen === "max" ? e.p75 : e.med; return { r: v, rot: "Taxa fixa total observada " + fmtP(v), fixo: true };
      case "FIXA_FIIS": return { r: b.fiis_teto, rot: "Teto FIIS indireto " + fmtP(b.fiis_teto), fixo: true };
      case "TFC_FNE": case "TFC_FNO": case "TFC_FCO":
        var fundo = custo.slice(4), fx = ctx.faixaFundos || b.porte.fundos[3];
        var par = b.tfc[fundo][fx.fp]; var t = cen === "max" ? par[1] : par[0];
        return { r: t, rot: "TFC pré " + fundo + (cen === "max" ? " sem bônus " : " com bônus ") + fmtP(t), fixo: true };
      default:
        if (custo.indexOf("BCB_") === 0) { var x = bcb(custo.slice(4), b); return { r: x, rot: "Média BCB " + fmtP(x), fixo: true }; }
        return { r: null, rot: "—", fixo: true };
    }
  }

  function spreadsDaLinha(linha, cen, ctx) {
    return (linha.spreads || []).map(function (s) {
      var v = cen === "min" ? s.min : cen === "max" ? s.max : s.base;
      if (s.nne != null && ctx.nne && s.nome === "Taxa do BNDES") v = s.nne;
      if (s.grande != null && ctx.porte === "grande" && s.nome === "Taxa do BNDES") v = s.grande;
      if (ctx.override && ctx.override[s.nome] != null) v = ctx.override[s.nome];
      return { nome: s.nome, v: v };
    });
  }

  /* Taxa nominal anual composta: (1+CF)×Π(1+spread)−1 */
  function taxaAnual(linha, custo, ano, cen, ctx) {
    var cf = custoFinanceiro(custo, ano, cen, ctx);
    if (cf.r == null) return null;
    var f = 1 + cf.r / 100;
    spreadsDaLinha(linha, cen, ctx).forEach(function (s) { f *= 1 + s.v / 100; });
    return (f - 1) * 100;
  }

  function addMes(ini, k) { var m = ini.m - 1 + k; return { y: ini.y + Math.floor(m / 12), m: (m % 12 + 12) % 12 + 1 }; }

  /* Cronograma mensal. o: {P, n, c, sistema:'SAC'|'Price', carencia:'pagos'|'capitalizados', ini:{y,m}, taxaAno(y)} */
  function cronograma(o) {
    var rows = [], saldo = o.P, m = o.n - o.c, amortSAC = null;
    for (var t = 1; t <= o.n; t++) {
      var dt = addMes(o.ini, t), ra = o.taxaAno(dt.y), i = Math.pow(1 + ra / 100, 1 / 12) - 1;
      var juros = saldo * i, amort = 0, parcela = 0, saldoIni = saldo;
      if (t <= o.c) {
        if (o.carencia === "capitalizados") { saldo += juros; parcela = 0; }
        else parcela = juros;
      } else {
        var rest = o.n - t + 1;
        if (o.sistema === "SAC") { if (amortSAC == null) amortSAC = saldo / m; amort = Math.min(amortSAC, saldo); parcela = amort + juros; }
        else { parcela = i === 0 ? saldo / rest : saldo * i / (1 - Math.pow(1 + i, -rest)); amort = parcela - juros; }
        saldo -= amort;
      }
      if (Math.abs(saldo) < 1e-6) saldo = 0;
      rows.push({ t: t, y: dt.y, m: dt.m, taxa: ra, saldoIni: saldoIni, juros: (t <= o.c && o.carencia === "capitalizados") ? 0 : juros, jurosCap: (t <= o.c && o.carencia === "capitalizados") ? juros : 0, amort: amort, parcela: parcela, saldo: saldo });
    }
    return rows;
  }

  /* IOF-crédito PJ: 0,0082% ao dia sobre cada amortização de principal (até 365 dias) + 0,38% fixo */
  function calcIOF(rows, P, base) {
    var io = base.macro.iof, totAm = rows.reduce(function (s, r) { return s + r.amort; }, 0) || 1, v = 0;
    rows.forEach(function (r) { if (r.amort > 0) { var princ = r.amort * P / totAm; v += princ * io.diaria / 100 * Math.min(Math.round(r.t * 30.4167), 365); } });
    return v + P * io.adicional / 100;
  }

  function irr(flows) {
    var lo = -0.99, hi = 1, f = function (r) { var s = 0; for (var k = 0; k < flows.length; k++) s += flows[k] / Math.pow(1 + r, k); return s; };
    var flo = f(lo), fhi = f(hi);
    if (flo * fhi > 0) return null;
    for (var it = 0; it < 200; it++) { var mid = (lo + hi) / 2, fm = f(mid); if (Math.abs(fm) < 1e-7) return mid; if (flo * fm < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; } }
    return (lo + hi) / 2;
  }
  function aa(rm) { return rm == null ? null : (Math.pow(1 + rm, 12) - 1) * 100; }

  function fmtP(v, d) { if (v == null || !isFinite(v)) return "—"; return v.toLocaleString("pt-BR", { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d }) + "%"; }
  function fmtR(v) { if (v == null || !isFinite(v)) return "—"; return "R$ " + Math.round(v).toLocaleString("pt-BR"); }

  /* Contexto do caso */
  function contexto(caso, base) {
    var rob = num(caso.cliente && caso.cliente.rob);
    var porte = porteBNDES(rob, base) || (caso.cliente && caso.cliente.porte_decl) || null;
    var uf = (caso.cliente && caso.cliente.uf || "").toUpperCase();
    var op = caso.operacao || {};
    var eq = op.equipamento || {};
    var invest = (num(op.valor_equip) || 0) + (num(op.valor_obra) || 0);
    var fin = num(op.valor_financiar); if (fin == null) fin = invest;
    return {
      base: base, rob: rob, porte: porte, porteInferido: rob == null, uf: uf, nne: regiaoNNE(uf),
      faixaFundos: faixaFundos(rob, base) || (porte === "grande" ? base.porte.fundos[5] : porte === "micro" || porte === "pequena" ? base.porte.fundos[1] : base.porte.fundos[3]),
      natureza: (caso.cliente && caso.cliente.natureza) || "privada", eq: eq, invest: invest, valorEquip: num(op.valor_equip) || 0, valorObra: num(op.valor_obra) || 0,
      fin: fin, prazo: num(op.prazo) || 60, carencia: num(op.carencia) || 0, flags: caso.flags || {}, honor: num(caso.honorario_pct) == null ? 2 : num(caso.honorario_pct),
      ini: op.inicio ? { y: +op.inicio.slice(0, 4), m: +op.inicio.slice(5, 7) } : { y: 2026, m: 11 }
    };
  }

  /* Elegibilidade: retorna {ok, bloqueios[], avisos[], porques[]} */
  function elegibilidade(linha, ctx) {
    var e = linha.elig || {}, B = [], A = [], P = [], f = ctx.flags;
    if (linha.status === "encerrada" && !(e.condicao && f[e.condicao.campo])) B.push("Linha encerrada para novas propostas" + (e.condicao ? " (só para quem já tem: " + e.condicao.rotulo.toLowerCase() + ")" : ""));
    if (e.condicao && linha.status !== "encerrada") {
      if (!f[e.condicao.campo]) B.push("Condição não marcada no caso: " + e.condicao.rotulo);
      else P.push("Condição atendida: " + e.condicao.rotulo);
    }
    if (e.natureza && e.natureza.indexOf(ctx.natureza) < 0) B.push("Natureza jurídica não atendida (" + (ctx.natureza === "filantropica" ? "filantrópica" : "privada com fins lucrativos") + ")");
    else if (e.natureza) P.push("Natureza jurídica aceita");
    if (e.portes) {
      if (!ctx.porte) A.push("Porte não informado; preencha a receita bruta anual");
      else if (e.portes.indexOf(ctx.porte) < 0) B.push("Porte fora da linha: " + PORTE_NOME[ctx.porte]);
      else P.push(PORTE_NOME[ctx.porte] + (ctx.rob != null ? " (receita bruta " + fmtR(ctx.rob) + ")" : " (declarado)"));
    }
    if (e.rob_min && ctx.rob != null && ctx.rob < e.rob_min) B.push("Receita abaixo do mínimo da linha (" + fmtR(e.rob_min) + ")");
    if (e.ufs) {
      var okUF = e.ufs.indexOf(ctx.uf) >= 0 || (e.sudene && (ctx.uf === "MG" || ctx.uf === "ES") && f.sudene);
      if (!ctx.uf) A.push("UF não informada");
      else if (!okUF) B.push("Fora da área de atuação (" + ctx.uf + ")");
      else P.push("UF " + ctx.uf + " dentro da área da linha");
    } else P.push("Abrangência nacional");
    var origem = ctx.eq.origem || (ctx.eq.cfi ? "nacional" : null);
    if (e.exige_cfi) {
      if (!ctx.eq.cfi) B.push("Equipamento sem código FINAME (CFI): exige bem novo, nacional e credenciado");
      else if (/^\d+$/.test(String(ctx.eq.cfi))) P.push("Equipamento credenciado no BNDES (CFI " + ctx.eq.cfi + ")");
      else { P.push("CFI tratado como existente (" + ctx.eq.cfi + (ctx.eq.cfi_previsao ? ", previsão " + ctx.eq.cfi_previsao : "") + ")"); A.push("CFI ainda não emitido: a linha só contrata com o código publicado no Catálogo CFI; a simulação vale como premissa"); }
    }
    if (origem === "importado") {
      if (e.importado === "nao") B.push("Linha não aceita equipamento importado");
      else if (e.importado === "sem_similar") { if (f.sem_similar) P.push("Importado sem similar nacional (comprovação marcada)"); else B.push("Importado só se sem similar nacional (marque no caso, com comprovação)"); }
      else if (e.importado === "a_confirmar") A.push("Regra para importado não publicada: confirmar com o operador");
    }
    if (e.valor_min && ctx.fin < e.valor_min) B.push("Valor abaixo do mínimo (" + fmtR(e.valor_min) + ")");
    if (e.valor_max && ctx.fin > e.valor_max) B.push("Valor acima do máximo (" + fmtR(e.valor_max) + ")");
    if (ctx.valorObra > 0 && linha.cond && linha.cond.obras === false) A.push("Obra/instalação não é financiável nesta linha; entra como recurso próprio ou linha à parte");
    if (linha.status === "informativa") A.push("Linha sem taxa publicada no mês: não entra no ranking");
    return { ok: B.length === 0, bloqueios: B, avisos: A, porques: P };
  }

  /* Simula uma linha para um custo e cenário. */
  function simular(linha, custo, cen, ctx, opts) {
    opts = opts || {};
    var c = linha.cond || {}, avisos = [];
    var partMax = c.part != null ? c.part : 100;
    if (c.part_por_porte && ctx.faixaFundos) { var pp = c.part_por_porte[ctx.faixaFundos.p]; if (pp != null) partMax = pp; }
    var baseFin = (linha.cond && linha.cond.obras === false) ? ctx.valorEquip : ctx.invest;
    if (!baseFin) baseFin = ctx.invest;
    var P = ctx.fin;
    if (P > baseFin * partMax / 100 + 0.5) { P = baseFin * partMax / 100; avisos.push("Financiamento limitado a " + partMax + "% do item financiável: " + fmtR(P)); }
    var n = opts.prazo || ctx.prazo, car = opts.carencia != null ? opts.carencia : ctx.carencia;
    if (c.prazo && n > c.prazo) { avisos.push("Prazo reduzido ao máximo da linha (" + c.prazo + " meses)"); n = c.prazo; }
    if (!c.prazo) avisos.push("Prazo máximo não publicado: confirmar com o operador");
    if (c.prazo_min && n < c.prazo_min) { avisos.push("Prazo elevado ao mínimo legal (" + c.prazo_min + " meses)"); n = c.prazo_min; }
    if (c.carencia != null && car > c.carencia) { avisos.push("Carência reduzida ao máximo da linha (" + c.carencia + " meses)"); car = c.carencia; }
    if (car >= n) car = Math.max(0, n - 1);
    var sistema = opts.sistema || "SAC", carModo = opts.carModo || "pagos";
    var rows = cronograma({ P: P, n: n, c: car, sistema: sistema, carencia: carModo, ini: ctx.ini, taxaAno: function (y) { return taxaAnual(linha, custo, y, cen, ctx); } });
    var iof = linha.iof === "regular" ? calcIOF(rows, P, ctx.base) : 0;
    if (linha.iof === "regular" && ctx.natureza === "filantropica") avisos.push("IOF calculado; filantrópica pode ter não incidência (Dec. 6.306/2007, art. 2º, §3º, III)");
    var tarifa = P * (linha.tarifa || 0) / 100;
    var honor = linha.benchmark ? 0 : P * ctx.honor / 100;
    var fl = [P - iof - tarifa]; rows.forEach(function (r) { fl.push(-r.parcela); });
    var cet = aa(irr(fl));
    var fl2 = fl.slice(); fl2[0] -= honor;
    var tot = aa(irr(fl2));
    var juros = rows.reduce(function (s, r) { return s + r.juros; }, 0);
    var pagos = rows.reduce(function (s, r) { return s + r.parcela; }, 0);
    var ano1 = taxaAnual(linha, custo, ctx.ini.y + (ctx.ini.m === 12 ? 1 : 0), cen, ctx);
    var cf = custoFinanceiro(custo, ctx.ini.y + 1, cen, ctx);
    var primeira = rows.filter(function (r) { return r.parcela > 0; })[0];
    var posCar = rows[car] || rows[rows.length - 1];
    return {
      linha: linha, custo: custo, cen: cen, P: P, n: n, c: car, sistema: sistema, carModo: carModo, rows: rows, iof: iof, tarifa: tarifa, honor: honor,
      cet: cet, custoTotal: tot, juros: juros, pagos: pagos, taxaAno1: ano1, cfRot: cf.rot, spreads: spreadsDaLinha(linha, cen, ctx),
      parcelaPosCarencia: posCar ? posCar.parcela : null, primeiraParcela: primeira ? primeira.parcela : null, avisos: avisos,
      servicoAno: servicoPorAno(rows)
    };
  }
  function servicoPorAno(rows) {
    var o = {}; rows.forEach(function (r) { var k = Math.ceil(r.t / 12); o[k] = (o[k] || 0) + r.parcela; }); return o;
  }

  /* Avalia todas as linhas e ranqueia por custo total (com honorário), cenário base. */
  function avaliar(caso, base) {
    var ctx = contexto(caso, base), out = [];
    base.linhas.forEach(function (l) {
      var el = elegibilidade(l, ctx), melhor = null, alternativas = [];
      if (l.custos && l.custos.length && l.status !== "informativa") {
        l.custos.forEach(function (cu) {
          var s = simular(l, cu, "base", ctx, { sistema: (caso.operacao || {}).sistema, carModo: (caso.operacao || {}).carModo });
          if (s.custoTotal == null) return;
          s.faixa = { min: simular(l, cu, "min", ctx, { sistema: (caso.operacao || {}).sistema, carModo: (caso.operacao || {}).carModo }).custoTotal, max: simular(l, cu, "max", ctx, { sistema: (caso.operacao || {}).sistema, carModo: (caso.operacao || {}).carModo }).custoTotal };
          alternativas.push(s);
          if (!melhor || s.custoTotal < melhor.custoTotal) melhor = s;
        });
      }
      var cond = !el.ok && el.bloqueios.length > 0 && el.bloqueios.every(function (b) { return /^Condição não marcada/.test(b); });
      out.push({ linha: l, el: el, sim: melhor, alternativas: alternativas, condicional: cond });
    });
    var ranq = out.filter(function (x) { return x.el.ok && x.sim && !x.linha.benchmark; }).sort(function (a, b) { return a.sim.custoTotal - b.sim.custoTotal || b.sim.n - a.sim.n; });
    ranq.forEach(function (x, i) { x.rank = i + 1; });
    var bench = base.macro.bcb.filter(function (b) { return b.id === "aq_bens"; })[0];
    var mercado = out.filter(function (x) { return x.linha.benchmark && x.sim; });
    var condicionais = out.filter(function (x) { return x.condicional && x.sim; }).sort(function (a, b) { return a.sim.custoTotal - b.sim.custoTotal; });
    return { ctx: ctx, todas: out, ranking: ranq, mercado: mercado, condicionais: condicionais, benchmark: bench };
  }

  /* ---------- Indicadores financeiros ---------- */
  function indicadores(ex) {
    if (!ex) return null;
    var g = function (k) { return num(ex[k]); };
    var ac = g("ativo_circulante"), pc = g("passivo_circulante"), rlp = g("realizavel_lp") || 0, pnc = g("passivo_nao_circulante") || 0, at = g("ativo_total"), pl = g("patrimonio_liquido");
    var ebit = g("ebit"), da = g("depreciacao") || 0, ebitda = ebit != null ? ebit + da : g("ebitda");
    var div = (g("emprestimos_cp") || 0) + (g("emprestimos_lp") || 0), caixa = g("caixa") || 0, rb = g("receita_bruta"), rl = g("receita_liquida");
    var r = function (a, b) { return a != null && b ? a / b : null; };
    return {
      lc: r(ac, pc), lg: ac != null ? r(ac + rlp, pc + pnc) : null, sg: r(at, pc + pnc), endiv: at ? (pc + pnc) / at : null,
      ebitda: ebitda, margem: r(ebitda, rl || rb), divida: div, dl: div - caixa, dl_ebitda: ebitda ? (div - caixa) / ebitda : null,
      cobertura_juros: r(ebitda, g("despesas_financeiras")), rb: rb, pl: pl
    };
  }

  /* ---------- ROI e payback (mensal, agregado por ano) ---------- */
  function roi(caso, simRes, base) {
    var R = caso.roi || {};
    if (R.modo === "internalizacao") return roiInternalizacao(caso, simRes, base);
    var mod = base.modalidades.filter(function (m) { return m.id === R.modalidade; })[0];
    if (!mod) return null;
    var filant = (caso.cliente || {}).natureza === "filantropica";
    var H = num(R.horizonte) || 10, meses = H * 12, ini = num(R.inicio_op) == null ? 3 : num(R.inicio_op);
    var cap = mod.un === "tratamentos" ? (num(R.cap_mes) || mod.mes) : (num(R.exh) || mod.exh) * (num(R.h) || mod.h) * (num(R.d) || mod.d);
    if (num(R.volume_mes)) cap = num(R.volume_mes) / ((num(R.ocupacao) || 80) / 100);
    var ocup = (num(R.ocupacao) == null ? 80 : num(R.ocupacao)) / 100, rIni = (num(R.ramp_ini) == null ? 30 : num(R.ramp_ini)) / 100, rMes = num(R.ramp_meses) == null ? 12 : num(R.ramp_meses);
    var mix = { sus: num(R.mix_sus) || 0, conv: num(R.mix_conv) || 0, part: num(R.mix_part) || 0 };
    var smix = mix.sus + mix.conv + mix.part || 1;
    var pSus = num(R.preco_sus) != null ? num(R.preco_sus) : (R.ate && mod.ate ? mod.ate : mod.sus) || 0;
    var pConv = num(R.preco_conv) || 0, pPart = num(R.preco_part) || 0;
    var ticket = (mix.sus * pSus + mix.conv * pConv + mix.part * pPart) / smix;
    var glosa = (num(R.glosa) || 0) / 100;
    var cp = base.custos_padrao[mod.id] || {};
    var capex = (num((caso.operacao || {}).valor_equip) || 0) + (num((caso.operacao || {}).valor_obra) || 0) + (num(R.outros_capex) || 0);
    var manutPct = num(R.manut) == null ? cp.manut : num(R.manut), garantia = num(R.garantia) == null ? cp.garantia : num(R.garantia);
    var laudo = (num(R.laudo) == null ? cp.laudo : num(R.laudo)) / 100, insumo = num(R.insumo) == null ? cp.insumo : num(R.insumo);
    var fixo = (num(R.equipe) || 0) + (num(R.energia) || 0) + (num(R.outros_fixos) || 0);
    var regime = R.regime || "presumido", iss = (num(R.iss) == null ? 5 : num(R.iss)) / 100, simples = (num(R.simples) == null ? 15.5 : num(R.simples)) / 100;
    var presIR = R.equiparacao === false ? 0.32 : 0.08, presCS = R.equiparacao === false ? 0.32 : 0.12;
    var dep = capex / 120; // 10 anos (IN RFB 1.700/2017)
    var desc = (num(R.desconto) == null ? base.macro.cdi.v : num(R.desconto)) / 100, dm = Math.pow(1 + desc, 1 / 12) - 1;
    var rows = simRes ? simRes.rows : [], P = simRes ? simRes.P : 0, custosIni = simRes ? simRes.iof + simRes.tarifa + simRes.honor : 0;
    var proj = [-capex], acion = [-(capex - P) - custosIni], anos = {}, mens = [];
    for (var t = 1; t <= meses; t++) {
      var op = t > ini, k = t - ini;
      var ramp = !op ? 0 : (rMes <= 0 ? 1 : Math.min(1, rIni + (1 - rIni) * (k - 1) / rMes));
      var vol = op ? cap * ocup * ramp : 0;
      var rec = vol * ticket * (1 - glosa);
      var deduc = filant ? rec * iss : regime === "simples" ? rec * simples : regime === "presumido" ? rec * (0.0365 + iss) : rec * (0.0925 + iss);
      var varc = rec * laudo + vol * insumo;
      var manut = t > garantia ? capex * (manutPct / 100) / 12 : 0;
      var fx = op ? fixo : 0;
      var ebitda = rec - deduc - varc - manut - fx;
      if (regime === "real") ebitda += 0.0925 * (dep + manut); // créditos PIS/COFINS não cumulativos (aprox.)
      var r = rows[t - 1] || { parcela: 0, juros: 0 };
      var ir = 0;
      if (filant) ir = 0;
      else if (regime === "presumido") { var bIR = rec * presIR, bCS = rec * presCS; ir = bIR * 0.15 + Math.max(0, bIR - 20000) * 0.10 + bCS * 0.09; }
      else if (regime === "real") { var lair = ebitda - dep - r.juros; ir = lair > 0 ? lair * 0.34 : 0; }
      var fcp = ebitda - (regime === "real" && !filant ? Math.max(0, (ebitda - dep) * 0.34) : ir);
      var fca = ebitda - ir - r.parcela;
      proj.push(fcp); acion.push(fca);
      var a = Math.ceil(t / 12);
      if (!anos[a]) anos[a] = { ano: a, vol: 0, rec: 0, deduc: 0, varc: 0, fixos: 0, ebitda: 0, ir: 0, servico: 0, fca: 0, fcp: 0 };
      var A = anos[a]; A.vol += vol; A.rec += rec; A.deduc += deduc; A.varc += varc; A.fixos += manut + fx; A.ebitda += ebitda; A.ir += ir; A.servico += r.parcela; A.fca += fca; A.fcp += fcp;
      mens.push({ t: t, fca: fca, fcp: fcp });
    }
    var lista = Object.keys(anos).map(function (k) { var A = anos[k]; A.dscr = A.servico > 0 ? (A.ebitda - A.ir) / A.servico : null; return A; });
    function npv(fl) { var s = 0; for (var i = 0; i < fl.length; i++) s += fl[i] / Math.pow(1 + dm, i); return s; }
    function payback(fl, descont) { var acc = 0; for (var i = 0; i < fl.length; i++) { acc += descont ? fl[i] / Math.pow(1 + dm, i) : fl[i]; if (i > 0 && acc >= 0) return i; } return null; }
    var acum = 0; lista.forEach(function (A) { acum += A.fca; A.acum = acum; });
    var margemUn = ticket * (1 - glosa) * (1 - laudo - (filant ? iss : regime === "simples" ? simples : regime === "presumido" ? 0.0365 + iss : 0.0925 + iss)) - insumo;
    var parcelaRef = simRes ? simRes.parcelaPosCarencia : 0;
    var manutRef = capex * (manutPct / 100) / 12;
    var dscrs = lista.map(function (A) { return A.dscr; }).filter(function (x) { return x != null; });
    return {
      mod: mod, cap: cap, ticket: ticket, capex: capex, anos: lista,
      vpl_proj: npv(proj), vpl_acion: npv(acion), tir_proj: aa(irr(proj)), tir_acion: aa(irr(acion)),
      pb_proj: payback(proj, false), pb_proj_desc: payback(proj, true), pb_acion: payback(acion, false), pb_acion_desc: payback(acion, true),
      dscr_min: dscrs.length ? Math.min.apply(null, dscrs) : null, desconto: desc * 100,
      breakeven: margemUn > 0 ? (parcelaRef + fixo + manutRef) / margemUn : null, margemUn: margemUn,
      volRegime: cap * ocup, aporte: capex - P + custosIni, avisos: avisosROI(filant ? Object.assign({ _filant: true }, R) : R, mod, mix, pConv, pPart)
    };
  }
  function avisosROI(R, mod, mix, pConv, pPart) {
    var a = [];
    if (R._filant) a.push("Filantrópica: IR/CSLL e PIS/COFINS tratados como imunes (CEBAS); só o ISS incide, conforme o município");
    if (mix.conv > 0 && !pConv) a.push("Mix inclui convênio, mas o preço de convênio está vazio (conta como zero)");
    if (mix.part > 0 && !pPart) a.push("Mix inclui particular, mas o preço particular está vazio (conta como zero)");
    if (mod.id === "arco") a.push("Arco cirúrgico: informe a receita incremental por procedimento guiado em 'preço particular' ou 'convênio'");
    return a;
  }

  /* ---------- ROI, modo internalização (serviço hoje terceirizado) ----------
     Lógica incremental: EBITDA da operação própria menos EBITDA do modelo atual,
     sobre a mesma receita. Custos fixos que o cliente já paga não entram (são
     iguais nos dois modelos); entram os custos novos e a manutenção pós-garantia. */
  function roiInternalizacao(caso, simRes, base) {
    var R = caso.roi || {}, cl = caso.cliente || {};
    var H = num(R.horizonte) || 10, meses = H * 12, trans = num(R.transicao) == null ? 3 : num(R.transicao);
    var rec0 = num(R.rec_mes) || 0, volVar = (num(R.volume_var) || 0) / 100, cresc = (num(R.cresc_aa) || 0) / 100, reaj = (num(R.reajuste_aa) || 0) / 100;
    var repA = (num(R.rep_atual) || 0) / 100, cvA = (num(R.cv_atual) || 0) / 100, repP = (num(R.rep_proprio) || 0) / 100, cvP = (num(R.cv_proprio) || 0) / 100;
    var fixosNovos = num(R.fixos_novos) || 0, fixosAtuais = num(R.fixos_atuais) || 0, volMes = num(R.volume_mes) || 0;
    var capex = (num((caso.operacao || {}).valor_equip) || 0) + (num((caso.operacao || {}).valor_obra) || 0) + (num(R.outros_capex) || 0);
    var manutPct = num(R.manut) == null ? 8 : num(R.manut), garantia = num(R.garantia) == null ? 12 : num(R.garantia);
    var filant = cl.natureza === "filantropica", regime = filant ? "imune" : (R.regime || cl.regime || "presumido");
    var dep = capex / 120;
    var desc = (num(R.desconto) == null ? base.macro.cdi.v : num(R.desconto)) / 100, dm = Math.pow(1 + desc, 1 / 12) - 1;
    var rows = simRes ? simRes.rows : [], P = simRes ? simRes.P : 0, custosIni = simRes ? simRes.iof + simRes.tarifa + simRes.honor : 0;
    var proj = [-capex], acion = [-(capex - P) - custosIni], anos = {};
    var ebAtualMes = rec0 * (1 + volVar) * (1 - repA - cvA) - fixosAtuais;
    var ebPropMes = rec0 * (1 + volVar) * (1 - repP - cvP) - fixosAtuais - fixosNovos - capex * (manutPct / 100) / 12;
    for (var t = 1; t <= meses; t++) {
      var a = Math.ceil(t / 12), op = t > trans;
      var fator = (1 + volVar) * Math.pow(1 + cresc, Math.max(0, a - 2)) * Math.pow(1 + reaj, a - 1);
      var rec = rec0 * fator;
      var manut = t > garantia ? capex * (manutPct / 100) / 12 : 0;
      var ebA = rec * (1 - repA - cvA) - fixosAtuais * Math.pow(1 + reaj, a - 1);
      var ebP = rec * (1 - repP - cvP) - fixosAtuais * Math.pow(1 + reaj, a - 1) - fixosNovos * Math.pow(1 + reaj, a - 1) - manut;
      var inc = op ? ebP - ebA : 0;
      var r = rows[t - 1] || { parcela: 0, juros: 0 };
      /* Tributos: Presumido e Simples tributam a receita, que não muda → 0. Lucro Real: 34% sobre o EBIT incremental positivo. Filantrópica: imune. */
      var ir = (!filant && regime === "real") ? Math.max(0, inc - dep - r.juros) * 0.34 : 0;
      var fcp = inc - ((!filant && regime === "real") ? Math.max(0, inc - dep) * 0.34 : 0);
      var fca = inc - ir - r.parcela;
      proj.push(fcp); acion.push(fca);
      if (!anos[a]) anos[a] = { ano: a, vol: 0, rec: 0, deduc: 0, varc: 0, fixos: 0, ebitda: 0, ebAtual: 0, ebProprio: 0, ir: 0, servico: 0, fca: 0, fcp: 0 };
      var A = anos[a]; A.vol += op ? volMes * fator / Math.pow(1 + reaj, a - 1) : 0; A.rec += rec; A.varc += rec * (op ? repP + cvP : repA + cvA); A.fixos += op ? fixosNovos + manut : 0; A.ebitda += inc; A.ebAtual += ebA; A.ebProprio += op ? ebP : ebA; A.ir += ir; A.servico += r.parcela; A.fca += fca; A.fcp += fcp;
    }
    var lista = Object.keys(anos).map(function (k) { var A = anos[k]; A.dscr = A.servico > 0 ? (A.ebitda - A.ir) / A.servico : null; return A; });
    function npv(fl) { var s = 0; for (var i = 0; i < fl.length; i++) s += fl[i] / Math.pow(1 + dm, i); return s; }
    function payback(fl, descont) { var acc = 0; for (var i = 0; i < fl.length; i++) { acc += descont ? fl[i] / Math.pow(1 + dm, i) : fl[i]; if (i > 0 && acc >= 0) return i; } return null; }
    var acum = 0; lista.forEach(function (A) { acum += A.fca; A.acum = acum; });
    var dscrs = lista.map(function (A) { return A.dscr; }).filter(function (x) { return x != null; });
    var avisos = [];
    if (!rec0) avisos.push("Informe a receita líquida mensal atual do serviço terceirizado");
    if (repP >= repA) avisos.push("O repasse próprio não é menor que o repasse atual: o ganho vem só de outros custos variáveis");
    if (filant) avisos.push("Filantrópica: IR/CSLL e PIS/COFINS tratados como imunes (CEBAS); ISS depende do município");
    return {
      mod: { id: "internalizacao", nome: "Internalização de serviço terceirizado", un: "exames", f: [], fx: "", dem1000: null, cap_sus: null }, cap: null, ticket: null, capex: capex, anos: lista,
      vpl_proj: npv(proj), vpl_acion: npv(acion), tir_proj: aa(irr(proj)), tir_acion: aa(irr(acion)),
      pb_proj: payback(proj, false), pb_proj_desc: payback(proj, true), pb_acion: payback(acion, false), pb_acion_desc: payback(acion, true),
      dscr_min: dscrs.length ? Math.min.apply(null, dscrs) : null, desconto: desc * 100,
      breakeven: null, margemUn: null, volRegime: volMes * (1 + volVar), aporte: capex - P + custosIni, avisos: avisos,
      ebAtualMes: ebAtualMes, ebPropMes: ebPropMes, ganhoMes: ebPropMes - ebAtualMes, regime: regime
    };
  }

  /* ---------- Capacidade de pagamento da entidade ----------
     EBITDA do tomador (informado ou EBIT + depreciação do último exercício) contra o serviço
     da dívida existente (mapa de dívidas) e o novo (linha simulada), ano a ano; evento de
     desalavancagem (venda de ativo, TDC, aporte) liquida as dívidas marcadas a partir do mês. */
  function entidade(caso, simRes, roiRes, base) {
    var fin = caso.financeiro || {}, div = fin.dividas || [], ex = fin.exercicios || [], ev = fin.evento || {};
    var ult = ex.length ? ex[ex.length - 1] : null, ind = ult ? indicadores(ult) : null;
    var ebitda0 = num(fin.ebitda_anual); if (ebitda0 == null && ind && ind.ebitda != null) ebitda0 = ind.ebitda;
    if (ebitda0 == null) return null;
    var cresc = (num(fin.ebitda_cresc) || 0) / 100;
    var ctx = contexto(caso, base), y0 = ctx.ini.y, H = roiRes ? roiRes.anos.length : Math.max(5, Math.ceil(((simRes && simRes.n) || 60) / 12));
    var evM = ev.mes ? (+String(ev.mes).slice(0, 4)) * 12 + (+String(ev.mes).slice(5, 7)) : null;
    var caixa = num(fin.caixa); if (caixa == null) caixa = ult ? (num(ult.caixa) || 0) : 0;
    var divTot = num(fin.divida_total); if (divTot == null) divTot = ult ? (num(ult.emprestimos_cp) || 0) + (num(ult.emprestimos_lp) || 0) : div.reduce(function (s, d) { return s + (num(d.saldo) || 0); }, 0);
    var linhas = [];
    for (var k = 1; k <= H; k++) {
      var y = y0 + k - 1, servAtual = 0, servEv = 0;
      div.forEach(function (d) {
        var fim = d.fim ? (+String(d.fim).slice(0, 4)) * 12 + (+String(d.fim).slice(5, 7)) : 0, p = num(d.parcela) || 0;
        for (var m = 1; m <= 12; m++) { var idx = y * 12 + m; if (idx > fim) continue; servAtual += p; if (!(evM && idx > evM && d.liquida_evento !== false)) servEv += p; }
      });
      var servNovo = 0; (simRes ? simRes.rows : []).forEach(function (r) { if (r.y === y) servNovo += r.parcela; });
      var A = roiRes ? roiRes.anos[k - 1] : null, inc = A ? A.ebitda - A.ir : 0;
      var eb = ebitda0 * Math.pow(1 + cresc, k), tot = eb + inc;
      linhas.push({ ano: y, ebitda: eb, inc: inc, total: tot, servAtual: servAtual, servEv: servEv, servNovo: servNovo,
        dscrSemProj: servAtual > 0 ? eb / servAtual : null, dscrSem: (servAtual + servNovo) > 0 ? tot / (servAtual + servNovo) : null, dscrCom: (servEv + servNovo) > 0 ? tot / (servEv + servNovo) : null });
    }
    var liq = evM ? div.filter(function (d) { return d.liquida_evento !== false; }).reduce(function (s, d) { return s + (num(d.saldo) || 0); }, 0) : 0;
    return { linhas: linhas, ebitda0: ebitda0, caixa: caixa, divTot: divTot, dl: divTot - caixa, dlEbitda: ebitda0 ? (divTot - caixa) / ebitda0 : null,
      dlEbitdaProj: ebitda0 ? (divTot - caixa + (simRes ? simRes.P : 0)) / (ebitda0 + (linhas[1] ? linhas[1].inc : 0)) : null, dlAposEvento: Math.max(0, divTot - caixa - liq), evento: ev, temDividas: div.length > 0 };
  }

  return { num: num, porteBNDES: porteBNDES, roiInternalizacao: roiInternalizacao, entidade: entidade, faixaFundos: faixaFundos, custoFinanceiro: custoFinanceiro, taxaAnual: taxaAnual, cronograma: cronograma, calcIOF: calcIOF, irr: irr, aa: aa,
    contexto: contexto, elegibilidade: elegibilidade, simular: simular, avaliar: avaliar, indicadores: indicadores, roi: roi, fmtP: fmtP, fmtR: fmtR, PORTE_NOME: PORTE_NOME, ipcaAno: ipcaAno };
})();
if (typeof module !== "undefined") module.exports = Motor;
