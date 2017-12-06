// ==UserScript==
// @name        仙尊Pixiv图片下载器
// @name:ja     XZ Pixiv Downloader
// @name:en     XZ Pixiv Downloader
// @namespace   http://saber.love/?p=3102
// @version     4.3.0
// @description 在多种情景下批量下载pixiv上的图片。可下载单图、多图、动图的原图；自动翻页下载所有排行榜/收藏夹/画师作品；下载pixivision特辑；设定各种筛选条件、文件命名规则、复制图片url；屏蔽广告；非会员查看热门作品、快速搜索。根据你的p站语言设置，可自动切换到中、日、英三种语言。github:https://github.com/xuejiansaber/XZPixivDownloader
// @description:ja Pixivピクチャバッチダウンローダ
// @description:en Pixiv picture batch downloader
// @author      xuejianxianzun 雪见仙尊
// @include     *://www.pixiv.net/*
// @include     *://www.pixivision.net/*
// @license     GNU General Public License version 3
// @icon        https://www.pixiv.net/favicon.ico
// @grant       GM_xmlhttpRequest
// @connect     i.pximg.net
// @connect     i1.pixiv.net
// @connect     i2.pixiv.net
// @connect     i3.pixiv.net
// @connect     i4.pixiv.net
// @connect     i5.pixiv.net
// @connect     imgaz.pixiv.net
// @run-at      document-end
// ==/UserScript==
/*
 *@author:  xuejianxianzun 雪见仙尊
 *@E-mail:  xuejianxianzun@gmail.com
 *@Blog:    https://saber.love/
 *@QQ群: 499873152
 */

