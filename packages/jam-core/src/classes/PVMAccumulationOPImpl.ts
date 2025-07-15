import { WorkOutputCodec, WorkOutputJSONCodec } from "@/codecs/WorkOutputCodec";
import {
  BaseJamCodecable,
  bigintCodec,
  binaryCodec,
  BufferJSONCodec,
  codec,
  hashCodec,
  JamCodecable,
  jsonCodec,
  LengthDiscrimantedIdentity,
} from "@tsjam/codec";
import {
  Gas,
  Hash,
  PVMAccumulationOp,
  WorkOutput,
  WorkPackageHash,
} from "@tsjam/types";
import { WorkOutputImpl } from "./WorkOutputImpl";

// codec order defined in $(0.6.4 - C.29)
@JamCodecable()
export class PVMAccumulationOpImpl
  extends BaseJamCodecable
  implements PVMAccumulationOp
{
  @hashCodec()
  packageHash!: WorkPackageHash;

  @hashCodec()
  segmentRoot!: Hash;

  @hashCodec()
  authorizerHash!: Hash;

  @hashCodec()
  payloadHash!: Hash;

  @bigintCodec(8)
  gasLimit!: Gas;

  @codec(WorkOutputImpl)
  result!: WorkOutputImpl;

  @jsonCodec(BufferJSONCodec())
  @binaryCodec(LengthDiscrimantedIdentity)
  authTrace!: Uint8Array;
}
