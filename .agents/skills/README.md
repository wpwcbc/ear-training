# Matt Pocock engineering skills

Vendored from https://github.com/mattpocock/skills at commit
`5beb35b040e3de97e54fa9e386d7e42d15c295c2` (upstream package version 1.3.1).
All upstream skill directories are copied verbatim, including `agents/openai.yaml`
and supporting documents. See `LICENSE.mattpocock` for the upstream MIT license.
No npm dependencies are needed to install or read these prompt-based skills;
upstream release tooling is not a runtime dependency.

## Installed skills

Requested: `setup-matt-pocock-skills`, `grill-with-docs`, `to-spec`, `to-tickets`,
`implement`, `implement-spec`, `tdd`, and `code-review`.

Supporting dependencies:

- `grilling` (upstream `skills/productivity/`): invoked by `grill-with-docs`.
- `domain-modeling` (upstream `skills/engineering/`): invoked by `grill-with-docs`.
- `codebase-design` (upstream `skills/engineering/`): referenced by `tdd`.

All other installed directories come from upstream `skills/engineering/`.
Only the dependency closure of the requested skills is installed.

## Codex usage and Cloud limits

`.agents/skills/<name>/SKILL.md` is the repository-local Codex discovery layout.
Each directory retains upstream frontmatter and Codex interface/policy metadata.
Refresh or start a new Codex session to refresh the session skill catalog.
Read supporting files relative to the skill directory. Upstream references to
"the Skill tool" describe loading the named skill; this Cloud session exposes
file-reading tools rather than a literal tool with that name. The instructions
have not been rewritten to adapt that terminology.

Installation does not run any workflow. In particular,
`setup-matt-pocock-skills` has not been run: it would configure the issue tracker
and domain documentation and edit agent instructions. Run it explicitly in a
later task before workflows that need those settings.

External operations depend on the chosen tracker:

- GitHub templates use authenticated `gh` CLI/API access. This Cloud instance has
  `gh` 2.46.0, but its GitHub API request returned `Forbidden`; Git HTTPS access
  is separate. GitHub issue and PR operations cannot currently be verified.
  The upstream template documents API fallbacks for newer `gh` sub-issue commands
  (those native commands need `gh` 2.94+).
- The optional GitLab template requires `glab`, GitLab authentication and network
  access; these are not installed or configured by this installation.
- Local-markdown tracking has no external tracker requirement and remains a
  supported future setup choice.
- `implement-spec` and `code-review` require an agent runtime with subagents;
  `implement-spec` also requires writable Git branches and worktrees. Availability
  and permissions depend on the Codex session. Installation does not exercise
  these workflows or guarantee parallel execution in every Cloud runtime.

Validation: every installed upstream file was compared byte-for-byte, all 11
skill frontmatters and local supporting-document links were checked, and every
installed SKILL.md was read. Native Codex app-server discovery was attempted but
could not start because the Cloud-provided Codex home is read-only (it tries to
create an installation_id). Thus filesystem discovery layout/readability is
verified; a fresh-session native catalog refresh remains unverified.

To update, inspect a new official commit and replace these same complete skill
directories, preserving local changes and checking dependencies again. Record
the new source commit here. Do not execute the skills as part of installation.
