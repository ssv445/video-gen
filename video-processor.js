#!/usr/bin/env node

// video-processor.js

const fs = require('fs-extra');
const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { exec } = require('child_process'); // For checking ffmpeg/yt-dlp and running docker-compose exec

// --- Utility Functions ---

/**
 * Extracts YouTube Video ID from various URL formats.
 * @param {string} url - The YouTube URL.
 * @returns {string|null} - The video ID or null if not found.
 */
function getYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

/**
 * Promisified version of child_process.exec
 * @param {string} command - The command to execute.
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
function execPromise(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve({ stdout, stderr });
        });
    });
}

/**
 * Checks if a command-line tool is installed and accessible.
 * @param {string} toolName - The name of the tool (e.g., "ffmpeg").
 * @param {string} versionCommand - The command to check its version (e.g., "ffmpeg -version").
 * @returns {Promise<boolean>} - True if the tool is found, false otherwise.
 */
async function checkToolExists(toolName, versionCommand) {
    try {
        await execPromise(versionCommand);
        console.log(`✅ ${toolName} is installed and accessible.`);
        return true;
    } catch (error) {
        console.error(`❌ ${toolName} not found or not executable. Please ensure it's installed and in your PATH.`);
        console.error(`   Attempted command: ${versionCommand}`);
        console.error(`   Error: ${error.message}`);
        return false;
    }
}


// --- Main Application Logic ---

