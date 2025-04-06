package duanju2_com

import "testing"

func TestSearchVideo(t *testing.T) {
	tools := NewVideoSite()
	tools.SearchVideos("厨神")
}

func TestGetVideoDetail(t *testing.T) {
	tools := NewVideoSite()
	tools.GetVideoDetail("https://www.duanju2.com/vod/16716.html", false)
}
