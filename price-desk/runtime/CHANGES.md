# Changes to the nsDeploy browser runtime

Copied from https://github.com/cognizant-ai-labs/agentic-web (examples/pizza_restaurant_agentified/runtime, commit 5ae89a3, 12 Nov 2026), Apache-2.0 (see LICENSE.txt).

Modified by the Dawai Saathi project (13 Nov 2026), only in `llm.js` (`_readSse`):

1. **Gemini 3 thought signatures.** Gemini's OpenAI-compatible endpoint returns `extra_content.google.thought_signature` on each tool call and rejects the next request (HTTP 400, *Function call is missing a thought_signature*) unless it is sent back. The runtime now keeps `extra_content` on the tool call.
2. **Parallel tool calls without distinct `index`.** Gemini can stream several complete tool calls that all omit `index`. They were appended into one slot (`jan_aushadhi_lookupjan_aushadhi_lookup`), causing HTTP 400 *INVALID_ARGUMENT*. Deltas are now routed by tool-call `id`, and repeated full names/arguments replace instead of append.

3. **Duplicate agent names** (`kernel.js`, `validateNetwork`). The MVP spec (3.1) requires rejecting duplicate agent definitions; the agent map silently kept the last one. Duplicates are now reported as validation errors, so the network never runs.

