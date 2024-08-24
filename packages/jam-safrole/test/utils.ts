import { SafroleState } from "@/index.js";
import { bigintToBytes, bytesToBigInt } from "@vekexasia/jam-codec";
import {
  BandersnatchRingRoot,
  Tagged,
  TicketIdentifier,
  toTagged,
  ValidatorData,
} from "@vekexasia/jam-types";

export const hexToBytes = (hex: string): Uint8Array => {
  return Buffer.from(hex.slice(2), "hex");
};
export const hextToBigInt = (hex: string): bigint => {
  return bytesToBigInt(hexToBytes(hex));
};
const validatorEntryMap = (entry: any) => {
  return {
    banderSnatch: hextToBigInt(entry.bandersnatch),
    ed25519: hextToBigInt(entry.ed25519),
    blsKey: Buffer.from(entry.bls.slice(2), "hex"),
    metadata: Buffer.from(entry.metadata.slice(2), "hex"),
  } as unknown as ValidatorData;
};
export const mapTestDataToSafroleState = (testData: any): SafroleState => {
  return {
    eta: [
      toTagged(hextToBigInt(testData.eta[0])),
      toTagged(hextToBigInt(testData.eta[1])),
      toTagged(hextToBigInt(testData.eta[2])),
      toTagged(hextToBigInt(testData.eta[3])),
    ],
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
    iota: testData.iota.map(validatorEntryMap),
    kappa: testData.kappa.map(validatorEntryMap),
    lambda: testData.lambda.map(validatorEntryMap),
    tau: testData.tau,
  };
};

const validatorEntryHexMap = (entry: ValidatorData) => {
  return {
    bandersnatch: `0x${entry.banderSnatch.toString(16)}`,
    ed25519: `0x${entry.ed25519.toString(16)}`,
    bls: `0x${Buffer.from(entry.blsKey).toString("hex")}`,
    metadata: `0x${Buffer.from(entry.metadata).toString("hex")}`,
  };
};
export const safroleStateToTestData = (state: SafroleState) => {
  return {
    eta: state.eta.map((entry) => `0x${entry.toString(16).padStart(64, "0")}`),
    gamma_a: state.gamma_a.map((entry) => ({
      id: `0x${Buffer.from(bigintToBytes(entry.id, 32)).toString("hex")}`,
      attempt: entry.attempt,
    })),
    gamma_k: state.gamma_k.map(validatorEntryHexMap),
    gamma_s: (() => {
      if (typeof state.gamma_s[0] === "bigint") {
        return {
          keys: state.gamma_s.map((key) => `0x${(key as bigint).toString(16)}`),
        };
      }
    })(),
    gamma_z: `0x${state.gamma_z.toString(16)}`,
    iota: state.iota.map(validatorEntryHexMap),
    kappa: state.kappa.map(validatorEntryHexMap),
    lambda: state.lambda.map(validatorEntryHexMap),
    tau: state.tau,
  };
};
