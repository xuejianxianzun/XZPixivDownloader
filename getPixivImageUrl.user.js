// ==UserScript==
// @name		仙尊pixiv图片下载器_批量获取并导出pixiv图片的网址
// @namespace	http://saber.love/?p=3102
// @version		2.1
// @description	在多种情景下，批量抓取并导出pixiv图片的网址，以便使用下载软件批量下载
// @author		雪见仙尊
// @include		*://www.pixiv.net/*
// @include		*://www.pixivision.net/*
// @run-at		document-end
// ==/UserScript==
/*
 *@作者：雪见仙尊
 *@博客：http://saber.love/
 *@QQ群：562729095
 *@本工具采用GPL许可协议
 *@转载重用请保留此信息
 */

if (window.location.href.indexOf("whitecube") > -1) {
	alert("抱歉，本脚本不能在新版pixiv上执行，请切换回旧版pixiv使用");
} else {
	var loc_url = window.location.href, //当前页面的url
		page_type, //页面类型
		illust_url_list = [], //储存作品列表url的数组
		img_url_list = [], //储存图片最终url的数组
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
		part_number, //保存不同排行榜的列表数量
		requset_number, //下载添加收藏后的相似作品时的请求数量
		maxNum = 0, //最多允许获取多少数量
		LANG = {}; //储存语言配置

	// 不同的提示用lang对象的属性表示
	var language = navigator.language || navigator.browserLanguage;
	if (language.indexOf('zh') > -1) { //设置语言为中文
		LANG.tipWhitecube = "本脚本不能在新版pixiv上执行，抱歉";
	} else if (language.indexOf('ja') > -1) { //设置语言为日文
		LANG.tipWhitecube = "本脚本不能在新版pixiv上执行，抱歉";
	} else { //设置语言为英文
		LANG.tipWhitecube = "sorry , this script can`t run in new pixiv";
	}

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
		}
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
			notdown_type = prompt("请输入数字来设置下载时要排除的作品类型。\n如需多选，将多个数字连写即可\n如果什么都不输入并按确定，那么将不排除任何作品\n1：排除单图\n2：排除多图\n3：排除动图", "");
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
			$("#outputInfo").html($("#outputInfo").html() + "<br>本次任务设置了排除的tag：" + notNeed_tag.join(","));
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
			$("#outputInfo").html($("#outputInfo").html() + "<br>本次任务设置了必须的tag：" + need_tag.join(","));
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

	// 启动抓取
	function startGet() {
		if (!allow_work) {
			alert("当前任务尚未完成，请等到提示完成之后再设置新的任务。");
			return false;
		}

		$("._global-header").eq(0).before(outputInfo);

		// 设置要获取的作品数或页数
		if (page_type === 1) {
			var result = check_want_page_rule1(
				"如果要下载全部作品，请保持默认值。\n如果需要设置下载的作品数，请输入从1开始的数字，1为仅下载当前作品。",
				"参数不合法，本次操作已取消。<br>",
				"任务开始<br>本次任务条件：从本页开始下载-num-个作品",
				"任务开始<br>本次任务条件：向下获取所有作品"
			);
			if (!result) {
				return false;
			}
		} else if (page_type === 2 || page_type === 3 || page_type === 4) {
			var result = check_want_page_rule1(
				"如果不限制下载的页数，请不要修改此默认值。\n如果要限制下载的页数，请输入从1开始的数字，1为仅下载本页。",
				"参数不合法，本次操作已取消。<br>",
				"任务开始<br>本次任务条件：从本页开始下载-num-页",
				"任务开始<br>本次任务条件：下载所有页面"
			);
			if (!result) {
				return false;
			}
		} else if (page_type === 5) {
			$(".user-ad-container.out").remove();
			var userset = prompt("请输入最低收藏数和要抓取的页数，用英文逗号分开。\n类似于下面的形式：\n1000,100", "1000,100");
			want_favorite_number = Number(userset.split(",")[0]);
			want_page = Number(userset.split(",")[1]);
			if (isNaN(want_favorite_number) || want_favorite_number <= 0 || isNaN(want_page) || want_favorite_number <= 0) {
				alert("参数不合法，请稍后重试。");
				return false;
			}
			$("#outputInfo").html($("#outputInfo").html() + "任务开始\n本次任务条件：收藏数不低于" + want_favorite_number + "，向下抓取" + want_page + "页");
			if (!listPage_finished) { //如果是首次抓取 则处理顶层窗口
				$(".popular-introduction").hide();
				$(".autopagerize_page_element .image-item").remove();
			}
		} else if (page_type === 10) {
			want_page = parseInt(window.prompt("你想要下载多少页？请输入数字。\r\n当前模式下，列表页的页数最多只有" + maxNum, "10"));
			if (isNaN(want_page)) {
				alert("输入有误！");
				return false;
			} else if (want_page > maxNum) {
				alert("你输入的数字超过了最大值" + maxNum);
				return false;
			} else {
				$("#outputInfo").html($("#outputInfo").html() + "任务开始\n本次任务条件：从本页开始下载" + want_page + "页");
			}
		}
		if (page_type === 7) {
			listPage_finished = 0;
		}
		// 检查排除作品类型的参数是否合法
		if (notdown_type !== "") {
			if (notdown_type.indexOf("1") > -1 && notdown_type.indexOf("2") > -1 && notdown_type.indexOf("3") > -1) {
				alert("由于您排除了所有作品类型，本次任务已取消。");
				$("#outputInfo").html($("#outputInfo").html() + "<br>排除作品类型的设置有误，任务取消！<br><br>");
				return false;
			} else if (notdown_type.indexOf("1") === -1 && notdown_type.indexOf("2") === -1 && notdown_type.indexOf("3") === -1) {
				alert("由于作品类型的设置有误，本次任务已取消。");
				$("#outputInfo").html($("#outputInfo").html() + "<br>排除作品类型的设置有误，任务取消！<br><br>");
				return false;
			} else {
				$("#outputInfo").html($("#outputInfo").html() + "<br>本次任务设置了排除作品类型：" + notdown_type.replace("1", "单图 ").replace("2", "多图 ").replace("3", "动图"));
			}
		}
		// 获取要排除的tag
		get_NotNeed_Tag();
		// 获取必须包含的tag
		get_Need_Tag();

		nowhtml = $(outputInfo).html();
		resetImgUrlList();
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
						$("#outputInfo").html($("#outputInfo").html() + "<br>当前任务已中断！当前有" + $(".autopagerize_page_element .image-item").length + "张作品。<br><br>");
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
			resetImgUrlList();
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
				var tag_check_result; // 储存tag检查结果
				// 先检查要排除的tag 其实page_type==9的时候在获取作品列表时就能获得tag列表，但为了统一，也在这里检查
				var tag_noeNeed_isFound = false;
				if (notNeed_tag.length > 0) { //如果设置了过滤tag
					var nowAllTag = illust_document.find("li.tag");
					outerloop: //命名外圈语句
						for (var i = nowAllTag.length - 1; i >= 0; i--) {
							var nowTag = nowAllTag.eq(i).find(".text").text();
							for (var ii = notNeed_tag.length - 1; ii >= 0; ii--) {
								if (nowTag === notNeed_tag[ii]) {
									tag_noeNeed_isFound = true;
									break outerloop;
								}
							}
						}
				}

				if (!tag_noeNeed_isFound) { //如果没有匹配到要排除的tag
					if (need_tag.length > 0) { //如果设置了必须包含的tag
						var tag_need_isFound = false;
						var nowAllTag = illust_document.find("li.tag");
						outerloop2: //命名外圈语句
							for (var i = nowAllTag.length - 1; i >= 0; i--) {
								var nowTag = nowAllTag.eq(i).find(".text").text();
								for (var ii = need_tag.length - 1; ii >= 0; ii--) {
									if (nowTag === need_tag[ii]) {
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
				if (!!illust_document.find(".original-image")[0] && tag_check_result) { //如果是单图，并且通过了tag检查
					if (notdown_type_checked === true || notdown_type.indexOf("1") === -1) { //如果已经筛选过作品类型，或者没有排除单图
						img_url_list.push(illust_document.find(".original-image").attr("data-src"));
						outputImgUrlNum();
					}
				} else if (!!illust_document.find(".works_display")[0] && tag_check_result) { //单图以外的情况,并且通过了tag检查
					if (!!illust_document.find(".full-screen._ui-tooltip")[0]) { //如果是动图
						if (notdown_type_checked === true || notdown_type.indexOf("3") === -1) { //如果已经筛选过作品类型，或者没有排除动图
							var gifInfo = illust_document.find("#wrapper script").eq(0).text(); //包含动画信息的js代码
							var reg1 = /ugokuIllustFullscreenData.*zip/;
							var reg2 = /https.*zip/;
							var zipUrl = reg2.exec(reg1.exec(gifInfo)[0])[0].replace(/\\/g, ""); //取出动图压缩包的url
							img_url_list.push(zipUrl);
							outputImgUrlNum();
						}
					} else if (illust_document.find(".works_display a").eq(0).attr("href").indexOf("mode=big") > -1) { //对于mode=big
						if (notdown_type_checked === true || notdown_type.indexOf("1") === -1) { //如果已经筛选过作品类型，或者没有排除单图
							var tempUrl = illust_document.find(".bookmark_modal_thumbnail").attr("data-src").replace("c/150x150/img-master", "img-original").replace("_master1200", "");
							testSuffix(tempUrl);
						}
					} else { //多图作品
						if (notdown_type_checked === true || notdown_type.indexOf("2") === -1) { //如果已经筛选过作品类型，或者没有排除多图
							var pNo = parseInt(illust_document.find("ul.meta li").eq(1).text().split(" ")[1].split("P")[0]); //P数
							getMangaOriginalPage(illust_document.find(".works_display a").eq(0).attr("href"), pNo, interrupt);
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
						outputUrls(img_url_list);
					}
				} else {
					if (illust_url_list.length > 0) { //如果存在下一个作品，则
						getIllustPage(illust_url_list[0]);
					} else { //没有剩余作品
						ajax_threads_finished++;
						if (ajax_threads_finished === ajax_for_illust_threads) { //如果所有并发请求都执行完毕
							ajax_threads_finished = 0; //复位
							allow_work = true;
							outputUrls(img_url_list);
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
	function getMangaOriginalPage(url, pNo, interrupt) {
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
					resetImgUrlList();
					return false;
				}
				var imgsrc = parser.parseFromString(data, "text/html").querySelector("img").src; //取出第一张图片的url
				var splited = imgsrc.split("p0");
				for (var i = 0; i < pNo; i++) {
					img_url_list.push(splited[0] + "p" + i + splited[1]); //拼接出所有图片的url并添加到数组
				}
				// 检查网址并添加到数组的动作执行完毕
				ajax_for_illust_is_end = true;
				outputImgUrlNum();
			}
		});
	}

	// 测试图片url是否正确的函数。对于mode=big的作品和pixivision的插画作品，虽然无法获取包含图片真实地址的页面，但是可以拼接出图片url，只是后缀都是jpg的，所以要测试下到底是jpg还是png
	function testSuffix(url, length) {
		test_suffix_finished = false;
		// 初步获取到的后缀名都是jpg的
		var testImg = new Image();
		testImg.src = url;
		testImg.onload = function() {
			img_url_list.push(url);
			nextStep();
		};
		testImg.onerror = function() {
			img_url_list.push(url.replace(".jpg", ".png"));
			nextStep();
		};

		function nextStep() {
			test_suffix_finished = true;
			outputImgUrlNum();
			if (!!length) { //length参数只有在获取pixivision插画时才会传入
				test_suffix_no++;
				if (test_suffix_no === length) { //如果所有请求都执行完毕
					outputUrls(img_url_list);
				}
			}
		}

	}
	// mode=big的网址如https://www.pixiv.net/member_illust.php?mode=medium&illust_id=56155666，虽然是单图，但是点击后是在新页面打开原图的，新页面要求referer，因此无法直接抓取原图
	// pixivision则是因为跨域问题，无法抓取p站页面

	// 设置按钮的通用样式
	var styleE = document.createElement("style");
	document.body.appendChild(styleE);
	styleE.innerHTML = ".download_btn{width:150px;height:18px;line-height:18px;font-size:14px;box-sizing:content-box;border-radius: 3px;color: #fff;text-align: center;padding: 10px 10px;cursor: pointer;position: fixed;right: 0px;z-index: 9999;opacity:0.9;transition: .1s;}.download_btn:hover{opacity:1;}";

	// 单独设置按钮的位置和背景颜色
	function setButtonStyle(e, no, bg) {
		var startTop = 200,
			unitTop = 50;
		e.className = "download_btn";
		e.style.top = startTop + unitTop * (no - 1) + "px";
		e.style.backgroundColor = bg;
	}

	// 创建输出区域
	var outputInfo = document.createElement("div");
	outputInfo.id = "outputInfo";
	outputInfo.style.cssText = "background: #fff;padding: 10px;font-size: 14px;margin:6px auto;width:950px;";

	// 在抓取图片网址时，输出提示
	function outputImgUrlNum() {
		$(outputInfo).html(nowhtml + "<br>已获取" + img_url_list.length + "张图片网址");
		if (interrupt) { //如果任务中断
			$("#outputInfo").html($("#outputInfo").html() + "<br>当前任务已中断！<br><br>");
		}
	}

	// 设置输出url区域的样式和dom元素
	styleE.innerHTML +=
		'.outputWrap{padding: 20px 30px;width: 520px;background:#fff;border-radius: 20px;z-index: 999;box-shadow: 0px 0px 20px #666;display: none;position: fixed;top: 12%; margin-left: -300px;left: 50%;}' +
		'.outputTitle{height: 20px;line-height: 20px;text-align: center;font-size:18px;color:#179FDD;}' +
		'.outputContent{border: 1px solid #ccc;transition: .3s;font-size: 14px;margin-top: 10px;padding: 5px 10px;overflow: auto;max-height:500px;line-height:20px;}' +
		'.outputContent::selection{background:#179FDD;color:#fff;}' +
		'.outputFooter{height: 60px;text-align: center;}' +
		'.outputClose{cursor: pointer;position: absolute;width: 30px;height: 30px;top:20px;right:30px;z-index: 9999;font-size:18px;text-align:center;}' +
		'.outputClose:hover{color:#179FDD;}' +
		'.outputCopy{height: 34px;line-height: 34px;min-width:100px;padding: 2px 25px;margin-top: 15px;background:#179FDD;display:inline-block;color:#fff;font-size:14px;border-radius:6px;cursor:pointer;}';
	var outputImgUrlWrap = document.createElement("div");
	document.body.appendChild(outputImgUrlWrap);
	outputImgUrlWrap.outerHTML =
		'<div class="outputWrap">' +
		'<div class="outputClose" title="隐藏输出区域">X</div>' +
		'<div class="outputTitle">图片url列表</div>' +
		'<div class="outputContent"></div>' +
		'<div class="outputFooter">' +
		'<div class="outputCopy" title="点击按钮自动复制图片url到剪贴板">复制图片url</div>' +
		'</div>' +
		'</div>';
	// 绑定关闭输出url区域的事件
	$(".outputClose").on("click", function() {
		$(".outputWrap").hide();
	});
	// 绑定复制url的事件
	$(".outputCopy").on("click", function() {
		var range = document.createRange();
		range.selectNodeContents($(".outputContent")[0]);
		window.getSelection().removeAllRanges();
		window.getSelection().addRange(range);
		document.execCommand('copy');
		// 改变提示文字
		$(".outputCopy").text("已复制到剪贴板，可直接粘贴");
		setTimeout(function() {
			window.getSelection().removeAllRanges();
			$(".outputCopy").text("复制图片url");
		}, 2000);
	});

	// 添加控制输出图片url区域的按钮
	var outputImgUrlWrap_ctr;
	(function() {
		outputImgUrlWrap_ctr = document.createElement("div");
		document.body.appendChild(outputImgUrlWrap_ctr);
		$(outputImgUrlWrap_ctr).hide();
		$(outputImgUrlWrap_ctr).text("显示/隐藏输出区域");
		$(outputImgUrlWrap_ctr).attr("title", "显示/隐藏输出区域");
		setButtonStyle(outputImgUrlWrap_ctr, 0, "#179FDD");
		outputImgUrlWrap_ctr.addEventListener("click", function() {
			$(".outputWrap").toggle();
		}, false);
	})();

	// 清空图片url列表并重置输出url的区域
	function resetImgUrlList() {
		img_url_list = [];
		$(".outputWrap").hide();
		$(".outputContent").text(null);
		$(outputImgUrlWrap_ctr).hide();
	}

	// 输出图片的url
	function outputUrls(img_url_list) {
		if (ajax_for_list_is_end && ajax_for_illust_is_end && test_suffix_finished) { // 检查加载页面的任务 以及 检查网址的任务 是否都全部完成。
			$(outputInfo).html($(outputInfo).html() + "<br>获取完毕，共" + img_url_list.length + "个图片地址<br>");
			if (img_url_list.length === 0) {
				$(outputInfo).html($(outputInfo).html() + "没有符合条件的作品！<br>任务结束。<br><br>");
				return false;
			}
			// 显示输出结果
			var result = "";
			for (var i = 0; i < img_url_list.length; i++) {
				result = result + img_url_list[i] + "<br>";
			}
			$(".outputContent").html(result);
			$(".outputWrap").show();
			$(outputImgUrlWrap_ctr).show();
			// 显示输出结果完毕
			$(outputInfo).html($(outputInfo).html() + "输出完毕。<br><br>");
			alert("抓取完毕！");
			nowhtml = $(outputInfo).html();
		} else { //如果没有完成，则延迟一段时间后再执行
			setTimeout(function() {
				outputUrls(img_url_list);
			}, 1000);
		}
	}

	// --------------------------------------------------------------------------

	if (loc_url.indexOf("illust_id") > -1 && loc_url.indexOf("bookmark_detail") == -1 && loc_url.indexOf("bookmark_add") == -1) { //1.on_illust_list，作品页内页
		page_type = 1;

		(function() {
			var startBotton = document.createElement("div");
			$(".reaction-container")[0].insertBefore(startBotton, $(".bookmark-container")[0]);
			$(startBotton).text("从本页开始下载作品");
			setButtonStyle(startBotton, 1, "#00A514");
			startBotton.addEventListener("click", function() {
				startGet();
			}, false);
		})();

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
			setButtonStyle(downloadBotton, 1, "#00A514");
			downloadBotton.addEventListener("click", function() {
				startGet();
			}, false);
		})();

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
			setButtonStyle(downloadBotton, 1, "#00A514");
			downloadBotton.addEventListener("click", function() {
				startGet();
			}, false);
		})();

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
			setButtonStyle(downloadBotton, 1, "#00A514");
			downloadBotton.addEventListener("click", function() {
				startGet();
			}, false);
		})();

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

		function outputResult() {
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
			setButtonStyle(removeVip, 1, "#189EDD");
			removeVip.addEventListener("click", function() {
				$(".popular-introduction a").eq(0).remove();
				alert("已经去掉了热门作品上的点击限制！");
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
			setButtonStyle(fastScreen, 2, "#0096DB");
			fastScreen.addEventListener("click", function() {
				if ($(fastScreen).attr("data-enable") == "0") { //如果该功能尚未开启，则执行代码
					$(fastScreen).attr("data-enable", "1"); //标记为已启用快速筛选功能
					var favNums = document.querySelectorAll(".bookmark-ranges a");
					for (var i = 1; i < favNums.length; i++) {
						favNums[i].style.backgroundColor = "#0096DB";
						favNums[i].style.color = "#fff";
						var fullTag = nowTag + " " + $(favNums[i]).text() + "users入り";
						favNums[i].href = "https://www.pixiv.net/search.php?s_mode=s_tag&word=" + fullTag;
						favNums[i].title = fullTag;
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
			setButtonStyle(startBotton, 3, "#0096DB");
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
			setButtonStyle(filterSelf, 4, "#0096DB");
			filterSelf.addEventListener("click", function() {
				var allPicArea = $(".autopagerize_page_element .image-item");
				var want_favorite_number2 = prompt("将在当前作品列表中再次过滤，请输入要求的最低收藏数：", "1500");
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
				outputResult();
			}, false);
		})();

		(function() {
			var downloadBotton = document.createElement("div");
			document.body.appendChild(downloadBotton);
			$(downloadBotton).text("下载当前作品");
			$(downloadBotton).attr("title", "下载现在列表里的所有作品。");
			setButtonStyle(downloadBotton, 5, "#00A514");
			downloadBotton.addEventListener("click", function() {
				getListPage2();
			}, false);
		})();

		setFilterTag_notNeed(6);
		$("#nottag").text("下载时排除tag");

		(function() {
			var stopFilter = document.createElement("div");
			document.body.appendChild(stopFilter);
			$(stopFilter).text("中断当前任务");
			$(stopFilter).attr("title", "筛选时中断之后可以继续执行。下载时中断，下次下载要重新获取图片网址。");
			setButtonStyle(stopFilter, 7, "#DE0000");
			stopFilter.addEventListener("click", function() {
				interrupt = true;
				if (!allow_work) {
					$("#outputInfo").html($("#outputInfo").html() + "<br>当前任务已中断！<br><br>");
					alert("当前任务已中断！");
				}
			}, false);
		})();

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
				outputResult();
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
				outputResult();
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
							outputResult();
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
			setButtonStyle(downloadBotton, 1, "#00A514");
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
			setButtonStyle(downloadBotton, 1, "#00A514");
			downloadBotton.addEventListener("click", function() {
				startGet();
			}, false);
		})();

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
					resetImgUrlList();
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
							setTimeout(testSuffix(urls[j], urls.length), j * ajax_for_illust_delay);
						}
					} else {
						imageList = $(".fab__image-block__image img");
						for (var i = 0; i < imageList.length; i++) { // 把图片url添加进数组
							img_url_list.push(imageList[i].src);
						}
						outputUrls(img_url_list);
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
			setButtonStyle(downloadBotton, 1, "#00A514");
			downloadBotton.addEventListener("click", function() {
				requset_number = parseInt(window.prompt("你想要获取多少张相似图片？请输入数字，最大" + maxNum, "100"));
				if (isNaN(requset_number)) {
					alert("输入有误！");
					return false;
				} else if (requset_number > maxNum) {
					alert("你输入的数字超过了最大值" + maxNum);
					return false;
				}
				startGet();
			}, false);
		})();

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
			setButtonStyle(downloadBotton, 1, "#00A514");
			downloadBotton.addEventListener("click", function() {
				startGet();
			}, false);
		})();

		setNotDownType(2);
		setFilterTag_Need(3);
		setFilterTag_notNeed(4);
	}
}
