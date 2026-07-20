import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronLeft, ChevronRight, Circle, Play } from 'lucide-react'
import { Scene } from '../components/Scene'
import { FixedFixation } from '../components/FixedFixation'
import {
  assignedGroupCount,
  BLANK_TRANSITION_DURATION_MS,
  displayCalibrationStatus,
  downloadText,
  isStimulusPhase,
  oppositeDirection,
  responseRelation,
  resultToCsv,
} from '../lib/trial'
import { useAppStore } from '../store'
import type { MotionDirection, ResponseRelation, TrialPhase, TrialResult } from '../types'

const responseByType = {
  radial: [['Toward me', 'forward', ArrowUp], ['Away from me', 'backward', ArrowDown], ['No dominant motion', 'static', Circle]],
  horizontal: [['Left', 'left', ArrowLeft], ['Right', 'right', ArrowRight], ['No dominant motion', 'static', Circle]],
  vertical: [['Up', 'up', ArrowUp], ['Down', 'down', ArrowDown], ['No dominant motion', 'static', Circle]],
} as const

const directionLabels: Record<MotionDirection | 'unsure', string> = {
  forward: 'Toward me',
  backward: 'Away from me',
  left: 'Left',
  right: 'Right',
  up: 'Up',
  down: 'Down',
  static: 'No dominant motion',
  none: 'No stimulus',
  unsure: 'Unsure',
}

const relationLabels: Record<ResponseRelation, string> = {
  'opposite-to-adaptation': 'Opposite-direction bias',
  'same-as-adaptation': 'Same-direction bias',
  static: 'No dominant direction',
  unsure: 'Uncertain report',
  other: 'Orthogonal / other direction',
}

