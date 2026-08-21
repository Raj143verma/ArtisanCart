import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function AdminLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="app-shell dashboard-shell">
      <header className="site-header">
        <Link className="brand" to="/admin">ArtisanCart Admin</Link>
        <nav aria-label="Admin navigation">
          <Link to="/admin/stores">Stores</Link><Link to="/admin/kyc">KYC</Link><Link to="/admin/orders">Orders</Link><Link to="/admin/returns">Returns</Link><Link to="/admin/payouts">Payouts</Link><Link to="/admin/audit-logs">Audit logs</Link>
          <span className="user-label">{user?.firstName}</span><button className="button button--small" onClick={() => void logout()}>Log out</button>
        </nav>
      </header>
      <main className="page-container"><Outlet /></main>
    </div>
  );
}
