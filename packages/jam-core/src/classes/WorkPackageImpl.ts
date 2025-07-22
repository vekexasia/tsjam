import {
  ArrayOfJSONCodec,
  BaseJamCodecable,
  binaryCodec,
  BufferJSONCodec,
  codec,
  createArrayLengthDiscriminator,
  eSubIntCodec,
  hashCodec,
  JamCodecable,
  jsonCodec,
  LengthDiscrimantedIdentity,
} from "@tsjam/codec";
import { MAXIMUM_WORK_ITEMS } from "@tsjam/constants";
import {
  Authorization,
  AuthorizationParams,
  BoundedSeq,
  CodeHash,
  ServiceIndex,
  WorkPackage,
} from "@tsjam/types";
import { WorkContextImpl } from "./WorkContextImpl";
import { WorkItemImpl } from "./WorkItemImpl";

// codec order defined in $(0.7.0 - C.28)
@JamCodecable()
export class WorkPackageImpl extends BaseJamCodecable implements WorkPackage {
  /**
   * `h` - index of the service that hosts the authorization code
   */
  @eSubIntCodec(4, "auth_code_host")
  authCodeHost!: ServiceIndex;

  /**
   * `u` - authorization code hash
   */
  @hashCodec()
  authCodeHash!: CodeHash;

  /**
   * `bold c` - context
   */
  @codec(WorkContextImpl)
  context!: WorkContextImpl;

  /**
   * `j`
   */
  @jsonCodec(BufferJSONCodec())
  @binaryCodec(LengthDiscrimantedIdentity)
  authToken!: Authorization;

  /**
   * `bold f` - configuration blob
   */
  @jsonCodec(BufferJSONCodec())
  @binaryCodec(LengthDiscrimantedIdentity)
  authConfig!: AuthorizationParams;

  /**
   * `bold w` - sequence of work items
   */
  @jsonCodec(ArrayOfJSONCodec(WorkItemImpl))
  @binaryCodec(createArrayLengthDiscriminator(WorkItemImpl))
  workItems!: BoundedSeq<WorkItemImpl, 1, typeof MAXIMUM_WORK_ITEMS>;
}
