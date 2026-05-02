import {transitionPage} from "../EremiaType";
import {gsap} from "gsap";


export function tdStart(transitionPage: transitionPage): [HTMLDivElement, gsap.core.Timeline] {
    const svg = (direction) => `<svg class="dsn-separator-${direction} dsn-icon-assistant-color" width="100%" height="100%" viewBox="0 0 100 10"
         preserveAspectRatio="none">
        <path class="path-anim separator__path" vector-effect="non-scaling-stroke" d="M 0 0 C 40 16 75 10 100 0 L 0 0 Z"></path>
    </svg>`;
    const domTransition = document.createElement("div");
    domTransition.className = "dsn-ajax-loader dsn-ajax-normal bg-load background-section d-flex flex-column justify-content-between text-center";
    domTransition.innerHTML = `
            ${svg("top")}
            <h6 class="d-flex justify-content-center title text-uppercase">${typeof transitionPage === "object" ? transitionPage?.title : "Eremia"}</h6>
            ${svg("bottom")}
            `;

    gsap.set(domTransition, {yPercent: 100, y: 150});

    document.body.querySelector("#__dsn_content").append(domTransition);

    const tl = gsap.timeline({defaults: {ease: "Expo.easeInOut"}})
        .to(domTransition, {
            yPercent: 0,
            y: 0,
            duration: 1.5
        })
        .to(domTransition.querySelector('.dsn-separator-top .path-anim'), {
            attr: {d: "M 0 0 C 40 0 55 0 100 0 L 0 0 Z"},
            overwrite: false,
            duration: 1.5
        }, 0)
        .to("#dsn-scrollbar", {y: -400, duration: 1}, "-=1.2");


    return [domTransition, tl];
}


export function tdEnd() : void {
    document.body.querySelectorAll(".dsn-ajax-loader").forEach((el, index) => {
        if (index > 0) {
            el.remove();
            return;
        }

        gsap.timeline({defaults: {ease: "Expo.easeInOut"}}).to(el, {
            yPercent: -100,
            duration: 1.5
        }).to(el.querySelector(".dsn-separator-bottom .path-anim"), {
            attr: {d: "M 0 0 C 40 0 55 0 100 0 L 0 0 Z"},
            overwrite: false,
            duration: 1.5
        }, 0)
            .fromTo("#dsn-scrollbar", {y: 400}, {y: 0, clearProps: "y"}, "-=1.2")
            .call(() => {
                el.remove();
            })
        ;

    });
}