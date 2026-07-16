import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Circle, Pause, Play, Square } from 'lucide-react'
import { Scene } from '../components/Scene'
import { CockpitReferenceFrame } from '../components/CockpitReferenceFrame'
import { FixedFixation } from '../components/FixedFixation'
import { downloadText, oppositeDirection, resultToCsv } from '../lib/trial'
import { useAppStore } from '../store'
import type { MotionDirection, TrialPhase, TrialResult } from '../types'

const phaseOrder: TrialPhase[]=['fixation','adaptation','motion-test','response','confidence']
const responseByType = {
  radial: [['Toward me','backward',ArrowUp],['Away from me','forward',ArrowDown],['No motion','static',Circle]],
  horizontal: [['Left','left',ArrowLeft],['Right','right',ArrowRight],['No motion','static',Circle]],
  vertical: [['Up','up',ArrowUp],['Down','down',ArrowDown],['No motion','static',Circle]],
} as const

export function Trial({ research=false, onComplete }: { research?: boolean; onComplete?: ()=>void }) {
  const config=useAppStore(s=>s.config), setConfig=useAppStore(s=>s.setConfig), phase=useAppStore(s=>s.phase), setPhase=useAppStore(s=>s.setPhase), addResult=useAppStore(s=>s.addResult), results=useAppStore(s=>s.results)
  const [paused,setPaused]=useState(false), [elapsed,setElapsed]=useState(0), [selected,setSelected]=useState<MotionDirection|'unsure'|null>(null), [confidence,setConfidence]=useState(3)
  const started=useRef(0), responseStarted=useRef(0), reactionTime=useRef(0), actualAdaptation=useRef(0), frameTimes=useRef<number[]>([]), lastFrame=useRef(0)
  const duration = phase==='fixation'?1500:phase==='adaptation'?config.adaptationDurationMs:phase==='transition'?100:config.staticTestDurationMs
  const start=useCallback(()=>{ setElapsed(0); started.current=performance.now(); lastFrame.current=started.current; frameTimes.current=[]; setPhase('fixation') },[setPhase])
  useEffect(()=>{ if(phase==='idle' && !research) start() },[phase,research,start])
  useEffect(()=>{
    if(['idle','response','confidence','complete'].includes(phase)||paused)return
    let raf=0; const tick=(now:number)=>{ const dt=now-lastFrame.current;if(lastFrame.current)frameTimes.current.push(dt);lastFrame.current=now;const next=now-started.current;setElapsed(next)
      if(next>=duration){ const nextPhase:TrialPhase=phase==='fixation'?'adaptation':phase==='adaptation'?'transition':phase==='transition'?'motion-test':'response'; if(phase==='adaptation')actualAdaptation.current=next; started.current=now;lastFrame.current=now;setElapsed(0);setPhase(nextPhase);if(nextPhase==='response')responseStarted.current=now }
      else raf=requestAnimationFrame(tick)}; raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf)
  },[duration,paused,phase,setPhase])
  const submit=()=>{ if(!selected)return; const intervals=frameTimes.current; const warnings:string[]=[]; if(intervals.some(v=>v>50))warnings.push('unstable-frame-timing'); if(document.visibilityState==='hidden')warnings.push('page-hidden')
    const result:TrialResult={id:crypto.randomUUID(),timestamp:new Date().toISOString(),config,expectedAftereffect:oppositeDirection(config.direction),response:selected,confidence,reactionTimeMs:reactionTime.current,actualAdaptationDurationMs:Math.round(actualAdaptation.current||config.adaptationDurationMs),frameIntervals:intervals,warnings,aborted:false}
    addResult(result);setPhase('complete');onComplete?.() }
  const recordDirection=(value:MotionDirection|'unsure')=>{setSelected(value);reactionTime.current=Math.round(performance.now()-responseStarted.current)}
  const motionMode = paused ? 'idle' : phase==='adaptation' ? 'adaptation' : phase==='transition'||phase==='motion-test' ? 'test' : 'idle'
  const responses=responseByType[config.stimulusType]
  if(phase==='idle') return <main className="screen trial-screen"><Scene stimulus={config.stimulusType}/><section className="trial-intro"><p>RESEARCH MODE</p><h1>Bidirectional motion<br/>discrimination.</h1><p>Adapt to fully coherent motion, then report the global direction when randomly assigned dots move in opposite directions.</p><button className="primary" onClick={start}><Play/>START TRIAL<ArrowRight/></button></section><ParameterRail research={research}/></main>
  return <main className="screen trial-screen"><Scene stimulus={config.stimulusType} motionMode={motionMode}/><CockpitReferenceFrame/><FixedFixation/><div className="phase-nav">{phaseOrder.map(p=><span className={phase===p?'active':''} key={p}>{p.replace('-',' ')}</span>)}</div><ParameterRail research={research}/>
    <div className="trial-controls"><button onClick={()=>setPaused(!paused)}>{paused?<Play/>:<Pause/>}{paused?'RESUME':'PAUSE'}</button><button onClick={()=>{setPhase('idle');setPaused(false)}}><Square/>ABORT TRIAL</button><div className="progress"><b>{Math.min(duration,elapsed/1000*1000).toFixed(0)}</b> / {duration} ms<i style={{width:`${Math.min(100,elapsed/duration*100)}%`}}/></div></div>
    {(phase==='motion-test')&&<div className="test-label"><b>BIDIRECTIONAL MOTION TEST</b><span>{Math.round(config.coherence*100)}% OPPOSITE · {Math.round((1-config.coherence)*100)}% ADAPTATION DIRECTION</span></div>}
    {phase==='response'&&<section className="response-panel"><p>MOTION-DIRECTION RESPONSE</p><h2>What was the global motion direction?</h2><div className="response-grid">{responses.map(([label,value,Icon])=><button className={selected===value?'selected':''} onClick={()=>recordDirection(value as MotionDirection)} key={value}><Icon/><span>{label}</span></button>)}<button className={selected==='unsure'?'selected':''} onClick={()=>recordDirection('unsure')}><b>?</b><span>Unsure</span></button></div><button className="primary" disabled={!selected} onClick={()=>setPhase('confidence')}>CONTINUE TO CONFIDENCE<ArrowRight/></button></section>}
    {phase==='confidence'&&<section className="response-panel confidence-panel"><p>CONFIDENCE</p><h2>How certain are you about “{selected}”?</h2><label>CONFIDENCE · {confidence}/5<input type="range" min="1" max="5" value={confidence} onChange={e=>setConfidence(Number(e.target.value))}/></label><button className="primary" onClick={submit}>RECORD TRIAL<ArrowRight/></button></section>}
    {phase==='complete'&&<section className="response-panel complete"><p>TRIAL RECORDED</p><h2>Direction discrimination result.</h2><dl className="result-readout"><div><dt>ADAPTATION</dt><dd>{config.direction}</dd></div><div><dt>EXPECTED OPPOSITE</dt><dd>{oppositeDirection(config.direction)}</dd></div><div><dt>REPORTED</dt><dd>{selected}</dd></div><div><dt>REACTION TIME</dt><dd>{results.at(-1)?.reactionTimeMs ?? 0} ms</dd></div><div><dt>CONFIDENCE</dt><dd>{confidence} / 5</dd></div><div><dt>MEAN FRAME INTERVAL</dt><dd>{averageFrameInterval(results.at(-1)?.frameIntervals)} ms</dd></div></dl><div className="inline-actions"><button onClick={()=>setPhase('idle')}>NEXT TRIAL</button><button onClick={()=>downloadText('afterflow-session.json',JSON.stringify(results,null,2),'application/json')}>EXPORT JSON</button><button onClick={()=>downloadText('afterflow-session.csv',resultToCsv(results),'text/csv')}>EXPORT CSV</button></div></section>}
  </main>
}

