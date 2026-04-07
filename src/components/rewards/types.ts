export type SpinResponse = {
  success: boolean;
  winner: {
    id: string;
    user_id: string | null;
    prize_id: string;
    prize_label_snapshot: string;
  };
  prize: {
    id: string;
    internal_name: string;
    display_label: string;
    description: string | null;
    segment_color: string | null;
  };
};

export type WheelSegment = {
  id: string;
  shortLabel: string;
  fullLabel: string;
  segmentColor: string;
};
