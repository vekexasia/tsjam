import { Posterior, RAWSTF } from "@vekexasia/jam-types";

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
