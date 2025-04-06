package duanju2_com

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"sync"
	videotools "video-site-crack/video-tools"

	"github.com/PuerkitoBio/goquery"
)

func init() {
	NewVideoSite()
}

// 创建新的duanju2实例
func NewVideoSite() videotools.VideoSiteInterface {
	site := &DuanJu2Com{
		VideoSite: videotools.VideoSite{
			SiteDomain: "https://www.duanju2.com",
			SearchPath: "/search/-------------.html",
			SiteName:   "短剧网",
		},
	}
	videotools.Register(site.SiteName, site)
	return site
}

type DuanJu2Com struct {
	videotools.VideoSite
}

// GetVideoDetail implements video_tools.VideoSiteInterface.
func (f *DuanJu2Com) GetVideoDetail(pageUrl string, fastMode bool) map[string][]videotools.VideoDetail {
	videoDetailList := make(map[string][]videotools.VideoDetail)
	lock := &sync.Mutex{}
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
	wgMain := &sync.WaitGroup{}

	doc.Find("#pills-tab").First().Find("li a").Each(func(i int, selection *goquery.Selection) {
		if fastMode && i > 0 {
			return
		}
		if i == 0 {
			// 跳过第一个
			return
		}
		wgMain.Add(1)
		go func(i int, selection *goquery.Selection) {
			defer wgMain.Done()
			sourceName := selection.Find("a").First().Text()
			sourceVideoList := make([]videotools.VideoDetail, 0)
			href, _ := selection.Attr("href")
			doc.Find(href).First().Find("li>a").Each(func(i int, selection *goquery.Selection) {
				wg.Add(1)
				go func(index int, selection *goquery.Selection) {
					defer wg.Done()
					subPageUrl := selection.AttrOr("href", "")
					name := selection.Text()
					mediaUrl := f.GetVideoUrl(fmt.Sprintf("%s%s", f.SiteDomain, subPageUrl))
					sourceVideoList = append(sourceVideoList, videotools.VideoDetail{
						Title:       name,
						PlayerMedia: mediaUrl,
						Index:       index,
					})
				}(i, selection)
			})
			wg.Wait()
			lock.Lock()
			defer lock.Unlock()
			videoDetailList[sourceName] = sourceVideoList
		}(i, selection)
	})
	wgMain.Wait()
	for key, list := range videoDetailList {
		sort.Slice(list, func(i, j int) bool {
			return list[i].Index < list[j].Index
		})
		videoDetailList[key] = list
	}
	return videoDetailList
}

// SearchVideos implements video_tools.VideoSiteInterface.
func (f *DuanJu2Com) SearchVideos(query string) []videotools.VideoInfo {
	videoList := make([]videotools.VideoInfo, 0)
	param := url.Values{}
	param.Set("wd", query)

	res, err := http.Get(fmt.Sprintf("%s%s?%s", f.SiteDomain, f.SearchPath, param.Encode()))
	if err != nil {
		return videoList
	}
	defer res.Body.Close()
	doc, err := goquery.NewDocumentFromReader(res.Body)
	if err != nil {
		return videoList
	}
	doc.Find(".row.posts-wrapper.scroll article").Each(func(i int, selection *goquery.Selection) {
		videoInfo := videotools.VideoInfo{}
		coverDom := selection.Find("img").First()
		pageUrl, _ := selection.Find(".placeholder a").First().Attr("href")
		videoInfo.PageUrl = fmt.Sprintf("%s%s", f.SiteDomain, pageUrl)
		videoInfo.Cover, _ = coverDom.Attr("data-src")

		videoDetailDom := selection.Find("div.entry-wrapper").First()
		videoInfo.Title = videoDetailDom.Find("h2.entry-title a").First().Text()
		videoInfo.Desc = "未知"
		videoInfo.Director = "未知"
		videoInfo.Actor = "未知"
		videoInfo.Type = videoDetailDom.Find("div.entry-meta a").First().Text()

		videoList = append(videoList, videoInfo)
	})
	return videoList
}

func (f *DuanJu2Com) GetVideoUrl(pgUrl string) string {
	var videoUrl string
	res, err := http.Get(pgUrl)
	if err != nil {
		return videoUrl
	}
	defer res.Body.Close()
	doc, err := goquery.NewDocumentFromReader(res.Body)
	if err != nil {
		return videoUrl
	}
	var scriptDom *goquery.Selection
	doc.Find("#main script").Each(func(i int, selection *goquery.Selection) {
		if strings.Contains(selection.Text(), "player_aaaa") {
			scriptDom = selection
			return
		} else {
			return
		}
	})
	scriptText := scriptDom.Text()
	jsonText := strings.ReplaceAll(scriptText, "var player_aaaa=", "")
	var confMap map[string]any
	err = json.Unmarshal([]byte(jsonText), &confMap)
	if err != nil {
		return videoUrl
	} else {
		videoUrl = confMap["url"].(string)
	}
	return videoUrl
}
