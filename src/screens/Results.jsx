import { useState } from 'react'
import { submitScore } from '../game/leaderboard.js'
import { RATING_COLOR } from '../game/engine.js'
import { sfx } from '../game/audio.js'

const GAME_URL = 'https://islalli-new.github.io/aulas-testes/'

export default function Results({ run, onSubmitted, onReplay }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const clean = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3)

  const save = async () => {
    if (saving || saved) return
    setSaving(true)
    sfx.select()
    const finalName = (clean || 'AAA').padEnd(3, 'A')
    const { rows, source, entry } = await submitScore({
      name: finalName,
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
          <div className="name-label">SUAS INICIAIS</div>
          <div className="name-slots">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`name-slot ${clean.length === i ? 'cursor' : ''}`}>
                {clean[i] || '_'}
              </div>
            ))}
          </div>
          <input
            className="name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={3}
            autoCapitalize="characters"
            autoCorrect="off"
            placeholder="AAA"
            inputMode="text"
          />
          <div className="name-actions">
            <button className="ghost-btn" onClick={() => setName('')}>
              APAGAR
            </button>
            <button className="big-btn" onClick={save} disabled={saving}>
              {saving ? 'SALVANDO…' : 'SALVAR ✓'}
            </button>
          </div>
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
