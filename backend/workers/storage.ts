import { Bucket } from "encore.dev/storage/objects";

export const workerDocumentsBucket = new Bucket("worker-documents", { public: false });
export const workerVideosBucket = new Bucket("worker-videos", { public: false });
export const profilePhotosBucket = new Bucket("profile-photos", { public: true });
