'use client';

import React, { useEffect, useState } from 'react';
import { Order, OrderStatus } from '@/types';
import SectionHeader from '@/components/SectionHeader';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | OrderStatus>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Failed fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'ALL') return true;
    return o.status === statusFilter;
  });

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pb-8 border-b border-white/10">
        <SectionHeader
          number="03"
          title="DISPATCH & ORDER DESK"
          subtitle="MONITOR CASH ON DELIVERY COMMISSIONS & CUSTOM PHOTOGRAPHY ASSETS"
        />

        <div className="text-xs font-mono tracking-widest text-white/40 uppercase">
          {orders.length} REGISTERED COMMISSIONS
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto text-xs font-mono uppercase tracking-wider pb-2 border-b border-white/10">
        {(
          [
            'ALL',
            'NEW',
            'CONFIRMED',
            'PREPARING',
            'DISPATCHED',
            'DELIVERED',
            'CANCELLED',
          ] as const
        ).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`px-4 py-2 border transition-colors whitespace-nowrap ${
              statusFilter === st
                ? 'border-white bg-white text-black font-bold'
                : 'border-white/10 text-white/60 hover:border-white/30 hover:text-white'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="py-24 text-center font-mono text-xs tracking-widest text-white/40 uppercase animate-pulse">
          ACCESSING DISPATCH LOGS...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-24 border border-white/10 bg-white/[0.01] text-center p-8">
          <div className="w-12 h-[1px] bg-kred mx-auto mb-6" />
          <h3 className="text-xl font-bold uppercase tracking-widest text-white mb-2">
            NO COMMISSIONS RECORDED
          </h3>
          <p className="text-white/40 text-xs font-mono mb-6">
            When customer orders are completed via Cash on Delivery, they will materialize here.
          </p>
        </div>
      ) : (
        <div className="border border-white/10 bg-white/[0.01] overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-white/40 uppercase tracking-widest">
                <th className="p-4">COMMISSION ID</th>
                <th className="p-4">DATE</th>
                <th className="p-4">CUSTOMER</th>
                <th className="p-4">CITY / PINCODE</th>
                <th className="p-4">ITEMS</th>
                <th className="p-4">AMOUNT</th>
                <th className="p-4">STATUS</th>
                <th className="p-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredOrders.map((order) => {
                const hasPersonalized = order.items.some((i) => i.personalizationImage);

                return (
                  <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Order ID */}
                    <td className="p-4 font-bold text-white">
                      <div>{order.id}</div>
                      {hasPersonalized && (
                        <span className="text-[10px] text-kred uppercase font-bold">
                          ✦ CUSTOM PHOTO
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="p-4 text-white/50">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    {/* Customer */}
                    <td className="p-4">
                      <div className="text-white uppercase font-bold">{order.customerName}</div>
                      <div className="text-white/40">{order.mobile}</div>
                    </td>

                    {/* City */}
                    <td className="p-4 text-white/70">
                      {order.address.city}, {order.address.pincode}
                    </td>

                    {/* Items Count */}
                    <td className="p-4 text-white/60">
                      {order.items.reduce((sum, i) => sum + i.quantity, 0)} units
                    </td>

                    {/* Amount */}
                    <td className="p-4 font-bold text-white">
                      ₹{order.totalAmount.toLocaleString('en-IN')}
                    </td>

                    {/* Status Badge */}
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 text-[10px] uppercase font-bold border ${
                          order.status === 'NEW'
                            ? 'border-kred text-kred bg-kred/10'
                            : order.status === 'DELIVERED'
                            ? 'border-white bg-white text-black'
                            : 'border-white/30 text-white'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="text-white hover:text-kred underline uppercase"
                      >
                        INSPECT →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ORDER INSPECTION DRAWER / MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="border border-white/20 bg-black max-w-3xl w-full p-8 sm:p-12 space-y-8 my-8 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-white/10 pb-6">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-kred block mb-1">
                  ORDER FULFILLMENT DOSSIER
                </span>
                <h3 className="text-2xl font-bold uppercase tracking-wider text-white">
                  {selectedOrder.id}
                </h3>
                <span className="text-xs font-mono text-white/40">
                  Registered: {new Date(selectedOrder.createdAt).toLocaleString('en-IN')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-white/50 hover:text-white font-mono text-sm uppercase"
              >
                [CLOSE ×]
              </button>
            </div>

            {/* Status Change Control */}
            <div className="p-6 border border-white/10 bg-white/[0.01] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-white/40 block">
                  LIFECYCLE STATUS
                </span>
                <div className="text-sm font-mono font-bold text-white uppercase mt-1">
                  CURRENT: <span className="text-kred">{selectedOrder.status}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-white/60">UPDATE TO:</span>
                <select
                  disabled={updatingStatus}
                  value={selectedOrder.status}
                  onChange={(e) =>
                    handleUpdateStatus(selectedOrder.id, e.target.value as OrderStatus)
                  }
                  className="bg-black border border-white/20 text-xs font-mono text-white p-2 uppercase focus:outline-none focus:border-white"
                >
                  <option value="NEW">NEW</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="PREPARING">PREPARING</option>
                  <option value="DISPATCHED">DISPATCHED</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </div>

            {/* Customer & Address Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 font-mono text-xs border border-white/10 p-6 bg-white/[0.01]">
              <div className="space-y-2">
                <span className="text-white/40 uppercase tracking-widest block">
                  CUSTOMER DETAILS
                </span>
                <div className="text-white font-bold text-sm uppercase">
                  {selectedOrder.customerName}
                </div>
                <div className="text-white/70">Phone: {selectedOrder.mobile}</div>
                <div className="text-white/40">Method: {selectedOrder.paymentMethod}</div>
              </div>

              <div className="space-y-2">
                <span className="text-white/40 uppercase tracking-widest block">
                  DISPATCH DESTINATION
                </span>
                <div className="text-white leading-relaxed">
                  {selectedOrder.address.houseFlat}, {selectedOrder.address.streetLocality}
                  <br />
                  {selectedOrder.address.city}, {selectedOrder.address.state} —{' '}
                  {selectedOrder.address.pincode}
                </div>
                {selectedOrder.address.instructions && (
                  <div className="text-white/60 italic pt-1">
                    Special notes: {selectedOrder.address.instructions}
                  </div>
                )}
              </div>
            </div>

            {/* Items Breakdown */}
            <div className="space-y-4">
              <span className="text-xs font-mono uppercase tracking-widest text-kred block">
                ORDERED PRODUCTS ({selectedOrder.items.length})
              </span>

              <div className="space-y-3 font-mono text-xs divide-y divide-white/5">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="pt-3 first:pt-0 flex justify-between items-start">
                    <div>
                      <div className="text-white font-bold uppercase">{item.productName}</div>
                      <div className="text-white/40">
                        MODULE: {item.module} {'//'} QTY: {item.quantity} × ₹
                        {item.price.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="text-white font-bold">
                      ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-between items-baseline font-mono">
                <span className="text-xs uppercase tracking-widest text-white/50">
                  TOTAL VALUE (CASH ON DELIVERY)
                </span>
                <span className="text-2xl font-bold text-white">
                  ₹{selectedOrder.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* PERSONALIZATION ASSETS (CUSTOMER UPLOADED PHOTOGRAPHS) */}
            {selectedOrder.items.some((i) => i.personalizationImage) && (
              <div className="p-6 border border-kred/50 bg-kred/[0.03] space-y-6">
                <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-widest text-kred">
                  <span className="w-2 h-2 rounded-full bg-kred animate-ping" />
                  <span className="font-bold">CUSTOMER PERSONALIZATION ASSETS</span>
                </div>

                <p className="text-xs font-mono text-white/60">
                  The customer uploaded this photograph for custom packaging printing. This asset is tied strictly to this order and did not overwrite the product catalogue imagery.
                </p>

                <div className="space-y-6">
                  {selectedOrder.items
                    .filter((i) => i.personalizationImage)
                    .map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 border border-white/10 bg-black flex flex-col sm:flex-row gap-6 items-start"
                      >
                        <div className="relative w-40 h-40 border border-white/20 bg-white/[0.02] flex-shrink-0 overflow-hidden">
                          <img
                            src={item.personalizationImage}
                            alt="Customer upload"
                            className="w-full h-full object-contain"
                          />
                        </div>

                        <div className="space-y-3 font-mono text-xs">
                          <div>
                            <span className="text-white/40 uppercase block text-[10px]">
                              ASSOCIATED COMMODITY
                            </span>
                            <span className="text-white font-bold uppercase">
                              {item.productName}
                            </span>
                          </div>

                          {item.customizationNotes ? (
                            <div>
                              <span className="text-white/40 uppercase block text-[10px]">
                                CUSTOMIZATION INSTRUCTIONS
                              </span>
                              <div className="text-white/80 p-2 bg-white/5 border border-white/10 mt-1">
                                &ldquo;{item.customizationNotes}&rdquo;
                              </div>
                            </div>
                          ) : (
                            <span className="text-white/40 italic block">
                              No specific text directives provided.
                            </span>
                          )}

                          <a
                            href={item.personalizationImage}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-4 py-2 border border-white/20 text-white hover:border-kred hover:text-kred uppercase text-[10px] tracking-widest"
                          >
                            OPEN HIGH-RES ASSET ↗
                          </a>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
