# AFTERFLOW

A code-first React Three Fiber experiment for measuring post-adaptation perceptual bias in an exactly balanced bidirectional motion test.

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
- **Research** exposes direction, duration, conceptual speed, density, stimulus type, cockpit reference, and concentric guides, then exports JSON/CSV.
- **Explain** distinguishes coherent adaptation, the 200 ms blank gap, the 50/50 physical-motion test, and an MAE-consistent bias report.
- **Presentation** autoplays a concise conference-safe explanation of the bidirectional task.

## Scientific boundary

During adaptation, 100% of dots follow the configured direction. At the start of every trial, a new logged random seed assigns exactly 50% of the visually identical test dots to the opposite direction and 50% to the adaptation direction. The balanced test has no objectively correct global direction: responses are classified as same-direction, opposite-direction, static, uncertain, or other perceptual bias. An opposite-direction report is MAE-consistent, but it is not scored as correct.

This is not a classic static-dot MAE test. It studies how prior adaptation biases perceived dominance in a physically moving, balanced bidirectional stimulus. Browser timing is appropriate for demonstrations, pilots, and exploratory research. Viewing distance, physical screen size, visual angle, refresh rate, and device timing are explicitly marked as uncalibrated or unvalidated until device-specific calibration is added.

The fixation overlay is a fixed screen-space element at exactly `(50vw, 50vh)`. It is outside the Three.js scene graph and uses no transform, animation, or responsive offset. The full-viewport Canvas, perspective optic-flow origin, concentric guides, and fixation all share the normalized screen-space origin `(0, 0)`.

## Data

Results remain local. Research Mode exports JSON or CSV containing settings, MAE-consistent theoretical direction, response relation, confidence, response-prompt latency, timing intervals, cockpit/guides conditions, viewport data, refresh estimate, calibration status, and warning flags. No name or email is collected.

## Presets and Unity bridge

`TrialConfig` in `src/types.ts` is JSON-compatible and can be mirrored in Unity. Key fields include `stimulusType`, `direction`, duration in milliseconds, conceptual speed, particle count, presentation aperture, and random seed.

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
