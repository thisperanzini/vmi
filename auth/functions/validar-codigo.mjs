/* POST {email, codigo} → confere o código, emite o cookie de sessão e registra o login. */
import { getStore } from "@netlify/blobs";
import { normEmail, config, permitido, ehAdmin, registrar, sha256, assinarSessao, cookieSessao, json, corpo, mesmaOrigem, env, CODE_MAX_TRIES } from "./_lib.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ erro: "método" }, 405);
  if (!mesmaOrigem(req)) return json({ erro: "origem" }, 403);
  const b = await corpo(req);
  const email = normEmail(b.email), codigo = String(b.codigo || "").replace(/\D/g, "");
  if (!email || codigo.length !== 6) return json({ erro: "Informe o e-mail e o código de 6 dígitos." }, 400);
  const store = getStore("auth"), k = "code:" + email;
  const reg = await store.get(k, { type: "json" });
  if (!reg || reg.exp < Date.now()) { await registrar(req, "login_falha", email, { motivo: "expirado" }); return json({ erro: "Código expirado ou inexistente. Peça um novo." }, 400); }
  if (reg.tries >= CODE_MAX_TRIES) { await store.delete(k); await registrar(req, "login_falha", email, { motivo: "tentativas" }); return json({ erro: "Muitas tentativas. Peça um novo código." }, 429); }
  const h = await sha256(env("SESSION_SECRET", "") + ":" + email + ":" + codigo);
  if (h !== reg.h) { reg.tries += 1; await store.setJSON(k, reg); await registrar(req, "login_falha", email, { motivo: "codigo" }); return json({ erro: `Código incorreto (${CODE_MAX_TRIES - reg.tries} tentativas restantes).` }, 400); }
  await store.delete(k);
  const cfg = await config();
  if (!permitido(cfg, email)) { await registrar(req, "login_negado", email); return json({ erro: "E-mail não autorizado." }, 403); }
  const admin = ehAdmin(cfg, email);
  const token = await assinarSessao(email, admin);
  await registrar(req, "login", email, { admin });
  let next = typeof b.next === "string" && b.next.startsWith("/") && !b.next.startsWith("//") ? b.next : "/";
  return json({ ok: true, next, admin }, 200, { "set-cookie": cookieSessao(token) });
};
