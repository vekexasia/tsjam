import { IdentityMap } from "@/data-structures/identity-map";
import { HeaderHash } from "@tsjam/types";
import { AppliedBlock } from "./jam-block-impl";

export class JamBlocksDB {
  #fakeDB: IdentityMap<HeaderHash, 32, AppliedBlock> = new IdentityMap();
  #sonsDB: IdentityMap</* parent hash*/ HeaderHash, 32, HeaderHash> =
    new IdentityMap();
  async fromHeaderHash(
    headerHash: HeaderHash,
  ): Promise<AppliedBlock | undefined> {
    return this.#fakeDB.get(headerHash);
  }

  async save(block: AppliedBlock) {
    const hash = block.header.signedHash();
    this.#sonsDB.set(block.header.parent, hash);
    this.#fakeDB.set(hash, block);
  }

  async purge(headerHash: HeaderHash) {
    this.#fakeDB.delete(headerHash);
  }

  async sonOf(block: AppliedBlock): Promise<AppliedBlock | undefined> {
    const p = this.#sonsDB.get(block.header.signedHash());
    if (typeof p === "undefined") {
      return undefined;
    }
    return this.#fakeDB.get(p);
  }
}
