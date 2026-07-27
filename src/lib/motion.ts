import type { MotionDirection, StimulusType } from '../types'

export function coherentVelocity(type: StimulusType, direction: MotionDirection, speed: number) {
  const sign = ['forward', 'right', 'up'].includes(direction) ? 1 : -1
  if (type === 'radial') return [0, 0, sign * speed * 2.5] as const
  if (type === 'horizontal') return [sign * speed * 1.7, 0, 0] as const
  return [0, sign * speed * 1.7, 0] as const
}

export function wrapDepthZ(z: number, cameraZ: number, nearDistance: number, farDistance: number) {
  const nearZ = cameraZ - nearDistance
  const farZ = cameraZ - farDistance
  if (z > nearZ) return farZ
  if (z < farZ) return nearZ
  return z
}

export function lifetimeRespawnCoordinates(
  type: StimulusType,
  current: { x: number; y: number },
  sample: { x: number; y: number; distance: number },
  cameraZ: number,
) {
  return {
    x: type === 'radial' ? current.x : sample.x,
    y: type === 'radial' ? current.y : sample.y,
    z: cameraZ - sample.distance,
  }
}
