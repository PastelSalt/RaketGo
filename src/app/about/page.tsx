import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="mx-auto grid max-w-4xl gap-6">
      <section className="card space-y-3">
        <h1 className="page-title">About RaketGo</h1>
        <p className="text-sm leading-7 text-brand-ink">
          RaketGo is built to connect workers and employers across the Philippines
          through faster, clearer, and more reliable job matching. The platform is
          designed to reduce hiring friction by keeping job discovery, messaging,
          applications, and skill learning in one place.
        </p>
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">Our Goal</h2>
        <p className="text-sm leading-7 text-brand-ink">
          The goal of RaketGo is to make earning opportunities more accessible to
          workers while helping employers find qualified candidates quickly.
          RaketGo focuses on practical workflows: trusted listings, targeted
          recommendations, and transparent communication from search to hiring.
        </p>
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">Creator</h2>
        <p className="text-sm leading-7 text-brand-ink">
          RaketGo is created by Moesoft.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className="btn btn-primary btn-small">
            Explore Jobs
          </Link>
          <Link href="/help" className="btn btn-outline btn-small">
            Open Help Tutorial
          </Link>
        </div>
      </section>
    </div>
  );
}
