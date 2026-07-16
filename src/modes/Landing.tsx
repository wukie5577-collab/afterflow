import { ArrowRight, CircleDot } from 'lucide-react'
import { Scene } from '../components/Scene'
import { FixedFixation } from '../components/FixedFixation'
import { useAppStore } from '../store'

export function Landing() { const setMode=useAppStore(s=>s.setMode); return <main className="screen landing"><Scene stimulus="radial" motionMode="adaptation" preview/><FixedFixation label="Live preview fixation point"/><section className="hero"><h1>Visual motion.<br/>Measured precisely.</h1><div className="signal-line"/><p>A browser-based bidirectional motion experiment for radial, horizontal, and vertical adaptation.</p><button className="primary" onClick={()=>setMode('research')}><CircleDot/>OPEN RESEARCH MODE<ArrowRight/></button><button className="text-link" onClick={()=>setMode('explain')}>VIEW EXPERIMENT LOGIC<ArrowRight/></button></section><div className="channel-index"><span>01 ADAPTATION</span><span>02 BIDIRECTIONAL TEST</span><span>03 RESPONSE</span></div></main> }
