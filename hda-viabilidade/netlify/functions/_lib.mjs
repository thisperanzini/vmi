/* Utilidades compartilhadas pelas funções de autenticação e log (Node 18+, Netlify Functions v2). */
import { getStore } from "@netlify/blobs";

const enc = new TextEncoder();
export const SESSION_COOKIE = "ss_sess";
export const SESSION_DAYS = Number(process.env.SESSION_DAYS || 7);
export const CODE_MINUTES = 10;
export const CODE_MAX_TRIES = 5;
export const CODES_PER_HOUR_EMAIL = 5;
export const CODES_PER_HOUR_IP = 20;

export function env(name, fallback) { const v = process.env[name]; return v == null || v === "" ? fallback : v; }
export function siteId() { return env("SITE_ID", "financiamento"); }
export function siteName() { return env("SITE_NAME", siteId() === "hda" ? "Imagem Própria HDA" : "Financiamento VMI"); }

export function normEmail(e) { return String(e || "").trim().toLowerCase(); }
export function emailValido(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e); }

export function b64url(bytes) { return Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
export function unb64url(s) { return Buffer.from(String(s).replace(/-/g, "+").replace(/_/g, "/"), "base64"); }

async function hmacKey(secret) { return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]); }
export async function hmac(secret, data) { const k = await hmacKey(secret); return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(data))); }
export async function sha256(s) { return b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)))); }

/* Sessão: token = payload.b64url + "." + hmac.b64url; payload = {e: email, s: site, i: emitido, x: expira, a: admin} */
export async function assinarSessao(email, admin) {
  const secret = env("SESSION_SECRET"); if (!secret) throw new Error("SESSION_SECRET não definido");
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(enc.encode(JSON.stringify({ e: email, s: siteId(), i: now, x: now + SESSION_DAYS * 86400, a: !!admin })));
  const sig = b64url(await hmac(secret, payload));
  return payload + "." + sig;
}
export async function verificarSessao(token) {
  try {
    const secret = env("SESSION_SECRET"); if (!secret || !token) return null;
    const [payload, sig] = String(token).split(".");
    if (!payload || !sig) return null;
    const esperado = b64url(await hmac(secret, payload));
    if (esperado.length !== sig.length) return null;
    let diff = 0; for (let i = 0; i < esperado.length; i++) diff |= esperado.charCodeAt(i) ^ sig.charCodeAt(i);
    if (diff !== 0) return null;
    const p = JSON.parse(unb64url(payload).toString("utf8"));
    if (!p.e || p.s !== siteId() || p.x < Math.floor(Date.now() / 1000)) return null;
    return p;
  } catch (e) { return null; }
}
export function lerCookie(req, nome) {
  const c = req.headers.get("cookie") || "";
  const m = c.match(new RegExp("(?:^|;\\s*)" + nome + "=([^;]+)")); return m ? decodeURIComponent(m[1]) : null;
}
export function cookieSessao(token) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`;
}
export function cookieLimpar() { return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`; }

/* Quem entra: domínios e administradores vêm das variáveis de ambiente; e-mails avulsos ficam no store "config" (editáveis na página admin). */
export async function config() {
  const store = getStore("config");
  const salvo = (await store.get("allow", { type: "json" })) || {};
  const dominios = env("ALLOW_DOMAINS", "sespartners.com.br").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  const admins = env("ADMIN_EMAILS", "").split(",").map(normEmail).filter(Boolean);
  return { dominios, admins, emails: Array.isArray(salvo.emails) ? salvo.emails : [], bloqueados: Array.isArray(salvo.bloqueados) ? salvo.bloqueados : [], store };
}
export function permitido(cfg, email) {
  if (cfg.bloqueados.includes(email)) return false;
  if (cfg.admins.includes(email) || cfg.emails.some(x => normEmail(typeof x === "string" ? x : x.email) === email)) return true;
  const dom = email.split("@")[1]; return cfg.dominios.includes(dom);
}
export function ehAdmin(cfg, email) { return cfg.admins.includes(email); }

/* Log: um blob por evento, chave AAAA-MM/<timestamp>-<aleatório>, listável por mês. */
export async function registrar(req, tipo, email, extra) {
  try {
    const store = getStore("logs");
    const d = new Date(), mes = d.toISOString().slice(0, 7), ts = d.toISOString();
    const key = `${mes}/${ts}-${Math.random().toString(36).slice(2, 8)}`;
    const ip = req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "";
    const ev = { t: ts, tipo, email: email || "", ip, ua: (req.headers.get("user-agent") || "").slice(0, 200), pais: req.headers.get("x-country") || "", site: siteId(), ...(extra || {}) };
    await store.setJSON(key, ev);
    return ev;
  } catch (e) { console.error("log falhou", e); return null; }
}

/* Limite de taxa simples em Blobs: {n, ate} por chave; expira sozinho pela janela. */
export async function limite(chave, max, janelaSeg) {
  const store = getStore("auth"); const now = Math.floor(Date.now() / 1000);
  const k = "rl:" + chave; let r = (await store.get(k, { type: "json" })) || null;
  if (!r || r.ate < now) r = { n: 0, ate: now + janelaSeg };
  r.n += 1; await store.setJSON(k, r);
  return r.n <= max;
}

export function json(obj, status, headers) { return new Response(JSON.stringify(obj), { status: status || 200, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...(headers || {}) } }); }
export async function corpo(req) { try { return await req.json(); } catch (e) { return {}; } }
export function mesmaOrigem(req) {
  const origin = req.headers.get("origin"), host = req.headers.get("host");
  if (!origin) return true; try { return new URL(origin).host === host; } catch (e) { return false; }
}
