import { useEffect, useRef, useState } from 'react'

// Controles dos dois modos.
// Interface com a corrida (timestamps do PRÓPRIO evento — DOMHighResTimeStamp):
//   onThrottle(thr, ts) -> posição do acelerador agora (0..1). No fácil é 0/1.
//   onShift(ts)         -> troca acionada (fácil: soltar; difícil: embreagem no fundo)
// Os pedais têm MOLA: seguem o dedo ao deslizar e voltam gradual ao soltar
// (no telefone o toque é binário, então a "analogicidade" é simulada aqui).
export const THROTTLE_DEADZONE = 0.06
const CLUTCH_SHIFT = 0.8 // fração até o fundo que aciona a troca
// Curso do acelerador FIXO em px (não depende do tamanho da tela) — arrastar
// esse tanto pra baixo corta todo o gás. Maior = mais gradual/menos sensível.
const FEATHER_TRAVEL = 260
const FEATHER_DEADZONE = 12 // folga no topo: micro-movimento não tira o pé do fundo

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
        doShift(e)
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

function applyVisual(fill, handle, pos) {
  const pct = Math.max(0, Math.min(1, pos)) * 100
  if (fill) fill.style.height = pct + '%'
  if (handle) handle.style.bottom = pct + '%'
}

// ---- MODO DIFÍCIL: embreagem (esq) + acelerador (dir), ambos com mola ----
function HardControls({ active, onThrottle, tsOf, doShift }) {
  const accelFill = useRef(null)
  const accelHandle = useRef(null)
  const clutchFill = useRef(null)
  const clutchHandle = useRef(null)
  const [accelOn, setAccelOn] = useState(false)
  const [clutchIn, setClutchIn] = useState(false)

  const onThrottleRef = useRef(onThrottle)
  onThrottleRef.current = onThrottle

  // estado da física dos pedais (fora do React, atualizado no rAF)
  const st = useRef({
    accelTarget: 0, accelPos: 0, accelDown: false, accelId: null,
    clutchTarget: 0, clutchPos: 0, clutchDown: false, clutchId: null,
    lastThr: -1, lastFrame: 0,
  })

  useEffect(() => {
    let raf
    const loop = () => {
      const now = performance.now()
      const s = st.current
      const dt = s.lastFrame ? Math.min(100, now - s.lastFrame) : 16
      s.lastFrame = now

      // acelerador: segurar = pisa fundo com travel gradual; embreagem: segue o dedo
      const TAU = { accel: { down: 70, up: 150 }, clutch: { down: 20, up: 130 } }
      for (const k of ['accel', 'clutch']) {
        const down = s[k + 'Down']
        const target = down ? s[k + 'Target'] : 0 // solto -> mola volta ao 0
        const tau = down ? TAU[k].down : TAU[k].up
        const kk = 1 - Math.exp(-dt / tau)
        s[k + 'Pos'] += (target - s[k + 'Pos']) * kk
      }
      applyVisual(accelFill.current, accelHandle.current, s.accelPos)
      applyVisual(clutchFill.current, clutchHandle.current, s.clutchPos)

      const thr = s.accelPos < THROTTLE_DEADZONE ? 0 : s.accelPos
      if (Math.abs(thr - s.lastThr) > 0.002) {
        s.lastThr = thr
        onThrottleRef.current(thr, now)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const upFrac = (e, el) => {
    const r = el.getBoundingClientRect()
    return Math.max(0, Math.min(1, (r.bottom - e.clientY) / r.height))
  }

  // acelerador (direita): segurar em QUALQUER lugar = pisa fundo (ergonômico).
  // Arrastar o dedo PRA BAIXO alivia o gás (relativo ao ponto do toque); voltar
  // pra cima pisa fundo de novo. Assim dá meia aceleração sem esticar pro topo.
  const accelDown = (e) => {
    e.preventDefault()
    if (!active) return
    try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch (_) {}
    const s = st.current
    s.accelId = e.pointerId
    s.accelDown = true
    s.accelStartY = e.clientY
    s.accelTarget = 1
    setAccelOn(true)
  }
  const accelMove = (e) => {
    const s = st.current
    if (s.accelId !== e.pointerId) return
    const delta = e.clientY - s.accelStartY // >0 = desceu o dedo
    const d = Math.max(0, delta - FEATHER_DEADZONE) // curso fixo em px, com folga no topo
    s.accelTarget = Math.max(0, Math.min(1, 1 - d / FEATHER_TRAVEL))
  }
  const accelEnd = (e) => {
    const s = st.current
    if (s.accelId !== e.pointerId) return
    s.accelId = null
    s.accelDown = false // deixa a mola voltar
    setAccelOn(false)
  }

  // embreagem (esquerda): descer até o fundo troca (no instante do dedo = preciso)
  const clutchDown = (e) => {
    e.preventDefault()
    if (!active) return
    try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch (_) {}
    const s = st.current
    s.clutchId = e.pointerId
    s.clutchDown = true
    const f = 1 - upFrac(e, e.currentTarget)
    s.clutchTarget = f
    setClutchIn(f >= CLUTCH_SHIFT)
    if (f >= CLUTCH_SHIFT) doShift(e)
  }
  const clutchMove = (e) => {
    const s = st.current
    if (s.clutchId !== e.pointerId) return
    const f = 1 - upFrac(e, e.currentTarget)
    s.clutchTarget = f
    setClutchIn(f >= CLUTCH_SHIFT)
    if (f >= CLUTCH_SHIFT) doShift(e)
  }
  const clutchEnd = (e) => {
    const s = st.current
    if (s.clutchId !== e.pointerId) return
    s.clutchId = null
    s.clutchDown = false
    setClutchIn(false)
  }

  return (
    <div className={`hard-pad ${active ? '' : 'is-off'}`}>
      <div
        className={`slider-pane clutch ${clutchIn ? 'engaged' : ''}`}
        style={{ touchAction: 'none' }}
        onPointerDown={clutchDown}
        onPointerMove={clutchMove}
        onPointerUp={clutchEnd}
        onPointerCancel={clutchEnd}
      >
        <div ref={clutchFill} className="slider-fill" />
        <div className="slider-zone clutch-zone" />
        <div ref={clutchHandle} className="slider-handle" />
        <div className="slider-label">EMBREAGEM ↓</div>
      </div>
      <div
        className={`slider-pane accel ${accelOn ? 'engaged' : ''}`}
        style={{ touchAction: 'none' }}
        onPointerDown={accelDown}
        onPointerMove={accelMove}
        onPointerUp={accelEnd}
        onPointerCancel={accelEnd}
      >
        <div ref={accelFill} className="slider-fill" />
        <div ref={accelHandle} className="slider-handle" />
        <div className="slider-label">ACELERADOR<br />SEGURE · ↓ALIVIA</div>
      </div>
    </div>
  )
}
