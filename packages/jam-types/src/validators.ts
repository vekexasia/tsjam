import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { SeqOfLength } from "./generic-types";
import { ValidatorData } from "./validator-data";

/**
 * Used in state and safrole to define a set of V long validators
 */
export type Validators = {
  elements: SeqOfLength<ValidatorData, typeof NUMBER_OF_VALIDATORS>;
};
