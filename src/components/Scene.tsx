import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { CockpitReferenceFrame } from './CockpitReferenceFrame'
import { ComfortAnaglyphEffect } from '../lib/ComfortAnaglyphEffect'
import { changingDisparityOffsets, coherentVelocity, lifetimeRespawnCoordinates, oneWayCoherentDepth, repeatingOneWayProgress, wrapDepthZ } from '../lib/motion'
import { deterministicGroupMask, isTemporalSampleFrame, oppositeDirection, raisedSineOpacity, sampleParticleCoordinates, seededRandom, temporalDutyCycleOpacity, usesAdaptationTemporalSampling } from '../lib/trial'
import { useAppStore } from '../store'
import type { StimulusType, TrialConfig } from '../types'

type MotionMode = 'idle' | 'adaptation' | 'blank' | 'test'

const CAMERA_Z = 8
const CD_ONLY_DISPARITY_GAIN = 5
const CD_ONLY_ENDPOINT_HOLD_SECONDS = .5

function AnaglyphRenderer({ eyeSeparation, focus, swapEyes }: { eyeSeparation: number; focus: number; swapEyes: boolean }) {
  const { camera, gl, scene, size } = useThree()
  const effect = useMemo(() => new ComfortAnaglyphEffect(gl), [gl])

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) camera.focus = focus
    effect.setEyeSeparation(eyeSeparation)
    effect.setSwapEyes(swapEyes)
    effect.setSize(size.width, size.height)
  }, [camera, effect, eyeSeparation, focus, size.height, size.width, swapEyes])

  useEffect(() => () => effect.dispose(), [effect])

  useFrame(() => {
    if (camera instanceof THREE.PerspectiveCamera) effect.render(scene, camera)
  }, 1)

  return null
}

interface ParticleSeed {
  positions: Float32Array
  signal: Uint8Array
  ages: Float32Array
  lifetimes: Float32Array
}

function sampleLifetimeSeconds(config: TrialConfig, random: () => number) {
  const min = config.adaptationDotLifetimeMinMs / 1000
  const max = config.adaptationDotLifetimeMaxMs / 1000
  return min + random() * Math.max(0, max - min)
}

function makeParticleSeed(config: TrialConfig, count: number): ParticleSeed {
  const random = seededRandom(config.randomSeed)
  const positions = new Float32Array(count * 3)
  const ages = new Float32Array(count)
  const lifetimes = new Float32Array(count)
  const signal = deterministicGroupMask(count, config.oppositeDirectionShare, config.randomSeed ^ 0x9e3779b9)
  for (let i = 0; i < count; i++) {
    const sample = sampleParticleCoordinates(config, random)
    positions[i * 3] = sample.x
    positions[i * 3 + 1] = sample.y
    positions[i * 3 + 2] = CAMERA_Z - sample.distance
    lifetimes[i] = sampleLifetimeSeconds(config, random)
    ages[i] = random() * lifetimes[i]
  }
  return { positions, signal, ages, lifetimes }
}

