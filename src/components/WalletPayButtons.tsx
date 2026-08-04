"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadStripe, type PaymentRequest, type Stripe } from "@stripe/stripe-js";

type ShipTo = {
  shipToName: string;
  shipToAddress: string;
  shipToCity: string;
  shipToState: string;
  shipToZip: string;
  notes?: string;
};

type Props = {
  amountCents: number;
  disabled?: boolean;
  getShipTo: () => ShipTo | null;
  onError: (message: string) => void;
  onPaid: (orderId: string) => void;
  onBusy?: (busy: boolean) => void;
};

export function WalletPayButtons({
  amountCents,
  disabled,
  getShipTo,
  onError,
  onPaid,
  onBusy,
}: Props) {
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [publishableKey, setPublishableKey] = useState("");
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const [canMakePayment, setCanMakePayment] = useState(false);
  const stripeRef = useRef<Stripe | null>(null);
  const paymentRequestRef = useRef<PaymentRequest | null>(null);
  const buttonHostRef = useRef<HTMLDivElement>(null);

  const completeCheckout = useCallback(
    async (payload: {
      walletType: string;
      paymentMethodId?: string;
      paymentIntentId?: string;
      orderNumber?: string;
    }) => {
      const shipTo = getShipTo();
      if (!shipTo) {
        onError("Fill in the delivery address before paying.");
        return;
      }
      onBusy?.(true);
      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...shipTo, ...payload }),
        });
        const data = await res.json();
        if (!res.ok) {
          onError(data.error || "Payment failed");
          onBusy?.(false);
          return;
        }
        onPaid(data.order.id);
      } catch {
        onError("Payment failed");
        onBusy?.(false);
      }
    },
    [getShipTo, onBusy, onError, onPaid]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cfg = await fetch("/api/checkout/wallet").then((r) => r.json());
      if (cancelled) return;
      setStripeConfigured(Boolean(cfg.stripeConfigured));
      setPublishableKey(cfg.publishableKey || "");

      // Detect platform for mock button emphasis
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
      const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
      const isAndroid = /Android/i.test(ua);
      setAppleAvailable(isIOS || isSafari);
      setGoogleAvailable(isAndroid || /Chrome/i.test(ua));

      if (!cfg.stripeConfigured || !cfg.publishableKey) return;

      const stripe = await loadStripe(cfg.publishableKey);
      if (!stripe || cancelled) return;
      stripeRef.current = stripe;

      const prep = await fetch("/api/checkout/wallet", { method: "POST" }).then((r) => r.json());
      if (!prep.clientSecret || cancelled) return;

      const pr = stripe.paymentRequest({
        country: prep.country || "US",
        currency: prep.currency || "usd",
        total: {
          label: prep.label || "BuildIQ",
          amount: prep.amountCents || amountCents,
        },
        requestPayerName: true,
        requestPayerEmail: true,
      });

      paymentRequestRef.current = pr;

      const result = await pr.canMakePayment();
      if (cancelled) return;
      if (result) {
        setCanMakePayment(true);
        setAppleAvailable(Boolean(result.applePay));
        setGoogleAvailable(Boolean(result.googlePay));

        pr.on("paymentmethod", async (ev) => {
          try {
            const wallet =
              ev.walletName === "applePay"
                ? "apple_pay"
                : ev.walletName === "googlePay"
                  ? "google_pay"
                  : "card";

            const { error, paymentIntent } = await stripe.confirmCardPayment(
              prep.clientSecret,
              { payment_method: ev.paymentMethod.id },
              { handleActions: false }
            );

            if (error) {
              ev.complete("fail");
              onError(error.message || "Wallet payment failed");
              return;
            }

            ev.complete("success");

            if (paymentIntent?.status === "requires_action") {
              const { error: actionError } = await stripe.confirmCardPayment(prep.clientSecret);
              if (actionError) {
                onError(actionError.message || "Authentication failed");
                return;
              }
            }

            await completeCheckout({
              walletType: wallet,
              paymentMethodId: ev.paymentMethod.id,
              paymentIntentId: prep.paymentIntentId,
              orderNumber: prep.orderNumber,
            });
          } catch (err) {
            ev.complete("fail");
            onError(err instanceof Error ? err.message : "Wallet payment failed");
          }
        });

        // Mount Stripe Payment Request Button when available
        if (buttonHostRef.current) {
          buttonHostRef.current.innerHTML = "";
          const elements = stripe.elements();
          const button = elements.create("paymentRequestButton", {
            paymentRequest: pr,
            style: {
              paymentRequestButton: {
                type: "buy",
                theme: "dark",
                height: "48px",
              },
            },
          });
          button.mount(buttonHostRef.current);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [amountCents, completeCheckout, onError]);

  // Keep Payment Request total in sync when cart total changes
  useEffect(() => {
    paymentRequestRef.current?.update({
      total: { label: "BuildIQ material packages", amount: amountCents },
    });
  }, [amountCents]);

  async function mockWalletPay(walletType: "mock_apple_pay" | "mock_google_pay") {
    if (disabled) return;
    await completeCheckout({ walletType });
  }

  function showStripeButton() {
    return stripeConfigured && canMakePayment;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--sage)]">
        Express wallets
      </p>

      {showStripeButton() && <div ref={buttonHostRef} className="overflow-hidden rounded-xl" />}

      {/* Always offer explicit Apple Pay / Google Pay actions (live via Payment Request when possible, mock otherwise) */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (stripeConfigured && paymentRequestRef.current && appleAvailable && canMakePayment) {
              paymentRequestRef.current.show();
            } else {
              mockWalletPay("mock_apple_pay");
            }
          }}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
          aria-label="Pay with Apple Pay"
        >
          <ApplePayMark />
          Apple Pay
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (stripeConfigured && paymentRequestRef.current && googleAvailable && canMakePayment) {
              paymentRequestRef.current.show();
            } else {
              mockWalletPay("mock_google_pay");
            }
          }}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--paper-deep)] disabled:opacity-50"
          aria-label="Pay with Google Pay"
        >
          <GooglePayMark />
          Google Pay
        </button>
      </div>

      <p className="text-[11px] leading-relaxed text-[var(--sage)]">
        {stripeConfigured
          ? "Apple Pay works in Safari / iPhone once your domain is verified in Stripe. Google Pay works in Chrome / Android."
          : "Demo mode: Apple Pay and Google Pay confirm instantly. Add STRIPE_SECRET_KEY + NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY for live wallets."}
      </p>
      {!publishableKey && null}
    </div>
  );
}

function ApplePayMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function GooglePayMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M21.6 12.23c0-.74-.07-1.45-.19-2.13H12v4.03h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.89-1.74 2.98-4.31 2.98-7.42z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.42l-3.24-2.5c-.9.6-2.04.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.06v2.58A9.99 9.99 0 0 0 12 22z" />
      <path fill="#FBBC05" d="M6.39 13.91A5.99 5.99 0 0 1 6.08 12c0-.66.11-1.31.3-1.91V7.51H3.06A9.99 9.99 0 0 0 2 12c0 1.61.39 3.14 1.06 4.49l3.33-2.58z" />
      <path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.82 1.49l2.87-2.87C16.96 2.97 14.69 2 12 2 8.19 2 4.9 4.18 3.06 7.51l3.33 2.58C7.18 7.72 9.39 5.96 12 5.96z" />
    </svg>
  );
}
