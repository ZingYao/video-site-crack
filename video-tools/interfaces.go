package video_tools

type VideoSiteInterface interface {
	SearchVideos(query string) []VideoInfo
	GetVideoDetail(pageUrl string) []VideoDetail
}
