import { Tagged } from "@/genericTypes.js";

export type RegisterIdentifier = Tagged<
  0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12,
  "regIdentifier",
  { minValue: 0; maxValue: 12 }
>;
