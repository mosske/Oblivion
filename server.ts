app.get("/api/youtube/audio/:videoId", async (req, res) => {
  try {
    const { videoId } = req.params;
    // Return audio stream URL for the video
    // For now, return the YouTube video URL which can be played by audio element
    const audioUrl = `https://www.youtube.com/watch?v=${videoId}`;
    res.json({ success: true, audioUrl, videoId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get audio' });
  }
});