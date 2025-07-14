import { JamCodec } from "./codec";
import { createJSONCodec, JSONCodec } from "./json/JsonCodec";
import { createCodec, encodeWithCodec, mapCodec } from "./utils";

const CODEC_METADATA = Symbol.for("__jamcodecs__");

/**
 * This is a base class for JamCodecable classes.
 * It provides the basic structure for encoding and decoding
 * properties with JamCodec.
 */
export abstract class BaseJamCodecable<T> {
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
export function JamProperty<T, K extends string | symbol>(
  codec: JamCodec<T>,
  jsonCodec?: JSONCodec<T>,
  jsonKey?: string,
): (target: any, propertyKey: K) => void {
  return function (target: any, propertyKey: string | symbol) {
    if (!target[CODEC_METADATA]) {
      target[CODEC_METADATA] = [];
    }
    let json: { codec: JSONCodec<T>; key?: string } | undefined;
    if (jsonCodec) {
      json = { codec: jsonCodec, key: jsonKey };
    }
    target[CODEC_METADATA].push({ propertyKey, codec, json });
  };
}

/**
 * Class decorator to mark a class as JamCodecable.
 * Be aware that it rewrites the class constructor providing both static and instance methods
 * following the BaseJamCodecable interface.
 */
export function JamCodecable<
  U extends BaseJamCodecable<U>,
  T extends { new (...args: any[]): U },
>() {
  return function (constructor: T) {
    const d: Array<{
      propertyKey: string;
      codec: JamCodec<any>;
      json?: { codec: JSONCodec<T>; key?: string };
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

    const jsonCodec = <JSONCodec<U, any>>createJSONCodec<any, any>(
      d
        .filter((a) => a.json)
        .map(({ propertyKey, json }) => {
          return [propertyKey, json!.key ?? propertyKey, json!.codec];
        }),
    );

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
    };
    Object.defineProperty(newConstr, "name", { value: constructor.name });
    return newConstr;
  };
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;
  const { E_2_int, E_4_int } = await import("./ints/E_subscr");
  @JamCodecable()
  class C extends BaseJamCodecable<C> {
    @JamProperty(E_4_int)
    c!: number;
  }

  @JamCodecable()
  class B extends BaseJamCodecable<B> {
    @JamProperty(E_4_int)
    b!: number;

    @JamProperty(C)
    c!: C;

    @JamProperty(E_2_int)
    d!: number;
  }

  @JamCodecable()
  class subB extends B {
    @JamProperty(E_4_int)
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
  });
}