var loc_url = window.location.href, //当前页面的url
    quiet_download = false, // 是否静默下载，即下载时不弹窗提醒
    page_type, //区分页面类型
    img_info = [], //储存图片信息，其中可能会有空值，如 undefined 和 ""。如果改成json格式的话使用就更方便了
    illust_url_list = [], //储存作品列表url的数组
    ajax_for_illust_threads = 5, //抓取页面时的并发连接数
    ajax_for_illust_delay = 100, //抓取页面的并发请求每个间隔多少毫秒
    ajax_threads_finished = 0, //统计有几个并发线程完成所有请求。统计的是并发数（ajax_for_illust_threads）而非请求数
    ajax_for_list_is_end = true, //抓取列表页的任务是否执行完毕
    ajax_for_illust_is_end = true, //抓取内容页的任务是否执行完毕
    test_suffix_finished = true, //检查图片后缀名正确性的函数是否执行完毕
    test_suffix_no = 0, //检查图片后缀名函数的计数
    now_tips = "", //输出顶部提示
    base_url, //列表页url规则
    startpage_no, //列表页开始抓取时的页码
    listPage_finished = 0, //记录一共抓取了多少列表页
    listPage_finished2 = 0, //记录tag搜索页本次任务已经抓取了多少页
    want_page, //要抓取几页
    quick = false, // 快速下载当前页面，这个只在作品页内直接下载时使用，和quiet_download有细微区别
    want_favorite_number = 0, //tag搜索页要求的最低收藏数
    interrupt = false, //是否中断正在进行的任务，目前仅在tag搜索页使用
    allow_work = true, //当前是否允许展开工作（如果有未完成的任务则会变为false
    notNeed_tag = [], //要排除的tag的列表
    notNeed_tag_tip, //输入tag的文本框的默认提示
    need_tag = [], //必须包含的tag的列表
    need_tag_tip, //输入tag的文本框的默认提示
    notdown_type = "", //设置不要下载的作品类型
    notdown_type_checked = false, //是否已经检查了不要下载的作品类型。大部分时候在获取列表页时处理，但有时需要在获取内容页时处理
    is_set_filterWH = false, //是否设置了筛选宽高
    filterWH = {
        and_or: "&",
        width: 0,
        height: 0
    }, //宽高条件
    part_number, //保存不同排行榜的列表数量
    requset_number, //下载添加收藏后的相似作品时的请求数量
    max_num = 0, //最多允许获取多少数量
    tag_search_is_new, // tag搜索页是否是新版
    tag_search_lv1_selector, // tag搜索页，作品列表的父元素的选择器
    tag_search_lv2_selector, // tag搜索页，作品列表自身的选择器
    tag_search_list_selector, // tag搜索页，直接选择作品的选择器
    tag_search_multiple_selector, // tag搜索页，多图作品的选择器
    tag_search_gif_selector, // tag搜索页，动图作品的选择器
    tag_search_new_html, // tag搜索页作品的html
    xz_multiple_html, // tag搜索页作品的html中的多图标识
    xz_gif_html, // tag搜索页作品的html中的动图标识
    tag_search_new_html_one_page = "", // 拼接每一页里所有列表的html
    tag_search_temp_result, // 临时储存tag搜索每一页的结果
    fileNameRule = "",
    fileName_length = 200, // 此为预设值，如果保存路径过长就会出问题
    safe_fileName_rule = new RegExp(/\\|\/|:|\?|"|<|>|\*|\|/g), // 安全的文件名
    download_thread_deauflt = 5, // 同时下载的线程数
    donwloadBar_list, // 下载队列的dom元素
    download_a, // 下载用的a标签
    download_started = false, // 下载是否已经开始
    downloaded = 0, // 已下载的文件
    download_stop = false, // 是否停止下载
    download_stop_num = 0, // 已停止的线程数
    download_pause = false, // 是否暂停下载
    download_pause_num = 0, // 已暂停的线程数
    xz_btns_ctr,
    xz_btns_con;

// 多语言配置
var lang_type; // 语言类型
var user_lang = $(".languages li.current").text().replace(/\n| /g, ""); //从底部获取用户选择的语言
if (user_lang === "简体中文" || user_lang === "繁體中文") { // 设置语言为中文
    lang_type = 0;
} else if (user_lang === "日本語") { // 设置语言为日语
    lang_type = 1;
} else { // 设置语言为英语
    lang_type = 2;
}

// 在pixivision重设语言类型
if (loc_url.indexOf("https://www.pixivision.net") > -1 && loc_url.indexOf("/a/") > -1) {
    var pixivision_lang = loc_url.split("/")[3];
    if (pixivision_lang === "zh" || pixivision_lang === "zh-tw") { // 设置语言为中文
        lang_type = 0;
    } else if (pixivision_lang === "ja") { // 设置语言为日语
        lang_type = 1;
    } else { // 设置语言为英语
        lang_type = 2;
    }
}

// 日文和英文目前是机翻，欢迎了解这些语言的人对翻译进行完善
var xz_lang = { // 储存语言配置。在属性名前面加上下划线，和文本内容做出区别。{}表示需要进行替换的部分
    "_过滤作品类型的按钮": [
        "排除指定类型的作品",
        "タイプでフィルタリングする",
        "Filter by works type"
    ],
    "_过滤作品类型的按钮_title": [
        "在下载前，您可以设置想要排除的作品类型。",
        "ダウンロードする前に、除外するタイプを設定することができます。",
        "Before downloading, you can set the type you want to exclude."
    ],
    "_过滤作品类型的弹出框文字": [
        "请输入数字来设置下载时要排除的作品类型。\n如需多选，将多个数字连写即可\n如果什么都不输入并按确定，那么将不排除任何作品\n1: 排除单图\n2: 排除多图\n3: 排除动图",
        "ダウンロード時に除外するタイプを設定する番号を入力してください。\nさまざまなオプションが必要な場合は、それを連続して入力することができます。\n1.単一の画像の作品を除外する\n2.複数の画像の作品を除外する\n3.うごイラの作品を除外する",
        "Please enter a number to set the type of you want to excluded when downloading.\nIf you need multiple choice, you can enter continuously.\n1: one-images works\n2.multiple-images works\n3.animat works"
    ],
    "_排除tag的按钮文字": [
        "设置作品不能包含的tag",
        "作品に含まれていないタグを設定する",
        "Set the tag that the work can not contain"
    ],
    "_排除tag的按钮_title": [
        "在下载前，您可以设置想要排除的tag",
        "ダウンロードする前に、除外するタグを設定できます",
        "Before downloading, you can set the tag you want to exclude"
    ],
    "_排除tag的提示文字": [
        "您可在下载前设置要排除的tag，这样在下载时将不会下载含有这些tag的作品。区分大小写；如需排除多个tag，请使用英文逗号分隔。请注意要排除的tag的优先级大于要包含的tag的优先级。",
        "ダウンロードする前に、除外するタグを設定できます。ケースセンシティブ；複数のタグを設定する必要がある場合は、\",\"を分けて使用できます。除外されたタグは、含まれているタグよりも優先されます",
        "Before downloading, you can set the tag you want to exclude. Case sensitive; If you need to set multiple tags, you can use \",\" separated. The excluded tag takes precedence over the included tag"
    ],
    "_设置了排除tag之后的提示": [
        "本次任务设置了排除的tag:",
        "このタスクはタグを除外します：",
        "This task excludes tag:"
    ],
    "_必须tag的按钮文字": [
        "设置作品必须包含的tag",
        "作品に含める必要があるタグを設定する",
        "Set the tag that the work must contain"
    ],
    "_必须tag的按钮_title": [
        "在下载前，您可以设置必须包含的tag。",
        "ダウンロードする前に、含まれなければならないタグを設定することができます",
        "Before downloading, you can set the tag that must be included"
    ],
    "_必须tag的提示文字": [
        "您可在下载前设置作品里必须包含的tag，区分大小写；如需包含多个tag，请使用英文逗号分隔。",
        "ダウンロードする前に、含まれなければならないタグを設定することができます。ケースセンシティブ；複数のタグを設定する必要がある場合は、\",\"を分けて使用できます。",
        "Before downloading, you can set the tag that must be included. Case sensitive; If you need to set multiple tags, you can use \",\" separated. "
    ],
    "_设置了必须tag之后的提示": [
        "本次任务设置了必须的tag:",
        "このタスクは、必要なタグを設定します:",
        "This task set the necessary tag"
    ],
    "_筛选宽高的按钮文字": [
        "设置宽高条件",
        "幅と高さの条件を設定する",
        "Set the width and height conditions"
    ],
    "_筛选宽高的按钮_title": [
        "在下载前，您可以设置要下载的图片的宽高条件。",
        "ダウンロードする前に、ダウンロードする写真の幅と高さの条件を設定できます。",
        "Before downloading, you can set the width and height conditions of the pictures you want to download."
    ],
    "_筛选宽高的提示文字": [
        "请输入最小宽度和最小高度，在抓取图片url时会排除不符合要求的图片\n用or符号 \"|\" 分割表示满足任意一个条件即可\n用and符号 \"&\" 分割表示需要同时满足两个条件",
        "最小幅と最小高さを入力してください\n\"|\"を使用すると、1つの条件だけが必要であることを意味し；\n\"&\"を使用すると、2つの条件を同時に満たす必要があることを意味します。",
        "Please enter the minimum width and minimum height.\nUsing \"|\" means that only one condition is required; \nusing \"&\" means that two conditions need to be satisfied at the same time."
    ],
    "_本次输入的数值无效": [
        "本次输入的数值无效",
        "無効な入力",
        "Invalid input"
    ],
    "_设置成功": [
        "设置成功",
        "セットアップが正常に完了しました",
        "Set up successfully"
    ],
    "_设置了筛选宽高之后的提示文字p1": [
        "本次任务设置了过滤宽高条件:宽度>=",
        "この作業では、フィルターの幅と高さの条件を設定します。幅≥",
        "This task sets the filter width and height conditions. Width ≥"
    ],
    "_或者": [
        " 或者 ",
        " または ",
        " or "
    ],
    "_并且": [
        " 并且 ",
        " そして ",
        " and "
    ],
    "_高度设置": [
        "高度>=",
        "高さ≥",
        "height ≥"
    ],
    "_本次任务已全部完成": [
        "本次任务已全部完成。",
        "このタスクは完了しました。",
        "This task has been completed."
    ],
    "_当前任务尚未完成1": [
        "当前任务尚未完成，请等到提示完成之后再设置新的任务。",
        "現在のタスクはまだ完了していません。お待ちください。",
        "The current task has not yet completed, please wait."
    ],
    "_check_want_page_rule1_arg1": [
        "如果要下载全部作品，请保持默认值。\n如果需要设置下载的作品数，请输入从1开始的数字，1为仅下载当前作品。",
        "すべての作品をダウンロードしたい場合は、デフォルト値のままにしてください。\nダウンロード数を設定する必要がある場合は、1から始まる番号を入力します。 現在の作品には1の番号が付けられています。",
        "If you want to download all the work, please leave the default value.\nIf you need to set the number of downloads, enter a number starting at 1. The current works are numbered 1."
    ],
    "_check_want_page_rule1_arg2": [
        "参数不合法，本次操作已取消。<br>",
        "パラメータは有効ではありません。この操作はキャンセルされました。<br>",
        "Parameter is not legal, this operation has been canceled.<br>"
    ],
    "_check_want_page_rule1_arg3": [
        "任务开始<br>本次任务条件: 从本页开始下载-num-个作品",
        "タスクが開始されます。このタスク条件：このページから-num-枚の作品をダウンロード。",
        "Task starts. This task condition: Download -num- works from this page."
    ],
    "_check_want_page_rule1_arg4": [
        "任务开始<br>本次任务条件: 向下获取所有作品",
        "タスクが開始されます。このタスク条件：このページからすべての作品をダウンロードする。",
        "Task starts. This task condition: download all the work from this page."
    ],
    "_check_want_page_rule1_arg5": [
        "如果不限制下载的页数，请不要修改此默认值。\n如果要限制下载的页数，请输入从1开始的数字，1为仅下载本页。",
        "ダウンロードしたページ数を制限しない場合は、デフォルト値のままにしておきます。\n ダウンロードするページ数を設定する場合は、1から始まる番号を入力します。 現在のページは1です。",
        "If you do not limit the number of pages downloaded, leave the default value.\nIf you want to set the number of pages to download, enter a number starting at 1. This page is 1."
    ],
    "_check_want_page_rule1_arg6": [
        "任务开始<br>本次任务条件: 从本页开始下载-num-页",
        "タスクが開始されます。このタスク条件：現在のページから-num-ページ",
        "Task starts. This task condition: download -num- pages from the current page"
    ],
    "_check_want_page_rule1_arg7": [
        "任务开始<br>本次任务条件: 下载所有页面",
        "タスクが開始されます。このタスク条件：すべてのページをダウンロード",
        "Task starts. This task condition: download all pages"
    ],
    "_请输入最低收藏数和要抓取的页数": [
        "请输入最低收藏数和要抓取的页数，用英文逗号分开。\n类似于下面的形式: \n1000,100",
        "お気に入りの最小数とクロールするページ数を，\",\"で区切って入力してください。\n例えば：\n1000,100",
        "Please enter the minimum number of favorites, and the number of pages to be crawled, separated by \",\".\nE.g:\n1000,100"
    ],
    "_参数不合法1": [
        "参数不合法，请稍后重试。",
        "パラメータが合法ではありません。後でやり直してください。",
        "Parameter is not legal, please try again later."
    ],
    "_tag搜索任务开始": [
        "任务开始\n本次任务条件: 收藏数不低于{}，向下抓取{}页",
        "タスクが開始されます。\nこのタスク条件：ブックマークの数は{}ページ以上で、{}ページがクロールされます。",
        "Task starts. \nThis task condition: the number of bookmarks is not less than {}, {} pages down to crawl."
    ],
    "_want_page_弹出框文字_page_type10": [
        "你想要下载多少页？请输入数字。\r\n当前模式下，列表页的页数最多只有",
        "ダウンロードしたいページ数を入力してください。 \r\n最大値：",
        "Please enter the number of pages you want to download.\r\n The maximum value is "
    ],
    "_输入超过了最大值": [
        "你输入的数字超过了最大值",
        "入力した番号が最大値を超えています",
        "The number you entered exceeds the maximum"
    ],
    "_任务开始1": [
        "任务开始\n本次任务条件: 从本页开始下载{}页",
        "タスクが開始されます。\nこのタスク条件：このページから{}ページをダウンロードする",
        "Task starts. \nThis task condition: download {} pages from this page"
    ],
    "_check_notdown_type_result1_弹窗": [
        "由于您排除了所有作品类型，本次任务已取消。",
        "すべての種類の作業を除外したため、タスクはキャンセルされました。",
        "Because you excluded all types of work, the task was canceled."
    ],
    "_check_notdown_type_result1_html": [
        "排除作品类型的设置有误，任务取消!",
        "作業タイプの除外にエラー設定がありました。 タスクがキャンセルされました。",
        "There was an error setting for the exclusion of the work type. Task canceled."
    ],
    "_check_notdown_type_result2_弹窗": [
        "由于作品类型的设置有误，本次任务已取消。",
        "除外タイプを設定する際にエラーが発生しました。 タスクがキャンセルされました。",
        "There was an error setting for the exclusion of the work type. Task canceled."
    ],
    "_check_notdown_type_result3_html": [
        "本次任务设置了排除作品类型:",
        "この作業では、これらのタイプの作品レーションは除外されます：",
        "This task excludes these types of works:"
    ],
    "_单图": [
        "单图 ",
        "1枚の作品",
        "one images works "
    ],
    "_多图": [
        "多图 ",
        "2枚以上の作品",
        "multiple images works "
    ],
    "_动图": [
        "动图 ",
        "うごイラ",
        "GIF works "
    ],
    "_tag搜索页已抓取多少页": [
        "已抓取本次任务第{}/{}页，当前加载到第{}页",
        "{}/{}ページをクロールしています。 現在のページ番号は{}ページです",
        "Has been crawling {} / {} pages. The current page number is page {}"
    ],
    "_tag搜索页任务完成1": [
        "本次任务完成。当前有{}张作品。",
        "この作業は完了です。 今は{}枚の作品があります。",
        "This task is completed. There are now {} works."
    ],
    "_tag搜索页任务完成2": [
        "已抓取本tag的所有页面，本次任务完成。当前有{}张作品。",
        "この作業は完了です。 今は{}枚の作品があります。",
        "This task is completed. There are now {} works."
    ],
    "_tag搜索页中断": [
        "当前任务已中断!当前有{}张作品。",
        "現在のタスクが中断されました。今は{}枚の作品があります。",
        "The current task has been interrupted. There are now {} works."
    ],
    "_排行榜进度": [
        "已抓取本页面第{}部分",
        "このページの第{}部がクロールされました",
        "Part {} of this page has been crawled"
    ],
    "_排行榜任务完成": [
        "本页面抓取完成。当前有{}张作品，开始获取作品信息。",
        "このページはクロールされ、{}個の作品があります。 詳細は作品を入手し始める。",
        "This page is crawled and now has {} works. Start getting the works for more information."
    ],
    "_列表页获取完成2": [
        "列表页获取完成。当前有{}张作品，开始获取作品信息。",
        "リストページがクロールされます、{}個の作品があります。 詳細は作品を入手し始める。",
        "The list page gets done. Now has {} works. Start getting the works for more information."
    ],
    "_列表页抓取进度": [
        "已抓取列表页{}个页面",
        "{}のリストページを取得しました",
        "Has acquired {} list pages"
    ],
    "_列表页抓取完成": [
        "列表页面抓取完成，开始获取图片网址",
        "リストページがクロールされ、画像URLの取得が開始されます",
        "The list page is crawled and starts to get the image URL"
    ],
    "_列表页抓取结果为零": [
        "抓取完毕，但没有找到符合筛选条件的作品。",
        "クロールは終了しましたが、フィルタ条件に一致する作品が見つかりませんでした。",
        "Crawl finished but did not find works that match the filter criteria."
    ],
    "_排行榜列表页抓取遇到404": [
        "本页面抓取完成。当前有{}张作品，开始获取作品信息。",
        "このページはクロールされます、{}個の作品があります。 詳細は作品を入手し始める。",
        "This page is crawled. Now has {} works. Start getting the works for more information."
    ],
    "_当前任务尚未完成2": [
        "当前任务尚未完成，请等待完成后再下载。",
        "現在のタスクはまだ完了していません",
        "The current task has not yet been completed"
    ],
    "_列表抓取完成开始获取作品页": [
        "当前列表中有{}张作品，开始获取作品信息",
        "{}個の作品があります。 詳細は作品を入手し始める。",
        "Now has {} works. Start getting the works for more information."
    ],
    "_开始获取作品页面": [
        "开始获取作品页面",
        "作品ページの取得を開始する",
        "Start getting the works page"
    ],
    "_无权访问1": [
        "无权访问{}，抓取中断。",
        "アクセス{}、中断はありません。",
        "No access {}, interruption."
    ],
    "_无权访问2": [
        "无权访问{}，跳过该作品。",
        "アクセス{}、無視する。",
        "No access {}, skip."
    ],
    "_作品页状态码0": [
        "请求的url不可访问",
        "要求されたURLにアクセスできません",
        "The requested url is not accessible"
    ],
    "_作品页状态码400": [
        "该作品已被删除",
        "作品は削除されました",
        "The work has been deleted"
    ],
    "_作品页状态码403": [
        "无权访问请求的url 403",
        "リクエストされたURLにアクセスできない 403",
        "Have no access to the requested url 403"
    ],
    "_作品页状态码404": [
        "未找到该页面 404",
        "404 not found",
        "404 not found"
    ],
    "_抓取图片网址的数量": [
        "已获取{}个图片网址",
        "{}つの画像URLを取得",
        "Get {} image URLs"
    ],
    "_抓取图片网址遇到中断": [
        "当前任务已中断!",
        "現在のタスクが中断されました。",
        "The current task has been interrupted."
    ],
    "_收起下载按钮": [
        "收起下载按钮",
        "ダウンロードボタンを非表示にする",
        ""
    ],
    "_展开下载按钮": [
        "展开下载按钮",
        "ダウンロードボタンを表示",
        ""
    ],
    "_展开收起下载按钮_title": [
        "展开/收起下载按钮",
        "ダウンロードボタンを表示/飞镖室",
        "Show / hide download button"
    ],
    "_关闭": [
        "关闭",
        "クローズド",
        "close"
    ],
    "_图片url列表": [
        "图片url列表",
        "画像URLリスト",
        "Image url list"
    ],
    "_复制图片url": [
        "复制图片url",
        "画像URLをコピーする",
        "Copy the image url"
    ],
    "_已复制到剪贴板": [
        "已复制到剪贴板，可直接粘贴",
        "クリップボードにコピーされました",
        "Has been copied to the clipboard"
    ],
    "_下载设置": [
        "下载设置",
        "設定をダウンロードする",
        "Download settings"
    ],
    "_隐藏": [
        "隐藏",
        "隠された",
        "hide"
    ],
    "_设置命名规则": [
        "共抓取到{}个图片，请设置文件命名规则：",
        "合計{}枚の画像を取得し、ファイルの命名規則を設定してください：",
        "Grab a total of {} pictures, please set the file naming rules: "
    ],
    "_查看可用的标记": [
        "查看可用的标记",
        "利用可能なタグを見る",
        "View available tags"
    ],
    "_可用标记1": [
        "作品id，包含序号，如",
        "作品ID（シリアル番号を含む）、例えば ",
        "works id, including serial number, for example "
    ],
    "_可用标记2": [
        "作品标题",
        "作品のタイトル",
        "works title"
    ],
    "_可用标记3": [
        "作品的tag列表",
        "作品のtags",
        "Tags of works"
    ],
    "_可用标记4": [
        "画师的名字",
        "アーティスト名",
        "Artist name"
    ],
    "_可用标记6": [
        "画师的id",
        "アーティストID",
        "Artist id"
    ],
    "_可用标记7": [
        "宽度和高度",
        "幅と高さ",
        "width and height"
    ],
    "_可用标记8": [
        "bookmark-count，作品的收藏数，仅在tag搜索页使用。把它放在最前面就可以让下载后的文件按收藏数排序。",
        "bookmark-count，作品のコレクション数（tag検索ページ使用）のコレクション数は",
        "bookmark-count, can only be used on tag search page"
    ],
    "_可用标记5": [
        "你可以使用多个标记；并可以在不同标记之间添加分割用的字符。示例：{id}_{userid}_{px}<br>* 在pixivision上，只有id标记会生效",
        "複数のタグを使用することができ；異なるタグ間に別の文字を追加することができます。例：{id}_{userid}_{px}<br>* pixivisionでは、idのみが利用可能です",
        "You can use multiple tags, and you can add a separate character between different tags. Example: {id}_{userid}_{px}<br>* On pixivision, only id is available"
    ],
    "_下载按钮1": [
        "开始下载",
        "start download",
        "start download"
    ],
    "_下载按钮2": [
        "暂停下载",
        "puse download",
        "puse download"
    ],
    "_下载按钮3": [
        "停止下载",
        "stop download",
        "stop download"
    ],
    "_下载按钮4": [
        "复制url",
        "copy urls",
        "copy urls"
    ],
    "_当前状态": [
        "当前状态 ",
        "現在の状態 ",
        "Now state "
    ],
    "_未开始下载": [
        "未开始下载",
        "まだダウンロードを開始していません",
        "Not yet started downloading"
    ],
    "_下载进度：": [
        "下载进度：",
        "ダウンロードの進捗状況：",
        "Download progress: "
    ],
    "_下载线程：": [
        "下载线程：",
        "スレッド：",
        "Thread: "
    ],
    "_查看下载说明": [
        "查看下载说明",
        "指示の表示",
        "View instructions"
    ],
    "_下载说明": [
        "下载的文件保存在浏览器的下载目录里。<br>本脚本不支持自动创建文件夹。<br>你可能会下载到.zip格式的文件，这是动态图的源文件。<br>请不要在浏览器的下载选项里选中\"总是询问每个文件的保存位置\"。<br>如果浏览器询问\"是否允许下载多个文件\"，请选择\"允许\"。<br>如果浏览器询问\"保存\"文件还是\"打开\"文件，请选择\"保存\"。<br>如果浏览器提示文件名过长，请将浏览器的下载文件夹改为名字较短的文件夹，之后重试。<br>如果作品标题或tag里含有不能做文件名的字符，会被替换成下划线_。<br>任务暂停成功后，你可以使用\"开始下载\"按钮继续下载;<br>任务下载完毕或停止后，你可以使用\"开始下载\"按钮重新下载。<br>如果任务下载缓慢或失败，可使用\"复制url\"功能，之后尝试使用其他下载软件进行下载。",
        "ダウンロードしたファイルは、ブラウザのダウンロードディレクトリに保存されます。<br>このスクリプトは、フォルダの自動作成をサポートしていません。<br>ブラウザが\"複数のファイルをダウンロードできるようにするかどうか\"と尋ねる場合は、\"許可\"を選択します。<br>Chromeをお勧めします。",
        "The downloaded file is saved in the browser's download directory.<br>This script does not support the automatic creation of folders.<br>If the browser asks \"whether to allow multiple files to be downloaded \", select \"Allow \".<br>Chrome is recommended."
    ],
    "_正在下载中": [
        "正在下载中",
        "ダウンロード",
        "downloading"
    ],
    "_正在暂停": [
        "任务正在暂停中，但当前位于下载线程中的文件会继续下载",
        "後でダウンロードが一時停止されます。",
        "The download will be paused later."
    ],
    "_正在停止": [
        "任务正在停止中，但当前位于下载线程中的文件会继续下载",
        "ダウンロードは後で中止されます。",
        "The download will stop later."
    ],
    "_下载已停止": [
        "下载已停止",
        "ダウンロードが停止しました",
        "Download stopped"
    ],
    "_显示隐藏下载面板": [
        "显示/隐藏下载面板",
        "ダウンロードパネルの表示/非表示",
        "Show / hide the download panel"
    ],
    "_下载完毕": [
        "下载完毕!",
        "ダウンロードが完了しました",
        "Download finished"
    ],
    "_已暂停": [
        "下载已暂停",
        "ダウンロードは一時停止中です",
        "Download is paused"
    ],
    "_已停止": [
        "下载已停止",
        "ダウンロードが停止しました",
        "Download stopped"
    ],
    "_已下载": [
        "已下载",
        "downloaded",
        "downloaded"
    ],
    "_获取图片网址完毕": [
        "获取完毕，共{}个图片地址",
        "合計{}個の画像URLを取得する",
        "Get a total of {} image url"
    ],
    "_没有符合条件的作品": [
        "没有符合条件的作品!任务结束。",
        "基準を満たす作品はありません！タスクは終了します。",
        "There are no works that meet the criteria! The task ends."
    ],
    "_没有符合条件的作品弹窗": [
        "抓取完毕!没有符合条件的作品!",
        "クロールが終了しました！基準を満たす作品はありません",
        "Crawl finished! There are no works that meet the criteria! "
    ],
    "_抓取完毕": [
        "抓取完毕!",
        "クロールが終了しました！",
        "Crawl finished!"
    ],
    "_快速下载本页": [
        "快速下载本页作品",
        "この作品をすばやくダウンロードする",
        "Download this work quickly"
    ],
    "_从本页开始下载": [
        "从本页开始下载作品",
        "このページからダウンロードできます",
        "Download works from this page"
    ],
    "_下载该画师的作品": [
        "下载该画师的作品",
        "アーティストの作品をダウンロードする",
        "Download the artist's work"
    ],
    "_下载该tag中的作品": [
        "下载该tag中的作品",
        "タグで作品をダウンロードする",
        "Download the work in the tag"
    ],
    "_下载书签": [
        "下载书签中的作品",
        "このブックマークでこの作品をダウンロード",
        "Download the works in this bookmark"
    ],
    "_默认下载多页": [
        ", 如有多页，默认会下载全部。",
        "複数のページがある場合、デフォルトがダウンロードされます。",
        ", If there are multiple pages, the default will be downloaded."
    ],
    "_调整完毕": [
        "调整完毕，当前有{}张作品。",
        "調整が完了し、今、{}の作品があります。",
        "The adjustment is complete and now has {} works."
    ],
    "_按收藏数筛选": [
        "按收藏数筛选",
        "お気に入りからのフィルター",
        "Filter by Favorites"
    ],
    "_按收藏数筛选_title": [
        "按收藏数筛选当前tag里的作品。如果多次筛选，页码会一直累加。",
        "現在のタグのエントリ数でフィルタリングします。多次过滤时，页码增加。",
        "Filter by the number of entries in the current tag. If you filter multiple times, the page number will increase."
    ],
    "_在结果中筛选": [
        "在结果中筛选",
        "結果のフィルタリング",
        "Filter in results"
    ],
    "_在结果中筛选_title": [
        "如果本页筛选后作品太多，可以提高收藏数的要求，在结果中筛选。达不到要求的会被隐藏而不是删除。所以你可以反复进行筛选。被隐藏的项目不会被下载。",
        "あなたは何度も選別することができて、要求の作品が隠されて、それからダウンロードされません。",
        "You can make multiple screening , fail to meet the required works will be hidden, and will not be downloaded."
    ],
    "_在结果中筛选弹窗": [
        "将在当前作品列表中再次过滤，请输入要求的最低收藏数: ",
        "将在当前作品列表中再次筛选，请输入要求的最低收藏数",
        "Will be filtered again in the current list of works. Please enter the required minimum number of favorites:"
    ],
    "_下载当前作品": [
        "下载当前作品",
        "現在の作品をダウンロードする",
        "Download the current work"
    ],
    "_下载当前作品_title": [
        "下载当前列表里的所有作品",
        "現在のリストにあるすべての作品をダウンロードする",
        "Download all the works in the current list"
    ],
    "_中断当前任务": [
        "中断当前任务",
        "現在のタスクを中断する",
        "Interrupt the current task"
    ],
    "_中断当前任务_title": [
        "筛选时中断之后可以继续执行。",
        "ふるい分け作品で中断され、その後引き続き実行可能です。",
        "In the screening works when the break, then you can continue to perform."
    ],
    "_当前任务已中断": [
        "当前任务已中断!",
        "現在のタスクが中断されました",
        "The current task has been interrupted"
    ],
    "_下载时排除tag": [
        "下载时排除tag",
        "ダウンロード時にタグを除外する",
        "Exclude tags when downloading"
    ],
    "_清除多图作品": [
        "清除多图作品",
        "複数の図面を削除する",
        "Remove multi-drawing works"
    ],
    "_清除多图作品_title": [
        "如果不需要可以清除多图作品",
        "必要がない場合は、複数のグラフを削除することができます",
        "If you do not need it, you can delete multiple graphs"
    ],
    "_清除动图作品": [
        "清除动图作品",
        "うごイラ作品を削除する",
        "Remove animat work"
    ],
    "_清除动图作品_title": [
        "如果不需要可以清除动图作品",
        "必要がない場合は、うごイラを削除することができます",
        "If you do not need it, you can delete the animat work"
    ],
    "_手动删除作品": [
        "手动删除作品",
        "マニュアル削除作品",
        "Manually delete the work"
    ],
    "_手动删除作品_title": [
        "可以在下载前手动删除不需要的作品",
        "ダウンロードする前に不要な作品を手動で削除することができます",
        "You can manually delete unwanted work before downloading"
    ],
    "_退出手动删除": [
        "退出手动删除",
        "削除モードを終了する",
        "Exit manually delete"
    ],
    "_清空作品列表": [
        "清空作品列表",
        "作品のリストを空にする",
        "Empty the list of works"
    ],
    "_清空作品列表_title": [
        "如果网页内容过多，可能导致页面崩溃。如有需要可以清除当前的作品列表。",
        "",
        ""
    ],
    "_下载本页作品": [
        "下载本页作品",
        "このページをダウンロードする",
        "Download this page works"
    ],
    "_下载本页作品_title": [
        "下载本页列表中的所有作品",
        "このページをダウンロードする",
        "Download this page works"
    ],
    "_已清除多图作品": [
        "已清除多图作品",
        "マルチマップ作品を削除しました",
        "Has deleted the multi-map works"
    ],
    "_已清除动图作品": [
        "已清除动图作品",
        "うごイラが削除されました",
        "Dynamic work has been removed"
    ],
    "_下载本排行榜作品": [
        "下载本排行榜作品",
        "このリストの作品をダウンロードする",
        "Download the works in this list"
    ],
    "_下载本排行榜作品_title": [
        "下载本排行榜的所有作品，包括现在尚未加载出来的。",
        "このリストの作品をダウンロードする、まだロードされていないものを含む",
        "Download all of the works in this list, including those that are not yet loaded."
    ],
    "_下载该页面的图片": [
        "下载该页面的图片",
        "ページの写真をダウンロードする",
        "Download the picture of the page"
    ],
    "_下载推荐图片": [
        "下载推荐图片",
        "おすすめ作品をダウンロードする",
        "Download recommended works"
    ],
    "_下载推荐图片_title": [
        "下载为你推荐的图片",
        "あなたのお勧め作品をダウンロードする",
        "Download for your recommended works"
    ],
    "_下载相似图片": [
        "下载相似图片",
        "類似の作品をダウンロードする",
        "Download similar works"
    ],
    "_要获取的作品个数": [
        "你想要获取多少个作品？（注意是个数而不是页数）\r\n请输入数字，最大值为",
        "いくつの作品をダウンロードしたいですか？ （ページ数ではなく作品数に注意してください）\r\n数値を入力してください。最大値は",
        "How many works do you want to download? (Note that the number of works rather than the number of pages)\r\nPlease enter a number, max "
    ],
    "_超过最大值": [
        "你输入的数字超过了最大值",
        "入力した番号が最大値を超えています",
        "The number you entered exceeds the maximum"
    ],
    "_下载大家的新作品": [
        "下载大家的新作品",
        "みんなの新作をダウンロードする",
        "Download everyone's new work"
    ],
    "_屏蔽设定": [
        "屏蔽設定",
        "ミュート設定",
        "Mute settings"
    ],
    "_举报": [
        "举报",
        "報告",
        "Report"
    ]
};

// xianzun_lang_translate 翻译
function xzlt(name, vals) {
    var content = xz_lang[name][lang_type];
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            content = content.replace('{}', arguments[i]);
        }
    }
    return content;
}

