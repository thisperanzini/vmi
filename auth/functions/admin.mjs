/* Administração (só e-mails em ADMIN_EMAILS):
   GET  ?acao=logs&mes=AAAA-MM   → eventos do mês (até 5.000), mais recentes primeiro
   GET  ?acao=lista              → domínios, admins, e-mails avulsos e bloqueados
   POST {acao:"add"|"remove"|"block"|"unblock", email, nota} → edita a lista de e-mails avulsos */
import { getStore } from "@netlify/blobs";
import { lerCookie, verificarSessao, config, ehAdmin, normEmail, emailValido, registrar, json, corpo, mesmaOrigem, SESSION_COOKIE, siteId } from "./_lib.mjs";

export default async (req) => {
  const s = await verificarSessao(lerCookie(req, SESSION_COOKIE));
  if (!s) return json({ erro: "sem sessão" }, 401);
  const cfg = await config();
  if (!ehAdmin(cfg, s.e)) { await registrar(req, "admin_negado", s.e); return json({ erro: "não autorizado" }, 403); }
  const url = new URL(req.url);
  if (req.method === "GET") {
    const acao = url.searchParams.get("acao") || "logs";
    if (acao === "lista") return json({ site: siteId(), dominios: cfg.dominios, admins: cfg.admins, emails: cfg.emails, bloqueados: cfg.bloqueados });
    const mes = (url.searchParams.get("mes") || new Date().toISOString().slice(0, 7)).slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(mes)) return json({ erro: "mês" }, 400);
    const store = getStore("logs");
    const lista = await store.list({ prefix: mes + "/" });
    const keys = lista.blobs.map(b => b.key).sort().reverse().slice(0, 5000);
    const eventos = [];
    for (let i = 0; i < keys.length; i += 50) {
      const lote = await Promise.all(keys.slice(i, i + 50).map(k => store.get(k, { type: "json" })));
      lote.forEach(e => { if (e) eventos.push(e); });
    }
    return json({ mes, total: keys.length, eventos });
  }
  if (req.method === "POST") {
    if (!mesmaOrigem(req)) return json({ erro: "origem" }, 403);
    const b = await corpo(req), email = normEmail(b.email);
    if (!emailValido(email)) return json({ erro: "E-mail inválido." }, 400);
    const salvo = (await cfg.store.get("allow", { type: "json" })) || { emails: [], bloqueados: [] };
    salvo.emails = (salvo.emails || []).filter(x => normEmail(typeof x === "string" ? x : x.email) !== email);
    salvo.bloqueados = (salvo.bloqueados || []).filter(x => x !== email);
    if (b.acao === "add") salvo.emails.push({ email, nota: String(b.nota || "").slice(0, 120), por: s.e, em: new Date().toISOString() });
    else if (b.acao === "block") salvo.bloqueados.push(email);
    else if (b.acao !== "remove" && b.acao !== "unblock") return json({ erro: "ação" }, 400);
    await cfg.store.setJSON("allow", salvo);
    await registrar(req, "admin_" + b.acao, s.e, { alvo: email });
    return json({ ok: true, emails: salvo.emails, bloqueados: salvo.bloqueados });
  }
  return json({ erro: "método" }, 405);
};
