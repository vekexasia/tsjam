import { HashCodec } from "@/codecs/misc-codecs";
import { IdentityMap, IdentityMapCodec } from "@/data-structures/identity-map";
import { IdentitySet } from "@/data-structures/identity-set";
import { BaseJamCodecable, codec, JamCodecable } from "@tsjam/codec";
import type {
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

  /**
   * all reported work package hash
   */
  packageHashes(): IdentitySet<WorkPackageHash> {
    return new IdentitySet([...this.reportedPackages.keys()]);
  }
}
