import {
  BandersnatchKey,
  BandersnatchRingRoot,
  IDisputesState,
  JamState,
  Tagged,
  TicketIdentifier,
  ValidatorData,
} from "@tsjam/types";
import { bigintToBytes, hextToBigInt, toTagged } from "@tsjam/utils";

export const validatorEntryMap = (entry: any) => {
  return {
    banderSnatch: Buffer.from(entry.bandersnatch.slice(2), "hex"),
    ed25519: hextToBigInt(entry.ed25519),
    blsKey: Buffer.from(entry.bls.slice(2), "hex"),
    metadata: Buffer.from(entry.metadata.slice(2), "hex"),
  } as unknown as ValidatorData;
};
export const mapTestDataToSafroleState = (testData: any): JamState => {
  return {
    entropy: [
      toTagged(hextToBigInt(testData.eta[0])),
      toTagged(hextToBigInt(testData.eta[1])),
      toTagged(hextToBigInt(testData.eta[2])),
      toTagged(hextToBigInt(testData.eta[3])),
    ],
    safroleState: {
      gamma_a: testData.gamma_a.map((entry: { id: string; attempt: 0 | 1 }) => {
        return {
          id: hextToBigInt(entry.id),
          attempt: entry.attempt,
        } as TicketIdentifier;
      }),
      gamma_k: testData.gamma_k.map(validatorEntryMap),
      gamma_s: (() => {
        if ("keys" in testData.gamma_s) {
          return testData.gamma_s.keys.map((key: string) => hextToBigInt(key));
        }
        return testData.gamma_s;
      })(),
      gamma_z: hextToBigInt(testData.gamma_z) as Tagged<
        BandersnatchRingRoot,
        "gamma_z"
      >,
    },
    iota: testData.iota.map(validatorEntryMap),
    kappa: testData.kappa.map(validatorEntryMap),
    lambda: testData.lambda.map(validatorEntryMap),
    tau: testData.tau,
    // NOTE: there are other elements in the state that are not used in the test
  } as JamState;
};

const validatorEntryHexMap = (entry: ValidatorData) => {
  return {
    bandersnatch: `0x${Buffer.from(entry.banderSnatch).toString("hex")}`,
    ed25519: `0x${Buffer.from(bigintToBytes(entry.ed25519, 32)).toString("hex")}`,
    bls: `0x${Buffer.from(entry.blsKey).toString("hex")}`,
    metadata: `0x${Buffer.from(entry.metadata).toString("hex")}`,
  };
};
