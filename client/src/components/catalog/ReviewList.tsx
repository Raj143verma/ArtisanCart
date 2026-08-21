import type { PaginationMeta, ProductReview } from '../../types/catalog';

interface ReviewListProps {
  reviews: ProductReview[];
  meta: PaginationMeta;
}

export function ReviewList({ reviews, meta }: ReviewListProps) {
  const averageRating = meta.averageRating ?? (reviews.length > 0 ? 5 : null);

  const renderStars = (rating: number) => {
    return '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
  };

  return (
    <section className="reviews-section" aria-label="Customer Reviews">
      <div className="reviews-header">
        <h3>Customer Reviews ({meta.total})</h3>
        {averageRating !== null && (
          <div className="reviews-summary-badge">
            <span className="star-icon">★</span>
            <span>{averageRating.toFixed(1)} out of 5</span>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <p style={{ color: '#526176', fontStyle: 'italic' }}>
          No reviews yet. Be the first to share your thoughts on this handcrafted creation!
        </p>
      ) : (
        <div className="reviews-list">
          {reviews.map((review) => (
            <article key={review._id} className="review-card">
              <div className="review-card-header">
                <div>
                  <span className="review-stars" aria-label={`${review.rating} stars`}>
                    {renderStars(review.rating)}
                  </span>
                  <span className="review-author" style={{ marginLeft: '0.6rem' }}>
                    {review.user?.firstName || 'Verified Customer'} {review.user?.lastName?.slice(0, 1) || ''}.
                  </span>
                </div>
                {review.createdAt && (
                  <time className="review-date">
                    {new Date(review.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </time>
                )}
              </div>

              {review.title && <h4 className="review-title">{review.title}</h4>}
              <p className="review-comment">{review.comment}</p>

              {review.sellerReply && (
                <div className="review-seller-reply">
                  <span className="reply-label">Artisan Response:</span>
                  <p>{review.sellerReply.comment}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
