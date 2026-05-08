"use client";

import {
  formatPrice,
  formatBookingPrice,
  isCurrencyCode,
  type CurrencyCode,
} from "@/utils/formatPrice";
import { useCurrency } from "@/utils/hooks/useCurrency";

interface Props {
  amount: number | null | undefined;
  /** Source currency of `amount`. Defaults to "USD" if absent. */
  sourceCurrency?: string | null;
  /** Optional className passed through to the wrapper span. */
  className?: string;
  /**
   * If true, render BOTH the source currency (primary) and the user's selected
   * currency (secondary, muted). Used on AI plan/topup cards where Midtrans
   * charges IDR but we want users to see equivalents.
   */
  withSecondary?: boolean;
  /** Tailwind classes for the secondary line. */
  secondaryClassName?: string;
  /** Override prefix for primary text (e.g. "From "). Default: empty. */
  prefix?: string;
}

export default function PriceLabel({
  amount,
  sourceCurrency,
  className,
  withSecondary = false,
  secondaryClassName,
  prefix = "",
}: Props) {
  const { currency, exchangeRates } = useCurrency();

  if (amount == null || !Number.isFinite(amount)) return null;

  const source: CurrencyCode = isCurrencyCode(sourceCurrency)
    ? sourceCurrency
    : "USD";

  const primaryCurrency: CurrencyCode = withSecondary ? source : currency;
  const primary = formatBookingPrice(
    { totalPrice: amount, currency: source },
    primaryCurrency,
    exchangeRates
  );

  const showSecondary = withSecondary && currency !== source;
  const secondary = showSecondary
    ? formatPrice(amount, currency, source, exchangeRates)
    : null;

  return (
    <span className={className}>
      {prefix}
      <span className="tabular-nums">{primary}</span>
      {secondary ? (
        <span
          className={
            secondaryClassName ??
            "ml-1 text-xs text-slate-500 tabular-nums whitespace-nowrap"
          }
        >
          ≈ {secondary}
        </span>
      ) : null}
    </span>
  );
}
