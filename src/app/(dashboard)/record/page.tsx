"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Mic, Square, RotateCcw, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type RecordingState = "idle" | "recording" | "recorded" | "uploading";

export default function RecordPage() {
  const router = useRouter();

  const [state, setState] = useState<RecordingState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const drawWaveform = useCallback(() => {
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    if (!analyser || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = "#F7F6F2";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = "#DC2626";
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();
  }, []);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up audio analyser for waveform
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setState("recorded");

        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      mediaRecorder.start(250);
      setState("recording");
      setElapsed(0);

      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);

      drawWaveform();
    } catch {
      setError(
        "Microphone access is required. Please allow microphone permissions and try again."
      );
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  };

  const reRecord = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setAudioBlob(null);
    setElapsed(0);
    setState("idle");
  };

  const generateListing = async () => {
    if (!audioBlob) return;

    setState("uploading");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const res = await fetch("/api/voice/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to generate listing");
      }

      const { draftId } = await res.json();
      router.push(`/drafts/${draftId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
      setState("recorded");
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isRecording = state === "recording";
  const isRecorded = state === "recorded";
  const isUploading = state === "uploading";

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 pb-8">
      {/* Instruction text */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[#2E2E2E] mb-2">
          {isUploading
            ? "Creating your listing..."
            : isRecorded
              ? "Review your recording"
              : "Tell us what you harvested"}
        </h1>
        {state === "idle" && (
          <p className="text-sm text-[#2E2E2E]/60 max-w-xs mx-auto">
            e.g. &quot;20 lbs tomatoes, $3/lb, pickup Friday 2-5pm&quot;
          </p>
        )}
      </div>

      {/* Recording timer */}
      {(isRecording || isRecorded) && (
        <p
          className={cn(
            "text-3xl font-mono font-semibold mb-4 tabular-nums",
            isRecording ? "text-red-600" : "text-[#2E2E2E]"
          )}
        >
          {formatTime(elapsed)}
        </p>
      )}

      {/* Waveform canvas (visible during recording) */}
      {isRecording && (
        <canvas
          ref={canvasRef}
          width={280}
          height={64}
          className="rounded-lg mb-6 w-[280px] h-[64px]"
        />
      )}

      {/* Central record / stop button */}
      {!isRecorded && !isUploading && (
        <button
          onClick={isRecording ? stopRecording : startRecording}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
          className={cn(
            "relative w-28 h-28 rounded-full flex items-center justify-center transition-all active:scale-95 focus:outline-none focus:ring-4",
            isRecording
              ? "bg-red-600 focus:ring-red-300"
              : "bg-[#3A7D44] focus:ring-[#3A7D44]/30"
          )}
        >
          {/* Pulse rings when recording */}
          {isRecording && (
            <>
              <span className="absolute inset-0 rounded-full bg-red-600 animate-ping opacity-20" />
              <span className="absolute -inset-3 rounded-full border-2 border-red-400 animate-pulse opacity-40" />
            </>
          )}

          {/* Pulse ring when idle */}
          {state === "idle" && (
            <span className="absolute -inset-2 rounded-full border-2 border-[#3A7D44]/30 animate-pulse" />
          )}

          {isRecording ? (
            <Square className="w-10 h-10 text-white fill-white" />
          ) : (
            <Mic className="w-12 h-12 text-white" />
          )}
        </button>
      )}

      {/* Tap hint */}
      {state === "idle" && (
        <p className="text-xs text-[#2E2E2E]/50 mt-4">Tap to start recording</p>
      )}
      {isRecording && (
        <p className="text-xs text-red-600/70 mt-4">Tap to stop</p>
      )}

      {/* Playback + action buttons after recording */}
      {isRecorded && audioUrl && (
        <div className="w-full max-w-sm space-y-6 mt-2">
          {/* Audio playback */}
          <audio
            src={audioUrl}
            controls
            className="w-full h-12 rounded-xl"
          />

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={reRecord}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-[#2E2E2E] font-semibold text-sm transition-colors active:scale-[0.98]"
            >
              <RotateCcw className="w-4 h-4" />
              Re-record
            </button>
            <button
              onClick={generateListing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#3A7D44] hover:bg-[#3A7D44]/90 text-white font-semibold text-sm shadow-sm transition-colors active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4" />
              Generate Listing
            </button>
          </div>
        </div>
      )}

      {/* Loading state during upload */}
      {isUploading && (
        <div className="flex flex-col items-center gap-4 mt-4">
          <div className="w-16 h-16 rounded-full bg-[#3A7D44]/10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#3A7D44] animate-spin" />
          </div>
          <p className="text-sm text-[#2E2E2E]/60">
            Transcribing and building your listing...
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-6 w-full max-w-sm rounded-xl bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
