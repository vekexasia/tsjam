import * as fs from "node:fs";

export const getCodecFixtureFile = (filename: string): Uint8Array => {
  return new Uint8Array(
    fs.readFileSync(
      new URL(`./fixtures/${filename}`, import.meta.url).pathname,
    ),
  );
};

export const getUTF8FixtureFile = (filename: string): string => {
  return fs.readFileSync(
    new URL(`./fixtures/${filename}`, import.meta.url).pathname,
    "utf8",
  );
};
