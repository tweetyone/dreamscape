// ═══════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════
// API key is stored server-side in Vercel environment variables

const STYLE_SUFFIXES = {
  watercolor: ', watercolor painting on white paper, soft translucent washes, delicate brushstrokes, minimal elegant composition, muted palette, dreamy atmosphere, fine art illustration, no text, no frame',
  dreamcore: ', dreamcore aesthetic, soft neon glow, liminal space, pastel fog, ethereal lighting, otherworldly atmosphere, surreal and dreamlike, no text, no frame',
  inkwash: ', traditional Chinese ink wash painting, sumi-e style, monochrome black ink on rice paper, flowing brushstrokes, minimalist composition, misty atmosphere, zen aesthetic, no text, no frame',
  pixel: ', pixel art style, 16-bit retro game aesthetic, dreamy color palette, soft pixels, nostalgic atmosphere, detailed pixel scenery, dithering, no text, no frame',
  ghibli: ', Studio Ghibli anime style, warm hand-painted background art, soft cel shading, Hayao Miyazaki aesthetic, warm natural lighting, gentle and nostalgic atmosphere, animated film still, no text, no frame',
  ukiyoe: ', traditional Japanese ukiyo-e woodblock print style, bold flat color areas, strong black outlines, dramatic composition, decorative natural elements, Edo period aesthetic, woodblock print texture, muted earth tones, no text, no frame',
  cyberpunk: ', cyberpunk art style, deep blue and magenta and electric cyan color palette, neon glow lighting, volumetric fog, holographic accents, futuristic dystopian mood, dramatic cinematic lighting, no text, no frame',
  clay: ', claymation stop-motion style, sculpted clay figures and sets, visible fingerprint textures on surfaces, soft diffused studio lighting, miniature handmade world, warm tactile quality, Aardman and Laika aesthetic, shallow depth of field, no text, no frame',
};

// PLACEHOLDERS and LOADING_MESSAGES are now in i18n.js via t()

const FALLBACK_PROMPTS = {
  tree: 'warm ochre light dissolving upward into deep teal, a dark branching form reaching through golden haze, roots merging with earth tones below',
  mountain: 'layered horizontal bands of indigo and slate blue fading into pale mist, a thin bright line of light along a distant ridge, vast empty space',
  flowers: 'soft explosions of rose and coral floating in pale cream void, scattered petal-like forms drifting, warm light filtering through translucent shapes',
  water: 'deep still blue-green expanse with a single bright reflection, horizontal calm, a small dark form floating in luminous space',
  night: 'deep prussian blue field with scattered points of warm amber light, a large pale circular glow, darkness that feels like velvet',
  forest: 'vertical dark forms with scattered gold light breaking through, emerald and shadow layered deeply, a bright opening in the distance',
  field: 'vast horizontal golden warmth stretching to a thin sky edge, rippling texture suggesting wind, light dissolving into haze at the horizon',
  rain: 'vertical silver-grey streaks over muted earth tones, scattered bright reflections below, soft diffused light through cloud layer',
  house: 'a small warm amber rectangle glowing in surrounding dark cool tones, suggestion of smoke rising into indigo, a path of warm light',
  sky: 'enormous cloud forms in copper and rose gold, deep blue spaces between, light breaking through in dramatic shafts',
};

// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════
let selectedStyle = 'watercolor';
let dreamTitle = '';
let visualThread = '';
let scenes = [];
let currentScene = -1;
let currentLine = 0;
let isPlaying = true;
let lineTimer = null;
let sceneTimer = null;
let useLayerA = true;
let brushAnimId = null;
const imageLoadPromises = {};

// ═══════════════════════════════════════════════════════════
// DOM REFS
// ═══════════════════════════════════════════════════════════
// Generate loading particles
(function initLoadingParticles() {
  const container = document.getElementById('loading-particles');
  if (!container) return;
  for (let i = 0; i < 25; i++) {
    const p = document.createElement('div');
    p.className = 'loading-particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.top = (60 + Math.random() * 50) + '%';
    p.style.width = (2 + Math.random() * 3) + 'px';
    p.style.height = p.style.width;
    p.style.animationDuration = (12 + Math.random() * 18) + 's';
    p.style.animationDelay = -(Math.random() * 20) + 's';
    container.appendChild(p);
  }
})();

const dreamInput = document.getElementById('dream-input');
const beginBtn = document.getElementById('begin-btn');
const brushCanvas = document.getElementById('brush-canvas');
const brushCtx = brushCanvas.getContext('2d');

// ═══════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════
function $(id) { return document.getElementById(id); }
function easeInOut(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2; }

function showPhase(id) {
  document.querySelectorAll('.phase').forEach(p => p.classList.remove('active'));
  $(id).classList.add('active');
  const isCinematic = id === 'cinematic-phase';
  document.body.style.overflow = isCinematic ? 'hidden' : '';
}

function showQuotaError() {
  const msg = t().quotaError;
  const [line1, line2] = msg.split('\n');
  $('loading-step').textContent = line1;
  $('loading-detail').textContent = line2 || '';
  $('loading-pct').textContent = '';
  $('loading-ring').style.strokeDashoffset = 302;
  $('loading-ring').style.stroke = 'rgba(200,80,80,.4)';
  stopFakeProgress();
}

// Smooth progress animation
let currentPct = 0;
let targetPct = 0;
let fakeProgressTimer = null;
let progressAnimFrame = null;

function startFakeProgress() {
  // Slowly tick up to give user sense of movement
  stopFakeProgress();
  fakeProgressTimer = setInterval(() => {
    if (currentPct < targetPct - 2) return; // real progress is ahead, don't fake
    if (targetPct < 95) {
      targetPct += 0.3;
      renderProgress(targetPct);
    }
  }, 300);
}

function stopFakeProgress() {
  clearInterval(fakeProgressTimer);
  fakeProgressTimer = null;
}

function renderProgress(pct) {
  const clamped = Math.min(100, Math.max(0, pct));
  currentPct = clamped;
  const offset = 302 - (302 * clamped / 100);
  $('loading-ring').style.strokeDashoffset = offset;
  $('loading-pct').textContent = Math.round(clamped) + '%';
}

function setLoadingProgress(step, detail, pct) {
  $('loading-step').textContent = step;
  $('loading-detail').textContent = detail;
  if (pct !== undefined) {
    if (pct <= currentPct) return; // never go backwards
    targetPct = pct;
    if (pct > currentPct) {
      // Animate smoothly from current to target
      const start = currentPct;
      const diff = pct - start;
      const duration = 800;
      const startTime = performance.now();
      cancelAnimationFrame(progressAnimFrame);
      function tick(now) {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);
        const eased = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2;
        renderProgress(start + diff * eased);
        if (t < 1) progressAnimFrame = requestAnimationFrame(tick);
      }
      progressAnimFrame = requestAnimationFrame(tick);
    } else {
      renderProgress(pct);
    }
  }
}

// ═══════════════════════════════════════════════════════════
// API: IMAGE GENERATION
// ═══════════════════════════════════════════════════════════
// Toggle: 'imagen' or 'replicate'
const IMAGE_PROVIDER = 'imagen';

function buildImagePrompt(prompt) {
  const suffix = STYLE_SUFFIXES[selectedStyle] || STYLE_SUFFIXES.watercolor;
  // Scene-specific prompt first (most important), then style, then visual thread last (atmosphere)
  const fullPrompt = prompt + suffix + (visualThread ? '. Overall atmosphere: ' + visualThread : '');
  console.log('[Image prompt]', fullPrompt);
  return fullPrompt;
}

