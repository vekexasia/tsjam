import { defineWorkspace } from "vitest/config";
import { buildVitest } from "./build/buildVitest";

export default defineWorkspace([
  ...buildVitest("jam-codec"),
  ...buildVitest("jam-pvm"),
  ...buildVitest("jam-merklization"),
  ...buildVitest("jam-core"),
  ...buildVitest("jam-transitions"),
  ...buildVitest("jam-testnet"),
]);
