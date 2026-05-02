

function spaceHtml(target, whitespace) {
    const space = target.querySelectorAll('.whitespace');
    const char = target.querySelectorAll('.char');
    if (space.length && whitespace)
        space.forEach(item => item.outerHTML = ' ');

    if (char.length)
        char.forEach((item , index) => {
            item.classList.add("dsn-chars-wrapper");
            item.style.setProperty("--char-dsn-index" , index);
        });
    ;




}

export const splittingChar = (target, whitespace = true) => {
    const el = Splitting({target: target, whitespace: false})[0];
    spaceHtml(target, whitespace);
    return el;
}

export const splittingWords = (target, whitespace = true) => {
    const el = Splitting({target: target, by: 'words'})[0];
    spaceHtml(target, whitespace);

    return el;
}

export const splittingLine = (target, whitespace = true) => {
    const el = Splitting({target: target, by: 'lines'})[0];
    spaceHtml(target, whitespace);
    return el;
}

export const splittingItems = (target, matching = null) => {
    return Splitting({target, by: 'items', matching});
}
export const splittingGrid = (target, matching = null) => {
    return Splitting({target, by: 'grid', matching});
}







const dsnSplitting = {
    Char: splittingChar,
    Words: splittingWords,
    Lines: splittingLine,
    Items: splittingItems,
    Grid: splittingGrid,
}


export default dsnSplitting;