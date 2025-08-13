import {
  BaseJamCodecable,
  JamCodecable,
  binaryCodec,
  jsonCodec,
  codec,
  LengthDiscrimantedIdentityCodec,
  mapCodec,
} from "@tsjam/codec";
import { Version } from "./version";

const Utf8JSONCodec = {
  fromJSON(json: string) {
    return new Uint8Array(Buffer.from(json, "utf8"));
  },
  toJSON(value: Uint8Array) {
    return Buffer.from(value).toString("utf8");
  },
};

@JamCodecable()
export class PeerInfo extends BaseJamCodecable {
  @jsonCodec(Utf8JSONCodec)
  @binaryCodec(
    mapCodec(
      LengthDiscrimantedIdentityCodec,
      (b) => Buffer.from(b).toString("utf8"),
      (s) => Buffer.from(s, "utf8"),
    ),
  )
  name!: string;

  @codec(Version, "app_version")
  appVersion!: Version;

  @codec(Version, "jam_version")
  jamVersion!: Version;
}
