import { Posterior } from "@/genericTypes.js";

export interface RAWSTF<State, Input, PState> {
  /**
   * Performs static checks over the input. if valid, it returns the manipulated input
   * @param curState - the state before applying the input
   * @param input - the input to be validated
   * @throws {Error} if the input is not valid
   */
  assertInputValid(input: Input, curState: State): void;

  /**
   * Applies the input to the state
   * no checks are performed
   * @param curState - the state before applying the input
   * @param input - the input to be applied
   * @returns the new state
   */
  apply(input: Input, curState: State): PState;

  /**
   * Asserts that the posterior state is valid
   * @param curState - the state from which we transitioned from
   * @param p_state - the state after applying the input
   * @param input - the input that was applied
   * @throws {Error} if the p_state is not valid
   */
  assertPStateValid(input: Input, p_state: PState, curState: State): void;
}

export class BaseSTF<State, Input, PState = Posterior<State>> {
  constructor(private innerSTF: RAWSTF<State, Input, PState>) {}

  /**
   * Applies the input to the state
   * it first asserts that the input is valid
   * then applies the input
   * then asserts that the posterior state is valid
   * using the innerSTF
   * @param curState - the state before applying the input
   * @param input - the input to be applied
   * @returns the new state
   */
  apply(input: Input, curState: State): PState {
    this.innerSTF.assertInputValid(input, curState);
    const p_state = this.innerSTF.apply(input, curState);
    this.innerSTF.assertPStateValid(input, p_state, curState);
    return p_state;
  }
}

export const newSTF = <State, Input, PState = Posterior<State>>(
  inner: RAWSTF<State, Input, PState> | ((i: Input, s: State) => PState),
) => {
  if (typeof inner === "function") {
    // we just need to apply the function
    return new BaseSTF({
      assertInputValid() {},
      assertPStateValid() {},
      apply: inner,
    });
  }
  return new BaseSTF(inner);
};
