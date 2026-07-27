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

export function changingDisparityOffsets(
  virtualDistance: number,
  convergenceDistance: number,
  eyeSeparation: number,
  swapEyes = false,
) {
  const disparity = eyeSeparation * (convergenceDistance / virtualDistance - 1)
  const red = (swapEyes ? -1 : 1) * disparity * .5
  return { red, cyan: -red }
}

export function advanceCoherentDepth(
  distance: number,
  velocityZ: number,
  deltaSeconds: number,
  cameraZ: number,
  nearDistance: number,
  farDistance: number,
) {
  const nextZ = wrapDepthZ(
    cameraZ - distance + velocityZ * deltaSeconds,
    cameraZ,
    nearDistance,
    farDistance,
  )
  return cameraZ - nextZ
}

export function oneWayCoherentDepth(
  focusDistance: number,
  amplitude: number,
  progress: number,
  direction: MotionDirection,
) {
  const clampedProgress = Math.min(1, Math.max(0, progress))
  const nearDistance = focusDistance - amplitude
  const farDistance = focusDistance + amplitude
  return direction === 'forward'
    ? farDistance - clampedProgress * amplitude * 2
    : nearDistance + clampedProgress * amplitude * 2
}

export function repeatingOneWayProgress(
  elapsedSeconds: number,
  travelDurationSeconds: number,
  endpointHoldSeconds: number,
) {
  const travelDuration = Math.max(0.001, travelDurationSeconds)
  const cycleDuration = travelDuration + Math.max(0, endpointHoldSeconds)
  const cycleTime = Math.max(0, elapsedSeconds) % cycleDuration
  return Math.min(1, cycleTime / travelDuration)
}
