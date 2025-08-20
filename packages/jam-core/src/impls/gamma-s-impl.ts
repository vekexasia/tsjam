import { HashCodec } from "@/codecs/misc-codecs";
import { outsideInSequencer } from "@/utils";
import {
  BaseJamCodecable,
  E_1,
  E_4,
  encodeWithCodec,
  sequenceCodec,
  xBytesCodec,
} from "@tsjam/codec";
import {
  EPOCH_LENGTH,
  getConstantsMode,
  LOTTERY_MAX_SLOT,
} from "@tsjam/constants";
import { Bandersnatch, Hashing } from "@tsjam/crypto";
import type {
  BandersnatchKey,
  GammaS,
  GammaSFallback,
  JamEntropy,
  Posterior,
  SeqOfLength,
  Validated,
} from "@tsjam/types";
import { toPosterior, toTagged } from "@tsjam/utils";
import { ConditionalExcept } from "type-fest";
import type { JamStateImpl } from "./jam-state-impl";
import type { TauImpl } from "./slot-impl";
import { TicketImpl } from "./ticket-impl";
import { SafroleStateImpl } from "./safrole-state-impl";
import { compareUint8Arrays } from "uint8array-extras";
import { JamSignedHeaderImpl } from "./jam-signed-header-impl";

export class GammaSImpl extends BaseJamCodecable implements GammaS {
  @sequenceCodec(EPOCH_LENGTH, xBytesCodec(32))
  keys?: GammaSFallback;

  @sequenceCodec(EPOCH_LENGTH, TicketImpl)
  tickets?: SeqOfLength<TicketImpl, typeof EPOCH_LENGTH, "gamma_s">;

  constructor(config?: ConditionalExcept<GammaSImpl, Function>) {
    super();
    Object.assign(this, config);
  }

  isFallback(): this is GammaSImpl & { keys: GammaSFallback } {
    return this.keys !== undefined;
  }

  toJSON(): object {
    return GammaSImpl.toJSON(this);
  }

  toBinary(): Uint8Array {
    return encodeWithCodec(GammaSImpl, this);
  }

  /**
   * Checks if the provided public/private key is allowed to produce a block
   * used when producing blocks
   */
  isKeyAllowedToProduce(
    this: Posterior<GammaSImpl>,
    keyPair: { public: BandersnatchKey; private: BandersnatchKey },
    deps: {
      p_tau: Validated<Posterior<TauImpl>>;
      p_entropy_3: Posterior<JamEntropy["_3"]>;
    },
  ): boolean {
    if (this.isFallback()) {
      return (
        compareUint8Arrays(
          this.keys[deps.p_tau.slotPhase()],
          keyPair.public,
        ) === 0
      );
    } else {
      const real_i_y = this.tickets![deps.p_tau.slotPhase()].id;
      const i_y = Bandersnatch.vrfOutputSeed(
        keyPair.private,
        JamSignedHeaderImpl.sealSignContext(deps.p_entropy_3, this, deps.p_tau),
      );
      return compareUint8Arrays(real_i_y, i_y) === 0;
    }
  }

  /**
   * $(0.7.1 - 6.24)
   */
  toPosterior(deps: {
    slot: JamStateImpl["slot"];
    safroleState: SafroleStateImpl;
    p_tau: Validated<Posterior<TauImpl>>;
    p_kappa: Posterior<JamStateImpl["kappa"]>;
    p_eta2: Posterior<JamEntropy["_2"]>;
  }): Posterior<GammaSImpl> {
    if (
      deps.p_tau.isNextEra(deps.slot) && // e' = e + 1
      deps.safroleState.gamma_a.length() === EPOCH_LENGTH && // |ya| = E
      deps.slot.slotPhase() >= LOTTERY_MAX_SLOT // m >= Y
    ) {
      // we've accumulated enough tickets
      // we can now compute the new posterior `gamma_s`
      const newGammaS: SeqOfLength<TicketImpl, typeof EPOCH_LENGTH, "gamma_s"> =
        outsideInSequencer(
          deps.safroleState.gamma_a.elements as unknown as SeqOfLength<
            TicketImpl,
            typeof EPOCH_LENGTH
          >,
        );
      return toPosterior(new GammaSImpl({ tickets: newGammaS }));
    } else if (deps.p_tau.isSameEra(deps.slot)) {
      return toPosterior(<GammaSImpl>this);
    } else {
      // we're in fallback mode
      // F(eta'_2, kappa' )
      const newGammaS = [] as unknown as SeqOfLength<
        BandersnatchKey,
        typeof EPOCH_LENGTH,
        "gamma_s"
      >;
      const p_eta2 = encodeWithCodec(HashCodec, deps.p_eta2);
      // $(0.7.1 - 6.26) F calculated in place
      for (let i = 0; i < EPOCH_LENGTH; i++) {
        const e4Buf = new Uint8Array(4);
        E_4.encode(BigInt(i), e4Buf);
        const h_4 = Hashing.blake2b(
          new Uint8Array([...p_eta2, ...e4Buf]),
        ).subarray(0, 4);
        const index =
          E_4.decode(h_4).value % BigInt(deps.p_kappa.elements.length);
        newGammaS.push(deps.p_kappa.elements[Number(index)].banderSnatch);
      }
      return toPosterior(new GammaSImpl({ keys: newGammaS }));
    }
  }

  static encode<T extends typeof BaseJamCodecable>(
    this: T,
    x: InstanceType<T>,
    buf: Uint8Array,
  ): number {
    if (x instanceof GammaSImpl === false) {
      throw new Error(
        `GammaSImpl.encode expects GammaSImpl, got ${x.constructor.name}`,
      );
    }
    if (x.isFallback()) {
      E_1.encode(1n, buf);
      return 1 + GammaSImpl.codecOf("keys").encode(x.keys!, buf.subarray(1));
    } else {
      E_1.encode(0n, buf);
      return (
        1 + GammaSImpl.codecOf("tickets").encode(x.tickets!, buf.subarray(1))
      );
    }
  }

  static decode<T extends typeof BaseJamCodecable>(
    this: T,
    bytes: Uint8Array,
  ): { value: InstanceType<T>; readBytes: number } {
    const isFallback = E_1.decode(bytes.subarray(0, 1)).value === 1n;
    const codec = GammaSImpl.codecOf(isFallback ? "keys" : "tickets");
    const { value, readBytes } = codec.decode(bytes.subarray(1));
    const toRet = new GammaSImpl();

    if (isFallback) {
      toRet.keys = value as GammaSFallback;
    } else {
      toRet.tickets = value as SeqOfLength<
        TicketImpl,
        typeof EPOCH_LENGTH,
        "gamma_s"
      >;
    }
    return {
      value: toRet as unknown as InstanceType<T>,
      readBytes: readBytes + 1,
    };
  }

  static encodedSize<T extends typeof BaseJamCodecable>(
    this: T,
    value: InstanceType<T>,
  ): number {
    if (!(value instanceof GammaSImpl)) {
      throw new Error(
        `GammaSImpl.encodedSize expects GammaSImpl, got ${value.constructor.name}`,
      );
    }
    if (value.isFallback()) {
      return 1 + GammaSImpl.codecOf("keys").encodedSize(value.keys!);
    } else {
      return 1 + GammaSImpl.codecOf("tickets").encodedSize(value.tickets!);
    }
  }

  static fromJSON<T extends typeof BaseJamCodecable>(
    this: T,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    json: any,
  ): InstanceType<T> {
    const toRet = new GammaSImpl();
    if (typeof json.keys !== "undefined") {
      toRet.keys = GammaSImpl.codecOf("keys").fromJSON(json.keys);
    } else {
      toRet.tickets = GammaSImpl.codecOf("tickets").fromJSON(json.tickets);
    }
    return toRet as InstanceType<T>;
  }

  static toJSON<T extends typeof BaseJamCodecable>(
    this: T,
    value: InstanceType<T>,
  ): object {
    if (!(value instanceof GammaSImpl)) {
      throw new Error(
        `GammaSImpl.toJSON expects GammaSImpl, got ${value.constructor.name}`,
      );
    }

    if (value.isFallback()) {
      return { keys: GammaSImpl.codecOf("keys").toJSON(value.keys!) };
    } else {
      return { tickets: GammaSImpl.codecOf("tickets").toJSON(value.tickets!) };
    }
  }

