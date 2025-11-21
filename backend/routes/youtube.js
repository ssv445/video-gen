const express = require('express');
const router = express.Router();

/**
 * GET /api/youtube/title/:videoId
 * Fetches YouTube video title using oEmbed API (server-side to avoid CORS)
 */
router.get('/title/:videoId', async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    return res.status(400).json({ error: 'Video ID is required' });
  }

  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://youtube.com/watch?v=${videoId}&format=json`
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();

    res.json({
      title: data.title || `Video ${videoId}`,
      author: data.author_name,
      thumbnail: data.thumbnail_url
    });
  } catch (error) {
    console.error('Error fetching YouTube title:', error);
    res.status(500).json({
      error: 'Failed to fetch video title',
      fallback: `Video ${videoId}`
    });
  }
});

module.exports = router;
