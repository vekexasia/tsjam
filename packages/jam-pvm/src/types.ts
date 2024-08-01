import { Tagged } from "@vekexasia/jam-types";

export type RegisterIdentifier = Tagged<
  number,
  "regIdentifier",
  { minValue: 0; maxValue: 12 }
>;
