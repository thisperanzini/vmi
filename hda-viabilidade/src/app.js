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
  var NF4 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  function FXr(v) { return v == null || !isFinite(v) ? '—' : 'R$ ' + NF4.format(v); }
  function FX2(v) { return v == null || !isFinite(v) ? '—' : 'R$ ' + NF2.format(v); }
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
  var ORIG = { controladoria: 'Controladoria', jaime: 'Jaime', deck: 'Conselho', fonte: 'Fonte pública', ss: 'S&S', vmi: 'VMI', ceo: 'CEO (20/10)', pendente: 'A validar' };
  var LINHAS_NOME = {}; BASE.linhas.forEach(function (l) { LINHAS_NOME[l.id] = l.nome; });

  /* ---------------- estado ---------------- */
  var model = modeloPadrao(), saved = clone(model), sim = null, calc = null, simCalc = null;
  var dirty = false, db = null, userCap = null, downloads = null, canWrite = null, dbState = 'carregando', versoes = [], vendoVersao = null;
  var tab = 'tese', saveT = null, ultimoSalvoEm = null;

  function sane(m) {
    var d = modeloPadrao(), out = clone(d);
    if (!m || typeof m !== 'object') return out;
    SCHEMA.forEach(function (s) { var v = getPath(m, s.id); if (v !== undefined && v !== null) setPath(out, s.id, v); });
    if (m.equip) { if (Array.isArray(m.equip.B)) out.equip.B = completarManut(clone(m.equip.B), EQUIP_B_PADRAO); if (Array.isArray(m.equip.C)) out.equip.C = completarManut(clone(m.equip.C), EQUIP_C_PADRAO); if (m.equip.B_n) out.equip.B_n = m.equip.B_n; out.equip.rm_v = m.equip.rm_v; garantirRM(out.equip); }
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
  /* eixo com passos redondos (ex.: −100, 0, 100, 200), também quando há negativos */
  function eixoY(mn, mx) {
    var st = niceMax((mx - mn) / 4 || 1); mn = Math.floor(mn / st + 1e-9) * st; mx = Math.ceil(mx / st - 1e-9) * st; if (mx <= mn) mx = mn + st;
    var t = []; for (var v = mn; v <= mx + st / 2; v += st) t.push(Math.abs(v) < st / 1e6 ? 0 : v);
    return { mn: mn, mx: mx, t: t };
  }
  function svgLines(opts) {
    /* opts: {cats:[], series:[{nome, vals:[], cor}], h, fmt, ref:{v,label}} */
    var W = 720, H = opts.h || 240, pl = 64, pr = 12, pt = 14, pb = 30, iw = W - pl - pr, ih = H - pt - pb;
    var all = []; opts.series.forEach(function (s) { all = all.concat(s.vals.filter(function (v) { return v != null; })); }); if (opts.ref) all.push(opts.ref.v);
    var mx = niceMax(Math.max.apply(null, all.concat([0]))), mn = Math.min.apply(null, all.concat([0])); mn = mn < 0 ? -niceMax(-mn) : 0;
    if (opts.zoom) { var lo0 = Math.min.apply(null, all), hi0 = Math.max.apply(null, all), pd = (hi0 - lo0) * 0.12 || Math.abs(hi0) * 0.05 || 1; mn = lo0 - pd; mx = hi0 + pd; } /* eixo sem o zero, para diferenças pequenas */
    var eY = eixoY(mn, mx); mn = eY.mn; mx = eY.mx;
    var y = function (v) { return pt + ih - (v - mn) / (mx - mn) * ih; }, x = function (i) { return pl + (opts.cats.length > 1 ? i / (opts.cats.length - 1) * iw : iw / 2); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.aria || '') + '">';
    eY.t.forEach(function (v) { s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="var(--grid)"/><text x="' + (pl - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + esc(opts.fmt(v)) + '</text>'; });
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
    var eY = eixoY(mn, mx); mn = eY.mn; mx = eY.mx;
    var y = function (v) { return pt + ih - (v - mn) / (mx - mn) * ih; };
    var n = opts.cats.length, gw = iw / n, bw = Math.min(42, gw * 0.7 / opts.series.length);
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.aria || '') + '">';
    eY.t.forEach(function (v) { s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="var(--grid)"/><text x="' + (pl - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + esc(opts.fmt(v)) + '</text>'; });
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
      '<p class="lead"><b>Objetivo do CEO:</b> transformar o HDA num centro boutique de referência em imagem, com Sectra, Integrare e equipamentos modernos.</p><p class="lead muted">O hospital já paga a estrutura (espaço, enfermagem, técnicos, administração) e repassa ' + P(emg.repasse / emg.rl, 0) + ' da receita à EMG. Internalizado, o mesmo volume vira resultado positivo. Os números abaixo são calculados ao vivo a partir das premissas salvas (cenário ' + (rmOn() ? 'com RM' : 'sem RM') + ', ' + (pacsOn() ? 'com PACS Sectra' : 'sem PACS') + '); os marcados "a validar" mudam o resultado e estão listados no fim.</p></div>';
    h += '<div class="grid kpis">' +
      kpi('Resultado atual com a EMG', '<span class="' + sinal(emg.resultado) + '">' + R(emg.resultado) + '</span>', 'por mês · ' + P(emg.resultado / emg.rl, 1) + ' da receita líquida', 'bad') +
      kpi('Resultado com imagem própria', '<span class="' + sinal(prop.resultado) + '">' + R(prop.resultado) + '</span>', (isD ? 'por mês, já com o aluguel dos equipamentos' : 'por mês em regime, com manutenção pós-garantia, antes das parcelas') + pacsOutro(function (o) { return R(o.resultado); }), 'good') +
      kpi('Ganho operacional', mi(c.ganhoMes * 12), (isD ? 'por ano em regime, após o aluguel · ' : 'por ano em regime · ') + R(c.ganhoMes) + '/mês' + pacsOutro(function (o) { return mi(o.ganhoMes * 12) + '/ano'; }), 'good') +
      (isD ? kpi((locTxt().sep ? 'Aluguel e manutenção' : 'Aluguel') + ' (' + altNome + ')', R(sel.aluguel), sel.n + ' meses, ' + locTxt().manut + ' · sem dívida nova', '') : kpi('Parcela do financiamento (' + altNome + ')', R(sel.parcela), sel.id === 'C' ? linha + ' · ' + (sel.n || '—') + ' meses, ' + (sel.c || 0) + ' de carência' : 'HFS/GE e fornecedores · 60 meses', '')) +
      kpi('VPL do projeto', '<span class="' + sinal(fl.vpl) + '">' + mi(fl.vpl) + '</span>', 'a ' + P(model.fin.desconto, 0) + ' a.a. · ' + model.fin.horizonte + ' anos' + pacsOutro(function (o) { return mi(o[sel.id].vpl); }), fl.vpl > 0 ? 'good' : 'bad') +
      (isD ? kpi('Investimento', R(0) + ' em equipamentos', 'só a implantação de RIS' + (pacsOn() ? ' e PACS' : '') + ' (' + mi((+model.propria.rispacs_impl || 0) + E.pacsImpl(model)) + ')' + (c.rm.on ? ' e a sala da RM' : ''), 'good', true) : kpi('TIR · payback', (fl.tir == null ? '—' : P(fl.tir, 0)) + ' · ' + (fl.pb == null ? '—' : N(fl.pb, 1) + ' a'), 'payback descontado ' + (fl.pbDesc == null ? '—' : N(fl.pbDesc, 1) + ' anos') + pacsOutro(function (o) { return (o[sel.id].tir == null ? '—' : P(o[sel.id].tir, 0)) + ' · ' + (o[sel.id].pb == null ? '—' : N(o[sel.id].pb, 1) + ' a'); }), 'good', true)) +
      kpi('DSCR do hospital em ' + e27.ano, X(e27.dscrSemProj) + ' → ' + X(e27.dscrSem), 'sem o projeto → com o projeto, sem TDC · com TDC ' + X(e27.dscrCom), e27.dscrSem != null && e27.dscrSem < 1.3 ? 'warn' : 'good', true) +
      '</div>';
    h += cardPACS();
    /* cenário da ressonância */
    var q = c.cenRM, rr = model.rm, eqS = q ? q.eq[sel.id] : null;
    if (q) h += '<div class="card"><div class="card-h"><h2>Ressonância magnética: cenário com e sem</h2>' + rmSegHtml('segRmTese') + '</div>' +
      '<p class="small">Cignus 600 sem hélio, 24 canais, por ' + mi(+((rmItem('C') || {}).preco) || 0) + ', mais ' + mi(+rr.obra || 0) + ' para a sala. Aprovação em ' + fmtMes(rr.aprovacao) + ' e operação a partir de ' + fmtMes(E.mesRMStr(model)) + ', com financiamento próprio liberado na entrega. Serviço novo (a EMG não faz RM): ' + N(rr.exames_mes) + ' exames/mês de convênio e particular em regime a ' + R(rr.ticket) + ', ' + P(rr.rampa1, 0) + ' no 1º ano de operação e ' + P(rr.rampa2, 0) + ' no 2º. Volume e ticket são hipóteses a validar e dependem de os planos de saúde voltarem a incluir a RM nos pacotes do HDA. A página está no cenário <b>' + (rmOn() ? 'com RM' : 'sem RM') + '</b>.</p>' +
      '<div class="grid two" style="margin-top:10px"><div>' + rmTabela([sel.id], true) + '</div><div><table><thead><tr><th>VPL para o hospital</th><th class="n">Sem RM</th><th class="n">Com RM</th></tr></thead><tbody>' + ['B', 'C', 'D'].map(function (k) { return '<tr' + (k === sel.id ? ' class="hl"' : '') + '><td>' + k + ' · ' + altNome_(k) + '</td><td class="n">' + mi(q.sem[k].vplEnt) + '</td><td class="n">' + mi(q.com[k].vplEnt) + '</td></tr>'; }).join('') + '</tbody></table><p class="small" style="margin-top:10px">' + rmEquilibrioTxt(sel.id) + '</p></div></div></div>';
    h += cardSUS();
    var ach = [];
    ach.push('<b>Hoje o serviço dá prejuízo.</b> Receita líquida de ' + R(emg.rl) + '/mês; a EMG fica com ' + R(emg.repasse) + ' (' + P(emg.repasse / emg.rl, 0) + '), o hospital arca com ' + R(emg.cf_dir + emg.cf_ind) + ' de custos fixos e indiretos e fecha em ' + R(emg.resultado) + '/mês (' + mi(emg.resultado * 12) + '/ano).');
    ach.push('<b>Internalizar inverte o sinal com a mesma receita.</b> Mantida a equipe médica a ' + P(model.propria.rep_med_pct, 1) + ' da receita e assumidos material, ' + (isD ? (locTxt().sep ? 'aluguel dos equipamentos e manutenção (' : 'aluguel dos equipamentos com manutenção (') + R(prop.aluguel) + '/mês)' : 'manutenção pós-garantia (' + R(prop.manut) + '/mês, plano ' + (sel.manut.plano === 'prata' ? 'Prata' : 'Ouro') + ')') + ', ' + (pacsOn() ? 'RIS (Touch Health) e PACS Sectra (' + R(prop.ris + prop.pacs) + '/mês)' : 'RIS (Touch Health, ' + R(prop.ris) + '/mês), com o PACS fora do modelo') + ', o resultado vai a ' + R(prop.resultado) + '/mês. Ganho de ' + mi(c.ganhoMes * 12) + ' por ano, dos quais ' + mi(-emg.resultado * 12) + ' são a eliminação do prejuízo.');
    ach.push(isD ? '<b>Sem investimento em equipamentos.</b> ' + pacoteTxt() + ' alugados por ' + sel.n + ' meses a ' + R(sel.aluguel) + '/mês (' + Pp(sel.loc.pctMes * 100) + ' do valor ao mês; base: ' + locTxt().base + '; ' + locTxt().manut + '), com troca do equipamento na renovação. Para empatar com a compra financiada (C) o aluguel teria de ser ' + R(sel.equilibrioC) + '/mês.' : '<b>Investimento de ' + mi(sel.capex) + '</b> em ' + pacoteTxt() + (c.rm.on && c.rm.obra ? ' (a sala da RM, de ' + mi(c.rm.obra) + ', sai do caixa em ' + (+model.fin.ano_inicio + E.anoRM(model) - 1) + ')' : '') + (sel.id === 'C' ? ', com ' + mi(sel.capexFin) + ' financiados pela linha <b>' + esc(linha) + '</b> (CET ' + Pp(sel.cetAno) + ' a.a., parcela de ' + R(sel.parcela) + ' após a carência; ' + R(sel.primeira) + ' na carência)' : ', financiado pelo HFS e fornecedores em 60x (' + R(sel.parcela) + '/mês, custo implícito ' + Pp(sel.cetAno) + ' a.a.)') + '. O pacote GE/HFS custa ' + Pp(c.B.cetAno) + ' a.a. implícitos em 60 meses, com preço indexado ao dólar.');
    ach.push('<b>Compra ou locação.</b> VPL para o hospital em ' + model.fin.horizonte + ' anos: ' + mi(c.flC.vplEnt) + ' comprando o pacote VMI com fomento (C), ' + mi(c.flB.vplEnt) + ' comprando o pacote GE (B) e ' + mi(c.flD.vplEnt) + ' alugando o pacote VMI (D). A locação dispensa investimento e dívida nova e transfere a obsolescência ao locador' + (locTxt().sep ? '; pela cotação da VMI, a manutenção continua com o hospital (premissa a confirmar)' : ' junto com a manutenção') + '; a comparação completa está em Alternativas.');
    if (c.rm.on && c.rm.reg && c.rm.isolada && q) { var ri = c.rm.isolada; ach.push('<b>Ressonância, serviço novo.</b> Com ' + N(rr.exames_mes) + ' exames/mês a ' + R(rr.ticket) + ', a RM gera ' + R(c.rm.reg.ebitda) + '/mês de EBITDA em regime antes da manutenção (' + R(c.rm.reg.ebitda - ri.manutMes) + ' depois da garantia, contrato Ouro estimado em ' + R(ri.manutMes) + '). Sozinha e sem financiamento, a RM rende VPL de ' + mi(ri.vpl) + (ri.tir != null ? ' e TIR de ' + P(ri.tir, 1) : '') + ' sobre ' + mi(ri.inv) + ' de equipamento e obra: ela reduz o VPL do plano em ' + mi(-q.eq[sel.id].delta) + '. ' + rmEquilibrioTxt(sel.id) + ' A internalização se paga sem a RM; a RM é uma decisão à parte, que depende de demanda comprovada e de o HDA negociar com os planos de saúde a volta da RM aos pacotes de reembolso, de onde ela saiu recentemente.'); }
    ach.push(isD ? '<b>Retorno.</b> VPL para o hospital de ' + mi(fl.vplEnt) + ' a ' + P(model.fin.desconto, 0) + ' a.a. em ' + model.fin.horizonte + ' anos, já descontado o aluguel; caixa acumulado de ' + mi(fl.acumEnt) + ' no horizonte.' : '<b>Retorno.</b> VPL de ' + mi(fl.vpl) + ' a ' + P(model.fin.desconto, 0) + ' a.a. em ' + model.fin.horizonte + ' anos, TIR de ' + (fl.tir == null ? '—' : P(fl.tir, 0)) + ', payback de ' + anos(fl.pb) + '. Caixa acumulado para o hospital após as parcelas: ' + mi(fl.acumEnt) + ' no horizonte; DSCR mínimo do projeto ' + X(fl.dscrMin) + '.');
    ach.push('<b>A restrição é o crédito do hospital, não o projeto.</b> Dívida líquida de ' + mi(c.ent.dl) + ' (' + X(c.ent.dlEbitda, 1) + ' o EBITDA anualizado de ' + mi(c.ent.ebitdaBase) + '); o serviço da dívida de ' + e27.ano + ' (' + mi(e27.servAtual) + ') consome todo o EBITDA (DSCR ' + X(e27.dscrSemProj) + '). O projeto melhora a cobertura (' + X(e27.dscrSem) + ') e o TDC a resolve (' + X(e27.dscrCom) + '). Por isso a contratação deve vir depois da emissão do TDC, com carência longa.');
    var tcap = c.tc; ach.push('<b>Capacidade.</b> Uma TC a ' + model.propria.tc_exh + ' exames/h, ' + model.propria.tc_h + ' h/dia, faz ' + N(tcap.cap) + ' exames/mês; o volume de ' + N(tcap.tc) + ' TC/mês ocupa ' + P(tcap.ocup, 0) + '. Equipamento único: a transição com a EMG precisa de sobreposição.');
    h += '<div class="card"><div class="card-h"><h2>O que o modelo diz</h2><span class="muted small">alternativa ' + sel.id + ' · ' + altNome + ' · cenário de volume ' + (model.cenario.volume_var >= 0 ? '+' : '') + P(model.cenario.volume_var, 0) + '</span></div><ul class="bullets">' + ach.map(function (a) { return '<li>' + a + '</li>'; }).join('') + '</ul></div>';
    /* por que VMI */
    h += '<div class="grid two"><div class="card"><div class="card-h"><h2>Por que equipamento nacional</h2></div><div class="grid" style="gap:12px">' +
      '<div class="tile"><h3>FINAME exige CFI, e o catálogo decide item a item</h3><p>Verificado no Catálogo CFI do BNDES em 14 e 15/10/2026: RX móvel Aquila 320 S (03538400) e RX digital Apolo D (03538246) constam; o ultrassom Invictus e a placa DR da VMI não aparecem (só o FGTS-Saúde, que não exige CFI, os financia, ou pedir o credenciamento); <b>a TC Pulsar ainda não consta</b>; a VMI prevê o credenciamento até dez/2026 (premissa de 15/10/2026), antes da contratação em 2027, e o modelo já a trata como credenciada. GE (CT Ascend, Aspire), Siemens, Philips, Canon e Imex têm TCs credenciadas. Validade dos códigos VMI usados: Aquila 320 S e Apolo D até mar/2030.</p><p class="src"><a href="https://ws.bndes.gov.br/cfi_catalogo/" target="_blank" rel="noopener">Catálogo CFI do BNDES</a></p></div>' +
      '<div class="tile"><h3>FGTS-Saúde: só a modalidade I está regulamentada</h3><p>Até 60 meses, sem carência, TR + 8,66% + até 3% de risco, pela Caixa, BB ou BNDES. Exige CEBAS na modalidade de 60% ao SUS e participação no Agora Tem Especialistas, e a parcela tem de caber em 35% da média mensal dos créditos SUS. A modalidade de investimento (20 anos, 12 de carência) ainda não foi regulamentada. ' + (calc.C.escolha && calc.C.escolha.linha.id === 'fgts-saude' ? 'Com as respostas informadas, é a linha em uso.' : 'Sem as respostas, o plano usa o FINAME.') + '</p><p class="src">Manual de Fomento FGTS Saúde v002 (Caixa, ago/2026); Res. CCFGTS 1.152/2026</p></div>' +
      '<div class="tile"><h3>Câmbio só no pacote GE</h3><p>O pacote VMI (C e D) é cotado em reais. ' + esc(fxFrase()) + ' Entre a proposta e o contrato o risco é do hospital.</p></div>' +
      '<div class="tile"><h3>SUS paga mais por TC no privado e no filantrópico</h3><p>A Portaria SAES/MS 4.282/2026 (Agora Tem Especialistas) leva a TC a cerca de R$ 300 por exame para quem adere. ' + (E.susAteOn(model) ? 'Receita incluída no número (chave "SUS no modelo").' : 'Receita fora do caso-base; entra pela chave "SUS no modelo".') + '</p><p class="src"><a href="https://www.conass.org.br/?p=57841" target="_blank" rel="noopener">Conass, Portaria 4.282</a></p></div>' +
      '</div></div>' +
      '<div class="card"><div class="card-h"><h2>O que pode dar errado</h2></div><div class="grid" style="gap:12px">' +
      '<div class="tile"><h3>Janela sem TC na troca</h3><p>O contrato com a EMG não tem multa e pede 90 dias de aviso (CEO, 20/10). A EMG é dona dos equipamentos: o aviso deve sair ~90 dias antes da instalação (go-live em ' + fmtMes(goLive()) + ' no modelo). Se a entrega atrasar depois do aviso, o hospital fica sem TC: amarrar o prazo de entrega no pedido e manter a opção de prorrogar com a EMG.</p></div>' +
      (pacsOn() ? '<div class="tile"><h3>PACS Sectra é estimativa, não cotação</h3><p>O modelo usa R$ ' + NF2.format(+model.propria.pacs_exame || 0) + ' por exame (' + R(prop.pacs) + '/mês) e ' + mi(+model.propria.pacs_impl || 0) + ' de setup e implantação, estimativas S&S para a edição Standard, que a Sectra ainda está disponibilizando no Brasil. Faixa de R$ 6,94 a 10,58 por exame. Tira ' + mi(c.cenPACS ? -c.cenPACS.delta[sel.id] : 0) + ' do VPL. A S&S representa a Sectra: declarar ao hospital.</p></div>' : '<div class="tile"><h3>PACS fora do modelo: número otimista</h3><p>Sem o PACS, o resultado fica ' + R(c.cenPACS ? c.cenPACS.sem.resultado - c.cenPACS.com.resultado : 0) + '/mês acima e o VPL ' + mi(c.cenPACS ? -c.cenPACS.delta[sel.id] : 0) + ' acima do cenário com a estimativa S&S do Sectra Standard. O hospital vai precisar de um PACS: trocar pela cotação assim que sair.</p></div>') +
      '<div class="tile"><h3>O CFI da Pulsar ainda não saiu</h3><p>O modelo assume o credenciamento até dez/2026 (premissa VMI). Se atrasar além do Gate 2, a TC fica fora do FINAME e vai para o FGTS-Saúde (se o hospital cumprir os requisitos) ou recurso próprio, enquanto a TC GE (Ascend, Aspire) entra. Para testar esse caso, coloque "Não" em "Tratar o pacote como credenciado" em Premissas.</p></div>' +
      (c.rm.on && q ? '<div class="tile"><h3>A RM depende de volume</h3><p>Com as hipóteses atuais a RM tira ' + mi(-q.eq[sel.id].delta) + ' do VPL e leva a cobertura de ' + q.sem[sel.id].dscr[0].ano + ' de ' + X(q.sem[sel.id].dscr[0].v) + ' para ' + X(q.com[sel.id].dscr[0].v) + '. Empata com ' + N(q.eq[sel.id].volume) + ' exames/mês. O volume de convênio depende de o HDA reincluir a RM nos pacotes de reembolso dos planos de saúde, de onde ela saiu recentemente. Validar a demanda antes de comprar e negociar o preço (R$ 4,33 mi no contrato FINAME da CEMAN; R$ 4,9 mi nos pregões de Goiás).</p></div>' : '') +
      '<div class="tile"><h3>Crédito antes do TDC</h3><p>Sem o TDC, o hospital rola capital de giro a 48 meses e a cobertura fica em ' + X(e27.dscrSem) + '. Um banco pode pedir garantia real ou recusar até a desalavancagem.</p></div>' +
      '</div></div></div>';
    /* gates */
    h += '<div class="card"><div class="card-h"><h2>Sequência de decisão</h2><span class="muted small">cada etapa libera a seguinte</span></div><div class="gates">' +
      '<div class="gate now"><div class="gh"><b>Gate 0</b><span>agora</span></div><ul><li>Aprovar a tese e o perímetro (TC, 2 US, RX móvel, RX digital, placa DR); decidir se o RX digital é fixo (Apolo, proposta VMI) ou portátil (pacote GE)</li><li>Formalizar a proposta VMI (preços de 15/10/2026), cotação de manutenção da Pulsar, do Apolo e do Invictus, CFI do Invictus e da placa DR; na locação (tabela de 16/10/2026, manutenção inclusa), confirmar se o RX digital é o Aquila D ou o Apolo D e cotar ultrassons e placa DR; acompanhar o credenciamento CFI da Pulsar (previsto até dez/2026)</li><li>Premissas fechadas com o CEO em 20/10: linha da sala, material, laudo (radiologistas de dia, telelaudo à noite), equipe técnica, contrato EMG e sala da TC reaproveitada. Falta detalhar a folha de R$ 184 mil/mês e cotar o RIS (Touch Health) e o PACS (Sectra Standard)</li><li>Ressonância, decisão à parte: HDA negociar com as operadoras a volta da RM aos pacotes de reembolso (os planos a retiraram recentemente); demanda (RMs pedidas hoje para fora), ticket dos convênios, preço da Cignus 600 (referências de R$ 4,33 a 4,9 mi), cotação de manutenção e de locação, projeto de pré-instalação e CFI da versão sem hélio</li></ul></div>' +
      '<div class="gate"><div class="gh"><b>Gate 1</b><span>dez/26 – 1T27</span></div><ul><li>TDC emitido e negociação iniciada</li><li>CFI da Pulsar publicado no Catálogo (previsto dez/2026): condição para o FINAME do pacote</li><li>Protocolar o FINAME (agente) com o kit de documentos</li>' + (fgtsEstado().st === 'cond' ? '<li>Responder as perguntas do FGTS-Saúde (CEBAS 60% SUS, créditos SUS de 12 meses, contratos no Teto MAC) e confirmar o Agora Tem Especialistas; se couber, protocolar também na Caixa ou no BB</li>' : '') + '</ul></div>' +
      '<div class="gate"><div class="gh"><b>Gate 2</b><span>2T27</span></div><ul><li>Contratação do financiamento e pedido de compra, ou assinatura da locação</li><li>Aviso de 90 dias à EMG ~3 meses antes da instalação, sem multa e sem sobreposição de custos</li><li>Contratar manutenção (início após a garantia), RIS e PACS</li></ul></div>' +
      '<div class="gate"><div class="gh"><b>Gate 3</b><span>operação</span></div><ul><li>Imagem própria em regime</li><li>Indicadores do Jaime: exames, tempo de espera, repetição, disponibilidade, custo por exame</li><li>Revisar premissas e esta página a cada trimestre</li></ul></div>' +
      '</div></div>';
    $('#tab-tese').innerHTML = h;
    bindRmSeg('segRmTese'); bindPacsSeg('segPacsTese'); bindSusSeg('segSusTese');
  }

  /* ================= DIAGNÓSTICO ================= */
  function renderDiagnostico() {
    var c = calc, e = c.base.emg, p = c.base.prop, m = model;
    var h = '<div class="card hero"><span class="eyebrow">Modelo atual · EMG (empresa do ex-CEO) opera o serviço desde a terceirização</span><h2>O hospital entra com espaço, estrutura e equipe; a EMG entra com equipamentos antigos e corpo médico, e leva 59% da receita</h2><p class="lead muted">Base: DRE por unidade de negócio da Controladoria, jan–jun/26, convênio e particular. O SUS (20% do hospital) não está na base nem no modelo, por decisão do CEO; o valor do SUS a mais aparece à parte, na tese, sem entrar no VPL.</p></div>';
    h += '<div class="grid kpis">' + kpi('Exames por mês', N(e.exames), 'convênio + particular · ticket ' + R(m.base.ticket)) + kpi('Receita líquida', R(e.rl), 'por mês') + kpi('Repasse à EMG', R(e.repasse), P(e.repasse / e.rl, 0) + ' da receita') + kpi('Custos do hospital', R(e.cf_dir + e.cf_ind), 'fixos diretos + indiretos') + kpi('Resultado', '<span class="neg">' + R(e.resultado) + '</span>', 'por mês · ' + mi(e.resultado * 12) + '/ano', 'bad') + '</div>';
    /* DRE comparativa mensal */
    function row(l, a, b, cls) { return '<tr class="' + (cls || '') + '"><td>' + l + '</td><td class="n">' + R(a) + '</td><td class="n">' + (a != null && e.rl ? P(a / e.rl, 1) : '') + '</td><td class="n">' + R(b) + '</td><td class="n">' + (b != null && p.rl ? P(b / p.rl, 1) : '') + '</td></tr>'; }
    h += '<div class="grid two"><div class="card"><div class="card-h"><h2>DRE mensal: EMG × imagem própria</h2><span class="muted small">volume atual, regime após a garantia · alternativa ' + calc.sel.id + '</span></div><div class="tbl-wrap"><table><thead><tr><th>R$/mês</th><th class="n">EMG</th><th class="n">A.V.</th><th class="n">Própria</th><th class="n">A.V.</th></tr></thead><tbody>' +
      row('Receita bruta', e.rb, p.rb) + (e.rbSus || p.rbSus ? row('dos quais SUS atual', e.rbSus, p.rbSus, 'sub') : '') + (p.rbSusMais ? row('dos quais SUS a mais (Agora Tem Especialistas)', e.rbSusMais, p.rbSusMais, 'sub') : '') + row('(−) Glosas', -e.glosa, -p.glosa, 'sub') + row('Receita líquida', e.rl, p.rl, 'total') +
      row('(−) Mat/Med', -e.matmed, -p.matmed) + row('(−) Repasse: médicos', -e.rep_med, -p.rep_med) + row('(−) Repasse: material EMG', -e.rep_mat, -p.rep_mat) + row('(−) Repasse: biópsias', -e.rep_bio, -p.rep_bio) + row('(−) Médicos que usam a sala', -e.rep_sala, -p.rep_sala) +
      row('Margem de contribuição', e.mc, p.mc, 'total') + row('(−) Custos fixos diretos', -e.cf_dir, -p.cf_dir) + row('(−) Manutenção pós-garantia', -e.manut, -p.manut) + (p.aluguel ? row('(−) Aluguel dos equipamentos', -e.aluguel, -p.aluguel) : '') + row('(−) RIS (Touch Health)', -(e.ris || 0), -(p.ris || 0)) + row('(−) PACS Sectra, por exame' + (pacsOn() ? '' : ' (fora do modelo)'), -(e.pacs || 0), -(p.pacs || 0)) + row('Margem direta', e.margem_direta, p.margem_direta, 'total') + row('(−) Custos indiretos', -e.cf_ind, -p.cf_ind) + row('Resultado operacional (EBITDA)', e.resultado, p.resultado, 'total hl') +
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
  /* ressonância: cenário com/sem e textos do perímetro */
  function rmOn(mm) { return E.rmOn(mm || model); }
  function rmItem(k, mm) { return ((mm || model).equip[k || 'C'] || []).filter(E.isRM)[0]; }
  function pacoteTxt(mm) { return 'TC 64/128, dois ultrassons, RX móvel, RX digital e placa DR' + (rmOn(mm) ? ', mais a RM Cignus 600' : ''); }
  function pacsOn(mm) { return E.pacsOn(mm || model); }
  function pacsSegHtml(id) { var on = pacsOn(); return '<span class="seg" id="' + id + '"><button data-pacs="sim" class="' + (on ? 'on' : '') + '">Com PACS</button><button data-pacs="nao" class="' + (!on ? 'on' : '') + '">Sem PACS</button></span>'; }
  function bindPacsSeg(id) { var el = document.getElementById(id); if (!el) return; $$('button[data-pacs]', el).forEach(function (b) { b.addEventListener('click', function () { if ((model.propria.pacs_incluir || 'sim') === this.dataset.pacs) return; model.propria.pacs_incluir = this.dataset.pacs; afterEdit(); }); }); }
  /* texto "no outro cenário de PACS" para os KPIs */
  function pacsOutro(f) { var q = calc.cenPACS; if (!q) return ''; var o = q.on ? q.sem : q.com; return ' · ' + (q.on ? 'sem PACS: ' : 'com PACS: ') + f(o); }
  /* SUS: chave de três posições (fora, atual, atual + Agora Tem Especialistas) */
  function susNome(k) { return { fora: 'SUS fora', atual: 'SUS atual', ate: 'SUS atual + Agora Tem Especialistas' }[k] || k; }
  function susSegHtml(id) { var md = E.susModo(model); return '<span class="seg" id="' + id + '">' + [['fora', 'Fora'], ['atual', 'SUS atual'], ['ate', '+ Agora Tem Esp.']].map(function (o) { return '<button data-sus="' + o[0] + '" class="' + (md === o[0] ? 'on' : '') + '">' + o[1] + '</button>'; }).join('') + '</span>'; }
  function bindSusSeg(id) { var el = document.getElementById(id); if (!el) return; $$('button[data-sus]', el).forEach(function (b) { b.addEventListener('click', function () { model.sus = model.sus || {}; if ((model.sus.modo || 'fora') === this.dataset.sus) return; model.sus.modo = this.dataset.sus; afterEdit(); }); }); }
  function sgMi(v) { return v == null || !isFinite(v) ? '—' : '<span class="' + (v >= 0 ? 'pos' : 'neg') + '">' + (v >= 0 ? '+' : '−') + mi(Math.abs(v)) + '</span>'; }
  /* delta da RM em C (ou na alternativa) sem e com o SUS a mais da RM */
  function rmSusDelta(sid) { var q = calc.cenSUS, r = calc.cenRM; if (!q || !r || !r.eq || !r.eq[sid]) return null; var base = r.eq[sid].delta - (E.susAteOn(model) && rmOn() ? q.vplRMsus : 0); return { sem: base, com: base + q.vplRMsus }; }
  function cardSUS() {
    var q = calc.cenSUS, sx = model.sus || {}; if (!q) return '';
    var md = q.modo, sid = calc.sel.id, A = { B: 'B · GE/HFS', C: 'C · VMI compra', D: 'D · VMI locação' }, cols = ['fora', 'atual', 'ate'];
    var th = function (k, t) { return '<th class="n">' + (k === md ? '<u>' + t + '</u>' : t) + '</th>'; };
    var tc = calc.tc, capR = 2 * (+(model.rm || {}).horas_dia || 12) * 26, rmS = rmSusDelta(sid);
    var emgM = q.atual.emg === 'mesmo', dM = emgM ? q.dAtual[sid] : q.dAtualOutroEmg[sid], dN = emgM ? q.dAtualOutroEmg[sid] : q.dAtual[sid];
    var h = '<div class="card"><div class="card-h"><h2>SUS no modelo</h2>' + susSegHtml('segSusTese') + '</div>' +
      '<p class="small">Por decisão do CEO (20/10), o padrão é deixar o SUS <b>fora</b>: nenhuma receita nem custo SUS no VPL, e o PACS conta só os exames de convênio e particular. As outras posições mostram o efeito de incluí-lo. A página está em <b>' + susNome(md) + '</b>.</p>' +
      '<div class="tbl-wrap" style="margin-top:8px"><table><thead><tr><th>VPL para o hospital</th>' + th('fora', 'Fora') + th('atual', 'SUS atual') + th('ate', '+ Agora Tem Especialistas') + '</tr></thead><tbody>' +
      ['B', 'C', 'D'].map(function (k) { return '<tr' + (k === sid ? ' class="hl"' : '') + '><td>' + A[k] + (k === sid ? ' (em uso)' : '') + '</td>' + cols.map(function (c0) { return '<td class="n">' + mi(q.v[c0][k].vplEnt) + '</td>'; }).join('') + '</tr>'; }).join('') +
      '<tr><td>Resultado mensal da imagem própria, em regime</td>' + cols.map(function (c0) { return '<td class="n">' + R(q.v[c0].resultado) + '</td>'; }).join('') + '</tr>' +
      '<tr><td>Cobertura do hospital ' + q.v.fora.dscr.map(function (x) { return x.ano; }).join(' / ') + ' (' + sid + ')</td>' + cols.map(function (c0) { return '<td class="n">' + q.v[c0].dscr.map(function (x) { return X(x.v); }).join(' / ') + '</td>'; }).join('') + '</tr>' +
      '</tbody></table></div>' +
      '<div class="grid two" style="margin-top:12px"><div><p class="small"><b>SUS atual</b>: ' + N(q.atual.exames) + ' exames/mês (diferença entre os volumes do Jaime e a base da Controladoria) a R$ ' + NF2.format(q.atual.ticket) + ' em média pela tabela SIGTAP (estimativa S&S), cerca de ' + R(q.atual.rlMes) + '/mês de receita líquida. Esse SUS já existe com a EMG: internalizar só muda quem fica com a margem. Se a EMG recebe sobre ele os mesmos percentuais do convênio, o efeito em ' + sid + ' é de ' + sgMi(dM) + '; se não recebe nada além do contrato, ' + sgMi(dN) + '. Falta a produção SUS por modalidade (SIA/BPA) e a cláusula do contrato da EMG.</p></div>' +
      '<div><p class="small"><b>SUS a mais (Agora Tem Especialistas)</b>: ' + N(sx.tc_mes) + ' TCs/mês a ' + R(sx.tc_valor) + ' (SIGTAP: R$ 109,06) na capacidade ociosa, com a TC passando de ' + P(tc.tcHoje / tc.cap, 0) + ' para ' + P((tc.tcHoje + (+sx.tc_mes || 0)) / tc.cap, 0) + ' de ocupação: ' + sgMi(q.vplTCsus) + ' em ' + sid + '. ' +
      (rmS ? 'Com a RM, ' + N(sx.rm_mes) + ' RMs/mês a R$ ' + NF2.format(+sx.rm_valor || 0) + ' (sem rampa, pela fila SUS) somam ' + sgMi(q.vplRMsus) + ' e a RM passa de ' + sgMi(rmS.sem) + ' para ' + sgMi(rmS.com) + ' de VPL em ' + sid + ', com a agenda a ' + P(((+(model.rm || {}).exames_mes || 0) + (+sx.rm_mes || 0)) / capR, 0) + ' da capacidade. ' : '') +
      'Depende de habilitação no programa, contratualização com o gestor e espaço no Teto MAC, o que não está nas mãos do HDA; por isso fica fora do caso-base.</p></div></div>' +
      '<p class="small muted" style="margin-top:8px">O FIIS Saúde financia equipamento para uso SUS: se o HDA estiver na chamada de 2025, o caso-base deve ficar ao menos em "SUS atual". Premissas no bloco SUS.</p></div>';
    return h;
  }
  function cardPACS() {
    var q = calc.cenPACS; if (!q) return '';
    var on = q.on, sid = calc.sel.id, A = { B: 'B · GE/HFS', C: 'C · VMI compra', D: 'D · VMI locação' };
    var dl = function (v, fmt) { return '<span class="' + (v >= 0 ? 'pos' : 'neg') + '">' + (v >= 0 ? '+' : '−') + fmt(Math.abs(v)).replace('−', '') + '</span>'; };
    var row = function (l, a, b, fmt, cls) { return '<tr class="' + (cls || '') + '"><td>' + l + '</td><td class="n">' + fmt(a) + '</td><td class="n">' + fmt(b) + '</td><td class="n">' + dl(a - b, fmt) + '</td></tr>'; };
    var h = '<div class="card"><div class="card-h"><h2>PACS Sectra: com e sem no modelo</h2>' + pacsSegHtml('segPacsTese') + '</div>' +
      '<p class="small">O PACS Sectra Standard ainda não tem cotação e é o custo que mais pesa depois do volume: estimativa S&S de R$ ' + NF2.format(q.exame) + ' por exame × ' + N(q.exames) + ' exames/mês no modelo (convênio e particular' + (E.susAtualOn(model) ? ', mais o SUS' : '; o SUS só entra com a chave do SUS') + ') (' + R(q.com.pacsMes) + '/mês' + (rmOn() ? ', mais a RM' : '') + ') e ' + mi(q.impl) + ' de setup e implantação. A página está no cenário <b>' + (on ? 'com PACS' : 'sem PACS') + '</b>.</p>' +
      '<div class="tbl-wrap" style="margin-top:8px"><table><thead><tr><th></th><th class="n">Com PACS</th><th class="n">Sem PACS</th><th class="n">Diferença</th></tr></thead><tbody>' +
      ['B', 'C', 'D'].map(function (k) { return row('VPL para o hospital, ' + A[k] + (k === sid ? ' (em uso)' : ''), q.com[k].vplEnt, q.sem[k].vplEnt, mi, k === sid ? 'hl' : ''); }).join('') +
      row('VPL do projeto (' + sid + ')', q.com[sid].vpl, q.sem[sid].vpl, mi) +
      '<tr><td>TIR · payback (' + sid + ')</td><td class="n">' + (q.com[sid].tir == null ? '—' : P(q.com[sid].tir, 0)) + ' · ' + anos(q.com[sid].pb) + '</td><td class="n">' + (q.sem[sid].tir == null ? '—' : P(q.sem[sid].tir, 0)) + ' · ' + anos(q.sem[sid].pb) + '</td><td></td></tr>' +
      row('Resultado mensal da imagem própria, em regime', q.com.resultado, q.sem.resultado, R) +
      '<tr><td>Cobertura do hospital ' + q.com.dscr.map(function (x) { return x.ano; }).join(' / ') + ' (' + q.com.selId + ')</td><td class="n">' + q.com.dscr.map(function (x) { return X(x.v); }).join(' / ') + '</td><td class="n">' + q.sem.dscr.map(function (x) { return X(x.v); }).join(' / ') + '</td><td></td></tr>' +
      '</tbody></table></div><ul class="bullets" style="margin-top:10px">' +
      '<li><b>Não muda a escolha.</b> O PACS custa o mesmo nas três formas de pagar: ' + (q.melhorCom === q.melhorSem ? 'a melhor é ' + q.melhorCom + ' nos dois cenários' : 'a melhor é ' + q.melhorCom + ' com PACS e ' + q.melhorSem + ' sem PACS') + '. Muda o tamanho do ganho: ' + mi(-q.delta[sid]) + ' de VPL em ' + sid + '.</li>' +
      '<li><b>"Sem PACS" é o teto, não um cenário real.</b> Ao sair da EMG, o hospital vai precisar de um PACS próprio: o cenário sem PACS mostra quanto o projeto vale antes desse custo e serve para ler o espaço de negociação. Cada R$ 1 por exame vale cerca de ' + mi(q.exame ? (-q.delta[sid] - q.impl) / q.exame : 0) + ' de VPL; a implantação entra pelo valor cheio no ano 0.</li>' +
      '<li><b>Faixa da estimativa</b>: R$ 6,94 a R$ 10,58 por exame (Simulador e tornado). A S&S representa a Sectra: declarar ao hospital.</li></ul></div>';
    return h;
  }
  function rmSegHtml(id) { var on = rmOn(); return '<span class="seg" id="' + id + '"><button data-rm="sim" class="' + (on ? 'on' : '') + '">Com RM</button><button data-rm="nao" class="' + (!on ? 'on' : '') + '">Sem RM</button></span>'; }
  function bindRmSeg(id) { var el = document.getElementById(id); if (!el) return; $$('button[data-rm]', el).forEach(function (b) { b.addEventListener('click', function () { if (model.rm.incluir === this.dataset.rm) return; model.rm.incluir = this.dataset.rm; afterEdit(); }); }); }
  /* ---------- câmbio do pacote B (GE) ---------- */
  var FX_ITENS_TXT = { tc: 'a TC GE', ge: 'a TC e os ultrassons GE', ge_rm: 'a TC, os ultrassons e a RM' };
  function fxInfo() {
    var q = calc.cenCambio, fx = calc.B.fx, modo = fx.dolar ? 'dolar' : 'fixas', outro = fx.dolar ? 'fixas' : 'dolar';
    var ref = q ? q.linhas.filter(function (l) { return l.proposta; })[0] : null, rr = q ? q.r[modo] : null, ro = q ? q.r[outro] : null;
    var melhorCD = Math.max(calc.flC.vplEnt, calc.flD.vplEnt), quem = calc.flC.vplEnt >= calc.flD.vplEnt ? 'C' : 'D';
    return { q: q, fx: fx, modo: modo, outro: outro, rr: rr, ro: ro, dPreco: fx.precoModelo - fx.precoProposta, dParcela: fx.parcelaDolar - fx.parcelaProposta,
      dVpl: ref ? calc.flB.vplEnt - ref[modo].vplEnt : 0, itensTxt: FX_ITENS_TXT[fx.itens] || 'a TC GE', tem: !!(fx.ids && fx.ids.length), melhorCD: melhorCD, quem: quem };
  }
  /* câmbio em que B empata com a alternativa k (C ou D), em texto */
  function fxEmpateTxt(v, k, vB, vK) {
    if (v == null || !isFinite(v)) return 'o câmbio não muda a posição de B frente a ' + k;
    if (v < 3) return 'B não alcança ' + k + ' em nenhum câmbio plausível (empate a ' + FX2(Math.max(0, v)) + ')';
    return vB < vK ? 'B só passa ' + k + ' com o dólar abaixo de ' + FX2(v) : 'B fica à frente de ' + k + ' até o dólar a ' + FX2(v);
  }
  function fxFrase() {
    var f = fxInfo(), fx = f.fx; if (!f.tem || !f.rr) return 'Nenhum item do pacote B está em dólar.';
    return 'No pacote GE, ' + f.itensTxt + ' ' + (fx.ids.length > 1 ? 'têm' : 'tem') + ' preço em dólar (US$ ' + NF0.format(Math.round(fx.usdTotal)) + ', proposta a ' + FXr(fx.ref) + '). A ' + FXr(fx.usd) + ', o pacote B custa ' + mi(Math.abs(f.dPreco)) + (f.dPreco >= 0 ? ' a mais' : ' a menos') + ' e o VPL de B ' + (f.dVpl <= 0 ? 'cai ' : 'sobe ') + mi(Math.abs(f.dVpl)) + ' frente à proposta; cada R$ 0,10 no dólar muda o VPL de B em ' + mi(Math.abs(f.rr.porDecimo)) + '. ' + fxEmpateTxt(f.rr.empateC, 'C', calc.flB.vplEnt, calc.flC.vplEnt) + ' (parcelas ' + (f.modo === 'dolar' ? 'atreladas ao dólar' : 'fixas em reais') + ').';
  }
  function cardCambio() {
    var f = fxInfo(), q = f.q, fx = f.fx; if (!q) return '';
    var m = model, vC = q.vC, vD = q.vD, mx = Math.max(vC, vD);
    var tit = !f.tem ? 'Câmbio: nenhum item do pacote B está em dólar com a chave atual'
      : 'Câmbio: a ' + FXr(fx.usd) + ', o pacote GE sai ' + (f.dPreco >= 0 ? mi(f.dPreco) + ' mais caro' : mi(-f.dPreco) + ' mais barato') + ' que na proposta e o VPL de B ' + (f.dVpl <= 0 ? 'cai ' : 'sobe ') + mi(Math.abs(f.dVpl));
    var h = '<div class="card" id="cardCambio"><div class="card-h"><h2>' + tit + '</h2><span class="muted small">só o pacote B tem preço em dólar; C e D são cotações VMI em reais</span></div>';
    h += '<div class="row" style="gap:14px;flex-wrap:wrap;align-items:center;margin-bottom:10px"><label class="small">Câmbio na assinatura (R$/US$) <input class="n w-s" id="fxUsd" value="' + esc(NF4.format(fx.usd)) + '"></label>' +
      '<span class="seg" id="segFxParc">' + [['fixas', 'Parcelas fixas em R$'], ['dolar', 'Atreladas ao dólar']].map(function (o) { return '<button data-v="' + o[0] + '" class="' + (f.modo === o[0] ? 'on' : '') + '">' + o[1] + '</button>'; }).join('') + '</span>' +
      '<span class="seg" id="segFxItens">' + [['tc', 'Só a TC'], ['ge', 'TC e ultrassons'], ['ge_rm', 'TC, ultrassons e RM']].map(function (o) { return '<button data-v="' + o[0] + '" class="' + (fx.itens === o[0] ? 'on' : '') + '">' + o[1] + '</button>'; }).join('') + '</span></div>';
    h += '<div class="tbl-wrap"><table><thead><tr><th>Câmbio (R$/US$)</th><th class="n">Itens em dólar (R$)</th><th class="n">Parcela do pacote B (R$/mês)</th><th class="n">VPL de B, parcelas fixas</th><th class="n">VPL de B, atreladas ao dólar</th><th class="n">B − melhor entre C e D (' + (f.modo === 'dolar' ? 'atreladas' : 'fixas') + ')</th></tr></thead><tbody>' +
      q.linhas.map(function (l) { var d = l[f.modo].vplEnt - mx; return '<tr class="' + (l.atual ? 'hl' : '') + '"><td>' + FXr(l.usd) + (l.proposta ? ' <span class="tiny muted">proposta GE</span>' : '') + (l.atual ? ' <span class="tiny muted">premissa</span>' : '') + '</td><td class="n">' + R(fx.usdTotal * l.usd) + '</td><td class="n">' + R(l[f.modo].parcela) + '</td><td class="n">' + mi(l.fixas.vplEnt) + '</td><td class="n">' + mi(l.dolar.vplEnt) + '</td><td class="n ' + (d >= 0 ? 'pos' : 'neg') + '">' + (d >= 0 ? '+' : '') + mi(d) + '</td></tr>'; }).join('') +
      '</tbody></table></div>';
    var b = [];
    if (f.tem) {
      b.push('<b>Em dólar</b>: ' + f.itensTxt + ' (US$ ' + NF0.format(Math.round(fx.usdTotal)) + ' ao câmbio da proposta, ' + FXr(fx.ref) + '). ' + (fx.itens === 'tc' ? 'A proposta só declara o câmbio na TC; os ultrassons GE e uma RM cotada pela GE podem vir em dólar (chave acima). ' : '') + 'RX e placas em reais.');
      b.push('<b>Sensibilidade</b>: cada R$ 0,10 no dólar muda a parcela do pacote B em ' + R(Math.abs(f.rr.parcelaPorDecimo)) + '/mês e o VPL de B em ' + mi(Math.abs(f.rr.porDecimo)) + '.' + (f.modo === 'dolar' ? ' Com as parcelas atreladas, a variação de ' + Pp(fx.va * 100) + ' a.a. soma ' + mi(f.rr.varCambio) + ' às parcelas em ' + calc.B.n + ' meses (dólar a ' + FXr(fx.usdUltima) + ' na última).' : ' Com as parcelas atreladas ao dólar (+' + Pp(fx.va * 100) + ' a.a.), o VPL de B ficaria em ' + mi(f.ro.vplAtual) + '.'));
      b.push('<b>Empate</b>: ' + fxEmpateTxt(f.rr.empateC, 'C', calc.flB.vplEnt, vC) + '; ' + fxEmpateTxt(f.rr.empateD, 'D', calc.flB.vplEnt, vD) + '. Com as parcelas ' + (f.modo === 'dolar' ? 'fixas' : 'atreladas') + ': ' + FX2(f.ro.empateC) + ' (C) e ' + FX2(f.ro.empateD) + ' (D).' + (calc.flB.vplEnt < mx && f.rr.empateC < fx.usd && f.rr.empateD < fx.usd ? ' Acima desses níveis o câmbio só aumenta a vantagem da VMI: pesa no tamanho, não na escolha.' : ''));
    }
    b.push('<b>A confirmar com a GE</b>: quais itens vêm em dólar, se a parcela do HFS fica fixa em reais depois da assinatura (a proposta diz "sujeita a alterações decorrentes de câmbio e taxas de juros") e até quando vale o preço. C e D usam as cotações VMI em reais de 15 e 16/10/2026: confirmar a validade com a VMI.');
    h += '<ul class="bullets" style="margin-top:10px">' + b.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul><p class="small muted" style="margin-top:8px">Referência: PTAX de venda de 28/10/2026 a R$ 5,3420, depois de passar de R$ 5,04 (23/10) a R$ 5,50 (26/10); Focus de 23/10/2026: R$ 5,05 no fim de 2026, R$ 5,15 em 2027 e R$ 5,28 em 2029. As premissas ficam em Premissas › Câmbio.</p></div>';
    return h;
  }
  function bindCambio() {
    var i = document.getElementById('fxUsd'); if (i) i.addEventListener('change', function () { var v = parseBR(this.value); if (!(v > 0)) { this.value = NF4.format(+model.cambio.usd); return; } model.cambio.usd = v; afterEdit(); });
    [['segFxParc', 'parcelas'], ['segFxItens', 'itens']].forEach(function (p) { var el = document.getElementById(p[0]); if (!el) return; $$('button[data-v]', el).forEach(function (b) { b.addEventListener('click', function () { if (model.cambio[p[1]] === this.dataset.v) return; model.cambio[p[1]] = this.dataset.v; afterEdit(); }); }); });
  }
  /* quadro com × sem RM: linhas por alternativa a partir de calc.cenRM */
  function rmTabela(ids, compacto) {
    var q = calc.cenRM; if (!q) return '';
    var A = { B: 'B · GE/HFS', C: 'C · VMI compra', D: 'D · VMI locação' }, dl = function (v, fmt, inv) { var c = v == null ? '' : (inv ? -v : v) >= 0 ? 'pos' : 'neg'; return '<span class="' + c + '">' + (v == null ? '—' : (v >= 0 ? '+' : '−') + fmt(Math.abs(v)).replace('−', '')) + '</span>'; };
    var h = '<div class="tbl-wrap"><table><thead><tr><th></th><th class="n">Sem RM</th><th class="n">Com RM</th><th class="n">Diferença</th></tr></thead><tbody>';
    ids.forEach(function (k) {
      var a = q.sem[k], b = q.com[k];
      h += '<tr class="sec"><td colspan="4">' + A[k] + (model.fin.alternativa === k ? ' · no plano' : '') + '</td></tr>' +
        (compacto ? '' : '<tr><td>Investimento (equipamentos, sala da RM, RIS e PACS)</td><td class="n">' + mi(a.capex) + '</td><td class="n">' + mi(b.capex) + '</td><td class="n">' + dl(b.capex - a.capex, mi, true) + '</td></tr>') +
        (k === 'D' ? '' : '<tr><td>Dívida nova</td><td class="n">' + mi(a.fin) + '</td><td class="n">' + mi(b.fin) + '</td><td class="n">' + dl(b.fin - a.fin, mi, true) + '</td></tr>') +
        '<tr><td>Desembolso próprio com investimento (ano 0 e RM)</td><td class="n">' + mi(a.ano0) + '</td><td class="n">' + mi(b.ano0) + '</td><td class="n">' + dl(b.ano0 - a.ano0, mi, true) + '</td></tr>' +
        (compacto ? '' : '<tr><td>' + (k === 'D' ? 'Aluguel' : 'Parcelas e manutenção') + ', média mensal no ano 3</td><td class="n">' + R(a.comp3) + '</td><td class="n">' + R(b.comp3) + '</td><td class="n">' + dl(b.comp3 - a.comp3, R, true) + '</td></tr>') +
        '<tr class="hl"><td>VPL para o hospital</td><td class="n">' + mi(a.vplEnt) + '</td><td class="n">' + mi(b.vplEnt) + '</td><td class="n">' + dl(b.vplEnt - a.vplEnt, mi) + '</td></tr>' +
        a.dscr.slice(0, compacto ? 2 : 3).map(function (d, i) { var e = b.dscr[i] || {}; return '<tr><td>DSCR do hospital em ' + d.ano + ', sem TDC</td><td class="n">' + X(d.v) + '</td><td class="n ' + (e.v != null && e.v < 1.3 ? 'neg' : '') + '">' + X(e.v) + '</td><td class="n">' + (d.v != null && e.v != null ? dl(e.v - d.v, function (x) { return N(x, 2); }) : '—') + '</td></tr>'; }).join('');
    });
    return h + '</tbody></table></div>';
  }
  function rmEquilibrioTxt(k) {
    var q = calc.cenRM; if (!q) return ''; var e = q.eq[k || 'C'], r = model.rm, cap = q.cap;
    return 'Na alternativa ' + (k || 'C') + ', a RM empata com o cenário sem RM com <b>' + (e.volume == null ? '—' : N(e.volume)) + ' exames/mês</b> de convênio e particular a ' + R(q.t0) + ' (' + (e.volume == null ? '—' : P(e.volume / cap.cap, 0)) + ' da capacidade de ' + N(cap.cap) + '/mês em ' + N(+r.horas_dia || 12) + ' h), ou com ticket de <b>' + R(e.ticket) + '</b> no volume de ' + N(q.v0) + '/mês. Só pelo preço, a RM teria de custar ' + mi(e.preco) + '. Cada exame/mês a mais vale ' + mi(e.porExame) + ' de VPL; cada R$ 100 mil a menos no preço, ' + mi(-e.porReal * 1e5) + '.';
  }
  function mediaMes(fl, t) { var a = fl.anos[t - 1]; return a ? a.desembolso / 12 : null; }
  function renderAlternativas() {
    var c = calc, m = model, B = c.B, C = c.C, D = c.D, fB = c.flB, fC = c.flC, fD = c.flD, e = c.cen.emg, pb = c.cen.propBase;
    var H = +m.fin.horizonte, EA = c.entAlt, sel = m.fin.alternativa;
    var lc = C.escolha ? C.escolha.linha : null, linhaC = lc ? lc.nome.split(' – ')[0].split(' / ')[0] : 'sem linha';
    var planoTxt = B.manut.plano === 'prata' ? 'Prata' : 'Ouro';
    var h = '<div class="card hero"><span class="eyebrow">Quatro caminhos, mesma receita</span><h2>Manter a EMG, comprar o pacote GE com o financiamento do fornecedor, comprar o pacote VMI com linha de fomento, ou alugar o pacote VMI</h2><p class="lead muted">B, C e D cobrem o mesmo perímetro (' + pacoteTxt() + '); C e D usam os preços VMI de 15/10/2026' + (rmOn() ? ' e, na RM, o preço de 19/10/2026' : '') + ' (' + mi(C.capex) + ', ' + Psig(C.capex / B.capex - 1, 1) + ' frente ao pacote GE de ' + mi(B.capex) + '), com o RX digital fixo (Apolo) no lugar do portátil com DR. Nas compras (B e C) entram as parcelas e o contrato de manutenção ' + planoTxt + ' depois de ' + m.manut.garantia_meses + ' meses de garantia; na locação (D) entra o aluguel ' + (locTxt().vmi ? 'da cotação VMI de 16/10/2026' : 'estimado por composição de custos') + (locTxt().sep ? ' mais o contrato de manutenção depois da garantia' : ', que já cobre a manutenção') + '. A alternativa levada ao Plano em números é a <b>' + sel + '</b>.</p></div>';
    function card(id, tit, cor, kv) { return '<div class="cmp' + (sel === id ? ' sel' : '') + '" style="--tc:' + cor + '"><b class="t">' + tit + '</b><div class="kv">' + kv.map(function (r) { return '<span>' + r[0] + '</span><b class="' + (r[2] || '') + '">' + r[1] + '</b>'; }).join('') + '</div></div>'; }
    var rmR = c.rm.reg ? c.rm.reg.ebitda : 0; /* RM em regime, antes da manutenção (cenário com RM) */
    var resB = pb.resultado + rmR - B.manut.mes - B.parcela, resC = pb.resultado + rmR - C.manut.mes - (C.parcela || 0), resD = pb.resultado + rmR - D.aluguel;
    h += '<div class="cmp3">' +
      card('A', 'A · Manter a EMG', 'var(--s-a)', [['Investimento', R(0)], ['Resultado mensal', R(e.resultado), 'neg'], ['Resultado anual', R(e.resultado * 12), 'neg'], ['Equipamentos', 'da EMG, ultrapassados'], ['Câmbio', 'nenhum'], ['Caixa em ' + H + ' anos', 'referência (zero)']]) +
      card('B', 'B · GE/CDK, compra, HFS 60x', 'var(--s-b)', [['Investimento', R(B.capex)], ['Financiado', R(B.capexFin) + ' (fornecedores)'], ['Prazo · carência', B.n + ' m · 0'], ['Custo implícito', Pp(B.cetAno) + ' a.a.'], ['Parcela', R(B.parcela) + '/mês'], ['Manutenção ' + planoTxt, R(B.manut.mes) + '/mês após a garantia'], ['Resultado mensal após parcela e manutenção', R(resB), sinal(resB)], ['Câmbio', calc.B.fx.ids.length ? 'US$ a ' + FXr(calc.B.fx.usd) + ' (' + (calc.B.fx.ids.length > 1 ? calc.B.fx.ids.length + ' itens' : 'TC') + ', parcelas ' + (calc.B.fx.dolar ? 'atreladas' : 'fixas') + ')' : 'nenhum'], ['VPL para o hospital', mi(fB.vplEnt)], ['Caixa acumulado em ' + H + ' anos', mi(fB.acumEnt)]]) +
      card('C', 'C · VMI, compra, ' + esc(linhaC), 'var(--s-c)', [['Investimento', R(C.capex)], ['Financiado', R(C.capexFin) + (lc ? ' (' + esc(lc.operador.split(/[ ,(]/)[0]) + ')' : '')], ['Prazo · carência', (C.n || '—') + ' m · ' + (C.c || 0)], ['CET', Pp(C.cetAno) + ' a.a.'], ['Parcela', R(C.primeira) + ' na carência · ' + R(C.parcela) + ' depois'], ['Manutenção ' + planoTxt, R(C.manut.mes) + '/mês após a garantia'], ['Resultado mensal após parcela e manutenção', R(resC), sinal(resC)], ['Câmbio', 'nenhum (preço em R$)'], ['VPL para o hospital', mi(fC.vplEnt)], ['Caixa acumulado em ' + H + ' anos', mi(fC.acumEnt)]]) +
      card('D', 'D · VMI, locação ' + D.n + ' meses', 'var(--s-d)', [['Investimento', R(0) + ' (só RIS e PACS' + (rmOn() ? ' e a sala da RM' : '') + ')'], ['Dívida nova', 'nenhuma'], [locTxt().sep ? 'Aluguel + manutenção' : 'Aluguel', R(D.aluguel) + '/mês desde a instalação'], ['Inclui', (locTxt().sep ? 'troca do equipamento a cada ' + D.n + ' meses; manutenção à parte (' + R(D.loc.manSep) + '/mês em média)' : 'manutenção total e troca do equipamento a cada ' + D.n + ' meses')], ['Custo ÷ valor do pacote', Pp(D.loc.pctMes * 100) + ' ao mês'], ['Base do aluguel', locTxt().vmi ? 'cotação VMI ' + R(D.loc.aluguelVmi) + (D.loc.nProxy ? ' + RM pelo proxy da TC ' + R(D.loc.aluguelProxy) : '') + ' + composição ' + R(D.loc.aluguelComp) : 'composição, taxa ' + Pp(D.loc.taxaAno * 100) + ' a.a.'], ['Resultado mensal após aluguel', R(resD), sinal(resD)], ['Câmbio', 'nenhum'], ['VPL para o hospital', mi(fD.vplEnt)], ['Caixa acumulado em ' + H + ' anos', mi(fD.acumEnt)]]) +
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
      (c.rm.on ? linha('EBITDA da RM em regime, antes da manutenção (R$/mês)', ['—', rmR, rmR, rmR], R, 0) : '') +
      linha('Equipamento no fim do horizonte', ['da EMG', 'próprio, com ' + H + ' anos (residual 0)', 'próprio, com ' + H + ' anos (residual 0)', 'do locador; trocado a cada ' + D.n + ' meses'], null) +
      linha('Risco de quebra e de tubo', ['EMG', planoTxt === 'Ouro' ? 'contrato Ouro' : 'hospital (Prata)', planoTxt === 'Ouro' ? 'contrato Ouro' : 'hospital (Prata)', locTxt().sep ? (planoTxt === 'Ouro' ? 'contrato Ouro (a confirmar com a VMI)' : 'hospital (Prata; a confirmar)') : 'locador'], null) +
      linha('Câmbio', ['—', (calc.B.fx.ids.length ? FX_ITENS_TXT[calc.B.fx.itens].replace(/^a /, '').replace(/^./, function (x) { return x.toUpperCase(); }) + ' em US$ a ' + FXr(calc.B.fx.usd) + ', parcelas ' + (calc.B.fx.dolar ? 'atreladas ao dólar' : 'fixas em R$') : 'nenhum item em US$') + '; peças importadas', 'não', 'não'], null) +
      '</tbody></table></div><p class="small muted" style="margin-top:8px">DSCR na coluna A: o hospital sem o projeto. Na locação o aluguel reduz o EBITDA e não entra como dívida; sob CPC 06 (R2)/IFRS 16 vira passivo de arrendamento, e agentes costumam olhar o EBITDAR. O modelo supõe renovação da locação ao mesmo aluguel, com equipamento novo, até o fim do horizonte.</p></div>';
    var cats = fB.anos.map(function (a) { return String(a.ano); });
    h += '<div class="grid two"><div class="card"><div class="card-h"><h2>Caixa acumulado para o hospital</h2><span class="muted small">ganho operacional menos parcelas, manutenção ou aluguel, vs. manter a EMG</span></div><div class="chart">' + svgLines({ cats: cats, series: [{ nome: 'B · GE/HFS', vals: fB.anos.map(function (a) { return a.acumE; }), cor: 'var(--s-b)' }, { nome: 'C · VMI compra', vals: fC.anos.map(function (a) { return a.acumE; }), cor: 'var(--s-c)' }, { nome: 'D · VMI locação', vals: fD.anos.map(function (a) { return a.acumE; }), cor: 'var(--s-d)' }], fmt: function (v) { return mi(v); }, h: 250, aria: 'Caixa acumulado por alternativa' }) + '</div></div>' +
      '<div class="card"><div class="card-h"><h2>Desembolso anual com os equipamentos</h2><span class="muted small">parcelas + manutenção (B, C) ou aluguel (D)</span></div><div class="chart">' + svgBars({ cats: cats, series: [{ nome: 'B · GE/HFS', vals: fB.anos.map(function (a) { return a.desembolso; }), cor: 'var(--s-b)' }, { nome: 'C · VMI compra', vals: fC.anos.map(function (a) { return a.desembolso; }), cor: 'var(--s-c)' }, { nome: 'D · VMI locação', vals: fD.anos.map(function (a) { return a.desembolso; }), cor: 'var(--s-d)' }], fmt: function (v) { return mi(v); }, h: 250, aria: 'Desembolso anual' }) + '</div></div></div>';
    h += cardCambio();
    h += cardRM();
    /* leitura */
    var difCD = fC.vplEnt - fD.vplEnt, p60 = (c.prazosD || []).filter(function (x) { return x.n === D.n; })[0];
    var ctrl = MANUT_CTRL, rxOuro = C.manut.porItem.filter(function (x) { return x.id === 'rxp' || x.id === 'rxdr'; }).reduce(function (a, x) { return a + x.ouro; }, 0);
    h += '<div class="card"><div class="card-h"><h2>Leitura</h2></div><ul class="bullets">' +
      (c.cenRM ? '<li><b>Ressonância</b>: com as hipóteses atuais, a RM reduz o VPL para o hospital em ' + mi(-c.cenRM.eq.B.delta) + ' (B), ' + mi(-c.cenRM.eq.C.delta) + ' (C) e ' + mi(-c.cenRM.eq.D.delta) + ' (D). ' + (rmOn() ? 'Com a RM, a compra financiada (C) fica com a melhor cobertura da dívida nos primeiros anos, porque a carência de 24 meses e o prazo de 120 absorvem a parcela da RM; na locação, o aluguel da RM corre desde a instalação.' : '') + '</li>' : '') +
      '<li>Qualquer forma de internalizar supera manter a EMG: VPL para o hospital de ' + mi(fB.vplEnt) + ' (B), ' + mi(fC.vplEnt) + ' (C) e ' + mi(fD.vplEnt) + ' (D), porque o hospital já paga a estrutura.</li>' +
      (difCD >= 0 ? '<li><b>Comprar com linha de fomento (C) rende mais que alugar (D)</b>: ' + mi(difCD) + ' de VPL em ' + H + ' anos. O custo da locação' : '<li><b>Alugar (D) rende mais que comprar com linha de fomento (C)</b>: ' + mi(-difCD) + ' de VPL em ' + H + ' anos. O custo da locação') + ' de ' + R(D.aluguel) + '/mês (' + Pp(D.loc.pctMes * 100) + ' do valor ao mês' + (locTxt().vmi ? ', cotação VMI' + (locTxt().sep ? ' + manutenção à parte' : '') : '') + ') começa a correr na instalação, sem a carência de que a compra se beneficia' + (locTxt().vmi ? locTxt().taxas : ', e embute a taxa do locador de ' + Pp(D.loc.taxaAno * 100) + ' a.a., acima do custo da linha de fomento (' + Pp(C.cetAno) + ' a.a.)') + (D.equilibrioC >= D.aluguel ? '. A locação tem folga de <b>' + R(D.equilibrioC - D.aluguel) + '/mês</b> até o aluguel de equilíbrio com C (' + R(D.equilibrioC) + '/mês): é a margem para a cotação dos itens ainda estimados' + (D.loc.semCotacao.length ? ' (' + R(D.loc.aluguelComp) + '/mês hoje)' : '') + '.</li>' : '. Para empatar com C, o aluguel precisa ficar em <b>' + R(D.equilibrioC) + '/mês</b> (' + Psig(D.equilibrioC / D.aluguel - 1, 0) + ')' + (p60 ? '; no prazo de ' + D.n + ' meses, sem contar renovações, o empate é em ' + R(p60.equilibrio) + '/mês' : '') + '. É o número para negociar com a VMI.</li>') +
      '<li><b>O que a locação compra</b>: nenhum desembolso inicial nem dívida bancária nova antes do TDC, ' + (locTxt().sep ? 'risco de obsolescência com o locador (a manutenção, pela cotação, segue com o hospital: confirmar com a VMI)' : 'manutenção e risco do equipamento com o locador') + ', troca por equipamento novo a cada ' + D.n + ' meses (B e C chegam ao ano ' + H + ' com o equipamento original). Se o banco não aprovar a compra antes da desalavancagem, D não depende de linha bancária: o locador também analisa o crédito do hospital, mas fica com o equipamento como garantia.</li>' +
      '<li><b>Manutenção</b>: no plano ' + planoTxt + ', ' + R(C.manut.mes) + '/mês (C) e ' + R(B.manut.mes) + '/mês (B) a partir do ' + (+m.manut.garantia_meses + 1) + 'º mês de operação, contra ' + R(ctrl) + '/mês na planilha da Controladoria. A diferença vem dos dois RX: a cotação VMI (' + R(rxOuro) + '/mês no Ouro) é ' + N(rxOuro / 7037.5, 1) + ' vezes o que a planilha previa para ultrassom e RX juntos (R$ 7.038/mês). B e C ficam quase iguais porque, sem cotação da CDK, o RX do pacote GE usa a mesma referência.</li>' +
      (function () {
        var it = function (k, id) { return m.equip[k].filter(function (x) { return x.id === id; })[0] || {}; }, bx = it('B', 'rxdr'), cx = it('C', 'rxdr');
        var vb = (+bx.qtd || 0) * (+bx.preco || 0), vc = (+cx.qtd || 0) * (+cx.preco || 0), dTot = B.capex - C.capex, dRx = vb - vc;
        return '<li><b>Preço</b>: o pacote VMI sai por ' + mi(C.capex) + ' contra ' + mi(B.capex) + ' do GE (' + Psig(C.capex / B.capex - 1, 1) + ').' + (Math.abs(dTot) > 1 ? ' Do diferencial de ' + mi(dTot) + ', ' + mi(dRx) + ' vêm do RX digital: ' + esc(cx.modelo || '') + ', de ' + mi(vc) + ', no lugar do item GE “' + esc(bx.nome || '') + '”, de ' + mi(vb) + '.' : '') + ' O Apolo é fixo (sala) e o item do pacote GE é portátil (leito); se o hospital precisar do portátil, o Aquila 500 D volta ao pacote e a vantagem de preço diminui.</li>';
      })() +
      '<li>Entre B e C a diferença segue no financiamento: ' + Pp(B.cetAno) + ' a.a. em 60 meses, com ' + FX_ITENS_TXT[calc.B.fx.itens] + ' em dólar a ' + FXr(calc.B.fx.usd) + ', contra ' + Pp(C.cetAno) + ' a.a. em ' + (C.n || '—') + ' meses em reais' + (lc && lc.iof === 'zero' ? ', sem IOF' : '') + '. A Pulsar entra no FINAME com o CFI previsto para dez/2026 (premissa VMI); até a publicação, é condição suspensiva da contratação.</li></ul></div>';
    $('#tab-alternativas').innerHTML = h;
    bindRmSeg('segRmAlt'); bindCambio();
  }

  /* ---------- Ressonância: com × sem, DRE e equilíbrio ---------- */
  function cardRM() {
    var c = calc, m = model, q = c.cenRM, r = m.rm; if (!q) return '';
    var on = rmOn(), reg = E.rmMensal(m, 2, 1), cap = q.cap, e = q.eq, it = rmItem('C') || {}, man = (+it.m_ouro || 0) * (+it.qtd || 1) * (m.propria.manut_fator == null ? 1 : +m.propria.manut_fator);
    var h = '<div class="card hero"><span class="eyebrow">Ressonância magnética · Cignus 600 sem hélio, 24 canais</span><h2>' + (e.C.delta >= 0 ? 'Com as hipóteses atuais, a RM soma ' + mi(e.C.delta) + ' ao VPL da compra C' : 'Com as hipóteses atuais, a RM tira ' + mi(-e.C.delta) + ' do VPL da compra C: ela se paga com ' + N(e.C.volume) + ' exames/mês') + '</h2><p class="lead muted">Serviço novo: a EMG não faz RM, então receita e custo da RM são inteiramente incrementais. Equipamento de ' + mi(+it.preco || 0) + ' (informado em 19/10/2026) e ' + mi(+r.obra || 0) + ' para a sala (CEO, 20/10) nas três formas de pagar; aprovação em ' + fmtMes(r.aprovacao) + ', operação a partir de ' + fmtMes(E.mesRMStr(model)) + '; ' + N(r.exames_mes) + ' exames/mês em regime a ' + R(r.ticket) + ' (sem SUS, que fica fora do modelo). A página está no cenário <b>' + (on ? 'com RM' : 'sem RM') + '</b>; o quadro mostra os dois.</p><div class="row" style="margin-top:8px">' + rmSegHtml('segRmAlt') + '</div></div>';
    h += '<div class="grid two"><div class="card"><div class="card-h"><h2>Com e sem RM, por forma de pagar</h2><span class="muted small">' + m.fin.horizonte + ' anos a ' + P(m.fin.desconto, 0) + ' a.a.</span></div>' + rmTabela(['B', 'C', 'D'], false) + '<p class="small muted" style="margin-top:8px">B: sem proposta GE de RM, mesmo preço em 60 parcelas à taxa implícita do HFS (' + R(((c.B.implic || []).filter(function (x) { return x.id === 'rm'; })[0] || {}).parcelaAuto) + '/mês). C: RM num segundo contrato na mesma linha do pacote, liberado na entrega. D: aluguel da RM pela razão aluguel ÷ preço da TC Pulsar na tabela VMI (sem cotação da RM). Nas três, a sala (' + mi(+m.rm.obra || 0) + ') sai do caixa depois da aprovação, em ' + fmtMes(m.rm.aprovacao) + ', e a RM opera a partir de ' + fmtMes(E.mesRMStr(m)) + '.</p></div>';
    h += '<div class="card"><div class="card-h"><h2>DRE mensal da RM em regime</h2><span class="muted small">preços do ano 2, volume de regime</span></div><div class="tbl-wrap"><table><thead><tr><th>R$/mês</th><th class="n">Valor</th><th class="n">% RL</th></tr></thead><tbody>' +
      [['Exames (convênio e particular' + (reg.exSus ? ' + SUS' : '') + ')', null, '', N(reg.exames)], ['Receita bruta', reg.rb], ['(−) Glosas', -reg.glosa, 'sub'], ['Receita líquida', reg.rl, 'total'], ['(−) Contraste e material', -reg.matmed], ['(−) Laudo médico', -reg.laudo], ['Margem de contribuição', reg.mc, 'total'], ['(−) Equipe técnica e enfermagem', -reg.equipe], ['(−) Energia e climatização', -reg.energia], ['(−) Outros fixos', -reg.outros], ['EBITDA antes da manutenção', reg.ebitda, 'total'], ['(−) Manutenção Ouro após a garantia (B e C)', -man], ['EBITDA após a manutenção', reg.ebitda - man, 'total hl']].map(function (x) { return '<tr class="' + (x[2] || '') + '"><td>' + x[0] + '</td><td class="n">' + (x[3] != null ? x[3] : R(x[1])) + '</td><td class="n">' + (x[1] != null && reg.rl ? P(x[1] / reg.rl, 1) : '') + '</td></tr>'; }).join('') +
      '</tbody></table></div><p class="small muted" style="margin-top:8px">Capacidade: 2 exames/h × ' + N(+r.horas_dia || 12) + ' h × 26 dias = ' + N(cap.cap) + '/mês; o volume de regime ocupa ' + P(cap.ocup, 0) + '.' + (cap.ocup > 0.9 ? ' <b class="neg">Acima de 90%: estender o horário.</b>' : '') + ' Na locação (D), a manutenção está no aluguel.</p></div></div>';
    /* equilíbrio */
    var vs = [Math.round(q.v0 * 0.75), q.v0, Math.round(q.v0 * 1.25), Math.round(cap.cap)], ps = [4329000, 4900000, q.p0];
    var grid = function (k) { return '<table><thead><tr><th>Exames/mês ↓ · preço →</th>' + ps.map(function (p) { return '<th class="n">' + mi(p) + '</th>'; }).join('') + '</tr></thead><tbody>' + vs.map(function (v) { return '<tr><td>' + N(v) + (v === q.v0 ? ' (premissa)' : v === Math.round(cap.cap) ? ' (capacidade)' : '') + '</td>' + ps.map(function (p) { var d = e[k].delta + e[k].porExame * (v - q.v0) + e[k].porReal * (p - q.p0); return '<td class="n ' + sinal(d) + '">' + (d >= 0 ? '+' : '−') + mi(Math.abs(d)).replace('−', '') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>'; };
    h += '<div class="grid two"><div class="card"><div class="card-h"><h2>Quando a RM se paga</h2><span class="muted small">VPL para o hospital, com RM menos sem RM</span></div><div class="grid kpis">' +
      kpi('Volume de equilíbrio (C)', N(e.C.volume) + '/mês', P(e.C.volume / cap.cap, 0) + ' da capacidade · B ' + N(e.B.volume) + ' · D ' + N(e.D.volume), e.C.volume > cap.cap ? 'bad' : 'warn', true) +
      kpi('Ticket de equilíbrio (C)', R(e.C.ticket), 'com ' + N(q.v0) + ' exames/mês · B ' + R(e.B.ticket) + ' · D ' + R(e.D.ticket), '', true) +
      kpi('Preço de equilíbrio (C)', mi(e.C.preco), 'mantidos volume e ticket', '', true) +
      kpi('RM isolada, sem financiamento', mi(c.rm.isolada ? c.rm.isolada.vpl : null), c.rm.isolada ? 'TIR ' + (c.rm.isolada.tir == null ? '—' : P(c.rm.isolada.tir, 1)) + ' · payback ' + anos(c.rm.isolada.pb) : 'cenário sem RM', '', true) + '</div>' +
      '<div class="tbl-wrap" style="margin-top:12px">' + grid(m.fin.alternativa) + '</div><p class="small muted" style="margin-top:8px">Diferença de VPL para o hospital na alternativa ' + m.fin.alternativa + ' (com RM − sem RM) por volume em regime e preço da RM, mantidos ticket, custos e manutenção. Preços de referência: R$ 4,33 mi (contrato FINAME da CEMAN), R$ 4,9 mi (pregões de Goiás, 2024–25) e o preço informado.</p></div>';
    h += '<div class="card"><div class="card-h"><h2>Leitura</h2></div><ul class="bullets">' +
      '<li><b>A RM é um negócio de volume.</b> Os custos fixos (equipe, energia, manutenção, ' + R(reg.fixos + man) + '/mês) e o investimento (' + mi((+it.preco || 0) + (+r.obra || 0)) + ') não mudam com o número de exames; cada exame a mais deixa ' + R(reg.mc / (reg.exames || 1)) + ' de margem. ' + rmEquilibrioTxt('C') + '</li>' +
      '<li><b>Forma de pagar.</b> Com a RM, ' + (function () { var o = ['B', 'C', 'D'].sort(function (a, b) { return q.com[b].vplEnt - q.com[a].vplEnt; }); return o[0] + ' tem o maior VPL para o hospital (' + mi(q.com[o[0]].vplEnt) + '), seguida de ' + o[1] + ' (' + mi(q.com[o[1]].vplEnt) + ') e ' + o[2] + ' (' + mi(q.com[o[2]].vplEnt) + ')'; })() + '. A compra pelo FINAME (C) é a que menos pesa na cobertura: ' + X(q.com.C.dscr[0].v) + ' em ' + q.com.C.dscr[0].ano + ' e ' + X(q.com.C.dscr[1].v) + ' em ' + q.com.C.dscr[1].ano + ', contra ' + X(q.com.B.dscr[0].v) + ' e ' + X(q.com.B.dscr[1].v) + ' no HFS em 60 meses (B), porque a carência de 24 meses cobre a rampa da RM.</li>' +
      '<li><b>O que faz a RM fechar</b>: volume de convênio (depende da volta da RM aos pacotes dos planos); preço mais perto das referências; horário estendido; laudo por telerradiologia; e o SUS. ' + (c.cenSUS ? (E.susAteOn(m) ? 'Com a chave do SUS em "+ Agora Tem Especialistas", ' + N((m.sus || {}).rm_mes) + ' RMs/mês pelo programa (R$ ' + NF2.format(+(m.sus || {}).rm_valor || 0) + ' por exame) já estão no número e valem ' + mi(c.cenSUS.vplRMsus) + ' de VPL' : 'O SUS está fora do caso-base por decisão do CEO, mas ' + N((m.sus || {}).rm_mes) + ' RMs/mês pelo Agora Tem Especialistas (R$ ' + NF2.format(+(m.sus || {}).rm_valor || 0) + ' por exame) valeriam ' + mi(c.cenSUS.vplRMsus) + ' de VPL e mudariam o sinal da RM (chave "SUS no modelo", na Tese)') : 'o SUS pode ocupar a agenda ociosa') + '. Volume, ticket e preço podem ser testados no Simulador.</li>' +
      '<li><b>Condição do lado do HDA</b>: os planos de saúde tiraram recentemente a RM dos pacotes de reembolso com o hospital. Sem negociar a volta da RM a esses pacotes, o volume de convênio deste cenário não existe; é a primeira pendência da RM.</li>' +
      '<li><b>Antes de decidir</b>: demanda real (RMs pedidas hoje para fora pelo PS, internação e ambulatório), ticket dos três maiores convênios, cotação de manutenção e de locação da RM pela VMI, projeto de pré-instalação (área, gaiola de RF, elétrica) e se o CFI 04252454 cobre a versão sem hélio. A internalização do serviço atual se paga sem a RM; vale tratá-la como gate separado.</li></ul></div></div>';
    /* RM ano a ano (C) */
    var fl = c.rm.isolada;
    if (fl) h += '<div class="card"><div class="card-h"><h2>RM ano a ano</h2><span class="muted small">só a RM, compra (preço do pacote C), sem financiamento · R$ nominais</span></div><div class="tbl-wrap"><table><thead><tr><th></th>' + fl.anos.map(function (a) { return '<th class="n">' + a.ano + '</th>'; }).join('') + '</tr></thead><tbody>' +
      [['Meses de operação', function (a) { return N(a.rm.meses); }, 'sub'], ['Volume (% do regime)', function (a) { return P(a.rm.rampa, 0); }, 'sub'], ['Exames', function (a) { return N(a.rm.exames); }], ['Receita líquida', function (a) { return R(a.rm.rl); }], ['(−) Laudo, contraste e material', function (a) { return R(-(a.rm.laudo + a.rm.matmed)); }], ['(−) Custos fixos', function (a) { return R(-a.rm.fixos); }], ['(−) PACS por exame', function (a) { return R(-a.rm.pacs); }], ['EBITDA da RM', function (a) { return R(a.rm.ebitda); }, 'total'], ['(−) Manutenção após a garantia', function (a) { return R(-a.manut); }], ['(−) Investimento: sala e equipamento', function (a) { return R(-a.inv); }]].map(function (x) { return '<tr class="' + (x[2] || '') + '"><td>' + x[0] + '</td>' + fl.anos.map(function (a) { return '<td class="n">' + x[1](a) + '</td>'; }).join('') + '</tr>'; }).join('') +
      '<tr class="total hl"><td>Fluxo da RM</td>' + fl.anos.map(function (a) { return '<td class="n">' + R(a.fc) + '</td>'; }).join('') + '</tr></tbody></table></div><p class="small muted" style="margin-top:8px">Sala (' + mi(fl.inv - fl.equip) + ') em ' + (m.fin.ano_inicio + E.anoRM(m) - 1) + ', depois da aprovação em ' + fmtMes(m.rm.aprovacao) + '; equipamento (' + mi(fl.equip) + ') na entrega, em ' + (m.fin.ano_inicio + E.anoEqRM(m) - 1) + '; operação a partir de ' + fmtMes(E.mesRMStr(m)) + '. VPL ' + mi(fl.vpl) + ' a ' + P(m.fin.desconto, 0) + ' a.a.; residual zero no fim do horizonte, como no resto do modelo.</p></div>';
    return h;
  }

  /* ================= PLANO EM NÚMEROS ================= */
  function renderNumeros() {
    var c = calc, m = model, fl = c.flSel, sel = c.sel, isD = sel.id === 'D';
    var cats = fl.anos.map(function (a) { return String(a.ano); });
    var rotOpex = isD ? (locTxt().sep ? '(−) Aluguel dos equipamentos e manutenção à parte' : '(−) Aluguel dos equipamentos (manutenção inclusa)') : '(−) Manutenção pós-garantia, plano ' + (sel.manut.plano === 'prata' ? 'Prata' : 'Ouro');
    var eyebrow = 'Alternativa ' + sel.id + ' · ' + (sel.id === 'C' ? 'VMI, compra · ' + (c.C.escolha ? esc(c.C.escolha.linha.nome) : '') : sel.id === 'B' ? 'GE/HFS 60x' : 'VMI, locação de ' + sel.n + ' meses a ' + R(sel.aluguel) + '/mês');
    var h = '<div class="card hero"><span class="eyebrow">' + eyebrow + '</span><h2>Fluxo de caixa incremental: imagem própria menos manter a EMG, ' + m.fin.horizonte + ' anos a partir de ' + m.fin.ano_inicio + '</h2><p class="lead muted">Ano 1 com ' + m.fin.inicio_op_mes + ' meses de transição. ' + (isD ? 'O aluguel corre desde a instalação e é renovado ao mesmo valor, com equipamento novo, a cada ' + sel.n + ' meses.' : 'A manutenção começa depois de ' + m.manut.garantia_meses + ' meses de garantia, contados da instalação.') + ' ' + ((m.cenario.reajuste_modo || 'ipca') === 'ipca' ? 'Valores nominais: receita, custos, manutenção e aluguel corrigidos pelo IPCA projetado (Focus: ' + P(E.ipcaAno(m, 2), 2) + ' no ano 2, ' + P(E.ipcaAno(m, 3), 2) + ' a partir do ano 3), o mesmo que corrige as parcelas do FINAME' : +m.cenario.reajuste_aa ? 'Reajuste fixo de ' + P(m.cenario.reajuste_aa, 1) + ' a.a. em receita, custos, manutenção e aluguel' : 'Valores constantes, como na planilha da Controladoria') + '; volume ' + (m.cenario.volume_var >= 0 ? '+' : '') + P(m.cenario.volume_var, 0) + ' sobre a base e crescimento de ' + P(m.cenario.cresc_aa, 1) + ' a.a. a partir do ano 2.</p></div>';
    h += '<div class="grid kpis">' + kpi('VPL do projeto', '<span class="' + sinal(fl.vpl) + '">' + mi(fl.vpl) + '</span>', 'a ' + P(m.fin.desconto, 0) + ' a.a.' + (isD ? ' · na locação é igual ao do hospital' : ''), fl.vpl > 0 ? 'good' : 'bad') + kpi('TIR', isD || fl.tir == null ? '—' : P(fl.tir, 1), isD ? 'sem investimento relevante (só RIS e PACS)' : 'do projeto, sem dívida') + kpi('Payback', isD ? 'imediato' : anos(fl.pb), isD ? 'sem investimento em equipamentos' : 'descontado ' + anos(fl.pbDesc)) + kpi('Índice de retorno', isD ? '—' : X(fl.ir), isD ? 'não se aplica à locação' : 'VP das entradas ÷ investimento') + kpi('VPL para o hospital', mi(fl.vplEnt), isD ? 'após o aluguel' : 'após parcelas; TIR ' + (fl.tirEnt == null ? '—' : P(fl.tirEnt, 0))) + kpi('Caixa acumulado', mi(fl.acumEnt), (isD ? 'após o aluguel, ' : 'após parcelas, ') + m.fin.horizonte + ' anos') + '</div>';
    h += '<div class="card"><div class="card-h"><h2>Ganho operacional, ' + (isD ? 'aluguel' : 'manutenção, parcelas') + ' e caixa</h2><span class="muted small">R$ por ano</span></div><div class="chart">' + svgBars({ cats: cats, series: [{ nome: 'Ganho antes de ' + (isD ? 'aluguel' : 'manutenção'), vals: fl.anos.map(function (a) { return a.incBase; }), cor: 'var(--s-d)' }, { nome: isD ? 'Aluguel' : 'Manutenção', vals: fl.anos.map(function (a) { return -a.opex; }), cor: 'var(--s-a)' }, { nome: 'Parcelas', vals: fl.anos.map(function (a) { return -a.servico; }), cor: 'var(--s-b)' }, { nome: 'Caixa para o hospital', vals: fl.anos.map(function (a) { return a.fce; }), cor: 'var(--s-c)' }], fmt: function (v) { return mi(v); }, h: 260, aria: 'Fluxo anual' }) + '</div></div>';
    function tr(l, f, cls) { return '<tr class="' + (cls || '') + '"><td>' + l + '</td><td class="n"></td>' + fl.anos.map(function (a) { return '<td class="n">' + f(a) + '</td>'; }).join('') + '</tr>'; }
    h += '<div class="card"><div class="card-h"><h2>Fluxo de caixa incremental</h2><span class="muted small">R$, nominal</span></div><div class="tbl-wrap"><table><thead><tr><th></th><th class="n">Ano 0</th>' + fl.anos.map(function (a) { return '<th class="n">' + a.ano + '</th>'; }).join('') + '</tr></thead><tbody>' +
      tr('Fator de volume', function (a) { return N(a.fator, 2); }, 'sub') + tr('Fração do ano em operação própria', function (a) { return P(a.frac, 0); }, 'sub') +
      tr('Receita líquida', function (a) { return R(a.rl); }) + tr('EBITDA com a EMG (status quo), 12 meses', function (a) { return R(a.ebitdaEmg); }) + tr('EBITDA imagem própria antes de manutenção e aluguel, 12 meses', function (a) { return R(a.ebitdaPropBase); }) +
      tr('Diferença × fração do ano', function (a) { return R(a.incBase); }) + (c.rm.on ? tr('(+) EBITDA da ressonância (serviço novo), antes da manutenção', function (a) { return R(a.rmEbitda); }) : '') + tr(rotOpex + (c.rm.on ? ', com a RM' : ''), function (a) { return R(-a.opex); }) +
      tr('EBITDA incremental', function (a) { return R(a.inc); }, 'total') + tr('(−) Depreciação', function (a) { return R(-a.dep); }, 'sub') + tr('(−) Tributos', function (a) { return R(-a.trib); }, 'sub') +
      '<tr><td>(−) Investimento' + (c.rm.on && fl.capexRM ? ' (RM: sala na aprovação, equipamento na entrega)' : '') + '</td><td class="n">' + R(-fl.capex0) + '</td>' + fl.anos.map(function (a) { return '<td class="n">' + (a.invRM ? R(-a.invRM) : '') + '</td>'; }).join('') + '</tr>' +
      tr('(+) Valor residual', function (a) { return R(a.residual); }, 'sub') +
      '<tr class="total"><td>Fluxo de caixa livre do projeto</td><td class="n">' + R(fl.proj[0]) + '</td>' + fl.anos.map(function (a) { return '<td class="n">' + R(a.fcp) + '</td>'; }).join('') + '</tr>' +
      tr('Acumulado', function (a) { return R(a.acumP); }, 'sub') +
      '<tr class="sec"><td colspan="' + (fl.anos.length + 2) + '">' + (isD ? 'Locação: sem financiamento, o aluguel já está no EBITDA' : 'Com financiamento (alternativa ' + sel.id + ')') + '</td></tr>' +
      (fl.anos.some(function (a) { return Math.abs((a.invRM || 0) - (a.invRMHosp || 0)) > 1; }) ? tr('(+) Financiamento da RM liberado, líquido de custos iniciais', function (a) { var v = (a.invRM || 0) - (a.invRMHosp || 0); return Math.abs(v) > 1 ? R(v) : ''; }) : '') +
      tr('(−) Parcelas', function (a) { return R(-a.servico); }) + (sel.id === 'C' ? tr('    das quais juros', function (a) { return R(-a.juros); }, 'sub') : '') +
      '<tr class="total hl"><td>Caixa para o hospital</td><td class="n">' + R(fl.ent[0]) + '</td>' + fl.anos.map(function (a) { return '<td class="n">' + R(a.fce) + '</td>'; }).join('') + '</tr>' +
      tr('Acumulado', function (a) { return R(a.acumE); }, 'sub') + tr('DSCR do projeto', function (a) { return X(a.dscr); }, 'sub') +
      '</tbody></table></div><p class="small muted" style="margin-top:8px">' + (isD ? 'Ano 0: só a implantação do RIS (Touch Health) e do PACS (Sectra).' : 'Ano 0 com financiamento: parte não financiada (RIS e PACS' + (sel.id === 'C' && (sel.capexFin - (sel.capexFinRM || 0)) < (sel.capex - (sel.capexRM || 0)) ? ' e ' + P(1 - (sel.capexFin - (sel.capexFinRM || 0)) / ((sel.capex - (sel.capexRM || 0)) || 1), 0) + ' do pacote' : '') + ') e custos iniciais (IOF, tarifa' + (sel.id === 'C' && sel.honorPacote ? ', honorário da S&S de ' + R(sel.honorPacote) : '') + '). A Controladoria zera o ano 0 porque considera 100% financiado.') + (c.rm.on && fl.capexRM ? ' RM: sala (' + mi(fl.obra) + ') em ' + (+m.fin.ano_inicio + fl.tRM - 1) + ', depois da aprovação em ' + fmtMes(m.rm.aprovacao) + '; equipamento (' + mi(fl.capexRM - fl.obra) + ') na entrega, em ' + (+m.fin.ano_inicio + fl.tEqRM - 1) + (isD ? '' : ', financiado em contrato próprio liberado na entrega' + (sel.id === 'C' && sel.honorRM ? ' (honorário da S&S de ' + R(sel.honorRM) + ')' : '')) + '; operação a partir de ' + fmtMes(E.mesRMStr(m)) + '.' : '') + ' ' + (isD ? 'Aluguel por ano = aluguel mensal × meses de operação × reajuste' + (c.rm.on ? ' (a RM, desde a instalação, em ' + fmtMes(E.mesRMStr(m)) + ')' : '') + '.' : 'Manutenção por ano = contrato mensal × meses após a garantia × reajuste (ano 1: zero; ano 2: ' + E.mesesAno(m, 2, m.manut.garantia_meses) + ' meses' + (c.rm.on ? '; na RM, a partir de ' + fmtMes(mesIdxStr(E.iniRM(m) + (+m.manut.garantia_meses || 0))) : '') + ').') + '</p></div>';
    /* DRE anual em regime */
    var a2 = c.cen.prop;
    h += '<div class="card"><div class="card-h"><h2>DRE anual da imagem própria em regime</h2><span class="muted small">12 meses, ' + (isD ? 'com aluguel' : 'após a garantia') + ', volume do cenário</span></div><div class="tbl-wrap"><table><thead><tr><th></th><th class="n">R$/ano</th><th class="n">% RL</th></tr></thead><tbody>' +
      [['Receita bruta', a2.rb], ['(−) Glosas', -a2.glosa], ['Receita líquida', a2.rl, 'total'], ['(−) Mat/Med', -a2.matmed], ['(−) Repasse médico', -a2.rep_med], ['(−) Outros repasses mantidos', -(a2.rep_mat + a2.rep_bio + a2.rep_sala)], ['Margem de contribuição', a2.mc, 'total'], ['(−) Custos fixos diretos', -a2.cf_dir], isD ? [locTxt().sep ? '(−) Aluguel e manutenção dos equipamentos' : '(−) Aluguel dos equipamentos', -a2.aluguel] : ['(−) Manutenção pós-garantia', -a2.manut], ['(−) RIS (Touch Health)', -a2.ris], ['(−) PACS Sectra, por exame' + (pacsOn() ? '' : ' (fora do modelo)'), -a2.pacs], ['(−) Custos indiretos', -a2.cf_ind], ['EBITDA', a2.resultado, 'total hl']].map(function (r) { return '<tr class="' + (r[2] || '') + '"><td>' + r[0] + '</td><td class="n">' + R(r[1] * 12) + '</td><td class="n">' + P(r[1] / a2.rl, 1) + '</td></tr>'; }).join('') + '</tbody></table></div>' + (c.rm.on && c.rm.reg ? '<p class="small muted" style="margin-top:8px">Sem a ressonância, que tem DRE própria em Alternativas: em regime, ' + R(c.rm.reg.rl * 12) + '/ano de receita líquida e ' + R(c.rm.reg.ebitda * 12) + '/ano de EBITDA antes da manutenção' + (isD ? ' (o aluguel da RM está na linha de aluguel acima)' : ' (a manutenção da RM está na linha de manutenção acima)') + '.</p>' : '') + '</div>';
    $('#tab-numeros').innerHTML = h;
  }

  /* ================= INVESTIMENTO E FINANCIAMENTO ================= */
  function equipTable(key) {
    var itens = model.equip[key], isB = key === 'B', cx = E.capexDe(itens), mt = calc[key].manut, fxm = isB ? E.fxB(model) : null;
    var fxNota = function (it, v) { return isB && E.emDolar(fxm, it) && Math.abs(fxm.f - 1) > 1e-9 ? '<div class="tiny muted">' + R(v * fxm.f) + ' a ' + FXr(fxm.usd) + '</div>' : ''; };
    var h = '<div class="tbl-wrap"><table class="ge"><thead><tr><th>Item</th><th>Modelo</th><th class="n">Qtd</th><th class="n">Preço unit. (R$)</th>' + (isB ? '<th class="n">Parcela unit. (R$)</th><th class="n">Taxa implícita</th>' : '<th>CFI</th>') + '<th>Financiável</th><th class="n">Manut. Prata (R$/mês/un.)</th><th class="n">Manut. Ouro (R$/mês/un.)</th><th>Observação</th><th></th></tr></thead><tbody>';
    itens.forEach(function (it, i) {
      var imp = isB ? calc.B.implic[i] : null, ehRM = E.isRM(it), fora = ehRM && !rmOn(), auto = isB && imp && imp.parcelaAuto != null;
      h += '<tr' + (fora ? ' class="muted" title="Fora do cálculo no cenário sem RM"' : '') + '><td><input class="w-m" data-eq="' + key + '.' + i + '.nome" value="' + esc(it.nome) + '">' + (ehRM ? '<div class="tiny"><span class="pill ' + (fora ? '' : 'info') + '">' + (fora ? 'fora do cenário (sem RM)' : 'cenário com RM') + '</span></div>' : '') + '</td><td><input class="w-m" data-eq="' + key + '.' + i + '.modelo" value="' + esc(it.modelo) + '"></td><td class="n"><input class="n w-s" data-eq="' + key + '.' + i + '.qtd" value="' + esc(it.qtd) + '"></td><td class="n"><input class="n" data-eq="' + key + '.' + i + '.preco" value="' + esc(NF2.format(it.preco)) + '">' + (isB && E.emDolar(fxm, it) ? '<div class="tiny muted">US$ ' + NF0.format(Math.round((+it.preco || 0) / fxm.ref)) + ' a ' + FXr(fxm.ref) + '</div>' : '') + fxNota(it, +it.preco || 0) + '</td>' +
        (isB ? '<td class="n"><input class="n" data-eq="' + key + '.' + i + '.parcela" value="' + (auto ? '' : esc(NF2.format(it.parcela || 0))) + '"' + (auto ? ' placeholder="' + esc(NF2.format(imp.parcelaAuto)) + '" title="Calculada à taxa implícita dos demais itens; digite um valor para fixar"' : '') + '>' + (auto ? '<div class="tiny muted">calculada' + (E.emDolar(fxm, it) ? ' a ' + FXr(fxm.usd) : '') + '</div>' : fxNota(it, +it.parcela || 0)) + '</td><td class="n">' + (imp ? (imp.taxaAno == null ? '—' : Pp(imp.taxaAno)) + (imp.alerta ? ' <span class="pill bad">' + esc(imp.alerta) + '</span>' : '') : '') + '</td>' : '<td><input class="w-s" data-eq="' + key + '.' + i + '.cfi" value="' + esc(it.cfi || '') + '" placeholder="a informar"></td>') +
        '<td><input type="checkbox" data-eq="' + key + '.' + i + '.fin"' + (it.fin !== false ? ' checked' : '') + '></td>' +
        '<td class="n"><input class="n w-n" data-eq="' + key + '.' + i + '.m_prata" value="' + esc(NF2.format(it.m_prata || 0)) + '">' + (it.tubo ? '<div class="tiny muted">+ tubo ' + R(model.propria.tubo) + '</div>' : '') + '</td>' +
        '<td class="n"><input class="n w-n" data-eq="' + key + '.' + i + '.m_ouro" value="' + esc(NF2.format(it.m_ouro || 0)) + '"></td>' +
        '<td class="wrap small muted">' + esc(it.obs || '') + '</td><td><button class="sm ghost danger" data-eqdel="' + key + '.' + i + '" title="Remover">×</button></td></tr>';
    });
    h += '<tr class="total"><td>Total</td><td></td><td class="n">' + itens.reduce(function (s, i) { return s + (+i.qtd || 0); }, 0) + '</td><td class="n">' + R(cx.total) + '</td>' + (isB ? '<td class="n">' + R(cx.parcelaMes) + '/mês</td><td class="n">' + Pp(calc.B.cetAno) + '</td>' : '<td></td>') + '<td class="n">' + R(cx.financiavel) + '</td><td class="n">' + R(mt.prata) + '/mês</td><td class="n">' + R(mt.ouro) + '/mês</td><td></td><td></td></tr></tbody></table></div><div class="row" style="margin-top:8px"><button class="sm" data-eqadd="' + key + '">+ Item</button></div>';
    if (isB && calc.B.fx.ids.length) { var bf = calc.B.fx; h += '<p class="small muted" style="margin-top:8px">Preços e parcelas da tabela no câmbio da proposta GE (' + FXr(bf.ref) + '). O modelo converte ' + esc(FX_ITENS_TXT[bf.itens]) + ' ao câmbio de ' + FXr(bf.usd) + ': pacote de ' + R(calc.B.capex) + ' e parcela de ' + R(calc.B.parcela) + '/mês (na proposta, ' + R(calc.B.capex - (bf.precoModelo - bf.precoProposta)) + ' e ' + R(calc.B.parcela - (bf.parcelaDolar - bf.parcelaProposta)) + '/mês), com as parcelas ' + (bf.dolar ? 'atreladas ao dólar (+' + Pp(bf.va * 100) + ' a.a.)' : 'fixas em reais') + '. Premissas em Premissas › Câmbio; efeito no VPL em Alternativas.</p>'; }
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
    var rows = C.porItem.map(function (x, i) { var byId = function (l, id) { return l.filter(function (y) { return y.id === id; })[0]; }; var b = byId(B.porItem, x.id) || B.porItem[i] || {}; var it = byId(m.equip.C, x.id) || {}, V = (+it.qtd || 0) * (+it.preco || 0); var itB = byId(m.equip.B, x.id) || {}; return '<tr><td>' + esc(x.nome) + '</td><td class="n">' + R(b.prata) + '</td><td class="n">' + R(b.ouro) + '</td><td class="n">' + R(x.prata) + '</td><td class="n">' + R(x.ouro) + '</td><td class="n">' + (V ? P(x.ouro * 12 / V, 0) : '—') + '</td><td class="wrap tiny muted" style="min-width:260px;max-width:360px"><b>C:</b> ' + esc(it.m_fonte || '—') + '<br><b>B:</b> ' + esc(itB.m_fonte || '—') + '</td></tr>'; }).join('');
    h += '<div class="tbl-wrap" style="margin-top:12px"><table><thead><tr><th>R$/mês (quantidade incluída)</th><th class="n">B · Prata</th><th class="n">B · Ouro</th><th class="n">C · Prata</th><th class="n">C · Ouro</th><th class="n">C · Ouro, % a.a. do preço</th><th>Fonte dos valores</th></tr></thead><tbody>' + rows + '<tr class="total"><td>Total</td><td class="n">' + R(B.prata) + '</td><td class="n">' + R(B.ouro) + '</td><td class="n">' + R(C.prata) + '</td><td class="n">' + R(C.ouro) + '</td><td></td><td></td></tr></tbody></table></div>';
    h += '<ul class="bullets small" style="margin-top:10px"><li><b>Ouro</b>: preventiva e corretiva com cobertura total de peças, incluindo tubo, gerador de alta tensão e sistemas de imagem. <b>Prata</b>: cobertura parcial, sem tubo, gerador e sistemas de imagem; a TC soma a provisão de tubo da Controladoria. No Prata, a quebra de gerador ou detector de RX fica com o hospital e não está provisionada.</li>' +
      '<li><b>Cotação VMI (média SP, 15/10/2026)</b>: Aquila S R$ 3.900 (Prata) e R$ 6.800 (Ouro); Aquila D R$ 4.600 e R$ 7.500, tratados como R$/mês. ' + pctVmi() + ' Confirmar com a VMI se são mensais e se cedem no pacote.</li>' +
      '<li><b>Pacote GE (benchmark)</b>: TC pelo plano GE citado pelo Jaime (R$ 17 mil/mês com peças), na linha dos contratos públicos de TC com tubo; ultrassom pelo contrato de manutenção GE da EBSERH; RX pela cotação VMI de equipamento da mesma classe, na falta de cotação da CDK. A TC GE tem peças importadas: reajuste do contrato exposto ao câmbio.</li>' +
      '<li><b>Sem cotação ainda</b>: TC Pulsar e ultrassom Invictus, estimados pela mediana dos contratos públicos abaixo; RX digital Apolo, pela cotação do Aquila D' + (rmOn() ? '; RM Cignus 600 a 8% a.a. do preço no Ouro (' + R(+((rmItem('C') || {}).m_ouro) || 0) + '/mês), começando ' + m.manut.garantia_meses + ' meses depois da instalação da RM' : '') + '.</li></ul>';
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
      (lt.vmi ? 'Cotação de locação da VMI de 16/10/2026 para a TC, o Aquila S e o Aquila D, de 12 a 84 meses; a VMI sugere 48 meses. ' + (L.semCotacao.length ? 'Sem cotação (' + esc(L.semCotacao.join('; ')) + '): aluguel montado pelos custos de um locador. ' : '') + (L.nProxy ? 'RM sem cotação: aluguel pela mesma razão aluguel ÷ preço da TC Pulsar na tabela VMI (' + R(L.aluguelProxy) + '/mês em ' + D.n + ' meses), desde a instalação da RM. ' : '') + (L.manInclusa ? 'O aluguel já inclui a manutenção (confirmado em 17/10/2026): não há contrato à parte depois da garantia.' : 'Cenário de comparação: manutenção cobrada à parte, com o contrato ' + lt.plano + ' depois de ' + m.manut.garantia_meses + ' meses de garantia, como na compra. A VMI confirmou que o aluguel já a inclui.') : 'Aluguel montado pelos custos de um locador (cotação VMI desligada em Premissas): recuperar o valor do equipamento menos o que ele vale no fim do prazo, à taxa exigida, mais tributos e o contrato de manutenção Ouro.') + '</p></div>';
    /* tabela VMI */
    if (cot.length) {
      var prz = [12, 24, 36, 48, 60, 72, 84], pz = {}; PZ.forEach(function (z) { pz[z.n] = z; });
      h += '<div class="card"><div class="card-h"><h2>Tabela de locação da VMI</h2><span class="muted small">R$/mês por unidade · 16/10/2026</span></div><div class="tbl-wrap"><table><thead><tr><th>Prazo</th>' + cot.map(function (it) { return '<th class="n">' + esc(it.loc_vmi_modelo || it.modelo) + '</th>'; }).join('') + '<th class="n">Três itens</th><th class="n">Pacote completo/mês</th><th class="n">VPL hospital ' + m.fin.horizonte + 'a</th></tr></thead><tbody>' +
        prz.map(function (n) { var tot = cot.reduce(function (s, it) { return s + (+it.loc_vmi[n] || 0) * (+it.qtd || 1); }, 0), z = pz[n]; return '<tr class="' + (n === D.n ? 'hl' : '') + '"><td>' + n + ' meses' + (n === 48 ? ' <span class="pill info">sugestão VMI</span>' : '') + '</td>' + cot.map(function (it) { return '<td class="n">' + R(+it.loc_vmi[n] || 0) + '</td>'; }).join('') + '<td class="n">' + R(tot) + '</td><td class="n">' + (z ? R(z.aluguel) : '—') + '</td><td class="n">' + (z ? mi(z.vplEnt) : '—') + '</td></tr>'; }).join('') +
        '</tbody></table></div><p class="small muted" style="margin-top:8px">Pacote completo = três itens cotados ' + (lt.sep ? '+ manutenção à parte (média no prazo) ' : '') + '+ ultrassons e placa DR pela composição de custos' + (L.nProxy ? ' + RM pelo proxy da TC' : '') + '. 12 meses fica fora da simulação: renovar o pacote todo ano não é uma opção prática. Acima de 60 meses o aluguel quase não cai (TC: ' + R(cot[0].loc_vmi[60]) + ' em 60 m e ' + R(cot[0].loc_vmi[84]) + ' em 84 m) e o equipamento envelhece no contrato.' + (cot.some(function (it) { return it.id === 'rxdr'; }) ? ' A VMI cotou o RX digital como Aquila D; na compra, o RX digital é o Apolo D (fixo, ' + R((m.equip.C.filter(function (x) { return x.id === 'rxdr'; })[0] || {}).preco) + '): confirmar se é o mesmo equipamento.' : '') + '</p></div>';
    }
    /* composição no prazo */
    h += '<div class="card"><div class="card-h"><h2>Custo mensal no prazo de ' + D.n + ' meses</h2><div class="row"><label>Prazo <select id="selPrazoD">' + E.PRAZOS_D.map(function (n) { return '<option value="' + n + '"' + (n === D.n ? ' selected' : '') + '>' + n + ' meses' + (n === 48 ? ' (sugestão VMI)' : '') + '</option>'; }).join('') + '</select></label>' +
      '<label>Manutenção <select id="selManD"><option value="sim"' + (d.vmi_manut !== 'nao' ? ' selected' : '') + '>inclusa no aluguel</option><option value="nao"' + (d.vmi_manut === 'nao' ? ' selected' : '') + '>à parte (cenário)</option></select></label>' +
      '<label>Base <select id="selFonteD"><option value="vmi"' + ((d.fonte || 'vmi') !== 'composicao' ? ' selected' : '') + '>cotação VMI</option><option value="composicao"' + (d.fonte === 'composicao' ? ' selected' : '') + '>composição de custos</option></select></label></div></div>';
    h += '<div class="grid kpis">' + (lt.vmi ? kpi('Aluguel VMI', R(L.aluguelVmi) + '/mês', L.nVmi + ' itens cotados, ' + D.n + ' meses', '', true) : kpi('Taxa do locador', Pp(L.taxaAno * 100) + ' a.a.', 'arrendamento PJ ' + Pp(d.taxa_base * 100) + ' (BCB, ago/26) + prêmio ' + Pp(d.premio * 100), '', true)) +
      kpi('Manutenção à parte', R(L.manSep) + '/mês', lt.sep ? 'cenário: contrato ' + lt.plano + ' × (' + D.n + ' − ' + m.manut.garantia_meses + ') ÷ ' + D.n + ' meses' : 'nenhuma: inclusa no aluguel VMI', lt.sep ? 'warn' : '', true) +
      (L.nProxy ? kpi('RM pelo proxy da TC', R(L.aluguelProxy) + '/mês', 'sem cotação VMI da RM · ' + Pp(L.aluguelProxy / (+((rmItem('C') || {}).preco) || 1) * 100) + ' do preço ao mês', 'warn', true) : '') +
      kpi('Itens sem cotação', R(L.aluguelComp) + '/mês', L.semCotacao.length ? 'composição de custos, com Ouro' : 'nenhum', '', true) +
      kpi('Custo mensal total', R(D.aluguel), Pp(L.pctMes * 100) + ' do valor do pacote ao mês', '', true) +
      kpi('Equilíbrio com C', R(D.equilibrioC) + '/mês', 'mesmo VPL para o hospital em ' + m.fin.horizonte + ' anos (' + Psig(D.equilibrioC / D.aluguel - 1, 0) + ')', D.equilibrioC < D.aluguel ? 'warn' : 'good', true) + '</div>';
    h += '<div class="tbl-wrap" style="margin-top:12px"><table><thead><tr><th>Item</th><th>Base</th><th class="n">Valor de compra</th><th class="n">Aluguel</th><th class="n">Manutenção média</th><th class="n">Custo mensal</th><th class="n">% do valor/mês</th><th class="n">Taxa implícita a.a.</th></tr></thead><tbody>' +
      L.linhas.map(function (x) { return '<tr><td>' + esc(x.nome) + (x.qtd > 1 ? ' (' + x.qtd + ')' : '') + '</td><td class="small">' + (x.fonte === 'vmi' ? 'VMI · ' + esc(x.cotModelo) + '<div class="tiny muted">' + R(x.cotUnit) + '/un.</div>' : x.fonte === 'proxy' ? esc(x.cotModelo) + '<div class="tiny muted">' + R(x.cotUnit) + '/un.</div>' : 'composição') + '</td><td class="n">' + R(x.V) + '</td><td class="n">' + R(x.fin) + '</td><td class="n">' + R(x.man) + (x.fonte === 'vmi' ? (x.manSep ? '<div class="tiny muted">à parte</div>' : '') : '<div class="tiny muted">no aluguel</div>') + '</td><td class="n"><b>' + R(x.aluguel) + '</b></td><td class="n">' + Pp((x.pctMes || 0) * 100) + '</td><td class="n">' + (x.fonte !== 'composicao' ? (x.taxaImpl == null ? '<span class="neg">não fecha</span>' : Pp(x.taxaImpl * 100)) : Pp(L.taxaAno * 100) + '<div class="tiny muted">locador</div>') + '</td></tr>'; }).join('') +
      '<tr class="total"><td>Pacote</td><td></td><td class="n">' + R(L.V) + '</td><td class="n">' + R(L.fin) + '</td><td class="n">' + R(L.man) + '</td><td class="n">' + R(L.aluguel) + '</td><td class="n">' + Pp(L.pctMes * 100) + '</td><td></td></tr></tbody></table></div>' +
      '<p class="small muted" style="margin-top:8px">Taxa implícita: a taxa que faz o aluguel VMI, líquido de ' + Pp(d.trib * 100) + ' de tributos, pagar o valor de compra menos o residual de mercado no fim do prazo (queda a.a.: TC ' + P(d.dep_tc, 0) + ', RX ' + P(d.dep_rx, 0) + '). ' + (L.manInclusa ? 'É um teto: como o aluguel também paga a manutenção, a taxa financeira efetiva é menor. ' : '') + 'Referência: arrendamento PJ do BCB ' + Pp(d.taxa_base * 100) + ' a.a. "Não fecha" = o aluguel não paga nem o valor do equipamento. Composição: parcela financeira = (valor − residual descontado) × anuidade à taxa do locador ÷ (1 − tributos) + manutenção Ouro × (prazo − garantia) ÷ prazo.</p>';
    /* benchmarks */
    var tc = L.linhas.filter(function (x) { return x.id === 'tc'; })[0], rxs = L.linhas.filter(function (x) { return x.id === 'rxp' || x.id === 'rxdr'; });
    var tc60 = cot.length && cot[0].id === 'tc' ? +cot[0].loc_vmi[60] : null, tcM = (m.equip.C.filter(function (x) { return x.id === 'tc'; })[0] || {}).m_ouro;
    h += '<div class="grid two" style="margin-top:12px"><div><h3 class="h3">Referências de mercado (contratos públicos de locação)</h3><div class="tbl-wrap"><table><thead><tr><th>Objeto</th><th class="n">Meses</th><th class="n">R$/mês</th></tr></thead><tbody>' + BENCH_LOC.map(function (b) { return '<tr><td><a href="' + b.url + '" target="_blank" rel="noopener">' + esc(b.obj) + '</a><div class="tiny muted">' + esc(b.org) + ', ' + b.ano + '</div></td><td class="n">' + b.meses + '</td><td class="n">' + R(b.total / b.meses) + '</td></tr>'; }).join('') + '</tbody></table></div></div>' +
      '<div><h3 class="h3">Cotação VMI × mercado</h3><ul class="bullets small">' +
      (tc60 ? '<li>TC: VMI ' + R(tc60) + '/mês em 60 meses com manutenção inclusa, contra R$ 60–62 mil/mês dos contratos públicos de TC 64–128 canais com manutenção (São Luís e São Paulo, 2026): cerca de ' + P(1 - tc60 / 61000, 0) + ' abaixo. Locador cativo: para a VMI, o custo do equipamento é o de fabricação, não o preço de venda. Comprar a TC e pagar o contrato Ouro (' + R(tcM) + '/mês) sai mais caro que alugá-la.</li>' : '<li>TC: ' + (tc ? R(tc.aluguel) : '—') + '/mês em ' + D.n + ' meses; mercado R$ 60–62 mil/mês com manutenção.</li>') +
      '<li>RX móvel: VMI ' + rxs.map(function (x) { return esc(x.cotModelo || x.modelo) + ' ' + R(x.fonte === 'vmi' ? x.cotUnit : x.aluguel); }).join(' e ') + '/mês em ' + D.n + ' meses; contratos públicos entre R$ 3,5 mil (analógico, interior) e R$ 9,5 mil/mês. O aluguel do Aquila S com manutenção (' + R(+((m.equip.C.filter(function (x) { return x.id === 'rxp'; })[0] || {}).loc_vmi || {})[D.n] || 0) + ') fica abaixo do contrato Ouro avulso do mesmo equipamento (R$ 6.800/mês): na compra (B e C), o contrato de manutenção dos RX está caro e deve ser negociado com a locação como referência.</li>' +
      '<li>Ultrassom e placa DR: sem cotação VMI nem contrato público comparável; aluguel pela composição de custos.</li>' + (L.nProxy ? '<li>RM: o proxy dá ' + R(L.aluguelProxy) + '/mês em ' + D.n + ' meses. A locação emergencial de RM 1,5T da SMS São Paulo (2024) custou R$ 190 mil/mês por 12 meses, com a adequação da sala; na tabela VMI, o aluguel da TC em 48 meses é ' + P(((m.equip.C.filter(function (x) { return x.id === 'tc'; })[0] || {}).loc_vmi || {})[48] / (((m.equip.C.filter(function (x) { return x.id === 'tc'; })[0] || {}).loc_vmi || {})[12] || 1), 0) + ' do de 12 meses.</li>' : '') + '</ul></div></div></div>';
    /* prazos */
    h += '<div class="card"><div class="card-h"><h2>Simulação por prazo</h2><span class="muted small">' + esc(lt.base) + ' · VP a ' + P(m.fin.desconto, 0) + ' a.a. · compra = pacote C financiado pela linha em uso, manutenção Ouro</span></div><div class="tbl-wrap"><table><thead><tr><th>Prazo</th><th class="n">Custo/mês</th><th class="n">% valor/mês</th><th class="n">Total no prazo</th><th class="n">VP do custo</th><th class="n">VP possuir (C)</th><th class="n">Vantagem locação</th><th class="n">Equilíbrio no prazo</th><th class="n">VPL hospital ' + m.fin.horizonte + 'a</th><th class="n">Caixa acum.</th></tr></thead><tbody>' +
      PZ.map(function (z) { var on = z.n === D.n; return '<tr class="' + (on ? 'hl' : '') + '"><td>' + z.n + ' meses' + (z.n === 48 ? ' <span class="pill info">sugestão VMI</span>' : '') + '</td><td class="n">' + R(z.aluguel) + '</td><td class="n">' + Pp(z.pctMes * 100) + '</td><td class="n">' + mi(z.totalPrazo) + '</td><td class="n">' + mi(z.pvAluguel) + '</td><td class="n">' + mi(z.custoPossuir) + '</td><td class="n ' + sinal(z.vantagem) + '">' + mi(z.vantagem) + '</td><td class="n">' + R(z.equilibrio) + '</td><td class="n">' + mi(z.vplEnt) + '</td><td class="n">' + mi(z.acumEnt) + '</td></tr>'; }).join('') +
      '<tr class="sub"><td>Compra C (referência)</td><td class="n" title="parcela após a carência + manutenção">' + R(c.C.parcela + c.C.manut.mes) + '</td><td></td><td></td><td></td><td></td><td></td><td></td><td class="n">' + mi(c.flC.vplEnt) + '</td><td class="n">' + mi(c.flC.acumEnt) + '</td></tr></tbody></table></div>' +
      '<ul class="bullets small" style="margin-top:10px"><li><b>No prazo</b>: comprar e usar pelo mesmo período = entrada + parcelas até o fim do prazo + saldo devedor que sobra + manutenção Ouro depois da garantia − valor de mercado do equipamento no fim. Vantagem negativa = a locação custa mais.</li><li><b>Em ' + m.fin.horizonte + ' anos</b>: a locação é renovada ao mesmo aluguel com equipamento novo. Prazos curtos custam mais por mês, mas trocam a TC com mais frequência.</li><li><b>Cláusulas a exigir</b>: escopo da manutenção (preventiva, corretiva, peças, tubo) e quem paga; disponibilidade mínima de 95% a 97% com multa e equipamento reserva; reajuste anual por índice definido; opção de compra pelo valor residual no fim; troca tecnológica na renovação; seguro do bem; regras de rescisão antecipada.</li></ul></div>';
    return h;
  }
  function renderInvest() {
    var c = calc, m = model, C = c.C, av = C.av;
    var h = '<div class="card hero"><span class="eyebrow">Investimento</span><h2>Mesmo perímetro, dois pacotes: GE/CDK (proposta do Jaime, ' + mi(c.B.capex) + ') e VMI (preços de 15/10/2026, ' + mi(c.C.capex) + ')' + (rmOn() ? ', com a RM nos dois' : '') + '</h2><p class="lead muted">Os preços, CFIs e contratos de manutenção de cada item são editáveis. Diferença de perímetro a decidir: a VMI propõe RX digital fixo (Apolo D, R$ 290 mil) onde o pacote GE tem RX portátil com placa DR (R$ 490 mil). A RM Cignus 600 (R$ 5,2 mi, 19/10/2026) está nos dois pacotes e entra no cálculo só no cenário com RM (' + (rmOn() ? 'ligado' : 'desligado') + '; troca em Alternativas ou em Premissas); no pacote GE, sem proposta de RM, ela usa o mesmo preço e a parcela é calculada à taxa do HFS.</p></div>';
    h += '<div class="card"><div class="card-h"><h2>Pacote B · GE/CDK, financiamento dos fornecedores</h2><span class="muted small">Projeto Radiologia e Proposta Estratégica (Jaime); HFS 60x para a TC</span></div>' + equipTable('B') + '<p class="small muted" style="margin-top:8px">Totais corretos: R$ 2.934.024,80 e R$ 73.537,38/mês. O documento do Jaime soma R$ 2.979.024,80 e R$ 68.458,38 (erros de soma).</p></div>';
    h += '<div class="card"><div class="card-h"><h2>Pacote C · VMI, linha de fomento</h2><span class="muted small">Pulsar 128 (64 canais/128 cortes), Invictus, Aquila 320 S, Apolo D, placa DR VMI · preços VMI de 15/10/2026 · Cignus 600 (RM) de 19/10/2026</span></div>' + equipTable('C') + '</div>';
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
    h += '<div class="card"><div class="card-h"><h2>Ranking das linhas para o HDA</h2><span class="muted small">ordenado pelo custo total (CET + honorário S&S); cenário base de spreads; o BNDES Automático compara TLP, TFB, Taxa LCD e Pré FAT e a faixa vai do menor ao maior custo entre eles</span></div><div class="grid" style="gap:10px">';
    av.ranking.forEach(function (x) {
      var s = x.sim, esc_ = C.escolha && C.escolha.linha.id === x.linha.id;
      h += '<div class="linha' + (esc_ ? ' top' : '') + '"><div class="rank">' + x.rank + '</div><div><div class="nm">' + esc(x.linha.nome) + (esc_ ? ' <span class="pill info">em uso no plano</span>' : '') + '</div><div class="op">' + esc(x.linha.operador) + '</div><div class="comp">' + s.spreads.map(function (sp) { return '<span>' + esc(sp.nome) + ' ' + Pp(sp.v) + '</span>'; }).join('') + '<span>' + esc(s.cfRot) + '</span><span>' + s.n + ' m · ' + s.c + ' car.</span><span>IOF ' + (x.linha.iof === 'zero' ? 'zero' : x.linha.iof === 'nao_incide' ? 'não incide' : R(s.iof)) + '</span></div>' + ((s.opcoes || []).length > 1 ? '<div class="comp">' + s.opcoes.map(function (o) { return '<span title="' + esc(o.rot) + '"' + (o.custo === s.custo ? ' style="font-weight:600"' : '') + '>' + esc(rotCusto(o.custo)) + ' · CET ' + Pp(o.cet) + (o.limitado ? ' (' + o.n + ' m, ' + o.c + ' car.)' : '') + (o.custo === 'LCD' && !(BASE.macro.lcd && BASE.macro.lcd.confirmado) ? '*' : '') + '</span>'; }).join('') + '</div>' : '') + '<div class="why">' + x.el.porques.map(function (p) { return '<span>✓ ' + esc(p) + '</span>'; }).join('') + x.el.avisos.concat(s.avisos).map(function (p) { return '<span class="muted">! ' + esc(p) + '</span>'; }).join('') + '</div></div>' +
        '<div class="rt"><span class="big">' + Pp(s.cet) + '</span><span class="small muted">CET a.a. · ' + (function () { var ft = s.faixaTotal || s.faixa, k = (s.opcoes || []).length; return 'custo total ' + Pp(s.custoTotal) + ' · faixa ' + Pp(ft.min) + (k > 1 ? ' (' + rotCusto(ft.custoMin) + ')' : '') + ' a ' + Pp(ft.max) + (k > 1 ? ' (' + rotCusto(ft.custoMax) + ')' : '') + (k > 1 ? ' entre ' + k + ' custos financeiros e os cenários de spread' : ' nos cenários de spread'); })() + '</span><span class="small">Parcela ' + R(s.parcelaPosCarencia) + ' · na carência ' + R(s.primeiraParcela) + '</span><span class="small">Total pago ' + R(s.pagos) + ' · juros ' + R(s.juros) + '</span></div></div>';
    });
    av.mercado.forEach(function (x) { var s = x.sim; h += '<div class="linha bloq"><div class="rank">ref</div><div><div class="nm">' + esc(x.linha.nome) + '</div><div class="op">' + esc(x.linha.obs) + '</div></div><div class="rt"><span class="big">' + Pp(s.cet) + '</span><span class="small muted">CET a.a. · ' + s.n + ' meses</span><span class="small">Parcela ' + R(s.parcelaPosCarencia) + '</span></div></div>'; });
    h += '<div class="linha bloq"><div class="rank">B</div><div><div class="nm">Financiamento dos fornecedores (HFS/GE e demais), 60 meses</div><div class="op">Custo implícito nas parcelas informadas; ' + esc(FX_ITENS_TXT[c.B.fx.itens]) + ' em dólar a ' + FXr(c.B.fx.usd) + '</div></div><div class="rt"><span class="big">' + Pp(c.B.cetAno) + '</span><span class="small muted">a.a. implícito</span><span class="small">Parcela ' + R(c.B.parcela) + '</span><span class="small">Total pago ' + R(c.B.pagos) + '</span></div></div>';
    (function () { var la = calc.lcdAuto; h += '</div><p class="small muted" style="margin-top:8px">' + (la ? '* Taxa LCD = Selic (Focus) + sobretaxa LCD de ' + Pp(la.sob) + (la.confirmado ? '' : ' a.a., premissa da ferramenta (a de out/2026 não foi obtida; faixa de ' + Pp(la.sobMin) + ' a ' + Pp(la.sobMax) + ')') + '. No Automático, a Taxa LCD dá ' + Pp(la.tot) + ' de custo total contra ' + Pp(la.ref) + ' do ' + esc(la.refLinha) + ' com ' + esc(rotCusto(la.refCusto)) + (la.empate != null ? '; empata com sobretaxa de ' + Pp(la.empate) : '') + '. ' : '') + 'TFB e Taxa LCD limitam prazo e carência (TFB até 120 meses e 12 de carência; Taxa LCD até 120 e 24): entre parênteses, o que o custo permite quando é menos que o pedido. O FINAME, na base da ferramenta, compara TLP e Pré FAT.</p>'; h += '<details style="margin-top:12px"><summary>Linhas não elegíveis e por quê</summary>'; })();
    h += '<ul class="src-list">' + av.todas.filter(function (x) { return !x.el.ok; }).map(function (x) { return '<li><b>' + esc(x.linha.nome) + '</b>: ' + esc(x.el.bloqueios.join('; ')) + '</li>'; }).join('') + '</ul></details></div>';
    h += cardFgts();
    h += cardFiis();
    /* cronograma anual */
    if (C.escolha) {
      var rows = (C.rows && C.rows.length ? C.rows : C.escolha.sim.rows), porAno = {};
      rows.forEach(function (r) { var k = r.y; if (!porAno[k]) porAno[k] = { ano: k, juros: 0, amort: 0, parcela: 0, saldo: r.saldo, n: 0 }; porAno[k].juros += r.juros; porAno[k].amort += r.amort; porAno[k].parcela += r.parcela; porAno[k].saldo = r.saldo; porAno[k].n++; });
      h += '<div class="card"><div class="card-h"><h2>Cronograma da linha em uso</h2><span class="muted small">' + esc(C.escolha.linha.nome) + ' · ' + esc(C.escolha.sim.cfRot) + ' · taxa no 1º ano ' + Pp(C.taxaAno1) + (C.rmFin ? ' · pacote + RM' : '') + '</span></div>' + (C.rmFin ? '<p class="small muted" style="margin:0 0 8px">Dois contratos na mesma linha: o pacote, liberado em ' + fmtMes(model.altC.inicio) + ' com a instalação (parcela ' + R(C.parcelaPacote) + ' após a carência), e a RM, liberado na entrega, em ' + fmtMes(C.rmFin.inicio) + ' (' + mi(C.capexFinRM) + ', parcela ' + R(C.parcelaRM) + ' após a carência). A tabela soma os dois.</p>' : '') + '<div class="tbl-wrap"><table><thead><tr><th>Ano</th><th class="n">Meses</th><th class="n">Juros</th><th class="n">Amortização</th><th class="n">Parcelas</th><th class="n">Saldo no fim</th></tr></thead><tbody>' + Object.keys(porAno).map(function (k) { var a = porAno[k]; return '<tr><td>' + a.ano + '</td><td class="n">' + a.n + '</td><td class="n">' + R(a.juros) + '</td><td class="n">' + R(a.amort) + '</td><td class="n">' + R(a.parcela) + '</td><td class="n">' + R(a.saldo) + '</td></tr>'; }).join('') + '<tr class="total"><td>Total</td><td class="n">' + rows.length + '</td><td class="n">' + R(C.juros) + '</td><td class="n">' + R(C.capexFin) + '</td><td class="n">' + R(C.pagos) + '</td><td></td></tr></tbody></table></div>' + (C.iof ? '<p class="small muted" style="margin-top:8px">IOF estimado ' + R(C.iof) + ' (filantrópica pode ter não incidência).</p>' : '') + '</div>';
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
    $$('#tab-invest [data-eq]').forEach(function (inp) { inp.addEventListener('change', function () { var p = this.dataset.eq.split('.'); var it = model.equip[p[0]][+p[1]]; var f = p[2]; if (f === 'fin') it.fin = this.checked; else if (f === 'parcela' && E.isRM(it)) { var pv = parseBR(this.value); it.parcela = pv || null; it.parcela_auto = !pv; } else if (f === 'qtd' || f === 'preco' || f === 'parcela' || f === 'm_prata' || f === 'm_ouro') it[f] = parseBR(this.value); else it[f] = this.value; afterEdit(); }); });
    $$('#tab-invest [data-eqdel]').forEach(function (b) { b.addEventListener('click', function () { var p = this.dataset.eqdel.split('.'); model.equip[p[0]].splice(+p[1], 1); afterEdit(); }); });
    $$('#tab-invest [data-eqadd]').forEach(function (b) { b.addEventListener('click', function () { var k = this.dataset.eqadd; model.equip[k].push(k === 'B' ? { id: 'n' + Date.now(), nome: 'Novo item', modelo: '', qtd: 1, preco: 0, parcela: 0, n: 60, fin: true, obs: '', m_prata: 0, m_ouro: 0, m_fonte: 'Informar o contrato' } : { id: 'n' + Date.now(), nome: 'Novo item', modelo: '', qtd: 1, preco: 0, cfi: '', fin: true, obs: '', m_prata: 0, m_ouro: 0, m_fonte: 'Informar o contrato' }); afterEdit(); }); });
  }

  /* FGTS-Saúde: requisitos do Manual de Fomento v002 e margem consignável do SUS */
  function rotCusto(c) { return { TLP: 'TLP', TFB: 'TFB', LCD: 'Taxa LCD', Pm: 'Pré FAT', PMm: 'Pré FAT MPME', FIIS_IND: 'taxa fixa FIIS', FIIS_DIR: 'taxa fixa FIIS' }[c] || c; }
  /* FIIS Saúde: pré-requisito da Chamada Pública 2025 e quanto valeria para o HDA */
  function cardFiis() {
    var cf = calc.cenFIIS, fl = (model.cliente && model.cliente.flags) || {}; if (!cf) return '';
    function sel(path, val, ops) { return '<select data-fg="' + path + '">' + ops.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(val == null ? '' : val) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'; }
    var x = calc.C.av.todas.filter(function (t) { return t.linha.id === 'fiis-saude-indireto'; })[0], ok = x && x.el.ok;
    var pill = cf.emUso ? '<span class="pill good">em uso no plano</span>' : ok ? '<span class="pill good">elegível' + (x.rank ? ' · ' + x.rank + 'ª do ranking' : '') + '</span>' : cf.marcado ? '<span class="pill warn">falta o enquadramento</span>' : '<span class="pill warn">só com proposta na chamada de 2025</span>';
    var p = cf.pedido, v = cf.vinte, alt = calc.sel.id;
    var h = '<div class="card"><div class="card-h"><h2>FIIS Saúde: pré-requisito da Chamada Pública 2025</h2>' + pill + '</div>' +
      '<p class="small">O FIIS Saúde (Lei 14.947/2024) só contrata com quem inscreveu carta-consulta no Transferegov na <b>Chamada Pública de 2025 (13/10 a 07/11/2025)</b> e teve a proposta habilitada; a janela de 2026 (30/06 a 06/07/2026) também fechou. Crédito indireto até R$ 50 mi, somadas as propostas do proponente; taxa fixa total, média de 11,1% (10 anos) e 13,2% (20 anos) na apresentação MS/BNDES; carência até 24 meses. Filantrópica com CEBAS tem até 20 anos; privada com contrato ou convênio SUS, até 10. O FIIS financia equipamento para assistência no SUS: com o SUS em cerca de 20% do HDA, o hospital precisaria comprometer o uso SUS do pacote na proposta.</p>' +
      '<div class="grid two" style="margin-top:10px"><div style="display:grid;gap:10px;align-content:start">' +
      '<label class="small">O HDA inscreveu e teve habilitada proposta na Chamada Pública FIIS Saúde 2025?<br>' + sel('cliente.flags.fiis_chamada2025', Number(fl.fiis_chamada2025) ? 1 : 0, [[0, 'Não / não confirmado'], [1, 'Sim']]) + '</label>' +
      '<label class="small">Enquadramento no FIIS<br>' + sel('cliente.flags.fiis_tipo', fl.fiis_tipo || '', [['', 'Não informado'], ['filantropica_cebas', 'Filantrópica com CEBAS (até 20 anos)'], ['conveniada', 'Com contrato ou convênio SUS (até 10 anos)'], ['sem_sus', 'Sem vínculo SUS (não elegível)']]) + '</label>' +
      '</div><div>';
    if (p) h += '<table><tbody>' + [
      ['FIIS indireto, ' + p.n + ' meses (prazo pedido)', 'CET ' + Pp(p.cet) + '<br>taxa fixa ' + Pp(p.taxa1)],
      ['Parcela do pacote' + (calc.rm.on ? ' + RM' : '') + ' após a carência', R(p.parcela) + (cf.emUso ? '' : '<br>no plano: ' + R(calc.C.parcela))],
      ['VPL do HDA em C com o FIIS', '<b>' + mi(p.vplC) + '</b>' + (cf.emUso ? '' : '<br>' + (p.delta >= 0 ? '+' : '') + mi(p.delta) + ' sobre o plano')],
      v && v.n > p.n ? ['Com CEBAS, ' + v.n + ' meses', 'CET ' + Pp(v.cet) + '<br>parcela ' + R(v.parcela) + '<br>VPL ' + mi(v.vplC) + ' (' + (v.delta >= 0 ? '+' : '') + mi(v.delta) + ')'] : null
    ].filter(Boolean).map(function (r) { return '<tr><td>' + r[0] + '</td><td class="n" style="white-space:normal">' + r[1] + '</td></tr>'; }).join('') + '</tbody></table><p class="small muted" style="margin-top:6px">' + (cf.marcado ? 'Com a inscrição marcada, o FIIS entra no ranking pelo custo total.' : 'Simulação: o plano segue no ' + esc(calc.C.escolha ? calc.C.escolha.linha.nome : '—') + ' até o hospital confirmar a inscrição.') + ' Faixa da taxa fixa em 10 anos: ' + Pp(BASE.fiis.indireta.t10.min) + ' a ' + Pp(BASE.fiis.indireta.t10.max) + ' (operações de saúde contratadas em 2026 e teto do edital).' + (alt === 'C' ? '' : ' O VPL é o da alternativa C; a selecionada no plano é a ' + alt + '.') + '</p>';
    h += '</div></div><p class="small muted" style="margin-top:10px">Para seguir: número da proposta e situação no Transferegov, CEBAS ou contrato SUS vigente, formulário de equipamentos do Ministério e CNES da unidade, e consultas CEIS, CNEP e CEPIM sem registro (Manual da Chamada Pública, itens 2 e 4).</p></div>';
    return h;
  }
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
    h += '</div></div><p class="small muted" style="margin-top:10px">Outros requisitos (Manual, 5.5.1): CNES ativo, CRF do FGTS, CND, sem restrição no CADIN, anuência do gestor local do SUS e termo de cessão dos créditos (Portaria GM/MS 2.182/2015). Hoje o SUS responde por cerca de 20% do HDA, o que torna o CEBAS na modalidade de 60% ao SUS improvável' + (calc.C.escolha && calc.C.escolha.linha.id === 'fgts-saude' ? '; confirme a resposta antes de protocolar, porque o plano está usando o FGTS-Saúde.' : fgtsEstado().st === 'fora' ? '. Com as respostas informadas, a linha está fora e o plano usa ' + linhaCurta(calc.C.escolha && calc.C.escolha.linha) + '.' : ': por isso o plano usa o FINAME até a resposta.') + ' A <b>modalidade II</b> (reestruturação financeira, até 15 anos, com plano de trabalho) não financia equipamento, mas pode alongar a dívida atual; ver Capacidade de crédito.</p></div>';
    return h;
  }
  function bindFgts(root) {
    $$(root + ' [data-fg]').forEach(function (el) { el.addEventListener('change', function () { var v = this.value; if (this.dataset.num) v = parseBR(v) || 0; else if (this.dataset.fg === 'cliente.flags.sus_complementar' || this.dataset.fg === 'cliente.flags.fiis_chamada2025') v = +v; setPath(model, this.dataset.fg, v); afterEdit(); }); });
  }

  /* ================= CAPACIDADE DE CRÉDITO ================= */
  function renderCredito() {
    var c = calc, m = model, en = c.ent, L = en.linhas, l1 = L[0];
    var h = '<div class="card hero"><span class="eyebrow">Visão do banco · entidade tomadora</span><h2>O projeto se paga; a pergunta do agente financeiro é se o hospital cobre a dívida que já tem</h2><p class="lead muted">EBITDA anualizado de ' + mi(en.ebitdaBase) + ' contra serviço da dívida de ' + mi(l1.servAtual) + ' em ' + l1.ano + ' (mapa de empréstimos de dez/25, sem a conta garantida). O TDC de ' + mi(m.entidade.tdc_min) + '+ em ' + esc(m.entidade.tdc_mes) + ' muda o quadro; o modelo mostra os dois mundos.</p></div>';
    h += '<div class="grid kpis">' + kpi('Dívida líquida', mi(en.dl), 'dívida ' + mi(en.divTot) + ' − caixa ' + mi(en.caixa)) + kpi('Dívida líquida / EBITDA', X(en.dlEbitda), 'hoje · com o projeto ' + X(en.dlEbitdaProj), en.dlEbitda > 3 ? 'bad' : 'warn') + kpi('DSCR ' + l1.ano + ' sem o projeto', X(l1.dscrSemProj), 'referência usual dos agentes ≥ 1,3x (não é norma do BNDES)', l1.dscrSemProj < 1.3 ? 'bad' : 'good') + kpi('DSCR ' + l1.ano + ' com o projeto', X(l1.dscrSem), 'sem TDC', l1.dscrSem < 1.3 ? 'warn' : 'good') + kpi('DSCR ' + l1.ano + ' com TDC', X(l1.dscrCom), 'dívida liquidada em ' + esc(m.entidade.tdc_mes), 'good') + kpi('Dívida líquida após o TDC', mi(en.dlAposTdc), P(m.entidade.tdc_liquida, 0) + ' da dívida liquidada com ' + mi(m.entidade.tdc_min), 'good') + '</div>';
    if (c.cenRM) { var qr = c.cenRM, sid = c.sel.id; h += '<div class="notice' + (rmOn() ? ' warn' : '') + '">Ressonância: no cenário ' + (rmOn() ? 'com RM (atual)' : 'sem RM (atual)') + ', a alternativa ' + sid + ' leva a cobertura de ' + qr.sem[sid].dscr[0].ano + ' a ' + X((rmOn() ? qr.com : qr.sem)[sid].dscr[0].v) + ' e a de ' + qr.sem[sid].dscr[1].ano + ' a ' + X((rmOn() ? qr.com : qr.sem)[sid].dscr[1].v) + '; ' + (rmOn() ? 'sem a RM seriam ' + X(qr.sem[sid].dscr[0].v) + ' e ' + X(qr.sem[sid].dscr[1].v) + ', com ' + mi(qr.com[sid].fin - qr.sem[sid].fin) + ' a menos de dívida nova.' : 'com a RM seriam ' + X(qr.com[sid].dscr[0].v) + ' e ' + X(qr.com[sid].dscr[1].v) + ', com ' + mi(qr.com[sid].fin - qr.sem[sid].fin) + ' a mais de dívida nova.') + '</div>'; }
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
    { id: 'propria.rep_med_pct', nome: 'Repasse médico na imagem própria', min: 0.15, max: 0.30, step: 0.005, fmt: function (v) { return P(v, 1); }, hint: 'Hoje 22,2% via EMG; CEO: radiologistas de dia, telelaudo após as 18 h, incluso' },
    { id: 'propria.matmed_pct', nome: 'Mat/Med na imagem própria', min: 0.04, max: 0.18, step: 0.005, fmt: function (v) { return P(v, 1); }, hint: '5,2%: CEO confirmou que o material já está contabilizado' },
    { id: 'propria.sala_elimina', nome: 'Zerar "médicos que usam a sala"', seg: [[1, 'Sim'], [0, 'Não']], hint: '21,5% da receita; CEO confirmou que já está incluída' },
    { id: 'propria.pacs_incluir', nome: 'PACS Sectra no modelo', seg: [['sim', 'Com PACS'], ['nao', 'Sem PACS']], hint: 'sem cotação; não muda a escolha, muda o tamanho do ganho' },
    { id: 'propria.pacs_exame', nome: 'PACS Sectra: R$ por exame', min: 5, max: 12, step: 0.25, fmt: function (v) { return 'R$ ' + NF2.format(v); }, hint: 'estimativa S&S para o Standard: R$ 6,94 a 10,58; base R$ 8,33' },
    { id: 'base.cf_dir_mes', nome: 'Folha da equipe técnica (fixos diretos)', min: 140000, max: 210000, step: 5000, fmt: function (v) { return R(v); }, hint: 'R$ 184 mil na folha; muda o resultado, não a escolha (a equipe existe com ou sem EMG)' },
    { id: 'base.ticket', nome: 'Ticket médio', min: 140, max: 220, step: 2, fmt: function (v) { return R(v); }, hint: 'R$ 174 na base' },
    { id: 'manut.plano', nome: 'Plano de manutenção (B e C)', seg: [['ouro', 'Ouro'], ['prata', 'Prata']], hint: 'Ouro cobre tubo, gerador e sistemas de imagem' },
    { id: 'propria.manut_fator', nome: 'Fator sobre os contratos de manutenção', min: 0.5, max: 2, step: 0.1, fmt: function (v) { return N(v, 1) + '×'; }, hint: '1,0× = valores por item; vale também para a manutenção dentro do aluguel' },
    { id: 'altD.prazo', nome: 'Prazo da locação (D)', min: 24, max: 84, step: 12, fmt: function (v) { return v + ' m'; }, hint: 'sugestão VMI: 48 meses' },
    { id: 'altD.vmi_manut', nome: 'Cotação VMI inclui manutenção? (D)', seg: [['sim', 'Sim'], ['nao', 'Não']], hint: 'confirmado: inclusa; "Não" só como cenário' },
    { id: 'altD.premio', nome: 'Prêmio do locador (D)', min: 0, max: 0.08, step: 0.005, fmt: function (v) { return Pp(v * 100) + ' p.p.'; }, hint: 'só nos itens sem cotação VMI' },
    { id: 'altC.prazo', nome: 'Prazo do financiamento C', min: 36, max: 120, step: 12, fmt: function (v) { return v + ' m'; }, hint: 'FINAME até 120; FGTS-Saúde até 60' },
    { id: 'altC.carencia', nome: 'Carência C', min: 0, max: 24, step: 3, fmt: function (v) { return v + ' m'; }, hint: 'FINAME até 24; FGTS-Saúde sem carência' },
    { id: 'fin.desconto', nome: 'Taxa de desconto', min: 0.08, max: 0.25, step: 0.01, fmt: function (v) { return P(v, 0); }, hint: '' },
    { id: 'cenario.reajuste_modo', nome: 'Inflação nos fluxos', seg: [['ipca', 'IPCA (Focus)'], ['fixo', 'Taxa fixa / constante']], hint: 'IPCA em todos os caminhos, como nas parcelas do FINAME' },
    { id: 'fin.horizonte', nome: 'Horizonte', seg: [[5, '5 anos'], [10, '10 anos']], hint: '' },
    { id: 'cambio.usd', nome: 'Câmbio do pacote GE (R$/US$)', min: 4.5, max: 7, step: 0.01, fmt: function (v) { return 'R$ ' + NF2.format(v); }, hint: 'proposta GE a R$ 5,16; premissa R$ 5,38; só muda o B' },
    { id: 'cambio.parcelas', nome: 'Parcelas do HFS (B)', seg: [['fixas', 'Fixas em R$'], ['dolar', 'Atreladas ao dólar']], hint: 'confirmar com a GE' },
    { id: 'fin.alternativa', nome: 'Alternativa', seg: [['C', 'C · VMI compra'], ['B', 'B · GE/HFS'], ['D', 'D · VMI locação']], hint: '' },
    { id: 'equip.precoC', nome: 'Preço do pacote VMI vs. GE', min: 0.7, max: 1.3, step: 0.05, fmt: function (v) { return (v >= 1 ? '+' : '−') + P(Math.abs(v - 1), 0); }, hint: 'escala todos os itens do pacote C (com a RM, se ligada)', virtual: true },
    { id: 'rm.incluir', nome: 'Ressonância (Cignus 600)', seg: [['sim', 'Com RM'], ['nao', 'Sem RM']], hint: 'serviço novo; o quadro com × sem está em Alternativas' },
    { id: 'rm.exames_mes', nome: 'RM: exames/mês em regime (convênio e particular)', min: 100, max: 900, step: 10, fmt: function (v) { return N(v); }, hint: 'premissa 400; capacidade 624 em 12 h' },
    { id: 'rm.ticket', nome: 'RM: ticket médio', min: 300, max: 900, step: 10, fmt: function (v) { return R(v); }, hint: 'premissa R$ 500' },
    { id: 'equip.precoRM', nome: 'RM: preço do equipamento', min: 3500000, max: 6000000, step: 50000, fmt: function (v) { return mi(v); }, hint: 'R$ 5,2 mi informado; R$ 4,33 mi no FINAME da CEMAN; R$ 4,9 mi em Goiás', virtual: true },
    { id: 'rm.horas_dia', nome: 'RM: horas de operação por dia', min: 8, max: 24, step: 1, fmt: function (v) { return N(v) + ' h'; }, hint: 'só a capacidade mostrada' }
  ];
  function simGet(id) {
    if (id === 'equip.precoC') return sim._precoC == null ? 1 : sim._precoC;
    if (id === 'equip.precoRM') { var it = (sim.equip.C || []).filter(E.isRM)[0]; return it ? +it.preco : 0; }
    return getPath(sim, id);
  }
  function simSet(id, v) {
    if (id === 'equip.precoC') { var f = v / (sim._precoC == null ? 1 : sim._precoC); sim._precoC = v; sim.equip.C.forEach(function (it) { it.preco = it.preco * f; }); return; }
    if (id === 'equip.precoRM') { ['B', 'C'].forEach(function (k) { (sim.equip[k] || []).forEach(function (it) { if (E.isRM(it)) it.preco = v; }); }); return; }
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
    $$('#levers [data-lever]').forEach(function (r) { r.addEventListener('input', function () { var l = LEVERS[+this.dataset.lever]; var v = +this.value; simSet(l.id, l.id === 'fin.horizonte' || l.id === 'altC.prazo' || l.id === 'altC.carencia' || l.id === 'altD.prazo' || /^rm\.(exames|horas)/.test(l.id) ? Math.round(v) : v); $('#lv' + this.dataset.lever).textContent = l.fmt(v); recomputeSim(); renderSimResults(); }); });
    $$('#levers [data-seg]').forEach(function (b) { b.addEventListener('click', function () { var l = LEVERS[+this.dataset.seg]; var v = this.dataset.v; simSet(l.id, isNaN(+v) ? v : +v); recomputeSim(); renderLevers(); renderSimResults(); }); });
  }
  function alavancasSens(sm) {
    var al = [
      { nome: 'Volume', set: function (mm, v) { mm.cenario.volume_var = v; }, lo: -0.2, hi: 0.3, loTxt: '−20%', hiTxt: '+30%' },
      { nome: 'Repasse médico', set: function (mm, v) { mm.propria.rep_med_pct = v; }, lo: 0.26, hi: 0.18, loTxt: '26%', hiTxt: '18%' },
      { nome: 'Ticket médio', set: function (mm, v) { mm.base.ticket = v; }, lo: 157, hi: 191, loTxt: '−10%', hiTxt: '+10%' },
      { nome: 'Contratos de manutenção', set: function (mm, v) { mm.propria.manut_fator = v; }, lo: 1.5, hi: 0.7, loTxt: '1,5×', hiTxt: '0,7×' },
      { nome: 'Preço do pacote', set: function (mm, v) { mm.equip.C.forEach(function (it) { it.preco *= v; }); mm.equip.B.forEach(function (it) { it.preco *= v; }); }, lo: 1.15, hi: 0.85, loTxt: '+15%', hiTxt: '−15%' },
      { nome: 'Taxa de desconto', set: function (mm, v) { mm.fin.desconto = v; }, lo: 0.20, hi: 0.10, loTxt: '20%', hiTxt: '10%' }
    ];
    if (sm.fin.alternativa === 'B') { var u0 = +((sm.cambio || {}).usd) || 5.38; al.push({ nome: 'Câmbio (pacote GE)', set: function (mm, v) { mm.cambio = mm.cambio || {}; mm.cambio.usd = v; }, lo: u0 * 1.2, hi: u0 * 0.9, loTxt: 'R$ ' + NF2.format(u0 * 1.2), hiTxt: 'R$ ' + NF2.format(u0 * 0.9) }); }
    if (E.pacsOn(sm)) al.push({ nome: 'PACS por exame', set: function (mm, v) { mm.propria.pacs_exame = v; }, lo: 10.58, hi: 6.94, loTxt: 'R$ 10,58', hiTxt: 'R$ 6,94' });
    if (sm.fin.alternativa === 'D') al.push({ nome: 'Prêmio do locador', set: function (mm, v) { mm.altD.premio = v; }, lo: 0.07, hi: 0.01, loTxt: '7 p.p.', hiTxt: '1 p.p.' }, { nome: 'Prazo da locação', set: function (mm, v) { mm.altD.prazo = v; }, lo: 36, hi: 84, loTxt: '36 m', hiTxt: '84 m' }, { nome: 'Manutenção na cotação VMI', set: function (mm, v) { mm.altD.vmi_manut = v ? 'sim' : 'nao'; }, lo: 0, hi: 1, loTxt: 'à parte', hiTxt: 'inclusa' });
    if (E.rmOn(sm)) { var rr = sm.rm, rmP = function (mm, f) { ['B', 'C'].forEach(function (k) { (mm.equip[k] || []).forEach(function (it) { if (E.isRM(it)) it.preco *= f; }); }); };
      al.push({ nome: 'RM: volume', set: function (mm, v) { mm.rm.exames_mes = v; }, lo: Math.round(+rr.exames_mes * 0.7), hi: Math.round(+rr.exames_mes * 1.3), loTxt: '−30%', hiTxt: '+30%' },
        { nome: 'RM: ticket', set: function (mm, v) { mm.rm.ticket = v; }, lo: +rr.ticket * 0.8, hi: +rr.ticket * 1.2, loTxt: '−20%', hiTxt: '+20%' },
        { nome: 'RM: preço do equipamento', set: function (mm, v) { rmP(mm, v); }, lo: 1.15, hi: 0.85, loTxt: '+15%', hiTxt: '−15%' },
        { nome: 'RM: sala', set: function (mm, v) { mm.rm.obra = v; }, lo: +rr.obra * 1.5, hi: +rr.obra * 0.6, loTxt: '+50%', hiTxt: '−40%' }); }
    return al;
  }
  function renderSimResults() {
    var s = simCalc, fl = s.flSel, b = calc.flSel;
    function d(v, ref, fmt) { var dv = v - ref; return fmt(v) + ' <span class="small ' + sinal(dv) + '">' + (dv >= 0 ? '+' : '−') + fmt(Math.abs(dv)).replace('−', '') + '</span>'; }
    $('#simKpis').innerHTML = kpi('VPL do projeto', d(fl.vpl, b.vpl, mi), 'vs. premissas salvas', fl.vpl > 0 ? 'good' : 'bad', true) + kpi('TIR', fl.tir == null ? '—' : P(fl.tir, 0), 'payback ' + anos(fl.pb), '', true) + kpi('Resultado mensal própria', R(s.cen.prop.resultado), (s.sel.id === 'D' ? 'com aluguel' : 'com manutenção, antes das parcelas') + ' · EMG ' + R(s.cen.emg.resultado), sinal(s.cen.prop.resultado) === 'pos' ? 'good' : 'bad', true) + kpi(s.sel.id === 'D' ? 'Aluguel' : 'Após a parcela', s.sel.id === 'D' ? R(s.D.aluguel) : R(s.ganhoMesComParcela + s.cen.emg.resultado), s.sel.id === 'D' ? s.D.n + ' meses · equilíbrio com C ' + R(s.D.equilibrioC) : 'parcela ' + R(s.sel.parcela) + ' · ' + (s.sel.id === 'C' && s.C.escolha ? esc(s.C.escolha.linha.nome.split(' – ')[0]) : 'HFS'), '', true) + kpi('VPL para o hospital', d(fl.vplEnt, b.vplEnt, mi), 'após parcelas ou aluguel · B ' + mi(s.flB.vplEnt) + ' · C ' + mi(s.flC.vplEnt) + ' · D ' + mi(s.flD.vplEnt), '', true) + kpi('Caixa acumulado', d(fl.acumEnt, b.acumEnt, mi), 'após parcelas ou aluguel, ' + sim.fin.horizonte + ' anos', '', true) + kpi('DSCR hospital ' + s.ent.linhas[0].ano, X(s.ent.linhas[0].dscrSem) + ' · ' + X(s.ent.linhas[0].dscrCom), 'sem TDC · com TDC', '', true) + (s.cenPACS ? kpi('PACS: com − sem', mi(s.cenPACS.delta[s.sel.id]), 'VPL para o hospital (' + s.sel.id + ') · cenário ' + (s.cenPACS.on ? 'com PACS' : 'sem PACS'), 'bad', true) : '') + (s.cenRM ? kpi('RM: com − sem', mi(s.cenRM.eq[s.sel.id].delta), 'VPL para o hospital (' + s.sel.id + ') · empata com ' + N(s.cenRM.eq[s.sel.id].volume) + ' exames/mês', s.cenRM.eq[s.sel.id].delta >= 0 ? 'good' : 'bad', true) : '');
    var n = Math.max(fl.anos.length, b.anos.length), cats = []; for (var i = 0; i < n; i++) cats.push(String(+model.fin.ano_inicio + i));
    $('#simChart').innerHTML = svgLines({ cats: cats, series: [{ nome: 'Premissas salvas', vals: cats.map(function (c, i) { return b.anos[i] ? b.anos[i].acumE : null; }), cor: 'var(--s-a)', dash: true }, { nome: 'Simulação', vals: cats.map(function (c, i) { return fl.anos[i] ? fl.anos[i].acumE : null; }), cor: 'var(--s-c)' }], fmt: function (v) { return mi(v); }, h: 230, aria: 'Simulação' });
    var al = alavancasSens(sim);
    var base = clone(sim); delete base._precoC;
    var sens = E.sensibilidade(base, M, BASE, al);
    $('#tornado').innerHTML = svgTornado(sens.itens, function (v) { return mi(v); }) + '<p class="small muted" style="margin-top:6px">VPL base da simulação: ' + mi(sens.base) + '. Barras vermelhas reduzem o VPL; verdes aumentam.</p>';
  }

  /* ================= PREMISSAS ================= */
  function fmtVal(s, v) { if (s.fmt === 'pct') return NF2.format(v * 100); if (s.fmt === 'int') return String(Math.round(v)); if (s.fmt === 'txt') return v; if (s.fmt === 'fx') return NF4.format(v); return NF2.format(v); }
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
    $$('#tab-premissas [data-prem]').forEach(function (inp) { inp.addEventListener('change', function () { var s = SCHEMA.filter(function (x) { return x.id === this.dataset.prem; }, this)[0]; var v = this.value; if (s.fmt === 'pct') v = parseBR(v) / 100; else if (s.fmt === 'int') v = Math.round(parseBR(v)); else if (s.fmt === 'num' || s.fmt === 'fx') v = parseBR(v); else if (s.ui && s.ui.choices && !isNaN(+v) && typeof s.def === 'number') v = +v; setPath(model, s.id, v); afterEdit(); }); });
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
      '<li><b>Fechadas com o CEO em 20/10/2026</b> (marcadas "CEO" em Premissas): a linha "médicos que usam a sala" (~R$ 133 mil/mês) são os radiologistas do diagnóstico, já incluídos; o material já está contabilizado (5,2%, cenário de 15% descartado); a equipe técnica está na folha do hospital (~R$ 184 mil/mês) e cobre a TC 24 h; o contrato com a EMG não tem multa e pede 90 dias de aviso; a sala da TC é reaproveitada; sala da RM de R$ 200 mil; RM aprovada em meados de 2027; RIS Touch Health e PACS Sectra Standard; SUS fora do modelo.</li>' +
      '<li><b>Folha da equipe técnica</b> (' + R(+model.base.cf_dir_mes || 0) + '/mês): detalhar quadro, escalas e cargos para ver se está superdimensionada. Cada 10% vale ~' + R((+model.base.cf_dir_mes || 0) * 0.1) + '/mês no resultado do serviço; não muda a escolha entre B, C e D, porque a equipe existe com ou sem a EMG.</li>' +
      '<li><b>Laudo</b>: de dia, os radiologistas do hospital; depois das 18 h, telelaudo, incluso nos 22,2% da receita (~' + R(calc.cen.prop.rep_med) + '/mês). Confirmar o contrato e o preço do telelaudo: sobra pouco além dos R$ 133 mil dos radiologistas. Cada ponto percentual vale ~R$ 74 mil/ano.</li>' +
      '<li><b>Aviso à EMG</b> (90 dias, sem multa): enviar só depois da aprovação do financiamento e com prazo de entrega firme, cerca de 90 dias antes da instalação (' + fmtMes(goLive()) + ' no modelo). O modelo não tem sobreposição de custos; o risco é a janela sem TC se a entrega atrasar depois do aviso.</li>' +
      '<li><b>Credenciamento CFI da TC Pulsar.</b> Em 14/10/2026 o Catálogo CFI do BNDES lista 16 itens da VMI Médica (Aquila, Apolo, Digimamo, Centauro, Fênix, Cignus), conferidos 1:1 com a tabela FINAME da VMI em 15/10/2026, e nenhuma TC. Premissa adotada (VMI, 15/10/2026): credenciamento até dez/2026; o modelo trata a Pulsar como credenciada e a publicação do código é condição para o FINAME.</li>' +
      '<li><b>Proposta VMI formal</b> com os preços de 15/10/2026 (pacote ' + mi(calc.C.capex) + '); especificação da Pulsar 128 frente à GE 64/128 Dual Energy (protocolo cardíaco); RX digital fixo (Apolo) ou portátil; CFI do ultrassom Invictus e da placa DR, que não aparecem no Catálogo CFI.</li>' +
      '<li><b>Manutenção</b>: cotação VMI para a Pulsar, o Apolo D e o Invictus (hoje estimadas por contratos públicos ou pelo Aquila D); confirmar se os valores do Aquila são mensais (equivalem a muito mais que os 5% a 12% a.a. usuais) e negociá-los no pacote; cotação da CDK para o RX do pacote GE.</li>' +
      '<li><b>Locação da VMI</b> (tabela de 16/10/2026, sugestão de 48 meses): manutenção inclusa no aluguel (confirmado em 17/10/2026). Falta confirmar se o RX digital locado é o Aquila D ou o Apolo D e cotar ultrassons e placa DR, hoje estimados por composição de custos.</li>' +
      '<li><b>FGTS-Saúde</b>: CEBAS na modalidade de 60% ao SUS, participação no Agora Tem Especialistas, créditos SUS dos últimos 12 meses e contratos já descontados do Teto MAC. Sem as respostas, a linha fica em "depende de confirmação". O programa também habilita a tabela SUS incrementada para TC.</li>' +
      '<li><b>RIS e PACS</b> (chave "PACS Sectra no modelo": hoje ' + (pacsOn() ? 'incluído' : 'fora do modelo') + (calc.cenPACS ? ', ' + mi(-calc.cenPACS.delta[calc.sel.id]) + ' de VPL em ' + calc.sel.id : '') + '): sugestão Touch Health (RIS, ' + R(+model.propria.rispacs_mes || 0) + '/mês e ' + R(+model.propria.rispacs_impl || 0) + ' de implantação) e Sectra PACS Standard (R$ ' + NF2.format(+model.propria.pacs_exame || 0) + ' por exame sobre os exames no modelo, o SUS só quando a chave o inclui, e ' + mi(+model.propria.pacs_impl || 0) + ' de setup e implantação). Os valores do PACS são estimativa S&S por benchmark de volume e tamanho médio de exame, não cotação; faixa de R$ 6,94 a 10,58 por exame. A S&S representa a Sectra no Brasil: declarar ao hospital.</li>' +
      '<li><b>SUS no modelo</b> (chave: hoje "' + susNome(E.susModo(model)) + '"): o padrão é fora, por decisão do CEO (20/10). ' + (calc.cenSUS ? 'Em ' + calc.sel.id + ': SUS atual (~' + N(calc.cenSUS.atual.exames) + ' exames/mês, já atendidos com a EMG) ' + sgMi(calc.cenSUS.dAtual[calc.sel.id]) + ', de ' + sgMi(Math.min(calc.cenSUS.dAtual[calc.sel.id], calc.cenSUS.dAtualOutroEmg[calc.sel.id])) + ' a ' + sgMi(Math.max(calc.cenSUS.dAtual[calc.sel.id], calc.cenSUS.dAtualOutroEmg[calc.sel.id])) + ' conforme o repasse da EMG; SUS a mais do Agora Tem Especialistas ' + sgMi(calc.cenSUS.dMais[calc.sel.id]) + '. ' : '') + 'Com o SUS fora, o PACS conta só os exames de convênio e particular.</li>' +
      '<li><b>Custo financeiro</b>: o motor é o mesmo da ferramenta Financiamento VMI. No BNDES Automático compara TLP, TFB (cotação do dia, fixa), Taxa LCD (Selic + sobretaxa) e Pré FAT, com a Taxa do BNDES do porte (média empresa: 0,75%), e mostra o mínimo e o máximo entre eles; escolhe o de menor custo total que cumpre o prazo e a carência pedidos (TFB vai até 120 meses e 12 de carência; Taxa LCD até 120 e 24). No FINAME, TLP e Pré FAT. ' + (calc.lcdAuto ? 'A sobretaxa LCD de ' + Pp(calc.lcdAuto.sob) + ' é premissa (a de out/2026 não foi obtida); a Taxa LCD no Automático só fica mais barata que a linha em uso (' + esc(calc.lcdAuto.refLinha) + ', ' + esc(rotCusto(calc.lcdAuto.refCusto)) + ') com sobretaxa abaixo de ' + Pp(calc.lcdAuto.empate) + '.' : '') + '</li>' +
      '<li><b>FIIS Saúde</b>: só para proponentes da Chamada Pública de 2025 (13/10 a 07/11/2025). ' + (calc.cenFIIS && calc.cenFIIS.pedido ? (calc.cenFIIS.marcado ? 'Inscrição marcada: o FIIS entra no ranking.' : 'Fora do plano até a confirmação; se o HDA tiver proposta habilitada, o VPL de C passa a ' + mi(calc.cenFIIS.pedido.vplC) + ' (' + (calc.cenFIIS.pedido.delta >= 0 ? '+' : '') + mi(calc.cenFIIS.pedido.delta) + ').') : '') + ' O FIIS financia equipamento para uso no SUS.</li>' +
      '<li><b>Mapa de empréstimos</b> é de dez/25; o saldo subiu de R$ 28,8 mi para R$ 29,5 mi em ago/26, o que indica renovações não capturadas.</li>' +
      '<li><b>Ressonância (Cignus 600, R$ 5,2 mi)</b>: o resultado depende de hipóteses ainda sem dado do hospital. Primeiro, do lado do HDA: negociar com os planos de saúde a volta da RM aos pacotes de reembolso, de onde ela saiu recentemente; sem isso, não há volume de convênio. Depois: volume (RMs pedidas hoje para fora; premissa ' + N(model.rm.exames_mes) + '/mês), ticket dos convênios (premissa ' + R(model.rm.ticket) + '), equipe, laudo, sala (R$ 200 mil, informado pelo CEO; referências públicas de pré-instalação, com gaiola de RF, são maiores), cotação de manutenção e de locação da VMI, e se o CFI 04252454 cobre a versão sem hélio. Preço acima das referências públicas (R$ 4,33 mi no FINAME da CEMAN; R$ 4,9 mi em Goiás).' + (calc.cenRM ? ' Hoje a RM ' + (calc.cenRM.eq.C.delta >= 0 ? 'soma ' : 'tira ') + mi(Math.abs(calc.cenRM.eq.C.delta)) + ' do VPL de C e empata com ' + N(calc.cenRM.eq.C.volume) + ' exames/mês.' : '') + '</li></ol></div>';
    h += '<div class="card"><div class="card-h"><h2>Inconsistências encontradas nos documentos</h2></div><ul class="bullets">' +
      '<li>Projeto Radiologia (Jaime): investimento total R$ 2.979.024,80 e parcela R$ 68.458,38; a soma das linhas dá R$ 2.934.024,80 e R$ 73.537,38 (valores usados aqui e pela Controladoria).</li>' +
      '<li>Placa DR: 60 × R$ 1.700 = R$ 102 mil, abaixo dos R$ 110 mil à vista. RX portátil em 60x "sem juros".</li>' +
      '<li>Proposta Estratégica: TC "64/128 canais" na seção 4 e "80/160" na conclusão; RX portátil com DR a R$ 500 mil (vs R$ 490 mil); placa DR a R$ 100 mil (vs R$ 110 mil); parcela da TC R$ 50.527,32 (vs R$ 50.524,32).</li>' +
      '<li>Planilha Viabilidade v2: a aba DRE mostra R$ 162 mil/mês para a imagem própria e a aba Viabilidade R$ 131 mil, porque a primeira omite manutenção e RIS/PACS no cenário de volume atual.</li>' +
      '<li>O ROI de 101,8% e o payback de 11,8 meses do Jaime usam o lucro operacional de ago/26 (perímetro diferente, R$ 490 mil de receita) sem descontar o resultado atual nem as parcelas; não são comparáveis aos indicadores incrementais desta página.</li></ul></div>';
    h += '<div class="card"><div class="card-h"><h2>Fórmulas</h2></div><dl class="defs">' +
      '<dt>Reajuste</dt><dd>Índice do ano = produto de (1 + IPCA projetado pelo Focus) do ano 2 até o ano; o ano 1 fica nos preços da base. Vale igual para receita, custos, manutenção e aluguel em todos os caminhos. As parcelas são nominais (a TLP do FINAME já carrega o IPCA projetado). Com taxa fixa: (1 + reajuste)^(ano − 1).</dd>' +
      '<dt>Receita líquida</dt><dd>exames/mês × ticket × (1 − glosa) × índice de reajuste do ano; exames = base/meses × (1 + variação) × (1 + crescimento)^(ano − 2)</dd>' +
      '<dt>EBITDA EMG</dt><dd>RL − Mat/Med − repasses (médicos, material, biópsias, sala) − fixos diretos − indiretos</dd>' +
      '<dt>EBITDA própria</dt><dd>RL − Mat/Med própria − repasse médico próprio − repasses mantidos − fixos diretos − RIS (mensalidade) − PACS (R$ por exame × exames no modelo: convênio e particular, mais o SUS quando a chave o inclui; zero com a chave "sem PACS") − indiretos (antes de manutenção e aluguel)</dd>' +
      '<dt>SUS (chave "SUS no modelo")</dt><dd>Fora: nada do SUS entra; o valor do SUS a mais é mostrado à parte. SUS atual: exames SUS de hoje × valor SIGTAP × (1 − glosa), nos dois modelos; na EMG, o repasse sobre essa receita segue a premissa (mesmos percentuais do convênio ou nenhum); na própria, laudo, material e PACS. + Agora Tem Especialistas: soma, só na própria, as TCs (e as RMs, com RM) do programa × valor do programa × (1 − glosa) × (1 − laudo − material) − PACS, desde o go-live e desde a operação da RM.</dd>' +
      '<dt>EBITDA incremental</dt><dd>(EBITDA própria − EBITDA EMG) × 12 × fração do ano em operação própria − manutenção do ano (B, C) ou aluguel do ano (D)</dd>' +
      '<dt>Manutenção (B, C)</dt><dd>Σ itens (contrato Ouro, ou Prata + provisão de tubo da TC) × quantidade × fator × meses do ano após a garantia × reajuste. A garantia conta da instalação (mês ' + ((+model.fin.inicio_op_mes || 0) + 1) + ' do ano 1).</dd>' +
      '<dt>Aluguel (D)</dt><dd>Itens com cotação da VMI (16/10/2026: TC, Aquila S, Aquila D, 12 a 84 meses; prazos intermediários por interpolação linear): aluguel cotado × quantidade, mais, se a cotação não incluir manutenção, contrato do plano escolhido × (n − garantia) ÷ n. Itens sem cotação: (valor − residual ÷ (1 + i)^n) × i ÷ (1 − (1 + i)^−n) ÷ (1 − tributos) + contrato Ouro × (n − garantia) ÷ n; i = taxa mensal do locador (arrendamento PJ + prêmio), n = prazo, residual = valor × (1 − queda anual)^(n/12). Taxa implícita da cotação: a mesma fórmula resolvida para i. Cobrado desde a instalação e renovado ao mesmo valor até o fim do horizonte.</dd>' +
      '<dt>Locar × comprar no prazo</dt><dd>VP dos aluguéis contra VP de comprar e usar pelo mesmo prazo: entrada + parcelas até o mês n + saldo devedor no mês n + manutenção Ouro após a garantia − valor de mercado no mês n, à taxa de desconto. Aluguel de equilíbrio: o que iguala os dois (no prazo) ou iguala o VPL para o hospital de D ao de C (no horizonte).</dd>' +
      '<dt>Fluxo do projeto</dt><dd>−capex no ano 0 (equipamentos do pacote + implantação de RIS e PACS; a RM no ano da aprovação e da entrega); EBITDA incremental − tributos sobre (EBITDA − depreciação) + residual no último ano</dd>' +
      '<dt>Fluxo para o hospital</dt><dd>ano 0: −(capex − valor financiado) − IOF − tarifas; anos seguintes: EBITDA incremental − tributos − parcelas</dd>' +
      '<dt>VPL, TIR, payback</dt><dd>VPL a valor presente pela taxa de desconto; TIR por bissecção; payback com interpolação linear dentro do ano (igual à planilha)</dd>' +
      '<dt>DSCR</dt><dd>EBITDA do ano ÷ parcelas do ano (projeto) · (EBITDA anualizado do hospital + incremental) ÷ (serviço da dívida atual + novo) (entidade)</dd>' +
      '<dt>Financiamento C</dt><dd>Motor da ferramenta Financiamento VMI: taxa anual = (1 + custo financeiro) × Π(1 + spread) − 1; cronograma mensal SAC ou Price com carência; IOF PJ; CET por TIR do fluxo líquido. Elegibilidade por natureza, porte, UF, CFI e condições de cada linha.</dd>' +
      '<dt>Alternativa B</dt><dd>Parcelas informadas pelos fornecedores por 60 meses; taxa implícita por item resolvida pela anuidade. RM sem proposta GE: parcela = preço × i ÷ (1 − (1 + i)^−60), com i = taxa implícita dos demais itens financiados.</dd>' +
      '<dt>Ressonância (cenário com RM)</dt><dd>Serviço novo, todo incremental. Aprovação em ' + fmtMes(model.rm.aprovacao) + ' + ' + N(+model.rm.prazo_instalacao || 0) + ' meses de compra e instalação = operação a partir de ' + fmtMes(E.mesRMStr(model)) + '. Exames = regime × rampa do mês de operação (1º ano, 2º ano, depois 100%). Receita líquida = exames de convênio e particular × ticket × (1 − glosa) × reajuste (sem SUS). EBITDA da RM = RL − laudo − contraste e material − PACS por exame − (equipe + energia + outros) × reajuste. Somado ao EBITDA incremental; a manutenção (B, C) e o aluguel (D) da RM contam desde a instalação da RM. Sala no ano da aprovação, com recurso próprio; equipamento na entrega, financiado em C por um segundo contrato na mesma linha e nas mesmas condições do pacote, liberado na entrega. Aluguel da RM em D = preço da RM × aluguel VMI da TC ÷ preço da TC, no mesmo prazo. Equilíbrio: o VPL para o hospital é linear no volume, no ticket e no preço da RM; o volume (ou ticket, ou preço) de equilíbrio é o que iguala o VPL com RM ao VPL sem RM.</dd></dl></div>';
    h += '<div class="card"><div class="card-h"><h2>Fontes</h2></div><ul class="src-list">' +
      '<li>Controladoria HDA, "Cópia de Viabilidade - Central de Imagem Própria v2.xlsx" (abas DRE, Viabilidade, Informações - Validar), base jan–jun/26.</li>' +
      '<li>Jaime (coordenação do serviço de imagem), "Projeto Radiologia JGB" (volumes 2025–2026, DRE ago/26, investimento) e "Proposta Estratégica de Renovação do Parque Tecnológico".</li>' +
      '<li>ABENSENA, "Reunião Conselho: Estratégia para 2026, Orçamento, Situação em agosto" (balanços 2024–2026, DRE gerencial jan–ago/26, mapa de empréstimos dez/25, TDC).</li>' +
      '<li>E-mail do CEO do HDA (out/26): histórico da terceirização, estimativa de R$ 300 mil/mês da EMG, mudança de cultura.</li>' +
      '<li>Tabela de locação da VMI, 16/10/2026: TC, Aquila S e Aquila D, 12 a 84 meses (R$/mês por unidade), sugestão de 48 meses.</li>' +
      '<li>Ferramenta Financiamento VMI (S&S), base de linhas de 26/10/2026 (levantamento de 09/10; custos financeiros e FIIS revistos em 26/10): BNDES Finame (TLP e Pré FAT) e Automático (TLP, TFB de 26/10/2026, Taxa LCD com sobretaxa de 0,50% como premissa e Pré FAT, por porte; página do produto de 16/10/2026), FIIS Saúde indireto e direto (Manual da Chamada Pública de 10/10/2025 e apresentação MS/BNDES; só para proponentes da chamada de 2025; 12 operações de saúde contratadas em 2026 nos dados abertos), FGTS-Saúde (Res. CCFGTS 1.152/2026, Lei 15.486/2026, Manual de Fomento FGTS Saúde v002 de 11/08/2026 e Circular CAIXA 1.121/2026; premissas de André Matheus, S&S, 16/10/2026), fundos constitucionais, BCB (Selic, TLP, Pm/PMm, TR, séries 20729/20732), BNDES Dados Abertos (spreads contratados CNAE 86), Decreto 6.306/2007 (IOF).</li>' +
      '<li>VMI Médica: Pulsar 32/64/128 (24/32/64 canais; 32/64/128 cortes), Aquila 320/500 S e D (RX móvel), Apolo D (RX fixo digital). <a href="https://vmimedica.com/" target="_blank" rel="noopener">vmimedica.com</a>. Preços informados pela VMI em 15/10/2026: Pulsar 128/64 R$ 1.950.000; ultrassom portátil Invictus R$ 117.000; Aquila (RX analógico) R$ 139.000; Apolo (RX digital) R$ 290.000; placa DR avulsa R$ 107.000.</li>' +
      '<li>Catálogo CFI do BNDES, consulta por CNPJ do fabricante em 14/10/2026 (VMI Médica 02.659.246/0001-03; Alfa Med 11.405.384/0001-49; GE Healthcare do Brasil 00.029.372/0001-40). <a href="https://ws.bndes.gov.br/cfi_catalogo/" target="_blank" rel="noopener">ws.bndes.gov.br/cfi_catalogo</a></li>' +
      '<li>Portaria SAES/MS 4.282/2026 (Agora Tem Especialistas), via <a href="https://www.conass.org.br/?p=57841" target="_blank" rel="noopener">Conass</a>; IN RFB 1.700/2017 (vida útil de 10 anos).</li>' +
      '<li>VMI Médica, contratos de manutenção Prata e Ouro do Aquila S e D, média São Paulo (mensagem de 15/10/2026).</li>' +
      '<li>Portal Nacional de Contratações Públicas (PNCP), contratos de manutenção de TC e ultrassom e de locação de TC e RX móvel, 2023–2026: ' + BENCH_MANUT.concat(BENCH_LOC).map(function (b) { return '<a href="' + b.url + '" target="_blank" rel="noopener">' + esc(b.org) + ' (' + b.ano + ')</a>'; }).join('; ') + '.</li>' +
      '<li>Banco Central, taxa média PJ de arrendamento mercantil de outros bens, SGS 20732, ago/2026 (17,19% a.a.). <a href="https://api.bcb.gov.br/dados/serie/bcdata.sgs.20732/dados/ultimos/3?formato=json" target="_blank" rel="noopener">BCB</a></li>' +
      '<li>STF, Súmula Vinculante 31 (ISS não incide sobre locação de bens móveis); EC 132/2023 e LC 214/2025 (CBS em lugar de PIS/COFINS a partir de 2027).</li>' +
      '<li>Ressonância: preço da Cignus 600 sem hélio, 24 canais, informado em 19/10/2026 (R$ 5,2 mi); CFI 04252454 (Catálogo CFI do BNDES; contrato FINAME da CEMAN a R$ 4,33 mi); pregões da SES-GO de 2024 e 2025 (R$ 4,89 e 4,93 mi). Consumo de energia: Heye et al., <a href="https://irf.fhnw.ch/handle/11654/33447" target="_blank" rel="noopener">The energy consumption of radiology</a>, Radiology 2020 (134 MWh/ano por RM). Obra de pré-instalação: <a href="https://fas.org.br/wp-content/uploads/2026/06/Edital-e-Termo-de-Referencia-RM-1.pdf" target="_blank" rel="noopener">edital da FAS Niterói (2026)</a>. Locação de RM 1,5T: <a href="https://prefeitura.sp.gov.br/documents/d/saude/termo_contrato_emergencial_090_24_tr_samir_p-pdf" target="_blank" rel="noopener">contrato emergencial 090/2024 da SMS São Paulo</a>. Valor SUS: SIGTAP e Portaria SAES/MS 4.282/2026; credenciamento de RM da <a href="https://saude.es.gov.br/Media/sesa/Credenciamento/01_TR_RESSONANCIA_MAGNETICA_01_2022_%20Assinado-1.pdf" target="_blank" rel="noopener">SESA-ES</a> (R$ 268,75 por exame). Produtividade: SMS Joinville (30 min por exame). Ticket particular: <a href="https://www.unimed.coop.br/site/documents/512303/0/Tabela+Exames+-+Particular_Unimed.pdf/67ad6f46-9128-cf33-6578-fe35a803f9f4" target="_blank" rel="noopener">tabela de exames particular no portal da Unimed</a> (sem data). Uso de RM e TC na saúde suplementar: Mapa Assistencial da ANS 2024, via <a href="https://futurodasaude.com.br/?p=40406" target="_blank" rel="noopener">Futuro da Saúde</a>.</li></ul>' +
      '<p class="small muted" style="margin-top:10px">Honorário de intermediação da S&S na compra financiada (C): ' + P(+model.altC.honorario_pct || 0, 2) + ' do valor financiado, pago pelo hospital a cada desembolso, com o retainer de R$ 30 mil abatido (' + R(calc.C.honor || 0) + (calc.C.honorRM ? ': ' + R(calc.C.honorPacote) + ' no pacote, no ano 0, e ' + R(calc.C.honorRM) + ' na RM, na liberação em ' + fmtMes(calc.C.rmFin.inicio) : ', lançado no ano 0') + '). Contrato S&S × HDA, Revisão 1.1. Não há taxa de êxito na locação (D) nem no pacote GE (B); se o hospital assinar o contrato e optar por B ou D, paga só o retainer de R$ 30 mil, que não entra nos fluxos.</p></div>';
    $('#tab-metodo').innerHTML = h;
  }

  /* ================= render geral ================= */
  function renderAll() {
    renderTese(); renderDiagnostico(); renderAlternativas(); renderNumeros(); renderInvest(); renderCredito(); renderPremissas(); renderMetodo();
    if (tab === 'simulador') { sim = clone(model); recomputeSim(); renderSimulador(); }
    renderSync();
    if (typeof apAtualizar === 'function') apAtualizar();
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
  var CURTO = { tc: 'TC Pulsar 128/64', us: 'ultrassons Invictus', rxp: 'Aquila 320 S', rxdr: 'Apolo D', dr: 'placa DR avulsa', rm: 'RM Cignus 600' };
  function curto(id, nome) { return CURTO[id] || nome; }
  function mesIdxStr(i) { var y = +model.fin.ano_inicio + Math.floor(i / 12), mo = (i % 12) + 1; return y + '-' + ('0' + mo).slice(-2); }
  function goLive() { return mesIdxStr(+model.fin.inicio_op_mes || 0); }
  function fmtMes(s) { var mm = /^(\d{4})-(\d{2})/.exec(String(s || '')); return mm ? ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][+mm[2] - 1] + '/' + mm[1] : String(s || ''); }
  function linhaCurta(l) { if (!l) return 'linha de fomento'; if (/^finame/.test(l.id)) return 'o FINAME'; if (/^fgts/.test(l.id)) return 'o FGTS-Saúde'; return l.nome.split(' – ')[0]; }
  function origemTxt() {
    var vv = vendoVersao ? versoes.filter(function (x) { return x.id === vendoVersao; })[0] : null;
    return vendoVersao ? 'versão congelada "' + ((vv && vv.nome) || vendoVersao) + '"' : dirty ? 'premissas em edição (não salvas)' : 'premissas salvas' + (ultimoSalvoEm ? ' em ' + new Date(ultimoSalvoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '');
  }
  /* FGTS-Saúde: situação pelas respostas do caso (elegível, depende de confirmação ou fora) */
  function fgtsEstado() {
    var fg = calc.C.av.todas.filter(function (x) { return x.linha.id === 'fgts-saude'; })[0], fl = (model.cliente && model.cliente.flags) || {};
    if (!fg) return { st: 'na', txt: '' };
    if (fg.el.ok) return { st: 'ok', fg: fg, txt: 'elegível com as respostas informadas' };
    if (fg.condicional) return { st: 'cond', fg: fg, txt: 'depende de confirmar CEBAS na modalidade de 60% ao SUS e os créditos SUS de 12 meses' };
    var mot = [];
    if (model.cliente.natureza !== 'filantropica') mot.push('linha só para filantrópicas');
    if (fl.cebas_sus60 === 'nao') mot.push('sem CEBAS na modalidade de 60% ao SUS');
    if (!Number(fl.sus_complementar)) mot.push('fora do Agora Tem Especialistas');
    if (!mot.length) mot = fg.el.bloqueios.slice(0, 2);
    return { st: 'fora', fg: fg, txt: 'fora: ' + mot.join('; ') };
  }
  function sumarioExecutivo() {
    var c = calc, m = model, H = +m.fin.horizonte, emg = c.cen.emg, prop = c.cen.prop, lt = locTxt();
    var alts = [{ id: 'B', nome: 'B · comprar o pacote GE (HFS 60x)', fl: c.flB, alt: c.B }, { id: 'C', nome: 'C · comprar o pacote VMI com ' + linhaCurta(c.C.escolha && c.C.escolha.linha), fl: c.flC, alt: c.C }, { id: 'D', nome: 'D · alugar o pacote VMI (' + c.D.n + ' meses)', fl: c.flD, alt: c.D }];
    var ord = alts.slice().sort(function (a, b) { return b.fl.vplEnt - a.fl.vplEnt; }), best = ord[0], selId = c.sel.id;
    var ano3 = function (fl) { var a = fl.anos[Math.min(2, fl.anos.length - 1)]; return (a.servico + a.opex) / 12; };
    var e27 = function (id) { var e = c.entAlt && c.entAlt[id]; return e && e.linhas[0] ? e.linhas[0].dscrSem : null; };
    var l1 = c.ent.linhas[0], fg = c.C.av.todas.filter(function (x) { return x.linha.id === 'fgts-saude'; })[0];
    var quando = new Date(), dt = quando.toLocaleDateString('pt-BR') + ' ' + quando.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    var origem = origemTxt();
    function vplCom(f, id) { var mm = clone(model); f(mm); var r = E.calcular(mm, M, BASE, { leve: true }); return (id === 'B' ? r.flB : id === 'D' ? r.flD : id === 'C' ? r.flC : r.flSel).vplEnt; }
    var S = { titulo: 'Internalização do serviço de imagem do Hospital Dom Alvarenga', sub: 'Sumário executivo · gerado em ' + dt + ' · ' + origem + ' · ' + H + ' anos a ' + P(m.fin.desconto, 0) + ' a.a.', secoes: [] };
    /* 1. recomendação */
    var rec = '**Internalizar o serviço.** Manter a EMG custa ' + mi(-emg.resultado * 12) + ' por ano de prejuízo; com imagem própria o resultado vai a ' + R(prop.resultado) + '/mês. Com as premissas atuais, a melhor alternativa é **' + best.nome + '**, com VPL para o hospital de ' + mi(best.fl.vplEnt) + ' em ' + H + ' anos, contra ' + ord.slice(1).map(function (a) { return mi(a.fl.vplEnt) + ' em ' + a.id; }).join(' e ') + '.';
    if (best.id === 'D') rec += ' A locação também dispensa investimento e dívida nova num momento em que o hospital cobre ' + X(l1.dscrSemProj) + ' do serviço da dívida, e o aluguel da VMI já inclui a manutenção.';
    if (best.id !== selId) rec += ' O plano em números está montado sobre a alternativa ' + selId + '.';
    var gap = ord[0].fl.vplEnt - ord[1].fl.vplEnt;
    if (gap < 0.05 * Math.abs(ord[0].fl.vplEnt)) rec += ' A diferença para ' + ord[1].id + ' é pequena (' + mi(gap) + '): a escolha depende das pendências abaixo, não do VPL.';
    var qR = c.cenRM, rmLig = rmOn();
    if (qR) {
      var eqR = qR.eq[selId], semBest = ['B', 'C', 'D'].sort(function (a, b) { return qR.sem[b].vplEnt - qR.sem[a].vplEnt; })[0];
      rec += rmLig ? ' Os números incluem a **ressonância** (Cignus 600, ' + mi(qR.p0) + ', mais ' + mi(+m.rm.obra || 0) + ' para a sala; aprovação em ' + fmtMes(m.rm.aprovacao) + ', operação a partir de ' + fmtMes(E.mesRMStr(m)) + '). Sem a RM, o VPL de ' + selId + ' seria ' + mi(qR.sem[selId].vplEnt) + ' (melhor alternativa: ' + semBest + ', ' + mi(qR.sem[semBest].vplEnt) + '): com as hipóteses atuais a RM tira ' + mi(-eqR.delta) + ' e só empata com ' + N(eqR.volume) + ' exames/mês. Tratar a RM como decisão separada, depois de o HDA negociar com os planos de saúde a volta da RM aos pacotes de reembolso, de validar a demanda e de negociar o preço.'
        : ' Os números não incluem a ressonância. Com a Cignus 600 (' + mi(qR.p0) + ' e ' + mi(+m.rm.obra || 0) + ' para a sala, aprovada em ' + fmtMes(m.rm.aprovacao) + '), o VPL de ' + selId + ' iria a ' + mi(qR.com[selId].vplEnt) + ' (' + Psig(eqR.delta / Math.abs(qR.sem[selId].vplEnt || 1), 0) + '); a RM empata com ' + N(eqR.volume) + ' exames/mês e depende de o HDA reincluir a RM nos pacotes de reembolso dos planos de saúde.';
    }
    if (c.cenPACS) { var qp = c.cenPACS; rec += pacsOn() ? ' Os números incluem o **PACS Sectra** pela estimativa S&S, ainda sem cotação (R$ ' + NF2.format(qp.exame) + ' por exame e ' + mi(qp.impl) + ' de implantação); sem ele, o VPL de ' + selId + ' seria ' + mi(qp.sem[selId].vplEnt) + '. O PACS custa o mesmo nas três alternativas: muda o tamanho do ganho, não a escolha.' : ' Os números **não incluem o PACS Sectra** (sem cotação); com a estimativa S&S (R$ ' + NF2.format(qp.exame) + ' por exame e ' + mi(qp.impl) + ' de implantação), o VPL de ' + selId + ' cairia a ' + mi(qp.com[selId].vplEnt) + '. O hospital vai precisar de um PACS: este número é o teto.'; }
    var sgn = function (v) { return (v >= 0 ? '+' : '') + mi(v); };
    if (c.cenSUS) { var qs = c.cenSUS; rec += E.susModo(m) === 'fora' ? ' O SUS está fora do número, por decisão do CEO; o SUS que o hospital já atende mudaria o VPL de ' + selId + ' em ' + sgn(qs.dAtual[selId]) + ' (de ' + sgn(Math.min(qs.dAtual[selId], qs.dAtualOutroEmg[selId])) + ' a ' + sgn(Math.max(qs.dAtual[selId], qs.dAtualOutroEmg[selId])) + ', conforme o repasse da EMG), e o SUS a mais do Agora Tem Especialistas somaria ' + sgn(qs.dMais[selId]) + '.' : ' O número inclui o ' + susNome(E.susModo(m)) + ' (chave do SUS); com o SUS fora, como decidiu o CEO, o VPL de ' + selId + ' seria ' + mi(qs.v.fora[selId].vplEnt) + '.'; }
    S.secoes.push({ h: 'Recomendação', p: ['**Objetivo do CEO:** transformar o HDA num centro boutique de referência em imagem, com Sectra, Integrare e equipamentos modernos.', rec] });
    /* 2. por que */
    S.secoes.push({ h: 'Por que internalizar', b: [
      'Hoje (EMG): receita líquida de ' + R(emg.rl) + '/mês, repasses de ' + R(emg.repasse) + ' (' + P(emg.repasse / emg.rl, 0) + ' da receita) e resultado de ' + R(emg.resultado) + '/mês.',
      'Imagem própria em regime: resultado de ' + R(prop.resultado) + '/mês, já com ' + (selId === 'D' ? lt.custo + ' dos equipamentos' : 'manutenção pós-garantia') + ', ' + (pacsOn() ? 'RIS (Touch Health) e PACS Sectra' : 'RIS (Touch Health), com o PACS fora do modelo') + ', antes das parcelas. Ganho de ' + mi(c.ganhoMes * 12) + ' por ano.',
      'VPL do projeto (alternativa ' + selId + '): ' + mi(c.flSel.vpl) + (selId !== 'D' && c.flSel.tir != null ? ', TIR ' + P(c.flSel.tir, 0) : '') + ', payback de ' + anos(c.flSel.pb) + '.'
    ] });
    /* 3. alternativas */
    S.secoes.push({ h: 'Alternativas', t: { head: ['', 'B · GE, compra', 'C · VMI, compra', 'D · VMI, locação'], rows: [
      ['Investimento em equipamentos', R(c.B.capex), R(c.C.capex), 'R$ 0'],
      ['Dívida nova', R(c.B.capexFin) + ' (fornecedor)', R(c.C.capexFin), 'nenhuma'],
      ['Compromisso mensal no ano 3', R(ano3(c.flB)), R(ano3(c.flC)), R(ano3(c.flD))],
      ['VPL para o hospital, ' + H + ' anos', mi(c.flB.vplEnt), mi(c.flC.vplEnt), mi(c.flD.vplEnt)],
      ['Caixa acumulado, ' + H + ' anos', mi(c.flB.acumEnt), mi(c.flC.acumEnt), mi(c.flD.acumEnt)],
      ['DSCR ' + l1.ano + ' do hospital com o projeto', X(e27('B')), X(e27('C')), X(e27('D'))],
      ['Câmbio', c.B.fx.ids.length ? 'US$ a ' + FXr(c.B.fx.usd) + ', parcelas ' + (c.B.fx.dolar ? 'atreladas' : 'fixas') : 'nenhum', 'nenhum (R$)', 'nenhum (R$)']
    ] }, p: [(qR ? (rmLig ? 'Cenário com RM. ' : 'Cenário sem RM. ') : '') + 'Compromisso mensal = parcelas + manutenção (B e C) ou aluguel' + (lt.sep ? ' e manutenção' : '') + ' (D). Na compra, B e C chegam ao ano ' + H + ' com o equipamento original; na locação, o equipamento é trocado a cada ' + c.D.n + ' meses.', fxFrase()] });
    /* 3b. ressonância */
    if (qR) {
      var rr = m.rm, ri = c.rm.isolada, regR = E.rmMensal(m, 2, 1), dsc = function (x) { return X(x.dscr[0].v) + ' / ' + X(x.dscr[1].v); };
      S.secoes.push({ h: 'Ressonância magnética: com e sem', t: { head: ['', 'B · GE, compra', 'C · VMI, compra', 'D · VMI, locação'], rows: [
        ['VPL para o hospital, sem RM', mi(qR.sem.B.vplEnt), mi(qR.sem.C.vplEnt), mi(qR.sem.D.vplEnt)],
        ['VPL para o hospital, com RM', mi(qR.com.B.vplEnt), mi(qR.com.C.vplEnt), mi(qR.com.D.vplEnt)],
        ['Dívida nova, sem → com RM', mi(qR.sem.B.fin) + ' → ' + mi(qR.com.B.fin), mi(qR.sem.C.fin) + ' → ' + mi(qR.com.C.fin), 'nenhuma'],
        ['DSCR ' + qR.sem.C.dscr[0].ano + ' / ' + qR.sem.C.dscr[1].ano + ', sem RM', dsc(qR.sem.B), dsc(qR.sem.C), dsc(qR.sem.D)],
        ['DSCR ' + qR.com.C.dscr[0].ano + ' / ' + qR.com.C.dscr[1].ano + ', com RM', dsc(qR.com.B), dsc(qR.com.C), dsc(qR.com.D)],
        ['Volume de equilíbrio da RM (exames/mês)', N(qR.eq.B.volume), N(qR.eq.C.volume), N(qR.eq.D.volume)]
      ] }, b: [
        'Premissas da RM (hipóteses a validar): ' + N(rr.exames_mes) + ' exames/mês de convênio e particular em regime a ' + R(rr.ticket) + ' (' + (E.susAteOn(m) ? 'mais ' + N((m.sus || {}).rm_mes) + ' RMs/mês do SUS pelo Agora Tem Especialistas' : 'sem SUS') + '); aprovação em ' + fmtMes(rr.aprovacao) + ' e operação a partir de ' + fmtMes(E.mesRMStr(m)) + '; ' + P(rr.rampa1, 0) + ' do volume no 1º ano de operação e ' + P(rr.rampa2, 0) + ' no 2º; laudo a ' + P(rr.rep_med_pct, 1) + ' e contraste a ' + P(rr.matmed_pct, 0) + ' da receita; equipe, energia e outros fixos de ' + R(+rr.equipe_mes + +rr.energia_mes + +rr.outros_mes) + '/mês; manutenção Ouro de ' + R(ri ? ri.manutMes : +((rmItem('C') || {}).m_ouro) || 0) + '/mês depois da garantia; sala de ' + mi(+rr.obra || 0) + ' no ano da aprovação.',
        'Em regime, a RM gera ' + R(regR.ebitda) + '/mês de EBITDA antes da manutenção. Capacidade de ' + N(qR.cap.cap) + ' exames/mês em ' + N(+rr.horas_dia || 12) + ' h; a premissa ocupa ' + P(qR.cap.ocup, 0) + '.' + (ri ? ' Sozinha, sem financiamento: VPL de ' + mi(ri.vpl) + (ri.tir != null ? ', TIR de ' + P(ri.tir, 1) : '') + ', payback de ' + anos(ri.pb) + '.' : ''),
        'Em C, a RM empata com ' + N(qR.eq.C.volume) + ' exames/mês, ou ticket de ' + R(qR.eq.C.ticket) + ', ou preço de ' + mi(qR.eq.C.preco) + '. Preço informado acima das referências públicas: R$ 4,33 mi no contrato FINAME da CEMAN e R$ 4,9 mi nos pregões de Goiás.',
        'Com a RM, a compra pelo FINAME (C) é a forma de pagar que menos pesa na cobertura (carência de 24 meses e 120 de prazo); na locação, o aluguel da RM (proxy da tabela da TC, ' + R(c.D.loc.aluguelProxy || (qR.com.D.comp1 - qR.sem.D.comp1)) + '/mês) corre desde a instalação.'
      ] });
    }
    /* 4. compra C */
    var sC = c.C.escolha, fgTxt;
    if (!fg) fgTxt = '';
    else if (fg.el.ok) fgTxt = 'FGTS-Saúde modalidade I: elegível com as respostas informadas' + (fg.el.margemSus ? ' (margem SUS de ' + R(fg.el.margemSus.liquida) + '/mês)' : '') + '.';
    else if (fg.condicional) fgTxt = 'FGTS-Saúde modalidade I (60 meses, sem carência): depende de confirmar CEBAS na modalidade de 60% ao SUS e os créditos SUS de 12 meses; exigiria ' + (sC ? 'pelo menos ' + R(((fg.sim ? fg.sim.rows.reduce(function (a, r) { return Math.max(a, r.parcela); }, 0) : 0)) / 0.35 * 12) + ' de créditos SUS em 12 meses' : 'margem no Teto MAC') + '. Com o SUS em cerca de 20% do hospital, é improvável.';
    else fgTxt = 'FGTS-Saúde: fora (' + fg.el.bloqueios.join('; ') + ').';
    var semCfi = m.equip.C.filter(function (it) { return !String(it.cfi || '').trim(); }).map(function (it) { return curto(it.id, it.nome); }), prevCfi = m.equip.C.filter(function (it) { return /previsto/i.test(it.cfi || ''); }).map(function (it) { return curto(it.id, it.nome) + ' (' + String(it.cfi).replace(/^previsto\s*/i, 'previsto para ') + ')'; });
    var cfiTxt = semCfi.length || prevCfi.length ? 'CFI: ' + (prevCfi.length ? prevCfi.join(', ') + ' ainda sem código' : '') + (prevCfi.length && semCfi.length ? '; ' : '') + (semCfi.length ? semCfi.join(' e ') + ' fora do catálogo (' + R(c.C.cfi ? c.C.cfi.sem : 0) + ')' : '') + '. O FINAME do pacote inteiro depende de todos os códigos publicados.' : '';
    S.secoes.push({ h: 'Compra do pacote VMI (C)', b: [
      sC ? 'Linha em uso: **' + sC.linha.nome + '**, CET de ' + Pp(c.C.cetAno) + ' a.a., ' + c.C.n + ' meses com ' + (c.C.c || 0) + ' de carência; parcela de ' + R(c.C.primeira) + ' na carência e ' + R(c.C.parcela) + ' depois' + (c.C.rmFin ? ' (' + R(c.C.parcelaPacote) + ' do pacote e ' + R(c.C.parcelaRM) + ' da RM, em contrato próprio liberado na entrega, em ' + fmtMes(c.C.rmFin.inicio) + ')' : '') + '. Pacote de ' + mi(c.C.capex) + ' (preços VMI de 15/10/2026' + (rmLig ? '; RM de 19/10/2026' : '') + ').' : 'Nenhuma linha elegível com as premissas atuais.',
      'Manutenção pós-garantia, plano ' + (c.C.manut.plano === 'prata' ? 'Prata' : 'Ouro') + ': ' + R(c.C.manut.mes) + '/mês a partir do mês ' + (m.manut.garantia_meses + 1) + ' de operação' + (rmLig ? ' (na RM, ' + R(c.rm.opex.C) + '/mês, contados da instalação da RM)' : '') + '.' + (sC && c.C.honor ? ' Honorário de intermediação da S&S: ' + R(c.C.honor) + ' (' + P(+m.altC.honorario_pct, 2) + ' do financiado' + (c.C.honorRM ? '; ' + R(c.C.honorRM) + ' na RM' : '') + '), pago pelo hospital na contratação e já incluído no resultado.' : ''),
      fgTxt, cfiTxt
    ].filter(Boolean) });
    /* 5. locação D */
    var vplFlip = vplCom(function (mm) { mm.altD.vmi_manut = lt.sep ? 'sim' : 'nao'; }, 'D'), L = c.D.loc;
    S.secoes.push({ h: 'Locação do pacote VMI (D)', b: [
      'Base: ' + lt.base + '. Prazo de ' + c.D.n + ' meses' + (c.D.n === 48 ? ' (sugestão da VMI)' : '') + ': custo de ' + R(c.D.aluguel) + '/mês' + (lt.vmi ? ', sendo ' + R(L.aluguelVmi) + ' de aluguel VMI (TC, Aquila S e Aquila D)' + (lt.sep ? ', ' + R(L.manSep) + ' de manutenção à parte (média no prazo)' : '') + (L.nProxy ? ', ' + R(L.aluguelProxy) + ' da RM pelo proxy da TC' : '') + ' e ' + R(L.aluguelComp) + ' dos itens sem cotação' : '') + (lt.vmi && !lt.sep ? '. O aluguel VMI já inclui a manutenção' : '') + '.',
      (lt.sep ? '**Cenário com manutenção à parte**: o VPL de D é ' + mi(c.flD.vplEnt) + '; com a manutenção inclusa, como a VMI confirmou, seria ' + mi(vplFlip) + '.' : '**Manutenção inclusa no aluguel** (confirmado em 17/10/2026): não há contrato à parte. Se fosse cobrada depois da garantia, o VPL de D cairia de ' + mi(c.flD.vplEnt) + ' a ' + mi(vplFlip) + '.') + ' O aluguel do Aquila S com manutenção (' + R(((m.equip.C.filter(function (x) { return x.id === 'rxp'; })[0] || {}).loc_vmi || {})[c.D.n]) + '/mês) é menor que o contrato Ouro avulso do mesmo equipamento (R$ 6.800/mês): argumento para negociar a manutenção dos RX na compra.',
      (c.D.equilibrioC >= c.D.aluguel ? 'Folga de ' + R(c.D.equilibrioC - c.D.aluguel) + '/mês até o aluguel de equilíbrio com a compra C (' + R(c.D.equilibrioC) + '/mês). É a margem para a cotação de ultrassons e placa DR' + (L.nProxy ? ' e da RM' : '') + ', hoje estimados em ' + R(L.aluguelComp + L.aluguelProxy) + '/mês: até ' + R(c.D.equilibrioC - L.aluguelVmi - L.manSep) + '/mês por esses itens, D continua à frente de C.' : 'Aluguel de equilíbrio com a compra C: ' + R(c.D.equilibrioC) + '/mês (' + Psig(c.D.equilibrioC / c.D.aluguel - 1, 0) + ' sobre o custo atual). É o teto para negociar com a VMI.'),
      'A VMI cotou o RX digital como Aquila D; na compra, o RX digital é o Apolo D. Ultrassons e placa DR ainda sem cotação de locação.'
    ] });
    /* 6. crédito */
    S.secoes.push({ h: 'Capacidade de crédito do hospital', b: [
      'Dívida líquida de ' + mi(c.ent.dl) + ' (' + X(c.ent.dlEbitda) + ' o EBITDA). Em ' + l1.ano + ', o hospital cobre ' + X(l1.dscrSemProj) + ' do serviço da dívida sem o projeto e ' + X(l1.dscrSem) + ' com o projeto (alternativa ' + selId + '), abaixo do 1,3x de referência.',
      'Com o TDC de ' + mi(m.entidade.tdc_min) + ' em ' + fmtMes(m.entidade.tdc_mes) + ' liquidando ' + P(m.entidade.tdc_liquida, 0) + ' da dívida, a cobertura vai a ' + X(l1.dscrCom) + '. O agente vai olhar o TDC, a garantia real ou o FGI antes de aprovar a compra; a locação não depende de linha bancária.'
    ] });
    /* 7. pendências com efeito medido */
    var pend = [], vSel = c.flSel.vplEnt;
    pend.push('Fechadas com o CEO em 20/10: a linha "médicos que usam a sala" e o material já estão contabilizados; de dia laudam os radiologistas do hospital e, depois das 18 h, o telelaudo, incluso; a equipe técnica está na folha e cobre a TC 24 h; o contrato com a EMG não tem multa e pede 90 dias de aviso; a sala da TC é reaproveitada.');
    pend.push('Folha da equipe técnica (' + R(+m.base.cf_dir_mes || 0) + '/mês): detalhar quadro, escalas e cargos para ver se está superdimensionada. Cada 10% a menos soma ' + R((+m.base.cf_dir_mes || 0) * 0.1) + '/mês ao resultado do serviço, em qualquer alternativa (não muda a escolha).');
    (function () { var v3 = vplCom(function (mm) { mm.propria.rep_med_pct = +mm.propria.rep_med_pct + 0.01; }); pend.push('Telelaudo noturno: ' + P(m.propria.rep_med_pct, 1) + ' da receita (' + R(prop.rep_med) + '/mês) para os radiologistas e o telelaudo; confirmar o contrato e o preço por exame. Cada ponto percentual a mais tira ' + mi(vSel - v3) + ' do VPL de ' + selId + '.'); })();
    pend.push('Aviso à EMG: enviar cerca de 90 dias antes da instalação (go-live em ' + fmtMes(goLive()) + ' no modelo), depois da aprovação do financiamento e com prazo de entrega firme, para não haver sobreposição de custos nem janela sem TC.');
    (function () { var on = pacsOn(), lo = vplCom(function (mm) { mm.propria.pacs_incluir = 'sim'; mm.propria.pacs_exame = 10.58; }), hi = vplCom(function (mm) { mm.propria.pacs_incluir = 'sim'; mm.propria.pacs_exame = 6.94; }), sem = c.cenPACS ? c.cenPACS.sem[selId].vplEnt : null; pend.push('RIS e PACS: cotar Touch Health (RIS) e Sectra PACS Standard. O PACS (R$ ' + NF2.format(+m.propria.pacs_exame || 0) + ' por exame, ' + mi(+m.propria.pacs_impl || 0) + ' de implantação) é estimativa S&S, não cotação, e está ' + (on ? 'incluído' : 'fora do modelo') + '. De R$ 6,94 a 10,58 por exame, o VPL de ' + selId + ' vai de ' + mi(hi) + ' a ' + mi(lo) + '; sem PACS, ' + mi(sem) + '. A S&S representa a Sectra.'); })();
    pend.push('Locação: cotar ultrassons e placa DR (hoje estimados) e confirmar se o RX digital locado é o Aquila D ou o Apolo D.');
    if (semCfi.length) pend.push('CFI de ' + semCfi.join(' e ') + ' (ou trocar o ultrassom pelo Dominus L1, credenciado)' + (prevCfi.length ? ', e publicação do CFI da Pulsar' : '') + '.');
    if (fgtsEstado().st === 'cond') pend.push('FGTS-Saúde: CEBAS na modalidade de 60% ao SUS, créditos SUS de 12 meses e contratos no Teto MAC.');
    (function () { var cf = c.cenFIIS; if (!cf || cf.emUso) return; var p = cf.pedido, v = cf.vinte; pend.push('FIIS Saúde: só entra se o HDA tiver proposta inscrita e habilitada na Chamada Pública de 2025 (Transferegov, 13/10 a 07/11/2025); a janela de 2026 também fechou.' + (p ? ' Se tiver, o pacote C sai a CET de ' + Pp(p.cet) + ' em ' + p.n + ' meses e o VPL de C vai a ' + mi(p.vplC) + ' (' + (p.delta >= 0 ? '+' : '') + mi(p.delta) + ')' + (v && v.n > p.n ? '; com CEBAS, ' + v.n + ' meses e ' + mi(v.vplC) : '') + '.' : '') + ' O FIIS financia equipamento para uso no SUS (hoje cerca de 20% do HDA). Confirmar com o hospital.'); })();
    (function () { var la = c.lcdAuto; if (!la || la.emUso) return; pend.push('Sobretaxa da Taxa LCD (BNDES Automático): o modelo usa ' + Pp(la.sob) + ' como premissa. A Taxa LCD só fica mais barata que a linha em uso (' + la.refLinha + ', ' + rotCusto(la.refCusto) + ') com sobretaxa abaixo de ' + Pp(la.empate) + ', e expõe a parcela à Selic. Pedir a vigente ao agente; o Automático serve se entrar obra ou instalação no financiamento.'); })();
    pend.push('Perímetro do RX digital: fixo (Apolo D, proposta VMI) ou portátil (como no pacote GE).');
    (function () { var f = fxInfo(); if (!f.q) return; pend.push('Câmbio do pacote GE: confirmar com a GE quais itens vêm em dólar (a proposta só declara a TC), se a parcela do HFS fica fixa em reais depois da assinatura e até quando vale o preço. O modelo usa ' + FXr(f.fx.usd) + ' (proposta a ' + FXr(f.fx.ref) + ') com parcelas ' + (f.modo === 'dolar' ? 'atreladas ao dólar' : 'fixas') + '; cada R$ 0,10 muda o VPL de B em ' + mi(Math.abs(f.rr.porDecimo)) + ' e ' + fxEmpateTxt(f.rr.empateC, 'C', c.flB.vplEnt, c.flC.vplEnt) + '.'); })();
    if (qR) pend.push('Ressonância, do lado do HDA: negociar com os planos de saúde a volta da RM aos pacotes de reembolso, de onde ela saiu recentemente. Sem isso, o volume de convênio do cenário com RM não existe.');
    if (qR) pend.push('Ressonância: demanda (RMs pedidas hoje para fora), ticket dos convênios, equipe e laudo, projeto da sala (o modelo usa ' + mi(+m.rm.obra || 0) + ', informado pelo CEO; referências públicas de pré-instalação são maiores), cotação de manutenção e de locação, preço (referências de R$ 4,33 a 4,9 mi) e CFI da versão sem hélio. Cada 100 exames/mês valem ' + mi(qR.eq[selId].porExame * 100) + ' de VPL em ' + selId + '.');
    S.secoes.push({ h: 'Pendências que mudam o número', b: pend });
    if (c.cenSUS && c.sus) { var sx = m.sus || {}, qs = c.cenSUS; S.secoes.push({ h: 'SUS no modelo', b: [
      'Chave "SUS no modelo" em ' + susNome(qs.modo) + '. O padrão é fora, por decisão do CEO (20/10): nenhuma receita nem custo SUS no VPL, e o PACS conta só os exames de convênio e particular.',
      'VPL de ' + selId + ' nas três posições: fora ' + mi(qs.v.fora[selId].vplEnt) + '; SUS atual ' + mi(qs.v.atual[selId].vplEnt) + '; SUS atual + Agora Tem Especialistas ' + mi(qs.v.ate[selId].vplEnt) + '.',
      'SUS atual: ~' + N(qs.atual.exames) + ' exames/mês a R$ ' + NF2.format(qs.atual.ticket) + ' (SIGTAP, estimativa S&S), já atendidos com a EMG; o efeito de internalizar vai de ' + sgn(Math.min(qs.dAtual[selId], qs.dAtualOutroEmg[selId])) + ' a ' + sgn(Math.max(qs.dAtual[selId], qs.dAtualOutroEmg[selId])) + ' conforme a EMG receba ou não repasse sobre o SUS hoje. Falta a produção SUS por modalidade e o contrato da EMG.',
      'SUS a mais: ' + N(sx.tc_mes) + ' TCs/mês a ' + R(sx.tc_valor) + (rmLig ? ' e ' + N(sx.rm_mes) + ' RMs/mês a R$ ' + NF2.format(+sx.rm_valor || 0) : '') + ' pelo Agora Tem Especialistas, na capacidade ociosa: ' + R(c.sus.regMes) + '/mês de margem em regime e ' + mi(c.sus.vpl) + ' de VPL em ' + H + ' anos' + (rmLig ? ' (TC ' + mi(c.sus.vplTC) + ', RM ' + mi(c.sus.vplRM) + '; com ele a RM muda de sinal)' : '') + '. Exige habilitação no programa, contratualização com o gestor e espaço no Teto MAC.'
    ] }); }
    S.secoes.push({ h: 'Próximos passos', b: ['Gate 0 (agora): aprovar a tese e o perímetro; formalizar a proposta VMI de compra e de locação com as respostas acima; detalhar a folha da equipe técnica, confirmar o telelaudo e cotar o RIS (Touch Health) e o PACS (Sectra Standard)' + (qR ? '; negociar com os planos de saúde a volta da RM aos pacotes de reembolso, levantar a demanda de RM e decidir a ressonância em separado' : '') + '.', 'Gate 1 (dez/26 a 1T27): TDC emitido; CFI da Pulsar publicado; protocolar o FINAME (ou fechar a locação) com o kit de documentos.', 'Gate 2: desembolso ou assinatura da locação; aviso de 90 dias à EMG casado com a entrega, sem sobreposição de custos; instalação em ' + fmtMes(goLive()) + (rmLig ? '; RM aprovada em ' + fmtMes(m.rm.aprovacao) + ', sala e financiamento próprio, operação a partir de ' + fmtMes(E.mesRMStr(m)) : '') + '.'] });
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
    var dre = [['DRE mensal (R$)', 'EMG', 'Imagem própria'], ['Exames', e.exames, p.exames], ['Receita bruta', e.rb, p.rb], ['Glosas', -e.glosa, -p.glosa], ['Receita líquida', e.rl, p.rl], ['Mat/Med', -e.matmed, -p.matmed], ['Repasse médicos', -e.rep_med, -p.rep_med], ['Repasse material EMG', -e.rep_mat, -p.rep_mat], ['Repasse biópsias', -e.rep_bio, -p.rep_bio], ['Médicos que usam a sala', -e.rep_sala, -p.rep_sala], ['Margem de contribuição', e.mc, p.mc], ['Custos fixos diretos', -e.cf_dir, -p.cf_dir], ['Manutenção', -e.manut, -p.manut], ['RIS (Touch Health)', -(e.ris || 0), -(p.ris || 0)], ['PACS Sectra (por exame)', -(e.pacs || 0), -(p.pacs || 0)], ['Custos indiretos', -e.cf_ind, -p.cf_ind], ['EBITDA', e.resultado, p.resultado]];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dre), 'DRE mensal');
    var fx = [['Ano', 'Ano civil', 'Fator volume', 'Fração', 'Receita líquida', 'EBITDA EMG', 'EBITDA própria antes de manut./aluguel', 'Diferença × fração', c.sel.id === 'D' ? 'Aluguel' : 'Manutenção', 'EBITDA incremental', 'Depreciação', 'Tributos', 'Residual', 'FCL projeto', 'Parcelas', 'Juros', 'Caixa hospital', 'Acum. projeto', 'Acum. hospital', 'DSCR projeto']];
    fx.push([0, model.fin.ano_inicio - 1, '', '', '', '', '', '', '', '', '', '', '', fl.proj[0], '', '', fl.ent[0], fl.proj[0], fl.ent[0], '']);
    fl.anos.forEach(function (a) { fx.push([a.t, a.ano, a.fator, a.frac, a.rl, a.ebitdaEmg, a.ebitdaPropBase, a.incBase, a.opex, a.inc, a.dep, a.trib, a.residual, a.fcp, a.servico, a.juros, a.fce, a.acumP, a.acumE, a.dscr]); });
    fx.push([]); fx.push(['Alternativa', c.sel.id]); fx.push(['VPL projeto', fl.vpl]); fx.push(['TIR projeto', fl.tir]); fx.push(['Payback', fl.pb]); fx.push(['Payback descontado', fl.pbDesc]); fx.push(['VPL hospital', fl.vplEnt]); fx.push(['Caixa acumulado hospital', fl.acumEnt]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(fx), 'Fluxo ' + c.sel.id);
    var fB = c.flB, fC = c.flC, fD = c.flD, H = +model.fin.horizonte;
    var alt = [['Indicador', 'B · GE/HFS', 'C · VMI compra', 'D · VMI locação'], ['Forma', 'Compra, fornecedores 60x', 'Compra, ' + (c.C.escolha ? c.C.escolha.linha.nome : 'sem linha'), 'Locação ' + c.D.n + ' meses, renovável'], ['Investimento', c.B.capex, c.C.capex, 0], ['Financiado', c.B.capexFin, c.C.capexFin, 0], ['Prazo (m)', c.B.n, c.C.n, c.D.n], ['Carência (m)', 0, c.C.c, ''], ['Custo a.a. (%)', c.B.cetAno, c.C.cetAno, c.D.loc.taxaAno * 100], ['Parcela ou aluguel (R$/mês)', c.B.parcela, c.C.parcela, c.D.aluguel], ['Manutenção em regime (R$/mês)', c.B.manut.mes, c.C.manut.mes, 'inclusa'], ['Plano de manutenção', c.B.manut.plano, c.C.manut.plano, 'Ouro (no aluguel)'], ['Desembolso ano 0', -fB.ent[0], -fC.ent[0], -fD.ent[0]], ['Total desembolsado com equipamentos (' + H + ' anos)', fB.desembolsoTot, fC.desembolsoTot, fD.desembolsoTot], ['VPL projeto', fB.vpl, fC.vpl, fD.vpl], ['VPL hospital', fB.vplEnt, fC.vplEnt, fD.vplEnt], ['Caixa acumulado', fB.acumEnt, fC.acumEnt, fD.acumEnt], ['DSCR hospital ano 1, sem TDC', c.entAlt.B.linhas[0].dscrSem, c.entAlt.C.linhas[0].dscrSem, c.entAlt.D.linhas[0].dscrSem], ['Aluguel de equilíbrio com C (R$/mês)', '', '', c.D.equilibrioC], ['Aluguel de equilíbrio com B (R$/mês)', '', '', c.D.equilibrioB]];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(alt), 'Alternativas');
    if (c.cenRM) {
      var q = c.cenRM, rr = model.rm, reg = E.rmMensal(model, 2, 1), ks = ['B', 'C', 'D'];
      var rmS = [['Ressonância magnética · cenário atual: ' + (rmOn() ? 'com RM' : 'sem RM')], [], ['Com × sem RM', 'B · GE/HFS', 'C · VMI compra', 'D · VMI locação']];
      [['Investimento sem RM', 'sem', 'capex'], ['Investimento com RM', 'com', 'capex'], ['Dívida nova sem RM', 'sem', 'fin'], ['Dívida nova com RM', 'com', 'fin'], ['Desembolso próprio com investimento sem RM', 'sem', 'ano0'], ['Desembolso próprio com investimento com RM', 'com', 'ano0'], ['Compromisso mensal ano 3 sem RM', 'sem', 'comp3'], ['Compromisso mensal ano 3 com RM', 'com', 'comp3'], ['VPL hospital sem RM', 'sem', 'vplEnt'], ['VPL hospital com RM', 'com', 'vplEnt'], ['Caixa acumulado sem RM', 'sem', 'acumEnt'], ['Caixa acumulado com RM', 'com', 'acumEnt']].forEach(function (r) { rmS.push([r[0]].concat(ks.map(function (k) { return q[r[1]][k][r[2]]; }))); });
      [0, 1, 2].forEach(function (i) { if (!q.sem.C.dscr[i]) return; rmS.push(['DSCR ' + q.sem.C.dscr[i].ano + ' sem RM'].concat(ks.map(function (k) { return q.sem[k].dscr[i].v; }))); rmS.push(['DSCR ' + q.com.C.dscr[i].ano + ' com RM'].concat(ks.map(function (k) { return q.com[k].dscr[i].v; }))); });
      rmS.push(['Diferença de VPL (com − sem)'].concat(ks.map(function (k) { return q.eq[k].delta; })), ['VPL por exame/mês a mais'].concat(ks.map(function (k) { return q.eq[k].porExame; })), ['Volume de equilíbrio (exames/mês)'].concat(ks.map(function (k) { return q.eq[k].volume; })), ['Ticket de equilíbrio (R$)'].concat(ks.map(function (k) { return q.eq[k].ticket; })), ['Preço de equilíbrio (R$)'].concat(ks.map(function (k) { return q.eq[k].preco; })));
      rmS.push([], ['DRE mensal da RM em regime (preços do ano 2)', 'R$/mês'], ['Exames', reg.exames], ['Receita bruta', reg.rb], ['Glosas', -reg.glosa], ['Receita líquida', reg.rl], ['Contraste e material', -reg.matmed], ['Laudo', -reg.laudo], ['Margem de contribuição', reg.mc], ['Equipe', -reg.equipe], ['Energia e climatização', -reg.energia], ['Outros fixos', -reg.outros], ['PACS por exame', -reg.pacs], ['EBITDA antes da manutenção', reg.ebitda], ['Capacidade (exames/mês)', q.cap.cap], ['Ocupação', q.cap.ocup]);
      var ri = c.rm.isolada; if (ri) { rmS.push([], ['RM isolada (compra, sem financiamento)', 'Ano 0'].concat(ri.anos.map(function (a) { return a.ano; })), ['Exames', ''].concat(ri.anos.map(function (a) { return a.rm.exames; })), ['Receita líquida', ''].concat(ri.anos.map(function (a) { return a.rm.rl; })), ['EBITDA da RM', ''].concat(ri.anos.map(function (a) { return a.rm.ebitda; })), ['Manutenção', ''].concat(ri.anos.map(function (a) { return -a.manut; })), ['Investimento (sala e equipamento)', ''].concat(ri.anos.map(function (a) { return -a.inv; })), ['Fluxo', ri.fl[0]].concat(ri.anos.map(function (a) { return a.fc; })), ['VPL', ri.vpl], ['TIR', ri.tir], ['Payback (anos)', ri.pb]); }
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rmS), 'Ressonância');
    }
    if (c.sus) { var su = c.sus, sx = model.sus || {}, qs = c.cenSUS; var sS = [['SUS no modelo: chave em ' + susNome(E.susModo(model)) + ' (padrão: fora, decisão do CEO de 20/10/2026)'], []];
      if (qs) { sS.push(['VPL para o hospital', 'Fora', 'SUS atual', 'SUS atual + Agora Tem Especialistas']); ['B', 'C', 'D'].forEach(function (k) { sS.push([k, qs.v.fora[k].vplEnt, qs.v.atual[k].vplEnt, qs.v.ate[k].vplEnt]); }); sS.push(['Resultado mensal da própria em regime', qs.v.fora.resultado, qs.v.atual.resultado, qs.v.ate.resultado], []); }
      sS.push(['Premissa', 'Valor'], ['SUS atual (exames/mês)', +sx.atual_mes || 0], ['Valor SUS médio atual (R$, SIGTAP)', +sx.atual_ticket || 0], ['Repasse à EMG no SUS atual', sx.atual_emg === 'nada' ? 'nenhum' : 'mesmos percentuais do convênio'], ['TC SUS a mais (exames/mês)', +sx.tc_mes || 0], ['Valor SUS por TC (R$)', +sx.tc_valor || 0], ['RM SUS a mais (exames/mês)', rmOn() ? +sx.rm_mes || 0 : 0], ['Valor SUS por RM (R$)', +sx.rm_valor || 0]);
      sS.push([], ['SUS a mais (Agora Tem Especialistas), margem por ano'], ['Ano', 'Margem TC', 'Margem RM', 'Receita líquida', 'Margem total']);
      su.anos.forEach(function (a) { sS.push([a.ano, a.tc, a.rm, a.rl, a.total]); });
      sS.push([], ['Margem mensal em regime', su.regMes], ['Margem anual em regime', su.regAno], ['Receita líquida anual em regime', su.rlAno], ['VPL total', su.vpl], ['VPL TC', su.vplTC], ['VPL RM', su.vplRM]);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sS), 'SUS'); }
    if (c.cenCambio) { var qx = c.cenCambio, bf = c.B.fx, fxS = [['Câmbio do pacote GE (B): ' + (bf.ids.length ? FX_ITENS_TXT[bf.itens] + ' em dólar' : 'nenhum item em dólar') + '; parcelas ' + (bf.dolar ? 'atreladas ao dólar' : 'fixas em reais')], [],
        ['Premissa', 'Valor'], ['Câmbio na assinatura (R$/US$)', bf.usd], ['Câmbio da proposta GE (R$/US$)', bf.ref], ['Variação anual (parcelas atreladas)', bf.va], ['Itens em dólar (US$)', bf.usdTotal], ['Itens em dólar na proposta (R$)', bf.precoProposta], ['Itens em dólar no câmbio do modelo (R$)', bf.precoModelo], ['Parcela desses itens na proposta (R$/mês)', bf.parcelaProposta], ['… no câmbio do modelo (R$/mês)', bf.parcelaDolar], ['Variação cambial nas parcelas (R$, 60 meses)', bf.variacaoParcelas], [],
        ['Câmbio (R$/US$)', 'Itens em dólar (R$)', 'Parcela do pacote B, fixas (R$/mês)', 'VPL de B, parcelas fixas', 'VPL de B, atreladas', 'VPL de C', 'VPL de D']];
      qx.linhas.forEach(function (l) { fxS.push([l.usd, bf.usdTotal * l.usd, l.fixas.parcela, l.fixas.vplEnt, l.dolar.vplEnt, qx.vC, qx.vD]); });
      fxS.push([], ['', 'Parcelas fixas', 'Parcelas atreladas'], ['VPL de B por R$ 0,10 no câmbio', qx.r.fixas.porDecimo, qx.r.dolar.porDecimo], ['Câmbio de empate B × C', qx.r.fixas.empateC, qx.r.dolar.empateC], ['Câmbio de empate B × D', qx.r.fixas.empateD, qx.r.dolar.empateD]);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(fxS), 'Câmbio B'); }
    var loc = [['Locação D no prazo de ' + c.D.n + ' meses · ' + locTxt().base + ' · ' + locTxt().manut], ['Item', 'Base', 'Cotação VMI R$/mês/un.', 'Valor de compra', 'Queda a.a.', 'Residual %', 'Residual R$', 'Aluguel (com tributos)', 'dos quais tributos', 'Manutenção média', 'Custo mensal', '% do valor/mês', 'Taxa implícita a.a.']];
    c.D.loc.linhas.forEach(function (x) { loc.push([x.nome, x.fonte === 'vmi' ? 'VMI · ' + x.cotModelo : 'composição', x.cotUnit || '', x.V, x.dep, x.rvPct, x.RV, x.fin, x.trib, x.man, x.aluguel, x.pctMes, x.taxaImpl == null ? '' : x.taxaImpl]); });
    loc.push(['Pacote', '', '', c.D.loc.V, '', c.D.loc.RV / c.D.loc.V, c.D.loc.RV, c.D.loc.fin, c.D.loc.trib, c.D.loc.man, c.D.loc.aluguel, c.D.loc.pctMes, '']);
    loc.push([]); loc.push(['Tabela de locação VMI (16/10/2026), R$/mês por unidade']); loc.push(['Prazo'].concat(model.equip.C.filter(function (it) { return it.loc_vmi; }).map(function (it) { return it.loc_vmi_modelo || it.modelo; })));
    [12, 24, 36, 48, 60, 72, 84].forEach(function (n) { loc.push([n].concat(model.equip.C.filter(function (it) { return it.loc_vmi; }).map(function (it) { return +it.loc_vmi[n] || ''; }))); });
    loc.push([]); loc.push(['Taxa do locador a.a. (itens sem cotação)', c.D.loc.taxaAno, 'arrendamento PJ + prêmio']); loc.push([]);
    loc.push(['Prazo (m)', 'Custo/mês', '% do valor/mês', 'Total no prazo', 'VP do custo', 'VP comprar e usar no prazo (C)', 'Vantagem da locação', 'Aluguel de equilíbrio no prazo', 'VPL hospital ' + H + ' anos', 'Caixa acumulado']);
    (c.prazosD || []).forEach(function (z) { loc.push([z.n, z.aluguel, z.pctMes, z.totalPrazo, z.pvAluguel, z.custoPossuir, z.vantagem, z.equilibrio, z.vplEnt, z.acumEnt]); });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(loc), 'Locação D');
    if (c.C.escolha) { var cr = [['t', 'Ano', 'Mês', 'Taxa a.a. (%)', 'Saldo inicial', 'Juros', 'Amortização', 'Parcela', 'Saldo']]; (c.C.rows && c.C.rows.length ? c.C.rows : c.C.escolha.sim.rows).forEach(function (r, i) { cr.push([i + 1, r.y, r.m, r.taxa, r.saldoIni, r.juros, r.amort, r.parcela, r.saldo]); }); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cr), 'Cronograma C'); }
    var en = [['Ano', 'EBITDA hospital', 'EBITDA projeto', 'Serviço atual', 'Atual após TDC', 'Serviço novo', 'DSCR sem projeto', 'DSCR sem TDC', 'DSCR com TDC']]; c.ent.linhas.forEach(function (l) { en.push([l.ano, l.ebitdaEnt, l.inc, l.servAtual, l.servAtualTdc, l.servNovo, l.dscrSemProj, l.dscrSem, l.dscrCom]); });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(en), 'Crédito entidade');
    var out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    var nome = 'HDA_viabilidade_imagem_' + new Date().toISOString().slice(0, 10) + '.xlsx';
    registrarUso('export', { doc: 'xlsx' });
    if (downloads) downloads.save({ filename: nome, data: new Blob([out]) }).then(function () { toast('Planilha salva.'); }).catch(function (e) { if (!e || e.code !== 'declined') toast('Não foi possível salvar a planilha aqui.'); });
    else { try { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([out])); a.download = nome; a.click(); } catch (e) { toast('Download indisponível nesta visualização.'); } }
  }
  $('#btnXlsx').addEventListener('click', exportarXlsx);

  /* =====================================================================
     APRESENTAÇÃO AO CEO: slides 1280×720 gerados do modelo atual (os mesmos
     cálculos e textos da página e do sumário). O .pptx sai das MESMAS
     especificações de slide: nada é digitado à parte.
     Blocos: kpis · txt (bullets/parágrafos, **negrito**) · tab · g (gráfico) · nota · img
     ===================================================================== */
  var COR_TXT = { good: 'var(--good)', bad: 'var(--bad)', warn: 'var(--warn)', acc: 'var(--accent)', muted: 'var(--fg-2)' };
  var ALT_COR = { A: 'var(--s-a)', B: 'var(--s-b)', C: 'var(--s-c)', D: 'var(--s-d)' };
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  function semMd(s) { return String(s == null ? '' : s).replace(/\*\*(.+?)\*\*/g, '$1'); }
  function kR(v) { if (v == null || !isFinite(v)) return '—'; if (Math.abs(v) < 500) return '–'; return v < 0 ? '(' + NF0.format(-v / 1e3) + ')' : NF0.format(v / 1e3); }
  function nbsp(t) { return String(t == null ? '' : t).replace(/(R\$|−R\$) /g, '$1\u00a0').replace(/ (mi|mil)\b/g, '\u00a0$1'); }
  function sgnMi(v) { return v == null || !isFinite(v) ? '—' : (v >= 0 ? '+' : '') + mi(v); }
  function sch(id) { return SCHEMA.filter(function (s) { return s.id === id; })[0] || {}; }
  function cenarioTxt() {
    return 'Cenário: alternativa ' + calc.sel.id + ' · ' + (calc.cenRM ? (rmOn() ? 'com ressonância' : 'sem ressonância') + ' · ' : '') + (pacsOn() ? 'com PACS Sectra (estimativa S&S)' : 'sem PACS') + ' · ' + susNome(E.susModo(model)) + ' · ' + model.fin.horizonte + ' anos a ' + P(model.fin.desconto, 0) + ' a.a.';
  }
  function pendentesN() { return SCHEMA.filter(function (s) { return s.origem === 'pendente'; }).length; }
  /* sensibilidade (a mesma do Simulador), guardada por cálculo: as alavancas de preço refazem o financiamento */
  var sensMemo = { calc: null, v: null };
  function sensDeck() {
    if (sensMemo.calc === calc && sensMemo.v) return sensMemo.v;
    var base = clone(model); sensMemo = { calc: calc, v: E.sensibilidade(base, M, BASE, alavancasSens(base)) };
    return sensMemo.v;
  }
  function svgHBars(itens, fmt, W) {
    W = W || 720; var rowH = 54, pl = Math.min(170, W * 0.36), pr = 120, H = itens.length * rowH + 10, iw = W - pl - pr;
    var mx = 0, mn = 0; itens.forEach(function (i) { mx = Math.max(mx, i.v); mn = Math.min(mn, i.v); });
    var span = (mx - mn) || 1, x = function (v) { return pl + (v - mn) / span * iw; };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Comparação">';
    if (mn < 0) s += '<line x1="' + x(0) + '" x2="' + x(0) + '" y1="4" y2="' + (H - 4) + '" stroke="var(--fg-3)"/>';
    itens.forEach(function (it, k) {
      var yy = 6 + k * rowH, cy = yy + rowH / 2 + 5;
      s += '<text x="' + (pl - 10) + '" y="' + cy + '" text-anchor="end" fill="var(--fg)">' + esc(it.nome) + '</text>';
      s += '<rect x="' + Math.min(x(0), x(it.v)) + '" y="' + (yy + 9) + '" width="' + Math.max(1, Math.abs(x(it.v) - x(0))) + '" height="' + (rowH - 18) + '" fill="' + it.cor + '" rx="3"/>';
      s += '<text x="' + (Math.max(x(0), x(it.v)) + 8) + '" y="' + cy + '" fill="var(--fg)" font-weight="600">' + esc(fmt(it.v)) + '</text>';
    });
    return s + '</svg>';
  }

  function deckSlides() {
    var c = calc, m = model, H = +m.fin.horizonte, sel = c.sel, sid = sel.id, emg = c.cen.emg, prop = c.cen.prop, l1 = c.ent.linhas[0], isD = sid === 'D';
    var S = sumarioExecutivo(), secao = function (h) { return S.secoes.filter(function (x) { return x.h === h; })[0] || { b: [] }; };
    var fl = function (k) { return c['fl' + k]; }, alts = ['B', 'C', 'D'];
    var ord = alts.slice().sort(function (a, b) { return fl(b).vplEnt - fl(a).vplEnt; }), best = ord[0], gap = fl(ord[0]).vplEnt - fl(ord[1]).vplEnt, perto = gap < 0.05 * Math.abs(fl(ord[0]).vplEnt);
    var lC = c.C.escolha && c.C.escolha.linha, linhaC = lC ? lC.nome : 'linha de fomento';
    var nomeAlt = { B: 'compra do pacote GE (HFS em 60 parcelas)', C: 'compra do pacote VMI com ' + linhaCurta(lC), D: 'locação do pacote VMI (' + c.D.n + ' meses)' };
    var curtoAlt = { B: 'compra GE (B)', C: 'compra VMI (C)', D: 'locação VMI (D)' };
    var qR = c.cenRM, qP = c.cenPACS, qS = c.cenSUS, rmLig = rmOn(), eqR = qR ? qR.eq[sid] : null;
    var hoje = new Date(), mesAno = MESES[hoje.getMonth()] + ' de ' + hoje.getFullYear();
    var e1 = function (k) { var e = c.entAlt && c.entAlt[k]; return e && e.linhas[0] ? e.linhas[0].dscrSem : null; };
    var lista = [];

    /* 1 · capa */
    lista.push({ capa: true, nav: 'Capa', k: 'Hospital Dom Alvarenga · ABENSENA · diagnóstico por imagem', t: 'Internalização do serviço de imagem com equipamentos VMI',
      sub: 'Decisão pedida: internalizar o serviço pela ' + nomeAlt[best] + (best === 'D' ? ', assinando a locação junto com o aviso de 90 dias à EMG' : ', contratando depois da emissão do TDC') + (qR ? ', e decidir a ressonância à parte' : '') + '.',
      b: [{ tipo: 'img', x: 1080, y: 40, w: 136, h: 88, src: LOGO.navy },
        { tipo: 'txt', x: 56, y: 480, w: 1060, paras: ['Apresentação ao CEO · ' + mesAno + ' · S&S Partners', cenarioTxt(), 'Gerado da página "Viabilidade da internalização com equipamentos VMI" (' + origemTxt() + '). Os números mudam só na página; esta apresentação é refeita a cada abertura.'], tam: 15, cor: 'muted' }] });

    /* 2 · recomendação */
    var rec = [
      '**Internalizar.** Hoje o serviço perde ' + mi(-emg.resultado * 12) + ' por ano; com a mesma receita, a imagem própria fecha em ' + R(prop.resultado) + ' por mês em regime.',
      '**A ' + nomeAlt[best] + ' tem o maior valor:** ' + mi(fl(best).vplEnt) + ' para o hospital em ' + H + ' anos, contra ' + ord.slice(1).map(function (k) { return mi(fl(k).vplEnt) + ' na ' + curtoAlt[k]; }).join(' e ') + '.' + (perto ? ' A diferença para a ' + curtoAlt[ord[1]] + ' é pequena (' + mi(gap) + '): decidem as pendências, não o VPL.' : '') + (best !== sid ? ' O plano em números está montado sobre a ' + curtoAlt[sid] + '.' : ''),
      '**A restrição é o crédito do hospital, não o projeto.** Em ' + l1.ano + ' o hospital cobre ' + X(l1.dscrSemProj) + ' do serviço da dívida; com o projeto, ' + X(l1.dscrSem) + '; com o TDC, ' + X(l1.dscrCom) + '. Contratar depois da emissão do TDC.'
    ];
    if (qR) rec.push('**Ressonância, decisão à parte.** ' + (rmLig ? 'Está no número: ' : 'Fora do número: ') + 'com as hipóteses atuais ela ' + (eqR.delta >= 0 ? 'soma ' : 'tira ') + mi(Math.abs(eqR.delta)) + ' na ' + curtoAlt[sid] + ' e empata com ' + N(eqR.volume) + ' exames de convênio por mês; depende de os planos voltarem a incluir a RM nos pacotes do HDA.');
    rec.push('**Cenário:** ' + (pacsOn() ? 'PACS Sectra pela estimativa S&S (sem cotação)' : 'sem o PACS, que ainda não tem cotação (número otimista)') + '; ' + susNome(E.susModo(m)) + (E.susModo(m) === 'fora' ? ', como decidiu o CEO' : '') + '. As chaves estão no slide de cenários.');
    lista.push({ nav: 'Recomendação', k: 'Recomendação', t: 'Internalizar vale ' + mi(fl(best).vplEnt) + ' para o hospital em ' + H + ' anos, pela ' + nomeAlt[best] + (perto ? ', quase empatada com a ' + curtoAlt[ord[1]] : ''), b: [
      { tipo: 'kpis', x: 56, y: 150, w: 1168, h: 118, cols: 6, vtam: 20, itens: [
        { lab: 'Resultado hoje, com a EMG', v: R(emg.resultado), sub: 'por mês · ' + mi(emg.resultado * 12) + ' por ano', cls: 'bad' },
        { lab: 'Com imagem própria', v: R(prop.resultado), sub: 'por mês em regime, ' + (isD ? 'com o aluguel' : 'antes das parcelas'), cls: 'good' },
        { lab: 'Ganho operacional', v: mi(c.ganhoMes * 12), sub: 'por ano · ' + R(c.ganhoMes) + ' por mês', cls: 'good' },
        { lab: 'VPL para o hospital (' + sid + ')', v: mi(fl(sid).vplEnt), sub: H + ' anos a ' + P(m.fin.desconto, 0) + ', após as parcelas', cls: fl(sid).vplEnt > 0 ? 'good' : 'bad' },
        { lab: 'TIR · payback (' + sid + ')', v: (fl(sid).tir == null ? '—' : P(fl(sid).tir, 0)) + ' · ' + (fl(sid).pb == null ? '—' : N(fl(sid).pb, 1) + ' a'), sub: 'do projeto', cls: '' },
        { lab: 'Cobertura da dívida em ' + l1.ano, v: X(l1.dscrSemProj) + ' → ' + X(l1.dscrSem), sub: 'sem → com o projeto · com TDC ' + X(l1.dscrCom), cls: l1.dscrSem != null && l1.dscrSem < 1.3 ? 'warn' : 'good' }] },
      { tipo: 'txt', x: 56, y: 296, w: 1168, bullets: rec, tam: 16.5 },
      { tipo: 'nota', x: 56, y: 650, w: 1168, texto: pendentesN() + ' premissas ainda estão "a validar" com o hospital (slide de pendências). ' + cenarioTxt() + '.' }] });

    /* 3 · situação atual */
    var vol = m.volumes || {};
    lista.push({ nav: 'Situação atual', k: 'Situação atual · EMG', t: 'Hoje o serviço dá prejuízo de ' + mi(-emg.resultado * 12) + ' por ano: a EMG fica com ' + P(emg.repasse / emg.rl, 0) + ' da receita e o hospital paga a estrutura', b: [
      { tipo: 'g', x: 56, y: 150, w: 720, tit: 'Para onde vai a receita líquida hoje (R$ por mês)', f: function (el) { el.innerHTML = svgBars({ cats: ['Médicos', 'Material', 'Biópsias', 'Sala', 'Mat/Med', 'Fixos', 'Indiretos', 'Resultado'], series: [{ nome: 'Repasses à EMG: médicos, material, biópsias e médicos que usam a sala · custos do hospital: Mat/Med, fixos diretos e indiretos', vals: [emg.rep_med, emg.rep_mat, emg.rep_bio, emg.rep_sala, emg.matmed, emg.cf_dir, emg.cf_ind, emg.resultado], cor: 'var(--s-c)' }], fmt: function (v) { return mi(v); }, h: 330, labels: true, aria: 'Destino da receita' }); } },
      { tipo: 'txt', x: 820, y: 150, w: 404, tam: 15, bullets: [
        'Receita líquida de **' + R(emg.rl) + '** por mês: ' + N(emg.exames) + ' exames de convênio e particular a ' + R(m.base.ticket) + (emg.rbSus ? ', mais o SUS atual' : '') + '.',
        'Repasses à EMG de **' + R(emg.repasse) + '** por mês: médicos ' + R(emg.rep_med) + ', médicos que usam a sala ' + R(emg.rep_sala) + ', material ' + R(emg.rep_mat) + ' e biópsias ' + R(emg.rep_bio) + '.',
        'O hospital já paga a estrutura: ' + R(emg.cf_dir) + ' de equipe e fixos diretos e ' + R(emg.cf_ind) + ' de rateio por mês, que continuam em qualquer alternativa.',
        'Volume de 2026: ' + N(+vol.rx26 + +vol.tc26 + +vol.us26) + ' exames por mês, todos os pagadores; a TC faz ' + N(c.tc.tcHoje) + ' por mês, ' + P(c.tc.tcHoje / c.tc.cap, 0) + ' da capacidade de uma TC nova.'] },
      { tipo: 'nota', x: 56, y: 650, w: 1168, texto: 'Base: DRE por unidade de negócio de jan–jun/2026 (Controladoria) em regime, preços do ano 2; volumes do Projeto Radiologia (Jaime).' }] });

    /* 4 · DRE EMG × própria */
    var dreL = [
      ['Receita líquida', emg.rl, prop.rl, 'total'], ['(−) Mat/Med', -emg.matmed, -prop.matmed], ['(−) Repasse: médicos e laudo', -emg.rep_med, -prop.rep_med], ['(−) Repasse: material EMG', -emg.rep_mat, -prop.rep_mat], ['(−) Repasse: biópsias', -emg.rep_bio, -prop.rep_bio], ['(−) Médicos que usam a sala', -emg.rep_sala, -prop.rep_sala],
      ['Margem de contribuição', emg.mc, prop.mc, 'total'], ['(−) Equipe e fixos diretos', -emg.cf_dir, -prop.cf_dir], [isD ? '(−) Aluguel dos equipamentos' : '(−) Manutenção pós-garantia', -(emg.manut + emg.aluguel), -(prop.manut + prop.aluguel)], ['(−) RIS (Touch Health)', -(emg.ris || 0), -(prop.ris || 0)], ['(−) PACS Sectra' + (pacsOn() ? ', por exame' : ' (fora)'), -(emg.pacs || 0), -(prop.pacs || 0)],
      ['Margem direta', emg.margem_direta, prop.margem_direta, 'total'], ['(−) Custos indiretos (rateio)', -emg.cf_ind, -prop.cf_ind], ['Resultado (EBITDA)', emg.resultado, prop.resultado, 'total']];
    var dreB = [
      'Saem os repasses à EMG de material, biópsias e "médicos que usam a sala": **' + R(emg.rep_mat + emg.rep_bio + emg.rep_sala - prop.rep_mat - prop.rep_bio - prop.rep_sala) + '** por mês.',
      'Fica o laudo: ' + P(m.propria.rep_med_pct, 1) + ' da receita para os radiologistas de dia e o telelaudo à noite (CEO, 20/10).',
      'Entram ' + (isD ? 'o aluguel dos equipamentos (' + R(prop.aluguel) + ', ' + locTxt().manut + ')' : 'a manutenção pós-garantia (' + R(prop.manut) + ', plano ' + (sel.manut.plano === 'prata' ? 'Prata' : 'Ouro') + ')') + ', o RIS (' + R(prop.ris) + ')' + (pacsOn() ? ' e o PACS Sectra (' + R(prop.pacs) + ', estimativa S&S)' : '; o PACS está fora do número') + '.',
      'Ganho de **' + R(c.ganhoMes) + '** por mês, ' + mi(c.ganhoMes * 12) + ' por ano, antes das parcelas.'];
    if (prop.rbSus || prop.rbSusMais) dreB.push('Inclui o ' + susNome(E.susModo(m)) + ': ' + R((prop.rbSus || 0) + (prop.rbSusMais || 0)) + ' de receita bruta SUS por mês na imagem própria.');
    lista.push({ nav: 'DRE: EMG × própria', k: 'Por que internalizar', t: 'Com a mesma receita, o resultado mensal passa de ' + R(emg.resultado) + ' com a EMG para ' + R(prop.resultado) + ' com imagem própria', b: [
      { tipo: 'tab', x: 56, y: 150, w: 740, tam: 14, denso: true, cab: ['R$ por mês, em regime', 'EMG', 'Própria (' + sid + ')', 'Diferença'], larg: [0.43, 0.19, 0.19, 0.19], al: ['', 'n', 'n', 'n'],
        rc: dreL.map(function (r) { return r[3] || ''; }), linhas: dreL.map(function (r) { var d = r[2] - r[1]; return [{ t: r[0] }, { t: R(r[1]), n: true }, { t: R(r[2]), n: true }, { t: (d >= 0 ? '+' : '') + R(d), n: true, cor: Math.abs(d) < 1 ? '' : d > 0 ? 'good' : 'bad' }]; }) },
      { tipo: 'txt', x: 830, y: 150, w: 394, tam: 15, bullets: dreB },
      { tipo: 'nota', x: 56, y: 650, w: 1168, texto: 'Ano 2 de operação, preços corrigidos pelo IPCA (Focus). Custos fixos e indiretos iguais nos dois modelos: o hospital já os paga.' }] });

    /* 5 · alternativas */
    var linhaAlt = function (lab, f, rc) { return [{ t: lab }].concat(alts.map(function (k) { var v = f(k); return typeof v === 'object' ? v : { t: v, n: true }; })); };
    var altRows = [
      linhaAlt('Investimento em equipamentos', function (k) { return k === 'D' ? 'zero' : mi(c[k].capex); }),
      linhaAlt('Dívida nova', function (k) { return k === 'D' ? 'nenhuma' : mi(c[k].capexFin) + (k === 'B' ? ' (fornecedor)' : ''); }),
      linhaAlt('Custo do dinheiro ou aluguel', function (k) { return k === 'D' ? R(c.D.aluguel) + '/mês' : k === 'B' ? Pp(c.B.cetAno) + ' a.a. implícito' : 'CET ' + Pp(c.C.cetAno) + ' a.a.'; }),
      linhaAlt('Prazo', function (k) { return k === 'B' ? c.B.n + ' meses' : k === 'C' ? (c.C.n || '—') + ' m, ' + (c.C.c || 0) + ' de carência' : c.D.n + ' meses'; }),
      linhaAlt('Gasto mensal em ' + (+m.fin.ano_inicio), function (k) { return R(mediaMes(fl(k), 1)); }),
      linhaAlt('Gasto mensal no 3º ano', function (k) { return R(mediaMes(fl(k), 3)); }),
      linhaAlt('Cobertura do hospital em ' + l1.ano, function (k) { return X(e1(k)); }),
      linhaAlt('Câmbio', function (k) { return k === 'B' ? (c.B.fx.ids.length ? 'US$ a ' + FXr(c.B.fx.usd) : 'nenhum') : 'nenhum'; }),
      linhaAlt('VPL para o hospital, ' + H + ' anos', function (k) { return { t: mi(fl(k).vplEnt), n: true, b: true, cor: k === best ? 'good' : '' }; }),
      linhaAlt('Caixa acumulado, ' + H + ' anos', function (k) { return mi(fl(k).acumEnt); })];
    lista.push({ nav: 'Alternativas', k: 'Alternativas', t: 'A ' + nomeAlt[best] + ' tem o maior valor para o hospital: ' + mi(fl(best).vplEnt) + ' em ' + H + ' anos, ' + mi(gap) + ' acima da ' + curtoAlt[ord[1]], b: [
      { tipo: 'tab', x: 56, y: 150, w: 790, tam: 14, cab: ['', 'B · GE, compra', 'C · VMI, compra', 'D · VMI, locação'], larg: [0.34, 0.22, 0.22, 0.22], al: ['', 'n', 'n', 'n'], rc: altRows.map(function (r, i) { return i === 8 ? 'total' : ''; }), linhas: altRows },
      { tipo: 'g', x: 880, y: 150, w: 344, tit: 'VPL para o hospital, ' + H + ' anos', f: function (el) { el.innerHTML = svgHBars(alts.map(function (k) { return { nome: k + ' · ' + { B: 'GE', C: 'VMI compra', D: 'VMI locação' }[k], v: fl(k).vplEnt, cor: ALT_COR[k] }; }), function (v) { return mi(v); }, 344); } },
      { tipo: 'txt', x: 880, y: 360, w: 344, tam: 14, bullets: [
        'A locação dispensa investimento e dívida nova e traz a manutenção no aluguel, mas cobra desde a instalação e troca o equipamento a cada ' + c.D.n + ' meses.',
        'Para empatar com a compra C, o aluguel teria de ser ' + R(c.D.equilibrioC) + ' por mês (hoje ' + R(c.D.aluguel) + ').'] },
      { tipo: 'nota', x: 56, y: 650, w: 1168, texto: 'Gasto mensal = parcelas + manutenção (compra) ou aluguel (locação); ' + (+m.fin.ano_inicio) + ' em média de 12 meses, com a operação a partir de ' + fmtMes(goLive()) + '.' + (qR ? (rmLig ? ' Com a ressonância.' : ' Sem a ressonância.') : '') }] });

    /* 6 · caixa acumulado */
    var anosCat = fl(sid).anos.map(function (a) { return String(a.ano); });
    var pos = fl(sid).anos.filter(function (a) { return a.acumE >= 0; })[0];
    lista.push({ nav: 'Caixa acumulado', k: 'Retorno', t: 'Na ' + curtoAlt[sid] + ', o caixa do hospital ' + (pos ? 'fica positivo em ' + pos.ano : 'não fica positivo no horizonte') + ' e acumula ' + mi(fl(sid).acumEnt) + ' em ' + H + ' anos, já descontadas as parcelas', b: [
      { tipo: 'g', x: 56, y: 150, w: 820, tit: 'Caixa acumulado para o hospital (R$, nominal)', f: function (el) { el.innerHTML = svgLines({ cats: anosCat, series: alts.map(function (k) { return { nome: { B: 'B · compra GE', C: 'C · compra VMI', D: 'D · locação VMI' }[k], vals: fl(k).anos.map(function (a) { return a.acumE; }), cor: ALT_COR[k], dash: k !== sid }; }), fmt: function (v) { return mi(v); }, h: 380, aria: 'Caixa acumulado' }); } },
      { tipo: 'txt', x: 910, y: 150, w: 314, tam: 15, bullets: alts.map(function (k) { var f = fl(k); return '**' + k + '** · ' + mi(f.acumEnt) + ' acumulados em ' + H + ' anos; VPL ' + mi(f.vplEnt) + (k !== 'D' && f.tir != null ? '; TIR do projeto ' + P(f.tir, 0) : '') + '; gasto com equipamentos de ' + R(mediaMes(f, 1)) + ' por mês em ' + f.anos[0].ano + '.'; }).concat(['O investimento inicial com caixa (RIS, PACS' + (rmLig ? ', sala da RM' : '') + ') é de ' + mi(-fl(sid).ent[0]) + ' na ' + curtoAlt[sid] + '.']) },
      { tipo: 'nota', x: 56, y: 650, w: 1168, texto: 'Fluxo do hospital = ganho operacional sobre a EMG − manutenção ou aluguel − parcelas − investimento com caixa. IPCA do Focus em todos os caminhos; parcelas nominais.' }] });

    /* 7 · plano em números */
    var A = fl(sid).anos, temTrib = A.some(function (a) { return Math.abs(a.trib) > 1; }), temRM = rmLig && A.some(function (a) { return Math.abs(a.rmEbitda) > 1; });
    var pl = [['Ganho operacional sobre a EMG', function (a) { return a.incBase; }]];
    if (temRM) pl.push(['Ressonância (EBITDA)', function (a) { return a.rmEbitda; }]);
    pl.push([isD ? '(−) Aluguel' : '(−) Manutenção pós-garantia', function (a) { return -a.opex; }], ['EBITDA incremental', function (a) { return a.inc; }, 'total']);
    if (temTrib) pl.push(['(−) Tributos', function (a) { return -a.trib; }]);
    if (!isD) pl.push(['(−) Parcelas do financiamento', function (a) { return -a.servico; }]);
    if (A.some(function (a) { return Math.abs(a.invRMHosp) > 1; })) pl.push(['(−) Investimento com caixa', function (a) { return -a.invRMHosp; }]);
    pl.push(['Caixa do hospital no ano', function (a) { return a.fce; }, 'total'], ['Caixa acumulado', function (a) { return a.acumE; }]);
    if (!isD) pl.push(['Cobertura do projeto (EBITDA ÷ parcelas)', function (a) { return a.dscr; }, '', true]);
    var wY = 0.66 / A.length;
    lista.push({ nav: 'Plano em números', k: 'Plano em números · ' + curtoAlt[sid], t: 'Ano a ano, a ' + nomeAlt[sid] + ' soma ' + mi(A.reduce(function (s, a) { return s + a.inc; }, 0)) + ' de EBITDA incremental em ' + H + ' anos', b: [
      { tipo: 'tab', x: 56, y: 150, w: 1168, tam: 12.5, denso: true, cab: ['R$ mil'].concat(A.map(function (a) { return String(a.ano); })), larg: [0.34].concat(A.map(function () { return wY; })), al: [''].concat(A.map(function () { return 'n'; })),
        rc: pl.map(function (r) { return r[2] || ''; }), linhas: pl.map(function (r) { return [{ t: r[0] }].concat(A.map(function (a) { var v = r[1](a); return { t: r[3] ? (v == null ? '—' : X(v, 1)) : kR(v), n: true }; })); }) },
      { tipo: 'nota', x: 56, y: 620, w: 1168, texto: 'Ano ' + A[0].ano + ' com a operação a partir de ' + fmtMes(goLive()) + ' (meses anteriores ainda com a EMG). Investimento inicial com caixa no ano 0: ' + mi(-fl(sid).ent[0]) + '. Valores nominais, IPCA do Focus; negativos entre parênteses.' }] });

    /* 8 · financiamento */
    var av = c.C.av, fe = fgtsEstado(), cf = c.cenFIIS, la = c.lcdAuto, sC = c.C.escolha;
    if (sC) {
      var rk = av.ranking.slice(0, 5).map(function (x) { var s = x.sim; return [{ t: String(x.rank), c: true }, { t: x.linha.nome, b: x.linha.id === sC.linha.id }, { t: rotCusto(s.custo) }, { t: Pp(s.cet), n: true }, { t: Pp(s.custoTotal), n: true }, { t: s.n + ' · ' + s.c, c: true }]; });
      rk.push([{ t: 'B', c: true }, { t: 'Financiamento dos fornecedores (HFS/GE)' }, { t: 'implícito' }, { t: Pp(c.B.cetAno), n: true }, { t: '—', n: true }, { t: c.B.n + ' · 0', c: true }]);
      var finB = [];
      finB.push('**FGTS-Saúde:** ' + (fe.st === 'na' ? 'não se aplica' : fe.txt) + '.');
      if (cf && cf.pedido) finB.push('**FIIS Saúde:** ' + (cf.emUso ? 'em uso no plano.' : 'só para proponentes da Chamada Pública de 2025; se o HDA tiver proposta habilitada, o VPL de C muda ' + sgnMi(cf.pedido.delta) + '.'));
      if (la && !la.emUso) finB.push('**BNDES Automático:** a Taxa LCD só fica mais barata que a linha em uso com sobretaxa abaixo de ' + Pp(la.empate) + '; serve se entrar obra ou instalação.');
      if (+m.altC.prazo > (c.C.n || 0) || +m.altC.carencia > (c.C.c || 0)) finB.push('**Prazo pedido de ' + m.altC.prazo + ' meses e ' + m.altC.carencia + ' de carência:** a linha em uso vai até ' + c.C.n + ' e ' + c.C.c + '; prazos maiores só no Automático, a custo maior.');
      if (c.C.cfi && (c.C.cfi.sem > 0 || c.C.cfi.prev > 0)) finB.push('**Código FINAME (CFI):** ' + [c.C.cfi.prevItens.length ? c.C.cfi.prevItens.join(', ') + ' com código previsto' : '', c.C.cfi.semItens.length ? c.C.cfi.semItens.join(' e ') + ' fora do catálogo' : ''].filter(Boolean).join('; ') + '.');
      lista.push({ nav: 'Financiamento', k: 'Financiamento da compra VMI (C)', t: 'O pacote VMI se financia pelo ' + linhaC + ' a ' + Pp(c.C.cetAno) + ' ao ano, em ' + c.C.n + ' meses com ' + (c.C.c || 0) + ' de carência', b: [
        { tipo: 'kpis', x: 56, y: 150, w: 1168, h: 100, cols: 5, vtam: 20, itens: [
          { lab: 'Valor financiado', v: mi(c.C.capexFin), sub: rmLig && c.C.rmFin ? 'pacote ' + mi(c.C.capexFin - c.C.capexFinRM) + ' + RM ' + mi(c.C.capexFinRM) : 'pacote VMI', cls: '' },
          { lab: 'Custo efetivo (CET)', v: Pp(c.C.cetAno), sub: 'ao ano · ' + rotCusto(sC.sim.custo), cls: 'good' },
          { lab: 'Prazo · carência', v: c.C.n + ' · ' + (c.C.c || 0) + ' m', sub: 'pedido: ' + m.altC.prazo + ' · ' + m.altC.carencia + ' meses', cls: '' },
          { lab: 'Parcela', v: R(c.C.parcela), sub: 'depois da carência · ' + R(c.C.primeira) + ' na carência', cls: '' },
          { lab: 'Taxa de êxito S&S', v: R(c.C.honor), sub: P(+m.altC.honorario_pct, 2) + ' do captado, tributos inclusos', cls: '' }] },
        { tipo: 'tab', x: 56, y: 276, w: 760, tam: 13, denso: true, cab: ['#', 'Linha', 'Custo financeiro', 'CET a.a.', 'Custo total', 'Prazo · car.'], larg: [0.05, 0.43, 0.14, 0.12, 0.13, 0.13], al: ['c', '', '', 'n', 'n', 'c'], hl: rk.map(function (r) { return r[1].b; }), linhas: rk },
        { tipo: 'txt', x: 846, y: 276, w: 378, tam: 13.5, bullets: finB },
        { tipo: 'nota', x: 56, y: 650, w: 1168, texto: 'Motor da ferramenta Financiamento VMI, base de linhas ' + BASE.versao + '. Custo total inclui IOF, tarifas e a taxa de êxito; ranking das linhas elegíveis para o HDA.' }] });
    }

    /* 9 · crédito do hospital */
    var L = c.ent.linhas, catsC = L.slice(0, Math.min(L.length, 6)).map(function (l) { return String(l.ano); });
    lista.push({ nav: 'Crédito do hospital', k: 'Capacidade de crédito', t: 'O projeto se paga; a questão do banco é a dívida atual: em ' + l1.ano + ' o hospital cobre ' + X(l1.dscrSemProj) + ' do serviço, ' + X(l1.dscrSem) + ' com o projeto e ' + X(l1.dscrCom) + ' com o TDC', b: [
      { tipo: 'g', x: 56, y: 150, w: 720, tit: 'Cobertura do serviço da dívida (EBITDA ÷ parcelas do ano)', f: function (el) { el.innerHTML = svgLines({ cats: catsC, series: [{ nome: 'Sem o projeto', vals: L.slice(0, catsC.length).map(function (l) { return l.dscrSemProj == null ? null : Math.min(l.dscrSemProj, 6); }), cor: 'var(--s-a)', dash: true }, { nome: 'Com o projeto, sem TDC', vals: L.slice(0, catsC.length).map(function (l) { return l.dscrSem == null ? null : Math.min(l.dscrSem, 6); }), cor: 'var(--s-b)' }, { nome: 'Com o projeto e o TDC', vals: L.slice(0, catsC.length).map(function (l) { return l.dscrCom == null ? null : Math.min(l.dscrCom, 6); }), cor: 'var(--s-c)' }], fmt: function (v) { return X(v, 1); }, ref: { v: 1.3, label: 'referência dos agentes 1,3x' }, h: 340, aria: 'DSCR' }); } },
      { tipo: 'kpis', x: 810, y: 150, w: 414, h: 190, cols: 2, vtam: 19, itens: [
        { lab: 'Dívida líquida', v: mi(c.ent.dl), sub: X(c.ent.dlEbitda) + ' o EBITDA', cls: c.ent.dlEbitda > 3 ? 'bad' : 'warn' },
        { lab: 'EBITDA anualizado', v: mi(c.ent.ebitdaBase), sub: 'DRE gerencial jan–ago/26', cls: '' },
        { lab: 'TDC', v: mi(m.entidade.tdc_min), sub: 'em ' + m.entidade.tdc_mes + ' · liquida ' + P(m.entidade.tdc_liquida, 0) + ' da dívida', cls: 'good' },
        { lab: 'Dívida líquida após o TDC', v: mi(c.ent.dlAposTdc), sub: 'o financiamento vira a única dívida longa', cls: 'good' }] },
      { tipo: 'txt', x: 810, y: 364, w: 414, tam: 14.5, bullets: [
        'O projeto soma ' + mi(l1.inc) + ' de EBITDA no 1º ano e pede ' + mi(l1.servNovo) + ' de parcelas: melhora a cobertura mesmo sem o TDC.',
        'O agente vai olhar o TDC, a garantia real (imóvel) ou o FGI antes de aprovar.',
        'Sequência: protocolar com o TDC emitido e desembolsar na entrega dos equipamentos.'] },
      { tipo: 'nota', x: 56, y: 650, w: 1168, texto: 'Entidade: mapa de empréstimos de dez/2025 e balanço de ago/2026 (deck do Conselho). Valores acima de 6x cortados no gráfico.' }] });

    /* 10 · ressonância */
    if (qR) {
      var rr = m.rm, dsc = function (x, i) { return X(x.dscr[i].v); }, rmS = rmSusDelta(sid), ri = c.rm.isolada;
      var rmRows = [
        [{ t: 'VPL para o hospital, sem RM' }].concat(alts.map(function (k) { return { t: mi(qR.sem[k].vplEnt), n: true }; })),
        [{ t: 'VPL para o hospital, com RM' }].concat(alts.map(function (k) { return { t: mi(qR.com[k].vplEnt), n: true }; })),
        [{ t: 'Diferença', b: true }].concat(alts.map(function (k) { var d = qR.eq[k].delta; return { t: sgnMi(d), n: true, b: true, cor: d >= 0 ? 'good' : 'bad' }; })),
        [{ t: 'Cobertura em ' + qR.sem.C.dscr[1].ano + ', sem → com RM' }].concat(alts.map(function (k) { return { t: dsc(qR.sem[k], 1) + ' → ' + dsc(qR.com[k], 1), n: true }; })),
        [{ t: 'Dívida nova com a RM' }].concat(alts.map(function (k) { return { t: k === 'D' ? 'nenhuma' : mi(qR.com[k].fin), n: true }; })),
        [{ t: 'Equilíbrio (exames de convênio/mês)' }].concat(alts.map(function (k) { return { t: N(qR.eq[k].volume), n: true }; }))];
      var rmB = [
        'Premissas (hipóteses S&S a validar): ' + N(rr.exames_mes) + ' exames de convênio e particular por mês a ' + R(rr.ticket) + ', ' + P(rr.rampa1, 0) + ' no 1º ano e ' + P(rr.rampa2, 0) + ' no 2º; aprovação em ' + fmtMes(rr.aprovacao) + ', operação em ' + fmtMes(E.mesRMStr(m)) + '.',
        'Em ' + sid + ', a RM empata com ' + N(eqR.volume) + ' exames por mês, ou ticket de ' + R(eqR.ticket) + ', ou preço de ' + mi(eqR.preco) + ' (informado: ' + mi(qR.p0) + '; referências de R$ 4,33 a 4,9 mi).'];
      if (rmS) rmB.push('Com ' + N((m.sus || {}).rm_mes) + ' RMs por mês do SUS pelo Agora Tem Especialistas (R$ ' + NF2.format(+(m.sus || {}).rm_valor || 0) + '), a RM passa de ' + sgnMi(rmS.sem) + ' para ' + sgnMi(rmS.com) + ' em ' + sid + '.');
      rmB.push('Condição: o HDA negociar com os planos de saúde a volta da RM aos pacotes de reembolso, de onde ela saiu recentemente.');
      lista.push({ nav: 'Ressonância', k: 'Ressonância magnética · Cignus 600 sem hélio', t: 'Com as hipóteses atuais, a ressonância ' + (eqR.delta >= 0 ? 'soma ' : 'tira ') + mi(Math.abs(eqR.delta)) + ' do valor da ' + curtoAlt[sid] + ' e só empata com ' + N(eqR.volume) + ' exames por mês: decisão à parte', b: [
        { tipo: 'tab', x: 56, y: 150, w: 720, tam: 14, cab: ['', 'B · GE', 'C · VMI compra', 'D · VMI locação'], larg: [0.37, 0.21, 0.21, 0.21], al: ['', 'n', 'n', 'n'], rc: ['', '', 'total', '', '', ''], linhas: rmRows },
        { tipo: 'txt', x: 810, y: 150, w: 414, tam: 14.5, bullets: rmB },
        { tipo: 'nota', x: 56, y: 650, w: 1168, texto: 'Cenário ' + (rmLig ? 'com' : 'sem') + ' RM na página. Na compra, a RM entra num segundo contrato da mesma linha, liberado na entrega; na locação, o aluguel segue o proxy da TC.' + (ri ? ' Sozinha, sem financiamento: VPL de ' + mi(ri.vpl) + '.' : '') }] });
    }

    /* 11 · chaves de cenário */
    var melhor = function (o) { return alts.slice().sort(function (a, b) { return o[b].vplEnt - o[a].vplEnt; })[0]; };
    var chRows = [], chRc = [], chHl = [], melhores = [], grupo = null, muda = [];
    var linhaCh = function (lab, o, atual) { var bst = melhor(o); melhores.push(bst); if (bst !== best && muda.filter(function (x) { return x.g === grupo; }).length === 0) muda.push({ g: grupo, lab: lab, bst: bst }); chRows.push([{ t: lab + (atual ? ' (atual)' : ''), b: atual }].concat(alts.map(function (k) { return { t: mi(o[k].vplEnt), n: true, b: k === bst }; })).concat([{ t: bst + ' · ' + { B: 'GE', C: 'VMI compra', D: 'VMI locação' }[bst], c: true }])); chRc.push(''); chHl.push(!!atual); };
    var secCh = function (t, g) { grupo = g; chRows.push([{ t: t }]); chRc.push('sec'); chHl.push(false); };
    if (qP) { secCh('PACS Sectra (estimativa S&S, sem cotação)', 'o PACS'); linhaCh('Com PACS', qP.com, qP.on); linhaCh('Sem PACS', qP.sem, !qP.on); }
    if (qS) { secCh('SUS', 'o SUS'); linhaCh('Fora (decisão do CEO)', qS.v.fora, qS.modo === 'fora'); linhaCh('SUS atual', qS.v.atual, qS.modo === 'atual'); linhaCh('SUS atual + Agora Tem Especialistas', qS.v.ate, qS.modo === 'ate'); }
    if (qR) { secCh('Ressonância', 'a ressonância'); linhaCh('Sem RM', qR.sem, !rmLig); linhaCh('Com RM', qR.com, rmLig); }
    var qX = c.cenCambio, fX = qX ? fxInfo() : null, temX = !!(qX && fX.tem);
    if (temX) { secCh('Câmbio do pacote GE (parcelas ' + (fX.modo === 'dolar' ? 'atreladas ao dólar' : 'fixas em R$') + ')', 'o câmbio'); var lx = qX.linhas, lsel = [lx[0], lx.filter(function (l) { return l.atual; })[0], lx[lx.length - 1]].filter(function (l, i, a) { return l && a.indexOf(l) === i; });
      lsel.forEach(function (l) { linhaCh('Dólar a ' + FXr(l.usd), { B: { vplEnt: l[fX.modo].vplEnt }, C: { vplEnt: qX.vC }, D: { vplEnt: qX.vD } }, l.atual); }); }
    var gruposTodos = [qP ? 'o PACS' : null, qS ? 'o SUS' : null, qR ? 'a ressonância' : null, temX ? 'o câmbio' : null].filter(Boolean), gruposMuda = muda.map(function (x) { return x.g; });
    var listaE = function (a) { return a.length > 1 ? a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1] : a[0]; }, cap = function (t) { return t.charAt(0).toUpperCase() + t.slice(1); };
    var tCh = !muda.length ? cap(listaE(gruposTodos)) + ' mudam o tamanho do ganho, não a escolha: a ' + curtoAlt[best] + ' fica à frente em todos os cenários'
      : cap(listaE(gruposMuda)) + ' ' + (gruposMuda.length > 1 ? 'mudam' : 'muda') + ' a escolha: ' + muda.map(function (x) { return x.lab.charAt(0).toLowerCase() + x.lab.slice(1) + ', a melhor passa a ser a ' + curtoAlt[x.bst]; }).join('; ') + (gruposTodos.length > gruposMuda.length ? '. ' + cap(listaE(gruposTodos.filter(function (g) { return gruposMuda.indexOf(g) < 0; }))) + ' só ' + (gruposTodos.length - gruposMuda.length > 1 ? 'mudam' : 'muda') + ' o tamanho do ganho' : '');
    lista.push({ nav: 'Cenários', k: 'Chaves de cenário', t: tCh, b: [
      { tipo: 'tab', x: 56, y: 150, w: 1168, tam: 14.5, cab: ['VPL para o hospital, ' + H + ' anos', 'B · GE, compra', 'C · VMI, compra', 'D · VMI, locação', 'Melhor'], larg: [0.36, 0.16, 0.16, 0.16, 0.16], al: ['', 'n', 'n', 'n', 'c'], rc: chRc, hl: chHl, linhas: chRows },
      { tipo: 'nota', x: 56, y: 650, w: 1168, texto: 'Cada linha muda uma chave e mantém as outras como no cenário atual (destacado). As chaves ficam na Tese e em Premissas.' }] });

    /* 11b · câmbio do pacote GE */
    if (temX) {
      var mxCD = Math.max(qX.vC, qX.vD), fxr = fX.rr, it0 = fX.itensTxt.charAt(0).toUpperCase() + fX.itensTxt.slice(1);
      var fxRows = qX.linhas.map(function (l) { var d = l[fX.modo].vplEnt - mxCD; return [{ t: FXr(l.usd) + (l.proposta ? ' · proposta GE' : '') + (l.atual ? ' · premissa' : ''), b: l.atual }, { t: R(fX.fx.usdTotal * l.usd), n: true }, { t: R(l[fX.modo].parcela), n: true }, { t: mi(l.fixas.vplEnt), n: true, b: l.atual && fX.modo === 'fixas' }, { t: mi(l.dolar.vplEnt), n: true, b: l.atual && fX.modo === 'dolar' }, { t: (d >= 0 ? '+' : '') + mi(d), n: true, cor: d >= 0 ? 'good' : 'bad' }]; });
      lista.push({ nav: 'Câmbio', k: 'Câmbio · pacote GE (B)', t: 'O câmbio pesa só no pacote GE: a ' + FXr(fX.fx.usd) + ', o VPL de B ' + (fX.dVpl <= 0 ? 'cai ' : 'sobe ') + mi(Math.abs(fX.dVpl)) + ' frente à proposta; ' + fxEmpateTxt(fxr.empateC, 'C', fl('B').vplEnt, fl('C').vplEnt), b: [
        { tipo: 'tab', x: 56, y: 150, w: 810, tam: 14, cab: ['Dólar (R$/US$)', 'Itens em US$ (R$)', 'Parcela B (R$/mês)', 'VPL B, parcelas fixas', 'VPL B, atreladas', 'B − melhor de C e D'], larg: [0.25, 0.15, 0.15, 0.15, 0.14, 0.16], al: ['', 'n', 'n', 'n', 'n', 'n'], hl: qX.linhas.map(function (l) { return l.atual; }), linhas: fxRows },
        { tipo: 'g', x: 56, y: 348, w: 810, tit: 'VPL para o hospital conforme o dólar (R$/US$)', f: function (el) {
          var us = [], u; for (u = 4.5; u <= 6.5001; u += 0.25) us.push(Math.round(u * 100) / 100);
          var lin = function (k) { return us.map(function (x) { return qX.r[k].vplAtual + qX.r[k].porDecimo * 10 * (x - fX.fx.usd); }); };
          el.innerHTML = svgLines({ cats: us.map(function (x) { return NF2.format(x); }), h: 215, zoom: true, fmt: function (v) { return mi(v); }, aria: 'VPL conforme o câmbio', series: [
            { nome: 'B · parcelas fixas', vals: lin('fixas'), cor: ALT_COR.B }, { nome: 'B · atreladas ao dólar', vals: lin('dolar'), cor: ALT_COR.B, dash: true },
            { nome: 'C · VMI compra', vals: us.map(function () { return qX.vC; }), cor: ALT_COR.C }, { nome: 'D · VMI locação', vals: us.map(function () { return qX.vD; }), cor: ALT_COR.D, dash: true }] }); } },
        { tipo: 'txt', x: 900, y: 150, w: 324, tam: 14.5, bullets: [
          it0 + ' em dólar: US$ ' + NF0.format(Math.round(fX.fx.usdTotal)) + ' (proposta a ' + FXr(fX.fx.ref) + '). C e D são cotações VMI em reais.',
          'Cada R$ 0,10 no dólar: **' + R(Math.abs(fxr.parcelaPorDecimo)) + '/mês** na parcela e **' + mi(Math.abs(fxr.porDecimo)) + '** no VPL de B.',
          fxEmpateTxt(fxr.empateC, 'C', fl('B').vplEnt, fl('C').vplEnt) + '; ' + fxEmpateTxt(fxr.empateD, 'D', fl('B').vplEnt, fl('D').vplEnt) + '.',
          '**A confirmar com a GE:** itens em dólar, parcela fixa em reais depois da assinatura e validade do preço.'] },
        { tipo: 'nota', x: 56, y: 650, w: 1168, texto: 'Parcelas ' + (fX.modo === 'dolar' ? 'atreladas ao dólar (+' + Pp(fX.fx.va * 100) + ' a.a., Focus)' : 'fixas em reais desde a assinatura') + ' no cenário atual. PTAX de venda: R$ 5,04 (23/10), R$ 5,50 (26/10) e R$ 5,3420 (28/10/2026). Focus de 23/10/2026: R$ 5,05 (2026), R$ 5,15 (2027), R$ 5,28 (2029).' }] });
    }

    /* 12 · sensibilidade */
    var sens = sensDeck(), top = sens.itens.slice(0, 3);
    lista.push({ nav: 'Sensibilidade', k: 'Sensibilidade', t: 'O que mais move o valor do projeto é ' + (top[0] ? top[0].nome.toLowerCase() : 'o volume') + (top[1] ? ', seguido de ' + top[1].nome.toLowerCase() : ''), b: [
      { tipo: 'g', x: 56, y: 150, w: 860, f: function (el) { el.innerHTML = svgTornado(sens.itens, function (v) { return mi(v); }); } },
      { tipo: 'txt', x: 950, y: 150, w: 274, tam: 14.5, bullets: top.map(function (it) { return '**' + it.nome + '** (' + it.loTxt + ' → ' + it.hiTxt + '): de ' + sgnMi(it.lo) + ' a ' + sgnMi(it.hi) + '.'; }) },
      { tipo: 'nota', x: 56, y: 650, w: 1168, texto: 'VPL do projeto (' + sid + ') de ' + mi(sens.base) + '. Cada barra move uma premissa por vez, mantendo as demais; vermelho reduz, verde aumenta.' }] });

    /* 13 · premissas-chave */
    var pr = [
      ['base.exames', 'Exames por mês, convênio e particular', N(+m.base.exames / +m.base.meses)],
      ['base.ticket', 'Ticket médio', R(m.base.ticket)],
      ['cenario.volume_var', 'Variação de volume no cenário', (m.cenario.volume_var >= 0 ? '+' : '') + P(m.cenario.volume_var, 0)],
      ['propria.rep_med_pct', 'Laudo na imagem própria (% da receita)', P(m.propria.rep_med_pct, 1)],
      ['base.cf_dir_mes', 'Equipe técnica e fixos diretos', R(m.base.cf_dir_mes) + '/mês'],
      ['manut.plano', 'Manutenção pós-garantia (C)', (c.C.manut.plano === 'prata' ? 'Prata' : 'Ouro') + ', ' + R(c.C.manut.mes) + '/mês'],
      ['propria.rispacs_mes', 'RIS (Touch Health)', R(m.propria.rispacs_mes) + '/mês + ' + mi(+m.propria.rispacs_impl || 0)],
      ['propria.pacs_exame', 'PACS Sectra Standard', pacsOn() ? 'R$ ' + NF2.format(+m.propria.pacs_exame || 0) + '/exame + ' + mi(+m.propria.pacs_impl || 0) : 'fora do modelo'],
      ['fin.inicio_op_mes', 'Início da operação própria', fmtMes(goLive())],
      ['altC.prazo', 'Financiamento pedido (C)', m.altC.prazo + ' meses, ' + m.altC.carencia + ' de carência'],
      ['altD.prazo', 'Locação (D)', c.D.n + ' meses'],
      ['cambio.usd', 'Câmbio do pacote GE (B)', FXr(m.cambio.usd) + ' (proposta ' + FXr(m.cambio.ref) + ')'],
      ['fin.desconto', 'Taxa de desconto e horizonte', P(m.fin.desconto, 0) + ' a.a., ' + H + ' anos'],
      ['cenario.reajuste_modo', 'Inflação nos fluxos', (m.cenario.reajuste_modo || 'ipca') === 'ipca' ? 'IPCA do Focus' : 'taxa fixa'],
      ['sus.modo', 'SUS no modelo', susNome(E.susModo(m))],
      ['entidade.tdc_min', 'TDC', mi(m.entidade.tdc_min) + ' em ' + m.entidade.tdc_mes]];
    if (qR) pr.push(['rm.exames_mes', 'Ressonância', (rmLig ? 'incluída: ' : 'fora: ') + N(m.rm.exames_mes) + ' exames/mês a ' + R(m.rm.ticket)]);
    var prRows = pr.map(function (r) { var s0 = sch(r[0]); return [{ t: r[1] }, { t: r[2], n: true }, { t: ORIG[s0.origem] || s0.origem || '—', c: true, cor: s0.origem === 'pendente' ? 'bad' : '' }]; });
    lista.push({ nav: 'Premissas-chave', k: 'Premissas', t: 'Premissas-chave e de onde vêm: ' + pendentesN() + ' das ' + SCHEMA.length + ' premissas do modelo ainda estão a validar com o hospital', b: [
      { tipo: 'tab', x: 56, y: 150, w: 1000, tam: 13.5, denso: true, cab: ['Premissa', 'Valor', 'Origem'], larg: [0.44, 0.36, 0.2], al: ['', 'n', 'c'], linhas: prRows },
      { tipo: 'nota', x: 56, y: 650, w: 1168, texto: 'Origem: Controladoria (planilha Viabilidade v2), Jaime (Projeto Radiologia), Conselho (deck de out/26), CEO (reunião de 20/10), VMI, fontes públicas e premissas S&S. Lista completa na aba Premissas.' }] });

    /* 14 · riscos */
    var rk2 = [
      '**Janela sem TC na troca.** O contrato com a EMG pede 90 dias de aviso. Enviar o aviso só com o financiamento aprovado e a entrega firme (go-live em ' + fmtMes(goLive()) + ').',
      pacsOn() ? '**PACS é estimativa, não cotação.** R$ ' + NF2.format(+m.propria.pacs_exame || 0) + ' por exame e ' + mi(+m.propria.pacs_impl || 0) + ' de implantação; tira ' + mi(qP ? -qP.delta[sid] : 0) + ' do VPL. Cotar a Sectra (a S&S representa a Sectra: declarado).' : '**PACS fora do número.** O hospital vai precisar de um PACS: com a estimativa S&S, o VPL cai ' + mi(qP ? -qP.delta[sid] : 0) + '. Trocar pela cotação assim que sair.',
      '**Código FINAME da Pulsar.** O modelo assume o credenciamento até dez/2026. Se atrasar, a TC sai do FINAME' + (fe.st === 'fora' ? ' e vai para recurso próprio ou o BNDES Automático' : ' e vai para o FGTS-Saúde, se couber, ou recurso próprio') + '.',
      '**Crédito antes do TDC.** Sem o TDC, a cobertura de ' + l1.ano + ' fica em ' + X(l1.dscrSem) + ' e o banco pode pedir garantia real ou adiar.'];
    if (qR) rk2.push('**Ressonância depende de volume.** Empata com ' + N(eqR.volume) + ' exames por mês; validar a demanda e a volta da RM aos pacotes dos planos antes de comprar.');
    (function () { var f = fxInfo(); if (!f.q || !f.tem) return; rk2.push('**Câmbio no pacote GE.** ' + f.itensTxt.charAt(0).toUpperCase() + f.itensTxt.slice(1) + ' em dólar: a ' + FXr(f.fx.usd) + ', o VPL de B ' + (f.dVpl <= 0 ? 'cai ' : 'sobe ') + mi(Math.abs(f.dVpl)) + ' frente à proposta (' + FXr(f.fx.ref) + '); ' + fxEmpateTxt(f.rr.empateC, 'C', c.flB.vplEnt, c.flC.vplEnt) + '.' + (sid === 'B' || best === 'B' ? ' Fixar as parcelas em reais na assinatura.' : '')); })();
    lista.push({ nav: 'Riscos', k: 'Riscos', t: 'O que pode dar errado e como evitar', b: [{ tipo: 'txt', x: 56, y: 156, w: 1168, tam: 18, bullets: rk2 }] });

    /* 15+ · pendências que mudam o número (paginadas) */
    var pend = (secao('Pendências que mudam o número').b || []).filter(function (p) { return !/^Fechadas com o CEO/.test(p); }), fech = (secao('Pendências que mudam o número').b || []).filter(function (p) { return /^Fechadas com o CEO/.test(p); })[0];
    var totC = pend.reduce(function (a, p) { return a + semMd(p).length; }, 0), nPag = Math.max(1, Math.ceil(totC / 1700), Math.ceil(pend.length / 7)), porPag = Math.ceil(pend.length / nPag), pags = [];
    for (var pi = 0; pi < pend.length; pi += porPag) pags.push(pend.slice(pi, pi + porPag));
    pags.forEach(function (pg, i) {
      lista.push({ nav: 'Pendências' + (pags.length > 1 ? ' (' + (i + 1) + '/' + pags.length + ')' : ''), k: 'Pendências que mudam o número' + (pags.length > 1 ? ' · ' + (i + 1) + ' de ' + pags.length : ''), t: i === 0 ? pend.length + ' pendências ainda mudam o número; cada uma com o efeito medido no modelo' : 'Pendências que mudam o número (continuação)', b: [
        { tipo: 'txt', x: 56, y: 150, w: 1168, tam: 15, bullets: pg }].concat(i === pags.length - 1 && fech ? [{ tipo: 'nota', x: 56, y: 640, w: 1168, texto: fech }] : []) });
    });

    /* gates */
    var gates = [
      { t: 'Gate 0 · agora', itens: ['Aprovar a tese e o perímetro (TC, 2 ultrassons, RX móvel, RX digital, placa DR)', 'Formalizar as propostas VMI de compra e de locação; cotar RIS (Touch Health) e PACS (Sectra Standard)', 'Detalhar a folha da equipe técnica e confirmar o telelaudo'].concat(qR ? ['Ressonância à parte: planos de saúde, demanda, preço e projeto da sala'] : []) },
      { t: 'Gate 1 · dez/26 a 1T27', itens: ['TDC emitido e negociação iniciada', 'Código FINAME da Pulsar publicado', 'Protocolar o FINAME com o kit de documentos (ou fechar a locação)'].concat(fe.st === 'cond' ? ['Responder as perguntas do FGTS-Saúde'] : []).concat(cf && cf.pedido && !cf.marcado ? ['Confirmar se há proposta na Chamada FIIS 2025'] : []) },
      { t: 'Gate 2 · 2T27', itens: ['Contratar o financiamento e o pedido de compra, ou assinar a locação', 'Aviso de 90 dias à EMG casado com a entrega', 'Contratar manutenção, RIS e PACS'].concat(rmLig ? ['RM aprovada em ' + fmtMes(m.rm.aprovacao) + ', operação em ' + fmtMes(E.mesRMStr(m))] : []) },
      { t: 'Gate 3 · operação', itens: ['Imagem própria em regime a partir de ' + fmtMes(goLive()), 'Indicadores: exames, espera, repetição, disponibilidade, custo por exame', 'Revisar as premissas a cada trimestre'] }];
    var gw = (1168 - 3 * 18) / 4;
    lista.push({ nav: 'Próximos passos', k: 'Próximos passos', t: 'Decisão em gates: aprovar agora só o Gate 0; cada etapa libera a seguinte', b: gates.map(function (g, i) { return { tipo: 'txt', x: 56 + i * (gw + 18), y: 150, w: gw, titulo: g.t, cor: i === 0 ? 'acc' : '', tam: 14.5, bullets: g.itens }; }).concat([{ tipo: 'nota', x: 56, y: 650, w: 1168, texto: 'Pedido de hoje: aprovar a tese e o Gate 0. A contratação (Gate 2) só depois do TDC e das cotações.' }]) });

    /* fontes e método */
    lista.push({ nav: 'Método e fontes', k: 'Método e fontes', t: 'Como o número foi feito', b: [
      { tipo: 'txt', x: 56, y: 150, w: 560, titulo: 'Método', tam: 14.5, bullets: [
        'Incremental: imagem própria menos o modelo atual com a EMG, com a mesma receita; custos fixos e indiretos iguais nos dois.',
        'VPL para o hospital = fluxo depois de manutenção ou aluguel, parcelas e investimento com caixa, em ' + H + ' anos a ' + P(m.fin.desconto, 0) + ' a.a.',
        'Inflação: IPCA do Focus em receitas, custos e aluguel; parcelas do financiamento nominais.',
        'Financiamento: motor da ferramenta Financiamento VMI (base de linhas ' + BASE.versao + '), com IOF, tarifas e a taxa de êxito da S&S.',
        'Cobertura da dívida do hospital: EBITDA anualizado ÷ parcelas do ano, com e sem o TDC.'] },
      { tipo: 'txt', x: 664, y: 150, w: 560, titulo: 'Fontes', tam: 14.5, bullets: [
        'Controladoria: DRE por unidade de negócio, jan–jun/2026 (planilha Viabilidade v2).',
        'Projeto Radiologia e Proposta Estratégica (Jaime); deck da Reunião do Conselho de out/2026.',
        'Respostas do CEO na reunião de 20/10/2026.',
        'VMI: preços de 15/10/2026 e tabela de locação de 16/10/2026' + (qR ? '; Cignus 600 em 19/10/2026' : '') + '.',
        'BNDES (Catálogo CFI, linhas e taxas), Manual de Fomento FGTS Saúde v002, Manual da Chamada FIIS Saúde 2025, Banco Central (Focus).'] },
      { tipo: 'nota', x: 56, y: 650, w: 1168, texto: 'Gerado em ' + hoje.toLocaleDateString('pt-BR') + ' da página "Viabilidade da internalização com equipamentos VMI" (S&S Partners), ' + origemTxt() + '. Para mudar um número, altere na página e abra a apresentação de novo.' }] });
    return lista;
  }

  /* ---------- montagem de um slide ---------- */
  function tabHtml(b) {
    var r0 = b.linhas[0] || [], al = function (i) { if (b.al) return b.al[i] || ''; var c = r0[i] || {}; return c.n ? 'n' : (c.c ? 'c' : ''); };
    var cel = function (c) { var t = esc(c.t == null ? '' : c.t).replace(/\n/g, '<br>'); return c.b ? '<b>' + t + '</b>' : t; };
    var h = '<table class="sl-tab' + (b.denso ? ' dense' : '') + '" style="font-size:' + b.tam + 'px"><colgroup>' + b.larg.map(function (f) { return '<col style="width:' + (f * 100).toFixed(1) + '%">'; }).join('') + '</colgroup><thead><tr>' + b.cab.map(function (c, i) { return '<th class="' + al(i) + '">' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
    b.linhas.forEach(function (ln, i) {
      var rc = (b.rc && b.rc[i]) || '';
      if (rc === 'sec') { h += '<tr class="sec"><td colspan="' + b.larg.length + '">' + esc(ln[0].t) + '</td></tr>'; return; }
      h += '<tr class="' + ((b.hl && b.hl[i] ? 'hl ' : '') + rc).trim() + '">' + ln.map(function (c, k) { return '<td class="' + al(k) + '"' + (c.cor ? ' style="color:' + COR_TXT[c.cor] + '"' : '') + '>' + cel(c) + '</td>'; }).join('') + '</tr>';
    });
    return h + '</tbody></table>';
  }
  function txtHtml(b) {
    return (b.titulo ? '<h3' + (b.cor && COR_TXT[b.cor] ? ' style="color:' + COR_TXT[b.cor] + '"' : '') + '>' + esc(b.titulo) + '</h3>' : '') + (b.bullets ? '<ul style="font-size:' + b.tam + 'px">' + b.bullets.map(function (x) { return '<li>' + mdInline(nbsp(x), true) + '</li>'; }).join('') + '</ul>' : '') + (b.paras || []).map(function (p) { return '<p style="font-size:' + b.tam + 'px' + (b.cor === 'muted' ? ';color:var(--fg-2)' : '') + '">' + mdInline(p, true) + '</p>'; }).join('');
  }
  function montarSlide(cont, s, i, n) {
    cont.innerHTML = '';
    var root = document.createElement('div'); root.className = 'sl' + (s.capa ? ' capa' : '');
    root.innerHTML = '<div class="sl-k">' + esc(s.k || '') + '</div><h1 class="sl-t">' + esc(nbsp(s.t)) + '</h1>' + (s.sub ? '<p class="sl-sub">' + esc(s.sub) + '</p>' : '') + '<div class="sl-f"><span>Internalização da imagem · Hospital Dom Alvarenga · S&amp;S Partners</span><span>' + esc(origemTxt()) + '</span><span>' + (i + 1) + ' / ' + n + '</span></div>';
    cont.appendChild(root);
    var nos = [];
    s.b.forEach(function (b) {
      var d = document.createElement('div'); d.className = 'sb sb-' + b.tipo; d.style.cssText = 'left:' + b.x + 'px;top:' + b.y + 'px;width:' + b.w + 'px;' + (b.h ? 'height:' + b.h + 'px;' : '');
      root.appendChild(d); nos.push(d);
      if (b.tipo === 'g') { d.innerHTML = (b.tit ? '<div class="sb-tit">' + esc(b.tit) + '</div>' : '') + '<div class="chart"></div>'; b.f(d.querySelector('.chart')); }
      else if (b.tipo === 'txt') d.innerHTML = txtHtml(b);
      else if (b.tipo === 'kpis') d.innerHTML = '<div class="sl-kpis" style="grid-template-columns:repeat(' + b.cols + ',minmax(0,1fr))">' + b.itens.map(function (k) { return '<div class="sl-kpi"><span class="stripe ' + (k.cls || '') + '"></span><span class="lab">' + esc(k.lab) + '</span><span class="v"' + (b.vtam ? ' style="font-size:' + b.vtam + 'px"' : '') + '>' + esc(k.v) + '</span>' + (k.sub ? '<span class="sub">' + esc(k.sub) + '</span>' : '') + '</div>'; }).join('') + '</div>';
      else if (b.tipo === 'tab') d.innerHTML = tabHtml(b);
      else if (b.tipo === 'nota') d.innerHTML = '<p>' + esc(semMd(b.texto)) + '</p>';
      else if (b.tipo === 'img') d.innerHTML = '<img alt="" src="' + b.src + '">';
    });
    return { root: root, nos: nos };
  }

  /* ---------- modo apresentação ---------- */
  var ap = { lista: null, i: 0 };
  function apAberta() { return !$('#apres').hidden; }
  function apEscala() { var st = $('#apStage'), sl = $('#apSlide'); if (!st || !sl) return; var k = Math.min(st.clientWidth / 1280, st.clientHeight / 720); sl.style.transform = 'translate(-50%, -50%) scale(' + k + ')'; }
  function apMostrar(i) {
    ap.i = Math.max(0, Math.min(ap.lista.length - 1, i));
    montarSlide($('#apSlide'), ap.lista[ap.i], ap.i, ap.lista.length);
    $('#apNum').textContent = (ap.i + 1) + ' / ' + ap.lista.length; $('#apPrev').disabled = ap.i === 0; $('#apNext').disabled = ap.i === ap.lista.length - 1; $('#apIr').value = String(ap.i);
    apEscala();
  }
  function apMontarLista() {
    ap.lista = deckSlides();
    $('#apIr').innerHTML = ap.lista.map(function (s, i) { return '<option value="' + i + '">' + (i + 1) + ' · ' + esc(s.nav || s.k) + '</option>'; }).join('');
    $('#apVer').textContent = origemTxt();
  }
  function busy(msg) { var b = $('#busy'); if (msg) { b.querySelector('span').textContent = msg; b.hidden = false; } else b.hidden = true; }
  function abrirApresentacao() {
    if (!calc) return;
    busy('Montando a apresentação com os números atuais…');
    setTimeout(function () {
      try { apMontarLista(); } catch (e) { busy(null); toast('Não consegui montar a apresentação: ' + (e && e.message || e)); return; }
      busy(null);
      var o = $('#apres'); o.hidden = false; document.body.classList.add('sem-rolagem');
      apMostrar(0); $('#apNext').focus();
      try { if (o.requestFullscreen && !document.fullscreenElement) o.requestFullscreen().catch(function () { }); } catch (e) { }
      registrarUso('apresentacao');
    }, 30);
  }
  function fecharApresentacao() { $('#apres').hidden = true; document.body.classList.remove('sem-rolagem'); try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () { }); } catch (e) { } }
  /* números mudaram com a apresentação aberta (outra pessoa salvou, versão trocada): refaz no mesmo slide */
  function apAtualizar() { if (!apAberta() || !ap.lista) return; try { apMontarLista(); apMostrar(ap.i); } catch (e) { } }
  $('#btnApresentar').addEventListener('click', abrirApresentacao);
  $('#apPrev').addEventListener('click', function () { apMostrar(ap.i - 1); });
  $('#apNext').addEventListener('click', function () { apMostrar(ap.i + 1); });
  $('#apIr').addEventListener('change', function () { apMostrar(+this.value); });
  $('#apSair').addEventListener('click', fecharApresentacao);
  $('#apPptx').addEventListener('click', function () { baixarPptx(); });
  $('#apStage').addEventListener('click', function (e) { if (e.target.closest('a')) return; var r = $('#apStage').getBoundingClientRect(); apMostrar(ap.i + (e.clientX - r.left < r.width / 3 ? -1 : 1)); });
  document.addEventListener('keydown', function (e) {
    if (!apAberta()) return;
    if (e.target && e.target.id === 'apIr') return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); apMostrar(ap.i + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); apMostrar(ap.i - 1); }
    else if (e.key === 'Home') apMostrar(0); else if (e.key === 'End') apMostrar(ap.lista.length - 1);
    else if (e.key === 'Escape') fecharApresentacao();
  });
  var toqueX = null;
  $('#apStage').addEventListener('touchstart', function (e) { toqueX = e.touches[0].clientX; }, { passive: true });
  $('#apStage').addEventListener('touchend', function (e) { if (toqueX == null) return; var dx = e.changedTouches[0].clientX - toqueX; toqueX = null; if (Math.abs(dx) > 40) { e.preventDefault(); apMostrar(ap.i + (dx < 0 ? 1 : -1)); } });
  window.addEventListener('resize', function () { if (apAberta()) apEscala(); });
  document.addEventListener('fullscreenchange', function () { setTimeout(apEscala, 60); });

  /* ---------- PowerPoint (.pptx), das mesmas especificações ---------- */
  var PX = 1 / 96, FONTE = 'Calibri', libsP = {}, ocupado = false;
  function carregarLib(nome, global, urls) {
    if (window[global]) return Promise.resolve(window[global]);
    if (libsP[nome]) return libsP[nome];
    libsP[nome] = new Promise(function (ok, fail) {
      var i = 0;
      (function prox() {
        if (window[global]) { ok(window[global]); return; }
        if (i >= urls.length) { libsP[nome] = null; fail(new Error('não consegui carregar ' + nome)); return; }
        var s = document.createElement('script'); s.src = urls[i++]; s.onload = function () { if (window[global]) ok(window[global]); else prox(); }; s.onerror = prox; document.head.appendChild(s);
      })();
    });
    return libsP[nome];
  }
  function carregarPptx() { return carregarLib('PptxGenJS', 'PptxGenJS', ['https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js', 'https://unpkg.com/pptxgenjs@3.12.0/dist/pptxgen.bundle.js']); }
  function corHex(v) { v = String(v || '').trim(); if (/^#[0-9a-f]{6}$/i.test(v)) return v.slice(1).toUpperCase(); if (/^#[0-9a-f]{3}$/i.test(v)) return v.slice(1).split('').map(function (c) { return c + c; }).join('').toUpperCase(); var mm = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(v); if (mm) return [mm[1], mm[2], mm[3]].map(function (x) { return (+x).toString(16).padStart(2, '0'); }).join('').toUpperCase(); return '15201F'; }
  function corDe(v, cs) { var mm = /var\((--[\w-]+)\)/.exec(String(v || '')); return corHex(mm ? cs.getPropertyValue(mm[1]) : v); }
  /* SVG → PNG: resolve as variáveis de cor e grava fonte e cor do texto (o CSS da página não vai junto) */
  async function svgPng(svg, escala) {
    var r = svg.getBoundingClientRect(), w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height)), cs = getComputedStyle(svg);
    var cl = svg.cloneNode(true), orig = [svg].concat(Array.prototype.slice.call(svg.querySelectorAll('*'))), todos = [cl].concat(Array.prototype.slice.call(cl.querySelectorAll('*')));
    todos.forEach(function (e, k) {
      for (var a = 0; a < e.attributes.length; a++) { var at = e.attributes[a]; if (at.value.indexOf('var(') >= 0) e.setAttribute(at.name, at.value.replace(/var\((--[\w-]+)\)/g, function (m0, nm) { return cs.getPropertyValue(nm).trim() || '#15201f'; })); }
      if (e.tagName && e.tagName.toLowerCase() === 'text' && orig[k]) { var st = getComputedStyle(orig[k]); e.setAttribute('font-family', 'Arial, Helvetica, sans-serif'); e.setAttribute('font-size', st.fontSize); if (!e.getAttribute('fill')) e.setAttribute('fill', st.fill); }
    });
    /* rótulos que passam da caixa do gráfico (eixo à esquerda, último ano à direita) aparecem na página, mas seriam cortados no PNG: amplia o viewBox até o conteúdo */
    try {
      var vb = svg.viewBox && svg.viewBox.baseVal;
      if (vb && vb.width && vb.height) {
        var bb = svg.getBBox(), sx = w / vb.width, sy = h / vb.height, pd = 3;
        var x0 = Math.min(vb.x, bb.x - pd), y0 = Math.min(vb.y, bb.y - pd), x1 = Math.max(vb.x + vb.width, bb.x + bb.width + pd), y1 = Math.max(vb.y + vb.height, bb.y + bb.height + pd);
        if (x0 < vb.x || y0 < vb.y || x1 > vb.x + vb.width || y1 > vb.y + vb.height) {
          cl.setAttribute('viewBox', [x0, y0, x1 - x0, y1 - y0].join(' '));
          w = Math.max(1, Math.round((x1 - x0) * sx)); h = Math.max(1, Math.round((y1 - y0) * sy));
        }
      }
    } catch (e) { /* sem getBBox: mantém o tamanho da página */ }
    cl.setAttribute('width', w); cl.setAttribute('height', h); cl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    var img = new Image(), src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(cl));
    await new Promise(function (ok, fail) { img.onload = ok; img.onerror = function () { fail(new Error('falha ao converter gráfico')); }; img.src = src; });
    var cv = document.createElement('canvas'); cv.width = Math.round(w * escala); cv.height = Math.round(h * escala);
    var ctx = cv.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(img, 0, 0, cv.width, cv.height);
    return { data: cv.toDataURL('image/png'), w: w, h: h };
  }
  function runsMd(t, base) { return String(t).split(/(\*\*.+?\*\*)/).filter(Boolean).map(function (p) { var bold = /^\*\*.+\*\*$/.test(p); return { text: bold ? p.slice(2, -2) : p, options: Object.assign({}, base, bold ? { bold: true } : {}) }; }); }
  async function gerarPptx(so) {
    var Pptx = await carregarPptx();
    var pptx = new Pptx(); pptx.layout = 'LAYOUT_WIDE'; pptx.title = 'Internalização da imagem · Hospital Dom Alvarenga'; pptx.company = 'S&amp;S Partners'; /* o PptxGenJS 3.12 não escapa este campo */ pptx.subject = origemTxt();
    var off = document.createElement('div'); off.className = 'apres-off'; document.body.appendChild(off);
    var cs = getComputedStyle(off), cor = function (nm) { return corHex(cs.getPropertyValue(nm)); };
    var C = { fg: cor('--fg'), fg2: cor('--fg-2'), fg3: cor('--fg-3'), acc: cor('--accent'), line: cor('--line'), s2: cor('--surface-2'), good: cor('--good'), bad: cor('--bad'), warn: cor('--warn'), soft: cor('--accent-soft') };
    var vt = origemTxt();
    pptx.defineSlideMaster({ title: 'HDA', background: { color: 'FFFFFF' }, objects: [
      { line: { x: 56 * PX, y: 686 * PX, w: 1168 * PX, h: 0, line: { color: C.line, width: 0.75 } } },
      { text: { text: 'Internalização da imagem · HDA · S&S Partners · gerado da página (' + vt + ') · não edite este arquivo: altere na página e gere de novo', options: { x: 56 * PX, y: 690 * PX, w: 1060 * PX, h: 22 * PX, fontSize: 8, color: C.fg3, fontFace: FONTE } } }
    ], slideNumber: { x: 1160 * PX, y: 690 * PX, w: 64 * PX, h: 22 * PX, fontSize: 8, color: C.fg3, fontFace: FONTE, align: 'right' } });
    var lista = deckSlides();
    if (so) lista = lista.filter(function (x, k) { return so.indexOf(k) >= 0; }); /* só para testes */
    try {
      for (var i = 0; i < lista.length; i++) {
        busy('Gerando o PowerPoint… slide ' + (i + 1) + ' de ' + lista.length);
        var s = lista[i], mt = montarSlide(off, s, i, lista.length), sl = pptx.addSlide({ masterName: 'HDA' });
        if (s.capa) {
          sl.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: C.acc }, line: { color: C.acc } });
          sl.addText(s.k.toUpperCase(), { x: 56 * PX, y: 120 * PX, w: 1000 * PX, h: 28 * PX, fontSize: 11, color: C.acc, bold: true, fontFace: FONTE, charSpacing: 1 });
          sl.addText(s.t, { x: 56 * PX, y: 160 * PX, w: 1000 * PX, h: 150 * PX, fontSize: 36, bold: true, color: C.fg, fontFace: FONTE, valign: 'top' });
          sl.addText(s.sub, { x: 56 * PX, y: 330 * PX, w: 1000 * PX, h: 110 * PX, fontSize: 18, color: C.fg2, fontFace: FONTE, valign: 'top' });
        } else {
          sl.addText((s.k || '').toUpperCase(), { x: 56 * PX, y: 36 * PX, w: 1168 * PX, h: 24 * PX, fontSize: 10, color: C.acc, bold: true, fontFace: FONTE, charSpacing: 1 });
          sl.addText(s.t, { x: 56 * PX, y: 60 * PX, w: 1168 * PX, h: 78 * PX, fontSize: 22, bold: true, color: C.fg, fontFace: FONTE, valign: 'top', fit: 'shrink' });
        }
        for (var j = 0; j < s.b.length; j++) {
          var b = s.b[j], no = mt.nos[j], x = b.x * PX, y = b.y * PX, w = b.w * PX;
          if (b.tipo === 'img') { sl.addImage({ data: b.src, x: x, y: y, w: w, h: b.h * PX, sizing: { type: 'contain', w: w, h: b.h * PX } }); }
          else if (b.tipo === 'g') {
            var yy = y;
            if (b.tit) { sl.addText(b.tit, { x: x, y: y, w: w, h: 22 * PX, fontSize: 11, bold: true, color: C.fg, fontFace: FONTE }); yy = y + 26 * PX; }
            var svg = no.querySelector('svg'); if (!svg) continue;
            var leg = Array.prototype.slice.call(no.querySelectorAll('.legend span')), legH = leg.length ? 24 * PX : 0;
            var png = await svgPng(svg, 2), iw = w, ih = png.h / png.w * w, maxH = (640 * PX) - yy - legH;
            if (ih > maxH) { ih = maxH; iw = png.w / png.h * ih; }
            sl.addImage({ data: png.data, x: x + (w - iw) / 2, y: yy, w: iw, h: ih });
            if (leg.length) {
              var lr = []; leg.forEach(function (sp, q) { var ic = sp.querySelector('i'); lr.push({ text: '■ ', options: { color: corDe(ic ? ic.style.background : '', cs), fontSize: 10 } }); lr.push({ text: sp.textContent + (q < leg.length - 1 ? '     ' : ''), options: { color: C.fg2, fontSize: 9 } }); });
              sl.addText(lr, { x: x, y: yy + ih + 4 * PX, w: w, h: 20 * PX, fontFace: FONTE, valign: 'top', margin: 0 });
            }
          } else if (b.tipo === 'txt') {
            var runs = [], fsz = Math.round(b.tam * 0.75);
            if (b.titulo) runs.push({ text: b.titulo, options: { bold: true, fontSize: 14, color: b.cor && C[b.cor] ? C[b.cor] : (b.cor === 'acc' ? C.acc : C.fg), breakLine: true, paraSpaceAfter: 6 } });
            (b.bullets || []).forEach(function (t) { var rs = runsMd(t, { fontSize: fsz, color: C.fg }); rs[0].options.bullet = { indent: 14 }; rs[0].options.paraSpaceAfter = 6; rs[rs.length - 1].options.breakLine = true; runs = runs.concat(rs); });
            (b.paras || []).forEach(function (t) { var rs = runsMd(t, { fontSize: fsz, color: b.cor === 'muted' ? C.fg2 : C.fg }); rs[rs.length - 1].options.breakLine = true; rs[0].options.paraSpaceAfter = 6; runs = runs.concat(rs); });
            var hh = Math.max(40, no.getBoundingClientRect().height) * PX + 0.1;
            sl.addText(runs, { x: x, y: y, w: w, h: Math.min(hh, (680 - b.y) * PX), fontFace: FONTE, valign: 'top', margin: 2, fit: 'shrink' });
          } else if (b.tipo === 'kpis') {
            var gap = 12, cols = b.cols, nl = Math.ceil(b.itens.length / cols), cw = (b.w - gap * (cols - 1)) / cols, chh = (b.h - gap * (nl - 1)) / nl;
            b.itens.forEach(function (k, q) {
              var cx = (b.x + (q % cols) * (cw + gap)) * PX, cy = (b.y + Math.floor(q / cols) * (chh + gap)) * PX, cwi = cw * PX, chi = chh * PX;
              sl.addShape(pptx.ShapeType.rect, { x: cx, y: cy, w: cwi, h: chi, fill: { color: 'F6F8F7' }, line: { color: 'E6EBE9', width: 0.75 } });
              sl.addShape(pptx.ShapeType.rect, { x: cx, y: cy + 0.1, w: 0.04, h: chi - 0.2, fill: { color: C[k.cls] || C.acc }, line: { color: C[k.cls] || C.acc } });
              sl.addText([{ text: k.lab, options: { fontSize: 9, color: C.fg2, breakLine: true } }, { text: k.v, options: { fontSize: 16, bold: true, color: C.fg, breakLine: true } }, { text: k.sub || '', options: { fontSize: 8, color: C.fg2 } }], { x: cx + 0.1, y: cy + 0.04, w: cwi - 0.16, h: chi - 0.08, fontFace: FONTE, valign: 'top', margin: 2, fit: 'shrink' });
            });
          } else if (b.tipo === 'tab') {
            var fs = Math.max(7, Math.round(b.tam * 0.72 * 10) / 10), ncol = b.larg.length, r0 = b.linhas[0] || [];
            var alin = function (q, c0) { var a = b.al ? b.al[q] : (c0 && c0.n ? 'n' : (c0 && c0.c ? 'c' : '')); return a === 'n' ? 'right' : (a === 'c' ? 'center' : 'left'); };
            var mv = b.denso ? 2 : 3, mg = function (al) { return al === 'right' ? [mv, 6, mv, 2] : [mv, 3, mv, 5]; };
            var rows = [b.cab.map(function (c0, q) { var al0 = alin(q, r0[q]); return { text: c0, options: { bold: true, color: C.fg2, fill: { color: 'E9EEEC' }, align: al0, fontSize: fs, margin: mg(al0) } }; })];
            b.linhas.forEach(function (ln, q) {
              var rc = (b.rc && b.rc[q]) || '';
              if (rc === 'sec') { rows.push([{ text: ln[0].t, options: { colspan: ncol, bold: true, color: C.fg2, fill: { color: 'EEF2F1' }, align: 'left', valign: 'middle', fontSize: fs, margin: mg('left') } }]); return; }
              rows.push(ln.map(function (c0, k) {
                var o = { fontSize: fs, color: C.fg, bold: !!c0.b || rc === 'total', align: alin(k, c0), valign: 'middle' };
                o.margin = mg(o.align);
                if (rc === 'sub') o.color = C.fg2;
                if (rc === 'total') o.fill = { color: 'F3F6F5' };
                if (b.hl && b.hl[q]) o.fill = { color: C.soft };
                if (c0.cor && C[c0.cor]) o.color = C[c0.cor];
                return { text: c0.t == null ? '' : String(c0.t), options: o };
              }));
            });
            sl.addTable(rows, { x: x, y: y, w: w, colW: b.larg.map(function (f) { return f * w; }), fontFace: FONTE, border: { type: 'solid', pt: 0.5, color: 'E6EBE9' }, margin: [mv, 3, mv, 5], autoPage: false });
          } else if (b.tipo === 'nota') {
            sl.addText(semMd(b.texto), { x: x, y: y, w: w, h: 34 * PX, fontSize: 8.5, color: C.fg3, fontFace: FONTE, valign: 'top', margin: 1 });
          }
        }
      }
    } finally { off.remove(); }
    /* O PptxGenJS 3.12 repete <a:pPr> antes de cada trecho de um parágrafo com negrito: XML fora do esquema (o PowerPoint pode
       pedir reparo e o marcador some). Mantém só o <a:pPr> do início de cada parágrafo. */
    var JZ = window.JSZip, MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    if (!JZ) return pptx.write({ outputType: 'blob' });
    var zip = await JZ.loadAsync(await pptx.write({ outputType: 'arraybuffer' }));
    var arqs = Object.keys(zip.files).filter(function (n) { return /^ppt\/(slides|slideMasters|slideLayouts)\/[^/]+\.xml$/.test(n); });
    for (var a = 0; a < arqs.length; a++) {
      var xml = await zip.file(arqs[a]).async('string');
      xml = xml.replace(/<a:p>([\s\S]*?)<\/a:p>/g, function (m0, inner) { var corrido = false; return '<a:p>' + inner.replace(/<a:pPr\b[^>]*\/>|<a:pPr\b[^>]*>[\s\S]*?<\/a:pPr>|<a:r>|<a:br\b|<a:fld\b/g, function (tk) { if (tk.indexOf('<a:pPr') !== 0) { corrido = true; return tk; } return corrido ? '' : tk; }) + '</a:p>'; });
      zip.file(arqs[a], xml);
    }
    return zip.generateAsync({ type: 'blob', mimeType: MIME, compression: 'DEFLATE' });
  }
  async function baixarPptx() {
    if (ocupado) return; ocupado = true; busy('Carregando o gerador de PowerPoint…');
    try { var blob = await gerarPptx(); busy(null); salvarArquivo('HDA_apresentacao_CEO_' + new Date().toISOString().slice(0, 10) + '.pptx', blob, 'Apresentação salva (' + origemTxt() + ').'); registrarUso('export', { doc: 'pptx' }); }
    catch (err) { busy(null); toast('Não consegui gerar o PowerPoint: ' + ((err && (err.message || err.code)) || 'erro')); }
    finally { ocupado = false; }
  }
  window.HDA_DECK = { slides: function () { return deckSlides(); }, abrir: abrirApresentacao, pptx: gerarPptx };

  /* ================= boot ================= */
  $('#logoTopo').src = LOGO.navy;
  if (NO_DOMINIO) { var ft = $('#foot'); ft.innerHTML = '<a href="/.netlify/functions/sair" style="margin-right:10px">Sair</a><a href="/admin/" style="margin-right:10px">Acessos</a>' + ft.innerHTML; }
  registrarUso('pagina');
  recompute(); renderAll();
  var t0 = lsGet('hda:tab'); showTab(t0 && $('#tab-' + t0) ? t0 : 'tese');
  initCaps();
})();
