[View English introduction](https://github.com/xuejianxianzun/XZPixivDownloader/blob/master/README-EN.md)

## 注意：

**这个版本（脚本版）未来只会进行基础的维护，不再添加新功能。请用户尽快迁移到 Chrome 扩展版本。**

安装 Chrome 扩展版：[离线安装](https://github.com/xuejianxianzun/PixivBatchDownloader/wiki/2.-%E5%AE%89%E8%A3%85#%E7%A6%BB%E7%BA%BF%E5%AE%89%E8%A3%85) 

[Chrome 扩展版 Github 页面](https://github.com/xuejianxianzun/PixivBatchDownloader)

[Chrome 扩展版的 wiki](https://github.com/xuejianxianzun/PixivBatchDownloader/wiki)

**如果你安装了扩展版，需要禁用这个脚本版。** 不要让两个版本同时运行。

# 简介：

这是一个使用 JavaScript 编写的 Pixiv 图片下载器，支持多种页面类型和筛选条件。

现在也增加了一些辅助功能，如去除广告、快速收藏、看图模式、给未分类作品添加 tag 等。

它实质上是一个用户脚本（UserScript），必须使用用户脚本管理器来安装。

![仙尊 pixiv 下载器 中文截图](https://wx4.sinaimg.cn/large/640defebly1fzm7xsi3dfj20kl0jftay.jpg)

## 推荐环境：

浏览器：**Chrome** [(下载Chrome浏览器，此链接需要翻墙)](https://www.google.com/chrome/)

用户脚本管理器：**Tampermonkey** [(在Chrome网上商店查看，此链接需要翻墙)](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)

- 请关闭浏览器设置中的“下载前询问每个文件的保存位置”选项，以免在下载时出现弹窗。

- 推荐使用 Chrome。如果你使用其他浏览器，可能会出现内存占用过高、或者下载后无法保存文件的问题（常见于各种国产套壳浏览器）。

# 安装：

你可以在greasyfork.org上安装它：

[https://greasyfork.org/zh-CN/scripts/24252](https://greasyfork.org/zh-CN/scripts/24252)

下载的文件会保存在浏览器的下载目录里。

# 浏览器扩展：

本工具有浏览器扩展版本。如果你想使用浏览器扩展，可以卸载脚本版，然后安装浏览器扩展。

[GitHub](https://github.com/xuejianxianzun/PixivBatchDownloader/wiki/2.-%E5%AE%89%E8%A3%85#%E7%A6%BB%E7%BA%BF%E5%AE%89%E8%A3%85)

## 支持的语言：

简体中文

繁體中文（感谢网友 [道滿](https://zhtw.me/) 进行翻译）

English （机翻，韩语设置下也使用英语文本）

日本語 （机翻）

欢迎您对翻译做出改进，谢谢~

## 提示：

- 浏览器的资源限制问题

下载p站图片时，该页面会占用较多内存和cpu资源。如果切换到了其他页面，导致下载页面未激活，那么浏览器就会限制下载页面的资源使用，导致下载缓慢。

解决办法：把下载的标签页单独拖出来，成为一个独立的窗口。新窗口里只有这一个页面，它始终是激活的。这样下载不受影响，我们也可以使用其他页面了。

- 如何查看动图：

动画图片下载之后，后缀名是 ugoira，请安装看图软件 HoneyView，之后用 HoneyView 打开 ugoira 文件可以查看动图效果。（但是文件体积大了，HoneyView 播放的帧率会变慢）

现在对单个动图可以直接下载 gif 图片。

- 如有问题或建议，欢迎加 QQ 群 499873152 进行交流。

## 捐助：

如果您感觉本脚本帮到了您，您可以对我进行捐赠，不胜感激 (*╹▽╹*)

（可通过微信和支付宝扫码转账）

![支付宝](https://i.loli.net/2019/04/04/5ca5627614396.png) ![微信](https://i.loli.net/2019/04/04/5ca5627630bb4.png)

## 可以使用的页面类型以及测试网址：

0 [首页](https://www.pixiv.net/)

1 [作品页面](https://www.pixiv.net/member_illust.php?mode=medium&illust_id=62751951)

2 [作品列表页](https://www.pixiv.net/member_illust.php?id=544479)

2 [tag列表页](https://www.pixiv.net/member_illust.php?id=544479&tag=%E6%9D%B1%E6%96%B9)

2 [收藏页面](https://www.pixiv.net/bookmark.php)

5 [tag搜索页](https://www.pixiv.net/search.php?s_mode=s_tag&word=saber)

6 [地区排行榜](https://www.pixiv.net/ranking_area.php?type=state&no=0) 此板块已不再出现，只能通过网址进入

7 [排行榜](https://www.pixiv.net/ranking.php)

8 [pixivision上的插画、漫画、cosplay页面](https://www.pixivision.net/zh/a/3190)

9 [相似作品](https://www.pixiv.net/bookmark_add.php?id=63148723) 此板块已不再出现，只能通过网址进入

10 [大家的新作品](https://www.pixiv.net/new_illust.php)

10 [关注的新作品](https://www.pixiv.net/bookmark_new_illust.php)

11 [发现](https://www.pixiv.net/discovery)

## 使用的库：

[Viewer.js](https://github.com/fengyuanchen/viewerjs)

[zip.js](https://github.com/gildas-lormeau/zip.js)

[gif.js](https://github.com/jnordberg/gif.js)

## 友情链接：

[PixivUserBatchDownload](https://github.com/Mapaler/PixivUserBatchDownload/)

这是另一个工具——“P站画师个人作品批量下载工具”，简称PUBD。专注按画师下载作品，适合动手能力强的用户使用。

- 专做按作者下载，适合有专情画师的粉丝。

- 配合Aria2下载，可发送到本地或远端路由器。

- 可使用程序语言高度自定义保存文件夹、重命名。

## Chrome 72 的问题

Chrome 72 因为增加了一些限制，导致 Tampermonkey 一些功能失效，导致本工具下载出现异常。

解决办法：

- 升级 Tampermonkey 到最新版本（在 Chrome 上，需要 Tampermonkey 4.8 或更高版本）

- 此外，你也可以切换到本工具的浏览器扩展版，扩展版没有出现这个问题。