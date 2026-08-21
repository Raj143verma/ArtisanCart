import { Link } from 'react-router-dom';

export function HomePage() {
  return <section className="hero"><span className="eyebrow">Marketplace foundation</span><h1>ArtisanCart</h1><p>The application foundation is ready for the customer, seller, and admin experiences.</p><div className="hero-actions"><Link className="button" to="/register">Create account</Link><Link className="button button--secondary" to="/login">Log in</Link></div></section>;
}
