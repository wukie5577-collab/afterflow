import { assignedGroupCount, BLANK_TRANSITION_DURATION_MS, canTransition, deterministicGroupMask, estimateRefreshRate, isStimulusPhase, oppositeDirection, responseRelation, resultToCsv, seededRandom, validateConfig } from './trial'
import { defaultConfig, type TrialResult } from '../types'

describe('trial logic',()=>{
  it('maps all motion directions to their opposite',()=>{expect(oppositeDirection('forward')).toBe('backward');expect(oppositeDirection('left')).toBe('right');expect(oppositeDirection('up')).toBe('down')})
  it('enforces phase transitions',()=>{expect(canTransition('fixation','adaptation')).toBe(true);expect(canTransition('transition','motion-test')).toBe(true);expect(canTransition('fixation','response')).toBe(false)})
  it('uses a 200 ms blank interval between adaptation and test',()=>{expect(BLANK_TRANSITION_DURATION_MS).toBe(200)})
  it('identifies only the unobstructed stimulus-view phases',()=>{expect(isStimulusPhase('adaptation')).toBe(true);expect(isStimulusPhase('motion-test')).toBe(true);expect(isStimulusPhase('response')).toBe(false)})
  it('produces deterministic random values',()=>{const a=seededRandom(7),b=seededRandom(7);expect([a(),a(),a()]).toEqual([b(),b(),b()])})
  it('supports exact bidirectional group counts',()=>{expect(assignedGroupCount(100,0)).toBe(0);expect(assignedGroupCount(100,.5)).toBe(50);expect(assignedGroupCount(100,1)).toBe(100)})
  it('randomly assigns an exact deterministic 50/50 split',()=>{const a=deterministicGroupMask(100,.5,1024),b=deterministicGroupMask(100,.5,1024);expect([...a]).toEqual([...b]);expect([...a].reduce((sum,value)=>sum+value,0)).toBe(50)})
  it('classifies reports relative to adaptation without correctness scoring',()=>{expect(responseRelation('backward','forward')).toBe('opposite-to-adaptation');expect(responseRelation('forward','forward')).toBe('same-as-adaptation');expect(responseRelation('unsure','forward')).toBe('unsure')})
  it('estimates refresh rate from stable frame intervals',()=>{expect(estimateRefreshRate([16.6,16.7,16.7])).toBeCloseTo(59.9,1);expect(estimateRefreshRate([])).toBeNull()})
  it('validates safe configs',()=>{expect(validateConfig(defaultConfig)).toBe(true);expect(validateConfig({...defaultConfig,particleCount:3})).toBe(false)})
  it('serializes bias, reference, and calibration fields to CSV',()=>{const result:TrialResult={id:'t1',timestamp:'2026-01-01',config:defaultConfig,maeConsistentDirection:'backward',response:'backward',responseRelation:'opposite-to-adaptation',confidence:4,responsePromptLatencyMs:500,actualAdaptationDurationMs:20010,frameIntervals:[16.7],displayCalibration:{viewingDistanceCm:null,physicalScreenWidthCm:null,visualAngleCalibrated:false,estimatedRefreshRateHz:59.9,refreshRateValidated:false,deviceTimingValidated:false,viewportWidthPx:1280,viewportHeightPx:720,devicePixelRatio:2},warnings:[],aborted:false};const csv=resultToCsv([result]);expect(csv).toContain('responseRelation');expect(csv).toContain('cockpitEnabled');expect(csv).toContain('visualAngleCalibrated');expect(csv).toContain('opposite-to-adaptation')})
})
