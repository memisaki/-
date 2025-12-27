"use strict";
const common_vendor = require("../../../common/vendor.js");
const pageSize = 10;
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "detail",
  setup(__props) {
    const contentId = common_vendor.ref("");
    const post = common_vendor.ref(new UTSJSONObject({
      title: "",
      description: "",
      mediaUrl: "",
      type: "text",
      author: "",
      avatarUrl: "https://picsum.photos/100/100?random=1",
      createdAt: "",
      user_id: ""
      // 注意：这是帖子作者的 uid
    }));
    const comments = common_vendor.ref([]);
    const loadingComments = common_vendor.ref(false);
    const hasMoreComments = common_vendor.ref(true);
    const currentPage = common_vendor.ref(1);
    const ratingData = common_vendor.ref(new UTSJSONObject({
      average_rating: 0,
      rating_count: 0,
      rating_distribution: new UTSJSONObject({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }),
      user_rating: null,
      comment_count: 0
    }));
    const newComment = common_vendor.ref(new UTSJSONObject({ content: "", rating: "" }));
    const submitting = common_vendor.ref(false);
    const showDeleteConfirm = common_vendor.ref(false);
    const commentToDelete = common_vendor.ref(null);
    const myUserId = common_vendor.ref("");
    const userToken = common_vendor.ref("");
    common_vendor.onLoad((query = null) => {
      return common_vendor.__awaiter(this, void 0, void 0, function* () {
        var _a;
        common_vendor.index.__f__("log", "at pages/comtent/detail/detail.uvue:150", "【Detail 页面接收到的路由参数（onLoad）】", query);
        const id = (_a = query === null || query === void 0 ? null : query.id) === null || _a === void 0 ? null : _a.trim();
        if (!id || id === "undefined" || id === "null") {
          common_vendor.index.showToast({ title: "无效内容ID", icon: "none" });
          setTimeout(() => {
            return common_vendor.index.navigateBack();
          }, 1500);
          return Promise.resolve(null);
        }
        contentId.value = id;
        const token = common_vendor.index.getStorageSync("uni_id_token");
        userToken.value = token;
        if (!token) {
          common_vendor.index.showToast({ title: "请先登录", icon: "none" });
          setTimeout(() => {
            return common_vendor.index.redirectTo({ url: "/pages/user/login/login" });
          }, 1500);
          return Promise.resolve(null);
        }
        const rawStorage = common_vendor.index.getStorageSync("user_info");
        const userInfo = (rawStorage === null || rawStorage === void 0 ? null : rawStorage.userInfo) || rawStorage || new UTSJSONObject({});
        common_vendor.index.__f__("log", "at pages/comtent/detail/detail.uvue:173", "【Detail 页面】userInfo:", userInfo);
        common_vendor.index.__f__("log", "at pages/comtent/detail/detail.uvue:174", "【Detail 页面】userInfo._id:", userInfo === null || userInfo === void 0 ? null : userInfo._id);
        if (userInfo === null || userInfo === void 0 ? null : userInfo._id) {
          myUserId.value = userInfo._id;
        } else {
          common_vendor.index.__f__("warn", "at pages/comtent/detail/detail.uvue:179", "未找到 userInfo._id，可能影响评论功能");
        }
        yield loadPostDetail();
        yield loadRating();
        yield loadComments(true);
      });
    });
    function loadPostDetail() {
      var _a, _b, _c;
      return common_vendor.__awaiter(this, void 0, void 0, function* () {
        try {
          const res = yield common_vendor.er.callFunction({
            name: "content-api",
            data: new UTSJSONObject({ action: "get", content_id: contentId.value }),
            env: "cloud"
            // ✅
          });
          if (((_a = res.result) === null || _a === void 0 ? null : _a.code) === 200) {
            const item = res.result.data;
            post.value = {
              title: item.title || "",
              description: item.text_content || "",
              mediaUrl: ((_c = (_b = item.media_files) === null || _b === void 0 ? null : _b[0]) === null || _c === void 0 ? null : _c.url) || "",
              type: item.content_type || "text",
              author: item.author || "匿名",
              avatarUrl: item.avatar || "https://picsum.photos/100/100?random=1",
              createdAt: formatDate(item.created_at),
              user_id: item.user_id
              // 帖子作者 uid
            };
          } else {
            common_vendor.index.showToast({ title: "内容不存在", icon: "none" });
            setTimeout(() => {
              return common_vendor.index.navigateBack();
            }, 1500);
          }
        } catch (err) {
          common_vendor.index.__f__("error", "at pages/comtent/detail/detail.uvue:213", "加载帖子失败", err);
          common_vendor.index.showToast({ title: "加载失败", icon: "none" });
        }
      });
    }
    function loadRating() {
      var _a;
      return common_vendor.__awaiter(this, void 0, void 0, function* () {
        try {
          const res = yield common_vendor.er.callFunction({
            name: "comment-api",
            data: new UTSJSONObject({
              action: "get-content-rating",
              contentId: contentId.value,
              token: userToken.value
            })
          });
          if (((_a = res.result) === null || _a === void 0 ? null : _a.code) === 200) {
            const data = res.result.data;
            ratingData.value = {
              average_rating: data.average_rating || 0,
              rating_count: data.rating_count || 0,
              rating_distribution: data.rating_distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
              comment_count: data.comment_count || 0,
              user_rating: data.user_rating ? data.user_rating.rating : null
              // ✅ 只取 rating 字段
            };
          }
        } catch (err) {
          common_vendor.index.__f__("error", "at pages/comtent/detail/detail.uvue:240", "加载评分失败", err);
        }
      });
    }
    function loadComments(reset = false) {
      var _a;
      return common_vendor.__awaiter(this, void 0, void 0, function* () {
        if (!hasMoreComments.value && !reset)
          return Promise.resolve(null);
        if (loadingComments.value)
          return Promise.resolve(null);
        loadingComments.value = true;
        if (reset) {
          currentPage.value = 1;
          comments.value = [];
        } else {
          currentPage.value++;
        }
        try {
          const res = yield common_vendor.er.callFunction({
            name: "comment-api",
            data: new UTSJSONObject({
              action: "list-comments",
              contentId: contentId.value,
              page: currentPage.value,
              pageSize,
              token: userToken.value
            })
          });
          if (((_a = res.result) === null || _a === void 0 ? null : _a.code) === 200) {
            const list = (res.result.data.comments || []).map((c = null) => {
              var _a2, _b;
              return new UTSJSONObject(Object.assign(Object.assign({}, c), { author: ((_a2 = c.user_info) === null || _a2 === void 0 ? null : _a2.nickname) || ((_b = c.user_info) === null || _b === void 0 ? null : _b.username) || "匿名", createdAt: formatDate(c.created_at) }));
            });
            if (reset) {
              comments.value = list;
              common_vendor.index.__f__("log", "at pages/comtent/detail/detail.uvue:278", "【赋值给 comments】:", list);
            } else {
              comments.value.push(...list);
            }
            hasMoreComments.value = res.result.data.hasMore;
          }
        } catch (err) {
          common_vendor.index.__f__("error", "at pages/comtent/detail/detail.uvue:285", "加载评论失败", err);
          common_vendor.index.showToast({ title: "评论加载失败", icon: "none" });
        } finally {
          loadingComments.value = false;
        }
      });
    }
    function submitComment() {
      var _a, _b;
      return common_vendor.__awaiter(this, void 0, void 0, function* () {
        const token = common_vendor.index.getStorageSync("uni_id_token");
        if (!token) {
          common_vendor.index.showToast({ title: "请先登录", icon: "none" });
          setTimeout(() => {
            return common_vendor.index.redirectTo({ url: "/pages/user/login/login" });
          }, 1500);
          return Promise.resolve(null);
        }
        if (!newComment.value.content.trim()) {
          common_vendor.index.showToast({ title: "请输入评论内容", icon: "none" });
          return Promise.resolve(null);
        }
        submitting.value = true;
        try {
          const rating = newComment.value.rating ? parseInt(newComment.value.rating) : null;
          const res = yield common_vendor.er.callFunction({
            name: "comment-api",
            data: new UTSJSONObject({
              action: "add-comment",
              contentId: contentId.value,
              commentContent: newComment.value.content.trim(),
              rating,
              token: userToken.value
            })
          });
          if (((_a = res.result) === null || _a === void 0 ? null : _a.code) === 200) {
            common_vendor.index.showToast({ title: "评论成功", icon: "success" });
            newComment.value = { content: "", rating: "" };
            yield loadRating();
            yield loadComments(true);
          } else {
            common_vendor.index.showToast({ title: ((_b = res.result) === null || _b === void 0 ? null : _b.message) || "评论失败", icon: "none" });
          }
        } catch (err) {
          common_vendor.index.__f__("error", "at pages/comtent/detail/detail.uvue:332", "提交评论失败", err);
          common_vendor.index.showToast({ title: "网络错误", icon: "none" });
        } finally {
          submitting.value = false;
        }
      });
    }
    function goBack() {
      common_vendor.index.navigateBack();
    }
    function onRatingChange(e = null) {
      newComment.value.rating = e.detail.value;
    }
    function deleteComment(comment = null) {
      commentToDelete.value = comment;
      showDeleteConfirm.value = true;
    }
    function confirmDelete() {
      var _a, _b;
      return common_vendor.__awaiter(this, void 0, void 0, function* () {
        const comment = commentToDelete.value;
        if (!comment)
          return Promise.resolve(null);
        try {
          const res = yield common_vendor.er.callFunction({
            name: "comment-api",
            data: new UTSJSONObject({
              action: "delete-comment",
              commentId: comment._id,
              token: userToken.value
            })
          });
          if (((_a = res.result) === null || _a === void 0 ? null : _a.code) === 200) {
            common_vendor.index.showToast({ title: "删除成功", icon: "success" });
            yield loadRating();
            yield loadComments(true);
          } else {
            common_vendor.index.showToast({ title: ((_b = res.result) === null || _b === void 0 ? null : _b.message) || "删除失败", icon: "none" });
          }
        } catch (err) {
          common_vendor.index.__f__("error", "at pages/comtent/detail/detail.uvue:373", "删除失败", err);
          common_vendor.index.showToast({ title: "删除失败", icon: "none" });
        } finally {
          showDeleteConfirm.value = false;
          commentToDelete.value = null;
        }
      });
    }
    function formatDate(timestamp = null) {
      if (!timestamp)
        return "";
      const d = new Date(timestamp);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
    function isMyComment(comment = null) {
      return comment.user_id === myUserId.value;
    }
    return (_ctx, _cache) => {
      "raw js";
      const __returned__ = common_vendor.e({
        a: common_vendor.o(goBack),
        b: common_vendor.t(post.value.title || "无标题"),
        c: post.value.avatarUrl,
        d: common_vendor.t(post.value.author || "匿名"),
        e: common_vendor.t(post.value.createdAt),
        f: post.value.description
      }, post.value.description ? {
        g: common_vendor.t(post.value.description)
      } : {}, {
        h: post.value.mediaUrl
      }, post.value.mediaUrl ? common_vendor.e({
        i: post.value.type === "image"
      }, post.value.type === "image" ? {
        j: post.value.mediaUrl
      } : post.value.type === "video" ? {
        l: post.value.mediaUrl
      } : {}, {
        k: post.value.type === "video"
      }) : {}, {
        m: common_vendor.t(ratingData.value.average_rating.toFixed(1)),
        n: common_vendor.t(ratingData.value.rating_count),
        o: common_vendor.f([5, 4, 3, 2, 1], (star, k0, i0) => {
          return {
            a: common_vendor.t(star),
            b: ratingData.value.rating_distribution[star] / (ratingData.value.rating_count || 1) * 100,
            c: common_vendor.t(ratingData.value.rating_distribution[star]),
            d: star
          };
        }),
        p: ratingData.value.user_rating !== null
      }, ratingData.value.user_rating !== null ? {
        q: common_vendor.t(ratingData.value.user_rating)
      } : {}, {
        r: newComment.value.content,
        s: common_vendor.o(($event) => {
          return newComment.value.content = $event.detail.value;
        }),
        t: common_vendor.f([1, 2, 3, 4, 5], (r, k0, i0) => {
          return {
            a: r.toString(),
            b: common_vendor.t(r),
            c: r
          };
        }),
        v: newComment.value.rating,
        w: common_vendor.o(onRatingChange),
        x: common_vendor.t(submitting.value ? "提交中..." : "发表评论"),
        y: common_vendor.o(submitComment),
        z: submitting.value,
        A: common_vendor.t(ratingData.value.comment_count),
        B: common_vendor.f(comments.value, (comment, k0, i0) => {
          return common_vendor.e({
            a: common_vendor.t(comment.author || "匿名"),
            b: comment.rating
          }, comment.rating ? {
            c: common_vendor.t(comment.rating)
          } : {}, {
            d: common_vendor.t(comment.createdAt),
            e: common_vendor.t(comment.comment_content),
            f: isMyComment(comment)
          }, isMyComment(comment) ? {
            g: common_vendor.o(($event) => {
              return deleteComment(comment);
            }, comment._id)
          } : {}, {
            h: comment._id
          });
        }),
        C: loadingComments.value && comments.value.length === 0
      }, loadingComments.value && comments.value.length === 0 ? {} : !hasMoreComments.value && comments.value.length > 0 ? {} : comments.value.length === 0 && !loadingComments.value ? {} : {}, {
        D: !hasMoreComments.value && comments.value.length > 0,
        E: comments.value.length === 0 && !loadingComments.value,
        F: showDeleteConfirm.value
      }, showDeleteConfirm.value ? {
        G: common_vendor.o(confirmDelete),
        H: common_vendor.o(($event) => {
          return showDeleteConfirm.value = false;
        })
      } : {}, {
        I: common_vendor.sei(common_vendor.gei(_ctx, ""), "view")
      });
      return __returned__;
    };
  }
});
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-1026b34d"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../../.sourcemap/mp-weixin/pages/comtent/detail/detail.js.map
