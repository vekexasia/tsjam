import {JAM_COMMON_ERA} from "@/consts";

export class Timekeeping {
    static getJamSlotSinceEpoch() {
        const now = Date.now() / 1000 | 0;
        return (now - JAM_COMMON_ERA) / 6 | 0
    }

    static getJamEpoch() {
        return this.getJamSlotSinceEpoch() / 36 | 0
    }

    static getJamSlotSinceEpochFromNow() {
        return this.getJamSlotSinceEpoch() % 36
    }
}