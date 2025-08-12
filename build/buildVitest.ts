import { defineWorkspace } from "vitest/config";
import path from "path";

export const buildAliases = (import_meta_url: string) => {
  return {
    "@/test": new URL("./test/", import_meta_url).pathname,
    "@/": new URL("./src/", import_meta_url).pathname,
    "@tsjam/codec": new URL("../jam-codec/", import_meta_url).pathname,
    "@tsjam/types": new URL("../jam-types/", import_meta_url).pathname,
    "@tsjam/utils": new URL("../jam-utils/", import_meta_url).pathname,
    "@tsjam/crypto": new URL("../jam-crypto/", import_meta_url).pathname,
    "@tsjam/crypto-napi": new URL("../jam-crypto-napi/", import_meta_url)
      .pathname,
  };
};

export const buildVitest = (project: string) => {
  const root = path.join(__dirname, "..", "packages", project);
  return defineWorkspace([
    {
      extends: path.join(__dirname, "vitest.config.mts"),
      root,
      test: {
        name: project,
        alias: buildAliases(new URL(".", `file://${root}/package.json`).href),
      },
    },
  ]);
};
