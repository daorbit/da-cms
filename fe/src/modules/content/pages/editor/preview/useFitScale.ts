import { useCallback, useEffect, useState } from 'react';

interface Options {
  /** The content's natural width and height, before scaling. */
  contentWidth: number;
  contentHeight: number;
  /** Room left around the content inside the container. */
  padding?: { x: number; y: number };
}

interface FitScale {
  /** Attach to the element the content has to fit inside. */
  ref: (node: HTMLElement | null) => void;
  /** 1 until the container has been measured — pair with `measured` before showing anything. */
  scale: number;
  measured: boolean;
}

/**
 * The largest scale at which `contentWidth × contentHeight` fits inside the
 * measured element, capped at 1:1 — content is shrunk to fit but never blown
 * up, which would misrepresent what it looks like at its real size.
 *
 * Returns a *callback ref* rather than taking a `RefObject`, and that is the
 * whole point of the design: these previews live in modals, and a modal renders
 * nothing at all until it opens. With an object ref, the effect runs on the
 * render that opens the modal — while the ref is still empty, because the
 * portal has not mounted — finds no element, and never runs again, because
 * assigning a ref does not retrigger anything. The preview stays unmeasured
 * forever, and only appears if something unrelated happens to re-run the
 * effect. A callback ref fires when the element actually arrives, which is the
 * moment there is something to measure.
 */
export function useFitScale({ contentWidth, contentHeight, padding }: Options): FitScale {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [scale, setScale] = useState(1);
  const [measured, setMeasured] = useState(false);

  const padX = padding?.x ?? 0;
  const padY = padding?.y ?? 0;

  const ref = useCallback((node: HTMLElement | null) => setElement(node), []);

  useEffect(() => {
    if (!element) return;

    let frame = 0;

    /** False while the container has no usable size — it has not been laid out yet. */
    const fit = () => {
      const width = element.clientWidth - padX;
      const height = element.clientHeight - padY;
      if (width <= 0 || height <= 0) return false;

      const next = Math.min(1, width / contentWidth, height / contentHeight);
      if (!Number.isFinite(next) || next <= 0) return false;

      setScale(next);
      setMeasured(true);
      return true;
    };

    // The element can exist before it has been laid out — a modal's opening
    // transition is the common case. Retrying per frame until the first real
    // measurement covers that; the observer then handles genuine resizes.
    const retry = () => {
      if (fit()) return;
      frame = requestAnimationFrame(retry);
    };
    retry();

    const observer = new ResizeObserver(() => fit());
    observer.observe(element);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [element, contentWidth, contentHeight, padX, padY]);

  // A closed modal unmounts its content, so the next open starts from an
  // unmeasured state rather than briefly reusing the last one's scale.
  useEffect(() => {
    if (!element) setMeasured(false);
  }, [element]);

  return { ref, scale, measured };
}
