export type WheelPrizeRow = {
  id: string;
  internal_name: string;
  display_label: string;
  description: string | null;
  weight: number;
  is_active: boolean;
  sort_order: number;
  segment_color: string | null;
  starts_at: string | null;
  ends_at: string | null;
  stock_limit: number | null;
  stock_used: number;
  created_at: string;
};

export type WheelWinRow = {
  id: string;
  user_id: string | null;
  phone: string | null;
  email: string | null;
  prize_id: string;
  prize_name_snapshot: string;
  prize_label_snapshot: string;
  weight_snapshot: number;
  won_at: string;
  is_redeemed: boolean;
  redeemed_at: string | null;
  admin_note: string | null;
  created_at: string;
};
