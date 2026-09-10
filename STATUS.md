# Tilth integration status

Updated 10 September 2026. Active branch: `codex/tilth-integration`, published directly to `shresthkapoor7/tilth`. Teammate main is unchanged by this task.

- Feature commit `350219b` adds bottom dialogue, contextual thoughts and witnessed Rowan memory with a movement consequence, while preserving Tilth's world, character creator, saves and generation queue.
- All 41 tests and the documented Windows-compatible build passed at that feature checkpoint.
- The local server now reads the existing Notebook World API key from Tilth's ignored `.env`, using `gpt-5.6-terra`. Authentication and real generation succeeded. No credential is committed or pushed.
- The browser walkthrough generated, accepted and completed **Rowan’s Ember Test** (smithy visit and Cinder Cleave), then received **Ashes in Motion** (inn visit and Ash Cyclone) automatically. The follow-up is offered in the local preview. A server-busy response recovered through explicit retry.
- Quests currently track room visits and combos. Generated location/order prose adds no corresponding runtime constraint. Item delivery, real combat damage and notebook object/law mechanics remain unimplemented in this branch.
- [Playable illustrated inn](docs/ART_STUDY.md) now implements a bounded portion of the [art-port proposal](docs/ART_PORT.md): drawn furniture, portrait, directional walk/turn frames, continuous inn movement, depth compositing and an Ink/Pixel comparison. Saved appearance remains available; full illustrated customization is pending. All 45 tests and the documented build pass. Browser checks verified collision, comparison switches, a recognized bow combo and the normal exit into the village.

See [integration notes](docs/INTEGRATION.md) for merge boundaries, validation and local run commands. Preview: http://127.0.0.1:5174/ . Other machines need their own server-side environment configuration; Git does not carry the local key.
