// Placar. Usa o Supabase (REST/PostgREST via fetch) quando configurado;
// senão, cai no localStorage. Mesma interface pros dois casos.

import { SUPABASE_URL, SUPABASE_ANON_KEY, SCORES_TABLE, hasGlobalLeaderboard } from '../config.js'

const LOCAL_KEY = 'marchas_scores_v1'
const TOP_N = 20

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]')
  } catch (_) {
    return []
  }
}

function writeLocal(rows) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(rows.slice(0, 100)))
}

function sortRows(rows) {
  return [...rows].sort((a, b) => b.score - a.score).slice(0, TOP_N)
}

// Faz a chamada com apikey + Bearer; se der 401 (comum com o formato novo de
// chave, que não é JWT), tenta de novo só com o header apikey.
async function sbFetch(path, init = {}, extraHeaders = {}) {
  const base = { apikey: SUPABASE_ANON_KEY, ...extraHeaders }
  let res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...base, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  })
  if (res.status === 401) {
    res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: base })
  }
  return res
}

async function fetchGlobal() {
  const path =
    `${SCORES_TABLE}?select=name,score,mode,created_at&order=score.desc&limit=${TOP_N}`
  const res = await sbFetch(path)
  if (!res.ok) throw new Error(`leaderboard fetch ${res.status}`)
  return res.json()
}

async function insertGlobal(entry) {
  const res = await sbFetch(
    SCORES_TABLE,
    {
      method: 'POST',
      body: JSON.stringify({ name: entry.name, score: entry.score, mode: entry.mode }),
    },
    { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
  )
  if (!res.ok) throw new Error(`leaderboard insert ${res.status}`)
}

// Retorna { rows, source: 'global' | 'local' }
export async function getTopScores() {
  if (hasGlobalLeaderboard()) {
    try {
      const rows = await fetchGlobal()
      return { rows, source: 'global' }
    } catch (e) {
      console.warn('Placar global indisponível, usando local:', e)
    }
  }
  return { rows: sortRows(readLocal()), source: 'local' }
}

// Salva um score. Retorna { source, rows } com o ranking já atualizado.
export async function submitScore({ name, score, mode }) {
  const entry = {
    name: String(name).toUpperCase().slice(0, 3).padEnd(3, ' ').trim() || 'AAA',
    score: Math.max(0, Math.min(100000, Math.round(score))),
    mode: mode === 'hard' ? 'hard' : 'easy',
    created_at: new Date().toISOString(),
  }

  // Sempre guarda uma cópia local (histórico do aparelho).
  const local = readLocal()
  local.push(entry)
  writeLocal(local)

  if (hasGlobalLeaderboard()) {
    try {
      await insertGlobal(entry)
      const rows = await fetchGlobal()
      return { source: 'global', rows, entry }
    } catch (e) {
      console.warn('Falha ao enviar pro placar global, ficou só local:', e)
    }
  }
  return { source: 'local', rows: sortRows(readLocal()), entry }
}
