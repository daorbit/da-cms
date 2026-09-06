import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Dictation, using the browser's own speech recogniser.
 *
 * The Web Speech API rather than a server round trip: recording audio, posting
 * it and transcribing it upstream would be a new endpoint, a new provider key,
 * a new upload limit and a new thing to meter — for a feature whose entire job
 * is saving someone from typing a sentence. The browser already has a
 * recogniser, it is free, and it costs us no infrastructure at all.
 *
 * The trade, which the UI must not hide: it is unevenly implemented. Chrome,
 * Edge and Safari have it; Firefox does not. So `supported` is part of the
 * public surface and the button is expected to disappear rather than fail —
 * a mic that does nothing when pressed is worse than no mic.
 *
 * Privacy note worth carrying into the docs page: Chrome's implementation
 * streams the audio to Google for recognition. That is the user's own voice,
 * spoken deliberately into a dictation control, so it is defensible — but it is
 * not on-device, and saying otherwise would be wrong.
 */

/**
 * The two names this API ships under.
 *
 * Still prefixed everywhere except Firefox, which does not implement it at all,
 * so the unprefixed name is checked first for whenever that changes.
 */
type RecognitionCtor = new () => SpeechRecognitionLike;

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<
    ArrayLike<{ transcript: string }> & { isFinal: boolean }
  >;
};

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type SpeechInput = {
  /** Whether this browser has a recogniser at all. False hides the control. */
  supported: boolean;
  listening: boolean;
  /** Set when recognition failed in a way worth telling the user about. */
  error: string | null;
  start(): void;
  stop(): void;
  toggle(): void;
};

export type SpeechInputOptions = {
  /**
   * Called with the transcript so far, growing as the user speaks.
   *
   * Fired for interim results too, so the field fills in live rather than
   * staying empty until the sentence ends — without it there is no feedback
   * that the mic is working, and people stop talking to check.
   */
  onTranscript(text: string, final: boolean): void;
  /** BCP-47 tag. Defaults to the browser's own locale. */
  lang?: string;
};

/**
 * Errors worth surfacing, in the words a user can act on.
 *
 * `no-speech` and `aborted` are deliberately absent: both are the ordinary
 * result of pressing the mic and changing your mind, and reporting them turns
 * a non-event into an error message.
 */
const MESSAGES: Record<string, string> = {
  "not-allowed": "Microphone access was blocked. Allow it in your browser to dictate.",
  "service-not-allowed": "Your browser blocked speech recognition.",
  network: "Speech recognition needs a connection and could not reach the service.",
  "audio-capture": "No microphone was found.",
};

export function useSpeechInput({ onTranscript, lang }: SpeechInputOptions): SpeechInput {
  const [supported] = useState(() => recognitionCtor() !== null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognition = useRef<SpeechRecognitionLike | null>(null);

  /**
   * The callback, held in a ref.
   *
   * The recogniser's handlers are attached once when it starts, so a callback
   * captured at that moment would go stale as the component re-renders around
   * it — and `onTranscript` closes over the composer's current value, which
   * changes on every keystroke.
   */
  const emit = useRef(onTranscript);
  emit.current = onTranscript;

  const stop = useCallback(() => {
    // `stop` rather than `abort`: it lets the recogniser deliver whatever it has
    // already heard as a final result, so the last word is not dropped by
    // pressing the button as the sentence ends.
    recognition.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor || recognition.current) return;

    setError(null);
    const engine = new Ctor();
    engine.lang = lang || navigator.language || "en-US";
    // Keep going across pauses. Without it the recogniser stops at the first
    // silence, which is halfway through most questions.
    engine.continuous = true;
    engine.interimResults = true;

    engine.onresult = (event) => {
      let text = "";
      let final = false;
      // Only results from this event: everything before `resultIndex` has been
      // delivered already, and re-reading it would repeat the sentence.
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        text += result[0]?.transcript ?? "";
        if (result.isFinal) final = true;
      }
      if (text) emit.current(text, final);
    };

    engine.onerror = (event) => {
      const message = MESSAGES[event.error];
      if (message) setError(message);
      // Anything that reaches here has ended the session, whether or not it is
      // worth reporting — so the button must not stay lit.
      setListening(false);
      recognition.current = null;
    };

    engine.onend = () => {
      setListening(false);
      recognition.current = null;
    };

    try {
      engine.start();
      recognition.current = engine;
      setListening(true);
    } catch {
      // Calling `start` on an engine that is already running throws. Nothing to
      // recover — the mic is on, which is what was wanted.
      setListening(false);
      recognition.current = null;
    }
  }, [lang]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  // A recogniser left running after its component unmounts holds the
  // microphone — and the browser's recording indicator stays lit on a page that
  // no longer has anything listening.
  useEffect(() => {
    return () => {
      recognition.current?.abort();
      recognition.current = null;
    };
  }, []);

  return { supported, listening, error, start, stop, toggle };
}
