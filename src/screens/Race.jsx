import { useEffect, useRef, useState } from 'react'
import Tachometer from '../components/Tachometer.jsx'
import Controls, { THROTTLE_DEADZONE } from '../components/Controls.jsx'
import HShifter from '../components/HShifter.jsx'
import {
  GEARS,
  NUM_SHIFTS,
  gearTimings,
  rpmFraction,
  shiftScore,
  HIT_WINDOW_MS,
  RATING_COLOR,
} from '../game/engine.js'
import { startEngine, stopEngine, setEngineRpm, sfx } from '../game/audio.js'

const IDLE_RPM = 0.12

export default function Race({ mode, onFinish }) {
  const [gearIndex, setGearIndex] = useState(0)
  const [gearKey, setGearKey] = useState(0)
  const [launched, setLaunched] = useState(false)
  const [atLimiter, setAtLimiter] = useState(false)
  const [lastShift, setLastShift] = useState(null)
  const [scoreSoFar, setScoreSoFar] = useState(0)

  const tachState = useRef({ rpm: IDLE_RPM, light: false, gear: 1, overrev: false })
  const gearIdxRef = useRef(0)
  const dispRpmRef = useRef(IDLE_RPM)
  const lastFrameRef = useRef(0)

  // Giro = integral da posição do acelerador no tempo (proporcional, por timestamp).
  const startedRef = useRef(false) // já engatou a 1ª marcha?
  const thrRef = useRef(0) // acelerador atual 0..1
  const eRef = useRef(0) // "ms de acelerador cheio" acumulados nesta marcha
  const lightAnnouncedRef = useRef(false)
  const limiterRef = useRef(false)
  const shiftsRef = useRef([])
  const doneRef = useRef(false)

  useEffect(() => {
    startEngine()
    let raf
    const loop = () => {
      const now = performance.now()
      const dt = lastFrameRef.current ? Math.min(100, now - lastFrameRef.current) : 16
      lastFrameRef.current = now

      const gi = gearIdxRef.current
      const t = gearTimings(gi)
      const thr = thrRef.current
      let target = IDLE_RPM
      let light = false
      let limiter = false

      if (startedRef.current) {
        eRef.current += thr * dt // acelerador proporcional
        const a = eRef.current
        light = a >= t.lightMs
        limiter = a >= t.riseMs
        if (light && !lightAnnouncedRef.current) {
          lightAnnouncedRef.current = true
          sfx.shiftLight()
        }
        if (limiter && !limiterRef.current) {
          limiterRef.current = true
          setAtLimiter(true)
        }
        target = thr > THROTTLE_DEADZONE ? rpmFraction(a, gi) : IDLE_RPM
      }

      // inércia: sobe responsivo; sem acelerador desce devagar (freio-motor)
      const accelerating = startedRef.current && thr > THROTTLE_DEADZONE
      const tau = accelerating ? 34 : 300
      const k = 1 - Math.exp(-dt / tau)
      dispRpmRef.current += (target - dispRpmRef.current) * k
      const rpm = dispRpmRef.current

      tachState.current = { rpm, light, gear: gi + 1, overrev: limiter }
      setEngineRpm(rpm, limiter && accelerating)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      stopEngine()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleThrottle = (thr, _ts) => {
    if (doneRef.current) return
    thrRef.current = thr
    if (thr > THROTTLE_DEADZONE && !startedRef.current) {
      startedRef.current = true
      setLaunched(true)
    }
  }

  const handleShift = (ts) => {
    if (doneRef.current || !startedRef.current) return
    const gi = gearIdxRef.current
    const t = gearTimings(gi)
    // giro no instante exato da troca (extrapola o frame com o acelerador atual)
    const a = eRef.current + thrRef.current * Math.max(0, ts - lastFrameRef.current)
    const delta = a - t.idealMs
    const result = shiftScore(delta, mode)
    result.gear = gi + 1

    shiftsRef.current = [...shiftsRef.current, result]
    const total = shiftsRef.current.reduce((s, x) => s + x.points, 0)
    setScoreSoFar(total)
    setLastShift({ ...result, key: gi })

    if (result.rating === 'PERFECT') sfx.perfect()
    else if (Math.abs(result.deltaMs) >= HIT_WINDOW_MS) sfx.badShift()
    else sfx.goodShift()

    // prepara a próxima marcha (o giro cai do que estava — a inércia cuida do visual)
    const nextIdx = gi + 1
    eRef.current = 0
    lightAnnouncedRef.current = false
    limiterRef.current = false
    setAtLimiter(false)

    if (shiftsRef.current.length >= NUM_SHIFTS) {
      doneRef.current = true
      gearIdxRef.current = nextIdx
      setGearIndex(nextIdx)
      sfx.finish()
      setTimeout(() => onFinish({ shifts: shiftsRef.current, total, mode }), 700)
      return
    }

    gearIdxRef.current = nextIdx
    setGearIndex(nextIdx)
    setGearKey((k) => k + 1)
  }

  useEffect(() => {
    if (!lastShift) return
    const id = setTimeout(() => setLastShift(null), 850)
    return () => clearTimeout(id)
  }, [lastShift])

  return (
    <div className="race" data-gear={gearIndex + 1} data-score={scoreSoFar} data-launched={launched ? 1 : 0}>
      <div className="race-top">
        <Tachometer stateRef={tachState} />
        <div className="race-hud">
          <div className="hud-score">
            <span>PONTOS</span>
            <b>{String(scoreSoFar).padStart(5, '0')}</b>
          </div>
          <HShifter gear={Math.min(gearIndex + 1, GEARS.length)} />
        </div>
        {lastShift && (
          <div
            key={lastShift.key}
            className="rating-pop"
            style={{ color: RATING_COLOR[lastShift.rating] }}
          >
            {lastShift.rating}
            <small>+{lastShift.points}</small>
          </div>
        )}
        {atLimiter && !doneRef.current && (
          <div className="shift-now">TROCA!</div>
        )}
        {!launched && !doneRef.current && (
          <div className="launch-hint">
            {mode === 'hard' ? 'SEGURE A DIREITA PRA ACELERAR' : 'SEGURE PRA ACELERAR'}
          </div>
        )}
      </div>

      <div className="race-bottom">
        <Controls
          mode={mode}
          gearKey={gearKey}
          active={!doneRef.current}
          onThrottle={handleThrottle}
          onShift={handleShift}
        />
      </div>
    </div>
  )
}
