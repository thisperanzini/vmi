/* ====================================================================
   Aplicação — estado, persistência, renderização das abas.
   ==================================================================== */
(function () {
  'use strict';
  var E = Engine, M = Motor, BASE = BASE_PADRAO;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  var NF0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  var NF2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function R(v) { if (v == null || !isFinite(v)) return '—'; return (v < 0 ? '−' : '') + 'R$ ' + NF0.format(Math.abs(Math.round(v))); }
  function Rm(v) { if (v == null || !isFinite(v)) return '—'; return (v < 0 ? '−' : '') + 'R$ ' + NF0.format(Math.abs(Math.round(v))) ; }
  function mi(v) { if (v == null || !isFinite(v)) return '—'; var a = Math.abs(v); var s = a >= 1e6 ? NF2.format(a / 1e6) + ' mi' : a >= 1e3 ? NF0.format(a / 1e3) + ' mil' : NF0.format(a); return (v < 0 ? '−' : '') + 'R$ ' + s; }
  function P(v, d) { if (v == null || !isFinite(v)) return '—'; return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d == null ? 1 : d, maximumFractionDigits: d == null ? 1 : d }).format(v * 100) + '%'; }
  function Pp(v, d) { return v == null ? '—' : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d }).format(v) + '%'; }
  function N(v, d) { if (v == null || !isFinite(v)) return '—'; return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }).format(v); }
  function X(v, d) { return v == null || !isFinite(v) ? '—' : N(v, d == null ? 2 : d) + 'x'; }
  function anos(v) { return v == null ? 'não retorna' : N(v, 1) + ' anos'; }
  function sinal(v) { return v == null ? '' : v >= 0 ? 'pos' : 'neg'; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  var toastT; function toast(s) { var t = $('#toast'); t.textContent = s; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 3200); }
  function parseBR(s) { if (typeof s === 'number') return s; s = String(s == null ? '' : s).trim().replace(/[R$\s%]/g, ''); if (!s) return 0; if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.'); return Number(s) || 0; }
  var ORIG = { controladoria: 'Controladoria', jaime: 'Jaime', deck: 'Conselho', fonte: 'Fonte pública', ss: 'S&S', pendente: 'A validar' };
  var LINHAS_NOME = {}; BASE.linhas.forEach(function (l) { LINHAS_NOME[l.id] = l.nome; });

  /* ---------------- estado ---------------- */
  var model = modeloPadrao(), saved = clone(model), sim = null, calc = null, simCalc = null;
  var dirty = false, db = null, userCap = null, downloads = null, canWrite = null, dbState = 'carregando', versoes = [], vendoVersao = null;
  var tab = 'tese', saveT = null, ultimoSalvoEm = null;

  function sane(m) {
    var d = modeloPadrao(), out = clone(d);
    if (!m || typeof m !== 'object') return out;
    SCHEMA.forEach(function (s) { var v = getPath(m, s.id); if (v !== undefined && v !== null) setPath(out, s.id, v); });
    if (m.equip) { if (Array.isArray(m.equip.B)) out.equip.B = clone(m.equip.B); if (Array.isArray(m.equip.C)) out.equip.C = clone(m.equip.C); if (m.equip.B_n) out.equip.B_n = m.equip.B_n; }
    if (m.entidade && Array.isArray(m.entidade.emprestimos)) out.entidade.emprestimos = clone(m.entidade.emprestimos);
    if (m.altC) { if (m.altC.custo) out.altC.custo = m.altC.custo; if (m.altC.valor_obra != null) out.altC.valor_obra = m.altC.valor_obra; if (m.altC.valor_financiar !== undefined) out.altC.valor_financiar = m.altC.valor_financiar; }
    return out;
  }
  function recompute() { calc = E.calcular(model, M, BASE); }
  function recomputeSim() { simCalc = E.calcular(sim, M, BASE); }
  function markDirty() { dirty = JSON.stringify(model) !== JSON.stringify(saved); $('#btnDesfazer').hidden = !dirty; renderSync(); if (dirty) agendarAutoSave(); }
  function afterEdit() { recompute(); markDirty(); renderAll(); }

  /* ---------------- gráficos SVG ---------------- */
  function niceMax(v) { if (v <= 0) return 1; var p = Math.pow(10, Math.floor(Math.log10(v))); var f = v / p; var n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10; return n * p; }
  function svgLines(opts) {
    /* opts: {cats:[], series:[{nome, vals:[], cor}], h, fmt, ref:{v,label}} */
    var W = 720, H = opts.h || 240, pl = 64, pr = 12, pt = 14, pb = 30, iw = W - pl - pr, ih = H - pt - pb;
    var all = []; opts.series.forEach(function (s) { all = all.concat(s.vals.filter(function (v) { return v != null; })); }); if (opts.ref) all.push(opts.ref.v);
    var mx = niceMax(Math.max.apply(null, all.concat([0]))), mn = Math.min.apply(null, all.concat([0])); mn = mn < 0 ? -niceMax(-mn) : 0;
    var y = function (v) { return pt + ih - (v - mn) / (mx - mn) * ih; }, x = function (i) { return pl + (opts.cats.length > 1 ? i / (opts.cats.length - 1) * iw : iw / 2); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.aria || '') + '">';
    var ticks = 4; for (var k = 0; k <= ticks; k++) { var v = mn + (mx - mn) * k / ticks; s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="var(--grid)"/><text x="' + (pl - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + esc(opts.fmt(v)) + '</text>'; }
    if (mn < 0) s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(0) + '" y2="' + y(0) + '" stroke="var(--fg-3)"/>';
    if (opts.ref) s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(opts.ref.v) + '" y2="' + y(opts.ref.v) + '" stroke="var(--bad)" stroke-dasharray="4 3"/><text x="' + (W - pr) + '" y="' + (y(opts.ref.v) - 4) + '" text-anchor="end" fill="var(--bad)">' + esc(opts.ref.label) + '</text>';
    opts.cats.forEach(function (c, i) { if (opts.cats.length > 12 && i % 2) return; s += '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(c) + '</text>'; });
    opts.series.forEach(function (se) {
      var d = ''; se.vals.forEach(function (v, i) { if (v == null) return; d += (d ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1); });
      s += '<path d="' + d + '" fill="none" stroke="' + se.cor + '" stroke-width="2.2"' + (se.dash ? ' stroke-dasharray="5 4"' : '') + '/>';
      se.vals.forEach(function (v, i) { if (v == null) return; s += '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="3" fill="' + se.cor + '"/>'; });
    });
    s += '</svg><div class="legend">' + opts.series.map(function (se) { return '<span><i class="line" style="background:' + se.cor + '"></i>' + esc(se.nome) + '</span>'; }).join('') + (opts.ref ? '<span><i class="line" style="background:var(--bad)"></i>' + esc(opts.ref.label) + '</span>' : '') + '</div>';
    return s;
  }
  function svgBars(opts) {
    /* grouped bars: cats[], series[{nome, vals, cor}], allows negatives */
    var W = 720, H = opts.h || 240, pl = 64, pr = 12, pt = 14, pb = 30, iw = W - pl - pr, ih = H - pt - pb;
    var all = []; opts.series.forEach(function (s) { all = all.concat(s.vals); });
    var mx = niceMax(Math.max.apply(null, all.concat([0]))), mn = Math.min.apply(null, all.concat([0])); mn = mn < 0 ? -niceMax(-mn) : 0;
    var y = function (v) { return pt + ih - (v - mn) / (mx - mn) * ih; };
    var n = opts.cats.length, gw = iw / n, bw = Math.min(42, gw * 0.7 / opts.series.length);
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.aria || '') + '">';
    for (var k = 0; k <= 4; k++) { var v = mn + (mx - mn) * k / 4; s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="var(--grid)"/><text x="' + (pl - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + esc(opts.fmt(v)) + '</text>'; }
    s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(0) + '" y2="' + y(0) + '" stroke="var(--fg-3)"/>';
    opts.cats.forEach(function (c, i) {
      var cx = pl + gw * i + gw / 2, tot = opts.series.length * bw, x0 = cx - tot / 2;
      opts.series.forEach(function (se, j) { var v = se.vals[i] || 0; var top = Math.min(y(0), y(v)), h = Math.abs(y(v) - y(0)); s += '<rect x="' + (x0 + j * bw) + '" y="' + top + '" width="' + (bw - 2) + '" height="' + h + '" fill="' + se.cor + '" rx="2"/>'; if (opts.labels) s += '<text x="' + (x0 + j * bw + bw / 2 - 1) + '" y="' + (v >= 0 ? top - 4 : top + h + 11) + '" text-anchor="middle">' + esc(opts.fmt(v)) + '</text>'; });
      s += '<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(c) + '</text>';
    });
    s += '</svg><div class="legend">' + opts.series.map(function (se) { return '<span><i style="background:' + se.cor + '"></i>' + esc(se.nome) + '</span>'; }).join('') + '</div>';
    return s;
  }
  function svgTornado(itens, fmt) {
    var W = 720, rowH = 34, pl = 230, pr = 70, H = itens.length * rowH + 30, iw = W - pl - pr;
    var mx = 0; itens.forEach(function (i) { mx = Math.max(mx, Math.abs(i.lo), Math.abs(i.hi)); }); mx = niceMax(mx || 1);
    var x = function (v) { return pl + iw / 2 + v / mx * iw / 2; };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Sensibilidade do VPL">';
    s += '<line x1="' + x(0) + '" x2="' + x(0) + '" y1="8" y2="' + (H - 20) + '" stroke="var(--fg-3)"/>';
    itens.forEach(function (it, i) {
      var yy = 12 + i * rowH;
      s += '<text x="' + (pl - 10) + '" y="' + (yy + 16) + '" text-anchor="end" fill="var(--fg)">' + esc(it.nome) + '</text>';
      [['lo', 'var(--bad)'], ['hi', 'var(--good)']].forEach(function (p) { var v = it[p[0]]; if (v === 0) return; var cor = v < 0 ? 'var(--bad)' : 'var(--good)'; s += '<rect x="' + Math.min(x(0), x(v)) + '" y="' + (yy + 4) + '" width="' + Math.abs(x(v) - x(0)) + '" height="20" fill="' + cor + '" opacity=".75" rx="2"/>'; s += '<text x="' + (v < 0 ? x(v) - 4 : x(v) + 4) + '" y="' + (yy + 18) + '" text-anchor="' + (v < 0 ? 'end' : 'start') + '">' + esc(fmt(v)) + '</text>'; });
      s += '<text x="' + (pl - 10) + '" y="' + (yy + 29) + '" text-anchor="end" fill="var(--fg-3)" font-size="10">' + esc(it.loTxt + ' → ' + it.hiTxt) + '</text>';
    });
    s += '<text x="' + x(-mx) + '" y="' + (H - 4) + '">' + esc(fmt(-mx)) + '</text><text x="' + x(mx) + '" y="' + (H - 4) + '" text-anchor="end">' + esc(fmt(mx)) + '</text></svg>';
    return s;
  }

  function kpi(lab, v, sub, stripe, small) { return '<div class="kpi"><span class="stripe ' + (stripe || '') + '"></span><span class="lab">' + esc(lab) + '</span><span class="v ' + (small ? 'small' : '') + '">' + v + '</span>' + (sub ? '<span class="sub">' + sub + '</span>' : '') + '</div>'; }
  function pill(o) { return '<span class="pill o-' + o + '"><i></i>' + esc(ORIG[o] || o) + '</span>'; }

  /* ================= TESE ================= */
  function renderTese() {
    var c = calc, sel = c.sel, fl = c.flSel, altNome = sel.id === 'C' ? 'VMI/Alfamed' : 'GE/HFS', linha = c.C.escolha ? c.C.escolha.linha.nome : '—';
    var emg = c.cen.emg, prop = c.cen.prop, e27 = c.ent.linhas[0];
    var h = '<div class="card hero"><span class="eyebrow">Decisão pedida à diretoria e ao Conselho da ABENSENA</span>' +
      '<h2>Internalizar o serviço de imagem com equipamentos nacionais financiados em prazo longo, contratando depois da emissão do TDC</h2>' +
      '<p class="lead muted">O hospital já paga a estrutura (espaço, enfermagem, técnicos, administração) e repassa ' + P(emg.repasse / emg.rl, 0) + ' da receita à EMG. Internalizado, o mesmo volume vira resultado positivo. Os números abaixo são calculados ao vivo a partir das premissas salvas; os marcados "a validar" mudam o resultado e estão listados no fim.</p></div>';
    h += '<div class="grid kpis">' +
      kpi('Resultado atual com a EMG', '<span class="' + sinal(emg.resultado) + '">' + R(emg.resultado) + '</span>', 'por mês · ' + P(emg.resultado / emg.rl, 1) + ' da receita líquida', 'bad') +
      kpi('Resultado com imagem própria', '<span class="' + sinal(prop.resultado) + '">' + R(prop.resultado) + '</span>', 'por mês, antes das parcelas (ano 2 em diante)', 'good') +
      kpi('Ganho operacional', mi(c.ganhoMes * 12), 'por ano em regime · ' + R(c.ganhoMes) + '/mês', 'good') +
      kpi('Parcela do financiamento (' + altNome + ')', R(sel.parcela), sel.id === 'C' ? linha + ' · ' + (sel.n || '—') + ' meses, ' + (sel.c || 0) + ' de carência' : 'HFS/GE e fornecedores · 60 meses', '') +
      kpi('VPL do projeto', '<span class="' + sinal(fl.vpl) + '">' + mi(fl.vpl) + '</span>', 'a ' + P(model.fin.desconto, 0) + ' a.a. · ' + model.fin.horizonte + ' anos', fl.vpl > 0 ? 'good' : 'bad') +
      kpi('TIR · payback', (fl.tir == null ? '—' : P(fl.tir, 0)) + ' · ' + (fl.pb == null ? '—' : N(fl.pb, 1) + ' a'), 'payback descontado ' + (fl.pbDesc == null ? '—' : N(fl.pbDesc, 1) + ' anos'), 'good', true) +
      kpi('DSCR do hospital em ' + e27.ano, X(e27.dscrSemProj) + ' → ' + X(e27.dscrSem), 'sem o projeto → com o projeto, sem TDC · com TDC ' + X(e27.dscrCom), e27.dscrSem != null && e27.dscrSem < 1.3 ? 'warn' : 'good', true) +
      '</div>';
    var ach = [];
    ach.push('<b>Hoje o serviço dá prejuízo.</b> Receita líquida de ' + R(emg.rl) + '/mês; a EMG fica com ' + R(emg.repasse) + ' (' + P(emg.repasse / emg.rl, 0) + '), o hospital arca com ' + R(emg.cf_dir + emg.cf_ind) + ' de custos fixos e indiretos e fecha em ' + R(emg.resultado) + '/mês (' + mi(emg.resultado * 12) + '/ano).');
    ach.push('<b>Internalizar inverte o sinal com a mesma receita.</b> Mantida a equipe médica a ' + P(model.propria.rep_med_pct, 1) + ' da receita e assumidos material, manutenção (' + R(prop.manut) + '/mês) e RIS/PACS, o resultado vai a ' + R(prop.resultado) + '/mês. Ganho de ' + mi(c.ganhoMes * 12) + ' por ano, dos quais ' + mi(-emg.resultado * 12) + ' são a eliminação do prejuízo.');
    ach.push('<b>Investimento de ' + mi(sel.capex) + '</b> em TC 64/128, dois ultrassons, dois RX móveis e placa DR' + (sel.id === 'C' ? ', com ' + mi(sel.capexFin) + ' financiados pela linha <b>' + esc(linha) + '</b> (CET ' + Pp(sel.cetAno) + ' a.a., parcela de ' + R(sel.parcela) + ' após a carência; ' + R(sel.primeira) + ' na carência)' : ', financiado pelo HFS e fornecedores em 60x (' + R(sel.parcela) + '/mês, custo implícito ' + Pp(sel.cetAno) + ' a.a.)') + '. O pacote GE/HFS custa ' + Pp(c.B.cetAno) + ' a.a. implícitos em 60 meses, com preço indexado ao dólar.');
    ach.push('<b>Retorno.</b> VPL de ' + mi(fl.vpl) + ' a ' + P(model.fin.desconto, 0) + ' a.a. em ' + model.fin.horizonte + ' anos, TIR de ' + (fl.tir == null ? '—' : P(fl.tir, 0)) + ', payback de ' + anos(fl.pb) + '. Caixa acumulado para o hospital após as parcelas: ' + mi(fl.acumEnt) + ' no horizonte; DSCR mínimo do projeto ' + X(fl.dscrMin) + '.');
    ach.push('<b>A restrição é o crédito do hospital, não o projeto.</b> Dívida líquida de ' + mi(c.ent.dl) + ' (' + X(c.ent.dlEbitda, 1) + ' o EBITDA anualizado de ' + mi(c.ent.ebitdaBase) + '); o serviço da dívida de ' + e27.ano + ' (' + mi(e27.servAtual) + ') consome todo o EBITDA (DSCR ' + X(e27.dscrSemProj) + '). O projeto melhora a cobertura (' + X(e27.dscrSem) + ') e o TDC a resolve (' + X(e27.dscrCom) + '). Por isso a contratação deve vir depois da emissão do TDC, com carência longa.');
    var tcap = c.tc; ach.push('<b>Capacidade.</b> Uma TC a ' + model.propria.tc_exh + ' exames/h, ' + model.propria.tc_h + ' h/dia, faz ' + N(tcap.cap) + ' exames/mês; o volume de ' + N(tcap.tc) + ' TC/mês ocupa ' + P(tcap.ocup, 0) + '. Equipamento único: a transição com a EMG precisa de sobreposição.');
    h += '<div class="card"><div class="card-h"><h2>O que o modelo diz</h2><span class="muted small">alternativa ' + sel.id + ' · ' + altNome + ' · cenário de volume ' + (model.cenario.volume_var >= 0 ? '+' : '') + P(model.cenario.volume_var, 0) + '</span></div><ul class="bullets">' + ach.map(function (a) { return '<li>' + a + '</li>'; }).join('') + '</ul></div>';
    /* por que VMI */
    h += '<div class="grid two"><div class="card"><div class="card-h"><h2>Por que equipamento nacional</h2></div><div class="grid" style="gap:12px">' +
      '<div class="tile"><h3>FINAME exige CFI, e o catálogo decide item a item</h3><p>Verificado no Catálogo CFI do BNDES em 14/10/2026: RX móvel Aquila (03538400, 04279825) e ultrassom Alfa Med Dominus L1 (04313989) constam; <b>a TC Pulsar não consta</b>, e GE (CT Ascend, Aspire), Siemens, Philips, Canon e Imex têm TCs credenciadas. Até o credenciamento, a TC VMI só entra em linha sem exigência de CFI (FGTS-Saúde) ou com recurso próprio.</p><p class="src"><a href="https://ws.bndes.gov.br/cfi_catalogo/" target="_blank" rel="noopener">Catálogo CFI do BNDES</a></p></div>' +
      '<div class="tile"><h3>Filantrópica: FGTS-Saúde da Caixa</h3><p>Até 240 meses, 95% do investimento, TR + 8,66% + até 3% de risco, para filantrópica complementar ao SUS aderente ao Agora Tem Especialistas. Primeira do ranking para o HDA; adesão a confirmar.</p><p class="src"><a href="https://www.gov.br/saude/pt-br/assuntos/noticias-ms/2026/agosto/lei-prorroga-aplicacao-de-recursos-do-fgts-a-entidades-hospitalares-filantropicas-que-atuam-no-sus" target="_blank" rel="noopener">Ministério da Saúde, prorrogação até 2030</a></p></div>' +
      '<div class="tile"><h3>Sem câmbio</h3><p>A proposta GE fixa o preço em dólar a R$ 5,1604; o pacote VMI é cotado em reais. Entre a proposta e o contrato o risco é do hospital.</p></div>' +
      '<div class="tile"><h3>SUS paga mais por TC no privado e no filantrópico</h3><p>A Portaria SAES/MS 4.282/2026 (Agora Tem Especialistas) leva a TC a cerca de R$ 300 por exame para quem adere. Receita adicional não modelada: entra como upside.</p><p class="src"><a href="https://www.conass.org.br/?p=57841" target="_blank" rel="noopener">Conass, Portaria 4.282</a></p></div>' +
      '</div></div>' +
      '<div class="card"><div class="card-h"><h2>O que pode dar errado</h2></div><div class="grid" style="gap:12px">' +
      '<div class="tile"><h3>A linha "médicos que usam a sala" pode não sumir</h3><p>' + R(c.base.emg.rep_sala * 12) + '/ano (' + P(model.base.rep_sala_pct, 1) + ' da receita). A Controladoria a zera na imagem própria; se for repasse a outras especialidades, permanece. É o maior swing do VPL (ver Simulador).</p></div>' +
      '<div class="tile"><h3>Material pode custar o triplo</h3><p>A planilha mantém 5,2% da receita; a própria nota diz que, com o material da EMG (R$ 60 mil/mês), vai a ~15%. Validar com o Jaime.</p></div>' +
      '<div class="tile"><h3>Contrato com a EMG e janela sem TC</h3><p>Prazo, aviso prévio e multa não constam dos documentos. A EMG é dona dos equipamentos: a saída precisa coincidir com a instalação da TC nova (sobreposição de ' + model.fin.inicio_op_mes + ' meses no modelo).</p></div>' +
      '<div class="tile"><h3>A TC VMI não está credenciada no BNDES</h3><p>Sem CFI, a Pulsar fica fora do FINAME; a TC GE, se for Ascend ou Aspire, entra. A vantagem VMI hoje está no RX, no ultrassom (Alfamed) e no preço em reais; na TC, depende de a VMI credenciar a Pulsar antes da contratação (Gate 1).</p></div>' +
      '<div class="tile"><h3>Crédito antes do TDC</h3><p>Sem o TDC, o hospital rola capital de giro a 48 meses e a cobertura fica em ' + X(e27.dscrSem) + '. Um banco pode pedir garantia real ou recusar até a desalavancagem.</p></div>' +
      '</div></div></div>';
    /* gates */
    h += '<div class="card"><div class="card-h"><h2>Sequência de decisão</h2><span class="muted small">cada etapa libera a seguinte</span></div><div class="gates">' +
      '<div class="gate now"><div class="gh"><b>Gate 0</b><span>agora</span></div><ul><li>Aprovar a tese e o perímetro (TC, 2 US, 2 RX móveis, placa DR)</li><li>Pedir propostas VMI e Alfamed com preço em reais; pedir à VMI o credenciamento CFI da Pulsar</li><li>Fechar as 4 premissas a validar: linha da sala, material, contrato EMG, RIS/PACS</li></ul></div>' +
      '<div class="gate"><div class="gh"><b>Gate 1</b><span>dez/26 – 1T27</span></div><ul><li>TDC emitido e negociação iniciada</li><li>Protocolar FGTS-Saúde (Caixa) e FINAME (agente) com o kit de documentos</li><li>Confirmar adesão ao Agora Tem Especialistas</li></ul></div>' +
      '<div class="gate"><div class="gh"><b>Gate 2</b><span>2T27</span></div><ul><li>Contratação do financiamento e pedido de compra</li><li>Notificação à EMG; instalação com ' + model.fin.inicio_op_mes + ' meses de sobreposição</li><li>Contratar manutenção e RIS/PACS</li></ul></div>' +
      '<div class="gate"><div class="gh"><b>Gate 3</b><span>operação</span></div><ul><li>Imagem própria em regime</li><li>Indicadores do Jaime: exames, tempo de espera, repetição, disponibilidade, custo por exame</li><li>Revisar premissas e esta página a cada trimestre</li></ul></div>' +
      '</div></div>';
    $('#tab-tese').innerHTML = h;
  }

  /* ================= DIAGNÓSTICO ================= */
  function renderDiagnostico() {
    var c = calc, e = c.base.emg, p = c.base.prop, m = model;
    var h = '<div class="card hero"><span class="eyebrow">Modelo atual · EMG (empresa do ex-CEO) opera o serviço desde a terceirização</span><h2>O hospital entra com espaço, estrutura e equipe; a EMG entra com equipamentos antigos e corpo médico, e leva 59% da receita</h2><p class="lead muted">Base: DRE por unidade de negócio da Controladoria, jan–jun/26, convênio e particular. O SUS (20% do hospital) não está na base: entra como upside na tese.</p></div>';
    h += '<div class="grid kpis">' + kpi('Exames por mês', N(e.exames), 'convênio + particular · ticket ' + R(m.base.ticket)) + kpi('Receita líquida', R(e.rl), 'por mês') + kpi('Repasse à EMG', R(e.repasse), P(e.repasse / e.rl, 0) + ' da receita') + kpi('Custos do hospital', R(e.cf_dir + e.cf_ind), 'fixos diretos + indiretos') + kpi('Resultado', '<span class="neg">' + R(e.resultado) + '</span>', 'por mês · ' + mi(e.resultado * 12) + '/ano', 'bad') + '</div>';
    /* DRE comparativa mensal */
    function row(l, a, b, cls) { return '<tr class="' + (cls || '') + '"><td>' + l + '</td><td class="n">' + R(a) + '</td><td class="n">' + (a != null && e.rl ? P(a / e.rl, 1) : '') + '</td><td class="n">' + R(b) + '</td><td class="n">' + (b != null && p.rl ? P(b / p.rl, 1) : '') + '</td></tr>'; }
    h += '<div class="grid two"><div class="card"><div class="card-h"><h2>DRE mensal: EMG × imagem própria</h2><span class="muted small">volume atual, regime (ano 2)</span></div><div class="tbl-wrap"><table><thead><tr><th>R$/mês</th><th class="n">EMG</th><th class="n">A.V.</th><th class="n">Própria</th><th class="n">A.V.</th></tr></thead><tbody>' +
      row('Receita bruta', e.rb, p.rb) + row('(−) Glosas', -e.glosa, -p.glosa, 'sub') + row('Receita líquida', e.rl, p.rl, 'total') +
      row('(−) Mat/Med', -e.matmed, -p.matmed) + row('(−) Repasse: médicos', -e.rep_med, -p.rep_med) + row('(−) Repasse: material EMG', -e.rep_mat, -p.rep_mat) + row('(−) Repasse: biópsias', -e.rep_bio, -p.rep_bio) + row('(−) Médicos que usam a sala', -e.rep_sala, -p.rep_sala) +
      row('Margem de contribuição', e.mc, p.mc, 'total') + row('(−) Custos fixos diretos', -e.cf_dir, -p.cf_dir) + row('(−) Manutenção (incl. tubo)', -e.manut, -p.manut) + row('(−) RIS/PACS', -e.rispacs, -p.rispacs) + row('Margem direta', e.margem_direta, p.margem_direta, 'total') + row('(−) Custos indiretos', -e.cf_ind, -p.cf_ind) + row('Resultado operacional (EBITDA)', e.resultado, p.resultado, 'total hl') +
      '</tbody></table></div><p class="small muted" style="margin-top:8px">Fonte: Viabilidade v2, aba Viabilidade, linhas 48–63. A aba DRE da mesma planilha mostra R$ 162 mil para a própria porque omite manutenção e RIS/PACS no cenário de volume atual.</p></div>';
    h += '<div class="card"><div class="card-h"><h2>Para onde vai a receita hoje</h2><span class="muted small">R$ por mês, jan–jun/26</span></div><div class="chart">' + svgBars({ cats: ['Médicos EMG', 'Material EMG', 'Biópsias', 'Médicos na sala', 'Mat/Med hosp.', 'Fixos diretos', 'Indiretos', 'Resultado'], series: [{ nome: 'R$/mês', vals: [e.rep_med, e.rep_mat, e.rep_bio, e.rep_sala, e.matmed, e.cf_dir, e.cf_ind, e.resultado], cor: 'var(--s-c)' }], fmt: function (v) { return mi(v); }, h: 260, labels: true, aria: 'Destino da receita' }) + '</div><p class="small muted">A EMG recebe ' + R(e.repasse) + '/mês; o CEO estima "uns 300 mil por mês". A diferença pode ser a parcela que a EMG paga aos médicos.</p></div></div>';
    /* volumes */
    var v = m.volumes;
    h += '<div class="grid two"><div class="card"><div class="card-h"><h2>Volume por modalidade</h2><span class="muted small">média mensal 2025 × 2026 (Jaime)</span></div><div class="chart">' + svgBars({ cats: ['Raio X', 'Tomografia', 'Ultrassom'], series: [{ nome: '2025', vals: [v.rx25, v.tc25, v.us25], cor: 'var(--s-a)' }, { nome: '2026', vals: [v.rx26, v.tc26, v.us26], cor: 'var(--s-c)' }], fmt: function (x) { return N(x); }, labels: true, h: 230, aria: 'Volumes' }) + '</div><p class="small muted">Crescimento de 25% (RX), 27,7% (TC) e 36,3% (US). Total 2026: ' + N(v.rx26 + v.tc26 + v.us26) + '/mês, contra ' + N(e.exames) + ' na base da Controladoria (só convênio e particular).</p></div>' +
      '<div class="card"><div class="card-h"><h2>Capacidade da nova TC</h2></div><div class="grid kpis">' + kpi('Capacidade', N(c.tc.cap) + '/mês', m.propria.tc_exh + ' exames/h × ' + m.propria.tc_h + ' h × ' + m.propria.tc_d + ' dias') + kpi('Volume de TC', N(c.tc.tc) + '/mês', 'cenário ' + (m.cenario.volume_var >= 0 ? '+' : '') + P(m.cenario.volume_var, 0)) + kpi('Ocupação', P(c.tc.ocup, 0), c.tc.ocup > 0.85 ? 'acima de 85%: risco de fila' : 'folga para crescer', c.tc.ocup > 0.85 ? 'warn' : 'good') + '</div><p class="small muted" style="margin-top:10px">A proposta do Jaime prevê Dual Energy e angiotomografia de coronárias: linhas novas de receita, não modeladas.</p></div></div>';
    /* hospital */
    h += '<div class="card hero"><span class="eyebrow">Situação do hospital · Reunião do Conselho, out/26</span><h2>Virada em curso: de déficit de R$ 27 mi em 2025 para EBITDA positivo em 2026, com dívida bancária de R$ 29 mi e um TDC de R$ 50–70 mi a caminho</h2></div>';
    h += '<div class="grid two"><div class="card"><div class="card-h"><h2>DRE gerencial</h2><span class="muted small">R$, jan–ago (2025 × 2026)</span></div><div class="tbl-wrap"><table><thead><tr><th></th><th class="n">2025</th><th class="n">2026</th><th class="n">var.</th></tr></thead><tbody>' +
      [['Receita total', 71215093, 99043842], ['Custos variáveis (HM + MatMed)', -36876399, -44799997], ['Margem de contribuição', 34338694, 54243845, 'total'], ['Custos fixos assistenciais', -29739950, -34437735], ['Lucro bruto', 4598744, 19806110, 'total'], ['Despesas administrativas e comerciais', -12118429, -14007105], ['Lucro operacional', -7519685, 5799003, 'total'], ['Provisões', -9619003, -2141761], ['Despesa financeira líquida', -3313305, -4348588], ['Lucro líquido', -20451995, -691345, 'total'], ['EBITDA', -5622020, 7166162, 'total hl']].map(function (r) { return '<tr class="' + (r[3] || '') + '"><td>' + r[0] + '</td><td class="n">' + R(r[1]) + '</td><td class="n">' + R(r[2]) + '</td><td class="n">' + (r[1] ? P((r[2] - r[1]) / Math.abs(r[1]), 0) : '') + '</td></tr>'; }).join('') +
      '</tbody></table></div><p class="small muted" style="margin-top:8px">Exercício 2025 (não auditado): receita líquida R$ 113,7 mi, déficit R$ 27,5 mi, EBITDA −R$ 4,7 mi.</p></div>' +
      '<div class="card"><div class="card-h"><h2>Balanço e dívida</h2><span class="muted small">31/08/2026</span></div><div class="grid kpis">' + kpi('Dívida bancária', mi(c.ent.divTot), 'curto ' + mi(m.entidade.div_cp) + ' · longo ' + mi(m.entidade.div_lp)) + kpi('Caixa', mi(c.ent.caixa), 'liquidez corrente 1,88') + kpi('Dívida líquida / EBITDA', X(c.ent.dlEbitda, 1), 'EBITDA anualizado ' + mi(c.ent.ebitdaBase), c.ent.dlEbitda > 3 ? 'bad' : 'warn') + kpi('TDC', mi(m.entidade.tdc_min) + '+', 'potencial construtivo: R$ 50–70 mi, emissão dez/26', 'good') + '</div>' +
      '<p class="small muted" style="margin-top:10px">Patrimônio social R$ 110 mi; imóvel de 50.000 m² avaliado em R$ 550 mi (fora do balanço). Restauro de R$ 4,2 mi em andamento (ago/26 a mai/27), condição para o TDC. Plano 2026: faturamento de R$ 105 mi para R$ 150 mi; região do Ipiranga com 450 mil habitantes e 60% com plano de saúde.</p></div></div>';
    $('#tab-diagnostico').innerHTML = h;
  }

  /* ================= ALTERNATIVAS ================= */
  function renderAlternativas() {
    var c = calc, m = model, B = c.B, C = c.C, fB = c.flB, fC = c.flC, e = c.cen.emg, p = c.cen.prop;
    var H = +m.fin.horizonte;
    var h = '<div class="card hero"><span class="eyebrow">Três caminhos, mesma receita</span><h2>Manter a EMG, internalizar com o pacote GE do Jaime financiado pelo HFS, ou internalizar com o pacote VMI/Alfamed em linha de fomento</h2><p class="lead muted">B e C têm o mesmo perímetro de equipamentos e, por padrão, o mesmo preço (o preço VMI é campo editável em Investimento e financiamento). A diferença está no financiamento: prazo, carência, taxa, IOF e câmbio. A alternativa levada ao Plano em números é a <b>' + m.fin.alternativa + '</b>.</p></div>';
    function card(id, tit, cor, kv, sel) { return '<div class="cmp' + (sel ? ' sel' : '') + '" style="--tc:' + cor + '"><b class="t">' + tit + '</b><div class="kv">' + kv.map(function (r) { return '<span>' + r[0] + '</span><b class="' + (r[2] || '') + '">' + r[1] + '</b>'; }).join('') + '</div></div>'; }
    var lc = C.escolha ? C.escolha.linha : null;
    h += '<div class="cmp3">' +
      card('A', 'A · Manter a EMG', 'var(--s-a)', [['Investimento', R(0)], ['Resultado mensal', R(e.resultado), 'neg'], ['Resultado anual', R(e.resultado * 12), 'neg'], ['Equipamentos', 'da EMG, ultrapassados'], ['Câmbio', 'nenhum'], ['Caixa acumulado em ' + H + ' anos', R(0) + ' (referência)']]) +
      card('B', 'B · Pacote GE/CDK, HFS 60x', 'var(--s-b)', [['Investimento', R(B.capex)], ['Financiado', R(B.capexFin) + ' (fornecedores)'], ['Prazo · carência', B.n + ' m · 0'], ['Custo implícito', Pp(B.cetAno) + ' a.a.'], ['Parcela', R(B.parcela) + '/mês'], ['', ''], ['Total pago', R(B.pagos)], ['Resultado mensal após parcela', R(p.resultado - B.parcela), sinal(p.resultado - B.parcela)], ['Câmbio', 'TC em USD a 5,1604'], ['VPL do projeto', mi(fB.vpl)], ['VPL para o hospital (após dívida)', mi(fB.vplEnt)], ['Caixa acumulado em ' + H + ' anos', mi(fB.acumEnt)], ['DSCR mínimo do projeto', X(fB.dscrMin)]], m.fin.alternativa === 'B') +
      card('C', 'C · Pacote VMI/Alfamed, ' + (lc ? lc.nome.split(' – ')[0].split(' / ')[0] : 'sem linha'), 'var(--s-c)', [['Investimento', R(C.capex)], ['Financiado', R(C.capexFin) + (lc ? ' (' + esc(lc.operador.split(' ')[0]) + ')' : '')], ['Prazo · carência', (C.n || '—') + ' m · ' + (C.c || 0)], ['CET', Pp(C.cetAno) + ' a.a.'], ['Parcela na carência', R(C.primeira) + '/mês'], ['Parcela após a carência', R(C.parcela) + '/mês'], ['Total pago', R(C.pagos)], ['Resultado mensal após parcela', R(p.resultado - (C.parcela || 0)), sinal(p.resultado - (C.parcela || 0))], ['Câmbio', 'nenhum (preço em R$)'], ['VPL do projeto', mi(fC.vpl)], ['VPL para o hospital (após dívida)', mi(fC.vplEnt)], ['Caixa acumulado em ' + H + ' anos', mi(fC.acumEnt)], ['DSCR mínimo do projeto', X(fC.dscrMin)]], m.fin.alternativa === 'C') +
      '</div>';
    var cats = fB.anos.map(function (a) { return String(a.ano); });
    h += '<div class="grid two"><div class="card"><div class="card-h"><h2>Caixa acumulado para o hospital</h2><span class="muted small">ganho operacional menos parcelas, vs. manter a EMG</span></div><div class="chart">' + svgLines({ cats: cats, series: [{ nome: 'B · GE/HFS', vals: fB.anos.map(function (a) { return a.acumE; }), cor: 'var(--s-b)' }, { nome: 'C · VMI/fomento', vals: fC.anos.map(function (a) { return a.acumE; }), cor: 'var(--s-c)' }], fmt: function (v) { return mi(v); }, h: 250, aria: 'Caixa acumulado' }) + '</div></div>' +
      '<div class="card"><div class="card-h"><h2>Serviço da dívida por ano</h2><span class="muted small">parcelas do financiamento dos equipamentos</span></div><div class="chart">' + svgBars({ cats: cats, series: [{ nome: 'B · GE/HFS', vals: fB.anos.map(function (a) { return a.servico; }), cor: 'var(--s-b)' }, { nome: 'C · VMI/fomento', vals: fC.anos.map(function (a) { return a.servico; }), cor: 'var(--s-c)' }], fmt: function (v) { return mi(v); }, h: 250, aria: 'Serviço da dívida' }) + '</div><p class="small muted">A linha de fomento espalha o pagamento por ' + (C.n || '—') + ' meses: a parcela cai nos dois primeiros anos, quando o hospital ainda carrega a dívida antiga, e o total pago sobe. Compare pelo VPL para o hospital, que desconta os dois a ' + P(m.fin.desconto, 0) + ' a.a.</p></div></div>';
    h += '<div class="card"><div class="card-h"><h2>Leitura</h2></div><ul class="bullets">' +
      '<li>Qualquer internalização supera manter a EMG: o VPL de B e C é positivo e o payback fica abaixo de dois anos, porque o hospital já paga a estrutura.</li>' +
      '<li>A diferença entre B e C não está no VPL do projeto (mesmo capex) e sim em <b>quem financia, por quanto tempo e em que moeda</b>: ' + Pp(B.cetAno) + ' a.a. em 60 meses com câmbio, contra ' + Pp(C.cetAno) + ' a.a. em ' + (C.n || '—') + ' meses em reais' + (lc && lc.iof === 'zero' ? ', sem IOF' : '') + '.</li>' +
      '<li>Nos dois primeiros anos, C paga ' + R((B.servico[1] || 0) + (B.servico[2] || 0) - ((C.servico[1] || 0) + (C.servico[2] || 0))) + ' a menos que B: é o período em que o hospital ainda amortiza R$ ' + N(Math.round(c.ent.linhas[0].servAtual / 1e6 * 10) / 10, 1) + ' mi por ano de capital de giro.</li>' +
      '<li>Se o preço VMI ficar abaixo do GE (campo editável), C ganha também no VPL do projeto; se ficar acima, o simulador mostra o ponto de indiferença.</li>' +
      '<li>Catálogo CFI (14/10/2026): a TC GE, se for Ascend ou Aspire, também pode ir ao FINAME; nesse caso a comparação B × C vira "financiamento do fornecedor × linha de fomento", independente da marca, e a diferença VMI fica no preço, no câmbio, no RX e no ultrassom. A TC Pulsar precisa ser credenciada para entrar no FINAME.</li></ul></div>';
    $('#tab-alternativas').innerHTML = h;
  }

  /* ================= PLANO EM NÚMEROS ================= */
  function renderNumeros() {
    var c = calc, m = model, fl = c.flSel, sel = c.sel;
    var cats = fl.anos.map(function (a) { return String(a.ano); });
    var h = '<div class="card hero"><span class="eyebrow">Alternativa ' + sel.id + ' · ' + (sel.id === 'C' ? 'VMI/Alfamed · ' + (c.C.escolha ? esc(c.C.escolha.linha.nome) : '') : 'GE/HFS 60x') + '</span><h2>Fluxo de caixa incremental: imagem própria menos manter a EMG, ' + m.fin.horizonte + ' anos a partir de ' + m.fin.ano_inicio + '</h2><p class="lead muted">Ano 1 com ' + m.fin.inicio_op_mes + ' meses de transição. Valores constantes (reajuste ' + P(m.cenario.reajuste_aa, 1) + ' a.a.), volume ' + (m.cenario.volume_var >= 0 ? '+' : '') + P(m.cenario.volume_var, 0) + ' sobre a base e crescimento de ' + P(m.cenario.cresc_aa, 1) + ' a.a. a partir do ano 2.</p></div>';
    h += '<div class="grid kpis">' + kpi('VPL do projeto', '<span class="' + sinal(fl.vpl) + '">' + mi(fl.vpl) + '</span>', 'a ' + P(m.fin.desconto, 0) + ' a.a.', fl.vpl > 0 ? 'good' : 'bad') + kpi('TIR', fl.tir == null ? '—' : P(fl.tir, 1), 'do projeto, sem dívida') + kpi('Payback', anos(fl.pb), 'descontado ' + anos(fl.pbDesc)) + kpi('Índice de retorno', X(fl.ir), 'VP das entradas ÷ investimento') + kpi('VPL para o hospital', mi(fl.vplEnt), 'após parcelas; TIR ' + (fl.tirEnt == null ? '—' : P(fl.tirEnt, 0))) + kpi('Caixa acumulado', mi(fl.acumEnt), 'após parcelas, ' + m.fin.horizonte + ' anos') + '</div>';
    h += '<div class="card"><div class="card-h"><h2>Ganho operacional, parcelas e caixa</h2><span class="muted small">R$ por ano</span></div><div class="chart">' + svgBars({ cats: cats, series: [{ nome: 'EBITDA incremental', vals: fl.anos.map(function (a) { return a.inc; }), cor: 'var(--s-d)' }, { nome: 'Parcelas', vals: fl.anos.map(function (a) { return -a.servico; }), cor: 'var(--s-b)' }, { nome: 'Caixa para o hospital', vals: fl.anos.map(function (a) { return a.fce; }), cor: 'var(--s-c)' }], fmt: function (v) { return mi(v); }, h: 260, aria: 'Fluxo anual' }) + '</div></div>';
    function tr(l, f, cls) { return '<tr class="' + (cls || '') + '"><td>' + l + '</td><td class="n"></td>' + fl.anos.map(function (a) { var v = f(a); return '<td class="n ' + (cls === 'pct' ? '' : '') + '">' + v + '</td>'; }).join('') + '</tr>'; }
    h += '<div class="card"><div class="card-h"><h2>Fluxo de caixa incremental</h2><span class="muted small">R$, nominal</span></div><div class="tbl-wrap"><table><thead><tr><th></th><th class="n">Ano 0</th>' + fl.anos.map(function (a) { return '<th class="n">' + a.ano + '</th>'; }).join('') + '</tr></thead><tbody>' +
      tr('Fator de volume', function (a) { return N(a.fator, 2); }, 'sub') + tr('Fração do ano em operação própria', function (a) { return P(a.frac, 0); }, 'sub') +
      tr('Receita líquida', function (a) { return R(a.rl); }) + tr('EBITDA com a EMG (status quo)', function (a) { return R(a.ebitdaEmg); }) + tr('EBITDA imagem própria', function (a) { return R(a.ebitdaProp); }) +
      tr('EBITDA incremental', function (a) { return R(a.inc); }, 'total') + tr('(−) Depreciação', function (a) { return R(-a.dep); }, 'sub') + tr('(−) Tributos', function (a) { return R(-a.trib); }, 'sub') +
      '<tr><td>(−) Investimento</td><td class="n">' + R(-fl.capex) + '</td>' + fl.anos.map(function () { return '<td class="n"></td>'; }).join('') + '</tr>' +
      tr('(+) Valor residual', function (a) { return R(a.residual); }, 'sub') +
      '<tr class="total"><td>Fluxo de caixa livre do projeto</td><td class="n">' + R(-fl.capex) + '</td>' + fl.anos.map(function (a) { return '<td class="n">' + R(a.fcp) + '</td>'; }).join('') + '</tr>' +
      tr('Acumulado', function (a) { return R(a.acumP); }, 'sub') +
      '<tr class="sec"><td colspan="' + (fl.anos.length + 2) + '">Com financiamento (alternativa ' + sel.id + ')</td></tr>' +
      tr('(−) Parcelas', function (a) { return R(-a.servico); }) + (sel.id === 'C' ? tr('    das quais juros', function (a) { return R(-a.juros); }, 'sub') : '') +
      '<tr class="total hl"><td>Caixa para o hospital</td><td class="n">' + R(fl.ent[0]) + '</td>' + fl.anos.map(function (a) { return '<td class="n">' + R(a.fce) + '</td>'; }).join('') + '</tr>' +
      tr('Acumulado', function (a) { return R(a.acumE); }, 'sub') + tr('DSCR do projeto', function (a) { return X(a.dscr); }, 'sub') +
      '</tbody></table></div><p class="small muted" style="margin-top:8px">Ano 0 com financiamento: parte não financiada (RIS/PACS' + (sel.id === 'C' && sel.capexFin < sel.capex ? ' e ' + P(1 - sel.capexFin / (sel.capex || 1), 0) + ' do pacote' : '') + ') e custos iniciais (IOF, tarifa). A Controladoria zera o ano 0 porque considera 100% financiado.</p></div>';
    /* DRE anual própria */
    var a2 = fl.anos[Math.min(1, fl.anos.length - 1)].dre.prop, a1 = fl.anos[0].dre.prop;
    h += '<div class="card"><div class="card-h"><h2>DRE anual da imagem própria em regime</h2><span class="muted small">ano ' + fl.anos[Math.min(1, fl.anos.length - 1)].ano + ', 12 meses</span></div><div class="tbl-wrap"><table><thead><tr><th></th><th class="n">R$/ano</th><th class="n">% RL</th></tr></thead><tbody>' +
      [['Receita bruta', a2.rb], ['(−) Glosas', -a2.glosa], ['Receita líquida', a2.rl, 'total'], ['(−) Mat/Med', -a2.matmed], ['(−) Repasse médico', -a2.rep_med], ['(−) Outros repasses mantidos', -(a2.rep_mat + a2.rep_bio + a2.rep_sala)], ['Margem de contribuição', a2.mc, 'total'], ['(−) Custos fixos diretos', -a2.cf_dir], ['(−) Manutenção', -a2.manut], ['(−) RIS/PACS', -a2.rispacs], ['(−) Custos indiretos', -a2.cf_ind], ['EBITDA', a2.resultado, 'total hl']].map(function (r) { return '<tr class="' + (r[2] || '') + '"><td>' + r[0] + '</td><td class="n">' + R(r[1] * 12) + '</td><td class="n">' + P(r[1] / a2.rl, 1) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    $('#tab-numeros').innerHTML = h;
  }

  /* ================= INVESTIMENTO E FINANCIAMENTO ================= */
  function equipTable(key) {
    var itens = model.equip[key], isB = key === 'B', cx = E.capexDe(itens);
    var h = '<div class="tbl-wrap"><table class="ge"><thead><tr><th>Item</th><th>Modelo</th><th class="n">Qtd</th><th class="n">Preço unit. (R$)</th>' + (isB ? '<th class="n">Parcela unit. (R$)</th><th class="n">Taxa implícita</th>' : '<th>CFI</th>') + '<th>Financiável</th><th>Observação</th><th></th></tr></thead><tbody>';
    itens.forEach(function (it, i) {
      var imp = isB ? calc.B.implic[i] : null;
      h += '<tr><td><input class="w-m" data-eq="' + key + '.' + i + '.nome" value="' + esc(it.nome) + '"></td><td><input class="w-m" data-eq="' + key + '.' + i + '.modelo" value="' + esc(it.modelo) + '"></td><td class="n"><input class="n w-s" data-eq="' + key + '.' + i + '.qtd" value="' + esc(it.qtd) + '"></td><td class="n"><input class="n" data-eq="' + key + '.' + i + '.preco" value="' + esc(NF2.format(it.preco)) + '"></td>' +
        (isB ? '<td class="n"><input class="n" data-eq="' + key + '.' + i + '.parcela" value="' + esc(NF2.format(it.parcela || 0)) + '"></td><td class="n">' + (imp ? (imp.taxaAno == null ? '—' : Pp(imp.taxaAno)) + (imp.alerta ? ' <span class="pill bad">' + esc(imp.alerta) + '</span>' : '') : '') + '</td>' : '<td><input class="w-s" data-eq="' + key + '.' + i + '.cfi" value="' + esc(it.cfi || '') + '" placeholder="a informar"></td>') +
        '<td><input type="checkbox" data-eq="' + key + '.' + i + '.fin"' + (it.fin !== false ? ' checked' : '') + '></td><td class="wrap small muted">' + esc(it.obs || '') + '</td><td><button class="sm ghost danger" data-eqdel="' + key + '.' + i + '" title="Remover">×</button></td></tr>';
    });
    h += '<tr class="total"><td>Total</td><td></td><td class="n">' + itens.reduce(function (s, i) { return s + (+i.qtd || 0); }, 0) + '</td><td class="n">' + R(cx.total) + '</td>' + (isB ? '<td class="n">' + R(cx.parcelaMes) + '/mês</td><td class="n">' + Pp(calc.B.cetAno) + '</td>' : '<td></td>') + '<td class="n">' + R(cx.financiavel) + '</td><td></td><td></td></tr></tbody></table></div><div class="row" style="margin-top:8px"><button class="sm" data-eqadd="' + key + '">+ Item</button></div>';
    return h;
  }
  function renderInvest() {
    var c = calc, m = model, C = c.C, av = C.av;
    var h = '<div class="card hero"><span class="eyebrow">Investimento</span><h2>Mesmo perímetro, dois pacotes: GE/CDK (proposta do Jaime) e VMI/Alfamed (preço a definir, campo editável)</h2><p class="lead muted">Preencha o preço e o código CFI de cada item VMI/Alfamed quando as propostas chegarem. Enquanto não houver preço, o pacote C usa o preço do pacote B, o que isola o efeito do financiamento.</p></div>';
    h += '<div class="card"><div class="card-h"><h2>Pacote B · GE/CDK, financiamento dos fornecedores</h2><span class="muted small">Projeto Radiologia e Proposta Estratégica (Jaime); HFS 60x para a TC</span></div>' + equipTable('B') + '<p class="small muted" style="margin-top:8px">Totais corretos: R$ 2.934.024,80 e R$ 73.537,38/mês. O documento do Jaime soma R$ 2.979.024,80 e R$ 68.458,38 (erros de soma).</p></div>';
    h += '<div class="card"><div class="card-h"><h2>Pacote C · VMI/Alfamed, linha de fomento</h2><span class="muted small">Pulsar 128 (64 canais/128 cortes), Aquila 320/500, Alfamed (grupo Prime)</span></div>' + equipTable('C') + '</div>';
    /* caso de crédito */
    var cl = m.cliente, ctx = av.ctx;
    if (C.cfi && C.cfi.sem > 0) h += '<div class="notice warn">Itens sem código CFI: ' + esc(C.cfi.semItens.join(', ')) + ' (' + R(C.cfi.sem) + '). O FINAME só financia os ' + R(C.cfi.com) + ' com CFI; a TC entra em linha sem exigência de CFI (FGTS-Saúde) ou recurso próprio. Para testar a hipótese de Pulsar credenciada, mude a premissa "Tratar o pacote como credenciado" em Premissas.</div>';
    h += '<div class="card"><div class="card-h"><h2>Caso de crédito (motor Financiamento VMI)</h2><span class="muted small">base de linhas ' + esc(BASE.versao) + '</span></div><div class="grid four">' +
      kpi('Tomador', cl.natureza === 'filantropica' ? 'Filantrópica' : 'Privada', 'ABENSENA · ' + cl.uf, '', true) + kpi('Porte BNDES', M.PORTE_NOME[ctx.porte] || '—', 'receita bruta ' + mi(ctx.rob), '', true) + kpi('Valor a financiar', R(ctx.fin), 'prazo pedido ' + m.altC.prazo + ' m · carência ' + m.altC.carencia + ' m', '', true) + kpi('Contratação', esc(m.altC.inicio), m.altC.sistema + ' · juros na carência ' + m.altC.carModo, '', true) + '</div>' +
      '<div class="row" style="margin-top:12px"><label>Linha <select id="selLinha"><option value="auto"' + (m.altC.linha === 'auto' ? ' selected' : '') + '>Automática (1ª do ranking)</option>' + av.todas.filter(function (t) { return t.sim; }).map(function (t) { return '<option value="' + t.linha.id + '"' + (m.altC.linha === t.linha.id ? ' selected' : '') + '>' + esc(t.linha.nome) + (t.el.ok ? '' : ' (bloqueada)') + '</option>'; }).join('') + '</select></label>' +
      '<label>Prazo <input class="n w-s" id="inPrazo" value="' + esc(m.altC.prazo) + '"> meses</label><label>Carência <input class="n w-s" id="inCar" value="' + esc(m.altC.carencia) + '"> meses</label>' +
      '<label>Sistema <select id="selSist"><option' + (m.altC.sistema === 'SAC' ? ' selected' : '') + '>SAC</option><option' + (m.altC.sistema === 'Price' ? ' selected' : '') + '>Price</option></select></label></div></div>';
    /* ranking */
    h += '<div class="card"><div class="card-h"><h2>Ranking das linhas para o HDA</h2><span class="muted small">ordenado pelo custo total; cenário base de spreads</span></div><div class="grid" style="gap:10px">';
    av.ranking.forEach(function (x) {
      var s = x.sim, esc_ = C.escolha && C.escolha.linha.id === x.linha.id;
      h += '<div class="linha' + (esc_ ? ' top' : '') + '"><div class="rank">' + x.rank + '</div><div><div class="nm">' + esc(x.linha.nome) + (esc_ ? ' <span class="pill info">em uso no plano</span>' : '') + '</div><div class="op">' + esc(x.linha.operador) + '</div><div class="comp">' + s.spreads.map(function (sp) { return '<span>' + esc(sp.nome) + ' ' + Pp(sp.v) + '</span>'; }).join('') + '<span>' + esc(s.cfRot) + '</span><span>' + s.n + ' m · ' + s.c + ' car.</span><span>IOF ' + (x.linha.iof === 'zero' ? 'zero' : x.linha.iof === 'nao_incide' ? 'não incide' : R(s.iof)) + '</span></div><div class="why">' + x.el.porques.map(function (p) { return '<span>✓ ' + esc(p) + '</span>'; }).join('') + x.el.avisos.concat(s.avisos).map(function (p) { return '<span class="muted">! ' + esc(p) + '</span>'; }).join('') + '</div></div>' +
        '<div class="rt"><span class="big">' + Pp(s.cet) + '</span><span class="small muted">CET a.a. · faixa ' + Pp(s.faixa.min) + ' a ' + Pp(s.faixa.max) + '</span><span class="small">Parcela ' + R(s.parcelaPosCarencia) + ' · na carência ' + R(s.primeiraParcela) + '</span><span class="small">Total pago ' + R(s.pagos) + ' · juros ' + R(s.juros) + '</span></div></div>';
    });
    av.mercado.forEach(function (x) { var s = x.sim; h += '<div class="linha bloq"><div class="rank">ref</div><div><div class="nm">' + esc(x.linha.nome) + '</div><div class="op">' + esc(x.linha.obs) + '</div></div><div class="rt"><span class="big">' + Pp(s.cet) + '</span><span class="small muted">CET a.a. · ' + s.n + ' meses</span><span class="small">Parcela ' + R(s.parcelaPosCarencia) + '</span></div></div>'; });
    h += '<div class="linha bloq"><div class="rank">B</div><div><div class="nm">Financiamento dos fornecedores (HFS/GE e demais), 60 meses</div><div class="op">Custo implícito nas parcelas informadas; TC com preço em dólar</div></div><div class="rt"><span class="big">' + Pp(c.B.cetAno) + '</span><span class="small muted">a.a. implícito</span><span class="small">Parcela ' + R(c.B.parcela) + '</span><span class="small">Total pago ' + R(c.B.pagos) + '</span></div></div>';
    h += '</div><details style="margin-top:12px"><summary>Linhas não elegíveis e por quê</summary><ul class="src-list">' + av.todas.filter(function (x) { return !x.el.ok; }).map(function (x) { return '<li><b>' + esc(x.linha.nome) + '</b>: ' + esc(x.el.bloqueios.join('; ')) + '</li>'; }).join('') + '</ul></details></div>';
    /* cronograma anual */
    if (C.escolha) {
      var rows = C.escolha.sim.rows, porAno = {};
      rows.forEach(function (r) { var k = r.y; if (!porAno[k]) porAno[k] = { ano: k, juros: 0, amort: 0, parcela: 0, saldo: r.saldo, n: 0 }; porAno[k].juros += r.juros; porAno[k].amort += r.amort; porAno[k].parcela += r.parcela; porAno[k].saldo = r.saldo; porAno[k].n++; });
      h += '<div class="card"><div class="card-h"><h2>Cronograma da linha em uso</h2><span class="muted small">' + esc(C.escolha.linha.nome) + ' · ' + esc(C.escolha.sim.cfRot) + ' · taxa no 1º ano ' + Pp(C.taxaAno1) + '</span></div><div class="tbl-wrap"><table><thead><tr><th>Ano</th><th class="n">Meses</th><th class="n">Juros</th><th class="n">Amortização</th><th class="n">Parcelas</th><th class="n">Saldo no fim</th></tr></thead><tbody>' + Object.keys(porAno).map(function (k) { var a = porAno[k]; return '<tr><td>' + a.ano + '</td><td class="n">' + a.n + '</td><td class="n">' + R(a.juros) + '</td><td class="n">' + R(a.amort) + '</td><td class="n">' + R(a.parcela) + '</td><td class="n">' + R(a.saldo) + '</td></tr>'; }).join('') + '<tr class="total"><td>Total</td><td class="n">' + rows.length + '</td><td class="n">' + R(C.juros) + '</td><td class="n">' + R(C.capexFin) + '</td><td class="n">' + R(C.pagos) + '</td><td></td></tr></tbody></table></div>' + (C.iof ? '<p class="small muted" style="margin-top:8px">IOF estimado ' + R(C.iof) + ' (filantrópica pode ter não incidência).</p>' : '') + '</div>';
    }
    $('#tab-invest').innerHTML = h;
    $('#selLinha').addEventListener('change', function () { model.altC.linha = this.value; afterEdit(); });
    $('#inPrazo').addEventListener('change', function () { model.altC.prazo = Math.max(1, Math.round(parseBR(this.value))); afterEdit(); });
    $('#inCar').addEventListener('change', function () { model.altC.carencia = Math.max(0, Math.round(parseBR(this.value))); afterEdit(); });
    $('#selSist').addEventListener('change', function () { model.altC.sistema = this.value; afterEdit(); });
    $$('#tab-invest [data-eq]').forEach(function (inp) { inp.addEventListener('change', function () { var p = this.dataset.eq.split('.'); var it = model.equip[p[0]][+p[1]]; var f = p[2]; if (f === 'fin') it.fin = this.checked; else if (f === 'qtd' || f === 'preco' || f === 'parcela') it[f] = parseBR(this.value); else it[f] = this.value; afterEdit(); }); });
    $$('#tab-invest [data-eqdel]').forEach(function (b) { b.addEventListener('click', function () { var p = this.dataset.eqdel.split('.'); model.equip[p[0]].splice(+p[1], 1); afterEdit(); }); });
    $$('#tab-invest [data-eqadd]').forEach(function (b) { b.addEventListener('click', function () { var k = this.dataset.eqadd; model.equip[k].push(k === 'B' ? { id: 'n' + Date.now(), nome: 'Novo item', modelo: '', qtd: 1, preco: 0, parcela: 0, n: 60, fin: true, obs: '' } : { id: 'n' + Date.now(), nome: 'Novo item', modelo: '', qtd: 1, preco: 0, cfi: '', fin: true, obs: '' }); afterEdit(); }); });
  }

  /* ================= CAPACIDADE DE CRÉDITO ================= */
  function renderCredito() {
    var c = calc, m = model, en = c.ent, L = en.linhas, l1 = L[0];
    var h = '<div class="card hero"><span class="eyebrow">Visão do banco · entidade tomadora</span><h2>O projeto se paga; a pergunta do agente financeiro é se o hospital cobre a dívida que já tem</h2><p class="lead muted">EBITDA anualizado de ' + mi(en.ebitdaBase) + ' contra serviço da dívida de ' + mi(l1.servAtual) + ' em ' + l1.ano + ' (mapa de empréstimos de dez/25, sem a conta garantida). O TDC de ' + mi(m.entidade.tdc_min) + '+ em ' + esc(m.entidade.tdc_mes) + ' muda o quadro; o modelo mostra os dois mundos.</p></div>';
    h += '<div class="grid kpis">' + kpi('Dívida líquida', mi(en.dl), 'dívida ' + mi(en.divTot) + ' − caixa ' + mi(en.caixa)) + kpi('Dívida líquida / EBITDA', X(en.dlEbitda), 'hoje · com o projeto ' + X(en.dlEbitdaProj), en.dlEbitda > 3 ? 'bad' : 'warn') + kpi('DSCR ' + l1.ano + ' sem o projeto', X(l1.dscrSemProj), 'referência BNDES ≥ 1,3x', l1.dscrSemProj < 1.3 ? 'bad' : 'good') + kpi('DSCR ' + l1.ano + ' com o projeto', X(l1.dscrSem), 'sem TDC', l1.dscrSem < 1.3 ? 'warn' : 'good') + kpi('DSCR ' + l1.ano + ' com TDC', X(l1.dscrCom), 'dívida liquidada em ' + esc(m.entidade.tdc_mes), 'good') + kpi('Dívida líquida após o TDC', mi(en.dlAposTdc), P(m.entidade.tdc_liquida, 0) + ' da dívida liquidada com ' + mi(m.entidade.tdc_min), 'good') + '</div>';
    var cats = L.slice(0, Math.min(L.length, 6)).map(function (l) { return String(l.ano); });
    h += '<div class="grid two"><div class="card"><div class="card-h"><h2>Cobertura do serviço da dívida</h2><span class="muted small">EBITDA ÷ parcelas do ano, entidade</span></div><div class="chart">' + svgLines({ cats: cats, series: [{ nome: 'Sem o projeto', vals: L.slice(0, cats.length).map(function (l) { return l.dscrSemProj == null ? null : Math.min(l.dscrSemProj, 6); }), cor: 'var(--s-a)', dash: true }, { nome: 'Com o projeto, sem TDC', vals: L.slice(0, cats.length).map(function (l) { return l.dscrSem == null ? null : Math.min(l.dscrSem, 6); }), cor: 'var(--s-b)' }, { nome: 'Com o projeto e TDC', vals: L.slice(0, cats.length).map(function (l) { return l.dscrCom == null ? null : Math.min(l.dscrCom, 6); }), cor: 'var(--s-c)' }], fmt: function (v) { return X(v, 1); }, ref: { v: 1.3, label: 'mínimo 1,3x' }, h: 250, aria: 'DSCR' }) + '</div><p class="small muted">Valores acima de 6x cortados no gráfico. A tabela traz os números completos.</p></div>' +
      '<div class="card"><div class="card-h"><h2>Serviço da dívida por ano</h2><span class="muted small">R$, entidade</span></div><div class="chart">' + svgBars({ cats: cats, series: [{ nome: 'Dívida atual', vals: L.slice(0, cats.length).map(function (l) { return l.servAtual; }), cor: 'var(--s-a)' }, { nome: 'Dívida atual após TDC', vals: L.slice(0, cats.length).map(function (l) { return l.servAtualTdc; }), cor: 'var(--s-e)' }, { nome: 'Novo financiamento', vals: L.slice(0, cats.length).map(function (l) { return l.servNovo; }), cor: 'var(--s-c)' }], fmt: function (v) { return mi(v); }, h: 250, aria: 'Serviço da dívida' }) + '</div></div></div>';
    h += '<div class="card"><div class="card-h"><h2>Tabela</h2></div><div class="tbl-wrap"><table><thead><tr><th>Ano</th><th class="n">EBITDA hospital</th><th class="n">+ projeto</th><th class="n">Serviço atual</th><th class="n">Atual após TDC</th><th class="n">Novo</th><th class="n">DSCR sem proj.</th><th class="n">DSCR sem TDC</th><th class="n">DSCR com TDC</th></tr></thead><tbody>' + L.map(function (l) { return '<tr><td>' + l.ano + '</td><td class="n">' + R(l.ebitdaEnt) + '</td><td class="n">' + R(l.inc) + '</td><td class="n">' + R(l.servAtual) + '</td><td class="n">' + R(l.servAtualTdc) + '</td><td class="n">' + R(l.servNovo) + '</td><td class="n ' + (l.dscrSemProj != null && l.dscrSemProj < 1.3 ? 'neg' : '') + '">' + X(l.dscrSemProj) + '</td><td class="n ' + (l.dscrSem != null && l.dscrSem < 1.3 ? 'neg' : '') + '">' + X(l.dscrSem) + '</td><td class="n">' + X(l.dscrCom) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    /* empréstimos editáveis */
    h += '<div class="card"><div class="card-h"><h2>Mapa de empréstimos</h2><span class="muted small">31/12/2025 (deck, slide 6) · editável; marque os que o TDC liquida</span></div><div class="tbl-wrap"><table><thead><tr><th>Instituição</th><th>Modalidade</th><th class="n">Parcela (R$/mês)</th><th>Última parcela</th><th class="n">Saldo dez/25</th><th>TDC liquida</th><th></th></tr></thead><tbody>' + (m.entidade.emprestimos || []).map(function (l, i) { return '<tr><td><input class="w-m" data-emp="' + i + '.banco" value="' + esc(l.banco) + '"></td><td><input class="w-m" data-emp="' + i + '.mod" value="' + esc(l.mod) + '"></td><td class="n"><input class="n" data-emp="' + i + '.parcela" value="' + esc(NF2.format(l.parcela)) + '"></td><td><input class="w-s" data-emp="' + i + '.fim" value="' + esc(l.fim) + '" placeholder="AAAA-MM"></td><td class="n"><input class="n" data-emp="' + i + '.saldo" value="' + esc(NF2.format(l.saldo || 0)) + '"></td><td><input type="checkbox" data-emp="' + i + '.liquida_tdc"' + (l.liquida_tdc !== false ? ' checked' : '') + '></td><td><button class="sm ghost danger" data-empdel="' + i + '">×</button></td></tr>'; }).join('') + '<tr class="total"><td>Total</td><td></td><td class="n">' + R((m.entidade.emprestimos || []).reduce(function (s, l) { return s + (+l.parcela || 0); }, 0)) + '</td><td></td><td class="n">' + R((m.entidade.emprestimos || []).reduce(function (s, l) { return s + (+l.saldo || 0); }, 0)) + '</td><td></td><td></td></tr></tbody></table></div><div class="row" style="margin-top:8px"><button class="sm" id="btnEmpAdd">+ Empréstimo</button><span class="small muted">Conta garantida de R$ 1,04 mi (limite) fora do serviço. Saldo total em ago/26: ' + mi(en.divTot) + '.</span></div></div>';
    h += '<div class="card"><div class="card-h"><h2>Leitura para a negociação com o agente</h2></div><ul class="bullets"><li>Em ' + l1.ano + ' o hospital, sozinho, cobre ' + X(l1.dscrSemProj) + ' do serviço da dívida: abaixo do 1,3x de referência. Um agente vai olhar o TDC, a garantia real (imóvel avaliado em R$ 550 mi) ou o FGI antes de aprovar.</li><li>O projeto soma ' + mi(l1.inc) + ' de EBITDA já no primeiro ano e pede ' + mi(l1.servNovo) + ' de serviço: melhora a cobertura mesmo sem o TDC.</li><li>Com o TDC liquidando ' + P(m.entidade.tdc_liquida, 0) + ' da dívida em ' + esc(m.entidade.tdc_mes) + ', a cobertura vai a ' + X(l1.dscrCom) + ' e a dívida líquida cai a ' + mi(en.dlAposTdc) + ': o financiamento dos equipamentos passa a ser a única dívida longa do hospital.</li><li>Sequência recomendada: protocolar a operação no Gate 1 com o TDC emitido, desembolsar no Gate 2, usar a carência para atravessar o restauro (até mai/27).</li></ul></div>';
    $('#tab-credito').innerHTML = h;
    $$('#tab-credito [data-emp]').forEach(function (inp) { inp.addEventListener('change', function () { var p = this.dataset.emp.split('.'); var l = model.entidade.emprestimos[+p[0]]; var f = p[1]; if (f === 'liquida_tdc') l[f] = this.checked; else if (f === 'parcela' || f === 'saldo') l[f] = parseBR(this.value); else l[f] = this.value; afterEdit(); }); });
    $$('#tab-credito [data-empdel]').forEach(function (b) { b.addEventListener('click', function () { model.entidade.emprestimos.splice(+this.dataset.empdel, 1); afterEdit(); }); });
    $('#btnEmpAdd').addEventListener('click', function () { model.entidade.emprestimos.push({ id: 'n' + Date.now(), banco: 'Banco', mod: 'Capital de giro', parcela: 0, fim: '2028-12', saldo: 0, liquida_tdc: true }); afterEdit(); });
  }

  /* ================= SIMULADOR ================= */
  var LEVERS = [
    { id: 'cenario.volume_var', nome: 'Variação de volume', min: -0.3, max: 0.5, step: 0.05, fmt: function (v) { return (v >= 0 ? '+' : '') + P(v, 0); }, hint: 'Controladoria: cenário 2 = +30%; Jaime: +27% em 2027' },
    { id: 'propria.rep_med_pct', nome: 'Repasse médico na imagem própria', min: 0.15, max: 0.30, step: 0.005, fmt: function (v) { return P(v, 1); }, hint: 'Hoje 22,2% via EMG' },
    { id: 'propria.matmed_pct', nome: 'Mat/Med na imagem própria', min: 0.04, max: 0.18, step: 0.005, fmt: function (v) { return P(v, 1); }, hint: '5,2% (planilha) a ~15% (nota da planilha)' },
    { id: 'propria.sala_elimina', nome: 'Zerar "médicos que usam a sala"', seg: [[1, 'Sim'], [0, 'Não']], hint: '21,5% da receita' },
    { id: 'base.ticket', nome: 'Ticket médio', min: 140, max: 220, step: 2, fmt: function (v) { return R(v); }, hint: 'R$ 174 na base' },
    { id: 'propria.manut_fator', nome: 'Fator sobre a manutenção', min: 0.5, max: 2, step: 0.1, fmt: function (v) { return N(v, 1) + '×'; }, hint: '1,5× ≈ plano intermediário de R$ 17 mil/mês' },
    { id: 'altC.prazo', nome: 'Prazo do financiamento C', min: 36, max: 240, step: 12, fmt: function (v) { return v + ' m'; }, hint: 'FINAME até 120; FGTS-Saúde até 240' },
    { id: 'altC.carencia', nome: 'Carência C', min: 0, max: 24, step: 3, fmt: function (v) { return v + ' m'; }, hint: 'FINAME até 24; FGTS até 12' },
    { id: 'fin.desconto', nome: 'Taxa de desconto', min: 0.08, max: 0.25, step: 0.01, fmt: function (v) { return P(v, 0); }, hint: '' },
    { id: 'fin.horizonte', nome: 'Horizonte', seg: [[5, '5 anos'], [10, '10 anos']], hint: '' },
    { id: 'fin.alternativa', nome: 'Alternativa', seg: [['C', 'C · VMI'], ['B', 'B · GE/HFS']], hint: '' },
    { id: 'equip.precoC', nome: 'Preço do pacote VMI vs. GE', min: 0.7, max: 1.3, step: 0.05, fmt: function (v) { return (v >= 1 ? '+' : '−') + P(Math.abs(v - 1), 0); }, hint: 'escala todos os itens do pacote C', virtual: true }
  ];
  function simGet(id) { if (id === 'equip.precoC') return sim._precoC == null ? 1 : sim._precoC; return getPath(sim, id); }
  function simSet(id, v) {
    if (id === 'equip.precoC') { var f = v / (sim._precoC == null ? 1 : sim._precoC); sim._precoC = v; sim.equip.C.forEach(function (it) { it.preco = it.preco * f; }); return; }
    setPath(sim, id, v);
  }
  function renderSimulador() {
    if (!sim) { sim = clone(model); recomputeSim(); }
    var h = '<div class="card hero"><span class="eyebrow">Simulador</span><h2>Mova as alavancas; nada é salvo até você aplicar às premissas</h2><p class="lead muted">A sensibilidade abaixo mostra quanto cada premissa move o VPL do projeto a partir do caso atual.</p></div>';
    h += '<div class="grid sim-grid"><div class="card"><div class="card-h"><h2>Alavancas</h2><div class="row"><button class="sm" id="btnSimReset">Voltar às premissas</button><button class="sm primary" id="btnSimAplicar">Aplicar às premissas</button></div></div><div id="levers"></div></div><div class="stack" style="display:flex;flex-direction:column;gap:14px;min-width:0"><div class="grid kpis" id="simKpis"></div><div class="card"><div class="card-h"><h2>Caixa acumulado para o hospital</h2><span class="muted small">simulação × premissas salvas</span></div><div class="chart" id="simChart"></div></div></div></div>';
    h += '<div class="card"><div class="card-h"><h2>Sensibilidade do VPL do projeto</h2><span class="muted small">variação do VPL ao mover uma premissa de cada vez, a partir da simulação</span></div><div class="chart" id="tornado"></div></div>';
    $('#tab-simulador').innerHTML = h;
    renderLevers(); renderSimResults();
    $('#btnSimReset').addEventListener('click', function () { sim = clone(model); recomputeSim(); renderLevers(); renderSimResults(); });
    $('#btnSimAplicar').addEventListener('click', function () { var s = clone(sim); delete s._precoC; model = sane(s); afterEdit(); sim = clone(model); recomputeSim(); renderLevers(); renderSimResults(); toast('Simulação aplicada às premissas.'); });
  }
  function renderLevers() {
    var h = '';
    LEVERS.forEach(function (l, i) {
      var v = simGet(l.id);
      if (l.seg) h += '<div class="lever"><span class="nm">' + esc(l.nome) + '</span><span class="seg">' + l.seg.map(function (o) { return '<button data-seg="' + i + '" data-v="' + esc(o[0]) + '" class="' + (String(o[0]) === String(v) ? 'on' : '') + '">' + esc(o[1]) + '</button>'; }).join('') + '</span>' + (l.hint ? '<span class="hint">' + esc(l.hint) + '</span>' : '') + '</div>';
      else h += '<div class="lever"><span class="nm">' + esc(l.nome) + '</span><span class="val" id="lv' + i + '">' + l.fmt(v) + '</span><input class="rng" type="range" id="rg' + i + '" data-lever="' + i + '" min="' + l.min + '" max="' + l.max + '" step="' + l.step + '" value="' + v + '">' + (l.hint ? '<span class="hint">' + esc(l.hint) + '</span>' : '') + '</div>';
    });
    $('#levers').innerHTML = h;
    $$('#levers [data-lever]').forEach(function (r) { r.addEventListener('input', function () { var l = LEVERS[+this.dataset.lever]; var v = +this.value; simSet(l.id, l.id === 'fin.horizonte' || l.id === 'altC.prazo' || l.id === 'altC.carencia' ? Math.round(v) : v); $('#lv' + this.dataset.lever).textContent = l.fmt(v); recomputeSim(); renderSimResults(); }); });
    $$('#levers [data-seg]').forEach(function (b) { b.addEventListener('click', function () { var l = LEVERS[+this.dataset.seg]; var v = this.dataset.v; simSet(l.id, isNaN(+v) ? v : +v); recomputeSim(); renderLevers(); renderSimResults(); }); });
  }
  function renderSimResults() {
    var s = simCalc, fl = s.flSel, b = calc.flSel;
    function d(v, ref, fmt) { var dv = v - ref; return fmt(v) + ' <span class="small ' + sinal(dv) + '">' + (dv >= 0 ? '+' : '−') + fmt(Math.abs(dv)).replace('−', '') + '</span>'; }
    $('#simKpis').innerHTML = kpi('VPL do projeto', d(fl.vpl, b.vpl, mi), 'vs. premissas salvas', fl.vpl > 0 ? 'good' : 'bad', true) + kpi('TIR', fl.tir == null ? '—' : P(fl.tir, 0), 'payback ' + anos(fl.pb), '', true) + kpi('Resultado mensal própria', R(s.cen.prop.resultado), 'antes das parcelas · EMG ' + R(s.cen.emg.resultado), sinal(s.cen.prop.resultado) === 'pos' ? 'good' : 'bad', true) + kpi('Após a parcela', R(s.ganhoMesComParcela + s.cen.emg.resultado), 'parcela ' + R(s.sel.parcela) + ' · ' + (s.sel.id === 'C' && s.C.escolha ? esc(s.C.escolha.linha.nome.split(' – ')[0]) : 'HFS'), '', true) + kpi('Caixa acumulado', d(fl.acumEnt, b.acumEnt, mi), 'após parcelas, ' + sim.fin.horizonte + ' anos', '', true) + kpi('DSCR hospital ' + s.ent.linhas[0].ano, X(s.ent.linhas[0].dscrSem) + ' · ' + X(s.ent.linhas[0].dscrCom), 'sem TDC · com TDC', '', true);
    var n = Math.max(fl.anos.length, b.anos.length), cats = []; for (var i = 0; i < n; i++) cats.push(String(+model.fin.ano_inicio + i));
    $('#simChart').innerHTML = svgLines({ cats: cats, series: [{ nome: 'Premissas salvas', vals: cats.map(function (c, i) { return b.anos[i] ? b.anos[i].acumE : null; }), cor: 'var(--s-a)', dash: true }, { nome: 'Simulação', vals: cats.map(function (c, i) { return fl.anos[i] ? fl.anos[i].acumE : null; }), cor: 'var(--s-c)' }], fmt: function (v) { return mi(v); }, h: 230, aria: 'Simulação' });
    var al = [
      { nome: 'Médicos que usam a sala', set: function (mm, v) { mm.propria.sala_elimina = v; }, lo: 0, hi: 1, loTxt: 'mantida', hiTxt: 'zerada' },
      { nome: 'Mat/Med própria', set: function (mm, v) { mm.propria.matmed_pct = v; }, lo: 0.15, hi: 0.052, loTxt: '15%', hiTxt: '5,2%' },
      { nome: 'Volume', set: function (mm, v) { mm.cenario.volume_var = v; }, lo: -0.2, hi: 0.3, loTxt: '−20%', hiTxt: '+30%' },
      { nome: 'Repasse médico', set: function (mm, v) { mm.propria.rep_med_pct = v; }, lo: 0.26, hi: 0.18, loTxt: '26%', hiTxt: '18%' },
      { nome: 'Ticket médio', set: function (mm, v) { mm.base.ticket = v; }, lo: 157, hi: 191, loTxt: '−10%', hiTxt: '+10%' },
      { nome: 'Manutenção', set: function (mm, v) { mm.propria.manut_fator = v; }, lo: 1.5, hi: 0.7, loTxt: '1,5×', hiTxt: '0,7×' },
      { nome: 'Preço do pacote', set: function (mm, v) { mm.equip.C.forEach(function (it) { it.preco *= v; }); mm.equip.B.forEach(function (it) { it.preco *= v; }); }, lo: 1.15, hi: 0.85, loTxt: '+15%', hiTxt: '−15%' },
      { nome: 'Taxa de desconto', set: function (mm, v) { mm.fin.desconto = v; }, lo: 0.20, hi: 0.10, loTxt: '20%', hiTxt: '10%' }
    ];
    var base = clone(sim); delete base._precoC;
    var sens = E.sensibilidade(base, M, BASE, al);
    $('#tornado').innerHTML = svgTornado(sens.itens, function (v) { return mi(v); }) + '<p class="small muted" style="margin-top:6px">VPL base da simulação: ' + mi(sens.base) + '. Barras vermelhas reduzem o VPL; verdes aumentam.</p>';
  }

  /* ================= PREMISSAS ================= */
  function fmtVal(s, v) { if (s.fmt === 'pct') return NF2.format(v * 100); if (s.fmt === 'int') return String(Math.round(v)); if (s.fmt === 'txt') return v; return NF2.format(v); }
  function renderPremissas() {
    var blocos = [], byB = {};
    SCHEMA.forEach(function (s) { if (!byB[s.bloco]) { byB[s.bloco] = []; blocos.push(s.bloco); } byB[s.bloco].push(s); });
    var h = '<div class="card hero"><span class="eyebrow">Premissas</span><h2>Toda premissa tem origem e fonte; as marcadas "a validar" mudam o resultado</h2><p class="lead muted">Edite aqui ou no Simulador. As alterações são salvas automaticamente; "Congelar versão" guarda uma cópia nomeada para comparar depois.</p></div>';
    h += '<div class="card" id="cardVersoes"></div>';
    h += '<div class="row" style="gap:6px">' + Object.keys(ORIG).map(function (o) { return pill(o); }).join('') + '</div>';
    blocos.forEach(function (b) {
      h += '<div class="card"><div class="card-h"><h2>' + esc(b) + '</h2></div>';
      byB[b].forEach(function (s) {
        var v = getPath(model, s.id);
        var inp;
        if (s.ui && s.ui.choices) inp = '<select data-prem="' + s.id + '">' + s.ui.choices.map(function (c) { return '<option value="' + esc(c[0]) + '"' + (String(c[0]) === String(v) ? ' selected' : '') + '>' + esc(c[1]) + '</option>'; }).join('') + '</select>';
        else if (s.ui && s.ui.linhas) inp = '<select data-prem="' + s.id + '"><option value="auto"' + (v === 'auto' ? ' selected' : '') + '>Automática</option>' + BASE.linhas.map(function (l) { return '<option value="' + l.id + '"' + (v === l.id ? ' selected' : '') + '>' + esc(l.nome) + '</option>'; }).join('') + '</select>';
        else inp = '<input class="' + (s.fmt === 'txt' ? '' : 'n') + '" data-prem="' + s.id + '" value="' + esc(fmtVal(s, v)) + '">';
        h += '<div class="prem-row"><div class="lb">' + esc(s.label) + '<span class="id">' + esc(s.id) + '</span></div><div class="vals">' + inp + '<span class="unit">' + esc(s.un) + '</span></div><div class="src">' + pill(s.origem) + ' ' + esc(s.fonte) + '</div></div>';
      });
      h += '</div>';
    });
    $('#tab-premissas').innerHTML = h;
    renderVersoes();
    $$('#tab-premissas [data-prem]').forEach(function (inp) { inp.addEventListener('change', function () { var s = SCHEMA.filter(function (x) { return x.id === this.dataset.prem; }, this)[0]; var v = this.value; if (s.fmt === 'pct') v = parseBR(v) / 100; else if (s.fmt === 'int') v = Math.round(parseBR(v)); else if (s.fmt === 'num') v = parseBR(v); else if (s.ui && s.ui.choices && !isNaN(+v) && typeof s.def === 'number') v = +v; setPath(model, s.id, v); afterEdit(); }); });
  }
  function renderVersoes() {
    var el = $('#cardVersoes'); if (!el) return;
    var h = '<div class="card-h"><h2>Versões salvas</h2><div class="row"><input id="inVerNome" placeholder="nome da versão (ex.: base out/26)" style="width:240px"><button class="sm primary" id="btnCongelar"' + (db && canWrite === false ? ' disabled' : '') + '>Congelar versão</button></div></div>';
    if (!versoes.length) h += '<p class="small muted">Nenhuma versão congelada ainda. A versão de trabalho é salva automaticamente' + (db ? ' no banco desta página' : ' neste navegador') + '.</p>';
    versoes.forEach(function (v) { h += '<div class="ver"><div><b>' + esc(v.nome) + '</b>' + (vendoVersao === v.id ? ' <span class="pill info">vendo</span>' : '') + '<div class="meta">' + esc((v.em || '').replace('T', ' ').slice(0, 16)) + (v.kpis ? ' · VPL ' + mi(v.kpis.vpl) + ' · resultado própria ' + R(v.kpis.prop) + '/mês · ' + esc(v.kpis.linha || '') : '') + '</div></div><div class="row"><button class="sm" data-ver="' + esc(v.id) + '">Abrir</button><button class="sm ghost danger" data-verdel="' + esc(v.id) + '"' + (db && canWrite === false ? ' disabled' : '') + '>Apagar</button></div></div>'; });
    if (vendoVersao) h += '<div class="row" style="margin-top:8px"><button class="sm" id="btnVerVoltar">Voltar à versão de trabalho</button><button class="sm primary" id="btnVerRestaurar">Tornar esta a versão de trabalho</button></div>';
    el.innerHTML = h;
    $('#btnCongelar').addEventListener('click', congelar);
    $$('#cardVersoes [data-ver]').forEach(function (b) { b.addEventListener('click', function () { var v = versoes.filter(function (x) { return x.id === b.dataset.ver; })[0]; if (!v) return; vendoVersao = v.id; model = sane(v.model); recompute(); renderAll(); toast('Vendo a versão "' + v.nome + '". Nada é salvo até você restaurá-la.'); }); });
    $$('#cardVersoes [data-verdel]').forEach(function (b) { b.addEventListener('click', function () { var id = b.dataset.verdel; if (db) db.collection('versoes').doc(id).delete().then(function () { toast('Versão apagada.'); }).catch(function () { toast('Não foi possível apagar.'); }); else { versoes = versoes.filter(function (x) { return x.id !== id; }); lsSet('hda:versoes', JSON.stringify(versoes)); renderVersoes(); } }); });
    var bv = $('#btnVerVoltar'); if (bv) bv.addEventListener('click', function () { vendoVersao = null; model = clone(saved); recompute(); dirty = false; $('#btnDesfazer').hidden = true; renderAll(); });
    var br = $('#btnVerRestaurar'); if (br) br.addEventListener('click', function () { vendoVersao = null; afterEdit(); toast('Versão restaurada como versão de trabalho.'); });
  }
  function congelar() {
    var nome = ($('#inVerNome').value || '').trim() || ('Versão ' + new Date().toLocaleString('pt-BR'));
    var v = { nome: nome, em: new Date().toISOString(), model: clone(model), kpis: { vpl: calc.flSel.vpl, prop: calc.cen.prop.resultado, linha: calc.C.escolha ? calc.C.escolha.linha.nome : '' } };
    if (db) db.collection('versoes').add(v).then(function () { toast('Versão "' + nome + '" congelada.'); }).catch(function () { toast('Não foi possível salvar a versão.'); });
    else { v.id = 'v' + Date.now(); versoes.unshift(v); lsSet('hda:versoes', JSON.stringify(versoes)); renderVersoes(); toast('Versão congelada neste navegador.'); }
  }

  /* ================= MÉTODO ================= */
  function renderMetodo() {
    var h = '<div class="card hero"><span class="eyebrow">Método e fontes</span><h2>Como o número é feito e o que ainda falta confirmar</h2></div>';
    h += '<div class="card"><div class="card-h"><h2>Pendências que mudam o resultado</h2><span class="muted small">em ordem de impacto</span></div><ol class="bullets">' +
      '<li><b>Linha "médicos que usam a sala da Radiologia"</b> (R$ 796 mil no semestre, 21,5% da receita): a Controladoria a zera na imagem própria. Se for repasse a outras especialidades que usam a sala, permanece e o VPL cai em cerca de R$ 7,6 mi.</li>' +
      '<li><b>Material</b>: 5,2% da receita (planilha) ou ~15% (nota da própria planilha, R$ 60 mil/mês): diferença de ~R$ 3,5 mi no VPL. Validar com o Jaime.</li>' +
      '<li><b>Contrato com a EMG</b>: prazo, aviso, multa, propriedade dos equipamentos e data de saída. Define a sobreposição e se há janela sem TC.</li>' +
      '<li><b>Equipe médica</b>: mesmos radiologistas a 22,2%, contratação direta ou telerradiologia para laudos. Cada ponto percentual vale ~R$ 74 mil/ano.</li>' +
      '<li><b>Credenciamento CFI da TC Pulsar.</b> Em 14/10/2026 o Catálogo CFI do BNDES lista 16 itens da VMI Médica (Aquila, Apolo, Digimamo, Centauro, Fênix, Cignus) e nenhuma TC; GE (Ascend, Aspire, Revolution ACT), Siemens, Philips, Canon e Imex têm TCs credenciadas. Sem CFI a Pulsar só entra no FGTS-Saúde ou com recurso próprio.</li>' +
      '<li><b>Propostas VMI e Alfamed</b> com preço em reais; especificação da Pulsar 128 frente à GE 64/128 Dual Energy (protocolo cardíaco).</li>' +
      '<li><b>Adesão ao Agora Tem Especialistas</b> e CEBAS: habilitam FGTS-Saúde e a tabela SUS incrementada para TC.</li>' +
      '<li><b>RIS/PACS</b>: o hospital já tem? Se não, a mensalidade e a implantação ficam como premissa; a escolha do sistema é um tema à parte, a investigar separadamente.</li>' +
      '<li><b>Mapa de empréstimos</b> é de dez/25; o saldo subiu de R$ 28,8 mi para R$ 29,5 mi em ago/26, o que indica renovações não capturadas.</li></ol></div>';
    h += '<div class="card"><div class="card-h"><h2>Inconsistências encontradas nos documentos</h2></div><ul class="bullets">' +
      '<li>Projeto Radiologia (Jaime): investimento total R$ 2.979.024,80 e parcela R$ 68.458,38; a soma das linhas dá R$ 2.934.024,80 e R$ 73.537,38 (valores usados aqui e pela Controladoria).</li>' +
      '<li>Placa DR: 60 × R$ 1.700 = R$ 102 mil, abaixo dos R$ 110 mil à vista. RX portátil em 60x "sem juros".</li>' +
      '<li>Proposta Estratégica: TC "64/128 canais" na seção 4 e "80/160" na conclusão; RX portátil com DR a R$ 500 mil (vs R$ 490 mil); placa DR a R$ 100 mil (vs R$ 110 mil); parcela da TC R$ 50.527,32 (vs R$ 50.524,32).</li>' +
      '<li>Planilha Viabilidade v2: a aba DRE mostra R$ 162 mil/mês para a imagem própria e a aba Viabilidade R$ 131 mil, porque a primeira omite manutenção e RIS/PACS no cenário de volume atual.</li>' +
      '<li>O ROI de 101,8% e o payback de 11,8 meses do Jaime usam o lucro operacional de ago/26 (perímetro diferente, R$ 490 mil de receita) sem descontar o resultado atual nem as parcelas; não são comparáveis aos indicadores incrementais desta página.</li></ul></div>';
    h += '<div class="card"><div class="card-h"><h2>Fórmulas</h2></div><dl class="defs">' +
      '<dt>Receita líquida</dt><dd>exames/mês × ticket × (1 − glosa) × (1 + reajuste)^(ano − 1); exames = base/meses × (1 + variação) × (1 + crescimento)^(ano − 2)</dd>' +
      '<dt>EBITDA EMG</dt><dd>RL − Mat/Med − repasses (médicos, material, biópsias, sala) − fixos diretos − indiretos</dd>' +
      '<dt>EBITDA própria</dt><dd>RL − Mat/Med própria − repasse médico próprio − repasses mantidos − fixos diretos − manutenção (a partir do ano definido) − RIS/PACS − indiretos</dd>' +
      '<dt>EBITDA incremental</dt><dd>(EBITDA própria − EBITDA EMG) × 12 × fração do ano em operação própria</dd>' +
      '<dt>Fluxo do projeto</dt><dd>−capex no ano 0 (equipamentos + implantação RIS/PACS); EBITDA incremental − tributos sobre (EBITDA − depreciação) + residual no último ano</dd>' +
      '<dt>Fluxo para o hospital</dt><dd>ano 0: −(capex − valor financiado) − IOF − tarifas; anos seguintes: EBITDA incremental − tributos − parcelas</dd>' +
      '<dt>VPL, TIR, payback</dt><dd>VPL a valor presente pela taxa de desconto; TIR por bissecção; payback com interpolação linear dentro do ano (igual à planilha)</dd>' +
      '<dt>DSCR</dt><dd>EBITDA do ano ÷ parcelas do ano (projeto) · (EBITDA anualizado do hospital + incremental) ÷ (serviço da dívida atual + novo) (entidade)</dd>' +
      '<dt>Financiamento C</dt><dd>Motor da ferramenta Financiamento VMI: taxa anual = (1 + custo financeiro) × Π(1 + spread) − 1; cronograma mensal SAC ou Price com carência; IOF PJ; CET por TIR do fluxo líquido. Elegibilidade por natureza, porte, UF, CFI e condições de cada linha.</dd>' +
      '<dt>Alternativa B</dt><dd>Parcelas informadas pelos fornecedores por 60 meses; taxa implícita por item resolvida pela anuidade.</dd></dl></div>';
    h += '<div class="card"><div class="card-h"><h2>Fontes</h2></div><ul class="src-list">' +
      '<li>Controladoria HDA, "Cópia de Viabilidade - Central de Imagem Própria v2.xlsx" (abas DRE, Viabilidade, Informações - Validar), base jan–jun/26.</li>' +
      '<li>Jaime (coordenação do serviço de imagem), "Projeto Radiologia JGB" (volumes 2025–2026, DRE ago/26, investimento) e "Proposta Estratégica de Renovação do Parque Tecnológico".</li>' +
      '<li>ABENSENA, "Reunião Conselho: Estratégia para 2026, Orçamento, Situação em agosto" (balanços 2024–2026, DRE gerencial jan–ago/26, mapa de empréstimos dez/25, TDC).</li>' +
      '<li>E-mail do CEO do HDA (out/26): histórico da terceirização, estimativa de R$ 300 mil/mês da EMG, mudança de cultura.</li>' +
      '<li>Ferramenta Financiamento VMI (S&S), base de linhas de 09/10/2026: BNDES Finame e Automático, FGTS-Saúde (Res. CCFGTS 1.152/2026, Lei 15.486/2026), fundos constitucionais, BCB (Selic, TLP, Pm/PMm, TR, séries 20729/20732), BNDES Dados Abertos (spreads contratados CNAE 86), Decreto 6.306/2007 (IOF).</li>' +
      '<li>VMI Médica: Pulsar 32/64/128 (24/32/64 canais; 32/64/128 cortes), Aquila 320/500 S e D (RX móvel), Apolo D (RX fixo digital). <a href="https://vmimedica.com/" target="_blank" rel="noopener">vmimedica.com</a></li>' +
      '<li>Catálogo CFI do BNDES, consulta por CNPJ do fabricante em 14/10/2026 (VMI Médica 02.659.246/0001-03; Alfa Med 11.405.384/0001-49; GE Healthcare do Brasil 00.029.372/0001-40). <a href="https://ws.bndes.gov.br/cfi_catalogo/" target="_blank" rel="noopener">ws.bndes.gov.br/cfi_catalogo</a></li>' +
      '<li>Portaria SAES/MS 4.282/2026 (Agora Tem Especialistas), via <a href="https://www.conass.org.br/?p=57841" target="_blank" rel="noopener">Conass</a>; IN RFB 1.700/2017 (vida útil de 10 anos).</li></ul>' +
      '<p class="small muted" style="margin-top:10px">Preços dos itens VMI/Alfamed: a definir pelas propostas; por padrão iguais ao pacote GE. Honorário de intermediação não exibido nesta versão.</p></div>';
    $('#tab-metodo').innerHTML = h;
  }

  /* ================= render geral ================= */
  function renderAll() {
    renderTese(); renderDiagnostico(); renderAlternativas(); renderNumeros(); renderInvest(); renderCredito(); renderPremissas(); renderMetodo();
    if (tab === 'simulador') { sim = clone(model); recomputeSim(); renderSimulador(); }
    renderSync();
  }
  function showTab(id) {
    tab = id; $$('#tabs .tab').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === id ? 'true' : 'false'); });
    $$('main section').forEach(function (s) { s.hidden = s.id !== 'tab-' + id; });
    if (id === 'simulador') { sim = clone(model); recomputeSim(); renderSimulador(); }
    lsSet('hda:tab', id);
  }
  $('#tabs').addEventListener('click', function (e) { var b = e.target.closest('.tab'); if (b) showTab(b.dataset.tab); });

  /* ================= persistência ================= */
  function renderSync() {
    var d = $('#syncDot'), t = $('#syncTxt');
    d.className = 'dot';
    if (vendoVersao) { d.classList.add('local'); t.textContent = 'Vendo uma versão congelada (somente leitura até restaurar)'; return; }
    if (dbState === 'db') { if (canWrite === false) { d.classList.add('local'); t.textContent = 'Somente leitura: suas alterações ficam neste navegador'; } else if (dirty) { d.classList.add('dirty'); t.textContent = 'Alterações não salvas · salvando em instantes'; } else { d.classList.add('ok'); t.textContent = 'Premissas salvas' + (ultimoSalvoEm ? ' · ' + ultimoSalvoEm.replace('T', ' ').slice(0, 16) : ''); } }
    else if (dbState === 'none') { d.classList.add('local'); t.textContent = dirty ? 'Alterações guardadas neste navegador' : 'Fora do claude.ai: premissas guardadas neste navegador'; }
    else t.textContent = 'Carregando…';
    $('#btnSalvar').disabled = !dirty || (db && canWrite === false);
  }
  function agendarAutoSave() { clearTimeout(saveT); saveT = setTimeout(salvar, 1500); }
  function salvar() {
    clearTimeout(saveT); if (!dirty) return;
    var em = new Date().toISOString();
    if (db && canWrite !== false) {
      db.doc('config/main').set({ model: clone(model), salvoEm: em }).then(function () { saved = clone(model); ultimoSalvoEm = em; dirty = false; $('#btnDesfazer').hidden = true; renderSync(); }).catch(function (e) { if (e && e.code === 'invalid_argument') { canWrite = false; } lsSet('hda:model', JSON.stringify(model)); renderSync(); toast('Não foi possível salvar no banco; cópia guardada neste navegador.'); });
    } else { lsSet('hda:model', JSON.stringify(model)); saved = clone(model); dirty = false; $('#btnDesfazer').hidden = true; renderSync(); }
  }
  $('#btnSalvar').addEventListener('click', salvar);
  $('#btnDesfazer').addEventListener('click', function () { model = clone(saved); dirty = false; $('#btnDesfazer').hidden = true; recompute(); renderAll(); toast('Alterações descartadas.'); });

  async function initCaps() {
    var has = typeof window.claude !== 'undefined' && window.claude && typeof window.claude.use === 'function';
    if (!has) { dbState = 'none'; carregarLocal(); return; }
    try { var rs = await Promise.all([window.claude.use('db'), window.claude.use('user'), window.claude.use('downloads')]); db = rs[0]; userCap = rs[1]; downloads = rs[2]; } catch (e) { db = null; }
    if (!db) { dbState = 'none'; carregarLocal(); return; }
    dbState = 'db';
    if (userCap && userCap.can) { try { canWrite = await userCap.can('data.write'); } catch (e) { canWrite = null; } }
    db.doc('config/main').onSnapshot(function (snap) {
      if (snap.exists) {
        var data = snap.data();
        if (data && ultimoSalvoEm && data.salvoEm === ultimoSalvoEm) { saved = sane(data.model); }
        else if (data && ultimoSalvoEm && data.salvoEm && data.salvoEm < ultimoSalvoEm) { }
        else if (!dirty && !vendoVersao) { model = sane(data.model); saved = clone(model); ultimoSalvoEm = data.salvoEm || null; recompute(); renderAll(); }
        else saved = sane(data.model);
      }
      renderSync();
    }, function () { renderSync(); });
    db.collection('versoes').onSnapshot(function (qs) { versoes = qs.docs.map(function (d) { var b = clone(d.data() || {}); b.id = d.id; return b; }).sort(function (a, b) { return a.em < b.em ? 1 : -1; }); renderVersoes(); }, function () { });
    renderSync();
  }
  function carregarLocal() {
    var m = lsGet('hda:model'); if (m) { try { model = sane(JSON.parse(m)); saved = clone(model); } catch (e) { } }
    var v = lsGet('hda:versoes'); if (v) { try { versoes = JSON.parse(v); } catch (e) { } }
    recompute(); renderAll();
  }

  /* ================= exportação XLSX ================= */
  function exportarXlsx() {
    if (typeof XLSX === 'undefined') { toast('Biblioteca de planilha não carregou.'); return; }
    var wb = XLSX.utils.book_new(), c = calc, fl = c.flSel;
    var prem = [['Bloco', 'Premissa', 'Id', 'Valor', 'Unidade', 'Origem', 'Fonte']];
    SCHEMA.forEach(function (s) { var v = getPath(model, s.id); prem.push([s.bloco, s.label, s.id, s.fmt === 'pct' ? v : v, s.un, ORIG[s.origem] || s.origem, s.fonte]); });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(prem), 'Premissas');
    var eq = [['Pacote', 'Item', 'Modelo', 'Qtd', 'Preço unit.', 'Parcela unit.', 'CFI', 'Financiável', 'Obs']];
    ['B', 'C'].forEach(function (k) { model.equip[k].forEach(function (it) { eq.push([k, it.nome, it.modelo, it.qtd, it.preco, it.parcela || '', it.cfi || '', it.fin !== false ? 'sim' : 'não', it.obs || '']); }); });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(eq), 'Equipamentos');
    var e = c.cen.emg, p = c.cen.prop;
    var dre = [['DRE mensal (R$)', 'EMG', 'Imagem própria'], ['Exames', e.exames, p.exames], ['Receita bruta', e.rb, p.rb], ['Glosas', -e.glosa, -p.glosa], ['Receita líquida', e.rl, p.rl], ['Mat/Med', -e.matmed, -p.matmed], ['Repasse médicos', -e.rep_med, -p.rep_med], ['Repasse material EMG', -e.rep_mat, -p.rep_mat], ['Repasse biópsias', -e.rep_bio, -p.rep_bio], ['Médicos que usam a sala', -e.rep_sala, -p.rep_sala], ['Margem de contribuição', e.mc, p.mc], ['Custos fixos diretos', -e.cf_dir, -p.cf_dir], ['Manutenção', -e.manut, -p.manut], ['RIS/PACS', -e.rispacs, -p.rispacs], ['Custos indiretos', -e.cf_ind, -p.cf_ind], ['EBITDA', e.resultado, p.resultado]];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dre), 'DRE mensal');
    var fx = [['Ano', 'Ano civil', 'Fator volume', 'Fração', 'Receita líquida', 'EBITDA EMG', 'EBITDA própria', 'EBITDA incremental', 'Depreciação', 'Tributos', 'Residual', 'FCL projeto', 'Parcelas', 'Juros', 'Caixa hospital', 'Acum. projeto', 'Acum. hospital', 'DSCR projeto']];
    fx.push([0, model.fin.ano_inicio - 1, '', '', '', '', '', '', '', '', '', -fl.capex, '', '', fl.ent[0], -fl.capex, fl.ent[0], '']);
    fl.anos.forEach(function (a) { fx.push([a.t, a.ano, a.fator, a.frac, a.rl, a.ebitdaEmg, a.ebitdaProp, a.inc, a.dep, a.trib, a.residual, a.fcp, a.servico, a.juros, a.fce, a.acumP, a.acumE, a.dscr]); });
    fx.push([]); fx.push(['Alternativa', c.sel.id]); fx.push(['VPL projeto', fl.vpl]); fx.push(['TIR projeto', fl.tir]); fx.push(['Payback', fl.pb]); fx.push(['Payback descontado', fl.pbDesc]); fx.push(['VPL hospital', fl.vplEnt]); fx.push(['Caixa acumulado hospital', fl.acumEnt]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(fx), 'Fluxo ' + c.sel.id);
    var alt = [['Indicador', 'B · GE/HFS', 'C · VMI/fomento'], ['Investimento', c.B.capex, c.C.capex], ['Financiado', c.B.capexFin, c.C.capexFin], ['Linha', 'Fornecedores 60x', c.C.escolha ? c.C.escolha.linha.nome : ''], ['Prazo (m)', c.B.n, c.C.n], ['Carência (m)', 0, c.C.c], ['CET a.a. (%)', c.B.cetAno, c.C.cetAno], ['Parcela pós-carência', c.B.parcela, c.C.parcela], ['Total pago', c.B.pagos, c.C.pagos], ['Juros', c.B.juros, c.C.juros], ['VPL projeto', c.flB.vpl, c.flC.vpl], ['VPL hospital', c.flB.vplEnt, c.flC.vplEnt], ['Caixa acumulado', c.flB.acumEnt, c.flC.acumEnt], ['DSCR mín. projeto', c.flB.dscrMin, c.flC.dscrMin]];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(alt), 'Alternativas');
    if (c.C.escolha) { var cr = [['t', 'Ano', 'Mês', 'Taxa a.a. (%)', 'Saldo inicial', 'Juros', 'Amortização', 'Parcela', 'Saldo']]; c.C.escolha.sim.rows.forEach(function (r) { cr.push([r.t, r.y, r.m, r.taxa, r.saldoIni, r.juros, r.amort, r.parcela, r.saldo]); }); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cr), 'Cronograma C'); }
    var en = [['Ano', 'EBITDA hospital', 'EBITDA projeto', 'Serviço atual', 'Atual após TDC', 'Serviço novo', 'DSCR sem projeto', 'DSCR sem TDC', 'DSCR com TDC']]; c.ent.linhas.forEach(function (l) { en.push([l.ano, l.ebitdaEnt, l.inc, l.servAtual, l.servAtualTdc, l.servNovo, l.dscrSemProj, l.dscrSem, l.dscrCom]); });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(en), 'Crédito entidade');
    var out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    var nome = 'HDA_viabilidade_imagem_' + new Date().toISOString().slice(0, 10) + '.xlsx';
    if (downloads) downloads.save({ filename: nome, data: new Blob([out]) }).then(function () { toast('Planilha salva.'); }).catch(function (e) { if (!e || e.code !== 'declined') toast('Não foi possível salvar a planilha aqui.'); });
    else { try { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([out])); a.download = nome; a.click(); } catch (e) { toast('Download indisponível nesta visualização.'); } }
  }
  $('#btnXlsx').addEventListener('click', exportarXlsx);

  /* ================= boot ================= */
  $('#logoTopo').src = LOGO.navy;
  recompute(); renderAll();
  var t0 = lsGet('hda:tab'); showTab(t0 && $('#tab-' + t0) ? t0 : 'tese');
  initCaps();
})();