function ParameterRail({ research }: { research:boolean }) { const config=useAppStore(s=>s.config),setConfig=useAppStore(s=>s.setConfig);return <aside className="parameter-rail"><p>{research?'RESEARCH MODE':'GUIDED PROTOCOL'}</p><label>CHANNEL<select value={config.stimulusType} onChange={e=>setConfig({stimulusType:e.target.value as typeof config.stimulusType,direction:e.target.value==='radial'?'forward':e.target.value==='horizontal'?'right':'up'})}><option value="radial">RADIAL / DEPTH</option><option value="horizontal">HORIZONTAL</option><option value="vertical">VERTICAL</option></select></label><label>DIRECTION<select value={config.direction} onChange={e=>setConfig({direction:e.target.value as MotionDirection})}>{(config.stimulusType==='radial'?['forward','backward']:config.stimulusType==='horizontal'?['left','right']:['up','down']).map(d=><option key={d}>{d}</option>)}</select></label><label>OPPOSITE SHARE <b>{Math.round(config.coherence*100)}%</b><input aria-label="Opposite-direction share" type="range" min="0" max="1" step=".1" value={config.coherence} onChange={e=>setConfig({coherence:Number(e.target.value)})}/></label><label>ADAPTATION <b>{config.adaptationDurationMs/1000}s</b><input type="range" min="3000" max="30000" step="1000" value={config.adaptationDurationMs} onChange={e=>setConfig({adaptationDurationMs:Number(e.target.value)})}/></label><label>SPEED <b>{config.speed.toFixed(1)}</b><input type="range" min=".2" max="3" step=".1" value={config.speed} onChange={e=>setConfig({speed:Number(e.target.value)})}/></label><label>PARTICLES <b>{config.particleCount}</b><input type="range" min="24" max="700" value={config.particleCount} onChange={e=>setConfig({particleCount:Number(e.target.value)})}/></label><span className="calibration">STIMULUS <b>READY</b></span></aside> }

function averageFrameInterval(intervals: number[] | undefined) {
  if (!intervals?.length) return '0.00'
  return (intervals.reduce((total, value) => total + value, 0) / intervals.length).toFixed(2)
}
