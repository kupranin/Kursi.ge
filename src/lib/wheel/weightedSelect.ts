export type WeightedItem<T> = {
  item: T;
  weight: number;
};

export function weightedSelect<T>(items: Array<WeightedItem<T>>, seed = Math.random()): T {
  if (items.length === 0) {
    throw new Error("Cannot select from empty weighted list");
  }

  const totalWeight = items.reduce((sum, current) => sum + current.weight, 0);
  if (totalWeight <= 0) {
    throw new Error("Total weight must be positive");
  }

  let cursor = seed * totalWeight;
  for (const current of items) {
    cursor -= current.weight;
    if (cursor <= 0) {
      return current.item;
    }
  }

  return items[items.length - 1].item;
}
