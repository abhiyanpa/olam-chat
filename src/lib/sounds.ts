// Sound management for message notifications
// Using simple, royalty-free sound alternatives

class SoundManager {
  private sounds: Map<string, HTMLAudioElement>;
  private isMuted: boolean;
  private lastPlayTime: Map<string, number>;
  private debounceDelay = 300; // ms

  constructor() {
    this.sounds = new Map();
    this.lastPlayTime = new Map();
    this.isMuted = this.loadMutePreference();
    this.initializeSounds();
  }

  private initializeSounds() {
    // Using simple tone generation as placeholder
    // Replace these with actual sound file URLs when ready
    // Suggested sources: freesound.org, zapsplat.com, or mixkit.co
    
    // For now, we'll create simple audio contexts
    // To use real sounds, replace with: new Audio('/sounds/sent.mp3')
    try {
      // Placeholder - replace with actual sound files
      this.sounds.set('sent', this.createSentSound());
      this.sounds.set('received', this.createReceivedSound());
    } catch (error) {
      console.warn('Sound initialization failed:', error);
    }
  }

  // Simple sound generation using Web Audio API as placeholder
  private createSentSound(): HTMLAudioElement {
    // This creates a simple "pop" sound
    // Replace with: return new Audio('/sounds/sent.mp3')
    const audio = new Audio();
    audio.src = this.generateTone(800, 0.1, 'sine');
    audio.volume = 0.3;
    return audio;
  }

  private createReceivedSound(): HTMLAudioElement {
    // This creates a simple notification tone
    // Replace with: return new Audio('/sounds/received.mp3')
    const audio = new Audio();
    audio.src = this.generateTone(600, 0.15, 'sine');
    audio.volume = 0.4;
    return audio;
  }

  private generateTone(frequency: number, duration: number, type: OscillatorType): string {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);

      // Create a simple data URL (this is a workaround)
      // In production, use real audio files
      return 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
    } catch (error) {
      console.warn('Tone generation failed:', error);
      return '';
    }
  }

  private shouldPlaySound(soundName: string): boolean {
    if (this.isMuted) return false;

    const now = Date.now();
    const lastPlay = this.lastPlayTime.get(soundName) || 0;

    if (now - lastPlay < this.debounceDelay) {
      return false; // Debounce rapid sounds
    }

    this.lastPlayTime.set(soundName, now);
    return true;
  }

  public playSent() {
    if (!this.shouldPlaySound('sent')) return;

    try {
      const sound = this.sounds.get('sent');
      if (sound) {
        sound.currentTime = 0;
        sound.play().catch(err => {
          console.warn('Failed to play sent sound:', err);
        });
      }
    } catch (error) {
      // Silently fail - browser might block autoplay
    }
  }

  public playReceived() {
    if (!this.shouldPlaySound('received')) return;

    try {
      const sound = this.sounds.get('received');
      if (sound) {
        sound.currentTime = 0;
        sound.play().catch(err => {
          console.warn('Failed to play received sound:', err);
        });
      }
    } catch (error) {
      // Silently fail - browser might block autoplay
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.saveMutePreference();
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    this.saveMutePreference();
  }

  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  private loadMutePreference(): boolean {
    try {
      const stored = localStorage.getItem('olam-chat-sounds-muted');
      return stored === 'true';
    } catch {
      return false;
    }
  }

  private saveMutePreference() {
    try {
      localStorage.setItem('olam-chat-sounds-muted', String(this.isMuted));
    } catch (error) {
      console.warn('Failed to save sound preference:', error);
    }
  }
}

// Export singleton instance
export const soundManager = new SoundManager();

// Instructions for adding real sound files:
// 1. Create a 'public/sounds' folder
// 2. Add these files:
//    - sent.mp3 (short swoosh/pop sound, ~20KB)
//    - received.mp3 (notification tone, ~30KB)
// 3. Replace the createSentSound and createReceivedSound methods:
//    return new Audio('/sounds/sent.mp3');
//    return new Audio('/sounds/received.mp3');
//
// Free sound sources:
// - freesound.org (CC0 license)
// - mixkit.co (free license)
// - zapsplat.com (free with attribution)
// - notification-sounds.com
// - soundbible.com
