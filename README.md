# SweetWine · 校园心事 — AI 情感陪伴平台

把真实问答社区里沉淀的人生经验，蒸馏成有记忆、有人格、能主动关心的 AI 陪伴角色，
面向校园情感场景（表白 / 失恋 / 宿舍 / 考研 / 毕业 / 异地 / 社交焦虑 / 家庭沟通）。

**🍷 在线演示：[sw.869869869.xyz](https://sw.869869869.xyz/)**

## 核心功能
- **校园心事枢纽**（/campus）：八大情感主题 → 知乎开放平台实时问答采集（搜索 / 回答摘要 / 热榜）→ 一键蒸馏为 AI 角色（观点嵌入 persona + 危机干预硬规则 + 自动封面生成）
- **有记忆的陪伴聊天**：近期历史窗口 + 滚动长期记忆折叠（merge 式摘要、游标推进、围栏注入防 prompt injection）；角色自发照片（标记协议 + 参考图身份注入出图）；免费神经语音朗读；多角色群聊互见
- **知乎 OAuth 登录**、69 语种界面、角色工厂与收藏册、全站免费

## 技术栈
Next.js 16 App Router + React 19 + next-intl + Prisma/PostgreSQL；单 catch-all API dispatcher；
自研认证与 REST 数据层（supabase-js 协议兼容，零第三方 BaaS）；可插拔 OpenAI 兼容 LLM 网关（熔断 + 人格规则池降级）；AGNES 图像网关；Edge TTS 神经语音。

## 快速开始
```bash
cd frontend
cp .env.example .env   # 填入 DATABASE_URL / AGNES_API_KEY / ZHIHU_* 等
npm install
npx prisma generate
# 可选：导入种子数据 prisma/seed.sql（psql -f）
npm run build && npx next start -p 3000
```
管理台 `/admin` 可热配置 LLM 端点 / 知乎凭据 / SMTP。

## 说明
- 媒体：仓库仅含自有与生成资产； Companion 肖像等外部素材桶不随仓库分发，自行准备或以 AGNES 生成。
- 合规：全站 SFW + 未成年硬拦截；情感陪伴不替代专业心理帮助（页面内置危机热线指引）；采集内容保留原链与答主署名。
- 详见 `frontend/README.md`。
