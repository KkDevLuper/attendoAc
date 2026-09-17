import { api } from "@/convex/_generated/api";
import type { AllData } from "@/lib/academic";
import { useQuery } from "convex/react";
import { useMemo } from "react";

/** Single reactive subscription to all of the signed-in student's data. */
export function useAcademicData(): AllData | undefined {
  const raw = useQuery(api.data.allData);
  return useMemo(() => {
    if (!raw) return undefined;
    return raw as unknown as AllData;
  }, [raw]);
}
