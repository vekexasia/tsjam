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
import {
  Gas,
  Hash,
  PVMAccumulationOp,
  WorkError,
  WorkPackageHash,
} from "@tsjam/types";
import { ConditionalExcept } from "type-fest";
import { WorkOutputImpl } from "../WorkOutputImpl";

/**
 * `U` set in graypaper $\operandtuple$
 * $(0.7.1 - 12.13)
 * codec order defined in $(0.6.4 - C.29)
 */
@JamCodecable()
export class PVMAccumulationOpImpl
  extends BaseJamCodecable
  implements PVMAccumulationOp
{
  /**
   * `p`
   */
  @hashCodec()
  packageHash!: WorkPackageHash;

  /**
   * `e`
   */
  @hashCodec()
  segmentRoot!: Hash;

  /**
   * `a`
   */
  @hashCodec()
  authorizerHash!: Hash;

  /**
   * `y`
   */
  @hashCodec()
  payloadHash!: Hash;

  /**
   * `g`
   */
  @eSubBigIntCodec(8)
  gasLimit!: Gas;

  /**
   * `bold_l`
   */
  @codec(WorkOutputImpl)
  result!: WorkOutputImpl<WorkError>;

  /**
   * `bold_t` - comes from Workreport
   */
  @jsonCodec(BufferJSONCodec())
  @binaryCodec(LengthDiscrimantedIdentity)
  authTrace!: Uint8Array;

  constructor(config: ConditionalExcept<PVMAccumulationOpImpl, Function>) {
    super();
    Object.assign(this, config);
  }
}
