import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { useAuthedBackend } from "../hooks/useAuthedBackend";
import { useProxyUpload } from "../hooks/useProxyUpload";
import { OrgProfileSection } from "../components/employer/OrgProfileSection";
import { JobRequestList } from "../components/employer/JobRequestList";
import { JobRequestForm } from "../components/employer/JobRequestForm";
import { JobRequestDetail } from "../components/employer/JobRequestDetail";
import type { EmployerProfile } from "~backend/employers/profile_get";
import type { UpdateEmployerProfileRequest } from "~backend/employers/profile_update";
import type { JobRequest } from "~backend/jobs/get";
import type { CreateJobRequestRequest } from "~backend/jobs/create";
import type { UpdateJobRequestRequest } from "~backend/jobs/update";
import type { Offer } from "~backend/offers/types";

type View = "list" | "new" | "detail";

export default function EmployerDashboardPage() {
  const api = useAuthedBackend();
  const proxy = useProxyUpload();
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [jobs, setJobs] = useState<JobRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("list");
  const [selectedJob, setSelectedJob] = useState<JobRequest | null>(null);

  const load = useCallback(async () => {
    if (!api) return;
    try {
      const [profileRes, jobsRes] = await Promise.allSettled([
        api.employers.getEmployerProfile(),
        api.jobs.listJobRequests(),
      ]);
      if (profileRes.status === "fulfilled") setProfile(profileRes.value);
      if (jobsRes.status === "fulfilled") setJobs(jobsRes.value.jobs);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveProfile = async (req: UpdateEmployerProfileRequest): Promise<EmployerProfile> => {
    const updated = await api!.employers.updateEmployerProfile(req);
    setProfile(updated);
    return updated;
  };

  const handleUploadLogo = async (file: File) => {
    const { logoUrl } = await proxy.uploadEmployerLogo(file);
    setProfile((prev) => prev ? { ...prev, logoUrl: logoUrl ?? null } : prev);
  };

  const handleCreateJob = async (req: CreateJobRequestRequest) => {
    const job = await api!.jobs.createJobRequest(req);
    setJobs((prev) => [job, ...prev]);
    setView("list");
  };

  const handleUpdateJob = async (req: UpdateJobRequestRequest): Promise<JobRequest> => {
    const updated = await api!.jobs.updateJobRequest(req);
    setJobs((prev) => prev.map((j) => j.jobId === updated.jobId ? updated : j));
    return updated;
  };

  const handleCancelJob = async (jobId: string) => {
    const updated = await api!.jobs.cancelJobRequest({ jobId });
    setJobs((prev) => prev.map((j) => j.jobId === updated.jobId ? updated : j));
    if (selectedJob?.jobId === jobId) {
      setSelectedJob(updated);
    }
  };

  const handleViewJob = (job: JobRequest) => {
    setSelectedJob(job);
    setView("detail");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <OrgProfileSection profile={profile} onSave={handleSaveProfile} onUploadLogo={handleUploadLogo} />

      {view === "list" && (
        <JobRequestList
          jobs={jobs}
          onNew={() => setView("new")}
          onView={handleViewJob}
        />
      )}

      {view === "new" && (
        <JobRequestForm
          onSubmit={handleCreateJob}
          onCancel={() => setView("list")}
        />
      )}

      {view === "detail" && selectedJob && (
        <JobRequestDetail
          job={selectedJob}
          onBack={() => setView("list")}
          onUpdate={handleUpdateJob}
          onCancel={handleCancelJob}
          onSendOffer={async (workerId: string, rate: number, notes: string): Promise<Offer> => {
            return api!.offers.createOffer({ jobId: selectedJob.jobId, workerId, offeredRate: rate, additionalNotes: notes || undefined });
          }}
        />
      )}
    </div>
  );
}
