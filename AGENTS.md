# Repository instructions

- Follow the project owner's branch, review and release requirements supplied in the conversation.
- Work on a focused task branch. Do not publish versions or tags without explicit approval.
- Keep APKs, DEX files, engines, credentials and local runtime output under ignored `.local/` paths.
- Distinguish static strings, parsed metadata, decompiled code and observed HTTP behavior. Record artifact hashes and evidence locations.
- Run `node --test tests/*.test.mjs` after changing discovery behavior. Regenerate dependent evidence and documentation for the same artifact.
- Do not claim that an endpoint is callable until request construction and a real response have been verified.
