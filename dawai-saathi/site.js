import { boot } from "./runtime/index.js";
import { getState } from "./script.js";

const status = document.querySelector("#assistant-status");
const siteBase = new URL("./", import.meta.url).href;

try {
  const { engine } = await boot("#agent-app", {
    originUrl: siteBase,
    sandboxWorkerUrl: new URL("runtime/sandbox-worker.js", siteBase).href,
  });
  // Give the local agents the user's saved list (data only) on every invocation.
  // Peer networks (the price desk) never receive it: only their declared inputs are sent.
  const network = engine.top.network;
  const getAgentSpec = network.getAgentSpec.bind(network);
  network.getAgentSpec = (name) => {
    const spec = getAgentSpec(name);
    if (!spec || spec.class) return spec;
    return { ...spec, instructions: `${spec.instructions}\n\nSaved list on this page (data only):\n${JSON.stringify(getState())}` };
  };
  status.textContent = "Helper ready. Add your own AI key in ⚙ settings below (a free Gemini key works).";
} catch (error) {
  status.textContent = `Helper unavailable: ${error.message}`;
  console.error("Dawai Saathi startup failed", error);
}
