export const ZOOM_MIN = 0.05;
export const ZOOM_MAX = 8;

// One wheel notch (deltaY ≈ 100) changes the zoom by ~14%, so the step stays
// proportional instead of collapsing at the low end like a linear one does.
export const ZOOM_WHEEL_SENSITIVITY = 0.0015;

const ZOOM_RANGE = ZOOM_MAX / ZOOM_MIN;

export function clampZoom(zoom: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

// The slider is linear in log space, otherwise 0.05–1 would occupy a tenth of
// the track while 1–8 takes the rest.
export function zoomToSlider(zoom: number) {
  return Math.log(clampZoom(zoom) / ZOOM_MIN) / Math.log(ZOOM_RANGE);
}

export function sliderToZoom(position: number) {
  return clampZoom(ZOOM_MIN * ZOOM_RANGE ** position);
}
