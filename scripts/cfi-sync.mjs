#!/usr/bin/env node
/* Sincronização mensal do catálogo com o Catálogo CFI do BNDES (API pública do gateway).
   - Consulta os CNPJs de shared/catalogo.js (VMI Médica, Alfa Med) e grava shared/cfi-bndes.json (snapshot auditável).
   - Compara com CATALOGO_VMI: item com código que sumiu ou deixou de ser "Financiável" vira alerta;
     item com cfi "previsto" cujo nome aparece credenciado recebe o código (ex.: Pulsar) e perde a previsão;
     item credenciado que não está no catálogo vira "novo" (só relatado: modalidade e preço são decisão humana).
   - Se o catálogo mudou, bumpa catalogo_versao em shared/base.js para a data da consulta.
   - Escreve cfi-report.md (corpo do PR) e sai com código 0; "changed=true|false" vai para $GITHUB_OUTPUT.
   Uso: node scripts/cfi-sync.mjs [--dry]  (sem rede: --from arquivo.json com o snapshot bruto) */
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const CAT = path.join(RAIZ, "shared/catalogo.js"), BASE = path.join(RAIZ, "shared/base.js"), SNAP = path.join(RAIZ, "shared/cfi-bndes.json"), REPORT = path.join(RAIZ, "cfi-report.md");
const API = "https://gateway.apis.bndes.gov.br/catalogoCFI/web/itemfinanciavel/buscar";
const args = process.argv.slice(2), dry = args.includes("--dry"), fromIx = args.indexOf("--from");
const hoje = new Date().toISOString().slice(0, 10);

function carregarCatalogo() {
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(CAT, "utf8") + ";this.__cat=CATALOGO_VMI;", ctx);
  return ctx.__cat;
}
const soDig = s => String(s || "").replace(/\D/g, "");

async function consultar(cnpj) {
  const itens = []; let inicio = 0, total = Infinity;
  while (inicio < total) {
    const u = API + "?keyword=" + soDig(cnpj) + "&inicio=" + inicio + "&quantidade=100";
    const r = await fetch(u, { headers: { accept: "application/json", "user-agent": "sespartners-cfi-sync/1.0" } });
    if (!r.ok) throw new Error("BNDES " + r.status + " em " + u);
    const j = await r.json();
    total = Number(j.total || 0);
    const lote = Array.isArray(j.entidades) ? j.entidades : [];
    lote.forEach(e => itens.push({ codigo: String(e.codigoFiname || "").padStart(8, "0"), nome: String(e.nomeItem || "").trim(), fabricante: String(e.fabricante || "").trim(), posicao: String(e.posicaoCadastral || "").trim(), cnpj }));
    if (!lote.length) break;
    inicio += lote.length;
  }
  return itens;
}

