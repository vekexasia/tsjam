import { HashCodec } from "@/identity";
import { encodeWithCodec } from "@/utils";
import type { Hash, WorkPackageHash } from "@tsjam/types";
import { hextToBigInt } from "@tsjam/utils";

/**
 * Basic utility to convert from/to json
 * mainly used in tests and when debugging is needed
 */
export interface JSONCodec<V, J = any> {
  toJSON(value: V): J;
  fromJSON(json: J): V;
}

// Create a unique symbol for storing codec information
interface PropertyConfig<T, P extends keyof T = keyof T, V = T[P]> {
  jsonName: string;
  property: P;
  codec: JSONCodec<V, any>;
}

// Symbol to store metadata
const jsonPropertiesKey = Symbol("jsonProperties");

// Property decorator factory
export function JSONProperty<T>(jsonName: string, codec: JSONCodec<T, any>) {
  return function (target: any, property: string) {
    const properties = getJsonProperties(target);
    properties.push({
      jsonName,
      codec,
      property,
    });
  };
}

// Class decorator factory
export function JSONCodecClass<T extends { new (...args: any[]): any }>(
  constructor: T,
) {
  return class extends constructor implements JSONCodec<T, any> {
    toJSON(v: T) {
      const properties = getJsonProperties(v);
      const result: Record<string, any> = {};

      for (const config of properties) {
        const value = v[config.property];
        result[config.jsonName] = config.codec.toJSON(value);
      }
      return result;
    }
    fromJSON(j: any) {
      const properties = getJsonProperties(this);
      for (const { jsonName, property, codec } of properties) {
        const jsonValue = j[jsonName];
        if (jsonValue !== undefined) {
          this[property] = codec.fromJSON(jsonValue);
        }
      }
      return this as unknown as T;
    }
  };
}

// Utility function to get or create property metadata
function getJsonProperties<T>(target: T): Array<PropertyConfig<T>> {
  const prototype = Object.getPrototypeOf(target);
  if (!prototype[jsonPropertiesKey]) {
    prototype[jsonPropertiesKey] = [];
  }
  return prototype[jsonPropertiesKey];
}
const bufToHex = (b: Uint8Array) => `0x${Buffer.from(b).toString("hex")}`;

const hashToHex = <T extends Hash>(h: T) =>
  `${bufToHex(encodeWithCodec(HashCodec, h))}`;

export const HashJSONCodec = <T extends Hash>(): JSONCodec<Hash, string> => {
  return {
    toJSON(value) {
      return hashToHex(value);
    },
    fromJSON(json) {
      return hextToBigInt<T, 32>(json);
    },
  };
};
export class BaseJSONCodec<V> implements JSONCodec<V, any> {
  toJSON(value: V) {
    throw new Error("Decorate class");
  }
  fromJSON(json: any): V {
    throw new Error("Decorate class");
  }
}

@JSONCodecClass
class Person extends BaseJSONCodec<Person> {
  @JSONProperty("first_name", HashJSONCodec())
  public firstName!: Hash;

  @JSONProperty("last_name", HashJSONCodec())
  public lastName!: WorkPackageHash;
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("decode/encode", () => {
    it("works", () => {
      // Usage example
      const person = new Person();
      person.lastName = <WorkPackageHash>1n;
      person.firstName = <Hash>2n;

      const json2 = person.toJSON(person);
      const restored = person.fromJSON(json2);
      console.log(json2);
      console.log(restored);
    });
  });
}
