import { Track } from '../types/track';

export interface DefaultDemoTrackConfig {
  track: Track;
  synthType: 'midnight_reverie' | 'linux_kernel_lofi' | 'neon_drift';
}

export const DEMO_TRACKS: DefaultDemoTrackConfig[] = [
  {
    synthType: 'midnight_reverie',
    track: {
      id: 'demo-track-1',
      title: 'Midnight Reverie',
      artist: 'Kaelen Vance',
      album: 'Nocturnal Echoes',
      genre: 'Ambient / Chill',
      year: 2026,
      trackNumber: 1,
      duration: 36,
      fileName: 'midnight_reverie.wav',
      fileSize: 6350444,
      fileType: 'audio/wav',
      dateAdded: Date.now() - 86400000 * 3,
      playCount: 14,
      lastPlayedAt: Date.now() - 3600000 * 2,
      isFavorite: true,
      sourceType: 'synth_demo',
      lyricsOffset: 0,
      lyricsProvider: 'Embedded / Offline',
      bpm: 88,
      key: 'A Minor',
      keyCamelot: '8A',
      persianTranslations: {
        '(soft rhodes ambient intro)': '(مقدمه آرام و ملایم پیانو رودز)',
        'deep in the quiet of the night': 'در ژرفای سکوت شب',
        'screen glow replaces fading light': 'درخشش نمایشگر، جایگزین نورِ محو شونده می‌شود',
        'the terminal waits for a command': 'ترمینال در انتظار یک فرمان نشسته است',
        'binary ripples in the sand': 'موج‌های صفر و یک در شن‌های روان',
        'no rush, no noise, just rhythm and grace': 'نه شتابی، نه غوغایی؛ تنها ریتم و وقار',
        'finding peace in this dark space': 'یافتن آرامش در این کرانه تاریک',
        '(ambient harmonic fade out)': '(محو شدن تدریجی هارمونی‌های ملایم)',
      },
      lyrics: `[00:00.00] (Soft Rhodes ambient intro)
[00:04.50] Deep in the quiet of the night
[00:09.00] Screen glow replaces fading light
[00:13.50] The terminal waits for a command
[00:18.00] Binary ripples in the sand
[00:22.50] No rush, no noise, just rhythm and grace
[00:27.00] Finding peace in this dark space
[00:31.50] (Ambient harmonic fade out)`,
    },
  },
  {
    synthType: 'linux_kernel_lofi',
    track: {
      id: 'demo-track-2',
      title: 'Kernel Panic (Chill Mix)',
      artist: 'Tux & The Daemons',
      album: 'POSIX Dreams',
      genre: 'Lo-Fi Beats',
      year: 2025,
      trackNumber: 2,
      duration: 36,
      fileName: 'kernel_panic_lofi.wav',
      fileSize: 6350444,
      fileType: 'audio/wav',
      dateAdded: Date.now() - 86400000 * 2,
      playCount: 9,
      lastPlayedAt: Date.now() - 3600000 * 5,
      isFavorite: false,
      sourceType: 'synth_demo',
      lyricsOffset: 0,
      lyricsProvider: 'Embedded / Offline',
      bpm: 82,
      key: 'C Major',
      keyCamelot: '8B',
      persianTranslations: {
        '(dusty electric piano arp)': '(آرپژ پیانوی الکتریک قدیمی)',
        'compiling thoughts into a stream': 'کامپایل کردن افکار در جریانی پیوسته',
        'living inside a hacker\'s dream': 'زندگی در رویای یک هکر',
        'systemd sleeps while we unwind': 'سیستم‌دی در خواب است در حالی که ما آرام می‌گیریم',
        'leaving the daily stack behind': 'پشت سر گذاشتن بار سنگین روزمرگی',
        'low latency, high frequency vibes': 'تاخیر اندک، ارتعاشات پربسامد و آرامش‌بخش',
        'echoes of code and nighttime tribes': 'طنین کدها و قبیله‌های شب‌زنده‌دار',
        'steady heartbeat on the kick': 'ضربان پایدار طبلِ بیس',
        'smooth release and gentle click': 'رهایی نرم و نوای آرام کلیک',
      },
      lyrics: `[00:00.00] (Dusty electric piano arp)
[00:04.00] Compiling thoughts into a stream
[00:08.00] Living inside a hacker's dream
[00:12.00] Systemd sleeps while we unwind
[00:16.00] Leaving the daily stack behind
[00:20.00] Low latency, high frequency vibes
[00:24.00] Echoes of code and nighttime tribes
[00:28.00] Steady heartbeat on the kick
[00:32.00] Smooth release and gentle click`,
    },
  },
  {
    synthType: 'neon_drift',
    track: {
      id: 'demo-track-3',
      title: 'Neon Horizon',
      artist: 'Aura Protocol',
      album: 'Wayland City',
      genre: 'Synthwave',
      year: 2026,
      trackNumber: 3,
      duration: 36,
      fileName: 'neon_horizon.wav',
      fileSize: 6350444,
      fileType: 'audio/wav',
      dateAdded: Date.now() - 86400000,
      playCount: 22,
      lastPlayedAt: Date.now() - 1800000,
      isFavorite: true,
      sourceType: 'synth_demo',
      lyricsOffset: 0,
      lyricsProvider: 'Embedded / Offline',
      bpm: 124,
      key: 'F Minor',
      keyCamelot: '4A',
      persianTranslations: {
        '(analog bassline sweeps in)': '(خط بیس آنالوگ فرا می‌رسد)',
        'driving fast through endless rain': 'راندن با سرعت در میان بارانی بی‌پایان',
        'neon reflections ease the strain': 'انعکاس نورهای نئون، خستگی را می‌زداید',
        'synthesizer cutting through the dark': 'نوای سینت‌سایزر که تاریکی را می‌شکافد',
        'every frequency leaves a spark': 'هر بسامد، جرقه‌ای بر جای می‌گذارد',
        'analog warmth against the cold': 'گرمای آنالوگ در برابر سرمای استخوان‌سوز',
        'stories that never get too old': 'قصه‌هایی که هرگز غبار کهنگی نمی‌گیرند',
        '(filter resonance cutoff fade)': '(فرود تدریجی فیلتر صدا)',
      },
      lyrics: `[00:00.00] (Analog bassline sweeps in)
[00:04.50] Driving fast through endless rain
[00:09.00] Neon reflections ease the strain
[00:13.50] Synthesizer cutting through the dark
[00:18.00] Every frequency leaves a spark
[00:22.50] Analog warmth against the cold
[00:27.00] Stories that never get too old
[00:31.50] (Filter resonance cutoff fade)`,
    },
  },
];
