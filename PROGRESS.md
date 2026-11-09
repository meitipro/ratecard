# Progress

- Read the Ratecard spec; reused the Doorman scaffold (test double, chain scripts, site, docs generator).
- Wrote `contracts/ratecard.py`; chose one reading of the spec's two statements about reserved amounts and documented it.
- 102 direct tests, then static tests; mutation testing first run 66 of 68, two real gaps closed, then 68 of 68.
- Deployed to Studio Next with the `babwp9t3` runner header (the old `5jycge4q` header is rejected by the live network).
- A live smoke loop worked: the spec's example claim sized M, the appeal reversed the ladder, the pool arithmetic was exact.
- Golden set locked and run: 10 of 10, stability 30 of 30, held-out H1 M, H2 S, H3 L.
