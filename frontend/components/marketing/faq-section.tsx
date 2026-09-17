"use client";

// landing FAQ: 12 questions from the
// landing.faq dictionary, rich answers with internal links, mounted-gated
// Accordion (SSR-safe static fallback rows), verbatim classes.
import { Fragment, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function FAQSection() {
  const t = useTranslations("landing.faq");
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const items = [
    { key: "q1", question: t("questions.q1.question"), answer: <>{t("questions.q1.answer")}</> },
    { key: "q2", question: t("questions.q2.question"), answer: <>{t("questions.q2.answer")}</> },
    {
      key: "q3",
      question: t("questions.q3.question"),
      answer: (
        <Fragment>
          {t("questions.q3.answerPart1")}{" "}
          <Link href="/create" prefetch={false} className="text-primary hover:underline">
            {t("questions.q3.linkText")}
          </Link>
          {t("questions.q3.answerPart2")}
          <Link href="/ai-girlfriend" prefetch={false} className="text-primary hover:underline">
            {t("questions.q3.linkTextGirlfriend")}
          </Link>
          {t("questions.q3.answerPart3")}
          <Link href="/ai-boyfriend" prefetch={false} className="text-primary hover:underline">
            {t("questions.q3.linkTextBoyfriend")}
          </Link>
          {t("questions.q3.answerPart4")}
        </Fragment>
      ),
    },
    { key: "q4", question: t("questions.q4.question"), answer: <>{t("questions.q4.answer")}</> },
    { key: "q5", question: t("questions.q5.question"), answer: <>{t("questions.q5.answer")}</> },
    {
      key: "q6",
      question: t("questions.q6.question"),
      answer: (
        <Fragment>
          {t("questions.q6.answerPart1")}{" "}
          <Link href="/generate-image" prefetch={false} className="text-primary hover:underline">
            {t("questions.q6.linkTextImages")}
          </Link>{" "}
          {t("questions.q6.answerPart2")}{" "}
          <Link href="/generate-video" prefetch={false} className="text-primary hover:underline">
            {t("questions.q6.linkTextVideos")}
          </Link>
          {t("questions.q6.answerPart3")}
        </Fragment>
      ),
    },
    { key: "q7", question: t("questions.q7.question"), answer: <>{t("questions.q7.answer")}</> },
    { key: "q8", question: t("questions.q8.question"), answer: <>{t("questions.q8.answerPart1")}</> },
    {
      key: "q9",
      question: t("questions.q9.question"),
      answer: (
        <Fragment>
          {t("questions.q9.answerPart1")}{" "}
          <Link href="/chats" prefetch={false} className="text-primary hover:underline">
            {t("questions.q9.linkText")}
          </Link>
          {t("questions.q9.answerPart2")}
        </Fragment>
      ),
    },
    {
      key: "q10",
      question: t("questions.q10.question"),
      answer: (
        <Fragment>
          {t("questions.q10.answerPart1")}{" "}
          <Link href="/" prefetch={false} className="text-primary hover:underline">
            {t("questions.q10.linkText")}
          </Link>
          {t("questions.q10.answerPart2")}
        </Fragment>
      ),
    },
    {
      key: "q12",
      question: t("questions.q12.question"),
      answer: (
        <Fragment>
          {t("questions.q12.answerPart1")}{" "}
          <Link href="/collection" prefetch={false} className="text-primary hover:underline">
            {t("questions.q12.linkText")}
          </Link>
          {t("questions.q12.answerPart2")}
        </Fragment>
      ),
    },
  ];

  const titleWords = t("title").split(" ");
  return (
    <section className="py-16 md:py-20">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">
            {titleWords.slice(0, -1).join(" ")} <span className="text-primary">{titleWords.slice(-1)}</span>
          </h2>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="max-w-3xl mx-auto">
          {mounted ? (
            <Accordion type="single" collapsible className="w-full space-y-3">
              {items.map((q, i) => (
                <AccordionItem
                  value={`item-${i}`}
                  className="glass-card rounded-2xl px-5 transition-colors duration-200 data-[state=open]:bg-surface-variant/20"
                  key={q.key}
                >
                  <AccordionTrigger className="text-left hover:text-primary hover:no-underline transition-colors py-5">
                    {q.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-on-surface-variant pb-5">
                    {q.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="w-full space-y-3">
              {items.map((q) => (
                <div className="glass-card rounded-2xl px-5" key={q.key}>
                  <div className="flex flex-1 items-center justify-between py-5 font-medium">
                    <span>{q.question}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4 shrink-0"
                      aria-hidden="true"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
