export interface CurrencyUnit {
  value: number;
  label: string;
}

export interface CurrencyConfig {
  symbol: string;
  name: string;
  places: number;
  units: readonly CurrencyUnit[];
  minCoin: number;
}

export interface Plan {
  id: string;
  name: string;
  totalCount: number;
  typeCount: number;
  units: { value: number; label: string; count: number }[];
  remaining: number;
  fulfilled: boolean;
  desc: string;
}

export type Status = "settled" | "exact" | "short" | "insufficient" | "invalid";

export interface CalculateResult {
  status: Status;
  balance: number;
  plans: Plan[];
  inventory?: Record<string, number> | null;
  remaining?: number;
  currency: string;
}

export interface GreedyResult {
  items: { value: number; label: string; count: number }[];
  remaining: number;
}

export type Inventory = Record<string, number>;

export const CURRENCY_SETS: Record<string, CurrencyConfig>;

export function getCurrency(code: string): CurrencyConfig;

export function toCents(amount: number, code?: string): number;

export function fromCents(cents: number, code?: string): number;

export function parseInput(raw: string): { price: number; paid: number } | null;

export function greedy(
  amount: number,
  units?: readonly CurrencyUnit[],
  cap?: number,
  inventory?: Inventory | null
): GreedyResult;

export function deductInventory(
  items: { value: number; label: string; count: number }[],
  inventory: Inventory | null
): Inventory | null;

export function calculate(
  price: number,
  paid: number,
  currencyCode?: string,
  inventory?: Inventory | null
): CalculateResult;
