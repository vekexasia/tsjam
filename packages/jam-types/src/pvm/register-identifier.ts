import { Tagged } from "@/generic-types";

export type RegisterIdentifier = Tagged<
  0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12,
  "regIdentifier",
  { minValue: 0; maxValue: 12 }
>;

export type SingleRegisterIdentifier<
  T extends 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12,
> = Tagged<T, "regIdentifier", { minValue: 0; maxValue: 12 }>;
