"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import { useEffect, useMemo, useRef } from "react";

import {
  KICKOFF_TURNS,
  MAX_FULL_TURNS,
  MIN_FULL_TURNS,
  SPIN_DURATION_MS,
  SPIN_EASING
} from "@/components/rewards/spinConfig";
import type { WheelSegment } from "@/components/rewards/types";

const VIEWBOX_SIZE = 100;
const CENTER = VIEWBOX_SIZE / 2;
const WHEEL_RADIUS = VIEWBOX_SIZE / 2;
const LABEL_RADIUS = WHEEL_RADIUS * 0.68;

function splitIntoBalancedLines(label: string) {
  const words = label.trim().split(/\s+/);
  if (words.length <= 1) return [label];

  const midpoint = Math.ceil(words.length / 2);
  const line1 = words.slice(0, midpoint).join(" ");
  const line2 = words.slice(midpoint).join(" ");
  return [line1, line2];
}

/**
 * Top pointer fixed. Disc rotates clockwise by θ (CSS).
 * Slice midpoint sits at clockwise angle `centerFromTop` on the disc (0° = top, matches conic-gradient).
 * Need: (centerFromTop + θ) mod 360 = 0  ⇒  θ ≡ (360 − centerFromTop) mod 360.
 *
 * Each spin: previousTotal + (2 or 3)×360 + twist, where twist ∈ [0,360) aligns the final remainder.
 */
function computeNextRotation(params: {
  previousTotalRotation: number;
  winningSegmentIndex: number;
  spinSeed: number;
  segmentCount: number;
}) {
  const slice = 360 / params.segmentCount;
  const centerFromTop = params.winningSegmentIndex * slice + slice / 2;
  const alignDeg = (360 - centerFromTop + 360) % 360;

  const turnSpan = MAX_FULL_TURNS - MIN_FULL_TURNS + 1;
  const fullTurns = MIN_FULL_TURNS + (Math.abs(params.spinSeed) % turnSpan);
  const extraSpin = 360 * fullTurns;

  const currentMod = ((params.previousTotalRotation % 360) + 360) % 360;
  const twist = (alignDeg - currentMod + 360) % 360;

  return params.previousTotalRotation + extraSpin + twist;
}

