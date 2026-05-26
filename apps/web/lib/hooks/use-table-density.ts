"use client";

import { useEffect, useState } from "react";

export type TableDensity = "comfortable" | "default" | "compact";

const STORAGE_KEY = "mera-table-density";

export const DENSITY_ROW_HEIGHT: Record<TableDensity, number> = {
  comfortable: 56,
  default: 44,
  compact: 36,
};

export function useTableDensity(initial: TableDensity = "default") {
  const [density, setDensityState] = useState<TableDensity>(initial);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "comfortable" || stored === "default" || stored === "compact") {
        setDensityState(stored);
      }
    } catch {}
  }, []);

  const setDensity = (next: TableDensity) => {
    setDensityState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  };

  return [density, setDensity] as const;
}
