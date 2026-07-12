import { useEffect, useState } from 'react'
import { getTopScores } from '../game/leaderboard.js'
import { unlock, startEngine, stopEngine, sfx } from '../game/audio.js'

export default function Title({ onStart, onLeaderboard }) {
  const [mode, setMode] = useState('easy')
  const [top, setTop] = useState([])

  useEffect(() => {
    getTopScores().then(({ rows }) => setTop(rows.slice(0, 5)))
  }, [])

  const pick = (m) => {
    setMode(m)
    unlock()
    sfx.select()
  }

  const start = () => {
    unlock()
    // aquece o motor e corta rápido — garante que o áudio está vivo
    startEngine()
    setTimeout(() => stopEngine(), 60)
    onStart(mode)
  }

  return (
    <div className="title crt">
      <div className="scanlines" />
      <div className="title-stripes" />
      <h1 className="logo">
        <span className="logo-1">CORTA</span>
        <span className="logo-2">GIRO</span>
      </h1>
      <p className="tagline">TROCA NO TEMPO CERTO • FLIPERAMA 80'S</p>

      <div className="mode-select">
        <div className="mode-title">MODO</div>
        <div className="mode-btns">
          <button
            className={`mode-btn ${mode === 'easy' ? 'sel' : ''}`}
            onClick={() => pick('easy')}
          >
            FÁCIL
            <small>toca em qualquer lugar</small>
          </button>
          <button
            className={`mode-btn ${mode === 'hard' ? 'sel' : ''}`}
            onClick={() => pick('hard')}
          >
            DIFÍCIL
            <small>embreagem + acelerador ×1.5</small>
          </button>
        </div>
      </div>

      <button className="big-btn start" onClick={start}>
        ▶ START
      </button>
      <button className="ghost-btn" onClick={onLeaderboard}>
        🏆 PLACAR
      </button>

      {top.length > 0 && (
        <div className="mini-top">
          {top.map((r, i) => (
            <div key={i} className="mini-row">
              <span>{i + 1}.</span>
              <span>{r.name}</span>
              <b>{String(r.score).padStart(5, '0')}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
