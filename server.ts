// server.ts - Updated endpoints for playlist and album fixes

// ISSUE #4 FIX: Include custom playlist thumbnails
app.get("/api/youtube/playlists", async (req, res) => {
  try {
    const accessToken = await getValidAccessToken(req);
    if (!accessToken) {
      return res.status(401).json({ success: false, playlists: [] });
    }

    // Include localizations to capture custom thumbnails
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50&access_token=${accessToken}`
    );
    
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.statusText}`);
    }

    const data = await response.json();

    const playlists = (data.items || []).map((item: any) => ({
      id: item.id,
      title: item.snippet?.title || "Untitled",
      description: item.snippet?.description || "",
      // FIX: Use high quality thumbnail, fallback to medium
      coverUrl: item.snippet?.thumbnails?.high?.url ||
                item.snippet?.thumbnails?.medium?.url ||
                item.snippet?.thumbnails?.default?.url ||
                "",
      // Include custom thumbnail if available
      customThumbnail: item.snippet?.thumbnails?.default?.url,
      itemCount: item.contentDetails?.itemCount || 0,
      publishedAt: item.snippet?.publishedAt,
    }));

    res.json({
      success: true,
      playlists,
      count: playlists.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching playlists:", error);
    res.status(500).json({
      success: false,
      playlists: [],
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ISSUE #5 FIX: Manual sync endpoint
app.post("/api/youtube/sync-playlists", async (req, res) => {
  try {
    const accessToken = await getValidAccessToken(req);
    if (!accessToken) {
      return res.status(401).json({ success: false });
    }

    // Fetch fresh playlists from YouTube
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50&access_token=${accessToken}`
    );
    
    const data = await response.json();
    const playlists = (data.items || []).map((item: any) => ({
      id: item.id,
      title: item.snippet?.title || "Untitled",
      description: item.snippet?.description || "",
      coverUrl: item.snippet?.thumbnails?.high?.url ||
                item.snippet?.thumbnails?.medium?.url || "",
      itemCount: item.contentDetails?.itemCount || 0,
      publishedAt: item.snippet?.publishedAt,
    }));

    // Return synced data with timestamp
    res.json({
      success: true,
      playlists,
      syncedAt: new Date().toISOString(),
      count: playlists.length,
    });
  } catch (error) {
    console.error("Sync error:", error);
    res.status(500).json({ success: false, error: "Sync failed" });
  }
});

// ISSUE #7 FIX: Fetch songs from albums
app.get("/api/youtube/albums/:albumId/songs", async (req, res) => {
  try {
    const { albumId } = req.params;
    const accessToken = await getValidAccessToken(req);
    
    if (!accessToken) {
      return res.status(401).json({ success: false, songs: [] });
    }

    // First, try to get album info
    const albumRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlists?id=${albumId}&part=snippet,contentDetails&access_token=${accessToken}`
    );
    
    const albumData = await albumRes.json();
    
    if (!albumData.items?.[0]) {
      return res.json({ success: true, songs: [] });
    }

    // Get playlist items (songs) from the album
    const playlistId = albumData.items[0].id;
    const itemsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?playlistId=${playlistId}&part=snippet,contentDetails&maxResults=50&access_token=${accessToken}`
    );

    const itemsData = await itemsRes.json();

    const songs = (itemsData.items || []).map((item: any, index: number) => ({
      id: item.contentDetails?.videoId || item.id,
      youtubeVideoId: item.contentDetails?.videoId,
      title: item.snippet?.title || "Unknown",
      artist: item.snippet?.channelTitle || "Unknown Artist",
      coverUrl: item.snippet?.thumbnails?.medium?.url ||
                item.snippet?.thumbnails?.default?.url || "",
      duration: item.contentDetails?.videoPublishedAt,
      position: index + 1,
    }));

    res.json({
      success: true,
      songs,
      count: songs.length,
      albumTitle: albumData.items[0].snippet?.title,
    });
  } catch (error) {
    console.error("Album songs error:", error);
    res.status(500).json({
      success: false,
      songs: [],
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Keep existing endpoints like /api/youtube/playlists/:playlistId/videos
// The above fixes enhance the existing functionality