import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { defaultConfig, type AppMode, type ResearchRole, type TrialConfig, type TrialPhase, type TrialResult, type TrialSequence } from './types'

interface AppState {
  mode: AppMode
  quality: 'performance' | 'balanced' | 'showcase'
  muted: boolean
  reducedEffects: boolean
  config: TrialConfig
  phase: TrialPhase
  results: TrialResult[]
  completedChannels: string[]
  researchRole: ResearchRole
  participantId: string
  sessionId: string
  sequence: TrialSequence | null
  sequenceCursor: number
  setMode: (mode: AppMode) => void
  setPhase: (phase: TrialPhase) => void
  setConfig: (patch: Partial<TrialConfig>) => void
  applyTrialConfig: (config: TrialConfig) => void
  addResult: (result: TrialResult) => void
  completeChannel: (channel: string) => void
  resetExperience: () => void
  toggleMuted: () => void
  setQuality: (quality: AppState['quality']) => void
  toggleReducedEffects: () => void
  setResearchRole: (role: ResearchRole) => void
  setParticipantId: (id: string) => void
  setSequence: (sequence: TrialSequence) => void
  advanceSequence: () => void
  clearSequence: () => void
}

export const useAppStore = create<AppState>()(persist((set) => ({
  mode: 'landing', quality: 'balanced', muted: true, reducedEffects: false,
  config: defaultConfig, phase: 'idle', results: [], completedChannels: [], researchRole: 'operator',
  participantId: 'P001', sessionId: crypto.randomUUID(), sequence: null, sequenceCursor: 0,
  setMode: mode => set({ mode, phase: 'idle' }), setPhase: phase => set({ phase }),
  setConfig: patch => set(s => ({ config: { ...s.config, ...patch }, sequence: null, sequenceCursor: 0 })),
  applyTrialConfig: config => set({ config }),
  addResult: result => set(s => ({ results: [...s.results, result] })),
  completeChannel: channel => set(s => ({ completedChannels: s.completedChannels.includes(channel) ? s.completedChannels : [...s.completedChannels, channel] })),
  resetExperience: () => set({ completedChannels: [], phase: 'idle' }),
  toggleMuted: () => set(s => ({ muted: !s.muted })), setQuality: quality => set({ quality }),
  toggleReducedEffects: () => set(s => ({ reducedEffects: !s.reducedEffects })),
  setResearchRole: researchRole => set({ researchRole }),
  setParticipantId: participantId => set({ participantId }),
  setSequence: sequence => set({ sequence, sequenceCursor: 0, results: [], sessionId: crypto.randomUUID() }),
  advanceSequence: () => set(s => ({ sequenceCursor: Math.min(s.sequenceCursor + 1, s.sequence?.trials.length ?? 0), phase: 'idle' })),
  clearSequence: () => set({ sequence: null, sequenceCursor: 0, phase: 'idle' }),
}), {
  name: 'afterflow-settings',
  version: 8,
  migrate: (persistedState, version) => {
    const saved = persistedState as Partial<Pick<AppState, 'quality' | 'muted' | 'reducedEffects'>> & { config?: Partial<TrialConfig> }
    return {
      quality: saved.quality ?? 'balanced',
      muted: saved.muted ?? true,
      reducedEffects: saved.reducedEffects ?? false,
      config: {
        ...defaultConfig,
        ...saved.config,
        ...(version < 3 ? {
          oppositeDirectionShare: 0.5,
          cockpitEnabled: true,
          concentricGuidesEnabled: true,
        } : {}),
        ...(version < 6 ? {
          adaptationOpacityEnvelope: 'raised-sine' as const,
          adaptationOpacityFrequencyHz: 0.75,
          adaptationMinimumOpacity: 0.55,
        } : {}),
        ...(version < 7 ? {
          adaptationVisibleFramesPerCycle: 1 as const,
        } : {}),
        ...(version < 8 ? {
          adaptationDotLifetimeMinMs: 180,
          adaptationDotLifetimeMaxMs: 520,
        } : {}),
      },
    }
  },
  partialize: s => ({ quality: s.quality, muted: s.muted, reducedEffects: s.reducedEffects, config: s.config, researchRole: s.researchRole, participantId: s.participantId }),
  merge: (persisted, current) => {
    const saved = persisted as Partial<AppState>
    return { ...current, ...saved, config: { ...defaultConfig, ...saved.config } }
  },
}))
