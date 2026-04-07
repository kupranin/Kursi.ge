import type { RefObject } from "react";

import { Wheel } from "@/components/rewards/Wheel";
import type { WheelSegment } from "@/components/rewards/types";

export function RewardIntroState(props: {
  spinning: boolean;
  winningSegmentIndex: number | null;
  spinSeed: number;
  segments: WheelSegment[];
  errorMessage: string;
  spinButtonRef: RefObject<HTMLButtonElement | null>;
  onSpin: () => void;
  onDismiss: () => void;
}) {
  return (
    <>
      <h2 className="wheel-title">საუკეთესო კურსების ბორბალი</h2>
      <p className="wheel-subheadline wheel-subheadline--intro">
        დარეგისტრირდი 20 აპრილამდე და მიიღე ამ თვის საუკეთესო კურსებიდან ერთ-ერთი
      </p>
      <div className={`wheel-stage ${props.spinning ? "is-spinning" : ""}`}>
        <Wheel
          spinning={props.spinning}
          winningSegmentIndex={props.winningSegmentIndex}
          spinSeed={props.spinSeed}
          highlightWinner={false}
          segments={props.segments}
        />
      </div>
      <div className="wheel-actions">
        <button
          ref={props.spinButtonRef}
          className="wheel-primary"
          onClick={props.onSpin}
          disabled={props.spinning}
        >
          {props.spinning ? "იტრიალებს..." : "დაატრიალე"}
        </button>
        {!props.spinning ? (
          <button className="wheel-secondary" onClick={props.onDismiss}>
            მოგვიანებით
          </button>
        ) : null}
      </div>
      <p className="wheel-note">ერთჯერადი შეთავაზება ახალი მომხმარებლისთვის</p>
      {props.errorMessage ? <small>{props.errorMessage}</small> : null}
    </>
  );
}
