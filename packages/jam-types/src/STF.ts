/**
 * Defines the RAW state transition function
 */
export interface RAWSTF<State, Input, PState> {
  /**
   * Performs static checks over the input. if valid, it returns the manipulated input
   * @param curState - the state before applying the input
   * @param input - the input to be validated
   * @throws Error if the input is not valid
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
   * @throws Error if the p_state is not valid
   */
  assertPStateValid(input: Input, p_state: PState, curState: State): void;
}
