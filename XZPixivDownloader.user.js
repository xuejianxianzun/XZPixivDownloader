// ==UserScript==
// @name        仙尊 Pixiv 图片批量下载器
// @name:ja     XZ Pixiv Batch Downloader
// @name:en     XZ Pixiv Batch Downloader
// @namespace   http://saber.love/?p=3102
// @version     6.2.9
// @description 批量下载画师、收藏夹、排行榜、搜索页等页面里的作品原图，可以自动建立文件夹。查看热门作品；转换动图为 gif；屏蔽广告；快速收藏作品（自动添加tag）；不跳转直接查看多 p 作品；按收藏数快速搜索 tag。支持简繁中文、日语、英语。github: https://github.com/xuejianxianzun/XZPixivDownloader
// @description:ja Pixiv ピクチャバッチダウンローダ，クイックブックマーク，広告をブロックする，エトセトラ。
// @description:en Pixiv image downloader, quick bookmarks, block ads, etc.
// @author      xuejianxianzun 雪见仙尊
// @include     *://www.pixiv.net/*
// @include     *://www.pixivision.net/*
// @license     GPL-3.0-or-later; http://www.gnu.org/licenses/gpl-3.0.txt
// @icon        https://www.pixiv.net/favicon.ico
// @grant       GM_xmlhttpRequest
// @grant       GM_download
// @connect     i.pximg.net
// @connect     i1.pixiv.net
// @connect     i2.pixiv.net
// @connect     i3.pixiv.net
// @connect     i4.pixiv.net
// @connect     i5.pixiv.net
// @connect     imgaz.pixiv.net
// @run-at      document-end
// ==/UserScript==

/* author:  xuejianxianzun 雪见仙尊
 * E-mail:  xuejianxianzun@gmail.com
 * Github： https://github.com/xuejianxianzun/XZPixivDownloader
 * blog:    https://saber.love/pixiv
 * QQ群:    499873152
 */

'use strict';

if (typeof jQuery === 'undefined') { // 新版的一些页面没有jQuery了，按需引入jQuery
	fetch('https://code.jquery.com/jquery-2.0.3.min.js', {
		method: 'get'
	}).then(function (response) {
		response.text()
			.then(function (data) {
				let element = document.createElement('script');
				element.setAttribute('type', 'text/javascript');
				element.innerHTML = data;
				document.head.appendChild(element);
				if (typeof jQuery === 'function') {
					XZDownloader();
				}
			});
	});
} else if (typeof jQuery === 'function') {
	XZDownloader();
}