// 去除广告
var block_ad_css = "<style>section.ad,[name=header],.ads_anchor,.ad-bigbanner,.ad-footer,._premium-lead-tag-search-bar,#header-banner.ad,.popular-introduction-overlay,.ad-bigbanner,.adsbygoogle,.ui-fixed-container aside,.ad-multiple_illust_viewer{display: none!important;z-index: -999!important;width: 0!important;height: 0!important;opacity: 0!important;}</style>";
document.body.insertAdjacentHTML("beforeend", block_ad_css);

// DOMParser，将字符串形式的html代码解析为DOM结构
! function(a) {
    var b = a.prototype,
        c = b.parseFromString;
    try {
        if ((new a).parseFromString("", "text/html")) return;
    } catch (d) {}
    b.parseFromString = function(a, b) {
        if (/^\s*text\/html\s*(?:;|$)/i.test(b)) {
            var d = document.implementation.createHTMLDocument("");
            return a.toLowerCase().indexOf("<!doctype") > -1 ? d.documentElement.innerHTML = a : d.body.innerHTML = a, d;
        }
        return c.apply(this, arguments);
    };
}(DOMParser);
var parser = new DOMParser();

// 设置输入框获得焦点和失去焦点时的样式
jQuery.focusblur = function(element, defcolor, truecolor) {
    var focusblurid = element;
    var defval = focusblurid.val();
    focusblurid.focus(function() {
        var thisval = $(this).val();
        if (thisval == defval) {
            $(this).val("");
            $(this).css("color", truecolor);
        }
    });
    focusblurid.blur(function() {
        var thisval = $(this).val();
        if (thisval === "") {
            $(this).val(defval);
            $(this).css("color", defcolor);
        }
    });
};

// 添加过滤作品类型的按钮
function setNotDownType(no) {
    var notDownType = document.createElement("div");
    notDownType.id = "notDownType";
    xz_btns_con.appendChild(notDownType);
    $(notDownType).text(xzlt("_过滤作品类型的按钮"));
    $(notDownType).attr("title", xzlt("_过滤作品类型的按钮_title"));
    setButtonStyle(notDownType, no, "#DA7002");
    notDownType.addEventListener("click", function() {
        notdown_type = prompt(xzlt("_过滤作品类型的弹出框文字"), "");
        if (notdown_type === null) { //如果取消设置，则将返回值null改为字符串，不然无法使用indexOf
            notdown_type = "";
        }
    }, false);
}

// 检查作品是否符合过滤类型
function checkNotDownType_result(string, url) {
    if (string.indexOf("multiple") > -1) { //如果是多图并且没有排除多图
        if (notdown_type.indexOf("2") === -1) {
            illust_url_list.push(url);
        }
    } else if (string.indexOf("ugoku-illust") > -1) { //如果是动图并且没有排除动图
        if (notdown_type.indexOf("3") === -1) {
            illust_url_list.push(url);
        }
    } else { //如果是单图并且没有排除单图（包括mode=big）
        if (notdown_type.indexOf("1") === -1) {
            illust_url_list.push(url);
        }
    }
    notdown_type_checked = true;
}

//添加过滤tag的按钮
function setFilterTag_notNeed(no) {
    var nottag = document.createElement("div");
    nottag.id = "nottag";
    xz_btns_con.appendChild(nottag);
    $(nottag).text(xzlt("_排除tag的按钮文字"));
    $(nottag).attr("title", xzlt("_排除tag的按钮_title"));
    setButtonStyle(nottag, no, "#e42a2a");

    var nottaginput = document.createElement("textarea");
    nottaginput.id = "nottaginput";
    nottaginput.style.cssText = "width: 600px;height: 40px;font-size: 12px;margin:6px auto;background:#fff;colir:#bbb;padding:7px;display:none;border:1px solid #e42a2a;";
    $("._global-header").eq(0).before(nottaginput);
    notNeed_tag_tip = xzlt("_排除tag的提示文字");
    $("#nottaginput").val(notNeed_tag_tip);
    $.focusblur($("#nottaginput"), "#bbb", "#333");

    nottag.addEventListener("click", function() {
        $("#nottaginput").toggle();
        if ($("#nottaginput").is(":visible")) {
            $("#nottaginput").css("display", "block");
            if (navigator.userAgent.indexOf('AppleWebKit') > -1) { //如果是chrome内核，则
                document.body.scrollTop = 0;
            } else { //否则
                document.documentElement.scrollTop = 0; //IE和火狐需要这一句
            }
        }
    }, false);
}

// 获取要排除的tag
function get_NotNeed_Tag() {
    if ($("#nottaginput").val() !== notNeed_tag_tip) {
        notNeed_tag = $("#nottaginput").val().split(",");
        if (notNeed_tag[notNeed_tag.length - 1] === "") { //处理最后一位是逗号的情况
            notNeed_tag.pop();
        }
        $("#outputInfo").html($("#outputInfo").html() + "<br>" + xzlt("_设置了排除tag之后的提示") + notNeed_tag.join(","));
        now_tips = $("#outputInfo").html();
    } else { //如果没有设置tag，则重置
        notNeed_tag = [];
    }
}

//添加必须的tag的按钮
function setFilterTag_Need(no) {
    var needtag = document.createElement("div");
    needtag.id = "needtag";
    xz_btns_con.appendChild(needtag);
    $(needtag).text(xzlt("_必须tag的按钮文字"));
    $(needtag).attr("title", xzlt("_必须tag的按钮_title"));
    setButtonStyle(needtag, no, "#00A514");

    var needtaginput = document.createElement("textarea");
    needtaginput.id = "needtaginput";
    needtaginput.style.cssText = "width: 600px;height: 40px;font-size: 12px;margin:6px auto;background:#fff;colir:#bbb;padding:7px;display:none;border:1px solid #00A514;";
    $("._global-header").eq(0).before(needtaginput);
    need_tag_tip = xzlt("_必须tag的提示文字");
    $("#needtaginput").val(need_tag_tip);
    $.focusblur($("#needtaginput"), "#bbb", "#333");

    needtag.addEventListener("click", function() {
        $("#needtaginput").toggle();
        if ($("#needtaginput").is(":visible")) {
            $("#needtaginput").css("display", "block");
            if (navigator.userAgent.indexOf('AppleWebKit') > -1) { //如果是chrome内核，则
                document.body.scrollTop = 0;
            } else { //否则
                document.documentElement.scrollTop = 0; //IE和火狐需要这一句
            }
        }
    }, false);
}

// 获取必须包含的tag
function get_Need_Tag() {
    if ($("#needtaginput").val() !== need_tag_tip) {
        need_tag = $("#needtaginput").val().split(",");
        if (need_tag[need_tag.length - 1] === "") { //处理最后一位是逗号的情况
            need_tag.pop();
        }
        $("#outputInfo").html($("#outputInfo").html() + "<br>" + xzlt("_设置了必须tag之后的提示") + need_tag.join(","));
    } else { //如果没有设置tag，则重置
        need_tag = [];
    }
}

// 添加筛选宽高的按钮
function setFilterWH(no) {
    var filterWHBotton = document.createElement("div");
    filterWHBotton.id = "filterWHBotton";
    xz_btns_con.appendChild(filterWHBotton);
    $(filterWHBotton).text(xzlt("_筛选宽高的按钮文字"));
    $(filterWHBotton).attr("title", xzlt("_筛选宽高的按钮_title"));
    setButtonStyle(filterWHBotton, no, "#179FDD");

    filterWHBotton.addEventListener("click", function() {
        var inputWH = prompt(xzlt("_筛选宽高的提示文字"), filterWH.width + filterWH.and_or + filterWH.height);
        if (inputWH === "" || inputWH === null || (inputWH.indexOf("|") === -1 && inputWH.indexOf("&") === -1) || (inputWH.indexOf("|") > -1 && inputWH.indexOf("&") > -1)) { //如果为空值，或取消了输入，或没有输入任意一个分隔符号，或者同时输入了两个分隔符
            alert(xzlt("_本次输入的数值无效"));
            return false;
        } else {
            var and_or = "";
            if (inputWH.indexOf("|") > -1) { //如果关系为or
                and_or = "|";
                inputWH = inputWH.split("|");
            } else if (inputWH.indexOf("&") > -1) { //如果关系为and
                and_or = "&";
                inputWH = inputWH.split("&");
            }
            var width = parseInt(inputWH[0]);
            var height = parseInt(inputWH[1]);
            if (isNaN(width) || isNaN(height)) { //检查输入的是否是有效数字
                alert(xzlt("_本次输入的数值无效"));
                return false;
            } else { //检查通过
                filterWH.and_or = and_or;
                filterWH.width = width;
                filterWH.height = height;
                is_set_filterWH = true;
                alert(xzlt("_设置成功"));
            }
        }
    }, false);
}

// 检查过滤宽高的设置
function checkSetWH() {
    if (is_set_filterWH) {
        var and_or = filterWH.and_or;
        $("#outputInfo").html($("#outputInfo").html() + "<br>" + xzlt("_设置了筛选宽高之后的提示文字p1") + filterWH.width + and_or.replace("|", xzlt("_或者")).replace("&", xzlt("_并且")) + xzlt("_高度设置") + filterWH.height);
    }
}

// 给tag搜索页的作品绑定删除属性
function tagSearchDel() {
    var all_works = $(tag_search_list_selector);
    if (all_works.length === 0) { // 有时执行时列表还没加载出来，需要延时。目前tag搜索页是这样
        setTimeout(tagSearchDel, 1000);
        return false;
    } else {
        for (var i = 0; i < all_works.length; i++) {
            var now_works = all_works.eq(i);
            if (!now_works.attr("data-del")) {
                now_works.attr("data-del", "");
                now_works.bind("click", function() {
                    if ($("#deleteBotton").attr("data_del") === "1") {
                        this.remove();
                        if (allow_work) {
                            outputNowResult();
                        }
                        return false;
                    }
                });
            }
        }
    }
}

// tag搜索页的筛选任务执行完毕
function tagSearchPageFinished() {
    allow_work = true;
    // listPage_finished=0; //不注释掉的话，每次添加筛选任务都是从当前页开始，而不是一直往后累计
    listPage_finished2 = 0; //重置已抓取的页面数量
    listSort();
    alert(xzlt("_本次任务已全部完成"));
    tagSearchDel();
}

// 检查用户输入的要获取的页数的参数
function check_want_page_rule1(input_tip, error_tip, start1_tip, start2_tip) {
    want_page = prompt(input_tip, "-1");
    if (~~Number(want_page) < 1 && want_page !== "-1") { //比1小的数里，只允许-1, 0也不行
        $("#outputInfo").html($("#outputInfo").html() + error_tip);
        return false;
    }
    if (~~Number(want_page) >= 1) {
        want_page = ~~Number(want_page);
        $("#outputInfo").html($("#outputInfo").html() + start1_tip.replace("-num-", want_page));
        return true;
    } else if (want_page === "-1") {
        want_page = -1;
        $("#outputInfo").html($("#outputInfo").html() + start2_tip);
        return true;
    }
}

// 显示调整后的列表数量，仅在某些页面中使用
function outputNowResult() {
    if ($("#outputInfo").length === 0) { // 如果还未添加输出区域则添加
        $("._global-header").eq(0).before(outputInfo);
    }
    var now_output_info = $("#outputInfo").html();
    $("#outputInfo").html(now_output_info + xzlt("_调整完毕", $(tag_search_list_selector + ":visible").length) + "<br>");
}

// 添加图片信息
function addImgInfo(id, imgUrl, title, nowAllTag, user, userid, fullWidth, fullHeight, ext) {
    img_info.push({
        id: id,
        url: imgUrl,
        title: title,
        tags: nowAllTag,
        user: user,
        userid: userid,
        fullWidth: fullWidth,
        fullHeight: fullHeight,
        ext: ext
    });
}

