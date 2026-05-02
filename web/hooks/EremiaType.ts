export type styleBox = "line" | "corner" | "list" | undefined;
export type backgroundColor = "background-section" | "background-main" | "background-theme" | undefined;
export type stylePortfolio = "work-section" | "work-section work-no-scale" | "work-classic";
export type MetaData = string[] | ["description" | "title" | 'button' | 'meta'];
export type dataProjectProps = {
    id: number,
    title: string,
    href?: object,
    slug?: string,
    category?: string[],
    description?: string,
    src?: string,
    overlay?: number,
}

export type justifyContent = 'start' | 'center' | 'end' | 'between'

export type NativeFancyboxOption = {
    preload?: number,
    infinite?: boolean,
    group?: string | false,
    showClass?: string | false,
    hideClass?: string | false,
    animated?: boolean,
    hideScrollbar?: boolean,
    autoFocus?: boolean,
    trapFocus?: boolean,
    placeFocusBack?: boolean,
    mainClass?: string,
    click?: string | void,
    closeButton?: string,
    dragToClose?: boolean,
    keyboard?: object | false | {
        Escape: "close",
        Delete: "close",
        Backspace: "close",
        PageUp: "next",
        PageDown: "prev",
        ArrowUp: "next",
        ArrowDown: "prev",
        ArrowRight: "next",
        ArrowLeft: "prev",
    },
    template?: object | {
        // Close button icon
        closeButton:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" tabindex="-1"><path d="M20 20L4 4m16 0L4 20"/></svg>',
        // Loading indicator icon
        spinner:
            '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="25 25 50 50" tabindex="-1"><circle cx="50" cy="50" r="20"/></svg>',
        // Main container element
        main: null,
    },
    l10n?: object | {
        CLOSE: "Close",
        NEXT: "Next",
        PREV: "Previous",
        MODAL: "You can close this modal content with the ESC key",
        ERROR: "Something Went Wrong, Please Try Again Later",
        IMAGE_ERROR: "Image Not Found",
        ELEMENT_NOT_FOUND: "HTML Element Not Found",
        AJAX_NOT_FOUND: "Error Loading AJAX : Not Found",
        AJAX_FORBIDDEN: "Error Loading AJAX : Forbidden",
        IFRAME_ERROR: "Error Loading Page",
    },
    groupAll?: boolean,
    groupAttr?: string | false,
    caption?(): string | null

}

export type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "span" | "p" | "div";
export type HeadingTitle =
    "title"
    | "sub-heading"
    | "section-title"
    | "title-block"
    | "sm-p"
    | "sm-title-block"
    | "subtitle"
    | "title-h2"
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "h5"
    | string

export type transitionPage = { title?: string } | boolean | null | undefined;

