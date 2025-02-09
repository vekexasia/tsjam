import { Ixdb } from "@/index";
import { expect, describe, it } from "vitest";
import { PVMIx } from "@tsjam/types";

describe("ixdb", () => {
  it("should be defined", () => {
    expect(Ixdb).toBeDefined();

    const ixs: Array<{
      opCode: number;
      identifier: number;
      ix: { decode: any; gasCost: number };
    }> = <any>[...Ixdb.byCode.values()];
    const byType: Record<string, Array<(typeof ixs)[0]>> = {};
    for (const ix of ixs) {
      console.log(ix);
      let type = (ix.ix.decode as any).type || "MissingIxsDecoder";
      type = type.replace("IxsDecoder", "");

      byType[type] = byType[type] || [];
      byType[type].push(ix);
    }
    for (const [type, ixs] of Object.entries(byType)) {
      console.log(`// Init ${type}`);
      console.log(`
type ${type}Args = ReturnType<${type}IxsDecoder>;
interface ${type}Ixs {
`);
      for (const ix of ixs) {
        console.log(`  
    /**
     * ${ix.opCode}
    **/
    ${ix.identifier}(args: ${type}Args): PVMIxReturnMods;
`);
      }
      console.log("}");
      console.log("");
    }
  });
});
