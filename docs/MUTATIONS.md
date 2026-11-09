# Mutations

Written by `python scripts/mutate.py --table docs/MUTATIONS.md`. 68 defences in
`contracts/ratecard.py` were each broken on their own, and every mutant was caught. Each row
names the first test that failed against it, read from pytest's report rather than an exit code.
The generated-files, frozen-deployment and private-key tests are excluded, because the first two
fail for any edit at all and the last reads files, not the contract.

One check is deliberately not mutated: the validator's test that the leader's payload is a dict
with a label from the closed set. The label comparison right below it already refuses anything
else, so no test can tell the two apart; it stays so the validator never depends on how the
runtime treats an exception raised inside it.

| # | defence broken | caught by |
|---|---|---|
| 1 | veto: any account may veto | `tests/test_direct.py::test_only_the_owner_may_veto` |
| 2 | appeal: any account may appeal | `tests/test_direct.py::test_only_the_claimant_may_appeal` |
| 3 | open_card: the card is owned by a fixed address | `tests/test_direct.py::test_open_card_records_the_card_and_funds_the_pool` |
| 4 | claim: the claim is not bound to the claimant | `tests/test_direct.py::test_a_claim_is_stored_and_enters_the_window` |
| 5 | withdraw: pays a fixed address | `tests/test_direct.py::test_withdraw_pays_the_contributor_the_price` |
| 6 | size: the caller is not recorded | `tests/test_direct.py::test_size_is_open_to_anyone_and_records_the_caller` |
| 7 | fund_card: the funder is not recorded | `tests/test_direct.py::test_anyone_may_add_to_the_pool_and_is_recorded` |
| 8 | veto: the vetoer is not recorded | `tests/test_direct.py::test_the_owner_may_veto_inside_the_window` |
| 9 | appeal: any fee is accepted | `tests/test_direct.py::test_an_appeal_needs_the_exact_fee` |
| 10 | withdraw: the balance is not zeroed | `tests/test_direct.py::test_a_lower_tier_after_a_withdrawal_cannot_take_back_what_left` |
| 11 | withdraw: an empty balance still sends | `tests/test_direct.py::test_withdraw_with_nothing_is_refused` |
| 12 | open_card: the first funding is not put in the pool | `tests/test_direct.py::test_open_card_records_the_card_and_funds_the_pool` |
| 13 | fund_card: the value is not added to the pool | `tests/test_direct.py::test_anyone_may_add_to_the_pool_and_is_recorded` |
| 14 | fund_card: zero is accepted | `tests/test_direct.py::test_funding_needs_value_and_a_card` |
| 15 | appeal: the fee is not held in escrow | `tests/test_direct.py::test_an_appeal_pays_the_fee_into_escrow` |
| 16 | size: the price is not credited | `tests/test_direct.py::test_the_price_is_looked_up_on_the_card[XS-2000000000000000000]` |
| 17 | size: the pool is not reduced by the price | `tests/test_direct.py::test_the_price_is_looked_up_on_the_card[XS-2000000000000000000]` |
| 18 | size: the paid total is not counted | `tests/test_direct.py::test_the_price_is_looked_up_on_the_card[XS-2000000000000000000]` |
| 19 | credit: a balance is overwritten, not added to | `tests/test_direct.py::test_an_unsized_claim_can_be_appealed` |
| 20 | size: the review window is ignored | `tests/test_direct.py::test_size_waits_for_the_window` |
| 21 | size: the pool need not hold the cap price | `tests/test_direct.py::test_size_needs_the_pool_to_hold_the_cap_price` |
| 22 | size: no tier is ever above the cap | `tests/test_direct.py::test_a_tier_above_the_cap_pays_the_cap` |
| 23 | size: a capped claim is paid its own tier | `tests/test_direct.py::test_a_tier_above_the_cap_pays_the_cap` |
| 24 | size: NONE is not unsized | `tests/test_direct.py::test_none_closes_the_claim_with_no_pay` |
| 25 | size: a sized claim can be sized again | `tests/test_direct.py::test_a_vetoed_claim_cannot_be_sized_or_appealed` |
| 26 | size: an appeal reads the forward ladder | `tests/test_direct.py::test_the_second_reading_reads_the_ladder_largest_first` |
| 27 | prompt: the reversed template is never used | `tests/test_direct.py::test_the_second_reading_reads_the_ladder_largest_first` |
| 28 | judge: the fence lets delimiters through | `tests/test_direct.py::test_hostile_text_cannot_close_its_block` |
| 29 | judge: an anchor is not fenced | `tests/test_direct.py::test_the_anchors_are_fenced_too` |
| 30 | judge: the claim is not fenced | `tests/test_direct.py::test_hostile_text_cannot_close_its_block` |
| 31 | judge: validators agree with any answer | `tests/test_direct.py::test_validators_must_agree_on_the_label` |
| 32 | judge: an unreadable label defaults to NONE | `tests/test_direct.py::test_an_unreadable_answer_is_never_a_label[{"size":` |
| 33 | judge: a formatting slip is never retried | `tests/test_direct.py::test_a_formatting_slip_gets_exactly_one_retry` |
| 34 | veto: allowed after the window | `tests/test_direct.py::test_a_veto_after_the_window_is_refused` |
| 35 | veto: a sized claim can be vetoed | `tests/test_direct.py::test_a_claim_is_vetoed_once` |
| 36 | veto: a veto is not counted | `tests/test_direct.py::test_the_owner_may_veto_inside_the_window` |
| 37 | appeal: any claim can be appealed | `tests/test_direct.py::test_a_vetoed_claim_cannot_be_sized_or_appealed` |
| 38 | appeal: a claim can be appealed twice | `tests/test_direct.py::test_a_claim_has_one_appeal` |
| 39 | appeal: the claim is not marked appealed | `tests/test_direct.py::test_an_appeal_pays_the_fee_into_escrow` |
| 40 | appeal: an appeal is not counted | `tests/test_direct.py::test_an_appeal_pays_the_fee_into_escrow` |
| 41 | reading two: every appeal counts as a change | `tests/test_direct.py::test_a_claim_has_one_appeal` |
| 42 | reading two: no appeal counts as a change | `tests/test_direct.py::test_a_card_with_no_appeal_fee_takes_no_value` |
| 43 | reading two: only the tier counts as a change | `tests/test_direct.py::test_sized_then_capped_at_the_same_tier_counts_as_a_change` |
| 44 | reading two: the fee does not come back | `tests/test_direct.py::test_an_unsized_claim_can_be_appealed` |
| 45 | reading two: an unchanged fee is not sent to the pool | `tests/test_direct.py::test_the_same_tier_keeps_the_result_and_sends_the_fee_to_the_pool` |
| 46 | reading two: the escrow is not released | `tests/test_direct.py::test_an_unsized_claim_can_be_appealed` |
| 47 | reading two: the second label is not kept | `tests/test_direct.py::test_an_unsized_claim_can_be_appealed` |
| 48 | reading two: a higher tier is not paid | `tests/test_direct.py::test_an_unsized_claim_can_be_appealed` |
| 49 | reading two: a higher tier does not draw on the pool | `tests/test_direct.py::test_an_unsized_claim_can_be_appealed` |
| 50 | reading two: a lower tier does not return to the pool | `tests/test_direct.py::test_a_lower_tier_takes_back_what_it_can` |
| 51 | reading two: a lower tier takes more than the balance | `tests/test_direct.py::test_a_lower_tier_after_a_withdrawal_cannot_take_back_what_left` |
| 52 | reading two: a lower tier does not take from the balance | `tests/test_direct.py::test_a_lower_tier_takes_back_what_it_can` |
| 53 | reading two: a revision is not counted | `tests/test_direct.py::test_a_higher_tier_pays_the_difference_and_returns_the_fee` |
| 54 | reading two: an unchanged claim loses its result | `tests/test_direct.py::test_a_capped_result_that_stays_capped_is_not_revised` |
| 55 | reading two: the old result stays counted | `tests/test_direct.py::test_the_same_tier_keeps_the_result_and_sends_the_fee_to_the_pool` |
| 56 | reading two: the first result is not remembered | `tests/test_direct.py::test_a_claim_has_one_appeal` |
| 57 | open_card: any number of anchors | `tests/test_direct.py::test_a_card_has_exactly_five_anchors` |
| 58 | open_card: prices may fall | `tests/test_direct.py::test_a_card_has_exactly_five_prices_that_do_not_fall` |
| 59 | open_card: a price of zero is accepted | `tests/test_direct.py::test_a_card_has_exactly_five_prices_that_do_not_fall` |
| 60 | open_card: any price is accepted | `tests/test_direct.py::test_a_card_has_exactly_five_prices_that_do_not_fall` |
| 61 | open_card: any cap tier is accepted | `tests/test_direct.py::test_open_card_refuses_out_of_range_settings[kwargs3-the` |
| 62 | open_card: any review window is accepted | `tests/test_direct.py::test_open_card_refuses_out_of_range_settings[kwargs6-review` |
| 63 | open_card: any appeal fee is accepted | `tests/test_direct.py::test_open_card_refuses_out_of_range_settings[kwargs8-appeal` |
| 64 | claim: the 600-character cap is gone | `tests/test_direct.py::test_a_claim_is_a_bounded_description` |
| 65 | open_card: the 200-character anchor cap is gone | `tests/test_direct.py::test_the_anchors_are_one_bounded_line_each[<lambda>-the` |
| 66 | open_card: the 80-character name cap is gone | `tests/test_direct.py::test_open_card_refuses_out_of_range_settings[kwargs1-name` |
| 67 | claim: the review window is twice as long | `tests/test_direct.py::test_a_claim_is_stored_and_enters_the_window` |
| 68 | digest: the prices are not hashed | `tests/test_direct.py::test_the_digest_covers_the_anchors_the_prices_and_the_cap` |
