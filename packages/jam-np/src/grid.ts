import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import {
  IdentityMap,
  JamStateImpl,
  SlotImpl,
  ValidatorDataImpl,
  ValidatorsImpl,
} from "@tsjam/core";
import {
  ED25519PublicKey,
  Tagged,
  u32,
} from "../../jam-types/dist/types/generic-types";

const W = Math.floor(Math.sqrt(NUMBER_OF_VALIDATORS));

export class GridValidatorArrangement {
  previousValidators: JamStateImpl["lambda"];
  currentValidators: JamStateImpl["kappa"];
  nextValidators: JamStateImpl["iota"];
  curEpoch?: Tagged<u32, "epoch-index">;

  constructor(
    previousValidators: JamStateImpl["lambda"],
    currentValidators: JamStateImpl["kappa"],
    nextValidators: JamStateImpl["iota"],
    curEpoch: Tagged<u32, "epoch-index">,
  ) {
    this.previousValidators = previousValidators;
    this.currentValidators = currentValidators;
    this.nextValidators = nextValidators;
    this.curEpoch = curEpoch;
  }

  /**
   * returns the neighbors of given validator
   * It is guaranteed that the returned array has no duplicates and does not contain the given validator
   */
  neighborsOf(key: ED25519PublicKey): ValidatorDataImpl[] {
    const neighbors = new IdentityMap<
      ED25519PublicKey,
      32,
      ValidatorDataImpl
    >();

    // NOTE: we override possible same results with new validator data
    // as I believe metaddata might change so we use the most recent one
    GridValidatorArrangement.buildNeighbors(this.previousValidators, key, [
      this.nextValidators,
      this.currentValidators,
    ]).forEach((v) => neighbors.set(v.ed25519, v));

    GridValidatorArrangement.buildNeighbors(this.currentValidators, key, [
      this.currentValidators,
    ]).forEach((v) => neighbors.set(v.ed25519, v));

    GridValidatorArrangement.buildNeighbors(
      this.nextValidators,
      key,
      [],
    ).forEach((v) => neighbors.set(v.ed25519, v));

    return [...neighbors.toSet().values()];
  }

  static buildNeighbors(
    set: ValidatorsImpl,
    ofWhom: ED25519PublicKey,
    otherSets: ValidatorsImpl[],
  ) {
    // this should be a set but eases deletion of self and removal of duplicates (same index diff epoch)
    const setNeighbors = new IdentityMap<
      ED25519PublicKey,
      32,
      ValidatorDataImpl
    >();

    const myIndex = set.indexOfEd25519(ofWhom);
    if (typeof myIndex !== "undefined") {
      // add all neighbors (and myself) in same row /col
      const myRow = Math.floor(myIndex / W);
      const myCol = myIndex % W;
      for (let i = 0; i < NUMBER_OF_VALIDATORS; i++) {
        const thisRow = Math.floor(i / W);
        const thisCol = i % W;
        if (thisRow === myRow || thisCol === myCol) {
          setNeighbors.set(set.elements[i].ed25519, set.elements[i]);
        }
      }

      // add same index validators from other sets
      for (const otherSet of otherSets) {
        setNeighbors.set(
          otherSet.elements[myIndex].ed25519,
          otherSet.elements[myIndex],
        );
      }

      // remove myself
      setNeighbors.delete(ofWhom);
    }
    return setNeighbors.toSet();
  }

  static build(state: JamStateImpl) {
    return new GridValidatorArrangement(
      state.lambda,
      state.kappa,
      state.iota,
      state.slot.epochIndex(),
    );
  }

  guarantors(__tau: SlotImpl) {
    // TODO: use .reporters in EG
    throw new Error("Not implemented");
  }
}
