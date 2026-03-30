import type { ReactNode } from "react";

export function RewardModalShell(props: {
  children: ReactNode;
  onClose: () => void;
  closeDisabled?: boolean;
}) {
  return (
    <div className="wheel-modal-overlay">
      <div className="wheel-modal-card" role="dialog" aria-modal="true">
        <button
          className="wheel-close"
          aria-label="დახურვა"
          onClick={props.onClose}
          disabled={props.closeDisabled}
        >
          ×
        </button>
        {props.children}
      </div>
    </div>
  );
}
