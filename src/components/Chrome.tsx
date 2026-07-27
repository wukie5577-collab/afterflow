import { Maximize2, Volume2, VolumeX } from 'lucide-react'
import { Brand } from './Brand'
import { useAppStore } from '../store'
import type { AppMode } from '../types'

const nav: [string, AppMode][] = [['EXPERIENCE','experience'],['RESEARCH','research'],['EXPLAIN','explain'],['PRESENTATION','presentation']]

export function Chrome() {
  const mode=useAppStore(s=>s.mode), phase=useAppStore(s=>s.phase), researchRole=useAppStore(s=>s.researchRole), setMode=useAppStore(s=>s.setMode), muted=useAppStore(s=>s.muted), toggleMuted=useAppStore(s=>s.toggleMuted), quality=useAppStore(s=>s.quality), setQuality=useAppStore(s=>s.setQuality), displayMode=useAppStore(s=>s.displayMode), setDisplayMode=useAppStore(s=>s.setDisplayMode)
  const stereoDepth=useAppStore(s=>s.stereoDepth), setStereoDepth=useAppStore(s=>s.setStereoDepth), stereoFocus=useAppStore(s=>s.stereoFocus), setStereoFocus=useAppStore(s=>s.setStereoFocus), stereoSwapEyes=useAppStore(s=>s.stereoSwapEyes), toggleStereoSwapEyes=useAppStore(s=>s.toggleStereoSwapEyes), resetStereoCalibration=useAppStore(s=>s.resetStereoCalibration)
  if((mode==='research'&&researchRole==='participant')||((mode==='research'||mode==='experience')&&phase!=='idle'))return null
  return <><header className="topbar"><Brand onClick={()=>setMode('landing')}/><nav aria-label="Modes">{nav.map(([label,value])=><button key={value} className={mode===value?'active':''} onClick={()=>setMode(value)}>{label}</button>)}</nav></header>
  <div className="utility"><button aria-label={muted?'Enable sound':'Mute sound'} onClick={toggleMuted}>{muted?<VolumeX/>:<Volume2/>}</button><select aria-label="Display mode" value={displayMode} onChange={e=>setDisplayMode(e.target.value as typeof displayMode)}><option value="standard">2D DISPLAY</option><option value="anaglyph">RED / CYAN 3D</option><option value="cd-only">CD-ONLY 3D</option></select><select aria-label="Quality" value={quality} onChange={e=>setQuality(e.target.value as typeof quality)}><option value="performance">PERFORMANCE</option><option value="balanced">BALANCED</option><option value="showcase">SHOWCASE</option></select><button aria-label="Fullscreen" onClick={()=>document.documentElement.requestFullscreen?.()}><Maximize2/></button></div>
  {(displayMode==='anaglyph'||displayMode==='cd-only')&&<aside className="stereo-calibration" aria-label="3D calibration">
    <header><span>3D CALIBRATION</span><b>START AT ZERO, INCREASE SLOWLY</b></header>
    <label><span>DEPTH STRENGTH <b>{stereoDepth.toFixed(3)}</b></span><input aria-label="3D depth strength" type="range" min="0" max="0.08" step="0.001" value={stereoDepth} onInput={e=>setStereoDepth(Number(e.currentTarget.value))}/><span className="stereo-nudge"><button aria-label="Decrease 3D depth" onClick={()=>setStereoDepth(Math.max(0,stereoDepth-.001))}>−</button><button aria-label="Increase 3D depth" onClick={()=>setStereoDepth(Math.min(.08,stereoDepth+.001))}>+</button></span></label>
    <label><span>CONVERGENCE DISTANCE <b>{stereoFocus.toFixed(1)}</b></span><input aria-label="3D convergence distance" type="range" min="3" max="23" step=".5" value={stereoFocus} onInput={e=>setStereoFocus(Number(e.currentTarget.value))}/><span className="stereo-nudge"><button aria-label="Decrease 3D convergence" onClick={()=>setStereoFocus(Math.max(3,stereoFocus-.5))}>−</button><button aria-label="Increase 3D convergence" onClick={()=>setStereoFocus(Math.min(23,stereoFocus+.5))}>+</button></span></label>
    <div><button className={stereoSwapEyes?'active':''} onClick={toggleStereoSwapEyes}>{stereoSwapEyes?'EYES SWAPPED':'SWAP EYES'}</button><button onClick={resetStereoCalibration}>RESET TO ZERO</button></div>
    <small>{displayMode==='cd-only'?'CD-ONLY APPLIES TO THE RADIAL/DEPTH CHANNEL. DOT SIZE AND CYCLOPEAN X/Y STAY FIXED; ONLY BINOCULAR DISPARITY CHANGES.':'RED-LEFT / CYAN-RIGHT GLASSES USUALLY NEED NO SWAP. ENABLE ONLY IF DEPTH IS FULLY REVERSED.'}</small>
  </aside>}</>
}
