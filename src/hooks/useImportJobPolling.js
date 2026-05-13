import { useState, useEffect, useRef, useMemo } from "react";
import { getSession } from "../supabase.js";

// Shared import-job polling hook. Replaces the three near-identical poll
// effects that previously lived in PDFUploadForm, ImageImportModal, and
// ImportPill (S65 left behind matching TODO(S66) markers in all three).
//
// Lifecycle:
//   - jobId null/empty   → returns idle state, no network activity
//   - jobId set          → polls /api/job-status/:id every POLL_INTERVAL_MS
//   - status completed   → stops polling, exposes extracted_data + validation_report
//   - status failed      → stops polling, exposes error_message
//   - 404                → emits onMissing callback so the caller can clear sessionStorage / local state
//
// The hook ticks an internal `now` every 1s so elapsed-time UI updates between
// poll fetches; consumers don't need to maintain their own setInterval.

const POLL_INTERVAL_MS = 3000;

export function useImportJobPolling(jobId, { onMissing } = {}) {
  const [job, setJob] = useState(null);
  const [now, setNow] = useState(Date.now());
  const onMissingRef = useRef(onMissing);
  useEffect(() => { onMissingRef.current = onMissing; }, [onMissing]);

  // Tick `now` every 1s. Independent of polling cadence so phase elapsed
  // labels update smoothly between fetches.
  useEffect(() => {
    if (!jobId) return;
    const intv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intv);
  }, [jobId]);

  // Polling effect. Resets job when jobId changes so stale data from a
  // previous job never bleeds across.
  useEffect(() => {
    if (!jobId) { setJob(null); return; }
    let cancelled = false;
    let intv;

    const session = getSession();
    const token = session?.access_token;
    if (!token) return; // signed out — caller should handle

    const poll = async () => {
      try {
        const res = await fetch(`/api/job-status/${encodeURIComponent(jobId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (res.status === 404) {
          if (intv) clearInterval(intv);
          onMissingRef.current?.();
          setJob(null);
          return;
        }
        if (!res.ok) return; // transient — let next tick retry
        const data = await res.json();
        if (cancelled) return;
        setJob(data);
        if (data.status === "completed" || data.status === "failed") {
          if (intv) clearInterval(intv);
        }
      } catch {
        // network blip — try next tick
      }
    };

    poll();
    intv = setInterval(poll, POLL_INTERVAL_MS);
    return () => { cancelled = true; if (intv) clearInterval(intv); };
  }, [jobId]);

  // Derived values. Memoize so consumers don't re-render every tick when
  // they only care about phase change, not elapsed seconds.
  const derived = useMemo(() => {
    const status = job?.status || null;
    const isPending = status === "pending";
    const isProcessing = status === "processing";
    const isComplete = status === "completed";
    const isFailed = status === "failed";

    const currentPhase = job?.current_phase || null;
    const phaseStamps = job?.phase_timestamps || {};
    const createdAt = job?.created_at ? new Date(job.created_at).getTime() : null;
    const phaseStartedAt = currentPhase && phaseStamps[`${currentPhase}_started_at`]
      ? new Date(phaseStamps[`${currentPhase}_started_at`]).getTime()
      : null;

    const totalElapsed = createdAt ? Math.max(0, Math.floor((now - createdAt) / 1000)) : 0;
    const phaseElapsed = phaseStartedAt ? Math.max(0, Math.floor((now - phaseStartedAt) / 1000)) : null;

    return {
      job,
      status,
      isPending,
      isProcessing,
      isActive: isPending || isProcessing,
      isComplete,
      isFailed,
      currentPhase,
      phaseElapsed,
      totalElapsed,
      extractedData: job?.extracted_data || null,
      validationReport: job?.validation_report || null,
      coverImageUrl: job?.cover_image_url || null,
      fileType: job?.file_type || null,
      extractionMethod: job?.extraction_method || null,
      errorMessage: job?.error_message || null,
      retryCount: job?.retry_count || 0,
    };
  }, [job, now]);

  return derived;
}

// Phase config — copy + reference timings used by the pill UI. Kept in this
// module so the hook stays the single source of truth for phase metadata and
// any future surface (Imports page, admin dashboard) can import the same.
//
// typicalMin/Max are the green-zone bounds in seconds. Above SLOW_THRESHOLD ×
// typicalMax the pill flips to "taking a little longer than usual" copy.
export const PHASE_CONFIG = {
  reading: {
    message: "Bev's reading your pattern",
    typicalMin: 2,
    typicalMax: 5,
  },
  extracting: {
    message: "Bev's untangling the structure",
    typicalMin: 30,
    typicalMax: 90,
  },
  validating: {
    message: "Bev's giving it a once-over",
    typicalMin: 5,
    typicalMax: 15,
  },
  finalizing: {
    message: "Almost done",
    typicalMin: 1,
    typicalMax: 3,
  },
};

export const SLOW_THRESHOLD = 1.2;

// Build the display string for the pill based on current phase + elapsed seconds.
// Returns { message, isSlow }. When currentPhase is null we hand back a generic
// label using totalElapsed so pre-instrumentation / unknown-phase jobs still
// show progress.
export function buildPhaseDisplay(currentPhase, phaseElapsed, totalElapsed) {
  const cfg = currentPhase && PHASE_CONFIG[currentPhase];
  if (!cfg) {
    return {
      message: `Bev's working on it... ${totalElapsed}s`,
      isSlow: false,
    };
  }
  const elapsed = typeof phaseElapsed === "number" ? phaseElapsed : 0;
  const slow = elapsed > cfg.typicalMax * SLOW_THRESHOLD;
  if (slow) {
    return {
      message: `Bev's taking a little longer than usual on this one... ${elapsed}s`,
      isSlow: true,
    };
  }
  return {
    message: `${cfg.message}... ${elapsed}s (usually ${cfg.typicalMin}-${cfg.typicalMax}s)`,
    isSlow: false,
  };
}
