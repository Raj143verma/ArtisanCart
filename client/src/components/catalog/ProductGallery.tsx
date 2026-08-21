import { useState } from 'react';
import type { ProductImage } from '../../types/catalog';

interface ProductGalleryProps {
  images?: ProductImage[];
  title: string;
}

export function ProductGallery({ images = [], title }: ProductGalleryProps) {
  const sortedImages = [...images].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
  );

  const [activeIndex, setActiveIndex] = useState(0);

  const activeImage = sortedImages[activeIndex] || sortedImages[0];

  return (
    <div className="product-gallery-wrap">
      <div className="product-gallery-main">
        {activeImage?.url ? (
          <img src={activeImage.url} alt={`${title} preview`} />
        ) : (
          <div className="product-card-placeholder-img">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span>Handmade Artisan Piece</span>
          </div>
        )}
      </div>

      {sortedImages.length > 1 && (
        <div className="product-gallery-thumbs" role="tablist" aria-label="Product thumbnails">
          {sortedImages.map((img, idx) => (
            <button
              key={img._id || idx}
              type="button"
              className={`thumb-btn ${idx === activeIndex ? 'active' : ''}`}
              onClick={() => setActiveIndex(idx)}
              aria-label={`Show image ${idx + 1}`}
              role="tab"
              aria-selected={idx === activeIndex}
            >
              <img src={img.url} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
