import { useState, useEffect } from "react";
import type { RunTimelineEvent } from "@agentledger/shared";

export const useRunTimeline = (runId: string | null) => {
  const [events, setEvents] = useState<RunTimelineEvent[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) return;

    setEvents([]);
    setIsCompleted(false);
    setError(null);

    const eventSource = new EventSource(`/api/runs/${runId}/events`);

    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as RunTimelineEvent;
        setEvents((prev) => [...prev, event]);

        if (event.step === "COMPLETED" || event.step === "FAILED" || event.step === "PAYPAL_BLOCKED") {
          setIsCompleted(true);
        }
      } catch {
        // keepalive or parsing comment
      }
    };

    eventSource.onerror = () => {
      setError("Lost connection to live timeline stream");
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [runId]);

  return { events, isCompleted, error };
};
