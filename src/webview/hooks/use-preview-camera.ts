import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { RefObject } from 'preact';
import type { Spine } from '@esotericsoftware/spine-pixi-v8';
import { clampZoom, ZOOM_WHEEL_SENSITIVITY } from '../zoom';
import type { BackgroundId } from '../components/controls';

const DEFAULT_ZOOM = 1;
const DEFAULT_BACKGROUND: BackgroundId = 'checker';
const ORIGIN = { x: 0, y: 0 };
const LEFT_MOUSE_BUTTON = 0;
const MIDDLE_MOUSE_BUTTON = 1;
type Pan = { x: number; y: number };

function isOverPanel(target: EventTarget | null) {
  return target instanceof Element && target.closest('[data-panel]') !== null;
}

function applyTransform(anim: Spine, zoom: number, pan: Pan) {
  anim.x = window.innerWidth * 0.5 + pan.x;
  anim.y = window.innerHeight * 0.5 + pan.y;
  anim.scale.set(zoom);
}

export function usePreviewCamera(currentAnimRef: RefObject<Spine>, canvasContainer: HTMLElement) {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pan, setPan] = useState<Pan>(ORIGIN);
  const [background, setBackground] = useState<BackgroundId>(DEFAULT_BACKGROUND);

  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const dragging = useRef(false);
  const dragStart = useRef(ORIGIN);

  const resetView = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
    setPan(ORIGIN);
  }, []);

  const applyView = useCallback((anim: Spine) => applyTransform(anim, zoomRef.current, panRef.current), []);

  useEffect(() => {
    zoomRef.current = zoom;
    panRef.current = pan;
    if (currentAnimRef.current) applyTransform(currentAnimRef.current, zoom, pan);
  }, [zoom, pan, currentAnimRef]);

  useEffect(() => {
    canvasContainer.className = `bg-${background}`;
  }, [background, canvasContainer]);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      // Over a panel the wheel belongs to that panel's scrollbar, not the camera.
      if (isOverPanel(e.target)) return;
      e.preventDefault();
      const current = zoomRef.current;
      const next = clampZoom(current * Math.exp(-e.deltaY * ZOOM_WHEEL_SENSITIVITY));
      if (next === current) return;
      const ratio = next / current;
      // Keep whatever sits under the cursor pinned to the cursor.
      zoomRef.current = next;
      setPan((prev) => ({
        x: e.clientX + (window.innerWidth * 0.5 + prev.x - e.clientX) * ratio - window.innerWidth * 0.5,
        y: e.clientY + (window.innerHeight * 0.5 + prev.y - e.clientY) * ratio - window.innerHeight * 0.5,
      }));
      setZoom(next);
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (isOverPanel(e.target)) return;
      const isPanGesture = e.button === MIDDLE_MOUSE_BUTTON || (e.button === LEFT_MOUSE_BUTTON && e.shiftKey);
      if (!isPanGesture) return;
      e.preventDefault();
      dragging.current = true;
      dragStart.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
    };
    const onMouseUp = () => {
      dragging.current = false;
    };
    const onDblClick = (e: MouseEvent) => {
      if (isOverPanel(e.target)) return;
      resetView();
    };
    const onResize = () => {
      if (currentAnimRef.current) applyTransform(currentAnimRef.current, zoomRef.current, panRef.current);
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('dblclick', onDblClick);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('dblclick', onDblClick);
      window.removeEventListener('resize', onResize);
    };
  }, [resetView, currentAnimRef]);

  return { zoom, setZoom, background, setBackground, resetView, applyView };
}
