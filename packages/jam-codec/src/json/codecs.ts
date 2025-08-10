import { ByteArrayOfLength } from "@tsjam/types";
import { JSONCodec } from "./JsonCodec";

const bufToHex = (b: Uint8Array) => `0x${Buffer.from(b).toString("hex")}`;

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
const _setJSONCodec = <T extends Set<X>, X>(
  sorter?: (a: X, b: X) => number,
): JSONCodec<T, X[]> => {
  return {
    fromJSON(json) {
      return new Set(json) as T;
    },
    toJSON(value) {
      const toRet = [...value.values()];
      if (typeof sorter !== "undefined") {
        toRet.sort(sorter);
      }
      return toRet;
    },
  };
};

export const SetJSONCodec = <T>(
  codec: JSONCodec<T>,
  sorter?: (a: T, b: T) => number,
): JSONCodec<Set<T>, T[]> => {
  return ZipJSONCodecs(ArrayOfJSONCodec(codec), _setJSONCodec(sorter));
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

export const BufferJSONCodec = <
  T extends ByteArrayOfLength<K>,
  K extends number,
>(): JSONCodec<T, string> => {
  return {
    fromJSON(json) {
      return <T>new Uint8Array([...Buffer.from(json.slice(2), "hex")]);
    },
    toJSON(value) {
      return bufToHex(value);
    },
  };
};

export const Uint8ArrayJSONCodec: JSONCodec<Uint8Array, string> = {
  fromJSON(json) {
    return new Uint8Array([...Buffer.from(json.slice(2), "hex")]);
  },
  toJSON(value) {
    return bufToHex(value);
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ArrayOfJSONCodec = <K extends T[], T = K[0], X = any>(
  singleCodec: JSONCodec<T, X>,
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
  keyCodec: JSONCodec<K>,
  valueCodec: JSONCodec<V>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <any>[...value.entries()].map(([key, value]) => ({
        [jsonKeys.key]: keyCodec.toJSON(key),
        [jsonKeys.value]: valueCodec.toJSON(value),
      }));
    },
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const WrapJSONCodec = <T, K extends string, X = any>(
  key: K,
  codec: JSONCodec<T, X>,
): JSONCodec<T, { [key in K]: X }> => {
  return {
    fromJSON(json) {
      return codec.fromJSON(json[key]);
    },
    toJSON(value) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