// Imagen 4.0 (Google)
async function generateImageImagen(fullPrompt, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: fullPrompt }],
          parameters: { sampleCount: 1, aspectRatio: window.innerWidth > window.innerHeight ? '16:9' : '9:16' },
        }),
      });
      if (resp.status === 429) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 5000));
        continue;
      }
      if (!resp.ok) {
        const errText = await resp.text();
        console.error('Imagen error:', resp.status, errText);
        throw new Error('Imagen API error: ' + resp.status);
      }
      const data = await resp.json();
      console.log('Imagen response keys:', Object.keys(data));
      const b64 = data.predictions?.[0]?.bytesBase64Encoded;
      if (!b64) {
        console.warn('No image in response. Full response:', JSON.stringify(data).slice(0, 200));
        throw new Error('No image in response');
      }
      return 'data:image/png;base64,' + b64;
    } catch (e) {
      if (attempt === retries) throw e;
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

// Replicate Flux Schnell
async function generateImageReplicate(fullPrompt, retries = 3) {
  const aspectRatio = window.innerWidth > window.innerHeight ? '16:9' : '9:16';
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await fetch('/api/replicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt, aspect_ratio: aspectRatio }),
      });
      if (resp.status === 429) {
        const wait = (attempt + 1) * 10000; // 10s, 20s, 30s, 40s
        console.warn(`Replicate 429, waiting ${wait/1000}s...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      if (!resp.ok) throw new Error('Replicate API error: ' + resp.status);
      const data = await resp.json();
      if (data.dataUrl) return data.dataUrl;
      throw new Error('No image in response');
    } catch (e) {
      if (attempt === retries) throw e;
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

async function generateImage(prompt, retries = 2) {
  const fullPrompt = buildImagePrompt(prompt);
  if (IMAGE_PROVIDER === 'replicate') {
    return generateImageReplicate(fullPrompt, retries);
  }
  return generateImageImagen(fullPrompt, retries);
}

// ═══════════════════════════════════════════════════════════
// API: STORY GENERATION (Gemini)
// ═══════════════════════════════════════════════════════════
async function generateStory(dreamText) {
  const sysPrompt = `You are retelling someone's dream as a first-person narrative, faithful to what they described. Don't invent, don't dramatize, don't smooth out weirdness. Respond ONLY with a JSON object (no markdown, no backticks).

{
  "title": "short evocative title (match user's language)",
  "visual_thread": "One concise English sentence describing the shared atmosphere: color palette, light quality, and one recurring visual motif. Example: 'dusty teal and ochre palette, golden hour light, floating dust particles in every scene'",
  "scenes": [
    {
      "lines": ["first-person sentence 1", "sentence 2", "sentence 3"],
      "image_prompt": "MUST BE IN ENGLISH EVEN IF LINES ARE CHINESE. Describe the specific subject, action, objects, setting, and composition of THIS scene. Example: 'an empty school hallway with lockers, a massive T-Rex visible at the far end, fluorescent lights flickering'."
    }
  ]
}

═══ TONE — THE MOST IMPORTANT PART ═══

USE FIRST PERSON (我/I). The dreamer is narrating their own dream.

FAITHFULNESS: You may only retell what the user described. You may gently expand with small sensory or contextual details (a color, a sound, how something felt, a mundane setting detail) to help the story flow. You may NOT:
- Add new characters, events, or endings
- Dramatize emotions ("heart racing", "overwhelmed with joy")
- Add plot twists or "realizations"
- Interpret the dream or add meaning

AVOID LITERARY/POETIC LANGUAGE. Write plainly. Compare these examples:

BAD (flowery, children's-book): "数字与我的心跳一同加速。" "惊人的消息在耳边轻语。" "世界仿佛变得柔软起来。" "环游世界的念头浮现。"
GOOD (plain, real): "我看了一眼，是 1000。" "我愣了一下，不敢相信。" "送礼物的时候，大家都很高兴。" "我想去一个没去过的地方。"

BAD: "Petals lifted into my hair, and everything went perfectly still."
GOOD: "The petals landed in my hair. It went quiet."

BAD: "The sound of dishes, and I remembered things I'd long forgotten."
GOOD: "I could hear dishes clinking inside. It reminded me of something."

═══ STRUCTURE ═══

- Exactly 6 scenes, faithful to the arc of the user's dream from beginning to end
- Each scene: 2-4 natural sentences. Length should feel organic.
- Think of it as a narrative progression: scene 1 establishes setting/situation; scenes 2-4 develop the dream's events; scene 5 is a shift, peak moment, or turn; scene 6 is how it ends or fades.
- Scenes must PROGRESS — never repeat the same moment or emotion.
- Dreams can be weird, fragmented, or abrupt. Keep that. Don't force logic.

═══ LANGUAGE ═══

CRITICAL: Match user's input language EXACTLY. Chinese dream → ALL Chinese. English dream → ALL English. Never mix. Never translate.

═══ IMAGE PROMPTS (CRITICAL) ═══

- visual_thread: ENGLISH. Atmosphere only — color palette, lighting, recurring motif.
- image_prompt: MUST ALWAYS BE IN ENGLISH, even when the user writes in Chinese. This is sent to an image generator with content filters. Describe the scene visually — setting, characters, composition, lighting. Avoid words like: flesh, blood, gore, nude, naked, wound, eating body parts. Instead use softer alternatives: 'translucent form', 'soft glowing material', 'ethereal figure'. Focus on mood and spatial composition rather than graphic physical details.

ONLY output valid JSON. No markdown, no explanation.`;

  const resp = await fetch('/api/story', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: sysPrompt + '\n\nUser dream: ' + dreamText.trim() }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: 12000 },
    }),
  });
  if (!resp.ok) throw new Error('Gemini API error: ' + resp.status);
  const data = await resp.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const text = parts.map(p => p.text || '').join('');
  let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const jsonStart = cleaned.indexOf('{');
  if (jsonStart > 0) cleaned = cleaned.slice(jsonStart);

  try {
    return JSON.parse(cleaned);
  } catch {
    // Robust repair: truncate at last complete bracket, balance braces
    let repaired = cleaned;
    const lastComplete = Math.max(repaired.lastIndexOf('}'), repaired.lastIndexOf(']'));
    if (lastComplete > 0) repaired = repaired.slice(0, lastComplete + 1);
    repaired = repaired.replace(/,(\s*[\]}])/g, '$1');
    const opens = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;
    const braces = (repaired.match(/\{/g) || []).length - (repaired.match(/\}/g) || []).length;
    for (let i = 0; i < opens; i++) repaired += ']';
    for (let i = 0; i < braces; i++) repaired += '}';
    const script = JSON.parse(repaired);
    if (!script?.title || !script?.scenes?.length) throw new Error('Invalid response');
    return script;
  }
}

// ═══════════════════════════════════════════════════════════
// LOCAL FALLBACK
// ═══════════════════════════════════════════════════════════
function detectThemes(text) {
  const kw = text.toLowerCase();
  const themes = [];
  const rules = [
    [/树|tree|oak|松|柏/, 'tree'], [/山|mountain|hill|峰/, 'mountain'],
    [/花|flower|blossom|garden|玫瑰|薰衣草/, 'flowers'],
    [/水|water|ocean|sea|lake|河|湖|溪/, 'water'],
    [/夜|night|月|moon|星|star/, 'night'], [/森林|forest|jungle|woods/, 'forest'],
    [/田|field|草|grass|meadow|麦/, 'field'], [/雨|rain|storm/, 'rain'],
    [/房|house|home|屋|cottage/, 'house'], [/云|cloud|天空|sky|飞|fly/, 'sky'],
  ];
  rules.forEach(([re, t]) => { if (re.test(kw) && !themes.includes(t)) themes.push(t); });
  if (!themes.length) themes.push('sky', 'tree', 'water');
  const all = Object.keys(FALLBACK_PROMPTS);
  while (themes.length < 6) themes.push(all[Math.floor(Math.random() * all.length)]);
  return themes.slice(0, 6);
}

function localFallback(dreamText) {
  const isCN = /[\u4e00-\u9fff]/.test(dreamText);
  const themes = detectThemes(dreamText);
  const stories = isCN ? [
    ['梦开始的时候，四周一片安静。', '我站在一条没有尽头的路上，身后是晨雾，前方是光。', '空气里有花和泥土的气味，像极了小时候外婆家的清晨。', '我不知道要去哪里，但脚步很轻。'],
    ['不知道走了多久，路边出现了一棵很老很老的树。', '树冠大得像一把撑开的伞，树下有人留下的石凳。', '上面落满了金色的叶子，我坐下来，风刚好吹过。', '好像所有的时间都停在了这一刻。'],
    ['我听见水声，循着声音走去。', '一片湖安静地躺在山谷中间，湖面上有一条小船。', '没有人划，它自己在慢慢漂。', '我突然觉得，这个地方我来过。'],
    ['花是突然出现的，先是脚边冒出一朵两朵。', '然后是一整片一整片地开放，红的、粉的、白的。', '多到我只能站在原地，让它们从身边长过去。', '风把花瓣吹到了我的头发上。'],
    ['天暗了下来，但不是那种让人害怕的暗。', '月亮又大又圆，照得每一片叶子都在发光。', '远处传来很轻很轻的音乐，像有人在哼歌。', '我躺在草地上，决定不走了。'],
    ['远处有一栋小房子，窗户里透出暖黄色的光。', '烟囱里飘出淡淡的烟，门开着，好像在等人。', '我走过去推开篱笆门，院子里种满了花。', '屋里传来碗碟的声音，我忽然想起了一些很久没想的事。'],
  ] : [
    ['The dream began in silence.', 'I stood on a path that stretched endlessly — mist behind me, light ahead.', 'The air smelled of flowers and damp earth, like my grandmother\'s garden at dawn.', 'I didn\'t know where I was going, but my steps felt effortless.'],
    ['I walked for what felt like hours. Then a tree appeared — ancient and enormous.', 'Its canopy spread like an umbrella for the sky. A stone bench sat beneath it.', 'Covered in golden leaves. I sat down. The wind passed through.', 'Everything went perfectly still.'],
    ['I followed the sound of water until a lake appeared.', 'It lay perfectly still in a valley. A small boat drifted across the surface.', 'No one was rowing — it moved on its own, unhurried.', 'I had the strangest feeling I\'d been here before.'],
    ['The flowers came without warning — first one or two near my feet.', 'Then they spread everywhere: red, pink, white, an entire field blooming at once.', 'I could only stand still and let them rise around me.', 'Petals lifted into my hair. Everything was perfectly quiet.'],
    ['The sky darkened, but gently — not the kind of dark that frightens.', 'A large moon rose, painting every leaf in silver.', 'From somewhere far away came the softest music, like someone humming a lullaby.', 'I lay in the grass and decided to stay.'],
    ['A small house appeared in the distance, warm light glowing in its windows.', 'Smoke curled from the chimney. The door stood open, as if waiting for me.', 'I walked through the garden gate — flowers everywhere, spilling over the path.', 'Inside, the sound of dishes. I remembered things I\'d long forgotten.'],
  ];
  const shuffled = [...stories].sort(() => Math.random() - .5);
  const titles = isCN
    ? ['浮光掠影','梦的边境','无名之境','半醒之间','旧梦重温','云深不知处']
    : ['Fleeting Light','Edge of Dreaming','Unnamed Place','Between Waking','Old Dreams Revisited','Deep in the Clouds'];
  visualThread = 'soft diffused golden light throughout, muted warm color palette with cool blue-grey shadows, gentle atmospheric haze connecting all elements, consistent dreamy soft-focus quality';
  return {
    title: titles[Math.floor(Math.random() * titles.length)],
    scenes: themes.map((t, i) => ({
      lines: shuffled[i % shuffled.length],
      image_prompt: FALLBACK_PROMPTS[t] || FALLBACK_PROMPTS.tree,
    })),
  };
}

// ═══════════════════════════════════════════════════════════
// BRUSH REVEAL ENGINE
// ═══════════════════════════════════════════════════════════
function resizeBrushCanvas() {
  brushCanvas.width = window.innerWidth;
  brushCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeBrushCanvas);
resizeBrushCanvas();

function bezierPoint(path, t) {
  const u = 1 - t;
  return {
    x: u*u*u*path.startX + 3*u*u*t*path.cp1x + 3*u*t*t*path.cp2x + t*t*t*path.endX,
    y: u*u*u*path.startY + 3*u*u*t*path.cp1y + 3*u*t*t*path.cp2y + t*t*t*path.endY,
  };
}

function generateWashPaths(W, H) {
  const paths = [];
  const count = 8 + Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const startY = H * (t * 0.9 + Math.random() * 0.15);
    const endY = H * (t * 0.9 + (Math.random() - 0.5) * 0.3);
    paths.push({
      startX: -W * 0.1, startY,
      cp1x: W * (0.2 + Math.random() * 0.2), cp1y: startY + (Math.random() - 0.5) * H * 0.3,
      cp2x: W * (0.6 + Math.random() * 0.2), cp2y: endY + (Math.random() - 0.5) * H * 0.3,
      endX: W * 1.1, endY,
      thickness: Math.min(W, H) * (0.12 + Math.random() * 0.18),
      delay: t * 0.4 + Math.random() * 0.1,
      speed: 0.7 + Math.random() * 0.4,
      alpha: 0.15 + Math.random() * 0.1,
    });
  }
  for (let i = 0; i < 4; i++) {
    const x = W * (0.1 + i * 0.25 + (Math.random() - 0.5) * 0.1);
    paths.push({
      startX: x, startY: -H * 0.1,
      cp1x: x + (Math.random() - 0.5) * W * 0.15, cp1y: H * 0.3,
      cp2x: x + (Math.random() - 0.5) * W * 0.15, cp2y: H * 0.7,
      endX: x + (Math.random() - 0.5) * W * 0.1, endY: H * 1.1,
      thickness: Math.min(W, H) * (0.15 + Math.random() * 0.2),
      delay: 0.15 + i * 0.12 + Math.random() * 0.08,
      speed: 0.6 + Math.random() * 0.3,
      alpha: 0.12 + Math.random() * 0.08,
    });
  }
  return paths;
}

function drawWashFrame(paths, rawProgress) {
  const W = brushCanvas.width, H = brushCanvas.height;
  brushCtx.globalCompositeOperation = 'destination-out';
  paths.forEach(path => {
    const pathProgress = Math.max(0, Math.min(1, (rawProgress - path.delay) / (0.5 * path.speed)));
    if (pathProgress <= 0) return;
    const steps = Math.floor(easeInOut(pathProgress) * 60);
    for (let i = 0; i < steps; i++) {
      const t = i / 60;
      const pt = bezierPoint(path, t);
      const r = path.thickness * (Math.sin(t * Math.PI) * 0.6 + 0.4);
      const grad = brushCtx.createRadialGradient(pt.x, pt.y, r * 0.1, pt.x, pt.y, r);
      grad.addColorStop(0, `rgba(0,0,0,${path.alpha})`);
      grad.addColorStop(0.5, `rgba(0,0,0,${path.alpha * 0.6})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      brushCtx.fillStyle = grad;
      brushCtx.fillRect(pt.x - r, pt.y - r, r * 2, r * 2);
    }
  });
  brushCtx.globalCompositeOperation = 'source-over';
}

