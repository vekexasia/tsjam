import { mapCodec } from "@/utils";
import { binaryCodec, jsonCodec, SINGLE_ELEMENT_CLASS } from "./mainDecorators";
import { E_1_int } from "@/ints/E_subscr";
import { u8 } from "@tsjam/types";

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
