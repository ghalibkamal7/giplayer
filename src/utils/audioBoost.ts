// Web Audio API Gain Node for MX Player-style Volume Booster (up to 200%)

class AudioBooster {
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private attachedElement: HTMLMediaElement | null = null;

  attach(videoElement: HTMLMediaElement) {
    if (this.attachedElement === videoElement && this.audioCtx) {
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      this.sourceNode = this.audioCtx.createMediaElementSource(videoElement);
      this.gainNode = this.audioCtx.createGain();
      
      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.audioCtx.destination);
      this.attachedElement = videoElement;
    } catch (e) {
      // Browsers disallow createMediaElementSource more than once on the same element or cross-origin
      console.warn('Audio boost initialization skipped or not permitted:', e);
    }
  }

  setBoost(multiplier: number) {
    // multiplier between 1.0 (normal) and 2.0 (boosted)
    if (this.gainNode && this.audioCtx) {
      try {
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }
        this.gainNode.gain.setValueAtTime(Math.max(0.1, Math.min(2.5, multiplier)), this.audioCtx.currentTime);
      } catch (e) {
        console.warn('Failed to set gain:', e);
      }
    }
  }

  destroy() {
    try {
      if (this.gainNode) {
        this.gainNode.disconnect();
        this.gainNode = null;
      }
      if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }
      if (this.audioCtx && this.audioCtx.state !== 'closed') {
        this.audioCtx.close().catch(() => {});
        this.audioCtx = null;
      }
      this.attachedElement = null;
    } catch {
      // ignore
    }
  }
}

export const audioBooster = new AudioBooster();
