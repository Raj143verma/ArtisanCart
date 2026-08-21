import { useState, type FormEvent } from 'react';
import type { Address } from '../../types/checkout';

interface AddressFormProps {
  initialShipping?: Address | null;
  initialBilling?: Address | null;
  onSubmit: (shipping: Address, billing?: Address | null) => Promise<boolean>;
  isSubmitting?: boolean;
}

const DEFAULT_ADDRESS: Address = {
  fullName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'United States',
};

export function AddressForm({
  initialShipping,
  initialBilling,
  onSubmit,
  isSubmitting = false,
}: AddressFormProps) {
  const [shipping, setShipping] = useState<Address>(initialShipping || DEFAULT_ADDRESS);
  const [sameAsBilling, setSameAsBilling] = useState(!initialBilling);
  const [billing, setBilling] = useState<Address>(initialBilling || DEFAULT_ADDRESS);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit(shipping, sameAsBilling ? null : billing);
  };

  return (
    <form className="checkout-address-form" onSubmit={handleSubmit}>
      <div className="form-section">
        <h3 className="section-title">1. Shipping Address</h3>
        <p className="section-desc">
          Enter the delivery address where your handcrafted treasures will be safely delivered.
        </p>

        <div className="form-grid">
          <label>
            Full Name *
            <input
              type="text"
              required
              autoComplete="name"
              value={shipping.fullName}
              onChange={(e) => setShipping({ ...shipping, fullName: e.target.value })}
              placeholder="e.g. Jane Doe"
            />
          </label>

          <label>
            Phone Number *
            <input
              type="tel"
              required
              autoComplete="tel"
              value={shipping.phone}
              onChange={(e) => setShipping({ ...shipping, phone: e.target.value })}
              placeholder="e.g. +1 (555) 000-0000"
            />
          </label>
        </div>

        <label>
          Street Address *
          <input
            type="text"
            required
            autoComplete="address-line1"
            value={shipping.addressLine1}
            onChange={(e) => setShipping({ ...shipping, addressLine1: e.target.value })}
            placeholder="House / Flat number, Street name"
          />
        </label>

        <label>
          Apartment, Suite, Unit (Optional)
          <input
            type="text"
            autoComplete="address-line2"
            value={shipping.addressLine2 || ''}
            onChange={(e) => setShipping({ ...shipping, addressLine2: e.target.value })}
            placeholder="Apt 4B, Building 2"
          />
        </label>

        <div className="form-grid-3">
          <label>
            City *
            <input
              type="text"
              required
              autoComplete="address-level2"
              value={shipping.city}
              onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
              placeholder="City"
            />
          </label>

          <label>
            State / Region *
            <input
              type="text"
              required
              autoComplete="address-level1"
              value={shipping.state}
              onChange={(e) => setShipping({ ...shipping, state: e.target.value })}
              placeholder="State / Province"
            />
          </label>

          <label>
            Postal Code *
            <input
              type="text"
              required
              autoComplete="postal-code"
              value={shipping.postalCode}
              onChange={(e) => setShipping({ ...shipping, postalCode: e.target.value })}
              placeholder="ZIP / Postal Code"
            />
          </label>
        </div>

        <label>
          Country *
          <input
            type="text"
            required
            autoComplete="country-name"
            value={shipping.country}
            onChange={(e) => setShipping({ ...shipping, country: e.target.value })}
            placeholder="Country"
          />
        </label>
      </div>

      {/* Billing Address Toggle */}
      <div className="billing-toggle-wrap">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={sameAsBilling}
            onChange={(e) => setSameAsBilling(e.target.checked)}
          />
          <span>Billing address is the same as shipping address</span>
        </label>
      </div>

      {!sameAsBilling && (
        <div className="form-section billing-section">
          <h3 className="section-title">Billing Address</h3>
          <div className="form-grid">
            <label>
              Full Name *
              <input
                type="text"
                required
                value={billing.fullName}
                onChange={(e) => setBilling({ ...billing, fullName: e.target.value })}
              />
            </label>
            <label>
              Phone *
              <input
                type="tel"
                required
                value={billing.phone}
                onChange={(e) => setBilling({ ...billing, phone: e.target.value })}
              />
            </label>
          </div>
          <label>
            Street Address *
            <input
              type="text"
              required
              value={billing.addressLine1}
              onChange={(e) => setBilling({ ...billing, addressLine1: e.target.value })}
            />
          </label>
          <div className="form-grid-3">
            <label>
              City *
              <input
                type="text"
                required
                value={billing.city}
                onChange={(e) => setBilling({ ...billing, city: e.target.value })}
              />
            </label>
            <label>
              State *
              <input
                type="text"
                required
                value={billing.state}
                onChange={(e) => setBilling({ ...billing, state: e.target.value })}
              />
            </label>
            <label>
              Postal Code *
              <input
                type="text"
                required
                value={billing.postalCode}
                onChange={(e) => setBilling({ ...billing, postalCode: e.target.value })}
              />
            </label>
          </div>
        </div>
      )}

      <div className="form-actions">
        <button
          type="submit"
          className="button button--checkout"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Holding Inventory...' : 'Continue to Order Review &rarr;'}
        </button>
      </div>
    </form>
  );
}
