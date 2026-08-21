interface LoadingSkeletonProps {
  type?: 'card' | 'text' | 'image' | 'detail';
  count?: number;
}

export function LoadingSkeleton({ type = 'card', count = 1 }: LoadingSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (type === 'card') {
    return (
      <div className="skeleton-grid" aria-busy="true" aria-label="Loading products">
        {items.map((key) => (
          <div key={key} className="skeleton-card">
            <div className="skeleton-image shimmer" />
            <div className="skeleton-body">
              <div className="skeleton-line shimmer short" />
              <div className="skeleton-line shimmer medium" />
              <div className="skeleton-line shimmer long" />
              <div className="skeleton-line shimmer button-like" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'detail') {
    return (
      <div className="skeleton-detail-layout" aria-busy="true" aria-label="Loading product details">
        <div className="skeleton-gallery shimmer" />
        <div className="skeleton-content">
          <div className="skeleton-line shimmer eyebrow-like" />
          <div className="skeleton-line shimmer title-like" />
          <div className="skeleton-line shimmer price-like" />
          <div className="skeleton-line shimmer desc-like" />
          <div className="skeleton-line shimmer variant-like" />
          <div className="skeleton-line shimmer button-like" />
        </div>
      </div>
    );
  }

  return (
    <div className="skeleton-container" aria-busy="true">
      {items.map((key) => (
        <div key={key} className={`skeleton-${type} shimmer`} />
      ))}
    </div>
  );
}