export function Trial({ research = false, onComplete }: { research?: boolean; onComplete?: () => void }) {
  const config = useAppStore((state) => state.config)
  const setConfig = useAppStore((state) => state.setConfig)
  const phase = useAppStore((state) => state.phase)
  const setPhase = useAppStore((state) => state.setPhase)
  const addResult = useAppStore((state) => state.addResult)
  const results = useAppStore((state) => state.results)
  const [paused, setPaused] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [selected, setSelected] = useState<MotionDirection | 'unsure' | null>(null)
  const [railOpen, setRailOpen] = useState(true)
  const started = useRef(0)
  const responseStarted = useRef(0)
  const responsePromptLatency = useRef(0)
  const actualAdaptation = useRef(0)
  const actualMotionTest = useRef(0)
  const frameTimes = useRef<number[]>([])
  const lastFrame = useRef(0)

  const duration = phase === 'fixation'
    ? 1500
    : phase === 'adaptation'
      ? config.adaptationDurationMs
      : phase === 'transition'
        ? BLANK_TRANSITION_DURATION_MS
        : config.staticTestDurationMs

  const start = useCallback(() => {
    const randomSeed = crypto.getRandomValues(new Uint32Array(1))[0]
    setConfig({ randomSeed })
    setRailOpen(false)
    setSelected(null)
    setPaused(false)
    setElapsed(0)
    started.current = performance.now()
    lastFrame.current = started.current
    frameTimes.current = []
    actualAdaptation.current = 0
    actualMotionTest.current = 0
    setPhase('fixation')
  }, [setConfig, setPhase])

  useEffect(() => {
    if (phase === 'idle' && !research) start()
  }, [phase, research, start])

  useEffect(() => {
    if (!isStimulusPhase(phase)) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPhase('idle')
        setPaused(false)
      }
      if (event.key.toLowerCase() === 'p') setPaused((value) => !value)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [phase, setPhase])

  useEffect(() => {
    if (['idle', 'response', 'complete'].includes(phase) || paused) return
    let animationFrame = 0
    const tick = (now: number) => {
      const frameInterval = now - lastFrame.current
      if (lastFrame.current) frameTimes.current.push(frameInterval)
      lastFrame.current = now
      const nextElapsed = now - started.current
      setElapsed(nextElapsed)
      if (nextElapsed >= duration) {
        const nextPhase: TrialPhase = phase === 'fixation'
          ? 'adaptation'
          : phase === 'adaptation'
            ? 'transition'
            : phase === 'transition'
              ? 'motion-test'
              : 'response'
        if (phase === 'adaptation') actualAdaptation.current = nextElapsed
        if (phase === 'motion-test') actualMotionTest.current = nextElapsed
        started.current = now
        lastFrame.current = now
        setElapsed(0)
        setPhase(nextPhase)
        if (nextPhase === 'response') responseStarted.current = now
      } else {
        animationFrame = requestAnimationFrame(tick)
      }
    }
    animationFrame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animationFrame)
  }, [duration, paused, phase, setPhase])

  const submit = () => {
    if (!selected) return
    const intervals = frameTimes.current
    const warnings: string[] = []
    if (intervals.some((value) => value > 50)) warnings.push('unstable-frame-timing')
    if (document.visibilityState === 'hidden') warnings.push('page-hidden-at-submit')
    const result: TrialResult = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      config,
      maeConsistentDirection: oppositeDirection(config.direction),
      response: selected,
      responseRelation: responseRelation(selected, config.direction),
      responsePromptLatencyMs: responsePromptLatency.current,
      actualAdaptationDurationMs: Math.round(actualAdaptation.current || config.adaptationDurationMs),
      actualMotionTestDurationMs: Math.round(actualMotionTest.current || config.staticTestDurationMs),
      frameIntervals: intervals,
      displayCalibration: displayCalibrationStatus(intervals),
      warnings,
      aborted: false,
    }
    addResult(result)
    setPhase('complete')
    onComplete?.()
  }

  const recordDirection = (value: MotionDirection | 'unsure') => {
    setSelected(value)
    responsePromptLatency.current = Math.round(performance.now() - responseStarted.current)
  }

  const motionMode = phase === 'transition'
    ? 'blank'
    : paused
      ? 'idle'
      : phase === 'adaptation'
        ? 'adaptation'
        : phase === 'motion-test'
          ? 'test'
          : 'idle'
  const cleanStimulusView = isStimulusPhase(phase)
  const latestResult = results.at(-1)
  const oppositePercentage = Math.round(config.oppositeDirectionShare * 100)
  const samePercentage = 100 - oppositePercentage
  const oppositeCount = assignedGroupCount(config.particleCount, config.oppositeDirectionShare)
  const sameCount = config.particleCount - oppositeCount

  if (phase === 'idle') {
    return (
      <main className={`screen trial-screen ${railOpen ? 'rail-open' : ''}`}>
        <Scene stimulus={config.stimulusType} />
        <section className="trial-intro">
          <p>RESEARCH MODE · POST-ADAPTATION BIAS</p>
          <h1>Configurable bidirectional<br />motion bias.</h1>
          <p>
            Adapt to fully coherent motion, then report which direction dominates under a controlled mixture
            of continuing and reversing dots.
          </p>
          <button className="primary" onClick={start}><Play />START RANDOMIZED TRIAL<ArrowRight /></button>
          <CalibrationDisclosure compact />
        </section>
        <ParameterRail research={research} open={railOpen} onToggle={() => setRailOpen((open) => !open)} />
      </main>
    )
  }

  return (
    <main className={`screen trial-screen ${cleanStimulusView ? 'clean-stimulus-view' : ''}`}>
      <Scene stimulus={config.stimulusType} motionMode={motionMode} cockpit />
      <FixedFixation />

      {phase === 'response' ? (
        <section className="response-panel" aria-labelledby="motion-response-title">
          <p>MOTION-DIRECTION RESPONSE · BIDIRECTIONAL TEST</p>
          <h2 id="motion-response-title">Which direction was perceptually dominant?</h2>
          <p className="panel-note">{samePercentage}% same-direction ({sameCount}) · {oppositePercentage}% opposite-direction ({oppositeCount})</p>
          <div className="response-grid">
            {responseByType[config.stimulusType].map(([label, value, Icon]) => (
              <button className={selected === value ? 'selected' : ''} onClick={() => recordDirection(value as MotionDirection)} key={value}>
                <Icon /><span>{label}</span>
              </button>
            ))}
            <button className={selected === 'unsure' ? 'selected' : ''} onClick={() => recordDirection('unsure')}>
              <b>?</b><span>Unsure</span>
            </button>
          </div>
          <button className="primary" disabled={!selected} onClick={submit}>
            RECORD BIAS REPORT<ArrowRight />
          </button>
          <button className="panel-exit" onClick={() => setPhase('idle')}>ABORT AND RETURN TO SETUP</button>
        </section>
      ) : null}

      {phase === 'complete' && latestResult ? (
        <section className="response-panel complete" aria-labelledby="result-title">
          <p>TRIAL RECORDED · DESCRIPTIVE RESULT</p>
          <h2 id="result-title">Post-adaptation motion-bias report.</h2>
          <p className="panel-note">This is a perceptual choice, not a correct / incorrect score.</p>
          <dl className="result-readout">
            <ResultRow label="ADAPTATION" value={directionLabels[latestResult.config.direction]} />
            <ResultRow label="TEST COMPOSITION" value={`${100 - Math.round(latestResult.config.oppositeDirectionShare * 100)}% same · ${Math.round(latestResult.config.oppositeDirectionShare * 100)}% opposite`} />
            <ResultRow label="DOTS / SIZE" value={`${latestResult.config.particleCount} · ${latestResult.config.particleSize.toFixed(3)} world units`} />
            <ResultRow label="DOT DEPTH RANGE" value={`${latestResult.config.particleNearDistance.toFixed(1)}–${latestResult.config.particleFarDistance.toFixed(1)} world units from observer`} />
            <ResultRow label="ADAPTATION DURATION" value={`${latestResult.actualAdaptationDurationMs} ms actual · ${latestResult.config.adaptationDurationMs} ms target`} />
            <ResultRow label="TEST DURATION" value={`${latestResult.actualMotionTestDurationMs} ms actual · ${latestResult.config.staticTestDurationMs} ms target`} />
            <ResultRow label="MAE-CONSISTENT PREDICTION" value={directionLabels[latestResult.maeConsistentDirection]} />
            <ResultRow label="REPORTED DOMINANCE" value={directionLabels[latestResult.response]} />
            <ResultRow label="RESPONSE RELATION" value={relationLabels[latestResult.responseRelation]} />
            <ResultRow label="PROMPT LATENCY" value={`${latestResult.responsePromptLatencyMs} ms`} />
            <ResultRow label="TEMPORAL SAMPLING" value={latestResult.config.adaptationTemporalSamplingEnabled ? `ON · ${latestResult.config.adaptationVisibleFramesPerCycle} VISIBLE / ${latestResult.config.adaptationFrameStride} FRAMES · ${latestResult.config.adaptationOpacityEnvelope} visible-frame α ${latestResult.config.adaptationMinimumOpacity.toFixed(2)}–1.00 @ ${latestResult.config.adaptationOpacityFrequencyHz.toFixed(2)} Hz` : 'OFF · CONTINUOUS ADAPTATION'} />
            <ResultRow label="COCKPIT REFERENCE" value={latestResult.config.cockpitEnabled ? 'ON' : 'OFF'} />
            <ResultRow label="CONCENTRIC GUIDES" value={latestResult.config.concentricGuidesEnabled ? 'ON' : 'OFF'} />
            <ResultRow label="REFRESH ESTIMATE" value={latestResult.displayCalibration.estimatedRefreshRateHz ? `~${latestResult.displayCalibration.estimatedRefreshRateHz} Hz · NOT VALIDATED` : 'UNAVAILABLE'} />
          </dl>
          <CalibrationDisclosure compact />
          <div className="inline-actions">
            <button onClick={() => setPhase('idle')}>NEXT TRIAL</button>
            <button onClick={() => downloadText('afterflow-session.json', JSON.stringify(results, null, 2), 'application/json')}>EXPORT JSON</button>
            <button onClick={() => downloadText('afterflow-session.csv', resultToCsv(results), 'text/csv')}>EXPORT CSV</button>
          </div>
        </section>
      ) : null}

      {cleanStimulusView ? <span className="sr-only">Press P to pause or Escape to abort the trial.</span> : null}
      {cleanStimulusView && paused ? <div className="paused-indicator">PAUSED · PRESS P TO RESUME</div> : null}
      {cleanStimulusView ? <progress className="sr-only" max={duration} value={Math.min(duration, elapsed)}>Trial progress</progress> : null}
    </main>
  )
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>
}

