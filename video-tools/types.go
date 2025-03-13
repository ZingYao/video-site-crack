package video_tools

type (
	// VideoInfo 视频列表详情
	VideoInfo struct {
		Title    string `json:"title"`    // 视频名称
		Type     string `json:"type"`     // 视频类型
		Actor    string `json:"actor"`    // 主演
		Director string `json:"director"` // 导演
		Desc     string `json:"desc"`     // 简介
		Cover    string `json:"cover"`    // 封面
		PageUrl  string `json:"page_url"` // 视频页面地址
	}
	// VideoDetail 视频详情
	VideoDetail struct {
		Title       string `json:"title"`        // 剧集名称
		PlayerMedia string `json:"player_media"` // 视频播放地址
	}

	VideoSite struct {
		SiteDomain string
		SearchPath string
		SiteName   string
	}
)