function brushReveal(onComplete) {
  cancelAnimationFrame(brushAnimId);
  resizeBrushCanvas();
  const W = brushCanvas.width, H = brushCanvas.height;
  brushCtx.fillStyle = '#0a0a08';
  brushCtx.fillRect(0, 0, W, H);

  const paths = generateWashPaths(W, H);
  const duration = 4000;
  const startTime = performance.now();

  function animate(now) {
    const rawProgress = Math.min(1, (now - startTime) / duration);
    drawWashFrame(paths, rawProgress);

    if (rawProgress > 0.7) {
      const fade = easeInOut((rawProgress - 0.7) / 0.3);
      brushCtx.clearRect(0, 0, W, H);
      if (fade < 1) {
        brushCtx.globalAlpha = 1 - fade;
        brushCtx.fillStyle = '#0a0a08';
        brushCtx.fillRect(0, 0, W, H);
        drawWashFrame(paths, rawProgress);
        brushCtx.globalAlpha = 1;
      }
    }

    if (rawProgress < 1) {
      brushAnimId = requestAnimationFrame(animate);
    } else {
      brushCtx.clearRect(0, 0, W, H);
      if (onComplete) onComplete();
    }
  }
  brushAnimId = requestAnimationFrame(animate);
}

function coverBrushCanvas() {
  resizeBrushCanvas();
  brushCtx.fillStyle = '#0a0a08';
  brushCtx.fillRect(0, 0, brushCanvas.width, brushCanvas.height);
  cancelAnimationFrame(brushAnimId);
}

