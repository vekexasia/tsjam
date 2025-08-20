import {
  ArrayOfJSONCodec,
  BaseJamCodecable,
  binaryCodec,
  buildGenericKeyValueCodec,
  createSequenceCodec,
  E_sub,
  E_sub_int,
  eSubIntCodec,
  JamCodecable,
  jsonCodec,
  MapJSONCodec,
  NumberJSONCodec,
} from "@tsjam/codec";
import { CORES } from "@tsjam/constants";
import type {
  Gas,
  PrivilegedServices,
  SeqOfLength,
  ServiceIndex,
} from "@tsjam/types";
import type { ConditionalExcept } from "type-fest";

/**
 * Priv services impl
 * Codec is following the C(12) in $(0.7.1 - D.2)
 */
@JamCodecable()
export class PrivilegedServicesImpl
  extends BaseJamCodecable
  implements PrivilegedServices
{
  /**
   * `M` - the index of the blessed service
   */
  @eSubIntCodec(4)
  manager!: ServiceIndex;
  /**
   * `A`
   * services which can alter φ one for each CORE
   */
  @jsonCodec(ArrayOfJSONCodec(NumberJSONCodec()))
  @binaryCodec(createSequenceCodec(CORES, E_sub_int(4)))
  assigners!: SeqOfLength<ServiceIndex, typeof CORES>;
  /**
   * `V`
   * service which can alter ι
   */
  @eSubIntCodec(4)
  delegator!: ServiceIndex;

  @eSubIntCodec(4)
  registrar!: ServiceIndex;
  /**
   * map of services which are automatically accumulated in each block
   * along with their gas limits
   * `Z`
   */
  @jsonCodec(
    MapJSONCodec(
      { key: "service", value: "gas" },
      NumberJSONCodec(),
      NumberJSONCodec(),
    ),
  )
  @binaryCodec(
    buildGenericKeyValueCodec(E_sub_int(4), E_sub(8), (a, b) => a - b),
  )
  alwaysAccers!: Map<ServiceIndex, Gas>;

  constructor(config?: ConditionalExcept<PrivilegedServicesImpl, Function>) {
    super();
    if (typeof config !== "undefined") {
      Object.assign(this, config);
    }
  }

  static newEmpty() {
    return new PrivilegedServicesImpl({
      manager: <ServiceIndex>0,
      assigners: <PrivilegedServicesImpl["assigners"]>(
        Array.from({ length: CORES }, () => <ServiceIndex>0)
      ),
      delegator: <ServiceIndex>0,
      registrar: <ServiceIndex>0,
      alwaysAccers: new Map(),
    });
  }
}
