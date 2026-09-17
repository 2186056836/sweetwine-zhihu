"use client";

// /collection — user's generated media library (media table, user-scoped via
// the backend's RLS-parity filter) + folder strip from media_folders.
import { useEffect, useState } from "react";
import { Layers, Trash2 } from "lucide-react";
import { toast } from "sonner";

type MediaRow = {
  id: string;
  companionId: string | null;
  folderId: string | null;
  type: string;
  url: string;
  prompt: string | null;
  createdAt: string;
};
type FolderRow = { id: string; name: string };

export function CollectionPage() {
  const [media, setMedia] = useState<MediaRow[] | null>(null);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [folder, setFolder] = useState<string | null>(null);

  const load = () => {
    fetch("/sb/rest/v1/media?select=*&order=createdAt.desc&limit=96")
      .then((r) => (r.ok ? r.json() : []))
      .then((j) => setMedia(Array.isArray(j) ? j : []))
      .catch(() => setMedia([]));
    fetch("/sb/rest/v1/media_folders?select=id,name&order=createdAt.asc")
      .then((r) => (r.ok ? r.json() : []))
      .then((j) => setFolders(Array.isArray(j) ? j : []))
      .catch(() => setFolders([]));
  };

  useEffect(load, []);

  async function remove(m: MediaRow) {
    if (!window.confirm("删除这条媒体？")) return;
    try {
      const r = await fetch("/api/media/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: m.id }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || r.statusText);
      load();
    } catch {
      toast("删除接口未启用（Phase B）");
    }
  }

  const shown = (media || []).filter((m) =>
    folder === null ? true : m.folderId === folder,
  );

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <Layers className="h-6 w-6 text-primary" /> 收藏
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">你生成与收藏的图像、视频</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => setFolder(null)}
          className={
            "h-9 rounded-full px-4 text-sm font-medium " +
            (folder === null ? "gradient-cta text-white" : "glass-effect text-muted-foreground hover:text-foreground")
          }
        >
          全部
        </button>
        {folders.map((f) => (
          <button
            key={f.id}
            onClick={() => setFolder(f.id)}
            className={
              "h-9 rounded-full px-4 text-sm font-medium " +
              (folder === f.id ? "gradient-cta text-white" : "glass-effect text-muted-foreground hover:text-foreground")
            }
          >
            {f.name}
          </button>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {media === null &&
          [0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-surface-container-low/80" />
          ))}
        {shown.map((m) => (
          <div key={m.id} className="group relative aspect-square overflow-hidden rounded-xl">
            {m.type === "video" ? (
              <video src={m.url} className="h-full w-full object-cover" muted loop playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.url} alt={m.prompt || ""} loading="lazy" className="h-full w-full object-cover" />
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/80 to-transparent p-2 pt-8 opacity-0 transition-opacity group-hover:opacity-100">
              <p className="truncate text-[11px] text-white/85">{m.prompt || m.type}</p>
              <button onClick={() => remove(m)} className="text-white/70 hover:text-red-400" aria-label="删除">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {media !== null && shown.length === 0 && (
        <div className="glass-effect mt-2 rounded-2xl p-12 text-center text-sm text-muted-foreground">
          收藏夹还是空的——去聊天里生成点内容吧
        </div>
      )}
    </main>
  );
}
