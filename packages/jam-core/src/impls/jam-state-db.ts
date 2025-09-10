import { IdentityMap } from "@/data-structures/identity-map";
import { HeaderHash } from "@tsjam/types";
import assert from "assert";
import { JamStateImpl } from "./jam-state-impl";

export class JamStateDataBase {
  #fakeDB: IdentityMap<HeaderHash, 32, JamStateImpl> = new IdentityMap();
  async fromHeaderHash(
    headerHash: HeaderHash,
  ): Promise<JamStateImpl | undefined> {
    return this.#fakeDB.get(headerHash);
  }

  async save(state: JamStateImpl) {
    assert(state.block); // block must exist
    this.#fakeDB.set(state.block.header.signedHash(), state);
  }

  async purge(headerHash: HeaderHash) {
    this.#fakeDB.delete(headerHash);
  }
}
