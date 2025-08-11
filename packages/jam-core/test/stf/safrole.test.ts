import { DisputesStateImpl } from "@/classes/DisputesStateImpl.js";
import { HeaderEpochMarkerImpl } from "@/classes/HeaderEpochMarkerImpl.js";
import { JamEntropyImpl } from "@/classes/JamEntropyImpl.js";
import { JamHeaderImpl } from "@/classes/JamHeaderImpl.js";
import { JamStateImpl } from "@/classes/JamStateImpl.js";
import { KappaImpl } from "@/classes/KappaImpl.js";
import { LambdaImpl } from "@/classes/LambdaImpl.js";
import { SafroleStateImpl } from "@/classes/SafroleStateImpl.js";
import { SlotImpl, TauImpl } from "@/classes/SlotImpl.js";
import { TicketImpl } from "@/classes/TicketImpl.js";
import { ValidatorsImpl } from "@/classes/ValidatorsImpl.js";
import { TicketsExtrinsicImpl } from "@/classes/extrinsics/tickets.js";
import { HashCodec } from "@/codecs/miscCodecs.js";
import {
  BaseJamCodecable,
  binaryCodec,
  codec,
  E_sub_int,
  eitherOneOfCodec,
  JamCodec,
  JamCodecable,
  jsonCodec,
  optionalCodec,
} from "@tsjam/codec";
import { EPOCH_LENGTH } from "@tsjam/constants";
import { OpaqueHash, Posterior, SeqOfLength } from "@tsjam/types";
import { toPosterior, toTagged } from "@tsjam/utils";
import * as fs from "node:fs";
import { describe, expect, it } from "vitest";
import { dummyState } from "../utils";

@JamCodecable()
class TestState extends BaseJamCodecable {
  @codec(SlotImpl)
  tau!: TauImpl;

  @codec(JamEntropyImpl)
  eta!: JamEntropyImpl;

  @codec(LambdaImpl)
  lambda!: JamStateImpl["lambda"];

  @codec(KappaImpl)
  kappa!: JamStateImpl["kappa"];

  @codec(SafroleStateImpl.codecOf("gamma_p"))
  gamma_p!: SafroleStateImpl["gamma_p"];

  @codec(ValidatorsImpl)
  iota!: JamStateImpl["iota"];

  @codec(SafroleStateImpl.codecOf("gamma_a"))
  gamma_a!: SafroleStateImpl["gamma_a"];

  @codec(SafroleStateImpl.codecOf("gamma_s"))
  gamma_s!: SafroleStateImpl["gamma_s"];

  @codec(SafroleStateImpl.codecOf("gamma_z"))
  gamma_z!: SafroleStateImpl["gamma_z"];

  @codec(DisputesStateImpl.codecOf("offenders"))
  p_psi_o!: Posterior<DisputesStateImpl["offenders"]>;
}

@JamCodecable()
class TestInput extends BaseJamCodecable {
  @codec(SlotImpl)
  slot!: Posterior<TauImpl>;

  @codec(HashCodec)
  entropy!: OpaqueHash; // Y(Hv)

  @codec(TicketsExtrinsicImpl)
  extrinsic!: TicketsExtrinsicImpl;
}

@JamCodecable()
class TestOutputOk extends BaseJamCodecable {
  @optionalCodec(HeaderEpochMarkerImpl)
  epochMark?: HeaderEpochMarkerImpl;
  @codec(JamHeaderImpl.codecOf("ticketsMark"))
  ticketsMark?: SeqOfLength<TicketImpl, typeof EPOCH_LENGTH>;
}

@JamCodecable()
class TestCase extends BaseJamCodecable {
  @codec(TestInput)
  input!: TestInput;

  @codec(TestState)
  preState!: TestState;

  @jsonCodec({
    fromJSON(json) {
      if (json.ok) {
        return { ok: TestOutputOk.fromJSON(json.ok) };
      } else {
        return { error: json.error };
      }
    },
    toJSON(value) {
      if (value.ok) {
        return { ok: TestOutputOk.toJSON(value.ok) };
      } else {
        return { error: value.error };
      }
    },
  })
  @binaryCodec(
    eitherOneOfCodec<TestCase["output"]>([
      ["ok", <JamCodec<TestOutputOk>>TestOutputOk],
      ["error", E_sub_int(1)],
    ]),
  )
  output!: { ok?: TestOutputOk; error?: number };

  @codec(TestState)
  postState!: TestState;
}

