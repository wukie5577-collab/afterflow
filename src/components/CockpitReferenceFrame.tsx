import { useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'

// This is a genuine scene-space reference plane inside the dot volume. Dots
// with a larger z value are between the cockpit and observer and therefore
// render in front of it; dots with a smaller z value are correctly occluded.
const COCKPIT_REFERENCE_Z = 0

interface SegmentProps {
  color: string
  depth: number
  from: THREE.Vector2
  thickness: number
  to: THREE.Vector2
  z: number
}

function Segment({
  color,
  depth,
  from,
  thickness,
  to,
  z,
}: SegmentProps) {
  const dx = to.x - from.x
  const dy = to.y - from.y

  return (
    <mesh
      position={[(from.x + to.x) / 2, (from.y + to.y) / 2, z]}
      rotation={[0, 0, Math.atan2(dy, dx)]}
      frustumCulled={false}
    >
      <boxGeometry args={[Math.hypot(dx, dy), thickness, depth]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  )
}

interface PlateProps {
  color: string
  depth: number
  height: number
  rotation?: number
  width: number
  x: number
  y: number
  z: number
}

function Plate({ color, depth, height, rotation = 0, width, x, y, z }: PlateProps) {
  return (
    <mesh position={[x, y, z]} rotation={[0, 0, rotation]} frustumCulled={false}>
      <boxGeometry args={[width, height, depth]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  )
}

function PolygonPlate({ color, depth, points, z }: { color: string; depth: number; points: THREE.Vector2[]; z: number }) {
  const shape = useMemo(() => {
    const normalized = points.map((point) => point.clone())
    if (!THREE.ShapeUtils.isClockWise(normalized)) normalized.reverse()
    return new THREE.Shape(normalized)
  }, [points])
  return (
    <mesh position={[0, 0, z]} frustumCulled={false}>
      <extrudeGeometry args={[shape, { depth, bevelEnabled: true, bevelSegments: 1, bevelSize: depth * 0.08, bevelThickness: depth * 0.08, steps: 1 }]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  )
}

function createCockpitShell(width: number, height: number, aperture: THREE.Vector2[]) {
  const outer = [
    new THREE.Vector2(-width / 2, -height / 2),
    new THREE.Vector2(-width / 2, height / 2),
    new THREE.Vector2(width / 2, height / 2),
    new THREE.Vector2(width / 2, -height / 2),
  ]

  if (!THREE.ShapeUtils.isClockWise(outer)) outer.reverse()
  const hole = [...aperture]
  if (THREE.ShapeUtils.isClockWise(hole)) hole.reverse()

  const shape = new THREE.Shape(outer)
  shape.holes.push(new THREE.Path(hole))
  return shape
}

/**
 * A stationary panoramic cockpit used as an explicit depth-reference factor.
 * It never changes camera framing or stimulus scale. Its physical thickness
 * and depth testing create the intended dots-moving-through-the-window cue.
 */
export function CockpitReferenceFrame() {
  const camera = useThree((state) => state.camera as THREE.PerspectiveCamera)
  const viewportSize = useThree((state) => state.size)
  const dimensions = useMemo(() => {
    const distance = Math.abs(camera.position.z - COCKPIT_REFERENCE_Z)
    const height = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * distance
    return { height, width: height * (viewportSize.width / viewportSize.height) }
  }, [camera.fov, camera.position.z, viewportSize.height, viewportSize.width])

  const { height, width } = dimensions
  const halfWidth = width / 2
  const halfHeight = height / 2
  const aperture = useMemo(
    () => [
      new THREE.Vector2(-halfWidth * 0.73, -halfHeight * 0.89),
      new THREE.Vector2(halfWidth * 0.73, -halfHeight * 0.89),
      new THREE.Vector2(halfWidth * 0.88, -halfHeight * 0.75),
      new THREE.Vector2(halfWidth * 0.94, -halfHeight * 0.39),
      new THREE.Vector2(halfWidth * 0.95, halfHeight * 0.36),
      new THREE.Vector2(halfWidth * 0.88, halfHeight * 0.73),
      new THREE.Vector2(halfWidth * 0.69, halfHeight * 0.90),
      new THREE.Vector2(-halfWidth * 0.69, halfHeight * 0.90),
      new THREE.Vector2(-halfWidth * 0.88, halfHeight * 0.73),
      new THREE.Vector2(-halfWidth * 0.95, halfHeight * 0.36),
      new THREE.Vector2(-halfWidth * 0.94, -halfHeight * 0.39),
      new THREE.Vector2(-halfWidth * 0.88, -halfHeight * 0.75),
    ],
    [halfHeight, halfWidth],
  )
  const shell = useMemo(() => createCockpitShell(width, height, aperture), [aperture, height, width])

  const baseThickness = height * 0.026
  const insetThickness = height * 0.010
  const lightThickness = height * 0.0042
  const shellDepth = height * 0.055
  const insetPoints = useMemo(
    () => aperture.map((point) => point.clone().multiplyScalar(0.986)),
    [aperture],
  )
  const sideArmor = useMemo(() => {
    const left = [
      new THREE.Vector2(-halfWidth * 0.995, halfHeight * 0.67),
      new THREE.Vector2(-halfWidth * 0.90, halfHeight * 0.62),
      new THREE.Vector2(-halfWidth * 0.955, halfHeight * 0.28),
      new THREE.Vector2(-halfWidth * 0.965, -halfHeight * 0.34),
      new THREE.Vector2(-halfWidth * 0.91, -halfHeight * 0.62),
      new THREE.Vector2(-halfWidth * 0.995, -halfHeight * 0.72),
    ]
    const right = left.map((point) => new THREE.Vector2(-point.x, point.y)).reverse()
    return { left, right }
  }, [halfHeight, halfWidth])
  const cornerArmor = useMemo(() => {
    const left = [
      new THREE.Vector2(-halfWidth, halfHeight),
      new THREE.Vector2(-halfWidth * 0.78, halfHeight),
      new THREE.Vector2(-halfWidth * 0.80, halfHeight * 0.91),
      new THREE.Vector2(-halfWidth * 0.90, halfHeight * 0.74),
      new THREE.Vector2(-halfWidth, halfHeight * 0.82),
    ]
    const right = left.map((point) => new THREE.Vector2(-point.x, point.y)).reverse()
    return { left, right }
  }, [halfHeight, halfWidth])

  return (
    <group name="cockpit-depth-reference" renderOrder={10}>
      {/* The outer shell is extruded towards the observer, so its silhouette has
          real side faces instead of reading as a flat overlay. */}
      <mesh position={[0, 0, COCKPIT_REFERENCE_Z - shellDepth * 0.58]} frustumCulled={false}>
        <extrudeGeometry
          args={[
            shell,
            {
              depth: shellDepth,
              bevelEnabled: true,
              bevelSegments: 2,
              bevelSize: height * 0.005,
              bevelThickness: height * 0.004,
              curveSegments: 1,
              steps: 1,
            },
          ]}
        />
        <meshBasicMaterial color="#171a18" toneMapped={false} />
      </mesh>

      {/* Shadow bed, structural rail, ceramic edge and fine amber index line form
          four readable depth layers without intruding into the central field. */}
      {aperture.map((point, index) => (
        <Segment
          key={`recess-${index}`}
          color="#070908"
          depth={shellDepth * 0.58}
          from={point}
          thickness={baseThickness * 1.55}
          to={aperture[(index + 1) % aperture.length]}
          z={COCKPIT_REFERENCE_Z + shellDepth * 0.08}
        />
      ))}
      {aperture.map((point, index) => (
        <Segment
          key={`graphite-${index}`}
          color={index < 6 ? '#292c2a' : '#242725'}
          depth={shellDepth * 0.66}
          from={point}
          thickness={baseThickness}
          to={aperture[(index + 1) % aperture.length]}
          z={COCKPIT_REFERENCE_Z + shellDepth * 0.18}
        />
      ))}
      {insetPoints.map((point, index) => (
        <Segment
          key={`ceramic-${index}`}
          color={index === 2 || index === 3 || index === 8 || index === 9 ? '#9f9388' : '#4e4b47'}
          depth={shellDepth * 0.28}
          from={point}
          thickness={insetThickness}
          to={insetPoints[(index + 1) % insetPoints.length]}
          z={COCKPIT_REFERENCE_Z + shellDepth * 0.58}
        />
      ))}

      {[0, 2, 4, 6, 8, 10].map((index) => {
        const from = insetPoints[index].clone().lerp(insetPoints[index + 1], 0.22)
        const to = insetPoints[index].clone().lerp(insetPoints[index + 1], 0.56)
        return (
          <Segment
            key={`amber-index-${index}`}
            color="#e2a347"
            depth={shellDepth * 0.18}
            from={from}
            thickness={lightThickness}
            to={to}
            z={COCKPIT_REFERENCE_Z + shellDepth * 0.81}
          />
        )
      })}

      <PolygonPlate color="#9f958b" depth={shellDepth * 0.42} points={sideArmor.left} z={COCKPIT_REFERENCE_Z + shellDepth * 0.33} />
      <PolygonPlate color="#9f958b" depth={shellDepth * 0.42} points={sideArmor.right} z={COCKPIT_REFERENCE_Z + shellDepth * 0.33} />
      <PolygonPlate color="#827c75" depth={shellDepth * 0.34} points={cornerArmor.left} z={COCKPIT_REFERENCE_Z + shellDepth * 0.26} />
      <PolygonPlate color="#827c75" depth={shellDepth * 0.34} points={cornerArmor.right} z={COCKPIT_REFERENCE_Z + shellDepth * 0.26} />

      {/* Panel seams give the bright side armor a believable scale without
          becoming a distracting HUD. */}
      {[-1, 1].map((side) => (
        <group key={`side-details-${side}`}>
          <Plate color="#3a3936" depth={shellDepth * 0.12} height={height * 0.004} rotation={side * 0.08} width={width * 0.055} x={side * halfWidth * 0.96} y={halfHeight * 0.44} z={COCKPIT_REFERENCE_Z + shellDepth * 0.78} />
          <Plate color="#3a3936" depth={shellDepth * 0.12} height={height * 0.004} rotation={-side * 0.07} width={width * 0.05} x={side * halfWidth * 0.965} y={-halfHeight * 0.50} z={COCKPIT_REFERENCE_Z + shellDepth * 0.78} />
          <Plate color="#171a18" depth={shellDepth * 0.30} height={height * 0.105} rotation={side * 0.08} width={width * 0.011} x={side * halfWidth * 0.936} y={halfHeight * 0.02} z={COCKPIT_REFERENCE_Z + shellDepth * 0.64} />
        </group>
      ))}

      {/* Layered brow: a dark anti-glare surface with a restrained calibration
          datum. It is shallow enough to leave the stimulus visually dominant. */}
      <Plate color="#181b19" depth={shellDepth * 1.1} height={height * 0.045} width={width * 0.42} x={0} y={halfHeight * 0.955} z={COCKPIT_REFERENCE_Z + shellDepth * 0.12} />
      <Plate color="#3b3e3b" depth={shellDepth * 0.44} height={height * 0.013} width={width * 0.25} x={0} y={halfHeight * 0.925} z={COCKPIT_REFERENCE_Z + shellDepth * 0.58} />
      <Plate color="#e2a347" depth={shellDepth * 0.16} height={lightThickness} width={width * 0.12} x={0} y={halfHeight * 0.918} z={COCKPIT_REFERENCE_Z + shellDepth * 0.83} />

      {/* Low glare shield and side service pods establish scale while keeping the
          fixation and radial-flow field unobstructed. */}
      <Plate color="#171a18" depth={shellDepth * 1.35} height={height * 0.05} width={width * 0.35} x={0} y={-halfHeight * 0.965} z={COCKPIT_REFERENCE_Z + shellDepth * 0.18} />
      <Plate color="#343735" depth={shellDepth * 0.5} height={height * 0.017} width={width * 0.18} x={0} y={-halfHeight * 0.925} z={COCKPIT_REFERENCE_Z + shellDepth * 0.68} />
      <Plate color="#e2a347" depth={shellDepth * 0.18} height={lightThickness} width={width * 0.085} x={0} y={-halfHeight * 0.914} z={COCKPIT_REFERENCE_Z + shellDepth * 0.91} />

      <Plate color="#69d8d4" depth={shellDepth * 0.16} height={height * 0.072} rotation={-0.075} width={lightThickness} x={-halfWidth * 0.958} y={-halfHeight * 0.30} z={COCKPIT_REFERENCE_Z + shellDepth * 0.78} />
      <Plate color="#69d8d4" depth={shellDepth * 0.16} height={height * 0.072} rotation={0.075} width={lightThickness} x={halfWidth * 0.958} y={-halfHeight * 0.30} z={COCKPIT_REFERENCE_Z + shellDepth * 0.78} />
    </group>
  )
}
