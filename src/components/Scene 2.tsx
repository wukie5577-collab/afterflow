import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, Noise } from '@react-three/postprocessing'
import { Float, Sparkles } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { seededRandom } from '../lib/trial'
import { useAppStore } from '../store'
import type { StimulusType } from '../types'

function Ring({ radius, depth, active = false, tilt = 0 }: { radius: number; depth: number; active?: boolean; tilt?: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const reduced = useAppStore(s => s.reducedEffects)
  useFrame((_, delta) => { if (ref.current && !reduced) ref.current.rotation.z += delta * (active ? .08 : .025) })
  return <mesh ref={ref} position={[0, 0, depth]} rotation={[tilt, .12, 0]}>
    <torusGeometry args={[radius, active ? .035 : .018, 8, 128]} />
    <meshStandardMaterial color={active ? '#e6b15a' : '#a9aaa0'} emissive={active ? '#e89b30' : '#2a332e'} emissiveIntensity={active ? 2.2 : .45} roughness={.4}/>
  </mesh>
}

function CoreArchitecture({ active = true }: { active?: boolean }) {
  const arcs = useMemo(() => Array.from({length: 18}, (_, i) => ({
    angle: i / 18 * Math.PI * 2, radius: 3.35 + (i % 3) * .11, length: .52 + (i % 4) * .16,
  })), [])
  return <group position={[1.4, -.05, -3]}>
    <Ring radius={2.45} depth={0} active={active}/><Ring radius={2.72} depth={-.15}/><Ring radius={1.75} depth={.2}/>
    {arcs.map((a, i) => <mesh key={i} position={[Math.cos(a.angle)*a.radius, Math.sin(a.angle)*a.radius, -.15]} rotation={[0,0,a.angle]}>
      <boxGeometry args={[a.length,.22,.28]}/><meshStandardMaterial color="#c9c5b5" roughness={.78}/>
    </mesh>)}
    <pointLight color="#f3a847" intensity={active ? 28 : 8} distance={9}/>
  </group>
}

function Stimulus({ type, moving, direction, count, speed }: { type: StimulusType; moving: boolean; direction: string; count: number; speed: number }) {
  const points = useRef<THREE.Points>(null)
  const base = useMemo(() => {
    const random = seededRandom(1024); const data = new Float32Array(count * 3)
    for (let i=0;i<count;i++) { const z = -1-random()*15; const radius = .7 + random()*5; const angle=random()*Math.PI*2; data[i*3]=Math.cos(angle)*radius; data[i*3+1]=Math.sin(angle)*radius; data[i*3+2]=z }
    return data
  }, [count])
  useFrame((_, dt) => {
    if (!points.current || !moving) return
    const attr = points.current.geometry.getAttribute('position') as THREE.BufferAttribute
    const sign = ['forward','right','up'].includes(direction) ? 1 : -1
    for(let i=0;i<attr.count;i++) {
      if(type==='radial') { let z=attr.getZ(i)+dt*speed*3*sign; if(z>1)z=-16;if(z<-16)z=1;attr.setZ(i,z) }
      else if(type==='horizontal') { let x=attr.getX(i)+dt*speed*2*sign; if(x>6)x=-6;if(x<-6)x=6;attr.setX(i,x) }
      else { let y=attr.getY(i)+dt*speed*2*sign; if(y>4)y=-4;if(y<-4)y=4;attr.setY(i,y) }
    }
    attr.needsUpdate=true
  })
  return <points ref={points}><bufferGeometry><bufferAttribute attach="attributes-position" args={[base,3]}/></bufferGeometry><pointsMaterial color="#d4d0c2" size={.055} sizeAttenuation transparent opacity={.9}/></points>
}

export function Scene({ stimulus, moving = false, direction='forward', scientific = false }: { stimulus?: StimulusType; moving?: boolean; direction?: string; scientific?: boolean }) {
  const quality = useAppStore(s=>s.quality); const reduced=useAppStore(s=>s.reducedEffects)
  const count = quality==='performance'?160:quality==='showcase'?700:360
  return <div className="scene" aria-hidden="true"><Canvas dpr={quality==='performance' ? [1,1.2] : [1,1.65]} camera={{position:[0,0,8],fov:53}} gl={{antialias:true, alpha:false}}>
    <color attach="background" args={['#060a08']}/><fog attach="fog" args={['#060a08',8,23]}/>
    <ambientLight intensity={.6}/><directionalLight position={[-4,5,7]} intensity={3} color="#f1ead5"/>
    {stimulus ? <><Stimulus type={stimulus} moving={moving} direction={direction} count={count} speed={1.2}/><Ring radius={1.2} depth={-4} active={moving}/><Ring radius={2.3} depth={-7}/><Ring radius={3.4} depth={-11}/></> : <CoreArchitecture/>}
    {!scientific && !reduced && <><Float speed={.7} rotationIntensity={.12} floatIntensity={.35}><Sparkles count={quality==='performance'?30:90} scale={14} size={1.3} speed={.15} color="#ddaa55"/></Float></>}
    {quality!=='performance' && !scientific && <EffectComposer><Bloom intensity={.55} luminanceThreshold={.65} mipmapBlur/><Noise opacity={.018}/></EffectComposer>}
  </Canvas></div>
}
