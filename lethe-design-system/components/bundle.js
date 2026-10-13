/* @ds-bundle: {"format":4,"namespace":"Lethe","components":[{"name":"Bloom"},{"name":"Thread"},{"name":"Recollection"},{"name":"Button"},{"name":"LightCounter"},{"name":"Overlay"},{"name":"PlantField"},{"name":"Whisper"}]} */
(function () {
  var React = window.React;
  var h = React.createElement;

  /* ---------- seeded randomness: the same memory always grows the same flower ---------- */
  function hashSeed(s) {
    s = String(s == null ? 'lethe' : s);
    var x = 2166136261;
    for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); }
    return x >>> 0;
  }
  function rng(seed) {
    var a = hashSeed(seed);
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function f2(n) { return n.toFixed(2); }
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }

  var KIND_HUE = { sentence: 'sentence', song: 'song', place: 'place', photo: 'light' };
  var STATES = ['vivid', 'fading', 'ghost', 'lost'];

  /* vitality (0–1, from the forgetting curve) to one of the four memory states */
  function stateOf(v) {
    if (v == null) return 'vivid';
    if (v >= 0.6) return 'vivid';
    if (v >= 0.3) return 'fading';
    if (v >= 0.08) return 'ghost';
    return 'lost';
  }
  function hueVar(hue) {
    if (!hue) return 'var(--light)';
    return hue.charAt(0) === '#' ? hue : 'var(--' + hue + ')';
  }
  /* Colour is life: vivid = full colour, fading = half toward fog, ghost = mostly fog, lost = fog. */
  function stateColor(hue, state) {
    var p = { vivid: 100, fading: 50, ghost: 30, lost: 0 }[state];
    if (p === 100) return hueVar(hue);
    if (p === 0) return 'var(--fog)';
    return 'color-mix(in oklab, ' + hueVar(hue) + ' ' + p + '%, var(--fog))';
  }

  function petalPath(len, w, r) {
    var j = function (k) { return (r() - 0.5) * k; };
    var a = w * (1 + j(0.3)), b = w * (0.85 + j(0.3));
    return 'M0,0 C' + f2(a) + ',' + f2(-len * (0.3 + j(0.1))) + ' ' + f2(b) + ',' + f2(-len * (0.82 + j(0.1))) + ' ' + f2(j(w * 0.4)) + ',' + f2(-len) +
      ' C' + f2(-b) + ',' + f2(-len * (0.82 + j(0.1))) + ' ' + f2(-a) + ',' + f2(-len * (0.3 + j(0.1))) + ' 0,0Z';
  }
  function bez(p0, p1, p2, p3, t) {
    var u = 1 - t;
    return { x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
             y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y };
  }
  function useSafeId(prefix) {
    var id = React.useId ? React.useId() : String(Math.random());
    return prefix + id.replace(/[^a-zA-Z0-9_-]/g, '');
  }

  /* ---------- Bloom ---------- */
  /* Draws in a box W wide and 1.5W tall; the flower stands on the ground at the bottom centre. */
  function Bloom(props) {
    var kind = props.kind || 'sentence';
    var seed = props.seed != null ? props.seed : kind;
    var state = props.state || stateOf(props.vitality);
    var W = props.size || 140, H = W * 1.5;
    var hue = props.hue || KIND_HUE[kind] || 'light';
    var gid = useSafeId('ltg');
    var r = rng(seed + ':' + kind);
    var col = stateColor(hue, state);
    var ghost = state === 'ghost', lost = state === 'lost';
    var outline = ghost || lost;
    var lineOp = lost ? 0.12 : ghost ? 'var(--ghost)' : 1;
    var fillOp = { vivid: 0.62, fading: 0.34 }[state] || 0;
    var stemCol = lost ? 'var(--fog)' : 'color-mix(in oklab, ' + col + ' 45%, var(--fog))';
    var anchors = [];
    var els = [];
    var head = { x: 0, y: 0 };
    var key = 0;

    function petal(px, py, ang, len, w, opt) {
      opt = opt || {};
      var rad = ang * Math.PI / 180;
      anchors.push({ x: px + Math.sin(rad) * len, y: py - Math.cos(rad) * len });
      anchors.push({ x: px + Math.sin(rad) * len * 0.5, y: py - Math.cos(rad) * len * 0.5 });
      els.push(h('path', { key: key++, d: petalPath(len, w, r), transform: 'translate(' + f2(px) + ',' + f2(py) + ') rotate(' + f2(ang) + ')',
        fill: outline ? 'none' : col, fillOpacity: fillOp * (opt.back ? 0.55 : 1),
        stroke: col, strokeOpacity: outline ? lineOp : (opt.back ? 0.5 : 0.85), strokeWidth: 0.8 }));
    }
    function stem(d, w) {
      els.push(h('path', { key: key++, d: d, fill: 'none', stroke: stemCol, strokeWidth: w || 1.1, strokeLinecap: 'round',
        strokeOpacity: outline ? lineOp : 0.75 }));
    }
    function bezStem(p0, p1, p2, p3) {
      stem('M' + f2(p0.x) + ',' + f2(p0.y) + ' C' + f2(p1.x) + ',' + f2(p1.y) + ' ' + f2(p2.x) + ',' + f2(p2.y) + ' ' + f2(p3.x) + ',' + f2(p3.y));
      for (var i = 1; i < 6; i++) anchors.push(bez(p0, p1, p2, p3, i / 6));
    }
    function leaf(p, ang, len) {
      els.push(h('path', { key: key++, d: petalPath(len, len * 0.2, r), transform: 'translate(' + f2(p.x) + ',' + f2(p.y) + ') rotate(' + f2(ang) + ')',
        fill: outline ? 'none' : stemCol, fillOpacity: outline ? 0 : 0.35, stroke: stemCol, strokeOpacity: outline ? lineOp : 0.6, strokeWidth: 0.7 }));
    }

    if (kind === 'song') {
      /* spiral stem twining upward; a bell hanging from an arching pedicel */
      var top = -H * 0.7, turns = 1.8 + r() * 0.8, ph = r() * Math.PI * 2, A = W * 0.07;
      var pts = [];
      for (var i = 0; i <= 48; i++) {
        var tt = i / 48;
        pts.push({ x: A * Math.sin(tt * turns * Math.PI * 2 + ph) * (0.35 + 0.65 * tt), y: top * tt });
      }
      stem('M' + pts.map(function (p) { return f2(p.x) + ',' + f2(p.y); }).join(' L'), 1.1);
      for (var q = 4; q < pts.length; q += 6) anchors.push(pts[q]);
      leaf(pts[14], -55 - r() * 20, W * 0.16);
      leaf(pts[26], 50 + r() * 20, W * 0.13);
      var P = pts[pts.length - 1], dir = r() > 0.5 ? 1 : -1;
      var B = { x: P.x + W * 0.17 * dir, y: P.y + W * 0.05 };
      stem('M' + f2(P.x) + ',' + f2(P.y) + ' Q' + f2(P.x + W * 0.1 * dir) + ',' + f2(P.y - W * 0.14) + ' ' + f2(B.x) + ',' + f2(B.y), 1);
      var L = W * 0.33, w0 = W * 0.05, w1 = W * 0.18, tilt = dir * (8 + r() * 14);
      var lip = '', lobes = 4;
      for (var k = 0; k < lobes; k++) {
        var xa = -w1 + (2 * w1) * (k + 0.5) / lobes, xb = -w1 + (2 * w1) * (k + 1) / lobes;
        lip += ' Q' + f2(xa) + ',' + f2(L + W * 0.03) + ' ' + f2(xb) + ',' + f2(L);
      }
      var bell = 'M' + f2(-w0) + ',0 C' + f2(-w0 * 1.6) + ',' + f2(L * 0.45) + ' ' + f2(-w1 * 0.8) + ',' + f2(L * 0.72) + ' ' + f2(-w1) + ',' + f2(L) +
        lip + ' C' + f2(w1 * 0.8) + ',' + f2(L * 0.72) + ' ' + f2(w0 * 1.6) + ',' + f2(L * 0.45) + ' ' + f2(w0) + ',0Z';
      els.push(h('g', { key: key++, transform: 'translate(' + f2(B.x) + ',' + f2(B.y) + ') rotate(' + f2(tilt) + ')' },
        h('path', { d: bell, fill: outline ? 'none' : col, fillOpacity: fillOp, stroke: col, strokeOpacity: outline ? lineOp : 0.9, strokeWidth: 0.9 }),
        h('path', { d: 'M0,' + f2(L * 0.35) + ' Q' + f2(W * 0.01) + ',' + f2(L * 0.8) + ' 0,' + f2(L * 1.12), fill: 'none', stroke: lost ? 'var(--fog)' : 'var(--light)',
          strokeWidth: 0.7, strokeOpacity: outline ? lineOp : 0.8 }),
        outline ? null : h('circle', { cx: 0, cy: L * 1.14, r: 1.6, fill: 'var(--light)' })));
      var tr = tilt * Math.PI / 180;
      head = { x: B.x - Math.sin(tr) * L * 0.6, y: B.y + Math.cos(tr) * L * 0.6 };
      for (var a1 = 0; a1 < 8; a1++) anchors.push({ x: head.x + (r() - 0.5) * w1 * 2, y: head.y + (r() - 0.5) * L * 0.8 });
    } else if (kind === 'place') {
      /* a low cluster of many small petals, close to the ground */
      var rx = W * 0.34, ry = H * 0.12;
      head = { x: 0, y: -ry * 0.9 };
      for (var s = 0; s < 6; s++) {
        var sx = (r() - 0.5) * rx * 1.4;
        stem('M' + f2(sx * 0.3) + ',0 Q' + f2(sx * 0.5) + ',' + f2(-ry * 0.5) + ' ' + f2(sx) + ',' + f2(-ry * (0.6 + r() * 0.5)), 0.8);
      }
      leaf({ x: -rx * 0.35, y: 0 }, -70, W * 0.14);
      leaf({ x: rx * 0.35, y: 0 }, 72, W * 0.13);
      var nf = 22 + Math.floor(r() * 12);
      for (var fI = 0; fI < nf; fI++) {
        var ux = (r() * 2 - 1);
        var fx = ux * rx, fy = -ry * Math.sqrt(1 - ux * ux) * (0.35 + r() * 0.75) - ry * 0.25;
        var pl = 3.5 + r() * 3, rot = r() * 72;
        for (var pI = 0; pI < 5; pI++) {
          var ang = rot + pI * 72, rad = ang * Math.PI / 180;
          els.push(h('ellipse', { key: key++, cx: f2(fx + Math.sin(rad) * pl * 0.55), cy: f2(fy - Math.cos(rad) * pl * 0.55), rx: f2(pl * 0.32), ry: f2(pl * 0.55),
            transform: 'rotate(' + f2(ang) + ' ' + f2(fx + Math.sin(rad) * pl * 0.55) + ' ' + f2(fy - Math.cos(rad) * pl * 0.55) + ')',
            fill: outline ? 'none' : col, fillOpacity: fillOp + 0.1, stroke: col, strokeOpacity: outline ? lineOp : 0.8, strokeWidth: 0.5 }));
        }
        if (!outline) els.push(h('circle', { key: key++, cx: f2(fx), cy: f2(fy), r: 0.9, fill: 'var(--light)', opacity: state === 'vivid' ? 0.9 : 0.5 }));
        anchors.push({ x: fx, y: fy });
      }
    } else if (kind === 'photo') {
      /* a wide cupped bloom on a medium stem */
      var hy = -H * 0.52, hx = (r() - 0.5) * W * 0.1;
      var p0 = { x: 0, y: 0 }, p1 = { x: (r() - 0.5) * W * 0.2, y: hy * 0.35 }, p2 = { x: hx + (r() - 0.5) * W * 0.15, y: hy * 0.7 }, p3 = { x: hx, y: hy };
      bezStem(p0, p1, p2, p3);
      leaf(bez(p0, p1, p2, p3, 0.35), (r() > 0.5 ? 1 : -1) * (55 + r() * 15), W * 0.2);
      head = { x: hx, y: hy - W * 0.12 };
      var cupL = W * 0.3;
      [-62, -22, 22, 62].forEach(function (a) { petal(hx, hy, a + (r() - 0.5) * 8, cupL * (0.9 + r() * 0.15), cupL * 0.62, { back: true }); });
      [-36, 0, 36].forEach(function (a) { petal(hx, hy, a + (r() - 0.5) * 8, cupL * (0.78 + r() * 0.12), cupL * 0.6); });
      els.push(h('path', { key: key++, d: 'M' + f2(hx - W * 0.06) + ',' + f2(hy - 2) + ' Q' + f2(hx) + ',' + f2(hy + W * 0.06) + ' ' + f2(hx + W * 0.06) + ',' + f2(hy - 2),
        fill: 'none', stroke: stemCol, strokeWidth: 1, strokeOpacity: outline ? lineOp : 0.8 }));
      if (!outline) for (var st = 0; st < 7; st++) {
        var sxp = hx + (r() - 0.5) * W * 0.16, syp = hy - cupL * (0.55 + r() * 0.2);
        els.push(h('line', { key: key++, x1: f2(hx + (sxp - hx) * 0.3), y1: f2(hy - cupL * 0.2), x2: f2(sxp), y2: f2(syp), stroke: 'var(--light)', strokeWidth: 0.5, strokeOpacity: 0.6 }));
        els.push(h('circle', { key: key++, cx: f2(sxp), cy: f2(syp), r: 1.1, fill: 'var(--light)', opacity: 0.9 }));
      }
    } else {
      /* sentence: a tall single stem with a few long petals */
      var shy = -H * 0.8, shx = (r() - 0.5) * W * 0.16;
      var q0 = { x: 0, y: 0 }, q1 = { x: (r() - 0.5) * W * 0.25, y: shy * 0.3 }, q2 = { x: shx + (r() - 0.5) * W * 0.25, y: shy * 0.62 }, q3 = { x: shx, y: shy };
      bezStem(q0, q1, q2, q3);
      leaf(bez(q0, q1, q2, q3, 0.22), -48 - r() * 18, W * 0.24);
      leaf(bez(q0, q1, q2, q3, 0.42), 44 + r() * 18, W * 0.2);
      head = { x: shx, y: shy };
      var np = 4 + Math.floor(r() * 3), spin = r() * 360;
      for (var pi = 0; pi < np; pi++) {
        var pa = spin + (360 / np) * pi + (r() - 0.5) * 22;
        var droop = Math.cos((pa % 360) * Math.PI / 180) < 0 ? 0.9 : 1;
        petal(shx, shy, pa, W * (0.27 + r() * 0.08) * droop, W * 0.045);
      }
      if (!outline) els.push(h('circle', { key: key++, cx: f2(shx), cy: f2(shy), r: 2.6, fill: 'var(--light)' }));
    }

    /* lost: the shape dissolves into drifting particles */
    var motes = null;
    if (lost) {
      var mr = rng(seed + ':motes');
      motes = h('g', { className: 'lt-motes' }, anchors.slice(0, 44).map(function (p, i) {
        return h('circle', { key: i, cx: f2(p.x), cy: f2(p.y), r: f2(0.7 + mr() * 1.1), fill: 'var(--fog)',
          style: { '--dx': f2((mr() - 0.3) * W * 0.35) + 'px', '--dy': f2(-W * (0.1 + mr() * 0.3)) + 'px',
            animationDelay: f2(-mr() * 9) + 's', animationDuration: f2(7 + mr() * 6) + 's' } });
      }));
    }

    var halo = state === 'vivid' ? 0.5 : state === 'fading' ? 0.2 : 0;
    var label = props.label;
    return h('svg', {
      className: cx('lt-bloom', 'is-' + state, props.className),
      width: W, height: H, viewBox: f2(-W / 2) + ' ' + f2(-H) + ' ' + W + ' ' + H,
      role: label ? 'img' : null, 'aria-label': label || null, 'aria-hidden': label ? null : true,
      style: props.style
    },
      halo ? h('defs', null, h('radialGradient', { id: gid },
        h('stop', { offset: '0%', style: { stopColor: col, stopOpacity: halo } }),
        h('stop', { offset: '100%', style: { stopColor: col, stopOpacity: 0 } }))) : null,
      halo ? h('ellipse', { className: 'lt-bloom-halo', cx: f2(head.x), cy: f2(head.y), rx: f2(W * 0.48), ry: f2(kind === 'place' ? H * 0.2 : W * 0.48),
        fill: 'url(#' + gid + ')', style: { transformOrigin: f2(head.x) + 'px ' + f2(head.y) + 'px' } }) : null,
      h('g', { className: 'lt-bloom-body' }, els),
      motes);
  }

  /* ---------- Thread: draw inside an <svg> ---------- */
  function Thread(props) {
    var a = props.from || { x: 0, y: 0 }, b = props.to || { x: 100, y: 0 };
    var s = clamp(props.strength == null ? 0.7 : props.strength, 0, 1);
    var dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
    var bow = len * 0.18 * (props.flip ? -1 : 1);
    var nx = dy / len, ny = -dx / len;
    if (ny > 0) { nx = -nx; ny = -ny; } /* arc upward by default */
    var mx = (a.x + b.x) / 2 + nx * bow, my = (a.y + b.y) / 2 + ny * bow;
    var d = 'M' + f2(a.x) + ',' + f2(a.y) + ' Q' + f2(mx) + ',' + f2(my) + ' ' + f2(b.x) + ',' + f2(b.y);
    return h('g', { className: 'lt-thread', 'aria-hidden': true },
      h('path', { d: d, fill: 'none', stroke: 'var(--thread)', strokeWidth: 3 + 6 * s, strokeOpacity: 0.02 + 0.06 * s, strokeLinecap: 'round' }),
      h('path', { d: d, fill: 'none', stroke: 'var(--thread)', strokeWidth: 1.5 + 1.5 * s, strokeOpacity: 0.04 + 0.1 * s, strokeLinecap: 'round' }),
      h('path', { d: d, fill: 'none', stroke: 'var(--thread)', strokeWidth: 0.5 + 0.4 * s, strokeOpacity: 0.12 + 0.6 * s, strokeLinecap: 'round' }),
      s > 0.3 ? h('path', { d: d, className: 'lt-thread-motes', fill: 'none', stroke: 'var(--thread)', strokeWidth: 1.4, strokeOpacity: 0.25 + 0.5 * s,
        strokeLinecap: 'round', strokeDasharray: '0.1 ' + Math.round(30 - 14 * s) }) : null);
  }

  /* ---------- Recollection ---------- */
  /* quoted speech goes italic; ghost and lost states lose words */
  function memoryText(text, state, seed) {
    var r = rng('words:' + (seed || text));
    var drop = state === 'ghost' ? 0.4 : state === 'lost' ? 0.85 : 0;
    var parts = String(text || '').split(/(“[^”]*”|"[^"]*")/);
    var n = 0;
    return parts.map(function (part, pi) {
      if (!part) return null;
      var speech = /^[“"]/.test(part);
      var words = part.split(/(\s+)/).map(function (wd, wi) {
        if (!wd || /^\s+$/.test(wd)) return wd;
        var first = n++ === 0;
        if (drop && !first && r() < drop) return h('span', { key: wi, className: 'lt-gap', style: { width: Math.max(2, wd.length * 0.45) + 'em' } });
        return wd;
      });
      return speech ? h('em', { key: pi, className: 'lt-speech' }, words) : h(React.Fragment, { key: pi }, words);
    });
  }
  function Recollection(props) {
    var state = props.state || stateOf(props.vitality);
    var bits = [props.kind, props.planted ? 'planted ' + props.planted : null, state].filter(Boolean);
    var lg = props.size === 'lg';
    return h('figure', { className: cx('lt-recollection', lg && 'is-lg', 'is-' + state, props.className), style: props.style },
      props.children ? h('div', { className: 'lt-recollection-media' }, props.children) : null,
      h('blockquote', { className: lg ? 'memory-lg' : 'memory', 'aria-label': state === 'ghost' || state === 'lost' ? 'a memory with words missing' : null },
        memoryText(props.text, state, props.seed)),
      h('figcaption', { className: 'interface-sm' }, bits.join(' · ')),
      props.heldBy && props.heldBy.length ? h('div', { className: 'interface-sm' }, 'held by ' + props.heldBy.join(' · ')) : null,
      props.actions ? h('div', { className: 'lt-recollection-actions' }, props.actions) : null);
  }

  /* ---------- Button ---------- */
  function Button(props) {
    var rest = Object.assign({}, props);
    var variant = rest.variant; delete rest.variant;
    var cls = rest.className; delete rest.className;
    return h('button', Object.assign({ type: 'button' }, rest, {
      className: cx('lt-btn', 'interface', variant === 'pill' ? 'is-pill' : 'is-text', cls)
    }), props.children);
  }

  /* ---------- LightCounter ---------- */
  function LightCounter(props) {
    var max = props.max == null ? 5 : props.max;
    var val = clamp(props.value == null ? 0 : props.value, 0, max);
    var dots = [];
    for (var i = 0; i < max; i++) dots.push(h('span', { key: i, className: cx('lt-light-dot', i < val && 'is-lit') }));
    return h('div', { className: cx('lt-light', props.className), role: 'img', 'aria-label': val + ' of ' + max + ' light', style: props.style },
      h('span', { className: 'lt-light-dots', 'aria-hidden': true }, dots),
      props.showLabel ? h('span', { className: 'interface-sm lt-light-label', 'aria-hidden': true }, val + ' of ' + max + ' light') : null);
  }

  /* ---------- Overlay ---------- */
  function Overlay(props) {
    return h('section', { className: cx('lt-overlay', props.className), role: props.role || 'dialog', 'aria-label': props.title || props['aria-label'] || null,
      style: Object.assign({ width: props.width || null }, props.style) },
      props.title ? h('h2', { className: 'title lt-overlay-title' }, props.title) : null,
      h('div', { className: 'lt-overlay-body' }, props.children),
      props.actions ? h('div', { className: 'lt-overlay-actions' }, props.actions) : null);
  }

  /* ---------- PlantField ---------- */
  var KINDS = ['sentence', 'photo', 'song', 'place'];
  var PLACEHOLDER = { sentence: 'a sentence you want to keep', photo: 'what is in the photograph', song: 'a song, and where you heard it', place: 'a place, and who was there' };
  function PlantField(props) {
    var st = React.useState(props.defaultKind || 'sentence'); var kindS = st[0], setKindS = st[1];
    var vt = React.useState(''); var val = vt[0], setVal = vt[1];
    var kind = props.kind || kindS;
    function pick(k) { setKindS(k); if (props.onKindChange) props.onKindChange(k); }
    function submit(e) { e.preventDefault(); if (!val.trim()) return; if (props.onPlant) props.onPlant({ kind: kind, text: val.trim() }); setVal(''); }
    return h('form', { className: cx('lt-plant', props.className), onSubmit: submit, style: Object.assign({ '--lt-hue': hueVar(KIND_HUE[kind]) }, props.style) },
      h('div', { className: 'lt-plant-kinds', role: 'radiogroup', 'aria-label': 'kind of memory' },
        KINDS.map(function (k) {
          return h('button', { key: k, type: 'button', role: 'radio', 'aria-checked': k === kind, className: cx('lt-kind', 'interface-sm', k === kind && 'is-on'),
            style: { '--lt-hue': hueVar(KIND_HUE[k]) }, onClick: function () { pick(k); } }, k);
        })),
      h('div', { className: 'lt-plant-row' },
        h('span', { className: 'lt-plant-seed', 'aria-hidden': true }),
        h('input', { className: 'memory lt-plant-input', value: val, placeholder: props.placeholder || PLACEHOLDER[kind],
          'aria-label': 'the memory', onChange: function (e) { setVal(e.target.value); } }),
        h(Button, { type: 'submit', variant: 'pill', disabled: !val.trim() }, 'plant')));
  }

  /* ---------- Whisper ---------- */
  function Whisper(props) {
    return h('p', { className: cx('lt-whisper', 'interface', props.visible === false && 'is-gone', props.className), role: 'status', style: props.style }, props.children);
  }

  window.Lethe = { Bloom: Bloom, Thread: Thread, Recollection: Recollection, Button: Button, LightCounter: LightCounter, Overlay: Overlay,
    PlantField: PlantField, Whisper: Whisper, stateOf: stateOf, stateColor: stateColor, STATES: STATES };
})();
