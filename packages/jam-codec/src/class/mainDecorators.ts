import { JamCodec } from "@/codec";
import { JSONCodec, createJSONCodec } from "@/json/JsonCodec";
import { mapCodec, createCodec, encodeWithCodec } from "@/utils";

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
  static encode<T>(x: T, buf: Uint8Array): number {
    throw new Error("stub!");
  }

  static decode<T>(bytes: Uint8Array): { value: T; readBytes: number } {
    throw new Error("stub!");
  }

  static encodedSize<T>(value: T): number {
    throw new Error("stub!");
  }

  static fromJSON<T>(json: any): T {
    throw new Error("stub!");
  }

  static toJSON<T>(value: T): object {
    throw new Error("stub!");
  }

  toBinary(): Uint8Array {
    throw new Error("stub");
  }

  toJSON() {
    throw new Error("stub!");
  }
}

/**
 * Decorator to mark properties in class as JamCodecable.
 * Order of properties is preserved when encoding and decoding
 */
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
  codec: JamCodec<T> & JSONCodec<T>,
  jsonKey?: string,
) {
  return function (target: any, propertyKey: K) {
    binaryCodec(codec)(target, propertyKey);
    jsonCodec(codec, jsonKey)(target, propertyKey);
  };
}
/**
 * Class decorator to mark a class as JamCodecable.
 * Be aware that it rewrites the class constructor providing both static and instance methods
 * following the BaseJamCodecable interface.
 */
export function JamCodecable<
  U extends BaseJamCodecable,
  T extends { new (...args: any[]): U },
>() {
  return function (constructor: T) {
    const d: Array<{
      propertyKey: string;
      codec: JamCodec<any>;
      json?: {
        codec: JSONCodec<T>;
        key?: string | typeof SINGLE_ELEMENT_CLASS;
      };
    }> = constructor.prototype[CODEC_METADATA];
    const codec = <JamCodec<any>>mapCodec(
      createCodec(
        // @ts-ignore
        d.map(({ propertyKey, codec }) => [propertyKey, codec]),
      ),
      (pojo) => {
        const x = new newConstr();

        for (const key of Object.keys(pojo)) {
          // @ts-ignore
          x[key] = pojo[key];
        }
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

    // newConstr is needed for the instanceof Check and to make sure that the method
    // @ts-ignore
    const newConstr = class extends constructor {
      toBinary(): Uint8Array {
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
        return codec.encodedSize(value);
      }
      static fromJSON(json: any): U {
        const pojo = jsonCodec.fromJSON(json);
        const x = new newConstr();
        for (const key of Object.keys(pojo)) {
          // @ts-ignore
          x[key] = pojo[key];
        }
        return <U>x;
      }
      static toJSON(value: U): object {
        return jsonCodec.toJSON(value);
      }
    };
    Object.defineProperty(newConstr, "name", { value: constructor.name });
    return newConstr;
  };
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;
  const { NumberJSONCodec } = await import("@/json/codecs.js");
  const { E_2_int, E_4_int, eSubIntCodec } = await import("../ints/E_subscr");
  console.log("ciao");
  @JamCodecable()
  class C extends BaseJamCodecable {
    @jsonCodec(NumberJSONCodec())
    @binaryCodec(E_4_int)
    c!: number;
  }

  @JamCodecable()
  class B extends BaseJamCodecable {
    @eSubIntCodec(4)
    b!: number;

    @codec(C)
    c!: C;

    @jsonCodec(NumberJSONCodec())
    @binaryCodec(E_2_int)
    d!: number;
  }

  @JamCodecable()
  class subB extends B {
    @jsonCodec(NumberJSONCodec())
    @binaryCodec(E_4_int)
    cane!: number;
  }

  describe("BaseJamCodecable", () => {
    it("should encode and decode correctly", () => {
      const t = new subB();
      t.b = 1234;
      t.c = new C();
      t.c.c = 5678;
      t.d = 10;
      t.cane = 42;
      const encoded = encodeWithCodec(subB, t);
      const encodedInner = t.toBinary();
      expect(encoded).deep.eq(encodedInner);
      const subBDecoded = subB.decode<subB>(encoded).value;
      expect(subBDecoded.b).toBe(1234);
      expect(subBDecoded.d).toBe(10);
      expect(subBDecoded.cane).toBe(42);
      expect(subBDecoded.c.c).toBe(5678);

      expect(subBDecoded instanceof subB).toBe(true);
      expect(subBDecoded.c instanceof C).toBe(true);

      const encoded2Inner = subBDecoded.toBinary();

      expect(encoded).deep.eq(encoded2Inner);
    });
    describe("single element class", () => {
      it("should encode and decode single element class correctly", () => {
        @JamCodecable()
        class S extends BaseJamCodecable {
          @eSubIntCodec(2, SINGLE_ELEMENT_CLASS)
          a!: number;
        }

        const s = new S();
        s.a = 42;
        expect(s.toJSON()).toEqual(42);
        expect(S.fromJSON(42)).deep.eq(s);
      });
    });
    it("should fail if more than one single element class is used", () => {
      expect(() => {
        @JamCodecable()
        class S1 extends BaseJamCodecable {
          @jsonCodec(NumberJSONCodec(), SINGLE_ELEMENT_CLASS)
          @binaryCodec(E_4_int)
          a!: number;
          @eSubIntCodec(4, SINGLE_ELEMENT_CLASS)
          b!: number;
        }
      }).toThrow("SINGLE_ELEMENT_CLASS used with more than one element");
    });
  });
}
