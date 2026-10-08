import { Platform } from 'react-native';

/** Grab a still from a local video on web. Returns a blob URL, or null if capture fails. */
export function captureVideoFrameUri(videoUri: string, timeoutMs = 4000): Promise<string | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const timer = window.setTimeout(() => finish(null), timeoutMs);
    const done = (value: string | null) => {
      window.clearTimeout(timer);
      finish(value);
    };

    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.src = videoUri;

    const draw = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (!width || !height) {
        done(null);
        return;
      }

      const maxWidth = 720;
      const scale = width > maxWidth ? maxWidth / width : 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const context = canvas.getContext('2d');
      if (!context) {
        done(null);
        return;
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            done(null);
            return;
          }
          done(URL.createObjectURL(blob));
        },
        'image/jpeg',
        0.85,
      );
    };

    video.onerror = () => done(null);
    video.onloadeddata = () => {
      const target = Number.isFinite(video.duration) ? Math.min(0.8, Math.max(video.duration / 3, 0)) : 0;
      if (target > 0) {
        video.currentTime = target;
        return;
      }
      draw();
    };
    video.onseeked = draw;
  });
}
