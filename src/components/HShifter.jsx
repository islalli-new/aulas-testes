// Câmbio em H, automático — mostra o manche pulando pra marcha atual.
// Layout clássico: 1/3/5 em cima, 2/4/6 embaixo.
const SLOTS = {
  1: { x: 22, y: 20 },
  2: { x: 22, y: 80 },
  3: { x: 50, y: 20 },
  4: { x: 50, y: 80 },
  5: { x: 78, y: 20 },
  6: { x: 78, y: 80 },
}

export default function HShifter({ gear }) {
  const pos = SLOTS[gear] || SLOTS[1]
  return (
    <div className="hshifter" aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        {/* trilhos */}
        <line x1="22" y1="20" x2="22" y2="80" className="hs-rail" />
        <line x1="50" y1="20" x2="50" y2="80" className="hs-rail" />
        <line x1="78" y1="20" x2="78" y2="80" className="hs-rail" />
        <line x1="22" y1="50" x2="78" y2="50" className="hs-rail" />
        {/* rótulos */}
        {Object.entries(SLOTS).map(([g, p]) => (
          <text key={g} x={p.x} y={p.y + (p.y < 50 ? -6 : 12)} className="hs-label">
            {g}
          </text>
        ))}
        {/* manche */}
        <circle cx={pos.x} cy={pos.y} r="8" className="hs-knob" />
      </svg>
    </div>
  )
}
