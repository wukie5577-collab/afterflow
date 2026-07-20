import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Scene } from '../components/Scene'
import { useAppStore } from '../store'

function explanationSteps(oppositePercentage: number, adaptationSeconds: number, testSeconds: number, nearDistance: number, farDistance: number, temporalSampling: boolean) { return [
  {
    title: 'Research question',
    body: 'After adapting to one motion direction, how does the configured bidirectional test mixture affect perceived dominance?',
    detail: 'This protocol measures post-adaptation perceptual dominance. It is not a correct / incorrect direction task.',
    mode: 'idle' as const,
  },
  {
    title: 'Coherent adaptation',
    body: 'During adaptation, every dot follows the configured direction to establish directional motion adaptation.',
    detail: `Current duration: ${adaptationSeconds} s. Timing is browser-controlled and must be device-validated for formal experiments.`,
    mode: 'adaptation' as const,
  },
  {
    title: 'Custom temporal sampling',
    body: temporalSampling
      ? 'During adaptation, only one of every three display frames contains dots; the other two frames are blank.'
      : 'The custom temporal-sampling condition is currently disabled, so adaptation is rendered continuously.',
    detail: 'The brightness of successive visible frames follows a slow raised-sine envelope. This intentional 1 / 3 duty cycle physically flickers at approximately refresh rate ÷ 3. Motion testing always returns to every-frame updates at opacity 1.',
    mode: 'adaptation' as const,
  },
  {
    title: 'Recorded references',
    body: 'The cockpit and concentric guides provide stable spatial references that may change perceived depth and motion.',
    detail: `Both factors are recorded. Dots currently span ${nearDistance.toFixed(1)}–${farDistance.toFixed(1)} world units from the observer and can cross the cockpit plane at 8.0 units.`,
    mode: 'adaptation' as const,
  },
  {
    title: '200 ms blank gap',
    body: 'Dots and concentric guides disappear for 200 ms between adaptation and the bidirectional test.',
    detail: 'The cockpit reference remains only when that recorded condition is enabled.',
    mode: 'blank' as const,
  },
  {
    title: 'Configurable motion test',
    body: `A seeded random assignment sends ${oppositePercentage}% of dots opposite to adaptation while ${100 - oppositePercentage}% continue in the adaptation direction.`,
    detail: `The groups are visually identical and have equal speed. Current test duration: ${testSeconds} s. At 50 / 50 there is no physical majority.`,
    mode: 'test' as const,
  },
  {
    title: 'Bias report, not a score',
    body: 'The participant reports only the dominant perceived direction. The result is classified relative to adaptation.',
    detail: 'An opposite-direction report is MAE-consistent, but it remains a perceptual response rather than a correctness score.',
    mode: 'idle' as const,
  },
] }

export function Explain() {
  const [step, setStep] = useState(0)
  const config = useAppStore((state) => state.config)
  const oppositePercentage = Math.round(config.oppositeDirectionShare * 100)
  const steps = explanationSteps(oppositePercentage, config.adaptationDurationMs / 1000, config.staticTestDurationMs / 1000, config.particleNearDistance, config.particleFarDistance, config.adaptationTemporalSamplingEnabled)
  const current = steps[step]
  return (
    <main className="screen explain">
      <Scene stimulus="radial" motionMode={current.mode} cockpit />
      <section>
        <p>POST-ADAPTATION BIDIRECTIONAL PROTOCOL · {String(step + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}</p>
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
