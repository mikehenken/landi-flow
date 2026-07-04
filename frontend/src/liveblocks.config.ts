import type { JsonObject } from '@liveblocks/client';

declare global {
  interface Liveblocks {
    Presence: JsonObject;
    UserMeta: JsonObject;
    Storage: JsonObject;
  }
}

export type {};
