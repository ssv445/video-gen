"use client";

import { useState, useRef, useEffect } from "react";
import { Segment } from "@/lib/types";
import { getYouTubeId, getYouTubeThumbnail, isValidYouTubeUrl, fetchYouTubeTitle } from "@/lib/youtube";
import { validateSegment } from "@/lib/validation";
import SegmentCard from "./SegmentCard";

interface SegmentListProps {
  segments: Segment[];
  onSegmentsChange: (segments: Segment[]) => void;
  currentSegmentIndex: number;
  onSegmentClick: (index: number) => void;
  onPreview?: (videoId: string, start: number, end: number) => void;
  horizontal?: boolean;
}

export default function SegmentList({
  segments,
  onSegmentsChange,
  currentSegmentIndex,
  onSegmentClick,
  onPreview,
  horizontal = false,
}: SegmentListProps) {
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const [isLoadingTitle, setIsLoadingTitle] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleAddVideo = async () => {
    setUrlError("");

    if (!urlInput.trim()) {
      setUrlError("Please enter a YouTube URL");
      return;
    }

    if (!isValidYouTubeUrl(urlInput)) {
      setUrlError("Invalid YouTube URL format");
      return;
    }

    const videoId = getYouTubeId(urlInput);
    if (!videoId) {
      setUrlError("Could not extract video ID from URL");
      return;
    }

    setIsLoadingTitle(true);

    // Fetch YouTube title
    const songTitle = await fetchYouTubeTitle(videoId);

    setIsLoadingTitle(false);

    const newSegment: Segment = {
      id: crypto.randomUUID(),
      songTitle,
      url: urlInput,
      videoId,
      startTime: "00:00:00",
      endTime: "00:01:00",
      thumbnail: getYouTubeThumbnail(videoId),
      verified: true, // Auto-verify on add since we successfully fetched the title
      validationErrors: [],
    };

    // Validate the new segment
    newSegment.validationErrors = validateSegment(newSegment);

    onSegmentsChange([...segments, newSegment]);
    setUrlInput("");
  };

  const handleUpdateSegment = (index: number, updatedSegment: Segment) => {
    const newSegments = [...segments];
    updatedSegment.validationErrors = validateSegment(updatedSegment);
    newSegments[index] = updatedSegment;
    onSegmentsChange(newSegments);
  };

  const handleDeleteSegment = (index: number) => {
    const newSegments = segments.filter((_, i) => i !== index);
    onSegmentsChange(newSegments);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newSegments = [...segments];
    [newSegments[index - 1], newSegments[index]] = [newSegments[index], newSegments[index - 1]];
    onSegmentsChange(newSegments);
  };

  const handleMoveDown = (index: number) => {
    if (index === segments.length - 1) return;
    const newSegments = [...segments];
    [newSegments[index], newSegments[index + 1]] = [newSegments[index + 1], newSegments[index]];
    onSegmentsChange(newSegments);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddVideo();
    }
  };

  // Auto-scroll active segment to center
  useEffect(() => {
    if (horizontal && scrollContainerRef.current && segmentRefs.current[currentSegmentIndex]) {
      const container = scrollContainerRef.current;
      const activeCard = segmentRefs.current[currentSegmentIndex];

      if (activeCard) {
        const containerWidth = container.offsetWidth;
        const cardLeft = activeCard.offsetLeft;
        const cardWidth = activeCard.offsetWidth;

        // Calculate scroll position to center the card
        const scrollPosition = cardLeft - (containerWidth / 2) + (cardWidth / 2);

        container.scrollTo({
          left: scrollPosition,
          behavior: 'smooth'
        });
      }
    }
  }, [currentSegmentIndex, horizontal, segments.length]);

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
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (horizontal) {
    return (
      <div className="flex flex-col h-full">
        {/* Horizontal Segment Row */}
        <div className="flex-shrink-0 mb-3 sm:mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Segments</h2>
              <span className="text-xs sm:text-sm text-gray-500">
                {segments.length}/10 · {formatDuration(totalDuration)}
                {totalDuration > 1200 && (
                  <span className="text-red-600 ml-1 sm:ml-2">(exceeds 20 min)</span>
                )}
              </span>
            </div>
            {/* Segment Navigation Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => onSegmentClick(Math.max(0, currentSegmentIndex - 1))}
                disabled={currentSegmentIndex === 0}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="hidden sm:inline">← Previous</span>
                <span className="sm:hidden">←</span>
              </button>
              <button
                onClick={() => onSegmentClick(Math.min(segments.length - 1, currentSegmentIndex + 1))}
                disabled={currentSegmentIndex === segments.length - 1}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="hidden sm:inline">Next →</span>
                <span className="sm:hidden">→</span>
              </button>
            </div>
          </div>

          {segments.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-gray-500 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-xs sm:text-sm px-4">No segments yet. Add a YouTube video below!</p>
            </div>
          ) : (
            <div
              ref={scrollContainerRef}
              className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-thin"
            >
              {segments.map((segment, index) => (
                <div
                  key={segment.id}
                  ref={(el) => (segmentRefs.current[index] = el)}
                >
                  <SegmentCard
                    segment={segment}
                    index={index}
                    isActive={currentSegmentIndex === index}
                    isFirst={index === 0}
                    isLast={index === segments.length - 1}
                    onUpdate={(updated) => handleUpdateSegment(index, updated)}
                    onDelete={() => handleDeleteSegment(index)}
                    onClick={() => onSegmentClick(index)}
                    onMoveUp={() => handleMoveUp(index)}
                    onMoveDown={() => handleMoveDown(index)}
                    onPreview={onPreview}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Video Input - Below Segments */}
        <div className="flex-shrink-0 bg-white rounded-lg border border-gray-300 p-3 sm:p-4">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            Add YouTube Video
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1 px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddVideo}
              disabled={isLoadingTitle}
              className="px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isLoadingTitle ? "Loading..." : "Add"}
            </button>
          </div>
          {urlError && (
            <p className="mt-2 text-xs sm:text-sm text-red-600">{urlError}</p>
          )}
        </div>
      </div>
    );
  }

  // Vertical layout (original)
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">Video Segments</h2>

      {/* Add Video Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Add YouTube Video
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="https://www.youtube.com/watch?v=..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddVideo}
            disabled={isLoadingTitle}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingTitle ? "Loading..." : "Add"}
          </button>
        </div>
        {urlError && (
          <p className="mt-2 text-sm text-red-600">{urlError}</p>
        )}
      </div>

      {/* Summary */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">
            Segments: <span className="font-semibold">{segments.length}/10</span>
          </span>
          <span className="text-gray-600">
            Total Duration:{" "}
            <span className="font-semibold">{formatDuration(totalDuration)}</span>
            {totalDuration > 1200 && (
              <span className="text-red-600 ml-2">(exceeds 20 min limit)</span>
            )}
          </span>
        </div>
      </div>

      {/* Segment List */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
        {segments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm">No segments yet. Add a YouTube video to get started!</p>
          </div>
        ) : (
          segments.map((segment, index) => (
            <SegmentCard
              key={segment.id}
              segment={segment}
              index={index}
              isActive={currentSegmentIndex === index}
              isFirst={index === 0}
              isLast={index === segments.length - 1}
              onUpdate={(updated) => handleUpdateSegment(index, updated)}
              onDelete={() => handleDeleteSegment(index)}
              onClick={() => onSegmentClick(index)}
              onMoveUp={() => handleMoveUp(index)}
              onMoveDown={() => handleMoveDown(index)}
              onPreview={onPreview}
            />
          ))
        )}
      </div>
    </div>
  );
}
