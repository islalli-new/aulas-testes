import { useEffect, useRef, useState } from 'react'

// Controles dos dois modos.
// Emite dois eventos com timestamp preciso do PRÓPRIO evento de toque
// (event.timeStamp é DOMHighResTimeStamp, mesma base do performance.now()):
//   onEngage(ts) -> jogador começou a acelerar esta marcha (1x por marcha)
//   onShift(ts)  -> jogador acionou a troca (1x por marcha)
// `gearKey` muda a cada marcha para rearmar os latches.
// `active` habilita/desabilita a entrada (desliga na contagem/fim).
export default function Controls({ mode, gearKey, active, onEngage, onShift }) {
  const engaged = useRef(false)
  const shifted = useRef(false)

  useEffect(() => {
    engaged.current = false
    shifted.current = false
  }, [gearKey])

  const ts = (e) =>
    typeof e.timeStamp === 'number' && e.timeStamp > 0 ? e.timeStamp : performance.now()

  const engage = (e) => {
    if (!active || engaged.current) return
    engaged.current = true
    onEngage(ts(e))
  }
  const shift = (e) => {
    if (!active || !engaged.current || shifted.current) return
    shifted.current = true
    onShift(ts(e))
  }

  if (mode === 'hard') {
    return <HardControls {...{ active, engage, shift }} />
  }
  return <EasyControls {...{ active, engage, shift }} />
}

// ---- MODO FÁCIL: segura pra acelerar em qualquer lugar, solta pra trocar ----
function EasyControls({ active, engage, shift }) {
  const [down, setDown] = useState(false)
  return (
    <div
      className={`easy-pad ${down ? 'is-down' : ''} ${active ? '' : 'is-off'}`}
      onPointerDown={(e) => {
        e.preventDefault()
        setDown(true)
        engage(e)
      }}
      onPointerUp={(e) => {
        e.preventDefault()
        setDown(false)
        shift(e)
      }}
      onPointerCancel={(e) => {
        setDown(false)
        shift(e)
      }}
      style={{ touchAction: 'none' }}
    >
      <div className="easy-pedal" style={{ transform: `scaleY(${down ? 1 : 0.25})` }} />
      <div className="easy-hint">
        {down ? 'SOLTA NA LUZ PRA TROCAR' : 'SEGURA PRA ACELERAR'}
      </div>
    </div>
  )
}

// ---- MODO DIFÍCIL: embreagem (esq, desce) + acelerador (dir, sobe) ----
function HardControls({ active, engage, shift }) {
  const [throttle, setThrottle] = useState(0) // 0 baixo .. 1 topo
  const [clutch, setClutch] = useState(0) // 0 solto .. 1 embreagem no fundo
  const accelPointer = useRef(null)
  const clutchPointer = useRef(null)

  const yFrac = (e, el) => {
    const r = el.getBoundingClientRect()
    return Math.max(0, Math.min(1, (r.bottom - e.clientY) / r.height)) // 1 = topo
  }

  // acelerador (direita): subir engata o motor
  const accelDown = (e) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    accelPointer.current = e.pointerId
    const f = yFrac(e, e.currentTarget)
    setThrottle(f)
    if (f > 0.75) engage(e)
  }
  const accelMove = (e) => {
    if (accelPointer.current !== e.pointerId) return
    const f = yFrac(e, e.currentTarget)
    setThrottle(f)
    if (f > 0.75) engage(e)
  }
  const accelUp = (e) => {
    if (accelPointer.current !== e.pointerId) return
    accelPointer.current = null
    setThrottle(0)
  }

  // embreagem (esquerda): descer até o fundo aciona a troca
  const clutchDown = (e) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    clutchPointer.current = e.pointerId
    const f = 1 - yFrac(e, e.currentTarget) // 1 = fundo
    setClutch(f)
    if (f > 0.82) shift(e)
  }
  const clutchMove = (e) => {
    if (clutchPointer.current !== e.pointerId) return
    const f = 1 - yFrac(e, e.currentTarget)
    setClutch(f)
    if (f > 0.82) shift(e)
  }
  const clutchUp = (e) => {
    if (clutchPointer.current !== e.pointerId) return
    clutchPointer.current = null
    setClutch(0)
  }

  return (
    <div className={`hard-pad ${active ? '' : 'is-off'}`}>
      <div
        className="slider-pane clutch"
        style={{ touchAction: 'none' }}
        onPointerDown={clutchDown}
        onPointerMove={clutchMove}
        onPointerUp={clutchUp}
        onPointerCancel={clutchUp}
      >
        <div className="slider-fill" style={{ height: `${clutch * 100}%`, bottom: 0 }} />
        <div className="slider-label">EMBREAGEM ↓</div>
      </div>
      <div
        className="slider-pane accel"
        style={{ touchAction: 'none' }}
        onPointerDown={accelDown}
        onPointerMove={accelMove}
        onPointerUp={accelUp}
        onPointerCancel={accelUp}
      >
        <div className="slider-fill" style={{ height: `${throttle * 100}%`, bottom: 0 }} />
        <div className="slider-label">ACELERADOR ↑</div>
      </div>
    </div>
  )
}
