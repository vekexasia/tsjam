import { Ed25519PubkeyCodec, HashCodec } from "@/identity";
import { encodeWithCodec } from "@/utils";
import type { ByteArrayOfLength, ED25519PublicKey, Hash } from "@tsjam/types";
import { hexToBytes, hextToBigInt } from "@tsjam/utils";

/**
 * Basic utility to convert from/to json
 * mainly used in tests and when debugging is needed
 */
export interface JSONCodec<V, J = any> {
  toJSON(value: V): J;
  fromJSON(json: J): V;
}

type Entries<T, X> = {
  [K in keyof T]: [K, keyof X /* the json key*/, JSONCodec<T[K], any>];
}[keyof T];

export const createJSONCodec = <T extends object, X = any>(
  itemsCodec: Entries<T, X>[],
): JSONCodec<T, X> => {
  return {
    fromJSON(json) {
      const newInst = {} as unknown as T;
      for (const [key, jsonKey, codec] of itemsCodec) {
        newInst[key] = <T[typeof key]>codec.fromJSON((<any>json)[jsonKey]);
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

const bufToHex = (b: Uint8Array) => `0x${Buffer.from(b).toString("hex")}`;

const hashToHex = <T extends Hash>(h: T) =>
  `${bufToHex(encodeWithCodec(HashCodec, h))}`;

export const BigIntJSONCodec = <T extends bigint>(): JSONCodec<T, number> => {
  return {
    fromJSON(json) {
      return <T>BigInt(json);
    },
    toJSON(value) {
      return Number(value); // TODO: this might fail due to loss in precision
    },
  };
};

/**
 * An array of `X` in json converted in Set of `X`
 */
export const SetJSONCodec = <T extends Set<X>, X>(): JSONCodec<T, X[]> => {
  return {
    fromJSON(json) {
      return new Set(json) as T;
    },
    toJSON(value) {
      return [...value.values()];
    },
  };
};

export const NumberJSONCodec = <T extends number>(): JSONCodec<T, number> => {
  return {
    fromJSON(json) {
      return <T>json;
    },
    toJSON(value) {
      return value;
    },
  };
};

export const HashJSONCodec = <T extends Hash>(): JSONCodec<T, string> => {
  return {
    toJSON(value) {
      return hashToHex(value);
    },
    fromJSON(json) {
      return hextToBigInt<T, 32>(json);
    },
  };
};

export const Ed25519JSONCodec = (): JSONCodec<ED25519PublicKey, string> => {
  return {
    toJSON(value) {
      return bufToHex(encodeWithCodec(Ed25519PubkeyCodec, value));
    },
    fromJSON(json) {
      return hextToBigInt<ED25519PublicKey, 32>(json);
    },
  };
};

export const BufferJSONCodec = <
  T extends ByteArrayOfLength<K>,
  K extends number,
>(): JSONCodec<T, string> => {
  return {
    fromJSON(json) {
      return hexToBytes(json);
    },
    toJSON(value) {
      return bufToHex(value);
    },
  };
};

export const ArrayOfJSONCodec = <K extends T[], T, X>(
  singleCodec: JSONCodec<T X>,
): JSONCodec<K, X[]> => {
  return {
    fromJSON(json) {
      return <K>json.map((item) => singleCodec.fromJSON(item));
    },
    toJSON(value) {
      return value.map((item) => singleCodec.toJSON(item));
    },
  };
};

export const MapJSONCodec = <K, V, KN extends string, VN extends string>(
  jsonKeys: {
    key: KN;
    value: VN;
  },
  keyCodec: JSONCodec<K, any>,
  valueCodec: JSONCodec<V, any>,
): JSONCodec<Map<K, V>, Array<{ [key in KN | VN]: any }>> => {
  return {
    fromJSON(json) {
      return new Map<K, V>(
        json.map((item) => [
          keyCodec.fromJSON(item[jsonKeys.key]),
          valueCodec.fromJSON(item[jsonKeys.value]),
        ]),
      );
    },
    toJSON(value) {
      return <any>[...value.entries()].map(([key, value]) => ({
        [jsonKeys.key]: keyCodec.toJSON(key),
        [jsonKeys.value]: valueCodec.toJSON(value),
      }));
    },
  };
};

export const WrapJSONCodec = <T, K extends string>(
  key: K,
  codec: JSONCodec<T, any>,
): JSONCodec<T, { [key in K]: any }> => {
  return {
    fromJSON(json) {
      return codec.fromJSON(json[key]);
    },
    toJSON(value) {
      return <{ [key in K]: any }>{
        [key]: codec.toJSON(value),
      };
    },
  };
};

export const EitherOneOfJSONCodec = <Case1, Case2>(
  case1Codec: JSONCodec<Case1>,
  case2Codec: JSONCodec<Case2>,
  case1Key: string,
  case2Key: string,
  valueDiscriminator: (v: Case1 | Case2) => v is Case1,
): JSONCodec<Case1 | Case2, any> => {
  return {
    fromJSON(json) {
      if (case1Key in json) {
        return case1Codec.fromJSON(json[case1Key]);
      } else {
        return case2Codec.fromJSON(json[case2Key]);
      }
    },
    toJSON(value) {
      if (valueDiscriminator(value)) {
        return { [case1Key]: case1Codec.toJSON(value) };
      } else {
        return { [case2Key]: case2Codec.toJSON(value) };
      }
    },
  };
};

export const NULLORCodec = <T, X>(
  tCodec: JSONCodec<T, X>,
): JSONCodec<T | undefined, X | null> => {
  return {
    fromJSON(json) {
      if (json === null) {
        return undefined;
      }
      return tCodec.fromJSON(json);
    },
    toJSON(value) {
      if (typeof value === "undefined") {
        return null;
      }
      return tCodec.toJSON(value);
    },
  };
};

/**
 * composes 2 codecs to go from A to C type
 */
export const ZipJSONCodecs = <A, B, C>(
  first: JSONCodec<B, A>,
  second: JSONCodec<C, B>,
): JSONCodec<C, A> => {
  return {
    fromJSON(json) {
      return second.fromJSON(first.fromJSON(json));
    },
    toJSON(value) {
      return first.toJSON(second.toJSON(value));
    },
  };
};

// Get the V type (first generic parameter)
export type JC_V<T extends JSONCodec<any, any>> =
  T extends JSONCodec<infer V, any> ? V : never;

// Get the J type (second generic parameter)
export type JC_J<T extends JSONCodec<any, any>> =
  T extends JSONCodec<any, infer J> ? J : never;
