"use client";

import { useEffect, useRef, useState } from "react";

import { RewardIntroState } from "@/components/rewards/RewardIntroState";
import { RewardModalShell } from "@/components/rewards/RewardModalShell";
import { RewardResultState } from "@/components/rewards/RewardResultState";
import { getPrizeIndexFromSpin } from "@/components/rewards/prizeTable";
import type { SpinResponse } from "@/components/rewards/types";

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
    const demoTiers: Array<SpinResponse["rewardTier"]> = ["vip", "vip_plus", "vip_max"];
    const tier = demoTiers[Math.floor(Math.random() * demoTiers.length)];
    const index = getPrizeIndexFromSpin({ rewardTier: tier, spinSeed: nextSeed });

    setWinningSegmentIndex(index);
    setSpinning(true);

    if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    spinTimeoutRef.current = setTimeout(() => {
      setSpinning(false);
      setSpinCompleted(true);
      spinTimeoutRef.current = null;
    }, SPIN_MS);
  }

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
    const nextSeed = spinSeed + 1;
    setSpinSeed(nextSeed);

    if (previewMode) {
      resolvePreviewSpin(nextSeed);
      return;
    }

    try {
      const response = await fetch("/api/rewards/spin-registration-wheel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: props.registeredUserId ?? null
        })
      });
      const payload = (await response.json()) as SpinResponse & { code?: string };
      if (!response.ok || !payload.success) {
        throw new Error(payload.code ?? "SPIN_FAILED");
      }
      const index = getPrizeIndexFromSpin({
        rewardTier: payload.rewardTier,
        spinSeed: nextSeed
      });
      setWinningSegmentIndex(index);
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
              errorMessage={errorMessage}
              spinButtonRef={spinButtonRef}
              onSpin={handleSpin}
              onDismiss={closeBeforeSpin}
            />
          ) : winningSegmentIndex !== null ? (
            <RewardResultState
              winningSegmentIndex={winningSegmentIndex}
              spinSeed={spinSeed}
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
