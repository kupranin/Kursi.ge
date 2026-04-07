"use client";

import { useEffect, useRef, useState } from "react";

import { RewardIntroState } from "@/components/rewards/RewardIntroState";
import { RewardModalShell } from "@/components/rewards/RewardModalShell";
import { RewardResultState } from "@/components/rewards/RewardResultState";
import type { SpinResponse, WheelSegment } from "@/components/rewards/types";

const SPIN_MS = 2200;

export function RegistrationWheelModal(props: {
  onDone: () => void;
  forceOpen?: boolean;
  registeredUserId?: string;
}) {
  const forcePreview = props.forceOpen === true;
  const [demoMode, setDemoMode] = useState(false);
  const previewMode =
    demoMode || forcePreview || process.env.NODE_ENV === "development";
  const [open, setOpen] = useState(forcePreview);
  const [dismissedBeforeSpin, setDismissedBeforeSpin] = useState(false);
  const [loadingEligibility, setLoadingEligibility] = useState(!forcePreview);
  const [spinning, setSpinning] = useState(false);
  const [spinSeed, setSpinSeed] = useState(0);
  const [winningSegmentIndex, setWinningSegmentIndex] = useState<number | null>(null);
  const [wonPrizeLabel, setWonPrizeLabel] = useState("");
  const [segments, setSegments] = useState<WheelSegment[]>([]);
  const [spinCompleted, setSpinCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const spinButtonRef = useRef<HTMLButtonElement>(null);
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasDemo = new URLSearchParams(window.location.search).get("demoWheel") === "1";
    setDemoMode(hasDemo);
  }, []);

  useEffect(() => {
    if (previewMode) {
      setOpen(true);
      setLoadingEligibility(false);
      setDismissedBeforeSpin(false);
      return;
    }

    let active = true;
    async function checkEligibility() {
      try {
        const response = await fetch("/api/rewards/wheel-eligibility");
        const payload = await response.json();
        if (!active) return;
        const eligible = Boolean(payload.eligible);
        setOpen(eligible);
        setDismissedBeforeSpin(false);
      } catch {
        if (!active) return;
        setOpen(false);
      } finally {
        if (!active) return;
        setLoadingEligibility(false);
      }
    }
    checkEligibility();
    return () => {
      active = false;
    };
  }, [previewMode]);

  useEffect(() => {
    if (!open) {
      setWinningSegmentIndex(null);
      setWonPrizeLabel("");
      setSpinCompleted(false);
      setSpinning(false);
      setErrorMessage("");
      setSpinSeed(0);
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
        spinTimeoutRef.current = null;
      }
    }
  }, [open]);

  function resolvePreviewSpin(nextSeed: number) {
    if (segments.length === 0) return;
    const index = Math.floor(Math.random() * segments.length);

    setWinningSegmentIndex(index);
    setWonPrizeLabel(segments[index].fullLabel);
    setSpinning(true);

    if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    spinTimeoutRef.current = setTimeout(() => {
      setSpinning(false);
      setSpinCompleted(true);
      spinTimeoutRef.current = null;
    }, SPIN_MS);
  }

  useEffect(() => {
    let active = true;
    async function loadSegments() {
      try {
        const response = await fetch("/api/wheel/prizes");
        const payload = await response.json();
        if (!response.ok || !active) return;
        const dbSegments = (payload.prizes ?? []).slice(0, 12).map((prize: any) => ({
          id: String(prize.id),
          shortLabel: String(prize.display_label),
          fullLabel: String(prize.display_label),
          segmentColor: String(prize.segment_color ?? "#7B4DFF")
        })) as WheelSegment[];
        setSegments(dbSegments);
      } catch {
        if (!active) return;
        setSegments([]);
      }
    }
    void loadSegments();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!open || spinCompleted) return;
    spinButtonRef.current?.focus();
  }, [open, spinCompleted]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || spinning || spinCompleted || !open) return;
      setOpen(false);
      setDismissedBeforeSpin(true);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, spinning, spinCompleted]);

  async function handleSpin() {
    setErrorMessage("");
    if (segments.length === 0) {
      setErrorMessage("პრიზები დროებით მიუწვდომელია");
      return;
    }
    const nextSeed = spinSeed + 1;
    setSpinSeed(nextSeed);

    if (previewMode) {
      resolvePreviewSpin(nextSeed);
      return;
    }

    try {
      const response = await fetch("/api/wheel/spin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: props.registeredUserId ?? null
        })
      });
      const payload = (await response.json()) as SpinResponse & { error?: string };
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "SPIN_FAILED");
      }
      const index = segments.findIndex((segment) => segment.id === payload.prize.id);
      if (index < 0) throw new Error("PRIZE_NOT_IN_WHEEL");
      setWinningSegmentIndex(index);
      setWonPrizeLabel(payload.prize.display_label);
      setSpinning(true);

      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
      spinTimeoutRef.current = setTimeout(() => {
        setSpinning(false);
        setSpinCompleted(true);
        spinTimeoutRef.current = null;
      }, SPIN_MS);
    } catch {
      if (previewMode) {
        resolvePreviewSpin(nextSeed);
        return;
      }
      setSpinning(false);
      setErrorMessage("გთხოვთ სცადოთ თავიდან");
    }
  }

  if (loadingEligibility) return null;

  const showReturnTrigger = dismissedBeforeSpin && !spinCompleted;

  function closeBeforeSpin() {
    setOpen(false);
    setDismissedBeforeSpin(true);
  }

  return (
    <>
      {open ? (
        <RewardModalShell onClose={closeBeforeSpin} closeDisabled={spinning}>
          {!spinCompleted ? (
            <RewardIntroState
              spinning={spinning}
              winningSegmentIndex={winningSegmentIndex}
              spinSeed={spinSeed}
              segments={segments}
              errorMessage={errorMessage}
              spinButtonRef={spinButtonRef}
              onSpin={handleSpin}
              onDismiss={closeBeforeSpin}
            />
          ) : winningSegmentIndex !== null ? (
            <RewardResultState
              winningSegmentIndex={winningSegmentIndex}
              spinSeed={spinSeed}
              wonPrizeLabel={wonPrizeLabel}
              segments={segments}
              onContinue={() => {
                setOpen(false);
                props.onDone();
                window.location.href = "https://kursi.ge/ka/";
              }}
            />
          ) : null}
        </RewardModalShell>
      ) : null}
      {showReturnTrigger ? (
        <button
          className="wheel-return-trigger"
          onClick={() => {
            setOpen(true);
            setDismissedBeforeSpin(false);
          }}
        >
          გააქტიურე VIP კურსი
        </button>
      ) : null}
    </>
  );
}
