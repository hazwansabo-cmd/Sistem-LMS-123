"use client";
import { useUI } from "@/store/app";
import { translate, type DictKey } from "@/lib/i18n";

export function useI18n() {
  const lang = useUI((s) => s.lang);
  const t = (key: DictKey) => translate(key, lang);
  return { t, lang };
}
