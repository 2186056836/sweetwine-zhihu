// Static content pages: legal docs, help center, affiliate program, about.
// Copy is a condensed zh-Hans rewrite following the page structure
// (reference routes: /legal/privacy-policy, /legal/terms-and-conditions, /help,
// /affiliate, /about).
import { Link } from "@/i18n/navigation";

function Shell({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
      <h1 className="text-3xl font-extrabold">{title}</h1>
      {updated && <p className="mt-1 text-xs text-muted-foreground">最后更新：{updated}</p>}
      <div className="prose-invert mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground">
        {children}
      </div>
    </main>
  );
}

export function PrivacyPolicyPage() {
  return (
    <Shell title="隐私政策" updated="2026-09-01">
      <h2>1. 我们收集的信息</h2>
      <p>账户信息（邮箱、昵称、性别）、聊天与生成记录、设备与用量统计。你的数据全部存储在 SweetWine 自托管服务器上，不与任何第三方共享。</p>
      <h2>2. 信息的使用</h2>
      <p>用于提供聊天、生成与客服功能；AI 角色回复由你配置的模型端点生成，提示词中仅包含必要的人设与对话上下文。</p>
      <h2>3. 你的权利</h2>
      <ul>
        <li>随时导出或删除你的聊天数据（「聊天设置 → 删除聊天/记忆」）</li>
        <li>注销账户并清除全部个人数据</li>
        <li>关闭个性化统计</li>
      </ul>
      <h2>4. 未成年人保护</h2>
      <p>本站面向 18 岁以上用户。注册即声明你已成年；我们不会有意收集未成年人的数据。</p>
      <h2>5. Cookie</h2>
      <p>仅使用维持登录会话所必需的 Cookie（sb-auth-auth-token），不投放广告追踪 Cookie。</p>
    </Shell>
  );
}

export function TermsPage() {
  return (
    <Shell title="服务条款" updated="2026-09-01">
      <h2>1. 服务说明</h2>
      <p>SweetWine 提供 AI 角色聊天、语音、图像与视频生成等娱乐服务。AI 输出为算法生成内容，不代表任何真实人物或专业意见。</p>
      <h2>2. 账户</h2>
      <p>你需对账户下的全部行为负责，不得共享账户或将服务用于任何违法用途。</p>
      <h2>3. 免费服务</h2>
      <p>本站所有功能完全免费。</p>
      <h2>4. 内容规范</h2>
      <p>禁止生成涉及未成年人、真实人物换脸、暴力恐吓或其他违法内容。违规账户将被封禁且不退款。</p>
      <h2>5. 免责声明</h2>
      <p>服务按「现状」提供。在法律允许的最大范围内，我们不对间接损失承担责任。</p>
    </Shell>
  );
}

const FAQ = [
  { q: "SweetWine 是免费的吗？", a: "是的，完全免费。聊天、图像与视频生成等全部功能均不收费。" },
  { q: "消息为什么会失败？", a: "检查网络连接后重试；若仍失败，查看页面顶部的错误提示。" },
  { q: "如何删除聊天记录？", a: "聊天页右上角「聊天设置」中可删除当前对话或清空角色记忆；「聊天」列表中也可整条删除会话。" },
  { q: "生成的图像在哪里？", a: "全部保存在「收藏」页，可按文件夹整理。" },
  { q: "支持哪些语言？", a: "界面支持简体中文与英语，AI 回复语言跟随你的消息。" },
  { q: "如何注销账户？", a: "在「账户设置」中联系我们，确认后 7 日内清除全部数据。" },
];

export function HelpPage() {
  return (
    <Shell title="帮助中心">
      {FAQ.map((f) => (
        <details key={f.q} className="glass-effect rounded-xl px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">{f.q}</summary>
          <p className="mt-2 text-xs">{f.a}</p>
        </details>
      ))}
      <p className="pt-4 text-xs">
        没有找到答案？<Link href="/settings/profile" className="text-primary hover:underline">联系我们</Link>
      </p>
    </Shell>
  );
}

export function AboutPage() {
  return (
    <Shell title="关于我们">
      <p>SweetWine 致力于打造最真实、最有温度的 AI 陪伴体验：有记忆的对话、按需生成的照片与视频、自然的语音消息。</p>
      <h2>我们的承诺</h2>
      <p>所有角色、对话与生成内容均在平台内闭环处理；你的聊天内容不会被用于任何第三方用途。</p>
      <h2>技术要点</h2>
      <ul>
        <li>前端：Next.js 16 App Router + RSC、next-intl 多语言、自研设计系统（token/玻璃拟态/渐变 CTA）</li>
        <li>后端：GoTrue 兼容认证（PBKDF2 + HMAC JWT + refresh 轮换）、PostgREST 兼容层、AI SDK v5 SSE 流</li>
        <li>数据：关系型数据库全栈自托管，73+ 位个性鲜明的 AI 角色</li>
      </ul>
    </Shell>
  );
}