// ═══════════════════════════════════════════════════════════
// LAZY IMAGE LOADING (sequential queue to avoid 429)
// ═══════════════════════════════════════════════════════════
let imageQueue = [];
let imageQueueRunning = false;

function lazyLoadImage(index) {
  if (index < 0 || index >= scenes.length) return;
  if (scenes[index].dataUrl || scenes[index].imgLoading || imageLoadPromises[index]) return;

  scenes[index].imgLoading = true;
  imageLoadPromises[index] = true; // mark as queued

  // Add to queue, prioritize current scene
  if (index === currentScene) {
    imageQueue.unshift(index); // current scene goes first
  } else {
    imageQueue.push(index);
  }
  processImageQueue();
}

async function processImageQueue() {
  if (imageQueueRunning || imageQueue.length === 0) return;
  imageQueueRunning = true;

  try {
    while (imageQueue.length > 0) {
      const index = imageQueue.shift();
      if (!scenes[index] || scenes[index].dataUrl) continue;

      try {
        const dataUrl = await generateImage(scenes[index].image_prompt);
        scenes[index].dataUrl = dataUrl;
        scenes[index].imgLoading = false;
        if (currentScene === index) showSceneImage(index);
      } catch (err) {
        console.warn('Image ' + index + ' failed:', err.message);
        scenes[index].imgLoading = false;
        scenes[index].imgFailed = true;
        if (currentScene === index) showImageError(err.message);
      }
    }
  } finally {
    imageQueueRunning = false;
  }
}

// ═══════════════════════════════════════════════════════════
// CINEMATIC ENGINE
// ═══════════════════════════════════════════════════════════
function showImageError(errMsg) {
  const isCN = currentLang === 'zh';
  let text;
  if (errMsg.includes('429')) {
    text = isCN ? '🌙 画师太忙了，这幅画跳过了' : '🌙 The painter is busy — this scene was skipped';
  } else if (errMsg.includes('No image')) {
    text = isCN ? '🌙 这个画面太梦幻了，画不出来' : '🌙 This scene was too dreamy to paint';
  } else {
    text = isCN ? '🌙 这幅画迷路了，没能赶到' : '🌙 This painting got lost on the way here';
  }
  const textContainer = $('cinema-text');
  const errEl = document.createElement('p');
  errEl.className = 'scene-line visible';
  errEl.style.cssText = 'color:rgba(232,224,212,.35);font-size:.76rem;font-style:italic;margin-bottom:8px;';
  errEl.textContent = text;
  textContainer.prepend(errEl);
}

function showSceneImage(index) {
  const scene = scenes[index];
  if (!scene?.dataUrl) return;

  const showLayer = $(useLayerA ? 'cinema-img-a' : 'cinema-img-b');
  const hideLayer = $(useLayerA ? 'cinema-img-b' : 'cinema-img-a');

  showLayer.style.backgroundImage = 'url(' + scene.dataUrl + ')';
  showLayer.style.transform = 'scale(1.02)';
  showLayer.style.opacity = '0.85';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    showLayer.style.transform = 'scale(1.12)';
  }));
  hideLayer.style.opacity = '0';
  useLayerA = !useLayerA;
  coverBrushCanvas();
  brushReveal();
}

function startCinematic() {
  showPhase('cinematic-phase');
  currentScene = -1;
  currentLine = 0;
  isPlaying = true;
  $('ctrl-play').innerHTML = '&#10074;&#10074;';
  $('cinema-end').style.display = 'none';
  $('cinema-img-a').style.opacity = '0';
  $('cinema-img-b').style.opacity = '0';
  useLayerA = true;

  const dotsContainer = $('progress-dots');
  dotsContainer.innerHTML = '';
  scenes.forEach(() => {
    const dot = document.createElement('div');
    dot.style.cssText = 'width:6px;height:6px;border-radius:50%;background:rgba(232,224,212,.3);transition:background .3s;';
    dotsContainer.appendChild(dot);
  });

  $('cinema-title-text').textContent = dreamTitle;
  $('cinema-title').style.opacity = '1';
  $('scene-counter').textContent = '';
  $('cinema-text').innerHTML = '';

  if (scenes[0]?.dataUrl) {
    const layer = $('cinema-img-a');
    layer.style.backgroundImage = 'url(' + scenes[0].dataUrl + ')';
    layer.style.opacity = '0.4';
    layer.style.transform = 'scale(1.05)';
  }

  updateProgressBar();
  sceneTimer = setTimeout(() => { if (isPlaying) playScene(0); }, 4500);
}

function playScene(index) {
  if (index < 0 || index >= scenes.length) return showEndScreen();
  clearTimeout(lineTimer);
  clearTimeout(sceneTimer);

  const isFirstScene = currentScene < 0;
  currentScene = index;
  currentLine = 0;
  lazyLoadImage(index);
  lazyLoadImage(index + 1);

  $('cinema-title').style.opacity = '0';
  $('scene-counter').textContent = (index + 1) + ' / ' + scenes.length;
  document.querySelectorAll('#progress-dots div').forEach((d, i) => {
    d.style.background = i === index ? 'rgba(232,224,212,.8)' : i < index ? 'rgba(232,224,212,.5)' : 'rgba(232,224,212,.3)';
  });

  const textContainer = $('cinema-text');

  if (isFirstScene) {
    setupSceneContent(index, textContainer);
    if (scenes[index].dataUrl) showSceneImage(index);
    else waitForImage(index);
    updateProgressBar();
    if (isPlaying) lineTimer = setTimeout(revealNextLine, 1500);
  } else {
    textContainer.querySelectorAll('.scene-line').forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(-8px)';
    });
    setTimeout(() => {
      coverBrushCanvas();
      setupSceneContent(index, textContainer);
      updateProgressBar();
      setTimeout(() => {
        const scene = scenes[index];
        if (scene.dataUrl) {
          const showLayer = $(useLayerA ? 'cinema-img-a' : 'cinema-img-b');
          const hideLayer = $(useLayerA ? 'cinema-img-b' : 'cinema-img-a');
          showLayer.style.backgroundImage = 'url(' + scene.dataUrl + ')';
          showLayer.style.transform = 'scale(1.02)';
          showLayer.style.opacity = '0.85';
          requestAnimationFrame(() => requestAnimationFrame(() => {
            showLayer.style.transform = 'scale(1.12)';
          }));
          hideLayer.style.opacity = '0';
          useLayerA = !useLayerA;
          brushReveal();
        } else {
          waitForImage(index);
        }
        if (isPlaying) lineTimer = setTimeout(revealNextLine, 1600);
      }, 300);
    }, 800);
  }
}

