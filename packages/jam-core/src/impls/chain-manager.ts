import { IdentityMap } from "@/data-structures/identity-map";
import { HeaderHash } from "@tsjam/types";
import assert from "assert";
import { err, ok, Result } from "neverthrow";
import { ApplyBlockErrors } from "..";
import { AppliedBlock, JamBlockImpl } from "./jam-block-impl";
import { JamBlocksDB } from "./jam-blocks-db";
import { HeaderValidationError } from "./jam-signed-header-impl";

/**
 * Eventually Grandpa
 * actually handles this
 * - finalizedBlock = bestBlock -1
 * - a fork can happen on bestBlock
 * - as soon one of the multiple forks gets a new block added, the other forks are discarded
 */
export class ChainManager {
  #bestBlock!: AppliedBlock;
  #finalizedBlock!: AppliedBlock;
  /**
   * keeps only finalized blocks
   */
  #finalizedBlocksDB: JamBlocksDB;

  unfinalizedBlocks: IdentityMap<HeaderHash, 32, AppliedBlock> =
    new IdentityMap();

  private constructor(genesis: AppliedBlock) {
    this.#finalizedBlocksDB = new JamBlocksDB();
    this.#bestBlock = genesis;
    this.#finalizedBlock = genesis; // the only case where finalized === best
  }

  static async build(genesis: AppliedBlock) {
    const toRet = new ChainManager(genesis);
    await toRet.#finalizedBlocksDB.save(genesis);
    return toRet;
  }

  get finalizedBlock(): AppliedBlock {
    assert(typeof this.#finalizedBlock !== "undefined");
    return this.#finalizedBlock!;
  }

  get bestBlock(): AppliedBlock {
    assert(typeof this.#bestBlock !== "undefined");
    return this.#bestBlock!;
  }

  get blocksDB() {
    return this.#finalizedBlocksDB;
  }

  async handleIncomingBlock(
    block: JamBlockImpl,
  ): Promise<
    Result<
      AppliedBlock,
      ApplyBlockErrors | HeaderValidationError | ChainManagerErrorCodes
    >
  > {
    let parentBlock = this.unfinalizedBlocks.get(block.header.parent);
    if (typeof parentBlock === "undefined") {
      // check from the finalized blocks in db
      parentBlock = await this.#finalizedBlocksDB.fromHeaderHash(
        block.header.parent,
      );
    }
    if (typeof parentBlock === "undefined") {
      if (
        Buffer.compare(
          block.header.parent,
          this.#finalizedBlock.header.signedHash(),
        ) !== 0
      ) {
        // parent is not the finalized block, so we don't know it and it cant be one before finalized
        return err(ChainManagerErrorCodes.UNKNOWN_PARENT);
      }
      parentBlock = this.#finalizedBlock;
    }
    const res = parentBlock.append(block);
    if (res.isErr()) {
      return err(res.error);
    }

    // This is till we implement Grandpa
    const newFinalized = parentBlock;
    if (
      Buffer.compare(
        newFinalized.header.signedHash(),
        this.#finalizedBlock.header.signedHash(),
      ) !== 0
    ) {
      // a new finalized Block
      this.#finalizedBlock = newFinalized;
      // we remove any competing blocks for same slot
      [...this.unfinalizedBlocks.values()]
        .filter((b) => b.header.slot.value === newFinalized.header.slot.value)
        .filter(
          (b) =>
            Buffer.compare(
              b.header.signedHash(),
              newFinalized.header.signedHash(),
            ) !== 0,
        )
        .forEach((b) => this.unfinalizedBlocks.delete(b.header.signedHash()));
    }

    this.unfinalizedBlocks.set(res.value.header.signedHash(), res.value);
    await this.#finalizedBlocksDB.save(newFinalized);

    // TODO: when GrandPa this will be different
    this.#bestBlock = res.value;
    return ok(this.#bestBlock);
  }
}

export enum ChainManagerErrorCodes {
  UNKNOWN_PARENT = "UNKNOWN_PARENT",
}
