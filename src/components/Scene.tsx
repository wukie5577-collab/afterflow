import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { CockpitReferenceFrame } from './CockpitReferenceFrame'
import { deterministicGroupMask, isTemporalSampleFrame, oppositeDirection, raisedSineOpacity, sampleParticleCoordinates, seededRandom, temporalDutyCycleOpacity, usesAdaptationTemporalSampling } from '../lib/trial'
import { useAppStore } from '../store'
import type { MotionDirection, StimulusType, TrialConfig } from '../types'

type MotionMode = 'idle' | 'adaptation' | 'blank' | 'test'

const CAMERA_Z = 8

interface ParticleSeed {
  positions: Float32Array
  signal: Uint8Array
}

function makeParticleSeed(config: TrialConfig, count: number): ParticleSeed {
  const random = seededRandom(config.randomSeed)
  const positions = new Float32Array(count * 3)
  const signal = deterministicGroupMask(count, config.oppositeDirectionShare, config.randomSeed ^ 0x9e3779b9)
  for (let i = 0; i < count; i++) {
    const sample = sampleParticleCoordinates(config, random)
    positions[i * 3] = sample.x
    positions[i * 3 + 1] = sample.y
    positions[i * 3 + 2] = CAMERA_Z - sample.distance
  }
  return { positions, signal }
}

function coherentVelocity(type: StimulusType, direction: MotionDirection, speed: number) {
  const sign = ['forward', 'right', 'up'].includes(direction) ? 1 : -1
  if (type === 'radial') return [0, 0, sign * speed * 2.5] as const
  if (type === 'horizontal') return [sign * speed * 1.7, 0, 0] as const
  return [0, sign * speed * 1.7, 0] as const
}

function wrapPosition(position: THREE.Vector3, config: TrialConfig, random: () => number) {
  const nearZ = CAMERA_Z - config.particleNearDistance
  const farZ = CAMERA_Z - config.particleFarDistance
  if (position.z > nearZ || position.z < farZ) {
    const sample = sampleParticleCoordinates(config, random)
    position.x = sample.x
    position.y = sample.y
    position.z = position.z > nearZ ? farZ : nearZ
    return
  }
  if (position.x > 5.4 || position.x < -5.4) {
    const sample = sampleParticleCoordinates(config, random)
    position.x = position.x > 5.4 ? -5.4 : 5.4
    position.y = sample.y
    position.z = CAMERA_Z - sample.distance
    return
  }
  if (position.y > 4.2 || position.y < -4.2) {
    const sample = sampleParticleCoordinates(config, random)
    position.x = sample.x
    position.y = position.y > 4.2 ? -4.2 : 4.2
    position.z = CAMERA_Z - sample.distance
  }
}

function CoherenceStimulus({ config, count, mode, onTemporalFrame }: { config: TrialConfig; count: number; mode: MotionMode; onTemporalFrame?: (timestamp: number, visible: boolean, scheduler: 'webxr-predicted-display-time' | 'desktop-raf-estimate') => void }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const material = useRef<THREE.MeshBasicMaterial>(null)
  const adaptationFrame = useRef(0)
  const accumulatedAdaptationDelta = useRef(0)
  const adaptationOpacityElapsed = useRef(0)
  const seed = useMemo(() => makeParticleSeed(config, count), [config, count])
  const respawnRandom = useMemo(() => seededRandom(config.randomSeed ^ 0x85ebca6b), [config.randomSeed])
  const position = useMemo(() => new THREE.Vector3(), [])
  const matrix = useMemo(() => new THREE.Matrix4(), [])
  const testDirection = oppositeDirection(config.direction)

  useEffect(() => {
    adaptationFrame.current = 0
    accumulatedAdaptationDelta.current = 0
    adaptationOpacityElapsed.current = 0
    if (material.current) material.current.opacity = 1
  }, [mode])

  useFrame((state, delta, xrFrame) => {
    if (!mesh.current) return
    const adaptationVelocity = coherentVelocity(config.stimulusType, config.direction, config.speed)
    const oppositeVelocity = coherentVelocity(config.stimulusType, testDirection, config.speed)
    const frameDelta = Math.min(delta, 0.05)
    const temporalSamplingActive = usesAdaptationTemporalSampling(mode, config.adaptationTemporalSamplingEnabled)
    let motionDelta = frameDelta
    let advancePositions = mode !== 'idle'

    if (temporalSamplingActive) {
      const stride = config.adaptationFrameStride
      adaptationOpacityElapsed.current += frameDelta
      const visibleFrameOpacity = raisedSineOpacity(adaptationOpacityElapsed.current, config.adaptationOpacityFrequencyHz, config.adaptationMinimumOpacity)
      if (material.current) material.current.opacity = temporalDutyCycleOpacity(adaptationFrame.current, stride, visibleFrameOpacity)
      accumulatedAdaptationDelta.current += frameDelta
      advancePositions = isTemporalSampleFrame(adaptationFrame.current, stride)
      const xrTimestamp = xrFrame?.predictedDisplayTime
      onTemporalFrame?.(xrTimestamp ?? state.clock.elapsedTime * 1000, advancePositions, xrTimestamp == null ? 'desktop-raf-estimate' : 'webxr-predicted-display-time')
      if (advancePositions) {
        motionDelta = Math.min(accumulatedAdaptationDelta.current, 0.15)
        accumulatedAdaptationDelta.current = 0
      }
      adaptationFrame.current += 1
    } else {
      if (material.current) material.current.opacity = 1
      adaptationFrame.current = 0
      accumulatedAdaptationDelta.current = 0
      adaptationOpacityElapsed.current = 0
    }

    for (let i = 0; i < count; i++) {
      const offset = i * 3
      position.set(seed.positions[offset], seed.positions[offset + 1], seed.positions[offset + 2])
      if (advancePositions) {
        const velocity = mode === 'test' && seed.signal[i] === 1 ? oppositeVelocity : adaptationVelocity
        const vx = velocity[0], vy = velocity[1], vz = velocity[2]
        position.x += vx * motionDelta; position.y += vy * motionDelta; position.z += vz * motionDelta
        wrapPosition(position, config, respawnRandom)
        seed.positions[offset] = position.x; seed.positions[offset + 1] = position.y; seed.positions[offset + 2] = position.z
      }
      const distance = CAMERA_Z - position.z
      const depthProgress = 1 - (distance - config.particleNearDistance) / (config.particleFarDistance - config.particleNearDistance)
      const depthScale = THREE.MathUtils.lerp(.45, 1.25, THREE.MathUtils.clamp(depthProgress, 0, 1))
      matrix.makeScale(depthScale, depthScale, depthScale).setPosition(position)
      mesh.current.setMatrixAt(i, matrix)
    }
    mesh.current.instanceMatrix.needsUpdate = true
  })
  const gray = THREE.MathUtils.clamp(config.luminance * config.contrast, .05, 1)
  return <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
    <circleGeometry args={[config.particleSize, 12]} />
    <meshBasicMaterial ref={material} color={new THREE.Color(gray, gray, gray)} transparent depthWrite={false} opacity={1} toneMapped={false} />
  </instancedMesh>
}

