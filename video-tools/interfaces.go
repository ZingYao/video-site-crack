package video_tools

import "github.com/gin-gonic/gin"

type VideoSiteInterface interface {
	SearchVideos(ctx *gin.Context, query string) []VideoInfo
	GetVideoDetail(ctx *gin.Context, pageUrl string, fastMode bool) map[string][]VideoDetail
}
