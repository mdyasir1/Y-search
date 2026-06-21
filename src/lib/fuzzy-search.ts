import { ratio, partial_ratio } from 'fuzzball'

export type SearchMode = 'exact' | 'related' | 'spelling'

export interface SearchResult {
  indices: number[]
  total: number
}

const NORM_MAP: Record<string, string> = {
  'ప': 'ఫ', 'ఫ': 'ప',
  'బ': 'భ', 'భ': 'బ',
  'త': 'ద', 'ద': 'త',
  'థ': 'ధ', 'ధ': 'థ',
  'ట': 'డ', 'డ': 'ట',
  'ఠ': 'ఢ', 'ఢ': 'ఠ',
  'క': 'గ', 'గ': 'క',
  'ఖ': 'ఘ', 'ఘ': 'ఖ',
  'చ': 'జ', 'జ': 'చ',
  'ఛ': 'ఝ', 'ఝ': 'ఛ',
  'శ': 'స', 'స': 'శ',
  'ష': 'స',
}

const TELUGU_VARGA: Record<string, string[]> = {
  క: ['క', 'ఖ', 'గ', 'ఘ', 'ఙ'], ఖ: ['క', 'ఖ', 'గ', 'ఘ', 'ఙ'],
  గ: ['క', 'ఖ', 'గ', 'ఘ', 'ఙ'], ఘ: ['క', 'ఖ', 'గ', 'ఘ', 'ఙ'],
  ఙ: ['క', 'ఖ', 'గ', 'ఘ', 'ఙ'],
  చ: ['చ', 'ఛ', 'జ', 'ఝ', 'ఞ'], ఛ: ['చ', 'ఛ', 'జ', 'ఝ', 'ఞ'],
  జ: ['చ', 'ఛ', 'జ', 'ఝ', 'ఞ'], ఝ: ['చ', 'ఛ', 'జ', 'ఝ', 'ఞ'],
  ఞ: ['చ', 'ఛ', 'జ', 'ఝ', 'ఞ'],
  ట: ['ట', 'ఠ', 'డ', 'ఢ', 'ణ'], ఠ: ['ట', 'ఠ', 'డ', 'ఢ', 'ణ'],
  డ: ['ట', 'ఠ', 'డ', 'ఢ', 'ణ'], ఢ: ['ట', 'ఠ', 'డ', 'ఢ', 'ణ'],
  ణ: ['ట', 'ఠ', 'డ', 'ఢ', 'ణ'],
  త: ['త', 'థ', 'ద', 'ధ', 'న'], థ: ['త', 'థ', 'ద', 'ధ', 'న'],
  ద: ['త', 'థ', 'ద', 'ధ', 'న'], ధ: ['త', 'థ', 'ద', 'ధ', 'న'],
  న: ['త', 'థ', 'ద', 'ధ', 'న'],
  ప: ['ప', 'ఫ', 'బ', 'భ', 'మ'], ఫ: ['ప', 'ఫ', 'బ', 'భ', 'మ'],
  బ: ['ప', 'ఫ', 'బ', 'భ', 'మ'], భ: ['ప', 'ఫ', 'బ', 'భ', 'మ'],
  మ: ['ప', 'ఫ', 'బ', 'భ', 'మ'],
  శ: ['శ', 'ష', 'స'], ష: ['శ', 'ష', 'స'], స: ['శ', 'ష', 'స'],
}

function cleanTelugu(s: string): string {
  return s.replace(/్/g, '').normalize('NFC')
}

function normalizeVarga(s: string): string {
  return s.split('').map(c => NORM_MAP[c] || c).join('')
}

function prefixBonus(query: string, name: string): number {
  if (!query || !name) return 0
  const qc = query[0], nc = name[0]
  if (qc === nc) return 18
  const v = TELUGU_VARGA[qc]
  if (v && v.includes(nc)) return 10
  return 0
}

function tokenBonus(query: string, name: string): number {
  const qt = query.split(/\s+/).filter(Boolean)
  const nt = name.split(/\s+/).filter(Boolean)
  if (!qt.length || !nt.length) return 0
  let matches = 0
  for (const t of qt) {
    if (nt.some(x => x.includes(t) || t.includes(x))) matches++
  }
  return (matches / qt.length) * 20
}

function strippedScore(query: string, name: string): number {
  const stripped = name.replace(/^[^\s]+\.\s*/, '')
  if (stripped === name) return 0
  const cq = cleanTelugu(query)
  const cs = cleanTelugu(stripped)
  const nq = normalizeVarga(cq)
  const ns = normalizeVarga(cs)
  return Math.max(ratio(cq, cs), ratio(nq, ns)) * 0.70
}

function smartScore(query: string, name: string): number {
  const cq = cleanTelugu(query), cn = cleanTelugu(name)
  const nq = normalizeVarga(cq), nn = normalizeVarga(cn)

  const cr = ratio(cq, cn)
  const nr = ratio(nq, nn)
  const pnr = partial_ratio(nq, nn)
  const pb = prefixBonus(query, name)
  const tb = tokenBonus(query, name)
  const ss = strippedScore(query, name)

  let s = cr * 0.30 + nr * 0.30 + pnr * 0.10 + pb + tb
  if (ss > s * 0.6) s = Math.max(s, ss + 5)
  return s
}

export function searchVoters(
  names: string[],
  query: string,
  mode: SearchMode,
): SearchResult {
  if (!query.trim()) return { indices: [], total: 0 }

  const q = query.trim()

  if (mode === 'exact') {
    const indices: number[] = []
    for (let i = 0; i < names.length; i++) {
      if (names[i].includes(q)) indices.push(i)
    }
    return { indices, total: indices.length }
  }

  const exactSet = new Set<number>()
  for (let i = 0; i < names.length; i++) {
    if (names[i].includes(q)) exactSet.add(i)
  }

  const scored: { idx: number; score: number }[] = []
  const cutoff = mode === 'related' ? 45 : 35

  for (let i = 0; i < names.length; i++) {
    if (exactSet.has(i)) continue
    const score = smartScore(q, names[i])
    if (score > cutoff) scored.push({ idx: i, score })
  }

  scored.sort((a, b) => b.score - a.score)
  return { indices: scored.map(s => s.idx), total: scored.length }
}
