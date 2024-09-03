import { SafroleState } from "@vekexasia/jam-types";

export type TauTransition = {
  curTau: SafroleState["tau"];
  nextTau: SafroleState["tau"];
};
