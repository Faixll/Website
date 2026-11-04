/** Skeleton while a page's data/grid loads: beige-deep blocks with a soft shimmer (layout reserved, no jump). */
export default function Loading() {
  return (
    <main className="container section" aria-busy="true" aria-live="polite">
      <div className="skeleton" style={{ height: 32, width: '40%', marginBottom: 24 }} />
      <div className="grid">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="card" aria-hidden>
            <div className="skeleton" style={{ aspectRatio: '1' }} />
            <div className="skeleton" style={{ height: 18, marginTop: 12, width: '80%' }} />
            <div className="skeleton" style={{ height: 16, marginTop: 8, width: '50%' }} />
          </div>
        ))}
      </div>
    </main>
  );
}