function CalibrationDisclosure({ compact = false }: { compact?: boolean }) {
  return (
    <aside className={`calibration-disclosure ${compact ? 'compact' : ''}`} aria-label="Calibration status">
      <p>MEASUREMENT STATUS</p>
      <dl>
        <div><dt>VIEWING DISTANCE</dt><dd>NOT RECORDED</dd></div>
        <div><dt>PHYSICAL SCREEN SIZE</dt><dd>NOT RECORDED</dd></div>
        <div><dt>VISUAL ANGLE</dt><dd>NOT CALIBRATED</dd></div>
        <div><dt>REFRESH RATE</dt><dd>ESTIMATED · NOT VALIDATED</dd></div>
        <div><dt>DEVICE TIMING</dt><dd>NOT VALIDATED</dd></div>
      </dl>
    </aside>
  )
}

function ParameterSection({ children, description, title }: { children: ReactNode; description: string; title: string }) {
  return (
    <section className="parameter-section">
      <header><h2>{title}</h2><p>{description}</p></header>
      <div className="parameter-grid">{children}</div>
    </section>
  )
}

function RangeControl({
  display,
  label,
  max,
  min,
  note,
  onChange,
  step = 1,
  value,
}: {
  display: string
  label: string
  max: number
  min: number
  note: string
  onChange: (value: number) => void
  step?: number
  value: number
}) {
  return (
    <label className="parameter-control">
      <span>{label}</span><b>{display}</b>
      <input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <small>{note}</small>
    </label>
  )
}

