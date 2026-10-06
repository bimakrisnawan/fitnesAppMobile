"use client";

import { useState } from "react";

/** The current time, captured once per page load (render must stay pure). */
export function useNow() {
  const [now] = useState(() => Date.now());
  return now;
}
