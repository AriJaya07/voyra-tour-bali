"use client";

import { useEffect, useState } from "react";

/**
 * Returns a value that updates only after `delay` ms of stillness.
 * Use to throttle search inputs, autosaves, etc.
 */
export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
