"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef } from "react";

import {
  getSegmentCenterClockwiseFromTop,
  WHEEL_PRIZE_TABLE
} from "@/components/rewards/prizeTable";

const VIEWBOX_SIZE = 100;
const CENTER = VIEWBOX_SIZE / 2;
const WHEEL_RADIUS = VIEWBOX_SIZE / 2;
const LABEL_RADIUS = WHEEL_RADIUS * 0.68;
const SEGMENT_ANGLE = 360 / WHEEL_PRIZE_TABLE.length;
const BASE_SEGMENT_COLORS = ["#5B2E8F", "#7B4DFF", "#9A6CFF", "#5B2E8F", "#7B4DFF", "#9A6CFF"];

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
}) {
  const centerFromTop = getSegmentCenterClockwiseFromTop(params.winningSegmentIndex);
  const alignDeg = (360 - centerFromTop + 360) % 360;

  const fullTurns = 2 + (Math.abs(params.spinSeed) % 2);
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
}) {
  /** Total rotation after the last completed spin (for cumulative spins). */
  const lastSettledRotationRef = useRef(0);
  const targetRotationRef = useRef(0);
  /** Cache so we do not recompute (and add more turns) on re-renders with the same spin. */
  const spinKeyRef = useRef<string | null>(null);

  const targetRotation = useMemo(() => {
    if (props.winningSegmentIndex === null) {
      spinKeyRef.current = null;
      lastSettledRotationRef.current = 0;
      targetRotationRef.current = 0;
      return 0;
    }

    const key = `${props.winningSegmentIndex}-${props.spinSeed}`;
    if (spinKeyRef.current === key) {
      return targetRotationRef.current;
    }

    spinKeyRef.current = key;
    const next = computeNextRotation({
      previousTotalRotation: lastSettledRotationRef.current,
      winningSegmentIndex: props.winningSegmentIndex,
      spinSeed: props.spinSeed
    });
    targetRotationRef.current = next;
    return next;
  }, [props.winningSegmentIndex, props.spinSeed]);

  useEffect(() => {
    if (!props.spinning && props.winningSegmentIndex !== null) {
      lastSettledRotationRef.current = targetRotationRef.current;
    }
  }, [props.spinning, props.winningSegmentIndex]);

  const rotation = props.winningSegmentIndex === null ? 0 : targetRotation;
  const trackBackground = useMemo(() => {
    const colors = [...BASE_SEGMENT_COLORS];
    if (props.highlightWinner && props.winningSegmentIndex !== null) {
      colors[props.winningSegmentIndex] = "#1ED760";
    }

    const stops = colors
      .map((color, index) => {
        const start = index * SEGMENT_ANGLE;
        const end = start + SEGMENT_ANGLE;
        return `${color} ${start}deg ${end}deg`;
      })
      .join(", ");

    return `conic-gradient(from 0deg at 50% 50%, ${stops})`;
  }, [props.highlightWinner, props.winningSegmentIndex]);

  return (
    <div className="wheel-root">
      <div className="wheel-pointer-wrap" aria-hidden>
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
          {WHEEL_PRIZE_TABLE.map((segment, index) => {
            const segmentAngle = 360 / WHEEL_PRIZE_TABLE.length;
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
