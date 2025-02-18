// Types for property metadata
type PropertyConfig = {
  key: string;
  toString?: (value: any) => string;
  fromString?: (value: string) => any;
};

// Symbol to store metadata
const jsonPropertiesKey = Symbol("jsonProperties");

// Property decorator factory
function JsonProperty(
  key: string,
  options?: {
    toString?: (value: any) => string;
    fromString?: (value: string) => any;
  },
) {
  return function (target: any, propertyKey: string) {
    const properties = getJsonProperties(target);
    properties.push({
      key: propertyKey,
      config: {
        key,
        toString: options?.toString,
        fromString: options?.fromString,
      },
    });
  };
}

// Class decorator factory
function JSONCodec<T extends { new (...args: any[]): any }>(constructor: T) {
  return class extends constructor {
    toJSON() {
      const properties = getJsonProperties(this);
      const result: Record<string, any> = {};

      for (const { key, config } of properties) {
        const value = (this as any)[key];
        result[config.key] = config.toString ? config.toString(value) : value;
      }
      return result;
    }
  };
}
const fromJSON = <T>(json: Record<string, any>, instance: T): T => {
  console.log("aaa", json);
  const properties = getJsonProperties(instance);
  console.log(properties);

  for (const { key, config } of properties) {
    const jsonValue = json[config.key];
    console.log(key, config.key, jsonValue);
    if (jsonValue !== undefined) {
      (instance as any)[key] = config.fromString
        ? config.fromString(jsonValue)
        : jsonValue;
    }
  }
  return instance;
};

// Utility function to get or create property metadata
function getJsonProperties(
  target: any,
): Array<{ key: string; config: PropertyConfig }> {
  const prototype = Object.getPrototypeOf(target);
  if (!prototype[jsonPropertiesKey]) {
    prototype[jsonPropertiesKey] = [];
  }
  return prototype[jsonPropertiesKey];
}

@JSONCodec
class Person {
  @JsonProperty("first_name")
  firstName: string;

  @JsonProperty("last_name")
  lastName: string;

  @JsonProperty("birth_date", {
    toString: (date: Date) => date.toISOString(),
    fromString: (str: string) => new Date(str),
  })
  birthDate: Date;

  constructor(firstName = "", lastName = "", birthDate = new Date()) {
    this.firstName = firstName;
    this.lastName = lastName;
    this.birthDate = birthDate;
  }
}
// Usage example
const person = new Person("John", "Doe", new Date(1990, 0, 1));
const json = JSON.stringify(person);
const restored = fromJSON(JSON.parse(json), new Person());
console.log(json);
console.log(restored);
