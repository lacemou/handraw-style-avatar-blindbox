/**
 * 今日职场人设 · 261画风盲盒机 | 核心交互逻辑
 * 技术栈：纯原生 JavaScript (ES6+), 零外部依赖
 */

(function () {
  'use strict';

  // 全局状态管理
  const state = {
    styles: [],
    filteredStyles: [],
    currentIndex: 0,
    currentView: 'avatar', // 'avatar' | 'preview' | 'split'
    isRolling: false,
    rollTimer: null,
    rollStartTime: 0,
    splitPercent: 50,
    activeFilter: 'all',
    searchQuery: '',
  };

  // DOM 元素引用
  const dom = {
    // 视觉视口
    displayWrapper: document.getElementById('display-wrapper'),
    imageView: document.getElementById('image-viewport'),
    splitView: document.getElementById('split-viewport'),
    splitBgImg: document.getElementById('split-bg-img'),
    splitFgImg: document.getElementById('split-fg-img'),
    deckContainer: document.getElementById('deck-container'),
    deckCard: document.getElementById('deck-card'),
    primaryImg: document.getElementById('primary-img'),
    splitFgWrapper: document.getElementById('split-fg-wrapper'),
    splitDivider: document.getElementById('split-divider'),
    rollingCounter: document.getElementById('rolling-counter'),
    btnViewAvatar: document.getElementById('btn-view-avatar'),
    btnViewPreview: document.getElementById('btn-view-preview'),
    btnViewSplit: document.getElementById('btn-view-split'),

    // 信息展示
    styleIdBadge: document.getElementById('style-id-badge'),
    styleGroupBadge: document.getElementById('style-group-badge'),
    styleTitle: document.getElementById('style-title'),
    styleAuthor: document.getElementById('style-author'),
    personaTag: document.getElementById('persona-tag'),
    personaQuote: document.getElementById('persona-quote'),
    personaYi: document.getElementById('persona-yi'),
    personaJi: document.getElementById('persona-ji'),
    personaLuck: document.getElementById('persona-luck'),
    styleTraits: document.getElementById('style-traits'),
    assetStatusBadge: document.getElementById('asset-status-badge'),

    // 控制按钮
    btnRoll: document.getElementById('btn-roll'),
    rollText: document.getElementById('roll-text'),
    btnCopyPrompt: document.getElementById('btn-copy-prompt'),
    btnSharePoster: document.getElementById('btn-share-poster'),

    // 画廊与筛选
    galleryCountText: document.getElementById('gallery-count-text'),
    filterPills: document.getElementById('filter-pills'),
    gallerySearch: document.getElementById('gallery-search'),
    stylesGrid: document.getElementById('styles-grid'),

    // 海报弹窗
    posterModal: document.getElementById('poster-modal'),
    posterCanvas: document.getElementById('poster-canvas'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    btnCloseModal2: document.getElementById('btn-close-modal-2'),
    btnDownloadPoster: document.getElementById('btn-download-poster'),

    // 全局 Toast
    toast: document.getElementById('toast')
  };

  // 初始化应用程序
  async function initApp() {
    try {
      showToast('正在加载 261 种手绘风格资产库...');
      const response = await fetch('data/styles.json');
      if (!response.ok) throw new Error('未能读取数据文件');
      const data = await response.json();

      state.styles = data.styles || [];
      state.filteredStyles = [...state.styles];

      // 更新顶部资产就位状态
      const readyCount = data.avatars_ready || state.styles.length;
      dom.assetStatusBadge.textContent = `${readyCount} 款全量头像已就绪`;

      // 默认随机选择一个已生成头像的风格启动
      const avatarStyles = state.styles.filter(s => s.has_avatar);
      if (avatarStyles.length > 0) {
        const randomStart = avatarStyles[Math.floor(Math.random() * avatarStyles.length)];
        state.currentIndex = state.styles.findIndex(s => s.id === randomStart.id);
      } else {
        state.currentIndex = 0;
      }

      setupEventListeners();
      renderCurrentStyle();
      renderGallery();
      showToast('261种画风资产库加载完毕');
    } catch (err) {
      console.error('Init error:', err);
      showToast('数据加载失败，请检查是否在本地服务器环境运行');
    }
  }

  // 绑定各类交互事件
  function setupEventListeners() {
    // 视图切换
    dom.btnViewAvatar.addEventListener('click', () => setView('avatar'));
    dom.btnViewPreview.addEventListener('click', () => setView('preview'));
    dom.btnViewSplit.addEventListener('click', () => setView('split'));

    // 摇号抽签
    dom.btnRoll.addEventListener('click', handleRollClick);

    // 复制配方
    dom.btnCopyPrompt.addEventListener('click', handleCopyPrompt);

    // 分享海报
    dom.btnSharePoster.addEventListener('click', handleOpenPosterModal);
    dom.btnCloseModal.addEventListener('click', () => dom.posterModal.style.display = 'none');
    dom.btnCloseModal2.addEventListener('click', () => dom.posterModal.style.display = 'none');
    dom.btnDownloadPoster.addEventListener('click', handleDownloadPoster);

    // 拉帘拖拽互动
    setupSplitDrag();

    // 筛选与搜索
    dom.filterPills.addEventListener('click', (e) => {
      const btn = e.target.closest('.pill');
      if (!btn) return;
      dom.filterPills.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      state.activeFilter = btn.dataset.filter;
      applyFilters();
    });

    dom.gallerySearch.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim().toLowerCase();
      applyFilters();
    });
  }

  // 渲染当前选中的风格详情
  function renderCurrentStyle() {
    const item = state.styles[state.currentIndex];
    if (!item) return;

    // 更新编号与标签
    dom.styleIdBadge.textContent = `№ ${item.id}`;
    dom.rollingCounter.textContent = `№ ${item.id}`;
    dom.styleGroupBadge.textContent = item.group.split(' ')[1] || item.group;
    dom.styleTitle.textContent = item.name;
    dom.styleAuthor.textContent = item.author ? `风格参考：${item.author}` : '风格参考：开源手绘风格库';

    // 更新人设签
    if (item.persona) {
      dom.personaTag.textContent = item.persona.tag || '【今日人设签】';
      dom.personaQuote.textContent = `“${item.persona.quote}”`;
      dom.personaYi.textContent = item.persona.yi || '保持专注、顺其自然';
      dom.personaJi.textContent = item.persona.ji || '盲目跟风、过度内耗';
      if (dom.personaLuck) {
        dom.personaLuck.textContent = item.persona.luck || '★★★★★';
      }
    }

    // 更新画风机制
    dom.styleTraits.textContent = item.traits || '该风格具有鲜明的线条、材质与色彩特征，保留头像核心特征的同时大胆迁移画风。';

    // 更新图片展示
    updateImageView();

    // 更新画廊中的高亮卡片
    updateGalleryActiveCard();
  }

  // 切换视口显示模式
  function setView(viewMode) {
    state.currentView = viewMode;

    dom.btnViewAvatar.classList.toggle('active', viewMode === 'avatar');
    dom.btnViewPreview.classList.toggle('active', viewMode === 'preview');
    dom.btnViewSplit.classList.toggle('active', viewMode === 'split');

    if (viewMode === 'split') {
      dom.imageView.style.display = 'none';
      dom.splitView.style.display = 'block';
      updateSplitImages();
    } else {
      dom.imageView.style.display = 'block';
      dom.splitView.style.display = 'none';
      updateImageView();
    }
  }

  function getStyleImgUrl(idx, preferAvatar = true) {
    const item = state.styles[idx];
    if (!item) return '';
    if (preferAvatar && item.has_avatar && item.avatar_url) {
      return item.avatar_url;
    }
    return item.preview_url || '';
  }

  function updateImageView() {
    const item = state.styles[state.currentIndex];
    if (!item) return;

    if (state.currentView === 'avatar') {
      dom.primaryImg.src = getStyleImgUrl(state.currentIndex, true);
    } else if (state.currentView === 'preview') {
      dom.primaryImg.src = getStyleImgUrl(state.currentIndex, false);
    } else if (state.currentView === 'split') {
      updateSplitImages();
    }
  }

  function updateSplitImages() {
    const item = state.styles[state.currentIndex];
    if (!item) return;

    dom.splitBgImg.src = item.preview_url || '';
    dom.splitFgImg.src = item.has_avatar && item.avatar_url ? item.avatar_url : (item.preview_url || '');
    dom.splitFgWrapper.style.clipPath = `inset(0 ${100 - state.splitPercent}% 0 0)`;
    dom.splitDivider.style.left = `${state.splitPercent}%`;
  }

  // 左右拉帘交互
  function setupSplitDrag() {
    let isDragging = false;

    function onMove(clientX) {
      if (!isDragging) return;
      const rect = dom.displayWrapper.getBoundingClientRect();
      let x = clientX - rect.left;
      let percent = (x / rect.width) * 100;
      percent = Math.max(5, Math.min(95, percent));

      state.splitPercent = percent;
      dom.splitFgWrapper.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
      dom.splitDivider.style.left = `${percent}%`;
    }

    dom.splitDivider.addEventListener('mousedown', () => isDragging = true);
    window.addEventListener('mouseup', () => isDragging = false);
    window.addEventListener('mousemove', (e) => onMove(e.clientX));

    // 移动端触摸适配
    dom.splitDivider.addEventListener('touchstart', () => isDragging = true, { passive: true });
    window.addEventListener('touchend', () => isDragging = false);
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) onMove(e.touches[0].clientX);
    }, { passive: true });
  }

  // =========================================================================
  // 方案一：艺术画廊卡牌切牌/洗牌动效系统（零眩晕、无眼球垂直追踪压力、高实体质感）
  // =========================================================================
  const deck = {
    shuffleTimer: null,
    decelTimeouts: [],
    candidates: [],
    lastCardIndex: -1,
  };

  function getRandomCandidate() {
    if (deck.candidates.length === 0) return 0;
    if (deck.candidates.length === 1) return deck.candidates[0];
    let cand;
    do {
      cand = deck.candidates[Math.floor(Math.random() * deck.candidates.length)];
    } while (cand === deck.lastCardIndex && deck.candidates.length > 1);
    deck.lastCardIndex = cand;
    return cand;
  }

  function triggerCardDeal(idx) {
    const item = state.styles[idx];
    if (!item) return;

    // 换图
    dom.primaryImg.src = getStyleImgUrl(idx, true);
    // 更新编号水印与顶部Badge
    dom.rollingCounter.textContent = `№ ${item.id}`;
    dom.styleIdBadge.textContent = `№ ${item.id}`;

    // 触发切牌物理微动效
    dom.deckCard.classList.remove('is-dealing');
    dom.deckCard.classList.remove('is-landing');
    void dom.deckCard.offsetWidth; // 触发回流重置CSS关键帧
    dom.deckCard.classList.add('is-dealing');

    // 手机微触感震动反馈
    if (navigator.vibrate) {
      navigator.vibrate(5);
    }
  }

  function handleRollClick() {
    if (state.isRolling) {
      stopRollingWithDeceleration();
    } else {
      startRolling();
    }
  }

  function startRolling() {
    if (state.isRolling) return;
    state.isRolling = true;

    // 若当前为拉帘对比模式，自动切回头像单图模式以看清切牌动效
    if (state.currentView === 'split') {
      setView('avatar');
    }

    dom.btnRoll.classList.add('is-active');
    dom.rollText.textContent = '停！定格今日人设';
    dom.displayWrapper.classList.add('is-rolling');

    // 候选池：优先抽取已生成头像的编号
    const eligibleIndices = state.styles
      .map((s, idx) => s.has_avatar ? idx : -1)
      .filter(idx => idx !== -1);
    deck.candidates = eligibleIndices.length > 0 ? eligibleIndices : state.styles.map((_, i) => i);
    deck.lastCardIndex = state.currentIndex;

    // 清理可能存在的旧定时器
    clearInterval(deck.shuffleTimer);
    deck.decelTimeouts.forEach(clearTimeout);
    deck.decelTimeouts = [];

    // 高速切牌循环：约 85ms 节奏翻动卡牌
    deck.shuffleTimer = setInterval(() => {
      const nextIdx = getRandomCandidate();
      triggerCardDeal(nextIdx);
    }, 85);
  }

  function stopRollingWithDeceleration() {
    if (!state.isRolling) return;

    // 停止高速切牌循环
    clearInterval(deck.shuffleTimer);
    deck.shuffleTimer = null;

    dom.btnRoll.classList.remove('is-active');
    dom.rollText.textContent = '定格中...';

    // 决定最终抽中的风格
    const winnerIndex = getRandomCandidate();

    // 优雅阻尼减速序列（卡牌翻动间隔逐步拉长，模拟手部减速停牌）
    // 节奏序列：6张牌逐步减速，最后一击平稳弹跳吸附入位
    const delays = [110, 200, 330, 520, 780, 1100];
    deck.decelTimeouts = [];

    delays.forEach((delay, stepIndex) => {
      const isFinal = stepIndex === delays.length - 1;
      const t = setTimeout(() => {
        if (isFinal) {
          // 最终定格卡牌
          state.currentIndex = winnerIndex;
          const winnerItem = state.styles[winnerIndex];

          dom.primaryImg.src = getStyleImgUrl(winnerIndex, true);
          dom.rollingCounter.textContent = `№ ${winnerItem.id}`;
          dom.styleIdBadge.textContent = `№ ${winnerItem.id}`;

          // 触发最终落地回弹动效
          dom.deckCard.classList.remove('is-dealing');
          dom.deckCard.classList.remove('is-landing');
          void dom.deckCard.offsetWidth;
          dom.deckCard.classList.add('is-landing');

          if (navigator.vibrate) {
            navigator.vibrate([15, 40, 25]); // 落地三连轻颤
          }

          // 恢复交互状态并渲染信息面板与人设卡
          state.isRolling = false;
          dom.displayWrapper.classList.remove('is-rolling');
          dom.rollText.textContent = '再摇一次人设';

          renderCurrentStyle();
          showToast(`今日人设已就位：${winnerItem.persona?.tag || ''}`);
        } else {
          // 减速过渡牌
          const interimIdx = getRandomCandidate();
          triggerCardDeal(interimIdx);
        }
      }, delay);

      deck.decelTimeouts.push(t);
    });
  }

  // 复制提示词配方
  function handleCopyPrompt() {
    const item = state.styles[state.currentIndex];
    if (!item) return;

    const recipe = item.prompt_recipe || '';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(recipe).then(() => {
        showToast(`已复制【№ ${item.id}】8步法生图提示词配方！`);
      }).catch(() => fallbackCopy(recipe));
    } else {
      fallbackCopy(recipe);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('已复制生图提示词配方！');
    } catch (e) {
      showToast('复制失败，请手动选择');
    }
    document.body.removeChild(ta);
  }

  // 漫游画廊渲染与筛选
  function renderGallery() {
    dom.stylesGrid.innerHTML = '';
    const fragment = document.createDocumentFragment();

    state.filteredStyles.forEach(item => {
      const card = document.createElement('div');
      card.className = `grid-card ${item.id === state.styles[state.currentIndex]?.id ? 'active' : ''}`;
      card.dataset.id = item.id;

      const imgSrc = item.has_avatar && item.avatar_url ? item.avatar_url : (item.preview_url || '');

      card.innerHTML = `
        <div class="card-img-wrap">
          <img src="${imgSrc}" loading="lazy" alt="${item.name}" class="card-img">
        </div>
        <div class="card-meta">
          <span class="card-num">№ ${item.id}</span>
          <span class="card-tag">${item.persona?.tag?.replace(/[【】]/g, '') || ''}</span>
        </div>
        <div class="card-title" title="${item.name}">${item.name}</div>
      `;

      card.addEventListener('click', () => {
        const foundIdx = state.styles.findIndex(s => s.id === item.id);
        if (foundIdx !== -1) {
          state.currentIndex = foundIdx;
          renderCurrentStyle();
          // 平滑滚动回顶部主舞台
          window.scrollTo({ top: dom.displayWrapper.offsetTop - 80, behavior: 'smooth' });
        }
      });

      fragment.appendChild(card);
    });

    dom.stylesGrid.appendChild(fragment);
    dom.galleryCountText.textContent = `显示 ${state.filteredStyles.length} / ${state.styles.length} 种画风`;
  }

  function applyFilters() {
    state.filteredStyles = state.styles.filter(item => {
      // 类别筛选
      if (state.activeFilter !== 'all') {
        if (!item.group.startsWith(state.activeFilter)) return false;
      }

      // 关键词搜索
      if (state.searchQuery) {
        const matchId = item.id.includes(state.searchQuery);
        const matchName = item.name.toLowerCase().includes(state.searchQuery);
        const matchAuthor = (item.author || '').toLowerCase().includes(state.searchQuery);
        const matchPersona = (item.persona?.tag || '').toLowerCase().includes(state.searchQuery);
        if (!matchId && !matchName && !matchAuthor && !matchPersona) return false;
      }

      return true;
    });

    renderGallery();
  }

  function updateGalleryActiveCard() {
    const curId = state.styles[state.currentIndex]?.id;
    dom.stylesGrid.querySelectorAll('.grid-card').forEach(card => {
      card.classList.toggle('active', card.dataset.id === curId);
    });
  }

  // 拍立得人设卡片海报生成 (Canvas 高保真渲染)
  function handleOpenPosterModal() {
    dom.posterModal.style.display = 'flex';
    drawPoster();
  }

  function drawPoster() {
    const canvas = dom.posterCanvas;
    const ctx = canvas.getContext('2d');
    const item = state.styles[state.currentIndex];
    if (!item) return;

    // 清空画布
    ctx.fillStyle = '#FAF9F5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制外围极细装饰边线
    ctx.strokeStyle = '#E5E5DF';
    ctx.lineWidth = 1;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    // 绘制头部品牌栏
    ctx.fillStyle = '#18181B';
    ctx.font = '600 14px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('AI不会累 · 今日职场人设签', 40, 56);

    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')}`;
    ctx.fillStyle = '#71717A';
    ctx.font = '500 12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(dateStr, canvas.width - 40, 56);
    ctx.textAlign = 'left';

    // 绘制中央主图 (拍立得照片留白相框)
    const imgX = 40;
    const imgY = 76;
    const imgSize = canvas.width - 80; // 520 x 520

    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.06)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 4;
    ctx.fillRect(imgX, imgY, imgSize, imgSize);
    ctx.shadowColor = 'transparent';

    const avatarImg = new Image();
    avatarImg.crossOrigin = 'anonymous';
    avatarImg.src = item.has_avatar && item.avatar_url ? item.avatar_url : (item.preview_url || '');

    avatarImg.onload = () => {
      // 绘制头像 (留 12px 白边)
      const pad = 12;
      ctx.drawImage(avatarImg, imgX + pad, imgY + pad, imgSize - pad * 2, imgSize - pad * 2);

      // 1. 第一行：左侧人设印章，右侧运势徽标（两侧对齐，中间留白，绝不重叠）
      const sealTag = item.persona?.tag || '【今日人设签】';
      ctx.font = 'bold 15px "Songti SC", serif';
      const tagMetrics = ctx.measureText(sealTag);
      const tagBoxWidth = Math.max(140, tagMetrics.width + 20);
      const row1Y = 614;
      const row1H = 32;

      ctx.fillStyle = '#FDF2F0';
      ctx.fillRect(40, row1Y, tagBoxWidth, row1H);
      ctx.strokeStyle = '#F7C6C2';
      ctx.strokeRect(40, row1Y, tagBoxWidth, row1H);

      ctx.fillStyle = '#A82D24';
      ctx.fillText(sealTag, 50, row1Y + 22);

      // 右侧运势徽标
      const luckText = item.persona?.luck || '★★★★★';
      ctx.font = '600 12px -apple-system, BlinkMacSystemFont, sans-serif';
      const luckMetrics = ctx.measureText(luckText);
      const luckBoxWidth = luckMetrics.width + 18;
      const luckBoxX = canvas.width - 40 - luckBoxWidth;

      ctx.fillStyle = '#FEF3C7';
      ctx.fillRect(luckBoxX, row1Y, luckBoxWidth, row1H);
      ctx.strokeStyle = '#FDE68A';
      ctx.strokeRect(luckBoxX, row1Y, luckBoxWidth, row1H);

      ctx.fillStyle = '#B45309';
      ctx.fillText(luckText, luckBoxX + 9, row1Y + 21);

      // 2. 第二行：风格编号与完整画风名称（独占整行，宽裕空间，自适应长标题）
      let styleText = `№ ${item.id} · ${item.name}`;
      ctx.fillStyle = '#71717A';
      ctx.font = '500 12px monospace';
      if (ctx.measureText(styleText).width > 520) {
        ctx.font = '500 11px monospace';
      }
      ctx.fillText(styleText, 40, 662);

      // 3. 第三行：金句引用
      ctx.fillStyle = '#18181B';
      ctx.font = '500 15px -apple-system, BlinkMacSystemFont, sans-serif';
      const quoteText = `“${item.persona?.quote || ''}”`;
      ctx.fillText(quoteText, 40, 698);

      // 4. 第四行：宜忌清单
      ctx.fillStyle = '#2E7D32';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('宜', 40, 734);
      ctx.fillStyle = '#52525B';
      ctx.font = '12px sans-serif';
      ctx.fillText(item.persona?.yi || '', 60, 734);

      ctx.fillStyle = '#C62828';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('忌', 310, 734);
      ctx.fillStyle = '#52525B';
      ctx.font = '12px sans-serif';
      ctx.fillText(item.persona?.ji || '', 330, 734);

      // 5. 分割线
      ctx.strokeStyle = '#EBEBE6';
      ctx.beginPath();
      ctx.moveTo(40, 768);
      ctx.lineTo(canvas.width - 40, 768);
      ctx.stroke();

      // 6. 底部标语与版权
      ctx.fillStyle = '#A1A1AA';
      ctx.font = '11px sans-serif';
      ctx.fillText('风格千万种，适合你的才是最好的。', 40, 794);
      ctx.textAlign = 'right';
      ctx.fillText('AI不会累 · 261手绘风格逆向实验', canvas.width - 40, 794);
      ctx.textAlign = 'left';
    };
  }

  function handleDownloadPoster() {
    const canvas = dom.posterCanvas;
    const item = state.styles[state.currentIndex];
    const link = document.createElement('a');
    link.download = `今日人设卡片-style-${item ? item.id : 'avatar'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('海报已开始下载！');
  }

  // Toast 提示条工具
  let toastTimer = null;
  function showToast(msg) {
    dom.toast.textContent = msg;
    dom.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      dom.toast.classList.remove('show');
    }, 2400);
  }

  // 启动应用
  window.addEventListener('DOMContentLoaded', initApp);
})();
