/* GET → encerra a sessão e volta à tela de entrada. */
import { lerCookie, verificarSessao, registrar, cookieLimpar, SESSION_COOKIE } from "./_lib.mjs";

export default async (req) => {
  const s = await verificarSessao(lerCookie(req, SESSION_COOKIE));
  if (s) await registrar(req, "logout", s.e);
  return new Response(null, { status: 302, headers: { location: "/entrar/", "set-cookie": cookieLimpar(), "cache-control": "no-store" } });
};
