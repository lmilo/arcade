export type Sfx =
  | 'eat'
  | 'die'
  | 'move'
  | 'rotate'
  | 'lock'
  | 'clear'
  | 'merge'
  | 'slide'
  | 'bounce'
  | 'brick'
  | 'launch'
  | 'powerup'
  | 'start'
  | 'win'

interface ToneOpts {
  type?: OscillatorType
  gain?: number
  delay?: number
  slideTo?: number
}

const MASTER_GAIN = 0.25

/**
 * Sintetizador de efectos por Web Audio: cero archivos de audio, cero dependencias.
 * Cada sfx se compone de osciladores con envolvente y/o ráfagas de ruido.
 * Singleton: los juegos importan `audio` y llaman `audio.play('eat')`.
 */
class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private mutedFlag = false

  get muted() {
    return this.mutedFlag
  }

  /** Debe llamarse dentro de un gesto del usuario (click/tecla) para desbloquear el audio. */
  unlock() {
    this.ensure()
  }

  setMuted(m: boolean) {
    this.mutedFlag = m
    if (this.master) this.master.gain.value = m ? 0 : MASTER_GAIN
  }

  play(name: Sfx) {
    if (this.mutedFlag) return
    switch (name) {
      case 'eat':
        this.tone(523, 0.07)
        this.tone(784, 0.09, { delay: 0.06 })
        break
      case 'die':
        this.tone(330, 0.5, { type: 'sawtooth', slideTo: 70, gain: 0.3 })
        this.noise(0.3, 0.12)
        break
      case 'move':
        this.tone(180, 0.04, { gain: 0.1 })
        break
      case 'rotate':
        this.tone(440, 0.05, { type: 'triangle', gain: 0.16 })
        break
      case 'lock':
        this.tone(150, 0.07, { gain: 0.2 })
        break
      case 'clear':
        this.arp([523, 659, 784, 1047], 0.12, 'square')
        break
      case 'merge':
        this.tone(330, 0.08, { type: 'sine' })
        this.tone(660, 0.1, { delay: 0.05, type: 'sine' })
        break
      case 'slide':
        this.tone(120, 0.03, { type: 'sine', gain: 0.07 })
        break
      case 'bounce':
        this.tone(620, 0.04, { gain: 0.14 })
        break
      case 'brick':
        this.tone(880, 0.05, { gain: 0.18, slideTo: 1250 })
        this.noise(0.05, 0.06)
        break
      case 'launch':
        this.tone(300, 0.12, { type: 'sawtooth', slideTo: 720, gain: 0.18 })
        break
      case 'powerup':
        this.arp([523, 659, 784, 1047], 0.1, 'triangle')
        break
      case 'start':
        this.arp([392, 523, 659], 0.12, 'square')
        break
      case 'win':
        this.arp([523, 659, 784, 1047, 1319], 0.15, 'triangle')
        break
    }
  }

  private ensure(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.mutedFlag ? 0 : MASTER_GAIN
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  private arp(freqs: number[], step: number, type: OscillatorType) {
    freqs.forEach((f, i) => this.tone(f, step, { delay: i * step * 0.55, type }))
  }

  private tone(freq: number, dur: number, opts: ToneOpts = {}) {
    const ctx = this.ensure()
    const master = this.master
    if (!master) return
    const t = ctx.currentTime + (opts.delay ?? 0)
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = opts.type ?? 'square'
    osc.frequency.setValueAtTime(freq, t)
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t + dur)
    const peak = opts.gain ?? 0.28
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(g)
    g.connect(master)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }

  private noise(dur: number, peak: number) {
    const ctx = this.ensure()
    const master = this.master
    if (!master) return
    const t = ctx.currentTime
    const len = Math.floor(ctx.sampleRate * dur)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buf
    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 700
    const g = ctx.createGain()
    g.gain.setValueAtTime(peak, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(filter)
    filter.connect(g)
    g.connect(master)
    src.start(t)
    src.stop(t + dur)
  }
}

export const audio = new AudioEngine()
