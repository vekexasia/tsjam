import { instantiate } from "@asm";
export type {
  __Internref17 as WasmPVM,
  __Internref11 as WasmPVMMemory,
} from "@asm";
import { __AdaptedExports } from "@asm";
export type WasmPVMModule = typeof __AdaptedExports;
const mod = await (async (url) =>
  await (async () => {
    const isNodeOrBun =
      typeof process != "undefined" &&
      process.versions != null &&
      (process.versions.node != null || process.versions.bun != null);
    if (isNodeOrBun) {
      return WebAssembly.compile(
        await (await import("node:fs/promises")).readFile(url),
      );
    } else {
      return await WebAssembly.compileStreaming(globalThis.fetch(url));
    }
  })())(new URL("./asm/index.wasm", import.meta.url));

/**
 * Creates a new instance of the PVM WebAssembly module
 */
export const newPVM = () => instantiate(mod, { env: null });
