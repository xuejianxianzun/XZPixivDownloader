// ==UserScript==
// @name		仙尊pixiv图片下载器
// @namespace	http://saber.love/?p=3102
// @version		2.9
// @description	可在多种情景下批量下载pixiv上的图片
// @author		雪见仙尊 xuejianxianzun
// @include		*://www.pixiv.net/*
// @include		*://www.pixivision.net/*
// @license 	GNU General Public License version 3 https://www.gnu.org/licenses/gpl-3.0.en.html
// @icon        http://saber.love/favicon.ico
// @grant       GM_xmlhttpRequest
// @connect     i.pximg.net
// @connect     i1.pixiv.net
// @connect     i2.pixiv.net
// @connect     i3.pixiv.net
// @connect     i4.pixiv.net
// @connect     i5.pixiv.net
// @run-at		document-end
// ==/UserScript==
/*
 *@author: 	雪见仙尊 xuejianxianzun
 *@E-mail: 	xuejianxianzun@gmail.com
 *@Blog: 	http://saber.love/
 *@QQ群: 	562729095
 */
if (window.location.href.indexOf("whitecube") > -1) {
	console.log("sorry, this script can`t run at new version of pixiv.");
} else {
	var loc_url = window.location.href, //当前页面的url
		page_type, //区分页面类型
		illust_url_list = [], //储存作品列表url的数组
		img_info = [], //储存图片信息，其中可能会有空值，如 undefined 和 ""
		ajax_for_illust_threads = 5, //抓取页面时的并发连接数
		ajax_for_illust_delay = 100, //抓取页面的并发请求每个间隔多少毫秒
		ajax_threads_finished = 0, //统计有几个并发线程完成所有请求。统计的是并发数（ajax_for_illust_threads）而非请求数
		ajax_for_list_is_end = true, //抓取列表页的任务是否执行完毕
		ajax_for_illust_is_end = true, //抓取内容页的任务是否执行完毕
		test_suffix_finished = true, //检查图片后缀名正确性的函数是否执行完毕
		test_suffix_no = 0, //检查图片后缀名函数的计数
		nowhtml = "", //输出内容时使用
		baseUrl, //列表页url规则
		startpage_no, //列表页开始抓取时的页码
		listPage_finished = 0, //记录一共抓取了多少列表页
		listPage_finished2 = 0, //记录tag搜索页本次任务已经抓取了多少页
		want_page, //要抓取几页
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
		maxNum = 0, //最多允许获取多少数量
		fileNameRule = "",
		fileName_length = 200, // 此为预设值，如果保存路径过长就会出问题
		safe_fileName_rule = new RegExp(/\\|\/|:|\?|"|<|>|\*|\|/g), // 安全的文件名
		download_thread = 5, // 同时下载的线程数
		donwloadBar_list, // 下载队列的dom元素
		downloadA, // 下载用的a标签
		download_started = false, // 下载是否已经开始
		downloaded = 0, // 已下载的文件
		download_stop = false, // 是否停止下载
		download_stop_num = 0, // 已停止的线程数
		download_pause = false, // 是否暂停下载
		download_pause_num = 0, // 已暂停的线程数
		LANG = {}; //储存语言配置

	// 去除广告
	$("[name=header]").remove(); //顶部广告
	$(".ads_anchor").remove(); //PR广告
	$(".ad-bigbanner").remove(); //相似作品页面的广告

	// 不同语言下的提示
	/*
	var language = navigator.language || navigator.browserLanguage;
	if (language.indexOf('zh') > -1) { //设置语言为中文
		LANG.tipWhitecube = "本脚本不能在新版pixiv上执行，抱歉";
	} else if (language.indexOf('ja') > -1) { //设置语言为日文
		LANG.tipWhitecube = "本脚本不能在新版pixiv上执行，抱歉";
	} else { //设置语言为英文
		LANG.tipWhitecube = "sorry , this script can`t run in new pixiv";
	}
	*/

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
		document.body.appendChild(notDownType);
		$(notDownType).text("排除指定类型的作品");
		$(notDownType).attr("title", "在下载前，您可以设置想要排除的作品类型。");
		setButtonStyle(notDownType, no, "#DA7002");
		notDownType.addEventListener("click", function() {
			notdown_type = prompt("请输入数字来设置下载时要排除的作品类型。\n如需多选，将多个数字连写即可\n如果什么都不输入并按确定，那么将不排除任何作品\n1: 排除单图\n2: 排除多图\n3: 排除动图", "");
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
		document.body.appendChild(nottag);
		$(nottag).text("设置作品不能包含的tag");
		$(nottag).attr("title", "在下载前，您可以设置想要排除的tag。");
		setButtonStyle(nottag, no, "#DE0000");

		var nottaginput = document.createElement("textarea");
		nottaginput.id = "nottaginput";
		nottaginput.style.cssText = "width: 600px;height: 40px;font-size: 12px;margin:6px auto;background:#fff;colir:#bbb;padding:7px;display:none;border:1px solid #DE0000;";
		$("._global-header").eq(0).before(nottaginput);
		notNeed_tag_tip = "您可在下载前设置要排除的tag，这样在下载时将不会下载含有这些tag的作品。区分大小写；如需排除多个tag，请使用英文逗号分隔。请注意要排除的tag的优先级大于要包含的tag的优先级。";
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
			$("#outputInfo").html($("#outputInfo").html() + "<br>本次任务设置了排除的tag: " + notNeed_tag.join(","));
			nowhtml = $("#outputInfo").html();
		} else { //如果没有设置tag，则重置
			notNeed_tag = [];
		}
	}

	// 获取必须包含的tag
	function get_Need_Tag() {
		if ($("#needtaginput").val() !== need_tag_tip) {
			need_tag = $("#needtaginput").val().split(",");
			if (need_tag[need_tag.length - 1] === "") { //处理最后一位是逗号的情况
				need_tag.pop();
			}
			$("#outputInfo").html($("#outputInfo").html() + "<br>本次任务设置了必须的tag: " + need_tag.join(","));
		} else { //如果没有设置tag，则重置
			need_tag = [];
		}
	}

	//添加必须的tag的按钮
	function setFilterTag_Need(no) {
		var needtag = document.createElement("div");
		needtag.id = "needtag";
		document.body.appendChild(needtag);
		$(needtag).text("设置作品必须包含的tag");
		$(needtag).attr("title", "在下载前，您可以设置必须包含的tag。");
		setButtonStyle(needtag, no, "#00A514");

		var needtaginput = document.createElement("textarea");
		needtaginput.id = "needtaginput";
		needtaginput.style.cssText = "width: 600px;height: 40px;font-size: 12px;margin:6px auto;background:#fff;colir:#bbb;padding:7px;display:none;border:1px solid #00A514;";
		$("._global-header").eq(0).before(needtaginput);
		need_tag_tip = "您可在下载前设置作品里必须包含的tag，区分大小写；如需包含多个tag，请使用英文逗号分隔。";
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

	// 添加筛选宽高的按钮
	function setFilterWH(no) {
		var filterWHBotton = document.createElement("div");
		filterWHBotton.id = "filterWHBotton";
		document.body.appendChild(filterWHBotton);
		$(filterWHBotton).text("设置宽高条件");
		$(filterWHBotton).attr("title", "在下载前，您可以设置要下载的图片的宽高条件。");
		setButtonStyle(filterWHBotton, no, "#179FDD");

		filterWHBotton.addEventListener("click", function() {
			console.log(filterWH.width + "" + filterWH.and_or + "" + filterWH.height);
			var inputWH = prompt("请输入最小宽度和最小高度，在抓取图片url时会排除不符合要求的图片\n用or符号 \"|\" 分割表示满足任意一个条件即可\n用and符号 \"&\" 分割表示需要同时满足两个条件", filterWH.width + filterWH.and_or + filterWH.height);
			if (inputWH === "" || inputWH === null || (inputWH.indexOf("|") === -1 && inputWH.indexOf("&") === -1) || (inputWH.indexOf("|") > -1 && inputWH.indexOf("&") > -1)) { //如果为空值，或取消了输入，或没有输入任意一个分隔符号，或者同时输入了两个分隔符
				alert("本次输入的数值无效");
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
					alert("本次输入的数值无效");
					return false;
				} else { //检查通过
					filterWH.and_or = and_or;
					filterWH.width = width;
					filterWH.height = height;
					is_set_filterWH = true;
					alert("设置成功!");
				}
			}
		}, false);
	}

	// tag搜索页的筛选任务执行完毕
	function tagSearchPageFinished() {
		allow_work = true;
		// listPage_finished=0; //不注释掉的话，每次添加筛选任务都是从当前页开始，而不是一直往后累计
		listPage_finished2 = 0; //重置已抓取的页面数量
		listSort();
		alert("本次任务已全部完成。");
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

	// 添加图片信息
	function addImgInfo(id, imgUrl, title, nowAllTag, user, fullWidth, fullHeight, ext) {
		img_info.push({
			id: id,
			url: imgUrl,
			title: title,
			tags: nowAllTag,
			user: user,
			fullWidth: fullWidth,
			fullHeight: fullHeight,
			ext: ext
		});
	}

	// 启动抓取
	function startGet() {
		if (!allow_work || download_started) {
			alert("当前任务尚未完成，请等到提示完成之后再设置新的任务。");
			return false;
		}

		$("._global-header").eq(0).before(outputInfo);

		// 设置要获取的作品数或页数
		if (page_type === 1) {
			var result = check_want_page_rule1(
				"如果要下载全部作品，请保持默认值。\n如果需要设置下载的作品数，请输入从1开始的数字，1为仅下载当前作品。",
				"参数不合法，本次操作已取消。<br>",
				"任务开始<br>本次任务条件: 从本页开始下载-num-个作品",
				"任务开始<br>本次任务条件: 向下获取所有作品"
			);
			if (!result) {
				return false;
			}
		} else if (page_type === 2 || page_type === 3 || page_type === 4) {
			var result = check_want_page_rule1(
				"如果不限制下载的页数，请不要修改此默认值。\n如果要限制下载的页数，请输入从1开始的数字，1为仅下载本页。",
				"参数不合法，本次操作已取消。<br>",
				"任务开始<br>本次任务条件: 从本页开始下载-num-页",
				"任务开始<br>本次任务条件: 下载所有页面"
			);
			if (!result) {
				return false;
			}
		} else if (page_type === 5) {
			$(".user-ad-container.out").remove();
			var userset = prompt("请输入最低收藏数和要抓取的页数，用英文逗号分开。\n类似于下面的形式: \n1000,100", "1000,100");
			want_favorite_number = Number(userset.split(",")[0]);
			want_page = Number(userset.split(",")[1]);
			if (isNaN(want_favorite_number) || want_favorite_number <= 0 || isNaN(want_page) || want_favorite_number <= 0) {
				alert("参数不合法，请稍后重试。");
				return false;
			}
			$("#outputInfo").html($("#outputInfo").html() + "任务开始\n本次任务条件: 收藏数不低于" + want_favorite_number + "，向下抓取" + want_page + "页");
			if (!listPage_finished) { //如果是首次抓取 则处理顶层窗口
				$(".popular-introduction").hide();
				$(".autopagerize_page_element .image-item").remove();
			}
		} else if (page_type === 10) {
			want_page = parseInt(window.prompt("你想要下载多少页？请输入数字。\r\n当前模式下，列表页的页数最多只有" + maxNum, "10"));
			if (isNaN(want_page)) {
				alert("输入有误!");
				return false;
			} else if (want_page > maxNum) {
				alert("你输入的数字超过了最大值" + maxNum);
				return false;
			} else {
				$("#outputInfo").html($("#outputInfo").html() + "任务开始\n本次任务条件: 从本页开始下载" + want_page + "页");
			}
		}
		if (page_type === 7) {
			listPage_finished = 0;
		}
		// 检查排除作品类型的参数是否合法
		if (notdown_type !== "") {
			if (notdown_type.indexOf("1") > -1 && notdown_type.indexOf("2") > -1 && notdown_type.indexOf("3") > -1) {
				alert("由于您排除了所有作品类型，本次任务已取消。");
				$("#outputInfo").html($("#outputInfo").html() + "<br>排除作品类型的设置有误，任务取消!<br><br>");
				return false;
			} else if (notdown_type.indexOf("1") === -1 && notdown_type.indexOf("2") === -1 && notdown_type.indexOf("3") === -1) {
				alert("由于作品类型的设置有误，本次任务已取消。");
				$("#outputInfo").html($("#outputInfo").html() + "<br>排除作品类型的设置有误，任务取消!<br><br>");
				return false;
			} else {
				$("#outputInfo").html($("#outputInfo").html() + "<br>本次任务设置了排除作品类型: " + notdown_type.replace("1", "单图 ").replace("2", "多图 ").replace("3", "动图"));
			}
		}
		// 检查是否设置了过滤宽高
		if (is_set_filterWH) {
			var and_or = filterWH.and_or;
			$("#outputInfo").html($("#outputInfo").html() + "<br>本次任务设置了过滤宽高条件:宽度>=" + filterWH.width + and_or.replace("|", " 或者 ").replace("&", " 并且 ") + "高度>=" + filterWH.height);
		}
		// 获取要排除的tag
		get_NotNeed_Tag();
		// 获取必须包含的tag
		get_Need_Tag();

		nowhtml = $(outputInfo).html();
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
			var id = loc_url.split("id=")[1], //取出作品id
				tt = $("input[name=tt]")[0].value, //取出token
				url = "/rpc/recommender.php?type=illust&sample_illusts=" + id + "&num_recommendations=" + requset_number + "&tt=" + tt; //获取相似的作品的id，加载200个。
		} else {
			var url = baseUrl + (startpage_no + listPage_finished);
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
				if (page_type === 5) { // tag搜索页
					listPage_finished2++;
					var allPicArea = listPage_document.find(".autopagerize_page_element").find(".image-item");
					for (var i = 0; i < allPicArea.length; i++) {
						var shoucang = allPicArea.eq(i).find("._ui-tooltip").eq(0).text();
						if (shoucang >= want_favorite_number) {
							imgList.push({
								"e": allPicArea[i],
								"num": Number(shoucang)
							});
							$(window.top.document).find(".autopagerize_page_element")[0].appendChild(allPicArea[i]);
						}
					}
					$("#outputInfo").html(nowhtml + "<br>已抓取本次任务第" + listPage_finished2 + "/" + want_page + "页，当前加载到第" + (startpage_no + listPage_finished - 1) + "页");
					//判断任务状态
					if (listPage_finished2 == want_page) {
						allow_work = true;
						$("#outputInfo").html($("#outputInfo").html() + "<br>本次任务完成。当前有" + $(".autopagerize_page_element .image-item").length + "张作品。<br><br>");
						tagSearchPageFinished();
						return false;
					} else if (!listPage_document.find(".next ._button")[0]) { //到最后一页了
						allow_work = true;
						$("#outputInfo").html($("#outputInfo").html() + "<br>已抓取本tag的所有页面，本次任务完成。当前有" + $(".autopagerize_page_element .image-item").length + "张作品。<br><br>");
						tagSearchPageFinished();
						return false;
					} else if (interrupt) { //任务被用户中断
						$("#outputInfo").html($("#outputInfo").html() + "<br>当前任务已中断!当前有" + $(".autopagerize_page_element .image-item").length + "张作品。<br><br>");
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
					$("#outputInfo").html(nowhtml + "<br>已抓取本页面第" + listPage_finished + "部分");
					if (listPage_finished == part_number) {
						$("#outputInfo").html($("#outputInfo").html() + "<br>本页面抓取完成。当前有" + illust_url_list.length + "张作品，开始获取作品信息。");
						getListUrlFinished();
					} else {
						getListPage();
					}
				} else if (page_type === 9) { //添加收藏后的相似作品
					var illust_list = JSON.parse(data).recommendations; //取出id列表
					for (var i = 0; i < illust_list.length; i++) { //拼接作品的url
						illust_url_list.push("https://www.pixiv.net/member_illust.php?mode=medium&illust_id=" + illust_list[i]);
					}
					$("#outputInfo").html($("#outputInfo").html() + "<br>列表页获取完成。当前有" + illust_url_list.length + "张作品，开始获取作品信息。");
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
					$("#outputInfo").html(nowhtml + "<br>已抓取列表页" + listPage_finished + "个页面");
					//判断任务状态
					if (!listPage_document.find(".next ._button")[0] || listPage_finished == want_page) { //如果没有下一页的按钮或者抓取完指定页面
						allow_work = true;
						listPage_finished = 0;
						$("#outputInfo").html($("#outputInfo").html() + "<br>列表页面抓取完成，开始获取图片网址");
						if (illust_url_list.length === 0) { //没有符合条件的作品
							$("#outputInfo").html($("#outputInfo").html() + "<br>抓取完毕，但没有找到符合筛选条件的作品。");
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
						$("#outputInfo").html($("#outputInfo").html() + "<br>本页面抓取完成。当前有" + illust_url_list.length + "张作品，开始获取作品信息。<br><br>");
						getListUrlFinished();
					}
				}
			}
		});
	}

	// 第二个获取列表的函数，仅在tag搜索页和地区排行榜使用（从当前列表页直接获取所有内容页的列表）
	function getListPage2() {
		if (!allow_work) {
			alert("当前任务尚未完成，请等待完成后再下载。");
			return false;
		}
		if (page_type === 5) {
			if ($(".autopagerize_page_element .image-item:visible").length === 0) {
				return false;
			}
			if (interrupt) {
				interrupt = false;
			}
			resetResult();
			$("._global-header").eq(0).before(outputInfo);
			// 获取要排除的tag 因为tag搜索页里的下载按钮没有启动startGet，而是在这里
			get_NotNeed_Tag();
		}
		allow_work = false;
		if (page_type === 5) {
			var allList = $(".autopagerize_page_element .image-item:visible");
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
		$("#outputInfo").html($("#outputInfo").html() + "<br>当前列表中有" + allList.length + "张作品，开始获取作品信息");
		getListUrlFinished();
	}

	// 作品列表获取完毕，开始抓取图片内容页
	function getListUrlFinished() {
		nowhtml = $("#outputInfo").html();
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

				// 预设及获取图片信息
				var imgUrl = "",
					id,
					title = illust_document.find(".work-info .title").text(), //标题
					user = illust_document.find("h1.user").text(), //画师
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
						addImgInfo(id, imgUrl, title, nowAllTag, user, fullWidth, fullHeight, ext);
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
							addImgInfo(id, imgUrl, title, nowAllTag, user, fullWidth, fullHeight, ext);
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
					console.log('请求的url不可访问');
				},
				400: function() {
					//400错误
					getIllustPage(illust_url_list[0]);
					console.log('该作品已被删除'); //在收藏的作品列表中，有些作品被作者删除了，却还显示有“编辑”按钮（但也有些没有这个按钮）。点击这个按钮会跳转到错误的“编辑收藏”页面，导致400错误。这个情况仅在下载书签作品时会发生。
				},
				403: function() {
					//403错误
					getIllustPage(illust_url_list[0]);
					console.log('无权访问请求的ur');
				},
				404: function() {
					//404错误
					getIllustPage(illust_url_list[0]);
					console.log('未找到该页面');
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
					addImgInfo(id, url, img_info_data.title, img_info_data.tags, img_info_data.user, img_info_data.fullWidth, img_info_data.fullHeight, ext);
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
			addImgInfo(img_info_data.id, url, img_info_data.title, img_info_data.tags, img_info_data.user, img_info_data.fullWidth, img_info_data.fullHeight, ext);
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

	// 创建输出抓取进度的区域
	var outputInfo = document.createElement("div");
	outputInfo.id = "outputInfo";
	outputInfo.style.cssText = "background: #fff;padding: 10px;font-size: 14px;margin:6px auto;width:950px;";

	// 在抓取图片网址时，输出提示
	function outputImgNum() {
		$(outputInfo).html(nowhtml + "<br>已获取" + img_info.length + "个图片网址");
		if (interrupt) { //如果任务中断
			$("#outputInfo").html($("#outputInfo").html() + "<br>当前任务已中断!<br><br>");
		}
	}

	// 设置按钮的通用样式
	var styleE = document.createElement("style");
	document.body.appendChild(styleE);
	styleE.innerHTML = ".download_btn{width:150px;height:18px;line-height:18px;font-size:14px;box-sizing:content-box;border-radius: 3px;color: #fff;text-align: center;padding: 10px 10px;cursor: pointer;position: fixed;right: 0px;z-index: 9999;opacity:0.9;transition: .1s;}.download_btn:hover{opacity:1;}";

	// 单独设置按钮的位置和背景颜色
	function setButtonStyle(e, no, bg) {
		var startTop = 230,
			unitTop = 50;
		e.className = "download_btn";
		e.style.top = startTop + unitTop * (no - 1) + "px";
		e.style.backgroundColor = bg;
	}

	// 添加输出url的区域
	var outputImgUrlWrap = document.createElement("div");
	document.body.appendChild(outputImgUrlWrap);
	outputImgUrlWrap.outerHTML =
		'<div class="outputUrlWrap">' +
		'<div class="outputUrlClose" title="关闭">X</div>' +
		'<div class="outputUrlTitle">图片url列表</div>' +
		'<div class="outputUrlContent"></div>' +
		'<div class="outputUrlFooter">' +
		'<div class="outputUrlCopy" title="点击按钮自动复制图片url到剪贴板">复制图片url</div>' +
		'</div>' +
		'</div>';
	styleE.innerHTML +=
		'.outputUrlWrap{padding: 20px 30px;width: 520px;background:#fff;border-radius: 20px;z-index: 9999;box-shadow: 0px 0px 15px #2ca6df;display: none;position: fixed;top: 15%; margin-left: -300px;left: 50%;}' +
		'.outputUrlTitle{height: 20px;line-height: 20px;text-align: center;font-size:18px;color:#179FDD;}' +
		'.outputUrlContent{border: 1px solid #ccc;transition: .3s;font-size: 14px;margin-top: 10px;padding: 5px 10px;overflow: auto;max-height:500px;line-height:20px;}' +
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
		$(".outputUrlCopy").text("已复制到剪贴板，可直接粘贴");
		setTimeout(function() {
			window.getSelection().removeAllRanges();
			$(".outputUrlCopy").text("复制图片url");
		}, 2000);
	});

	// 设置下载区域
	var outputWrap = document.createElement("div");
	document.body.appendChild(outputWrap);
	outputWrap.outerHTML =
		'<div class="outputWrap">' +
		'<div class="outputWrap_head">' +
		'<span class="outputWrap_title blue">下载设置</span>' +
		'<div class="outputWrap_close" title="隐藏">X</div>' +
		'</div>' +
		'<div class="outputWrap_con">' +
		'<p>共抓取到<span class="imgNum blue">0</span>个图片，请设置文件命名规则：</p>' +
		'<p>' +
		'<input type="text" name="fileNameRule" class="fileNameRule" value="{id}_{tags}">' +
		'&nbsp;.{ext}&nbsp;&nbsp;&nbsp;&nbsp;' +
		'<span class="blue showFileNameTip">查看可用的标记</span>' +
		'</p>' +
		'<p class="fileNameTip tip">' +
		'<span class="blue">{id}</span>' +
		'作品id，包含序号，如"63011502_p0"' +
		'<br>' +
		'<span class="blue">{title}</span>' +
		'作品标题' +
		'<br>' +
		'<span class="blue">{tags}</span>' +
		'作品的tag列表' +
		'<br>' +
		'<span class="blue">{user}</span>' +
		'画师的名字' +
		'<br>' +
		'* 在pixivision上，只有id标记会生效' +
		'<br></p>' +
		'<div class="outputWrap_btns">' +
		'<div class="startDownload" style="background:#00A514;">开始下载</div>' +
		'<div class="pauseDownload" style="background:#d29203;">暂停下载</div>' +
		'<div class="stopDownload" style="background:#DE0000;">停止下载</div>' +
		'<div class="copyUrl" style="background:#179FDD;">复制url</div>' +
		'</div>' +
		'<div class="outputWrap_down_tips">' +
		'<p>' +
		'当前状态：' +
		'<span class="down_status blue">未开始下载</span>' +
		'</p>' +
		'<div>' +
		'下载进度：' +
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
		'<p>下载线程：</p>' +
		'<ul>' +
		'<li class="donwloadBar">' +
		'<div class="progressBar progressBar2">' +
		'<div class="progress progress2"></div>' +
		'</div>' +
		'<div class="progressTip progressTip2">' +
		'<span class="download_fileName"></span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;已下载<span class="loaded">0/0</span>KB' +
		'</div>' +
		'</li>' +
		'</ul>' +
		'</div>' +
		'<a class="downloadA" download=""></a>' +
		'<p class="blue showDownTip">查看下载说明</p>' +
		'<p class="downTip tip">' +
		'下载的文件保存在浏览器的下载目录里。<br>' +
		'本脚本不支持自动创建文件夹。<br>' +
		'你可能会下载到.zip格式的文件，这是动态图的源文件。<br>' +
		'请不要在浏览器的下载选项里选中"总是询问每个文件的保存位置"。<br>' +
		'如果浏览器询问"是否允许下载多个文件"，请选择"允许"。<br>' +
		'如果浏览器询问"保存"文件还是"打开"文件，请选择"保存"。<br>' +
		'如果浏览器提示文件名过长，请将浏览器的下载文件夹改为名字较短的文件夹，之后重试。<br>' +
		'如果作品标题或tag里含有不能做文件名的字符，会被替换成下划线"_"。<br>' +
		'任务暂停成功后，你可以使用"开始下载"按钮继续下载;<br>' +
		'任务下载完毕或停止后，你可以使用"开始下载"按钮重新下载。<br>' +
		'如果任务下载缓慢或失败，可使用"复制url"功能，之后尝试使用其他下载软件进行下载。' +
		'</p>' +
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
		'.downloadA{display: none;}' +
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
		if (download_started || download_pause === "ready_pause" || download_stop === "ready_stop") { // 如果正在下载中，或正在进行暂停任务，或正在进行停止任务，则不予处理
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

		if (img_info.length < download_thread) { // 检查下载线程数
			download_thread = img_info.length;
		}
		var outputWrap_down_list = $(".outputWrap_down_list");
		outputWrap_down_list.show(); // 显示下载队列
		if ($(".donwloadBar").length < download_thread) { // 如果下载队列的显示数组小于线程数，则增加队列
			var need_add = download_thread - $(".donwloadBar").length;
			var donwloadBar = outputWrap_down_list.find(".donwloadBar").eq(0);
			// 增加下载队列的数量
			for (var i = 0; i < need_add; i++) {
				outputWrap_down_list.append(donwloadBar.clone());
			}
		}
		// 启动或继续 建立并发下载线程
		for (var i = 0; i < download_thread; i++) {
			if (i + downloaded < img_info.length) {
				(function(ii) {
					setTimeout(function() {
						startDownload(ii + downloaded, ii);
					}, 100);
				})(i);
			}
		}
		$(".down_status").html("下载中");
		donwloadBar_list = $(".donwloadBar");
		downloadA = document.querySelector(".downloadA");
	});
	// 暂停下载按钮
	$(".pauseDownload").on("click", function() {
		if (download_stop === true) { // 停止的优先级高于暂停。点击停止可以取消暂停状态，但点击暂停不能取消停止状态
			return false;
		}
		if (download_pause === false) {
			if (download_started) { // 如果正在下载中
				download_pause = "ready_pause"; //发出暂停信号
				$(".down_status").html("任务正在暂停中，但当前位于下载线程中的文件会继续下载");
			} else { // 不在下载中的话不允许启用暂停功能
				return false;
			}
		}
	});
	// 停止下载按钮
	$(".stopDownload").on("click", function() {
		if (download_stop === false) {
			if (download_started) { // 如果正在下载中
				download_stop = "ready_stop"; //发出停止下载的信号
				$(".down_status").html("任务正在停止中，但当前位于下载线程中的文件会继续下载");
			} else { // 不在下载中的话允许启用停止功能
				download_stop = true;
				$(".down_status").html('<span style="color:#f00">下载已停止</span>');
			}
			download_pause = false;
		}
	});
	// 复制url按钮
	$(".copyUrl").on("click", function() { // 显示图片url列表
		var result = "";
		for (var i = 0; i < img_info.length; i++) {
			result = result + img_info[i].url + "<br>";
		}
		$(".outputUrlContent").html(result);
		$(".outputUrlWrap").show();
		$(outputlWrap_ctr).show();
	});

	// 开始下载 下载序号，要使用的显示队列的序号
	function startDownload(downloadNo, donwloadBar_no) {
		console.log(downloadNo);
		// 拼接文件名
		var fullFileName = fileNameRule.replace("{id}", img_info[downloadNo].id).replace("{title}", img_info[downloadNo].title).replace("{user}", img_info[downloadNo].user).replace("{tags}", img_info[downloadNo].tags.join(",")).replace(safe_fileName_rule, "_");
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
				downloadA.href = blobURL;
				downloadA.setAttribute("download", fullFileName);
				downloadA.click();
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
					$(".down_status").html("下载完毕");
					setTimeout(function() {
						alert("下载完毕!");
					}, 200);
				} else { // 如果没有全部下载完毕
					//如果需要暂停下载
					if (download_pause === "ready_pause") {
						download_pause_num++; // 统计中断数量
						if (download_pause_num === download_thread) {
							$(".down_status").html('<span style="color:#d25b03">下载已暂停</span>');
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
							$(".down_status").html('<span style="color:#f00">下载已停止</span>');
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
		})
	}

	// 控制下载区域的按钮
	var outputlWrap_ctr;
	(function() {
		outputlWrap_ctr = document.createElement("div");
		outputlWrap_ctr.id = "outputlWrap_ctr";
		document.body.appendChild(outputlWrap_ctr);
		$(outputlWrap_ctr).hide();
		$(outputlWrap_ctr).text("显示/隐藏抓取结果");
		$(outputlWrap_ctr).attr("title", "显示/隐藏抓取结果");
		setButtonStyle(outputlWrap_ctr, -1, "#179FDD");
		outputlWrap_ctr.addEventListener("click", function() {
			$(".outputWrap").toggle();
		}, false);
	})();

	// 抓取完毕
	function allWorkFinished() {
		if (ajax_for_list_is_end && ajax_for_illust_is_end && test_suffix_finished) { // 检查加载页面的任务 以及 检查网址的任务 是否都全部完成。
			$(outputInfo).html($(outputInfo).html() + "<br>获取完毕，共" + img_info.length + "个图片地址<br>");
			if (img_info.length === 0) {
				$(outputInfo).html($(outputInfo).html() + "没有符合条件的作品!<br>任务结束。<br><br>");
				alert("抓取完毕!没有符合条件的作品!");
				return false;
			}
			// 显示输出结果完毕
			$(outputInfo).html($(outputInfo).html() + "抓取完毕!<br><br>");
			alert("抓取完毕!");
			nowhtml = $(outputInfo).html();
			// 显示输出结果
			$("#outputlWrap_ctr").show();
			$(".outputWrap").show();
			$(".imgNum").text(img_info.length);
		} else { //如果没有完成，则延迟一段时间后再执行
			setTimeout(function() {
				allWorkFinished();
			}, 1000);
		}
	}

	// 清空图片信息并重置输出区域，在重复抓取时使用
	function resetResult() {
		img_info = [];
		$(".outputWrap").hide();
		$(".outputUrlContent").text("");
		$(outputlWrap_ctr).hide();
		download_started = false;
		download_pause = false;
		download_stop = false;
	}

	// --------------------------------------------------------------------------

	if (loc_url.indexOf("illust_id") > -1 && loc_url.indexOf("mode=manga") == -1 && loc_url.indexOf("bookmark_detail") == -1 && loc_url.indexOf("bookmark_add") == -1) { //1.on_illust_list，作品页内页
		page_type = 1;

		(function() {
			var startBotton = document.createElement("div");
			document.body.appendChild(startBotton);
			$(startBotton).text("从本页开始下载作品");
			setButtonStyle(startBotton, 0, "#00A514");
			startBotton.addEventListener("click", function() {
				startGet();
			}, false);
		})();

		setFilterWH(1);
		setNotDownType(2);
		setFilterTag_Need(3);
		setFilterTag_notNeed(4);

	} else if ((loc_url.indexOf("member_illust.php?id=") > -1 || loc_url.indexOf("&id=") > -1) && (loc_url.indexOf("&tag") == -1 && loc_url.indexOf("?tag") == -1)) { //2.on_illust_list
		page_type = 2;
		listPage_finished = 0; //向下第几页
		baseUrl = loc_url.split("&p=")[0] + "&p=";

		if (!!$(".page-list .current")[0]) { //如果显示有页码
			startpage_no = Number($(".page-list .current").eq(0).text()); //最开始时的页码
		} else { //否则认为只有1页
			startpage_no = 1;
		}

		(function() {
			var downloadBotton = document.createElement("div");
			document.body.appendChild(downloadBotton);
			$(downloadBotton).text("下载该画师的作品");
			$(downloadBotton).attr("title", "下载该画师的作品，如有多页，默认会下载全部。");
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
		baseUrl = loc_url.split("&p=")[0] + "&p=";

		if (!!$(".page-list .current")[0]) { //如果显示有页码
			startpage_no = Number($(".page-list .current").eq(0).text()); //最开始时的页码
		} else { //否则认为只有1页
			startpage_no = 1;
		}

		(function() {
			var downloadBotton = document.createElement("div");
			document.body.appendChild(downloadBotton);
			$(downloadBotton).text("下载该tag中的作品");
			$(downloadBotton).attr("title", "下载该tag中的作品，如有多页，默认会下载全部。");
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
			if (now_order_element.text().indexOf("↓")>-1) {	//倒序
				baseUrl="https://www.pixiv.net/bookmark.php?rest=show&order=desc&p=";
			}else if (now_order_element.text().indexOf("↑")>-1) {	//正序
				baseUrl="https://www.pixiv.net/bookmark.php?rest=show&order=asc&p=";
			}
		}else{	//如果是按投稿时间顺序排序
			if (now_order_element.text().indexOf("↓")>-1) {	//倒序
				baseUrl="https://www.pixiv.net/bookmark.php?rest=show&order=date_d&p=";
			}else if (now_order_element.text().indexOf("↑")>-1) {	//正序
				baseUrl="https://www.pixiv.net/bookmark.php?rest=show&order=date&p=";
			}
		}
		*/

		if (!!$(".page-list .current")[0]) { //如果显示有页码，则是2页及以上
			startpage_no = Number($(".page-list .current").eq(0).text()); //当前所处的页码
			baseUrl = "https://www.pixiv.net/bookmark.php" + $(".page-list").eq(0).find("a").eq(0).attr("href").split("&p=")[0] + "&p="; //从页码中取值，作为列表页url的规则（等同于上面注释里的代码，但更便捷）
		} else { //否则只有1页
			startpage_no = 1;
			baseUrl = loc_url + "&p=";
		}

		(function() {
			var downloadBotton = document.createElement("div");
			document.body.appendChild(downloadBotton);
			$(downloadBotton).text("下载书签中的作品");
			$(downloadBotton).attr("title", "下载书签中的作品，如有多页，默认会下载全部。");
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

		baseUrl = loc_url.split("&p=")[0] + "&p=";
		startpage_no = Number($(".page-list .current").eq(0).text()); //最开始时的页码
		listPage_finished = 0; //向下第几页
		var imgList = []; //储存所有作品
		var doneTip = ""; //在抓取完成时保存提示信息

		function outputNowResult() {
			$("#outputInfo").html(doneTip + "调整完毕，当前有" + $(".autopagerize_page_element .image-item:visible").length + "张作品。<br>");
		}

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
			doneTip = $("#outputInfo").html();
			imgList.sort(sortByProperty("num"));
			$(".autopagerize_page_element .image-item").remove();
			for (var i = 0; i < imgList.length; i++) {
				$(".autopagerize_page_element").append(imgList[i].e);
			}
			//处理tag列表页预览图的懒加载
			var img_thumbnail = document.querySelectorAll("._thumbnail");
			for (var i = 0; i < img_thumbnail.length; i++) {
				img_thumbnail[i].src = img_thumbnail[i].getAttribute("data-src");
			}
		}

		(function() {
			var removeVip = document.createElement("div");
			document.body.appendChild(removeVip);
			$(removeVip).text("去除点击限制");
			$(removeVip).attr("title", "去掉中间区域热门作品上的会员限制。");
			setButtonStyle(removeVip, 0, "#189EDD");
			removeVip.addEventListener("click", function() {
				$(".popular-introduction a").eq(0).remove();
				alert("已经去掉了热门作品上的点击限制!");
			}, false);
		})();

		(function() {
			var mbs = $(".breadcrumb a");
			var nowTag = mbs.eq(mbs.length - 1).text();
			var fastScreen = document.createElement("div");
			document.body.appendChild(fastScreen);
			$(fastScreen).text("进行快速筛选");
			$(fastScreen).attr("title", "把当前tag加上带数字的\"users入り\"标签进行快速筛选(准确度低)");
			$(fastScreen).attr("data-enable", "0");
			setButtonStyle(fastScreen, 1, "#0096DB");
			fastScreen.addEventListener("click", function() {
				$("#premium-introduction-modal").remove(); // 去除高级会员提示
				if ($(fastScreen).attr("data-enable") == "0") { //如果该功能尚未开启，则执行代码
					$(fastScreen).attr("data-enable", "1"); //标记为已启用快速筛选功能
					var favNums = document.querySelectorAll(".bookmark-ranges a");
					for (var i = 1; i < favNums.length; i++) {
						favNums[i].style.backgroundColor = "#0096DB";
						favNums[i].style.color = "#fff";
						(function(ii) {
							var fullTag = nowTag + " " + $(favNums[ii]).text() + "users入り";
							favNums[ii].title = fullTag;
							favNums[ii].addEventListener("click", function() {
								window.location.href = "https://www.pixiv.net/search.php?s_mode=s_tag&word=" + fullTag;
							});
						})(i);
					}
					alert("现在你可以通过点击收藏数按钮进行快速筛选了。");
				}
			}, false);
		})();

		(function() {
			var startBotton = document.createElement("div");
			document.body.appendChild(startBotton);
			$(startBotton).text("按收藏数筛选");
			$(startBotton).attr("title", "按收藏数筛选当前tag里的作品(精准)");
			setButtonStyle(startBotton, 2, "#00A514");
			startBotton.addEventListener("click", function() {
				if (interrupt) {
					interrupt = false;
				}
				startGet();
			}, false);
		})();

		(function() {
			var filterSelf = document.createElement("div");
			document.body.appendChild(filterSelf);
			$(filterSelf).text("在结果中筛选");
			$(filterSelf).attr("title", "如果本页筛选后作品太多，可以提高收藏数的要求，在结果中筛选。达不到要求的会被隐藏而不是删除。所以你可以反复进行筛选。被隐藏的项目不会被下载。");
			setButtonStyle(filterSelf, 3, "#0096DB");
			filterSelf.addEventListener("click", function() {
				var allPicArea = $(".autopagerize_page_element .image-item");
				var want_favorite_number2 = prompt("将在当前作品列表中再次过滤，请输入要求的最低收藏数: ", "1500");
				if (!want_favorite_number2) {
					return false;
				} else if (isNaN(Number(want_favorite_number2)) || ~~Number(want_favorite_number2) <= 0) {
					alert("不合法的数值，取消本次操作。");
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
			document.body.appendChild(downloadBotton);
			$(downloadBotton).text("下载当前作品");
			$(downloadBotton).attr("title", "下载现在列表里的所有作品。");
			setButtonStyle(downloadBotton, 4, "#00A514");
			downloadBotton.addEventListener("click", function() {
				getListPage2();
			}, false);
		})();

		setFilterWH(5);

		(function() {
			var stopFilter = document.createElement("div");
			document.body.appendChild(stopFilter);
			$(stopFilter).text("中断当前任务");
			$(stopFilter).attr("title", "筛选时中断之后可以继续执行。下载时中断，下次下载要重新获取图片网址。");
			setButtonStyle(stopFilter, 6, "#DE0000");
			stopFilter.addEventListener("click", function() {
				interrupt = true;
				if (!allow_work) {
					$("#outputInfo").html($("#outputInfo").html() + "<br>当前任务已中断!<br><br>");
					alert("当前任务已中断!");
				}
			}, false);
		})();

		setFilterTag_notNeed(7);
		$("#nottag").text("下载时排除tag");

		(function() {
			var clearMultiple = document.createElement("div");
			document.body.appendChild(clearMultiple);
			$(clearMultiple).text("清除多图作品");
			$(clearMultiple).attr("title", "多图作品的图片质量以及与当前tag的相关度难以保证，并且会严重加大下载图片的数量。如不需要可以清除掉。");
			setButtonStyle(clearMultiple, 8, "#DE0101");
			clearMultiple.addEventListener("click", function() {
				var allPicArea = $(".autopagerize_page_element .image-item");
				for (var i = 0; i < allPicArea.length; i++) {
					if (!!allPicArea.eq(i).find(".multiple")[0]) {
						allPicArea.eq(i).remove();
					}
				}
				outputNowResult();
			}, false);
		})();

		(function() {
			var clearUgoku = document.createElement("div");
			document.body.appendChild(clearUgoku);
			$(clearUgoku).text("清除动图作品");
			$(clearUgoku).attr("title", "如不需要动图可以清除掉。");
			setButtonStyle(clearUgoku, 9, "#DE0101");
			clearUgoku.addEventListener("click", function() {
				var allPicArea = $(".autopagerize_page_element .image-item");
				for (var i = 0; i < allPicArea.length; i++) {
					if (!!allPicArea.eq(i).find(".ugoku-illust")[0]) {
						allPicArea.eq(i).remove();
					}
				}
				outputNowResult();
			}, false);
		})();

		(function() {
			var deleteBotton = document.createElement("div");
			deleteBotton.id = "deleteBotton";
			document.body.appendChild(deleteBotton);
			$(deleteBotton).text("手动删除作品");
			$(deleteBotton).attr("title", "可以在下载前手动删除不需要的作品。");
			$(deleteBotton).attr("data_del", "0");
			setButtonStyle(deleteBotton, 10, "#DE0000");
			$("#deleteBotton").bind("click", function() {
				$(".autopagerize_page_element .image-item").bind("click", function() {
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
					$("#deleteBotton").text("退出手动删除");
				} else if ($("#deleteBotton").attr("data_del") === "1") {
					$("#deleteBotton").attr("data_del", "0");
					$("#deleteBotton").text("手动删除作品");
				}
			});
		})();

		(function() {
			var clearBotton = document.createElement("div");
			document.body.appendChild(clearBotton);
			$(clearBotton).text("清空作品列表");
			$(clearBotton).attr("title", "如果网页内容过多，可能导致页面崩溃。如有需要可以清除当前的作品列表。");
			setButtonStyle(clearBotton, 11, "#DE0000");
			clearBotton.addEventListener("click", function() {
				$(".autopagerize_page_element .image-item").remove();
			}, false);
		})();

	} else if (loc_url.indexOf("ranking_area.php") > -1 && loc_url !== "https://www.pixiv.net/ranking_area.php") { //6.on_ranking_area
		page_type = 6;

		(function() {
			var downloadBotton = document.createElement("div");
			document.body.appendChild(downloadBotton);
			$(downloadBotton).text("下载本页作品");
			$(downloadBotton).attr("title", "下载本页列表中的所有作品。");
			setButtonStyle(downloadBotton, 0, "#00A514");
			downloadBotton.addEventListener("click", function() {
				startGet();
			}, false);
		})();

		(function() {
			var clearMultiple = document.createElement("div");
			document.body.appendChild(clearMultiple);
			$(clearMultiple).text("清除多图作品");
			$(clearMultiple).attr("title", "如果不想下载多图作品可以清除掉。");
			setButtonStyle(clearMultiple, 2, "#DA7002");
			clearMultiple.addEventListener("click", function() {
				var allPicArea = $(".ranking-item");
				for (var i = 0; i < allPicArea.length; i++) {
					if (allPicArea.eq(i).find("a").eq(1).attr("class").indexOf("multiple") > -1 || allPicArea.eq(i).find("a").eq(1).attr("class").indexOf("manga") > -1) {
						allPicArea.eq(i).remove();
					}
				}
				alert("已排除多图作品。");
			}, false);
		})();

		(function() {
			var clearGif = document.createElement("div");
			document.body.appendChild(clearGif);
			$(clearGif).text("排除动图作品");
			$(clearGif).attr("title", "如果不想下载动图作品可以清除掉。");
			setButtonStyle(clearGif, 3, "#DA7002");
			clearGif.addEventListener("click", function() {
				var allPicArea = $(".ranking-item");
				for (var i = 0; i < allPicArea.length; i++) {
					if (allPicArea.eq(i).find("a").eq(1).attr("class").indexOf("ugoku") > -1) {
						allPicArea.eq(i).remove();
					}
				}
				alert("已排除动图作品。");
			}, false);
		})();

		setFilterWH(1);
		setFilterTag_notNeed(4);
		setFilterTag_Need(5);

	} else if (loc_url.indexOf("ranking.php") > -1) { //7.on_ranking_else
		page_type = 7;

		if (loc_url !== "https://www.pixiv.net/ranking.php") {
			baseUrl = loc_url + "&p=";
		} else {
			baseUrl = loc_url + "?p=";
		}

		startpage_no = 1; //从第一页（部分）开始抓取
		listPage_finished = 0; //已经向下抓取了几页（部分）

		if ((baseUrl.indexOf("mode=daily") > -1 || baseUrl.indexOf("mode=weekly") > -1) && baseUrl.indexOf("r18") == -1) {
			part_number = 10; //排行榜页面一开始有50张作品，如果页面到了底部，会再向下加载，现在已知每日排行榜是10部分，日榜的r18是2部分，其他是6部分。为防止有未考虑到的情况出现，所以在获取列表页时里判断了404状态码。
		} else if ((baseUrl.indexOf("mode=daily") > -1 || baseUrl.indexOf("mode=weekly") > -1) && baseUrl.indexOf("r18") > -1) {
			part_number = 2;
		} else if (baseUrl.indexOf("r18g") > -1) {
			part_number = 1;
		} else {
			part_number = 6;
		}

		(function() {
			var downloadBotton = document.createElement("div");
			document.body.appendChild(downloadBotton);
			$(downloadBotton).text("下载本排行榜作品");
			$(downloadBotton).attr("title", "下载本排行榜的所有作品，包括未加载出来的。");
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
			// 创建下载按钮
			(function() {
				var downloadBotton = document.createElement("div");
				document.body.appendChild(downloadBotton);
				$(downloadBotton).html("下载该页面的图片");
				$(downloadBotton).attr("title", "下载该页面的图片");
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
							var id = urls[i].split("/");
							id = id[id.length - 1].split(".")[0]; //作品id
							setTimeout(testExtName(urls[j], urls.length, {
								id: id,
								title: "",
								tags: [],
								user: "",
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
							addImgInfo(id, imgUrl, "", [], "", "", "", ext);
						}
						allWorkFinished();
					}
				}, false);
			})();
		}

	} else if (loc_url.indexOf("bookmark_add.php?id=") > -1 || loc_url.indexOf("bookmark_detail.php?illust_id=") > -1) { //9.on_bookmark_add	bookmark_add的页面刷新就变成bookmark_detail了
		page_type = 9;

		maxNum = 300; //设置最大允许获取多少个相似图片。这个数字是可以改的，比如500,1000，这里限制为300。

		(function() {
			var downloadBotton = document.createElement("div");
			document.body.appendChild(downloadBotton);
			$(downloadBotton).text("下载相似图片");
			$(downloadBotton).attr("title", "下载相似图片,即 把这个作品加入收藏的用户也同时加了以下的作品...");
			setButtonStyle(downloadBotton, 0, "#00A514");
			downloadBotton.addEventListener("click", function() {
				requset_number = parseInt(window.prompt("你想要获取多少张相似图片？请输入数字，最大" + maxNum, "100"));
				if (isNaN(requset_number)) {
					alert("输入有误!");
					return false;
				} else if (requset_number > maxNum) {
					alert("你输入的数字超过了最大值" + maxNum);
					return false;
				}
				startGet();
			}, false);
		})();

		setFilterWH(1);
		setNotDownType(2);
		setFilterTag_Need(3);
		setFilterTag_notNeed(4);

	} else if (loc_url.indexOf("bookmark_new_illust.php") > -1 || loc_url.indexOf("new_illust.php") > -1) { //10.bookmark_new_illust and new_illust 关注的人的新作品 以及 大家的新作品
		page_type = 10;

		if (loc_url.indexOf("bookmark_new_illust.php") > -1) {
			maxNum = 100; //关注的新作品的最大页数是100
			baseUrl = "https://www.pixiv.net/bookmark_new_illust.php?p="; //列表页url规则
		} else if (loc_url.indexOf("new_illust.php") > -1) {
			maxNum = 1000; //大家的的新作品的最大页数是1000
			baseUrl = "https://www.pixiv.net/new_illust.php?p="; //列表页url规则
		}
		if (!!$(".page-list .current")[0]) { //如果显示有页码
			startpage_no = Number($(".page-list .current").eq(0).text()); //以当前页的页码为起始页码
		} else { //否则认为只有1页
			startpage_no = 1;
		}
		listPage_finished = 0;

		(function() {
			var downloadBotton = document.createElement("div");
			document.body.appendChild(downloadBotton);
			$(downloadBotton).text("从当前页面开始下载");
			$(downloadBotton).attr("title", "下载新作品");
			setButtonStyle(downloadBotton, 0, "#00A514");
			downloadBotton.addEventListener("click", function() {
				startGet();
			}, false);
		})();

		setFilterWH(1);
		setNotDownType(2);
		setFilterTag_Need(3);
		setFilterTag_notNeed(4);
	}
}