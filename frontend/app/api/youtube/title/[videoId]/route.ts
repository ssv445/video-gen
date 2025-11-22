import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/youtube/title/[videoId]
 * Fetches YouTube video title using oEmbed API (server-side to avoid CORS)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  const { videoId } = params;

  if (!videoId) {
    return NextResponse.json(
      { error: 'Video ID is required' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://youtube.com/watch?v=${videoId}&format=json`
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      title: data.title || `Video ${videoId}`,
      author: data.author_name,
      thumbnail: data.thumbnail_url
    });
  } catch (error) {
    console.error('Error fetching YouTube title:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch video title',
        fallback: `Video ${videoId}`
      },
      { status: 500 }
    );
  }
}