async function main() {
    const argv = yargs(hideBin(process.argv))
        .usage('Usage: $0 --input <input.json> --output <output_video.mp4> [--cache-dir <path>] [--temp-dir <path>] [--verbose]')
        .option('input', {
            alias: 'i',
            describe: 'Path to the JSON file describing videos and segments',
            type: 'string',
            demandOption: true,
        })
        .option('output', {
            alias: 'o',
            describe: 'Path for the final merged video output',
            type: 'string',
            demandOption: true,
        })
        .option('cache-dir', {
            alias: 'c',
            describe: 'Directory to store original downloaded YouTube videos',
            type: 'string',
            default: path.join(process.cwd(), 'media', '.youtube_cache'), // Now under ./media
        })
        .option('temp-dir', {
            alias: 't',
            describe: 'Directory for temporary video segments (will be cleared)',
            type: 'string',
            default: path.join(process.cwd(), 'media', '.temp_segments'), // Now under ./media
        })
        .option('verbose', {
            alias: 'v',
            describe: 'Enable verbose logging',
            type: 'boolean',
            default: false,
        })
        .help()
        .alias('help', 'h')
        .argv;

    const { input, output, cacheDir, tempDir, verbose } = argv;

    if (verbose) {
        console.log('Verbose mode enabled.');
        console.log('Arguments received:', argv);
    }

    // 1. Check for FFmpeg and yt-dlp
    console.log("Checking for dependencies...");
    const ffmpegFound = await checkToolExists("FFmpeg (docker)", "docker compose exec ffmpeg ffmpeg -version");
    const ytdlpFound = await checkToolExists("yt-dlp (docker)", "docker compose exec ytdlp yt-dlp --version");

    if (!ffmpegFound || !ytdlpFound) {
        console.error("❌ Critical dependencies missing. Exiting.");
        process.exit(1);
    }
    console.log("All critical dependencies found.\n");


    // 2. Ensure directories exist
    try {
        await fs.ensureDir(cacheDir);
        await fs.ensureDir(tempDir);
        // Clear tempDir from previous runs if it exists, but not cacheDir
        await fs.emptyDir(tempDir);
        if (verbose) {
            console.log(`Cache directory: ${path.resolve(cacheDir)}`);
            console.log(`Temporary segments directory: ${path.resolve(tempDir)} (cleared)`);
        }
    } catch (err) {
        console.error(`Error ensuring directories: ${err.message}`);
        process.exit(1);
    }

    // 3. Read input JSON
    let videoTasks;
    try {
        const inputFileContent = await fs.readFile(input, 'utf8');
        videoTasks = JSON.parse(inputFileContent);
        if (!Array.isArray(videoTasks) || videoTasks.some(task => !task.url || !task.startTime || !task.endTime)) {
            throw new Error('Invalid JSON format. Must be an array of objects with url, startTime, and endTime.');
        }
        if (verbose) console.log(`Successfully read and parsed ${input}`);
    } catch (err) {
        console.error(`Error reading or parsing input JSON file (${input}): ${err.message}`);
        process.exit(1);
    }

    const cutSegmentPaths = [];

    // 4. Process each video
    for (let i = 0; i < videoTasks.length; i++) {
        const task = videoTasks[i];
        console.log(`\nProcessing video ${i + 1}/${videoTasks.length}: ${task.url}`);

        const videoId = getYouTubeId(task.url);
        if (!videoId) {
            console.warn(`⚠️ Could not extract video ID from URL: ${task.url}. Skipping this video.`);
            continue;
        }
        if (verbose) console.log(`Extracted Video ID: ${videoId}`);

        // All paths must be under ./media for docker
        const cachedVideoPath = path.join(cacheDir, `${videoId}.mp4`);
        const cachedVideoPathContainer = `/workdir/.youtube_cache/${videoId}.mp4`;
        let localVideoPath = cachedVideoPath; // Host path
        let containerVideoPath = cachedVideoPathContainer; // Container path

        // 4a. Check cache or download
        if (await fs.pathExists(cachedVideoPath)) {
            console.log(`✅ Video ${videoId} found in cache: ${cachedVideoPath}`);
        } else {
            console.log(`ℹ️ Video ${videoId} not in cache. Downloading...`);
            try {
                // Download ONLY 720p MP4, store as <videoId>.mp4, never use format code in filename
                const ytdlpCmd = `docker compose exec ytdlp yt-dlp -f "bestvideo[height<=720]+bestaudio/best[height<=720]" --merge-output-format mp4 -o "/workdir/.youtube_cache/${videoId}.mp4" "${task.url}"`;
                if (verbose) console.log(`yt-dlp command: ${ytdlpCmd}`);
                await execPromise(ytdlpCmd);
                console.log(`✅ Downloaded and cached ${videoId} to ${cachedVideoPath}`);
            } catch (err) {
                console.error(`❌ Error downloading ${task.url} (ID: ${videoId}): ${err.message}`);
                if (err.stderr && verbose) console.error(`yt-dlp stderr: ${err.stderr}`);
                console.warn(`Skipping video ${videoId} due to download error.`);
                continue; // Skip to next video
            }
        }

        // 4b. Cut (Trim) video
        const segmentFileName = `cut_segment_${i + 1}_${videoId}.mp4`;
        const segmentOutputPath = path.join(tempDir, segmentFileName); // Host path
        const segmentOutputPathContainer = `/workdir/.temp_segments/${segmentFileName}`;
        console.log(`Cutting segment for ${videoId}: ${task.startTime} to ${task.endTime}`);

        try {
            // Try lossless cut first
            const ffmpegCmd = `docker compose exec ffmpeg ffmpeg -y -ss ${task.startTime} -i \"${containerVideoPath}\" -t ${calculateDuration(task.startTime, task.endTime)} -c copy \"${segmentOutputPathContainer}\"`;
            if (verbose) console.log(`FFmpeg command: ${ffmpegCmd}`);
            try {
                await execPromise(ffmpegCmd);
                console.log(`✅ Segment (lossless cut) for ${videoId} saved to ${segmentOutputPath}`);
                cutSegmentPaths.push(segmentOutputPath);
            } catch (err) {
                console.warn(`⚠️ Lossless cut failed for ${videoId}. Attempting re-encode...`);
                if (verbose) console.log(`FFmpeg command: ${ffmpegCmd}`);

                // Fallback: re-encode
                const ffmpegReencodeCmd = `docker compose exec ffmpeg ffmpeg -y -ss ${task.startTime} -i \"${containerVideoPath}\" -t ${calculateDuration(task.startTime, task.endTime)} \"${segmentOutputPathContainer}\"`;
                if (verbose) console.log(`FFmpeg (re-encode) command: ${ffmpegReencodeCmd}`);
                await execPromise(ffmpegReencodeCmd);
                console.log(`✅ Segment (re-encoded) for ${videoId} saved to ${segmentOutputPath}`);
                cutSegmentPaths.push(segmentOutputPath);
            }
        } catch (err) {
            console.warn(`Skipping segment for ${videoId} due to cutting error.`);
            continue; // Skip to next video if cutting fails
        }
    }

    // 5. Join Segments
    if (cutSegmentPaths.length === 0) {
        console.warn("⚠️ No segments were successfully cut. Nothing to join. Exiting.");
        if (!verbose) await fs.remove(tempDir); // Clean up temp even if exiting early
        process.exit(0);
    }

    console.log(`\nJoining ${cutSegmentPaths.length} segments...`);

    // 5a. Create concat list file for ffmpeg concat demuxer
    const concatListPath = path.join(tempDir, 'concat_list.txt');
    const concatListPathContainer = '/workdir/.temp_segments/concat_list.txt';
    const concatListContent = cutSegmentPaths.map(p => `file '${path.basename(p)}'`).join('\n');
    await fs.writeFile(concatListPath, concatListContent);

    // 5b. Merge using ffmpeg concat demuxer
    const outputContainerPath = `/workdir/${path.basename(output)}`;
    try {
        const mergeCmd = `docker compose exec ffmpeg ffmpeg -y -f concat -safe 0 -i \"${concatListPathContainer}\" -c copy \"${outputContainerPath}\"`;
        if (verbose) console.log(`FFmpeg merge command: ${mergeCmd}`);
        await execPromise(mergeCmd);
        // Move output from ./media to user-specified output if needed
        const mergedOutputHost = path.join(path.dirname(output), path.basename(output));
        const mergedOutputMedia = path.join(process.cwd(), 'media', path.basename(output));
        if (mergedOutputHost !== mergedOutputMedia && await fs.pathExists(mergedOutputMedia)) {
            await fs.move(mergedOutputMedia, mergedOutputHost, { overwrite: true });
        }
        console.log(`✅ All segments successfully merged into ${output}`);
    } catch (err) {
        console.error("❌ Failed to join videos.");
    }

    // 6. Cleanup
    if (!verbose) { // Keep temp files if verbose for debugging
        try {
            console.log(`Cleaning up temporary directory: ${tempDir}`);
            await fs.remove(tempDir); // Removes the directory and its contents
            console.log("✅ Temporary files cleaned up.");
        } catch (err) {
            console.warn(`⚠️ Error cleaning up temporary directory ${tempDir}: ${err.message}`);
        }
    } else {
        console.log(`ℹ️ Verbose mode: Temporary segment files retained in ${tempDir}`);
    }
    console.log(`\n✨ Video processing complete. Final output: ${path.resolve(output)}`);
    console.log(`ℹ️ Original downloads are cached in: ${path.resolve(cacheDir)}`);
}

