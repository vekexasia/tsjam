import { err, ok, Result } from "neverthrow";
import { JamBlockImpl } from "./jam-block-impl";
import { JamStateDataBase } from "./jam-state-db";
import { JamStateImpl } from "./jam-state-impl";
import assert from "assert";

export class ChainManager {
  #lastState: JamStateImpl | undefined;
  #stateDB!: JamStateDataBase;

  constructor() {}

  async init() {
    this.#stateDB = new JamStateDataBase();
  }

  get lastState(): JamStateImpl {
    assert(typeof this.#lastState !== "undefined");
    return this.#lastState!;
  }

  get stateDB() {
    return this.#stateDB;
  }

  async setGenesis(state: JamStateImpl) {
    await this.#stateDB.save(state);
    this.#lastState = state;
  }

  async handleIncomingBlock(
    block: JamBlockImpl,
  ): Promise<Result<JamStateImpl, unknown>> {
    const parentState = await this.#stateDB.fromHeaderHash(block.header.parent);
    if (typeof parentState === "undefined") {
      return err(
        new Error(
          `Cannot find provided parent header ${block.header.parent.toString("utf8")}`,
        ),
      );
    }

    if (parentState.slot.value !== this.#lastState?.slot.value) {
      // we are forking handle it here
      console.log("forking");
    }

    const res = parentState.applyBlock(block);
    if (res.isErr()) {
      return err(res.error);
    }

    await this.#stateDB.save(res.value);
    this.#lastState = res.value;
    return ok(res.value);
  }
}
