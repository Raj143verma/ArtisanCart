import type { ProductVariant } from '../../types/catalog';

interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedVariant: ProductVariant | null;
  onSelectVariant: (variant: ProductVariant) => void;
  currency?: string;
}

export function VariantSelector({
  variants,
  selectedVariant,
  onSelectVariant,
  currency = 'USD',
}: VariantSelectorProps) {
  if (variants.length <= 1 && (!variants[0] || variants[0].attributes.length === 0)) {
    return null;
  }

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);

  return (
    <div className="variant-selector-wrap" role="group" aria-label="Product Options">
      <h4>Options &amp; Variations</h4>

      <div className="variant-options-grid">
        {variants.map((variant) => {
          const isSelected = selectedVariant?._id === variant._id;
          const attrLabel =
            variant.attributes.map((a) => `${a.name}: ${a.value}`).join(' · ') ||
            variant.title ||
            variant.sku;

          return (
            <button
              key={variant._id}
              type="button"
              className={`variant-option-btn ${isSelected ? 'active' : ''}`}
              onClick={() => onSelectVariant(variant)}
              aria-pressed={isSelected}
            >
              <span>{attrLabel}</span>
              <span className="variant-price-tag">{formatPrice(variant.price)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
