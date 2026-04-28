// ═══════════════════════════════════════════════════════════
// INTERNATIONALIZATION
// ═══════════════════════════════════════════════════════════
const TEXTS = {
  zh: {
    pageTitle: '梦境画卷 · Dreamscape',
    title: '梦境画卷',
    subtitle: 'DREAMSCAPE',
    description: '讲述你的梦，AI 为你绘出每一帧画面',
    styleLabel: '选择画风',
    styles: {
      watercolor: '水彩', dreamcore: '梦核',
      pixel: '像素', ghibli: '吉卜力',
      ukiyoe: '浮世绘', cyberpunk: '赛博', clay: '黏土',
    },
    beginBtn: '入梦',
    testBtn: '测试',
    footer: 'Imagen 4.0 · Gemini AI',
    loadingBack: '← 返回',
    loadingMessages: [
      ['坠入梦境…', ''],
      ['梦境成形中…', ''],
      ['梦的轮廓浮现…', ''],
      ['色彩在蔓延…', ''],
      ['光线穿过云层…', ''],
      ['记忆在重组…', ''],
      ['远处传来回响…', ''],
      ['梦境即将完整…', ''],
    ],
    visualized: 'A DREAM VISUALIZED',
    endLine: '— 梦醒了，画还在 —',
    interpretBtn: '解梦',
    shareBtn: '保存海报',
    sharingBtn: '生成中…',
    restartBtn: '再做一个梦',
    shareLinkBtn: '分享链接',
    explore: '看看别人的梦 ✨',
    bugReport: '遇到 bug？去 GitHub 提交反馈',
    tipBtn: '🧋 作者的 token 快见底了，请作者喝杯奶茶续命',
    tipTitle: '🧋 作者为爱发电中',
    tipSubtitle: '一杯奶茶 = 好多个梦',
    quotaError: '梦境暂时拥挤 🌙\n请等一分钟再试，或稍后再来',
    interpretLoading: '正在解读梦境…',
    interpretFail: '解梦失败，请稍后再试。',
    interpretLang: 'Respond entirely in Chinese.',
    placeholders: [
      '我梦见自己走在一片花海中，远处有座老房子，烟囱在冒烟…',
      '梦里下着大雨，雨停后我看到一棵巨大的树，树下有只鹿在休息…',
      '我梦见自己在一座空荡荡的图书馆里，书本自己飞起来…',
    ],
    langSwitch: 'EN',
  },
  en: {
    pageTitle: 'Dreamscape',
    title: 'Dreamscape',
    subtitle: '梦境画卷',
    description: 'Describe your dream — AI paints every scene',
    styleLabel: 'Visual Style',
    styles: {
      watercolor: 'Watercolor', dreamcore: 'Dreamcore',
      pixel: 'Pixel Art', ghibli: 'Ghibli',
      ukiyoe: 'Ukiyo-e', cyberpunk: 'Cyberpunk', clay: 'Claymation',
    },
    beginBtn: 'Dream',
    testBtn: 'Test',
    footer: 'Imagen 4.0 · Gemini AI',
    loadingBack: '← Back',
    loadingMessages: [
      ['Falling into the dream…', ''],
      ['The dream takes shape…', ''],
      ['Shapes emerging from the mist…', ''],
      ['Colors bleeding through…', ''],
      ['Light breaking through clouds…', ''],
      ['Memories reassembling…', ''],
      ['Echoes from the distance…', ''],
      ['The dream is almost whole…', ''],
    ],
    visualized: 'A DREAM VISUALIZED',
    endLine: '— the dream has ended, but the painting remains —',
    interpretBtn: 'Interpret',
    shareBtn: 'Save Poster',
    sharingBtn: 'Generating…',
    restartBtn: 'Dream Again',
    shareLinkBtn: 'Share Link',
    explore: 'Explore others\' dreams ✨',
    bugReport: 'Found a bug? Submit feedback on GitHub',
    tipBtn: '🧋 The author\'s tokens are running low — buy a boba tea to keep the dreams alive',
    tipTitle: '🧋 Powered by love (and tokens)',
    tipSubtitle: 'One boba tea = many more dreams',
    quotaError: 'The dreams are crowded right now 🌙\nWait a minute and try again',
    interpretLoading: 'Interpreting your dream…',
    interpretFail: 'Interpretation failed. Please try again.',
    interpretLang: 'Respond entirely in English.',
    placeholders: [
      'I dreamt of standing on a mountaintop, looking down at a still lake in the fog…',
      'There was an old tree in a golden field, and fireflies were rising from the grass…',
      'I was walking through a city made entirely of glass, and the sky was purple…',
    ],
    langSwitch: '中文',
  },
};

