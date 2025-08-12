import { mapCodec } from "@/utils";
import { E_1_int } from "@/ints/e-subscr";
import { u8 } from "@tsjam/types";
import { SINGLE_ELEMENT_CLASS } from "./base";
import { binaryCodec, jsonCodec } from "./decorators";

export const booleanCodec = (
  jsonKey?: string | typeof SINGLE_ELEMENT_CLASS,
) => {
  return (target: unknown, propertyKey: string | symbol) => {
    binaryCodec(
      mapCodec(
        E_1_int,
        (v) => v === 1,
        (v) => <u8>(v ? 1 : 0),
      ),
    )(target, propertyKey);
    jsonCodec(
      {
        fromJSON(json) {
          return json;
        },
        toJSON(value) {
          return value;
        },
      },
      jsonKey,
    )(target, propertyKey);
  };
};
