import { useState } from 'react'
import Title from './screens/Title.jsx'
import Countdown from './screens/Countdown.jsx'
import Race from './screens/Race.jsx'
import Results from './screens/Results.jsx'
import Leaderboard from './screens/Leaderboard.jsx'

export default function App() {
  const [screen, setScreen] = useState('title')
  const [mode, setMode] = useState('easy')
  const [run, setRun] = useState(null)
  const [lb, setLb] = useState(null) // { rows, source }
  const [highlight, setHighlight] = useState(null)

  const start = (m) => {
    setMode(m)
    setScreen('countdown')
  }

  return (
    <div className="app">
      {screen === 'title' && (
        <Title onStart={start} onLeaderboard={() => { setLb(null); setHighlight(null); setScreen('leaderboard') }} />
      )}

      {screen === 'countdown' && <Countdown onDone={() => setScreen('race')} />}

      {screen === 'race' && (
        <Race
          mode={mode}
          onFinish={(r) => {
            setRun(r)
            setScreen('results')
          }}
        />
      )}

      {screen === 'results' && run && (
        <Results
          run={run}
          onReplay={() => setScreen('countdown')}
          onSubmitted={({ rows, source, entry }) => {
            setLb({ rows, source })
            setHighlight(entry)
            setScreen('leaderboard')
          }}
        />
      )}

      {screen === 'leaderboard' && (
        <Leaderboard
          initial={lb}
          highlight={highlight}
          onBack={() => setScreen('title')}
        />
      )}
    </div>
  )
}