// Detect language: URL param > browser language > default zh
function detectLang() {
  const params = new URLSearchParams(window.location.search);
  const urlLang = params.get('lang');
  if (urlLang === 'en' || urlLang === 'zh') return urlLang;
  const browserLang = (navigator.language || '').toLowerCase();
  return browserLang.startsWith('zh') ? 'zh' : 'en';
}

let currentLang = detectLang();

function t() { return TEXTS[currentLang]; }

function applyLanguage() {
  const tx = t();
  document.title = tx.pageTitle;
  document.documentElement.lang = currentLang === 'zh' ? 'zh' : 'en';

  // Input phase
  document.querySelector('#input-phase h1').textContent = tx.title;
  document.querySelector('#input-phase .subtitle').textContent = tx.subtitle;
  document.querySelector('#input-phase .description').innerHTML = tx.description;
  document.querySelector('.style-label').textContent = tx.styleLabel;
  document.querySelectorAll('.style-btn').forEach(btn => {
    const key = btn.dataset.style;
    if (tx.styles[key]) btn.textContent = tx.styles[key];
  });
  document.getElementById('begin-btn').textContent = tx.beginBtn;
  document.querySelector('.footer-note').textContent = tx.footer;

  // Loading phase
  document.getElementById('loading-back-btn').textContent = tx.loadingBack;

  // Explore button + share link button
  const exploreBtn = document.getElementById('btn-explore');
  if (exploreBtn) exploreBtn.textContent = tx.explore;
  const shareLinkBtn = document.getElementById('btn-share-link');
  if (shareLinkBtn) shareLinkBtn.textContent = tx.shareLinkBtn;

  // Language switch button (do this first so it always updates)
  document.getElementById('lang-switch').textContent = tx.langSwitch;

  // Cinematic phase (these elements may not exist yet, so use optional chaining)
  const cinTitle = document.querySelector('#cinema-title p');
  if (cinTitle) cinTitle.textContent = tx.visualized;
  const endSub = document.getElementById('end-subtitle');
  if (endSub) endSub.textContent = tx.endLine;
  const btnInt = document.getElementById('btn-interpret');
  if (btnInt) btnInt.textContent = tx.interpretBtn;
  const btnShare = document.getElementById('btn-share');
  if (btnShare) btnShare.textContent = tx.shareBtn;
  const btnRestart = document.getElementById('btn-restart');
  if (btnRestart) btnRestart.textContent = tx.restartBtn;
  const btnTip = document.getElementById('btn-tip');
  if (btnTip) btnTip.textContent = tx.tipBtn;
  const tipTitle = document.getElementById('tip-title');
  if (tipTitle) tipTitle.textContent = tx.tipTitle;
  const tipSub = document.getElementById('tip-subtitle');
  if (tipSub) tipSub.textContent = tx.tipSubtitle;
  const bugReport = document.getElementById('bug-report');
  if (bugReport) bugReport.textContent = tx.bugReport;
}

function switchLang() {
  currentLang = currentLang === 'zh' ? 'en' : 'zh';
  // Update URL without reload
  const url = new URL(window.location);
  url.searchParams.set('lang', currentLang);
  window.history.replaceState({}, '', url);
  applyLanguage();
}
