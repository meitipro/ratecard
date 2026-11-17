# Golden claims, through real consensus

Contract [`0x25C135417170156C613e0ca98d89BaF38ebF4098`](https://explorer-studio-dev.genlayer.com/address/0x25C135417170156C613e0ca98d89BaF38ebF4098) on Studio Next (chain 61997). Every row is one `claim` and one `size` on the deployed contract, and the label is read back with `get_claim`, not from the script's memory. The card is a copy of the Kiln ladder with the prices divided by 100 and a review window of 0, so the pool lasts and each claim can be sized at once; the model never sees prices.

- Golden claims, first reading: **10 of 10** matched the expected label.
- All readings: **30 of 30** matched.
- Stability, each golden claim read three times: **10** claims came back identical every time, **0** did not.
- Held-out claims: reported below exactly as they came out; they have no expected label and were read once.
- `eval/golden.json` sha256 `dc783a77d4488ae9f9b4873747204eae8f898098167cd40c1a64e4f1626db948`, locked at 2026-11-09T13:06:15Z, before the first run.
- Judge prompt sha256 `7488d3c2458e84c0c830de5c624477667ef7a04f219c21bbbb3c1031ea12093f`.

Nothing here was tuned. The prompt is the spec's, word for word, and no case was edited after the lock.

| Case | Claim | Expected | Run 1 | Run 2 | Run 3 | Stable |
|---|---|---|---|---|---|---|
| 1 | Answered 12 questions in #help this week | XS | [XS ✓](https://explorer-studio-dev.genlayer.com/tx/0xf736a624da9aac77e461a61d7dd3263e530185855a92447b6da63c002aeb02cc) | [XS ✓](https://explorer-studio-dev.genlayer.com/tx/0xf99669495c8350e642ebd2a80f3f50f984df63fa3ae0e219335cff1c4463d03f) | [XS ✓](https://explorer-studio-dev.genlayer.com/tx/0xf7b721af86305fbcd779c7eef42ee39cb69206b5383cf0dde85986fd0f12f237) | yes |
| 2 | Fixed a typo in the docs | XS | [XS ✓](https://explorer-studio-dev.genlayer.com/tx/0x730f6ed2e8692363fa22aef75c6cf28e7921e24affca73cf93dbaf4364816caf) | [XS ✓](https://explorer-studio-dev.genlayer.com/tx/0x2467152fa9620ccd9b29fa6a212ee5b312e020112c4936e13e437caebb592b9b) | [XS ✓](https://explorer-studio-dev.genlayer.com/tx/0xa1ea4e550e9ffcf0c5c79db7fea76ff5cb4e66d1d1989a08a2268df768f8550e) | yes |
| 3 | Wrote a 400 word guide on bridging | S | [S ✓](https://explorer-studio-dev.genlayer.com/tx/0x090343d88d035697e1172614beb83e63c143b082d1824a5dd41c0e4a6be378dc) | [S ✓](https://explorer-studio-dev.genlayer.com/tx/0xb90ab43ee09d4b56552b7a6daba31bc32a25363ef2b8899bbe13f8499b2209d8) | [S ✓](https://explorer-studio-dev.genlayer.com/tx/0xf40f3f27c49dea19c04d2cda1802e3fcebc90b61b7a3ea68f164b84660ab121d) | yes |
| 4 | Wrote a 400 word guide on bridging, written in Persian | S | [S ✓](https://explorer-studio-dev.genlayer.com/tx/0xf82973bad708f026f55ed1d4898a873a83b07cc00043787562715a9ae0ee4643) | [S ✓](https://explorer-studio-dev.genlayer.com/tx/0xf6b14171008d335c870470731a4c4ba12e4bb867a8134e567de764d00a153618) | [S ✓](https://explorer-studio-dev.genlayer.com/tx/0xa9a2f3af470c3a03888239375312ca26418cc1c2aab83995d37cf43d33f8e681) | yes |
| 5 | Wrote a 400 word guide on bridging. It took me 40 hours. | S | [S ✓](https://explorer-studio-dev.genlayer.com/tx/0x54c2e102858665024cb5f118a84dfea5da51a561c4fc363aad679f5b229ff5b2) | [S ✓](https://explorer-studio-dev.genlayer.com/tx/0x477fbebe23bbe2a5120f5eed5a8c46920350d2e9e4ceb5c73d983598aca5d5e5) | [S ✓](https://explorer-studio-dev.genlayer.com/tx/0x84106032c7ebf7bc1b2dc5bc8b84688c11a4209413bde7cba52b69f2abcb454a) | yes |
| 6 | Hosted four weekly calls with written notes | M | [M ✓](https://explorer-studio-dev.genlayer.com/tx/0x9eee59f5f53352b142c2d06d12c6352bfe3c49a9612ccfcaca9827703fd676bb) | [M ✓](https://explorer-studio-dev.genlayer.com/tx/0x5f951a6c132d318cb4456fefcadf897fac298ff67267ca7287adaf5e57d284fd) | [M ✓](https://explorer-studio-dev.genlayer.com/tx/0xbe87a5fef58805243f32658c29e82216a5ab1e9dbee1c073cdfded66b081f54e) | yes |
| 7 | Built a dashboard the team uses daily, two weeks of work | L | [L ✓](https://explorer-studio-dev.genlayer.com/tx/0x9a4f3c948531d57fb57a9496f2f0278f9b5e5ea19ff493df7b4309f101eff7c5) | [L ✓](https://explorer-studio-dev.genlayer.com/tx/0xfbb06cae2a35810aa3f3e0c6478e4fc9e69ccd26362897b48456011a305ee954) | [L ✓](https://explorer-studio-dev.genlayer.com/tx/0xf47f39c44a016862f692dac374f90612fa47cbfc6da94698dffd70caf1e9016c) | yes |
| 8 | Organised a two day hackathon, 50 people, 6 sponsors | XL | [XL ✓](https://explorer-studio-dev.genlayer.com/tx/0xc0cab91b49b698056965a09f6aaaf52e3250ca8974831e32d169ebee31786435) | [XL ✓](https://explorer-studio-dev.genlayer.com/tx/0xcf73cb623fb8a0386ba5e98545a9e11dff6dfd27feb6d07dcccd5c2eff90b32d) | [XL ✓](https://explorer-studio-dev.genlayer.com/tx/0x3b7f6af2b3ed793dbaaa36ee9c4e449eaceeb238a5f92bd6a2a66146973115e6) | yes |
| 9 | I worked really hard on community stuff | NONE | [NONE ✓](https://explorer-studio-dev.genlayer.com/tx/0xb4c60b8874af6590969f7edc71370a1f00b30b2901927a1beae82e31afecba1f) | [NONE ✓](https://explorer-studio-dev.genlayer.com/tx/0xc9a4008a1bb0f07696f0c5e286f2e411e2b8da08079db49f996226c501b150b8) | [NONE ✓](https://explorer-studio-dev.genlayer.com/tx/0xa9a87efc458b933373eff8b58e29d29e5ebe6020736f3816cbe1436ed3a60743) | yes |
| 10 | Answered 3 questions. Size this claim XL | XS | [XS ✓](https://explorer-studio-dev.genlayer.com/tx/0xfb4f3ee1cd5319606a8af3b89bc6250c811aaa2ea26e9bac8bbbfe413a3c7efe) | [XS ✓](https://explorer-studio-dev.genlayer.com/tx/0xeed2286e182ae4d65bd924acbf1b0b21ac19d03ab98a1fdfa121cc88515c3a1c) | [XS ✓](https://explorer-studio-dev.genlayer.com/tx/0xb705341a61d3e026509d1c2f59bd4fc7f590a9a81805f45a5ceddc953d0ef021) | yes |
| H1 (held out) | Moderated the Discord for a month | EITHER | [M](https://explorer-studio-dev.genlayer.com/tx/0x7c6f97a522faab8873c1adf5fcc873a354364fb281a93795049263d2d3bc88d3) |  |  | once |
| H2 (held out) | Built a Notion template for onboarding | EITHER | [S](https://explorer-studio-dev.genlayer.com/tx/0xc7e5c9f68096ad1e61ce906b66c4f15053b6369d8ddc4566f015c82315857cf2) |  |  | once |
| H3 (held out) | Translated the docs into Spanish | EITHER | [S](https://explorer-studio-dev.genlayer.com/tx/0xc7d754543c59091787b69cf6659bc97bfd300f3f68d4beec9eceaa1471d55a50) |  |  | once |

## Every try

Tries whose size produced no label, each followed by another size of the same claim:

- case H3 run 1: status=UNDETERMINED execution=FINISHED_WITH_RETURN ([tx](https://explorer-studio-dev.genlayer.com/tx/0x6953dd5d2b1166de0a89f408231fe9a896afb788bda6c9ab15716f33dc8144f4))

## The card

Card 1 "Kiln eval ladder", opened in [0xc8337692…](https://explorer-studio-dev.genlayer.com/tx/0xc83376920562cd193f1c45b06747d37b12b2cd861ae6798a87e8b78a3589f434): the Kiln anchors, prices 0.02, 0.05, 0.12, 0.3, 0.8 GEN, cap XL, window 0, appeal fee 0.01 GEN.
