import { Posterior } from "@/genericTypes.js";

export interface STF<State, Input, DependencyState> {
  /**
   * Performs static checks over the input. if valid, it returns the manipulated input
   * @param curState - the state before applying the input
   * @param dependencyState - the state that the state transition function depends on
   * @param input - the input to be validated
   * @throws {Error} if the input is not valid
   */
  assertInputValid(
    curState: State,
    dependencyState: DependencyState,
    input: Input,
  ): void;

  /**
   * Applies the input to the state
   * no checks are performed
   * @param curState - the state before applying the input
   * @param dependencyState - the state that the state transition function depends on
   * @param input - the input to be applied
   * @returns the new state
   */
  apply(
    curState: State,
    dependencyState: DependencyState,
    input: Input,
  ): Posterior<State>;

  /**
   * Asserts that the posterior state is valid
   * @param curState - the state from which we transitioned from
   * @param p_state - the state after applying the input
   * @param input - the input that was applied
   * @throws {Error} if the p_state is not valid
   */
  assertPStateValid(
    curState: State,
    p_state: Posterior<State>,
    input: Input,
  ): void;

  /**
   * Rolls back the state to the previous state
   * @param p_state - the state after applying the input
   * @param dependencyState - the state that the state transition function depends on
   * @param input - the input that was applied
   * @returns the original state after applying the input
   */
  rollback(
    p_state: Posterior<State>,
    dependencyState: DependencyState,
    input: Input,
  ): State;
}
