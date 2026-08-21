import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getProductById,
  listProductReviews,
  listVariants,
} from '../services/catalogService';
import type {
  PaginationMeta,
  Product,
  ProductReview,
  ProductVariant,
} from '../types/catalog';
import { getApiErrorMessage } from '../services/apiError';

export function useProductDetail(productIdOverride?: string) {
  const { id } = useParams<{ id: string }>();
  const productId = productIdOverride || id;

  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewsMeta, setReviewsMeta] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 1,
    averageRating: 5,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProductData = useCallback(async () => {
    if (!productId) {
      setError('Product identifier is missing.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [productData, variantsData, reviewsData] = await Promise.all([
        getProductById(productId),
        listVariants(productId).catch(() => []),
        listProductReviews(productId).catch(() => ({
          docs: [],
          meta: { total: 0, page: 1, limit: 10, pages: 1, averageRating: 5 },
        })),
      ]);

      setProduct(productData);
      setVariants(variantsData);

      // Auto-select first active variant if available
      const activeVariant = variantsData.find((v) => v.isActive) || variantsData[0] || null;
      setSelectedVariant(activeVariant);

      setReviews(reviewsData.docs);
      setReviewsMeta(reviewsData.meta);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Product not found or unavailable.'));
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProductData();
  }, [fetchProductData]);

  // Resolve current effective price and inventory
  const effectivePrice = selectedVariant?.price ?? product?.basePrice ?? 0;
  const currentInventory = selectedVariant?.inventory;

  return {
    productId,
    product,
    variants,
    selectedVariant,
    setSelectedVariant,
    reviews,
    reviewsMeta,
    effectivePrice,
    currentInventory,
    isLoading,
    error,
    refetch: fetchProductData,
  };
}
