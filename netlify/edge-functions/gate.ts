// Porteiro: roda em toda requisição (menos /entrar e as funções). Sem cookie de sessão válido, redireciona para /entrar.
// Verifica só a assinatura HMAC do token (mesmo formato de auth/functions/_lib.mjs); não toca em armazenamento.
import type { Context } from "https://edge.netlify.com";

const COOKIE = "ss_sess";
const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = ""; bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64url(s: string): string {
  const b = s.replace(/-/g, "+").replace(/_/g, "/"), pad = b + "=".repeat((4 - (b.length % 4)) % 4);
  return new TextDecoder().decode(Uint8Array.from(atob(pad), (c) => c.charCodeAt(0)));
}
async function valido(token: string | null, secret: string, site: string): Promise<boolean> {
  if (!token || !secret) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const esperado = b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(payload))));
  if (esperado.length !== sig.length) return false;
  let diff = 0; for (let i = 0; i < esperado.length; i++) diff |= esperado.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return false;
  try {
    const p = JSON.parse(unb64url(payload));
    return !!p.e && p.s === site && p.x > Math.floor(Date.now() / 1000);
  } catch { return false; }
}

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const p = url.pathname;
  if (p.startsWith("/entrar") || p.startsWith("/.netlify/") || p === "/favicon.ico" || p === "/robots.txt") return context.next();
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(new RegExp("(?:^|;\\s*)" + COOKIE + "=([^;]+)"));
  const token = m ? decodeURIComponent(m[1]) : null;
  const secret = Netlify.env.get("SESSION_SECRET") || "";
  const site = Netlify.env.get("SITE_ID") || "financiamento";
  if (await valido(token, secret, site)) {
    const res = await context.next();
    res.headers.set("cache-control", "private, no-store");
    return res;
  }
  const next = encodeURIComponent(p + url.search);
  return new Response(null, { status: 302, headers: { location: "/entrar/?next=" + next, "cache-control": "no-store" } });
};
