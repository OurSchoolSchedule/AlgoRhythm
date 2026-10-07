import { SUBJECT_KEYS, colors } from '@/constants/colors.js'

const NAME_TO_KEY = {
  국어: 'rose',
  수학: 'sky',
  영어: 'violet',
  사회: 'yellow',
  과학: 'lime',
  체육: 'cyan',
  음악: 'sand',
  미술: 'sand',
  기술가정: 'sand',
  '기술·가정': 'sand',
  기가: 'sand',
}

function normalizeName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, '')
}

/** @param {string | number | null | undefined} seed */
export function hashSubjectKey(seed) {
  const raw = String(seed ?? '')
  let hash = 0
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0
  }
  return SUBJECT_KEYS[hash % SUBJECT_KEYS.length]
}

/**
 * @param {{ id?: string | number | null, name?: string | null, subject?: string | null, subjectId?: string | number | null, subjectName?: string | null }} [input]
 * @returns {{ key: string, bg: string, text: string, dot: string }}
 */
export function resolveSubjectColor(input = {}) {
  const name = normalizeName(input.name ?? input.subject ?? input.subjectName)
  const id = input.id ?? input.subjectId ?? null
  const mapped = NAME_TO_KEY[name]
  const key = mapped || hashSubjectKey(id != null ? id : name || 'slate')
  const token = colors.subject[key] || colors.subject.slate
  return { key, bg: token.bg, text: token.text, dot: token.dot }
}
