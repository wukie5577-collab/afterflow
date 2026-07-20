import { Maximize2, Volume2, VolumeX } from 'lucide-react'
import { Brand } from './Brand'
import { useAppStore } from '../store'
import type { AppMode } from '../types'

const nav: [string, AppMode][] = [['EXPERIENCE','experience'],['RESEARCH','research'],['EXPLAIN','explain'],['PRESENTATION','presentation']]

export function Chrome() {
  const mode=useAppStore(s=>s.mode), phase=useAppStore(s=>s.phase), researchRole=useAppStore(s=>s.researchRole), setMode=useAppStore(s=>s.setMode), muted=useAppStore(s=>s.muted), toggleMuted=useAppStore(s=>s.toggleMuted), quality=useAppStore(s=>s.quality), setQuality=useAppStore(s=>s.setQuality)
  if((mode==='research'&&researchRole==='participant')||((mode==='research'||mode==='experience')&&phase!=='idle'))return null
  return <><header className="topbar"><Brand onClick={()=>setMode('landing')}/><nav aria-label="Modes">{nav.map(([label,value])=><button key={value} className={mode===value?'active':''} onClick={()=>setMode(value)}>{label}</button>)}</nav></header>
  <div className="utility"><button aria-label={muted?'Enable sound':'Mute sound'} onClick={toggleMuted}>{muted?<VolumeX/>:<Volume2/>}</button><select aria-label="Quality" value={quality} onChange={e=>setQuality(e.target.value as typeof quality)}><option value="performance">PERFORMANCE</option><option value="balanced">BALANCED</option><option value="showcase">SHOWCASE</option></select><button aria-label="Fullscreen" onClick={()=>document.documentElement.requestFullscreen?.()}><Maximize2/></button></div></>
}
