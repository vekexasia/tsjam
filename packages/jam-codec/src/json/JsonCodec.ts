/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Basic utility to convert from/to json
 * mainly used in tests and when debugging is needed
 */
export interface JSONCodec<V, J = any> {
  toJSON(value: V): J;
  fromJSON(json: J): V;
}

type Entries<T, X> = {
  [K in keyof T]: [K, keyof X /* the json key*/, JSONCodec<T[K]>];
}[keyof T];

export const createJSONCodec = <T extends object, X = any>(
  itemsCodec: Entries<T, X>[],
): JSONCodec<T, X> => {
  return {
    fromJSON(json) {
      const newInst = {} as unknown as T;
      for (const [key, jsonKey, codec] of itemsCodec) {
        try {
          newInst[key] = <T[typeof key]>codec.fromJSON((<any>json)[jsonKey]);
        } catch (e) {
          console.error("Error in JSONCodec", key, jsonKey, (<any>e)?.message);
          console.error(e);
          console.log(json[jsonKey]);
          throw e;
        }
      }
      return newInst;
    },
    toJSON(value) {
      const toRet: any = {};
      for (const [key, jsonKey, codec] of itemsCodec) {
        toRet[jsonKey] = codec.toJSON(value[key]);
      }
      return toRet;
    },
  };
};
