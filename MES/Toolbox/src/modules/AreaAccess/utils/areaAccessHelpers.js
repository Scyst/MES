/**
 * Synthesizes WebAudio confirmation/error beep for shopfloor barcode scanning.
 */
export function playAreaBeep(type = 'success') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.14);
    } else {
      osc.type = 'square';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
    setTimeout(() => {
      try {
        ctx.close();
      } catch {
        /* ignore */
      }
    }, 500);
  } catch {
    /* ignore blocked audio context */
  }
}
