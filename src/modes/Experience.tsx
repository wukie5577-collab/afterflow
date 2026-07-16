import { useState } from 'react'
import { Trial } from './Trial'
import { useAppStore } from '../store'

const channels=['radial','horizontal','vertical'] as const
export function Experience(){const completed=useAppStore(s=>s.completedChannels),complete=useAppStore(s=>s.completeChannel),setConfig=useAppStore(s=>s.setConfig),setPhase=useAppStore(s=>s.setPhase);const [index,setIndex]=useState(Math.min(completed.length,2));const channel=channels[index]
  const done=()=>{complete(channel);if(index<2){const next=index+1;setIndex(next);setConfig({stimulusType:channels[next],direction:next===1?'right':'up',adaptationDurationMs:6000});setTimeout(()=>setPhase('idle'),700)}}
  if(completed.length>=3)return <div className="session-complete"><p>GUIDED PROTOCOL COMPLETE</p><h1>Three motion axes recorded.</h1><dl><div><dt>RADIAL</dt><dd>COMPLETE</dd></div><div><dt>HORIZONTAL</dt><dd>COMPLETE</dd></div><div><dt>VERTICAL</dt><dd>COMPLETE</dd></div></dl><p>Responses are descriptive experimental observations, not a diagnostic measure.</p><button onClick={()=>useAppStore.getState().resetExperience()}>RESTART PROTOCOL</button></div>
  return <Trial onComplete={done}/>
}