// 启动抓取
function startGet() {
    if (!allow_work || download_started) {
        alert(xzlt("_当前任务尚未完成1"));
        return false;
    }

    $("._global-header").eq(0).before(outputInfo);

    // 设置要获取的作品数或页数
    if (page_type === 1) {
        if (quick) {
            want_page = 1;
        } else {
            var result = check_want_page_rule1(
                xzlt("_check_want_page_rule1_arg1"),
                xzlt("_check_want_page_rule1_arg2"),
                xzlt("_check_want_page_rule1_arg3"),
                xzlt("_check_want_page_rule1_arg4")
            );
            if (!result) {
                return false;
            }
        }
    } else if (page_type === 2 || page_type === 3 || page_type === 4) {
        var result = check_want_page_rule1(
            xzlt("_check_want_page_rule1_arg5"),
            xzlt("_check_want_page_rule1_arg2"),
            xzlt("_check_want_page_rule1_arg6"),
            xzlt("_check_want_page_rule1_arg7")
        );
        if (!result) {
            return false;
        }
    } else if (page_type === 5) {
        var userset = prompt(xzlt("_请输入最低收藏数和要抓取的页数"), "1000,100");
        want_favorite_number = Number(userset.split(",")[0]);
        want_page = Number(userset.split(",")[1]);
        if (isNaN(want_favorite_number) || want_favorite_number <= 0 || isNaN(want_page) || want_favorite_number <= 0) {
            alert(xzlt("_参数不合法1"));
            return false;
        }
        $("#outputInfo").html($("#outputInfo").html() + xzlt("_tag搜索任务开始", want_favorite_number, want_page));
        if (!listPage_finished) { //如果是首次抓取 则处理当前页面
            $("._popular-introduction").remove(); // 移除热门作品
            $("._2xrGgcY").remove(); // 移除列表的上级元素
            $(tag_search_list_selector).remove(); // 移除当前列表内容
            $("body").append("<div id='tag_search_temp_result' style='display:none'></div>");
            tag_search_temp_result = $("#tag_search_temp_result");
        }
    } else if (page_type === 10) {
        want_page = parseInt(window.prompt(xzlt("_want_page_弹出框文字_page_type10") + max_num, "10"));
        if (isNaN(want_page)) {
            alert(xzlt("_参数不合法1"));
            return false;
        } else if (want_page > max_num) {
            alert(xzlt("_输入超过了最大值") + max_num);
            return false;
        } else {
            $("#outputInfo").html($("#outputInfo").html() + xzlt("_任务开始1", want_page));
        }
    }
    if (page_type === 7) {
        listPage_finished = 0;
    }
    // 检查排除作品类型的参数是否合法
    if (notdown_type !== "") {
        if (notdown_type.indexOf("1") > -1 && notdown_type.indexOf("2") > -1 && notdown_type.indexOf("3") > -1) {
            alert(xzlt("_check_notdown_type_result1_弹窗"));
            $("#outputInfo").html($("#outputInfo").html() + "<br>" + xzlt("_check_notdown_type_result1_html") + "<br><br>");
            return false;
        } else if (notdown_type.indexOf("1") === -1 && notdown_type.indexOf("2") === -1 && notdown_type.indexOf("3") === -1) {
            alert(xzlt("_check_notdown_type_result2_弹窗"));
            $("#outputInfo").html($("#outputInfo").html() + "<br>" + xzlt("_check_notdown_type_result1_html") + "<br><br>");
            return false;
        } else {
            $("#outputInfo").html($("#outputInfo").html() + "<br>" + xzlt("_check_notdown_type_result3_html") + notdown_type.replace("1", xzlt("_单图")).replace("2", xzlt("_多图")).replace("3", xzlt("_动图")));
        }
    }
    // 检查是否设置了过滤宽高
    if (page_type !== 5) { // 排除tag搜索页，因为tag搜索页的宽高设置在startGet里不生效
        checkSetWH();
    }
    // 获取要排除的tag
    get_NotNeed_Tag();
    // 获取必须包含的tag
    get_Need_Tag();

    now_tips = $(outputInfo).html();
    resetResult();
    if (page_type !== 6) {
        allow_work = false; //开始执行时更改许可状态
    }

    if (page_type === 1) {
        getIllustPage(loc_url); //开始获取图片
    } else {
        if (page_type === 6) {
            getListPage2();
        } else {
            getListPage(); //开始获取列表页
        }
    }
}

// 获取作品列表页
function getListPage() {
    if (page_type === 9) {
        var id; //取出作品id
        if (loc_url.indexOf("recommended.php") > -1) { // "为你推荐"里面的示例作品id为"auto"
            id = "auto";
        } else {
            id = loc_url.split("id=")[1];
        }
        var tt = $("input[name=tt]")[0].value, //取出token
            url = "/rpc/recommender.php?type=illust&sample_illusts=" + id + "&num_recommendations=" + requset_number + "&tt=" + tt; //获取相似的作品
    } else if (page_type === 11) { // 对于发现图片，仅下载已有部分，所以不需要去获取列表页了。
        var now_illust = $(tag_search_list_selector); //获取已有作品
        for (var i = 0; i < now_illust.length; i++) { //拼接作品的url
            illust_url_list.push(now_illust.eq(i).find("a").eq(0).attr("href"));
        }
        $("#outputInfo").html($("#outputInfo").html() + "<br>" + xzlt("_列表页获取完成2", illust_url_list.length));
        getListUrlFinished();
        return false; // 不执行下面的代码
    } else {
        var url = base_url + (startpage_no + listPage_finished);
    }
    $.ajax({
        url: url,
        type: "get",
        async: true,
        cache: false,
        dataType: "text",
        success: function(data) {
            listPage_finished++;
            var listPage_document = $(parser.parseFromString(data, "text/html"));
            var allPicArea;
            if (page_type === 5) { // tag搜索页
                listPage_finished2++;
                if (tag_search_is_new) { // 新版tag搜索页，需要将结果解析出来
                    var this_one_info = listPage_document.find(tag_search_lv1_selector).attr("data-items"); // 保存这一次的信息
                    this_one_info = JSON.parse(this_one_info); // 转化为数组
                    for (var j = 0; j < this_one_info.length; j++) {
                        // 拼接每个作品的html
                        var new_html = tag_search_new_html;
                        var pageCount = parseInt(this_one_info[j]["pageCount"]); // 包含的图片数量
                        if (pageCount > 1) { // 多图
                            new_html = new_html.replace("<!--xz_multiple_html-->", xz_multiple_html);
                        }
                        var illustType = this_one_info[j]["illustType"]; // 作品类型 0 单图 1 多图 2 动图
                        if (illustType === "2") { // 动图
                            new_html = new_html.replace("<!--xz_gif_html-->", xz_gif_html);
                        }
                        if (this_one_info[j]["isBookmarked"]) { // 是否已收藏
                            new_html = new_html.replace(/xz_isBookmarked/g, "on");
                        }
                        // 填充内容
                        new_html = new_html.replace(/xz_illustId/g, this_one_info[j]["illustId"]);
                        new_html = new_html.replace(/xz_pageCount/g, this_one_info[j]["pageCount"]);
                        new_html = new_html.replace(/xz_url/g, this_one_info[j]["url"]);
                        new_html = new_html.replace(/xz_illustTitle/g, this_one_info[j]["illustTitle"]);
                        new_html = new_html.replace(/xz_userId/g, this_one_info[j]["userId"]);
                        new_html = new_html.replace(/xz_userName/g, this_one_info[j]["userName"]);
                        new_html = new_html.replace(/xz_userImage/g, this_one_info[j]["userImage"]);
                        new_html = new_html.replace(/xz_bookmarkCount/g, this_one_info[j]["bookmarkCount"]);
                        // 设置宽高
                        var ture_width = parseInt(this_one_info[j]["width"]);
                        var ture_height = parseInt(this_one_info[j]["height"]);
                        var max_width = "198";
                        var max_height = "198";
                        if (ture_width >= ture_height) {
                            new_html = new_html.replace(/xz_width/g, max_width);
                            new_html = new_html.replace(/xz_height/g, "auto");
                        } else {
                            new_html = new_html.replace(/xz_width/g, "auto");
                            new_html = new_html.replace(/xz_height/g, max_height);
                        }
                        tag_search_new_html_one_page += new_html;
                    }
                    tag_search_temp_result.html(tag_search_new_html_one_page);
                    tag_search_new_html_one_page = "";
                    allPicArea = tag_search_temp_result.find(tag_search_lv2_selector);
                } else {
                    allPicArea = listPage_document.find(tag_search_list_selector);
                }
                for (var i = 0; i < allPicArea.length; i++) {
                    var now_id = this_one_info[i]["illustId"];
                    var shoucang = this_one_info[i]["bookmarkCount"];
                    if (shoucang >= want_favorite_number) {
                        imgList.push({
                            "id": now_id,
                            "e": allPicArea[i],
                            "num": Number(shoucang)
                        });
                        $(window.top.document).find(tag_search_lv1_selector).after(allPicArea[i]);
                    }
                }
                tag_search_temp_result.html("");
                $("#outputInfo").html(now_tips + "<br>" + xzlt("_tag搜索页已抓取多少页", listPage_finished2, want_page, startpage_no + listPage_finished - 1));
                //判断任务状态
                if (listPage_finished2 == want_page) {
                    allow_work = true;
                    $("#outputInfo").html($("#outputInfo").html() + "<br>" + xzlt("_tag搜索页任务完成1", $(tag_search_list_selector).length) + "<br><br>");
                    tagSearchPageFinished();
                    return false;
                } else if (!listPage_document.find(".next ._button")[0]) { //到最后一页了,已抓取本tag的所有页面
                    allow_work = true;
                    $("#outputInfo").html($("#outputInfo").html() + "<br>" + xzlt("_tag搜索页任务完成2", $(tag_search_list_selector).length) + "<br><br>");
                    tagSearchPageFinished();
                    return false;
                } else if (interrupt) { //任务被用户中断
                    $("#outputInfo").html($("#outputInfo").html() + "<br>" + xzlt("_tag搜索页中断", $(tag_search_list_selector).length) + "<br><br>");
                    interrupt = false;
                    tagSearchPageFinished();
                    return false;
                } else {
                    getListPage();
                }
            } else if (page_type === 7) { // 除地区排行榜以外的其他类型排行榜
                var allPicArea = listPage_document.find(".ranking-item");
                for (var i = 0; i < allPicArea.length; i++) {
                    if (!allPicArea.eq(i).find("a")[0]) { //如果列表中的这个作品没有a标签，则是被删除、或非公开等错误项
                        continue;
                    }
                    var nowClass = allPicArea.eq(i).find(".ranking-image-item a").attr("class"),
                        nowHref = allPicArea.eq(i).find(".ranking-image-item a").attr("href");
                    checkNotDownType_result(nowClass, nowHref);
                }
                $("#outputInfo").html(now_tips + "<br>" + xzlt("_排行榜进度", listPage_finished));
                if (listPage_finished == part_number) {
                    $("#outputInfo").html($("#outputInfo").html() + "<br>" + xzlt("_排行榜任务完成", illust_url_list.length));
                    getListUrlFinished();
                } else {
                    getListPage();
                }
            } else if (page_type === 9) { //添加收藏后的相似作品
                var illust_list = JSON.parse(data).recommendations; //取出id列表
                for (var i = 0; i < illust_list.length; i++) { //拼接作品的url
                    illust_url_list.push("https://www.pixiv.net/member_illust.php?mode=medium&illust_id=" + illust_list[i]);
                }
                $("#outputInfo").html($("#outputInfo").html() + "<br>" + xzlt("_列表页获取完成2", illust_url_list.length));
                getListUrlFinished();
            } else {
                var allPicArea = listPage_document.find("._image-items .image-item");
                for (var i = 0; i < allPicArea.length; i++) {
                    if (!allPicArea.eq(i).find("a")[0]) { //如果列表中的这个作品没有a标签，则是被删除、或非公开等错误项
                        continue;
                    }
                    var nowClass = allPicArea.eq(i).find("a").eq(0).attr("class"),
                        nowHref = allPicArea.eq(i).find("a").eq(0).attr("href");
                    checkNotDownType_result(nowClass, nowHref);
                }
                $("#outputInfo").html(now_tips + "<br>" + xzlt("_列表页抓取进度", listPage_finished));
                //判断任务状态
                if (!listPage_document.find(".next ._button")[0] || listPage_finished == want_page) { //如果没有下一页的按钮或者抓取完指定页面
                    allow_work = true;
                    listPage_finished = 0;
                    $("#outputInfo").html($("#outputInfo").html() + "<br>" + xzlt("_列表页抓取完成"));
                    if (illust_url_list.length === 0) { //没有符合条件的作品
                        $("#outputInfo").html($("#outputInfo").html() + "<br>" + xzlt("_列表页抓取结果为零"));
                        return false;
                    }
                    getListUrlFinished();
                } else {
                    getListPage();
                }
            }
        },
        statusCode: {
            404: function() {
                if (page_type === 7) { //其他排行榜
                    //如果发生了404错误，则中断抓取，直接下载已有部分。（因为可能确实没有下一部分了，只是这种情况我们没见到。这样的话之前预设的最大页数可能就不对
                    console.log("404错误，直接下载已有部分");
                    $("#outputInfo").html($("#outputInfo").html() + "<br>" + xzlt("_排行榜列表页抓取遇到404", illust_url_list.length) + "<br><br>");
                    getListUrlFinished();
                }
            }
        }
    });
}

// 第二个获取列表的函数，仅在tag搜索页和地区排行榜使用（从当前列表页直接获取所有内容页的列表）
function getListPage2() {
    if (!allow_work) {
        alert(xzlt("_当前任务尚未完成2"));
        return false;
    }
    if (page_type === 5) {
        if ($(tag_search_list_selector + ":visible").length === 0) {
            return false;
        }
        if (interrupt) {
            interrupt = false;
        }
        resetResult();
        // 获取要排除的tag 因为tag搜索页里的下载按钮没有启动startGet，而是在这里
        get_NotNeed_Tag();
        checkSetWH(); // 检查宽高设置
    }
    allow_work = false;
    if (page_type === 5) {
        var allList = $(tag_search_list_selector + ":visible");
        for (var i = allList.length - 1; i >= 0; i--) {
            illust_url_list[i] = $(allList[i]).find("a").eq(0).attr("href");
        }
    } else {
        var allList = $(".ranking-item");
        for (var i = allList.length - 1; i >= 0; i--) {
            illust_url_list[i] = $(".ranking-item").eq(i).find("a").eq(1).attr("href");
        }
    }
    $("._global-header").eq(0).before(outputInfo);
    $("#outputInfo").html($("#outputInfo").html() + "<br>" + xzlt("_列表抓取完成开始获取作品页", allList.length));
    getListUrlFinished();
}

// 作品列表获取完毕，开始抓取图片内容页
function getListUrlFinished() {
    now_tips = $("#outputInfo").html();
    if (page_type !== 9) { //9不需要用到illust_url_list
        if (illust_url_list.length < ajax_for_illust_threads) {
            ajax_for_illust_threads = illust_url_list.length;
        }
    }
    for (var i = 0; i < ajax_for_illust_threads; i++) {
        setTimeout(getIllustPage(illust_url_list[0]), i * ajax_for_illust_delay);
    }
}

