import { HashCodec } from "@/codecs/misc-codecs";
import {
  BaseJamCodecable,
  codec,
  eBigIntCodec,
  JamCodecable,
  LengthDiscrimantedIdentityCodec,
} from "@tsjam/codec";
import {
  Gas,
  Hash,
  PVMAccumulationOp,
  WorkError,
  WorkPackageHash,
} from "@tsjam/types";
import { ConditionalExcept } from "type-fest";
import { WorkOutputImpl } from "../work-output-impl";

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
  @codec(HashCodec)
  packageHash!: WorkPackageHash;

  /**
   * `e`
   */
  @codec(HashCodec)
  segmentRoot!: Hash;

  /**
   * `a`
   */
  @codec(HashCodec)
  authorizerHash!: Hash;

  /**
   * `y`
   */
  @codec(HashCodec)
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
  @codec(LengthDiscrimantedIdentityCodec)
  authTrace!: Uint8Array;

  constructor(config?: ConditionalExcept<PVMAccumulationOpImpl, Function>) {
    super();
    if (typeof config !== "undefined") {
      Object.assign(this, config);
    }
  }
}
