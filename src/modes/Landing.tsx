import { ArrowRight, CircleDot } from 'lucide-react'
import { Scene } from '../components/Scene'
import { FixedFixation } from '../components/FixedFixation'
import { useAppStore } from '../store'

export function Landing() { const setMode=useAppStore(s=>s.setMode); return <main className="screen landing"><Scene stimulus="radial" motionMode="adaptation" preview/><FixedFixation label="Live preview fixation point"/><section className="hero"><h1>Visual motion.<br/>Measured transparently.</h1><div className="signal-line"/><p>A browser-based post-adaptation 50 / 50 motion-bias experiment. Display geometry and device timing remain explicitly uncalibrated.</p><button className="primary" onClick={()=>setMode('research')}><CircleDot/>OPEN RESEARCH MODE<ArrowRight/></button><button className="text-link" onClick={()=>setMode('explain')}>VIEW EXPERIMENT LOGIC<ArrowRight/></button></section><div className="channel-index"><span>01 ADAPTATION</span><span>02 BALANCED TEST</span><span>03 BIAS REPORT</span></div></main> }
