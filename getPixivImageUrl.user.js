// ==UserScript==
// @name         批量获取并导出pixiv图片的网址
// @namespace    http://saber.love/?p=3102
// @version      1.0b
// @description  在多种情景下，批量抓取并导出pixiv图片的网址，以便使用下载软件批量下载
// @author       雪见仙尊
// @include      *://www.pixiv.net/*
// @include      *://www.pixivision.net/*
// @run-at		document-end
// ==/UserScript==

/*
 *@作者：雪见仙尊
 *@博客：http://saber.love/
 *@转载重用请保留此信息
 *@QQ群：562729095
 */

! function() {
	if (window.location.href.indexOf("whitecube") > -1) {
		alert("本脚本不能在新版pixiv上执行，抱歉");
	} else {
		var maxGetNum = -1, //向下获取多少个页面。0位仅获取当前页，-1为不限制
			ajax1Bingfa = 5, //抓取页面（而非下载图片）时的并发数
			ajax1Jiange = 100, //抓取页面的并发请求每个间隔多少毫秒
			ajax1No = 0, //统计有几个并发线程完成所有请求
			allPageUrl = [], //储存列表的url
			doc0_jq, //将获取的列表页的html源码解析为DOM并转换为jq对象
			doc1_jq, //将获取的内容页的html源码解析为DOM并转换为jq对象
			imgUrlList = [], //储存图片最终url的数组
			nowhtml, //输出内容时使用
			ajaxDocIsEnd = true, //使用ajax加载页面并解析页面元素的任务是否执行完毕
			ajaxDoc2IsEnd = true, //检查网址正确性的函数是否执行完毕
			locationHref = window.location.href;

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

		// 创建输出区域
		var outputInfo = document.createElement("div");
		outputInfo.id = "outputInfo";
		outputInfo.style.cssText = "background: #fff;padding: 10px;font-size: 14px;margin:6px auto;width:950px;";

		// 向输出区域输出提示
		function output() {
			$(outputInfo).html(nowhtml + "<br>已获取" + imgUrlList.length + "张图片网址");
		}

		// 在新标签页输出图片的url 有时会被拦截，请注意
		function outputUrls(imgUrlList) {
			if (ajaxDocIsEnd && ajaxDoc2IsEnd) { // 检查加载页面的任务 以及 检查网址的任务 是否都全部完成。
				$(outputInfo).html($(outputInfo).html() + "<br>获取完毕，共" + imgUrlList.length + "个图片地址<br><br>");
				nowhtml = $(outputInfo).html();
				var outputPage = window.open();
				for (var i = 0; i < imgUrlList.length; i++) {
					outputPage.document.write(imgUrlList[i] + "<br>");
				}
				outputPage.document.close();
				$(outputInfo).html($(outputInfo).html() + "<br>输出完毕。");
			} else { //如果没有完成，则延迟一段时间后再执行
				setTimeout(function() {
					outputUrls(imgUrlList);
				}, 1000);
			}
		}

		// 抓取多p作品的最终大图页
		function ajaxfordoc2(url, pNo) {
			ajaxDoc2IsEnd = false;
			url = ("https://www.pixiv.net/" + url).replace("manga", "manga_big") + "&page=0";	//拼接最终大图页面的url
			$.ajax({
				url: url,
				type: "get",
				async: true,
				cache: false,
				dataType: "text",
				success: function(data) {
					var imgsrc = parser.parseFromString(data, "text/html").querySelector("img").src;	//取出第一张图片的url
					var splited = imgsrc.split("p0");
					for (var i = 0; i < pNo; i++) {
						imgUrlList.push(splited[0] + "p" + i + splited[1]); //拼接出所有图片的url并添加到数组
					}
					// 检查网址并添加到数组的动作执行完毕
					ajaxDoc2IsEnd = true;
					output();
				}
			});
		}
		// 说起来，以前有种mode=big的单图作品类型，现在搜索“pixiv mode=big”还能搜到一些网址。现在我发现mode=big的都被p站改成了普通的mode=medium，可以当做普通单图处理了

		// --------------------------------------------------------------------------

		if (locationHref.indexOf("illust_id") > -1 && locationHref.indexOf("bookmark_detail") == -1 && locationHref.indexOf("bookmark_add") == -1) { //1.on_illust_list，作品页内页

			// 获取作品内容页面的函数（区别于获取列表页面的函数）
			function ajaxfordoc1(url) {
				ajaxDocIsEnd = false;
				$.ajax({
					url: url,
					type: "get",
					async: true,
					cache: false,
					dataType: "text",
					success: function(data) {
						doc1_jq = $(parser.parseFromString(data, "text/html"));
						if (!!doc1_jq.find(".original-image")[0]) { //如果是单图
							imgUrlList.push(doc1_jq.find(".original-image").attr("data-src"));
							output();
						} else if (!!doc1_jq.find(".works_display")[0]) { //单图以外的情况
							if (!!doc1_jq.find(".full-screen._ui-tooltip")[0]) { //如果是动图 DOMParser之后无法解析（找到）canvas标签，不然判断更简单
								imgUrlList.push(doc1_jq.find("#wrapper script").eq(0).text().split("\"src\":\"")[2].split("\",\"mime_type")[0].replace(/\\/g, "")); //DOMParser之后js不会执行，所以无法用p站自己的动图变量来获取动图网址了
								output();
							} else {
								var pNo = parseInt(doc1_jq.find("ul.meta li").eq(1).text().split(" ")[1].split("P")[0]); //P数
								ajaxfordoc2(doc1_jq.find(".works_display a").eq(0).attr("href"), pNo);
							}
						}
						ajaxDocIsEnd = true;
						if (maxGetNum > 0) {
							maxGetNum--;
						}
						if (!!doc1_jq.find(".after a")[0] && maxGetNum === -1 || !!doc1_jq.find(".after a")[0] && maxGetNum > 0) { //如果存在下一个作品，则
							ajaxfordoc1("https://www.pixiv.net/" + doc1_jq.find(".after a").eq(0).attr("href"));
						} else { //没有剩余作品
							outputUrls(imgUrlList);
						}
					},
					statusCode: { //如果发生了错误则跳过该url
						0: function() {
							//ERR_CONNECTION_RESET
							ajaxfordoc1(allPageUrl[0]);
							console.log('请求的url不可访问');
						},
						403: function() {
							//403错误
							ajaxfordoc1(allPageUrl[0]);
							console.log('无权访问请求的ur');
						},
						404: function() {
							//404错误
							ajaxfordoc1(allPageUrl[0]);
							console.log('未找到该页面');
						}
					}
				});
			}

			(function() {
				var startBotton = document.createElement("div");
				$(".reaction-container")[0].insertBefore(startBotton, $(".bookmark-container")[0]);
				$(startBotton).text("从本页开始下载图片");
				startBotton.style.cssText = "background: #DE2D35;border-radius: 3px;color: #fff;text-align: center;padding: 2px 5px;cursor: pointer;position: absolute;top: auto;left: 480px;";
				startBotton.addEventListener("click", function() {
					$("._global-header").eq(0).before(outputInfo);
					maxGetNum = prompt("如果要下载全部作品，请保持默认值。\n如果需要设置下载的作品数，请输入从1开始的数字，1为仅下载当前作品。", "-1");
					if (maxGetNum === null || maxGetNum === "0" || ~~Number(maxGetNum) < -1) {
						return false;
					} else if (~~Number(maxGetNum) > 0) {
						maxGetNum = ~~Number(maxGetNum);
						$(outputInfo).html("向下获取" + maxGetNum + "个作品数");
					} else {
						maxGetNum = -1;
						$(outputInfo).html("向下获取所有作品");
					}

					nowhtml = $(outputInfo).html();
					//开始获取图片
					ajaxfordoc1(locationHref);
				}, false);
			})();
		} else if ((locationHref.indexOf("member_illust.php?id=") > -1 || locationHref.indexOf("&id=") > -1) && (locationHref.indexOf("&tag") == -1 && locationHref.indexOf("?tag") == -1)) { //2.on_illust_list

			var allowWork = true; //如果本次抓取未完成，则不
			var paged = 0; //向下第几页
			var baseUrl = locationHref.split("&p=")[0] + "&p=";

			if (!!$(".page-list .current")[0]) { //如果显示有页码
				var startPageNo = Number($(".page-list .current").eq(0).text()); //最开始时的页码
			} else { //否则认为只有1页
				var startPageNo = 1;
			}

			function startGet() {
				if (!allowWork) {
					alert("当前任务尚未完成，请等到提示完成之后再设置新的任务。");
					return false;
				}
				var wantPageNum = prompt("如果不限制下载的页数，请不要修改此默认值。\n如果要限制下载的页数，请输入从1开始的数字，1为仅下载本页。", "-1");
				if (~~Number(wantPageNum) < 1 && wantPageNum !== "-1") {
					$("#outputInfo").html($("#outputInfo").html() + "参数不合法，本次操作已取消。<br>");
					return false;
				}

				if (notdown.indexOf("1") > -1 && notdown.indexOf("2") > -1 && notdown.indexOf("3") > -1) {
					alert("由于您排除了所有作品类型，本次任务已取消。");
					return false;
				}
				if (~~Number(wantPageNum) >= 1) {
					wantPageNum = ~~Number(wantPageNum);
					$("#outputInfo").html($("#outputInfo").html() + "任务开始\n本次任务条件：从本页开始下载" + wantPageNum + "页");
				} else if (wantPageNum === "-1") {
					wantPageNum = -1;
					$("#outputInfo").html($("#outputInfo").html() + "任务开始\n本次任务条件：下载所有页面");
				}
				if (notdown !== "") {
					$("#outputInfo").html($("#outputInfo").html() + "<br>本次任务设置了排除作品：" + notdown);
				}
				if ($("#nottaginput").val() !== nottagdef) {
					$("#outputInfo").html($("#outputInfo").html() + "<br>本次任务设置了过滤tag：" + $("#nottaginput").val());
					nottagArray = $("#nottaginput").val().split(",");
					if (nottagArray[nottagArray.length - 1 === ""]) {
						nottagArray.pop();
					}
				}
				nowhtml = $("#outputInfo").html();

				function getpage(url) {
					$.ajax({
						url: baseUrl + (startPageNo + paged),
						type: "get",
						async: true,
						cache: false,
						dataType: "text",
						success: function(data) {
							paged++;
							doc0_jq = $(parser.parseFromString(data, "text/html"));
							var allPicArea = doc0_jq.find("._image-items .image-item");
							for (var i = 0; i < allPicArea.length; i++) {
								if (!allPicArea.eq(i).find("a")[0]) { //如果列表中的这个作品没有a标签，则是被删除、或非公开等错误项
									continue;
								}
								if (allPicArea.eq(i).find("a").eq(0).attr("class").indexOf("multiple") > -1) {
									if (notdown.indexOf("1") == -1) { //如果没有排除多图
										allPageUrl.push(allPicArea.eq(i).find("a").eq(0).attr("href"));
									}
								} else if (allPicArea.eq(i).find("a").eq(0).attr("class").indexOf("ugoku-illust") > -1) {
									if (notdown.indexOf("2") == -1) { //如果没有排除多图
										allPageUrl.push(allPicArea.eq(i).find("a").eq(0).attr("href"));
									}
								} else { //这时候除了单图，还有可能是manga，里面最后是mode=big，也当做单图处理
									if (notdown.indexOf("3") == -1) { //如果没有排除单图
										allPageUrl.push(allPicArea.eq(i).find("a").eq(0).attr("href"));
									}
								}
							}
							$("#outputInfo").html(nowhtml + "<br>已抓取作品列表" + paged + "个页面");
							//判断任务状态
							if (!doc0_jq.find(".next ._button")[0] || paged == wantPageNum) { //如果没有下一页的按钮或者抓取完指定页面
								allowWork = true;
								paged = 0;
								$("#outputInfo").html($("#outputInfo").html() + "<br>作品列表页面抓取完成，开始获取图片网址");
								nowhtml = $("#outputInfo").html();
								if (allPageUrl.length < ajax1Bingfa) {
									ajax1Bingfa = allPageUrl.length;
								}
								for (i = 0; i < ajax1Bingfa; i++) {
									setTimeout(ajaxfordoc1(allPageUrl[0]), i * ajax1Jiange);
								}
							} else {
								getpage();
							}
						}
					});
				}

				allowWork = false; //开始执行时更改许可状态
				getpage();
			}

			function ajaxfordoc1(url) {
				ajaxDocIsEnd = false;
				allPageUrl.shift();
				$.ajax({
					url: url,
					type: "get",
					async: true,
					cache: false,
					dataType: "text",
					success: function(data) {
						var tagIsFound = false;
						doc1_jq = $(parser.parseFromString(data, "text/html"));
						var nowAllTag = doc1_jq.find("li.tag");
						outerloop: //命名外圈语句
							for (var i = nowAllTag.length - 1; i >= 0; i--) {
								var nowTag = nowAllTag.eq(i).find(".text").text();
								for (var ii = nottagArray.length - 1; ii >= 0; ii--) {
									if (nowTag === nottagArray[ii]) {
										tagIsFound = true;
										break outerloop;
									}
								}
							}
						if (!!doc1_jq.find(".original-image")[0] && !tagIsFound) { //如果是单图
							imgUrlList.push(doc1_jq.find(".original-image").attr("data-src"));
							output();
						} else if (!!doc1_jq.find(".works_display")[0] && !tagIsFound) { //单图以外的情况
							if (!!doc1_jq.find(".full-screen._ui-tooltip")[0]) { //如果是动图 DOMParser之后无法解析（找到）canvas标签，不然判断更简单
								imgUrlList.push(doc1_jq.find("#wrapper script").eq(0).text().split("\"src\":\"")[2].split("\",\"mime_type")[0].replace(/\\/g, "")); //DOMParser之后js不会执行，所以无法用p站自己的动图变量来获取动图网址了
								output();
							} else {
								var pNo = parseInt(doc1_jq.find("ul.meta li").eq(1).text().split(" ")[1].split("P")[0]); //P数
								ajaxfordoc2(doc1_jq.find(".works_display a").eq(0).attr("href"), pNo);
							}
						}
						ajaxDocIsEnd = true;
						if (maxGetNum > 0) {
							maxGetNum--;
						}
						if (allPageUrl.length > 0) { //如果存在下一个作品，则
							ajaxfordoc1(allPageUrl[0]);
						} else { //没有剩余作品
							ajax1No++;
							if (ajax1No === ajax1Bingfa) { //如果所有并发请求都执行完毕
								outputUrls(imgUrlList);
								ajax1No = 0; //复位
							}
						}
					},
					statusCode: { //如果发生了错误则跳过该url
						0: function() {
							//ERR_CONNECTION_RESET
							ajaxfordoc1(allPageUrl[0]);
							console.log('请求的url不可访问');
						},
						403: function() {
							//403错误
							ajaxfordoc1(allPageUrl[0]);
							console.log('无权访问请求的ur');
						},
						404: function() {
							//404错误
							ajaxfordoc1(allPageUrl[0]);
							console.log('未找到该页面');
						}
					}
				});
			}

			(function() {
				var downloadBotton = document.createElement("div");
				document.body.appendChild(downloadBotton);
				$(downloadBotton).text("下载该画师的作品");
				$(downloadBotton).attr("title", "下载该画师的作品，如有多页，默认会下载全部。");
				downloadBotton.style.cssText = "background: #00A514;border-radius: 3px;color: #fff;text-align: center;padding: 10px 5px;position: fixed;top: 335px;right: 0;z-index: 9999;cursor: pointer;";
				downloadBotton.addEventListener("click", function() {
					$("._global-header").eq(0).before(outputInfo);
					startGet();
				}, false);
			})();

			var notdown = "";
			(function() {
				var clearMultiple = document.createElement("div");
				clearMultiple.id = "clearMultiple";
				document.body.appendChild(clearMultiple);
				$(clearMultiple).text("排除指定类型的作品");
				$(clearMultiple).attr("title", "在下载前，您可以设置想要排除的作品类型。");
				clearMultiple.style.cssText = "background: #DA7002;border-radius: 3px;color: #fff;text-align: center;padding: 10px 5px;position: fixed;top: 385px;right: 0;z-index: 9999;cursor: pointer;";
				clearMultiple.addEventListener("click", function() {
					notdown = prompt("请设置下载时要排除的作品类型。如需多选，将多个数字连写即可\n1：排除多图\n2：排除动图\n3：排除单图", "");
					if (notdown === null) { //如果取消设置，则将返回值null改为字符串，不然无法使用indexOf
						notdown = "";
					}
				}, false);
			})();

			jQuery.focusblur = function(element, defcolor, truecolor) {
				var focusblurid = element;
				var defval = focusblurid.val(); //针对input
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

			var nottagArray = [];
			var nottagdef = "您可在下载前设置要过滤的tag，这样在下载时将不会下载含有这些tag的作品。区分大小写；如需过滤多个tag，请使用英文逗号分隔。";
			(function() {
				var nottag = document.createElement("div");
				nottag.id = "nottag";
				document.body.appendChild(nottag);
				$(nottag).text("设置需要过滤的tag");
				$(nottag).attr("title", "在下载前，您可以设置想要过滤的tag。");
				nottag.style.cssText = "background: #DA7002;border-radius: 3px;color: #fff;text-align: center;padding: 10px 5px;position: fixed;top: 435px;right: 0;z-index: 9999;cursor: pointer;";

				var nottaginput = document.createElement("textarea");
				nottaginput.id = "nottaginput";
				nottaginput.style.cssText = "width: 600px;height: 100px;font-size: 12px;margin:6px auto;background:#fff;colir:#bbb;padding:7px;display:none;";
				document.body.insertBefore(nottaginput, $(".header")[0]);
				$("#nottaginput").val(nottagdef);
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
			})();

		} else if ((locationHref.indexOf("bookmark.php") > -1 && locationHref.indexOf("tag=") > -1) || (locationHref.indexOf("member_illust.php?id=") > -1 && locationHref.indexOf("&tag=") > -1)) { //3.on_tagpage

			var allowWork = true; //如果本次抓取未完成，则不
			var paged = 0; //向下第几页
			var baseUrl = locationHref.split("&p=")[0] + "&p=";

			if (!!$(".page-list .current")[0]) { //如果显示有页码
				var startPageNo = Number($(".page-list .current").eq(0).text()); //最开始时的页码
			} else { //否则认为只有1页
				var startPageNo = 1;
			}

			function startGet() {
				if (!allowWork) {
					alert("当前任务尚未完成，请等到提示完成之后再设置新的任务。");
					return false;
				}
				if (locationHref.indexOf("tag") == -1) {
					alert("当前页面不是tag页，或是'全部'的tag。请选择一个作为分类的tag页。");
					return false;
				}
				var wantPageNum = prompt("如果不限制下载的页数，请不要修改此默认值。\n如果要限制下载的页数，请输入从1开始的数字，1为仅下载本页。", "-1");
				if (~~Number(wantPageNum) < 1 && wantPageNum !== "-1") {
					$("#outputInfo").html($("#outputInfo").html() + "参数不合法，本次操作已取消。<br>");
					return false;
				}

				if (notdown.indexOf("1") > -1 && notdown.indexOf("2") > -1 && notdown.indexOf("3") > -1) {
					alert("由于您排除了所有作品类型，本次任务已取消。");
					return false;
				}
				if (~~Number(wantPageNum) >= 1) {
					wantPageNum = ~~Number(wantPageNum);
					$("#outputInfo").html($("#outputInfo").html() + "任务开始\n本次任务条件：从本页开始下载" + wantPageNum + "页");
				} else if (wantPageNum === "-1") {
					wantPageNum = -1;
					$("#outputInfo").html($("#outputInfo").html() + "任务开始\n本次任务条件：下载所有页面");
				}
				if (notdown !== "") {
					$("#outputInfo").html($("#outputInfo").html() + "<br>本次任务设置了排除作品：" + notdown);
				}
				nowhtml = $("#outputInfo").html();

				function getpage(url) {
					$.ajax({
						url: baseUrl + (startPageNo + paged),
						type: "get",
						async: true,
						cache: false,
						dataType: "text",
						success: function(data) {
							paged++;
							doc0_jq = $(parser.parseFromString(data, "text/html"));
							var allPicArea = doc0_jq.find("._image-items .image-item");
							for (var i = 0; i < allPicArea.length; i++) {
								if (!allPicArea.eq(i).find("a")[0]) { //如果列表中的这个作品没有a标签，则是被删除、或非公开等错误项
									continue;
								}
								if (allPicArea.eq(i).find("a").eq(0).attr("class").indexOf("multiple") > -1) {
									if (notdown.indexOf("1") == -1) { //如果没有排除多图
										allPageUrl.push(allPicArea.eq(i).find("a").eq(0).attr("href"));
									}
								} else if (allPicArea.eq(i).find("a").eq(0).attr("class").indexOf("ugoku-illust") > -1) {
									if (notdown.indexOf("2") == -1) { //如果没有排除多图
										allPageUrl.push(allPicArea.eq(i).find("a").eq(0).attr("href"));
									}
								} else { //这时候除了单图，还有可能是manga，里面最后是mode=big，也当做单图处理
									if (notdown.indexOf("3") == -1) { //如果没有排除单图
										allPageUrl.push(allPicArea.eq(i).find("a").eq(0).attr("href"));
									}
								}
							}
							$("#outputInfo").html(nowhtml + "<br>已抓取本tag" + paged + "个页面");
							//判断任务状态
							if (!doc0_jq.find(".next ._button")[0] || paged == wantPageNum) { //如果没有下一页的按钮或者抓取完指定页面
								allowWork = true;
								paged = 0;
								$("#outputInfo").html($("#outputInfo").html() + "<br>tag页面抓取完成，开始获取图片网址");
								nowhtml = $("#outputInfo").html();
								if (allPageUrl.length < ajax1Bingfa) {
									ajax1Bingfa = allPageUrl.length;
								}
								for (var i = 0; i < ajax1Bingfa; i++) {
									setTimeout(ajaxfordoc1(allPageUrl[0]), i * ajax1Jiange);
								}
							} else {
								getpage();
							}
						}
					});
				}

				allowWork = false; //开始执行时更改许可状态
				getpage();
			}

			function ajaxfordoc1(url) {
				ajaxDocIsEnd = false;
				allPageUrl.shift();
				$.ajax({
					url: url,
					type: "get",
					async: true,
					cache: false,
					dataType: "text",
					success: function(data) {
						doc1_jq = $(parser.parseFromString(data, "text/html"));
						if (!!doc1_jq.find(".original-image")[0]) { //如果是单图
							imgUrlList.push(doc1_jq.find(".original-image").attr("data-src"));
							output();
						} else if (!!doc1_jq.find(".works_display")[0]) { //单图以外的情况
							if (!!doc1_jq.find(".full-screen._ui-tooltip")[0]) { //如果是动图 DOMParser之后无法解析（找到）canvas标签，不然判断更简单
								imgUrlList.push(doc1_jq.find("#wrapper script").eq(0).text().split("\"src\":\"")[2].split("\",\"mime_type")[0].replace(/\\/g, "")); //DOMParser之后js不会执行，所以无法用p站自己的动图变量来获取动图网址了
								output();
							} else {
								var pNo = parseInt(doc1_jq.find("ul.meta li").eq(1).text().split(" ")[1].split("P")[0]); //P数
								ajaxfordoc2(doc1_jq.find(".works_display a").eq(0).attr("href"), pNo);
							}
						}
						ajaxDocIsEnd = true;
						if (maxGetNum > 0) {
							maxGetNum--;
						}
						if (allPageUrl.length > 0) { //如果存在下一个作品，则
							ajaxfordoc1(allPageUrl[0]);
						} else { //没有剩余作品
							ajax1No++;
							if (ajax1No === ajax1Bingfa) { //如果所有并发请求都执行完毕
								outputUrls(imgUrlList);
								ajax1No = 0; //复位
							}
						}
					},
					statusCode: { //如果发生了错误则跳过该url
						0: function() {
							//ERR_CONNECTION_RESET
							ajaxfordoc1(allPageUrl[0]);
							console.log('请求的url不可访问');
						},
						400: function() {
							//400错误
							ajaxfordoc1(allPageUrl[0]);
							console.log('该作品已被删除'); //在收藏的作品列表中，有些作品被作者删除了，却还显示有“编辑”按钮（有些是没有这个按钮的）。点击这个按钮会跳转到错误的“编辑收藏”页面，导致400错误。本状态码指示程序在这种情况下跳过。这个判断仅在下载书签作品的两部分js里添加。
						},
						403: function() {
							//403错误
							ajaxfordoc1(allPageUrl[0]);
							console.log('无权访问请求的url');
						},
						404: function() {
							//404错误
							ajaxfordoc1(allPageUrl[0]);
							console.log('未找到该页面');
						}
					}
				});
			}

			(function() {
				var downloadBotton = document.createElement("div");
				document.body.appendChild(downloadBotton);
				$(downloadBotton).text("下载该tag中的作品");
				$(downloadBotton).attr("title", "下载该tag中的作品，如有多页，默认会下载全部。");
				downloadBotton.style.cssText = "background: #00A514;border-radius: 3px;color: #fff;text-align: center;padding: 10px 5px;position: fixed;top: 335px;right: 0;z-index: 9999;cursor: pointer;";
				downloadBotton.addEventListener("click", function() {
					$("._global-header").eq(0).before(outputInfo);
					startGet();
				}, false);
			})();

			var notdown = "";
			(function() {
				var clearMultiple = document.createElement("div");
				clearMultiple.id = "clearMultiple";
				document.body.appendChild(clearMultiple);
				$(clearMultiple).text("排除指定类型的作品");
				$(clearMultiple).attr("title", "在下载前，您可以设置想要排除的作品类型。");
				clearMultiple.style.cssText = "background: #DA7002;border-radius: 3px;color: #fff;text-align: center;padding: 10px 5px;position: fixed;top: 385px;right: 0;z-index: 9999;cursor: pointer;";
				clearMultiple.addEventListener("click", function() {
					notdown = prompt("请设置下载时要排除的作品类型。如需多选，将多个数字连写即可\n1：排除多图\n2：排除动图\n3：排除单图", "");
					if (notdown === null) { //如果取消设置，则将返回值null改为字符串，不然无法使用indexOf
						notdown = "";
					}
				}, false);
			})();

		} else if (locationHref.indexOf("bookmark.php") > -1 && locationHref.indexOf("tag=") == -1) { //4.on_bookmark

			var allowWork = true; //如果本次抓取未完成，则不
			var paged = 0; //向下第几页

			if ($(".menu-items").eq(2).find("a.current").text().indexOf("收藏") > -1) { //如果是按收藏排序

			}
			var baseUrl = locationHref.split("?rest=show&p=")[0] + "?rest=show&p=";

			if (!!$(".page-list .current")[0]) { //如果显示有页码
				var startPageNo = Number($(".page-list .current").eq(0).text()); //最开始时的页码
				var baseUrl = "https://www.pixiv.net/bookmark.php" + $(".page-list").eq(0).find("a").eq(0).attr("href").split("&p=")[0] + "&p="; //这个基础url要根据排序方式变化，所以从页码中取值
			} else { //否则认为只有1页
				var startPageNo = 1;
				var baseUrl = locationHref;
			}

			function startGet() {
				if (!allowWork) {
					alert("当前任务尚未完成，请等到提示完成之后再设置新的任务。");
					return false;
				}
				var wantPageNum = prompt("如果不限制下载的页数，请不要修改此默认值。\n如果要限制下载的页数，请输入从1开始的数字，1为仅下载本页。", "-1");
				if (~~Number(wantPageNum) < 1 && wantPageNum !== "-1") {
					$("#outputInfo").html($("#outputInfo").html() + "参数不合法，本次操作已取消。<br>");
					return false;
				}

				if (notdown.indexOf("1") > -1 && notdown.indexOf("2") > -1 && notdown.indexOf("3") > -1) {
					alert("由于您排除了所有作品类型，本次任务已取消。");
					return false;
				}
				if (~~Number(wantPageNum) >= 1) {
					wantPageNum = ~~Number(wantPageNum);
					$("#outputInfo").html($("#outputInfo").html() + "任务开始\n本次任务条件：从本页开始下载" + wantPageNum + "页");
				} else if (wantPageNum === "-1") {
					wantPageNum = -1;
					$("#outputInfo").html($("#outputInfo").html() + "任务开始\n本次任务条件：下载所有页面");
				}
				if (notdown !== "") {
					$("#outputInfo").html($("#outputInfo").html() + "<br>本次任务设置了排除作品：" + notdown);
				}
				nowhtml = $("#outputInfo").html();

				function getpage(url) {
					$.ajax({
						url: baseUrl + (startPageNo + paged),
						type: "get",
						async: true,
						cache: false,
						dataType: "text",
						success: function(data) {
							paged++;
							doc0_jq = $(parser.parseFromString(data, "text/html"));
							var allPicArea = doc0_jq.find("._image-items .image-item");
							for (var i = 0; i < allPicArea.length; i++) {
								if (!allPicArea.eq(i).find("a")[0]) { //如果列表中的这个作品没有a标签，则是被删除、或非公开等错误项
									continue;
								}
								if (allPicArea.eq(i).find("a").eq(0).attr("class").indexOf("multiple") > -1) {
									if (notdown.indexOf("1") == -1) { //如果没有排除多图
										allPageUrl.push(allPicArea.eq(i).find("a").eq(0).attr("href"));
									}
								} else if (allPicArea.eq(i).find("a").eq(0).attr("class").indexOf("ugoku-illust") > -1) {
									if (notdown.indexOf("2") == -1) { //如果没有排除多图
										allPageUrl.push(allPicArea.eq(i).find("a").eq(0).attr("href"));
									}
								} else { //这时候除了单图，还有可能是manga，里面最后是mode=big，也当做单图处理
									if (notdown.indexOf("3") == -1) { //如果没有排除单图
										allPageUrl.push(allPicArea.eq(i).find("a").eq(0).attr("href"));
									}
								}
							}
							$("#outputInfo").html(nowhtml + "<br>已抓取" + paged + "个页面");
							//判断任务状态
							if (!doc0_jq.find(".next ._button")[0] || paged == wantPageNum) { //如果没有下一页的按钮或者抓取完指定页面
								allowWork = true;
								paged = 0;
								$("#outputInfo").html($("#outputInfo").html() + "<br>页面抓取完成，开始获取图片网址");
								nowhtml = $("#outputInfo").html();
								if (allPageUrl.length < ajax1Bingfa) {
									ajax1Bingfa = allPageUrl.length;
								}
								for (i = 0; i < ajax1Bingfa; i++) {
									setTimeout(ajaxfordoc1(allPageUrl[0]), i * ajax1Jiange);
								}
							} else {
								getpage();
							}
						}
					});
				}

				allowWork = false; //开始执行时更改许可状态
				getpage();
			}

			function ajaxfordoc1(url) {
				ajaxDocIsEnd = false;
				allPageUrl.shift();
				$.ajax({
					url: url,
					type: "get",
					async: true,
					cache: false,
					dataType: "text",
					success: function(data) {
						doc1_jq = $(parser.parseFromString(data, "text/html"));
						if (!!doc1_jq.find(".original-image")[0]) { //如果是单图
							imgUrlList.push(doc1_jq.find(".original-image").attr("data-src"));
							output();
						} else if (!!doc1_jq.find(".works_display")[0]) { //单图以外的情况
							if (!!doc1_jq.find(".full-screen._ui-tooltip")[0]) { //如果是动图 DOMParser之后无法解析（找到）canvas标签，不然判断更简单
								imgUrlList.push(doc1_jq.find("#wrapper script").eq(0).text().split("\"src\":\"")[2].split("\",\"mime_type")[0].replace(/\\/g, "")); //DOMParser之后js不会执行，所以无法用p站自己的动图变量来获取动图网址了
								output();
							} else {
								var pNo = parseInt(doc1_jq.find("ul.meta li").eq(1).text().split(" ")[1].split("P")[0]); //P数
								ajaxfordoc2(doc1_jq.find(".works_display a").eq(0).attr("href"), pNo);
							}
						}
						ajaxDocIsEnd = true;
						if (maxGetNum > 0) {
							maxGetNum--;
						}
						if (allPageUrl.length > 0) { //如果存在下一个作品，则
							ajaxfordoc1(allPageUrl[0]);
						} else { //没有剩余作品
							ajax1No++;
							if (ajax1No === ajax1Bingfa) { //如果所有并发请求都执行完毕
								outputUrls(imgUrlList);
								ajax1No = 0; //复位
							}
						}
					},
					statusCode: { //如果发生了错误则跳过该url
						0: function() {
							//ERR_CONNECTION_RESET
							ajaxfordoc1(allPageUrl[0]);
							console.log('请求的url不可访问');
						},
						400: function() {
							//400错误
							ajaxfordoc1(allPageUrl[0]);
							console.log('该作品已被删除'); //在收藏的作品列表中，有些作品被作者删除了，却还显示有“编辑”按钮（有些是没有这个按钮的）。点击这个按钮会跳转到错误的“编辑收藏”页面，导致400错误。本状态码指示程序在这种情况下跳过。这个判断仅在下载书签作品的两部分js里添加。
						},
						403: function() {
							//403错误
							ajaxfordoc1(allPageUrl[0]);
							console.log('无权访问请求的ur');
						},
						404: function() {
							//404错误
							ajaxfordoc1(allPageUrl[0]);
							console.log('未找到该页面');
						}
					}
				});
			}

			(function() {
				var downloadBotton = document.createElement("div");
				document.body.appendChild(downloadBotton);
				$(downloadBotton).text("下载书签中的作品");
				$(downloadBotton).attr("title", "下载书签中的作品，如有多页，默认会下载全部。");
				downloadBotton.style.cssText = "background: #00A514;border-radius: 3px;color: #fff;text-align: center;padding: 10px 5px;position: fixed;top: 335px;right: 0;z-index: 9999;cursor: pointer;";
				downloadBotton.addEventListener("click", function() {
					$("._global-header").eq(0).before(outputInfo);
					startGet();
				}, false);
			})();

			var notdown = "";
			(function() {
				var clearMultiple = document.createElement("div");
				clearMultiple.id = "clearMultiple";
				document.body.appendChild(clearMultiple);
				$(clearMultiple).text("排除指定类型的作品");
				$(clearMultiple).attr("title", "在下载前，您可以设置想要排除的作品类型。");
				clearMultiple.style.cssText = "background: #DA7002;border-radius: 3px;color: #fff;text-align: center;padding: 10px 5px;position: fixed;top: 385px;right: 0;z-index: 9999;cursor: pointer;";
				clearMultiple.addEventListener("click", function() {
					notdown = prompt("请设置下载时要排除的作品类型。如需多选，将多个数字连写即可\n1：排除多图\n2：排除动图\n3：排除单图", "");
					if (notdown === null) { //如果取消设置，则将返回值null改为字符串，不然无法使用indexOf
						notdown = "";
					}
				}, false);
			})();

		} else if (locationHref.indexOf("search.php?") > -1) { //5.on_tagsearch

			var baseUrl = locationHref.split("&p=")[0] + "&p=";
			var startPageNo = Number($(".page-list .current").eq(0).text()); //最开始时的页码
			var allowWork = true; //如果本次抓取未完成，则不
			var paged = 0; //向下第几页
			var stop = false;
			var imgList = []; //储存所有作品
			var doneTip = ""; //在抓取完成时保存提示信息

			function changeResult() {
				$("#outputInfo").html(doneTip + "调整完毕，当前有" + $(".autopagerize_page_element .image-item:visible").length + "张作品。<br>");
			}

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

			function startGet() {
				$(".user-ad-container.out").remove();
				if (!allowWork) {
					alert("当前任务尚未完成，请等到提示完成之后再设置新的任务。");
					return false;
				}
				var userset = prompt("请输入最低收藏数和要抓取的页数，用英文逗号分开。\n类似于下面的形式：\n1000,100", "1000,100");
				var wantFavNum = Number(userset.split(",")[0]);
				var wantPageNum = Number(userset.split(",")[1]);
				if (isNaN(wantFavNum) || wantFavNum <= 0 || isNaN(wantPageNum) || wantFavNum <= 0) {
					alert("参数不合法，请稍后重试。");
					return false;
				}
				$("#outputInfo").html($("#outputInfo").html() + "任务开始\n本次任务条件：收藏数不低于" + wantFavNum + "，向下抓取" + wantPageNum + "页");
				var pageed2 = 0; //本次已经抓取了多少页
				if (!paged) { //如果是首次抓取 则处理顶层窗口
					$(".popular-introduction").hide();
					$(".autopagerize_page_element .image-item").eq(5).css("height", "249px");
					var allPicArea = $(".autopagerize_page_element .image-item");
					for (var i = 0; i < allPicArea.length; i++) {
						var shoucang = allPicArea.eq(i).find("._ui-tooltip").eq(0).text();
						if (allPicArea.eq(i).find("._ui-tooltip").eq(0).text() < wantFavNum) { //必须限制序号0，不然对图片的回应数也会连起来
							allPicArea.eq(i).remove();
						} else {
							imgList.push({
								"e": allPicArea[i],
								"num": Number(shoucang)
							});
						}
					}
				}
				nowhtml = $("#outputInfo").html();

				function getpage(url) {
					$.ajax({
						url: baseUrl + (startPageNo + 1 + paged),
						type: "get",
						async: true,
						cache: false,
						dataType: "text",
						success: function(data) {
							paged++;
							pageed2++;
							doc0_jq = $(parser.parseFromString(data, "text/html"));
							var allPicArea = doc0_jq.find(".autopagerize_page_element").find(".image-item");
							for (var i = 0; i < allPicArea.length; i++) {
								var shoucang = allPicArea.eq(i).find("._ui-tooltip").eq(0).text();
								if (shoucang >= wantFavNum) {
									imgList.push({
										"e": allPicArea[i],
										"num": Number(shoucang)
									});
									$(window.top.document).find(".autopagerize_page_element")[0].appendChild(allPicArea[i]);
								}
							}
							$("#outputInfo").html(nowhtml + "<br>已抓取本次任务第" + pageed2 + "/" + wantPageNum + "页，当前加载到第" + (startPageNo + paged) + "页");
							//判断任务状态
							if (pageed2 == wantPageNum) {
								allowWork = true;
								$("#outputInfo").html($("#outputInfo").html() + "<br>本次任务完成。当前有" + $(".autopagerize_page_element .image-item").length + "张作品。<br><br>");
								// paged=0;         //不注释掉的话，每次添加筛选任务都是从当前页开始，而不是一直往后累计
								listSort();
								alert("本次任务已全部完成。");
								return false;
							} else if (!doc0_jq.find(".next ._button")[0]) {
								allowWork = true;
								$("#outputInfo").html($("#outputInfo").html() + "<br>已抓取本tag的所有页面，本次任务完成。当前有" + $(".autopagerize_page_element .image-item").length + "张作品。<br><br>");
								// paged=0;         //不注释掉的话，每次添加筛选任务都是从当前页开始，而不是一直往后累计
								listSort();
								alert("本次任务已全部完成。");
								return false;
							} else if (stop) {
								$("#outputInfo").html($("#outputInfo").html() + "<br>当前任务已中断！当前有" + $(".autopagerize_page_element .image-item").length + "张作品。<br><br>");
								stop = false;
								allowWork = true;
								alert("当前任务已中断！");
								listSort();
								return false;
							} else {
								getpage();
							}
						}
					});
				}

				allowWork = false; //开始执行时更改许可状态
				getpage();

			}

			(function() {
				var removeVip = document.createElement("div");
				document.body.appendChild(removeVip);
				$(removeVip).text("去除会员限制");
				$(removeVip).attr("title", "去掉中间区域热门作品上的会员限制。");
				removeVip.style.cssText = "background: #DA7002;border-radius: 3px;color: #fff;text-align: center;padding: 10px 5px;position: fixed;top: 185px;right: 0;z-index: 9999;cursor: pointer;";
				removeVip.addEventListener("click", function() {
					$(".popular-introduction a").eq(0).remove();
				}, false);
			})();

			(function() {
				var startBotton = document.createElement("div");
				document.body.appendChild(startBotton);
				$(startBotton).text("按收藏数筛选");
				startBotton.style.cssText = "background: #0096DB;border-radius: 3px;color: #fff;text-align: center;padding: 10px 5px;position: fixed;top: 235px;right: 0;z-index: 9999;cursor: pointer;";
				startBotton.addEventListener("click", function() {
					$("._global-header").eq(0).before(outputInfo);
					startGet();
				}, false);
			})();

			(function() {
				var stopFilter = document.createElement("div");
				document.body.appendChild(stopFilter);
				$(stopFilter).text("中断当前任务");
				$(stopFilter).attr("title", "筛选时中断之后可以继续执行。下载时中断，下次下载要重新获取图片网址。");
				stopFilter.style.cssText = "background: #DA7002;border-radius: 3px;color: #fff;text-align: center;padding: 10px 5px;position: fixed;top: 335px;right: 0;z-index: 9999;cursor: pointer;";
				stopFilter.addEventListener("click", function() {
					stop = true;
				}, false);
			})();

			(function() {
				var filterSelf = document.createElement("div");
				document.body.appendChild(filterSelf);
				$(filterSelf).text("在结果中筛选");
				$(filterSelf).attr("title", "如果本页筛选后作品太多，可以提高收藏数的要求，在结果中筛选。达不到要求的会被隐藏而不是删除。所以你可以反复进行筛选。被隐藏的项目不会被下载。");
				filterSelf.style.cssText = "background: #0096DB;border-radius: 3px;color: #fff;text-align: center;padding: 10px 5px;position: fixed;top: 385px;right: 0;z-index: 9999;cursor: pointer;";
				filterSelf.addEventListener("click", function() {
					var allPicArea = $(".autopagerize_page_element .image-item");
					var wantFavNum2 = prompt("将在当前作品列表中再次过滤，请输入要求的最低收藏数：", "1500");
					if (!wantFavNum2) {
						return false;
					} else if (isNaN(Number(wantFavNum2)) || ~~Number(wantFavNum2) <= 0) {
						alert("不合法的数值，取消本次操作。");
						return false;
					} else {
						wantFavNum2 = ~~Number(wantFavNum2);
					}
					for (var i = 0; i < allPicArea.length; i++) {
						if (allPicArea.eq(i).find("._ui-tooltip").eq(0).text() < wantFavNum2) { //必须限制序号0，不然对图片的回应数也会连起来
							allPicArea.eq(i).hide(); //这里把结果中不符合二次过滤隐藏掉，而非删除
						} else {
							allPicArea.eq(i).show();
						}
					}
					changeResult();
					// console.log("结果中筛选");
				}, false);
			})();

			(function() {
				var clearMultiple = document.createElement("div");
				document.body.appendChild(clearMultiple);
				$(clearMultiple).text("清除多图作品");
				$(clearMultiple).attr("title", "多图作品的图片质量以及与当前tag的相关度难以保证，并且会严重加大下载图片的数量。如不需要可以清除掉。");
				clearMultiple.style.cssText = "background: #DA7002;border-radius: 3px;color: #fff;text-align: center;padding: 10px 5px;position: fixed;top: 435px;right: 0;z-index: 9999;cursor: pointer;";
				clearMultiple.addEventListener("click", function() {
					var allPicArea = $(".autopagerize_page_element .image-item");
					for (var i = 0; i < allPicArea.length; i++) {
						if (!!allPicArea.eq(i).find(".multiple")[0]) {
							allPicArea.eq(i).remove();
						}
					}
					changeResult();
					// console.log("清除多图");
				}, false);
			})();

			(function() {
				var clearUgoku = document.createElement("div");
				document.body.appendChild(clearUgoku);
				$(clearUgoku).text("清除动图作品");
				$(clearUgoku).attr("title", "如不需要动图可以清除掉。");
				clearUgoku.style.cssText = "background: #DA7002;border-radius: 3px;color: #fff;text-align: center;padding: 10px 5px;position: fixed;top: 485px;right: 0;z-index: 9999;cursor: pointer;";
				clearUgoku.addEventListener("click", function() {
					var allPicArea = $(".autopagerize_page_element .image-item");
					for (var i = 0; i < allPicArea.length; i++) {
						if (!!allPicArea.eq(i).find(".ugoku-illust")[0]) {
							allPicArea.eq(i).remove();
						}
					}
					changeResult();
					// console.log("清除动图");
				}, false);
			})();

			(function() {
				var deleteBotton = document.createElement("div");
				deleteBotton.id = "deleteBotton";
				document.body.appendChild(deleteBotton);
				$(deleteBotton).text("手动删除作品");
				$(deleteBotton).attr("title", "可以在下载前手动删除不需要的作品。");
				$(deleteBotton).attr("data_del", "0");
				deleteBotton.style.cssText = "background: #DE0000;border-radius: 3px;color: #fff;text-align: center;padding: 10px 5px;position: fixed;top: 535px;right: 0;z-index: 9999;cursor: pointer;";
				$("#deleteBotton").bind("click", function() {
					$(".autopagerize_page_element .image-item").bind("click", function() {
						if ($("#deleteBotton").attr("data_del") === "1") {
							this.remove();
							if (allowWork) {
								changeResult();
								// console.log("手动删除");
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
				clearBotton.style.cssText = "background: #DE0000;border-radius: 3px;color: #fff;text-align: center;padding: 10px 5px;position: fixed;top: 585px;right: 0;z-index: 9999;cursor: pointer;";
				clearBotton.addEventListener("click", function() {
					$(".autopagerize_page_element .image-item").remove();
				}, false);
			})();

			// 以下是下载图片的代码——————————————————————————————————————————————

			(function() {
				var downloadBotton = document.createElement("div");
				document.body.appendChild(downloadBotton);
				$(downloadBotton).text("下载当前作品");
				$(downloadBotton).attr("title", "下载现在列表里的所有作品。");
				downloadBotton.style.cssText = "background: #00A514;border-radius: 3px;color: #fff;text-align: center;padding: 10px 5px;position: fixed;top: 285px;right: 0;z-index: 9999;cursor: pointer;";
				downloadBotton.addEventListener("click", function() {

					getdownloadlist();
				}, false);
			})();

			function getdownloadlist() {
				if (!allowWork) {
					alert("当前筛选任务尚未完成，请等待完成后再下载。");
					return false;
				} else if ($(".autopagerize_page_element .image-item:visible").length === 0) {
					return false;
				}
				allowWork = false;
				var allList = $(".autopagerize_page_element .image-item:visible");
				for (var i = allList.length - 1; i >= 0; i--) {
					allPageUrl[i] = $(allList[i]).find("a").eq(0).attr("href");
				}
				$("._global-header").eq(0).before(outputInfo);
				$("#outputInfo").html($("#outputInfo").html() + "<br>当前列表中有" + allList.length + "张作品，开始获取作品信息");
				nowhtml = $("#outputInfo").html();
				if (allPageUrl.length < ajax1Bingfa) {
					ajax1Bingfa = allPageUrl.length;
				}
				for (var i = 0; i < ajax1Bingfa; i++) {
					setTimeout(ajaxfordoc1(allPageUrl[0]), i * ajax1Jiange);
				}
			}

			function ajaxfordoc1(url) {
				ajaxDocIsEnd = false;
				allPageUrl.shift();
				$.ajax({
					url: url,
					type: "get",
					async: true,
					cache: false,
					dataType: "text",
					success: function(data) {
						doc1_jq = $(parser.parseFromString(data, "text/html"));
						if (!!doc1_jq.find(".original-image")[0]) { //如果是单图
							imgUrlList.push(doc1_jq.find(".original-image").attr("data-src"));
							output();
						} else if (!!doc1_jq.find(".works_display")[0]) { //单图以外的情况
							if (!!doc1_jq.find(".full-screen._ui-tooltip")[0]) { //如果是动图 DOMParser之后无法解析（找到）canvas标签，不然判断更简单
								imgUrlList.push(doc1_jq.find("#wrapper script").eq(0).text().split("\"src\":\"")[2].split("\",\"mime_type")[0].replace(/\\/g, "")); //DOMParser之后js不会执行，所以无法用p站自己的动图变量来获取动图网址了
								output();
							} else {
								var pNo = parseInt(doc1_jq.find("ul.meta li").eq(1).text().split(" ")[1].split("P")[0]); //P数
								ajaxfordoc2(doc1_jq.find(".works_display a").eq(0).attr("href"), pNo);
							}
						}
						ajaxDocIsEnd = true;
						if (maxGetNum > 0) {
							maxGetNum--;
						}
						if (stop) {
							stop = false;
							allowWork = true;
							imgUrlList = [];

							$("#outputInfo").html($("#outputInfo").html() + "<br>当前任务已中断！<br><br>");
							alert("当前任务已中断！");
							return false;
						}
						if (allPageUrl.length > 0) { //如果存在下一个作品，则
							ajaxfordoc1(allPageUrl[0]);
						} else { //没有剩余作品
							ajax1No++;
							if (ajax1No === ajax1Bingfa) { //如果所有请求都执行完毕
								outputUrls(imgUrlList);
								ajax1No = 0; //复位
							}
						}
					},
					statusCode: { //如果发生了错误则跳过该url
						0: function() {
							//ERR_CONNECTION_RESET
							ajaxfordoc1(allPageUrl[0]);
							console.log('请求的url不可访问');
						},
						403: function() {
							//403错误
							ajaxfordoc1(allPageUrl[0]);
							console.log('无权访问请求的ur');
						},
						404: function() {
							//404错误
							ajaxfordoc1(allPageUrl[0]);
							console.log('未找到该页面');
						}
					}
				});
			}

		} else if (locationHref.indexOf("ranking_area.php") > -1 && locationHref !== "https://www.pixiv.net/ranking_area.php") { //6.on_ranking_area

			(function() {
				var downloadBotton = document.createElement("div");
				document.body.appendChild(downloadBotton);
				$(downloadBotton).text("下载本页作品");
				$(downloadBotton).attr("title", "下载本页列表中的所有作品，共100个作品。");
				downloadBotton.style.cssText = "background: #00A514;border-radius: 3px;color: #fff;text-align: center;padding: 10px 5px;position: fixed;top: 285px;right: 0;z-index: 9999;cursor: pointer;";
				downloadBotton.addEventListener("click", function() {

					getdownloadlist();
				}, false);
			})();

			(function() {
				var clearMultiple = document.createElement("div");
				document.body.appendChild(clearMultiple);
				$(clearMultiple).text("排除多图作品");
				$(clearMultiple).attr("title", "如果不想下载多图作品可以清除掉。");
				clearMultiple.style.cssText = "background: #DA7002;border-radius: 3px;color: #fff;text-align: center;padding: 10px 5px;position: fixed;top: 335px;right: 0;z-index: 9999;cursor: pointer;";
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

			var allowWork = true; //如果本次抓取未完成，则不

			function getdownloadlist() {
				if (!allowWork) {
					alert("当前任务尚未完成，请等待完成后再下载。")
					return false;
				}
				allowWork = false;
				var allList = $(".ranking-item");
				for (var i = allList.length - 1; i >= 0; i--) {
					allPageUrl[i] = $(".ranking-item").eq(i).find("a").eq(1).attr("href");
				}
				$("._global-header").eq(0).before(outputInfo);
				$("#outputInfo").html("当前列表中有" + allList.length + "张作品，开始获取作品信息");
				nowhtml = $("#outputInfo").html();
				if (allPageUrl.length < ajax1Bingfa) {
					ajax1Bingfa = allPageUrl.length;
				}
				for (var i = 0; i < ajax1Bingfa; i++) {
					setTimeout(ajaxfordoc1(allPageUrl[0]), i * ajax1Jiange);
				}
			}

			function ajaxfordoc1(url) {
				ajaxDocIsEnd = false;
				allPageUrl.shift();
				$.ajax({
					url: url,
					type: "get",
					async: true,
					cache: false,
					dataType: "text",
					success: function(data) {
						doc1_jq = $(parser.parseFromString(data, "text/html"));
						if (!!doc1_jq.find(".original-image")[0]) { //如果是单图
							imgUrlList.push(doc1_jq.find(".original-image").attr("data-src"));
							output();
						} else if (!!doc1_jq.find(".works_display")[0]) { //单图以外的情况
							if (!!doc1_jq.find(".full-screen._ui-tooltip")[0]) { //如果是动图 DOMParser之后无法解析（找到）canvas标签，不然判断更简单
								imgUrlList.push(doc1_jq.find("#wrapper script").eq(0).text().split("\"src\":\"")[2].split("\",\"mime_type")[0].replace(/\\/g, "")); //DOMParser之后js不会执行，所以无法用p站自己的动图变量来获取动图网址了
								output();
							} else {
								var pNo = parseInt(doc1_jq.find("ul.meta li").eq(1).text().split(" ")[1].split("P")[0]); //P数
								ajaxfordoc2(doc1_jq.find(".works_display a").eq(0).attr("href"), pNo);
							}
						}
						ajaxDocIsEnd = true;
						if (maxGetNum > 0) {
							maxGetNum--;
						}
						if (allPageUrl.length > 0) { //如果存在下一个作品，则
							ajaxfordoc1(allPageUrl[0]);
						} else { //没有剩余作品
							ajax1No++;
							if (ajax1No === ajax1Bingfa) { //如果所有请求都执行完毕
								outputUrls(imgUrlList);
								ajax1No = 0; //复位
							}
						}
					},
					statusCode: { //如果发生了错误则跳过该url
						0: function() {
							//ERR_CONNECTION_RESET
							ajaxfordoc1(allPageUrl[0]);
							console.log('请求的url不可访问');
						},
						403: function() {
							//403错误
							ajaxfordoc1(allPageUrl[0]);
							console.log('无权访问请求的ur');
						},
						404: function() {
							//404错误
							ajaxfordoc1(allPageUrl[0]);
							console.log('未找到该页面');
						}
					}
				});
			}

		} else if (locationHref.indexOf("ranking.php") > -1) { //7.on_ranking_else

			if (locationHref !== "https://www.pixiv.net/ranking.php") {
				var baseUrl = locationHref + "&p=";
			} else {
				var baseUrl = locationHref + "?p=";
			}
			var allowWork = true; //如果本次抓取未完成，则不
			var paged = 0; //向下第几页
			var not_down_duotu = false; //不下载多图作品

			if ((baseUrl.indexOf("mode=daily") > -1 || baseUrl.indexOf("mode=weekly") > -1) && baseUrl.indexOf("r18") == -1) {
				var maxpage = 10; //排行榜页面一开始有50张作品，如果页面到了底部，会再向下加载，现在已知每日排行榜是10部分，日榜的r18是2部分，其他是6部分。为防止有未考虑到的情况出现，所以在此部分的getpage函数里判断了404状态码。
			} else if ((baseUrl.indexOf("mode=daily") > -1 || baseUrl.indexOf("mode=weekly") > -1) && baseUrl.indexOf("r18") > -1) {
				var maxpage = 2;
			} else if (baseUrl.indexOf("r18g") > -1) {
				var maxpage = 1;
			} else {
				var maxpage = 6;
			}

			function startGet() {
				if (!allowWork) {
					alert("当前任务尚未完成，请等到提示完成之后再设置新的任务。");
					return false;
				}
				if (!$("#outputInfo")[0]) {
					$("._global-header").eq(0).before(outputInfo);
				}
				if (not_down_duotu) {
					$("#outputInfo").html("任务开始，本次任务排除多图作品");
				} else {
					$("#outputInfo").html("任务开始，本次任务下载全部作品");
				}
				nowhtml = $("#outputInfo").html();

				function getpage(url) {
					$.ajax({
						url: baseUrl + (1 + paged),
						type: "get",
						async: true,
						cache: false,
						dataType: "text",
						success: function(data) {
							paged++;
							doc0_jq = $(parser.parseFromString(data, "text/html"));
							var allPicArea = doc0_jq.find(".ranking-item");
							if (not_down_duotu) {
								for (var i = 0; i < allPicArea.length; i++) {
									if (!allPicArea.eq(i).find("a")[0]) { //如果列表中的这个作品没有a标签，则是被删除、或非公开等错误项
										continue;
									}
									if (allPicArea.eq(i).find(".ranking-image-item a").attr("class").indexOf("multiple") == -1 && allPicArea.eq(i).find(".ranking-image-item a").attr("class").indexOf("manga") == -1) {
										allPageUrl.push(allPicArea.eq(i).find(".ranking-image-item a").attr("href"));
									}
								}
							} else {
								for (var i = 0; i < allPicArea.length; i++) {
									allPageUrl.push(allPicArea.eq(i).find(".ranking-image-item a").attr("href"));
								}
							}
							$("#outputInfo").html(nowhtml + "<br>已抓取本页面第" + paged + "部分");
							if (paged == maxpage) {
								$("#outputInfo").html($("#outputInfo").html() + "<br>本页面抓取完成。当前有" + allPageUrl.length + "张作品，开始获取作品信息。<br><br>");
								nowhtml = $("#outputInfo").html();
								if (allPageUrl.length < ajax1Bingfa) {
									ajax1Bingfa = allPageUrl.length;
								}
								for (var i = 0; i < ajax1Bingfa; i++) {
									setTimeout(ajaxfordoc1(allPageUrl[0]), i * ajax1Jiange);
								}
							} else {
								getpage();
							}
						},
						statusCode: {
							404: function() { //如果发生了404错误，则中断抓取，直接下载已有部分。（因为可能确实没有下一部分了，只是这种情况我们没见到，那么现有的判断可能就不适用。
								console.log("404错误，直接下载已有部分");
								$("#outputInfo").html($("#outputInfo").html() + "<br>本页面抓取完成。当前有" + allPageUrl.length + "张作品，开始获取作品信息。<br><br>");
								nowhtml = $("#outputInfo").html();
								ajaxfordoc1(allPageUrl[0]);
							}
						}
					});
				}

				allowWork = false; //开始执行时更改许可状态
				getpage();

			}
			(function() {
				var downloadBotton = document.createElement("div");
				document.body.appendChild(downloadBotton);
				$(downloadBotton).text("下载本排行榜作品");
				$(downloadBotton).attr("title", "下载本排行榜的所有作品，包括未加载出来的。")
				downloadBotton.style.cssText = "background: #00A514;border-radius: 3px;color: #fff;text-align: center;padding: 10px 5px;position: fixed;top: 285px;right: 0;z-index: 9999;cursor: pointer;";
				downloadBotton.addEventListener("click", function() {

					startGet();
				}, false);
			})();

			(function() {
				var clearMultiple = document.createElement("div");
				clearMultiple.id = "clearMultiple";
				document.body.appendChild(clearMultiple);
				$(clearMultiple).text("点击排除多图作品");
				$(clearMultiple).attr("title", "如不需要多图作品可以清除掉。")
				clearMultiple.style.cssText = "background: #DA7002;border-radius: 3px;color: #fff;text-align: center;padding: 10px 5px;position: fixed;top: 335px;right: 0;z-index: 9999;cursor: pointer;";
				clearMultiple.addEventListener("click", function() {
					if (!not_down_duotu) {
						not_down_duotu = true;
						alert("设置成功，将不会下载多图作品。");
						$("#clearMultiple").text("再次点击取消排除");
					} else {
						not_down_duotu = false;
						alert("取消成功，不再排除多图作品。");
						$("#clearMultiple").text("点击排除多图作品");
					}

				}, false);
			})();

			function ajaxfordoc1(url) {
				ajaxDocIsEnd = false;
				allPageUrl.shift();
				$.ajax({
					url: url,
					type: "get",
					async: true,
					cache: false,
					dataType: "text",
					success: function(data) {
						doc1_jq = $(parser.parseFromString(data, "text/html"));
						if (!!doc1_jq.find(".original-image")[0]) { //如果是单图
							imgUrlList.push(doc1_jq.find(".original-image").attr("data-src"));
							output();
						} else if (!!doc1_jq.find(".works_display")[0]) { //单图以外的情况
							if (!!doc1_jq.find(".full-screen._ui-tooltip")[0]) { //如果是动图 DOMParser之后无法解析（找到）canvas标签，不然判断更简单
								imgUrlList.push(doc1_jq.find("#wrapper script").eq(0).text().split("\"src\":\"")[2].split("\",\"mime_type")[0].replace(/\\/g, "")); //DOMParser之后js不会执行，所以无法用p站自己的动图变量来获取动图网址了
								output();
							} else {
								var pNo = parseInt(doc1_jq.find("ul.meta li").eq(1).text().split(" ")[1].split("P")[0]); //P数
								ajaxfordoc2(doc1_jq.find(".works_display a").eq(0).attr("href"), pNo);
							}
						}
						ajaxDocIsEnd = true;
						if (maxGetNum > 0) {
							maxGetNum--;
						}
						if (allPageUrl.length > 0) { //如果存在下一个作品，则
							ajaxfordoc1(allPageUrl[0]);
						} else { //没有剩余作品
							ajax1No++;
							if (ajax1No === ajax1Bingfa) { //如果所有请求都执行完毕
								outputUrls(imgUrlList);
								ajax1No = 0; //复位
							}
						}
					},
					statusCode: { //如果发生了错误则跳过该url
						0: function() {
							//ERR_CONNECTION_RESET
							ajaxfordoc1(allPageUrl[0]);
							console.log('请求的url不可访问');
						},
						403: function() {
							//403错误
							ajaxfordoc1(allPageUrl[0]);
							console.log('无权访问请求的ur');
						},
						404: function() {
							//404错误
							ajaxfordoc1(allPageUrl[0]);
							console.log('未找到该页面');
						}
					}
				});
			}

		} else if (locationHref.indexOf("https://www.pixivision.net") > -1 && locationHref.indexOf("/a/") > -1) { //8.on_pixivision
			var type = $("a[data-gtm-action=ClickCategory]").eq(0).attr("data-gtm-label");
			if (type == "illustration" || type == "manga" || type == "cosplay") { //在插画、漫画、cosplay类型的页面上创建下载功能
				// 创建下载按钮
				(function() {
					var downloadBotton = document.createElement("div");
					document.body.appendChild(downloadBotton);
					if (type == "illustration") {
						$(downloadBotton).html("下载该页面的图片<br><br>插画仅能获取小图");
					} else {
						$(downloadBotton).html("下载该页面的图片");
					}
					$(downloadBotton).attr("title", "下载该页面的图片")
					downloadBotton.style.cssText = "background: #00A514;border-radius: 3px;color: #fff;text-align: center;padding: 10px 5px;position: fixed;top: 335px;right: 0;z-index: 9999;cursor: pointer;";
					downloadBotton.addEventListener("click", function() {
						$(".logo-area h1").hide();
						document.body.insertBefore(outputInfo, $(".body-container")[0]);
						startGet();
					}, false);
				})();

				function startGet() {
					var imageList = []; //图片元素的列表
					if (type == "illustration") { // 针对不同的类型，选择器不同
						imageList = $(".am__work__main img");
					} else {
						imageList = $(".fab__image-block__image img");
					}

					for (var i = 0; i < imageList.length; i++) { // 把图片url添加进数组
						imgUrlList.push(imageList[i].src);
					}

					// 插画有首图，并且网页里的图片是小图，所以要特殊处理
					if (type == "illustration") {
						imgUrlList.push($(".aie__illust")[0].src); //添加首图的url 但是都是pixivision页面里的小图
					}
					outputUrls(imgUrlList);
				}
			}
		} else if (locationHref.indexOf("bookmark_add.php?id=") > -1 || locationHref.indexOf("bookmark_detail.php?illust_id=") > -1) { //9.on_bookmark_add	bookmark_add的页面刷新就变成bookmark_detail了

			var allowWork = true; //如果本次抓取未完成，则不
			var not_down_duotu = false; //不下载多图作品
			var maxNum = 300; //设置最大允许获取多少个相似图片。这个数字是可以改的，比如500,1000，这里我人为的做一下限制。
			var wantNum; //用户设置的数量

			function startGet() {
				if (!allowWork) {
					alert("当前任务尚未完成，请等到提示完成之后再设置新的任务。");
					return false;
				}
				if (!$("#outputInfo")[0]) {
					$("._global-header").eq(0).before(outputInfo);
				}
				if (not_down_duotu) {
					$("#outputInfo").html("任务开始，本次任务排除多图作品");
				} else {
					$("#outputInfo").html("任务开始，本次任务没有设置排除条件");
				}
				nowhtml = $("#outputInfo").html();

				function getpage(url) {
					var id = locationHref.split("id=")[1]; //取出作品id
					var tt = $("input[name=tt]")[0].value; //取出token
					var url_for_illust_list = "/rpc/recommender.php?type=illust&sample_illusts=" + id + "&num_recommendations=" + wantNum + "&tt=" + tt; //获取相似的作品的id，加载200个。
					$.ajax({
						url: url_for_illust_list,
						type: "get",
						async: true,
						cache: false,
						dataType: "text",
						success: function(data) {
							var illust_list = JSON.parse(data).recommendations; //取出id列表
							for (var i = 0; i < illust_list.length; i++) {
								allPageUrl.push("https://www.pixiv.net/member_illust.php?mode=medium&illust_id=" + illust_list[i]); //拼接作品的url
							}

							$("#outputInfo").html($("#outputInfo").html() + "<br>列表页获取完成。当前有" + allPageUrl.length + "张作品，开始获取作品信息。<br><br>");
							nowhtml = $("#outputInfo").html();

							for (var i = 0; i < ajax1Bingfa; i++) {
								setTimeout(ajaxfordoc1(allPageUrl[0]), i * ajax1Jiange);
							}
						},
						statusCode: {
							400: function() { //如果发生了404错误，则中断抓取，直接下载已有部分。（因为可能确实没有下一部分了，只是这种情况我们没见到，那么现有的判断可能就不适用。
								console.log("400错误，服务器拒绝");
								$("#outputInfo").html($("#outputInfo").html() + "<br>出现400错误，任务停止。");
								return false;
							}
						}
					});
				}

				allowWork = false; //开始执行时更改许可状态
				getpage();
			}

			(function() {
				var downloadBotton = document.createElement("div");
				document.body.appendChild(downloadBotton);
				$(downloadBotton).text("下载相似图片");
				$(downloadBotton).attr("title", "下载相似图片,即 把这个作品加入收藏的用户也同时加了以下的作品...");
				downloadBotton.style.cssText = "background: #00A514;border-radius: 3px;color: #fff;text-align: center;padding: 10px 5px;position: fixed;top: 285px;right: 0;z-index: 9999;cursor: pointer;";
				downloadBotton.addEventListener("click", function() {
					wantNum = parseInt(window.prompt("你想要获取多少张相似图片？请输入数字，最大" + maxNum, "100"));
					if (isNaN(wantNum)) {
						alert("输入有误！");
						return false;
					} else if (wantNum > maxNum) {
						alert("你输入的数字超过了最大值" + maxNum);
						return false;
					}
					startGet();
				}, false);
			})();

			// 相似图片的列表没有标识出多图，所以多图看起来和单图一样。实际上还是会有的
			(function() {
				var clearMultiple = document.createElement("div");
				clearMultiple.id = "clearMultiple";
				document.body.appendChild(clearMultiple);
				$(clearMultiple).text("排除多图作品");
				$(clearMultiple).attr("title", "如不需要多图作品可以清除掉。")
				clearMultiple.style.cssText = "background: #DA7002;border-radius: 3px;color: #fff;text-align: center;padding: 10px 5px;position: fixed;top: 335px;right: 0;z-index: 9999;cursor: pointer;";
				clearMultiple.addEventListener("click", function() {
					if (!not_down_duotu) {
						not_down_duotu = true;
						alert("设置成功，将不会下载多图作品。");
						$("#clearMultiple").text("取消排除多图");
					} else {
						not_down_duotu = false;
						alert("取消成功，不再排除多图作品。");
						$("#clearMultiple").text("排除多图作品");
					}

				}, false);
			})();

			function ajaxfordoc1(url) {
				ajaxDocIsEnd = false;
				allPageUrl.shift();
				$.ajax({
					url: url,
					type: "get",
					async: true,
					cache: false,
					dataType: "text",
					success: function(data) {
						doc1_jq = $(parser.parseFromString(data, "text/html"));
						if (!!doc1_jq.find(".original-image")[0]) { //如果是单图
							imgUrlList.push(doc1_jq.find(".original-image").attr("data-src"));
							output();
						} else if (!!doc1_jq.find(".works_display")[0]) { //单图以外的情况
							if (!!doc1_jq.find(".full-screen._ui-tooltip")[0]) { //如果是动图 DOMParser之后无法解析（找到）canvas标签，不然判断更简单
								imgUrlList.push(doc1_jq.find("#wrapper script").eq(0).text().split("\"src\":\"")[2].split("\",\"mime_type")[0].replace(/\\/g, "")); //DOMParser之后js不会执行，所以无法用p站自己的动图变量来获取动图网址了
								output();
							} else {
								if (!not_down_duotu) { //如果没有设置排除大图，则抓取大图。这个判断的位置和其他的不同，不是在获取列表页的时候判断
									var pNo = parseInt(doc1_jq.find("ul.meta li").eq(1).text().split(" ")[1].split("P")[0]); //P数
									ajaxfordoc2(doc1_jq.find(".works_display a").eq(0).attr("href"), pNo);
								} else {
									console.log("排除的多图：" + url);
								}
							}
						}
						ajaxDocIsEnd = true;
						if (allPageUrl.length > 0) { //如果存在下一个作品，则
							ajaxfordoc1(allPageUrl[0]);
						} else { //没有剩余作品
							ajax1No++;
							if (ajax1No === ajax1Bingfa) { //如果所有请求都执行完毕
								outputUrls(imgUrlList);
								ajax1No = 0; //复位
							}
						}
					},
					statusCode: { //如果发生了错误则跳过该url
						0: function() {
							//ERR_CONNECTION_RESET
							ajaxfordoc1(allPageUrl[0]);
							console.log('请求的url不可访问');
						},
						403: function() {
							//403错误
							ajaxfordoc1(allPageUrl[0]);
							console.log('无权访问请求的ur');
						},
						404: function() {
							//404错误
							ajaxfordoc1(allPageUrl[0]);
							console.log('未找到该页面');
						}
					}
				});
			}

		}
	}
}()