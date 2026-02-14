"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";
import toast from "react-hot-toast";

// Web Speech API type declarations for browsers
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: { transcript: string; confidence: number };
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  readonly error: string;
  readonly message: string;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  disabled?: boolean;
}

// Check for browser support
function getSpeechRecognition(): (new () => ISpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

/** Request mic permission explicitly — returns true if granted */
async function requestMicPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Got permission — stop the stream immediately (we only needed the permission)
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch (err: any) {
    const name = err?.name || "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      toast.error(
        "Microphone blocked — open System Settings → Privacy & Security → Microphone → enable Chrome, then reload.",
        { duration: 6000, id: "mic-perm" }
      );
    } else if (name === "NotFoundError") {
      toast.error("No microphone found. Please connect a microphone.", {
        duration: 4000,
        id: "mic-perm",
      });
    } else {
      toast.error(`Microphone error: ${err?.message || name}`, {
        duration: 4000,
        id: "mic-perm",
      });
    }
    return false;
  }
}

export default function VoiceButton({ onTranscript, className = "", disabled = false }: VoiceButtonProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const transcriptRef = useRef("");

  useEffect(() => {
    setSupported(!!getSpeechRecognition());
  }, []);

  const startListening = useCallback(async () => {
    const SpeechRecognitionClass = getSpeechRecognition();
    if (!SpeechRecognitionClass) return;

    // Explicitly request mic permission first
    const allowed = await requestMicPermission();
    if (!allowed) return;

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    transcriptRef.current = "";

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        }
      }
      if (finalTranscript) {
        transcriptRef.current += finalTranscript;
        onTranscript(transcriptRef.current.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        toast.error(
          "Microphone blocked — open System Settings → Privacy & Security → Microphone → enable Chrome, then reload.",
          { duration: 6000, id: "mic-perm" }
        );
      } else if (event.error === "no-speech") {
        toast("No speech detected — try again", { icon: "🎤", id: "mic-no-speech" });
      } else if (event.error !== "aborted") {
        toast.error(`Voice error: ${event.error}`, { duration: 3000 });
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      if (transcriptRef.current.trim()) {
        onTranscript(transcriptRef.current.trim());
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
      toast.success("Listening… speak now", { duration: 2000, id: "mic-start" });
    } catch (e: any) {
      console.error("Failed to start recognition:", e);
      toast.error("Could not start voice input", { duration: 3000 });
    }
  }, [onTranscript]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  }, [listening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      title={listening ? "Stop dictation" : "Voice input"}
      className={`p-1 transition-colors rounded ${
        listening
          ? "text-red-500 hover:text-red-600 animate-pulse"
          : "text-slate-400 hover:text-blue-500"
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""} ${className}`}
    >
      {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
    </button>
  );
}