const buildTest = (name: string, size: "tiny" | "full") => {
  const testBin = fs.readFileSync(
    `${__dirname}/../../../../jamtestvectors/stf/safrole/${size}/${name}.bin`,
  );
  const { value: testCase } = TestCase.decode(testBin);

  const safrole = new SafroleStateImpl({
    gamma_a: testCase.preState.gamma_a,
    gamma_p: testCase.preState.gamma_p,
    gamma_s: testCase.preState.gamma_s,
    gamma_z: testCase.preState.gamma_z,
  });

  const curState = dummyState();
  curState.slot = testCase.preState.tau;
  curState.entropy = testCase.preState.eta;
  curState.lambda = testCase.preState.lambda;
  curState.kappa = testCase.preState.kappa;
  curState.iota = testCase.preState.iota;
  curState.safroleState = safrole;

  const p_tau = testCase.input.slot.checkPTauValid(testCase.preState.tau);

  if (p_tau.isErr()) {
    throw new Error(p_tau.error);
  }

  const p_entropy = curState.entropy.toPosterior(curState, {
    p_tau: p_tau.value,
    vrfOutputHash: testCase.input.entropy,
  });

  const p_gamma_p = safrole.gamma_p.toPosterior(curState, {
    p_tau: p_tau.value,
    p_offenders: testCase.preState.p_psi_o,
  });

  const p_gamma_z = safrole.gamma_z.toPosterior(curState, {
    p_tau: p_tau.value,
    p_gamma_p,
  });

  const [newTicketsErr, newTickets] = testCase.input.extrinsic
    .newTickets({
      p_tau: p_tau.value,
      p_gamma_z,
      gamma_a: safrole.gamma_a,
      p_entropy,
    })
    .safeRet();

  if (newTicketsErr) {
    throw new Error(newTicketsErr);
  }

  const [gammaAErr, p_gamma_a] = safrole.gamma_a
    .toPosterior(curState, {
      p_tau: p_tau.value,
      newTickets,
    })
    .safeRet();

  if (gammaAErr) {
    throw new Error(gammaAErr);
  }

  const p_kappa = curState.kappa.toPosterior(curState, {
    p_tau: p_tau.value,
  });
  const p_lambda = curState.lambda.toPosterior(curState, {
    p_tau: p_tau.value,
  });

  const p_gamma_s = safrole.gamma_s.toPosterior(curState, {
    p_tau: p_tau.value,
    p_eta2: toPosterior(p_entropy._2),
    p_kappa: toTagged(p_kappa),
  });

  expect(p_gamma_a.toJSON(), "gamma_a").deep.eq(
    testCase.postState.gamma_a.toJSON(),
  );
  expect(p_gamma_p.toJSON(), "gamma_p").deep.eq(
    testCase.postState.gamma_p.toJSON(),
  );
  expect(p_gamma_s.toJSON(), "gamma_s").deep.eq(
    testCase.postState.gamma_s.toJSON(),
  );
  expect(p_gamma_z.toJSON(), "gamma_z").deep.eq(
    testCase.postState.gamma_z.toJSON(),
  );
  expect(p_kappa.toJSON()).deep.eq(testCase.postState.kappa.toJSON());
  expect(p_lambda.toJSON()).deep.eq(testCase.postState.lambda.toJSON());
  // expect(newState.tau).deep.eq(testCase.postState.tau);
  expect(p_entropy.toJSON()).deep.eq(testCase.postState.eta.toJSON());
  // TODO: output
  HeaderEpochMarkerImpl;
};

describe("safrole-test-vectors", () => {
  describe("full", () => {
    const test = (name: string) => buildTest(name, "full");
    it("enact-epoch-change-with-no-tickets-1", () =>
      test("enact-epoch-change-with-no-tickets-1"));
    it("enact-epoch-change-with-no-tickets-2", () =>
      expect(() => test("enact-epoch-change-with-no-tickets-2")).toThrow(
        "POSTERIOR_TAU_LESS_OR_EQUAL_TAU",
      ));
    it("enact-epoch-change-with-no-tickets-3", () =>
      test("enact-epoch-change-with-no-tickets-3"));
    it("enact-epoch-change-with-no-tickets-4", () =>
      test("enact-epoch-change-with-no-tickets-4"));
    it("skip-epoch-tail-1", () => test("skip-epoch-tail-1"));
    it("skip-epochs-1", () => test("skip-epochs-1"));
    it("publish-tickets-no-mark-1", () =>
      expect(() => test("publish-tickets-no-mark-1")).toThrow(
        "Entry index must be 0<=x<N",
      ));
    it("publish-tickets-no-mark-2", () => test("publish-tickets-no-mark-2"));
    it("publish-tickets-no-mark-3", () =>
      expect(() => test("publish-tickets-no-mark-3")).toThrow(
        "Ticket id already in gamma_a",
      ));
    it("publish-tickets-no-mark-4", () =>
      expect(() => test("publish-tickets-no-mark-4")).toThrow(
        "VRF outputs must be in ascending order and not duplicate",
      ));
    it("publish-tickets-no-mark-5", () =>
      expect(() => test("publish-tickets-no-mark-5")).toThrow(
        "Invalid VRF proof",
      ));
    it("publish-tickets-no-mark-6", () => test("publish-tickets-no-mark-6"));
    it("publish-tickets-no-mark-7", () =>
      expect(() => test("publish-tickets-no-mark-7")).toThrow(
        "Lottery has ended",
      ));
    it("publish-tickets-no-mark-8", () => test("publish-tickets-no-mark-8"));
    it("publish-tickets-no-mark-9", () => test("publish-tickets-no-mark-9"));
    it("publish-tickets-with-mark-1", () =>
      test("publish-tickets-with-mark-1"));
    it("publish-tickets-with-mark-2", () =>
      test("publish-tickets-with-mark-2"));
    it("publish-tickets-with-mark-3", () =>
      test("publish-tickets-with-mark-3"));
    it("publish-tickets-with-mark-4", () =>
      test("publish-tickets-with-mark-4"));
    it("publish-tickets-with-mark-5", () =>
      test("publish-tickets-with-mark-5"));
    it("enact-epoch-change-with-padding-1", () =>
      test("enact-epoch-change-with-padding-1"));
  });
});
