import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import postcss from 'postcss';
const css = postcss.parse(fs.readFileSync('src/styles/tokens.css', 'utf8'));
function palette(selector) {
  let out = {};
  css.walkRules((rule) => {
    if (rule.selector === selector)
      rule.walkDecls((d) => {
        if (d.prop.startsWith('--')) out[d.prop.slice(2)] = d.value;
      });
  });
  return out;
}
function luminance(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const rgb = [0, 2, 4]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a, b) {
  const la = luminance(a),
    lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
for (const [name, selector] of [
  ['light', ':root'],
  ['dark', ":root[data-theme='dark']"],
])
  test(name + ' text and interactive labels meet 4.5:1 on their theme surfaces', () => {
    const p = palette(selector);
    const pairs = [];
    for (const fg of ['ink', 'muted'])
      for (const bg of [
        'bg',
        'surface',
        'surface-subtle',
        'rose-soft',
        'sage-soft',
        'lavender-soft',
        'peach-soft',
      ])
        pairs.push([fg, bg]);
    pairs.push(
      ['accent', 'rose-soft'],
      ['sage', 'sage-soft'],
      ['lavender', 'lavender-soft'],
      ['peach', 'peach-soft'],
      ['danger', 'rose-soft'],
      ['on-accent', 'accent'],
    );
    for (const [fg, bg] of pairs) {
      const ratio = contrast(p[fg], p[bg]);
      assert.ok(ratio >= 4.5, fg + ' / ' + bg + ' contrast: ' + ratio.toFixed(2));
    }
  });
test('feature styles do not use border or decorative accent tokens as text colors', () => {
  for (const name of fs.readdirSync('src/styles/features').filter((f) => f.endsWith('.css'))) {
    const parsed = postcss.parse(fs.readFileSync('src/styles/features/' + name, 'utf8'));
    parsed.walkDecls('color', (d) =>
      assert.ok(
        !['var(--border)', 'var(--accent-light)'].includes(d.value),
        name + ': ' + d.parent.selector,
      ),
    );
  }
});
