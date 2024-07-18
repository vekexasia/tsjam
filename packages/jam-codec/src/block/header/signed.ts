import { JamCodec } from "@/codec.js";
import { JamHeader } from "@vekexasia/jam-types";

export class SignedHeaderCodec implements JamCodec<JamHeader> {
  decode(bytes: Uint8Array): { value: JamHeader; readBytes: number } {
    return undefined;
  }

  encode(value: JamHeader, bytes: Uint8Array): number {
    return 0;
  }

  encodedSize(value: JamHeader): number {
    return 0;
  }
}
