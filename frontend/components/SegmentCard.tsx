"use client";

import { useState, useEffect, useRef } from "react";
import { Segment } from "@/lib/types";
import { timeToSeconds, secondsToTime } from "@/lib/youtube";

interface SegmentCardProps {
  segment: Segment;
  index: number;
  isActive: boolean;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (segment: Segment) => void;
  onDelete: () => void;
  onClick: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onPreview?: (videoId: string, start: number, end: number) => void;
}

export default function SegmentCard({
  segment,
  index,
  isActive,
  isFirst,
  isLast,
  onUpdate,
  onDelete,
  onClick,
  onMoveUp,
  onMoveDown,
  onPreview,
}: SegmentCardProps) {
  const [localStartTime, setLocalStartTime] = useState(segment.startTime);
  const [localEndTime, setLocalEndTime] = useState(segment.endTime);
  const [songTitle, setSongTitle] = useState(segment.songTitle);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    setLocalStartTime(segment.startTime);
    setLocalEndTime(segment.endTime);
    setSongTitle(segment.songTitle);
  }, [segment]);

  // Debounced update with smart preview
  const handleStartTimeChange = (value: string) => {
    setLocalStartTime(value);

    setTimeout(() => {
      const newSegment = { ...segment, startTime: value };
      onUpdate(newSegment);

      if (onPreview) {
        const startSeconds = timeToSeconds(value);
        // Play from the new start time
        onPreview(segment.videoId, startSeconds, startSeconds + 10);
      }
    }, 500);
  };

  const handleEndTimeChange = (value: string) => {
    setLocalEndTime(value);

    setTimeout(() => {
      const newSegment = { ...segment, endTime: value };
      onUpdate(newSegment);

      if (onPreview) {
        const endSeconds = timeToSeconds(value);
        const previewStart = Math.max(0, endSeconds - 5);
        // Play 5 seconds before the end time
        onPreview(segment.videoId, previewStart, endSeconds);
      }
    }, 500);
  };

  const handleSongTitleChange = (value: string) => {
    setSongTitle(value);
    setTimeout(() => {
      onUpdate({ ...segment, songTitle: value });
    }, 500);
  };

  const adjustTime = (type: 'start' | 'end', delta: number) => {
    if (type === 'start') {
      const currentSeconds = timeToSeconds(localStartTime);
      const newSeconds = Math.max(0, currentSeconds + delta);
      const newTime = secondsToTime(newSeconds);
      setLocalStartTime(newTime);

      const newSegment = { ...segment, startTime: newTime };
      onUpdate(newSegment);

      if (onPreview) {
        // Play from the new start time
        onPreview(segment.videoId, newSeconds, newSeconds + 10);
      }
    } else {
      const currentSeconds = timeToSeconds(localEndTime);
      const newSeconds = currentSeconds + delta;
      const newTime = secondsToTime(newSeconds);
      setLocalEndTime(newTime);

      const newSegment = { ...segment, endTime: newTime };
      onUpdate(newSegment);

      if (onPreview) {
        // Play 5 seconds before the end time
        const previewStart = Math.max(0, newSeconds - 5);
        onPreview(segment.videoId, previewStart, newSeconds);
      }
    }
  };

  const incrementTime = (type: 'start' | 'end') => adjustTime(type, 1);
  const decrementTime = (type: 'start' | 'end') => adjustTime(type, -1);

  const duration = timeToSeconds(localEndTime) - timeToSeconds(localStartTime);
  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, "0")}`;
  };

  const hasErrors = segment.validationErrors && segment.validationErrors.length > 0;

  return (
    <>
      <div
        className={`bg-white rounded-lg border-2 transition-all ${
          isActive
            ? "border-blue-400 shadow-md"
            : hasErrors
            ? "border-red-300"
            : segment.verified
            ? "border-green-300 bg-green-50"
            : "border-gray-200"
        } p-2 sm:p-3 cursor-pointer hover:shadow-sm min-w-[280px] sm:min-w-[380px]`}
        onClick={onClick}
      >
        {/* Header Row */}
        <div className="flex items-start gap-1 sm:gap-2 mb-2 sm:mb-3">
          {/* Left Arrow Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp?.();
            }}
            disabled={isFirst}
            className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 text-sm sm:text-base"
            title="Move left"
          >
            &lt;
          </button>

          {/* Thumbnail & Title Column */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
              <img
                src={segment.thumbnail}
                alt={songTitle}
                className="w-12 h-8 sm:w-16 sm:h-10 object-cover rounded flex-shrink-0"
              />
              <input
                type="text"
                value={songTitle}
                onChange={(e) => handleSongTitleChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 text-[11px] sm:text-xs font-medium text-gray-900 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5"
                placeholder="Song title..."
              />
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500 flex flex-wrap items-center gap-x-2">
              <span>Duration: {formatDuration(duration)}</span>
              {segment.verified && (
                <span className="px-1.5 sm:px-2 py-0.5 bg-green-600 text-white text-[9px] sm:text-[10px] rounded font-medium">✓ Verified</span>
              )}
            </div>
          </div>

          {/* Delete Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteModal(true);
            }}
            className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-red-100 rounded text-red-600 transition-colors text-lg sm:text-xl"
            title="Delete segment"
          >
            ×
          </button>

          {/* Right Arrow Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown?.();
            }}
            disabled={isLast}
            className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 text-sm sm:text-base"
            title="Move right"
          >
            &gt;
          </button>
        </div>

        {/* Time Controls - Responsive Layout */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
          {/* Start Time - Left Side */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            <span className="text-[10px] sm:text-xs text-blue-500 font-medium hidden sm:inline" title="Start time">Start</span>
            <input
              type="text"
              value={localStartTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="00:00:00"
              className="w-14 sm:w-16 px-0.5 sm:px-1 py-0.5 sm:py-1 text-[11px] sm:text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <div className="flex flex-col gap-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  incrementTime('start');
                }}
                className="w-4 h-3 sm:w-5 sm:h-4 text-[9px] sm:text-[10px] bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-t flex items-center justify-center leading-none"
                title="+1s"
              >
                +
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  decrementTime('start');
                }}
                className="w-4 h-3 sm:w-5 sm:h-4 text-[9px] sm:text-[10px] bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-b flex items-center justify-center leading-none"
                title="-1s"
              >
                -
              </button>
            </div>
          </div>

          {/* End Time - Right Side */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            <div className="flex flex-col gap-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  incrementTime('end');
                }}
                className="w-4 h-3 sm:w-5 sm:h-4 text-[9px] sm:text-[10px] bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-t flex items-center justify-center leading-none"
                title="+1s"
              >
                +
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  decrementTime('end');
                }}
                className="w-4 h-3 sm:w-5 sm:h-4 text-[9px] sm:text-[10px] bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-b flex items-center justify-center leading-none"
                title="-1s"
              >
                -
              </button>
            </div>

            <input
              type="text"
              value={localEndTime}
              onChange={(e) => handleEndTimeChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="00:01:00"
              className="w-14 sm:w-16 px-0.5 sm:px-1 py-0.5 sm:py-1 text-[11px] sm:text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <span className="text-[10px] sm:text-xs text-purple-500 font-medium hidden sm:inline" title="End time">End</span>
          </div>
        </div>

        {/* Validation Errors */}
        {hasErrors && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
            {segment.validationErrors.map((error, i) => (
              <div key={i} className="text-xs text-red-700">
                • {error}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg mb-2">Delete Segment?</h3>
            <p className="text-sm text-gray-600 mb-4">
              "{songTitle}" will be permanently removed.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  onDelete();
                }}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
