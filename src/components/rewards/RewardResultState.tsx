import { Wheel } from "@/components/rewards/Wheel";
import type { WheelSegment } from "@/components/rewards/types";

export function RewardResultState(props: {
  winningSegmentIndex: number;
  spinSeed: number;
  wonPrizeLabel: string;
  segments: WheelSegment[];
  onContinue: () => void;
}) {
  return (
    <>
      <p className="wheel-eyebrow">გილოცავთ</p>
      <h2>VIP კურსი გააქტიურდა</h2>
      <p className="wheel-subheadline">
        გილოცავთ! მოგებული პრიზი დაემატა თქვენს პირად კაბინეტს.
      </p>
      <p className="wheel-prize-value">{props.wonPrizeLabel}</p>
      <div className="wheel-stage is-success">
        <Wheel
          spinning={false}
          winningSegmentIndex={props.winningSegmentIndex}
          spinSeed={props.spinSeed}
          highlightWinner
          segments={props.segments}
        />
      </div>
      <div className="wheel-actions">
        <button className="wheel-primary" onClick={props.onContinue}>
          გადადი Kursi.ge-ზე
        </button>
      </div>
    </>
  );
}
