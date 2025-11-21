"use client";

import { useEffect, useRef, useState } from "react";
import { Segment } from "@/lib/types";
import { timeToSeconds } from "@/lib/youtube";
import videojs from "video.js";
import "video.js/dist/video-js.css";

// Import YouTube tech
if (typeof window !== "undefined") {
  require("videojs-youtube");
}

interface PreviewPlayerProps {
  segments: Segment[];
  currentSegmentIndex: number;
  onSegmentChange: (index: number) => void;
  onSegmentVerified: (index: number) => void;
}

export default function PreviewPlayer({
  segments,
  currentSegmentIndex,
  onSegmentChange,
  onSegmentVerified,
}: PreviewPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentSegment = segments[currentSegmentIndex];

  // Initialize Video.js player
  useEffect(() => {
    if (!videoRef.current) return;

    // Only initialize once
    if (!playerRef.current) {
      const player = videojs(videoRef.current, {
        techOrder: ["youtube"],
        sources: [],
        controls: true,
        fluid: false,
        aspectRatio: "16:9",
        youtube: {
          ytControls: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
        },
      });

      playerRef.current = player;

      // Set up event listeners
      player.on("play", () => {
        console.log("Video playing");
        setIsPlaying(true);
        startTimeTracking();
      });

      player.on("pause", () => {
        console.log("Video paused");
        setIsPlaying(false);
        stopTimeTracking();
      });

      player.on("ended", () => {
        console.log("Video ended");
        setIsPlaying(false);
        stopTimeTracking();
        handleSegmentEnd();
      });

      player.on("loadedmetadata", () => {
        console.log("Video loaded");
        if (currentSegment) {
          onSegmentVerified(currentSegmentIndex);
        }
      });

      player.on("error", (e: any) => {
        console.error("Video.js error:", e);
      });
    }

    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        stopTimeTracking();
      }
    };
  }, []);

  // Load segment when it changes
  useEffect(() => {
    if (!playerRef.current || !currentSegment) return;

    const player = playerRef.current;
    const startTime = timeToSeconds(currentSegment.startTime);
    const endTime = timeToSeconds(currentSegment.endTime);

    console.log(`Loading segment ${currentSegmentIndex + 1}:`, {
      videoId: currentSegment.videoId,
      startTime,
      endTime,
    });

    // Set source
    player.src({
      type: "video/youtube",
      src: `https://www.youtube.com/watch?v=${currentSegment.videoId}&start=${startTime}&end=${endTime}`,
    });

    // Seek to start time after loading
    const onLoadedData = () => {
      player.currentTime(startTime);
      player.off("loadeddata", onLoadedData);

      // Auto-play if we were already playing
      if (isPlaying) {
        setTimeout(() => {
          player.play().catch((e: any) => {
            console.log("Auto-play prevented:", e);
          });
        }, 500);
      }
    };

    player.one("loadeddata", onLoadedData);
  }, [currentSegmentIndex, currentSegment?.videoId]);

  const startTimeTracking = () => {
    if (checkIntervalRef.current) return;
    if (!currentSegment) return;

    const endTime = timeToSeconds(currentSegment.endTime);

    checkIntervalRef.current = setInterval(() => {
      if (!playerRef.current) return;

      const currentTime = playerRef.current.currentTime();
      setCurrentTime(currentTime);

      // Check if we've reached the end time
      if (currentTime >= endTime - 0.1) {
        // 0.1s buffer
        console.log("Reached end time, advancing to next segment");
        stopTimeTracking();
        handleSegmentEnd();
      }
    }, 100);
  };

  const stopTimeTracking = () => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
  };

  const handleSegmentEnd = () => {
    if (currentSegmentIndex < segments.length - 1) {
      // Advance to next segment
      onSegmentChange(currentSegmentIndex + 1);
    } else {
      // Last segment, stop playing
      setIsPlaying(false);
      if (playerRef.current) {
        playerRef.current.pause();
      }
    }
  };

  const handlePlayPause = () => {
    if (!playerRef.current) return;

    if (isPlaying) {
      playerRef.current.pause();
    } else {
      playerRef.current.play().catch((e: any) => {
        console.log("Play prevented:", e);
      });
    }
  };

  const handlePlayAll = () => {
    if (segments.length === 0) return;

    onSegmentChange(0);
    setIsPlaying(true);
    setTimeout(() => {
      if (playerRef.current) {
        playerRef.current.play().catch((e: any) => {
          console.log("Play all prevented:", e);
        });
      }
    }, 1000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Cleanup
  useEffect(() => {
    return () => {
      stopTimeTracking();
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  if (segments.length === 0) {
    return (
      <div className="bg-gray-100 rounded-lg flex items-center justify-center" style={{ height: "400px" }}>
        <div className="text-center text-gray-500">
          <svg
            className="w-20 h-20 mx-auto mb-4 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p>Add segments to preview your parody song</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Video.js Player */}
      <div className="bg-black rounded-lg overflow-hidden mb-4">
        <video
          ref={videoRef}
          className="video-js vjs-big-play-centered"
          style={{ width: "100%", height: "400px" }}
        />
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Current Segment Info */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="text-sm font-medium text-gray-900">
              Segment {currentSegmentIndex + 1} of {segments.length}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {currentSegment?.startTime} - {currentSegment?.endTime}
            </div>
            {currentTime > 0 && (
              <div className="text-xs text-blue-600 mt-1">
                Current: {formatTime(currentTime)}
              </div>
            )}
          </div>
          <button
            onClick={handlePlayPause}
            className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Play All Button */}
        <button
          onClick={handlePlayAll}
          className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          ▶ Play All Segments
        </button>

        {/* Segment Navigation */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onSegmentChange(Math.max(0, currentSegmentIndex - 1))}
            disabled={currentSegmentIndex === 0}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>
          <div className="flex items-center justify-center text-sm font-medium text-gray-700">
            {currentSegmentIndex + 1} / {segments.length}
          </div>
          <button
            onClick={() => onSegmentChange(Math.min(segments.length - 1, currentSegmentIndex + 1))}
            disabled={currentSegmentIndex === segments.length - 1}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
