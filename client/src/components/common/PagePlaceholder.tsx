interface PagePlaceholderProps {
  title: string;
  description: string;
}

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <section className="placeholder-page">
      <span className="eyebrow">ArtisanCart foundation</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  );
}
