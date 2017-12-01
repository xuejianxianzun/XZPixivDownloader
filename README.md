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

# 支持的语言：

简体中文（繁体设置下也使用简体中文文本）

English （机翻，韩语设置下也使用英语文本）

日本語 （机翻）

欢迎有能力的朋友对翻译做出改进~

## 自行处理动图：

因为pixiv上动图的源文件是zip压缩包，体积大，看图还麻烦，你可以尝试用ffmpeg将动图转换成视频，参见：

[使用FFmpeg将pixiv的动图合成为视频](https://saber.love/?p=3859)

#### 其他：

其实前些时候我想把这个脚本做成chrome扩展，但是chrome扩展也并不能做到跨域下载文件。虽然我看到了一个变通的办法，但是要做许多额外的工作，实现起来既曲折又不直观，此计划遂搁浅。
