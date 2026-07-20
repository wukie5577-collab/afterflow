export type AppMode = 'landing' | 'experience' | 'research' | 'explain' | 'presentation'
export type ResearchRole = 'operator' | 'participant'
export type StimulusType = 'radial' | 'horizontal' | 'vertical'
export type MotionDirection = 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down' | 'static' | 'none'
export type TrialPhase = 'idle' | 'instructions' | 'fixation' | 'adaptation' | 'transition' | 'motion-test' | 'response' | 'complete'

export interface TrialConfig {
  stimulusType: StimulusType
  direction: MotionDirection
  adaptationDurationMs: number
  staticTestDurationMs: number
  speed: number
  particleCount: number
  particleSize: number
  particleNearDistance: number
  particleFarDistance: number
  presentation: 'full-field' | 'peripheral'
  randomSeed: number
  attentionTask: boolean
  oppositeDirectionShare: number
  luminance: number
  contrast: number
  apertureRadius: number
  peripheralInnerRadius: number
  cockpitEnabled: boolean
  concentricGuidesEnabled: boolean
  adaptationTemporalSamplingEnabled: boolean
  adaptationFrameStride: 3
  adaptationVisibleFramesPerCycle: 1
  adaptationOpacityEnvelope: 'raised-sine'
  adaptationOpacityFrequencyHz: number
  adaptationMinimumOpacity: number
}

export type ControlCondition = 'bidirectional-test' | 'same-only-control' | 'opposite-only-control' | 'no-adaptation-control'

export interface TrialDefinition {
  id: string
  trialIndex: number
  blockIndex: number
  condition: ControlCondition
  config: TrialConfig
}

export interface TrialSequence {
  id: string
  participantId: string
  createdAt: string
  counterbalanceOrder: 'AB' | 'BA'
  trials: TrialDefinition[]
}

export interface TrialEvent {
  type: 'trial-start' | 'phase-enter' | 'response-prompt' | 'response-selected' | 'pause' | 'resume' | 'focus-lost' | 'focus-restored' | 'visibility-hidden' | 'visibility-visible' | 'abort' | 'complete'
  atMs: number
  phase: TrialPhase
  detail?: string
}

export interface TemporalSamplingValidation {
  scheduler: 'webxr-predicted-display-time' | 'desktop-raf-estimate'
  validatedAgainstDisplayFrames: boolean
  observedFrameCount: number
  visibleFrameCount: number
  observedDutyCycle: number | null
  medianFrameIntervalMs: number | null
  effectiveVisibleRateHz: number | null
}

export type ResponseRelation = 'opposite-to-adaptation' | 'same-as-adaptation' | 'static' | 'unsure' | 'other'

export interface DisplayCalibrationStatus {
  viewingDistanceCm: null
  physicalScreenWidthCm: null
  visualAngleCalibrated: false
  estimatedRefreshRateHz: number | null
  refreshRateValidated: false
  deviceTimingValidated: false
  viewportWidthPx: number
  viewportHeightPx: number
  devicePixelRatio: number
}

export interface TrialResult {
  id: string
  timestamp: string
  config: TrialConfig
  maeConsistentDirection: MotionDirection
  response: MotionDirection | 'unsure'
  responseRelation: ResponseRelation
  responsePromptLatencyMs: number
  actualAdaptationDurationMs: number
  actualMotionTestDurationMs: number
  frameIntervals: number[]
  displayCalibration: DisplayCalibrationStatus
  warnings: string[]
  aborted: boolean
  sessionId: string
  participantId: string
  sequenceId: string
  trialIndex: number
  blockIndex: number
  condition: ControlCondition
  events: TrialEvent[]
  focusLossCount: number
  hiddenCount: number
  temporalSamplingValidation: TemporalSamplingValidation
}

export const defaultConfig: TrialConfig = {
  stimulusType: 'radial', direction: 'forward', adaptationDurationMs: 20000,
  staticTestDurationMs: 5000, speed: 1.2, particleCount: 100, particleSize: 0.045,
  particleNearDistance: 3, particleFarDistance: 23,
  presentation: 'peripheral', randomSeed: 1024, attentionTask: true,
  oppositeDirectionShare: 0.5, luminance: 0.82, contrast: 0.72, apertureRadius: 1,
  peripheralInnerRadius: 0.16, cockpitEnabled: true, concentricGuidesEnabled: true,
  adaptationTemporalSamplingEnabled: false, adaptationFrameStride: 3, adaptationVisibleFramesPerCycle: 1, adaptationOpacityEnvelope: 'raised-sine',
  adaptationOpacityFrequencyHz: 0.75, adaptationMinimumOpacity: 0.55,
}
