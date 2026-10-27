// Audio utility for Gemini TTS with Web Speech API fallback, and Speech Recognition

class AudioManager {
  private currentAudio: HTMLAudioElement | null = null;

  isSpeechSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  getEnglishVoices(): SpeechSynthesisVoice[] {
    if (!this.isSpeechSupported()) return [];
    const voices = window.speechSynthesis.getVoices();
    return voices.filter((v) => v.lang.startsWith('en'));
  }

  // General speak method
  async speak(text: string, voiceName?: string, rate: number = 0.92): Promise<void> {
    return this.speakSentence(text, rate, voiceName);
  }

  // Fast sentence speak for continuous reading with zero network latency
  speakSentence(text: string, rate: number = 0.92, voiceName?: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isSpeechSupported()) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = rate;

      const voices = window.speechSynthesis.getVoices();
      let chosenVoice: SpeechSynthesisVoice | undefined;

      if (voiceName) {
        chosenVoice = voices.find((v) => v.name === voiceName);
      }

      if (!chosenVoice) {
        chosenVoice = voices.find(
          (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen'))
        ) || voices.find((v) => v.lang.startsWith('en'));
      }

      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }

      let done = false;
      const onDone = () => {
        if (!done) {
          done = true;
          resolve();
        }
      };

      utterance.onend = onDone;
      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e);
        onDone();
      };

      // Safety fallback in case browser misses onend event
      const wordCount = text.trim().split(/\s+/).length;
      const timeoutMs = Math.max(1200, (wordCount / 2.0) * 1000 + 1500);
      const timer = setTimeout(onDone, timeoutMs);

      utterance.onend = () => {
        clearTimeout(timer);
        onDone();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  pause() {
    if (this.isSpeechSupported() && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
  }

  resume() {
    if (this.isSpeechSupported() && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }

  // Fallback to browser's native SpeechSynthesis
  fallbackWebSpeech(text: string): Promise<void> {
    return this.speakSentence(text);
  }

  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    if (this.isSpeechSupported()) {
      window.speechSynthesis.cancel();
    }
  }
}

export const audioManager = new AudioManager();

// Browser Speech Recognition Helper for reading aloud
export interface SpeechRecognitionResultState {
  transcript: string;
  isFinal: boolean;
}

export class SpeechInputService {
  private recognition: any = null;
  private isListening: boolean = false;

  constructor() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
    }
  }

  isSupported(): boolean {
    return !!this.recognition;
  }

  start(
    onResult: (result: SpeechRecognitionResultState) => void,
    onError?: (err: any) => void
  ): boolean {
    if (!this.recognition) return false;
    if (this.isListening) return true;

    try {
      this.recognition.onresult = (event: any) => {
        let transcript = '';
        let isFinal = false;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            isFinal = true;
          }
        }

        onResult({ transcript, isFinal });
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (onError) onError(event.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };

      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      return false;
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
      this.isListening = false;
    }
  }
}

export const speechService = new SpeechInputService();
