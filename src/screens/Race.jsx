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
  const gearStartRef = useRef(null)
  const lightAnnouncedRef = useRef(false)
  const shiftsRef = useRef([])
  const doneRef = useRef(false)

  // laço só de simulação/desenho — a NOTA não sai daqui, sai dos timestamps de toque
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

      if (gearStartRef.current != null) {
        const elapsed = now - gearStartRef.current
        rpm = rpmFraction(elapsed, gi)
        light = elapsed >= t.lightMs
        overrev = elapsed > t.riseMs * 1.02
        if (light && !lightAnnouncedRef.current) {
          lightAnnouncedRef.current = true
          sfx.shiftLight()
        }
        // trava de segurança: esperou demais -> troca forçada (MISS)
        if (!doneRef.current && elapsed > t.idealMs + HIT_WINDOW_MS + 140) {
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

  const handleEngage = (ts) => {
    if (gearStartRef.current != null) return
    gearStartRef.current = ts
    lightAnnouncedRef.current = false
    setLaunched(true)
  }

  const handleShift = (ts) => {
    if (doneRef.current) return
    if (gearStartRef.current == null) return
    const gi = gearIdxRef.current
    const t = gearTimings(gi)
    const idealAbs = gearStartRef.current + t.idealMs
    const delta = ts - idealAbs
    const result = shiftScore(delta, mode)
    result.gear = gi + 1

    shiftsRef.current = [...shiftsRef.current, result]
    const total = shiftsRef.current.reduce((s, x) => s + x.points, 0)
    setScoreSoFar(total)
    setLastShift({ ...result, key: gi })

    if (result.rating === 'PERFECT') sfx.perfect()
    else if (Math.abs(result.deltaMs) >= HIT_WINDOW_MS) sfx.badShift()
    else sfx.goodShift()

    // avança a marcha
    const nextIdx = gi + 1
    gearStartRef.current = null
    lightAnnouncedRef.current = false

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
    setLaunched(false)
  }

  useEffect(() => {
    if (!lastShift) return
    const id = setTimeout(() => setLastShift(null), 850)
    return () => clearTimeout(id)
  }, [lastShift])

  return (
    <div className="race">
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
            {mode === 'hard' ? 'ACELERE (DIREITA) PRA ENGATAR' : 'SEGURE PRA ACELERAR'}
          </div>
        )}
      </div>

      <div className="race-bottom">
        <Controls
          mode={mode}
          gearKey={gearKey}
          active={!doneRef.current}
          onEngage={handleEngage}
          onShift={handleShift}
        />
      </div>
    </div>
  )
}
