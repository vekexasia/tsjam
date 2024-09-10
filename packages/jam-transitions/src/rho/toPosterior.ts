import {
  DoubleDagger,
  EG_Extrinsic,
  Posterior,
  RHO,
  SafroleState,
  Tau,
} from "@vekexasia/jam-types";
import assert from "node:assert";
import { Ed25519, Hashing } from "@vekexasia/jam-crypto";
import {
  CORES,
  JAM_GUARANTEE,
  MAXIMUM_AGE_LOOKUP_ANCHOR,
  NUMBER_OF_VALIDATORS,
  VALIDATOR_CORE_ROTATION,
  WORK_TIMEOUT,
} from "@vekexasia/jam-constants";
import { newSTF } from "@vekexasia/jam-utils";
import { WorkReportCodec } from "@vekexasia/jam-codec";
import { G_Star, GuarantorsAssignment } from "@/garantorsAssignment.js";
import {_w} from "@/utilityComputations/w.js";

export const RHO_toPosterior = newSTF<
  DoubleDagger<RHO>,
  {
    EG_Extrinsic: EG_Extrinsic;
    kappa: SafroleState["kappa"];
    p_tau: Posterior<Tau>;
    p_G: Posterior<GuarantorsAssignment>;
    p_G_star: Posterior<G_Star>;
  },
  Posterior<RHO>
>({
  apply(
    input: {
      EG_Extrinsic: EG_Extrinsic;
      kappa: SafroleState["kappa"];
      p_tau: Posterior<Tau>;
    },
    curState: DoubleDagger<RHO>,
  ): Posterior<RHO> {
    return curState.map((w, coreIndex: number) => {
      const ext = input.EG_Extrinsic.find(
        ({ workReport }) => workReport.coreIndex === coreIndex,
      );
      if (ext === undefined) {
        return w;
      }
      return {
        workReport: ext.workReport,
        reportTime: input.p_tau,
      };
    }) as Posterior<RHO>;
  },

  assertInputValid(input, curState) {
    const ext = input.EG_Extrinsic;
    if (ext.length == 0) {
      return; // optimization
    }
    // (136)
    assert(ext.length <= CORES, "Extrinsic length must be less than CORES");

    // (137) - make sure they're ordered by coreindex
    ext.reduce((acc, next) => {
      assert(
        next.workReport.coreIndex > acc.workReport.coreIndex,
        "core index must be unique and ordered",
      );
      assert(
        next.workReport.coreIndex < CORES && next.workReport.coreIndex >= 0,
        "core index not in bounds",
      );
      return next;
    });

    // (138) - make sure the credentials are ordered by validatorIndex
    ext.forEach(({ workReport, credential }) => {
      assert(
        credential.length >= 2 && credential.length <= 3,
        "credential length must be between 2 and 3",
      );
      let prev = credential[0];
      for (let i = 1; i < credential.length; i++) {
        const next = credential[i];
        assert(
          next.validatorIndex > prev.validatorIndex,
          "validator index must be unique and ordered",
        );
        prev = next;
      }
      // it must be withing boundaries
      credential.forEach((cred) => {
        assert(
          cred.validatorIndex >= 0 ||
            cred.validatorIndex < NUMBER_OF_VALIDATORS,
          "validator index must be 0 <= x < V",
        );
      });

      // check signature (139)
      const workReportBuf = new Uint8Array(
        WorkReportCodec.encodedSize(workReport),
      );
      WorkReportCodec.encode(workReport, workReportBuf);
      const wrh = Hashing.blake2bBuf(workReportBuf);

      const messageToSign = new Uint8Array([...JAM_GUARANTEE, ...wrh]);

      credential.forEach(({ signature, validatorIndex }) => {
        const isValid = Ed25519.verifySignature(
          signature,
          input.kappa[validatorIndex].ed25519,
          messageToSign,
        );
        assert(isValid, "EG signature is invalid");
      });
    });

    // (139) check second expression
    const curRotation = Math.floor(input.p_tau / VALIDATOR_CORE_ROTATION);
    ext.forEach(({ workReport, timeSlot, credential }) => {
      let G: GuarantorsAssignment = input.p_G_star;
      if (curRotation !== Math.floor(timeSlot / VALIDATOR_CORE_ROTATION)) {
        G = input.p_G;
      }

      credential.forEach(({ validatorIndex }) => {
        assert(
          workReport.coreIndex === G.validatorsAssignedCore[validatorIndex],
          "Core index must match",
        );
        assert(
          VALIDATOR_CORE_ROTATION *
            Math.floor(input.p_tau / VALIDATOR_CORE_ROTATION) -
            1 <=
            timeSlot,
          "Time slot must be within bounds, R * floor(tau'/R) - 1 <= t",
        );
        assert(
          timeSlot <= input.p_tau,
          "Time slot must be within bounds, t <= tau'",
        );
      });
    });

    // (141)
    const w = _w(input.EG_Extrinsic);

    // (142) - no reports can be placed in core when there is something pending
    // and that pending stuff is not expird
    w.forEach(({ coreIndex }) => {
      assert(
        curState[coreIndex] === null ||
          input.p_tau >= curState[coreIndex]!.reportTime + WORK_TIMEOUT,
        "Bit may be set if the corresponding core has a report pending availability",
      );
    });

    // (144)
    const x = w.map(({ refinementContext }) => refinementContext);
    const p = w.map(
      ({ workPackageSpecification }) =>
        workPackageSpecification.workPackageHash,
    );

    // (145)
    assert(new Set(p).size === p.length, "Work package hash must be unique");

    // (147) each lookup anchor block within `L` timeslot
    x.forEach((refinementContext) => {
      assert(
        refinementContext.lookupAnchor.timeSlot >=
          input.p_tau - MAXIMUM_AGE_LOOKUP_ANCHOR,
        "Lookup anchor block must be within L timeslots",
      );
    });
  },

  assertPStateValid() {},
});
