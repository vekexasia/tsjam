import {
  BigIntBytesJSONCodec,
  BigIntJSONCodec,
  Ed25519PublicKeyJSONCodec,
  HashJSONCodec,
  NumberJSONCodec,
} from "@/json/JsonCodec";
import { binaryCodec, jsonCodec, SINGLE_ELEMENT_CLASS } from "./mainDecorators";
import { E_sub, E_sub_int } from "@/ints/E_subscr";
import {
  Ed25519PubkeyCodec,
  genericBytesBigIntCodec,
  HashCodec,
} from "@/identity";

export const numberCodec = (
  bytes: number,
  jsonKey?: string | typeof SINGLE_ELEMENT_CLASS,
) => {
  return function (target: any, propertyKey: string | symbol) {
    binaryCodec(E_sub_int(bytes))(target, propertyKey);
    jsonCodec(NumberJSONCodec(), jsonKey)(target, propertyKey);
  };
};

export const bigintCodec = (
  bytes: number,
  jsonKey?: string | typeof SINGLE_ELEMENT_CLASS,
) => {
  return function (target: any, propertyKey: string | symbol) {
    binaryCodec(E_sub(bytes))(target, propertyKey);
    jsonCodec(BigIntJSONCodec(), jsonKey)(target, propertyKey);
  };
};

export const hashCodec = (jsonKey?: string | typeof SINGLE_ELEMENT_CLASS) => {
  return function (target: any, propertyKey: string | symbol) {
    binaryCodec(HashCodec)(target, propertyKey);
    jsonCodec(HashJSONCodec(), jsonKey)(target, propertyKey);
  };
};

export const ed25519Codec = (
  jsonKey?: string | typeof SINGLE_ELEMENT_CLASS,
) => {
  return function (target: any, propertyKey: string | symbol) {
    binaryCodec(Ed25519PubkeyCodec)(target, propertyKey);
    jsonCodec(Ed25519PublicKeyJSONCodec, jsonKey)(target, propertyKey);
  };
};

export const bigintBufCodec = (
  bytes: number,
  jsonKey?: string | typeof SINGLE_ELEMENT_CLASS,
) => {
  return function (target: any, propertyKey: string | symbol) {
    const codec = genericBytesBigIntCodec(bytes);
    binaryCodec(codec)(target, propertyKey);
    jsonCodec(BigIntBytesJSONCodec(codec), jsonKey)(target, propertyKey);
  };
};
