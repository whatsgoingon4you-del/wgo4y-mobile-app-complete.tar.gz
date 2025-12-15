/**
 * Video URL parsing and validation utilities
 * Supports YouTube and Vimeo links
 */

export interface VideoInfo {
  platform: 'youtube' | 'vimeo' | 'unknown';
  videoId: string | null;
  thumbnailUrl: string | null;
  embedUrl: string | null;
  isValid: boolean;
}

/**
 * Extract YouTube video ID from various URL formats
 * Supports: 
 * - youtube.com/watch?v=ID
 * - youtu.be/ID
 * - youtube.com/embed/ID
 * - youtube.com/shorts/ID (NEW)
 * - youtube.com/reel/ID (NEW)
 */
export const extractYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,  // YouTube Shorts
    /youtube\.com\/reel\/([a-zA-Z0-9_-]{11})/,    // YouTube Reels
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

/**
 * Extract Vimeo video ID from various URL formats
 * Supports: vimeo.com/ID, player.vimeo.com/video/ID
 */
export const extractVimeoId = (url: string): string | null => {
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

/**
 * Parse video URL and extract all relevant information
 */
export const parseVideoUrl = (url: string): VideoInfo => {
  if (!url || typeof url !== 'string') {
    return {
      platform: 'unknown',
      videoId: null,
      thumbnailUrl: null,
      embedUrl: null,
      isValid: false,
    };
  }

  // Try YouTube
  const youtubeId = extractYouTubeId(url);
  if (youtubeId) {
    return {
      platform: 'youtube',
      videoId: youtubeId,
      thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
      embedUrl: `https://www.youtube.com/embed/${youtubeId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`,
      isValid: true,
    };
  }

  // Try Vimeo
  const vimeoId = extractVimeoId(url);
  if (vimeoId) {
    return {
      platform: 'vimeo',
      videoId: vimeoId,
      // Note: Vimeo thumbnails require API call, we'll handle this in the component
      thumbnailUrl: null,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
      isValid: true,
    };
  }

  return {
    platform: 'unknown',
    videoId: null,
    thumbnailUrl: null,
    embedUrl: null,
    isValid: false,
  };
};

/**
 * Validate if a URL is a supported video platform
 */
export const isValidVideoUrl = (url: string): boolean => {
  const videoInfo = parseVideoUrl(url);
  return videoInfo.isValid;
};

/**
 * Get platform name for display
 */
export const getPlatformName = (platform: string): string => {
  switch (platform) {
    case 'youtube':
      return 'YouTube';
    case 'vimeo':
      return 'Vimeo';
    default:
      return 'Unknown';
  }
};