// 获取作品内容页面的函数（区别于获取列表页面的函数）
function getIllustPage(url) {
    ajax_for_list_is_end = false;
    illust_url_list.shift(); //有时并未使用illust_url_list，但对空数组进行shift()是合法的
    if (interrupt) { //判断任务是否已中断，目前只在tag搜索页有用到
        allow_work = true;
        return false;
    }
    if (quick) { // 在快速获取之外的情况，可能是下载多个图片，所以不输出以避免循环输出多次
        $(outputInfo).html($(outputInfo).html() + "<br>" + xzlt("_开始获取作品页面"));
        now_tips = $(outputInfo).html();
    }
    $.ajax({
        url: url,
        type: "get",
        async: true,
        cache: false,
        dataType: "text",
        success: function(data) {
            if (interrupt) { //这里需要再判断一次，因为ajax执行完毕是需要时间的
                allow_work = true;
                return false;
            }
            var illust_document = $(parser.parseFromString(data, "text/html"));

            // 处理无权访问的作品 测试id35697511
            var test_title = illust_document.find(".work-info .title");
            if (test_title.length === 0) {
                console.log("访问不到 " + url);
                ajax_for_list_is_end = true;
                if (page_type === 1) { // 在作品页内下载时，设置的want_page其实是作品数
                    if (want_page > 0) {
                        want_page--;
                    }
                    // 获取不到下一个作品了，直接结束
                    $(outputInfo).html($(outputInfo).html() + "<br>" + xzlt("_无权访问1", url) + "<br>");
                    allow_work = true;
                    allWorkFinished();
                } else { // 跳过当前作品
                    $(outputInfo).html($(outputInfo).html() + "<br>" + xzlt("_无权访问2", url) + "<br>");
                    if (illust_url_list.length > 0) { //如果存在下一个作品，则
                        getIllustPage(illust_url_list[0]);
                    } else { //没有剩余作品
                        ajax_threads_finished++;
                        if (ajax_threads_finished === ajax_for_illust_threads) { //如果所有并发请求都执行完毕
                            ajax_threads_finished = 0; //复位
                            allow_work = true;
                            allWorkFinished();
                        }
                    }
                }
                return false;
            }

            // 预设及获取图片信息
            var imgUrl = "",
                id,
                title = test_title.text(), //标题
                user = illust_document.find("._user-profile-card .user-name").text(), //画师名字
                userid = "uid" + illust_document.find("._user-profile-card .user-name").attr("href").split("=")[1], //画师id
                jsInfo = illust_document.find("#wrapper script").eq(0).text(), //包含作品信息的js代码
                sizeInfo = /\[.*?\]/.exec(jsInfo)[0].replace(/\[|\]/g, "").split(","), //取出pixiv.context.illustSize属性
                fullWidth = parseInt(sizeInfo[0]), //原图宽度
                fullHeight = parseInt(sizeInfo[1]), //原图高度
                ext = "", //扩展名
                nowAllTagE = illust_document.find("li.tag"), // tag列表
                nowAllTag = [];
            for (var i = nowAllTagE.length - 1; i >= 0; i--) {
                nowAllTag[i] = nowAllTagE.eq(i).find(".text").text();
            }

            // 检查宽高设置
            var WH_check_result = true; //预设为通过
            if (is_set_filterWH) {
                if (fullWidth < filterWH.width && fullHeight < filterWH.height) { //如果宽高都小于要求的宽高
                    WH_check_result = false;
                } else {
                    if (filterWH.and_or === "|") {
                        if (fullWidth >= filterWH.width || fullHeight >= filterWH.height) { //判断or的情况
                            WH_check_result = true;
                        } else {
                            WH_check_result = false;
                        }
                    } else if (filterWH.and_or === "&") {
                        if (fullWidth >= filterWH.width && fullHeight >= filterWH.height) { //判断and的情况
                            WH_check_result = true;
                        } else {
                            WH_check_result = false;
                        }
                    }
                }
            }

            // 检查要排除的tag 其实page_type==9的时候在获取作品列表时就能获得tag列表，但为了统一，也在这里检查
            var tag_check_result; // 储存tag检查结果

            // 检查要排除的tag
            var tag_noeNeed_isFound = false;
            if (notNeed_tag.length > 0) { //如果设置了过滤tag
                outerloop: //命名外圈语句
                    for (var i = nowAllTag.length - 1; i >= 0; i--) {
                    for (var ii = notNeed_tag.length - 1; ii >= 0; ii--) {
                        if (nowAllTag[i] === notNeed_tag[ii]) {
                            tag_noeNeed_isFound = true;
                            break outerloop;
                        }
                    }
                }
            }

            // 检查必须包含的tag
            if (!tag_noeNeed_isFound) { //如果没有匹配到要排除的tag
                if (need_tag.length > 0) { //如果设置了必须包含的tag
                    var tag_need_isFound = false;
                    outerloop2: //命名外圈语句
                        for (var i = nowAllTag.length - 1; i >= 0; i--) {
                            for (var ii = need_tag.length - 1; ii >= 0; ii--) {
                                if (nowAllTag[i] === need_tag[ii]) {
                                    tag_need_isFound = true;
                                    break outerloop2;
                                }
                            }
                        }
                    tag_check_result = tag_need_isFound;
                } else { //如果没有设置必须包含的tag，则通过
                    tag_check_result = true;
                }
            } else { //如果匹配到了要排除的tag，则不予通过
                tag_check_result = false;
            }

            // 结合作品类型处理作品
            if (!!illust_document.find(".original-image")[0] && tag_check_result && WH_check_result) { //如果是单图，并且通过了tag检查和宽高检查
                if (notdown_type_checked === true || notdown_type.indexOf("1") === -1) { //如果已经筛选过作品类型，或者没有排除单图
                    imgUrl = illust_document.find(".original-image").attr("data-src"); //作品url
                    id = imgUrl.split("/");
                    id = id[id.length - 1].split(".")[0]; //作品id
                    ext = imgUrl.split(".");
                    ext = ext[ext.length - 1]; //扩展名
                    addImgInfo(id, imgUrl, title, nowAllTag, user, userid, fullWidth, fullHeight, ext);
                    outputImgNum();
                }
            } else if (!!illust_document.find(".works_display")[0] && tag_check_result && WH_check_result) { //单图以外的情况,并且通过了tag检查和宽高检查
                if (!!illust_document.find(".full-screen._ui-tooltip")[0]) { //如果是动图
                    if (notdown_type_checked === true || notdown_type.indexOf("3") === -1) { //如果已经筛选过作品类型，或者没有排除动图
                        var reg1 = /ugokuIllustFullscreenData.*zip/,
                            reg2 = /https.*zip/;
                        imgUrl = reg2.exec(reg1.exec(jsInfo)[0])[0].replace(/\\/g, ""); //取出动图压缩包的url
                        id = imgUrl.split("/");
                        id = id[id.length - 1].split(".")[0].replace("_ugoira1920x1080", ""); //作品id
                        ext = imgUrl.split(".");
                        ext = ext[ext.length - 1]; //扩展名
                        addImgInfo(id, imgUrl, title, nowAllTag, user, userid, fullWidth, fullHeight, ext);
                        outputImgNum();
                    }
                } else if (illust_document.find(".works_display a").eq(0).attr("href").indexOf("mode=big") > -1) { //对于mode=big
                    if (notdown_type_checked === true || notdown_type.indexOf("1") === -1) { //如果已经筛选过作品类型，或者没有排除单图
                        imgUrl = illust_document.find(".bookmark_modal_thumbnail").attr("data-src").replace("c/150x150/img-master", "img-original").replace("_master1200", ""); //此时拼接的url的后缀名是不准确的
                        id = imgUrl.split("/");
                        id = id[id.length - 1].split(".")[0]; //作品id
                        testExtName(imgUrl, null, {
                            id: id,
                            title: title,
                            tags: nowAllTag,
                            user: user,
                            fullWidth: fullWidth,
                            fullHeight: fullHeight
                        }); //先把能确定的参数传过去，ext和url需要在下一步确定
                    }
                } else { //多图作品
                    if (notdown_type_checked === true || notdown_type.indexOf("2") === -1) { //如果已经筛选过作品类型，或者没有排除多图
                        var pNo = parseInt(illust_document.find("ul.meta li").eq(1).text().split(" ")[1].split("P")[0]); //P数
                        var orgPageUrl = illust_document.find(".works_display a").eq(0).attr("href");
                        getMangaOriginalPage(orgPageUrl, pNo, interrupt, { // 多p作品的id需要根据p数循环加上序号，所以放在后面加了
                            title: title,
                            tags: nowAllTag,
                            user: user,
                            userid: userid,
                            fullWidth: fullWidth,
                            fullHeight: fullHeight
                        }); //先把能确定的参数传过去，id、ext和url需要在下一步确定
                    }
                }
            }
            ajax_for_list_is_end = true;
            if (page_type === 1) { // 在作品页内下载时，设置的want_page其实是作品数
                if (want_page > 0) {
                    want_page--;
                }
                if (!!illust_document.find(".after a")[0] && (want_page === -1 || want_page > 0)) { //如果存在下一个作品，则
                    getIllustPage("https://www.pixiv.net/" + illust_document.find(".after a").eq(0).attr("href"));
                } else { //没有剩余作品
                    allow_work = true;
                    allWorkFinished();
                }
            } else {
                if (illust_url_list.length > 0) { //如果存在下一个作品，则
                    getIllustPage(illust_url_list[0]);
                } else { //没有剩余作品
                    ajax_threads_finished++;
                    if (ajax_threads_finished === ajax_for_illust_threads) { //如果所有并发请求都执行完毕
                        ajax_threads_finished = 0; //复位
                        allow_work = true;
                        allWorkFinished();
                    }
                }
            }
        },
        statusCode: { //如果发生了错误则跳过该url
            0: function() {
                //ERR_CONNECTION_RESET
                getIllustPage(illust_url_list[0]);
                console.log(xzlt("_作品页状态码0"));
            },
            400: function() {
                //400错误
                getIllustPage(illust_url_list[0]);
                console.log(xzlt("_作品页状态码400")); //在收藏的作品列表中，有些作品被作者删除了，却还显示有“编辑”按钮（但也有些没有这个按钮）。点击这个按钮会跳转到错误的“编辑收藏”页面，导致400错误。这个情况仅在下载书签作品时会发生。
            },
            403: function() {
                //403错误
                getIllustPage(illust_url_list[0]);
                console.log(xzlt("_作品页状态码403"));
            },
            404: function() {
                //404错误
                getIllustPage(illust_url_list[0]);
                console.log(xzlt("_作品页状态码404"));
            }
        }
    });
}

// 抓取多p作品的原图页面
function getMangaOriginalPage(url, pNo, interrupt, img_info_data) {
    ajax_for_illust_is_end = false;
    url = ("https://www.pixiv.net/" + url).replace("manga", "manga_big") + "&page=0"; //拼接最终大图页面的url
    $.ajax({
        url: url,
        type: "get",
        async: true,
        cache: false,
        dataType: "text",
        success: function(data) {
            if (interrupt) { //这里判断的是tag搜索页的中断状态。如果已经中断，则清空数据并返回
                resetResult();
                return false;
            }
            var imgsrc = parser.parseFromString(data, "text/html").querySelector("img").src; //取出第一张图片的url
            var splited = imgsrc.split("p0");
            var ext = splited[1].replace(".", "");
            for (var i = 0; i < pNo; i++) {
                url = splited[0] + "p" + i + splited[1]; //拼接出图片的url
                var id = url.split("/");
                id = id[id.length - 1].split(".")[0]; //作品id
                addImgInfo(id, url, img_info_data.title, img_info_data.tags, img_info_data.user, img_info_data.userid, img_info_data.fullWidth, img_info_data.fullHeight, ext);
            }
            // 检查网址并添加到数组的动作执行完毕
            ajax_for_illust_is_end = true;
            outputImgNum();
        }
    });
}

// 测试图片url是否正确的函数。对于mode=big的作品和pixivision的插画作品，虽然无法获取包含图片真实地址的页面，但是可以拼接出图片url，只是后缀都是jpg的，所以要测试下到底是jpg还是png
function testExtName(url, length, img_info_data) {
    test_suffix_finished = false;
    // 初步获取到的后缀名都是jpg的
    var ext = "";
    var testImg = new Image();
    testImg.src = url;
    testImg.onload = function() {
        ext = "jpg";
        nextStep();
    };
    testImg.onerror = function() {
        url = url.replace(".jpg", ".png");
        ext = "png";
        nextStep();
    };

    function nextStep() {
        addImgInfo(img_info_data.id, url, img_info_data.title, img_info_data.tags, img_info_data.user, img_info_data.userid, img_info_data.fullWidth, img_info_data.fullHeight, ext);
        outputImgNum();
        if (!!length) { //length参数只有在获取pixivision插画时才会传入
            test_suffix_no++;
            if (test_suffix_no === length) { //如果所有请求都执行完毕
                allWorkFinished();
            }
        }
        test_suffix_finished = true;
    }

}
// mode=big的网址如https://www.pixiv.net/member_illust.php?mode=medium&illust_id=56155666，虽然是单图，但是点击后是在新页面打开原图的，新页面要求referer，因此无法直接抓取原图
// pixivision则是因为跨域问题，无法抓取p站页面

// 抓取完毕
function allWorkFinished() {
    if (ajax_for_list_is_end && ajax_for_illust_is_end && test_suffix_finished) { // 检查加载页面的任务 以及 检查网址的任务 是否都全部完成。
        $(outputInfo).html($(outputInfo).html() + "<br>" + xzlt("_获取图片网址完毕", img_info.length) + "<br>");
        if (img_info.length === 0) {
            $(outputInfo).html($(outputInfo).html() + xzlt("_没有符合条件的作品") + "<br><br>");
            if (!quiet_download) {
                alert(xzlt("_没有符合条件的作品弹窗"));
            }
            return false;
        }
        // 显示输出结果完毕
        $(outputInfo).html($(outputInfo).html() + xzlt("_抓取完毕") + "<br><br>");
        if (!quiet_download) {
            alert(xzlt("_抓取完毕"));
        }
        now_tips = $(outputInfo).html();
        // 重置输出区域
        downloaded = 0;
        $(".downloaded").html("0");
        $(".download_fileName").html("");
        $(".loaded").html("0/0");
        $(".progress").css("width", "0%");

        // 显示输出区域
        if (!quick) {
            $(".outputWrap").show();
        }
        // 重置输出区域
        $(".imgNum").text(img_info.length);
        if (img_info.length < download_thread_deauflt) { // 检查下载线程数
            download_thread = img_info.length;
        } else {
            download_thread = download_thread_deauflt; // 重设为默认值
        }
        var outputWrap_down_list = $(".outputWrap_down_list");
        outputWrap_down_list.show(); // 显示下载队列
        if ($(".donwloadBar").length < download_thread) { // 如果下载队列的显示数量小于线程数，则增加队列
            var need_add = download_thread - $(".donwloadBar").length;
            var donwloadBar = outputWrap_down_list.find(".donwloadBar").eq(0);
            // 增加下载队列的数量
            for (var i = 0; i < need_add; i++) {
                outputWrap_down_list.append(donwloadBar.clone());
            }
        } else if ($(".donwloadBar").length > download_thread) { // 如果下载队列的显示数量大于线程数，则减少队列
            var need_delete = $(".donwloadBar").length - download_thread;
            // 减少下载队列的数量
            for (var i = 0; i < need_delete; i++) {
                outputWrap_down_list.find(".donwloadBar").eq(0).remove();
            }
        }
        // 快速下载时点击下载按钮
        if (quick || quiet_download) {
            setTimeout(function() {
                $(".startDownload").click();
            }, 200);
        }
    } else { //如果没有完成，则延迟一段时间后再执行
        setTimeout(function() {
            allWorkFinished();
        }, 1000);
    }
}

// 创建输出抓取进度的区域
var outputInfo = document.createElement("div");
outputInfo.id = "outputInfo";
outputInfo.style.cssText = "background: #fff;padding: 10px;font-size: 14px;margin:6px auto;width:950px;";

// 在抓取图片网址时，输出提示
function outputImgNum() {
    $(outputInfo).html(now_tips + "<br>" + xzlt("_抓取图片网址的数量", img_info.length));
    if (interrupt) { //如果任务中断
        $("#outputInfo").html($("#outputInfo").html() + "<br>" + xzlt("_抓取图片网址遇到中断") + "<br><br>");
    }
}

// 单独设置按钮的位置和背景颜色
function setButtonStyle(e, no, bg) {
    var startTop = 200,
        unitTop = 55;
    e.className = "download_btn";
    // e.style.top = startTop + unitTop * (no - 1) + "px";
    e.style.backgroundColor = bg;
}

// 添加css样式表
var styleE = document.createElement("style");
document.body.appendChild(styleE);
styleE.innerHTML = "";

function addBtnsAreaCtrl() {
    // 输出右侧按钮区域
    var xianzun_btns_wrap = document.createElement("div");
    document.body.appendChild(xianzun_btns_wrap);
    xianzun_btns_wrap.outerHTML =
        '<div class="xianzun_btns_wrap">' +
        '<div class="xz_btns_ctr" title="' + xzlt("_展开收起下载按钮_title") + '" data-show="0"><span class="xianzun_arrow_left"></span><span>' + xzlt("_展开下载按钮") + '</span></div>' +
        '<div class="xz_btns_con">' +
        '</div>' +
        '</div>';
    // 设置右侧按钮的样式
    styleE.innerHTML +=
        '.xianzun_btns_wrap{position: fixed;top: 140px;right: -196px;z-index: 999;font-size: 0;transition: right .3s;}' +
        '.xianzun_btns_wrap *{box-sizing:content-box;}' +
        '.xz_btns_ctr{width: 30px;padding: 11px 0;cursor: pointer;display: inline-block;vertical-align: top;font-size: 14px;text-align: center;background: #34b0e0;color: #fff;border-radius: 5px;transition: background .3s;letter-spacing:3px;}' +
        '.xz_btns_ctr span:nth-child(1){display: inline-block;width: 0;height: 0;line-height: 0;}' +
        '.xianzun_arrow_left{border-bottom: 6px solid transparent;border-left: 6px solid transparent;border-right: 6px solid #fff;border-top: 6px solid transparent;margin-right:8px;}' +
        '.xianzun_arrow_right{border-bottom: 6px solid transparent;border-left: 6px solid #fff;border-right: 6px solid transparent;border-top: 6px solid transparent;margin-left:8px;}' +
        '.xz_btns_ctr span:nth-child(2){margin-top:5px;writing-mode:tb;}' +
        '.xz_btns_ctr:hover{background: #179FDD;}' +
        '.xz_btns_con{vertical-align: top;padding-left: 10px;display: inline-block;position: relative;}' +
        '.download_btn{width:170px;line-height:20px;font-size:14px;border-radius: 3px;color: #fff;text-align: center;cursor: pointer;margin-bottom: 12px;padding:8px;}';
    // 绑定切换右侧按钮显示的事件
    xianzun_btns_wrap = document.querySelector(".xianzun_btns_wrap");
    xz_btns_ctr = document.querySelector(".xz_btns_ctr");
    xz_btns_con = document.querySelector(".xz_btns_con");
    xz_btns_ctr.addEventListener("click", function() {
        if (this.getAttribute("data-show") === "0") {
            xianzun_btns_wrap.style.right = "0px";
            this.querySelector("span").className = "xianzun_arrow_right";
            this.querySelectorAll("span")[1].innerHTML = xzlt("_收起下载按钮");
            this.setAttribute("data-show", "1");
        } else if (this.getAttribute("data-show") === "1") {
            xianzun_btns_wrap.style.right = "-196px";
            this.querySelector("span").className = "xianzun_arrow_left";
            this.querySelectorAll("span")[1].innerHTML = xzlt("_展开下载按钮");
            this.setAttribute("data-show", "0");
        }
    });
}

