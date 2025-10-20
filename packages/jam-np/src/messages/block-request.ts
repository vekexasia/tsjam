import {
  BaseJamCodecable,
  binaryCodec,
  codec,
  E_1,
  E_4_int,
  JamCodecable,
  jsonCodec,
  lengthDiscriminatedCodec,
  mapCodec,
  NumberJSONCodec,
  SINGLE_ELEMENT_CLASS,
  xBytesCodec,
} from "@tsjam/codec";
import { AppliedBlock, ChainManager, JamBlockImpl } from "@tsjam/core";
import type { HeaderHash, u32 } from "@tsjam/types";
import { err, ok, Result } from "neverthrow";
import { JamNpErrorCodes } from "../error-codes";

/**
 * CE 128
 */
@JamCodecable()
export class BlockRequest extends BaseJamCodecable {
  @codec(xBytesCodec(32), "header_hash")
  headerHash!: HeaderHash;

  @jsonCodec({
    toJSON(value) {
      return value;
    },
    fromJSON(json) {
      return json;
    },
  })
  @binaryCodec(
    mapCodec(
      E_1,
      (v) => (v === 0n ? "ascending" : "descending"),
      (v) => (v === "ascending" ? 0n : 1n),
    ),
  )
  direction!: "ascending" | "descending";

  @jsonCodec(NumberJSONCodec())
  @binaryCodec(E_4_int)
  maxBlocks!: u32;

  async produceReply(
    manager: ChainManager,
  ): Promise<Result<BlockRequestResponse, JamNpErrorCodes>> {
    // we missing DB
    const resp = new BlockRequestResponse();
    resp.blocks = [];
    const b = await manager.blocksDB.fromHeaderHash(this.headerHash);
    if (!b || b.header.slot > manager.finalizedBlock.header.slot) {
      return err(JamNpErrorCodes.RESET_CONNECTION);
    }
    if (this.direction === "descending") {
      resp.blocks.push(b);
    }

    let curBlock = b;
    for (let i = 1; i < this.maxBlocks; i++) {
      let tmpBlock: AppliedBlock | undefined;
      if (this.direction === "ascending") {
        tmpBlock = await manager.blocksDB.sonOf(curBlock);
      } else {
        tmpBlock = await manager.blocksDB.fromHeaderHash(
          curBlock.header.parent,
        );
      }
      if (typeof tmpBlock !== "undefined") {
        curBlock = tmpBlock;
        resp.blocks.push(curBlock);
      } else {
        // no more blocks
        break;
      }
    }
    return ok(resp);
  }
}

@JamCodecable()
export class BlockRequestResponse extends BaseJamCodecable {
  @lengthDiscriminatedCodec(JamBlockImpl, SINGLE_ELEMENT_CLASS)
  blocks!: JamBlockImpl[];
}
