// Áudio 100% procedural (Web Audio API). Sem arquivos externos — funciona no
// hosting estático do GitHub Pages. O AudioContext precisa ser destravado por
// um gesto do usuário (o toque em START), por isso o unlock() no início.

let ctx = null
let engineOsc = null
let engineGain = null
let engineSub = null

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    try {
      ctx = new AC()
    } catch (_) {
      return null
    }
  }
  return ctx
}

export function unlock() {
  const c = ac()
  if (!c) return
  try {
    if (c.state === 'suspended') c.resume()
    // "toque" silencioso pra destravar em iOS
    const b = c.createBuffer(1, 1, 22050)
    const s = c.createBufferSource()
    s.buffer = b
    s.connect(c.destination)
    s.start(0)
  } catch (_) {}
}

export function startEngine() {
  const c = ac()
  if (!c) return
  stopEngine()
  engineOsc = c.createOscillator()
  engineSub = c.createOscillator()
  engineGain = c.createGain()
  engineOsc.type = 'sawtooth'
  engineSub.type = 'square'
  engineGain.gain.value = 0.0
  engineOsc.connect(engineGain)
  engineSub.connect(engineGain)
  engineGain.connect(c.destination)
  engineOsc.frequency.value = 70
  engineSub.frequency.value = 35
  engineOsc.start()
  engineSub.start()
  engineGain.gain.setTargetAtTime(0.12, c.currentTime, 0.05)
}

// rpm: 0..1 (fração do redline). limiter=true quando bate no corta-giro.
export function setEngineRpm(rpm, limiter = false) {
  if (!engineOsc) return
  const c = ac()
  const f = 70 + rpm * 320
  engineOsc.frequency.setTargetAtTime(f, c.currentTime, limiter ? 0.008 : 0.02)
  engineSub.frequency.setTargetAtTime(f / 2, c.currentTime, limiter ? 0.008 : 0.02)
  if (limiter) {
    // fuel cut: som cheio no topo do quique, quase-mudo no vale -> "bap-bap-bap"
    const vol = rpm > 0.95 ? 0.32 : 0.03
    engineGain.gain.setTargetAtTime(vol, c.currentTime, 0.004)
    return
  }
  const vol = 0.1 + Math.min(0.18, rpm * 0.14)
  engineGain.gain.setTargetAtTime(vol, c.currentTime, 0.03)
}

export function stopEngine() {
  if (engineOsc) {
    try {
      engineGain.gain.setTargetAtTime(0, ac().currentTime, 0.05)
      engineOsc.stop(ac().currentTime + 0.2)
      engineSub.stop(ac().currentTime + 0.2)
    } catch (_) {}
    engineOsc = null
    engineSub = null
    engineGain = null
  }
}

function blip({ freq = 440, dur = 0.12, type = 'square', vol = 0.25, slideTo = null }) {
  const c = ac()
  if (!c) return
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.value = freq
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur)
  g.gain.value = vol
  g.gain.setValueAtTime(vol, c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur)
  o.connect(g)
  g.connect(c.destination)
  o.start()
  o.stop(c.currentTime + dur + 0.02)
}

export const sfx = {
  countTick: () => blip({ freq: 660, dur: 0.1, type: 'square', vol: 0.3 }),
  go: () => blip({ freq: 880, dur: 0.35, type: 'sawtooth', vol: 0.35, slideTo: 1320 }),
  shiftLight: () => blip({ freq: 1200, dur: 0.08, type: 'square', vol: 0.25 }),
  perfect: () => {
    blip({ freq: 880, dur: 0.09, type: 'square', vol: 0.3 })
    setTimeout(() => blip({ freq: 1320, dur: 0.14, type: 'square', vol: 0.3 }), 70)
  },
  goodShift: () => blip({ freq: 700, dur: 0.12, type: 'square', vol: 0.28, slideTo: 980 }),
  badShift: () => blip({ freq: 180, dur: 0.28, type: 'sawtooth', vol: 0.3, slideTo: 90 }),
  select: () => blip({ freq: 520, dur: 0.06, type: 'square', vol: 0.22 }),
  finish: () => {
    ;[523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => blip({ freq: f, dur: 0.16, type: 'square', vol: 0.3 }), i * 120),
    )
  },
}
