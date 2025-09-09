import { IdentitySet } from "@/data-structures/identity-set";
import { MMRSuperPeak } from "@/merklization/mmr";
import {
  BaseJamCodecable,
  cloneCodecable,
  JamCodecable,
  lengthDiscriminatedCodec,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import { RECENT_HISTORY_LENGTH } from "@tsjam/constants";
import type {
  Beta,
  Dagger,
  HeaderHash,
  Posterior,
  RecentHistory,
  StateRootHash,
  UpToSeq,
  Validated,
  WorkPackageHash,
} from "@tsjam/types";
import { toDagger, toPosterior, toTagged } from "@tsjam/utils";
import type { GuaranteesExtrinsicImpl } from "./extrinsics/guarantees";
import { RecentHistoryItemImpl } from "./recent-history-item-impl";

@JamCodecable()
export class RecentHistoryImpl
  extends BaseJamCodecable
  implements RecentHistory
{
  @lengthDiscriminatedCodec(RecentHistoryItemImpl, SINGLE_ELEMENT_CLASS)
  elements!: UpToSeq<RecentHistoryItemImpl, typeof RECENT_HISTORY_LENGTH>;

  constructor(elements: RecentHistoryItemImpl[] = []) {
    super();
    this.elements = <
      UpToSeq<RecentHistoryItemImpl, typeof RECENT_HISTORY_LENGTH>
    >elements;
  }

  findHeader(headerHash: HeaderHash) {
    return this.elements.find((el) => el.headerHash === headerHash);
  }
  /**
   * $(0.7.1 - 4.6 / 7.5)
   * it needs the current merkle root ( or parent stateroot of incoming block)
   */
  toDagger(parentStateRoot: StateRootHash): Dagger<RecentHistoryImpl> {
    if (this.elements.length === 0) {
      return toDagger(this);
    }

    const toRet = cloneCodecable(this);

    toRet.elements[toRet.elements.length - 1].stateRoot = parentStateRoot;

    return toDagger(toRet);
  }

  allPackageHashes(): IdentitySet<WorkPackageHash> {
    return this.elements
      .map((el) => el.packageHashes())
      .reduce((a, b) => {
        b.forEach((hash) => a.add(hash));
        return a;
      });
  }

  /**
   * $(0.7.1 - 7.8 / 4.17)
   */
  toPosterior(
    this: Dagger<RecentHistoryImpl>,
    deps: {
      headerHash: HeaderHash;
      p_beefyBelt: Posterior<Beta["beefyBelt"]>;
      eg: Validated<GuaranteesExtrinsicImpl>;
    },
  ) {
    const toRet = cloneCodecable(this);
    const b = MMRSuperPeak(deps.p_beefyBelt);
    const bold_p = new Map(
      deps.eg
        .workReports()
        .map((a) => a.avSpec)
        .flat()
        .map((a) => [a.packageHash, a.segmentRoot]),
    );
    toRet.elements.push(
      new RecentHistoryItemImpl({
        reportedPackages: bold_p,
        headerHash: deps.headerHash,
        stateRoot: <StateRootHash>Buffer.alloc(32),
        accumulationResultMMB: b,
      }),
    );

    if (toRet.elements.length > RECENT_HISTORY_LENGTH) {
      toRet.elements = toTagged(
        toRet.elements.slice(toRet.elements.length - RECENT_HISTORY_LENGTH),
      );
    }

    return toPosterior(toRet);
  }

  static newEmpty(): RecentHistoryImpl {
    return new RecentHistoryImpl([]);
  }
}
