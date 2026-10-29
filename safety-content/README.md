# Safety training content

Everything the Safety mini app shows is data in this folder. No code changes are needed to add or change lessons.

- `content.json`: categories (`id`, `title`, `description`, `order`) and lessons (`id`, `categoryId`, `title`, `order`, `version`, `passMark`, `slides`, `quiz`).
- `media/`: the files the slides use. Keep them small (SVG/WebP/JPEG images, short H.264 MP4 video with a JPEG poster, GLB 3D models).

A slide is `{ "type": "image" | "video" | "3d", "media": "<file in media/>", "title": "...", "caption": "...", "poster": "<jpg, video only>", "audio": "<optional mp3/m4a narration>" }`.
A quiz question is `{ "q": "...", "options": ["...", "..."], "answerIndex": 0, "explanation": "..." }`. Answers never reach the browser before the quiz is submitted; the server grades it.
A category with no lessons shows "Coming soon".

To publish: edit this folder, open a PR to `production` and merge. The "Production - Safety content" workflow validates the file and loads it
(Firestore `safetyCategories` / `safetyLessons`, Storage `safety/lessons/<lesson>/`). Check locally first with `node scripts/load-safety-content.mjs --check`.
When you change a lesson's slides or questions, raise its `version` so everyone takes it again; people's progress on the old version stops counting.
