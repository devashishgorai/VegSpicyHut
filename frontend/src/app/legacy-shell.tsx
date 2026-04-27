"use client";

import { useEffect, useState } from "react";
import LegacyClientApp from "./legacy-client";

export default function LegacyShell() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <LegacyClientApp />;
}
