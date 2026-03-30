import { Wheel } from "@/components/rewards/Wheel";
import { getPrizeBySegmentIndex } from "@/components/rewards/prizeTable";

export function RewardResultState(props: {
  winningSegmentIndex: number;
  spinSeed: number;
  onStartConversion: () => void;
  onLater: () => void;
}) {
  const wonPrize = getPrizeBySegmentIndex(props.winningSegmentIndex);

  return (
    <>
      <p className="wheel-eyebrow">გილოცავთ</p>
      <h2>VIP კურსი გააქტიურდა</h2>
      <p className="wheel-subheadline">
        გამოიყენე სპეციალური კურსი მომდევნო 7 დღის განმავლობაში
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
        <button className="wheel-primary" onClick={props.onStartConversion}>
          დაიწყე კონვერტაცია
        </button>
        <button className="wheel-secondary" onClick={props.onLater}>
          მოგვიანებით
        </button>
      </div>
    </>
  );
}
