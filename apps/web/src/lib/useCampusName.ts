"use client";

import { useMemo } from "react";
import { getCampuses } from "./api";
import { useResource } from "./useResource";

export function useCampusName(campusId: string | undefined) {
  const { data } = useResource(getCampuses, []);
  return useMemo(
    () =>
      data?.campuses.find((campus) => campus.id === campusId)?.shortName,
    [data, campusId],
  );
}
