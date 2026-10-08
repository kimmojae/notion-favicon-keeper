// Favicon Keeper for Notion
//
// Notion swaps the tab favicon to each page's emoji/image icon, which makes
// Notion tabs hard to spot. This pins the favicon to Notion's default icon
// and keeps Notion from changing it.

// Notion's default favicon, served by Notion itself, so the extension
// doesn't need to bundle an icon file.
const FAVICON_URL = "https://www.notion.so/images/favicon.ico";
const FAVICON_TYPE = "image/x-icon";

const ICON_LINK_SELECTOR = "link[rel~='icon']";

function isIconLink(node) {
  return node instanceof HTMLLinkElement && node.relList.contains("icon");
}

function pin(link) {
  if (link.getAttribute("href") !== FAVICON_URL) link.href = FAVICON_URL;
  // A leftover type (e.g. image/png from a page's image icon) could make
  // Chrome skip the link.
  if (link.type !== FAVICON_TYPE) link.type = FAVICON_TYPE;
}

// Notion changes the favicon by editing the icon <link>'s href in place.
// Chrome starts loading the new icon as soon as href changes, so reverting
// it afterwards (even in the same microtask) still flashes the page's emoji.
// Instead, rewrite the value before it ever reaches the element. This needs
// the script to run in the page's own JS world ("world": "MAIN").
const hrefProperty = Object.getOwnPropertyDescriptor(
  HTMLLinkElement.prototype,
  "href"
);
Object.defineProperty(HTMLLinkElement.prototype, "href", {
  ...hrefProperty,
  set(value) {
    hrefProperty.set.call(this, isIconLink(this) ? FAVICON_URL : value);
  },
});

const setAttribute = Element.prototype.setAttribute;
Element.prototype.setAttribute = function (name, value) {
  if (isIconLink(this)) {
    const attr = String(name).toLowerCase();
    if (attr === "href") value = FAVICON_URL;
    else if (attr === "type") value = FAVICON_TYPE;
  }
  return setAttribute.call(this, name, value);
};

// Fallback for any other way the icon changes: snaps href/type back when an
// icon <link> is edited in place.
const linkObserver = new MutationObserver((mutations) => {
  for (const { target } of mutations) {
    if (isIconLink(target)) pin(target);
  }
});

function pinAll() {
  // Notion may remove its icon <link> without adding a new one.
  if (!document.head.querySelector(ICON_LINK_SELECTOR)) {
    const link = document.createElement("link");
    link.rel = "icon";
    document.head.append(link);
  }

  for (const link of document.head.querySelectorAll(ICON_LINK_SELECTOR)) {
    pin(link);
    // Re-observing an already observed node just replaces its options.
    linkObserver.observe(link, { attributeFilter: ["href", "type"] });
  }
}

// Catches Notion adding, removing, or replacing icon <link> elements.
const headObserver = new MutationObserver((mutations) => {
  const iconLinkChanged = mutations.some(
    ({ addedNodes, removedNodes }) =>
      [...addedNodes].some(isIconLink) || [...removedNodes].some(isIconLink)
  );
  if (iconLinkChanged) pinAll();
});

function start() {
  pinAll();
  headObserver.observe(document.head, { childList: true });
}

if (document.head) {
  start();
} else {
  // At document_start, <head> may not have been parsed yet.
  new MutationObserver((_mutations, observer) => {
    if (document.head) {
      observer.disconnect();
      start();
    }
  }).observe(document.documentElement, { childList: true });
}
