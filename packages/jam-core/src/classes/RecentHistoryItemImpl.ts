import {
  BaseJamCodecable,
  binaryCodec,
  buildKeyValueCodec,
  HashCodec,
  hashCodec,
  HashJSONCodec,
  JamCodecable,
  jsonCodec,
  MapJSONCodec,
} from "@tsjam/codec";
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
  @hashCodec("header_hash")
  headerHash!: HeaderHash;
  /**
   * `b`
   */
  @hashCodec("mmb")
  accumulationResultMMB!: Hash;
  /**
   * `s`
   */
  @hashCodec("state_root")
  stateRoot!: StateRootHash;

  /**
   * `p`
   *  dictionary from workpackagehash to erasureroot
   */
  @jsonCodec(
    MapJSONCodec(
      { key: "hash", value: "exports_root" },
      HashJSONCodec(),
      HashJSONCodec(),
    ),
    "reported",
  )
  @binaryCodec(buildKeyValueCodec(HashCodec))
  reportedPackages!: Map<WorkPackageHash, Hash>;

  constructor(config: RecentHistoryItem) {
    super();
    Object.assign(this, config);
  }

  packageHashes(): Set<WorkPackageHash> {
    return new Set(this.reportedPackages.keys());
  }
}
