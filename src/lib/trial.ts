import type { ControlCondition, DisplayCalibrationStatus, MotionDirection, ResponseRelation, TemporalSamplingValidation, TrialConfig, TrialDefinition, TrialPhase, TrialResult, TrialSequence } from '../types'

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
  'motion-test': ['response', 'idle'], response: ['complete', 'idle'], complete: ['idle', 'instructions'],
}

export function canTransition(from: TrialPhase, to: TrialPhase) { return legalTransitions[from].includes(to) }

export function seededRandom(seed: number) {
  let value = seed >>> 0
  return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296 }
}

export function sampleParticleCoordinates(config: TrialConfig, random: () => number) {
  const theta = random() * Math.PI * 2
  const minRadius = config.presentation === 'peripheral' ? config.peripheralInnerRadius * 5 : 0.05
  const radius = minRadius + Math.sqrt(random()) * (config.apertureRadius * 4.7 - minRadius)
  const distance = config.particleNearDistance + random() * (config.particleFarDistance - config.particleNearDistance)
  return { x: Math.cos(theta) * radius, y: Math.sin(theta) * radius, distance }
}

function hashText(value: string) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619)
  return hash >>> 0
}

export function buildCounterbalancedSequence(participantId: string, base: TrialConfig, repetitions = 1): TrialSequence {
  const participantSeed = hashText(participantId || 'anonymous')
  const order: TrialSequence['counterbalanceOrder'] = participantSeed % 2 === 0 ? 'AB' : 'BA'
  const directionPair: MotionDirection[] = base.stimulusType === 'radial' ? ['forward', 'backward'] : base.stimulusType === 'horizontal' ? ['left', 'right'] : ['up', 'down']
  if (order === 'BA') directionPair.reverse()
  const condition: ControlCondition = base.oppositeDirectionShare === 0
    ? 'same-only-control'
    : base.oppositeDirectionShare === 1
      ? 'opposite-only-control'
      : 'bidirectional-test'
  const trials: TrialDefinition[] = []
  for (let block = 0; block < Math.max(1, repetitions); block++) {
    const blockTrials: TrialDefinition[] = []
    for (const direction of directionPair) for (const cockpitEnabled of [true, false]) for (const concentricGuidesEnabled of [true, false]) {
      const trialIndex = blockTrials.length
      blockTrials.push({
        id: `${participantId || 'anonymous'}-${block + 1}-${trialIndex + 1}`,
        trialIndex: 0,
        blockIndex: block,
        condition,
        config: { ...base, direction, oppositeDirectionShare: base.oppositeDirectionShare, cockpitEnabled, concentricGuidesEnabled, randomSeed: participantSeed ^ (block * 4099 + trialIndex * 131) },
      })
    }
    const random = seededRandom(participantSeed ^ (block + 1) * 0x9e3779b9)
    for (let i = blockTrials.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [blockTrials[i], blockTrials[j]] = [blockTrials[j], blockTrials[i]] }
    trials.push(...blockTrials)
  }
  trials.forEach((trial, index) => { trial.trialIndex = index })
  return { id: crypto.randomUUID(), participantId, createdAt: new Date().toISOString(), counterbalanceOrder: order, trials }
}

export function temporalSamplingSummary(frameTimes: number[], visibleFrameCount: number, scheduler: TemporalSamplingValidation['scheduler']): TemporalSamplingValidation {
  const intervals = frameTimes.slice(1).map((value, index) => value - frameTimes[index]).filter(value => value > 0 && value < 100)
  const sorted = [...intervals].sort((a, b) => a - b)
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null
  return {
    scheduler,
    validatedAgainstDisplayFrames: scheduler === 'webxr-predicted-display-time',
    observedFrameCount: frameTimes.length,
    visibleFrameCount,
    observedDutyCycle: frameTimes.length ? visibleFrameCount / frameTimes.length : null,
    medianFrameIntervalMs: median,
    effectiveVisibleRateHz: median ? 1000 / median / 3 : null,
  }
}

export function responseLatencyMs(promptTimestamp: number, responseTimestamp: number) {
  if (!Number.isFinite(promptTimestamp) || !Number.isFinite(responseTimestamp) || promptTimestamp <= 0 || responseTimestamp < promptTimestamp) return 0
  return Math.round(responseTimestamp - promptTimestamp)
}

