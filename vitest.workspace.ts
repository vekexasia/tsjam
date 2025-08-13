import { defineWorkspace } from "vitest/config";
import { buildVitest } from "./build/buildVitest";

export default defineWorkspace([
  ...buildVitest("jam-codec"),
  ...buildVitest("jam-core"),
  ...buildVitest("jam-fuzzer-target"),
]);
