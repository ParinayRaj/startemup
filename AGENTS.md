<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- AI calls run the Gemma 4 model through the Google Gemini API (`GEMINI_API_KEY` secret) from authenticated server functions in `src/lib/ai.functions.ts`; the key stays server-side and the browser uses `src/lib/api.ts`.
- UI copy must describe where AI runs truthfully (hosted Gemma 4 via the Gemini API, not "local"), because users' ideas and documents are sent to Google.
- Signed-in pages live under `src/routes/_authenticated/`; user data is read/written from the browser client with per-user RLS (`user_id = auth.uid()`), and eligibility files go to the private `eligibility-docs` bucket under `<user_id>/`.
- Economic Times market data uses an authenticated server function and the Anakin connector gateway, with browser-driven polling of validated job IDs; this keeps connector credentials private and avoids long-running server requests.
