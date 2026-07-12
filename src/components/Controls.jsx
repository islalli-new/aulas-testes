import { useEffect, useRef, useState } from 'react'

// Controles dos dois modos.
// Interface com a corrida (timestamps do PRÓPRIO evento de toque — DOMHighResTimeStamp,
// mesma base do performance.now()):
//   onAccel(active, ts) -> acelerador passou a ser segurado (true) ou solto (false)
//   onShift(ts)         -> troca acionada (fácil: soltar; difícil: embreagem no fundo)
// O giro só acumula enquanto o acelerador está ATIVO (segurado). Isso conserta o
// "acelera infinito só de encostar".
// `gearKey` muda a cada marcha para rearmar o latch da troca.
export default function Controls({ mode, gearKey, active, onAccel, onShift }) {
  const shifted = useRef(false)
  useEffect(() => {
    shifted.current = false
  }, [gearKey])

  const ts = (e) =>
    typeof e.timeStamp === 'number' && e.timeStamp > 0 ? e.timeStamp : performance.now()

  const doShift = (e) => {
    if (!active || shifted.current) return
    shifted.current = true
    onShift(ts(e))
  }

  if (mode === 'hard') {
    return <HardControls active={active} onAccel={onAccel} tsOf={ts} doShift={doShift} />
  }
  return <EasyControls active={active} onAccel={onAccel} tsOf={ts} doShift={doShift} />
}

// ---- MODO FÁCIL: segura pra acelerar em qualquer lugar, solta pra trocar ----
function EasyControls({ active, onAccel, tsOf, doShift }) {
  const [down, setDown] = useState(false)
  return (
    <div
      className={`easy-pad ${down ? 'is-down' : ''} ${active ? '' : 'is-off'}`}
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => {
        e.preventDefault()
        if (!active) return
        setDown(true)
        onAccel(true, tsOf(e))
      }}
      onPointerUp={(e) => {
        e.preventDefault()
        setDown(false)
        onAccel(false, tsOf(e))
        doShift(e)
      }}
      onPointerCancel={(e) => {
        setDown(false)
        onAccel(false, tsOf(e))
        doShift(e)
      }}
    >
      <div className="easy-pedal" style={{ transform: `scaleY(${down ? 1 : 0.25})` }} />
      <div className="easy-hint">
        {down ? 'SOLTA NA LUZ PRA TROCAR' : 'SEGURA PRA ACELERAR'}
      </div>
    </div>
  )
}

// ---- MODO DIFÍCIL: embreagem (esq, desce) + acelerador (dir, sobe) ----
const ACCEL_ON = 0.5 // fração da altura a partir da qual o acelerador "engata"
const CLUTCH_SHIFT = 0.8 // fração até o fundo que aciona a troca

function HardControls({ active, onAccel, tsOf, doShift }) {
  const [throttle, setThrottle] = useState(0) // 0 baixo .. 1 topo
  const [clutch, setClutch] = useState(0) // 0 solto .. 1 fundo
  const accelId = useRef(null)
  const accelActive = useRef(false)
  const clutchId = useRef(null)

  // fração vertical: 1 = topo, 0 = base
  const upFrac = (e, el) => {
    const r = el.getBoundingClientRect()
    return Math.max(0, Math.min(1, (r.bottom - e.clientY) / r.height))
  }

  const setAccel = (on, e) => {
    if (on === accelActive.current) return
    accelActive.current = on
    onAccel(on, tsOf(e))
  }

  // ---- acelerador (direita): segurar pra cima acelera ----
  const accelDown = (e) => {
    e.preventDefault()
    if (!active) return
    try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch (_) {}
    accelId.current = e.pointerId
    const f = upFrac(e, e.currentTarget)
    setThrottle(f)
    setAccel(f >= ACCEL_ON, e)
  }
  const accelMove = (e) => {
    if (accelId.current !== e.pointerId) return
    const f = upFrac(e, e.currentTarget)
    setThrottle(f)
    setAccel(f >= ACCEL_ON, e)
  }
  const accelEnd = (e) => {
    if (accelId.current !== e.pointerId) return
    accelId.current = null
    setThrottle(0)
    setAccel(false, e)
  }

  // ---- embreagem (esquerda): descer até o fundo troca ----
  const clutchDown = (e) => {
    e.preventDefault()
    if (!active) return
    try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch (_) {}
    clutchId.current = e.pointerId
    const f = 1 - upFrac(e, e.currentTarget) // 1 = fundo
    setClutch(f)
    if (f >= CLUTCH_SHIFT) doShift(e)
  }
  const clutchMove = (e) => {
    if (clutchId.current !== e.pointerId) return
    const f = 1 - upFrac(e, e.currentTarget)
    setClutch(f)
    if (f >= CLUTCH_SHIFT) doShift(e)
  }
  const clutchEnd = (e) => {
    if (clutchId.current !== e.pointerId) return
    clutchId.current = null
    setClutch(0)
  }

  return (
    <div className={`hard-pad ${active ? '' : 'is-off'}`}>
      <div
        className={`slider-pane clutch ${clutch >= CLUTCH_SHIFT ? 'engaged' : ''}`}
        style={{ touchAction: 'none' }}
        onPointerDown={clutchDown}
        onPointerMove={clutchMove}
        onPointerUp={clutchEnd}
        onPointerCancel={clutchEnd}
      >
        <div className="slider-fill" style={{ height: `${clutch * 100}%` }} />
        <div className="slider-label">EMBREAGEM ↓</div>
      </div>
      <div
        className={`slider-pane accel ${throttle >= ACCEL_ON ? 'engaged' : ''}`}
        style={{ touchAction: 'none' }}
        onPointerDown={accelDown}
        onPointerMove={accelMove}
        onPointerUp={accelEnd}
        onPointerCancel={accelEnd}
      >
        <div className="slider-fill" style={{ height: `${throttle * 100}%` }} />
        <div className="slider-label">ACELERADOR ↑</div>
      </div>
    </div>
  )
}
