"use client";

import { useCallback, useEffect, useState } from "react";
import type { CalendarEventDTO } from "@/components/calendar/types";

export interface CreateEventInput {
  title: string;
  date: string;
  notes?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  color?: string | null;
  noteId?: number | null;
  recurrence?: string | null;
  recurrenceUntil?: string | null;
  visibility?: "PRIVATE" | "PUBLIC";
}

export type UpdateEventInput = Partial<CreateEventInput>;

interface State {
  events: CalendarEventDTO[];
  loading: boolean;
  error: string | null;
}

export function useCalendarEvents(opts?: { from?: string; to?: string; enabled?: boolean }) {
  const [state, setState] = useState<State>({ events: [], loading: false, error: null });
  const fromKey = opts?.from ?? "";
  const toKey = opts?.to ?? "";
  const enabled = opts?.enabled !== false;

  const load = useCallback(async () => {
    if (!enabled) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const params = new URLSearchParams();
      if (fromKey) params.set("from", fromKey);
      if (toKey) params.set("to", toKey);
      const url = `/api/calendar-events${params.size ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setState({ events: [], loading: false, error: data?.error || "Failed to load" });
        return;
      }
      const data = (await res.json()) as CalendarEventDTO[];
      setState({ events: Array.isArray(data) ? data : [], loading: false, error: null });
    } catch {
      setState({ events: [], loading: false, error: "Network error" });
    }
  }, [fromKey, toKey, enabled]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const create = useCallback(async (input: CreateEventInput) => {
    const res = await fetch("/api/calendar-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || "Could not create event");
    }
    const created = (await res.json()) as CalendarEventDTO;
    setState((s) => ({
      ...s,
      events: [...s.events, created].sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.startTime || "").localeCompare(b.startTime || "");
      }),
    }));
    return created;
  }, []);

  const update = useCallback(async (id: number, input: UpdateEventInput) => {
    const res = await fetch(`/api/calendar-events?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || "Could not update event");
    }
    const updated = (await res.json()) as CalendarEventDTO;
    setState((s) => ({
      ...s,
      events: s.events.map((e) => (e.id === id ? updated : e)),
    }));
    return updated;
  }, []);

  const remove = useCallback(async (id: number) => {
    const res = await fetch(`/api/calendar-events?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || "Could not delete event");
    }
    setState((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) }));
  }, []);

  return { ...state, reload: load, create, update, remove };
}
