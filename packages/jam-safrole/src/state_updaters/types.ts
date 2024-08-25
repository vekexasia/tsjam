import { SafroleState } from "@/index.js";

export type TauTransition = {
  curTau: SafroleState["tau"];
  nextTau: SafroleState["tau"];
};
