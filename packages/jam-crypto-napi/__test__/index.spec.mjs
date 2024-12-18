import test from "ava";

import {
  ringRoot,
  ringVrfOutputHash,
  ietfVrfSign,
  ietfVrfOutputHash,
  ietfVrfOutputHashFromSecret,
  ietfVrfVerify,
  publicKey,
  secretKey,
  secretFromSecret,
} from "../index.js";

test("ietf", (t) => {
  const seed = Buffer.from([42]);
  const inputData = Buffer.from("vekexasia", "utf8");
  const auxData = Buffer.from("context", "utf8");
  const _secret = secretKey(seed);
  console.log(_secret.toString("hex"));
  console.log(publicKey(seed).toString("hex"));
  console.log(secretFromSecret(_secret).toString("hex"));
  console.log(secretFromSecret(Buffer.alloc(32).fill(42)).toString("hex"));

  const signature = ietfVrfSign(seed, inputData, auxData);
  t.is(ietfVrfVerify(publicKey(seed), inputData, auxData, signature), true);

  const outputhash = ietfVrfOutputHash(signature);
  const outputHash2 = ietfVrfOutputHashFromSecret(seed, inputData);
  t.is(outputhash.toString("hex"), outputHash2.toString("hex"));
});
/**/
