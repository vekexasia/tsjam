import fs from "fs";
import {
  AuthorizerPoolCodec,
  Blake2bHashCodec,
  codec_Eg,
  createArrayLengthDiscriminator,
  createCodec,
  createSequenceCodec,
  E_sub,
  E_sub_int,
  Ed25519PubkeyCodec,
  eitherOneOfCodec,
  HashCodec,
  JamCodec,
  MerkleTreeRootCodec,
  OpaqueHashCodec,
  Optional,
  ValidatorDataCodec,
  WorkPackageHashCodec,
  WorkReportCodec,
} from "@tsjam/codec";
import { CORES, EPOCH_LENGTH, NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import {
  Hash,
  AuthorizerPool,
  DoubleDagger,
  ED25519PublicKey,
  EG_Extrinsic,
  Gas,
  JamState,
  OpaqueHash,
  Posterior,
  RecentHistory,
  RecentHistoryItem,
  RHO,
  ServiceIndex,
  Tau,
  u32,
  u64,
  WorkPackageHash,
  AccumulationHistory,
  AccumulationQueue,
  HeaderLookupHistory,
  ServiceAccount,
  Delta,
} from "@tsjam/types";
import { toPosterior } from "@tsjam/utils";
import { vi, it, describe, beforeEach } from "vitest";
import { mapCodec } from "@tsjam/codec";
import { logCodec } from "@tsjam/codec/test/utils.js";
import { assertEGValid } from "@/validateEG";

const mocks = vi.hoisted(() => {
  return {
    CORES: 341,
  };
});
vi.mock("@tsjam/constants", async (importOriginal) => {
  const toRet = {
    ...(await importOriginal<typeof import("@tsjam/constants")>()),
    ...mocks,
  };
  Object.defineProperty(toRet, "CORES", {
    get() {
      return mocks.CORES;
    },
  });
  return toRet;
});

type TestState = {
  dd_rho: DoubleDagger<RHO>;

  p_kappa: Posterior<JamState["kappa"]>;
  p_lambda: Posterior<JamState["lambda"]>;
  p_entropy: Posterior<JamState["entropy"]>;
  p_psi_o: ED25519PublicKey[];
  blockHistory: RecentHistory;
  authPool: AuthorizerPool;
  deltaServices: Array<{
    id: ServiceIndex;
    info: {
      codeHash: OpaqueHash;
      balance: u64;
      minItemGas: Gas;
      minMemoGas: Gas;
      bytes: u64;
      items: u32;
    };
  }>;
};
type Input = {
  eg: EG_Extrinsic;
  // H_t
  tau: Posterior<Tau>;
};
type Output = {
  reportedPackages: Array<{
    workPackageHash: WorkPackageHash;
    segmentTreeRoot: OpaqueHash;
  }>;
  reporters: Array<ED25519PublicKey>;
};
type TestCase = {
  input: Input;
  preState: TestState;
  output: { ok?: Output; err?: number };
  postState: TestState;
};
const buildTest = (filename: string, size: "tiny" | "full") => {
  const NUMVALS = (size === "tiny"
    ? 6
    : 1023) as unknown as typeof NUMBER_OF_VALIDATORS;
  const EPLEN = (size === "tiny" ? 12 : 600) as unknown as typeof EPOCH_LENGTH;
  const NCOR = (size === "tiny" ? 2 : 341) as unknown as typeof CORES;
  const stateCodec = createCodec<TestState>([
    [
      "dd_rho",
      createSequenceCodec<DoubleDagger<RHO>>(
        NCOR,
        new Optional(
          createCodec<NonNullable<RHO[0]>>([
            ["workReport", WorkReportCodec],
            ["reportTime", E_sub_int<Tau>(4)],
          ]),
        ),
      ),
    ],
    [
      "p_kappa",
      createSequenceCodec<Posterior<JamState["kappa"]>>(
        NUMVALS,
        ValidatorDataCodec,
      ),
    ],
    [
      "p_lambda",
      createSequenceCodec<Posterior<JamState["lambda"]>>(
        NUMVALS,
        ValidatorDataCodec,
      ),
    ],
    [
      "p_entropy",
      createSequenceCodec(4, Blake2bHashCodec) as unknown as JamCodec<
        Posterior<JamState["entropy"]>
      >,
    ],
    [
      "p_psi_o",
      createArrayLengthDiscriminator<ED25519PublicKey[]>(Ed25519PubkeyCodec),
    ],
    [
      "blockHistory",
      createArrayLengthDiscriminator<RecentHistory>(
        createCodec([
          ["headerHash", HashCodec],
          [
            "accumulationResultMMR",
            createArrayLengthDiscriminator<
              RecentHistoryItem["accumulationResultMMR"]
            >(new Optional(HashCodec)),
          ],
          ["stateRoot", MerkleTreeRootCodec],
          [
            "reportedPackages",
            mapCodec(
              createArrayLengthDiscriminator(
                createCodec<{ hash: WorkPackageHash; root: Hash }>([
                  ["hash", WorkPackageHashCodec],
                  ["root", HashCodec],
                ]),
              ),
              (x) => new Map(x.map((y) => [y.hash, y.root])),
              (y) =>
                Array.from(y.entries()).map(([hash, root]) => ({ hash, root })),
            ),
          ],
        ]),
      ),
    ],
    ["authPool", AuthorizerPoolCodec()],
    [
      "deltaServices",
      createArrayLengthDiscriminator<TestState["deltaServices"]>(
        createCodec<TestState["deltaServices"][0]>([
          ["id", E_sub_int<ServiceIndex>(4)],
          [
            "info",
            createCodec<TestState["deltaServices"][0]["info"]>([
              ["codeHash", OpaqueHashCodec],
              ["balance", E_sub<u64>(8)],
              ["minItemGas", E_sub<Gas>(8)],
              ["minMemoGas", E_sub<Gas>(8)],
              logCodec(["bytes", E_sub<u64>(8)]),
              logCodec(["items", E_sub_int<u32>(4)]),
            ]),
          ],
        ]),
      ),
    ],
  ]);

  const testBin = fs.readFileSync(
    `${__dirname}/../../../jamtestvectors/reports/${size}/${filename}.bin`,
  );

  const decoded = createCodec<TestCase>([
    [
      "input",
      createCodec<Input>([
        ["eg", codec_Eg],
        ["tau", E_sub_int<Posterior<Tau>>(4)],
      ]),
    ],
    ["preState", stateCodec],
    logCodec([
      "output",
      eitherOneOfCodec<TestCase["output"]>([
        [
          "ok",
          createCodec<Output>([
            [
              "reportedPackages",
              createArrayLengthDiscriminator<Output["reportedPackages"]>(
                createCodec([
                  ["workPackageHash", WorkPackageHashCodec],
                  ["segmentTreeRoot", OpaqueHashCodec],
                ]),
              ),
            ],
            ["reporters", createArrayLengthDiscriminator(Ed25519PubkeyCodec)],
          ]),
        ],
        ["err", E_sub_int<number>(1)],
      ]),
    ]),
    ["postState", stateCodec],
  ]).decode(testBin).value;

  throw new Error("baqnan");
  const [err] = assertEGValid(decoded.input.eg, {
    rho: decoded.preState.dd_rho,
    dd_rho: decoded.preState.dd_rho,
    delta: <Delta>new Map<ServiceIndex, ServiceAccount>(
      decoded.preState.deltaServices.map(({ id, info }) => {
        return [id, { codeHash: info.codeHash } as unknown as ServiceAccount];
      }),
    ),
    p_tau: decoded.input.tau,
    p_kappa: decoded.preState.p_kappa,
    p_lambda: decoded.preState.p_lambda,
    p_entropy: decoded.preState.p_entropy,
    p_psi_o: toPosterior(new Set(decoded.preState.p_psi_o)),
    recentHistory: decoded.preState.blockHistory,

    // au: decoded.preState.authPool, //FIXME: authpool???
    accumulationHistory: [] as unknown as AccumulationHistory,
    accumulationQueue: [] as unknown as AccumulationQueue,
    headerLookupHistory: new Map() as HeaderLookupHistory,
  }).safeRet();

  console.log(err);

  console.log(decoded.output);
};
describe("workreports", () => {
  beforeEach(() => {
    mocks.CORES = 2;
  });
  it("anchor_not_recent-1", () => {
    buildTest("anchor_not_recent-1", "tiny");
  });
});
