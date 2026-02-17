"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, X, Volume2, Loader2, Wallet, AlertCircle, Monitor } from "lucide-react";

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultItem {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEv extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((ev: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEv) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionInstance;
}

type RigoState = "idle" | "listening" | "processing" | "speaking" | "error";

interface ConversationEntry {
  role: "user" | "assistant";
  content: string;
}

function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  const win = window as unknown as Record<string, unknown>;
  return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
}

export function RigoAssistant() {
  const [state, setState] = useState<RigoState>("idle");
  const [isOpen, setIsOpen] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [conversationHistory, setConversationHistory] = useState<ConversationEntry[]>([]);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [lastCost, setLastCost] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [browserSupported, setBrowserSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const pulseTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setBrowserSupported(isSpeechRecognitionSupported());
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const cleanup = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (error) {}
      recognitionRef.current = null;
    }
    stopSpeaking();
    if (pulseTimerRef.current) {
      clearInterval(pulseTimerRef.current);
      pulseTimerRef.current = null;
    }
  }, [stopSpeaking]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setState("idle");
      return;
    }

    setState("speaking");
    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-GB";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const britishVoice = voices.find(v =>
      v.lang === "en-GB" && (v.name.includes("Female") || v.name.includes("Google") || v.name.includes("Daniel"))
    ) || voices.find(v => v.lang === "en-GB") || voices[0];

    if (britishVoice) {
      utterance.voice = britishVoice;
    }

    utterance.onend = () => setState("idle");
    utterance.onerror = () => setState("idle");

    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [stopSpeaking]);

  const sendToRigo = useCallback(async (userMessage: string) => {
    setState("processing");
    setError("");

    try {
      const res = await fetch("/api/rigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: conversationHistory.slice(-10),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "INSUFFICIENT_BALANCE" || data.code === "SPENDING_CAP_EXCEEDED") {
          setError(data.error || "Wallet balance too low.");
          setState("error");
          if (data.spokenResponse) speak(data.spokenResponse);
          return;
        }
        if (data.refunded) {
          setError("Request failed. Your wallet has been refunded.");
          setState("error");
          if (data.spokenResponse) speak(data.spokenResponse);
          return;
        }
        throw new Error(data.error || "Request failed");
      }

      const assistantResponse = data.response;
      setResponse(assistantResponse);
      setLastCost(data.cost ?? null);
      setHasGreeted(true);

      setConversationHistory(prev => [
        ...prev,
        { role: "user", content: userMessage },
        { role: "assistant", content: assistantResponse },
      ]);

      speak(assistantResponse);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      setState("error");
    }
  }, [conversationHistory, speak]);

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;

    const win = window as unknown as Record<string, unknown>;
    const SpeechRecognitionCtor = (win.SpeechRecognition || win.webkitSpeechRecognition) as SpeechRecognitionConstructor | undefined;

    if (!SpeechRecognitionCtor) {
      setError("Voice input is not supported in this browser. Please use Chrome or Edge.");
      setState("error");
      return;
    }

    stopSpeaking();
    setTranscript("");
    setResponse("");
    setError("");

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-GB";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionResultEvent) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);

      if (finalTranscript) {
        recognitionRef.current = null;
        sendToRigo(finalTranscript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEv) => {
      if (event.error === "no-speech") {
        setError("No speech detected. Tap the microphone and try again.");
      } else if (event.error === "not-allowed") {
        setError("Microphone access denied. Please allow microphone access in your browser settings.");
      } else {
        setError("Could not understand. Please try again.");
      }
      setState("error");
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      if (state === "listening") {
        setState("idle");
      }
    };

    recognitionRef.current = recognition;
    setState("listening");
    recognition.start();
  }, [state, stopSpeaking, sendToRigo]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (error) {}
      recognitionRef.current = null;
    }
    setState("idle");
  }, []);

  const handleMicClick = useCallback(() => {
    if (state === "listening") {
      stopListening();
    } else if (state === "speaking") {
      stopSpeaking();
      setState("idle");
    } else if (state === "idle" || state === "error") {
      startListening();
    }
  }, [state, startListening, stopListening, stopSpeaking]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setDismissed(false);
    if (!hasGreeted) {
      sendToRigo("Hello");
    }
  }, [hasGreeted, sendToRigo]);

  const handleClose = useCallback(() => {
    cleanup();
    setIsOpen(false);
    setState("idle");
    setTranscript("");
    setResponse("");
    setError("");
  }, [cleanup]);

  if (dismissed) return null;
  if (!browserSupported) return null;

  const stateLabel: Record<RigoState, string> = {
    idle: "Tap to speak",
    listening: "Listening...",
    processing: "Thinking...",
    speaking: "Speaking...",
    error: "Tap to try again",
  };

  const stateColor: Record<RigoState, string> = {
    idle: "bg-primary text-primary-foreground",
    listening: "bg-red-500 text-white",
    processing: "bg-amber-500 text-white",
    speaking: "bg-blue-500 text-white",
    error: "bg-destructive text-destructive-foreground",
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-40" data-testid="rigo-fab">
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg bg-primary text-primary-foreground"
          onClick={handleOpen}
          data-testid="button-rigo-open"
        >
          <Mic className="h-6 w-6" />
        </Button>
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-50" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-primary" />
        </span>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-80" data-testid="rigo-panel">
      <Card className="shadow-xl">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground shrink-0">
              <Mic className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" data-testid="text-rigo-title">Rigo</p>
              <p className="text-[11px] text-muted-foreground">Voice Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {lastCost !== null && (
              <Badge variant="outline" className="no-default-hover-elevate text-[10px] gap-0.5">
                <Wallet className="h-2.5 w-2.5" />
                {lastCost === 0 ? "Free" : `${(lastCost * 100).toFixed(0)}p`}
              </Badge>
            )}
            <Button size="icon" variant="ghost" onClick={handleClose} data-testid="button-rigo-close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardContent className="p-4 space-y-3">
          {response && (
            <div className="text-sm text-foreground leading-relaxed" data-testid="text-rigo-response">
              {response}
            </div>
          )}

          {transcript && state === "listening" && (
            <div className="text-sm text-muted-foreground italic" data-testid="text-rigo-transcript">
              {transcript}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive" data-testid="text-rigo-error">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col items-center gap-2 pt-1">
            <button
              onClick={handleMicClick}
              disabled={state === "processing"}
              className={`flex items-center justify-center h-16 w-16 rounded-full transition-all duration-200 ${stateColor[state]} ${state === "processing" ? "opacity-70 cursor-not-allowed" : "cursor-pointer"} ${state === "listening" ? "ring-4 ring-red-500/30" : ""}`}
              data-testid="button-rigo-mic"
            >
              {state === "listening" && <Mic className="h-7 w-7 animate-pulse" />}
              {state === "processing" && <Loader2 className="h-7 w-7 animate-spin" />}
              {state === "speaking" && <Volume2 className="h-7 w-7" />}
              {state === "idle" && <Mic className="h-7 w-7" />}
              {state === "error" && <MicOff className="h-7 w-7" />}
            </button>
            <p className="text-xs text-muted-foreground" data-testid="text-rigo-state">
              {stateLabel[state]}
            </p>
          </div>

          {!response && !error && state === "idle" && (
            <p className="text-xs text-muted-foreground text-center">
              Try saying: &ldquo;How many calls did I get today?&rdquo;
            </p>
          )}

          <p className="text-[10px] text-muted-foreground text-center" data-testid="text-rigo-cost">
            Each interaction costs 1p from your wallet (first greeting free)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
