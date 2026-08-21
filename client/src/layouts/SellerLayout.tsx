import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function SellerLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="app-shell dashboard-shell">
      <header className="site-header">
        <Link className="brand" to="/seller">ArtisanCart Seller</Link>
        <nav aria-label="Seller navigation">
          <Link to="/seller/products">Products</Link><Link to="/seller/orders">Orders</Link><Link to="/seller/kyc">KYC</Link><Link to="/seller/payouts">Payouts</Link>
          <span className="user-label">{user?.firstName}</span><button className="button button--small" onClick={() => void logout()}>Log out</button>
        </nav>
      </header>
      <main className="page-container"><Outlet /></main>
    </div>
  );
}