function XZDownloader() {
	let quiet_download = true, // 是否快速下载。当可以下载时自动开始下载（无需点击下载按钮）
		download_thread_deauflt = 6, // 同时下载的线程数，可以通过设置 download_thread 修改
		multiple_down_number = 0, // 设置多图作品下载前几张图片。0为不限制，全部下载。改为1则只下载第一张。这是因为有时候多p作品会导致要下载的图片过多，此时可以设置只下载前几张，减少下载量
		display_cover = true, //是否显示tag搜索页里面的封面图片。如果tag搜索页的图片数量太多，那么加载封面图可能要很久，并且可能因为占用大量带宽导致抓取中断。这种情况下可以将此参数改为false，不加载封面图。
		fileName_length = 200, // 文件名的最大长度，超出将会截断。如果文件的保存路径过长可能会保存失败，此时可以把这个数值改小些。
		tagName_to_fileName = true, // 添加标记名称
		viewer_enable = true, // 是否启用看图模式
		xz_setting, // 保存的设置
		loc_url, // 页面的url
		page_type, // 页面类型
		old_page_type, // 上一个页面类型
		tag_mode, // page_type 2 里，是否带 tag
		works_type, //	page_type 2 里的页面类型
		offset_number = 0, // 要去掉的作品数量
		once_request = 100, // 每次请求多少个数量
		type2_id_list = [], // 储存 page_type 2 的 id 列表
		img_info = [], // 储存图片信息，其中可能会有空值，如 undefined 和 ''
		illust_url_list = [], //储存作品列表url的数组
		imgList = [], //储存tag搜索页的所有作品
		ajax_for_illust_threads = 5, //抓取页面时的并发连接数
		ajax_for_illust_delay = 100, //抓取页面的并发请求每个间隔多少毫秒
		ajax_threads_finished = 0, //统计有几个并发线程完成所有请求。统计的是并发数（ajax_for_illust_threads）而非请求数
		test_suffix_finished = true, //检查图片后缀名正确性的函数是否执行完毕
		test_suffix_no = 0, //检查图片后缀名函数的计数
		now_tips = '', //输出顶部提示
		base_url, //列表页url规则
		startpage_no, //列表页开始抓取时的页码
		listPage_finished = 0, //记录一共抓取了多少列表页
		listPage_finished2 = 0, //记录tag搜索页本次任务已经抓取了多少页
		want_page, //要抓取几页
		quick = false, // 快速下载当前页面，这个只在作品页内直接下载时使用
		interrupt = false, //是否中断正在进行的任务，目前仅在tag搜索页使用
		allow_work = true, //当前是否允许展开工作（如果有未完成的任务则会变为false
		notNeed_tag = [], //要排除的tag的列表
		need_tag = [], //必须包含的tag的列表
		notdown_type = '', //设置不要下载的作品类型
		is_set_filterWH = false, //是否设置了筛选宽高
		filterWH = {
			and_or: '&',
			width: 0,
			height: 0
		}, //宽高条件
		is_set_filterBMK = false, // 是否设置了筛选收藏数
		filterBMK = 0,
		part_number, //保存不同排行榜的列表数量
		requset_number = 0, //要下载多少个作品
		max_num = 0, //最多允许获取多少数量
		list_is_new, // 列表页加载模式是否是新版
		tag_search_lv1_selector, // tag搜索页，作品列表的父元素的选择器
		tag_search_lv2_selector, // tag搜索页，作品列表自身的选择器
		tag_search_list_selector, // tag搜索页，直接选择作品的选择器
		tag_search_multiple_selector, // tag搜索页，多图作品的选择器
		tag_search_gif_selector, // tag搜索页，动图作品的选择器
		tag_search_new_html, // tag搜索页作品的html
		xz_multiple_html, // tag搜索页作品的html中的多图标识
		xz_gif_html, // tag搜索页作品的html中的动图标识
		tag_search_new_html_one_page = '', // 拼接每一页里所有列表的html
		tag_search_temp_result, // 临时储存tag搜索每一页的结果
		fileNameRule = '',
		safe_fileName_rule = new RegExp(/\\|\/|:|\?|"|<|'|>|\*|\|/g), // 安全的文件名
		rightButton, // 右侧按钮
		centerWrap, // 中间设置面板
		center_btn_wrap, // 中间插入按钮的区域
		xz_blue = '#0ea8ef',
		xz_green = '#14ad27',
		xz_red = '#f33939',
		downloadBar_list, // 下载队列的dom元素
		download_thread, // 下载线程
		download_a, // 下载用的a标签
		download_started = false, // 下载是否已经开始
		downloaded = 0, // 已下载的文件
		download_stop = false, // 是否停止下载
		download_pause = false, // 是否暂停下载
		old_title = document.title, // 原始 title，需要加下载状态时使用
		title_timer,
		click_time = 0, // 点击下载按钮的时间戳
		time_delay = 0, // 延迟点击的时间
		time_interval = 400, // 为了不会漏下图，设置的两次点击之间的间隔时间。下载图片的速度越快，此处的值就需要越大。默认的400是比较大的，如果下载速度慢，可以尝试改成300/200。
		down_xiangguan = false, // 下载相关作品（作品页内的）
		viewerELCreated = false, // 是否已经创建了图片列表元素
		viewerWarpper, // 图片列表的容器
		viewerUl, // 图片列表的 ul 元素
		myViewer, // 查看器
		quickBookmarkElement, // 快速收藏的元素
		quickBookmarkId = 'quickBookmarkElement', // 快速收藏元素的 id
		download_gif_btn, // 下载 gif 的按钮
		convert_lib_load = { // 动图组件加载情况
			'zip_lib': null,
			'zip_workerScript': null,
			'zip_inflate': null,
			'gif_lib': null,
			'gif_workerScript': null,
		},
		check_convert_timer, // 检查动图是否可以转换时，使用的的定时器
		gif_img_list, // 储存 gif 图片列表的元素
		zip_file = null, // 获取的 zip 文件
		file_number = undefined, // 动图压缩包里有多少个文件
		gif_src = '', // 动图源文件 url
		gif_mime_type = '', // 图片 mime type
		gif_delay, // 动图帧延迟
		XZForm,
		XZTipEl,
		folder_info = {}, // 文件夹可以使用的命名信息
		folder_name_default = '', // 默认文件夹命名规则
		folder_name = '', // 用户设置的文件夹命名规则
		option_area_show = true,
		only_down_bmk,
		isFirefox = navigator.userAgent.indexOf('Firefox') >= 0;

	// 多语言配置
	let lang_type; // 语言类型
	let user_lang = document.documentElement.lang; //获取语言选项
	if (user_lang === 'zh' || user_lang === 'zh-CN' || user_lang === 'zh-Hans') { // 设置语言为简体中文
		lang_type = 0;
	} else if (user_lang === 'zh-Hant' || user_lang === 'zh-tw' || user_lang === 'zh-TW') { // 设置语言为繁体中文
		lang_type = 3;
	} else if (user_lang === 'ja') { // 设置语言为日语
		lang_type = 1;
	} else { // 其他语言设置为英语
		lang_type = 2;
	}

	// 日文和英文目前是机翻，欢迎了解这些语言的人对翻译进行完善
	let xz_lang = { // 储存语言配置。在属性名前面加上下划线，和文本内容做出区别。{}表示需要进行替换的部分
		'_过滤作品类型的按钮': [
			'排除指定类型的作品',
			'タイプでフィルタリングする',
			'Filter by works type',
			'排除指定類型的作品'
		],
		'_过滤作品类型的按钮_title': [
			'在下载前，您可以设置想要排除的作品类型。',
			'ダウンロードする前に、除外するタイプを設定することができます。',
			'Before downloading, you can set the type you want to exclude.',
			'在下載前，您可以設定想要排除的作品類型'
		],
		'_过滤作品类型的弹出框文字': [
			'请输入数字来设置下载时要排除的作品类型。\n如需多选，将多个数字连写即可\n如果什么都不输入，那么将不排除任何作品\n1: 排除单图\n2: 排除多图\n3: 排除动图\n4: 排除已经收藏的作品',
			'ダウンロード時に除外するタイプを設定する番号を入力してください。\nさまざまなオプションが必要な場合は、それを連続して入力することができます。\n1.単一の画像の作品を除外する\n2.複数の画像の作品を除外する\n3.うごイラの作品を除外する\n4: ブックマーク',
			'Please enter a number to set the type of you want to excluded when downloading.\nIf you need multiple choice, you can enter continuously.\n1: one-images works\n2.multiple-images works\n3.animat works\n4.bookmarked works',
			'請輸入數字來設定下載時要排除的作品類型。\n如需多選，將多個數字連寫即可\n如果什麼都不輸入，那麼將不排除任何作品\n1: 排除單圖\n2: 排除多圖\n3: 排除動圖\n4: 排除已經收藏的作品'
		],
		'_只下载已收藏': [
			'只下载已收藏',
			'ブックマークのみをダウンロードする',
			'Download only bookmarked works',
			'只下載已收藏'
		],
		'_只下载已收藏的提示': [
			'只下载已经收藏的作品',
			'既に収集された作品のみをダウンロードする',
			'Download only bookmarked works',
			'只下載已經收藏的作品'
		],
		'_设置作品类型': [
			'设置作品类型',
			'仕事のタイプを設定する',
			'Set the type of work',
			'設定作品類型'
		],
		'_设置作品类型的提示_center': [
			'下载哪些类型的作品',
			'ダウンロードする作品の種類',
			'Which types of works to download',
			'下載哪些類型的作品'
		],
		'_多p下载前几张': [
			'多图作品设置',
			'マルチピクチャワーク設定',
			'Multiple images work setting',
			'多圖作品設定'
		],

		'_多p下载前几张提示': [
			'如果数字大于 0，多图作品只会下载前几张图片。（按照设置的数量）',
			'数字が0より大きい場合、マルチピクチャは最初のいくつかのイメージのみをダウンロードします。 （設定数に応じて）',
			'If the number is greater than 0, the multiple images work will only download the first few images. (according to the number of settings)',
			'如果數字大於 0，多圖作品只會下載前幾張圖片。（依照設定的數量）'
		],
		'_排除tag的按钮文字': [
			'设置作品不能包含的tag',
			'作品に含まれていないタグを設定する',
			'Set the tag that the work can not contain',
			'設定作品不能包含的tag'
		],
		'_不能含有tag': [
			'不能含有 tag&nbsp;',
			'指定したタグを除外する',
			'Exclude specified tag',
			'不能含有 tag&nbsp;'
		],
		'_排除tag的按钮_title': [
			'在下载前，您可以设置想要排除的tag',
			'ダウンロードする前に、除外するタグを設定できます',
			'Before downloading, you can set the tag you want to exclude',
			'在下載前，您可以設定想要排除的tag'
		],
		'_排除tag的提示文字': [
			'您可在下载前设置要排除的tag，这样在下载时将不会下载含有这些tag的作品。区分大小写；如需排除多个tag，请使用英文逗号分隔。请注意要排除的tag的优先级大于要包含的tag的优先级。',
			'ダウンロードする前に、除外するタグを設定できます。ケースセンシティブ；複数のタグを設定する必要がある場合は、\',\'を分けて使用できます。除外されたタグは、含まれているタグよりも優先されます',
			'Before downloading, you can set the tag you want to exclude. Case sensitive; If you need to set multiple tags, you can use \',\' separated. The excluded tag takes precedence over the included tag',
			'您可在下載前設定要排除的tag，這樣在下載時將不會下載含有這些tag的作品。區分大小寫；如需排除多個tag，請使用英文逗號分隔。請注意要排除的tag的優先等級大於要包含的tag的優先等級。'
		],
		'_设置了排除tag之后的提示': [
			'本次任务设置了排除的tag:',
			'このタスクはタグを除外します：',
			'This task excludes tag:',
			'本次工作設定了排除的tag:'
		],
		'_必须tag的按钮文字': [
			'设置作品必须包含的tag',
			'作品に含める必要があるタグを設定する',
			'Set the tag that the work must contain',
			'設定作品必須包含的tag'
		],
		'_必须含有tag': [
			'必须含有 tag&nbsp;',
			'タグを含める必要があります',
			'Must contain tag',
			'必須含有 tag&nbsp;'
		],
		'_必须tag的按钮_title': [
			'在下载前，您可以设置必须包含的tag。',
			'ダウンロードする前に、含まれなければならないタグを設定することができます',
			'Before downloading, you can set the tag that must be included',
			'在下載前，您可以設定必須包含的tag。'
		],
		'_必须tag的提示文字': [
			'您可在下载前设置作品里必须包含的tag，区分大小写；如需包含多个tag，请使用英文逗号分隔。',
			'ダウンロードする前に、含まれなければならないタグを設定することができます。ケースセンシティブ；複数のタグを設定する必要がある場合は、\',\'を分けて使用できます。',
			'Before downloading, you can set the tag that must be included. Case sensitive; If you need to set multiple tags, you can use \',\' separated. ',
			'您可在下載前設定作品裡必須包含的tag，區分大小寫；如需包含多個tag，請使用英文逗號分隔。'
		],
		'_设置了必须tag之后的提示': [
			'本次任务设置了必须的tag：',
			'このタスクは、必要なタグを設定します：',
			'This task set the necessary tag: ',
			'本次工作設定了必須的tag：'
		],
		'_筛选宽高的按钮文字': [
			'设置宽高条件',
			'幅と高さの条件を設定する',
			'Set the width and height',
			'設定寬高條件'
		],
		'_筛选宽高的按钮_title': [
			'在下载前，您可以设置要下载的图片的宽高条件。',
			'ダウンロードする前に、ダウンロードする写真の幅と高さの条件を設定できます。',
			'Before downloading, you can set the width and height conditions of the pictures you want to download.',
			'在下載前，您可以設定要下載的圖片的寬高條件。'
		],
		'_筛选宽高的提示文字': [
			'请输入最小宽度和最小高度，不会下载不符合要求的图片。',
			'最小幅と最小高さを入力してください。要件を満たしていない画像はダウンロードされません。',
			'Please enter the minimum width and minimum height. Will not download images that do not meet the requirements',
			'請輸入最小寬度和最小高度，不會下載不符合要求的圖片。'
		],
		'_本次输入的数值无效': [
			'本次输入的数值无效',
			'無効な入力',
			'Invalid input',
			'本次輸入的數值無效'
		],
		'_设置成功': [
			'设置成功',
			'セットアップが正常に完了しました',
			'Set up successfully',
			'設定成功'
		],
		'_设置了筛选宽高之后的提示文字p1': [
			'本次任务设置了过滤宽高条件:宽度>=',
			'この作業では、フィルターの幅と高さの条件を設定します。幅≥',
			'This task sets the filter width and height conditions. Width ≥',
			'本次工作設定了篩選寬高條件:寬度>='
		],
		'_或者': [
			' 或者 ',
			' または ',
			' or ',
			' 或是 '
		],
		'_并且': [
			' 并且 ',
			' そして ',
			' and ',
			' 並且 '
		],
		'_高度设置': [
			'高度>=',
			'高さ≥',
			'height ≥',
			'高度>='
		],
		'_个数': [
			'设置作品数量',
			'作品数を設定する',
			'Set the number of works',
			'設定作品數量'
		],
		'_页数': [
			'设置页面数量',
			'ページ数を設定する',
			'Set the number of pages',
			'設定頁面數量'
		],
		'_页数提示': [
			'请输入要获取的页数',
			'取得するページ数を入力してください',
			'Please enter the number of pages to get',
			'請輸入要取得的頁數'
		],
		'_筛选收藏数的按钮文字': [
			'设置收藏数量',
			'お気に入りの数を設定する',
			'Set the bookmarkCount conditions',
			'設定收藏數量'
		],
		'_筛选收藏数的按钮_title': [
			'在下载前，您可以设置对收藏数量的要求。',
			'ダウンロードする前に、お気に入り数の要件を設定することができます。',
			'Before downloading, You can set the requirements for the number of bookmarks.',
			'在下載前，您可以設定對收藏數量的要求。'
		],
		'_筛选收藏数_center': [
			'设置收藏数量',
			'ブックマークの数を設定する',
			'Set the number of bookmarks',
			'設定收藏數量'
		],
		'_筛选收藏数的提示_center': [
			'如果作品的收藏数小于设置的数字，作品不会被下载。',
			'作品のブックマークの数が設定された数よりも少ない場合、作品はダウンロードされません。',
			'If the number of bookmarks of the work is less than the set number, the work will not be downloaded.',
			'如果作品的收藏數小於設定的數字，作品不會被下載。'
		],
		'_筛选收藏数的提示文字': [
			'请输入一个数字，如果作品的收藏数小于这个数字，作品不会被下载。',
			'数字を入力してください。 作品のブックマークの数がこの数より少ない場合、作品はダウンロードされません。',
			'Please enter a number. If the number of bookmarks of the work is less than this number, the work will not be downloaded.',
			'請輸入一個數字，如果作品的收藏數小於這個數字，作品不會被下載。'
		],
		'_设置了筛选收藏数之后的提示文字': [
			'本次任务设置了收藏数条件:收藏数>=',
			'このタスクは、お気に入りの数を設定します。条件：お気に入りの数≥',
			'This task sets the number of bookmarks condition: number of bookmarks ≥',
			'本次工作設定了收藏數條件:收藏數>='
		],
		'_本次任务已全部完成': [
			'本次任务已全部完成。',
			'このタスクは完了しました。',
			'This task has been completed.',
			'本次工作已全部完成'
		],
		'_当前任务尚未完成1': [
			'当前任务尚未完成，请等到提示完成之后再设置新的任务。',
			'現在のタスクはまだ完了していません。お待ちください。',
			'The current task has not yet completed, please wait.',
			'目前工作尚未完成，請等到提示完成之後再設定新的工作。'
		],
		'_check_want_page_rule1_arg1': [
			'从本页开始下载<br>如果要下载全部作品，请保持默认值。<br>如果需要设置下载的作品数，请输入从1开始的数字，1为仅下载当前作品。',
			'このページからダウンロードする<br>すべての作品をダウンロードしたい場合は、デフォルト値のままにしてください。<br>ダウンロード数を設定する必要がある場合は、1から始まる番号を入力します。 現在の作品には1の番号が付けられています。',
			'Download from this page<br>If you want to download all the work, please leave the default value.<br>If you need to set the number of downloads, enter a number starting at 1. The current works are numbered 1.',
			'從本頁開始下載<br>如果要下載全部作品，請保持預設值。<br>如果需要設定下載的作品數，請輸入從1開始的數字，1為僅下載目前作品。'
		],
		'_check_want_page_rule1_arg2': [
			'参数不合法，本次操作已取消。<br>',
			'パラメータは有効ではありません。この操作はキャンセルされました。<br>',
			'Parameter is not legal, this operation has been canceled.<br>',
			'參數不合法，本次動作已取消。<br>'
		],
		'_check_want_page_rule1_arg3': [
			'任务开始<br>本次任务条件: 从本页开始下载-num-个作品',
			'タスクが開始されます。<br>このタスク条件：このページから-num-枚の作品をダウンロード。',
			'Task starts. <br>This task condition: Download -num- works from this page.',
			'工作開始<br>本次工作條件: 從本頁開始下載-num-個作品'
		],
		'_check_want_page_rule1_arg4': [
			'任务开始<br>本次任务条件: 向下获取所有作品',
			'タスクが開始されます。<br>このタスク条件：このページからすべての作品をダウンロードする。',
			'Task starts. <br>This task condition: download all the work from this page.',
			'工作開始<br>本次工作條件: 向下取得所有作品'
		],
		'_check_want_page_rule1_arg5': [
			'从本页开始下载<br>如果不限制下载的页数，请不要修改此默认值。<br>如果要限制下载的页数，请输入从1开始的数字，1为仅下载本页。',
			'このページからダウンロードする<br>ダウンロードしたページ数を制限しない場合は、デフォルト値のままにしておきます。<br>ダウンロードするページ数を設定する場合は、1から始まる番号を入力します。 現在のページは1です。',
			'Download from this page<br>If you do not limit the number of pages downloaded, leave the default value.<br>If you want to set the number of pages to download, enter a number starting at 1. This page is 1.',
			'從本頁開始下載<br>如果不限制下載的頁數，請不要變更此預設值。<br>如果要限制下載的頁數，請輸入從1開始的數字，1為僅下載本頁。'
		],
		'_check_want_page_rule1_arg8': [
			'从本页开始下载<br>如果要限制下载的页数，请输入从1开始的数字，1为仅下载本页。',
			'このページからダウンロードする<br>ダウンロードするページ数を設定する場合は、1から始まる番号を入力します。 現在のページは1です。',
			'Download from this page<br>If you want to set the number of pages to download, enter a number starting at 1. This page is 1.',
			'從本頁開始下載<br>如果要限制下載的頁數，請輸入從1開始的數字，1為僅下載本頁。'
		],
		'_check_want_page_rule1_arg6': [
			'任务开始<br>本次任务条件: 从本页开始下载-num-页',
			'タスクが開始されます。<br>このタスク条件：現在のページから-num-ページ',
			'Task starts. <br>This task condition: download -num- pages from the current page',
			'工作開始<br>本次工作條件: 從本頁開始下載-num-頁'
		],
		'_check_want_page_rule1_arg7': [
			'任务开始<br>本次任务条件: 下载所有页面',
			'タスクが開始されます。<br>このタスク条件：すべてのページをダウンロード',
			'Task starts. <br>This task condition: download all pages',
			'工作開始<br>本次工作條件: 下載所有頁面'
		],
		'_请输入最低收藏数和要抓取的页数': [
			'请输入最低收藏数和要抓取的页数，用英文逗号分开。\n类似于下面的形式: \n1000,1000',
			'お気に入りの最小数とクロールするページ数を，\',\'で区切って入力してください。\n例えば：\n1000,1000',
			'Please enter the minimum number of bookmarks, and the number of pages to be crawled, separated by \',\'.\nE.g:\n1000,1000',
			'請輸入最低收藏數和要擷取的頁數，用英文逗號分開。\n類似於下面的形式: \n1000,1000'
		],
		'_参数不合法1': [
			'参数不合法，请稍后重试。',
			'パラメータが合法ではありません。後でやり直してください。',
			'Parameter is not legal, please try again later.',
			'參數不合法，請稍後重試。'
		],
		'_tag搜索任务开始': [
			'任务开始<br>本次任务条件: 收藏数不低于{}，向下抓取{}页',
			'タスクが開始されます。<br>このタスク条件：ブックマークの数は{}ページ以上で、{}ページがクロールされます。',
			'Task starts. <br>This task condition: the number of bookmarks is not less than {}, {} pages down to crawl.',
			'工作開始<br>本次工作條件: 收藏數不低於{}，向下擷取{}頁'
		],
		'_want_page_弹出框文字_page_type10': [
			'你想要下载多少页？请输入数字。\r\n当前模式下，列表页的页数最多只有',
			'ダウンロードしたいページ数を入力してください。 \r\n最大値：',
			'Please enter the number of pages you want to download.\r\n The maximum value is ',
			'你想要下載多少頁？請輸入數字。\r\n目前模式下，清單頁的頁數最多只有'
		],
		'_输入超过了最大值': [
			'你输入的数字超过了最大值',
			'入力した番号が最大値を超えています',
			'The number you entered exceeds the maximum',
			'你輸入的數字超過了最大值'
		],
		'_多图作品下载张数': [
			'多图作品将下载前{}张图片',
			'2枚以上の作品，最初の{}枚の写真をダウンロードする',
			'Multi-artwork will download the first {} pictures',
			'多圖作品將下載前{}張圖片'
		],
		'_任务开始1': [
			'任务开始<br>本次任务条件: 从本页开始下载{}页',
			'タスクが開始されます。<br>このタスク条件：このページから{}ページをダウンロードする',
			'Task starts. <br>This task condition: download {} pages from this page',
			'工作開始<br>本次工作條件: 從本頁開始下載{}頁'
		],
		'_任务开始0': [
			'任务开始',
			'タスクが開始されます。',
			'Task starts.',
			'工作開始'
		],
		'_check_notdown_type_result1_弹窗': [
			'由于您排除了所有作品类型，本次任务已取消。',
			'すべての種類の作業を除外したため、タスクはキャンセルされました。',
			'Because you excluded all types of work, the task was canceled.',
			'由於您排除了所有作品類型，本次工作已取消。'
		],
		'_check_notdown_type_result1_html': [
			'排除作品类型的设置有误，任务取消!',
			'作業タイプの除外にエラー設定がありました。 タスクがキャンセルされました。',
			'There was an error setting for the exclusion of the work type. Task canceled.',
			'排除作品類型的設定有誤，工作取消!'
		],
		'_check_notdown_type_result2_弹窗': [
			'由于作品类型的设置有误，本次任务已取消。',
			'除外タイプを設定する際にエラーが発生しました。 タスクがキャンセルされました。',
			'There was an error setting for the exclusion of the work type. Task canceled.',
			'由於作品類型的設定有誤，本次工作已取消。'
		],
		'_check_notdown_type_result3_html': [
			'本次任务设置了排除作品类型:',
			'この作業では、これらのタイプの作品レーションは除外されます：',
			'This task excludes these types of works:',
			'本次工作設定了排除作品類型:'
		],
		'_单图': [
			'单图 ',
			'1枚の作品',
			'one images',
			'單圖 '
		],
		'_多图': [
			'多图 ',
			'2枚以上の作品',
			'multiple images',
			'多圖 '
		],
		'_动图': [
			'动图 ',
			'うごイラ',
			'GIF',
			'動圖 '
		],
		'_tag搜索页已抓取多少页': [
			'已抓取本次任务第{}/{}页，当前加载到第{}页',
			'{}/{}ページをクロールしています。 現在のページ番号は{}ページです',
			'Has been crawling {} / {} pages. The current page number is page {}',
			'已擷取本次工作第{}/{}頁，目前載入到第{}頁'
		],
		'_tag搜索页任务完成1': [
			'本次任务完成。当前有{}张作品。',
			'この作業は完了です。 今は{}枚の作品があります。',
			'This task is completed. There are now {} works.',
			'本次工作完成。目前有{}張作品。'
		],
		'_tag搜索页任务完成2': [
			'已抓取本tag的所有页面，本次任务完成。当前有{}张作品。',
			'この作業は完了です。 今は{}枚の作品があります。',
			'This task is completed. There are now {} works.',
			'已擷取本tag的所有頁面，本次工作完成。目前有{}張作品。'
		],
		'_tag搜索页中断': [
			'当前任务已中断!<br>当前有{}张作品。',
			'現在のタスクが中断されました。<br>今は{}枚の作品があります。',
			'The current task has been interrupted.<br> There are now {} works.',
			'目前工作已中斷!<br>目前有{}張作品。'
		],
		'_排行榜进度': [
			'已抓取本页面第{}部分',
			'このページの第{}部がクロールされました',
			'Part {} of this page has been crawled',
			'已擷取本頁面第{}部分'
		],
		'_排行榜任务完成': [
			'本页面抓取完成。当前有{}张作品，开始获取作品信息。',
			'このページはクロールされ、{}個の作品があります。 詳細は作品を入手し始める。',
			'This page is crawled and now has {} works. Start getting the works for more information.',
			'本頁面擷取完成。目前有{}張作品，開始取得作品資訊。'
		],
		'_列表页获取完成2': [
			'列表页获取完成。<br>当前有{}张作品，开始获取作品信息。',
			'リストページがクロールされます。<br>{}個の作品があります。 詳細は作品を入手し始める。',
			'The list page gets done. <br>Now has {} works. Start getting the works for more information.',
			'清單頁取得完成。<br>目前有{}張作品，開始取得作品資訊。'
		],
		'_列表页抓取进度': [
			'已抓取列表页{}个页面',
			'{}のリストページを取得しました',
			'Has acquired {} list pages',
			'已擷取清單頁{}個頁面'
		],
		'_列表页抓取完成': [
			'列表页面抓取完成，开始获取图片网址',
			'リストページがクロールされ、画像URLの取得が開始されます',
			'The list page is crawled and starts to get the image URL',
			'清單頁面擷取完成，開始取得圖片網址'
		],
		'_列表页抓取结果为零': [
			'抓取完毕，但没有找到符合筛选条件的作品。',
			'クロールは終了しましたが、フィルタ条件に一致する作品が見つかりませんでした。',
			'Crawl finished but did not find works that match the filter criteria.',
			'擷取完畢，但沒有找到符合篩選條件的作品。'
		],
		'_排行榜列表页抓取遇到404': [
			'本页面抓取完成。当前有{}张作品，开始获取作品信息。',
			'このページはクロールされます、{}個の作品があります。 詳細は作品を入手し始める。',
			'This page is crawled. Now has {} works. Start getting the works for more information.',
			'本頁面擷取完成。目前有{}張作品，開始取得作品資訊。'
		],
		'_当前任务尚未完成2': [
			'当前任务尚未完成，请等待完成后再下载。',
			'現在のタスクはまだ完了していません',
			'The current task has not yet been completed',
			'目前工作尚未完成，請等待完成後再下載。'
		],
		'_列表抓取完成开始获取作品页': [
			'当前列表中有{}张作品，开始获取作品信息',
			'{}個の作品があります。 詳細は作品を入手し始める。',
			'Now has {} works. Start getting the works for more information.',
			'目前清單中有{}張作品，開始取得作品資訊'
		],
		'_开始获取作品页面': [
			'<br>开始获取作品页面',
			'<br>作品ページの取得を開始する',
			'<br>Start getting the works page',
			'<br>開始取得作品頁面'
		],
		'_无权访问1': [
			'无权访问{}，抓取中断。',
			'アクセス{}、中断はありません。',
			'No access {}, interruption.',
			'無權造訪{}，擷取中斷。'
		],
		'_无权访问2': [
			'无权访问{}，跳过该作品。',
			'アクセス{}、無視する。',
			'No access {}, skip.',
			'無權造訪{}，跳過該作品。'
		],
		'_作品页状态码0': [
			'请求的url不可访问',
			'要求されたURLにアクセスできません',
			'The requested url is not accessible',
			'要求的url無法造訪'
		],
		'_作品页状态码400': [
			'该作品已被删除',
			'作品は削除されました',
			'The work has been deleted',
			'該作品已被移除'
		],
		'_作品页状态码403': [
			'无权访问请求的url 403',
			'リクエストされたURLにアクセスできない 403',
			'Have no access to the requested url 403',
			'無權造訪要求的url 403'
		],
		'_作品页状态码404': [
			'404 not found',
			'404 not found',
			'404 not found',
			'404 not found'
		],
		'_抓取图片网址的数量': [
			'已获取{}个图片网址',
			'{}つの画像URLを取得',
			'Get {} image URLs',
			'已取得{}個圖片網址'
		],
		'_正在抓取': [
			'正在抓取，请等待……',
			'取得中、しばらくお待ちください...',
			'Getting, please wait...',
			'正在擷取，請等待……'
		],
		'_获取全部书签作品': [
			'获取全部书签作品，时间可能比较长，请耐心等待。',
			'ブックマークしたすべての作品を入手すると、時間がかかることがあります。お待ちください。',
			'Get all bookmarked works, the time may be longer, please wait.',
			'取得全部書籤作品，時間可能比較長，請耐心等待。'
		],
		'_抓取图片网址遇到中断': [
			'当前任务已中断!',
			'現在のタスクが中断されました。',
			'The current task has been interrupted.',
			'目前工作已中斷!'
		],
		'_收起下载按钮': [
			'收起下载按钮',
			'ダウンロードボタンを非表示にする',
			'',
			'摺疊下載按鈕'
		],
		'_展开下载按钮': [
			'展开下载按钮',
			'ダウンロードボタンを表示',
			'',
			'展開下載按鈕'
		],
		'_展开收起下载按钮_title': [
			'展开/收起下载按钮',
			'ダウンロードボタンを表示/非表示',
			'Show / hide download button',
			'展開/摺疊下載按鈕'
		],
		'_关闭': [
			'关闭',
			'クローズド',
			'close',
			'關閉'
		],
		'_输出信息': [
			'输出信息',
			'出力情報',
			'Output information',
			'輸出資訊'
		],
		'_复制': [
			'复制',
			'コピー',
			'Copy',
			'複製'
		],
		'_已复制到剪贴板': [
			'已复制到剪贴板，可直接粘贴',
			'クリップボードにコピーされました',
			'Has been copied to the clipboard',
			'已複製到剪貼簿，可直接貼上'
		],
		'_下载设置': [
			'下载设置',
			'設定をダウンロードする',
			'Download settings',
			'下載設定'
		],
		'_隐藏': [
			'隐藏',
			'隠された',
			'hide',
			'隱藏'
		],
		'_收起展开设置项': [
			'收起/展开设置项',
			'設定の折りたたみ/展開',
			'Collapse/expand settings',
			'摺疊/展開設定項目'
		],
		'_Github': [
			'Github 页面，欢迎 star',
			'Githubのページ、starをクリックしてください',
			'Github page, if you like, please star it',
			'Github 頁面，歡迎 star'
		],
		'_firefox 扩展': [
			'查看本工具的 Firefox 扩展版。\n安装扩展版后，需要禁用脚本版。',
			'このツールには Firefox 拡張機能があります。\n 拡張機能をインストールしたら、このユーザースクリプトを無効にする必要があります。',
			'Check out the Firefox extension for this tool. \nAfter installing the extension, you need to disable this user script.',
			'查看本工具的 Firefox 擴展。\n安裝擴展版後，需要禁用這個用戶腳本。'
		],
		'_chrome 扩展': [
			'查看本工具的 Chrome 扩展版。\n安装扩展版后，需要禁用脚本版。',
			'このツールにはChrome拡張機能があります。\n 拡張機能をインストールしたら、このユーザースクリプトを無効にする必要があります。',
			'Check out the Chrome extension for this tool. \nAfter installing the extension, you need to disable this user script.',
			'查看本工具的 Chrome 擴展。\n安裝擴展版後，需要禁用這個用戶腳本。'
		],
		'_快捷键切换显示隐藏': [
			'使用 Alt + X，可以显示和隐藏下载面板',
			'Alt + Xを使用してダウンロードパネルを表示および非表示にする',
			'Use Alt + X to show and hide the download panel',
			'使用 Alt + X，可以顯示和隱藏下載面板'
		],
		'_设置命名规则': [
			'共抓取到{}个图片，请设置文件命名规则：',
			'合計{}枚の画像を取得し、ファイルの命名規則を設定してください：',
			'Grab a total of {} pictures, please set the file naming rules: ',
			'共擷取到{}個圖片，請設定檔案命名規則：'
		],
		'_设置命名规则3': [
			'共抓取到 {} 个图片',
			'合計 {} 枚の画像を取得し',
			'Grab a total of {} pictures',
			'共擷取到 {} 個圖片'
		],
		'_设置文件名': [
			'设置文件名&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;',
			'ファイル名を設定する',
			'Set file name',
			'設定檔案名稱'
		],
		'_设置文件夹名': [
			'设置文件夹名&nbsp;&nbsp;&nbsp;',
			'フォルダ名を設定する',
			'Set the folder name',
			'設定資料夾名'
		],
		'_添加标记名称': [
			'添加标记名称',
			'タグ名を追加する',
			'Add tag name',
			'加入標記名稱'
		],
		'_添加标记名称提示': [
			'把标签名称添加到文件名里',
			'ファイル名にタグ名を追加する',
			'Add the tag name to the file name',
			'將標籤名稱加到檔名中'
		],
		'_如何使用': [
			'如何使用',
			'使用方法',
			'how to use',
			'如何使用',
		],
		'_文件夹提示网址': [
			'https://s1.ax1x.com/2018/11/13/iOcXDK.png',
			'https://s1.ax1x.com/2018/11/13/iOcOu6.png',
			'https://s1.ax1x.com/2018/11/13/iOcbg1.png',
			'https://s1.ax1x.com/2018/11/13/iOcqjx.png',
		],
		'_查看标记的含义': [
			'查看标记的含义',
			'タグの意味を表示する',
			'View the meaning of the tag',
			'檢視標記的含義'
		],
		'_可用标记1': [
			'作品id',
			'作品ID',
			'works id',
			'作品id'
		],
		'_可用标记2': [
			'作品标题',
			'作品のタイトル',
			'works title',
			'作品標題'
		],
		'_可用标记3': [
			'作品的tag列表',
			'作品のtags',
			'Tags of works',
			'作品的tag清單'
		],
		'_可用标记4': [
			'画师的名字',
			'アーティスト名',
			'Artist name',
			'畫師的名字'
		],
		'_可用标记6': [
			'画师的id',
			'アーティストID',
			'Artist id',
			'畫師的id'
		],
		'_可用标记7': [
			'宽度和高度',
			'幅と高さ',
			'width and height',
			'寬度和高度'
		],
		'_可用标记8': [
			'bookmark-count，作品的收藏数。把它放在最前面就可以让下载后的文件按收藏数排序。',
			'bookmark-count，作品のコレクション数のコレクション数は。',
			'bookmark-count.',
			'bookmark-count，作品的收藏數。將它放在最前面就可以讓下載後的檔案依收藏數排序。'
		],
		'_可用标记5': [
			'你可以使用多个标记；建议在不同标记之间添加分割用的字符。示例：{id}-{userid}-{px}<br>* 在pixivision里，只有id标记会生效',
			'複数のタグを使用することができ；異なるタグ間に別の文字を追加することができます。例：{id}-{userid}-{px}<br>* pixivisionでは、idのみが利用可能です',
			'You can use multiple tags, and you can add a separate character between different tags. Example: {id}-{userid}-{px}<br>* On pixivision, only id is available',
			'你可以使用多個標記；建議在不同標記之間加入分割用的字元。範例：{id}-{userid}-{px}<br>* 在pixivision裡，只有id標記會生效'
		],
		'_文件夹标记_user': [
			'画师的名字',
			'アーティスト名',
			'Artist name',
			'畫師的名字'
		],
		'_文件夹标记_userid': [
			'画师的id',
			'アーティストID',
			'Artist id',
			'畫師的id'
		],
		'_文件夹标记_tag': [
			'当前页面的 tag',
			'現在のタグ',
			'Current tag',
			'當前頁面的 tag'
		],
		'_文件夹标记_id': [
			'作品id',
			'作品ID',
			'works id',
			'作品id'
		],
		'_文件夹标记_ptitle': [
			'网页的标题',
			'ページのタイトル',
			'The title of the page',
			'網頁的標題'
		],
		'_预览文件名': [
			'预览文件名',
			'ファイル名のプレビュー',
			'Preview file name',
			'預覽檔名'
		],
		'_设置下载线程': [
			'设置下载线程',
			'ダウンロードスレッドを設定する',
			'Set the download thread',
			'設定下載執行緒'
		],
		'_线程数字': [
			'可以输入 1-10 之间的数字，设置同时下载的数量',
			'同時ダウンロード数を設定するには、1〜10の数値を入力します',
			'You can enter a number between 1-10 to set the number of concurrent downloads',
			'可以輸入 1-10 之間的數字，設定同時下載的數量'
		],
		'_下载按钮1': [
			'开始下载',
			'start download',
			'start download',
			'開始下載'
		],
		'_下载按钮2': [
			'暂停下载',
			'puse download',
			'puse download',
			'暫停下載'
		],
		'_下载按钮3': [
			'停止下载',
			'stop download',
			'stop download',
			'停止下載'
		],
		'_下载按钮4': [
			'复制url',
			'copy urls',
			'copy urls',
			'複製url'
		],
		'_当前状态': [
			'当前状态 ',
			'現在の状態 ',
			'Now state ',
			'目前狀態 '
		],
		'_未开始下载': [
			'未开始下载',
			'まだダウンロードを開始していません',
			'Not yet started downloading',
			'未開始下載'
		],
		'_下载进度：': [
			'下载进度：',
			'ダウンロードの進捗状況：',
			'Download progress: ',
			'下載進度：'
		],
		'_下载线程：': [
			'下载线程：',
			'スレッド：',
			'Thread: ',
			'下載執行緒：'
		],
		'_查看下载说明': [
			'查看下载说明',
			'指示の表示',
			'View instructions',
			'檢視下載說明'
		],
		'_下载说明': [
			'下载的文件保存在浏览器的下载目录里。<br>.ugoira 后缀名的文件是动态图的源文件，可以使用软件 <a href="https://en.bandisoft.com/honeyview/" target="_blank">HoneyView</a> 查看。<br>请不要在浏览器的下载选项里选中\'总是询问每个文件的保存位置\'。<br>如果作品标题或tag里含有不能做文件名的字符，会被替换成下划线_。<br>如果下载进度卡住不动了，你可以先点击“暂停下载”按钮，之后点击“开始下载”按钮，尝试继续下载。',
			'ダウンロードしたファイルは、ブラウザのダウンロードディレクトリに保存されます。<br>.ugoiraサフィックスファイルは、動的グラフのソースファイルです，ソフトウェア <a href="https://en.bandisoft.com/honeyview/" target="_blank">HoneyView</a> を使用して表示することができます。<br>ダウンロードの進行状況が継続できない場合は、[ダウンロードの一時停止]ボタンをクリックし、[ダウンロードの開始]ボタンをクリックしてダウンロードを続行します。',
			'The downloaded file is saved in the browser`s download directory.<br>The .ugoira suffix file is the source file for the dynamic graph, Can be viewed using the software <a href="https://en.bandisoft.com/honeyview/" target="_blank">HoneyView</a>.<br>If the download progress is stuck, you can click the "Pause Download" button and then click the "Start Download" button to try to continue the download.',
			'下載的檔案儲存在瀏覽器的下載目錄裡。<br>.ugoira 後綴的檔案是動態圖的原始檔，可以使用軟體 <a href="https://en.bandisoft.com/honeyview/" target="_blank">HoneyView</a> 查看。<br>請不要在瀏覽器的下載選項裡選取\'總是詢問每個檔案的儲存位置\'。<br>如果作品標題或tag裡含有不能做檔名的字元，會被取代成下劃線_。<br>如果下載進度卡住不動了，你可以先點擊“暫停下載”按鈕，之後點擊“開始下載”按鈕，嘗試繼續下載。'
		],
		'_正在下载中': [
			'正在下载中',
			'ダウンロード',
			'downloading',
			'正在下載中'
		],
		'_正在暂停': [
			'任务正在暂停中，但当前位于下载线程中的文件会继续下载',
			'後でダウンロードが一時停止されます。',
			'The download will be paused later.',
			'工作正在暫停中，但目前位於下載執行緒中的檔案會繼續下載'
		],
		'_正在停止': [
			'任务正在停止中，但当前位于下载线程中的文件会继续下载',
			'ダウンロードは後で中止されます。',
			'The download will stop later.',
			'工作正在停止中，但目前位於下載執行緒中的檔案會繼續下載'
		],
		'_下载完毕': [
			'下载完毕!',
			'ダウンロードが完了しました',
			'Download finished',
			'下載完畢!'
		],
		'_已暂停': [
			'下载已暂停',
			'ダウンロードは一時停止中です',
			'Download is paused',
			'下載已暫停'
		],
		'_已停止': [
			'下载已停止',
			'ダウンロードが停止しました',
			'Download stopped',
			'下載已停止'
		],
		'_已下载': [
			'已下载',
			'downloaded',
			'downloaded',
			'已下載'
		],
		'_获取图片网址完毕': [
			'获取完毕，共{}个图片地址',
			'合計{}個の画像URLを取得する',
			'Get a total of {} image url',
			'取得完畢，共{}個圖片網址'
		],
		'_没有符合条件的作品': [
			'没有符合条件的作品!任务结束。',
			'基準を満たす作品はありません！タスクは終了します。',
			'There are no works that meet the criteria! The task ends.',
			'沒有符合條件的作品!工作結束。'
		],
		'_没有符合条件的作品弹窗': [
			'抓取完毕!没有符合条件的作品!',
			'クロールが終了しました！基準を満たす作品はありません',
			'Crawl finished! There are no works that meet the criteria! ',
			'擷取完畢!沒有符合條件的作品!'
		],
		'_抓取完毕': [
			'抓取完毕!',
			'クロールが終了しました！',
			'Crawl finished!',
			'擷取完畢!'
		],
		'_快速下载本页': [
			'快速下载本页作品',
			'この作品をすばやくダウンロードする',
			'Download this work quickly',
			'快速下載本頁作品'
		],
		'_转换为 GIF': [
			'转换为 GIF',
			'GIFに変換する',
			'Convert to GIF',
			'轉換為 GIF'
		],
		'_准备转换': [
			'准备转换',
			'変換する準備ができました',
			'Ready to convert',
			'準備轉換'
		],
		'_转换中请等待': [
			'转换中，请等待……',
			'変換ではお待ちください...',
			'In the conversion, please wait...',
			'轉換中，請等待……'
		],
		'_转换完成': [
			'转换完成',
			'変換完了',
			'Conversion completed',
			'轉換完成'
		],
		'_从本页开始下载': [
			'从本页开始下载作品',
			'このページからダウンロードできます',
			'Download works from this page',
			'從本頁開始下載作品'
		],
		'_请留意文件夹命名': [
			'请留意文件夹命名',
			'フォルダの命名に注意してください',
			'Please pay attention to folder naming',
			'請留意資料夾命名'
		],
		'_下载相关作品': [
			'下载相关作品',
			'関連作品をダウンロードする',
			'Download the related works',
			'下載相關作品'
		],
		'_相关作品大于0': [
			' （下载相关作品必须大于 0）',
			' （ダウンロード関連作品は0より大きくなければならない）',
			'  (Download related works must be greater than 0)',
			' （下載相關作品必須大於 0）'
		],
		'_下载作品': [
			'下载作品',
			'イメージをダウンロード',
			'Download works',
			'下載作品'
		],
		'_下载响应作品': [
			'下载响应作品',
			'イメージレスポンスの作品をダウンロードする',
			'Download the responses illustration',
			'下載回應作品'
		],
		'_下载该tag中的作品': [
			'下载该tag中的作品',
			'タグで作品をダウンロードする',
			'Download the work in the tag',
			'下載該tag中的作品'
		],
		'_下载书签': [
			'下载书签中的作品',
			'このブックマークでこの作品をダウンロード',
			'Download the works in this bookmark',
			'下載書籤中的作品'
		],
		'_默认下载多页': [
			', 如有多页，默认会下载全部。',
			'複数のページがある場合、デフォルトがダウンロードされます。',
			', If there are multiple pages, the default will be downloaded.',
			', 如有多頁，預設會下載全部。'
		],
		'_调整完毕': [
			'调整完毕，当前有{}张作品。',
			'調整が完了し、今、{}の作品があります。',
			'The adjustment is complete and now has {} works.',
			'調整完畢，目前有{}張作品。'
		],
		'_按收藏数筛选': [
			'按收藏数筛选',
			'お気に入りからのフィルター',
			'Filter by bookmarks',
			'依收藏數篩選'
		],
		'_按收藏数筛选_title': [
			'按收藏数筛选当前tag里的作品。如果多次筛选，页码会一直累加。',
			'現在のタグのエントリ数でフィルタリングします。多次过滤时，页码增加。',
			'Filter by the number of entries in the current tag. If you filter multiple times, the page number will increase.',
			'依收藏數篩選目前tag裡的作品。如果多次篩選，頁碼會一直累加。'
		],
		'_在结果中筛选': [
			'在结果中筛选',
			'結果のフィルタリング',
			'Filter in results',
			'在結果中篩選'
		],
		'_在结果中筛选_title': [
			'如果本页筛选后作品太多，可以提高收藏数的要求，在结果中筛选。达不到要求的会被隐藏而不是删除。所以你可以反复进行筛选。被隐藏的项目不会被下载。',
			'あなたは何度も選別することができて、要求の作品が隠されて、それからダウンロードされません。',
			'You can make multiple screening , fail to meet the required works will be hidden, and will not be downloaded.',
			'如果本頁篩選後作品太多，可以提高收藏數的要求，在結果中篩選。達不到要求的會被隱藏而不是刪除。所以你可以反覆進行篩選。被隱藏的項目不會被下載。'
		],
		'_在结果中筛选弹窗': [
			'将在当前作品列表中再次过滤，请输入要求的最低收藏数: ',
			'将在当前作品列表中再次筛选，请输入要求的最低收藏数',
			'Will be filtered again in the current list of works. Please enter the required minimum number of bookmarks:',
			'將在目前作品清單中再次篩選，請輸入要求的最低收藏數:'
		],
		'_下载当前作品': [
			'下载当前作品',
			'現在の作品をダウンロードする',
			'Download the current work',
			'下載目前作品'
		],
		'_下载当前作品_title': [
			'下载当前列表里的所有作品',
			'現在のリストにあるすべての作品をダウンロードする',
			'Download all the works in the current list',
			'下載目前清單裡的所有作品'
		],
		'_中断当前任务': [
			'中断当前任务',
			'現在のタスクを中断する',
			'Interrupt the current task',
			'中斷目前工作'
		],
		'_中断当前任务_title': [
			'筛选时中断之后可以继续执行。',
			'ふるい分け作品で中断され、その後引き続き実行可能です。',
			'In the screening works when the break, then you can continue to perform.',
			'篩選時中斷之後可以繼續執行。'
		],
		'_当前任务已中断': [
			'当前任务已中断!',
			'現在のタスクが中断されました',
			'The current task has been interrupted',
			'目前工作已中斷!'
		],
		'_下载时排除tag': [
			'下载时排除tag',
			'ダウンロード時にタグを除外する',
			'Exclude tags when downloading',
			'下載時排除tag'
		],
		'_清除多图作品': [
			'清除多图作品',
			'複数の図面を削除する',
			'Remove multi-drawing works',
			'清除多圖作品'
		],
		'_清除多图作品_title': [
			'如果不需要可以清除多图作品',
			'必要がない場合は、複数のグラフを削除することができます',
			'If you do not need it, you can delete multiple graphs',
			'如果不需要可以清除多圖作品'
		],
		'_清除动图作品': [
			'清除动图作品',
			'うごイラ作品を削除する',
			'Remove animat work',
			'清除動圖作品'
		],
		'_清除动图作品_title': [
			'如果不需要可以清除动图作品',
			'必要がない場合は、うごイラを削除することができます',
			'If you do not need it, you can delete the animat work',
			'如果不需要可以清除動圖作品'
		],
		'_手动删除作品': [
			'手动删除作品',
			'マニュアル削除作品',
			'Manually delete the work',
			'手動刪除作品'
		],
		'_手动删除作品_title': [
			'可以在下载前手动删除不需要的作品',
			'ダウンロードする前に不要な作品を手動で削除することができます',
			'You can manually delete unwanted work before downloading',
			'可以在下載前手動刪除不需要的作品'
		],
		'_退出手动删除': [
			'退出手动删除',
			'削除モードを終了する',
			'Exit manually delete',
			'離開手動刪除'
		],
		'_清空作品列表': [
			'清空作品列表',
			'作品のリストを空にする',
			'Empty the list of works',
			'清空作品清單'
		],
		'_清空作品列表_title': [
			'如果网页内容过多，可能导致页面崩溃。如有需要可以清除当前的作品列表。',
			'',
			'',
			'如果網頁內容過多，可能導致頁面當機。如有需要可以清除目前的作品清單。'
		],
		'_下载本页作品': [
			'下载本页作品',
			'このページをダウンロードする',
			'Download this page works',
			'下載本頁作品'
		],
		'_下载本页作品_title': [
			'下载本页列表中的所有作品',
			'このページをダウンロードする',
			'Download this page works',
			'下載本頁清單中的所有作品'
		],
		'_已清除多图作品': [
			'已清除多图作品',
			'マルチマップ作品を削除しました',
			'Has deleted the multi-map works',
			'已清除多圖作品'
		],
		'_已清除动图作品': [
			'已清除动图作品',
			'うごイラが削除されました',
			'Dynamic work has been removed',
			'已清除動圖作品'
		],
		'_下载本排行榜作品': [
			'下载本排行榜作品',
			'このリストの作品をダウンロードする',
			'Download the works in this list',
			'下載本排行榜作品'
		],
		'_下载本排行榜作品_title': [
			'下载本排行榜的所有作品，包括现在尚未加载出来的。',
			'このリストの作品をダウンロードする、まだロードされていないものを含む',
			'Download all of the works in this list, including those that are not yet loaded.',
			'下載本排行榜的所有作品，包括現在尚未載入出來的。'
		],
		'_下载该页面的图片': [
			'下载该页面的图片',
			'ページの写真をダウンロードする',
			'Download the picture of the page',
			'下載該頁面的圖片'
		],
		'_下载该专辑的图片': [
			'下载该专辑的图片',
			'アルバムの画像をダウンロードする',
			'Download the album`s picture',
			'下載該專輯的圖片'
		],
		'_下载推荐图片': [
			'下载推荐图片',
			'おすすめ作品をダウンロードする',
			'Download recommended works',
			'下載推薦圖片'
		],
		'_下载推荐图片_title': [
			'下载为你推荐的图片',
			'あなたのお勧め作品をダウンロードする',
			'Download for your recommended works',
			'下載為你推薦的圖片'
		],
		'_下载相似图片': [
			'下载相似图片',
			'類似の作品をダウンロードする',
			'Download similar works',
			'下載相似圖片'
		],
		'_要获取的作品个数': [
			'你想要获取多少个作品？（注意是个数而不是页数）\r\n请输入数字，最大值为',
			'いくつの作品をダウンロードしたいですか？ （ページ数ではなく作品数に注意してください）\r\n数値を入力してください。最大値は',
			'How many works do you want to download? (Note that the number of works rather than the number of pages)\r\nPlease enter a number, max ',
			'你想要取得多少個作品？（注意是個數而不是頁數）\r\n請輸入數字，最大值為'
		],
		'_要获取的作品个数2': [
			'你想要获取多少个作品？',
			'いくつの作品をダウンロードしたいですか？',
			'How many works do you want to download?',
			'你想要取得多少個作品？'
		],
		'_数字提示1': [
			'-1, 或者大于 0',
			'-1、または0より大きい',
			'-1, or greater than 0',
			'-1, 或是大於 0'
		],
		'_超过最大值': [
			'你输入的数字超过了最大值',
			'入力した番号が最大値を超えています',
			'The number you entered exceeds the maximum',
			'你輸入的數字超過了最大值'
		],
		'_下载大家的新作品': [
			'下载大家的新作品',
			'みんなの新作をダウンロードする',
			'Download everyone`s new work',
			'下載大家的新作品'
		],
		'_屏蔽设定': [
			'屏蔽設定',
			'ミュート設定',
			'Mute settings',
			'封鎖設定'
		],
		'_举报': [
			'举报',
			'報告',
			'Report',
			'回報'
		],
		'_输入id进行下载': [
			'输入id进行下载',
			'IDでダウンロード',
			'Download by ID',
			'輸入id進行下載'
		],
		'_输入id进行下载的提示文字': [
			'请输入作品id。如果有多个id，则以换行分割（即每行一个id）',
			'イラストレーターIDを入力してください。 複数のidがある場合は、1行に1つのidを付けます。',
			'Please enter the illustration id. If there is more than one id, one id per line.',
			'請輸入作品id。如果有多個id，則以換行分割（即每行一個id）'
		],
		'_开始下载': [
			'开始下载',
			'ダウンロードを開始する',
			'Start download',
			'開始下載'
		],
		'_开始抓取': [
			'开始抓取',
			'クロールを開始する',
			'Start crawling',
			'開始擷取'
		],
		'_id不合法': [
			'id不合法，操作取消。',
			'idが不正な、操作はキャンセルされます。',
			'id is illegal, the operation is canceled.',
			'id不合法，動作取消。'
		],
		'_快速收藏': [
			'快速收藏',
			'クイックブックマーク',
			'Quick bookmarks',
			'快速收藏'
		],
		'_显示': [
			'显示',
			'表示',
			'display',
			'顯示'
		],
		'_是否显示封面': [
			'是否显示封面',
			'カバーを表示するかどうか',
			'Whether to display the cover',
			'是否顯示封面'
		],
		'_显示封面的提示': [
			'如果搜索结果数量很多，封面图数量也会很多。如果加载大量的封面图，会占用很多网络资源，也可能导致任务异常中断。如果遇到了这种情况，取消选中这个按钮。',
			'検索結果の数が多い場合は、表紙画像の数が多くなります。 大量の表紙画像を読み込むと、ネットワークリソースが膨大になり、異常なタスクの中断を引き起こす可能性があります。 このような場合は、このボタンのチェックを外す。',
			'If the number of search results is large, the number of cover images will be many. If you load a large number of cover images, it will take up a lot of network resources, and it may cause abnormal interruption of tasks. If this happens, uncheck the button.',
			'如果搜尋結果數量很多，封面圖數量也會很多。如果載入大量的封面圖，會占用很多網路資源，也可能導致工作異常中斷。如果遇到了這種情況，取消選取這個按鈕。'
		],
		'_启用': [
			'启用',
			'有効にする',
			'Enable',
			'啟用'
		],
		'_是否快速下载': [
			'是否快速下载',
			'すぐにダウンロードするかどうか',
			'Whether to download quickly',
			'是否快速下載'
		],
		'_快速下载的提示': [
			'当“开始下载”状态可用时，自动开始下载，不需要点击下载按钮。',
			'「ダウンロードを開始する」ステータスが利用可能になると、ダウンロードは自動的に開始され、ダウンロードボタンをクリックする必要はありません。',
			'When the &quot;Start Downloa&quot; status is available, the download starts automatically and no need to click the download button.',
			'當“開始下載”狀態可用時，自動開始下載，不需要點選下載按鈕。'
		]
	};

	// xianzun_lang_translate 翻译
	function xzlt(name) {
		let content = xz_lang[name][lang_type];
		if (arguments.length > 1) {
			for (let i = 1; i < arguments.length; i++) {
				content = content.replace('{}', arguments[i]);
			}
		}
		return content;
	}

	// 去除广告
	let block_ad_css = '<style>section.ad,._3M6FtEB,._2vNejsc,[name=header],.ads_anchor,.ad-bigbanner,.ad-footer,._premium-lead-tag-search-bar,#header-banner.ad,.popular-introduction-overlay,.ad-bigbanner,.adsbygoogle,.ui-fixed-container aside,.ad-multiple_illust_viewer,.ads_area,._premium-lead-promotion-banner{display: none!important;z-index: -999!important;width: 0!important;height: 0!important;opacity: 0!important;}</style>';
	document.body.insertAdjacentHTML('beforeend', block_ad_css);

	let parser = new DOMParser(); // DOMParser，将字符串形式的html代码解析为DOM结构

	// 获取作品id
	function getIllustId() {
		return location.search.match(/illust_id=\d*\d?/)[0].split('=')[1];
	}

	// 自动点赞
	function autoLike() {
		document.querySelector('.Ki5EGTG').click();
	}

	// 快速收藏
	function quickBookmark() {
		// 本函数一直运行。因为切换作品（pushstate）时，不能准确的知道 toolbar 何时更新，所以只能不断检测，这样在切换作品时才不会出问题
		setTimeout(() => {
			quickBookmark();
		}, 300);

		let toolbar = document.querySelector('._2g7Dix7');
		if (!toolbar) { // 如果没有 toolbar
			return false;
		} else { // 如果有 toolbar
			quickBookmarkElement = document.querySelector(`#${quickBookmarkId}`);
			if (!quickBookmarkElement) { // 如果没有 quick 元素则添加
				// 创建快速收藏元素
				quickBookmarkElement = document.createElement('a');
				quickBookmarkElement.id = quickBookmarkId;
				quickBookmarkElement.innerHTML = '✩';
				quickBookmarkElement.href = 'javascript:void(0)';
				quickBookmarkElement.title = xzlt('_快速收藏');
				quickBookmarkElement.setAttribute('style', 'font-size:34px;line-height:30px;margin-right:15px;cursor:pointer;color:#333;text-decoration:none;display:block;');
				toolbar.insertBefore(quickBookmarkElement, toolbar.childNodes[3]);
				// 隐藏原来的收藏按钮并检测收藏状态
				toolbar.childNodes[2].style.display = 'none';
				let heart = toolbar.childNodes[2].querySelector('svg');
				if (getComputedStyle(heart)['fill'] === 'rgb(255, 64, 96)') { // 如果已经收藏过了
					quickBookmarkEnd();
				} else {
					quickBookmarkElement.addEventListener('click', () => {
						autoLike();

						let tagArray = [];
						let tagElements = document.querySelectorAll('._3SAblVQ li');
						for (const element of tagElements) {
							let now_a = element.querySelector('a');
							if (now_a) {
								tagArray.push(now_a.innerHTML); // 储存 tag
							}
						}
						// 对于原创作品，非日文的页面上只显示了用户语言的“原创”，替换成日文 tag “オリジナル”。
						if (tagArray[0] === '原创' || tagArray[0] === 'Original' || tagArray[0] === '창작') {
							tagArray[0] = 'オリジナル';
						}
						let tagString = encodeURI(tagArray.join(' '));
						let tt = unsafeWindow.globalInitData.token;
						// 调用添加收藏的 api
						fetch('https://www.pixiv.net/rpc/index.php', {
							method: 'post',
							headers: {
								'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
							},
							credentials: 'include', // 附带 cookie
							body: `mode=save_illust_bookmark&illust_id=${getIllustId()}&restrict=0&comment=&tags=${tagString}&tt=${tt}`
						}).then(function (response) {
							response.text()
								.then(function (data) {
									if (response.ok) {
										data = JSON.parse(data);
										if (data.error !== undefined && data.error === false) {
											quickBookmarkEnd();
										}
									} else { // 失败 如 403 404
									}
								});
						});
					});
				}
			} else { // 如果有 quick 元素，什么都不做
				return false;
			}
		}
	}

	// 如果这个作品已收藏
	function quickBookmarkEnd() {
		quickBookmarkElement.style.color = '#FF4060';
		quickBookmarkElement.href = `/bookmark_add.php?type=illust&illust_id=${getIllustId()}`;
	}

	// 获取作品信息，只获取指定信息，不用于下载
	function getIllustInfo() {
		viewerWarpper.style.display = 'none'; // 先隐藏 viewerWarpper
		download_gif_btn.style.display = 'none'; // 隐藏动图转换按钮
		// 获取作品信息
		fetch('https://www.pixiv.net/ajax/illust/' + getIllustId(), {
			method: 'get',
			credentials: 'include', // 附带 cookie
		}).then(function (response) {
			response.text()
				.then(function (data) {
					let this_one_data = JSON.parse(data).body;
					// 处理 图片查看器
					if (this_one_data.illustType === 0 || this_one_data.illustType === 1) { // 单图或多图，0插画1漫画2动图（1的如68430279）
						if (this_one_data.pageCount > 1) { // 多图
							// 当作品类型为 插画或者漫画，并且是多图时，才会产生缩略图
							let urls_thumb = this_one_data.urls.thumb;
							// https://i.pximg.net/c/240x240/img-master/img/2017/11/28/00/23/44/66070515_p0_master1200.jpg
							let urls_original = this_one_data.urls.original;
							// https://i.pximg.net/img-original/img/2017/11/28/00/23/44/66070515_p0.png
							let length = this_one_data.pageCount;
							let viewerList = '';
							for (let index = 0; index < length; index++) {
								let pageNo = 'p' + index;
								viewerList += `<li><img src="${urls_thumb.replace('p0',pageNo)}" data-src="${urls_original.replace('p0',pageNo)}"></li>`;
							}
							viewerUl.innerHTML = viewerList;
							// 数据更新后，显示 viewerWarpper
							viewerWarpper.style.display = 'block';
							// 销毁看图组件
							if (myViewer) {
								myViewer.destroy();
							}
							// 重新配置看图组件
							myViewer = new Viewer(viewerUl, {
								toolbar: {
									zoomIn: 0,
									zoomOut: 0,
									oneToOne: 1,
									reset: 0,
									prev: 1,
									play: {
										show: 0,
										size: 'large',
									},
									next: 1,
									rotateLeft: 0,
									rotateRight: 0,
									flipHorizontal: 0,
									flipVertical: 0,
								},
								url(image) {
									return image.getAttribute('data-src');
								},
								transition: false, // 取消一些动画，比如切换图片时，图片从小变大出现的动画
								keyboard: false, // 取消键盘支持，主要是用键盘左右方向键切换的话，会和 pixiv 页面产生冲突。（pixiv 页面上，左右方向键会切换作品）
								title: false, // 不显示 title（图片名和宽高信息）
								tooltip: false, // 不显示缩放比例
							});
						}
					}
					// 处理 动图
					if (this_one_data.illustType === 2) {
						initGIF();
					}
				});
		});
	}

	// 初始化动图
	function initGIF() {
		// 切换作品时，重置动图信息
		gif_src = '';
		gif_delay = undefined;
		gif_mime_type = '';
		zip_file = null; // 获取的 zip 文件
		file_number = undefined; // 动图压缩包里有多少个文件
		gif_img_list.innerHTML = ''; // 清空图片列表
		download_gif_btn.style.display = 'inline-block'; // 显示动图转换按钮

		// 检查 gif 所需文件是否加载完成
		if (!checkGIFLib()) { // 加载转换所需文件
			loadJS('zip_lib', 'https://cdn.jsdelivr.net/npm/@trigrou/zip-js@1.0.0/WebContent/zip.js');
			loadJS('zip_workerScript', 'https://cdn.jsdelivr.net/npm/@trigrou/zip-js@1.0.0/WebContent/z-worker.js');
			loadJS('zip_inflate', 'https://cdn.jsdelivr.net/npm/@trigrou/zip-js@1.0.0/WebContent/inflate.js');
			loadJS('gif_lib', 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js');
			loadJS('gif_workerScript', 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js');
		}

		getGIFInfo();
	}

	// 获取 gif 信息
	function getGIFInfo() {
		fetch('https://www.pixiv.net/ajax/illust/' + getIllustId() + '/ugoira_meta', {
			method: 'get',
			credentials: 'include', // 附带 cookie
		}).then(function (response) {
			response.text()
				.then(function (data) {
					let this_one_data = JSON.parse(data).body;
					gif_src = this_one_data.originalSrc;
					file_number = this_one_data.frames.length;
					gif_delay = this_one_data.frames[0].delay;
					gif_mime_type = this_one_data.mime_type;
					console.log('getGIFInfo end');
				});
		});
	}

	// 加载 js 文件
	async function loadJS(name, url) {
		let js_file = await fetch(url);
		let js_blob = await js_file.blob();
		let blob_url = URL.createObjectURL(js_blob);
		jsLoaded(name, blob_url);
	}

	// 把 js 文件插入到页面里
	function insertJS(url) {
		let element = document.createElement('script');
		element.setAttribute('type', 'text/javascript');
		element.setAttribute('src', url);
		document.head.appendChild(element);
	}

	// 处理加载完的 js
	function jsLoaded(name, blob_url) {
		switch (name) {
			case 'zip_lib':
				convert_lib_load.zip_lib = blob_url;
				insertJS(blob_url);
				break;
			case 'zip_workerScript':
				convert_lib_load.zip_workerScript = blob_url;
				break;
			case 'zip_inflate':
				convert_lib_load.zip_inflate = blob_url;
				insertJS(blob_url);
				break;
			case 'gif_lib':
				convert_lib_load.gif_lib = blob_url;
				insertJS(blob_url);
				break;
			case 'gif_workerScript':
				convert_lib_load.gif_workerScript = blob_url;
				break;
			default:
				break;
		}
	}

	// 检查 gif 库是否加载完成
	function checkGIFLib() {
		let pass = true;
		for (const key in convert_lib_load) {
			if (convert_lib_load.hasOwnProperty(key)) {
				const element = convert_lib_load[key];
				if (!element) {
					pass = false;
				}
			}
		}
		return pass;
	}

	// 下载动图源文件
	function downloadZip(url) {
		fetch(url)
			.then((res) => {
				res.blob()
					.then((res) => {
						zip_file = res;
						console.log('zip loaded');
					});
			});
	}

	// 检查是否可以转换 gif
	function checkCanConvert() {
		clearInterval(check_convert_timer);
		// 如果库文件未加载完成，或者未获取到 gif 信息，或者 zip 文件未加载完成，过一会儿再检查
		if (!checkGIFLib() || !gif_src || !zip_file) {
			setTimeout(() => {
				checkCanConvert();
			}, 1000);
			return false;
		} else {
			startconvert();
		}
	}

	// 开始转换
	function startconvert() {
		addOutputInfo('<br>' + xzlt('_转换中请等待'));
		zip.workerScripts = {
			inflater: [convert_lib_load.zip_workerScript, convert_lib_load.zip_inflate]
		};

		readZip();
	}

	// 读取 zip 文件
	function readZip() {
		zip.createReader(new zip.BlobReader(zip_file), function (zipReader) {
			// 读取成功时的回调函数，files 为文件列表
			zipReader.getEntries(function (files) {
				file_number = files.length;
				files.forEach(file => {
					// 获取每个文件的数据，在 BlobWriter 里设置 mime type，回调函数返回 blob 数据
					file.getData(new zip.BlobWriter(gif_mime_type), function (data) {
						let data_url = URL.createObjectURL(data);
						addImgList(data_url); // 输出图片列表
					});
				});
			});
		}, function (message) {
			console.log('readZIP error: ' + message);
			alert('error: convert to gif failed.');
		});
	}

	// 输出图片列表
	function addImgList(url) {
		let new_img = document.createElement('img');
		new_img.onload = function () {
			file_number--;
			if (file_number == 0) { // 所有图片都加载完成后
				renderGIF();
			}
		};
		new_img.src = url;
		gif_img_list.appendChild(new_img);
	}

	// 渲染 gif
	function renderGIF() {
		console.log('renderGIF');

		// 配置 gif.js
		var gif = new GIF({
			workers: 4, // 如果 workers 大于1，合成的 gif 有可能会抖动
			quality: 10,
			workerScript: convert_lib_load.gif_workerScript
		});

		// 添加图片
		let imgs = gif_img_list.querySelectorAll('img');
		imgs.forEach(element => {
			gif.addFrame(element, {
				delay: gif_delay
			});
		});
		console.time('gif');
		// 渲染完成事件
		gif.on('finished', function (blob) {
			console.timeEnd('gif'); // 显示渲染用了多久
			download_a = document.querySelector('.download_a');
			download_a.href = URL.createObjectURL(blob);
			download_a.setAttribute('download', getIllustId() + '.gif');
			download_a.click();
			changeTitle('√');
			addOutputInfo('<br>' + xzlt('_转换完成'));
		});

		// 开始渲染
		gif.render();
	}

	// 初始化图片查看器
	function initViewer() {
		if (!viewer_enable) {
			return false;
		}
		if (typeof Viewer !== 'function') {
			loadViewer();
			return false;
		}
		if (!viewerELCreated) {
			createViewer();
			return false;
		}
		if (viewerELCreated) { // 每次被调用时，如果一切都准备好了，则更新数据
			updateViewer();
		}
	}

	// 加载图片查看器 js 文件
	function loadViewer() {
		fetch('https://greasyfork.org/scripts/369647-viewer-js-mix/code/Viewerjs%20mix.js', {
				method: 'get'
			})
			.then(function (response) {
				response.text()
					.then(function (data) {
						let element = document.createElement('script');
						element.setAttribute('type', 'text/javascript');
						element.innerHTML = data;
						document.head.appendChild(element);
						if (typeof Viewer === 'function') {
							initViewer();
						}
					});
			});
	}

	// 创建图片查看器 html 元素，并绑定一些事件，这个函数只会执行一次
	function createViewer() {
		if (!document.querySelector('._290uSJE')) { // 如果图片中间部分的元素还未生成，则过一会儿再检测
			setTimeout(() => {
				createViewer();
			}, 200);
			return false;
		}
		// 图片列表样式
		let viewerStyle = `
		<style>
		#viewerWarpper {
			margin:24px auto 15px;
			overflow: hidden;
			background: #fff;
			padding: 0 16px;
			display: none;
			border-top: 1px solid #eee;
			border-bottom: 1px solid #eee;
		}
		#viewerWarpper ul {
			max-width:568px;
			margin:24px auto;
			padding: 0 16px;
			display: flex;
			justify-content: flex-start;
			align-items: center;
			flex-wrap: nowrap;
			overflow: auto;
		}
		#viewerWarpper li {
			display: flex;
			flex-shrink: 0;
			margin-right: 8px;
			overflow: hidden;
		}
		#viewerWarpper li img {
			cursor: pointer;
			max-height: 144px;
			width: auto;
		}
		</style>
		`;
		document.body.insertAdjacentHTML('beforeend', viewerStyle);
		// 图片列表 html 结构： div#viewerWarpper > ul > li > img
		viewerWarpper = document.createElement('div');
		viewerWarpper.id = 'viewerWarpper';
		viewerUl = document.createElement('ul');
		viewerWarpper.appendChild(viewerUl);
		document.querySelector('._290uSJE').insertBefore(viewerWarpper, document.querySelector('._290uSJE figcaption'));

		viewerELCreated = true;

		// 覆写 Viewer.js 的部分样式
		let over_viewer_style = `
		<style>
		.viewer-backdrop{
			background: rgba(0, 0, 0, .8);
		}
		.viewer-toolbar .viewer-prev {
			background-color: rgba(0, 0, 0, .8);
			border-radius: 50%;
			cursor: pointer;
			height: 100px;
			overflow: hidden;
			position: fixed;
			left: -70px;
			top: 40%;
			width: 100px;
		  }
		  .viewer-toolbar .viewer-prev::before {
			top: 40px;
			left: 70px;
			position: absolute;
		  }

		  .viewer-toolbar .viewer-next {
			background-color: rgba(0, 0, 0, .8);
			border-radius: 50%;
			cursor: pointer;
			height: 100px;
			overflow: hidden;
			position: fixed;
			right: -70px;
			top: 40%;
			width: 100px;
		  }
		  .viewer-toolbar .viewer-next::before {
			left: 10px;
			top: 40px;
			position: absolute;
		  }
		  .black-background{
			  background: rgba(0, 0, 0, 1);
		  }
		</style>
		`;
		document.body.insertAdjacentHTML('beforeend', over_viewer_style);

		// 缩放时显示或隐藏某些元素，本来想超过100%自动进入全屏，但是全屏必须要用户操作才行
		// viewerUl.addEventListener('zoom', function () {
		// 	if (event.detail.ratio >= 1) { // 缩放达到或超过100%（或者点击1:1按钮时）
		// 		// 隐藏查看器的其他元素
		// 		hideViewerOther();
		// 	} else { // 显示查看器的其他元素
		// 		showViewerOther();
		// 	}
		// });

		// 图片查看器显示之后
		viewerUl.addEventListener('shown', function () {
			// 显示相关元素
			showViewerOther();
			// 绑定点击全屏事件
			document.querySelector('.viewer-one-to-one').addEventListener('click', () => {
				hideViewerOther(); // 隐藏查看器的其他元素
				launchFullScreen(document.body); // 进入全屏
				setTimeout(() => { // 使图片居中显示，必须加延迟
					setViewerCenter();
				}, 100);
			});
		});

		// 全屏状态下，查看器查看和切换图片时，始终显示为100%
		viewerUl.addEventListener('view', function () {
			if (isFullscreen()) {
				setTimeout(() => { // 通过点击 1:1 按钮，调整为100%并居中。这里必须要加延时，否则点击的时候图片还是旧的
					document.querySelector('.viewer-one-to-one').click();
				}, 50);
			}
		});

		// 查看器隐藏时，如果还处于全屏，则退出全屏
		viewerUl.addEventListener('hidden', function () {
			if (isFullscreen()) {
				exitFullscreen();
			}
		});

		// esc 退出图片查看器
		document.addEventListener('keyup', function (event) {
			let e = event || window.event;
			if (e.keyCode == 27) { // 按下 esc
				// 如果非全屏，且查看器已经打开，则退出查看器
				if (!isFullscreen() && viewerIsShow()) {
					document.querySelector('.viewer-close').click();
				}
			}
		});

		updateViewer();
	}

	// 更新图片查看器的图片列表
	function updateViewer() {
		getIllustInfo(); // 根据作品信息处理，也包含了对 gif 的处理
	}

	// 隐藏查看器的其他元素
	function hideViewerOther() {
		document.querySelector('.viewer-container').classList.add('black-background');
		document.querySelector('.viewer-close').style.display = 'none';
		// 隐藏底部的其他元素，仍然显示左右切换按钮
		document.querySelector('.viewer-one-to-one').style.display = 'none';
		document.querySelector('.viewer-navbar').style.display = 'none';
	}

	// 显示查看器的其他元素
	function showViewerOther() {
		document.querySelector('.viewer-container').classList.remove('black-background');
		document.querySelector('.viewer-close').style.display = 'block';
		document.querySelector('.viewer-one-to-one').style.display = 'block';
		document.querySelector('.viewer-navbar').style.display = 'block';
	}

	// 在图片100%显示时，使其居中
	function setViewerCenter() {
		// 获取图片宽高
		let imgInfo = document.querySelector('.viewer-title').innerHTML;
		if (!imgInfo) { // 但是如果图片尚未加载出来的话，就没有内容，就过一会儿再执行
			setTimeout(() => {
				setViewerCenter();
			}, 200);
			return false;
		}
		let imgSize = imgInfo.match(/\(.*\)/)[0].replace(/\(|\)| /g, '').split('×');
		// > '66360324_p5_master1200.jpg (919 × 1300)'
		// < [919,1300]
		let imgWidth = imgSize[0];
		let imgHeight = imgSize[1];
		myViewer.zoomTo(1);
		// 获取网页宽高
		let htmlWidth = document.documentElement.clientWidth;
		let htmlHeight = document.documentElement.clientHeight;
		// 设置边距
		let setWidth = (htmlWidth - imgWidth) / 2;
		let setHeight = (htmlHeight - imgHeight) / 2;
		if (setHeight < 0) { // 当图片高度大于浏览器窗口高度时，居顶显示而不是居中
			setHeight = 0;
		}
		myViewer.moveTo(setWidth, setHeight);
	}

	// 进入全屏
	function launchFullScreen(element) {
		if (element.requestFullscreen) {
			element.requestFullscreen();
		} else if (element.msRequestFullscreen) {
			element.msRequestFullscreen();
		} else if (element.mozRequestFullScreen) {
			element.mozRequestFullScreen();
		} else if (element.webkitRequestFullscreen) {
			element.webkitRequestFullscreen();
		}
	}

	// 退出全屏
	function exitFullscreen() {
		if (document.exitFullscreen) {
			document.exitFullscreen();
		} else if (document.mozExitFullScreen) {
			document.mozExitFullScreen();
		} else if (document.webkitExitFullscreen) {
			document.webkitExitFullscreen();
		}
	}

	// 全屏状态变化时的处理
	function changeFullscreen() {
		if (isFullscreen()) { // 进入全屏

		} else { // 退出全屏
			showViewerOther();
		}
	}

	// 判断是否处于全屏状态
	function isFullscreen() {
		return document.fullscreenElement || document.msFullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || false;
	}

	function viewerIsShow() {
		let viewer_container = document.querySelector('.viewer-container');
		if (viewer_container) {
			return viewer_container.classList.contains('viewer-in');
		} else {
			return false;
		}
	}

	// 检测全屏状态变化，绑定的事件有兼容性问题（这里也相当于绑定了 esc 按键事件）
	// fullscreenchange/webkitfullscreenchange/mozfullscreenchange
	// 标准的 fullscreenchange 至今没有支持
	document.addEventListener('webkitfullscreenchange', () => {
		changeFullscreen();
	});
	document.addEventListener('mozfullscreenchange', () => {
		changeFullscreen();
	});

	// 修改title
	function changeTitle(string) {
		// 本脚本的提醒会以 [string] 形式添加到title最前面
		/*
		0	复原
		↑	抓取中
		→	等待下一步操作（tag搜索页）
		▶ 	准备下载
		↓	下载中
		║	下载暂停
		■	下载停止
		√	下载完毕
		*/
		if (string === '0') {
			clearInterval(title_timer);
			document.title = old_title;
			return false;
		}
		if (document.title[0] !== '[') { // 如果当前title里没有本脚本的提醒，就存储当前title为旧title
			old_title = document.title;
		}
		let new_title = `[${string}] ${old_title}`;
		document.title = new_title;
		// 当可以执行下一步操作时，闪烁提醒
		if (string === '▶' || string === '→') {
			title_timer = setInterval(function () {
				if (document.title.indexOf(string) > -1) {
					document.title = new_title.replace(string, ' ');
				} else {
					document.title = new_title;
				}
			}, 500);
		} else {
			clearInterval(title_timer);
		}
	}

	// 增加输出信息
	function addOutputInfo(val) {
		$('#outputInfo').html($('#outputInfo').html() + val);
	}

	// 获取排除类型
	function getNotDownType() {
		let temp_result = '';
		for (let index = 1; index < 4; index++) {
			if (XZForm['setWorkType' + index].checked === false) {
				temp_result += index;
			}
		}
		return temp_result;
	}

	// 检查排除作品类型的参数是否合法
	function checkNotDownType() {
		notdown_type = getNotDownType();
		// 如果全部排除则取消任务
		if (notdown_type.indexOf('1') > -1 && notdown_type.indexOf('2') > -1 && notdown_type.indexOf('3') > -1) {
			alert(xzlt('_check_notdown_type_result1_弹窗'));
			addOutputInfo('<br>' + xzlt('_check_notdown_type_result1_html') + '<br><br>');
			return false;
		}
		// 排除了至少一种时，显示提示
		if (notdown_type.indexOf('1') > -1 || notdown_type.indexOf('2') > -1 || notdown_type.indexOf('3') > -1) {
			addOutputInfo('<br>' + xzlt('_check_notdown_type_result3_html') + notdown_type.replace('1', xzlt('_单图')).replace('2', xzlt('_多图')).replace('3', xzlt('_动图')));
		}
	}

	// 检查作品是否符合过滤类型。所有添加了setNotDownType按钮的都要到这里检查一遍
	function checkNotDownType_result(string, url, bookmarked) {
		// 如果设置了只下载书签作品
		if (only_down_bmk) {
			if (!bookmarked) {
				return false;
			}
		}

		if (string.indexOf('multiple') > -1) { //如果是多图并且没有排除多图
			if (notdown_type.indexOf('2') === -1) {
				illust_url_list.push(url);
			}
		} else if (string.indexOf('ugoku-illust') > -1) { //如果是动图并且没有排除动图
			if (notdown_type.indexOf('3') === -1) {
				illust_url_list.push(url);
			}
		} else { //如果是单图并且没有排除单图（包括mode=big）
			if (notdown_type.indexOf('1') === -1) {
				illust_url_list.push(url);
			}
		}
	}

	// 检查是否设置了多图作品的张数限制
	function check_multiple_down_number() {
		let check_result = checkNumberGreater0(XZForm.setPNo.value);
		if (check_result) {
			multiple_down_number = check_result.value;
			addOutputInfo('<br>' + xzlt('_多图作品下载张数', multiple_down_number));
		} else {
			multiple_down_number = 0;
		}
	}

	// 插入到页面顶部，大部分页面使用 header，文章页使用 root。因为在文章页执行脚本时，可能获取不到 header。
	function insertToHead(el) {
		if ($('header').eq(0).length === 1) {
			$('header').eq(0).before(el);
		} else if ($('#root').children().eq(0).length === 1) {
			$('#root').children().eq(0).before(el);
		}
	}

	// 获取要排除的tag
	function get_NotNeed_Tag() {
		let temp_not_need_tag = XZForm.setTagNotNeed.value;
		if (temp_not_need_tag === '') { //如果没有设置 tag，则重置
			notNeed_tag = [];
		} else {
			notNeed_tag = temp_not_need_tag.split(',');
			if (notNeed_tag[notNeed_tag.length - 1] === '') { //处理最后一位是逗号的情况
				notNeed_tag.pop();
			}
			addOutputInfo('<br>' + xzlt('_设置了排除tag之后的提示') + notNeed_tag.join(','));
		}
	}


	// 获取必须包含的tag
	function get_Need_Tag() {
		let temp_need_tag = XZForm.setTagNeed.value;
		if (temp_need_tag === '') { //如果没有设置 tag，则重置
			need_tag = [];
		} else {
			need_tag = temp_need_tag.split(',');
			if (need_tag[need_tag.length - 1] === '') { //处理最后一位是逗号的情况
				need_tag.pop();
			}
			addOutputInfo('<br>' + xzlt('_设置了必须tag之后的提示') + need_tag.join(','));
		}
	}

	// 检查过滤宽高的设置
	function checkSetWH() {
		let check_result_width = checkNumberGreater0(XZForm.setWidth.value);
		let check_result_height = checkNumberGreater0(XZForm.setHeight.value);
		if (check_result_width || check_result_height) { // 宽高只要有一个条件大于 0 即可
			is_set_filterWH = true;
			filterWH = {
				and_or: XZForm.setWidth_AndOr.value,
				width: check_result_width ? check_result_width.value : 0,
				height: check_result_height ? check_result_height.value : 0
			};
		} else {
			is_set_filterWH = false;
		}
		if (is_set_filterWH) {
			let and_or = filterWH.and_or;
			addOutputInfo('<br>' + xzlt('_设置了筛选宽高之后的提示文字p1') + filterWH.width + and_or.replace('|', xzlt('_或者')).replace('&', xzlt('_并且')) + xzlt('_高度设置') + filterWH.height);
		}
	}

	// 检查过滤收藏数的设置
	function checkSetBMK() {
		let check_result = checkNumberGreater0(XZForm.setFavNum.value, '=0');
		if (check_result) {
			filterBMK = check_result.value;
			is_set_filterBMK = true;
		} else {
			is_set_filterBMK = false;
			addOutputInfo('<br>' + xzlt('_参数不合法1'));
			return false;
		}
		if (is_set_filterBMK && filterBMK > 0 && page_type !== 5) {
			addOutputInfo('<br>' + xzlt('_设置了筛选收藏数之后的提示文字') + filterBMK);
		}
		return true;
	}

	// 检查是否设置了只下载书签作品
	function checkOnlyBMK() {
		only_down_bmk = XZForm.setOnlyBMK.checked;
		if (only_down_bmk) {
			addOutputInfo('<br>' + xzlt('_只下载已收藏的提示'));
		}
	}

	// 检查输入的参数是否有效，要求大于 0 的数字
	function checkNumberGreater0(arg, mode) {
		if (arg === null || arg === '') {
			return false;
		}
		arg = parseInt(arg);
		let min_num = 0;
		if (mode === '=0') { // 允许最小为0
			min_num = -1;
		}
		if (isNaN(arg) || arg <= min_num) {
			// alert(xzlt('_本次输入的数值无效'));
			return false;
		} else {
			return {
				'value': arg
			};
			// alert(xzlt('_设置成功'));
		}
	}

	// 最多有多少页，在 page_type 10 使用
	function set_max_num() {
		if (loc_url.indexOf('bookmark_new_illust') > -1) { // 其实这个条件和条件2在一定程度上是重合的，所以这个必须放在前面。
			max_num = 100; //关注的人的新作品（包含普通版和r18版）的最大页数都是100
		} else if (loc_url.indexOf('new_illust.php') > -1) {
			max_num = 1000; //大家的新作品（普通版）的最大页数是1000
		} else if (loc_url.indexOf('new_illust_r18.php') > -1) {
			max_num = 500; //大家的的新作品（r18版）的最大页数是500
		}
	}

	// 给tag搜索页的作品绑定删除属性
	function tagSearchDel() {
		let all_works = $(tag_search_list_selector);
		if (all_works.length === 0) { // 有时执行时列表还没加载出来，需要延时。目前tag搜索页是这样
			setTimeout(tagSearchDel, 1000);
			return false;
		} else {
			for (let i = 0; i < all_works.length; i++) {
				let now_works = all_works.eq(i);
				if (!now_works.attr('data-del')) {
					now_works.attr('data-del', '');
					now_works.bind('click', function () {
						if ($('#deleteBotton').attr('data_del') === '1') {
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

	//专辑里面的页面大量使用无刷新加载技术，所以专辑里的所有页面都需要监听url的改变。
	let _wr = function (type) {
		let orig = history[type];
		return function () {
			let rv = orig.apply(this, arguments);
			let e = new Event(type);
			e.arguments = arguments;
			window.dispatchEvent(e);
			return rv;
		};
	};
	history.pushState = _wr('pushState');
	history.replaceState = _wr('replaceState');

	// 设置要下载的个数
	function set_requset_num() { // 下载相似作品、相关作品时
		max_num = 500; //设置最大允许获取多少个作品。相似作品、相关作品的数字是可以改的，比如500,1000，这里限制为500。
		let result = checkNumberGreater0(XZForm.setWantPage.value);
		if (result) {
			requset_number = result.value;
			if (requset_number > max_num) { //如果超出最大值就按最大值处理
				requset_number = max_num;
			}
		} else {
			alert(xzlt('_参数不合法1'));
			return false;
		}
	}

	// 获取作品页信息出错，如404
	function illust_error(url) {
		if (page_type === 1 && !down_xiangguan) { // 在作品页内下载时，设置的want_page其实是作品数
			if (want_page > 0) {
				want_page--;
			}
			// 在作品页内下载时，如果出现了无法访问的作品时，就获取不到接下来的作品了，直接结束。
			$(outputInfo).html($(outputInfo).html() + '<br>' + xzlt('_无权访问1', url) + '<br>');
			allow_work = true;
			allWorkFinished();
		} else { // 跳过当前作品
			$(outputInfo).html($(outputInfo).html() + '<br>' + xzlt('_无权访问2', url) + '<br>');
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
	}
	// 根据对象的属性排序
	function sortByProperty(propertyName) {
		return function (object1, object2) {
			let value1 = object1[propertyName];
			let value2 = object2[propertyName];
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
		imgList.sort(sortByProperty('num'));
		$(tag_search_list_selector).remove();
		for (let i = 0; i < imgList.length; i++) {
			$('#js-react-search-mid ._1BUAfFH').append(imgList[i].e);
		}
	}

	// tag搜索页的筛选任务执行完毕
	function tagSearchPageFinished() {
		allow_work = true;
		// listPage_finished=0; //不注释掉的话，每次添加筛选任务都是从当前页开始，而不是一直往后累计
		listPage_finished2 = 0; //重置已抓取的页面数量
		listSort();
		changeTitle('→');
		tagSearchDel();
	}

	// 检查用户页数设置
	function check_want_page_rule1(input_tip, error_tip, start1_tip, start2_tip) {
		let temp_want_page = parseInt(XZForm.setWantPage.value);
		if (parseInt(temp_want_page) < 1 && temp_want_page !== -1) { //比1小的数里，只允许-1, 0也不行
			addOutputInfo(error_tip);
			return false;
		}
		if (parseInt(temp_want_page) >= 1) {
			want_page = temp_want_page;
			addOutputInfo(start1_tip.replace('-num-', want_page));
			return true;
		} else if (temp_want_page === -1) {
			want_page = temp_want_page;
			addOutputInfo(start2_tip);
			return true;
		}
	}

	// 显示调整后的列表数量，仅在某些页面中使用
	function outputNowResult() {
		insertOutputInfo();
		addOutputInfo(xzlt('_调整完毕', $(tag_search_list_selector + ':visible').length) + '<br>');
	}

	// 添加图片信息
	function addImgInfo(id, imgUrl, title, nowAllTag, user, userid, fullWidth, fullHeight, ext, bmk) {
		img_info.push({
			id: id,
			url: imgUrl,
			title: title,
			tags: nowAllTag,
			user: user,
			userid: userid,
			fullWidth: fullWidth,
			fullHeight: fullHeight,
			ext: ext,
			bmk: bmk
		});
	}

	// 在pixiv专辑里判断是否应该隐藏下载面板。进行过专辑类型检查之后会传参。初步检查url的时候没有参数
	function is_show_downloader(bool) {
		/*
		形参 bool	说明
		true		显示右侧按钮
		false		隐藏右侧按钮
		undefined	检测页面类型，再决定是否显示/隐藏
		download	开始下载
		 */
		old_title = document.title;
		changeTitle('0');
		if (bool === true) {
			rightButton.style.display = 'block';
		} else if (bool === false) {
			rightButton.style.display = 'none';
		} else {
			if (window.location.href.indexOf('/a/') > -1) { // 在子页面正常执行代码
				rightButton.style.display = 'block';
				// 判断pixiv专辑类型，如果是插画就下载，其他类型则隐藏下载面板。因为内容是异步加载，需要模拟请求
				let showcase_id = /\d.*\d/.exec(window.location.pathname)[0];
				let tt = $('input[name=tt]')[0].value; //取出token
				$.ajax({
					url: 'https://www.pixiv.net/ajax/showcase/article?article_id=' + showcase_id + '&tt=' + tt,
					type: 'get',
					dataType: 'json',
					success: function (data) {
						if (data.body[0].subCategory === 'illustration') { // 是插画
							is_show_downloader(true);
							if (bool === 'download') {
								resetResult();
								// 当前专辑发生变化时，拼接出每个图片的作品页url
								illust_url_list = []; // 清空结果
								let illusts_list = data.body[0].illusts;
								for (let i = 0; i < illusts_list.length; i++) {
									illust_url_list.push('https://www.pixiv.net/member_illust.php?mode=medium&illust_id=' + illusts_list[i].illust_id);
								}
								startGet();
							}
						} else {
							is_show_downloader(false);
						}
					}
				});
			} else { // 如果不在子页面，则隐藏右侧按钮
				rightButton.style.display = 'none';
			}
		}
	}

	// 启动抓取
	function startGet() {
		if (!allow_work || download_started) {
			alert(xzlt('_当前任务尚未完成1'));
			return false;
		}

		insertOutputInfo();
		downloadPanelHide();
		// 设置要获取的作品数或页数
		if (page_type === 1) {
			if (quick) { // 快速下载
				want_page = 1;
			} else if (!down_xiangguan) { // 手动设置下载页数
				let result = check_want_page_rule1(
					xzlt('_check_want_page_rule1_arg1'),
					xzlt('_check_want_page_rule1_arg2'),
					xzlt('_check_want_page_rule1_arg3'),
					xzlt('_check_want_page_rule1_arg4')
				);
				if (!result) {
					return false;
				}
			}
		} else if (page_type === 2) {
			let result = check_want_page_rule1(
				xzlt('_check_want_page_rule1_arg5'),
				xzlt('_check_want_page_rule1_arg2'),
				xzlt('_check_want_page_rule1_arg6'),
				xzlt('_check_want_page_rule1_arg7')
			);
			if (!result) {
				return false;
			}
		} else if (page_type === 5) {
			$('._premium-lead-popular-d-body').remove(); // 去除热门作品一栏
			let result = check_want_page_rule1(
				xzlt('_check_want_page_rule1_arg5'),
				xzlt('_check_want_page_rule1_arg2'),
				'',
				xzlt('_check_want_page_rule1_arg7')
			);
			if (!result) {
				return false;
			}
			if (want_page === -1) {
				want_page = 1000;
			}
			// 这里直接获取收藏数，可能是非法的，下面再检查
			addOutputInfo(xzlt('_tag搜索任务开始', parseInt(XZForm.setFavNum.value), want_page));
			if (!listPage_finished) { //如果是首次抓取 则处理当前页面
				$(tag_search_list_selector).remove(); // 移除当前列表内容
				$('body').append('<div id="tag_search_temp_result" style="display:none"></div>');
				tag_search_temp_result = $('#tag_search_temp_result');
			}
		} else if (page_type === 10) {
			let result = checkNumberGreater0(XZForm.setWantPage.value);
			if (!result) {
				alert(xzlt('_参数不合法1'));
				return false;
			} else if (result.value > max_num) {
				alert(xzlt('_输入超过了最大值') + max_num);
				return false;
			} else {
				want_page = result.value;
				addOutputInfo(xzlt('_任务开始1', want_page));
			}
		}
		if (page_type === 7) {
			listPage_finished = 0;
		}
		// 检查是否设置了收藏数要求
		if (!checkSetBMK()) {
			return false;
		}

		if (page_type !== 5) { // 排除tag搜索页，tag搜索页里，这些设置放在后面再检查
			// 检查排除作品类型的设置
			if (checkNotDownType() === false) {
				return false;
			}
			// 检查是否设置了只下载书签作品
			checkOnlyBMK();
			// 检查是否设置了多图作品的张数限制
			check_multiple_down_number();
			// 检查是否设置了宽高条件
			checkSetWH();
			// 获取必须包含的tag
			get_Need_Tag();
			// 获取要排除的tag
			get_NotNeed_Tag();
		}

		if (page_type !== 12) { // pixiv特辑上的插画，是先获取列表再到这里的，所以不能在这里清除
			resetResult();
		}
		if (page_type !== 6) {
			allow_work = false; //开始执行时更改许可状态
		}

		now_tips = $(outputInfo).html();

		if (page_type === 0 || page_type === 12) {
			$(outputInfo).html(now_tips + xzlt('_开始获取作品页面'));
			getListUrlFinished(); //通过id抓取时，或者showcase 特辑，不需要获取列表页
		} else if (page_type === 1) {
			if (down_xiangguan) { // 下载相关作品
				getListPage();
			} else {
				getIllustPage(window.location.href); //开始获取图片。因为新版作品页切换作品不需要刷新页面了，所以要传递实时的url。
			}
		} else if (page_type === 2) {
			readyGetListPage3();
		} else if (page_type === 6) {
			getListPage2();
		} else {
			getListPage(); //开始获取列表页
		}
	}

	// 获取作品列表页
	function getListPage() {
		changeTitle('↑');
		let url;
		if (page_type === 9 || down_xiangguan) {
			let id; //取出作品id
			if (location.href.indexOf('recommended.php') > -1) { // '为你推荐'里面的示例作品id为'auto'
				id = 'auto';
			} else {
				id = getIllustId(); // 作品页的url需要实时获取
			}
			url = '/rpc/recommender.php?type=illust&sample_illusts=' + id + '&num_recommendations=' + requset_number; //获取相似的作品
		} else if (page_type === 11) { // 对于发现图片，仅下载已有部分，所以不需要去获取列表页了。
			let now_illust = $(tag_search_list_selector); //获取已有作品
			for (let i = 0; i < now_illust.length; i++) { //拼接作品的url
				// discovery列表的url也是有额外后缀的，需要去掉
				illust_url_list.push(now_illust.eq(i).find('a').eq(0).attr('href').split('&uarea')[0]);
			}
			addOutputInfo('<br>' + xzlt('_列表页获取完成2', illust_url_list.length));
			getListUrlFinished();
			return false;
		} else {
			url = base_url + (startpage_no + listPage_finished);
		}
		$.ajax({
			url: url,
			type: 'get',
			async: true,
			cache: false,
			dataType: 'text',
			success: function (data) {
				listPage_finished++;
				let listPage_document;
				if (page_type !== 7 && page_type !== 9 && !down_xiangguan) { // 排行榜和相似作品、相关作品，直接获取json数据，不需要解析为DOM
					listPage_document = $(parser.parseFromString(data, 'text/html'));
				}
				let allPicArea;
				if (page_type === 5) { // tag搜索页
					listPage_finished2++;
					let this_one_info;
					this_one_info = listPage_document.find(tag_search_lv1_selector).attr('data-items'); // 保存这一次的信息
					this_one_info = JSON.parse(this_one_info); // 转化为数组
					display_cover = XZForm.setDisplayCover.checked;
					for (let j = 0; j < this_one_info.length; j++) {
						// 拼接每个作品的html
						let new_html = tag_search_new_html;
						let pageCount = parseInt(this_one_info[j]['pageCount']); // 包含的图片数量
						if (pageCount > 1) { // 多图
							new_html = new_html.replace('<!--xz_multiple_html-->', xz_multiple_html);
						}
						let illustType = this_one_info[j]['illustType']; // 作品类型 0 插画 1 漫画 2 动图
						if (illustType === '2') { // 动图
							new_html = new_html.replace('<!--xz_gif_html-->', xz_gif_html);
						}
						if (this_one_info[j]['isBookmarked']) { // 是否已收藏
							new_html = new_html.replace(/xz_isBookmarked/g, 'on');
						}
						// 填充内容
						new_html = new_html.replace(/xz_illustId/g, this_one_info[j]['illustId']);
						new_html = new_html.replace(/xz_pageCount/g, this_one_info[j]['pageCount']);
						if (display_cover) {
							new_html = new_html.replace(/xz_url/g, this_one_info[j]['url']);
						} else {
							new_html = new_html.replace(/xz_url/g, '');
						}
						new_html = new_html.replace(/xz_illustTitle/g, this_one_info[j]['illustTitle']);
						new_html = new_html.replace(/xz_userId/g, this_one_info[j]['userId']);
						new_html = new_html.replace(/xz_userName/g, this_one_info[j]['userName']);
						new_html = new_html.replace(/xz_userImage/g, this_one_info[j]['userImage']);
						new_html = new_html.replace(/xz_bookmarkCount/g, this_one_info[j]['bookmarkCount']);
						// 设置宽高
						let ture_width = parseInt(this_one_info[j]['width']);
						let ture_height = parseInt(this_one_info[j]['height']);
						let max_width = '198';
						let max_height = '198';
						if (ture_width >= ture_height) {
							new_html = new_html.replace(/xz_width/g, max_width);
							new_html = new_html.replace(/xz_height/g, 'auto');
						} else {
							new_html = new_html.replace(/xz_width/g, 'auto');
							new_html = new_html.replace(/xz_height/g, max_height);
						}
						tag_search_new_html_one_page += new_html;
					}
					tag_search_temp_result.html(tag_search_new_html_one_page);
					tag_search_new_html_one_page = '';
					allPicArea = tag_search_temp_result.find(tag_search_lv2_selector);
					for (let i = 0; i < allPicArea.length; i++) {
						let now_id = this_one_info[i]['illustId'];
						let shoucang = this_one_info[i]['bookmarkCount'];
						if (shoucang >= filterBMK) {
							imgList.push({
								'id': now_id,
								'e': allPicArea[i],
								'num': Number(shoucang)
							});
							$(window.top.document).find(tag_search_lv1_selector).after(allPicArea[i]);
						}
					}
					tag_search_temp_result.html('');
					$('#outputInfo').html(now_tips + '<br>' + xzlt('_tag搜索页已抓取多少页', listPage_finished2, want_page, startpage_no + listPage_finished - 1));
					//判断任务状态
					if (listPage_finished2 == want_page) {
						allow_work = true;
						addOutputInfo('<br>' + xzlt('_tag搜索页任务完成1', $(tag_search_list_selector).length) + '<br><br>');
						tagSearchPageFinished();
						return false;
					} else if (!listPage_document.find('.next ._button')[0]) { //到最后一页了,已抓取本tag的所有页面
						allow_work = true;
						addOutputInfo('<br>' + xzlt('_tag搜索页任务完成2', $(tag_search_list_selector).length) + '<br><br>');
						tagSearchPageFinished();
						return false;
					} else if (interrupt) { //任务被用户中断
						addOutputInfo('<br>' + xzlt('_tag搜索页中断', $(tag_search_list_selector).length) + '<br><br>');
						interrupt = false;
						tagSearchPageFinished();
						return false;
					} else {
						getListPage();
					}
				} else if (page_type === 7) { // 其他排行榜。地区排行榜不经过这个步骤
					let contents = JSON.parse(data).contents; //取出作品信息列表
					for (let i = 0; i < contents.length; i++) {
						let nowClass = '';
						let pageCount = parseInt(contents[i].illust_page_count); // 包含的图片数量
						if (pageCount > 1) { // 多图
							nowClass = 'multiple';
						}
						if (contents[i].illust_type === '2') { // 作品类型 0 插画 1 漫画 2 动图
							nowClass = 'ugoku-illust';
						}
						let nowHref = 'https://www.pixiv.net/member_illust.php?mode=medium&illust_id=' + contents[i].illust_id;
						let bookmarked = contents[i].is_bookmarked;
						checkNotDownType_result(nowClass, nowHref, bookmarked);
					}
					$('#outputInfo').html(now_tips + '<br>' + xzlt('_排行榜进度', listPage_finished));
					if (listPage_finished == part_number) {
						addOutputInfo('<br>' + xzlt('_排行榜任务完成', illust_url_list.length));
						getListUrlFinished();
					} else {
						getListPage();
					}
				} else if (page_type === 9 || down_xiangguan) { //添加收藏后的相似作品
					let illust_list = JSON.parse(data).recommendations; //取出id列表
					for (let i = 0; i < illust_list.length; i++) { //拼接作品的url
						illust_url_list.push('https://www.pixiv.net/member_illust.php?mode=medium&illust_id=' + illust_list[i]);
					}
					addOutputInfo('<br>' + xzlt('_列表页获取完成2', illust_url_list.length));
					getListUrlFinished();
				} else { // 不要把下面的if和这个else合并
					if (page_type === 10 && list_is_new === true) { //关注的新作品 列表改成和tag搜索页一样的了
						let this_one_info = listPage_document.find(tag_search_lv1_selector).attr('data-items'); // 保存这一次的信息
						this_one_info = JSON.parse(this_one_info); // 转化为数组
						for (let j = 0; j < this_one_info.length; j++) {
							let nowClass = '';
							let bookmarked;
							let nowHref = 'https://www.pixiv.net/member_illust.php?mode=medium&illust_id=' + this_one_info[j]['illustId'];
							let pageCount = parseInt(this_one_info[j]['pageCount']); // 包含的图片数量
							if (pageCount > 1) { // 多图
								nowClass = 'multiple';
							}
							let illustType = this_one_info[j]['illustType']; // 作品类型 0 插画 1 漫画 2 动图
							if (illustType === '2') { // 动图
								nowClass = 'ugoku-illust';
							}
							if (this_one_info[j]['isBookmarked']) { // 是否已收藏
								bookmarked = true;
							}
							checkNotDownType_result(nowClass, nowHref, bookmarked);
						}
					} else if (page_type === 13) { // 响应关联作品
						let allPicArea = listPage_document.find('.linkStyleWorks>ul>li');
						for (let i = 0; i < allPicArea.length; i++) {
							// 响应关联作品这里获取的url有额外的后缀，需要去掉。如：
							// https://www.pixiv.net/member_illust.php?mode=medium&illust_id=63854366&uarea=response_out
							illust_url_list.push(allPicArea[i].querySelector('a').href.split('&uarea')[0]);
						}
					} else {
						let allPicArea = listPage_document.find('._image-items .image-item');
						for (let i = 0; i < allPicArea.length; i++) {
							if (allPicArea.eq(i).find('.title').attr('title') === '-----') { //如果这个作品被删除、或非公开
								continue;
							}
							let nowClass = allPicArea.eq(i).find('a').eq(0).attr('class');
							let nowHref = allPicArea.eq(i).find('a').eq(0).attr('href');
							let bookmarked = allPicArea.eq(i).find('._one-click-bookmark')[0].classList.contains('on');
							checkNotDownType_result(nowClass, nowHref, bookmarked);
						}
					}

					$('#outputInfo').html(now_tips + '<br>' + xzlt('_列表页抓取进度', listPage_finished));
					//判断任务状态
					if (!listPage_document.find('.next ._button')[0] || listPage_finished == want_page) { //如果没有下一页的按钮或者抓取完指定页面
						allow_work = true;
						listPage_finished = 0;
						addOutputInfo('<br>' + xzlt('_列表页抓取完成'));
						if (illust_url_list.length === 0) { //没有符合条件的作品
							addOutputInfo('<br>' + xzlt('_列表页抓取结果为零'));
							return false;
						}
						getListUrlFinished();
					} else {
						getListPage();
					}
				}
			},
			statusCode: {
				404: function () {
					if (page_type === 7) { //其他排行榜
						//如果发生了404错误，则中断抓取，直接下载已有部分。（因为可能确实没有下一部分了，只是这种情况我们没见到。这样的话之前预设的最大页数可能就不对
						console.log('404错误，直接下载已有部分');
						addOutputInfo('<br>' + xzlt('_排行榜列表页抓取遇到404', illust_url_list.length) + '<br><br>');
						getListUrlFinished();
					}
				}
			}
		});
	}

	// 第二个获取列表的函数，仅在tag搜索页和地区排行榜使用（不使用 ajax，从当前列表页直接获取所有内容页的列表）
	function getListPage2() {
		changeTitle('↑');
		if (!allow_work) {
			alert(xzlt('_当前任务尚未完成2'));
			return false;
		}
		if (page_type === 5) {
			if ($(tag_search_list_selector + ':visible').length === 0) {
				return false;
			}
			if (interrupt) {
				interrupt = false;
			}
			illust_url_list = [];
			resetResult();
			// 因为tag搜索页里的下载按钮没有启动 startGet，而是在这里，所以有些检查在这里进行
			// 检查排除作品类型的设置
			if (checkNotDownType() === false) {
				return false;
			}
			// 检查是否设置了只下载书签作品
			checkOnlyBMK();
			// 检查是否设置了多图作品的张数限制
			check_multiple_down_number();
			// 检查是否设置了宽高条件
			checkSetWH();
			// 获取必须包含的tag
			get_Need_Tag();
			// 获取要排除的tag
			get_NotNeed_Tag();
		}
		allow_work = false;
		if (page_type === 5) { // tag搜索页
			let allPicArea = $(tag_search_list_selector + ':visible');
			for (let i = allPicArea.length - 1; i >= 0; i--) {
				// 因为此页面类型里，判断作品类型的class与其他页面不同，所以在这里转换成能被接下来的函数识别的字符
				let nowClass = '';
				if (allPicArea.eq(i).find(tag_search_multiple_selector)[0] !== undefined) {
					nowClass = 'multiple';
				} else if (allPicArea.eq(i).find(tag_search_gif_selector)[0] !== undefined) {
					nowClass = 'ugoku-illust';
				}
				let nowHref = allPicArea.eq(i).find('a').eq(0).attr('href');
				let bookmarked = allPicArea.eq(i).find('._one-click-bookmark')[0].classList.contains('on');
				checkNotDownType_result(nowClass, nowHref, bookmarked);
			}
		} else { // 地区排行榜
			let allPicArea = $('.ranking-item');
			for (let i = allPicArea.length - 1; i >= 0; i--) {
				let nowClass = allPicArea.eq(i).find('a').eq(1).attr('class');
				let nowHref = allPicArea.eq(i).find('a').eq(1).attr('href');
				let bookmarked = allPicArea.eq(i).find('._one-click-bookmark')[0].classList.contains('on');
				checkNotDownType_result(nowClass, nowHref, bookmarked);
			}
		}
		insertOutputInfo();
		addOutputInfo('<br>' + xzlt('_列表抓取完成开始获取作品页', illust_url_list.length));
		if (illust_url_list.length <= 0) {
			addOutputInfo('<br>' + xzlt('_参数不合法1'));
		}
		getListUrlFinished();
	}

	// 获取用户id
	function getUserId() {
		let user_id = '';
		if (location.search.match(/\?id=\d{1,9}/)) { // 首先尝试从 url 中取得
			user_id = location.search.match(/id=\d{1,9}/)[0].split('=')[1];
		} else if (document.querySelector('.user-name')) { // 旧版收藏的用户头像区域，在书签页面还在使用
			user_id = document.querySelector('.user-name').href.match(/id=\d{1,9}/)[0].split('=')[1];
		} else if (document.querySelector('._2lyPnMP')) { // 新版收藏的用户头像区域
			user_id = document.querySelector('._2lyPnMP').href.match(/id=\d{1,9}/)[0].split('=')[1];
		}
		return user_id;
	}

	// 获取用户名称
	function getUserName() {
		let isLogin;
		if (typeof dataLayer !== 'undefined') {
			isLogin = dataLayer[0].login === 'yes' ? true : false;
		} else {
			isLogin = /login: 'yes'/.test(document.body.innerHTML);
		}
		let titleContent = isLogin ? old_title : document.querySelector('meta[property="og:title"]').content;
		let regexp = '「([^」]*)';
		if (titleContent.split('「').length > 2) { // 判断是 member.php 还是 member_illust.php
			regexp = `\/${regexp}`;
		}
		regexp = new RegExp(regexp, 'i');
		let [, username] = regexp.exec(titleContent);
		return username;
	}

	// 从 url 中取出指定的查询条件
	function getQuery(input, query) {
		let arr1 = input.split('?');
		let queryPart = [];
		let result = {};
		if (arr1.length > 1) {
			queryPart = arr1[1];
		} else {
			return false;
		}
		queryPart = queryPart.split('&');
		queryPart.forEach(el => {
			let arr2 = el.split('=');
			if (arr2.length > 0) {
				result[arr2[0]] = arr2[1];
			}
		});
		return result[query];
	}

	// 获取 json 对象的 key
	function getJSONKey(object) {
		let key_list = [];
		for (const key in object) {
			if (object.hasOwnProperty(key)) {
				key_list.push(key);
			}
		}
		return key_list;
	}

	// 在 page_type 2 使用，准备获取作品 id 列表
	function readyGetListPage3() {
		// 每次开始时重置一些条件
		offset_number = 0;
		type2_id_list = [];
		works_type = 0;
		// works_type:
		// 0	插画和漫画全都要，但是不带 tag
		// 4	插画和漫画全都要，带 tag
		// 1	只要插画
		// 2	只要漫画
		// 3	书签作品
		tag_mode = getQuery(loc_url, 'tag') ? true : false; // 是否是 tag 模式

		// 每页个数
		let once_number = 48; // 新版每页 48 个作品（因为新版不显示无法访问的作品，所以有时候一页不足这个数量）
		if (document.querySelector('.user-name')) { // 旧版每页 20 个作品
			once_number = 20;
		}

		// 如果前面有页数，就去掉前面页数的作品数量。即：从本页开始下载
		let now_page = getQuery(loc_url, 'p'); // 判断当前处于第几页
		if (now_page) {
			offset_number = (now_page - 1) * once_number;
		}
		if (offset_number < 0) {
			offset_number = 0;
		}

		// 根据页数设置，计算要下载的个数
		requset_number = 0;
		if (want_page === -1) {
			requset_number = 9999999;
		} else {
			requset_number = once_number * want_page;
		}

		// 根据不同的页面类型，选择不同的 API 来获取 id 列表
		let api_url = `https://www.pixiv.net/ajax/user/${getUserId()}/profile/all`;
		if (loc_url.indexOf('member.php?id=') > -1) { // 资料页主页
			// 采用默认设置即可，无需进行处理
		} else if (loc_url.indexOf('member_illust.php?id=') > -1) { // 作品列表页
			if (getQuery(loc_url, 'type') === 'illust') { // 插画分类
				works_type = 1;
				if (tag_mode) { // 带 tag
					api_url = `https://www.pixiv.net/ajax/user/${getUserId()}/illusts/tag/${getQuery(loc_url, 'tag')}?offset=${offset_number}&limit=${requset_number}`;
				}
			} else if (getQuery(loc_url, 'type') === 'manga') { // 漫画分类
				works_type = 2;
				if (tag_mode) { // 带 tag
					api_url = `https://www.pixiv.net/ajax/user/${getUserId()}/manga/tag/${getQuery(loc_url, 'tag')}?offset=${offset_number}&limit=${requset_number}`;
				}
			} else if (tag_mode) { // url 里没有插画也没有漫画，但是有 tag，则是在资料页首页点击了 tag，需要同时获取插画和漫画
				works_type = 4;
				api_url = `https://www.pixiv.net/ajax/user/${getUserId()}/illustmanga/tag/${getQuery(loc_url, 'tag')}?offset=${offset_number}&limit=${requset_number}`;
			}
		} else if (loc_url.indexOf('bookmark.php') > -1) { // 书签页面，需要多次循环获取
			works_type = 3;
			let rest_mode = 'show'; // 公开或非公开
			if (getQuery(loc_url, 'rest') === 'hide') {
				rest_mode = 'hide';
			}
			let now_tag = ''; // 要使用的tag
			if (getQuery(loc_url, 'untagged') == 1) { // “未分类”页面，设置 tag
				now_tag = encodeURI('未分類');
			}
			if (tag_mode) { // 如果有 tag
				now_tag = getQuery(loc_url, 'tag');
			}
			api_url = `https://www.pixiv.net/ajax/user/${getUserId()}/illusts/bookmarks?tag=${now_tag}&offset=${offset_number}&limit=${once_request}&rest=${rest_mode}`;
		} else { // 不进行抓取
			allow_work = true;
			return false;
		}

		changeTitle('↑');
		getListPage3(api_url);
		addOutputInfo('<br>' + xzlt('_正在抓取'));
		if (works_type === 3 && want_page === -1) {
			addOutputInfo('<br>' + xzlt('_获取全部书签作品'));
		}
	}

	// 获取 page_type 2 的作品 id 列表
	function getListPage3(url) {
		let bmk_get_end = false; // 书签作品是否获取完毕
		$.ajax({
			url: url,
			type: 'get',
			async: true,
			cache: false,
			dataType: 'json',
			success: function (data) {
				if (works_type !== 3) { // 获取非书签页面的作品（插画、漫画、或者全部）
					if (!tag_mode) { // 不带 tag
						// https://www.pixiv.net/ajax/user/27517/profile/all
						if (works_type === 0) { // 获取全部插画和漫画
							type2_id_list = type2_id_list.concat(getJSONKey(data.body.illusts)).concat(getJSONKey(data.body.manga));
						} else if (works_type === 1 || works_type === 5) { // 插画 或 动图
							type2_id_list = type2_id_list.concat(getJSONKey(data.body.illusts));
						} else if (works_type === 2) { // 漫画
							type2_id_list = type2_id_list.concat(getJSONKey(data.body.manga));
						}
					} else { // 带 tag 的话
						if (works_type === 1 || works_type === 2 || works_type === 4) { // 插画、漫画、或者全都要并带 tag ，数据结构都一样
							// https://www.pixiv.net/ajax/user/27517/illusts/tag/%E5%A5%B3%E3%81%AE%E5%AD%90?offset=0&limit=9999999
							// https://www.pixiv.net/ajax/user/27517/manga/tag/%E5%A5%B3%E3%81%AE%E5%AD%90?offset=0&limit=9999999
							// https://www.pixiv.net/ajax/user/544479/illustmanga/tag/%E6%9D%B1%E9%A2%A8%E8%B0%B7%E6%97%A9%E8%8B%97?offset=0&limit=9999999
							let works = data.body.works;
							works.forEach(element => {
								type2_id_list.push(element.id);
							});
						} else if (works_type === 5) { // 动图
							type2_id_list = type2_id_list.concat(getJSONKey(data.body.illusts));
						}
					}
				} else { // 书签页面，数据结构和 works_type 1、2 基本一样
					// https://www.pixiv.net/ajax/user/9460149/illusts/bookmarks?tag=&offset=0&limit=100&rest=show
					// https://www.pixiv.net/ajax/user/9460149/illusts/bookmarks?tag=推荐&offset=0&limit=100&rest=show
					let works = data.body.works;
					if (works.length === 0 || type2_id_list.length >= requset_number) { // 获取数量超出实际存在数量，works 长度为 0
						bmk_get_end = true;
					} else {
						works.forEach(element => {
							type2_id_list.push(element.id);
						});
					}
				}

				if (type2_id_list.length > 0) {
					if (works_type === 0 || (works_type === 1 && !tag_mode) || (works_type === 2 && !tag_mode)) { // 非 tag 页，并且非 tag 页
						// 在获取全部作品时（即使用默认的 api 时），由于 API 里不能设置 requset_number，所以要在这里处理。
						// 把 id 从小到大排序
						// 转换成数字
						for (let index = 0; index < type2_id_list.length; index++) {
							type2_id_list[index] = parseInt(type2_id_list[index]);
						}
						// 升序排列
						type2_id_list.sort(function (x, y) {
							return x - y;
						});
						// 删除后面的 id（删除不需要的近期作品）
						type2_id_list.splice(type2_id_list.length - offset_number, type2_id_list.length);
					}

					// 获取完毕，不需要重复调用本函数的情况
					if (works_type !== 3 || bmk_get_end) {
						// 删除多余的作品
						if (type2_id_list.length > requset_number) {
							if (works_type !== 3) { // 删除前面部分
								type2_id_list.splice(0, type2_id_list.length - requset_number);
							} else { // 书签作品需要删除后面部分
								type2_id_list.splice(requset_number, type2_id_list.length);
							}
						}
						// 重置之前的结果
						illust_url_list = [];
						// 拼接作品的url
						type2_id_list.forEach(id => {
							illust_url_list.push('https://www.pixiv.net/member_illust.php?mode=medium&illust_id=' + id);
						});
						// 获取 id 列表完成
						addOutputInfo('<br>' + xzlt('_列表抓取完成开始获取作品页', illust_url_list.length));
						getListUrlFinished();
					} else if (works_type === 3 && !bmk_get_end) { // 如果是书签页，且没有获取完毕，则重复执行
						offset_number += once_request; // 每次增加偏移量，并获取之后固定数量
						url = url.replace(/offset=\d*\d?/, `offset=${offset_number}`);
						getListPage3(url);
					}
				} else {
					addOutputInfo('<br>' + xzlt('_列表页抓取结果为零'));
					allow_work = true;
					return false;
				}
			}
		});
	}

	// 作品列表获取完毕，开始抓取图片内容页
	function getListUrlFinished() {
		now_tips = $('#outputInfo').html();
		if (illust_url_list.length < ajax_for_illust_threads) {
			ajax_for_illust_threads = illust_url_list.length;
		}
		for (let i = 0; i < ajax_for_illust_threads; i++) {
			setTimeout(getIllustPage(illust_url_list[0]), i * ajax_for_illust_delay);
		}
	}

	// 获取作品内容页面的函数（区别于获取列表页面的函数）
	function getIllustPage(url) {
		/*
		url参数为完整的作品url，或者不包含根路径的作品url，如：
		https://www.pixiv.net/member_illust.php?mode=medium&illust_id=65546468
		/member_illust.php?mode=medium&illust_id=65546468
		*/
		changeTitle('↑');
		illust_url_list.shift(); //有时并未使用illust_url_list，但对空数组进行shift()是合法的
		if (interrupt) { //判断任务是否已中断，目前只在tag搜索页有用到
			allow_work = true;
			return false;
		}
		if (quick) { // 快速下载时在这里提示一次
			$(outputInfo).html($(outputInfo).html() + xzlt('_开始获取作品页面'));
			now_tips = $(outputInfo).html();
		}
		url = 'https://www.pixiv.net/ajax/illust/' + url.match(/\d.*\d/)[0].split('&')[0]; // 取出作品id，拼接出作品页api

		$.ajax({
			url: url,
			type: 'get',
			async: true,
			cache: false,
			dataType: 'text',
			success: function (data) {
				if (interrupt) { //这里需要再判断一次，因为ajax执行完毕是需要时间的
					allow_work = true;
					return false;
				}

				// 预设及获取图片信息
				let jsInfo = JSON.parse(data); // 储存作品信息
				jsInfo = jsInfo.body;
				let id = jsInfo.illustId;
				let fullWidth = parseInt(jsInfo.width); //原图宽度
				let fullHeight = parseInt(jsInfo.height); //原图高度
				let title = jsInfo.illustTitle;
				let nowAllTagInfo = jsInfo.tags.tags; // tag列表
				let nowAllTag = [];
				for (let i = nowAllTagInfo.length - 1; i >= 0; i--) {
					nowAllTag[i] = nowAllTagInfo[i].tag;
				}
				let userid = jsInfo.userId; //画师id
				let user = ''; //画师名字
				if (nowAllTagInfo.length > 0) {
					user = nowAllTagInfo[0].userName; // 从第一个tag里取出画师名字
				}
				let bmk = jsInfo.bookmarkCount; // 收藏数
				let ext = ''; //扩展名
				let imgUrl = '';

				// 检查宽高设置
				let WH_check_result = true; //预设为通过
				if (is_set_filterWH) {
					if (fullWidth < filterWH.width && fullHeight < filterWH.height) { //如果宽高都小于要求的宽高
						WH_check_result = false;
					} else {
						if (filterWH.and_or === '|') {
							if (fullWidth >= filterWH.width || fullHeight >= filterWH.height) { //判断or的情况
								WH_check_result = true;
							} else {
								WH_check_result = false;
							}
						} else if (filterWH.and_or === '&') {
							if (fullWidth >= filterWH.width && fullHeight >= filterWH.height) { //判断and的情况
								WH_check_result = true;
							} else {
								WH_check_result = false;
							}
						}
					}
				}

				// 检查收藏数要求
				let BMK_check_result = true; //预设为通过
				if (is_set_filterBMK) {
					if (bmk < filterBMK) {
						BMK_check_result = false;
					}
				}

				// 检查只下载书签作品设置
				let check_bookmark_pass = true;
				if (only_down_bmk) {
					if (jsInfo.bookmarkData === null) { // 没有收藏
						check_bookmark_pass = false; //	检查不通过
					}
				}

				// 检查要排除的tag 其实page_type==9的时候在获取作品列表时就能获得tag列表，但为了统一，也在这里检查
				let tag_check_result; // 储存tag检查结果

				// 检查要排除的tag，如果有多个，只需要满足一个即可
				let tag_notNeed_isFound = false;
				if (notNeed_tag.length > 0) { //如果设置了过滤tag
					outerloop: //命名外圈语句
						for (let i = nowAllTag.length - 1; i >= 0; i--) {
							for (let ii = notNeed_tag.length - 1; ii >= 0; ii--) {
								if (nowAllTag[i] === notNeed_tag[ii]) {
									tag_notNeed_isFound = true;
									break outerloop;
								}
							}
						}
				}

				// 检查必须包含的tag，如果有多个，需要全部包含
				if (!tag_notNeed_isFound) { //如果没有匹配到要排除的tag
					if (need_tag.length > 0) { //如果设置了必须包含的tag
						let tag_need_isFound = false;
						let tag_need_matched = 0;
						for (let i = nowAllTag.length - 1; i >= 0; i--) {
							for (let ii = need_tag.length - 1; ii >= 0; ii--) {
								if (nowAllTag[i] === need_tag[ii]) {
									tag_need_matched++;
								}
							}
						}
						// 如果全部匹配
						if (tag_need_matched === need_tag.length) {
							tag_need_isFound = true;
						}
						tag_check_result = tag_need_isFound;
					} else { //如果没有设置必须包含的tag，则通过
						tag_check_result = true;
					}
				} else { //如果匹配到了要排除的tag，则不予通过
					tag_check_result = false;
				}

				// 作品类型：
				// 1	单图
				// 2	多图
				// 3	动图
				let this_illust_type;
				if (jsInfo.illustType === 0 || jsInfo.illustType === 1) { // 单图或多图，0插画1漫画2动图（1的如68430279）
					if (jsInfo.pageCount === 1) { // 单图
						this_illust_type = 1;
					} else if (jsInfo.pageCount > 1) { // 多图
						this_illust_type = 2;
					}
				} else if (jsInfo.illustType === 2) { // 动图
					this_illust_type = 3;
				}

				// 结合作品类型处理作品
				if (this_illust_type === 1 && tag_check_result && check_bookmark_pass && WH_check_result && BMK_check_result) { //如果是单图，并且通过了tag检查和宽高检查和收藏检查和收藏数检查
					if (notdown_type.indexOf('1') === -1) { //如果没有排除单图
						imgUrl = jsInfo.urls.original;
						ext = imgUrl.split('.');
						ext = ext[ext.length - 1]; //扩展名
						addImgInfo(id + '_p0', imgUrl, title, nowAllTag, user, userid, fullWidth, fullHeight, ext, bmk);
						outputImgNum();
					}
				} else if (this_illust_type !== 1 && tag_check_result && check_bookmark_pass && WH_check_result && BMK_check_result) { //单图以外的情况,并且通过了tag检查和宽高检查和收藏检查和收藏数检查
					if (this_illust_type === 3) { //如果是动图
						if (notdown_type.indexOf('3') === -1) { //如果没有排除动图
							// 动图的最终url如：
							// https://i.pximg.net/img-zip-ugoira/img/2018/04/25/21/27/44/68401493_ugoira1920x1080.zip
							imgUrl = jsInfo.urls.original.replace('img-original', 'img-zip-ugoira').replace('ugoira0', 'ugoira1920x1080').replace('jpg', 'zip').replace('png', 'zip');
							ext = 'ugoira'; //扩展名
							addImgInfo(id, imgUrl, title, nowAllTag, user, userid, fullWidth, fullHeight, ext, bmk);
							outputImgNum();
						}
					} else { //多图作品
						if (notdown_type.indexOf('2') === -1) { //如果没有排除多图
							let pNo = jsInfo.pageCount; //P数
							// 检查是否需要修改下载的张数。有效值为大于0并不大于总p数，否则下载所有张数
							if (multiple_down_number > 0 && multiple_down_number <= pNo) {
								pNo = multiple_down_number;
							}
							// 获取多p作品的原图页面
							imgUrl = jsInfo.urls.original;
							ext = imgUrl.split('.');
							ext = ext[ext.length - 1];
							for (let i = 0; i < pNo; i++) {
								let now_url = imgUrl.replace('p0', 'p' + i); //拼接出每张图片的url
								addImgInfo(id + '_p' + i, now_url, title, nowAllTag, user, userid, fullWidth, fullHeight, ext, bmk);
							}
							// 检查网址并添加到数组的动作执行完毕
							outputImgNum();
						}
					}
				}

				if (page_type === 1 && !down_xiangguan) { // 在作品页内下载时，设置的want_page其实是作品数
					if (want_page > 0) {
						want_page--;
					}
					if (want_page === -1 || want_page > 0) { // 应该继续下载时
						// 检查是否有下一个作品
						// 在所有不为null的里面（可能有1-3个），取出key比当前作品id小的那一个，就是下一个
						let user_illust = jsInfo.userIllusts;
						let next_id;
						for (let key in user_illust) {
							if (user_illust[key]) {
								if (user_illust[key].illustId < id) {
									next_id = user_illust[key].illustId;
									break;
								}
							}
						}
						if (next_id) {
							getIllustPage('https://www.pixiv.net/member_illust.php?mode=medium&illust_id=' + next_id);
						} else { //没有剩余作品
							allow_work = true;
							allWorkFinished();
						}
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
				0: function () {
					//ERR_CONNECTION_RESET
					console.log(xzlt('_作品页状态码0'));
					illust_error(url);
				},
				400: function () {
					//400错误
					console.log(xzlt('_作品页状态码400')); //在收藏的作品列表中，有些作品被作者删除了，却还显示有“编辑”按钮（但也有些没有这个按钮）。点击这个按钮会跳转到错误的“编辑收藏”页面，导致400错误。这个情况仅在下载书签作品时会发生。
					illust_error(url);
				},
				403: function () {
					//403错误
					console.log(xzlt('_作品页状态码403'));
					illust_error(url);
				},
				404: function () {
					//404错误。无法访问的作品 测试id=35697511
					console.log(xzlt('_作品页状态码404') + ' ' + url);
					illust_error(url);
				}
			}
		});
	}

	// 测试图片url是否正确的函数。对于mode=big的作品和pixivision、pixiv特辑，可以拼接出图片url，只是后缀都是jpg的，所以要测试下到底是jpg还是png
	function testExtName(url, length, img_info_data) {
		test_suffix_finished = false;
		// 初步获取到的后缀名都是jpg的
		let ext = '';
		let testImg = new Image();
		testImg.src = url;
		testImg.onload = function () {
			nextStep(true);
		};
		testImg.onerror = function () {
			nextStep(false);
		};

		function nextStep(bool) {
			if (bool) {
				ext = 'jpg';
			} else {
				url = url.replace('.jpg', '.png');
				ext = 'png';
			}
			addImgInfo(img_info_data.id, url, img_info_data.title, img_info_data.tags, img_info_data.user, img_info_data.userid, img_info_data.fullWidth, img_info_data.fullHeight, ext, '');
			outputImgNum();
			if (length !== undefined) { //length参数只有在获取pixivision插画和pixiv特辑时才会传入
				test_suffix_no++;
				if (test_suffix_no === length) { //如果所有请求都执行完毕
					allWorkFinished();
				}
			}
			test_suffix_finished = true;
		}
	}
	// mode=big类型在pc端可能已经消失了，但是移动端查看大图还是big https://www.pixiv.net/member_illust.php?mode=big&illust_id=66745241
	// pixivision则是因为跨域问题，无法抓取p站页面

	// 抓取完毕
	function allWorkFinished() {
		// 检查快速下载状态
		quiet_download = XZForm.setQuietDownload.checked;
		if (test_suffix_finished) { // 检查网址的任务 是否都全部完成。
			if (down_xiangguan) { // 如果是作品页内下载相关作品，到这里解除这个标识
				down_xiangguan = false;
			}
			if (page_type === 2) { // 在画师的列表页里，把 url 倒序排列，可以先下载最新作品，后下载早期作品
				img_info.sort(sortByProperty('id'));
			}
			$(outputInfo).html($(outputInfo).html() + '<br>' + xzlt('_获取图片网址完毕', img_info.length) + '<br>');
			if (img_info.length === 0) {
				$(outputInfo).html($(outputInfo).html() + xzlt('_没有符合条件的作品') + '<br><br>');
				alert(xzlt('_没有符合条件的作品弹窗'));
				allow_work = true;
				return false;
			}
			// 显示输出结果完毕
			$(outputInfo).html($(outputInfo).html() + xzlt('_抓取完毕') + '<br><br>');
			if (!quiet_download && !quick) {
				changeTitle('▶');
			}
			now_tips = $(outputInfo).html();
			// 重置输出区域
			downloaded = 0;
			$('.downloaded').html('0');
			$('.download_fileName').html('');
			$('.loaded').html('0/0');
			$('.progress').css('width', '0%');
			$('.imgNum').text(img_info.length);
			downloadPanelShow();
			// 显示输出区域
			if (!quick) {
				centerWrapShow();
			}

			// 快速下载时点击下载按钮
			if (quick || quiet_download) {
				setTimeout(function () {
					$('.startDownload').click();
				}, 200);
			}
		} else { //如果没有完成，则延迟一段时间后再执行
			setTimeout(function () {
				allWorkFinished();
			}, 1000);
		}
	}

	// 创建输出抓取进度的区域
	let outputInfo = document.createElement('div');
	outputInfo.id = 'outputInfo';
	outputInfo.style.cssText = 'background: #fff;padding: 10px;font-size: 14px;margin:6px auto;width:950px;';

	// 添加输出区域
	function insertOutputInfo() {
		if (document.querySelector('#outputInfo') === null) {
			if (location.hostname === 'www.pixivision.net') {
				$('._header-container').eq(0).before(outputInfo);
			} else {
				insertToHead(outputInfo);
			}
		}
	}

	// 在抓取图片网址时，输出提示
	function outputImgNum() {
		$(outputInfo).html(now_tips + '<br>' + xzlt('_抓取图片网址的数量', img_info.length));
		if (interrupt) { //如果任务中断
			addOutputInfo('<br>' + xzlt('_抓取图片网址遇到中断') + '<br><br>');
		}
	}

	// 向中间面板添加按钮
	function addCenterButton(e, bg) {
		e.style.backgroundColor = bg;
		center_btn_wrap.appendChild(e);
	}

	// 添加css样式表
	let styleE = document.createElement('style');
	document.body.appendChild(styleE);
	styleE.innerHTML = '';

	// 输出右侧按钮区域
	function addRightButton() {
		rightButton = document.createElement('div');
		rightButton.id = 'rightButton';
		rightButton.innerHTML = '↓';
		styleE.innerHTML += '#rightButton{position: fixed;top: 15%;right: 0;z-index: 1000;line-height:20px;font-size:14px;border-radius: 3px;color: #fff;text-align: center;cursor: pointer;padding:8px;box-sizing:content-box;background:#BECAD7;}';
		document.body.appendChild(rightButton);
		// 绑定切换右侧按钮显示的事件
		rightButton.addEventListener('click', function () {
			centerWrapShow();
		}, false);
	}

	// 显示提示
	function XZTip(arg) {
		let tip_text = this.dataset.tip;
		if (!tip_text) {
			return false;
		}
		if (arg.type === 1) {
			XZTipEl.innerHTML = tip_text;
			XZTipEl.style.left = arg.x + 30 + 'px';
			XZTipEl.style.top = arg.y - 30 + 'px';
			XZTipEl.style.display = 'block';
		} else if (arg.type === 0) {
			XZTipEl.style.display = 'none';
		}
	}

	// 添加中间的面板
	function addCenterWarps() {
		// 添加输出 url 列表、文件名列表的面板
		let outputInfoWrap = document.createElement('div');
		document.body.appendChild(outputInfoWrap);
		outputInfoWrap.outerHTML = `
		<div class="outputInfoWrap">
		<div class="outputUrlClose" title="${xzlt('_关闭')}">X</div>
		<div class="outputUrlTitle">${xzlt('_输出信息')}</div>
		<div class="outputInfoContent"></div>
		<div class="outputUrlFooter">
		<div class="outputUrlCopy" title="">${xzlt('_复制')}</div>
		</div>
		</div>
		`;
		styleE.innerHTML += `
		.outputInfoWrap{padding: 20px 30px;width: 520px;background:#fff;border-radius: 20px;z-index: 9999;box-shadow: 0px 0px 15px #2ca6df;display: none;position: fixed;top: 15%; margin-left: -300px;left: 50%;}
		.outputUrlTitle{height: 20px;line-height: 20px;text-align: center;font-size:18px;color:#179FDD;}
		.outputInfoContent{border: 1px solid #ccc;transition: .3s;font-size: 14px;margin-top: 10px;padding: 5px 10px;overflow: auto;max-height:400px;line-height:20px;}
		.outputInfoContent::selection{background:#179FDD;color:#fff;}
		.outputUrlFooter{height: 60px;text-align: center;}
		.outputUrlClose{cursor: pointer;position: absolute;width: 30px;height: 30px;top:20px;right:30px;z-index: 9999;font-size:18px;text-align:center;}
		.outputUrlClose:hover{color:#179FDD;}
		.outputUrlCopy{height: 34px;line-height: 34px;min-width:100px;padding: 2px 25px;margin-top: 15px;background:#179FDD;display:inline-block;color:#fff;font-size:14px;border-radius:6px;cursor:pointer;}
		`;
		// 绑定关闭输出url区域的事件
		$('.outputUrlClose').on('click', function () {
			$('.outputInfoWrap').hide();
		});
		// 绑定复制url的事件
		$('.outputUrlCopy').on('click', function () {
			let range = document.createRange();
			range.selectNodeContents($('.outputInfoContent')[0]);
			window.getSelection().removeAllRanges();
			window.getSelection().addRange(range);
			document.execCommand('copy');
			// 改变提示文字
			$('.outputUrlCopy').text(xzlt('_已复制到剪贴板'));
			setTimeout(function () {
				window.getSelection().removeAllRanges();
				$('.outputUrlCopy').text(xzlt('_复制'));
			}, 1000);
		});

		// 添加下载面板
		centerWrap = document.createElement('div');
		document.body.appendChild(centerWrap);
		centerWrap.outerHTML = `
		<div class="XZTipEl"></div>
		<div class="centerWrap">
		<div class="centerWrap_head">
		<span class="centerWrap_title xz_blue"> ${xzlt('_下载设置')}</span>
		<a class="xztip github_url" data-tip="${xzlt('_Github')}" href="https://github.com/xuejianxianzun/XZPixivDownloader" target="_blank"><img src="https://s1.ax1x.com/2018/11/12/iLeI4x.png" /></a>
		<a class="xztip firefox_extension" data-tip="${xzlt('_firefox 扩展')}" href="https://addons.mozilla.org/zh-CN/firefox/addon/pixiv-batch-downloader/" target="_blank" style="display:none;">🦊</a>
		<a class="xztip chrome_extension" data-tip="${xzlt('_chrome 扩展')}" href="https://chrome.google.com/webstore/detail/pixiv-batch-downloader/hfgoikdmppghehigkckknikdgdcjbfpl" target="_blank"><img src="https://s1.ax1x.com/2018/11/12/iLEY3F.png" /></a>
		<div class="xztip centerWrap_toogle_option" data-tip="${xzlt('_收起展开设置项')}">▲</div>
		<div class="xztip centerWrap_close" data-tip="${xzlt('_快捷键切换显示隐藏')}">X</div>
		</div>
		<div class="centerWrap_con">
		<form class="XZForm">
		<div class="xz_option_area">
		<p class="XZFormP1">
		<span class="setWantPageWrap">
		<span class="xztip settingNameStyle1 setWantPageTip1" data-tip="" style="margin-right: 0px;">${xzlt('_页数')}</span><span class="gray1" style="margin-right: 10px;"> ? </span>
		<input type="text" name="setWantPage" class="setinput_style1 xz_blue setWantPage">&nbsp;&nbsp;&nbsp;
		<span class="setWantPageTip2 gray1">-1 或者大于 0 的数字</span>
		</span>
		</p>
		<p class="XZFormP2">
		<span class="xztip settingNameStyle1" data-tip="${xzlt('_筛选收藏数的提示_center')}">${xzlt('_筛选收藏数_center')}<span class="gray1"> ? </span></span>
		<input type="text" name="setFavNum" class="setinput_style1 xz_blue" value="0">&nbsp;&nbsp;&nbsp;&nbsp;
		</p>
		<p class="XZFormP3">
		<span class="xztip settingNameStyle1" data-tip="${xzlt('_多p下载前几张提示')}">${xzlt('_多p下载前几张')}<span class="gray1"> ? </span></span>
		<input type="text" name="setPNo" class="setinput_style1 xz_blue" value="${multiple_down_number}">
		</p>
		<p class="XZFormP4">
		<span class="xztip settingNameStyle1" data-tip="${xzlt('_筛选宽高的按钮_title')} ${xzlt('_筛选宽高的提示文字')}">${xzlt('_筛选宽高的按钮文字')}<span class="gray1"> ? </span></span>
		<input type="text" name="setWidth" class="setinput_style1 xz_blue" value="0">
		<input type="radio" name="setWidth_AndOr" id="setWidth_AndOr1" value="&" checked> <label for="setWidth_AndOr1">and&nbsp;</label>
		<input type="radio" name="setWidth_AndOr" id="setWidth_AndOr2" value="|"> <label for="setWidth_AndOr2">or&nbsp;</label>
		<input type="text" name="setHeight" class="setinput_style1 xz_blue" value="0">
		</p>
		<p class="XZFormP5">
		<span class="xztip settingNameStyle1" data-tip="${xzlt('_设置作品类型的提示_center')}">${xzlt('_设置作品类型')}<span class="gray1"> ? </span></span>
		<label for="setWorkType1"><input type="checkbox" name="setWorkType1" id="setWorkType1" checked> ${xzlt('_单图')}&nbsp;</label>
		<label for="setWorkType2"><input type="checkbox" name="setWorkType2" id="setWorkType2" checked> ${xzlt('_多图')}&nbsp;</label>
		<label for="setWorkType3"><input type="checkbox" name="setWorkType3" id="setWorkType3" checked> ${xzlt('_动图')}&nbsp;</label>
		</p>
		<p class="XZFormP11">
		<span class="xztip settingNameStyle1" data-tip="${xzlt('_只下载已收藏的提示')}">${xzlt('_只下载已收藏')}<span class="gray1"> ? </span></span>
		<label for="setOnlyBMK"><input type="checkbox" name="setOnlyBMK" id="setOnlyBMK"> ${xzlt('_启用')}</label>
		</p>
		<p class="XZFormP6">
		<span class="xztip settingNameStyle1" data-tip="${xzlt('_必须tag的提示文字')}">${xzlt('_必须含有tag')}<span class="gray1"> ? </span></span>
		<input type="text" name="setTagNeed" class="setinput_style1 xz_blue setinput_tag">
		</p>
		<p class="XZFormP7">
		<span class="xztip settingNameStyle1" data-tip="${xzlt('_排除tag的提示文字')}">${xzlt('_不能含有tag')}<span class="gray1"> ? </span></span>
		<input type="text" name="setTagNotNeed" class="setinput_style1 xz_blue setinput_tag">
		</p>
		<p class="XZFormP9" style="display:none;">
		<span class="xztip settingNameStyle1" data-tip="${xzlt('_显示封面的提示')}">${xzlt('_是否显示封面')}<span class="gray1"> ? </span></span>
		<label for="setDisplayCover"><input type="checkbox" name="setDisplayCover" id="setDisplayCover" checked> ${xzlt('_显示')}</label>
		</p>
		<p class="XZFormP8">
		<span class="xztip settingNameStyle1" data-tip="${xzlt('_快速下载的提示')}">${xzlt('_是否快速下载')}<span class="gray1"> ? </span></span>
		<label for="setQuietDownload"><input type="checkbox" name="setQuietDownload" id="setQuietDownload"> ${xzlt('_启用')}</label>
		</p>
		</div>
		<div class="centerWrap_btns centerWrap_btns_free">

		</div>
		<p> ${xzlt('_设置命名规则3', '<span class="fwb xz_blue imgNum">0</span>')}</p>
		<p>
		<span class="xztip settingNameStyle1" data-tip="${xzlt('_线程数字')}">${xzlt('_设置下载线程')}<span class="gray1"> ? </span></span>
		<input type="text" name="setThread" class="setinput_style1 xz_blue" value="${download_thread_deauflt}">
		</p>
		<p class="XZFormP12">
		<span class="xztip settingNameStyle1">${xzlt('_设置文件夹名')}</span>
		<input type="text" name="folderNameRule" class="setinput_style1 xz_blue folderNameRule">
		&nbsp;&nbsp;
		<select name="folder_name_select">
		</select>
		&nbsp;&nbsp;&nbsp;&nbsp;
		<span class="gray1 showFolderNameTip"> ${xzlt('_查看标记的含义')}</span>
		&nbsp;&nbsp;
		<a class="gray1 how_to_create_folder" href="${xzlt('_文件夹提示网址')}" target="_blank"> ${xzlt('_如何使用')}</a>
		</p>
		<p class="folderNameTip tip">
		<span class="xz_blue">{user}</span>
		${xzlt('_文件夹标记_user')}
		<br>
		<span class="xz_blue">{userid}</span>
		${xzlt('_文件夹标记_userid')}
		<br>
		<span class="xz_blue">{id}</span>
		${xzlt('_文件夹标记_id')}
		<br>
		<span class="xz_blue">{tag}</span>
		${xzlt('_文件夹标记_tag')}
		<br>
		<span class="xz_blue">{ptitle}</span>
		${xzlt('_文件夹标记_ptitle')}
		</p>
		<p>
		<span class="xztip settingNameStyle1">${xzlt('_设置文件名')}</span>
		<input type="text" name="fileNameRule" class="setinput_style1 xz_blue fileNameRule" value="{id}">
		&nbsp;&nbsp;
		<select name="file_name_select">
			<option value="default">…</option>
			<option value="{id}">{id}</option>
			<option value="{title}">{title}</option>
			<option value="{tags}">{tags}</option>
			<option value="{user}">{user}</option>
			<option value="{userid}">{userid}</option>
			<option value="{px}">{px}</option>
			<option value="{bmk}">{bmk}</option>
		</select>
		&nbsp;&nbsp;&nbsp;&nbsp;
		<span class="gray1 showFileNameTip"> ${xzlt('_查看标记的含义')}</span>
		</p>
		<p class="fileNameTip tip">
		<span class="xz_blue">{id}</span>
		${xzlt('_可用标记1')}
		<br>
		<span class="xz_blue">{title}</span>
		${xzlt('_可用标记2')}
		<br>
		<span class="xz_blue">{tags}</span>
		${xzlt('_可用标记3')}
		<br>
		<span class="xz_blue">{user}</span>
		${xzlt('_可用标记4')}
		<br>
		<span class="xz_blue">{userid}</span>
		${xzlt('_可用标记6')}
		<br>
		<span class="xz_blue">{px}</span>
		${xzlt('_可用标记7')}
		<br>
		<span class="xz_blue">{bmk}</span>
		${xzlt('_可用标记8')}
		<br>
		${xzlt('_可用标记5')}
		</p>
		<p class="XZFormP10">
		<span class="xztip settingNameStyle1" data-tip="${xzlt('_添加标记名称提示')}">${xzlt('_添加标记名称')}<span class="gray1"> ? </span></span>
		<label for="setTagNameToFileName"><input type="checkbox" name="setTagNameToFileName" id="setTagNameToFileName" checked> ${xzlt('_启用')}</label>
		&nbsp;&nbsp;&nbsp;
		<span class="gray1 showFileNameResult"> ${xzlt('_预览文件名')}</span>
		</p>
		</form>
		<div class="download_panel">
		<div class="centerWrap_btns">
		<div class="startDownload" style="background:${xz_blue};"> ${xzlt('_下载按钮1')}</div>
		<div class="pauseDownload" style="background:#e49d00;"> ${xzlt('_下载按钮2')}</div>
		<div class="stopDownload" style="background:${xz_red};"> ${xzlt('_下载按钮3')}</div>
		<div class="copyUrl" style="background:${xz_green};"> ${xzlt('_下载按钮4')}</div>
		</div>
		<div class="centerWrap_down_tips">
		<p>
		${xzlt('_当前状态')}
		<span class="down_status xz_blue"> ${xzlt('_未开始下载')}</span>
		</p>
		<div>
		${xzlt('_下载进度：')}
		<div class="right1">
		<div class="progressBar progressBar1">
		<div class="progress progress1"></div>
		</div>
		<div class="progressTip progressTip1">
		<span class="downloaded">0</span>
		/
		<span class="imgNum">0</span>
		</div>
		</div>
		</div>
		</div>
		<div class="centerWrap_down_list">
		<p> ${xzlt('_下载线程：')}</p>
		<ul>
		<li class="downloadBar">
		<div class="progressBar progressBar2">
		<div class="progress progress2"></div>
		</div>
		<div class="progressTip progressTip2">
		<span class="download_fileName"></span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${xzlt('_已下载')}&nbsp;&nbsp;<span class="loaded">0/0</span>KB
		</div>
		</li>
		</ul>
		</div>
		</div>
		<a class="download_a" download=""></a>
		<p class="gray1 showDownTip"> ${xzlt('_查看下载说明')}</p>
		<p class="downTip tip"> ${xzlt('_下载说明')}</p>
		</div>
		`;
		styleE.innerHTML += `
		li{list-style: none;}
		.centerWrap{display:none;width: 650px;position: fixed;left: -350px;margin-left: 50%;background: #fff;top: 3%;color: #333;z-index: 1000;font-size: 14px;padding: 25px;border-radius: 15px;border:1px solid #ddd;box-shadow: 0px 0px 25px #2ca6df;}
		.centerWrap p{line-height: 24px;margin:0;}
		.centerWrap .tip{color: #999;}
		.centerWrap_head{height: 30px;position: relative;padding-bottom: 10px;}
		.centerWrap_head *{vertical-align: middle;}
		.centerWrap_title{display: block;line-height: 30px;text-align: center;font-size: 18px;}
		.centerWrap_close,.centerWrap_toogle_option,.chrome_extension,.firefox_extension,.github_url{font-size: 18px;position: absolute;top: 0px;right: 0px;width: 30px;height: 30px;text-align: center;cursor: pointer;color:#666;user-select: none;}
		.centerWrap_close:hover,.centerWrap_toogle_option:hover{color:#0096fa;}
		.centerWrap_toogle_option{right:40px;}
		.chrome_extension,.firefox_extension{display:block;right:80px;text-decoration: none;}
		.github_url{display:block;right:120px;}
		.centerWrap_head img{max-width:100%;width:16px;}
		.setinput_style1{width:50px;min-width:50px;line-height: 20px;font-size: 14px !important;height: 20px;text-indent: 4px;box-sizing:border-box;border:none !important;border-bottom: 1px solid #999 !important;outline:none;}
		.setinput_style1:focus{border-bottom: 1px solid #0096fa !important;background:none !important;}
		.fileNameRule,.folderNameRule{min-width: 150px;}
		.setinput_tag{min-width: 300px;}
		.showFileNameTip,.showFileNameResult,.showFolderNameTip,.how_to_create_folder{cursor: pointer;}
		.fileNameTip,.folderNameTip{display: none;padding-top: 5px;}
		.centerWrap_btns{padding: 10px 0 0;font-size: 0;}
		.centerWrap_btns div{display: inline-block;min-width: 100px;max-width: 105px;padding: 8px 10px;text-align: center;min-height: 20px;line-height: 20px;color: #fff;border-radius: 4px;margin-right: 35px;font-size: 14px;cursor: pointer;margin-bottom:10px;vertical-align: top;}
		.centerWrap_btns_free div{max-width: 140px;margin-right:15px;}
		.centerWrap_down_tips{line-height: 28px;}
		.download_progress1{position: relative;}
		.right1{position: relative;display: inline-block;width: 500px;height: 22px;vertical-align: middle;}
		.progressBar{position: absolute;background: #6792A2;height: 22px;border-radius: 11px;}
		.progress{background: #0eb3f3;height: 22px;border-radius: 11px;transition: .15s;}
		.progressTip{color: #fff;position: absolute;line-height: 22px;font-size: 14px;}
		.progressBar1{width: 500px;}
		.progress1{width:0%;}
		.progressTip1{width: 500px;text-align: center;}
		.centerWrap_down_list{display:none;}
		.centerWrap_down_list ul{padding-top: 5px;margin:0;padding-left:0;}
		.downloadBar{position: relative;width: 100%;padding: 5px 0;height: 22px;box-sizing:content-box;}
		.progressBar2{width: 100%;}
		.progress2{width:0%;}
		.progressTip2{width: 100%;}
		.download_fileName{max-width: 60%;white-space:nowrap;  text-overflow:ellipsis;overflow: hidden;vertical-align:top;display: inline-block;text-indent: 1em;}
		.showDownTip{padding-top: 10px;cursor: pointer;display: inline-block;}
		.download_a{display: none;}
		.downTip{display: none;}
		.settingNameStyle1{width:100px;cursor: pointer;margin-right:10px;}
		.XZTipEl{position: fixed;z-index: 1001;max-width: 400px;left: 0;top: 0;background: #02a3ec;color: #fff;padding: 6px 8px;border-radius: 5px;line-height:20px;word-break: break-word;display: none;font-size:14px;}
		.fwb{font-weight: bold;}
		.gray1{color:#999;}
		.xz_blue{color:#0ea8ef !important;}
		.download_panel{display: none;}
		`;

		center_btn_wrap = document.querySelector('.centerWrap_btns_free');

		// 显示隐藏扩展提示
		if (isFirefox) {
			document.querySelector('.chrome_extension').style.display = 'none';
			document.querySelector('.firefox_extension').style.display = 'block';
		}

		// 绑定下载区域的事件
		centerWrap = document.querySelector('.centerWrap');
		$('.centerWrap_close').on('click', function () {
			centerWrapHide();
		});
		$('.showFileNameTip').on('click', function () {
			$('.fileNameTip').toggle();
		});
		$('.showFolderNameTip').on('click', function () {
			$('.folderNameTip').toggle();
		});
		$('.showFileNameResult').on('click', function () {
			showOutputInfoWrap('name');
		});
		$('.showDownTip').on('click', function () {
			$('.downTip').toggle();
		});
		// 收起展开设置项
		$('.centerWrap_toogle_option').on('click', function () {
			toggleOptionArea();
		});
		// 检查提示类
		XZTipEl = document.querySelector('.XZTipEl');
		let xztips = document.querySelectorAll('.xztip');
		for (const el of xztips) {
			el.addEventListener('mouseenter', function (event) {
				let e = event || window.event;
				XZTip.call(el, {
					'type': 1,
					'x': e.clientX,
					'y': e.clientY
				});
			});
			el.addEventListener('mouseleave', function (event) {
				let e = event || window.event;
				XZTip.call(el, {
					'type': 0,
					'x': e.clientX,
					'y': e.clientY
				});
			});
		}
		// 输入框获得焦点时自动选择文本
		XZForm = document.querySelector('.XZForm');
		let center_inputs = XZForm.querySelectorAll('input[type=text]');
		for (const el of center_inputs) {
			// 文件夹名和文件名例外
			if (el.name !== 'folderNameRule' && el.name !== 'fileNameRule') {
				el.addEventListener('focus', function () {
					this.select();
				});
			}
		}

		appendValueToText(XZForm.file_name_select, XZForm.fileNameRule);

		// 开始下载按钮
		$('.startDownload').on('click', function () { // 准备下载
			if (download_started || img_info.length === 0) { // 如果正在下载中，或正在进行暂停任务，或正在进行停止任务，则不予处理
				return false;
			}
			// 重置一些条件
			// 设置文件夹名字
			getFolderName();
			// 检查下载线程设置
			let setThread = parseInt(XZForm.setThread.value);
			if (setThread < 1 || setThread > 10 || isNaN(setThread)) {
				download_thread = download_thread_deauflt; // 重设为默认值
			} else {
				download_thread = setThread; // 设置为用户输入的值
			}
			if (img_info.length < download_thread) { // 检查下载线程数
				download_thread = img_info.length;
			}
			let centerWrap_down_list = $('.centerWrap_down_list');
			centerWrap_down_list.show(); // 显示下载队列
			if ($('.downloadBar').length < download_thread) { // 如果下载队列的显示数量小于线程数，则增加队列
				let need_add = download_thread - $('.downloadBar').length;
				let downloadBar = centerWrap_down_list.find('.downloadBar').eq(0);
				// 增加下载队列的数量
				for (let i = 0; i < need_add; i++) {
					centerWrap_down_list.append(downloadBar.clone());
				}
			} else if ($('.downloadBar').length > download_thread) { // 如果下载队列的显示数量大于线程数，则减少队列
				let need_delete = $('.downloadBar').length - download_thread;
				// 减少下载队列的数量
				for (let i = 0; i < need_delete; i++) {
					centerWrap_down_list.find('.downloadBar').eq(0).remove();
				}
			}
			download_started = true;
			if (!download_pause) { // 如果没有暂停，则重新下载，否则继续下载
				downloaded = 0;
				$('.downloaded').html('0');
				$('.download_fileName').html('');
				$('.loaded').html('0/0');
				$('.progress').css('width', '0%');
			}
			download_pause = false;
			download_stop = false;
			fileNameRule = XZForm.fileNameRule.value;

			// 启动或继续 建立并发下载线程
			$(outputInfo).html($(outputInfo).html() + '<br>' + xzlt('_正在下载中') + '<br>');
			if (page_type === 5) {
				img_info.reverse();
				imgList.reverse();
			}
			for (let i = 0; i < download_thread; i++) {
				if (i + downloaded < img_info.length) {
					setTimeout(function () {
						startDownload(i + downloaded, i);
					}, 100 * (i + 1));
				}
			}
			$('.down_status').html(xzlt('_正在下载中'));
			downloadBar_list = $('.downloadBar');
			download_a = document.querySelector('.download_a');
		});
		// 暂停下载按钮
		$('.pauseDownload').on('click', function () {
			if (img_info.length === 0) {
				return false;
			}
			if (download_stop === true) { // 停止的优先级高于暂停。点击停止可以取消暂停状态，但点击暂停不能取消停止状态
				return false;
			}
			if (download_pause === false) {
				if (download_started) { // 如果正在下载中
					download_pause = true; //发出暂停信号
					download_started = false;
					$('.down_status').html(`<span style="color:#f00">${xzlt('_已暂停')}</span>`);
					$(outputInfo).html($(outputInfo).html() + xzlt('_已暂停') + '<br><br>');
				} else { // 不在下载中的话不允许启用暂停功能
					return false;
				}
			}
		});
		// 停止下载按钮
		$('.stopDownload').on('click', function () {
			if (img_info.length === 0) {
				return false;
			}
			if (download_stop === false) {
				download_stop = true;
				download_started = false;
				$('.down_status').html(`<span style="color:#f00">${xzlt('_已停止')}</span>`);
				$(outputInfo).html($(outputInfo).html() + xzlt('_已停止') + '<br><br>');
				download_pause = false;
			}
		});
		// 复制url按钮
		$('.copyUrl').on('click', function () { // 显示图片url列表
			showOutputInfoWrap('url');
		});
	}

	// 把下拉框的选择项插入到文本框里
	function appendValueToText(form, to) {
		form.addEventListener('change', function () {
			if (this.value === 'default') {
				return false;
			} else {
				to.value = to.value + this.value;
				// 保存命名规则。区分文件夹名和文件名
				if (form.name === 'folder_name_select') {
					if (to.value !== '' && (page_type === 1 || page_type === 2) && loc_url.indexOf('bookmark.php') === -1) {
						saveXZSetting('folder_name', to.value);
					}
				} else if (form.name === 'file_name_select') {
					saveXZSetting('user_set_name', to.value);
				}
			}
		})
	}

	// 显示中间区域
	function centerWrapShow() {
		centerWrap.style.display = 'block';
		rightButton.style.display = 'none';
	}

	// 隐藏中间区域
	function centerWrapHide() {
		centerWrap.style.display = 'none';
		rightButton.style.display = 'block';
		$('.outputInfoWrap').hide(); // 隐藏中间的输出面板
	}

	// 显示下载面板
	function downloadPanelShow() {
		document.querySelector('.download_panel').style.display = 'block';
	}

	// 隐藏下载面板
	function downloadPanelHide() {
		document.querySelector('.download_panel').style.display = 'none';
	}

	// 收起展开设置项
	function toggleOptionArea() {
		option_area_show = !option_area_show;
		let xz_option_area = document.querySelectorAll('.xz_option_area');
		for (const iterator of xz_option_area) {
			iterator.style.display = option_area_show ? 'block' : 'none';
		}
		let centerWrap_toogle_option = document.querySelector('.centerWrap_toogle_option');
		centerWrap_toogle_option.innerHTML = option_area_show ? '▲' : '▼';
	}

	// 使用快捷键切换显示隐藏
	window.addEventListener('keydown', function (event) {
		let e2 = event || window.event;
		if (e2.altKey && e2.keyCode === 88) {
			let now_display = centerWrap.style.display;
			if (now_display === 'block') {
				centerWrapHide();
			} else {
				centerWrapShow();
			}
		}
	}, false);

	// 读取设置
	function readXZSetting() {
		xz_setting = localStorage.getItem('xz_setting');
		if (!xz_setting) {
			// 设置为默认值。注意这里的 tag 设置是字符串形式
			xz_setting = {
				"multiple_down_number": 0,
				"notdown_type": "",
				"need_tag": "",
				"notNeed_tag": "",
				"display_cover": true,
				"quiet_download": true,
				"download_thread": 6,
				"user_set_name": "{id}",
				"folder_name": "{userid}-{user}",
				"tagName_to_fileName": true
			};
		} else {
			xz_setting = JSON.parse(xz_setting);
		}
		// 设置多图设置
		let setPNo_input = XZForm.setPNo;
		setPNo_input.value = xz_setting.multiple_down_number;
		// 保存多图设置
		setPNo_input.addEventListener('change', function () {
			if (parseInt(this.value) >= 0) {
				saveXZSetting('multiple_down_number', this.value);
			}
		});
		// 设置排除类型
		xz_setting.notdown_type = xz_setting.notdown_type.replace('4', ''); // 某次升级取消了4，但如果旧版本留下了4就会导致问题，所以手动去掉。
		for (let index = 0; index < xz_setting.notdown_type.length; index++) {
			XZForm['setWorkType' + xz_setting.notdown_type[index]].checked = false;
		}
		// 保存排除类型
		for (let index = 1; index < 4; index++) {
			XZForm['setWorkType' + index].addEventListener('click', function () {
				saveXZSetting('notdown_type', getNotDownType());
			});
		}
		// 设置必须的 tag
		let setTagNeed_input = XZForm.setTagNeed;
		setTagNeed_input.value = xz_setting.need_tag;
		// 保存必须的 tag设置
		setTagNeed_input.addEventListener('change', function () {
			saveXZSetting('need_tag', this.value);
		});
		// 设置排除的 tag
		let setTagNotNeed_input = XZForm.setTagNotNeed;
		setTagNotNeed_input.value = xz_setting.notNeed_tag;
		// 保存排除的 tag设置
		setTagNotNeed_input.addEventListener('change', function () {
			saveXZSetting('notNeed_tag', this.value);
		});
		// 设置封面选项
		let setDisplayCover_input = XZForm.setDisplayCover;
		setDisplayCover_input.checked = xz_setting.display_cover;
		// 保存封面选项
		setDisplayCover_input.addEventListener('click', function () {
			saveXZSetting('display_cover', this.checked);
		});
		// 设置快速下载
		let setQuietDownload_input = XZForm.setQuietDownload;
		setQuietDownload_input.checked = xz_setting.quiet_download;
		// 保存快速下载
		setQuietDownload_input.addEventListener('click', function () {
			saveXZSetting('quiet_download', this.checked);
		});
		// 设置下载线程
		let setThread_input = XZForm.setThread;
		setThread_input.value = xz_setting.download_thread;
		// 保存下载线程
		setThread_input.addEventListener('change', function () {
			if (this.value > 0 && this.value <= 10) {
				saveXZSetting('download_thread', this.value);
			}
		});
		// 设置文件夹命名规则，只在作品内页和画师列表页执行。因为其他页面已经设置了合适的默认命名规则了
		if ((page_type === 1 || page_type === 2) && loc_url.indexOf('bookmark.php') === -1) {
			let folderNameRule_input = XZForm.folderNameRule;
			folderNameRule_input.value = xz_setting.folder_name;
			// 保存文件夹命名规则
			folderNameRule_input.addEventListener('change', function () {
				if (this.value !== '') {
					saveXZSetting('folder_name', this.value);
				} else {
					// 把下拉框恢复默认值
					XZForm.folder_name_select.value = XZForm.folder_name_select.children[0].value
				}
			});
		}

		// 设置文件命名规则
		let fileNameRule_input = XZForm.fileNameRule;
		if (page_type === 8) {
			fileNameRule_input.value = '{id}'; // pixivision里只有id可以使用
		} else {
			fileNameRule_input.value = xz_setting.user_set_name;
		}
		// 保存文件命名规则
		fileNameRule_input.addEventListener('change', function () {
			if (this.value !== '') {
				saveXZSetting('user_set_name', this.value);
			} else {
				// 把下拉框恢复默认值
				XZForm.file_name_select.value = XZForm.file_name_select.children[0].value
			}
		});
		// 设置标记添加到文件名
		let setTagNameToFileName_input = XZForm.setTagNameToFileName;
		setTagNameToFileName_input.checked = xz_setting.tagName_to_fileName;
		// 保存标记添加到文件名
		setTagNameToFileName_input.addEventListener('click', function () {
			saveXZSetting('tagName_to_fileName', this.checked);
		});
	}

	// 储存设置
	function saveXZSetting(key, value) {
		xz_setting[key] = value;
		localStorage.setItem('xz_setting', JSON.stringify(xz_setting));
		// console.table(xz_setting);
	}

	// 隐藏不需要的选项
	function hideNotNeedOption(no) {
		for (let index = 0; index < no.length; index++) {
			const element = document.querySelector('.XZFormP' + no[index]);
			element.style.display = 'none';
		}
	}

	// 生成输出区域的内容，按 type 不同，输出不同的内容
	function showOutputInfoWrap(type) {
		if (img_info.length === 0) {
			return false;
		}
		let result = '';
		if (type === 'url') { // 拷贝图片 url
			for (let i = 0; i < img_info.length; i++) {
				result = result + img_info[i].url + '<br>';
			}
		} else if (type === 'name') { // 预览和拷贝图片名
			for (let i = 0; i < img_info.length; i++) {
				let ext = '.' + img_info[i].ext;
				result = result + img_info[i].id + ext + ': ' + getFileName(img_info[i]) + ext + '<br>';
				// 在每个文件名前面加上它的原本的名字，方便用来做重命名
			}
		} else {
			return false;
		}
		$('.outputInfoContent').html(result);
		$('.outputInfoWrap').show();
	}

	// 生成文件名，传入参数为图片信息
	function getFileName(data) {
		fileNameRule = XZForm.fileNameRule.value;
		tagName_to_fileName = XZForm.setTagNameToFileName.checked;
		// 为空时使用 {id}
		if (fileNameRule === '') {
			fileNameRule = '{id}';
		}
		// 处理宽高
		let px = '';
		if (fileNameRule.indexOf('{px}') > -1) {
			if (data.fullWidth !== undefined) {
				px = data.fullWidth + 'x' + data.fullHeight;
			}
		}
		// 拼接文件名，不包含后缀名
		let result = '';
		if (tagName_to_fileName) {
			result = fileNameRule.replace('{id}', data.id).replace('{title}', 'title_' + data.title).replace('{user}', 'user_' + data.user).replace('{userid}', 'uid_' + data.userid).replace('{px}', px).replace('{tags}', 'tags_' + (data.tags.join(','))).replace('{bmk}', 'bmk_' + data.bmk).replace(safe_fileName_rule, '_').replace(/undefined/g, '');
		} else {
			result = fileNameRule.replace('{id}', data.id).replace('{title}', data.title).replace('{user}', data.user).replace('{userid}', data.userid).replace('{px}', px).replace('{tags}', (data.tags.join(','))).replace('{bmk}', data.bmk).replace(safe_fileName_rule, '_').replace(/undefined/g, '');
		}
		if (data.ext === 'ugoira') { // 动图改变后缀名，添加前缀
			result = 'open_with_HoneyView-' + result;
		}
		return result;
	}

	// 获取文件夹名称
	function getFolderName() {
		folder_name = XZForm.folderNameRule.value;
		if (folder_name === '') {
			return false;
		}
		for (const key in folder_info) {
			if (folder_info.hasOwnProperty(key)) {
				if (key === 'user') {
					folder_name = folder_name.replace(`{${key}}`, getUserName());
				} else if (key === 'userid') {
					folder_name = folder_name.replace(`{${key}}`, getUserId());
				} else if (key === 'id') {
					folder_name = folder_name.replace(`{${key}}`, getIllustId());
				} else if (key === 'ptitle') { // 因为下载状态会显示在 title 上，所以要去掉
					folder_name = folder_name.replace(`{${key}}`, document.title.replace(/\[(0|↑|→|▶|↓|║|■|√| )\] /, ''));
				} else {
					folder_name = folder_name.replace(`{${key}}`, folder_info[key]);
				}
			}
		}
		folder_name = folder_name.replace(safe_fileName_rule, '_');
	}

	// 开始下载 下载序号，要使用的显示队列的序号
	function startDownload(downloadNo, downloadBar_no) {
		changeTitle('↓');
		// 获取文件名
		let fullFileName = getFileName(img_info[downloadNo]);
		// 获取文件夹名字
		// 如果是浏览器 API 模式，则加入文件夹名称
		if (GM_info.downloadMode === 'browser' && !quick && folder_name !== '') {
			fullFileName = folder_name + '/' + fullFileName;
		}
		// 处理文件名长度 这里有个问题，因为无法预知浏览器下载文件夹的长度，所以只能预先设置一个预设值
		fullFileName = fullFileName.substr(0, fileName_length) + '.' + img_info[downloadNo].ext;
		downloadBar_list.eq(downloadBar_no).find('.download_fileName').html(fullFileName);
		GM_xmlhttpRequest({
			method: 'GET',
			url: img_info[downloadNo].url,
			headers: {
				referer: 'https://www.pixiv.net/'
			},
			responseType: 'blob',
			timeout: 180000,
			onprogress: function (xhr) {
				// 显示下载进度
				if (download_pause || download_stop) {
					return false;
				}
				let loaded = parseInt(xhr.loaded / 1000);
				let total = parseInt(xhr.total / 1000);
				downloadBar_list.eq(downloadBar_no).find('.loaded').html(loaded + '/' + total);
				downloadBar_list.eq(downloadBar_no).find('.progress').css('width', loaded / total * 100 + '%');
			},
			onload: function (xhr) {
				if (download_pause || download_stop) {
					return false;
				}
				let blobURL = window.URL.createObjectURL(xhr.response); // 返回的blob对象是整个response，而非responseText
				// 控制点击下载按钮的时间间隔大于0.5秒
				if (new Date().getTime() - click_time > time_interval) {
					click_time = new Date().getTime();
					click_download_a(blobURL, fullFileName, downloadBar_no);
				} else {
					time_delay += time_interval;
					setTimeout(() => {
						click_download_a(blobURL, fullFileName, downloadBar_no);
					}, time_delay);
				}
			},
			ontimeout: function () { // 当超时时重发请求，目前此功能未测试
				if (download_pause || download_stop) {
					return false;
				}
				console.log('timeout'); // 超时的话会进入到这里，但是下一步尚未测试
				startDownload(downloadNo, downloadBar_no);
			}
		});
	}

	// 下载到硬盘
	function click_download_a(blobURL, fullFileName, downloadBar_no) {
		if (new Date().getTime() - click_time < time_interval) {
			// console.count('+1s');	// 此句输出加时的次数
			setTimeout(() => {
				click_download_a(blobURL, fullFileName, downloadBar_no);
			}, time_interval); // 虽然设置了两次点击间隔不得小于time_interval，但实际执行过程中仍然有可能比time_interval小。间隔太小的话就会导致漏下。当间隔过小时补上延迟
			return false;
		}
		// console.log(new Date().getTime() - click_time); // 此句输出两次点击的实际间隔
		if (GM_info.downloadMode === 'native' || isFirefox) { // 默认的下载，不能建立文件夹
			download_a.href = blobURL;
			download_a.setAttribute('download', fullFileName);
			download_a.click();
			window.URL.revokeObjectURL(blobURL);
		} else if (GM_info.downloadMode === 'browser') { // 浏览器 API，可以建立文件夹
			// 不能设置带 referer 的 headers，否则下载失败。所以还是没办法直接从原网址下载图片。
			// conflictAction 目前也并不能生效，所以重复文件会有序号
			GM_download({
				url: blobURL,
				name: fullFileName,
				onload: function () {
					window.URL.revokeObjectURL(blobURL);
				}
			});
		}

		click_time = new Date().getTime();
		time_delay -= time_interval;

		if (time_delay < 0) { // 因为有多个线程，所以有可能把time_delay减小到0以下，这里做限制
			time_delay += time_interval;
		}
		// 下载之后
		downloaded++;
		$('.downloaded').html(downloaded);
		$('.progress1').css('width', downloaded / img_info.length * 100 + '%');
		if (downloaded === img_info.length) { // 如果所有文件都下载完毕
			download_started = false;
			quick = false;
			download_stop = false;
			download_pause = false;
			downloaded = 0;
			$('.down_status').html(xzlt('_下载完毕'));
			$(outputInfo).html($(outputInfo).html() + xzlt('_下载完毕') + '<br><br>');
			changeTitle('√');
		} else { // 如果没有全部下载完毕
			//如果已经暂停下载
			if (download_pause) {
				download_started = false;
				quick = false;
				changeTitle('║');
				return false;
			}

			// 如果已经停止下载
			if (download_stop) {
				download_started = false;
				quick = false;
				changeTitle('■');
				return false;
			}

			// 继续添加任务
			if (downloaded + download_thread - 1 < img_info.length) { // 如果已完成的数量 加上 线程中未完成的数量，仍然没有达到文件总数
				startDownload(downloaded + download_thread - 1, downloadBar_no); // 这里需要减一，就是downloaded本次自增的数字，否则会跳一个序号
			}
		}
	}

	// 清空图片信息并重置输出区域，在重复抓取时使用
	function resetResult() {
		img_info = [];
		centerWrapHide();
		$('.outputInfoContent').text('');
		download_started = false;
		download_pause = false;
		download_stop = false;
	}

	// 根据页面类型不同，设置页数的提示
	function changeWantPage() {
		let setWantPageWrap = document.querySelector('.setWantPageWrap');
		let setWantPage = setWantPageWrap.querySelector('.setWantPage');
		let setWantPageTip1 = setWantPageWrap.querySelector('.setWantPageTip1');
		let setWantPageTip2 = setWantPageWrap.querySelector('.setWantPageTip2');
		switch (page_type) {
			case 0:
				setWantPageWrap.style.display = 'none';
				break;
			case 1:
				want_page = -1;
				setWantPageTip1.innerHTML = xzlt('_个数');
				setWantPageTip1.dataset.tip = xzlt('_check_want_page_rule1_arg5') + '<br>' + xzlt('_相关作品大于0');
				setWantPageTip2.innerHTML = xzlt('_数字提示1');
				setWantPage.value = want_page;
				break;
			case 5:
				want_page = 1000;
				setWantPageTip1.innerHTML = xzlt('_页数');
				setWantPageTip1.dataset.tip = xzlt('_要获取的作品个数2');
				setWantPageTip2.innerHTML = '-1 - 1000';
				setWantPage.value = want_page;
				break;
			case 6:
				setWantPageWrap.style.display = 'none';
				break;
			case 7:
				setWantPageWrap.style.display = 'none';
				break;
			case 8:
				setWantPageWrap.style.display = 'none';
				break;
			case 9:
				want_page = 100;
				setWantPageTip1.innerHTML = xzlt('_个数');
				setWantPageTip1.dataset.tip = xzlt('_要获取的作品个数2');
				setWantPageTip2.innerHTML = '1 - 500';
				setWantPage.value = want_page;
				break;
			case 10:
				want_page = 10;
				setWantPageTip1.innerHTML = xzlt('_页数');
				setWantPageTip1.dataset.tip = xzlt('_check_want_page_rule1_arg8');
				set_max_num();
				setWantPageTip2.innerHTML = `1 - ${max_num}`;
				setWantPage.value = want_page;
				break;
			case 11:
				setWantPageWrap.style.display = 'none';
				break;
			case 12:
				setWantPageWrap.style.display = 'none';
				break;
			case 13:
				setWantPageWrap.style.display = 'none';
				break;
			default:
				want_page = -1;
				setWantPageTip1.innerHTML = xzlt('_页数');
				setWantPageTip1.dataset.tip = xzlt('_check_want_page_rule1_arg5');
				setWantPageTip2.innerHTML = xzlt('_数字提示1');
				setWantPage.value = want_page;
				break;
		}
	}

	// 设置文件夹信息
	function setFolderInfo() {
		if (isFirefox) {
			hideNotNeedOption([12]);
			return false;
		}
		let folder_name_select = XZForm.folder_name_select;
		// 添加文件夹可以使用的标记
		folder_info = {};
		folder_info.ptitle = ''; // 所有页面都可以使用 ptitle
		if (page_type === 1) {
			folder_info.id = '';
		}
		// 只有 1 和 2 可以使用画师信息
		if (page_type === 1 || page_type === 2) {
			// 一些信息可能需要从 dom 取得，在这里直接执行可能会出错，所以先留空
			if (loc_url.indexOf('bookmark.php') === -1) { // 不是书签页
				folder_info.user = '';
				folder_info.userid = '';
				folder_name_default = '{userid}-{user}';
				// 如果有 tag 则追加 tag
				if (getQuery(loc_url, 'tag')) {
					folder_info.tag = decodeURIComponent(getQuery(loc_url, 'tag'));
				}
			} else { // 书签页，书签页首页可能没有tag，所以也要判断
				if (getQuery(loc_url, 'tag')) {
					folder_info.tag = decodeURIComponent(getQuery(loc_url, 'tag'));
					folder_name_default = '{tag}';
				} else {
					folder_name_default = '{ptitle}';

				}
			}
		} else if (page_type === 5) {
			folder_info.tag = decodeURIComponent(getQuery(loc_url, 'word'));
			folder_name_default = '{tag}';
		} else {
			folder_name_default = '{ptitle}';
		}
		// 在一些时候设置成默认的命名规则
		if ((page_type !== 1 && page_type !== 2) || loc_url.indexOf('bookmark.php') > -1) {
			XZForm.folderNameRule.value = folder_name_default;
		}
		// 添加下拉选项
		folder_name_select.innerHTML = '';
		folder_name_select.insertAdjacentHTML('beforeend', '<option value="default">…</option>');
		for (const key in folder_info) {
			if (folder_info.hasOwnProperty(key)) {
				let option_html = `<option value="{${key}}">{${key}}</option>`;
				folder_name_select.insertAdjacentHTML('beforeend', option_html);
			}
		}
	}

	// 判断 page_type，现在没有 3 、4 了
	function checkPageType() {
		old_page_type = page_type;
		loc_url = location.href;
		if (location.hostname === 'www.pixiv.net' && location.pathname === '/') {
			page_type = 0;
		} else if (loc_url.indexOf('illust_id') > -1 && loc_url.indexOf('mode=manga') == -1 && loc_url.indexOf('bookmark_detail') == -1 && loc_url.indexOf('bookmark_add') == -1) {
			page_type = 1;
		} else if (loc_url.indexOf('member.php?id=') > -1 || loc_url.indexOf('member_illust.php?id=') > -1 || loc_url.indexOf('bookmark.php') > -1) {
			page_type = 2;
		} else if (loc_url.indexOf('search.php?') > -1) {
			page_type = 5;
		} else if (loc_url.indexOf('ranking_area.php') > -1 && loc_url !== 'https://www.pixiv.net/ranking_area.php') {
			page_type = 6;
		} else if (location.pathname === '/ranking.php') {
			page_type = 7;
		} else if (loc_url.indexOf('https://www.pixivision.net') > -1 && loc_url.indexOf('/a/') > -1) {
			page_type = 8;
		} else if (loc_url.indexOf('bookmark_add.php?id=') > -1 || loc_url.indexOf('bookmark_detail.php?illust_id=') > -1 || loc_url.indexOf('recommended.php') > -1) {
			page_type = 9;
		} else if (loc_url.indexOf('bookmark_new_illust') > -1 || loc_url.indexOf('new_illust.php') > -1 || loc_url.indexOf('new_illust_r18.php') > -1) {
			page_type = 10;
		} else if (location.pathname === '/discovery') {
			page_type = 11;
		} else if (loc_url.indexOf('/showcase/') > 0) {
			page_type = 12;
		} else if (loc_url.indexOf('response.php') > -1) {
			page_type = 13;
		} else {
			return false;
		}
	}

	checkPageType();

	if (page_type !== undefined) {
		addRightButton();
		addCenterWarps();
		changeWantPage();
		readXZSetting();
		setFolderInfo();
		// setFolderInfo 在 1 和 2 里可能会多次执行，所以在这里绑定，只绑定一次
		appendValueToText(XZForm.folder_name_select, XZForm.folderNameRule);
	}

	// 作品页无刷新进入其他作品页面时
	function listen1() {
		$(outputInfo).html(''); // 切换页面时，清空输出区域
		initViewer(); // 调用图片查看器
		// 还需要检查是否是动图，这个功能需要获取作品信息。为了避免重复获取，就使用 updateViewer() 里的入口，不再单独获取
	}

	// 虽然是绑定在 page_type 2 上面，但 2 和 1 其实是同一个页面
	if (page_type === 1 || page_type === 2) {
		// pushState 判断从列表页进入作品页的情况，popstate 判断从作品页退回列表页的情况
		['pushState', 'popstate'].forEach((item) => {
			window.addEventListener(item, () => {
				checkPageType(); // 当页面切换时，判断新页面的类型
				changeWantPage();
				setFolderInfo();
				// 当新旧页面的 page_type 不相同的时候
				if (old_page_type !== page_type) {
					center_btn_wrap.innerHTML = ''; // 清空原有的下载按钮
					want_page = undefined; // 重置页数/个数设置
					if (page_type === 1) { // 从 2 进入 1
						PageType1();
					} else if (page_type === 2) { // 从 1 进入 2
						PageType2();
						window.removeEventListener('pushState', listen1);
					}
				}
			});
		});
	}

	// 执行 page_type 1
	function PageType1() {

		// 在右侧创建快速下载按钮
		let quick_down_btn = document.createElement('div');
		quick_down_btn.id = 'quick_down_btn';
		quick_down_btn.setAttribute('title', xzlt('_快速下载本页'));
		quick_down_btn.innerHTML = '↓';
		styleE.innerHTML += '#quick_down_btn{position: fixed;top: 20%;right: 0;z-index: 1000;line-height:20px;font-size:14px;border-radius: 3px;color: #fff;text-align: center;cursor: pointer;padding:8px;box-sizing:content-box;background:#0096fa;}';
		document.body.appendChild(quick_down_btn);
		quick_down_btn.addEventListener('click', function () {
			quick = true;
			startGet();
		}, false);

		(function () {
			let startBotton = document.createElement('div');
			startBotton.innerHTML = xzlt('_从本页开始下载');
			addCenterButton(startBotton, xz_blue);
			startBotton.addEventListener('click', function () {
				startGet();
			}, false);
		})();

		(function () {
			let startBotton = document.createElement('div');
			$(startBotton).text(xzlt('_下载相关作品'));
			addCenterButton(startBotton, xz_blue);
			startBotton.addEventListener('click', function () {
				set_requset_num();
				if (requset_number > 0) {
					down_xiangguan = true;
					startGet();
				}
			}, false);
			// 添加文件夹命名提醒
			startBotton.addEventListener('mouseenter', function () {
				this.innerHTML = xzlt('_请留意文件夹命名');
			});
			startBotton.addEventListener('mouseout', function () {
				this.innerHTML = xzlt('_下载相关作品');
			});
		})();

		(function () {
			download_gif_btn = document.createElement('div');
			download_gif_btn.style.display = 'none';
			$(download_gif_btn).text(xzlt('_转换为 GIF'));
			addCenterButton(download_gif_btn, xz_green);
			download_gif_btn.addEventListener('click', function () {
				centerWrapHide();
				downloadZip(gif_src); // 下载动图
				changeTitle('↑');
				insertOutputInfo();
				addOutputInfo('<br>' + xzlt('_准备转换'));
				checkCanConvert();
			}, false);
		})();

		quickBookmark();
		initViewer();

		// 创建 gif 图片列表
		gif_img_list = document.createElement('div');
		gif_img_list.id = 'gif_img_list';
		gif_img_list.style.display = 'none';
		document.body.appendChild(gif_img_list);

		// 从 page_type 2 进入 1，或者直接打开 1，都要监听看图组件
		window.addEventListener('pushState', listen1);
	}

	// 执行 page_type 2
	function PageType2() {

		(function () {
			let downloadBotton = document.createElement('div');
			$(downloadBotton).text(xzlt('_开始抓取'));
			$(downloadBotton).attr('title', xzlt('_开始抓取') + xzlt('_默认下载多页'));
			addCenterButton(downloadBotton, xz_blue);
			downloadBotton.addEventListener('click', function () {
				startGet();
			}, false);
		})();

		// 在书签页面隐藏只要书签选项
		if (loc_url.indexOf('bookmark.php') > -1) {
			hideNotNeedOption([11]);
		}

		// 删除快速下载按钮
		let quick_down_btn = document.querySelector('#quick_down_btn');
		if (quick_down_btn) {
			quick_down_btn.parentNode.removeChild(quick_down_btn);
		}
	}

	if (page_type === 0) { //0.index 首页

		let down_id_button,
			down_id_input,
			id_value = [];

		// 添加输入id的按钮
		down_id_button = document.createElement('div');
		down_id_button.id = 'down_id_button';
		down_id_button.dataset.ready = 'false'; //是否准备好了
		$(down_id_button).text(xzlt('_输入id进行下载'));
		addCenterButton(down_id_button, xz_blue);
		down_id_button.addEventListener('click', function () {
			illust_url_list = []; //每次开始下载前重置作品的url列表
			if (down_id_button.dataset.ready === 'false') { //还没准备好
				down_id_input.style.display = 'block';
				centerWrapHide();
				document.documentElement.scrollTop = 0;
			} else {
				//检查id
				id_value = down_id_input.value.split('\n');
				for (let i = id_value.length - 1; i >= 0; i--) {
					let now_id = parseInt(id_value[i]);
					if (isNaN(now_id) || now_id < 22 || now_id > 99999999) { //如果id不是数字，或者处于非法区间
						illust_url_list = []; //清空结果
						alert(xzlt('_id不合法'));
						return false;
					} else {
						//拼接作品的url
						illust_url_list.push('https://www.pixiv.net/member_illust.php?mode=medium&illust_id=' + id_value[i]);
					}
				}
				$(outputInfo).html($(outputInfo).html() + xzlt('_任务开始0'));
				startGet(); //进入下载流程
			}
		}, false);

		//用于输入id的输入框
		down_id_input = document.createElement('textarea');
		down_id_input.id = 'down_id_input';
		down_id_input.setAttribute('placeholder', xzlt('_输入id进行下载的提示文字'));
		down_id_input.style.cssText = 'width: 600px;height: 80px;font-size: 12px;margin:6px auto;background:#fff;colir:#bbb;padding:7px;display:none;border:1px solid #179FDD;';
		insertToHead(down_id_input);
		down_id_input.addEventListener('change', function () { // 当输入框内容改变时检测
			if (down_id_input.value !== '') { //非空值
				down_id_button.dataset.ready = 'true';
				centerWrapShow();
				$(down_id_button).text(xzlt('_开始抓取'));
			} else {
				down_id_button.dataset.ready = 'false';
				centerWrapHide();
				$(down_id_button).text(xzlt('_输入id进行下载'));
			}
		});
	}
	if (page_type === 1) { //1. illust 作品页内页

		PageType1();

	} else if (page_type === 2) { //2.user_page 个人资料页以及收藏页

		PageType2();

	} else if (page_type === 5) { //5.tagsearch

		tag_search_lv1_selector = '#js-mount-point-search-result-list';
		tag_search_lv2_selector = '._25taFA4';
		tag_search_list_selector = '._25taFA4';
		tag_search_multiple_selector = '._1VJYUl1';
		tag_search_gif_selector = '._347Rtjn';
		// 因为tag搜索页新版将结果储存在一个div标签的属性里,而不是直接输出到html,但我们需要呈现html,所以需要模拟生成的元素
		tag_search_new_html = `
		<div class="_25taFA4">
		<figure class="mSh0kS-" style="width: 200px; max-height: 288px;">
		<div class="_3NnoQkv">
		<a href="/member_illust.php?mode=medium&illust_id=xz_illustId" rel="noopener" class="_1wlaFo6">
		<!--xz_multiple_html-->
		<img alt="" class="_309ad3C" width="xz_width" height="xz_height" src="xz_url">
		<!--xz_gif_html-->
		</a>
		<div class="thumbnail-menu">
		<div class="_one-click-bookmark js-click-trackable xz_isBookmarked" data-click-category="abtest_www_one_click_bookmark" data-click-action="illust" data-click-label="xz_illustId" data-type="illust" data-id="xz_illustId" title="添加收藏" style="position: static;"></div>
		<div class="_balloon-menu-opener">
		<div class="opener"></div>
		<section class="_balloon-menu-popup">
		<ul class="_balloon-menu-closer menu">
		<li>
		<span class="item">${xzlt('_屏蔽设定')}</span>
		</li>
		<li>
		<a class="item" target="_blank" href="/illust_infomsg.php?illust_id=xz_illustId">${xzlt('_举报')}</a>
		</li>
		</ul>
		</section>
		</div>
		</div>
		</div>
		<figcaption class="_1IP8RNV">
		<ul>
		<li class="SXucpBq">
		<a href="/member_illust.php?mode=medium&illust_id=xz_illustId" title="xz_illustTitle">xz_illustTitle</a>
		</li>
		<li>
		<a href="/member_illust.php?id=xz_userId" target="_blank" title="xz_userName" class="js-click-trackable ui-profile-popup _28hboXu" data-click-category="recommend 20130415-0531" data-click-action="ClickToMember" data-click-label="" data-user_id="xz_userId" data-user_name="xz_userName">
		<span class="_2taBWk8">
		<div class="" style="background: url(xz_userImage) center top / cover no-repeat; width: 16px; height: 16px;"></div>
		</span>
		<span class="_1fXePI5">xz_userName</span>
		</a>
		</li>
		<li style="position: relative;">
		<ul class="count-list">
		<li>
		<a href="/bookmark_detail.php?illust_id=xz_illustId" class="_ui-tooltip bookmark-count"> <i class="_icon sprites-bookmark-badge"></i>xz_bookmarkCount</a>
		</li>
		</ul>
		</li>
		</ul>
		</figcaption>
		</figure>
		</div>
		`;
		xz_multiple_html = '<div class="_1VJYUl1"><span><span class="_1RSXump"></span>xz_pageCount</span></div>';
		xz_gif_html = '<div class="_347Rtjn"></div>';

		base_url = loc_url.split('&p=')[0] + '&p=';
		startpage_no = Number($('.page-list .current').eq(0).text()); //最开始时的页码
		listPage_finished = 0; //向下第几页
		$('#js-react-search-mid').css('minHeight', 'auto'); //原来的最小高度是500，改成auto以免搜索时这部分空白
		XZForm.setFavNum.value = 1000; // tag 搜索页默认收藏数设置为 1000
		document.querySelector('.XZFormP9').style.display = 'block'; // 显示封面图设置

		tagSearchDel();

		// 添加快速筛选功能
		let nowTag = $('.column-title a').text().split(' ')[0];
		let favNums = ['100users入り', '500users入り', '1000users入り', '3000users入り', '5000users入り', '10000users入り', '20000users入り', '30000users入り', '50000users入り']; //200和2000的因为数量太少，不添加。40000的也少
		styleE.innerHTML += '.fastScreenArea a{display:inline-block;padding:10px;}';
		let fastScreenArea = document.createElement('div');
		fastScreenArea.className = 'fastScreenArea';
		let insetParent = document.querySelector('._unit');
		insetParent.insertBefore(fastScreenArea, insetParent.querySelector('#js-react-search-top'));
		let search_mode = ''; // 判断当前搜索模式，默认的“全部”模式不需要做处理
		if (loc_url.indexOf('&mode=r18') > -1) {
			search_mode = '&mode=r18';
		} else if (loc_url.indexOf('&mode=safe') > -1) {
			search_mode = '&mode=safe';
		}
		let order_mode = ''; // 判断当前排序方式
		if (loc_url.indexOf('&order=date_d') > -1) { // 按最新排序
			order_mode = '&order=date_d';
		} else if (loc_url.indexOf('&order=date') > -1) { // 按旧排序
			order_mode = '&order=date';
		}
		for (let i = 0; i < favNums.length; i++) {
			fastScreenArea.innerHTML += `<a href="https://www.pixiv.net/search.php?s_mode=s_tag${search_mode}${order_mode}&word=${nowTag}%20${favNums[i]}">${favNums[i]}</a>`;
		}

		(function () {
			let startBotton = document.createElement('div');
			$(startBotton).text(xzlt('_按收藏数筛选'));
			$(startBotton).attr('title', xzlt('_按收藏数筛选_title'));
			addCenterButton(startBotton, xz_green);
			startBotton.addEventListener('click', function () {
				if (interrupt) {
					interrupt = false;
				}
				startGet();
			}, false);
		})();

		(function () {
			let filterSelf = document.createElement('div');
			$(filterSelf).text(xzlt('_在结果中筛选'));
			$(filterSelf).attr('title', xzlt('_在结果中筛选_title'));
			addCenterButton(filterSelf, xz_green);
			filterSelf.addEventListener('click', function () {
				let allPicArea = $(tag_search_list_selector);
				let want_favorite_number2 = prompt(xzlt('_在结果中筛选弹窗'), '2000');
				if (!want_favorite_number2) {
					return false;
				} else if (isNaN(Number(want_favorite_number2)) || ~~Number(want_favorite_number2) <= 0) {
					alert(xzlt('_参数不合法1'));
					return false;
				} else {
					want_favorite_number2 = ~~Number(want_favorite_number2);
				}
				for (let i = 0; i < allPicArea.length; i++) {
					if (allPicArea.eq(i).find('._ui-tooltip').eq(0).text() < want_favorite_number2) { //必须限制序号0，不然对图片的回应数也会连起来
						allPicArea.eq(i).hide(); //这里把结果中不符合二次过滤隐藏掉，而非删除
					} else {
						allPicArea.eq(i).show();
					}
				}
				outputNowResult();
				centerWrapHide();
			}, false);
		})();

		(function () {
			let stopFilter = document.createElement('div');
			$(stopFilter).text(xzlt('_中断当前任务'));
			$(stopFilter).attr('title', xzlt('_中断当前任务_title'));
			addCenterButton(stopFilter, xz_red);
			stopFilter.addEventListener('click', function () {
				interrupt = true;
				if (!allow_work) {
					addOutputInfo('<br>' + xzlt('_当前任务已中断') + '<br><br>');
					allow_work = true;
				}
				centerWrapHide();
			}, false);
		})();

		(function () {
			let clearMultiple = document.createElement('div');
			$(clearMultiple).text(xzlt('_清除多图作品'));
			$(clearMultiple).attr('title', xzlt('_清除多图作品_title'));
			addCenterButton(clearMultiple, xz_red);
			clearMultiple.addEventListener('click', function () {
				centerWrapHide();
				let allPicArea = $(tag_search_list_selector);
				for (let i = 0; i < allPicArea.length; i++) {
					if (allPicArea.eq(i).find(tag_search_multiple_selector)[0] !== undefined) {
						allPicArea.eq(i).remove();
					}
				}
				outputNowResult();
			}, false);
		})();

		(function () {
			let clearUgoku = document.createElement('div');
			$(clearUgoku).text(xzlt('_清除动图作品'));
			$(clearUgoku).attr('title', xzlt('_清除动图作品_title'));
			addCenterButton(clearUgoku, xz_red);
			clearUgoku.addEventListener('click', function () {
				centerWrapHide();
				let allPicArea = $(tag_search_list_selector);
				for (let i = 0; i < allPicArea.length; i++) {
					if (allPicArea.eq(i).find(tag_search_gif_selector)[0] !== undefined) {
						allPicArea.eq(i).remove();
					}
				}
				outputNowResult();
			}, false);
		})();

		(function () {
			let deleteBotton = document.createElement('div');
			deleteBotton.id = 'deleteBotton';
			$(deleteBotton).text(xzlt('_手动删除作品'));
			$(deleteBotton).attr('title', xzlt('_手动删除作品_title'));
			$(deleteBotton).attr('data_del', '0');
			addCenterButton(deleteBotton, xz_red);
			$('#deleteBotton').bind('click', function () {
				if ($('#deleteBotton').attr('data_del') === '0') {
					$('#deleteBotton').attr('data_del', '1');
					$('#deleteBotton').text(xzlt('_退出手动删除'));
					setTimeout(() => {
						centerWrapHide();
					}, 300);
				} else if ($('#deleteBotton').attr('data_del') === '1') {
					$('#deleteBotton').attr('data_del', '0');
					$('#deleteBotton').text(xzlt('_手动删除作品'));
				}
			});
		})();

		(function () {
			let downloadBotton = document.createElement('div');
			$(downloadBotton).text(xzlt('_下载当前作品'));
			$(downloadBotton).attr('title', xzlt('_下载当前作品_title'));
			addCenterButton(downloadBotton, xz_blue);
			downloadBotton.addEventListener('click', function () {
				getListPage2();
			}, false);
		})();

	} else if (page_type === 6) { //6.ranking_area

		(function () {
			let downloadBotton = document.createElement('div');
			$(downloadBotton).text(xzlt('_下载本页作品'));
			$(downloadBotton).attr('title', xzlt('_下载本页作品_title'));
			addCenterButton(downloadBotton, xz_blue);
			downloadBotton.addEventListener('click', function () {
				startGet();
			}, false);
		})();


	} else if (page_type === 7) { //7.ranking_else

		if (location.search === '') { // 直接获取json数据
			base_url = loc_url + '?format=json&p=';
		} else {
			base_url = loc_url + '&format=json&p=';
		}

		startpage_no = 1; //从第一页（部分）开始抓取
		listPage_finished = 0; //已经向下抓取了几页（部分）

		// 设置页数。排行榜页面一页有50张作品，当页面到达底部时会加载下一页
		if (base_url.indexOf('r18g') > -1) { // r18g只有1个榜单，固定1页
			part_number = 1;
		} else if (base_url.indexOf('_r18') > -1) { // r18模式，这里的6是最大值，有的排行榜并没有6页
			part_number = 6;
		} else { //普通模式，这里的10也是最大值。如果实际没有10页，则在检测到404页面的时候停止抓取下一页
			part_number = 10;
		}


		(function () {
			let downloadBotton = document.createElement('div');
			$(downloadBotton).text(xzlt('_下载本排行榜作品'));
			$(downloadBotton).attr('title', xzlt('_下载本排行榜作品_title'));
			addCenterButton(downloadBotton, xz_blue);
			downloadBotton.addEventListener('click', function () {
				startGet();
			}, false);
		})();


	} else if (page_type === 8) { //8.pixivision

		let type = $('a[data-gtm-action=ClickCategory]').eq(0).attr('data-gtm-label');
		if (type == 'illustration' || type == 'manga' || type == 'cosplay') { //在插画、漫画、cosplay类型的页面上创建下载功能

			// 创建下载按钮
			(function () {
				let downloadBotton = document.createElement('div');
				$(downloadBotton).html(xzlt('_下载该页面的图片'));
				addCenterButton(downloadBotton, xz_blue);
				downloadBotton.addEventListener('click', function () {
					$('.logo-area h1').hide();
					resetResult();
					insertOutputInfo();
					changeTitle('↑');
					let imageList = []; //图片元素的列表
					if (type == 'illustration') { // 针对不同的类型，选择器不同
						imageList = $('.am__work__main img');
						let urls = [];
						for (let i = 0; i < imageList.length; i++) { // 把图片url添加进数组
							urls.push(imageList[i].src.replace('c/768x1200_80/img-master', 'img-original').replace('_master1200', ''));
						}
						test_suffix_no = 0;

						for (let j = 0; j < urls.length; j++) {
							let id = urls[j].split('/');
							id = id[id.length - 1].split('.')[0]; //作品id
							setTimeout(testExtName(urls[j], urls.length, {
								id: id,
								title: '',
								tags: [],
								user: '',
								userid: '',
								fullWidth: '',
								fullHeight: ''
							}), j * ajax_for_illust_delay);
						}
					} else {
						if (type == 'manga') {
							imageList = $('.am__work__illust');
						} else if (type == 'cosplay') {
							imageList = $('.fab__image-block__image  img');
						}
						for (let i = 0; i < imageList.length; i++) { // 把图片url添加进数组
							let imgUrl = imageList[i].src;
							if (imgUrl === 'https://i.pximg.net/imgaz/upload/20170407/256097898.jpg') { // 跳过Cure的logo图片
								continue;
							}
							let id = imgUrl.split('/');
							id = id[id.length - 1].split('.')[0]; //作品id
							let ext = imgUrl.split('.');
							ext = ext[ext.length - 1]; //扩展名
							addImgInfo(id, imgUrl, '', [], '', '', '', '', ext, '');
						}
						allWorkFinished();
					}
				}, false);
			})();
		}

		hideNotNeedOption([1, 2, 3, 4, 5, 6, 7, 11]);

	} else if (page_type === 9) { //9.bookmark_add
		// bookmark_add的页面刷新就变成bookmark_detail了; recommended.php是首页的“为你推荐”栏目
		// 在收藏后的相似图片页面，可以获得收藏数，如 https://www.pixiv.net/bookmark_detail.php?illust_id=63148723

		(function () {
			let downloadBotton = document.createElement('div');
			if (loc_url.indexOf('recommended.php') > -1) {
				$(downloadBotton).text(xzlt('_下载推荐图片'));
				$(downloadBotton).attr('title', xzlt('_下载推荐图片_title'));
			} else {
				$(downloadBotton).text(xzlt('_下载相似图片'));
			}
			addCenterButton(downloadBotton, xz_blue);
			downloadBotton.addEventListener('click', function () {
				set_requset_num();
				if (requset_number > 0) {
					startGet();
				}
			}, false);
		})();


	} else if (page_type === 10) { //10.bookmark_new_illust and new_illust 关注的人的新作品 以及 大家的新作品

		if (loc_url.indexOf('/bookmark_new_illust') > -1) {
			list_is_new = true;
			tag_search_lv1_selector = '#js-mount-point-latest-following';
			tag_search_lv2_selector = '._25taFA4';
			tag_search_list_selector = '._25taFA4';
			tag_search_multiple_selector = '._1VJYUl1';
			tag_search_gif_selector = '._347Rtjn';
		}

		//列表页url规则
		if (loc_url.indexOf('type=') === -1) { //如果没有type标志，说明是在“综合”分类的第一页，手动加上分类
			base_url = loc_url + '?type=all'.split('&p=')[0] + '&p=';
		} else {
			base_url = loc_url.split('&p=')[0] + '&p=';
		}

		set_max_num(); // 页数上限
		if ($('.page-list .current')[0] !== undefined) { //如果显示有页码
			startpage_no = Number($('.page-list .current').eq(0).text()); //以当前页的页码为起始页码
		} else { //否则认为只有1页
			startpage_no = 1;
		}
		listPage_finished = 0;

		(function () {
			let downloadBotton = document.createElement('div');
			$(downloadBotton).text(xzlt('_从本页开始下载'));
			$(downloadBotton).attr('title', xzlt('_下载大家的新作品'));
			addCenterButton(downloadBotton, xz_blue);
			downloadBotton.addEventListener('click', function () {
				startGet();
			}, false);
		})();

	} else if (page_type === 11) { //11.discover 发现
		// 其实发现页面和9收藏后的推荐页面一样，先获取列表再下载。但是发现页面有个特点是每次获取的数据是不同的，如果再请求一次列表数据，那么下载到的图片和本次加载的图片就不一样了。所以这里改用直接下载左侧已有作品

		tag_search_list_selector = '._3msSJaE'; // 发现作品的已有作品，借用tag搜索页的变量名，直接拿来用
		tag_search_multiple_selector = '._1VJYUl1'; // 多图的选择器，借用tag搜索页的变量名，直接拿来用
		tag_search_gif_selector = '._347Rtjn'; // 动图的选择器，借用tag搜索页的变量名，直接拿来用

		(function () {
			let downloadBotton = document.createElement('div');
			$(downloadBotton).text(xzlt('_下载当前作品'));
			$(downloadBotton).attr('title', xzlt('_下载当前作品_title'));
			addCenterButton(downloadBotton, xz_blue);
			downloadBotton.addEventListener('click', function () {
				startGet();
			}, false);
		})();

		(function () {
			let clearMultiple = document.createElement('div');
			$(clearMultiple).text(xzlt('_清除多图作品'));
			$(clearMultiple).attr('title', xzlt('_清除多图作品_title'));
			addCenterButton(clearMultiple, xz_red);
			clearMultiple.addEventListener('click', function () {
				let allPicArea = $(tag_search_list_selector);
				for (let i = 0; i < allPicArea.length; i++) {
					if (allPicArea.eq(i).find(tag_search_multiple_selector)[0] !== undefined) {
						allPicArea.eq(i).remove();
					}
				}
				centerWrapHide();
				outputNowResult();
			}, false);
		})();

		(function () {
			let clearUgoku = document.createElement('div');
			$(clearUgoku).text(xzlt('_清除动图作品'));
			$(clearUgoku).attr('title', xzlt('_清除动图作品_title'));
			addCenterButton(clearUgoku, xz_red);
			clearUgoku.addEventListener('click', function () {
				let allPicArea = $(tag_search_list_selector);
				for (let i = 0; i < allPicArea.length; i++) {
					if (allPicArea.eq(i).find(tag_search_gif_selector)[0] !== undefined) {
						allPicArea.eq(i).remove();
					}
				}
				outputNowResult();
				centerWrapHide();
			}, false);
		})();

		(function () {
			let deleteBotton = document.createElement('div');
			deleteBotton.id = 'deleteBotton';
			$(deleteBotton).text(xzlt('_手动删除作品'));
			$(deleteBotton).attr('title', xzlt('_手动删除作品_title'));
			$(deleteBotton).attr('data_del', '0');
			addCenterButton(deleteBotton, xz_red);
			$('#deleteBotton').bind('click', function () {
				$(tag_search_list_selector).bind('click', function () {
					if ($('#deleteBotton').attr('data_del') === '1') {
						this.remove();
						if (allow_work) {
							outputNowResult();
						}
						return false;
					}
				});
				if ($('#deleteBotton').attr('data_del') === '0') {
					$('#deleteBotton').attr('data_del', '1');
					$('#deleteBotton').text(xzlt('_退出手动删除'));
					setTimeout(() => {
						centerWrapHide();
					}, 300);
				} else if ($('#deleteBotton').attr('data_del') === '1') {
					$('#deleteBotton').attr('data_del', '0');
					$('#deleteBotton').text(xzlt('_手动删除作品'));
				}
			});
		})();

		(function () {
			let clearBotton = document.createElement('div');
			$(clearBotton).text(xzlt('_清空作品列表'));
			$(clearBotton).attr('title', xzlt('_清空作品列表_title'));
			addCenterButton(clearBotton, xz_red);
			clearBotton.addEventListener('click', function () {
				$(tag_search_list_selector).remove();
				centerWrapHide();
			}, false);
		})();
	} else if (page_type === 12) { //12.showcase 特辑
		// 这个类型的页面，不仅url是动态变化的，而且一个专辑页面里还会动态加载其他专辑，做的心好累啊

		// 创建下载按钮
		(function () {
			let downloadBotton = document.createElement('div');
			$(downloadBotton).html(xzlt('_下载该专辑的图片'));
			addCenterButton(downloadBotton, xz_blue);
			downloadBotton.addEventListener('click', function () {
				is_show_downloader('download');
			}, false);
		})();

		is_show_downloader();

		// 监听url变化。动态加载新专辑时用的是replaceState事件
		['pushState', 'replaceState', 'popstate'].forEach((item) => {
			window.addEventListener(item, () => is_show_downloader());
		});

	} else if (page_type === 13) { //13.response 响应关联作品

		listPage_finished = 0; //向下第几页
		base_url = loc_url.split('&p=')[0] + '&p=';

		if ($('.page-list .current')[0] !== undefined) { //如果显示有页码
			startpage_no = Number($('.page-list .current').eq(0).text()); //最开始时的页码
		} else { //否则认为只有1页
			startpage_no = 1;
		}

		(function () {
			let downloadBotton = document.createElement('div');
			$(downloadBotton).text(xzlt('_下载响应作品'));
			$(downloadBotton).attr('title', xzlt('_下载响应作品'));
			addCenterButton(downloadBotton, xz_blue);
			downloadBotton.addEventListener('click', function () {
				startGet();
			}, false);
		})();
	}
}