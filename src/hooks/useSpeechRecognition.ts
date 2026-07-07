/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Reconhecimento de voz via Web Speech API (nativo do navegador).
 * Transcreve fala em pt-BR direto no cliente — sem upload de áudio, sem custo.
 * Suportado em Chrome/Edge/Android; em navegadores sem suporte, `supported` é false
 * e a UI cai para entrada por texto.
 */

interface UseSpeechRecognitionResult {
  supported: boolean;
  listening: boolean;
  /** Trecho já finalizado pela engine. */
  transcript: string;
  /** Trecho parcial sendo reconhecido em tempo real. */
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useSpeechRecognition(lang = "pt-BR"): UseSpeechRecognitionResult {
  const SpeechRecognition =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : undefined;

  const supported = !!SpeechRecognition;

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);

  useEffect(() => {
    if (!supported) return;

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) finalChunk += res[0].transcript;
        else interimChunk += res[0].transcript;
      }
      if (finalChunk) {
        setTranscript((prev) => (prev ? prev + " " : "") + finalChunk.trim());
      }
      setInterim(interimChunk);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Permissão de microfone negada.");
        shouldListenRef.current = false;
        setListening(false);
      } else {
        setError("Erro no reconhecimento de voz.");
      }
    };

    recognition.onend = () => {
      // A engine encerra sozinha por silêncio; reinicia se ainda quisermos ouvir.
      if (shouldListenRef.current) {
        try {
          recognition.start();
        } catch {
          setListening(false);
        }
      } else {
        setListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldListenRef.current = false;
      try {
        recognition.stop();
      } catch {
        /* noop */
      }
    };
  }, [supported, lang, SpeechRecognition]);

  const start = useCallback(() => {
    if (!supported || !recognitionRef.current) return;
    setError(null);
    setInterim("");
    shouldListenRef.current = true;
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      /* já iniciado */
    }
  }, [supported]);

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    setListening(false);
    setInterim("");
    try {
      recognitionRef.current?.stop();
    } catch {
      /* noop */
    }
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setInterim("");
    setError(null);
  }, []);

  return { supported, listening, transcript, interim, error, start, stop, reset };
}
