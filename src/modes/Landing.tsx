import { ArrowDown, ArrowRight, Play } from 'lucide-react'
import { Scene } from '../components/Scene'
import { useAppStore } from '../store'

function OpticalMark() {
  return <svg className="landing-optical-mark" viewBox="0 0 120 120" aria-hidden="true">
    <circle cx="60" cy="60" r="18" />
    <path d="M60 10v23M60 87v23M10 60h23M87 60h23" />
    <circle className="landing-optical-dot" cx="60" cy="60" r="4" />
  </svg>
}

export function Landing() {
  const setMode=useAppStore(s=>s.setMode)
  return <main className="screen landing landing-editorial">
    <Scene stimulus="radial" motionMode="adaptation" preview displayModeOverride="standard"/>
    <div className="landing-color-field" aria-hidden="true"/>
    <section className="landing-editorial-content">
      <OpticalMark/>
      <h1>MOTION AFTEREFFECT.</h1>
      <p>A browser-based experiment for measuring how visual adaptation changes perceived motion.</p>
      <div className="landing-actions">
        <button className="landing-primary" onClick={()=>setMode('research')}><Play/>START EXPERIMENT<ArrowRight/></button>
        <button className="landing-secondary" onClick={()=>setMode('explain')}>HOW IT WORKS<ArrowRight/></button>
      </div>
      <div className="landing-steps" aria-label="Experiment steps">
        <span><b>01</b>CALIBRATE</span><i/><span><b>02</b>ADAPT</span><i/><span><b>03</b>REPORT</span>
      </div>
    </section>
    <div className="landing-scene-reference" aria-hidden="true"><span/><i/></div>
    <ArrowDown className="landing-down-cue" aria-hidden="true"/>
  </main>
}
