/* Animações da página e da apresentação (HDA).
   - Página: ao abrir uma aba, os cartões entram em sequência (os de baixo, ao rolar), os indicadores contam até o valor,
     as linhas dos gráficos se desenham e as barras crescem. Ao editar uma premissa, os indicadores que mudaram rolam
     do valor antigo ao novo e piscam.
   - Apresentação: cada slide entra com o título, depois os blocos na ordem de leitura (de cima para baixo, da esquerda
     para a direita): indicadores contando, linhas das tabelas, gráficos se desenhando, notas por último. Voltando um
     slide, só a transição.
   Tudo pela Web Animations API, sem estado permanente no DOM: terminada a animação, o elemento fica como foi montado
   (o texto final é sempre o original). Respeita prefers-reduced-motion e window.__HDA_SEM_ANIM. O .pptx não muda. */
window.HDAMotion = (function () {
  'use strict';
  var EASE = 'cubic-bezier(.2,.7,.2,1)', OUT = 'cubic-bezier(.16,1,.3,1)';

  function off() {
    try {
      if (window.__HDA_SEM_ANIM) return true;
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
    } catch (e) { }
    return !(document.documentElement && document.documentElement.animate);
  }
  function anim(el, kf, o) { if (!el) return null; try { return el.animate(kf, o); } catch (e) { return null; } }
  function arr(x) { return Array.prototype.slice.call(x || []); }
  function entrar(el, delay, o) {
    o = o || {};
    return anim(el, [{ opacity: 0, transform: 'translate(' + (o.dx || 0) + 'px,' + (o.dy == null ? 14 : o.dy) + 'px)' + (o.sc ? ' scale(' + o.sc + ')' : '') }, { opacity: 1, transform: 'none' }],
      { duration: o.dur || 560, delay: delay || 0, easing: o.ease || OUT, fill: 'backwards' });
  }
  function surgir(el, delay, dur) { return anim(el, [{ opacity: 0 }, { opacity: 1 }], { duration: dur || 420, delay: delay || 0, easing: 'ease-out', fill: 'backwards' }); }

  /* ---------- números em pt-BR dentro de um texto ("R$ 8,29 mi", "16,18%", "R$ 180.703", "1,39") ---------- */
  function parse(txt) {
    var re = /[−-]?\d[\d.]*(?:,\d+)?/g, m;
    while ((m = re.exec(txt))) {
      var s = m[0].replace(/\.+$/, ''), i = m.index, a = txt.charAt(i - 1), b = txt.charAt(i + s.length);
      if (a === '/' || b === '/' || /[\d.,]/.test(a) || b === ':' || /[A-Z]/.test(b) || /[A-Za-z]/.test(a)) continue; /* datas (dez/2027, 03/11), horas, códigos (2T27) */
      var neg = /^[−-]/.test(s), body = neg ? s.slice(1) : s, parts = body.split(','), ip = parts[0], dp = parts[1] || '';
      if (ip.indexOf('.') >= 0 && !/^\d{1,3}(\.\d{3})+$/.test(ip)) continue;
      var v = parseFloat(ip.replace(/\./g, '') + (dp ? '.' + dp : ''));
      if (!isFinite(v)) continue;
      if (!dp && ip.indexOf('.') < 0 && v >= 1990 && v <= 2100) continue;               /* ano */
      return { v: neg ? -v : v, d: dp.length, mil: ip.indexOf('.') >= 0, pre: txt.slice(0, i), pos: txt.slice(i + s.length), sinal: neg ? s.charAt(0) : '', txt: txt };
    }
    return null;
  }
  function fmt(p, v) {
    var s = Math.abs(v).toFixed(p.d).split('.'), ip = s[0];
    if (p.mil) ip = ip.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    var zero = Math.abs(v) < Math.pow(10, -p.d) / 2, pre = zero ? p.pre.replace(/^([^\d]*?)[−+-]\s?/, '$1') : p.pre; /* sem sinal no zero */
    return pre + (v < 0 && !zero ? (p.sinal || '−') : '') + ip + (p.d ? ',' + s[1] : '') + p.pos;
  }
  function acharNum(el) {
    if (!el || el.hasAttribute('data-sem-conta')) return null;
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) { var p = parse(n.nodeValue); if (p) { p.node = n; return p; } }
    return null;
  }
  /* conta de "de" até o valor do texto; termina sempre no texto original */
  function contar(el, delay, de, dur) {
    var p = acharNum(el); if (!p) return;
    var v0 = de == null ? 0 : de, v1 = p.v, d = dur || 1100, t0 = null, node = p.node;
    if (v0 === v1) return;
    node.nodeValue = fmt(p, v0);
    function passo(ts) {
      if (!node.parentNode) return;                                                       /* re-render: some sem rastro */
      if (t0 == null) t0 = ts + (delay || 0);
      var k = Math.max(0, Math.min(1, (ts - t0) / d)), e = 1 - Math.pow(1 - k, 3);
      if (ts < t0) { requestAnimationFrame(passo); return; }
      node.nodeValue = k >= 1 ? p.txt : fmt(p, v0 + (v1 - v0) * e);
      if (k < 1) requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
    setTimeout(function () { if (node.parentNode && node.nodeValue !== p.txt) node.nodeValue = p.txt; }, (delay || 0) + d + 400); /* aba em segundo plano */
  }

  /* ---------- gráficos SVG: linhas se desenham, barras crescem da base, pontos e rótulos por último ---------- */
  var ORIG = { b: 'center bottom', t: 'center top', l: 'left center', r: 'right center' };
  function grafico(svg, delay) {
    if (!svg) return;
    delay = delay || 0;
    var fim = delay;
    arr(svg.querySelectorAll('path')).forEach(function (p, i) {
      if (p.getAttribute('fill') !== 'none') return;
      var L = 0; try { L = p.getTotalLength(); } catch (e) { }
      if (!L) return;
      var dl = delay + i * 140;
      if (p.getAttribute('stroke-dasharray')) surgir(p, dl + 300, 700);
      else anim(p, [{ strokeDasharray: L + ' ' + L, strokeDashoffset: L }, { strokeDasharray: L + ' ' + L, strokeDashoffset: 0 }], { duration: 1200, delay: dl, easing: EASE, fill: 'backwards' });
      fim = Math.max(fim, dl + 1000);
    });
    arr(svg.querySelectorAll('rect[data-o]')).forEach(function (r, i) {
      var o = r.getAttribute('data-o'), hz = o === 'l' || o === 'r';
      r.style.transformBox = 'fill-box'; r.style.transformOrigin = ORIG[o] || ORIG.b;
      var dl = delay + Math.min(i, 24) * 45;
      anim(r, [{ transform: hz ? 'scaleX(0)' : 'scaleY(0)' }, { transform: 'none' }], { duration: 900, delay: dl, easing: EASE, fill: 'backwards' });
      fim = Math.max(fim, dl + 700);
    });
    arr(svg.querySelectorAll('circle')).forEach(function (c, i) {
      c.style.transformBox = 'fill-box'; c.style.transformOrigin = 'center';
      anim(c, [{ opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: delay + 650 + Math.min(i, 30) * 22, easing: OUT, fill: 'backwards' });
    });
    /* rótulos de valor (texto com peso ou dentro da área do gráfico) entram depois das barras */
    arr(svg.querySelectorAll('text[font-weight], text[data-v]')).forEach(function (t) { surgir(t, fim, 360); });
  }

  /* ---------- conteúdo de um cartão ou bloco ---------- */
  function interior(el, delay) {
    var d = delay || 0;
    arr(el.querySelectorAll('.kpi, .sl-kpi')).forEach(function (k, i) {
      entrar(k, d + 80 + i * 110, { dy: 18 });
      contar(k.querySelector('.v'), d + 160 + i * 110);
    });
    arr(el.querySelectorAll('.cmp, .gate, .linha, .tile')).forEach(function (k, i) { if (i < 14) entrar(k, d + 80 + i * 70, { dy: 12, dur: 480 }); });
    arr(el.querySelectorAll('.cmp b.t')).forEach(function (b, i) { contar(b, d + 160 + i * 70, null, 900); });
    arr(el.querySelectorAll('svg')).forEach(function (s) { if (s.closest('.chart, .sb-g, .sb-img') || s.getAttribute('role') === 'img') grafico(s, d + 200); });
    arr(el.querySelectorAll('.legend')).forEach(function (l) { surgir(l, d + 900); });
  }

  /* ---------- página: entrada de uma aba ---------- */
  var io = null;
  function aba(sec) {
    if (io) { io.disconnect(); io = null; }
    if (!sec || off() || document.visibilityState === 'hidden') return;
    var cards = arr(sec.querySelectorAll('.card')).filter(function (c) { return !c.parentElement.closest('.card'); });
    var vh = window.innerHeight || 800, n = 0, fila = [];
    surgir(sec, 0, 260);
    cards.forEach(function (c) {
      var r = c.getBoundingClientRect();
      if (r.top < vh + 40) { var d = Math.min(n++, 9) * 75; entrar(c, d, { dy: 16 }); interior(c, d); }
      else { c.classList.add('m-wait'); fila.push(c); }
    });
    if (!fila.length) return;
    if (!('IntersectionObserver' in window)) { fila.forEach(function (c) { c.classList.remove('m-wait'); }); return; }
    var lote = 0, t = null;
    io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var c = e.target; io.unobserve(c);
        var d = lote++ * 80; clearTimeout(t); t = setTimeout(function () { lote = 0; }, 120);
        c.classList.remove('m-wait'); entrar(c, d, { dy: 18 }); interior(c, d);
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    fila.forEach(function (c) { io.observe(c); });
  }

  /* ---------- página: indicadores que mudaram ao editar ---------- */
  var SEL = '.kpi .v, .cmp b.t';
  function chave(el, i) { var k = el.closest('.kpi, .cmp'), lab = k && k.querySelector('.lab, .l, h3'); return i + '|' + (lab ? lab.textContent.trim() : ''); }
  function snap(sec) {
    var m = {}; if (!sec) return m;
    arr(sec.querySelectorAll(SEL)).forEach(function (el, i) { m[chave(el, i)] = el.textContent; });
    return m;
  }
  function morph(sec, antes) {
    if (!sec || !antes || off()) return;
    arr(sec.querySelectorAll(SEL)).forEach(function (el, i) {
      var velho = antes[chave(el, i)]; if (velho == null || velho === el.textContent) return;
      var pv = parse(velho), pn = acharNum(el); if (!pv || !pn) return;
      contar(el, 0, pv.v, 650);
      anim(el.closest('.kpi, .cmp') || el, [{ boxShadow: '0 0 0 2px var(--accent)' }, { boxShadow: '0 0 0 2px transparent' }], { duration: 1100, easing: 'ease-out' });
    });
  }

  /* ---------- apresentação: um slide ---------- */
  function slide(root, dir) {
    if (!root || off()) return;
    var frente = dir == null || dir > 0;
    anim(root, [{ opacity: 0, transform: 'translateX(' + (frente ? 24 : -24) + 'px) scale(.992)' }, { opacity: 1, transform: 'none' }], { duration: frente ? 520 : 300, easing: OUT });
    if (!frente) return;
    var capa = root.classList.contains('capa');
    entrar(root.querySelector('.sl-k'), 90, { dy: 10, dur: 480 });
    entrar(root.querySelector('.sl-t'), 160, { dy: capa ? 34 : 22, dur: capa ? 900 : 640 });
    entrar(root.querySelector('.sl-sub'), capa ? 520 : 300, { dy: 12 });
    surgir(root.querySelector('.sl-f'), 400, 600);
    var blocos = arr(root.querySelectorAll('.sb')), notas = blocos.filter(function (b) { return b.classList.contains('sb-nota'); });
    blocos = blocos.filter(function (b) { return notas.indexOf(b) < 0; }).sort(function (a, b) { return (a.offsetTop - b.offsetTop) || (a.offsetLeft - b.offsetLeft); });
    var d = capa ? 700 : 340, fim = d;
    blocos.forEach(function (b, i) {
      var dl = d + i * 130; fim = Math.max(fim, dl);
      if (b.classList.contains('sb-kpis')) { interior(b, dl - 80); fim = Math.max(fim, dl + b.querySelectorAll('.sl-kpi').length * 110); return; }
      if (b.classList.contains('sb-tab')) {
        entrar(b, dl, { dy: 10, dur: 420 });
        var rows = arr(b.querySelectorAll('tbody tr'));
        rows.forEach(function (r, k) { anim(r, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: dl + 140 + Math.min(k, 18) * 42, easing: OUT, fill: 'backwards' }); });
        fim = Math.max(fim, dl + 140 + Math.min(rows.length, 18) * 42);
        return;
      }
      if (b.classList.contains('sb-txt')) {
        entrar(b.querySelector('h3'), dl, { dy: 10 });
        var lis = arr(b.querySelectorAll('li, p'));
        lis.forEach(function (li, k) { entrar(li, dl + 90 + Math.min(k, 10) * 85, { dx: -10, dy: 0, dur: 480 }); });
        if (!lis.length && !b.querySelector('h3')) entrar(b, dl);
        fim = Math.max(fim, dl + 90 + Math.min(lis.length, 10) * 85);
        return;
      }
      entrar(b, dl, { dy: 16 }); interior(b, dl); fim = Math.max(fim, dl + 900);
    });
    notas.forEach(function (n, i) { entrar(n, fim + 250 + i * 120, { dy: 8, dur: 520 }); });
  }

  return { off: off, aba: aba, snap: snap, morph: morph, slide: slide, contar: contar, grafico: grafico, parse: parse, _fmt: fmt };
})();
