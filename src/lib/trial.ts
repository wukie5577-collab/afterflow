import type { MotionDirection, TrialConfig, TrialPhase, TrialResult } from '../types'

export const oppositeDirection = (direction: MotionDirection): MotionDirection => ({
  forward: 'backward', backward: 'forward', left: 'right', right: 'left',
  up: 'down', down: 'up', static: 'static', none: 'none',
})[direction] as MotionDirection

const legalTransitions: Record<TrialPhase, TrialPhase[]> = {
  idle: ['instructions'], instructions: ['fixation', 'idle'], fixation: ['adaptation', 'idle'],
  adaptation: ['transition', 'idle'], transition: ['motion-test', 'idle'],
  'motion-test': ['response', 'idle'], response: ['confidence', 'complete', 'idle'],
  confidence: ['complete', 'idle'], complete: ['idle', 'instructions'],
}

export function canTransition(from: TrialPhase, to: TrialPhase) { return legalTransitions[from].includes(to) }

export function seededRandom(seed: number) {
  let value = seed >>> 0
  return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296 }
}

export function coherentSignalCount(count: number, coherence: number) {
  return Math.round(count * Math.min(1, Math.max(0, coherence)))
}

export function deterministicGroupMask(count: number, share: number, seed: number) {
  const mask = new Uint8Array(count)
  mask.fill(1, 0, coherentSignalCount(count, share))
  const random = seededRandom(seed)
  for (let i = mask.length - 1; i > 0; i--) {
    const swapIndex = Math.floor(random() * (i + 1))
    const value = mask[i]; mask[i] = mask[swapIndex]; mask[swapIndex] = value
  }
  return mask
}

export function resultToCsv(results: TrialResult[]) {
  const header = ['id','timestamp','stimulusType','direction','expectedAftereffect','response','confidence','reactionTimeMs','adaptationDurationMs','actualAdaptationDurationMs','particleCount','speed','oppositeDirectionShare','seed','warnings','aborted']
  const rows = results.map(r => [r.id,r.timestamp,r.config.stimulusType,r.config.direction,r.expectedAftereffect,r.response,r.confidence,r.reactionTimeMs,r.config.adaptationDurationMs,r.actualAdaptationDurationMs,r.config.particleCount,r.config.speed,r.config.coherence,r.config.randomSeed,r.warnings.join('|'),r.aborted].map(csvCell).join(','))
  return [header.join(','), ...rows].join('\n')
}

function csvCell(value: unknown) { const s = String(value); return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s }

export function downloadText(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click()
  URL.revokeObjectURL(url)
}

export function validateConfig(config: TrialConfig) {
  return config.particleCount >= 24 && config.particleCount <= 1200 && config.speed >= 0 && config.speed <= 4 && config.adaptationDurationMs >= 1000 && config.coherence >= 0 && config.coherence <= 1
}
