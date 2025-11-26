'use strict';

// 全局图书数据（由后端接口 /api/books 返回）
let BOOKS = [];

// 小工具：简化 DOM 查询（纯前端展示辅助）
const $ = (sel, root = document) => root.querySelector(sel);

// 页面基础状态：分页、购物车以及筛选/排序/搜索（纯前端展示状态）
const state = {
  page: 1,
  pageSize: 12,
  cart: parseInt(localStorage.getItem('cartCount') || '0', 10),
  // 下面几项都是纯前端筛选/排序条件
  sortBy: 'default', // default | priceAsc | priceDesc | ratingDesc
  filterPrice: 'all', // all | lt30 | 30to50 | gt50
  filterRating: 'all', // all | gte3 | gte4
  search: ''
};

// 【纯前端展示】更新购物车数量，并同步到本地存储
function setCart(n) {
  state.cart = Math.max(0, n | 0);
  const cartCountEl = $('#cartCount');
  if (cartCountEl) {
    cartCountEl.textContent = String(state.cart);
  }
  localStorage.setItem('cartCount', String(state.cart));
}

// 【纯前端展示】格式化价格为人民币
function formatPrice(n) {
  return '¥' + Number(n || 0).toFixed(2);
}

// 【纯前端展示】根据评分生成星级字符串，内部对非法评分做容错
function starRating(r) {
  let rating = Number(r);
  if (!Number.isFinite(rating)) rating = 0;
  rating = Math.max(0, Math.min(5, rating));

  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5 ? 1 : 0;
  const empty = Math.max(0, 5 - full - hasHalf);

  return '★'.repeat(full) + (hasHalf ? '☆' : '') + '☆'.repeat(empty);
}

// 【纯前端展示】对 BOOKS 做筛选 + 搜索 + 排序，返回新的数组
function getFilteredBooks() {
  let list = BOOKS.slice();
  const keyword = state.search.trim().toLowerCase();
  if (keyword) {
    list = list.filter((b) => {
      const title = (b.title || '').toLowerCase();
      const author = (b.author || '').toLowerCase();
      return title.includes(keyword) || author.includes(keyword);
    });
  }

  // 价格筛选（支持自定义）
  list = list.filter((b) => {
    const price = Number(b.price || 0);
    switch (state.filterPrice) {
      case 'lt30':
        return price < 30;
      case '30to50':
        return price >= 30 && price <= 50;
      case 'gt50':
        return price > 50;
      case 'custom': {
        const minOk = typeof state._priceMin === 'number';
        const maxOk = typeof state._priceMax === 'number';
        if (minOk && maxOk) return price >= state._priceMin && price <= state._priceMax;
        if (minOk) return price >= state._priceMin;
        if (maxOk) return price <= state._priceMax;
        return true;
      }
      default:
        return true;
    }
  });

  // 星级筛选
  list = list.filter((b) => {
    const rating = Number(b.rating || 0);
    switch (state.filterRating) {
      case 'gte3':
        return rating >= 3;
      case 'gte4':
        return rating >= 4;
      case 'gte4_5':
        return rating >= 4.5;
      default:
        return true;
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

    switch (state.sortBy) {
      case 'priceAsc':
        return pa - pb;
      case 'priceDesc':
        return pb - pa;
      case 'ratingDesc':
        return rb - ra;
      case 'titleAsc':
        return ta.localeCompare(tb, 'zh-Hans-CN');
      default:
        return 0;
    }
  });

  return list;
}

// 【纯前端展示】对传入数组做简单分页，返回当前页数据及分页信息
function paginate(list) {
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / state.pageSize));
  const page = Math.min(Math.max(1, state.page), pages);
  const start = (page - 1) * state.pageSize;
  const end = start + state.pageSize;
  return { page, pages, total, slice: list.slice(start, end) };
}

