![图片1](https://wx3.sinaimg.cn/large/640defebgy1fhnv80522fj20mr0iejvi.jpg)

# 简介：

这是一个使用JavaScript编写的pixiv图片下载器，它实质上是一个用户脚本（UserScript）。

由于其跨域功能依赖于用户脚本管理器，所以它必须使用用户脚本管理器来安装（推荐使用chrome + tampermonkey）。

# 使用：

你可以在greasyfork.org上安装它：

https://greasyfork.org/zh-CN/scripts/24252

或者，点击安装直链👉👉
 [![](https://img.shields.io/badge/%E5%AE%89%E8%A3%85%E7%9B%B4%E9%93%BE-%F0%9F%90%92-blue.svg)](https://raw.githubusercontent.com/xuejiansaber/XZPixivDownloader/master/XZPixivDownloader.js "请确认已安装并启动脚本管理器")

安装后，在可以进行下载的页面上就会显示下载功能按钮。

下载的文件会保存在浏览器的下载目录里。

- 如果您使用 Firefox 浏览器，Firefox 在下载时会先弹窗询问是否直接打开。如果您希望跳过这个窗口静默下载，请遵循以下步骤：

    1. 在地址栏输入并访问 `about:config`，点击警告确认按钮
    2. 搜索找到 `browser.download.forbid_open_with` 并双击
    3. 重启

# 可以使用的场景：

作品详情页

作品列表页

各种tag列表页

所有人的收藏页面

各大排行榜页面

tag搜索页面

相似作品页面

推荐作品页面

大家的新作品页面

关注的新作品页面

“发现”页面

pixivision上的插画、漫画、cosplay

pixiv特辑上的插画

# 支持的语言：

简体中文（繁体设置下也使用简体中文文本）

English （机翻，韩语设置下也使用英语文本）

日本語 （机翻）

欢迎有能力的朋友对翻译做出改进~

## 手动将动图合成为视频：

因为pixiv上动图的源文件是zip压缩包，体积大，看图还麻烦，你可以尝试用ffmpeg将动图转换成视频，参见：

[使用FFmpeg将pixiv的动图合成为视频](https://saber.love/?p=3859)

## 测试网址：

[0：首页](https://www.pixiv.net/)

[1：插画页](https://www.pixiv.net/member_illust.php?mode=medium&illust_id=62751951)

[2：列表页](https://www.pixiv.net/member_illust.php?id=544479)

[3：tag页](https://www.pixiv.net/member_illust.php?id=544479&tag=%E6%9D%B1%E6%96%B9)

[4：书签页](https://www.pixiv.net/bookmark.php?id=544479)

[5：tag搜索页](https://www.pixiv.net/search.php?s_mode=s_tag&word=saber)

[6：地区排行榜](https://www.pixiv.net/ranking_area.php?type=detail&no=6)

[7：其他排行榜](https://www.pixiv.net/ranking.php)

[8：pixivision](https://www.pixivision.net/zh/a/3190)

[9：添加书签后](https://www.pixiv.net/bookmark_add.php?id=63148723)

[10.1：大家的新作品](https://www.pixiv.net/new_illust.php)

[10.2：关注的新作品](https://www.pixiv.net/bookmark_new_illust.php)

[11：发现](https://www.pixiv.net/discovery)

[12：特辑](https://www.pixiv.net/showcase/a/3190/)