function ParameterRail({ research, open, onToggle }: { research: boolean; open: boolean; onToggle: () => void }) {
  const config = useAppStore((state) => state.config)
  const setConfig = useAppStore((state) => state.setConfig)
  const oppositePercentage = Math.round(config.oppositeDirectionShare * 100)
  const oppositeCount = assignedGroupCount(config.particleCount, config.oppositeDirectionShare)
  const sameCount = config.particleCount - oppositeCount
  return (
    <>
      <button className={`parameter-rail-toggle ${open ? 'open' : ''}`} type="button" aria-expanded={open} aria-controls="parameter-rail" onClick={onToggle}>
        {open ? <ChevronLeft /> : <ChevronRight />}<span>{open ? 'HIDE' : 'SHOW PARAMETERS'}</span>
      </button>
      {open ? (
        <aside className="parameter-rail" id="parameter-rail">
          <header className="parameter-rail-header">
            <span>{research ? 'RESEARCH MODE' : 'GUIDED PROTOCOL'}</span>
            <h1>Stimulus setup</h1>
            <p>Every adjustable factor below is stored with the trial.</p>
          </header>
          <div className="protocol-lock"><span>CURRENT TEST MIX</span><b>{100 - oppositePercentage}% SAME / {oppositePercentage}% OPPOSITE</b><small>{sameCount} continuing · {oppositeCount} reversing · seeded assignment</small></div>

          <ParameterSection title="Protocol" description="Select the motion axis and coherent adaptation direction.">
            <label className="parameter-control select-control"><span>CHANNEL</span>
              <select aria-label="Channel" value={config.stimulusType} onChange={(event) => setConfig({ stimulusType: event.target.value as typeof config.stimulusType, direction: event.target.value === 'radial' ? 'forward' : event.target.value === 'horizontal' ? 'right' : 'up' })}>
                <option value="radial">RADIAL / DEPTH</option><option value="horizontal">HORIZONTAL</option><option value="vertical">VERTICAL</option>
              </select>
            </label>
            <label className="parameter-control select-control"><span>ADAPTATION DIRECTION</span>
              <select aria-label="Adaptation direction" value={config.direction} onChange={(event) => setConfig({ direction: event.target.value as MotionDirection })}>
                {(config.stimulusType === 'radial' ? ['forward', 'backward'] : config.stimulusType === 'horizontal' ? ['left', 'right'] : ['up', 'down']).map((direction) => <option key={direction}>{direction}</option>)}
              </select>
            </label>
          </ParameterSection>

          <ParameterSection title="Timing" description={`Browser-timed phases with a fixed ${BLANK_TRANSITION_DURATION_MS} ms blank interval.`}>
            <RangeControl label="Adaptation duration" display={`${config.adaptationDurationMs / 1000}s`} min={1000} max={60000} step={500} value={config.adaptationDurationMs} onChange={(adaptationDurationMs) => setConfig({ adaptationDurationMs })} note="TARGET DURATION" />
            <RangeControl label="Motion test duration" display={`${config.staticTestDurationMs / 1000}s`} min={500} max={20000} step={500} value={config.staticTestDurationMs} onChange={(staticTestDurationMs) => setConfig({ staticTestDurationMs })} note="AFTER BLANK GAP" />
          </ParameterSection>

          <ParameterSection title="Custom temporal sampling" description="Your adaptation-only rendering condition. The motion test remains continuous and unchanged.">
            <label className="parameter-control select-control temporal-toggle"><span>TEMPORAL SAMPLING</span>
              <select aria-label="Adaptation temporal sampling" value={config.adaptationTemporalSamplingEnabled ? 'on' : 'off'} onChange={(event) => setConfig({ adaptationTemporalSamplingEnabled: event.target.value === 'on' })}>
                <option value="off">OFF · CONTINUOUS</option><option value="on">ON · 1 VISIBLE / 3 FRAMES</option>
              </select>
            </label>
            <div className={`temporal-spec ${config.adaptationTemporalSamplingEnabled ? 'active' : ''}`}>
              <span>DISPLAY DUTY CYCLE</span><b>{config.adaptationTemporalSamplingEnabled ? `${config.adaptationVisibleFramesPerCycle} VISIBLE / ${config.adaptationFrameStride} FRAMES` : '3 VISIBLE / 3 FRAMES'}</b>
              <small>{config.adaptationTemporalSamplingEnabled ? `VISIBLE-FRAME α ${config.adaptationMinimumOpacity.toFixed(2)}–1.00 · RAISED-SINE ${config.adaptationOpacityFrequencyHz.toFixed(2)} HZ` : 'EVERY FRAME · α 1.00'}</small>
            </div>
            <RangeControl label="Visible-frame brightness frequency" display={`${config.adaptationOpacityFrequencyHz.toFixed(2)} Hz`} min={0.1} max={1.5} step={0.05} value={config.adaptationOpacityFrequencyHz} onChange={(adaptationOpacityFrequencyHz) => setConfig({ adaptationOpacityFrequencyHz })} note="SLOW RAISED-SINE ENVELOPE" />
            <RangeControl label="Minimum visible-frame opacity" display={config.adaptationMinimumOpacity.toFixed(2)} min={0.2} max={1} step={0.05} value={config.adaptationMinimumOpacity} onChange={(adaptationMinimumOpacity) => setConfig({ adaptationMinimumOpacity })} note="MAXIMUM IS 1.00" />
            <p className="temporal-module-note">Only the middle frame of each three-frame adaptation cycle contains dots. Successive visible-frame opacity values follow the configured raised-sine; the other two frames are opacity 0. Position advances on the visible frame using accumulated time. The motion test stays every-frame at opacity 1.</p>
            <p className="temporal-safety-note">INTENTIONAL FLICKER CONDITION · A 1 / 3 DISPLAY DUTY CYCLE PRODUCES PHYSICAL FLICKER AT APPROXIMATELY REFRESH RATE ÷ 3.</p>
          </ParameterSection>

          <ParameterSection title="Motion distribution" description="Configure the physical test mixture and conceptual velocity.">
            <RangeControl label="Opposite-direction share" display={`${oppositePercentage}%`} min={0} max={100} value={oppositePercentage} onChange={(value) => setConfig({ oppositeDirectionShare: value / 100 })} note={`${oppositeCount} OF ${config.particleCount} DOTS`} />
            <RangeControl label="Conceptual speed" display={config.speed.toFixed(1)} min={0.2} max={3} step={0.1} value={config.speed} onChange={(speed) => setConfig({ speed })} note="WORLD UNITS / S" />
          </ParameterSection>

          <ParameterSection title="Dot field" description="Control density, apparent dot geometry, and observer-relative depth bounds.">
            <RangeControl label="Particle count" display={String(config.particleCount)} min={24} max={700} value={config.particleCount} onChange={(particleCount) => setConfig({ particleCount })} note="INSTANCES" />
            <RangeControl label="Dot size" display={config.particleSize.toFixed(3)} min={0.01} max={0.12} step={0.005} value={config.particleSize} onChange={(particleSize) => setConfig({ particleSize })} note="WORLD UNITS" />
            <RangeControl label="Nearest dot distance" display={config.particleNearDistance.toFixed(1)} min={0.5} max={Math.min(20, config.particleFarDistance - 1)} step={0.5} value={config.particleNearDistance} onChange={(particleNearDistance) => setConfig({ particleNearDistance })} note="FROM OBSERVER" />
            <RangeControl label="Farthest dot distance" display={config.particleFarDistance.toFixed(1)} min={config.particleNearDistance + 1} max={40} step={0.5} value={config.particleFarDistance} onChange={(particleFarDistance) => setConfig({ particleFarDistance })} note="FROM OBSERVER" />
            <p className="depth-reference-note">Cockpit reference plane: 8.0 world units from observer. Current dot span: {config.particleNearDistance.toFixed(1)}–{config.particleFarDistance.toFixed(1)}.</p>
          </ParameterSection>

          <ParameterSection title="Reference factors" description="These stable structures are experimental factors, not neutral decoration.">
            <label className="parameter-control select-control"><span>COCKPIT REFERENCE</span>
              <select aria-label="Cockpit reference" value={config.cockpitEnabled ? 'on' : 'off'} onChange={(event) => setConfig({ cockpitEnabled: event.target.value === 'on' })}>
                <option value="on">ON · RECORDED</option><option value="off">OFF · RECORDED</option>
              </select>
            </label>
            <label className="parameter-control select-control"><span>CONCENTRIC GUIDES</span>
              <select aria-label="Concentric guides" value={config.concentricGuidesEnabled ? 'on' : 'off'} onChange={(event) => setConfig({ concentricGuidesEnabled: event.target.value === 'on' })}>
                <option value="on">ON · RECORDED</option><option value="off">OFF · RECORDED</option>
              </select>
            </label>
          </ParameterSection>
          <CalibrationDisclosure />
        </aside>
      ) : null}
    </>
  )
}
