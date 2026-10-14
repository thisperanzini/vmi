/* Interface: estado, persistência (db), abas, leitura de documentos por IA, gráficos. */
(function () {
  "use strict";
  var M = Motor;
  var S = { base: clone(BASE_PADRAO), baseSalva: false, catalogo: clone(BASE_PADRAO.catalogo), catSalvo: false, casos: {}, ordem: [], atual: null, tab: "casos",
    db: null, modo: "carregando", pend: {}, sample: null, downloads: null, ia: {}, av: null, simAtual: null, roiAtual: null, entAtual: null, aberto: {} };

  /* ---------- utilidades ---------- */
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function uid() { return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function num(v) { return M.num(v); }
  function R(v) { return M.fmtR(v); }
  function P(v, d) { return M.fmtP(v, d); }
  function N(v, d) { if (v == null || !isFinite(v)) return "—"; return v.toLocaleString("pt-BR", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function X(v) { return v == null || !isFinite(v) ? "—" : v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "x"; }
  function Rm(v) { if (v == null || !isFinite(v)) return "—"; var a = Math.abs(v); return (v < 0 ? "−" : "") + "R$ " + (a >= 1e6 ? (a / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + " mi" : a >= 1e3 ? (a / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + " mil" : N(a)); }
  function hoje() { var d = new Date(); return d.toISOString().slice(0, 10); }
  function dias(a, b) { if (!a || !b) return null; return Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5); }
  function dataBR(s) { if (!s) return "—"; var p = String(s).slice(0, 10).split("-"); return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : s; }
  function get(o, path) { return path.split(".").reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
  function set(o, path, v) { var ks = path.split("."), a = o; for (var i = 0; i < ks.length - 1; i++) { if (a[ks[i]] == null || typeof a[ks[i]] !== "object") a[ks[i]] = {}; a = a[ks[i]]; } a[ks[ks.length - 1]] = v; }
  function fonte(id) { return S.base.fontes[id]; }
  function linkF(f) { if (!f) return ""; if (typeof f === "string") f = fonte(f); if (!f) return ""; return '<a href="' + esc(f.u) + '" target="_blank" rel="noopener">' + esc(f.t) + "</a> <span class=\"tiny\">(" + esc(f.d) + " · " + esc(f.c) + ")</span>"; }
  function lsJson(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function toast(t) { var e = $("#toast"); e.textContent = t; e.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(function () { e.hidden = true; }, 3200); }
  var PORTES = { micro: "Microempresa", pequena: "Pequena", media: "Média", grande: "Grande" };
  var STATUS_CASO = ["Prospecção", "Kit em montagem", "Protocolado no agente", "Em análise", "Aprovado", "Desembolsado", "Perdido"];
  var STATUS_KIT = { pendente: "Pendente", solicitado: "Solicitado", recebido: "Recebido", conferido: "Conferido", vencido: "Vencido", na: "Não se aplica" };
  var UFS = "AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO".split(" ");
  function modNome(id) { var m = S.base.modalidades.filter(function (x) { return x.id === id; })[0]; return m ? m.nome : "—"; }
  function catItem(id) { return S.catalogo.filter(function (x) { return x.id === id; })[0]; }

  /* ---------- caso de exemplo (usado só fora do banco ou a pedido) ---------- */
  function casoExemplo() {
    return {
      id: "ceman-cignus600", nome: "CEMAN · Cignus 600", exemplo: true, status: "Kit em montagem", criado: hoje(), atualizado: new Date().toISOString(),
      cliente: { razao: "ANDRADE E MALATESTA SERVIÇOS MÉDICOS ESPECIALIZADOS LTDA", fantasia: "CEMAN", cnpj: "16.721.715/0001-73", natureza: "privada", regime: "presumido", porte_decl: "media", rob: null,
        uf: "SP", municipio: "Mogi das Cruzes", endereco: "Avenida Braz de Pina, 90, Vila Vitória", cep: "08730-020", email: "ceman@centromedicoandrade.com.br",
        rep: { nome: "Dr. Thiago Andrade", cargo: "Sócio-administrador" }, contato: {} },
      operacao: { catalogo_id: "cignus600", equipamento: { descricao: "Sistema de Ressonância Magnética CIGNUS 600 1.5T (24 canais)", modelo: "Cignus 600 1,5T (24 canais)", fabricante: "VMI Tecnologias Ltda", cfi: "04252454", ncm: "9018.13.00", origem: "nacional", modalidade: "rm_15t" },
        fornecedor: "VMI Tecnologias Ltda", valor_equip: 4329000, valor_obra: 0, valor_financiar: 4329000, prazo: 72, carencia: 6, sistema: "SAC", carModo: "pagos", inicio: "2026-11", finalidade: "Implantação de serviço de ressonância magnética 1,5T na clínica." },
      financeiro: { exercicios: [] }, kit: {}, flags: {}, honorario_pct: 2, sim: {},
      roi: { ativo: false, modalidade: "rm_15t", mix_sus: 100, mix_conv: 0, mix_part: 0, ate: false, ocupacao: 80, ramp_ini: 30, ramp_meses: 12, inicio_op: 3, horizonte: 10, equipe: 30000, energia: 8000, regime: "presumido", iss: 5, equiparacao: true },
      notas: "Caso de teste a partir do contrato FINAME CEMAN. Faturamento e balanços ainda não recebidos: porte declarado como média empresa até o DRE chegar."
    };
  }
  function casoNovo() {
    var c = { id: uid(), nome: "Novo caso", status: "Prospecção", criado: hoje(), atualizado: new Date().toISOString(),
      cliente: { natureza: "privada", regime: "presumido", rep: {}, contato: {} }, operacao: { equipamento: {}, prazo: 60, carencia: 6, sistema: "SAC", carModo: "pagos", inicio: proxMes() },
      financeiro: { exercicios: [] }, kit: {}, flags: {}, honorario_pct: 2, sim: {}, roi: { ativo: false, mix_sus: 0, mix_conv: 80, mix_part: 20, ocupacao: 80, ramp_ini: 30, ramp_meses: 12, inicio_op: 3, horizonte: 10, regime: "presumido", iss: 5, equiparacao: true }, notas: "" };
    return c;
  }
  function proxMes() { var d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 7); }

  /* ---------- persistência ---------- */
  function caso() { return S.atual ? S.casos[S.atual] : null; }
  function setSync(st, t) { $("#syncDot").className = "dot " + st; $("#syncTxt").textContent = t; }
  function salvar(c) {
    c.atualizado = new Date().toISOString();
    if (!S.db) { setSync("local", lsSet("vmi_casos", S.casos) ? "Salvo neste navegador " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "Sem armazenamento neste navegador: alterações só nesta aba"); return; }
    S.pend[c.id] = true; setSync("dirty", "Salvando…");
    clearTimeout(salvar["_" + c.id]);
    salvar["_" + c.id] = setTimeout(function () {
      var body = clone(c);
      S.db.collection("casos").doc(c.id).set(body).then(function () { delete S.pend[c.id]; if (!Object.keys(S.pend).length) setSync("ok", "Salvo " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })); })
        .catch(function (e) { setSync("dirty", "Falha ao salvar (" + (e && e.code || "erro") + "). Tente de novo editando um campo."); });
    }, 700);
  }
  function salvarConfig(doc, data) {
    if (!S.db) { toast(lsSet("vmi_" + doc, data) ? "Salvo neste navegador." : "Sem armazenamento neste navegador: a alteração vale só nesta aba."); return Promise.resolve(); }
    return S.db.doc("config/" + doc).set(data).then(function () { toast("Salvo para todos que usam a ferramenta."); }).catch(function (e) { toast("Não foi possível salvar (" + (e && e.code) + ")."); });
  }
  function conectar() {
    var w = window.claude;
    if (!w || !w.use) { modoLocal(); return; }
    w.use("db").then(function (db) {
      if (!db) { modoLocal(); return; }
      S.db = db; S.modo = "db"; setSync("ok", "Conectado");
      db.collection("casos").onSnapshot(function (snap) {
        snap.docs.forEach(function (d) { if (!S.pend[d.id]) S.casos[d.id] = clone(d.data()); });
        var ids = snap.docs.map(function (d) { return d.id; });
        Object.keys(S.casos).forEach(function (k) { if (ids.indexOf(k) < 0 && !S.pend[k]) delete S.casos[k]; });
        if (!S.atual || !S.casos[S.atual]) S.atual = ultimoCaso();
        renderTudo();
      }, function (e) { setSync("dirty", "Banco indisponível (" + (e && e.code) + ")"); });
      db.doc("config/base").onSnapshot(function (d) { if (d.exists) { var b = clone(d.data()); if (b && b.linhas) { S.base = b; S.baseSalva = true; } } else { S.base = clone(BASE_PADRAO); S.baseSalva = false; } renderTudo(); });
      db.doc("config/catalogo").onSnapshot(function (d) { if (d.exists && d.data().itens) { S.catalogo = clone(d.data().itens); S.catSalvo = true; } renderTudo(); });
    }).catch(modoLocal);
    w.use("sample").then(function (s) { S.sample = s; renderTudo(); }).catch(function () {});
    w.use("downloads").then(function (d) { S.downloads = d; renderTudo(); }).catch(function () {});
  }
  function modoLocal() {
    S.modo = "local";
    var ls = lsJson("vmi_casos");
    if (ls && Object.keys(ls).length) S.casos = ls;
    else if (window.VMI_SEED && window.VMI_SEED.casos) window.VMI_SEED.casos.forEach(function (c) { S.casos[c.id] = clone(c); });
    else { var ex = casoExemplo(); S.casos[ex.id] = ex; }
    /* base e catálogo guardados localmente só valem se forem da mesma versão do código; versão nova no código prevalece */
    var b = lsJson("vmi_base"); if (b && b.linhas && String(b.versao || "") >= String(BASE_PADRAO.versao)) { S.base = b; S.baseSalva = true; } else if (b) try { localStorage.removeItem("vmi_base"); } catch (e) {}
    var ct = lsJson("vmi_catalogo"); if (ct && ct.itens && String(ct.versao || "") >= String(BASE_PADRAO.catalogo_versao)) { S.catalogo = clone(ct.itens); S.catSalvo = true; } else if (window.VMI_SEED && window.VMI_SEED.catalogo) S.catalogo = clone(window.VMI_SEED.catalogo);
    S.atual = ultimoCaso();
    setSync("local", "Fora do claude.ai: casos guardados neste navegador"); renderTudo();
  }
  function ultimoCaso() {
    var l = Object.keys(S.casos).map(function (k) { return S.casos[k]; }).sort(function (a, b) { return String(b.atualizado).localeCompare(String(a.atualizado)); });
    return l.length ? l[0].id : null;
  }

  /* ---------- cálculo ---------- */
  function calcular() {
    var c = caso(); S.av = null; S.simAtual = null; S.roiAtual = null;
    if (!c) return;
    S.av = M.avaliar(c, S.base);
    var sm = c.sim || {}, lid = sm.linha, ln = S.base.linhas.filter(function (l) { return l.id === lid; })[0];
    var item = ln ? S.av.todas.filter(function (x) { return x.linha.id === lid; })[0] : S.av.ranking[0];
    if (!item || !item.linha.custos || !item.linha.custos.length) item = S.av.ranking[0];
    if (item) {
      var L = item.linha, cu = sm.custo && L.custos.indexOf(sm.custo) >= 0 ? sm.custo : (item.sim ? item.sim.custo : L.custos[0]);
      var ctx = M.contexto(c, S.base); ctx.override = sm.override || {};
      S.simAtual = M.simular(L, cu, sm.cen || "base", ctx, { sistema: (c.operacao || {}).sistema, carModo: (c.operacao || {}).carModo });
      S.simAtual.item = item;
    }
    if (c.roi && (c.roi.modalidade || c.roi.modo === "internalizacao")) S.roiAtual = M.roi(c, S.simAtual, S.base);
    S.entAtual = M.entidade(c, S.simAtual, S.roiAtual, S.base);
  }

  /* ---------- casca ---------- */
  var TABS = [["casos", "Casos"], ["cliente", "Cliente"], ["kit", "Kit FINAME"], ["linhas", "Linhas"], ["sim", "Simulação"], ["roi", "ROI e payback"], ["saidas", "Documentos"], ["base", "Base de linhas", "sep"], ["catalogo", "Catálogo VMI"], ["metodo", "Método"]];
  function renderTabs() {
    var c = caso(), kp = c ? kitProg(c) : null;
    $("#tabs").innerHTML = TABS.map(function (t) {
      var st = "";
      if (t[0] === "kit" && kp) st = '<span class="st">' + kp.okOb + "/" + kp.totOb + "</span>";
      if (t[0] === "linhas" && S.av) st = '<span class="st">' + S.av.ranking.length + "</span>";
      return '<button class="tab ' + (t[2] || "") + '" role="tab" data-tab="' + t[0] + '" aria-selected="' + (S.tab === t[0]) + '">' + t[1] + st + "</button>";
    }).join("");
    var sel = $("#selCaso"), ids = Object.keys(S.casos).sort(function (a, b) { return String(S.casos[b].atualizado).localeCompare(String(S.casos[a].atualizado)); });
    sel.innerHTML = ids.length ? ids.map(function (k) { return '<option value="' + esc(k) + '"' + (k === S.atual ? " selected" : "") + ">" + esc(S.casos[k].nome || k) + "</option>"; }).join("") : "<option>Nenhum caso</option>";
  }
  function renderTudo() {
    calcular(); renderTabs();
    var foco = document.activeElement && document.activeElement.id;
    var m = $("#main"), fn = PAINEIS[S.tab] || PAINEIS.casos;
    var needCase = ["cliente", "kit", "linhas", "sim", "roi", "saidas"].indexOf(S.tab) >= 0;
    m.innerHTML = '<section role="tabpanel">' + (needCase && !caso() ? semCaso() : fn()) + "</section>";
    $("#foot").innerHTML = "Base de linhas " + esc(S.base.versao) + (S.baseSalva ? " (editada e salva)" : " (padrão)") + " · Macro: Focus " + dataBR(S.base.macro.focus.data) + ", Selic " + P(S.base.macro.selic.v) + " · Estudo indicativo: aprovação, taxa e garantias finais são do agente financeiro e do BNDES.";
    if (foco) { var e = document.getElementById(foco); if (e && e.focus) try { e.focus({ preventScroll: true }); } catch (x) {} }
    pos[S.tab] && pos[S.tab]();
  }
  var pos = {};
  function semCaso() { return '<div class="card empty"><h2>Nenhum caso aberto</h2><p class="muted" style="margin:8px 0 14px">Crie um caso para cadastrar o cliente, montar o kit e comparar as linhas.</p><div class="row" style="justify-content:center"><button class="primary" data-act="novo">Novo caso</button><button data-act="exemplo">Criar o caso de exemplo (CEMAN)</button></div></div>'; }

  /* ---------- painel: casos ---------- */
  function kitProg(c) {
    var ob = 0, okOb = 0, tot = 0, ok = 0;
    S.base.kit.forEach(function (k) {
      var st = (c.kit[k.id] || {}).status || (k.auto ? autoStatus(c, k) : "pendente"); if (st === "na") return;
      tot++; var bom = st === "recebido" || st === "conferido"; if (bom) ok++;
      if (/^Obrigat/.test(k.ob)) { ob++; if (bom) okOb++; }
    });
    return { totOb: ob, okOb: okOb, tot: tot, ok: ok };
  }
  function autoStatus(c, k) { return k.auto === "operacao" && num((c.operacao || {}).valor_equip) ? "conferido" : "pendente"; }
  var PAINEIS = {
    casos: function () {
      var ids = Object.keys(S.casos), pv = S.base.pedidos_vmi;
      var lista = ids.map(function (k) { return S.casos[k]; }).sort(function (a, b) { return String(b.atualizado).localeCompare(String(a.atualizado)); });
      var ativos = lista.filter(function (c) { return c.status !== "Perdido" && c.status !== "Desembolsado"; });
      var vol = ativos.reduce(function (s, c) { return s + (num((c.operacao || {}).valor_financiar) || num((c.operacao || {}).valor_equip) || 0); }, 0);
      var hon = ativos.reduce(function (s, c) { return s + (num((c.operacao || {}).valor_financiar) || num((c.operacao || {}).valor_equip) || 0) * (num(c.honorario_pct) == null ? 2 : num(c.honorario_pct)) / 100; }, 0);
      var linhas = lista.map(function (c) {
        var av = M.avaliar(c, S.base), top = av.ranking[0], kp = kitProg(c);
        return "<tr><td><b>" + esc(c.nome) + "</b>" + (c.exemplo ? ' <span class="pill info">exemplo</span>' : "") + '<div class="tiny">' + esc((c.cliente || {}).razao || "") + "</div></td><td>" + esc((c.cliente || {}).uf || "—") + "</td><td>" + esc(((c.operacao || {}).equipamento || {}).modelo || "—") + '</td><td class="n num">' + Rm(num((c.operacao || {}).valor_financiar) || num((c.operacao || {}).valor_equip)) + "</td><td>" + (top ? esc(top.linha.nome.replace("BNDES ", "")) + '<div class="tiny num">' + P(top.sim.custoTotal) + " a.a. com honorário</div>" : '<span class="pill warn">sem linha elegível</span>') + '</td><td class="nw"><span class="num">' + kp.okOb + "/" + kp.totOb + '</span> <span class="tiny">obrig.</span></td><td>' + esc(c.status) + '</td><td class="nw"><button class="sm" data-act="abrir" data-id="' + esc(c.id) + '">Abrir</button> <button class="sm ghost" data-act="duplicar" data-id="' + esc(c.id) + '">Duplicar</button> <button class="sm ghost danger" data-act="excluir" data-id="' + esc(c.id) + '">Excluir</button></td></tr>';
      }).join("");
      return '<div class="kpis">' +
        kpi("Casos ativos", N(ativos.length), ids.length + " no total") +
        kpi("Valor em financiamento", Rm(vol), "casos ativos") +
        kpi("Honorário potencial", Rm(hon), "taxa de êxito sobre o desembolso", true) +
        kpi("Pedidos privados VMI", Rm(pv.privado), pv.periodo + " · 2% = " + Rm(pv.privado * 0.02)) + "</div>" +
        '<div class="card"><div class="card-h"><h2>Casos</h2><div class="row"><button class="primary" data-act="novo">Novo caso</button>' + (S.casos["ceman-cignus600"] ? "" : '<button data-act="exemplo">Criar caso de exemplo (CEMAN)</button>') + "</div></div>" +
        (lista.length ? '<div class="tw"><table><thead><tr><th>Caso</th><th>UF</th><th>Equipamento</th><th class="n">Valor</th><th>Melhor linha hoje</th><th>Kit</th><th>Status</th><th></th></tr></thead><tbody>' + linhas + "</tbody></table></div>"
          : '<div class="empty"><p>Nenhum caso ainda. Comece por <b>Novo caso</b> ou pelo caso de exemplo.</p></div>') +
        '</div><div class="notice">Os pedidos privados da VMI de ' + pv.periodo + " somam " + Rm(pv.privado) + " (" + N(pv.privado / pv.total * 100, 0) + "% do total de " + Rm(pv.total) + "). " + esc(pv.nota) + " Fonte: análise de pedidos VMI enviada em 09/10/2026.</div>";
    },

    /* ---------- painel: cliente ---------- */
    cliente: function () {
      var c = caso(), cl = c.cliente, op = c.operacao, eq = op.equipamento || {}, ctx = M.contexto(c, S.base);
      var porteTxt = ctx.rob != null ? PORTES[ctx.porte] + " pela receita bruta" : (cl.porte_decl ? PORTES[cl.porte_decl] + " (declarado)" : "não informado");
      var catOpts = '<option value="">— escolher do catálogo —</option>' + S.catalogo.map(function (i) { return '<option value="' + esc(i.id) + '"' + (op.catalogo_id === i.id ? " selected" : "") + ">" + esc(i.modelo) + (i.cfi ? " · CFI " + esc(i.cfi) : " · sem CFI") + "</option>"; }).join("") + '<option value="__manual"' + (op.catalogo_id === "__manual" ? " selected" : "") + ">Outro equipamento (manual)</option>";
      var ind = indicadoresBloco(c);
      return '<div class="card"><div class="card-h"><h2>Caso</h2><span class="tiny">Atualizado ' + esc(new Date(c.atualizado).toLocaleString("pt-BR")) + "</span></div><div class=\"form\">" +
        fi("nome", "Nome do caso", c.nome) + fs("status", "Status", c.status, STATUS_CASO.map(function (s) { return [s, s]; })) + fi("honorario_pct", "Honorário de êxito (%)", c.honorario_pct, "num", "Contrato S&S: 2% sobre o valor desembolsado") +
        "</div></div>" +
        '<div class="card"><div class="card-h"><h2>Empresa</h2><span class="tiny">Campos do cadastro FINAME; o cartão CNPJ lido no kit preenche estes campos.</span></div><div class="form">' +
        fi("cliente.razao", "Razão social", cl.razao, "", "", "w2") + fi("cliente.fantasia", "Nome fantasia", cl.fantasia) + fi("cliente.cnpj", "CNPJ", cl.cnpj) + fi("cliente.abertura", "Data de abertura", cl.abertura, "date") +
        fi("cliente.cnae", "CNAE principal", cl.cnae, "", "Ex.: 8640-2/06 ressonância; 8640-2/04 tomografia; 8640-2/05 RX; 8640-2/11 radioterapia") +
        fs("cliente.natureza", "Natureza", cl.natureza, [["privada", "Privada com fins lucrativos"], ["filantropica", "Filantrópica / sem fins lucrativos"]]) +
        fs("cliente.regime", "Regime tributário", cl.regime, [["simples", "Simples Nacional"], ["presumido", "Lucro Presumido"], ["real", "Lucro Real"]]) +
        fi("cliente.rob", "Receita bruta anual (R$)", cl.rob, "num", "Do grupo econômico; define o porte BNDES") + fs("cliente.porte_decl", "Porte declarado (se sem receita)", cl.porte_decl, [["", "—"], ["micro", "Micro"], ["pequena", "Pequena"], ["media", "Média"], ["grande", "Grande"]]) +
        fs("cliente.uf", "UF", cl.uf, [["", "—"]].concat(UFS.map(function (u) { return [u, u]; }))) + fi("cliente.municipio", "Município", cl.municipio) + fi("cliente.endereco", "Endereço da sede", cl.endereco, "", "", "w2") + fi("cliente.cep", "CEP", cl.cep) +
        fi("cliente.email", "E-mail", cl.email) + fi("cliente.telefone", "Telefone", cl.telefone) + fi("cliente.funcionarios", "Funcionários", cl.funcionarios, "num") + fi("cliente.endividamento", "Endividamento bancário (R$)", cl.endividamento, "num") +
        fi("cliente.servico_divida_mes", "Parcelas de dívidas atuais (R$/mês)", cl.servico_divida_mes, "num") + fi("cliente.banco_rel", "Banco de relacionamento", cl.banco_rel) + fs("cliente.ja_bndes", "Já operou BNDES/FINAME?", cl.ja_bndes, [["", "—"], ["sim", "Sim"], ["nao", "Não"]]) + fs("cliente.restricoes", "Restrições ou pendências fiscais?", cl.restricoes, [["", "—"], ["nao", "Não"], ["sim", "Sim"]]) +
        '</div><p class="tiny" style="margin-top:10px">Porte usado no motor: <b>' + esc(porteTxt) + "</b>. Critério BNDES: microempresa até R$ 360 mil; pequena até R$ 4,8 mi; média até R$ 300 mi; grande acima.</p></div>" +
        '<div class="grid g2"><div class="card"><div class="card-h"><h2>Contato</h2></div><div class="form">' + fi("cliente.contato.nome", "Nome", (cl.contato || {}).nome) + fi("cliente.contato.cargo", "Cargo", (cl.contato || {}).cargo) + fi("cliente.contato.tel", "Telefone / WhatsApp", (cl.contato || {}).tel) + fi("cliente.contato.email", "E-mail", (cl.contato || {}).email) + "</div></div>" +
        '<div class="card"><div class="card-h"><h2>Representante legal</h2></div><div class="form">' + fi("cliente.rep.nome", "Nome", (cl.rep || {}).nome) + fi("cliente.rep.cargo", "Cargo", (cl.rep || {}).cargo) + fi("cliente.rep.qualif", "Nacionalidade, estado civil, profissão", (cl.rep || {}).qualif, "", "", "w2") +
        '</div><p class="tiny" style="margin-top:10px">CPF e RG não ficam na base: são pedidos só na hora de gerar a minuta do contrato.</p></div></div>' +
        '<div class="card"><div class="card-h"><h2>Operação</h2><span class="tiny">Investimento = equipamento + obra; o motor limita o financiado à participação de cada linha.</span></div><div class="form">' +
        '<label class="f w2" for="f_catalogo">Equipamento<select id="f_catalogo" data-act="catalogo">' + catOpts + "</select></label>" +
        fi("operacao.equipamento.modelo", "Modelo", eq.modelo) + fi("operacao.equipamento.fabricante", "Fabricante", eq.fabricante) + fi("operacao.equipamento.cfi", "Código FINAME (CFI)", eq.cfi, "", "Vazio = sem credenciamento: FINAME fica bloqueado. Catálogo CFI verificado em " + esc(S.base.catalogo_versao || "—")) +
        fs("operacao.equipamento.origem", "Origem", eq.origem, [["nacional", "Nacional"], ["importado", "Importado"]]) + fi("operacao.equipamento.ncm", "NCM", eq.ncm) +
        fs("operacao.equipamento.modalidade", "Modalidade", eq.modalidade, [["", "—"]].concat(S.base.modalidades.map(function (m) { return [m.id, m.nome]; }))) +
        fi("operacao.valor_equip", "Valor do equipamento (R$)", op.valor_equip, "num") + fi("operacao.valor_obra", "Obra e instalação (R$)", op.valor_obra, "num", "Blindagem, gaiola de RF, bunker") + fi("operacao.valor_financiar", "Valor a financiar (R$)", op.valor_financiar, "num", "Vazio = investimento total") +
        fi("operacao.prazo", "Prazo total desejado (meses)", op.prazo, "num", "Inclui a carência") + fi("operacao.carencia", "Carência (meses)", op.carencia, "num", "FINAME: até 24") + fi("operacao.inicio", "Mês da liberação", op.inicio, "month") +
        fs("operacao.sistema", "Amortização", op.sistema, [["SAC", "SAC"], ["Price", "Price"]]) + fs("operacao.carModo", "Juros na carência", op.carModo, [["pagos", "Pagos mensalmente"], ["capitalizados", "Capitalizados no saldo"]]) +
        fi("operacao.fornecedor", "Fornecedor", op.fornecedor) + fi("operacao.banco_pretendido", "Banco pretendido", op.banco_pretendido) + fi("operacao.finalidade", "Finalidade do investimento", op.finalidade, "area", "", "w2") +
        '</div></div><div class="card"><div class="card-h"><h2>Condições que abrem linhas</h2><span class="tiny">Marque só o que estiver comprovado ou confirmado com o agente.</span></div><div class="grid g2">' +
        fc("flags.mais_inovacao", "Equipamento enquadrado no Programa Mais Inovação (FINAME a taxa fixa)", c.flags.mais_inovacao) + fc("flags.projeto_inovacao", "Projeto com componente de inovação (Finep Inovacred)", c.flags.projeto_inovacao) +
        fc("flags.sus_complementar", "Filantrópica complementar ao SUS, aderente ao Agora Tem Especialistas (FGTS-Saúde)", c.flags.sus_complementar) + fc("flags.fiis_selecionado", "Proposta já selecionada no FIIS Saúde", c.flags.fiis_selecionado) +
        fc("flags.sem_similar", "Importado sem similar nacional comprovado", c.flags.sem_similar) + fc("flags.sudene", "Município do norte de MG/ES na área da Sudene (FNE)", c.flags.sudene) + "</div></div>" +
        ind + dividasBloco(c) + '<div class="card"><div class="card-h"><h2>Notas</h2></div>' + fi("notas", "", c.notas, "area") + "</div>";
    },

    /* ---------- painel: kit ---------- */
    kit: function () {
      var c = caso(), kp = kitProg(c), cats = S.base.kit_cats;
      var semIA = !S.sample ? '<div class="notice warn">A leitura por IA não está disponível nesta visualização. Abra a ferramenta pelo claude.ai com sua conta para enviar documentos; o status de cada item continua editável.</div>' : "";
      var html = '<div class="card"><div class="card-h"><h2>Kit de documentos FINAME</h2><span class="tiny">Planilha-mestre S&S + 3 itens da Circ. BNDES 13/2022</span></div>' +
        '<div class="row between"><div class="stack" style="flex:1 1 300px"><div class="prog"><i style="width:' + (kp.totOb ? kp.okOb / kp.totOb * 100 : 0) + '%"></i></div><span class="small"><b class="num">' + kp.okOb + " de " + kp.totOb + "</b> obrigatórios recebidos · " + kp.ok + " de " + kp.tot + " itens no total</span></div>" +
        '<div class="row"><button class="sm" data-act="kit-todos-solicitado">Marcar pendentes como solicitados</button></div></div></div>' + semIA +
        '<div class="notice">Envie o arquivo em cada item. A IA lê o documento e devolve os campos com a página de origem; a ferramenta confere validade, situação e CNPJ com regras fixas e mostra o que pode ir para o cadastro. Os arquivos não são guardados, só os campos lidos. RG, CPF e comprovantes pessoais não são lidos.</div>';
      Object.keys(cats).forEach(function (k) {
        var itens = S.base.kit.filter(function (i) { return i.cat === k; });
        html += '<div class="card"><div class="card-h"><h3>' + k + " — " + esc(cats[k]) + "</h3></div>" + itens.map(function (it) { return kitItem(c, it); }).join("") + "</div>";
      });
      return html;
    },

    /* ---------- painel: linhas ---------- */
    linhas: function () {
      var c = caso(), av = S.av, ctx = av.ctx, eq = ctx.eq;
      var resumo = '<div class="card"><div class="card-h"><h2>Linhas para ' + esc(c.cliente.fantasia || c.nome) + '</h2><span class="tiny">Ranking pelo custo total da captação (CET do agente + honorário de ' + N(ctx.honor, 1) + "%), cenário base</span></div>" +
        '<div class="kpis">' + kpi("Valor a financiar", Rm(ctx.fin), "investimento " + Rm(ctx.invest)) + kpi("Porte", ctx.porte ? PORTES[ctx.porte] : "—", ctx.rob != null ? "receita " + Rm(ctx.rob) : "declarado") + kpi("UF", ctx.uf || "—", ctx.nne ? "Norte/Nordeste: Taxa do BNDES 0,75%" : "") + kpi("Equipamento", eq.cfi ? "CFI " + eq.cfi : "sem CFI", eq.modelo || "") + kpi("Prazo / carência", ctx.prazo + " / " + ctx.carencia + " meses", (c.operacao.sistema || "SAC") + ", juros na carência " + (c.operacao.carModo || "pagos")) + "</div></div>";
      if (!av.ranking.length) resumo += '<div class="notice bad">Nenhuma linha com regra pública ficou elegível. Veja os bloqueios abaixo: o mais comum é equipamento sem código FINAME ou porte/UF não informados.</div>';
      var chart = '<div class="card"><div class="card-h"><h3>Custo total por linha elegível</h3><span class="tiny">barra = faixa mín.–máx. dos spreads; traço = cenário base; linha tracejada = média BCB de aquisição de bens PJ</span></div><div class="chart" id="chLinhas"></div></div>';
      var cards = av.ranking.map(function (x) { return cardLinha(x, ctx); }).join("");
      var merc = av.mercado.length ? '<div class="card"><div class="card-h"><h3>Comparação de mercado</h3><span class="tiny">Médias do Banco Central, sem honorário: referência, não oferta firme</span></div><p class="small muted" style="margin-bottom:8px">São médias nacionais de todas as operações do mês, com prazos em geral mais curtos que os do FINAME; servem para mostrar ao cliente onde a linha pública fica em relação ao crédito livre. Leasing paga ISS municipal embutido na contraprestação.</p><div class="tw"><table><thead><tr><th>Alternativa</th><th class="n">Taxa média</th><th class="n">CET</th><th class="n">Custo total</th><th class="n">Parcela pós-carência</th><th>Observação</th></tr></thead><tbody>' + av.mercado.map(function (x) {
        return "<tr><td><b>" + esc(x.linha.nome) + "</b></td><td class=\"n num\">" + P(x.sim.taxaAno1) + '</td><td class="n num">' + P(x.sim.cet) + '</td><td class="n num">' + P(x.sim.custoTotal) + '</td><td class="n num">' + R(x.sim.parcelaPosCarencia) + "</td><td class=\"small\">" + esc(x.linha.obs) + " " + (x.linha.fontes || []).map(linkF).join(" ") + "</td></tr>";
      }).join("") + "</tbody></table></div></div>" : "";
      var cond = av.condicionais.length ? '<div class="card"><div class="card-h"><h3>Dependem de confirmação</h3><span class="tiny">Entram no ranking quando a condição for marcada na aba Cliente</span></div><div class="tw"><table><thead><tr><th>Linha</th><th>Condição a confirmar</th><th class="n">Custo total se confirmada</th><th class="n">Parcela pós-carência</th></tr></thead><tbody>' + av.condicionais.map(function (x) {
        return "<tr><td><b>" + esc(x.linha.nome) + '</b><div class="tiny">' + esc(x.linha.obs) + "</div></td><td class=\"small\">" + esc(x.linha.elig.condicao.rotulo) + '</td><td class="n num"><b>' + P(x.sim.custoTotal) + '</b></td><td class="n num">' + R(x.sim.parcelaPosCarencia) + "</td></tr>";
      }).join("") + "</tbody></table></div></div>" : "";
      var nao = av.todas.filter(function (x) { return !x.el.ok && !x.linha.benchmark && !x.condicional; });
      var bloq = nao.length ? '<div class="card"><details><summary>Linhas não elegíveis para este caso (' + nao.length + ")</summary><div class=\"tw\"><table><thead><tr><th>Linha</th><th>Por que não</th><th class=\"n\">Custo total se fosse elegível</th></tr></thead><tbody>" + nao.map(function (x) {
        return "<tr><td><b>" + esc(x.linha.nome) + '</b><div class="tiny">' + esc(x.linha.operador) + "</div></td><td class=\"small\"><ul class=\"lst\">" + x.el.bloqueios.map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") + "</ul></td><td class=\"n num\">" + (x.sim ? P(x.sim.custoTotal) : "—") + "</td></tr>";
      }).join("") + "</tbody></table></div></details></div>" : "";
      pos.linhas = function () { chartLinhas(av); };
      return resumo + (av.ranking.length ? chart : "") + cards + cond + merc + bloq;
    },

    /* ---------- painel: simulação ---------- */
    sim: function () {
      var c = caso(), s = S.simAtual;
      if (!s) return '<div class="card empty"><h2>Sem linha para simular</h2><p class="muted">Nenhuma linha elegível. Ajuste o cadastro ou as condições na aba Cliente.</p></div>';
      var L = s.linha, sm = c.sim || {}, ctx = S.av.ctx;
      var elegiveis = S.av.todas.filter(function (x) { return x.linha.custos && x.linha.custos.length && x.linha.status !== "informativa"; });
      var optsL = elegiveis.map(function (x) { return '<option value="' + x.linha.id + '"' + (x.linha.id === L.id ? " selected" : "") + ">" + esc(x.linha.nome) + (x.el.ok ? "" : " (não elegível)") + "</option>"; }).join("");
      var optsC = L.custos.map(function (cu) { return '<option value="' + cu + '"' + (cu === s.custo ? " selected" : "") + ">" + esc(rotCusto(cu)) + "</option>"; }).join("");
      var ag = (L.spreads || []).filter(function (x) { return /agente|Spread|risco/i.test(x.nome); })[0];
      var agV = ag ? (sm.override && sm.override[ag.nome] != null ? sm.override[ag.nome] : ag.base) : null;
      var it = S.av.todas.filter(function (x) { return x.linha.id === L.id; })[0];
      var aviso = it && !it.el.ok ? '<div class="notice bad">Esta linha não é elegível para o caso: ' + esc(it.el.bloqueios.join("; ")) + ". A simulação é só ilustrativa.</div>" : "";
      var comp = "(1 + " + esc(s.cfRot) + ")" + s.spreads.map(function (x) { return " × (1 + " + P(x.v) + " " + esc(x.nome.toLowerCase()) + ")"; }).join("") + " − 1";
      var anos = {}; s.rows.forEach(function (r) { var k = Math.ceil(r.t / 12); if (!anos[k]) anos[k] = { k: k, juros: 0, amort: 0, parc: 0, cap: 0, saldo: 0, taxa: 0, n: 0 }; var A = anos[k]; A.juros += r.juros; A.cap += r.jurosCap; A.amort += r.amort; A.parc += r.parcela; A.saldo = r.saldo; A.taxa += r.taxa; A.n++; });
      var anual = Object.keys(anos).map(function (k) { var A = anos[k]; return "<tr><td>Ano " + A.k + '</td><td class="n num">' + P(A.taxa / A.n) + '</td><td class="n num">' + R(A.juros + A.cap) + '</td><td class="n num">' + R(A.amort) + '</td><td class="n num">' + R(A.parc) + '</td><td class="n num">' + R(A.saldo) + "</td></tr>"; }).join("");
      var mensal = s.rows.map(function (r) { return "<tr><td class=\"num\">" + r.t + '</td><td class="num">' + String(r.m).padStart(2, "0") + "/" + r.y + '</td><td class="n num">' + P(r.taxa) + '</td><td class="n num">' + R(r.saldoIni) + '</td><td class="n num">' + R(r.juros + r.jurosCap) + (r.jurosCap ? " cap." : "") + '</td><td class="n num">' + R(r.amort) + '</td><td class="n num">' + R(r.parcela) + '</td><td class="n num">' + R(r.saldo) + "</td></tr>"; }).join("");
      pos.sim = function () { chartSaldo(s); };
      return aviso + '<div class="card"><div class="card-h"><h2>Simulação</h2><span class="tiny">Projeção com o Focus de ' + dataBR(S.base.macro.focus.data) + "; taxas pós-fixadas variam com o índice</span></div><div class=\"form\">" +
        '<label class="f w2" for="f_simlinha">Linha<select id="f_simlinha" data-sim="linha">' + optsL + "</select></label>" +
        '<label class="f" for="f_simcusto">Custo financeiro<select id="f_simcusto" data-sim="custo">' + optsC + "</select></label>" +
        '<label class="f" for="f_simcen">Cenário de spread<select id="f_simcen" data-sim="cen">' + [["min", "Mínimo (p25)"], ["base", "Base (mediana)"], ["max", "Máximo (p75)"]].map(function (o) { return '<option value="' + o[0] + '"' + ((sm.cen || "base") === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select></label>" +
        fi("operacao.prazo", "Prazo total (meses)", c.operacao.prazo, "num") + fi("operacao.carencia", "Carência (meses)", c.operacao.carencia, "num") +
        fs("operacao.sistema", "Amortização", c.operacao.sistema, [["SAC", "SAC"], ["Price", "Price"]]) + fs("operacao.carModo", "Juros na carência", c.operacao.carModo, [["pagos", "Pagos"], ["capitalizados", "Capitalizados"]]) + fi("honorario_pct", "Honorário (%)", c.honorario_pct, "num") +
        "</div>" + (ag ? '<div style="margin-top:14px" class="stack"><label class="f" for="f_agente">' + esc(ag.nome) + ": <b class=\"num\" id=\"agVal\">" + P(agV) + '</b> a.a. <span class="h">faixa pública ' + P(ag.min) + " a " + P(ag.max) + (ag.obs ? " · " + esc(ag.obs) : "") + '</span><input type="range" id="f_agente" data-sim="agente" data-nome="' + esc(ag.nome) + '" min="' + Math.max(0, ag.min - 2) + '" max="' + (ag.max + 3) + '" step="0.05" value="' + agV + '"></label>' + (sm.override && sm.override[ag.nome] != null ? '<button class="sm ghost" data-act="sim-reset" style="align-self:flex-start">Voltar à faixa pública</button>' : "") + "</div>" : "") +
        "</div>" + (s.avisos.length ? '<div class="notice warn">' + s.avisos.map(esc).join("<br>") + "</div>" : "") +
        '<div class="kpis">' + kpi("Valor financiado", R(s.P), "prazo " + s.n + " meses, carência " + s.c) + kpi("Parcela pós-carência", R(s.parcelaPosCarencia), s.sistema + (s.c ? "; na carência " + (s.carModo === "pagos" ? R(s.rows[0].parcela) + " de juros" : "sem pagamento") : ""), true) +
        kpi("Taxa no 1º ano", P(s.taxaAno1), "a.a. nominal") + kpi("CET do agente", P(s.cet), "inclui IOF e tarifas") + kpi("Custo total", P(s.custoTotal), "com honorário de " + R(s.honor)) + kpi("Total pago", Rm(s.pagos), "juros " + Rm(s.juros + s.rows.reduce(function (a, r) { return a + r.jurosCap; }, 0))) + kpi("IOF", R(s.iof), L.iof === "zero" ? "alíquota zero" : L.iof === "nao_incide" ? "não incide" : "0,0082%/dia + 0,38%") + "</div>" +
        '<div class="card"><div class="card-h"><h3>Composição da taxa</h3></div><div class="formula">' + comp + "\n= " + P(s.taxaAno1) + " a.a. no primeiro ano</div><p class=\"tiny\" style=\"margin-top:8px\">" + esc(L.iof_base) + ". Fontes: " + (L.fontes || []).map(linkF).join(" · ") + "</p></div>" +
        '<div class="card"><div class="card-h"><h3>Saldo devedor e parcelas</h3></div><div class="chart" id="chSaldo"></div><div class="legend"><span><i style="background:var(--s1)"></i>Saldo devedor</span><span><i style="background:var(--s2)"></i>Parcela mensal</span></div></div>' +
        '<div class="card"><div class="card-h"><h3>Cronograma anual</h3></div><div class="tw"><table><thead><tr><th>Ano</th><th class="n">Taxa média</th><th class="n">Juros</th><th class="n">Amortização</th><th class="n">Pago no ano</th><th class="n">Saldo final</th></tr></thead><tbody>' + anual + "</tbody></table></div>" +
        '<details style="margin-top:12px"><summary>Cronograma mensal (' + s.rows.length + ' parcelas)</summary><div class="tw"><table><thead><tr><th>#</th><th>Mês</th><th class="n">Taxa a.a.</th><th class="n">Saldo inicial</th><th class="n">Juros</th><th class="n">Amortização</th><th class="n">Parcela</th><th class="n">Saldo final</th></tr></thead><tbody>' + mensal + "</tbody></table></div></details></div>";
    },

    /* ---------- painel: ROI ---------- */
    roi: function () {
      var c = caso(), Rr = c.roi || {}, ro = S.roiAtual, s = S.simAtual;
      var mod = S.base.modalidades.filter(function (m) { return m.id === Rr.modalidade; })[0];
      var cp = mod ? S.base.custos_padrao[mod.id] || {} : {};
      var modo = Rr.modo === "internalizacao" ? "internalizacao" : "novo";
      var head = '<div class="card"><div class="card-h"><h2>ROI e payback</h2><div class="row">' + fs("roi.modo", "Modo", modo, [["novo", "Novo serviço (greenfield)"], ["internalizacao", "Internalização de serviço terceirizado"]]) + fc("roi.ativo", "Incluir no estudo do cliente", Rr.ativo) + '</div></div><p class="small muted">' + (modo === "internalizacao" ? "Internalização: o ganho é a diferença entre operar o serviço com equipamento próprio e manter o terceiro, sobre a mesma receita. " : "Novo serviço: capacidade × ocupação × rampa × ticket. ") + 'Opcional: só entra no estudo em PDF com a caixa marcada. Usa a linha da aba Simulação (' + esc(s ? s.linha.nome : "nenhuma") + "). Cada premissa mostra a origem: <span class=\"pill info\">fonte</span> valor público com referência; <span class=\"pill warn\">provisório</span> ponto de partida S&S sem fonte pública, a confirmar; <span class=\"pill gold\">cliente</span> dado do cliente.</p></div>";
            var modOpts = [["", "—"]].concat(S.base.modalidades.map(function (m) { return [m.id, m.nome]; }));
      var form = '<div class="card"><div class="card-h"><h3>Premissas de produção e receita</h3></div><div class="form">' + fs("roi.modalidade", "Modalidade", Rr.modalidade, modOpts) +
        (mod && mod.un === "tratamentos" ? fi("roi.cap_mes", "Capacidade (tratamentos/mês)", Rr.cap_mes, "num", "Padrão " + mod.mes + " (720/ano, Portaria 8.516/2025)", "", "info")
          : fi("roi.exh", "Exames por hora", Rr.exh, "num", mod ? "Padrão " + N(mod.exh, 1) : "", "", "info") + fi("roi.h", "Horas por dia", Rr.h, "num", mod ? "Padrão " + mod.h : "", "", "warn") + fi("roi.d", "Dias por mês", Rr.d, "num", mod ? "Padrão " + mod.d : "", "", "warn")) +
        fi("roi.ocupacao", "Ocupação de regime (%)", Rr.ocupacao, "num", "Padrão 80", "", "warn") + fi("roi.volume_mes", "Ou volume de regime (" + (mod ? mod.un : "exames") + "/mês)", Rr.volume_mes, "num", "Se o cliente informar, substitui a conta acima", "", "gold") +
        fi("roi.ramp_ini", "Ramp-up: ocupação inicial (%)", Rr.ramp_ini, "num", "", "", "warn") + fi("roi.ramp_meses", "Meses até o regime", Rr.ramp_meses, "num", "", "", "warn") + fi("roi.inicio_op", "Meses da liberação até operar", Rr.inicio_op, "num", "Instalação e licenças", "", "warn") +
        fi("roi.mix_sus", "Mix SUS (%)", Rr.mix_sus, "num", "", "", "gold") + fi("roi.mix_conv", "Mix convênio (%)", Rr.mix_conv, "num", "", "", "gold") + fi("roi.mix_part", "Mix particular (%)", Rr.mix_part, "num", "", "", "gold") +
        fi("roi.preco_sus", "Preço SUS (R$)", Rr.preco_sus, "num", mod ? "SIGTAP " + (mod.sus != null ? R(mod.sus).replace("R$ ", "R$ ") : "—") + (mod.ate ? "; com Agora Tem Especialistas " + N(mod.ate, 2) : "") : "", "", "info") +
        (mod && mod.ate ? fc("roi.ate", "Cliente habilitado no Agora Tem Especialistas (38.05/38.06)", Rr.ate) : "") +
        fi("roi.preco_conv", "Preço médio convênio (R$)", Rr.preco_conv, "num", mod && mod.conv ? "Referência pública: " + N(mod.conv, 0) + " (um pagador)" : "Sem base pública: informe o praticado", "", "gold") + fi("roi.preco_part", "Preço médio particular (R$)", Rr.preco_part, "num", "Informe o praticado", "", "gold") + fi("roi.glosa", "Glosa e inadimplência (%)", Rr.glosa, "num", "", "", "gold") +
        '</div>' + (mod ? '<p class="tiny" style="margin-top:10px">' + esc(mod.fx) + " Fontes: " + mod.f.map(linkF).join(" · ") + "</p>" : "") + "</div>" +
        '<div class="card"><div class="card-h"><h3>Custos, tributos e taxa de desconto</h3></div><div class="form">' +
        fi("roi.laudo", "Laudo / repasse médico (% da receita)", Rr.laudo, "num", "Padrão " + (cp.laudo != null ? cp.laudo : "—"), "", "warn") + fi("roi.insumo", "Insumos por " + (mod && mod.un === "tratamentos" ? "tratamento" : "exame") + " (R$)", Rr.insumo, "num", "Padrão " + (cp.insumo != null ? cp.insumo : "—"), "", "warn") +
        fi("roi.manut", "Manutenção pós-garantia (% do equipamento/ano)", Rr.manut, "num", "Padrão " + (cp.manut != null ? cp.manut : "—"), "", "warn") + fi("roi.garantia", "Garantia (meses)", Rr.garantia, "num", "Padrão " + (cp.garantia || "—"), "", "warn") +
        fi("roi.equipe", "Equipe incremental (R$/mês)", Rr.equipe, "num", "", "", "gold") + fi("roi.energia", "Energia e utilidades (R$/mês)", Rr.energia, "num", "", "", "gold") + fi("roi.outros_fixos", "Outros fixos (R$/mês)", Rr.outros_fixos, "num", "", "", "gold") + fi("roi.outros_capex", "Outros investimentos (R$)", Rr.outros_capex, "num", "", "", "gold") +
        fs("roi.regime", "Regime tributário", Rr.regime || c.cliente.regime, [["presumido", "Lucro Presumido"], ["simples", "Simples Nacional"], ["real", "Lucro Real"]]) + fi("roi.iss", "ISS (%)", Rr.iss, "num", "2% a 5% conforme o município", "", "gold") +
        (Rr.regime === "simples" ? fi("roi.simples", "Alíquota efetiva do Simples (%)", Rr.simples, "num", "", "", "gold") : "") + (Rr.regime !== "simples" && Rr.regime !== "real" ? fc("roi.equiparacao", "Presunção de 8%/12% (serviço hospitalar: sociedade empresária e normas da Anvisa)", Rr.equiparacao !== false) : "") +
        fi("roi.desconto", "Taxa de desconto (% a.a.)", Rr.desconto, "num", "Padrão: CDI " + P(S.base.macro.cdi.v), "", "info") + fi("roi.horizonte", "Horizonte (anos)", Rr.horizonte, "num", "Vida útil fiscal: 10 anos", "", "info") +
        '</div><p class="tiny" style="margin-top:10px">Lucro Presumido: PIS 0,65% + COFINS 3% + ISS sobre a receita; IRPJ 15% (+10% acima de R$ 20 mil/mês) sobre 8% da receita e CSLL 9% sobre 12% (' + linkF("f_lp") + "). Depreciação em 10 anos (" + linkF("f_dep") + "). A reforma tributária (CBS/IBS a partir de 2027, com redução de 60% para serviços de saúde) não está modelada.</p></div>";
      if (modo === "internalizacao") form = formInternalizacao(c, Rr);
      if (!ro) return head + form;
      pos.roi = function () { chartROI(ro); };
      var tab = ro.anos.map(function (A) { return "<tr><td>Ano " + A.ano + '</td><td class="n num">' + N(A.vol) + '</td><td class="n num">' + R(A.rec) + '</td><td class="n num">' + R(A.ebitda) + '</td><td class="n num">' + R(A.ir) + '</td><td class="n num">' + R(A.servico) + '</td><td class="n num' + (A.fca < 0 ? " neg" : "") + '">' + R(A.fca) + '</td><td class="n num">' + R(A.acum) + '</td><td class="n num' + (A.dscr != null && A.dscr < 1.3 ? " neg" : "") + '">' + X(A.dscr) + "</td></tr>"; }).join("");
      var cobert = ro.mod.dem1000 && ro.volRegime ? " O volume de regime equivale ao uso de " + N(ro.volRegime * 12 / ro.mod.dem1000 * 1000, 0) + " beneficiários de plano (" + ro.mod.dem1000 + " exames por 1.000 ao ano, ANS)." : "";
      var capSus = ro.mod.cap_sus && ro.volRegime ? " Parâmetro SUS de capacidade: " + N(ro.mod.cap_sus) + " " + ro.mod.un + "/ano por equipamento; a premissa usa " + N(ro.volRegime * 12) + "." : "";
      var avSus = (num(Rr.mix_sus) || 0) >= 100 && !Rr.ate ? '<div class="notice warn">Mix 100% SUS pela tabela SIGTAP sem o incremento do Agora Tem Especialistas: é o cenário mais conservador. Informe o mix e os preços praticados pelo cliente para o retorno real.</div>' : "";
      return head + form + avSus + (ro.avisos.length ? '<div class="notice warn">' + ro.avisos.map(esc).join("<br>") + "</div>" : "") +
        '<div class="kpis">' + kpi("TIR do projeto", P(ro.tir_proj), "sem financiamento") + kpi("TIR do acionista", P(ro.tir_acion), "com a linha simulada", true) + kpi("VPL do projeto", Rm(ro.vpl_proj), "a " + P(ro.desconto) + " a.a.") +
        kpi("Payback do acionista", ro.pb_acion ? N(ro.pb_acion / 12, 1) + " anos" : "não paga", "descontado: " + (ro.pb_acion_desc ? N(ro.pb_acion_desc / 12, 1) + " anos" : "não paga")) + kpi("Payback do projeto", ro.pb_proj ? N(ro.pb_proj / 12, 1) + " anos" : "não paga", "descontado: " + (ro.pb_proj_desc ? N(ro.pb_proj_desc / 12, 1) + " anos" : "não paga")) +
        kpi("DSCR mínimo", X(ro.dscr_min), "referência pública ≥ 1,30") + (ro.mod.id === "internalizacao" ? kpi("Ganho operacional mensal", R(ro.ganhoMes), "próprio " + R(ro.ebPropMes) + " · atual " + R(ro.ebAtualMes), true) : kpi("Ponto de equilíbrio", ro.breakeven ? N(ro.breakeven) + " " + ro.mod.un + "/mês" : "margem negativa", "cobre parcela, manutenção e fixos; regime: " + N(ro.volRegime) + "/mês")) + kpi("Aporte inicial", Rm(ro.aporte), "entrada + IOF + tarifas + honorário") + "</div>" +
        (ro.ticket != null ? '<div class="notice">Ticket médio ponderado: <b class="num">' + R(ro.ticket) + "</b> por " + (ro.mod.un === "tratamentos" ? "tratamento" : "exame") + "." + capSus + cobert + "</div>" : '<div class="notice">Ganho anual em regime: <b class="num">' + R(ro.ganhoMes * 12) + "</b>. Tributação: " + esc(ro.regime === "imune" ? "imune (filantrópica)" : ro.regime === "real" ? "Lucro Real, 34% sobre o EBIT incremental" : "sobre a receita, que não muda: zero incremental") + ".</div>") +
        '<div class="card"><div class="card-h"><h3>Fluxo do acionista acumulado</h3></div><div class="chart" id="chROI"></div><div class="legend"><span><i style="background:var(--s1)"></i>Fluxo anual do acionista</span><span><i style="background:var(--s2)"></i>Acumulado</span></div></div>' +
        '<div class="card"><div class="card-h"><h3>Fluxo anual</h3></div><div class="tw"><table><thead><tr><th>Ano</th><th class="n">Volume</th><th class="n">Receita</th><th class="n">EBITDA</th><th class="n">IR/CSLL</th><th class="n">Serviço da dívida</th><th class="n">Fluxo acionista</th><th class="n">Acumulado</th><th class="n">DSCR</th></tr></thead><tbody>' + tab + "</tbody></table></div></div>";
    },

    /* ---------- painel: documentos ---------- */
    saidas: function () {
      var c = caso(), kp = kitProg(c), s = S.simAtual;
      var faltas = [];
      if (!c.cliente.cnpj) faltas.push("CNPJ"); if (!c.cliente.razao) faltas.push("razão social"); if (!num(c.operacao.valor_equip)) faltas.push("valor do equipamento"); if (!(c.operacao.equipamento || {}).cfi) faltas.push("código CFI");
      var semDl = (!S.downloads && S.modo !== "local") ? '<div class="notice warn">O download de arquivos não está disponível nesta visualização. Abra pelo claude.ai com sua conta.</div>' : "";
      function card(id, t, d, extra) { return '<div class="card out"><h3>' + t + '</h3><p class="small muted">' + d + "</p>" + (extra || "") + '<div class="row"><button class="primary" data-act="gerar" data-doc="' + id + '"' + (S.downloads || S.modo === "local" ? "" : " disabled") + ">Gerar " + (id === "contrato" ? ".docx" : id === "kit" ? ".xlsx" : "PDF") + "</button></div></div>"; }
      return semDl + (faltas.length ? '<div class="notice warn">Faltam no cadastro: ' + esc(faltas.join(", ")) + ". Os documentos saem com esses campos em branco.</div>" : "") +
        '<div class="grid g2">' +
        card("estudo", "Estudo de financiamento para o cliente", "Linhas recomendadas e por quê, com fontes; simulação da linha escolhida (" + esc(s ? s.linha.nome : "—") + "); cronograma anual; " + (c.roi && c.roi.ativo ? "ROI e payback; " : "") + "premissas e ressalvas. Marca S&S Partners.") +
        card("dossie", "Dossiê para o agente financeiro", "Apresentação da operação ao banco: cadastro, equipamento e CFI, valores, indicadores dos exercícios, capacidade de pagamento, garantias propostas e situação do kit (" + kp.okOb + "/" + kp.totOb + " obrigatórios).") +
        card("kit", "Kit e cadastro em planilha", "A planilha-mestre S&S com o checklist (status e observações deste caso) e o cadastro preenchido, para enviar ao cliente.") +
        card("contrato", "Minuta do contrato de intermediação", "Contrato S&S com cliente, equipamento, CFI, valor e honorário de " + N(num(c.honorario_pct) == null ? 2 : num(c.honorario_pct), 1) + "% preenchidos. CPF, RG e qualificação do representante são pedidos na hora e não ficam salvos.") +
        "</div>";
    },

    /* ---------- painel: base ---------- */
    base: function () {
      var b = S.base, m = b.macro;
      var macro = [["Selic meta", P(m.selic.v), m.selic.obs, m.selic.fonte], ["Focus – Selic fim de ano", Object.keys(m.focus.selic_fim).map(function (k) { return k + ": " + P(m.focus.selic_fim[k]); }).join(" · "), m.focus.obs, m.focus.fonte], ["Focus – IPCA", Object.keys(m.focus.ipca).map(function (k) { return k + ": " + P(m.focus.ipca[k]); }).join(" · "), "", m.focus.fonte],
        ["TLP – parcela real (Jm)", P(m.tlp_jm.v), m.tlp_jm.obs, m.tlp_jm.fonte], ["Taxa Prefixada MPME (PMm)", P(m.pmm.v), m.pmm.obs, m.pmm.fonte], ["Taxa Prefixada (Pm)", P(m.pm.v), m.pm.obs, m.pm.fonte], ["TJLP", P(m.tjlp.v), m.tjlp.periodo, m.tjlp.fonte], ["TR", P(m.tr_am.v, 4) + " a.m.", m.tr_am.obs, m.tr_am.fonte], ["CDI", P(m.cdi.v), m.cdi.ref, m.cdi.fonte], ["IPCA 12 meses", P(m.ipca12.v), m.ipca12.ref, m.ipca12.fonte], ["IOF crédito PJ", "0,0082%/dia + 0,38%", m.iof.obs, m.iof.fonte]];
      var mt = macro.map(function (r) { return "<tr><td><b>" + esc(r[0]) + '</b></td><td class="num">' + esc(r[1]) + '</td><td class="small">' + esc(r[2] || "") + '</td><td class="small">' + linkF(r[3]) + "</td></tr>"; }).join("");
      var bcb = m.bcb.map(function (x) { return "<tr><td>" + esc(x.nome) + '</td><td class="n num">' + P(x.v) + '</td><td class="num">' + x.sgs + "</td><td>" + esc(x.ref) + "</td></tr>"; }).join("");
      var emp = b.empirico.linhas.map(function (x) { return "<tr><td>" + esc(x.recorte) + '</td><td class="n num">' + x.n + '</td><td class="n num">' + P(x.p25) + '</td><td class="n num">' + P(x.med) + '</td><td class="n num">' + P(x.p75) + '</td><td class="n num">' + P(x.max) + '</td><td class="n num">' + x.car + " / " + x.amort + "</td></tr>"; }).join("");
      var ls = b.linhas.map(function (l) {
        var st = { aberta: "good", condicionada: "warn", encerrada: "bad", informativa: "info" }[l.status] || "";
        var spr = (l.spreads || []).map(function (s, i) { return '<div class="row small"><span style="min-width:150px">' + esc(s.nome) + '</span><input class="n" style="width:80px" id="sp_' + l.id + "_" + i + '" data-spread="' + l.id + "|" + i + '|min" value="' + s.min + '"><input class="n" style="width:80px" id="spb_' + l.id + "_" + i + '" data-spread="' + l.id + "|" + i + '|base" value="' + s.base + '"><input class="n" style="width:80px" id="spm_' + l.id + "_" + i + '" data-spread="' + l.id + "|" + i + '|max" value="' + s.max + '"><span class="tiny">mín · base · máx (% a.a.)</span></div>'; }).join("");
        return '<details class="card" ' + (S.aberto["b_" + l.id] ? "open" : "") + ' data-open="b_' + l.id + '"><summary><span class="pill ' + st + '">' + esc(l.status) + "</span> <b>" + esc(l.nome) + '</b> <span class="tiny">' + esc(l.familia) + "</span></summary><div class=\"stack small\">" +
          "<div><b>Operador:</b> " + esc(l.operador) + "</div><div><b>Quem pode:</b> " + esc(regrasTxt(l)) + "</div><div><b>Condições:</b> participação até " + (l.cond.part || "—") + "%, prazo até " + (l.cond.prazo || "não publicado") + " meses, carência até " + (l.cond.carencia == null ? "não publicada" : l.cond.carencia + " meses") + (l.cond.obras ? ", financia obra e instalação" : ", não financia obra") + "</div>" +
          "<div><b>Custo:</b> " + esc((l.custos || []).map(rotCusto).join(" ou ") || "taxa não obtida") + "</div>" + (spr ? '<div class="stack">' + spr + "</div>" : "") + "<div><b>IOF:</b> " + esc(l.iof_base) + "</div><div><b>Garantias:</b> " + esc(l.garantias) + "</div><div>" + esc(l.obs) + '</div><div class="src">' + (l.fontes || []).map(linkF).join("") + "</div></div></details>";
      }).join("");
      return '<div class="card"><div class="card-h"><h2>Base de linhas e taxas</h2><div class="row">' + (S.baseSalva ? '<button class="sm danger" data-act="base-reset">Restaurar o padrão de ' + esc(BASE_PADRAO.versao) + "</button>" : "") + '<span class="pill ' + (S.baseSalva ? "warn" : "good") + '">' + (S.baseSalva ? "editada" : "padrão " + esc(b.versao)) + "</span></div></div><p class=\"small muted\">" + esc(b.nota) + " Editar um spread aqui muda o ranking de todos os casos. Para atualizar o macro (Selic, Focus, TLP), peça ao Claude uma nova coleta.</p></div>" +
        '<div class="card"><div class="card-h"><h3>Referências macro</h3></div><div class="tw"><table><thead><tr><th>Indicador</th><th>Valor</th><th>Observação</th><th>Fonte</th></tr></thead><tbody>' + mt + "</tbody></table></div></div>" +
        '<div class="card"><div class="card-h"><h3>Operações BNDES de saúde contratadas</h3><span class="tiny">' + esc(b.empirico.titulo) + '</span></div><div class="tw"><table><thead><tr><th>Recorte</th><th class="n">Ops</th><th class="n">p25</th><th class="n">Mediana</th><th class="n">p75</th><th class="n">Máx.</th><th class="n">Carência / amortização (med., meses)</th></tr></thead><tbody>' + emp + '</tbody></table></div><p class="tiny" style="margin-top:8px">' + esc(b.empirico.nota) + " Agentes com mais operações FINAME: " + esc(b.empirico.agentes.join(", ")) + ". " + linkF("f_emp") + "</p></div>" +
        '<div class="card"><div class="card-h"><h3>Médias do Banco Central (PJ)</h3></div><div class="tw"><table><thead><tr><th>Modalidade</th><th class="n">% a.a.</th><th>SGS</th><th>Ref.</th></tr></thead><tbody>' + bcb + "</tbody></table></div></div>" +
        '<h2 style="margin-top:6px">Linhas</h2>' + ls;
    },

    /* ---------- painel: catálogo ---------- */
    catalogo: function () {
      var rows = S.catalogo.map(function (i, k) {
        return "<tr><td>" + inp("cat_" + k + "_modelo", "cat|" + k + "|modelo", i.modelo) + "</td><td>" + selM("cat_" + k + "_mod", "cat|" + k + "|modalidade", i.modalidade) + "</td><td>" + inp("cat_" + k + "_fab", "cat|" + k + "|fabricante", i.fabricante) + "</td><td>" + inp("cat_" + k + "_cfi", "cat|" + k + "|cfi", i.cfi) + "</td><td>" + inp("cat_" + k + "_ncm", "cat|" + k + "|ncm", i.ncm) + "</td><td>" + inp("cat_" + k + "_preco", "cat|" + k + "|preco", i.preco, "n") + '</td><td><select id="cat_' + k + '_or" data-cat="cat|' + k + '|origem"><option value="nacional"' + (i.origem === "nacional" ? " selected" : "") + '>Nacional</option><option value="importado"' + (i.origem === "importado" ? " selected" : "") + ">Importado</option></select></td><td class=\"tiny\">" + esc(i.fonte || "") + '</td><td><button class="sm ghost danger" data-act="cat-del" data-k="' + k + '">Remover</button></td></tr>';
      }).join("");
      return '<div class="card"><div class="card-h"><h2>Catálogo de equipamentos VMI e Alfamed</h2><div class="row"><span class="pill ' + (S.catSalvo ? "good" : "warn") + '">' + (S.catSalvo ? "salvo" : "inicial") + '</span><button class="sm" data-act="cat-add">Adicionar item</button><label class="drop" for="catFile" style="padding:6px 10px">Importar planilha (.xlsx ou .csv)<input type="file" id="catFile" accept=".xlsx,.csv" hidden></label></div></div>' +
        '<p class="small muted">O código CFI é a trava do FINAME: sem ele, as linhas do BNDES ficam bloqueadas. Códigos verificados no Catálogo CFI do BNDES em ' + esc(BASE_PADRAO.catalogo_versao) + ' (VMI Médica, CNPJ 02.659.246/0001-03: 16 itens; Alfa Med, CNPJ 11.405.384/0001-49: 3 itens). <b>A TC Pulsar não consta</b>: até o credenciamento, a tomografia VMI só entra em linhas sem CFI. TCs credenciadas de concorrentes: ' + esc(BASE_PADRAO.cfi_tc_concorrentes.map(function (x) { return x[0] + " (" + x[1] + ")"; }).join("; ")) + '. Confirme cada código em ' + linkF("f_cfi") + ". Importação: a primeira linha precisa ter colunas com estes nomes (em qualquer ordem): modelo, modalidade, fabricante, cfi, ncm, preco, origem.</p>" +
        '<div class="tw"><table><thead><tr><th>Modelo</th><th>Modalidade</th><th>Fabricante</th><th>CFI</th><th>NCM</th><th class="n">Preço de lista</th><th>Origem</th><th>Fonte</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div><div class="row end" style="margin-top:12px"><button class="primary" data-act="cat-save">Salvar catálogo</button></div></div>';
    },

    /* ---------- painel: método ---------- */
    metodo: function () {
      return '<div class="card stack"><h2>Como a ferramenta decide</h2><p class="muted" style="max-width:80ch">A IA só lê documentos. Elegibilidade, ranking, taxas, cronograma, CET e ROI saem de regras fixas e fórmulas abertas abaixo: o mesmo caso sempre dá o mesmo resultado, e cada número aponta para a fonte.</p></div>' +
        '<div class="card stack"><h3>Dois modos de ROI e a visão da entidade (desde 14/10/2026)</h3><p class="small muted" style="max-width:90ch"><b>Novo serviço:</b> volume = capacidade × ocupação × rampa; receita = volume × ticket ponderado pelo mix. <b>Internalização:</b> ganho = EBITDA próprio − EBITDA atual sobre a mesma receita; custos fixos já pagos não entram; Presumido e Simples tributam a receita (imposto incremental zero), Lucro Real tributa 34% do EBIT incremental. <b>Filantrópica:</b> IR/CSLL e PIS/COFINS imunes nos dois modos; só o ISS, conforme o município. <b>Entidade:</b> DSCR ano a ano = (EBITDA do tomador + ganho do projeto líquido de IR) ÷ (parcelas das dívidas existentes + parcela nova), com e sem o evento de desalavancagem; dívida líquida/EBITDA antes e depois da operação.</p></div>' +
        '<div class="grid g2"><div class="card stack"><h3>1. Elegibilidade</h3><ul class="lst small"><li>Natureza jurídica (privada ou filantrópica) e porte pela receita bruta anual do grupo (BNDES: micro até R$ 360 mil; pequena até R$ 4,8 mi; média até R$ 300 mi).</li><li>UF na área de atuação (fundos constitucionais e agências estaduais). Norte de MG/ES entra no FNE só se marcado como área da Sudene.</li><li>Equipamento: linhas BNDES exigem código CFI (bem novo, nacional, credenciado). Importado só onde a linha prevê.</li><li>Valor mínimo e máximo; condições comprováveis marcadas no caso (Mais Inovação, projeto de inovação, filantrópica SUS, FIIS selecionado).</li><li>Linhas encerradas e sem taxa publicada não entram no ranking.</li></ul></div>' +
        '<div class="card stack"><h3>2. Taxa de cada linha</h3><div class="formula">taxa a.a. = (1 + custo financeiro) × (1 + Taxa do BNDES) × (1 + taxa do agente) − 1\nTLP = (1 + IPCA do ano, Focus) × (1 + Jm) − 1, com Jm fixo no contrato\nfundos constitucionais: TFC pré do porte, sem spread\nmensal = (1 + taxa a.a.)^(1/12) − 1</div><p class="small muted">A taxa do agente não tem referência oficial; a faixa usada vem das operações de saúde contratadas e publicadas nos dados abertos do BNDES (p25, mediana e p75).</p></div>' +
        '<div class="card stack"><h3>3. Cronograma, IOF e CET</h3><ul class="lst small"><li>SAC: amortização constante após a carência. Price: parcela recalculada pelo saldo e pela taxa do mês.</li><li>Carência: juros pagos mês a mês ou capitalizados no saldo.</li><li>IOF PJ: 0,0082% ao dia sobre cada amortização (até 365 dias) + 0,38% sobre o valor; zero no FINAME (art. 8º, IX) e nos fundos constitucionais; não incide no leasing.</li><li>CET do agente = TIR mensal anualizada de: valor liberado − IOF − tarifas, menos as parcelas. Custo total = mesma conta, descontando também o honorário de êxito.</li></ul></div>' +
        '<div class="card stack"><h3>4. ROI e payback</h3><ul class="lst small"><li>Volume = exames/hora × horas × dias × ocupação × rampa; receita = volume × ticket ponderado pelo mix × (1 − glosa).</li><li>EBITDA = receita − tributos sobre a receita − laudo − insumos − manutenção (após a garantia) − fixos.</li><li>Fluxo do acionista = EBITDA − IR/CSLL − parcela; no mês zero, entrada + IOF + tarifas + honorário.</li><li>TIR e VPL mensais anualizados; payback no mês em que o acumulado vira positivo; DSCR = (EBITDA − IR) ÷ serviço da dívida no ano.</li></ul></div></div>' +
        '<div class="card stack"><h3>Origem das premissas</h3><p class="small"><span class="pill info">fonte</span> valor público com referência e data · <span class="pill warn">provisório</span> ponto de partida S&S sem fonte pública, a confirmar com o cliente · <span class="pill gold">cliente</span> dado do cliente. Base de linhas: ' + esc(S.base.versao) + ".</p></div>";
    }
  };

  /* ---------- pedaços de interface ---------- */
  function kpi(l, v, sub, hl) { return '<div class="kpi' + (hl ? " hl" : "") + '"><span class="l">' + esc(l) + '</span><span class="v' + (String(v).length > 12 ? " s" : "") + '">' + esc(v) + "</span>" + (sub ? '<span class="sub">' + esc(sub) + "</span>" : "") + "</div>"; }
  function fid(p) { return "f_" + p.replace(/\./g, "_"); }
  function fi(path, label, val, tipo, hint, cls, origem) {
    var id = fid(path), v = val == null ? "" : val, t = tipo || "";
    var pill = origem ? ' <span class="pill ' + origem + '">' + ({ info: "fonte", warn: "provisório", gold: "cliente" }[origem]) + "</span>" : "";
    var ctrl = t === "area" ? '<textarea id="' + id + '" data-k="' + path + '">' + esc(v) + "</textarea>"
      : '<input id="' + id + '" data-k="' + path + '"' + (t === "num" ? ' data-t="num" class="n" inputmode="decimal"' : "") + ' type="' + (t === "date" ? "date" : t === "month" ? "month" : "text") + '" value="' + esc(t === "num" && v !== "" ? String(v).replace(".", ",") : v) + '">';
    return '<label class="f ' + (cls || "") + '" for="' + id + '">' + (label ? "<span>" + esc(label) + pill + "</span>" : "") + ctrl + (hint ? '<span class="h">' + esc(hint) + "</span>" : "") + "</label>";
  }
  function fs(path, label, val, opts) { var id = fid(path); return '<label class="f" for="' + id + '">' + esc(label) + '<select id="' + id + '" data-k="' + path + '">' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(val == null ? "" : val) === String(o[0]) ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select></label>"; }
  function fc(path, label, val) { var id = fid(path); return '<label class="chk" for="' + id + '"><input type="checkbox" id="' + id + '" data-k="' + path + '" data-t="bool"' + (val ? " checked" : "") + "><span>" + esc(label) + "</span></label>"; }
  function inp(id, k, v, cls) { return '<input id="' + id + '" data-cat="' + k + '" class="' + (cls || "") + '" value="' + esc(v == null ? "" : v) + '">'; }
  function selM(id, k, v) { return '<select id="' + id + '" data-cat="' + k + '"><option value="">—</option>' + S.base.modalidades.map(function (m) { return '<option value="' + m.id + '"' + (v === m.id ? " selected" : "") + ">" + esc(m.nome) + "</option>"; }).join("") + "</select>"; }
  function rotCusto(cu) { return { PMm: "Pré FAT MPME (PMm, prefixado)", Pm: "Pré FAT (Pm, prefixado)", TLP: "TLP (IPCA + parcela real fixa)", TR: "TR + spread", SELIC: "Selic + spread", EMP_MI: "Taxa fixa total observada (Mais Inovação)", FIXA_FIIS: "Taxa fixa FIIS (teto)", TFC_FNE: "TFC pré FNE", TFC_FNO: "TFC pré FNO", TFC_FCO: "TFC pré FCO", BCB_aq_bens: "Média BCB aquisição de bens", BCB_arrend: "Média BCB arrendamento" }[cu] || cu; }
  function regrasTxt(l) {
    var e = l.elig || {}, p = [];
    p.push((e.natureza || []).map(function (n) { return n === "privada" ? "privada" : "filantrópica"; }).join(" ou "));
    if (e.portes) p.push("porte " + e.portes.map(function (x) { return PORTES[x]; }).join("/"));
    p.push(e.ufs ? "UF " + e.ufs.join(", ") + (e.sudene ? " (+ norte de MG/ES)" : "") : "nacional");
    if (e.exige_cfi) p.push("exige CFI");
    if (e.valor_min) p.push("mín. " + Rm(e.valor_min)); if (e.valor_max) p.push("máx. " + Rm(e.valor_max));
    if (e.condicao) p.push(e.condicao.rotulo);
    return p.join("; ");
  }
  function cardLinha(x, ctx) {
    var s = x.sim, L = x.linha, f = s.faixa, lo = Math.min(f.min, s.custoTotal), hi = Math.max(f.max, s.custoTotal);
    var scale = function (v) { return Math.max(0, Math.min(100, (v - 6) / (26 - 6) * 100)); };
    var bench = S.av.benchmark, delta = bench ? s.custoTotal - bench.v : null;
    var compTxt = esc(s.cfRot) + s.spreads.map(function (sp) { return " + " + esc(sp.nome.toLowerCase()) + " " + P(sp.v); }).join("");
    return '<div class="linha' + (x.rank === 1 ? " top" : "") + '"><div class="rank">#' + x.rank + '</div><div class="stack" style="gap:6px"><div><div class="nm">' + esc(L.nome) + '</div><div class="op">' + esc(L.operador) + ' · <span class="pill ' + (L.status === "aberta" ? "good" : "warn") + '">' + esc(L.status) + "</span></div></div>" +
      '<div class="comp"><span>' + compTxt + "</span><span>IOF " + (L.iof === "zero" ? "zero" : L.iof === "nao_incide" ? "não incide" : R(s.iof)) + "</span><span>" + s.n + " meses · carência " + s.c + "</span>" + (s.P < ctx.fin - 1 ? "<span>financia " + Rm(s.P) + "</span>" : "") + "</div>" +
      '<div class="why"><div><h4>Por que entra</h4><ul class="lst small">' + x.el.porques.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "<li>Prazo até " + (L.cond.prazo || "—") + " meses e carência até " + (L.cond.carencia == null ? "—" : L.cond.carencia) + " meses; financia até " + (L.cond.part || 100) + "% do item" + (L.iof === "zero" ? "; IOF zero" : "") + "</li>" + (delta != null ? "<li>" + (delta < 0 ? P(-delta) + " abaixo" : P(delta) + " acima") + " da média BCB de aquisição de bens PJ (" + P(bench.v) + ")</li>" : "") + "</ul></div>" +
      '<div><h4>Atenção</h4><ul class="lst small">' + x.el.avisos.concat(s.avisos).map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "<li>" + esc(L.obs) + "</li></ul></div></div>" +
      '<div class="src">' + (L.fontes || []).map(linkF).join("") + "</div></div>" +
      '<div class="rt"><span class="eyebrow">Custo total com honorário</span><span class="big">' + P(s.custoTotal) + '</span><div class="bar" title="faixa ' + P(f.min) + " a " + P(f.max) + '"><i style="left:' + scale(lo) + "%;width:" + Math.max(1, scale(hi) - scale(lo)) + '%"></i><b style="left:' + scale(s.custoTotal) + '%"></b></div><span class="tiny num">faixa ' + P(f.min) + " – " + P(f.max) + "</span>" +
      '<span class="small">CET do agente <b class="num">' + P(s.cet) + '</b></span><span class="small">1º ano <b class="num">' + P(s.taxaAno1) + '</b> a.a.</span><span class="small">Parcela pós-carência <b class="num">' + R(s.parcelaPosCarencia) + "</b></span>" +
      '<button class="sm" data-act="simular" data-l="' + L.id + '" data-c="' + s.custo + '">Simular esta linha</button></div></div>';
  }
  function indicadoresBloco(c) {
    var ex = (c.financeiro && c.financeiro.exercicios) || [], cols = ["ano", "receita_bruta", "receita_liquida", "ebit", "depreciacao", "despesas_financeiras", "lucro_liquido", "ativo_circulante", "caixa", "realizavel_lp", "ativo_total", "passivo_circulante", "emprestimos_cp", "passivo_nao_circulante", "emprestimos_lp", "patrimonio_liquido"];
    var nomes = { ano: "Exercício", receita_bruta: "Receita bruta", receita_liquida: "Receita líquida", ebit: "Resultado operacional (EBIT)", depreciacao: "Depreciação e amortização", despesas_financeiras: "Despesas financeiras", lucro_liquido: "Lucro líquido", ativo_circulante: "Ativo circulante", caixa: "Caixa e equivalentes", realizavel_lp: "Realizável a longo prazo", ativo_total: "Ativo total", passivo_circulante: "Passivo circulante", emprestimos_cp: "Empréstimos de curto prazo", passivo_nao_circulante: "Passivo não circulante", emprestimos_lp: "Empréstimos de longo prazo", patrimonio_liquido: "Patrimônio líquido" };
    var head = "<tr><th>Conta (R$)</th>" + ex.map(function (e, i) { return '<th class="n">' + esc(e.ano || "Ex. " + (i + 1)) + ' <button class="sm ghost danger" data-act="ex-del" data-i="' + i + '" title="Remover exercício">×</button></th>'; }).join("") + "</tr>";
    var body = cols.slice(1).map(function (k) { return "<tr><td>" + nomes[k] + "</td>" + ex.map(function (e, i) { return '<td class="n"><input class="n" style="width:130px" id="ex_' + i + "_" + k + '" data-k="financeiro.exercicios.' + i + "." + k + '" data-t="num" value="' + esc(e[k] == null ? "" : String(e[k]).replace(".", ",")) + '"></td>'; }).join("") + "</tr>"; }).join("");
    var anoRow = "<tr><td>Exercício (ano)</td>" + ex.map(function (e, i) { return '<td class="n"><input class="n" style="width:130px" id="ex_' + i + '_ano" data-k="financeiro.exercicios.' + i + '.ano" data-t="num" value="' + esc(e.ano || "") + '"></td>'; }).join("") + "</tr>";
    var ind = ex.map(function (e) { return M.indicadores(e); });
    var s = S.simAtual, ultimo = ind[ind.length - 1], parcAno = s ? s.parcelaPosCarencia * 12 : null;
    var servExist = (num(c.cliente.servico_divida_mes) || 0) * 12;
    var dscr = ultimo && ultimo.ebitda != null && parcAno ? ultimo.ebitda / (parcAno + servExist) : null;
    var dlPos = ultimo && ultimo.ebitda ? (ultimo.dl + (s ? s.P : 0)) / ultimo.ebitda : null;
    var crit = S.base.criterios;
    var indRows = [["Liquidez corrente", "lc", X], ["Liquidez geral", "lg", X], ["Solvência geral", "sg", X], ["Endividamento (passivo / ativo)", "endiv", function (v) { return v == null ? "—" : P(v * 100, 1); }], ["EBITDA", "ebitda", R], ["Margem EBITDA", "margem", function (v) { return v == null ? "—" : P(v * 100, 1); }], ["Dívida bancária líquida", "dl", R], ["Dívida líquida / EBITDA", "dl_ebitda", X], ["EBITDA / despesas financeiras", "cobertura_juros", X]];
    var tInd = indRows.map(function (r) { return "<tr><td>" + r[0] + "</td>" + ind.map(function (x) { return '<td class="n num">' + (x ? r[2](x[r[1]]) : "—") + "</td>"; }).join("") + "</tr>"; }).join("");
    return '<div class="card"><div class="card-h"><h2>Demonstrações e indicadores</h2><div class="row"><button class="sm" data-act="ex-add">Adicionar exercício</button></div></div>' +
      (ex.length ? '<div class="tw"><table><thead>' + head + "</thead><tbody>" + anoRow + body + '<tr class="cat"><td colspan="' + (ex.length + 1) + '">Indicadores</td></tr>' + tInd + "</tbody></table></div>" : '<p class="muted small">Sem exercícios. Envie o balanço e a DRE no kit (item 14) para preencher, ou adicione à mão.</p>') +
      '<div class="kpis" style="margin-top:14px">' + kpi("DSCR com a nova parcela", X(dscr), ultimo ? "EBITDA último exercício ÷ (parcela anual nova + dívidas atuais)" : "precisa do EBITDA", dscr != null && dscr >= crit[0].min) +
      kpi("Dívida líquida / EBITDA após a operação", X(dlPos), "parâmetro S&S ≤ " + X(crit[2].max).replace("x", "") + "x") + kpi("Liquidez corrente", ultimo ? X(ultimo.lc) : "—", "parâmetro S&S ≥ 1,00") + "</div>" +
      '<p class="tiny" style="margin-top:8px">' + esc(crit[0].ref) + " Os demais limites são parâmetros S&S, sem número público; a decisão é do agente.</p></div>";
  }

  /* ---------- ROI: formulário do modo internalização ---------- */
  function formInternalizacao(c, Rr) {
    var filant = c.cliente.natureza === "filantropica";
    return '<div class="card"><div class="card-h"><h3>Serviço hoje (terceirizado)</h3><span class="tiny">Base realizada do cliente: DRE do serviço, últimos 6 a 12 meses.</span></div><div class="form">' +
      fi("roi.rec_mes", "Receita líquida do serviço (R$/mês)", Rr.rec_mes, "num", "Receita bruta menos glosas, média mensal", "", "gold") + fi("roi.volume_mes", "Exames por mês (informativo)", Rr.volume_mes, "num", "", "", "gold") +
      fi("roi.rep_atual", "Repasse ao terceiro hoje (% da receita)", Rr.rep_atual, "num", "Tudo o que vai à empresa terceirizada: médicos, material, aluguel do equipamento", "", "gold") + fi("roi.cv_atual", "Outros custos variáveis hoje (% da receita)", Rr.cv_atual, "num", "Mat/Med pago pelo cliente", "", "gold") +
      fi("roi.fixos_atuais", "Custos fixos que o cliente já paga (R$/mês)", Rr.fixos_atuais, "num", "Equipe, espaço, rateio: iguais nos dois modelos, não mudam o ganho", "", "gold") +
      "</div></div>" +
      '<div class="card"><div class="card-h"><h3>Serviço próprio</h3></div><div class="form">' +
      fi("roi.rep_proprio", "Repasse médico próprio (% da receita)", Rr.rep_proprio, "num", "Laudos: equipe própria, PJ ou telerradiologia", "", "warn") + fi("roi.cv_proprio", "Custos variáveis próprios (% da receita)", Rr.cv_proprio, "num", "Mat/Med e insumos que passam ao cliente", "", "warn") +
      fi("roi.fixos_novos", "Custos fixos novos (R$/mês)", Rr.fixos_novos, "num", "RIS/PACS, equipe adicional, contratos; manutenção entra à parte", "", "warn") +
      fi("roi.manut", "Manutenção pós-garantia (% do equipamento/ano)", Rr.manut, "num", "Padrão 8", "", "warn") + fi("roi.garantia", "Garantia (meses)", Rr.garantia, "num", "Padrão 12", "", "warn") +
      fi("roi.transicao", "Meses de transição (ainda terceirizado)", Rr.transicao, "num", "Instalação e sobreposição; padrão 3", "", "warn") +
      fi("roi.volume_var", "Variação de volume ao internalizar (%)", Rr.volume_var, "num", "0 = mesmo volume", "", "warn") + fi("roi.cresc_aa", "Crescimento anual a partir do ano 2 (%)", Rr.cresc_aa, "num", "", "", "warn") + fi("roi.reajuste_aa", "Reajuste anual de preços e custos (%)", Rr.reajuste_aa, "num", "0 = valores constantes", "", "warn") +
      fi("roi.outros_capex", "Outros investimentos (R$)", Rr.outros_capex, "num", "Implantação de sistemas, adequação de sala", "", "gold") +
      (filant ? "" : fs("roi.regime", "Regime tributário", Rr.regime || c.cliente.regime, [["presumido", "Lucro Presumido"], ["simples", "Simples Nacional"], ["real", "Lucro Real"]])) +
      fi("roi.desconto", "Taxa de desconto (% a.a.)", Rr.desconto, "num", "Padrão: CDI " + P(S.base.macro.cdi.v), "", "info") + fi("roi.horizonte", "Horizonte (anos)", Rr.horizonte, "num", "Vida útil fiscal: 10 anos", "", "info") +
      '</div><p class="tiny" style="margin-top:10px">Ganho = EBITDA próprio − EBITDA atual sobre a mesma receita. Lucro Presumido e Simples tributam a receita, que não muda: imposto incremental zero. Lucro Real: 34% sobre o EBIT incremental. ' + (filant ? "Filantrópica: imunidade de IR/CSLL e PIS/COFINS (CEBAS); ISS conforme o município." : "") + "</p></div>";
  }

  /* ---------- Cliente: dívidas existentes e capacidade de pagamento da entidade ---------- */
  function dividasBloco(c) {
    var fin = c.financeiro || (c.financeiro = {}), div = fin.dividas || [], ev = fin.evento || {}, en = S.entAtual, ult = (fin.exercicios || [])[(fin.exercicios || []).length - 1];
    var rows = div.map(function (d, i) {
      return "<tr><td>" + '<input id="dv_' + i + '_banco" data-k="financeiro.dividas.' + i + '.banco" value="' + esc(d.banco || "") + '" style="width:150px">' + "</td><td>" + '<input id="dv_' + i + '_mod" data-k="financeiro.dividas.' + i + '.mod" value="' + esc(d.mod || "") + '" style="width:130px">' + '</td><td class="n"><input class="n" id="dv_' + i + '_parcela" data-k="financeiro.dividas.' + i + '.parcela" data-t="num" value="' + esc(d.parcela == null ? "" : String(d.parcela).replace(".", ",")) + '" style="width:120px"></td><td><input type="month" id="dv_' + i + '_fim" data-k="financeiro.dividas.' + i + '.fim" value="' + esc(d.fim || "") + '" style="width:140px"></td><td class="n"><input class="n" id="dv_' + i + '_saldo" data-k="financeiro.dividas.' + i + '.saldo" data-t="num" value="' + esc(d.saldo == null ? "" : String(d.saldo).replace(".", ",")) + '" style="width:120px"></td><td><input type="checkbox" id="dv_' + i + '_ev" data-k="financeiro.dividas.' + i + '.liquida_evento" data-t="bool"' + (d.liquida_evento !== false ? " checked" : "") + '></td><td><button class="sm ghost danger" data-act="div-del" data-i="' + i + '">×</button></td></tr>';
    }).join("");
    var totP = div.reduce(function (s, d) { return s + (num(d.parcela) || 0); }, 0), totS = div.reduce(function (s, d) { return s + (num(d.saldo) || 0); }, 0);
    var h = '<div class="card"><div class="card-h"><h2>Dívidas existentes e capacidade de pagamento</h2><div class="row"><button class="sm" data-act="div-add">Adicionar dívida</button></div></div>' +
      '<p class="small muted">O agente olha a entidade, não só o equipamento: EBITDA do tomador contra o serviço da dívida que já existe mais a parcela nova, ano a ano. Um evento de desalavancagem (venda de ativo, TDC, aporte) liquida as dívidas marcadas a partir do mês informado.</p>' +
      (div.length ? '<div class="tw"><table><thead><tr><th>Instituição</th><th>Modalidade</th><th class="n">Parcela (R$/mês)</th><th>Última parcela</th><th class="n">Saldo (R$)</th><th>Evento liquida</th><th></th></tr></thead><tbody>' + rows + '<tr class="tot"><td>Total</td><td></td><td class="n num">' + R(totP) + '</td><td></td><td class="n num">' + R(totS) + "</td><td></td><td></td></tr></tbody></table></div>" : '<p class="muted small">Sem dívidas cadastradas. Com a tabela vazia, a cobertura considera só a parcela nova.</p>') +
      '<div class="form" style="margin-top:12px">' + fi("financeiro.ebitda_anual", "EBITDA anual do tomador (R$)", fin.ebitda_anual, "num", ult && ult.ebit != null ? "Vazio = EBIT + depreciação do exercício " + (ult.ano || "") + " (" + R((num(ult.ebit) || 0) + (num(ult.depreciacao) || 0)) + ")" : "Vazio = EBIT + depreciação do último exercício", "", "gold") +
      fi("financeiro.ebitda_cresc", "Crescimento do EBITDA (% a.a.)", fin.ebitda_cresc, "num", "0 = constante", "", "warn") + fi("financeiro.caixa", "Caixa (R$)", fin.caixa, "num", "Vazio = último exercício", "", "gold") + fi("financeiro.divida_total", "Dívida bancária total (R$)", fin.divida_total, "num", "Vazio = empréstimos CP + LP do último exercício, ou soma dos saldos", "", "gold") +
      fi("financeiro.evento.nome", "Evento de desalavancagem", ev.nome, "", "Ex.: venda de imóvel, TDC, aporte de associados") + fi("financeiro.evento.mes", "Mês do evento", ev.mes, "month") + "</div>";
    if (en) {
      var l1 = en.linhas[0], crit = S.base.criterios[0].min;
      h += '<div class="kpis" style="margin-top:14px">' + kpi("DSCR " + l1.ano + " sem o projeto", X(l1.dscrSemProj), "EBITDA ÷ dívidas atuais", l1.dscrSemProj != null && l1.dscrSemProj >= crit) + kpi("DSCR " + l1.ano + " com o projeto", X(l1.dscrSem), "sem o evento", l1.dscrSem != null && l1.dscrSem >= crit) + (ev.mes ? kpi("DSCR " + l1.ano + " com o evento", X(l1.dscrCom), esc(ev.nome || "evento") + " em " + esc(ev.mes), l1.dscrCom != null && l1.dscrCom >= crit) : "") + kpi("Dívida líquida / EBITDA", X(en.dlEbitda), "com a operação " + X(en.dlEbitdaProj)) + (ev.mes ? kpi("Dívida líquida após o evento", Rm(en.dlAposEvento), "saldos marcados liquidados") : "") + "</div>" +
        '<div class="tw" style="margin-top:12px"><table><thead><tr><th>Ano</th><th class="n">EBITDA tomador</th><th class="n">+ projeto</th><th class="n">Serviço atual</th>' + (ev.mes ? '<th class="n">Atual após evento</th>' : "") + '<th class="n">Parcela nova</th><th class="n">DSCR sem proj.</th><th class="n">DSCR com proj.</th>' + (ev.mes ? '<th class="n">DSCR com evento</th>' : "") + "</tr></thead><tbody>" +
        en.linhas.map(function (l) { return "<tr><td>" + l.ano + '</td><td class="n num">' + R(l.ebitda) + '</td><td class="n num">' + R(l.inc) + '</td><td class="n num">' + R(l.servAtual) + "</td>" + (ev.mes ? '<td class="n num">' + R(l.servEv) + "</td>" : "") + '<td class="n num">' + R(l.servNovo) + '</td><td class="n num' + (l.dscrSemProj != null && l.dscrSemProj < crit ? " neg" : "") + '">' + X(l.dscrSemProj) + '</td><td class="n num' + (l.dscrSem != null && l.dscrSem < crit ? " neg" : "") + '">' + X(l.dscrSem) + "</td>" + (ev.mes ? '<td class="n num">' + X(l.dscrCom) + "</td>" : "") + "</tr>"; }).join("") + "</tbody></table></div>" +
        '<p class="tiny" style="margin-top:8px">"+ projeto" = EBITDA do ROI (novo serviço) ou ganho incremental (internalização), líquido de IR, quando o ROI está preenchido. Referência pública de DSCR ≥ 1,30 (BNDES Project Finance); no FINAME indireto o critério é do agente.</p>';
    } else h += '<p class="tiny" style="margin-top:8px">Informe o EBITDA anual ou um exercício com EBIT e depreciação para ver a cobertura ano a ano.</p>';
    return h + "</div>";
  }

  /* ---------- kit: item ---------- */
  function kitItem(c, it) {
    var k = c.kit[it.id] || {}, st = k.status || (it.auto ? autoStatus(c, it) : "pendente"), ia = S.ia[it.id];
    var opts = Object.keys(STATUS_KIT).map(function (s) { return '<option value="' + s + '"' + (s === st ? " selected" : "") + ">" + STATUS_KIT[s] + "</option>"; }).join("");
    var stCls = { recebido: "good", conferido: "good", vencido: "bad", pendente: "warn", solicitado: "info", na: "" }[st];
    var up = it.ia ? (S.sample ? '<label class="drop" for="up_' + it.id + '" data-drop="' + it.id + '">' + (ia && ia.estado === "lendo" ? "Lendo… " + esc(ia.msg || "") : "Enviar arquivo para leitura") + '<input type="file" id="up_' + it.id + '" data-up="' + it.id + '" accept="application/pdf,image/png,image/jpeg,image/webp" hidden></label>' : "") : "";
    var ex = "";
    if (ia && ia.estado === "erro") ex = '<div class="notice bad">' + esc(ia.msg) + "</div>";
    if (k.extr) ex += extrBloco(c, it, k);
    var ob = /^Obrigat/.test(it.ob);
    return '<div class="kit-item"><div class="kn">' + esc(it.n) + '</div><div class="stack" style="gap:3px"><div class="kt">' + esc(it.nome) + (it.novo ? ' <span class="pill info">novo</span>' : "") + '</div><div class="km">' + (ob ? "<b>" + esc(it.ob) + "</b>" : esc(it.ob)) + " · " + esc(it.resp) + " · " + esc(it.onde) + " · " + esc(it.fmt) + " · validade: " + esc(it.val) + (it.obs ? " · " + esc(it.obs) : "") + "</div>" + (it.regra_fonte ? '<div class="tiny">Regra: ' + esc(it.regra_fonte) + "</div>" : "") +
      (k.arquivo ? '<div class="tiny">Arquivo lido: ' + esc(k.arquivo) + " em " + dataBR(k.lido_em) + "</div>" : "") + ex + "</div>" +
      '<div class="ks"><select id="ks_' + it.id + '" data-kit="' + it.id + '" aria-label="Status do item ' + esc(it.n) + '">' + opts + '</select><span class="pill ' + stCls + '">' + STATUS_KIT[st] + "</span>" + up + "</div></div>";
  }
  function extrBloco(c, it, k) {
    var e = k.extr, ch = k.check || { msgs: [] }, campos = Object.keys(e).filter(function (x) { return x[0] !== "_" && e[x] != null && e[x] !== "" && typeof e[x] !== "object"; });
    var dl = campos.map(function (x) { return "<dt>" + esc(x.replace(/_/g, " ")) + "</dt><dd>" + esc(e[x]) + (e._paginas && e._paginas[x] ? ' <span class="tiny">p. ' + esc(e._paginas[x]) + "</span>" : "") + "</dd>"; }).join("");
    if (e.exercicios) dl += "<dt>exercícios</dt><dd>" + e.exercicios.map(function (x) { return esc(x.ano) + " (receita " + Rm(num(x.receita_bruta)) + ")"; }).join(", ") + "</dd>";
    if (e.dividas) dl += "<dt>dívidas</dt><dd>" + e.dividas.length + " contratos</dd>";
    if (e.socios) dl += "<dt>sócios</dt><dd>" + e.socios.map(function (s) { return esc(s.nome) + (s.participacao_pct != null ? " (" + esc(s.participacao_pct) + "%)" : ""); }).join("; ") + "</dd>";
    if (e.itens) dl += "<dt>itens</dt><dd>" + e.itens.map(function (s) { return esc(s.descricao || s.modelo) + (s.codigo_finame ? " · CFI " + esc(s.codigo_finame) : ""); }).join("; ") + "</dd>";
    var msgs = ch.msgs.map(function (m) { return '<li class="' + (m[0] === "ok" ? "pos" : m[0] === "bad" ? "neg" : "") + '">' + esc(m[1]) + "</li>"; }).join("");
    var aplica = APLICA[it.ia] ? '<button class="sm" data-act="aplicar" data-item="' + it.id + '">Levar ao cadastro</button>' : "";
    return '<div class="ex"><div class="row between"><b class="small">Leitura ' + (ch.ok ? '<span class="pill good">conferido</span>' : ch.ok === false ? '<span class="pill bad">com pendência</span>' : "") + "</b>" + aplica + "</div>" + (msgs ? '<ul class="lst small">' + msgs + "</ul>" : "") + "<details><summary>Campos lidos</summary><dl>" + dl + "</dl></details></div>";
  }

  /* ---------- leitura por IA ---------- */
  var ESQ = {
    cartao_cnpj: { d: "Cartão CNPJ (Comprovante de Inscrição e de Situação Cadastral da Receita Federal)", s: { razao_social: "", nome_fantasia: "", cnpj: "00.000.000/0000-00", data_abertura: "AAAA-MM-DD", situacao_cadastral: "ATIVA|SUSPENSA|INAPTA|BAIXADA|NULA", natureza_juridica: "", cnae_principal: "0000-0/00", cnae_principal_descricao: "", porte_rfb: "ME|EPP|DEMAIS", logradouro: "", numero: "", complemento: "", bairro: "", municipio: "", uf: "", cep: "", email: "", telefone: "", data_emissao: "AAAA-MM-DD" } },
    certidao: { d: "Certidão de regularidade (federal RFB/PGFN, CRF do FGTS, trabalhista CNDT, estadual ou municipal)", s: { orgao_emissor: "", tipo: "federal|fgts|trabalhista|estadual|municipal|outra", titular: "", cnpj: "", situacao: "negativa|positiva_com_efeito_de_negativa|positiva", data_emissao: "AAAA-MM-DD", valida_ate: "AAAA-MM-DD", codigo_controle: "" } },
    contrato_social: { d: "Contrato social ou estatuto e alterações", s: { razao_social: "", cnpj: "", data_ultima_alteracao: "AAAA-MM-DD", capital_social: 0, socios: [{ nome: "", participacao_pct: 0, administrador: true }], forma_de_administracao: "", objeto_social_resumo: "", sede: "" } },
    comprovante_endereco: { d: "Comprovante de endereço da sede", s: { titular: "", endereco: "", data_documento: "AAAA-MM-DD", tipo: "" } },
    balanco_dre: { d: "Balanço patrimonial e DRE (demonstrações contábeis) ou balancete", s: { razao_social: "", cnpj: "", assinado_por_contador: true, contador_crc: "", unidade_dos_valores: "reais|milhares", exercicios: [{ ano: 2025, data_base: "AAAA-MM-DD", receita_bruta: 0, receita_liquida: 0, ebit: 0, depreciacao: 0, despesas_financeiras: 0, lucro_liquido: 0, ativo_circulante: 0, caixa: 0, realizavel_lp: 0, ativo_total: 0, passivo_circulante: 0, emprestimos_cp: 0, passivo_nao_circulante: 0, emprestimos_lp: 0, patrimonio_liquido: 0 }], observacoes: "" } },
    faturamento: { d: "Relação ou declaração de faturamento mensal", s: { razao_social: "", cnpj: "", meses: [{ mes: "AAAA-MM", valor: 0 }], total_12_meses: 0, assinado_por_contador: true } },
    endividamento: { d: "Demonstrativo de endividamento bancário", s: { data_base: "AAAA-MM-DD", dividas: [{ instituicao: "", modalidade: "", saldo: 0, parcela_mensal: 0, vencimento_final: "AAAA-MM" }], total_saldo: 0, total_parcela_mensal: 0 } },
    proforma: { d: "Proposta comercial ou proforma do fornecedor do equipamento", s: { fornecedor: "", cnpj_fornecedor: "", data: "AAAA-MM-DD", validade: "AAAA-MM-DD", itens: [{ descricao: "", modelo: "", quantidade: 1, valor_total: 0, codigo_finame: "", ncm: "" }], valor_total: 0, condicoes_pagamento: "", prazo_entrega: "" } },
    cfi: { d: "Comprovação do código FINAME (CFI) — consulta de produto credenciado no BNDES", s: { codigo_finame: "", fabricante: "", cnpj_fabricante: "", produto_modelo: "", situacao: "", classificacao: "F|FCC", validade_credenciamento: "AAAA-MM-DD", data_consulta: "AAAA-MM-DD" } }
  };
  function carregar(src) { return new Promise(function (ok, fail) { if (carregar[src]) return ok(); var s = document.createElement("script"); s.src = src; s.onload = function () { carregar[src] = 1; ok(); }; s.onerror = function () { fail(new Error("Não carregou " + src)); }; document.head.appendChild(s); }); }
  var LIB = { pdf: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js", pdfw: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js",
    jspdf: "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js", at: "https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js",
    xl: "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js", docx: "https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js" };
  function libsPDFjs() { return carregar(LIB.pdfw).then(function () { return carregar(LIB.pdf); }).then(function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = LIB.pdfw; return window.pdfjsLib; }); }

  function lerArquivo(itemId, file) {
    var it = S.base.kit.filter(function (k) { return k.id === itemId; })[0], esq = ESQ[it.ia], c = caso();
    if (!S.sample) { toast("Leitura por IA indisponível nesta visualização."); return; }
    S.ia[itemId] = { estado: "lendo", msg: "preparando o arquivo" }; renderTudo();
    var limites = null;
    S.sample.limits().then(function (l) { limites = l; }).catch(function () {}).then(function () {
      if (/pdf$/i.test(file.type) || /\.pdf$/i.test(file.name)) return paginasPDF(file, limites);
      return { texto: "", imagens: [file] };
    }).then(function (doc) {
      S.ia[itemId].msg = "lendo com a IA"; renderTudo();
      var prompt = "Você lê documentos de uma empresa de saúde para uma operação de financiamento FINAME/BNDES. Documento esperado neste item do kit: " + esq.d + " (item '" + it.nome + "').\n" +
        "Extraia SOMENTE o que estiver escrito no documento; não deduza nem invente. Responda com um único objeto JSON com exatamente estas chaves:\n" + JSON.stringify(esq.s) +
        "\nRegras: null quando o campo não aparecer; datas em AAAA-MM-DD; valores monetários como número em reais (ponto decimal, sem 'R$'); se o documento informar valores em milhares, converta para reais e diga em 'observacoes' quando a chave existir. Para valores negativos use número negativo." +
        "\nInclua também: \"_paginas\" (objeto com o número da página em que cada campo simples foi lido), \"_confere\" (true se o documento é mesmo do tipo esperado) e \"_tipo_detectado\" (o tipo de documento que você vê)." +
        (doc.texto ? "\n\nTexto do documento, com as páginas marcadas:\n" + doc.texto : "\n\nAs imagens anexas são as páginas do documento, na ordem.");
      var opt = { modelTier: "default" }; if (doc.imagens && doc.imagens.length) opt.images = doc.imagens;
      return S.sample.json(prompt, opt);
    }).then(function (dados) {
      if (!dados || typeof dados !== "object") throw { code: "invalid_json" };
      var k = c.kit[itemId] || (c.kit[itemId] = {});
      k.extr = dados; k.arquivo = file.name; k.lido_em = hoje(); k.check = conferir(c, it, dados);
      if (!k.status || k.status === "pendente" || k.status === "solicitado") k.status = k.check.ok === false ? "recebido" : "conferido";
      if (k.check.vencido) k.status = "vencido";
      delete S.ia[itemId]; salvar(c); renderTudo(); toast("Documento lido: confira os campos e as checagens.");
    }).catch(function (e) {
      var code = e && e.code, msg = { not_granted: "A leitura por IA não foi autorizada nesta página.", rate_limited: "Muitas leituras seguidas; espere um pouco e envie de novo.", prompt_too_large: "Documento grande demais para uma leitura; envie só as páginas relevantes.", images_unavailable: "Esta visualização não envia imagens; envie o PDF com texto.", image_rejected: "Formato de imagem não aceito; use PDF, JPG ou PNG.", invalid_json: "A leitura não voltou no formato esperado; envie de novo.", refused: "A IA recusou o documento.", session_expired: "Sessão expirada; recarregue a página." }[code] || ("Não foi possível ler o arquivo" + (e && e.message ? ": " + e.message : "") + ".");
      S.ia[itemId] = { estado: "erro", msg: msg }; renderTudo();
    });
  }
  function paginasPDF(file, limites) {
    return file.arrayBuffer().then(function (buf) { return libsPDFjs().then(function (pdfjs) { return pdfjs.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise; }); })
      .then(function (pdf) {
        var n = pdf.numPages, textos = [], pr = Promise.resolve();
        for (var i = 1; i <= Math.min(n, 60); i++) (function (i) { pr = pr.then(function () { return pdf.getPage(i).then(function (pg) { return pg.getTextContent().then(function (tc) { textos.push("[p." + i + "] " + tc.items.map(function (x) { return x.str; }).join(" ").replace(/\s+/g, " ")); }); }); }); })(i);
        return pr.then(function () {
          var texto = textos.join("\n"), uteis = texto.replace(/\[p\.\d+\]/g, "").replace(/\s/g, "").length;
          var max = limites && limites.maxPromptBytes ? limites.maxPromptBytes - 6000 : 200000;
          if (uteis > 80 * Math.min(n, 60)) { if (texto.length > max) texto = texto.slice(0, max) + "\n[texto cortado por tamanho]"; return { texto: texto }; }
          if (!limites || !limites.images) return { texto: texto };
          var qtd = Math.min(n, limites.images.maxCount || 4), imgs = [], p2 = Promise.resolve();
          for (var j = 1; j <= qtd; j++) (function (j) { p2 = p2.then(function () { return pdf.getPage(j).then(function (pg) { var vp = pg.getViewport({ scale: 1.6 }), cv = document.createElement("canvas"); cv.width = vp.width; cv.height = vp.height; return pg.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise.then(function () { return new Promise(function (ok) { cv.toBlob(function (b) { imgs.push(b); ok(); }, "image/jpeg", 0.85); }); }); }); }); })(j);
          return p2.then(function () { return { texto: "", imagens: imgs }; });
        });
      });
  }
  function soDig(s) { return String(s || "").replace(/\D/g, ""); }
  function conferir(c, it, e) {
    var m = [], ok = true, venc = false, h = hoje(), cnpjC = soDig(c.cliente.cnpj);
    if (e._confere === false) { ok = false; m.push(["bad", "O documento não parece ser do tipo esperado (lido como: " + (e._tipo_detectado || "?") + ")"]); }
    var cnpj = soDig(e.cnpj);
    if (cnpj && cnpjC && cnpj.slice(0, 8) !== cnpjC.slice(0, 8)) { ok = false; m.push(["bad", "CNPJ do documento (" + e.cnpj + ") difere do caso (" + c.cliente.cnpj + ")"]); }
    else if (cnpj && cnpjC) m.push(["ok", "CNPJ confere com o caso"]);
    if (it.ia === "cartao_cnpj") {
      if (e.situacao_cadastral && !/ATIVA/i.test(e.situacao_cadastral)) { ok = false; m.push(["bad", "Situação cadastral " + e.situacao_cadastral + ": bloqueia a operação"]); } else if (e.situacao_cadastral) m.push(["ok", "Situação cadastral ATIVA"]);
      idade(e.data_emissao, it.idade_max);
    }
    if (it.ia === "comprovante_endereco") idade(e.data_documento, it.idade_max);
    if (it.ia === "certidao") {
      if (/^positiva$/i.test(e.situacao || "")) { ok = false; m.push(["bad", "Certidão POSITIVA: bloqueia a operação até regularizar"]); }
      else if (/efeito/i.test(e.situacao || "")) m.push(["ok", "Positiva com efeito de negativa: aceita"]);
      else if (e.situacao) m.push(["ok", "Certidão negativa"]);
      var fim = e.valida_ate;
      if (!fim && e.data_emissao && it.dias) { var d = new Date(e.data_emissao + "T12:00:00"); d.setDate(d.getDate() + it.dias); fim = d.toISOString().slice(0, 10); m.push(["warn", "Validade não lida; estimada pela regra de " + it.dias + " dias"]); }
      if (fim) { var r = dias(h, fim); if (r < 0) { ok = false; venc = true; m.push(["bad", "Vencida em " + dataBR(fim)]); } else m.push([r < 15 ? "warn" : "ok", "Válida até " + dataBR(fim) + " (" + r + " dias)" + (r < 15 ? ": renovar antes do protocolo" : "")]); }
    }
    if (it.ia === "balanco_dre") {
      if (e.assinado_por_contador === false) { ok = false; m.push(["bad", "Sem assinatura do contador"]); } else if (e.assinado_por_contador) m.push(["ok", "Assinado pelo contador" + (e.contador_crc ? " (CRC " + e.contador_crc + ")" : "")]);
      var anos = (e.exercicios || []).map(function (x) { return x.ano; }); m.push([anos.length >= 2 ? "ok" : "warn", anos.length + " exercício(s): " + anos.join(", ") + (anos.length < 2 ? "; o kit pede 2 a 3" : "")]);
    }
    if (it.ia === "proforma") {
      if (e.validade) { var rv = dias(h, e.validade); m.push([rv < 0 ? "bad" : "ok", "Proposta válida até " + dataBR(e.validade)]); if (rv < 0) ok = false; }
      var cfiP = (e.itens || []).map(function (x) { return x.codigo_finame; }).filter(Boolean)[0];
      if (cfiP && c.operacao.equipamento.cfi && soDig(cfiP) !== soDig(c.operacao.equipamento.cfi)) { ok = false; m.push(["bad", "CFI na proposta (" + cfiP + ") difere do cadastro (" + c.operacao.equipamento.cfi + ")"]); }
      if (num(e.valor_total) && num(c.operacao.valor_equip) && Math.abs(num(e.valor_total) - num(c.operacao.valor_equip)) > 1) m.push(["warn", "Valor da proposta (" + R(num(e.valor_total)) + ") difere do cadastro (" + R(num(c.operacao.valor_equip)) + ")"]);
    }
    if (it.ia === "cfi") {
      if (e.codigo_finame && c.operacao.equipamento.cfi && soDig(e.codigo_finame) !== soDig(c.operacao.equipamento.cfi)) { ok = false; m.push(["bad", "Código lido (" + e.codigo_finame + ") difere do cadastro (" + c.operacao.equipamento.cfi + ")"]); }
      else if (e.codigo_finame) m.push(["ok", "Código FINAME " + e.codigo_finame + " lido"]);
      if (e.situacao && !/credenc|ativ|vigent|v[aá]lid/i.test(e.situacao)) { ok = false; m.push(["bad", "Situação do credenciamento: " + e.situacao]); }
      if (e.validade_credenciamento && dias(h, e.validade_credenciamento) < 0) { ok = false; m.push(["bad", "Credenciamento vencido em " + dataBR(e.validade_credenciamento)]); }
    }
    function idade(data, max) { if (!data || !max) return; var a = dias(data, h); if (a > max) { ok = false; venc = true; m.push(["bad", "Emitido há " + a + " dias; o kit pede no máximo " + max]); } else m.push(["ok", "Emitido há " + a + " dias (limite " + max + ")"]); }
    return { ok: ok, msgs: m, vencido: venc };
  }
  var APLICA = {
    cartao_cnpj: function (c, e) { var cl = c.cliente; put(cl, "razao", e.razao_social); put(cl, "fantasia", e.nome_fantasia); put(cl, "cnpj", e.cnpj); put(cl, "abertura", e.data_abertura); put(cl, "cnae", [e.cnae_principal, e.cnae_principal_descricao].filter(Boolean).join(" ")); put(cl, "uf", e.uf); put(cl, "municipio", e.municipio); put(cl, "cep", e.cep); put(cl, "email", e.email); put(cl, "telefone", e.telefone); put(cl, "endereco", [e.logradouro, e.numero, e.complemento, e.bairro].filter(Boolean).join(", ")); if (/associa|funda/i.test(e.natureza_juridica || "")) cl.natureza = "filantropica"; if (!c.nome || c.nome === "Novo caso") c.nome = (e.nome_fantasia || e.razao_social || "Caso") + ""; },
    contrato_social: function (c, e) { put(c.cliente, "razao", e.razao_social); put(c.cliente, "cnpj", e.cnpj); if (e.socios) c.cliente.socios = e.socios.map(function (s) { return { nome: s.nome, participacao_pct: s.participacao_pct, administrador: s.administrador }; }); },
    balanco_dre: function (c, e) { var mult = /milhar/i.test(e.unidade_dos_valores || "") ? 1000 : 1; var ex = (e.exercicios || []).map(function (x) { var o = {}; Object.keys(x).forEach(function (k) { o[k] = k === "ano" || k === "data_base" ? x[k] : (num(x[k]) == null ? null : num(x[k]) * mult); }); return o; }).sort(function (a, b) { return a.ano - b.ano; }); c.financeiro.exercicios = ex; var u = ex[ex.length - 1]; if (u && num(u.receita_bruta)) c.cliente.rob = num(u.receita_bruta); },
    faturamento: function (c, e) { if (num(e.total_12_meses)) c.cliente.rob = num(e.total_12_meses); },
    endividamento: function (c, e) { if (num(e.total_saldo) != null) c.cliente.endividamento = num(e.total_saldo); if (num(e.total_parcela_mensal) != null) c.cliente.servico_divida_mes = num(e.total_parcela_mensal); },
    proforma: function (c, e) { var op = c.operacao, i0 = (e.itens || [])[0] || {}; put(op, "fornecedor", e.fornecedor); if (num(e.valor_total)) { op.valor_equip = num(e.valor_total); if (!num(op.valor_financiar) || op.valor_financiar === op.valor_equip) op.valor_financiar = num(e.valor_total); } put(op.equipamento, "modelo", i0.modelo || i0.descricao); put(op.equipamento, "descricao", i0.descricao); put(op.equipamento, "cfi", i0.codigo_finame); put(op.equipamento, "ncm", i0.ncm); },
    cfi: function (c, e) { var eq = c.operacao.equipamento; put(eq, "cfi", e.codigo_finame); put(eq, "fabricante", e.fabricante); put(eq, "modelo", e.produto_modelo); eq.origem = "nacional"; }
  };
  function put(o, k, v) { if (v != null && v !== "") o[k] = v; }

  /* ---------- gráficos (SVG) ---------- */
  function svgEl(w, h, inner, aria) { return '<svg viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="' + esc(aria) + '">' + inner + "</svg>"; }
  function chartLinhas(av) {
    var el = $("#chLinhas"); if (!el) return;
    var items = av.ranking.slice(0, 10), W = 1000, lab = 330, rowH = 30, H = items.length * rowH + 34, x0 = lab, x1 = W - 60;
    var vals = []; items.forEach(function (x) { vals.push(x.sim.faixa.min, x.sim.faixa.max, x.sim.custoTotal); }); if (av.benchmark) vals.push(av.benchmark.v);
    var lo = Math.floor(Math.min.apply(null, vals) - 1), hi = Math.ceil(Math.max.apply(null, vals) + 1), sx = function (v) { return x0 + (v - lo) / (hi - lo) * (x1 - x0); };
    var g = "", step = (hi - lo) > 12 ? 4 : 2;
    for (var t = Math.ceil(lo / step) * step; t <= hi; t += step) g += '<line x1="' + sx(t) + '" x2="' + sx(t) + '" y1="4" y2="' + (H - 22) + '" stroke="var(--line-2)"/><text x="' + sx(t) + '" y="' + (H - 6) + '" text-anchor="middle">' + t + "%</text>";
    items.forEach(function (x, i) {
      var y = 10 + i * rowH, f = x.sim.faixa, a = Math.min(f.min, x.sim.custoTotal), b = Math.max(f.max, x.sim.custoTotal);
      g += '<text x="' + (lab - 10) + '" y="' + (y + 13) + '" text-anchor="end" style="font-family:var(--font);fill:var(--fg)">' + esc(("#" + x.rank + " " + x.linha.nome.replace("BNDES Finame – ", "Finame ").replace("BK Aquisição e Comercialização ", "BK ")).slice(0, 46)) + "</text>";
      g += '<rect x="' + sx(a) + '" y="' + (y + 4) + '" width="' + Math.max(3, sx(b) - sx(a)) + '" height="12" rx="3" fill="var(--s2)" opacity=".45"/>';
      g += '<rect x="' + (sx(x.sim.custoTotal) - 1.5) + '" y="' + y + '" width="3" height="20" fill="var(--s1)"/><text x="' + (sx(b) + 6) + '" y="' + (y + 14) + '">' + P(x.sim.custoTotal, 1) + "</text>";
    });
    if (av.benchmark) g += '<line x1="' + sx(av.benchmark.v) + '" x2="' + sx(av.benchmark.v) + '" y1="2" y2="' + (H - 22) + '" stroke="var(--bad)" stroke-dasharray="4 3"/>';
    el.innerHTML = svgEl(W, H, g, "Custo total por linha elegível");
  }
  function chartSaldo(s) {
    var el = $("#chSaldo"); if (!el) return;
    var W = 760, H = 240, l = 64, r = 64, t = 10, b = 26, rows = s.rows, n = rows.length;
    var maxS = Math.max.apply(null, rows.map(function (x) { return x.saldoIni; })), maxP = Math.max.apply(null, rows.map(function (x) { return x.parcela; })) || 1;
    var sx = function (i) { return l + i / Math.max(1, n - 1) * (W - l - r); }, sy = function (v) { return t + (1 - v / maxS) * (H - t - b); }, sp = function (v) { return t + (1 - v / maxP) * (H - t - b); };
    var area = "M" + sx(0) + "," + sy(0) + rows.map(function (x, i) { return " L" + sx(i) + "," + sy(x.saldoIni); }).join("") + " L" + sx(n - 1) + "," + sy(0) + " Z";
    var lin = rows.map(function (x, i) { return (i ? " L" : "M") + sx(i) + "," + sp(x.parcela); }).join("");
    var g = "";
    [0, 0.25, 0.5, 0.75, 1].forEach(function (f) { var y = t + f * (H - t - b); g += '<line x1="' + l + '" x2="' + (W - r) + '" y1="' + y + '" y2="' + y + '" stroke="var(--line-2)"/><text x="' + (l - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + Rm(maxS * (1 - f)).replace("R$ ", "") + '</text><text x="' + (W - r + 6) + '" y="' + (y + 4) + '">' + Rm(maxP * (1 - f)).replace("R$ ", "") + "</text>"; });
    for (var a = 12; a <= n; a += 12) g += '<text x="' + sx(a - 1) + '" y="' + (H - 6) + '" text-anchor="middle">a' + a / 12 + "</text>";
    g += '<path d="' + area + '" fill="var(--s1)" opacity=".16"/><path d="' + area.replace(/ L[\d.]+,[\d.]+ Z$/, "") + '" fill="none" stroke="var(--s1)" stroke-width="2"/><path d="' + lin + '" fill="none" stroke="var(--s2)" stroke-width="2"/>';
    el.innerHTML = svgEl(W, H, g, "Saldo devedor e parcelas ao longo do contrato");
  }
  function chartROI(ro) {
    var el = $("#chROI"); if (!el) return;
    var A = ro.anos, W = 760, H = 240, l = 70, r = 20, t = 12, b = 26, n = A.length;
    var vals = [0]; A.forEach(function (a) { vals.push(a.fca, a.acum); }); var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals); if (hi === lo) hi = lo + 1;
    var bw = (W - l - r) / n, sy = function (v) { return t + (hi - v) / (hi - lo) * (H - t - b); };
    var g = "";
    [0, 0.25, 0.5, 0.75, 1].forEach(function (f) { var v = hi - f * (hi - lo), y = sy(v); g += '<line x1="' + l + '" x2="' + (W - r) + '" y1="' + y + '" y2="' + y + '" stroke="var(--line-2)"/><text x="' + (l - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + Rm(v).replace("R$ ", "") + "</text>"; });
    g += '<line x1="' + l + '" x2="' + (W - r) + '" y1="' + sy(0) + '" y2="' + sy(0) + '" stroke="var(--fg-3)"/>';
    A.forEach(function (a, i) { var x = l + i * bw + bw * 0.2, y0 = sy(0), y = sy(a.fca); g += '<rect x="' + x + '" y="' + Math.min(y, y0) + '" width="' + bw * 0.6 + '" height="' + Math.max(1, Math.abs(y - y0)) + '" fill="var(--s1)" opacity=".75"/><text x="' + (x + bw * 0.3) + '" y="' + (H - 6) + '" text-anchor="middle">a' + a.ano + "</text>"; });
    g += '<path d="' + A.map(function (a, i) { return (i ? " L" : "M") + (l + i * bw + bw / 2) + "," + sy(a.acum); }).join("") + '" fill="none" stroke="var(--s2)" stroke-width="2.2"/>';
    A.forEach(function (a, i) { g += '<circle cx="' + (l + i * bw + bw / 2) + '" cy="' + sy(a.acum) + '" r="3" fill="var(--s2)"/>'; });
    el.innerHTML = svgEl(W, H, g, "Fluxo anual e acumulado do acionista");
  }

  /* ---------- modal ---------- */
  function modal(html) { $("#modalBox").innerHTML = html; $("#modal").hidden = false; var f = $("#modalBox input, #modalBox button"); if (f) f.focus(); }
  function fechar() { $("#modal").hidden = true; $("#modalBox").innerHTML = ""; }

  /* ---------- eventos ---------- */
  function onChange(ev) {
    var el = ev.target, c = caso();
    if (el.id === "selCaso") { S.atual = el.value; renderTudo(); return; }
    if (el.dataset.k && c) {
      var v = el.dataset.t === "bool" ? el.checked : el.dataset.t === "num" ? num(String(el.value).replace(/\./g, "").replace(",", ".")) : el.value;
      if (el.dataset.t === "num" && el.value === "") v = null;
      set(c, el.dataset.k, v);
      if (el.dataset.k === "cliente.regime" && c.roi) c.roi.regime = v;
      if (el.dataset.k === "roi.modalidade" && v) { ["exh", "h", "d", "cap_mes", "preco_sus", "laudo", "insumo", "manut", "garantia"].forEach(function (k) { delete c.roi[k]; }); }
      salvar(c); renderTudo(); return;
    }
    if (el.dataset.act === "catalogo" && c) {
      var it = catItem(el.value); c.operacao.catalogo_id = el.value;
      if (it) { c.operacao.equipamento = { modelo: it.modelo, fabricante: it.fabricante, cfi: it.cfi, ncm: it.ncm, origem: it.origem || (it.cfi ? "nacional" : "importado"), modalidade: it.modalidade, descricao: it.modelo }; if (num(it.preco)) { c.operacao.valor_equip = num(it.preco); c.operacao.valor_financiar = num(it.preco); } if (it.modalidade && c.roi) c.roi.modalidade = it.modalidade; }
      salvar(c); renderTudo(); return;
    }
    if (el.dataset.sim && c) {
      c.sim = c.sim || {};
      if (el.dataset.sim === "linha") { c.sim = { linha: el.value }; }
      else if (el.dataset.sim === "agente") { c.sim.override = c.sim.override || {}; c.sim.override[el.dataset.nome] = Number(el.value); }
      else c.sim[el.dataset.sim] = el.value;
      salvar(c); renderTudo(); return;
    }
    if (el.dataset.kit && c) { c.kit[el.dataset.kit] = c.kit[el.dataset.kit] || {}; c.kit[el.dataset.kit].status = el.value; salvar(c); renderTudo(); return; }
    if (el.dataset.up) { var f = el.files && el.files[0]; if (f) lerArquivo(el.dataset.up, f); return; }
    if (el.dataset.spread) {
      var p = el.dataset.spread.split("|"), L = S.base.linhas.filter(function (l) { return l.id === p[0]; })[0], vv = num(String(el.value).replace(",", "."));
      if (L && vv != null) { L.spreads[+p[1]][p[2]] = vv; salvarConfig("base", clone(S.base)); S.baseSalva = true; renderTudo(); }
      return;
    }
    if (el.dataset.cat) { var q = el.dataset.cat.split("|"); S.catalogo[+q[1]][q[2]] = q[2] === "preco" ? num(String(el.value).replace(/\./g, "").replace(",", ".")) : el.value; return; }
    if (el.id === "catFile") { var cf = el.files && el.files[0]; if (cf) importarCatalogo(cf); }
  }
  function onInput(ev) {
    var el = ev.target;
    if (el.dataset.sim === "agente") { var o = $("#agVal"); if (o) o.textContent = P(Number(el.value)); }
  }
  function onClick(ev) {
    var b = ev.target.closest("[data-tab],[data-act]"); if (!b) return;
    if (b.dataset.tab) { S.tab = b.dataset.tab; try { localStorage.setItem("vmi_tab", S.tab); } catch (e) {} renderTudo(); window.scrollTo({ top: 0 }); return; }
    var a = b.dataset.act, c = caso();
    if (a === "novo") { var n = casoNovo(); S.casos[n.id] = n; S.atual = n.id; S.tab = "cliente"; salvar(n); renderTudo(); }
    else if (a === "exemplo") { var ex = casoExemplo(); S.casos[ex.id] = ex; S.atual = ex.id; salvar(ex); renderTudo(); }
    else if (a === "abrir") { S.atual = b.dataset.id; S.tab = "linhas"; renderTudo(); }
    else if (a === "duplicar") { var d = clone(S.casos[b.dataset.id]); d.id = uid(); d.nome = d.nome + " (cópia)"; d.exemplo = false; d.kit = {}; S.casos[d.id] = d; S.atual = d.id; salvar(d); renderTudo(); }
    else if (a === "excluir") { var cc = S.casos[b.dataset.id]; modal('<h2>Excluir o caso?</h2><p>"' + esc(cc.nome) + '" e tudo o que foi lido no kit somem para todos. Não dá para desfazer.</p><div class="row end"><button data-act="fechar">Cancelar</button><button class="primary" data-act="excluir-ok" data-id="' + esc(cc.id) + '">Excluir</button></div>'); }
    else if (a === "excluir-ok") { var id = b.dataset.id; delete S.casos[id]; if (S.db) S.db.collection("casos").doc(id).delete().catch(function () {}); else lsSet("vmi_casos", S.casos); if (S.atual === id) S.atual = ultimoCaso(); fechar(); renderTudo(); }
    else if (a === "fechar") fechar();
    else if (a === "simular" && c) { c.sim = { linha: b.dataset.l, custo: b.dataset.c }; S.tab = "sim"; salvar(c); renderTudo(); window.scrollTo({ top: 0 }); }
    else if (a === "sim-reset" && c) { if (c.sim) delete c.sim.override; salvar(c); renderTudo(); }
    else if (a === "aplicar" && c) { var item = b.dataset.item, it = S.base.kit.filter(function (k) { return k.id === item; })[0]; APLICA[it.ia](c, c.kit[item].extr); salvar(c); renderTudo(); toast("Campos levados ao cadastro."); }
    else if (a === "kit-todos-solicitado" && c) { S.base.kit.forEach(function (it) { var k = c.kit[it.id] || (c.kit[it.id] = {}); if (!k.status || k.status === "pendente") k.status = "solicitado"; }); salvar(c); renderTudo(); }
    else if (a === "ex-add" && c) { c.financeiro.exercicios.push({ ano: (c.financeiro.exercicios.length ? (c.financeiro.exercicios[c.financeiro.exercicios.length - 1].ano || 2025) + 1 : 2025) }); salvar(c); renderTudo(); }
    else if (a === "ex-del" && c) { c.financeiro.exercicios.splice(+b.dataset.i, 1); salvar(c); renderTudo(); }
    else if (a === "div-add" && c) { c.financeiro = c.financeiro || {}; c.financeiro.dividas = c.financeiro.dividas || []; c.financeiro.dividas.push({ banco: "", mod: "Capital de giro", parcela: null, fim: "", saldo: null, liquida_evento: true }); salvar(c); renderTudo(); }
    else if (a === "div-del" && c) { c.financeiro.dividas.splice(+b.dataset.i, 1); salvar(c); renderTudo(); }
    else if (a === "base-reset") { modal('<h2>Restaurar a base padrão?</h2><p>Os spreads editados voltam aos valores do levantamento de ' + esc(BASE_PADRAO.versao) + ' para todos os casos.</p><div class="row end"><button data-act="fechar">Cancelar</button><button class="primary" data-act="base-reset-ok">Restaurar</button></div>'); }
    else if (a === "base-reset-ok") { S.base = clone(BASE_PADRAO); S.baseSalva = false; if (S.db) S.db.doc("config/base").delete().catch(function () {}); else try { localStorage.removeItem("vmi_base"); } catch (e) {} fechar(); renderTudo(); }
    else if (a === "cat-add") { S.catalogo.push({ id: uid(), modelo: "", modalidade: "", fabricante: "VMI Médica", cfi: "", ncm: "", preco: null, origem: "nacional", fonte: "Cadastro manual" }); renderTudo(); }
    else if (a === "cat-del") { S.catalogo.splice(+b.dataset.k, 1); renderTudo(); }
    else if (a === "cat-save") { salvarConfig("catalogo", { itens: clone(S.catalogo), atualizado: new Date().toISOString(), versao: BASE_PADRAO.catalogo_versao }); S.catSalvo = true; renderTudo(); }
    else if (a === "gerar" && c) gerar(b.dataset.doc, c);
    else if (a === "contrato-ok" && c) { var rep = { cpf: $("#m_cpf").value, rg: $("#m_rg").value, qualif: $("#m_qualif").value, data: $("#m_data").value, linha: $("#m_linha").value }; fechar(); gerarContrato(c, rep); }
  }
  document.addEventListener("toggle", function (ev) { var d = ev.target; if (d && d.dataset && d.dataset.open) S.aberto[d.dataset.open] = d.open; }, true);

  /* ---------- importação do catálogo ---------- */
  function importarCatalogo(file) {
    var norm = function (s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, ""); };
    var mapear = function (linhas) {
      var cab = linhas[0].map(norm), idx = {}; ["modelo", "modalidade", "fabricante", "cfi", "ncm", "preco", "origem"].forEach(function (k) { idx[k] = cab.findIndex(function (h) { return h.indexOf(k) === 0 || (k === "cfi" && /finame/.test(h)) || (k === "preco" && /valor|lista/.test(h)); }); });
      if (idx.modelo < 0) { toast("A planilha precisa de uma coluna 'modelo'."); return; }
      var novos = linhas.slice(1).filter(function (l) { return l[idx.modelo]; }).map(function (l) {
        var g = function (k) { return idx[k] >= 0 ? l[idx[k]] : null; }, mod = norm(g("modalidade")), modId = (S.base.modalidades.filter(function (m) { return norm(m.nome).indexOf(mod) >= 0 || m.id.replace("_", "") === mod; })[0] || {}).id || "";
        var pr = g("preco"); pr = typeof pr === "number" ? pr : num(String(pr || "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
        return { id: uid(), modelo: String(g("modelo")), modalidade: modId, fabricante: g("fabricante") || "VMI Tecnologias Ltda", cfi: g("cfi") ? String(g("cfi")) : "", ncm: g("ncm") ? String(g("ncm")) : "", preco: pr, origem: /import/i.test(g("origem") || "") ? "importado" : "nacional", fonte: "Importado de " + file.name };
      });
      S.catalogo = S.catalogo.concat(novos); renderTudo(); toast(novos.length + " itens importados. Revise e clique em Salvar catálogo.");
    };
    if (/\.csv$/i.test(file.name)) { file.text().then(function (t) { var sep = t.indexOf(";") >= 0 ? ";" : ","; mapear(t.split(/\r?\n/).filter(Boolean).map(function (l) { return l.split(sep).map(function (x) { return x.replace(/^"|"$/g, "").trim(); }); })); }); return; }
    carregar(LIB.xl).then(function () { return file.arrayBuffer(); }).then(function (buf) { var wb = new window.ExcelJS.Workbook(); return wb.xlsx.load(buf).then(function () { var ws = wb.worksheets[0], linhas = []; ws.eachRow(function (r) { linhas.push(r.values.slice(1).map(function (v) { return v && v.result != null ? v.result : v && v.text ? v.text : v; })); }); mapear(linhas); }); })
      .catch(function (e) { toast("Não foi possível ler a planilha: " + (e && e.message)); });
  }

  /* ---------- geração de documentos ---------- */
  function salvarArquivo(nome, blob) {
    if (!S.downloads) {
      try { var u = URL.createObjectURL(blob), a = document.createElement("a"); a.href = u; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); toast("Arquivo gerado: " + nome); }
      catch (e) { toast("Download indisponível nesta visualização."); }
      return Promise.resolve();
    }
    return S.downloads.save({ filename: nome, data: blob }).then(function (r) { toast(r && r.status === "delivered" ? "Arquivo entregue." : "Arquivo salvo."); })
      .catch(function (e) { toast(e && e.code === "declined" ? "Download cancelado." : "Não foi possível salvar o arquivo (" + (e && e.code) + ")."); });
  }
  function slug(s) { return String(s || "caso").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40); }
  function pacote(c) { return { caso: c, av: S.av, sim: S.simAtual, roi: S.roiAtual, ent: S.entAtual, base: S.base, kitProg: kitProg(c), hoje: hoje(), indic: ((c.financeiro || {}).exercicios || []).map(function (e) { return { ano: e.ano, i: M.indicadores(e) }; }) }; }
  function gerar(doc, c) {
    if (doc === "contrato") {
      modal('<h2>Dados do representante para a minuta</h2><p class="small muted">Usados só neste arquivo; não ficam salvos na ferramenta.</p><div class="form">' +
        '<label class="f" for="m_qualif">Nacionalidade, estado civil, profissão<input id="m_qualif" value="' + esc((c.cliente.rep || {}).qualif || "brasileiro, [estado civil], médico") + '"></label><label class="f" for="m_rg">RG e órgão emissor<input id="m_rg" value=""></label><label class="f" for="m_cpf">CPF<input id="m_cpf" value=""></label><label class="f" for="m_data">Data de assinatura<input id="m_data" type="date" value=""></label>' +
        '<label class="f w2" for="m_linha">Linha objeto do contrato<select id="m_linha"><option value="BNDES FINAME">BNDES FINAME</option><option value="BNDES Automático">BNDES Automático</option><option value="' + esc(S.simAtual ? S.simAtual.linha.nome : "") + '">' + esc(S.simAtual ? S.simAtual.linha.nome : "Linha simulada") + "</option></select></label></div>" +
        '<div class="row end"><button data-act="fechar">Cancelar</button><button class="primary" data-act="contrato-ok">Gerar minuta</button></div>');
      return;
    }
    toast("Gerando…");
    var p = pacote(c);
    if (doc === "estudo" || doc === "dossie") {
      carregar(LIB.jspdf).then(function () { return carregar(LIB.at); }).then(function () {
        var pdf = doc === "estudo" ? Docs.estudo(p, window.jspdf.jsPDF) : Docs.dossie(p, window.jspdf.jsPDF);
        return salvarArquivo((doc === "estudo" ? "Estudo_Financiamento_" : "Dossie_Agente_") + slug(c.cliente.fantasia || c.nome) + ".pdf", pdf.output("blob"));
      }).catch(function (e) { toast("Falha ao gerar o PDF: " + (e && e.message)); });
    } else if (doc === "kit") {
      carregar(LIB.xl).then(function () { return Docs.kit(p, window.ExcelJS); }).then(function (buf) { return salvarArquivo("Kit_Documentos_FINAME_" + slug(c.cliente.fantasia || c.nome) + ".xlsx", new Blob([buf])); })
        .catch(function (e) { toast("Falha ao gerar a planilha: " + (e && e.message)); });
    }
  }
  function gerarContrato(c, rep) {
    toast("Gerando…");
    carregar(LIB.docx).then(function () { return Docs.contrato(pacote(c), rep, window.docx); }).then(function (blob) { return salvarArquivo("Contrato_FINAME_" + slug(c.cliente.fantasia || c.nome) + "_VMI.docx", blob); })
      .catch(function (e) { toast("Falha ao gerar a minuta: " + (e && e.message)); });
  }

  /* ---------- início ---------- */
  $("#logoTopo").src = LOGO.branco;
  try { var t = localStorage.getItem("vmi_tab"); if (t) S.tab = t; } catch (e) {}
  document.addEventListener("change", onChange);
  document.addEventListener("input", onInput);
  document.addEventListener("click", onClick);
  $("#modal").addEventListener("click", function (e) { if (e.target.id === "modal") fechar(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("#modal").hidden) fechar(); });
  document.addEventListener("dragover", function (e) { var d = e.target.closest && e.target.closest("[data-drop]"); if (d) { e.preventDefault(); d.classList.add("over"); } });
  document.addEventListener("dragleave", function (e) { var d = e.target.closest && e.target.closest("[data-drop]"); if (d) d.classList.remove("over"); });
  document.addEventListener("drop", function (e) { var d = e.target.closest && e.target.closest("[data-drop]"); if (d) { e.preventDefault(); d.classList.remove("over"); var f = e.dataTransfer.files[0]; if (f) lerArquivo(d.dataset.drop, f); } });
  $("#btnNovo").addEventListener("click", function () { var n = casoNovo(); S.casos[n.id] = n; S.atual = n.id; S.tab = "cliente"; salvar(n); renderTudo(); });
  renderTudo();
  conectar();
})();
