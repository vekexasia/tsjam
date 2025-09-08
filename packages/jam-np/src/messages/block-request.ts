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
import { JamBlockImpl } from "@tsjam/core";
import type { HeaderHash, u32 } from "@tsjam/types";

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

  async createReply() {
    // we missing DB
    throw new Error("Not implemented");
    const resp = new BlockRequestResponse();
    resp.blocks = [];
    return resp;
  }
}

@JamCodecable()
export class BlockRequestResponse extends BaseJamCodecable {
  @lengthDiscriminatedCodec(JamBlockImpl, SINGLE_ELEMENT_CLASS)
  blocks!: JamBlockImpl[];
}
