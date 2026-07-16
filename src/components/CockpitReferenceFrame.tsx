import { useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'

// The frame sits inside the radial flow volume rather than in front of it.
// Forward particles can therefore travel from behind the cockpit to the
// viewer side of it, creating a genuine fly-through depth cue.
const COCKPIT_DEPTH = 0

interface PanelProps {
  color: string
  height: number
  width: number
  x: number
  y: number
  z?: number
}

function Panel({color,height,width,x,y,z=COCKPIT_DEPTH}:PanelProps){
  return <mesh position={[x,y,z]} frustumCulled={false}>
    <planeGeometry args={[width,height]} />
    <meshBasicMaterial color={color} depthTest depthWrite toneMapped={false} />
  </mesh>
}

/**
 * A stable cockpit reference built from real scene geometry. It occupies only
 * the extreme periphery and sits inside the radial particle volume, allowing
 * dots to travel through the open view and pass the cockpit depth plane.
 */
export function CockpitReferenceFrame(){
  const camera=useThree(state=>state.camera as THREE.PerspectiveCamera)
  const viewportSize=useThree(state=>state.size)
  const dimensions=useMemo(()=>{
    const distance=Math.abs(camera.position.z-COCKPIT_DEPTH)
    const height=2*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*distance
    return {height,width:height*(viewportSize.width/viewportSize.height)}
  },[camera.fov,camera.position.z,viewportSize.height,viewportSize.width])
  const {height,width}=dimensions
  const side=width*.035,top=height*.045,bottom=height*.065
  const windowLeft=-width/2+side,windowRight=width/2-side
  const windowTop=height/2-top,windowBottom=-height/2+bottom
  const rim=height*.008
  return <group name="cockpit-depth-reference" renderOrder={10}>
    <Panel color="#181a19" height={height} width={side} x={-width/2+side/2} y={0}/>
    <Panel color="#181a19" height={height} width={side} x={width/2-side/2} y={0}/>
    <Panel color="#232321" height={top} width={width-side*2} x={0} y={height/2-top/2}/>
    <Panel color="#201d19" height={bottom} width={width-side*2} x={0} y={-height/2+bottom/2}/>
    <Panel color="#d5c7b7" height={rim} width={windowRight-windowLeft} x={0} y={windowTop-rim/2} z={COCKPIT_DEPTH+.015}/>
    <Panel color="#8d765f" height={rim} width={windowRight-windowLeft} x={0} y={windowBottom+rim/2} z={COCKPIT_DEPTH+.015}/>
    <Panel color="#d5c7b7" height={windowTop-windowBottom} width={rim} x={windowLeft+rim/2} y={(windowTop+windowBottom)/2} z={COCKPIT_DEPTH+.015}/>
    <Panel color="#d5c7b7" height={windowTop-windowBottom} width={rim} x={windowRight-rim/2} y={(windowTop+windowBottom)/2} z={COCKPIT_DEPTH+.015}/>
    <Panel color="#e3a34b" height={rim*.42} width={width*.22} x={0} y={windowTop-rim*.78} z={COCKPIT_DEPTH+.03}/>
    <Panel color="#65cfd0" height={height*.16} width={rim*.34} x={windowLeft-rim*.85} y={0} z={COCKPIT_DEPTH+.03}/>
    <Panel color="#65cfd0" height={height*.16} width={rim*.34} x={windowRight+rim*.85} y={0} z={COCKPIT_DEPTH+.03}/>
  </group>
}
