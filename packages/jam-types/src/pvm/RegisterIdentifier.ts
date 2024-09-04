import { Tagged } from "@/genericTypes.js";

export type RegisterIdentifier = Tagged<
  number,
  "regIdentifier",
  { minValue: 0; maxValue: 12 }
>;
