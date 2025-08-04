import {
  BaseJamCodecable,
  binaryCodec,
  BufferJSONCodec,
  codec,
  eBigIntCodec,
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
 * $(0.7.1 - C.32) | codec
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
  // NOTE: - codec is set as E() but usually is E_8
  @eBigIntCodec()
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
