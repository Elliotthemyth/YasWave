import { VisualizerMode } from '../../types/playback';

export interface VisualizerRenderOptions {
  canvas: HTMLCanvasElement;
  analyser: AnalyserNode | null;
  mode: VisualizerMode;
  accentColor: string;
  isPlaying: boolean;
  barCount?: number;
}

export class VisualizerEngine {
  private animationId: number | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private analyser: AnalyserNode | null = null;
  private mode: VisualizerMode = 'bars';
  private accentColor = '#10b981';
  private isPlaying = false;
  private peakHeights: number[] = [];

  public start(options: VisualizerRenderOptions): void {
    this.stop();

    this.canvas = options.canvas;
    this.ctx = options.canvas.getContext('2d');
    this.analyser = options.analyser;
    this.mode = options.mode;
    this.accentColor = options.accentColor;
    this.isPlaying = options.isPlaying;

    if (!this.canvas || !this.ctx) return;

    this.loop();
  }

  public updateOptions(options: Partial<VisualizerRenderOptions>): void {
    if (options.mode !== undefined) this.mode = options.mode;
    if (options.accentColor !== undefined) this.accentColor = options.accentColor;
    if (options.isPlaying !== undefined) this.isPlaying = options.isPlaying;
    if (options.analyser !== undefined) this.analyser = options.analyser;
  }

  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private loop = (): void => {
    this.render();
    this.animationId = requestAnimationFrame(this.loop);
  };

  private render(): void {
    if (!this.canvas || !this.ctx) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const ctx = this.ctx;

    // Clear background
    ctx.clearRect(0, 0, width, height);

    if (!this.analyser) {
      this.renderIdleFallback(ctx, width, height);
      return;
    }

    if (this.mode === 'bars') {
      this.renderFrequencyBars(ctx, width, height);
    } else if (this.mode === 'wave') {
      this.renderWaveform(ctx, width, height);
    } else if (this.mode === 'circle') {
      this.renderCircularSpectrum(ctx, width, height);
    }
  }

  private renderFrequencyBars(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    const barCount = 48;
    const totalSpacing = 4;
    const barWidth = Math.max(2, (width - (barCount - 1) * totalSpacing) / barCount);
    
    // Resize peakHeights if needed
    if (this.peakHeights.length !== barCount) {
      this.peakHeights = new Array(barCount).fill(0);
    }

    for (let i = 0; i < barCount; i++) {
      // Non-linear frequency scaling to emphasize bass/mids
      const index = Math.floor(Math.pow(i / barCount, 1.6) * (bufferLength * 0.7));
      const value = this.isPlaying ? dataArray[index] : 0;
      
      const percent = value / 255;
      const barHeight = Math.max(3, percent * (height * 0.85));
      const x = i * (barWidth + totalSpacing);
      const y = height - barHeight;

      // Update peak falloff
      if (barHeight >= this.peakHeights[i]) {
        this.peakHeights[i] = barHeight;
      } else {
        this.peakHeights[i] = Math.max(3, this.peakHeights[i] - 1.5);
      }

      // Draw bar gradient
      const gradient = ctx.createLinearGradient(0, height, 0, y);
      gradient.addColorStop(0, this.accentColor + '88'); // 50% opacity at base
      gradient.addColorStop(1, this.accentColor + 'ff');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
      ctx.fill();

      // Draw subtle peak cap
      if (this.isPlaying && this.peakHeights[i] > 6) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, height - this.peakHeights[i] - 2, barWidth, 2);
      }
    }
  }

  private renderWaveform(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.analyser) return;

    const bufferLength = this.analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteTimeDomainData(dataArray);

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = this.accentColor;
    ctx.beginPath();

    const sliceWidth = width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = this.isPlaying ? dataArray[i] / 128.0 : 1.0;
      const y = (v * height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();

    // Subtle glow underline
    ctx.lineWidth = 1;
    ctx.strokeStyle = this.accentColor + '40';
    ctx.stroke();
  }

  private renderCircularSpectrum(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    const centerX = width / 2;
    const centerY = height / 2;
    const baseRadius = Math.min(centerX, centerY) * 0.38;
    const maxBarLength = Math.min(centerX, centerY) * 0.45;
    const count = 64;

    // Draw central ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
    ctx.strokeStyle = this.accentColor + '44';
    ctx.lineWidth = 2;
    ctx.stroke();

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      const binIdx = Math.floor(Math.pow(i / count, 1.4) * (bufferLength * 0.6));
      const value = this.isPlaying ? dataArray[binIdx] : 0;
      const length = Math.max(4, (value / 255) * maxBarLength);

      const x1 = centerX + Math.cos(angle) * baseRadius;
      const y1 = centerY + Math.sin(angle) * baseRadius;
      const x2 = centerX + Math.cos(angle) * (baseRadius + length);
      const y2 = centerY + Math.sin(angle) * (baseRadius + length);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = this.accentColor;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  private renderIdleFallback(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Subtle flat baseline when audio context is inactive
    const centerY = height / 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
  }
}
