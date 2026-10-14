/* POST {tipo, ...extra} → registra um evento de uso (página aberta, caso aberto, documento gerado) para o usuário da sessão. */
import { lerCookie, verificarSessao, registrar, json, corpo, mesmaOrigem, SESSION_COOKIE } from "./_lib.mjs";

const TIPOS = new Set(["pagina", "caso", "documento", "export", "versao"]);
export default async (req) => {
  if (req.method !== "POST") return json({ erro: "método" }, 405);
  if (!mesmaOrigem(req)) return json({ erro: "origem" }, 403);
  const s = await verificarSessao(lerCookie(req, SESSION_COOKIE));
  if (!s) return json({ erro: "sem sessão" }, 401);
  const b = await corpo(req);
  const tipo = TIPOS.has(b.tipo) ? b.tipo : "evento";
  const extra = {};
  for (const k of ["path", "caso", "nome", "doc", "detalhe"]) if (b[k] != null) extra[k] = String(b[k]).slice(0, 200);
  await registrar(req, tipo, s.e, extra);
  return json({ ok: true });
};
