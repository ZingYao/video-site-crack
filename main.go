package main

import (
	"embed"
	"github.com/gin-gonic/gin"
	"io/fs"
	"net/http"
	"runtime"
	video_tools "video-site-crack/video-tools"
	_ "video-site-crack/video-tools/xunaizhan_com"
)

//go:embed front/*
var front embed.FS

func main() {
	r := gin.New()
	subFS, err := fs.Sub(front, "front")
	if err != nil {
		panic(err)
	}
	apiGroup := r.Group("/api", func(context *gin.Context) {
		// windows下运行允许跨域 进行调试
		if runtime.GOOS == "windows" {
			// 允许跨域
			context.Writer.Header().Set("Access-Control-Allow-Origin", "*")
			context.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE, UPDATE")
			context.Writer.Header().Set("Access-Control-Allow-Headers", "*")
			context.Writer.Header().Set("Access-Control-Expose-Headers", "Content-Length, Access-Control-Allow-Origin, Access-Control-Allow-Headers, Cache-Control, Content-Language, Content-Type")
			context.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
			if context.Request.Method == "OPTIONS" {
				context.AbortWithStatus(200)
				return
			}
		}
		context.Next()
	})
	apiGroup.GET("/site/list", func(context *gin.Context) {
		context.JSON(http.StatusOK, gin.H{
			"code": 0,
			"msg":  "success",
			"data": video_tools.GetToolsList(),
		})
	})
	apiGroup.GET("/site/search", func(context *gin.Context) {
		siteName := context.Query("site_name")
		query := context.Query("query")
		tools, exists := video_tools.GetTool(siteName)
		if !exists {
			context.JSON(http.StatusOK, gin.H{
				"code": 1,
				"msg":  "site not found",
				"data": nil,
			})
			return
		}
		rspList := tools.SearchVideos(query)
		context.JSON(http.StatusOK, gin.H{
			"code": 0,
			"msg":  "success",
			"data": rspList,
		})
	})
	apiGroup.GET("/site/detail", func(context *gin.Context) {
		pageUrl := context.Query("page_url")
		siteName := context.Query("site_name")
		tools, exists := video_tools.GetTool(siteName)
		if !exists {
			context.JSON(http.StatusOK, gin.H{
				"code": 1,
				"msg":  "site not found",
				"data": nil,
			})
		}
		rspList := tools.GetVideoDetail(pageUrl)
		context.JSON(http.StatusOK, gin.H{
			"code": 0,
			"msg":  "success",
			"data": rspList,
		})
	})
	r.StaticFS("/video_watch", http.FS(subFS))

	r.Run(":8085")
}