function setupSceneContent(index, container) {
  container.innerHTML = '';
  (scenes[index].lines || []).forEach(line => {
    const p = document.createElement('p');
    p.className = 'scene-line';
    p.textContent = line;
    container.appendChild(p);
  });
}

function waitForImage(index) {
  if (!scenes[index].imgLoading) return;
  const iv = setInterval(() => {
    if (!scenes[index].imgLoading) {
      clearInterval(iv);
      if (scenes[index].dataUrl) showSceneImage(index);
    }
  }, 500);
}

function revealNextLine() {
  clearTimeout(lineTimer);
  const lines = document.querySelectorAll('#cinema-text .scene-line');
  if (currentLine < lines.length) {
    lines[currentLine].classList.add('visible');
    currentLine++;
    updateProgressBar();
    lineTimer = setTimeout(() => { if (isPlaying) revealNextLine(); }, 2800);
  } else {
    sceneTimer = setTimeout(() => { if (isPlaying) playScene(currentScene + 1); }, 2000);
  }
}

function updateProgressBar() {
  if (!scenes.length) return;
  const total = scenes.reduce((s, sc) => s + (sc.lines?.length || 0), 0);
  let shown = 0;
  for (let i = 0; i < currentScene; i++) shown += scenes[i].lines?.length || 0;
  if (currentScene >= 0) shown += currentLine;
  $('progress-bar-fill').style.width = Math.min(100, (shown / total) * 100) + '%';
}

function showEndScreen() {
  clearTimeout(lineTimer);
  clearTimeout(sceneTimer);
  currentScene = scenes.length;
  $('end-title').textContent = currentLang === 'zh' ? '梦境画卷' : 'Dreamscape';
  $('cinema-end').style.display = 'flex';
  $('progress-bar-fill').style.width = '100%';
  // Auto-render poster preview
  renderPosterPreview();
}

let posterDataUrl = null;
async function renderPosterPreview() {
  $('poster-img').style.display = 'none';
  posterDataUrl = await generatePosterDataUrl();
  if (posterDataUrl) {
    $('poster-img').src = posterDataUrl;
    $('poster-img').style.display = 'block';
  }
}

// ═══════════════════════════════════════════════════════════
// POSTER THEMES
// ═══════════════════════════════════════════════════════════
const POSTER_THEMES = {
  watercolor: {
    bg: ['#f5f0e6', '#eae0cc'],
    title: '#3a3128', subtitle: '#8a7868', divider: 'rgba(180,140,90,.3)',
    textLabel: 'rgba(90,70,50,.4)', textColor: 'rgba(60,50,40,.8)',
    accent: '#a8824a', watermark: 'rgba(90,70,50,.35)',
    titleFont: '"Noto Serif SC","Cormorant Garamond",serif',
    decoration: 'watercolor',
  },
  dreamcore: {
    bg: ['#2a1f3d', '#1a0f2e'],
    title: '#f0e0ff', subtitle: 'rgba(240,220,255,.5)', divider: 'rgba(200,160,255,.3)',
    textLabel: 'rgba(200,160,255,.3)', textColor: 'rgba(240,220,255,.8)',
    accent: '#d4a0ff', watermark: 'rgba(240,220,255,.3)',
    titleFont: '"Cormorant Garamond",serif',
    decoration: 'dreamcore',
  },
  inkwash: {
    bg: ['#f2ede0', '#e8e0cc'],
    title: '#1a1a1a', subtitle: '#555', divider: 'rgba(0,0,0,.15)',
    textLabel: 'rgba(0,0,0,.25)', textColor: 'rgba(0,0,0,.75)',
    accent: '#c83c3c', watermark: 'rgba(0,0,0,.35)',
    titleFont: '"Noto Serif SC","Cormorant Garamond",serif',
    decoration: 'inkwash',
  },
  pixel: {
    bg: ['#0a0a14', '#05050a'],
    title: '#8bf0a0', subtitle: 'rgba(139,240,160,.4)', divider: 'rgba(139,240,160,.2)',
    textLabel: 'rgba(139,240,160,.3)', textColor: 'rgba(220,230,200,.8)',
    accent: '#ffbf40', watermark: 'rgba(139,240,160,.35)',
    titleFont: 'monospace',
    decoration: 'pixel',
  },
  ghibli: {
    bg: ['#f0e6d0', '#e0cfa8'],
    title: '#2a3d2a', subtitle: '#6a7858', divider: 'rgba(80,100,60,.3)',
    textLabel: 'rgba(60,80,40,.4)', textColor: 'rgba(40,60,30,.85)',
    accent: '#8da650', watermark: 'rgba(60,80,40,.35)',
    titleFont: '"Noto Serif SC","Cormorant Garamond",serif',
    decoration: 'ghibli',
  },
  ukiyoe: {
    bg: ['#f5ede0', '#ebe0c8'],
    title: '#1a1a1a', subtitle: '#444', divider: 'rgba(0,0,0,.2)',
    textLabel: 'rgba(0,0,0,.3)', textColor: 'rgba(0,0,0,.8)',
    accent: '#c8333a', watermark: 'rgba(0,0,0,.35)',
    titleFont: '"Noto Serif SC","Cormorant Garamond",serif',
    decoration: 'ukiyoe',
  },
  cyberpunk: {
    bg: ['#0d0520', '#050014'],
    title: '#ff2be8', subtitle: 'rgba(0,240,255,.7)', divider: 'rgba(255,43,232,.35)',
    textLabel: 'rgba(0,240,255,.4)', textColor: 'rgba(220,240,255,.85)',
    accent: '#00f0ff', watermark: 'rgba(255,43,232,.45)',
    titleFont: 'monospace',
    decoration: 'cyberpunk',
  },
  clay: {
    bg: ['#f0e2cd', '#e5d4b5'],
    title: '#4a3520', subtitle: '#8a6a48', divider: 'rgba(120,80,40,.3)',
    textLabel: 'rgba(90,60,30,.4)', textColor: 'rgba(70,50,25,.85)',
    accent: '#c8843a', watermark: 'rgba(90,60,30,.35)',
    titleFont: '"Cormorant Garamond",serif',
    decoration: 'clay',
  },
};

