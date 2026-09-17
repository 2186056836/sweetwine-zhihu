// story reply handoff: the story
// viewer stashes the reply payload in sessionStorage and the chat page picks
// it up via the STORY_REPLY_QUERY_FLAG query param.
export const STORY_REPLY_QUERY_FLAG = "storyReply";

const STORAGE_KEY = "ig-story-reply-payload";

export type StoryReplyPayload = {
  storyId: string;
  liked: boolean;
  text: string;
  companionSlugOrId: string;
  firstFrameUrl: string;
};

export function saveStoryReplyPayload(payload: StoryReplyPayload): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function takeStoryReplyPayload(): StoryReplyPayload | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(STORAGE_KEY);
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as StoryReplyPayload) : null;
  } catch {
    return null;
  }
}
