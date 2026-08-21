import { Link } from 'react-router-dom';
import { CategoryNav } from '../components/catalog/CategoryNav';
import { ProductGrid } from '../components/catalog/ProductGrid';
import { useCatalog } from '../hooks/useCatalog';
import { useCategories } from '../hooks/useCategories';

export function HomePage() {
  const { categories } = useCategories();
  const { products, isLoading, error, refetch } = useCatalog({
    featured: true,
    limit: 8,
  });

  return (
    <div className="home-page-container">
      {/* Hero Banner */}
      <section className="hero" style={{ marginBottom: '3rem' }}>
        <span className="eyebrow">Direct from Makers</span>
        <h1>Unique Handcrafted Goods for Mindful Living</h1>
        <p>
          Discover one-of-a-kind ceramics, heirloom textiles, carved woodwork, and artisanal jewelry
          crafted by passionate independent makers.
        </p>
        <div className="hero-actions">
          <Link className="button" to="/products">
            Explore All Creations &rarr;
          </Link>
          <Link className="button button--secondary" to="/register">
            Join as Artisan
          </Link>
        </div>
      </section>

      {/* Featured Categories */}
      {categories.length > 0 && (
        <section style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.5rem', color: '#103b68', margin: 0 }}>Browse by Category</h2>
            <Link to="/products" style={{ fontSize: '0.9rem', fontWeight: 700 }}>
              View all &rarr;
            </Link>
          </div>
          <CategoryNav
            categories={categories}
            onSelectCategory={(id) => {
              if (id) window.location.assign(`/products?category=${id}`);
            }}
            variant="pills"
          />
        </section>
      )}

      {/* Featured Creations Showcase */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
          <div>
            <span className="eyebrow">Handpicked Highlights</span>
            <h2 style={{ fontSize: '1.6rem', color: '#103b68', margin: '0.25rem 0 0 0' }}>
              Featured Artisan Creations
            </h2>
          </div>
          <Link to="/products" className="button button--small button--secondary">
            See Catalog
          </Link>
        </div>

        <ProductGrid
          products={products}
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          emptyTitle="No featured items yet"
          emptyDescription="Explore our complete catalog to discover freshly crafted artisan items."
        />
      </section>
    </div>
  );
}
