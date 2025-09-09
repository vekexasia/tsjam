/* eslint-disable @typescript-eslint/no-explicit-any */
import { JamCodec } from "@/codec";
import { JSONCodec } from "@/json/json-codec";
import { CODEC_METADATA, SINGLE_ELEMENT_CLASS, BaseJamCodecable } from "./base";
import { createJSONCodec } from "@/json/json-codec";
import { createCodec, encodeWithCodec, mapCodec } from "@/utils";

export function binaryCodec<T, K extends string | symbol>(
  codec: JamCodec<T>,
): (target: any, propertyKey: K) => void {
  return function (target: any, propertyKey: string | symbol) {
    if (!target[CODEC_METADATA]) {
      target[CODEC_METADATA] = [];
    }
    target[CODEC_METADATA].push({ propertyKey, codec });
  };
}

export function jsonCodec<T, K extends string | symbol>(
  codec: JSONCodec<T>,
  key?: string | typeof SINGLE_ELEMENT_CLASS,
): (target: any, propertyKey: K) => void {
  return function (target: any, propertyKey: string | symbol) {
    if (!target[CODEC_METADATA]) {
      target[CODEC_METADATA] = [];
    }
    const item = (<any>target[CODEC_METADATA]).find(
      (x: any) => x.propertyKey === propertyKey,
    );
    if (typeof item === "undefined") {
      throw new Error(
        `jsonCodec decorator for ${String(propertyKey)} must be applied after binaryCodec decorator`,
      );
    }
    item.json = {
      codec: codec,
      key,
    };
  };
}

export function codec<T, K extends string | symbol>(
  codec: JamCodec<T>,
  json: JSONCodec<T>,
  jsonKey?: string | typeof SINGLE_ELEMENT_CLASS,
): (target: any, propertyKey: K) => void;
export function codec<T, K extends string | symbol>(
  codec: JamCodec<T> & JSONCodec<T>,
  jsonKey?: string | typeof SINGLE_ELEMENT_CLASS,
): (target: any, propertyKey: K) => void;
export function codec<T, K extends string | symbol>(
  codec: JamCodec<T> | (JamCodec<T> & JSONCodec<T>),
  json?: JSONCodec<T> | string | typeof SINGLE_ELEMENT_CLASS,
  jsonKey?: string | typeof SINGLE_ELEMENT_CLASS,
) {
  const key =
    typeof json === "string" || json === SINGLE_ELEMENT_CLASS ? json : jsonKey;
  const _jsonCodec = typeof json === "object" ? json : <JSONCodec<T>>codec;
  return function (target: any, propertyKey: K) {
    binaryCodec(codec)(target, propertyKey);
    jsonCodec(_jsonCodec, key)(target, propertyKey);
  };
}

export function JamCodecable<
  U extends BaseJamCodecable,
  T extends { new (...args: any[]): U },
>(jsonCodecInConstructor?: boolean) {
  return function (constructor: T) {
    const d: Array<{
      propertyKey: string;
      codec: JamCodec<any>;
      json?: {
        codec: JSONCodec<T>;
        key?: string | typeof SINGLE_ELEMENT_CLASS;
      };
    }> = constructor.prototype[CODEC_METADATA];

    // check codec at runtime
    d.forEach(({ propertyKey, codec }) => {
      if (typeof codec === "undefined" || typeof codec.encode !== "function") {
        console.log(constructor.name, codec);
        throw new Error(`codec for ${propertyKey} is not defined properly`);
      }
    });

    const codec = <JamCodec<any>>mapCodec(
      createCodec(
        // @ts-gnore
        d.map(({ propertyKey, codec }) => [propertyKey, codec] as const),
      ),
      (pojo) => {
        const x = new newConstr();
        Object.assign(x, pojo);
        return <U>x;
      },
      (c: any) => c,
    );

    let isMainEl = false;
    let jsonCodec = <JSONCodec<U, any>>createJSONCodec<any, any>(
      d.map(({ propertyKey, json }) => {
        if (typeof json === "undefined") {
          throw new Error(`json codec for ${propertyKey} is not defined`);
        }
        isMainEl = isMainEl || json.key === SINGLE_ELEMENT_CLASS;
        return [propertyKey, json.key ?? propertyKey, json.codec];
      }),
    );
    if (isMainEl && d.length > 1) {
      throw new Error("SINGLE_ELEMENT_CLASS used with more than one element");
    }
    if (isMainEl) {
      const orig = jsonCodec;
      jsonCodec = {
        toJSON(value) {
          return orig.toJSON(value)[SINGLE_ELEMENT_CLASS];
        },
        fromJSON(json) {
          return orig.fromJSON({ [SINGLE_ELEMENT_CLASS]: json });
        },
      };
    }
    if (jsonCodecInConstructor) {
      jsonCodec = <JSONCodec<InstanceType<T>>>(<any>constructor);
    }

    // newConstr is needed for the instanceof Check and to make sure that the method
    const newConstr = preserveClassName(
      constructor.name,
      // @ts-expect-error i know what I'm doing
      class extends constructor {
        toBinary(): Buffer {
          return encodeWithCodec(codec, this);
        }
        toJSON(): object {
          return jsonCodec.toJSON(this as unknown as U);
        }

        static encode(x: U, buf: Uint8Array): number {
          return codec.encode(x, buf);
        }
        static decode(bytes: Uint8Array): { value: U; readBytes: number } {
          return codec.decode(bytes);
        }
        static encodedSize(value: U): number {
          const size = codec.encodedSize(value);
          return size;
        }
        static fromJSON(json: any): U {
          const pojo = jsonCodec.fromJSON(json);
          const x = new newConstr();
          Object.assign(x, pojo);
          return <U>x;
        }
        static toJSON(value: U): object {
          return jsonCodec.toJSON(value);
        }
      },
    );

    return newConstr;
  };
}

const preserveClassName = <T>(name: string, constr: T): T => {
  return new Function("Base", `return class ${name} extends Base {}`)(constr);
};
