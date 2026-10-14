/* POST {email} → envia código de 6 dígitos por e-mail (Resend) se o e-mail for permitido. Resposta neutra: não revela se o e-mail está na lista. */
import { getStore } from "@netlify/blobs";
import { normEmail, emailValido, config, permitido, registrar, limite, sha256, json, corpo, mesmaOrigem, siteName, env, CODE_MINUTES, CODES_PER_HOUR_EMAIL, CODES_PER_HOUR_IP } from "./_lib.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ erro: "método" }, 405);
  if (!mesmaOrigem(req)) return json({ erro: "origem" }, 403);
  const { email: bruto } = await corpo(req);
  const email = normEmail(bruto);
  const neutro = json({ ok: true, msg: "Se o e-mail estiver autorizado, o código chega em instantes." });
  if (!emailValido(email)) return json({ erro: "E-mail inválido." }, 400);
  const ip = req.headers.get("x-nf-client-connection-ip") || "0";
  if (!(await limite("ip:" + ip, CODES_PER_HOUR_IP, 3600)) || !(await limite("em:" + email, CODES_PER_HOUR_EMAIL, 3600))) {
    await registrar(req, "codigo_bloqueado_limite", email);
    return json({ erro: "Muitas tentativas. Aguarde uma hora." }, 429);
  }
  const cfg = await config();
  if (!permitido(cfg, email)) { await registrar(req, "codigo_negado", email); return neutro; }

  const codigo = String(Math.floor(100000 + Math.random() * 900000));
  const pepper = env("SESSION_SECRET", "");
  const store = getStore("auth");
  await store.setJSON("code:" + email, { h: await sha256(pepper + ":" + email + ":" + codigo), exp: Date.now() + CODE_MINUTES * 60000, tries: 0 });

  const from = env("MAIL_FROM", "S&S Partners <acesso@sespartners.com.br>");
  const nome = siteName();
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: "Bearer " + env("RESEND_API_KEY", ""), "content-type": "application/json" },
    body: JSON.stringify({
      from, to: [email], subject: `${codigo} é o seu código de acesso · ${nome}`,
      text: `Seu código de acesso a ${nome}: ${codigo}\n\nVale por ${CODE_MINUTES} minutos. Se você não pediu este código, ignore esta mensagem.\n\nS&S Partners`,
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#142035"><p style="font-size:13px;color:#4d5b72;margin:0 0 6px">S&amp;S Partners · ${nome}</p><p style="font-size:15px">Seu código de acesso:</p><p style="font:700 34px/1 Consolas,monospace;letter-spacing:6px;margin:8px 0 16px">${codigo}</p><p style="font-size:13px;color:#4d5b72">Vale por ${CODE_MINUTES} minutos. Se você não pediu este código, ignore esta mensagem.</p></div>`
    })
  });
  if (!r.ok) { const t = await r.text(); console.error("resend", r.status, t); await registrar(req, "codigo_erro_envio", email, { status: r.status }); return json({ erro: "Não foi possível enviar o e-mail agora. Tente de novo em instantes." }, 502); }
  await registrar(req, "codigo_enviado", email);
  return neutro;
};
