这是一个用来批量获取pixiv图片的url的工具，之后你可以复制url，然后使用下载工具来下载图片。

getPixivImageUrl.user.js是个UserScript，你可以通过UserScript管理器（如Greasemonkey、Tampermonkey）安装该脚本，或手动在浏览器控制台执行里面的代码。
（虽然此脚本会使用testURL.php，但您不需要下载及部署它，因为我在我的服务器上部署过了，js里调用的testURL.php是在我服务器的上的）

js里的代码运行后，会在它可以下载的页面上显示下载功能按钮，你可以先设定抓取条件，然后开始抓取。
抓取完毕后会打开一个新标签页并输出抓取到的图片url。之后你可以全选复制所有url，然后使用下载软件（如迅雷、IDM等）批量下载。
（如果你遇到脚本运行完了却没有打开新标签页的时候，请注意一下是不是浏览器拦截新窗口。）

可以使用的场景：
任何人的作品详情页
任何人的作品列表页
任何人的作品tag列表页
任何人的的收藏页面
任何人的收藏页面里的tag页面
各大排行榜页面
tag搜索页面

此脚本也发布在greasyfork.org上，网址：
https://greasyfork.org/zh-CN/scripts/24252
