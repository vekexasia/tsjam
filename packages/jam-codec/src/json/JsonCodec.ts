/**
 * Basic utility to convert from/to json
 * mainly used in tests and when debugging is needed
 */
export interface JSONCodec<V, J = any> {
  toJSON(value: V): J;
  fromJSON(json: J): V;
}
