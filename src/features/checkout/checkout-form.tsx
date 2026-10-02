'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import { formatINR } from '@/core/domain/money';
import { calculateDelivery } from '@/core/domain/pricing';
import type { CustomerAddress } from '@/core/domain/account';
import { useCart } from '@/features/cart/cart-provider';
import { Button } from '@/ui/button';
import { Field, Input, Select, Textarea } from '@/ui/field';

interface Quote {
  lines: {
    productId: string;
    productName: string;
    quantity: number;
    lineTotalPaise: number;
    unitPricePaise: number;
  }[];
  totals: {
    subtotalPaise: number;
    feesPaise: number;
    shippingPaise: number;
    totalPaise: number;
    itemCount: number;
  };
  unavailable: { productId: string; reason: string }[];
  minimumPaise?: number;
  shortfallPaise?: number;
}

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

export interface CheckoutFormProps {
  /** Saved addresses for a signed-in customer. */
  addresses: CustomerAddress[];
  customerName: string | null;
  customerPhone: string | null;
}

export function CheckoutForm({ addresses, customerName, customerPhone }: CheckoutFormProps) {
  const router = useRouter();
  const { lines, hydrated, clear } = useCart();

  const [quoted, setQuoted] = React.useState<Quote | null>(null);
  const [placing, setPlacing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [selectedAddressId, setSelectedAddressId] = React.useState<string>('');

  const [form, setForm] = React.useState({
    customerName: customerName ?? '',
    mobile: customerPhone ?? '',
    houseFlat: '',
    streetLocality: '',
    city: '',
    state: 'Telangana',
    pincode: '',
    instructions: '',
  });

  const emptyCart = lines.length === 0;
  const quote: Quote | null = emptyCart ? null : quoted;

  const subtotalPaise = quote?.totals.subtotalPaise ?? 0;
  const feesPaise = quote?.totals.feesPaise ?? 0;
  const delivery = calculateDelivery(subtotalPaise, feesPaise);
  const belowMinimum = delivery.isBelowMinimum;

  /* Re-quote whenever the cart changes. */
  React.useEffect(() => {
    if (!hydrated || emptyCart) return;

    const controller = new AbortController();
    fetch('/api/v1/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lines: lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          personalizationImage: line.personalizationImage ?? null,
          customizationNotes: line.customizationNotes ?? null,
        })),
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as Quote & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? 'Could not price your order.');
        setQuoted(payload);
      })
      .catch((fetchError: Error) => {
        if (fetchError.name !== 'AbortError') setError(fetchError.message);
      });

    return () => controller.abort();
  }, [hydrated, emptyCart, lines]);

  const applyAddress = (addressId: string) => {
    setSelectedAddressId(addressId);
    const address = addresses.find((entry) => entry.id === addressId);
    if (!address) return;

    setForm((current) => ({
      ...current,
      houseFlat: address.houseFlat,
      streetLocality: address.streetLocality,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      instructions: address.instructions,
    }));
  };

  const update = (name: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((current) => ({ ...current, [name]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!quote || quote.totals.itemCount === 0) {
      setError('Your cart is empty.');
      return;
    }

    /*
     * The server enforces this too and returns a MIN_ORDER error, but gating
     * here keeps a below-minimum order from ever being submitted.
     */
    if (delivery.isBelowMinimum) {
      setError(delivery.progressMessage);
      return;
    }

    setPlacing(true);
    try {
      const response = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: form.customerName,
          mobile: form.mobile,
          address: {
            houseFlat: form.houseFlat,
            streetLocality: form.streetLocality,
            city: form.city,
            state: form.state,
            pincode: form.pincode,
            instructions: form.instructions,
          },
          // Ids and quantities only — the server sets every price.
          items: lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            personalizationImage: line.personalizationImage ?? null,
            customizationNotes: line.customizationNotes ?? null,
          })),
          paymentMethod: 'COD',
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        order?: { id: string };
        error?: string;
        issues?: { path: string; message: string }[];
      };

      if (!response.ok || !payload.success || !payload.order) {
        if (payload.issues?.length) {
          setFieldErrors(Object.fromEntries(payload.issues.map((issue) => [issue.path.split('.').pop() ?? issue.path, issue.message])));
        }
        throw new Error(payload.error ?? 'We could not place your order.');
      }

      clear();
      // Land on the confirmation page; the order detail page stays one tap away.
      router.push(`/thank-you?order=${encodeURIComponent(payload.order.id)}`);
    } catch (submitError) {
      setError((submitError as Error).message);
      setPlacing(false);
    }
  };

  if (hydrated && lines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-8">
        <h1 className="text-2xl font-extrabold uppercase">Your cart is empty</h1>
        <p className="mt-3 text-sm text-fg-muted">Add products before checking out.</p>
        <Button href="/" className="mt-8">
          Back to the catalogue
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-7xl px-4 py-12 sm:px-8 lg:px-12">
      <h1 className="text-2xl font-extrabold tracking-[0.02em] uppercase sm:text-3xl">Checkout</h1>
      <p className="mt-2 text-sm text-fg-muted">
        Cash on delivery. We confirm every order by phone before dispatch.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-7">
          {addresses.length > 0 && (
            <section className="surface rounded-sm p-5">
              <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-fg">
                Saved addresses
              </h2>
              <div className="mt-4">
                <Field label="Use a saved address" htmlFor="saved-address">
                  <Select
                    id="saved-address"
                    value={selectedAddressId}
                    onChange={(event) => applyAddress(event.target.value)}
                  >
                    <option value="">Enter a new address</option>
                    {addresses.map((address) => (
                      <option key={address.id} value={address.id}>
                        {address.label} — {address.houseFlat}, {address.city} {address.pincode}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </section>
          )}

          <section className="surface space-y-5 rounded-sm p-5">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-fg">
              Contact
            </h2>

            <Field label="Full name" htmlFor="customerName" required error={fieldErrors.customerName}>
              <Input
                id="customerName"
                name="customerName"
                autoComplete="name"
                value={form.customerName}
                onChange={update('customerName')}
                required
              />
            </Field>

            <Field
              label="Mobile number"
              htmlFor="mobile"
              required
              hint="We call this number to confirm the order."
              error={fieldErrors.mobile}
            >
              <Input
                id="mobile"
                name="mobile"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="98765 43210"
                value={form.mobile}
                onChange={update('mobile')}
                required
              />
            </Field>
          </section>

          <section className="surface space-y-5 rounded-sm p-5">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-fg">
              Delivery address
            </h2>

            <Field label="House / flat" htmlFor="houseFlat" required error={fieldErrors.houseFlat}>
              <Input
                id="houseFlat"
                name="houseFlat"
                autoComplete="address-line1"
                value={form.houseFlat}
                onChange={update('houseFlat')}
                required
              />
            </Field>

            <Field
              label="Street / locality"
              htmlFor="streetLocality"
              required
              error={fieldErrors.streetLocality}
            >
              <Input
                id="streetLocality"
                name="streetLocality"
                autoComplete="address-line2"
                value={form.streetLocality}
                onChange={update('streetLocality')}
                required
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="City" htmlFor="city" required error={fieldErrors.city}>
                <Input
                  id="city"
                  name="city"
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={update('city')}
                  required
                />
              </Field>

              <Field label="State" htmlFor="state" required error={fieldErrors.state}>
                <Select id="state" name="state" value={form.state} onChange={update('state')} required>
                  {INDIAN_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="PIN code" htmlFor="pincode" required error={fieldErrors.pincode}>
              <Input
                id="pincode"
                name="pincode"
                inputMode="numeric"
                maxLength={6}
                autoComplete="postal-code"
                value={form.pincode}
                onChange={update('pincode')}
                required
              />
            </Field>

            <Field label="Delivery instructions (optional)" htmlFor="instructions">
              <Textarea
                id="instructions"
                name="instructions"
                rows={3}
                value={form.instructions}
                onChange={update('instructions')}
                placeholder="Landmark, preferred time, gate code…"
              />
            </Field>
          </section>
        </div>

        <aside className="lg:col-span-5">
          <div className="surface sticky top-28 rounded-sm p-5">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-fg">
              Order summary
            </h2>

            {error && (
              <p role="alert" className="mt-4 rounded-sm border border-status-danger/50 bg-status-danger/10 p-3 text-sm text-status-danger">
                {error}
              </p>
            )}

            {quote && quote.unavailable.length > 0 && (
              <p className="mt-4 rounded-sm border border-status-warn/40 bg-status-warn/10 p-3 text-sm text-status-warn">
                {quote.unavailable.length} {quote.unavailable.length === 1 ? 'item is' : 'items are'} no
                longer available and will not be charged.
              </p>
            )}

            <ul className="mt-4 divide-y divide-hairline">
              {quote?.lines.map((line) => (
                <li key={`${line.productId}-${line.lineTotalPaise}`} className="flex items-baseline justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-fg">{line.productName}</span>
                    <span className="numeric text-[11px] text-fg-dim">
                      {line.quantity} × {formatINR(line.unitPricePaise)}
                    </span>
                  </span>
                  <span className="numeric shrink-0 text-sm text-fg">
                    {formatINR(line.lineTotalPaise)}
                  </span>
                </li>
              )) ?? <li className="py-3 text-sm text-fg-dim">Pricing your cart…</li>}
            </ul>

            <dl className="mt-4 space-y-2 border-t border-hairline pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-fg-muted">Subtotal</dt>
                <dd className="numeric">{formatINR(delivery.subtotalPaise)}</dd>
              </div>
              {delivery.feesPaise > 0 && (
                <div className="flex justify-between">
                  <dt className="text-fg-muted">Personalization</dt>
                  <dd className="numeric">{formatINR(delivery.feesPaise)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-fg-muted">Delivery</dt>
                <dd className="numeric">
                  {delivery.isFreeDelivery ? (
                    <span className="font-medium text-emerald-400">Free (₹0)</span>
                  ) : (
                    formatINR(delivery.deliveryChargePaise)
                  )}
                </dd>
              </div>
              <div className="flex justify-between border-t border-hairline pt-3 text-base font-bold">
                <dt>Payable on delivery</dt>
                <dd className="numeric">{formatINR(delivery.totalPaise)}</dd>
              </div>
            </dl>

            {/* Minimum order and free delivery status */}
            {delivery.isBelowMinimum ? (
              <p
                role="status"
                aria-live="polite"
                className="mt-4 rounded-sm border border-status-warn/40 bg-status-warn/10 p-3 text-xs leading-relaxed text-status-warn"
              >
                <strong className="block font-semibold">{delivery.progressMessage}</strong>
                <span className="mt-1 block text-fg-muted">
                  Minimum cart value of ₹599 is required to place an order.
                </span>
              </p>
            ) : !delivery.isFreeDelivery ? (
              <p
                role="status"
                aria-live="polite"
                className="mt-4 rounded-sm border border-ember/30 bg-ember/10 p-3 text-xs leading-relaxed text-ember"
              >
                <strong>{delivery.progressMessage}</strong>
              </p>
            ) : (
              <p
                role="status"
                aria-live="polite"
                className="mt-4 rounded-sm border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs leading-relaxed text-emerald-400"
              >
                <strong>Free delivery applied</strong>
              </p>
            )}

            <Button
              type="submit"
              block
              size="lg"
              className="mt-6"
              disabled={placing || !quote || belowMinimum}
            >
              {placing
                ? 'Placing order…'
                : belowMinimum
                  ? 'Add more than ₹599 to place an order'
                  : 'Place order · COD'}
            </Button>

            <p className="mt-3 text-[11px] text-fg-dim">
              By placing this order you agree to be contacted on the mobile number above.
            </p>
          </div>
        </aside>
      </div>
    </form>
  );
}
