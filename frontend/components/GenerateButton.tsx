"use client";

import { useState } from "react";
import { Segment } from "@/lib/types";

interface GenerateButtonProps {
  segments: Segment[];
  isValid: boolean;
  validationErrors: string[];
  projectName: string;
  compact?: boolean;
}

export default function GenerateButton({
  segments,
  isValid,
  validationErrors,
  projectName,
  compact = false,
}: GenerateButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!isValid || segments.length === 0) return;

    setIsGenerating(true);
    setError("");
    setProgress("Preparing to generate audio...");

    try {
      // Call backend API (falls back to localhost:3032 in development, disabled in preview)
      const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3032";
      const response = await fetch(`${apiUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectName,
          segments: segments.map((s) => ({
            url: s.url,
            startTime: s.startTime,
            endTime: s.endTime,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Generation failed");
      }

      // Get the blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName.replace(/[^a-z0-9]/gi, "_")}_${Date.now()}.m4a`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setProgress("Download complete!");
      setTimeout(() => {
        setIsGenerating(false);
        setProgress("");
      }, 2000);
    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err.message || "Failed to generate audio");
      setIsGenerating(false);
      setProgress("");
    }
  };

  const totalDuration = segments.reduce((acc, segment) => {
    try {
      const start = segment.startTime.split(":").reduce((a, b) => a * 60 + parseInt(b), 0);
      const end = segment.endTime.split(":").reduce((a, b) => a * 60 + parseInt(b), 0);
      return acc + (end - start);
    } catch {
      return acc;
    }
  }, 0);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (compact) {
    return (
      <>
        <button
          onClick={handleGenerate}
          disabled={!isValid || isGenerating || segments.length === 0}
          className={`px-6 py-3 text-sm font-medium rounded-lg transition-all ${
            isValid && !isGenerating
              ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
          title={!isValid ? validationErrors.join(', ') : 'Generate & Download'}
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Generating...
            </span>
          ) : (
            "🎵 Download"
          )}
        </button>

        {/* Progress Modal */}
        {isGenerating && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
              <div className="text-center">
                <svg
                  className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-600"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <h3 className="text-xl font-semibold mb-2">Generating Your Parody Audio</h3>
                <p className="text-gray-600 mb-4">{progress}</p>
                <div className="text-sm text-gray-500">
                  This may take a few minutes depending on the number of segments...
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between">
        {/* Summary */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Ready to Generate</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <div>
              <span className="font-medium">Segments:</span> {segments.length}
            </div>
            <div>
              <span className="font-medium">Total Duration:</span> {formatDuration(totalDuration)}
            </div>
            {!isValid && (
              <div className="mt-2 text-red-600">
                <div className="font-medium">Validation Errors:</div>
                <ul className="list-disc list-inside mt-1">
                  {validationErrors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={handleGenerate}
            disabled={!isValid || isGenerating || segments.length === 0}
            className={`px-8 py-4 text-lg font-semibold rounded-lg transition-all ${
              isValid && !isGenerating
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Generating...
              </span>
            ) : (
              "🎵 Generate & Download"
            )}
          </button>
          {isGenerating && progress && (
            <div className="text-sm text-gray-600 animate-pulse">{progress}</div>
          )}
          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}
        </div>
      </div>

      {/* Progress Modal */}
      {isGenerating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <svg
                className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-600"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <h3 className="text-xl font-semibold mb-2">Generating Your Parody Audio</h3>
              <p className="text-gray-600 mb-4">{progress}</p>
              <div className="text-sm text-gray-500">
                This may take a few minutes depending on the number of segments...
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
