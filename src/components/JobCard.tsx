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
    employer_name?: string;
    created_at: string;
  };
}

export function JobCard({ job }: JobCardProps) {
  return (
    <article className="card space-y-2">
      <div className="job-card-head">
        <h3 className="text-lg font-semibold tracking-tight text-brand-ink">
          <Link href={`/jobs/${job.job_id}`} className="hover:text-brand-ink-soft">
            {job.job_title}
          </Link>
        </h3>
        <span className="tag">{job.job_status}</span>
      </div>
      <p className="muted">
        {job.location_city}, {job.location_region}
      </p>
      <p className="muted">
        {formatCurrency(Number(job.pay_amount))} / {job.pay_type}
      </p>
      <p className="muted">Posted {timeAgo(job.created_at)}</p>
      {job.employer_name ? <p className="muted">Employer: {job.employer_name}</p> : null}
    </article>
  );
}
