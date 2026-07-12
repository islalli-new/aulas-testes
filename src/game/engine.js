// Lógica do jogo — modelo de RPM e PONTUAÇÃO POR TIMESTAMP.
//
// Regra de ouro (pedido do usuário): a pontuação NUNCA depende de frame/FPS.
// O desenho do conta-giros usa requestAnimationFrame só pra mostrar; a nota
// vem sempre da diferença entre o timestamp do toque e o timestamp ideal,
// ambos medidos com performance.now().

export const TOTAL_PERFECT = 10000 // pontuação de uma run perfeita (base)

// Configuração de cada marcha. As marchas mais altas sobem o giro um pouco
// mais rápido (janela menor) pra ficar progressivamente mais difícil.
// - riseMs: tempo (ms) do início da marcha até o giro máximo (redline)
// - lightAt: fração do riseMs em que a LUZ de corta-giro acende
// - idealAt: fração do riseMs do ponto IDEAL de troca (logo após a luz)
export const GEARS = [
  { gear: 1, riseMs: 2600, lightAt: 0.74, idealAt: 0.88 },
  { gear: 2, riseMs: 2500, lightAt: 0.74, idealAt: 0.88 },
  { gear: 3, riseMs: 2350, lightAt: 0.75, idealAt: 0.89 },
  { gear: 4, riseMs: 2200, lightAt: 0.76, idealAt: 0.90 },
  { gear: 5, riseMs: 2050, lightAt: 0.77, idealAt: 0.91 },
  { gear: 6, riseMs: 1900, lightAt: 0.78, idealAt: 0.92 }, // última: só acelera até o fim
]

export const NUM_GEARS = GEARS.length
export const NUM_SHIFTS = NUM_GEARS - 1
export const MAX_PER_SHIFT = TOTAL_PERFECT / NUM_SHIFTS

// Janela de acerto (ms) para cada lado do ponto ideal. Fora disso = 0 pontos.
export const HIT_WINDOW_MS = 460
// Banda "PERFECT": erro menor que isso vale a nota cheia.
const PERFECT_BAND_MS = 55

export const DIFFICULTY_MULTIPLIER = { easy: 1, hard: 1.5 }

// Tempo (ms, relativo ao início da marcha) em que a luz acende e o ponto ideal.
export function gearTimings(gearIndex) {
  const g = GEARS[gearIndex]
  return {
    lightMs: g.riseMs * g.lightAt,
    idealMs: g.riseMs * g.idealAt,
    riseMs: g.riseMs,
  }
}

// RPM de EXIBIÇÃO (0..1) a partir do tempo decorrido na marcha.
// Curva levemente acelerada no fim pra dar aquela "puxada" perto do redline.
export function rpmFraction(elapsedMs, gearIndex) {
  const { riseMs } = gearTimings(gearIndex)
  const t = Math.min(1.2, Math.max(0, elapsedMs / riseMs)) // deixa passar do 1 (estouro)
  // ease-in suave
  const eased = Math.min(1.15, 0.18 + 0.82 * Math.pow(t, 1.35))
  return eased
}

// Pontuação de UMA troca a partir do erro de tempo (ms) em relação ao ideal.
// deltaMs pode ser negativo (cedo/bog) ou positivo (tarde/estourou).
export function shiftScore(deltaMs, mode) {
  const abs = Math.abs(deltaMs)
  let base
  if (abs <= PERFECT_BAND_MS) {
    base = MAX_PER_SHIFT
  } else if (abs >= HIT_WINDOW_MS) {
    base = 0
  } else {
    // decaimento quadrático suave de 1 -> 0 na janela
    const x = (abs - PERFECT_BAND_MS) / (HIT_WINDOW_MS - PERFECT_BAND_MS)
    base = MAX_PER_SHIFT * Math.pow(1 - x, 1.6)
  }
  const points = Math.round(base * DIFFICULTY_MULTIPLIER[mode])
  return { points, rating: ratingFor(abs), deltaMs: Math.round(deltaMs) }
}

export function ratingFor(absDeltaMs) {
  if (absDeltaMs <= PERFECT_BAND_MS) return 'PERFECT'
  if (absDeltaMs <= 140) return 'GREAT'
  if (absDeltaMs <= 260) return 'GOOD'
  if (absDeltaMs < HIT_WINDOW_MS) return 'OK'
  return 'MISS'
}

export const RATING_COLOR = {
  PERFECT: '#39ff14',
  GREAT: '#00e5ff',
  GOOD: '#ffe600',
  OK: '#ff9d00',
  MISS: '#ff2d55',
}

export function emptyRun() {
  return { shifts: [], total: 0 }
}
