import { pinyin } from "pinyin-pro";
import * as wanakana from "wanakana";
import { LyricLine } from "../types";

// ==========================================
// Korean Hangul Revised Romanization Tables
// ==========================================

const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;

// Initial Consonants (Choseong - 19)
const CHOSEONG = [
  "g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss",
  "", "j", "jj", "ch", "k", "t", "p", "h"
];

// Medial Vowels (Jungseong - 21)
const JUNGSEONG = [
  "a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa",
  "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"
];

// Final Consonants (Jongseong - 28, 0 is empty)
const JONGSEONG = [
  "", "k", "k", "ks", "n", "nj", "nh", "t", "l", "lg", "lm",
  "lb", "ls", "lt", "lp", "lh", "m", "p", "ps", "t", "t",
  "ng", "t", "t", "k", "t", "p", "t"
];

/**
 * Converts a Korean Hangul block or syllable into Revised Romanization
 */
function romanizeHangulSyllable(code: number, nextCode?: number): string {
  if (code < HANGUL_BASE || code > HANGUL_LAST) {
    return String.fromCharCode(code);
  }

  const offset = code - HANGUL_BASE;
  const choseongIndex = Math.floor(offset / 588);
  const jungseongIndex = Math.floor((offset % 588) / 28);
  const jongseongIndex = offset % 28;

  let initial = CHOSEONG[choseongIndex];
  const vowel = JUNGSEONG[jungseongIndex];
  let final = JONGSEONG[jongseongIndex];

  // Special sound liaison adjustments if followed by a vowel or empty initial
  if (nextCode && nextCode >= HANGUL_BASE && nextCode <= HANGUL_LAST) {
    const nextOffset = nextCode - HANGUL_BASE;
    const nextChoIndex = Math.floor(nextOffset / 588);

    // If next syllable starts with 'ㅇ' (empty initial), liaison occurs
    if (nextChoIndex === 11) {
      if (jongseongIndex === 8) { // ㄹ (l -> r)
        final = "r";
      } else if (jongseongIndex === 1) { // ㄱ (k -> g)
        final = "g";
      } else if (jongseongIndex === 7) { // ㄷ (t -> d)
        final = "d";
      } else if (jongseongIndex === 17) { // ㅂ (p -> b)
        final = "b";
      } else if (jongseongIndex === 19) { // ㅅ (t -> s)
        final = "s";
      } else if (jongseongIndex === 22) { // ㅈ (t -> j)
        final = "j";
      }
    }
  }

  return `${initial}${vowel}${final}`;
}

/**
 * Romanizes a Korean Hangul string
 */
export function romanizeKorean(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= HANGUL_BASE && code <= HANGUL_LAST) {
      const nextCode = i + 1 < text.length ? text.charCodeAt(i + 1) : undefined;
      result += romanizeHangulSyllable(code, nextCode);
    } else {
      result += text[i];
    }
  }
  return result;
}

// ==========================================
// Cyrillic Latin Transliteration Table
// ==========================================
const CYRILLIC_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  А: "A", Б: "B", В: "V", Г: "G", Д: "D", Е: "E", Ё: "Yo", Ж: "Zh",
  З: "Z", И: "I", Й: "Y", К: "K", Л: "L", М: "M", Н: "N", О: "O",
  П: "P", Р: "R", С: "S", Т: "T", У: "U", Ф: "F", Х: "Kh", Ц: "Ts",
  Ч: "Ch", Ш: "Sh", Щ: "Shch", Ъ: "", Ы: "Y", Ь: "", Э: "E", Ю: "Yu", Я: "Ya"
};

export function romanizeCyrillic(text: string): string {
  return text.split("").map((ch) => CYRILLIC_MAP[ch] || ch).join("");
}

// ==========================================
// Japanese Kana & Chinese Hanzi Romanization
// ==========================================

const CHINESE_CHAR_REGEX = /[\u4e00-\u9fff]/;
const HANGUL_CHAR_REGEX = /[\uac00-\ud7af\u1100-\u11ff]/;
const JAPANESE_KANA_REGEX = /[\u3040-\u309f\u30a0-\u30ff]/;
const CYRILLIC_CHAR_REGEX = /[\u0400-\u04ff]/;

/**
 * Romanizes a single text string across Chinese, Korean, Japanese, Cyrillic, or English
 */
export function romanizeText(text: string): string {
  if (!text || typeof text !== "string") return "";

  let processed = text;

  // 1. Korean Hangul
  if (HANGUL_CHAR_REGEX.test(processed)) {
    processed = romanizeKorean(processed);
  }

  // 2. Japanese Kana (Hiragana / Katakana)
  if (JAPANESE_KANA_REGEX.test(processed)) {
    try {
      processed = wanakana.toRomaji(processed, { upcaseKatakana: false });
    } catch {
      // ignore
    }
  }

  // 3. Chinese Hanzi Characters (Pinyin without difficult tone numbers for smooth singing)
  if (CHINESE_CHAR_REGEX.test(processed)) {
    try {
      processed = pinyin(processed, {
        toneType: "none",
        nonZh: "consecutive",
      });
    } catch {
      // ignore
    }
  }

  // 4. Cyrillic
  if (CYRILLIC_CHAR_REGEX.test(processed)) {
    processed = romanizeCyrillic(processed);
  }

  return processed;
}

/**
 * Pure client-side function to convert a raw LRC string into a Romanized LRC string.
 * Strictly extracts and preserves timestamp tags `[mm:ss.xx]` while romanizing lyrics.
 */
export function romanizeLRCLyrics(rawLrcString: string): string {
  if (!rawLrcString || typeof rawLrcString !== "string") return "";

  const lines = rawLrcString.split("\n");
  const timestampRegex = /^(\[\d{1,2}:\d{2}(?:\.\d{1,3})?\])(.*)$/;

  const romanizedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return "";

    const match = trimmed.match(timestampRegex);
    if (match) {
      const timestamp = match[1];
      const lyricText = match[2];
      if (!lyricText.trim()) return timestamp;
      const romanized = romanizeText(lyricText);
      return `${timestamp} ${romanized.trim()}`;
    }

    return romanizeText(trimmed);
  });

  return romanizedLines.join("\n");
}

/**
 * Romanizes an array of parsed LyricLine objects instantly
 */
export function romanizeLyricLines(lines: LyricLine[]): LyricLine[] {
  if (!lines || lines.length === 0) return [];
  return lines.map((line) => ({
    ...line,
    text: romanizeText(line.text),
  }));
}