// Draw theme-specific decorations on poster
function drawDecoration(ctx, theme, W, H, x) {
  if (x !== -1) return; // only draw on full-canvas pass
  ctx.save();
  switch(theme.decoration) {
    case 'watercolor': {
      // Soft watercolor splash circles at edges
      const splash = (cx, cy, r, color, alpha) => {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, `rgba(${color},${alpha})`);
        g.addColorStop(0.5, `rgba(${color},${alpha * 0.4})`);
        g.addColorStop(1, `rgba(${color},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      };
      splash(0, 0, 300, '200,170,120', 0.15);
      splash(W, H * 0.3, 250, '180,150,190', 0.1);
      splash(W * 0.3, H, 280, '150,180,170', 0.08);
      splash(W * 0.7, 0, 200, '210,180,140', 0.12);
      // Thin decorative border
      ctx.strokeStyle = 'rgba(180,150,100,.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(30, 30, W - 60, H - 60);
      break;
    }
    case 'dreamcore': {
      // Multiple glow orbs with different colors
      const orb = (cx, cy, r, color) => {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, color);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      };
      orb(60, 60, 200, 'rgba(200,140,255,.25)');
      orb(W - 80, H * 0.4, 250, 'rgba(140,180,255,.15)');
      orb(W * 0.5, H - 100, 220, 'rgba(255,140,200,.12)');
      orb(W - 40, 120, 150, 'rgba(180,255,220,.1)');
      // Starfield dots
      for (let i = 0; i < 40; i++) {
        const sx = Math.random() * W, sy = Math.random() * H;
        const sr = 0.5 + Math.random() * 1.5;
        ctx.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.15})`;
        ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'inkwash': {
      // Red seal/chop
      ctx.fillStyle = theme.accent;
      ctx.fillRect(W - 140, 44, 52, 52);
      ctx.fillStyle = theme.bg[0];
      ctx.font = 'bold 24px "Noto Serif SC", serif';
      ctx.textAlign = 'center';
      ctx.fillText('梦', W - 114, 78);
      // Ink splash corners
      const inkSplash = (cx, cy, r) => {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, 'rgba(0,0,0,.06)');
        g.addColorStop(0.6, 'rgba(0,0,0,.02)');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      };
      inkSplash(0, H, 300);
      inkSplash(W, 0, 250);
      // Thin border
      ctx.strokeStyle = 'rgba(0,0,0,.08)';
      ctx.lineWidth = 2;
      ctx.strokeRect(24, 24, W - 48, H - 48);
      ctx.strokeStyle = 'rgba(0,0,0,.04)';
      ctx.lineWidth = 1;
      ctx.strokeRect(28, 28, W - 56, H - 56);
      break;
    }
    case 'pixel': {
      // Pixel border
      ctx.fillStyle = theme.accent;
      const ps = 6; // pixel size
      for (let i = 0; i < W; i += ps * 2) {
        ctx.fillRect(i, 0, ps, ps);
        ctx.fillRect(i, H - ps, ps, ps);
      }
      for (let i = 0; i < H; i += ps * 2) {
        ctx.fillRect(0, i, ps, ps);
        ctx.fillRect(W - ps, i, ps, ps);
      }
      // CRT scanlines
      ctx.fillStyle = 'rgba(139,240,160,.02)';
      for (let i = 0; i < H; i += 3) ctx.fillRect(0, i, W, 1);
      // Pixel corners with "DREAM.EXE"
      ctx.fillStyle = theme.accent;
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('> DREAM.EXE', 20, 20);
      ctx.textAlign = 'right';
      ctx.fillText('LOADING...OK', W - 20, H - 14);
      break;
    }
    case 'ghibli': {
      // Soft vignette
      const vig = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.3, W/2, H/2, Math.max(W,H)*0.7);
      vig.addColorStop(0, 'transparent');
      vig.addColorStop(1, 'rgba(80,60,30,.08)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);
      // Leaf/vine decorations at corners
      ctx.strokeStyle = 'rgba(100,140,60,.15)';
      ctx.lineWidth = 1.5;
      // Top-left vine
      ctx.beginPath();
      ctx.moveTo(20, 80); ctx.quadraticCurveTo(20, 20, 80, 20);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(24, 60); ctx.quadraticCurveTo(30, 40, 50, 35);
      ctx.stroke();
      // Bottom-right vine
      ctx.beginPath();
      ctx.moveTo(W - 20, H - 80); ctx.quadraticCurveTo(W - 20, H - 20, W - 80, H - 20);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(W - 24, H - 60); ctx.quadraticCurveTo(W - 30, H - 40, W - 50, H - 35);
      ctx.stroke();
      break;
    }
    case 'ukiyoe': {
      // Bold red bands top and bottom
      ctx.fillStyle = theme.accent;
      ctx.fillRect(0, 0, W, 6);
      ctx.fillRect(0, H - 6, W, 6);
      // Vertical red strips at sides
      ctx.fillRect(0, 0, 3, H);
      ctx.fillRect(W - 3, 0, 3, H);
      // Wave pattern along bottom (simplified)
      ctx.strokeStyle = 'rgba(200,50,58,.12)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < W; i += 40) {
        ctx.beginPath();
        ctx.arc(i + 20, H - 30, 18, Math.PI, 0);
        ctx.stroke();
      }
      // Red seal in corner
      ctx.fillStyle = theme.accent;
      ctx.fillRect(W - 80, 50, 40, 40);
      ctx.fillStyle = theme.bg[0];
      ctx.font = 'bold 20px "Noto Serif SC", serif';
      ctx.textAlign = 'center';
      ctx.fillText('夢', W - 60, 78);
      break;
    }
    case 'cyberpunk': {
      // Scan lines
      ctx.fillStyle = 'rgba(0,240,255,.025)';
      for (let i = 0; i < H; i += 3) ctx.fillRect(0, i, W, 1);
      // Grid pattern
      ctx.strokeStyle = 'rgba(255,43,232,.04)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < W; i += 60) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); }
      for (let i = 0; i < H; i += 60) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke(); }
      // Corner brackets
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 2;
      const bs = 35;
      [[30,30],[W-30-bs,30],[30,H-30-bs],[W-30-bs,H-30-bs]].forEach((p, idx) => {
        ctx.beginPath();
        if (idx === 0) { ctx.moveTo(p[0], p[1]+bs); ctx.lineTo(p[0], p[1]); ctx.lineTo(p[0]+bs, p[1]); }
        if (idx === 1) { ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0]+bs, p[1]); ctx.lineTo(p[0]+bs, p[1]+bs); }
        if (idx === 2) { ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0], p[1]+bs); ctx.lineTo(p[0]+bs, p[1]+bs); }
        if (idx === 3) { ctx.moveTo(p[0], p[1]+bs); ctx.lineTo(p[0]+bs, p[1]+bs); ctx.lineTo(p[0]+bs, p[1]); }
        ctx.stroke();
      });
      // Neon glow lines
      ctx.strokeStyle = 'rgba(0,240,255,.15)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(30, H * 0.15); ctx.lineTo(W - 30, H * 0.15); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,43,232,.1)';
      ctx.beginPath(); ctx.moveTo(30, H * 0.85); ctx.lineTo(W - 30, H * 0.85); ctx.stroke();
      break;
    }
    case 'clay': {
      // Rounded double border (like a handmade frame)
      ctx.strokeStyle = 'rgba(120,80,40,.12)';
      ctx.lineWidth = 4;
      if (ctx.roundRect) {
        ctx.beginPath(); ctx.roundRect(20, 20, W - 40, H - 40, 24); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(120,80,40,.06)';
      ctx.lineWidth = 2;
      if (ctx.roundRect) {
        ctx.beginPath(); ctx.roundRect(30, 30, W - 60, H - 60, 18); ctx.stroke();
      }
      // Fingerprint texture dots scattered lightly
      ctx.fillStyle = 'rgba(120,80,40,.03)';
      for (let i = 0; i < 80; i++) {
        const cx = 30 + Math.random() * (W - 60);
        const cy = 30 + Math.random() * (H - 60);
        ctx.beginPath();
        ctx.ellipse(cx, cy, 3 + Math.random() * 5, 2 + Math.random() * 3, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
      // "Handmade with ♥" at bottom
      ctx.fillStyle = 'rgba(120,80,40,.2)';
      ctx.font = '11px "Cormorant Garamond", serif';
      ctx.textAlign = 'center';
      ctx.fillText('handmade with ♥', W / 2, H - 14);
      break;
    }
  }
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════
// POSTER GENERATION
// ═══════════════════════════════════════════════════════════
async function generatePoster() {
  const shareBtn = $('btn-share');
  shareBtn.textContent = t().sharingBtn;
  shareBtn.disabled = true;
  try {
  const sceneImages = await Promise.all(scenes.map(s => {
    if (!s.dataUrl) return null;
    return new Promise(r => { const img = new Image(); img.onload = () => r(img); img.onerror = () => r(null); img.src = s.dataUrl; });
  }));

  const W = 1080;
  const PAD = 80;
  const IMG_W = W - PAD * 2;
  // Detect image aspect ratio from first available image
  const firstImg = sceneImages.find(img => img);
  const imgIsPortrait = firstImg ? firstImg.height > firstImg.width : window.innerWidth < window.innerHeight;
  const IMG_H = imgIsPortrait ? Math.round(IMG_W * 16 / 9) : Math.round(IMG_W * 9 / 16);
  const TEXT_GAP = 28;
  const LINE_H = 30;
  const SCENE_GAP = 56;
  const TITLE_AREA = 180;
  const FOOTER_AREA = 100;
  const maxLineW = IMG_W - 32;

  // Word wrap helper
  function wrapText(ctx, text, maxW) {
    const wrapped = [];
    // Try splitting by Chinese comma/period first, then by word
    const isChinese = /[\u4e00-\u9fff]/.test(text);
    if (isChinese) {
      let remaining = text;
      while (remaining && ctx.measureText(remaining).width > maxW) {
        let cut = remaining.length;
        while (cut > 1 && ctx.measureText(remaining.slice(0, cut)).width > maxW) cut--;
        wrapped.push(remaining.slice(0, cut));
        remaining = remaining.slice(cut);
      }
      if (remaining) wrapped.push(remaining);
    } else {
      const words = text.split(' ');
      let line = '';
      words.forEach(word => {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > maxW && line) {
          wrapped.push(line);
          line = word;
        } else {
          line = test;
        }
      });
      if (line) wrapped.push(line);
    }
    return wrapped;
  }

  // Pre-calculate wrapped lines for height calculation
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.font = '20px "EB Garamond", "Noto Serif SC", serif';

  const wrappedScenes = scenes.map(scene => {
    const allWrapped = [];
    (scene.lines || []).forEach(line => {
      wrapText(tempCtx, line, maxLineW).forEach(wl => allWrapped.push(wl));
    });
    return allWrapped;
  });

  // Calculate total height
  let totalH = TITLE_AREA;
  wrappedScenes.forEach(lines => {
    totalH += IMG_H + TEXT_GAP + lines.length * LINE_H + SCENE_GAP;
  });
  totalH += FOOTER_AREA - SCENE_GAP;

  const theme = POSTER_THEMES[selectedStyle] || POSTER_THEMES.watercolor;

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = totalH;
  const ctx = canvas.getContext('2d');

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, totalH);
  bgGrad.addColorStop(0, theme.bg[0]);
  bgGrad.addColorStop(1, theme.bg[1]);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, totalH);

  // Full-canvas decoration (scanlines, grids, corners, glow orbs)
  drawDecoration(ctx, theme, W, totalH, -1, 0, 0, 0);

  // Top watermark: 梦境画卷 + URL
  ctx.fillStyle = theme.watermark;
  ctx.font = `13px ${theme.titleFont.includes('monospace') ? 'monospace' : '"Cormorant Garamond", serif'}`;
  ctx.textAlign = 'center';
  ctx.fillText('梦境画卷 · DREAMSCAPE    dreamscape-e5s.pages.dev', W / 2, 32);

  // Dream title
  ctx.fillStyle = theme.title;
  ctx.font = `56px ${theme.titleFont}`;
  ctx.textAlign = 'center';
  ctx.fillText(dreamTitle, W / 2, 100);

  // Vertical divider
  ctx.strokeStyle = theme.divider;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W/2, 150); ctx.lineTo(W/2, 168); ctx.stroke();

  // Scenes — single column, image + text below
  let y = TITLE_AREA;
  scenes.forEach((scene, i) => {
    const img = sceneImages[i];

    // Image with rounded corners
    if (img) {
      ctx.save();
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(PAD, y, IMG_W, IMG_H, 12);
      else ctx.rect(PAD, y, IMG_W, IMG_H);
      ctx.clip();
      const scale = Math.max(IMG_W / img.width, IMG_H / img.height);
      const sw = img.width * scale, sh = img.height * scale;
      ctx.drawImage(img, PAD + (IMG_W - sw)/2, y + (IMG_H - sh)/2, sw, sh);
      ctx.restore();
    } else {
      ctx.fillStyle = theme.divider;
      ctx.fillRect(PAD, y, IMG_W, IMG_H);
    }

    y += IMG_H + TEXT_GAP;

    // Scene number + text
    ctx.fillStyle = theme.textLabel;
    ctx.font = 'italic 12px "Cormorant Garamond", serif';
    ctx.textAlign = 'left';
    ctx.fillText(String(i+1).padStart(2,'0'), PAD, y);

    ctx.fillStyle = theme.textColor;
    ctx.font = '20px "EB Garamond", "Noto Serif SC", serif';
    const lines = wrappedScenes[i];
    lines.forEach((line, li) => {
      ctx.fillText(line, PAD + 28, y + li * LINE_H);
    });

    y += lines.length * LINE_H + SCENE_GAP;
  });

  // Footer
  const footerY = totalH - FOOTER_AREA + 20;
  ctx.strokeStyle = theme.divider;
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(PAD, footerY); ctx.lineTo(W-PAD, footerY); ctx.stroke();

  const labels = { watercolor:'水彩 Watercolor', dreamcore:'梦核 Dreamcore', inkwash:'水墨 Ink Wash', pixel:'像素 Pixel Art', ghibli:'吉卜力 Ghibli', ukiyoe:'浮世绘 Ukiyo-e', cyberpunk:'赛博 Cyberpunk', clay:'黏土 Claymation' };
  ctx.fillStyle = theme.watermark;
  ctx.font = `italic 14px ${theme.titleFont.includes('monospace') ? 'monospace' : '"Cormorant Garamond", serif'}`;
  ctx.textAlign = 'center';
  ctx.fillText(labels[selectedStyle] || selectedStyle, W/2, footerY + 45);

  return canvas.toDataURL('image/jpeg', 0.95);
  } finally {
    shareBtn.textContent = t().shareBtn;
    shareBtn.disabled = false;
  }
}

