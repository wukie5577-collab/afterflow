# AFTERFLOW

## Primary research question

AFTERFLOW now treats the study as a **post-adaptation bidirectional motion-dominance bias experiment**: after coherent directional adaptation, does the participant report a dominance advantage for dots moving opposite to the adaptation direction when opposite- and same-direction dots are presented together? This is not labelled as a classic static-test MAE measurement.

The research interface separates:

- **Operator Mode** — protocol parameters, condition composition, counterbalanced sequence generation, calibration limitations, event logs, and export.
- **Participant Mode** — fixation, stimulus, neutral response wording, and a neutral acknowledgement only. Mixture proportions, predictions, condition labels, and exports are hidden.

The operator-selected opposite-direction share is a continuous experimental factor from 0–100%. Every trial in a generated block uses that exact requested share; the sequence never injects other proportions automatically. A block balances both adaptation directions and all cockpit/concentric-guide combinations (8 trials). Participant-ID parity selects AB/BA direction order; trials are then deterministically shuffled within the block. Values of 0% and 100% are recorded as the same-only and opposite-only endpoints respectively.

The optional 1/3 duty-cycle condition requires an active photosensitivity acknowledgement and always exposes a STOP control. In desktop mode, temporal sampling is explicitly recorded as a `desktop-raf-estimate` and is **not** display-frame validated. Only WebXR frames with `XRFrame.predictedDisplayTime` are marked display-frame validated; device-specific validation remains required before controlled data collection.

A code-first React Three Fiber experiment for measuring post-adaptation perceptual bias in a configurable bidirectional motion test.

## Run

```bash
npm install
npm run dev
```

Production validation:

```bash
npm run typecheck
npm test
npm run build
```

## Modes

- **Experience** is a guided three-channel protocol with neutral, non-diagnostic feedback.
- **Research** exposes bidirectional share, dot count, dot size, adaptation/test duration, conceptual speed, stimulus type, cockpit reference, and concentric guides, then exports JSON/CSV.
- **Explain** distinguishes coherent adaptation, the 200 ms blank gap, the configurable physical-motion test, and an MAE-consistent bias report.
- **Presentation** autoplays a concise conference-safe explanation of the bidirectional task.

## Scientific boundary

During adaptation, 100% of dots follow the configured direction. At the start of every trial, a new logged random seed assigns the configured share of visually identical test dots to the opposite direction and the remainder to the adaptation direction. At 50 / 50 there is no physical majority; at other shares the physical mixture is explicit and recorded. Responses are classified as same-direction, opposite-direction, static, uncertain, or other perceptual bias. An opposite-direction report is MAE-consistent, but it is not scored as correct.

This is not a classic static-dot MAE test. It studies how prior adaptation biases perceived dominance in a physically moving, configurable bidirectional stimulus. Browser timing is appropriate for demonstrations, pilots, and exploratory research. Viewing distance, physical screen size, visual angle, refresh rate, and device timing are explicitly marked as uncalibrated or unvalidated until device-specific calibration is added.

The fixation overlay is a fixed screen-space element at exactly `(50vw, 50vh)`. It is outside the Three.js scene graph and uses no transform, animation, or responsive offset. The full-viewport Canvas, perspective optic-flow origin, concentric guides, and fixation all share the normalized screen-space origin `(0, 0)`.

## Data

Results remain local. Research Mode exports JSON or CSV containing configured/actual adaptation and test durations, blank-gap duration, the recorded adaptation-only temporal-sampling condition (motion stride, raised-sine frequency, and minimum opacity), bidirectional share, dot count, dot size, MAE-consistent theoretical direction, response relation, response-prompt latency, cockpit/guides conditions, viewport data, refresh estimate, calibration status, and warning flags. Confidence is not collected. No name or email is collected.

The optional custom adaptation condition uses a strict 1 / 3 display duty cycle: one visible dot frame followed by two blank dot frames. Brightness across successive visible frames follows a configurable raised-sine envelope. This intentionally produces physical flicker at approximately one third of the actual refresh rate. The motion-test phase is not temporally sampled: dots render and update every display frame at opacity 1.

## Presets and Unity bridge

`TrialConfig` in `src/types.ts` is JSON-compatible and can be mirrored in Unity. Key fields include `stimulusType`, `direction`, duration in milliseconds, conceptual speed, particle count and size, observer-relative near/far dot distances, presentation aperture, and random seed. Dot distances use Three.js world units and must not be interpreted as physical metres or calibrated visual angle without device-specific calibration.

## Architecture

- `src/components/Scene.tsx`: R3F laboratory and procedural stimuli
- `src/modes/Trial.tsx`: explicit trial UI and timing progression
- `src/lib/trial.ts`: pure direction, validation, deterministic random, and export logic
- `src/store.ts`: small persisted settings store
- `src/modes/*`: isolated application modes

## Performance and accessibility

Performance, Balanced, and Showcase presets adjust DPR, post-processing, and particle density. Reduced-effects respects non-essential movement without silently changing the configured trial stimulus. Keyboard-native buttons, visible focus states, fullscreen, mute, and responsive layouts are included.

## Deployment

The relative Vite base supports GitHub Pages, Vercel, and Netlify. Deploy the generated `dist/` folder.

## Limitations

- Visual speed is conceptual rather than calibrated retinal velocity.
- Physical dot size is not calibrated in degrees of visual angle.
- Display refresh rate is estimated from frame intervals, not independently validated.
- Viewing distance, physical screen dimensions, and device timing calibration are not yet collected.
- WebXR is intentionally left as a future layer; the desktop scientific boundary is implemented first.
- Generated concept images in `design/` are implementation references, not runtime assets.
