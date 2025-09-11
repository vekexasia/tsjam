import assert from "assert";
import { err, ok, Result } from "neverthrow";
import { DisputesToPosteriorError } from "./disputes-state-impl";
import { EAValidationError } from "./extrinsics/assurances";
import { DisputesCulpritError } from "./extrinsics/disputes/culprits";
import { DisputesFaultError } from "./extrinsics/disputes/faults";
import { DisputesVerdictError } from "./extrinsics/disputes/verdicts";
import { EGError } from "./extrinsics/guarantees";
import { EPError } from "./extrinsics/preimages";
import { ETError } from "./extrinsics/tickets";
import { GammaAError } from "./gamma-a-impl";
import { HeaderLookupHistoryImpl } from "./header-lookup-history-impl";
import { AppliedBlock, JamBlockImpl } from "./jam-block-impl";
import { JamBlocksDB } from "./jam-blocks-db";
import { HeaderValidationError } from "./jam-signed-header-impl";
import { TauError } from "./slot-impl";

export class ChainManager {
  #bestBlock: AppliedBlock | undefined;
  #blocksDB!: JamBlocksDB;
  headerLookupHistory!: HeaderLookupHistoryImpl;

  constructor() {}

  async init(genesis: AppliedBlock) {
    this.#blocksDB = new JamBlocksDB();
    this.headerLookupHistory = HeaderLookupHistoryImpl.newEmpty();
    await this.#blocksDB.save(genesis);
    this.#bestBlock = genesis;
  }

  get bestBlock(): AppliedBlock {
    assert(typeof this.#bestBlock !== "undefined");
    return this.#bestBlock!;
  }

  get blocksDB() {
    return this.#blocksDB;
  }

  async handleIncomingBlock(
    block: JamBlockImpl,
  ): Promise<
    Result<
      AppliedBlock,
      | DisputesToPosteriorError
      | DisputesVerdictError
      | DisputesCulpritError
      | DisputesFaultError
      | GammaAError
      | EAValidationError
      | ETError
      | EPError
      | EGError
      | TauError
      | HeaderValidationError
      | ChainManagerErrorCodes
    >
  > {
    const parentBlock = await this.#blocksDB.fromHeaderHash(
      block.header.parent,
    );
    if (typeof parentBlock === "undefined") {
      return err(ChainManagerErrorCodes.UNKNOWN_PARENT);
    }
    const parentState = parentBlock.posteriorState;

    if (parentState.slot.value !== this.#bestBlock!.header.slot.value) {
      // we are forking handle it here
      console.log("forking");
    }

    const res = parentState.applyBlock(
      block,
      parentBlock,
      this.headerLookupHistory,
    );
    if (res.isErr()) {
      return err(res.error);
    }

    this.headerLookupHistory = this.headerLookupHistory.toPosterior({
      header: block.header,
    });

    block.posteriorState = res.value;
    await this.#blocksDB.save(<AppliedBlock>block);
    this.#bestBlock = <AppliedBlock>block;
    return ok(this.#bestBlock);
  }
}

export enum ChainManagerErrorCodes {
  UNKNOWN_PARENT = "UNKNOWN_PARENT",
}
