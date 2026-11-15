# Repository instructions

- Follow the project owner's branch, review and release requirements supplied in the conversation.
- Work on a focused task branch. Do not publish versions or tags without explicit approval.
- Keep APKs, DEX files, engines, credentials and local runtime output under ignored `.local/` paths.
- Distinguish static strings, parsed metadata, decompiled code and observed HTTP behavior. Record artifact hashes and evidence locations.
- Run `node --test tests/*.test.mjs` after changing discovery behavior. Regenerate dependent evidence and documentation for the same artifact.
- Do not claim that an endpoint is callable until request construction and a real response have been verified.

- Never commit real account identifiers, test thread/post/forum targets, usernames, portraits, personal paths, credentials, raw responses or recovery lists. Public protocol constants and source citations may remain.
- Keep real runtime data only in ignored `.local/` paths or local environment variables. Use explicit synthetic offline fixtures; never relabel synthetic observations as live results.
- Run `npm.cmd run check:privacy` and `node scripts/check-privacy.mjs --staged` before committing. A clean result does not replace review of the actual diff. Do not rewrite shared history without explicit authorization.
