package fxshenghuo_com

import "testing"

func TestSearchVideo(t *testing.T) {
	tools := NewVideoSite()
	tools.SearchVideos("异人之下")
}

func TestGetVideoDetail(t *testing.T) {
	tools := NewVideoSite()
	tools.GetVideoDetail("http://www.fxshenghuo.com/sheng/24576.html")
}
