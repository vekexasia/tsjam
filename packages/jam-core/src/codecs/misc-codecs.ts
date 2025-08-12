import { xBytesCodec } from "@tsjam/codec";
import { Hash } from "@tsjam/types";

export const HashCodec = xBytesCodec<Hash, 32>(32);
