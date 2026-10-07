#!/usr/bin/env node
/**
 * 라이트 hex 쌍 + 다크 color-mix 파생 대비 ≥ 4.5 검증.
 */
import { SUBJECT_HEX, SEMANTIC_HEX } from '../src/constants/colors.js'

const SURFACE_DARK = '#181b1f'
const WHITE = '#ffffff'
const MIN = 4.5

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  }
}

function channel(c) {
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance(hex) {
  const { r, g, b } = hexToRgb(hex)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(a, b) {
  const la = luminance(a)
  const lb = luminance(b)
  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)
  return (lighter + 0.05) / (darker + 0.05)
}

function mix(fgHex, pct, bgHex) {
  const fg = hexToRgb(fgHex)
  const bg = hexToRgb(bgHex)
  const t = pct / 100
  const toHex = (n) => Math.round(n * 255).toString(16).padStart(2, '0')
  const r = fg.r * t + bg.r * (1 - t)
  const g = fg.g * t + bg.g * (1 - t)
  const b = fg.b * t + bg.b * (1 - t)
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function row(label, fg, bg) {
  const ratio = contrast(fg, bg)
  return {
    label,
    fg,
    bg,
    ratio: Number(ratio.toFixed(2)),
    pass: ratio >= MIN,
  }
}

const rows = []

for (const [name, palette] of Object.entries(SUBJECT_HEX)) {
  rows.push(row(`subject/${name} light text on bg`, palette.text, palette.bg))
}

for (const [name, palette] of Object.entries(SEMANTIC_HEX)) {
  rows.push(row(`semantic/${name} light text on subtle`, palette.text, palette.subtle))
}
// 버튼 흰 글자는 solid(#27a859, 3.07:1)가 아니라 text(#18753c) 배경을 쓴다.
rows.push(row('semantic/primary light white on button(text)', WHITE, SEMANTIC_HEX.primary.text))

for (const [name, palette] of Object.entries(SUBJECT_HEX)) {
  const bg = mix(palette.dot, 18, SURFACE_DARK)
  let textPct = 55
  let text = mix(palette.dot, textPct, WHITE)
  if (contrast(text, bg) < MIN) {
    textPct = 65
    text = mix(palette.dot, textPct, WHITE)
  }
  rows.push(row(`subject/${name} dark text(${textPct}%) on bg`, text, bg))
}

for (const [name, palette] of Object.entries(SEMANTIC_HEX)) {
  const subtle = mix(palette.solid, 18, SURFACE_DARK)
  let textPct = 55
  let text = mix(palette.solid, textPct, WHITE)
  if (contrast(text, subtle) < MIN) {
    textPct = 65
    text = mix(palette.solid, textPct, WHITE)
  }
  rows.push(row(`semantic/${name} dark text(${textPct}%) on subtle`, text, subtle))
}

const failed = rows.filter((r) => !r.pass)
console.log('pair\tfg\tbg\tratio\tpass')
for (const r of rows) {
  console.log(`${r.label}\t${r.fg}\t${r.bg}\t${r.ratio}\t${r.pass ? 'OK' : 'FAIL'}`)
}
console.log(`\n${rows.length - failed.length}/${rows.length} pairs ≥ ${MIN}:1`)
if (failed.length) {
  console.error('Failed pairs:')
  for (const r of failed) console.error(`- ${r.label}: ${r.ratio}`)
  process.exit(1)
}
