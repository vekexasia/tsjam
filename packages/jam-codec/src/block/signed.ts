import { JamCodec } from "@/codec.js";
import { JamBlock } from "@vekexasia/jam-types";

export class SignedBlockCodec implements JamCodec<JamBlock> {
  decode(bytes: Uint8Array): { value: JamBlock; readBytes: number } {
    return undefined;
  }

  encode(value: JamBlock, bytes: Uint8Array): number {
    return 0;
  }

  encodedSize(value: JamBlock): number {
    return 0;
  }
}