  static newEmpty(): GammaSImpl {
    return new GammaSImpl({
      keys: toTagged(
        Array.from(
          { length: EPOCH_LENGTH },
          () => <BandersnatchKey>new Uint8Array(32).fill(0),
        ),
      ),
    });
  }
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;
  describe("GammaSImpl", () => {
    describe.skipIf(getConstantsMode() == "tiny")("codec", () => {
      it("should encode and decode fallback GammaS", () => {
        const origJSON = {
          keys: [
            "0xd066b5be71d9f34ce52bf4132ab594732a273a87dbc467304c9b34a319f7e10d",
            "0x50690c8d18bab14ad6146e78eca3795da575747ed5360b16c01eae26eb02a81d",
            "0x8597b56eb493044e1f4ad6e4bea4f2ab6ece249d89d6979fbfb1d2762bbf7030",
            "0x3297aa09ef993c35363e2e72650e594106bd898f66f314fe77f4a864bfc70dd0",
            "0x4b8f3f7f3d6a671cffaedd78583e549f924148b91d29a8cdda10b34c59ea77a8",
            "0x63ccb3af93b4848d85367c4925b66dadf84d3cee0235b8fe641885ffc016ccd2",
            "0x8a2a749da308f86d7e4e42f9750f51f1ae304aa5fa624ea22b0657d1493adbae",
            "0x9ccefbfa1c24e844c881de0bc1bbeb7fe87d618bd3a442466574ae5cfc056904",
            "0xa96f53814273fc9317aef0e34f156935e1a79643b54efeeb649ba4e81a8aa1e9",
            "0x54aef4e338f41e6f88ab54bd0e9a12143e2645cff201f98f4dec8bb7caac751d",
            "0xee646180e3685705b3ac813d775afd89165a9883732479f46d3b5a0143bfb482",
            "0x7b7e6c452863978de002b87a91e2e89440a6a66c69b182e1bdfe5f39005702a8",
            "0xa1eb1b6722b427f37705cdeafaccec3b60c87ffcf04cf5bc5014c1b96c553a5f",
            "0x365b81b08dec80dece3b8b140ad251b2420b7b75152e079bef23538c6af6cf6e",
            "0x543fda4941db4cf166463fb023c6c0fe7be5277491cfb013b72b1119097d7280",
            "0x615f2dffa20554e57c4be2e4f2739143d968724c49871104f6ee15d2da94b6c0",
            "0x1d1df4df1985490c145f8933de054d8365877e431bc1017a14118daa7123d3ac",
            "0x6e762be9f6994966ff4ed58f3139a80fe043b04a1e374f383cc13bcdd131ae50",
            "0xa813c9986be3644fe921ee01ca3c9e66c6e0975390f1a3df362e792b889c2c2c",
            "0xb47c243c3305a1053ecb8aa6540cd255df87b945610092e2845461573dd71c1d",
            "0x1fd4e085df7019252781e7ffc55d29bea23125a1202956db1cf3a074492bc220",
            "0x205a57b1439a79416345e31badb8718c42e913dd3280941f08348fb35efaa98c",
            "0x132b0d7f87167d3b169739da77ce6b65e0974bfd973bc809977c0d6aeb8a2c12",
            "0x9c91ebe630345064c5657d689b450605a59c55bfef2452d76880a723b008905c",
            "0xb635a7651c2a2555d840d032fe2e75ee1f03217858e036469058947c9bdb221e",
            "0xf84aeae5c3e9ba930d790938b4cb0dd3e2b38dbf010d9dbcb884135736fd5448",
            "0xbc3e2964e0dd3e9df698a0236da5f538fe987dc7688550e77a560502900da72a",
            "0x0cc6faff47a3bc7835d804ad6c192abaa86fedf9e02e90e8ce1c95a5f8df4968",
            "0x19a2b6a3d304ca6b44872458ecb81622baa2debfbbeafe293a9499111b6d463d",
            "0x5f924adbfd0d4b4291010c132b942bf9fb7a38963b7f16c7b1a73eb8fd0e1333",
            "0xcbf540b3b9dbafbe9adf309a46f337cde64010844291b6b4389ecb017a369eb9",
            "0xcb5346d77dc91192082bf9fa8b8c025e43b20b7dd54907bc9c417b728ac35837",
            "0x388434f461f6849eed73e73265883946521b2cc65fe4127744088b8634885c6c",
            "0xaceb146d364ea51e31137aed81dbc5fe3be5a5df2c0e7e0dd1723f531e1da016",
            "0x9e22da092883716521d00947a0b3b69266324d022e498c0238d6485198b9028a",
            "0x97c493165d809af7a396095d5c6f272103f8a5ea5b794119bcb469088ef19b1d",
            "0x5392aa6367714bc24a910dd7fe8527b40296458d5880720a89e9fa45ebbd7640",
            "0xc79e26f03516ce6f3fe1e8b5445978280de425537fcab589d1589801496a8b86",
            "0x0e60044685847a6c6f8a75076115e4f968bda629bf85cbf7b49c0d2ec954e7ea",
            "0x08b8d9ca922d2984ac3997682194fa4d5da91fce59896be5733573c078a6e66f",
            "0x909396cf7d840f1dc7363cdfc3517a0588598e32da9544def215b91e81e0268f",
            "0x313db646c1492318b7c1cbab1e1f50a53b14853881b2ceffc579cb699a9c7a30",
            "0x01ad5d01db15f60c299917de53210f4a7266980efdde625c4d8c7429af41ad64",
            "0x9af0f97788ad131fd843e32ddfa1915813f8e77f6d69f05fb6ef6205ccb86a70",
            "0x03ec6b754b254b4060c40b431468931e0f3a29ea06939cc6e2db74add014b549",
            "0xd066b5be71d9f34ce52bf4132ab594732a273a87dbc467304c9b34a319f7e10d",
            "0xa5327bebeb1d13adb426d175c8b999e5ca0066cb090e3c19be444f9eeb808664",
            "0x57ffca80ae189ca9d15c159414d25048325bdf17e3eeac9a95ddd7532e8371dc",
            "0xb9bc0e93fad692b571d57887e359b8449792e471a89fa745992f43c1a501ba01",
            "0xdd63f79f324d02b63a273033f7d697c1d8e3147900a7ac4bcfb02ccf868a7922",
            "0x5190755085a45a7b8cce68b59123b6bd81292d5ed661a6b343ab51ba525737e5",
            "0x15fd89faf9bb7131b2961317199cba0102be6500cc2ea06bb44f92022392e53f",
            "0xfa2dc67049268e5a94ab93be04e52ef6f6e1e53a9b426e20c2203cdcb465fb62",
            "0x90fdc5563a3018c6655b493b5f43a64d25671184723749dddc1baa035de2bd9a",
            "0x2c77862034b607d2610a15b17657dd18cca718a52368ef613f8bc204da0d159b",
            "0x28cb5732463dc906e1b982471d88f29a1df1edd4ac1c1ff65bc7fdb2c60ee430",
            "0xa7f2a9dad5ff730afcc4bc764702b1295e1d6643d1915dedea98cb055004e8b8",
            "0xdfce2b711cf03589a6ee59080e2c05d1e8071b4559ea74a6d645c0f48e595aa5",
            "0x0b513e0902f2360c9264943154699752c3b669e5f8f75e4d4afa2299bc98793d",
            "0xdf219ec08e92eddb85ccd9a117469f7d217328d27df12665f4896cb8160fc68c",
            "0xdaeefc8616bd8a0ac58dfd231659be29216ef08d56089f1fb22f3a03a0fa38e1",
            "0xb4985344aef14210533761e2354275c8c8084311623fad8386fa8d2634435800",
            "0x3f8925431b9f35fe7b9452b4777b51c478ccee4918787fc82f6c068924e0612a",
            "0xb54adc55e46d4ab7912ce2bcb0efe99d79b3029a6d649d58b966b6aa4c6912ba",
            "0xb464e0e71530366031f05aa85e7a7e40a5180dc63da33cf6a4ad40e54f7993cf",
            "0x365b81b08dec80dece3b8b140ad251b2420b7b75152e079bef23538c6af6cf6e",
            "0xceea863b1796ad76b6848064ee79b7a43e6e642ae6ebb55c575e43614898d605",
            "0x25508ca98c0f5566f5b67e0f590a029ffc66cb3c7932661a733fc2a6af081da9",
            "0xb7d86830ac3e513cd010cd72a77ade591a1e841153c71ef63a2375c23e083e1f",
            "0xad2fece47793b19878d3ef1eca3ed99548a14c41d8251804b14731d524287627",
            "0x5b31e76407522a7761c0dec65ff55a90f264d1dc6e4eab2340985c041d001212",
            "0x1ddd13d2e1a8a063f18ca766c4a10b9a4fea334d932f83f0d589fdd263493da3",
            "0x1cfc455cf476dd87bfb4b14ff3fe1cd7853522c4ab511cfcf7bf93694f282a24",
            "0x0746846d17469fb2f95ef365efcab9f4e22fa1feb53111c995376be8019981cc",
            "0x4a71eb181b6e1c455f25759cd7fd37dbcbfd58ae4c8c303f0234c4a55462bb33",
            "0x9cbfe34feb3e8a6841ba5190bd3793a135dc4008ea08af5c7cc3f4568ef7aabc",
            "0x59c0e983f525158010fe1b726b3cd9297e645864f98bff49eb509c3903534312",
            "0x7a19279d0a5a3ecdf5d23fba5ddaf441b4e63f04a01bacc0dcc9ff3627a0bc2c",
            "0x95c10d9b14ca41c14c46b65ff90003035d91fbc54d119c2625e5f4b31a3baadd",
            "0xbd08c309ba2252965da64a67750d46a018ac856b3bc73aeb47cab5b815821e13",
            "0x34ea3ff4702ab434f8f829186ae1cf18e54c65098345f27c773777a80653e625",
            "0x283ed02e9b17ac48f0af8023601ae73148682973073e250e5e47d237c4ced89d",
            "0x964cd92224b10615f4093c19c0f480b2724f748d6c458bdf64a4537697f8f33b",
            "0xe823cdf4e2895c483cd555ed38aa4b92fd18c3de9c00b4eb151d4812268695b4",
            "0x42399b1d1c5e6efce930ece2b1ee1678c92de8c31c9ba472d148f1af9169a4b4",
            "0xa790b71731d0a55ede3541ddc151af49cf38b285fe9dc9a7a47a25a508c0eb71",
            "0xf3826fe51908721c1f6ee43a7d67b10b23f1a89cee10d9d288ecd78d0963095b",
            "0x622e841ef2050a486f59088f2b98a548feeb77308fbf816da8465fa9e8cfc6c3",
            "0x8f8b1bff0d5691afdcaaa18449f5105f954159ec17ee7ce070ed20d03d509599",
            "0xbbcb4e9ea094587b2f347b37a448347d54ca7603df12d7ff6852d03e2960ee43",
            "0x95c10d9b14ca41c14c46b65ff90003035d91fbc54d119c2625e5f4b31a3baadd",
            "0xf972d6df17bdb5b3beb1a3f52650fd8d194207f7c0401821472c790fbca0b3ed",
            "0xa8ba4f081f83a5aa50dc41e82de2530c97b4933e65fffea5b470cadadf03140d",
            "0x622e841ef2050a486f59088f2b98a548feeb77308fbf816da8465fa9e8cfc6c3",
            "0x867a3e61b5f45a75b40d69376a5a3ce129ead9a1bf4b6a0aa03c82195cd65216",
            "0x1e94ff4e4f3102288f3d14403c251606a9f443cb47501b83b774413dbd542f19",
            "0x1ae97e366d409dd7ae2101b2f8c808ca61eaa8910db28cee6d99b09ec6106c1f",
            "0x7795260050de0a2a153c8fd36f396bcb6e8912b6a25c1d01b681f2f981c33ca4",
            "0x34484c752008fe604e3a4d95ae35c8d0e8f5b8d915618d9f0f092c4dd9f81972",
            "0x0971b6c8c1bfc8a1eb0d737b84eec9556d96bdd35689446336e1b374c5ada949",
            "0x3ea9b289da5ee9e74c697a52cc8cd73a340a3657427db12bdc69465dcd50aed1",
            "0x9b857dff07baab54ad76b1286814b68882b7441caa8ce887819559c29e25b3e6",
            "0xee646180e3685705b3ac813d775afd89165a9883732479f46d3b5a0143bfb482",
            "0x1521d2773f60bf4b91b8e2925f1fd248075ededd0e00e2b46ed86f1401c127d9",
            "0x802e19438b590f498a03f62a368dc04d8e2ef8ff4b31494e56d748c13c33aea3",
            "0xae3413ebf2c80c7f24a1022941bee55f1e0caa36ddcb57fd4f60696ed419c3ea",
            "0x70dfc9c64c545f99822753a1e2e91e2107561eb91bfe18a7b3e03f85c9d53624",
            "0x665d635896a059343fc89ad7750f72548e2727c270592d789d7b2b7e6fd998be",
            "0x54aef4e338f41e6f88ab54bd0e9a12143e2645cff201f98f4dec8bb7caac751d",
            "0x633635a534699465d74e8aa22d2530f07bd4497b9290a25bbfad5c30b8c9e432",
            "0x6870f7374b4fae6f6fde38258f578aad0060220cff6df62f25f4e185335d6719",
            "0x3c1caaac37083b522263826bd2a9a76e40f63bdd3dc44aeecd83f2651b7001c9",
            "0x4114bf7e04b014e1440c1a7aaa672c4a6995bb49e0a94680e7dc90839942668d",
            "0x8c85747b61e7ddfda5d942aece6d20d3be07e03026cf07d5c0bdfc5eb23de3ed",
            "0x448c0e44cdd56bdf7cb1fe491d1dbef9b9c2c40a7cd9d03ccf3bf2ff266d623b",
            "0x356f1eb03d113d60fdb58831856b79f9232f39b0f1e8789924cff4520a25c241",
            "0x196cfb7085eeeb16e3d1c325043aac6af96314a62f3ce336a305a02446656e57",
            "0x704b1799c194ceae5fd13da02e6b19aa01d58660599de6f5702a5a408a60781b",
            "0x836b0dbb21ed92f082e36556e741a053520cfc84f25e5bf37d5ab958399d4830",
            "0x544f0aa4565f3102700c8a2a77fe4cbfbde1512c9ccf60865cc6649267f0fae9",
            "0x63ccb3af93b4848d85367c4925b66dadf84d3cee0235b8fe641885ffc016ccd2",
            "0x463c8ae4d8511c3dbacabf794c7dbb175e89bf25d31565bb1cc4339b8ef4c04d",
            "0xf99e6a5e6e9fab64a4da064117f78900ce61665a14a03afb2aed380d8e2c7bac",
            "0xf7066f7aeff2cf6aa080036fe2b8139fd3dcce52f1e8c19bdff02f8e1528fb36",
            "0xd38ad4a11c59a93cb049a275de62852c844882b314c4624fbdbfa0a669463947",
            "0x6d1b99f62c772b7c550b444e642c22f04ff5e4d78d2974b6ddc8744c7ab72f4a",
            "0x39e6737211e2725779160486d6fa265249bdf897de1aabc99c3725a167f4135e",
            "0x212d7b8b10c68cfac5eeb8a24fc47407397dc7c40efe5e0c5f81016ff9b57a3a",
            "0xfa3fad2932e7955d4776e8237889bc6dfbf8518f578c0252aeb488a89cafd4d9",
            "0x3e8c9ee3168af67811ac247d1cc9897aec002ca73b3844fc261948f4e1b4f3ad",
            "0x5d50c4157269323de4cc4c30e5cad6df1eaa43e9684c9e3a443855a2b20af401",
            "0xb56f8ea790921807bf3139dafe1a9a0c1a2235654207ad073e59d08f5ac3c0e1",
            "0xa16276bf2e6f70c25cf5ade7e3384dccd95144d6e3f3b45e1d38e0d98b968215",
            "0x5e0b9859cf2a3f7eb8c82d91cecf8184e8423b8f7b014a0db2defb87ff8a6f13",
            "0x48b3722b7c009d153bbf8935b5cd1763538ef50e74c452c0c2df5d4f0fad4ad9",
            "0x4cc1f5031c51edecf4c0c00a9a2c5c74047b7b8e622745d7eaae72c0ae5b9431",
            "0x1e94ff4e4f3102288f3d14403c251606a9f443cb47501b83b774413dbd542f19",
            "0x3473d6aa16d740501a56d6f1cf34c7b437d810eb108fb22276d2c961fac289e8",
            "0x24e6cca847b74bbcf5b3dbdd3a39e0b62748b2797446c0b8fee0eb100528c58c",
            "0x68f8d4b010385f85fce0ae8a4c011cca7b0b2b1c3d320ba64a3bd3b34e525d36",
            "0xba6c98a8f5949d1f9ab8c62ceb28619fab6bc137c0f26a4719b2fb9d261655e8",
            "0xfb99528da3ff02e7ce64299729102ec58020deeee6d6b41083c6c4afe88aede2",
            "0x3473d6aa16d740501a56d6f1cf34c7b437d810eb108fb22276d2c961fac289e8",
            "0xe3f50d5cb272b302e8244e13dc5fa83e4f80175ce96689eb25616d8ed89b5dd3",
            "0x24e6cca847b74bbcf5b3dbdd3a39e0b62748b2797446c0b8fee0eb100528c58c",
            "0x3ec22f47f50f22cb97174242f7bd1d2165331bb5620542d9ef9651d1d1fad70c",
            "0x1578e0795ff102a5a309804de5b017df2b7f5be40dc3e39278ea3ead5bb6f916",
            "0xf7066f7aeff2cf6aa080036fe2b8139fd3dcce52f1e8c19bdff02f8e1528fb36",
            "0x81f0f0b9223a2e10d0d8fca7f85c1ad9f00849694f0166d6a747d8a5b5ab5d69",
            "0x9cb2edf7dd1a24ddb28908d285026338a801aa50af3003562972b864973794ca",
            "0x741694d6d25ef859a494deae63819b8650e3cbadc420d4a568a71ec7e6d4ed1e",
            "0x615f2dffa20554e57c4be2e4f2739143d968724c49871104f6ee15d2da94b6c0",
            "0xb56f8ea790921807bf3139dafe1a9a0c1a2235654207ad073e59d08f5ac3c0e1",
            "0xb5c16ece9859ce0cca8077e5096fd60f08f04888491decf7fbfd403f6fa0cfdd",
            "0x2df046851deb4b35d2c109a09dd80453a76c705754a20a1823a8f6e259370019",
            "0xea2a70489e4e1c4fa3a189aba9a8d95d1ac48dcef3f9a5d9e8c901cef494831a",
            "0xa41f20371c57e2a07236bcd1c1bd5352ead2935283c5df8541bce415984a72a0",
            "0xc3946a2125da182af5dd9d9b45f322e4d6317ffd89270506e2927f75ba497fe5",
            "0x2df046851deb4b35d2c109a09dd80453a76c705754a20a1823a8f6e259370019",
            "0x432b0034ba4d9b432eae5795cb95162276178cbdbc801e013c584c61db07be0c",
            "0x021d06d648c24fcbfa64a16eac540de632c9a4d06bb7eb4967e0ba27de3745c3",
            "0x766c121ddbc2298583f1be711bdfa0b903befdbb2b693d20c59429bc1593a28d",
            "0x480fedc7f09a623727d297f8f1b59f20cc243eca7da308ece2ba28904b578ad7",
            "0x263e4ee44ae1eb36be6a122af1d039c4ba9c54b651d6ef47c33cbb2d356ef73a",
            "0x8944eca36b6dbc13e7fd38624185482d22c07748aabd4f5be809aba1bd3fe32b",
            "0x02194d84c3dab5714b07079cd49462adbd41e87ab3459d3c72a76cc3c04d3d03",
            "0xa74407581f4549de506428a9c0a51848179bdedd9d63be0bba7eddce53e2d919",
            "0x578ac4e44192302fe64710392e4dd01575c6367cf5a354736cae2cbb8204304b",
            "0x02194d84c3dab5714b07079cd49462adbd41e87ab3459d3c72a76cc3c04d3d03",
            "0x881835882e591ccb71cfd0636071903aba224f15a371eeec0c5d8dc4a6ea9fc0",
            "0xa74407581f4549de506428a9c0a51848179bdedd9d63be0bba7eddce53e2d919",
            "0xcbff2f71f33456b7e7636bebadf50438af17f206fdbf115534387ee12ec6c473",
            "0xc63d3dc70c249703bf34e840dbba2dce45b3354c24c17aa659d1dee53b2b1323",
            "0xb3183a9ed525f5e47377f085c9cf1a5b600ea4f0a0646be6724ad83bd26c6987",
            "0x9cb2edf7dd1a24ddb28908d285026338a801aa50af3003562972b864973794ca",
            "0x3c179a22415746a383c1c3dd1ecd16aec35f81ed6c2b590aa16c94e007d6d6dd",
            "0x48158be5a6b15e46a80b9e24c90201a770a33de6139b13606ebc0195319e01a3",
            "0x0c41601c6933a72381acadfd88350ab26f9d7dbe6d628e287e8c7138b6632303",
            "0x178843a5771d97c965a59ec47aef1728d7b2709deb69cb56045f1e4e9b2f5b8d",
            "0x84bd06659ab80d153af612140ffa6a11f5181d702345730439c2d1adcf786d9c",
            "0x132b0d7f87167d3b169739da77ce6b65e0974bfd973bc809977c0d6aeb8a2c12",
            "0xb56f8ea790921807bf3139dafe1a9a0c1a2235654207ad073e59d08f5ac3c0e1",
            "0xfca184c384f63ecef7972d9c78c192283d816dd301df95c48d225b245588495a",
            "0x80859925a6aef4d3be76fb90b8e0a162e6895e642f5cae3415876aaf92ee7441",
            "0x5f1fa240dd726b6164c04e6e0b821f46533ee70d40615065696f6929016359e2",
            "0xc5ab249e5d587a0a83b2265c588bd6c8318f4da6a7e06f4f5cef5031a1a29699",
            "0x5b95bb8af0ddadbca914044ebec50d190016d96dbe8b9f0722efe6cec4b8ae6a",
            "0x1a5e52c7388e4fb65b7abe4ce372d39e3297008439d738c2a4532aa246090f21",
            "0xa52006e2696868fd15bd671468e67524fa7815983e08ed51a7733184c5d4574a",
            "0x5b9c487f6a877da3e6cd6b9a6283ce6ba0c178b97a488448f85c9d3982b8c103",
            "0x7c1c61953716c9dbc414d1c6c8fa234859cd3b4cfda638a1975b005c99bd76a1",
            "0xa813c9986be3644fe921ee01ca3c9e66c6e0975390f1a3df362e792b889c2c2c",
            "0xeb10b420259b826599dc755126cf44034b65e1a757a717a50e32e5d386477993",
            "0x2a1b620652805c97b1f74c39327af9e24af4c43d678aee03f92669cda264e106",
            "0xbbfd3f12fdc452a2eb48be25cb0b3e1ef9de3a83f417296d3b9e4ca7a3098d17",
            "0xd660fd22b7c1a4eb386bdffb67b0f29223b0d461e5dccc0aacd02fd3f28637a5",
            "0xb73a0248f117fe5ac8648a71853063a21acae938c7214817a2b8e71091af4287",
            "0xd17c2c32fc2f25794439632b6e3dab7fbbc425eb3ad91f0c31b973f6bb6a54ba",
            "0x8caa1a3177c4ebc74e3f059e5b89302f69636dedad0a87d1550c6f246fd77d60",
            "0x13bac0d9f05a6a069fa61b15c1e612c52c178e4e42e84e039ba632f1a873c559",
            "0x95630311f2d1b6a549c56ddd29873b393325a984e2efaa8ca7b24b3c2df2198a",
            "0xfc5e463eb52053fb0f157d95c5479455008d16b16f0fbe229e46fd8ebcce2ca2",
            "0x5e57239be7b11448dd7fcc21139798549101d1e4e179fc77178f40abb5814427",
            "0x02f6186111e4962de999c01334f0d08aacdecbdb651a5a41d51478d1ebbcf8b2",
            "0xffd3755cdf34b3b1c17066ae753486a1a3b00a38ed3963ff6e4d0b007a530720",
            "0xcb5346d77dc91192082bf9fa8b8c025e43b20b7dd54907bc9c417b728ac35837",
            "0x1521d2773f60bf4b91b8e2925f1fd248075ededd0e00e2b46ed86f1401c127d9",
            "0x408a808eef8dbfcd4e8b8823d0b2882ea1d459cdbae0ca1cd13ec22dfd2e09de",
            "0x1eb4d2b5b4d28f88bc1f79fc95d57d7d26a2f5da68211d6cc0b1d30f30ef5659",
            "0x08d3884d3f7c26a5f8289165d762df749de42c1c10ab2b213d51d30a6529daa9",
            "0x24f5d546194722587917357f8ed3fd98d9299f611ef694a305bfd917b5ba2f92",
            "0x7fa3da8d9c4f6a875536272e62e716cf7ba201b8b22dd1e195042ddd97b9beed",
            "0xc2f17d08d5658c3ede90a7ca771d1a2131c155e6ca2cb478587512cd18797753",
            "0x2f847f021f479041fae7f790fd429c189fc324deb0930e0b18d56d00de76afc0",
            "0xb54adc55e46d4ab7912ce2bcb0efe99d79b3029a6d649d58b966b6aa4c6912ba",
            "0xe65151d205ce9fc2802bb6a240dbb6069fe3ca4a6889a831923d59707173f09d",
            "0xa790b71731d0a55ede3541ddc151af49cf38b285fe9dc9a7a47a25a508c0eb71",
            "0x865dee1097799b9861df7b4adceefca82019a6ef10ec652dbc9567664f5daddc",
            "0x842c0d5153ad0bb6a9a9cdf60b69c3ccd432ed0f7cda62da8b447e9d41966aad",
            "0x2bc4ba20149bb95ef2453687a114b957a2465c4ae32253018dcbc101dc5e823e",
            "0x8154c870a9c356bde89967996dfc64c2f0d780d219440e62b9ccbf913b6e665b",
            "0x0870094e24038cdc99a8ed1b5f5e98468c297e4e12d5ac7769defb42ddb17709",
            "0x90b8cf846c81ed756e249988a0c6249d9e04be7ace86a7410a6eac0e8fc2bc3e",
            "0x02517dc99e42a7ae75ec051133f3aaf9b24b6d11e4e0c0f80aee50c5e3104b40",
            "0x41ffe008984d3857d3a642ac16846996b978c9ce9b83a83964380d6724c5f1a8",
            "0xf972d6df17bdb5b3beb1a3f52650fd8d194207f7c0401821472c790fbca0b3ed",
            "0x543fda4941db4cf166463fb023c6c0fe7be5277491cfb013b72b1119097d7280",
            "0x216d0666fc16a2810d59a942e13b61fba68576aec8621ff4060c7c446b5e539a",
            "0xde2dd31231493f51510d3219bce37fe9cd663a6cfe4bda157239bee415b62a86",
            "0x859184b241350999b6796650a79a0728f0cdf2f02c5e9accbb734a454a85939a",
            "0xa8ba4f081f83a5aa50dc41e82de2530c97b4933e65fffea5b470cadadf03140d",
            "0xf75b03cac349aacc3153d41bd7816cc7adc5837a6a26b087e656d5194caa82c6",
            "0x91923e8b16cd0c0bc123fb5d33e3c0cb2bbef572155291b7ee3a3f775dfd614b",
            "0xfb99528da3ff02e7ce64299729102ec58020deeee6d6b41083c6c4afe88aede2",
            "0x88cddd1763f80e3d623f78a334bb2418db9c5f26a34880ffdb3fa0b281dd0e26",
            "0x0886cc6158399da4e8973225ac0a869bbc30fbb42f0e6f0b9de94aeb1c900541",
            "0xf2b2948d6cbd896881d6fbb06d2cfa7288119c8d19ac3bf7787a2a80918491e7",
            "0xcbff2f71f33456b7e7636bebadf50438af17f206fdbf115534387ee12ec6c473",
            "0xcd4f3049261ac3e3a63aa5dd592e949e5be5a65bbef094c40438fdff73657395",
            "0x3473d6aa16d740501a56d6f1cf34c7b437d810eb108fb22276d2c961fac289e8",
            "0x4ba94a8f79fa88633f40955dbf2c94d09c5adb51b7a49803ec74df68eece8033",
            "0x46e50356126a02ff63987e1bd9b48dcb360d27a4c17e66b0a23c8bcb682a4c9e",
            "0x3a7cab1607af62344b3a04f5fee3925ff975d25edb7eefb4fa5bee6e312dc48e",
            "0xd012a5483f6a17053696e5dbb0eaf2ec317dc35939c7fc57e5b1278abcc04a38",
            "0x229d0b2a72cf91a36aaaed7813b8aa60a31f5b8b54241536c797282cc1217873",
            "0xae3413ebf2c80c7f24a1022941bee55f1e0caa36ddcb57fd4f60696ed419c3ea",
            "0xd379cfe8b6005cc2182f51b229f21600d9abd308533fb48b8d2ff07645a9aea3",
            "0x083d077595202e138ef0dd3cbf48e46a39d2f31adb628207e9fdc7f8cea574d4",
            "0x8d3d97b68072fd6d481d5a06571e133ef821afae06fa407b76b867660a80cab7",
            "0xeae5e93f728dbf1e7970417dfa87aad147c73b8676ef5ef0f91e769b8cf36be6",
            "0xf9b64b2dd5eb11acc1e04efb4d5f19538960f80e2fbf690424d43f6f512e2f87",
            "0xa37234dbe39634602148786fe8b686757e5308d34af23187d2ada24ddf671f6c",
            "0x2e55d537940ee69826f76b33caddc397e3a643a7e8b0b28ae19e237ddc68ebba",
            "0x5ed2997120b43eab504b31798d3f7ce0fe92d9fdd48d9aa58e77f0f5dc82261c",
            "0x8a2a749da308f86d7e4e42f9750f51f1ae304aa5fa624ea22b0657d1493adbae",
            "0x4cc1f5031c51edecf4c0c00a9a2c5c74047b7b8e622745d7eaae72c0ae5b9431",
            "0x08065a0ecb7c456ed806d994ca633baa0022d9f6b488a6b5fde93818857abc1a",
            "0x205a57b1439a79416345e31badb8718c42e913dd3280941f08348fb35efaa98c",
            "0x5b70d120b935f2909ed16a66138c34920c361a56c365423bf518d919200a8d98",
            "0x81163f59f70a3c698d76ab03b69a20e18b10a216c7ddbc66b17e9afac1ed6e00",
            "0x6cc944e49c2eed4af203baf65805c23cb1c478fe588a658498dc7f6999e9cb10",
            "0x1c6fd4706bddffc8bef8968c12a67ac2520d1a5e3c6ab4c8bd0ac4906f5234f0",
            "0x3f8925431b9f35fe7b9452b4777b51c478ccee4918787fc82f6c068924e0612a",
            "0x1d1df4df1985490c145f8933de054d8365877e431bc1017a14118daa7123d3ac",
            "0x365b81b08dec80dece3b8b140ad251b2420b7b75152e079bef23538c6af6cf6e",
            "0x91923e8b16cd0c0bc123fb5d33e3c0cb2bbef572155291b7ee3a3f775dfd614b",
            "0xb244aea0a6667333bcc0cdcd2af2c4de904d02c4c416b5c25b0c3278ab0c7d45",
            "0x699cb778bb4ee87743e5067ad189a2564091ee4202d2543541ddc441b4a9ec66",
            "0x32f7cef9cac4e7ed2060709e10896307519d46e73273cd861535ac11b092243e",
            "0x90b8cf846c81ed756e249988a0c6249d9e04be7ace86a7410a6eac0e8fc2bc3e",
            "0x74d6bc72f63c69b449021978dd6269b04bca244e952c1e711dcc73aad571d48b",
            "0xd7d859ff32e19ee2c536bcd40c481988be40e5326490b45fb93e01320ec3020d",
            "0x88ff885c9d6fbd2c48da9111dd46cc4a15c3b7909dd4c80c652abdee590e418e",
            "0xfc5e463eb52053fb0f157d95c5479455008d16b16f0fbe229e46fd8ebcce2ca2",
            "0x239b64cefd7d12f87445f342732ea330074149053ed8c08bee015be8c277e920",
            "0x1d1df4df1985490c145f8933de054d8365877e431bc1017a14118daa7123d3ac",
            "0xe80dad29d61fa5f15a5044e94945b667f72568e879fe31fc890ffb366dce4071",
            "0xd5701cf864e487df0c6ede6d732857f9d247597fe91b0f70dc39ee8674678028",
            "0x4f6fb292bd294ff288e24d64692824a69cc4f53ea8014027bc9ae9ec3b2f72cd",
            "0x3a56b76539937dba7d94ba4e898c39f7bdd81e7cb03649239fc68deacef0fb14",
            "0x1031521baa81e01a05a6c03eeb4d939417e154dee91d4dd94a8a26f88ffbde32",
            "0x99c2720e1e6e8442f8aa44562514d38b9ad3470e3b6198f71df5d2b27633d324",
            "0x647fafb205911c7acebd825c3945100e5ab0e4035821763297f7213bff6e2cb9",
            "0xa37234dbe39634602148786fe8b686757e5308d34af23187d2ada24ddf671f6c",
            "0x35723cdb2600ebd513be3819448dc1ad615f18b732227bdbf63a9b88860f142d",
            "0x34ea3ff4702ab434f8f829186ae1cf18e54c65098345f27c773777a80653e625",
            "0xabbf2b6655d8ad0007cb23a406999ee704d241731b9ce65eb431eca472ab2cec",
            "0x8786b0602fd2f6874a1bb56642b78c8c4763a700c755276142ccd168ba16f26f",
            "0x1b7ab77d60cd9256ecb76b60502aec0b3945dcb26efb808035bf0dd34dd25795",
            "0x08065a0ecb7c456ed806d994ca633baa0022d9f6b488a6b5fde93818857abc1a",
            "0x818a0bcc907543e931ab000bcb0680eb664d6d9cfd2b86799e352653abccc90b",
            "0x049146bdd21249bddb5dd79b5813501ac2e3fcd9969ffc13ea014c92a264824a",
            "0x91923e8b16cd0c0bc123fb5d33e3c0cb2bbef572155291b7ee3a3f775dfd614b",
            "0xae28719b39e1cec6a0cf05b010b5159b51b0db98dfbbb4e618094829139c953e",
            "0xb4985344aef14210533761e2354275c8c8084311623fad8386fa8d2634435800",
            "0x4a71eb181b6e1c455f25759cd7fd37dbcbfd58ae4c8c303f0234c4a55462bb33",
            "0xd8ad22efb5fcbab3db86bf6bb133317bfdc8cc773e7e61db46dba6f652a7925f",
            "0xc42ad4f5eec93f3ea5d2e28c8cee60d47a0e4572f3ef7bbd5c58e655071abcb1",
            "0xc38e67603244e1abda63c63741c393e9088c4cc420e0d55e6d7da21de3dfd381",
            "0x448c0e44cdd56bdf7cb1fe491d1dbef9b9c2c40a7cd9d03ccf3bf2ff266d623b",
            "0xc63d3dc70c249703bf34e840dbba2dce45b3354c24c17aa659d1dee53b2b1323",
            "0xd17c2c32fc2f25794439632b6e3dab7fbbc425eb3ad91f0c31b973f6bb6a54ba",
            "0xe641b8b344a81b865348f2b54385f2092d16035c8c1d3f759b71343f66c9b4b4",
            "0x5b70d120b935f2909ed16a66138c34920c361a56c365423bf518d919200a8d98",
            "0x2bc4ba20149bb95ef2453687a114b957a2465c4ae32253018dcbc101dc5e823e",
            "0x755e400a20f58a45853dba44991325007bc8c97845915209f0828d12bf6b5936",
            "0x56eb33a4fba36005d55582bedf48db985bb675bbaffb244b484c4ba935a89a31",
            "0x08d3884d3f7c26a5f8289165d762df749de42c1c10ab2b213d51d30a6529daa9",
            "0x09e339eb295c21517bc7b747255a19357e4abba0b3213ed49bb00ce6b0de9598",
            "0x818e13676f98990fc5799ad7555e621f69071f3ab21244e9d5123eacbcf9b067",
            "0x787fdd4301fb9a9a141cd27b91249f9dab945a45070738a275859c6721f93e00",
            "0x5f924adbfd0d4b4291010c132b942bf9fb7a38963b7f16c7b1a73eb8fd0e1333",
            "0x76a15f74fca41f331b5f7e203d8abb3c75c90fa6cd1d35a432dfd4eac3c11edf",
            "0x20c5e97dd9a1b4e8b915dbfd42a7b23de25fbc9536f41a33aa880849a23e72a9",
            "0xde9d98b3598726e6803f5685eb9dfacdc14f28e2dd5b33227277b4588ef3f614",
            "0x7fa3da8d9c4f6a875536272e62e716cf7ba201b8b22dd1e195042ddd97b9beed",
            "0xf6d53b6aadf9a9913c7c5f320d4c30dd648740bbea40398da617b0d37b5b030f",
            "0xdbd6ca7233c821067eeecd77c094edb8e4b7227032d8c75f52658e01cfbef3d6",
            "0x3c1caaac37083b522263826bd2a9a76e40f63bdd3dc44aeecd83f2651b7001c9",
            "0x6f70778041a85e0d861ea922a9744c93e6b7ec5af5bf7809cde4775d4cb1b9eb",
            "0x7950f2f4db197305399d3f242611ba44669fd31594e6627ffad8441475a0df19",
            "0xb1b3e3264619845cbf288e5218e62c96f03836415b5bf1ee4b7535997f2f8832",
            "0xdb28e38f1e1e7e14826f8aa9334539c6c237e01d6a579ecd2c9d2babcd5249cf",
            "0x239b64cefd7d12f87445f342732ea330074149053ed8c08bee015be8c277e920",
            "0xb57ffa6e95893fa33b206ae7bbf5606b1e063d0dca597cfb467e9f9048686806",
            "0xcebfb30258a5b360812bd0525f6c3b1c558bb0eb6df3af2858490d11871cf7e0",
            "0x96654127f822edab8658554efd9bb3496f12d3229cfab7974dba82b3e7e93658",
            "0x6cdc78a1fb0370700d0e4de92d81a17531d66f319dad56dccbf3c61816e07402",
            "0x53b4aa49e6908c4bcf9ae253bd179175d197a678548eba92dea980b8a61f4722",
            "0xc215765e1dba30cec969b8b2c57df4604bc998872f10a71010e47571c36febeb",
            "0x6678ca83a348f83a6981eba1fefa49f783b0ea26db15058c24a9e1f07a8094ca",
            "0x4469ec2cc8127541e126c3444b682a7ebad8fafda2590d2ec0c9c63ddedf77ba",
            "0x9dd8b372c10bb640578f278243fe1be529ba6e92fae78262e2434775cb51bbdc",
            "0x1521d2773f60bf4b91b8e2925f1fd248075ededd0e00e2b46ed86f1401c127d9",
            "0xb497570705915d6e9c5ca0630d83532a91c794bd331c17c0712067b57e75851a",
            "0xd012a5483f6a17053696e5dbb0eaf2ec317dc35939c7fc57e5b1278abcc04a38",
            "0xf84aeae5c3e9ba930d790938b4cb0dd3e2b38dbf010d9dbcb884135736fd5448",
            "0xea254886ec80e70c1704298f0a5d734ec3e2d53fe9dcd6655c52cc563604cddb",
            "0x2f07c97a994a53d471abe642f58e55187225fbcc19d032da722b152e694e0646",
            "0xfd49f7ed2634b221e6d86edbd5ce101c699cf4a99159fab130b1587ae4feb5d9",
            "0xbc3e2964e0dd3e9df698a0236da5f538fe987dc7688550e77a560502900da72a",
            "0x3c179a22415746a383c1c3dd1ecd16aec35f81ed6c2b590aa16c94e007d6d6dd",
            "0x519c258cda41f29a948a48ef86789b931f07a3e5ff8bdb23ce4190f0c8fcc4d3",
            "0x91e451ac7915cbd04d8f167191336e2b080819bb859aa880081da15f962ee9d1",
            "0x28dfe0b2f10ef69b5b1e9ab995190e632521b504654d1f42ee2ce9129f217fc8",
            "0xe2449c98b2181debd3616b6e66f5faf4d9563c2612768c34ae2accc2c52fa5d2",
            "0xce806e1a16d39366f7359bbee77bf9e2aef8bd02f2185953be98d6ea6c441e2d",
            "0xb2bcc98b1426f835a8ab46c9b82d70481ee39b08ee9e194cd5f9fb349e6b499f",
            "0x20c5e97dd9a1b4e8b915dbfd42a7b23de25fbc9536f41a33aa880849a23e72a9",
            "0xe898ea561932779043d5d28c51ca88d3a7312c3bd811562560a03ef8eadf3041",
            "0x865dee1097799b9861df7b4adceefca82019a6ef10ec652dbc9567664f5daddc",
            "0x5bf2965d5ca29e18209d4eee2bdc02230890bae26117970521ebe5c9abafa2b2",
            "0x4d51292a9044aa9cc140d062818e7c525525cf2376aa005bcd4d0ec2de2d0082",
            "0xa16276bf2e6f70c25cf5ade7e3384dccd95144d6e3f3b45e1d38e0d98b968215",
            "0xbf0d7c60d5f7648a316fc1a2ce752193844deaa1107a8c9e93aec9e901464a6b",
            "0xa16276bf2e6f70c25cf5ade7e3384dccd95144d6e3f3b45e1d38e0d98b968215",
            "0x6e0bc69c67434a6f6d55aefca0fc5c015897d783eac823aa5a1a48f458b20f49",
            "0xdfce2b711cf03589a6ee59080e2c05d1e8071b4559ea74a6d645c0f48e595aa5",
            "0xa7508f871f5884cb7f0bdc2d059d7534f0e38ec9e63b61d589a6e35fc718b019",
            "0x98d4970fd28b105a05fa0e78cb9a203ee77f6ad95553c35d505edca433a1b181",
            "0xec60955a445a1dc2f850480debd940977002b8cda1e059257768e751c8cfb197",
            "0xa5327bebeb1d13adb426d175c8b999e5ca0066cb090e3c19be444f9eeb808664",
            "0x620dab6e23db4d36a50fa5658dea4f3f7081aa6aa16c4af42ef47cff768deb89",
            "0x648b3e0549dedc013f01c0db162e00d9d9d4e308bcfe93ba2c7a00755625e486",
            "0xdd63f79f324d02b63a273033f7d697c1d8e3147900a7ac4bcfb02ccf868a7922",
            "0x323278db40f8401010880c6d6ef1b832aa3961770ac4e4313fd298dccadd8140",
            "0x07442358e96ff1378620b395d981782965778350bf0bcd94b5a142e589f03fe1",
            "0x41ffe008984d3857d3a642ac16846996b978c9ce9b83a83964380d6724c5f1a8",
            "0x4b8f016329f548c14311df616ec6066025c9a2c27ceee5dbe2a3a69b6b8c3833",
            "0x4b646b49d256184fcad15d1b271b9064341621a4a5abaaa798f85494a3959de3",
            "0xeeae897f594444433fb5f88e932c33d9dbf7861572cfed6d4eb88619331e21ec",
            "0x52786966720973eb3c730a7e2eddccb47cc28269c5b4f828d8e6b390667c576e",
            "0x5bf2965d5ca29e18209d4eee2bdc02230890bae26117970521ebe5c9abafa2b2",
            "0xc593a1f362d54751356c7c491d02abe506adb7e0c9244da6c65148f5ac2e4201",
            "0x82288864d0baf2b7d1efb11d457aeb2f181a625c1c2f961986afb388f4705238",
            "0x8441b15f20dad749386457e1e3a1b4c8db15b10b9b6057199cbd19cf01486005",
            "0x9c1f402be56f42482d2f2d2cb38a1cff1635db6fdd0552f14295f0306c5941c7",
            "0x13b6ead60d4ee125e5f2816a18ee51a4278f65cc86f324d26ec329ef93172f93",
            "0x6d55f4fa1ef558a52cbd0a8bd7ba68008a5f14a0028232fae60943507ae825f3",
            "0x6ebec7bc49e48d258360c2d2019934df208ff01ce880bbf8fc7b66c024989992",
            "0x31769eea097f80c22be12a3c2cec7886a6fc750144948a184808fcc3ef5c2dbc",
            "0x39dd18bc39b37b4d9bc3791fff45dc407dea00c6dec38bf4563ac65535b2d967",
            "0x738975ecaea2ae710c13413cc98c2178e0821e841e590a8b4c455d90488bd6b8",
            "0x353d539b63520ab964f527b30702f4cbab27a8d2d3f698780ae85c2a6a362367",
            "0x9525ceee70dd83fd1185ab2bbe7bac9cde9211cd9d14be3cd9e8ca17a9600eb4",
            "0xcda47ffb3a2680860e54fadf991c9ab983d457721eb7cd060ff86aca03562cb3",
            "0x5b9c487f6a877da3e6cd6b9a6283ce6ba0c178b97a488448f85c9d3982b8c103",
            "0xdfce2b711cf03589a6ee59080e2c05d1e8071b4559ea74a6d645c0f48e595aa5",
            "0x3c7b5818d0cc9d339aed130c958711d7e0641d971d758e7f393e9e107ebb6216",
            "0xba93e927232cb17c63d59bd3fbb4df71cad8c4a5827abb5f91ee4e323916fec9",
            "0x80de2efca9e98552b8a49efd295dd21f3a888f9ed27bac953bb9981f366bfe46",
            "0x235cc153d38a4e5fb7fe73e6cef680df7a34bcaabd122233f889d693e32f2fac",
            "0x3092463f4e08ab90d59c9197140bc392691feef3d158acee1e12911f207a3095",
            "0xcda47ffb3a2680860e54fadf991c9ab983d457721eb7cd060ff86aca03562cb3",
            "0x63922b189a306b43af07e38b2e0c7babcfb8496e1184f0b3647237c10175d842",
            "0x5ed2997120b43eab504b31798d3f7ce0fe92d9fdd48d9aa58e77f0f5dc82261c",
            "0xb55362510b6007229464a96f1ae89204807c782caa2242438f44b8b44b08ebb4",
            "0x3a1dc6566fadc81aade2ddd9678a40492ff3ae4357b560142d1c78ebd0f2e046",
            "0x323278db40f8401010880c6d6ef1b832aa3961770ac4e4313fd298dccadd8140",
            "0x5b31e76407522a7761c0dec65ff55a90f264d1dc6e4eab2340985c041d001212",
            "0xb635a7651c2a2555d840d032fe2e75ee1f03217858e036469058947c9bdb221e",
            "0x1eb4d2b5b4d28f88bc1f79fc95d57d7d26a2f5da68211d6cc0b1d30f30ef5659",
            "0x241e3ac41487054f15a089f59172db90523bf54165d4c6e7676824b1600a59f2",
            "0x391782a5d02d20a63f1db2a7c499f54fc76f0c795f88a558a5147736a4d833e0",
            "0xb3f4c9289043465a3644c0fce0b2b7309677227ced1b848a34dcc848deb20d68",
            "0xa1aa09a4923348a51437760e74b905b1d1d59803595499757e89737cc37ca054",
            "0x4d51292a9044aa9cc140d062818e7c525525cf2376aa005bcd4d0ec2de2d0082",
            "0x50eaee7127447c1a58e0bcffb8f5c05a33b11e046d1032565cd5f246cd4c46c9",
            "0xcbff2f71f33456b7e7636bebadf50438af17f206fdbf115534387ee12ec6c473",
            "0x4db3b2c659029e6f229603b67552649bb7e76a01db15824eb7f4d95baffd7b8a",
            "0xceea863b1796ad76b6848064ee79b7a43e6e642ae6ebb55c575e43614898d605",
            "0xae28719b39e1cec6a0cf05b010b5159b51b0db98dfbbb4e618094829139c953e",
            "0x2fb15d813c842c7dce9db8ecc42fe1f0ac84984e14cc0e12789c6eece79dd45f",
            "0x5f2ca82fe01b79d03af15e0cdf4c5b5a333332023590b7cfe1c6e03ce9ce46f0",
            "0x29907559ba172df1c4af3a83295b640426369ebea4a7c28dba1f72fc5908ddd9",
            "0x615f2dffa20554e57c4be2e4f2739143d968724c49871104f6ee15d2da94b6c0",
            "0xf9d3e860f88338f5f37cfe94b0f0b19ef437dace8a6c59ad4f5cc3bc385b8373",
            "0x365b81b08dec80dece3b8b140ad251b2420b7b75152e079bef23538c6af6cf6e",
            "0x241e3ac41487054f15a089f59172db90523bf54165d4c6e7676824b1600a59f2",
            "0x4d5649abd408b78db60b37fd815cdd65e19c6255909395377d477990500cde86",
            "0x365ad498b78ac97c68d61fde87a556a23deefc23452b4f44170d3b0aa88b9010",
            "0x8944eca36b6dbc13e7fd38624185482d22c07748aabd4f5be809aba1bd3fe32b",
            "0xa2eeda6dff7ff7056ee3880ebf93c93555510e61366ddf40774297bd481a14ed",
            "0x938dd66e45eb27aa49b0a5a76982a082cd5654b4aa6d20c930bceea67f361b52",
            "0x52786966720973eb3c730a7e2eddccb47cc28269c5b4f828d8e6b390667c576e",
            "0xba93e927232cb17c63d59bd3fbb4df71cad8c4a5827abb5f91ee4e323916fec9",
            "0xa8ba4f081f83a5aa50dc41e82de2530c97b4933e65fffea5b470cadadf03140d",
            "0xee0cd9457fe5db6ba814ebf77fae1bb1a221d0ca6b1cdf0e038645ccbfa33ac6",
            "0x463c8ae4d8511c3dbacabf794c7dbb175e89bf25d31565bb1cc4339b8ef4c04d",
            "0xfb99528da3ff02e7ce64299729102ec58020deeee6d6b41083c6c4afe88aede2",
            "0xa37234dbe39634602148786fe8b686757e5308d34af23187d2ada24ddf671f6c",
            "0xf6d53b6aadf9a9913c7c5f320d4c30dd648740bbea40398da617b0d37b5b030f",
            "0xc3c7451331e8d6035c4aa49043045f65544b506142d45683bd841b40f324c04c",
            "0xd5701cf864e487df0c6ede6d732857f9d247597fe91b0f70dc39ee8674678028",
            "0x9d21f6ecf6edb5ad9899ea1e16d1dbc0d48a403343d2d44974bf75b4719131cc",
            "0x4d728033ebe15ea1ebfdcf6b4a36317abcbd01608f2e4b5c29abd2cc13139e24",
            "0xc36a3010cf72db28a818b304791b4cec121c9deb5bf7947f4699bc59acf6120b",
            "0x10e371578d7533445b7c588f6072e90a1750d4be0fce7d58487ce1077f0794a8",
            "0x738975ecaea2ae710c13413cc98c2178e0821e841e590a8b4c455d90488bd6b8",
            "0xb47c243c3305a1053ecb8aa6540cd255df87b945610092e2845461573dd71c1d",
            "0xa7f1f9750c29c5d3b040884a984c5d7339b66375fa46e91977415b5758b52609",
            "0x34484c752008fe604e3a4d95ae35c8d0e8f5b8d915618d9f0f092c4dd9f81972",
            "0x775c46c4fe6893a85e29e9603978169789cdd482efe9f5d63ed8f5b58d0f09a8",
            "0x688adb1ba3d0e5090476e7ac769568f0f269e78c0166c4ae5fdce8f9db655356",
            "0x56eb33a4fba36005d55582bedf48db985bb675bbaffb244b484c4ba935a89a31",
            "0xa2eeda6dff7ff7056ee3880ebf93c93555510e61366ddf40774297bd481a14ed",
            "0xcb5346d77dc91192082bf9fa8b8c025e43b20b7dd54907bc9c417b728ac35837",
            "0x9a8b6aa0bf50b8e59269b1b330ff63f9590f4e9104737d743c313b2da1638219",
            "0x015fe936dde5113d524573aafa4fea6e2b4a1ea8889f49feb5348148552b62a7",
            "0xbbcb4e9ea094587b2f347b37a448347d54ca7603df12d7ff6852d03e2960ee43",
            "0xb9bc0e93fad692b571d57887e359b8449792e471a89fa745992f43c1a501ba01",
            "0x295a0cdaabb7670c7f901c4cbb94c370eb8625baaeeb5de83317312979263056",
            "0x4d51292a9044aa9cc140d062818e7c525525cf2376aa005bcd4d0ec2de2d0082",
            "0x8b9c64f83db95f5ede4f0b6f61e6b9615be91572e66828f524f1d932be8eae30",
            "0x5e6a147f9f20d5a1c875c4e5a06744ce86a41e5ffa11a5612ab725e7785f1eef",
            "0x978b040d94f584f4db481e3d11f401bb49739ff9c878c38385f1db4e5fed9a6a",
            "0x2e55d537940ee69826f76b33caddc397e3a643a7e8b0b28ae19e237ddc68ebba",
            "0xdee6d555b82024f1ccf8a1e37e60fa60fd40b1958c4bb3006af78647950e1b91",
            "0xae649dbddd8b5298d992c83a182a8f3a1b4b9936a8497247822c1e1a6c1fdf87",
            "0x9cb2edf7dd1a24ddb28908d285026338a801aa50af3003562972b864973794ca",
            "0x84bd06659ab80d153af612140ffa6a11f5181d702345730439c2d1adcf786d9c",
            "0x90b8cf846c81ed756e249988a0c6249d9e04be7ace86a7410a6eac0e8fc2bc3e",
            "0xddc5a3f90bfbd6374db056f5d044641bca6c3e6666bd81786ab54b0049de1e47",
            "0x9c9c34c709e43d416a19759b9374241431491e580e2551ffa651f6afc4da3fbc",
            "0x65e15adc40e7d70daa7949c9a4bb015e11133329c517b5fc0053f0b0c899c31c",
            "0x6e9d0085d553e8f782899e9e385c84ee1e1ed1d7aca2930ca5ab707cc58e0acc",
            "0x7ca6d63b4dd1c501a6158f209609c338372f006987d47d3d17c62352eed5129e",
            "0x7c1c61953716c9dbc414d1c6c8fa234859cd3b4cfda638a1975b005c99bd76a1",
            "0x3a56b76539937dba7d94ba4e898c39f7bdd81e7cb03649239fc68deacef0fb14",
            "0x8caa1a3177c4ebc74e3f059e5b89302f69636dedad0a87d1550c6f246fd77d60",
            "0xfca184c384f63ecef7972d9c78c192283d816dd301df95c48d225b245588495a",
            "0x19a2b6a3d304ca6b44872458ecb81622baa2debfbbeafe293a9499111b6d463d",
            "0x91923e8b16cd0c0bc123fb5d33e3c0cb2bbef572155291b7ee3a3f775dfd614b",
            "0x7f512c212878f1a405f2075f72f7e8b6d3455c5e9e1ab326cb63a4e0f9bf5600",
            "0xdfb3655106f405eb5f0cf9af186f5a071be1a86595e5ef72f7687e05f4d81e91",
            "0xbbfd3f12fdc452a2eb48be25cb0b3e1ef9de3a83f417296d3b9e4ca7a3098d17",
            "0xa8b80de4638d1c875680b873a1b57f1d4cf4de88d3ac8f3500db4e5517ad755b",
            "0x3733438ed61183fc4b02539f6819d03088500d99249daa48efba0233a4f8cc6e",
            "0xf75b03cac349aacc3153d41bd7816cc7adc5837a6a26b087e656d5194caa82c6",
            "0xe898ea561932779043d5d28c51ca88d3a7312c3bd811562560a03ef8eadf3041",
            "0x623fd17c40e41f3b327b0554863a9a65aa6927f29c14e0ddb3521d102b88f9bf",
            "0xf0cdcd7a51d9d97f6840bd86a47f29086c248025bcd9335bae454b57e50789a0",
            "0x946fcd4f1fcb6ce9d0ec73fe2b46a98fd30d28528d41e34a8bd11c8a1d3bce4e",
            "0x0c65930433f01afee6d9a37dccedc218c4d906af7daa03a911fe028df272a0e2",
            "0xe1f0d97faa575774e8884d8d138ebe79aec99377ef1295d13be477cb915af38c",
            "0x1a36dd813bfec65d5c8519b92046c14430337ec003a077438bf7feca3fcff20f",
            "0x28cb5732463dc906e1b982471d88f29a1df1edd4ac1c1ff65bc7fdb2c60ee430",
            "0xfb99528da3ff02e7ce64299729102ec58020deeee6d6b41083c6c4afe88aede2",
            "0x408a808eef8dbfcd4e8b8823d0b2882ea1d459cdbae0ca1cd13ec22dfd2e09de",
            "0xc38e67603244e1abda63c63741c393e9088c4cc420e0d55e6d7da21de3dfd381",
            "0x19ee30b3baced69b0897fd15b8259b3e0a3cb8e6bdacaa17826ac8bbdee5d19e",
            "0x48aed15c872da2d96f23df3b8eeb3368c60bde3b33fb3ab73ab6264359251195",
            "0x9446295f44eed0f22b1f8a3a7e5b0c7abf52b4cc3c1d7fbda45a824cf8327ad4",
            "0xe8b3308dc0b047ab67444a993462f3fb8218dbc45414befcb84d8fb4e3ba9ed7",
            "0xc6d232cc14743d5d1c3e9f8e78cfc2f185e559b58a2bc0bdf9f4c6858ee446b5",
            "0xea61356de209b7ea9ff00406b379373909ee9234b786f391ff3c73fb9a1c2682",
            "0x2a1b620652805c97b1f74c39327af9e24af4c43d678aee03f92669cda264e106",
            "0x74d6bc72f63c69b449021978dd6269b04bca244e952c1e711dcc73aad571d48b",
            "0x891120d0983d7d6236dfcc64282f466ef6a48bdb3df34fe9074f795f323b9828",
            "0x13bac0d9f05a6a069fa61b15c1e612c52c178e4e42e84e039ba632f1a873c559",
            "0xa790b71731d0a55ede3541ddc151af49cf38b285fe9dc9a7a47a25a508c0eb71",
            "0xb56f8ea790921807bf3139dafe1a9a0c1a2235654207ad073e59d08f5ac3c0e1",
            "0x3375755e404f4c533f67f3d31ed13fe2c1bd2fa7db9f81d287396090524762f3",
            "0x2f847f021f479041fae7f790fd429c189fc324deb0930e0b18d56d00de76afc0",
            "0x5a609dc8300e41e2f9886f1df22607b361ee0b48c47973b57c0d959195b7e3b9",
            "0x8597b56eb493044e1f4ad6e4bea4f2ab6ece249d89d6979fbfb1d2762bbf7030",
            "0x353d539b63520ab964f527b30702f4cbab27a8d2d3f698780ae85c2a6a362367",
            "0xa74407581f4549de506428a9c0a51848179bdedd9d63be0bba7eddce53e2d919",
            "0xdee6d555b82024f1ccf8a1e37e60fa60fd40b1958c4bb3006af78647950e1b91",
            "0x4b64d733fb9db8751a77fadf9b2b007d16d511058c9059db93eb1e444ec4436d",
            "0x828aa2056504f3acb57c61a3bf6f9ef4c847429f5605d2c7a6ffd8a60e3ff23d",
            "0x828aa2056504f3acb57c61a3bf6f9ef4c847429f5605d2c7a6ffd8a60e3ff23d",
            "0x732900ff76dc3aef13f23de3d01523dd7c80e2c93a84d40917eaf6da09c65c68",
            "0x7795260050de0a2a153c8fd36f396bcb6e8912b6a25c1d01b681f2f981c33ca4",
            "0x2b371e2286b3524b8eff4946306bae14613a812a400805872160c50cfd3edf3e",
            "0xb439456e0874ca97fe61132212bc32d6522f5f76e86363dee7116fc3e4ed81d6",
            "0x9326edb21e5541717fde24ec085000b28709847b8aab1ac51f84e94b37ca1b66",
            "0xc93bd63c3035ed85956ced8091b14856b5b0043f13b3c966764ce10befdf9894",
            "0x8b14655eb77e7ba428473c1a3b10a411c859e244a3988ab51b794778f14e8eaa",
            "0xf197b3752adce0cf1c9e7f1567d59edc7b4165c560e6ff0f4aaa74ce5d42a789",
            "0x4aad4369b8c0bb861bb5bd7154de7b9715a3448db75ac259f4882c6cb1b431ac",
            "0x8c85747b61e7ddfda5d942aece6d20d3be07e03026cf07d5c0bdfc5eb23de3ed",
            "0xa2d599ec4a802eb5ae28090bca36a14c1ae33a749a214baebb1a7129535b16d2",
            "0x8b0cbfed347fec2360fe3878ea3a73a8321191fb41e3d72bf48c4200650ae087",
            "0x659e6f56c95b5139d08e619945e0f48818efe29006b6f1cef0ef9f7f66495587",
            "0x09a19450cd9fead0f93fb25f94847a0f8712352be8858578ec62294ee4b64604",
            "0x8786b0602fd2f6874a1bb56642b78c8c4763a700c755276142ccd168ba16f26f",
            "0x52786966720973eb3c730a7e2eddccb47cc28269c5b4f828d8e6b390667c576e",
            "0x80cc71aac18b1d967c5b56aeec43f7a1949613b9c66acc59d4727d8a98f59d24",
            "0xb4cdd3c7a93a529c245478dc2036fae097d7fb489b282aaa47eed1a4f93c0713",
            "0x21e06674f7c569072621155a436d78519ab34012a8555ec8a5dd251c5b1a5667",
            "0xa7fdaa0b399267d7a52abda214e3a41c4dbc2df31a927c8aaa1f4f36b2c32568",
            "0xb73a0248f117fe5ac8648a71853063a21acae938c7214817a2b8e71091af4287",
            "0x4d51292a9044aa9cc140d062818e7c525525cf2376aa005bcd4d0ec2de2d0082",
            "0xdcb89dfe86aa61c54c47c888b94dc1258b489dc7c0869836748cb8691f0a6094",
            "0x5b95bb8af0ddadbca914044ebec50d190016d96dbe8b9f0722efe6cec4b8ae6a",
            "0x8db1181778ecaec070428b2421cfe659477cc58023f29cfcf6ffb0fe03f3d7d6",
            "0x4b646b49d256184fcad15d1b271b9064341621a4a5abaaa798f85494a3959de3",
            "0x0e60044685847a6c6f8a75076115e4f968bda629bf85cbf7b49c0d2ec954e7ea",
            "0x2fb15d813c842c7dce9db8ecc42fe1f0ac84984e14cc0e12789c6eece79dd45f",
            "0xcb7a1e93475e8ae0e043cd488794ee0d522805903c9a5b64366a413c7abada88",
            "0x5a4d68ed861468bb7db7c53c4ddc5e5bb3d8a20a89df097fa24cd0b46190e50e",
            "0x4d2dea89653fdad5e063515a504268cdab09f8f943656fcbccb518b1dbdbe2bc",
            "0xa6bed382bf865983d1622c3d4dd1cd049f3773af12590b852038b720a5e6c3e3",
            "0xe641b8b344a81b865348f2b54385f2092d16035c8c1d3f759b71343f66c9b4b4",
            "0xb1b1275c89ce3efda270157c7740c879f7d0513d0b3b10182424b2c796a6d818",
            "0xadbd78a8c7ea107f3fd59a648b3ab7ec72f98d48bffd04f3b02e2dfa26da1d70",
            "0xc3946a2125da182af5dd9d9b45f322e4d6317ffd89270506e2927f75ba497fe5",
            "0x5fb94769c478f23a83c47dd718e230ede101d2c6df921249bbaa379d1b5b966c",
            "0x82288864d0baf2b7d1efb11d457aeb2f181a625c1c2f961986afb388f4705238",
            "0xc3946a2125da182af5dd9d9b45f322e4d6317ffd89270506e2927f75ba497fe5",
            "0x0afb1f3ab40c09a1a746e00cc8ce3ba969084e077f5076b97b0c2df72f931dcb",
            "0xf063e5ba84d3471e3faadff86e0f7fd2766f9687ede238eb60ec1b71c36ca290",
            "0x7b714db23c3f6458380885156b993a665e5ae7c552557292f9bcac5bd82fee0b",
            "0xcee11a7e14cad63c2d07bfe237e5721bc6623fb96ca547747ba6509b3a5838c5",
            "0x1521d2773f60bf4b91b8e2925f1fd248075ededd0e00e2b46ed86f1401c127d9",
            "0x3b9c4a615f4b13df2c9016cb5c3fc34068b639351c3ea0b3b9e3cecd4bcf7a5f",
            "0xc42ad4f5eec93f3ea5d2e28c8cee60d47a0e4572f3ef7bbd5c58e655071abcb1",
            "0x2b0b5fd95189da9f180326185896d748cd711f2ca6f0e12b978c87f05baded4b",
            "0x0ed16090b91b2ba45afc740a70f5a970334e080ee3b549d8d64ec80cde30f3f1",
            "0xc9155485cfd5a94ef1cd1e9f5123d1b1772967e669146cf29d0e6857477e02df",
            "0x8786b0602fd2f6874a1bb56642b78c8c4763a700c755276142ccd168ba16f26f",
            "0xa8ba4f081f83a5aa50dc41e82de2530c97b4933e65fffea5b470cadadf03140d",
            "0x8f0690e36c06fa997a7991e0edc32fcecb386168546dafe8025e239d1c500ba5",
            "0x85386116894474b28f877af1184877dbf993947061c44103a5a288648f43f51c",
            "0xd17c2c32fc2f25794439632b6e3dab7fbbc425eb3ad91f0c31b973f6bb6a54ba",
            "0xa41f20371c57e2a07236bcd1c1bd5352ead2935283c5df8541bce415984a72a0",
            "0x043532d4b8f05f32432d8fb474c1df3dc7b464a66f2f50ca484fd6d778bb7e06",
            "0x3ec22f47f50f22cb97174242f7bd1d2165331bb5620542d9ef9651d1d1fad70c",
            "0x40d6f51d371593b0a5b58f705e567124548a3f6f54aafd850998ee7e6e83ff14",
            "0xa7f1f9750c29c5d3b040884a984c5d7339b66375fa46e91977415b5758b52609",
            "0x90fdc5563a3018c6655b493b5f43a64d25671184723749dddc1baa035de2bd9a",
            "0x5b31e76407522a7761c0dec65ff55a90f264d1dc6e4eab2340985c041d001212",
            "0x80da101ec1a26277ddcfd9d588ce453b5d7f04a18f0c9d374ffefa3ef76ef1b9",
            "0x957f835853d217bc3085a90b7250ac9e8a687265b7fc3ea5f6d106949ea070da",
            "0xc36a3010cf72db28a818b304791b4cec121c9deb5bf7947f4699bc59acf6120b",
            "0x6678ca83a348f83a6981eba1fefa49f783b0ea26db15058c24a9e1f07a8094ca",
            "0x30e79e4ba591c20fcf392354f5543a1cf81f7d17ab793280d4ce0dc6ee5f7885",
            "0x66abfdc00027a9344e2c3f585b9f9337d29e901a25395cc83506f47adcae5692",
            "0x7af231d3d958ecc2f01b23472582ef631c4be5286442d8b1d685e113e6e9aaee",
            "0xa646579d7bca1d9b72d4cc4aad40cfbd99546f0b8e2bc895e89443a4ecb6a09d",
            "0xad34c4e017351c27ac893648af559d00024e21e12720d46c4aecf19ae5d0ce06",
            "0x9b857dff07baab54ad76b1286814b68882b7441caa8ce887819559c29e25b3e6",
            "0x9cb2edf7dd1a24ddb28908d285026338a801aa50af3003562972b864973794ca",
            "0x00448c46c3738eaa81b41d38eda561bcfb81b3fcb9f4e11f948ea83c071fdc49",
            "0x859184b241350999b6796650a79a0728f0cdf2f02c5e9accbb734a454a85939a",
            "0xd379cfe8b6005cc2182f51b229f21600d9abd308533fb48b8d2ff07645a9aea3",
            "0x83f79300426670c59df41cd77e690cf634af94599a8dc684f6a2d7b52e1e16bd",
            "0xf3826fe51908721c1f6ee43a7d67b10b23f1a89cee10d9d288ecd78d0963095b",
            "0x7915c11296a865590136ea8b80afbc6d84bd2dc198f993c70c00e3793e7eadd2",
            "0x957b6c44fad599e33c73f4685f38b257a3079c5b92a428d03065990cf5ae4963",
            "0xd012a5483f6a17053696e5dbb0eaf2ec317dc35939c7fc57e5b1278abcc04a38",
            "0x699cb778bb4ee87743e5067ad189a2564091ee4202d2543541ddc441b4a9ec66",
            "0x81cefe170d1d256c3825bd9d3485838d82589dcb82fcac6d029ae3c6b96c5a24",
            "0x4d5649abd408b78db60b37fd815cdd65e19c6255909395377d477990500cde86",
            "0x5fb94769c478f23a83c47dd718e230ede101d2c6df921249bbaa379d1b5b966c",
            "0xa378c36815f9d4513ae244b060041ccd6916dd7b7c71987d143facaf02adf003",
            "0x5f2ca82fe01b79d03af15e0cdf4c5b5a333332023590b7cfe1c6e03ce9ce46f0",
            "0x99c27dd343d56b6f1cd81a1974cd95d363091ed66d3088629440638bc9777693",
            "0xeaf3e3a2217c6edb68a6fd48db9e0b8fc7af5fb0acc12fb4ab69f7b9efb1ab58",
          ],
        };
        const gamma = GammaSImpl.fromJSON(origJSON);
        expect(gamma.isFallback()).toBe(true);

        const json = gamma.toJSON();
        expect(json).toEqual(origJSON);

        // try to encode and redecode to binary
        const encoded = GammaSImpl.decode(gamma.toBinary());
        expect(encoded.value.toJSON()).toEqual(origJSON);
        expect(encoded.readBytes).toEqual(EPOCH_LENGTH * 32 + 1);

        const b = encoded.value.toBinary();
        expect(b.length).toEqual(EPOCH_LENGTH * 32 + 1);
      });
      it("should encode and decode ticket GammaS", () => {
        const origJSON = {
          tickets: [
            {
              id: "0x00e51b1c58522256026b3af0c9d949a180011007ec74147189228656e9d21d1d",
              attempt: 0,
            },
            {
              id: "0xfffe4da5c7c304b8f555722a5960da6a3ed7c9ab80bc3e8a48520de78eca388d",
              attempt: 0,
            },
            {
              id: "0x015d2d6f572a572c6c79f7d1ea94eb2630451cba75a15cabb60515c1d490bd6f",
              attempt: 1,
            },
            {
              id: "0xfffe1726d751c2be3bdff4229728b730e293119274524769045b043e4a406335",
              attempt: 1,
            },
            {
              id: "0x3d4a76e5eb566f0eb17a648d41e51051a4f3b4e44a4b075f39da6557fa74465b",
              attempt: 1,
            },
            {
              id: "0xfffde837f6724bc45c7b667587169a6eb9ee7af28ad963463031aa089a0b7133",
              attempt: 1,
            },
            {
              id: "0x458a432d797e4e275ba6d76cfe9aa63847b1dac61529f83ef42f64abf813f0f4",
              attempt: 0,
            },
            {
              id: "0xfffde23ce3f9656e912b57008c384a6664de662de2886e2fb743cccd38b3a51c",
              attempt: 0,
            },
            {
              id: "0x4c82dbb7bfcb583bd07bd969b402f10db1c954a57226c9ecdcbf86f6c578f67d",
              attempt: 0,
            },
            {
              id: "0xfffdba948e7229f6e429c33e16f0ccd0b6331232d81233abd5ef03fa20c374b2",
              attempt: 1,
            },
            {
              id: "0x5af49b10c9e179288cfbfdc55e9afe0d2ac770b266cb73f751d3d4e9eb23b348",
              attempt: 1,
            },
            {
              id: "0xfffd80df5e14c83443268024154e692386eeb941df2f93443e99f9ac7e4d4ce6",
              attempt: 1,
            },
            {
              id: "0x66352128db3b94fedf61d12ea374cc03b464bc908a4a2701ad1f1dc59965a88c",
              attempt: 1,
            },
            {
              id: "0xfffd7565622e9757f944fc406775830b4f65563d88ba1294d6484de3661c8020",
              attempt: 1,
            },
            {
              id: "0x847cd06ae52c37aa9488a0c7f9241da8701b4c7fef3be1180c5734efa80e1eb4",
              attempt: 0,
            },
            {
              id: "0xfffbf96a196301428af91eab476e70240218d7c2f721de84133dc4f4cc0b5524",
              attempt: 1,
            },
            {
              id: "0xd3fbda35ca0b5ed1cb05018da08e6bbf1845e0da25a075523e475b97e5f6a7ad",
              attempt: 0,
            },
            {
              id: "0xfffbf9685b366f5a9f9fc7126615e4d5d22d723e7820f67ea40ef4cf63db8e2a",
              attempt: 1,
            },
            {
              id: "0xd96bb363d7a4c8d7a4492fba2b8df9dc2a3e4ebe06268a7b0845823667192c20",
              attempt: 1,
            },
            {
              id: "0xfffb4afa338166a7d4b00c7c10d5d3edc8b9adebb28c8bd0ddd776e4fdc31e20",
              attempt: 1,
            },
            {
              id: "0xe6d1c5f0bb6171fded00af3ed44b0044e734b7c642b4b652238db9c26b8417fd",
              attempt: 1,
            },
            {
              id: "0xfffb17d089364cc5f2f61c37a666da68082c4687c233adba46b0c6b2b3ba23d7",
              attempt: 0,
            },
            {
              id: "0xeeb2d4c4ace4b68098fcf913ca2457d81ec141ae29aec330e1c0f51ae534752a",
              attempt: 0,
            },
            {
              id: "0xfffad2ee5824c85ba7ea82d14786d2e898dfb91313a46ceb47344d314d94aa27",
              attempt: 0,
            },
            {
              id: "0xeebf219d0dba8186e226bc167d9093f9c1785a6f51d4732f8c490a7937a21f47",
              attempt: 1,
            },
            {
              id: "0xfffa9cb5f0cf284fb8261d923f53a002b4c9def82277d4ed19567a334eb971b1",
              attempt: 0,
            },
            {
              id: "0xeed5c8f5c358beb9cf30a2b78204076184fba35888cc086c4fd245e49f1cd19e",
              attempt: 1,
            },
            {
              id: "0xfffa96366893f82d63d6a422f6c7acc1d8a966d1880865938765c5b7551deb7e",
              attempt: 0,
            },
            {
              id: "0xeedef9054ca4adfc67dc4df6d33c8e8bc05597cef05be25a73a01b18fa6299e7",
              attempt: 0,
            },
            {
              id: "0xfffa93066953dfb39b532b2ccf10dd08dada3130a8ef06837b3174047825dacc",
              attempt: 0,
            },
            {
              id: "0xef6ca788eb758a184f85af94a95a40f71e68993bed05767ef34f5190ff7fde25",
              attempt: 0,
            },
            {
              id: "0xfffa48d9022fcf12b7d84455d88800c20fd9a14873ad0b56cbcdcde98cb4715d",
              attempt: 0,
            },
            {
              id: "0xf0b66623d642f15a8c3e8ec833822d2eadd7c96deeaef4df6c4c36568cf30ed3",
              attempt: 1,
            },
            {
              id: "0xfff9d2f86ecd4c382d7a93c77043cf1e7b116065728181e6b05b0cb69b88b236",
              attempt: 0,
            },
            {
              id: "0xf1034f2e51e673590cdc3d4ad3bb6383f64c9c7aa5c9e062c34a850d14e53635",
              attempt: 0,
            },
            {
              id: "0xfff930063aa0dd92768617c5507cfd4446a1f8bea338993fa00291e1d8407b79",
              attempt: 1,
            },
            {
              id: "0xf1ae43d80c8c48b8892fb130582a709fc67e9db1609d7a037e4374964f55d715",
              attempt: 1,
            },
            {
              id: "0xfff8c521b44c0aa6a7a4b6d51b1d40ea613082c965fcbb4ee50a75c2015017af",
              attempt: 1,
            },
            {
              id: "0xf1ced86c872b1507df62d3e4145dc4c629c10d85e08abfe9f92c368de9bd5796",
              attempt: 0,
            },
            {
              id: "0xfff7fab4ed8c71bf72fa695ce20ec3d9211f6a1cd5b4bfb135c5cdb6c4d87821",
              attempt: 0,
            },
            {
              id: "0xf1faf46fed80e1bb32b8f1aca4d3a3c6538f81b76e8b6200dc12d6a0f1b882ff",
              attempt: 0,
            },
            {
              id: "0xfff6c91d0d0cc860c17de59c3b260bff5091b366513f6c952e2660478a4f0ce9",
              attempt: 1,
            },
            {
              id: "0xf228deb869c81a98c1b1997c9fe17391459355974e5f446115697ef33a987ae8",
              attempt: 1,
            },
            {
              id: "0xfff64bae077f11430b5964611d7150579bf26fe7f6da12ceaf9c67b15800f559",
              attempt: 1,
            },
            {
              id: "0xf29315ea51d9539764f4102340185f3a6d6e7394043eb78016817461a5c64c06",
              attempt: 0,
            },
            {
              id: "0xfff5d7571bf8c3b490c3bbeda5890c7d2738ad3a438092b6c12ea07d5aeffd86",
              attempt: 0,
            },
            {
              id: "0xf2f08404899a00cafcd8aaafdfcb5e1bfd81353f25ba7299e648206937183808",
              attempt: 0,
            },
            {
              id: "0xfff59ac1446508355c4189346324ea944f4c9838ab1451c27149bd09fb6c2971",
              attempt: 1,
            },
            {
              id: "0xf314de96e7e0a014e8a5c674ce372db914cf52a132a3e8251aae0b9f05e9e47f",
              attempt: 1,
            },
            {
              id: "0xfff53020504301017d883fed0eed75001cb2242d219a372bb334895ef5887899",
              attempt: 1,
            },
            {
              id: "0xf3f1cd9dfeb678105c5e6f02b1dfa91506e968512dd22477c36577065a3a179e",
              attempt: 0,
            },
            {
              id: "0xfff4b7452afcc426831ef3f470983afafe865af39f7fb224873e0ee43a093d66",
              attempt: 0,
            },
            {
              id: "0xf3fc878711a1868d0cd5a5d1abcb65f8ea6325f6256baaa96df98bc5c4936d31",
              attempt: 1,
            },
            {
              id: "0xfff456658d108c368e6bb7473305a5278cae99cc199c55bfeb618420d6a64231",
              attempt: 1,
            },
            {
              id: "0xf4aac2fbe33f03554bfeb559ea2690ed8521caa4be961e61c91ac9a1530dce7a",
              attempt: 0,
            },
            {
              id: "0xfff44579be8c552c2feece64601aad3c568a4aaf69d0231200eabf46ccc0cb49",
              attempt: 0,
            },
            {
              id: "0xf54542b8ba74274faf17427c41a7e8c069cb2d76cd540aec632c8b6042cbd2fd",
              attempt: 0,
            },
            {
              id: "0xfff3ee933068eca4b9062849984f0e8940779f3d50dabe350481fd0f3479105b",
              attempt: 1,
            },
            {
              id: "0xf5da10b55a0b3fa56a1f1c11d31d74c186551cf5a28fadf2ee604cbe1c4a434a",
              attempt: 0,
            },
            {
              id: "0xfff3cff4e04fc68d2e7cb4d1009e6ae7d706f838d89c1b3d2e2b8af027e51cd9",
              attempt: 0,
            },
            {
              id: "0xf6992b3f4e7b746ee3d9fb5e413133f51afc638aa73eed80584befd7a107fa49",
              attempt: 1,
            },
            {
              id: "0xfff357f56bdb9269ed553a3a06bbe6a2fd3c5a145837fee330e369e44f029a57",
              attempt: 1,
            },
            {
              id: "0xf6de66f2efcd2b33d7b3e3dfddbbdcd286f82b2dd017f5482070fb5dcf919178",
              attempt: 0,
            },
            {
              id: "0xfff318bd94663e1508d857d68e3232af31a8b7bf876680feb3aa1fce57ac48f1",
              attempt: 1,
            },
            {
              id: "0xf7c1c31232a9f8a0b7c81bc8549ed96dc9f7ad300c4484a72464574ac66bc8f1",
              attempt: 1,
            },
            {
              id: "0xfff2c05493cb97a80c5bb90712d75e46ad5b9c53182fb0a7770ea3c664c3ee89",
              attempt: 0,
            },
            {
              id: "0xf8237a38c8e06c92a717eee4301299d785dd32765027b2fe30c683721c97379e",
              attempt: 1,
            },
            {
              id: "0xfff2b10370c48ddff8fc7283a313ee00234d14f8dd4a44b81297e1e7d3310db2",
              attempt: 1,
            },
            {
              id: "0xf85de90825a31a65fae56a636b0fb6216d70c14a9194bea4639c1e8a25396e27",
              attempt: 1,
            },
            {
              id: "0xfff274835dcf3e135cdf5f6394dfad1cadf475547197175ac4c59fac2b9f2148",
              attempt: 0,
            },
            {
              id: "0xf94b8bde9ae532a5257bf14a1f95d87bb144ceac55d075560f54f082f3b4e6ea",
              attempt: 1,
            },
            {
              id: "0xfff1ea601cd0c455f8a0e07107acdb864254ce35f28da758ebf4faa7732d8c09",
              attempt: 1,
            },
            {
              id: "0xf99aa743aeb2c4287d6d9f84bf3031efddbc14b2a18789a4c7ff776407eafab9",
              attempt: 1,
            },
            {
              id: "0xfff10581df4f802210e004cb886a8c32f14de5453837d5a8ce733f5fbee898ae",
              attempt: 0,
            },
            {
              id: "0xf9ef60ff16220ec5f69e5ca6bbd524191af28c4f5c9d2d76b6df6caef701678f",
              attempt: 0,
            },
            {
              id: "0xfff0c3763dc21c6d6cecd53d387f3d498d509b271edb9e6bdea50aebc3bc4244",
              attempt: 1,
            },
            {
              id: "0xfbe4c2eb88a5e146809e009a31b32447bbe1901fd25b2ca659f713b35ba10827",
              attempt: 0,
            },
            {
              id: "0xffefccad67cff103a466d74e139a26ab2b1d7f63d9fc586f5125c997511af5f3",
              attempt: 1,
            },
            {
              id: "0xfc12d97b516e6e7fe68e9bbcb622784543b45d5b89c00d720115d1e697eca4f5",
              attempt: 0,
            },
            {
              id: "0xffeed19b819d5f0cc47d287211b44597ba3399cb50b36cc8cc6a083a08b2ac96",
              attempt: 1,
            },
            {
              id: "0xfc1a0832f75505f55ed9d502a8c7923667f3bafe7ad33262308fd97ca1b6097f",
              attempt: 1,
            },
            {
              id: "0xffeddaa8c7326899dbe1a96b8d5871db71aea755793208e90ae9a5fec5e6a5f0",
              attempt: 0,
            },
            {
              id: "0xfc69131fa9be60bff4b8553640f44ff20331428a890998a0d50a9d97d3ffb474",
              attempt: 0,
            },
            {
              id: "0xffedd4ca7c5f79df10dad8c256d5cd116c1c9cd98f9c7c4a7a0970a5a8f0cf6d",
              attempt: 1,
            },
            {
              id: "0xfd91a7f8086e351a385ec872238a212b1c4b9e6c8326ac1d3b5b59716e2cd7d3",
              attempt: 1,
            },
            {
              id: "0xffedc4290ac1f42cb26a4efbdf1a205e47d67e46d01d32b6fe62144f09b30092",
              attempt: 0,
            },
            {
              id: "0xfed2f3abd7bc3fd4fca4433860322e84ba4eb38b392e38b3aaa4b1a8dea7afe7",
              attempt: 0,
            },
            {
              id: "0xffed464520ec7bfc542db3bf095751fb75f7782a70ed4fd11784fc7dae3e4d52",
              attempt: 1,
            },
            {
              id: "0xff0045d3f0cd95e0ccfb52a8ae641abe047e8fa91b0b1b47f01c49db8550c2f5",
              attempt: 1,
            },
            {
              id: "0xffecd04aa0f33ce4ca5d69e85dfec91f7555b9a15909988bcfe3c896b056e52e",
              attempt: 1,
            },
            {
              id: "0xff00b2472bd0598c576bc42ec97696152214268b5e58c25b901318d2744c270c",
              attempt: 1,
            },
            {
              id: "0xffeca5ce4c79a643d2ac159c7865c0f611497ecbab0287a253066eca6dc01d23",
              attempt: 1,
            },
            {
              id: "0xff00fa02821be2d413abeb981dd5051e9de84e221f2ae352ec884cca5d87be27",
              attempt: 1,
            },
            {
              id: "0xffebb66f09bc7fdd21772ab1ed0efb1fd1208e3f5cd20d2d9a29a2a79b6f953f",
              attempt: 1,
            },
            {
              id: "0xff016b7a5db930dabdea03aa68d2734d2fa47a0557e20d130cc1e044f8dc5796",
              attempt: 1,
            },
            {
              id: "0xffeb588bf290825b83419ab634715e42075f0c29869ef24761bd082c1c422792",
              attempt: 1,
            },
            {
              id: "0xff023e1966698b5c32f40f06e608167ca69deb06976a3006e096053e8ee13e8f",
              attempt: 1,
            },
            {
              id: "0xffeb3c95a5805e0f9ffeeae2cd0a489a5eacfa298c0f158c12b2785e3104ee07",
              attempt: 0,
            },
            {
              id: "0xff032f68913a6fc3714f90bc3f96a33014df3dc7dcc377635213b453c986805b",
              attempt: 0,
            },
            {
              id: "0xffeac0715cf8d7be2a1d1d9956990f262f1eb8d3f4c0cebfeacefca56a9c9d2c",
              attempt: 0,
            },
            {
              id: "0xff037c7466270a63a0f6cc9a3b5ad1a3067a64a0b7e626f4ea9e95cd6533ed89",
              attempt: 0,
            },
            {
              id: "0xffeaa29374602250b4308b2e9f4de54ee684a7f461e6907fcaf5a4e9fc59043c",
              attempt: 0,
            },
            {
              id: "0xff0383afef09f103634ca3b8f2e26a9f923721e6c69aae40c505ac51955fdd96",
              attempt: 1,
            },
            {
              id: "0xffea18db0a4934e06533a2ced97a16896c4b59322b2e85151dfd992b49d55e9e",
              attempt: 1,
            },
            {
              id: "0xff039a1396082e353223bf474d711d67b3515a81d49033b212613b091ee7eb0d",
              attempt: 1,
            },
            {
              id: "0xffe8810e1c1157eb4b4c6ee0e3e63960744dc109fa1e87ab189359f0ae8442c2",
              attempt: 0,
            },
            {
              id: "0xff039ff7caa17ccebfcadc44bd9fce6a4b6699c4d03de2e3349aa1dc11193cd7",
              attempt: 1,
            },
            {
              id: "0xffe880b87230e9857b8d682a992945c4fd78e15219fc07e9af7b8cfccc0ec796",
              attempt: 1,
            },
            {
              id: "0xff03ae4ed3e029bea380f465bcec3f570f48d74ba3910cd41ca64fae87dad7ba",
              attempt: 0,
            },
            {
              id: "0xffe6e87869af9512e335a36854ba055fa2f05cde3f0fc945c292069409d1a00c",
              attempt: 0,
            },
            {
              id: "0xff051e2b284ac3261bf5f2f8fe9158fe1b3194f71a5e585579d47e20b11c8cf3",
              attempt: 1,
            },
            {
              id: "0xffe6a5cc64f027123db4ee990eac1ddc659097a711ef9c89c11ae6434c52b374",
              attempt: 0,
            },
            {
              id: "0xff05e209a9d8ed8bd7f3427f4d8a974a5cec0f5ad61d4dadf689b7875933feb0",
              attempt: 1,
            },
            {
              id: "0xffe580769ed340946e5fb25d414e5a797121e788048b75b87e6267985ef60f85",
              attempt: 1,
            },
            {
              id: "0xff06127fb9cf3fe78a730a8826367a3a5a939a87be5108f5cd124c4fad2ec130",
              attempt: 0,
            },
            {
              id: "0xffe4d9f8f04520c6aba9c7c0afe3f8977f56e2ddc8d8cfe1ea611b52dca65ad3",
              attempt: 0,
            },
            {
              id: "0xff062887954256ada47d820c1ce8fb1e8e2fd93b85e11a3d5f2157b6c47e44db",
              attempt: 1,
            },
            {
              id: "0xffe4d94a956fab5d252b6c39f29de52be990b51a0e60c161261f153c76312d56",
              attempt: 1,
            },
            {
              id: "0xff06640844884f4afec9d1a035d03c536b2743f4d9f94c5aebe2a83c6b38ca82",
              attempt: 0,
            },
            {
              id: "0xffe3e92be7f8092f774e32279274fa3a3dab5ad95893cfed33d46469c68c9d3b",
              attempt: 1,
            },
            {
              id: "0xff066d4d4d245fc5bc01fe8c55005c9b92d7a9f8deb443a9369d4423acd95700",
              attempt: 1,
            },
            {
              id: "0xffe37a5c1a7653c37335829ebf74acf3fa24ab7d93a05b691c7b968ebe4906bc",
              attempt: 1,
            },
            {
              id: "0xff078660c533195e7da18235df53a19f3451bd2fdc9e4504ea2a067d6e06de38",
              attempt: 1,
            },
            {
              id: "0xffe346efb2df72251c79e6ae88ca5f6af6de82ad803072150a4e9e6a51f95cb3",
              attempt: 1,
            },
            {
              id: "0xff07a06dd5e690763c223421b6126ba058d04216a3a02e4c164348513b6495ea",
              attempt: 1,
            },
            {
              id: "0xffe2a57b64d1d5b2b8b65e5cf82f6a92a8515143ba0d5d8b3af109c411c1697d",
              attempt: 1,
            },
            {
              id: "0xff088bf3b4e7853c99e49636d9e7c9a351918d70bd6cdf6148b81e68f5706f68",
              attempt: 0,
            },
            {
              id: "0xffe28cd2b946b10203e2be5ac0cb58cd499b6e6cf460909510a71690d8080f9f",
              attempt: 1,
            },
            {
              id: "0xff08ee0c30b295755db3aaa39123e7f05797165db3e1fef5bf363fc68c66fba7",
              attempt: 1,
            },
            {
              id: "0xffe2591d6feca930159a60cfd708b37416fb74f0aff94e86c73997fa7bfe03ed",
              attempt: 1,
            },
            {
              id: "0xff096fda89f1e01cb7d5ba16ba322bbce0e4243530def048abced44f50af9d0f",
              attempt: 0,
            },
            {
              id: "0xffe207a19868b3a00bcb3054bf210f4bf3d3b32bfe397f0aec021e6744c2cb16",
              attempt: 1,
            },
            {
              id: "0xff09b54097ef0f4462b0abf0df799d6c863078de5e304975b144096f9a4ac083",
              attempt: 0,
            },
            {
              id: "0xffe1f8e23114663866b2650cf1cb2ed0b6740a2b1ab8b07c5fff07e72fa1b28d",
              attempt: 0,
            },
            {
              id: "0xff09d58119f021a678ddb5cf6de6c8cfe707933a96b1c8257584550cdca54252",
              attempt: 0,
            },
            {
              id: "0xffe0f9ee7b10115fdc8801ee3878055758cd14212ea9f3b856dcc879843b290c",
              attempt: 0,
            },
            {
              id: "0xff09f6515a3dcdf32b896678a89b1d867f1bd93b7485f82d1e901c51e875b2c2",
              attempt: 1,
            },
            {
              id: "0xffe0eb17ae5d0f0b81114c85e216a3712e69b347e60511fb813de1f7acdb7d53",
              attempt: 0,
            },
            {
              id: "0xff0a39061a5c02332cd7fe3705672ca0acfdc376ee573d24f89f946f7e63fc9d",
              attempt: 0,
            },
            {
              id: "0xffe015ece5c8bcb4431e192d12b9146fdf43aa32489e1aea80871e5f6d35fa70",
              attempt: 0,
            },
            {
              id: "0xff0a4f4b4fe189a3d45ec4d799643f8196b25623a6d866abb3f49f5600ea2a2d",
              attempt: 1,
            },
            {
              id: "0xffdf95e9d53be8b07555064761ff52f787266bf7cf65e98d9669af407d32da58",
              attempt: 1,
            },
            {
              id: "0xff0a6b5be99a94d16642935da5a73c121fb2c8dcbff0e955fce14069fb039ce2",
              attempt: 0,
            },
            {
              id: "0xffdf7a0d855eee826651667586882b6c7023f5ecf85d314d867bac1c034659ce",
              attempt: 0,
            },
            {
              id: "0xff0aa1735e5ba58d3236316c671fe4f00ed366ee72417c9ed02a53a8019e85b8",
              attempt: 0,
            },
            {
              id: "0xffdf5757d7eea386f0d34d2c0e202527986febf1ebb4315fcf7fff40776fa41d",
              attempt: 1,
            },
            {
              id: "0xff0b074a850ef1b20be372160e9cbe25148bb006a02d6099cd6a0522dd38d32d",
              attempt: 1,
            },
            {
              id: "0xffdf4fcad646da71a66575b5091e4446722a4647bd9f5de0a1e82920f4c72198",
              attempt: 1,
            },
            {
              id: "0xff0be2e9870690dfe5e45b0b59fe38989945bee41aa16f0e3c37f5d1a92e38c8",
              attempt: 0,
            },
            {
              id: "0xffdf130223cc2afef37ffa7c9a1106ed1adb4ee2ea9445d99d69c6c998b65714",
              attempt: 0,
            },
            {
              id: "0xff0bfd568030143bfeabf0421d5203a2bf331bb49b80775d30c17b48fc75d93b",
              attempt: 1,
            },
            {
              id: "0xffdf0056b82054b16ca4bb46a6e558d0882d4d2612fa70d964d4b022259563b8",
              attempt: 0,
            },
            {
              id: "0xff0c04d7817f1b0ee6abfb93bc4001f9910a50af0437025a179cf4c1b87f634b",
              attempt: 1,
            },
            {
              id: "0xffdeb986132857f1fe21e694637936e4519a3669b9c2af385ee7fa4d9c407ca8",
              attempt: 0,
            },
            {
              id: "0xff0c316ffb8634a9b65e70b5b142a3b2afca06c57be7c2b96e1b4d49f15ae505",
              attempt: 0,
            },
            {
              id: "0xffdd9136cf17d0bf941a1005c75ed91f0c77a945abe30331109316cdaa7b9c5a",
              attempt: 0,
            },
            {
              id: "0xff0e48d049c3fc8680a6ae28a98d64ec5a082e8bac4874b488793ed60ef172cd",
              attempt: 0,
            },
            {
              id: "0xffdd71f1ed38291be1bbd56bc1b9a74e315c7de623c0cbf33f1da020174a116c",
              attempt: 1,
            },
            {
              id: "0xff0f931ed5ffe7775892319d2f54eaedb362c552050cf2beabfdcb2b9037973e",
              attempt: 1,
            },
            {
              id: "0xffdc6ac1ef195b63a52526eec40308969e4b1bb7fc2c8e717ca088afd5a5044f",
              attempt: 1,
            },
            {
              id: "0xff0faf9a92785ac3e0bddf614d43b4411052195a83cfbe8c1f461be275c65ca8",
              attempt: 1,
            },
            {
              id: "0xffdbd26e9041da9b9c605d9b6455e65d7fe9c24dc195deff27484a51b0cd5e15",
              attempt: 0,
            },
            {
              id: "0xff123df9b2a7b020ef0df9cdf6f759b39de786b4a34f74609891293758339237",
              attempt: 1,
            },
            {
              id: "0xffdbc2c4c3ce8d14d3ed483ed6234031dfda692dfce5bc8f075f305ba532f78b",
              attempt: 1,
            },
            {
              id: "0xff138e0bea8a97f8563d755a6626cbcbf0ab8240ab8a38df6ba2a6d1a281b753",
              attempt: 1,
            },
            {
              id: "0xffda8d21c1c543e52fa2201dd186dda5bce740cbe979e31d8c92bf6936e68bfa",
              attempt: 1,
            },
            {
              id: "0xff1397f77f04534ddf0495e1f64fb68d26fb729e45bce4b77a41fb32efb1d1f2",
              attempt: 1,
            },
            {
              id: "0xffda6d1f761ddf9bdb4c9d6e5303ebd41f61858d0a5647a1a7bfe089bf921be9",
              attempt: 0,
            },
            {
              id: "0xff13981604a052bd58d69340357671842f457d9db451c8e6801b36ded139c0e2",
              attempt: 0,
            },
            {
              id: "0xffd9ed2ba729a6419907e522c55e246fa70eebaae3a01a3794b2df42fc36efb5",
              attempt: 0,
            },
            {
              id: "0xff13cb22a9251588b859122ec2108147c7d449789714794065e86e27d7e8d801",
              attempt: 0,
            },
            {
              id: "0xffd9459471e3a7595267ccd1be07c927642452a8350a41b576fbadd628b6cf79",
              attempt: 1,
            },
            {
              id: "0xff13d48958d260e614bf336f2c527fc4d447da3e35df685809fbc4b2f861dda4",
              attempt: 1,
            },
            {
              id: "0xffd91a4a2b4c6202ed0bbc1e082942a7ffe3e90d3e98e75112f90acb06cf2fca",
              attempt: 0,
            },
            {
              id: "0xff1407a1826607329942a2d8a8e342f79c0fc4b762b3db382754b8843f5772ef",
              attempt: 1,
            },
            {
              id: "0xffd89f44f3556971bb9ed84dc879c3d277dad9257ca4d6ebcd9749255d6d59a6",
              attempt: 1,
            },
            {
              id: "0xff1448b2da37c9fd07678922f3fb894910b4b1ae5457de332d27f83d5470d954",
              attempt: 0,
            },
            {
              id: "0xffd855909860422d29f2cbcdd8204676d9570b4e91f03eb4f09934c5e2c14854",
              attempt: 1,
            },
            {
              id: "0xff14f5deb4d7480fe6568ede44151397fc4fa3da9ed32b6c405ca946d12e9372",
              attempt: 1,
            },
            {
              id: "0xffd851ec35589a4386756398073601213eb6a9661d4b90e6b2b394e08b851d8a",
              attempt: 1,
            },
            {
              id: "0xff152368dae7383da4e069c665b2f1c148975f9077b2cc550be09316bab14fd6",
              attempt: 1,
            },
            {
              id: "0xffd801834622396257f1d0eae8aa057d798b40e93e131e20bb1f2564f158184e",
              attempt: 1,
            },
            {
              id: "0xff15f157dc0f6ede210f460252929852917e3921584d58b00a8ed1305969f611",
              attempt: 1,
            },
            {
              id: "0xffd764c0cfcbd0abe628f97625ddb6719cd33be5ffcbb9240604d493790bfaa9",
              attempt: 1,
            },
            {
              id: "0xff1616490bdc9d98baa5396d51682e73cefe0a8509f2ec81d13ec71c759b4f74",
              attempt: 1,
            },
            {
              id: "0xffd6c6f67d90801027512c01abe37e3266a69294a7a520c6a0742ba13fbd75af",
              attempt: 0,
            },
            {
              id: "0xff161a9bd7c781ec7c25e094a012bd1931dec18faa2eaa5fd56b20ee19b14471",
              attempt: 0,
            },
            {
              id: "0xffd69e0075d07138a084f1ba8b6c77d957c58dddd15047c6a909f1f54db532a2",
              attempt: 1,
            },
            {
              id: "0xff166820db574bb03f896d5d25cbbeb57acfa6599bcd5d60eafe83a49163bc77",
              attempt: 1,
            },
            {
              id: "0xffd579e9766cfaf01fddfeb4104df712dd53a023f1f74474c6fff25b561468f3",
              attempt: 0,
            },
            {
              id: "0xff189a0c52c0032063c36617e81362ecfd24e7a5c7d9c3e259b6360e0f12310f",
              attempt: 1,
            },
            {
              id: "0xffd569f11dec17852a1bff1c7f264cc58322eea490e2f055de6cab2d24ca95a5",
              attempt: 1,
            },
            {
              id: "0xff19569fb17987c1f8cf6296568330c7d6065edc8891197b8a3ecbe82de936aa",
              attempt: 0,
            },
            {
              id: "0xffd56207a6907053e81ec6fa20d3b5bb7035948ac5fc75a9989acf0ec057e912",
              attempt: 0,
            },
            {
              id: "0xff1ab3d160d8e94b911ef4c8e1f2c66a2e90187512af614b0db6b1568469ea5a",
              attempt: 0,
            },
            {
              id: "0xffd502099a8d25b5b574bc381cf60b84f45163ccb32cb44d64d53375a2d8a97a",
              attempt: 1,
            },
            {
              id: "0xff1ae73a85bd5f51e7ad1bd9b1e7f6a9d6b0c266216a85ddd660506276b1d499",
              attempt: 1,
            },
            {
              id: "0xffd4ed1cbe53e3d76e93cdd266d53a1c4c013a21728109436ffd3486789d2a21",
              attempt: 0,
            },
            {
              id: "0xff1c6abb0f6ed5b4fcc53b6ebccaf5f155e0fa7d763a12a31ae68ac9408d02fd",
              attempt: 1,
            },
            {
              id: "0xffd4e75dd14c1b5f12f3e7db6e61e84580b90029db3921099d2b2af67419a1f9",
              attempt: 1,
            },
            {
              id: "0xff1d395fb2562964998a9a94bac418a642a968db61021a79e06ab3be7d4aa477",
              attempt: 1,
            },
            {
              id: "0xffd4d2d8d5290f7b634d84dc73ccd6a8b73b2fcc6b14395e37fb4d7c05bb3a36",
              attempt: 0,
            },
            {
              id: "0xff1e35c34f82425f6a34f86e2f0d2c5b11ab2636426f49bc1951499f1cbedde9",
              attempt: 0,
            },
            {
              id: "0xffd4b3ca17a697cc4a63bf17b1acf9dc93a089ea429c02e2e35ad3fe9e1ba90c",
              attempt: 0,
            },
            {
              id: "0xff20442833e007fe0bd9fc7070be993ffaba2eb5681e4a8eb1dcc9ca34d88c70",
              attempt: 0,
            },
            {
              id: "0xffd4046ee3a46a1f5f4015371d719edf7937e8358d1edd305089527f9037a2b1",
              attempt: 1,
            },
            {
              id: "0xff204ec6977d14b458b405d7545d39540d5cc60c886db018ff72a227d73dad41",
              attempt: 1,
            },
            {
              id: "0xffd3bcfddc4ffe1280faaade4737f1b4e1c0b09e423b31445d359c19a6386752",
              attempt: 0,
            },
            {
              id: "0xff20d855d2bca06fea324212b9cd4346af59703f74a13573d1b508ff1edcbb0e",
              attempt: 1,
            },
            {
              id: "0xffd37e92ffe3535ea866c02bed68289b6e26159711c30047b38b768273834816",
              attempt: 0,
            },
            {
              id: "0xff20ded7d6ac890aea7ecb1344ff14ac2b95bd55b568884557297c500c108338",
              attempt: 1,
            },
            {
              id: "0xffd2e1450ef84b52d7fd14a0faf8b784f9f0af8cd7566c856b7ce3feff60b8ab",
              attempt: 1,
            },
            {
              id: "0xff218efd9edb090fa9f33f4aace50ddecf4da8a93ec834075c817e738b329542",
              attempt: 1,
            },
            {
              id: "0xffd2a5b4157baf208ba5ead92cb27ef73fd8f96a4cc14cafb91763f1085f4596",
              attempt: 1,
            },
            {
              id: "0xff21d1f0c3a9a39a69d65af603437e83fca3d12a9e9636d8255df4e4b36bd997",
              attempt: 0,
            },
            {
              id: "0xffd202766178d19488a8afeb3a2aa6d4c1daa6195da943b64a5284e6a6c2d2f8",
              attempt: 0,
            },
            {
              id: "0xff220598e0a127f887cf16b37c62f26d9cace85a448243522f9e41b408ade264",
              attempt: 0,
            },
            {
              id: "0xffd1d165fc1bfa68e3bfec4e134141df8da1e37b9daa8436109cc0fb4b1805f6",
              attempt: 0,
            },
            {
              id: "0xff231258b65d16bed4f79447ede7aea036bf175573d281d0aafe401f271cfbf4",
              attempt: 0,
            },
            {
              id: "0xffd11ece80d3cb4a0cf9c83a2a54d9fd30e59d21e0c8c48ad0d70bb2fa9d51f3",
              attempt: 0,
            },
            {
              id: "0xff2324341bfd02ae154d0d0ae50b5d345e7da2fb3f1b5a45e3b5df18c6875d48",
              attempt: 1,
            },
            {
              id: "0xffd102e7e12a4ff06e05de1f1428ea81769280c250d576374b5172c57250a20e",
              attempt: 1,
            },
            {
              id: "0xff2332f135d5c3667012b0d00a2056583b9e1a2819da4c5c4c9cf9a29ab78e82",
              attempt: 0,
            },
            {
              id: "0xffd0b5d393ff8c937204ea55096cf7eb8027400d01700c8b8091cf3ea7c595d4",
              attempt: 0,
            },
            {
              id: "0xff2345e40b7b14f3e7069fb52da714463b217b979853e262ac4038c321f08a6f",
              attempt: 1,
            },
            {
              id: "0xffcffa852aa4e958d9a6827a866376fd3c7ffa8949b11890181ec43637110b36",
              attempt: 1,
            },
            {
              id: "0xff23fa229767a8e27978f4b35672a34ea085d7a5301d8a9039c64fada2e88593",
              attempt: 1,
            },
            {
              id: "0xffcff5c8720f5680cbc5fc301733b2ad7f7a309e37d4c02694ca9e476723d710",
              attempt: 1,
            },
            {
              id: "0xff240ac0b4e245e9ca1b5a0351e9045a6de3db6a48141fa4aed90c1c3966f52b",
              attempt: 1,
            },
            {
              id: "0xffcf8cd4a49b9931d9f615f4ac14464037f6e335fdf8f26b663a3c7994f90c21",
              attempt: 1,
            },
            {
              id: "0xff242c81e8431ec223ef9260a915f14569cbd1e94e394ee35762931a82ed00c5",
              attempt: 0,
            },
            {
              id: "0xffcf7178d40ba64940e4601f32b70223d4e3c169561911613fc6e44b364a0297",
              attempt: 0,
            },
            {
              id: "0xff242f26dbe78dfb974ce1d7281b6713cd1f2dadfb42c3fc6b495ba2211f2baf",
              attempt: 1,
            },
            {
              id: "0xffcec41ac16f3ac2275d20a17af764b9c5a834b295c9209dfc5dc16343225ccb",
              attempt: 1,
            },
            {
              id: "0xff245790bd3c50a42986661c81832bef973bf9fe460505a4a0876a842c93794e",
              attempt: 1,
            },
            {
              id: "0xffce72cf613fe8a6e9391859381daaf533440e7e47f9b77b9d7c8aacffc4fe4b",
              attempt: 0,
            },
            {
              id: "0xff24628db7e8cea96c72065d81322fb9341a4ba53dd64f9c777921e5631aca78",
              attempt: 0,
            },
            {
              id: "0xffce1ee79ab80a82c98620460ecdb1083aabe6ce0e55fb9a0ab7796cd6007d8d",
              attempt: 1,
            },
            {
              id: "0xff252ee7766a4ca3f67767c510ffb3bd29ad80eb664e7bef7efad7da5dc58265",
              attempt: 0,
            },
            {
              id: "0xffcdf557063a4c939b003f27182a4d8d6e4374342e551fca356684b774cc95c4",
              attempt: 0,
            },
            {
              id: "0xff2536b9b547c86ab1e34ce744c1afa03f3f1982b51eae738d905d62432d12b1",
              attempt: 0,
            },
            {
              id: "0xffcde7897ded93142cc8c913b38af57afb3ca588ce216453c75e312d3df83846",
              attempt: 1,
            },
            {
              id: "0xff255ae37a8070f858a961ee286f6b22c31128aa3478fa631905289ac16fd9b4",
              attempt: 0,
            },
            {
              id: "0xffcdd3515a19dd86957d76f780b9d9c25583cc899137beb5b365546e5003c239",
              attempt: 1,
            },
            {
              id: "0xff262b2731dfd086c5337207dd0ef0a2f97fd429db5842ebcd54ac45d695065a",
              attempt: 0,
            },
            {
              id: "0xffcc99767f501a626fc28eb3481152cc406845bb9d292154ceaa2e200b2c9c71",
              attempt: 0,
            },
            {
              id: "0xff26315b0213c07d3380ff017545cf2e9ac9f348e7fd7724c0ddf8780f4fb0e4",
              attempt: 1,
            },
            {
              id: "0xffcc242ded9906c78da42a8eb11749c82f935c6ba4f9c37f4fa73b2254709bc4",
              attempt: 0,
            },
            {
              id: "0xff26855b7519729fbbd5d525ded78b92308ebb2acc11f595793997d358db2dc9",
              attempt: 1,
            },
            {
              id: "0xffcb90ee2338a0f094fced4290610165269efaca2f45d7b3b5d259c2a6076590",
              attempt: 0,
            },
            {
              id: "0xff26c0a0bc910befc6b28535e5bddfdc5c1760f3d75b852bc732a52756ed2e6a",
              attempt: 0,
            },
            {
              id: "0xffcb57837bcaa4fc72f78fdf34a17b1026ce6ff0811f09ec75bd5d949ce683dc",
              attempt: 0,
            },
            {
              id: "0xff289b183921e79792c56980fc134e0718de0b9c5178080ce3d95e22873ebefb",
              attempt: 1,
            },
            {
              id: "0xffcb4736729f39abfaf098ee39e56d2b0786a7d26de4888f5261c66bb9a93a34",
              attempt: 0,
            },
            {
              id: "0xff290a055e7d7d79b8f54cca07889205ced97a16c2949e9e7ff64d0b8c572fc3",
              attempt: 0,
            },
            {
              id: "0xffcb0828e3d769a6c997319c775e387c41280157d65fda2c9b997af84d7f90db",
              attempt: 0,
            },
            {
              id: "0xff298f144f4cc9600a2d383d0802f753390f8ea28c638fb0423949975df9b086",
              attempt: 0,
            },
            {
              id: "0xffca7fd74a78bcae9bd308bd89175d515c09d39a1f28dfad7b3008284d71db8d",
              attempt: 0,
            },
            {
              id: "0xff29d1931b6b381c2671c751e46fdef108db2c18527ab7cf3af1d4469cb239d9",
              attempt: 1,
            },
            {
              id: "0xffc9db4e7a250c67f2d98d2ec90fcfb464ad93aa403debb092e4a2d263f7dbf5",
              attempt: 0,
            },
            {
              id: "0xff2a2e3721113a73ef2b81d046df2ba6a0563875774827733c39e0ddcdc1a10f",
              attempt: 0,
            },
            {
              id: "0xffc9857a2ec9944d1bfb2711664ff1fbcd73c8ba0ce7fa7e928f290fc26903d0",
              attempt: 1,
            },
            {
              id: "0xff2a543be67720878d34455f26e69f830c741b4dfbf33cfcd4998b881a9c97bd",
              attempt: 0,
            },
            {
              id: "0xffc8ed6425f7c5caaa465639d0015ff2a14f621aa10fa2c51659ed0cffa89e25",
              attempt: 1,
            },
            {
              id: "0xff2a56acefadbc2bde7cb81ba12cffd6f11ea8403257cde77674689029f65d56",
              attempt: 1,
            },
            {
              id: "0xffc85bff9238199b58baa4215f4c7cdefffe68614e5438e94df20e896707c1ab",
              attempt: 0,
            },
            {
              id: "0xff2a7156fbd5500014c708b39ba7f27b2db72c8a03275b0290e11d71098feca5",
              attempt: 1,
            },
            {
              id: "0xffc826bc17b3aa383307eb828ee705ff18a6427117831620a0a36fec0ab5838f",
              attempt: 1,
            },
            {
              id: "0xff2c21f4fb079f01bbe57b3a88f0b7981ddca63760fc06595495c55cba70f55e",
              attempt: 0,
            },
            {
              id: "0xffc70d4e6271a27988e6c08bb4b853d838b701de8709f97124c791d93e008f85",
              attempt: 0,
            },
            {
              id: "0xff2c22d4f162d9a012c9319233da5d3e923cc5e1029b8f90e47249c9ab256b35",
              attempt: 1,
            },
            {
              id: "0xffc633be229eef543f4dfb522a9b8e33fe230c02dab7a035f9a725312a1df2c4",
              attempt: 1,
            },
            {
              id: "0xff2cd939f11c533115b3153cc4a3edb874fe1ead558fbcb13d597aad623fc7ab",
              attempt: 0,
            },
            {
              id: "0xffc6321f70fb9fbef0ccd60aedbd8b71f70670131a9201ad0909f86abe4a5fba",
              attempt: 1,
            },
            {
              id: "0xff2cdd54dbd6e505fd8d41b0edbe7600423ec017873566544e81ede2852859ff",
              attempt: 1,
            },
            {
              id: "0xffc630f43e588f30b9e31c3dea60ffb6d25be22b66e7052a43a3a7a1c7da793a",
              attempt: 1,
            },
            {
              id: "0xff2e7a913ddd2bea3eae65185fe96536c289f315e4e7c1584791913a8eb6a39f",
              attempt: 0,
            },
            {
              id: "0xffc49e74ea08407f6722adf59ca4e8c782ee0183beac232e02675863fc5fbbad",
              attempt: 0,
            },
            {
              id: "0xff2ef2b15c7459608c5bba4452967b1939e39aa8e8e47a9e3755b09ea573c566",
              attempt: 0,
            },
            {
              id: "0xffc4618d638da3f0aa019e3c52e9f3db9267f259580d9dd00b2ec66bbb030ab5",
              attempt: 0,
            },
            {
              id: "0xff2ef560a57daebb5b85dd9a0e485fd5832b41bf07985a026ea7720f4f76c7aa",
              attempt: 0,
            },
            {
              id: "0xffc1c7cc83e766d879c0548ee98a050aeb2fa81e402194f0de94fff95e253521",
              attempt: 1,
            },
            {
              id: "0xff2fa015b0d3862529591a023c435e5e3e1bd702b9e5c6d0c09cba90feab74e5",
              attempt: 0,
            },
            {
              id: "0xffc180757f4122e1804e88665222dbaf68ecd1999835042f11a1000f83124e28",
              attempt: 1,
            },
            {
              id: "0xff2fa6e0be52923a2b46622c5d8a8ff4233e7d410992e261fdf0499fad33f7ed",
              attempt: 0,
            },
            {
              id: "0xffc0e713546a31a66bb9faef8fa85747e7bfb560fea69aec87fcc3080c71a07d",
              attempt: 0,
            },
            {
              id: "0xff304c45cd2d308c76cb6666112b232778e9043a982665c67eb02678b6c9dc35",
              attempt: 0,
            },
            {
              id: "0xffbfd85ccec587eadd11efd14946f797dee3981418809478931e36f77563f6a9",
              attempt: 0,
            },
            {
              id: "0xff306eeb3501386cb9462e357d8574d0a51ab1a3904fcf6ad7fb516901bd90ff",
              attempt: 0,
            },
            {
              id: "0xffbf6888fa28e255fc2716e6dee3144ad3d43dbe8d40ff131248b89fecb2bac4",
              attempt: 0,
            },
            {
              id: "0xff309c421c31d0cfa7a25c6f5c393d55d213e54328aff536479bdf8839ed609a",
              attempt: 1,
            },
            {
              id: "0xffbf0fd4890ac929e0ce25bbcda9b9606d135710b24d45bb49ec23490d7b38ec",
              attempt: 1,
            },
            {
              id: "0xff30b9b18f000e2d67b09eac611eda5bbdef729872387b80d989a4f10f833c56",
              attempt: 1,
            },
            {
              id: "0xffbef0636d15057eb94cd9bbda1e5182b71b7f2faa361e9acb0097865d54289a",
              attempt: 0,
            },
            {
              id: "0xff3151a0181be7fe3f971fd8be24aa067be95bcad8ba6d5b5e9f7b3225b31227",
              attempt: 0,
            },
            {
              id: "0xffbeee00cf805f3d8aa62d43b721352f14a95633aa533284e460a1ab3a5f5fe2",
              attempt: 1,
            },
            {
              id: "0xff315c2d52a3b1a61d6f3c6e9730ca7c47aebbe4e3d66cf32953ecb953627e87",
              attempt: 0,
            },
            {
              id: "0xffbe42e2dd9a8d77ac9552c1db489aabe40b64c2d8bf1f9ddec54a061dbe3a7a",
              attempt: 0,
            },
            {
              id: "0xff315d5e6d58418d99944d15e44d02b980ae2361dca3d245f48ef1ebda3454da",
              attempt: 1,
            },
            {
              id: "0xffbe2ac4c34d4c7efe35fea8af776b384e2179e5f3bde0ad09d281a2754ad275",
              attempt: 0,
            },
            {
              id: "0xff3185cf1f499d9912f0c69ba613a9ddefed9b1aa6574291c31e3fa40c25ee9c",
              attempt: 1,
            },
            {
              id: "0xffbe226a62bb2bb295c442b68aac92e135c222bb2dbd48bf0f0addb6bc7a9f4e",
              attempt: 1,
            },
            {
              id: "0xff325bd9cbe7ab20cb57eeb704521d57cc74bd2dded7ab104496582863df9296",
              attempt: 0,
            },
            {
              id: "0xffbd04397fc65e669e50cd0bb5e79698f9fc1ffcfd76014bcd59dc74a4bd67a5",
              attempt: 1,
            },
            {
              id: "0xff32b8a1cbf1bedab700a5123bdec6671d9d600ce1b290b8bf36e0aa4c2ddaf9",
              attempt: 0,
            },
            {
              id: "0xffbc7bc7d9e9d82a18b817f81999b94b77e9923bbc5ca785f096756acfc384f0",
              attempt: 0,
            },
            {
              id: "0xff33f97f3d67a6a33bc96f5da99ec4bc747a331822144ef04c9fe024038a2660",
              attempt: 0,
            },
            {
              id: "0xffbbf9787f685e92a972cf045fceb0838fea005e4db8e29a80d8f0a70d859070",
              attempt: 0,
            },
            {
              id: "0xff34758e55d90800b8380b74dc1cef6062c77f7d179dc06fda984585cda5c565",
              attempt: 1,
            },
            {
              id: "0xffbb7022db9c5021577e9c1c59769d7ded559aff38ca6eea9e44e8cad7690f7d",
              attempt: 0,
            },
            {
              id: "0xff35889cffac5c03b5e72fc992145391e6f995b29f2960a6a3daba1944a00bdc",
              attempt: 0,
            },
            {
              id: "0xffbb3eb02c8f8cf6cf03346a72d733d4ca9b7e7e5dacc1afeddfb5697376c308",
              attempt: 1,
            },
            {
              id: "0xff3590c9e56b57f30314a6e565e074bef2cae0ef0ce168e95c25d0cd380d8751",
              attempt: 1,
            },
            {
              id: "0xffbab66ff01a2438e1c8c4815a7a591412097fa021b2e3db2d2047e1526f3038",
              attempt: 1,
            },
            {
              id: "0xff35d22f459d77ca4c0b0b5035869766d60d182b9716ab3e8879e066478899a8",
              attempt: 1,
            },
            {
              id: "0xffba31d848c6c5db8371a9e7e69c35e0df7f4cb3bb72394c22182857734987fc",
              attempt: 1,
            },
            {
              id: "0xff35fe90a740eaf87795735db0207f14b0d09e2e9ae1d295ce683bbb31a075b6",
              attempt: 0,
            },
            {
              id: "0xffba1d077eded3608cdf54c41c514c59b02aefe28af3e4e602f460626be42d3e",
              attempt: 0,
            },
            {
              id: "0xff364960abfa988b2ec1af13ee28818fe2e60310a3e10ffab76f0c2363fc9cb1",
              attempt: 1,
            },
            {
              id: "0xffb9f4a2a7119df3f6ed2a7a49e1d4d51b6004e924242d5188cbf05442e63b0e",
              attempt: 1,
            },
            {
              id: "0xff370f80d30a04281046ff0b1c6d468b842110affd205e2efde63ae1316549be",
              attempt: 1,
            },
            {
              id: "0xffb9a096eeb2da30d7154a35b538f71871927d3dfd86f49ee7024356d85eb5ed",
              attempt: 0,
            },
            {
              id: "0xff3712f636e00b81c7ad6a403a257fce353ff516ce26b15bf77a963ecf198a52",
              attempt: 0,
            },
            {
              id: "0xffb99a426a891eeccb9607212a29f090677d79cf9498933952c7d6839e98eb0c",
              attempt: 1,
            },
            {
              id: "0xff37a1e3302702ad690c7e1b496624e10c47ee7b4c382fc0d6ec546f54048ce5",
              attempt: 0,
            },
            {
              id: "0xffb9062567c977a2b897f8cbd547ce78fa3bd598ef1c6b5499e71229514fe3ed",
              attempt: 1,
            },
            {
              id: "0xff37d2f41e35d823c81f7d5a5a958a04ba4f49a2e76f10919cc937e1b5b42b3c",
              attempt: 0,
            },
            {
              id: "0xffb8a0d3f4a5d54416e0ab3fd57a10576223b90906fd6e56f2c8d1e9fff64ca0",
              attempt: 0,
            },
            {
              id: "0xff37ddc93c3476f25a031eac840c87bb5efa8afedb9532f9d3f3ff7538e16d5c",
              attempt: 1,
            },
            {
              id: "0xffb83cc37e1993c37b525810ac7d889682a4a5ac371bae12785582effe5a5b9b",
              attempt: 0,
            },
            {
              id: "0xff3899cde12c8ca59c2035b9784eeb227e267e719c95b84d62a058ba841698aa",
              attempt: 1,
            },
            {
              id: "0xffb7c72d6311ae6ba00bfb77f802f4e96f7dcd5a8d68ced6df94ee9a4a90e48c",
              attempt: 0,
            },
            {
              id: "0xff3902014ae9d30785409b8c5babba0c5bf8f3ab9468fda28ea612d1dea2e805",
              attempt: 1,
            },
            {
              id: "0xffb7a8b4dce1c4201565a8b8802ff9b9f067ab0437a9a438de3da408a2151a8a",
              attempt: 1,
            },
            {
              id: "0xff39778870a17056c27f25411584d8b73b1e3916f41de2dc1ede0e8bea8402e8",
              attempt: 1,
            },
            {
              id: "0xffb71082d4aafac42f8d26dbc5afa76002c0f2c9be9e8dcd0517f65abc660277",
              attempt: 1,
            },
            {
              id: "0xff398c4348b1a2f97dceff1fa6de8ac1c59bd2803cb3227b5148dbf98696de72",
              attempt: 1,
            },
            {
              id: "0xffb6ec0bb66c10479f12aad1e6aec04324d5adf4785571033377a23a3255371a",
              attempt: 0,
            },
            {
              id: "0xff39ac67931508f3563075add494f43179edf82e065a4b445b35fd22445d6fde",
              attempt: 0,
            },
            {
              id: "0xffb5e6fc1290ea699b3f2c98e99226212e6b7217a0f774e17697bf88d77fa2ff",
              attempt: 0,
            },
            {
              id: "0xff39adc2b49c0ca0d61e5c1fa235ada7c887e76a0c7bf9c0f329add7311960a2",
              attempt: 1,
            },
            {
              id: "0xffb5e2102001bf73faca4a23ce1b8541cfe37fafe30d85ef41db1d8da15ec26c",
              attempt: 0,
            },
            {
              id: "0xff3aa002391532a1d15605ea21b912df53f6a6993aca0f2cf784fee5cfc071c2",
              attempt: 0,
            },
            {
              id: "0xffb57e4ecd9d24fe2ce9e9c145b2bf67e1f52f914bb64f75661f7e4467a8e58c",
              attempt: 1,
            },
            {
              id: "0xff3ac0aa5f52fde1c6e44aa456b5890fdf94c178ee0aeca738a7bd451477c09a",
              attempt: 0,
            },
            {
              id: "0xffb545b90f14b221afe07235f947621c6808ae68fa6132cf63b46917f8cacde2",
              attempt: 0,
            },
            {
              id: "0xff3baeeb56b6ba3ec450cb237d2c4f980c7a5183cb9fb5bb754a83e1b0069951",
              attempt: 1,
            },
            {
              id: "0xffb531aa907c029ea208400711a3251bab1f92419d4a1843acf7fbe40d23752f",
              attempt: 1,
            },
            {
              id: "0xff3bbca22aca101dd3cd958a00c47f6577ee0b77857c2a5220288d2a52520df5",
              attempt: 0,
            },
            {
              id: "0xffb44904e64966b5b4c10a2f812620fef020162841553df7a9d5f515be24b416",
              attempt: 0,
            },
            {
              id: "0xff3c422b777bb1850775b21f3d428ff0cb00f6a55599aa170a4744a6dad80955",
              attempt: 1,
            },
            {
              id: "0xffb30db41b2ad0454d275dab0789b11dae3da31909566e0bfdad5dc992351cc2",
              attempt: 0,
            },
            {
              id: "0xff3cb1efcbd198ad2b25dbe68fd626dfcebe4fe9b630d0736494a430df8c5fb6",
              attempt: 1,
            },
            {
              id: "0xffb2f45459de7dd74cbbb351d72d735215663385885e423a0a580488153079b8",
              attempt: 1,
            },
            {
              id: "0xff3cbb4292464216ec23880e6ee202106d9d795660f2965006aa16f4fdee8b96",
              attempt: 1,
            },
            {
              id: "0xffb2b912f23512db38b3dd59666592c9ccf3dff40d191c4427fa827328f0329d",
              attempt: 0,
            },
            {
              id: "0xff3ced53fc60bc698460fd8e6343c76785a2852a5dccb7fcc3f2ef9600be7c0d",
              attempt: 1,
            },
            {
              id: "0xffb1aea139635b0cb592123491a7f08e2187b53eaf3a2ab81e26ab6b32f26363",
              attempt: 0,
            },
            {
              id: "0xff3d31b1417e1fd0dbf8ee64fbf5eb13e991324364bd7793ec9b1536a69da991",
              attempt: 0,
            },
            {
              id: "0xffb11724f054b5436c61df3450a6f2a1a3cbf36383f7f0c6ca07eb3128e9a900",
              attempt: 1,
            },
            {
              id: "0xff3d359c1aa80d8cd6f6b9e0d716dfaf2fb20a96893767ad62e1e41876973d4b",
              attempt: 1,
            },
            {
              id: "0xffb0f8c3ca3788b213aaa54e73e30eefffdc6963600b48269cc6cc4786ba6143",
              attempt: 0,
            },
            {
              id: "0xff3e78a68b9742e33f33a72eb42627ff3f361ef15e968072fe9ff4389a31fb99",
              attempt: 0,
            },
            {
              id: "0xffb09b15c314bdf20b0f4bc31be2c8ff98006c67bb5010d4ae5faa30793b411c",
              attempt: 0,
            },
            {
              id: "0xff3ecc8daf1610d68710d72d360a233a6174ec393bca74bafff3fc864a782d17",
              attempt: 1,
            },
            {
              id: "0xffb052f7df20b41069b0b2b25c57b7808ebcacb89c39fd9e31af09ab21be6548",
              attempt: 0,
            },
            {
              id: "0xff3edec78194b6c2738a7c7aa2e2952edc9848187b2a2d6468f07945a8986fa9",
              attempt: 0,
            },
            {
              id: "0xffaf798beced1619889eda73181528d8b260e442176faae2bb906970a6ec8e2e",
              attempt: 1,
            },
            {
              id: "0xff3f46ff8c2084d1ae2e2ea2165c86e7073a59ec74ad4b32db26f09739f4faea",
              attempt: 1,
            },
            {
              id: "0xffaf66484a4f385477c928b7b7bdba2f68cb6a86b24627eee6b5cdfc87949dfd",
              attempt: 0,
            },
            {
              id: "0xff3f97307405d98e2e38f1f1d42e4685a053435d6c70cf47f745d7ee8cf9ed29",
              attempt: 0,
            },
            {
              id: "0xffaf62b13795a2ca2da47d49e657e92c0459323356566bec199e146b9891e0b8",
              attempt: 0,
            },
            {
              id: "0xff3fb149c7cc02333660d61608db06337e7c239aa835a712ac5986594db58c4e",
              attempt: 0,
            },
            {
              id: "0xffae4b3a49f3c4b1a942ce403fe1ffed17a3e2058324498c477907fb764dc8b3",
              attempt: 1,
            },
            {
              id: "0xff404f33697b378fb347d8d1fc6d341468f19cf2aaf7a2daa21679e0e5b4c5df",
              attempt: 0,
            },
            {
              id: "0xffae4673ad9bfa3019b41174550b1cd7c4f21a1320fd14a958975e78f4cd88a3",
              attempt: 0,
            },
            {
              id: "0xff41698670a16ef08daa6be7ff6e0ea4353319bfeadd72a309caddef7cea154d",
              attempt: 0,
            },
            {
              id: "0xffac9a68c47e24287cfb054630e5b5d6013778933874336da167db9b97ed88b6",
              attempt: 1,
            },
            {
              id: "0xff416be467af312440c129867613049d435ba837f71091aa56cef7829440f18e",
              attempt: 1,
            },
            {
              id: "0xffac866c696e32727db35edf8a267e0c3de9bca7a03f9964ea4a1ed447ecacfc",
              attempt: 1,
            },
            {
              id: "0xff422f3699ea0f46360aea065a030e6aee5f0639b93c6efa2c51f6a2b2ad1151",
              attempt: 1,
            },
            {
              id: "0xffaa4e01069298bb5738fbd619a591f4c4a7e580eca5c933b866afacf55a49c8",
              attempt: 0,
            },
            {
              id: "0xff424efec2339ece3f2bab7ce5b4888133218f66431d16c4d58601066a0bdf97",
              attempt: 0,
            },
            {
              id: "0xffa9e59a82a3d70009c2e0e66bd03673c92c0e878fb479c49c461ab3e8c13968",
              attempt: 0,
            },
            {
              id: "0xff42c34bd79edaa96143c2fb37fa65fd304c65fc65e154cfc67468645c402f1b",
              attempt: 0,
            },
            {
              id: "0xffa9bfb16adbc3a424a58571e6b23109610383f49581ec6f141447787f346374",
              attempt: 0,
            },
            {
              id: "0xff42c36856bdb938c6af20868bc6584f50cf419d4e212ac50b02bfb6ac990bd6",
              attempt: 1,
            },
            {
              id: "0xffa984c66c5441fb26129a245be3a7bedec25f8a1a5157b216153e2527d3f108",
              attempt: 0,
            },
            {
              id: "0xff42dfe07cf9e06da8f5552c202160bd71959852d0182ca2026159a692c09375",
              attempt: 1,
            },
            {
              id: "0xffa956bbb26a8c280c897cccf3870f2fc05858fcf80588c736744270b82fa3f7",
              attempt: 0,
            },
            {
              id: "0xff43578b12e3a7d20f4fbb470fb9ab00e3ad9e7ad16addf8b4a318d4262ef5b9",
              attempt: 0,
            },
            {
              id: "0xffa782422e6808296547c73411ea75edee3567b06d324e6b9a2ed22fe0836e55",
              attempt: 0,
            },
            {
              id: "0xff43bde2a4f76387ab4d9d2b06b040a1360d7f07ddfceba750ede7e1f737cc7d",
              attempt: 1,
            },
            {
              id: "0xffa72a4c3c4e9cfd9d171528bd490e10a58e2015728cd3fb6098f64b9dad431a",
              attempt: 1,
            },
            {
              id: "0xff440ede2acc87e1b43e04812710ec38caa504c265cb058bee88763f8eedb205",
              attempt: 1,
            },
            {
              id: "0xffa6a5c167e196dd091b5f53b5e0ecbc8cfa1eae3577e6a4a53b69d7458b7f4e",
              attempt: 1,
            },
            {
              id: "0xff448ce6b2c232902f5ebef10dad2b69f44630694320feb313c9041bb7fbc026",
              attempt: 1,
            },
            {
              id: "0xffa5f2861c92ffb5a95e3a108886bcb85d54d88ade58e67ea78b08ae11f094dd",
              attempt: 0,
            },
            {
              id: "0xff4537ffe866b12df6a5c912255248ea5f83053798fa263492f1b8de28076729",
              attempt: 1,
            },
            {
              id: "0xffa5247c6d8201700396d75b11a570695315e3774ea36e52f2e1142334716282",
              attempt: 1,
            },
            {
              id: "0xff46ec44815bf9b53a1f81a81b1c42c83706567fb66561b3244f08755c2276c5",
              attempt: 0,
            },
            {
              id: "0xffa50118ac5c4ddf2e3c527cf97a23c1cc3a6ba9b9a664c78e7494226e899739",
              attempt: 1,
            },
            {
              id: "0xff472f51706ec4fb75c0c8b33a0eea613c3412577f0778fe3715f434872c7e1d",
              attempt: 1,
            },
            {
              id: "0xffa4f07f12c8540004668afb097c524c26f7c0d5706ad65aea396ad1489d58ba",
              attempt: 0,
            },
            {
              id: "0xff474d02728eea24c48331f4dab88351e40ef02190bca2fb7943f0c811228ff0",
              attempt: 0,
            },
            {
              id: "0xffa3d93acb8796463c9671cb2ca5eaa414630bbd9ebbf1f34bcbe8873e0b8953",
              attempt: 0,
            },
            {
              id: "0xff479a82d6ed3b2588bbb5c6a374280bb683eae471267203c0ee9cba6a7ed021",
              attempt: 1,
            },
            {
              id: "0xffa25ad0e7eff759f1aef542913207ddc4807fc32edb8b9926bf964f3f8bd1fc",
              attempt: 1,
            },
            {
              id: "0xff48db099c81431ff689edcaef0c8e0b5221ad1707eec7cf975aa60e763d6f74",
              attempt: 1,
            },
            {
              id: "0xffa21263b39237f0874720479f6418dac2f8fec3e4c6ff53fa2f702139f2360e",
              attempt: 1,
            },
            {
              id: "0xff49ef4a495038ee91862b3f37ec053a38dfd2e38f1bc4d3dd227b0ebe1b91f6",
              attempt: 0,
            },
            {
              id: "0xffa1b4b3094dde8d8ed022a0b4e5931d756fb4055cad2768e077f5ed718de083",
              attempt: 1,
            },
            {
              id: "0xff4a8df7eef283ebc39474875a6b140e8c92a56de43c3067cf7174d368f7f4f1",
              attempt: 1,
            },
            {
              id: "0xffa10e87535597f44b0e2dc7401b730625010895ab378b442273b1bc6ba8f5a0",
              attempt: 1,
            },
            {
              id: "0xff4b18d6ee74967357e646b218950a8a5ade6543d55a486a8fc0f83fe7ea42ee",
              attempt: 0,
            },
            {
              id: "0xffa0e88296b8ae3cc29341e9ac9e5f563d2c2f5451b9c4b57333cd6415b78a28",
              attempt: 1,
            },
            {
              id: "0xff4b49cc114f2c51d09c4c5c170ba4a430205bdb3352ff49db4937b83e0b1ce9",
              attempt: 1,
            },
            {
              id: "0xffa08e4d0c5190f01871e0569b6290b86760085d99f17eb4e7e6b58feb8d6249",
              attempt: 0,
            },
            {
              id: "0xff4cc8dcb91aa7fe2da0b925cb0341b877f4c4cdea5288557ea9cbfc2440d8ae",
              attempt: 0,
            },
            {
              id: "0xffa008a8603f7f8ed1eeae050db2535a8ca2e4fc2f9affb203988e777fb61f46",
              attempt: 1,
            },
            {
              id: "0xff4d1f2c397f38be47997efb260470816474344f6360953f8d8cf74c1cd47bcb",
              attempt: 0,
            },
            {
              id: "0xff9fa7cfd29c01ebd0398b7a2e4c60253cd87c19b02d04b38f957ff9374bcc65",
              attempt: 0,
            },
            {
              id: "0xff4db7874409f88ca12a2b3d87429128a70f40ecf527cc397cdef1ac92e806ea",
              attempt: 0,
            },
            {
              id: "0xff9f15a69816f8780722eb0c458ec2a52f3603d860d8e38afef4a02466c4aeda",
              attempt: 1,
            },
            {
              id: "0xff4dbacf064251eb6f3a2f51c7f4a02b7d485ca158b809456114a9523c3f3058",
              attempt: 1,
            },
            {
              id: "0xff9ee56c20374f0cd4255bd493b5be787203a6cda5031126ebbd122472aa7af0",
              attempt: 0,
            },
            {
              id: "0xff4dd1f211d408311d6d766e4394a41abac5264ebfd52dbf6eea02a49e5c38c8",
              attempt: 1,
            },
            {
              id: "0xff9ec2f3d3767c6b703a91a4a789e11ce13fe34475b5d489ee014832d2b73f4a",
              attempt: 1,
            },
            {
              id: "0xff4e2c1f9977d097801cd6cae498e3e012c9cf7d17838674350b051c3e008eea",
              attempt: 0,
            },
            {
              id: "0xff9eb1db12b9360794d31259738dfc2722b1066b12dccc76555f2ca2eb604954",
              attempt: 1,
            },
            {
              id: "0xff4e7369fd1e5b9a7f0814e32046aded3caa4ec45a62a4e98a99160b91b34b51",
              attempt: 0,
            },
            {
              id: "0xff9db4d1431f4d82953417f45ef7ff0af0340040554fd7df76a9be7b1dbc6f7e",
              attempt: 1,
            },
            {
              id: "0xff4f204620c30860ee4185b6dca5332860815abe4b1baaa9620cbf5e308d999e",
              attempt: 1,
            },
            {
              id: "0xff9d4eacb053932f891e12eaa92572d2c3f806c41ec2f3fe79aa7193765ff378",
              attempt: 1,
            },
            {
              id: "0xff4f268bbc4e4397ad51013bf8e5fd33154592a1ddf71b9b13254563bb8a4f7a",
              attempt: 0,
            },
            {
              id: "0xff9c5e3dcb55348010fcffbe753afadd05f930c537802dd87657ed18f2db03a1",
              attempt: 0,
            },
            {
              id: "0xff4f315916f163589b24ba4981feb1de620b116582263ca067ed3ac90607099a",
              attempt: 0,
            },
            {
              id: "0xff9a3e440c59d6c89d0d0b6758f56aa3a2e9f5a89aacc37dd2b5fe783ea72ec3",
              attempt: 1,
            },
            {
              id: "0xff4ff1e75a96373811ef77564cb105f58696f691ce48b7a3ae8ea8dec8c7661c",
              attempt: 1,
            },
            {
              id: "0xff99425912717de079a89b958274948c7056308ae920c899666e0cf3cfc0ffa1",
              attempt: 0,
            },
            {
              id: "0xff4ff931b1ceaefe23d6574ae1489dda5461b93e195c93fca4bd319db427f5e5",
              attempt: 1,
            },
            {
              id: "0xff98f8add3dad25d6303d5fdf285592b67fc7dbf3c4d7c0b8bb80445b2db247a",
              attempt: 0,
            },
            {
              id: "0xff5003306be969e40dc63a1a98aa12e981bc691a31d2dac299a3b701b6126938",
              attempt: 0,
            },
            {
              id: "0xff98afcbe1dc461b5cad3f7bd8452588350700cbc97414bda0c0bf525ad624f6",
              attempt: 0,
            },
            {
              id: "0xff50af6eb0c99bc0390f068687ee0f51e32340c16872da8c56427dd02c17aaa3",
              attempt: 1,
            },
            {
              id: "0xff98995faffd1c936252be898349c5f11205b017f5e80d984f87eeebee8ea3d3",
              attempt: 1,
            },
            {
              id: "0xff520f24c6479d733820117cc742d525cdefb9d170403c4cca39c7ffc7b353fd",
              attempt: 0,
            },
            {
              id: "0xff97ca9f99a692001485f69dd67e37c5a273b9449f094a074dc5093a6613583b",
              attempt: 0,
            },
            {
              id: "0xff5258eefbfe09ddd9d53f3c8b6c4eb796e6c30bc83d8673b11c255c515436de",
              attempt: 0,
            },
            {
              id: "0xff97b370e601f24d4aaadb3ad3816c6587b7fb5b1f55f6b9c0b96e01a28a8043",
              attempt: 0,
            },
            {
              id: "0xff525a9a372db4665cb7482ccca2ca0cc2763fe0c5ef72749d6836e4ecd10870",
              attempt: 0,
            },
            {
              id: "0xff978b11cd0b9bc16519fccb1003bc7b1f911d978719753dd84f4c89cb8039a0",
              attempt: 1,
            },
            {
              id: "0xff52c0943fbff2bb0fd9f401de79a072d54fdfb9f2593287681cd3d2842d50f5",
              attempt: 1,
            },
            {
              id: "0xff975143d98084e916479f9bd000541cba6ef487d735b1759020879563fcfc79",
              attempt: 0,
            },
            {
              id: "0xff52f75f0642ce5589167154fe760a84fb047418a871d5225fd1d66c53c4ebd1",
              attempt: 0,
            },
            {
              id: "0xff971fc765eea3748e8019fac646fdb004ec2c05e1d2775f4c68875a7d650958",
              attempt: 1,
            },
            {
              id: "0xff532a236c17707bc5bf7a3d4391d8f3343352ec2700b3b7c863dac1e5c6649b",
              attempt: 1,
            },
            {
              id: "0xff96d4992c1901179bcff23c0cb649ae98f6b878ab8961341d359944494874d0",
              attempt: 1,
            },
            {
              id: "0xff5370ab43557095f3e885e86f151bfc3bf45cc431987ad7267cb3bb2dd9feff",
              attempt: 0,
            },
            {
              id: "0xff96d0ca54be5c5817994b015a7616a9750e9ce7ca938f8797b5c20acc77cfa6",
              attempt: 1,
            },
            {
              id: "0xff54a5b169d381f72109048ba56b41dd547ba2ac6b0b838d60d675fdcdf53107",
              attempt: 1,
            },
            {
              id: "0xff95b6d09e8529386d9db1c9cae19418f169c193543adb5a11e6088dbd178a36",
              attempt: 1,
            },
            {
              id: "0xff54a95b70243c9efc0a9961a14feeebcf0de524d3a0081d03e9583cd2645a21",
              attempt: 0,
            },
            {
              id: "0xff945b8b12a8b8e0bebb51fde42b77555b614e07ad389daf5e5bc9a51d373d2e",
              attempt: 0,
            },
            {
              id: "0xff54d6f1a64c6787279baef2ff373ff49e2492469159758621988c2e85d68244",
              attempt: 1,
            },
            {
              id: "0xff945117791c8c2caad84ff3a50eda52e88b1ad2581709bf707505037faec081",
              attempt: 1,
            },
            {
              id: "0xff54e14be67f95a5737368651452a74f676409b77e7770ad20ff4e476023cae9",
              attempt: 0,
            },
            {
              id: "0xff931a34a8fc6be5614de6c382566f3b8ffc4824394c55970a10adf74b022c28",
              attempt: 0,
            },
            {
              id: "0xff55bc670f06e1496f4dff3a49cdd5d704699d70f2ee017bb11d3ca8b27decfa",
              attempt: 1,
            },
            {
              id: "0xff930cddafed1bbeedd8533b51b61fb5d9c89e6247f4b2d0224500d9f0efb109",
              attempt: 1,
            },
            {
              id: "0xff56648bffba6a8062abdfcdc3ee5380550f96796124c93f6e3850e50fd235b9",
              attempt: 0,
            },
            {
              id: "0xff92f55c7dc1623e3a3b59843bbb96629effb91531c58c9f7567c18c404f320f",
              attempt: 1,
            },
            {
              id: "0xff574ec2d34291b5b719aab610bde9dffd8313605af352ab30ca23ca23672596",
              attempt: 0,
            },
            {
              id: "0xff92c4770f38475ef9a10b0293929067b8ebfe8a9a874881dce29e8466aa6cca",
              attempt: 1,
            },
            {
              id: "0xff576dd1a93f478542464d6721bc6053cdd310f68241cf7f94864edc80d8f23b",
              attempt: 1,
            },
            {
              id: "0xff91fc96652a5051e4a6443c9d997e3fc086e286ef3d3037e6c4bf4dc4f989f1",
              attempt: 0,
            },
            {
              id: "0xff585690bc6a0640f32109f3120c799e50aa659e08b6eb67873bb7ba61ac2b4d",
              attempt: 0,
            },
            {
              id: "0xff91ca040bea6b28ed9f7b388ecd3e8b5afe19fec959bda94c6ea523aef0b300",
              attempt: 0,
            },
            {
              id: "0xff58763cf2f67a2ebd51cb858f85ca46770bba4a190e222c1a25fc65edb35c3f",
              attempt: 1,
            },
            {
              id: "0xff91157c013c6a263925564b4cec334a6c66a56b111172b15586cbf0a5ac8ff1",
              attempt: 0,
            },
            {
              id: "0xff58e5aedda20aa45293fa3aa64722c13ea3d18adc8e952728739e450ef2023b",
              attempt: 0,
            },
            {
              id: "0xff906d9295c9db80cbf807b3745d3f1677b81f576f73530cf7b9b7cef5bc64eb",
              attempt: 0,
            },
            {
              id: "0xff591366d961d6a34900f16dc8d58fd713f50f392b055920e90c037fa8a38e18",
              attempt: 1,
            },
            {
              id: "0xff905920371ec5f99176f13c5d5010758493c830fe520e97cc4f9d66d80b3efe",
              attempt: 0,
            },
            {
              id: "0xff595c46ced76c5c9dde4f611c922ed9b7b62d41298d34032ae5df93ac1937ce",
              attempt: 0,
            },
            {
              id: "0xff9036dbcaad439c532ba16d8fb2d32571abc35e2dba5d06519ab14b8e4a22d5",
              attempt: 0,
            },
            {
              id: "0xff5a0e2477b64aa280caed921f90bddb00e7ab2ee739855470661c99d1a0d2ac",
              attempt: 0,
            },
            {
              id: "0xff8fc625d098e6e5cb71c3b051691971ef62b6018032d1c5a0f2846f0a582786",
              attempt: 1,
            },
            {
              id: "0xff5a60a11f97b534c90e99eb0de01d8577f6f005815f3e4a5b41b1a4d7efe7f9",
              attempt: 0,
            },
            {
              id: "0xff8f8b55945d60de50bddf334b13957c64b7754517089e8ee0b6781457012f59",
              attempt: 0,
            },
            {
              id: "0xff5ac3ec38bb16ae168a5fc25a8702bc65a6d9cd09f6896e1dc28499e2b18da8",
              attempt: 1,
            },
            {
              id: "0xff8f29db76cf4e676e4fc9b17040312debedafcd5637fb3c7badd2cddce6a445",
              attempt: 1,
            },
            {
              id: "0xff5b89fe7e7cd16dea4e1981b4f75e0a02b896ad4d30d2200daf82d8956ba8af",
              attempt: 1,
            },
            {
              id: "0xff8ed5e59ac90e0c45ea52aae77560d1f9e821267f9777266cd9d9208d67d4a9",
              attempt: 0,
            },
            {
              id: "0xff5c08b4d0ab7182c56df6bb664f2352e9bc188bb9ca9ce039e2c5801d1d308a",
              attempt: 0,
            },
            {
              id: "0xff8e06abed94ee74ce798946289054362dadf9572039cd1b8ca6fde48421cd49",
              attempt: 1,
            },
            {
              id: "0xff5ec073f5601b31a26f5a82effe8a98825c64d9ea31e37bf362ef38200c1792",
              attempt: 1,
            },
            {
              id: "0xff8df6a0072c0c3fdbdf2824e4832f066ccc41b3fe7374dcae8554e867591091",
              attempt: 1,
            },
            {
              id: "0xff5ee3461083e29ae59822c61daf4cd47ae880c7577e2f15c4f7f6851d17091f",
              attempt: 0,
            },
            {
              id: "0xff8da549a0dac0db2dba63ceebd6db4c99f3ea6819a6abe6f4dbd783c04d88d8",
              attempt: 0,
            },
            {
              id: "0xff5ef16a7ed8848576d79b4011f598987f4a5b154cbc1fb30975903a23b95278",
              attempt: 1,
            },
            {
              id: "0xff8d95c0092ecff2fbc571ed73050d45b15cc075be5038a9544a3d83548bd10c",
              attempt: 0,
            },
            {
              id: "0xff5ef23d558be56294e2dffc03dba68ec65140bc1041fd217e0c2adfa69131b0",
              attempt: 0,
            },
            {
              id: "0xff8d5dd29557f28530ece4d8a56e24edb98805c24ffe72008b7155753b7ebdcd",
              attempt: 1,
            },
            {
              id: "0xff608ae75cd9217e8e345e916ddcff0e4d1fe07a5c52434ee86bfde482a93c45",
              attempt: 1,
            },
            {
              id: "0xff8b6d83dcfd8a198f41376ec1daed52743927e62dd1657a37b1f55ea537f20e",
              attempt: 0,
            },
            {
              id: "0xff60dc9517c2499990d10d03bc1f8f167be2da75f385191e2860b1bf1cbf8d2b",
              attempt: 1,
            },
            {
              id: "0xff8b2550593c4186c0b349d76d897fc05dc5edf65f018c4cfe3903c5e063ecf7",
              attempt: 1,
            },
            {
              id: "0xff627a8ccec181f0343b6c4d79c7cebed68612f1645d2342ac687e56b5b6a8c3",
              attempt: 1,
            },
            {
              id: "0xff8b0b5695b3064a8e25bfd50a3d802c5da45c61721d7864b978b7da30431071",
              attempt: 0,
            },
            {
              id: "0xff634b9bc9031ba1617a827f1d51785c25bf5164692257ccbbfd3c5d2918c30d",
              attempt: 0,
            },
            {
              id: "0xff8a650e24e95e7ac2068f85b2d115be4fb7b8294aeaf4f62ef40de7e1ac0ac0",
              attempt: 0,
            },
            {
              id: "0xff647199b419deb0f846f9092169019d880070b18fbdd992dfc6110241a304e1",
              attempt: 0,
            },
            {
              id: "0xff89b5315ed656721dce8c328e6ef6f272f989220d7cd1092c5af5c024eba604",
              attempt: 0,
            },
            {
              id: "0xff64776c368c94e889e36b59739055524ba64af5054c63a14a3a4d92f4021acb",
              attempt: 1,
            },
            {
              id: "0xff892303697e6d4e9d948ebba8d9f1ecaf2b0de86ef8fdffa32e33bd63ca9c1c",
              attempt: 0,
            },
            {
              id: "0xff6549b98f853e175cbf9741ede2e85defaf41f8b6ef32a24fa5f09be84e44fb",
              attempt: 1,
            },
            {
              id: "0xff89076285a814d70760b5de6c9117e38fe77aa9e097368ebab9d4f217491e10",
              attempt: 0,
            },
            {
              id: "0xff659950805e5cb5e14773374e8c01cc6d9be1312d78ac85985fcf0469f66693",
              attempt: 0,
            },
            {
              id: "0xff88bd2aac3420aa35516d9947b571275b8d8cbec081245d0e2e06000b3fa4e5",
              attempt: 0,
            },
            {
              id: "0xff660cb50912d86a4ec527cd5af973233d7f9bdee7361bf7fadfdf1243bfe438",
              attempt: 0,
            },
            {
              id: "0xff886f1b56565fb2455e0b7d890eb674e01679dab480319320607e03c2189128",
              attempt: 0,
            },
            {
              id: "0xff6628637d22ecfdf296c070974a949100a0abe3844307365d2ec9da5ad58957",
              attempt: 0,
            },
            {
              id: "0xff883ed7002e6548895ac924a0b304c6b15e60bba471a7a11818b82b9c470b7e",
              attempt: 0,
            },
            {
              id: "0xff67324a1c3a65f6b0c358db3fbcfcdb4ea035de0999d9f7fbf269c5569176bb",
              attempt: 1,
            },
            {
              id: "0xff87c1240c27baf7cf43adf9a2a9a7b992bf70682609d846c66e042c1ea4d731",
              attempt: 1,
            },
            {
              id: "0xff676a22cf923c615248d37df6dba9c8c184f305dc40fd3dde801504eafe250c",
              attempt: 0,
            },
            {
              id: "0xff86f473a1ffe6dadbcdacf5fea46d9a36388399fb61e621918b2a517e521ade",
              attempt: 0,
            },
            {
              id: "0xff67a37043c026310ad790eb488e94251ecc401dd7217092c61e59f4bef39af7",
              attempt: 1,
            },
            {
              id: "0xff86b24023f38c8f595dcb48880e9673e1e0434d601f1e8871ed60a8acda154d",
              attempt: 1,
            },
            {
              id: "0xff67bb116b12b85f545e61de27d0dbf7cfaa09df5b50e7ee7487cc85a720211c",
              attempt: 0,
            },
            {
              id: "0xff858e847aa56bbccf1d0cbff3fae6aafe0a362b33e8c3138e2b8905113a382b",
              attempt: 0,
            },
            {
              id: "0xff67bfd863b12fd832dff90379377b0183ee8b79ce0b5d9b7b23de8dced54744",
              attempt: 0,
            },
            {
              id: "0xff856cb5ae12a2894083db901119ee630c3cd37725716a98a446a3f2476ecd73",
              attempt: 0,
            },
            {
              id: "0xff681f8ee2b9bd28df7af7445a589052965b60c4d89d13269b483aafd0ea9db6",
              attempt: 1,
            },
            {
              id: "0xff856a865d01bb1fda19894aeaf016887d01b7a23b99762d9cd23418dbd6c79e",
              attempt: 1,
            },
            {
              id: "0xff68425aea2858a862f24791d4c42d77c1dd2a536e9165c003c324a2351c406f",
              attempt: 0,
            },
            {
              id: "0xff847d6014d10022430143bbc7627ff0fc1da8dfeeabe44310d11f2613b96b60",
              attempt: 1,
            },
            {
              id: "0xff6843670503ac4135553faab2c528b501115228193cd4b8798dd4f783b8ac84",
              attempt: 1,
            },
            {
              id: "0xff84540c2d4d81b18e456911bb022cf028dbe94afb5fd3ba7cb458e322dc9499",
              attempt: 1,
            },
            {
              id: "0xff68a18dde7eb682dafa880806aba8df888a8653fa0b0bf4f0f90cb69f49f1d9",
              attempt: 0,
            },
            {
              id: "0xff8432fa84498ec52d45eaf80a52b743138b639bd7f65beff5f21ae13302cabf",
              attempt: 0,
            },
            {
              id: "0xff68d40d9d31362d14c55fff3844ca824aa7522b5adeabadd89be0c963fd99e2",
              attempt: 1,
            },
            {
              id: "0xff8241c9f9f5251d0ef634dbe0a0900c95c5421a8a5d35b535220f6dc496ccbb",
              attempt: 0,
            },
            {
              id: "0xff693b723acd0b461f007249a9b435a5d23ec9dd0d6faaf6ff9ded51e2f92173",
              attempt: 0,
            },
            {
              id: "0xff820c68189da48293553b1cd7465cf7f75ac3bf2db9172f5f9ddebf3d10ad85",
              attempt: 1,
            },
            {
              id: "0xff69755d419ef9a3121867f5bc205dd38c80832747d0aa378fec655ab66f9423",
              attempt: 1,
            },
            {
              id: "0xff81c3d1d3078efa6bcabd637aa1706a13a42c65ba4823c054d6217c428379eb",
              attempt: 1,
            },
            {
              id: "0xff6a197f5ad9624410c418df1b2769f3c5fbc9332bf220b53dee02d44566278f",
              attempt: 1,
            },
            {
              id: "0xff80f02d123e6c94aefd66428b8ade963efd6048708bd22430380147421dcf77",
              attempt: 0,
            },
            {
              id: "0xff6a6c321f73f447e61596883d7c170bd17605c1768ee6a30efe19f494dd04f8",
              attempt: 1,
            },
            {
              id: "0xff8025e8bcda90dbd794c00ee461f211834a945f2abc4cfb88a1cda74f8af724",
              attempt: 0,
            },
            {
              id: "0xff6a7b4029d2b7b7dab19cdf8d6ff7f29f3703e44c3158cca5e055b33542c376",
              attempt: 1,
            },
            {
              id: "0xff801da393722fedca6acb421799c9a9f7b8a9b0daac1457216c5cb39ca2a4ab",
              attempt: 0,
            },
            {
              id: "0xff6aa8ff480017722b0570454fbb49f2a157edba22a418bc557069bdcb4fcce1",
              attempt: 0,
            },
            {
              id: "0xff7fba24299e836d4d3467b664ad1de5592563359285864805b3a05ea0ed3ac8",
              attempt: 0,
            },
            {
              id: "0xff6ab912a1e47143495913d4b663adad6cb251506d983405bc5cee44e624288b",
              attempt: 1,
            },
            {
              id: "0xff7fa211f0d94731cbde044631eceedfea5fa85b64e3c0e7107fbb96172423fe",
              attempt: 1,
            },
            {
              id: "0xff6aeb7f843e19d1726624e580b6257a75bad838d226eb5084516dc6398483dc",
              attempt: 1,
            },
            {
              id: "0xff7f79e09b01d7fce8958cd6d5308baf38c6ed9a48d8846b431274f405d2a76b",
              attempt: 0,
            },
            {
              id: "0xff6b397901605eef0229e0598759a8984f13c8d62b040e194fc5da975fd7d26e",
              attempt: 1,
            },
            {
              id: "0xff7f6a27829e48462e828dc57f3fd1ca4dd64546dd61fdb2b8cb7b5f1a9d7b2c",
              attempt: 0,
            },
            {
              id: "0xff6b506c81ab8b18d3bc627000c501fe210f83ed5288537b68ba0aee5f5d496e",
              attempt: 1,
            },
            {
              id: "0xff7df954ee46ac7f33f28d11bd62469e3b00a4e2db35da5d0fd85d7953f7f2d3",
              attempt: 0,
            },
            {
              id: "0xff6b785b3a733da22b943ea7fab3ac205987fd119dbc2e917d4f957155a1be61",
              attempt: 1,
            },
            {
              id: "0xff7c865623fdacdc8e08c8285f80ce83144cf7a1f5205f8c0bf6865d224af476",
              attempt: 0,
            },
            {
              id: "0xff6c6f47a33993f424d7f90af12e9b44fa744a9d63a637fd3680da61c40ae20f",
              attempt: 0,
            },
            {
              id: "0xff7c3cd002db6840f1817c267d6453364532efc66407cd6b34fb4caf138bb72b",
              attempt: 1,
            },
            {
              id: "0xff6d31e40c02e4541f0e136fe519e36a1250de6e76ac298a23aea5211d660a9a",
              attempt: 1,
            },
            {
              id: "0xff7bd3172c2537ef0823e6291ca3ddc2bc55e3b78b1564719de2dc48504a4213",
              attempt: 1,
            },
            {
              id: "0xff6d4a96a0fbc61bb96609152d98cc392154b180ad7bff8d24d867d8014ecbed",
              attempt: 1,
            },
            {
              id: "0xff7b9de77ebe5d920c5dce8ef25958443c4aeceeb9b6f1665100aaee04abefa6",
              attempt: 0,
            },
            {
              id: "0xff6dec7e44ded6d4bb339a486e81f3735bd3a3bb81923ca6c7505ee87484ffbc",
              attempt: 0,
            },
            {
              id: "0xff7b6d6318b91b1f558e808647fcf30df37dc9c2338e4c48a0800c559d8f8ef4",
              attempt: 0,
            },
            {
              id: "0xff6e861c739b4ecb4279b29c351af909fe698baaad09fe734cb54f4f12759bdf",
              attempt: 0,
            },
            {
              id: "0xff7b23680ffd9d76bc8089eea78b2631cc644f92f0319b4879122ede6c999832",
              attempt: 0,
            },
            {
              id: "0xff6f0921a8df98071bbc7a149ea797beb2966fe081ac2ad7dcd9e28035a809df",
              attempt: 1,
            },
            {
              id: "0xff7b1daa41efe9f6b236ecc264fd22023f5972f9a4726745871e04009893ff00",
              attempt: 1,
            },
            {
              id: "0xff700065822674599e0aa2825f9086d3ca3caf30532a10c5128f616368aa772f",
              attempt: 0,
            },
            {
              id: "0xff7ae780d6a25bb1d76b40bc10765c4925a7afcc99040f3f973f239f9ef94b84",
              attempt: 0,
            },
            {
              id: "0xff7099d010f84eaf6d3017a98479665905ae32dea61fc0594f947ba0f7088749",
              attempt: 0,
            },
            {
              id: "0xff7a8487f0850398dedcf85130fb5b89580cbe9a634d111ba98b3ead6c994263",
              attempt: 0,
            },
            {
              id: "0xff70c220c6aaaf989bcee0c4bef5b469f0edb0def6ea1410a33b42d4c57a0344",
              attempt: 1,
            },
            {
              id: "0xff7a67fa519e927d6ac18e94fd53756eb771d8d7a29217d0c1acf10d32ab2879",
              attempt: 0,
            },
            {
              id: "0xff70f2d45e3868ec60adc71249133a093368c3c9bb20a490dbb6b90232767762",
              attempt: 1,
            },
            {
              id: "0xff79ae234598c0a09cf3f130970d8c744ead017477a80d3bf3834eecdfcdd335",
              attempt: 1,
            },
            {
              id: "0xff713be15d8e84323504dc7b057a8c68a7ed46ab821dcdf48785547b7731056e",
              attempt: 1,
            },
            {
              id: "0xff79834f500e8bf194b02b280fbb22799a55d786ef79d54f908b059cec39b822",
              attempt: 0,
            },
            {
              id: "0xff71cf41c6af89512469f0c97830ac1f62c71f8c8423b469fa6ddf70a6dfbc03",
              attempt: 1,
            },
            {
              id: "0xff794b054444c26b60ef77b5b85ec73721474b81c1dbd12698e7b6b8e66b934a",
              attempt: 0,
            },
            {
              id: "0xff71dccd7b507f90bd44e9e1e96d39481278657ba4011aca903f883e6242b0c5",
              attempt: 0,
            },
            {
              id: "0xff790669dce21d9f839f115623158f57fa860f7d9007b21c4e12ea722151a58a",
              attempt: 1,
            },
            {
              id: "0xff7353c0edbb420e054eff5a0f05b3e0e99e852393f449c854057527a312fc3c",
              attempt: 0,
            },
            {
              id: "0xff779d8b2f493835e9a1ac436ab8ad0bda8e9c908a953e005146dddb614af1c5",
              attempt: 0,
            },
            {
              id: "0xff742c257185327b00b58bed580bbab45adf774d85b33bb08e9817f4cb7313a4",
              attempt: 1,
            },
            {
              id: "0xff771f6764dea85ebd87f7634569f97071ebe4bfa4d778afb3467526f77be01e",
              attempt: 1,
            },
            {
              id: "0xff749ee7e737b29ebde5cca9ae02ffddcbec8efd2dd0cee0eeb1329958b20fdf",
              attempt: 1,
            },
            {
              id: "0xff76c2ce505d04c9eb3318c5247cb9b997b1bd17f423cef6255bd018e2d3daef",
              attempt: 1,
            },
            {
              id: "0xff7578a45cc5d4a6e6ad0b59905a85e08527c2b1420604e157772e7bf02c2672",
              attempt: 0,
            },
            {
              id: "0xff76a9de231b1be4dcf3d7ff49ec9425245a2551479b58d16652e5b9d7fa6795",
              attempt: 1,
            },
          ],
        };

        const gamma = GammaSImpl.fromJSON(origJSON);
        expect(gamma.isFallback()).toBe(false);

        const json = gamma.toJSON();
        expect(json).toEqual(origJSON);

        // try to encode and redecode to binary
        const encoded = GammaSImpl.decode(gamma.toBinary());
        expect(encoded.value.toJSON()).toEqual(origJSON);
      });
    });
  });
}
