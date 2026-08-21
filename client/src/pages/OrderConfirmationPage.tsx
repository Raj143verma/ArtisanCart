import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { listOrders } from '../services/orderService';
import type { Order, Transaction } from '../types/checkout';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

export function OrderConfirmationPage() {
  const location = useLocation();
  const state = location.state as {
    orders?: Order[];
    transaction?: Transaction;
  } | null;

  const [orders, setOrders] = useState<Order[]>(state?.orders || []);
  const [transaction] = useState<Transaction | undefined>(state?.transaction);
  const [isLoading, setIsLoading] = useState(!state?.orders || state.orders.length === 0);

  useEffect(() => {
    if (orders.length === 0) {
      void listOrders()
        .then((fetched) => {
          if (fetched && fetched.length > 0) {
            setOrders([fetched[0]]); // Display latest
          }
        })
        .finally(() => setIsLoading(false));
    }
  }, [orders.length]);

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

  if (isLoading) {
    return (
      <div className="order-confirmation-container">
        <LoadingSkeleton type="detail" />
      </div>
    );
  }

  return (
    <div className="order-confirmation-container">
      {/* 1. Hero Confirmation Card */}
      <div className="confirmation-hero-card">
        <div className="success-icon-badge" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <span className="eyebrow">Payment Successful</span>
        <h1 className="hero-title">Thank you for your order!</h1>
        <p className="hero-subtitle">
          Your payment has been received and confirmed. Independent artisans have been notified and will begin crafting your items.
        </p>

        {transaction && (
          <div style={{ fontSize: '0.9rem', color: '#526176', marginBottom: '1rem' }}>
            Payment Transaction: <strong>{transaction.transactionNumber}</strong>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/customer/orders" className="button button--secondary">
            View Order History
          </Link>
          <Link to="/products" className="button button--checkout">
            Continue Shopping &rarr;
          </Link>
        </div>
      </div>

      {/* 2. Order Breakdown Cards */}
      <div className="orders-receipt-list">
        <h2 style={{ fontFamily: 'Cinzel, serif', color: '#103b68', fontSize: '1.6rem', margin: '1rem 0 0.5rem 0' }}>
          Order Receipts
        </h2>

        {orders.map((order) => {
          const sellerName =
            typeof order.seller === 'object' && order.seller !== null && 'name' in order.seller
              ? order.seller.name
              : 'Artisan Workshop';

          return (
            <div key={order._id} className="order-receipt-card">
              <div className="receipt-header">
                <div>
                  <span className="order-num-tag">{order.orderNumber}</span>
                  <div style={{ fontSize: '0.85rem', color: '#526176', marginTop: '0.2rem' }}>
                    Artisan Store: <strong>{sellerName}</strong>
                  </div>
                </div>

                <span className="stock-badge stock-badge--in-stock" style={{ textTransform: 'uppercase' }}>
                  {order.status}
                </span>
              </div>

              {/* Items List */}
              <div className="checkout-items-list" style={{ marginBottom: '1.25rem' }}>
                {order.items.map((item, idx) => (
                  <div key={idx} className="checkout-item-compact-row">
                    <div className="compact-info">
                      <span className="compact-title">{item.productTitle}</span>
                      <span className="compact-qty">Quantity: {item.quantity}</span>
                    </div>
                    <div className="compact-price">
                      {formatPrice(item.netTotal || item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Delivery & Pricing Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', background: '#fafbfc', padding: '1rem', borderRadius: '10px' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.35rem 0', color: '#103b68', fontSize: '0.9rem' }}>Delivery Address</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#526176', lineHeight: 1.5 }}>
                    {order.shippingAddress?.fullName}
                    <br />
                    {order.shippingAddress?.addressLine1}
                    <br />
                    {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.postalCode}
                  </p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <h4 style={{ margin: '0 0 0.35rem 0', color: '#103b68', fontSize: '0.9rem' }}>Order Total</h4>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#103b68' }}>
                    {formatPrice(order.pricing?.total || 0)}
                  </div>
                  {order.pricing?.discount > 0 && (
                    <span style={{ fontSize: '0.82rem', color: '#28734a', fontWeight: 600 }}>
                      Includes promo discount: &minus;{formatPrice(order.pricing.discount)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
