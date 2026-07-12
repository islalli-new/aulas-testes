import { useEffect, useState } from 'react'
import { getTopScores } from '../game/leaderboard.js'

export default function Leaderboard({ initial, highlight, onBack }) {
  const [rows, setRows] = useState(initial?.rows || [])
  const [source, setSource] = useState(initial?.source || 'local')
  const [loading, setLoading] = useState(!initial)

  useEffect(() => {
    if (initial) return
    getTopScores().then(({ rows, source }) => {
      setRows(rows)
      setSource(source)
      setLoading(false)
    })
  }, [initial])

  const isMe = (r) =>
    highlight &&
    r.name === highlight.name &&
    r.score === highlight.score &&
    r.mode === highlight.mode

  return (
    <div className="leaderboard crt">
      <div className="scanlines" />
      <h2 className="lb-title">🏆 PLACAR</h2>
      <div className="lb-source">
        {source === 'global' ? 'RANKING GLOBAL' : 'RANKING DESTE APARELHO'}
      </div>

      {loading ? (
        <div className="lb-loading">CARREGANDO…</div>
      ) : rows.length === 0 ? (
        <div className="lb-empty">SEJA O PRIMEIRO! JOGUE E DEIXE SEU NOME.</div>
      ) : (
        <div className="lb-list">
          {rows.map((r, i) => (
            <div key={i} className={`lb-row ${isMe(r) ? 'me' : ''}`}>
              <span className="lb-rank">{i + 1}</span>
              <span className="lb-name">{r.name}</span>
              <span className={`lb-mode ${r.mode}`}>{r.mode === 'hard' ? 'DIF' : 'FÁC'}</span>
              <b className="lb-score">{String(r.score).padStart(5, '0')}</b>
            </div>
          ))}
        </div>
      )}

      <button className="big-btn" onClick={onBack}>
        ◀ VOLTAR
      </button>
    </div>
  )
}