// 【纯前端展示】渲染书籍网格列表
function renderGrid(list) {
  const ul = $('#bookGrid');
  if (!ul) return;

  ul.innerHTML = '';

  if (!list.length) {
    const empty = document.createElement('div');
    empty.className = 'result-meta';
    empty.textContent = '暂无图书数据。';
    ul.appendChild(empty);
    return;
  }

  list.forEach((b) => {
    const title = b.title || '未命名图书';
    const author = b.author || '';
    const category = b.category || '';
    let authorLine = '未知';
    if (author && category) authorLine = `${author} · ${category}`;
    else if (author) authorLine = author;
    else if (category) authorLine = category;

    const price = (typeof b.price === 'number') ? formatPrice(b.price) : '—';
    const originalPrice = (typeof b.originalPrice === 'number') ? formatPrice(b.originalPrice) : '';

    const ratingVal = (typeof b.rating === 'number') ? b.rating : null;
    const ratingHtml = ratingVal != null ? `${starRating(ratingVal)} <span class="muted">(${ratingVal.toFixed(1)})</span>` : '<span class="muted">暂无评分</span>';

    const li = document.createElement('li');
    li.className = 'card';
    li.innerHTML = `
      <div class="cover-wrap"><img class="cover" src="${b.cover}" alt="${title} 封面"/></div>
      <div class="card-body">
        <h4 class="title">${title}</h4>
        <p class="author">${authorLine}</p>
        <div class="rating" aria-label="评分">${ratingHtml}</div>
        <div class="price"><span>${price}</span> ${originalPrice ? `<s>${originalPrice}</s>` : ''}</div>
      </div>
      <div class="card-actions">
        <button class="btn" data-action="detail">详情</button>
        <button class="btn-primary" data-action="add">加入购物车</button>
      </div>
    `;

    // 购物车按钮：仅在前端增加计数
    const addBtn = li.querySelector('[data-action="add"]');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        setCart(state.cart + 1);
      });
    }

    // 打开详情弹窗
    const detailBtn = li.querySelector('[data-action="detail"]');
    if (detailBtn) {
      detailBtn.addEventListener('click', () => openDetail(b));
    }

    ul.appendChild(li);
  });
}

// 【纯前端展示】渲染分页按钮区域
function renderPagination(meta) {
  const nav = $('#pagination');
  if (!nav) return;

  nav.innerHTML = '';
  if (meta.pages <= 1) return;

  const mkBtn = (label, page, disabled = false, current = false) => {
    const b = document.createElement('button');
    b.className = 'page-btn';
    b.textContent = label;
    if (current) b.setAttribute('aria-current', 'page');
    b.disabled = disabled;
    b.addEventListener('click', () => {
      state.page = page;
      update();
    });
    return b;
  };

  nav.appendChild(mkBtn('上一页', Math.max(1, meta.page - 1), meta.page === 1));
  for (let i = 1; i <= meta.pages; i++) {
    nav.appendChild(mkBtn(String(i), i, false, i === meta.page));
  }
  nav.appendChild(
    mkBtn('下一页', Math.min(meta.pages, meta.page + 1), meta.page === meta.pages)
  );
}

// 【纯前端展示】打开图书详情弹窗并填充内容
function openDetail(b) {
  const dlg = $('#detailDialog');
  if (!dlg) return;

  const coverEl = $('#detailCover');
  const titleEl = $('#detailTitle');
  const authorEl = $('#detailAuthor');
  const ratingEl = $('#detailRating');
  const priceEl = $('#detailPrice');
  const originEl = $('#detailOrigin');
  const descEl = $('#detailDesc');

  const title = b.title || '未命名图书';
  const author = b.author || '';
  const category = b.category || '';
  let authorLine = '未知';
  if (author && category) authorLine = `${author} · ${category}`; else if (author) authorLine = author; else if (category) authorLine = category;

  const ratingVal = (typeof b.rating === 'number') ? b.rating : null;
  const ratingHtml = ratingVal != null ? `${starRating(ratingVal)} <span class="muted">(${ratingVal.toFixed(1)})</span>` : '<span class="muted">暂无评分</span>';

  if (coverEl) coverEl.src = b.cover;
  if (titleEl) titleEl.textContent = title;
  if (authorEl) authorEl.textContent = authorLine;
  if (ratingEl) ratingEl.innerHTML = ratingHtml;
  if (priceEl) priceEl.textContent = (typeof b.price === 'number') ? formatPrice(b.price) : '—';
  if (originEl) originEl.textContent = (typeof b.originalPrice === 'number') ? formatPrice(b.originalPrice) : '';
  if (descEl) descEl.textContent = b.desc && b.desc.trim() ? b.desc : '暂无简介。';

  // 重新绑定“加入购物车”按钮，避免重复绑定多次事件
  const addBtn = $('#detailAdd');
  if (addBtn) {
    const newAddBtn = addBtn.cloneNode(true);
    addBtn.replaceWith(newAddBtn);
    newAddBtn.addEventListener('click', () => setCart(state.cart + 1));
  }

  if ('showModal' in dlg) dlg.showModal();
}

// 【纯前端展示】关闭详情弹窗
function closeDetail() {
  const dlg = $('#detailDialog');
  if (dlg && dlg.open) dlg.close();
}

// 【纯前端展示】渲染“共 X 本 · 第 Y/Z 页”元信息
function renderMeta(meta) {
  const metaEl = $('#resultMeta');
  if (!metaEl) return;
  metaEl.textContent = `共 ${meta.total} 本 · 第 ${meta.page}/${meta.pages} 页`;
}

