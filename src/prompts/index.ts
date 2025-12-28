import { promptDe } from "./de.js";
import { promptEn } from "./en.js";
import type { Language } from "../types.js";

export function getPrompt(lang: Language): string {
  return lang === "en" ? promptEn : promptDe;
}
