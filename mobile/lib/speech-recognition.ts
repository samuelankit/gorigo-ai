import { useState, useCallback, useRef } from "react";
import { Platform, Alert } from "react-native";

interface UseSpeechRecognitionResult {
  isListening: boolean;
  transcript: string;
  startListening: () => Promise<void>;
  stopListening: () => void;
  error: string | null;
}

export function useSpeechRecognition(onResult: (text: string) => void): UseSpeechRecognitionResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopListening = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(async () => {
    setError(null);
    setTranscript("");

    if (Platform.OS === "web") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setError("Speech recognition not supported in this browser");
        Alert.alert(
          "Not Supported",
          "Speech recognition is not available in this browser. Please type your message instead."
        );
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
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

        const current = finalTranscript || interimTranscript;
        setTranscript(current);

        if (finalTranscript) {
          stopListening();
          onResult(finalTranscript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.error("[SpeechRecognition] Error:", event.error);
        if (event.error === "not-allowed") {
          setError("Microphone access denied");
          Alert.alert(
            "Microphone Access",
            "Please allow microphone access in your browser settings to use voice input."
          );
        } else if (event.error !== "aborted") {
          setError(event.error);
        }
        stopListening();
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();

      timeoutRef.current = setTimeout(() => {
        stopListening();
      }, 15000);
    } else {
      try {
        const ExpoSpeechRecognizer = await import("expo-speech");
        setIsListening(true);

        Alert.alert(
          "Voice Input",
          "Voice recognition on mobile requires the native build. On Expo Go, please type your message instead.",
          [{ text: "OK", onPress: () => setIsListening(false) }]
        );
      } catch {
        setIsListening(true);

        timeoutRef.current = setTimeout(() => {
          setIsListening(false);
          Alert.alert(
            "Voice Input",
            "Tap the mic and speak. On the development build, voice recognition will use the device's speech-to-text. For now, please type your message.",
            [{ text: "OK" }]
          );
        }, 3000);
      }
    }
  }, [onResult, stopListening]);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    error,
  };
}
