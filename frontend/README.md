# frontend

Next.js 16 App Router 全栈前端（含全部业务路由与自研协议兼容层）。

- `app/api/[...path]`：单 catch-all 业务 dispatcher（会话门）
- `app/sb/**`：GoTrue / PostgREST / Storage 协议兼容层（面向 supabase-js 客户端）
- `lib/`：认证、LLM 可插拔层、记忆折叠、知乎内容客户端、AGNES、Edge TTS、经济（免费化 no-op）
- `messages/`：69 语种 next-intl 字典
- `prisma/`：schema 与种子

启动与配置见根 README 与 `.env.example`。
