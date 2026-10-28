import { useEffect, useRef, useState, useCallback } from 'react'
import { Game, GAME_KEYS } from './game/engine.js'
import config from './game/config.js'
import './App.css'

const API = '/api/game'
const KEY = 'space-cats-player-name'
const LOCAL = 'space-cats-local-scores'

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL) || '[]')
  } catch {
    return []
  }
}

function saveLocal(entry) {
  const list = [...readLocal(), entry].sort((a, b) => b.score - a.score).slice(0, 10)
  try {
    localStorage.setItem(LOCAL, JSON.stringify(list))
  } catch {
    // storage unavailable
  }
  return list
}

function App() {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const overlayOpen = useRef(false)
  const [result, setResult] = useState(null) // { kind, score, level }
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem(KEY) || ''
    } catch {
      return ''
    }
  })
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved | local
  const [scores, setScores] = useState(null) // null = not loaded, array = loaded
  const [offline, setOffline] = useState(false) // true = no backend, scores are kept in this browser

  const loadScores = useCallback(async () => {
    try {
      const res = await fetch(`${API}/scores/top`)
      if (!(res.headers.get('content-type') || '').includes('json')) throw new Error('no backend')
      if (!res.ok) throw new Error(res.statusText)
      setScores(await res.json())
      setOffline(false)
    } catch {
      setScores(readLocal())
      setOffline(true)
    }
  }, [])

  useEffect(() => {
    const game = new Game(canvasRef.current, {
      onEnd: (kind, score, level) => {
        overlayOpen.current = true
        game.clearKeys()
        setSaveState('idle')
        setResult({ kind, score, level })
      },
    })
    gameRef.current = game

    const onDown = (e) => {
      if (overlayOpen.current) return
      if (GAME_KEYS.has(e.code)) e.preventDefault()
      game.setKey(e.code, true)
    }
    const onUp = (e) => game.setKey(e.code, false)
    const onBlur = () => game.clearKeys()
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', onBlur)
    loadScores()
    return () => {
      game.destroy()
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [loadScores])

  const closeResult = () => {
    overlayOpen.current = false
    setResult(null)
    gameRef.current?.toTitle()
    canvasRef.current?.focus()
  }

  const saveScore = async (e) => {
    e.preventDefault()
    const playerName = name.trim().slice(0, 20)
    if (!playerName) return
    try {
      localStorage.setItem(KEY, playerName)
    } catch {
      // storage unavailable, not a problem
    }
    setSaveState('saving')
    try {
      const res = await fetch(`${API}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName, score: result.score, level: result.level }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.status !== 'success') throw new Error('save failed')
      setSaveState('saved')
      loadScores()
    } catch {
      setScores(saveLocal({ playerName, score: result.score, level: result.level }))
      setOffline(true)
      setSaveState('local')
    }
  }

  return (
    <div className="page">
      <div className="screen">
        <canvas ref={canvasRef} className="game" tabIndex={0} aria-label={config.title} />
        {result && (
          <div className="result">
            <div className="result-card">
              <h2>{result.kind === 'win' ? 'Victory! All 10 planets saved' : 'Game over'}</h2>
              <p className="result-score">
                {result.score.toLocaleString()} points
                {result.kind !== 'win' && ` · reached planet ${result.level}`}
              </p>
              {saveState === 'saved' || saveState === 'local' ? (
                <p className="ok">
                  {saveState === 'saved' ? 'Score saved to the leaderboard.' : 'Score saved in this browser (the leaderboard server is offline).'}
                </p>
              ) : (
                <form onSubmit={saveScore}>
                  <label htmlFor="player-name">Your name</label>
                  <div className="row">
                    <input
                      id="player-name"
                      value={name}
                      maxLength={20}
                      autoFocus
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                    />
                    <button type="submit" disabled={saveState === 'saving' || !name.trim()}>
                      {saveState === 'saving' ? 'Saving…' : 'Save score'}
                    </button>
                  </div>
                </form>
              )}
              <button className="ghost" onClick={closeResult}>
                Back to title
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="below">
        <section className="panel">
          <h3>Controls</h3>
          <ul className="keys">
            <li>
              <b>Player 1</b> <kbd>←</kbd><kbd>→</kbd> move · <kbd>↑</kbd> jump · <kbd>Right Shift</kbd> run
            </li>
            <li>
              <b>Player 2</b> <kbd>A</kbd><kbd>D</kbd> move · <kbd>W</kbd> jump · <kbd>Space</kbd> run
            </li>
            <li><kbd>Enter</kbd> start · <kbd>P</kbd> pause · <kbd>M</kbd> mute</li>
          </ul>
          <p className="hint">
            Playing alone? Both sets of keys work. Hold jump to jump higher. Grab a can of {config.powerUp.name} to break
            panels and survive one hit. In 2 player mode a fallen cat floats back in a bubble while the other one is still
            standing. Reach the rocket at the end of each planet: it takes you to the next one.
          </p>
        </section>
        <section className="panel">
          <h3>High scores</h3>
          {scores === null && <p className="hint">Loading…</p>}
          {offline && <p className="hint">Leaderboard server offline: scores are kept in this browser.</p>}
          {Array.isArray(scores) && scores.length === 0 && <p className="hint">No scores yet. Be the first!</p>}
          {Array.isArray(scores) && scores.length > 0 && (
            <ol className="scores">
              {scores.map((s, i) => (
                <li key={s.id ?? i}>
                  <span>{s.playerName}</span>
                  <span>{Number(s.score).toLocaleString()}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}

export default App
