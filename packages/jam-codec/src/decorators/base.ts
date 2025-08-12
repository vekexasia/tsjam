/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { JamCodec } from "@/codec";
import { JSONCodec } from "@/json/json-codec";
import { cloneWithCodec } from "@/utils";
import assert from "assert";

const CODEC_METADATA = Symbol.for("__jamcodecs__");
/**
 * used to mark that json element is the only one to be serialized/deserialized so
 * property key should not be used and wrapped
 */
export const SINGLE_ELEMENT_CLASS = Symbol.for("__jamcodec__singleelclass");
/**
 * This is a base class for JamCodecable classes.
 * It provides the basic structure for encoding and decoding
 * properties with JamCodec.
 */
export abstract class BaseJamCodecable {
  static encode<T extends typeof BaseJamCodecable>(
    this: T,
    x: InstanceType<T>,
    buf: Uint8Array,
  ): number {
    throw new Error(`stub! ${this.name}`);
  }

  static decode<T extends typeof BaseJamCodecable>(
    this: T,
    bytes: Uint8Array,
  ): { value: InstanceType<T>; readBytes: number } {
    throw new Error(`stub! ${this.name}`);
  }

  static encodedSize<T extends typeof BaseJamCodecable>(
    this: T,
    value: InstanceType<T>,
  ): number {
    throw new Error(`stub! ${this.name}`);
  }

  static fromJSON<T extends typeof BaseJamCodecable>(
    this: T,
    json: any,
  ): InstanceType<T> {
    throw new Error(`stub! ${this.name}`);
  }

  static toJSON<T extends typeof BaseJamCodecable>(
    this: T,
    value: InstanceType<T>,
  ): object {
    throw new Error(`stub! ${this.name}`);
  }

  static codecOf<
    T extends typeof BaseJamCodecable,
    X extends keyof InstanceType<T>,
  >(
    this: T,
    x: X,
  ): JamCodec<InstanceType<T>[X]> & JSONCodec<InstanceType<T>[X]> {
    const el = (<any>this.prototype)[CODEC_METADATA]?.find(
      (a: any) => a.propertyKey === x,
    );
    assert(el, `Codec for property ${String(x)} not found in ${this.name}`);
    return {
      encode: el.codec.encode.bind(el.codec),
      decode: el.codec.decode.bind(el.codec),
      encodedSize: el.codec.encodedSize.bind(el.codec),
      fromJSON: el.json.codec.fromJSON.bind(el.json.codec),
      toJSON: el.json.codec.toJSON.bind(el.json.codec),
    };
  }

  toBinary(): Uint8Array {
    throw new Error("stub");
  }

  toJSON() {
    throw new Error("stub!");
  }
}

export const asCodec = <T extends typeof BaseJamCodecable>(
  a: T,
): JamCodec<InstanceType<T>> & JSONCodec<InstanceType<T>> => {
  return a;
};

export const cloneCodecable = <
  X extends InstanceType<T>,
  T extends typeof BaseJamCodecable,
>(
  instance: X,
) => {
  const proto = <T>Object.getPrototypeOf(instance).constructor;
  return <X>cloneWithCodec(proto, instance);
};

export { CODEC_METADATA };
