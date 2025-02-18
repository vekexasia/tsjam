/**
 * Basic utility to convert from/to json
 * mainly used in tests and when debugging is needed
 */
export interface JSONCodecClass<V> {
  toJSON(value: V): any;
  fromJSON(json: any): V;
}
