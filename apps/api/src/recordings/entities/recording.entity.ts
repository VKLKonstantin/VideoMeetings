export type RecordingStatus = 'uploaded' | 'processing' | 'done' | 'error';

export interface Recording {
  id: string;
  meetingId: string;
  filename: string;
  size: number;
  format: string;
  status: RecordingStatus;
  uploadedAt: string;
  /** Absolute path on disk — internal only, never exposed via the API. */
  storedPath: string;
}
