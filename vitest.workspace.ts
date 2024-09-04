import { defineWorkspace } from "vitest/config";
import { buildVitest } from "./build/buildVitest";

export default defineWorkspace([
  ...buildVitest("jam-codec"),
  ...buildVitest("jam-pvm"),
  ...buildVitest("jam-safrole"),
  ...buildVitest("jam-work"),
  ...buildVitest("jam-recenthistory"),
]);
