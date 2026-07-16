import { canTransition, coherentSignalCount, deterministicGroupMask, oppositeDirection, resultToCsv, seededRandom, validateConfig } from './trial'
import { defaultConfig, type TrialResult } from '../types'

describe('trial logic',()=>{
  it('maps all motion directions to their opposite',()=>{expect(oppositeDirection('forward')).toBe('backward');expect(oppositeDirection('left')).toBe('right');expect(oppositeDirection('up')).toBe('down')})
  it('enforces phase transitions',()=>{expect(canTransition('fixation','adaptation')).toBe(true);expect(canTransition('transition','motion-test')).toBe(true);expect(canTransition('fixation','response')).toBe(false)})
  it('produces deterministic random values',()=>{const a=seededRandom(7),b=seededRandom(7);expect([a(),a(),a()]).toEqual([b(),b(),b()])})
  it('supports the full configurable coherence range',()=>{expect(coherentSignalCount(100,0)).toBe(0);expect(coherentSignalCount(100,.5)).toBe(50);expect(coherentSignalCount(100,1)).toBe(100)})
  it('randomly assigns an exact deterministic 50/50 split',()=>{const a=deterministicGroupMask(100,.5,1024),b=deterministicGroupMask(100,.5,1024);expect([...a]).toEqual([...b]);expect([...a].reduce((sum,value)=>sum+value,0)).toBe(50)})
  it('validates safe configs',()=>{expect(validateConfig(defaultConfig)).toBe(true);expect(validateConfig({...defaultConfig,particleCount:3})).toBe(false)})
  it('serializes a machine-readable CSV',()=>{const result:TrialResult={id:'t1',timestamp:'2026-01-01',config:defaultConfig,expectedAftereffect:'backward',response:'backward',confidence:4,reactionTimeMs:500,actualAdaptationDurationMs:20010,frameIntervals:[16.7],warnings:[],aborted:false};const csv=resultToCsv([result]);expect(csv).toContain('expectedAftereffect');expect(csv).toContain('backward')})
})
