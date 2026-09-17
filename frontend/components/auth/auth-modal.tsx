"use client";

// Auth modal — the full
// auth modal: social buttons (E), email OTP step (L), 6-digit
// OTP step (J, input-otp), onboarding form, free-plan welcome
// dialog and the four-state AuthModal orchestration
// Structure, classes and state flow follow the
// design spec; module ids are real imports and the
// updateUserProfile server action became the local /api/profile/update call.
import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { toast } from "sonner";
import { OTPInput, OTPInputContext } from "input-otp";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronDown,
  Mail,
  MessageSquare,
  Image as ImageIcon,
  Video,
  Mic,
  Drama,
  Users,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { LOCALE_CONFIG } from "@/lib/locale-config";
import { ICONS_3D } from "@/lib/icons-3d";
import { updateUserProfile } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ShimmerImage } from "@/components/shimmer-image";
import { LanguageModal } from "@/components/language-modal";
import { Link } from "@/i18n/navigation";
import { useAuthModal } from "./auth-modal-context";
import { useAuthState } from "./auth-state";

// ---------------------------------------------------------------- Zhihu icon
// Social login icon: Zhihu OAuth sign-in
// (full-page redirect to /api/auth/zhihu, see lib/zhihu-oauth.ts).
function ZhihuIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="5.5" fill="#0084FF" />
      <text
        x="12"
        y="16.9"
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fill="#fff"
        fontFamily="system-ui,-apple-system,'PingFang SC','Microsoft YaHei',sans-serif"
      >
        知
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------- email (L)
function EmailStep({
  onEmailSent,
  onBack,
}: {
  onEmailSent: (email: string) => void;
  onBack: () => void;
}) {
  const t = useTranslations();
  const [loading, setLoading] = React.useState(false);
  const schema = z.object({ email: z.string().email(t("auth.emailInvalid")) });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const submit = async (values: { email: string }) => {
    setLoading(true);
    try {
      const client = supabase();
      const { error } = await client.auth.signInWithOtp({
        email: values.email,
        options: { shouldCreateUser: true },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      onEmailSent(values.email);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("auth.email")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("auth.enterYourEmail")}
                    type="email"
                    autoFocus
                    className="bg-surface-container/50 border-border focus:border-primary/50"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full gradient-cta hover:opacity-90 transition-opacity"
            disabled={loading}
          >
            {loading ? t("common.loading") : t("auth.sendCode")}
          </Button>
        </form>
      </Form>
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("common.back")}
      </button>
    </div>
  );
}

// ------------------------------------------------------- password sign-in
function PasswordStep({
  onSuccess,
  onUseCode,
  onBack,
}: {
  onSuccess: () => void;
  onUseCode: () => void;
  onBack: () => void;
}) {
  const t = useTranslations();
  const [loading, setLoading] = React.useState(false);
  const schema = z.object({
    email: z.string().email(t("auth.emailInvalid")),
    password: z.string().min(1, t("auth.passwordRequired")),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const submit = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const client = supabase();
      const { error } = await client.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) {
        toast.error(
          /no_password|no password yet/i.test(error.message || "")
            ? t("auth.noPasswordHint")
            : t("auth.loginError"),
        );
        return;
      }
      toast.success(t("auth.loginSuccess"));
      onSuccess();
    } catch {
      toast.error(t("auth.loginError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("auth.email")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("auth.enterYourEmail")}
                    type="email"
                    autoFocus
                    className="bg-surface-container/50 border-border focus:border-primary/50"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("auth.password")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("auth.enterYourPassword")}
                    type="password"
                    className="bg-surface-container/50 border-border focus:border-primary/50"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full gradient-cta hover:opacity-90 transition-opacity"
            disabled={loading}
          >
            {loading ? t("common.loading") : t("auth.login")}
          </Button>
        </form>
      </Form>
      <div className="flex items-center justify-between text-sm">
        <button
          onClick={onUseCode}
          className="text-primary hover:opacity-80 transition-opacity"
        >
          {t("auth.loginWithCode")}
        </button>
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </button>
      </div>
    </div>
  );
}

// --------------------------------------------- optional password after OTP
function SetPasswordStep({ onNext }: { onNext: () => void }) {
  const t = useTranslations();
  const [pw, setPw] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    if (pw.length < 8) {
      toast.error(t("auth.passwordLength"));
      return;
    }
    if (pw !== confirm) {
      toast.error(t("auth.passwordsMismatch"));
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: "", password: pw }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.success === false) {
        toast.error(j.message || j.error || t("common.error"));
        return;
      }
      toast.success(t("auth.passwordSetSuccess"));
      onNext();
    } catch {
      toast.error(t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1 text-center">
        <p className="text-sm font-semibold text-foreground">{t("auth.setPasswordTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("auth.setPasswordDesc")}</p>
      </div>
      <div className="space-y-3">
        <Input
          placeholder={t("auth.newPassword")}
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoFocus
          className="bg-surface-container/50 border-border focus:border-primary/50"
        />
        <Input
          placeholder={t("auth.confirmPassword")}
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="bg-surface-container/50 border-border focus:border-primary/50"
        />
      </div>
      <div className="flex gap-3">
        <Button
          onClick={submit}
          disabled={busy}
          className="flex-1 gradient-cta hover:opacity-90 transition-opacity"
        >
          {busy ? t("common.loading") : t("auth.setPassword")}
        </Button>
        <Button
          variant="outline"
          onClick={onNext}
          disabled={busy}
          className="flex-1 bg-surface-container/50 border-border hover:bg-surface-container text-foreground hover:text-foreground"
        >
          {t("auth.skipForNow")}
        </Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------- input-otp wrappers
const InputOTP = React.forwardRef<
  React.ElementRef<typeof OTPInput>,
  React.ComponentPropsWithoutRef<typeof OTPInput>
>(({ className, containerClassName, ...props }, ref) => (
  <OTPInput
    ref={ref}
    containerClassName={cn(
      "flex items-center gap-2 has-[:disabled]:opacity-50",
      containerClassName,
    )}
    className={cn("disabled:cursor-not-allowed", className)}
    {...props}
  />
));
InputOTP.displayName = "InputOTP";

const InputOTPGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center", className)} {...props} />
));
InputOTPGroup.displayName = "InputOTPGroup";

const InputOTPSlot = React.forwardRef<
  HTMLDivElement,
  { index: number } & React.HTMLAttributes<HTMLDivElement>
>(({ index, className, ...props }, ref) => {
  const context = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = context.slots[index];
  return (
    <div
      ref={ref}
      className={cn(
        "relative flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-[10px] glass-input text-base sm:text-lg font-semibold text-foreground transition-all",
        isActive &&
          "z-10 ring-2 ring-primary/50 ring-offset-2 ring-offset-background shadow-[0_0_16px_-2px_rgba(255,110,179,0.45)]",
        className,
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>
  );
});
InputOTPSlot.displayName = "InputOTPSlot";

// ---------------------------------------------------------------- otp (J)
function OtpStep({
  email,
  onSuccess,
  onBack,
}: {
  email: string;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const t = useTranslations();
  const [value, setValue] = React.useState("");
  const [verifying, setVerifying] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(60);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const verify = React.useCallback(
    async (token: string) => {
      if (token.length < 6) return;
      setVerifying(true);
      try {
        const client = supabase();
        const { error } = await client.auth.verifyOtp({ email, token, type: "email" });
        if (error) {
          toast.error(error.message);
          setValue("");
          return;
        }
        toast.success(t("auth.otpSuccess"));
        onSuccess();
      } catch {
        toast.error(t("auth.otpInvalid"));
        setValue("");
      } finally {
        setVerifying(false);
      }
    },
    [email, onSuccess, t],
  );

  React.useEffect(() => {
    if (value.length === 6) {
      verify(value);
    }
  }, [value, verify]);

  const resend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      const client = supabase();
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(t("auth.otpResendSuccess"));
      setCooldown(60);
      setValue("");
    } catch {
      toast.error(t("auth.otpResendError"));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-foreground text-sm">{t("auth.otpDescription", { email })}</p>
        <p className="text-muted-foreground text-xs">{t("auth.checkSpamFolder")}</p>
      </div>
      <div className="flex justify-center">
        <div className="flex flex-col gap-4 w-fit overflow-visible py-1 px-1">
          <InputOTP
            maxLength={6}
            value={value}
            onChange={setValue}
            disabled={verifying}
            autoFocus
          >
            <InputOTPGroup className="gap-1.5 sm:gap-2">
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
          <Button
            onClick={() => verify(value)}
            className="gradient-cta hover:opacity-90 transition-opacity px-8"
            disabled={value.length < 6 || verifying}
          >
            {verifying ? t("common.loading") : t("auth.otpVerify")}
          </Button>
        </div>
      </div>
      <div className="text-center text-sm">
        <span className="text-muted-foreground">{t("auth.otpNoCode")} </span>
        {cooldown > 0 ? (
          <span className="text-muted-foreground">
            {t("auth.otpResendIn", { seconds: cooldown })}
          </span>
        ) : (
          <button
            onClick={resend}
            disabled={resending}
            className="text-primary hover:text-primary/80 disabled:opacity-50"
          >
            {t("auth.otpResend")}
          </button>
        )}
      </div>
      <div className="text-center text-sm pt-2 border-t border-border">
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {t("common.back")}
        </button>
      </div>
    </div>
  );
}

// --------------------------------------------------- onboarding form (C14)
function OnboardingForm({
  email,
  onComplete,
}: {
  email: string;
  onComplete: () => void;
}) {
  const t = useTranslations();
  const [submitting, setSubmitting] = React.useState(false);
  const [langOpen, setLangOpen] = React.useState(false);

  const schema = React.useMemo(
    () =>
      z.object({
        nickname: z.string().min(2, t("onboarding.nicknameRequired")),
        gender: z.enum(["male", "female"], { message: t("onboarding.genderRequired") }),
        aiLanguage: z.enum(Object.keys(LOCALE_CONFIG) as [string, ...string[]], {
          message: t("onboarding.languageRequired"),
        }),
        ageVerified: z.boolean().refine((v) => v === true, {
          message: t("onboarding.ageRequired"),
        }),
        aiActConsent: z.boolean().refine((v) => v === true, {
          message: t("onboarding.aiActRequired"),
        }),
        newsletter: z.boolean(),
      }),
    [t],
  );

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      nickname: "",
      gender: undefined,
      aiLanguage: "cs",
      ageVerified: false,
      aiActConsent: false,
      newsletter: true,
    },
  });

  const submit = async (values: z.infer<typeof schema>) => {
    setSubmitting(true);
    try {
      const res = await updateUserProfile(values);
      if (res.success) {
        if ((res as { registrationEventId?: string }).registrationEventId) {
          const fbq = (window as unknown as { fbq?: unknown }).fbq;
          if (typeof fbq === "function") {
            (
              fbq as (
                a: string,
                b: string,
                c: object,
                d: object,
              ) => void
            )("track", "CompleteRegistration", {}, {
              eventID: (res as { registrationEventId: string }).registrationEventId,
            });
          }
        }
        toast.success(t("settings.changesSaved"));
        onComplete();
      } else if (res.error === "Not authenticated") {
        window.location.href = "/auth/login";
      } else {
        toast.error(res.error || t("common.error"));
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
          <FormField
            control={form.control}
            name="nickname"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("onboarding.nickname")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("onboarding.nicknamePlaceholder")} {...field} />
                </FormControl>
                <FormMessage className="text-gradient text-xs" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("onboarding.gender")}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("onboarding.genderRequired")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="male">{t("onboarding.male")}</SelectItem>
                    <SelectItem value="female">{t("onboarding.female")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage className="text-gradient text-xs" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="aiLanguage"
            render={({ field }) => {
              const def = LOCALE_CONFIG[field.value];
              return (
                <FormItem>
                  <FormLabel>{t("onboarding.aiLanguage")}</FormLabel>
                  <FormDescription>{t("onboarding.aiLanguageDesc")}</FormDescription>
                  <FormControl>
                    <button
                      type="button"
                      onClick={() => setLangOpen(true)}
                      className="bg-inset border border-border focus:border-primary/50 h-11 w-full rounded-md px-4 flex items-center justify-between text-sm transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <ShimmerImage
                          src={def.flag}
                          width={20}
                          height={20}
                          alt={def.nativeName}
                          unoptimized
                          disableShimmer
                          className="rounded-full shrink-0"
                        />
                        <span>{def.nativeName}</span>
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </button>
                  </FormControl>
                  <LanguageModal
                    open={langOpen}
                    onOpenChange={setLangOpen}
                    value={field.value}
                    onSelect={(v) => field.onChange(v)}
                    title={t("language.selectTitle")}
                  />
                  <FormMessage className="text-gradient text-xs" />
                </FormItem>
              );
            }}
          />
          <div className="bg-inset border border-border rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              {t("onboarding.beforeContinue")}
            </h3>
            <FormField
              control={form.control}
              name="ageVerified"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-xs text-muted-foreground font-normal cursor-pointer">
                      {t("onboarding.iConfirm")}{" "}
                      <Link
                        href="/legal/terms-and-conditions"
                        className="text-primary hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t("onboarding.termsOfService")}
                      </Link>{" "}
                      {t("common.and")}{" "}
                      <Link
                        href="/legal/privacy-policy"
                        className="text-primary hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t("onboarding.privacyPolicy")}
                      </Link>
                    </FormLabel>
                    <FormMessage className="text-gradient text-xs" />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="aiActConsent"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-xs text-muted-foreground font-normal cursor-pointer">
                      {t("onboarding.aiActConsent")}
                    </FormLabel>
                    <FormMessage className="text-gradient text-xs" />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newsletter"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="text-xs text-muted-foreground font-normal cursor-pointer">
                    {t("onboarding.newsletterOptIn")}
                  </FormLabel>
                </FormItem>
              )}
            />
          </div>
          <Button
            type="submit"
            className="w-full gradient-cta neon-glow-primary text-white font-bold hover:opacity-90 transition-opacity"
            disabled={submitting}
          >
            {submitting ? t("common.loading") : t("onboarding.continue")}
          </Button>
        </form>
      </Form>
    </div>
  );
}

// ---------------------------------------------- free plan welcome (C12)
function Icon3d({ src, className, alt = "" }: { src: string; className?: string; alt?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} aria-hidden={alt === "" || undefined} className={cn("object-contain", className)} />;
}

export function FreePlanDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("onboarding.freePlan");
  const items = [
    {
      icon: ICONS_3D.sparkle,
      title: t("charactersTitle"),
      description: t("charactersDesc"),
    },
    {
      icon: ICONS_3D.lightning,
      title: t("imagesTitle"),
      description: t("imagesDesc"),
    },
    {
      icon: ICONS_3D.chatBubble,
      title: t("messagesTitle"),
      description: t("messagesDesc"),
    },
  ];
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader className="sm:text-center">
          <div className="flex justify-center">
            <ShimmerImage
              src="/sweetwine-logo-light.svg"
              alt="SweetWine"
              width={148}
              height={32}
              priority
              disableShimmer
              className="h-auto"
            />
          </div>
          <DialogTitle className="mt-2">{t("title")}</DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {items.map(({ icon, title, description }) => (
            <div className="flex items-start gap-3" key={title}>
              <Icon3d src={icon} className="w-6 h-6 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">{title}</p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
        <Button
          onClick={onClose}
          className="w-full gradient-cta neon-glow-primary text-white font-bold hover:opacity-90 transition-opacity"
        >
          {t("cta")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------- auth modal (C16)
type Step = "auth" | "email" | "otp" | "password" | "setpassword" | "onboarding";
const WELCOME_PARAM = "show_welcome";

export function AuthModal({ serverAuthenticated }: { serverAuthenticated: boolean }) {
  const {
    isOpen,
    redirectTo,
    onAuthComplete,
    isOnboardingForced,
    closeAuthModal,
    clearOnboardingForced,
    openFreePlanWelcome,
  } = useAuthModal();
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [step, setStep] = React.useState<Step>("auth");
  const [mode, setMode] = React.useState<"signup" | "signin">("signup");
  const [email, setEmail] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && isOnboardingForced) {
      setStep("onboarding");
    }
  }, [isOpen, isOnboardingForced]);

  React.useEffect(() => {
    if (!isOpen) {
      const id = setTimeout(() => {
        setStep("auth");
        setMode("signup");
        setEmail(null);
      }, 300);
      return () => clearTimeout(id);
    }
  }, [isOpen]);

  const afterVerified = async () => {
    try {
      const client = supabase();
      const {
        data: { user },
      } = await client.auth.getUser();
      if (user) {
        const { data } = await client
          .from("users")
          .select("ageVerified")
          .eq("id", user.id)
          .single();
        if ((data as { ageVerified?: boolean } | null)?.ageVerified === true) {
          closeAuthModal();
          if (onAuthComplete) onAuthComplete();
          router.refresh();
          return;
        }
      }
    } catch {
      /* fall through to onboarding */
    }
    setStep("onboarding");
  };

  if (!isOpen) return null;

  const showcase = [
    { icon: MessageSquare, title: t("onboarding.showcase.chatTitle"), description: t("onboarding.showcase.chatDesc") },
    { icon: ImageIcon, title: t("onboarding.showcase.imageTitle"), description: t("onboarding.showcase.imageDesc") },
    { icon: Video, title: t("onboarding.showcase.videoTitle"), description: t("onboarding.showcase.videoDesc") },
    { icon: Mic, title: t("onboarding.showcase.voiceTitle"), description: t("onboarding.showcase.voiceDesc") },
    { icon: Drama, title: t("onboarding.showcase.roleplayTitle"), description: t("onboarding.showcase.roleplayDesc") },
    { icon: Users, title: t("onboarding.showcase.groupChatTitle"), description: t("onboarding.showcase.groupChatDesc") },
    { icon: Sparkles, title: t("onboarding.showcase.creatorTitle"), description: t("onboarding.showcase.creatorDesc") },
  ];

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(v) => !v && !isOnboardingForced && step !== "onboarding" && closeAuthModal()}
    >
      <DialogContent
        className={
          step === "onboarding"
            ? "sm:max-w-[750px] bg-surface-container-lowest border-border p-0 overflow-hidden max-h-[90dvh]"
            : "sm:max-w-[400px] bg-surface-container-lowest border-border"
        }
        hideCloseButton={step === "onboarding"}
        onInteractOutside={
          isOnboardingForced || step === "onboarding" ? (e) => e.preventDefault() : undefined
        }
        onEscapeKeyDown={
          isOnboardingForced || step === "onboarding" ? (e) => e.preventDefault() : undefined
        }
      >
        {step === "email" ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex justify-center">
                <ShimmerImage src="/sweetwine-logo-light.svg" alt="SweetWine" width={148} height={32} priority disableShimmer className="h-auto" />
              </DialogTitle>
              <DialogDescription className="text-center text-muted-foreground">
                {t("auth.enterYourEmail")}
              </DialogDescription>
            </DialogHeader>
            <EmailStep
              onEmailSent={(e) => {
                setEmail(e);
                setStep("otp");
              }}
              onBack={() => setStep("auth")}
            />
          </>
        ) : step === "otp" && email ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex justify-center">
                <ShimmerImage src="/sweetwine-logo-light.svg" alt="SweetWine" width={148} height={32} priority disableShimmer className="h-auto" />
              </DialogTitle>
              <DialogDescription className="text-center text-muted-foreground mt-2">
                {t("auth.confirmYourEmail")}
              </DialogDescription>
            </DialogHeader>
            <OtpStep
              email={email}
              onSuccess={() =>
                mode === "signup" ? setStep("setpassword") : afterVerified()
              }
              onBack={() => {
                setEmail(null);
                setStep("email");
              }}
            />
          </>
        ) : step === "password" ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex justify-center">
                <ShimmerImage src="/sweetwine-logo-light.svg" alt="SweetWine" width={148} height={32} priority disableShimmer className="h-auto" />
              </DialogTitle>
              <DialogDescription className="text-center text-muted-foreground">
                {t("auth.signInToAccount")}
              </DialogDescription>
            </DialogHeader>
            <PasswordStep
              onSuccess={afterVerified}
              onUseCode={() => setStep("email")}
              onBack={() => setStep("auth")}
            />
          </>
        ) : step === "setpassword" ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex justify-center">
                <ShimmerImage src="/sweetwine-logo-light.svg" alt="SweetWine" width={148} height={32} priority disableShimmer className="h-auto" />
              </DialogTitle>
            </DialogHeader>
            <SetPasswordStep onNext={afterVerified} />
          </>
        ) : step === "onboarding" ? (
          <div className="flex min-h-[520px] max-h-[90dvh]">
            <DialogTitle className="sr-only">{t("onboarding.welcomeTo")} SweetWine</DialogTitle>
            <div className="hidden sm:flex flex-col w-[260px] flex-shrink-0 bg-gradient-to-b from-primary/10 to-background border-r border-border p-6">
              <div className="mb-6">
                <p className="text-sm font-bold tracking-wide">
                  <span className="text-white">{t("onboarding.featuresTitleWord1")} </span>
                  <span className="text-primary">{t("onboarding.featuresTitleWord2")}</span>
                </p>
              </div>
              <div className="space-y-4 flex-1">
                {showcase.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div className="flex items-start gap-3" key={i}>
                      <div className="bg-primary/10 p-1.5 rounded-md flex-shrink-0">
                        <Icon className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{s.title}</p>
                        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                          {s.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex-1 p-6 overflow-y-auto sw-scroll">
              <div className="mb-5">
                <ShimmerImage src="/sweetwine-logo-light.svg" alt="SweetWine" width={130} height={28} priority disableShimmer className="h-auto" />
                <p className="text-sm text-muted-foreground mt-1">{t("onboarding.setupProfile")}</p>
              </div>
              <OnboardingForm
                email={email || ""}
                onComplete={() => {
                  clearOnboardingForced();
                  closeAuthModal();
                  if (serverAuthenticated) {
                    onAuthComplete?.();
                    router.refresh();
                    openFreePlanWelcome();
                    return;
                  }
                  const params = new URLSearchParams(window.location.search);
                  params.set(WELCOME_PARAM, "1");
                  if (onAuthComplete) {
                    onAuthComplete();
                    router.refresh();
                    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
                  } else {
                    window.location.replace(`${window.location.pathname}?${params.toString()}`);
                  }
                }}
              />
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex justify-center">
                <ShimmerImage src="/sweetwine-logo-light.svg" alt="SweetWine" width={148} height={32} priority disableShimmer className="h-auto" />
              </DialogTitle>
              <DialogDescription className="text-center text-muted-foreground">
                {t(mode === "signup" ? "auth.createFreeAccount" : "auth.signInToAccount")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full bg-surface-container/50 border-border hover:bg-surface-container hover:border-border text-foreground hover:text-foreground"
                onClick={() => {
                  const rt =
                    redirectTo && redirectTo !== "/"
                      ? `?return_to=${encodeURIComponent(redirectTo)}`
                      : "";
                  window.location.href = `/api/auth/zhihu${rt}`;
                }}
              >
                <ZhihuIcon className="mr-2 h-4 w-4" />
                {t("auth.continueWithZhihu")}
              </Button>
              <Button
                variant="outline"
                className="w-full bg-surface-container/50 border-border hover:bg-surface-container hover:border-border text-foreground hover:text-foreground"
                onClick={() => setStep(mode === "signin" ? "password" : "email")}
              >
                <Mail className="mr-2 h-4 w-4" />
                {t(mode === "signin" ? "auth.loginWithPassword" : "auth.continueWithEmail")}
              </Button>
              {mode === "signup" && (
                <p className="text-center text-xs text-muted-foreground">
                  {t("auth.byCreatingAccountAgree")}{" "}
                  <Link
                    href="/legal/terms-and-conditions"
                    className="underline hover:text-foreground transition-colors"
                    onClick={() => closeAuthModal()}
                  >
                    {t("auth.termsOfService")}
                  </Link>
                  .
                </p>
              )}
              <p className="text-center text-sm text-muted-foreground">
                {mode === "signup" ? (
                  <>
                    {t("auth.hasAccount")}{" "}
                    <button
                      className="font-semibold text-primary hover:opacity-80 transition-opacity"
                      onClick={() => setMode("signin")}
                    >
                      {t("auth.login")}
                    </button>
                  </>
                ) : (
                  <>
                    {t("auth.noAccount")}{" "}
                    <button
                      className="font-semibold text-primary hover:opacity-80 transition-opacity"
                      onClick={() => setMode("signup")}
                    >
                      {t("auth.signup")}
                    </button>
                  </>
                )}
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
