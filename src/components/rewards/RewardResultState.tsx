import { Wheel } from "@/components/rewards/Wheel";
import { getPrizeBySegmentIndex } from "@/components/rewards/prizeTable";

export function RewardResultState(props: {
  winningSegmentIndex: number;
  spinSeed: number;
  onContinue: () => void;
}) {
  const wonPrize = getPrizeBySegmentIndex(props.winningSegmentIndex);

  return (
    <>
      <p className="wheel-eyebrow">გილოცავთ</p>
      <h2>VIP კურსი გააქტიურდა</h2>
      <p className="wheel-subheadline">
        გილოცავთ! მოგებული პრიზი დაემატა თქვენს პირად კაბინეტს.
      </p>
      <p className="wheel-prize-value">{wonPrize.fullLabel}</p>
      <div className="wheel-stage is-success">
        <Wheel
          spinning={false}
          winningSegmentIndex={props.winningSegmentIndex}
          spinSeed={props.spinSeed}
          highlightWinner
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
