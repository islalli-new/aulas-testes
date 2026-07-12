import { useEffect, useRef, useState } from 'react'

// Controles dos dois modos.
// Interface com a corrida (timestamps do PRÓPRIO evento — DOMHighResTimeStamp):
//   onThrottle(thr, ts) -> posição do acelerador agora (0..1). No fácil é 0/1.
//   onShift(ts)         -> troca acionada (fácil: soltar; difícil: embreagem no fundo)
// O giro sobe proporcional ao acelerador (integrado por tempo). Em manual, a troca
// SÓ acontece na embreagem — nada de trocar sozinho.
export const THROTTLE_DEADZONE = 0.06

export default function Controls({ mode, gearKey, active, onThrottle, onShift }) {
  const shifted = useRef(false)
  useEffect(() => {
    shifted.current = false
  }, [gearKey])

  const tsOf = (e) =>
    typeof e.timeStamp === 'number' && e.timeStamp > 0 ? e.timeStamp : performance.now()

  const doShift = (e) => {
    if (!active || shifted.current) return
    shifted.current = true
    onShift(tsOf(e))
  }

  if (mode === 'hard') {
    return <HardControls active={active} onThrottle={onThrottle} tsOf={tsOf} doShift={doShift} />
  }
  return <EasyControls active={active} onThrottle={onThrottle} tsOf={tsOf} doShift={doShift} />
}

// ---- MODO FÁCIL: segura pra acelerar em qualquer lugar, solta pra trocar ----
function EasyControls({ active, onThrottle, tsOf, doShift }) {
  const [down, setDown] = useState(false)
  return (
    <div
      className={`easy-pad ${down ? 'is-down' : ''} ${active ? '' : 'is-off'}`}
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => {
        e.preventDefault()
        if (!active) return
        setDown(true)
        onThrottle(1, tsOf(e))
      }}
      onPointerUp={(e) => {
        e.preventDefault()
        setDown(false)
        doShift(e) // troca com o acelerador ainda "cheio" (nota precisa)
        onThrottle(0, tsOf(e))
      }}
      onPointerCancel={(e) => {
        setDown(false)
        doShift(e)
        onThrottle(0, tsOf(e))
      }}
    >
      <div className="easy-pedal" style={{ transform: `scaleY(${down ? 1 : 0.25})` }} />
      <div className="easy-hint">
        {down ? 'SOLTA NA LUZ PRA TROCAR' : 'SEGURA PRA ACELERAR'}
      </div>
    </div>
  )
}

// ---- MODO DIFÍCIL: embreagem (esq, desce) + acelerador (dir, proporcional) ----
const CLUTCH_SHIFT = 0.8 // fração até o fundo que aciona a troca

function HardControls({ active, onThrottle, tsOf, doShift }) {
  const [throttle, setThrottle] = useState(0) // 0 baixo .. 1 topo
  const [clutch, setClutch] = useState(0) // 0 solto .. 1 fundo
  const accelId = useRef(null)
  const clutchId = useRef(null)

  const upFrac = (e, el) => {
    const r = el.getBoundingClientRect()
    return Math.max(0, Math.min(1, (r.bottom - e.clientY) / r.height))
  }

  // ---- acelerador (direita): posição do dedo = quanto de gás (proporcional) ----
  const applyThrottle = (e) => {
    const raw = upFrac(e, e.currentTarget)
    const thr = raw < THROTTLE_DEADZONE ? 0 : raw
    setThrottle(thr)
    onThrottle(thr, tsOf(e))
  }
  const accelDown = (e) => {
    e.preventDefault()
    if (!active) return
    try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch (_) {}
    accelId.current = e.pointerId
    applyThrottle(e)
  }
  const accelMove = (e) => {
    if (accelId.current !== e.pointerId) return
    applyThrottle(e)
  }
  const accelEnd = (e) => {
    if (accelId.current !== e.pointerId) return
    accelId.current = null
    setThrottle(0)
    onThrottle(0, tsOf(e))
  }

  // ---- embreagem (esquerda): descer até o fundo troca ----
  const clutchDown = (e) => {
    e.preventDefault()
    if (!active) return
    try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch (_) {}
    clutchId.current = e.pointerId
    const f = 1 - upFrac(e, e.currentTarget)
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
        className={`slider-pane accel ${throttle > THROTTLE_DEADZONE ? 'engaged' : ''}`}
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
