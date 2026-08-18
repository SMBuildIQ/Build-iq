// brief §24: "realizedSavings = initial qualified quote minus the final invoice
// amount — only ever set once an invoice actually exists, never estimated."
// Pure math, extracted out of the select-quote and invoice-recording routes so
// it's independently testable rather than only reachable through a full
// PR -> RFQ -> quote -> select -> invoice HTTP round trip.

export interface InitialSavingsFields {
  initialQuoteTotal: number;
  lowestQualifiedQuote: number;
  negotiatedQuoteTotal: number | null;
  finalApprovedPrice: number;
  negotiatedSavings: number | null;
}

/**
 * Computed when a quote is selected (POST /purchase-requests/:id/select-quote).
 * initialQuoteTotal is always the lowest total landed cost among quotes that
 * actually have one — never the selected quote's own price, so "savings"
 * always measures against what the org could have paid, not what it chose.
 */
export function computeInitialSavingsFields(params: {
  qualifiedQuoteTotals: number[];
  selectedQuoteTotal: number;
  acceptedNegotiationResultPrice: number | null;
}): InitialSavingsFields {
  const initialQuoteTotal = Math.min(...params.qualifiedQuoteTotals);
  const negotiated = params.acceptedNegotiationResultPrice !== null;
  const finalApprovedPrice = params.acceptedNegotiationResultPrice ?? params.selectedQuoteTotal;

  return {
    initialQuoteTotal,
    lowestQualifiedQuote: initialQuoteTotal,
    negotiatedQuoteTotal: negotiated ? finalApprovedPrice : null,
    finalApprovedPrice,
    negotiatedSavings: negotiated ? initialQuoteTotal - finalApprovedPrice : null,
  };
}

/** Computed when an invoice is recorded — the only point a real, paid amount exists. */
export function computeRealizedSavings(initialQuoteTotal: number, finalInvoiceAmount: number): number {
  return initialQuoteTotal - finalInvoiceAmount;
}
