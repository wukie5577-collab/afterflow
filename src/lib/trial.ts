import type { DisplayCalibrationStatus, MotionDirection, ResponseRelation, TrialConfig, TrialPhase, TrialResult } from '../types'

export const BLANK_TRANSITION_DURATION_MS = 200

const stimulusPhases = new Set<TrialPhase>(['fixation','adaptation','transition','motion-test'])

export function isStimulusPhase(phase: TrialPhase) { return stimulusPhases.has(phase) }

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

export function assignedGroupCount(count: number, share: number) {
  return Math.round(count * Math.min(1, Math.max(0, share)))
}

export function deterministicGroupMask(count: number, share: number, seed: number) {
  const mask = new Uint8Array(count)
  mask.fill(1, 0, assignedGroupCount(count, share))
  const random = seededRandom(seed)
  for (let i = mask.length - 1; i > 0; i--) {
    const swapIndex = Math.floor(random() * (i + 1))
    const value = mask[i]; mask[i] = mask[swapIndex]; mask[swapIndex] = value
  }
  return mask
}

export function responseRelation(response: MotionDirection | 'unsure', adaptationDirection: MotionDirection): ResponseRelation {
  if (response === 'unsure') return 'unsure'
  if (response === 'static') return 'static'
  if (response === adaptationDirection) return 'same-as-adaptation'
  if (response === oppositeDirection(adaptationDirection)) return 'opposite-to-adaptation'
  return 'other'
}

export function estimateRefreshRate(frameIntervals: number[]) {
  const stable = frameIntervals.filter(value => value >= 5 && value <= 50).sort((a, b) => a - b)
  if (!stable.length) return null
  const middle = Math.floor(stable.length / 2)
  const median = stable.length % 2 ? stable[middle] : (stable[middle - 1] + stable[middle]) / 2
  return Number((1000 / median).toFixed(1))
}

export function displayCalibrationStatus(frameIntervals: number[]): DisplayCalibrationStatus {
  return {
    viewingDistanceCm: null,
    physicalScreenWidthCm: null,
    visualAngleCalibrated: false,
    estimatedRefreshRateHz: estimateRefreshRate(frameIntervals),
    refreshRateValidated: false,
    deviceTimingValidated: false,
    viewportWidthPx: window.innerWidth,
    viewportHeightPx: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
  }
}

export function resultToCsv(results: TrialResult[]) {
  const header = ['id','timestamp','stimulusType','adaptationDirection','maeConsistentDirection','response','responseRelation','confidence','responsePromptLatencyMs','adaptationDurationMs','actualAdaptationDurationMs','particleCount','conceptualSpeed','oppositeDirectionShare','randomSeed','cockpitEnabled','concentricGuidesEnabled','viewingDistanceCm','physicalScreenWidthCm','visualAngleCalibrated','estimatedRefreshRateHz','refreshRateValidated','deviceTimingValidated','viewportWidthPx','viewportHeightPx','devicePixelRatio','warnings','aborted']
  const rows = results.map(r => [r.id,r.timestamp,r.config.stimulusType,r.config.direction,r.maeConsistentDirection,r.response,r.responseRelation,r.confidence,r.responsePromptLatencyMs,r.config.adaptationDurationMs,r.actualAdaptationDurationMs,r.config.particleCount,r.config.speed,r.config.oppositeDirectionShare,r.config.randomSeed,r.config.cockpitEnabled,r.config.concentricGuidesEnabled,r.displayCalibration.viewingDistanceCm,r.displayCalibration.physicalScreenWidthCm,r.displayCalibration.visualAngleCalibrated,r.displayCalibration.estimatedRefreshRateHz,r.displayCalibration.refreshRateValidated,r.displayCalibration.deviceTimingValidated,r.displayCalibration.viewportWidthPx,r.displayCalibration.viewportHeightPx,r.displayCalibration.devicePixelRatio,r.warnings.join('|'),r.aborted].map(csvCell).join(','))
  return [header.join(','), ...rows].join('\n')
}

function csvCell(value: unknown) { const s = String(value); return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s }

export function downloadText(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click()
  URL.revokeObjectURL(url)
}

export function validateConfig(config: TrialConfig) {
  return config.particleCount >= 24 && config.particleCount <= 1200 && config.speed >= 0 && config.speed <= 4 && config.adaptationDurationMs >= 1000 && config.oppositeDirectionShare === 0.5
}
