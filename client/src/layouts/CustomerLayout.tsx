import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { useWishlist } from '../hooks/useWishlist';

export function CustomerLayout() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const { totalCount: wishlistCount } = useWishlist();

  return (
    <div className="app-shell dashboard-shell">
      <header className="site-header">
        <Link className="brand" to="/customer">
          ArtisanCart
        </Link>
        <nav aria-label="Customer navigation">
          <Link to="/customer/products">Products</Link>
          <Link to="/customer/wishlist">
            Wishlist
            {wishlistCount > 0 && (
              <span className="nav-badge-count" aria-label={`${wishlistCount} items in wishlist`}>
                {wishlistCount}
              </span>
            )}
          </Link>
          <Link to="/customer/cart">
            Cart
            {itemCount > 0 && (
              <span className="nav-badge-count" aria-label={`${itemCount} items in cart`}>
                {itemCount}
              </span>
            )}
          </Link>
          <Link to="/customer/orders">Orders</Link>
          <span className="user-label">{user?.firstName}</span>
          <button className="button button--small" onClick={() => void logout()}>
            Log out
          </button>
        </nav>
      </header>
      <main className="page-container">
        <Outlet />
      </main>
    </div>
  );
}
