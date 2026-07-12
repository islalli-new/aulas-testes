import { useState } from 'react'

export default function App() {
  const [contador, setContador] = useState(0)

  return (
    <main className="card">
      <h1>👋 Hello World</h1>
      <p>Feito com React + Docker — aula do Rapha</p>

      <button onClick={() => setContador((n) => n + 1)}>
        Cliquei {contador} {contador === 1 ? 'vez' : 'vezes'}
      </button>

      <p className="dica">
        Abra este mesmo link em outro dispositivo pra testar. 🚀
      </p>
    </main>
  )
}
