import { describe, expect, it } from 'vitest'
import { changingDisparityOffsets, coherentVelocity, lifetimeRespawnCoordinates, wrapDepthZ } from './motion'

describe('true depth-axis motion', () => {
  it('uses only positive z velocity for forward radial motion', () => {
    expect(coherentVelocity('radial', 'forward', 1.2)).toEqual([0, 0, 3])
  })

  it('uses only negative z velocity for backward radial motion', () => {
    expect(coherentVelocity('radial', 'backward', 1.2)).toEqual([0, 0, -3])
  })

  it('wraps only the depth coordinate at near and far boundaries', () => {
    expect(wrapDepthZ(6, 8, 3, 23)).toBe(-15)
    expect(wrapDepthZ(-16, 8, 3, 23)).toBe(5)
  })

  it('preserves x/y when a radial particle lifetime expires', () => {
    expect(lifetimeRespawnCoordinates(
      'radial',
      { x: 1.25, y: -0.75 },
      { x: -4, y: 3, distance: 11 },
      8,
    )).toEqual({ x: 1.25, y: -0.75, z: -3 })
  })
})

describe('changing-disparity-only stereo', () => {
  it('has zero disparity at the convergence plane', () => {
    expect(changingDisparityOffsets(12, 12, 0.026)).toEqual({ red: 0, cyan: -0 })
  })

  it('keeps the cyclopean midpoint fixed while changing horizontal disparity', () => {
    const offsets = changingDisparityOffsets(6, 12, 0.026)
    expect(offsets.red).toBeCloseTo(0.013)
    expect(offsets.cyan).toBeCloseTo(-0.013)
    expect(offsets.red + offsets.cyan).toBe(0)
  })

  it('can swap eye channels without changing disparity magnitude', () => {
    expect(changingDisparityOffsets(6, 12, 0.026, true)).toEqual({ red: -0.013, cyan: 0.013 })
  })
})
