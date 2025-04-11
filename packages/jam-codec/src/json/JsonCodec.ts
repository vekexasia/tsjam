/* eslint-disable @typescript-eslint/no-explicit-any */
import { JamCodec } from "@/codec";
import { HashCodec } from "@/identity";
import { encodeWithCodec } from "@/utils";
import {
  BandersnatchKey,
  BandersnatchSignature,
  ED25519PublicKey,
  ED25519Signature,
  type BigIntBytes,
  type ByteArrayOfLength,
  type Hash,
} from "@tsjam/types";
import { bigintToBytes, bytesToBigInt } from "@tsjam/utils";

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
          console.error(
            "Error in JSONCodec",
            key,
            jsonKey,
            json[jsonKey],
            (<any>e)?.message,
          );
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

const BigIntBytesJSONCodec = <T extends BigIntBytes<N>, N extends number>(
  codec: JamCodec<T>,
): JSONCodec<T, string> => {
  return {
    fromJSON(json) {
      return codec.decode(Buffer.from(json.substring(2), "hex")).value;
    },
    toJSON(value) {
      return `0x${Buffer.from(encodeWithCodec(codec, value)).toString("hex")}`;
    },
  };
};
/**
 * An array of `X` in json converted in Set of `X`
 */
export const SetJSONCodec = <T extends Set<X>, X>(
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

export const HashJSONCodec = <T extends Hash>(): JSONCodec<T, string> =>
  BigIntBytesJSONCodec(HashCodec) as JSONCodec<T, string>;

export const Ed25519SignatureJSONCodec = BufferJSONCodec<
  ED25519Signature,
  64
>();

export const Ed25519BufJSONCodec = BufferJSONCodec<
  ED25519PublicKey["buf"],
  32
>();
export const Ed25519BigIntJSONCodec: JSONCodec<
  ED25519PublicKey["bigint"],
  string
> = {
  fromJSON(json) {
    return bytesToBigInt(
      new Uint8Array([...Buffer.from(json.slice(2), "hex")]),
    );
  },
  toJSON(value) {
    return Buffer.from(bigintToBytes(value, 32)).toString("hex");
  },
};

export const Ed25519PublicKeyJSONCodec: JSONCodec<ED25519PublicKey, string> = {
  fromJSON(json) {
    return {
      bigint: Ed25519BigIntJSONCodec.fromJSON(json),
      buf: Ed25519BufJSONCodec.fromJSON(json),
    };
  },
  toJSON(value) {
    return Ed25519BufJSONCodec.toJSON(value.buf);
  },
};
export const BandersnatchSignatureJSONCodec = BufferJSONCodec<
  BandersnatchSignature,
  96
>();

export const Uint8ArrayJSONCodec: JSONCodec<Uint8Array, string> = {
  fromJSON(json) {
    return new Uint8Array([...Buffer.from(json.slice(2), "hex")]);
  },
  toJSON(value) {
    return bufToHex(value);
  },
};

export const ArrayOfJSONCodec = <K extends T[], T, X>(
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

export const WrapJSONCodec = <T, K extends string, X = any>(
  key: K,
  codec: JSONCodec<T, X>,
): JSONCodec<T, { [key in K]: X }> => {
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

export const BandersnatchKeyJSONCodec = BufferJSONCodec<BandersnatchKey, 32>();

// Get the V type (first generic parameter)
export type JC_V<T extends JSONCodec<any, any>> =
  T extends JSONCodec<infer V, any> ? V : never;

// Get the J type (second generic parameter)
export type JC_J<T extends JSONCodec<any, any>> =
  T extends JSONCodec<any, infer J> ? J : never;
