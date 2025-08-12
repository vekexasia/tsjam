import {
  BaseJamCodecable,
  cloneCodecable,
  JamCodecable,
  lengthDiscriminatedCodec,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import { RECENT_HISTORY_LENGTH } from "@tsjam/constants";
import {
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
import { JamHeaderImpl } from "./jam-header-impl";
import { RecentHistoryItemImpl } from "./recent-history-item-impl";
import { MMRSuperPeak } from "@/merklization";
import { GuaranteesExtrinsicImpl } from "./extrinsics/guarantees";
import { ConditionalExcept } from "type-fest";
import { IdentitySet } from "@/data-structures/identity-set";

@JamCodecable()
export class RecentHistoryImpl
  extends BaseJamCodecable
  implements RecentHistory
{
  @lengthDiscriminatedCodec(RecentHistoryItemImpl, SINGLE_ELEMENT_CLASS)
  elements!: UpToSeq<RecentHistoryItemImpl, typeof RECENT_HISTORY_LENGTH>;

  constructor(config?: ConditionalExcept<RecentHistoryImpl, Function>) {
    super();
    if (typeof config !== "undefined") {
      Object.assign(this, config);
    }
  }

  findHeader(headerHash: HeaderHash) {
    return this.elements.find((el) => el.headerHash === headerHash);
  }
  /**
   * $(0.7.1 - 4.6 / 7.5)
   */
  toDagger(header: JamHeaderImpl): Dagger<RecentHistoryImpl> {
    if (this.elements.length === 0) {
      return toDagger(this);
    }

    const toRet = cloneCodecable(this);

    toRet.elements[toRet.elements.length - 1].stateRoot =
      header.parentStateRoot;
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
        stateRoot: <StateRootHash>new Uint8Array(32).fill(0),
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
}
