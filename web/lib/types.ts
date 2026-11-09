/** The JSON the contract's views return. Field names are the contract's own. */

export type Tier = 'XS' | 'S' | 'M' | 'L' | 'XL';
export type Status = 'OPEN' | 'APPEALED' | 'VETOED' | 'SIZED' | 'CAPPED' | 'UNSIZED' | 'REVISED';

export type Totals = { cards: number; claims: number };

export type CardCounts = {
  claims: number;
  sized: number;
  capped: number;
  unsized: number;
  vetoed: number;
  revised: number;
  appeals: number;
};

export type Card = {
  found: true;
  totals: Totals;
  id: number;
  owner: string;
  name: string;
  tiers: Tier[];
  anchors: string[];
  /** Prices in wei, one per tier, as decimal strings. */
  prices: string[];
  digest: string;
  cap: Tier;
  window_h: number;
  appeal_fee: string;
  created_at: number;
  last_funder: string;
  pool: string;
  escrow: string;
  funded: string;
  paid: string;
  counts: CardCounts;
};

export type Claim = {
  found: true;
  totals: Totals;
  id: number;
  card_id: number;
  card: string;
  owner: string;
  claimant: string;
  work: string;
  claimed_at: number;
  window_ends: number;
  status: Status;
  reading1: '' | Tier | 'NONE';
  reading2: '' | Tier | 'NONE';
  /** The tier actually paid, after the cap. */
  tier: '' | Tier;
  pay: string;
  appealed: boolean;
  appeal_fee: string;
  fee_to: '' | 'claimant' | 'pool';
  sized_at: number;
  sized_by: string;
  vetoed_by: string;
  vetoed_at: number;
  cap: Tier;
  claimant_balance: string;
};

export type Page<T> = { found: boolean; total: number; offset: number; items: T[] };
export type NotFound = { found: false; totals?: Totals };