// 【纯前端展示】统一刷新：筛选/搜索/排序 + 分页 + 列表 + 分页条 + 元信息
function update() {
  const filtered = getFilteredBooks();
  const meta = paginate(filtered);
  state.page = meta.page;
  renderGrid(meta.slice);
  renderPagination(meta);
  renderMeta(meta);
}

// 【纯前端展示】绑定页面基础交互控件（购物车按钮、详情弹窗关闭、筛选/排序/搜索等）
function bindControls() {
  const cartBtn = $('#cartBtn');
  if (cartBtn) {
    cartBtn.addEventListener('click', () => {
      alert('演示用：仅计数，无购物车页面。');
    });
  }

  const dialogClose = $('#dialogClose');
  if (dialogClose) dialogClose.addEventListener('click', closeDetail);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetail();
  });

  // 搜索：阻止表单提交刷新 + 实时搜索
  const searchForm = $('#searchForm');
  const searchInput = $('#searchInput');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      state.search = (searchInput && searchInput.value) || '';
      state.page = 1;
      update();
    });
  }
  // 移除实时输入搜索，仅在提交时搜索

  // 排序下拉：#sortSelect（relevance -> default）
  const sortSelect = $('#sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      const v = e.target.value || 'relevance';
      state.sortBy = v === 'relevance' ? 'default' : v;
      state.page = 1;
      update();
    });
  }

  // 每页数量：#pageSize
  const pageSizeSel = $('#pageSize');
  if (pageSizeSel) {
    pageSizeSel.addEventListener('change', (e) => {
      const v = parseInt(e.target.value, 10);
      if (!Number.isNaN(v) && v > 0) {
        state.pageSize = v;
        state.page = 1;
        update();
      }
    });
  }

  // 星级筛选：单选按钮组 name="ratingFilter"（值 0/3/4/4.5）
  const ratingRadios = document.querySelectorAll('input[name="ratingFilter"]');
  if (ratingRadios && ratingRadios.length) {
    ratingRadios.forEach((r) => {
      r.addEventListener('change', (e) => {
        if (e.target.checked) {
          const v = String(e.target.value || '0');
          state.filterRating = v === '3' ? 'gte3' : v === '4' ? 'gte4' : v === '4.5' ? 'gte4_5' : 'all';
          state.page = 1;
          update();
        }
      });
    });
  }

  // 价格区间：#priceMin/#priceMax + #priceApply
  const priceMin = $('#priceMin');
  const priceMax = $('#priceMax');
  const priceApply = $('#priceApply');
  if (priceApply) {
    priceApply.addEventListener('click', () => {
      const rawMin = priceMin ? priceMin.value.trim() : '';
      const rawMax = priceMax ? priceMax.value.trim() : '';
      const minNum = rawMin === '' ? null : Number(rawMin);
      const maxNum = rawMax === '' ? null : Number(rawMax);
      const min = Number.isFinite(minNum) ? minNum : null;
      const max = Number.isFinite(maxNum) ? maxNum : null;
      if (min == null && max == null) {
        state._priceMin = null;
        state._priceMax = null;
        state.filterPrice = 'all';
        state.page = 1;
        update();
        return;
      }
      if (min != null && max != null && min > max) {
        state._priceMin = max;
        state._priceMax = min;
      } else {
        state._priceMin = min;
        state._priceMax = max;
      }
      state.filterPrice = 'custom';
      state.page = 1;
      update();
    });
  }
}

// 【前后端交互】从后端 /api/books 拉取图书数据，并驱动前端渲染
async function loadBooks() {
  try {
    const resp = await fetch('/api/books');
    const data = await resp.json();
    const list = Array.isArray(data) ? data : [];
    BOOKS = list.map((b) => ({
      ...b,
      cover: (b && typeof b.cover === 'string' && b.cover.trim()) ? b.cover : generateCover(b.title || '')
    }));
    update();
  } catch (e) {
    const meta = $('#resultMeta');
    if (meta) meta.textContent = '显示加载图书数据失败，请稍后重试。';
    console.error('加载图书数据失败', e);
  }
}

// 【纯前端展示】生成占位封面（SVG data URL）
function generateCover(title) {
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
      <text x="28" y="300"
            font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
            font-size="36"
            fill="white">${shortTitle}</text>
      <text x="28" y="340"
            font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
            font-size="18"
            fill="white"
            fill-opacity="0.7">BookStore</text>
    </svg>
  `;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.trim());
}

// 初始化：加载图书数据并渲染页面
function init() {
  // 初始化购物车显示
  setCart(state.cart);

  // 页脚年份
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // 从后端加载图书并渲染
  loadBooks();
}

// DOM 加载完成后再绑定事件和初始化
document.addEventListener('DOMContentLoaded', () => {
  // 初始化购物车显示
  setCart(state.cart);
  // 页脚年份
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  // 绑定交互并加载数据
  bindControls();
  loadBooks();
});
