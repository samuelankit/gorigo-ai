"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Phone, PhoneOff, Mic, MicOff, Keyboard, Minimize2, Maximize2, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CallPhase = "idle" | "connecting" | "active" | "ended";

interface TranscriptEntry {
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function playRingTone() {
  try {
    const ctx = new AudioContext();
    const playTone = (freq: number, startTime: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.08, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
      osc.start(startTime);
      osc.stop(startTime + dur);
    };
    playTone(440, ctx.currentTime, 0.15);
    playTone(550, ctx.currentTime + 0.18, 0.15);
    playTone(440, ctx.currentTime + 0.4, 0.15);
    playTone(550, ctx.currentTime + 0.58, 0.15);
  } catch {}
}

function playEndTone() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 300;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch {}
}

function hasSpeechRecognition(): boolean {
  if (typeof window === "undefined") return false;
  return !!(
    (window as unknown as Record<string, unknown>).SpeechRecognition ||
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition
  );
}

interface WebCallModalProps {
  onClose: () => void;
}

export function WebCallModal({ onClose }: WebCallModalProps) {
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [callDuration, setCallDuration] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [typedInput, setTypedInput] = useState("");
  const [micError, setMicError] = useState<string | null>(null);
  const [currentInterim, setCurrentInterim] = useState("");
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadError, setLeadError] = useState("");
  const [leadSuccess, setLeadSuccess] = useState(false);
  const [timeLimitWarning, setTimeLimitWarning] = useState(false);
  const [speechSupported] = useState(() => hasSpeechRecognition());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const abortRef = useRef<AbortController | null>(null);
  const phaseRef = useRef<CallPhase>("idle");
  const endCallCalledRef = useRef(false);

  const TIME_LIMIT_SECONDS = 300;

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  function createRecognition() {
    const SpeechRecognitionCtor =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new (SpeechRecognitionCtor as any)();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-GB";
    return recognition;
  }

  const scrollToBottom = useCallback(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [transcript, scrollToBottom]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (phaseRef.current === "active") {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && phaseRef.current === "active" && recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        setIsListening(false);
      } else if (!document.hidden && phaseRef.current === "active" && speechSupported) {
        startListening();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [speechSupported]);

  const sendToAI = useCallback(async (userText: string) => {
    if (!userText.trim()) return;

    setIsProcessing(true);
    historyRef.current.push({ role: "user", content: userText });

    try {
      abortRef.current = new AbortController();
      const res = await fetch("/api/public/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: historyRef.current.slice(-10),
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errText = res.status === 429
          ? "Please slow down a moment, I need a short pause."
          : "I'm having trouble connecting. Could you try again?";
        addAssistantAndSpeak(errText);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) {
        setIsProcessing(false);
        return;
      }

      let fullResponse = "";
      let buffer = "";

      setTranscript((prev) => [
        ...prev,
        { role: "assistant", text: "", timestamp: new Date() },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              fullResponse += data.content;
              const captured = fullResponse;
              setTranscript((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === "assistant") {
                  updated[updated.length - 1] = { ...last, text: captured };
                }
                return updated;
              });
            }
          } catch {}
        }
      }

      historyRef.current.push({ role: "assistant", content: fullResponse });
      speakText(fullResponse);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        addAssistantAndSpeak("Sorry, I lost the connection briefly. Could you repeat that?");
      } else {
        setIsProcessing(false);
      }
    }
  }, []);

  const addAssistantAndSpeak = useCallback((text: string) => {
    setTranscript((prev) => [
      ...prev,
      { role: "assistant", text, timestamp: new Date() },
    ]);
    historyRef.current.push({ role: "assistant", content: text });
    speakText(text);
  }, []);

  const speakText = useCallback((text: string) => {
    setIsProcessing(false);

    if (phaseRef.current !== "active") return;

    const cleaned = text.replace(/[*#_~`>]/g, "").replace(/\[.*?\]\(.*?\)/g, "").trim();
    if (!cleaned) {
      if (speechSupported) startListening();
      return;
    }

    setIsSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.lang = "en-GB";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.name.includes("Google UK English Female") || v.name.includes("Google UK English Male")
    );
    const british = voices.find((v) => v.lang.startsWith("en-GB"));
    if (preferred) utterance.voice = preferred;
    else if (british) utterance.voice = british;

    utterance.onend = () => {
      setIsSpeaking(false);
      if (phaseRef.current === "active" && speechSupported) {
        startListening();
      }
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      if (phaseRef.current === "active" && speechSupported) {
        startListening();
      }
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [speechSupported]);

  const startListening = useCallback(() => {
    if (phaseRef.current !== "active") return;
    if (!speechSupported) return;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    const recognition = createRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;
    let finalText = "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = "";
      finalText = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setCurrentInterim(interim);

      if (silenceTimer) clearTimeout(silenceTimer);
      if (finalText.trim()) {
        silenceTimer = setTimeout(() => {
          if (finalText.trim() && phaseRef.current === "active") {
            setCurrentInterim("");
            setTranscript((prev) => [
              ...prev,
              { role: "user", text: finalText.trim(), timestamp: new Date() },
            ]);
            try { recognition.stop(); } catch {}
            setIsListening(false);
            sendToAI(finalText.trim());
          }
        }, 1500);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        setMicError("Microphone access was denied. You can type your message instead using the keyboard button below.");
        setShowTyping(true);
        setIsListening(false);
      } else if (event.error === "no-speech") {
        if (phaseRef.current === "active") {
          setTimeout(() => startListening(), 500);
        }
      } else if (event.error !== "aborted") {
        if (phaseRef.current === "active") {
          setTimeout(() => startListening(), 1000);
        }
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
      setIsListening(true);
      setMicError(null);
    } catch {
      setMicError("Could not start microphone. Try the keyboard instead.");
      setShowTyping(true);
    }
  }, [sendToAI, speechSupported]);

  const endCall = useCallback(() => {
    if (endCallCalledRef.current) return;
    endCallCalledRef.current = true;

    setPhase("ended");
    playEndTone();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    window.speechSynthesis.cancel();
    setIsListening(false);
    setIsSpeaking(false);
    setIsProcessing(false);
    setCurrentInterim("");
    setTimeLimitWarning(false);
  }, []);

  useEffect(() => {
    if (callDuration === TIME_LIMIT_SECONDS - 30 && phase === "active") {
      setTimeLimitWarning(true);
    }
    if (callDuration >= TIME_LIMIT_SECONDS && phase === "active") {
      endCall();
    }
  }, [callDuration, phase, endCall]);

  const startCall = useCallback(() => {
    setPhase("connecting");
    endCallCalledRef.current = false;
    playRingTone();

    if (!speechSupported) {
      setShowTyping(true);
    }

    setTimeout(() => {
      if (phaseRef.current === "connecting" || phaseRef.current === "idle") {
        setPhase("active");
        setCallDuration(0);

        timerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);

        const greeting = "Hello! I'm Rigo, your AI assistant from GoRigo. How can I help you today?";
        setTranscript([{ role: "assistant", text: greeting, timestamp: new Date() }]);
        historyRef.current = [{ role: "assistant", content: greeting }];
        speakText(greeting);
      }
    }, 1800);
  }, [speakText, speechSupported]);

  const handleTypedSend = useCallback(() => {
    const trimmed = typedInput.trim();
    if (!trimmed || isProcessing || isSpeaking) return;
    setTypedInput("");
    setTranscript((prev) => [
      ...prev,
      { role: "user", text: trimmed, timestamp: new Date() },
    ]);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      setIsListening(false);
    }
    sendToAI(trimmed);
  }, [typedInput, isProcessing, isSpeaking, sendToAI]);

  const handleLeadSubmit = async () => {
    const trimmedName = leadName.trim();
    const trimmedEmail = leadEmail.trim();
    if (!trimmedName) { setLeadError("Please enter your name"); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) { setLeadError("Please enter a valid email"); return; }

    setLeadSubmitting(true);
    setLeadError("");

    try {
      const res = await fetch("/api/public/chat/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, email: trimmedEmail }),
      });
      if (!res.ok) {
        const data = await res.json();
        setLeadError(data.error || "Something went wrong");
      } else {
        setLeadSuccess(true);
        setLeadCaptured(true);
      }
    } catch {
      setLeadError("Connection error. Please try again.");
    }
    setLeadSubmitting(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (abortRef.current) abortRef.current.abort();
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (phase === "idle") {
      startCall();
    }
  }, []);

  if (minimized) {
    return (
      <div
        className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-full bg-primary px-4 py-3 shadow-xl cursor-pointer"
        onClick={() => setMinimized(false)}
        data-testid="web-call-minimized"
      >
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-300 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-green-200" />
        </span>
        <span className="text-sm font-medium text-primary-foreground">
          {formatDuration(callDuration)}
        </span>
        <Maximize2 className="h-4 w-4 text-primary-foreground" />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      data-testid="web-call-modal"
    >
      <div className="relative w-full max-w-md mx-4 flex flex-col rounded-md border border-border bg-background shadow-2xl overflow-visible"
           style={{ maxHeight: "min(640px, calc(100vh - 40px))" }}>

        <div className="flex items-center justify-between gap-2 px-4 py-3 bg-primary text-primary-foreground">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            <span className="text-sm font-semibold">
              {phase === "connecting" ? "Connecting..." : phase === "active" ? "In Call" : "Call Ended"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {phase === "active" && (
              <span className="text-xs font-mono mr-2" data-testid="text-call-duration">
                {formatDuration(callDuration)}
              </span>
            )}
            {phase === "active" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMinimized(true)}
                className="text-primary-foreground no-default-hover-elevate"
                data-testid="button-minimize-call"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {phase === "connecting" && (
          <div className="flex flex-col items-center justify-center py-16 gap-6">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
                <span className="relative inline-flex h-4 w-4 rounded-full bg-primary" />
              </span>
            </div>
            <div className="text-center">
              <p className="text-base font-medium" data-testid="text-connecting">Connecting to Rigo...</p>
              <p className="text-sm text-muted-foreground mt-1">Your AI assistant</p>
            </div>
            <Button
              variant="destructive"
              onClick={() => { endCall(); onClose(); }}
              className="rounded-full px-6"
              data-testid="button-cancel-call"
            >
              Cancel
            </Button>
          </div>
        )}

        {phase === "active" && (
          <>
            <div className="flex items-center justify-center gap-4 py-4 px-4 border-b border-border/50">
              <div className="flex flex-col items-center gap-2">
                <div className={`relative h-16 w-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isSpeaking ? "bg-primary/20 ring-4 ring-primary/30" :
                  isListening ? "bg-blue-500/10 ring-4 ring-blue-500/20" :
                  "bg-muted"
                }`}>
                  {isSpeaking && (
                    <div className="absolute inset-0 flex items-center justify-center gap-1" data-testid="indicator-speaking">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="w-1 bg-primary rounded-full animate-pulse"
                          style={{
                            height: `${12 + Math.random() * 20}px`,
                            animationDelay: `${i * 100}ms`,
                            animationDuration: "0.6s",
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {isListening && !isSpeaking && (
                    <Mic className="h-6 w-6 text-blue-500 animate-pulse" data-testid="indicator-listening" />
                  )}
                  {isProcessing && !isSpeaking && (
                    <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" data-testid="indicator-processing" />
                  )}
                  {!isSpeaking && !isListening && !isProcessing && (
                    <Phone className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {isSpeaking ? "Rigo is speaking" :
                   isListening ? "Listening..." :
                   isProcessing ? "Thinking..." :
                   !speechSupported ? "Type your message below" : "On hold"}
                </span>
              </div>
            </div>

            {timeLimitWarning && (
              <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-700 dark:text-amber-400 text-center">
                  Call will end in 30 seconds. We hope we've been helpful!
                </p>
              </div>
            )}

            {micError && (
              <div className="px-4 py-2 bg-destructive/5 border-b border-destructive/10">
                <p className="text-xs text-destructive text-center" data-testid="text-mic-error">
                  {micError}
                </p>
              </div>
            )}

            <div
              className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2.5 min-h-[120px] max-h-[200px]"
              data-testid="call-transcript"
            >
              {transcript.map((entry, i) => (
                <div
                  key={i}
                  className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-md px-3 py-1.5 text-sm ${
                      entry.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                    data-testid={`transcript-${entry.role}-${i}`}
                  >
                    {entry.text || (
                      <span className="inline-flex items-center gap-1">
                        <span className="flex gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "300ms" }} />
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {currentInterim && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-md px-3 py-1.5 text-sm bg-primary/50 text-primary-foreground italic">
                    {currentInterim}...
                  </div>
                </div>
              )}
              <div ref={transcriptEndRef} />
            </div>

            {showTyping && (
              <div className="border-t border-border px-3 py-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={typedInput}
                    onChange={(e) => setTypedInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleTypedSend();
                      }
                    }}
                    placeholder="Type your message..."
                    maxLength={500}
                    disabled={isProcessing || isSpeaking}
                    className="border-0 shadow-none focus-visible:ring-0"
                    data-testid="input-call-typed"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleTypedSend}
                    disabled={!typedInput.trim() || isProcessing || isSpeaking}
                    data-testid="button-call-send"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-4 py-4 border-t border-border">
              {speechSupported && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (isListening) {
                      try { recognitionRef.current?.stop(); } catch {}
                      setIsListening(false);
                    } else if (!isSpeaking && !isProcessing) {
                      startListening();
                    }
                  }}
                  className={`rounded-full ${isListening ? "bg-blue-500/10 text-blue-500" : ""}`}
                  disabled={isSpeaking || isProcessing}
                  data-testid="button-toggle-mic"
                >
                  {isListening ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </Button>
              )}

              <Button
                variant="destructive"
                size="lg"
                onClick={endCall}
                className="rounded-full"
                data-testid="button-end-call"
              >
                <PhoneOff className="h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowTyping(!showTyping)}
                className={`rounded-full ${showTyping ? "bg-muted" : ""}`}
                data-testid="button-toggle-keyboard"
              >
                <Keyboard className="h-5 w-5" />
              </Button>
            </div>
          </>
        )}

        {phase === "ended" && (
          <div className="flex flex-col items-center py-8 px-6 gap-5">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <PhoneOff className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-base font-medium">Call Ended</p>
              <p className="text-sm text-muted-foreground mt-1">
                Duration: {formatDuration(callDuration)}
              </p>
            </div>

            {transcript.length > 0 && (
              <details className="w-full">
                <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors text-center" data-testid="button-view-transcript">
                  View transcript ({transcript.length} messages)
                </summary>
                <div className="mt-3 max-h-[180px] overflow-y-auto flex flex-col gap-2 px-2">
                  {transcript.map((entry, i) => (
                    <div key={i} className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-md px-3 py-1.5 text-xs ${
                        entry.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}>
                        {entry.text}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {!leadCaptured && !leadSuccess && (
              <div className="w-full border-t border-border pt-4">
                <p className="text-sm text-center text-muted-foreground mb-3">
                  Want us to follow up? Leave your details.
                </p>
                <div className="flex flex-col gap-2.5">
                  <Input
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    placeholder="Your name"
                    maxLength={100}
                    data-testid="input-lead-name"
                  />
                  <Input
                    type="email"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    placeholder="Your email"
                    maxLength={200}
                    onKeyDown={(e) => { if (e.key === "Enter") handleLeadSubmit(); }}
                    data-testid="input-lead-email"
                  />
                  {leadError && (
                    <p className="text-xs text-destructive" data-testid="text-lead-error">{leadError}</p>
                  )}
                  <Button
                    onClick={handleLeadSubmit}
                    disabled={leadSubmitting}
                    className="w-full"
                    data-testid="button-submit-lead"
                  >
                    {leadSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Send My Details
                  </Button>
                </div>
              </div>
            )}

            {leadSuccess && (
              <div className="w-full border-t border-border pt-4 text-center">
                <p className="text-sm text-primary font-medium" data-testid="text-lead-success">
                  Thank you! We'll be in touch soon.
                </p>
              </div>
            )}

            <Button
              variant="outline"
              onClick={onClose}
              className="w-full"
              data-testid="button-close-call"
            >
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
