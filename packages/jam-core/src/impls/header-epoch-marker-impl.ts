import { HashCodec } from "@/codecs/misc-codecs";
import {
  BaseJamCodecable,
  codec,
  JamCodecable,
  sequenceCodec,
  xBytesCodec,
} from "@tsjam/codec";
import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import type {
  BandersnatchKey,
  Blake2bHash,
  ED25519PublicKey,
  EpochMarker,
  Posterior,
  SeqOfLength,
  Validated,
  ValidatorIndex,
} from "@tsjam/types";
import type { ConditionalExcept } from "type-fest";
import { GammaPImpl } from "./gamma-p-impl";
import { JamEntropyImpl } from "./jam-entropy-impl";
import { TauImpl } from "./slot-impl";
import { toTagged } from "@tsjam/utils";

@JamCodecable()
export class EpochMarkerValidatorImpl extends BaseJamCodecable {
  @codec(xBytesCodec(32))
  bandersnatch!: BandersnatchKey;
  @codec(xBytesCodec(32))
  ed25519!: ED25519PublicKey;

  constructor(config?: ConditionalExcept<EpochMarkerValidatorImpl, Function>) {
    super();
    if (typeof config !== "undefined") {
      Object.assign(this, config);
    }
  }
}

/**
 * $(0.7.1 - 5.10)
 */
@JamCodecable()
export class HeaderEpochMarkerImpl
  extends BaseJamCodecable
  implements EpochMarker
{
  @codec(HashCodec)
  entropy!: Blake2bHash;

  @codec(HashCodec, "tickets_entropy")
  entropy2!: Blake2bHash;

  @sequenceCodec(NUMBER_OF_VALIDATORS, EpochMarkerValidatorImpl)
  validators!: SeqOfLength<
    EpochMarkerValidatorImpl,
    typeof NUMBER_OF_VALIDATORS,
    "validators"
  >;

  constructor(config?: ConditionalExcept<HeaderEpochMarkerImpl, Function>) {
    super();
    if (typeof config !== "undefined") {
      Object.assign(this, config);
    }
  }

  static build(deps: {
    p_tau: Validated<Posterior<TauImpl>>;
    tau: TauImpl;
    entropy: JamEntropyImpl;
    p_gamma_p: Posterior<GammaPImpl>;
  }): HeaderEpochMarkerImpl | undefined {
    if (deps.p_tau.isNewerEra(deps.tau)) {
      const toRet = new HeaderEpochMarkerImpl();
      toRet.entropy = deps.entropy._0;
      toRet.entropy2 = deps.entropy._1;

      toRet.validators = toTagged([]);
      for (let i = <ValidatorIndex>0; i < NUMBER_OF_VALIDATORS; i++) {
        toRet.validators.push(
          new EpochMarkerValidatorImpl({
            bandersnatch: deps.p_gamma_p.at(i).banderSnatch,
            ed25519: deps.p_gamma_p.at(i).ed25519,
          }),
        );
      }
      return toRet;
    } else {
      return undefined;
    }
  }

  /**
   * Verifies epoch marker `He`
   * $(0.7.1 - 6.27)
   */
  static validate(
    epochMarker: HeaderEpochMarkerImpl | undefined,
    deps: {
      p_tau: Validated<Posterior<TauImpl>>;
      tau: TauImpl;
      entropy: JamEntropyImpl;
      p_gamma_p: Posterior<GammaPImpl>;
    },
  ) {
    if (deps.p_tau.isNewerEra(deps.tau)) {
      if (typeof epochMarker === "undefined") {
        return false;
      }
      if (Buffer.compare(epochMarker.entropy, deps.entropy._0) !== 0) {
        return false;
      }
      if (Buffer.compare(epochMarker.entropy2, deps.entropy._1) !== 0) {
        return false;
      }
      if (epochMarker.validators.length !== NUMBER_OF_VALIDATORS) {
        return false;
      }
      for (let i = <ValidatorIndex>0; i < NUMBER_OF_VALIDATORS; i++) {
        if (
          Buffer.compare(
            epochMarker!.validators[i].bandersnatch,
            deps.p_gamma_p.at(i).banderSnatch,
          ) !== 0 ||
          Buffer.compare(
            epochMarker!.validators[i].ed25519,
            deps.p_gamma_p.at(i).ed25519,
          ) !== 0
        ) {
          return false;
        }
      }
    } else {
      if (typeof epochMarker !== "undefined") {
        return false;
      }
    }
    return true;
  }
}
