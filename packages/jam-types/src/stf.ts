import { Result } from "neverthrow";
import { Posterior } from "./generic-types";

/**
 * Defines the state transition function
 */
export type STF<State, Input, Errors, PState = Posterior<State>> = (
  input: Input,
  curState: State,
) => Result<PState, Errors>;
