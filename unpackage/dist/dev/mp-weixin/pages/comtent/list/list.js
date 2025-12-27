"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "list",
  setup(__props) {
    const posts = common_vendor.ref([]);
    const loading = common_vendor.ref(false);
    const hasMore = common_vendor.ref(true);
    const currentPage = common_vendor.ref(1);
    const total = common_vendor.ref(0);
    const myUserId = common_vendor.ref("");
    const showOnlyMine = common_vendor.ref(false);
    const keyword = common_vendor.ref("");
    const manualTagInput = common_vendor.ref("");
    const selectedTypeIndex = common_vendor.ref(0);
    const dateRangeIndex = common_vendor.ref(3);
    const types = common_vendor.ref(["全部", "图片", "视频", "文本"]);
    const dateRanges = common_vendor.ref(["最近7天", "最近30天", "近3个月", "全部"]);
    const showFilter = common_vendor.ref(false);
    const showDeleteConfirm = common_vendor.ref(false);
    const currentPostToDelete = common_vendor.ref(null);
    const filteredPosts = common_vendor.computed(() => {
      return posts.value;
    });
    common_vendor.onMounted(() => {
      return common_vendor.__awaiter(this, void 0, void 0, function* () {
        const token = common_vendor.index.getStorageSync("uni_id_token");
        const rawStorage = common_vendor.index.getStorageSync("user_info");
        const user_info = (rawStorage === null || rawStorage === void 0 ? null : rawStorage.userInfo) || rawStorage || new UTSJSONObject({});
        common_vendor.index.__f__("log", "at pages/comtent/list/list.uvue:161", "【List 页面】token 存在?", !!token);
        common_vendor.index.__f__("log", "at pages/comtent/list/list.uvue:162", "【List 页面】user_info:", user_info);
        common_vendor.index.__f__("log", "at pages/comtent/list/list.uvue:163", "【List 页面】user_info._id:", user_info === null || user_info === void 0 ? null : user_info._id);
        if (user_info === null || user_info === void 0 ? null : user_info._id) {
          myUserId.value = user_info._id;
        } else {
          common_vendor.index.__f__("warn", "at pages/comtent/list/list.uvue:167", "⚠️ 未获取到用户 ID");
        }
        yield fetchPosts(true);
      });
    });
    function fetchPosts(reset = true) {
      var _a;
      return common_vendor.__awaiter(this, void 0, void 0, function* () {
        if (!hasMore.value && !reset)
          return Promise.resolve(null);
        if (loading.value)
          return Promise.resolve(null);
        loading.value = true;
        if (reset) {
          currentPage.value = 1;
          posts.value = [];
        } else {
          currentPage.value++;
        }
        try {
          let tagsArray = [];
          if (manualTagInput.value.trim()) {
            tagsArray = manualTagInput.value.split(",").map((t) => {
              return t.trim();
            }).filter((t) => {
              return t !== "";
            });
          }
          const params = new UTSJSONObject(
            {
              page: currentPage.value,
              page_size: 10,
              keyword: keyword.value.trim(),
              content_type: "",
              tags: tagsArray,
              start_date: "",
              end_date: ""
            }
            // 类型
          );
          if (selectedTypeIndex.value > 0) {
            const typeMap = new UTSJSONObject({ "图片": "image", "视频": "video", "文本": "text" });
            params.content_type = typeMap[types.value[selectedTypeIndex.value]] || "";
          }
          const now = /* @__PURE__ */ new Date();
          let startDate = null;
          let endDate = null;
          if (dateRangeIndex.value === 0) {
            startDate = new Date(now.getTime() - 7 * 24 * 3600 * 1e3);
            endDate = now;
          } else if (dateRangeIndex.value === 1) {
            startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1e3);
            endDate = now;
          } else if (dateRangeIndex.value === 2) {
            startDate = new Date(now.getTime() - 90 * 24 * 3600 * 1e3);
            endDate = now;
          }
          if (startDate) {
            params.start_date = formatDateISO(startDate);
          }
          if (endDate) {
            params.end_date = formatDateISO(endDate);
          }
          if (showOnlyMine.value && myUserId.value) {
            params.user_id = myUserId.value;
          }
          common_vendor.index.__f__("log", "at pages/comtent/list/list.uvue:240", "【发送给后端的参数】", params);
          const res = yield common_vendor.er.callFunction({
            name: "content-api",
            data: new UTSJSONObject(Object.assign({ action: "get" }, params))
          });
          common_vendor.index.__f__("log", "at pages/comtent/list/list.uvue:250", "【后端原始返回】:", res.result);
          const _b = res.result, code = _b.code, data = _b.data;
          if (code === 200) {
            const list = ((data === null || data === void 0 ? null : data.list) || []).map((item = null) => {
              var _a2, _b2, _c, _d, _g, _h;
              return new UTSJSONObject({
                id: item._id,
                title: item.title || "无标题",
                description: item.text_content || "",
                author: ((_a2 = item.user_info) === null || _a2 === void 0 ? null : _a2.nickname) || "匿名",
                createdAt: formatDate(item.created_at),
                type: item.content_type || "text",
                mediaUrl: ((_c = (_b2 = item.media_files) === null || _b2 === void 0 ? null : _b2[0]) === null || _c === void 0 ? null : _c.url) || "",
                views: ((_d = item.stats) === null || _d === void 0 ? null : _d.view_count) || 0,
                likes: ((_g = item.stats) === null || _g === void 0 ? null : _g.like_count) || 0,
                comments: ((_h = item.stats) === null || _h === void 0 ? null : _h.comment_count) || 0,
                tags: item.tags || [],
                isMine: item.user_id === myUserId.value,
                avatarUrl: item.avatar || "https://picsum.photos/100/100?random=" + Math.floor(Math.random() * 100)
              });
            });
            if (reset) {
              posts.value = list;
            } else {
              posts.value.push(...list);
            }
            total.value = ((_a = data === null || data === void 0 ? null : data.pagination) === null || _a === void 0 ? null : _a.total) || 0;
            hasMore.value = posts.value.length < total.value;
          } else {
            common_vendor.index.showToast({ title: res.result.message || "加载失败", icon: "none" });
          }
        } catch (err) {
          common_vendor.index.__f__("error", "at pages/comtent/list/list.uvue:282", "[获取内容列表失败]", err);
          common_vendor.index.showToast({ title: "网络错误，请重试", icon: "none" });
        } finally {
          loading.value = false;
        }
      });
    }
    function formatDate(dateStr = null) {
      if (!dateStr)
        return "";
      const d = new Date(dateStr);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
    function formatDateISO(date = null) {
      return date.toISOString().split("T")[0];
    }
    function onSearch() {
      fetchPosts(true);
    }
    function showFilterModal() {
      showFilter.value = true;
    }
    function closeFilter() {
      showFilter.value = false;
    }
    function applyFilters() {
      closeFilter();
      fetchPosts(true);
    }
    function onTypeChange(e = null) {
      selectedTypeIndex.value = e.detail.value;
    }
    function onDateRangeChange(e = null) {
      dateRangeIndex.value = parseInt(e.detail.value);
      common_vendor.index.__f__("log", "at pages/comtent/list/list.uvue:328", "【日期索引已更新为】", dateRangeIndex.value, typeof dateRangeIndex.value);
    }
    function toggleSelfOnly() {
      showOnlyMine.value = !showOnlyMine.value;
      fetchPosts(true);
    }
    function isMyPost(post = null) {
      return post.isMine;
    }
    function editPost(post = null) {
      common_vendor.index.navigateTo({
        url: `/pages/content/edit/edit?id=${post.id}`
      });
    }
    function confirmDelete(post = null) {
      currentPostToDelete.value = post;
      showDeleteConfirm.value = true;
    }
    function deletePost() {
      return common_vendor.__awaiter(this, void 0, void 0, function* () {
        const post = currentPostToDelete.value;
        if (!post)
          return Promise.resolve(null);
        try {
          common_vendor.index.showLoading({ title: "删除中..." });
          const res = yield common_vendor.er.callFunction({
            name: "content-api",
            data: new UTSJSONObject({
              action: "delete",
              content_id: post.id
            })
          });
          if (res.result.code === 200) {
            common_vendor.index.showToast({ title: "删除成功", icon: "success" });
            fetchPosts(true);
          } else {
            common_vendor.index.showToast({ title: res.result.message || "删除失败", icon: "none" });
          }
        } catch (err) {
          common_vendor.index.__f__("error", "at pages/comtent/list/list.uvue:372", "[删除失败]", err);
          common_vendor.index.showToast({ title: "删除失败", icon: "none" });
        } finally {
          common_vendor.index.hideLoading();
          cancelDelete();
        }
      });
    }
    function cancelDelete() {
      showDeleteConfirm.value = false;
      currentPostToDelete.value = null;
    }
    function onScrollToLower() {
      if (hasMore.value && !loading.value) {
        fetchPosts(false);
      }
    }
    return (_ctx, _cache) => {
      "raw js";
      const __returned__ = common_vendor.e({
        a: common_vendor.o(onSearch),
        b: keyword.value,
        c: common_vendor.o(($event) => {
          return keyword.value = $event.detail.value;
        }),
        d: common_vendor.o(showFilterModal),
        e: showFilter.value
      }, showFilter.value ? {
        f: common_vendor.o(applyFilters),
        g: manualTagInput.value,
        h: common_vendor.o(($event) => {
          return manualTagInput.value = $event.detail.value;
        }),
        i: common_vendor.t(types.value[selectedTypeIndex.value]),
        j: common_vendor.o(onTypeChange),
        k: selectedTypeIndex.value,
        l: types.value,
        m: common_vendor.t(dateRanges.value[dateRangeIndex.value]),
        n: common_vendor.o(onDateRangeChange),
        o: dateRangeIndex.value,
        p: dateRanges.value,
        q: common_vendor.o(applyFilters),
        r: common_vendor.o(closeFilter)
      } : {}, {
        s: common_vendor.t(showOnlyMine.value ? "取消仅看自己" : "仅看自己"),
        t: common_vendor.o(toggleSelfOnly),
        v: showOnlyMine.value ? 1 : "",
        w: common_vendor.f(filteredPosts.value, (item, index, i0) => {
          return common_vendor.e({
            a: item.avatarUrl,
            b: common_vendor.t(item.author),
            c: common_vendor.t(item.title),
            d: common_vendor.t(item.createdAt),
            e: item.description
          }, item.description ? {
            f: common_vendor.t(item.description)
          } : {}, {
            g: item.type === "image" || item.type === "video"
          }, item.type === "image" || item.type === "video" ? common_vendor.e({
            h: item.type === "image"
          }, item.type === "image" ? {
            i: item.mediaUrl
          } : item.type === "video" ? {
            k: item.mediaUrl
          } : {}, {
            j: item.type === "video"
          }) : {}, {
            l: common_vendor.t(item.views),
            m: common_vendor.t(item.likes),
            n: common_vendor.t(item.comments),
            o: isMyPost(item)
          }, isMyPost(item) ? {
            p: common_vendor.o(($event) => {
              return editPost(item);
            }, item.id),
            q: common_vendor.o(($event) => {
              return confirmDelete(item);
            }, item.id)
          } : {}, {
            r: "/pages/comtent/detail/detail?id=" + item.id,
            s: item.id
          });
        }),
        x: loading.value && posts.value.length > 0
      }, loading.value && posts.value.length > 0 ? {} : !hasMore.value && posts.value.length > 0 ? {} : posts.value.length === 0 && !loading.value ? {} : {}, {
        y: !hasMore.value && posts.value.length > 0,
        z: posts.value.length === 0 && !loading.value,
        A: common_vendor.o(onScrollToLower),
        B: showDeleteConfirm.value
      }, showDeleteConfirm.value ? {
        C: common_vendor.o(deletePost),
        D: common_vendor.o(cancelDelete)
      } : {}, {
        E: common_vendor.sei(common_vendor.gei(_ctx, ""), "view")
      });
      return __returned__;
    };
  }
});
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-befedf22"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../../.sourcemap/mp-weixin/pages/comtent/list/list.js.map
