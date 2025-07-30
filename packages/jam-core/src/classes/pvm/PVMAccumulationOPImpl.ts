import {
  BaseJamCodecable,
  binaryCodec,
  BufferJSONCodec,
  codec,
  eSubBigIntCodec,
  hashCodec,
  JamCodecable,
  jsonCodec,
  LengthDiscrimantedIdentity,
} from "@tsjam/codec";
import { Gas, Hash, PVMAccumulationOp, WorkPackageHash } from "@tsjam/types";
import { ConditionalExcept } from "type-fest";

/**
 * `I` set in graypaper $\operandtuple$
 * $(0.7.0 - 12.19)
 * codec order defined in $(0.6.4 - C.29)
 */
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

  @eSubBigIntCodec(8)
  gasLimit!: Gas;

  @codec(WorkOutputImpl)
  result!: WorkOutputImpl;

  @jsonCodec(BufferJSONCodec())
  @binaryCodec(LengthDiscrimantedIdentity)
  authTrace!: Uint8Array;

  constructor(config: ConditionalExcept<PVMAccumulationOpImpl, Function>) {
    super();
    Object.assign(this, config);
  }
}
