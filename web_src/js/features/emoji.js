import emojis from '../../../assets/emoji.json';
import emojiSupport from '../vendor/detect-emoji-support.js';

const {StaticUrlPrefix} = window.config;

const tempMap = {gitea: ':gitea:'};
for (const {emoji, aliases} of emojis) {
  for (const alias of aliases || []) {
    tempMap[alias] = emoji;
  }
}

export const emojiKeys = Object.keys(tempMap).sort((a, b) => {
  if (a === '+1' || a === '-1') return -1;
  if (b === '+1' || b === '-1') return 1;
  return a.localeCompare(b);
});

export const emojiMap = {};
for (const key of emojiKeys) {
  emojiMap[key] = tempMap[key];
}

// retrieve HTML for given emoji name
export function emojiHTML(name) {
  let inner;
  if (name === 'gitea') {
    inner = `<img alt=":${name}:" src="${StaticUrlPrefix}/img/emoji/gitea.png">`;
  } else if (!emojiSupport() && emojiMap[name]) {
    inner = twemojiInnerHTML(emojiMap[name]);
  } else {
    inner = emojiString(name);
  }

  return `<span class="emoji" title=":${name}:">${inner}</span>`;
}

// retrieve string for given emoji name
export function emojiString(name) {
  if (!emojiMap[name] || !emojiSupport()) return `:${name}:`;
  return emojiMap[name];
}

export function twemojiInnerHTML(emojiString) {
  const twemoji = Array.from(emojiString)
    .map((c) => c.codePointAt(0).toString(16))
    .join('-')
    .replace(/^(.{4})-.*/, '$1')
    .replace(/^(.{2})-fe0f(.*)/, '$1$2');

  return `<img alt="${emojiString}" src="https://twemoji.maxcdn.com/v/latest/svg/${twemoji}.svg">`;
}

function replaceOnReady() {
  if (emojiSupport()) return;
  document.querySelectorAll('.emoji, .reaction').forEach((e) => {
    if (e.textContent) e.innerHTML = twemojiInnerHTML(e.textContent);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.fonts) {
    document.fonts.ready.then(replaceOnReady);
  } else {
    replaceOnReady();
  }
});
