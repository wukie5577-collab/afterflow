import { useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'

// The cockpit sits inside the particle volume. Forward-moving particles can
// therefore cross its reference plane and continue towards the observer.
const COCKPIT_DEPTH = 0

interface PanelProps {
  color: string
  height: number
  rotation?: number
  width: number
  x: number
  y: number
  z?: number
}

function Panel({
  color,
  height,
  rotation = 0,
  width,
  x,
  y,
  z = COCKPIT_DEPTH,
}: PanelProps) {
  return (
    <mesh position={[x, y, z]} rotation={[0, 0, rotation]} frustumCulled={false}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial color={color} depthTest depthWrite toneMapped={false} />
    </mesh>
  )
}

interface RailProps {
  color: string
  from: THREE.Vector2
  thickness: number
  to: THREE.Vector2
  z: number
}

function Rail({ color, from, thickness, to, z }: RailProps) {
  const dx = to.x - from.x
  const dy = to.y - from.y

  return (
    <Panel
      color={color}
      height={thickness}
      rotation={Math.atan2(dy, dx)}
      width={Math.hypot(dx, dy)}
      x={(from.x + to.x) / 2}
      y={(from.y + to.y) / 2}
      z={z}
    />
  )
}

function createCockpitShell(width: number, height: number, aperture: THREE.Vector2[]) {
  const halfWidth = width / 2
  const halfHeight = height / 2
  const outer = [
    new THREE.Vector2(-halfWidth, -halfHeight),
    new THREE.Vector2(-halfWidth, halfHeight),
    new THREE.Vector2(halfWidth, halfHeight),
    new THREE.Vector2(halfWidth, -halfHeight),
  ]

  // Three.js expects opposite winding directions for the shell and its hole.
  if (!THREE.ShapeUtils.isClockWise(outer)) outer.reverse()
  const hole = [...aperture]
  if (THREE.ShapeUtils.isClockWise(hole)) hole.reverse()

  const shape = new THREE.Shape(outer)
  shape.holes.push(new THREE.Path(hole))
  return shape
}

/**
 * A screen-stable, scene-space cockpit reference with a panoramic faceted
 * windscreen. The aperture remains deliberately large: the frame establishes
 * depth without shrinking the radial stimulus into a small rectangular panel.
 */
export function CockpitReferenceFrame() {
  const camera = useThree((state) => state.camera as THREE.PerspectiveCamera)
  const viewportSize = useThree((state) => state.size)
  const dimensions = useMemo(() => {
    const distance = Math.abs(camera.position.z - COCKPIT_DEPTH)
    const height = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * distance
    return { height, width: height * (viewportSize.width / viewportSize.height) }
  }, [camera.fov, camera.position.z, viewportSize.height, viewportSize.width])

  const { height, width } = dimensions
  const halfWidth = width / 2
  const halfHeight = height / 2

  // A wide 12-sided aperture reads as a windscreen while preserving almost the
  // entire stimulus field. The angled pillars live only in the outer periphery.
  const aperture = useMemo(
    () => [
      new THREE.Vector2(-halfWidth * 0.80, -halfHeight * 0.88),
      new THREE.Vector2(halfWidth * 0.80, -halfHeight * 0.88),
      new THREE.Vector2(halfWidth * 0.92, -halfHeight * 0.70),
      new THREE.Vector2(halfWidth * 0.96, -halfHeight * 0.27),
      new THREE.Vector2(halfWidth * 0.96, halfHeight * 0.30),
      new THREE.Vector2(halfWidth * 0.89, halfHeight * 0.75),
      new THREE.Vector2(halfWidth * 0.68, halfHeight * 0.90),
      new THREE.Vector2(-halfWidth * 0.68, halfHeight * 0.90),
      new THREE.Vector2(-halfWidth * 0.89, halfHeight * 0.75),
      new THREE.Vector2(-halfWidth * 0.96, halfHeight * 0.30),
      new THREE.Vector2(-halfWidth * 0.96, -halfHeight * 0.27),
      new THREE.Vector2(-halfWidth * 0.92, -halfHeight * 0.70),
    ],
    [halfHeight, halfWidth],
  )
  const shell = useMemo(() => createCockpitShell(width, height, aperture), [aperture, height, width])
  const railThickness = height * 0.006
  const lowerConsoleY = -halfHeight * 0.945

  return (
    <group name="cockpit-depth-reference" renderOrder={10}>
      <mesh position={[0, 0, COCKPIT_DEPTH]} frustumCulled={false}>
        <shapeGeometry args={[shell]} />
        <meshBasicMaterial color="#292a28" depthTest depthWrite toneMapped={false} />
      </mesh>

      {aperture.map((point, index) => (
        <Rail
          key={`rail-bed-${index}`}
          color="#625b53"
          from={point}
          thickness={railThickness * 3.2}
          to={aperture[(index + 1) % aperture.length]}
          z={COCKPIT_DEPTH + 0.012}
        />
      ))}
      {aperture.map((point, index) => (
        <Rail
          key={`inner-rail-${index}`}
          color={index > 5 && index < 9 ? '#d8c9b9' : '#ad9c8c'}
          from={point}
          thickness={railThickness}
          to={aperture[(index + 1) % aperture.length]}
          z={COCKPIT_DEPTH + 0.018}
        />
      ))}

      {/* Layered brow and glareshield give the opening a designed cockpit silhouette. */}
      <Panel
        color="#2b2d2b"
        height={height * 0.034}
        width={width * 0.38}
        x={0}
        y={halfHeight * 0.955}
        z={COCKPIT_DEPTH + 0.01}
      />
      <Panel
        color="#e1a348"
        height={height * 0.005}
        width={width * 0.18}
        x={0}
        y={halfHeight * 0.935}
        z={COCKPIT_DEPTH + 0.035}
      />
      <Panel
        color="#e1a348"
        height={height * 0.006}
        rotation={0.12}
        width={width * 0.11}
        x={-halfWidth * 0.37}
        y={halfHeight * 0.89}
        z={COCKPIT_DEPTH + 0.035}
      />
      <Panel
        color="#e1a348"
        height={height * 0.006}
        rotation={-0.12}
        width={width * 0.11}
        x={halfWidth * 0.37}
        y={halfHeight * 0.89}
        z={COCKPIT_DEPTH + 0.035}
      />

      {/* Instrument light bars stay peripheral and never cover the moving field. */}
      <Panel
        color="#6ad8d4"
        height={height * 0.12}
        rotation={-0.13}
        width={railThickness * 0.46}
        x={-halfWidth * 0.955}
        y={-halfHeight * 0.08}
        z={COCKPIT_DEPTH + 0.035}
      />
      <Panel
        color="#6ad8d4"
        height={height * 0.12}
        rotation={0.13}
        width={railThickness * 0.46}
        x={halfWidth * 0.955}
        y={-halfHeight * 0.08}
        z={COCKPIT_DEPTH + 0.035}
      />

      <Panel
        color="#292621"
        height={height * 0.042}
        width={width * 0.42}
        x={0}
        y={lowerConsoleY}
        z={COCKPIT_DEPTH + 0.01}
      />
      <Panel
        color="#b97e32"
        height={height * 0.004}
        width={width * 0.12}
        x={0}
        y={lowerConsoleY + height * 0.006}
        z={COCKPIT_DEPTH + 0.035}
      />
    </group>
  )
}
