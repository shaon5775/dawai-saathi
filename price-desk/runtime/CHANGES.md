# Changes to the nsDeploy browser runtime

Copied from https://github.com/cognizant-ai-labs/agentic-web (examples/pizza_restaurant_agentified/runtime, commit 5ae89a3, 12 Nov 2026), Apache-2.0 (see LICENSE.txt).

Modified by the Dawai Saathi project (13 Nov 2026) in `llm.js` (`_readSse`), `kernel.js` and `cruse.js`:

1. **Gemini 3 thought signatures.** Gemini's OpenAI-compatible endpoint returns `extra_content.google.thought_signature` on each tool call and rejects the next request (HTTP 400, *Function call is missing a thought_signature*) unless it is sent back. The runtime now keeps `extra_content` on the tool call.
2. **Parallel tool calls without distinct `index`.** Gemini can stream several complete tool calls that all omit `index`. They were appended into one slot (`jan_aushadhi_lookupjan_aushadhi_lookup`), causing HTTP 400 *INVALID_ARGUMENT*. Deltas are now routed by tool-call `id`, and repeated full names/arguments replace instead of append.

3. **Duplicate agent names** (`kernel.js`, `validateNetwork`). The MVP spec (3.1) requires rejecting duplicate agent definitions; the agent map silently kept the last one. Duplicates are now reported as validation errors, so the network never runs.

4. **CRUSE forms without the `properties` wrapper** (`cruse.js`, `normalizePresentation`). Gemini often sends `schema: {field: {type, title}, ...}` instead of `schema: {type: "object", properties: {...}}`, and the whole form was dropped as invalid (the user saw "Render Cruse could not complete" and waited longer). The wrapper is now rebuilt, but only when every entry is a real field object; anything else is still rejected. Note: the optional LangChain bundle (`generated/agent-runner.bundle.js`, used only with `?runner=langchain`) is unchanged.

