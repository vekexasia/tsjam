import { BaseJamCodecable, codec, JamCodecable } from "@tsjam/codec";
import { JamBlock } from "@tsjam/types";
import { JamBlockExtrinsicsImpl } from "./JamBlockExtrinsicsImpl";
import { JamStateImpl } from "./JamStateImpl";
import { JamSignedHeaderImpl } from "./JamSignedHeaderImpl";

/**
 * codec: $(0.7.1 - C.16)
 */
@JamCodecable()
export class JamBlockImpl extends BaseJamCodecable implements JamBlock {
  @codec(JamSignedHeaderImpl)
  header!: JamSignedHeaderImpl;

  @codec(JamBlockExtrinsicsImpl, "extrinsic")
  extrinsics!: JamBlockExtrinsicsImpl;

  isParentOf(block: JamBlockImpl): boolean {
    return this.header.signedHash() === block.header.parent;
  }

  static create(_curState: JamStateImpl) {
    // const offenders: ED25519PublicKey[] = [];
    // const extrinsics = {
    //   disputes: {
    //     faults: [],
    //     culprit: [],
    //     verdicts: [],
    //   },
    //   tickets: [],
    //   preimages: [],
    //   assurances: [],
    //   reportGuarantees: [],
    // } as unknown as JamBlock["extrinsics"];
    // const p_tau: Posterior<Tau> = toPosterior(Timekeeping.bigT());
    // const p_entropy = curState.entropy.toPosterior(curState, {
    //   p_tau,
    //   // NOTE:this is wrong but we dont need eta1
    //   vrfOutputHash: Bandersnatch.vrfOutputSignature(curState.entropySource),
    // });
    // curState.const[(disputesError, p_disputes)] = disputesSTF(
    //   {
    //     kappa: curState.kappa,
    //     curTau: data.previousBlock.header.timeSlotIndex,
    //     lambda: curState.lambda,
    //     extrinsic: extrinsics.disputes,
    //   },
    //   curState.disputes,
    // ).safeRet();
    // if (disputesError) {
    //   throw new Error("Disputes error");
    // }
    // const [, [, p_kappa, ,]] = rotateKeys(
    //   {
    //     p_offenders: toPosterior(p_disputes.offenders),
    //     iota: curState.iota,
    //     tau: curState.tau,
    //     p_tau,
    //   },
    //   [
    //     curState.safroleState.gamma_p,
    //     curState.kappa,
    //     curState.lambda,
    //     curState.safroleState.gamma_z,
    //   ],
    // ).safeRet();
    // const [, p_gammaS] = gamma_sSTF(
    //   {
    //     tau: data.previousBlock.header.timeSlotIndex,
    //     p_tau,
    //     p_eta2: toPosterior(p_eta2),
    //     gamma_a: curState.safroleState.gamma_a,
    //     p_kappa,
    //   },
    //   curState.safroleState.gamma_s,
    // ).safeRet();
    // const sealContext = sealSignContext(p_tau, toPosterior(p_eta3), p_gammaS);
    // const vrfOutputHash = Bandersnatch.vrfOutputSeed(
    //   data.bandersnatchPrivateKey,
    //   sealContext,
    // );
    // const header: JamHeader = {
    //   parent:
    //     curState.beta.recentHistory[curState.beta.recentHistory.length - 1]
    //       .headerHash,
    //   offenders,
    //   extrinsicHash: computeExtrinsicHash(extrinsics),
    //   timeSlotIndex: p_tau, // $(0.7.1 - 6.1)
    //   priorStateRoot: merkelizeState(curState) as StateRootHash,
    //   blockAuthorKeyIndex: p_kappa.findIndex(
    //     (a) => a.ed25519.bigint === data.validator.ed25519.bigint,
    //   ) as ValidatorIndex,
    //   entropySignature: Bandersnatch.sign(
    //     data.bandersnatchPrivateKey,
    //     new Uint8Array([]), // message
    //     new Uint8Array([...JAM_ENTROPY, ...bigintToBytes(vrfOutputHash, 32)]),
    //   ),
    // };
    // const encodedHeader = encodeWithCodec(UnsignedHeaderCodec(), header);
    // const seal: BandersnatchSignature = Bandersnatch.sign(
    //   data.bandersnatchPrivateKey,
    //   encodedHeader,
    //   sealContext,
    // );
    // const signedHeader: SignedJamHeader = {
    //   ...header,
    //   blockSeal: seal,
    // };
    // return {
    //   header: signedHeader,
    //   extrinsics,
    // };
  }
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  const { getCodecFixtureFile } = await import("@/test/codec_utils.js");
  describe("JamBlockImpl", () => {
    it("block.bin", () => {
      const bin = getCodecFixtureFile("block.bin");
      const { value: header } = JamBlockImpl.decode(bin);
      console.log(header.toJSON(), "a");
      expect(Buffer.from(header.toBinary()).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
    it("block.json", () => {
      const json = JSON.parse(
        Buffer.from(getCodecFixtureFile("block.json")).toString("utf8"),
      );
      const block: JamBlockImpl = JamBlockImpl.fromJSON(json);
      expect(block.toJSON()).to.deep.eq(json);
    });
  });
}
