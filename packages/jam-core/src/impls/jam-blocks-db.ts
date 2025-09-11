import { IdentityMap } from "@/data-structures/identity-map";
import { HeaderHash } from "@tsjam/types";
import { AppliedBlock } from "./jam-block-impl";

export class JamBlocksDB {
  #fakeDB: IdentityMap<HeaderHash, 32, AppliedBlock> = new IdentityMap();
  async fromHeaderHash(
    headerHash: HeaderHash,
  ): Promise<AppliedBlock | undefined> {
    return this.#fakeDB.get(headerHash);
  }

  async save(block: AppliedBlock) {
    this.#fakeDB.set(block.header.signedHash(), block);
  }

  async purge(headerHash: HeaderHash) {
    this.#fakeDB.delete(headerHash);
  }
}