function addOutputWarp() {
    // 添加输出url的区域
    var outputImgUrlWrap = document.createElement("div");
    document.body.appendChild(outputImgUrlWrap);
    outputImgUrlWrap.outerHTML =
        '<div class="outputUrlWrap">' +
        '<div class="outputUrlClose" title="' + xzlt("_关闭") + '">X</div>' +
        '<div class="outputUrlTitle">' + xzlt("_图片url列表") + '</div>' +
        '<div class="outputUrlContent"></div>' +
        '<div class="outputUrlFooter">' +
        '<div class="outputUrlCopy" title="">' + xzlt("_复制图片url") + '</div>' +
        '</div>' +
        '</div>';
    styleE.innerHTML +=
        '.outputUrlWrap{padding: 20px 30px;width: 520px;background:#fff;border-radius: 20px;z-index: 9999;box-shadow: 0px 0px 15px #2ca6df;display: none;position: fixed;top: 15%; margin-left: -300px;left: 50%;}' +
        '.outputUrlTitle{height: 20px;line-height: 20px;text-align: center;font-size:18px;color:#179FDD;}' +
        '.outputUrlContent{border: 1px solid #ccc;transition: .3s;font-size: 14px;margin-top: 10px;padding: 5px 10px;overflow: auto;max-height:400px;line-height:20px;}' +
        '.outputUrlContent::selection{background:#179FDD;color:#fff;}' +
        '.outputUrlFooter{height: 60px;text-align: center;}' +
        '.outputUrlClose{cursor: pointer;position: absolute;width: 30px;height: 30px;top:20px;right:30px;z-index: 9999;font-size:18px;text-align:center;}' +
        '.outputUrlClose:hover{color:#179FDD;}' +
        '.outputUrlCopy{height: 34px;line-height: 34px;min-width:100px;padding: 2px 25px;margin-top: 15px;background:#179FDD;display:inline-block;color:#fff;font-size:14px;border-radius:6px;cursor:pointer;}';
    // 绑定关闭输出url区域的事件
    $(".outputUrlClose").on("click", function() {
        $(".outputUrlWrap").hide();
    });
    // 绑定复制url的事件
    $(".outputUrlCopy").on("click", function() {
        var range = document.createRange();
        range.selectNodeContents($(".outputUrlContent")[0]);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand('copy');
        // 改变提示文字
        $(".outputUrlCopy").text(xzlt("_已复制到剪贴板"));
        setTimeout(function() {
            window.getSelection().removeAllRanges();
            $(".outputUrlCopy").text(xzlt("_复制图片url"));
        }, 2000);
    });

    // 设置下载区域
    var outputWrap = document.createElement("div");
    document.body.appendChild(outputWrap);
    outputWrap.outerHTML =
        '<div class="outputWrap">' +
        '<div class="outputWrap_head">' +
        '<span class="outputWrap_title blue">' + xzlt("_下载设置") + '</span>' +
        '<div class="outputWrap_close" title="' + xzlt("_隐藏") + '">X</div>' +
        '</div>' +
        '<div class="outputWrap_con">' +
        '<p>' + xzlt("_设置命名规则", '<span class="imgNum blue">0</span>') + '</p>' +
        '<p>' +
        '<input type="text" name="fileNameRule" class="fileNameRule" value="{id}">' +
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' +
        '<span class="blue showFileNameTip">' + xzlt("_查看可用的标记") + '</span>' +
        '</p>' +
        '<p class="fileNameTip tip">' +
        '<span class="blue">{id}</span>' +
        xzlt("_可用标记1") + '"63011502_p0"' +
        '<br>' +
        '<span class="blue">{title}</span>' +
        xzlt("_可用标记2") +
        '<br>' +
        '<span class="blue">{tags}</span>' +
        xzlt("_可用标记3") +
        '<br>' +
        '<span class="blue">{user}</span>' +
        xzlt("_可用标记4") +
        '<br>' +
        '<span class="blue">{userid}</span>' +
        xzlt("_可用标记6") +
        '<br>' +
        '<span class="blue">{px}</span>' +
        xzlt("_可用标记7") +
        '<br>' +
        '<span class="blue">{bmk}</span>' +
        xzlt("_可用标记8") +
        '<br>' +
        xzlt("_可用标记5") +
        '<br></p>' +
        '<div class="outputWrap_btns">' +
        '<div class="startDownload" style="background:#00A514;">' + xzlt("_下载按钮1") + '</div>' +
        '<div class="pauseDownload" style="background:#e49d00;">' + xzlt("_下载按钮2") + '</div>' +
        '<div class="stopDownload" style="background:#e42a2a;">' + xzlt("_下载按钮3") + '</div>' +
        '<div class="copyUrl" style="background:#179FDD;">' + xzlt("_下载按钮4") + '</div>' +
        '</div>' +
        '<div class="outputWrap_down_tips">' +
        '<p>' +
        xzlt("_当前状态") +
        '<span class="down_status blue">' + xzlt("_未开始下载") + '</span>' +
        '</p>' +
        '<div>' +
        xzlt("_下载进度：") +
        '<div class="right1">' +
        '<div class="progressBar progressBar1">' +
        '<div class="progress progress1"></div>' +
        '</div>' +
        '<div class="progressTip progressTip1">' +
        '<span class="downloaded">0</span>' +
        '/' +
        '<span class="imgNum">0</span>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="outputWrap_down_list">' +
        '<p>' + xzlt("_下载线程：") + '</p>' +
        '<ul>' +
        '<li class="donwloadBar">' +
        '<div class="progressBar progressBar2">' +
        '<div class="progress progress2"></div>' +
        '</div>' +
        '<div class="progressTip progressTip2">' +
        '<span class="download_fileName"></span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + xzlt("_已下载") + '&nbsp;&nbsp;<span class="loaded">0/0</span>KB' +
        '</div>' +
        '</li>' +
        '</ul>' +
        '</div>' +
        '<a class="download_a" download=""></a>' +
        '<p class="blue showDownTip">' + xzlt("_查看下载说明") + '</p>' +
        '<p class="downTip tip">' + xzlt("_下载说明") + '</p>' +
        '</div>' +
        '</div>';
    styleE.innerHTML +=
        'li{list-style: none;}' +
        '.outputWrap{display:none;width: 650px;position: fixed;left: -350px;margin-left: 50%;background: #fff;top: 13%;color: #333;z-index: 999;font-size: 14px;padding: 25px;border-radius: 15px;border:1px solid #ddd;box-shadow: 0px 0px 25px #2ca6df;}' +
        '.outputWrap p{line-height: 24px;}' +
        '.outputWrap .blue{color: #03a4e2;}' +
        '.outputWrap .tip{color: #999;}' +
        '.outputWrap_head{height: 30px;position: relative;padding-bottom: 10px;}' +
        '.outputWrap_title{display: block;line-height: 30px;text-align: center;font-size: 18px;}' +
        '.outputWrap_close{font-size: 18px;position: absolute;top: 0px;right: 0px;width: 30px;height: 30px;text-align: center;cursor: pointer;}' +
        '.outputWrap_close:hover{color:#4a9fff;}' +
        '.fileNameRule{min-width: 200px;line-height: 20px;font-size: 14px;height: 20px;text-indent: 4px;}' +
        '.showFileNameTip{cursor: pointer;}' +
        '.fileNameTip{display: none;padding-top: 5px;}' +
        '.outputWrap_btns{padding: 15px 0 8px;font-size: 0;}' +
        '.outputWrap_btns div{display: inline-block;min-width: 100px;padding: 0 10px;text-align: center;height: 36px;line-height: 36px;color: #fff;border-radius: 4px;margin-right: 35px;font-size: 14px;cursor: pointer;}' +
        '.outputWrap_down_tips{padding: 10px 0 0;line-height: 28px;}' +
        '.download_progress1{position: relative;}' +
        '.right1{position: relative;display: inline-block;width: 500px;height: 22px;vertical-align: middle;}' +
        '.progressBar{position: absolute;background: #6792A2;height: 22px;border-radius: 11px;}' +
        '.progress{background: #15BEFF;height: 22px;border-radius: 11px;transition: .15s;}' +
        '.progressTip{color: #fff;position: absolute;line-height: 22px;font-size: 14px;}' +
        '.progressBar1{width: 500px;}' +
        '.progress1{width:0%;}' +
        '.progressTip1{width: 500px;text-align: center;}' +
        '.outputWrap_down_list{display:none;}' +
        '.outputWrap_down_list ul{padding-top: 5px;}' +
        '.donwloadBar{position: relative;width: 100%;padding: 5px 0;height: 22px;box-sizing:content-box;}' +
        '.progressBar2{width: 100%;}' +
        '.progress2{width:0%;}' +
        '.progressTip2{width: 100%;}' +
        '.download_fileName{max-width: 60%;white-space:nowrap;  text-overflow:ellipsis;overflow: hidden;vertical-align:top;display: inline-block;text-indent: 1em;}' +
        '.showDownTip{padding-top: 10px;cursor: pointer;display: inline-block;}' +
        '.download_a{display: none;}' +
        '.downTip{display: none;}';
    // 绑定下载区域的相关事件
    $(".outputWrap_close").on("click", function() {
        $(".outputWrap").hide();
    });
    $(".showFileNameTip").on("click", function() {
        $(".fileNameTip").toggle();
    });
    $(".showDownTip").on("click", function() {
        $(".downTip").toggle();
    });
    // 开始下载按钮
    $(".startDownload").on("click", function() { // 准备下载
        if (download_started || download_pause === "ready_pause" || download_stop === "ready_stop" || img_info.length === 0) { // 如果正在下载中，或正在进行暂停任务，或正在进行停止任务，则不予处理
            return false;
        }
        // 重置一些条件
        download_started = true;
        if (!download_pause) { // 如果没有暂停，则重新下载，否则继续下载
            downloaded = 0;
            $(".downloaded").html("0");
            $(".download_fileName").html("");
            $(".loaded").html("0/0");
            $(".progress").css("width", "0%");
        }
        download_pause = false;
        download_pause_num = 0;
        download_stop = false;
        download_stop_num = 0;
        fileNameRule = $(".fileNameRule").val();

        // 启动或继续 建立并发下载线程
        $(outputInfo).html($(outputInfo).html() + xzlt("_正在下载中") + "<br>");
        for (var i = 0; i < download_thread; i++) {
            if (i + downloaded < img_info.length) {
                (function(ii) {
                    setTimeout(function() {
                        startDownload(ii + downloaded, ii);
                    }, 100);
                })(i);
            }
        }
        $(".down_status").html(xzlt("_正在下载中"));
        donwloadBar_list = $(".donwloadBar");
        download_a = document.querySelector(".download_a");
    });
    // 暂停下载按钮
    $(".pauseDownload").on("click", function() {
        if (img_info.length === 0) {
            return false;
        }
        if (download_stop === true) { // 停止的优先级高于暂停。点击停止可以取消暂停状态，但点击暂停不能取消停止状态
            return false;
        }
        if (download_pause === false) {
            if (download_started) { // 如果正在下载中
                download_pause = "ready_pause"; //发出暂停信号
                $(".down_status").html(xzlt("_正在暂停"));
            } else { // 不在下载中的话不允许启用暂停功能
                return false;
            }
        }
    });
    // 停止下载按钮
    $(".stopDownload").on("click", function() {
        if (img_info.length === 0) {
            return false;
        }
        if (download_stop === false) {
            if (download_started) { // 如果正在下载中
                download_stop = "ready_stop"; //发出停止下载的信号
                $(".down_status").html(xzlt("_正在停止"));
            } else { // 不在下载中的话允许启用停止功能
                download_stop = true;
                $(".down_status").html('<span style="color:#f00"' + xzlt("_下载已停止") + '</span>');
                $(outputInfo).html($(outputInfo).html() + xzlt("_下载已停止") + "<br><br>");
            }
            download_pause = false;
        }
    });
    // 复制url按钮
    $(".copyUrl").on("click", function() { // 显示图片url列表
        if (img_info.length === 0) {
            return false;
        }
        var result = "";
        for (var i = 0; i < img_info.length; i++) {
            result = result + img_info[i].url + "<br>";
        }
        $(".outputUrlContent").html(result);
        $(".outputUrlWrap").show();
    });

    // 添加控制下载区域的按钮
    var outputlWrap_ctr = document.createElement("div");
    outputlWrap_ctr.id = "outputlWrap_ctr";
    xz_btns_con.appendChild(outputlWrap_ctr);
    $(outputlWrap_ctr).text(xzlt("_显示隐藏下载面板"));
    $(outputlWrap_ctr).attr("title", xzlt("_显示隐藏下载面板"));
    setButtonStyle(outputlWrap_ctr, -1, "#179FDD");
    outputlWrap_ctr.addEventListener("click", function() {
        $(".outputWrap").toggle();
    }, false);
}

// 开始下载 下载序号，要使用的显示队列的序号
function startDownload(downloadNo, donwloadBar_no) {
    quick = false;
    // 处理宽高
    var px = "";
    if (fileNameRule.indexOf("{px}") > -1) {
        if (!!img_info[downloadNo].fullWidth) {
            px = img_info[downloadNo].fullWidth + "x" + img_info[downloadNo].fullHeight;
        }
    }
    // 处理收藏数
    var bmk = "";
    if (page_type === 5 && fileNameRule.indexOf("{bmk}") > -1) {
        var now_id = img_info[downloadNo].id.split("_")[0];
        for (var i = imgList.length - 1; i >= 0; i--) {
            if (imgList[i].id == now_id) {
                bmk = "bmk" + imgList[i].num + "-";
            }
        }
    }
    // 拼接文件名
    var fullFileName = fileNameRule.replace("{id}", img_info[downloadNo].id).replace("{title}", img_info[downloadNo].title).replace("{user}", img_info[downloadNo].user).replace("{px}", px).replace("{userid}", img_info[downloadNo].userid).replace("{tags}", img_info[downloadNo].tags.join(",")).replace("{bmk}", bmk).replace(safe_fileName_rule, "_").replace(/undefined/g, "");
    // 处理文件名长度 这里有个问题，因为无法预知浏览器下载文件夹的长度，所以只能预先设置一个预设值
    fullFileName = fullFileName.substr(0, fileName_length) + "." + img_info[downloadNo].ext;
    donwloadBar_list.eq(donwloadBar_no).find('.download_fileName').html(fullFileName);
    GM_xmlhttpRequest({
        method: "GET",
        url: img_info[downloadNo].url,
        headers: {
            referer: "https://www.pixiv.net/"
        },
        overrideMimeType: "text/plain; charset=x-user-defined",
        onprogress: function(xhr) {
            // 显示下载进度
            var loaded = parseInt(xhr.loaded / 1000);
            var total = parseInt(xhr.total / 1000);
            donwloadBar_list.eq(donwloadBar_no).find('.loaded').html(loaded + "/" + total);
            donwloadBar_list.eq(donwloadBar_no).find('.progress').css("width", loaded / total * 100 + "%");
        },
        onload: function(xhr) {
            var r = xhr.responseText,
                data = new Uint8Array(r.length),
                i = 0;
            while (i < r.length) {
                data[i] = r.charCodeAt(i);
                i++;
            }
            var fileType = ""; // 判断文件类型
            if (img_info[downloadNo].ext === "jpg") {
                fileType = "image/jpeg";
            } else if (img_info[downloadNo].ext === "png") {
                fileType = "image/png";
            } else if (img_info[downloadNo].ext === "zip") {
                fileType = "application/x-zip-compressed";
            }
            var blob = new Blob([data], {
                type: fileType
            });
            var blobURL = window.URL.createObjectURL(blob);
            download_a.href = blobURL;
            download_a.setAttribute("download", fullFileName);
            download_a.click();
            window.URL.revokeObjectURL(blobURL);
            // 下载之后
            downloaded++;
            $(".downloaded").html(downloaded);
            $(".progress1").css("width", downloaded / img_info.length * 100 + "%");
            if (downloaded === img_info.length) { // 如果所有文件都下载完毕
                download_started = false;
                download_stop = false;
                download_pause = false;
                downloaded = 0;
                $(".down_status").html(xzlt("_下载完毕"));
                $(outputInfo).html($(outputInfo).html() + xzlt("_下载完毕") + "<br><br>");
                setTimeout(function() {
                    if (!quiet_download) {
                        alert(xzlt("_下载完毕"));
                    }
                }, 200);
            } else { // 如果没有全部下载完毕
                //如果需要暂停下载
                if (download_pause === "ready_pause") {
                    download_pause_num++; // 统计中断数量
                    if (download_pause_num === download_thread) {
                        $(outputInfo).html($(outputInfo).html() + xzlt("_已暂停") + "<br>");
                        $(".down_status").html('<span style="color:#d25b03">' + xzlt("_已暂停") + '</span>');
                        download_started = false;
                        download_pause = true;
                        download_pause_num = 0;
                        return false;
                    }
                } else if (download_pause) { // 如果已经完成暂停
                    download_started = false;
                    return false;
                }

                //如果需要停止下载
                if (download_stop === "ready_stop") {
                    download_stop_num++; // 统计中断数量
                    if (download_stop_num === download_thread) {
                        $(outputInfo).html($(outputInfo).html() + xzlt("_已停止") + "<br>");
                        $(".down_status").html('<span style="color:#f00">' + xzlt("_已停止") + '</span>');
                        download_started = false;
                        download_stop = true;
                        download_stop_num = 0;
                        return false;
                    }
                } else if (download_stop) { // 如果已经停止下载
                    download_started = false;
                    return false;
                }

                // 继续添加任务
                if (downloaded + download_thread - 1 < img_info.length) { // 如果已完成的数量 加上 线程中未完成的数量，仍然没有达到文件总数
                    startDownload(downloaded + download_thread - 1, donwloadBar_no); // 这里需要减一，就是downloaded本次自增的数字，否则会跳一个序号
                }
            }
        }
    });
}

