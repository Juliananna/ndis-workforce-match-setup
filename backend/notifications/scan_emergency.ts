import { api } from "encore.dev/api";
import { CronJob } from "encore.dev/cron";
import db from "../db";
import { emergencyShiftTopic } from "./topic";

export const scanEmergencyShifts = api(
  { expose: false, method: "POST", path: "/notifications/internal/scan-emergency" },
  async (): Promise<void> => {
    type JobRow = {
      job_id: string;
      employer_id: string;
      location: string;
      shift_date: string;
      shift_start_time: string;
      shift_duration_hours: number;
      weekday_rate: number;
      support_type_tags: string[] | null;
      response_deadline: Date | null;
    };

    const jobs = db.query<JobRow>`
      SELECT job_id, employer_id, location, shift_date::text, shift_start_time,
             shift_duration_hours, weekday_rate, support_type_tags, response_deadline
      FROM job_requests
      WHERE is_emergency = TRUE
        AND status = 'Open'
        AND (response_deadline IS NULL OR response_deadline > NOW())
        AND created_at > NOW() - INTERVAL '2 hours'
    `;

    for await (const job of jobs) {
      type WorkerRow = { user_id: string };

      const workers = db.query<WorkerRow>`
        SELECT DISTINCT u.user_id
        FROM workers w
        JOIN users u ON u.user_id = w.user_id
        LEFT JOIN notifications n ON
          n.user_id = u.user_id
          AND n.type = 'EMERGENCY_SHIFT_AVAILABLE'
          AND n.body LIKE ${"%" + job.job_id + "%"}
        WHERE n.id IS NULL
        LIMIT 200
      `;

      const workerUserIds: string[] = [];
      for await (const w of workers) {
        workerUserIds.push(w.user_id);
      }

      if (workerUserIds.length > 0) {
        await emergencyShiftTopic.publish({
          jobId: job.job_id,
          employerId: job.employer_id,
          location: job.location,
          shiftDate: job.shift_date,
          shiftStartTime: job.shift_start_time,
          shiftDurationHours: job.shift_duration_hours,
          weekdayRate: job.weekday_rate,
          supportTypeTags: job.support_type_tags ?? [],
          responseDeadline: job.response_deadline?.toISOString() ?? null,
          workerUserIds,
        });
      }
    }
  }
);

export const _emergencyCron = new CronJob("scan-emergency-shifts", {
  title: "Notify workers of new emergency shifts",
  every: "1h",
  endpoint: scanEmergencyShifts,
});
