import { lazy, Suspense } from 'react'
import { Chrome } from './components/Chrome'
import { useAppStore } from './store'

const Landing=lazy(()=>import('./modes/Landing').then(m=>({default:m.Landing})))
const Experience=lazy(()=>import('./modes/Experience').then(m=>({default:m.Experience})))
const Trial=lazy(()=>import('./modes/Trial').then(m=>({default:m.Trial})))
const Explain=lazy(()=>import('./modes/Explain').then(m=>({default:m.Explain})))
const Presentation=lazy(()=>import('./modes/Presentation').then(m=>({default:m.Presentation})))

export function App(){const mode=useAppStore(s=>s.mode);return <div className="app"><Chrome/><Suspense fallback={<div className="mode-loader">CALIBRATING VISUAL FIELD</div>}>{mode==='landing'&&<Landing/>}{mode==='experience'&&<Experience/>}{mode==='research'&&<Trial research/>}{mode==='explain'&&<Explain/>}{mode==='presentation'&&<Presentation/>}</Suspense></div>}
