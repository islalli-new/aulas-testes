import { useState } from 'react'
import { submitScore } from '../game/leaderboard.js'
import { RATING_COLOR } from '../game/engine.js'
import { sfx } from '../game/audio.js'

const GAME_URL = 'https://islalli-new.github.io/aulas-testes/'
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' // sequência que rola no toque

export default function Results({ run, onSubmitted, onReplay }) {
  const [idx, setIdx] = useState([0, 0, 0]) // índice de cada slot em CHARS
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const initials = idx.map((i) => CHARS[i]).join('')

  // cada toque no slot rola a letra pra frente (A→Z→0→9, em loop)
  const roll = (slot) => {
    sfx.select()
    setIdx((prev) => prev.map((v, i) => (i === slot ? (v + 1) % CHARS.length : v)))
  }

  const save = async () => {
    if (saving || saved) return
    setSaving(true)
    sfx.select()
    const { rows, source, entry } = await submitScore({
      name: initials,
      score: run.total,
      mode: run.mode,
    })
    setSaved(true)
    setSaving(false)
    onSubmitted({ rows, source, entry })
  }

  const share = async () => {
    const text = `Fiz ${run.total} pontos no CORTA GIRO (modo ${
      run.mode === 'hard' ? 'DIFÍCIL' : 'FÁCIL'
    })! Consegue mais? 🏁`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'CORTA GIRO', text, url: GAME_URL })
      } else {
        await navigator.clipboard.writeText(`${text} ${GAME_URL}`)
        alert('Link copiado! Cola no WhatsApp 😉')
      }
    } catch (_) {}
  }

  return (
    <div className="results crt">
      <div className="scanlines" />
      <h2 className="res-title">FIM DE JOGO</h2>
      <div className="res-total">
        <span>PONTUAÇÃO</span>
        <b>{String(run.total).padStart(5, '0')}</b>
      </div>

      <div className="res-breakdown">
        {run.shifts.map((s, i) => (
          <div key={i} className="res-row">
            <span>MARCHA {s.gear}→{s.gear + 1}</span>
            <span style={{ color: RATING_COLOR[s.rating] }}>{s.rating}</span>
            <span className="res-delta">
              {s.deltaMs > 0 ? `+${s.deltaMs}` : s.deltaMs}ms
            </span>
            <b>{s.points}</b>
          </div>
        ))}
      </div>

      {!saved ? (
        <div className="name-entry">
          <div className="name-label">SUAS INICIAIS — TOQUE PRA ROLAR</div>
          <div className="name-slots">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                className="name-slot roll"
                onClick={() => roll(i)}
                aria-label={`Letra ${i + 1}: ${CHARS[idx[i]]}`}
              >
                <span className="roll-arrow">▲</span>
                <span className="roll-char">{CHARS[idx[i]]}</span>
                <span className="roll-arrow">▼</span>
              </button>
            ))}
          </div>
          <button className="big-btn" onClick={save} disabled={saving}>
            {saving ? 'SALVANDO…' : 'CONFIRMAR ✓'}
          </button>
        </div>
      ) : (
        <div className="saved-msg">SALVO! 🏆</div>
      )}

      <div className="res-footer">
        <button className="ghost-btn" onClick={share}>
          📤 COMPARTILHAR
        </button>
        <button className="ghost-btn" onClick={onReplay}>
          🔁 DE NOVO
        </button>
      </div>
    </div>
  )
}