function ConcentricGuides() {
  return <group position={[0, 0, -4]}>{[.85, 1.7, 2.55, 3.4].map(radius => <mesh key={radius}>
    <ringGeometry args={[radius - .008, radius + .008, 128]} />
    <meshBasicMaterial color="#c8c8bd" transparent opacity={.19} toneMapped={false} />
  </mesh>)}</group>
}

export function Scene({ stimulus = 'radial', motionMode = 'idle', preview = false, cockpit = false, onTemporalFrame }: { stimulus?: StimulusType; motionMode?: MotionMode; preview?: boolean; cockpit?: boolean; onTemporalFrame?: (timestamp: number, visible: boolean, scheduler: 'webxr-predicted-display-time' | 'desktop-raf-estimate') => void }) {
  const config = useAppStore(s => s.config)
  const quality = useAppStore(s => s.quality)
  const count = preview ? (quality === 'performance' ? 90 : 180) : config.particleCount
  const sceneConfig = useMemo(() => preview ? { ...config, stimulusType: stimulus, particleCount: count } : { ...config, stimulusType: stimulus }, [config, count, preview, stimulus])
  return <div
    className="scene stimulus-canvas"
    data-stimulus-origin="viewport-center"
    data-motion-mode={motionMode}
    data-particle-near-distance={sceneConfig.particleNearDistance}
    data-particle-far-distance={sceneConfig.particleFarDistance}
    data-adaptation-temporal-sampling={sceneConfig.adaptationTemporalSamplingEnabled}
    data-temporal-sampling-active={usesAdaptationTemporalSampling(motionMode, sceneConfig.adaptationTemporalSamplingEnabled)}
    data-adaptation-frame-stride={sceneConfig.adaptationFrameStride}
    data-adaptation-visible-frames-per-cycle={sceneConfig.adaptationVisibleFramesPerCycle}
    data-temporal-frame-pattern="blank-visible-blank"
    data-adaptation-opacity-envelope={sceneConfig.adaptationOpacityEnvelope}
    data-adaptation-opacity-frequency-hz={sceneConfig.adaptationOpacityFrequencyHz}
    data-adaptation-minimum-opacity={sceneConfig.adaptationMinimumOpacity}
    aria-hidden="true"
  >
    <Canvas camera={{ position: [0, 0, CAMERA_Z], fov: 50 }} dpr={quality === 'performance' ? 1 : [1, 1.5]} gl={{ antialias: true, alpha: false }}>
      <color attach="background" args={['#080b0a']} />
      {motionMode === 'blank' ? null : <CoherenceStimulus config={sceneConfig} count={count} mode={motionMode} onTemporalFrame={onTemporalFrame} />}
      {motionMode !== 'blank' && stimulus === 'radial' && sceneConfig.concentricGuidesEnabled ? <ConcentricGuides /> : null}
      {cockpit && sceneConfig.cockpitEnabled ? <CockpitReferenceFrame /> : null}
    </Canvas>
  </div>
}
