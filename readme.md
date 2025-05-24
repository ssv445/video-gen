YT Video Stitcheryt-video-stitcher is a command-line tool built with Node.js to download YouTube videos, cut specific segments, and merge them into a single output file. It intelligently caches original full video downloads by their YouTube ID to avoid re-downloading, and aims to download videos at 720p resolution where available.FeaturesDownload YouTube Videos: Fetches videos from YouTube, targeting 720p resolution.Persistent Caching: Stores full downloaded videos in a local cache directory (default: .youtube_cache) using the YouTube video ID as the filename (e.g., VIDEO_ID.mp4). This prevents re-downloading the same video.Segment Cutting: Extracts specific segments from videos based on start and end timestamps.Merge Segments: Joins all extracted segments into a single output video file.Input via JSON: Define video URLs and their segments in a simple JSON file.Configurable Directories: Specify custom directories for caching and temporary files.PrerequisitesBefore you can use yt-video-stitcher, you need to have the following software installed on your system:Node.js and npm:Node.js (version 16 or newer is recommended). npm (Node Package Manager) comes bundled with Node.js.Download and install from nodejs.org.FFmpeg:FFmpeg is a powerful multimedia framework required for video cutting and joining.Windows:Download the latest static build from FFmpeg Builds (e.g., ffmpeg-release-full.7z).Extract the archive (e.g., using 7-Zip).Navigate to the bin directory inside the extracted folder (it contains ffmpeg.exe, ffprobe.exe, etc.).Add this bin directory to your system's PATH environment variable.macOS:Using Homebrew (recommended):brew install ffmpeg
Linux (Debian/Ubuntu):sudo apt update
sudo apt install ffmpeg
Verify Installation: Open a new terminal or command prompt and type:ffmpeg -version
You should see FFmpeg version information.yt-dlp:yt-dlp is a fork of youtube-dl with additional features and fixes, used for downloading YouTube videos.While the youtube-dl-exec library used by this tool can often download yt-dlp automatically, having it installed system-wide is a good fallback and useful for direct command-line use.Recommended Installation (ensures you get the latest version):Windows (using pip, if Python is installed):pip install -U yt-dlp
Or download yt-dlp.exe from the yt-dlp GitHub Releases page and place it in a directory included in your system's PATH.macOS (using Homebrew):brew install yt-dlp
Linux (using pip or package manager):pip3 install -U yt-dlp
Or, for some distributions:sudo apt install yt-dlp # (May not always be the latest)
Alternatively, download the binary directly:sudo wget [https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp](https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp) -O /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
Verify Installation: Open a new terminal or command prompt and type:yt-dlp --version
You should see the yt-dlp version.Installation of yt-video-stitcherClone or Download the Repository:If this tool is in a Git repository, clone it. Otherwise, download the video-processor.js and package.json files into a directory.Install Dependencies:Navigate to the directory where you saved video-processor.js and package.json, then run:npm install
This will install the necessary Node.js packages listed in package.json (like yargs, fluent-ffmpeg, fs-extra, youtube-dl-exec).Make the script executable (Linux/macOS):chmod +x video-processor.js
UsagePrepare your Input JSON File:Create a JSON file (e.g., videos.json) that lists the YouTube videos you want to process and the segments to cut. Each object in the array should have url, startTime, and endTime.Example input.json:[
{
"url": "[https://www.youtube.com/watch?v=FZLadzn5i6Q](https://www.youtube.com/watch?v=FZLadzn5i6Q)",
"startTime": "00:00:00",
"endTime": "00:01:09"
},
{
"url": "[https://www.youtube.com/watch?v=P1fIdFRnfqw](https://www.youtube.com/watch?v=P1fIdFRnfqw)",
"startTime": "00:00:18",
"endTime": "00:01:12"
},
{
"url": "[https://www.youtube.com/watch?v=xfMN4SpIxIA](https://www.youtube.com/watch?v=xfMN4SpIxIA)",
"startTime": "00:00:00",
"endTime": "00:00:52"
}
]
url: The full URL of the YouTube video.startTime: The start time of the segment in HH:MM:SS or MM:SS or SS format.endTime: The end time of the segment in HH:MM:SS or MM:SS or SS format.Run the Command:Execute the script from your terminal:./video-processor.js --input <path_to_your_input.json> --output <desired_output_video_name.mp4>
Example:./video-processor.js --input videos.json --output final_compilation.mp4
Command-Line Options--input, -i: (Required) Path to the JSON file describing videos and segments.--output, -o: (Required) Path for the final merged video output file.--cache-dir, -c: Directory to store original downloaded YouTube videos.Default: ./.youtube_cache (relative to where the command is run)--temp-dir, -t: Directory for temporary video segments (will be cleared after successful completion unless --verbose is used).Default: `./.temp_segments
