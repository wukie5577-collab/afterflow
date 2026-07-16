import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Scene } from '../components/Scene'

const steps = [
  {
    title: 'Research question',
    body: 'After adapting to one motion direction, does a perfectly balanced 50 / 50 test appear biased toward one direction?',
    detail: 'This protocol measures post-adaptation perceptual dominance. It is not a correct / incorrect direction task.',
    mode: 'idle' as const,
  },
  {
    title: 'Coherent adaptation',
    body: 'During adaptation, every dot follows the configured direction to establish directional motion adaptation.',
    detail: 'Default duration: 20 s. Timing is browser-controlled and must be device-validated for formal experiments.',
    mode: 'adaptation' as const,
  },
  {
    title: 'Recorded references',
    body: 'The cockpit and concentric guides provide stable spatial references that may change perceived depth and motion.',
    detail: 'Both factors are explicitly switchable and saved in every trial result; they are not treated as neutral decoration.',
    mode: 'adaptation' as const,
  },
  {
    title: '200 ms blank gap',
    body: 'Dots and concentric guides disappear for 200 ms between adaptation and the bidirectional test.',
    detail: 'The cockpit reference remains only when that recorded condition is enabled.',
    mode: 'blank' as const,
  },
  {
    title: 'Balanced motion test',
    body: 'A new random assignment sends exactly half the dots opposite to adaptation while the other half continue in the adaptation direction.',
    detail: 'The two groups are visually identical and have equal speed. At 50 / 50 there is no objectively correct global direction.',
    mode: 'test' as const,
  },
  {
    title: 'Bias report, not a score',
    body: 'The participant reports the dominant perceived direction and confidence. The result is classified relative to adaptation.',
    detail: 'An opposite-direction report is MAE-consistent, but it remains a perceptual response rather than a correctness score.',
    mode: 'idle' as const,
  },
]

export function Explain() {
  const [step, setStep] = useState(0)
  const current = steps[step]
  return (
    <main className="screen explain">
      <Scene stimulus="radial" motionMode={current.mode} cockpit />
      <section>
        <p>POST-ADAPTATION 50 / 50 PROTOCOL · {String(step + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}</p>
        <h1>{current.title}</h1>
        <p>{current.body}</p>
        <p className="explain-detail">{current.detail}</p>
        <div className="science-flow" aria-label="Explanation steps">
          {steps.map((item, index) => (
            <button aria-label={`Step ${index + 1}: ${item.title}`} className={index === step ? 'active' : ''} onClick={() => setStep(index)} key={item.title}>{index + 1}</button>
          ))}
        </div>
        <button className="primary" onClick={() => setStep((step + 1) % steps.length)}>NEXT STEP<ArrowRight /></button>
        <aside className="explain-calibration" aria-label="Uncalibrated measurement notice">
          <b>UNCALIBRATED IN THIS BROWSER DEMO</b>
          <span>Viewing distance · physical screen size · visual angle · validated refresh rate · device timing</span>
        </aside>
      </section>
    </main>
  )
}
