/**
 * Music platform URL parser and validator
 * Supports: SoundCloud, Spotify, Apple Music, YouTube Music, Bandcamp, Audiomack
 */

export interface MusicPlatformInfo {
  platform: 'soundcloud' | 'spotify' | 'apple_music' | 'youtube_music' | 'bandcamp' | 'audiomack' | 'unknown';
  trackId: string | null;
  embedUrl: string | null;
}

export const parseMusicUrl = (url: string): MusicPlatformInfo => {
  const cleanUrl = url.trim().toLowerCase();

  // SoundCloud
  if (cleanUrl.includes('soundcloud.com')) {
    return {
      platform: 'soundcloud',
      trackId: url,
      embedUrl: url.replace('soundcloud.com', 'w.soundcloud.com/player/?url=https://soundcloud.com')
    };
  }

  // Spotify
  if (cleanUrl.includes('spotify.com')) {
    const trackMatch = url.match(/track\/([a-zA-Z0-9]+)/);
    const trackId = trackMatch ? trackMatch[1] : null;
    return {
      platform: 'spotify',
      trackId,
      embedUrl: trackId ? `https://open.spotify.com/embed/track/${trackId}` : null
    };
  }

  // Apple Music
  if (cleanUrl.includes('music.apple.com')) {
    return {
      platform: 'apple_music',
      trackId: url,
      embedUrl: url.replace('music.apple.com', 'embed.music.apple.com')
    };
  }

  // YouTube / YouTube Music (accept both regular YouTube and YouTube Music)
  if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
    const videoIdMatch = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/);
    const trackId = videoIdMatch ? videoIdMatch[1] : null;
    return {
      platform: 'youtube_music',
      trackId,
      embedUrl: trackId ? `https://www.youtube.com/embed/${trackId}` : null
    };
  }

  // Bandcamp
  if (cleanUrl.includes('bandcamp.com')) {
    return {
      platform: 'bandcamp',
      trackId: url,
      embedUrl: null // Bandcamp requires custom embed code
    };
  }

  // Audiomack
  if (cleanUrl.includes('audiomack.com')) {
    return {
      platform: 'audiomack',
      trackId: url,
      embedUrl: url.replace('audiomack.com', 'audiomack.com/embed')
    };
  }

  return {
    platform: 'unknown',
    trackId: null,
    embedUrl: null
  };
};

export const isValidMusicUrl = (url: string): boolean => {
  const cleanUrl = url.trim().toLowerCase();
  
  const validPlatforms = [
    'soundcloud.com',
    'spotify.com',
    'music.apple.com',
    'youtube.com',
    'youtu.be', // YouTube short links
    'music.youtube.com',
    'bandcamp.com',
    'audiomack.com'
  ];

  return validPlatforms.some(platform => cleanUrl.includes(platform));
};

export const getMusicPlatformIcon = (platform: string): string => {
  const icons: { [key: string]: string } = {
    'soundcloud': 'cloud',
    'spotify': 'musical-note',
    'apple_music': 'musical-notes',
    'youtube_music': 'logo-youtube',
    'bandcamp': 'disc',
    'audiomack': 'headset',
    'unknown': 'musical-note'
  };
  return icons[platform] || 'musical-note';
};

export const getMusicPlatformColor = (platform: string): string => {
  const colors: { [key: string]: string } = {
    'soundcloud': '#FF5500',
    'spotify': '#1DB954',
    'apple_music': '#FA243C',
    'youtube_music': '#FF0000',
    'bandcamp': '#629AA9',
    'audiomack': '#FFA200',
    'unknown': '#666'
  };
  return colors[platform] || '#666';
};

export const getMusicPlatformName = (platform: string): string => {
  const names: { [key: string]: string } = {
    'soundcloud': 'SoundCloud',
    'spotify': 'Spotify',
    'apple_music': 'Apple Music',
    'youtube_music': 'YouTube Music',
    'bandcamp': 'Bandcamp',
    'audiomack': 'Audiomack',
    'unknown': 'Unknown'
  };
  return names[platform] || 'Unknown';
};
