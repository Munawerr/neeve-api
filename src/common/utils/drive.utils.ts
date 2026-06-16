export function isGoogleDriveUrl(url: string): boolean {
  return /drive\.google\.com/i.test(url);
}

export function extractGoogleDriveFileId(url: string): string | null {
  const matchFile = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFile) return matchFile[1];

  const matchIdParam = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchIdParam) return matchIdParam[1];

  return null;
}

export async function fetchGoogleDriveFileMetadata(
  fileId: string,
  apiKey: string,
): Promise<{ name?: string; thumbnailLink?: string } | null> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,thumbnailLink&key=${apiKey}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
