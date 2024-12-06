import * as fs from "node:fs";

export const getCodecFixtureFile = (filename: string): Uint8Array => {
  return new Uint8Array(
    fs.readFileSync(
      new URL(`../../../jamtestvectors/codec/data/${filename}`, import.meta.url)
        .pathname,
    ),
  );
};
