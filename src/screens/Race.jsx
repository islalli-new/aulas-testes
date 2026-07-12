import { useEffect, useRef, useState } from 'react'
import Tachometer from '../components/Tachometer.jsx'
import Controls from '../components/Controls.jsx'
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
  const [lastShift, setLastShift] = useState(null)
  const [scoreSoFar, setScoreSoFar] = useState(0)

  const tachState = useRef({ rpm: IDLE_RPM, light: false, gear: 1, overrev: false })
  const gearIdxRef = useRef(0)

  // Acúmulo de giro: só corre enquanto o acelerador está ATIVO (segurado).
  const startedRef = useRef(false) // já engatou esta marcha?
  const accelActiveRef = useRef(false)
  const sinceRef = useRef(0) // ts em que o acelerador ficou ativo
  const accumRef = useRef(0) // ms acumulados de aceleração (spans anteriores)

  const lightAnnouncedRef = useRef(false)
  const shiftsRef = useRef([])
  const doneRef = useRef(false)

  // ms de aceleração acumulados até "now" (timestamp)
  const accelMs = (now) =>
    accumRef.current + (accelActiveRef.current ? now - sinceRef.current : 0)

  const resetGear = () => {
    startedRef.current = false
    accelActiveRef.current = false
    sinceRef.current = 0
    accumRef.current = 0
    lightAnnouncedRef.current = false
  }

  // laço só de simulação/desenho — a NOTA sai dos timestamps de toque
  useEffect(() => {
    startEngine()
    let raf
    const loop = () => {
      const now = performance.now()
      const gi = gearIdxRef.current
      const t = gearTimings(gi)
      let rpm = IDLE_RPM
      let light = false
      let overrev = false

      if (startedRef.current) {
        const a = accelMs(now)
        rpm = rpmFraction(a, gi)
        light = a >= t.lightMs
        overrev = a > t.riseMs * 1.02
        if (light && !lightAnnouncedRef.current) {
          lightAnnouncedRef.current = true
          sfx.shiftLight()
        }
        // trava de segurança: passou muito do ideal (acelerando) -> troca forçada
        if (!doneRef.current && a > t.idealMs + HIT_WINDOW_MS + 140) {
          handleShift(now)
        }
      }

      tachState.current = { rpm, light, gear: gi + 1, overrev }
      setEngineRpm(rpm)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      stopEngine()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // acelerador segurado (true) ou solto (false)
  const handleAccel = (active, ts) => {
    if (doneRef.current) return
    if (active) {
      if (accelActiveRef.current) return
      accelActiveRef.current = true
      sinceRef.current = ts
      if (!startedRef.current) {
        startedRef.current = true
        setLaunched(true)
      }
    } else {
      if (!accelActiveRef.current) return
      accumRef.current += ts - sinceRef.current
      accelActiveRef.current = false
    }
  }

  const handleShift = (ts) => {
    if (doneRef.current || !startedRef.current) return
    const gi = gearIdxRef.current
    const t = gearTimings(gi)
    const a = accumRef.current + (accelActiveRef.current ? ts - sinceRef.current : 0)
    const delta = a - t.idealMs // >0 tarde, <0 cedo
    const result = shiftScore(delta, mode)
    result.gear = gi + 1

    shiftsRef.current = [...shiftsRef.current, result]
    const total = shiftsRef.current.reduce((s, x) => s + x.points, 0)
    setScoreSoFar(total)
    setLastShift({ ...result, key: gi })

    if (result.rating === 'PERFECT') sfx.perfect()
    else if (Math.abs(result.deltaMs) >= HIT_WINDOW_MS) sfx.badShift()
    else sfx.goodShift()

    const nextIdx = gi + 1
    const stillAccel = accelActiveRef.current // acelerador ainda segurado?
    resetGear()

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

    if (stillAccel) {
      // acelerador continua no fundo → engata a próxima marcha já, a partir de agora
      startedRef.current = true
      accelActiveRef.current = true
      sinceRef.current = ts
      setLaunched(true)
    } else {
      setLaunched(false)
    }
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
        {!launched && !doneRef.current && (
          <div className="launch-hint">
            {mode === 'hard' ? 'ACELERE (DIREITA, P/ CIMA) PRA ENGATAR' : 'SEGURE PRA ACELERAR'}
          </div>
        )}
      </div>

      <div className="race-bottom">
        <Controls
          mode={mode}
          gearKey={gearKey}
          active={!doneRef.current}
          onAccel={handleAccel}
          onShift={handleShift}
        />
      </div>
    </div>
  )
}
