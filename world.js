// world.js — the keepsake scenes: graveyard, graveyard grounds, Bram’s cottage, celebrations,
// constellation, aquarium, bookshelf, garden, Hollowbrook village, the chapel (stained glass), the bell tower, Hawkins
// (the map, the Wheelers’ house and basement, the blanket fort). Web app only; AO3 never loads this.
// app.js loads this folder the first time a keepsake is opened and calls __ao3WorldInit once, handing over the
// tracker helpers listed below. Nothing in here touches AO3 pages.
//
// How the folder fits together
//   world.js               this file: the router and the few helpers every scene shares
//   <scene>.js             one file per scene (graveyard.js, village.js, chapel.js, ...)
//   lib/<name>.js          code that more than one scene needs (graveyard data, bell audio, the Hawkins scaffolding, the two figures)
//   manifest.json          every file, in load order (used by build.js and by whatever loads the folder)
//   build.js               optional: glues the folder back into one file, dist/world.js, which can be shipped under the old name
//
// Every other file registers one factory on window.__ao3WorldModules and does nothing else until __ao3WorldInit runs, so the
// files can be loaded in any order, as long as all of them are loaded before __ao3WorldInit is called. A factory receives:
//   ctx.core    the tracker helpers app.js hands over (getTracked, nvEnsureCss, gyStore, ...)
//   ctx.shared  helpers defined below that every scene may use
//   ctx.lib     the shared lib/ modules, started the first time something asks for them
//   ctx.world   the router: every scene's opener. The scenes open each other, so a scene must look an opener up when it is
//               called (world.openChapel()), never when it starts.
window.__ao3WorldInit = function (core) {
  'use strict';
  const mods = window.__ao3WorldModules || {};

  // ── shared helpers ──
  function gyHash(str) { let h = 0; for (const ch of String(str)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }
  const shared = { gyHash };

  // ── the router ──
  const world = {};
  const libs = {}, starting = {};
  const ctx = { core, shared, world, lib: {} };
  const start = key => {
    try { return mods[key](ctx); }
    catch (e) { e.message = "world: could not start " + key + ": " + e.message; throw e; }
  };
  Object.keys(mods).filter(k => k.indexOf("lib/") === 0).forEach(k => {
    const name = k.slice(4);
    Object.defineProperty(ctx.lib, name, { enumerable: true, get() {
      if (!(name in libs)) {
        if (starting[name]) throw new Error("world: lib/" + name + " depends on itself");
        starting[name] = true;
        try { libs[name] = start(k); } finally { starting[name] = false; }
      }
      return libs[name];
    } });
  });
  Object.keys(mods).filter(k => k.indexOf("lib/") !== 0).forEach(k => Object.assign(world, start(k)));

  // ── 🪟 STAINED GLASS ──
  // The old stand-alone stained-glass page is now the big window inside the chapel (chapel.js).
  // The name stays so existing buttons keep working.
  function openStainedGlass() { return world.openChapel(); }
  world.openStainedGlass = openStainedGlass;

  const PUBLIC = ["openGraveyard", "openGraveyardGrounds", "openCelebration", "openConstellation", "openAquarium", "openBookshelf", "openGarden", "openStainedGlass", "openHollowbrook", "openChapel", "openBellTower", "openHawkins", "openWheelers", "openBasement", "openBasementFort", "openFortInside", "openSoftLanding"];
  const missing = PUBLIC.filter(n => typeof world[n] !== "function");
  if (missing.length) throw new Error("world: missing " + missing.join(", ") + ". Load every file listed in manifest.json before calling __ao3WorldInit.");
  try { void ctx.lib["hawkins-kit"]; } catch (e) {}      // start the shared environment now so the real Prague weather is fetched before any scene opens
  const api = {};
  PUBLIC.forEach(n => { api[n] = world[n]; });
  return api;
};