/**
 * Calculates duration between two HH:MM:SS timestamps.
 * @param {string} startTime - e.g., "00:01:30"
 * @param {string} endTime - e.g., "00:02:00"
 * @returns {string} Duration in seconds, e.g., "30"
 */
function timeToSeconds(timeStr) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) { // HH:MM:SS
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) { // MM:SS
        return parts[0] * 60 + parts[1];
    } else if (parts.length === 1) { // SS
        return parts[0];
    }
    throw new Error(`Invalid time format: ${timeStr}. Expected HH:MM:SS, MM:SS, or SS.`);
}

function calculateDuration(startTime, endTime) {
    try {
        const startSeconds = timeToSeconds(startTime);
        const endSeconds = timeToSeconds(endTime);
        if (endSeconds <= startSeconds) {
            throw new Error(`End time (${endTime}) must be after start time (${startTime}).`);
        }
        return (endSeconds - startSeconds).toString();
    } catch (e) {
        console.error(`Error calculating duration: ${e.message}`);
        // Return a default or re-throw, here we re-throw to stop processing for this item
        throw e;
    }
}


// --- Run the application ---
if (require.main === module) {
    main().catch(err => {
        console.error("\n❌ An unexpected error occurred in the main process:");
        console.error(err.message);
        if (err.stack && argv && argv.verbose) { // Check if argv is defined
            console.error(err.stack);
        }
        process.exit(1);
    });
}

// Export for potential programmatic use (optional)
module.exports = { main, getYouTubeId, calculateDuration };

