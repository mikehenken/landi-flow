export interface StoryAttachmentMeta {
  id: string;
  story_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  preview_url: string | null;
  created_at: string;
}

const STORAGE_PREFIX = 'landi-flow:story-attachments:';

function storageKey(storyId: string): string {
  return `${STORAGE_PREFIX}${storyId}`;
}

function readAll(storyId: string): StoryAttachmentMeta[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(storageKey(storyId));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StoryAttachmentMeta[]) : [];
  } catch {
    return [];
  }
}

function writeAll(storyId: string, attachments: StoryAttachmentMeta[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(storageKey(storyId), JSON.stringify(attachments));
}

export function listStoryAttachments(storyId: string): StoryAttachmentMeta[] {
  return readAll(storyId);
}

export async function addStoryAttachment(
  storyId: string,
  file: File,
): Promise<StoryAttachmentMeta> {
  const previewUrl =
    file.type.startsWith('image/') ? URL.createObjectURL(file) : null;

  const attachment: StoryAttachmentMeta = {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    story_id: storyId,
    filename: file.name,
    mime_type: file.type || 'application/octet-stream',
    size_bytes: file.size,
    preview_url: previewUrl,
    created_at: new Date().toISOString(),
  };

  const next = [attachment, ...readAll(storyId)];
  writeAll(storyId, next);
  return attachment;
}

export function removeStoryAttachment(storyId: string, attachmentId: string): void {
  writeAll(
    storyId,
    readAll(storyId).filter((entry) => entry.id !== attachmentId),
  );
}