export function Wheel(props: {
  spinning: boolean;
  winningSegmentIndex: number | null;
  highlightWinner?: boolean;
  spinSeed: number;
  segments: WheelSegment[];
}) {
  /** Total rotation after the last completed spin (for cumulative spins). */
  const lastSettledRotationRef = useRef(0);
  const targetRotationRef = useRef(0);
  const kickoffSpinSeedRef = useRef<number | null>(null);
  /** Cache so we do not recompute (and add more turns) on re-renders with the same spin. */
  const spinKeyRef = useRef<string | null>(null);
  const deltaRotationRef = useRef(0);

  const targetRotation = useMemo(() => {
    if (props.winningSegmentIndex === null) {
      spinKeyRef.current = null;
      if (props.spinning) {
        if (kickoffSpinSeedRef.current !== props.spinSeed) {
          kickoffSpinSeedRef.current = props.spinSeed;
          // Immediate visual motion while waiting for backend winner response.
          targetRotationRef.current = lastSettledRotationRef.current + 360 * KICKOFF_TURNS;
          deltaRotationRef.current = 360 * KICKOFF_TURNS;
        }
        return targetRotationRef.current;
      }
      kickoffSpinSeedRef.current = null;
      targetRotationRef.current = lastSettledRotationRef.current;
      return lastSettledRotationRef.current;
    }

    kickoffSpinSeedRef.current = null;
    const key = `${props.winningSegmentIndex}-${props.spinSeed}`;
    if (spinKeyRef.current === key) {
      return targetRotationRef.current;
    }

    spinKeyRef.current = key;
    const next = computeNextRotation({
      // If kickoff rotation already started, continue forward from that target.
      previousTotalRotation: Math.max(lastSettledRotationRef.current, targetRotationRef.current),
      winningSegmentIndex: props.winningSegmentIndex,
      spinSeed: props.spinSeed,
      segmentCount: props.segments.length
    });
    targetRotationRef.current = next;
    deltaRotationRef.current = Math.max(0, next - lastSettledRotationRef.current);
    return next;
  }, [props.winningSegmentIndex, props.spinSeed, props.segments.length]);

  useEffect(() => {
    if (!props.spinning && props.winningSegmentIndex !== null) {
      lastSettledRotationRef.current = targetRotationRef.current;
    }
  }, [props.spinning, props.winningSegmentIndex]);

  const rotation = targetRotation;
  const segmentAngle = props.segments.length > 0 ? 360 / props.segments.length : 360;
  const plannedTickCount = Math.max(8, Math.round(deltaRotationRef.current / segmentAngle));
  const tickMs = Math.max(46, Math.round(SPIN_DURATION_MS / plannedTickCount));

  useEffect(() => {
    if (!props.spinning || typeof window === "undefined") return;
    const id = window.setInterval(() => {
      window.dispatchEvent(
        new CustomEvent("wheel:pointer-tick", {
          detail: { spinSeed: props.spinSeed }
        })
      );
    }, tickMs);
    return () => window.clearInterval(id);
  }, [props.spinning, props.spinSeed, tickMs]);
  const trackBackground = useMemo(() => {
    const colors = props.segments.map((segment) => segment.segmentColor);
    if (props.highlightWinner && props.winningSegmentIndex !== null) {
      colors[props.winningSegmentIndex] = "#1ED760";
    }

    const stops = colors
      .map((color, index) => {
        const start = index * segmentAngle;
        const end = start + segmentAngle;
        return `${color} ${start}deg ${end}deg`;
      })
      .join(", ");

    return `conic-gradient(from 0deg at 50% 50%, ${stops})`;
  }, [props.highlightWinner, props.winningSegmentIndex, props.segments, segmentAngle]);

  const wheelStyle = {
    "--wheel-spin-duration": `${SPIN_DURATION_MS}ms`,
    "--wheel-spin-ease": SPIN_EASING,
    "--wheel-pointer-tick-ms": `${tickMs}ms`
  } as CSSProperties;

  return (
    <div className={`wheel-root ${props.highlightWinner ? "wheel-root--win-flash" : ""}`} style={wheelStyle}>
      <div className={`wheel-pointer-wrap ${props.spinning ? "is-ticking" : ""}`} aria-hidden>
        <div className="wheel-pointer-glow" />
        <div className="wheel-pointer" />
      </div>
      <div className="wheel-glow" aria-hidden />
      <div
        className={`wheel-disc ${props.highlightWinner ? "winner-highlight" : ""} ${
          props.spinning ? "wheel-disc--spinning" : ""
        }`}
        style={{
          transform: `rotate(${rotation}deg)`
        }}
      >
        <div className="wheel-track" style={{ background: trackBackground }} />
        <div className="wheel-inner-depth" aria-hidden />
        <div className="wheel-segment-lines" aria-hidden />
        <div className="wheel-surface-gloss" aria-hidden />
        <div className="wheel-top-sheen" aria-hidden />
        <svg className="wheel-label-layer" viewBox="0 0 100 100" aria-hidden>
          {props.segments.map((segment, index) => {
            const startAngle = index * segmentAngle - 90;
            const midAngle = startAngle + segmentAngle / 2;
            const shouldFlip = midAngle > 90 && midAngle < 270;
            const lines = splitIntoBalancedLines(segment.shortLabel);

            return (
              <g
                key={segment.id}
                transform={`translate(${CENTER} ${CENTER}) rotate(${midAngle}) translate(${LABEL_RADIUS} 0) rotate(${shouldFlip ? 180 : 0})`}
              >
                <text
                  className="wheel-svg-label"
                  x={0}
                  y={0}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {lines.map((line, lineIndex) => (
                    <tspan
                      key={`${segment.id}-${lineIndex}`}
                      x={0}
                      dy={lineIndex === 0 ? (lines.length > 1 ? "-0.45em" : "0") : "1em"}
                    >
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="wheel-center-halo" aria-hidden />
        <div
          className={`wheel-center-cap ${props.spinning ? "wheel-center-cap--spinning" : ""}`}
        >
          <Image
            src="/kursi-wheel-logo.png"
            alt="Kursi.ge"
            width={78}
            height={78}
            className="wheel-center-logo"
            priority
          />
        </div>
      </div>
    </div>
  );
}
