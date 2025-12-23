'use strict';

// NOTE: 这里的函数/方法大多是通过 Alpine 模板属性（x-text / @click / x-html 等）动态调用。
// JetBrains 的静态分析可能会误判为“未使用”，属于正常现象。

// Alpine 全局初始化：包含三个页面组件
// - bookApp: 图书列表（前后端交互：/api/books；纯前端筛选/排序/分页/详情/购物车计数）
// - loginApp: 登录页（纯前端校验和记住账户）
// - uploadApp: 上传页（前后端交互：POST /api/books；纯前端状态提示）
document.addEventListener('alpine:init', () => {
  Alpine.data('bookApp', () => ({
    // 基础状态
    loading: true,
    error: '',
    books: [],
    meta: { list: [], total: 0, page: 1, pages: 1 },
    cart: Number(localStorage.getItem('cartCount') || 0),
    year: new Date().getFullYear(),
    // 纯前端筛选/排序/分页条件
    search: '',
    sortBy: 'relevance',
    page: 1,
    pageSize: 12,
    rating: 'all', // all | gte3 | gte4 | gte4_5
    priceMin: '',
    priceMax: '',

    // 初始化：加载数据
    async init() {
      this.setCart(this.cart);
      await this.loadBooks();
    },

    // 前后端交互：GET /api/books
    async loadBooks() {
      this.loading = true;
      this.error = '';
      try {
        const resp = await fetch('/api/books');
        if (!resp.ok) {
          this.error = '显示加载图书数据失败，请稍后重试。';
          this.meta = { list: [], total: 0, page: 1, pages: 1 };
          return;
        }
        const data = await resp.json();
        const list = Array.isArray(data) ? data : [];
        this.books = list.map((b) => ({
          ...b,
          cover: (b && typeof b.cover === 'string' && b.cover.trim()) ? b.cover : this.generateCover(b.title || '')
        }));
        this.refresh();
      } catch (err) {
        console.error('加载图书失败', err);
        this.error = '显示加载图书数据失败，请稍后重试。';
        this.meta = { list: [], total: 0, page: 1, pages: 1 };
      } finally {
        this.loading = false;
      }
    },

    // 纯前端：过滤+排序
    filtered() {
      let list = [...this.books];
      const keyword = this.search.trim().toLowerCase();
      if (keyword) {
        list = list.filter((b) => {
          const title = (b.title || '').toLowerCase();
          const author = (b.author || '').toLowerCase();
          const desc = (b.description || '').toLowerCase();
          return title.includes(keyword) || author.includes(keyword) || desc.includes(keyword);
        });
      }

      // 价格区间
      list = list.filter((b) => {
        const price = Number(b.price || 0);
        const hasMin = this.priceMin !== '' && !Number.isNaN(Number(this.priceMin));
        const hasMax = this.priceMax !== '' && !Number.isNaN(Number(this.priceMax));
        if (hasMin && price < Number(this.priceMin)) return false;
        if (hasMax && price > Number(this.priceMax)) return false;
        return true;
      });

      // 评分
      list = list.filter((b) => {
        const r = Number(b.rating || 0);
        switch (this.rating) {
          case 'gte3': return r >= 3;
          case 'gte4': return r >= 4;
          case 'gte4_5': return r >= 4.5;
          default: return true;
        }
      });

      // 排序
      list.sort((a, b) => {
        const pa = Number(a.price || 0);
        const pb = Number(b.price || 0);
        const ra = Number(a.rating || 0);
        const rb = Number(b.rating || 0);
        const ta = (a.title || '').toLowerCase();
        const tb = (b.title || '').toLowerCase();
        switch (this.sortBy) {
          case 'priceAsc': return pa - pb;
          case 'priceDesc': return pb - pa;
          case 'ratingDesc': return rb - ra;
          case 'titleAsc': return ta.localeCompare(tb, 'zh-Hans-CN');
          default: return 0;
        }
      });

      return list;
    },

    // 纯前端：分页
    refresh() {
      const list = this.filtered();
      const pages = Math.max(1, Math.ceil(list.length / this.pageSize));
      const page = Math.min(Math.max(1, this.page), pages);
      const start = (page - 1) * this.pageSize;
      this.meta = {
        list: list.slice(start, start + this.pageSize),
        total: list.length,
        page,
        pages
      };
      this.page = page;
    },

    // 纯前端：购物车计数
    setCart(n) {
      this.cart = Math.max(0, n | 0);
      localStorage.setItem('cartCount', String(this.cart));
    },
    addToCart() { this.setCart(this.cart + 1); },

    // 纯前端：交互入口
    applySearch() { this.page = 1; this.refresh(); },
    changeSort(v) { this.sortBy = v || 'relevance'; this.page = 1; this.refresh(); },
    changePageSize(v) { const n = Number(v); if (!Number.isNaN(n) && n > 0) { this.pageSize = n; this.page = 1; this.refresh(); } },
    setRating(v) { this.rating = v; this.page = 1; this.refresh(); },
    applyPriceRange() {
      const min = this.priceMin === '' ? '' : Number(this.priceMin);
      const max = this.priceMax === '' ? '' : Number(this.priceMax);
      this.priceMin = Number.isFinite(min) ? min : '';
      this.priceMax = Number.isFinite(max) ? max : '';
      this.page = 1;
      this.refresh();
    },
    go(page) { this.page = page; this.refresh(); },

    // 纯前端：展示辅助
    star(r) {
      let rating = Number(r);
      if (!Number.isFinite(rating)) rating = 0;
      rating = Math.max(0, Math.min(5, rating));
      const full = Math.floor(rating);
      const hasHalf = rating - full >= 0.5 ? 1 : 0;
      const empty = Math.max(0, 5 - full - hasHalf);
      return '★'.repeat(full) + (hasHalf ? '☆' : '') + '☆'.repeat(empty);
    },
    price(n) { return '¥' + Number(n || 0).toFixed(2); },
    generateCover(title) {
      const shortTitle = (title || '未知').slice(0, 16);
      const colors = ['1e88e5', '8e24aa', 'e53935', 'fb8c00', '00897b', '3949ab'];
      const bg = colors[Math.abs(shortTitle.length) % colors.length];
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 560">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#${bg}" stop-opacity="0.9"/>
              <stop offset="100%" stop-color="#0a0f1f" stop-opacity="1"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" rx="24" fill="url(#g)"/>
          <g fill="white" fill-opacity="0.1">
            <circle cx="60" cy="80" r="50"/>
            <circle cx="360" cy="520" r="40"/>
            <rect x="280" y="40" width="80" height="20" rx="10"/>
            <rect x="40" y="480" width="120" height="18" rx="9"/>
          </g>
          <text x="28" y="300" font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" font-size="36" fill="white">${shortTitle}</text>
          <text x="28" y="340" font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" font-size="18" fill="white" fill-opacity="0.7">BookStore</text>
        </svg>
      `;
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.trim());
    },

    // 纯前端：详情弹层
    showDetail: false,
    detailBook: null,
    openDetail(book) {
      if (!book) return; // 防止传入空对象
      this.detailBook = book;
      this.showDetail = true;
      // 使用dialog元素的原生API
      const dialog = document.getElementById('detailDialog');
      if (dialog) {
        dialog.showModal();
        // 添加ESC键关闭支持
        dialog.addEventListener('cancel', (e) => {
          this.closeDetail();
        });
      }
    },
    closeDetail() {
      this.showDetail = false;
      // 关闭dialog
      const dialog = document.getElementById('detailDialog');
      if (dialog) {
        dialog.close();
      }
    },

    // 编辑图书
    editBook(book) {
      if (!book || !book.id) return;
      window.location.href = `/edit/${book.id}`;
    },

    // 删除图书
    async deleteBook(book) {
      if (!book || !book.id) return;

      // 确认删除
      const confirmed = confirm(`确定要删除图书"${book.title || '未命名'}"吗？此操作不可恢复。`);
      if (!confirmed) return;

      try {
        const resp = await fetch(`/api/books/${book.id}`, { method: 'DELETE' });
        if (!resp.ok) {
          alert('删除失败，请稍后重试。');
          return;
        }

        // 删除成功，关闭弹窗并重新加载数据
        this.closeDetail();
        alert('删除成功！');
        await this.loadBooks();
      } catch (err) {
        console.error('删除图书失败', err);
        alert('删除异常，请稍后重试。');
      }
    }
  }));

  Alpine.data('loginApp', () => ({
    account: '',
    password: '',
    remember: false,
    showPwd: false,
    msg: '',
    errors: { account: '', password: '' },
    year: new Date().getFullYear(),

    init() {
      try {
        const saved = localStorage.getItem('rememberAccount');
        if (saved) { this.account = saved; this.remember = true; }
      } catch (_) {}
    },

    togglePwd() { this.showPwd = !this.showPwd; },

    validate() {
      let ok = true;
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.account.trim());
      const isUser = /^[A-Za-z0-9_.-]{3,}$/.test(this.account.trim());
      if (!this.account.trim()) { this.errors.account = '请输入邮箱或用户名'; ok = false; }
      else if (!(isEmail || isUser)) { this.errors.account = '格式不正确：请输入有效邮箱或不少于3位的用户名'; ok = false; }
      else this.errors.account = '';

      if (!this.password) { this.errors.password = '请输入密码'; ok = false; }
      else if (this.password.length < 6) { this.errors.password = '密码长度不少于 6 位'; ok = false; }
      else this.errors.password = '';
      return ok;
    },

    submit() {
      this.msg = '';
      if (!this.validate()) return;
      try {
        if (this.remember) localStorage.setItem('rememberAccount', this.account.trim());
        else localStorage.removeItem('rememberAccount');
      } catch (_) {}
      this.msg = '登录成功，正在跳转…';
      setTimeout(() => { window.location.href = '/'; }, 600);
    }
  }));

  Alpine.data('uploadApp', () => ({
    status: '',
    submitting: false,

    async submit(e) {
      e.preventDefault();
      if (this.submitting) return;
      this.submitting = true;
      this.status = '正在提交...';
      const form = e.target;
      const fd = new FormData(form);
      try {
        const resp = await fetch('/api/books', { method: 'POST', body: fd });
        if (!resp.ok) { this.status = '提交失败 (' + resp.status + ')'; return; }
        const data = await resp.json();
        this.status = '上传成功，ID=' + (data && data.id ? data.id : '未知') + '。刷新首页即可查看。';
        form.reset();
      } catch (err) {
        console.error(err);
        this.status = '提交异常，请稍后再试。';
      } finally {
        this.submitting = false;
      }
    }
  }));

  Alpine.data('editApp', () => ({
    loading: true,
    error: '',
    status: '',
    submitting: false,
    bookId: null,
    book: {
      title: '',
      author: '',
      category: '',
      price: '',
      originalPrice: '',
      rating: '',
      keywords: '',
      description: '',
      cover: ''
    },

    async init() {
      // 从URL获取图书ID
      const pathParts = window.location.pathname.split('/');
      this.bookId = pathParts[pathParts.length - 1];

      if (!this.bookId || isNaN(this.bookId)) {
        this.error = '无效的图书ID';
        this.loading = false;
        return;
      }

      await this.loadBook();
    },

    async loadBook() {
      this.loading = true;
      this.error = '';
      try {
        const resp = await fetch('/api/books');
        if (!resp.ok) {
          this.error = '加载图书信息失败';
          return;
        }
        const books = await resp.json();
        const book = books.find(b => b.id == this.bookId);
        if (!book) {
          this.error = '图书不存在';
          return;
        }

        // 填充表单
        this.book = {
          title: book.title || '',
          author: book.author || '',
          category: book.category || '',
          price: book.price || '',
          originalPrice: book.originalPrice || '',
          rating: book.rating || '',
          keywords: Array.isArray(book.keywords) ? book.keywords.join(', ') : '',
          description: book.description || '',
          cover: book.cover || ''
        };
      } catch (err) {
        console.error('加载图书失败', err);
        this.error = '加载图书信息失败';
      } finally {
        this.loading = false;
      }
    },

    async submit(e) {
      e.preventDefault();
      if (this.submitting) return;
      this.submitting = true;
      this.status = '正在保存...';
      const form = e.target;
      const fd = new FormData(form);
      try {
        const resp = await fetch(`/api/books/${this.bookId}`, { method: 'PUT', body: fd });
        if (!resp.ok) {
          this.status = '保存失败 (' + resp.status + ')';
          return;
        }
        const data = await resp.json();
        this.status = '修改成功！';
        // 2秒后返回首页
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } catch (err) {
        console.error(err);
        this.status = '保存异常，请稍后再试。';
      } finally {
        this.submitting = false;
      }
    }
  }));
});
