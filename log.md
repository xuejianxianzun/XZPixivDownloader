### 4.5.0

在排除类型里增加了“排除已收藏作品”的功能

0   在内页处理            √

1   在内页处理            √

2   列表页-列表页1        √

3   tag页-列表页1         √

4   收藏页-列表页1        √

5   tag搜索页-列表页2     √

6   地区排行榜-列表页3    √

7   其他排行榜-列表页4    √

8   pixivision-不处理     √

9   bookmark_add-在内页处理 √

10  大家的新作品-列表页1  √

11  发现-不处理           √

12	showcase 特辑-不处理  √

13	响应关联作品-不处理    √

### 4.5.2

1. “关注的新作品”（/bookmark_new_illust.php）改版了，列表页规则和tag搜索页一样了。

tag搜索页的模式目前有3个页面在使用：

- tag搜索页
- 发现 discovery
- 关注的新作品

2. “为你推荐”（/recommended.php）合并到发现（/discovery）功能了，但是代码里仍然先保存相关内容。

3. 另外tag搜索页新版刚出的时候是新旧版混合，代码里也对此作了判断。现在看来应该全部换成新版，没有旧版了。但是代码也先保留吧。

### 4.5.5

chrome浏览器进行下载时，会把图片的blob对象在当前标签页打开，不清楚具体原因。给用于下载的a标签添加了 target="_blank"属性解决了。之前没有target属性也可以直接下载的，现在挺奇怪。

### 4.6.0

增加了multiple_down_number参数，可以设置多图作品只下载前几张。默认未限制。

修改后需要刷新页面才会生效，不需要使用时可以改回0。

有时候这是很有用的，有很多的多图作品，只有第一张图是彩色的，后面的图都是黑白的。把multiple_down_number设置为1就可以只下载第一张彩图了。

另外，最近我发现地区排行榜（/ranking_area.php）已经不在首页出现了。

一个已知的问题：

在[每日排行榜](https://www.pixiv.net/ranking.php?mode=daily_r18)，有可能出现最后一张图没抓取完的时候，就提示抓取。这个问题不会影响实际下载的文件数量。

### 4.7.0

增加对pixiv特辑（showcase）的适配；

bug修复。

其他情况:

pixivision在首页原来有4个插画特辑，现在被pixiv自己的特辑（showcase）取代了。在首页只剩下两个推荐特辑的位置，这种类型（推荐）没有做适配。

pixiv特辑（showcase）有[插画](https://www.pixiv.net/showcase/c/illustration/)和[漫画](https://www.pixiv.net/showcase/c/manga/)等分类，本工具只下载插画。漫画的话可以点击进入插画页自行下载。

此外，pixiv特辑滚动到底部时，会加载相似的其他特辑，页面url也会发生改变。本工具下载时会下载当前查看的特辑。

### 4.7.1

修正的问题：

1.大家的新作品里，有按类型分类的页面，之前都是按“综合”处理的，现在可以正确按当前类型获取了。

2.之前无法正常下载关注的新作品的r18分类，现在已经修复。

原本想给排行榜增加手动删除按钮，但是做了之后又去掉了。因为排行榜是分多个部分的，所以获取的时候要通过ajax抓取，在页面上删除没有意义。

### 4.7.2

修复了在tag搜索页里，搜索中断之后，下载时图片网址可能数量异常的问题。

### 4.8.0

- tag搜索页的快速搜索功能可以保持当前搜索模式（全部/普通/R-18）和排序模式

- 优化下载排行榜作品的代码

- 适应pixivision改版

- 增加了对“响应关联作品”的适配

ps0：pixivision改版后，插画页面的头图不是单独的图片了，所以不用单独获取了。

ps1：响应关联作品大部分都比较少，我还没看到超过一页的。目前按作品列表页进行处理，默认下载所有页面。如果有发现分页的话可以告诉我。

ps2：其他排行榜里获取页面时，之前的代码是通过分析dom获得作品数据的。最近发现可以直接获取到json数据了，但是缺少扩展名信息。所以现在只是从json里取得作品页url，其他信息仍然去抓取作品页。

[json示例]https://www.pixiv.net/ranking.php?mode=monthly&content=illust&p=1&format=json

#### 截止2018/2/21，各个排行榜的综合类型的页数（每个排行榜的细分类型的页数和综合不一定相同）：

**普通的有7种排行榜**

- (今日：10页)[https://www.pixiv.net/ranking.php?mode=daily]

- (本周：10页)[https://www.pixiv.net/ranking.php?mode=weekly]

- (本月：10页)[https://www.pixiv.net/ranking.php?mode=monthly]

- (新人：6页)[https://www.pixiv.net/ranking.php?mode=rookie]

- (原创：6页)[https://www.pixiv.net/ranking.php?mode=original]

- (受男性欢迎：10页)[https://www.pixiv.net/ranking.php?mode=male]

- (受女性欢迎：10页)[https://www.pixiv.net/ranking.php?mode=female]

**R-18有4种排行榜**

- (今日r18：2页)[https://www.pixiv.net/ranking.php?mode=daily_r18]

- (本周r18:2页)[https://www.pixiv.net/ranking.php?mode=weekly_r18]

- (受男性欢迎r18：6页)[https://www.pixiv.net/ranking.php?mode=male_r18]

- (受女性欢迎r18：6页)[https://www.pixiv.net/ranking.php?mode=female_r18]

**R-18G只有一种排行榜**

- (r18g：1页)[https://www.pixiv.net/ranking.php?mode=r18g]

### 5.0.0

bug修复和代码优化。

ps1：模板字符串虽然好用，但如果原来的语句里的运算步骤复杂的话，这部分还是用加号拼接比较好。用模板字符串层层嵌套，连在一起之后使代码变得很难读。而且编辑器对于模板字符串里面代码的着色也很差。

ps2：箭头函数也建议只对简单函数使用。如果要处理动态this和使用arguments的话，要使用传统函数。