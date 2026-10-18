import { TranslationProvider } from '../../types/lyrics';
import { idbSaveTranslation, idbGetAllTranslations } from '../storage/indexedDb';

/**
 * Curated offline Persian lyric translations for common poetic & song expressions
 * to ensure immediate offline functionality and instant demonstration.
 */
export const OFFLINE_PHRASE_DICTIONARY: Record<string, string> = {
  // Demo track 1: Midnight Reverie
  '(soft rhodes ambient intro)': '(مقدمه آرام و ملایم پیانو رودز)',
  'deep in the quiet of the night': 'در ژرفای سکوت شب',
  'screen glow replaces fading light': 'درخشش نمایشگر، جایگزین نورِ محو شونده می‌شود',
  'the terminal waits for a command': 'ترمینال در انتظار یک فرمان نشسته است',
  'binary ripples in the sand': 'موج‌های صفر و یک در شن‌های روان',
  'no rush, no noise, just rhythm and grace': 'نه شتابی، نه غوغایی؛ تنها ریتم و وقار',
  'finding peace in this dark space': 'یافتن آرامش در این کرانه تاریک',
  '(ambient harmonic fade out)': '(محو شدن تدریجی هارمونی‌های ملایم)',

  // Demo track 2: Kernel Panic (Chill Mix)
  '(dusty electric piano arp)': '(آرپژ پیانوی الکتریک قدیمی)',
  'compiling thoughts into a stream': 'کامپایل کردن افکار در جریانی پیوسته',
  "living inside a hacker's dream": 'زندگی در رویای یک هکر',
  'systemd sleeps while we unwind': 'سیستم‌دی در خواب است در حالی که ما آرام می‌گیریم',
  'leaving the daily stack behind': 'پشت سر گذاشتن بار سنگین روزمرگی',
  'low latency, high frequency vibes': 'تاخیر اندک، ارتعاشات پربسامد و آرامش‌بخش',
  'echoes of code and nighttime tribes': 'طنین کدها و قبیله‌های شب‌زنده‌دار',
  'steady heartbeat on the kick': 'ضربان پایدار طبلِ بیس',
  'smooth release and gentle click': 'رهایی نرم و نوای آرام کلیک',

  // Demo track 3: Neon Horizon
  '(analog bassline sweeps in)': '(خط بیس آنالوگ فرا می‌رسد)',
  'driving fast through endless rain': 'راندن با سرعت در میان بارانی بی‌پایان',
  'neon reflections ease the strain': 'انعکاس نورهای نئون، خستگی را می‌زداید',
  'synthesizer cutting through the dark': 'نوای سینت‌سایزر که تاریکی را می‌شکافد',
  'every frequency leaves a spark': 'هر بسامد، جرقه‌ای بر جای می‌گذارد',
  'analog warmth against the cold': 'گرمای آنالوگ در برابر سرمای استخوان‌سوز',
  'stories that never get too old': 'قصه‌هایی که هرگز غبار کهنگی نمی‌گیرند',
  '(filter resonance cutoff fade)': '(فرود تدریجی فیلتر صدا)',
};

export interface TranslationProgress {
  current: number;
  total: number;
  currentLine: string;
}

export class PersianTranslationService implements TranslationProvider {
  readonly name = 'PersianTranslationProvider';

  // In-memory cache for fast access: normalized lower-case line -> persian translation
  private cache = new Map<string, string>();
  private isCacheInitialized = false;

  constructor() {
    // Preload offline dictionary
    for (const [en, fa] of Object.entries(OFFLINE_PHRASE_DICTIONARY)) {
      this.cache.set(en.toLowerCase(), fa);
    }
  }

  /**
   * Initialize and load persistent translation cache from IndexedDB
   */
  async init(): Promise<void> {
    if (this.isCacheInitialized) return;
    if (typeof indexedDB === 'undefined') {
      this.isCacheInitialized = true;
      return;
    }
    try {
      const persisted = await idbGetAllTranslations();
      for (const [k, v] of Object.entries(persisted)) {
        this.cache.set(k.toLowerCase(), v);
      }
      this.isCacheInitialized = true;
    } catch {
      // Ignore in non-browser envs
    }
  }

