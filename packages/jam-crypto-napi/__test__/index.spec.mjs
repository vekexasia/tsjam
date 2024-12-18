import test from "ava";

import {
  ringRoot,
  ringVrfOutputHash,
  ietfVrfSign,
  ietfVrfOutputHash,
  ietfVrfOutputHashFromSecret,
  ietfVrfVerify,
  publicKey,
} from "../index.js";

test("ietf", (t) => {
  const seed = Buffer.from([42]);
  const inputData = Buffer.from("vekexasia", "utf8");
  const auxData = Buffer.from("context", "utf8");
  const signature = ietfVrfSign(seed, inputData, auxData);
  t.is(ietfVrfVerify(publicKey(seed), inputData, auxData, signature), true);

  const outputhash = ietfVrfOutputHash(signature);
  const outputHash2 = ietfVrfOutputHashFromSecret(seed, inputData);
  t.is(outputhash.toString("hex"), outputHash2.toString("hex"));
});
/**/
