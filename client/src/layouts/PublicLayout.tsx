import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';

export function PublicLayout() {
  const { user } = useAuth();
  const { itemCount } = useCart();

  return (
    <div className="app-shell public-shell">
      <header className="site-header">
        <Link className="brand" to="/">
          ArtisanCart
        </Link>
        <nav aria-label="Public navigation">
          <Link to="/products">Explore Products</Link>
          {user ? (
            <>
              {user.role === 'customer' && (
                <Link to="/customer/cart">
                  Cart
                  {itemCount > 0 && <span className="nav-badge-count">{itemCount}</span>}
                </Link>
              )}
              <Link to={`/${user.role}`}>Dashboard ({user.firstName})</Link>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link className="button button--small" to="/register">
                Create account
              </Link>
            </>
          )}
        </nav>
      </header>
      <main className="page-container">
        <Outlet />
      </main>
    </div>
  );
}
