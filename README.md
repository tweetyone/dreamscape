# Dreamscape 梦境画卷

A dream visualization web app. Describe your dream, choose a visual style, and watch it come alive as a cinematic sequence of AI-generated illustrations and narration.

**Live demo**: [dreamscape-e5s.pages.dev](https://dreamscape-e5s.pages.dev)

## Features

- **7 visual styles**: Watercolor, Dreamcore, Pixel Art, Ghibli, Ukiyo-e, Cyberpunk, Claymation
- **AI story generation**: Gemini 2.5 Flash turns your dream into a flowing narrative
- **AI image generation**: Imagen 4.0 creates illustrations matching each scene
- **Cinematic auto-play**: Scenes play with crossfade transitions and brush-reveal effects
- **Dream interpretation**: AI interprets your dream after playback
- **Themed poster export**: Download a styled poster with all scenes
- **Lazy loading**: Images generate on-demand as you watch
- **Bilingual**: Chinese and English with auto-detection
- **Responsive**: Works on desktop and mobile

## Deploy to Cloudflare Pages

1. Fork this repo
2. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. Select the `dreamscape` repo
4. Set **Build output directory** to `public`
5. Deploy
6. Go to **Settings → Environment variables** → Add `GEMINI_KEY` = your Gemini API key
7. Redeploy

Get a Gemini API key at [aistudio.google.com](https://aistudio.google.com).

## Local Development

```bash
cp .env.example .env
# Edit .env and add your GEMINI_KEY
npx wrangler pages dev public
```

## Tech Stack

- Vanilla HTML/CSS/JS (no framework)
- Google Gemini 2.5 Flash (story generation)
- Google Imagen 4.0 Fast (image generation)
- Cloudflare Pages Functions (API proxy)

## Feedback

Found a bug or have a suggestion? [Open an issue](https://github.com/tweetyone/dreamscape/issues).

## Support

🧋 If you enjoy this project, consider [buying the author a boba tea](https://dreamscape-e5s.pages.dev) — the tokens are running low!
