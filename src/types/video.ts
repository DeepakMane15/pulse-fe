export type VideoRecord = {
  _id: string;
  tenantId: string;
  uploadedBy: string;
  title: string | null;
  description: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  s3Url: string;
  processingStatus: string;
  sensitivityStatus: string;
  createdAt?: string;
  updatedAt?: string;
};

export type UploadAcceptedResponse = {
  message: string;
  data: {
    jobId: string;
    status: string;
    title: string | null;
    titleAdjusted?: boolean;
    requestedTitle?: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt?: string;
  };
};

export type VideoJobSocketPayload = {
  jobId: string;
  tenantId?: string;
  status: string;
  progress: number;
  errorMessage?: string | null;
  videoId?: string;
  s3Url?: string;
  processingStatus?: string;
  sensitivityStatus?: string;
};
