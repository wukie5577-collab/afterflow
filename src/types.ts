export type AppMode = 'landing' | 'experience' | 'research' | 'explain' | 'presentation'
export type StimulusType = 'radial' | 'horizontal' | 'vertical'
export type MotionDirection = 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down' | 'static' | 'none'
export type TrialPhase = 'idle' | 'instructions' | 'fixation' | 'adaptation' | 'transition' | 'motion-test' | 'response' | 'confidence' | 'complete'

export interface TrialConfig {
  stimulusType: StimulusType
  direction: MotionDirection
  adaptationDurationMs: number
  staticTestDurationMs: number
  speed: number
  particleCount: number
  particleSize: number
  presentation: 'full-field' | 'peripheral'
  randomSeed: number
  attentionTask: boolean
  coherence: number
  luminance: number
  contrast: number
  apertureRadius: number
  peripheralInnerRadius: number
}

export interface TrialResult {
  id: string
  timestamp: string
  config: TrialConfig
  expectedAftereffect: MotionDirection
  response: MotionDirection | 'unsure'
  confidence: number
  reactionTimeMs: number
  actualAdaptationDurationMs: number
  frameIntervals: number[]
  warnings: string[]
  aborted: boolean
}

export const defaultConfig: TrialConfig = {
  stimulusType: 'radial', direction: 'forward', adaptationDurationMs: 20000,
  staticTestDurationMs: 5000, speed: 1.2, particleCount: 100, particleSize: 0.045,
  presentation: 'peripheral', randomSeed: 1024, attentionTask: true,
  coherence: 0.5, luminance: 0.82, contrast: 0.72, apertureRadius: 1,
  peripheralInnerRadius: 0.16,
}
