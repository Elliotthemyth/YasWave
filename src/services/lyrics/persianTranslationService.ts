import { TranslationProvider } from '../../types/lyrics';

/**
 * Curated offline Persian lyric translations for common poetic & song expressions
 * to ensure immediate offline functionality and instant demonstration.
 */
const OFFLINE_PHRASE_DICTIONARY: Record<string, string> = {
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
  'living inside a hacker\'s dream': 'زندگی در رویای یک هکر',
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

/**
 * Free client-side translation proxy for single lines using Google Translate public endpoint.
 * Note: Zero-install, no API key required, pure HTTPS fetch with rate limiting.
 */
async function translateLineViaFreeService(text: string): Promise<string> {
  const clean = text.trim();
  if (!clean || clean.length > 500) return clean;

  // Ignore parenthetical audio cue lines or translate if known
  const lower = clean.toLowerCase();
  if (OFFLINE_PHRASE_DICTIONARY[lower]) {
    return OFFLINE_PHRASE_DICTIONARY[lower];
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=fa&dt=t&q=${encodeURIComponent(
      clean
    )}`;
    const res = await fetch(url);
    if (!res.ok) return '';
    const json = await res.json();
    if (json && json[0] && Array.isArray(json[0])) {
      const translated = json[0].map((item: unknown[]) => item[0]).join('');
      return translated;
    }
    return '';
  } catch (err) {
    console.warn(`Translation fetch skipped for line "${clean}":`, err);
    return '';
  }
}

export class PersianTranslationService implements TranslationProvider {
  readonly name = 'PersianTranslationProvider';

  // Cache: lineText.toLowerCase() -> persian translation
  private cache = new Map<string, string>();

  constructor() {
    // Preload offline dictionary into cache
    for (const [en, fa] of Object.entries(OFFLINE_PHRASE_DICTIONARY)) {
      this.cache.set(en, fa);
    }
  }

  /**
   * Translate array of lines into Persian
   */
  async translateLines(
    lines: string[],
    _targetLang = 'fa',
    context?: { title?: string; artist?: string }
  ): Promise<string[]> {
    const results: string[] = [];

    // Process lines in chunks of 5 to avoid browser network throttling
    const chunkSize = 5;
    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunk = lines.slice(i, i + chunkSize);
      const chunkPromises = chunk.map(async (line) => {
        const trimmed = line.trim();
        if (!trimmed) return '';

        const key = trimmed.toLowerCase();
        if (this.cache.has(key)) {
          return this.cache.get(key)!;
        }

        // Try free translation service
        const translated = await translateLineViaFreeService(trimmed);
        if (translated) {
          this.cache.set(key, translated);
          return translated;
        }

        return '';
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Get single line translation if available
   */
  getSingleLineTranslation(line: string): string | undefined {
    return this.cache.get(line.trim().toLowerCase());
  }

  /**
   * Manually store or override a user-edited translation
   */
  setSingleLineTranslation(originalLine: string, persianTranslation: string): void {
    this.cache.set(originalLine.trim().toLowerCase(), persianTranslation.trim());
  }
}

export const persianTranslationService = new PersianTranslationService();
