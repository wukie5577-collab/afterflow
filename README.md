# AFTERFLOW

A code-first React Three Fiber experience for demonstrating the Motion Aftereffect (MAE), including radial depth, horizontal, and vertical adaptation.

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
- **Research** exposes direction, duration, speed, density, and stimulus type, then exports JSON/CSV.
- **Explain** steps through adaptation and the temporary opposite-direction percept.
- **Presentation** autoplays a concise conference-safe explanation of the bidirectional task.

## Scientific boundary

During adaptation, 100% of dots follow the configured direction. During `motion-test`, dots are assigned deterministically to two visually identical groups: the configured proportion moves opposite to adaptation and the remainder continues in the adaptation direction. The default is 50% opposite and 50% same-direction motion. There is no static-dot test, arbitrary-direction noise, decorative environment, camera motion, or post-processing. Browser timing is appropriate for demos, pilots, and exploratory research, but controlled perceptual studies need device-specific validation and screen/viewing-distance calibration.

The fixation overlay is a fixed screen-space element at exactly `(50vw, 50vh)`. It is outside the Three.js scene graph and uses no transform, animation, or responsive offset. The full-viewport Canvas, perspective optic-flow origin, concentric guides, and fixation all share the normalized screen-space origin `(0, 0)`.

## Data

Results remain local. Research Mode exports JSON or CSV containing settings, expected direction, response, confidence, reaction time, timing intervals, and warning flags. No name or email is collected.

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
- Display refresh estimation and focus/visibility event logging can be expanded for a formal study.
- WebXR is intentionally left as a future layer; the desktop scientific boundary is implemented first.
- Generated concept images in `design/` are implementation references, not runtime assets.
