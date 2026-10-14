/* Geração dos documentos do caso: estudo (PDF), dossiê (PDF), kit (XLSX) e minuta do contrato (DOCX). */
var Docs = (function () {
  "use strict";
  var NAVY = [28, 43, 74], GOLD = [184, 146, 58], GRAY = [77, 91, 114], LIGHT = [233, 237, 243];
  var SS = { razao: "DSJ REPRESENTAÇÕES LTDA", cnpj: "33.192.178/0001-30", end: "Rua Arizona, 1366, Cj. 81 • Cidade Monções • São Paulo/SP • CEP 04567-003", email: "thiago.speranzini@sespartners.com.br", vmi: "VMI TECNOLOGIAS LTDA", vmiCnpj: "02.659.246/0001-03" };
  function bytes(uri) { var b64 = uri.split(",")[1]; if (typeof atob === "function") { var s = atob(b64), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; } return Buffer.from(b64, "base64"); }
  function t(s) { return String(s == null ? "" : s).replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/−/g, "-").replace(/≈/g, "~").replace(/→/g, "->").replace(/[  ]/g, " "); }
  function num(v) { return Motor.num(v); }
  function R(v) { return Motor.fmtR(v); }
  function P(v, d) { return Motor.fmtP(v, d); }
  function N(v, d) { if (v == null || !isFinite(v)) return "—"; return v.toLocaleString("pt-BR", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function X(v) { return v == null || !isFinite(v) ? "—" : v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "x"; }
  function dataBR(s) { if (!s) return "—"; var p = String(s).slice(0, 10).split("-"); return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : s; }
  var PORTES = { micro: "Microempresa", pequena: "Pequena empresa", media: "Média empresa", grande: "Grande empresa" };
  var STATUS_KIT = { pendente: "Pendente", solicitado: "Solicitado", recebido: "Recebido", conferido: "Conferido", vencido: "Vencido", na: "Não se aplica" };

  /* ---------- extenso (reais e percentuais) ---------- */
  var U = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  var D = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  var C = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
  function ate999(n) { if (n === 100) return "cem"; var c = Math.floor(n / 100), r = n % 100, p = []; if (c) p.push(C[c]); if (r) { if (r < 20) p.push(U[r]); else { var d = Math.floor(r / 10), u = r % 10; p.push(D[d] + (u ? " e " + U[u] : "")); } } return p.join(" e "); }
  function inteiro(n) {
    if (n === 0) return "zero";
    var grupos = [], esc1 = [["", ""], ["mil", "mil"], ["milhão", "milhões"], ["bilhão", "bilhões"]];
    var i = 0; while (n > 0) { grupos.push({ v: n % 1000, i: i }); n = Math.floor(n / 1000); i++; }
    var partes = grupos.filter(function (g) { return g.v; }).reverse().map(function (g) { var w = g.i === 1 && g.v === 1 ? "mil" : ate999(g.v) + (g.i ? " " + (g.v === 1 ? esc1[g.i][0] : esc1[g.i][1]) : ""); return { w: w, v: g.v, i: g.i }; });
    var s = "";
    partes.forEach(function (p, k) { if (k === 0) s = p.w; else { var ult = k === partes.length - 1; s += (ult && (p.v < 100 || p.v % 100 === 0) ? " e " : ", ") + p.w; } });
    return s;
  }
  function reais(v) {
    v = Math.round(v * 100) / 100; var r = Math.floor(v), c = Math.round((v - r) * 100), s = "";
    if (r) { s = inteiro(r); var milhaoRedondo = r >= 1e6 && r % 1e6 === 0; s += (milhaoRedondo ? " de" : "") + (r === 1 ? " real" : " reais"); }
    if (c) s += (r ? " e " : "") + inteiro(c) + (c === 1 ? " centavo" : " centavos");
    return s || "zero reais";
  }
  function pctExt(p) { var i = Math.floor(p), d = Math.round((p - i) * 100); return (i ? inteiro(i) : "zero") + (d ? " vírgula " + (d < 10 ? "zero " : "") + inteiro(d % 10 === 0 ? d / 10 : d) : "") + " por cento"; }

  /* ---------- PDF: base comum ---------- */
  function novoPDF(jsPDF, titulo, sub) {
    var doc = new jsPDF({ unit: "mm", format: "a4" }), W = 210;
    doc.setFillColor.apply(doc, NAVY); doc.rect(0, 0, W, 30, "F");
    var lh = 21, lw = lh * LOGO.ratio;
    doc.addImage(LOGO.brancoPDF, "PNG", 14, 4.5, lw, lh, "logo-ss", "FAST");
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(200, 210, 225); doc.text(t("Project finance · equipamentos VMI"), 14 + lw + 5, 20);
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(255, 255, 255); doc.text(t(titulo), W - 16, 13, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(200, 210, 225); doc.text(t(sub), W - 16, 20, { align: "right" });
    doc.setDrawColor.apply(doc, GOLD); doc.setLineWidth(0.8); doc.line(0, 30, W, 30);
    doc._y = 40; return doc;
  }
  function rodape(doc, linha) {
    var n = doc.getNumberOfPages();
    for (var i = 1; i <= n; i++) { doc.setPage(i); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor.apply(doc, GRAY); doc.text(t(linha), 16, 289); doc.text(i + " / " + n, 194, 289, { align: "right" }); }
  }
  function precisa(doc, h) { if (doc._y + h > 278) { doc.addPage(); doc._y = 18; } }
  function h2(doc, s) { precisa(doc, 16); doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor.apply(doc, NAVY); doc.text(t(s), 16, doc._y); doc.setDrawColor.apply(doc, GOLD); doc.setLineWidth(0.5); doc.line(16, doc._y + 1.8, 30, doc._y + 1.8); doc._y += 7; }
  function par(doc, s, opt) {
    opt = opt || {}; doc.setFont("helvetica", opt.b ? "bold" : "normal"); doc.setFontSize(opt.size || 9.5); doc.setTextColor.apply(doc, opt.cor || [20, 32, 53]);
    var linhas = doc.splitTextToSize(t(s), opt.w || 178); precisa(doc, linhas.length * (opt.lh || 4.6) + 1);
    doc.text(linhas, opt.x || 16, doc._y); doc._y += linhas.length * (opt.lh || 4.6) + (opt.after == null ? 2 : opt.after);
  }
  function bullets(doc, arr, opt) { arr.forEach(function (s) { par(doc, "• " + s, Object.assign({ x: 18, w: 176, after: 0.6 }, opt || {})); }); doc._y += 1.5; }
  function tabela(doc, head, body, opt) {
    opt = opt || {};
    doc.autoTable({ startY: doc._y, head: [head.map(t)], body: body.map(function (r) { return r.map(t); }), margin: { left: 16, right: 16 }, theme: "plain",
      styles: { font: "helvetica", fontSize: opt.size || 8.5, cellPadding: 1.6, textColor: [20, 32, 53], lineColor: [221, 227, 235], lineWidth: { bottom: 0.2 } },
      headStyles: { fontStyle: "bold", textColor: [255, 255, 255], fillColor: NAVY, fontSize: (opt.size || 8.5) - 0.5 }, alternateRowStyles: { fillColor: [247, 248, 251] },
      columnStyles: opt.col || {}, didParseCell: opt.didParse });
    doc._y = doc.lastAutoTable.finalY + 6;
  }
  function kpis(doc, itens) {
    precisa(doc, 20); var n = itens.length, w = (178 - (n - 1) * 3) / n;
    itens.forEach(function (k, i) {
      var x = 16 + i * (w + 3); doc.setFillColor.apply(doc, k.hl ? [246, 239, 221] : LIGHT); doc.roundedRect(x, doc._y, w, 17, 1.5, 1.5, "F");
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.2); doc.setTextColor.apply(doc, GRAY); doc.text(doc.splitTextToSize(t(k.l), w - 4)[0], x + 2.5, doc._y + 5);
      doc.setFont("helvetica", "bold"); doc.setFontSize(11.5); doc.setTextColor.apply(doc, NAVY); doc.text(t(k.v), x + 2.5, doc._y + 11.5);
      if (k.s) { doc.setFont("helvetica", "normal"); doc.setFontSize(6.6); doc.setTextColor.apply(doc, GRAY); doc.text(doc.splitTextToSize(t(k.s), w - 4)[0], x + 2.5, doc._y + 15.2); }
    });
    doc._y += 22;
  }
  function fonteTxt(base, id) { var f = base.fontes[id]; return f ? f.t + " (" + f.d + ") " + f.u : id; }

  /* ---------- Estudo para o cliente ---------- */
  function estudo(p, jsPDF) {
    var c = p.caso, av = p.av, s = p.sim, ctx = av.ctx, base = p.base, cl = c.cliente, op = c.operacao, eq = op.equipamento || {};
    var doc = novoPDF(jsPDF, "Estudo de financiamento", (cl.fantasia || cl.razao || c.nome) + " · " + dataBR(p.hoje));
    par(doc, "Para " + (cl.razao || c.nome) + (cl.cnpj ? " (CNPJ " + cl.cnpj + ")" : "") + ". Estudo indicativo das linhas de crédito disponíveis para a aquisição do equipamento abaixo, com as condições vigentes em " + dataBR(base.versao) + ". Aprovação, taxa final e garantias dependem da análise do agente financeiro e do BNDES.", { cor: GRAY });
    h2(doc, "Operação");
    tabela(doc, ["Item", "Valor"], [
      ["Equipamento", (eq.modelo || "—") + (eq.fabricante ? " · " + eq.fabricante : "")], ["Código FINAME (CFI)", eq.cfi || "não informado"], ["Investimento", R(ctx.invest) + (ctx.valorObra ? " (equipamento " + R(ctx.valorEquip) + " + obra " + R(ctx.valorObra) + ")" : "")],
      ["Valor a financiar", R(ctx.fin)], ["Prazo e carência desejados", ctx.prazo + " meses, com " + ctx.carencia + " de carência"], ["Porte considerado", ctx.porte ? PORTES[ctx.porte] + (ctx.rob != null ? " (receita bruta " + R(ctx.rob) + ")" : " (declarado)") : "não informado"], ["UF", ctx.uf || "—"]
    ], { col: { 0: { cellWidth: 55, fontStyle: "bold" } } });
    if (av.ranking.length) {
      var top = av.ranking[0];
      h2(doc, "Recomendação");
      par(doc, top.linha.nome, { b: true, size: 11, cor: NAVY, after: 1 });
      par(doc, top.linha.operador, { cor: GRAY, size: 8.5 });
      kpis(doc, [{ l: "Custo total com honorário", v: P(top.sim.custoTotal), s: "faixa " + P(top.sim.faixa.min) + " a " + P(top.sim.faixa.max), hl: true }, { l: "CET do agente", v: P(top.sim.cet), s: "inclui IOF e tarifas" }, { l: "Taxa no 1º ano", v: P(top.sim.taxaAno1), s: "a.a. nominal" }, { l: "Parcela pós-carência", v: R(top.sim.parcelaPosCarencia), s: top.sim.n + " meses, carência " + top.sim.c }]);
      par(doc, "Por que esta linha", { b: true, size: 9.5, after: 1 });
      bullets(doc, top.el.porques.concat(av.benchmark ? [(top.sim.custoTotal < av.benchmark.v ? P(av.benchmark.v - top.sim.custoTotal) + " abaixo" : P(top.sim.custoTotal - av.benchmark.v) + " acima") + " da taxa média de mercado para aquisição de bens por empresas (" + P(av.benchmark.v) + ", Banco Central, " + av.benchmark.ref + ")"] : []));
      if (top.el.avisos.length || top.sim.avisos.length) { par(doc, "Pontos de atenção", { b: true, size: 9.5, after: 1 }); bullets(doc, top.el.avisos.concat(top.sim.avisos).concat([top.linha.obs])); }
      h2(doc, "Linhas comparadas");
      tabela(doc, ["#", "Linha", "Custo financeiro", "1º ano", "CET agente", "Custo total", "Parcela", "Prazo"], av.ranking.map(function (x) { return [String(x.rank), x.linha.nome, x.sim.cfRot, P(x.sim.taxaAno1), P(x.sim.cet), P(x.sim.custoTotal), R(x.sim.parcelaPosCarencia), x.sim.n + "/" + x.sim.c]; })
        .concat(av.mercado.map(function (x) { return ["ref.", x.linha.nome + " (média BCB, sem honorário)", x.sim.cfRot, P(x.sim.taxaAno1), P(x.sim.cet), P(x.sim.custoTotal), R(x.sim.parcelaPosCarencia), x.sim.n + "/" + x.sim.c]; })),
        { size: 7.6, col: { 0: { cellWidth: 8 }, 1: { cellWidth: 52 }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right", fontStyle: "bold" }, 6: { halign: "right" }, 7: { halign: "right" } } });
      if (av.condicionais && av.condicionais.length) { par(doc, "Linhas que dependem de confirmação", { b: true, size: 9, after: 1 }); bullets(doc, av.condicionais.map(function (x) { return x.linha.nome + ": custo total de " + P(x.sim.custoTotal) + " se confirmado: " + x.linha.elig.condicao.rotulo.toLowerCase() + "."; }), { size: 8 }); }
      var nao = av.todas.filter(function (x) { return !x.el.ok && !x.linha.benchmark && !x.condicional; });
      if (nao.length) { par(doc, "Linhas avaliadas e não elegíveis neste caso", { b: true, size: 9, after: 1 }); bullets(doc, nao.map(function (x) { return x.linha.nome + ": " + x.el.bloqueios.join("; "); }), { size: 8 }); }
    } else { h2(doc, "Recomendação"); par(doc, "Nenhuma linha com regra pública ficou elegível com os dados atuais. Verifique o código FINAME do equipamento, o porte e a UF."); }
    if (s) {
      h2(doc, "Simulação: " + s.linha.nome);
      kpis(doc, [{ l: "Valor financiado", v: R(s.P) }, { l: "Parcela pós-carência", v: R(s.parcelaPosCarencia), hl: true, s: s.sistema }, { l: "Total pago", v: R(s.pagos) }, { l: "Custo total", v: P(s.custoTotal), s: "CET agente " + P(s.cet) }]);
      par(doc, "Composição da taxa no 1º ano: (1 + " + s.cfRot + ")" + s.spreads.map(function (x) { return " × (1 + " + P(x.v) + " " + x.nome.toLowerCase() + ")"; }).join("") + " − 1 = " + P(s.taxaAno1) + " a.a. Honorário de êxito S&S de " + N(ctx.honor, 1) + "% sobre o desembolso (" + R(s.honor) + "). IOF: " + R(s.iof) + ". Pós-fixadas projetadas pelo Focus de " + dataBR(base.macro.focus.data) + ".", { size: 8.5, cor: GRAY });
      var anos = {}; s.rows.forEach(function (r) { var k = Math.ceil(r.t / 12); anos[k] = anos[k] || { j: 0, a: 0, p: 0, s: 0, tx: 0, n: 0 }; anos[k].j += r.juros + r.jurosCap; anos[k].a += r.amort; anos[k].p += r.parcela; anos[k].s = r.saldo; anos[k].tx += r.taxa; anos[k].n++; });
      tabela(doc, ["Ano", "Taxa média", "Juros", "Amortização", "Pago no ano", "Saldo final"], Object.keys(anos).map(function (k) { var A = anos[k]; return ["Ano " + k, P(A.tx / A.n), R(A.j), R(A.a), R(A.p), R(A.s)]; }), { col: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } } });
    }
    var ro = p.roi;
    if (ro && c.roi && c.roi.ativo) {
      h2(doc, "Retorno do investimento");
      kpis(doc, [{ l: "TIR do acionista", v: P(ro.tir_acion), hl: true }, { l: "TIR do projeto", v: P(ro.tir_proj) }, { l: "VPL do projeto", v: R(ro.vpl_proj), s: "a " + P(ro.desconto) }, { l: "Payback do acionista", v: ro.pb_acion ? N(ro.pb_acion / 12, 1) + " anos" : "não paga", s: "descontado " + (ro.pb_acion_desc ? N(ro.pb_acion_desc / 12, 1) + " anos" : "não paga") }]);
      kpis(doc, [{ l: "DSCR mínimo", v: X(ro.dscr_min), s: "referência pública >= 1,30" }, { l: "Ponto de equilíbrio", v: ro.breakeven ? N(ro.breakeven) + "/mês" : "—", s: ro.mod.un + "; regime " + N(ro.volRegime) + "/mês" }, { l: "Ticket médio", v: R(ro.ticket), s: "ponderado pelo mix" }, { l: "Aporte inicial", v: R(ro.aporte) }]);
      tabela(doc, ["Ano", "Volume", "Receita", "EBITDA", "IR/CSLL", "Serviço dívida", "Fluxo acionista", "Acumulado", "DSCR"], ro.anos.map(function (A) { return ["Ano " + A.ano, N(A.vol), R(A.rec), R(A.ebitda), R(A.ir), R(A.servico), R(A.fca), R(A.acum), X(A.dscr)]; }), { size: 7.4, col: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" }, 8: { halign: "right" } } });
      var R0 = c.roi, cp = base.custos_padrao[ro.mod.id] || {};
      if (ro.mod.id === "internalizacao") par(doc, "Premissas (internalização): receita líquida atual " + R(num(R0.rec_mes) || 0) + "/mês; repasse ao terceiro " + (R0.rep_atual || 0) + "% e outros variáveis " + (R0.cv_atual || 0) + "% da receita; serviço próprio com repasse médico " + (R0.rep_proprio || 0) + "%, variáveis " + (R0.cv_proprio || 0) + "%, custos fixos novos " + R(num(R0.fixos_novos) || 0) + "/mês, manutenção " + (R0.manut == null ? 8 : R0.manut) + "% a.a. após " + (R0.garantia == null ? 12 : R0.garantia) + " meses; transição de " + (R0.transicao == null ? 3 : R0.transicao) + " meses; volume " + (R0.volume_var || 0) + "%. Ganho operacional mensal em regime: " + R(ro.ganhoMes) + ". Tributação: " + (ro.regime === "imune" ? "entidade imune (filantrópica)" : ro.regime === "real" ? "Lucro Real sobre o EBIT incremental" : "regime sobre a receita, sem imposto incremental") + ". Custos fixos já pagos pelo cliente não entram no ganho.", { size: 8, cor: GRAY });
      else par(doc, "Premissas: " + ro.mod.nome + "; mix SUS " + (R0.mix_sus || 0) + "% / convênio " + (R0.mix_conv || 0) + "% / particular " + (R0.mix_part || 0) + "%; ocupação de regime " + (R0.ocupacao == null ? 80 : R0.ocupacao) + "%; manutenção " + (R0.manut == null ? cp.manut : R0.manut) + "% a.a. após " + (R0.garantia == null ? cp.garantia : R0.garantia) + " meses; laudo " + (R0.laudo == null ? cp.laudo : R0.laudo) + "% da receita; regime " + (R0.regime || "presumido") + ". " + ro.mod.fx + " Valores sem fonte pública são pontos de partida a confirmar com a clínica.", { size: 8, cor: GRAY });
    }
    if (p.ent && (p.ent.temDividas || p.ent.evento.mes)) {
      h2(doc, "Capacidade de pagamento da entidade");
      var L0 = p.ent.linhas[0], evN = p.ent.evento.nome || "evento";
      kpis(doc, [{ l: "DSCR " + L0.ano + " sem o projeto", v: X(L0.dscrSemProj) }, { l: "DSCR " + L0.ano + " com o projeto", v: X(L0.dscrSem), hl: true }, { l: p.ent.evento.mes ? "DSCR " + L0.ano + " com " + evN : "Dívida líquida / EBITDA", v: p.ent.evento.mes ? X(L0.dscrCom) : X(p.ent.dlEbitda) }, { l: "Dívida líquida / EBITDA" + (p.ent.evento.mes ? " após " + evN : " com a operação"), v: p.ent.evento.mes ? X(p.ent.ebitda0 ? p.ent.dlAposEvento / p.ent.ebitda0 : null) : X(p.ent.dlEbitdaProj) }]);
      tabela(doc, ["Ano", "EBITDA tomador", "+ projeto", "Serviço atual", "Parcela nova", "DSCR sem proj.", "DSCR com proj."].concat(p.ent.evento.mes ? ["DSCR com " + evN] : []), p.ent.linhas.slice(0, 6).map(function (l) { return [String(l.ano), R(l.ebitda), R(l.inc), R(l.servAtual), R(l.servNovo), X(l.dscrSemProj), X(l.dscrSem)].concat(p.ent.evento.mes ? [X(l.dscrCom)] : []); }), { size: 7.6, col: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" } } });
      par(doc, "EBITDA do tomador " + (num((c.financeiro || {}).ebitda_anual) != null ? "informado pelo cliente" : "estimado como EBIT + depreciação do último exercício") + "; serviço da dívida atual pelo mapa de empréstimos informado. Referência pública de DSCR ≥ 1,30 (BNDES Project Finance); no apoio indireto o critério é do agente.", { size: 8, cor: GRAY });
    }
    h2(doc, "Fontes e ressalvas");
    var ids = {}; (av.ranking.slice(0, 4).concat(av.mercado)).forEach(function (x) { (x.linha.fontes || []).forEach(function (f) { ids[f] = 1; }); });
    if (ro && c.roi && c.roi.ativo) (ro.mod.f || []).forEach(function (f) { ids[f] = 1; });
    bullets(doc, Object.keys(ids).map(function (id) { return fonteTxt(base, id); }).concat(["Banco Central – Focus " + dataBR(base.macro.focus.data) + "; Selic " + P(base.macro.selic.v) + "; TLP de " + base.macro.tlp_jm.mes + " com parcela real de " + P(base.macro.tlp_jm.v) + "."]), { size: 7.6 });
    par(doc, "Estudo indicativo preparado pela S&S Partners, que atua como assessora e intermediadora e não é instituição financeira. As condições finais de taxa, prazo, carência e garantias são definidas pelo agente financeiro e pelo BNDES. Taxas pós-fixadas variam com o índice.", { size: 7.8, cor: GRAY });
    rodape(doc, "S&S Partners · DSJ Representações Ltda · CNPJ " + SS.cnpj + " · " + SS.email);
    return doc;
  }

  /* ---------- Dossiê para o agente ---------- */
  function dossie(p, jsPDF) {
    var c = p.caso, av = p.av, s = p.sim, ctx = av.ctx, base = p.base, cl = c.cliente, op = c.operacao, eq = op.equipamento || {};
    var doc = novoPDF(jsPDF, "Proposta de operação", "Para o agente financeiro · " + dataBR(p.hoje));
    par(doc, "Apresentamos a operação de financiamento de " + (cl.razao || "—") + " para aquisição de " + (eq.modelo || "equipamento médico") + (eq.cfi ? " (CFI " + eq.cfi + ")" : "") + ". A S&S Partners assessora o cliente na montagem do kit e na interlocução com o agente.", { cor: GRAY });
    h2(doc, "1. Tomador");
    var socios = (cl.socios || []).map(function (x) { return x.nome + (x.participacao_pct != null ? " (" + x.participacao_pct + "%)" : "") + (x.administrador ? ", administrador" : ""); }).join("; ");
    tabela(doc, ["Campo", "Informação"], [["Razão social", cl.razao || "—"], ["Nome fantasia", cl.fantasia || "—"], ["CNPJ", cl.cnpj || "—"], ["Abertura", dataBR(cl.abertura)], ["CNAE principal", cl.cnae || "—"], ["Natureza", cl.natureza === "filantropica" ? "Filantrópica / sem fins lucrativos" : "Privada com fins lucrativos"], ["Regime tributário", { simples: "Simples Nacional", presumido: "Lucro Presumido", real: "Lucro Real" }[cl.regime] || "—"],
      ["Porte BNDES", ctx.porte ? PORTES[ctx.porte] + (ctx.rob != null ? " · receita bruta anual " + R(ctx.rob) : " (declarado; aguardando DRE)") : "—"], ["Sede", [cl.endereco, cl.municipio, cl.uf, cl.cep].filter(Boolean).join(", ") || "—"], ["Representante legal", [(cl.rep || {}).nome, (cl.rep || {}).cargo].filter(Boolean).join(", ") || "—"], ["Sócios", socios || "conforme contrato social (kit, item 1)"],
      ["Contato", [(cl.contato || {}).nome, (cl.contato || {}).tel, (cl.contato || {}).email || cl.email].filter(Boolean).join(" · ") || "—"], ["Banco de relacionamento", cl.banco_rel || "—"], ["Já operou BNDES/FINAME", cl.ja_bndes === "sim" ? "Sim" : cl.ja_bndes === "nao" ? "Não" : "—"], ["Endividamento bancário", cl.endividamento != null ? R(num(cl.endividamento)) + (cl.servico_divida_mes ? " · parcelas " + R(num(cl.servico_divida_mes)) + "/mês" : "") : "—"]],
      { col: { 0: { cellWidth: 48, fontStyle: "bold" } } });
    h2(doc, "2. Operação");
    tabela(doc, ["Campo", "Informação"], [["Equipamento", (eq.descricao || eq.modelo || "—")], ["Fabricante", eq.fabricante || "—"], ["Código FINAME (CFI)", eq.cfi || "não informado"], ["NCM", eq.ncm || "—"], ["Fornecedor", op.fornecedor || "—"],
      ["Valor do equipamento", R(ctx.valorEquip)], ["Obra e instalação", R(ctx.valorObra)], ["Valor a financiar", R(s ? s.P : ctx.fin) + " (" + N((s ? s.P : ctx.fin) / (ctx.invest || 1) * 100, 1) + "% do investimento)"],
      ["Linha pretendida", s ? s.linha.nome : "—"], ["Custo financeiro", s ? s.cfRot : "—"], ["Prazo / carência", s ? s.n + " meses / " + s.c + " meses (juros " + (s.carModo === "pagos" ? "pagos" : "capitalizados") + " na carência)" : "—"], ["Amortização", s ? s.sistema : "—"], ["Finalidade", op.finalidade || "—"]],
      { col: { 0: { cellWidth: 48, fontStyle: "bold" } } });
    h2(doc, "3. Capacidade de pagamento");
    if (p.indic.length) {
      var lin = [["Receita bruta", "rb", R], ["EBITDA", "ebitda", R], ["Margem EBITDA", "margem", function (v) { return v == null ? "—" : P(v * 100, 1); }], ["Liquidez corrente", "lc", X], ["Liquidez geral", "lg", X], ["Solvência geral", "sg", X], ["Endividamento", "endiv", function (v) { return v == null ? "—" : P(v * 100, 1); }], ["Dívida líquida", "dl", R], ["Dívida líquida / EBITDA", "dl_ebitda", X], ["Patrimônio líquido", "pl", R]];
      tabela(doc, ["Indicador"].concat(p.indic.map(function (x) { return String(x.ano || "—"); })), lin.map(function (r) { return [r[0]].concat(p.indic.map(function (x) { return x.i ? r[2](x.i[r[1]]) : "—"; })); }), { col: { 0: { cellWidth: 55, fontStyle: "bold" } } });
      var u = p.indic[p.indic.length - 1].i, parcAno = s ? s.parcelaPosCarencia * 12 : 0, serv = (num(cl.servico_divida_mes) || 0) * 12;
      var dscr = u && u.ebitda != null && parcAno ? u.ebitda / (parcAno + serv) : null;
      kpis(doc, [{ l: "Parcela anual nova", v: R(parcAno) }, { l: "Dívidas atuais (ano)", v: R(serv) }, { l: "DSCR com a operação", v: X(dscr), hl: true, s: "EBITDA último exercício" }, { l: "DL/EBITDA após", v: X(u && u.ebitda ? (u.dl + (s ? s.P : 0)) / u.ebitda : null) }]);
    } else par(doc, "Demonstrações financeiras ainda não recebidas (kit, item 14). Os indicadores serão incluídos quando o balanço e a DRE assinados chegarem.", { cor: GRAY });
    if (p.ent && (p.ent.temDividas || p.ent.evento.mes)) {
      par(doc, "Capacidade de pagamento da entidade (EBITDA do tomador contra o serviço da dívida existente mais a parcela nova):", { size: 8.8 });
      tabela(doc, ["Ano", "EBITDA tomador", "+ projeto", "Serviço atual", "Parcela nova", "DSCR sem proj.", "DSCR com proj."].concat(p.ent.evento.mes ? ["DSCR com " + (p.ent.evento.nome || "evento")] : []), p.ent.linhas.slice(0, 6).map(function (l) { return [String(l.ano), R(l.ebitda), R(l.inc), R(l.servAtual), R(l.servNovo), X(l.dscrSemProj), X(l.dscrSem)].concat(p.ent.evento.mes ? [X(l.dscrCom)] : []); }), { size: 7.6, col: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" } } });
    }
    var ro = p.roi;
    if (ro && c.roi && c.roi.ativo) {
      par(doc, "Projeção do equipamento (premissas do estudo do cliente): TIR do projeto " + P(ro.tir_proj) + "; DSCR mínimo do equipamento sozinho " + X(ro.dscr_min) + "; ponto de equilíbrio " + (ro.breakeven ? N(ro.breakeven) : "—") + " " + ro.mod.un + "/mês, contra " + N(ro.volRegime) + "/mês em regime.", { size: 8.8 });
      tabela(doc, ["Ano", "Receita", "EBITDA", "Serviço da dívida", "DSCR"], ro.anos.slice(0, 6).map(function (A) { return ["Ano " + A.ano, R(A.rec), R(A.ebitda), R(A.servico), X(A.dscr)]; }), { size: 8, col: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } } });
    }
    h2(doc, "4. Garantias propostas");
    bullets(doc, ["Aval dos sócios.", "Alienação fiduciária do equipamento financiado (confirmar o cabimento com o agente, conforme o item 7.3 da Circ. BNDES 13/2022)."].concat(ctx.porte && ctx.porte !== "grande" ? ["FGI ou FGI PEAC, se houver insuficiência de garantias (MPME)."] : []));
    h2(doc, "5. Kit de documentos");
    par(doc, p.kitProg.okOb + " de " + p.kitProg.totOb + " documentos obrigatórios recebidos; " + p.kitProg.ok + " de " + p.kitProg.tot + " itens no total.", { b: true, size: 9 });
    tabela(doc, ["Nº", "Documento", "Status", "Conferência"], base.kit.map(function (it) {
      var k = c.kit[it.id] || {}, st = k.status || (it.auto && num(op.valor_equip) ? "conferido" : "pendente");
      var chk = (k.check && k.check.msgs || []).map(function (m) { return m[1]; }).join("; ");
      return [it.n, it.nome, STATUS_KIT[st] || st, chk || it.val];
    }), { size: 7.3, col: { 0: { cellWidth: 8 }, 1: { cellWidth: 72 }, 2: { cellWidth: 22 } }, didParse: function (d) { if (d.section === "body" && d.column.index === 2) { var v = d.cell.raw; if (v === "Vencido" || v === "Pendente") d.cell.styles.textColor = [180, 45, 45]; if (v === "Conferido" || v === "Recebido") d.cell.styles.textColor = [31, 122, 61]; } } });
    h2(doc, "6. Contato");
    par(doc, "S&S Partners · DSJ Representações Ltda · CNPJ " + SS.cnpj + " · " + SS.end + " · " + SS.email, { size: 8.8 });
    rodape(doc, "Proposta de operação preparada pela S&S Partners · informações declaradas pelo cliente e documentos do kit");
    return doc;
  }

  /* ---------- Kit em planilha ---------- */
  function kit(p, ExcelJS) {
    var c = p.caso, base = p.base, cl = c.cliente, op = c.operacao, eq = op.equipamento || {}, s = p.sim;
    var wb = new ExcelJS.Workbook(); wb.creator = "S&S Partners"; wb.created = new Date();
    var navy = "FF1C2B4A", gold = "FFB8923A", band = "FFE9EDF3", fill = "FFFFF2CC", white = "FFFFFFFF";
    function cab(ws, r, txt, span) { ws.mergeCells(r, 2, r, span); var cl1 = ws.getCell(r, 2); cl1.value = txt; cl1.font = { bold: true, size: 14, color: { argb: white } }; cl1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: navy } }; cl1.alignment = { vertical: "middle" }; ws.getRow(r).height = 26; }
    var cliente = cl.razao || c.nome, oper = (eq.modelo || "") + (s ? " · " + s.linha.nome : "");
    // Leia-me
    var w0 = wb.addWorksheet("Leia-me", { views: [{ showGridLines: false }] }); w0.getColumn(1).width = 3; w0.getColumn(2).width = 28; w0.getColumn(3).width = 100;
    var imgId = wb.addImage({ base64: LOGO.navy, extension: "png" }); w0.addImage(imgId, { tl: { col: 1, row: 0.2 }, ext: { width: Math.round(70 * LOGO.ratio), height: 70 } });
    cab(w0, 5, "Kit de Documentos — FINAME / BNDES  ·  " + cliente, 3);
    [["Objetivo", "Padronizar e acelerar a montagem do kit de documentos exigido para a captação de crédito FINAME/BNDES, maximizando as chances de aprovação e reduzindo o tempo do processo."], ["Como usar", "1) Preencha o Status de cada documento na aba 'Checklist Kit Documentos'. 2) Complete os campos em amarelo da aba 'Cadastro do Cliente'. 3) Devolva à S&S, que revisa antes do protocolo."], ["Operação", oper], ["Gerado em", dataBR(p.hoje) + " pela ferramenta de project finance da S&S, com o status atual do caso."], ["Importante", "Orientação geral. As exigências e validades podem variar conforme o agente financeiro e as políticas vigentes do BNDES. A aprovação e as condições finais são decisão do agente financeiro e do BNDES."], ["Contato S&S", "DSJ Representações Ltda (S&S Partners) · Rua Arizona, 1366, Cj. 81 · São Paulo/SP · " + SS.email]]
      .forEach(function (r, i) { var row = w0.getRow(7 + i); row.getCell(2).value = r[0]; row.getCell(2).font = { bold: true, color: { argb: navy } }; row.getCell(3).value = r[1]; row.getCell(3).alignment = { wrapText: true, vertical: "top" }; row.height = 32; });
    // Checklist
    var w1 = wb.addWorksheet("Checklist Kit Documentos", { views: [{ state: "frozen", ySplit: 9, showGridLines: false }] });
    [5, 52, 18, 18, 38, 13, 26, 15, 46].forEach(function (w, i) { w1.getColumn(i + 1).width = w; });
    w1.mergeCells("A5:I5"); w1.getCell("A5").value = "KIT DE DOCUMENTOS — FINAME / BNDES"; w1.getCell("A5").font = { bold: true, size: 14, color: { argb: white } }; w1.getCell("A5").fill = { type: "pattern", pattern: "solid", fgColor: { argb: navy } }; w1.getRow(5).height = 26;
    w1.mergeCells("A6:I6"); w1.getCell("A6").value = "Cliente: " + cliente + "     |     Operação: " + oper + "     |     Data de envio: " + dataBR(p.hoje);
    w1.mergeCells("A7:I7"); w1.getCell("A7").value = { formula: '"Progresso:   "&COUNTIFS(C10:C300,"Obrigatório*",H10:H300,"Recebido")+COUNTIFS(C10:C300,"Obrigatório*",H10:H300,"Conferido")&" de "&COUNTIF(C10:C300,"Obrigatório*")&" documentos OBRIGATÓRIOS recebidos"' }; w1.getCell("A7").font = { bold: true, color: { argb: navy } };
    var hdr = w1.getRow(9); ["Nº", "Documento / Informação", "Obrigatoriedade", "Responsável", "Onde obter / Como", "Formato", "Validade / Atualização", "Status", "Observações"].forEach(function (h, i) { var x = hdr.getCell(i + 1); x.value = h; x.font = { bold: true, color: { argb: white } }; x.fill = { type: "pattern", pattern: "solid", fgColor: { argb: navy } }; x.alignment = { vertical: "middle", wrapText: true }; }); hdr.height = 22;
    var r = 10;
    Object.keys(base.kit_cats).forEach(function (cat) {
      w1.mergeCells(r, 1, r, 9); var cc = w1.getCell(r, 1); cc.value = cat + " — " + base.kit_cats[cat]; cc.font = { bold: true, color: { argb: navy } }; cc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: band } }; r++;
      base.kit.filter(function (i) { return i.cat === cat; }).forEach(function (it) {
        var k = c.kit[it.id] || {}, st = k.status || (it.auto && num(op.valor_equip) ? "conferido" : "pendente");
        var obs = [it.obs].concat((k.check && k.check.msgs || []).map(function (m) { return m[1]; })).filter(Boolean).join(" · ");
        var row = w1.getRow(r); [it.n, it.nome, it.ob, it.resp, it.onde, it.fmt, it.val, STATUS_KIT[st], obs].forEach(function (v, j) { row.getCell(j + 1).value = v; row.getCell(j + 1).alignment = { wrapText: true, vertical: "top" }; row.getCell(j + 1).border = { bottom: { style: "thin", color: { argb: "FFDDE3EB" } } }; });
        row.getCell(8).fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } }; row.getCell(8).dataValidation = { type: "list", allowBlank: true, formulae: ['"Pendente,Solicitado,Recebido,Conferido,Vencido,Não se aplica"'] };
        if (/^Obrigat/.test(it.ob)) row.getCell(3).font = { bold: true };
        r++;
      });
    });
    w1.mergeCells(r + 1, 1, r + 1, 9); w1.getCell(r + 1, 1).value = "Orientação geral — as exigências e validades podem variar conforme o agente financeiro e o BNDES. A aprovação e as condições finais são decisão do agente financeiro e do BNDES."; w1.getCell(r + 1, 1).font = { italic: true, size: 9 };
    // Cadastro
    var w2 = wb.addWorksheet("Cadastro do Cliente", { views: [{ showGridLines: false }] }); w2.getColumn(1).width = 3; w2.getColumn(2).width = 42; w2.getColumn(3).width = 52; w2.getColumn(4).width = 44;
    cab(w2, 5, "CADASTRO DO CLIENTE — FINAME", 4); w2.getCell("B6").value = "Preencha os campos em amarelo. Estes dados alimentam o contrato e a análise do agente financeiro.";
    var blocos = [["DADOS DA EMPRESA", [["Razão social", cl.razao, "conforme contrato social / cartão CNPJ"], ["Nome fantasia", cl.fantasia], ["CNPJ", cl.cnpj, "00.000.000/0000-00"], ["Data de abertura", dataBR(cl.abertura)], ["CNAE principal (atividade)", cl.cnae], ["Porte", p.av.ctx.porte ? PORTES[p.av.ctx.porte] : "", "ME / EPP / Médio / Grande"], ["Regime tributário", { simples: "Simples Nacional", presumido: "Lucro Presumido", real: "Lucro Real" }[cl.regime] || "", "Simples / Lucro Presumido / Lucro Real"], ["Endereço completo da sede", [cl.endereco, cl.municipio, cl.uf, cl.cep].filter(Boolean).join(", "), "logradouro, nº, complemento, bairro, cidade/UF, CEP"], ["Telefone", cl.telefone], ["E-mail", cl.email], ["Site", cl.site]]],
      ["CONTATO RESPONSÁVEL (interlocução)", [["Nome", (cl.contato || {}).nome], ["Cargo", (cl.contato || {}).cargo], ["Telefone / WhatsApp", (cl.contato || {}).tel], ["E-mail", (cl.contato || {}).email]]],
      ["REPRESENTANTE LEGAL (assinatura do contrato)", [["Nome", (cl.rep || {}).nome], ["CPF", "", "000.000.000-00"], ["RG / órgão emissor", ""], ["Cargo", (cl.rep || {}).cargo], ["Nacionalidade / estado civil / profissão", (cl.rep || {}).qualif]]],
      ["DADOS FINANCEIROS (resumo)", [["Faturamento dos últimos 12 meses (R$)", num(cl.rob)], ["Número de funcionários", num(cl.funcionarios)], ["Endividamento bancário atual (R$)", num(cl.endividamento)], ["Possui restrições / pendências fiscais?", cl.restricoes === "sim" ? "Sim" : cl.restricoes === "nao" ? "Não" : "", "Sim / Não — se sim, detalhar"], ["Banco de relacionamento principal", cl.banco_rel]]],
      ["DADOS DA OPERAÇÃO (FINAME)", [["Equipamento(s) a adquirir", eq.modelo, "modelo / descrição"], ["Fornecedor", op.fornecedor], ["Valor total do investimento (R$)", p.av.ctx.invest || null], ["Valor a financiar (R$)", s ? s.P : p.av.ctx.fin], ["Prazo desejado (meses)", num(op.prazo)], ["Carência desejada (meses)", num(op.carencia), "FINAME admite carência de até 24 meses"], ["Já operou com BNDES / FINAME?", cl.ja_bndes === "sim" ? "Sim" : cl.ja_bndes === "nao" ? "Não" : "", "Sim / Não"], ["Banco pretendido para a operação", op.banco_pretendido]]]];
    var rr = 8;
    blocos.forEach(function (b) {
      w2.mergeCells(rr, 2, rr, 4); w2.getCell(rr, 2).value = b[0]; w2.getCell(rr, 2).font = { bold: true, color: { argb: white } }; w2.getCell(rr, 2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: navy } }; rr++;
      var h = w2.getRow(rr); ["Campo", "Resposta", "Observação"].forEach(function (x, i) { h.getCell(i + 2).value = x; h.getCell(i + 2).font = { bold: true, color: { argb: navy } }; h.getCell(i + 2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: band } }; }); rr++;
      b[1].forEach(function (f) { var row = w2.getRow(rr); row.getCell(2).value = f[0]; row.getCell(3).value = f[1] == null || f[1] === "—" ? "" : f[1]; row.getCell(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } }; if (typeof f[1] === "number") row.getCell(3).numFmt = "#,##0"; row.getCell(4).value = f[2] || ""; row.getCell(4).font = { size: 9, color: { argb: "FF4D5B72" } }; rr++; });
      rr++;
    });
    // Dicas
    var w3 = wb.addWorksheet("Dicas de Aprovação", { views: [{ showGridLines: false }] }); w3.getColumn(1).width = 3; w3.getColumn(2).width = 4; w3.getColumn(3).width = 120;
    cab(w3, 5, "DICAS PARA MAXIMIZAR A APROVAÇÃO E REDUZIR O PRAZO", 3);
    var dicas = [["Antes de começar", ["Confirme o Código FINAME (CFI) do equipamento ANTES de tudo — sem CFI (bem novo, nacional e credenciado), não há FINAME.", "Verifique pendências fiscais e trabalhistas logo no início — a regularização de certidões é o maior gargalo de prazo.", "Reúna as demonstrações financeiras assinadas pelo contador e coerentes com o faturamento declarado."]],
      ["Montagem do kit", ["Padronize tudo em PDF e nomeie os arquivos por categoria e item (ex.: 'C09_CND_Federal.pdf').", "Emita as certidões o mais próximo possível do protocolo — elas vencem rápido (CRF: 30 dias; CND federal e CNDT: 180 dias).", "Tenha a proforma do fornecedor detalhada (modelo, valor, código FINAME e condições de fornecimento).", "Inclua uma descrição clara da finalidade do investimento — ajuda no enquadramento."]],
      ["Aumentar a chance de aceite", ["Demonstre a capacidade de pagamento (faturamento x parcela) de forma consistente.", "Defina as garantias cedo: aval dos sócios + alienação fiduciária do bem; FGI quando necessário.", "Mantenha a situação cadastral do CNPJ ATIVA e os dados atualizados.", "Responda rápido às exigências do banco — diligências paradas atrasam a liberação."]],
      ["Prazos e expectativa", ["O prazo de análise costuma variar de 15 a 60 dias, conforme a complexidade e a agilidade nas respostas.", "O FINAME tem IOF com alíquota zero e admite carência de até 24 meses — alinhe isso com o cliente.", "A aprovação e as condições finais (taxa, prazo, garantias) são decisão do agente financeiro e do BNDES."]]];
    var r3 = 7; dicas.forEach(function (d) { w3.getCell(r3, 2).value = d[0]; w3.getCell(r3, 2).font = { bold: true, color: { argb: navy }, size: 12 }; r3++; d[1].forEach(function (x) { w3.getCell(r3, 2).value = "•"; w3.getCell(r3, 3).value = x; w3.getCell(r3, 3).alignment = { wrapText: true }; r3++; }); r3++; });
    return wb.xlsx.writeBuffer();
  }

  /* ---------- Minuta do contrato ---------- */
  function contrato(p, rep, docx) {
    var c = p.caso, cl = c.cliente, op = c.operacao, eq = op.equipamento || {}, s = p.sim;
    var hon = num(c.honorario_pct) == null ? 2 : num(c.honorario_pct), valor = num(op.valor_equip) || 0, linha = rep.linha || "BNDES FINAME";
    var lin = /FINAME/i.test(linha) ? "BNDES FINAME" : linha;
    var A = docx, F = "Calibri";
    function run(txt, o) { o = o || {}; return new A.TextRun({ text: txt, bold: !!o.b, italics: !!o.i, size: o.size || 21, font: F, color: o.color }); }
    function para(parts, o) { o = o || {}; return new A.Paragraph({ children: (Array.isArray(parts) ? parts : [parts]).map(function (x) { return typeof x === "string" ? run(x) : x; }), alignment: o.align || A.AlignmentType.JUSTIFIED, spacing: { after: o.after == null ? 120 : o.after, line: 276 }, indent: o.indent ? { left: o.indent } : undefined }); }
    function tit(txt) { return new A.Paragraph({ children: [run(txt, { b: true, color: "1C2B4A" })], spacing: { before: 200, after: 120 } }); }
    function vazio(x, ph) { return x ? x : "[" + ph + " — a confirmar]"; }
    var cpf = rep.cpf ? "inscrito no CPF sob o nº " + rep.cpf : "inscrito no CPF sob o nº [a confirmar]";
    var rg = rep.rg ? "portador do RG nº " + rep.rg : "portador do RG nº [a confirmar]";
    var dataAss = rep.data ? (function () { var d = new Date(rep.data + "T12:00:00"); return "São Paulo, " + d.getDate() + " de " + ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"][d.getMonth()] + " de " + d.getFullYear() + "."; })() : "São Paulo, ____ de ______________ de 20____.";
    var objeto = "1.1. O presente Contrato tem por objeto a prestação, pela CONTRATADA, de serviços de assessoria e intermediação para a obtenção, pela CONTRATANTE, de crédito na linha " + lin + ", destinado à aquisição do " + vazio(eq.descricao || eq.modelo, "equipamento") + ", fabricado por " + (eq.fabricante ? eq.fabricante.toUpperCase() : SS.vmi) + (/vmi/i.test(eq.fabricante || "VMI") ? " (CNPJ " + SS.vmiCnpj + ")" : "") + ", com Código FINAME (CFI) nº " + vazio(eq.cfi, "CFI") + ", no valor total de R$ " + valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + " (" + reais(valor) + "), conforme proposta comercial do fornecedor, junto a instituição(ões) financeira(s) credenciada(s) — agente(s) financeiro(s) — do BNDES (a “Operação”).";
    var P_ = [
      new A.Paragraph({ children: [new A.ImageRun({ data: bytes(LOGO.navy), transformation: { width: Math.round(64 * LOGO.ratio), height: 64 } })], alignment: A.AlignmentType.LEFT, spacing: { after: 80 } }),
      para([run("DSJ Representações Ltda • CNPJ " + SS.cnpj, { size: 17, color: "4D5B72" })], { align: A.AlignmentType.LEFT, after: 0 }),
      para([run(SS.end, { size: 17, color: "4D5B72" })], { align: A.AlignmentType.LEFT, after: 300 }),
      new A.Paragraph({ children: [run("CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE INTERMEDIAÇÃO PARA CAPTAÇÃO DE CRÉDITO " + (/FINAME/i.test(lin) ? "FINAME/BNDES" : lin.toUpperCase()), { b: true, size: 24, color: "1C2B4A" })], alignment: A.AlignmentType.CENTER, spacing: { after: 300 } }),
      para("Pelo presente instrumento particular, as partes a seguir qualificadas:"),
      para([run("CONTRATADA: ", { b: true }), run("DSJ REPRESENTAÇÕES LTDA, sociedade empresária limitada inscrita no CNPJ sob o nº " + SS.cnpj + ", com sede na Rua Arizona, 1366, Conjunto 81, Cidade Monções, São Paulo/SP, CEP 04567-003, que opera no mercado sob o nome S&S Partners, neste ato representada na forma de seu contrato social, doravante denominada simplesmente “CONTRATADA”; e")]),
      para([run("CONTRATANTE: ", { b: true }), run(vazio(cl.razao, "razão social").toUpperCase() + (cl.fantasia ? " (nome fantasia " + cl.fantasia + ")" : "") + ", " + (cl.natureza === "filantropica" ? "entidade sem fins lucrativos" : "sociedade empresária") + " inscrita no CNPJ sob o nº " + vazio(cl.cnpj, "CNPJ") + ", com sede na " + vazio([cl.endereco, cl.municipio && cl.uf ? cl.municipio + "/" + cl.uf : cl.municipio].filter(Boolean).join(", "), "endereço") + (cl.cep ? ", CEP " + cl.cep : "") + ", neste ato representada por " + vazio((cl.rep || {}).nome, "representante") + ", " + (rep.qualif || "[nacionalidade, estado civil, profissão — a confirmar]") + ", " + ((cl.rep || {}).cargo || "representante legal").toLowerCase() + ", " + rg + " e " + cpf + (cl.email ? ", com endereço eletrônico " + cl.email : "") + ", doravante denominada simplesmente “CONTRATANTE”.")]),
      para("CONTRATADA e CONTRATANTE são doravante referidas, em conjunto, como “Partes” e, individualmente, como “Parte”, e resolvem celebrar o presente Contrato de Prestação de Serviços de Intermediação (“Contrato”), que se regerá pelas cláusulas e condições a seguir."),
      tit("CLÁUSULA 1 — DO OBJETO"), para(objeto),
      para("1.2. Os serviços compreendem o auxílio na organização da documentação, a interlocução com o agente financeiro e o acompanhamento do processo até o efetivo desembolso do crédito, conforme escopo detalhado na Cláusula 2."),
      para("1.3. A CONTRATADA atua exclusivamente como prestadora de serviços de assessoria e intermediação, não se confundindo com instituição financeira, agente financeiro, correspondente bancário ou garantidora da Operação. A análise, a aprovação e a concessão do crédito são de competência exclusiva do agente financeiro e do BNDES, de modo que a CONTRATADA não assegura, não garante e não pode ser responsabilizada pela aprovação ou pelos termos finais do crédito."),
      tit("CLÁUSULA 2 — DO ESCOPO DOS SERVIÇOS"),
      para("2.1. Assessoria documental. A CONTRATADA orientará a CONTRATANTE na identificação, organização e preparação do conjunto de documentos usualmente exigido pelo agente financeiro e pelo BNDES (o “Kit de Documentos”), o qual compreende, de forma exemplificativa e não exaustiva:")
    ];
    var kitTxt = [["(a) Documentos societários e cadastrais", ["Contrato social ou estatuto social e respectivas alterações consolidadas;", "Ata de eleição da administração/diretoria em vigor, quando aplicável;", "Comprovante de inscrição e situação cadastral no CNPJ (cartão CNPJ);", "Comprovante de endereço da sede da CONTRATANTE."]],
      ["(b) Documentos dos sócios e representantes legais", ["Documento de identidade (RG) e CPF dos sócios, administradores e signatários;", "Comprovante de residência dos sócios e administradores;", "Declaração de participações societárias, quando solicitada."]],
      ["(c) Regularidade fiscal e certidões", ["Certidão Negativa de Débitos relativos a Tributos Federais e à Dívida Ativa da União (Receita Federal/PGFN);", "Certificado de Regularidade do FGTS (CRF);", "Certidão Negativa de Débitos Trabalhistas (CNDT);", "Certidões negativas de débitos estaduais e municipais."]],
      ["(d) Documentos econômico-financeiros", ["Demonstrações financeiras dos últimos exercícios (Balanço Patrimonial e Demonstração de Resultado);", "Balancete recente e relação/declaração de faturamento;", "Demonstrativo de endividamento bancário e autorização para consulta ao Sistema de Informações de Crédito (SCR/Bacen)."]],
      ["(e) Documentos da Operação e do bem", ["Proposta comercial ou orçamento (proforma) do fornecedor dos equipamentos médicos;", "Comprovação do Código FINAME (CFI) dos equipamentos, atestando tratar-se de bens novos, de fabricação nacional e credenciados no Sistema BNDES;", "Descrição do investimento e de sua finalidade."]],
      ["(f) Garantias", ["Documentação relativa às garantias exigidas pelo agente financeiro, tais como aval dos sócios, alienação fiduciária do bem financiado e/ou adesão a fundo garantidor, conforme o perfil da Operação."]]];
    kitTxt.forEach(function (g) { P_.push(para([run(g[0], { b: true })], { after: 60 })); g[1].forEach(function (x) { P_.push(para("–  " + x, { indent: 360, after: 40 })); }); });
    var resto = [
      ["p", "2.1.1. A relação acima é referencial; a lista definitiva e os critérios poderão variar conforme o agente financeiro, o porte da CONTRATANTE e as políticas vigentes do BNDES. A CONTRATADA manterá a CONTRATANTE informada quanto às exigências específicas de cada etapa."],
      ["p", "2.2. Interlocução com a instituição financeira. A CONTRATADA realizará o contato e a interlocução técnica com o(s) agente(s) financeiro(s) credenciado(s), apresentando a Operação, encaminhando a documentação e atuando como ponto de coordenação entre a CONTRATANTE e a instituição, com vistas à protocolização e ao andamento do pedido de financiamento."],
      ["p", "2.3. Acompanhamento e intermediação. A CONTRATADA acompanhará o processo em suas diversas fases — protocolo, análise de crédito, eventuais diligências e exigências complementares, formalização contratual e liberação — atuando na intermediação e no suporte à CONTRATANTE até a obtenção e o desembolso do crédito " + (/FINAME/i.test(lin) ? "FINAME" : lin) + "."],
      ["p", "2.4. Exclusões. Não integram o escopo deste Contrato, correndo por conta exclusiva da CONTRATANTE: (i) taxas, tarifas e custos cobrados pelo agente financeiro e pelo BNDES; (ii) emolumentos cartorários, custos de certidões, registros e reconhecimentos de firma; (iii) tributos incidentes sobre a Operação; (iv) constituição de garantias; e (v) quaisquer obrigações decorrentes do contrato de financiamento, que será celebrado diretamente entre a CONTRATANTE e o agente financeiro."],
      ["t", "CLÁUSULA 3 — DAS OBRIGAÇÕES DA CONTRATADA"], ["p", "3.1. Executar os serviços com diligência, zelo técnico e em conformidade com as melhores práticas de mercado."], ["p", "3.2. Orientar a CONTRATANTE quanto à documentação e às etapas do processo, mantendo-a informada sobre o andamento da Operação."], ["p", "3.3. Tratar com confidencialidade as informações da CONTRATANTE, nos termos da Cláusula 7."], ["p", "3.4. Atuar com transparência e boa-fé, comunicando eventuais impedimentos ou riscos identificados ao longo do processo."],
      ["t", "CLÁUSULA 4 — DAS OBRIGAÇÕES DA CONTRATANTE"], ["p", "4.1. Fornecer, de forma completa, tempestiva e fidedigna, todos os documentos e informações necessários à instrução da Operação, responsabilizando-se por sua veracidade e atualização."], ["p", "4.2. Manter sua regularidade fiscal, trabalhista e cadastral durante todo o processo."], ["p", "4.3. Arcar com as despesas e custos referidos na Cláusula 2.4."], ["p", "4.4. Não negociar diretamente com o agente financeiro indicado ou apresentado pela CONTRATADA, no âmbito da Operação, sem a ciência da CONTRATADA, de modo a preservar a remuneração pactuada na Cláusula 5."], ["p", "4.5. Efetuar o pagamento da remuneração nos termos e prazos da Cláusula 5."],
      ["t", "CLÁUSULA 5 — DA REMUNERAÇÃO"],
      ["p", "5.1. Pelos serviços objeto deste Contrato, a CONTRATANTE pagará à CONTRATADA remuneração exclusivamente sob a forma de taxa de êxito (success fee), correspondente a " + String(hon).replace(".", ",") + "% (" + pctExt(hon) + ") sobre o valor total do crédito " + (/FINAME/i.test(lin) ? "FINAME" : lin) + " efetivamente desembolsado em favor da CONTRATANTE ou de seu fornecedor."],
      ["p", "5.2. A remuneração é devida apenas em caso de êxito, assim entendido o efetivo desembolso do crédito. Não havendo desembolso, nenhuma remuneração será devida pela prestação dos serviços, ressalvado o reembolso de despesas previamente autorizadas por escrito (Cláusula 5.5)."],
      ["p", "5.3. O pagamento acompanhará o fluxo de desembolso do crédito: havendo liberações parciais ou em parcelas pelo agente financeiro, a remuneração será proporcionalmente devida e faturada a cada desembolso, no percentual de " + String(hon).replace(".", ",") + "% sobre o respectivo valor liberado. A CONTRATANTE efetuará o pagamento em até 5 (cinco) dias úteis contados de cada desembolso, mediante apresentação da respectiva nota fiscal/fatura."],
      ["p", "5.4. Os valores indicados não incluem tributos incidentes sobre a prestação dos serviços, que serão acrescidos na forma da legislação aplicável."], ["p", "5.5. Despesas extraordinárias e comprovadas, tais como viagens e diligências fora da cidade de São Paulo, serão reembolsadas pela CONTRATANTE, desde que prévia e expressamente autorizadas por escrito."],
      ["p", "5.6. Cláusula de proteção. Caso, no prazo de 12 (doze) meses contados do término ou da rescisão deste Contrato, a CONTRATANTE venha a contratar o crédito " + (/FINAME/i.test(lin) ? "FINAME" : lin) + " com agente financeiro apresentado ou intermediado pela CONTRATADA durante a vigência deste Contrato, permanecerá devida a remuneração prevista na Cláusula 5.1, calculada sobre os valores desembolsados."],
      ["p", "5.7. O atraso no pagamento sujeitará a CONTRATANTE a multa de 2% (dois por cento) sobre o valor em atraso, juros de mora de 1% (um por cento) ao mês e correção monetária pelo IPCA."],
      ["t", "CLÁUSULA 6 — DO PRAZO E DA VIGÊNCIA"], ["p", "6.1. Este Contrato vigorará a partir da data de sua assinatura até a conclusão da Operação, com o integral desembolso do crédito e o cumprimento das obrigações de pagamento dele decorrentes."], ["p", "6.2. Qualquer das Partes poderá resolver o Contrato mediante notificação por escrito com antecedência mínima de 15 (quinze) dias, preservados o disposto na Cláusula 5.6 e as obrigações de confidencialidade."],
      ["t", "CLÁUSULA 7 — DA CONFIDENCIALIDADE"], ["p", "7.1. As Partes obrigam-se a manter sob sigilo todas as informações de natureza confidencial a que tiverem acesso em razão deste Contrato, utilizando-as exclusivamente para os fins aqui previstos."], ["p", "7.2. A obrigação de confidencialidade vigora durante a vigência do Contrato e por 48 (quarenta e oito) meses após o seu término, ressalvadas as hipóteses de informação já pública, de domínio anterior comprovado, ou de divulgação exigida por lei ou autoridade competente."],
      ["t", "CLÁUSULA 8 — DA PROPRIEDADE INTELECTUAL"], ["p", "8.1. Os entregáveis produzidos especificamente para a CONTRATANTE no âmbito deste Contrato a ela pertencerão, após a quitação da remuneração devida."], ["p", "8.2. Ressalva-se da cessão prevista na Cláusula 8.1 todo e qualquer conhecimento, metodologia, modelo, ferramenta, base de dados, know-how e material preexistente ou de titularidade da CONTRATADA (a “Propriedade Intelectual S&S”), os quais permanecem de sua exclusiva titularidade, sendo concedida à CONTRATANTE apenas licença de uso não exclusiva e limitada à finalidade deste Contrato."],
      ["t", "CLÁUSULA 9 — DA PROTEÇÃO DE DADOS"], ["p", "9.1. As Partes comprometem-se a tratar os dados pessoais eventualmente compartilhados em estrita observância à Lei nº 13.709/2018 (LGPD), limitando o tratamento às finalidades deste Contrato e adotando medidas adequadas de segurança e confidencialidade."],
      ["t", "CLÁUSULA 10 — DA RESCISÃO"], ["p", "10.1. O Contrato poderá ser rescindido: (i) por acordo entre as Partes; (ii) por iniciativa de qualquer Parte, na forma da Cláusula 6.2; ou (iii) por descumprimento de obrigação contratual não sanado em 10 (dez) dias contados de notificação escrita."], ["p", "10.2. A rescisão não prejudica a remuneração já devida nem as obrigações de confidencialidade, de propriedade intelectual e a cláusula de proteção (Cláusula 5.6)."],
      ["t", "CLÁUSULA 11 — DAS DISPOSIÇÕES GERAIS"], ["p", "11.1. Este Contrato não estabelece vínculo societário, empregatício ou de exclusividade entre as Partes além do expressamente previsto, atuando a CONTRATADA como prestadora de serviços autônoma."], ["p", "11.2. A tolerância quanto ao descumprimento de qualquer obrigação não implicará novação ou renúncia de direitos."], ["p", "11.3. A eventual nulidade de qualquer cláusula não afetará a validade das demais."], ["p", "11.4. Alterações somente terão validade se formalizadas por escrito e assinadas pelas Partes, admitida a assinatura eletrônica."],
      ["t", "CLÁUSULA 12 — DO FORO"], ["p", "12.1. As Partes elegem o foro da Comarca de São Paulo/SP para dirimir quaisquer controvérsias decorrentes deste Contrato, com renúncia a qualquer outro, por mais privilegiado que seja."],
      ["p", "E, por estarem assim justas e contratadas, as Partes firmam o presente instrumento em duas vias de igual teor e forma."]
    ];
    resto.forEach(function (x) { P_.push(x[0] === "t" ? tit(x[1]) : para(x[1])); });
    P_.push(para(dataAss, { align: A.AlignmentType.LEFT, after: 500 }));
    P_.push(para("_______________________________________________", { align: A.AlignmentType.LEFT, after: 0 }));
    P_.push(para([run("DSJ REPRESENTAÇÕES LTDA (S&S Partners) — CONTRATADA", { b: true })], { align: A.AlignmentType.LEFT, after: 0 }));
    P_.push(para("Thiago Speranzini — Sócio-Diretor", { align: A.AlignmentType.LEFT, after: 500 }));
    P_.push(para("_______________________________________________", { align: A.AlignmentType.LEFT, after: 0 }));
    P_.push(para([run(vazio(cl.razao, "razão social").toUpperCase() + (cl.fantasia ? " (" + cl.fantasia + ")" : "") + " — CONTRATANTE", { b: true })], { align: A.AlignmentType.LEFT, after: 0 }));
    P_.push(para(vazio((cl.rep || {}).nome, "representante") + " — " + ((cl.rep || {}).cargo || "Representante legal"), { align: A.AlignmentType.LEFT, after: 400 }));
    P_.push(para([run("Testemunhas:", { b: true })], { align: A.AlignmentType.LEFT }));
    var cel = function (n) { return new A.TableCell({ borders: { top: { style: A.BorderStyle.NONE }, bottom: { style: A.BorderStyle.NONE }, left: { style: A.BorderStyle.NONE }, right: { style: A.BorderStyle.NONE } }, width: { size: 50, type: A.WidthType.PERCENTAGE }, children: [para(n + ". ____________________________", { align: A.AlignmentType.LEFT, after: 60 }), para("Nome:", { align: A.AlignmentType.LEFT, after: 60 }), para("CPF:", { align: A.AlignmentType.LEFT, after: 60 })] }); };
    P_.push(new A.Table({ width: { size: 100, type: A.WidthType.PERCENTAGE }, rows: [new A.TableRow({ children: [cel(1), cel(2)] })] }));
    var d = new A.Document({ creator: "S&S Partners", title: "Contrato de intermediação FINAME – " + (cl.fantasia || cl.razao || ""), sections: [{ properties: { page: { margin: { top: 1134, bottom: 1134, left: 1247, right: 1247 } } }, children: P_ }] });
    return A.Packer.toBlob ? A.Packer.toBlob(d) : A.Packer.toBuffer(d);
  }

  return { estudo: estudo, dossie: dossie, kit: kit, contrato: contrato, reais: reais, pctExt: pctExt };
})();
if (typeof module !== "undefined") module.exports = Docs;
