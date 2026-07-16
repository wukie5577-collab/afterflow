/**
 * A screen-space reference that never participates in the 3D scene graph or
 * animated layout. Its box is centered without CSS transforms so camera,
 * post-processing, responsive panels, and animation timelines cannot move it.
 */
export function FixedFixation({ label = 'Fixation point' }: { label?: string }) {
  return <div className="fixation-lock" data-testid="fixation-lock" role="img" aria-label={label}>
    <span className="fixation-horizontal" />
    <span className="fixation-vertical" />
    <span className="fixation-center" />
  </div>
}