(async () => {
  const catalogo = carregarCatalogo();
  const cnpjs = [...new Set(catalogo.map(i => i.cnpj).filter(Boolean))];
  let bruto;
  if (fromIx >= 0) bruto = JSON.parse(fs.readFileSync(args[fromIx + 1], "utf8")).itens;
  else { bruto = []; for (const c of cnpjs) bruto.push(...await consultar(c)); }
  const porCodigo = {}; bruto.forEach(i => { porCodigo[i.codigo] = i; });
  const codigosCat = new Set(catalogo.map(i => soDig(i.cfi)).filter(Boolean));

  const alertas = [], aplicados = [], novos = [];
  let catSrc = fs.readFileSync(CAT, "utf8"), catMudou = false;

  for (const it of catalogo) {
    const c = soDig(it.cfi);
    if (c && /^\d{8}$/.test(String(it.cfi).trim())) {
      const b = porCodigo[c];
      if (!b) alertas.push(`**${it.modelo}** (CFI ${c}): não consta mais na consulta por CNPJ.`);
      else if (!/financi/i.test(b.posicao)) alertas.push(`**${it.modelo}** (CFI ${c}): posição cadastral "${b.posicao}".`);
      continue;
    }
    if (/previsto/i.test(String(it.cfi || ""))) {
      const chave = /pulsar/i.test(it.modelo) ? /PULSAR|TOMOGRAF/i : new RegExp(it.modelo.split(/\s|\(/)[0], "i");
      let cands = bruto.filter(b => !codigosCat.has(b.codigo) && chave.test(b.nome) && /financi/i.test(b.posicao));
      const m = it.modelo.match(/\b(\d{2,3})\b/); if (m && cands.length > 1) cands = cands.filter(b => new RegExp("\\b" + m[1] + "\\b").test(b.nome));
      if (cands.length === 1) {
        const b = cands[0];
        const re = new RegExp('(id: "' + it.id + '"[^\\n]*?)cfi: "previsto"(?:, cfi_previsao: "[^"]*")?,');
        if (re.test(catSrc)) {
          catSrc = catSrc.replace(re, `$1cfi: "${b.codigo}",`);
          catSrc = catSrc.replace(new RegExp('(id: "' + it.id + '"[^\\n]*?fonte: ")[^"]*"'), `$1Catálogo CFI do BNDES: credenciado, consulta automática de ${hoje} (${b.nome})"`);
          codigosCat.add(b.codigo); catMudou = true;
          aplicados.push(`**${it.modelo}**: CFI **${b.codigo}** publicado ("${b.nome}", ${b.posicao}). Código aplicado; previsão removida.`);
        }
      } else if (cands.length > 1) alertas.push(`**${it.modelo}** (previsto): ${cands.length} candidatos no BNDES, escolha manual: ${cands.map(b => b.codigo + " " + b.nome).join("; ")}.`);
    }
  }
  for (const b of bruto) if (!codigosCat.has(b.codigo)) novos.push(b);

  const snapshot = { consultadoEm: hoje, fonte: API, cnpjs, total: bruto.length, itens: bruto.sort((a, b) => a.codigo.localeCompare(b.codigo)), novos: novos.map(b => b.codigo), alertas };
  const anterior = fs.existsSync(SNAP) ? JSON.parse(fs.readFileSync(SNAP, "utf8")) : null;
  const snapMudou = !anterior || JSON.stringify(anterior.itens) !== JSON.stringify(snapshot.itens) || JSON.stringify(anterior.alertas) !== JSON.stringify(alertas);

  const linhas = [`# Catálogo CFI do BNDES · consulta de ${hoje}`, "", `CNPJs consultados: ${cnpjs.join(", ")} · ${bruto.length} itens credenciados · ${catalogo.length} itens no catálogo.`, ""];
  if (aplicados.length) linhas.push("## Aplicado ao catálogo", ...aplicados.map(s => "- " + s), "");
  if (alertas.length) linhas.push("## Alertas (decisão humana)", ...alertas.map(s => "- " + s), "");
  if (novos.length) linhas.push("## Credenciados no BNDES e fora do catálogo", ...novos.map(b => `- ${b.codigo} · ${b.nome} · ${b.fabricante} · ${b.posicao}`), "", "Para incluir: adicionar em shared/catalogo.js com modalidade e preço.", "");
  if (!aplicados.length && !alertas.length && !novos.length) linhas.push("Sem divergências: catálogo e BNDES coincidem.", "");
  linhas.push("Validade dos códigos não vem da API; segue a tabela FINAME da VMI (campo `validade`).");
  const report = linhas.join("\n");
  console.log(report);

  if (!dry) {
    fs.writeFileSync(SNAP, JSON.stringify(snapshot, null, 1) + "\n");
    if (catMudou) {
      fs.writeFileSync(CAT, catSrc);
      let base = fs.readFileSync(BASE, "utf8");
      base = base.replace(/catalogo_versao: "\d{4}-\d{2}-\d{2}"/, `catalogo_versao: "${hoje}"`);
      fs.writeFileSync(BASE, base);
    }
    fs.writeFileSync(REPORT, report + "\n");
  }
  const changed = catMudou || snapMudou;
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\ncatalogo=${catMudou}\n`);
  console.log(`\nchanged=${changed} catalogo=${catMudou}`);
})().catch(e => { console.error(e); process.exit(1); });
