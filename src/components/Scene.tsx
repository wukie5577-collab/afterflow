import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { deterministicGroupMask, oppositeDirection, seededRandom } from '../lib/trial'
import { useAppStore } from '../store'
import type { MotionDirection, StimulusType, TrialConfig } from '../types'

type MotionMode = 'idle' | 'adaptation' | 'test'

interface ParticleSeed {
  positions: Float32Array
  signal: Uint8Array
}

function makeParticleSeed(config: TrialConfig, count: number): ParticleSeed {
  const random = seededRandom(config.randomSeed)
  const positions = new Float32Array(count * 3)
  const signal = deterministicGroupMask(count, config.coherence, config.randomSeed ^ 0x9e3779b9)
  for (let i = 0; i < count; i++) {
    const theta = random() * Math.PI * 2
    const minRadius = config.presentation === 'peripheral' ? config.peripheralInnerRadius * 5 : 0.05
    const radius = minRadius + Math.sqrt(random()) * (config.apertureRadius * 4.7 - minRadius)
    positions[i * 3] = Math.cos(theta) * radius
    positions[i * 3 + 1] = Math.sin(theta) * radius
    positions[i * 3 + 2] = -1 - random() * 14
  }
  return { positions, signal }
}

function coherentVelocity(type: StimulusType, direction: MotionDirection, speed: number) {
  const sign = ['forward', 'right', 'up'].includes(direction) ? 1 : -1
  if (type === 'radial') return [0, 0, sign * speed * 2.5] as const
  if (type === 'horizontal') return [sign * speed * 1.7, 0, 0] as const
  return [0, sign * speed * 1.7, 0] as const
}

function wrapPosition(position: THREE.Vector3) {
  if (position.z > 1) position.z = -15
  if (position.z < -15) position.z = 1
  if (position.x > 5.4) position.x = -5.4
  if (position.x < -5.4) position.x = 5.4
  if (position.y > 4.2) position.y = -4.2
  if (position.y < -4.2) position.y = 4.2
}

function CoherenceStimulus({ config, count, mode }: { config: TrialConfig; count: number; mode: MotionMode }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const seed = useMemo(() => makeParticleSeed(config, count), [config, count])
  const position = useMemo(() => new THREE.Vector3(), [])
  const matrix = useMemo(() => new THREE.Matrix4(), [])
  const testDirection = oppositeDirection(config.direction)
  useFrame((_, delta) => {
    if (!mesh.current) return
    const adaptationVelocity = coherentVelocity(config.stimulusType, config.direction, config.speed)
    const oppositeVelocity = coherentVelocity(config.stimulusType, testDirection, config.speed)
    const dt = Math.min(delta, 0.05)
    for (let i = 0; i < count; i++) {
      const offset = i * 3
      position.set(seed.positions[offset], seed.positions[offset + 1], seed.positions[offset + 2])
      if (mode !== 'idle') {
        const velocity = mode === 'test' && seed.signal[i] === 1 ? oppositeVelocity : adaptationVelocity
        const vx = velocity[0], vy = velocity[1], vz = velocity[2]
        position.x += vx * dt; position.y += vy * dt; position.z += vz * dt
        wrapPosition(position)
        seed.positions[offset] = position.x; seed.positions[offset + 1] = position.y; seed.positions[offset + 2] = position.z
      }
      const depthScale = THREE.MathUtils.clamp((16 + position.z) / 15, .45, 1.25)
      matrix.makeScale(depthScale, depthScale, depthScale).setPosition(position)
      mesh.current.setMatrixAt(i, matrix)
    }
    mesh.current.instanceMatrix.needsUpdate = true
  })
  const gray = THREE.MathUtils.clamp(config.luminance * config.contrast, .05, 1)
  return <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
    <circleGeometry args={[config.particleSize, 12]} />
    <meshBasicMaterial color={new THREE.Color(gray, gray, gray)} toneMapped={false} />
  </instancedMesh>
}

function ConcentricGuides() {
  return <group position={[0, 0, -4]}>{[.85, 1.7, 2.55, 3.4].map(radius => <mesh key={radius}>
    <ringGeometry args={[radius - .008, radius + .008, 128]} />
    <meshBasicMaterial color="#c8c8bd" transparent opacity={.19} toneMapped={false} />
  </mesh>)}</group>
}

export function Scene({ stimulus = 'radial', motionMode = 'idle', preview = false }: { stimulus?: StimulusType; motionMode?: MotionMode; preview?: boolean }) {
  const config = useAppStore(s => s.config)
  const quality = useAppStore(s => s.quality)
  const count = preview ? (quality === 'performance' ? 90 : 180) : config.particleCount
  const sceneConfig = useMemo(() => preview ? { ...config, stimulusType: stimulus, particleCount: count } : { ...config, stimulusType: stimulus }, [config, count, preview, stimulus])
  return <div className="scene stimulus-canvas" data-stimulus-origin="viewport-center" aria-hidden="true">
    <Canvas camera={{ position: [0, 0, 8], fov: 50 }} dpr={quality === 'performance' ? 1 : [1, 1.5]} gl={{ antialias: true, alpha: false }}>
      <color attach="background" args={['#080b0a']} />
      <CoherenceStimulus config={sceneConfig} count={count} mode={motionMode} />
      {stimulus === 'radial' ? <ConcentricGuides /> : null}
    </Canvas>
  </div>
}
