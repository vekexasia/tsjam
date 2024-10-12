import {
  Dagger,
  Delta,
  DoubleDagger,
  PVMAccumulationState,
} from "@tsjam/types";
import { newSTF, toDoubleDagger } from "@tsjam/utils";

export const deltaToDoubleDagger = newSTF<
  Dagger<Delta>,
  PVMAccumulationState, // return of `∆+
  DoubleDagger<Delta>
>((input): DoubleDagger<Delta> => {
  // FIXME: this is wrong
  throw new Error("Not implemented");
});
