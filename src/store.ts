import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { defaultConfig, type AppMode, type TrialConfig, type TrialPhase, type TrialResult } from './types'

interface AppState {
  mode: AppMode
  quality: 'performance' | 'balanced' | 'showcase'
  muted: boolean
  reducedEffects: boolean
  config: TrialConfig
  phase: TrialPhase
  results: TrialResult[]
  completedChannels: string[]
  setMode: (mode: AppMode) => void
  setPhase: (phase: TrialPhase) => void
  setConfig: (patch: Partial<TrialConfig>) => void
  addResult: (result: TrialResult) => void
  completeChannel: (channel: string) => void
  resetExperience: () => void
  toggleMuted: () => void
  setQuality: (quality: AppState['quality']) => void
  toggleReducedEffects: () => void
}

export const useAppStore = create<AppState>()(persist((set) => ({
  mode: 'landing', quality: 'balanced', muted: true, reducedEffects: false,
  config: defaultConfig, phase: 'idle', results: [], completedChannels: [],
  setMode: mode => set({ mode, phase: 'idle' }), setPhase: phase => set({ phase }),
  setConfig: patch => set(s => ({ config: { ...s.config, ...patch } })),
  addResult: result => set(s => ({ results: [...s.results, result] })),
  completeChannel: channel => set(s => ({ completedChannels: s.completedChannels.includes(channel) ? s.completedChannels : [...s.completedChannels, channel] })),
  resetExperience: () => set({ completedChannels: [], phase: 'idle' }),
  toggleMuted: () => set(s => ({ muted: !s.muted })), setQuality: quality => set({ quality }),
  toggleReducedEffects: () => set(s => ({ reducedEffects: !s.reducedEffects })),
}), {
  name: 'afterflow-settings',
  version: 7,
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
      },
    }
  },
  partialize: s => ({ quality: s.quality, muted: s.muted, reducedEffects: s.reducedEffects, config: s.config }),
  merge: (persisted, current) => {
    const saved = persisted as Partial<AppState>
    return { ...current, ...saved, config: { ...defaultConfig, ...saved.config } }
  },
}))
