## Note:

**This version (script version) will only perform basic maintenance in the future and will not add new features. Please migrate to the Chrome extension as soon as possible.**

Install Chrome extension：[Offline installation tutorial](https://github.com/xuejianxianzun/PixivBatchDownloader/wiki/2.-%E5%AE%89%E8%A3%85#%E7%A6%BB%E7%BA%BF%E5%AE%89%E8%A3%85) 

[Chrome extension Github page](https://github.com/xuejianxianzun/PixivBatchDownloader)

[Chrome extension wiki](https://github.com/xuejianxianzun/PixivBatchDownloader/wiki)

** If you have an extended version installed, you will need to disable this script version. ** Do not let both versions run at the same time.

# Introduction:

This is a Pixiv image downloader written in JavaScript that supports many page types and filters.

Some additional features have been added, such as removing ads, quick collections, Add tag to unclassified work, and viewing pictures.

It is essentially a user script (UserScript) that must be installed using the User Script Manager.

![仙尊 pixiv 下载器 英文截图](https://wx4.sinaimg.cn/large/640defebly1fzm7xsh5vdj20kw0iz0v6.jpg)

### Recommended Use:

Browser: **Chrome** [(download Chrome browser)](https://www.google.com/chrome/)

User Script Manager: **Tampermonkey** [(view in Chrome webstore)](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)

- Please turn off "Ask where to save each file before downloading" in browser settings.

# Install:

You can install it at greasyfork.org:

[https://greasyfork.org/zh-CN/scripts/24252](https://greasyfork.org/zh-CN/scripts/24252)

The downloaded file will be saved in your browser's download directory.

# Browser extension:

This tool has a browser extension. If you want to use a browser extension, you can uninstall the scripted version and install the browser extension.

[GitHub](https://github.com/xuejianxianzun/PixivBatchDownloader/wiki/2.-%E5%AE%89%E8%A3%85#%E7%A6%BB%E7%BA%BF%E5%AE%89%E8%A3%85)

# Supported languages:

Simplified Chinese

Traditional Chinese (thanks [道满](https://zhtw.me/) for translation)

English (machine translation, also used under Korean settings)

日本語 (machine translation)

You can also optimize the translation, thank you very much :)

# Tips:

- Browser's resource limits

When you download picture, this page uses more memory and cpu resources. If you switch to another page and the download page is not activated, Browser will limit the resource usage of the download page, resulting in slow download.

How to solve: Pull out the downloaded tabs individually and become a separate window. This page is the only one in the new window and it is always active. Downloads are not affected, we can use other pages too.

- How to view the animation ( ugoira image ):

The animated picture is suffixed with ugoira. Please install HoneyView software. Open the ugoira file with HoneyView to see the animation effect.

Now you can download the gif image directly for a single animation.

# Available pages and test URL:

- [Index page](https://www.pixiv.net/)

- [ALL works page](https://www.pixiv.net/member_illust.php?mode=medium&illust_id=62751951)

- [ALL works list page](https://www.pixiv.net/member_illust.php?id=544479)

- [ALL tag list page](https://www.pixiv.net/member_illust.php?id=544479&tag=%E6%9D%B1%E6%96%B9)

- [ALL bookmarks page](https://www.pixiv.net/bookmark.php?id=544479)

- [ALL tag search page](https://www.pixiv.net/search.php?s_mode=s_tag&word=saber)

- [Ranking page](https://www.pixiv.net/ranking.php)

- [Area ranking page](https://www.pixiv.net/ranking_area.php?type=state&no=0)

- [Similar works page](https://www.pixiv.net/bookmark_add.php?id=63148723)

- [Discovery page](https://www.pixiv.net/discovery)

- [New work: everyone](https://www.pixiv.net/new_illust.php)

- [New work: following](https://www.pixiv.net/bookmark_new_illust.php)

- [Illustration, comics, cosplay page on pixivision](https://www.pixivision.net/zh/a/3190)

## Library used：

[Viewer.js](https://github.com/fengyuanchen/viewerjs)

[zip.js](https://github.com/gildas-lormeau/zip.js)

[gif.js](https://github.com/jnordberg/gif.js)