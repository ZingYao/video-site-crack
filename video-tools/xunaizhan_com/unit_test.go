package xunaizhan_com

import "testing"

func TestSearchVideo(t *testing.T) {
	tools := NewVideoSite()
	tools.SearchVideos("异人之下")
}

func TestGetVideoDetail(t *testing.T) {
	tools := NewVideoSite()
	tools.GetVideoDetail("https://www.xunaizhan.com/xgdetail/yirenzhixiazhijuezhanbiyoucun/")
}
