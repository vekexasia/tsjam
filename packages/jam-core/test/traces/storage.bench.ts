import { AppliedBlock, ChainManager, JamStateImpl } from "@/index";
import { getConstantsMode } from "@tsjam/constants";
import { assert, bench } from "vitest";
import packageJSON from "../../package.json";
import { buildHeaderLookupHistory, tracesTestCase } from "./traces-common";
const testCase = tracesTestCase("storage", "00000013");

testCase.parentBlock.posteriorState = JamStateImpl.fromMerkleMap(
  testCase.preState.merkleMap,
);
testCase.parentBlock.posteriorState.headerLookupHistory =
  buildHeaderLookupHistory("storage", 12);
testCase.parentBlock.posteriorState.headerLookupHistory.elements.set(
  testCase.parentBlock.header.slot,
  testCase.parentBlock.header.signedHash(),
);
bench.skipIf(
  packageJSON["jam:protocolVersion"] === "0.7.1" ||
    getConstantsMode() === "full",
)(
  "Storage bench",
  async () => {
    const chainManager = await ChainManager.build(
      <AppliedBlock>testCase.parentBlock,
    );
    const [err] = (
      await chainManager.handleIncomingBlock(testCase.block)
    ).safeRet();
    assert(!err);
  },
  { time: 30000 },
);
