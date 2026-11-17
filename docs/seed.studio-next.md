# Seed

Written by `python scripts/seed.py` against the Ratecard contract [`0x25C135417170156C613e0ca98d89BaF38ebF4098`](https://explorer-studio-dev.genlayer.com/address/0x25C135417170156C613e0ca98d89BaF38ebF4098) on Studio Next. Every label below was produced by the deployed judge through real consensus, and the script recorded what the contract said, not what was hoped.

The teams (Kiln) and the people are fictional and exist only for this demonstration. The accounts are test accounts.

## Claims

| Claim | Card | Result | First reading | Second reading | Pay | Filed | Sized |
|---|---|---|---|---|---|---|---|
| dee (37) | Kiln contributors | **VETOED** | – | – | 0.0 GEN | [0xc525b493…](https://explorer-studio-dev.genlayer.com/tx/0xc525b4937e48df1aeef14611663a2a244b601be7501ef4a4cbcbc9cac3548011) | [0x8823f558…](https://explorer-studio-dev.genlayer.com/tx/0x8823f558bed995451bd645bbf00b1c59c34ed398c95240b6bf13ca180ba63553) |
| ed (38) | Kiln interns (cap M) | **CAPPED** | XL | – | 12.0 GEN | [0x0a40357e…](https://explorer-studio-dev.genlayer.com/tx/0x0a40357ee782b1dff71cb75022d6f02e6f7c32355a8fb376424a29fed9a296a3) | [0x9ec9ce8a…](https://explorer-studio-dev.genlayer.com/tx/0x9ec9ce8ae26f83f1352c79d23382d963daa40bdc09347acb01883bf633787986) |
| ada (34) | Kiln contributors | **SIZED** | XS | – | 2.0 GEN | [0xcffaee02…](https://explorer-studio-dev.genlayer.com/tx/0xcffaee0226e666248f7fb72574342847a90a4beff41c1569010912f880b18d5d) | [0x839f12ee…](https://explorer-studio-dev.genlayer.com/tx/0x839f12ee7d85b94651d08f44fca86c763b55d84b780d94ec580b37615d57661b) |
| bo (35) | Kiln contributors | **SIZED** | M | M | 12.0 GEN | [0xe4f9d584…](https://explorer-studio-dev.genlayer.com/tx/0xe4f9d5848371d1652a928af1c848a2b233af75102469890ee81dd09d51273021) | [0x2a5a153d…](https://explorer-studio-dev.genlayer.com/tx/0x2a5a153d51047b5eb208b4316bed9040d85dfa885abd7c072241609f836ce020) |
| cy (36) | Kiln contributors | **UNSIZED** | NONE | – | 0.0 GEN | [0x4196f9de…](https://explorer-studio-dev.genlayer.com/tx/0x4196f9ded1dad14bec7ddd0164252020e3339eb5eb450a04437da21b64b6be60) | [0x2ce1f277…](https://explorer-studio-dev.genlayer.com/tx/0x2ce1f27714edfc38d5a479d55337a37580ef478f7a7c1b4dbfb3c6937690bf4a) |

## Money

- ada:withdraw: [0xdb211310…](https://explorer-studio-dev.genlayer.com/tx/0xdb2113105871d30e9c8af23ffd1f2061da7b4505538989faf5d4355a9afe0f16) (the price on the card)
- bo:withdraw: [0xf4f56f22…](https://explorer-studio-dev.genlayer.com/tx/0xf4f56f22be9da4f97e19847c85d79454b6f30b8139b6454aabff69c1ae29ce3b) (the price on the card)
- ed:withdraw: [0x1356dcdd…](https://explorer-studio-dev.genlayer.com/tx/0x1356dcddbb8904cd6d16d30b0da4d82c7374f2e1210f4db9483ec331ca46f94d) (the cap price)

## Cards

- kiln: card 2, pool 327.0 GEN, escrow 0.0 GEN, funded 340.0 GEN, paid 14.0 GEN
- capped: card 3, pool 88.0 GEN, escrow 0.0 GEN, funded 100.0 GEN, paid 12.0 GEN

## Every step

- `kiln:open_card` open_card ok [0xa127817c…](https://explorer-studio-dev.genlayer.com/tx/0xa127817c58eaca6b09b8863f48733b42ac8efbe71808589d310f79022dafbd32) 2026-11-17T22:37:42Z
- `ada:claim` claim ok [0xcffaee02…](https://explorer-studio-dev.genlayer.com/tx/0xcffaee0226e666248f7fb72574342847a90a4beff41c1569010912f880b18d5d) 2026-11-17T22:37:50Z
- `bo:claim` claim ok [0xe4f9d584…](https://explorer-studio-dev.genlayer.com/tx/0xe4f9d5848371d1652a928af1c848a2b233af75102469890ee81dd09d51273021) 2026-11-17T22:37:58Z
- `cy:claim` claim ok [0x4196f9de…](https://explorer-studio-dev.genlayer.com/tx/0x4196f9ded1dad14bec7ddd0164252020e3339eb5eb450a04437da21b64b6be60) 2026-11-17T22:38:06Z
- `dee:claim` claim ok [0xc525b493…](https://explorer-studio-dev.genlayer.com/tx/0xc525b4937e48df1aeef14611663a2a244b601be7501ef4a4cbcbc9cac3548011) 2026-11-17T22:38:13Z
- `dee:veto` veto ok [0x8823f558…](https://explorer-studio-dev.genlayer.com/tx/0x8823f558bed995451bd645bbf00b1c59c34ed398c95240b6bf13ca180ba63553) 2026-11-17T22:38:21Z
- `capped:open_card` open_card ok [0x30f20c56…](https://explorer-studio-dev.genlayer.com/tx/0x30f20c566a41a228dba2f0f22d312d5eab31372d155bdc7db3eed67e0d135967) 2026-11-17T22:38:29Z
- `ed:claim` claim ok [0x0a40357e…](https://explorer-studio-dev.genlayer.com/tx/0x0a40357ee782b1dff71cb75022d6f02e6f7c32355a8fb376424a29fed9a296a3) 2026-11-17T22:38:37Z
- `ed:size` size ok [0x9ec9ce8a…](https://explorer-studio-dev.genlayer.com/tx/0x9ec9ce8ae26f83f1352c79d23382d963daa40bdc09347acb01883bf633787986) 2026-11-17T22:38:55Z
- `ada:size` size ok [0x839f12ee…](https://explorer-studio-dev.genlayer.com/tx/0x839f12ee7d85b94651d08f44fca86c763b55d84b780d94ec580b37615d57661b) 2026-11-17T23:39:28Z
- `bo:size` size ok [0xd159a847…](https://explorer-studio-dev.genlayer.com/tx/0xd159a8474003cb0cd73f95ffa0c022199922d706a74e4bf42ec7c706a7feee91) 2026-11-17T23:39:47Z
- `cy:size` size ok [0x2ce1f277…](https://explorer-studio-dev.genlayer.com/tx/0x2ce1f27714edfc38d5a479d55337a37580ef478f7a7c1b4dbfb3c6937690bf4a) 2026-11-17T23:40:06Z
- `bo:appeal` appeal ok [0xa3345576…](https://explorer-studio-dev.genlayer.com/tx/0xa33455767e14e2311160e15a3a8cdedb6ad502be10409ecd900ff299aa9eb2eb) 2026-11-17T23:40:15Z
- `bo:size2` size ok [0x2a5a153d…](https://explorer-studio-dev.genlayer.com/tx/0x2a5a153d51047b5eb208b4316bed9040d85dfa885abd7c072241609f836ce020) 2026-11-17T23:40:33Z
- `ada:withdraw` withdraw ok [0xdb211310…](https://explorer-studio-dev.genlayer.com/tx/0xdb2113105871d30e9c8af23ffd1f2061da7b4505538989faf5d4355a9afe0f16) 2026-11-17T23:40:42Z
- `bo:withdraw` withdraw ok [0xf4f56f22…](https://explorer-studio-dev.genlayer.com/tx/0xf4f56f22be9da4f97e19847c85d79454b6f30b8139b6454aabff69c1ae29ce3b) 2026-11-17T23:40:50Z
- `ed:withdraw` withdraw ok [0x1356dcdd…](https://explorer-studio-dev.genlayer.com/tx/0x1356dcddbb8904cd6d16d30b0da4d82c7374f2e1210f4db9483ec331ca46f94d) 2026-11-17T23:40:59Z