// 清空图片信息并重置输出区域，在重复抓取时使用
function resetResult() {
    img_info = [];
    $(".outputWrap").hide();
    $(".outputUrlContent").text("");
    download_started = false;
    download_pause = false;
    download_stop = false;
}

// --------------------------------------------------------------------------

if (loc_url.indexOf("illust_id") > -1 && loc_url.indexOf("mode=manga") == -1 && loc_url.indexOf("bookmark_detail") == -1 && loc_url.indexOf("bookmark_add") == -1) { //1.on_illust_list，作品页内页
    page_type = 1;

    addBtnsAreaCtrl();
    addOutputWarp();

    (function() {
        var startBotton = document.createElement("div");
        xz_btns_con.appendChild(startBotton);
        $(startBotton).text(xzlt("_快速下载本页"));
        setButtonStyle(startBotton, 0, "#00A514");
        startBotton.addEventListener("click", function() {
            quick = true;
            startGet();
        }, false);
    })();

    (function() {
        var startBotton = document.createElement("div");
        xz_btns_con.appendChild(startBotton);
        $(startBotton).text(xzlt("_从本页开始下载"));
        setButtonStyle(startBotton, 1, "#00A514");
        startBotton.addEventListener("click", function() {
            startGet();
        }, false);
    })();

    setFilterWH(2);
    setNotDownType(3);
    setFilterTag_Need(4);
    setFilterTag_notNeed(5);

} else if ((loc_url.indexOf("member_illust.php?id=") > -1 || loc_url.indexOf("&id=") > -1) && (loc_url.indexOf("&tag") == -1 && loc_url.indexOf("?tag") == -1)) { //2.on_illust_list
    page_type = 2;
    listPage_finished = 0; //向下第几页
    base_url = loc_url.split("&p=")[0] + "&p=";

    if (!!$(".page-list .current")[0]) { //如果显示有页码
        startpage_no = Number($(".page-list .current").eq(0).text()); //最开始时的页码
    } else { //否则认为只有1页
        startpage_no = 1;
    }

    addBtnsAreaCtrl();
    addOutputWarp();

    (function() {
        var downloadBotton = document.createElement("div");
        xz_btns_con.appendChild(downloadBotton);
        $(downloadBotton).text(xzlt("_下载该画师的作品"));
        $(downloadBotton).attr("title", xzlt("_下载该画师的作品") + xzlt("_默认下载多页"));
        setButtonStyle(downloadBotton, 0, "#00A514");
        downloadBotton.addEventListener("click", function() {
            startGet();
        }, false);
    })();

    setFilterWH(1);
    setNotDownType(2);
    setFilterTag_Need(3);
    setFilterTag_notNeed(4);

} else if ((loc_url.indexOf("bookmark.php") > -1 && loc_url.indexOf("tag=") > -1) || (loc_url.indexOf("member_illust.php?id=") > -1 && loc_url.indexOf("&tag=") > -1)) { //3.on_tagpage

    page_type = 3;
    listPage_finished = 0; //向下第几页
    base_url = loc_url.split("&p=")[0] + "&p=";

    if (!!$(".page-list .current")[0]) { //如果显示有页码
        startpage_no = Number($(".page-list .current").eq(0).text()); //最开始时的页码
    } else { //否则认为只有1页
        startpage_no = 1;
    }

    addBtnsAreaCtrl();
    addOutputWarp();

    (function() {
        var downloadBotton = document.createElement("div");
        xz_btns_con.appendChild(downloadBotton);
        $(downloadBotton).text(xzlt("_下载该tag中的作品"));
        $(downloadBotton).attr("title", xzlt("_下载该tag中的作品") + xzlt("_默认下载多页"));
        setButtonStyle(downloadBotton, 0, "#00A514");
        downloadBotton.addEventListener("click", function() {
            startGet();
        }, false);
    })();

    setFilterWH(1);
    setNotDownType(2);
    setFilterTag_Need(3);
    setFilterTag_notNeed(4);

} else if (loc_url.indexOf("bookmark.php") > -1 && loc_url.indexOf("tag=") == -1) { //4.on_bookmark
    page_type = 4;
    listPage_finished = 0; //向下第几页

    /*
    //根据排序方式选择对应的url 该方法较为繁琐，但作为备用方法保留
    var now_order_element=$(".menu-items").eq(2).find("a.current");
    if (now_order_element.attr("href").indexOf("order=date") === -1) { //如果是按收藏顺序排序
        if (now_order_element.text().indexOf("↓")>-1) { //倒序
            base_url="https://www.pixiv.net/bookmark.php?rest=show&order=desc&p=";
        }else if (now_order_element.text().indexOf("↑")>-1) {   //正序
            base_url="https://www.pixiv.net/bookmark.php?rest=show&order=asc&p=";
        }
    }else{  //如果是按投稿时间顺序排序
        if (now_order_element.text().indexOf("↓")>-1) { //倒序
            base_url="https://www.pixiv.net/bookmark.php?rest=show&order=date_d&p=";
        }else if (now_order_element.text().indexOf("↑")>-1) {   //正序
            base_url="https://www.pixiv.net/bookmark.php?rest=show&order=date&p=";
        }
    }
    */

    if (!!$(".page-list .current")[0]) { //如果显示有页码，则是2页及以上
        startpage_no = Number($(".page-list .current").eq(0).text()); //当前所处的页码
        base_url = "https://www.pixiv.net/bookmark.php" + $(".page-list").eq(0).find("a").eq(0).attr("href").split("&p=")[0] + "&p="; //从页码中取值，作为列表页url的规则（等同于上面注释里的代码，但更便捷）
    } else { //否则只有1页
        startpage_no = 1;
        base_url = loc_url + "&p=";
    }

    addBtnsAreaCtrl();
    addOutputWarp();

    (function() {
        var downloadBotton = document.createElement("div");
        xz_btns_con.appendChild(downloadBotton);
        $(downloadBotton).text(xzlt("_下载书签"));
        $(downloadBotton).attr("title", xzlt("_下载书签") + xzlt("_默认下载多页"));
        setButtonStyle(downloadBotton, 0, "#00A514");
        downloadBotton.addEventListener("click", function() {
            startGet();
        }, false);
    })();

    setFilterWH(1);
    setNotDownType(2);
    setFilterTag_Need(3);
    setFilterTag_notNeed(4);

} else if (loc_url.indexOf("search.php?") > -1) { //5.on_tagsearch
    page_type = 5;

    if ($("#js-mount-point-search-result-list").length > 0) { // tag搜索页新版
        tag_search_is_new = true;
        tag_search_lv1_selector = "#js-mount-point-search-result-list";
        tag_search_lv2_selector = "._7IVJuWZ";
        tag_search_list_selector = "._7IVJuWZ";
        tag_search_multiple_selector = "._2UNGFcb";
        tag_search_gif_selector = "._3DUGnT4";
        tag_search_new_html =
            // 因为tag搜索页新版将结果储存在一个div标签的属性里,而不是直接输出到html,但我们需要呈现html,所以需要模拟生成的元素
            '<div class="_7IVJuWZ">' +
            '<figure class="gmzooM4" style="width: 200px; max-height: 288px;">' +
            '<div class="_1NxDA4N">' +
            '<a href="/member_illust.php?mode=medium&illust_id=xz_illustId" rel="noopener" class="bBzsEVG">' +
            '<!--xz_multiple_html-->' +
            '<img alt="" class="_1QvROXv" width="xz_width" height="xz_height" src="xz_url">' +
            '<!--xz_gif_html-->' +
            '</a>' +
            '<div class="thumbnail-menu">' +
            '<div class="_one-click-bookmark js-click-trackable xz_isBookmarked" data-click-category="abtest_www_one_click_bookmark" data-click-action="illust" data-click-label="xz_illustId" data-type="illust" data-id="xz_illustId" style="position: static;"></div>' +
            '<div class="_balloon-menu-opener">' +
            '<div class="opener"></div>' +
            '<section class="_balloon-menu-popup">' +
            '<ul class="_balloon-menu-closer menu">' +
            '<li>' +
            '<span class="item">' + xzlt("_屏蔽设定") + '</span>' +
            '</li>' +
            '<li>' +
            '<a class="item" target="_blank" href="/illust_infomsg.php?illust_id=xz_illustId">' + xzlt("_举报") + '</a>' +
            '</li>' +
            '</ul>' +
            '</section>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<figcaption class="_1-dF98p">' +
            '<ul>' +
            '<li class="_1Q-G7T5">' +
            '<a href="/member_illust.php?mode=medium&illust_id=xz_illustId" title="xz_illustTitle">xz_illustTitle</a>' +
            '</li>' +
            '<li>' +
            '<a href="/member_illust.php?id=xz_userId" target="_blank" title="xz_userName" class="js-click-trackable ui-profile-popup _3mThRAs" data-click-category="recommend 20130415-0531" data-click-action="ClickToMember" data-click-label="" data-user_id="xz_userId" data-user_name="xz_userName">' +
            '<span class="_1vrcjFY">' +
            '<div class="" style="background: url(xz_userImage) center top / cover no-repeat; width: 16px; height: 16px;"></div>' +
            '</span>' +
            '<span class="_3UHUppl">xz_userName</span>' +
            '</a>' +
            '</li>' +
            '<li style="position: relative;">' +
            '<ul class="count-list">' +
            '<li>' +
            '<a href="/bookmark_detail.php?illust_id=xz_illustId" class="_ui-tooltip bookmark-count"> <i class="_icon sprites-bookmark-badge"></i>xz_bookmarkCount</a>' +
            '</li>' +
            '</ul>' +
            '</li>' +
            '</ul>' +
            '</figcaption>' +
            '</figure>' +
            '</div>';
        xz_multiple_html = '<div class="SN11CHZ"><span><span class="_2UNGFcb"></span>xz_pageCount</span></div>';
        xz_gif_html = '<div class="_3DUGnT4"></div>';
    } else if ($(".autopagerize_page_element").length > 0) { // tag搜索页旧版
        tag_search_is_new = false;
        tag_search_lv1_selector = ".autopagerize_page_element";
        tag_search_list_selector = ".autopagerize_page_element .image-item";
        tag_search_multiple_selector = ".multiple";
        tag_search_gif_selector = ".ugoku-illust";
    }

    base_url = loc_url.split("&p=")[0] + "&p=";
    startpage_no = Number($(".page-list .current").eq(0).text()); //最开始时的页码
    listPage_finished = 0; //向下第几页
    var imgList = []; //储存所有作品

    tagSearchDel();

    // 根据对象的属性排序
    function sortByProperty(propertyName) {
        return function(object1, object2) {
            var value1 = object1[propertyName];
            var value2 = object2[propertyName];
            if (value2 < value1) { //倒序排列
                return -1;
            } else if (value2 > value1) {
                return 1;
            } else {
                return 0;
            }
        };
    }

    // 对结果列表进行排序
    function listSort() {
        imgList.sort(sortByProperty("num"));
        $(tag_search_list_selector).remove();
        for (var i = 0; i < imgList.length; i++) {
            $("#js-react-search-mid").append(imgList[i].e);
        }
    }

    addBtnsAreaCtrl();
    addOutputWarp();

    // 添加快速筛选功能
    var nowTag = $(".column-title a").text().split(" ")[0];
    var favNums = ["100users入り", "500users入り", "1000users入り", "3000users入り", "5000users入り", "10000users入り"]; //200和2000的因为数量太少，不添加
    styleE.innerHTML += ".fastScreenArea a{display:inline-block;padding:10px;margin:0 25px;}"
    var fastScreenArea = document.createElement("div");
    fastScreenArea.className = "fastScreenArea";
    var insetParent = document.querySelector("._unit");
    insetParent.insertBefore(fastScreenArea, insetParent.querySelector("#js-react-search-top"));
    for (var i = 0; i < favNums.length; i++) {
        fastScreenArea.innerHTML += "<a href='" + "https://www.pixiv.net/search.php?s_mode=s_tag&word=" + nowTag + " " + favNums[i] + "'>" + favNums[i] + "</a>";
    }

    (function() {
        var startBotton = document.createElement("div");
        xz_btns_con.appendChild(startBotton);
        $(startBotton).text(xzlt("_按收藏数筛选"));
        $(startBotton).attr("title", xzlt("_按收藏数筛选_title"));
        setButtonStyle(startBotton, 1, "#00A514");
        startBotton.addEventListener("click", function() {
            if (interrupt) {
                interrupt = false;
            }
            startGet();
        }, false);
    })();

    (function() {
        var filterSelf = document.createElement("div");
        xz_btns_con.appendChild(filterSelf);
        $(filterSelf).text(xzlt("_在结果中筛选"));
        $(filterSelf).attr("title", xzlt("_在结果中筛选_title"));
        setButtonStyle(filterSelf, 2, "#0096DB");
        filterSelf.addEventListener("click", function() {
            var allPicArea = $(tag_search_list_selector);
            var want_favorite_number2 = prompt(xzlt("_在结果中筛选弹窗"), "1500");
            if (!want_favorite_number2) {
                return false;
            } else if (isNaN(Number(want_favorite_number2)) || ~~Number(want_favorite_number2) <= 0) {
                alert(xzlt("_参数不合法1"));
                return false;
            } else {
                want_favorite_number2 = ~~Number(want_favorite_number2);
            }
            for (var i = 0; i < allPicArea.length; i++) {
                if (allPicArea.eq(i).find("._ui-tooltip").eq(0).text() < want_favorite_number2) { //必须限制序号0，不然对图片的回应数也会连起来
                    allPicArea.eq(i).hide(); //这里把结果中不符合二次过滤隐藏掉，而非删除
                } else {
                    allPicArea.eq(i).show();
                }
            }
            outputNowResult();
        }, false);
    })();

    (function() {
        var downloadBotton = document.createElement("div");
        xz_btns_con.appendChild(downloadBotton);
        $(downloadBotton).text(xzlt("_下载当前作品"));
        $(downloadBotton).attr("title", xzlt("_下载当前作品_title"));
        setButtonStyle(downloadBotton, 3, "#00A514");
        downloadBotton.addEventListener("click", function() {
            getListPage2();
        }, false);
    })();

    setFilterWH(4);

    (function() {
        var stopFilter = document.createElement("div");
        xz_btns_con.appendChild(stopFilter);
        $(stopFilter).text(xzlt("_中断当前任务"));
        $(stopFilter).attr("title", xzlt("_中断当前任务_title"));
        setButtonStyle(stopFilter, 5, "#e42a2a");
        stopFilter.addEventListener("click", function() {
            interrupt = true;
            if (!allow_work) {
                $("#outputInfo").html($("#outputInfo").html() + "<br>" + xzlt("_当前任务已中断") + "<br><br>");
                alert(xzlt("_当前任务已中断"));
            }
        }, false);
    })();

    setFilterTag_notNeed(6);
    $("#nottag").text(xzlt("_下载时排除tag"));

    (function() {
        var clearMultiple = document.createElement("div");
        xz_btns_con.appendChild(clearMultiple);
        $(clearMultiple).text(xzlt("_清除多图作品"));
        $(clearMultiple).attr("title", xzlt("_清除多图作品_title"));
        setButtonStyle(clearMultiple, 7, "#E42A2A");
        clearMultiple.addEventListener("click", function() {
            var allPicArea = $(tag_search_list_selector);
            for (var i = 0; i < allPicArea.length; i++) {
                if (!!allPicArea.eq(i).find(tag_search_multiple_selector)[0]) {
                    allPicArea.eq(i).remove();
                }
            }
            outputNowResult();
        }, false);
    })();

    (function() {
        var clearUgoku = document.createElement("div");
        xz_btns_con.appendChild(clearUgoku);
        $(clearUgoku).text(xzlt("_清除动图作品"));
        $(clearUgoku).attr("title", xzlt("_清除动图作品_title"));
        setButtonStyle(clearUgoku, 8, "#E42A2A");
        clearUgoku.addEventListener("click", function() {
            var allPicArea = $(tag_search_list_selector);
            for (var i = 0; i < allPicArea.length; i++) {
                if (!!allPicArea.eq(i).find(tag_search_gif_selector)[0]) {
                    allPicArea.eq(i).remove();
                }
            }
            outputNowResult();
        }, false);
    })();

    (function() {
        var deleteBotton = document.createElement("div");
        deleteBotton.id = "deleteBotton";
        xz_btns_con.appendChild(deleteBotton);
        $(deleteBotton).text(xzlt("_手动删除作品"));
        $(deleteBotton).attr("title", xzlt("_手动删除作品_title"));
        $(deleteBotton).attr("data_del", "0");
        setButtonStyle(deleteBotton, 9, "#e42a2a");
        $("#deleteBotton").bind("click", function() {
            if ($("#deleteBotton").attr("data_del") === "0") {
                $("#deleteBotton").attr("data_del", "1");
                $("#deleteBotton").text(xzlt("_退出手动删除"));
            } else if ($("#deleteBotton").attr("data_del") === "1") {
                $("#deleteBotton").attr("data_del", "0");
                $("#deleteBotton").text(xzlt("_手动删除作品"));
            }
        });
    })();

    (function() {
        var clearBotton = document.createElement("div");
        xz_btns_con.appendChild(clearBotton);
        $(clearBotton).text(xzlt("_清空作品列表"));
        $(clearBotton).attr("title", xzlt("_清空作品列表_title"));
        setButtonStyle(clearBotton, 10, "#e42a2a");
        clearBotton.addEventListener("click", function() {
            $(tag_search_list_selector).remove();
        }, false);
    })();

} else if (loc_url.indexOf("ranking_area.php") > -1 && loc_url !== "https://www.pixiv.net/ranking_area.php") { //6.on_ranking_area
    page_type = 6;

    addBtnsAreaCtrl();
    addOutputWarp();

    (function() {
        var downloadBotton = document.createElement("div");
        xz_btns_con.appendChild(downloadBotton);
        $(downloadBotton).text(xzlt("_下载本页作品"));
        $(downloadBotton).attr("title", xzlt("_下载本页作品_title"));
        setButtonStyle(downloadBotton, 0, "#00A514");
        downloadBotton.addEventListener("click", function() {
            startGet();
        }, false);
    })();

    (function() {
        var clearMultiple = document.createElement("div");
        xz_btns_con.appendChild(clearMultiple);
        $(clearMultiple).text(xzlt("_清除多图作品"));
        $(clearMultiple).attr("title", xzlt("_清除多图作品_title"));
        setButtonStyle(clearMultiple, 2, "#DA7002");
        clearMultiple.addEventListener("click", function() {
            var allPicArea = $(".ranking-item");
            for (var i = 0; i < allPicArea.length; i++) {
                if (allPicArea.eq(i).find("a").eq(1).attr("class").indexOf("multiple") > -1 || allPicArea.eq(i).find("a").eq(1).attr("class").indexOf("manga") > -1) {
                    allPicArea.eq(i).remove();
                }
            }
            alert(xzlt("_已清除多图作品"));
        }, false);
    })();

    (function() {
        var clearGif = document.createElement("div");
        xz_btns_con.appendChild(clearGif);
        $(clearGif).text(xzlt("清除动图作品"));
        $(clearGif).attr("title", xzlt("_清除动图作品_title"));
        setButtonStyle(clearGif, 3, "#DA7002");
        clearGif.addEventListener("click", function() {
            var allPicArea = $(".ranking-item");
            for (var i = 0; i < allPicArea.length; i++) {
                if (allPicArea.eq(i).find("a").eq(1).attr("class").indexOf("ugoku") > -1) {
                    allPicArea.eq(i).remove();
                }
            }
            alert(xzlt("_已清除动图作品"));
        }, false);
    })();

    setFilterWH(1);
    setFilterTag_notNeed(4);
    setFilterTag_Need(5);

} else if (loc_url.indexOf("ranking.php") > -1) { //7.on_ranking_else
    page_type = 7;

    if (loc_url !== "https://www.pixiv.net/ranking.php") {
        base_url = loc_url + "&p=";
    } else {
        base_url = loc_url + "?p=";
    }

    startpage_no = 1; //从第一页（部分）开始抓取
    listPage_finished = 0; //已经向下抓取了几页（部分）

    if ((base_url.indexOf("mode=daily") > -1 || base_url.indexOf("mode=weekly") > -1) && base_url.indexOf("r18") == -1) {
        part_number = 10; //排行榜页面一开始有50张作品，如果页面到了底部，会再向下加载，现在已知每日排行榜是10部分，日榜的r18是2部分，其他是6部分。为防止有未考虑到的情况出现，所以在获取列表页时里判断了404状态码。
    } else if ((base_url.indexOf("mode=daily") > -1 || base_url.indexOf("mode=weekly") > -1) && base_url.indexOf("r18") > -1) {
        part_number = 2;
    } else if (base_url.indexOf("r18g") > -1) {
        part_number = 1;
    } else {
        part_number = 6;
    }

    addBtnsAreaCtrl();
    addOutputWarp();

    (function() {
        var downloadBotton = document.createElement("div");
        xz_btns_con.appendChild(downloadBotton);
        $(downloadBotton).text(xzlt("_下载本排行榜作品"));
        $(downloadBotton).attr("title", xzlt("_下载本排行榜作品_title"));
        setButtonStyle(downloadBotton, 0, "#00A514");
        downloadBotton.addEventListener("click", function() {
            startGet();
        }, false);
    })();

    setFilterWH(1);
    setNotDownType(2);
    setFilterTag_Need(3);
    setFilterTag_notNeed(4);

} else if (loc_url.indexOf("https://www.pixivision.net") > -1 && loc_url.indexOf("/a/") > -1) { //8.on_pixivision
    page_type = 8;

    var type = $("a[data-gtm-action=ClickCategory]").eq(0).attr("data-gtm-label");
    if (type == "illustration" || type == "manga" || type == "cosplay") { //在插画、漫画、cosplay类型的页面上创建下载功能

        addBtnsAreaCtrl();
        addOutputWarp();

        // 创建下载按钮
        (function() {
            var downloadBotton = document.createElement("div");
            xz_btns_con.appendChild(downloadBotton);
            $(downloadBotton).html(xzlt("_下载该页面的图片"));
            setButtonStyle(downloadBotton, 1, "#00A514");
            downloadBotton.addEventListener("click", function() {
                $(".logo-area h1").hide();
                document.body.insertBefore(outputInfo, $(".body-container")[0]);
                resetResult();
                var imageList = []; //图片元素的列表
                if (type == "illustration") { // 针对不同的类型，选择器不同
                    imageList = $(".am__work__main img");
                    var urls = [];
                    // 插画有首图，并且网页里的图片是小图，所以要特殊处理
                    var topImgSrc = $("._article-illust-eyecatch").css("backgroundImage").split("\"")[1];
                    urls.push(topImgSrc.replace("c/768x1200_80/img-master", "img-original").replace("_master1200", "")); //添加首图的url 此时是不确定后缀名是否正确的url
                    for (var i = 0; i < imageList.length; i++) { // 把图片url添加进数组
                        urls.push(imageList[i].src.replace("c/768x1200_80/img-master", "img-original").replace("_master1200", ""));
                    }
                    test_suffix_no = 0;

                    for (var j = 0; j < urls.length; j++) {
                        var id = urls[j].split("/");
                        id = id[id.length - 1].split(".")[0]; //作品id
                        setTimeout(testExtName(urls[j], urls.length, {
                            id: id,
                            title: "",
                            tags: [],
                            user: "",
                            userid: "",
                            fullWidth: "",
                            fullHeight: ""
                        }), j * ajax_for_illust_delay);
                    }
                } else {
                    imageList = $(".fab__image-block__image img");
                    for (var i = 0; i < imageList.length; i++) { // 把图片url添加进数组
                        var imgUrl = imageList[i].src;
                        if (imgUrl === "https://i.pximg.net/imgaz/upload/20170407/256097898.jpg") { // 跳过Cure的logo图片
                            continue;
                        }
                        var id = imgUrl.split("/");
                        id = id[id.length - 1].split(".")[0]; //作品id
                        var ext = imgUrl.split(".");
                        ext = ext[ext.length - 1]; //扩展名
                        addImgInfo(id, imgUrl, "", [], "", "", "", "", ext);
                    }
                    allWorkFinished();
                }
            }, false);
        })();
    }

} else if (loc_url.indexOf("bookmark_add.php?id=") > -1 || loc_url.indexOf("bookmark_detail.php?illust_id=") > -1 || loc_url.indexOf("recommended.php") > -1) { //9.on_bookmark_add
    // bookmark_add的页面刷新就变成bookmark_detail了; recommended.php是首页的“为你推荐”栏目
    // 在收藏后的相似图片页面，可以获得收藏数，如 https://www.pixiv.net/bookmark_detail.php?illust_id=63706584
    page_type = 9;

    max_num = 300; //设置最大允许获取多少个相似图片。这个数字是可以改的，比如500,1000，这里限制为300。

    addBtnsAreaCtrl();
    addOutputWarp();

    (function() {
        var downloadBotton = document.createElement("div");
        xz_btns_con.appendChild(downloadBotton);
        if (loc_url.indexOf("recommended.php") > -1) {
            $(downloadBotton).text(xzlt("_下载推荐图片"));
            $(downloadBotton).attr("title", xzlt("_下载推荐图片_title"));
        } else {
            $(downloadBotton).text(xzlt("_下载相似图片"));
        }
        setButtonStyle(downloadBotton, 0, "#00A514");
        downloadBotton.addEventListener("click", function() {
            requset_number = parseInt(window.prompt(xzlt("_要获取的作品个数") + max_num, "50"));
            if (isNaN(requset_number)) {
                alert(xzlt("_参数不合法1"));
                return false;
            } else if (requset_number > max_num) {
                alert(xzlt("_超过最大值") + max_num);
                return false;
            }
            startGet();
        }, false);
    })();

    setFilterWH(1);
    setNotDownType(2);
    setFilterTag_Need(3);
    setFilterTag_notNeed(4);

} else if (loc_url.indexOf("bookmark_new_illust") > -1 || loc_url.indexOf("new_illust.php") > -1 || loc_url.indexOf("new_illust_r18.php") > -1) { //10.bookmark_new_illust and new_illust 关注的人的新作品 以及 大家的新作品
    page_type = 10;

    addBtnsAreaCtrl();
    addOutputWarp();

    if (loc_url.indexOf("bookmark_new_illust") > -1) { // 其实这个条件和条件2在一定程度上是重合的，所以这个必须放在前面。
        max_num = 100; //关注的人的新作品（包含普通版和r18版）的最大页数是100
        if (loc_url.indexOf("r18") > -1) {
            base_url = "https://www.pixiv.net/bookmark_new_illust_r18.php?p="; //列表页url规则
        } else {
            base_url = "https://www.pixiv.net/bookmark_new_illust.php?p="; //列表页url规则
        }
    } else if (loc_url.indexOf("new_illust.php") > -1) {
        max_num = 1000; //大家的新作品（普通版）的最大页数是1000
        base_url = "https://www.pixiv.net/new_illust.php?p="; //列表页url规则
    } else if (loc_url.indexOf("new_illust_r18.php") > -1) {
        max_num = 500; //大家的的新作品（r18版）的最大页数是500
        base_url = "https://www.pixiv.net/new_illust_r18.php?p="; //列表页url规则
    }
    if (!!$(".page-list .current")[0]) { //如果显示有页码
        startpage_no = Number($(".page-list .current").eq(0).text()); //以当前页的页码为起始页码
    } else { //否则认为只有1页
        startpage_no = 1;
    }
    listPage_finished = 0;

    (function() {
        var downloadBotton = document.createElement("div");
        xz_btns_con.appendChild(downloadBotton);
        $(downloadBotton).text(xzlt("_从本页开始下载"));
        $(downloadBotton).attr("title", xzlt("_下载大家的新作品"));
        setButtonStyle(downloadBotton, 0, "#00A514");
        downloadBotton.addEventListener("click", function() {
            startGet();
        }, false);
    })();

    setFilterWH(1);
    setNotDownType(2);
    setFilterTag_Need(3);
    setFilterTag_notNeed(4);
} else if (window.location.pathname === "/discovery") { //11.discover 发现
    // 其实发现页面和9收藏后的推荐页面一样，先获取列表再下载。但是发现页面有个特点是每次获取的数据会变动，这样下载到的图片和用户在左侧看到的图片不同，效果不太好。所以这里改用直接下载左侧已有作品的办法
    page_type = 11;

    tag_search_list_selector = "._131AzaV"; // 发现作品的已有作品，借用tag搜索页的变量名，直接拿来用
    tag_search_multiple_selector = "._2UNGFcb"; // 多图的选择器，借用tag搜索页的变量名，直接拿来用
    tag_search_gif_selector = "._3DUGnT4"; // 动图的选择器，借用tag搜索页的变量名，直接拿来用

    addBtnsAreaCtrl();
    addOutputWarp();

    (function() {
        var downloadBotton = document.createElement("div");
        xz_btns_con.appendChild(downloadBotton);
        $(downloadBotton).text(xzlt("_下载当前作品"));
        $(downloadBotton).attr("title", xzlt("_下载当前作品_title"));
        setButtonStyle(downloadBotton, 0, "#00A514");
        downloadBotton.addEventListener("click", function() {
            startGet();
        }, false);
    })();

    setFilterWH(1);
    setFilterTag_Need(2);
    setFilterTag_notNeed(3);

    (function() {
        var clearMultiple = document.createElement("div");
        xz_btns_con.appendChild(clearMultiple);
        $(clearMultiple).text(xzlt("_清除多图作品"));
        $(clearMultiple).attr("title", xzlt("_清除多图作品_title"));
        setButtonStyle(clearMultiple, 4, "#E42A2A");
        clearMultiple.addEventListener("click", function() {
            var allPicArea = $(tag_search_list_selector);
            for (var i = 0; i < allPicArea.length; i++) {
                if (!!allPicArea.eq(i).find(tag_search_multiple_selector)[0]) {
                    allPicArea.eq(i).remove();
                }
            }
            outputNowResult();
        }, false);
    })();

    (function() {
        var clearUgoku = document.createElement("div");
        xz_btns_con.appendChild(clearUgoku);
        $(clearUgoku).text(xzlt("_清除动图作品"));
        $(clearUgoku).attr("title", xzlt("_清除动图作品_title"));
        setButtonStyle(clearUgoku, 5, "#E42A2A");
        clearUgoku.addEventListener("click", function() {
            var allPicArea = $(tag_search_list_selector);
            for (var i = 0; i < allPicArea.length; i++) {
                if (!!allPicArea.eq(i).find(tag_search_gif_selector)[0]) {
                    allPicArea.eq(i).remove();
                }
            }
            outputNowResult();
        }, false);
    })();

    (function() {
        var deleteBotton = document.createElement("div");
        deleteBotton.id = "deleteBotton";
        xz_btns_con.appendChild(deleteBotton);
        $(deleteBotton).text(xzlt("_手动删除作品"));
        $(deleteBotton).attr("title", xzlt("_手动删除作品_title"));
        $(deleteBotton).attr("data_del", "0");
        setButtonStyle(deleteBotton, 6, "#e42a2a");
        $("#deleteBotton").bind("click", function() {
            $(tag_search_list_selector).bind("click", function() {
                if ($("#deleteBotton").attr("data_del") === "1") {
                    this.remove();
                    if (allow_work) {
                        outputNowResult();
                    }
                    return false;
                }
            });
            if ($("#deleteBotton").attr("data_del") === "0") {
                $("#deleteBotton").attr("data_del", "1");
                $("#deleteBotton").text(xzlt("_退出手动删除"));
            } else if ($("#deleteBotton").attr("data_del") === "1") {
                $("#deleteBotton").attr("data_del", "0");
                $("#deleteBotton").text(xzlt("_手动删除作品"));
            }
        });
    })();

    (function() {
        var clearBotton = document.createElement("div");
        xz_btns_con.appendChild(clearBotton);
        $(clearBotton).text(xzlt("_清空作品列表"));
        $(clearBotton).attr("title", xzlt("_清空作品列表_title"));
        setButtonStyle(clearBotton, 7, "#e42a2a");
        clearBotton.addEventListener("click", function() {
            $(tag_search_list_selector).remove();
        }, false);
    })();
}
