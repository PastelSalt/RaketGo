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
    <article className="card space-y-3">
      <div className="job-card-head">
        <div className="flex-1 min-w-0 space-y-1">
          <h3 className="text-lg font-semibold tracking-tight text-brand-ink line-clamp-2">
            <Link href={`/jobs/${job.job_id}`} className="hover:text-brand-red-strong transition-colors">
              {job.job_title}
            </Link>
          </h3>
          {job.employer_name ? <p className="muted truncate">{job.employer_name}</p> : null}
        </div>
        <div className="flex flex-wrap justify-end gap-1.5 ml-2 flex-shrink-0">
          {isFresh ? <span className="tag text-xs">New</span> : null}
          <span className="tag text-xs capitalize">{job.job_status}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {job.job_category ? (
          <span className="filter-chip text-xs">{job.job_category}</span>
        ) : null}
        <span className="filter-chip text-xs capitalize">{job.pay_type}</span>
      </div>
      <p className="text-base font-bold text-brand-ink">
        {formatCurrency(Number(job.pay_amount))}
      </p>
      <p className="muted truncate">
        {job.location_city}, {job.location_region}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <p className="muted text-xs">{timeAgo(job.created_at)}</p>
        <Link href={`/jobs/${job.job_id}`} className="btn btn-primary btn-small">
          View Job
        </Link>
      </div>
    </article>
  );
}
