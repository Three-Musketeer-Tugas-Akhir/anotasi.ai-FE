/**
 * Classification feature types.
 * Describes the shape of video data used in the JBI classification workflow.
 */

/** Possible categorization states for a video's JBI type */
export type VideoStatus = 'uncategorized' | 'sibi' | 'bisindo';

/** A video entity from the dataset */
export interface Video {
  id: string;
  /** YouTube video ID (e.g. wILYlf-_pv8) */
  youtubeId: string;
  title: string;
  duration: string;
  date: string;
  status: VideoStatus;
}

/** Payload for updating a video's classification status */
export interface UpdateVideoStatusPayload {
  id: string;
  status: VideoStatus;
}
