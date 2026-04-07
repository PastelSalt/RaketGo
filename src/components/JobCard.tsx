import Link from "next/link";
import { formatCurrency, timeAgo } from "@/lib/utils";

interface JobCardProps {
  job: {
    job_id: number;
    job_title: string;
    location_city: string;
    location_region: string;
    pay_amount: number;
    pay_type: string;
    job_status: string;
    job_category?: string | null;
    employer_name?: string;
    created_at: string;
  };
}

export function JobCard({ job }: JobCardProps) {
  const isFresh = Date.now() - new Date(job.created_at).getTime() <= 24 * 60 * 60 * 1000;

  return (
    <article className="card space-y-3 transition-colors hover:border-brand-blue-strong">
      <div className="job-card-head">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight text-brand-ink">
            <Link href={`/jobs/${job.job_id}`} className="hover:text-brand-ink-soft">
              {job.job_title}
            </Link>
          </h3>
          {job.employer_name ? <p className="muted">{job.employer_name}</p> : null}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {isFresh ? <span className="tag">New</span> : null}
          <span className="tag">{job.job_status}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {job.job_category ? <span className="filter-chip">{job.job_category}</span> : null}
        <span className="filter-chip">{job.pay_type}</span>
      </div>
      <p className="text-base font-semibold text-brand-ink">{formatCurrency(Number(job.pay_amount))}</p>
      <p className="muted">
        {job.location_city}, {job.location_region}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="muted">Posted {timeAgo(job.created_at)}</p>
        <Link href={`/jobs/${job.job_id}`} className="btn btn-primary btn-small">
          View Job
        </Link>
      </div>
    </article>
  );
}
