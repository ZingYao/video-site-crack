package xunaizhan_com

import (
	"encoding/json"
	"fmt"
	"github.com/PuerkitoBio/goquery"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"sync"
	videotools "video-site-crack/video-tools"
)

func init() {
	NewVideoSite()
}

func NewVideoSite() videotools.VideoSiteInterface {
	tools := &XunaizhanCom{
		VideoSite: videotools.VideoSite{
			SiteDomain: "https://www.xunaizhan.com",
			SearchPath: "/vodsearch",
			SiteName:   "星光影院",
		},
	}
	videotools.Register(tools.SiteName, tools)
	return tools
}

type XunaizhanCom struct {
	videotools.VideoSite
}

func (x *XunaizhanCom) SearchVideos(query string) []videotools.VideoInfo {
	videoList := make([]videotools.VideoInfo, 0)
	param := url.Values{}
	param.Add("wd", query)
	param.Add("submit", "")
	res, err := http.Get(fmt.Sprintf("%s%s?%s", x.SiteDomain, x.SearchPath, param.Encode()))
	if err != nil {
		return videoList
	}
	defer res.Body.Close()
	doc, err := goquery.NewDocumentFromReader(res.Body)
	if err != nil {
		return videoList
	}
	doc.Find("ul.vodlist.clearfix").Each(func(i int, selection *goquery.Selection) {
		selection.Find("li.searchlist_item").Each(func(i int, selection *goquery.Selection) {
			videoInfo := videotools.VideoInfo{}
			aDom := selection.Find("div.searchlist_img").First().Find("a.vodlist_thumb.lazyload").First()
			// 获取视频页面链接
			pageUrl, _ := aDom.Attr("href")
			videoInfo.PageUrl = fmt.Sprintf("%s%s", x.SiteDomain, pageUrl)
			// 获取封面图片
			videoInfo.Cover, _ = aDom.Attr("data-original")
			// 获取视频信息
			videoDetailDiv := selection.Find("div.searchlist_titbox").Last()
			h4Dom := videoDetailDiv.Find("h4").First()
			videoInfo.Title, _ = h4Dom.Find("a").First().Attr("title")
			videoInfo.Type = h4Dom.Find("span").First().Text()
			videoDetailDiv.Find("p.vodlist_sub").Each(func(i int, selection *goquery.Selection) {
				val := strings.Replace(selection.Text(), selection.Children().First().Text(), "", 1)
				val = strings.TrimSpace(val)
				switch i {
				case 0:
					videoInfo.Actor = val
				case 1:
					videoInfo.Director = val
				case 2:
					videoInfo.Desc = val
				}
			})
			videoList = append(videoList, videoInfo)
		})
	})
	return videoList
}

func (x *XunaizhanCom) GetVideoDetail(pageUrl string) []videotools.VideoDetail {
	var videoDetailList []videotools.VideoDetail
	res, err := http.Get(pageUrl)
	if err != nil {
		return nil
	}
	defer res.Body.Close()
	doc, err := goquery.NewDocumentFromReader(res.Body)
	if err != nil {
		return nil
	}
	wg := &sync.WaitGroup{}
	doc.Find("ul.content_playlist.clearfix").First().Find("li").Each(func(i int, selection *goquery.Selection) {
		wg.Add(1)
		go func(selection *goquery.Selection) {
			defer wg.Done()
			subPageUrl := selection.Find("a").First().AttrOr("href", "")
			name := selection.Find("a").First().Text()
			mediaUrl := x.GetVideoUrl(fmt.Sprintf("%s%s", x.SiteDomain, subPageUrl))
			videoDetailList = append(videoDetailList, videotools.VideoDetail{
				Title:       name,
				PlayerMedia: mediaUrl,
			})
		}(selection)
	})
	wg.Wait()
	sort.Slice(videoDetailList, func(i, j int) bool {
		return videoDetailList[i].Title < videoDetailList[j].Title
	})
	return videoDetailList
}

func (x *XunaizhanCom) GetVideoUrl(pgUrl string) string {
	var videoUrl string
	res, err := http.Get(pgUrl)
	if err != nil {
		return videoUrl
	}
	defer res.Body.Close()
	doc, err := goquery.NewDocumentFromReader(res.Body)
	scriptDom := doc.Find("#fd_tips").First().Next()
	scriptContent := scriptDom.Text()
	var data map[string]any
	err = json.Unmarshal([]byte(strings.ReplaceAll(scriptContent, "var player_aaaa=", "")), &data)
	if err != nil {
		return videoUrl
	}
	videoUrl = data["url"].(string)
	return videoUrl
}
