import { JamStateImpl, stateKey } from "@/index";
import { Uint8ArrayJSONCodec } from "@tsjam/codec";
import { Hash, StateKey } from "@tsjam/types";
import { expect } from "chai";

import { diff } from "jest-diff";

export const randomHash = <T extends Hash>(): T => {
  return Buffer.allocUnsafe(32).fill((Math.random() * 256) | 0) as unknown as T;
};
export const reverseDifferentState = (
  key: StateKey,
  expected: JamStateImpl,
  actual: JamStateImpl,
) => {
  if (Buffer.compare(stateKey(1), key) === 0) {
    // authPool
    console.log(
      "authPool",
      diff(expected.authPool.toJSON(), actual.authPool.toJSON()),
    );
    return;
  } else if (Buffer.compare(stateKey(2), key) === 0) {
    // authQueue
    console.log(
      "authQueue",
      diff(expected.authQueue.toJSON(), actual.authQueue.toJSON()),
    );
    return;
  } else if (Buffer.compare(stateKey(3), key) === 0) {
    // beta
    console.log("beta", diff(expected.beta.toJSON(), actual.beta.toJSON()));
    return;
  } else if (Buffer.compare(stateKey(4), key) === 0) {
    // safrole
    console.log(
      "safrole",
      diff(expected.safroleState.toJSON(), actual.safroleState.toJSON()),
    );
    return;
  } else if (Buffer.compare(stateKey(5), key) === 0) {
    // disputes
    console.log(
      "disputes",
      diff(expected.disputes.toJSON(), actual.disputes.toJSON()),
    );
    return;
  } else if (Buffer.compare(stateKey(6), key) === 0) {
    // entropy
    console.log(
      "entropy",
      diff(expected.entropy.toJSON(), actual.entropy.toJSON()),
    );
    return;
  } else if (Buffer.compare(stateKey(7), key) === 0) {
    // iota
    console.log("iota", diff(expected.iota.toJSON(), actual.iota.toJSON()));
    return;
  } else if (Buffer.compare(stateKey(8), key) === 0) {
    // kappa
    console.log("kappa", diff(expected.kappa.toJSON(), actual.kappa.toJSON()));
    return;
  } else if (Buffer.compare(stateKey(9), key) === 0) {
    // lambda
    console.log(
      "lambda",
      diff(expected.lambda.toJSON(), actual.lambda.toJSON()),
    );
    return;
  } else if (Buffer.compare(stateKey(10), key) === 0) {
    // rho
    console.log("rho", diff(expected.rho.toJSON(), actual.rho.toJSON()));
    return;
  } else if (Buffer.compare(stateKey(11), key) === 0) {
    // slot
    console.log("slot", diff(expected.slot.toJSON(), actual.slot.toJSON()));
    return;
  } else if (Buffer.compare(stateKey(12), key) === 0) {
    // privServices
    console.log(
      "privServices",
      diff(expected.privServices.toJSON(), actual.privServices.toJSON()),
    );
    return;
  } else if (Buffer.compare(stateKey(13), key) === 0) {
    // statistics
    //
    expect(actual.statistics.toJSON(), "statistics").toEqual(
      expected.statistics.toJSON(),
    );
    return;
  } else if (Buffer.compare(stateKey(14), key) === 0) {
    // accumulation Queue
    console.log(
      "accumulationQueue",
      diff(
        expected.accumulationQueue.toJSON(),
        actual.accumulationQueue.toJSON(),
      ),
    );
    return;
  } else if (Buffer.compare(stateKey(15), key) === 0) {
    // accumulationHistory
    console.log(
      "accumulationHistory",
      diff(
        expected.accumulationHistory.toJSON(),
        actual.accumulationHistory.toJSON(),
      ),
    );
    return;
  } else if (Buffer.compare(stateKey(16), key) === 0) {
    //theta
    expect(actual.mostRecentAccumulationOutputs.toJSON(), "theta").toEqual(
      expected.mostRecentAccumulationOutputs.toJSON(),
    );
    return;
  }

  console.log(key);
  for (const [serviceIndex, serviceAccount] of expected.serviceAccounts
    .elements) {
    if (Buffer.compare(stateKey(255, serviceIndex), key) === 0) {
      // its about this service
      //
      //
      //
      console.log(serviceIndex);
      expect(actual.serviceAccounts.get(serviceIndex)?.toJSON()).toEqual(
        serviceAccount.toJSON(),
      );
      return;
    }
  }

  // not handled probably only storage or preimage(s)
  console.log(key);
  const actualMap = actual.merkle.map;
  const expectedMap = expected.merkle.map;

  console.log(
    diff(
      Uint8ArrayJSONCodec.toJSON(expectedMap.get(key)!),
      Uint8ArrayJSONCodec.toJSON(actualMap.get(key)!),
    ),
  );
};
