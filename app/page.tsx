const sections = [
  "Overview",
  "Missing Coverage",
  "Benchmark",
  "Actions",
  "Evidence"
];

export default function Home() {
  return (
    <main className="page">
      <h1>Local SEO Scoring App</h1>

      <div className="sections" aria-label="Local SEO scoring sections">
        {sections.map((section) => (
          <section className="section" key={section}>
            <h2>{section}</h2>
          </section>
        ))}
      </div>
    </main>
  );
}
