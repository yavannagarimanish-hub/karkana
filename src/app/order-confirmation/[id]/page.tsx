import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrderById } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: { id: string };
}

export default async function OrderConfirmationPage({ params }: PageProps) {
  const order = getOrderById(params.id);

  if (!order) {
    notFound();
  }

  return (
    <div className="w-full bg-black min-h-screen py-16 sm:py-24 px-6 sm:px-12 max-w-4xl mx-auto">
      {/* Editorial Status Header */}
      <div className="text-center space-y-4 mb-16">
        <div className="inline-flex items-center space-x-2 border border-white/20 px-4 py-1.5 font-mono text-xs text-white/70 uppercase">
          <span className="w-2 h-2 rounded-full bg-kred animate-ping" />
          <span>ORDER SECURELY REGISTERED</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold uppercase tracking-ultra text-white">
          COMMISSION CONFIRMED
        </h1>
        <p className="text-white/40 text-xs sm:text-sm font-mono max-w-lg mx-auto leading-relaxed">
          Your Cash on Delivery order has been successfully queued in our dispatch system.
        </p>
      </div>

      {/* CRED-style Monolithic Ticket */}
      <div className="border border-white/20 bg-white/[0.01] p-8 sm:p-14 space-y-12">
        {/* Ticket Top: Order ID & Status */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-8 border-b border-white/10 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">
              COMMISSION REFERENCE
            </span>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-widest">
              {order.id}
            </div>
            <div className="text-xs font-mono text-white/40">
              {new Date(order.createdAt).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </div>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">
              CURRENT DISPATCH STATUS
            </span>
            <div>
              <span className="inline-block px-3 py-1 bg-kred/10 border border-kred text-kred text-xs font-mono font-bold tracking-widest uppercase">
                {order.status}
              </span>
            </div>
          </div>
        </div>

        {/* Ordered Items List */}
        <div className="space-y-6">
          <div className="text-xs font-mono uppercase tracking-widest text-kred">
            ORDERED FORMULATIONS
          </div>

          <div className="space-y-4 divide-y divide-white/5">
            {order.items.map((item, idx) => (
              <div key={idx} className="pt-4 first:pt-0 flex items-start justify-between gap-6">
                <div className="flex items-start space-x-4">
                  {item.personalizationImage ? (
                    <div className="w-14 h-14 border border-kred/50 overflow-hidden flex-shrink-0 bg-black">
                      <img
                        src={item.personalizationImage}
                        alt="Personalized Customer Upload"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 border border-white/10 bg-white/5 flex items-center justify-center flex-shrink-0 text-white/30 text-[10px] font-mono">
                      {idx + 1}
                    </div>
                  )}

                  <div className="space-y-1">
                    <span className="text-white font-bold uppercase text-sm block">
                      {item.productName}
                    </span>
                    <span className="text-white/40 text-xs font-mono block">
                      MODULE: {item.module} {'//'} QTY: {item.quantity} × ₹{item.price.toLocaleString('en-IN')}
                    </span>
                    {item.personalizationImage && (
                      <span className="text-[11px] font-mono text-kred block">
                        ✦ Bespoke Photograph Attached
                      </span>
                    )}
                    {item.customizationNotes && (
                      <span className="text-[11px] font-mono text-white/60 italic block">
                        Directive: &ldquo;{item.customizationNotes}&rdquo;
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-white font-mono font-bold text-sm tracking-wider">
                  ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Details */}
        <div className="pt-8 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-8 font-mono text-xs">
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-widest text-white/40 block">
              RECIPIENT & CONTACT
            </span>
            <div className="text-white font-bold text-sm uppercase">
              {order.customerName}
            </div>
            <div className="text-white/60">Phone: {order.mobile}</div>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-widest text-white/40 block">
              DISPATCH DESTINATION
            </span>
            <div className="text-white/80 leading-relaxed">
              {order.address.houseFlat}, {order.address.streetLocality}
              <br />
              {order.address.city}, {order.address.state} — {order.address.pincode}
            </div>
            {order.address.instructions && (
              <div className="text-white/50 italic pt-1">
                Note: {order.address.instructions}
              </div>
            )}
          </div>
        </div>

        {/* Payment Summary */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 block">
              SETTLEMENT METHOD
            </span>
            <div className="text-kred font-mono font-bold text-sm tracking-widest uppercase flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-kred" />
              <span>{order.paymentMethod}</span>
            </div>
            <div className="text-[11px] font-mono text-white/40">
              Pay ₹{order.totalAmount.toLocaleString('en-IN')} cash upon package handover.
            </div>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 block">
              TOTAL DUE
            </span>
            <div className="text-3xl sm:text-4xl font-mono font-bold text-white tracking-widest">
              ₹{order.totalAmount.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      {/* Post Actions */}
      <div className="mt-12 flex flex-col sm:flex-row justify-center items-center gap-6 font-mono text-xs tracking-widest">
        <Link
          href="/"
          className="px-8 py-4 bg-white text-black font-bold uppercase hover:bg-kred hover:text-white transition-colors"
        >
          RETURN TO HOME
        </Link>
        <Link
          href="/admin/orders"
          className="px-8 py-4 border border-white/20 text-white uppercase hover:border-white transition-colors"
        >
          VIEW IN ADMIN PORTAL →
        </Link>
      </div>
    </div>
  );
}
