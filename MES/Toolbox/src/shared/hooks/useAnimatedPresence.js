import { useEffect, useState } from 'react';

/**
 * Keeps modal/overlay DOM mounted briefly while closing so exit transitions run smoothly.
 */
export function useAnimatedPresence(isOpen, durationMs = 170) {
  const [rendered, setRendered] = useState(Boolean(isOpen));

  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      return undefined;
    }
    if (!rendered) return undefined;
    const timer = setTimeout(() => setRendered(false), durationMs);
    return () => clearTimeout(timer);
  }, [isOpen, rendered, durationMs]);

  return {
    rendered: Boolean(isOpen) || rendered,
    isClosing: rendered && !isOpen,
  };
}

export default useAnimatedPresence;
