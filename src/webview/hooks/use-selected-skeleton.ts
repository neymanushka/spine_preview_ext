import { useCallback, useEffect, useState } from 'preact/hooks';
import type { RefObject } from 'preact';
import { Skin } from '@esotericsoftware/spine-pixi-v8';
import type { Spine } from '@esotericsoftware/spine-pixi-v8';
import type { PerformanceProfiler } from '../performance-stats';

const EMPTY_ITEMS = [] as const;

export function useSelectedSkeleton({
  skeleton,
  currentAnimRef,
  applyView,
  profiler,
}: {
  skeleton: Spine | undefined;
  currentAnimRef: RefObject<Spine | null>;
  applyView: (anim: Spine) => void;
  profiler: PerformanceProfiler;
}) {
  const [activeSkins, setActiveSkins] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (!skeleton) return;
    const anim = skeleton;
    anim.visible = true;
    applyView(anim);
    currentAnimRef.current = anim;
    setActiveSkins(new Set());
    // Instances are reused; switching back starts with clean tracks and skin.
    anim.state.clearTracks();
    anim.skeleton.setSkin(null);
    anim.skeleton.setToSetupPose();
    profiler.reset();
    return () => {
      anim.visible = false;
      if (currentAnimRef.current === anim) currentAnimRef.current = null;
    };
  }, [skeleton, currentAnimRef, applyView, profiler]);

  const toggleSkin = useCallback(
    (skinName: string) => {
      setActiveSkins((prev) => {
        const next = new Set(prev);
        if (next.has(skinName)) next.delete(skinName);
        else next.add(skinName);
        const anim = currentAnimRef.current;
        if (anim) {
          const customSkin = new Skin('custom');
          next.forEach((partName) => {
            const part = anim.skeleton.data.findSkin(partName);
            if (part) customSkin.addSkin(part);
          });
          anim.skeleton.setSkin(customSkin);
          anim.skeleton.setSlotsToSetupPose();
        }
        return next;
      });
    },
    [currentAnimRef],
  );

  // Export metadata belongs to SkeletonData; it does not need UI state or synchronization.
  const data = skeleton?.skeleton.data;
  return {
    version: data?.version || 'unknown',
    animations: data?.animations ?? EMPTY_ITEMS,
    physics: data?.physicsConstraints ?? EMPTY_ITEMS,
    skins: data?.skins ?? EMPTY_ITEMS,
    activeSkins,
    toggleSkin,
  };
}
