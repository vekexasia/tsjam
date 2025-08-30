import assert from 'assert';
import assert$1 from 'node:assert';
import { toBigIntLE, toBufferLE } from 'bigint-buffer';
import { secretKey, publicKey, ringRoot, ringVrfVerify, ringVrfOutputHash, ietfVrfOutputHashFromSecret, ietfVrfOutputHash, ietfVrfSign, ietfVrfVerify } from '@tsjam/crypto-napi';
import sodium from 'sodium-native';
import fs from 'fs';
import fs$1 from 'node:fs';
import net from 'node:net';
import { parseArgs } from 'node:util';

/**
 * Appendix B.1: Host Call Result Constants
 */
const HostCallResult = {
    /**
     * The return value indicating an item does not exist.
     */
    NONE: 2n ** 64n - 1n,
    /**
     * Name unknown.
     */
    WHAT: 2n ** 64n - 2n,
    /**
     * The return value for when a memory index is provided for reading/writing which is not accessible
     */
    OOB: 2n ** 64n - 3n,
    /**
     * Index unknown
     */
    WHO: 2n ** 64n - 4n,
    /**
     * Storage full
     */
    FULL: 2n ** 64n - 5n,
    /**
     * Core index unknown
     */
    CORE: 2n ** 64n - 6n,
    /**
     * Insufficient funds
     */
    CASH: 2n ** 64n - 7n,
    /**
     * Gas Limit too low
     */
    LOW: 2n ** 64n - 8n,
    /**
     * The item is already solicited or cannot be forgotten
     */
    HUH: 2n ** 64n - 9n,
    /**
     * General success
     */
    OK: 0n,
};
var InnerPVMResultCode;
(function (InnerPVMResultCode) {
    /**
     * The invocation completed and halted normally.
     */
    InnerPVMResultCode[InnerPVMResultCode["HALT"] = 0] = "HALT";
    /**
     * The invocation completed with a panic.
     */
    InnerPVMResultCode[InnerPVMResultCode["PANIC"] = 1] = "PANIC";
    /**
     * The invocation completed with a page fault
     */
    InnerPVMResultCode[InnerPVMResultCode["FAULT"] = 2] = "FAULT";
    /**
     * The invocation completed with a host-call fault
     */
    InnerPVMResultCode[InnerPVMResultCode["HOST"] = 3] = "HOST";
    /**
     * The invocation completed by running out of gas
     */
    InnerPVMResultCode[InnerPVMResultCode["OOG"] = 4] = "OOG";
})(InnerPVMResultCode || (InnerPVMResultCode = {}));

// https://docs.jamcha.in/basics/chain-spec/tiny
const NUMBER_OF_VALIDATORS$1 = 6;
const CORES$1 = 2;
const PREIMAGE_EXPIRATION$1 = 32;
const BLOCK_TIME$1 = 6;
const EPOCH_LENGTH$1 = 12;
const LOTTERY_MAX_SLOT$1 = 10;
const MAX_TICKETS_PER_VALIDATOR$1 = 3;
const MAX_TICKETS_PER_BLOCK$1 = 3;
const VALIDATOR_CORE_ROTATION$1 = 4;
const ERASURECODE_EXPORTED_SIZE$1 = 1026;
// https://github.com/davxy/jam-test-vectors/pull/90#issuecomment-3217905803
const TOTAL_GAS_ACCUMULATION_ALL_CORES$1 = 20000000n;
const TOTAL_GAS_REFINEMENT_LOGIC$1 = 1000000000n;
const MINIMUM_VALIDATORS$1 = 5;

var _tiny = /*#__PURE__*/Object.freeze({
    __proto__: null,
    BLOCK_TIME: BLOCK_TIME$1,
    CORES: CORES$1,
    EPOCH_LENGTH: EPOCH_LENGTH$1,
    ERASURECODE_EXPORTED_SIZE: ERASURECODE_EXPORTED_SIZE$1,
    LOTTERY_MAX_SLOT: LOTTERY_MAX_SLOT$1,
    MAX_TICKETS_PER_BLOCK: MAX_TICKETS_PER_BLOCK$1,
    MAX_TICKETS_PER_VALIDATOR: MAX_TICKETS_PER_VALIDATOR$1,
    MINIMUM_VALIDATORS: MINIMUM_VALIDATORS$1,
    NUMBER_OF_VALIDATORS: NUMBER_OF_VALIDATORS$1,
    PREIMAGE_EXPIRATION: PREIMAGE_EXPIRATION$1,
    TOTAL_GAS_ACCUMULATION_ALL_CORES: TOTAL_GAS_ACCUMULATION_ALL_CORES$1,
    TOTAL_GAS_REFINEMENT_LOGIC: TOTAL_GAS_REFINEMENT_LOGIC$1,
    VALIDATOR_CORE_ROTATION: VALIDATOR_CORE_ROTATION$1
});

/**
 * Jam Common Era, 1200 UTC on January 1, 2024.
 */
const JAM_COMMON_ERA = 1704110400;
/**
 * referred as `P` in the paper
 * also known as slot period
 */
let BLOCK_TIME = 6;
/**
 * `H`
 */
const RECENT_HISTORY_LENGTH = 8;
/**
 * `V` in the paper
 */
// These values can be switched at runtime via `initConstants`.
// They are initialized to the "full" variant by default.
let NUMBER_OF_VALIDATORS = 1023;
let MINIMUM_VALIDATORS = 683;
let CORES = 341;
/**
 * referred as constant `Y` in the paper
 */
let LOTTERY_MAX_SLOT = 500;
/**
 * referred as constant `E` in the paper
 */
let EPOCH_LENGTH = 600;
/**
 * referred as constant `K` in the paper
 */
let MAX_TICKETS_PER_BLOCK = 16;
/**
 * `N` in the graypaper
 */
let MAX_TICKETS_PER_VALIDATOR = 2;
/**
 * `U` in the paper
 */
const WORK_TIMEOUT = 5;
/**
 * `R` in the paper
 */
let VALIDATOR_CORE_ROTATION = 10;
/**
 * `I` | the maximum amount of work items in a package.
 */
const MAXIMUM_WORK_ITEMS = 16;
/**
 * `T` | the maximum number of extrinsics in a work-package
 */
const MAXIMUM_EXTRINSICS_IN_WP = 128;
/**
 * `Wm` in the paper
 * 2^11
 */
const MAX_WORKPACKAGE_ENTRIES = 2048;
/**
 * `Wr` in the paper
 * $(0.7.1 - 11.9)
 */
const MAX_WORKREPORT_OUTPUT_SIZE = 48 * 2 ** 10;
/**
 * `J` in the paper
 */
const MAX_WORK_PREREQUISITES = 8;
/**
 * `L` in the paper
 *
 * it's essentially 1 day = 14400 * 6s = 86400s
 */
const MAXIMUM_AGE_LOOKUP_ANCHOR = 14400;
/**
 * `Wa` in the paper
 */
const MAXIMUM_SIZE_IS_AUTHORIZED = 64000;
/**
 * Denoted with `Xa` in the paper. It's value is `jam_available`
 * $(0.7.1 - 11.14)
 */
const JAM_AVAILABLE = new TextEncoder().encode("jam_available");
/**
 * Denoted with `XB` in the paper. It's value is `jam_beefy`
 */
new TextEncoder().encode("jam_beefy");
/**
 * Denoted with `XE` in the paper. It's value is `jam_entropy`
 * $(0.7.1 - 6.18)
 */
const JAM_ENTROPY = new TextEncoder().encode("jam_entropy");
/**
 * Denoted with `XE` in the paper. It's value is `jam_fallback_seal`
 * $(0.7.1 - 6.19)
 */
const JAM_FALLBACK_SEAL = new TextEncoder().encode("jam_fallback_seal");
/**
 * Denoted with `XG` in the paper. It's value is `jam_guarantee`
 * $(0.7.1 - 11.27)
 */
const JAM_GUARANTEE = new TextEncoder().encode("jam_guarantee");
/**
 * Denoted with `XI` in the paper. It's value is `jam_announce`
 */
new TextEncoder().encode("jam_announce");
/**
 * Denoted with `XT` in the paper. It's value is `jam_ticket_seal`
 * $(0.7.1 - 6.20)
 */
const JAM_TICKET_SEAL = new TextEncoder().encode("jam_ticket_seal");
/**
 * Denoted with `XU` in the paper. It's value is `jam_audit`
 */
new TextEncoder().encode("jam_audit");
/**
 * Denoted with `Xtrue` in the paper. It's value is `jam_valid`
 * $(0.7.1 - 10.4)
 */
const JAM_VALID = new TextEncoder().encode("jam_valid");
/**
 * Denoted with `Xfalse` in the paper. It's value is `jam_invalid`
 * $(0.7.1 - 10.4)
 */
const JAM_INVALID = new TextEncoder().encode("jam_invalid");
/**
 * `GA` in the paper
 */
const MAX_GAS_ACCUMULATION = 10000000n;
/**
 * `GI` in the paper
 */
const MAX_GAS_IS_AUTHORIZED = 50000000n;
/**
 * `O` in the paper
 */
const AUTHPOOL_SIZE = 8;
/**
 * `Q` in the paper
 */
const AUTHQUEUE_MAX_SIZE = 80;
/**
 * `WB`
 */
const MAX_SIZE_ENCODED_PACKAGE = 13794305;
/**
 * `WC` in the paper
 */
const SERVICECODE_MAX_SIZE = 40000000;
/**
 * `BS` in the paper
 */
const SERVICE_MIN_BALANCE = 100n;
/**
 * `BL` in the paper
 */
const SERVICE_ADDITIONAL_BALANCE_PER_OCTET = 1n;
/**
 * `BI` in the paper
 */
const SERVICE_ADDITIONAL_BALANCE_PER_ITEM = 10n;
/**
 * `M` in the paper
 * `WT` in the paper
 */
const TRANSFER_MEMO_SIZE = 128;
/**
 * `D` in the paper
 * $(0.7.1 - B.3)
 */
let PREIMAGE_EXPIRATION = 19200;
/**
 * `WE` in the paper
 */
const ERASURECODE_BASIC_SIZE = 684;
/**
 * `WP` in the paper
 */
let ERASURECODE_EXPORTED_SIZE = 6;
/**
 * `WG` in the paper
 */
const ERASURECODE_SEGMENT_SIZE = ((ERASURECODE_BASIC_SIZE * ERASURECODE_EXPORTED_SIZE));
/**
 * `WR` in the paper
 */
const MAX_TOT_SIZE_BLOBS_WORKREPORT = 48 * 2 ** 10;
/**
 * `WX` in the paper
 */
const MAX_EXPORTED_ITEMS = 3072;
/**
 * `GA`
 */
const TOTAL_GAS_ACCUMULATION_LOGIC = 10000000n;
/**
 * `GR`
 */
let TOTAL_GAS_REFINEMENT_LOGIC = 5000000000n;
/**
 * `GI`
 */
const TOTAL_GAS_IS_AUTHORIZED = 50000000n;
/**
 * `GT`
 */
let TOTAL_GAS_ACCUMULATION_ALL_CORES = 3500000000n;
// $(0.7.1 - 4.25)
const Zp = 2 ** 12;
// `S`
const MINIMUM_PUBLIC_SERVICE_INDEX = 2 ** 16;
/**
 * Runtime initialization helpers
 *
 * Call `initConstants()` early in your application bootstrap (before importing modules
 * that rely on these variant-controlled values). If no `mode` is provided, the
 * function reads `process.env.JAM_CONSTANTS` and falls back to `'full'`.
 */
let CURRENT_MODE = "full";
function initConstants(mode) {
    const m = (process.env.JAM_CONSTANTS === "tiny" ? "tiny" : "full");
    if (m === "full")
        return;
    const v = _tiny;
    NUMBER_OF_VALIDATORS = v.NUMBER_OF_VALIDATORS;
    CORES = v.CORES;
    PREIMAGE_EXPIRATION = v.PREIMAGE_EXPIRATION;
    BLOCK_TIME = v.BLOCK_TIME;
    EPOCH_LENGTH = v.EPOCH_LENGTH;
    LOTTERY_MAX_SLOT = v.LOTTERY_MAX_SLOT;
    MAX_TICKETS_PER_VALIDATOR = v.MAX_TICKETS_PER_VALIDATOR;
    MAX_TICKETS_PER_BLOCK = v.MAX_TICKETS_PER_BLOCK;
    VALIDATOR_CORE_ROTATION = v.VALIDATOR_CORE_ROTATION;
    ERASURECODE_EXPORTED_SIZE = v.ERASURECODE_EXPORTED_SIZE;
    TOTAL_GAS_ACCUMULATION_ALL_CORES = (v.TOTAL_GAS_ACCUMULATION_ALL_CORES);
    TOTAL_GAS_REFINEMENT_LOGIC = v.TOTAL_GAS_REFINEMENT_LOGIC;
    MINIMUM_VALIDATORS = v.MINIMUM_VALIDATORS;
    CURRENT_MODE = m;
}
function getConstantsMode() {
    return CURRENT_MODE;
}
// initialize once synchronously from ENV at module load (fallback to 'full')
initConstants();

/**
 * encode with codec a value by also creating the buffer
 * @param codec - the codec to use
 * @param value - the value to encode
 */
const encodeWithCodec = (codec, value) => {
    const buffer = new Uint8Array(codec.encodedSize(value));
    codec.encode(value, buffer);
    return buffer;
};
/**
 * provides utility to clone a value with a codec
 */
const cloneWithCodec = (codec, value) => {
    return codec.decode(encodeWithCodec(codec, value)).value;
};
const createCodec = (itemsCodec) => {
    return {
        encode(value, bytes) {
            let offset = 0;
            for (const [key, codec] of itemsCodec) {
                try {
                    offset += codec.encode(value[key], bytes.subarray(offset));
                }
                catch (e) {
                    console.error(`Error encoding key: ${key}`, e, value[key], codec, Object.getPrototypeOf(value));
                    throw e;
                }
            }
            return offset;
        },
        decode(bytes) {
            let offset = 0;
            const toRet = {};
            for (const [key, codec] of itemsCodec) {
                if (typeof codec.decode === "undefined") {
                    throw new Error(`codec.decode for ${String(key)} is undefined`);
                }
                const { value, readBytes } = codec.decode(bytes.subarray(offset));
                toRet[key] = value;
                offset += readBytes;
            }
            return { value: toRet, readBytes: offset };
        },
        encodedSize(value) {
            let size = 0;
            for (const [key, codec] of itemsCodec) {
                size += codec.encodedSize(value[key]);
            }
            return size;
        },
    };
};
/**
 * transform a T codec into a U codec
 */
const mapCodec = (codec, map, inverse) => {
    return {
        encode(value, bytes) {
            return codec.encode(inverse(value), bytes);
        },
        decode(bytes) {
            const { value, readBytes } = codec.decode(bytes);
            return { value: map(value), readBytes };
        },
        encodedSize(value) {
            return codec.encodedSize(inverse(value));
        },
    };
};

const CODEC_METADATA = Symbol.for("__jamcodecs__");
/**
 * used to mark that json element is the only one to be serialized/deserialized so
 * property key should not be used and wrapped
 */
const SINGLE_ELEMENT_CLASS = Symbol.for("__jamcodec__singleelclass");
/**
 * This is a base class for JamCodecable classes.
 * It provides the basic structure for encoding and decoding
 * properties with JamCodec.
 */
class BaseJamCodecable {
    static encode(x, buf) {
        throw new Error(`stub! ${this.name}`);
    }
    static decode(bytes) {
        throw new Error(`stub! ${this.name}`);
    }
    static encodedSize(value) {
        throw new Error(`stub! ${this.name}`);
    }
    static fromJSON(json) {
        throw new Error(`stub! ${this.name}`);
    }
    static toJSON(value) {
        throw new Error(`stub! ${this.name}`);
    }
    static codecOf(x) {
        const el = this.prototype[CODEC_METADATA]?.find((a) => a.propertyKey === x);
        assert(el, `Codec for property ${String(x)} not found in ${this.name}`);
        return {
            encode: el.codec.encode.bind(el.codec),
            decode: el.codec.decode.bind(el.codec),
            encodedSize: el.codec.encodedSize.bind(el.codec),
            fromJSON: el.json.codec.fromJSON.bind(el.json.codec),
            toJSON: el.json.codec.toJSON.bind(el.json.codec),
        };
    }
    toBinary() {
        throw new Error("stub");
    }
    toJSON() {
        throw new Error("stub!");
    }
}
const asCodec = (a) => {
    return a;
};
const cloneCodecable = (instance) => {
    const proto = Object.getPrototypeOf(instance).constructor;
    return cloneWithCodec(proto, instance);
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const createJSONCodec = (itemsCodec) => {
    return {
        fromJSON(json) {
            const newInst = {};
            for (const [key, jsonKey, codec] of itemsCodec) {
                try {
                    newInst[key] = codec.fromJSON(json[jsonKey]);
                }
                catch (e) {
                    console.error("Error in JSONCodec", key, jsonKey, e?.message);
                    console.error(e);
                    console.log(json[jsonKey]);
                    throw e;
                }
            }
            return newInst;
        },
        toJSON(value) {
            const toRet = {};
            for (const [key, jsonKey, codec] of itemsCodec) {
                toRet[jsonKey] = codec.toJSON(value[key]);
            }
            return toRet;
        },
    };
};

function binaryCodec(codec) {
    return function (target, propertyKey) {
        if (!target[CODEC_METADATA]) {
            target[CODEC_METADATA] = [];
        }
        target[CODEC_METADATA].push({ propertyKey, codec });
    };
}
function jsonCodec(codec, key) {
    return function (target, propertyKey) {
        if (!target[CODEC_METADATA]) {
            target[CODEC_METADATA] = [];
        }
        const item = target[CODEC_METADATA].find((x) => x.propertyKey === propertyKey);
        if (typeof item === "undefined") {
            throw new Error(`jsonCodec decorator for ${String(propertyKey)} must be applied after binaryCodec decorator`);
        }
        item.json = {
            codec: codec,
            key,
        };
    };
}
function codec$1(codec, json, jsonKey) {
    const key = typeof json === "string" || json === SINGLE_ELEMENT_CLASS ? json : jsonKey;
    const _jsonCodec = typeof json === "object" ? json : codec;
    return function (target, propertyKey) {
        binaryCodec(codec)(target, propertyKey);
        jsonCodec(_jsonCodec, key)(target, propertyKey);
    };
}
function JamCodecable(jsonCodecInConstructor) {
    return function (constructor) {
        const d = constructor.prototype[CODEC_METADATA];
        // check codec at runtime
        d.forEach(({ propertyKey, codec }) => {
            if (typeof codec === "undefined" || typeof codec.encode !== "function") {
                console.log(constructor.name, codec);
                throw new Error(`codec for ${propertyKey} is not defined properly`);
            }
        });
        const codec = mapCodec(createCodec(
        // @ts-gnore
        d.map(({ propertyKey, codec }) => [propertyKey, codec])), (pojo) => {
            const x = new newConstr();
            Object.assign(x, pojo);
            return x;
        }, (c) => c);
        let isMainEl = false;
        let jsonCodec = createJSONCodec(d.map(({ propertyKey, json }) => {
            if (typeof json === "undefined") {
                throw new Error(`json codec for ${propertyKey} is not defined`);
            }
            isMainEl = isMainEl || json.key === SINGLE_ELEMENT_CLASS;
            return [propertyKey, json.key ?? propertyKey, json.codec];
        }));
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
            jsonCodec = constructor;
        }
        // newConstr is needed for the instanceof Check and to make sure that the method
        const newConstr = preserveClassName(constructor.name, 
        // @ts-expect-error i know what I'm doing
        class extends constructor {
            toBinary() {
                return encodeWithCodec(codec, this);
            }
            toJSON() {
                return jsonCodec.toJSON(this);
            }
            static encode(x, buf) {
                return codec.encode(x, buf);
            }
            static decode(bytes) {
                return codec.decode(bytes);
            }
            static encodedSize(value) {
                const size = codec.encodedSize(value);
                return size;
            }
            static fromJSON(json) {
                const pojo = jsonCodec.fromJSON(json);
                const x = new newConstr();
                Object.assign(x, pojo);
                return x;
            }
            static toJSON(value) {
                return jsonCodec.toJSON(value);
            }
        });
        return newConstr;
    };
}
const preserveClassName = (name, constr) => {
    return new Function("Base", `return class ${name} extends Base {}`)(constr);
};

const toHex$1 = (buf) => {
    return Array.from(buf).map((byte) => byte.toString(16).padStart(2, '0')).join('');
};
const uncheckedConverter$1 = {
    arrayToBigEndian(buf) {
        if (buf.length === 0) {
            return 0n;
        }
        return BigInt('0x' + toHex$1(buf));
    },
    arrayToLittleEndian(buf) {
        if (buf.length === 0) {
            return 0n;
        }
        return BigInt('0x' + toHex$1(new Uint8Array(buf).reverse()));
    },
    bigEndianToNewArray(num, bytes) {
        const toRet = new Uint8Array(bytes);
        uncheckedConverter$1.bigEndianToArray(num, toRet);
        return toRet;
    },
    bigEndianToArray(num, dest) {
        const hex = num.toString(16).padStart(dest.length * 2, '0');
        dest.set(hex.match(/.{2}/g).map((byte) => parseInt(byte, 16)));
    },
    littleEndianToNewArray(num, bytes) {
        const toRet = new Uint8Array(bytes);
        uncheckedConverter$1.littleEndianToArray(num, toRet);
        return toRet;
    },
    littleEndianToArray(num, dest) {
        uncheckedConverter$1.bigEndianToArray(num, dest);
        dest.reverse();
    }
};

/**
 * simple little encoding for positive integers
 * formula (272) of graypaper
 */
const LittleEndian = {
    encode: (value, bytes) => {
        if (bytes.length === 0) {
            return 0;
        }
        value = BigInt(value);
        assert$1.ok(value >= 0, "value must be positive");
        assert$1.ok(value < 2 ** (8 * bytes.length), "value is too large");
        // we could use the converter but the performance would take a hit at no benefit (checks above)
        uncheckedConverter$1.littleEndianToArray(value, bytes);
        return bytes.length;
    },
    decode: (bytes) => {
        return {
            value: uncheckedConverter$1.arrayToLittleEndian(bytes),
            readBytes: bytes.length, // when this method is being called we know the length
        };
    },
    encodedSize: () => {
        throw new Error("Not implemented");
    },
};

const bufToHex = (b) => `0x${Buffer.from(b).toString("hex")}`;
const BigIntJSONCodec = () => {
    return {
        fromJSON(json) {
            return BigInt(json);
        },
        toJSON(value) {
            return Number(value); // TODO: this might fail due to loss in precision
        },
    };
};
const NumberJSONCodec = () => {
    return {
        fromJSON(json) {
            return json;
        },
        toJSON(value) {
            return value;
        },
    };
};
const BufferJSONCodec = () => {
    return {
        fromJSON(json) {
            return new Uint8Array([...Buffer.from(json.slice(2), "hex")]);
        },
        toJSON(value) {
            return bufToHex(value);
        },
    };
};
const Uint8ArrayJSONCodec = {
    fromJSON(json) {
        return new Uint8Array([...Buffer.from(json.slice(2), "hex")]);
    },
    toJSON(value) {
        return bufToHex(value);
    },
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ArrayOfJSONCodec = (singleCodec) => {
    return {
        fromJSON(json) {
            return json.map((item) => singleCodec.fromJSON(item));
        },
        toJSON(value) {
            return value.map((item) => singleCodec.toJSON(item));
        },
    };
};
const MapJSONCodec = (jsonKeys, keyCodec, valueCodec) => {
    return {
        fromJSON(json) {
            return new Map(json.map((item) => [
                keyCodec.fromJSON(item[jsonKeys.key]),
                valueCodec.fromJSON(item[jsonKeys.value]),
            ]));
        },
        toJSON(value) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return [...value.entries()].map(([key, value]) => ({
                [jsonKeys.key]: keyCodec.toJSON(key),
                [jsonKeys.value]: valueCodec.toJSON(value),
            }));
        },
    };
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WrapJSONCodec = (key, codec) => {
    return {
        fromJSON(json) {
            return codec.fromJSON(json[key]);
        },
        toJSON(value) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return {
                [key]: codec.toJSON(value),
            };
        },
    };
};
const NULLORCodec = (tCodec) => {
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
const ZipJSONCodecs = (first, second) => {
    return {
        fromJSON(json) {
            return second.fromJSON(first.fromJSON(json));
        },
        toJSON(value) {
            return first.toJSON(second.toJSON(value));
        },
    };
};

/**
 * @param sub - the number of bytes to encode
 * $(0.7.1 - C.12)
 */
const E_sub = (sub) => ({
    encode: (value, bytes) => {
        assert$1(bytes.length >= sub, `bytes length=${bytes.length} must be >= sub=${sub}`);
        bytes.set(toBufferLE(value, sub));
        return sub; // LittleEndian.encode(value, bytes.subarray(0, sub));
    },
    decode: (bytes) => {
        if (bytes.length < sub) {
            const padded = new Uint8Array(sub).fill(0);
            padded.set(bytes);
            return LittleEndian.decode(padded);
        }
        const value = toBigIntLE(bytes.subarray(0, sub));
        return { value, readBytes: sub };
    },
    encodedSize: () => {
        return sub;
    },
});
const E_1 = E_sub(1);
const E_2 = E_sub(2);
const E_4 = E_sub(4);
const E_8 = E_sub(8);
/**
 * @see (273) appendix C of the spec
 * @param sub - the number of bytes to encode
 */
const E_sub_int = (sub) => ({
    encode: (value, bytes) => {
        assert$1(bytes.length >= sub, `bytes length=${bytes.length} must >= sub=${sub}`);
        return LittleEndian.encode(BigInt(value), bytes.subarray(0, sub));
    },
    decode: (bytes) => {
        if (bytes.length < sub) {
            const padded = new Uint8Array(sub).fill(0);
            padded.set(bytes);
            const r = LittleEndian.decode(padded);
            return {
                value: Number(r.value),
                readBytes: r.readBytes,
            };
        }
        const r = LittleEndian.decode(bytes.subarray(0, sub));
        return {
            value: Number(r.value),
            readBytes: r.readBytes,
        };
    },
    encodedSize: () => {
        return sub;
    },
});
const E_1_int = E_sub_int(1);
const E_2_int = E_sub_int(2);
const E_4_int = E_sub_int(4);
// init classes decorators
const eSubBigIntCodec = (bytes, jsonKey) => {
    return (target, propertyKey) => {
        binaryCodec(E_sub(bytes))(target, propertyKey);
        jsonCodec(BigIntJSONCodec(), jsonKey)(target, propertyKey);
    };
};
const eSubIntCodec = (bytes, jsonKey) => {
    return (target, propertyKey) => {
        binaryCodec(E_sub_int(bytes))(target, propertyKey);
        jsonCodec(NumberJSONCodec(), jsonKey)(target, propertyKey);
    };
};

const booleanCodec = (jsonKey) => {
    return (target, propertyKey) => {
        binaryCodec(mapCodec(E_1_int, (v) => v === 1, (v) => (v ? 1 : 0)))(target, propertyKey);
        jsonCodec({
            fromJSON(json) {
                return json;
            },
            toJSON(value) {
                return value;
            },
        }, jsonKey)(target, propertyKey);
    };
};

/**
 * E encoding allows for variable size encoding for numbers up to 2^64
 * $(0.7.1 - C.5)
 */
const E = {
    encode: (value, bytes) => {
        assert$1.ok(value >= 0, "value must be positive");
        if (value == 0n) {
            bytes[0] = 0;
            return 1;
        }
        else if (value < 2 ** (7 * 8)) {
            // 2 ** (7 * 8) = 2 ** 56
            let l = 0;
            for (let i = 1; i < 8; i++) {
                if (value >= 2n ** (7n * BigInt(i))) {
                    l = i;
                }
                else {
                    break; // i dont like the break here but it's efficient
                }
            }
            const ln = BigInt(l);
            bytes[0] = Number(2n ** 8n - 2n ** (8n - ln) + value / 2n ** (8n * ln));
            const e = E_sub(l).encode(value % 2n ** (8n * ln), bytes.subarray(1, l + 1));
            return e + 1;
        }
        else {
            // encoding from 2 ** 56 to 2 ** 64 - 1 - inclusive
            assert$1.ok(value < 2n ** 64n, "value is too large");
            bytes[0] = 2 ** 8 - 1; // 255
            E_8.encode(value, bytes.subarray(1, 9));
            return 9; // 1 + 8
        }
    },
    decode: (bytes) => {
        const first = bytes[0];
        if (first == 0) {
            return { value: 0n, readBytes: 1 };
        }
        else if (first < 255) {
            let l = 0;
            for (let i = 0; i < 8; i++) {
                if (first >= 2 ** 8 - 2 ** (8 - i)) {
                    l = i;
                }
                else {
                    break; // i dont like the break here but it's efficient
                }
            }
            const remainder = first - (2 ** 8 - 2 ** (8 - l));
            const xMod2Pow8l = E_sub(l).decode(bytes.subarray(1, l + 1)).value;
            return {
                value: xMod2Pow8l + 2n ** (8n * BigInt(l)) * BigInt(remainder),
                readBytes: l + 1,
            };
        }
        else {
            // 255
            return {
                value: E_8.decode(bytes.subarray(1, 9)).value,
                readBytes: 9,
            };
        }
    },
    encodedSize: (value) => {
        assert$1.ok(value >= 0, "value must be positive");
        if (value < 2 ** (7 * 8)) {
            let l = 0;
            for (let i = 1; i < 9; i++) {
                if (value >= 2n ** (7n * BigInt(i))) {
                    l = i;
                }
                else {
                    break; // i dont like the break here but it's efficient
                }
            }
            return 1 + l;
        }
        else {
            return 9;
        }
    },
};
const E_bigint = () => mapCodec(E, (v) => v, (v) => v);
const E_int = () => mapCodec(E, (v) => Number(v), (v) => BigInt(v));
const eBigIntCodec = (jsonKey) => {
    return (target, propertyKey) => {
        binaryCodec(E_bigint())(target, propertyKey);
        jsonCodec(BigIntJSONCodec(), jsonKey)(target, propertyKey);
    };
};
const eIntCodec = (jsonKey) => {
    return (target, propertyKey) => {
        binaryCodec(E_int())(target, propertyKey);
        jsonCodec(NumberJSONCodec(), jsonKey)(target, propertyKey);
    };
};

/**
 * $(0.7.1 - C.9)
 */
const BitSequenceCodec = (numElements) => {
    return {
        encode: function (value, bytes) {
            const nB = this.encodedSize(value);
            assert$1.ok(bytes.length >= nB, "bytes not long enough");
            for (let i = 0; i < nB; i++) {
                let byte = 0;
                for (let j = 0; j < 8; j++) {
                    const bit = value[i * 8 + j];
                    byte = byte | (bit << j);
                }
                bytes[i] = byte;
            }
            return nB;
        },
        decode: function (bytes) {
            const nB = Math.ceil(numElements / 8); //bytes.length;
            const value = [];
            for (let i = 0; i < nB; i++) {
                const byte = bytes[i];
                for (let j = 0; j < 8; j++) {
                    value.push(((byte >> j) & 1));
                }
            }
            return { value: value.slice(0, numElements), readBytes: nB };
        },
        encodedSize: function (value) {
            return Math.ceil(value.length / 8);
        },
    };
};
const bitSequenceCodec = (numElements, jsonKey) => {
    return (target, propertyKey) => {
        binaryCodec(BitSequenceCodec(numElements))(target, propertyKey);
        jsonCodec(ZipJSONCodecs(BufferJSONCodec(), {
            fromJSON(json) {
                const bitstring = [];
                for (let i = 0; i < CORES; i++) {
                    const byte = (i / 8) | 0;
                    const index = i % 8;
                    bitstring.push(((Number(json[byte]) >> index) % 2));
                }
                return bitstring;
            },
            toJSON(value) {
                const toRet = Buffer.alloc(Math.floor((value.length + 7) / 8)).fill(0);
                for (let i = 0; i < value.length; i++) {
                    const byte = (i / 8) | 0;
                    const index = i % 8;
                    const curVal = toRet[byte];
                    toRet[byte] = curVal | (value[i] << index);
                }
                return toRet;
            },
        }), jsonKey)(target, propertyKey);
    };
};

/**
 * OptCodec is a codec that allows for optional values
 * $(0.7.1 - C.8)
 */
class Optional {
    constructor(codec) {
        this.codec = codec;
    }
    encode(value, bytes) {
        if (typeof value === "undefined" || value === null) {
            bytes[0] = 0;
        }
        else {
            bytes[0] = 1;
            this.codec.encode(value, bytes.subarray(1));
        }
        return this.encodedSize(value);
    }
    decode(bytes) {
        if (bytes[0] === 0) {
            return { value: undefined, readBytes: 1 };
        }
        else {
            const decoded = this.codec.decode(bytes.subarray(1));
            return { value: decoded.value, readBytes: decoded.readBytes + 1 };
        }
    }
    encodedSize(value) {
        if (typeof value === "undefined" || value === null) {
            return 1;
        }
        return this.codec.encodedSize(value) + 1;
    }
}
/**
 * class property decorator
 */
const optionalCodec = (codec, jsonKey) => {
    return function (target, propertyKey) {
        binaryCodec(new Optional(codec))(target, propertyKey);
        jsonCodec(NULLORCodec(codec), jsonKey)(target, propertyKey);
    };
};

// $(0.7.1 - C.2)
const IdentityCodec = {
    decode(bytes) {
        return { value: bytes, readBytes: bytes.length };
    },
    encode(value, bytes) {
        bytes.set(value);
        return value.length;
    },
    encodedSize(value) {
        return value.length;
    },
};
const fixedSizeIdentityCodec = (size) => {
    return {
        decode(bytes) {
            return { value: bytes.subarray(0, size), readBytes: size };
        },
        encode(value, bytes) {
            bytes.set(value);
            return value.length;
        },
        encodedSize() {
            return size;
        },
    };
};
const xBytesCodec = (k) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
        ...fixedSizeIdentityCodec(k),
        ...BufferJSONCodec(),
    };
};

/**
 * Length discriminator provides a way to encode variable length stuff
 * by prepending the length
 */
class LengthDiscriminator {
    constructor(subCodec) {
        this.subCodec = subCodec;
    }
    encode(value, bytes) {
        const length = (this.subCodec.length ?? this.subCodec.encodedSize).call(this.subCodec, value);
        const sizeBN = BigInt(length);
        const lengthSize = E.encodedSize(sizeBN);
        E.encode(sizeBN, bytes.subarray(0, lengthSize));
        const encodedSize = this.subCodec.encode(value, bytes.subarray(lengthSize));
        return lengthSize + encodedSize;
    }
    decode(bytes) {
        const encodedLength = E.decode(bytes);
        const encodedValue = this.subCodec.decode(bytes.subarray(encodedLength.readBytes), Number(encodedLength.value));
        return {
            value: encodedValue.value,
            readBytes: encodedLength.readBytes + encodedValue.readBytes,
        };
    }
    encodedSize(value) {
        const x = this.subCodec.encodedSize(value);
        return (x +
            E.encodedSize(BigInt((this.subCodec.length ?? this.subCodec.encodedSize).call(this.subCodec, value))));
    }
}
const createLengthDiscriminatedIdentity = () => {
    return new LengthDiscriminator({
        ...IdentityCodec,
        decode(bytes, length) {
            return IdentityCodec.decode(bytes.subarray(0, length));
        },
    });
};
const x = createLengthDiscriminatedIdentity();
/**
 * Utility to encode/decode a byteArray with a length discriminator
 */
const LengthDiscrimantedIdentityCodec = {
    encode: x.encode.bind(x),
    decode: x.decode.bind(x),
    encodedSize: x.encodedSize.bind(x),
    ...BufferJSONCodec(),
};

/**
 * ArrayLengthDiscriminator provides a way to encode variable length array of single encodable elements
 * $(0.7.1 - C.7)
 *
 */
const createArrayLengthDiscriminator = (singleItemCodec) => {
    const codec = new LengthDiscriminator({
        encode: (value, bytes) => {
            return value.reduce((acc, item) => acc + singleItemCodec.encode(item, bytes.subarray(acc)), 0);
        },
        decode: (bytes, length) => {
            const values = [];
            let offset = 0;
            for (let i = 0; i < length; i++) {
                const decoded = singleItemCodec.decode(bytes.subarray(offset));
                values.push(decoded.value);
                offset += decoded.readBytes;
            }
            return { value: values, readBytes: offset };
        },
        length(value) {
            return value.length;
        },
        encodedSize: (value) => {
            return value.reduce((acc, item) => acc + singleItemCodec.encodedSize(item), 0);
        },
    });
    return codec;
    // return {
    //   encode: codec.encode.bind(codec),
    //   decode: codec.decode.bind(codec),
    //   encodedSize: codec.encodedSize.bind(codec),
    // };
};
// class property decorator
const lengthDiscriminatedCodec = (codec, jsonKey) => {
    return (target, propertyKey) => {
        binaryCodec(createArrayLengthDiscriminator(codec))(target, propertyKey);
        jsonCodec(ArrayOfJSONCodec(codec), jsonKey)(target, propertyKey);
    };
};

const createSequenceCodec = (howMany, codec) => {
    return {
        encode(value, bytes) {
            assert$1(value.length === howMany, `Invalid array length ${value.length} - ${howMany}`);
            let offset = 0;
            for (let i = 0; i < howMany; i++) {
                offset += codec.encode(value[i], bytes.subarray(offset));
            }
            return offset;
        },
        decode(bytes) {
            const values = [];
            let offset = 0;
            for (let i = 0; i < howMany; i++) {
                const decoded = codec.decode(bytes.subarray(offset));
                values.push(decoded.value);
                offset += decoded.readBytes;
            }
            return { value: values, readBytes: offset };
        },
        encodedSize: (value) => {
            return value.reduce((acc, item) => acc + codec.encodedSize(item), 0);
        },
    };
};
const sequenceCodec = (length, codec, jsonKey) => {
    return function (target, propertyKey) {
        binaryCodec(createSequenceCodec(length, codec))(target, propertyKey);
        jsonCodec(ArrayOfJSONCodec(codec), jsonKey)(target, propertyKey);
    };
};

/**
 * builds a generic dictionaty codec by providing all items
 */
function buildGenericKeyValueCodec(keyCodec, valueCodec, keySorter) {
    const c = new LengthDiscriminator(new KeyValue(keyCodec, valueCodec, keySorter));
    return {
        encode: c.encode.bind(c),
        decode: c.decode.bind(c),
        encodedSize: c.encodedSize.bind(c),
    };
}
/**
 * Base keyvalue codec.
 * It encodes a dictionary with orderable keys into key value pairs.
 * it's out of spec as it is. The spec defines a Variable length discriminator is needed
 * when using a fn as valueCodec, the key for each given element is provided.
 * @see buildKeyValueCodec
 * $(0.7.1 - C.10)
 */
class KeyValue {
    constructor(keyCodec, valueCodec, keySorter) {
        this.keyCodec = keyCodec;
        this.valueCodec = valueCodec;
        this.keySorter = keySorter;
    }
    encode(value, bytes) {
        let offset = 0;
        const orderedKeys = [...value.keys()].sort(this.keySorter);
        for (const key of orderedKeys) {
            offset += this.keyCodec.encode(key, bytes.subarray(offset));
            offset += this.valueCodec.encode(value.get(key), bytes.subarray(offset));
        }
        return offset;
    }
    length(value) {
        return value.size;
    }
    decode(bytes, length) {
        const orderedKeys = [];
        const orderedValues = [];
        let offset = 0;
        while (orderedKeys.length < length) {
            const key = this.keyCodec.decode(bytes.subarray(offset));
            offset += key.readBytes;
            const valueCodec = this.valueCodec;
            const value = valueCodec.decode(bytes.subarray(offset));
            offset += value.readBytes;
            orderedKeys.push(key.value);
            orderedValues.push(value.value);
        }
        return {
            value: new Map(orderedKeys.map((key, index) => [key, orderedValues[index]])),
            readBytes: offset,
        };
    }
    encodedSize(value) {
        return [...value.keys()].reduce((acc, key) => {
            const valueCodec = this.valueCodec;
            return (acc +
                this.keyCodec.encodedSize(key) +
                valueCodec.encodedSize(value.get(key)));
        }, 0);
    }
}

/**
 * This codec factory creates a codec that is able to
 * encode/decode an object that has only one if their property set
 * ex {a: 1} or {b: 2} but not {a: 1, b: 2}
 * so in the case above `T = {a?: number, b?: number}`
 * there is no formalism for this in graypaper but it does come handy in some situations
 */
const eitherOneOfCodec = (itemsCodec) => {
    return {
        encode(value, bytes) {
            for (let i = 0; i < itemsCodec.length; i++) {
                const [key, codec] = itemsCodec[i];
                if (typeof value[key] !== "undefined") {
                    bytes[0] = i;
                    return 1 + codec.encode(value[key], bytes.subarray(1));
                }
            }
            throw new Error("No codec for value");
        },
        decode(bytes) {
            const byte = bytes[0];
            const [key, codec] = itemsCodec[byte];
            const { value, readBytes } = codec.decode(bytes.subarray(1));
            return { value: { [key]: value }, readBytes: 1 + readBytes };
        },
        encodedSize(value) {
            for (let i = 0; i < itemsCodec.length; i++) {
                const [key, codec] = itemsCodec[i];
                if (typeof value[key] !== "undefined") {
                    return 1 + codec.encodedSize(value[key]);
                }
            }
            throw new Error("No codec for value");
        },
    };
};

const toHex = (buf) => {
    return Array.from(buf).map((byte) => byte.toString(16).padStart(2, '0')).join('');
};
const uncheckedConverter = {
    arrayToBigEndian(buf) {
        if (buf.length === 0) {
            return 0n;
        }
        return BigInt('0x' + toHex(buf));
    },
    arrayToLittleEndian(buf) {
        if (buf.length === 0) {
            return 0n;
        }
        return BigInt('0x' + toHex(new Uint8Array(buf).reverse()));
    },
    bigEndianToNewArray(num, bytes) {
        const toRet = new Uint8Array(bytes);
        uncheckedConverter.bigEndianToArray(num, toRet);
        return toRet;
    },
    bigEndianToArray(num, dest) {
        const hex = num.toString(16).padStart(dest.length * 2, '0');
        dest.set(hex.match(/.{2}/g).map((byte) => parseInt(byte, 16)));
    },
    littleEndianToNewArray(num, bytes) {
        const toRet = new Uint8Array(bytes);
        uncheckedConverter.littleEndianToArray(num, toRet);
        return toRet;
    },
    littleEndianToArray(num, dest) {
        uncheckedConverter.bigEndianToArray(num, dest);
        dest.reverse();
    }
};

const objectToString = Object.prototype.toString;
const uint8ArrayStringified = '[object Uint8Array]';

function isType(value, typeConstructor, typeStringified) {
	if (!value) {
		return false;
	}

	if (value.constructor === typeConstructor) {
		return true;
	}

	return objectToString.call(value) === typeStringified;
}

function isUint8Array(value) {
	return isType(value, Uint8Array, uint8ArrayStringified);
}

function assertUint8Array(value) {
	if (!isUint8Array(value)) {
		throw new TypeError(`Expected \`Uint8Array\`, got \`${typeof value}\``);
	}
}

function concatUint8Arrays(arrays, totalLength) {
	if (arrays.length === 0) {
		return new Uint8Array(0);
	}

	totalLength ??= arrays.reduce((accumulator, currentValue) => accumulator + currentValue.length, 0);

	const returnValue = new Uint8Array(totalLength);

	let offset = 0;
	for (const array of arrays) {
		assertUint8Array(array);
		returnValue.set(array, offset);
		offset += array.length;
	}

	return returnValue;
}

function compareUint8Arrays(a, b) {
	assertUint8Array(a);
	assertUint8Array(b);

	const length = Math.min(a.length, b.length);

	for (let index = 0; index < length; index++) {
		const diff = a[index] - b[index];
		if (diff !== 0) {
			return Math.sign(diff);
		}
	}

	// At this point, all the compared elements are equal.
	// The shorter array should come first if the arrays are of different lengths.
	return Math.sign(a.length - b.length);
}

({
	utf8: new globalThis.TextDecoder('utf8'),
});

new globalThis.TextEncoder();

Array.from({length: 256}, (_, index) => index.toString(16).padStart(2, '0'));

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function getAugmentedNamespace(n) {
  if (Object.prototype.hasOwnProperty.call(n, '__esModule')) return n;
  var f = n.default;
	if (typeof f == "function") {
		var a = function a () {
			var isInstance = false;
      try {
        isInstance = this instanceof a;
      } catch {}
			if (isInstance) {
        return Reflect.construct(f, arguments, this.constructor);
			}
			return f.apply(this, arguments);
		};
		a.prototype = f.prototype;
  } else a = {};
  Object.defineProperty(a, '__esModule', {value: true});
	Object.keys(n).forEach(function (k) {
		var d = Object.getOwnPropertyDescriptor(n, k);
		Object.defineProperty(a, k, d.get ? d : {
			enumerable: true,
			get: function () {
				return n[k];
			}
		});
	});
	return a;
}

var dist = {};

const defaultErrorConfig = {
    withStackTrace: false,
};
// Custom error object
// Context / discussion: https://github.com/supermacro/neverthrow/pull/215
const createNeverThrowError = (message, result, config = defaultErrorConfig) => {
    const data = result.isOk()
        ? { type: 'Ok', value: result.value }
        : { type: 'Err', value: result.error };
    const maybeStack = config.withStackTrace ? new Error().stack : undefined;
    return {
        data,
        message,
        stack: maybeStack,
    };
};

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, [])).next());
    });
}

function __values(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}

function __await(v) {
    return this instanceof __await ? (this.v = v, this) : new __await(v);
}

function __asyncGenerator(thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
}

function __asyncDelegator(o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
    function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: false } : f ? f(v) : v; } : f; }
}

function __asyncValues(o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

class ResultAsync {
    constructor(res) {
        this._promise = res;
    }
    static fromSafePromise(promise) {
        const newPromise = promise.then((value) => new Ok(value));
        return new ResultAsync(newPromise);
    }
    static fromPromise(promise, errorFn) {
        const newPromise = promise
            .then((value) => new Ok(value))
            .catch((e) => new Err(errorFn(e)));
        return new ResultAsync(newPromise);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static fromThrowable(fn, errorFn) {
        return (...args) => {
            return new ResultAsync((() => __awaiter(this, void 0, void 0, function* () {
                try {
                    return new Ok(yield fn(...args));
                }
                catch (error) {
                    return new Err(errorFn ? errorFn(error) : error);
                }
            }))());
        };
    }
    static combine(asyncResultList) {
        return combineResultAsyncList(asyncResultList);
    }
    static combineWithAllErrors(asyncResultList) {
        return combineResultAsyncListWithAllErrors(asyncResultList);
    }
    map(f) {
        return new ResultAsync(this._promise.then((res) => __awaiter(this, void 0, void 0, function* () {
            if (res.isErr()) {
                return new Err(res.error);
            }
            return new Ok(yield f(res.value));
        })));
    }
    andThrough(f) {
        return new ResultAsync(this._promise.then((res) => __awaiter(this, void 0, void 0, function* () {
            if (res.isErr()) {
                return new Err(res.error);
            }
            const newRes = yield f(res.value);
            if (newRes.isErr()) {
                return new Err(newRes.error);
            }
            return new Ok(res.value);
        })));
    }
    andTee(f) {
        return new ResultAsync(this._promise.then((res) => __awaiter(this, void 0, void 0, function* () {
            if (res.isErr()) {
                return new Err(res.error);
            }
            try {
                yield f(res.value);
            }
            catch (e) {
                // Tee does not care about the error
            }
            return new Ok(res.value);
        })));
    }
    orTee(f) {
        return new ResultAsync(this._promise.then((res) => __awaiter(this, void 0, void 0, function* () {
            if (res.isOk()) {
                return new Ok(res.value);
            }
            try {
                yield f(res.error);
            }
            catch (e) {
                // Tee does not care about the error
            }
            return new Err(res.error);
        })));
    }
    mapErr(f) {
        return new ResultAsync(this._promise.then((res) => __awaiter(this, void 0, void 0, function* () {
            if (res.isOk()) {
                return new Ok(res.value);
            }
            return new Err(yield f(res.error));
        })));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    andThen(f) {
        return new ResultAsync(this._promise.then((res) => {
            if (res.isErr()) {
                return new Err(res.error);
            }
            const newValue = f(res.value);
            return newValue instanceof ResultAsync ? newValue._promise : newValue;
        }));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    orElse(f) {
        return new ResultAsync(this._promise.then((res) => __awaiter(this, void 0, void 0, function* () {
            if (res.isErr()) {
                return f(res.error);
            }
            return new Ok(res.value);
        })));
    }
    match(ok, _err) {
        return this._promise.then((res) => res.match(ok, _err));
    }
    unwrapOr(t) {
        return this._promise.then((res) => res.unwrapOr(t));
    }
    /**
     * @deprecated will be removed in 9.0.0.
     *
     * You can use `safeTry` without this method.
     * @example
     * ```typescript
     * safeTry(async function* () {
     *   const okValue = yield* yourResult
     * })
     * ```
     * Emulates Rust's `?` operator in `safeTry`'s body. See also `safeTry`.
     */
    safeUnwrap() {
        return __asyncGenerator(this, arguments, function* safeUnwrap_1() {
            return yield __await(yield __await(yield* __asyncDelegator(__asyncValues(yield __await(this._promise.then((res) => res.safeUnwrap()))))));
        });
    }
    // Makes ResultAsync implement PromiseLike<Result>
    then(successCallback, failureCallback) {
        return this._promise.then(successCallback, failureCallback);
    }
    [Symbol.asyncIterator]() {
        return __asyncGenerator(this, arguments, function* _a() {
            const result = yield __await(this._promise);
            if (result.isErr()) {
                // @ts-expect-error -- This is structurally equivalent and safe
                yield yield __await(errAsync(result.error));
            }
            // @ts-expect-error -- This is structurally equivalent and safe
            return yield __await(result.value);
        });
    }
}
function okAsync(value) {
    return new ResultAsync(Promise.resolve(new Ok(value)));
}
function errAsync(err) {
    return new ResultAsync(Promise.resolve(new Err(err)));
}
const fromPromise = ResultAsync.fromPromise;
const fromSafePromise = ResultAsync.fromSafePromise;
const fromAsyncThrowable = ResultAsync.fromThrowable;

/**
 * Short circuits on the FIRST Err value that we find
 */
const combineResultList = (resultList) => {
    let acc = ok([]);
    for (const result of resultList) {
        if (result.isErr()) {
            acc = err(result.error);
            break;
        }
        else {
            acc.map((list) => list.push(result.value));
        }
    }
    return acc;
};
/* This is the typesafe version of Promise.all
 *
 * Takes a list of ResultAsync<T, E> and success if all inner results are Ok values
 * or fails if one (or more) of the inner results are Err values
 */
const combineResultAsyncList = (asyncResultList) => ResultAsync.fromSafePromise(Promise.all(asyncResultList)).andThen(combineResultList);
/**
 * Give a list of all the errors we find
 */
const combineResultListWithAllErrors = (resultList) => {
    let acc = ok([]);
    for (const result of resultList) {
        if (result.isErr() && acc.isErr()) {
            acc.error.push(result.error);
        }
        else if (result.isErr() && acc.isOk()) {
            acc = err([result.error]);
        }
        else if (result.isOk() && acc.isOk()) {
            acc.value.push(result.value);
        }
        // do nothing when result.isOk() && acc.isErr()
    }
    return acc;
};
const combineResultAsyncListWithAllErrors = (asyncResultList) => ResultAsync.fromSafePromise(Promise.all(asyncResultList)).andThen(combineResultListWithAllErrors);

// eslint-disable-next-line @typescript-eslint/no-namespace
var Result;
(function (Result) {
    /**
     * Wraps a function with a try catch, creating a new function with the same
     * arguments but returning `Ok` if successful, `Err` if the function throws
     *
     * @param fn function to wrap with ok on success or err on failure
     * @param errorFn when an error is thrown, this will wrap the error result if provided
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function fromThrowable(fn, errorFn) {
        return (...args) => {
            try {
                const result = fn(...args);
                return ok(result);
            }
            catch (e) {
                return err(errorFn ? errorFn(e) : e);
            }
        };
    }
    Result.fromThrowable = fromThrowable;
    function combine(resultList) {
        return combineResultList(resultList);
    }
    Result.combine = combine;
    function combineWithAllErrors(resultList) {
        return combineResultListWithAllErrors(resultList);
    }
    Result.combineWithAllErrors = combineWithAllErrors;
})(Result || (Result = {}));
function ok(value) {
    return new Ok(value);
}
function err(err) {
    return new Err(err);
}
function safeTry(body) {
    const n = body().next();
    if (n instanceof Promise) {
        return new ResultAsync(n.then((r) => r.value));
    }
    return n.value;
}
class Ok {
    constructor(value) {
        this.value = value;
    }
    isOk() {
        return true;
    }
    isErr() {
        return !this.isOk();
    }
    map(f) {
        return ok(f(this.value));
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mapErr(_f) {
        return ok(this.value);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    andThen(f) {
        return f(this.value);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    andThrough(f) {
        return f(this.value).map((_value) => this.value);
    }
    andTee(f) {
        try {
            f(this.value);
        }
        catch (e) {
            // Tee doesn't care about the error
        }
        return ok(this.value);
    }
    orTee(_f) {
        return ok(this.value);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    orElse(_f) {
        return ok(this.value);
    }
    asyncAndThen(f) {
        return f(this.value);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    asyncAndThrough(f) {
        return f(this.value).map(() => this.value);
    }
    asyncMap(f) {
        return ResultAsync.fromSafePromise(f(this.value));
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    unwrapOr(_v) {
        return this.value;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    match(ok, _err) {
        return ok(this.value);
    }
    safeUnwrap() {
        const value = this.value;
        /* eslint-disable-next-line require-yield */
        return (function* () {
            return value;
        })();
    }
    _unsafeUnwrap(_) {
        return this.value;
    }
    _unsafeUnwrapErr(config) {
        throw createNeverThrowError('Called `_unsafeUnwrapErr` on an Ok', this, config);
    }
    // eslint-disable-next-line @typescript-eslint/no-this-alias, require-yield
    *[Symbol.iterator]() {
        return this.value;
    }
}
class Err {
    constructor(error) {
        this.error = error;
    }
    isOk() {
        return false;
    }
    isErr() {
        return !this.isOk();
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    map(_f) {
        return err(this.error);
    }
    mapErr(f) {
        return err(f(this.error));
    }
    andThrough(_f) {
        return err(this.error);
    }
    andTee(_f) {
        return err(this.error);
    }
    orTee(f) {
        try {
            f(this.error);
        }
        catch (e) {
            // Tee doesn't care about the error
        }
        return err(this.error);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    andThen(_f) {
        return err(this.error);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    orElse(f) {
        return f(this.error);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    asyncAndThen(_f) {
        return errAsync(this.error);
    }
    asyncAndThrough(_f) {
        return errAsync(this.error);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    asyncMap(_f) {
        return errAsync(this.error);
    }
    unwrapOr(v) {
        return v;
    }
    match(_ok, err) {
        return err(this.error);
    }
    safeUnwrap() {
        const error = this.error;
        return (function* () {
            yield err(error);
            throw new Error('Do not use this generator out of `safeTry`');
        })();
    }
    _unsafeUnwrap(config) {
        throw createNeverThrowError('Called `_unsafeUnwrap` on an Err', this, config);
    }
    _unsafeUnwrapErr(_) {
        return this.error;
    }
    *[Symbol.iterator]() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        // @ts-expect-error -- This is structurally equivalent and safe
        yield self;
        // @ts-expect-error -- This is structurally equivalent and safe
        return self;
    }
}
const fromThrowable = Result.fromThrowable;

var index_es = /*#__PURE__*/Object.freeze({
    __proto__: null,
    Err: Err,
    Ok: Ok,
    get Result () { return Result; },
    ResultAsync: ResultAsync,
    err: err,
    errAsync: errAsync,
    fromAsyncThrowable: fromAsyncThrowable,
    fromPromise: fromPromise,
    fromSafePromise: fromSafePromise,
    fromThrowable: fromThrowable,
    ok: ok,
    okAsync: okAsync,
    safeTry: safeTry
});

var require$$0 = /*@__PURE__*/getAugmentedNamespace(index_es);

var hasRequiredDist;

function requireDist () {
	if (hasRequiredDist) return dist;
	hasRequiredDist = 1;
	Object.defineProperty(dist, "__esModule", { value: true });
	const neverthrow_1 = require$$0;
	neverthrow_1.Ok.prototype.safeRet = function () {
	    return [undefined, this.value];
	};
	neverthrow_1.Err.prototype.safeRet = function () {
	    return [this.error, undefined];
	};
	return dist;
}

requireDist();

/**
 * simple utility function to go from untagged to tagged
 */
const toTagged = (value) => {
    return value;
};
/**
 * converts any value to Dagger<Value>
 */
const toDagger = (value) => {
    return value;
};
/**
 * converts any value to DoubleDagger<Value>
 */
const toDoubleDagger = (value) => {
    return value;
};
/**
 * converts any value to Posterior<Value>
 */
const toPosterior = (value) => {
    return value;
};
/**
 * Creates a new buffer which is a multiple of n in length
 * `P` in the graypaper
 * @param buf - original buffer
 * @param n - the multiple of which the end buffer length should be
 * @see $(0.7.1 - 14.18)
 */
const zeroPad = (n, buf) => {
    const toRet = new Uint8Array(Math.ceil(buf.length / n) * n).fill(0);
    toRet.set(buf);
    return toTagged(toRet);
};
/**
 * Checks if its a plain hash.
 * Can be used to check about the workItem importedDataSegments[0].root
 */
const isHash = (x) => {
    return x instanceof Uint8Array && x.length === 32;
};

/**
 * defined as `E` set in the paper
 * $(0.7.1 - 11.7)
 */
var WorkError;
(function (WorkError) {
    /**
     * the work was not executed because the gas limit was reached
     * @see infinity symbol in the paper
     */
    WorkError[WorkError["OutOfGas"] = 1] = "OutOfGas";
    /**
     * Possibly a program failure
     * @see lightning bolt in the paper
     */
    WorkError[WorkError["Panic"] = 2] = "Panic";
    /**
     * ⊚
     */
    WorkError[WorkError["BadExports"] = 3] = "BadExports";
    /**
     * ⊖
     */
    WorkError[WorkError["Oversize"] = 4] = "Oversize";
    /**
     * Service code was not available for lookup at the lookup anchor block
     * it essentially means that `WorkResult.codeHash` preimage was not found
     */
    WorkError[WorkError["Bad"] = 5] = "Bad";
    /**
     * Code too big (exceeded `S`)
     */
    WorkError[WorkError["Big"] = 6] = "Big";
})(WorkError || (WorkError = {}));

var RegularPVMExitReason;
(function (RegularPVMExitReason) {
    RegularPVMExitReason[RegularPVMExitReason["Halt"] = 0] = "Halt";
    RegularPVMExitReason[RegularPVMExitReason["Panic"] = 1] = "Panic";
    RegularPVMExitReason[RegularPVMExitReason["OutOfGas"] = 2] = "OutOfGas";
})(RegularPVMExitReason || (RegularPVMExitReason = {}));
var IrregularPVMExitReason;
(function (IrregularPVMExitReason) {
    IrregularPVMExitReason[IrregularPVMExitReason["HostCall"] = 3] = "HostCall";
    IrregularPVMExitReason[IrregularPVMExitReason["PageFault"] = 4] = "PageFault";
})(IrregularPVMExitReason || (IrregularPVMExitReason = {}));

var PVMMemoryAccessKind;
(function (PVMMemoryAccessKind) {
    PVMMemoryAccessKind["Read"] = "read";
    PVMMemoryAccessKind["Write"] = "write";
    PVMMemoryAccessKind["Null"] = "null";
})(PVMMemoryAccessKind || (PVMMemoryAccessKind = {}));

var blake2bWasm = {exports: {}};

var nanoassert;
var hasRequiredNanoassert;

function requireNanoassert () {
	if (hasRequiredNanoassert) return nanoassert;
	hasRequiredNanoassert = 1;
	nanoassert = assert;

	class AssertionError extends Error {}
	AssertionError.prototype.name = 'AssertionError';

	/**
	 * Minimal assert function
	 * @param  {any} t Value to check if falsy
	 * @param  {string=} m Optional assertion error message
	 * @throws {AssertionError}
	 */
	function assert (t, m) {
	  if (!t) {
	    var err = new AssertionError(m);
	    if (Error.captureStackTrace) Error.captureStackTrace(err, assert);
	    throw err
	  }
	}
	return nanoassert;
}

var b4a;
var hasRequiredB4a;

function requireB4a () {
	if (hasRequiredB4a) return b4a;
	hasRequiredB4a = 1;
	function isBuffer (value) {
	  return Buffer.isBuffer(value) || value instanceof Uint8Array
	}

	function isEncoding (encoding) {
	  return Buffer.isEncoding(encoding)
	}

	function alloc (size, fill, encoding) {
	  return Buffer.alloc(size, fill, encoding)
	}

	function allocUnsafe (size) {
	  return Buffer.allocUnsafe(size)
	}

	function allocUnsafeSlow (size) {
	  return Buffer.allocUnsafeSlow(size)
	}

	function byteLength (string, encoding) {
	  return Buffer.byteLength(string, encoding)
	}

	function compare (a, b) {
	  return Buffer.compare(a, b)
	}

	function concat (buffers, totalLength) {
	  return Buffer.concat(buffers, totalLength)
	}

	function copy (source, target, targetStart, start, end) {
	  return toBuffer(source).copy(target, targetStart, start, end)
	}

	function equals (a, b) {
	  return toBuffer(a).equals(b)
	}

	function fill (buffer, value, offset, end, encoding) {
	  return toBuffer(buffer).fill(value, offset, end, encoding)
	}

	function from (value, encodingOrOffset, length) {
	  return Buffer.from(value, encodingOrOffset, length)
	}

	function includes (buffer, value, byteOffset, encoding) {
	  return toBuffer(buffer).includes(value, byteOffset, encoding)
	}

	function indexOf (buffer, value, byfeOffset, encoding) {
	  return toBuffer(buffer).indexOf(value, byfeOffset, encoding)
	}

	function lastIndexOf (buffer, value, byteOffset, encoding) {
	  return toBuffer(buffer).lastIndexOf(value, byteOffset, encoding)
	}

	function swap16 (buffer) {
	  return toBuffer(buffer).swap16()
	}

	function swap32 (buffer) {
	  return toBuffer(buffer).swap32()
	}

	function swap64 (buffer) {
	  return toBuffer(buffer).swap64()
	}

	function toBuffer (buffer) {
	  if (Buffer.isBuffer(buffer)) return buffer
	  return Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength)
	}

	function toString (buffer, encoding, start, end) {
	  return toBuffer(buffer).toString(encoding, start, end)
	}

	function write (buffer, string, offset, length, encoding) {
	  return toBuffer(buffer).write(string, offset, length, encoding)
	}

	function writeDoubleLE (buffer, value, offset) {
	  return toBuffer(buffer).writeDoubleLE(value, offset)
	}

	function writeFloatLE (buffer, value, offset) {
	  return toBuffer(buffer).writeFloatLE(value, offset)
	}

	function writeUInt32LE (buffer, value, offset) {
	  return toBuffer(buffer).writeUInt32LE(value, offset)
	}

	function writeInt32LE (buffer, value, offset) {
	  return toBuffer(buffer).writeInt32LE(value, offset)
	}

	function readDoubleLE (buffer, offset) {
	  return toBuffer(buffer).readDoubleLE(offset)
	}

	function readFloatLE (buffer, offset) {
	  return toBuffer(buffer).readFloatLE(offset)
	}

	function readUInt32LE (buffer, offset) {
	  return toBuffer(buffer).readUInt32LE(offset)
	}

	function readInt32LE (buffer, offset) {
	  return toBuffer(buffer).readInt32LE(offset)
	}

	b4a = {
	  isBuffer,
	  isEncoding,
	  alloc,
	  allocUnsafe,
	  allocUnsafeSlow,
	  byteLength,
	  compare,
	  concat,
	  copy,
	  equals,
	  fill,
	  from,
	  includes,
	  indexOf,
	  lastIndexOf,
	  swap16,
	  swap32,
	  swap64,
	  toBuffer,
	  toString,
	  write,
	  writeDoubleLE,
	  writeFloatLE,
	  writeUInt32LE,
	  writeInt32LE,
	  readDoubleLE,
	  readFloatLE,
	  readUInt32LE,
	  readInt32LE
	};
	return b4a;
}

var blake2b$1;
var hasRequiredBlake2b;

function requireBlake2b () {
	if (hasRequiredBlake2b) return blake2b$1;
	hasRequiredBlake2b = 1;
	var __commonJS = (cb, mod) => function __require() {
	  return mod || (0, cb[Object.keys(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
	};
	var __toBinary = /* @__PURE__ */ (() => {
	  var table = new Uint8Array(128);
	  for (var i = 0; i < 64; i++)
	    table[i < 26 ? i + 65 : i < 52 ? i + 71 : i < 62 ? i - 4 : i * 4 - 205] = i;
	  return (base64) => {
	    var n = base64.length, bytes2 = new Uint8Array((n - (base64[n - 1] == "=") - (base64[n - 2] == "=")) * 3 / 4 | 0);
	    for (var i2 = 0, j = 0; i2 < n; ) {
	      var c0 = table[base64.charCodeAt(i2++)], c1 = table[base64.charCodeAt(i2++)];
	      var c2 = table[base64.charCodeAt(i2++)], c3 = table[base64.charCodeAt(i2++)];
	      bytes2[j++] = c0 << 2 | c1 >> 4;
	      bytes2[j++] = c1 << 4 | c2 >> 2;
	      bytes2[j++] = c2 << 6 | c3;
	    }
	    return bytes2;
	  };
	})();

	// wasm-binary:./blake2b.wat
	var require_blake2b = __commonJS({
	  "wasm-binary:./blake2b.wat"(exports2, module2) {
	    module2.exports = __toBinary("AGFzbQEAAAABEANgAn9/AGADf39/AGABfwADBQQAAQICBQUBAQroBwdNBQZtZW1vcnkCAAxibGFrZTJiX2luaXQAAA5ibGFrZTJiX3VwZGF0ZQABDWJsYWtlMmJfZmluYWwAAhBibGFrZTJiX2NvbXByZXNzAAMKvz8EwAIAIABCADcDACAAQgA3AwggAEIANwMQIABCADcDGCAAQgA3AyAgAEIANwMoIABCADcDMCAAQgA3AzggAEIANwNAIABCADcDSCAAQgA3A1AgAEIANwNYIABCADcDYCAAQgA3A2ggAEIANwNwIABCADcDeCAAQoiS853/zPmE6gBBACkDAIU3A4ABIABCu86qptjQ67O7f0EIKQMAhTcDiAEgAEKr8NP0r+68tzxBECkDAIU3A5ABIABC8e30+KWn/aelf0EYKQMAhTcDmAEgAELRhZrv+s+Uh9EAQSApAwCFNwOgASAAQp/Y+dnCkdqCm39BKCkDAIU3A6gBIABC6/qG2r+19sEfQTApAwCFNwOwASAAQvnC+JuRo7Pw2wBBOCkDAIU3A7gBIABCADcDwAEgAEIANwPIASAAQgA3A9ABC20BA38gAEHAAWohAyAAQcgBaiEEIAQpAwCnIQUCQANAIAEgAkYNASAFQYABRgRAIAMgAykDACAFrXw3AwBBACEFIAAQAwsgACAFaiABLQAAOgAAIAVBAWohBSABQQFqIQEMAAsLIAQgBa03AwALYQEDfyAAQcABaiEBIABByAFqIQIgASABKQMAIAIpAwB8NwMAIABCfzcD0AEgAikDAKchAwJAA0AgA0GAAUYNASAAIANqQQA6AAAgA0EBaiEDDAALCyACIAOtNwMAIAAQAwuqOwIgfgl/IABBgAFqISEgAEGIAWohIiAAQZABaiEjIABBmAFqISQgAEGgAWohJSAAQagBaiEmIABBsAFqIScgAEG4AWohKCAhKQMAIQEgIikDACECICMpAwAhAyAkKQMAIQQgJSkDACEFICYpAwAhBiAnKQMAIQcgKCkDACEIQoiS853/zPmE6gAhCUK7zqqm2NDrs7t/IQpCq/DT9K/uvLc8IQtC8e30+KWn/aelfyEMQtGFmu/6z5SH0QAhDUKf2PnZwpHagpt/IQ5C6/qG2r+19sEfIQ9C+cL4m5Gjs/DbACEQIAApAwAhESAAKQMIIRIgACkDECETIAApAxghFCAAKQMgIRUgACkDKCEWIAApAzAhFyAAKQM4IRggACkDQCEZIAApA0ghGiAAKQNQIRsgACkDWCEcIAApA2AhHSAAKQNoIR4gACkDcCEfIAApA3ghICANIAApA8ABhSENIA8gACkD0AGFIQ8gASAFIBF8fCEBIA0gAYVCIIohDSAJIA18IQkgBSAJhUIYiiEFIAEgBSASfHwhASANIAGFQhCKIQ0gCSANfCEJIAUgCYVCP4ohBSACIAYgE3x8IQIgDiAChUIgiiEOIAogDnwhCiAGIAqFQhiKIQYgAiAGIBR8fCECIA4gAoVCEIohDiAKIA58IQogBiAKhUI/iiEGIAMgByAVfHwhAyAPIAOFQiCKIQ8gCyAPfCELIAcgC4VCGIohByADIAcgFnx8IQMgDyADhUIQiiEPIAsgD3whCyAHIAuFQj+KIQcgBCAIIBd8fCEEIBAgBIVCIIohECAMIBB8IQwgCCAMhUIYiiEIIAQgCCAYfHwhBCAQIASFQhCKIRAgDCAQfCEMIAggDIVCP4ohCCABIAYgGXx8IQEgECABhUIgiiEQIAsgEHwhCyAGIAuFQhiKIQYgASAGIBp8fCEBIBAgAYVCEIohECALIBB8IQsgBiALhUI/iiEGIAIgByAbfHwhAiANIAKFQiCKIQ0gDCANfCEMIAcgDIVCGIohByACIAcgHHx8IQIgDSAChUIQiiENIAwgDXwhDCAHIAyFQj+KIQcgAyAIIB18fCEDIA4gA4VCIIohDiAJIA58IQkgCCAJhUIYiiEIIAMgCCAefHwhAyAOIAOFQhCKIQ4gCSAOfCEJIAggCYVCP4ohCCAEIAUgH3x8IQQgDyAEhUIgiiEPIAogD3whCiAFIAqFQhiKIQUgBCAFICB8fCEEIA8gBIVCEIohDyAKIA98IQogBSAKhUI/iiEFIAEgBSAffHwhASANIAGFQiCKIQ0gCSANfCEJIAUgCYVCGIohBSABIAUgG3x8IQEgDSABhUIQiiENIAkgDXwhCSAFIAmFQj+KIQUgAiAGIBV8fCECIA4gAoVCIIohDiAKIA58IQogBiAKhUIYiiEGIAIgBiAZfHwhAiAOIAKFQhCKIQ4gCiAOfCEKIAYgCoVCP4ohBiADIAcgGnx8IQMgDyADhUIgiiEPIAsgD3whCyAHIAuFQhiKIQcgAyAHICB8fCEDIA8gA4VCEIohDyALIA98IQsgByALhUI/iiEHIAQgCCAefHwhBCAQIASFQiCKIRAgDCAQfCEMIAggDIVCGIohCCAEIAggF3x8IQQgECAEhUIQiiEQIAwgEHwhDCAIIAyFQj+KIQggASAGIBJ8fCEBIBAgAYVCIIohECALIBB8IQsgBiALhUIYiiEGIAEgBiAdfHwhASAQIAGFQhCKIRAgCyAQfCELIAYgC4VCP4ohBiACIAcgEXx8IQIgDSAChUIgiiENIAwgDXwhDCAHIAyFQhiKIQcgAiAHIBN8fCECIA0gAoVCEIohDSAMIA18IQwgByAMhUI/iiEHIAMgCCAcfHwhAyAOIAOFQiCKIQ4gCSAOfCEJIAggCYVCGIohCCADIAggGHx8IQMgDiADhUIQiiEOIAkgDnwhCSAIIAmFQj+KIQggBCAFIBZ8fCEEIA8gBIVCIIohDyAKIA98IQogBSAKhUIYiiEFIAQgBSAUfHwhBCAPIASFQhCKIQ8gCiAPfCEKIAUgCoVCP4ohBSABIAUgHHx8IQEgDSABhUIgiiENIAkgDXwhCSAFIAmFQhiKIQUgASAFIBl8fCEBIA0gAYVCEIohDSAJIA18IQkgBSAJhUI/iiEFIAIgBiAdfHwhAiAOIAKFQiCKIQ4gCiAOfCEKIAYgCoVCGIohBiACIAYgEXx8IQIgDiAChUIQiiEOIAogDnwhCiAGIAqFQj+KIQYgAyAHIBZ8fCEDIA8gA4VCIIohDyALIA98IQsgByALhUIYiiEHIAMgByATfHwhAyAPIAOFQhCKIQ8gCyAPfCELIAcgC4VCP4ohByAEIAggIHx8IQQgECAEhUIgiiEQIAwgEHwhDCAIIAyFQhiKIQggBCAIIB58fCEEIBAgBIVCEIohECAMIBB8IQwgCCAMhUI/iiEIIAEgBiAbfHwhASAQIAGFQiCKIRAgCyAQfCELIAYgC4VCGIohBiABIAYgH3x8IQEgECABhUIQiiEQIAsgEHwhCyAGIAuFQj+KIQYgAiAHIBR8fCECIA0gAoVCIIohDSAMIA18IQwgByAMhUIYiiEHIAIgByAXfHwhAiANIAKFQhCKIQ0gDCANfCEMIAcgDIVCP4ohByADIAggGHx8IQMgDiADhUIgiiEOIAkgDnwhCSAIIAmFQhiKIQggAyAIIBJ8fCEDIA4gA4VCEIohDiAJIA58IQkgCCAJhUI/iiEIIAQgBSAafHwhBCAPIASFQiCKIQ8gCiAPfCEKIAUgCoVCGIohBSAEIAUgFXx8IQQgDyAEhUIQiiEPIAogD3whCiAFIAqFQj+KIQUgASAFIBh8fCEBIA0gAYVCIIohDSAJIA18IQkgBSAJhUIYiiEFIAEgBSAafHwhASANIAGFQhCKIQ0gCSANfCEJIAUgCYVCP4ohBSACIAYgFHx8IQIgDiAChUIgiiEOIAogDnwhCiAGIAqFQhiKIQYgAiAGIBJ8fCECIA4gAoVCEIohDiAKIA58IQogBiAKhUI/iiEGIAMgByAefHwhAyAPIAOFQiCKIQ8gCyAPfCELIAcgC4VCGIohByADIAcgHXx8IQMgDyADhUIQiiEPIAsgD3whCyAHIAuFQj+KIQcgBCAIIBx8fCEEIBAgBIVCIIohECAMIBB8IQwgCCAMhUIYiiEIIAQgCCAffHwhBCAQIASFQhCKIRAgDCAQfCEMIAggDIVCP4ohCCABIAYgE3x8IQEgECABhUIgiiEQIAsgEHwhCyAGIAuFQhiKIQYgASAGIBd8fCEBIBAgAYVCEIohECALIBB8IQsgBiALhUI/iiEGIAIgByAWfHwhAiANIAKFQiCKIQ0gDCANfCEMIAcgDIVCGIohByACIAcgG3x8IQIgDSAChUIQiiENIAwgDXwhDCAHIAyFQj+KIQcgAyAIIBV8fCEDIA4gA4VCIIohDiAJIA58IQkgCCAJhUIYiiEIIAMgCCARfHwhAyAOIAOFQhCKIQ4gCSAOfCEJIAggCYVCP4ohCCAEIAUgIHx8IQQgDyAEhUIgiiEPIAogD3whCiAFIAqFQhiKIQUgBCAFIBl8fCEEIA8gBIVCEIohDyAKIA98IQogBSAKhUI/iiEFIAEgBSAafHwhASANIAGFQiCKIQ0gCSANfCEJIAUgCYVCGIohBSABIAUgEXx8IQEgDSABhUIQiiENIAkgDXwhCSAFIAmFQj+KIQUgAiAGIBZ8fCECIA4gAoVCIIohDiAKIA58IQogBiAKhUIYiiEGIAIgBiAYfHwhAiAOIAKFQhCKIQ4gCiAOfCEKIAYgCoVCP4ohBiADIAcgE3x8IQMgDyADhUIgiiEPIAsgD3whCyAHIAuFQhiKIQcgAyAHIBV8fCEDIA8gA4VCEIohDyALIA98IQsgByALhUI/iiEHIAQgCCAbfHwhBCAQIASFQiCKIRAgDCAQfCEMIAggDIVCGIohCCAEIAggIHx8IQQgECAEhUIQiiEQIAwgEHwhDCAIIAyFQj+KIQggASAGIB98fCEBIBAgAYVCIIohECALIBB8IQsgBiALhUIYiiEGIAEgBiASfHwhASAQIAGFQhCKIRAgCyAQfCELIAYgC4VCP4ohBiACIAcgHHx8IQIgDSAChUIgiiENIAwgDXwhDCAHIAyFQhiKIQcgAiAHIB18fCECIA0gAoVCEIohDSAMIA18IQwgByAMhUI/iiEHIAMgCCAXfHwhAyAOIAOFQiCKIQ4gCSAOfCEJIAggCYVCGIohCCADIAggGXx8IQMgDiADhUIQiiEOIAkgDnwhCSAIIAmFQj+KIQggBCAFIBR8fCEEIA8gBIVCIIohDyAKIA98IQogBSAKhUIYiiEFIAQgBSAefHwhBCAPIASFQhCKIQ8gCiAPfCEKIAUgCoVCP4ohBSABIAUgE3x8IQEgDSABhUIgiiENIAkgDXwhCSAFIAmFQhiKIQUgASAFIB18fCEBIA0gAYVCEIohDSAJIA18IQkgBSAJhUI/iiEFIAIgBiAXfHwhAiAOIAKFQiCKIQ4gCiAOfCEKIAYgCoVCGIohBiACIAYgG3x8IQIgDiAChUIQiiEOIAogDnwhCiAGIAqFQj+KIQYgAyAHIBF8fCEDIA8gA4VCIIohDyALIA98IQsgByALhUIYiiEHIAMgByAcfHwhAyAPIAOFQhCKIQ8gCyAPfCELIAcgC4VCP4ohByAEIAggGXx8IQQgECAEhUIgiiEQIAwgEHwhDCAIIAyFQhiKIQggBCAIIBR8fCEEIBAgBIVCEIohECAMIBB8IQwgCCAMhUI/iiEIIAEgBiAVfHwhASAQIAGFQiCKIRAgCyAQfCELIAYgC4VCGIohBiABIAYgHnx8IQEgECABhUIQiiEQIAsgEHwhCyAGIAuFQj+KIQYgAiAHIBh8fCECIA0gAoVCIIohDSAMIA18IQwgByAMhUIYiiEHIAIgByAWfHwhAiANIAKFQhCKIQ0gDCANfCEMIAcgDIVCP4ohByADIAggIHx8IQMgDiADhUIgiiEOIAkgDnwhCSAIIAmFQhiKIQggAyAIIB98fCEDIA4gA4VCEIohDiAJIA58IQkgCCAJhUI/iiEIIAQgBSASfHwhBCAPIASFQiCKIQ8gCiAPfCEKIAUgCoVCGIohBSAEIAUgGnx8IQQgDyAEhUIQiiEPIAogD3whCiAFIAqFQj+KIQUgASAFIB18fCEBIA0gAYVCIIohDSAJIA18IQkgBSAJhUIYiiEFIAEgBSAWfHwhASANIAGFQhCKIQ0gCSANfCEJIAUgCYVCP4ohBSACIAYgEnx8IQIgDiAChUIgiiEOIAogDnwhCiAGIAqFQhiKIQYgAiAGICB8fCECIA4gAoVCEIohDiAKIA58IQogBiAKhUI/iiEGIAMgByAffHwhAyAPIAOFQiCKIQ8gCyAPfCELIAcgC4VCGIohByADIAcgHnx8IQMgDyADhUIQiiEPIAsgD3whCyAHIAuFQj+KIQcgBCAIIBV8fCEEIBAgBIVCIIohECAMIBB8IQwgCCAMhUIYiiEIIAQgCCAbfHwhBCAQIASFQhCKIRAgDCAQfCEMIAggDIVCP4ohCCABIAYgEXx8IQEgECABhUIgiiEQIAsgEHwhCyAGIAuFQhiKIQYgASAGIBh8fCEBIBAgAYVCEIohECALIBB8IQsgBiALhUI/iiEGIAIgByAXfHwhAiANIAKFQiCKIQ0gDCANfCEMIAcgDIVCGIohByACIAcgFHx8IQIgDSAChUIQiiENIAwgDXwhDCAHIAyFQj+KIQcgAyAIIBp8fCEDIA4gA4VCIIohDiAJIA58IQkgCCAJhUIYiiEIIAMgCCATfHwhAyAOIAOFQhCKIQ4gCSAOfCEJIAggCYVCP4ohCCAEIAUgGXx8IQQgDyAEhUIgiiEPIAogD3whCiAFIAqFQhiKIQUgBCAFIBx8fCEEIA8gBIVCEIohDyAKIA98IQogBSAKhUI/iiEFIAEgBSAefHwhASANIAGFQiCKIQ0gCSANfCEJIAUgCYVCGIohBSABIAUgHHx8IQEgDSABhUIQiiENIAkgDXwhCSAFIAmFQj+KIQUgAiAGIBh8fCECIA4gAoVCIIohDiAKIA58IQogBiAKhUIYiiEGIAIgBiAffHwhAiAOIAKFQhCKIQ4gCiAOfCEKIAYgCoVCP4ohBiADIAcgHXx8IQMgDyADhUIgiiEPIAsgD3whCyAHIAuFQhiKIQcgAyAHIBJ8fCEDIA8gA4VCEIohDyALIA98IQsgByALhUI/iiEHIAQgCCAUfHwhBCAQIASFQiCKIRAgDCAQfCEMIAggDIVCGIohCCAEIAggGnx8IQQgECAEhUIQiiEQIAwgEHwhDCAIIAyFQj+KIQggASAGIBZ8fCEBIBAgAYVCIIohECALIBB8IQsgBiALhUIYiiEGIAEgBiARfHwhASAQIAGFQhCKIRAgCyAQfCELIAYgC4VCP4ohBiACIAcgIHx8IQIgDSAChUIgiiENIAwgDXwhDCAHIAyFQhiKIQcgAiAHIBV8fCECIA0gAoVCEIohDSAMIA18IQwgByAMhUI/iiEHIAMgCCAZfHwhAyAOIAOFQiCKIQ4gCSAOfCEJIAggCYVCGIohCCADIAggF3x8IQMgDiADhUIQiiEOIAkgDnwhCSAIIAmFQj+KIQggBCAFIBN8fCEEIA8gBIVCIIohDyAKIA98IQogBSAKhUIYiiEFIAQgBSAbfHwhBCAPIASFQhCKIQ8gCiAPfCEKIAUgCoVCP4ohBSABIAUgF3x8IQEgDSABhUIgiiENIAkgDXwhCSAFIAmFQhiKIQUgASAFICB8fCEBIA0gAYVCEIohDSAJIA18IQkgBSAJhUI/iiEFIAIgBiAffHwhAiAOIAKFQiCKIQ4gCiAOfCEKIAYgCoVCGIohBiACIAYgGnx8IQIgDiAChUIQiiEOIAogDnwhCiAGIAqFQj+KIQYgAyAHIBx8fCEDIA8gA4VCIIohDyALIA98IQsgByALhUIYiiEHIAMgByAUfHwhAyAPIAOFQhCKIQ8gCyAPfCELIAcgC4VCP4ohByAEIAggEXx8IQQgECAEhUIgiiEQIAwgEHwhDCAIIAyFQhiKIQggBCAIIBl8fCEEIBAgBIVCEIohECAMIBB8IQwgCCAMhUI/iiEIIAEgBiAdfHwhASAQIAGFQiCKIRAgCyAQfCELIAYgC4VCGIohBiABIAYgE3x8IQEgECABhUIQiiEQIAsgEHwhCyAGIAuFQj+KIQYgAiAHIB58fCECIA0gAoVCIIohDSAMIA18IQwgByAMhUIYiiEHIAIgByAYfHwhAiANIAKFQhCKIQ0gDCANfCEMIAcgDIVCP4ohByADIAggEnx8IQMgDiADhUIgiiEOIAkgDnwhCSAIIAmFQhiKIQggAyAIIBV8fCEDIA4gA4VCEIohDiAJIA58IQkgCCAJhUI/iiEIIAQgBSAbfHwhBCAPIASFQiCKIQ8gCiAPfCEKIAUgCoVCGIohBSAEIAUgFnx8IQQgDyAEhUIQiiEPIAogD3whCiAFIAqFQj+KIQUgASAFIBt8fCEBIA0gAYVCIIohDSAJIA18IQkgBSAJhUIYiiEFIAEgBSATfHwhASANIAGFQhCKIQ0gCSANfCEJIAUgCYVCP4ohBSACIAYgGXx8IQIgDiAChUIgiiEOIAogDnwhCiAGIAqFQhiKIQYgAiAGIBV8fCECIA4gAoVCEIohDiAKIA58IQogBiAKhUI/iiEGIAMgByAYfHwhAyAPIAOFQiCKIQ8gCyAPfCELIAcgC4VCGIohByADIAcgF3x8IQMgDyADhUIQiiEPIAsgD3whCyAHIAuFQj+KIQcgBCAIIBJ8fCEEIBAgBIVCIIohECAMIBB8IQwgCCAMhUIYiiEIIAQgCCAWfHwhBCAQIASFQhCKIRAgDCAQfCEMIAggDIVCP4ohCCABIAYgIHx8IQEgECABhUIgiiEQIAsgEHwhCyAGIAuFQhiKIQYgASAGIBx8fCEBIBAgAYVCEIohECALIBB8IQsgBiALhUI/iiEGIAIgByAafHwhAiANIAKFQiCKIQ0gDCANfCEMIAcgDIVCGIohByACIAcgH3x8IQIgDSAChUIQiiENIAwgDXwhDCAHIAyFQj+KIQcgAyAIIBR8fCEDIA4gA4VCIIohDiAJIA58IQkgCCAJhUIYiiEIIAMgCCAdfHwhAyAOIAOFQhCKIQ4gCSAOfCEJIAggCYVCP4ohCCAEIAUgHnx8IQQgDyAEhUIgiiEPIAogD3whCiAFIAqFQhiKIQUgBCAFIBF8fCEEIA8gBIVCEIohDyAKIA98IQogBSAKhUI/iiEFIAEgBSARfHwhASANIAGFQiCKIQ0gCSANfCEJIAUgCYVCGIohBSABIAUgEnx8IQEgDSABhUIQiiENIAkgDXwhCSAFIAmFQj+KIQUgAiAGIBN8fCECIA4gAoVCIIohDiAKIA58IQogBiAKhUIYiiEGIAIgBiAUfHwhAiAOIAKFQhCKIQ4gCiAOfCEKIAYgCoVCP4ohBiADIAcgFXx8IQMgDyADhUIgiiEPIAsgD3whCyAHIAuFQhiKIQcgAyAHIBZ8fCEDIA8gA4VCEIohDyALIA98IQsgByALhUI/iiEHIAQgCCAXfHwhBCAQIASFQiCKIRAgDCAQfCEMIAggDIVCGIohCCAEIAggGHx8IQQgECAEhUIQiiEQIAwgEHwhDCAIIAyFQj+KIQggASAGIBl8fCEBIBAgAYVCIIohECALIBB8IQsgBiALhUIYiiEGIAEgBiAafHwhASAQIAGFQhCKIRAgCyAQfCELIAYgC4VCP4ohBiACIAcgG3x8IQIgDSAChUIgiiENIAwgDXwhDCAHIAyFQhiKIQcgAiAHIBx8fCECIA0gAoVCEIohDSAMIA18IQwgByAMhUI/iiEHIAMgCCAdfHwhAyAOIAOFQiCKIQ4gCSAOfCEJIAggCYVCGIohCCADIAggHnx8IQMgDiADhUIQiiEOIAkgDnwhCSAIIAmFQj+KIQggBCAFIB98fCEEIA8gBIVCIIohDyAKIA98IQogBSAKhUIYiiEFIAQgBSAgfHwhBCAPIASFQhCKIQ8gCiAPfCEKIAUgCoVCP4ohBSABIAUgH3x8IQEgDSABhUIgiiENIAkgDXwhCSAFIAmFQhiKIQUgASAFIBt8fCEBIA0gAYVCEIohDSAJIA18IQkgBSAJhUI/iiEFIAIgBiAVfHwhAiAOIAKFQiCKIQ4gCiAOfCEKIAYgCoVCGIohBiACIAYgGXx8IQIgDiAChUIQiiEOIAogDnwhCiAGIAqFQj+KIQYgAyAHIBp8fCEDIA8gA4VCIIohDyALIA98IQsgByALhUIYiiEHIAMgByAgfHwhAyAPIAOFQhCKIQ8gCyAPfCELIAcgC4VCP4ohByAEIAggHnx8IQQgECAEhUIgiiEQIAwgEHwhDCAIIAyFQhiKIQggBCAIIBd8fCEEIBAgBIVCEIohECAMIBB8IQwgCCAMhUI/iiEIIAEgBiASfHwhASAQIAGFQiCKIRAgCyAQfCELIAYgC4VCGIohBiABIAYgHXx8IQEgECABhUIQiiEQIAsgEHwhCyAGIAuFQj+KIQYgAiAHIBF8fCECIA0gAoVCIIohDSAMIA18IQwgByAMhUIYiiEHIAIgByATfHwhAiANIAKFQhCKIQ0gDCANfCEMIAcgDIVCP4ohByADIAggHHx8IQMgDiADhUIgiiEOIAkgDnwhCSAIIAmFQhiKIQggAyAIIBh8fCEDIA4gA4VCEIohDiAJIA58IQkgCCAJhUI/iiEIIAQgBSAWfHwhBCAPIASFQiCKIQ8gCiAPfCEKIAUgCoVCGIohBSAEIAUgFHx8IQQgDyAEhUIQiiEPIAogD3whCiAFIAqFQj+KIQUgISAhKQMAIAEgCYWFNwMAICIgIikDACACIAqFhTcDACAjICMpAwAgAyALhYU3AwAgJCAkKQMAIAQgDIWFNwMAICUgJSkDACAFIA2FhTcDACAmICYpAwAgBiAOhYU3AwAgJyAnKQMAIAcgD4WFNwMAICggKCkDACAIIBCFhTcDAAs=");
	  }
	});

	// wasm-module:./blake2b.wat
	var bytes = require_blake2b();
	var compiled = WebAssembly.compile(bytes);
	blake2b$1 = async (imports) => {
	  const instance = await WebAssembly.instantiate(await compiled, imports);
	  return instance.exports;
	};
	return blake2b$1;
}

var hasRequiredBlake2bWasm;

function requireBlake2bWasm () {
	if (hasRequiredBlake2bWasm) return blake2bWasm.exports;
	hasRequiredBlake2bWasm = 1;
	var assert = requireNanoassert();
	var b4a = requireB4a();

	var wasm = null;
	var wasmPromise = typeof WebAssembly !== "undefined" && requireBlake2b()().then(mod => {
	  wasm = mod;
	});

	var head = 64;
	var freeList = [];

	blake2bWasm.exports = Blake2b;
	var BYTES_MIN = blake2bWasm.exports.BYTES_MIN = 16;
	var BYTES_MAX = blake2bWasm.exports.BYTES_MAX = 64;
	blake2bWasm.exports.BYTES = 32;
	var KEYBYTES_MIN = blake2bWasm.exports.KEYBYTES_MIN = 16;
	var KEYBYTES_MAX = blake2bWasm.exports.KEYBYTES_MAX = 64;
	blake2bWasm.exports.KEYBYTES = 32;
	var SALTBYTES = blake2bWasm.exports.SALTBYTES = 16;
	var PERSONALBYTES = blake2bWasm.exports.PERSONALBYTES = 16;

	function Blake2b (digestLength, key, salt, personal, noAssert) {
	  if (!(this instanceof Blake2b)) return new Blake2b(digestLength, key, salt, personal, noAssert)
	  if (!wasm) throw new Error('WASM not loaded. Wait for Blake2b.ready(cb)')
	  if (!digestLength) digestLength = 32;

	  if (noAssert !== true) {
	    assert(digestLength >= BYTES_MIN, 'digestLength must be at least ' + BYTES_MIN + ', was given ' + digestLength);
	    assert(digestLength <= BYTES_MAX, 'digestLength must be at most ' + BYTES_MAX + ', was given ' + digestLength);
	    if (key != null) {
	      assert(key instanceof Uint8Array, 'key must be Uint8Array or Buffer');
	      assert(key.length >= KEYBYTES_MIN, 'key must be at least ' + KEYBYTES_MIN + ', was given ' + key.length);
	      assert(key.length <= KEYBYTES_MAX, 'key must be at least ' + KEYBYTES_MAX + ', was given ' + key.length);
	    }
	    if (salt != null) {
	      assert(salt instanceof Uint8Array, 'salt must be Uint8Array or Buffer');
	      assert(salt.length === SALTBYTES, 'salt must be exactly ' + SALTBYTES + ', was given ' + salt.length);
	    }
	    if (personal != null) {
	      assert(personal instanceof Uint8Array, 'personal must be Uint8Array or Buffer');
	      assert(personal.length === PERSONALBYTES, 'personal must be exactly ' + PERSONALBYTES + ', was given ' + personal.length);
	    }
	  }

	  if (!freeList.length) {
	    freeList.push(head);
	    head += 216;
	  }

	  this.digestLength = digestLength;
	  this.finalized = false;
	  this.pointer = freeList.pop();
	  this._memory = new Uint8Array(wasm.memory.buffer);

	  this._memory.fill(0, 0, 64);
	  this._memory[0] = this.digestLength;
	  this._memory[1] = key ? key.length : 0;
	  this._memory[2] = 1; // fanout
	  this._memory[3] = 1; // depth

	  if (salt) this._memory.set(salt, 32);
	  if (personal) this._memory.set(personal, 48);

	  if (this.pointer + 216 > this._memory.length) this._realloc(this.pointer + 216); // we need 216 bytes for the state
	  wasm.blake2b_init(this.pointer, this.digestLength);

	  if (key) {
	    this.update(key);
	    this._memory.fill(0, head, head + key.length); // whiteout key
	    this._memory[this.pointer + 200] = 128;
	  }
	}

	Blake2b.prototype._realloc = function (size) {
	  wasm.memory.grow(Math.max(0, Math.ceil(Math.abs(size - this._memory.length) / 65536)));
	  this._memory = new Uint8Array(wasm.memory.buffer);
	};

	Blake2b.prototype.update = function (input) {
	  assert(this.finalized === false, 'Hash instance finalized');
	  assert(input instanceof Uint8Array, 'input must be Uint8Array or Buffer');

	  if (head + input.length > this._memory.length) this._realloc(head + input.length);
	  this._memory.set(input, head);
	  wasm.blake2b_update(this.pointer, head, head + input.length);
	  return this
	};

	Blake2b.prototype.digest = function (enc) {
	  assert(this.finalized === false, 'Hash instance finalized');
	  this.finalized = true;

	  freeList.push(this.pointer);
	  wasm.blake2b_final(this.pointer);

	  if (!enc || enc === 'binary') {
	    return this._memory.slice(this.pointer + 128, this.pointer + 128 + this.digestLength)
	  }

	  if (typeof enc === 'string') {
	    return b4a.toString(this._memory, enc, this.pointer + 128, this.pointer + 128 + this.digestLength)
	  }

	  assert(enc instanceof Uint8Array && enc.length >= this.digestLength, 'input must be Uint8Array or Buffer');
	  for (var i = 0; i < this.digestLength; i++) {
	    enc[i] = this._memory[this.pointer + 128 + i];
	  }

	  return enc
	};

	// libsodium compat
	Blake2b.prototype.final = Blake2b.prototype.digest;

	Blake2b.WASM = wasm;
	Blake2b.SUPPORTED = typeof WebAssembly !== 'undefined';

	Blake2b.ready = function (cb) {
	  if (!cb) cb = noop;
	  if (!wasmPromise) return cb(new Error('WebAssembly not supported'))
	  return wasmPromise.then(() => cb(), cb)
	};

	Blake2b.prototype.ready = Blake2b.ready;

	Blake2b.prototype.getPartialHash = function () {
	  return this._memory.slice(this.pointer, this.pointer + 216);
	};

	Blake2b.prototype.setPartialHash = function (ph) {
	  this._memory.set(ph, this.pointer);
	};

	function noop () {}
	return blake2bWasm.exports;
}

var blake2bWasmExports = requireBlake2bWasm();
var blake2b = /*@__PURE__*/getDefaultExportFromCjs(blake2bWasmExports);

// I'm sorry for inflating the size of the binary by 33%, but this is the only way I could quickly get this working with Webpack and NodeJS at the same time. Please forgive me.
const WASM_BASE64 = "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IAAgATYCACAAIAI2AgQgA0EgaiQADwsQMwALmQEBAX8CQAJAIAEEQCACQQBIDQECfyADKAIEBEACQCADKAIIIgRFBEAMAQsgAygCACAEIAEgAhA3DAILCyABIAJFDQAaQe2MwAAtAAAaIAIgARA5CyIDBEAgACACNgIIIAAgAzYCBCAAQQA2AgAPCyAAIAI2AgggACABNgIEDAILIABBADYCBAwBCyAAQQA2AgQLIABBATYCAAuSAQEDfyMAQeAFayIDJAAgA0EIaiABIAIQMCADKAIMIQEgAygCCCECIANBIGoiBEHcAhBJGiADQeABOwH8AiAEIAIgARAGIANBgANqIgUgBEHgAhBKGiADQRRqIAUQKCABBEAgAiABED8LIAMgA0EUahA6IAMoAgQhASAAIAMoAgA2AgAgACABNgIEIANB4AVqJAALkgEBA38jAEHgBWsiAyQAIANBCGogASACEDAgAygCDCEBIAMoAgghAiADQSBqIgRB3AIQSRogA0HgATsB/AIgBCACIAEQBiADQYADaiIFIARB4AIQShogA0EQaiAFEB4gAQRAIAIgARA/CyADIANBEGoQOiADKAIEIQEgACADKAIANgIAIAAgATYCBCADQeAFaiQAC5IBAQN/IwBB4AVrIgMkACADQQhqIAEgAhAwIAMoAgwhASADKAIIIQIgA0EgaiIEQdwCEEkaIANBgAI7AfwCIAQgAiABEAYgA0GAA2oiBSAEQeACEEoaIANBFGogBRAoIAEEQCACIAEQPwsgAyADQRRqEDogAygCBCEBIAAgAygCADYCACAAIAE2AgQgA0HgBWokAAuSAQEDfyMAQeAFayIDJAAgA0EIaiABIAIQMCADKAIMIQEgAygCCCECIANBIGoiBEHcAhBJGiADQYACOwH8AiAEIAIgARAGIANBgANqIgUgBEHgAhBKGiADQRBqIAUQHiABBEAgAiABED8LIAMgA0EQahA6IAMoAgQhASAAIAMoAgA2AgAgACABNgIEIANB4AVqJAALkgEBA38jAEHgBWsiAyQAIANBCGogASACEDAgAygCDCEBIAMoAgghAiADQSBqIgRB3AIQSRogA0GAAzsB/AIgBCACIAEQBiADQYADaiIFIARB4AIQShogA0EUaiAFECggAQRAIAIgARA/CyADIANBFGoQOiADKAIEIQEgACADKAIANgIAIAAgATYCBCADQeAFaiQAC5IBAQN/IwBB4AVrIgMkACADQQhqIAEgAhAwIAMoAgwhASADKAIIIQIgA0EgaiIEQdwCEEkaIANBgAM7AfwCIAQgAiABEAYgA0GAA2oiBSAEQeACEEoaIANBEGogBRAeIAEEQCACIAEQPwsgAyADQRBqEDogAygCBCEBIAAgAygCADYCACAAIAE2AgQgA0HgBWokAAuSAQEDfyMAQeAFayIDJAAgA0EIaiABIAIQMCADKAIMIQEgAygCCCECIANBIGoiBEHcAhBJGiADQYAEOwH8AiAEIAIgARAGIANBgANqIgUgBEHgAhBKGiADQRRqIAUQKCABBEAgAiABED8LIAMgA0EUahA6IAMoAgQhASAAIAMoAgA2AgAgACABNgIEIANB4AVqJAALkgEBA38jAEHgBWsiAyQAIANBCGogASACEDAgAygCDCEBIAMoAgghAiADQSBqIgRB3AIQSRogA0GABDsB/AIgBCACIAEQBiADQYADaiIFIARB4AIQShogA0EQaiAFEB4gAQRAIAIgARA/CyADIANBEGoQOiADKAIEIQEgACADKAIANgIAIAAgATYCBCADQeAFaiQAC90BAQV/IAAoAtgCIgFByAEgAC8B3AJBAnZB/gFxIgRrIgVBeHEiA0kEQCABIABByAFqIgJqQQE6AAAgAiADakEBayIBIAEtAABBgAFyOgAAIAAgAiAFQQN2EAMgAkHAASAEa0F4cUEIahBJGiAAQQA2AtgCDwsjAEEwayIAJAAgACADNgIEIAAgATYCACAAQSxqQQE2AgAgAEECNgIMIABBpInAADYCCCAAQgI3AhQgAEEBNgIkIAAgAEEgajYCECAAIAA2AiggACAAQQRqNgIgIABBCGpBuILAABAxAAuKAQIDfwF+IwBBIGsiAiQAIAEoAgBBgICAgHhGBEAgASgCDCEDIAJBHGoiBEEANgIAIAJCgICAgBA3AhQgAkEUaiADEAUaIAJBEGogBCgCACIDNgIAIAIgAikCFCIFNwMIIAFBCGogAzYCACABIAU3AgALIABBlIfAADYCBCAAIAE2AgAgAkEgaiQAC3gBAn8jAEEgayICJAACQCABBEAgASgCACIDQX9GDQEgASADQQFqNgIAIAJBFGoiAyABQQhqQcgBECUgASABKAIAQQFrNgIAIAJBCGogAxA6IAIoAgwhASAAIAIoAgg2AgAgACABNgIEIAJBIGokAA8LEEUACxBGAAtjAQF/IwBBEGsiAyQAAkAgAARAIAAoAgANASAAQX82AgAgA0EIaiABIAIQMCAAQQhqIAMoAggiAiADKAIMIgEQBiABBEAgAiABED8LIABBADYCACADQRBqJAAPCxBFAAsQRgALZwECfyMAQSBrIgIkAAJAIAEEQCABKAIADQEgAUF/NgIAIAJBFGoiAyABQQhqECggAUEANgIAIAJBCGogAxA6IAIoAgwhASAAIAIoAgg2AgAgACABNgIEIAJBIGokAA8LEEUACxBGAAuWBgEJfyMAQRBrIggkACABEBkgCCABLwHcAkEDdjYCDCAIIAE2AggjAEEgayIHJAAgCEEIaiIDKAIAIQQgAygCBCEFIAdBBGoiAiIDQciCwAA2AgwgAyAENgIEIANBgIDEADYCACADIAQgBWo2AgggB0EcaiIJQQA2AgAgB0KAgICAEDcCFCMAQTBrIgMkACADQRBqIgUgAkEIaikCADcDACADIAIpAgA3AwggA0EYaiIEQQE2AgQgBCADQQhqIgIoAgggAigCBGtBAXQgAigCAEGAgMQAR3IiAjYCCCAEIAI2AgAgAygCGCICIAdBFGoiBCgCACAEKAIIIgZrSwRAIAQgBiACECkLIANBIGogBSkDADcDACADIAMpAwg3AxggA0EYahAiIgJBgIDEAEcEQANAAkACfwJAIAJBgAFPBEAgA0EANgIsIAJBgBBJDQEgAkGAgARJBEAgAyACQQx2QeABcjoALCADIAJBBnZBP3FBgAFyOgAtQQIhBUEDDAMLIAMgAkESdkHwAXI6ACwgAyACQQZ2QT9xQYABcjoALiADIAJBDHZBP3FBgAFyOgAtQQMhBUEEDAILIAQoAggiBiAEKAIARgR/IwBBEGsiBSQAIAVBCGogBCAGQQEQDQJAAkAgBSgCCCIGQYGAgIB4RwRAIAZFDQEgBiAFKAIMEEgACyAFQRBqJAAMAQsQMwALIAQoAggFIAYLIAQoAgRqIAI6AAAgBCAEKAIIQQFqNgIIDAILIAMgAkEGdkHAAXI6ACxBASEFQQILIQogBSADQSxqIgZyIAJBP3FBgAFyOgAAIAYgCmogBmsiAiAEKAIAIAQoAggiBWtLBH8gBCAFIAIQKSAEKAIIBSAFCyAEKAIEaiAGIAIQShogBCAEKAIIIAJqNgIICyADQRhqECIiAkGAgMQARw0ACwsgA0EwaiQAIABBCGogCSgCADYCACAAIAcpAhQ3AgAgB0EgaiQAIAFByAFqQcABIAEvAdwCQQJ2Qf4BcWtBeHFBCGoQSRogAUEANgLYAiABQcgBEEkaIAhBEGokAAucAgEDfyMAQeACayICJAAgAgJ/AkACQAJAAkACQAJAIAFB4AFrQRt3DgoBAgAAAAMAAAAEAAsgAkGAgMAAQSkQADYCBEEBDAULIAJB4AE7AQIMAwsgAkGAAjsBAgwCCyACQYADOwECDAELIAJBgAQ7AQILQQALOwEAAn8gAi8BACIERQRAIAIvAQIhAyACQdwCEEkiASADOwHcAiMAQfACayIDJAAgA0EQaiABQeACEEoaQe2MwAAtAAAaQegCQQgQOSIBRQRAQQhB6AIQSAALIAFBADYCACABQQRqIANBDGpB5AIQShogA0HwAmokACABIQNBAAwBCyACKAIECyEBIAAgBDYCCCAAIAE2AgQgACADNgIAIAJB4AJqJAALWQECfyMAQSBrIgIkAAJAIAEEQCABKAIADQEgAUF/NgIAIAJBEGoiAyABQQhqEB4gAUEANgIAIAJBCGogAxA6IAAgAikDCDcDACACQSBqJAAPCxBFAAsQRgALVAEBfyMAQfACayICJAACQCABBEAgASgCAA0BIAFBADYCACACQQhqIAFB6AIQShogACACQRBqQeACEEoaIAFB6AIQPyACQfACaiQADwsQRQALEEYAC2sBAn8gACgCACEBIABBgIDEADYCAAJAIAFBgIDEAEcNAEGAgMQAIQEgACgCBCICIAAoAghGDQAgACACQQFqNgIEIAAgACgCDCIAIAItAAAiAUEPcWotAAA2AgAgACABQQR2ai0AACEBCyABC2QAIwBBMGsiACQAQeyMwAAtAAAEQCAAQQI2AhAgAEGwhsAANgIMIABCATcCGCAAQQE2AiggACABNgIsIAAgAEEkajYCFCAAIABBLGo2AiQgAEEMakHYhsAAEDEACyAAQTBqJAALUgACQCAABEAgACgCAA0BIABB0AFqQcABIAAvAeQCQQJ2Qf4BcWtBeHFBCGoQSRogAEEANgLgAiAAQQhqQcgBEEkaIABBADYCAA8LEEUACxBGAAte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IAE2AgQgAyAANgIAIANBLGpBATYCACADQQI2AgwgA0HQi8AANgIIIANCAjcCFCADQQE2AiQgAyADQSBqNgIQIAMgA0EEajYCKCADIAM2AiAgA0EIaiACEDEAC68GAgt/An4gADUCACENIwBBMGsiBSQAQSchAgJAIA1CkM4AVARAIA0hDgwBCwNAIAVBCWogAmoiBEEEayANIA1CkM4AgCIOQpDOAH59pyIDQf//A3FB5ABuIgBBAXRBtInAAGovAAA7AAAgBEECayADIABB5ABsa0H//wNxQQF0QbSJwABqLwAAOwAAIAJBBGshAiANQv/B1y9WIA4hDQ0ACwsgDqciA0HjAEsEQCACQQJrIgIgBUEJamogDqciACAAQf//A3FB5ABuIgNB5ABsa0H//wNxQQF0QbSJwABqLwAAOwAACwJAIANBCk8EQCACQQJrIgIgBUEJamogA0EBdEG0icAAai8AADsAAAwBCyACQQFrIgIgBUEJamogA0EwcjoAAAsCfyAFQQlqIAJqIQhBK0GAgMQAIAEoAhwiA0EBcSIAGyEGIABBJyACayIJaiEKQbSIwABBACADQQRxGyEHAkACQCABKAIARQRAQQEhACABKAIUIgIgASgCGCIDIAYgBxAvDQEMAgsgCiABKAIEIgtPBEBBASEAIAEoAhQiAiABKAIYIgMgBiAHEC8NAQwCCyADQQhxBEAgASgCECEDIAFBMDYCECABLQAgIQJBASEAIAFBAToAICABKAIUIgwgASgCGCIEIAYgBxAvDQEgCyAKa0EBaiEAAkADQCAAQQFrIgBFDQEgDEEwIAQoAhARAgBFDQALQQEMBAtBASEAIAwgCCAJIAQoAgwRAwANASABIAI6ACAgASADNgIQQQAhAAwBCyALIAprIQICQAJAAkAgAS0AICIAQQFrDgMAAQACCyACIQBBACECDAELIAJBAXYhACACQQFqQQF2IQILIABBAWohACABKAIQIQMgASgCGCEEIAEoAhQhAQJAA0AgAEEBayIARQ0BIAEgAyAEKAIQEQIARQ0AC0EBDAMLQQEhACABIAQgBiAHEC8NACABIAggCSAEKAIMEQMADQBBACEAA0BBACAAIAJGDQMaIABBAWohACABIAMgBCgCEBECAEUNAAsgAEEBayACSQwCCyAADAELIAIgCCAJIAMoAgwRAwALIAVBMGokAAsLACAAIwBqJAAjAAsJACAAIAEQAQALDABB4IPAAEEbEEQACw0AQfuDwABBzwAQRAALCAAgACABEAULGQAgACABQZCNwAAoAgAiAEECIAAbEQAAAAufAQEDfwJAIAEiAkEQSQRAIAAhAQwBCyAAQQAgAGtBA3EiBGohAyAEBEAgACEBA0AgAUEAOgAAIAFBAWoiASADSQ0ACwsgAyACIARrIgJBfHEiBGohASAEQQBKBEADQCADQQA2AgAgA0EEaiIDIAFJDQALCyACQQNxIQILIAIEQCABIAJqIQIDQCABQQA6AAAgAUEBaiIBIAJJDQALCyAAC7gCAQd/AkAgAiIEQRBJBEAgACECDAELIABBACAAa0EDcSIDaiEFIAMEQCAAIQIgASEGA0AgAiAGLQAAOgAAIAZBAWohBiACQQFqIgIgBUkNAAsLIAUgBCADayIIQXxxIgdqIQICQCABIANqIgNBA3EEQCAHQQBMDQEgA0EDdCIEQRhxIQkgA0F8cSIGQQRqIQFBACAEa0EYcSEEIAYoAgAhBgNAIAUgBiAJdiABKAIAIgYgBHRyNgIAIAFBBGohASAFQQRqIgUgAkkNAAsMAQsgB0EATA0AIAMhAQNAIAUgASgCADYCACABQQRqIQEgBUEEaiIFIAJJDQALCyAIQQNxIQQgAyAHaiEBCyAEBEAgAiAEaiEDA0AgAiABLQAAOgAAIAFBAWohASACQQFqIgIgA0kNAAsLIAALAwABCwvzDAEAQYCAwAAL6QxLZWNjYWtCaXRzIG11c3QgYmUgMjI0LCAyNTYsIDM4NCwgb3IgNTEyLnNyYy9saWIucnMAKQAQAAoAAAB4AAAAIwAAACkAEAAKAAAAdAAAACMAAAApABAACgAAAJkAAAA2AAAAKQAQAAoAAACPAAAAKAAAAAAAAAABAAAAAAAAAIKAAAAAAAAAioAAAAAAAIAAgACAAAAAgIuAAAAAAAAAAQAAgAAAAACBgACAAAAAgAmAAAAAAACAigAAAAAAAACIAAAAAAAAAAmAAIAAAAAACgAAgAAAAACLgACAAAAAAIsAAAAAAACAiYAAAAAAAIADgAAAAAAAgAKAAAAAAACAgAAAAAAAAIAKgAAAAAAAAAoAAIAAAACAgYAAgAAAAICAgAAAAAAAgAEAAIAAAAAACIAAgAAAAIApABAACgAAABMBAAAJAAAAMDEyMzQ1Njc4OWFiY2RlZlRyaWVkIHRvIHNocmluayB0byBhIGxhcmdlciBjYXBhY2l0eVgBEAAkAAAAL3J1c3RjLzliMDA5NTZlNTYwMDliYWIyYWExNWQ3YmZmMTA5MTY1OTllM2Q2ZDYvbGlicmFyeS9hbGxvYy9zcmMvcmF3X3ZlYy5yc4QBEABMAAAA5wEAAAkAAABudWxsIHBvaW50ZXIgcGFzc2VkIHRvIHJ1c3RyZWN1cnNpdmUgdXNlIG9mIGFuIG9iamVjdCBkZXRlY3RlZCB3aGljaCB3b3VsZCBsZWFkIHRvIHVuc2FmZSBhbGlhc2luZyBpbiBydXN0AAADAAAADAAAAAQAAAAEAAAABQAAAAYAAAAvcnVzdC9kZXBzL2RsbWFsbG9jLTAuMi42L3NyYy9kbG1hbGxvYy5yc2Fzc2VydGlvbiBmYWlsZWQ6IHBzaXplID49IHNpemUgKyBtaW5fb3ZlcmhlYWQAZAIQACkAAACoBAAACQAAAGFzc2VydGlvbiBmYWlsZWQ6IHBzaXplIDw9IHNpemUgKyBtYXhfb3ZlcmhlYWQAAGQCEAApAAAArgQAAA0AAABtZW1vcnkgYWxsb2NhdGlvbiBvZiAgYnl0ZXMgZmFpbGVkAAAMAxAAFQAAACEDEAANAAAAbGlicmFyeS9zdGQvc3JjL2FsbG9jLnJzQAMQABgAAABiAQAACQAAAGxpYnJhcnkvc3RkL3NyYy9wYW5pY2tpbmcucnNoAxAAHAAAAIQCAAAeAAAAAwAAAAwAAAAEAAAABwAAAAgAAAAIAAAABAAAAAkAAAAIAAAACAAAAAQAAAAKAAAACwAAAAwAAAAQAAAABAAAAA0AAAAOAAAADwAAAAAAAAABAAAAEAAAAGNhcGFjaXR5IG92ZXJmbG93AAAA7AMQABEAAABsaWJyYXJ5L2FsbG9jL3NyYy9yYXdfdmVjLnJzCAQQABwAAAAZAAAABQAAACljYWxsZWQgYE9wdGlvbjo6dW53cmFwKClgIG9uIGEgYE5vbmVgIHZhbHVlEgAAAAAAAAABAAAAEwAAAGluZGV4IG91dCBvZiBib3VuZHM6IHRoZSBsZW4gaXMgIGJ1dCB0aGUgaW5kZXggaXMgAABwBBAAIAAAAJAEEAASAAAAMDAwMTAyMDMwNDA1MDYwNzA4MDkxMDExMTIxMzE0MTUxNjE3MTgxOTIwMjEyMjIzMjQyNTI2MjcyODI5MzAzMTMyMzMzNDM1MzYzNzM4Mzk0MDQxNDI0MzQ0NDU0NjQ3NDg0OTUwNTE1MjUzNTQ1NTU2NTc1ODU5NjA2MTYyNjM2NDY1NjY2NzY4Njk3MDcxNzI3Mzc0NzU3Njc3Nzg3OTgwODE4MjgzODQ4NTg2ODc4ODg5OTA5MTkyOTM5NDk1OTY5Nzk4OTlyYW5nZSBzdGFydCBpbmRleCAgb3V0IG9mIHJhbmdlIGZvciBzbGljZSBvZiBsZW5ndGggfAUQABIAAACOBRAAIgAAAHJhbmdlIGVuZCBpbmRleCDABRAAEAAAAI4FEAAiAAAAc2xpY2UgaW5kZXggc3RhcnRzIGF0ICBidXQgZW5kcyBhdCAA4AUQABYAAAD2BRAADQAAAHNvdXJjZSBzbGljZSBsZW5ndGggKCkgZG9lcyBub3QgbWF0Y2ggZGVzdGluYXRpb24gc2xpY2UgbGVuZ3RoICgUBhAAFQAAACkGEAArAAAANAQQAAEAbwlwcm9kdWNlcnMCCGxhbmd1YWdlAQRSdXN0AAxwcm9jZXNzZWQtYnkDBXJ1c3RjHTEuNzguMCAoOWIwMDk1NmU1IDIwMjQtMDQtMjkpBndhbHJ1cwYwLjIwLjMMd2FzbS1iaW5kZ2VuBjAuMi45MgAsD3RhcmdldF9mZWF0dXJlcwIrD211dGFibGUtZ2xvYmFscysIc2lnbi1leHQ=";
const WASM_BINARY = typeof Buffer != "undefined" ? Buffer.from(WASM_BASE64, "base64") : new Uint8Array([...atob(WASM_BASE64)].map(v => v.charCodeAt(0)));

var keccak_wasm_bg_wasm = /*#__PURE__*/Object.freeze({
    __proto__: null,
    WASM_BINARY: WASM_BINARY
});

let wasm;

const cachedTextDecoder = (typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { ignoreBOM: true, fatal: true }) : { decode: () => { throw Error('TextDecoder not available') } } );

if (typeof TextDecoder !== 'undefined') { cachedTextDecoder.decode(); }
let cachedUint8Memory0 = null;

function getUint8Memory0() {
    if (cachedUint8Memory0 === null || cachedUint8Memory0.byteLength === 0) {
        cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

const heap = new Array(128).fill(undefined);

heap.push(undefined, null, true, false);

let heap_next = heap.length;

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

let cachedInt32Memory0 = null;

function getInt32Memory0() {
    if (cachedInt32Memory0 === null || cachedInt32Memory0.byteLength === 0) {
        cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32Memory0;
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8Memory0().subarray(ptr / 1, ptr / 1 + len);
}

let WASM_VECTOR_LEN = 0;

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8Memory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

const cachedTextEncoder = (typeof TextEncoder !== 'undefined' ? new TextEncoder('utf-8') : { encode: () => { throw Error('TextEncoder not available') } } );

(typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

/**
* @param {Uint8Array} bytes
* @returns {Uint8Array}
*/
function keccak256(bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.keccak256(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

(typeof FinalizationRegistry === 'undefined')
    ? { }
    : new FinalizationRegistry(ptr => wasm.__wbg_keccakhash_free(ptr >>> 0));

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);

            } catch (e) {
                if (module.headers.get('Content-Type') != 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);

    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };

        } else {
            return instance;
        }
    }
}

function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbindgen_error_new = function(arg0, arg1) {
        const ret = new Error(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };

    return imports;
}

function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedInt32Memory0 = null;
    cachedUint8Memory0 = null;


    return wasm;
}


async function __wbg_init(input) {
    if (wasm !== undefined) return wasm;

    if (typeof input === 'undefined') {
        input = new URL('keccak_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof input === 'string' || (typeof Request === 'function' && input instanceof Request) || (typeof URL === 'function' && input instanceof URL)) {
        input = fetch(input);
    }

    const { instance, module } = await __wbg_load(await input, imports);

    return __wbg_finalize_init(instance, module);
}

await __wbg_init(Promise.resolve().then(function () { return keccak_wasm_bg_wasm; }).then(imports => {return imports.WASM_BINARY;}));

const Bandersnatch = {
    /**
     * `F_{pubkey}^{message}(context) `
     * $(0.7.1 - G.1)
     * @param signature - the signature to verify
     * @param pubkey - the public key to verify the signature with
     * @param message - the message that was signed
     * @param context - the context of the signature
     */
    verifySignature(signature, pubkey, message, context) {
        return ietfVrfVerify(pubkey, context, message, signature);
    },
    /**
     * `F_{privkey}^{message}(context) `
     * $(0.7.1 - G.1)
     * @param context - the context of the signature
     * @param message - the message to sign
     * @param privkey - the private key to sign with
     */
    sign(privkey, message, context) {
        return ietfVrfSign(privkey, context, message);
    },
    /**
     * `Y` function in the graypaper
     * The alias/output/entropy function of a Bandersnatch vrf signature/proof. See section 3.8 and appendix
     * $(0.7.1 - G.2)
     */
    vrfOutputSignature(signature) {
        return ietfVrfOutputHash(signature);
    },
    /** generate output from secret and context */
    vrfOutputSeed(privKey, context) {
        return ietfVrfOutputHashFromSecret(privKey, context);
    },
    /**
     * `Y` function in the graypaper
     * $(0.7.1 - G.5)
     */
    vrfOutputRingProof(ringProof) {
        return ringVrfOutputHash(ringProof);
    },
    verifyVrfProof(proof, ringRoot, context) {
        return ringVrfVerify(proof, context, new Uint8Array(0), Buffer.from(ringRoot), NUMBER_OF_VALIDATORS);
    },
    /**
     * `O` function in the graypaper
     * $(0.7.1 - G.3)
     */
    ringRoot(input) {
        const inputBuf = Buffer.alloc(input.length * 32);
        input.forEach((key, idx) => {
            inputBuf.set(key, idx * 32);
        });
        return ringRoot(inputBuf);
    },
    publicKey(secretSeed) {
        return publicKey(secretSeed);
    },
    privKey(seed) {
        return secretKey(seed);
    },
};

const Ed25519 = {
    /**
     * `E_{pubkey}(message) `
     */
    verifySignature(signature, pubkey, message) {
        return sodium.crypto_sign_verify_detached(Buffer.from(signature), Buffer.from(message), Buffer.from(pubkey));
    },
    /**
     * `E_{privkey}(message) `
     */
    sign(message, privkey) {
        const signatureBuf = Buffer.alloc(64);
        sodium.crypto_sign_detached(signatureBuf, Buffer.from(message), Buffer.from(privkey));
        return signatureBuf;
    },
    keypair(seed) {
        const publicKey = Buffer.alloc(32);
        const privateKey = Buffer.alloc(64);
        sodium.crypto_sign_seed_keypair(publicKey, privateKey, Buffer.from(seed));
        return {
            public: publicKey,
            privateKey: privateKey,
        };
    },
};

blake2b.ready((err) => {
    if (err) {
        throw err;
    }
});
const Hashing = {
    blake2b(bytes) {
        return blake2b().update(bytes).digest();
    },
    keccak256(bytes) {
        return keccak256(bytes);
    },
};

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol */


function __decorate$1(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}

function __metadata$1(metadataKey, metadataValue) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
}

function __classPrivateFieldGet(receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}

function __classPrivateFieldSet(receiver, state, value, kind, f) {
    if (typeof state === "function" ? receiver !== state || true : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (state.set(receiver, value)), value;
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

const HashCodec = xBytesCodec(32);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isSafeKeyable = (x) => {
    return typeof x === "object" && x !== null && typeof x.safeKey === "function";
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isSafeKey = (key) => {
    return (typeof key === "string" ||
        typeof key === "number" ||
        typeof key === "boolean" ||
        typeof key === "bigint" ||
        typeof key === "symbol");
};

var _a$2;
class IdentitySet {
    constructor(values) {
        this.internalSet = new Set();
        this.keyLookupMap = new Map();
        this[_a$2] = "IdentitySet";
        if (values) {
            for (const value of values) {
                this.add(value);
            }
        }
    }
    getInternalKey(value) {
        if (isSafeKey(value)) {
            return value;
        }
        return uncheckedConverter.arrayToLittleEndian(value);
    }
    lookupValue(key) {
        if (this.keyLookupMap.has(key)) {
            return this.keyLookupMap.get(key);
        }
        throw new Error("lookupValue called with unknown key");
    }
    add(value) {
        const internalKey = this.getInternalKey(value);
        this.internalSet.add(internalKey);
        this.keyLookupMap.set(internalKey, value);
        return this;
    }
    has(value) {
        const internalKey = this.getInternalKey(value);
        return this.internalSet.has(internalKey);
    }
    delete(value) {
        const internalKey = this.getInternalKey(value);
        const toRet = this.internalSet.delete(internalKey);
        return this.keyLookupMap.delete(internalKey) && toRet;
    }
    clear() {
        this.internalSet.clear();
        this.keyLookupMap.clear();
    }
    get size() {
        return this.internalSet.size;
    }
    keys() {
        return [...this.internalSet.keys()]
            .map((k) => this.lookupValue(k))
            .values();
    }
    values() {
        return this.keys();
    }
    entries() {
        return [...this.internalSet.keys()]
            .map((k) => {
            const value = this.lookupValue(k);
            return [value, value];
        })
            .values();
    }
    forEach(callbackfn, thisArg) {
        this.internalSet.forEach((key) => {
            const value = this.lookupValue(key);
            callbackfn.call(thisArg, value, value, this);
        });
    }
    [(_a$2 = Symbol.toStringTag, Symbol.iterator)]() {
        return this.values();
    }
}
const IdentitySetCodec = (itemCodec) => {
    return {
        ...mapCodec(createArrayLengthDiscriminator(itemCodec), (v) => new IdentitySet(v), (v) => Array.from(v.values()).sort(compareUint8Arrays)),
        ...ZipJSONCodecs(ArrayOfJSONCodec(itemCodec), {
            fromJSON(json) {
                return new IdentitySet(json);
            },
            toJSON(value) {
                return Array.from(value.values()).sort(compareUint8Arrays);
            },
        }),
    };
};
const identitySetCodec = (itemCodec, jsonKey) => {
    return function (target, propertyKey) {
        codec$1(IdentitySetCodec(itemCodec), jsonKey)(target, propertyKey);
    };
};

/**
 * identified by `Y` set
 * $(0.7.1 - 11.5)
 * $(0.7.1 - C.25) | codec
 */
let AvailabilitySpecificationImpl = class AvailabilitySpecificationImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        Object.assign(this, config);
    }
};
__decorate$1([
    codec$1(HashCodec, "hash"),
    __metadata$1("design:type", Object)
], AvailabilitySpecificationImpl.prototype, "packageHash", void 0);
__decorate$1([
    eSubIntCodec(4, "length"),
    __metadata$1("design:type", Object)
], AvailabilitySpecificationImpl.prototype, "bundleLength", void 0);
__decorate$1([
    codec$1(HashCodec, "erasure_root"),
    __metadata$1("design:type", Object)
], AvailabilitySpecificationImpl.prototype, "erasureRoot", void 0);
__decorate$1([
    codec$1(HashCodec, "exports_root"),
    __metadata$1("design:type", Object)
], AvailabilitySpecificationImpl.prototype, "segmentRoot", void 0);
__decorate$1([
    eSubIntCodec(2, "exports_count"),
    __metadata$1("design:type", Number)
], AvailabilitySpecificationImpl.prototype, "segmentCount", void 0);
AvailabilitySpecificationImpl = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], AvailabilitySpecificationImpl);

var SlotImpl_1;
/**
 * A slot is a block slot. Which is derived using current time since epoch / blocktime
 */
let SlotImpl = SlotImpl_1 = class SlotImpl extends BaseJamCodecable {
    constructor(value) {
        super();
        // if value is not provided, it will be set from codec
        this.value = value;
    }
    safeKey() {
        return this.value;
    }
    /**
     * `e` in the graypaper
     * @see section 6.1 - Timekeeping
     * $(0.7.1 - 6.2)
     */
    epochIndex() {
        return toTagged(Math.floor(this.value / EPOCH_LENGTH));
    }
    /**
     * `m` in the graypaper
     * $(0.7.1 - 6.2)
     */
    slotPhase() {
        return toTagged((this.value % EPOCH_LENGTH));
    }
    /**
     * checks if this slot is in the same epoch as the other slot
     */
    isSameEra(other) {
        return this.epochIndex() === other.epochIndex();
    }
    /**
     * checks if this represents a newer era
     * @param other - the other slot to compare with
     */
    isNewerEra(other) {
        return this.epochIndex() > other.epochIndex();
    }
    /**
     * checks if this is inside the next era compared to the other slot
     * @param other - the other slot to compare with
     */
    isNextEra(other) {
        return this.epochIndex() === other.epochIndex() + 1;
    }
    /**
     * $(0.7.1 - 5.7)
     */
    checkPTauValid(prevTau) {
        if (this.value <= prevTau.value) {
            return err(TauError.POSTERIOR_TAU_LESS_OR_EQUAL_TAU);
        }
        // Ht * P <= T
        //     Ht <= T/P
        //     inverted for error checking
        if (this.value > SlotImpl_1.posteriorTau().value) {
            return err(TauError.POSTERIOR_TAU_IN_FUTURE);
        }
        return ok(toTagged(this));
    }
    static posteriorTau() {
        return toTagged(new SlotImpl_1(Math.floor(this.bigT() / BLOCK_TIME)));
    }
    /**
     * `T` - defined in 4.4
     */
    static bigT() {
        const now = (Date.now() / 1000) | 0;
        return (now - JAM_COMMON_ERA);
    }
};
__decorate$1([
    eSubIntCodec(4, SINGLE_ELEMENT_CLASS),
    __metadata$1("design:type", Number)
], SlotImpl.prototype, "value", void 0);
SlotImpl = SlotImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Number])
], SlotImpl);
var TauError;
(function (TauError) {
    TauError["POSTERIOR_TAU_LESS_OR_EQUAL_TAU"] = "POSTERIOR_TAU_LESS_OR_EQUAL_TAU";
    TauError["POSTERIOR_TAU_IN_FUTURE"] = "POSTERIOR_TAU_IN_FUTURE";
})(TauError || (TauError = {}));

/**
 * `C` set
 * $(0.7.1 - C.24) | codec
 */
let WorkContextImpl = class WorkContextImpl extends BaseJamCodecable {
};
__decorate$1([
    codec$1(xBytesCodec(32), "anchor"),
    __metadata$1("design:type", Object)
], WorkContextImpl.prototype, "anchorHash", void 0);
__decorate$1([
    codec$1(xBytesCodec(32), "state_root"),
    __metadata$1("design:type", Object)
], WorkContextImpl.prototype, "anchorPostState", void 0);
__decorate$1([
    codec$1(xBytesCodec(32), "beefy_root"),
    __metadata$1("design:type", Object)
], WorkContextImpl.prototype, "anchorAccOutLog", void 0);
__decorate$1([
    codec$1(xBytesCodec(32), "lookup_anchor"),
    __metadata$1("design:type", Object)
], WorkContextImpl.prototype, "lookupAnchorHash", void 0);
__decorate$1([
    codec$1(SlotImpl, "lookup_anchor_slot"),
    __metadata$1("design:type", SlotImpl)
], WorkContextImpl.prototype, "lookupAnchorSlot", void 0);
__decorate$1([
    lengthDiscriminatedCodec(xBytesCodec(32)),
    __metadata$1("design:type", Array)
], WorkContextImpl.prototype, "prerequisites", void 0);
WorkContextImpl = __decorate$1([
    JamCodecable()
], WorkContextImpl);

/**
 * `E u B`
 * $(0.7.1 - C.34) | codec
 */
class WorkOutputImpl extends BaseJamCodecable {
    constructor(d) {
        super();
        if (typeof d !== "undefined") {
            if (d instanceof Uint8Array) {
                this.success = d;
            }
            else {
                this.error = d;
            }
        }
    }
    isError() {
        return !(this.success instanceof Uint8Array);
    }
    isSuccess() {
        return this.success instanceof Uint8Array;
    }
    isPanic() {
        return this.error === WorkError.Panic;
    }
    isOutOfGas() {
        return this.error === WorkError.OutOfGas;
    }
    static big() {
        return new WorkOutputImpl(WorkError.Big);
    }
    static badExports() {
        return new WorkOutputImpl(WorkError.BadExports);
    }
    static bad() {
        return new WorkOutputImpl(WorkError.Bad);
    }
    static outOfGas() {
        return (new WorkOutputImpl(WorkError.OutOfGas));
    }
    static panic() {
        return (new WorkOutputImpl(WorkError.Panic));
    }
    static oversize() {
        return (new WorkOutputImpl(WorkError.Oversize));
    }
    static encode(_value, bytes) {
        let offset = 0;
        const value = _value;
        if (value.isSuccess()) {
            offset = E.encode(0n, bytes);
            offset += LengthDiscrimantedIdentityCodec.encode(value.success, bytes.subarray(offset));
        }
        else {
            switch (value.error) {
                case WorkError.OutOfGas:
                    offset = E.encode(1n, bytes);
                    break;
                case WorkError.Panic:
                    offset = E.encode(2n, bytes);
                    break;
                case WorkError.BadExports:
                    offset = E.encode(3n, bytes);
                    break;
                case WorkError.Oversize:
                    offset = E.encode(4n, bytes);
                    break;
                case WorkError.Bad:
                    offset = E.encode(5n, bytes);
                    break;
                case WorkError.Big:
                    offset = E.encode(6n, bytes);
                    break;
            }
        }
        return offset;
    }
    static encodedSize(_value) {
        const value = _value;
        if (value.isSuccess()) {
            return (E.encodedSize(0n) +
                LengthDiscrimantedIdentityCodec.encodedSize(value.success));
        }
        return E.encodedSize(1n);
    }
    static decode(bytes) {
        if (bytes[0] === 0) {
            const r = LengthDiscrimantedIdentityCodec.decode(bytes.subarray(1));
            return {
                value: new WorkOutputImpl(r.value),
                readBytes: r.readBytes + 1,
            };
        }
        // construct with placeholder
        switch (bytes[0]) {
            case 1:
                return {
                    value: WorkOutputImpl.outOfGas(),
                    readBytes: 1,
                };
            case 2:
                return {
                    value: WorkOutputImpl.panic(),
                    readBytes: 1,
                };
            case 3:
                return {
                    value: WorkOutputImpl.badExports(),
                    readBytes: 1,
                };
            case 4:
                return {
                    value: WorkOutputImpl.oversize(),
                    readBytes: 1,
                };
            case 5:
                return { value: WorkOutputImpl.bad(), readBytes: 1 };
            case 6:
                return { value: WorkOutputImpl.big(), readBytes: 1 };
            default:
                throw new Error(`Invalid value ${bytes[0]}`);
        }
    }
    toBinary() {
        return encodeWithCodec(WorkOutputImpl, this);
    }
    toJSON() {
        if (this.isSuccess()) {
            return { ok: BufferJSONCodec().toJSON(toTagged(this.success)) };
        }
        switch (this.error) {
            case WorkError.OutOfGas:
                return { "out-of-gas": null };
            case WorkError.Panic:
                return { panic: null };
            case WorkError.BadExports:
                return { "bad-exports": null };
            case WorkError.Oversize:
                return { oversize: null };
            case WorkError.Bad:
                return { "bad-code": null };
            case WorkError.Big:
                return { "code-oversize": null };
        }
    }
    static fromJSON(json) {
        const toRet = new WorkOutputImpl();
        if ("ok" in json) {
            toRet.success = BufferJSONCodec().fromJSON(json.ok);
        }
        else if ("out-of-gas" in json) {
            toRet.error = WorkError.OutOfGas;
        }
        else if ("panic" in json) {
            toRet.error = WorkError.Panic;
        }
        else if ("bad-exports" in json) {
            toRet.error = WorkError.BadExports;
        }
        else if ("bad-code" in json) {
            toRet.error = WorkError.Bad;
        }
        else if ("code-oversize" in json) {
            toRet.error = WorkError.Big;
        }
        else {
            throw new Error("wrong json encoding of work output");
        }
        return toRet;
    }
    static toJSON(value) {
        if (value instanceof WorkOutputImpl) {
            return value.toJSON();
        }
        throw new Error(`Cannot convert ${value} to JSON`);
    }
}

/**
 * Identified by `D` set
 * $(0.7.1 - 11.6)
 * $(0.7.1 - C.26) | codec
 */
let WorkDigestImpl = class WorkDigestImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        if (typeof config !== "undefined") {
            Object.assign(this, config);
        }
    }
};
__decorate$1([
    eSubIntCodec(4, "service_id"),
    __metadata$1("design:type", Number)
], WorkDigestImpl.prototype, "serviceIndex", void 0);
__decorate$1([
    codec$1(xBytesCodec(32), "code_hash"),
    __metadata$1("design:type", Object)
], WorkDigestImpl.prototype, "codeHash", void 0);
__decorate$1([
    codec$1(xBytesCodec(32), "payload_hash"),
    __metadata$1("design:type", Object)
], WorkDigestImpl.prototype, "payloadHash", void 0);
__decorate$1([
    eSubBigIntCodec(8, "accumulate_gas"),
    __metadata$1("design:type", BigInt)
], WorkDigestImpl.prototype, "gasLimit", void 0);
__decorate$1([
    codec$1(WorkOutputImpl),
    __metadata$1("design:type", WorkOutputImpl)
], WorkDigestImpl.prototype, "result", void 0);
__decorate$1([
    jsonCodec(createJSONCodec([
        ["gasUsed", "gas_used", BigIntJSONCodec()],
        ["importCount", "imports", NumberJSONCodec()],
        ["extrinsicCount", "extrinsic_count", NumberJSONCodec()],
        ["extrinsicSize", "extrinsic_size", NumberJSONCodec()],
        ["exportCount", "exports", NumberJSONCodec()],
    ]), "refine_load"),
    binaryCodec(createCodec([
        ["gasUsed", E_bigint()], // u
        ["importCount", E_int()], // i
        ["extrinsicCount", E_int()], // x
        ["extrinsicSize", E_int()], // z
        ["exportCount", E_int()], // e
    ])),
    __metadata$1("design:type", Object)
], WorkDigestImpl.prototype, "refineLoad", void 0);
WorkDigestImpl = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], WorkDigestImpl);

var _a$1;
class IdentityMap {
    constructor(entries) {
        this.internalMap = new Map();
        this.keyLookupMap = new Map();
        this[_a$1] = "SafeMap";
        if (entries) {
            for (const [key, value] of entries) {
                this.set(key, value);
            }
        }
    }
    getInternalKey(key) {
        return uncheckedConverter.arrayToLittleEndian(key);
    }
    lookupKey(key) {
        if (this.keyLookupMap.has(key)) {
            return this.keyLookupMap.get(key);
        }
        throw new Error("lookupKey called with unknown key");
    }
    set(key, value) {
        const internalKey = this.getInternalKey(key);
        this.internalMap.set(internalKey, value);
        this.keyLookupMap.set(internalKey, key);
        return this;
    }
    get(key) {
        const internalKey = this.getInternalKey(key);
        return this.internalMap.get(internalKey);
    }
    has(key) {
        const internalKey = this.getInternalKey(key);
        return this.internalMap.has(internalKey);
    }
    delete(key) {
        const internalKey = this.getInternalKey(key);
        const toRet = this.internalMap.delete(internalKey);
        return this.keyLookupMap.delete(internalKey) && toRet;
    }
    clear() {
        this.internalMap.clear();
        this.keyLookupMap.clear();
    }
    get size() {
        return this.internalMap.size;
    }
    keys() {
        return [...this.internalMap.keys()].map((k) => this.lookupKey(k)).values();
    }
    values() {
        return this.internalMap.values();
    }
    entries() {
        return [...this.internalMap.entries()]
            .map(([k, v]) => [this.lookupKey(k), v])
            .values();
    }
    forEach(callbackfn, thisArg) {
        this.internalMap.forEach((value, key) => {
            callbackfn.call(thisArg, value, this.lookupKey(key), this);
        });
    }
    [(_a$1 = Symbol.toStringTag, Symbol.iterator)]() {
        return this.entries();
    }
    clone() {
        const clone = new IdentityMap();
        for (const [key, value] of this.entries()) {
            clone.set(key, value);
        }
        return clone;
    }
}
const IdentityMapCodec = (keyCodec, valueCodec, jsonKeys) => {
    return {
        ...mapCodec(buildGenericKeyValueCodec(keyCodec, valueCodec, (a, b) => compareUint8Arrays(a, b)), (v) => new IdentityMap([...v.entries()]), (v) => v),
        ...ZipJSONCodecs(MapJSONCodec(jsonKeys, keyCodec, valueCodec), {
            fromJSON(json) {
                return new IdentityMap([...json.entries()]);
            },
            toJSON(value) {
                return value;
            },
        }),
    };
};

/**
 * Identified by `R` set
 * @see $(0.7.1 - 11.2)
 * codec order defined in $(0.7.1 - C.27)
 */
let WorkReportImpl = class WorkReportImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        if (typeof config !== "undefined") {
            Object.assign(this, config);
        }
    }
    hash() {
        return Hashing.blake2b(this.toBinary());
    }
    /**
     * `P()`
     * $(0.7.1 - 12.9)
     * compute the package haches of the given work reports
     */
    static extractWorkPackageHashes(r) {
        return new IdentitySet(r.map((wr) => wr.avSpec.packageHash));
    }
    /**
     * Comutes `bold q` in thye paper which is the sequence of work reports which may be required
     * to be audited by the validator
     * $(0.7.1 - 17.2)
     */
    static computeRequiredWorkReports(rho, bold_w) {
        const toRet = [];
        const wSet = new Set(bold_w.elements.map((wr) => wr.hash()));
        for (let c = 0; c < CORES; c++) {
            const rc = rho.elementAt(c);
            if (rc && wSet.has(rc.workReport.hash())) {
                toRet.push(rc.workReport);
            }
            else {
                toRet.push(undefined);
            }
        }
        return toRet;
    }
};
__decorate$1([
    codec$1(AvailabilitySpecificationImpl, "package_spec"),
    __metadata$1("design:type", AvailabilitySpecificationImpl)
], WorkReportImpl.prototype, "avSpec", void 0);
__decorate$1([
    codec$1(WorkContextImpl),
    __metadata$1("design:type", WorkContextImpl)
], WorkReportImpl.prototype, "context", void 0);
__decorate$1([
    jsonCodec(NumberJSONCodec(), "core_index"),
    binaryCodec(E_int()),
    __metadata$1("design:type", Number)
], WorkReportImpl.prototype, "core", void 0);
__decorate$1([
    codec$1(HashCodec, "authorizer_hash"),
    __metadata$1("design:type", Object)
], WorkReportImpl.prototype, "authorizerHash", void 0);
__decorate$1([
    jsonCodec(BigIntJSONCodec(), "auth_gas_used"),
    binaryCodec(E),
    __metadata$1("design:type", BigInt)
], WorkReportImpl.prototype, "authGasUsed", void 0);
__decorate$1([
    codec$1(LengthDiscrimantedIdentityCodec, "auth_output"),
    __metadata$1("design:type", Uint8Array)
], WorkReportImpl.prototype, "authTrace", void 0);
__decorate$1([
    codec$1(IdentityMapCodec(HashCodec, HashCodec, {
        key: "work_package_hash",
        value: "segment_tree_root",
    }), "segment_root_lookup"),
    __metadata$1("design:type", IdentityMap)
], WorkReportImpl.prototype, "srLookup", void 0);
__decorate$1([
    jsonCodec(ArrayOfJSONCodec(WorkDigestImpl), "results"),
    binaryCodec(createArrayLengthDiscriminator(WorkDigestImpl)),
    __metadata$1("design:type", Object)
], WorkReportImpl.prototype, "digests", void 0);
WorkReportImpl = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], WorkReportImpl);

var AccumulationHistoryImpl_1;
/**
 * `ξ` in the graypaper
 * Defines the wph that have been accumulated
 * $(0.7.1 - 12.1)
 */
let AccumulationHistoryImpl = AccumulationHistoryImpl_1 = class AccumulationHistoryImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        if (typeof config !== "undefined") {
            Object.assign(this, config);
        }
    }
    /**
     * Computes the union of the AccumulationHistory
     * $(0.7.1 - 12.2)
     */
    union() {
        return new IdentitySet(this.elements.map((a) => [...a.values()]).flat());
    }
    /**
     * $(0.7.1 - 12.30 / 12.31)
     */
    toPosterior(deps) {
        const toRet = cloneCodecable(this);
        const slicedR = deps.r_star.slice(0, deps.nAccumulatedWork);
        // $(0.7.1 - 12.30)
        toRet.elements[EPOCH_LENGTH - 1] =
            WorkReportImpl.extractWorkPackageHashes(slicedR);
        for (let i = 0; i < EPOCH_LENGTH - 1; i++) {
            toRet.elements[i] = this.elements[i + 1];
        }
        return toPosterior(toRet);
    }
    static newEmpty() {
        return new AccumulationHistoryImpl_1({
            elements: (Array.from({ length: EPOCH_LENGTH }, () => new IdentitySet())),
        });
    }
};
__decorate$1([
    sequenceCodec(EPOCH_LENGTH, IdentitySetCodec(HashCodec), SINGLE_ELEMENT_CLASS),
    __metadata$1("design:type", Object)
], AccumulationHistoryImpl.prototype, "elements", void 0);
AccumulationHistoryImpl = AccumulationHistoryImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], AccumulationHistoryImpl);

/**
 * `O`
 * $(0.7.1 - 12.22)
 */
class AccumulationOutImpl {
    constructor(config) {
        Object.assign(this, config);
    }
}

let AccumulationQueueItem = class AccumulationQueueItem extends BaseJamCodecable {
    constructor(config) {
        super();
        Object.assign(this, config);
    }
};
__decorate$1([
    codec$1(WorkReportImpl, "report"),
    __metadata$1("design:type", WorkReportImpl)
], AccumulationQueueItem.prototype, "workReport", void 0);
__decorate$1([
    identitySetCodec(HashCodec),
    __metadata$1("design:type", IdentitySet)
], AccumulationQueueItem.prototype, "dependencies", void 0);
AccumulationQueueItem = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], AccumulationQueueItem);

/**
 * `bold R`
 * $(0.7.1 - 11.16)
 */
class NewWorkReportsImpl {
    constructor(elements = []) {
        this.elements = elements;
    }
    /**
     * `bold R!` in the paper
     * $(0.7.1 - 12.4)
     */
    immediatelyAccumulable() {
        return this.elements.filter((r) => r.context.prerequisites.length === 0 && r.srLookup.size == 0);
    }
    /**
     * `bold RQ` in the paper
     * $(0.7.1 - 12.5)
     */
    queueable(accHistory) {
        return E_Fn(this.elements
            .filter((wr) => {
            return wr.context.prerequisites.length > 0 || wr.srLookup.size > 0;
        })
            .map((wr) => {
            // $(0.7.1 - 12.6) | D fn calculated inline
            const deps = new IdentitySet([
                ...wr.srLookup.keys(),
            ]);
            wr.context.prerequisites.forEach((rwp) => deps.add(rwp));
            return new AccumulationQueueItem({
                workReport: wr,
                dependencies: deps,
            });
        }), accHistory.union());
    }
    /**
     * `bold R*` in the paper
     * $(0.7.1 - 12.11)
     */
    accumulatableReports(deps) {
        const r_mark = this.immediatelyAccumulable();
        const r_q = this.queueable(deps.accHistory);
        // $(0.7.1 - 12.10)
        const m = deps.p_tau.slotPhase();
        const accprio = computeAccumulationPriority(
        // $(0.7.1 - 12.12)
        E_Fn([
            ...deps.accQueue.elements.slice(m).flat(),
            ...deps.accQueue.elements.slice(0, m).flat(),
            ...r_q,
        ], WorkReportImpl.extractWorkPackageHashes(r_mark)));
        return [...r_mark, ...accprio];
    }
}
/**
 * $(0.7.1 - 12.7)
 */
const E_Fn = (r, x) => {
    const toRet = [];
    for (const { workReport /* w */, dependencies /* d */ } of r) {
        if (x.has(workReport.avSpec.packageHash)) {
            continue;
        }
        const newDeps = new IdentitySet([...dependencies.values()]);
        x.forEach((packageHash) => newDeps.delete(packageHash));
        toRet.push(new AccumulationQueueItem({ workReport, dependencies: newDeps }));
    }
    return toRet;
};
/**
 * `Q` fn
 * $(0.7.1 - 12.8)
 */
const computeAccumulationPriority = (r) => {
    const g = r
        .filter(({ dependencies }) => dependencies.size === 0)
        .map(({ workReport }) => workReport);
    if (g.length === 0) {
        return [];
    }
    return [
        ...g,
        ...computeAccumulationPriority(E_Fn(r, WorkReportImpl.extractWorkPackageHashes(g))),
    ];
};

var AccumulationQueueImpl_1;
/**
 * `ω`
 * Defines the ready but not yet accumulated work reports
 * $(0.7.1 - 12.3)
 */
let AccumulationQueueImpl = AccumulationQueueImpl_1 = class AccumulationQueueImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        if (typeof config !== "undefined") {
            Object.assign(this, config);
        }
    }
    /**
     * $(0.7.1 - 12.32)
     */
    toPosterior(deps) {
        const toRet = cloneCodecable(this);
        const m = deps.p_tau.slotPhase(); // $(0.7.1 - 12.10)
        for (let i = 0; i < EPOCH_LENGTH; i++) {
            const index = (m - i + EPOCH_LENGTH) % EPOCH_LENGTH;
            if (i === 0) {
                toRet.elements[index] = toPosterior(E_Fn(deps.r_q, deps.p_accumulationHistory.elements[EPOCH_LENGTH - 1]));
            }
            else if (i < deps.p_tau.value - deps.tau.value) {
                toRet.elements[index] = toPosterior([]);
            }
            else {
                toRet.elements[index] = toPosterior(E_Fn(this.elements[index], deps.p_accumulationHistory.elements[EPOCH_LENGTH - 1]));
            }
        }
        return toPosterior(toRet);
    }
    static newEmpty() {
        return new AccumulationQueueImpl_1({
            elements: (Array.from({ length: EPOCH_LENGTH }, () => new Array())),
        });
    }
};
__decorate$1([
    jsonCodec(ArrayOfJSONCodec(ArrayOfJSONCodec(AccumulationQueueItem)), SINGLE_ELEMENT_CLASS),
    binaryCodec(createSequenceCodec(EPOCH_LENGTH, createArrayLengthDiscriminator(AccumulationQueueItem))),
    __metadata$1("design:type", Object)
], AccumulationQueueImpl.prototype, "elements", void 0);
AccumulationQueueImpl = AccumulationQueueImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], AccumulationQueueImpl);

/**
 * $(0.7.1 - 12.26) | S
 */
class AccumulationStatisticsImpl {
    constructor(config) {
        if (config) {
            Object.assign(this, config);
        }
        else {
            this.elements = new Map();
        }
    }
    has(serviceIndex) {
        return this.elements.has(serviceIndex);
    }
    get(serviceIndex) {
        return this.elements.get(serviceIndex);
    }
    services() {
        return Array.from(this.elements.keys());
    }
    static compute(deps) {
        const toRet = new AccumulationStatisticsImpl();
        toRet.elements = new Map();
        // $(0.7.1 - 12.27) | we compute the summary of gas used first
        deps.gasUsed.elements.forEach(({ serviceIndex, gasUsed }) => {
            if (!toRet.elements.has(serviceIndex)) {
                toRet.elements.set(serviceIndex, {
                    gasUsed: 0n,
                    count: 0,
                });
            }
            const el = toRet.elements.get(serviceIndex);
            el.gasUsed = (el.gasUsed + gasUsed);
        });
        const slicedR = deps.r_star.slice(0, deps.nAccumulatedWork);
        for (const serviceIndex of toRet.elements.keys()) {
            // $(0.7.1 - 12.27)
            const n_s = slicedR
                .map((wr) => wr.digests)
                .flat()
                .filter((r) => r.serviceIndex === serviceIndex);
            if (n_s.length === 0) {
                // N(s) != []
                toRet.elements.delete(serviceIndex);
            }
            else {
                toRet.elements.get(serviceIndex).count = n_s.length;
            }
        }
        return toRet;
    }
}

var AuthorizerPoolImpl_1;
const codec = createArrayLengthDiscriminator(HashCodec);
/**
 * `α`
 * $(0.7.1 - 8.1)
 */
let AuthorizerPoolImpl = AuthorizerPoolImpl_1 = class AuthorizerPoolImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        if (typeof config !== "undefined") {
            Object.assign(this, config);
        }
    }
    elementAt(core) {
        return this.elements[core];
    }
    // $(0.7.1 - 8.2 / 8.3)
    toPosterior(deps) {
        const newState = new AuthorizerPoolImpl_1();
        newState.elements = toTagged([]);
        for (let core = 0; core < this.elements.length; core++) {
            const fromQueue = deps.p_queue.queueAtCore(core)[deps.p_tau.value % AUTHQUEUE_MAX_SIZE];
            let hashes;
            const firstWReport = deps.eg.elementForCore(core);
            // second bracket
            if (typeof firstWReport === "undefined") {
                // F(c) results in queue[c]
                hashes = [...this.elements[core], fromQueue];
            }
            else {
                // F(c) says we need to remove the leftmost workReport.hash from the curState
                const h = firstWReport.report.authorizerHash;
                const index = this.elements[core].findIndex((hash) => Buffer.compare(hash, h) === 0);
                hashes = [
                    ...this.elements[core].slice(0, index),
                    ...this.elements[core].slice(index + 1),
                    fromQueue,
                ];
            }
            newState.elements.push(toTagged(hashes.reverse().slice(0, AUTHPOOL_SIZE).reverse()));
        }
        return toPosterior(newState);
    }
    static newEmpty() {
        return new AuthorizerPoolImpl_1({
            elements: (Array.from({ length: CORES }, () => new Array())),
        });
    }
};
__decorate$1([
    sequenceCodec(CORES, {
        encode: codec.encode.bind(codec),
        decode: codec.decode.bind(codec),
        encodedSize: codec.encodedSize.bind(codec),
        ...ArrayOfJSONCodec(HashCodec),
    }, SINGLE_ELEMENT_CLASS),
    __metadata$1("design:type", Object)
], AuthorizerPoolImpl.prototype, "elements", void 0);
AuthorizerPoolImpl = AuthorizerPoolImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], AuthorizerPoolImpl);

var AuthorizerQueueImpl_1;
/**
 * `ϕ`
 * $(0.7.1 - 8.1)
 * A queue of AuthorizerHash-es, each of which will be rotated in the AuthorizerPool
 */
let AuthorizerQueueImpl = AuthorizerQueueImpl_1 = class AuthorizerQueueImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        Object.assign(this, config);
    }
    queueAtCore(core) {
        return this.elements[core];
    }
    static newEmpty() {
        return new AuthorizerQueueImpl_1({
            elements: (Array.from({ length: CORES }, () => Array.from({ length: AUTHQUEUE_MAX_SIZE }, () => new Uint8Array(32).fill(0)))),
        });
    }
};
__decorate$1([
    sequenceCodec(CORES, {
        ...createSequenceCodec(AUTHQUEUE_MAX_SIZE, HashCodec),
        ...ArrayOfJSONCodec(HashCodec),
    }, SINGLE_ELEMENT_CLASS),
    __metadata$1("design:type", Object)
], AuthorizerQueueImpl.prototype, "elements", void 0);
AuthorizerQueueImpl = AuthorizerQueueImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], AuthorizerQueueImpl);

const $node = new TextEncoder().encode("node");
/**
 * $(0.7.1 - E.1)
 */
const binaryMerkleTree = (elements, hashFn = Hashing.blake2b) => {
    if (elements.length === 0) {
        return new Uint8Array(32).fill(0);
    }
    if (elements.length === 1) {
        return elements[0];
    }
    const mid = Math.ceil(elements.length / 2);
    const buf = new Uint8Array([
        ...$node,
        ...binaryMerkleTree(elements.slice(0, mid), hashFn),
        ...binaryMerkleTree(elements.slice(mid), hashFn),
    ]);
    return hashFn(buf);
};
/**
 * `Mb`
 * $(0.7.1 - E.3)
 */
const wellBalancedBinaryMerkleRoot = (elements, hashFn = Hashing.blake2b) => {
    if (elements.length === 1) {
        return toTagged(hashFn(elements[0]));
    }
    // we are sure it returns Hash as the only reason binaryMerkleTree returns Uint8Array is when elements.length === 1
    // which is the case above.
    return toTagged(binaryMerkleTree(elements, hashFn));
};

/**
 * section E.2 `A`
 * $(0.7.1 - E.8)
 * @param peeks - the current MMR
 * @param newPeek - the new element to append
 * @param hashFn - the hash function
 */
const appendMMR = (peeks, newPeek, hashFn) => {
    return p(peeks, newPeek, 0, hashFn);
};
const p = (peeks, // r
newEl, // l
pos, // n
hashFn) => {
    if (pos >= peeks.length) {
        return peeks.slice().concat(newEl);
    }
    else if (pos < peeks.length && typeof peeks[pos] === "undefined") {
        return replace(peeks, pos, newEl);
    }
    else {
        const a = concatUint8Arrays([peeks[pos], newEl]);
        return p(replace(peeks, pos, undefined), hashFn(a), pos + 1, hashFn);
    }
};
const replace = (elements, index, value) => {
    const toRet = elements.slice();
    toRet[index] = value;
    return toRet;
};
/**
 * `Mr` - $(0.7.1 - E.10)
 */
const MMRSuperPeak = (_peeks) => {
    const peeks = _peeks.filter((a) => typeof a !== "undefined");
    if (peeks.length === 0) {
        return new Uint8Array(32).fill(0);
    }
    return innerMMRSuperPeak(peeks);
};
const PEAK = new TextEncoder().encode("peak");
const innerMMRSuperPeak = (peeks) => {
    if (peeks.length === 0) {
        return new Uint8Array(32).fill(0);
    }
    if (peeks.length === 1) {
        return peeks[0];
    }
    return Hashing.keccak256(new Uint8Array([
        ...PEAK,
        ...innerMMRSuperPeak(peeks.slice(0, peeks.length - 1)),
        ...peeks[peeks.length - 1],
    ]));
};

let RecentHistoryItemImpl = class RecentHistoryItemImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        Object.assign(this, config);
    }
    packageHashes() {
        return new IdentitySet([...this.reportedPackages.keys()]);
    }
};
__decorate$1([
    codec$1(HashCodec, "header_hash"),
    __metadata$1("design:type", Object)
], RecentHistoryItemImpl.prototype, "headerHash", void 0);
__decorate$1([
    codec$1(HashCodec, "beefy_root"),
    __metadata$1("design:type", Object)
], RecentHistoryItemImpl.prototype, "accumulationResultMMB", void 0);
__decorate$1([
    codec$1(HashCodec, "state_root"),
    __metadata$1("design:type", Object)
], RecentHistoryItemImpl.prototype, "stateRoot", void 0);
__decorate$1([
    codec$1(IdentityMapCodec(HashCodec, HashCodec, {
        key: "hash",
        value: "exports_root",
    }), "reported"),
    __metadata$1("design:type", IdentityMap)
], RecentHistoryItemImpl.prototype, "reportedPackages", void 0);
RecentHistoryItemImpl = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], RecentHistoryItemImpl);

var RecentHistoryImpl_1;
let RecentHistoryImpl = RecentHistoryImpl_1 = class RecentHistoryImpl extends BaseJamCodecable {
    constructor(elements = []) {
        super();
        this.elements = elements;
    }
    findHeader(headerHash) {
        return this.elements.find((el) => el.headerHash === headerHash);
    }
    /**
     * $(0.7.1 - 4.6 / 7.5)
     * it needs the current merkle root ( or parent stateroot of incoming block)
     */
    toDagger(parentStateRoot) {
        if (this.elements.length === 0) {
            return toDagger(this);
        }
        const toRet = cloneCodecable(this);
        toRet.elements[toRet.elements.length - 1].stateRoot = parentStateRoot;
        return toDagger(toRet);
    }
    allPackageHashes() {
        return this.elements
            .map((el) => el.packageHashes())
            .reduce((a, b) => {
            b.forEach((hash) => a.add(hash));
            return a;
        });
    }
    /**
     * $(0.7.1 - 7.8 / 4.17)
     */
    toPosterior(deps) {
        const toRet = cloneCodecable(this);
        const b = MMRSuperPeak(deps.p_beefyBelt);
        const bold_p = new Map(deps.eg
            .workReports()
            .map((a) => a.avSpec)
            .flat()
            .map((a) => [a.packageHash, a.segmentRoot]));
        toRet.elements.push(new RecentHistoryItemImpl({
            reportedPackages: bold_p,
            headerHash: deps.headerHash,
            stateRoot: new Uint8Array(32).fill(0),
            accumulationResultMMB: b,
        }));
        if (toRet.elements.length > RECENT_HISTORY_LENGTH) {
            toRet.elements = toTagged(toRet.elements.slice(toRet.elements.length - RECENT_HISTORY_LENGTH));
        }
        return toPosterior(toRet);
    }
    static newEmpty() {
        return new RecentHistoryImpl_1([]);
    }
};
__decorate$1([
    lengthDiscriminatedCodec(RecentHistoryItemImpl, SINGLE_ELEMENT_CLASS),
    __metadata$1("design:type", Object)
], RecentHistoryImpl.prototype, "elements", void 0);
RecentHistoryImpl = RecentHistoryImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Array])
], RecentHistoryImpl);

var BetaImpl_1;
/**
 * $(0.7.1 - 7.1 / 7.3)
 */
let BetaImpl = BetaImpl_1 = class BetaImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        if (typeof config !== "undefined") {
            Object.assign(this, config);
        }
    }
    /**
     * Basically a wrapper for `toDagger` on `recentHistory`
     */
    toDagger(parentStateRoot) {
        return toDagger(new BetaImpl_1({
            recentHistory: this.recentHistory.toDagger(parentStateRoot),
            beefyBelt: this.beefyBelt,
        }));
    }
    toPosterior(deps) {
        // $(0.7.1 - 7.6) - calculate bold_s
        const bold_s = deps.p_theta.elements.map((a) => a.toBinary());
        // $(0.7.1 - 7.7) - calculate beefyBelt
        const p_beefyBelt = toPosterior(appendMMR(this.beefyBelt, wellBalancedBinaryMerkleRoot(bold_s, Hashing.keccak256), Hashing.keccak256));
        return toPosterior(new BetaImpl_1({
            beefyBelt: p_beefyBelt,
            recentHistory: (this.recentHistory).toPosterior({
                p_beefyBelt,
                eg: deps.eg,
                headerHash: deps.headerHash,
            }),
        }));
    }
    static newEmpty() {
        return new BetaImpl_1({
            recentHistory: RecentHistoryImpl.newEmpty(),
            beefyBelt: [],
        });
    }
};
__decorate$1([
    codec$1(RecentHistoryImpl, "history"),
    __metadata$1("design:type", RecentHistoryImpl)
], BetaImpl.prototype, "recentHistory", void 0);
__decorate$1([
    jsonCodec(WrapJSONCodec("peeks", ArrayOfJSONCodec(NULLORCodec(HashCodec))), "mmr"),
    binaryCodec(createArrayLengthDiscriminator(new Optional(HashCodec))),
    __metadata$1("design:type", Array)
], BetaImpl.prototype, "beefyBelt", void 0);
BetaImpl = BetaImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], BetaImpl);

let SingleCoreStatisticsImpl = class SingleCoreStatisticsImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        Object.assign(this, config);
    }
};
__decorate$1([
    eIntCodec("da_load"),
    __metadata$1("design:type", Number)
], SingleCoreStatisticsImpl.prototype, "daLoad", void 0);
__decorate$1([
    eIntCodec(),
    __metadata$1("design:type", Number)
], SingleCoreStatisticsImpl.prototype, "popularity", void 0);
__decorate$1([
    eIntCodec("imports"),
    __metadata$1("design:type", Number)
], SingleCoreStatisticsImpl.prototype, "importCount", void 0);
__decorate$1([
    eIntCodec("exports"),
    __metadata$1("design:type", Number)
], SingleCoreStatisticsImpl.prototype, "exportCount", void 0);
__decorate$1([
    eIntCodec("extrinsic_size"),
    __metadata$1("design:type", Number)
], SingleCoreStatisticsImpl.prototype, "extrinsicSize", void 0);
__decorate$1([
    eIntCodec("extrinsic_count"),
    __metadata$1("design:type", Number)
], SingleCoreStatisticsImpl.prototype, "extrinsicCount", void 0);
__decorate$1([
    eIntCodec("bundle_size"),
    __metadata$1("design:type", Number)
], SingleCoreStatisticsImpl.prototype, "bundleSize", void 0);
__decorate$1([
    eBigIntCodec("gas_used"),
    __metadata$1("design:type", BigInt)
], SingleCoreStatisticsImpl.prototype, "gasUsed", void 0);
SingleCoreStatisticsImpl = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], SingleCoreStatisticsImpl);

var CoreStatisticsImpl_1;
let CoreStatisticsImpl = CoreStatisticsImpl_1 = class CoreStatisticsImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        if (typeof config !== "undefined") {
            Object.assign(this, config);
        }
    }
    /**
     * $(0.7.1 - 13.8)
     */
    toPosterior(deps) {
        const toRet = cloneCodecable(this);
        for (let c = 0; c < CORES; c++) {
            toRet.elements[c] = new SingleCoreStatisticsImpl({
                ...R_fn$2(c, deps.bold_I),
                daLoad: D_fn(c, deps.bold_R),
                popularity: deps.ea.nPositiveVotes(c),
                // $(0.7.1 - 13.10) - L
                bundleSize: deps.bold_I
                    .filter((w) => w.core === c)
                    .map((w) => w.avSpec.bundleLength)
                    .reduce((a, b) => a + b, 0),
            });
        }
        return toPosterior(toRet);
    }
    static newEmpty() {
        return new CoreStatisticsImpl_1({
            elements: Array.from({ length: CORES }, () => new SingleCoreStatisticsImpl({
                daLoad: 0,
                popularity: 0,
                importCount: 0,
                exportCount: 0,
                extrinsicSize: 0,
                extrinsicCount: 0,
                bundleSize: 0,
                gasUsed: 0n,
            })),
        });
    }
};
__decorate$1([
    sequenceCodec(CORES, SingleCoreStatisticsImpl, SINGLE_ELEMENT_CLASS),
    __metadata$1("design:type", Object)
], CoreStatisticsImpl.prototype, "elements", void 0);
CoreStatisticsImpl = CoreStatisticsImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], CoreStatisticsImpl);
/**
 * $(0.7.1 - 13.11)
 */
const D_fn = (core, 
/**
 * `bold R`
 * $(0.7.1 - 11.16)
 */
availableReports) => {
    return availableReports.elements
        .filter((w) => w.core === core)
        .map((w) => {
        return (w.avSpec.bundleLength +
            ERASURECODE_SEGMENT_SIZE * Math.ceil((w.avSpec.segmentCount * 65) / 64));
    })
        .reduce((a, b) => a + b, 0);
};
/**
 * $(0.7.1 - 13.9)
 */
const R_fn$2 = (core, 
/**
 * `bold I`
 * @see $(0.7.1 - 11.28)
 */
guaranteedReports) => {
    const filteredReports = guaranteedReports.filter((w) => w.core === core);
    const accumulator = {
        importCount: 0,
        exportCount: 0,
        extrinsicSize: 0,
        extrinsicCount: 0,
        gasUsed: 0n,
    };
    for (const { digests } of filteredReports) {
        for (const digest of digests) {
            accumulator.importCount = ((accumulator.importCount + digest.refineLoad.importCount));
            accumulator.exportCount = ((accumulator.exportCount + digest.refineLoad.exportCount));
            accumulator.extrinsicSize = ((accumulator.extrinsicSize + digest.refineLoad.extrinsicSize));
            accumulator.extrinsicCount = ((accumulator.extrinsicCount + digest.refineLoad.extrinsicCount));
            accumulator.gasUsed = ((accumulator.gasUsed + digest.refineLoad.gasUsed));
        }
    }
    return accumulator;
};

var DeferredTransferImpl_1;
/**
 * `X`
 * $(0.7.1 - 12.14)
 * $(0.7.1 - C.31) | codec
 */
let DeferredTransferImpl = DeferredTransferImpl_1 = class DeferredTransferImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        if (typeof config !== "undefined") {
            Object.assign(this, config);
        }
    }
    static newEmpty() {
        return new DeferredTransferImpl_1({
            source: 0,
            destination: 0,
            amount: 0n,
            memo: (new Uint8Array(TRANSFER_MEMO_SIZE).fill(0)),
            gas: 0n,
        });
    }
};
__decorate$1([
    eSubIntCodec(4),
    __metadata$1("design:type", Number)
], DeferredTransferImpl.prototype, "source", void 0);
__decorate$1([
    eSubIntCodec(4),
    __metadata$1("design:type", Number)
], DeferredTransferImpl.prototype, "destination", void 0);
__decorate$1([
    eSubBigIntCodec(8),
    __metadata$1("design:type", BigInt)
], DeferredTransferImpl.prototype, "amount", void 0);
__decorate$1([
    jsonCodec(BufferJSONCodec()),
    binaryCodec(fixedSizeIdentityCodec(TRANSFER_MEMO_SIZE)),
    __metadata$1("design:type", Object)
], DeferredTransferImpl.prototype, "memo", void 0);
__decorate$1([
    eSubBigIntCodec(8),
    __metadata$1("design:type", BigInt)
], DeferredTransferImpl.prototype, "gas", void 0);
DeferredTransferImpl = DeferredTransferImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], DeferredTransferImpl);

class PVMExitReasonImpl {
    constructor(config) {
        Object.assign(this, config);
    }
    isHostCall() {
        return this.reason === IrregularPVMExitReason.HostCall;
    }
    isPageFault() {
        return this.reason === IrregularPVMExitReason.PageFault;
    }
    isPanic() {
        return this.reason === RegularPVMExitReason.Panic;
    }
    isHalt() {
        return this.reason === RegularPVMExitReason.Halt;
    }
    isOutOfGas() {
        return this.reason === RegularPVMExitReason.OutOfGas;
    }
    toString() {
        if (this.isHostCall()) {
            return `HostCall[${this.opCode}]`;
        }
        else if (this.isOutOfGas()) {
            return "OutOfGas";
        }
        else if (this.isHalt()) {
            return "Halt";
        }
        else if (this.isPanic()) {
            return "Panic";
        }
        else if (this.isPageFault()) {
            return `PageFault[x${this.address.toString(16)}][${this.address}]`;
        }
        return "Unknon Exit Reason";
    }
    static panic() {
        return new PVMExitReasonImpl({
            reason: RegularPVMExitReason.Panic,
        });
    }
    static halt() {
        return new PVMExitReasonImpl({
            reason: RegularPVMExitReason.Halt,
        });
    }
    static outOfGas() {
        return new PVMExitReasonImpl({
            reason: RegularPVMExitReason.OutOfGas,
        });
    }
    static hostCall(opCode) {
        return new PVMExitReasonImpl({
            reason: IrregularPVMExitReason.HostCall,
            opCode: opCode,
        });
    }
    static pageFault(address) {
        return new PVMExitReasonImpl({
            reason: IrregularPVMExitReason.PageFault,
            address: address,
        });
    }
}

//import assert from "node:assert";
const X_fn = (n) => (x) => x + (x / 2n ** (8n * n - 1n)) * (2n ** 64n - 2n ** (8n * n));
const X_4 = X_fn(4n);
const X_8 = X_fn(8n);
/**
 * $(0.7.1 - A.33)
 */
const smod = (a, b) => {
    if (b === 0n) {
        return a;
    }
    const asign = a < 0n ? -1n : 1n;
    // Math.abs on bigint
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    return asign * (a % b);
};
const TRAP_COST = 1n;
const IxMod = {
    ip: (value) => ({
        type: "ip",
        data: toTagged(value),
    }),
    hostCall: (opCode) => ({
        type: "exit",
        data: PVMExitReasonImpl.hostCall(opCode),
    }),
    pageFault: (location, originalPointer) => [
        IxMod.gas(TRAP_COST), // trap
        IxMod.ip(originalPointer), // override any other skip
        { type: "exit", data: PVMExitReasonImpl.pageFault(location) },
    ],
    skip: (ip, amont) => ({
        type: "ip",
        data: toTagged(ip + amont),
    }),
    gas: (value) => ({
        type: "gas",
        data: value,
    }),
    reg: (register, value) => {
        // assert(register >= 0 && register < 13);
        return {
            type: "register",
            data: {
                index: register,
                value: value,
            },
        };
    },
    w7: (value) => IxMod.reg(7, BigInt(value)),
    w8: (value) => IxMod.reg(8, BigInt(value)),
    memory: (from, data) => ({
        type: "memory",
        data: {
            from: Number(from),
            data,
        },
    }),
    outOfGas: () => ({
        type: "exit",
        data: PVMExitReasonImpl.outOfGas(),
    }),
    halt: () => ({
        type: "exit",
        data: PVMExitReasonImpl.halt(),
    }),
    panic: () => ({
        type: "exit",
        data: PVMExitReasonImpl.panic(),
    }),
    obj: (data) => ({
        type: "object",
        data,
    }),
};

/**
 * Z fn
 * exported cause it's being used to check/produce `Hw` in Header
 * $(0.7.1 - 6.25)
 */
const outsideInSequencer = (t) => {
    const toRet = [];
    for (let i = 0; i < EPOCH_LENGTH / 2; i++) {
        toRet.push(t[i]);
        toRet.push(t[EPOCH_LENGTH - i - 1]);
    }
    return toRet;
};
const goFS = process.env.DEBUG_FS == "true";
if (goFS && fs.existsSync("/tmp/trace.txt")) {
    fs.unlinkSync("/tmp/trace.txt");
}
const log = (_str, debug) => {
    if (!debug) {
        return;
    }
    let str;
    if (typeof _str === "string") {
        str = _str;
    }
    else {
        if ("toJSON" in _str && typeof _str.toJSON == "function") {
            str = _str.toJSON();
        }
        else {
            str = JSON.stringify(_str, (_key, value) => {
                if (typeof value === "bigint") {
                    return value.toString();
                }
                if (value instanceof Uint8Array) {
                    // eslint-disable-next-line
                    return xBytesCodec(value.length).toJSON(value);
                }
                if (Buffer.isBuffer(value)) {
                    // eslint-disable-next-line
                    return xBytesCodec(value.length).toJSON(value);
                }
                if (typeof value.toJSON == "function") {
                    return value.toJSON();
                }
                return value;
            });
        }
    }
    if (goFS) {
        fs.appendFileSync(`/tmp/trace.txt`, str + "\n");
    }
    console.log(str);
};

const FnsDb = {
    byCode: new Map(),
    byIdentifier: new Map(),
};
/**
 * register an instruction in the instruction database
 * @param conf - the configuration object
 */
const regFn = (conf) => {
    if (FnsDb.byCode.has(toTagged(conf.fn.opCode))) {
        throw new Error(`duplicate opCode ${conf.fn.opCode} ${conf.fn.identifier}`);
    }
    if (FnsDb.byIdentifier.has(conf.fn.identifier)) {
        throw new Error(`duplicate identifier ${conf.fn.identifier}`);
    }
    const newfn = (ctx, args) => {
        // $(0.7.1 - B.17 / B.19 / B.21)
        const gas = typeof conf.fn.gasCost === "function"
            ? conf.fn.gasCost(ctx, args)
            : conf.fn.gasCost;
        if (gas > ctx.gas) {
            // $(0.7.1 - B.18 / B.20 / B.22) | first bracket
            return [IxMod.outOfGas()];
        }
        return [IxMod.gas(gas), ...conf.fn.execute(ctx, args)];
    };
    FnsDb.byCode.set(conf.fn.opCode, conf.fn.identifier);
    FnsDb.byIdentifier.set(conf.fn.identifier, newfn);
    return newfn;
};
const HostFn = (opCode, gasCost = 10n) => {
    return (_target, propertyKey, descriptor) => {
        const fn = regFn({
            fn: {
                opCode: opCode,
                identifier: propertyKey,
                execute: descriptor.value,
                gasCost,
            },
        });
        descriptor.value = function (ctx, args) {
            log(`HostCall[${propertyKey}]`, process.env.DEBUG_STEPS == "true");
            // eslint-disable-next-line
            const res = fn.call(this, ctx, args);
            // log(res);
            return res;
        };
        return descriptor;
    };
};

/**
 * Codec defined for deblob
 * $(0.7.1 - A.2)
 */
const PVMProgramCodec = {
    encode(value, bytes) {
        if (value.k.length !== value.c.length) {
            throw new Error("k and c must have the same length");
        }
        let offset = 0;
        offset += E.encode(BigInt(value.j.length), bytes.subarray(offset));
        // E_1(z)
        offset += E_1.encode(BigInt(value.z), bytes.subarray(offset, offset + 1));
        // E(|c|)
        offset += E.encode(BigInt(value.c.length), bytes.subarray(offset));
        // E_z(j)
        for (let i = 0; i < value.j.length; i++) {
            offset += E.encode(BigInt(value.j[i]), bytes.subarray(offset, offset + value.z));
        }
        // E(c)
        bytes.set(value.c, offset);
        offset += value.c.length;
        // E(k)
        offset += BitSequenceCodec(value.k.length).encode(value.k, bytes.subarray(offset));
        return offset;
    },
    decode(bytes) {
        let offset = 0;
        const obj = {};
        const jCard = E.decode(bytes.subarray(offset));
        offset += jCard.readBytes;
        // E_1(z)
        const z = E_1.decode(bytes.subarray(offset, offset + 1));
        offset += z.readBytes;
        obj.z = Number(z.value);
        // E(|c|)
        const cCard = E.decode(bytes.subarray(offset));
        offset += cCard.readBytes;
        // E_z(j)
        obj.j = [];
        for (let i = 0; i < jCard.value; i++) {
            const item = E_sub(obj.z).decode(bytes.subarray(offset, offset + obj.z));
            obj.j.push(Number(item.value));
            offset += item.readBytes; // should be z
        }
        // E(c)
        obj.c = bytes.subarray(offset, offset + Number(cCard.value));
        offset += Number(cCard.value);
        // E(k)
        const elements = Math.ceil(Number(cCard.value) / 8);
        obj.k = BitSequenceCodec(Number(cCard.value)).decode(bytes.subarray(offset, offset + elements)).value;
        offset += elements;
        assert(offset <= bytes.length, "deblob couldnt decode properly");
        return { value: obj, readBytes: offset };
    },
    encodedSize(value) {
        return (E.encodedSize(BigInt(value.j.length)) +
            1 + // E_1(z)
            E.encodedSize(BigInt(value.c.length)) +
            value.c.length +
            value.j.length * value.z + // E_z(j)
            Math.ceil(value.k.length / 8));
    },
};

/**
 * `δ` or delta in the graypaper
 *
 * It's a dictionary of service accounts
 * $(0.7.1 - 9.2)
 */
class DeltaImpl {
    constructor(el) {
        this.elements = el ?? new Map();
    }
    services() {
        return new Set(this.elements.keys());
    }
    has(key) {
        return this.elements.has(key);
    }
    get(key) {
        return this.elements.get(key);
    }
    set(key, value) {
        this.elements.set(key, value);
        return this;
    }
    clone() {
        const clone = new DeltaImpl();
        clone.elements = new Map([...this.elements].map(([si, s]) => [si, s.clone()]));
        return clone;
    }
    delete(key) {
        return this.elements.delete(key);
    }
    /**
     * $(0.7.1 - 12.21) - \fnprovide
     * also `P()` fn
     * @returns a new DeltaImpl with the preimages integrated
     */
    preimageIntegration(provisions, p_tau) {
        const newD = this.clone();
        for (const { serviceId, blob } of provisions) {
            const phash = Hashing.blake2b(blob);
            const plength = toTagged(blob.length);
            if (this.get(serviceId)?.requests.get(phash, plength)?.length === 0) {
                newD
                    .get(serviceId)
                    .requests.set(phash, plength, toTagged([p_tau]));
                newD.get(serviceId).preimages.set(phash, blob);
            }
        }
        return newD;
    }
    /**
     * $(0.7.0 - 12.30)
     */
    toDoubleDagger(deps) {
        const dd_delta = new DeltaImpl();
        for (const [serviceIndex, tRes] of deps.invokedTransfers) {
            const a = tRes.serviceAccount.clone();
            if (deps.accumulationStatistics.has(serviceIndex)) {
                a.lastAcc = deps.p_tau;
            }
            dd_delta.set(serviceIndex, a);
        }
        return toDoubleDagger(toDagger(dd_delta));
    }
    /**
     * $(0.7.1 - 12.36)
     */
    toPosterior(deps) {
        const p = deps.ep.elements.filter((ep) => this.get(ep.requester).isPreimageSolicitedButNotYetProvided(Hashing.blake2b(ep.blob), ep.blob.length));
        const result = this.clone();
        for (const { requester, blob } of p) {
            const x = result.get(requester);
            x.preimages = x.preimages.clone();
            const hash = Hashing.blake2b(blob);
            x.preimages.set(hash, blob);
            x.requests.set(hash, toTagged(blob.length), toTagged([deps.p_tau]));
        }
        return toPosterior(result);
    }
    static union(a, b) {
        return new DeltaImpl(new Map([...a.elements, ...b.elements]));
    }
    static newEmpty() {
        return new DeltaImpl(new Map());
    }
}

var PrivilegedServicesImpl_1;
/**
 * Priv services impl
 * Codec is following the C(12) in $(0.7.1 - D.2)
 */
let PrivilegedServicesImpl = PrivilegedServicesImpl_1 = class PrivilegedServicesImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        if (typeof config !== "undefined") {
            Object.assign(this, config);
        }
    }
    static newEmpty() {
        return new PrivilegedServicesImpl_1({
            manager: 0,
            assigners: (Array.from({ length: CORES }, () => 0)),
            delegator: 0,
            alwaysAccers: new Map(),
        });
    }
};
__decorate$1([
    eSubIntCodec(4, "bless"),
    __metadata$1("design:type", Number)
], PrivilegedServicesImpl.prototype, "manager", void 0);
__decorate$1([
    jsonCodec(ArrayOfJSONCodec(NumberJSONCodec()), "assign"),
    binaryCodec(createSequenceCodec(CORES, E_sub_int(4))),
    __metadata$1("design:type", Object)
], PrivilegedServicesImpl.prototype, "assigners", void 0);
__decorate$1([
    eSubIntCodec(4, "designate"),
    __metadata$1("design:type", Number)
], PrivilegedServicesImpl.prototype, "delegator", void 0);
__decorate$1([
    jsonCodec(MapJSONCodec({ key: "service", value: "gas" }, NumberJSONCodec(), NumberJSONCodec()), "always_acc"),
    binaryCodec(buildGenericKeyValueCodec(E_sub_int(4), E_sub(8), (a, b) => a - b)),
    __metadata$1("design:type", Map)
], PrivilegedServicesImpl.prototype, "alwaysAccers", void 0);
PrivilegedServicesImpl = PrivilegedServicesImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], PrivilegedServicesImpl);

/**
 * `U` set in graypaper $\operandtuple$
 * $(0.7.1 - 12.13)
 * $(0.7.1 - C.32) | codec
 */
let PVMAccumulationOpImpl = class PVMAccumulationOpImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        if (typeof config !== "undefined") {
            Object.assign(this, config);
        }
    }
};
__decorate$1([
    codec$1(HashCodec),
    __metadata$1("design:type", Object)
], PVMAccumulationOpImpl.prototype, "packageHash", void 0);
__decorate$1([
    codec$1(HashCodec),
    __metadata$1("design:type", Object)
], PVMAccumulationOpImpl.prototype, "segmentRoot", void 0);
__decorate$1([
    codec$1(HashCodec),
    __metadata$1("design:type", Object)
], PVMAccumulationOpImpl.prototype, "authorizerHash", void 0);
__decorate$1([
    codec$1(HashCodec),
    __metadata$1("design:type", Object)
], PVMAccumulationOpImpl.prototype, "payloadHash", void 0);
__decorate$1([
    eBigIntCodec(),
    __metadata$1("design:type", BigInt)
], PVMAccumulationOpImpl.prototype, "gasLimit", void 0);
__decorate$1([
    codec$1(WorkOutputImpl),
    __metadata$1("design:type", WorkOutputImpl)
], PVMAccumulationOpImpl.prototype, "result", void 0);
__decorate$1([
    codec$1(LengthDiscrimantedIdentityCodec),
    __metadata$1("design:type", Uint8Array)
], PVMAccumulationOpImpl.prototype, "authTrace", void 0);
PVMAccumulationOpImpl = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], PVMAccumulationOpImpl);

/**
 * `S` in the graypaper
 * $(0.7.1 - 12.16)
 */
class PVMAccumulationStateImpl {
    constructor(config) {
        Object.assign(this, config);
    }
    clone() {
        return new PVMAccumulationStateImpl({
            accounts: this.accounts.clone(),
            stagingSet: cloneCodecable(this.stagingSet),
            authQueue: cloneCodecable(this.authQueue),
            manager: this.manager,
            assigners: toTagged([...this.assigners]),
            delegator: this.delegator,
            alwaysAccers: new Map(this.alwaysAccers),
        });
    }
}

class PVMProgramExecutionContextImpl {
    constructor(config) {
        Object.assign(this, config);
    }
    clone() {
        const toRet = new PVMProgramExecutionContextImpl(this);
        toRet.registers = cloneCodecable(this.registers);
        toRet.memory = this.memory.clone();
        return toRet;
    }
}

var _PVMMemory_instances, _PVMMemory_innerMemoryContent, _PVMMemory_locationFromAddress, _PVMMemory_pagesInRange, _PVMMemory_getPageMemory, _PVMMemory_setBytes, _PVMMemory_getBytes;
class PVMMemory {
    constructor(initialMemory, acl, heap) {
        _PVMMemory_instances.add(this);
        this.acl = acl;
        this.heap = heap;
        _PVMMemory_innerMemoryContent.set(this, new Map());
        // if initialMemory is a map, we can directly use it
        if (initialMemory instanceof Map) {
            __classPrivateFieldSet(this, _PVMMemory_innerMemoryContent, initialMemory);
        }
        else {
            __classPrivateFieldSet(this, _PVMMemory_innerMemoryContent, new Map());
            for (const page of acl.keys()) {
                __classPrivateFieldGet(this, _PVMMemory_innerMemoryContent, "f").set(page, new Uint8Array(Zp).fill(0));
            }
            for (const { at, content } of initialMemory) {
                __classPrivateFieldGet(this, _PVMMemory_instances, "m", _PVMMemory_setBytes).call(this, at, content);
            }
        }
    }
    changeAcl(page, kind) {
        if (!this.acl.has(page)) {
            assert$1(kind === PVMMemoryAccessKind.Read || kind == PVMMemoryAccessKind.Write);
            this.acl.set(page, kind);
        }
        else if (kind === PVMMemoryAccessKind.Null) {
            this.acl.delete(page);
        }
        else {
            this.acl.set(page, kind);
        }
        return this;
    }
    setBytes(address, bytes) {
        assert$1(this.canWrite(address, bytes.length));
        __classPrivateFieldGet(this, _PVMMemory_instances, "m", _PVMMemory_setBytes).call(this, address, bytes);
        //log(
        //  `setBytes[${address.toString(16)}] = ${Buffer.from(bytes).toString("hex")} - l:${bytes.length}`,
        //  true,
        //);
        return this;
    }
    getBytes(address, length) {
        assert$1(this.canRead(address, length));
        const r = __classPrivateFieldGet(this, _PVMMemory_instances, "m", _PVMMemory_getBytes).call(this, address, length);
        return r;
    }
    canRead(address, length) {
        if (typeof address === "bigint") {
            if (address >= 2n ** 32n) {
                return false;
            }
            address = Number(address);
        }
        return this.firstUnreadable(address, length) === undefined;
    }
    firstUnreadable(address, length) {
        const pages = __classPrivateFieldGet(this, _PVMMemory_instances, "m", _PVMMemory_pagesInRange).call(this, address, length);
        for (const page of pages) {
            if (!this.acl.has(page)) {
                return (page * Zp);
            }
        }
    }
    canWrite(address, length) {
        if (typeof address === "bigint") {
            if (address >= 2n ** 32n) {
                return false;
            }
            address = Number(address);
        }
        return this.firstUnwriteable(address, length) === undefined;
    }
    firstUnwriteable(address, length) {
        const pages = __classPrivateFieldGet(this, _PVMMemory_instances, "m", _PVMMemory_pagesInRange).call(this, address, length);
        for (const page of pages) {
            if (!this.acl.has(page)) {
                return (page * Zp);
            }
            const kind = this.acl.get(page);
            if (kind === PVMMemoryAccessKind.Read) {
                return (page * Zp);
            }
        }
    }
    // TODO: rename to sbrk properly
    firstWriteableInHeap(size) {
        if (this.heap.pointer + size >= this.heap.end) {
            for (let i = 0; i < Math.ceil(size / Zp); i++) {
                // allocate one page
                //  log("allocating new page in heap", true);
                this.acl.set(this.heap.end / Zp + i, PVMMemoryAccessKind.Write);
                __classPrivateFieldGet(this, _PVMMemory_innerMemoryContent, "f").set(this.heap.end / Zp + i, new Uint8Array(Zp));
            }
            //const prevEnd = this.heap.end;
            this.heap.end = (this.heap.end + Math.ceil(size / Zp) * Zp);
            //log(
            //  `New heap end: 0x${this.heap.end.toString(16)} - ${this.heap.end} - from 0x${prevEnd.toString(16)} - ${prevEnd}`,
            //  true,
            //);
        }
        const oldPointer = this.heap.pointer;
        this.heap.pointer = (oldPointer + size);
        return oldPointer;
    }
    clone() {
        return new PVMMemory(new Map(__classPrivateFieldGet(this, _PVMMemory_innerMemoryContent, "f").entries()), // we crete a new identical map the setBytes will effectively clone the memory only if changes in the new instance.
        new Map(this.acl.entries()), { ...this.heap });
    }
    toString() {
        let str = "";
        for (const [page, memory] of __classPrivateFieldGet(this, _PVMMemory_innerMemoryContent, "f").entries()) {
            str += `Page ${page}|0x${(page * Zp).toString(16)}: ${Buffer.from(memory).toString("hex")}\n`;
        }
        return str;
    }
}
_PVMMemory_innerMemoryContent = new WeakMap(), _PVMMemory_instances = new WeakSet(), _PVMMemory_locationFromAddress = function _PVMMemory_locationFromAddress(address) {
    return {
        page: Math.floor(Number(address) / Zp),
        offset: Number(address) % Zp,
    };
}, _PVMMemory_pagesInRange = function _PVMMemory_pagesInRange(address, length) {
    if (length === 0) {
        return [];
    }
    const { page: startPage, offset } = __classPrivateFieldGet(this, _PVMMemory_instances, "m", _PVMMemory_locationFromAddress).call(this, address);
    const toRet = [startPage];
    let remaining = length - (Zp - offset);
    while (remaining > 0) {
        // we modulo on the max page number which is total ram / page size
        toRet.push((toRet[toRet.length - 1] + 1) % (2 ** 32 / Zp));
        remaining -= Zp;
    }
    return toRet;
}, _PVMMemory_getPageMemory = function _PVMMemory_getPageMemory(page) {
    const memory = __classPrivateFieldGet(this, _PVMMemory_innerMemoryContent, "f").get(page);
    // assert(
    //   memory,
    //   `Page ${page}|0x${(page * Zp).toString(16)} is not allocated`,
    // );
    return memory;
}, _PVMMemory_setBytes = function _PVMMemory_setBytes(address, bytes) {
    if (bytes.length === 0) {
        return;
    }
    const { page, offset } = __classPrivateFieldGet(this, _PVMMemory_instances, "m", _PVMMemory_locationFromAddress).call(this, address);
    const memory = __classPrivateFieldGet(this, _PVMMemory_instances, "m", _PVMMemory_getPageMemory).call(this, page);
    const bytesToWrite = Math.min(bytes.length, Zp - offset);
    // we replace current uint8array with a new copy so that old references to this location
    // in memory are still kept intact and unchanged in case error happens
    // const newMemory = new Uint8Array(Zp);
    // newMemory.set(memory, 0);
    // newMemory.set(bytes.subarray(0, bytesToWrite), offset);
    memory.set(bytes.subarray(0, bytesToWrite), offset);
    __classPrivateFieldGet(this, _PVMMemory_innerMemoryContent, "f").set(page, memory);
    // if offset + bytes.length exceeds page we should call setbytes again
    if (bytesToWrite < bytes.length) {
        __classPrivateFieldGet(this, _PVMMemory_instances, "m", _PVMMemory_setBytes).call(this, toSafeMemoryAddress(BigInt(address) + BigInt(bytesToWrite)), bytes.subarray(bytesToWrite));
    }
}, _PVMMemory_getBytes = function _PVMMemory_getBytes(address, length) {
    if (length === 0) {
        return new Uint8Array(0);
    }
    const { page, offset } = __classPrivateFieldGet(this, _PVMMemory_instances, "m", _PVMMemory_locationFromAddress).call(this, address);
    const memory = __classPrivateFieldGet(this, _PVMMemory_instances, "m", _PVMMemory_getPageMemory).call(this, page);
    const bytesToRead = Math.min(length, Zp - offset);
    const chunk = memory.subarray(offset, offset + bytesToRead);
    // log(
    //   `getBytes[${address.toString(16)}] l:${length} v:${Buffer.from(chunk.slice()).toString("hex")}`,
    //   true,
    // );
    if (bytesToRead !== length) {
        const sub = __classPrivateFieldGet(this, _PVMMemory_instances, "m", _PVMMemory_getBytes).call(this, toSafeMemoryAddress(BigInt(address) + BigInt(bytesToRead)), length - bytesToRead);
        const toRet = new Uint8Array(chunk.length + sub.length);
        toRet.set(chunk);
        toRet.set(sub, chunk.length);
        return toRet;
    }
    return chunk.slice();
};
const toSafeMemoryAddress = (rawAddr) => {
    return Number(BigInt(rawAddr) % 2n ** 32n);
};

let PVMRegisterImpl = class PVMRegisterImpl extends BaseJamCodecable {
    constructor(value) {
        super();
        this.value = value ?? toTagged(0n);
    }
    u32() {
        return Number(this.value);
    }
    fitsInU32() {
        return this.value < 2n ** 32n;
    }
    u64() {
        return this.value;
    }
    toSafeMemoryAddress() {
        return toSafeMemoryAddress(this.value);
    }
    [Symbol.toPrimitive](hint) {
        if (hint === "number") {
            return Number(this.value);
        }
        return `${this.value}`;
    }
};
__decorate$1([
    eSubBigIntCodec(8, SINGLE_ELEMENT_CLASS),
    __metadata$1("design:type", BigInt)
], PVMRegisterImpl.prototype, "value", void 0);
PVMRegisterImpl = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [BigInt])
], PVMRegisterImpl);

let PVMRegistersImpl = class PVMRegistersImpl extends BaseJamCodecable {
    constructor(elements) {
        super();
        if (typeof elements !== "undefined") {
            this.elements = elements;
        }
        else {
            this.elements = toTagged(new Array(13)
                .fill(null)
                .map(() => new PVMRegisterImpl(0n)));
        }
    }
    slice(start, end) {
        return this.elements.slice(start, end);
    }
    w0() {
        return this.elements[0];
    }
    w1() {
        return this.elements[1];
    }
    w2() {
        return this.elements[2];
    }
    w3() {
        return this.elements[3];
    }
    w4() {
        return this.elements[4];
    }
    w5() {
        return this.elements[5];
    }
    w6() {
        return this.elements[6];
    }
    w7() {
        return this.elements[7];
    }
    w8() {
        return this.elements[8];
    }
    w9() {
        return this.elements[9];
    }
    w10() {
        return this.elements[10];
    }
    w11() {
        return this.elements[11];
    }
    w12() {
        return this.elements[12];
    }
};
__decorate$1([
    sequenceCodec(13, PVMRegisterImpl, SINGLE_ELEMENT_CLASS),
    __metadata$1("design:type", Object)
], PVMRegistersImpl.prototype, "elements", void 0);
PVMRegistersImpl = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], PVMRegistersImpl);

/**
 * `L` in the graypaper
 * $(0.7.1 - B.7)
 *
 */
class PVMResultContextImpl {
    constructor(config) {
        Object.assign(this, config);
    }
    /**
     * $(0.7.1 - B.8)
     */
    bold_s() {
        return this.state.accounts.get(this.id);
    }
    clone() {
        return new PVMResultContextImpl({
            id: this.id,
            state: this.state.clone(),
            nextFreeID: this.nextFreeID,
            transfers: cloneCodecable(this.transfers),
            yield: this.yield,
            provisions: this.provisions.map((p) => ({
                serviceId: p.serviceId,
                blob: p.blob.slice(), // Clone the Uint8Array
            })),
        });
    }
}

/**
 * `C` in graypaper
 * $(0.7.1 - D.1)
 */
const stateKey = (i, _s) => {
    if (_s instanceof Uint8Array) {
        const h = _s;
        const a = Hashing.blake2b(h);
        const s = i;
        const n = encodeWithCodec(E_4, BigInt(s));
        return new Uint8Array([
            n[0],
            a[0],
            n[1],
            a[1],
            n[2],
            a[2],
            n[3],
            a[3],
            ...a.subarray(4, 27), // ends at [26]
        ]);
    }
    if (typeof _s === "number") {
        // its ServiceIndex
        const n = encodeWithCodec(E_4, BigInt(_s));
        return new Uint8Array([
            i,
            n[0],
            0,
            n[1],
            0,
            n[2],
            0,
            n[3],
            ...new Array(31 - 4 - 4).fill(0),
        ]);
    }
    return new Uint8Array([i, ...new Array(30).fill(0)]);
};

var _a;
class SafeMap {
    constructor(entries) {
        this.internalMap = new Map();
        this.keyLookupMap = new Map();
        this[_a] = "SafeMap";
        if (entries) {
            for (const [key, value] of entries) {
                this.set(key, value);
            }
        }
    }
    setSafeKeyProvider(prov) {
        this.safeKeyProvider = prov;
    }
    getInternalKey(key) {
        if (isSafeKey(key)) {
            return key;
        }
        if (this.safeKeyProvider) {
            return this.safeKeyProvider(key);
        }
        // key might be SafeKeyable
        if (isSafeKeyable(key)) {
            return key.safeKey();
        }
        throw new Error("cannot convert key to SafeKey did you set a provider or is key SafeKeyable?");
    }
    lookupKey(key) {
        if (this.keyLookupMap.has(key)) {
            return this.keyLookupMap.get(key);
        }
        return key;
    }
    set(key, value) {
        const internalKey = this.getInternalKey(key);
        this.internalMap.set(internalKey, value);
        if (!isSafeKey(key)) {
            this.keyLookupMap.set(internalKey, key);
        }
        return this;
    }
    get(key) {
        const internalKey = this.getInternalKey(key);
        return this.internalMap.get(internalKey);
    }
    has(key) {
        const internalKey = this.getInternalKey(key);
        return this.internalMap.has(internalKey);
    }
    delete(key) {
        const internalKey = this.getInternalKey(key);
        const toRet = this.internalMap.delete(internalKey);
        if (!isSafeKey(key)) {
            return this.keyLookupMap.delete(internalKey) && toRet;
        }
        return toRet;
    }
    clear() {
        this.internalMap.clear();
        this.keyLookupMap.clear();
    }
    get size() {
        return this.internalMap.size;
    }
    keys() {
        return [...this.internalMap.keys()].map((k) => this.lookupKey(k)).values();
    }
    values() {
        return this.internalMap.values();
    }
    entries() {
        return [...this.internalMap.entries()]
            .map(([k, v]) => [this.lookupKey(k), v])
            .values();
    }
    forEach(callbackfn, thisArg) {
        this.internalMap.forEach((value, key) => {
            callbackfn.call(thisArg, value, this.lookupKey(key), this);
        });
    }
    [(_a = Symbol.toStringTag, Symbol.iterator)]() {
        return this.entries();
    }
}

var DisputesVerdicts_1;
let DisputeVerdictJudgementImpl = class DisputeVerdictJudgementImpl extends BaseJamCodecable {
    isSignatureValid(deps) {
        const validatorPubKey = deps.validatorSet.at(this.index).ed25519;
        let message;
        if (this.vote) {
            message = new Uint8Array([...JAM_VALID, ...deps.target]);
        }
        else {
            message = new Uint8Array([...JAM_INVALID, ...deps.target]);
        }
        const signatureVerified = Ed25519.verifySignature(this.signature, validatorPubKey, message);
        if (!signatureVerified) {
            return false;
        }
        return true;
    }
    checkValidity(deps) {
        if (this.index >= NUMBER_OF_VALIDATORS) {
            return err(DisputesVerdictError.INVALID_JUDGEMENT_INDEX);
        }
        if (!this.isSignatureValid(deps)) {
            return err(DisputesVerdictError.JUDGEMENT_SIGNATURE_WRONG);
        }
        return ok(toTagged(this));
    }
};
__decorate$1([
    booleanCodec(),
    __metadata$1("design:type", Boolean)
], DisputeVerdictJudgementImpl.prototype, "vote", void 0);
__decorate$1([
    eSubIntCodec(2),
    __metadata$1("design:type", Number)
], DisputeVerdictJudgementImpl.prototype, "index", void 0);
__decorate$1([
    codec$1(xBytesCodec(64)),
    __metadata$1("design:type", Object)
], DisputeVerdictJudgementImpl.prototype, "signature", void 0);
DisputeVerdictJudgementImpl = __decorate$1([
    JamCodecable()
], DisputeVerdictJudgementImpl);
let DisputeVerdictImpl = class DisputeVerdictImpl extends BaseJamCodecable {
    checkValidity(deps) {
        // $(0.7.1 - 10.2)
        if (this.judgements.length !== MINIMUM_VALIDATORS) {
            return err(DisputesVerdictError.JUDGEMENTS_LENGTH);
        }
        if (this.age !== deps.tau.epochIndex() &&
            this.age !== deps.tau.epochIndex() - 1) {
            return err(DisputesVerdictError.EPOCH_INDEX_WRONG);
        }
        if (this.judgements.length !== MINIMUM_VALIDATORS) {
            return err(DisputesVerdictError.JUDGEMENTS_LENGTH_WRONG);
        }
        // $(0.7.1 - 10.3)
        const validatorSet = this.age === deps.tau.epochIndex() ? deps.kappa : deps.lambda;
        for (const judgement of this.judgements) {
            if (!judgement.isSignatureValid({
                target: this.target,
                validatorSet,
            })) {
                return err(DisputesVerdictError.JUDGEMENT_SIGNATURE_WRONG);
            }
        }
        // ensure verdict report hashes are not in psi_g or psi_b or psi_w
        // aka not in the set of work reports that were judged to be valid, bad or wonky already
        // $(0.7.1 - 10.9)
        if (deps.disputesState.good.has(this.target)) {
            return err(DisputesVerdictError.VERDICTS_IN_PSI_G);
        }
        if (deps.disputesState.bad.has(this.target)) {
            return err(DisputesVerdictError.VERDICTS_IN_PSI_B);
        }
        if (deps.disputesState.wonky.has(this.target)) {
            return err(DisputesVerdictError.VERDICTS_IN_PSI_W);
        }
        // ensure judgements are ordered by validatorIndex and no duplicates
        // $(0.7.1 - 10.10)
        for (let i = 1; i < this.judgements.length; i++) {
            if (this.judgements[i - 1].index >= this.judgements[i].index) {
                return err(DisputesVerdictError.JUDGEMENTS_NOT_ORDERED);
            }
        }
        // we do check if the judgements are either 0, 1/3 or 2/3+1
        // $(0.7.1 - 10.11)
        const nVotes = this.judgements.reduceRight((a, b) => a + (b.vote ? 1 : 0), 0);
        if (nVotes !== 0 &&
            nVotes !== Math.floor(NUMBER_OF_VALIDATORS / 3) &&
            nVotes !== MINIMUM_VALIDATORS) {
            return err(DisputesVerdictError.JUDGEMENTS_WRONG);
        }
        return ok(toTagged(this));
    }
};
__decorate$1([
    codec$1(HashCodec),
    __metadata$1("design:type", Object)
], DisputeVerdictImpl.prototype, "target", void 0);
__decorate$1([
    eSubIntCodec(4),
    __metadata$1("design:type", Object)
], DisputeVerdictImpl.prototype, "age", void 0);
__decorate$1([
    sequenceCodec(MINIMUM_VALIDATORS, DisputeVerdictJudgementImpl, "votes"),
    __metadata$1("design:type", Object)
], DisputeVerdictImpl.prototype, "judgements", void 0);
DisputeVerdictImpl = __decorate$1([
    JamCodecable()
], DisputeVerdictImpl);
let DisputesVerdicts = DisputesVerdicts_1 = class DisputesVerdicts extends BaseJamCodecable {
    constructor(elements = []) {
        super();
        this.elements = elements;
    }
    votes() {
        const bold_v = this.elements.map((verdict) => {
            const numericVotes = verdict.judgements.reduce((acc, curr) => acc + (curr.vote ? 1 : 0), 0);
            return {
                reportHash: verdict.target,
                votes: numericVotes === 0
                    ? VerdictVoteKind.ZERO
                    : numericVotes === MINIMUM_VALIDATORS
                        ? VerdictVoteKind.TWO_THIRD_PLUS_ONE
                        : numericVotes === Math.floor(NUMBER_OF_VALIDATORS / 3)
                            ? VerdictVoteKind.ONE_THIRD
                            : numericVotes,
            };
        });
        return bold_v;
    }
    checkValidity(deps) {
        // enforce verdicts are ordered and not duplicated by report hash
        // $(0.7.1 - 10.7)
        for (let i = 1; i < this.elements.length; i++) {
            const [prev, curr] = [this.elements[i - 1], this.elements[i]];
            if (compareUint8Arrays(prev.target, curr.target) >= 0) {
                return err(DisputesVerdictError.VERDICTS_MUST_BE_ORDERED_UNIQUE_BY_HASH);
            }
        }
        // check single verdicts validity
        for (const verdict of this.elements) {
            const [vErr] = verdict.checkValidity(deps).safeRet();
            if (typeof vErr !== "undefined") {
                return err(vErr);
            }
        }
        return ok(toTagged(this));
    }
    static empty() {
        return new DisputesVerdicts_1([]);
    }
};
__decorate$1([
    lengthDiscriminatedCodec(DisputeVerdictImpl, SINGLE_ELEMENT_CLASS),
    __metadata$1("design:type", Array)
], DisputesVerdicts.prototype, "elements", void 0);
DisputesVerdicts = DisputesVerdicts_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Array])
], DisputesVerdicts);
var VerdictVoteKind;
(function (VerdictVoteKind) {
    VerdictVoteKind["ZERO"] = "zero";
    VerdictVoteKind["ONE_THIRD"] = "one-third";
    VerdictVoteKind["TWO_THIRD_PLUS_ONE"] = "two-third-plus-one";
})(VerdictVoteKind || (VerdictVoteKind = {}));
var DisputesVerdictError;
(function (DisputesVerdictError) {
    DisputesVerdictError["JUDGEMENTS_LENGTH"] = "JUDGEMENTS_LENGTH";
    DisputesVerdictError["EPOCH_INDEX_WRONG"] = "EPOCH_INDEX_WRONG";
    DisputesVerdictError["JUDGEMENTS_LENGTH_WRONG"] = "JUDGEMENTS_LENGTH_WRONG";
    DisputesVerdictError["JUDGEMENT_SIGNATURE_WRONG"] = "JUDGEMENT_SIGNATURE_WRONG";
    DisputesVerdictError["JUDGEMENTS_WRONG"] = "JUDGEMENTS_WRONG";
    DisputesVerdictError["VERDICTS_MUST_BE_ORDERED_UNIQUE_BY_HASH"] = "VERDICTS_MUST_BE_ORDERED_UNIQUE_BY_HASH";
    DisputesVerdictError["INVALID_JUDGEMENT_INDEX"] = "INVALID_JUDGEMENT_INDEX";
    DisputesVerdictError["VERDICTS_IN_PSI_W"] = "VERDICTS_IN_PSI_W";
    DisputesVerdictError["VERDICTS_IN_PSI_B"] = "VERDICTS_IN_PSI_B";
    DisputesVerdictError["VERDICTS_IN_PSI_G"] = "VERDICTS_IN_PSI_G";
    DisputesVerdictError["JUDGEMENTS_NOT_ORDERED"] = "JUDGEMENTS_NOT_ORDERED";
})(DisputesVerdictError || (DisputesVerdictError = {}));

var DisputesStateImpl_1;
/**
 * Codec follows C(5) from $(0.7.1 - D.2)
 *
 * `X`
 * $(0.7.1 - 10.1)
 */
let DisputesStateImpl = DisputesStateImpl_1 = class DisputesStateImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        if (typeof config !== "undefined") {
            Object.assign(this, config);
        }
    }
    /**
     * Computes state transition for disputes state
     * $(0.7.1 - 4.11)
     */
    toPosterior(deps) {
        const bold_v = (deps.extrinsic.verdicts).votes();
        const p_state = new DisputesStateImpl_1({
            // $(0.7.1 - 10.16)
            good: new IdentitySet([
                ...this.good,
                ...bold_v
                    .filter(({ votes }) => votes == VerdictVoteKind.TWO_THIRD_PLUS_ONE)
                    .map(({ reportHash }) => reportHash),
            ]),
            // $(0.7.1 - 10.17)
            bad: new IdentitySet([
                ...this.bad,
                ...bold_v
                    .filter(({ votes }) => votes == VerdictVoteKind.ZERO)
                    .map(({ reportHash }) => reportHash),
            ]),
            // $(0.7.1 - 10.18)
            wonky: new IdentitySet([
                ...this.wonky,
                ...bold_v
                    .filter(({ votes }) => votes == VerdictVoteKind.ONE_THIRD)
                    .map(({ reportHash }) => reportHash),
            ]),
            // $(0.7.1 - 10.19)
            offenders: new IdentitySet([
                ...this.offenders,
                ...deps.extrinsic.culprits.elements.map(({ key }) => key),
                ...deps.extrinsic.faults.elements.map(({ key }) => key),
            ]),
        });
        // $(0.7.1 - 10.5) - end
        // culprit `r` should be in psi_b'
        for (let i = 0; i < deps.extrinsic.culprits.elements.length; i++) {
            const { target } = deps.extrinsic.culprits.elements[i];
            if (!p_state.bad.has(target)) {
                return err(DisputesToPosteriorError.CULPRIT_NOT_IN_PSIB);
            }
        }
        // perform some other last checks
        // $(0.7.1 - 10.6) - end
        // faults reports should be in psi_b' or psi_g'
        for (let i = 0; i < deps.extrinsic.faults.elements.length; i++) {
            const { target, vote } = deps.extrinsic.faults.elements[i];
            if (vote) {
                if (!(p_state.bad.has(target) && !p_state.good.has(target))) {
                    return err(DisputesToPosteriorError.VALID_REPORT_NOT_IN_PSIB_OR_IN_PSIO);
                }
            }
            else {
                if (!(!p_state.bad.has(target) && p_state.good.has(target))) {
                    return err(DisputesToPosteriorError.INVALID_REPORT_IN_PSIB_OR_NOT_IN_PSIO);
                }
            }
        }
        return ok(toPosterior(p_state));
    }
    static newEmpty() {
        return new DisputesStateImpl_1({
            good: new IdentitySet(),
            bad: new IdentitySet(),
            wonky: new IdentitySet(),
            offenders: new IdentitySet(),
        });
    }
};
__decorate$1([
    identitySetCodec(HashCodec),
    __metadata$1("design:type", IdentitySet)
], DisputesStateImpl.prototype, "good", void 0);
__decorate$1([
    identitySetCodec(HashCodec),
    __metadata$1("design:type", IdentitySet)
], DisputesStateImpl.prototype, "bad", void 0);
__decorate$1([
    identitySetCodec(HashCodec),
    __metadata$1("design:type", IdentitySet)
], DisputesStateImpl.prototype, "wonky", void 0);
__decorate$1([
    identitySetCodec(xBytesCodec(32)),
    __metadata$1("design:type", IdentitySet)
], DisputesStateImpl.prototype, "offenders", void 0);
DisputesStateImpl = DisputesStateImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], DisputesStateImpl);
var DisputesToPosteriorError;
(function (DisputesToPosteriorError) {
    DisputesToPosteriorError["EPOCH_INDEX_WRONG"] = "epochIndex is wrong";
    DisputesToPosteriorError["CUPLRIT_SIGNATURE_INVALID"] = "culprit signature is invalid";
    DisputesToPosteriorError["CULPRIT_HASH_MUST_REFERENCE_VERDICT"] = "culprit.hash must reference a verdict";
    DisputesToPosteriorError["FAULT_SIGNATURE_INVALID"] = "fault signature is invalid";
    DisputesToPosteriorError["VERDICTS_NOT_FROM_CURRENT_EPOCH"] = "verdicts must be for the current or previous epoch";
    DisputesToPosteriorError["CULPRIT_NOT_ORDERED_BY_ED25519_PUBLIC_KEY"] = "culprit must be ordered/unique by .ed25519PublicKey";
    DisputesToPosteriorError["FAULTS_NOT_ORDERED_BY_ED25519_PUBLIC_KEY"] = "faults must be ordered/unique by .ed25519PublicKey";
    DisputesToPosteriorError["VERDICTS_IN_PSI_G"] = "verdict.hash must not be in psi_g";
    DisputesToPosteriorError["VERDICTS_IN_PSI_B"] = "verdict.hash must not be in psi_b";
    DisputesToPosteriorError["VERDICTS_IN_PSI_W"] = "verdict.hash must not be in psi_w";
    DisputesToPosteriorError["JUDGEMENTS_NOT_ORDERED_BY_VALIDATOR_INDEX"] = "judgements must be ordered/unique by .validatorIndex";
    DisputesToPosteriorError["VERDICTS_NUM_VALIDATORS"] = "judgements must be 0 or 1/3 or 2/3+1 of NUM_VALIDATORS";
    DisputesToPosteriorError["POSITIVE_VERDICTS_NOT_IN_FAULTS"] = "positive verdicts must be in faults";
    DisputesToPosteriorError["NEGATIVE_VERDICTS_NOT_IN_CULPRIT"] = "negative verdicts must have at least 2 in culprit";
    DisputesToPosteriorError["VERDICT_SIGNATURE_INVALID"] = "verdict signature is invalid";
    DisputesToPosteriorError["VALID_REPORT_NOT_IN_PSIB_OR_IN_PSIO"] = "with fault validity 1, the report must be in psi_b' and not in psi_o'";
    DisputesToPosteriorError["INVALID_REPORT_IN_PSIB_OR_NOT_IN_PSIO"] = "with fault validity 0, the report must NOT be in psi_b' and in psi_o'";
    DisputesToPosteriorError["CULPRIT_NOT_IN_PSIB"] = "CULPRIT_NOT_IN_PSIB";
    DisputesToPosteriorError["CULPRITKEYNOTINK"] = "one or more culprit key is not in bold_k";
    DisputesToPosteriorError["FAULTKEYNOTINK"] = "one or more fault key is not in bold_k";
})(DisputesToPosteriorError || (DisputesToPosteriorError = {}));

var TicketImpl_1;
/**
 * identified by `T` set
 * $(0.7.1 - 6.6)
 * $(0.7.1 - C.30) | codec
 */
let TicketImpl = TicketImpl_1 = class TicketImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        Object.assign(this, config);
    }
    static newEmpty() {
        return new TicketImpl_1({ id: new Uint8Array(32).fill(0), attempt: 0 });
    }
};
__decorate$1([
    codec$1(HashCodec),
    __metadata$1("design:type", Object)
], TicketImpl.prototype, "id", void 0);
__decorate$1([
    eIntCodec(),
    __metadata$1("design:type", Number)
], TicketImpl.prototype, "attempt", void 0);
TicketImpl = TicketImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], TicketImpl);

var GammaAImpl_1;
var GammaAError;
(function (GammaAError) {
    GammaAError["TICKET_NOT_IN_POSTERIOR_GAMMA_A"] = "Ticket not in posterior gamma_a";
})(GammaAError || (GammaAError = {}));
let GammaAImpl = GammaAImpl_1 = class GammaAImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        if (typeof config !== "undefined") {
            Object.assign(this, config);
        }
    }
    length() {
        return this.elements.length;
    }
    /**
     * $(0.7.1 - 6.34)
     */
    toPosterior(deps) {
        const toRet = new GammaAImpl_1({
            elements: [
                ...deps.newTickets,
                ...(() => {
                    if (deps.p_tau.isNewerEra(deps.slot)) {
                        return [];
                    }
                    return this.elements;
                })(),
            ]
                .sort((a, b) => compareUint8Arrays(a.id, b.id))
                .slice(0, EPOCH_LENGTH),
        });
        // $(0.7.1 - 6.35) | check `n` subset of p_gamma_a after slice
        const p_gamma_a_ids = new Set(toRet.elements.map((x) => x.id));
        for (const x of deps.newTickets) {
            if (!p_gamma_a_ids.has(x.id)) {
                // invalid ticket has been submitted.
                return err(GammaAError.TICKET_NOT_IN_POSTERIOR_GAMMA_A);
            }
        }
        return ok(toPosterior(toRet));
    }
    static newEmpty() {
        return new GammaAImpl_1({
            elements: new Array(),
        });
    }
};
__decorate$1([
    lengthDiscriminatedCodec(TicketImpl, SINGLE_ELEMENT_CLASS),
    __metadata$1("design:type", Object)
], GammaAImpl.prototype, "elements", void 0);
GammaAImpl = GammaAImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], GammaAImpl);

var ValidatorDataImpl_1;
let ValidatorDataImpl = ValidatorDataImpl_1 = class ValidatorDataImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        if (typeof config !== "undefined") {
            Object.assign(this, config);
        }
    }
    static newEmpty() {
        return new ValidatorDataImpl_1({
            banderSnatch: new Uint8Array(32).fill(0),
            ed25519: new Uint8Array(32).fill(0),
            blsKey: new Uint8Array(144).fill(0),
            metadata: new Uint8Array(128).fill(0),
        });
    }
};
__decorate$1([
    codec$1(xBytesCodec(32), "bandersnatch"),
    __metadata$1("design:type", Object)
], ValidatorDataImpl.prototype, "banderSnatch", void 0);
__decorate$1([
    codec$1(xBytesCodec(32)),
    __metadata$1("design:type", Object)
], ValidatorDataImpl.prototype, "ed25519", void 0);
__decorate$1([
    codec$1(xBytesCodec(144), "bls"),
    __metadata$1("design:type", Object)
], ValidatorDataImpl.prototype, "blsKey", void 0);
__decorate$1([
    codec$1(xBytesCodec(128)),
    __metadata$1("design:type", Object)
], ValidatorDataImpl.prototype, "metadata", void 0);
ValidatorDataImpl = ValidatorDataImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], ValidatorDataImpl);

var ValidatorsImpl_1;
let ValidatorsImpl = ValidatorsImpl_1 = class ValidatorsImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        if (typeof config !== "undefined") {
            Object.assign(this, config);
        }
        else {
            this.elements = toTagged([]);
        }
    }
    at(index) {
        assert(index >= 0 && index < NUMBER_OF_VALIDATORS, "Index out of bounds");
        return this.elements[index];
    }
    /**
     * Phi function
     * returns a new instance of this where the validator keys which are not in ψ'o. nullify the validator keys which are in ψ'o
     * @see $(0.7.1 - 6.14)
     */
    phi(p_offenders) {
        return new ValidatorsImpl_1({
            elements: toTagged(this.elements.map((v) => {
                if (p_offenders.has(v.ed25519)) {
                    return ValidatorDataImpl.newEmpty();
                }
                return v;
            })),
        });
    }
    static newEmpty() {
        return new ValidatorsImpl_1({
            elements: (Array.from({ length: NUMBER_OF_VALIDATORS }, () => ValidatorDataImpl.newEmpty())),
        });
    }
};
__decorate$1([
    sequenceCodec(NUMBER_OF_VALIDATORS, ValidatorDataImpl, SINGLE_ELEMENT_CLASS),
    __metadata$1("design:type", Object)
], ValidatorsImpl.prototype, "elements", void 0);
ValidatorsImpl = ValidatorsImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], ValidatorsImpl);

var GammaPImpl_1;
let GammaPImpl = GammaPImpl_1 = class GammaPImpl extends ValidatorsImpl {
    // $(0.7.1 - 6.13)
    toPosterior(deps) {
        if (deps.p_tau.isNewerEra(deps.slot)) {
            return toPosterior(toTagged(new GammaPImpl_1({
                elements: deps.iota.phi(deps.p_offenders).elements,
            })));
        }
        return toPosterior(toTagged(this));
    }
    /**
     * Useful to generate Genesis state
     * $(0.7.1 - 6.27)
     */
    static fromEpochMarker(epochMarker) {
        const toRet = new GammaPImpl_1();
        toRet.elements = toTagged(epochMarker.validators.map((v) => {
            const validator = new ValidatorDataImpl({
                ed25519: v.ed25519,
                banderSnatch: v.bandersnatch,
                blsKey: new Uint8Array(144).fill(0),
                metadata: new Uint8Array(128).fill(0),
            });
            return validator;
        }));
        return toRet;
    }
    static newEmpty() {
        return new GammaPImpl_1({
            elements: (Array.from({ length: NUMBER_OF_VALIDATORS }, () => ValidatorDataImpl.newEmpty())),
        });
    }
};
GammaPImpl = GammaPImpl_1 = __decorate$1([
    JamCodecable()
], GammaPImpl);

var HeaderEpochMarkerImpl_1;
let EpochMarkerValidatorImpl = class EpochMarkerValidatorImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        if (typeof config !== "undefined") {
            Object.assign(this, config);
        }
    }
};
__decorate$1([
    codec$1(xBytesCodec(32)),
    __metadata$1("design:type", Object)
], EpochMarkerValidatorImpl.prototype, "bandersnatch", void 0);
__decorate$1([
    codec$1(xBytesCodec(32)),
    __metadata$1("design:type", Object)
], EpochMarkerValidatorImpl.prototype, "ed25519", void 0);
EpochMarkerValidatorImpl = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], EpochMarkerValidatorImpl);
/**
 * $(0.7.1 - 5.10)
 */
let HeaderEpochMarkerImpl = HeaderEpochMarkerImpl_1 = class HeaderEpochMarkerImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        if (typeof config !== "undefined") {
            Object.assign(this, config);
        }
    }
    static build(deps) {
        if (deps.p_tau.isNewerEra(deps.tau)) {
            const toRet = new HeaderEpochMarkerImpl_1();
            toRet.entropy = deps.entropy._0;
            toRet.entropy2 = deps.entropy._1;
            toRet.validators = toTagged([]);
            for (let i = 0; i < NUMBER_OF_VALIDATORS; i++) {
                toRet.validators.push(new EpochMarkerValidatorImpl({
                    bandersnatch: deps.p_gamma_p.at(i).banderSnatch,
                    ed25519: deps.p_gamma_p.at(i).ed25519,
                }));
            }
            return toRet;
        }
        else {
            return undefined;
        }
    }
    /**
     * Verifies epoch marker `He`
     * $(0.7.1 - 6.27)
     */
    static validate(epochMarker, deps) {
        if (deps.p_tau.isNewerEra(deps.tau)) {
            if (typeof epochMarker === "undefined") {
                return false;
            }
            if (compareUint8Arrays(epochMarker.entropy, deps.entropy._0) !== 0) {
                return false;
            }
            if (compareUint8Arrays(epochMarker.entropy2, deps.entropy._1) !== 0) {
                return false;
            }
            if (epochMarker.validators.length !== NUMBER_OF_VALIDATORS) {
                return false;
            }
            for (let i = 0; i < NUMBER_OF_VALIDATORS; i++) {
                if (compareUint8Arrays(epochMarker.validators[i].bandersnatch, deps.p_gamma_p.at(i).banderSnatch) !== 0 ||
                    compareUint8Arrays(epochMarker.validators[i].ed25519, deps.p_gamma_p.at(i).ed25519) !== 0) {
                    return false;
                }
            }
        }
        else {
            if (typeof epochMarker !== "undefined") {
                return false;
            }
        }
        return true;
    }
};
__decorate$1([
    codec$1(HashCodec),
    __metadata$1("design:type", Object)
], HeaderEpochMarkerImpl.prototype, "entropy", void 0);
__decorate$1([
    codec$1(HashCodec, "tickets_entropy"),
    __metadata$1("design:type", Object)
], HeaderEpochMarkerImpl.prototype, "entropy2", void 0);
__decorate$1([
    sequenceCodec(NUMBER_OF_VALIDATORS, EpochMarkerValidatorImpl),
    __metadata$1("design:type", Object)
], HeaderEpochMarkerImpl.prototype, "validators", void 0);
HeaderEpochMarkerImpl = HeaderEpochMarkerImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], HeaderEpochMarkerImpl);

var HeaderOffenderMarkerImpl_1;
/**
 * `HO`
 */
let HeaderOffenderMarkerImpl = HeaderOffenderMarkerImpl_1 = class HeaderOffenderMarkerImpl extends BaseJamCodecable {
    constructor(elements = []) {
        super();
        this.elements = elements;
    }
    /**
     * $(0.7.1 - 10.20)
     */
    static build(disputesExtrinsic) {
        return new HeaderOffenderMarkerImpl_1([
            ...disputesExtrinsic.culprits.elements.map((c) => c.key),
            ...disputesExtrinsic.faults.elements.map((f) => f.key),
        ]);
    }
    checkValidity(disputesExtrinsic) {
        const target = HeaderOffenderMarkerImpl_1.build(disputesExtrinsic);
        if (this.elements.length !== target.elements.length) {
            return false;
        }
        for (let i = 0; i < this.elements.length; i++) {
            if (compareUint8Arrays(this.elements[i], target.elements[i]) !== 0) {
                return false;
            }
        }
        return true;
    }
};
__decorate$1([
    lengthDiscriminatedCodec(xBytesCodec(32), SINGLE_ELEMENT_CLASS),
    __metadata$1("design:type", Array)
], HeaderOffenderMarkerImpl.prototype, "elements", void 0);
HeaderOffenderMarkerImpl = HeaderOffenderMarkerImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Array])
], HeaderOffenderMarkerImpl);

var HeaderTicketMarkerImpl_1;
let HeaderTicketMarkerImpl = HeaderTicketMarkerImpl_1 = class HeaderTicketMarkerImpl extends BaseJamCodecable {
    constructor(elements = []) {
        super();
        Object.assign(this, elements);
    }
    /**
     * $(0.7.1 - 6.28)
     */
    static build(deps) {
        if (deps.p_tau.isSameEra(deps.tau) &&
            deps.tau.slotPhase() < LOTTERY_MAX_SLOT &&
            LOTTERY_MAX_SLOT <= deps.p_tau.slotPhase() &&
            deps.gamma_a.length() === EPOCH_LENGTH) {
            return new HeaderTicketMarkerImpl_1(outsideInSequencer(deps.gamma_a.elements));
        }
        else {
            return undefined;
        }
    }
    /**
     * check winning tickets Hw
     * $(0.7.1 - 6.28)
     */
    static validate(value, deps) {
        if (deps.p_tau.isSameEra(deps.tau) &&
            deps.tau.slotPhase() < LOTTERY_MAX_SLOT &&
            LOTTERY_MAX_SLOT <= deps.p_tau.slotPhase() &&
            deps.gamma_a.length() === EPOCH_LENGTH) {
            if (value?.elements.length !== EPOCH_LENGTH) {
                return false;
            }
            const expectedHw = outsideInSequencer(deps.gamma_a.elements);
            for (let i = 0; i < EPOCH_LENGTH; i++) {
                if (compareUint8Arrays(value.elements[i].id, expectedHw[i].id) !== 0 ||
                    value.elements[i].attempt !== expectedHw[i].attempt) {
                    return false;
                }
            }
        }
        else {
            if (typeof value !== "undefined") {
                return false;
            }
        }
        return true;
    }
};
__decorate$1([
    sequenceCodec(EPOCH_LENGTH, TicketImpl, SINGLE_ELEMENT_CLASS),
    __metadata$1("design:type", Object)
], HeaderTicketMarkerImpl.prototype, "elements", void 0);
HeaderTicketMarkerImpl = HeaderTicketMarkerImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Array])
], HeaderTicketMarkerImpl);

var JamHeaderImpl_1;
/**
 * $(0.7.1 - C.23) | `Eu`
 */
let JamHeaderImpl = JamHeaderImpl_1 = class JamHeaderImpl extends BaseJamCodecable {
    unsignedHash() {
        return Hashing.blake2b(encodeWithCodec(JamHeaderImpl_1, this));
    }
    verifyExtrinsicHash(extrinsics) {
        return this.extrinsicHash === extrinsics.extrinsicHash();
    }
};
__decorate$1([
    codec$1(HashCodec),
    __metadata$1("design:type", Object)
], JamHeaderImpl.prototype, "parent", void 0);
__decorate$1([
    codec$1(HashCodec, "parent_state_root"),
    __metadata$1("design:type", Object)
], JamHeaderImpl.prototype, "parentStateRoot", void 0);
__decorate$1([
    codec$1(HashCodec, "extrinsic_hash"),
    __metadata$1("design:type", Object)
], JamHeaderImpl.prototype, "extrinsicHash", void 0);
__decorate$1([
    codec$1(SlotImpl),
    __metadata$1("design:type", Object)
], JamHeaderImpl.prototype, "slot", void 0);
__decorate$1([
    optionalCodec(HeaderEpochMarkerImpl, "epoch_mark"),
    __metadata$1("design:type", HeaderEpochMarkerImpl)
], JamHeaderImpl.prototype, "epochMarker", void 0);
__decorate$1([
    optionalCodec(HeaderTicketMarkerImpl, "tickets_mark"),
    __metadata$1("design:type", HeaderTicketMarkerImpl)
], JamHeaderImpl.prototype, "ticketsMark", void 0);
__decorate$1([
    eSubIntCodec(2, "author_index"),
    __metadata$1("design:type", Number)
], JamHeaderImpl.prototype, "authorIndex", void 0);
__decorate$1([
    codec$1(xBytesCodec(96), "entropy_source"),
    __metadata$1("design:type", Object)
], JamHeaderImpl.prototype, "entropySource", void 0);
__decorate$1([
    codec$1(HeaderOffenderMarkerImpl, "offenders_mark"),
    __metadata$1("design:type", HeaderOffenderMarkerImpl)
], JamHeaderImpl.prototype, "offendersMark", void 0);
JamHeaderImpl = JamHeaderImpl_1 = __decorate$1([
    JamCodecable()
], JamHeaderImpl);

var JamSignedHeaderImpl_1;
/**
 * $(0.7.1 - C.22) | codec
 */
let JamSignedHeaderImpl = JamSignedHeaderImpl_1 = class JamSignedHeaderImpl extends JamHeaderImpl {
    constructor(config) {
        super();
        if (typeof config !== "undefined") {
            Object.assign(this, config);
        }
    }
    signedHash() {
        return Hashing.blake2b(this.toBinary());
    }
    static sealSignContext(p_entropy_3, p_gamma_s, p_tau) {
        if (p_gamma_s.isFallback()) {
            return new Uint8Array([
                ...JAM_FALLBACK_SEAL,
                ...encodeWithCodec(HashCodec, p_entropy_3),
            ]);
        }
        else {
            const i = p_gamma_s.tickets[p_tau.slotPhase()];
            return new Uint8Array([
                ...JAM_TICKET_SEAL,
                ...encodeWithCodec(HashCodec, p_entropy_3),
                i.attempt,
            ]);
        }
    }
    /**
     * $(0.7.1 - 5.9)
     */
    blockAuthor(p_kappa) {
        return p_kappa.at(this.authorIndex).banderSnatch;
    }
    /**
     * Verify Hs
     * $(0.7.1 - 6.18 / 6.19 / 6.20) and others inside
     * @param p_state the state of which this header is associated with
     */
    verifySeal(deps) {
        const ha = this.blockAuthor(deps.p_kappa);
        const verified = Bandersnatch.verifySignature(this.seal, ha, encodeWithCodec(JamHeaderImpl, this), // message
        JamSignedHeaderImpl_1.sealSignContext(deps.p_entropy_3, deps.p_gamma_s, toTagged(toPosterior(this.slot))));
        if (!verified) {
            return false;
        }
        // $(0.7.1 - 6.16)
        if (deps.p_gamma_s.isFallback()) {
            const i = deps.p_gamma_s.keys[this.slot.slotPhase()];
            if (compareUint8Arrays(i, ha) !== 0) {
                return false;
            }
            return true;
        }
        else {
            // $(0.7.1 - 6.15)
            const i = deps.p_gamma_s.tickets[this.slot.slotPhase()];
            // verify ticket identity. if it fails, it means validator is not allowed to produce block
            return (compareUint8Arrays(i.id, Bandersnatch.vrfOutputSignature(this.seal)) ===
                0);
        }
    }
    /**
     * verify `Hv`
     * $(0.7.1 - 6.17 / 6.18)
     */
    verifyEntropy(p_kappa) {
        const ha = this.blockAuthor(p_kappa);
        return Bandersnatch.verifySignature(this.entropySource, ha, new Uint8Array([]), // message - empty to not bias the entropy
        new Uint8Array([
            ...JAM_ENTROPY,
            ...encodeWithCodec(HashCodec, Bandersnatch.vrfOutputSignature(this.seal)),
        ]));
    }
    /**
     * Verify `Ho`
     * $(0.7.1 - 10.20)
     */
    verifyOffenders(disputesExtrinsic) {
        return this.offendersMark.checkValidity(disputesExtrinsic);
    }
    buildNext(curState, extrinsics, p_tau, keyPair) {
        const p_kappa = curState.kappa.toPosterior(curState, { p_tau });
        const p_entropy_1_3 = curState.entropy.rotate1_3({
            slot: curState.slot,
            p_tau,
        });
        const p_gamma_s = curState.safroleState.gamma_s.toPosterior({
            slot: curState.slot,
            safroleState: curState.safroleState,
            p_tau: p_tau,
            p_kappa,
            p_eta2: p_entropy_1_3._2,
        });
        // we need to check if the given priv/public is the one authorized
        if (!p_gamma_s.isKeyAllowedToProduce(keyPair, {
            p_tau,
            p_entropy_3: p_entropy_1_3._3,
        })) {
            return err(HeaderCreationError.KEY_NOT_ALLOWED);
        }
        const authorIndex = p_kappa.bandersnatchIndex(keyPair.public);
        if (authorIndex === -1) {
            // should never happen but it's pleasing the compiler
            return err(HeaderCreationError.KEY_INDEX_NOT_FOUND);
        }
        const [dispErr, p_disputes] = curState.disputes
            .toPosterior({
            kappa: curState.kappa,
            extrinsic: toTagged(extrinsics.disputes),
            lambda: curState.lambda,
        })
            .safeRet();
        if (dispErr) {
            return err(dispErr);
        }
        const p_gamma_p = curState.safroleState.gamma_p.toPosterior({
            slot: curState.slot,
            iota: curState.iota,
            p_tau: p_tau,
            p_offenders: toPosterior(p_disputes.offenders),
        });
        const sealSignContext = JamSignedHeaderImpl_1.sealSignContext(toPosterior(p_entropy_1_3._3), p_gamma_s, p_tau);
        const toRet = new JamSignedHeaderImpl_1({
            parent: this.signedHash(),
            parentStateRoot: curState.merkleRoot(),
            slot: p_tau,
            authorIndex: authorIndex,
            ticketsMark: HeaderTicketMarkerImpl.build({
                p_tau,
                tau: curState.slot,
                gamma_a: curState.safroleState.gamma_a,
            }),
            extrinsicHash: extrinsics.extrinsicHash(),
            epochMarker: HeaderEpochMarkerImpl.build({
                p_tau,
                tau: curState.slot,
                entropy: curState.entropy,
                p_gamma_p,
            }),
            entropySource: Bandersnatch.sign(keyPair.private, new Uint8Array([]), // message - empty to not bias the entropy
            new Uint8Array([
                ...JAM_ENTROPY,
                ...encodeWithCodec(HashCodec, Bandersnatch.vrfOutputSeed(keyPair.private, sealSignContext)),
            ])),
            offendersMark: HeaderOffenderMarkerImpl.build(toTagged(extrinsics.disputes)),
        });
        toRet.seal = Bandersnatch.sign(keyPair.private, encodeWithCodec(JamHeaderImpl, toRet), // EU(H)
        sealSignContext);
        return ok(toRet);
    }
    checkValidity(deps) {
        if (compareUint8Arrays(this.parent, deps.prevHeader.signedHash()) !== 0) {
            return err(HeaderValidationError.INVALID_PARENT);
        }
        // NOTE: slot is not being checked here as it is checked in the state
        // $(0.7.1 - 5.8)
        if (compareUint8Arrays(deps.curState.merkleRoot(), this.parentStateRoot) !== 0) {
            return err(HeaderValidationError.INVALID_PARENT_STATE_ROOT);
        }
        if (false ===
            this.verifySeal({
                p_kappa: deps.p_kappa,
                p_gamma_s: deps.p_gamma_s,
                p_entropy_3: deps.p_entropy_3,
            })) {
            return err(HeaderValidationError.SEAL_INVALID);
        }
        if (false ===
            HeaderEpochMarkerImpl.validate(this.epochMarker, {
                p_tau: toTagged(this.slot),
                tau: deps.curState.slot,
                entropy: deps.curState.entropy,
                p_gamma_p: deps.p_gamma_p,
            })) {
            return err(HeaderValidationError.INVALID_EPOCH_MARKER);
        }
        if (false ===
            HeaderTicketMarkerImpl.validate(this.ticketsMark, {
                p_tau: toTagged(this.slot),
                tau: deps.curState.slot,
                gamma_a: deps.curState.safroleState.gamma_a,
            })) {
            return err(HeaderValidationError.INVALID_TICKET_MARKER);
        }
        /**
         * $(0.7.1 - 5.4)
         */
        if (compareUint8Arrays(this.extrinsicHash, deps.extrinsicHash) !== 0) {
            return err(HeaderValidationError.INVALID_EXTRINSIC_HASH);
        }
        if (false === this.verifyEntropy(deps.p_kappa)) {
            return err(HeaderValidationError.INVALID_ENTROPY_SOURCE);
        }
        if (false === this.verifyOffenders(deps.disputesExtrinsic)) {
            return err(HeaderValidationError.INVALID_OFFENDERS);
        }
        return ok(toTagged(this));
    }
};
__decorate$1([
    codec$1(xBytesCodec(96)),
    __metadata$1("design:type", Object)
], JamSignedHeaderImpl.prototype, "seal", void 0);
JamSignedHeaderImpl = JamSignedHeaderImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], JamSignedHeaderImpl);
var HeaderCreationError;
(function (HeaderCreationError) {
    HeaderCreationError["KEY_NOT_ALLOWED"] = "KEY_NOT_ALLOWED";
    HeaderCreationError["KEY_INDEX_NOT_FOUND"] = "KEY_INDEX_NOT_FOUND";
})(HeaderCreationError || (HeaderCreationError = {}));
var HeaderValidationError;
(function (HeaderValidationError) {
    HeaderValidationError["INVALID_PARENT"] = "INVALID_PARENT";
    HeaderValidationError["INVALID_PARENT_STATE_ROOT"] = "INVALID_PARENT_STATE_ROOT";
    HeaderValidationError["SEAL_INVALID"] = "SEAL_INVALID";
    HeaderValidationError["INVALID_EPOCH_MARKER"] = "INVALID_EPOCH_MARKER";
    HeaderValidationError["INVALID_TICKET_MARKER"] = "INVALID_TICKET_MARKER";
    HeaderValidationError["INVALID_EXTRINSIC_HASH"] = "INVALID_EXTRINSIC_HASH";
    HeaderValidationError["INVALID_ENTROPY_SOURCE"] = "INVALID_ENTROPY_SOURCE";
    HeaderValidationError["INVALID_OFFENDERS"] = "INVALID_OFFENDERS";
})(HeaderValidationError || (HeaderValidationError = {}));

class GammaSImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        Object.assign(this, config);
    }
    isFallback() {
        return this.keys !== undefined;
    }
    toJSON() {
        return GammaSImpl.toJSON(this);
    }
    toBinary() {
        return encodeWithCodec(GammaSImpl, this);
    }
    /**
     * Checks if the provided public/private key is allowed to produce a block
     * used when producing blocks
     */
    isKeyAllowedToProduce(keyPair, deps) {
        if (this.isFallback()) {
            return (compareUint8Arrays(this.keys[deps.p_tau.slotPhase()], keyPair.public) === 0);
        }
        else {
            const real_i_y = this.tickets[deps.p_tau.slotPhase()].id;
            const i_y = Bandersnatch.vrfOutputSeed(keyPair.private, JamSignedHeaderImpl.sealSignContext(deps.p_entropy_3, this, deps.p_tau));
            return compareUint8Arrays(real_i_y, i_y) === 0;
        }
    }
    /**
     * $(0.7.1 - 6.24)
     */
    toPosterior(deps) {
        if (deps.p_tau.isNextEra(deps.slot) && // e' = e + 1
            deps.safroleState.gamma_a.length() === EPOCH_LENGTH && // |ya| = E
            deps.slot.slotPhase() >= LOTTERY_MAX_SLOT // m >= Y
        ) {
            // we've accumulated enough tickets
            // we can now compute the new posterior `gamma_s`
            const newGammaS = outsideInSequencer(deps.safroleState.gamma_a.elements);
            return toPosterior(new GammaSImpl({ tickets: newGammaS }));
        }
        else if (deps.p_tau.isSameEra(deps.slot)) {
            return toPosterior(this);
        }
        else {
            // we're in fallback mode
            // F(eta'_2, kappa' )
            const newGammaS = [];
            const p_eta2 = encodeWithCodec(HashCodec, deps.p_eta2);
            // $(0.7.1 - 6.26) F calculated in place
            for (let i = 0; i < EPOCH_LENGTH; i++) {
                const e4Buf = new Uint8Array(4);
                E_4.encode(BigInt(i), e4Buf);
                const h_4 = Hashing.blake2b(new Uint8Array([...p_eta2, ...e4Buf])).subarray(0, 4);
                const index = E_4.decode(h_4).value % BigInt(deps.p_kappa.elements.length);
                newGammaS.push(deps.p_kappa.elements[Number(index)].banderSnatch);
            }
            return toPosterior(new GammaSImpl({ keys: newGammaS }));
        }
    }
    static encode(x, buf) {
        if (x instanceof GammaSImpl === false) {
            throw new Error(`GammaSImpl.encode expects GammaSImpl, got ${x.constructor.name}`);
        }
        if (x.isFallback()) {
            E_1.encode(1n, buf);
            return 1 + GammaSImpl.codecOf("keys").encode(x.keys, buf.subarray(1));
        }
        else {
            E_1.encode(0n, buf);
            return (1 + GammaSImpl.codecOf("tickets").encode(x.tickets, buf.subarray(1)));
        }
    }
    static decode(bytes) {
        const isFallback = E_1.decode(bytes.subarray(0, 1)).value === 1n;
        const codec = GammaSImpl.codecOf(isFallback ? "keys" : "tickets");
        const { value, readBytes } = codec.decode(bytes.subarray(1));
        const toRet = new GammaSImpl();
        if (isFallback) {
            toRet.keys = value;
        }
        else {
            toRet.tickets = value;
        }
        return {
            value: toRet,
            readBytes: readBytes + 1,
        };
    }
    static encodedSize(value) {
        if (!(value instanceof GammaSImpl)) {
            throw new Error(`GammaSImpl.encodedSize expects GammaSImpl, got ${value.constructor.name}`);
        }
        if (value.isFallback()) {
            return 1 + GammaSImpl.codecOf("keys").encodedSize(value.keys);
        }
        else {
            return 1 + GammaSImpl.codecOf("tickets").encodedSize(value.tickets);
        }
    }
    static fromJSON(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    json) {
        const toRet = new GammaSImpl();
        if (typeof json.keys !== "undefined") {
            toRet.keys = GammaSImpl.codecOf("keys").fromJSON(json.keys);
        }
        else {
            toRet.tickets = GammaSImpl.codecOf("tickets").fromJSON(json.tickets);
        }
        return toRet;
    }
    static toJSON(value) {
        if (!(value instanceof GammaSImpl)) {
            throw new Error(`GammaSImpl.toJSON expects GammaSImpl, got ${value.constructor.name}`);
        }
        if (value.isFallback()) {
            return { keys: GammaSImpl.codecOf("keys").toJSON(value.keys) };
        }
        else {
            return { tickets: GammaSImpl.codecOf("tickets").toJSON(value.tickets) };
        }
    }
    static newEmpty() {
        return new GammaSImpl({
            keys: toTagged(Array.from({ length: EPOCH_LENGTH }, () => new Uint8Array(32).fill(0))),
        });
    }
}
__decorate$1([
    sequenceCodec(EPOCH_LENGTH, xBytesCodec(32)),
    __metadata$1("design:type", Object)
], GammaSImpl.prototype, "keys", void 0);
__decorate$1([
    sequenceCodec(EPOCH_LENGTH, TicketImpl),
    __metadata$1("design:type", Object)
], GammaSImpl.prototype, "tickets", void 0);

var GammaZImpl_1;
let GammaZImpl = GammaZImpl_1 = class GammaZImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        Object.assign(this, config);
    }
    /**
     * $(0.7.1 - 6.13)
     */
    toPosterior(deps) {
        if (deps.p_tau.isNewerEra(deps.slot)) {
            return toPosterior(new GammaZImpl_1({
                root: Bandersnatch.ringRoot(deps.p_gamma_p.elements.map((v) => v.banderSnatch)),
            }));
        }
        return toPosterior(this);
    }
    static newEmpty() {
        return new GammaZImpl_1({
            root: new Uint8Array(144).fill(0),
        });
    }
};
__decorate$1([
    codec$1(xBytesCodec(144), SINGLE_ELEMENT_CLASS),
    __metadata$1("design:type", Object)
], GammaZImpl.prototype, "root", void 0);
GammaZImpl = GammaZImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], GammaZImpl);

/**
 * This is not really defined in graypaper
 * but used to compute $(0.7.1 - 11.34)
 */
class HeaderLookupHistoryImpl {
    constructor(elements) {
        if (elements) {
            this.elements = elements;
        }
    }
    get(t) {
        return this.elements.get(t);
    }
    toPosterior(deps) {
        const toRet = new HeaderLookupHistoryImpl(new SafeMap([...this.elements]));
        toRet.elements.set(deps.header.slot, deps.header);
        const k = [...this.elements.keys()];
        if (k.length > MAXIMUM_AGE_LOOKUP_ANCHOR) {
            k.sort((a, b) => a.value - b.value);
            // we assume it's being called at each block
            toRet.elements.delete(k[0]);
        }
        return toPosterior(toRet);
    }
    static newEmpty() {
        return new HeaderLookupHistoryImpl(new SafeMap());
    }
}

var JamEntropyImpl_1;
/**
 * `η`
 * $(0.7.1 - 6.21)
 */
let JamEntropyImpl = JamEntropyImpl_1 = class JamEntropyImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        if (typeof config !== "undefined") {
            Object.assign(this, config);
        }
    }
    rotate1_3(deps) {
        // $(0.7.1 - 6.23) | rotate `η_1`, `η_2`, `η_3`
        let [p_1, p_2, p_3] = [this._1, this._2, this._3];
        if (deps.p_tau.isNewerEra(deps.slot)) {
            [p_1, p_2, p_3] = [this._0, this._1, this._2];
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new JamEntropyImpl_1({
            _0: this._0,
            _1: p_1,
            _2: p_2,
            _3: p_3,
        });
    }
    toPosterior(deps) {
        // $(0.7.1 - 6.22) | rotate `η_0`
        const p_0 = Hashing.blake2b(new Uint8Array([
            ...encodeWithCodec(HashCodec, this._0),
            ...encodeWithCodec(HashCodec, deps.vrfOutputHash),
        ]));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new JamEntropyImpl_1({
            _0: p_0,
            _1: this._1,
            _2: this._2,
            _3: this._3,
        });
    }
    static fromJSON(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    json) {
        return new JamEntropyImpl_1({
            _0: HashCodec.fromJSON(json[0]),
            _1: HashCodec.fromJSON(json[1]),
            _2: HashCodec.fromJSON(json[2]),
            _3: HashCodec.fromJSON(json[3]),
        });
    }
    static toJSON(value) {
        const v = value;
        return [v._0, v._1, v._2, v._3].map((h) => HashCodec.toJSON(h));
    }
    static newEmpty() {
        return new JamEntropyImpl_1({
            _0: new Uint8Array(32).fill(0),
            _1: new Uint8Array(32).fill(0),
            _2: new Uint8Array(32).fill(0),
            _3: new Uint8Array(32).fill(0),
        });
    }
};
__decorate$1([
    codec$1(HashCodec),
    __metadata$1("design:type", Object)
], JamEntropyImpl.prototype, "_0", void 0);
__decorate$1([
    codec$1(HashCodec),
    __metadata$1("design:type", Object)
], JamEntropyImpl.prototype, "_1", void 0);
__decorate$1([
    codec$1(HashCodec),
    __metadata$1("design:type", Object)
], JamEntropyImpl.prototype, "_2", void 0);
__decorate$1([
    codec$1(HashCodec),
    __metadata$1("design:type", Object)
], JamEntropyImpl.prototype, "_3", void 0);
JamEntropyImpl = JamEntropyImpl_1 = __decorate$1([
    JamCodecable(true),
    __metadata$1("design:paramtypes", [Object])
], JamEntropyImpl);

var LastAccOutsImpl_1;
let SingleAccOutImpl = class SingleAccOutImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        Object.assign(this, config);
    }
};
__decorate$1([
    eSubIntCodec(4),
    __metadata$1("design:type", Number)
], SingleAccOutImpl.prototype, "serviceIndex", void 0);
__decorate$1([
    codec$1(HashCodec),
    __metadata$1("design:type", Object)
], SingleAccOutImpl.prototype, "accumulationResult", void 0);
SingleAccOutImpl = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], SingleAccOutImpl);
/**
 * `θ` - `\lastaccout`
 * Also implements `\servouts` or `B` defined in
 * $(0.7.1 - 12.17)
 * $(0.7.1 - 7.4)
 *
 * Codec is C(16) in $(0.7.1 - D.2)
 */
let LastAccOutsImpl = LastAccOutsImpl_1 = class LastAccOutsImpl extends BaseJamCodecable {
    constructor(elements) {
        super();
        if (typeof elements !== "undefined") {
            this.elements = elements;
        }
        else {
            this.elements = [];
        }
    }
    /**
     * Adds a new element to the last accumulation outputs.
     * @param serviceIndex - The index of the service.
     * @param accumulationResult - The hash of the accumulation result. it's coming from the yield field
     */
    add(serviceIndex, accumulationResult) {
        this.elements.push(new SingleAccOutImpl({ serviceIndex, accumulationResult }));
    }
    static union(a, b) {
        // TODO: no checks are performed on duplicated elements despite using Set
        return new LastAccOutsImpl_1([
            ...new Set([...a.elements, ...b.elements]).values(),
        ]);
    }
    static newEmpty() {
        return new LastAccOutsImpl_1([]);
    }
    /**
     * the Root of the accumulation outputs is currently unused.
     * here to check against test and in possible future usage
     */
    merkleRoot() {
        return wellBalancedBinaryMerkleRoot([...this.elements]
            .sort((a, b) => a.serviceIndex - b.serviceIndex)
            .map((entry) => entry.toBinary()), Hashing.keccak256);
    }
};
__decorate$1([
    lengthDiscriminatedCodec(SingleAccOutImpl, SINGLE_ELEMENT_CLASS),
    __metadata$1("design:type", Array)
], LastAccOutsImpl.prototype, "elements", void 0);
LastAccOutsImpl = LastAccOutsImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Array])
], LastAccOutsImpl);

/**
 * `I` = U u X
 * $(0.7.1 - 12.15)
 * $(0.7.1 - C.33) | codec
 */
class AccumulationInputInpl {
    constructor(config) {
        Object.assign(this, config);
    }
    isTransfer() {
        return this.transfer !== undefined;
    }
    isOperand() {
        return this.operand !== undefined;
    }
    static decode(bytes) {
        const { value, readBytes } = _codec.decode(bytes);
        return {
            value: new AccumulationInputInpl(value),
            readBytes,
        };
    }
    static encode(x, buf) {
        return _codec.encode(x, buf);
    }
    static encodedSize(value) {
        return _codec.encodedSize(value);
    }
}
const _codec = eitherOneOfCodec([
    ["transfer", asCodec(DeferredTransferImpl)],
    ["operand", asCodec(PVMAccumulationOpImpl)],
]);

/**
 * applies modifications from fns output to compute new ctx and out
 * @param ctx - the current context - NOTE: this may be modified
 * @param out - the current out - NOTE: this may be modified
 * @param mods - the modifications to apply
 * it's idempotent
 */
const applyMods = (ctx, out, mods) => {
    // const newCtx = new PVMProgramExecutionContextImpl({
    //   ...ctx,
    //   registers: cloneCodecable(ctx.registers),
    // });
    const originalPointer = ctx.instructionPointer;
    const newCtx = ctx;
    let exitReason;
    // we cycle through all mods and stop at the end or if
    // exitReason is set (whichever comes first)
    for (let i = 0; i < mods.length && typeof exitReason === "undefined"; i++) {
        const mod = mods[i];
        if (mod.type === "ip") {
            newCtx.instructionPointer = mod.data;
        }
        else if (mod.type === "gas") {
            newCtx.gas = (newCtx.gas - mod.data);
        }
        else if (mod.type === "exit") {
            exitReason = mod.data;
        }
        else if (mod.type === "register") {
            // console.log(`✏️ Reg[${mod.data.index}] = ${mod.data.value.toString(16)}`);
            newCtx.registers.elements[mod.data.index] = new PVMRegisterImpl(mod.data.value);
        }
        else if (mod.type === "memory") {
            // we check for page fault before applying
            const firstUnwriteable = newCtx.memory.firstUnwriteable(mod.data.from, mod.data.data.length);
            if (typeof firstUnwriteable === "undefined") {
                // newCtx.memory = (newCtx.memory as PVMMemory).clone();
                //log(
                //  `✏️ Mem[${mod.data.from.toString(16)}..${
                //    mod.data.data.length
                //  }] = <${BufferJSONCodec().toJSON(<any>mod.data.data)}>`,
                //  true,
                //);
                newCtx.memory.setBytes(mod.data.from, mod.data.data);
            }
            else {
                const r = applyMods(newCtx, out, [
                    ...IxMod.pageFault(firstUnwriteable, originalPointer),
                ]);
                if (typeof r !== "undefined") {
                    exitReason = r;
                }
                //exitReason = r.exitReason;
                //newCtx.instructionPointer = r.ctx.instructionPointer;
                //newCtx.gas = r.ctx.gas;
            }
        }
        else if (mod.type === "object") {
            for (const key of Object.keys(mod.data)) {
                // @ts-expect-error - we know that key is a key of T
                out[key] = mod.data[key];
            }
        }
    }
    return exitReason;
};

/**
 * $(0.7.0 - B.14)
 */
function check_fn(i, delta) {
    if (delta.has(i)) {
        return check_fn((((i - 2 ** 8 + 1) % (2 ** 32 - 2 ** 9)) + 2 ** 8), delta);
    }
    else {
        return i;
    }
}

// constants defined in $(0.7.1 - A.39)
const Zz = 2 ** 16;
const Zi = 2 ** 24;
const owzsCodec = createCodec([
    ["roDataLength", E_sub_int(3)],
    ["rwDataLength", E_sub_int(3)],
    ["rwDataPaddingPages", E_sub_int(2)],
    ["stackSize", E_sub_int(3)],
]);
/**
 * `Y` fn in the graypaper
 * $(0.7.1 - A.37)
 * @param encodedProgram - the encoded program and memory + register data
 * @param argument - the argument to the program
 */
const programInitialization = (encodedProgram, argument) => {
    // $(0.7.1 - A.35) | start
    const { readBytes: initOffset, value: { roDataLength, // |o|
    rwDataLength, // |w|
    rwDataPaddingPages, // z
    stackSize, // s
     }, } = owzsCodec.decode(encodedProgram);
    let offset = initOffset;
    // o
    const roData = encodedProgram.subarray(offset, offset + roDataLength);
    offset += roDataLength;
    // w
    const rwData = encodedProgram.subarray(offset, offset + rwDataLength);
    offset += rwDataLength;
    // |c|
    const programCodeLength = E_4_int.decode(encodedProgram.subarray(offset, offset + 4));
    offset += 4;
    // c
    const programCode = (encodedProgram.subarray(offset, offset + programCodeLength.value));
    offset += programCodeLength.value;
    // $(0.7.1 - A.35) | end
    // $(0.7.1 - A.40)
    if (5 * Zz +
        Z_Fn(roDataLength) +
        Z_Fn(rwDataLength + rwDataPaddingPages * Zp) +
        Z_Fn(stackSize) +
        Zi >
        2 ** 32) {
        return undefined;
    }
    // registers $(0.7.1 - A.39)
    const registers = new PVMRegistersImpl(toTagged([
        2n ** 32n - 2n ** 16n,
        2n ** 32n - 2n * BigInt(Zz) - BigInt(Zi),
        0n,
        0n,
        0n,
        0n,
        0n,
        2n ** 32n - BigInt(Zz) - BigInt(Zi), // 7
        BigInt(argument.length), // 8
        0n,
        0n,
        0n,
        0n,
    ].map((x) => new PVMRegisterImpl(toTagged(x)))));
    const heap = {
        pointer: 0,
        end: 0,
        start: 0,
    };
    // memory $(0.7.1 - A.39)
    const acl = new Map();
    const mem = [];
    const createAcl = (conf) => {
        // log(
        //   `ACL from ${conf.from.toString(16)} to ${conf.to.toString(16)} as ${conf.kind}`,
        //   true,
        // );
        for (let i = conf.from; i < conf.to; i += Zp) {
            // page, kind
            acl.set(Math.floor(i / Zp), conf.kind);
        }
    };
    // first case
    mem.push({ at: Zz, content: roData });
    // first + second
    createAcl({
        from: Zz,
        to: Zz + P_Fn(roDataLength),
        kind: PVMMemoryAccessKind.Read,
    });
    // third case
    {
        const offset = 2 * Zz + Z_Fn(roDataLength);
        mem.push({ at: offset, content: rwData });
        const rwSectionEnd = ((offset + P_Fn(rwDataLength) + rwDataPaddingPages /* z */ * Zp));
        // third+fourth
        // RW DAta
        createAcl({
            from: offset,
            to: rwSectionEnd,
            kind: PVMMemoryAccessKind.Write,
        });
        heap.start = rwSectionEnd;
        heap.pointer = heap.start;
        heap.end = (rwSectionEnd + Zp);
        createAcl({
            from: heap.start,
            to: heap.end,
            kind: PVMMemoryAccessKind.Write,
        });
    }
    // fifth case
    createAcl({
        from: 2 ** 32 - 2 * Zz - Zi - P_Fn(stackSize),
        to: 2 ** 32 - 2 * Zz - Zi,
        kind: PVMMemoryAccessKind.Write,
    });
    {
        const offset = 2 ** 32 - Zz - Zi;
        // sixth case
        mem.push({
            at: offset,
            content: argument,
        });
        // sixth + seventh
        createAcl({
            from: offset,
            to: offset + P_Fn(argument.length),
            kind: PVMMemoryAccessKind.Read,
        });
    }
    return {
        programCode,
        memory: new PVMMemory(mem.filter((a) => a.content.length > 0), // we filter empty memory content cause it won't have acl
        acl, heap),
        registers,
    };
};
// $(0.7.1 - A.40)
const P_Fn = (x) => {
    return Zp * Math.ceil(Number(x) / Zp);
};
// $(0.7.1 - A.40)
const Z_Fn = (x) => {
    return Zz * Math.ceil(Number(x) / Zz);
};

class PVMIxEvaluateFNContextImpl {
    constructor(config) {
        Object.assign(this, config);
    }
}

/**
 * Branch to the given address if the condition is true.
 * and the preconditions are met
 * @param context - the current evaluating context
 * @param address - the address to branch to
 * @param condition - the condition that must be true to branch
 * @param gasCost - the cost of the ix calling in case of panic
 * $(0.7.1 - A.17)
 */
const branch = (context, address, condition) => {
    if (!condition) {
        // even if (226) says that instruction pointer should not move
        // we should allow that
        return [];
    }
    if (!context.program.isBlockBeginning(address)) {
        return [
            IxMod.ip(context.execution.instructionPointer), // stay here - overrides any other ip mods before
            IxMod.panic(), // should not account for gas of panic
        ];
    }
    return [IxMod.ip(address)];
};

const ZA = 2;
/**
 * djump(a)
 * @param context - the current evaluating context
 * @param a - the address to jump to
 * $(0.7.1 - A.18)
 */
const djump = (context, a) => {
    // first branch of djump(a)
    if (a == 2 ** 32 - 2 ** 16) {
        return [IxMod.ip(context.execution.instructionPointer), IxMod.halt()];
    }
    else if (a === 0 ||
        a > context.program.rawProgram.j.length * ZA ||
        a % ZA != 0 ||
        false /* TODO: check if start of block context.program.j[jumpLocation / ZA] !== 1*/) {
        return [IxMod.ip(context.execution.instructionPointer), IxMod.panic()];
    }
    return [IxMod.ip(context.program.rawProgram.j[a / ZA - 1])];
};

/**
 * Z(n, a) = a if a &lt; 2^(8n-1) else a - 2^(8n)
 * @param n - the number of bytes
 * @param a - the number to convert
 * $(0.7.1 - A.10)
 */
const Z = (n, a) => {
    assert$1(n >= 0, "n in Z(n) must be positive");
    if (n == 0) {
        return 0n;
    }
    const limit = 2n ** (8n * BigInt(n) - 1n);
    if (a >= limit) {
        return (a - limit * 2n);
    }
    return a;
};
/**
 * Z_inv(n, a) = (2^(8n) + a) mod 2^(8n)
 * @param n - the number of bytes
 * @param a - the number to convert
 * $(0.7.1 - A.11)
 */
const Z_inv = (n, a) => {
    assert$1(n >= 0, "n in Z_inv(n) must be positive");
    return ((2n ** (8n * BigInt(n)) + a) % 2n ** (8n * BigInt(n)));
};
const Z4 = (a) => Number(Z(4, BigInt(a)));
const Z8 = (a) => Z(8, BigInt(a));
const Z8_inv = (a) => Z_inv(8, BigInt(a));

/**
 * Reads a varint from a buffer. it follows the X formula from the graypaper appendix A.
 * @param buf - buffer to read from
 * @param length - length of the varint
 * $(0.7.1 - A.16)
 */
const readVarIntFromBuffer = (buf, length) => {
    assert$1(length <= 8 && length >= 0, "length must be <= 8 and >= 0");
    const result = E_sub(length).decode(buf.subarray(0, length)).value;
    const lengthN = BigInt(length);
    if (lengthN === 0n) {
        return result;
    }
    return X_fn(lengthN)(result);
};

const NoArgIxDecoder = () => ({});
// $(0.7.1 - A.21)
const OneImmIxDecoder = (bytes) => {
    const lx = Math.min(4, bytes.length);
    const vX = readVarIntFromBuffer(bytes, lx);
    assert$1(vX <= 255n, "value is too large");
    return { vX: Number(readVarIntFromBuffer(bytes, lx)) };
};
// $(0.7.1 - A.22)
const OneRegOneExtImmArgsIxDecoder = (bytes) => {
    assert$1(bytes.length > 0, "no input bytes");
    const rA = Math.min(12, bytes[0] % 16);
    const vX = E_8.decode(bytes.subarray(1, 1 + 8)).value;
    return {
        rA,
        vX,
        wA: 0n, // will be hydrated later
    };
};
/**
 * decode the full instruction from the bytes.
 * the byte array is chunked to include only the bytes of the instruction
 * $(0.7.1 - A.23)
 */
const TwoImmIxDecoder = (bytes) => {
    let offset = 0;
    const lX = Math.min(4, bytes[0] % 8);
    offset += 1;
    assert$1(bytes.length >= offset + lX + (lX == 0 ? 1 : 0), "not enough bytes");
    const vX = Number(readVarIntFromBuffer(bytes.subarray(offset, offset + lX), lX));
    offset += lX;
    const secondArgLength = Math.min(4, Math.max(0, bytes.length - offset));
    const vY = readVarIntFromBuffer(bytes.subarray(1 + lX, 1 + lX + secondArgLength), secondArgLength);
    return { vX, vY };
};
// $(0.7.1 - A.24)
const OneOffsetIxDecoder = (bytes) => {
    const lx = Math.min(4, bytes.length);
    const ipOffsetRaw = (Number(Z(lx, E_sub(lx).decode(bytes.subarray(0, lx)).value)));
    return {
        ipOffsetRaw,
        ipOffset: 0, // will be hydrated later
    };
};
// $(0.7.1 - A.25)
const OneRegOneImmIxDecoder = (bytes) => {
    assert$1(bytes.length > 0, "no input bytes");
    const rA = Math.min(12, bytes[0] % 16);
    const lx = Math.min(4, Math.max(0, bytes.length - 1));
    const vX = (readVarIntFromBuffer(bytes.subarray(1), lx));
    return {
        rA,
        vX,
        wA: 0n, // will be hydrated later
    };
};
// $(0.7.1 - A.26)
const OneRegTwoImmIxDecoder = (bytes) => {
    const rA = Math.min(12, bytes[0] % 16);
    const lx = Math.min(4, Math.floor(bytes[0] / 16) % 8);
    assert$1(bytes.length >= lx + 1, "not enough bytes");
    const ly = Math.min(4, Math.max(0, bytes.length - 1 - lx));
    const vX = readVarIntFromBuffer(bytes.subarray(1, 1 + lx), lx);
    const vY = readVarIntFromBuffer(bytes.subarray(1 + lx), ly);
    return { rA, vX, vY };
};
//
// $(0.7.1 - A.27)
const OneRegOneIMMOneOffsetIxDecoder = (bytes) => {
    assert$1(bytes.length > 0, "no input bytes");
    const rA = Math.min(12, bytes[0] % 16);
    const lx = Math.min(4, Math.floor(bytes[0] / 16) % 8);
    assert$1(bytes.length >= lx + 1, "not enough bytes");
    const ly = Math.min(4, Math.max(0, bytes.length - 1 - lx));
    const vX = readVarIntFromBuffer(bytes.subarray(1, 1 + lx), lx);
    const ipOffsetRaw = Number(Z(ly, E_sub(ly).decode(bytes.subarray(1 + lx, 1 + lx + ly)).value));
    return {
        rA,
        vX,
        ipOffsetRaw,
        wA: 0n, // will be hydrated later
        ipOffset: 0, // will be hydrated later
    };
};
// $(0.7.1 - A.28)
const TwoRegIxDecoder = (bytes) => {
    assert$1(bytes.length > 0, "no input bytes");
    const rD = Math.min(12, bytes[0] % 16);
    const rA = Math.min(12, Math.floor(bytes[0] / 16));
    return {
        rA,
        rD,
        wA: 0n, // will be hydrated later
        wD: 0n, // will be hydrated later
    };
};
// $(0.7.1 - A.29)
const TwoRegOneImmIxDecoder = (bytes) => {
    const rA = Math.min(12, bytes[0] % 16);
    const rB = Math.min(12, Math.floor(bytes[0] / 16));
    const lX = Math.min(4, Math.max(0, bytes.length - 1));
    const vX = readVarIntFromBuffer(bytes.subarray(1, 1 + lX), lX);
    return {
        rA,
        rB,
        vX,
        wA: 0n, // will be hydrated later
        wB: 0n, // will be hydrated later
    };
};
// $(0.7.1 - A.30)
const TwoRegOneOffsetIxDecoder = (bytes) => {
    const rA = Math.min(12, bytes[0] % 16);
    const rB = Math.min(12, Math.floor(bytes[0] / 16));
    const lX = Math.min(4, Math.max(0, bytes.length - 1));
    const ipOffsetRaw = Number(Z(lX, E_sub(lX).decode(bytes.subarray(1, 1 + lX)).value));
    return {
        rA,
        rB,
        ipOffsetRaw,
    };
};
// $(0.7.1 - A.31)
const TwoRegTwoImmIxDecoder = (bytes) => {
    const rA = Math.min(12, bytes[0] % 16);
    const rB = Math.min(12, Math.floor(bytes[0] / 16));
    assert$1(bytes.length >= 2, "not enough bytes [1]");
    const lX = Math.min(4, bytes[1] % 8);
    const lY = Math.min(4, Math.max(0, bytes.length - 2 - lX));
    assert$1(bytes.length >= 2 + lX, "not enough bytes [2]");
    const vX = readVarIntFromBuffer(bytes.subarray(2, 2 + lX), lX);
    const vY = readVarIntFromBuffer(bytes.subarray(2 + lX, 2 + lX + lY), lY);
    return {
        vX,
        vY,
        rA,
        rB,
    };
};
// $(0.7.1 - A.32)
const ThreeRegIxDecoder = (bytes) => {
    assert$1(bytes.length >= 2, "not enough bytes (2)");
    const rA = Math.min(12, bytes[0] % 16);
    const rB = Math.min(12, Math.floor(bytes[0] / 16));
    const rD = Math.min(12, bytes[1]);
    return {
        rA,
        rB,
        rD,
        wA: 0n, // will be hydrated later
        wB: 0n, // will be hydrated later
        wD: 0n, // will be hydrated later
    };
};

/**
 * hydrates the Ix args from the pure decoders
 */
function hydrateIxArgs(decoded, ctx) {
    const regs = ctx.execution.registers.elements;
    // registers
    if (typeof decoded.rA !== "undefined") {
        decoded.wA = regs[decoded.rA].value;
    }
    if (typeof decoded.rB !== "undefined") {
        decoded.wB = regs[decoded.rB].value;
    }
    if (typeof decoded.rD !== "undefined") {
        decoded.wD = regs[decoded.rD].value;
    }
    if (typeof decoded.ipOffsetRaw !== "undefined") {
        decoded.ipOffset = ((ctx.execution.instructionPointer + decoded.ipOffsetRaw));
    }
    return decoded;
}

const Ixdb = {
    byCode: new Map(),
    byIdentifier: new Map(),
    blockTerminators: new Set(),
};
/**
 * register an instruction in the instruction database
 * @param conf - the configuration object
 */
const regIx = (ix, isBlockTerminator = false) => {
    if (Ixdb.byCode.has(ix.opCode)) {
        throw new Error(`duplicate opCode ${ix.opCode}`);
    }
    if (Ixdb.byIdentifier.has(ix.identifier)) {
        throw new Error(`duplicate identifier ${ix.identifier}`);
    }
    Ixdb.byCode.set(ix.opCode, ix);
    Ixdb.byIdentifier.set(ix.identifier, ix);
    if (isBlockTerminator) {
        Ixdb.blockTerminators.add(ix.opCode);
    }
    return ix;
};
/**
 * Decorator to register an instruction
 */
const Ix = (opCode, decoder) => {
    return (_target, propertyKey, descriptor) => {
        regIx({
            opCode: opCode,
            identifier: propertyKey,
            decode: decoder,
            evaluate: function hydratedEvaluate(args, context) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return descriptor.value(hydrateIxArgs(args, context), context);
            },
            gasCost: 1n,
        }, descriptor
            .isBlockTermination);
        return descriptor;
    };
};
/**
 * Decorator to mark an instruction as block termination
 * must be used AFTER @Ix
 */
const BlockTermination = (_target, _propertyKey, descriptor) => {
    descriptor.isBlockTermination = true;
    return descriptor;
};

/**
 * This class holds the ixs implementations.
 * But in reality the decorators are calling the `regIx` function
 * which store the implementation (and the ix configuration) in the `IxDb`.
 */
class Instructions {
    trap(_, context) {
        return [IxMod.ip(context.execution.instructionPointer), IxMod.panic()];
    }
    fallthrough(_, context) {
        return [IxMod.ip(context.execution.instructionPointer + 1)];
    }
    ecalli({ vX }) {
        return [IxMod.hostCall(vX)];
    }
    load_imm_64({ rA, vX }) {
        return [IxMod.reg(rA, vX)];
    }
    store_imm_u8({ vX, vY }) {
        return [IxMod.memory(vX, new Uint8Array([Number(vY % 256n)]))];
    }
    store_imm_u16({ vX, vY }) {
        return [IxMod.memory(vX, encodeWithCodec(E_2, vY % 2n ** 16n))];
    }
    store_imm_u32({ vX, vY }) {
        return [IxMod.memory(vX, encodeWithCodec(E_4, vY % 2n ** 32n))];
    }
    store_imm_u64({ vX, vY }) {
        return [IxMod.memory(vX, encodeWithCodec(E_8, BigInt(vY)))];
    }
    jump({ ipOffset }, context) {
        return branch(context, ipOffset, true);
    }
    jump_ind({ wA, vX }, context) {
        const jumpLocation = Number((wA + vX) % 2n ** 32n);
        return [...djump(context, jumpLocation)];
    }
    // ### Load unsigned
    load_imm({ rA, vX }) {
        return [IxMod.reg(rA, vX)];
    }
    load_u8({ rA, vX }, context) {
        const memoryAddress = toSafeMemoryAddress(vX);
        if (!context.execution.memory.canRead(memoryAddress, 1)) {
            return handleMemoryFault(context.execution.memory.firstUnreadable(memoryAddress, 1), context.execution);
        }
        return [
            IxMod.reg(rA, BigInt(context.execution.memory.getBytes(memoryAddress, 1)[0])),
        ];
    }
    load_u16({ rA, vX }, context) {
        const memoryAddress = toSafeMemoryAddress(vX);
        if (!context.execution.memory.canRead(memoryAddress, 2)) {
            return handleMemoryFault(context.execution.memory.firstUnreadable(memoryAddress, 2), context.execution);
        }
        return [
            IxMod.reg(rA, E_2.decode(context.execution.memory.getBytes(memoryAddress, 2)).value),
        ];
    }
    load_u32({ rA, vX }, context) {
        const memoryAddress = toSafeMemoryAddress(vX);
        if (!context.execution.memory.canRead(memoryAddress, 4)) {
            return handleMemoryFault(context.execution.memory.firstUnreadable(memoryAddress, 4), context.execution);
        }
        return [
            IxMod.reg(rA, E_4.decode(context.execution.memory.getBytes(memoryAddress, 4)).value),
        ];
    }
    load_u64({ rA, vX }, context) {
        const memoryAddress = toSafeMemoryAddress(vX);
        if (!context.execution.memory.canRead(memoryAddress, 8)) {
            return handleMemoryFault(context.execution.memory.firstUnreadable(memoryAddress, 8), context.execution);
        }
        return [
            IxMod.reg(rA, E_8.decode(context.execution.memory.getBytes(memoryAddress, 8)).value),
        ];
    }
    // ### Load signed
    load_i8({ rA, vX }, context) {
        const memoryAddress = toSafeMemoryAddress(vX);
        if (!context.execution.memory.canRead(memoryAddress, 1)) {
            return handleMemoryFault(context.execution.memory.firstUnreadable(memoryAddress, 1), context.execution);
        }
        return [
            IxMod.reg(rA, X_fn(1n)(BigInt(context.execution.memory.getBytes(memoryAddress, 1)[0]))),
        ];
    }
    load_i16({ rA, vX }, context) {
        const memoryAddress = toSafeMemoryAddress(vX);
        if (!context.execution.memory.canRead(memoryAddress, 2)) {
            return handleMemoryFault(context.execution.memory.firstUnreadable(memoryAddress, 2), context.execution);
        }
        return [
            IxMod.reg(rA, X_fn(2n)(E_2.decode(context.execution.memory.getBytes(memoryAddress, 2)).value)),
        ];
    }
    load_i32({ rA, vX }, context) {
        const memoryAddress = toSafeMemoryAddress(vX);
        if (!context.execution.memory.canRead(memoryAddress, 4)) {
            return handleMemoryFault(context.execution.memory.firstUnreadable(memoryAddress, 4), context.execution);
        }
        return [
            IxMod.reg(rA, X_4(E_4.decode(context.execution.memory.getBytes(memoryAddress, 4)).value)),
        ];
    }
    // ### Store
    store_u8({ wA, vX }) {
        return [IxMod.memory(vX, new Uint8Array([Number(wA % 256n)]))];
    }
    store_u16({ wA, vX }) {
        return [IxMod.memory(vX, encodeWithCodec(E_2, wA % 2n ** 16n))];
    }
    store_u32({ wA, vX }) {
        return [IxMod.memory(vX, encodeWithCodec(E_4, wA % 2n ** 32n))];
    }
    store_u64({ wA, vX }) {
        return [IxMod.memory(vX, encodeWithCodec(E_8, wA))];
    }
    store_imm_ind_u8({ wA, vX, vY }) {
        const location = wA + vX;
        return [
            IxMod.memory(toSafeMemoryAddress(location), new Uint8Array([Number(vY % 0xffn)])),
        ];
    }
    store_imm_ind_u16({ wA, vX, vY }) {
        const location = wA + vX;
        return [
            IxMod.memory(toSafeMemoryAddress(location), encodeWithCodec(E_2, vY % 2n ** 16n)),
        ];
    }
    store_imm_ind_u32({ wA, vX, vY }) {
        const location = wA + vX;
        return [
            IxMod.memory(toSafeMemoryAddress(location), encodeWithCodec(E_4, vY % 2n ** 32n)),
        ];
    }
    store_imm_ind_u64({ wA, vX, vY }) {
        const location = wA + vX;
        return [
            IxMod.memory(toSafeMemoryAddress(location), encodeWithCodec(E_8, vY)),
        ];
    }
    load_imm_jump({ rA, vX, ipOffset }, context) {
        return [IxMod.reg(rA, vX), ...branch(context, ipOffset, true)];
    }
    branch_eq_imm({ wA, vX, ipOffset }, context) {
        return branch(context, ipOffset, wA === vX);
    }
    branch_ne_imm({ vX, ipOffset, wA }, context) {
        return branch(context, ipOffset, wA != vX);
    }
    branch_lt_u_imm({ vX, ipOffset, wA }, context) {
        return branch(context, ipOffset, wA < vX);
    }
    branch_le_u_imm({ vX, ipOffset, wA }, context) {
        return branch(context, ipOffset, wA <= vX);
    }
    branch_ge_u_imm({ vX, ipOffset, wA }, context) {
        return branch(context, ipOffset, wA >= vX);
    }
    branch_gt_u_imm({ vX, ipOffset, wA }, context) {
        return branch(context, ipOffset, wA > vX);
    }
    branch_lt_s_imm({ vX, ipOffset, wA }, context) {
        return branch(context, ipOffset, Z(8, wA) < Z(8, vX));
    }
    branch_le_s_imm({ vX, ipOffset, wA }, context) {
        return branch(context, ipOffset, Z(8, wA) <= Z(8, vX));
    }
    branch_ge_s_imm({ vX, ipOffset, wA }, context) {
        return branch(context, ipOffset, Z(8, wA) >= Z(8, vX));
    }
    branch_gt_s_imm({ vX, ipOffset, wA }, context) {
        return branch(context, ipOffset, Z(8, wA) > Z(8, vX));
    }
    move_reg({ rD, wA }) {
        return [IxMod.reg(rD, wA)];
    }
    sbrk({ rD, wA }, context) {
        const requestedSize = Number(wA);
        const pointer = context.execution.memory.heap.pointer;
        if (requestedSize === 0) {
            return [IxMod.reg(rD, BigInt(pointer))];
        }
        const location = context.execution.memory.firstWriteableInHeap(Number(wA));
        return [IxMod.reg(rD, BigInt(location))];
    }
    count_set_bits_64({ rD, wA }) {
        const wa = wA;
        let sum = 0n;
        let val = wa;
        for (let i = 0; i < 64; i++) {
            sum += val & 1n;
            val >>= 1n;
        }
        return [IxMod.reg(rD, sum)];
    }
    count_set_bits_32({ rD, wA }) {
        const wa = wA;
        let sum = 0n;
        let val = wa % 2n ** 32n;
        for (let i = 0; i < 32; i++) {
            sum += val & 1n;
            val >>= 1n;
        }
        return [IxMod.reg(rD, sum)];
    }
    leading_zero_bits_64({ rD, wA }) {
        const wa = wA;
        const val = wa;
        let count = 0n;
        for (let i = 0; i < 64; i++) {
            if (val & (1n << (63n - BigInt(i)))) {
                break;
            }
            count++;
        }
        return [IxMod.reg(rD, count)];
    }
    leading_zero_bits_32({ rD, wA }) {
        const wa = wA;
        const val = wa % 2n ** 32n;
        let count = 0n;
        for (let i = 0; i < 32; i++) {
            if (val & (1n << (31n - BigInt(i)))) {
                break;
            }
            count++;
        }
        return [IxMod.reg(rD, count)];
    }
    trailing_zero_bits_64({ rD, wA }) {
        const wa = wA;
        const val = wa;
        let count = 0n;
        for (let i = 0; i < 64; i++) {
            if (val & (1n << BigInt(i))) {
                break;
            }
            count++;
        }
        return [IxMod.reg(rD, count)];
    }
    trailing_zero_bits_32({ rD, wA }) {
        const wa = wA;
        const val = wa % 2n ** 32n;
        let count = 0n;
        for (let i = 0; i < 32; i++) {
            if (val & (1n << BigInt(i))) {
                break;
            }
            count++;
        }
        return [IxMod.reg(rD, count)];
    }
    sign_extend_8({ rD, wA }) {
        return [IxMod.reg(rD, Z8_inv(Z(1, wA % 2n ** 8n)))];
    }
    sign_extend_16({ rD, wA }) {
        return [IxMod.reg(rD, Z8_inv(Z(2, wA % 2n ** 16n)))];
    }
    zero_extend_16({ rD, wA }) {
        return [IxMod.reg(rD, wA % 2n ** 16n)];
    }
    reverse_bytes({ rD, wA }) {
        let newVal = 0n;
        const wa = wA;
        for (let i = 0; i < 8; i++) {
            newVal |= ((wa >> BigInt(i * 8)) & 0xffn) << BigInt((7 - i) * 8);
        }
        return [IxMod.reg(rD, newVal)];
    }
    load_imm_jump_ind(args, context) {
        return [
            IxMod.reg(args.rA, args.vX),
            ...djump(context, Number((args.wB + args.vY) % 2n ** 32n)),
        ];
    }
    // 2 reg 1 offset
    branch_eq({ wA, wB, ipOffset }, context) {
        return branch(context, ipOffset, wA === wB);
    }
    branch_ne({ wA, wB, ipOffset }, context) {
        return branch(context, ipOffset, wA !== wB);
    }
    branch_lt_u({ wA, wB, ipOffset }, context) {
        return branch(context, ipOffset, wA < wB);
    }
    branch_lt_s({ wA, wB, ipOffset }, context) {
        return branch(context, ipOffset, Z(8, wA) < Z(8, wB));
    }
    branch_ge_u({ wA, wB, ipOffset }, context) {
        return branch(context, ipOffset, wA >= wB);
    }
    branch_ge_s({ wA, wB, ipOffset }, context) {
        return branch(context, ipOffset, Z(8, wA) >= Z(8, wB));
    }
    store_ind_u8({ wB, vX, wA }) {
        const location = toSafeMemoryAddress(wB + vX);
        return [
            IxMod.memory(location, new Uint8Array([Number(wA & 0xffn)])),
        ];
    }
    store_ind_u16({ wA, wB, vX }) {
        const location = toSafeMemoryAddress(wB + vX);
        return [IxMod.memory(location, encodeWithCodec(E_2, wA & 0xffffn))];
    }
    store_ind_u32({ wA, wB, vX }) {
        const location = toSafeMemoryAddress(wB + vX);
        const tmp = new Uint8Array(4);
        E_4.encode(BigInt(wA % 2n ** 32n), tmp);
        return [IxMod.memory(location, tmp)];
    }
    store_ind_u64({ wA, wB, vX }) {
        const location = toSafeMemoryAddress(wB + vX);
        return [IxMod.memory(location, encodeWithCodec(E_8, wA))];
    }
    // # load unsigned
    load_ind_u8({ rA, wB, vX }, context) {
        const location = toSafeMemoryAddress(wB + vX);
        if (!context.execution.memory.canRead(location, 1)) {
            return handleMemoryFault(context.execution.memory.firstUnreadable(location, 1), context.execution);
        }
        return [
            IxMod.reg(rA, BigInt(context.execution.memory.getBytes(location, 1)[0])),
        ];
    }
    load_ind_u16({ rA, wB, vX }, context) {
        const location = toSafeMemoryAddress(wB + vX);
        if (!context.execution.memory.canRead(location, 2)) {
            return handleMemoryFault(context.execution.memory.firstUnreadable(location, 2), context.execution);
        }
        const r = context.execution.memory.getBytes(location, 2);
        return [IxMod.reg(rA, E_2.decode(r).value)];
    }
    load_ind_u32({ rA, wB, vX }, context) {
        const location = toSafeMemoryAddress(wB + vX);
        if (!context.execution.memory.canRead(location, 4)) {
            return handleMemoryFault(context.execution.memory.firstUnreadable(location, 4), context.execution);
        }
        const r = context.execution.memory.getBytes(location, 4);
        return [IxMod.reg(rA, E_4.decode(r).value)];
    }
    load_ind_u64({ rA, wB, vX }, context) {
        const location = toSafeMemoryAddress(wB + vX);
        if (!context.execution.memory.canRead(location, 8)) {
            return handleMemoryFault(context.execution.memory.firstUnreadable(location, 8), context.execution);
        }
        const r = context.execution.memory.getBytes(location, 8);
        return [IxMod.reg(rA, E_8.decode(r).value)];
    }
    // # load signed
    load_ind_i8({ rA, wB, vX }, context) {
        const location = toSafeMemoryAddress(wB + vX);
        if (!context.execution.memory.canRead(location, 1)) {
            return handleMemoryFault(context.execution.memory.firstUnreadable(location, 1), context.execution);
        }
        const raw = context.execution.memory.getBytes(location, 1);
        const val = Z8_inv(Z(1, BigInt(raw[0])));
        return [IxMod.reg(rA, val)];
    }
    load_ind_i16({ rA, wB, vX }, context) {
        const location = toSafeMemoryAddress(wB + vX);
        if (!context.execution.memory.canRead(location, 2)) {
            return handleMemoryFault(context.execution.memory.firstUnreadable(location, 2), context.execution);
        }
        const val = context.execution.memory.getBytes(location, 2);
        const num = E_2.decode(val).value;
        return [IxMod.reg(rA, Z8_inv(Z(2, num)))];
    }
    load_ind_i32({ rA, wB, vX }, context) {
        const location = toSafeMemoryAddress(wB + vX);
        if (!context.execution.memory.canRead(location, 4)) {
            return handleMemoryFault(context.execution.memory.firstUnreadable(location, 4), context.execution);
        }
        const val = context.execution.memory.getBytes(location, 4);
        const num = E_4.decode(val).value;
        return [IxMod.reg(rA, Z8_inv(Z(4, num)))];
    }
    // math
    add_imm_32({ rA, wB, vX }) {
        return [IxMod.reg(rA, X_4((wB + vX) % 2n ** 32n))];
    }
    and_imm({ rA, wB, vX }) {
        return [IxMod.reg(rA, wB & BigInt(vX))];
    }
    xor_imm({ rA, wB, vX }) {
        return [IxMod.reg(rA, wB ^ BigInt(vX))];
    }
    or_imm({ rA, wB, vX }) {
        return [IxMod.reg(rA, wB | BigInt(vX))];
    }
    mul_imm_32({ rA, wB, vX }) {
        return [IxMod.reg(rA, (wB * BigInt(vX)) % 2n ** 32n)];
    }
    set_lt_u_imm({ rA, wB, vX }) {
        return [IxMod.reg(rA, wB < vX ? 1n : 0n)];
    }
    set_lt_s_imm({ rA, wB, vX }) {
        return [IxMod.reg(rA, Z8(wB) < Z8(BigInt(vX)) ? 1n : 0n)];
    }
    shlo_l_imm_32({ rA, wB, vX }) {
        return [IxMod.reg(rA, X_4((wB << vX % 32n) % 2n ** 32n))];
    }
    shlo_r_imm_32({ rA, wB, vX }) {
        const wb = Number(wB % 2n ** 32n);
        return [IxMod.reg(rA, X_4(BigInt(wb >>> Number(vX % 32n))))];
    }
    shar_r_imm_32({ rA, wB, vX }) {
        const wb = Number(wB % 2n ** 32n);
        return [IxMod.reg(rA, Z8_inv(BigInt(Z4(wb) >> Number(vX % 32n))))];
    }
    neg_add_imm_32({ rA, wB, vX }) {
        let val = (vX + 2n ** 32n - wB) % 2n ** 32n;
        if (val < 0n) {
            // other languages behave differently than js when modulo a negative number
            // see comment 3 on pull 3 of jamtestvector.
            val += 2n ** 32n;
        }
        return [IxMod.reg(rA, X_4(val))];
    }
    set_gt_u_imm({ rA, wB, vX }) {
        return [IxMod.reg(rA, wB > vX ? 1n : 0n)];
    }
    set_gt_s_imm({ rA, wB, vX }) {
        return [IxMod.reg(rA, Z8(wB) > Z8(BigInt(vX)) ? 1n : 0n)];
    }
    shlo_l_imm_alt_32({ rA, wB, vX }) {
        return [IxMod.reg(rA, X_4((vX << wB % 32n) % 2n ** 32n))];
    }
    shlo_r_imm_alt_32({ rA, wB, vX }) {
        return [IxMod.reg(rA, BigInt(Number(vX) >>> Number(wB % 32n)))];
    }
    shar_r_imm_alt_32({ rA, wB, vX }) {
        return [IxMod.reg(rA, Z8_inv(BigInt(Z4(vX % 2n ** 32n)) >> wB % 32n))];
    }
    cmov_iz_imm({ rA, wB, vX }) {
        if (wB === 0n) {
            return [IxMod.reg(rA, vX)];
        }
        return [];
    }
    cmov_nz_imm({ rA, wB, vX }) {
        if (wB !== 0n) {
            return [IxMod.reg(rA, vX)];
        }
        return [];
    }
    add_imm_64({ rA, wB, vX }) {
        return [IxMod.reg(rA, (wB + BigInt(vX)) % 2n ** 64n)];
    }
    mul_imm_64({ rA, wB, vX }) {
        return [IxMod.reg(rA, (wB * BigInt(vX)) % 2n ** 64n)];
    }
    shlo_l_imm_64({ rA, wB, vX }) {
        return [IxMod.reg(rA, X_8((wB << BigInt(vX % 64n)) % 2n ** 64n))];
    }
    shlo_r_imm_64({ rA, wB, vX }) {
        return [IxMod.reg(rA, X_8(wB / 2n ** (BigInt(vX) % 64n)))];
    }
    shar_r_imm_64({ rA, wB, vX }) {
        const z8b = Z8(wB);
        const dividend = 2n ** (BigInt(vX) % 64n);
        let result = z8b / dividend;
        // Math.floor for negative numbers
        if (z8b < 0n && dividend > 0n && z8b % dividend !== 0n) {
            result -= 1n;
        }
        return [IxMod.reg(rA, Z8_inv(result))];
    }
    neg_add_imm_64({ rA, wB, vX }) {
        return [IxMod.reg(rA, (BigInt(vX) + 2n ** 64n - wB) % 2n ** 64n)];
    }
    shlo_l_imm_alt_64({ rA, wB, vX }) {
        return [IxMod.reg(rA, (BigInt(vX) << wB % 64n) % 2n ** 64n)];
    }
    shlo_r_imm_alt_64({ rA, wB, vX }) {
        return [IxMod.reg(rA, (BigInt(vX) / 2n ** (wB % 64n)) % 2n ** 64n)];
    }
    shar_r_imm_alt_64({ rA, wB, vX }) {
        return [IxMod.reg(rA, Z8_inv(Z8(BigInt(vX)) >> wB % 64n))];
    }
    rot_r_64_imm({ rA, wB, vX }) {
        const shift = vX % 64n;
        const mask = 2n ** 64n - 1n;
        const value = wB;
        const result = (value >> shift) | ((value << (64n - shift)) & mask);
        return [IxMod.reg(rA, result)];
    }
    rot_r_64_imm_alt({ rA, wB, vX }) {
        const shift = wB % 64n;
        const mask = 2n ** 64n - 1n;
        const value = vX;
        const result = (value >> shift) | ((value << (64n - shift)) & mask);
        return [IxMod.reg(rA, result)];
    }
    rot_r_32_imm({ rA, wB, vX }) {
        const shift = vX % 32n;
        const mask = 2n ** 32n - 1n;
        const value = wB % 2n ** 32n;
        const result = (value >> shift) | ((value << (32n - shift)) & mask);
        return [IxMod.reg(rA, X_4(result))];
    }
    rot_r_32_imm_alt({ rA, wB, vX }) {
        const shift = wB % 32n;
        const mask = 2n ** 32n - 1n;
        const value = vX % 2n ** 32n;
        const result = (value >> shift) | ((value << (32n - shift)) & mask);
        return [IxMod.reg(rA, X_4(result))];
    }
    add_32({ wA, wB, rD }) {
        return [IxMod.reg(rD, X_4((wA + wB) % 2n ** 32n))];
    }
    sub_32({ wA, wB, rD }) {
        return [
            IxMod.reg(rD, X_4((wA + 2n ** 32n - (wB % 2n ** 32n)) % 2n ** 32n)),
        ];
    }
    mul_32({ wA, wB, rD }) {
        return [IxMod.reg(rD, X_4((wA * wB) % 2n ** 32n))];
    }
    div_u_32({ wA, wB, rD }) {
        if (wB % 2n ** 32n === 0n) {
            return [IxMod.reg(rD, 2n ** 64n - 1n)];
        }
        else {
            return [IxMod.reg(rD, wA / wB)]; // NOTE: this was math.floor but bigint division is already trunctaing
        }
    }
    div_s_32({ wA, wB, rD }) {
        const z4a = Z4(wA % 2n ** 32n);
        const z4b = Z4(wB % 2n ** 32n);
        let newVal;
        if (z4b === 0) {
            newVal = 2n ** 64n - 1n;
        }
        else if (z4a == -1 * 2 ** 31 && z4b === -1) {
            newVal = Z8_inv(BigInt(z4a));
        }
        else {
            // this is basically `rtz`
            newVal = Z8_inv(BigInt(Math.trunc(z4a / z4b)));
        }
        return [IxMod.reg(rD, newVal)];
    }
    rem_u_32({ wA, wB, rD }) {
        let newVal;
        if (wB % 2n ** 32n === 0n) {
            newVal = X_4(wA % 2n ** 32n);
        }
        else {
            newVal = X_4((wA % 2n ** 32n) % (wB % 2n ** 32n));
        }
        return [IxMod.reg(rD, newVal)];
    }
    rem_s_32({ wA, wB, rD }) {
        const z4a = Z4(wA % 2n ** 32n);
        const z4b = Z4(wB % 2n ** 32n);
        let newVal;
        if (z4a === -1 * 2 ** 31 && z4b === -1) {
            newVal = 0n;
        }
        else {
            newVal = Z8_inv(smod(BigInt(z4a), BigInt(z4b)));
        }
        return [IxMod.reg(rD, newVal)];
    }
    shlo_l_32({ wA, wB, rD }) {
        return [IxMod.reg(rD, X_4((wA << wB % 32n) % 2n ** 32n))];
    }
    shlo_r_32({ wA, wB, rD }) {
        const wa_32 = Number(wA % 2n ** 32n);
        const wb_32 = Number(wB % 2n ** 32n);
        return [IxMod.reg(rD, X_4(BigInt(wa_32 >>> wb_32)))];
    }
    shar_r_32({ wA, wB, rD }) {
        const z4a = Z4(wA % 2n ** 32n);
        return [
            IxMod.reg(rD, Z8_inv(BigInt(Math.floor(z4a / 2 ** Number(wB % 32n))))),
        ];
    }
    add_64({ wA, wB, rD }) {
        return [IxMod.reg(rD, (wA + wB) % 2n ** 64n)];
    }
    sub_64({ wA, wB, rD }) {
        return [IxMod.reg(rD, (wA + 2n ** 64n - wB) % 2n ** 64n)];
    }
    mul_64({ wA, wB, rD }) {
        return [IxMod.reg(rD, (wA * wB) % 2n ** 64n)];
    }
    div_u_64({ wA, wB, rD }) {
        if (wB === 0n) {
            return [IxMod.reg(rD, 2n ** 64n - 1n)];
        }
        else {
            return [IxMod.reg(rD, wA / wB)];
        }
    }
    div_s_64({ wA, wB, rD }) {
        const z8a = Z8(wA);
        const z8b = Z8(wB);
        let newVal;
        if (wB === 0n) {
            newVal = 2n ** 64n - 1n;
        }
        else if (z8a == -1n * 2n ** 63n && z8b === -1n) {
            newVal = wA;
        }
        else {
            newVal = Z8_inv(z8a / z8b); // since bigint (RegisterValue) has no decimal point this is `rtz` already
        }
        return [IxMod.reg(rD, newVal)];
    }
    rem_u_64({ wA, wB, rD }) {
        let newVal;
        if (wB === 0n) {
            newVal = wA;
        }
        else {
            newVal = wA % wB;
        }
        return [IxMod.reg(rD, newVal)];
    }
    rem_s_64({ wA, wB, rD }) {
        const z8a = Z8(wA);
        const z8b = Z8(wB);
        let newVal;
        if (z8a === -1n * 2n ** 63n && z8b === -1n) {
            newVal = 0n;
        }
        else {
            newVal = Z8_inv(smod(z8a, z8b));
        }
        return [IxMod.reg(rD, newVal)];
    }
    shlo_l_64({ wA, wB, rD }) {
        return [IxMod.reg(rD, (wA << wB % 64n) % 2n ** 64n)];
    }
    shlo_r_64({ wA, wB, rD }) {
        return [IxMod.reg(rD, wA / 2n ** (wB % 64n))];
    }
    shar_r_64({ wA, wB, rD }) {
        const z8a = Z8(wA);
        const dividend = 2n ** (wB % 64n);
        let result = z8a / dividend;
        if (z8a < 0n && dividend > 0n && z8a % dividend !== 0n) {
            result -= 1n;
        }
        return [IxMod.reg(rD, Z8_inv(result))];
    }
    and({ wA, wB, rD }) {
        return [IxMod.reg(rD, wA & wB)];
    }
    xor({ wA, wB, rD }) {
        return [IxMod.reg(rD, wA ^ wB)];
    }
    or({ wA, wB, rD }) {
        return [IxMod.reg(rD, wA | wB)];
    }
    mul_upper_s_s({ wA, wB, rD }) {
        return [IxMod.reg(rD, Z8_inv((Z8(wA) * Z8(wB)) / 2n ** 64n))];
    }
    mul_upper_u_u({ wA, wB, rD }) {
        return [IxMod.reg(rD, (wA * wB) / 2n ** 64n)];
    }
    mul_upper_s_u({ wA, wB, rD }) {
        const mult = Z8(wA) * wB;
        let val = mult / 2n ** 64n;
        if (val < 0n && mult % 2n ** 64n !== 0n) {
            val--;
        }
        return [IxMod.reg(rD, Z8_inv(val))];
    }
    set_lt_u({ wA, wB, rD }) {
        return [IxMod.reg(rD, wA < wB ? 1n : 0n)];
    }
    set_lt_s({ wA, wB, rD }) {
        const z4a = Z8(wA);
        const z4b = Z8(wB);
        return [IxMod.reg(rD, z4a < z4b ? 1n : 0n)];
    }
    cmov_iz({ wA, wB, rD }) {
        if (wB === 0n) {
            return [IxMod.reg(rD, wA)];
        }
        return [];
    }
    cmov_nz({ wA, wB, rD }) {
        if (wB !== 0n) {
            return [IxMod.reg(rD, wA)];
        }
        return [];
    }
    rot_l_64({ wA, wB, rD }) {
        const shift = wB & 63n; // ensure its in the range 0-63
        const mask = 2n ** 64n - 1n;
        const result = ((wA << shift) | (wA >> (64n - shift))) & mask;
        return [IxMod.reg(rD, result)];
    }
    rot_l_32({ wA: _wA, wB, rD }) {
        const wA = _wA % 2n ** 32n;
        const shift = wB & 31n; // ensure its in the range 0-31
        const mask = 2n ** 32n - 1n;
        const result = ((wA << shift) | (wA >> (32n - shift))) & mask;
        return [IxMod.reg(rD, X_4(result))];
    }
    rot_r_64({ wA, wB, rD }) {
        const shift = wB & 63n; // ensure its in the range 0-63
        const mask = 2n ** 64n - 1n;
        const result = ((wA >> shift) | (wA << (64n - shift))) & mask;
        return [IxMod.reg(rD, result)];
    }
    rot_r_32({ wA: _wA, wB, rD }) {
        const wA = _wA % 2n ** 32n;
        const shift = wB & 31n; // ensure its in the range 0-31
        const mask = 2n ** 32n - 1n;
        const result = ((wA >> shift) | (wA << (32n - shift))) & mask;
        return [IxMod.reg(rD, X_4(result))];
    }
    and_inv({ wA, wB, rD }) {
        return [IxMod.reg(rD, wA & ~wB)];
    }
    or_inv({ wA, wB, rD }) {
        return [IxMod.reg(rD, (2n ** 64n + (wA | ~wB)) % 2n ** 64n)];
    }
    xnor({ wA, wB, rD }) {
        return [IxMod.reg(rD, (2n ** 64n + ~(wA ^ wB)) % 2n ** 64n)];
    }
    max({ wA, wB, rD }) {
        const z8a = Z8(wA);
        const z8b = Z8(wB);
        // using wA and wB is basically a Z8_inv
        return [IxMod.reg(rD, z8a > z8b ? wA : wB)];
    }
    max_u({ wA, wB, rD }) {
        return [IxMod.reg(rD, wA > wB ? wA : wB)];
    }
    min({ wA, wB, rD }) {
        const z8a = Z8(wA);
        const z8b = Z8(wB);
        // using wA and wB is basically a Z8_inv
        return [IxMod.reg(rD, z8a < z8b ? wA : wB)];
    }
    min_u({ wA, wB, rD }) {
        return [IxMod.reg(rD, wA < wB ? wA : wB)];
    }
}
__decorate$1([
    Ix(0, NoArgIxDecoder),
    BlockTermination,
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "trap", null);
__decorate$1([
    Ix(1, NoArgIxDecoder),
    BlockTermination,
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "fallthrough", null);
__decorate$1([
    Ix(10, OneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "ecalli", null);
__decorate$1([
    Ix(20, OneRegOneExtImmArgsIxDecoder),
    BlockTermination,
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "load_imm_64", null);
__decorate$1([
    Ix(30, TwoImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "store_imm_u8", null);
__decorate$1([
    Ix(31, TwoImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "store_imm_u16", null);
__decorate$1([
    Ix(32, TwoImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "store_imm_u32", null);
__decorate$1([
    Ix(33, TwoImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "store_imm_u64", null);
__decorate$1([
    Ix(40, OneOffsetIxDecoder),
    BlockTermination,
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "jump", null);
__decorate$1([
    Ix(50, OneRegOneImmIxDecoder),
    BlockTermination,
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "jump_ind", null);
__decorate$1([
    Ix(51, OneRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "load_imm", null);
__decorate$1([
    Ix(52, OneRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "load_u8", null);
__decorate$1([
    Ix(54, OneRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "load_u16", null);
__decorate$1([
    Ix(56, OneRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "load_u32", null);
__decorate$1([
    Ix(58, OneRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "load_u64", null);
__decorate$1([
    Ix(53, OneRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "load_i8", null);
__decorate$1([
    Ix(55, OneRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "load_i16", null);
__decorate$1([
    Ix(57, OneRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "load_i32", null);
__decorate$1([
    Ix(59, OneRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "store_u8", null);
__decorate$1([
    Ix(60, OneRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "store_u16", null);
__decorate$1([
    Ix(61, OneRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "store_u32", null);
__decorate$1([
    Ix(62, OneRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "store_u64", null);
__decorate$1([
    Ix(70, OneRegTwoImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "store_imm_ind_u8", null);
__decorate$1([
    Ix(71, OneRegTwoImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "store_imm_ind_u16", null);
__decorate$1([
    Ix(72, OneRegTwoImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "store_imm_ind_u32", null);
__decorate$1([
    Ix(73, OneRegTwoImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "store_imm_ind_u64", null);
__decorate$1([
    Ix(80, OneRegOneIMMOneOffsetIxDecoder),
    BlockTermination,
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "load_imm_jump", null);
__decorate$1([
    Ix(81, OneRegOneIMMOneOffsetIxDecoder),
    BlockTermination,
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "branch_eq_imm", null);
__decorate$1([
    Ix(82, OneRegOneIMMOneOffsetIxDecoder),
    BlockTermination,
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "branch_ne_imm", null);
__decorate$1([
    Ix(83, OneRegOneIMMOneOffsetIxDecoder),
    BlockTermination,
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "branch_lt_u_imm", null);
__decorate$1([
    Ix(84, OneRegOneIMMOneOffsetIxDecoder),
    BlockTermination,
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "branch_le_u_imm", null);
__decorate$1([
    Ix(85, OneRegOneIMMOneOffsetIxDecoder),
    BlockTermination,
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "branch_ge_u_imm", null);
__decorate$1([
    Ix(86, OneRegOneIMMOneOffsetIxDecoder),
    BlockTermination,
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "branch_gt_u_imm", null);
__decorate$1([
    Ix(87, OneRegOneIMMOneOffsetIxDecoder),
    BlockTermination,
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "branch_lt_s_imm", null);
__decorate$1([
    Ix(88, OneRegOneIMMOneOffsetIxDecoder),
    BlockTermination,
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "branch_le_s_imm", null);
__decorate$1([
    Ix(89, OneRegOneIMMOneOffsetIxDecoder),
    BlockTermination,
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "branch_ge_s_imm", null);
__decorate$1([
    Ix(90, OneRegOneIMMOneOffsetIxDecoder),
    BlockTermination,
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "branch_gt_s_imm", null);
__decorate$1([
    Ix(100, TwoRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "move_reg", null);
__decorate$1([
    Ix(101, TwoRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "sbrk", null);
__decorate$1([
    Ix(102, TwoRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "count_set_bits_64", null);
__decorate$1([
    Ix(103, TwoRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "count_set_bits_32", null);
__decorate$1([
    Ix(104, TwoRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "leading_zero_bits_64", null);
__decorate$1([
    Ix(105, TwoRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "leading_zero_bits_32", null);
__decorate$1([
    Ix(106, TwoRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "trailing_zero_bits_64", null);
__decorate$1([
    Ix(107, TwoRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "trailing_zero_bits_32", null);
__decorate$1([
    Ix(108, TwoRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "sign_extend_8", null);
__decorate$1([
    Ix(109, TwoRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "sign_extend_16", null);
__decorate$1([
    Ix(110, TwoRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "zero_extend_16", null);
__decorate$1([
    Ix(111, TwoRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "reverse_bytes", null);
__decorate$1([
    Ix(180, TwoRegTwoImmIxDecoder),
    BlockTermination,
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "load_imm_jump_ind", null);
__decorate$1([
    Ix(170, TwoRegOneOffsetIxDecoder),
    BlockTermination,
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "branch_eq", null);
__decorate$1([
    Ix(171, TwoRegOneOffsetIxDecoder),
    BlockTermination,
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "branch_ne", null);
__decorate$1([
    Ix(172, TwoRegOneOffsetIxDecoder),
    BlockTermination,
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "branch_lt_u", null);
__decorate$1([
    Ix(173, TwoRegOneOffsetIxDecoder),
    BlockTermination,
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "branch_lt_s", null);
__decorate$1([
    Ix(174, TwoRegOneOffsetIxDecoder),
    BlockTermination,
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "branch_ge_u", null);
__decorate$1([
    Ix(175, TwoRegOneOffsetIxDecoder),
    BlockTermination,
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "branch_ge_s", null);
__decorate$1([
    Ix(120, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "store_ind_u8", null);
__decorate$1([
    Ix(121, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "store_ind_u16", null);
__decorate$1([
    Ix(122, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "store_ind_u32", null);
__decorate$1([
    Ix(123, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "store_ind_u64", null);
__decorate$1([
    Ix(124, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "load_ind_u8", null);
__decorate$1([
    Ix(126, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "load_ind_u16", null);
__decorate$1([
    Ix(128, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "load_ind_u32", null);
__decorate$1([
    Ix(130, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "load_ind_u64", null);
__decorate$1([
    Ix(125, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "load_ind_i8", null);
__decorate$1([
    Ix(127, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "load_ind_i16", null);
__decorate$1([
    Ix(129, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object, PVMIxEvaluateFNContextImpl]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "load_ind_i32", null);
__decorate$1([
    Ix(131, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "add_imm_32", null);
__decorate$1([
    Ix(132, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "and_imm", null);
__decorate$1([
    Ix(133, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "xor_imm", null);
__decorate$1([
    Ix(134, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "or_imm", null);
__decorate$1([
    Ix(135, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "mul_imm_32", null);
__decorate$1([
    Ix(136, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "set_lt_u_imm", null);
__decorate$1([
    Ix(137, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "set_lt_s_imm", null);
__decorate$1([
    Ix(138, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "shlo_l_imm_32", null);
__decorate$1([
    Ix(139, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "shlo_r_imm_32", null);
__decorate$1([
    Ix(140, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "shar_r_imm_32", null);
__decorate$1([
    Ix(141, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "neg_add_imm_32", null);
__decorate$1([
    Ix(142, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "set_gt_u_imm", null);
__decorate$1([
    Ix(143, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "set_gt_s_imm", null);
__decorate$1([
    Ix(144, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "shlo_l_imm_alt_32", null);
__decorate$1([
    Ix(145, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "shlo_r_imm_alt_32", null);
__decorate$1([
    Ix(146, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "shar_r_imm_alt_32", null);
__decorate$1([
    Ix(147, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "cmov_iz_imm", null);
__decorate$1([
    Ix(148, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "cmov_nz_imm", null);
__decorate$1([
    Ix(149, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "add_imm_64", null);
__decorate$1([
    Ix(150, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "mul_imm_64", null);
__decorate$1([
    Ix(151, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "shlo_l_imm_64", null);
__decorate$1([
    Ix(152, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "shlo_r_imm_64", null);
__decorate$1([
    Ix(153, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "shar_r_imm_64", null);
__decorate$1([
    Ix(154, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "neg_add_imm_64", null);
__decorate$1([
    Ix(155, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "shlo_l_imm_alt_64", null);
__decorate$1([
    Ix(156, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "shlo_r_imm_alt_64", null);
__decorate$1([
    Ix(157, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "shar_r_imm_alt_64", null);
__decorate$1([
    Ix(158, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "rot_r_64_imm", null);
__decorate$1([
    Ix(159, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "rot_r_64_imm_alt", null);
__decorate$1([
    Ix(160, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "rot_r_32_imm", null);
__decorate$1([
    Ix(161, TwoRegOneImmIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "rot_r_32_imm_alt", null);
__decorate$1([
    Ix(190, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "add_32", null);
__decorate$1([
    Ix(191, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "sub_32", null);
__decorate$1([
    Ix(192, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "mul_32", null);
__decorate$1([
    Ix(193, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "div_u_32", null);
__decorate$1([
    Ix(194, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "div_s_32", null);
__decorate$1([
    Ix(195, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "rem_u_32", null);
__decorate$1([
    Ix(196, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "rem_s_32", null);
__decorate$1([
    Ix(197, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "shlo_l_32", null);
__decorate$1([
    Ix(198, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "shlo_r_32", null);
__decorate$1([
    Ix(199, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "shar_r_32", null);
__decorate$1([
    Ix(200, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "add_64", null);
__decorate$1([
    Ix(201, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "sub_64", null);
__decorate$1([
    Ix(202, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "mul_64", null);
__decorate$1([
    Ix(203, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "div_u_64", null);
__decorate$1([
    Ix(204, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "div_s_64", null);
__decorate$1([
    Ix(205, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "rem_u_64", null);
__decorate$1([
    Ix(206, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "rem_s_64", null);
__decorate$1([
    Ix(207, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "shlo_l_64", null);
__decorate$1([
    Ix(208, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "shlo_r_64", null);
__decorate$1([
    Ix(209, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "shar_r_64", null);
__decorate$1([
    Ix(210, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "and", null);
__decorate$1([
    Ix(211, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "xor", null);
__decorate$1([
    Ix(212, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "or", null);
__decorate$1([
    Ix(213, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "mul_upper_s_s", null);
__decorate$1([
    Ix(214, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "mul_upper_u_u", null);
__decorate$1([
    Ix(215, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "mul_upper_s_u", null);
__decorate$1([
    Ix(216, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "set_lt_u", null);
__decorate$1([
    Ix(217, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "set_lt_s", null);
__decorate$1([
    Ix(218, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "cmov_iz", null);
__decorate$1([
    Ix(219, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "cmov_nz", null);
__decorate$1([
    Ix(220, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "rot_l_64", null);
__decorate$1([
    Ix(221, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "rot_l_32", null);
__decorate$1([
    Ix(222, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "rot_r_64", null);
__decorate$1([
    Ix(223, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "rot_r_32", null);
__decorate$1([
    Ix(224, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "and_inv", null);
__decorate$1([
    Ix(225, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "or_inv", null);
__decorate$1([
    Ix(226, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "xnor", null);
__decorate$1([
    Ix(227, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "max", null);
__decorate$1([
    Ix(228, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "max_u", null);
__decorate$1([
    Ix(229, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "min", null);
__decorate$1([
    Ix(230, ThreeRegIxDecoder),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [Object]),
    __metadata$1("design:returntype", void 0)
], Instructions.prototype, "min_u", null);
/**
 * $(0.7.1 - A.9)
 * $(0.7.1 - A.8) | is handled by caller
 */
const handleMemoryFault = (location, context) => {
    if (location < 2 ** 16) {
        return [IxMod.panic()];
    }
    return IxMod.pageFault((Zp * Math.floor(location % Zp)), context.instructionPointer);
};

var _ParsedProgram_blockBeginnings, _ParsedProgram_ixSkips, _ParsedProgram_ixs, _ParsedProgram_ixDecodeCache;
class ParsedProgram {
    constructor(rawProgram) {
        this.rawProgram = rawProgram;
        _ParsedProgram_blockBeginnings.set(this, void 0);
        // $(0.7.1 - A.3)
        _ParsedProgram_ixSkips.set(this, void 0);
        _ParsedProgram_ixs.set(this, new Map());
        /**
         * holds just in time decoded cache for ixs
         */
        _ParsedProgram_ixDecodeCache.set(this, new Map());
        __classPrivateFieldSet(this, _ParsedProgram_blockBeginnings, new Set());
        __classPrivateFieldSet(this, _ParsedProgram_ixSkips, new Map());
        __classPrivateFieldSet(this, _ParsedProgram_ixs, new Map());
        assert$1(rawProgram.k[0] === 1 && Ixdb.byCode.has(rawProgram.c[0]), `First instruction must be an instruction k[0]=${rawProgram.k[0]} c[0]=${rawProgram.c[0]}`);
        __classPrivateFieldGet(this, _ParsedProgram_ixs, "f").set(0, rawProgram.c[0]);
        let lastIx = 0;
        for (let i = 1; i < rawProgram.k.length; i++) {
            // if this is an instruction opcode
            if (rawProgram.k[i] === 1) {
                __classPrivateFieldGet(this, _ParsedProgram_ixs, "f").set(i, rawProgram.c[i]);
                // basically the skips
                __classPrivateFieldGet(this, _ParsedProgram_ixSkips, "f").set(lastIx, (i - lastIx - 1));
                lastIx = i;
            }
        }
        // calculates skips $(0.7.1 - A.3)
        __classPrivateFieldGet(this, _ParsedProgram_ixSkips, "f").set(lastIx, (rawProgram.k.length - lastIx - 1));
        __classPrivateFieldGet(this, _ParsedProgram_blockBeginnings, "f").add(0);
        for (const [ix, skip] of __classPrivateFieldGet(this, _ParsedProgram_ixSkips, "f").entries()) {
            if (Ixdb.blockTerminators.has(rawProgram.c[ix])) {
                __classPrivateFieldGet(this, _ParsedProgram_blockBeginnings, "f").add((ix + skip + 1));
            }
        }
    }
    ixAt(pointer) {
        const ix = __classPrivateFieldGet(this, _ParsedProgram_ixs, "f").get(pointer);
        if (typeof ix === "undefined") {
            return undefined;
        }
        return Ixdb.byCode.get(ix);
    }
    /**
     * Basically computes `l`
     * $(0.7.1 - A.20)
     */
    skip(pointer) {
        // we assume that the pointer is valid
        return __classPrivateFieldGet(this, _ParsedProgram_ixSkips, "f").get(pointer);
    }
    isBlockBeginning(pointer) {
        return __classPrivateFieldGet(this, _ParsedProgram_blockBeginnings, "f").has(pointer);
    }
    /**
     * `Ψ1` | singleStep
     * it modifies the context according to the single step.
     * $(0.7.1 - A.6)
     */
    singleStep(ctx) {
        const ip = ctx.execution.instructionPointer;
        const ix = this.ixAt(ip);
        if (typeof ix === "undefined") {
            const o = applyMods(ctx.execution, {}, [
                IxMod.gas(TRAP_COST),
                IxMod.panic(),
            ]);
            return o;
        }
        const skip = __classPrivateFieldGet(this, _ParsedProgram_ixSkips, "f").get(ip) + 1;
        let args = __classPrivateFieldGet(this, _ParsedProgram_ixDecodeCache, "f").get(ip);
        if (typeof args === "undefined") {
            try {
                const byteArgs = this.rawProgram.c.subarray(ip + 1, ip + skip);
                args = ix.decode(byteArgs);
                __classPrivateFieldGet(this, _ParsedProgram_ixDecodeCache, "f").set(ip, args);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }
            catch (e) {
                console.warn(`Decoding error for ${ix.identifier}`, e.message);
                const o = applyMods(ctx.execution, {}, [
                    IxMod.skip(ip, skip), //NOTE: not sure we should skip
                    IxMod.gas(TRAP_COST + ix.gasCost),
                    IxMod.panic(),
                ]);
                return o;
            }
        }
        const ixMods = ix.evaluate(args, ctx);
        // TODO: check if pagefault is handled correctly
        // because gp states it should return prev ixpointer but i have the feeling it is not the case in this implementation
        //
        // we apply the gas and skip.
        // if an instruction pointer is set we apply it and override the skip inside
        // the applyMods
        // $(0.7.1 - A.8)
        return applyMods(ctx.execution, {}, [
            IxMod.gas(ix.gasCost), // g′ = g − g∆
            IxMod.skip(ip, skip), // i'
            ...ixMods,
        ]);
    }
    /**
     * Parse the given program
     * @param program - the program to parse
     * @returns - the parsed program
     * @throws - if the program is invalid
     */
    static parse(program) {
        return new ParsedProgram(program);
    }
}
_ParsedProgram_blockBeginnings = new WeakMap(), _ParsedProgram_ixSkips = new WeakMap(), _ParsedProgram_ixs = new WeakMap(), _ParsedProgram_ixDecodeCache = new WeakMap();

const deblobProgram = (bold_p) => {
    let program;
    try {
        program = PVMProgramCodec.decode(bold_p).value;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    }
    catch (e) {
        return PVMExitReasonImpl.panic();
    }
    return ParsedProgram.parse(program);
};
/**
 * Basic invocation
 * `Ψ` in the graypaper
 * $(0.7.1 - 4.22 / A.1)
 */
const basicInvocation = (
// bold_p: Uint8Array,
bold_p, ctx) => {
    let idx = 1;
    const isDebugLog = process.env.DEBUG_STEPS === "true";
    const execCtx = ctx.execution;
    while (execCtx.gas > 0) {
        const curPointer = execCtx.instructionPointer;
        const exitReason = bold_p.singleStep(ctx); //pvmSingleStep(bold_p, intermediateState);
        if (isDebugLog) {
            const ip = curPointer;
            const ix = bold_p.ixAt(curPointer);
            log(`${(idx++).toString().padEnd(4, " ")} [@${ip.toString().padEnd(6, " ")}] - ${ix?.identifier.padEnd(20, " ")} ${debugContext(ctx.execution)}`, true);
        }
        if (typeof exitReason !== "undefined") {
            log("exitReson != empty", isDebugLog);
            log(exitReason.toString(), isDebugLog);
            return exitReason;
        }
    }
    return PVMExitReasonImpl.outOfGas();
};
const debugContext = (ctx) => {
    return `regs:[${ctx.registers.elements.join(" ")}] gas:${ctx.gas}`;
};

/**
 * Host call invocation
 * `ΨH` in the graypaper
 * $(0.7.1 - A.35)
 */
const hostCallInvocation = (program, ctx, // ı, ξ, ω, μ
f, x) => {
    // NOTE:this is not part of A.35 but an optimization
    // to avoid deblobbing multiple times in basicInvocation
    const r = deblobProgram(program);
    if (r instanceof PVMExitReasonImpl) {
        return {
            exitReason: r,
            out: x,
        };
    }
    const ixCtx = new PVMIxEvaluateFNContextImpl({
        execution: ctx,
        program: r,
    });
    while (true) {
        const outExit = basicInvocation(r, ixCtx);
        if (outExit.isHostCall()) {
            // i'
            const p_i = ixCtx.execution.instructionPointer;
            const hostCallRes = f({
                hostCallOpcode: outExit.opCode,
                ctx: ctx,
                out: x,
            });
            // all flows of A.35 when its host call wants instruction pointer
            // to be the one after the basic invocation
            ctx.instructionPointer = p_i;
            if (typeof hostCallRes !== "undefined") {
                // https://github.com/gavofyork/graypaper/pull/485
                assert(false == hostCallRes.isPageFault(), "host call cannot return page fault");
                return {
                    exitReason: hostCallRes,
                    out: x, // this has been modified already by hostcall
                };
            }
        }
        else {
            // regular execution without host call
            return {
                exitReason: outExit,
                out: x,
            };
        }
    }
};

/**
 * `ΨM` in the paper
 * $(0.7.1 - A.44)
 * @param core - CoreIndex added for context but not in gp
 * @param encodedProgram - bold_p
 * @param instructionPointer - ı
 * @param gas - ϱ
 * @param args - bold_a
 * @param f - host call executor
 * @param x - out
 *
 */
const argumentInvocation = (encodedProgram, instructionPointer, // ı
gas, // ϱ
args, // a
f, x) => {
    const res = programInitialization(encodedProgram, args);
    if (typeof res === "undefined") {
        return { gasUsed: 0n, res: WorkOutputImpl.panic(), out: x };
    }
    const { programCode, memory, registers } = res;
    const context = new PVMProgramExecutionContextImpl({
        instructionPointer,
        gas,
        registers,
        memory,
    });
    const hRes = hostCallInvocation(programCode, context, f, x);
    return R_fn$1(gas, hRes, context);
};
// $(0.7.1 - A.44)
const R_fn$1 = (gas, hostCall, context) => {
    const u_prime = context.gas;
    const gas_prime = (gas - (u_prime > 0n ? u_prime : 0n));
    if (hostCall.exitReason?.reason === RegularPVMExitReason.OutOfGas) {
        return {
            gasUsed: gas_prime,
            res: WorkOutputImpl.outOfGas(),
            out: hostCall.out, // x'
        };
    }
    if (hostCall.exitReason?.reason === RegularPVMExitReason.Halt) {
        const readable = context.memory.canRead(context.registers.w7().value, Number(context.registers.w8()));
        if (readable) {
            return {
                gasUsed: gas_prime,
                res: new WorkOutputImpl(context.memory.getBytes(context.registers.w7().value, Number(context.registers.w8()))),
                out: hostCall.out,
            };
        }
        else {
            return {
                gasUsed: gas_prime,
                res: new WorkOutputImpl(new Uint8Array()),
                out: hostCall.out,
            };
        }
    }
    else {
        return {
            gasUsed: gas_prime,
            res: WorkOutputImpl.panic(),
            out: hostCall.out,
        };
    }
};

const AccumulateArgsCodec = createCodec([
    ["t", E_int()],
    ["s", E_int()],
    ["bold_i_length", E_int()],
]);
/**
 * Accumulate State Transition Function
 * ΨA in the graypaper
 * $(0.7.0 - B.9)
 * accumulation is defined in section 12
 */
const accumulateInvocation = (pvmAccState, // bold_e
t, // t
s, // s
gas, // g
accumulateOps, // bold_i
deps) => {
    const iRes = I_fn(pvmAccState, s, deps.p_eta_0, deps.p_tau);
    const yRes = iRes.clone();
    const bold_c = pvmAccState.accounts.get(s)?.code();
    // first case
    if (typeof bold_c === "undefined" || bold_c.length > SERVICECODE_MAX_SIZE) {
        return new AccumulationOutImpl({
            postState: pvmAccState,
            deferredTransfers: new DeferredTransfersImpl([]),
            yield: undefined,
            gasUsed: toTagged(0n),
            provisions: [],
        });
    }
    const mres = argumentInvocation(bold_c, 5, // instructionPointer
    gas, encodeWithCodec(AccumulateArgsCodec, {
        t: t.value,
        s,
        bold_i_length: accumulateOps.length,
    }), F_fn$1(t, deps.core, accumulateOps, deps.p_eta_0, s), { x: iRes, y: yRes });
    return C_fn(mres.gasUsed, mres.res, mres.out);
};
/**
 * $(0.7.0 - B.10)
 */
const I_fn = (pvmAccState, // bold_e
service, // s
p_eta_0, p_tau) => {
    const d = pvmAccState.accounts.clone();
    d.delete(service);
    const newServiceIndex = ((E_4_int.decode(Hashing.blake2b(encodeWithCodec(createCodec([
        ["s", E_sub_int(4)],
        ["p_eta_0", HashCodec],
        ["tau", asCodec(SlotImpl)],
    ]), { s: service, p_eta_0, tau: p_tau }))).value %
        (2 ** 32 - 2 ** 9)) +
        2 ** 8);
    const i = check_fn(newServiceIndex, pvmAccState.accounts);
    return new PVMResultContextImpl({
        id: service,
        state: pvmAccState.clone(),
        nextFreeID: i,
        transfers: new DeferredTransfersImpl([]),
        yield: undefined,
        provisions: [],
    });
};
/**
 * $(0.7.1 - B.11)
 */
const F_fn$1 = (tau, core, accumulateOps, // bold_i
p_eta_0, serviceIndex) => (input) => {
    const fnIdentifier = FnsDb.byCode.get(input.hostCallOpcode);
    assert(typeof fnIdentifier === "string", `Unknown identifier for ${input.hostCallOpcode}`);
    const bold_s = input.out.x.bold_s();
    const e_bold_d = input.out.x.state.accounts;
    switch (fnIdentifier) {
        case "read": {
            const exitReason = applyMods(input.ctx, input.out, hostFunctions.read(input.ctx, {
                bold_s,
                s: input.out.x.id,
                bold_d: e_bold_d,
            }));
            // apply mods in G
            G_fn(input, bold_s);
            return exitReason;
        }
        case "fetch": {
            const m = applyMods(input.ctx, input.out, hostFunctions.fetch(input.ctx, {
                n: p_eta_0,
                // We know that this is out of 0.7.0 spec as
                // gp at 0.7.0 sets bold_o to operand and input does not exist.
                // but this is easy enough in the number of requested changes
                bold_o: accumulateOps
                    .filter((a) => a.isOperand())
                    .map((a) => a.operand),
            }));
            G_fn(input, bold_s);
            return m;
        }
        case "write": {
            const out = { bold_s };
            const m = applyMods(input.ctx, out, hostFunctions.write(input.ctx, {
                bold_s,
                s: input.out.x.id,
            }));
            // G_fn(m.ctx, m.out.bold_s, input.out);
            // bold_s is modified within applyMods
            // most likely the instance is changed
            G_fn(input, out.bold_s);
            return m;
        }
        case "lookup": {
            const m = applyMods(input.ctx, input.out, hostFunctions.lookup(input.ctx, {
                bold_s,
                s: input.out.x.id,
                bold_d: e_bold_d,
            }));
            G_fn(input, bold_s);
            return m;
        }
        case "gas": {
            const m = applyMods(input.ctx, input.out, hostFunctions.gas(input.ctx, undefined));
            G_fn(input, bold_s);
            return m;
        }
        case "info": {
            const m = applyMods(input.ctx, input.out, hostFunctions.info(input.ctx, {
                bold_d: e_bold_d,
                s: input.out.x.id,
            }));
            G_fn(input, bold_s);
            return m;
        }
        case "bless":
            return applyMods(input.ctx, input.out, hostFunctions.bless(input.ctx, input.out.x));
        case "assign":
            return applyMods(input.ctx, input.out, hostFunctions.assign(input.ctx, input.out.x));
        case "designate":
            return applyMods(input.ctx, input.out, hostFunctions.designate(input.ctx, input.out.x));
        case "checkpoint":
            return applyMods(input.ctx, input.out, hostFunctions.checkpoint(input.ctx, input.out.x));
        case "new":
            return applyMods(input.ctx, input.out, hostFunctions.new(input.ctx, { x: input.out.x, tau }));
        case "upgrade":
            return applyMods(input.ctx, input.out, hostFunctions.upgrade(input.ctx, input.out.x));
        case "transfer":
            return applyMods(input.ctx, input.out, hostFunctions.transfer(input.ctx, input.out.x));
        case "eject":
            return applyMods(input.ctx, input.out, hostFunctions.eject(input.ctx, { x: input.out.x, tau }));
        case "query":
            return applyMods(input.ctx, input.out, hostFunctions.query(input.ctx, input.out.x));
        case "solicit":
            return applyMods(input.ctx, input.out, hostFunctions.solicit(input.ctx, { x: input.out.x, tau }));
        case "forget":
            return applyMods(input.ctx, input.out, hostFunctions.forget(input.ctx, { x: input.out.x, tau }));
        case "yield":
            return applyMods(input.ctx, input.out, hostFunctions.yield(input.ctx, input.out.x));
        case "provide":
            return applyMods(input.ctx, input.out, hostFunctions.provide(input.ctx, { x: input.out.x, s: serviceIndex }));
        case "log":
            return applyMods(input.ctx, input.out, hostFunctions.log(input.ctx, { core, serviceIndex }));
    }
    throw new Error("not implemented" + input.hostCallOpcode);
};
/**
 * $(0.7.1 - B.12)
 */
const G_fn = (data, serviceAccount) => {
    const x_star = data.out.x.clone();
    x_star.state.accounts.set(data.out.x.id, serviceAccount);
    data.out.x = x_star;
};
/**
 * $(0.7.1 - B.13)
 */
const C_fn = (gas, o, d) => {
    if (o.isPanic() || o.isOutOfGas()) {
        return new AccumulationOutImpl({
            postState: d.y.state,
            deferredTransfers: d.y.transfers,
            yield: d.y.yield,
            gasUsed: toTagged(gas),
            provisions: d.y.provisions,
        });
    }
    else if (o.isSuccess() && o.success.length === 32) {
        return new AccumulationOutImpl({
            postState: d.x.state,
            deferredTransfers: d.x.transfers,
            yield: HashCodec.decode(o.success).value,
            gasUsed: toTagged(gas),
            provisions: d.x.provisions,
        });
    }
    else {
        return new AccumulationOutImpl({
            postState: d.x.state,
            deferredTransfers: d.x.transfers,
            yield: d.x.yield,
            gasUsed: toTagged(gas),
            provisions: d.x.provisions,
        });
    }
};

/**
 * Decides which reports to accumulate and accumulates them
 * computes a series of posterior states
 */
const accumulateReports = (r, deps) => {
    /*
     * Integrate state to calculate several posterior state
     */
    const r_q = r.queueable(deps.accumulationHistory);
    // console.log({ w_q: w_q });
    const r_star = r.accumulatableReports({
        accQueue: deps.accumulationQueue,
        accHistory: deps.accumulationHistory,
        p_tau: deps.p_tau,
    });
    // $(0.7.0 - 12.23) | g
    const g = [
        TOTAL_GAS_ACCUMULATION_ALL_CORES, //GT
        TOTAL_GAS_ACCUMULATION_LOGIC * BigInt(CORES) + // GA*C
            [...deps.privServices.alwaysAccers.values()].reduce((a, b) => a + b, 0n),
    ].reduce((a, b) => (a < b ? b : a));
    // $(0.7.1 - 12.24) | e
    const preState = new PVMAccumulationStateImpl({
        accounts: deps.serviceAccounts,
        stagingSet: deps.iota,
        authQueue: deps.authQueue,
        manager: deps.privServices.manager,
        assigners: deps.privServices.assigners,
        delegator: deps.privServices.delegator,
        // registrar: deps.privServices.registrar,
        alwaysAccers: deps.privServices.alwaysAccers,
    });
    // $(0.7.0 - 12.24)
    const { nAccumulatedWork, // `n`
    postAccState, // `e'`
    transfers, lastAccOutputs, // θ′
    gasUsed, // `bold u`
     } = outerAccumulation(g, r_star, preState, // e
    deps.privServices.alwaysAccers, {
        p_tau: deps.p_tau,
        p_eta_0: deps.p_eta_0,
    });
    const accumulationStatistics = AccumulationStatisticsImpl.compute({
        r_star,
        nAccumulatedWork,
        gasUsed,
    });
    // calculate posterior acc history
    const p_accumulationHistory = deps.accumulationHistory.toPosterior({
        r_star,
        nAccumulatedWork,
    });
    // calculate p_accumulationQueue
    const p_accumulationQueue = deps.accumulationQueue.toPosterior({
        tau: deps.tau,
        p_tau: deps.p_tau,
        r_q,
        p_accumulationHistory: p_accumulationHistory,
    });
    // end of calculation of posterior accumulation queue
    return {
        p_accumulationHistory,
        p_accumulationQueue,
        deferredTransfers: transfers,
        p_mostRecentAccumulationOutputs: toPosterior(lastAccOutputs),
        p_privServices: toPosterior(new PrivilegedServicesImpl({
            manager: postAccState.manager,
            delegator: postAccState.delegator,
            assigners: postAccState.assigners,
            alwaysAccers: postAccState.alwaysAccers,
            // registrar: postAccState.registrar,
        })),
        d_delta: toDagger(postAccState.accounts),
        p_iota: toPosterior(postAccState.stagingSet),
        p_authQueue: toPosterior(postAccState.authQueue),
        accumulationStatistics,
    };
};
/**
 * `∆+`
 * @param gasLimit - `g`
 * @param works - `bold_r`
 * @param accState - `bold_e` initial partial accumulation state
 * @param freeAccServices - `bold_f`
 * @see $(0.7.0 - 12.16)
 */
const outerAccumulation = (gasLimit, works, accState, freeAccServices, deps) => {
    let sum = 0n;
    let i = 0;
    // TODO: rewrite this to a more elegant solution
    for (const w of works) {
        sum += w.digests.reduce((a, r) => a + r.gasLimit, 0n);
        if (sum <= gasLimit) {
            i++;
        }
        else {
            break;
        }
    }
    if (i == 0) {
        return {
            nAccumulatedWork: 0,
            postAccState: accState,
            transfers: DeferredTransfersImpl.newEmpty(),
            lastAccOutputs: new LastAccOutsImpl([]),
            gasUsed: { elements: [] },
        };
    }
    //const [newAccState /* e_star */, t_star, b_star, u_star]
    const { postAccState: newAccState /* e_star */, transfers: t_star, accOut: b_star, gasUsed: u_star, } = parallelizedAccumulation(accState, works.slice(0, i), freeAccServices, deps);
    const consumedGas = u_star.elements
        .map((a) => a.gasUsed)
        .reduce((s, e) => (s + e), 0n);
    const { postAccState: finalAccState /* e' */, lastAccOutputs: b, transfers: bold_t, gasUsed: u, nAccumulatedWork: j, } = outerAccumulation((gasLimit - consumedGas), works.slice(i), newAccState, new Map(), deps);
    return {
        nAccumulatedWork: i + j,
        transfers: new DeferredTransfersImpl([
            ...t_star.elements,
            ...bold_t.elements,
        ]),
        postAccState: finalAccState,
        lastAccOutputs: LastAccOutsImpl.union(b_star, b),
        gasUsed: { elements: u_star.elements.concat(u.elements) },
    };
};
/**
 * `∆*` fn
 * @param accState - `bold_e` initial partial accumulation state
 * @param transfers - `bold_t`
 * @param works - `bold_w`
 *
 * $(0.7.0 - 12.17)
 * $(0.7.1 - 12.20) is calculated in place
 */
const parallelizedAccumulation = (accState, works, bold_f, deps) => {
    const bold_s = [
        ...new Set([
            ...works.map((wr) => wr.digests.map((r) => r.serviceIndex)).flat(),
            ...bold_f.keys(),
        ]).values(),
    ];
    const bold_u = { elements: [] };
    const accumulatedServices = new Map();
    const bold_t = new DeferredTransfersImpl([]);
    const bold_b = new LastAccOutsImpl([]);
    const accumulateS = (s) => {
        let accRes = accumulatedServices.get(s);
        if (typeof accRes === "undefined") {
            accRes = singleServiceAccumulation(accState, works, bold_f, s, deps);
            accumulatedServices.set(s, accRes);
        }
        return accRes;
    };
    bold_s.forEach((s) => {
        const acc = accumulateS(s);
        bold_u.elements.push({ serviceIndex: s, gasUsed: acc.gasUsed });
        if (typeof acc.yield !== "undefined") {
            bold_b.add(s, acc.yield);
        }
        // we concat directly here
        bold_t.elements.push(...acc.deferredTransfers.elements);
    });
    const delta = accState.accounts.clone();
    // should contain "removed" services
    const m = new Set();
    // should contain "added/updated" services
    const n = new DeltaImpl();
    for (let i = 0; i < bold_s.length; i++) {
        const s = bold_s[i];
        const acc = accumulatedServices.get(s);
        for (const k of acc.postState.accounts.services()) {
            // if k is a new service and it's not the current one
            if (!delta.has(k) || k === s) {
                n.set(k, acc.postState.accounts.get(k));
            }
        }
        for (const k of delta.services()) {
            if (!acc.postState.accounts.has(k)) {
                m.add(k);
            }
        }
    }
    const tmpDelta = DeltaImpl.union(delta, n);
    for (const k of m) {
        tmpDelta.delete(k);
    }
    const delta_prime = tmpDelta.preimageIntegration([...accumulatedServices.values()].map((a) => a.provisions).flat(), deps.p_tau);
    const eStar = accumulateS(accState.manager).postState;
    const a_prime = structuredClone(accState.assigners); // safe as of 0.7.1
    for (let c = 0; c < CORES; c++) {
        a_prime[c] = accumulateS(eStar.assigners[c]).postState.assigners[c];
    }
    let v_prime = structuredClone(accState.delegator); // safe as of 0.7.1
    if (accState.delegator !== eStar.delegator) {
        v_prime = accumulateS(accState.delegator).postState.delegator;
    }
    const i_prime = accumulateS(accState.delegator).postState.stagingSet;
    const q_prime = new AuthorizerQueueImpl({ elements: toTagged([]) });
    for (let c = 0; c < CORES; c++) {
        q_prime.elements[c] = accumulateS(accState.assigners[c]).postState.authQueue.elements[c];
    }
    const newState = new PVMAccumulationStateImpl({
        accounts: delta_prime,
        stagingSet: i_prime,
        authQueue: q_prime,
        manager: eStar.manager,
        assigners: a_prime,
        delegator: v_prime,
        alwaysAccers: eStar.alwaysAccers,
    });
    return {
        postAccState: newState,
        transfers: bold_t,
        accOut: bold_b,
        gasUsed: bold_u,
    };
};
/**
 * `∆1` fn
 * @param preState - `bold_e`
 * @param reports - `bold_r`
 * @param gasPerService - `bold_f`
 * @param service - `s`
 * @see $(0.7.0 - 12.21)
 *
 */
const singleServiceAccumulation = (preState, reports, gasPerService, service, deps) => {
    let g = (gasPerService.get(service) || 0n);
    reports.forEach((wr) => wr.digests
        .filter((r) => r.serviceIndex === service)
        .forEach((r) => (g = (g + r.gasLimit))));
    const bold_i = [];
    let core = 0;
    for (const r of reports) {
        for (const d of r.digests) {
            if (d.serviceIndex === service) {
                core = r.core;
                bold_i.push(new AccumulationInputInpl({
                    operand: new PVMAccumulationOpImpl({
                        result: d.result,
                        gasLimit: d.gasLimit,
                        payloadHash: d.payloadHash,
                        authTrace: r.authTrace,
                        segmentRoot: r.avSpec.segmentRoot,
                        packageHash: r.avSpec.packageHash,
                        authorizerHash: r.authorizerHash,
                    }),
                }));
            }
        }
    }
    const toRet = accumulateInvocation(preState, deps.p_tau, service, g, bold_i, {
        core,
        p_tau: deps.p_tau,
        p_eta_0: deps.p_eta_0,
    });
    return toRet;
};

var AssurancesExtrinsicImpl_1;
/**
 * Single extrinsic element
 * codec order defined in $(0.7.1 - C.27)
 */
let AssuranceExtrinsicImpl = class AssuranceExtrinsicImpl extends BaseJamCodecable {
    /**
     * $(0.7.1 - 11.13)
     */
    isSignatureValid(deps) {
        return Ed25519.verifySignature(this.signature, deps.kappa.at(this.validatorIndex).ed25519, new Uint8Array([
            ...JAM_AVAILABLE, // XA
            ...Hashing.blake2b(new Uint8Array([
                ...encodeWithCodec(HashCodec, deps.headerParent),
                ...encodeWithCodec(BitSequenceCodec(CORES), this.bitstring),
            ])),
        ]));
    }
    isValid(deps) {
        // begin with $(0.7.1 - 11.10)
        if (this.validatorIndex >= NUMBER_OF_VALIDATORS) {
            return false;
        }
        if (this.bitstring.length !== CORES) {
            return false;
        }
        // $(0.7.1 - 11.11)
        if (compareUint8Arrays(this.anchorHash, deps.headerParent) !== 0) {
            return false;
        }
        // $(0.7.1 - 11.15)
        for (let c = 0; c < CORES; c++) {
            if (this.bitstring[c] === 1) {
                // af[c]
                // bit must be set only if corresponding core has a report pending availability
                if (typeof deps.d_rho.elementAt(c) === "undefined") {
                    return false;
                }
            }
        }
        // $(0.7.1 - 11.13)
        return this.isSignatureValid({
            kappa: deps.kappa,
            headerParent: deps.headerParent,
        });
    }
};
__decorate$1([
    codec$1(HashCodec, "anchor"),
    __metadata$1("design:type", Object)
], AssuranceExtrinsicImpl.prototype, "anchorHash", void 0);
__decorate$1([
    bitSequenceCodec(CORES, "bitfield"),
    __metadata$1("design:type", Object)
], AssuranceExtrinsicImpl.prototype, "bitstring", void 0);
__decorate$1([
    eSubIntCodec(2, "validator_index"),
    __metadata$1("design:type", Number)
], AssuranceExtrinsicImpl.prototype, "validatorIndex", void 0);
__decorate$1([
    codec$1(xBytesCodec(64), "signature"),
    __metadata$1("design:type", Object)
], AssuranceExtrinsicImpl.prototype, "signature", void 0);
AssuranceExtrinsicImpl = __decorate$1([
    JamCodecable()
], AssuranceExtrinsicImpl);
/**
 * Assurances Extrinsic
 * $(0.7.1 - C.20) | codec
 */
let AssurancesExtrinsicImpl = AssurancesExtrinsicImpl_1 = class AssurancesExtrinsicImpl extends BaseJamCodecable {
    constructor(elements = []) {
        super();
        this.elements = toTagged(elements);
    }
    nPositiveVotes(core) {
        return this.elements.reduce((a, b) => a + b.bitstring[core], 0);
    }
    checkValidity(deps) {
        // $(0.7.1 - 11.10)
        if (this.elements.length > NUMBER_OF_VALIDATORS) {
            return err(EAValidationError.EA_TOO_MANY_VALIDATORS);
        }
        // $(0.7.1 - 11.12)
        for (let i = 1; i < this.elements.length; i++) {
            if (this.elements[i - 1].validatorIndex >= this.elements[i].validatorIndex) {
                return err(EAValidationError.EA_VALIDATORS_NOT_ORDERED_OR_UNIQUE);
            }
        }
        for (let i = 0; i < this.elements.length; i++) {
            if (!this.elements[i].isValid({
                headerParent: deps.headerParent,
                kappa: deps.kappa,
                d_rho: deps.d_rho,
            })) {
                return err(EAValidationError.EA_SINGLE_ELEMENT_INVALID);
            }
        }
        return ok(toTagged(this));
    }
    /**
     * Computes `bold R` in
     * $(0.7.1 - 11.16)
     */
    static newlyAvailableReports(ea, d_rho) {
        const bold_R = new NewWorkReportsImpl();
        for (let c = 0; c < CORES; c++) {
            const sum = ea.nPositiveVotes(c);
            if (sum > (NUMBER_OF_VALIDATORS * 2) / 3) {
                bold_R.elements.push(d_rho.elementAt(c).workReport);
            }
        }
        return bold_R;
    }
    static newEmpty() {
        return new AssurancesExtrinsicImpl_1([]);
    }
};
__decorate$1([
    lengthDiscriminatedCodec(AssuranceExtrinsicImpl, SINGLE_ELEMENT_CLASS),
    __metadata$1("design:type", Object)
], AssurancesExtrinsicImpl.prototype, "elements", void 0);
AssurancesExtrinsicImpl = AssurancesExtrinsicImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Array])
], AssurancesExtrinsicImpl);
var EAValidationError;
(function (EAValidationError) {
    EAValidationError["EA_TOO_MANY_VALIDATORS"] = "EA_TOO_MANY_VALIDATORS";
    EAValidationError["EA_VALIDATORS_NOT_ORDERED_OR_UNIQUE"] = "EA_VALIDATORS_NOT_ORDERED_OR_UNIQUE";
    EAValidationError["EA_SINGLE_ELEMENT_INVALID"] = "EA_SINGLE_ELEMENT_INVALID";
})(EAValidationError || (EAValidationError = {}));

const serviceAccountDataCodec = createCodec([
    ["codeHash", xBytesCodec(32)],
    ["balance", E_sub(8)],
    ["minAccGas", E_sub(8)],
    ["minMemoGas", E_sub(8)],
    ["totalOctets", E_sub(8)],
    ["gratis", E_sub(8)],
    ["itemInStorage", E_sub_int(4)],
    ["created", asCodec(SlotImpl)],
    ["lastAcc", asCodec(SlotImpl)],
    ["parent", E_sub_int(4)],
]);
const bits = (ar) => {
    const a = [...ar]
        .map((a) => a
        .toString(2)
        .padStart(8, "0")
        .split("")
        .map((a) => parseInt(a)))
        .flat();
    return a;
};
// $(0.7.1 - D.3)
const B_fn = (l, r) => {
    return new Uint8Array([
        l[0] & 0b01111111,
        ...l.subarray(1),
        ...r,
    ]);
};
// $(0.7.1 - D.4) | implementation avoids using bits()
const L_fn = (k, v) => {
    if (v.length <= 32) {
        return new Uint8Array([
            0b10000000 + v.length,
            ...k,
            ...v,
            ...new Array(32 - v.length).fill(0),
        ]);
    }
    else {
        return new Uint8Array([
            0b11000000,
            ...k,
            ...Hashing.blake2b(v),
        ]);
    }
};
// $(0.7.1 - D.6)
const M_fn$1 = (d) => {
    if (d.size === 0) {
        return new Uint8Array(32).fill(0);
    }
    else if (d.size === 1) {
        const [[k, v]] = d.values();
        return Hashing.blake2b(L_fn(k, v));
    }
    else {
        const l = new Map([...d.entries()]
            .filter(([k]) => k[0] === 0)
            .map(([k, v]) => [k.slice(1), v]));
        const r = new Map([...d.entries()]
            .filter(([k]) => k[0] === 1)
            .map(([k, v]) => [k.slice(1), v]));
        return Hashing.blake2b(B_fn(M_fn$1(l), M_fn$1(r)));
    }
};
/*
 * `T(σ)`
 * $(0.7.0 - D.2)
 */
const merkleStateMap = (state) => {
    const toRet = new IdentityMap();
    toRet.set(stateKey(1), state.authPool.toBinary());
    toRet.set(stateKey(2), state.authQueue.toBinary());
    // β
    toRet.set(stateKey(3), state.beta.toBinary());
    toRet.set(stateKey(4), state.safroleState.toBinary());
    // 5
    toRet.set(stateKey(5), state.disputes.toBinary());
    // 6
    toRet.set(stateKey(6), state.entropy.toBinary());
    // 7
    toRet.set(stateKey(7), state.iota.toBinary());
    // 8
    toRet.set(stateKey(8), state.kappa.toBinary());
    // 9
    toRet.set(stateKey(9), state.lambda.toBinary());
    // 10
    toRet.set(stateKey(10), state.rho.toBinary());
    // 11
    toRet.set(stateKey(11), state.slot.toBinary());
    // 12
    toRet.set(stateKey(12), state.privServices.toBinary());
    // 13
    toRet.set(stateKey(13), state.statistics.toBinary());
    // 14
    toRet.set(stateKey(14), state.accumulationQueue.toBinary());
    // 15 - accumulationHistory
    toRet.set(stateKey(15), state.accumulationHistory.toBinary());
    // 16 thetha
    toRet.set(stateKey(16), state.mostRecentAccumulationOutputs.toBinary());
    for (const [serviceIndex, serviceAccount] of state.serviceAccounts.elements) {
        toRet.set(stateKey(255, serviceIndex), encodeWithCodec(serviceAccountDataCodec, {
            ...serviceAccount,
            itemInStorage: serviceAccount.itemInStorage(),
            totalOctets: serviceAccount.totalOctets(),
        }));
        for (const [h, p] of serviceAccount.preimages) {
            const pref = encodeWithCodec(E_4_int, (2 ** 32 - 2));
            toRet.set(stateKey(serviceIndex, new Uint8Array([...pref, ...h])), p);
        }
        for (const [stateKey, v] of serviceAccount.merkleStorage.entries()) {
            toRet.set(stateKey, v);
        }
    }
    return toRet;
};

class JamStateImpl {
    constructor(config) {
        Object.assign(this, config);
    }
    merkleRoot() {
        const stateMap = merkleStateMap(this);
        return M_fn$1(new Map([...stateMap.entries()].map(([k, v]) => {
            return [bits(k), [k, v]];
        })));
    }
    applyBlock(newBlock) {
        assert(this.block, "Cannot apply block to a state without a block");
        // $(0.7.1 - 6.1)
        const proposed_p_tau = toPosterior(newBlock.header.slot);
        const [tauErr, p_tau] = proposed_p_tau.checkPTauValid(this.slot).safeRet();
        if (typeof tauErr !== "undefined") {
            return err(tauErr);
        }
        // $(0.7.1 - 6.13)
        const p_kappa = this.kappa.toPosterior(this, { p_tau });
        const p_lambda = this.lambda.toPosterior(this, { p_tau });
        const p_entropy = this.entropy
            .rotate1_3({
            slot: this.slot,
            p_tau,
        })
            .toPosterior({
            vrfOutputHash: Bandersnatch.vrfOutputSignature(newBlock.header.entropySource),
        });
        const [dispExErr, disputesExtrinsic] = newBlock.extrinsics.disputes
            .checkValidity({
            disputesState: this.disputes,
            tau: this.slot,
            kappa: this.kappa,
            lambda: this.lambda,
        })
            .safeRet();
        if (typeof dispExErr !== "undefined") {
            return err(dispExErr);
        }
        const [p_disputesError, p_disputes] = this.disputes
            .toPosterior({
            kappa: this.kappa,
            lambda: this.lambda,
            extrinsic: disputesExtrinsic,
        })
            .safeRet();
        if (typeof p_disputesError !== "undefined") {
            return err(p_disputesError);
        }
        const p_gamma_p = this.safroleState.gamma_p.toPosterior({
            slot: this.slot,
            iota: this.iota,
            p_tau,
            p_offenders: toPosterior(p_disputes.offenders),
        });
        const p_gamma_z = this.safroleState.gamma_z.toPosterior({
            slot: this.slot,
            p_tau,
            p_gamma_p,
        });
        const [newTicketsErr, newTickets] = newBlock.extrinsics.tickets
            .newTickets({
            p_tau,
            p_gamma_z,
            gamma_a: this.safroleState.gamma_a,
            p_entropy,
        })
            .safeRet();
        if (typeof newTicketsErr !== "undefined") {
            return err(newTicketsErr);
        }
        const p_gamma_s = this.safroleState.gamma_s.toPosterior({
            slot: this.slot,
            safroleState: this.safroleState,
            p_tau,
            p_kappa,
            p_eta2: toPosterior(p_entropy._2),
        });
        const [p_gamma_aErr, p_gamma_a] = this.safroleState.gamma_a
            .toPosterior({
            slot: this.slot,
            p_tau,
            newTickets,
        })
            .safeRet();
        if (typeof p_gamma_aErr !== "undefined") {
            return err(p_gamma_aErr);
        }
        const p_safroleState = this.safroleState.toPosterior({
            p_gamma_p,
            p_gamma_z,
            p_gamma_a,
            p_gamma_s,
        });
        //now we can check the header
        const [headerErr] = newBlock.header
            .checkValidity({
            disputesExtrinsic,
            p_kappa,
            extrinsicHash: newBlock.extrinsics.extrinsicHash(),
            curState: this,
            prevHeader: this.block.header,
            p_entropy_3: toPosterior(p_entropy._3),
            p_gamma_s,
            p_gamma_p,
        })
            .safeRet();
        if (typeof headerErr !== "undefined") {
            return err(headerErr);
        }
        const d_rho = this.rho.toDagger({ p_disputes });
        const [eaError, validatedEA] = newBlock.extrinsics.assurances
            .checkValidity({
            headerParent: this.block.header.signedHash(),
            kappa: this.kappa,
            d_rho,
        })
            .safeRet();
        if (typeof eaError !== "undefined") {
            return err(eaError);
        }
        const bold_R = AssurancesExtrinsicImpl.newlyAvailableReports(validatedEA, d_rho);
        const { p_accumulationHistory, p_accumulationQueue, p_mostRecentAccumulationOutputs, deferredTransfers, p_privServices, d_delta, p_iota, p_authQueue, accumulationStatistics, } = accumulateReports(bold_R, {
            tau: this.slot,
            p_tau,
            accumulationHistory: this.accumulationHistory,
            accumulationQueue: this.accumulationQueue,
            authQueue: this.authQueue,
            serviceAccounts: this.serviceAccounts,
            privServices: this.privServices,
            iota: this.iota,
            p_eta_0: toPosterior(p_entropy._0),
        });
        const d_beta = this.beta.toDagger(newBlock.header.parentStateRoot);
        const invokedTransfers = deferredTransfers.invokedTransfers({
            d_delta,
            p_tau,
            p_eta_0: p_entropy._0,
        });
        const dd_delta = d_delta.toDoubleDagger({
            p_tau,
            invokedTransfers,
            accumulationStatistics,
        });
        const [epError, validatedEP] = newBlock.extrinsics.preimages
            .checkValidity({ serviceAccounts: this.serviceAccounts })
            .safeRet();
        if (epError) {
            return err(epError);
        }
        const p_delta = dd_delta.toPosterior({
            p_tau,
            ep: validatedEP,
        });
        const dd_rho = d_rho.toDoubleDagger({
            p_tau,
            newReports: bold_R,
            rho: this.rho,
        });
        const [egError, validatedEG] = newBlock.extrinsics.reportGuarantees
            .checkValidity({
            beta: this.beta,
            rho: this.rho,
            accumulationHistory: this.accumulationHistory,
            accumulationQueue: this.accumulationQueue,
            authPool: this.authPool,
            headerLookupHistory: this.headerLookupHistory,
            serviceAccounts: this.serviceAccounts,
            dd_rho,
            d_recentHistory: toDagger(d_beta.recentHistory),
            p_entropy,
            p_kappa,
            p_lambda,
            p_disputes,
            p_tau,
        })
            .safeRet();
        if (typeof egError !== "undefined") {
            return err(egError);
        }
        const p_rho = dd_rho.toPosterior({
            p_tau,
            EG_Extrinsic: validatedEG,
        });
        const headerHash = newBlock.header.signedHash();
        const p_beta = d_beta.toPosterior({
            headerHash,
            eg: validatedEG,
            p_theta: p_mostRecentAccumulationOutputs,
        });
        const p_statistics = this.statistics.toPosterior({
            tau: this.slot,
            p_tau,
            extrinsics: newBlock.extrinsics,
            ea: validatedEA,
            ep: validatedEP,
            d_rho,
            p_disputes,
            authorIndex: newBlock.header.authorIndex,
            p_entropy,
            p_kappa,
            p_lambda,
            accumulationStatistics,
            transferStatistics: deferredTransfers.statistics(invokedTransfers),
        });
        const p_authPool = this.authPool.toPosterior({
            p_tau,
            eg: validatedEG,
            p_queue: p_authQueue,
        });
        const p_headerLookupHistory = this.headerLookupHistory.toPosterior({
            header: newBlock.header,
        });
        const p_state = toPosterior(new JamStateImpl({
            block: newBlock,
            entropy: p_entropy,
            slot: newBlock.header.slot,
            iota: toTagged(p_iota),
            authPool: p_authPool,
            authQueue: p_authQueue,
            safroleState: p_safroleState,
            statistics: p_statistics,
            rho: p_rho,
            serviceAccounts: p_delta,
            beta: p_beta,
            accumulationQueue: p_accumulationQueue,
            accumulationHistory: p_accumulationHistory,
            privServices: p_privServices,
            lambda: toTagged(p_lambda),
            kappa: toTagged(p_kappa),
            disputes: p_disputes,
            headerLookupHistory: p_headerLookupHistory,
            mostRecentAccumulationOutputs: p_mostRecentAccumulationOutputs,
        }));
        return ok(p_state);
    }
}

var SingleServiceStatisticsImpl_1;
let SingleServiceStatisticsImpl = SingleServiceStatisticsImpl_1 = class SingleServiceStatisticsImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        if (typeof config !== "undefined") {
            Object.assign(this, config);
        }
    }
    static newEmpty() {
        return new SingleServiceStatisticsImpl_1({
            providedCount: 0,
            providedSize: 0,
            refinementCount: 0,
            refinementGasUsed: 0n,
            importCount: 0,
            extrinsicCount: 0,
            extrinsicSize: 0,
            exportCount: 0,
            accumulateCount: 0,
            accumulateGasUsed: 0n,
            transfersCount: 0,
            transfersGasUsed: 0n,
        });
    }
};
__decorate$1([
    eIntCodec("provided_count"),
    __metadata$1("design:type", Number)
], SingleServiceStatisticsImpl.prototype, "providedCount", void 0);
__decorate$1([
    eIntCodec("provided_size"),
    __metadata$1("design:type", Number)
], SingleServiceStatisticsImpl.prototype, "providedSize", void 0);
__decorate$1([
    eIntCodec("refinement_count"),
    __metadata$1("design:type", Number)
], SingleServiceStatisticsImpl.prototype, "refinementCount", void 0);
__decorate$1([
    eBigIntCodec("refinement_gas_used"),
    __metadata$1("design:type", BigInt)
], SingleServiceStatisticsImpl.prototype, "refinementGasUsed", void 0);
__decorate$1([
    eIntCodec("imports"),
    __metadata$1("design:type", Number)
], SingleServiceStatisticsImpl.prototype, "importCount", void 0);
__decorate$1([
    eIntCodec("exports"),
    __metadata$1("design:type", Number)
], SingleServiceStatisticsImpl.prototype, "extrinsicCount", void 0);
__decorate$1([
    eIntCodec("extrinsic_size"),
    __metadata$1("design:type", Number)
], SingleServiceStatisticsImpl.prototype, "extrinsicSize", void 0);
__decorate$1([
    eIntCodec("extrinsic_count"),
    __metadata$1("design:type", Number)
], SingleServiceStatisticsImpl.prototype, "exportCount", void 0);
__decorate$1([
    eIntCodec("accumulate_count"),
    __metadata$1("design:type", Number)
], SingleServiceStatisticsImpl.prototype, "accumulateCount", void 0);
__decorate$1([
    eBigIntCodec("accumulate_gas_used"),
    __metadata$1("design:type", BigInt)
], SingleServiceStatisticsImpl.prototype, "accumulateGasUsed", void 0);
__decorate$1([
    eIntCodec("on_transfers_count"),
    __metadata$1("design:type", Number)
], SingleServiceStatisticsImpl.prototype, "transfersCount", void 0);
__decorate$1([
    eBigIntCodec("on_transfers_gas_used"),
    __metadata$1("design:type", BigInt)
], SingleServiceStatisticsImpl.prototype, "transfersGasUsed", void 0);
SingleServiceStatisticsImpl = SingleServiceStatisticsImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], SingleServiceStatisticsImpl);

var ServicesStatisticsImpl_1;
let ServicesStatisticsImpl = ServicesStatisticsImpl_1 = class ServicesStatisticsImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        if (typeof config !== "undefined") {
            Object.assign(this, config);
        }
    }
    /**
     * $(0.7.0 - 13.12)
     */
    toPosterior(deps) {
        const toRet = new ServicesStatisticsImpl_1({ elements: new Map() });
        // $(0.7.1 - 13.14)
        const s_r = new Set(deps.guaranteedReports
            .map((r) => r.digests)
            .flat()
            .map((res) => res.serviceIndex));
        // $(0.7.1 - 13.15)
        const s_p = new Set(deps.ep.elements.map((p) => p.requester));
        // $(0.7.1 - 13.13)
        const bold_s = new Set([
            ...s_p,
            ...s_r,
            ...deps.accumulationStatistics.services(),
            ...deps.transferStatistics.keys(),
        ]);
        for (const service of bold_s) {
            const provided = deps.ep.elements
                .filter(({ requester }) => requester === service)
                .map(({ blob }) => ({
                count: 1,
                size: blob.length,
            }))
                .reduce((a, b) => ({
                count: (a.count + b.count),
                size: (a.size + b.size),
            }), { count: 0, size: 0 });
            toRet.elements.set(service, new SingleServiceStatisticsImpl({
                ...R_fn(service, deps.guaranteedReports),
                providedCount: provided.count,
                providedSize: provided.size,
                accumulateCount: deps.accumulationStatistics.get(service)?.count ?? 0,
                accumulateGasUsed: deps.accumulationStatistics.get(service)?.gasUsed ?? 0n,
                transfersCount: deps.transferStatistics.get(service)?.count ?? 0,
                transfersGasUsed: deps.transferStatistics.get(service)?.gasUsed ?? 0n,
            }));
        }
        return toPosterior(toRet);
    }
    static newEmpty() {
        return new ServicesStatisticsImpl_1({ elements: new Map() });
    }
};
__decorate$1([
    jsonCodec(MapJSONCodec({ key: "id", value: "record" }, NumberJSONCodec(), SingleServiceStatisticsImpl), SINGLE_ELEMENT_CLASS),
    binaryCodec(buildGenericKeyValueCodec(E_sub_int(4), SingleServiceStatisticsImpl, (a, b) => a - b)),
    __metadata$1("design:type", Map)
], ServicesStatisticsImpl.prototype, "elements", void 0);
ServicesStatisticsImpl = ServicesStatisticsImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], ServicesStatisticsImpl);
/**
 * $(0.7.1 - 13.16)
 */
const R_fn = (service, 
/**
 * `bold I`
 */
guaranteedReports) => {
    return guaranteedReports
        .map((report) => report.digests)
        .flat()
        .filter((result) => result.serviceIndex === service)
        .map((result) => ({
        refinementCount: 1,
        refinementGasUsed: result.refineLoad.gasUsed,
        importCount: result.refineLoad.importCount,
        extrinsicCount: result.refineLoad.extrinsicCount,
        extrinsicSize: result.refineLoad.extrinsicSize,
        exportCount: result.refineLoad.exportCount,
    }))
        .reduce((a, b) => {
        return {
            refinementCount: (a.refinementCount + b.refinementCount),
            refinementGasUsed: (a.refinementGasUsed + b.refinementGasUsed),
            importCount: (a.importCount + b.importCount),
            extrinsicCount: (a.extrinsicCount + b.extrinsicCount),
            extrinsicSize: (a.extrinsicSize + b.extrinsicSize),
            exportCount: (a.exportCount + b.exportCount),
        };
    }, {
        refinementCount: 0,
        refinementGasUsed: 0n,
        importCount: 0,
        extrinsicCount: 0,
        extrinsicSize: 0,
        exportCount: 0,
    });
};

var SingleValidatorStatisticsImpl_1;
let SingleValidatorStatisticsImpl = SingleValidatorStatisticsImpl_1 = class SingleValidatorStatisticsImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        Object.assign(this, config);
    }
    static newEmpty() {
        return new SingleValidatorStatisticsImpl_1({
            blocks: 0,
            tickets: 0,
            preimageCount: 0,
            preimageSize: 0,
            guarantees: 0,
            assurances: 0,
        });
    }
};
__decorate$1([
    eSubIntCodec(4),
    __metadata$1("design:type", Number)
], SingleValidatorStatisticsImpl.prototype, "blocks", void 0);
__decorate$1([
    eSubIntCodec(4),
    __metadata$1("design:type", Number)
], SingleValidatorStatisticsImpl.prototype, "tickets", void 0);
__decorate$1([
    eSubIntCodec(4),
    __metadata$1("design:type", Number)
], SingleValidatorStatisticsImpl.prototype, "preimageCount", void 0);
__decorate$1([
    eSubIntCodec(4),
    __metadata$1("design:type", Number)
], SingleValidatorStatisticsImpl.prototype, "preimageSize", void 0);
__decorate$1([
    eSubIntCodec(4),
    __metadata$1("design:type", Number)
], SingleValidatorStatisticsImpl.prototype, "guarantees", void 0);
__decorate$1([
    eSubIntCodec(4),
    __metadata$1("design:type", Number)
], SingleValidatorStatisticsImpl.prototype, "assurances", void 0);
SingleValidatorStatisticsImpl = SingleValidatorStatisticsImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], SingleValidatorStatisticsImpl);

var ValidatorStatisticsCollectionImpl_1;
let ValidatorStatisticsCollectionImpl = ValidatorStatisticsCollectionImpl_1 = class ValidatorStatisticsCollectionImpl extends BaseJamCodecable {
    constructor(elements) {
        super();
        if (elements) {
            this.elements = elements;
        }
    }
    static newEmpty() {
        return new ValidatorStatisticsCollectionImpl_1(Array.from({ length: NUMBER_OF_VALIDATORS }, () => SingleValidatorStatisticsImpl.newEmpty()));
    }
};
__decorate$1([
    sequenceCodec(NUMBER_OF_VALIDATORS, SingleValidatorStatisticsImpl),
    __metadata$1("design:type", Object)
], ValidatorStatisticsCollectionImpl.prototype, "elements", void 0);
ValidatorStatisticsCollectionImpl = ValidatorStatisticsCollectionImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Array])
], ValidatorStatisticsCollectionImpl);

var ValidatorStatisticsImpl_1;
/**
 * data types (u32) is given by the codec
 */
let ValidatorStatisticsImpl = ValidatorStatisticsImpl_1 = class ValidatorStatisticsImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        if (typeof config !== "undefined") {
            Object.assign(this, config);
        }
    }
    toPosterior(deps) {
        const reporters = deps.extrinsics.reportGuarantees.reporters({
            p_tau: deps.p_tau,
            p_lambda: deps.p_lambda,
            p_kappa: deps.p_kappa,
            p_disputes: deps.p_disputes,
            p_entropy: deps.p_entropy,
        });
        const toRet = cloneCodecable(this);
        // $(0.7.1 - 13.3 / 13.4)
        let bold_a = toRet.accumulator;
        if (deps.p_tau.isNewerEra(deps.tau)) {
            bold_a = ValidatorStatisticsCollectionImpl.newEmpty();
            toRet.previous = this.accumulator;
        }
        for (let v = 0; v < NUMBER_OF_VALIDATORS; v++) {
            const curV = v === deps.authorIndex;
            // $(0.7.1 - 13.5)
            toRet.accumulator.elements[v] = new SingleValidatorStatisticsImpl({
                blocks: (bold_a.elements[v].blocks + (curV ? 1 : 0)),
                tickets: ((bold_a.elements[v].tickets +
                    (curV ? deps.extrinsics.tickets.elements.length : 0))),
                preimageCount: ((bold_a.elements[v].preimageCount +
                    (curV ? deps.extrinsics.preimages.elements.length : 0))),
                preimageSize: ((bold_a.elements[v].preimageSize +
                    (curV
                        ? deps.extrinsics.preimages.elements.reduce((acc, a) => acc + a.blob.length, 0)
                        : 0))),
                guarantees: ((bold_a.elements[v].guarantees +
                    (reporters.has(deps.p_kappa.at(v).ed25519) ? 1 : 0))),
                assurances: ((bold_a.elements[v].assurances +
                    deps.extrinsics.assurances.elements.filter((a) => a.validatorIndex === v).length)),
            });
        }
        return toRet;
    }
    static newEmpty() {
        return new ValidatorStatisticsImpl_1({
            accumulator: ValidatorStatisticsCollectionImpl.newEmpty(),
            previous: ValidatorStatisticsCollectionImpl.newEmpty(),
        });
    }
};
__decorate$1([
    codec$1(ValidatorStatisticsCollectionImpl),
    __metadata$1("design:type", ValidatorStatisticsCollectionImpl)
], ValidatorStatisticsImpl.prototype, "accumulator", void 0);
__decorate$1([
    codec$1(ValidatorStatisticsCollectionImpl),
    __metadata$1("design:type", ValidatorStatisticsCollectionImpl)
], ValidatorStatisticsImpl.prototype, "previous", void 0);
ValidatorStatisticsImpl = ValidatorStatisticsImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], ValidatorStatisticsImpl);

var JamStatisticsImpl_1;
/**
 * $(0.7.1 - 13.1)
 */
let JamStatisticsImpl = JamStatisticsImpl_1 = class JamStatisticsImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        if (typeof config !== "undefined") {
            Object.assign(this, config);
        }
    }
    toPosterior(deps) {
        const bold_I = deps.extrinsics.reportGuarantees.workReports();
        const bold_R = AssurancesExtrinsicImpl.newlyAvailableReports(deps.ea, deps.d_rho);
        const toRet = new JamStatisticsImpl_1();
        toRet.validators = this.validators.toPosterior({
            tau: deps.tau,
            p_tau: deps.p_tau,
            extrinsics: deps.extrinsics,
            p_disputes: deps.p_disputes,
            authorIndex: deps.authorIndex,
            p_entropy: deps.p_entropy,
            p_kappa: deps.p_kappa,
            p_lambda: deps.p_lambda,
        });
        toRet.cores = this.cores.toPosterior({
            ea: deps.ea,
            d_rho: deps.d_rho,
            bold_I,
            bold_R,
        });
        toRet.services = this.services.toPosterior({
            ep: deps.ep,
            transferStatistics: deps.transferStatistics,
            guaranteedReports: bold_I,
            accumulationStatistics: deps.accumulationStatistics,
        });
        return toPosterior(toRet);
    }
    static newEmpty() {
        return new JamStatisticsImpl_1({
            cores: CoreStatisticsImpl.newEmpty(),
            services: ServicesStatisticsImpl.newEmpty(),
            validators: ValidatorStatisticsImpl.newEmpty(),
        });
    }
};
__decorate$1([
    codec$1(ValidatorStatisticsImpl),
    __metadata$1("design:type", ValidatorStatisticsImpl)
], JamStatisticsImpl.prototype, "validators", void 0);
__decorate$1([
    codec$1(CoreStatisticsImpl),
    __metadata$1("design:type", CoreStatisticsImpl)
], JamStatisticsImpl.prototype, "cores", void 0);
__decorate$1([
    codec$1(ServicesStatisticsImpl),
    __metadata$1("design:type", ServicesStatisticsImpl)
], JamStatisticsImpl.prototype, "services", void 0);
JamStatisticsImpl = JamStatisticsImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], JamStatisticsImpl);

var RHOImpl_1;
let RHOElementImpl = class RHOElementImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        if (typeof config !== "undefined") {
            Object.assign(this, config);
        }
    }
};
__decorate$1([
    codec$1(WorkReportImpl, "report"),
    __metadata$1("design:type", WorkReportImpl)
], RHOElementImpl.prototype, "workReport", void 0);
__decorate$1([
    codec$1(SlotImpl, "timeout"),
    __metadata$1("design:type", SlotImpl)
], RHOElementImpl.prototype, "reportSlot", void 0);
RHOElementImpl = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], RHOElementImpl);
/**
 * `ρ` - tracks WorkReports which have been reported but not
 *       yet available indexed by core index
 * $(0.7.1 - 11.1)
 */
let RHOImpl = RHOImpl_1 = class RHOImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        if (typeof config !== "undefined") {
            Object.assign(this, config);
        }
    }
    elementAt(core) {
        assert(core >= 0 && core < CORES, "Core index out of bounds");
        return this.elements[core];
    }
    /**
     * Input should be the newly added hashes to phi_b and phi_w
     * $(0.7.1 - 10.15)
     */
    toDagger(deps) {
        // NOTE: Andrea this is correct bad contains votes = 0 and wonky < 2/3+1
        // it does change from gp but we assume that if it was already present then
        // rho would have it cleared for the core
        // so this is basically doing the t < 2/3V check
        const sets = new IdentitySet([
            ...deps.p_disputes.bad,
            ...deps.p_disputes.wonky,
        ]);
        const rho_dagger = cloneCodecable(this);
        this.elements.forEach((rho_c, core) => {
            if (typeof rho_c === "undefined") {
                return;
            }
            // Compute report hash
            if (sets.has(rho_c.workReport.hash())) {
                rho_dagger.elements[core] = undefined;
            }
        });
        return toDagger(rho_dagger);
    }
    /**
     * converts Dagger<RHO> to DoubleDagger<RHO>
     * $(0.7.1 - 11.17)
     */
    toDoubleDagger(deps) {
        const newState = cloneCodecable(this);
        for (let c = 0; c < CORES; c++) {
            if (typeof this.elements[c] === "undefined") {
                continue; // if no  workreport indagger then there is nothing to remove.
            }
            if (typeof deps.rho.elements[c] === "undefined") {
                continue;
            }
            // check if workreport from rho has now become available
            // we use this by creating a set of report hashes and cheching if 'p[c]r' is in it
            const newReportsSet = new IdentitySet(deps.newReports.elements.map((r) => r.hash()));
            if (newReportsSet.has(deps.rho.elementAt(c).workReport.hash())) {
                newState.elements[c] = undefined;
            }
            if (deps.p_tau.value >=
                this.elements[c].reportSlot.value + WORK_TIMEOUT) {
                newState.elements[c] = undefined;
            }
        }
        return toDoubleDagger(newState);
    }
    /**
     * $(0.7.1 - 11.43)
     */
    toPosterior(deps) {
        const newState = cloneCodecable(this);
        for (let core = 0; core < CORES; core++) {
            const ext = deps.EG_Extrinsic.elementForCore(core);
            if (typeof ext !== "undefined") {
                // extrinsic replace the current entry (if any)
                newState.elements[core] = new RHOElementImpl({
                    workReport: ext.report,
                    reportSlot: deps.p_tau,
                });
            }
        }
        return toPosterior(newState);
    }
    static newEmpty() {
        return new RHOImpl_1({
            elements: (Array.from({ length: CORES }, () => undefined)),
        });
    }
};
__decorate$1([
    jsonCodec(ArrayOfJSONCodec(NULLORCodec(RHOElementImpl)), SINGLE_ELEMENT_CLASS),
    binaryCodec(createSequenceCodec(CORES, new Optional(RHOElementImpl))),
    __metadata$1("design:type", Object)
], RHOImpl.prototype, "elements", void 0);
RHOImpl = RHOImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], RHOImpl);

var SafroleStateImpl_1;
/**
 * Denoted with gamma (y) in the Greek alphabet.
 * This is the basic state of the Safrole state machine.
 * @see $(0.7.1 - 6.3)
 */
let SafroleStateImpl = SafroleStateImpl_1 = class SafroleStateImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        if (typeof config !== "undefined") {
            Object.assign(this, config);
        }
    }
    toPosterior(deps) {
        const toRet = new SafroleStateImpl_1({
            gamma_p: deps.p_gamma_p,
            gamma_z: deps.p_gamma_z,
            gamma_a: deps.p_gamma_a,
            gamma_s: deps.p_gamma_s,
        });
        return toPosterior(toRet);
    }
    static newEmpty() {
        return new SafroleStateImpl_1({
            gamma_s: GammaSImpl.newEmpty(),
            gamma_a: GammaAImpl.newEmpty(),
            gamma_z: GammaZImpl.newEmpty(),
            gamma_p: GammaPImpl.newEmpty(),
        });
    }
};
__decorate$1([
    codec$1(GammaPImpl),
    __metadata$1("design:type", Object)
], SafroleStateImpl.prototype, "gamma_p", void 0);
__decorate$1([
    codec$1(GammaZImpl),
    __metadata$1("design:type", GammaZImpl)
], SafroleStateImpl.prototype, "gamma_z", void 0);
__decorate$1([
    codec$1(GammaSImpl),
    __metadata$1("design:type", GammaSImpl)
], SafroleStateImpl.prototype, "gamma_s", void 0);
__decorate$1([
    codec$1(GammaAImpl),
    __metadata$1("design:type", GammaAImpl)
], SafroleStateImpl.prototype, "gamma_a", void 0);
SafroleStateImpl = SafroleStateImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], SafroleStateImpl);

var MerkleServiceAccountStorageImpl_1;
const computeStorageKey = (serviceIndex, key) => {
    const k = new Uint8Array(4 + key.length);
    E_4_int.encode((2 ** 32 - 1), k);
    k.set(key, 4);
    return stateKey(serviceIndex, k);
};
/** computes a_l state key */
const computeRequestKey = (serviceIndex, hash, length) => {
    const k = new Uint8Array([...encodeWithCodec(E_4_int, length), ...hash]);
    return stateKey(serviceIndex, k);
};
const singleRequestCodec = createArrayLengthDiscriminator(asCodec(SlotImpl));
/**
 * stores both a_s and a_l
 * original issue https://github.com/gavofyork/graypaper/issues/436
 *
 */
let MerkleServiceAccountStorageImpl = MerkleServiceAccountStorageImpl_1 = class MerkleServiceAccountStorageImpl extends BaseJamCodecable {
    /**
     * @param serviceIndex - the index of the service account
     * @param octets - $(0.7.1 - 9.8)
     */
    constructor(serviceIndex, octets = 0n, items = 0) {
        super();
        this.serviceIndex = serviceIndex;
        this.octets = octets;
        this.items = items;
        this._storage = new IdentityMap();
    }
    setStorage(stateKey, value) {
        // log(
        //   `Setting merkleStorage with key: ${Uint8ArrayJSONCodec.toJSON(stateKey)} to ${Uint8ArrayJSONCodec.toJSON(value)}`,
        //   true, //process.env.DEBUG_TRACES === "true",
        // );
        this._storage.set(stateKey, value);
    }
    deleteStorage(stateKey) {
        // log(
        //   `Deleting merkleStorage with key: ${Uint8ArrayJSONCodec.toJSON(stateKey)}`,
        //   true, //process.env.DEBUG_TRACES === "true",
        // );
        return this._storage.delete(stateKey);
    }
    entries() {
        return Array.from(this._storage.entries())
            .map(([stateKey, value]) => [
            stateKey,
            value,
        ])
            .values();
    }
    get storage() {
        const toRet = {
            set: (key, value) => {
                const innerKey = computeStorageKey(this.serviceIndex, key);
                toRet.delete(key);
                this.setStorage(innerKey, value);
                this.items = (this.items + 1);
                this.octets = ((this.octets + 34n + BigInt(value.length) + BigInt(key.length)));
            },
            get: (key) => {
                const internalKey = computeStorageKey(this.serviceIndex, key);
                return this._storage.get(internalKey);
            },
            has: (key) => {
                const internalKey = computeStorageKey(this.serviceIndex, key);
                return this._storage.has(internalKey);
            },
            delete: (key) => {
                const innerKey = computeStorageKey(this.serviceIndex, key);
                if (this._storage.has(innerKey)) {
                    const curValue = this._storage.get(innerKey);
                    this.items = (this.items - 1);
                    this.octets = ((this.octets - 34n - BigInt(curValue.length) - BigInt(key.length)));
                    return this.deleteStorage(innerKey);
                }
                return false;
            },
        };
        return toRet;
    }
    get requests() {
        const innerGet = (key) => {
            const b = this._storage.get(key);
            if (!b) {
                return undefined;
            }
            return singleRequestCodec.decode(b).value;
        };
        const toRet = {
            set: (hash, length, value) => {
                const key = computeRequestKey(this.serviceIndex, hash, length);
                // handles all the items and octets
                toRet.delete(hash, length);
                // const curValue = innerGet(key);
                // // subtract old value length if any
                // this.items = <u32>(this.items - 2 * (curValue?.length ?? 0));
                // this.octets = <u64>(
                //   (this.octets -
                //     BigInt(81 + length) * (typeof curValue !== "undefined" ? 1n : 0n))
                // );
                //
                const rawValue = encodeWithCodec(singleRequestCodec, value);
                this.setStorage(key, rawValue);
                this.items = (this.items + 2);
                this.octets = (this.octets + BigInt(81) + BigInt(length));
            },
            get: (hash, length) => {
                const key = computeRequestKey(this.serviceIndex, hash, length);
                return Object.freeze(innerGet(key));
            },
            has: (hash, length) => {
                const key = computeRequestKey(this.serviceIndex, hash, length);
                return this._storage.has(key);
            },
            delete: (hash, length) => {
                const key = computeRequestKey(this.serviceIndex, hash, length);
                if (this._storage.has(key)) {
                    this.items = (this.items - 2);
                    this.octets = (this.octets - BigInt(length + 81));
                    return this.deleteStorage(key);
                }
                return false;
            },
        };
        return toRet;
    }
    clone() {
        const toRet = new MerkleServiceAccountStorageImpl_1(this.serviceIndex, this.octets, this.items);
        toRet._storage = this._storage.clone();
        return toRet;
    }
    equals(other) {
        return (this === other ||
            [...this._storage.entries()].every(([k, v]) => {
                return (other._storage.has(k) &&
                    compareUint8Arrays(other._storage.get(k), v) === 0);
            }));
    }
};
__decorate$1([
    codec$1(IdentityMapCodec(xBytesCodec(31), LengthDiscrimantedIdentityCodec, {
        key: "stateKey",
        value: "blob",
    })),
    __metadata$1("design:type", IdentityMap)
], MerkleServiceAccountStorageImpl.prototype, "_storage", void 0);
MerkleServiceAccountStorageImpl = MerkleServiceAccountStorageImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Number, BigInt, Number])
], MerkleServiceAccountStorageImpl);

var ServiceAccountImpl_1;
const serviceMetadataCodec = createCodec([
    ["metadata", LengthDiscrimantedIdentityCodec],
    ["code", IdentityCodec],
]);
/**
 * `A`
 * $(0.7.1 - 9.3)
 */
let ServiceAccountImpl = ServiceAccountImpl_1 = class ServiceAccountImpl extends BaseJamCodecable {
    constructor(values, 
    // TODO: refactor to make this private
    merkleStorage) {
        super();
        this.preimages = new IdentityMap();
        this.preimages = values.preimages;
        this.gratis = values.gratis;
        this.codeHash = values.codeHash;
        this.balance = values.balance;
        this.minAccGas = values.minAccGas;
        this.minMemoGas = values.minMemoGas;
        this.created = values.created;
        this.lastAcc = values.lastAcc;
        this.parent = values.parent;
        this.merkleStorage = merkleStorage;
        this.requests = this.merkleStorage.requests;
        this.storage = this.merkleStorage.storage;
    }
    /**
     * `a_i` - total number of preimage lookup dictionaries and
     * $(0.7.1 - 9.8)
     */
    itemInStorage() {
        return this.merkleStorage.items;
    }
    /**
     * `a_o` - total octets in the preimage lookup and storage
     * $(0.7.1 - 9.8)
     */
    totalOctets() {
        return this.merkleStorage.octets;
    }
    /**
     * `a_t`
     * compute the gas threshold of a service account
     * $(0.7.1 - 9.8)
     */
    gasThreshold() {
        const toRet = (SERVICE_MIN_BALANCE + // Bs
            SERVICE_ADDITIONAL_BALANCE_PER_ITEM * BigInt(this.itemInStorage()) + // BI*ai
            SERVICE_ADDITIONAL_BALANCE_PER_OCTET * this.totalOctets() - // BL*ao
            this.gratis); // - af
        if (toRet < 0n) {
            return toTagged(0n);
        }
        return toRet;
    }
    /**
     *
     * computes bold_c and bold_m
     * $(0.7.1 - 9.4)
     */
    decodeMetaAndCode() {
        const codePreimage = this.preimages.get(this.codeHash);
        if (typeof codePreimage === "undefined") {
            this.decodedMetaAndCode = { code: undefined, metadata: undefined };
        }
        else {
            // TODO: handle decoding errors
            this.decodedMetaAndCode = serviceMetadataCodec.decode(this.preimages.get(this.codeHash)).value;
        }
    }
    metadata() {
        if (typeof this.decodedMetaAndCode === "undefined") {
            this.decodeMetaAndCode();
        }
        return this.decodedMetaAndCode.metadata;
    }
    /**
     * `bold_c`
     */
    code() {
        if (typeof this.decodedMetaAndCode === "undefined") {
            this.decodeMetaAndCode();
        }
        return this.decodedMetaAndCode.code;
    }
    /**
     * $(0.7.1 - 12.41) | Y()
     */
    isPreimageSolicitedButNotYetProvided(hash, length) {
        return (!this.preimages.has(hash) &&
            this.requests.get(hash, toTagged(length))?.length === 0);
    }
    /**
     * `Λ`
     * $(0.7.1 - 9.5 / 9.7)
     * @param a - the service account
     * @param tau - the timeslot for the lookup max -D old. not enforced here.
     * @param hash - the hash to look up
     */
    historicalLookup(tau, // $(0.7.1 - 9.5) states that TAU is no older than D
    hash) {
        const ap = this.preimages.get(hash);
        if (typeof ap !== "undefined" &&
            I_Fn(this.requests.get(hash, ap.length), tau)) {
            return this.preimages.get(hash);
        }
    }
    clone() {
        return new ServiceAccountImpl_1(this, this.merkleStorage.clone());
    }
    equals(other) {
        return (this === other ||
            (this.balance === other.balance &&
                compareUint8Arrays(this.codeHash, other.codeHash) === 0 &&
                this.created.value === other.created.value &&
                this.gratis === other.gratis &&
                this.lastAcc.value === other.lastAcc.value &&
                this.minAccGas === other.minAccGas &&
                this.minMemoGas === other.minMemoGas &&
                this.parent === other.parent &&
                this.merkleStorage.equals(other.merkleStorage)));
    }
};
__decorate$1([
    codec$1(IdentityMapCodec(xBytesCodec(32), LengthDiscrimantedIdentityCodec, {
        key: "key",
        value: "blob",
    })),
    __metadata$1("design:type", IdentityMap)
], ServiceAccountImpl.prototype, "preimages", void 0);
__decorate$1([
    eSubBigIntCodec(8),
    __metadata$1("design:type", BigInt)
], ServiceAccountImpl.prototype, "gratis", void 0);
__decorate$1([
    codec$1(xBytesCodec(32)),
    __metadata$1("design:type", Object)
], ServiceAccountImpl.prototype, "codeHash", void 0);
__decorate$1([
    eSubBigIntCodec(8),
    __metadata$1("design:type", BigInt)
], ServiceAccountImpl.prototype, "balance", void 0);
__decorate$1([
    eSubBigIntCodec(8),
    __metadata$1("design:type", BigInt)
], ServiceAccountImpl.prototype, "minAccGas", void 0);
__decorate$1([
    eSubBigIntCodec(8),
    __metadata$1("design:type", BigInt)
], ServiceAccountImpl.prototype, "minMemoGas", void 0);
__decorate$1([
    codec$1(SlotImpl),
    __metadata$1("design:type", SlotImpl)
], ServiceAccountImpl.prototype, "created", void 0);
__decorate$1([
    codec$1(SlotImpl),
    __metadata$1("design:type", SlotImpl)
], ServiceAccountImpl.prototype, "lastAcc", void 0);
__decorate$1([
    eSubIntCodec(4),
    __metadata$1("design:type", Number)
], ServiceAccountImpl.prototype, "parent", void 0);
__decorate$1([
    codec$1(MerkleServiceAccountStorageImpl),
    __metadata$1("design:type", MerkleServiceAccountStorageImpl)
], ServiceAccountImpl.prototype, "merkleStorage", void 0);
ServiceAccountImpl = ServiceAccountImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object, MerkleServiceAccountStorageImpl])
], ServiceAccountImpl);
/**
 * Checks based on the length of the preimage and tau if it is valid
 */
const I_Fn = (l, t) => {
    switch (l.length) {
        case 0: // requested but not provided
            return false;
        case 1: // avalaible since l[0]
            return l[0] <= t;
        case 2: // was prev available but not anymore since l[1]
            return l[0] <= t && l[1] > t;
        case 3: // re-avaialble from l[2]
            return l[0] <= t && l[1] > t && l[2] <= t;
        default:
            assert$1(false, "should never happen");
    }
};

/**
 * $(0.7.1 - C.35) I fn
 */
const importDataSegmentCodec = {
    encode(value, bytes) {
        const root = value.root;
        if (!isHash(root)) {
            let offset = HashCodec.encode(root.value, bytes.subarray(0, 32));
            offset += E_sub_int(2).encode(value.index + 2 ** 15, bytes.subarray(offset));
            return offset;
        }
        else {
            let offset = HashCodec.encode(root, bytes.subarray(0, 32));
            offset += E_sub_int(2).encode(value.index, bytes.subarray(offset));
            return offset;
        }
    },
    decode(bytes) {
        const { value: root } = HashCodec.decode(bytes.subarray(0, 32));
        const { value: index } = E_sub_int(2).decode(bytes.subarray(32));
        if (index > 2 ** 15) {
            return {
                value: {
                    root: { value: root },
                    index: (index - 2 ** 15),
                },
                readBytes: 32 + 2,
            };
        }
        else {
            return {
                value: { root: root, index },
                readBytes: 32 + 2,
            };
        }
    },
    encodedSize() {
        return 32 + 2;
    },
};
let WorkItemExportedSegment = class WorkItemExportedSegment extends BaseJamCodecable {
    /**
     * $(0.7.1 - 14.14) - X
     */
    originalBlob() {
        throw new Error("X() not implemented");
    }
};
__decorate$1([
    codec$1(HashCodec, "hash"),
    __metadata$1("design:type", Object)
], WorkItemExportedSegment.prototype, "blobHash", void 0);
__decorate$1([
    eSubIntCodec(4, "len"),
    __metadata$1("design:type", Number)
], WorkItemExportedSegment.prototype, "length", void 0);
WorkItemExportedSegment = __decorate$1([
    JamCodecable()
], WorkItemExportedSegment);
/**
 * Identified by `W` set
 * $(0.7.1 - 14.3)
 * $(0.7.1 - C.29) | codec
 */
let WorkItemImpl = class WorkItemImpl extends BaseJamCodecable {
};
__decorate$1([
    eSubIntCodec(4),
    __metadata$1("design:type", Number)
], WorkItemImpl.prototype, "service", void 0);
__decorate$1([
    codec$1(HashCodec, "code_hash"),
    __metadata$1("design:type", Object)
], WorkItemImpl.prototype, "codeHash", void 0);
__decorate$1([
    eSubBigIntCodec(8, "refine_gas_limit"),
    __metadata$1("design:type", BigInt)
], WorkItemImpl.prototype, "refineGasLimit", void 0);
__decorate$1([
    eSubBigIntCodec(8, "accumulate_gas_limit"),
    __metadata$1("design:type", BigInt)
], WorkItemImpl.prototype, "accumulateGasLimit", void 0);
__decorate$1([
    eSubIntCodec(2, "export_count"),
    __metadata$1("design:type", Number)
], WorkItemImpl.prototype, "exportCount", void 0);
__decorate$1([
    codec$1(LengthDiscrimantedIdentityCodec),
    __metadata$1("design:type", Object)
], WorkItemImpl.prototype, "payload", void 0);
__decorate$1([
    jsonCodec(ArrayOfJSONCodec(createJSONCodec([
        ["root", "tree_root", HashCodec],
        ["index", "index", NumberJSONCodec()],
    ])), "import_segments"),
    binaryCodec(createArrayLengthDiscriminator(importDataSegmentCodec)),
    __metadata$1("design:type", Object)
], WorkItemImpl.prototype, "importSegments", void 0);
__decorate$1([
    lengthDiscriminatedCodec(WorkItemExportedSegment, "extrinsic"),
    __metadata$1("design:type", Object)
], WorkItemImpl.prototype, "exportedDataSegments", void 0);
WorkItemImpl = __decorate$1([
    JamCodecable()
], WorkItemImpl);

class HostFunctions {
    // @eslint-disable-next-line @typescript-eslint/no-unused-vars
    gas(context, _) {
        const p_gas = context.gas - 10n;
        return [IxMod.w7(p_gas)];
    }
    fetch(context, args) {
        const [w7, w8, w9, w10, w11, w12] = context.registers.slice(7);
        const o = w7;
        let v;
        switch (w10.value) {
            case 0n: {
                v = new Uint8Array([
                    ...encodeWithCodec(E_8, SERVICE_ADDITIONAL_BALANCE_PER_ITEM), // Bi
                    ...encodeWithCodec(E_8, SERVICE_ADDITIONAL_BALANCE_PER_OCTET), // BL
                    ...encodeWithCodec(E_8, SERVICE_MIN_BALANCE), // BS
                    ...encodeWithCodec(E_sub_int(2), CORES), // C
                    ...encodeWithCodec(E_sub_int(4), PREIMAGE_EXPIRATION), // D
                    ...encodeWithCodec(E_sub_int(4), EPOCH_LENGTH), // E
                    ...encodeWithCodec(E_8, MAX_GAS_ACCUMULATION), // GA
                    ...encodeWithCodec(E_8, MAX_GAS_IS_AUTHORIZED), // GI
                    ...encodeWithCodec(E_8, TOTAL_GAS_REFINEMENT_LOGIC), // GR
                    ...encodeWithCodec(E_8, TOTAL_GAS_ACCUMULATION_ALL_CORES), // GT
                    ...encodeWithCodec(E_sub_int(2), RECENT_HISTORY_LENGTH), // H
                    ...encodeWithCodec(E_sub_int(2), MAXIMUM_WORK_ITEMS), // I
                    ...encodeWithCodec(E_sub_int(2), MAX_WORK_PREREQUISITES), // J
                    ...encodeWithCodec(E_sub_int(2), MAX_TICKETS_PER_BLOCK), // K
                    ...encodeWithCodec(E_sub_int(4), MAXIMUM_AGE_LOOKUP_ANCHOR), // L
                    ...encodeWithCodec(E_sub_int(2), MAX_TICKETS_PER_VALIDATOR), // N
                    ...encodeWithCodec(E_sub_int(2), AUTHPOOL_SIZE), // O
                    ...encodeWithCodec(E_sub_int(2), BLOCK_TIME), // P
                    ...encodeWithCodec(E_sub_int(2), AUTHQUEUE_MAX_SIZE), // Q
                    ...encodeWithCodec(E_sub_int(2), VALIDATOR_CORE_ROTATION), // R
                    ...encodeWithCodec(E_sub_int(2), MAXIMUM_EXTRINSICS_IN_WP), // T
                    ...encodeWithCodec(E_sub_int(2), WORK_TIMEOUT), // U
                    ...encodeWithCodec(E_sub_int(2), NUMBER_OF_VALIDATORS), // V
                    ...encodeWithCodec(E_sub_int(4), MAXIMUM_SIZE_IS_AUTHORIZED), // WA
                    ...encodeWithCodec(E_sub_int(4), MAX_SIZE_ENCODED_PACKAGE), // WB
                    ...encodeWithCodec(E_sub_int(4), SERVICECODE_MAX_SIZE), // WC
                    ...encodeWithCodec(E_sub_int(4), ERASURECODE_BASIC_SIZE), // WE
                    ...encodeWithCodec(E_sub_int(4), MAX_WORKPACKAGE_ENTRIES), // WM
                    ...encodeWithCodec(E_sub_int(4), ERASURECODE_EXPORTED_SIZE), // WP
                    ...encodeWithCodec(E_sub_int(4), MAX_TOT_SIZE_BLOBS_WORKREPORT), // WR
                    ...encodeWithCodec(E_sub_int(4), TRANSFER_MEMO_SIZE), // WM
                    ...encodeWithCodec(E_sub_int(4), MAX_EXPORTED_ITEMS), // WX
                    ...encodeWithCodec(E_sub_int(4), LOTTERY_MAX_SLOT), // Y
                ]);
                break;
            }
            case 1n: {
                if (typeof args.n !== "undefined") {
                    v = args.n;
                }
                break;
            }
            case 2n: {
                if (typeof args.bold_r !== "undefined") {
                    v = args.bold_r;
                }
                break;
            }
            case 3n: {
                if (typeof args.overline_x !== "undefined" &&
                    w11.value < args.overline_x.length &&
                    w12.value < args.overline_x[Number(w11)].length) {
                    v = args.overline_x[Number(w11)][Number(w12)];
                }
                break;
            }
            case 4n: {
                if (typeof args.overline_x !== "undefined" &&
                    typeof args.i !== "undefined" &&
                    w11.value < (args.overline_x[args.i]?.length ?? 0)) {
                    v = args.overline_x[args.i][Number(w11)];
                }
                break;
            }
            case 5n: {
                if (typeof args.overline_i !== "undefined" &&
                    w11.value < args.overline_i.length &&
                    w12.value < args.overline_i[Number(w11)].length) {
                    v = args.overline_i[Number(w11)][Number(w12)];
                }
                break;
            }
            case 6n: {
                if (typeof args.overline_i !== "undefined" &&
                    typeof args.i !== "undefined" &&
                    w11.value < (args.overline_i[args.i]?.length ?? 0)) {
                    v = args.overline_i[args.i][Number(w11)];
                }
                break;
            }
            case 7n: {
                if (typeof args.p !== "undefined") {
                    v = args.p.toBinary();
                }
                break;
            }
            case 8n: {
                if (typeof args.p !== "undefined") {
                    v = new Uint8Array([
                        ...encodeWithCodec(HashCodec, args.p.authCodeHash),
                        ...encodeWithCodec(LengthDiscrimantedIdentityCodec, args.p.authConfig),
                    ]);
                }
                break;
            }
            case 9n: {
                if (typeof args.p !== "undefined") {
                    v = args.p.authToken;
                }
                break;
            }
            case 10n: {
                if (typeof args.p !== "undefined") {
                    v = encodeWithCodec(WorkContextImpl, args.p.context);
                }
                break;
            }
            case 11n: {
                if (typeof args.p !== "undefined") {
                    v = encodeWithCodec(createArrayLengthDiscriminator(SCodec), args.p.workItems.map((w) => {
                        return {
                            ...w,
                            iLength: w.importSegments.length,
                            xLength: w.exportedDataSegments.length,
                            yLength: w.payload.length,
                        };
                    }));
                }
                break;
            }
            case 12n: {
                if (typeof args.p !== "undefined" &&
                    w11.value < args.p.workItems.length) {
                    const w = args.p.workItems[Number(w11)];
                    v = encodeWithCodec(SCodec, {
                        ...w,
                        iLength: w.importSegments.length,
                        xLength: w.exportedDataSegments.length,
                        yLength: w.payload.length,
                    });
                }
                break;
            }
            case 13n: {
                if (typeof args.p !== "undefined" &&
                    w11.value < args.p.workItems.length) {
                    const w = args.p.workItems[Number(w11)];
                    v = w.payload;
                }
                break;
            }
            case 14n: {
                if (typeof args.bold_o !== "undefined") {
                    v = encodeWithCodec(createArrayLengthDiscriminator(PVMAccumulationOpImpl), args.bold_o);
                }
                break;
            }
            case 15n: {
                if (typeof args.bold_o !== "undefined" &&
                    w11.value < args.bold_o.length) {
                    v = encodeWithCodec(PVMAccumulationOpImpl, args.bold_o[Number(w11)]);
                }
                break;
            }
            case 16n: {
                v = args.bold_t?.toBinary();
                break;
            }
            case 17n: {
                if (typeof args.bold_t !== "undefined" &&
                    w11.value < args.bold_t.length()) {
                    v = args.bold_t.elements[Number(w11)].toBinary();
                }
                break;
            }
        }
        if (typeof v === "undefined") {
            return [IxMod.w7(HostCallResult.NONE)];
        }
        const f = w8.value < v.length ? Number(w8.value) : v.length;
        const l = w9.value < v.length - f ? Number(w9.value) : v.length - f;
        if (!context.memory.canWrite(o.value, l)) {
            return [IxMod.panic()];
        }
        return [
            IxMod.w7(BigInt(v.length)),
            IxMod.memory(o.value, v.subarray(f, f + l)),
        ];
    }
    /**
     * Basically regturns a slice of preimage blob in either passed
     * bold_s or bold_d[w7]
     */
    lookup(context, args) {
        let bold_a;
        const w7 = context.registers.w7();
        debugger;
        if (Number(w7) === args.s || w7.value === 2n ** 64n - 1n) {
            bold_a = args.bold_s;
        }
        else if (w7.fitsInU32() && args.bold_d.has(w7.u32())) {
            bold_a = args.bold_d.get(w7.u32());
        }
        // else bold_a is undefined
        const [h, o] = context.registers.slice(8);
        let hash;
        if (context.memory.canRead(h.value, 32)) {
            hash = (HashCodec.decode(context.memory.getBytes(h.value, 32)).value);
        }
        else {
            // v = ∇
            return [IxMod.panic()];
        }
        if (typeof bold_a === "undefined" || !bold_a.preimages.has(hash)) {
            return [IxMod.w7(HostCallResult.NONE)];
        }
        const bold_v = bold_a.preimages.get(hash);
        const w10 = context.registers.w10();
        const w11 = context.registers.w11();
        const vLength = BigInt(bold_v.length);
        // start
        const f = w10.value < vLength ? w10.value : vLength;
        // length
        const l = w11.value < vLength - f ? w11.value : vLength - f;
        if (false === context.memory.canWrite(o.value, Number(l))) {
            return [IxMod.panic()];
        }
        return [
            IxMod.w7(BigInt(bold_v.length)),
            IxMod.memory(o.value, bold_v.subarray(Number(f), Number(f + l))),
        ];
    }
    /**
     * returns a slice of storage of bold_d[w7] or bold_s
     * with key being in memory in [w8:w9]
     * and stores it in memory at w10
     *
     * start and length are determined by w11 and w12
     */
    read(context, args) {
        const w7 = context.registers.w7();
        let bold_a;
        let s_star = args.s;
        if (w7.value !== 2n ** 64n - 1n) {
            s_star = Number(w7);
        }
        if (s_star === args.s) {
            bold_a = args.bold_s;
        }
        else if (s_star !== args.s &&
            w7.fitsInU32() &&
            args.bold_d.has(w7.u32())) {
            bold_a = args.bold_d.get(w7.u32());
        }
        const [ko, kz, o, w11, w12] = context.registers.slice(8);
        if (!context.memory.canRead(ko.toSafeMemoryAddress(), Number(kz))) {
            return [IxMod.panic()];
        }
        const bold_k = context.memory.getBytes(ko.toSafeMemoryAddress(), Number(kz));
        const bold_v = bold_a?.storage.get(bold_k);
        if (typeof bold_v === "undefined") {
            // either bold_a is undefined or no key in storage
            return [IxMod.w7(HostCallResult.NONE)];
        }
        const f = w11.value < bold_v.length ? Number(w11) : bold_v.length;
        const l = w12.value < bold_v.length - f ? Number(w12) : bold_v.length - f;
        if (!o.fitsInU32() || !context.memory.canWrite(o.u32(), l)) {
            return [IxMod.panic()];
        }
        return [
            IxMod.w7(BigInt(bold_v.length)),
            IxMod.memory(o.u32(), bold_v.subarray(f, f + l)),
        ];
    }
    /**
     * Computes a new version of given bold_s
     * with either a deleted key in storage [w7;w8] or set coming from memory [w9;w10]
     *
     */
    write(context, args) {
        const [ko, kz, vo, vz] = context.registers.slice(7);
        let bold_k;
        if (!ko.fitsInU32() ||
            !kz.fitsInU32() ||
            !context.memory.canRead(ko.u32(), kz.u32())) {
            return [IxMod.panic()];
        }
        else {
            bold_k = context.memory.getBytes(ko.u32(), kz.u32());
        }
        // const _existed = args.bold_s.storage.has(bold_k);
        const bold_a = args.bold_s.clone();
        if (vz.value === 0n) {
            log(`HostFunction::write delete key ${Uint8ArrayJSONCodec.toJSON(bold_k)} for service ${args.s}`, process.env.DEBUG_TRACES === "true");
            bold_a.storage.delete(bold_k);
        }
        else if (vo.fitsInU32() &&
            vz.fitsInU32() &&
            context.memory.canRead(vo.u32(), vz.u32())) {
            log(`HostFunction::write set key ${Uint8ArrayJSONCodec.toJSON(bold_k)} for service ${args.s} to ${Uint8ArrayJSONCodec.toJSON(context.memory.getBytes(vo.u32(), vz.u32()))}`, process.env.DEBUG_TRACES === "true");
            bold_a.storage.set(bold_k, context.memory.getBytes(vo.u32(), vz.u32()));
        }
        else {
            return [IxMod.panic()];
        }
        if (bold_a.gasThreshold() > bold_a.balance) {
            return [IxMod.w7(HostCallResult.FULL)];
        }
        let l;
        if (args.bold_s.storage.has(bold_k)) {
            l = BigInt(args.bold_s.storage.get(bold_k).length);
        }
        else {
            l = HostCallResult.NONE;
        }
        return [IxMod.w7(l), IxMod.obj({ bold_s: bold_a })];
    }
    info(context, args) {
        const w7 = context.registers.w7();
        let bold_a;
        if (w7.value === 2n ** 64n - 1n) {
            bold_a = args.bold_d.get(args.s);
        }
        else {
            bold_a = args.bold_d.get(Number(w7));
        }
        if (typeof bold_a === "undefined") {
            return [IxMod.w7(HostCallResult.NONE)];
        }
        const v = encodeWithCodec(serviceAccountCodec, {
            codeHash: bold_a.codeHash,
            balance: bold_a.balance,
            gasThreshold: bold_a.gasThreshold(),
            minAccGas: bold_a.minAccGas,
            minMemoGas: bold_a.minMemoGas,
            totalOctets: bold_a.totalOctets(),
            itemInStorage: bold_a.itemInStorage(),
            gratis: bold_a.gratis,
            created: bold_a.created,
            lastAcc: bold_a.lastAcc,
            parent: bold_a.parent,
        });
        // https://github.com/gavofyork/graypaper/pull/480
        let f = Number(context.registers.w9());
        if (f > v.length) {
            f = v.length;
        }
        let l = Number(context.registers.w10());
        if (l > v.length - f) {
            l = v.length - f;
        }
        const o = context.registers.w8();
        if (!o.fitsInU32() || !context.memory.canWrite(o.u32(), l)) {
            return [IxMod.panic()];
        }
        else {
            return [
                IxMod.w7(BigInt(v.length)),
                IxMod.memory(o.u32(), v.subarray(f, f + l)),
            ];
        }
    }
    /**
     * calls historicalLookup on either given bold_d[s] or bold_d[w7]
     * for tau and Hash in memory at h
     * stores it in memory at o
     */
    historical_lookup(context, args) {
        const [w7, h, o, w10, w11] = context.registers.slice(7);
        if (!h.fitsInU32() || !context.memory.canRead(h.u32(), 32)) {
            return [IxMod.panic()];
        }
        let bold_a;
        if (w7.value === 2n ** 64n - 1n && args.bold_d.has(args.s)) {
            bold_a = args.bold_d.get(args.s);
        }
        else if (args.bold_d.has(Number(w7))) {
            bold_a = args.bold_d.get(Number(w7));
        }
        else {
            return [IxMod.w7(HostCallResult.NONE)];
        }
        const v = bold_a.historicalLookup(toTagged(args.tau), HashCodec.decode(context.memory.getBytes(h.u32(), 32)).value);
        if (typeof v === "undefined") {
            return [IxMod.w7(HostCallResult.NONE)];
        }
        const f = Math.min(Number(w10), v.length);
        const l = Math.min(Number(w11), v.length - f);
        if (!o.fitsInU32() || !context.memory.canWrite(o.u32(), l)) {
            return [IxMod.panic()];
        }
        return [
            IxMod.w7(BigInt(v.length)),
            IxMod.memory(o.u32(), v.subarray(f, l)),
        ];
    }
    /**
     * `ΩE` in the graypaper
     * export segment host call
     */
    export(context, args) {
        const [p, w8] = context.registers.slice(7);
        const z = Math.min(Number(w8), ERASURECODE_SEGMENT_SIZE);
        if (!p.fitsInU32() || !context.memory.canRead(p.u32(), z)) {
            return [IxMod.panic()];
        }
        if (args.segmentOffset + args.refineCtx.segments.length >=
            MAX_EXPORTED_ITEMS) {
            return [IxMod.w7(HostCallResult.FULL)];
        }
        const bold_x = zeroPad(ERASURECODE_SEGMENT_SIZE, context.memory.getBytes(p.u32(), z));
        const newRefineCtx = structuredClone(args.refineCtx); // ok to structuredClone as of 0.7.1
        newRefineCtx.segments.push(bold_x);
        return [
            IxMod.w7(BigInt(args.segmentOffset + args.refineCtx.segments.length)),
            IxMod.obj(newRefineCtx),
        ];
    }
    machine(context, refineCtx) {
        const [po, pz, i] = context.registers.slice(7);
        if (!po.fitsInU32() ||
            !pz.fitsInU32() ||
            !context.memory.canRead(po.u32(), pz.u32())) {
            return [IxMod.panic()];
        }
        const bold_p = context.memory.getBytes(po.u32(), pz.u32());
        try {
            PVMProgramCodec.decode(bold_p);
            // eslint-disable-next-line
        }
        catch (_e) {
            return [IxMod.w7(HostCallResult.HUH)];
        }
        const sortedKeys = [...refineCtx.bold_m.keys()].sort((a, b) => a - b);
        let n = 0;
        while (sortedKeys.length > 0 && n == sortedKeys[0]) {
            sortedKeys.shift();
            n++;
        }
        const bold_u = new PVMMemory(new Map(), new Map(), {
            start: 0,
            end: 0,
            pointer: 0,
        });
        const newContext = structuredClone(refineCtx); // ok to structuredClone as of 0.7.1
        newContext.bold_m.set(n, {
            code: bold_p,
            ram: bold_u,
            instructionPointer: Number(i.value),
        });
        return [
            IxMod.w7(BigInt(n)), // new Service index?
            IxMod.obj(newContext),
        ];
    }
    /**
     * peek data from refinecontext to memory
     */
    peek(context, refineCtx) {
        const [n, o, s, z] = context.registers.slice(7);
        if (!o.fitsInU32() ||
            !z.fitsInU32() ||
            !context.memory.canWrite(o.u32(), z.u32())) {
            return [IxMod.panic()];
        }
        if (!refineCtx.bold_m.has(Number(n))) {
            return [IxMod.w7(HostCallResult.WHO)];
        }
        if (!s.fitsInU32() ||
            !refineCtx.bold_m.get(Number(n)).ram.canRead(s.u32(), z.u32())) {
            return [IxMod.w7(HostCallResult.OOB)];
        }
        return [
            IxMod.w7(HostCallResult.OK),
            IxMod.memory(o.u32(), refineCtx.bold_m.get(Number(n)).ram.getBytes(s.u32(), z.u32())),
        ];
    }
    poke(context, refineCtx) {
        const [n, s, o, z] = context.registers.slice(7);
        if (!s.fitsInU32() ||
            !z.fitsInU32() ||
            !context.memory.canRead(s.u32(), z.u32())) {
            return [IxMod.panic()];
        }
        if (!refineCtx.bold_m.has(Number(n))) {
            return [IxMod.w7(HostCallResult.WHO)];
        }
        if (!o.fitsInU32() ||
            !refineCtx.bold_m.get(Number(n)).ram.canRead(o.u32(), Number(z))) {
            return [IxMod.w7(HostCallResult.OOB)];
        }
        return [
            IxMod.w7(HostCallResult.OK),
            IxMod.memory(o.u32(), refineCtx.bold_m.get(Number(n)).ram.getBytes(s.u32(), Number(z))),
        ];
    }
    /**
     * changes refineContext.bold_m[w7].ram
     * - if w10 is <3 sets pages value from w8 to w8 + w9 to 0
     * - if w10 is 0 then remove reading acl
     * - if w10 is 1 or 3 then make the pages readable
     * - if w10 is 2 or 4 then make the pages writable
     */
    pages(context, refineCtx) {
        const [n, p, c, r] = context.registers.slice(7);
        if (!refineCtx.bold_m.has(Number(n))) {
            return [IxMod.w7(HostCallResult.WHO)];
        }
        const bold_u = refineCtx.bold_m.get(Number(n)).ram;
        if (r.value > 4 || p.value < 16 || p.value + c.value >= 2 ** 32 / Zp) {
            return [IxMod.w7(HostCallResult.HUH)];
        }
        if (r.value > 2 && bold_u.canRead(p.value, Number(c))) {
            return [IxMod.w7(HostCallResult.HUH)];
        }
        const p_u = bold_u.clone();
        for (let i = 0; i < c.value; i++) {
            if (r.value < 3) {
                p_u
                    .changeAcl(Number(p) + i, PVMMemoryAccessKind.Write)
                    .setBytes(((Number(p) + i) * Zp), new Uint8Array(Zp).fill(0)); // fill with zeros
            }
            if (r.value == 1n || r.value == 3n) {
                p_u.changeAcl(Number(p) + i, PVMMemoryAccessKind.Read);
            }
            else if (r.value == 2n || r.value == 4n) {
                p_u.changeAcl(Number(p) + i, PVMMemoryAccessKind.Write);
            }
            else if (r.value == 0n) {
                p_u.changeAcl(Number(p) + i, PVMMemoryAccessKind.Null);
            }
        }
        const newRefineCtx = structuredClone(refineCtx); // ok to structuredClone as of 0.7.1
        newRefineCtx.bold_m.get(Number(n)).ram = p_u;
        return [IxMod.w7(HostCallResult.OK), IxMod.obj(newRefineCtx)];
    }
    invoke(context, refineCtx) {
        const [n, o] = context.registers.slice(7);
        if (!o.fitsInU32() || !context.memory.canWrite(o.u32(), 112)) {
            return [IxMod.panic()];
        }
        if (!refineCtx.bold_m.has(Number(n))) {
            return [IxMod.w7(HostCallResult.WHO)];
        }
        const g = E_8.decode(context.memory.getBytes(o.u32(), 8)).value;
        const bold_w = PVMRegistersImpl.decode(context.memory.getBytes(o.value + 8n, 112 - 8)).value;
        const pvmCtx = new PVMProgramExecutionContextImpl({
            instructionPointer: refineCtx.bold_m.get(Number(n)).instructionPointer,
            gas: g,
            registers: bold_w,
            memory: refineCtx.bold_m.get(Number(n)).ram.clone(),
        });
        const p = deblobProgram(refineCtx.bold_m.get(Number(n)).code);
        let exitReason;
        let ixCtx;
        if (p instanceof PVMExitReasonImpl) {
            ixCtx = undefined; //explicit
            exitReason = p;
        }
        else {
            ixCtx = new PVMIxEvaluateFNContextImpl({
                execution: pvmCtx,
                program: p,
            });
            exitReason = basicInvocation(p, ixCtx);
        }
        // at this point pvmCtx has been either reimained the same or modified by
        // basicInvocation
        const updatedCtx = pvmCtx;
        // compute u*
        const newMemory = {
            from: o.u32(),
            data: new Uint8Array(112),
        };
        E_8.encode(updatedCtx.gas, newMemory.data.subarray(0, 8));
        PVMRegistersImpl.encode(updatedCtx.registers, newMemory.data.subarray(8));
        // compute m*
        const mStar = new Map(refineCtx.bold_m.entries());
        const pvmGuest = new PVMGuest({
            code: mStar.get(Number(n)).code,
            instructionPointer: updatedCtx.instructionPointer,
            ram: updatedCtx.memory,
        });
        mStar.set(Number(n), pvmGuest);
        switch (exitReason.reason) {
            case IrregularPVMExitReason.HostCall: {
                mStar.get(Number(n)).instructionPointer = toTagged(updatedCtx.instructionPointer + 1);
                return [
                    IxMod.w8(BigInt(exitReason.opCode)),
                    IxMod.w7(BigInt(InnerPVMResultCode.HOST)),
                    IxMod.memory(newMemory.from, newMemory.data),
                    IxMod.obj({ ...refineCtx, bold_m: mStar }),
                ];
            }
            case IrregularPVMExitReason.PageFault: {
                return [
                    IxMod.w7(InnerPVMResultCode.FAULT),
                    IxMod.w8(exitReason.address), // address
                    IxMod.memory(newMemory.from, newMemory.data),
                    IxMod.obj({ ...refineCtx, bold_m: mStar }),
                ];
            }
            case RegularPVMExitReason.OutOfGas: {
                return [
                    IxMod.w7(InnerPVMResultCode.OOG),
                    IxMod.memory(newMemory.from, newMemory.data),
                    IxMod.obj({ ...refineCtx, bold_m: mStar }),
                ];
            }
            case RegularPVMExitReason.Panic: {
                return [
                    IxMod.w7(InnerPVMResultCode.PANIC),
                    IxMod.memory(newMemory.from, newMemory.data),
                    IxMod.obj({ ...refineCtx, bold_m: mStar }),
                ];
            }
            case RegularPVMExitReason.Halt: {
                return [
                    IxMod.w7(InnerPVMResultCode.HALT),
                    IxMod.memory(newMemory.from, newMemory.data),
                    IxMod.obj({ ...refineCtx, bold_m: mStar }),
                ];
            }
        }
    }
    expunge(context, refineCtx) {
        const [n] = context.registers.slice(7);
        if (!refineCtx.bold_m.has(Number(n))) {
            return [IxMod.w7(HostCallResult.WHO)];
        }
        const newRefineCtx = structuredClone(refineCtx); // ok to structuredClone as of 0.7.1
        newRefineCtx.bold_m.delete(Number(n));
        return [
            IxMod.w7(refineCtx.bold_m.get(Number(n)).instructionPointer),
            IxMod.obj(newRefineCtx),
        ];
    }
    /**
     * `ΩB`
     * bless service host call
     */
    bless(context, x) {
        const [m, a, v, r, o, n] = context.registers.slice(7);
        if (!a.fitsInU32() || !context.memory.canRead(a.u32(), 4 * CORES)) {
            return [IxMod.panic()];
        }
        const bold_a = PrivilegedServicesImpl.codecOf("assigners").decode(context.memory.getBytes(a.u32(), 4 * CORES)).value;
        if (!o.fitsInU32() || !context.memory.canRead(o.u32(), 12 * Number(n))) {
            return [IxMod.panic()];
        }
        const bold_z = new Map();
        const buf = context.memory.getBytes(o.u32(), 12 * Number(n));
        for (let i = 0; i < n.value; i++) {
            const data = buf.subarray(i * 12, (i + 1) * 12);
            const key = E_sub_int(4).decode(data).value;
            const value = E_sub(8).decode(data.subarray(4)).value;
            bold_z.set(key, value);
        }
        if (x.id !== x.state.manager) {
            return [IxMod.w7(HostCallResult.HUH)];
        }
        if (!m.fitsInU32() || !v.fitsInU32() || !r.fitsInU32()) {
            return [IxMod.w7(HostCallResult.WHO)];
        }
        const newX = new PVMResultContextImpl({
            id: x.id,
            nextFreeID: x.nextFreeID,
            provisions: x.provisions,
            transfers: x.transfers,
            yield: x.yield,
            state: new PVMAccumulationStateImpl({
                accounts: x.state.accounts,
                authQueue: x.state.authQueue,
                stagingSet: x.state.stagingSet,
                // modifications start here
                assigners: bold_a,
                manager: m.u32(),
                delegator: v.u32(),
                alwaysAccers: bold_z,
            }),
        });
        return [
            IxMod.w7(HostCallResult.OK),
            IxMod.obj({
                x: newX,
            }),
        ];
    }
    /**
     * `ΩA`
     * assign core host call
     */
    assign(context, x) {
        const [c, o, a] = context.registers.slice(7);
        if (!context.memory.canRead(o.toSafeMemoryAddress(), AUTHQUEUE_MAX_SIZE * 32)) {
            return [IxMod.panic()];
        }
        if (c.value >= CORES) {
            return [IxMod.w7(HostCallResult.CORE)];
        }
        if (x.id !== x.state.assigners[Number(c)]) {
            return [IxMod.w7(HostCallResult.HUH)];
        }
        const bold_q = context.memory.getBytes(o.toSafeMemoryAddress(), AUTHQUEUE_MAX_SIZE * 32);
        const nl = [];
        for (let i = 0; i < AUTHQUEUE_MAX_SIZE; i++) {
            nl.push((HashCodec.decode(bold_q.subarray(i * 32, (i + 1) * 32)).value));
        }
        const newX = new PVMResultContextImpl({
            id: x.id,
            nextFreeID: x.nextFreeID,
            provisions: x.provisions,
            yield: x.yield,
            transfers: x.transfers,
            state: new PVMAccumulationStateImpl({
                authQueue: cloneCodecable(x.state.authQueue),
                assigners: toTagged(x.state.assigners.slice()),
                accounts: x.state.accounts,
                stagingSet: x.state.stagingSet,
                manager: x.state.manager,
                delegator: x.state.delegator,
                alwaysAccers: x.state.alwaysAccers,
            }),
        });
        newX.state.authQueue.elements[Number(c)] = toTagged(nl);
        newX.state.assigners[Number(c)] = Number(a);
        return [IxMod.w7(HostCallResult.OK), IxMod.obj({ x: newX })];
    }
    /**
     * `ΩD`
     * designate validators host call
     */
    designate(context, x) {
        const o = context.registers.w7();
        if (!context.memory.canRead(o.toSafeMemoryAddress(), 336 * NUMBER_OF_VALIDATORS)) {
            return [IxMod.panic()];
        }
        const bold_v = ValidatorsImpl.decode(context.memory.getBytes(o.toSafeMemoryAddress(), 336 * NUMBER_OF_VALIDATORS)).value;
        if (x.id !== x.state.delegator) {
            return [IxMod.w7(HostCallResult.HUH)];
        }
        const newX = new PVMResultContextImpl({
            id: x.id,
            nextFreeID: x.nextFreeID,
            provisions: x.provisions,
            yield: x.yield,
            state: new PVMAccumulationStateImpl({
                stagingSet: toTagged(bold_v),
                accounts: x.state.accounts,
                authQueue: x.state.authQueue,
                assigners: x.state.assigners,
                manager: x.state.manager,
                delegator: x.state.delegator,
                alwaysAccers: x.state.alwaysAccers,
            }),
            transfers: x.transfers,
        });
        return [IxMod.w7(HostCallResult.OK), IxMod.obj({ x: newX })];
    }
    /**
     *
     * `ΩC`
     * checkpoint host call
     */
    checkpoint(context, x) {
        // deep clone x
        const p_y = x.clone();
        const gasAfter = context.gas - 10n; // gas cost of checkpoint = 10
        return [IxMod.w7(gasAfter), IxMod.obj({ y: p_y })];
    }
    /**
     * `ΩN`
     * new-service host call
     */
    new(context, args) {
        const [o, l, g, m, f] = context.registers.slice(7);
        if (!context.memory.canRead(o.toSafeMemoryAddress(), 32) ||
            l.value >= 2 ** 32) {
            return [IxMod.panic()];
        }
        const c = (HashCodec.decode(context.memory.getBytes(o.toSafeMemoryAddress(), 32))
            .value);
        if (f.value !== 0n && args.x.id !== args.x.state.manager) {
            return [IxMod.w7(HostCallResult.HUH)];
        }
        const i_star = check_fn(((MINIMUM_PUBLIC_SERVICE_INDEX +
            ((args.x.nextFreeID - MINIMUM_PUBLIC_SERVICE_INDEX + 42) %
                (2 ** 32 - MINIMUM_PUBLIC_SERVICE_INDEX - 2 ** 8)))), args.x.state.accounts);
        const storage = new MerkleServiceAccountStorageImpl(args.x.nextFreeID);
        const a = new ServiceAccountImpl({
            codeHash: c,
            balance: 0n,
            minAccGas: g.value,
            minMemoGas: m.value,
            preimages: new IdentityMap(),
            created: args.tau,
            gratis: f.value,
            lastAcc: new SlotImpl(0),
            parent: args.x.id,
        }, storage);
        a.requests.set(c, Number(l), []);
        a.balance = a.gasThreshold();
        const x_bold_s = args.x.bold_s();
        const bold_s = x_bold_s.clone();
        bold_s.balance = (x_bold_s.balance - a.gasThreshold());
        if (bold_s.balance < x_bold_s.gasThreshold()) {
            return [IxMod.w7(HostCallResult.CASH)];
        }
        const newX = new PVMResultContextImpl({
            id: args.x.id,
            nextFreeID: args.x.nextFreeID,
            provisions: args.x.provisions,
            yield: args.x.yield,
            state: new PVMAccumulationStateImpl({
                accounts: new DeltaImpl(args.x.state.accounts.elements),
                authQueue: args.x.state.authQueue,
                stagingSet: args.x.state.stagingSet,
                assigners: args.x.state.assigners,
                manager: args.x.state.manager,
                delegator: args.x.state.delegator,
                alwaysAccers: args.x.state.alwaysAccers,
            }),
            transfers: args.x.transfers,
        });
        newX.nextFreeID = i_star;
        newX.state.accounts.set(args.x.nextFreeID, a);
        newX.state.accounts.set(args.x.id, bold_s);
        return [
            IxMod.w7(args.x.nextFreeID),
            IxMod.obj({
                x: newX,
            }),
        ];
    }
    /**
     * `ΩU`
     * upgrade-service host call
     */
    upgrade(context, x) {
        const [o, g, m] = context.registers.slice(7);
        if (!context.memory.canRead(o.toSafeMemoryAddress(), 32)) {
            return [IxMod.panic()];
        }
        else {
            // FIXME: structuredclone
            const x_bold_s_prime = x.bold_s().clone();
            x_bold_s_prime.codeHash = (HashCodec.decode(context.memory.getBytes(o.toSafeMemoryAddress(), 32))
                .value);
            x_bold_s_prime.minAccGas = g.u64();
            x_bold_s_prime.minMemoGas = m.u64();
            // NOTE: this is necessary as x.bold_s() is basically a lookup on state accounts
            const newX = x.clone();
            newX.state.accounts.set(newX.id, x_bold_s_prime);
            return [
                IxMod.w7(HostCallResult.OK),
                IxMod.obj({
                    x: newX,
                }),
            ];
        }
    }
    /**
     * `ΩT`
     * transfer host call
     */
    transfer(context, x) {
        const [d, a, l, o] = context.registers.slice(7);
        const bold_d = x.state.accounts.clone();
        if (!context.memory.canRead(o.toSafeMemoryAddress(), TRANSFER_MEMO_SIZE)) {
            return [IxMod.panic()];
        }
        if (!d.fitsInU32() || !bold_d.has(d.u32())) {
            return [IxMod.w7(HostCallResult.WHO)];
        }
        if (l.value < bold_d.get(d.u32()).minMemoGas) {
            return [IxMod.w7(HostCallResult.LOW)];
        }
        if (a.value < x.bold_s().gasThreshold()) {
            return [IxMod.w7(HostCallResult.CASH)];
        }
        const b = x.bold_s().balance - a.value;
        const t = new DeferredTransferImpl({
            source: x.id,
            destination: d.u32(),
            amount: a.u64(),
            gas: l.u64(),
            memo: toTagged(context.memory.getBytes(o.toSafeMemoryAddress(), TRANSFER_MEMO_SIZE)),
        });
        const newX = x.clone();
        newX.transfers.elements.push(t);
        newX.state.accounts.get(x.id).balance = b;
        return [IxMod.w7(HostCallResult.OK), IxMod.obj({ x: newX })];
    }
    /**
     * `Ωj`
     */
    eject(context, args) {
        const [d, o] = context.registers.slice(7);
        if (!context.memory.canRead(o.toSafeMemoryAddress(), 32)) {
            return [IxMod.panic()];
        }
        const h = HashCodec.decode(context.memory.getBytes(o.toSafeMemoryAddress(), 32)).value;
        if (!d.fitsInU32() ||
            args.x.id != d.u32() ||
            !args.x.state.accounts.has(d.u32())) {
            return [IxMod.w7(HostCallResult.WHO)];
        }
        const bold_d = args.x.state.accounts.get(d.u32());
        if (compareUint8Arrays(bold_d.codeHash, encodeWithCodec(E_sub_int(32), args.x.id)) !== 0) {
            return [IxMod.w7(HostCallResult.WHO)];
        }
        const d_o = bold_d.totalOctets();
        const l = Number((d_o > 81 ? d_o : 81n) - 81n);
        const dlhl = bold_d.requests.get(h, toTagged(l));
        if (bold_d.itemInStorage() !== 2 || typeof dlhl === "undefined") {
            return [IxMod.w7(HostCallResult.HUH)];
        }
        const [, y] = dlhl;
        if (dlhl.length === 2 && y.value < args.tau.value - PREIMAGE_EXPIRATION) {
            const newX = args.x.clone();
            newX.state.accounts.delete(d.u32());
            const s_prime = newX.state.accounts.get(args.x.id);
            s_prime.balance = toTagged(s_prime.balance + bold_d.balance);
            // NOTE: not necessary to re set but here for clarity
            newX.state.accounts.set(args.x.id, s_prime);
            return [IxMod.w7(HostCallResult.OK), IxMod.obj({ x: newX })];
        }
        return [IxMod.w7(HostCallResult.HUH)];
    }
    /**
     * `ΩQ`
     * query-service host call
     */
    query(context, x) {
        const [o, z] = context.registers.slice(7);
        if (!context.memory.canRead(o.toSafeMemoryAddress(), 32)) {
            return [IxMod.panic()];
        }
        const h = HashCodec.decode(context.memory.getBytes(o.toSafeMemoryAddress(), 32)).value;
        const x_bold_s = x.bold_s();
        const bold_a = x_bold_s.requests.get(h, toTagged(Number(z)));
        if (typeof bold_a === "undefined") {
            return [IxMod.w7(HostCallResult.NONE), IxMod.w8(0)];
        }
        const [_x, y, _z] = bold_a.map((x) => BigInt(x.value));
        switch (bold_a.length) {
            case 0:
                return [IxMod.w7(0), IxMod.w8(0)];
            case 1:
                return [IxMod.w7(1n + 2n ** 32n * _x), IxMod.w8(0)];
            case 2:
                return [IxMod.w7(2n + 2n ** 32n * _x), IxMod.w8(y)];
            default:
                return [IxMod.w7(3n + 2n ** 32n * _x), IxMod.w8(y + 2n ** 32n * _z)];
        }
    }
    /**
     * `ΩS`
     * solicit-preimage host call
     */
    solicit(context, args) {
        const [o, z] = context.registers.slice(7);
        if (!context.memory.canRead(o.toSafeMemoryAddress(), 32)) {
            return [IxMod.panic()];
        }
        const h = HashCodec.decode(context.memory.getBytes(o.toSafeMemoryAddress(), 32)).value;
        const newX = args.x.clone();
        const bold_a = newX.bold_s();
        const _z = Number(z);
        if (typeof bold_a.requests.get(h, _z) === "undefined") {
            bold_a.requests.set(h, _z, toTagged([]));
        }
        else if (bold_a.requests.get(h, _z)?.length === 2) {
            const value = bold_a.requests.get(h, _z);
            bold_a.requests.set(h, _z, toTagged([...value, args.tau]));
        }
        else {
            return [IxMod.w7(HostCallResult.HUH)];
        }
        if (bold_a.balance < bold_a.gasThreshold()) {
            return [IxMod.w7(HostCallResult.FULL)];
        }
        return [IxMod.w7(HostCallResult.OK), IxMod.obj({ x: newX })];
    }
    /**
     * `ΩF`
     * forget preimage host call
     *
     */
    forget(context, args) {
        const [o, z] = context.registers.slice(7);
        if (!context.memory.canRead(o.toSafeMemoryAddress(), 32)) {
            return [IxMod.panic()];
        }
        if (!z.fitsInU32()) {
            // if it does not fit then .requests cant have it for sure
            // so bold_a is unset
            return [IxMod.w7(HostCallResult.HUH)];
        }
        const h = HashCodec.decode(context.memory.getBytes(o.toSafeMemoryAddress(), 32)).value;
        const newX = args.x.clone();
        const x_bold_s = newX.bold_s();
        const xslhz = x_bold_s.requests.get(h, z.u32());
        if (typeof xslhz === "undefined") {
            return [IxMod.w7(HostCallResult.HUH)];
        }
        else {
            const [x, y, w] = xslhz;
            log(`Preimage Request h=${HashCodec.toJSON(h)} | z=${Number(z)} - stateKey=${BufferJSONCodec().toJSON(computeRequestKey(newX.id, h, z.u32()))}`, process.env.DEBUG_TRACES === "true");
            if (xslhz.length === 0 ||
                (xslhz.length === 2 && y.value < args.tau.value - PREIMAGE_EXPIRATION)) {
                log(`l=0 or l=2 but expired... Deleting preimage`, process.env.DEBUG_TRACES === "true");
                x_bold_s.requests.delete(h, z.u32());
                x_bold_s.preimages.delete(h);
            }
            else if (xslhz.length === 1) {
                log(`l=1... adding tau=${args.tau.value}`, process.env.DEBUG_TRACES === "true");
                x_bold_s.requests.set(h, z.u32(), toTagged([x, args.tau]));
            }
            else if (xslhz.length === 3 &&
                y.value < args.tau.value - PREIMAGE_EXPIRATION) {
                log(`l=3 but expired... removing oldest tau`, process.env.DEBUG_TRACES === "true");
                x_bold_s.requests.set(h, z.u32(), toTagged([w, args.tau]));
            }
            else {
                return [IxMod.w7(HostCallResult.HUH)];
            }
        }
        //NOTE: shouldnt be necessary here for clarity
        newX.state.accounts.set(newX.id, x_bold_s);
        return [
            IxMod.w7(HostCallResult.OK),
            IxMod.obj({
                x: newX,
            }),
        ];
    }
    /**
     * `ΩΩ`
     */
    yield(context, x) {
        const o = context.registers.w7();
        if (!o.fitsInU32() || !context.memory.canRead(o.u32(), 32)) {
            return [IxMod.panic()];
        }
        const h = HashCodec.decode(context.memory.getBytes(o.u32(), 32)).value;
        const newX = x.clone();
        newX.yield = h;
        return [IxMod.w7(HostCallResult.OK), IxMod.obj({ x: newX })];
    }
    provide(context, args) {
        const [o, z] = context.registers.slice(8);
        const w7 = context.registers.w7();
        let s_star = Number(w7);
        if (w7.value === 2n ** 64n - 1n) {
            s_star = args.s;
        }
        if (!o.fitsInU32() ||
            !z.fitsInU32() ||
            context.memory.canRead(o.u32(), z.u32())) {
            return [IxMod.panic()];
        }
        const bold_i = context.memory.getBytes(o.u32(), Number(z));
        const bold_d = args.x.state.accounts;
        const bold_a = bold_d.get(s_star);
        if (typeof bold_a === "undefined") {
            return [IxMod.w7(HostCallResult.WHO)];
        }
        if (bold_a.requests.get(Hashing.blake2b(bold_i), z.u32())?.length !== 0) {
            return [IxMod.w7(HostCallResult.HUH)];
        }
        if (args.x.provisions.find((x) => x.serviceId === s_star && Buffer.compare(x.blob, bold_i) === 0)) {
            // already there
            return [IxMod.w7(HostCallResult.HUH)];
        }
        const newX = args.x.clone();
        newX.provisions.push({
            serviceId: s_star,
            blob: bold_i,
        });
        return [
            IxMod.w7(HostCallResult.OK),
            IxMod.obj({
                x: newX,
            }),
        ];
    }
    log(context, deps) {
        const [w7, _w8, _w9, _w10, _w11] = context.registers.slice(7);
        assert(w7.fitsInU32());
        assert(_w9.fitsInU32());
        assert(_w11.fitsInU32());
        const level = w7.u32();
        const w8 = _w8.u64();
        const w9 = _w9.u32();
        let target = undefined;
        if (w8 !== 0n && w9 !== 0) {
            target = context.memory.getBytes(w8, w9);
        }
        const w10 = _w10.u64();
        const w11 = _w11.u32();
        const message = context.memory.getBytes(w10, w11);
        const lvlString = ["FATAL", "WARN", "INFO", "DEBUG", "TRACE"][level];
        // const lvlIdentifier = ["⛔️", "⚠️", "ℹ️", "💁", "🪡"][level];
        let formattedMessage = `${new Date().toISOString()} ${lvlString}@${deps.core}`;
        if (typeof deps.serviceIndex !== "undefined") {
            formattedMessage += `#${deps.serviceIndex}`;
        }
        if (typeof target !== "undefined") {
            formattedMessage += ` ${Buffer.from(target).toString("utf8")}`;
        }
        formattedMessage += ` ${Buffer.from(message).toString("utf8")}`;
        log(formattedMessage, process.env.DEBUG_TRACES === "true");
        return [];
    }
}
__decorate$1([
    HostFn(0)
    // @eslint-disable-next-line @typescript-eslint/no-unused-vars
    ,
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [PVMProgramExecutionContextImpl, void 0]),
    __metadata$1("design:returntype", Array)
], HostFunctions.prototype, "gas", null);
__decorate$1([
    HostFn(1),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [PVMProgramExecutionContextImpl, Object]),
    __metadata$1("design:returntype", Array)
], HostFunctions.prototype, "fetch", null);
__decorate$1([
    HostFn(2),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [PVMProgramExecutionContextImpl, Object]),
    __metadata$1("design:returntype", Array)
], HostFunctions.prototype, "lookup", null);
__decorate$1([
    HostFn(3),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [PVMProgramExecutionContextImpl, Object]),
    __metadata$1("design:returntype", Array)
], HostFunctions.prototype, "read", null);
__decorate$1([
    HostFn(4),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [PVMProgramExecutionContextImpl, Object]),
    __metadata$1("design:returntype", Array)
], HostFunctions.prototype, "write", null);
__decorate$1([
    HostFn(5),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [PVMProgramExecutionContextImpl, Object]),
    __metadata$1("design:returntype", Array)
], HostFunctions.prototype, "info", null);
__decorate$1([
    HostFn(6),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [PVMProgramExecutionContextImpl, Object]),
    __metadata$1("design:returntype", Array)
], HostFunctions.prototype, "historical_lookup", null);
__decorate$1([
    HostFn(7),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [PVMProgramExecutionContextImpl, Object]),
    __metadata$1("design:returntype", Array)
], HostFunctions.prototype, "export", null);
__decorate$1([
    HostFn(8),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [PVMProgramExecutionContextImpl, Object]),
    __metadata$1("design:returntype", Array)
], HostFunctions.prototype, "machine", null);
__decorate$1([
    HostFn(9),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [PVMProgramExecutionContextImpl, Object]),
    __metadata$1("design:returntype", Array)
], HostFunctions.prototype, "peek", null);
__decorate$1([
    HostFn(10),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [PVMProgramExecutionContextImpl, Object]),
    __metadata$1("design:returntype", Array)
], HostFunctions.prototype, "poke", null);
__decorate$1([
    HostFn(11),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [PVMProgramExecutionContextImpl, Object]),
    __metadata$1("design:returntype", Array)
], HostFunctions.prototype, "pages", null);
__decorate$1([
    HostFn(12),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [PVMProgramExecutionContextImpl, Object]),
    __metadata$1("design:returntype", Array)
], HostFunctions.prototype, "invoke", null);
__decorate$1([
    HostFn(13),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [PVMProgramExecutionContextImpl, Object]),
    __metadata$1("design:returntype", Array)
], HostFunctions.prototype, "expunge", null);
__decorate$1([
    HostFn(14),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [PVMProgramExecutionContextImpl,
        PVMResultContextImpl]),
    __metadata$1("design:returntype", Array)
], HostFunctions.prototype, "bless", null);
__decorate$1([
    HostFn(15),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [PVMProgramExecutionContextImpl,
        PVMResultContextImpl]),
    __metadata$1("design:returntype", Array)
], HostFunctions.prototype, "assign", null);
__decorate$1([
    HostFn(16),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [PVMProgramExecutionContextImpl,
        PVMResultContextImpl]),
    __metadata$1("design:returntype", Array)
], HostFunctions.prototype, "designate", null);
__decorate$1([
    HostFn(17),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [PVMProgramExecutionContextImpl,
        PVMResultContextImpl]),
    __metadata$1("design:returntype", Array)
], HostFunctions.prototype, "checkpoint", null);
__decorate$1([
    HostFn(18),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [PVMProgramExecutionContextImpl, Object]),
    __metadata$1("design:returntype", Array)
], HostFunctions.prototype, "new", null);
__decorate$1([
    HostFn(19),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [PVMProgramExecutionContextImpl,
        PVMResultContextImpl]),
    __metadata$1("design:returntype", Array)
], HostFunctions.prototype, "upgrade", null);
__decorate$1([
    HostFn(20),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [PVMProgramExecutionContextImpl,
        PVMResultContextImpl]),
    __metadata$1("design:returntype", Array)
], HostFunctions.prototype, "transfer", null);
__decorate$1([
    HostFn(21),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [PVMProgramExecutionContextImpl, Object]),
    __metadata$1("design:returntype", Array)
], HostFunctions.prototype, "eject", null);
__decorate$1([
    HostFn(22),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [PVMProgramExecutionContextImpl,
        PVMResultContextImpl]),
    __metadata$1("design:returntype", Array)
], HostFunctions.prototype, "query", null);
__decorate$1([
    HostFn(23),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [PVMProgramExecutionContextImpl, Object]),
    __metadata$1("design:returntype", Array)
], HostFunctions.prototype, "solicit", null);
__decorate$1([
    HostFn(24),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [PVMProgramExecutionContextImpl, Object]),
    __metadata$1("design:returntype", Array)
], HostFunctions.prototype, "forget", null);
__decorate$1([
    HostFn(25),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [PVMProgramExecutionContextImpl,
        PVMResultContextImpl]),
    __metadata$1("design:returntype", Array)
], HostFunctions.prototype, "yield", null);
__decorate$1([
    HostFn(26),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [PVMProgramExecutionContextImpl, Object]),
    __metadata$1("design:returntype", Array)
], HostFunctions.prototype, "provide", null);
__decorate$1([
    HostFn(100, 0n),
    __metadata$1("design:type", Function),
    __metadata$1("design:paramtypes", [PVMProgramExecutionContextImpl, Object]),
    __metadata$1("design:returntype", Array)
], HostFunctions.prototype, "log", null);
const hostFunctions = new HostFunctions();
/**
 * used in fetch
 */
const SCodec = createCodec([
    ["service", WorkItemImpl.codecOf("service")],
    ["codeHash", WorkItemImpl.codecOf("codeHash")],
    ["refineGasLimit", WorkItemImpl.codecOf("refineGasLimit")],
    ["accumulateGasLimit", WorkItemImpl.codecOf("accumulateGasLimit")],
    ["exportCount", WorkItemImpl.codecOf("exportCount")],
    ["iLength", E_sub_int(2)],
    ["xLength", E_sub_int(2)],
    ["yLength", E_sub_int(4)],
]);
const serviceAccountCodec = createCodec([
    ["codeHash", xBytesCodec(32)], // c
    ["balance", E_sub(8)], // b
    ["gasThreshold", E_sub(8)], // t - virutal element
    ["minAccGas", E_sub(8)], // g
    ["minMemoGas", E_sub(8)], // m
    ["totalOctets", E_sub(8)], // o - virtual element
    ["itemInStorage", E_sub_int(4)], // i - virtual element
    ["gratis", E_sub(8)], // f
    ["created", asCodec(SlotImpl)], // r
    ["lastAcc", asCodec(SlotImpl)], // a
    ["parent", E_sub_int(4)], // p
]);
/**
 * $(0.7.1 - B.4)
 */
class PVMGuest {
    constructor(config) {
        Object.assign(this, config);
    }
}

const argumentInvocationTransferCodec = createCodec([
    ["tau", asCodec(SlotImpl)],
    ["serviceIndex", E_sub_int(4)],
    ["transfersLength", E_int()],
]);
/**
 * $(0.6.5 - B.15)
 */
const transferInvocation = (bold_d, t, s, transfers, deps) => {
    let bold_s = bold_d.get(s);
    assert$1(typeof bold_s !== "undefined", "Service not found in delta");
    bold_s = bold_s.clone();
    bold_s.balance = ((bold_s.balance + transfers.elements.reduce((acc, a) => acc + a.amount, 0n)));
    assert$1(bold_s.balance >= 0, "Balance cannot be negative");
    const code = bold_s.code();
    if (typeof code === "undefined" ||
        code.length > SERVICECODE_MAX_SIZE ||
        transfers.length() === 0) {
        return { serviceAccount: bold_s, gasUsed: 0n };
    }
    const out = argumentInvocation(code, 10, transfers.totalGasUsed(), encodeWithCodec(argumentInvocationTransferCodec, {
        tau: t,
        serviceIndex: s,
        transfersLength: transfers.length(),
    }), F_fn({ p_eta_0: deps.p_eta_0, bold_d, s, bold_s, bold_t: transfers }), bold_s);
    return { serviceAccount: out.out, gasUsed: out.gasUsed };
};
/**
 * $(0.6.4 - B.16)
 */
const F_fn = (deps) => (data) => {
    const { s, bold_s, bold_d } = deps;
    const fnIdentifier = FnsDb.byCode.get(data.hostCallOpcode);
    switch (fnIdentifier) {
        case "gas": {
            return applyMods(data.ctx, data.out, hostFunctions.gas(data.ctx, undefined));
        }
        case "fetch": {
            return applyMods(data.ctx, data.out, hostFunctions.fetch(data.ctx, {
                n: deps.p_eta_0,
                bold_t: deps.bold_t,
            }));
        }
        case "lookup": {
            return applyMods(data.ctx, data.out, hostFunctions.lookup(data.ctx, {
                bold_d,
                s,
                bold_s,
            }));
        }
        case "read": {
            return applyMods(data.ctx, data.out, hostFunctions.read(data.ctx, {
                bold_d,
                s,
                bold_s,
            }));
        }
        case "write": {
            const out = { bold_s: data.out };
            const m = applyMods(data.ctx, out, hostFunctions.write(data.ctx, {
                s,
                bold_s,
            }));
            data.out = out.bold_s;
            return m;
        }
        case "info": {
            const res = hostFunctions.info(data.ctx, { s, bold_d });
            return applyMods(data.ctx, data.out, res);
        }
        default:
            return applyMods(data.ctx, data.out, [
                IxMod.gas(10n),
                IxMod.w7(HostCallResult.WHAT),
            ]);
    }
};

var DeferredTransfersImpl_1;
/**
 * $(0.7.1 - 12.14)
 */
let DeferredTransfersImpl = DeferredTransfersImpl_1 = class DeferredTransfersImpl extends BaseJamCodecable {
    constructor(elements) {
        super();
        if (typeof elements === "undefined") {
            this.elements = [];
        }
        else {
            this.elements = elements;
        }
    }
    totalAmount() {
        return this.elements.reduce((acc, a) => acc + a.amount, 0n);
    }
    totalGasUsed() {
        return this.elements.reduce((acc, a) => acc + a.gas, 0n);
    }
    length() {
        return this.elements.length;
    }
    /**
     * $(0.7.0 - 12.29) | X
     */
    byDestination(destination) {
        return new DeferredTransfersImpl_1(this.elements
            .slice()
            .sort((a, b) => {
            if (a.source === b.source) {
                return a.destination - b.destination;
            }
            return a.source - b.source;
        })
            .filter((t) => t.destination === destination));
    }
    /**
     * calculates bold_x
     * $(0.7.0 - 12.30)
     */
    invokedTransfers(deps) {
        const bold_x = new Map();
        for (const [serviceIndex] of deps.d_delta.elements) {
            bold_x.set(serviceIndex, transferInvocation(deps.d_delta, deps.p_tau, serviceIndex, this.byDestination(serviceIndex), {
                p_eta_0: deps.p_eta_0,
            }));
        }
        return bold_x;
    }
    /**
     * computes big bold X
     * $(0.7.0 - 12.34)
     *
     * @param invokedTransfers - bold_x
     */
    statistics(invokedTransfers) {
        const toRet = new Map();
        for (const [destService, { gasUsed /* u */ }] of invokedTransfers) {
            const r = this.byDestination(destService);
            if (r.length() > 0) {
                toRet.set(destService, {
                    count: r.length(),
                    // u
                    gasUsed,
                });
            }
        }
        return toRet;
    }
    static newEmpty() {
        return new DeferredTransfersImpl_1([]);
    }
};
__decorate$1([
    lengthDiscriminatedCodec(DeferredTransferImpl),
    __metadata$1("design:type", Array)
], DeferredTransfersImpl.prototype, "elements", void 0);
DeferredTransfersImpl = DeferredTransfersImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Array])
], DeferredTransfersImpl);

var DisputesCulprits_1;
let DisputeCulpritImpl = class DisputeCulpritImpl extends BaseJamCodecable {
    isSignatureValid() {
        return Ed25519.verifySignature(this.signature, this.key, new Uint8Array([...JAM_GUARANTEE, ...this.target]));
    }
};
__decorate$1([
    codec$1(HashCodec),
    __metadata$1("design:type", Object)
], DisputeCulpritImpl.prototype, "target", void 0);
__decorate$1([
    codec$1(xBytesCodec(32)),
    __metadata$1("design:type", Object)
], DisputeCulpritImpl.prototype, "key", void 0);
__decorate$1([
    codec$1(xBytesCodec(64)),
    __metadata$1("design:type", Object)
], DisputeCulpritImpl.prototype, "signature", void 0);
DisputeCulpritImpl = __decorate$1([
    JamCodecable()
], DisputeCulpritImpl);
let DisputesCulprits = DisputesCulprits_1 = class DisputesCulprits extends BaseJamCodecable {
    constructor(elements = []) {
        super();
        this.elements = elements;
    }
    checkValidity(deps) {
        const bold_k = new IdentitySet([
            ...deps.kappa.elements.map((v) => v.ed25519),
            ...deps.lambda.elements.map((v) => v.ed25519),
        ]);
        deps.disputesState.offenders.forEach((k) => bold_k.delete(k));
        //console.log(IdentitySetCodec(xBytesCodec(32)).toJSON(bold_k));
        // $(0.7.1 - 10.5) - partial - misses the r \in p_psi_b
        // check culprit key is in lambda or kappa
        const checkCulpritKeys = this.elements.every(({ key }) => bold_k.has(key));
        if (!checkCulpritKeys) {
            return err(DisputesCulpritError.CULPRITKEYNOTINK);
        }
        // check culprit signatures
        const checkCulpritSignatures = this.elements.every((culprit) => culprit.isSignatureValid());
        if (!checkCulpritSignatures) {
            return err(DisputesCulpritError.CULPRITSIGNATURESWRONG);
        }
        // enforce culprit are ordered by key
        // $(0.7.1 - 10.8)
        if (this.elements.length > 0) {
            for (let i = 1; i < this.elements.length; i++) {
                const [prev, curr] = [this.elements[i - 1], this.elements[i]];
                if (compareUint8Arrays(prev.key, curr.key) >= 0) {
                    return err(DisputesCulpritError.CULPRIT_NOT_ORDERED_BY_ED25519_PUBLIC_KEY);
                }
            }
        }
        const negativeVerdicts = deps.bold_v.filter((v) => v.votes === VerdictVoteKind.ZERO);
        // ensure any negative verdicts have at least 2 in cuprit
        // $(0.7.1 - 10.14)
        if (false ===
            negativeVerdicts.every((v) => {
                if (this.elements.filter((c) => compareUint8Arrays(c.target, v.reportHash) === 0).length < 2) {
                    return false;
                }
                return true;
            })) {
            return err(DisputesCulpritError.NEGATIVE_VERDICTS_NOT_IN_CULPRIT);
        }
        return ok(toTagged(this));
    }
    static empty() {
        return new DisputesCulprits_1([]);
    }
};
__decorate$1([
    lengthDiscriminatedCodec(DisputeCulpritImpl, SINGLE_ELEMENT_CLASS),
    __metadata$1("design:type", Array)
], DisputesCulprits.prototype, "elements", void 0);
DisputesCulprits = DisputesCulprits_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Array])
], DisputesCulprits);
var DisputesCulpritError;
(function (DisputesCulpritError) {
    DisputesCulpritError["CULPRITKEYNOTINK"] = "CULPRITKEYNOTINK";
    DisputesCulpritError["CULPRITSIGNATURESWRONG"] = "CULPRITSIGNATURESWRONG";
    DisputesCulpritError["CULPRIT_NOT_ORDERED_BY_ED25519_PUBLIC_KEY"] = "CULPRIT_NOT_ORDERED_BY_ED25519_PUBLIC_KEY";
    DisputesCulpritError["NEGATIVE_VERDICTS_NOT_IN_CULPRIT"] = "NEGATIVE_VERDICTS_NOT_IN_CULPRIT";
})(DisputesCulpritError || (DisputesCulpritError = {}));

var DisputesFaults_1;
let DisputeFaultImpl = class DisputeFaultImpl extends BaseJamCodecable {
    isSignatureValid() {
        return Ed25519.verifySignature(this.signature, this.key, new Uint8Array([
            ...(this.vote ? JAM_VALID : JAM_INVALID),
            ...this.target,
        ]));
    }
};
__decorate$1([
    codec$1(HashCodec),
    __metadata$1("design:type", Object)
], DisputeFaultImpl.prototype, "target", void 0);
__decorate$1([
    booleanCodec(),
    __metadata$1("design:type", Boolean)
], DisputeFaultImpl.prototype, "vote", void 0);
__decorate$1([
    codec$1(xBytesCodec(32)),
    __metadata$1("design:type", Object)
], DisputeFaultImpl.prototype, "key", void 0);
__decorate$1([
    codec$1(xBytesCodec(64)),
    __metadata$1("design:type", Object)
], DisputeFaultImpl.prototype, "signature", void 0);
DisputeFaultImpl = __decorate$1([
    JamCodecable()
], DisputeFaultImpl);
let DisputesFaults = DisputesFaults_1 = class DisputesFaults extends BaseJamCodecable {
    constructor(elements = []) {
        super();
        this.elements = elements;
    }
    checkValidity(deps) {
        const positiveVerdicts = deps.bold_v.filter((v) => v.votes === VerdictVoteKind.TWO_THIRD_PLUS_ONE);
        // ensure any positive verdicts are in faults
        // $(0.7.1 - 10.13)
        if (false ===
            positiveVerdicts.every((v) => this.elements.some((f) => compareUint8Arrays(f.target, v.reportHash) === 0))) {
            return err(DisputesFaultError.POSITIVE_VERDICTS_NOT_IN_FAULTS);
        }
        // $(0.7.1 - 10.3)
        const bold_k = new IdentitySet([
            ...deps.kappa.elements.map((v) => v.ed25519),
            ...deps.lambda.elements.map((v) => v.ed25519),
        ]);
        // remove offenders
        deps.disputesState.offenders.forEach((offender) => bold_k.delete(offender));
        // $(0.7.1 - 10.6) - partial - misses the posterior check
        // check faults key is in lambda or kappa
        const checkFaultKeys = this.elements.every(({ key }) => bold_k.has(key));
        if (!checkFaultKeys) {
            return err(DisputesFaultError.FAULTKEYNOTINK);
        }
        const checkFaultSignatures = this.elements.every((fault) => fault.isSignatureValid());
        if (!checkFaultSignatures) {
            return err(DisputesFaultError.FAULTSIGNATURESWRONG);
        }
        // enforce faults are ordered by ed25519PublicKey
        // $(0.7.1 - 10.8)
        if (this.elements.length > 0) {
            for (let i = 1; i < this.elements.length; i++) {
                const [prev, curr] = [this.elements[i - 1], this.elements[i]];
                if (compareUint8Arrays(prev.key, curr.key) >= 0) {
                    return err(DisputesFaultError.FAULTS_NOT_ORDERED_BY_ED25519_PUBLIC_KEY);
                }
            }
        }
        return ok(toTagged(this));
    }
    static empty() {
        return new DisputesFaults_1([]);
    }
};
__decorate$1([
    lengthDiscriminatedCodec(DisputeFaultImpl, SINGLE_ELEMENT_CLASS),
    __metadata$1("design:type", Array)
], DisputesFaults.prototype, "elements", void 0);
DisputesFaults = DisputesFaults_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Array])
], DisputesFaults);
var DisputesFaultError;
(function (DisputesFaultError) {
    DisputesFaultError["FAULTSIGNATURESWRONG"] = "FAULTSIGNATURESWRONG";
    DisputesFaultError["FAULTKEYNOTINK"] = "FAULTKEYNOTINK";
    DisputesFaultError["FAULTS_NOT_ORDERED_BY_ED25519_PUBLIC_KEY"] = "FAULTS_NOT_ORDERED_BY_ED25519_PUBLIC_KEY";
    DisputesFaultError["POSITIVE_VERDICTS_NOT_IN_FAULTS"] = "POSITIVE_VERDICTS_NOT_IN_FAULTS";
})(DisputesFaultError || (DisputesFaultError = {}));

var DisputeExtrinsicImpl_1;
/**
 * codec order defined in $(0.7.1 - C.21)
 */
let DisputeExtrinsicImpl = DisputeExtrinsicImpl_1 = class DisputeExtrinsicImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        if (typeof config !== "undefined") {
            Object.assign(this, config);
        }
    }
    checkValidity(deps) {
        const vRes = this.verdicts.checkValidity({
            tau: deps.tau,
            kappa: deps.kappa,
            lambda: deps.lambda,
            disputesState: deps.disputesState,
        });
        if (vRes.isErr()) {
            return err(vRes.error);
        }
        const bold_v = vRes.value.votes();
        const cRes = this.culprits.checkValidity({
            bold_v,
            disputesState: deps.disputesState,
            kappa: deps.kappa,
            lambda: deps.lambda,
        });
        if (cRes.isErr()) {
            return err(cRes.error);
        }
        const fRes = this.faults.checkValidity({
            bold_v,
            kappa: deps.kappa,
            lambda: deps.lambda,
            disputesState: deps.disputesState,
        });
        if (fRes.isErr()) {
            return err(fRes.error);
        }
        // NOTE: all posterior checks are done in disputes state
        return ok(toTagged(this));
    }
    static newEmpty() {
        return new DisputeExtrinsicImpl_1({
            culprits: DisputesCulprits.empty(),
            faults: DisputesFaults.empty(),
            verdicts: DisputesVerdicts.empty(),
        });
    }
};
__decorate$1([
    codec$1(DisputesVerdicts),
    __metadata$1("design:type", DisputesVerdicts)
], DisputeExtrinsicImpl.prototype, "verdicts", void 0);
__decorate$1([
    codec$1(DisputesCulprits),
    __metadata$1("design:type", DisputesCulprits)
], DisputeExtrinsicImpl.prototype, "culprits", void 0);
__decorate$1([
    codec$1(DisputesFaults),
    __metadata$1("design:type", DisputesFaults)
], DisputeExtrinsicImpl.prototype, "faults", void 0);
DisputeExtrinsicImpl = DisputeExtrinsicImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], DisputeExtrinsicImpl);

/**
 * $(0.7.1 - F.1)
 */
const FisherYates = (arr, entropies) => {
    const sliced = arr.slice();
    let l = sliced.length;
    let index = 0;
    const toRet = [];
    while (l > 0) {
        index = entropies[sliced.length - l] % l;
        toRet.push(sliced[index]);
        sliced[index] = sliced[l - 1];
        l--;
    }
    return toRet;
};
/**
 * $(0.7.1 - F.3)
 */
const FisherYatesH = (arr, entropy) => {
    return FisherYates(arr, Q(arr.length, entropy));
};
/**
 * $(0.7.1 - F.2)
 */
const Q = (l, entropy) => {
    const toRet = [];
    for (let i = 0; i < l; i++) {
        toRet.push(E_4_int.decode(Hashing.blake2b(new Uint8Array([
            ...entropy,
            ...encodeWithCodec(E_4_int, Math.floor(i / 8)),
        ])).subarray((4 * i) % 32, ((4 * i) % 32) + 4)).value);
    }
    return toRet;
};

var GuaranteesExtrinsicImpl_1;
let SingleWorkReportGuaranteeSignatureImpl = class SingleWorkReportGuaranteeSignatureImpl extends BaseJamCodecable {
    checkValidity(deps) {
        // $(0.7.1 - 11.23) | should be Nv
        if (this.validatorIndex < 0 ||
            this.validatorIndex >= NUMBER_OF_VALIDATORS) {
            return err(EGError.VALIDATOR_INDEX_MUST_BE_IN_BOUNDS);
        }
        // $(0.7.1 - 11.26)
        const isValid = Ed25519.verifySignature(this.signature, deps.guarantorAssignment.validatorsED22519Key[this.validatorIndex], deps.messageToSign);
        if (!isValid) {
            return err(EGError.SIGNATURE_INVALID);
        }
        // c_v = r_c
        if (deps.guarantorAssignment.validatorsAssignedCore[this.validatorIndex] !==
            deps.reportCore) {
            // validator was not assigned to the core in workreport
            return err(EGError.CORE_INDEX_MISMATCH);
        }
        return ok(toTagged(this));
    }
};
__decorate$1([
    eSubIntCodec(2, "validator_index"),
    __metadata$1("design:type", Number)
], SingleWorkReportGuaranteeSignatureImpl.prototype, "validatorIndex", void 0);
__decorate$1([
    codec$1(xBytesCodec(64)),
    __metadata$1("design:type", Object)
], SingleWorkReportGuaranteeSignatureImpl.prototype, "signature", void 0);
SingleWorkReportGuaranteeSignatureImpl = __decorate$1([
    JamCodecable()
], SingleWorkReportGuaranteeSignatureImpl);
let SingleWorkReportGuaranteeImpl = class SingleWorkReportGuaranteeImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        if (typeof config !== "undefined") {
            Object.assign(this, config);
        }
    }
    totalSize() {
        // $(0.7.1 - 11.8)
        return (this.report.authTrace.length +
            this.report.digests
                .map((r) => r.result)
                .filter((ro) => ro.isSuccess()) // check if binary in graypaper
                .map((ro) => ro.success.length)
                .reduce((a, b) => a + b, 0));
    }
    messageToSign() {
        // $(0.7.1 - 11.26)
        return new Uint8Array([
            ...JAM_GUARANTEE,
            ...encodeWithCodec(HashCodec, this.report.hash()),
        ]);
    }
    checkValidity(deps) {
        // $(0.7.1 - 11.3) | Check the number of dependencies in the workreports
        if (this.report.srLookup.size + this.report.context.prerequisites.length >
            MAX_WORK_PREREQUISITES) {
            return err(EGError.TOO_MANY_PREREQUISITES);
        }
        // $(0.7.1 - 11.8) | check work report total size
        if (this.totalSize() > MAX_WORKREPORT_OUTPUT_SIZE) {
            return err(EGError.WORKREPORT_SIZE_EXCEEDED);
        }
        // $(0.7.1 - 11.23)
        if (this.signatures.length < 2 || this.signatures.length > 3) {
            return err(EGError.CREDS_MUST_BE_BETWEEN_2_AND_3);
        }
        // $(0.7.1 - 11.25) | creds must be ordered by their val idx
        for (let i = 1; i < this.signatures.length; i++) {
            const [prev, next] = [this.signatures[i - 1], this.signatures[i]];
            if (prev.validatorIndex >= next.validatorIndex) {
                return err(EGError.VALIDATOR_INDEX_MUST_BE_UNIQUE_AND_ORDERED);
            }
        }
        // tau'/R
        const curRotation = Math.floor(deps.p_tau.value / VALIDATOR_CORE_ROTATION);
        // And of $(0.7.1 - 11.26)
        if (VALIDATOR_CORE_ROTATION * (curRotation - 1) > this.slot.value) {
            return err(EGError.TIMESLOT_BOUNDS_1);
        }
        if (this.slot.value > deps.p_tau.value) {
            return err(EGError.TIMESLOT_BOUNDS_2);
        }
        // $(0.7.1 - 11.26)
        const messageToSign = this.messageToSign();
        for (const signature of this.signatures) {
            let guarantorAssignment = deps.M_STAR;
            if (curRotation === Math.floor(this.slot.value / VALIDATOR_CORE_ROTATION)) {
                guarantorAssignment = deps.M;
            }
            const [sig_err, _] = signature
                .checkValidity({
                guarantorAssignment,
                reportCore: this.report.core,
                messageToSign,
            })
                .safeRet();
            if (typeof sig_err !== "undefined") {
                return err(sig_err);
            }
        }
        return ok(toTagged(this));
    }
};
__decorate$1([
    codec$1(WorkReportImpl),
    __metadata$1("design:type", WorkReportImpl)
], SingleWorkReportGuaranteeImpl.prototype, "report", void 0);
__decorate$1([
    codec$1(SlotImpl),
    __metadata$1("design:type", SlotImpl)
], SingleWorkReportGuaranteeImpl.prototype, "slot", void 0);
__decorate$1([
    lengthDiscriminatedCodec(SingleWorkReportGuaranteeSignatureImpl),
    __metadata$1("design:type", Object)
], SingleWorkReportGuaranteeImpl.prototype, "signatures", void 0);
SingleWorkReportGuaranteeImpl = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], SingleWorkReportGuaranteeImpl);
/**
 * $(0.7.1 - C.19) | codec
 */
let GuaranteesExtrinsicImpl = GuaranteesExtrinsicImpl_1 = class GuaranteesExtrinsicImpl extends BaseJamCodecable {
    constructor(elements = []) {
        super();
        this.elements = toTagged(elements);
    }
    elementForCore(core) {
        return this.elements.find((el) => el.report.core === core);
    }
    /**
     * calculates bold I
     * which contains a list of all work reports included in the extrinsic
     * $(0.7.1 - 11.28)
     */
    workReports() {
        return toTagged(this.elements.map((el) => el.report));
    }
    /**
     * $(0.7.1 - 11.22)
     */
    M_star(deps) {
        return M_STAR_fn({
            p_eta2: toPosterior(deps.p_entropy._2),
            p_eta3: toPosterior(deps.p_entropy._3),
            p_kappa: deps.p_kappa,
            p_lambda: deps.p_lambda,
            p_offenders: toPosterior(deps.p_disputes.offenders),
            p_tau: deps.p_tau,
        });
    }
    /**
     * $(0.7.1 - 11.19 / 11.20 / 11.21)
     */
    M(deps) {
        return M_fn({
            entropy: deps.p_entropy._2,
            p_tau: deps.p_tau,
            tauOffset: 0,
            validatorKeys: deps.p_kappa,
            p_offenders: toPosterior(deps.p_disputes.offenders),
        });
    }
    /**
     * $(0.7.1 - 11.26) | calculates bold G in it
     */
    reporters(deps) {
        const M_star = this.M_star({
            p_entropy: deps.p_entropy,
            p_kappa: deps.p_kappa,
            p_lambda: deps.p_lambda,
            p_disputes: deps.p_disputes,
            p_tau: deps.p_tau,
        });
        const M = this.M({
            p_tau: deps.p_tau,
            p_disputes: deps.p_disputes,
            p_entropy: deps.p_entropy,
            p_kappa: deps.p_kappa,
        });
        const reporters = new IdentitySet();
        const curRotation = Math.floor(deps.p_tau.value / VALIDATOR_CORE_ROTATION);
        for (const { signatures, slot } of this.elements) {
            let usedG = M_star;
            if (curRotation === Math.floor(slot.value / VALIDATOR_CORE_ROTATION)) {
                usedG = M;
            }
            for (const { validatorIndex } of signatures) {
                reporters.add(usedG.validatorsED22519Key[validatorIndex]);
            }
        }
        return reporters;
    }
    checkValidity(deps) {
        if (this.elements.length === 0) {
            return ok(toTagged(this)); // optimization
        }
        // $(0.7.1 - 11.23)
        if (this.elements.length > CORES) {
            return err(EGError.EXTRINSIC_LENGTH_MUST_BE_LESS_THAN_CORES);
        }
        // $(0.7.1 - 11.24) - make sure they're ordered and uniqueby core
        for (let i = 1; i < this.elements.length; i++) {
            const [prev, next] = [this.elements[i - 1], this.elements[i]];
            if (prev.report.core >= next.report.core) {
                return err(EGError.CORE_INDEX_MUST_BE_UNIQUE_AND_ORDERED);
            }
            if (next.report.core >= CORES || next.report.core < 0) {
                return err(EGError.CORE_INDEX_NOT_IN_BOUNDS);
            }
        }
        for (const element of this.elements) {
            const [e, _] = element
                .checkValidity({
                p_tau: deps.p_tau,
                M_STAR: this.M_star({
                    p_tau: deps.p_tau,
                    p_kappa: deps.p_kappa,
                    p_entropy: deps.p_entropy,
                    p_lambda: deps.p_lambda,
                    p_disputes: deps.p_disputes,
                }),
                M: this.M({
                    p_disputes: deps.p_disputes,
                    p_tau: deps.p_tau,
                    p_entropy: deps.p_entropy,
                    p_kappa: deps.p_kappa,
                }),
            })
                .safeRet();
            if (typeof e !== "undefined") {
                return err(e);
            }
        }
        const bold_I = this.workReports();
        // $(0.7.1 - 11.29) | no reports on core with pending avail
        for (let i = 0; i < bold_I.length; i++) {
            const { core, authorizerHash } = bold_I[i];
            if (typeof deps.dd_rho.elementAt(core) !== "undefined") {
                return err(EGError.REPORT_PENDING_AVAILABILITY);
            }
            const poolHashes = new IdentitySet(deps.authPool.elementAt(core));
            if (!poolHashes.has(authorizerHash)) {
                return err(EGError.MISSING_AUTH);
            }
        }
        // $(0.7.1 - 11.30) | check gas requiremens
        for (const report of bold_I) {
            const gasUsed = report.digests
                .map((r) => r.gasLimit)
                .reduce((a, b) => a + b, 0n);
            if (gasUsed > TOTAL_GAS_ACCUMULATION_LOGIC) {
                return err(EGError.GAS_EXCEEDED_ACCUMULATION_LIMITS);
            }
            for (const bold_d of report.digests) {
                const acc = deps.serviceAccounts.get(bold_d.serviceIndex);
                if (typeof acc === "undefined") {
                    return err(EGError.REPORT_NOT_IN_ACCOUNTS);
                }
                if (bold_d.gasLimit < acc.minAccGas) {
                    return err(EGError.GAS_TOO_LOW);
                }
            }
        }
        // $(0.7.1 - 11.31)
        const bold_x = bold_I.map(({ context }) => context);
        const bold_p = bold_I.map(({ avSpec }) => avSpec.packageHash);
        // $(0.7.1 - 11.32)
        if (bold_p.length !== new IdentitySet(bold_p).size) {
            return err(EGError.WORK_PACKAGE_HASH_NOT_UNIQUE);
        }
        for (const workContext of bold_x) {
            // $(0.7.1 - 11.33)
            const y = deps.d_recentHistory.elements.find((_y) => Buffer.compare(_y.headerHash, workContext.anchorHash) === 0 &&
                Buffer.compare(_y.stateRoot, workContext.anchorPostState) === 0 &&
                Buffer.compare(_y.accumulationResultMMB, workContext.anchorAccOutLog) === 0);
            if (typeof y === "undefined") {
                return err(EGError.ANCHOR_NOT_IN_RECENTHISTORY);
            }
            // $(0.7.1 - 11.34) each lookup anchor block within `L` timeslot
            if (workContext.lookupAnchorSlot.value <
                deps.p_tau.value - MAXIMUM_AGE_LOOKUP_ANCHOR) {
                return err(EGError.LOOKUP_ANCHOR_NOT_WITHIN_L);
            }
            // $(0.7.1 - 11.35)
            const lookupHeader = deps.headerLookupHistory.get(workContext.lookupAnchorSlot);
            if (typeof lookupHeader === "undefined") {
                return err(EGError.LOOKUP_ANCHOR_TIMESLOT_MISMATCH);
            }
            if (Buffer.compare(lookupHeader.signedHash(), workContext.lookupAnchorHash) !== 0) {
                return err(EGError.LOOKUP_HASH_MISMATCH);
            }
        }
        // $(0.7.1 - 11.36)
        const bold_q = new IdentitySet(deps.accumulationQueue.elements
            .flat()
            .map((a) => a.workReport.avSpec.packageHash)
            .flat());
        // $(0.7.1 - 11.37)
        const bold_a = new IdentitySet(deps.rho.elements
            .map((a) => a?.workReport.avSpec.packageHash)
            .flat()
            .filter((a) => typeof a !== "undefined"));
        const kxp = deps.beta.recentHistory.allPackageHashes();
        const _x = new Set(deps.accumulationHistory.elements.map((a) => [...a.values()]).flat());
        // $(0.7.1 - 11.38)
        for (const p of bold_p) {
            if (bold_q.has(p) || bold_a.has(p) || kxp.has(p) || _x.has(p)) {
                return err(EGError.WORKPACKAGE_IN_PIPELINE);
            }
        }
        // $(0.7.1 - 11.39)
        const pSet = new IdentitySet(bold_p);
        kxp.forEach((reportedHash) => pSet.add(reportedHash));
        for (const r of bold_I) {
            const _p = new Set([...r.srLookup.keys()]);
            r.context.prerequisites.forEach((rcp) => _p.add(rcp));
            for (const p of _p.values()) {
                if (!pSet.has(p)) {
                    return err(EGError.SRLWP_NOTKNOWN);
                }
            }
        }
        {
            // $(0.7.1 - 11.40)
            const bold_p = new IdentityMap(this.elements
                .map((e) => e.report.avSpec)
                .map((wPSpec) => [wPSpec.packageHash, wPSpec.segmentRoot]));
            // $(0.7.1 - 11.41)
            const recentAndCurrentWP = new IdentityMap(deps.beta.recentHistory.elements
                .map((rh) => [...rh.reportedPackages.entries()])
                .flat()
                .concat([...bold_p.entries()]));
            for (const bold_r of bold_I) {
                for (const [wph, h] of bold_r.srLookup) {
                    const entry = recentAndCurrentWP.get(wph);
                    if (typeof entry === "undefined" || Buffer.compare(entry, h) !== 0) {
                        return err(EGError.SRLWP_NOTKNOWN);
                    }
                }
            }
        }
        // $(0.7.1 - 11.42) | check the result serviceIndex & codeHash match what we have in delta
        for (const bold_r of bold_I) {
            for (const bold_d of bold_r.digests) {
                if (Buffer.compare(bold_d.codeHash, deps.serviceAccounts.get(bold_d.serviceIndex)?.codeHash ??
                    new Uint8Array()) !== 0) {
                    return err(EGError.WRONG_CODEHASH);
                }
            }
        }
        return ok(toTagged(this));
    }
    static newEmpty() {
        return new GuaranteesExtrinsicImpl_1([]);
    }
};
__decorate$1([
    lengthDiscriminatedCodec(SingleWorkReportGuaranteeImpl, SINGLE_ELEMENT_CLASS),
    __metadata$1("design:type", Object)
], GuaranteesExtrinsicImpl.prototype, "elements", void 0);
GuaranteesExtrinsicImpl = GuaranteesExtrinsicImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Array])
], GuaranteesExtrinsicImpl);
var EGError;
(function (EGError) {
    EGError["GAS_TOO_LOW"] = "Work result gasPrioritization is too low";
    EGError["GAS_EXCEEDED_ACCUMULATION_LIMITS"] = "Gas exceeded maximum accumulation limit GA";
    EGError["WORKREPORT_SIZE_EXCEEDED"] = "Workreport max size exceeded";
    EGError["MISSING_AUTH"] = "MISSING_AUTH";
    EGError["TOO_MANY_PREREQUISITES"] = "Too many work prerequisites in report";
    EGError["ANCHOR_NOT_IN_RECENTHISTORY"] = "ANCHOR_NOT_IN_RECENTHISTORY";
    EGError["EXTRINSIC_LENGTH_MUST_BE_LESS_THAN_CORES"] = "Extrinsic length must be less than CORES";
    EGError["CORE_INDEX_MUST_BE_UNIQUE_AND_ORDERED"] = "core index must be unique and ordered";
    EGError["CORE_INDEX_NOT_IN_BOUNDS"] = "core index not in bounds";
    EGError["CREDS_MUST_BE_BETWEEN_2_AND_3"] = "credential length must be between 2 and 3";
    EGError["VALIDATOR_INDEX_MUST_BE_IN_BOUNDS"] = "validator index must be 0 <= x < V";
    EGError["VALIDATOR_INDEX_MUST_BE_UNIQUE_AND_ORDERED"] = "validator index must be unique and ordered";
    EGError["SIGNATURE_INVALID"] = "EG signature is invalid";
    EGError["CORE_INDEX_MISMATCH"] = "CORE_INDEX_MISMATCH";
    EGError["TIMESLOT_BOUNDS_1"] = "Time slot must be within bounds, R * floor(tau'/R) - 1 <= t";
    EGError["TIMESLOT_BOUNDS_2"] = "Time slot must be within bounds, t <= tau'";
    EGError["WORK_PACKAGE_HASH_NOT_UNIQUE"] = "WORK_PACKAGE_HASH_NOT_UNIQUE";
    EGError["WORKPACKAGE_IN_PIPELINE"] = "Work Package alredy known";
    EGError["SRLWP_NOTKNOWN"] = "Reported Segment Root lookup not known";
    EGError["LOOKUP_ANCHOR_NOT_WITHIN_L"] = "LOOKUP_ANCHOR_NOT_WITHIN_L";
    EGError["REPORT_PENDING_AVAILABILITY"] = "Bit may be set if the corresponding core has a report pending availability";
    EGError["LOOKUP_ANCHOR_TIMESLOT_MISMATCH"] = "LOOKUP_ANCHOR_TIMESLOT_MISMATCH";
    EGError["WRONG_CODEHASH"] = "WRONG_CODEHASH";
    EGError["LOOKUP_HASH_MISMATCH"] = "LOOKUP_HASH_MISMATCH";
    EGError["REPORT_NOT_IN_ACCOUNTS"] = "REPORT_NOT_IN_ACCOUNTS";
})(EGError || (EGError = {}));
const M_fn = (input) => {
    // R(c,n) = [(x + n) mod CORES | x E c]
    const R = (c, n) => c.map((x) => (x + n) % CORES);
    // P(e,t) = R(F([floor(CORES * i / NUMBER_OF_VALIDATORS) | i E NUMBER_OF_VALIDATORS], e), floor(t mod EPOCH_LENGTH/ R))
    const P = (e, t) => {
        return R(FisherYatesH(Array.from({ length: NUMBER_OF_VALIDATORS }, (_, i) => Math.floor((CORES * i) / NUMBER_OF_VALIDATORS)), e), Math.floor((t.value % EPOCH_LENGTH) / VALIDATOR_CORE_ROTATION));
    };
    return {
        // c
        validatorsAssignedCore: P(input.entropy, toTagged(new SlotImpl((input.p_tau.value + input.tauOffset)))),
        // k
        validatorsED22519Key: input.validatorKeys
            .phi(input.p_offenders)
            .elements.map((v) => v.ed25519),
    };
};
const M_STAR_fn = (input) => {
    if (new SlotImpl((input.p_tau.value - VALIDATOR_CORE_ROTATION)).epochIndex() == input.p_tau.epochIndex()) {
        return M_fn({
            entropy: input.p_eta2,
            tauOffset: -VALIDATOR_CORE_ROTATION,
            p_tau: input.p_tau,
            validatorKeys: input.p_kappa,
            p_offenders: input.p_offenders,
        });
    }
    else {
        return M_fn({
            entropy: input.p_eta3,
            tauOffset: -VALIDATOR_CORE_ROTATION,
            p_tau: input.p_tau,
            validatorKeys: input.p_lambda,
            p_offenders: input.p_offenders,
        });
    }
};

var PreimagesExtrinsicImpl_1;
let PreimageElement = class PreimageElement extends BaseJamCodecable {
};
__decorate$1([
    eSubIntCodec(4),
    __metadata$1("design:type", Number)
], PreimageElement.prototype, "requester", void 0);
__decorate$1([
    codec$1(LengthDiscrimantedIdentityCodec),
    __metadata$1("design:type", Uint8Array)
], PreimageElement.prototype, "blob", void 0);
PreimageElement = __decorate$1([
    JamCodecable()
], PreimageElement);
/**
 * $(0.7.1 - C.18) | codec
 */
let PreimagesExtrinsicImpl = PreimagesExtrinsicImpl_1 = class PreimagesExtrinsicImpl extends BaseJamCodecable {
    constructor(elements = []) {
        super();
        this.elements = elements;
    }
    checkValidity(deps) {
        for (const { requester } of this.elements) {
            if (requester < 0 || requester >= 2 ** 32) {
                return err(EPError.VALIDATION_ERROR);
            }
        }
        // $(0.7.1 - 12.34)
        for (let i = 1; i < this.elements.length; i++) {
            const prev = this.elements[i - 1];
            if (prev.requester > this.elements[i].requester) {
                return err(EPError.PREIMAGES_NOT_SORTED);
            }
            else if (prev.requester === this.elements[i].requester) {
                const comparisonResult = compareUint8Arrays(prev.blob, this.elements[i].blob);
                if (comparisonResult !== -1) {
                    return err(EPError.PREIMAGES_NOT_SORTED);
                }
            }
        }
        // $(0.7.1 - 12.35) data must be solicited by a service but not yet provided
        for (const { requester, blob } of this.elements) {
            if (!deps.serviceAccounts
                .get(requester)
                .isPreimageSolicitedButNotYetProvided(Hashing.blake2b(blob), blob.length)) {
                return err(EPError.PREIMAGE_PROVIDED_OR_UNSOLICITED);
            }
        }
        return ok(toTagged(this));
    }
    static newEmpty() {
        return new PreimagesExtrinsicImpl_1([]);
    }
};
__decorate$1([
    lengthDiscriminatedCodec(PreimageElement, SINGLE_ELEMENT_CLASS),
    __metadata$1("design:type", Array)
], PreimagesExtrinsicImpl.prototype, "elements", void 0);
PreimagesExtrinsicImpl = PreimagesExtrinsicImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Array])
], PreimagesExtrinsicImpl);
var EPError;
(function (EPError) {
    EPError["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    EPError["PREIMAGE_PROVIDED_OR_UNSOLICITED"] = "PREIMAGE_PROVIDED_OR_UNSOLICITED";
    EPError["PREIMAGES_NOT_SORTED"] = "PREIMAGES_NOT_SORTED";
})(EPError || (EPError = {}));

var TicketsExtrinsicImpl_1;
var ETError;
(function (ETError) {
    ETError["LOTTERY_ENDED"] = "Lottery has ended";
    ETError["INVALID_ENTRY_INDEX"] = "Invalid Entry index must be 0<=x<N";
    ETError["INVALID_VRF_PROOF"] = "Invalid VRF proof";
    ETError["MAX_TICKETS_EXCEEDED"] = "Extrinsic length must be less than MAX_TICKETS_PER_BLOCK";
    ETError["TICKET_IN_GAMMA_A"] = "Ticket id already in gamma_a";
    ETError["UNSORTED_VRF_PROOFS"] = "VRF outputs must be in ascending order and not duplicate";
})(ETError || (ETError = {}));
let TicketsExtrinsicElementImpl = class TicketsExtrinsicElementImpl extends BaseJamCodecable {
    /**
     * $(0.7.1 - 6.29) | we validate the ticket
     */
    checkValidity(deps) {
        if (this.attempt < 0 || this.attempt >= MAX_TICKETS_PER_VALIDATOR) {
            return err(ETError.INVALID_ENTRY_INDEX);
        }
        const sig = Bandersnatch.verifyVrfProof(this.proof, deps.p_gamma_z.root, new Uint8Array([
            ...JAM_TICKET_SEAL,
            ...encodeWithCodec(HashCodec, deps.p_entropy._2),
            this.attempt,
        ]));
        if (!sig) {
            return err(ETError.INVALID_VRF_PROOF);
        }
        return ok(toTagged(this));
    }
};
__decorate$1([
    eSubIntCodec(1),
    __metadata$1("design:type", Number)
], TicketsExtrinsicElementImpl.prototype, "attempt", void 0);
__decorate$1([
    jsonCodec(BufferJSONCodec(), "signature"),
    binaryCodec(fixedSizeIdentityCodec(784)),
    __metadata$1("design:type", Object)
], TicketsExtrinsicElementImpl.prototype, "proof", void 0);
TicketsExtrinsicElementImpl = __decorate$1([
    JamCodecable()
], TicketsExtrinsicElementImpl);
/**
 * $(0.7.1 - 6.29)
 * $(0.7.1 - C.17) | codec
 */
let TicketsExtrinsicImpl = TicketsExtrinsicImpl_1 = class TicketsExtrinsicImpl extends BaseJamCodecable {
    constructor(elements = []) {
        super();
        this.elements = toTagged(elements);
    }
    newTickets(deps) {
        if (this.elements.length === 0) {
            return ok([]); // optimization
        }
        // $(0.7.1 - 6.30) | first case
        // NOTE: the length 0 is handled above
        if (deps.p_tau.slotPhase() >= LOTTERY_MAX_SLOT) {
            return err(ETError.LOTTERY_ENDED);
        }
        // $(0.7.1 - 6.30) | first case
        if (this.elements.length > MAX_TICKETS_PER_BLOCK) {
            return err(ETError.MAX_TICKETS_EXCEEDED);
        }
        for (const extrinsic of this.elements) {
            const [e] = extrinsic
                .checkValidity({
                p_entropy: deps.p_entropy,
                p_gamma_z: deps.p_gamma_z,
            })
                .safeRet();
            if (typeof e !== "undefined") {
                return err(e);
            }
        }
        // $(0.7.1 - 6.31)
        const n = [];
        for (const x of this.elements) {
            n.push(new TicketImpl({
                id: Bandersnatch.vrfOutputRingProof(x.proof), // y
                attempt: x.attempt, // r
            }));
        }
        // $(0.7.1 - 6.32) | tickets should be in order and unique
        for (let i = 1; i < n.length; i++) {
            if (compareUint8Arrays(n[i - 1].id, n[i].id) >= 0) {
                return err(ETError.UNSORTED_VRF_PROOFS);
            }
        }
        // $(0.7.1 - 6.33) | make sure ticket were not submitted already
        const gamma_a_ids = new IdentitySet(deps.gamma_a.elements.map((x) => x.id));
        for (const x of n) {
            if (gamma_a_ids.has(x.id)) {
                return err(ETError.TICKET_IN_GAMMA_A);
            }
        }
        return ok(n);
    }
    static newEmpty() {
        return new TicketsExtrinsicImpl_1([]);
    }
};
__decorate$1([
    lengthDiscriminatedCodec(TicketsExtrinsicElementImpl, SINGLE_ELEMENT_CLASS),
    __metadata$1("design:type", Object)
], TicketsExtrinsicImpl.prototype, "elements", void 0);
TicketsExtrinsicImpl = TicketsExtrinsicImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Array])
], TicketsExtrinsicImpl);

var JamBlockExtrinsicsImpl_1;
let JamBlockExtrinsicsImpl = JamBlockExtrinsicsImpl_1 = class JamBlockExtrinsicsImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        if (typeof config !== "undefined") {
            Object.assign(this, config);
        }
    }
    /**
     * computes the Extrinsic hash as defined in
     * $(0.7.1 - 5.4 / 5.5 / 5.6)
     */
    extrinsicHash() {
        const items = [
            ...Hashing.blake2b(this.tickets.toBinary()),
            ...Hashing.blake2b(this.preimages.toBinary()),
            ...Hashing.blake2b(encodeWithCodec(codec_Eg_4Hx, this.reportGuarantees.elements)),
            ...Hashing.blake2b(this.assurances.toBinary()),
            ...Hashing.blake2b(this.disputes.toBinary()),
        ];
        const preimage = new Uint8Array(items);
        return Hashing.blake2b(preimage);
    }
    static newEmpty() {
        return new JamBlockExtrinsicsImpl_1({
            tickets: TicketsExtrinsicImpl.newEmpty(),
            preimages: PreimagesExtrinsicImpl.newEmpty(),
            reportGuarantees: GuaranteesExtrinsicImpl.newEmpty(),
            assurances: AssurancesExtrinsicImpl.newEmpty(),
            disputes: DisputeExtrinsicImpl.newEmpty(),
        });
    }
};
__decorate$1([
    codec$1(TicketsExtrinsicImpl),
    __metadata$1("design:type", TicketsExtrinsicImpl)
], JamBlockExtrinsicsImpl.prototype, "tickets", void 0);
__decorate$1([
    codec$1(PreimagesExtrinsicImpl),
    __metadata$1("design:type", PreimagesExtrinsicImpl)
], JamBlockExtrinsicsImpl.prototype, "preimages", void 0);
__decorate$1([
    codec$1(GuaranteesExtrinsicImpl, "guarantees"),
    __metadata$1("design:type", GuaranteesExtrinsicImpl)
], JamBlockExtrinsicsImpl.prototype, "reportGuarantees", void 0);
__decorate$1([
    codec$1(AssurancesExtrinsicImpl),
    __metadata$1("design:type", AssurancesExtrinsicImpl)
], JamBlockExtrinsicsImpl.prototype, "assurances", void 0);
__decorate$1([
    codec$1(DisputeExtrinsicImpl),
    __metadata$1("design:type", DisputeExtrinsicImpl)
], JamBlockExtrinsicsImpl.prototype, "disputes", void 0);
JamBlockExtrinsicsImpl = JamBlockExtrinsicsImpl_1 = __decorate$1([
    JamCodecable() // $(0.7.1 - C.16)
    ,
    __metadata$1("design:paramtypes", [Object])
], JamBlockExtrinsicsImpl);
/*
 * $(0.7.1 - 5.6)
 */
const codec_Eg_4Hx = createArrayLengthDiscriminator(createCodec([
    [
        "report",
        {
            encode(w, buf) {
                return HashCodec.encode(w.hash(), buf);
            },
            decode() {
                throw new Error("codec_Eg_4Hx should not be used for decoding");
            },
            encodedSize() {
                return 32;
            },
        },
    ],
    ["slot", asCodec(SlotImpl)],
    [
        "signatures",
        createArrayLengthDiscriminator(createCodec([
            ["validatorIndex", E_sub_int(2)],
            ["signature", xBytesCodec(64)],
        ])),
    ],
]));

var JamBlockImpl_1;
/**
 * codec: $(0.7.1 - C.16)
 */
let JamBlockImpl = JamBlockImpl_1 = class JamBlockImpl extends BaseJamCodecable {
    constructor(config) {
        super();
        if (config) {
            Object.assign(this, config);
        }
    }
    /**
     * Creates a new block given the computed extrinsics
     */
    static create(curState, p_tau, extrinsics, keyPair) {
        const [hErr, header] = curState
            .block.header.buildNext(curState, extrinsics, p_tau, keyPair)
            .safeRet();
        if (hErr) {
            return err(hErr);
        }
        return ok(new JamBlockImpl_1({
            extrinsics,
            header,
        }));
    }
};
__decorate$1([
    codec$1(JamSignedHeaderImpl),
    __metadata$1("design:type", JamSignedHeaderImpl)
], JamBlockImpl.prototype, "header", void 0);
__decorate$1([
    codec$1(JamBlockExtrinsicsImpl, "extrinsic"),
    __metadata$1("design:type", JamBlockExtrinsicsImpl)
], JamBlockImpl.prototype, "extrinsics", void 0);
JamBlockImpl = JamBlockImpl_1 = __decorate$1([
    JamCodecable(),
    __metadata$1("design:paramtypes", [Object])
], JamBlockImpl);

var KappaImpl_1;
let KappaImpl = KappaImpl_1 = class KappaImpl extends ValidatorsImpl {
    /**
     * $(0.7.1 - 6.13)
     */
    toPosterior(curState, deps) {
        if (deps.p_tau.isNewerEra(curState.slot)) {
            const cloned = cloneCodecable(curState.safroleState.gamma_p);
            const newK = new KappaImpl_1({ elements: cloned.elements });
            return toPosterior(toTagged(newK));
        }
        return toPosterior(toTagged(cloneCodecable(this)));
    }
    /**
     * Finds the index of the given public Bandersnatch key inside the elements
     * used when producing blocks
     */
    bandersnatchIndex(key) {
        const index = this.elements.findIndex((v) => compareUint8Arrays(v.banderSnatch, key) === 0);
        return index;
    }
    static newEmpty() {
        return new KappaImpl_1({
            elements: (Array.from({ length: NUMBER_OF_VALIDATORS }, () => ValidatorDataImpl.newEmpty())),
        });
    }
};
KappaImpl = KappaImpl_1 = __decorate$1([
    JamCodecable()
], KappaImpl);

var LambdaImpl_1;
let LambdaImpl = LambdaImpl_1 = class LambdaImpl extends ValidatorsImpl {
    /**
     * $(0.7.1 - 6.13)
     */
    toPosterior(curState, deps) {
        if (deps.p_tau.isNewerEra(curState.slot)) {
            return toPosterior(toTagged(new LambdaImpl_1({
                elements: toTagged(curState.kappa.elements.slice()),
            })));
        }
        return toPosterior(toTagged(cloneCodecable(this)));
    }
    static newEmpty() {
        return new LambdaImpl_1({
            elements: (Array.from({ length: NUMBER_OF_VALIDATORS }, () => ValidatorDataImpl.newEmpty())),
        });
    }
};
LambdaImpl = LambdaImpl_1 = __decorate$1([
    JamCodecable()
], LambdaImpl);

var _WorkPackageImpl_instances, _WorkPackageImpl_metaAndCode;
/**
 * Identified by `P` set
 * $(0.7.1 - 14.2)
 * codec order defined in $(0.7.1 - C.28)
 */
let WorkPackageImpl = class WorkPackageImpl extends BaseJamCodecable {
    constructor() {
        super(...arguments);
        _WorkPackageImpl_instances.add(this);
    }
    hash() {
        return Hashing.blake2b(this.toBinary());
    }
    /**
     * `p_a`
     * $(0.7.1 - 14.10)
     */
    authorizer() {
        return Hashing.blake2b(new Uint8Array([
            ...encodeWithCodec(HashCodec, this.authCodeHash),
            ...this.authConfig,
        ]));
    }
    /**
     * `p_{bold_u}`
     */
    code(delta) {
        return __classPrivateFieldGet(this, _WorkPackageImpl_instances, "m", _WorkPackageImpl_metaAndCode).call(this, delta).code;
    }
    /**
     * `p_{bold_m}`
     */
    metadata(delta) {
        return __classPrivateFieldGet(this, _WorkPackageImpl_instances, "m", _WorkPackageImpl_metaAndCode).call(this, delta).metadata;
    }
    /**
     * $(0.7.1 - B.1)
     */
    isAuthorized(c, deps) {
        const code = this.code(deps.delta);
        if (code.length === 0) {
            return { res: WorkOutputImpl.bad(), gasUsed: 0n };
        }
        if (code.length > MAXIMUM_SIZE_IS_AUTHORIZED) {
            return { res: WorkOutputImpl.big(), gasUsed: 0n };
        }
        const res = argumentInvocation(code, 0, // instruction pointer
        TOTAL_GAS_IS_AUTHORIZED, encodeWithCodec(E_2_int, c), F_Fn(this, c), undefined);
        return {
            /**
             * `bold_t`
             */
            res: res.res,
            /**
             * `g`
             */
            gasUsed: res.gasUsed,
        };
    }
};
_WorkPackageImpl_instances = new WeakSet();
_WorkPackageImpl_metaAndCode = function _WorkPackageImpl_metaAndCode(delta) {
    const encodedData = delta
        .get(this.authCodeHost)
        .historicalLookup(toTagged(this.context.lookupAnchorSlot), this.authCodeHash);
    const { value: metadata, readBytes: skip } = LengthDiscrimantedIdentityCodec.decode(encodedData);
    const code = encodedData.slice(skip);
    return { metadata, code };
};
__decorate$1([
    eSubIntCodec(4, "auth_code_host"),
    __metadata$1("design:type", Number)
], WorkPackageImpl.prototype, "authCodeHost", void 0);
__decorate$1([
    codec$1(HashCodec, "auth_code_hash"),
    __metadata$1("design:type", Object)
], WorkPackageImpl.prototype, "authCodeHash", void 0);
__decorate$1([
    codec$1(WorkContextImpl),
    __metadata$1("design:type", WorkContextImpl)
], WorkPackageImpl.prototype, "context", void 0);
__decorate$1([
    codec$1(LengthDiscrimantedIdentityCodec, "authorization"),
    __metadata$1("design:type", Object)
], WorkPackageImpl.prototype, "authToken", void 0);
__decorate$1([
    codec$1(LengthDiscrimantedIdentityCodec, "authorizer_config"),
    __metadata$1("design:type", Object)
], WorkPackageImpl.prototype, "authConfig", void 0);
__decorate$1([
    jsonCodec(ArrayOfJSONCodec(WorkItemImpl), "items"),
    binaryCodec(createArrayLengthDiscriminator(WorkItemImpl)),
    __metadata$1("design:type", Object)
], WorkPackageImpl.prototype, "workItems", void 0);
WorkPackageImpl = __decorate$1([
    JamCodecable()
], WorkPackageImpl);
// $(0.7.1 - B.2)
const F_Fn = (bold_p, coreIndex) => (input) => {
    if (input.hostCallOpcode === 0 /** ΩG */) {
        return applyMods(input.ctx, input.out, hostFunctions.gas(input.ctx, undefined));
    }
    else if (input.hostCallOpcode === 1 /** fetc */) {
        return applyMods(input.ctx, input.out, hostFunctions.fetch(input.ctx, {
            p: bold_p,
        }));
    }
    else if (input.hostCallOpcode === 100 /** log */) {
        return applyMods(input.ctx, input.out, hostFunctions.log(input.ctx, {
            core: coreIndex,
        }));
    }
    return applyMods(input.ctx, input.out, [
        IxMod.gas(10n),
        IxMod.reg(7, HostCallResult.WHAT),
    ]);
};

const stateFromMerkleMap = (merkleMap) => {
    const authPool = AuthorizerPoolImpl.decode(merkleMap.get(stateKey(1))).value;
    const authQueue = AuthorizerQueueImpl.decode(merkleMap.get(stateKey(2))).value;
    const beta = BetaImpl.decode(merkleMap.get(stateKey(3))).value;
    const safroleState = SafroleStateImpl.decode(merkleMap.get(stateKey(4))).value;
    const disputes = DisputesStateImpl.decode(merkleMap.get(stateKey(5))).value;
    const entropy = JamEntropyImpl.decode(merkleMap.get(stateKey(6))).value;
    const iota = ValidatorsImpl.decode(merkleMap.get(stateKey(7))).value;
    const kappa = KappaImpl.decode(merkleMap.get(stateKey(8))).value;
    const lambda = LambdaImpl.decode(merkleMap.get(stateKey(9))).value;
    const rho = RHOImpl.decode(merkleMap.get(stateKey(10))).value;
    const slot = SlotImpl.decode(merkleMap.get(stateKey(11))).value;
    const privServices = PrivilegedServicesImpl.decode(merkleMap.get(stateKey(12))).value;
    const statistics = JamStatisticsImpl.decode(merkleMap.get(stateKey(13))).value;
    const accumulationQueue = AccumulationQueueImpl.decode(merkleMap.get(stateKey(14))).value;
    const accumulationHistory = AccumulationHistoryImpl.decode(merkleMap.get(stateKey(15))).value;
    const mostRecentAccumulationOutputs = LastAccOutsImpl.decode(merkleMap.get(stateKey(16))).value;
    const serviceKeys = [...merkleMap.keys()].filter((k) => {
        return (k[0] === 255 &&
            k[2] === 0 &&
            k[4] === 0 &&
            k[6] === 0 &&
            k[8] === 0 &&
            k[9] === 0 &&
            32 + 5 * 8 + 4 * 4 === merkleMap.get(k).length);
    });
    const serviceAccounts = new DeltaImpl();
    for (const serviceDataKey of serviceKeys) {
        const serviceKey = new Uint8Array([
            serviceDataKey[1],
            serviceDataKey[3],
            serviceDataKey[5],
            serviceDataKey[7],
        ]);
        const serviceData = serviceAccountDataCodec.decode(merkleMap.get(serviceDataKey)).value;
        const serviceIndex = E_sub_int(4).decode(serviceKey).value;
        // filter out service data keys that are related to this service
        const serviceRelatedKeys = new Set([...merkleMap.keys()].filter((k) => {
            return (k[0] === serviceKey[0] &&
                k[2] === serviceKey[1] &&
                k[4] === serviceKey[2] &&
                k[6] === serviceKey[3]);
        }));
        const storage = new MerkleServiceAccountStorageImpl(serviceIndex, serviceData.totalOctets, serviceData.itemInStorage);
        const serviceAccount = new ServiceAccountImpl({
            codeHash: serviceData.codeHash,
            balance: serviceData.balance,
            minAccGas: serviceData.minAccGas,
            minMemoGas: serviceData.minMemoGas,
            gratis: serviceData.gratis,
            created: serviceData.created,
            lastAcc: serviceData.lastAcc,
            parent: serviceData.parent,
            preimages: new IdentityMap(),
        }, storage);
        const preimage_p_keys = [...serviceRelatedKeys.values()].filter((sk) => {
            const possiblePreimage = merkleMap.get(sk);
            const h = Hashing.blake2b(possiblePreimage);
            const p_p_key = stateKey(serviceIndex, new Uint8Array([...encodeWithCodec(E_4_int, (2 ** 32 - 2)), ...h]));
            return Buffer.compare(p_p_key, sk) === 0;
        });
        for (const preimagekey of preimage_p_keys) {
            const preimage = merkleMap.get(preimagekey);
            const h = Hashing.blake2b(preimage);
            serviceAccount.preimages.set(h, preimage);
            // we delete to not set it in storage
            serviceRelatedKeys.delete(preimagekey);
        }
        for (const storageOrRequestKey of serviceRelatedKeys) {
            storage.setStorage(storageOrRequestKey, merkleMap.get(storageOrRequestKey));
        }
        serviceAccounts.set(serviceIndex, serviceAccount);
    }
    return new JamStateImpl({
        accumulationHistory,
        accumulationQueue,
        authPool,
        authQueue,
        beta,
        disputes,
        entropy,
        iota: toTagged(iota),
        kappa: toTagged(kappa),
        lambda: toTagged(lambda),
        mostRecentAccumulationOutputs,
        privServices,
        rho,
        safroleState,
        serviceAccounts,
        slot,
        statistics,
        headerLookupHistory: new HeaderLookupHistoryImpl(new SafeMap()),
    });
};

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol */


function __decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}

function __metadata(metadataKey, metadataValue) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

let GetState = class GetState extends BaseJamCodecable {
    constructor(config) {
        super();
        if (config) {
            Object.assign(this, config);
        }
    }
};
__decorate([
    codec$1(xBytesCodec(32), SINGLE_ELEMENT_CLASS),
    __metadata("design:type", Object)
], GetState.prototype, "headerHash", void 0);
GetState = __decorate([
    JamCodecable(),
    __metadata("design:paramtypes", [Object])
], GetState);

let Version = class Version extends BaseJamCodecable {
};
__decorate([
    eSubIntCodec(1),
    __metadata("design:type", Number)
], Version.prototype, "major", void 0);
__decorate([
    eSubIntCodec(1),
    __metadata("design:type", Number)
], Version.prototype, "minor", void 0);
__decorate([
    eSubIntCodec(1),
    __metadata("design:type", Number)
], Version.prototype, "patch", void 0);
Version = __decorate([
    JamCodecable()
], Version);

var version = "0.7.0";
var packageJSON = {
	version: version,
	"jam:protocolVersion": "0.7.0"
};

var PeerInfo_1;
const Utf8JSONCodec = {
    fromJSON(json) {
        return json;
    },
    toJSON(value) {
        return value;
    },
};
let PeerInfo = PeerInfo_1 = class PeerInfo extends BaseJamCodecable {
    static build() {
        const toRet = new PeerInfo_1();
        toRet.name = `tsjam-${packageJSON["version"]}-${getConstantsMode()}`;
        toRet.jamVersion = new Version();
        toRet.jamVersion.major = (parseInt(packageJSON["jam:protocolVersion"].split(".")[0]));
        toRet.jamVersion.minor = (parseInt(packageJSON["jam:protocolVersion"].split(".")[1]));
        toRet.jamVersion.patch = (parseInt(packageJSON["jam:protocolVersion"].split(".")[2]));
        toRet.appVersion = new Version();
        toRet.appVersion.major = parseInt(packageJSON["version"].split(".")[0]);
        toRet.appVersion.minor = parseInt(packageJSON["version"].split(".")[1]);
        toRet.appVersion.patch = parseInt(packageJSON["version"].split(".")[2]);
        return toRet;
    }
};
__decorate([
    jsonCodec(Utf8JSONCodec),
    binaryCodec(mapCodec(LengthDiscrimantedIdentityCodec, (b) => Buffer.from(b).toString("utf8"), (s) => Buffer.from(s, "utf8"))),
    __metadata("design:type", String)
], PeerInfo.prototype, "name", void 0);
__decorate([
    codec$1(Version, "app_version"),
    __metadata("design:type", Version)
], PeerInfo.prototype, "appVersion", void 0);
__decorate([
    codec$1(Version, "jam_version"),
    __metadata("design:type", Version)
], PeerInfo.prototype, "jamVersion", void 0);
PeerInfo = PeerInfo_1 = __decorate([
    JamCodecable()
], PeerInfo);

let State = class State extends BaseJamCodecable {
    constructor(config) {
        super();
        if (typeof config !== "undefined") {
            Object.assign(this, config);
        }
    }
};
__decorate([
    codec$1(IdentityMapCodec(xBytesCodec(31), LengthDiscrimantedIdentityCodec, {
        key: "key",
        value: "value",
    }), SINGLE_ELEMENT_CLASS),
    __metadata("design:type", IdentityMap)
], State.prototype, "value", void 0);
State = __decorate([
    JamCodecable(),
    __metadata("design:paramtypes", [Object])
], State);

/**
 * SetState ::= SEQUENCE {
 *   header Header,
 *   state  State
 * }
 *
 * State ::= SEQUENCE OF KeyValue
 */
let SetState = class SetState extends BaseJamCodecable {
    constructor(config) {
        super();
        if (config) {
            Object.assign(this, config);
        }
    }
};
__decorate([
    codec$1(JamSignedHeaderImpl),
    __metadata("design:type", JamSignedHeaderImpl)
], SetState.prototype, "header", void 0);
__decorate([
    codec$1(State),
    __metadata("design:type", State)
], SetState.prototype, "state", void 0);
SetState = __decorate([
    JamCodecable(),
    __metadata("design:paramtypes", [Object])
], SetState);

var MessageType;
(function (MessageType) {
    MessageType["PEER_INFO"] = "PEER_INFO";
    MessageType["IMPORT_BLOCK"] = "IMPORT_BLOCK";
    MessageType["SET_STATE"] = "SET_STATE";
    MessageType["GET_STATE"] = "GET_STATE";
    MessageType["STATE"] = "STATE";
    MessageType["STATE_ROOT"] = "STATE_ROOT";
})(MessageType || (MessageType = {}));
class Message {
    constructor(config) {
        Object.assign(this, config);
    }
    type() {
        if (this.peerInfo)
            return MessageType.PEER_INFO;
        if (this.importBlock)
            return MessageType.IMPORT_BLOCK;
        if (this.setState)
            return MessageType.SET_STATE;
        if (this.getState)
            return MessageType.GET_STATE;
        if (this.state)
            return MessageType.STATE;
        if (this.stateRoot)
            return MessageType.STATE_ROOT;
        throw new Error("Invalid message type");
    }
}
const oneOfMessageCodec = mapCodec(eitherOneOfCodec([
    ["peerInfo", asCodec(PeerInfo)],
    ["importBlock", asCodec(JamBlockImpl)],
    ["setState", asCodec(SetState)],
    ["getState", asCodec(GetState)],
    ["state", asCodec(State)],
    ["stateRoot", xBytesCodec(32)],
]), (pojo) => new Message(pojo), (message) => message);
const MessageCodec = {
    encode(value, bytes) {
        const length = oneOfMessageCodec.encode(value, bytes.subarray(4));
        E_4_int.encode(length, bytes);
        return 4 + length;
    },
    decode(bytes) {
        const { value: length } = E_4_int.decode(bytes);
        const { value: pojo } = oneOfMessageCodec.decode(bytes.subarray(4, 4 + length));
        return {
            value: pojo,
            readBytes: 4 + length,
        };
    },
    encodedSize(value) {
        const length = oneOfMessageCodec.encodedSize(value);
        return 4 + length;
    },
};

// Parse CLI args for socket path (fallback to env, then default)
const { values: cliArgs } = parseArgs({
    options: {
        socket: { type: "string", short: "s" },
    },
});
const SOCKET_PATH = cliArgs.socket ??
    process.env.SOCKET_PATH ??
    "/tmp/jam_target.sock";
if (fs$1.existsSync(SOCKET_PATH))
    fs$1.unlinkSync(SOCKET_PATH);
let state = null;
let historyMap;
const server = net.createServer((socket) => {
    const send = (message) => {
        const bin = encodeWithCodec(MessageCodec, message);
        console.log(`-> ${bin.length}`);
        socket.write(bin);
    };
    let buffer = Buffer.alloc(0);
    let toRead = -1;
    socket.on("data", (data) => {
        if (toRead === -1) {
            toRead = E_sub_int(4).decode(data).value + 4;
        }
        buffer = Buffer.concat([buffer, data]);
        if (buffer.length === toRead) {
            console.log("<-", buffer.length);
            onMessage(buffer);
            toRead = -1;
            buffer = Buffer.alloc(0); // Reset buffer after processing
        }
    });
    const onMessage = (data) => {
        const message = MessageCodec.decode(data).value;
        console.log(`received message ${message.type()}`);
        switch (message.type()) {
            case MessageType.PEER_INFO:
                const pi = PeerInfo.build();
                send(new Message({ peerInfo: pi }));
                break;
            case MessageType.SET_STATE:
                const stateMap = message.setState.state.value;
                state = stateFromMerkleMap(stateMap);
                state.block = new JamBlockImpl({
                    header: message.setState.header,
                    extrinsics: JamBlockExtrinsicsImpl.newEmpty(),
                });
                state.headerLookupHistory = state.headerLookupHistory.toPosterior({
                    header: message.setState.header,
                });
                historyMap = new IdentityMap();
                historyMap.set(message.setState.header.signedHash(), message.setState);
                send(new Message({ stateRoot: state.merkleRoot() }));
                break;
            case MessageType.IMPORT_BLOCK:
                const block = message.importBlock;
                assert$1(state, "State must be initialized before applying a block");
                const res = state.applyBlock(block);
                if (res.isErr()) {
                    console.log("Block application error:");
                    console.log(res.error);
                    send(new Message({ stateRoot: state.merkleRoot() }));
                    return;
                }
                state = res.value;
                historyMap.set(block.header.signedHash(), new SetState({
                    header: block.header,
                    state: new State({ value: merkleStateMap(res.value) }),
                }));
                send(new Message({ stateRoot: res.value.merkleRoot() }));
                break;
            case MessageType.GET_STATE:
                const oldState = historyMap.get(message.getState.headerHash);
                assert$1(oldState, "State not found for header hash: " +
                    xBytesCodec(32).toJSON(message.getState.headerHash));
                send(new Message({
                    state: oldState.state,
                }));
                break;
            default:
                console.error("Unhandled message type:", message.type());
        }
    };
    socket.on("error", (err) => console.error("Socket error:", err));
});
server.listen(SOCKET_PATH, () => {
    console.log("Listening on", SOCKET_PATH);
    console.log("constant mode", getConstantsMode());
    console.log(PeerInfo.build().toJSON());
});
server.on("error", (err) => console.error("Server error:", err));
//# sourceMappingURL=cli.mjs.map
