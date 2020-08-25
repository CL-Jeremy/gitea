/**
 * Detect support for emoji character sets.
 * https://github.com/danalloway/detect-emoji-support
 *
 * Copyright (c) 2007 Dan Alloway <dan@micahsix.com>
 */

/*
 * Copyright 2020 The Gitea Authors
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 * This version has been adapted by Gitea to test for color emoji.
 */

'use strict';

const fontSpec = '32px Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, Twemoji Mozilla';

function detect() {
    if (detect.cache !== null) {
        return detect.cache
    }

    if (typeof window === 'undefined') {
        return false;
    }

    var node = window.document.createElement('canvas');
    var ctx = node.getContext('2d');
    if (!ctx) {
        return false;
    }
    var backingStoreRatio =
        ctx.webkitBackingStorePixelRatio ||
        ctx.mozBackingStorePixelRatio ||
        ctx.msBackingStorePixelRatio ||
        ctx.oBackingStorePixelRatio ||
        ctx.backingStorePixelRatio ||
        1;
    var offset = 12 * backingStoreRatio;

    ctx.fillStyle = '#f00';
    ctx.textBaseline = 'top';
    ctx.font = fontSpec;
    ctx.fillText('\ud83d\udc28', 0, 0); // U+1F428 KOALA

    var support = ctx.getImageData(offset, offset, 1, 1).data[0] % 255 !== 0; // red or black

    detect.cache = support

    return support;
};

detect.cache = null;

module.exports = detect;
