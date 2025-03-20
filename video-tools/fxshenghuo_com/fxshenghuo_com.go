package fxshenghuo_com

import (
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strings"
	"sync"
	videotools "video-site-crack/video-tools"

	"github.com/PuerkitoBio/goquery"
)

func init() {
	NewVideoSite()
}

// 创建新的FxShengHuo实例
func NewVideoSite() videotools.VideoSiteInterface {
	site := &FxShengHuoCom{
		VideoSite: videotools.VideoSite{
			SiteDomain: "http://www.fxshenghuo.com",
			SearchPath: "/search.php",
			SiteName:   "一起看影院",
		},
	}
	videotools.Register(site.SiteName, site)
	return site
}

type FxShengHuoCom struct {
	videotools.VideoSite
}

// GetVideoDetail implements video_tools.VideoSiteInterface.
func (f *FxShengHuoCom) GetVideoDetail(pageUrl string, fastMode bool) map[string][]videotools.VideoDetail {
	videoDetailList := make(map[string][]videotools.VideoDetail)
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

	doc.Find("ul.nav.nav-tabs.active").First().Find("a").Each(func(i int, selection *goquery.Selection) {
		if fastMode && i > 0 {
			return
		}
		wgMain.Add(1)
		go func(i int, selection *goquery.Selection) {
			defer wgMain.Done()
			sourceName := selection.Text()
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
func (f *FxShengHuoCom) SearchVideos(query string) []videotools.VideoInfo {
	videoList := make([]videotools.VideoInfo, 0)
	param := url.Values{}
	param.Set("searchword", query)

	res, err := http.Get(fmt.Sprintf("%s%s?%s", f.SiteDomain, f.SearchPath, param.Encode()))
	if err != nil {
		return videoList
	}
	defer res.Body.Close()
	doc, err := goquery.NewDocumentFromReader(res.Body)
	if err != nil {
		return videoList
	}
	doc.Find("#searchList li").Each(func(i int, selection *goquery.Selection) {
		videoInfo := videotools.VideoInfo{}
		coverDom := selection.Find("a.lazyload").First()
		pageUrl, _ := coverDom.Attr("href")
		videoInfo.PageUrl = fmt.Sprintf("%s%s", f.SiteDomain, pageUrl)
		videoInfo.Cover, _ = coverDom.Attr("data-original")

		videoDetailDom := selection.Find("div.detail").First()
		videoInfo.Title = videoDetailDom.Find(".title a").First().Text()
		videoDetailDom.Find("span").Each(func(i int, selection *goquery.Selection) {
			nodeText := selection.Text()
			switch nodeText {
			case "导演：":
				videoInfo.Director = strings.ReplaceAll(selection.Parent().Text(), nodeText, "")
			case "主演：":
				videoInfo.Actor = strings.ReplaceAll(selection.Parent().Text(), nodeText, "")
			case "分类：":
				videoInfo.Type = strings.ReplaceAll(selection.Parent().Text(), nodeText, "")
				index := strings.Index(videoInfo.Type, "地区：")
				if index >= 0 {
					videoInfo.Type = videoInfo.Type[:index]
				}
			case "简介：":
				videoInfo.Desc = strings.ReplaceAll(selection.Parent().Text(), nodeText, "")
			}
		})
		videoList = append(videoList, videoInfo)
	})
	return videoList
}

func (f *FxShengHuoCom) GetVideoUrl(pgUrl string) string {
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
	scriptDom := doc.Find("div.embed-responsive.clearfix>script").First()
	scriptText := scriptDom.Text()
	re := regexp.MustCompile(`var now="([^"]+)"`)
	matches := re.FindStringSubmatch(scriptText)

	if len(matches) > 1 {
		videoUrl = matches[1]
	}
	return videoUrl
}
