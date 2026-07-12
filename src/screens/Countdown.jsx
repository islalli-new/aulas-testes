import { useEffect, useState } from 'react'
import { sfx } from '../game/audio.js'

// Contagem regressiva 3-2-1-GO com som. O áudio já foi destravado no toque
// do START (Title), então aqui só tocamos os beeps.
export default function Countdown({ onDone }) {
  const [n, setN] = useState(3)

  useEffect(() => {
    sfx.countTick()
    const seq = [
      setTimeout(() => {
        setN(2)
        sfx.countTick()
      }, 800),
      setTimeout(() => {
        setN(1)
        sfx.countTick()
      }, 1600),
      setTimeout(() => {
        setN(0)
        sfx.go()
      }, 2400),
      setTimeout(() => onDone(), 3100),
    ]
    return () => seq.forEach(clearTimeout)
  }, [onDone])

  return (
    <div className="countdown crt">
      <div className="count-num" key={n}>
        {n === 0 ? 'GO!' : n}
      </div>
    </div>
  )
}
