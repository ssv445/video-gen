/**
 * Extracts YouTube Video ID from various URL formats.
 */
export function getYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

/**
 * Validates if a URL is a valid YouTube URL.
 */
export function isValidYouTubeUrl(url: string): boolean {
  return getYouTubeId(url) !== null;
}

/**
 * Gets YouTube thumbnail URL from video ID.
 */
export function getYouTubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

/**
 * Converts time string to seconds.
 * Supports HH:MM:SS, MM:SS, and SS formats.
 */
export function timeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map(Number);

  if (parts.length === 3) { // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) { // MM:SS
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1) { // SS
    return parts[0];
  }

  throw new Error(`Invalid time format: ${timeStr}`);
}

/**
 * Converts seconds to HH:MM:SS format.
 */
export function secondsToTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  return [h, m, s]
    .map(v => v < 10 ? '0' + v : v)
    .join(':');
}

/**
 * Validates time format (HH:MM:SS, MM:SS, or SS).
 */
export function isValidTimeFormat(timeStr: string): boolean {
  const timeRegex = /^(\d{1,2}:)?(\d{1,2}:)?\d{1,2}$/;
  return timeRegex.test(timeStr);
}

/**
 * Fetches YouTube video title via Next.js API route to avoid CORS issues.
 * No API key required!
 */
export async function fetchYouTubeTitle(videoId: string): Promise<string> {
  try {
    const response = await fetch(
      `/api/youtube/title/${videoId}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.title || `Video ${videoId}`;
  } catch (error) {
    console.error('Failed to fetch YouTube title:', error);
    return `Video ${videoId}`;
  }
}
