/* ====================================================================
   Aplicação — estado, persistência, renderização das abas.
   ==================================================================== */
(function () {
  'use strict';
  var E = Engine, M = Motor, BASE = BASE_PADRAO;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ---------- registro de uso (só no domínio hospedado, com a camada de login) ---------- */
  var NO_DOMINIO = /\.sespartners\.com\.br$/.test(location.hostname);
  function registrarUso(tipo, extra) {
    if (!NO_DOMINIO) return;
    try { fetch('/.netlify/functions/log', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', keepalive: true, body: JSON.stringify(Object.assign({ tipo: tipo, path: location.pathname }, extra || {})) }).catch(function () {}); } catch (e) {}
  }

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
  function Psig(v, d) { if (v == null || !isFinite(v)) return '—'; return (v < 0 ? '−' : '+') + P(Math.abs(v), d); }
  function sinal(v) { return v == null ? '' : v >= 0 ? 'pos' : 'neg'; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  var toastT; function toast(s) { var t = $('#toast'); t.textContent = s; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 3200); }
  function parseBR(s) { if (typeof s === 'number') return s; s = String(s == null ? '' : s).trim().replace(/[R$\s%]/g, ''); if (!s) return 0; if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.'); else if (/^-?[1-9]\d{0,2}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ''); return Number(s) || 0; }
  var ORIG = { controladoria: 'Controladoria', jaime: 'Jaime', deck: 'Conselho', fonte: 'Fonte pública', ss: 'S&S', vmi: 'VMI', pendente: 'A validar' };
  var LINHAS_NOME = {}; BASE.linhas.forEach(function (l) { LINHAS_NOME[l.id] = l.nome; });

  /* ---------------- estado ---------------- */
  var model = modeloPadrao(), saved = clone(model), sim = null, calc = null, simCalc = null;
  var dirty = false, db = null, userCap = null, downloads = null, canWrite = null, dbState = 'carregando', versoes = [], vendoVersao = null;
  var tab = 'tese', saveT = null, ultimoSalvoEm = null;

  function sane(m) {
    var d = modeloPadrao(), out = clone(d);
    if (!m || typeof m !== 'object') return out;
    SCHEMA.forEach(function (s) { var v = getPath(m, s.id); if (v !== undefined && v !== null) setPath(out, s.id, v); });
    if (m.equip) { if (Array.isArray(m.equip.B)) out.equip.B = completarManut(clone(m.equip.B), EQUIP_B_PADRAO); if (Array.isArray(m.equip.C)) out.equip.C = completarManut(clone(m.equip.C), EQUIP_C_PADRAO); if (m.equip.B_n) out.equip.B_n = m.equip.B_n; }
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
    var c = calc, sel = c.sel, fl = c.flSel, altNome = altNome_(sel.id), linha = c.C.escolha ? c.C.escolha.linha.nome : '—', isD = sel.id === 'D';
    var emg = c.cen.emg, prop = c.cen.prop, e27 = c.ent.linhas[0];
    var h = '<div class="card hero"><span class="eyebrow">Decisão pedida à diretoria e ao Conselho da ABENSENA</span>' +
      '<h2>Internalizar o serviço de imagem com equipamentos nacionais financiados em prazo longo, contratando depois da emissão do TDC</h2>' +
      '<p class="lead muted">O hospital já paga a estrutura (espaço, enfermagem, técnicos, administração) e repassa ' + P(emg.repasse / emg.rl, 0) + ' da receita à EMG. Internalizado, o mesmo volume vira resultado positivo. Os números abaixo são calculados ao vivo a partir das premissas salvas; os marcados "a validar" mudam o resultado e estão listados no fim.</p></div>';
    h += '<div class="grid kpis">' +
      kpi('Resultado atual com a EMG', '<span class="' + sinal(emg.resultado) + '">' + R(emg.resultado) + '</span>', 'por mês · ' + P(emg.resultado / emg.rl, 1) + ' da receita líquida', 'bad') +
      kpi('Resultado com imagem própria', '<span class="' + sinal(prop.resultado) + '">' + R(prop.resultado) + '</span>', isD ? 'por mês, já com o aluguel dos equipamentos' : 'por mês em regime, com manutenção pós-garantia, antes das parcelas', 'good') +
      kpi('Ganho operacional', mi(c.ganhoMes * 12), (isD ? 'por ano em regime, após o aluguel · ' : 'por ano em regime · ') + R(c.ganhoMes) + '/mês', 'good') +
      (isD ? kpi((locTxt().sep ? 'Aluguel e manutenção' : 'Aluguel') + ' (' + altNome + ')', R(sel.aluguel), sel.n + ' meses, ' + locTxt().manut + ' · sem dívida nova', '') : kpi('Parcela do financiamento (' + altNome + ')', R(sel.parcela), sel.id === 'C' ? linha + ' · ' + (sel.n || '—') + ' meses, ' + (sel.c || 0) + ' de carência' : 'HFS/GE e fornecedores · 60 meses', '')) +
      kpi('VPL do projeto', '<span class="' + sinal(fl.vpl) + '">' + mi(fl.vpl) + '</span>', 'a ' + P(model.fin.desconto, 0) + ' a.a. · ' + model.fin.horizonte + ' anos', fl.vpl > 0 ? 'good' : 'bad') +
      (isD ? kpi('Investimento', R(0), 'só a implantação do RIS/PACS (' + R(model.propria.rispacs_impl) + '); retorno desde o 1º mês', 'good', true) : kpi('TIR · payback', (fl.tir == null ? '—' : P(fl.tir, 0)) + ' · ' + (fl.pb == null ? '—' : N(fl.pb, 1) + ' a'), 'payback descontado ' + (fl.pbDesc == null ? '—' : N(fl.pbDesc, 1) + ' anos'), 'good', true)) +
      kpi('DSCR do hospital em ' + e27.ano, X(e27.dscrSemProj) + ' → ' + X(e27.dscrSem), 'sem o projeto → com o projeto, sem TDC · com TDC ' + X(e27.dscrCom), e27.dscrSem != null && e27.dscrSem < 1.3 ? 'warn' : 'good', true) +
      '</div>';
    var ach = [];
    ach.push('<b>Hoje o serviço dá prejuízo.</b> Receita líquida de ' + R(emg.rl) + '/mês; a EMG fica com ' + R(emg.repasse) + ' (' + P(emg.repasse / emg.rl, 0) + '), o hospital arca com ' + R(emg.cf_dir + emg.cf_ind) + ' de custos fixos e indiretos e fecha em ' + R(emg.resultado) + '/mês (' + mi(emg.resultado * 12) + '/ano).');
    ach.push('<b>Internalizar inverte o sinal com a mesma receita.</b> Mantida a equipe médica a ' + P(model.propria.rep_med_pct, 1) + ' da receita e assumidos material, ' + (isD ? (locTxt().sep ? 'aluguel dos equipamentos e manutenção (' : 'aluguel dos equipamentos com manutenção (') + R(prop.aluguel) + '/mês)' : 'manutenção pós-garantia (' + R(prop.manut) + '/mês, plano ' + (sel.manut.plano === 'prata' ? 'Prata' : 'Ouro') + ')') + ' e RIS/PACS, o resultado vai a ' + R(prop.resultado) + '/mês. Ganho de ' + mi(c.ganhoMes * 12) + ' por ano, dos quais ' + mi(-emg.resultado * 12) + ' são a eliminação do prejuízo.');
    ach.push(isD ? '<b>Sem investimento em equipamentos.</b> TC 64/128, dois ultrassons, RX móvel, RX digital e placa DR alugados por ' + sel.n + ' meses a ' + R(sel.aluguel) + '/mês (' + Pp(sel.loc.pctMes * 100) + ' do valor ao mês; base: ' + locTxt().base + '; ' + locTxt().manut + '), com troca do equipamento na renovação. Para empatar com a compra financiada (C) o aluguel teria de ser ' + R(sel.equilibrioC) + '/mês.' : '<b>Investimento de ' + mi(sel.capex) + '</b> em TC 64/128, dois ultrassons, RX móvel, RX digital e placa DR' + (sel.id === 'C' ? ', com ' + mi(sel.capexFin) + ' financiados pela linha <b>' + esc(linha) + '</b> (CET ' + Pp(sel.cetAno) + ' a.a., parcela de ' + R(sel.parcela) + ' após a carência; ' + R(sel.primeira) + ' na carência)' : ', financiado pelo HFS e fornecedores em 60x (' + R(sel.parcela) + '/mês, custo implícito ' + Pp(sel.cetAno) + ' a.a.)') + '. O pacote GE/HFS custa ' + Pp(c.B.cetAno) + ' a.a. implícitos em 60 meses, com preço indexado ao dólar.');
    ach.push('<b>Compra ou locação.</b> VPL para o hospital em ' + model.fin.horizonte + ' anos: ' + mi(c.flC.vplEnt) + ' comprando o pacote VMI com fomento (C), ' + mi(c.flB.vplEnt) + ' comprando o pacote GE (B) e ' + mi(c.flD.vplEnt) + ' alugando o pacote VMI (D). A locação dispensa investimento e dívida nova e transfere a obsolescência ao locador' + (locTxt().sep ? '; pela cotação da VMI, a manutenção continua com o hospital (premissa a confirmar)' : ' junto com a manutenção') + '; a comparação completa está em Alternativas.');
    ach.push(isD ? '<b>Retorno.</b> VPL para o hospital de ' + mi(fl.vplEnt) + ' a ' + P(model.fin.desconto, 0) + ' a.a. em ' + model.fin.horizonte + ' anos, já descontado o aluguel; caixa acumulado de ' + mi(fl.acumEnt) + ' no horizonte.' : '<b>Retorno.</b> VPL de ' + mi(fl.vpl) + ' a ' + P(model.fin.desconto, 0) + ' a.a. em ' + model.fin.horizonte + ' anos, TIR de ' + (fl.tir == null ? '—' : P(fl.tir, 0)) + ', payback de ' + anos(fl.pb) + '. Caixa acumulado para o hospital após as parcelas: ' + mi(fl.acumEnt) + ' no horizonte; DSCR mínimo do projeto ' + X(fl.dscrMin) + '.');
    ach.push('<b>A restrição é o crédito do hospital, não o projeto.</b> Dívida líquida de ' + mi(c.ent.dl) + ' (' + X(c.ent.dlEbitda, 1) + ' o EBITDA anualizado de ' + mi(c.ent.ebitdaBase) + '); o serviço da dívida de ' + e27.ano + ' (' + mi(e27.servAtual) + ') consome todo o EBITDA (DSCR ' + X(e27.dscrSemProj) + '). O projeto melhora a cobertura (' + X(e27.dscrSem) + ') e o TDC a resolve (' + X(e27.dscrCom) + '). Por isso a contratação deve vir depois da emissão do TDC, com carência longa.');
    var tcap = c.tc; ach.push('<b>Capacidade.</b> Uma TC a ' + model.propria.tc_exh + ' exames/h, ' + model.propria.tc_h + ' h/dia, faz ' + N(tcap.cap) + ' exames/mês; o volume de ' + N(tcap.tc) + ' TC/mês ocupa ' + P(tcap.ocup, 0) + '. Equipamento único: a transição com a EMG precisa de sobreposição.');
    h += '<div class="card"><div class="card-h"><h2>O que o modelo diz</h2><span class="muted small">alternativa ' + sel.id + ' · ' + altNome + ' · cenário de volume ' + (model.cenario.volume_var >= 0 ? '+' : '') + P(model.cenario.volume_var, 0) + '</span></div><ul class="bullets">' + ach.map(function (a) { return '<li>' + a + '</li>'; }).join('') + '</ul></div>';
    /* por que VMI */
    h += '<div class="grid two"><div class="card"><div class="card-h"><h2>Por que equipamento nacional</h2></div><div class="grid" style="gap:12px">' +
      '<div class="tile"><h3>FINAME exige CFI, e o catálogo decide item a item</h3><p>Verificado no Catálogo CFI do BNDES em 14 e 15/10/2026: RX móvel Aquila 320 S (03538400) e RX digital Apolo D (03538246) constam; o ultrassom Invictus e a placa DR da VMI não aparecem (só o FGTS-Saúde, que não exige CFI, os financia, ou pedir o credenciamento); <b>a TC Pulsar ainda não consta</b>; a VMI prevê o credenciamento até dez/2026 (premissa de 15/10/2026), antes da contratação em 2027, e o modelo já a trata como credenciada. GE (CT Ascend, Aspire), Siemens, Philips, Canon e Imex têm TCs credenciadas. Validade dos códigos VMI usados: Aquila 320 S e Apolo D até mar/2030.</p><p class="src"><a href="https://ws.bndes.gov.br/cfi_catalogo/" target="_blank" rel="noopener">Catálogo CFI do BNDES</a></p></div>' +
      '<div class="tile"><h3>FGTS-Saúde: só a modalidade I está regulamentada</h3><p>Até 60 meses, sem carência, TR + 8,66% + até 3% de risco, pela Caixa, BB ou BNDES. Exige CEBAS na modalidade de 60% ao SUS e participação no Agora Tem Especialistas, e a parcela tem de caber em 35% da média mensal dos créditos SUS. A modalidade de investimento (20 anos, 12 de carência) ainda não foi regulamentada. ' + (calc.C.escolha && calc.C.escolha.linha.id === 'fgts-saude' ? 'Com as respostas informadas, é a linha em uso.' : 'Sem as respostas, o plano usa o FINAME.') + '</p><p class="src">Manual de Fomento FGTS Saúde v002 (Caixa, ago/2026); Res. CCFGTS 1.152/2026</p></div>' +
      '<div class="tile"><h3>Sem câmbio</h3><p>A proposta GE fixa o preço em dólar a R$ 5,1604; o pacote VMI é cotado em reais. Entre a proposta e o contrato o risco é do hospital.</p></div>' +
      '<div class="tile"><h3>SUS paga mais por TC no privado e no filantrópico</h3><p>A Portaria SAES/MS 4.282/2026 (Agora Tem Especialistas) leva a TC a cerca de R$ 300 por exame para quem adere. Receita adicional não modelada: entra como upside.</p><p class="src"><a href="https://www.conass.org.br/?p=57841" target="_blank" rel="noopener">Conass, Portaria 4.282</a></p></div>' +
      '</div></div>' +
      '<div class="card"><div class="card-h"><h2>O que pode dar errado</h2></div><div class="grid" style="gap:12px">' +
      '<div class="tile"><h3>A linha "médicos que usam a sala" pode não sumir</h3><p>' + R(c.base.emg.rep_sala * 12) + '/ano (' + P(model.base.rep_sala_pct, 1) + ' da receita). A Controladoria a zera na imagem própria; se for repasse a outras especialidades, permanece. É o maior swing do VPL (ver Simulador).</p></div>' +
      '<div class="tile"><h3>Material pode custar o triplo</h3><p>A planilha mantém 5,2% da receita; a própria nota diz que, com o material da EMG (R$ 60 mil/mês), vai a ~15%. Validar com o Jaime.</p></div>' +
      '<div class="tile"><h3>Contrato com a EMG e janela sem TC</h3><p>Prazo, aviso prévio e multa não constam dos documentos. A EMG é dona dos equipamentos: a saída precisa coincidir com a instalação da TC nova (sobreposição de ' + model.fin.inicio_op_mes + ' meses no modelo).</p></div>' +
      '<div class="tile"><h3>O CFI da Pulsar ainda não saiu</h3><p>O modelo assume o credenciamento até dez/2026 (premissa VMI). Se atrasar além do Gate 2, a TC fica fora do FINAME e vai para o FGTS-Saúde (se o hospital cumprir os requisitos) ou recurso próprio, enquanto a TC GE (Ascend, Aspire) entra. Para testar esse caso, coloque "Não" em "Tratar o pacote como credenciado" em Premissas.</p></div>' +
      '<div class="tile"><h3>Crédito antes do TDC</h3><p>Sem o TDC, o hospital rola capital de giro a 48 meses e a cobertura fica em ' + X(e27.dscrSem) + '. Um banco pode pedir garantia real ou recusar até a desalavancagem.</p></div>' +
      '</div></div></div>';
    /* gates */
    h += '<div class="card"><div class="card-h"><h2>Sequência de decisão</h2><span class="muted small">cada etapa libera a seguinte</span></div><div class="gates">' +
      '<div class="gate now"><div class="gh"><b>Gate 0</b><span>agora</span></div><ul><li>Aprovar a tese e o perímetro (TC, 2 US, RX móvel, RX digital, placa DR); decidir se o RX digital é fixo (Apolo, proposta VMI) ou portátil (pacote GE)</li><li>Formalizar a proposta VMI (preços de 15/10/2026), cotação de manutenção da Pulsar, do Apolo e do Invictus, CFI do Invictus e da placa DR; na locação (tabela de 16/10/2026, manutenção inclusa), confirmar se o RX digital é o Aquila D ou o Apolo D e cotar ultrassons e placa DR; acompanhar o credenciamento CFI da Pulsar (previsto até dez/2026)</li><li>Fechar as 4 premissas a validar: linha da sala, material, contrato EMG, RIS/PACS</li></ul></div>' +
      '<div class="gate"><div class="gh"><b>Gate 1</b><span>dez/26 – 1T27</span></div><ul><li>TDC emitido e negociação iniciada</li><li>CFI da Pulsar publicado no Catálogo (previsto dez/2026): condição para o FINAME do pacote</li><li>Protocolar o FINAME (agente) com o kit de documentos</li><li>Responder as perguntas do FGTS-Saúde (CEBAS 60% SUS, créditos SUS de 12 meses, contratos no Teto MAC) e confirmar o Agora Tem Especialistas; se couber, protocolar também na Caixa ou no BB</li></ul></div>' +
      '<div class="gate"><div class="gh"><b>Gate 2</b><span>2T27</span></div><ul><li>Contratação do financiamento e pedido de compra, ou assinatura da locação</li><li>Notificação à EMG; instalação com ' + model.fin.inicio_op_mes + ' meses de sobreposição</li><li>Contratar manutenção (início após a garantia) e RIS/PACS</li></ul></div>' +
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
    h += '<div class="grid two"><div class="card"><div class="card-h"><h2>DRE mensal: EMG × imagem própria</h2><span class="muted small">volume atual, regime após a garantia · alternativa ' + calc.sel.id + '</span></div><div class="tbl-wrap"><table><thead><tr><th>R$/mês</th><th class="n">EMG</th><th class="n">A.V.</th><th class="n">Própria</th><th class="n">A.V.</th></tr></thead><tbody>' +
      row('Receita bruta', e.rb, p.rb) + row('(−) Glosas', -e.glosa, -p.glosa, 'sub') + row('Receita líquida', e.rl, p.rl, 'total') +
      row('(−) Mat/Med', -e.matmed, -p.matmed) + row('(−) Repasse: médicos', -e.rep_med, -p.rep_med) + row('(−) Repasse: material EMG', -e.rep_mat, -p.rep_mat) + row('(−) Repasse: biópsias', -e.rep_bio, -p.rep_bio) + row('(−) Médicos que usam a sala', -e.rep_sala, -p.rep_sala) +
      row('Margem de contribuição', e.mc, p.mc, 'total') + row('(−) Custos fixos diretos', -e.cf_dir, -p.cf_dir) + row('(−) Manutenção pós-garantia', -e.manut, -p.manut) + (p.aluguel ? row('(−) Aluguel dos equipamentos', -e.aluguel, -p.aluguel) : '') + row('(−) RIS/PACS', -e.rispacs, -p.rispacs) + row('Margem direta', e.margem_direta, p.margem_direta, 'total') + row('(−) Custos indiretos', -e.cf_ind, -p.cf_ind) + row('Resultado operacional (EBITDA)', e.resultado, p.resultado, 'total hl') +
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
  var MANUT_CTRL = 11456.81 + 7037.5 + 7270.83; /* planilha da Controladoria: TC 7% a.a. + US e RX + provisão de tubo */
  var ALT_NOME = { A: 'Manter a EMG', B: 'GE/HFS', C: 'VMI, compra', D: 'VMI, locação' };
  function altNome_(id) { return ALT_NOME[id] || id; }
  function mediaMes(fl, t) { var a = fl.anos[t - 1]; return a ? a.desembolso / 12 : null; }
  function renderAlternativas() {
    var c = calc, m = model, B = c.B, C = c.C, D = c.D, fB = c.flB, fC = c.flC, fD = c.flD, e = c.cen.emg, pb = c.cen.propBase;
    var H = +m.fin.horizonte, EA = c.entAlt, sel = m.fin.alternativa;
    var lc = C.escolha ? C.escolha.linha : null, linhaC = lc ? lc.nome.split(' – ')[0].split(' / ')[0] : 'sem linha';
    var planoTxt = B.manut.plano === 'prata' ? 'Prata' : 'Ouro';
    var h = '<div class="card hero"><span class="eyebrow">Quatro caminhos, mesma receita</span><h2>Manter a EMG, comprar o pacote GE com o financiamento do fornecedor, comprar o pacote VMI com linha de fomento, ou alugar o pacote VMI</h2><p class="lead muted">B, C e D cobrem o mesmo perímetro; C e D usam os preços VMI de 15/10/2026 (' + mi(C.capex) + ', ' + Psig(C.capex / B.capex - 1, 1) + ' frente ao pacote GE de ' + mi(B.capex) + '), com o RX digital fixo (Apolo) no lugar do portátil com DR. Nas compras (B e C) entram as parcelas e o contrato de manutenção ' + planoTxt + ' depois de ' + m.manut.garantia_meses + ' meses de garantia; na locação (D) entra o aluguel ' + (locTxt().vmi ? 'da cotação VMI de 16/10/2026' : 'estimado por composição de custos') + (locTxt().sep ? ' mais o contrato de manutenção depois da garantia' : ', que já cobre a manutenção') + '. A alternativa levada ao Plano em números é a <b>' + sel + '</b>.</p></div>';
    function card(id, tit, cor, kv) { return '<div class="cmp' + (sel === id ? ' sel' : '') + '" style="--tc:' + cor + '"><b class="t">' + tit + '</b><div class="kv">' + kv.map(function (r) { return '<span>' + r[0] + '</span><b class="' + (r[2] || '') + '">' + r[1] + '</b>'; }).join('') + '</div></div>'; }
    var resB = pb.resultado - B.manut.mes - B.parcela, resC = pb.resultado - C.manut.mes - (C.parcela || 0), resD = pb.resultado - D.aluguel;
    h += '<div class="cmp3">' +
      card('A', 'A · Manter a EMG', 'var(--s-a)', [['Investimento', R(0)], ['Resultado mensal', R(e.resultado), 'neg'], ['Resultado anual', R(e.resultado * 12), 'neg'], ['Equipamentos', 'da EMG, ultrapassados'], ['Câmbio', 'nenhum'], ['Caixa em ' + H + ' anos', 'referência (zero)']]) +
      card('B', 'B · GE/CDK, compra, HFS 60x', 'var(--s-b)', [['Investimento', R(B.capex)], ['Financiado', R(B.capexFin) + ' (fornecedores)'], ['Prazo · carência', B.n + ' m · 0'], ['Custo implícito', Pp(B.cetAno) + ' a.a.'], ['Parcela', R(B.parcela) + '/mês'], ['Manutenção ' + planoTxt, R(B.manut.mes) + '/mês após a garantia'], ['Resultado mensal após parcela e manutenção', R(resB), sinal(resB)], ['Câmbio', 'TC em USD a 5,1604'], ['VPL para o hospital', mi(fB.vplEnt)], ['Caixa acumulado em ' + H + ' anos', mi(fB.acumEnt)]]) +
      card('C', 'C · VMI, compra, ' + esc(linhaC), 'var(--s-c)', [['Investimento', R(C.capex)], ['Financiado', R(C.capexFin) + (lc ? ' (' + esc(lc.operador.split(/[ ,(]/)[0]) + ')' : '')], ['Prazo · carência', (C.n || '—') + ' m · ' + (C.c || 0)], ['CET', Pp(C.cetAno) + ' a.a.'], ['Parcela', R(C.primeira) + ' na carência · ' + R(C.parcela) + ' depois'], ['Manutenção ' + planoTxt, R(C.manut.mes) + '/mês após a garantia'], ['Resultado mensal após parcela e manutenção', R(resC), sinal(resC)], ['Câmbio', 'nenhum (preço em R$)'], ['VPL para o hospital', mi(fC.vplEnt)], ['Caixa acumulado em ' + H + ' anos', mi(fC.acumEnt)]]) +
      card('D', 'D · VMI, locação ' + D.n + ' meses', 'var(--s-d)', [['Investimento', R(0) + ' (só RIS/PACS)'], ['Dívida nova', 'nenhuma'], [locTxt().sep ? 'Aluguel + manutenção' : 'Aluguel', R(D.aluguel) + '/mês desde a instalação'], ['Inclui', (locTxt().sep ? 'troca do equipamento a cada ' + D.n + ' meses; manutenção à parte (' + R(D.loc.manSep) + '/mês em média)' : 'manutenção total e troca do equipamento a cada ' + D.n + ' meses')], ['Custo ÷ valor do pacote', Pp(D.loc.pctMes * 100) + ' ao mês'], ['Base do aluguel', locTxt().vmi ? 'cotação VMI ' + R(D.loc.aluguelVmi) + ' + composição ' + R(D.aluguel - D.loc.aluguelVmi - D.loc.manSep) : 'composição, taxa ' + Pp(D.loc.taxaAno * 100) + ' a.a.'], ['Resultado mensal após aluguel', R(resD), sinal(resD)], ['Câmbio', 'nenhum'], ['VPL para o hospital', mi(fD.vplEnt)], ['Caixa acumulado em ' + H + ' anos', mi(fD.acumEnt)]]) +
      '</div>';
    /* tabela comparativa */
    var cols = [['A', null, null], ['B', fB, EA.B], ['C', fC, EA.C], ['D', fD, EA.D]];
    function best(vals, dir) { var v = vals.filter(function (x) { return x != null && isFinite(x); }); if (!v.length) return null; return dir > 0 ? Math.max.apply(null, v) : Math.min.apply(null, v); }
    function linha(rot, vals, fmt, dir, cls) {
      var b = dir ? best(vals.slice(1), dir) : null;
      return '<tr class="' + (cls || '') + '"><td>' + rot + '</td>' + vals.map(function (v, i) { var txt = typeof v === 'string' ? v : fmt(v); return '<td class="n' + (b != null && i > 0 && v === b ? ' best' : '') + '">' + txt + '</td>'; }).join('') + '</tr>';
    }
    var a3 = Math.min(3, H), a6 = Math.min(6, H);
    h += '<div class="card"><div class="card-h"><h2>Comparativo dos cenários</h2><span class="muted small">' + H + ' anos a partir de ' + m.fin.ano_inicio + ' · taxa de desconto ' + P(m.fin.desconto, 0) + ' a.a. · em destaque o melhor de B, C e D</span></div><div class="tbl-wrap"><table class="cmpT"><thead><tr><th></th><th class="n">A · EMG</th><th class="n">B · GE/HFS</th><th class="n">C · VMI compra</th><th class="n">D · VMI locação</th></tr></thead><tbody>' +
      '<tr class="sec"><td colspan="5">Como o hospital paga</td></tr>' +
      linha('Forma', ['—', 'compra, fornecedor 60x', 'compra, ' + esc(linhaC) + ' ' + (C.n || '—') + 'x', 'locação ' + D.n + ' m, renovável'], null) +
      linha('Desembolso no ano 0', [0, -fB.ent[0], -fC.ent[0], -fD.ent[0]], R, -1) +
      linha('Dívida nova (financiamento)', [0, B.capexFin, C.capexFin, 0], R, -1) +
      linha('Manutenção em regime (R$/mês)', ['—', R(B.manut.mes) + ' ' + planoTxt, R(C.manut.mes) + ' ' + planoTxt, 'inclusa'], null) +
      linha('Parcelas + manutenção ou aluguel, média mensal no ano 1', [0, mediaMes(fB, 1), mediaMes(fC, 1), mediaMes(fD, 1)], R, -1) +
      linha('… no ano 2', [0, mediaMes(fB, 2), mediaMes(fC, 2), mediaMes(fD, 2)], R, -1) +
      linha('… no ano ' + a3, [0, mediaMes(fB, a3), mediaMes(fC, a3), mediaMes(fD, a3)], R, -1) +
      linha('… no ano ' + a6, [0, mediaMes(fB, a6), mediaMes(fC, a6), mediaMes(fD, a6)], R, -1) +
      linha('Total desembolsado com equipamentos em ' + H + ' anos', [0, fB.desembolsoTot, fC.desembolsoTot, fD.desembolsoTot], mi, -1) +
      '<tr class="sec"><td colspan="5">Resultado</td></tr>' +
      linha('EBITDA incremental no ano ' + a3 + ' (após manutenção ou aluguel)', [0, fB.anos[a3 - 1].inc, fC.anos[a3 - 1].inc, fD.anos[a3 - 1].inc], mi, 1) +
      linha('VPL para o hospital (após parcelas ou aluguel)', [0, fB.vplEnt, fC.vplEnt, fD.vplEnt], mi, 1, 'hl') +
      linha('Caixa acumulado em ' + H + ' anos', [0, fB.acumEnt, fC.acumEnt, fD.acumEnt], mi, 1) +
      linha('VPL do projeto (sem financiamento)', ['—', fB.vpl, fC.vpl, fD.vpl], mi, 1) +
      '<tr class="sec"><td colspan="5">Crédito do hospital</td></tr>' +
      linha('DSCR do hospital em ' + EA.C.linhas[0].ano + ', sem TDC', [EA.C.linhas[0].dscrSemProj, EA.B.linhas[0].dscrSem, EA.C.linhas[0].dscrSem, EA.D.linhas[0].dscrSem], function (v) { return X(v); }, 1) +
      (EA.C.linhas[1] ? linha('DSCR do hospital em ' + EA.C.linhas[1].ano + ', sem TDC', [EA.C.linhas[1].dscrSemProj, EA.B.linhas[1].dscrSem, EA.C.linhas[1].dscrSem, EA.D.linhas[1].dscrSem], function (v) { return X(v); }, 1) : '') +
      linha('Dívida líquida ÷ EBITDA com o projeto', [EA.C.dlEbitda, EA.B.dlEbitdaProj, EA.C.dlEbitdaProj, EA.D.dlEbitdaProj], function (v) { return X(v, 1); }, -1) +
      '<tr class="sec"><td colspan="5">Riscos e o que sobra no fim</td></tr>' +
      linha('Equipamento no fim do horizonte', ['da EMG', 'próprio, com ' + H + ' anos (residual 0)', 'próprio, com ' + H + ' anos (residual 0)', 'do locador; trocado a cada ' + D.n + ' meses'], null) +
      linha('Risco de quebra e de tubo', ['EMG', planoTxt === 'Ouro' ? 'contrato Ouro' : 'hospital (Prata)', planoTxt === 'Ouro' ? 'contrato Ouro' : 'hospital (Prata)', locTxt().sep ? (planoTxt === 'Ouro' ? 'contrato Ouro (a confirmar com a VMI)' : 'hospital (Prata; a confirmar)') : 'locador'], null) +
      linha('Câmbio', ['—', 'TC em USD; peças importadas', 'não', 'não'], null) +
      '</tbody></table></div><p class="small muted" style="margin-top:8px">DSCR na coluna A: o hospital sem o projeto. Na locação o aluguel reduz o EBITDA e não entra como dívida; sob CPC 06 (R2)/IFRS 16 vira passivo de arrendamento, e agentes costumam olhar o EBITDAR. O modelo supõe renovação da locação ao mesmo aluguel, com equipamento novo, até o fim do horizonte.</p></div>';
    var cats = fB.anos.map(function (a) { return String(a.ano); });
    h += '<div class="grid two"><div class="card"><div class="card-h"><h2>Caixa acumulado para o hospital</h2><span class="muted small">ganho operacional menos parcelas, manutenção ou aluguel, vs. manter a EMG</span></div><div class="chart">' + svgLines({ cats: cats, series: [{ nome: 'B · GE/HFS', vals: fB.anos.map(function (a) { return a.acumE; }), cor: 'var(--s-b)' }, { nome: 'C · VMI compra', vals: fC.anos.map(function (a) { return a.acumE; }), cor: 'var(--s-c)' }, { nome: 'D · VMI locação', vals: fD.anos.map(function (a) { return a.acumE; }), cor: 'var(--s-d)' }], fmt: function (v) { return mi(v); }, h: 250, aria: 'Caixa acumulado por alternativa' }) + '</div></div>' +
      '<div class="card"><div class="card-h"><h2>Desembolso anual com os equipamentos</h2><span class="muted small">parcelas + manutenção (B, C) ou aluguel (D)</span></div><div class="chart">' + svgBars({ cats: cats, series: [{ nome: 'B · GE/HFS', vals: fB.anos.map(function (a) { return a.desembolso; }), cor: 'var(--s-b)' }, { nome: 'C · VMI compra', vals: fC.anos.map(function (a) { return a.desembolso; }), cor: 'var(--s-c)' }, { nome: 'D · VMI locação', vals: fD.anos.map(function (a) { return a.desembolso; }), cor: 'var(--s-d)' }], fmt: function (v) { return mi(v); }, h: 250, aria: 'Desembolso anual' }) + '</div></div></div>';
    /* leitura */
    var difCD = fC.vplEnt - fD.vplEnt, p60 = (c.prazosD || []).filter(function (x) { return x.n === D.n; })[0];
    var ctrl = MANUT_CTRL, rxOuro = C.manut.porItem.filter(function (x) { return x.id === 'rxp' || x.id === 'rxdr'; }).reduce(function (a, x) { return a + x.ouro; }, 0);
    h += '<div class="card"><div class="card-h"><h2>Leitura</h2></div><ul class="bullets">' +
      '<li>Qualquer forma de internalizar supera manter a EMG: VPL para o hospital de ' + mi(fB.vplEnt) + ' (B), ' + mi(fC.vplEnt) + ' (C) e ' + mi(fD.vplEnt) + ' (D), porque o hospital já paga a estrutura.</li>' +
      (difCD >= 0 ? '<li><b>Comprar com linha de fomento (C) rende mais que alugar (D)</b>: ' + mi(difCD) + ' de VPL em ' + H + ' anos. O custo da locação' : '<li><b>Alugar (D) rende mais que comprar com linha de fomento (C)</b>: ' + mi(-difCD) + ' de VPL em ' + H + ' anos. O custo da locação') + ' de ' + R(D.aluguel) + '/mês (' + Pp(D.loc.pctMes * 100) + ' do valor ao mês' + (locTxt().vmi ? ', cotação VMI' + (locTxt().sep ? ' + manutenção à parte' : '') : '') + ') começa a correr na instalação, sem a carência de que a compra se beneficia' + (locTxt().vmi ? locTxt().taxas : ', e embute a taxa do locador de ' + Pp(D.loc.taxaAno * 100) + ' a.a., acima do custo da linha de fomento (' + Pp(C.cetAno) + ' a.a.)') + (D.equilibrioC >= D.aluguel ? '. A locação tem folga de <b>' + R(D.equilibrioC - D.aluguel) + '/mês</b> até o aluguel de equilíbrio com C (' + R(D.equilibrioC) + '/mês): é a margem para a cotação dos itens ainda estimados' + (D.loc.semCotacao.length ? ' (' + R(D.aluguel - D.loc.aluguelVmi - D.loc.manSep) + '/mês hoje)' : '') + '.</li>' : '. Para empatar com C, o aluguel precisa ficar em <b>' + R(D.equilibrioC) + '/mês</b> (' + Psig(D.equilibrioC / D.aluguel - 1, 0) + ')' + (p60 ? '; no prazo de ' + D.n + ' meses, sem contar renovações, o empate é em ' + R(p60.equilibrio) + '/mês' : '') + '. É o número para negociar com a VMI.</li>') +
      '<li><b>O que a locação compra</b>: nenhum desembolso inicial nem dívida bancária nova antes do TDC, ' + (locTxt().sep ? 'risco de obsolescência com o locador (a manutenção, pela cotação, segue com o hospital: confirmar com a VMI)' : 'manutenção e risco do equipamento com o locador') + ', troca por equipamento novo a cada ' + D.n + ' meses (B e C chegam ao ano ' + H + ' com o equipamento original). Se o banco não aprovar a compra antes da desalavancagem, D não depende de linha bancária: o locador também analisa o crédito do hospital, mas fica com o equipamento como garantia.</li>' +
      '<li><b>Manutenção</b>: no plano ' + planoTxt + ', ' + R(C.manut.mes) + '/mês (C) e ' + R(B.manut.mes) + '/mês (B) a partir do ' + (+m.manut.garantia_meses + 1) + 'º mês de operação, contra ' + R(ctrl) + '/mês na planilha da Controladoria. A diferença vem dos dois RX: a cotação VMI (' + R(rxOuro) + '/mês no Ouro) é ' + N(rxOuro / 7037.5, 1) + ' vezes o que a planilha previa para ultrassom e RX juntos (R$ 7.038/mês). B e C ficam quase iguais porque, sem cotação da CDK, o RX do pacote GE usa a mesma referência.</li>' +
      (function () {
        var it = function (k, id) { return m.equip[k].filter(function (x) { return x.id === id; })[0] || {}; }, bx = it('B', 'rxdr'), cx = it('C', 'rxdr');
        var vb = (+bx.qtd || 0) * (+bx.preco || 0), vc = (+cx.qtd || 0) * (+cx.preco || 0), dTot = B.capex - C.capex, dRx = vb - vc;
        return '<li><b>Preço</b>: o pacote VMI sai por ' + mi(C.capex) + ' contra ' + mi(B.capex) + ' do GE (' + Psig(C.capex / B.capex - 1, 1) + ').' + (Math.abs(dTot) > 1 ? ' Do diferencial de ' + mi(dTot) + ', ' + mi(dRx) + ' vêm do RX digital: ' + esc(cx.modelo || '') + ', de ' + mi(vc) + ', no lugar do item GE “' + esc(bx.nome || '') + '”, de ' + mi(vb) + '.' : '') + ' O Apolo é fixo (sala) e o item do pacote GE é portátil (leito); se o hospital precisar do portátil, o Aquila 500 D volta ao pacote e a vantagem de preço diminui.</li>';
      })() +
      '<li>Entre B e C a diferença segue no financiamento: ' + Pp(B.cetAno) + ' a.a. em 60 meses com câmbio, contra ' + Pp(C.cetAno) + ' a.a. em ' + (C.n || '—') + ' meses em reais' + (lc && lc.iof === 'zero' ? ', sem IOF' : '') + '. A Pulsar entra no FINAME com o CFI previsto para dez/2026 (premissa VMI); até a publicação, é condição suspensiva da contratação.</li></ul></div>';
    $('#tab-alternativas').innerHTML = h;
  }

  /* ================= PLANO EM NÚMEROS ================= */
  function renderNumeros() {
    var c = calc, m = model, fl = c.flSel, sel = c.sel, isD = sel.id === 'D';
    var cats = fl.anos.map(function (a) { return String(a.ano); });
    var rotOpex = isD ? (locTxt().sep ? '(−) Aluguel dos equipamentos e manutenção à parte' : '(−) Aluguel dos equipamentos (manutenção inclusa)') : '(−) Manutenção pós-garantia, plano ' + (sel.manut.plano === 'prata' ? 'Prata' : 'Ouro');
    var eyebrow = 'Alternativa ' + sel.id + ' · ' + (sel.id === 'C' ? 'VMI, compra · ' + (c.C.escolha ? esc(c.C.escolha.linha.nome) : '') : sel.id === 'B' ? 'GE/HFS 60x' : 'VMI, locação de ' + sel.n + ' meses a ' + R(sel.aluguel) + '/mês');
    var h = '<div class="card hero"><span class="eyebrow">' + eyebrow + '</span><h2>Fluxo de caixa incremental: imagem própria menos manter a EMG, ' + m.fin.horizonte + ' anos a partir de ' + m.fin.ano_inicio + '</h2><p class="lead muted">Ano 1 com ' + m.fin.inicio_op_mes + ' meses de transição. ' + (isD ? 'O aluguel corre desde a instalação e é renovado ao mesmo valor, com equipamento novo, a cada ' + sel.n + ' meses.' : 'A manutenção começa depois de ' + m.manut.garantia_meses + ' meses de garantia, contados da instalação.') + ' Valores constantes (reajuste ' + P(m.cenario.reajuste_aa, 1) + ' a.a.), volume ' + (m.cenario.volume_var >= 0 ? '+' : '') + P(m.cenario.volume_var, 0) + ' sobre a base e crescimento de ' + P(m.cenario.cresc_aa, 1) + ' a.a. a partir do ano 2.</p></div>';
    h += '<div class="grid kpis">' + kpi('VPL do projeto', '<span class="' + sinal(fl.vpl) + '">' + mi(fl.vpl) + '</span>', 'a ' + P(m.fin.desconto, 0) + ' a.a.' + (isD ? ' · na locação é igual ao do hospital' : ''), fl.vpl > 0 ? 'good' : 'bad') + kpi('TIR', isD || fl.tir == null ? '—' : P(fl.tir, 1), isD ? 'sem investimento relevante (só RIS/PACS)' : 'do projeto, sem dívida') + kpi('Payback', isD ? 'imediato' : anos(fl.pb), isD ? 'sem investimento em equipamentos' : 'descontado ' + anos(fl.pbDesc)) + kpi('Índice de retorno', isD ? '—' : X(fl.ir), isD ? 'não se aplica à locação' : 'VP das entradas ÷ investimento') + kpi('VPL para o hospital', mi(fl.vplEnt), isD ? 'após o aluguel' : 'após parcelas; TIR ' + (fl.tirEnt == null ? '—' : P(fl.tirEnt, 0))) + kpi('Caixa acumulado', mi(fl.acumEnt), (isD ? 'após o aluguel, ' : 'após parcelas, ') + m.fin.horizonte + ' anos') + '</div>';
    h += '<div class="card"><div class="card-h"><h2>Ganho operacional, ' + (isD ? 'aluguel' : 'manutenção, parcelas') + ' e caixa</h2><span class="muted small">R$ por ano</span></div><div class="chart">' + svgBars({ cats: cats, series: [{ nome: 'Ganho antes de ' + (isD ? 'aluguel' : 'manutenção'), vals: fl.anos.map(function (a) { return a.incBase; }), cor: 'var(--s-d)' }, { nome: isD ? 'Aluguel' : 'Manutenção', vals: fl.anos.map(function (a) { return -a.opex; }), cor: 'var(--s-a)' }, { nome: 'Parcelas', vals: fl.anos.map(function (a) { return -a.servico; }), cor: 'var(--s-b)' }, { nome: 'Caixa para o hospital', vals: fl.anos.map(function (a) { return a.fce; }), cor: 'var(--s-c)' }], fmt: function (v) { return mi(v); }, h: 260, aria: 'Fluxo anual' }) + '</div></div>';
    function tr(l, f, cls) { return '<tr class="' + (cls || '') + '"><td>' + l + '</td><td class="n"></td>' + fl.anos.map(function (a) { return '<td class="n">' + f(a) + '</td>'; }).join('') + '</tr>'; }
    h += '<div class="card"><div class="card-h"><h2>Fluxo de caixa incremental</h2><span class="muted small">R$, nominal</span></div><div class="tbl-wrap"><table><thead><tr><th></th><th class="n">Ano 0</th>' + fl.anos.map(function (a) { return '<th class="n">' + a.ano + '</th>'; }).join('') + '</tr></thead><tbody>' +
      tr('Fator de volume', function (a) { return N(a.fator, 2); }, 'sub') + tr('Fração do ano em operação própria', function (a) { return P(a.frac, 0); }, 'sub') +
      tr('Receita líquida', function (a) { return R(a.rl); }) + tr('EBITDA com a EMG (status quo), 12 meses', function (a) { return R(a.ebitdaEmg); }) + tr('EBITDA imagem própria antes de manutenção e aluguel, 12 meses', function (a) { return R(a.ebitdaPropBase); }) +
      tr('Diferença × fração do ano', function (a) { return R(a.incBase); }) + tr(rotOpex, function (a) { return R(-a.opex); }) +
      tr('EBITDA incremental', function (a) { return R(a.inc); }, 'total') + tr('(−) Depreciação', function (a) { return R(-a.dep); }, 'sub') + tr('(−) Tributos', function (a) { return R(-a.trib); }, 'sub') +
      '<tr><td>(−) Investimento</td><td class="n">' + R(-fl.capex) + '</td>' + fl.anos.map(function () { return '<td class="n"></td>'; }).join('') + '</tr>' +
      tr('(+) Valor residual', function (a) { return R(a.residual); }, 'sub') +
      '<tr class="total"><td>Fluxo de caixa livre do projeto</td><td class="n">' + R(-fl.capex) + '</td>' + fl.anos.map(function (a) { return '<td class="n">' + R(a.fcp) + '</td>'; }).join('') + '</tr>' +
      tr('Acumulado', function (a) { return R(a.acumP); }, 'sub') +
      '<tr class="sec"><td colspan="' + (fl.anos.length + 2) + '">' + (isD ? 'Locação: sem financiamento, o aluguel já está no EBITDA' : 'Com financiamento (alternativa ' + sel.id + ')') + '</td></tr>' +
      tr('(−) Parcelas', function (a) { return R(-a.servico); }) + (sel.id === 'C' ? tr('    das quais juros', function (a) { return R(-a.juros); }, 'sub') : '') +
      '<tr class="total hl"><td>Caixa para o hospital</td><td class="n">' + R(fl.ent[0]) + '</td>' + fl.anos.map(function (a) { return '<td class="n">' + R(a.fce) + '</td>'; }).join('') + '</tr>' +
      tr('Acumulado', function (a) { return R(a.acumE); }, 'sub') + tr('DSCR do projeto', function (a) { return X(a.dscr); }, 'sub') +
      '</tbody></table></div><p class="small muted" style="margin-top:8px">' + (isD ? 'Ano 0: só a implantação do RIS/PACS.' : 'Ano 0 com financiamento: parte não financiada (RIS/PACS' + (sel.id === 'C' && sel.capexFin < sel.capex ? ' e ' + P(1 - sel.capexFin / (sel.capex || 1), 0) + ' do pacote' : '') + ') e custos iniciais (IOF, tarifa). A Controladoria zera o ano 0 porque considera 100% financiado.') + ' ' + (isD ? 'Aluguel por ano = aluguel mensal × meses de operação × reajuste.' : 'Manutenção por ano = contrato mensal × meses após a garantia × reajuste (ano 1: zero; ano 2: ' + E.mesesAno(m, 2, m.manut.garantia_meses) + ' meses).') + '</p></div>';
    /* DRE anual em regime */
    var a2 = c.cen.prop;
    h += '<div class="card"><div class="card-h"><h2>DRE anual da imagem própria em regime</h2><span class="muted small">12 meses, ' + (isD ? 'com aluguel' : 'após a garantia') + ', volume do cenário</span></div><div class="tbl-wrap"><table><thead><tr><th></th><th class="n">R$/ano</th><th class="n">% RL</th></tr></thead><tbody>' +
      [['Receita bruta', a2.rb], ['(−) Glosas', -a2.glosa], ['Receita líquida', a2.rl, 'total'], ['(−) Mat/Med', -a2.matmed], ['(−) Repasse médico', -a2.rep_med], ['(−) Outros repasses mantidos', -(a2.rep_mat + a2.rep_bio + a2.rep_sala)], ['Margem de contribuição', a2.mc, 'total'], ['(−) Custos fixos diretos', -a2.cf_dir], isD ? [locTxt().sep ? '(−) Aluguel e manutenção dos equipamentos' : '(−) Aluguel dos equipamentos', -a2.aluguel] : ['(−) Manutenção pós-garantia', -a2.manut], ['(−) RIS/PACS', -a2.rispacs], ['(−) Custos indiretos', -a2.cf_ind], ['EBITDA', a2.resultado, 'total hl']].map(function (r) { return '<tr class="' + (r[2] || '') + '"><td>' + r[0] + '</td><td class="n">' + R(r[1] * 12) + '</td><td class="n">' + P(r[1] / a2.rl, 1) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    $('#tab-numeros').innerHTML = h;
  }

  /* ================= INVESTIMENTO E FINANCIAMENTO ================= */
  function equipTable(key) {
    var itens = model.equip[key], isB = key === 'B', cx = E.capexDe(itens), mt = calc[key].manut;
    var h = '<div class="tbl-wrap"><table class="ge"><thead><tr><th>Item</th><th>Modelo</th><th class="n">Qtd</th><th class="n">Preço unit. (R$)</th>' + (isB ? '<th class="n">Parcela unit. (R$)</th><th class="n">Taxa implícita</th>' : '<th>CFI</th>') + '<th>Financiável</th><th class="n">Manut. Prata (R$/mês/un.)</th><th class="n">Manut. Ouro (R$/mês/un.)</th><th>Observação</th><th></th></tr></thead><tbody>';
    itens.forEach(function (it, i) {
      var imp = isB ? calc.B.implic[i] : null;
      h += '<tr><td><input class="w-m" data-eq="' + key + '.' + i + '.nome" value="' + esc(it.nome) + '"></td><td><input class="w-m" data-eq="' + key + '.' + i + '.modelo" value="' + esc(it.modelo) + '"></td><td class="n"><input class="n w-s" data-eq="' + key + '.' + i + '.qtd" value="' + esc(it.qtd) + '"></td><td class="n"><input class="n" data-eq="' + key + '.' + i + '.preco" value="' + esc(NF2.format(it.preco)) + '"></td>' +
        (isB ? '<td class="n"><input class="n" data-eq="' + key + '.' + i + '.parcela" value="' + esc(NF2.format(it.parcela || 0)) + '"></td><td class="n">' + (imp ? (imp.taxaAno == null ? '—' : Pp(imp.taxaAno)) + (imp.alerta ? ' <span class="pill bad">' + esc(imp.alerta) + '</span>' : '') : '') + '</td>' : '<td><input class="w-s" data-eq="' + key + '.' + i + '.cfi" value="' + esc(it.cfi || '') + '" placeholder="a informar"></td>') +
        '<td><input type="checkbox" data-eq="' + key + '.' + i + '.fin"' + (it.fin !== false ? ' checked' : '') + '></td>' +
        '<td class="n"><input class="n w-n" data-eq="' + key + '.' + i + '.m_prata" value="' + esc(NF2.format(it.m_prata || 0)) + '">' + (it.tubo ? '<div class="tiny muted">+ tubo ' + R(model.propria.tubo) + '</div>' : '') + '</td>' +
        '<td class="n"><input class="n w-n" data-eq="' + key + '.' + i + '.m_ouro" value="' + esc(NF2.format(it.m_ouro || 0)) + '"></td>' +
        '<td class="wrap small muted">' + esc(it.obs || '') + '</td><td><button class="sm ghost danger" data-eqdel="' + key + '.' + i + '" title="Remover">×</button></td></tr>';
    });
    h += '<tr class="total"><td>Total</td><td></td><td class="n">' + itens.reduce(function (s, i) { return s + (+i.qtd || 0); }, 0) + '</td><td class="n">' + R(cx.total) + '</td>' + (isB ? '<td class="n">' + R(cx.parcelaMes) + '/mês</td><td class="n">' + Pp(calc.B.cetAno) + '</td>' : '<td></td>') + '<td class="n">' + R(cx.financiavel) + '</td><td class="n">' + R(mt.prata) + '/mês</td><td class="n">' + R(mt.ouro) + '/mês</td><td></td><td></td></tr></tbody></table></div><div class="row" style="margin-top:8px"><button class="sm" data-eqadd="' + key + '">+ Item</button></div>';
    return h;
  }
  /* ---------- manutenção pós-garantia ---------- */
  function pctVmi() {
    var f = function (id) { return model.equip.C.filter(function (x) { return x.id === id; })[0]; }, s = f('rxp'), d = f('rxdr');
    if (!s || !d || !+s.preco || !+d.preco) return '';
    var a = function (it, k) { return P(+it[k] * 12 / +it.preco, 0); };
    return 'Equivalem a ' + a(s, 'm_prata') + '–' + a(s, 'm_ouro') + ' a.a. do preço VMI do Aquila S e, usados como proxy do Apolo D, ' + a(d, 'm_prata') + '–' + a(d, 'm_ouro') + ' do preço do Apolo, acima da faixa usual de 5% a 12% a.a. para contratos de imagem (contratos de equipamento barato pesam mais por terem custo fixo de visita). A própria tabela de locação da VMI cobra ' + R(+((s.loc_vmi || {})[48] || 0)) + '/mês pelo Aquila S em 48 meses, menos que o contrato Ouro do mesmo equipamento.';
  }
  function cardManut() {
    var c = calc, m = model, B = c.B.manut, C = c.C.manut, ouro = B.plano === 'ouro';
    var ini = +m.fin.inicio_op_mes || 0, G = +m.manut.garantia_meses || 0, mesIni = ini + G + 1, anoIni = +m.fin.ano_inicio + Math.floor((mesIni - 1) / 12), mesCal = ((mesIni - 1) % 12) + 1;
    var NOMES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    var h = '<div class="card"><div class="card-h"><h2>Manutenção pós-garantia (compras B e C)</h2><div class="row"><label>Plano <select id="selPlano"><option value="ouro"' + (ouro ? ' selected' : '') + '>Ouro</option><option value="prata"' + (!ouro ? ' selected' : '') + '>Prata</option></select></label><label>Garantia <input class="n" style="width:64px" id="inGar" value="' + esc(G) + '"> meses</label></div></div>';
    h += '<div class="grid kpis">' + kpi('Pacote C · VMI', R(C.mes) + '/mês', 'plano ' + (ouro ? 'Ouro' : 'Prata') + ' · Prata ' + R(C.prata) + ' · Ouro ' + R(C.ouro), 'warn', true) + kpi('Pacote B · GE/CDK', R(B.mes) + '/mês', 'plano ' + (ouro ? 'Ouro' : 'Prata') + ' · Prata ' + R(B.prata) + ' · Ouro ' + R(B.ouro), 'warn', true) + kpi('Planilha da Controladoria', R(MANUT_CTRL) + '/mês', 'TC 7% a.a. + US e RX + provisão de tubo', '', true) + kpi('Início da cobrança', NOMES[mesCal - 1] + '/' + anoIni, 'depois de ' + G + ' meses de garantia, contados da instalação', '', true) + '</div>';
    var rows = C.porItem.map(function (x, i) { var b = B.porItem[i] || {}; var it = m.equip.C[i] || {}, V = (+it.qtd || 0) * (+it.preco || 0); var itB = m.equip.B[i] || {}; return '<tr><td>' + esc(x.nome) + '</td><td class="n">' + R(b.prata) + '</td><td class="n">' + R(b.ouro) + '</td><td class="n">' + R(x.prata) + '</td><td class="n">' + R(x.ouro) + '</td><td class="n">' + (V ? P(x.ouro * 12 / V, 0) : '—') + '</td><td class="wrap tiny muted" style="min-width:260px;max-width:360px"><b>C:</b> ' + esc(it.m_fonte || '—') + '<br><b>B:</b> ' + esc(itB.m_fonte || '—') + '</td></tr>'; }).join('');
    h += '<div class="tbl-wrap" style="margin-top:12px"><table><thead><tr><th>R$/mês (quantidade incluída)</th><th class="n">B · Prata</th><th class="n">B · Ouro</th><th class="n">C · Prata</th><th class="n">C · Ouro</th><th class="n">C · Ouro, % a.a. do preço</th><th>Fonte dos valores</th></tr></thead><tbody>' + rows + '<tr class="total"><td>Total</td><td class="n">' + R(B.prata) + '</td><td class="n">' + R(B.ouro) + '</td><td class="n">' + R(C.prata) + '</td><td class="n">' + R(C.ouro) + '</td><td></td><td></td></tr></tbody></table></div>';
    h += '<ul class="bullets small" style="margin-top:10px"><li><b>Ouro</b>: preventiva e corretiva com cobertura total de peças, incluindo tubo, gerador de alta tensão e sistemas de imagem. <b>Prata</b>: cobertura parcial, sem tubo, gerador e sistemas de imagem; a TC soma a provisão de tubo da Controladoria. No Prata, a quebra de gerador ou detector de RX fica com o hospital e não está provisionada.</li>' +
      '<li><b>Cotação VMI (média SP, 15/10/2026)</b>: Aquila S R$ 3.900 (Prata) e R$ 6.800 (Ouro); Aquila D R$ 4.600 e R$ 7.500, tratados como R$/mês. ' + pctVmi() + ' Confirmar com a VMI se são mensais e se cedem no pacote.</li>' +
      '<li><b>Pacote GE (benchmark)</b>: TC pelo plano GE citado pelo Jaime (R$ 17 mil/mês com peças), na linha dos contratos públicos de TC com tubo; ultrassom pelo contrato de manutenção GE da EBSERH; RX pela cotação VMI de equipamento da mesma classe, na falta de cotação da CDK. A TC GE tem peças importadas: reajuste do contrato exposto ao câmbio.</li>' +
      '<li><b>Sem cotação ainda</b>: TC Pulsar e ultrassom Invictus, estimados pela mediana dos contratos públicos abaixo; RX digital Apolo, pela cotação do Aquila D.</li></ul>';
    h += '<details style="margin-top:8px"><summary>Contratos públicos usados como referência (PNCP)</summary><div class="tbl-wrap"><table><thead><tr><th>Mod.</th><th>Objeto</th><th>Órgão</th><th class="n">Ano</th><th class="n">Valor</th><th class="n">Meses</th><th class="n">R$/mês</th></tr></thead><tbody>' + BENCH_MANUT.map(function (b) { return '<tr><td>' + b.mod + '</td><td><a href="' + b.url + '" target="_blank" rel="noopener">' + esc(b.obj) + '</a></td><td class="small">' + esc(b.org) + '</td><td class="n">' + b.ano + '</td><td class="n">' + R(b.total) + '</td><td class="n">' + b.meses + '</td><td class="n">' + R(b.total / b.meses) + '</td></tr>'; }).join('') + '</tbody></table></div></details></div>';
    return h;
  }
  /* ---------- alternativa D: locação ---------- */
  function locTxt() {
    var L = calc.D.loc, vmi = L.usaVmi && L.nVmi > 0, sep = vmi && !L.manInclusa, pl = L.plano === 'prata' ? 'Prata' : 'Ouro';
    return { vmi: vmi, sep: sep, plano: pl,
      manut: sep ? 'manutenção à parte (contrato ' + pl + ' após a garantia)' : 'manutenção inclusa',
      base: vmi ? 'cotação de locação da VMI' + (L.semCotacao.length ? ', com composição de custos nos itens sem cotação' : '') : 'composição de custos do locador',
      custo: sep ? 'aluguel e manutenção' : 'aluguel',
      taxas: (function () { var t = L.linhas.filter(function (x) { return x.fonte === 'vmi'; }).map(function (x) { return x.taxaImpl == null ? null : { id: x.id, v: x.taxaImpl }; }), tc = t.filter(function (x) { return x && x.id === 'tc'; })[0], rx = t.filter(function (x) { return x && x.id !== 'tc'; }).map(function (x) { return x.v; }); return '; pela cotação, ' + (L.manInclusa ? 'mesmo tratando o aluguel inteiro como financiamento (ele também paga a manutenção), ' : '') + 'a TC sai a uma taxa implícita de ' + (tc ? Pp(tc.v * 100) : '—') + ' a.a. (arrendamento PJ do BCB: ' + Pp((+model.altD.taxa_base || 0) * 100) + ')' + (rx.length ? ' e os RX a ' + rx.map(function (v) { return Pp(v * 100, 0); }).join(' e ') + ' a.a.' : ''); })() };
  }
  function cardLocacao() {
    var c = calc, m = model, D = c.D, L = D.loc, PZ = c.prazosD || [], d = m.altD, lt = locTxt();
    var cot = m.equip.C.filter(function (it) { return it.loc_vmi; });
    var h = '<div class="card hero"><span class="eyebrow">Alternativa D · locação de longo prazo do pacote VMI</span><h2>' + (lt.sep ? 'Custo de ' + R(D.aluguel) + '/mês por ' + D.n + ' meses: aluguel de ' + R(L.fin) + ' e manutenção média de ' + R(L.manSep) + ' paga à parte' : 'Aluguel de ' + R(D.aluguel) + '/mês por ' + D.n + ' meses, com manutenção inclusa') + '</h2><p class="lead muted">' +
      (lt.vmi ? 'Cotação de locação da VMI de 16/10/2026 para a TC, o Aquila S e o Aquila D, de 12 a 84 meses; a VMI sugere 48 meses. ' + (L.semCotacao.length ? 'Sem cotação (' + esc(L.semCotacao.join('; ')) + '): aluguel montado pelos custos de um locador. ' : '') + (L.manInclusa ? 'O aluguel já inclui a manutenção (confirmado em 17/10/2026): não há contrato à parte depois da garantia.' : 'Cenário de comparação: manutenção cobrada à parte, com o contrato ' + lt.plano + ' depois de ' + m.manut.garantia_meses + ' meses de garantia, como na compra. A VMI confirmou que o aluguel já a inclui.') : 'Aluguel montado pelos custos de um locador (cotação VMI desligada em Premissas): recuperar o valor do equipamento menos o que ele vale no fim do prazo, à taxa exigida, mais tributos e o contrato de manutenção Ouro.') + '</p></div>';
    /* tabela VMI */
    if (cot.length) {
      var prz = [12, 24, 36, 48, 60, 72, 84], pz = {}; PZ.forEach(function (z) { pz[z.n] = z; });
      h += '<div class="card"><div class="card-h"><h2>Tabela de locação da VMI</h2><span class="muted small">R$/mês por unidade · 16/10/2026</span></div><div class="tbl-wrap"><table><thead><tr><th>Prazo</th>' + cot.map(function (it) { return '<th class="n">' + esc(it.loc_vmi_modelo || it.modelo) + '</th>'; }).join('') + '<th class="n">Três itens</th><th class="n">Pacote completo/mês</th><th class="n">VPL hospital ' + m.fin.horizonte + 'a</th></tr></thead><tbody>' +
        prz.map(function (n) { var tot = cot.reduce(function (s, it) { return s + (+it.loc_vmi[n] || 0) * (+it.qtd || 1); }, 0), z = pz[n]; return '<tr class="' + (n === D.n ? 'hl' : '') + '"><td>' + n + ' meses' + (n === 48 ? ' <span class="pill info">sugestão VMI</span>' : '') + '</td>' + cot.map(function (it) { return '<td class="n">' + R(+it.loc_vmi[n] || 0) + '</td>'; }).join('') + '<td class="n">' + R(tot) + '</td><td class="n">' + (z ? R(z.aluguel) : '—') + '</td><td class="n">' + (z ? mi(z.vplEnt) : '—') + '</td></tr>'; }).join('') +
        '</tbody></table></div><p class="small muted" style="margin-top:8px">Pacote completo = três itens cotados ' + (lt.sep ? '+ manutenção à parte (média no prazo) ' : '') + '+ ultrassons e placa DR pela composição de custos. 12 meses fica fora da simulação: renovar o pacote todo ano não é uma opção prática. Acima de 60 meses o aluguel quase não cai (TC: ' + R(cot[0].loc_vmi[60]) + ' em 60 m e ' + R(cot[0].loc_vmi[84]) + ' em 84 m) e o equipamento envelhece no contrato.' + (cot.some(function (it) { return it.id === 'rxdr'; }) ? ' A VMI cotou o RX digital como Aquila D; na compra, o RX digital é o Apolo D (fixo, ' + R((m.equip.C.filter(function (x) { return x.id === 'rxdr'; })[0] || {}).preco) + '): confirmar se é o mesmo equipamento.' : '') + '</p></div>';
    }
    /* composição no prazo */
    h += '<div class="card"><div class="card-h"><h2>Custo mensal no prazo de ' + D.n + ' meses</h2><div class="row"><label>Prazo <select id="selPrazoD">' + E.PRAZOS_D.map(function (n) { return '<option value="' + n + '"' + (n === D.n ? ' selected' : '') + '>' + n + ' meses' + (n === 48 ? ' (sugestão VMI)' : '') + '</option>'; }).join('') + '</select></label>' +
      '<label>Manutenção <select id="selManD"><option value="sim"' + (d.vmi_manut !== 'nao' ? ' selected' : '') + '>inclusa no aluguel</option><option value="nao"' + (d.vmi_manut === 'nao' ? ' selected' : '') + '>à parte (cenário)</option></select></label>' +
      '<label>Base <select id="selFonteD"><option value="vmi"' + ((d.fonte || 'vmi') !== 'composicao' ? ' selected' : '') + '>cotação VMI</option><option value="composicao"' + (d.fonte === 'composicao' ? ' selected' : '') + '>composição de custos</option></select></label></div></div>';
    h += '<div class="grid kpis">' + (lt.vmi ? kpi('Aluguel VMI', R(L.aluguelVmi) + '/mês', L.nVmi + ' itens cotados, ' + D.n + ' meses', '', true) : kpi('Taxa do locador', Pp(L.taxaAno * 100) + ' a.a.', 'arrendamento PJ ' + Pp(d.taxa_base * 100) + ' (BCB, ago/26) + prêmio ' + Pp(d.premio * 100), '', true)) +
      kpi('Manutenção à parte', R(L.manSep) + '/mês', lt.sep ? 'cenário: contrato ' + lt.plano + ' × (' + D.n + ' − ' + m.manut.garantia_meses + ') ÷ ' + D.n + ' meses' : 'nenhuma: inclusa no aluguel VMI', lt.sep ? 'warn' : '', true) +
      kpi('Itens sem cotação', R(L.aluguel - L.aluguelVmi - L.manSep) + '/mês', L.semCotacao.length ? 'composição de custos, com Ouro' : 'nenhum', '', true) +
      kpi('Custo mensal total', R(D.aluguel), Pp(L.pctMes * 100) + ' do valor do pacote ao mês', '', true) +
      kpi('Equilíbrio com C', R(D.equilibrioC) + '/mês', 'mesmo VPL para o hospital em ' + m.fin.horizonte + ' anos (' + Psig(D.equilibrioC / D.aluguel - 1, 0) + ')', D.equilibrioC < D.aluguel ? 'warn' : 'good', true) + '</div>';
    h += '<div class="tbl-wrap" style="margin-top:12px"><table><thead><tr><th>Item</th><th>Base</th><th class="n">Valor de compra</th><th class="n">Aluguel</th><th class="n">Manutenção média</th><th class="n">Custo mensal</th><th class="n">% do valor/mês</th><th class="n">Taxa implícita a.a.</th></tr></thead><tbody>' +
      L.linhas.map(function (x) { return '<tr><td>' + esc(x.nome) + (x.qtd > 1 ? ' (' + x.qtd + ')' : '') + '</td><td class="small">' + (x.fonte === 'vmi' ? 'VMI · ' + esc(x.cotModelo) + '<div class="tiny muted">' + R(x.cotUnit) + '/un.</div>' : 'composição') + '</td><td class="n">' + R(x.V) + '</td><td class="n">' + R(x.fin) + '</td><td class="n">' + R(x.man) + (x.fonte === 'vmi' ? (x.manSep ? '<div class="tiny muted">à parte</div>' : '') : '<div class="tiny muted">no aluguel</div>') + '</td><td class="n"><b>' + R(x.aluguel) + '</b></td><td class="n">' + Pp((x.pctMes || 0) * 100) + '</td><td class="n">' + (x.fonte === 'vmi' ? (x.taxaImpl == null ? '<span class="neg">não fecha</span>' : Pp(x.taxaImpl * 100)) : Pp(L.taxaAno * 100) + '<div class="tiny muted">locador</div>') + '</td></tr>'; }).join('') +
      '<tr class="total"><td>Pacote</td><td></td><td class="n">' + R(L.V) + '</td><td class="n">' + R(L.fin) + '</td><td class="n">' + R(L.man) + '</td><td class="n">' + R(L.aluguel) + '</td><td class="n">' + Pp(L.pctMes * 100) + '</td><td></td></tr></tbody></table></div>' +
      '<p class="small muted" style="margin-top:8px">Taxa implícita: a taxa que faz o aluguel VMI, líquido de ' + Pp(d.trib * 100) + ' de tributos, pagar o valor de compra menos o residual de mercado no fim do prazo (queda a.a.: TC ' + P(d.dep_tc, 0) + ', RX ' + P(d.dep_rx, 0) + '). ' + (L.manInclusa ? 'É um teto: como o aluguel também paga a manutenção, a taxa financeira efetiva é menor. ' : '') + 'Referência: arrendamento PJ do BCB ' + Pp(d.taxa_base * 100) + ' a.a. "Não fecha" = o aluguel não paga nem o valor do equipamento. Composição: parcela financeira = (valor − residual descontado) × anuidade à taxa do locador ÷ (1 − tributos) + manutenção Ouro × (prazo − garantia) ÷ prazo.</p>';
    /* benchmarks */
    var tc = L.linhas.filter(function (x) { return x.id === 'tc'; })[0], rxs = L.linhas.filter(function (x) { return x.id === 'rxp' || x.id === 'rxdr'; });
    var tc60 = cot.length && cot[0].id === 'tc' ? +cot[0].loc_vmi[60] : null, tcM = (m.equip.C.filter(function (x) { return x.id === 'tc'; })[0] || {}).m_ouro;
    h += '<div class="grid two" style="margin-top:12px"><div><h3 class="h3">Referências de mercado (contratos públicos de locação)</h3><div class="tbl-wrap"><table><thead><tr><th>Objeto</th><th class="n">Meses</th><th class="n">R$/mês</th></tr></thead><tbody>' + BENCH_LOC.map(function (b) { return '<tr><td><a href="' + b.url + '" target="_blank" rel="noopener">' + esc(b.obj) + '</a><div class="tiny muted">' + esc(b.org) + ', ' + b.ano + '</div></td><td class="n">' + b.meses + '</td><td class="n">' + R(b.total / b.meses) + '</td></tr>'; }).join('') + '</tbody></table></div></div>' +
      '<div><h3 class="h3">Cotação VMI × mercado</h3><ul class="bullets small">' +
      (tc60 ? '<li>TC: VMI ' + R(tc60) + '/mês em 60 meses com manutenção inclusa, contra R$ 60–62 mil/mês dos contratos públicos de TC 64–128 canais com manutenção (São Luís e São Paulo, 2026): cerca de ' + P(1 - tc60 / 61000, 0) + ' abaixo. Locador cativo: para a VMI, o custo do equipamento é o de fabricação, não o preço de venda. Comprar a TC e pagar o contrato Ouro (' + R(tcM) + '/mês) sai mais caro que alugá-la.</li>' : '<li>TC: ' + (tc ? R(tc.aluguel) : '—') + '/mês em ' + D.n + ' meses; mercado R$ 60–62 mil/mês com manutenção.</li>') +
      '<li>RX móvel: VMI ' + rxs.map(function (x) { return esc(x.cotModelo || x.modelo) + ' ' + R(x.fonte === 'vmi' ? x.cotUnit : x.aluguel); }).join(' e ') + '/mês em ' + D.n + ' meses; contratos públicos entre R$ 3,5 mil (analógico, interior) e R$ 9,5 mil/mês. O aluguel do Aquila S com manutenção (' + R(+((m.equip.C.filter(function (x) { return x.id === 'rxp'; })[0] || {}).loc_vmi || {})[D.n] || 0) + ') fica abaixo do contrato Ouro avulso do mesmo equipamento (R$ 6.800/mês): na compra (B e C), o contrato de manutenção dos RX está caro e deve ser negociado com a locação como referência.</li>' +
      '<li>Ultrassom e placa DR: sem cotação VMI nem contrato público comparável; aluguel pela composição de custos.</li></ul></div></div></div>';
    /* prazos */
    h += '<div class="card"><div class="card-h"><h2>Simulação por prazo</h2><span class="muted small">' + esc(lt.base) + ' · VP a ' + P(m.fin.desconto, 0) + ' a.a. · compra = pacote C financiado pela linha em uso, manutenção Ouro</span></div><div class="tbl-wrap"><table><thead><tr><th>Prazo</th><th class="n">Custo/mês</th><th class="n">% valor/mês</th><th class="n">Total no prazo</th><th class="n">VP do custo</th><th class="n">VP possuir (C)</th><th class="n">Vantagem locação</th><th class="n">Equilíbrio no prazo</th><th class="n">VPL hospital ' + m.fin.horizonte + 'a</th><th class="n">Caixa acum.</th></tr></thead><tbody>' +
      PZ.map(function (z) { var on = z.n === D.n; return '<tr class="' + (on ? 'hl' : '') + '"><td>' + z.n + ' meses' + (z.n === 48 ? ' <span class="pill info">sugestão VMI</span>' : '') + '</td><td class="n">' + R(z.aluguel) + '</td><td class="n">' + Pp(z.pctMes * 100) + '</td><td class="n">' + mi(z.totalPrazo) + '</td><td class="n">' + mi(z.pvAluguel) + '</td><td class="n">' + mi(z.custoPossuir) + '</td><td class="n ' + sinal(z.vantagem) + '">' + mi(z.vantagem) + '</td><td class="n">' + R(z.equilibrio) + '</td><td class="n">' + mi(z.vplEnt) + '</td><td class="n">' + mi(z.acumEnt) + '</td></tr>'; }).join('') +
      '<tr class="sub"><td>Compra C (referência)</td><td class="n" title="parcela após a carência + manutenção">' + R(c.C.parcela + c.C.manut.mes) + '</td><td></td><td></td><td></td><td></td><td></td><td></td><td class="n">' + mi(c.flC.vplEnt) + '</td><td class="n">' + mi(c.flC.acumEnt) + '</td></tr></tbody></table></div>' +
      '<ul class="bullets small" style="margin-top:10px"><li><b>No prazo</b>: comprar e usar pelo mesmo período = entrada + parcelas até o fim do prazo + saldo devedor que sobra + manutenção Ouro depois da garantia − valor de mercado do equipamento no fim. Vantagem negativa = a locação custa mais.</li><li><b>Em ' + m.fin.horizonte + ' anos</b>: a locação é renovada ao mesmo aluguel com equipamento novo. Prazos curtos custam mais por mês, mas trocam a TC com mais frequência.</li><li><b>Cláusulas a exigir</b>: escopo da manutenção (preventiva, corretiva, peças, tubo) e quem paga; disponibilidade mínima de 95% a 97% com multa e equipamento reserva; reajuste anual por índice definido; opção de compra pelo valor residual no fim; troca tecnológica na renovação; seguro do bem; regras de rescisão antecipada.</li></ul></div>';
    return h;
  }
  function renderInvest() {
    var c = calc, m = model, C = c.C, av = C.av;
    var h = '<div class="card hero"><span class="eyebrow">Investimento</span><h2>Mesmo perímetro, dois pacotes: GE/CDK (proposta do Jaime, ' + mi(c.B.capex) + ') e VMI (preços de 15/10/2026, ' + mi(c.C.capex) + ')</h2><p class="lead muted">Os preços, CFIs e contratos de manutenção de cada item são editáveis. Diferença de perímetro a decidir: a VMI propõe RX digital fixo (Apolo D, R$ 290 mil) onde o pacote GE tem RX portátil com placa DR (R$ 490 mil).</p></div>';
    h += '<div class="card"><div class="card-h"><h2>Pacote B · GE/CDK, financiamento dos fornecedores</h2><span class="muted small">Projeto Radiologia e Proposta Estratégica (Jaime); HFS 60x para a TC</span></div>' + equipTable('B') + '<p class="small muted" style="margin-top:8px">Totais corretos: R$ 2.934.024,80 e R$ 73.537,38/mês. O documento do Jaime soma R$ 2.979.024,80 e R$ 68.458,38 (erros de soma).</p></div>';
    h += '<div class="card"><div class="card-h"><h2>Pacote C · VMI, linha de fomento</h2><span class="muted small">Pulsar 128 (64 canais/128 cortes), Invictus, Aquila 320 S, Apolo D, placa DR VMI · preços VMI de 15/10/2026</span></div>' + equipTable('C') + '</div>';
    h += cardManut();
    /* caso de crédito */
    var cl = m.cliente, ctx = av.ctx;
    if (C.cfi && C.cfi.prev > 0) h += '<div class="notice">CFI previsto, ainda não emitido: ' + esc(C.cfi.prevItens.join(', ')) + ' (' + R(C.cfi.prev) + '). Premissa VMI de 15/10/2026: credenciamento até dez/2026, antes da contratação. A simulação trata o item como credenciado; o FINAME só contrata com o código publicado.</div>';
    if (C.cfi && C.cfi.sem > 0) h += '<div class="notice warn">Itens sem código CFI: ' + esc(C.cfi.semItens.join(', ')) + ' (' + R(C.cfi.sem) + '). ' + (Number(model.altC.cfi_presumido) ? 'A premissa "Tratar o pacote como credenciado" está ativa: o pacote inteiro vai às linhas com CFI; resolver os itens antes de contratar pelo FINAME (ultrassom: o Dominus L1 da Alfa Med, CFI 04313989, é a alternativa credenciada; placa DR: pedir o credenciamento à VMI). O FGTS-Saúde não exige CFI.' : 'O FINAME só financia os ' + R(C.cfi.com + C.cfi.prev) + ' com CFI; o restante entra em linha sem exigência de CFI (FGTS-Saúde, se cumprir os requisitos) ou recurso próprio. Para tratar o pacote como credenciado, mude a premissa em Premissas.') + '</div>';
    h += '<div class="card"><div class="card-h"><h2>Caso de crédito (motor Financiamento VMI)</h2><span class="muted small">base de linhas ' + esc(BASE.versao) + '</span></div><div class="grid four">' +
      kpi('Tomador', cl.natureza === 'filantropica' ? 'Filantrópica' : 'Privada', 'ABENSENA · ' + cl.uf, '', true) + kpi('Porte BNDES', M.PORTE_NOME[ctx.porte] || '—', 'receita bruta ' + mi(ctx.rob), '', true) + kpi('Valor a financiar', R(ctx.fin), 'prazo pedido ' + m.altC.prazo + ' m · carência ' + m.altC.carencia + ' m', '', true) + kpi('Contratação', esc(m.altC.inicio), m.altC.sistema + ' · juros na carência ' + m.altC.carModo, '', true) + '</div>' +
      '<div class="row" style="margin-top:12px"><label style="display:flex;align-items:center;gap:6px;min-width:0;max-width:100%">Linha <select id="selLinha" style="min-width:0;flex:1 1 auto;max-width:520px"><option value="auto"' + (m.altC.linha === 'auto' ? ' selected' : '') + '>Automática (1ª do ranking)</option>' + av.todas.filter(function (t) { return t.sim; }).map(function (t) { return '<option value="' + t.linha.id + '"' + (m.altC.linha === t.linha.id ? ' selected' : '') + '>' + esc(t.linha.nome) + (t.el.ok ? '' : ' (bloqueada)') + '</option>'; }).join('') + '</select></label>' +
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
    h += cardFgts();
    /* cronograma anual */
    if (C.escolha) {
      var rows = C.escolha.sim.rows, porAno = {};
      rows.forEach(function (r) { var k = r.y; if (!porAno[k]) porAno[k] = { ano: k, juros: 0, amort: 0, parcela: 0, saldo: r.saldo, n: 0 }; porAno[k].juros += r.juros; porAno[k].amort += r.amort; porAno[k].parcela += r.parcela; porAno[k].saldo = r.saldo; porAno[k].n++; });
      h += '<div class="card"><div class="card-h"><h2>Cronograma da linha em uso</h2><span class="muted small">' + esc(C.escolha.linha.nome) + ' · ' + esc(C.escolha.sim.cfRot) + ' · taxa no 1º ano ' + Pp(C.taxaAno1) + '</span></div><div class="tbl-wrap"><table><thead><tr><th>Ano</th><th class="n">Meses</th><th class="n">Juros</th><th class="n">Amortização</th><th class="n">Parcelas</th><th class="n">Saldo no fim</th></tr></thead><tbody>' + Object.keys(porAno).map(function (k) { var a = porAno[k]; return '<tr><td>' + a.ano + '</td><td class="n">' + a.n + '</td><td class="n">' + R(a.juros) + '</td><td class="n">' + R(a.amort) + '</td><td class="n">' + R(a.parcela) + '</td><td class="n">' + R(a.saldo) + '</td></tr>'; }).join('') + '<tr class="total"><td>Total</td><td class="n">' + rows.length + '</td><td class="n">' + R(C.juros) + '</td><td class="n">' + R(C.capexFin) + '</td><td class="n">' + R(C.pagos) + '</td><td></td></tr></tbody></table></div>' + (C.iof ? '<p class="small muted" style="margin-top:8px">IOF estimado ' + R(C.iof) + ' (filantrópica pode ter não incidência).</p>' : '') + '</div>';
    }
    h += cardLocacao();
    $('#tab-invest').innerHTML = h;
    $('#selPlano').addEventListener('change', function () { model.manut.plano = this.value; afterEdit(); });
    $('#inGar').addEventListener('change', function () { model.manut.garantia_meses = Math.max(0, Math.round(parseBR(this.value))); afterEdit(); });
    $('#selPrazoD').addEventListener('change', function () { model.altD.prazo = +this.value; afterEdit(); });
    $('#selManD').addEventListener('change', function () { model.altD.vmi_manut = this.value; afterEdit(); });
    $('#selFonteD').addEventListener('change', function () { model.altD.fonte = this.value; afterEdit(); });
    $('#selLinha').addEventListener('change', function () { model.altC.linha = this.value; afterEdit(); });
    bindFgts('#tab-invest');
    $('#inPrazo').addEventListener('change', function () { model.altC.prazo = Math.max(1, Math.round(parseBR(this.value))); afterEdit(); });
    $('#inCar').addEventListener('change', function () { model.altC.carencia = Math.max(0, Math.round(parseBR(this.value))); afterEdit(); });
    $('#selSist').addEventListener('change', function () { model.altC.sistema = this.value; afterEdit(); });
    $$('#tab-invest [data-eq]').forEach(function (inp) { inp.addEventListener('change', function () { var p = this.dataset.eq.split('.'); var it = model.equip[p[0]][+p[1]]; var f = p[2]; if (f === 'fin') it.fin = this.checked; else if (f === 'qtd' || f === 'preco' || f === 'parcela' || f === 'm_prata' || f === 'm_ouro') it[f] = parseBR(this.value); else it[f] = this.value; afterEdit(); }); });
    $$('#tab-invest [data-eqdel]').forEach(function (b) { b.addEventListener('click', function () { var p = this.dataset.eqdel.split('.'); model.equip[p[0]].splice(+p[1], 1); afterEdit(); }); });
    $$('#tab-invest [data-eqadd]').forEach(function (b) { b.addEventListener('click', function () { var k = this.dataset.eqadd; model.equip[k].push(k === 'B' ? { id: 'n' + Date.now(), nome: 'Novo item', modelo: '', qtd: 1, preco: 0, parcela: 0, n: 60, fin: true, obs: '', m_prata: 0, m_ouro: 0, m_fonte: 'Informar o contrato' } : { id: 'n' + Date.now(), nome: 'Novo item', modelo: '', qtd: 1, preco: 0, cfi: '', fin: true, obs: '', m_prata: 0, m_ouro: 0, m_fonte: 'Informar o contrato' }); afterEdit(); }); });
  }

  /* FGTS-Saúde: requisitos do Manual de Fomento v002 e margem consignável do SUS */
  function cardFgts() {
    var m = model, cl = m.cliente || {}, fl = cl.flags || {}, av = calc.C.av;
    var fg = av.todas.filter(function (x) { return x.linha.id === 'fgts-saude'; })[0];
    if (!fg) return '';
    function sel(path, val, ops) { return '<select data-fg="' + path + '">' + ops.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(val == null ? '' : val) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'; }
    function inp(path, val) { return '<input class="n w-m" data-fg="' + path + '" data-num="1" value="' + (val ? esc(NF2.format(val)) : '') + '" placeholder="não informado">'; }
    var pill, txt;
    if (cl.natureza !== 'filantropica') { pill = '<span class="pill">não se aplica</span>'; txt = 'Linha exclusiva de entidades filantrópicas.'; }
    else if (fg.el.ok) { pill = '<span class="pill good">elegível' + (fg.rank ? ' · ' + fg.rank + 'ª do ranking' : '') + '</span>'; txt = 'Requisitos marcados e parcela dentro da margem do SUS.'; }
    else if (fg.condicional) { pill = '<span class="pill warn">depende de confirmação</span>'; txt = 'Falta responder: ' + fg.el.bloqueios.map(function (b) { return esc(b.replace(/^Condição não marcada no caso: /, '')); }).join('; ') + '.'; }
    else { pill = '<span class="pill bad">fora da comparação</span>'; txt = fg.el.bloqueios.map(esc).join('; ') + '.'; }
    var h = '<div class="card"><div class="card-h"><h2>FGTS-Saúde: requisitos e margem do SUS</h2>' + pill + '</div>' +
      '<p class="small">Só a <b>modalidade I</b> (sem destinação específica) financia o pacote hoje: até 60 meses, sem carência (1ª parcela em até 45 dias), juros de 8,66% a.a. + taxa de risco do agente de até 3% a.a. + TR, tarifa de até 0,5%, desembolso único. Garantia: cessão dos créditos SUS. A modalidade III (investimento, 20 anos com 12 de carência) está na Resolução CCFGTS 1.152/2026, mas ainda não foi regulamentada, então fica fora.</p>' +
      '<div class="grid two" style="margin-top:10px"><div style="display:grid;gap:10px">' +
      '<label class="small">Tem CEBAS na modalidade de prestação de serviços com no mínimo 60% ao SUS?<br>' + sel('cliente.flags.cebas_sus60', fl.cebas_sus60, [['', 'Não informado'], ['sim', 'Sim'], ['nao', 'Não']]) + '</label>' +
      '<label class="small">Participa do Agora Tem Especialistas (declaração ao Ministério da Saúde)?<br>' + sel('cliente.flags.sus_complementar', fl.sus_complementar ? 1 : 0, [[1, 'Sim (a confirmar)'], [0, 'Não']]) + '</label>' +
      '<label class="small">Créditos SUS recebidos nos últimos 12 meses (R$)<br>' + inp('cliente.sus_creditos_12m', cl.sus_creditos_12m) + '</label>' +
      '<label class="small">Já tem outros empréstimos consumindo o repasse do SUS (Teto MAC)?<br>' + sel('cliente.sus_mac_outros', cl.sus_mac_outros, [['', 'Não informado'], ['nao', 'Não'], ['sim', 'Sim']]) + '</label>' +
      (cl.sus_mac_outros === 'sim' ? '<label class="small">Parcelas desses empréstimos descontadas do Teto MAC (R$/mês)<br>' + inp('cliente.sus_mac_parcelas', cl.sus_mac_parcelas) + '</label>' : '') +
      '</div><div>';
    var mg = fg.el.margemSus, s = fg.sim;
    if (mg) {
      h += '<table><tbody>' + [['Média mensal dos créditos SUS', R(mg.media)], ['Margem bruta (' + mg.pct + '%)', R(mg.bruta)], ['Já descontado do Teto MAC', R(-mg.consignado)], ['Margem líquida', '<b>' + R(mg.liquida) + '</b>', 'total']].concat(mg.parcelaMax != null ? [['Maior parcela do FGTS-Saúde (' + (s ? s.n : '') + ' m, ' + (s ? esc(s.sistema || m.altC.sistema) : '') + ')', R(mg.parcelaMax)], [mg.cabe ? 'Folga na margem' : 'Valor máximo financiável', mg.cabe ? R(mg.liquida - mg.parcelaMax) : '<b class="neg">' + R(mg.valorMax) + '</b>'], ['Créditos SUS de 12 meses necessários', R(mg.creditosMin12m)]] : []).map(function (r) { return '<tr class="' + (r[2] || '') + '"><td>' + r[0] + '</td><td class="n">' + r[1] + '</td></tr>'; }).join('') + '</tbody></table>';
    } else {
      h += '<p class="small muted">Informe os créditos SUS dos últimos 12 meses para calcular a margem: a parcela não pode passar de 35% da média mensal, menos o que outros contratos já descontam do Teto MAC (Manual, item 5.1.2).' + (s ? ' Com ' + mi(calc.C.av.ctx.fin) + ' em ' + s.n + ' meses, a maior parcela seria ' + R(s.rows.reduce(function (a, r) { return Math.max(a, r.parcela); }, 0)) + ', o que pede pelo menos ' + R((s.rows.reduce(function (a, r) { return Math.max(a, r.parcela); }, 0)) / 0.35 * 12) + ' de créditos SUS em 12 meses, sem outros descontos.' : '') + '</p>';
    }
    h += '</div></div><p class="small muted" style="margin-top:10px">Outros requisitos (Manual, 5.5.1): CNES ativo, CRF do FGTS, CND, sem restrição no CADIN, anuência do gestor local do SUS e termo de cessão dos créditos (Portaria GM/MS 2.182/2015). Hoje o SUS responde por cerca de 20% do HDA, o que torna o CEBAS na modalidade de 60% ao SUS improvável' + (calc.C.escolha && calc.C.escolha.linha.id === 'fgts-saude' ? '; confirme a resposta antes de protocolar, porque o plano está usando o FGTS-Saúde.' : ': por isso o plano usa o FINAME até a resposta.') + ' A <b>modalidade II</b> (reestruturação financeira, até 15 anos, com plano de trabalho) não financia equipamento, mas pode alongar a dívida atual; ver Capacidade de crédito.</p></div>';
    return h;
  }
  function bindFgts(root) {
    $$(root + ' [data-fg]').forEach(function (el) { el.addEventListener('change', function () { var v = this.value; if (this.dataset.num) v = parseBR(v) || 0; else if (this.dataset.fg === 'cliente.flags.sus_complementar') v = +v; setPath(model, this.dataset.fg, v); afterEdit(); }); });
  }

  /* ================= CAPACIDADE DE CRÉDITO ================= */
  function renderCredito() {
    var c = calc, m = model, en = c.ent, L = en.linhas, l1 = L[0];
    var h = '<div class="card hero"><span class="eyebrow">Visão do banco · entidade tomadora</span><h2>O projeto se paga; a pergunta do agente financeiro é se o hospital cobre a dívida que já tem</h2><p class="lead muted">EBITDA anualizado de ' + mi(en.ebitdaBase) + ' contra serviço da dívida de ' + mi(l1.servAtual) + ' em ' + l1.ano + ' (mapa de empréstimos de dez/25, sem a conta garantida). O TDC de ' + mi(m.entidade.tdc_min) + '+ em ' + esc(m.entidade.tdc_mes) + ' muda o quadro; o modelo mostra os dois mundos.</p></div>';
    h += '<div class="grid kpis">' + kpi('Dívida líquida', mi(en.dl), 'dívida ' + mi(en.divTot) + ' − caixa ' + mi(en.caixa)) + kpi('Dívida líquida / EBITDA', X(en.dlEbitda), 'hoje · com o projeto ' + X(en.dlEbitdaProj), en.dlEbitda > 3 ? 'bad' : 'warn') + kpi('DSCR ' + l1.ano + ' sem o projeto', X(l1.dscrSemProj), 'referência usual dos agentes ≥ 1,3x (não é norma do BNDES)', l1.dscrSemProj < 1.3 ? 'bad' : 'good') + kpi('DSCR ' + l1.ano + ' com o projeto', X(l1.dscrSem), 'sem TDC', l1.dscrSem < 1.3 ? 'warn' : 'good') + kpi('DSCR ' + l1.ano + ' com TDC', X(l1.dscrCom), 'dívida liquidada em ' + esc(m.entidade.tdc_mes), 'good') + kpi('Dívida líquida após o TDC', mi(en.dlAposTdc), P(m.entidade.tdc_liquida, 0) + ' da dívida liquidada com ' + mi(m.entidade.tdc_min), 'good') + '</div>';
    if (c.sel.id === 'D') h += '<div class="notice">Alternativa D (locação): não há financiamento novo; o aluguel de ' + R(c.D.aluguel) + '/mês reduz o EBITDA incremental. Para o banco, o aluguel não é dívida bancária, mas sob CPC 06 (R2)/IFRS 16 vira passivo de arrendamento (VP dos aluguéis do prazo: ' + mi(((c.prazosD || []).filter(function (z) { return z.n === c.D.n; })[0] || {}).pvAluguel) + '), e o agente pode olhar o EBITDAR.</div>';
    var cats = L.slice(0, Math.min(L.length, 6)).map(function (l) { return String(l.ano); });
    h += '<div class="grid two"><div class="card"><div class="card-h"><h2>Cobertura do serviço da dívida</h2><span class="muted small">EBITDA ÷ parcelas do ano, entidade</span></div><div class="chart">' + svgLines({ cats: cats, series: [{ nome: 'Sem o projeto', vals: L.slice(0, cats.length).map(function (l) { return l.dscrSemProj == null ? null : Math.min(l.dscrSemProj, 6); }), cor: 'var(--s-a)', dash: true }, { nome: 'Com o projeto, sem TDC', vals: L.slice(0, cats.length).map(function (l) { return l.dscrSem == null ? null : Math.min(l.dscrSem, 6); }), cor: 'var(--s-b)' }, { nome: 'Com o projeto e TDC', vals: L.slice(0, cats.length).map(function (l) { return l.dscrCom == null ? null : Math.min(l.dscrCom, 6); }), cor: 'var(--s-c)' }], fmt: function (v) { return X(v, 1); }, ref: { v: 1.3, label: 'mínimo 1,3x' }, h: 250, aria: 'DSCR' }) + '</div><p class="small muted">Valores acima de 6x cortados no gráfico. A tabela traz os números completos.</p></div>' +
      '<div class="card"><div class="card-h"><h2>Serviço da dívida por ano</h2><span class="muted small">R$, entidade</span></div><div class="chart">' + svgBars({ cats: cats, series: [{ nome: 'Dívida atual', vals: L.slice(0, cats.length).map(function (l) { return l.servAtual; }), cor: 'var(--s-a)' }, { nome: 'Dívida atual após TDC', vals: L.slice(0, cats.length).map(function (l) { return l.servAtualTdc; }), cor: 'var(--s-e)' }, { nome: 'Novo financiamento', vals: L.slice(0, cats.length).map(function (l) { return l.servNovo; }), cor: 'var(--s-c)' }], fmt: function (v) { return mi(v); }, h: 250, aria: 'Serviço da dívida' }) + '</div></div></div>';
    h += '<div class="card"><div class="card-h"><h2>Tabela</h2></div><div class="tbl-wrap"><table><thead><tr><th>Ano</th><th class="n">EBITDA hospital</th><th class="n">+ projeto</th><th class="n">Serviço atual</th><th class="n">Atual após TDC</th><th class="n">Novo</th><th class="n">DSCR sem proj.</th><th class="n">DSCR sem TDC</th><th class="n">DSCR com TDC</th></tr></thead><tbody>' + L.map(function (l) { return '<tr><td>' + l.ano + '</td><td class="n">' + R(l.ebitdaEnt) + '</td><td class="n">' + R(l.inc) + '</td><td class="n">' + R(l.servAtual) + '</td><td class="n">' + R(l.servAtualTdc) + '</td><td class="n">' + R(l.servNovo) + '</td><td class="n ' + (l.dscrSemProj != null && l.dscrSemProj < 1.3 ? 'neg' : '') + '">' + X(l.dscrSemProj) + '</td><td class="n ' + (l.dscrSem != null && l.dscrSem < 1.3 ? 'neg' : '') + '">' + X(l.dscrSem) + '</td><td class="n">' + X(l.dscrCom) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    /* empréstimos editáveis */
    h += '<div class="card"><div class="card-h"><h2>Mapa de empréstimos</h2><span class="muted small">31/12/2025 (deck, slide 6) · editável; marque os que o TDC liquida</span></div><div class="tbl-wrap"><table><thead><tr><th>Instituição</th><th>Modalidade</th><th class="n">Parcela (R$/mês)</th><th>Última parcela</th><th class="n">Saldo dez/25</th><th>TDC liquida</th><th></th></tr></thead><tbody>' + (m.entidade.emprestimos || []).map(function (l, i) { return '<tr><td><input class="w-m" data-emp="' + i + '.banco" value="' + esc(l.banco) + '"></td><td><input class="w-m" data-emp="' + i + '.mod" value="' + esc(l.mod) + '"></td><td class="n"><input class="n" data-emp="' + i + '.parcela" value="' + esc(NF2.format(l.parcela)) + '"></td><td><input class="w-s" data-emp="' + i + '.fim" value="' + esc(l.fim) + '" placeholder="AAAA-MM"></td><td class="n"><input class="n" data-emp="' + i + '.saldo" value="' + esc(NF2.format(l.saldo || 0)) + '"></td><td><input type="checkbox" data-emp="' + i + '.liquida_tdc"' + (l.liquida_tdc !== false ? ' checked' : '') + '></td><td><button class="sm ghost danger" data-empdel="' + i + '">×</button></td></tr>'; }).join('') + '<tr class="total"><td>Total</td><td></td><td class="n">' + R((m.entidade.emprestimos || []).reduce(function (s, l) { return s + (+l.parcela || 0); }, 0)) + '</td><td></td><td class="n">' + R((m.entidade.emprestimos || []).reduce(function (s, l) { return s + (+l.saldo || 0); }, 0)) + '</td><td></td><td></td></tr></tbody></table></div><div class="row" style="margin-top:8px"><button class="sm" id="btnEmpAdd">+ Empréstimo</button><span class="small muted">Conta garantida de R$ 1,04 mi (limite) fora do serviço. Saldo total em ago/26: ' + mi(en.divTot) + '.</span></div></div>';
    h += '<div class="card"><div class="card-h"><h2>Leitura para a negociação com o agente</h2></div><ul class="bullets"><li>Em ' + l1.ano + ' o hospital, sozinho, cobre ' + X(l1.dscrSemProj) + ' do serviço da dívida: abaixo do 1,3x de referência. Um agente vai olhar o TDC, a garantia real (imóvel avaliado em R$ 550 mi) ou o FGI antes de aprovar.</li><li>O projeto soma ' + mi(l1.inc) + ' de EBITDA já no primeiro ano e pede ' + mi(l1.servNovo) + ' de serviço: melhora a cobertura mesmo sem o TDC.</li><li>Com o TDC liquidando ' + P(m.entidade.tdc_liquida, 0) + ' da dívida em ' + esc(m.entidade.tdc_mes) + ', a cobertura vai a ' + X(l1.dscrCom) + ' e a dívida líquida cai a ' + mi(en.dlAposTdc) + ': o financiamento dos equipamentos passa a ser a única dívida longa do hospital.</li><li>Sequência recomendada: protocolar a operação no Gate 1 com o TDC emitido, desembolsar no Gate 2, usar a carência para atravessar o restauro (até mai/27).</li><li>Se o hospital cumprir os requisitos do FGTS-Saúde (CEBAS na modalidade de 60% ao SUS e Agora Tem Especialistas), a <b>modalidade II</b> (reestruturação financeira, até 15 anos, TR + 8,66% + até 3% de risco) pode alongar a dívida atual com garantia dos créditos SUS. Ela divide a mesma margem de 35% com a modalidade I e exige o Plano de Trabalho e Gestão do Anexo II do Manual de Fomento.</li></ul></div>';
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
    { id: 'manut.plano', nome: 'Plano de manutenção (B e C)', seg: [['ouro', 'Ouro'], ['prata', 'Prata']], hint: 'Ouro cobre tubo, gerador e sistemas de imagem' },
    { id: 'propria.manut_fator', nome: 'Fator sobre os contratos de manutenção', min: 0.5, max: 2, step: 0.1, fmt: function (v) { return N(v, 1) + '×'; }, hint: '1,0× = valores por item; vale também para a manutenção dentro do aluguel' },
    { id: 'altD.prazo', nome: 'Prazo da locação (D)', min: 24, max: 84, step: 12, fmt: function (v) { return v + ' m'; }, hint: 'sugestão VMI: 48 meses' },
    { id: 'altD.vmi_manut', nome: 'Cotação VMI inclui manutenção? (D)', seg: [['sim', 'Sim'], ['nao', 'Não']], hint: 'confirmado: inclusa; "Não" só como cenário' },
    { id: 'altD.premio', nome: 'Prêmio do locador (D)', min: 0, max: 0.08, step: 0.005, fmt: function (v) { return Pp(v * 100) + ' p.p.'; }, hint: 'só nos itens sem cotação VMI' },
    { id: 'altC.prazo', nome: 'Prazo do financiamento C', min: 36, max: 120, step: 12, fmt: function (v) { return v + ' m'; }, hint: 'FINAME até 120; FGTS-Saúde até 60' },
    { id: 'altC.carencia', nome: 'Carência C', min: 0, max: 24, step: 3, fmt: function (v) { return v + ' m'; }, hint: 'FINAME até 24; FGTS-Saúde sem carência' },
    { id: 'fin.desconto', nome: 'Taxa de desconto', min: 0.08, max: 0.25, step: 0.01, fmt: function (v) { return P(v, 0); }, hint: '' },
    { id: 'fin.horizonte', nome: 'Horizonte', seg: [[5, '5 anos'], [10, '10 anos']], hint: '' },
    { id: 'fin.alternativa', nome: 'Alternativa', seg: [['C', 'C · VMI compra'], ['B', 'B · GE/HFS'], ['D', 'D · VMI locação']], hint: '' },
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
    $$('#levers [data-lever]').forEach(function (r) { r.addEventListener('input', function () { var l = LEVERS[+this.dataset.lever]; var v = +this.value; simSet(l.id, l.id === 'fin.horizonte' || l.id === 'altC.prazo' || l.id === 'altC.carencia' || l.id === 'altD.prazo' ? Math.round(v) : v); $('#lv' + this.dataset.lever).textContent = l.fmt(v); recomputeSim(); renderSimResults(); }); });
    $$('#levers [data-seg]').forEach(function (b) { b.addEventListener('click', function () { var l = LEVERS[+this.dataset.seg]; var v = this.dataset.v; simSet(l.id, isNaN(+v) ? v : +v); recomputeSim(); renderLevers(); renderSimResults(); }); });
  }
  function renderSimResults() {
    var s = simCalc, fl = s.flSel, b = calc.flSel;
    function d(v, ref, fmt) { var dv = v - ref; return fmt(v) + ' <span class="small ' + sinal(dv) + '">' + (dv >= 0 ? '+' : '−') + fmt(Math.abs(dv)).replace('−', '') + '</span>'; }
    $('#simKpis').innerHTML = kpi('VPL do projeto', d(fl.vpl, b.vpl, mi), 'vs. premissas salvas', fl.vpl > 0 ? 'good' : 'bad', true) + kpi('TIR', fl.tir == null ? '—' : P(fl.tir, 0), 'payback ' + anos(fl.pb), '', true) + kpi('Resultado mensal própria', R(s.cen.prop.resultado), (s.sel.id === 'D' ? 'com aluguel' : 'com manutenção, antes das parcelas') + ' · EMG ' + R(s.cen.emg.resultado), sinal(s.cen.prop.resultado) === 'pos' ? 'good' : 'bad', true) + kpi(s.sel.id === 'D' ? 'Aluguel' : 'Após a parcela', s.sel.id === 'D' ? R(s.D.aluguel) : R(s.ganhoMesComParcela + s.cen.emg.resultado), s.sel.id === 'D' ? s.D.n + ' meses · equilíbrio com C ' + R(s.D.equilibrioC) : 'parcela ' + R(s.sel.parcela) + ' · ' + (s.sel.id === 'C' && s.C.escolha ? esc(s.C.escolha.linha.nome.split(' – ')[0]) : 'HFS'), '', true) + kpi('VPL para o hospital', d(fl.vplEnt, b.vplEnt, mi), 'após parcelas ou aluguel · B ' + mi(s.flB.vplEnt) + ' · C ' + mi(s.flC.vplEnt) + ' · D ' + mi(s.flD.vplEnt), '', true) + kpi('Caixa acumulado', d(fl.acumEnt, b.acumEnt, mi), 'após parcelas ou aluguel, ' + sim.fin.horizonte + ' anos', '', true) + kpi('DSCR hospital ' + s.ent.linhas[0].ano, X(s.ent.linhas[0].dscrSem) + ' · ' + X(s.ent.linhas[0].dscrCom), 'sem TDC · com TDC', '', true);
    var n = Math.max(fl.anos.length, b.anos.length), cats = []; for (var i = 0; i < n; i++) cats.push(String(+model.fin.ano_inicio + i));
    $('#simChart').innerHTML = svgLines({ cats: cats, series: [{ nome: 'Premissas salvas', vals: cats.map(function (c, i) { return b.anos[i] ? b.anos[i].acumE : null; }), cor: 'var(--s-a)', dash: true }, { nome: 'Simulação', vals: cats.map(function (c, i) { return fl.anos[i] ? fl.anos[i].acumE : null; }), cor: 'var(--s-c)' }], fmt: function (v) { return mi(v); }, h: 230, aria: 'Simulação' });
    var al = [
      { nome: 'Médicos que usam a sala', set: function (mm, v) { mm.propria.sala_elimina = v; }, lo: 0, hi: 1, loTxt: 'mantida', hiTxt: 'zerada' },
      { nome: 'Mat/Med própria', set: function (mm, v) { mm.propria.matmed_pct = v; }, lo: 0.15, hi: 0.052, loTxt: '15%', hiTxt: '5,2%' },
      { nome: 'Volume', set: function (mm, v) { mm.cenario.volume_var = v; }, lo: -0.2, hi: 0.3, loTxt: '−20%', hiTxt: '+30%' },
      { nome: 'Repasse médico', set: function (mm, v) { mm.propria.rep_med_pct = v; }, lo: 0.26, hi: 0.18, loTxt: '26%', hiTxt: '18%' },
      { nome: 'Ticket médio', set: function (mm, v) { mm.base.ticket = v; }, lo: 157, hi: 191, loTxt: '−10%', hiTxt: '+10%' },
      { nome: 'Contratos de manutenção', set: function (mm, v) { mm.propria.manut_fator = v; }, lo: 1.5, hi: 0.7, loTxt: '1,5×', hiTxt: '0,7×' },
      { nome: 'Preço do pacote', set: function (mm, v) { mm.equip.C.forEach(function (it) { it.preco *= v; }); mm.equip.B.forEach(function (it) { it.preco *= v; }); }, lo: 1.15, hi: 0.85, loTxt: '+15%', hiTxt: '−15%' },
      { nome: 'Taxa de desconto', set: function (mm, v) { mm.fin.desconto = v; }, lo: 0.20, hi: 0.10, loTxt: '20%', hiTxt: '10%' }
    ];
    if (sim.fin.alternativa === 'D') al.push({ nome: 'Prêmio do locador', set: function (mm, v) { mm.altD.premio = v; }, lo: 0.07, hi: 0.01, loTxt: '7 p.p.', hiTxt: '1 p.p.' }, { nome: 'Prazo da locação', set: function (mm, v) { mm.altD.prazo = v; }, lo: 36, hi: 84, loTxt: '36 m', hiTxt: '84 m' }, { nome: 'Manutenção na cotação VMI', set: function (mm, v) { mm.altD.vmi_manut = v ? 'sim' : 'nao'; }, lo: 0, hi: 1, loTxt: 'à parte', hiTxt: 'inclusa' });
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
    registrarUso('versao', { nome: nome });
    var v = { nome: nome, em: new Date().toISOString(), model: clone(model), kpis: { vpl: calc.flSel.vpl, prop: calc.cen.prop.resultado, linha: calc.sel.id === 'D' ? 'Locação VMI ' + calc.D.n + ' meses' : calc.sel.id === 'B' ? 'GE/HFS 60x' : (calc.C.escolha ? calc.C.escolha.linha.nome : '') } };
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
      '<li><b>Credenciamento CFI da TC Pulsar.</b> Em 14/10/2026 o Catálogo CFI do BNDES lista 16 itens da VMI Médica (Aquila, Apolo, Digimamo, Centauro, Fênix, Cignus), conferidos 1:1 com a tabela FINAME da VMI em 15/10/2026, e nenhuma TC. Premissa adotada (VMI, 15/10/2026): credenciamento até dez/2026; o modelo trata a Pulsar como credenciada e a publicação do código é condição para o FINAME.</li>' +
      '<li><b>Proposta VMI formal</b> com os preços de 15/10/2026 (pacote ' + mi(calc.C.capex) + '); especificação da Pulsar 128 frente à GE 64/128 Dual Energy (protocolo cardíaco); RX digital fixo (Apolo) ou portátil; CFI do ultrassom Invictus e da placa DR, que não aparecem no Catálogo CFI.</li>' +
      '<li><b>Manutenção</b>: cotação VMI para a Pulsar, o Apolo D e o Invictus (hoje estimadas por contratos públicos ou pelo Aquila D); confirmar se os valores do Aquila são mensais (equivalem a muito mais que os 5% a 12% a.a. usuais) e negociá-los no pacote; cotação da CDK para o RX do pacote GE.</li>' +
      '<li><b>Locação da VMI</b> (tabela de 16/10/2026, sugestão de 48 meses): manutenção inclusa no aluguel (confirmado em 17/10/2026). Falta confirmar se o RX digital locado é o Aquila D ou o Apolo D e cotar ultrassons e placa DR, hoje estimados por composição de custos.</li>' +
      '<li><b>FGTS-Saúde</b>: CEBAS na modalidade de 60% ao SUS, participação no Agora Tem Especialistas, créditos SUS dos últimos 12 meses e contratos já descontados do Teto MAC. Sem as respostas, a linha fica em "depende de confirmação". O programa também habilita a tabela SUS incrementada para TC.</li>' +
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
      '<dt>EBITDA própria</dt><dd>RL − Mat/Med própria − repasse médico próprio − repasses mantidos − fixos diretos − RIS/PACS − indiretos (antes de manutenção e aluguel)</dd>' +
      '<dt>EBITDA incremental</dt><dd>(EBITDA própria − EBITDA EMG) × 12 × fração do ano em operação própria − manutenção do ano (B, C) ou aluguel do ano (D)</dd>' +
      '<dt>Manutenção (B, C)</dt><dd>Σ itens (contrato Ouro, ou Prata + provisão de tubo da TC) × quantidade × fator × meses do ano após a garantia × reajuste. A garantia conta da instalação (mês ' + ((+model.fin.inicio_op_mes || 0) + 1) + ' do ano 1).</dd>' +
      '<dt>Aluguel (D)</dt><dd>Itens com cotação da VMI (16/10/2026: TC, Aquila S, Aquila D, 12 a 84 meses; prazos intermediários por interpolação linear): aluguel cotado × quantidade, mais, se a cotação não incluir manutenção, contrato do plano escolhido × (n − garantia) ÷ n. Itens sem cotação: (valor − residual ÷ (1 + i)^n) × i ÷ (1 − (1 + i)^−n) ÷ (1 − tributos) + contrato Ouro × (n − garantia) ÷ n; i = taxa mensal do locador (arrendamento PJ + prêmio), n = prazo, residual = valor × (1 − queda anual)^(n/12). Taxa implícita da cotação: a mesma fórmula resolvida para i. Cobrado desde a instalação e renovado ao mesmo valor até o fim do horizonte.</dd>' +
      '<dt>Locar × comprar no prazo</dt><dd>VP dos aluguéis contra VP de comprar e usar pelo mesmo prazo: entrada + parcelas até o mês n + saldo devedor no mês n + manutenção Ouro após a garantia − valor de mercado no mês n, à taxa de desconto. Aluguel de equilíbrio: o que iguala os dois (no prazo) ou iguala o VPL para o hospital de D ao de C (no horizonte).</dd>' +
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
      '<li>Tabela de locação da VMI, 16/10/2026: TC, Aquila S e Aquila D, 12 a 84 meses (R$/mês por unidade), sugestão de 48 meses.</li>' +
      '<li>Ferramenta Financiamento VMI (S&S), base de linhas de 09/10/2026: BNDES Finame e Automático, FGTS-Saúde (Res. CCFGTS 1.152/2026, Lei 15.486/2026, Manual de Fomento FGTS Saúde v002 de 11/08/2026 e Circular CAIXA 1.121/2026; premissas de André Matheus, S&S, 16/10/2026), fundos constitucionais, BCB (Selic, TLP, Pm/PMm, TR, séries 20729/20732), BNDES Dados Abertos (spreads contratados CNAE 86), Decreto 6.306/2007 (IOF).</li>' +
      '<li>VMI Médica: Pulsar 32/64/128 (24/32/64 canais; 32/64/128 cortes), Aquila 320/500 S e D (RX móvel), Apolo D (RX fixo digital). <a href="https://vmimedica.com/" target="_blank" rel="noopener">vmimedica.com</a>. Preços informados pela VMI em 15/10/2026: Pulsar 128/64 R$ 1.950.000; ultrassom portátil Invictus R$ 117.000; Aquila (RX analógico) R$ 139.000; Apolo (RX digital) R$ 290.000; placa DR avulsa R$ 107.000.</li>' +
      '<li>Catálogo CFI do BNDES, consulta por CNPJ do fabricante em 14/10/2026 (VMI Médica 02.659.246/0001-03; Alfa Med 11.405.384/0001-49; GE Healthcare do Brasil 00.029.372/0001-40). <a href="https://ws.bndes.gov.br/cfi_catalogo/" target="_blank" rel="noopener">ws.bndes.gov.br/cfi_catalogo</a></li>' +
      '<li>Portaria SAES/MS 4.282/2026 (Agora Tem Especialistas), via <a href="https://www.conass.org.br/?p=57841" target="_blank" rel="noopener">Conass</a>; IN RFB 1.700/2017 (vida útil de 10 anos).</li>' +
      '<li>VMI Médica, contratos de manutenção Prata e Ouro do Aquila S e D, média São Paulo (mensagem de 15/10/2026).</li>' +
      '<li>Portal Nacional de Contratações Públicas (PNCP), contratos de manutenção de TC e ultrassom e de locação de TC e RX móvel, 2023–2026: ' + BENCH_MANUT.concat(BENCH_LOC).map(function (b) { return '<a href="' + b.url + '" target="_blank" rel="noopener">' + esc(b.org) + ' (' + b.ano + ')</a>'; }).join('; ') + '.</li>' +
      '<li>Banco Central, taxa média PJ de arrendamento mercantil de outros bens, SGS 20732, ago/2026 (17,19% a.a.). <a href="https://api.bcb.gov.br/dados/serie/bcdata.sgs.20732/dados/ultimos/3?formato=json" target="_blank" rel="noopener">BCB</a></li>' +
      '<li>STF, Súmula Vinculante 31 (ISS não incide sobre locação de bens móveis); EC 132/2023 e LC 214/2025 (CBS em lugar de PIS/COFINS a partir de 2027).</li></ul>' +
      '<p class="small muted" style="margin-top:10px">Preços dos itens VMI: a definir pelas propostas; por padrão iguais ao pacote GE. Honorário de intermediação não exibido nesta versão.</p></div>';
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

  /* ================= SUMÁRIO EXECUTIVO =================
     Gerado na hora a partir do modelo carregado (mesmos números das abas). Uma estrutura
     única alimenta a tela, o texto copiado e o .docx: { titulo, sub, secoes: [{ h, p:[], b:[], t:{head, rows} }] }.
     **negrito** é a única marcação.                                                                      */
  var CURTO = { tc: 'TC Pulsar 128/64', us: 'ultrassons Invictus', rxp: 'Aquila 320 S', rxdr: 'Apolo D', dr: 'placa DR avulsa' };
  function curto(id, nome) { return CURTO[id] || nome; }
  function fmtMes(s) { var mm = /^(\d{4})-(\d{2})/.exec(String(s || '')); return mm ? ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][+mm[2] - 1] + '/' + mm[1] : String(s || ''); }
  function linhaCurta(l) { if (!l) return 'linha de fomento'; if (/^finame/.test(l.id)) return 'o FINAME'; if (/^fgts/.test(l.id)) return 'o FGTS-Saúde'; return l.nome.split(' – ')[0]; }
  function sumarioExecutivo() {
    var c = calc, m = model, H = +m.fin.horizonte, emg = c.cen.emg, prop = c.cen.prop, lt = locTxt();
    var alts = [{ id: 'B', nome: 'B · comprar o pacote GE (HFS 60x)', fl: c.flB, alt: c.B }, { id: 'C', nome: 'C · comprar o pacote VMI com ' + linhaCurta(c.C.escolha && c.C.escolha.linha), fl: c.flC, alt: c.C }, { id: 'D', nome: 'D · alugar o pacote VMI (' + c.D.n + ' meses)', fl: c.flD, alt: c.D }];
    var ord = alts.slice().sort(function (a, b) { return b.fl.vplEnt - a.fl.vplEnt; }), best = ord[0], selId = c.sel.id;
    var ano3 = function (fl) { var a = fl.anos[Math.min(2, fl.anos.length - 1)]; return (a.servico + a.opex) / 12; };
    var e27 = function (id) { var e = c.entAlt && c.entAlt[id]; return e && e.linhas[0] ? e.linhas[0].dscrSem : null; };
    var l1 = c.ent.linhas[0], fg = c.C.av.todas.filter(function (x) { return x.linha.id === 'fgts-saude'; })[0];
    var quando = new Date(), dt = quando.toLocaleDateString('pt-BR') + ' ' + quando.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    var vv = vendoVersao ? versoes.filter(function (x) { return x.id === vendoVersao; })[0] : null;
    var origem = vendoVersao ? 'versão congelada "' + ((vv && vv.nome) || vendoVersao) + '"' : dirty ? 'premissas em edição (não salvas)' : 'premissas salvas' + (ultimoSalvoEm ? ' em ' + new Date(ultimoSalvoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '');
    function vplCom(f, id) { var mm = clone(model); f(mm); var r = E.calcular(mm, M, BASE, { leve: true }); return (id === 'B' ? r.flB : id === 'D' ? r.flD : id === 'C' ? r.flC : r.flSel).vplEnt; }
    var S = { titulo: 'Internalização do serviço de imagem do Hospital Dom Alvarenga', sub: 'Sumário executivo · gerado em ' + dt + ' · ' + origem + ' · ' + H + ' anos a ' + P(m.fin.desconto, 0) + ' a.a.', secoes: [] };
    /* 1. recomendação */
    var rec = '**Internalizar o serviço.** Manter a EMG custa ' + mi(-emg.resultado * 12) + ' por ano de prejuízo; com imagem própria o resultado vai a ' + R(prop.resultado) + '/mês. Com as premissas atuais, a melhor alternativa é **' + best.nome + '**, com VPL para o hospital de ' + mi(best.fl.vplEnt) + ' em ' + H + ' anos, contra ' + ord.slice(1).map(function (a) { return mi(a.fl.vplEnt) + ' em ' + a.id; }).join(' e ') + '.';
    if (best.id === 'D') rec += ' A locação também dispensa investimento e dívida nova num momento em que o hospital cobre ' + X(l1.dscrSemProj) + ' do serviço da dívida, e o aluguel da VMI já inclui a manutenção.';
    if (best.id !== selId) rec += ' O plano em números está montado sobre a alternativa ' + selId + '.';
    var gap = ord[0].fl.vplEnt - ord[1].fl.vplEnt;
    if (gap < 0.05 * Math.abs(ord[0].fl.vplEnt)) rec += ' A diferença para ' + ord[1].id + ' é pequena (' + mi(gap) + '): a escolha depende das pendências abaixo, não do VPL.';
    S.secoes.push({ h: 'Recomendação', p: [rec] });
    /* 2. por que */
    S.secoes.push({ h: 'Por que internalizar', b: [
      'Hoje (EMG): receita líquida de ' + R(emg.rl) + '/mês, repasses de ' + R(emg.repasse) + ' (' + P(emg.repasse / emg.rl, 0) + ' da receita) e resultado de ' + R(emg.resultado) + '/mês.',
      'Imagem própria em regime: resultado de ' + R(prop.resultado) + '/mês, já com ' + (selId === 'D' ? lt.custo + ' dos equipamentos' : 'manutenção pós-garantia') + ' e RIS/PACS, antes das parcelas. Ganho de ' + mi(c.ganhoMes * 12) + ' por ano.',
      'VPL do projeto (alternativa ' + selId + '): ' + mi(c.flSel.vpl) + (selId !== 'D' && c.flSel.tir != null ? ', TIR ' + P(c.flSel.tir, 0) : '') + ', payback de ' + anos(c.flSel.pb) + '.'
    ] });
    /* 3. alternativas */
    S.secoes.push({ h: 'Alternativas', t: { head: ['', 'B · GE, compra', 'C · VMI, compra', 'D · VMI, locação'], rows: [
      ['Investimento em equipamentos', R(c.B.capex), R(c.C.capex), 'R$ 0'],
      ['Dívida nova', R(c.B.capexFin) + ' (fornecedor)', R(c.C.capexFin), 'nenhuma'],
      ['Compromisso mensal no ano 3', R(ano3(c.flB)), R(ano3(c.flC)), R(ano3(c.flD))],
      ['VPL para o hospital, ' + H + ' anos', mi(c.flB.vplEnt), mi(c.flC.vplEnt), mi(c.flD.vplEnt)],
      ['Caixa acumulado, ' + H + ' anos', mi(c.flB.acumEnt), mi(c.flC.acumEnt), mi(c.flD.acumEnt)],
      ['DSCR ' + l1.ano + ' do hospital com o projeto', X(e27('B')), X(e27('C')), X(e27('D'))]
    ] }, p: ['Compromisso mensal = parcelas + manutenção (B e C) ou aluguel' + (lt.sep ? ' e manutenção' : '') + ' (D). Na compra, B e C chegam ao ano ' + H + ' com o equipamento original; na locação, o equipamento é trocado a cada ' + c.D.n + ' meses.'] });
    /* 4. compra C */
    var sC = c.C.escolha, fgTxt;
    if (!fg) fgTxt = '';
    else if (fg.el.ok) fgTxt = 'FGTS-Saúde modalidade I: elegível com as respostas informadas' + (fg.el.margemSus ? ' (margem SUS de ' + R(fg.el.margemSus.liquida) + '/mês)' : '') + '.';
    else if (fg.condicional) fgTxt = 'FGTS-Saúde modalidade I (60 meses, sem carência): depende de confirmar CEBAS na modalidade de 60% ao SUS e os créditos SUS de 12 meses; exigiria ' + (sC ? 'pelo menos ' + R(((fg.sim ? fg.sim.rows.reduce(function (a, r) { return Math.max(a, r.parcela); }, 0) : 0)) / 0.35 * 12) + ' de créditos SUS em 12 meses' : 'margem no Teto MAC') + '. Com o SUS em cerca de 20% do hospital, é improvável.';
    else fgTxt = 'FGTS-Saúde: fora (' + fg.el.bloqueios.join('; ') + ').';
    var semCfi = m.equip.C.filter(function (it) { return !String(it.cfi || '').trim(); }).map(function (it) { return curto(it.id, it.nome); }), prevCfi = m.equip.C.filter(function (it) { return /previsto/i.test(it.cfi || ''); }).map(function (it) { return curto(it.id, it.nome) + ' (' + String(it.cfi).replace(/^previsto\s*/i, 'previsto para ') + ')'; });
    var cfiTxt = semCfi.length || prevCfi.length ? 'CFI: ' + (prevCfi.length ? prevCfi.join(', ') + ' ainda sem código' : '') + (prevCfi.length && semCfi.length ? '; ' : '') + (semCfi.length ? semCfi.join(' e ') + ' fora do catálogo (' + R(c.C.cfi ? c.C.cfi.sem : 0) + ')' : '') + '. O FINAME do pacote inteiro depende de todos os códigos publicados.' : '';
    S.secoes.push({ h: 'Compra do pacote VMI (C)', b: [
      sC ? 'Linha em uso: **' + sC.linha.nome + '**, CET de ' + Pp(c.C.cetAno) + ' a.a., ' + c.C.n + ' meses com ' + (c.C.c || 0) + ' de carência; parcela de ' + R(c.C.primeira) + ' na carência e ' + R(c.C.parcela) + ' depois. Pacote de ' + mi(c.C.capex) + ' (preços VMI de 15/10/2026).' : 'Nenhuma linha elegível com as premissas atuais.',
      'Manutenção pós-garantia, plano ' + (c.C.manut.plano === 'prata' ? 'Prata' : 'Ouro') + ': ' + R(c.C.manut.mes) + '/mês a partir do mês ' + (m.manut.garantia_meses + 1) + ' de operação.',
      fgTxt, cfiTxt
    ].filter(Boolean) });
    /* 5. locação D */
    var vplFlip = vplCom(function (mm) { mm.altD.vmi_manut = lt.sep ? 'sim' : 'nao'; }, 'D'), L = c.D.loc;
    S.secoes.push({ h: 'Locação do pacote VMI (D)', b: [
      'Base: ' + lt.base + '. Prazo de ' + c.D.n + ' meses' + (c.D.n === 48 ? ' (sugestão da VMI)' : '') + ': custo de ' + R(c.D.aluguel) + '/mês' + (lt.vmi ? ', sendo ' + R(L.aluguelVmi) + ' de aluguel VMI (TC, Aquila S e Aquila D)' + (lt.sep ? ', ' + R(L.manSep) + ' de manutenção à parte (média no prazo)' : '') + ' e ' + R(c.D.aluguel - L.aluguelVmi - L.manSep) + ' dos itens sem cotação' : '') + (lt.vmi && !lt.sep ? '. O aluguel VMI já inclui a manutenção' : '') + '.',
      (lt.sep ? '**Cenário com manutenção à parte**: o VPL de D é ' + mi(c.flD.vplEnt) + '; com a manutenção inclusa, como a VMI confirmou, seria ' + mi(vplFlip) + '.' : '**Manutenção inclusa no aluguel** (confirmado em 17/10/2026): não há contrato à parte. Se fosse cobrada depois da garantia, o VPL de D cairia de ' + mi(c.flD.vplEnt) + ' a ' + mi(vplFlip) + '.') + ' O aluguel do Aquila S com manutenção (' + R(((m.equip.C.filter(function (x) { return x.id === 'rxp'; })[0] || {}).loc_vmi || {})[c.D.n]) + '/mês) é menor que o contrato Ouro avulso do mesmo equipamento (R$ 6.800/mês): argumento para negociar a manutenção dos RX na compra.',
      (c.D.equilibrioC >= c.D.aluguel ? 'Folga de ' + R(c.D.equilibrioC - c.D.aluguel) + '/mês até o aluguel de equilíbrio com a compra C (' + R(c.D.equilibrioC) + '/mês). É a margem para a cotação de ultrassons e placa DR, hoje estimados em ' + R(c.D.aluguel - L.aluguelVmi - L.manSep) + '/mês: até ' + R(c.D.equilibrioC - L.aluguelVmi - L.manSep) + '/mês por esses itens, D continua à frente de C.' : 'Aluguel de equilíbrio com a compra C: ' + R(c.D.equilibrioC) + '/mês (' + Psig(c.D.equilibrioC / c.D.aluguel - 1, 0) + ' sobre o custo atual). É o teto para negociar com a VMI.'),
      'A VMI cotou o RX digital como Aquila D; na compra, o RX digital é o Apolo D. Ultrassons e placa DR ainda sem cotação de locação.'
    ] });
    /* 6. crédito */
    S.secoes.push({ h: 'Capacidade de crédito do hospital', b: [
      'Dívida líquida de ' + mi(c.ent.dl) + ' (' + X(c.ent.dlEbitda) + ' o EBITDA). Em ' + l1.ano + ', o hospital cobre ' + X(l1.dscrSemProj) + ' do serviço da dívida sem o projeto e ' + X(l1.dscrSem) + ' com o projeto (alternativa ' + selId + '), abaixo do 1,3x de referência.',
      'Com o TDC de ' + mi(m.entidade.tdc_min) + ' em ' + fmtMes(m.entidade.tdc_mes) + ' liquidando ' + P(m.entidade.tdc_liquida, 0) + ' da dívida, a cobertura vai a ' + X(l1.dscrCom) + '. O agente vai olhar o TDC, a garantia real ou o FGI antes de aprovar a compra; a locação não depende de linha bancária.'
    ] });
    /* 7. pendências com efeito medido */
    var pend = [], vSel = c.flSel.vplEnt;
    if (+m.propria.sala_elimina) { var v1 = vplCom(function (mm) { mm.propria.sala_elimina = 0; }); pend.push('Linha "médicos que usam a sala" (' + P(m.base.rep_sala_pct, 1) + ' da receita): se ela permanecer na imagem própria, o VPL de ' + selId + ' muda ' + mi(v1 - vSel) + '.'); }
    if (+m.propria.matmed_pct < 0.15) { var v2 = vplCom(function (mm) { mm.propria.matmed_pct = 0.15; }); pend.push('Mat/Med: ' + P(m.propria.matmed_pct, 1) + ' na planilha contra cerca de 15% na nota da própria planilha; com 15%, o VPL de ' + selId + ' muda ' + mi(v2 - vSel) + '.'); }
    pend.push('Locação: cotar ultrassons e placa DR (hoje estimados) e confirmar se o RX digital locado é o Aquila D ou o Apolo D.');
    if (semCfi.length) pend.push('CFI de ' + semCfi.join(' e ') + ' (ou trocar o ultrassom pelo Dominus L1, credenciado)' + (prevCfi.length ? ', e publicação do CFI da Pulsar' : '') + '.');
    pend.push('FGTS-Saúde: CEBAS na modalidade de 60% ao SUS, créditos SUS de 12 meses e contratos no Teto MAC.');
    pend.push('Perímetro do RX digital: fixo (Apolo D, proposta VMI) ou portátil (como no pacote GE).');
    S.secoes.push({ h: 'Pendências que mudam o número', b: pend });
    S.secoes.push({ h: 'Próximos passos', b: ['Gate 0 (agora): aprovar a tese e o perímetro; formalizar a proposta VMI de compra e de locação com as respostas acima; fechar as premissas a validar (linha da sala, material, contrato EMG, RIS/PACS).', 'Gate 1 (dez/26 a 1T27): TDC emitido; CFI da Pulsar publicado; protocolar o FINAME (ou fechar a locação) com o kit de documentos.', 'Gate 2: desembolso ou assinatura da locação, instalação e transição da EMG.'] });
    S.nota = 'Números do modelo da página "Viabilidade da internalização com equipamentos VMI" (S&S Partners) no momento da geração. Premissas, fontes e fórmulas nas abas Premissas e Método.';
    return S;
  }
  function mdInline(s, html) { var t = html ? esc(s) : s; return html ? t.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>') : t.replace(/\*\*(.+?)\*\*/g, '$1'); }
  function sumarioHtml(S) {
    return '<div class="sum-doc"><p class="eyebrow">S&amp;S Partners · Hospital Dom Alvarenga</p><h2>' + esc(S.titulo) + '</h2><p class="small muted">' + esc(S.sub) + '</p>' + S.secoes.map(function (sc) {
      return '<h3>' + esc(sc.h) + '</h3>' + (sc.t ? '<div class="tbl-wrap"><table><thead><tr>' + sc.t.head.map(function (x, i) { return '<th' + (i ? ' class="n"' : '') + '>' + esc(x) + '</th>'; }).join('') + '</tr></thead><tbody>' + sc.t.rows.map(function (r) { return '<tr>' + r.map(function (x, i) { return '<td' + (i ? ' class="n"' : '') + '>' + esc(x) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' : '') +
        (sc.p || []).map(function (x) { return '<p>' + mdInline(x, true) + '</p>'; }).join('') + (sc.b && sc.b.length ? '<ul class="bullets">' + sc.b.map(function (x) { return '<li>' + mdInline(x, true) + '</li>'; }).join('') + '</ul>' : '');
    }).join('') + '<p class="tiny muted" style="margin-top:14px">' + esc(S.nota) + '</p></div>';
  }
  function sumarioTexto(S) {
    var o = [S.titulo.toUpperCase(), S.sub, ''];
    S.secoes.forEach(function (sc) {
      o.push(sc.h.toUpperCase());
      if (sc.t) { o.push(sc.t.head.join(' | ')); sc.t.rows.forEach(function (r) { o.push(r.join(' | ')); }); }
      (sc.p || []).forEach(function (x) { o.push(mdInline(x, false)); });
      (sc.b || []).forEach(function (x) { o.push('• ' + mdInline(x, false)); });
      o.push('');
    });
    o.push(S.nota); return o.join('\n');
  }
  /* .docx mínimo (OOXML), sem biblioteca: zip sem compressão */
  function crc32(u8) { var t = crc32.t || (crc32.t = (function () { var a = [], c, n, k; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; a[n] = c >>> 0; } return a; })()); var c = -1; for (var i = 0; i < u8.length; i++) c = (c >>> 8) ^ t[(c ^ u8[i]) & 0xFF]; return (c ^ -1) >>> 0; }
  function zipStore(files, mime) {
    var enc = new TextEncoder(), parts = [], cen = [], off = 0;
    files.forEach(function (f) {
      var nm = enc.encode(f.name), d = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(d);
      var lh = new DataView(new ArrayBuffer(30)); lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(12, 0x21, true); lh.setUint32(14, crc, true); lh.setUint32(18, d.length, true); lh.setUint32(22, d.length, true); lh.setUint16(26, nm.length, true);
      parts.push(new Uint8Array(lh.buffer), nm, d);
      var ch = new DataView(new ArrayBuffer(46)); ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(14, 0x21, true); ch.setUint32(16, crc, true); ch.setUint32(20, d.length, true); ch.setUint32(24, d.length, true); ch.setUint16(28, nm.length, true); ch.setUint32(42, off, true);
      cen.push(new Uint8Array(ch.buffer), nm); off += 30 + nm.length + d.length;
    });
    var cs = cen.reduce(function (s, a) { return s + a.length; }, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cs, true); e.setUint32(16, off, true);
    return new Blob(parts.concat(cen, [new Uint8Array(e.buffer)]), { type: mime });
  }
  function sumarioDocx(S) {
    var x = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
    var runs = function (s, sz, cor) { return String(s).split(/(\*\*.+?\*\*)/).filter(Boolean).map(function (seg) { var b = /^\*\*.+\*\*$/.test(seg); return '<w:r><w:rPr>' + (b ? '<w:b/>' : '') + (cor ? '<w:color w:val="' + cor + '"/>' : '') + (sz ? '<w:sz w:val="' + sz + '"/>' : '') + '</w:rPr><w:t xml:space="preserve">' + x(b ? seg.slice(2, -2) : seg) + '</w:t></w:r>'; }).join(''); };
    var par = function (s, o) { o = o || {}; return '<w:p><w:pPr>' + (o.st ? '<w:pStyle w:val="' + o.st + '"/>' : '') + (o.bul ? '<w:ind w:left="360" w:hanging="240"/>' : '') + '<w:spacing w:after="' + (o.after == null ? 100 : o.after) + '"/></w:pPr>' + (o.bul ? '<w:r><w:t>•</w:t></w:r><w:r><w:tab/></w:r>' : '') + runs(s, o.sz, o.cor) + '</w:p>'; };
    var cel = function (s, i, hd) { return '<w:tc><w:tcPr><w:tcW w:w="' + (i ? 2000 : 3000) + '" w:type="dxa"/>' + (hd ? '<w:shd w:val="clear" w:color="auto" w:fill="EDEFF2"/>' : '') + '</w:tcPr><w:p><w:pPr><w:spacing w:after="0"/>' + (i ? '<w:jc w:val="right"/>' : '') + '</w:pPr>' + runs(hd && s ? '**' + s + '**' : s, 18) + '</w:p></w:tc>'; };
    var tbl = function (t) { var bd = '<w:tblBorders>' + ['top', 'bottom', 'insideH'].map(function (k) { return '<w:' + k + ' w:val="single" w:sz="4" w:space="0" w:color="BFC5CC"/>'; }).join('') + '</w:tblBorders>'; return '<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/>' + bd + '<w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="2000"/><w:gridCol w:w="2000"/><w:gridCol w:w="2000"/></w:tblGrid>' + '<w:tr>' + t.head.map(function (s, i) { return cel(s, i, true); }).join('') + '</w:tr>' + t.rows.map(function (r) { return '<w:tr>' + r.map(function (s, i) { return cel(s, i, false); }).join('') + '</w:tr>'; }).join('') + '</w:tbl>' + par('', { after: 60 }); };
    var body = par('S&S Partners · Hospital Dom Alvarenga', { sz: 18, cor: '6B7280', after: 40 }) + par(S.titulo, { st: 'Title' }) + par(S.sub, { sz: 18, cor: '6B7280', after: 200 });
    S.secoes.forEach(function (sc) { body += par(sc.h, { st: 'Heading1' }); if (sc.t) body += tbl(sc.t); (sc.p || []).forEach(function (s) { body += par(s); }); (sc.b || []).forEach(function (s) { body += par(s, { bul: true, after: 60 }); }); });
    body += par(S.nota, { sz: 16, cor: '6B7280' });
    var doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + body + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>';
    var styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="20"/><w:lang w:val="pt-BR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="60"/></w:pPr><w:rPr><w:b/><w:sz w:val="34"/><w:color w:val="111827"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="220" w:after="80"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="1F3A5F"/></w:rPr></w:style></w:styles>';
    var files = [
      { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>' },
      { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
      { name: 'word/_rels/document.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { name: 'word/document.xml', data: doc }, { name: 'word/styles.xml', data: styles }];
    return zipStore(files, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  }
  var sumAtual = null;
  function abrirSumario() {
    try { sumAtual = sumarioExecutivo(); } catch (e) { toast('Não foi possível gerar o sumário: ' + e.message); return; }
    $('#sumBody').innerHTML = sumarioHtml(sumAtual); $('#sumOvl').hidden = false; document.body.style.overflow = 'hidden'; registrarUso('export', { doc: 'sumario' });
  }
  function fecharSumario() { $('#sumOvl').hidden = true; document.body.style.overflow = ''; }
  function salvarArquivo(nome, blob, ok) {
    if (downloads) downloads.save({ filename: nome, data: blob }).then(function () { toast(ok); }).catch(function (e) { if (!e || e.code !== 'declined') toast('Não foi possível salvar o arquivo aqui.'); });
    else { try { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; a.click(); } catch (e) { toast('Download indisponível nesta visualização.'); } }
  }
  $('#btnSumario').addEventListener('click', abrirSumario);
  $('#sumFechar').addEventListener('click', fecharSumario);
  $('#sumOvl').addEventListener('click', function (e) { if (e.target === this) fecharSumario(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#sumOvl').hidden) fecharSumario(); });
  $('#sumDocx').addEventListener('click', function () { if (!sumAtual) return; salvarArquivo('HDA_sumario_executivo_' + new Date().toISOString().slice(0, 10) + '.docx', sumarioDocx(sumAtual), 'Sumário salvo.'); });
  $('#sumCopiar').addEventListener('click', function () {
    if (!sumAtual) return; var txt = sumarioTexto(sumAtual);
    var fallback = function () { var ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) { } document.body.removeChild(ta); toast(ok ? 'Texto copiado.' : 'Não foi possível copiar; use o .docx.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { toast('Texto copiado.'); }, fallback); else fallback();
  });

  /* ================= exportação XLSX ================= */
  function exportarXlsx() {
    if (typeof XLSX === 'undefined') { toast('Biblioteca de planilha não carregou.'); return; }
    var wb = XLSX.utils.book_new(), c = calc, fl = c.flSel;
    var prem = [['Bloco', 'Premissa', 'Id', 'Valor', 'Unidade', 'Origem', 'Fonte']];
    SCHEMA.forEach(function (s) { var v = getPath(model, s.id); prem.push([s.bloco, s.label, s.id, s.fmt === 'pct' ? v : v, s.un, ORIG[s.origem] || s.origem, s.fonte]); });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(prem), 'Premissas');
    var eq = [['Pacote', 'Item', 'Modelo', 'Qtd', 'Preço unit.', 'Parcela unit.', 'CFI', 'Financiável', 'Manut. Prata R$/mês/un.', 'Manut. Ouro R$/mês/un.', 'Provisão de tubo no Prata', 'Fonte da manutenção', 'Obs']];
    ['B', 'C'].forEach(function (k) { model.equip[k].forEach(function (it) { eq.push([k, it.nome, it.modelo, it.qtd, it.preco, it.parcela || '', it.cfi || '', it.fin !== false ? 'sim' : 'não', it.m_prata || 0, it.m_ouro || 0, it.tubo ? model.propria.tubo : '', it.m_fonte || '', it.obs || '']); }); });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(eq), 'Equipamentos');
    var e = c.cen.emg, p = c.cen.prop;
    var dre = [['DRE mensal (R$)', 'EMG', 'Imagem própria'], ['Exames', e.exames, p.exames], ['Receita bruta', e.rb, p.rb], ['Glosas', -e.glosa, -p.glosa], ['Receita líquida', e.rl, p.rl], ['Mat/Med', -e.matmed, -p.matmed], ['Repasse médicos', -e.rep_med, -p.rep_med], ['Repasse material EMG', -e.rep_mat, -p.rep_mat], ['Repasse biópsias', -e.rep_bio, -p.rep_bio], ['Médicos que usam a sala', -e.rep_sala, -p.rep_sala], ['Margem de contribuição', e.mc, p.mc], ['Custos fixos diretos', -e.cf_dir, -p.cf_dir], ['Manutenção', -e.manut, -p.manut], ['RIS/PACS', -e.rispacs, -p.rispacs], ['Custos indiretos', -e.cf_ind, -p.cf_ind], ['EBITDA', e.resultado, p.resultado]];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dre), 'DRE mensal');
    var fx = [['Ano', 'Ano civil', 'Fator volume', 'Fração', 'Receita líquida', 'EBITDA EMG', 'EBITDA própria antes de manut./aluguel', 'Diferença × fração', c.sel.id === 'D' ? 'Aluguel' : 'Manutenção', 'EBITDA incremental', 'Depreciação', 'Tributos', 'Residual', 'FCL projeto', 'Parcelas', 'Juros', 'Caixa hospital', 'Acum. projeto', 'Acum. hospital', 'DSCR projeto']];
    fx.push([0, model.fin.ano_inicio - 1, '', '', '', '', '', '', '', '', '', '', '', -fl.capex, '', '', fl.ent[0], -fl.capex, fl.ent[0], '']);
    fl.anos.forEach(function (a) { fx.push([a.t, a.ano, a.fator, a.frac, a.rl, a.ebitdaEmg, a.ebitdaPropBase, a.incBase, a.opex, a.inc, a.dep, a.trib, a.residual, a.fcp, a.servico, a.juros, a.fce, a.acumP, a.acumE, a.dscr]); });
    fx.push([]); fx.push(['Alternativa', c.sel.id]); fx.push(['VPL projeto', fl.vpl]); fx.push(['TIR projeto', fl.tir]); fx.push(['Payback', fl.pb]); fx.push(['Payback descontado', fl.pbDesc]); fx.push(['VPL hospital', fl.vplEnt]); fx.push(['Caixa acumulado hospital', fl.acumEnt]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(fx), 'Fluxo ' + c.sel.id);
    var fB = c.flB, fC = c.flC, fD = c.flD, H = +model.fin.horizonte;
    var alt = [['Indicador', 'B · GE/HFS', 'C · VMI compra', 'D · VMI locação'], ['Forma', 'Compra, fornecedores 60x', 'Compra, ' + (c.C.escolha ? c.C.escolha.linha.nome : 'sem linha'), 'Locação ' + c.D.n + ' meses, renovável'], ['Investimento', c.B.capex, c.C.capex, 0], ['Financiado', c.B.capexFin, c.C.capexFin, 0], ['Prazo (m)', c.B.n, c.C.n, c.D.n], ['Carência (m)', 0, c.C.c, ''], ['Custo a.a. (%)', c.B.cetAno, c.C.cetAno, c.D.loc.taxaAno * 100], ['Parcela ou aluguel (R$/mês)', c.B.parcela, c.C.parcela, c.D.aluguel], ['Manutenção em regime (R$/mês)', c.B.manut.mes, c.C.manut.mes, 'inclusa'], ['Plano de manutenção', c.B.manut.plano, c.C.manut.plano, 'Ouro (no aluguel)'], ['Desembolso ano 0', -fB.ent[0], -fC.ent[0], -fD.ent[0]], ['Total desembolsado com equipamentos (' + H + ' anos)', fB.desembolsoTot, fC.desembolsoTot, fD.desembolsoTot], ['VPL projeto', fB.vpl, fC.vpl, fD.vpl], ['VPL hospital', fB.vplEnt, fC.vplEnt, fD.vplEnt], ['Caixa acumulado', fB.acumEnt, fC.acumEnt, fD.acumEnt], ['DSCR hospital ano 1, sem TDC', c.entAlt.B.linhas[0].dscrSem, c.entAlt.C.linhas[0].dscrSem, c.entAlt.D.linhas[0].dscrSem], ['Aluguel de equilíbrio com C (R$/mês)', '', '', c.D.equilibrioC], ['Aluguel de equilíbrio com B (R$/mês)', '', '', c.D.equilibrioB]];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(alt), 'Alternativas');
    var loc = [['Locação D no prazo de ' + c.D.n + ' meses · ' + locTxt().base + ' · ' + locTxt().manut], ['Item', 'Base', 'Cotação VMI R$/mês/un.', 'Valor de compra', 'Queda a.a.', 'Residual %', 'Residual R$', 'Aluguel (com tributos)', 'dos quais tributos', 'Manutenção média', 'Custo mensal', '% do valor/mês', 'Taxa implícita a.a.']];
    c.D.loc.linhas.forEach(function (x) { loc.push([x.nome, x.fonte === 'vmi' ? 'VMI · ' + x.cotModelo : 'composição', x.cotUnit || '', x.V, x.dep, x.rvPct, x.RV, x.fin, x.trib, x.man, x.aluguel, x.pctMes, x.taxaImpl == null ? '' : x.taxaImpl]); });
    loc.push(['Pacote', '', '', c.D.loc.V, '', c.D.loc.RV / c.D.loc.V, c.D.loc.RV, c.D.loc.fin, c.D.loc.trib, c.D.loc.man, c.D.loc.aluguel, c.D.loc.pctMes, '']);
    loc.push([]); loc.push(['Tabela de locação VMI (16/10/2026), R$/mês por unidade']); loc.push(['Prazo'].concat(model.equip.C.filter(function (it) { return it.loc_vmi; }).map(function (it) { return it.loc_vmi_modelo || it.modelo; })));
    [12, 24, 36, 48, 60, 72, 84].forEach(function (n) { loc.push([n].concat(model.equip.C.filter(function (it) { return it.loc_vmi; }).map(function (it) { return +it.loc_vmi[n] || ''; }))); });
    loc.push([]); loc.push(['Taxa do locador a.a. (itens sem cotação)', c.D.loc.taxaAno, 'arrendamento PJ + prêmio']); loc.push([]);
    loc.push(['Prazo (m)', 'Custo/mês', '% do valor/mês', 'Total no prazo', 'VP do custo', 'VP comprar e usar no prazo (C)', 'Vantagem da locação', 'Aluguel de equilíbrio no prazo', 'VPL hospital ' + H + ' anos', 'Caixa acumulado']);
    (c.prazosD || []).forEach(function (z) { loc.push([z.n, z.aluguel, z.pctMes, z.totalPrazo, z.pvAluguel, z.custoPossuir, z.vantagem, z.equilibrio, z.vplEnt, z.acumEnt]); });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(loc), 'Locação D');
    if (c.C.escolha) { var cr = [['t', 'Ano', 'Mês', 'Taxa a.a. (%)', 'Saldo inicial', 'Juros', 'Amortização', 'Parcela', 'Saldo']]; c.C.escolha.sim.rows.forEach(function (r) { cr.push([r.t, r.y, r.m, r.taxa, r.saldoIni, r.juros, r.amort, r.parcela, r.saldo]); }); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cr), 'Cronograma C'); }
    var en = [['Ano', 'EBITDA hospital', 'EBITDA projeto', 'Serviço atual', 'Atual após TDC', 'Serviço novo', 'DSCR sem projeto', 'DSCR sem TDC', 'DSCR com TDC']]; c.ent.linhas.forEach(function (l) { en.push([l.ano, l.ebitdaEnt, l.inc, l.servAtual, l.servAtualTdc, l.servNovo, l.dscrSemProj, l.dscrSem, l.dscrCom]); });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(en), 'Crédito entidade');
    var out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    var nome = 'HDA_viabilidade_imagem_' + new Date().toISOString().slice(0, 10) + '.xlsx';
    registrarUso('export', { doc: 'xlsx' });
    if (downloads) downloads.save({ filename: nome, data: new Blob([out]) }).then(function () { toast('Planilha salva.'); }).catch(function (e) { if (!e || e.code !== 'declined') toast('Não foi possível salvar a planilha aqui.'); });
    else { try { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([out])); a.download = nome; a.click(); } catch (e) { toast('Download indisponível nesta visualização.'); } }
  }
  $('#btnXlsx').addEventListener('click', exportarXlsx);

  /* ================= boot ================= */
  $('#logoTopo').src = LOGO.navy;
  if (NO_DOMINIO) { var ft = $('#foot'); ft.innerHTML = '<a href="/.netlify/functions/sair" style="margin-right:10px">Sair</a><a href="/admin/" style="margin-right:10px">Acessos</a>' + ft.innerHTML; }
  registrarUso('pagina');
  recompute(); renderAll();
  var t0 = lsGet('hda:tab'); showTab(t0 && $('#tab-' + t0) ? t0 : 'tese');
  initCaps();
})();
