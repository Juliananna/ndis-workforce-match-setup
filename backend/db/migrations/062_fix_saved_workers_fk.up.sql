DELETE FROM saved_workers sw
WHERE NOT EXISTS (
  SELECT 1 FROM workers w WHERE w.worker_id = sw.worker_id
);

ALTER TABLE saved_workers
  DROP CONSTRAINT IF EXISTS saved_workers_worker_id_fkey;

ALTER TABLE saved_workers
  ADD CONSTRAINT saved_workers_worker_id_fkey
    FOREIGN KEY (worker_id) REFERENCES workers(worker_id) ON DELETE CASCADE;
