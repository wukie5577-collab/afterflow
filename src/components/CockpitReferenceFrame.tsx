const COCKPIT_FRAME_SRC = './assets/cockpit-reference-frame.png'

/**
 * A static screen-space reference frame that never participates in the 3D
 * scene graph, trial timer, responsive layout, or animation timelines.
 */
export function CockpitReferenceFrame() {
  return <div className="cockpit-reference-lock" data-testid="cockpit-reference-frame" aria-hidden="true">
    <img src={COCKPIT_FRAME_SRC} alt="" draggable={false} fetchPriority="high" />
  </div>
}