export function assignedGroupCount(count: number, share: number) {
  return Math.round(count * Math.min(1, Math.max(0, share)))
}

export function raisedSineOpacity(elapsedSeconds: number, frequencyHz: number, minimumOpacity: number) {
  const floor = Math.min(1, Math.max(0, minimumOpacity))
  const wave = 0.5 + 0.5 * Math.sin(2 * Math.PI * frequencyHz * Math.max(0, elapsedSeconds) - Math.PI / 2)
  return floor + (1 - floor) * wave
}

export function isTemporalSampleFrame(frameIndex: number, stride: number) {
  if (stride < 2) return true
  const cycleFrame = ((frameIndex % stride) + stride) % stride
  return cycleFrame === Math.floor(stride / 2)
}

export function temporalDutyCycleOpacity(frameIndex: number, stride: number, visibleFrameOpacity: number) {
  return isTemporalSampleFrame(frameIndex, stride) ? Math.min(1, Math.max(0, visibleFrameOpacity)) : 0
}

export function usesAdaptationTemporalSampling(renderMode: 'idle' | 'adaptation' | 'blank' | 'test', enabled: boolean) {
  return enabled && renderMode === 'adaptation'
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
  const header = ['id','sessionId','participantId','sequenceId','trialIndex','blockIndex','condition','timestamp','stimulusType','adaptationDirection','response','responseRelation','responsePromptLatencyMs','adaptationDurationMs','actualAdaptationDurationMs','motionTestDurationMs','actualMotionTestDurationMs','blankTransitionDurationMs','particleCount','particleSize','conceptualSpeed','oppositeDirectionShare','randomSeed','cockpitEnabled','concentricGuidesEnabled','temporalScheduler','displayFrameValidated','observedFrameCount','visibleFrameCount','observedDutyCycle','effectiveVisibleRateHz','focusLossCount','hiddenCount','events','warnings','aborted']
  const rows = results.map(r => [r.id,r.sessionId,r.participantId,r.sequenceId,r.trialIndex,r.blockIndex,r.condition,r.timestamp,r.config.stimulusType,r.config.direction,r.response,r.responseRelation,r.responsePromptLatencyMs,r.config.adaptationDurationMs,r.actualAdaptationDurationMs,r.config.staticTestDurationMs,r.actualMotionTestDurationMs,BLANK_TRANSITION_DURATION_MS,r.config.particleCount,r.config.particleSize,r.config.speed,r.config.oppositeDirectionShare,r.config.randomSeed,r.config.cockpitEnabled,r.config.concentricGuidesEnabled,r.temporalSamplingValidation.scheduler,r.temporalSamplingValidation.validatedAgainstDisplayFrames,r.temporalSamplingValidation.observedFrameCount,r.temporalSamplingValidation.visibleFrameCount,r.temporalSamplingValidation.observedDutyCycle,r.temporalSamplingValidation.effectiveVisibleRateHz,r.focusLossCount,r.hiddenCount,JSON.stringify(r.events),r.warnings.join('|'),r.aborted].map(csvCell).join(','))
  return [header.join(','), ...rows].join('\n')
}

function csvCell(value: unknown) { const s = String(value); return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s }

export function downloadText(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click()
  URL.revokeObjectURL(url)
}

export function validateConfig(config: TrialConfig) {
  return config.particleCount >= 24 && config.particleCount <= 1200
    && config.particleSize >= 0.005 && config.particleSize <= 0.2
    && config.particleNearDistance >= 0.5 && config.particleNearDistance <= 20
    && config.particleFarDistance >= config.particleNearDistance + 1 && config.particleFarDistance <= 50
    && config.speed >= 0 && config.speed <= 4
    && config.adaptationDurationMs >= 500 && config.adaptationDurationMs <= 120000
    && config.staticTestDurationMs >= 250 && config.staticTestDurationMs <= 60000
    && config.oppositeDirectionShare >= 0 && config.oppositeDirectionShare <= 1
    && config.adaptationFrameStride === 3
    && config.adaptationVisibleFramesPerCycle === 1
    && config.adaptationOpacityEnvelope === 'raised-sine'
    && config.adaptationOpacityFrequencyHz >= 0.05 && config.adaptationOpacityFrequencyHz <= 5
    && config.adaptationMinimumOpacity >= 0 && config.adaptationMinimumOpacity <= 1
}