  /**
   * Translate a single line using multi-provider cascade:
   * 1. Offline dictionary
   * 2. In-memory & IndexedDB cache
   * 3. Configurable Custom Endpoint (LibreTranslate/Lingva)
   * 4. MyMemory Translation API
   * 5. Google GTX API with fallback
   */
  async translateSingleLine(text: string, customEndpoint?: string): Promise<string> {
    const clean = text.trim();
    if (!clean) return '';
    const key = clean.toLowerCase();

    // 1. Check in-memory cache
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // 2. Custom Endpoint (LibreTranslate compatible)
    if (customEndpoint) {
      try {
        const res = await fetch(`${customEndpoint.replace(/\/+$/, '')}/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: clean, source: 'auto', target: 'fa', format: 'text' }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.translatedText) {
            await this.cacheAndPersist(key, data.translatedText);
            return data.translatedText;
          }
        }
      } catch (err) {
        console.warn('Custom translate endpoint error:', err);
      }
    }

    // 3. MyMemory Public API
    try {
      const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        clean
      )}&langpair=en|fa`;
      const res = await fetch(myMemoryUrl);
      if (res.ok) {
        const json = await res.json();
        if (json?.responseData?.translatedText && !json.responseData.translatedText.includes('QUERY LENGTH LIMIT EXCEEDED')) {
          const trans = json.responseData.translatedText;
          await this.cacheAndPersist(key, trans);
          return trans;
        }
      }
    } catch {
      // Continue to next provider
    }

    // 4. Google Translate GTX
    try {
      const gtxUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=fa&dt=t&q=${encodeURIComponent(
        clean
      )}`;
      const res = await fetch(gtxUrl);
      if (res.ok) {
        const json = await res.json();
        if (json && json[0] && Array.isArray(json[0])) {
          const trans = json[0].map((item: unknown[]) => item[0]).join('');
          if (trans) {
            await this.cacheAndPersist(key, trans);
            return trans;
          }
        }
      }
    } catch {
      // All online providers failed or offline
    }

    return '';
  }

  /**
   * Store translation in memory and persist in IndexedDB
   */
  private async cacheAndPersist(key: string, translation: string): Promise<void> {
    this.cache.set(key, translation);
    try {
      await idbSaveTranslation(key, translation);
    } catch {
      // Storage fallback silently handled
    }
  }

  /**
   * Translate array of lines into Persian with progress reporting
   */
  async translateLines(
    lines: string[],
    _targetLang = 'fa',
    _context?: { title?: string; artist?: string },
    onProgress?: (progress: TranslationProgress) => void,
    customEndpoint?: string
  ): Promise<string[]> {
    await this.init();
    const results: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (onProgress) {
        onProgress({ current: i + 1, total: lines.length, currentLine: line });
      }

      const trimmed = line.trim();
      if (!trimmed) {
        results.push('');
        continue;
      }

      const translated = await this.translateSingleLine(trimmed, customEndpoint);
      results.push(translated);

      // Brief delay between network requests to prevent rate limits
      if (i < lines.length - 1 && !this.cache.has(lines[i + 1].trim().toLowerCase())) {
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
    }

    return results;
  }

  /**
   * Get single line translation if already cached
   */
  getSingleLineTranslation(line: string): string | undefined {
    return this.cache.get(line.trim().toLowerCase());
  }

  /**
   * Manually store or override a user-edited translation
   */
  async setSingleLineTranslation(originalLine: string, persianTranslation: string): Promise<void> {
    const key = originalLine.trim().toLowerCase();
    await this.cacheAndPersist(key, persianTranslation.trim());
  }

  /**
   * Export cache for backup or inspection
   */
  getAllCached(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [k, v] of this.cache.entries()) {
      result[k] = v;
    }
    return result;
  }
}

export const persianTranslationService = new PersianTranslationService();
