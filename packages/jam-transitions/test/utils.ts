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
export const safroleStateToTestData = (state: JamState) => {
  return {
    eta: state.entropy.map(
      (entry) => `0x${entry.toString(16).padStart(64, "0")}`,
    ),
    gamma_a: state.safroleState.gamma_a.map((entry) => ({
      id: `0x${Buffer.from(bigintToBytes(entry.id, 32)).toString("hex")}`,
      attempt: entry.attempt,
    })),
    gamma_k: state.safroleState.gamma_k.map(validatorEntryHexMap),
    gamma_s: (() => {
      if (typeof state.safroleState.gamma_s[0] === "bigint") {
        return {
          keys: state.safroleState.gamma_s.map(
            (key) => `0x${Buffer.from(key as BandersnatchKey).toString("hex")}`,
          ),
        };
      } else {
        return {
          tickets: state.safroleState.gamma_s.map((ticket) => ({
            id: `0x${Buffer.from(bigintToBytes((ticket as TicketIdentifier).id, 32)).toString("hex")}`,
            attempt: (ticket as TicketIdentifier).attempt,
          })),
        };
      }
    })(),
    gamma_z: `0x${state.safroleState.gamma_z.toString(16)}`,
    iota: state.iota.map(validatorEntryHexMap),
    kappa: state.kappa.map(validatorEntryHexMap),
    lambda: state.lambda.map(validatorEntryHexMap),
    tau: state.tau,
  };
};

export const disputesStateFromTest = (testData: {
  wonky: string[];
  bad: string[];
  good: string[];
  offenders: string[];
}): IDisputesState => {
  return {
    psi_w: new Set(testData.wonky.map((item: string) => hextToBigInt(item))),
    psi_b: new Set(testData.bad.map((item: string) => hextToBigInt(item))),
    psi_g: new Set(testData.good.map((item: string) => hextToBigInt(item))),
    psi_o: new Set(
      testData.offenders.map((item: string) => hextToBigInt(item)),
    ),
  } as unknown as IDisputesState;
};

export const disputesStateToTest = (state: IDisputesState) => {
  return {
    wonky: Array.from(state.psi_w)
      .sort((a, b) => (a < b ? -1 : 1))
      .map(
        (item) => `0x${Buffer.from(bigintToBytes(item, 32)).toString("hex")}`,
      ),
    bad: Array.from(state.psi_b)
      .sort((a, b) => (a < b ? -1 : 1))
      .map(
        (item) => `0x${Buffer.from(bigintToBytes(item, 32)).toString("hex")}`,
      ),
    good: Array.from(state.psi_g)
      .sort((a, b) => (a < b ? -1 : 1))
      .map(
        (item) => `0x${Buffer.from(bigintToBytes(item, 32)).toString("hex")}`,
      ),
    offenders: Array.from(state.psi_o)
      .sort((a, b) => (a < b ? -1 : 1))
      .map(
        (item) => `0x${Buffer.from(bigintToBytes(item, 32)).toString("hex")}`,
      ),
  };
};
