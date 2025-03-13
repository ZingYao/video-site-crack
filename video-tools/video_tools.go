package video_tools

var toolsList = make(map[string]VideoSiteInterface)

func Register(name string, tool VideoSiteInterface) {
	toolsList[name] = tool
}

func GetToolsList() []string {
	var list []string
	for name := range toolsList {
		list = append(list, name)
	}
	return list
}

func GetTool(name string) (VideoSiteInterface, bool) {
	tools, exists := toolsList[name]
	return tools, exists
}
