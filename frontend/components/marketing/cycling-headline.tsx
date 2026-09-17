"use client";

// CyclingHeadline: 5s interval,
// 350ms fade/slide swap across four gradient headlines, verbatim styles.
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export function CyclingHeadline() {
  const t = useTranslations("landing.cyclingHeadline");
  const items = [
    { text: t("girlfriend"), gradient: "linear-gradient(135deg, #FFB0DA 0%, #FF6EB3 55%, #E94E97 100%)" },
    { text: t("friend"), gradient: "linear-gradient(135deg, #FFD3E8 0%, #FFB0DA 55%, #FF6EB3 100%)" },
    { text: t("boyfriend"), gradient: "linear-gradient(135deg, #FF6EB3 0%, #E94E97 55%, #B83A75 100%)" },
    { text: t("companion"), gradient: "linear-gradient(135deg, #FFB0DA 0%, #FF6EB3 55%, #E94E97 100%)" },
  ];
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const iv = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % items.length);
        setVisible(true);
      }, 350);
    }, 5000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { text, gradient } = items[index];
  return (
    <span
      style={{
        backgroundImage: gradient,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        opacity: Number(!!visible),
        transform: visible ? "translateY(0)" : "translateY(-12px)",
        transition: "opacity 0.35s ease, transform 0.35s ease",
        display: "inline-block",
        paddingBottom: "0.15em",
      }}
    >
      {text}
    </span>
  );
}
