import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function CustomerLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="app-shell dashboard-shell">
      <header className="site-header">
        <Link className="brand" to="/customer">ArtisanCart</Link>
        <nav aria-label="Customer navigation">
          <Link to="/customer/products">Products</Link><Link to="/customer/cart">Cart</Link><Link to="/customer/orders">Orders</Link>
          <span className="user-label">{user?.firstName}</span><button className="button button--small" onClick={() => void logout()}>Log out</button>
        </nav>
      </header>
      <main className="page-container"><Outlet /></main>
    </div>
  );
}
