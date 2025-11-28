import { HashCodec } from "@/codecs/misc-codecs";
import { wellBalancedBinaryMerkleRoot } from "@/merklization/binary";
import {
  constantDepthBinaryTree,
  J_fn,
  L_fn,
} from "@/merklization/constant-depth";
import {
  BaseJamCodecable,
  codec,
  createArrayLengthDiscriminator,
  eSubIntCodec,
  JamCodecable,
} from "@tsjam/codec";
import {
  ERASURECODE_BASIC_SIZE,
  ERASURECODE_EXPORTED_SIZE,
  MAXIMUM_AGE_LOOKUP_ANCHOR,
} from "@tsjam/constants";
import { Hashing } from "@tsjam/crypto";
import { erasureCoding, transpose } from "@tsjam/erasurecoding";
import type {
  AvailabilitySpecification,
  ExportSegment,
  Hash,
  Tagged,
  u16,
  u32,
  WorkPackageHash,
} from "@tsjam/types";
import { toTagged, zeroPad } from "@tsjam/utils";
import type { ConditionalExcept } from "type-fest";

/**
 * identified by `Y` set
 * $(0.7.1 - 11.5)
 * $(0.7.1 - C.25) | codec
 */
@JamCodecable()
export class AvailabilitySpecificationImpl
  extends BaseJamCodecable
  implements AvailabilitySpecification
{
  /**
   * `p`
   */
  @codec(HashCodec, "hash")
  packageHash!: WorkPackageHash;

  /**
   * `l`
   */
  @eSubIntCodec(4, "length")
  bundleLength!: Tagged<
    u32,
    "l",
    {
      maxValue: typeof MAXIMUM_AGE_LOOKUP_ANCHOR;
    }
  >;

  /**
   * `u` -
   */
  @codec(HashCodec, "erasure_root")
  erasureRoot!: Hash;

  /**
   * `e`
   */
  @codec(HashCodec, "exports_root")
  segmentRoot!: Hash;

  /**
   * `n`
   * Exported segment count
   */
  @eSubIntCodec(2, "exports_count")
  segmentCount!: u16;

  constructor(
    config: ConditionalExcept<AvailabilitySpecificationImpl, Function>,
  ) {
    super();
    Object.assign(this, config);
  }

  /**
   * compute availability specifier
   * @returns AvailabilitySpecification
   * $(0.7.1 - 14.17)
   */
  static build(
    packageHash: WorkPackageHash,
    bold_b: Buffer,
    exportedSegments: ExportSegment[], // bold_s
  ): AvailabilitySpecificationImpl {
    const s_flower = transpose(
      [...exportedSegments, ...pagedProof(exportedSegments)].map((x) =>
        erasureCoding(6, x),
      ),
    ).map((x) => wellBalancedBinaryMerkleRoot(x));

    const b_flower = erasureCoding(
      Math.ceil(bold_b.length / ERASURECODE_BASIC_SIZE),
      zeroPad(ERASURECODE_BASIC_SIZE, bold_b),
    ).map(Hashing.blake2b);

    return new AvailabilitySpecificationImpl({
      segmentCount: exportedSegments.length as u16,
      packageHash,
      bundleLength: toTagged(<u32>bold_b.length),
      segmentRoot: constantDepthBinaryTree(exportedSegments),
      erasureRoot: wellBalancedBinaryMerkleRoot(
        transpose<Hash>([b_flower, s_flower]).flat(),
      ),
    });
  }
}

const pagedProofCodec = createArrayLengthDiscriminator(HashCodec);
/**
 * Paged Proof
 * $(0.7.1 - 14.11)
 */
const pagedProof = (segments: ExportSegment[]): Buffer[] => {
  const limit = 64 * Math.ceil(segments.length / 64);
  const toRet: Buffer[] = [];
  for (let i = 0; i < limit; i += 64) {
    const j6 = J_fn(6, segments, i);
    const l6 = L_fn(6, segments, i);
    const j6Size = pagedProofCodec.encodedSize(j6);
    const encoded = Buffer.allocUnsafe(
      j6Size + pagedProofCodec.encodedSize(l6),
    );
    pagedProofCodec.encode(j6, encoded);
    pagedProofCodec.encode(l6, encoded.subarray(j6Size));

    toRet.push(
      zeroPad(ERASURECODE_BASIC_SIZE * ERASURECODE_EXPORTED_SIZE, encoded),
    );
  }
  return toRet as ExportSegment[];
};
