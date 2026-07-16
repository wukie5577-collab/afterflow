import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronLeft, ChevronRight, Circle, Play } from 'lucide-react'
import { Scene } from '../components/Scene'
import { FixedFixation } from '../components/FixedFixation'
import {
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
  const [confidence, setConfidence] = useState(3)
  const [railOpen, setRailOpen] = useState(true)
  const started = useRef(0)
  const responseStarted = useRef(0)
  const responsePromptLatency = useRef(0)
  const actualAdaptation = useRef(0)
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
    setConfig({ randomSeed, oppositeDirectionShare: 0.5 })
    setRailOpen(false)
    setSelected(null)
    setConfidence(3)
    setPaused(false)
    setElapsed(0)
    started.current = performance.now()
    lastFrame.current = started.current
    frameTimes.current = []
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
    if (['idle', 'response', 'confidence', 'complete'].includes(phase) || paused) return
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
      confidence,
      responsePromptLatencyMs: responsePromptLatency.current,
      actualAdaptationDurationMs: Math.round(actualAdaptation.current || config.adaptationDurationMs),
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

  if (phase === 'idle') {
    return (
      <main className={`screen trial-screen ${railOpen ? 'rail-open' : ''}`}>
        <Scene stimulus={config.stimulusType} />
        <section className="trial-intro">
          <p>RESEARCH MODE · POST-ADAPTATION BIAS</p>
          <h1>50 / 50 bidirectional<br />motion bias.</h1>
          <p>
            Adapt to fully coherent motion, then report which direction dominates when half the dots continue
            and half reverse. There is no objectively correct direction in the balanced test.
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
          <p>MOTION-DIRECTION RESPONSE · BALANCED TEST</p>
          <h2 id="motion-response-title">Which direction was perceptually dominant?</h2>
          <p className="panel-note">50% same-direction dots · 50% opposite-direction dots · no correct answer</p>
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
          <button className="primary" disabled={!selected} onClick={() => setPhase('confidence')}>
            CONTINUE TO CONFIDENCE<ArrowRight />
          </button>
          <button className="panel-exit" onClick={() => setPhase('idle')}>ABORT AND RETURN TO SETUP</button>
        </section>
      ) : null}

      {phase === 'confidence' && selected ? (
        <section className="response-panel confidence-panel" aria-labelledby="confidence-title">
          <p>CONFIDENCE</p>
          <h2 id="confidence-title">How certain are you about “{directionLabels[selected]}”?</h2>
          <p className="panel-note">Confidence describes this report, not accuracy.</p>
          <label>CONFIDENCE · {confidence}/5
            <input aria-label="Confidence" type="range" min="1" max="5" value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} />
          </label>
          <button className="primary" onClick={submit}>RECORD BIAS REPORT<ArrowRight /></button>
          <button className="panel-exit" onClick={() => setPhase('idle')}>ABORT AND RETURN TO SETUP</button>
        </section>
      ) : null}

      {phase === 'complete' && latestResult ? (
        <section className="response-panel complete" aria-labelledby="result-title">
          <p>TRIAL RECORDED · DESCRIPTIVE RESULT</p>
          <h2 id="result-title">Post-adaptation motion-bias report.</h2>
          <p className="panel-note">This is a perceptual choice, not a correct / incorrect score.</p>
          <dl className="result-readout">
            <ResultRow label="ADAPTATION" value={directionLabels[config.direction]} />
            <ResultRow label="TEST COMPOSITION" value="50% same · 50% opposite" />
            <ResultRow label="MAE-CONSISTENT PREDICTION" value={directionLabels[latestResult.maeConsistentDirection]} />
            <ResultRow label="REPORTED DOMINANCE" value={directionLabels[latestResult.response]} />
            <ResultRow label="RESPONSE RELATION" value={relationLabels[latestResult.responseRelation]} />
            <ResultRow label="PROMPT LATENCY" value={`${latestResult.responsePromptLatencyMs} ms`} />
            <ResultRow label="CONFIDENCE" value={`${confidence} / 5`} />
            <ResultRow label="COCKPIT REFERENCE" value={config.cockpitEnabled ? 'ON' : 'OFF'} />
            <ResultRow label="CONCENTRIC GUIDES" value={config.concentricGuidesEnabled ? 'ON' : 'OFF'} />
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

function ParameterRail({ research, open, onToggle }: { research: boolean; open: boolean; onToggle: () => void }) {
  const config = useAppStore((state) => state.config)
  const setConfig = useAppStore((state) => state.setConfig)
  return (
    <>
      <button className={`parameter-rail-toggle ${open ? 'open' : ''}`} type="button" aria-expanded={open} aria-controls="parameter-rail" onClick={onToggle}>
        {open ? <ChevronLeft /> : <ChevronRight />}<span>{open ? 'HIDE' : 'SHOW PARAMETERS'}</span>
      </button>
      {open ? (
        <aside className="parameter-rail" id="parameter-rail">
          <p>{research ? 'RESEARCH MODE' : 'GUIDED PROTOCOL'}</p>
          <div className="protocol-lock"><span>TEST MIX · LOCKED</span><b>50% SAME / 50% OPPOSITE</b><small>Random membership is regenerated and logged for every trial.</small></div>
          <label>CHANNEL
            <select value={config.stimulusType} onChange={(event) => setConfig({ stimulusType: event.target.value as typeof config.stimulusType, direction: event.target.value === 'radial' ? 'forward' : event.target.value === 'horizontal' ? 'right' : 'up' })}>
              <option value="radial">RADIAL / DEPTH</option><option value="horizontal">HORIZONTAL</option><option value="vertical">VERTICAL</option>
            </select>
          </label>
          <label>ADAPTATION DIRECTION
            <select value={config.direction} onChange={(event) => setConfig({ direction: event.target.value as MotionDirection })}>
              {(config.stimulusType === 'radial' ? ['forward', 'backward'] : config.stimulusType === 'horizontal' ? ['left', 'right'] : ['up', 'down']).map((direction) => <option key={direction}>{direction}</option>)}
            </select>
          </label>
          <label>ADAPTATION <b>{config.adaptationDurationMs / 1000}s</b>
            <input aria-label={`Adaptation ${config.adaptationDurationMs / 1000}s`} type="range" min="3000" max="30000" step="1000" value={config.adaptationDurationMs} onChange={(event) => setConfig({ adaptationDurationMs: Number(event.target.value) })} />
            <small>BROWSER-TIMED · DEVICE NOT VALIDATED</small>
          </label>
          <label>CONCEPTUAL SPEED <b>{config.speed.toFixed(1)}</b>
            <input aria-label={`Conceptual speed ${config.speed.toFixed(1)}`} type="range" min=".2" max="3" step=".1" value={config.speed} onChange={(event) => setConfig({ speed: Number(event.target.value) })} />
            <small>WORLD UNITS · NOT DEG/S</small>
          </label>
          <label>PARTICLES <b>{config.particleCount}</b>
            <input aria-label={`Particles ${config.particleCount}`} type="range" min="24" max="700" value={config.particleCount} onChange={(event) => setConfig({ particleCount: Number(event.target.value) })} />
            <small>DOT SIZE NOT VISUAL-ANGLE CALIBRATED</small>
          </label>
          <label>COCKPIT REFERENCE
            <select value={config.cockpitEnabled ? 'on' : 'off'} onChange={(event) => setConfig({ cockpitEnabled: event.target.value === 'on' })}>
              <option value="on">ON · RECORDED</option><option value="off">OFF · RECORDED</option>
            </select>
          </label>
          <label>CONCENTRIC GUIDES
            <select value={config.concentricGuidesEnabled ? 'on' : 'off'} onChange={(event) => setConfig({ concentricGuidesEnabled: event.target.value === 'on' })}>
              <option value="on">ON · RECORDED</option><option value="off">OFF · RECORDED</option>
            </select>
          </label>
          <CalibrationDisclosure />
        </aside>
      ) : null}
    </>
  )
}
