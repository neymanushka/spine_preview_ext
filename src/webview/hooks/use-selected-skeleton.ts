import { useCallback, useEffect, useState } from 'preact/hooks';
import type { RefObject } from 'preact';
import { Skin } from '@esotericsoftware/spine-pixi-v8';
import type { Animation, Spine } from '@esotericsoftware/spine-pixi-v8';
import type { PhysicsConstraintData } from '../animation-info';
import type { PerformanceProfiler } from '../performance-stats';

export function useSelectedSkeleton({
  skeleton,
  currentAnimRef,
  applyView,
  profiler,
}: {
  skeleton: Spine | undefined;
  currentAnimRef: RefObject<Spine>;
  applyView: (anim: Spine) => void;
  profiler: PerformanceProfiler;
}) {
  const [version, setVersion] = useState('');
  const [animations, setAnimations] = useState<readonly Animation[]>([]);
  const [physics, setPhysics] = useState<readonly PhysicsConstraintData[]>([]);
  const [skins, setSkins] = useState<readonly Skin[]>([]);
  const [activeSkins, setActiveSkins] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (!skeleton) return;
    const anim = skeleton;
    anim.visible = true;
    applyView(anim);
    currentAnimRef.current = anim;
    setVersion(anim.skeleton.data.version || 'unknown');
    setAnimations([...anim.skeleton.data.animations]);
    setPhysics([...anim.skeleton.data.physicsConstraints]);
    setSkins([...anim.skeleton.data.skins]);
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

  return { version, animations, physics, skins, activeSkins, toggleSkin };
}
