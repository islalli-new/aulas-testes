import { useEffect, useRef } from 'react'

// Conta-giros desenhado em canvas. Lê o estado ao vivo de `stateRef`
// (atualizado pela tela de corrida a cada frame). O rAF aqui é só DESENHO.
// stateRef.current = { rpm: 0..1.15, light: bool, gear: number, overrev: bool }
export default function Tachometer({ stateRef }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const g = canvas.getContext('2d')
    let raf
    let W = 0
    let H = 0

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      W = rect.width
      H = rect.height
      canvas.width = W * dpr
      canvas.height = H * dpr
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const START = Math.PI * 0.75 // 135°
    const SWEEP = Math.PI * 1.5 // 270°
    const REDLINE = 0.85 // início da zona vermelha (fração)

    function draw() {
      const st = stateRef.current || { rpm: 0, light: false, gear: 1 }
      const rpm = Math.max(0, Math.min(1.15, st.rpm))
      const cx = W / 2
      const cy = H * 0.56
      const R = Math.min(W, H) * 0.42

      g.clearRect(0, 0, W, H)

      // aro externo
      g.lineWidth = R * 0.14
      g.strokeStyle = 'rgba(255,255,255,0.06)'
      g.beginPath()
      g.arc(cx, cy, R, START, START + SWEEP)
      g.stroke()

      // trilha colorida preenchida até o rpm
      const filled = START + SWEEP * Math.min(1, rpm)
      const grad = g.createLinearGradient(cx - R, cy, cx + R, cy)
      grad.addColorStop(0, '#00e5ff')
      grad.addColorStop(0.6, '#ff00e5')
      grad.addColorStop(1, '#ff2d55')
      g.lineWidth = R * 0.14
      g.strokeStyle = grad
      g.shadowColor = '#ff00e5'
      g.shadowBlur = 18
      g.beginPath()
      g.arc(cx, cy, R, START, filled)
      g.stroke()
      g.shadowBlur = 0

      // zona vermelha (redline)
      g.lineWidth = R * 0.14
      g.strokeStyle = st.light ? '#ff2d55' : 'rgba(255,45,85,0.35)'
      if (st.light) {
        g.shadowColor = '#ff2d55'
        g.shadowBlur = 30
      }
      g.beginPath()
      g.arc(cx, cy, R, START + SWEEP * REDLINE, START + SWEEP)
      g.stroke()
      g.shadowBlur = 0

      // ticks
      g.strokeStyle = 'rgba(255,255,255,0.5)'
      for (let i = 0; i <= 10; i++) {
        const a = START + (SWEEP * i) / 10
        const r1 = R - R * 0.11
        const r2 = R + R * 0.02
        g.lineWidth = i >= 8 ? 3 : 1.5
        g.strokeStyle = i >= 8 ? '#ff2d55' : 'rgba(255,255,255,0.5)'
        g.beginPath()
        g.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1)
        g.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2)
        g.stroke()
      }

      // ponteiro — com vibração do motor (cresce com o giro; treme mais no limitador)
      const now = performance.now()
      const amp = 0.006 + rpm * 0.016 + (st.light ? 0.006 : 0)
      const shake =
        amp *
        (Math.sin(now * 0.05) * 0.45 +
          Math.sin(now * 0.121) * 0.3 +
          (Math.random() - 0.5) * 0.55)
      const na = START + SWEEP * Math.min(1.06, rpm) + shake
      g.save()
      g.translate(cx, cy)
      g.rotate(na)
      g.fillStyle = st.overrev ? '#ff2d55' : '#ffffff'
      g.shadowColor = st.overrev ? '#ff2d55' : '#00e5ff'
      g.shadowBlur = 16
      g.beginPath()
      g.moveTo(-R * 0.14, 0)
      g.lineTo(R * 0.9, -R * 0.02)
      g.lineTo(R * 0.9, R * 0.02)
      g.closePath()
      g.fill()
      g.restore()
      g.shadowBlur = 0

      // hub
      g.fillStyle = '#111'
      g.strokeStyle = '#ff00e5'
      g.lineWidth = 3
      g.beginPath()
      g.arc(cx, cy, R * 0.14, 0, Math.PI * 2)
      g.fill()
      g.stroke()

      // marcha grande
      g.fillStyle = '#fff'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.font = `900 ${R * 0.42}px 'Courier New', monospace`
      g.shadowColor = '#00e5ff'
      g.shadowBlur = 14
      g.fillText(String(st.gear), cx, cy + R * 0.42)
      g.shadowBlur = 0
      g.font = `700 ${R * 0.12}px 'Courier New', monospace`
      g.fillStyle = 'rgba(255,255,255,0.6)'
      g.fillText('MARCHA', cx, cy + R * 0.66)

      // LUZ de corta-giro (lâmpada no topo)
      const lampY = cy - R * 0.72
      g.beginPath()
      g.arc(cx, lampY, R * 0.1, 0, Math.PI * 2)
      if (st.light) {
        g.fillStyle = '#ff2d55'
        g.shadowColor = '#ff2d55'
        g.shadowBlur = 40
      } else {
        g.fillStyle = 'rgba(255,45,85,0.18)'
        g.shadowBlur = 0
      }
      g.fill()
      g.shadowBlur = 0
      g.lineWidth = 2
      g.strokeStyle = 'rgba(255,255,255,0.4)'
      g.stroke()

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [stateRef])

  return <canvas ref={canvasRef} className="tach-canvas" />
}
