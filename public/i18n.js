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
      watercolor: '水彩', dreamcore: '梦核', inkwash: '水墨',
      pixel: '像素', ghibli: '吉卜力', pencil: '素描',
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
    shareBtn: '分享海报',
    sharingBtn: '生成中…',
    restartBtn: '再做一个梦',
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
      watercolor: 'Watercolor', dreamcore: 'Dreamcore', inkwash: 'Ink Wash',
      pixel: 'Pixel Art', ghibli: 'Ghibli', pencil: 'Pencil',
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
    shareBtn: 'Share Poster',
    sharingBtn: 'Generating…',
    restartBtn: 'Dream Again',
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
  document.getElementById('test-btn').textContent = tx.testBtn;
  document.querySelector('.footer-note').textContent = tx.footer;

  // Loading phase
  document.getElementById('loading-back-btn').textContent = tx.loadingBack;

  // Cinematic phase
  document.querySelector('#cinema-title p').textContent = tx.visualized;
  document.querySelector('#cinema-end > p:nth-child(2)').textContent = tx.endLine;
  document.getElementById('btn-interpret').textContent = tx.interpretBtn;
  document.getElementById('btn-share').textContent = tx.shareBtn;
  document.getElementById('btn-restart').textContent = tx.restartBtn;

  // Language switch button
  document.getElementById('lang-switch').textContent = tx.langSwitch;
}

function switchLang() {
  currentLang = currentLang === 'zh' ? 'en' : 'zh';
  // Update URL without reload
  const url = new URL(window.location);
  url.searchParams.set('lang', currentLang);
  window.history.replaceState({}, '', url);
  applyLanguage();
}
