"use client";

import { useEffect, useRef } from "react";

interface VideoPlayerProps {
  videoId: string;
  startTime: number;
  endTime: number;
  onReady?: () => void;
  onEnded?: () => void;
  autoplay?: boolean;
}

export default function VideoPlayer({
  videoId,
  startTime,
  endTime,
  onReady,
  onEnded,
  autoplay = false,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const initializingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!videoRef.current) return;

    // Check if player is already initialized or initialization is in progress
    if (playerRef.current || initializingRef.current) return;

    // Mark as initializing to prevent concurrent initializations
    initializingRef.current = true;

    // Dynamically import Video.js and YouTube plugin
    let player: any;

    const initPlayer = async () => {
      try {
        console.log("[VideoPlayer] Starting initialization...");

        // Import Video.js CSS
        await import("video.js/dist/video-js.css");
        console.log("[VideoPlayer] CSS imported");

        // Import Video.js
        const videojsModule = await import("video.js");
        const videojs = videojsModule.default;
        console.log("[VideoPlayer] Video.js imported", { videojs: !!videojs });

        // Make videojs available globally for the YouTube plugin
        if (typeof window !== 'undefined') {
          (window as any).videojs = videojs;
          console.log("[VideoPlayer] Video.js exposed to window");
        }

        // Import YouTube plugin
        await import("videojs-youtube");
        console.log("[VideoPlayer] YouTube plugin imported");

        // Check if YouTube tech is registered
        const YoutubeTech = videojs.getTech && videojs.getTech('Youtube');
        console.log("[VideoPlayer] YouTube tech registered:", !!YoutubeTech);

        if (!YoutubeTech) {
          console.error("[VideoPlayer] YouTube tech not available!");
          return;
        }

        // Check again if video element has already been initialized
        const videoElement = videoRef.current!;
        if (videoElement.hasAttribute('data-vjs-player')) {
          console.log("[VideoPlayer] Player already initialized, skipping");
          return;
        }

        // Wait for YouTube API to be ready before initializing player
        await new Promise<void>((resolve) => {
          const checkYT = () => {
            if (typeof (window as any).YT !== 'undefined' &&
                typeof (window as any).YT.Player !== 'undefined') {
              console.log("[VideoPlayer] YouTube API already loaded");
              resolve();
            } else if (typeof (window as any).YT !== 'undefined' &&
                       typeof (window as any).YT.ready === 'function') {
              console.log("[VideoPlayer] Waiting for YouTube API...");
              (window as any).YT.ready(() => {
                console.log("[VideoPlayer] YouTube API ready");
                resolve();
              });
            } else {
              // YT not loaded yet, wait a bit and try again
              console.log("[VideoPlayer] YouTube API not available yet, retrying...");
              setTimeout(checkYT, 100);
            }
          };
          checkYT();
        });

        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

        console.log("[VideoPlayer] Initializing player with config:", {
          videoId,
          startTime,
          endTime,
          techOrder: ["youtube"],
          videoUrl
        });

        // Initialize player with source included
        player = videojs(videoElement, {
          techOrder: ["youtube"],
          controls: true,
          fluid: true,
          sources: [{
            type: "video/youtube",
            src: videoUrl,
          }],
          youtube: {
            ytControls: 0,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
          },
        });

        playerRef.current = player;
        console.log("[VideoPlayer] Player created:", {
          player: !!player,
          id: player.id(),
          tech: player.tech && player.tech().name
        });

        // Add event listeners for debugging
        player.on('loadstart', () => console.log("[VideoPlayer] Event: loadstart"));
        player.on('loadedmetadata', () => console.log("[VideoPlayer] Event: loadedmetadata"));
        player.on('canplay', () => console.log("[VideoPlayer] Event: canplay"));
        player.on('error', (e: any) => {
          const error = player.error();
          console.error("[VideoPlayer] Event: error", error);
        });

        // Wait for player to be ready
        player.ready(() => {
          console.log("[VideoPlayer] Player ready callback fired");
          console.log("[VideoPlayer] Current tech:", player.tech && player.tech().name);

          // Seek to start time
          console.log("[VideoPlayer] Setting currentTime to:", startTime);
          player.currentTime(startTime);

          if (onReady) {
            onReady();
          }

          if (autoplay) {
            console.log("[VideoPlayer] Attempting autoplay...");
            player.play().catch((e: any) => {
              console.log("[VideoPlayer] Autoplay prevented:", e);
            });
          }
        });

        // Monitor time and trigger onEnded when reaching endTime
        const checkTime = () => {
          if (player && !player.paused()) {
            const currentTime = player.currentTime();
            if (currentTime >= endTime) {
              player.pause();
              if (onEnded) {
                onEnded();
              }
            }
          }
        };

        const intervalId = setInterval(checkTime, 100);

        // Cleanup
        return () => {
          clearInterval(intervalId);
          if (player && !player.isDisposed()) {
            player.dispose();
          }
        };
      } catch (error) {
        console.error("Error initializing Video.js player:", error);
        initializingRef.current = false; // Reset flag on error
      }
    };

    initPlayer();

    return () => {
      initializingRef.current = false; // Reset flag on cleanup
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [videoId, startTime, endTime, onReady, onEnded, autoplay]);

  return (
    <div data-vjs-player>
      <video
        ref={videoRef}
        className="video-js vjs-big-play-centered"
        style={{ width: "100%", height: "400px" }}
      />
    </div>
  );
}
