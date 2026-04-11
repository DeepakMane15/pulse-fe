import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { VideoJobSocketPayload } from '../types/video';

export type UploadPhase = 'idle' | 'sending' | 'processing' | 'done' | 'error';

export type VideoUploadState = {
  phase: UploadPhase;
  jobId: string | null;
  jobStatus: string;
  jobProgress: number;
  httpPercent: number;
  errorMessage: string | null;
  savedAsTitle: string | null;
  title: string;
  description: string;
  /** Snapshot when a file was chosen (File itself is not persisted). */
  fileMeta: { name: string; size: number } | null;
  /** Clears persisted state if the logged-in tenant changes. */
  contextTenantId: string | null;
};

const initialState: VideoUploadState = {
  phase: 'idle',
  jobId: null,
  jobStatus: 'pending',
  jobProgress: 0,
  httpPercent: 0,
  errorMessage: null,
  savedAsTitle: null,
  title: '',
  description: '',
  fileMeta: null,
  contextTenantId: null
};

export const videoUploadSlice = createSlice({
  name: 'videoUpload',
  initialState,
  reducers: {
    reset: () => ({ ...initialState }),

    setInlineError: (state: VideoUploadState, action: PayloadAction<string | null>) => {
      state.errorMessage = action.payload;
    },

    setTitle: (state: VideoUploadState, action: PayloadAction<string>) => {
      state.title = action.payload;
    },
    setDescription: (state: VideoUploadState, action: PayloadAction<string>) => {
      state.description = action.payload;
    },
    setFileMeta: (
      state: VideoUploadState,
      action: PayloadAction<{ name: string; size: number } | null>
    ) => {
      state.fileMeta = action.payload;
    },

    startSending: (state: VideoUploadState, action: PayloadAction<{ tenantId: string }>) => {
      state.phase = 'sending';
      state.httpPercent = 0;
      state.jobProgress = 0;
      state.jobStatus = 'pending';
      state.errorMessage = null;
      state.jobId = null;
      state.savedAsTitle = null;
      state.contextTenantId = action.payload.tenantId;
    },

    setHttpPercent: (state: VideoUploadState, action: PayloadAction<number>) => {
      state.httpPercent = action.payload;
    },

    uploadAccepted: (
      state: VideoUploadState,
      action: PayloadAction<{
        jobId: string;
        status: string;
        titleAdjusted: boolean;
        title: string | null;
        tenantId: string;
      }>
    ) => {
      state.phase = 'processing';
      state.jobId = action.payload.jobId;
      state.jobStatus = action.payload.status;
      state.contextTenantId = action.payload.tenantId;
      state.savedAsTitle =
        action.payload.titleAdjusted && action.payload.title
          ? action.payload.title.trim()
          : null;
      state.jobProgress = action.payload.status === 'pending' ? 8 : 15;
    },

    applyJobUpdate: (state: VideoUploadState, action: PayloadAction<VideoJobSocketPayload>) => {
      const p = action.payload;
      if (state.jobId && String(p.jobId) !== state.jobId) return;
      state.jobStatus = p.status;
      if (typeof p.progress === 'number') {
        state.jobProgress = Math.min(100, Math.max(0, p.progress));
      }
      if (p.errorMessage) state.errorMessage = p.errorMessage;
      if (p.status === 'completed') {
        state.phase = 'done';
        state.jobProgress = 100;
      }
      if (p.status === 'failed') {
        state.phase = 'error';
      }
    },

    syncJobFromApi: (
      state: VideoUploadState,
      action: PayloadAction<{ status: string; errorMessage?: string | null }>
    ) => {
      const { status } = action.payload;
      state.jobStatus = status;
      if (action.payload.errorMessage) state.errorMessage = action.payload.errorMessage;
      if (status === 'completed') {
        state.phase = 'done';
        state.jobProgress = 100;
      }
      if (status === 'failed') {
        state.phase = 'error';
      }
    },

    uploadFailed: (state: VideoUploadState, action: PayloadAction<string>) => {
      state.phase = 'error';
      state.errorMessage = action.payload;
    },

    /** Page refresh during HTTP upload — cannot resume. */
    markSendInterrupted: (state: VideoUploadState) => {
      if (state.phase !== 'sending') return;
      state.phase = 'error';
      state.errorMessage =
        'Upload was interrupted (page refreshed or closed). Please choose the file and try again.';
      state.httpPercent = 0;
      state.jobId = null;
      state.jobStatus = 'pending';
      state.jobProgress = 0;
    },

    clearIfTenantMismatch: (
      state: VideoUploadState,
      action: PayloadAction<string | undefined>
    ) => {
      const tid = action.payload;
      if (!tid || !state.contextTenantId) return;
      if (tid !== state.contextTenantId) {
        return { ...initialState };
      }
    }
  }
});

export const {
  reset,
  setInlineError,
  setTitle,
  setDescription,
  setFileMeta,
  startSending,
  setHttpPercent,
  uploadAccepted,
  applyJobUpdate,
  syncJobFromApi,
  uploadFailed,
  markSendInterrupted,
  clearIfTenantMismatch
} = videoUploadSlice.actions;
