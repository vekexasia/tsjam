import { encodeWithCodec, UnsignedHeaderCodec } from "@tsjam/codec";
import { JAM_ENTROPY } from "@tsjam/constants";
import { Bandersnatch } from "@tsjam/crypto";
import { merkelizeState } from "@tsjam/merklization";
import {
  disputesSTF,
  gamma_sSTF,
  rotateEta1_4,
  rotateKeys,
} from "@tsjam/transitions";
import {
  BandersnatchKey,
  BandersnatchSignature,
  ED25519PublicKey,
  JamBlock,
  JamState,
  Posterior,
  SignedJamHeader,
  StateRootHash,
  Tau,
  ValidatorData,
  ValidatorIndex,
} from "@tsjam/types";
import { bigintToBytes, Timekeeping, toPosterior } from "@tsjam/utils";
import { computeExtrinsicHash, sealSignContext } from "./verifySeal";

/**
 * Creates a block given current state and some data
 */
export const createBlock = (
  curState: JamState,
  data: {
    extrinsics: JamBlock["extrinsics"];
    previousBlock: JamBlock;
    validator: ValidatorData;
    bandersnatchPrivateKey: BandersnatchKey;
  },
): JamBlock => {
  const offenders: ED25519PublicKey[] = [];
  const p_tau: Posterior<Tau> = toPosterior(Timekeeping.bigT());

  // TODO: epochMarker in header if change of epoch
  const [, [, p_eta2, p_eta3]] = rotateEta1_4(
    {
      p_tau,
      tau: data.previousBlock.header.timeSlotIndex,
      eta0: curState.entropy[0],
    },
    [curState.entropy[1], curState.entropy[2], curState.entropy[3]],
  ).safeRet();

  const [disputesError, disputes] = disputesSTF(
    {
      kappa: curState.kappa,
      curTau: data.previousBlock.header.timeSlotIndex,
      lambda: curState.lambda,
      extrinsic: data.extrinsics.disputes,
    },
    curState.disputes,
  ).safeRet();

  if (disputesError) {
    throw new Error("Disputes error");
  }

  const [, [, p_kappa, ,]] = rotateKeys(
    {
      p_psi_o: toPosterior(disputes.psi_o),
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

  const [, p_gammaS] = gamma_sSTF(
    {
      tau: data.previousBlock.header.timeSlotIndex,
      p_tau,
      p_eta2: toPosterior(p_eta2),
      gamma_a: curState.safroleState.gamma_a,
      p_kappa,
    },
    curState.safroleState.gamma_s,
  ).safeRet();

  const sealContext = sealSignContext(p_tau, toPosterior(p_eta3), p_gammaS);

  const vrfOutputHash = Bandersnatch.vrfOutputSeed(
    data.bandersnatchPrivateKey,
    sealContext,
  );

  const header: SignedJamHeader = {
    parent:
      curState.beta.recentHistory[curState.beta.recentHistory.length - 1]
        .headerHash,
    offenders,
    extrinsicHash: computeExtrinsicHash(data.extrinsics),
    timeSlotIndex: p_tau,
    priorStateRoot: merkelizeState(curState) as StateRootHash,
    blockAuthorKeyIndex: p_kappa.findIndex(
      (a) => a.ed25519.bigint === data.validator.ed25519.bigint,
    ) as ValidatorIndex,
    entropySignature: Bandersnatch.sign(
      data.bandersnatchPrivateKey,
      new Uint8Array([]), // message
      new Uint8Array([...JAM_ENTROPY, ...bigintToBytes(vrfOutputHash, 32)]),
    ),
    blockSeal: <BandersnatchSignature>new Uint8Array(96).fill(0), // placeholder, will be filled later
  };

  const encodedHeader = encodeWithCodec(UnsignedHeaderCodec(), header);
  const seal: BandersnatchSignature = Bandersnatch.sign(
    data.bandersnatchPrivateKey,
    encodedHeader,
    sealContext,
  );

  const signedHeader: SignedJamHeader = {
    ...header,
    blockSeal: seal,
  };

  return {
    header: signedHeader,
    extrinsics: data.extrinsics,
  };
};
