import {
  BaseJamCodecable,
  JamCodecable,
  binaryCodec,
  jsonCodec,
  codec,
  LengthDiscrimantedIdentityCodec,
  mapCodec,
  eSubIntCodec,
} from "@tsjam/codec";
import { Version } from "./version";
import type { u32, u8 } from "@tsjam/types";
import packageJSON from "../../package.json";
import { getConstantsMode } from "@tsjam/constants";

const Utf8JSONCodec = {
  fromJSON(json: string) {
    return json;
  },
  toJSON(value: string) {
    return value;
  },
};

@JamCodecable()
export class PeerInfo extends BaseJamCodecable {
  @eSubIntCodec(1, "fuzz_version")
  fuzzVersion!: u8;

  @eSubIntCodec(4, "fuzz_features")
  features!: u32;

  @codec(Version, "jam_version")
  jamVersion!: Version;

  @codec(Version, "app_version")
  appVersion!: Version;

  @jsonCodec(Utf8JSONCodec, "app_name")
  @binaryCodec(
    mapCodec(
      LengthDiscrimantedIdentityCodec,
      (b) => Buffer.from(b).toString("utf8"),
      (s) => Buffer.from(s, "utf8"),
    ),
  )
  name!: string;

  static build(): PeerInfo {
    const toRet = new PeerInfo();
    toRet.fuzzVersion = <u8>1;
    toRet.name = `tsjam-${packageJSON["version"]}-${getConstantsMode()}-$$commit$$`;
    toRet.features = <u32>(1 | // ancestors
      2); // simple forking

    toRet.jamVersion = new Version();
    toRet.jamVersion.major = <u8>(
      parseInt(packageJSON["jam:protocolVersion"].split(".")[0])
    );
    toRet.jamVersion.minor = <u8>(
      parseInt(packageJSON["jam:protocolVersion"].split(".")[1])
    );
    toRet.jamVersion.patch = <u8>(
      parseInt(packageJSON["jam:protocolVersion"].split(".")[2])
    );
    toRet.appVersion = new Version();
    toRet.appVersion.major = <u8>parseInt(packageJSON["version"].split(".")[0]);
    toRet.appVersion.minor = <u8>parseInt(packageJSON["version"].split(".")[1]);
    toRet.appVersion.patch = <u8>parseInt(packageJSON["version"].split(".")[2]);
    return toRet;
  }
}