async function generatePosterDataUrl() {
  return await generatePoster();
}

async function downloadPoster() {
  if (!posterDataUrl) return;

  // Try Web Share API first (mobile — lets user save to Photos)
  if (navigator.share && navigator.canShare) {
    try {
      const resp = await fetch(posterDataUrl);
      const blob = await resp.blob();
      const file = new File([blob], 'dreamscape-' + Date.now() + '.jpg', { type: 'image/jpeg' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    } catch (e) {
      if (e.name === 'AbortError') return; // user cancelled share
      // Fall through to download
    }
  }

  // Fallback: regular download
  const link = document.createElement('a');
  link.download = 'dreamscape-' + Date.now() + '.jpg';
  link.href = posterDataUrl;
  link.click();
}

// ═══════════════════════════════════════════════════════════
// TEST MODE
// ═══════════════════════════════════════════════════════════
function generatePlaceholderImage(index) {
  const c = document.createElement('canvas');
  c.width = 960; c.height = 540;
  const ctx = c.getContext('2d');
  const hues = [210, 30, 160, 280, 50, 340];
  const hue = hues[index % hues.length];
  const grad = ctx.createLinearGradient(0, 0, 960, 540);
  grad.addColorStop(0, `hsl(${hue},25%,18%)`);
  grad.addColorStop(0.5, `hsl(${hue+30},20%,25%)`);
  grad.addColorStop(1, `hsl(${hue+60},15%,15%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 960, 540);
  const cg = ctx.createRadialGradient(480, 270, 50, 480, 270, 300);
  cg.addColorStop(0, `hsla(${hue+15},30%,40%,0.3)`);
  cg.addColorStop(1, 'transparent');
  ctx.fillStyle = cg;
  ctx.fillRect(0, 0, 960, 540);
  ctx.fillStyle = 'rgba(232,224,212,.15)';
  ctx.font = '48px serif';
  ctx.textAlign = 'center';
  ctx.fillText('Scene ' + (index + 1), 480, 280);
  return c.toDataURL('image/png');
}

// ═══════════════════════════════════════════════════════════
// EVENT HANDLERS
// ═══════════════════════════════════════════════════════════

// Rotating placeholders
let phIdx = 0;
function updatePlaceholder() { const ph = t().placeholders; dreamInput.placeholder = ph[phIdx % ph.length]; }
updatePlaceholder();
let placeholderInterval = setInterval(() => { phIdx++; updatePlaceholder(); }, 5000);
dreamInput.addEventListener('focus', () => { clearInterval(placeholderInterval); });
dreamInput.addEventListener('blur', () => { placeholderInterval = setInterval(() => { phIdx++; updatePlaceholder(); }, 5000); });

// Style selector
document.querySelectorAll('.style-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelector('.style-btn.selected')?.classList.remove('selected');
    btn.classList.add('selected');
    selectedStyle = btn.dataset.style;
  });
});

// Enable/disable begin button
dreamInput.addEventListener('input', () => { beginBtn.disabled = !dreamInput.value.trim(); });

// Main generate
beginBtn.addEventListener('click', async () => {
  const dreamText = dreamInput.value.trim();
  if (!dreamText) return;

  showPhase('loading-phase');
  currentPct = 0; targetPct = 0;
  $('loading-ring').style.stroke = 'rgba(160,130,80,.6)';
  const lm = t().loadingMessages;
  setLoadingProgress(lm[0][0], '', 5);
  startFakeProgress();

  let script;
  try {
    script = await generateStory(dreamText);
  } catch (e) {
    console.warn('Gemini API failed:', e.message);
    if (e.message.includes('429') || e.message.includes('RESOURCE_EXHAUSTED')) {
      showQuotaError();
      return;
    }
    script = localFallback(dreamText);
  }

  dreamTitle = script.title;
  visualThread = script.visual_thread || '';
  setLoadingProgress(lm[1][0], '', 30);
  scenes = script.scenes.map(s => ({ ...s, dataUrl: null, imgLoading: false }));

  setLoadingProgress(lm[2][0], '', 55);
  try {
    scenes[0].imgLoading = true;
    scenes[0].dataUrl = await generateImage(scenes[0].image_prompt);
    scenes[0].imgLoading = false;
  } catch (err) {
    console.warn('Image 0 failed:', err.message);
    scenes[0].imgLoading = false;
    if (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED')) {
      showQuotaError();
      return;
    }
  }

  setLoadingProgress(lm[3][0], '', 90);
  stopFakeProgress();
  startCinematic();
  lazyLoadImage(1);
});

// Playback controls
$('ctrl-play').addEventListener('click', () => {
  isPlaying = !isPlaying;
  $('ctrl-play').innerHTML = isPlaying ? '&#10074;&#10074;' : '&#9654;';
  $('ctrl-play').setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
  if (isPlaying) {
    if (currentScene < 0) playScene(0);
    else if (currentScene >= scenes.length) startCinematic();
    else revealNextLine();
  } else {
    clearTimeout(lineTimer);
    clearTimeout(sceneTimer);
  }
});

$('ctrl-prev').addEventListener('click', () => playScene(Math.max(0, currentScene - 1)));
$('ctrl-next').addEventListener('click', () => {
  if (currentScene + 1 >= scenes.length) showEndScreen();
  else playScene(currentScene + 1);
});

$('progress-bar-container').addEventListener('click', (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  playScene(Math.min(Math.floor(((e.clientX - rect.left) / rect.width) * scenes.length), scenes.length - 1));
});

$('btn-restart').addEventListener('click', () => {
  $('cinema-end').style.display = 'none';
  $('cinema-img-a').style.opacity = '0';
  $('cinema-img-b').style.opacity = '0';
  clearTimeout(lineTimer);
  clearTimeout(sceneTimer);
  scenes = [];
  dreamTitle = '';
  dreamInput.value = '';
  interpretationCache = null;
  $('interpret-panel').style.display = 'none';
  showPhase('input-phase');
  beginBtn.disabled = true;
});

$('btn-share').addEventListener('click', downloadPoster);

// Dream interpretation
let interpretationCache = null;
$('btn-interpret').addEventListener('click', async () => {
  const panel = $('interpret-panel');
  const textEl = $('interpret-text');

  // Toggle if already showing
  if (panel.style.display !== 'none' && interpretationCache) {
    panel.style.display = 'none';
    return;
  }

  // Show panel with loading state
  panel.style.display = 'block';
  textEl.textContent = t().interpretLoading;

  if (interpretationCache) {
    textEl.textContent = interpretationCache;
    return;
  }

  await runInterpretation();
});

function getStoryText() {
  return scenes.map(s => s.lines?.join(' ')).join('\n');
}

function buildInterpretPrompt(dreamText) {
  const text = dreamText || getStoryText();
  return `Interpret this dream in 3-5 sentences MAX. Be casual and specific. No filler, no restating the dream. Jump straight to what it might mean.

Dream: ${text}

Rules:
- 3-5 sentences TOTAL. Not paragraphs — sentences.
- Do NOT repeat or summarize the dream content back
- Jump straight to interpretation: what the key symbols likely mean, and one real-life insight
- Plain language only. No "原型", "潜意识", "象征着", "inner self", "subconscious"
- ${/[\u4e00-\u9fff]/.test(text) ? 'Respond entirely in Chinese.' : 'Respond entirely in English.'}`;
}

async function runInterpretation(customPrompt) {
  const panel = $('interpret-panel');
  const textEl = $('interpret-text');
  panel.style.display = 'block';
  textEl.textContent = t().interpretLoading;
  interpretationCache = null;

  const prompt = customPrompt || buildInterpretPrompt();
  try {
    const resp = await fetch('/api/story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 2000 },
      }),
    });
    const data = await resp.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const text = parts.map(p => p.text || '').join('');
    interpretationCache = text.trim();
    textEl.textContent = interpretationCache;
  } catch (e) {
    textEl.textContent = t().interpretFail;
  }
}

// Debug panel — toggle with D key on end screen
document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyD' && $('cinema-end').style.display === 'flex') {
    const dp = $('debug-panel');
    if (dp.style.display === 'none') {
      dp.style.display = 'block';
      $('debug-prompt').value = buildInterpretPrompt();
    } else {
      dp.style.display = 'none';
    }
  }
});

$('debug-run').addEventListener('click', () => {
  runInterpretation($('debug-prompt').value);
});

$('debug-reset').addEventListener('click', () => {
  $('debug-prompt').value = buildInterpretPrompt();
});

// Test interpret from home page
// Tip modal
$('btn-tip').addEventListener('click', () => { $('tip-modal').style.display = 'flex'; });
$('tip-close').addEventListener('click', () => { $('tip-modal').style.display = 'none'; });
$('tip-modal').addEventListener('click', (e) => { if (e.target === $('tip-modal')) $('tip-modal').style.display = 'none'; });

// Loading back button
$('loading-back-btn').addEventListener('click', () => { showPhase('input-phase'); });

// Click cinema text to reveal all lines in current scene
$('cinema-text').addEventListener('click', () => {
  const lines = document.querySelectorAll('#cinema-text .scene-line:not(.visible)');
  if (!lines.length) return;
  clearTimeout(lineTimer);
  lines.forEach(el => el.classList.add('visible'));
  currentLine = document.querySelectorAll('#cinema-text .scene-line').length;
  updateProgressBar();
  sceneTimer = setTimeout(() => { if (isPlaying) playScene(currentScene + 1); }, 2000);
});

// Keyboard
document.addEventListener('keydown', (e) => {
  if (!$('cinematic-phase').classList.contains('active')) return;
  if (e.code === 'Space') { e.preventDefault(); $('ctrl-play').click(); }
  else if (e.code === 'ArrowLeft') $('ctrl-prev').click();
  else if (e.code === 'ArrowRight') $('ctrl-next').click();
});
