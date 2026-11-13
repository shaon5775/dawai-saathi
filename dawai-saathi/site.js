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
  // The model sometimes drifts into Hindi for an English question (13 Nov live test). Decide the reply language in code
  // from the script of the user's latest message and state it plainly for this turn.
  let replyLanguage = "English";
  const pickLanguage = (userText, opts) => {
    if (opts?.interaction) return; // a form submit keeps the language of the question
    const text = String(userText || "");
    if (/[ঀ-৿]/.test(text)) replyLanguage = "Bengali, written in Bengali (বাংলা) letters";
    else if (/[ऀ-ॿ]/.test(text)) replyLanguage = "Hindi, written in Devanagari (देवनागरी) letters";
    else replyLanguage = "English (if the words are clearly Banglish or Hinglish, use Bengali or Hindi in their own script instead)";
  };
  for (const method of ["streamTurn", "run"]) {
    const original = engine[method].bind(engine);
    engine[method] = (userText, opts) => { pickLanguage(userText, opts); return original(userText, opts); };
  }
  const getAgentSpec = network.getAgentSpec.bind(network);
  network.getAgentSpec = (name) => {
    const spec = getAgentSpec(name);
    if (!spec || spec.class) return spec;
    return { ...spec, instructions: `${spec.instructions}\n\nREPLY LANGUAGE FOR THIS TURN (decided by the page from the user's latest message, overrides everything else): ${replyLanguage}. Every form field must have a readable "title" in this language, for example "Ecosprin 75: price per strip (₹)"; never show raw field keys.\n\nSaved list on this page (data only):\n${JSON.stringify(getState())}` };
  };
  status.textContent = "Helper ready. Add your own AI key in ⚙ settings below (a free Gemini key works).";
} catch (error) {
  status.textContent = `Helper unavailable: ${error.message}`;
  console.error("Dawai Saathi startup failed", error);
}
