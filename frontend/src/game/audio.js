// Chiptune sound effects and a laid-back reggae loop, generated with the Web Audio API.

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12) // MIDI note -> Hz

export class Audio {
  constructor() {
    this.ctx = null
    this.muted = false
    this.music = null
  }

  // Browsers only allow audio after a key press, so this is called on input.
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.35
      this.master.connect(this.ctx.destination)
      const len = this.ctx.sampleRate * 0.5
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
      const d = this.noise.getChannelData(0)
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    }
    if (this.ctx.state === 'suspended') this.ctx.resume()
  }

  toggleMute() {
    this.muted = !this.muted
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.35
  }

  tone(f0, f1, dur, type = 'square', vol = 0.25, when = 0) {
    if (!this.ctx) return
    const t = this.ctx.currentTime + when
    const o = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(f0, t)
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur)
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    o.connect(g).connect(this.master)
    o.start(t)
    o.stop(t + dur + 0.02)
  }

  hiss(dur, vol = 0.2, when = 0, highpass = 1000) {
    if (!this.ctx) return
    const t = this.ctx.currentTime + when
    const s = this.ctx.createBufferSource()
    s.buffer = this.noise
    const f = this.ctx.createBiquadFilter()
    f.type = 'highpass'
    f.frequency.value = highpass
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    s.connect(f).connect(g).connect(this.master)
    s.start(t)
    s.stop(t + dur + 0.02)
  }

  play(name) {
    if (!this.ctx) return
    switch (name) {
      case 'jump': this.tone(280, 640, 0.16, 'square', 0.12); break
      case 'leaf': this.tone(988, 988, 0.06, 'square', 0.12); this.tone(1319, 1319, 0.22, 'square', 0.12, 0.06); break
      case 'stomp': this.tone(420, 90, 0.14, 'square', 0.2); break
      case 'bump': this.tone(140, 90, 0.09, 'triangle', 0.35); break
      case 'break': this.hiss(0.18, 0.3, 0, 400); this.tone(200, 60, 0.15, 'triangle', 0.3); break
      case 'sprout': this.tone(300, 900, 0.4, 'triangle', 0.25); break
      case 'power':
        [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => this.tone(NOTE(n), NOTE(n), 0.07, 'square', 0.12, i * 0.05))
        break
      case 'shrink': [72, 67, 64, 60].forEach((n, i) => this.tone(NOTE(n), NOTE(n), 0.08, 'square', 0.12, i * 0.07)); break
      case 'oneup': [76, 79, 88, 84, 86, 91].forEach((n, i) => this.tone(NOTE(n), NOTE(n), 0.09, 'square', 0.12, i * 0.08)); break
      case 'die': [71, 77, 77, 77, 76, 74, 72].forEach((n, i) => this.tone(NOTE(n), NOTE(n), 0.12, 'square', 0.14, i * 0.14)); break
      case 'flag': [55, 60, 64, 67, 72, 76, 79].forEach((n, i) => this.tone(NOTE(n), NOTE(n), 0.12, 'square', 0.12, i * 0.09)); break
      case 'tick': this.tone(1760, 1760, 0.03, 'square', 0.06); break
      case 'pause': this.tone(660, 660, 0.06, 'square', 0.12); this.tone(990, 990, 0.08, 'square', 0.12, 0.08); break
      case 'gameover': [67, 64, 60, 55, 52, 48].forEach((n, i) => this.tone(NOTE(n), NOTE(n), 0.22, 'triangle', 0.25, i * 0.22)); break
      default: break
    }
  }

  // ---------- Music: one-drop reggae groove, different chords per level ----------
  startMusic(level) {
    this.stopMusic()
    if (!this.ctx) return
    const progressions = [
      [[57, 60, 64], [55, 59, 62], [53, 57, 60], [55, 59, 62]], // Am G F G
      [[50, 53, 57], [57, 60, 64], [50, 53, 57], [52, 55, 59]], // Dm Am Dm Em
      [[52, 55, 59], [50, 54, 57], [48, 52, 55], [50, 54, 57]], // Em D C D
    ]
    const chords = progressions[level % progressions.length]
    const bpm = 84
    const step = 60 / bpm / 4 // 16th notes
    const leadPatterns = [
      [0, null, 3, null, 5, null, 3, 0, null, null, 7, null, 5, 3, null, null],
      [12, null, 10, 7, null, 5, null, 3, 5, null, null, 7, null, null, 3, null],
      [7, null, 5, null, 7, 10, null, 12, null, 10, 7, null, 5, null, 3, null],
    ]
    const lead = leadPatterns[level % leadPatterns.length]
    let n = 0
    let next = this.ctx.currentTime + 0.1
    const tick = () => {
      while (next < this.ctx.currentTime + 0.25) {
        const s = n % 16
        const bar = Math.floor(n / 16) % chords.length
        const ch = chords[bar]
        const when = next - this.ctx.currentTime
        // bass
        if (s === 0 || s === 3 || s === 8 || s === 10) {
          const b = s === 10 ? ch[0] - 5 : ch[0] - 12
          this.tone(NOTE(b), NOTE(b), step * 2.5, 'triangle', 0.32, when)
        }
        // offbeat "skank" chords
        if (s === 4 || s === 12) ch.forEach((c) => this.tone(NOTE(c + 12), NOTE(c + 12), step * 0.8, 'square', 0.035, when))
        // one-drop kick on beat 3, hats on the offbeats
        if (s === 8) this.tone(120, 45, 0.18, 'sine', 0.45, when)
        if (s % 4 === 2) this.hiss(0.04, 0.05, when, 7000)
        if (s === 12) this.hiss(0.1, 0.08, when, 2000)
        // lead every other bar
        if (Math.floor(n / 16) % 2 === 1 && lead[s] !== null) {
          const m = ch[0] + 12 + lead[s]
          this.tone(NOTE(m), NOTE(m), step * 1.6, 'square', 0.04, when)
        }
        n++
        next += step
      }
    }
    tick()
    this.music = setInterval(tick, 60)
  }

  stopMusic() {
    if (this.music) clearInterval(this.music)
    this.music = null
  }
}
