import { Link, Outlet } from 'react-router-dom';

export function PublicLayout() {
  return (
    <div className="app-shell public-shell">
      <header className="site-header">
        <Link className="brand" to="/">ArtisanCart</Link>
        <nav aria-label="Public navigation">
          <Link to="/login">Log in</Link>
          <Link className="button button--small" to="/register">Create account</Link>
        </nav>
      </header>
      <main className="page-container"><Outlet /></main>
    </div>
  );
}
