import { useCallback, useEffect, useRef, useState } from "react";
import { request, errorMessage } from "./api";
import { emptyCatalog, entities } from "./types";
import type { Catalog, Entity } from "./types";

export function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog>(emptyCatalog);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<Entity, string>>>({});
  const active = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    const results = await Promise.allSettled(entities.map(entity => request<Catalog[Entity]>(`/${entity}`, { signal: controller.signal })));
    if (controller.signal.aborted) return;
    const next: Catalog = { ...emptyCatalog };
    const nextErrors: Partial<Record<Entity, string>> = {};
    results.forEach((result, index) => {
      const entity = entities[index];
      if (result.status === "fulfilled") Object.assign(next, { [entity]: result.value });
      else nextErrors[entity] = errorMessage(result.reason);
    });
    setCatalog(next);
    setErrors(nextErrors);
    setLoading(false);
  }, []);
  useEffect(() => { void refresh(); return () => active.current?.abort(); }, [refresh]);
  return { catalog, loading, errors, refresh };
}
export type CatalogState = ReturnType<typeof useCatalog>;