function wrapPosition(position: THREE.Vector3, config: TrialConfig, random: () => number) {
  const nearZ = CAMERA_Z - config.particleNearDistance
  const farZ = CAMERA_Z - config.particleFarDistance
  if (position.z > nearZ || position.z < farZ) {
    position.z = wrapDepthZ(position.z, CAMERA_Z, config.particleNearDistance, config.particleFarDistance)
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

function respawnAfterLifetime(position: THREE.Vector3, config: TrialConfig, random: () => number) {
  const sample = sampleParticleCoordinates(config, random)
  const next = lifetimeRespawnCoordinates(config.stimulusType, position, sample, CAMERA_Z)
  position.set(next.x, next.y, next.z)
}

function CoherenceStimulus({ config, count, mode, onTemporalFrame }: { config: TrialConfig; count: number; mode: MotionMode; onTemporalFrame?: (timestamp: number, visible: boolean, scheduler: 'webxr-predicted-display-time' | 'desktop-raf-estimate') => void }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const material = useRef<THREE.MeshStandardMaterial>(null)
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
        seed.ages[i] += motionDelta
        if (mode === 'adaptation' && seed.ages[i] >= seed.lifetimes[i]) {
          respawnAfterLifetime(position, config, respawnRandom)
          seed.ages[i] = 0
          seed.lifetimes[i] = sampleLifetimeSeconds(config, respawnRandom)
        } else {
          const velocity = mode === 'test' && seed.signal[i] === 1 ? oppositeVelocity : adaptationVelocity
          const vx = velocity[0], vy = velocity[1], vz = velocity[2]
          position.x += vx * motionDelta; position.y += vy * motionDelta; position.z += vz * motionDelta
          wrapPosition(position, config, respawnRandom)
        }
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
    <sphereGeometry args={[config.particleSize, 12, 8]} />
    <meshStandardMaterial ref={material} color={new THREE.Color(gray, gray, gray)} roughness={.62} metalness={0} transparent depthWrite opacity={1} toneMapped={false} />
  </instancedMesh>
}

function ChangingDisparityStimulus({ config, count, mode, eyeSeparation, focus, swapEyes }: { config: TrialConfig; count: number; mode: MotionMode; eyeSeparation: number; focus: number; swapEyes: boolean }) {
  const redMesh = useRef<THREE.InstancedMesh>(null)
  const cyanMesh = useRef<THREE.InstancedMesh>(null)
  const seed = useMemo(() => makeParticleSeed(config, count), [config, count])
  const depthElapsed = useRef(0)
  const redMatrix = useMemo(() => new THREE.Matrix4(), [])
  const cyanMatrix = useMemo(() => new THREE.Matrix4(), [])
  const fixedPlaneZ = CAMERA_Z - focus

  useEffect(() => {
    depthElapsed.current = 0
  }, [focus, mode])

  useFrame((_, delta) => {
    if (!redMesh.current || !cyanMesh.current) return
    const frameDelta = Math.min(delta, 0.05)
    if (mode !== 'idle') depthElapsed.current += frameDelta
    const depthAmplitude = Math.max(0, Math.min(6, focus - config.particleNearDistance, config.particleFarDistance - focus))
    const travelDuration = depthAmplitude > 0 ? depthAmplitude * 2 / Math.max(0.01, config.speed * 2.5) : 1
    const progress = mode === 'idle'
      ? 0
      : repeatingOneWayProgress(depthElapsed.current, travelDuration, CD_ONLY_ENDPOINT_HOLD_SECONDS)
    const adaptationDepth = oneWayCoherentDepth(focus, depthAmplitude, progress, config.direction)
    const oppositeDepth = oneWayCoherentDepth(focus, depthAmplitude, progress, oppositeDirection(config.direction))

    for (let i = 0; i < count; i++) {
      const offset = i * 3
      const baseX = seed.positions[offset]
      const baseY = seed.positions[offset + 1]
      const virtualDistance = mode === 'test' && seed.signal[i] === 1
        ? oppositeDepth
        : adaptationDepth
      const offsets = changingDisparityOffsets(virtualDistance, focus, eyeSeparation, swapEyes)
      redMatrix.makeTranslation(baseX + offsets.red, baseY, fixedPlaneZ)
      cyanMatrix.makeTranslation(baseX + offsets.cyan, baseY, fixedPlaneZ)
      redMesh.current.setMatrixAt(i, redMatrix)
      cyanMesh.current.setMatrixAt(i, cyanMatrix)
    }
    redMesh.current.instanceMatrix.needsUpdate = true
    cyanMesh.current.instanceMatrix.needsUpdate = true
  })

  const dotSize = config.particleSize
  return <>
    <instancedMesh ref={redMesh} args={[undefined, undefined, count]} frustumCulled={false} renderOrder={1}>
      <circleGeometry args={[dotSize, 12]} />
      <meshBasicMaterial color="#ff0000" transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </instancedMesh>
    <instancedMesh ref={cyanMesh} args={[undefined, undefined, count]} frustumCulled={false} renderOrder={2}>
      <circleGeometry args={[dotSize, 12]} />
      <meshBasicMaterial color="#00ffff" transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </instancedMesh>
  </>
}

function ConcentricGuides() {
  return <group position={[0, 0, -4]}>{[.85, 1.7, 2.55, 3.4].map(radius => <mesh key={radius}>
    <ringGeometry args={[radius - .008, radius + .008, 128]} />
    <meshBasicMaterial color="#c8c8bd" transparent opacity={.19} toneMapped={false} />
  </mesh>)}</group>
}

function ZeroDisparityReference({ z }: { z: number }) {
  const ticks = [
    { position: [0, .62, 0] as const, rotation: 0 },
    { position: [0, -.62, 0] as const, rotation: 0 },
    { position: [.62, 0, 0] as const, rotation: Math.PI / 2 },
    { position: [-.62, 0, 0] as const, rotation: Math.PI / 2 },
  ]
  return <group position={[0, 0, z]} renderOrder={20}>
    <mesh>
      <ringGeometry args={[.43, .445, 128]} />
      <meshBasicMaterial color="#dce3df" transparent opacity={.9} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
    {ticks.map(({ position, rotation }, index) => <mesh key={index} position={position} rotation={[0, 0, rotation]}>
      <planeGeometry args={[.15, .018]} />
      <meshBasicMaterial color="#dce3df" transparent opacity={.9} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>)}
  </group>
}

export function Scene({ stimulus = 'radial', motionMode = 'idle', preview = false, onTemporalFrame }: { stimulus?: StimulusType; motionMode?: MotionMode; preview?: boolean; onTemporalFrame?: (timestamp: number, visible: boolean, scheduler: 'webxr-predicted-display-time' | 'desktop-raf-estimate') => void }) {
  const config = useAppStore(s => s.config)
  const quality = useAppStore(s => s.quality)
  const displayMode = useAppStore(s => s.displayMode)
  const stereoDepth = useAppStore(s => s.stereoDepth)
  const stereoFocus = useAppStore(s => s.stereoFocus)
  const stereoSwapEyes = useAppStore(s => s.stereoSwapEyes)
  const cdOnlyActive = displayMode === 'cd-only' && stimulus === 'radial'
  const count = preview ? (quality === 'performance' ? 90 : 180) : config.particleCount
  const sceneConfig = useMemo(() => preview ? { ...config, stimulusType: stimulus, particleCount: count } : { ...config, stimulusType: stimulus }, [config, count, preview, stimulus])
  const guidesVisible = motionMode !== 'blank' && stimulus === 'radial' && sceneConfig.concentricGuidesEnabled
  const cockpitVisible = sceneConfig.cockpitEnabled
  return <div
    className="scene stimulus-canvas"
    data-stimulus-origin="viewport-center"
    data-motion-mode={motionMode}
    data-radial-motion-axis="z-only"
    data-display-mode={displayMode}
    data-cd-only-active={cdOnlyActive}
    data-cd-only-cue={cdOnlyActive ? 'changing-horizontal-disparity' : undefined}
    data-cd-only-monocular-position={cdOnlyActive ? 'fixed-correlated' : undefined}
    data-cd-only-dot-size={cdOnlyActive ? 'constant' : undefined}
    data-cd-only-depth-field={cdOnlyActive ? 'shared-coherent-z' : undefined}
    data-cd-only-temporal-sampling={cdOnlyActive ? 'disabled' : undefined}
    data-cd-only-disparity-gain={cdOnlyActive ? CD_ONLY_DISPARITY_GAIN : undefined}
    data-cd-only-depth-trajectory={cdOnlyActive ? 'repeating-reset-one-way' : undefined}
    data-cd-only-zero-disparity-reference={cdOnlyActive ? 'fixed-ring-at-convergence-plane' : undefined}
    data-concentric-guides-visible={guidesVisible}
    data-cockpit-visible={cockpitVisible}
    data-particle-near-distance={sceneConfig.particleNearDistance}
    data-particle-far-distance={sceneConfig.particleFarDistance}
    data-adaptation-temporal-sampling={sceneConfig.adaptationTemporalSamplingEnabled}
    data-temporal-sampling-active={!cdOnlyActive && usesAdaptationTemporalSampling(motionMode, sceneConfig.adaptationTemporalSamplingEnabled)}
    data-adaptation-frame-stride={sceneConfig.adaptationFrameStride}
    data-adaptation-visible-frames-per-cycle={sceneConfig.adaptationVisibleFramesPerCycle}
    data-temporal-frame-pattern="blank-visible-blank"
    data-adaptation-opacity-envelope={sceneConfig.adaptationOpacityEnvelope}
    data-adaptation-opacity-frequency-hz={sceneConfig.adaptationOpacityFrequencyHz}
    data-adaptation-minimum-opacity={sceneConfig.adaptationMinimumOpacity}
    data-adaptation-dot-lifetime-min-ms={sceneConfig.adaptationDotLifetimeMinMs}
    data-adaptation-dot-lifetime-max-ms={sceneConfig.adaptationDotLifetimeMaxMs}
    aria-hidden="true"
  >
    <Canvas camera={{ position: [0, 0, CAMERA_Z], fov: 50 }} dpr={quality === 'performance' ? 1 : [1, 1.5]} gl={{ antialias: true, alpha: false }}>
      <color attach="background" args={['#080b0a']} />
      <ambientLight intensity={1.35} />
      <directionalLight position={[-4, 6, 10]} intensity={2.4} />
      <directionalLight position={[5, -2, 5]} intensity={.65} />
      {motionMode === 'blank' ? null : cdOnlyActive
        ? <ChangingDisparityStimulus config={sceneConfig} count={count} mode={motionMode} eyeSeparation={stereoDepth * CD_ONLY_DISPARITY_GAIN} focus={stereoFocus} swapEyes={stereoSwapEyes} />
        : <CoherenceStimulus config={sceneConfig} count={count} mode={motionMode} onTemporalFrame={onTemporalFrame} />}
      {guidesVisible ? <ConcentricGuides /> : null}
      {cdOnlyActive && motionMode !== 'blank' ? <ZeroDisparityReference z={CAMERA_Z - stereoFocus} /> : null}
      {cockpitVisible ? <CockpitReferenceFrame /> : null}
      {displayMode === 'anaglyph' ? <AnaglyphRenderer eyeSeparation={stereoDepth} focus={stereoFocus} swapEyes={stereoSwapEyes} /> : null}
    </Canvas>
  </div>
}
