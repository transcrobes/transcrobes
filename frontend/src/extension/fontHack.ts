export const fontHack = `
@font-face {
    font-family: 'mashanzheng';
    src: url('${chrome.runtime.getURL("/static/MaShanZheng-Regular.ttf")}') format('truetype');
    font-weight: normal;
    font-style: normal;
}
@font-face {
    font-family: 'notasanslight';
    src: url('${chrome.runtime.getURL("/static/NotoSansSC-Light.otf")}') format('opentype');
    font-weight: normal;
    font-style: normal;
}
@font-face {
    font-family: 'notaserifextralight';
    src: url('${chrome.runtime.getURL("/static/NotoSerifSC-ExtraLight.otf")}') format('opentype');
    font-weight: normal;
    font-style: normal;
}
@font-face {
    font-family: 'notaserifregular';
    src: url('${chrome.runtime.getURL("/static/NotoSerifSC-Regular.otf")}') format('opentype');
    font-weight: normal;
    font-style: normal;
}
@font-face {
    font-family: 'notasansregular';
    src: url('${chrome.runtime.getURL("/static/NotoSansSC-Regular.otf")}') format('opentype');
    font-weight: normal;
    font-style: normal;
}
@font-face {
    font-family: 'opendyslexic';
    src: url('${chrome.runtime.getURL("/static/opendyslexic-regular-webfont.woff2")}') format('woff2'),
         url('${chrome.runtime.getURL("/static/opendyslexic-regular-webfont.woff")}') format('woff');
    font-weight: normal;
    font-style: normal;
}
`;
