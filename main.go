package main

import (
	"crypto/md5"
	"embed"
	"fmt"
	"github.com/fsnotify/fsnotify"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"io/fs"
	"net/http"
	"os"
	"runtime"
	"strings"
	"sync"
	video_tools "video-site-crack/video-tools"
	_ "video-site-crack/video-tools/duanju2_com"
	_ "video-site-crack/video-tools/fxshenghuo_com"
	_ "video-site-crack/video-tools/xunaizhan_com"
)

//go:embed front/*
var front embed.FS
var loginList = &sync.Map{}
var accountMap = &sync.Map{}

func main() {
	initAccountMap()
	r := gin.New()
	// windows下运行允许跨域 进行调试
	if runtime.GOOS == "windows" {
		r.NoRoute(func(ctx *gin.Context) {
			// 当请求内容为html时，为请求路径添加video_watch前缀并重定向
			if !strings.HasPrefix(ctx.Request.URL.Path, "/video_watch") {
				if strings.HasSuffix(ctx.Request.URL.Path, "html") {
					ctx.Redirect(http.StatusMovedPermanently, fmt.Sprintf("/video_watch%s", ctx.Request.URL.Path))
					return
				} else if strings.HasSuffix(ctx.Request.URL.Path, "js") {
					ctx.Redirect(http.StatusMovedPermanently, fmt.Sprintf("/video_watch%s", ctx.Request.URL.Path))
					return
				} else if strings.HasSuffix(ctx.Request.URL.Path, "css") {
					ctx.Redirect(http.StatusMovedPermanently, fmt.Sprintf("/video_watch%s", ctx.Request.URL.Path))
					return
				}
			}
			// 允许跨域
			ctx.Writer.Header().Set("Access-Control-Allow-Origin", "*")
			ctx.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE, UPDATE")
			ctx.Writer.Header().Set("Access-Control-Allow-Headers", "*")
			ctx.Writer.Header().Set("Access-Control-Expose-Headers", "Content-Length, Access-Control-Allow-Origin, Access-Control-Allow-Headers, Cache-Control, Content-Language, Content-Type")
			ctx.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
			if ctx.Request.Method == "OPTIONS" {
				ctx.AbortWithStatus(200)
				return
			}
			ctx.Next()
		})
	} else {
		r.NoRoute(func(ctx *gin.Context) {
			// 当请求内容为html时，为请求路径添加video_watch前缀并重定向
			if !strings.HasPrefix(ctx.Request.URL.Path, "/video_watch") {
				if strings.HasSuffix(ctx.Request.URL.Path, "html") {
					ctx.Redirect(http.StatusMovedPermanently, fmt.Sprintf("/video_watch%s", ctx.Request.URL.Path))
					return
				} else if strings.HasSuffix(ctx.Request.URL.Path, "js") {
					ctx.Redirect(http.StatusMovedPermanently, fmt.Sprintf("/video_watch%s", ctx.Request.URL.Path))
					return
				} else if strings.HasSuffix(ctx.Request.URL.Path, "css") {
					ctx.Redirect(http.StatusMovedPermanently, fmt.Sprintf("/video_watch%s", ctx.Request.URL.Path))
					return
				}
			}
		})
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
	}, func(ctx *gin.Context) {
		// 登录鉴权
		if ctx.Request.URL.Path == "/api/login" {
			ctx.Next()
			return
		}
		// 其他接口需要登录鉴权
		token := ctx.GetHeader("Authorization")
		if _, exists := loginList.Load(token); !exists {
			ctx.JSON(http.StatusOK, gin.H{
				"code": 2,
				"msg":  "need login",
				"data": nil,
			})
			ctx.Abort()
			return
		}
		ctx.Next()
	})
	apiGroup.POST("/login", func(context *gin.Context) {
		username := context.PostForm("username")
		password := context.PostForm("password")
		pass, _ := accountMap.Load(username)
		if pass != MD5Str(password) {
			context.JSON(http.StatusOK, gin.H{
				"code": 3,
				"msg":  "username or password error",
				"data": nil,
			})
			return
		}
		token := uuid.New().String()
		loginList.Store(token, username)
		context.JSON(http.StatusOK, gin.H{
			"code": 0,
			"msg":  "success",
			"data": gin.H{
				"token": token,
			},
		})
		return
	})
	apiGroup.POST("/logout", func(context *gin.Context) {
		token := context.GetHeader("Authorization")
		loginList.Delete(token)
		context.JSON(http.StatusOK, gin.H{
			"code": 0,
			"msg":  "success",
			"data": nil,
		})
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
		fastMode := context.Query("fast_mode") == "true"
		tools, exists := video_tools.GetTool(siteName)
		if !exists {
			context.JSON(http.StatusOK, gin.H{
				"code": 1,
				"msg":  "site not found",
				"data": nil,
			})
		}
		rspList := tools.GetVideoDetail(pageUrl, fastMode)
		context.JSON(http.StatusOK, gin.H{
			"code": 0,
			"msg":  "success",
			"data": rspList,
		})
	})
	subFS, err := fs.Sub(front, "front")
	if err != nil {
		panic(err)
	}
	r.Any("/src/*path", func(c *gin.Context) {
		// 获取请求路径
		path := c.Param("path")
		// 重定向到/video_watch/src/ + path
		c.Redirect(http.StatusMovedPermanently, "/video_watch/src/"+path)
	})

	r.StaticFS("/video_watch", http.FS(subFS))

	r.Run(":8085")
}

func initAccountMap() {
	// 初始化读取文件
	readAccountFile()

	// 创建文件监听器
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		panic(err)
	}

	// 添加监听文件
	err = watcher.Add("./account.txt")
	if err != nil {
		panic(err)
	}

	// 启动goroutine监听文件变化
	go func() {
		for {
			select {
			case event, ok := <-watcher.Events:
				if !ok {
					return
				}
				if event.Op&fsnotify.Write == fsnotify.Write {
					// 文件被修改，重新读取
					readAccountFile()
				}
			case err, ok := <-watcher.Errors:
				if !ok {
					return
				}
				panic(err)
			}
		}
	}()
}

func readAccountFile() {
	content, err := os.ReadFile("./account.txt")
	if err != nil {
		panic(err)
	}

	// 清空原有账号
	accountMap.Clear()

	// 解析文件内容
	lines := strings.Split(string(content), "\n")
	for _, line := range lines {
		parts := strings.Split(line, ":")
		if len(parts) == 2 {
			username := strings.TrimSpace(parts[0])
			password := strings.TrimSpace(parts[1])
			if username != "" && password != "" {
				accountMap.Store(username, password)
			}
		}
	}
}

func MD5Str(str string) string {
	hash := md5.Sum([]byte(str))
	return fmt.Sprintf("%x", hash)
}
