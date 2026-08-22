import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

export type SupportedFileType = 'pdf' | 'image' | 'unknown';

/**
 * Determines whether a file is a PDF or an Image based on path/url and mimeType.
 */
export function getDocumentFileType(filePath?: string, mimeType?: string): SupportedFileType {
  const mime = (mimeType || '').toLowerCase();
  if (mime.includes('pdf')) return 'pdf';
  if (mime.includes('image') || mime.includes('jpeg') || mime.includes('jpg') || mime.includes('png') || mime.includes('webp')) return 'image';

  const path = (filePath || '').toLowerCase().split('?')[0]; // Strip query params
  if (path.endsWith('.pdf')) return 'pdf';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.webp')) return 'image';

  return 'unknown';
}

/**
 * Opens a document using platform-native viewers.
 * WEB: Opens signed URL in a new browser tab (window.open).
 * MOBILE (Android/iOS): Opens signed URL using expo-web-browser.
 */
export async function openDocument(url: string, fileType?: string): Promise<void> {
  if (!url) {
    throw new Error('Document URL is missing.');
  }

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.open) {
      const openedWindow = window.open(url, '_blank', 'noopener,noreferrer');
      if (!openedWindow) {
        window.location.href = url;
      }
    }
  } else {
    try {
      await WebBrowser.openBrowserAsync(url, {
        showTitle: true,
        enableBarCollapsing: true,
      });
    } catch (err: any) {
      console.warn('WebBrowser.openBrowserAsync fallback note:', err);
      throw new Error('Unable to open document in system viewer.');
    }
  }
}
