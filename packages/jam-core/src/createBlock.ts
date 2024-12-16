import {
  BandersnatchPrivKey,
  BandersnatchSignature,
  ED25519PublicKey,
  JamBlock,
  JamHeader,
  JamState,
  MerkeTreeRoot,
  SignedJamHeader,
  ValidatorData,
  Tau,
  Posterior,
  ValidatorIndex,
} from "@tsjam/types";
import { Bandersnatch } from "@tsjam/crypto";
import { computeExtrinsicHash } from "./verifySeal";
import { bigintToBytes, toPosterior, Timekeeping } from "@tsjam/utils";
import { merkelizeState } from "@tsjam/merklization";
import { rotateKeys } from "@tsjam/transitions";
import { JAM_ENTROPY } from "@tsjam/constants";

/**
 * Creates a block given current state and some data
 */
export const createBlock = (
  curState: JamState,
  data: {
    previousBlock: JamBlock;
    validator: ValidatorData;
    bandersnatchPrivateKey: BandersnatchPrivKey;
  },
): JamBlock => {
  const offenders: ED25519PublicKey[] = [];
  const extrinsics = {
    disputes: {
      faults: [],
      culprit: [],
      verdicts: [],
    },
    tickets: [],
    preimages: [],
    assurances: [],
    reportGuarantees: [],
  } as unknown as JamBlock["extrinsics"];
  const p_tau: Posterior<Tau> = toPosterior(Timekeeping.bigT());

  const [, [, p_kappa, ,]] = rotateKeys(
    {
      p_psi_o: toPosterior(new Set()),
      iota: curState.iota,
      tau: curState.tau,
      p_tau,
    },
    [
      curState.safroleState.gamma_k,
      curState.kappa,
      curState.lambda,
      curState.safroleState.gamma_z,
    ],
  ).safeRet();
  const seal: BandersnatchSignature = null as unknown as BandersnatchSignature;
  const header: JamHeader = {
    parent:
      curState.recentHistory[curState.recentHistory.length - 1].headerHash,
    offenders,
    extrinsicHash: computeExtrinsicHash(extrinsics),
    timeSlotIndex: Timekeeping.bigT(),
    priorStateRoot: merkelizeState(curState) as MerkeTreeRoot,
    blockAuthorKeyIndex: p_kappa.findIndex(
      (a) => a.ed25519 === data.validator.ed25519,
    ) as ValidatorIndex,
    entropySignature: Bandersnatch.sign(
      data.bandersnatchPrivateKey,
      new Uint8Array([]), // message
      new Uint8Array([
        ...JAM_ENTROPY,
        ...bigintToBytes(Bandersnatch.vrfOutputSignature(seal), 32),
      ]),
    ),
  };

  const signedHeader: SignedJamHeader = {
    ...header,
    blockSeal: seal,
  };

  return {
    header: signedHeader,
    extrinsics,
  };
};
