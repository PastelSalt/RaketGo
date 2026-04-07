"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const CLICK_COUNT_KEY = "raketgo_guest_click_count";
const THRESHOLD_KEY = "raketgo_guest_click_threshold";
const TRIGGERED_KEY = "raketgo_guest_nudge_triggered";
const SNOOZE_UNTIL_KEY = "raketgo_guest_nudge_snooze_until";

function readStoredNumber(key: string, fallback: number): number {
  if (typeof window === "undefined") {
    return fallback;
  }

  const parsed = Number(window.localStorage.getItem(key));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveThreshold(): number {
  const current = readStoredNumber(THRESHOLD_KEY, 0);
  if (current >= 5 && current <= 10) {
    return current;
  }

  const generated = Math.floor(Math.random() * 6) + 5;
  window.localStorage.setItem(THRESHOLD_KEY, String(generated));
  return generated;
}

function clearNudgeStorage() {
  if (typeof window === "undefined") {
    return;
  }

  [CLICK_COUNT_KEY, THRESHOLD_KEY, TRIGGERED_KEY, SNOOZE_UNTIL_KEY].forEach((key) => {
    window.localStorage.removeItem(key);
  });
}

interface AuthNudgeDialogProps {
  isAuthenticated: boolean;
}

export function AuthNudgeDialog({ isAuthenticated }: AuthNudgeDialogProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [threshold, setThreshold] = useState(7);

  const isExcludedPath = useMemo(() => {
    return ["/login", "/signup"].some((path) => pathname.startsWith(path));
  }, [pathname]);

  useEffect(() => {
    if (isAuthenticated) {
      clearNudgeStorage();
      setOpen(false);
      setReady(true);
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const nextThreshold = resolveThreshold();
    const nextCount = readStoredNumber(CLICK_COUNT_KEY, 0);
    const triggered =
      window.localStorage.getItem(TRIGGERED_KEY) === "1" || nextCount >= nextThreshold;
    const snoozeUntil = readStoredNumber(SNOOZE_UNTIL_KEY, 0);

    setThreshold(nextThreshold);
    setClickCount(nextCount);
    setOpen(triggered && nextCount >= snoozeUntil && !isExcludedPath);
    setReady(true);
  }, [isAuthenticated, isExcludedPath]);

  useEffect(() => {
    if (!ready || isAuthenticated || isExcludedPath) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || target.closest("[data-auth-nudge='dialog']")) {
        return;
      }

      const nextCount = readStoredNumber(CLICK_COUNT_KEY, 0) + 1;
      const nextThreshold = readStoredNumber(THRESHOLD_KEY, resolveThreshold());
      const snoozeUntil = readStoredNumber(SNOOZE_UNTIL_KEY, 0);

      window.localStorage.setItem(CLICK_COUNT_KEY, String(nextCount));
      setClickCount(nextCount);
      setThreshold(nextThreshold);

      if (nextCount >= nextThreshold) {
        window.localStorage.setItem(TRIGGERED_KEY, "1");
        if (nextCount >= snoozeUntil) {
          setOpen(true);
        }
      }
    };

    document.addEventListener("click", handleClick, { passive: true });
    return () => document.removeEventListener("click", handleClick);
  }, [ready, isAuthenticated, isExcludedPath]);

  useEffect(() => {
    if (!ready || isAuthenticated || isExcludedPath) {
      return;
    }

    const triggered = window.localStorage.getItem(TRIGGERED_KEY) === "1";
    const snoozeUntil = readStoredNumber(SNOOZE_UNTIL_KEY, 0);
    const totalClicks = readStoredNumber(CLICK_COUNT_KEY, 0);

    if (triggered && totalClicks >= snoozeUntil) {
      setOpen(true);
    }
  }, [pathname, ready, isAuthenticated, isExcludedPath]);

  if (!ready || isAuthenticated || isExcludedPath || !open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink p-4">
      <div data-auth-nudge="dialog" className="card w-full max-w-lg space-y-4">
        <div>
          <h2 className="section-title">Create an account to continue</h2>
          <p className="muted mt-2">
            You have explored {clickCount} pages and actions as a guest. Sign in to
            apply to jobs, save listings, and send messages.
          </p>
          <p className="muted mt-1">This prompt appears after around 5 to 10 interactions.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => router.push(`/login?redirect=${encodeURIComponent(pathname)}`)}
          >
            I have an account
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.push("/signup")}
          >
            No account, go to Sign Up
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              const nextSnoozeUntil = readStoredNumber(CLICK_COUNT_KEY, 0) + 3;
              window.localStorage.setItem(SNOOZE_UNTIL_KEY, String(nextSnoozeUntil));
              setOpen(false);
            }}
          >
            Continue browsing
          </button>
        </div>

        <p className="muted">Tip: you can still browse publicly, but account features require sign in.</p>
      </div>
    </div>
  );
}
