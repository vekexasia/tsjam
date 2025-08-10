import { HashCodec } from "@/codecs/miscCodecs";
import { IdentityMap, IdentityMapCodec } from "@/data_structures/identityMap";
import { BaseJamCodecable, codec, JamCodecable } from "@tsjam/codec";
import {
  Hash,
  HeaderHash,
  RecentHistoryItem,
  StateRootHash,
  WorkPackageHash,
} from "@tsjam/types";

@JamCodecable()
export class RecentHistoryItemImpl
  extends BaseJamCodecable
  implements RecentHistoryItem
{
  /**
   * `h`
   */
  @codec(HashCodec, "header_hash")
  headerHash!: HeaderHash;
  /**
   * `b`
   */
  @codec(HashCodec, "beefy_root")
  accumulationResultMMB!: Hash;
  /**
   * `s`
   */
  @codec(HashCodec, "state_root")
  stateRoot!: StateRootHash;

  /**
   * `p`
   *  dictionary from workpackagehash to erasureroot
   */
  @codec(
    IdentityMapCodec(HashCodec, HashCodec, {
      key: "hash",
      value: "exports_root",
    }),
    "reported",
  )
  reportedPackages!: IdentityMap<WorkPackageHash, 32, Hash>;

  constructor(config: RecentHistoryItem) {
    super();
    Object.assign(this, config);
  }

  packageHashes(): Set<WorkPackageHash> {
    return new Set(this.reportedPackages.keys());
  }
}
