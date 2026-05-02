import {gsap ,Back} from 'gsap';
import dsnSplitting from "../hooks/spltting";



export function moveSection() {
    gsap.registerEffect({
        name: 'moveSection',
        extendTimeline: true,
        defaults: {
            from: {y: -10},
            to: {y: 200},
            ease: "none",
            start: "100%",
            end: "0%",
            scrub: true,
            markers: false
        },
        effect: (target, config) => {
            return gsap.fromTo(target, config.from, {
                ease: config.ease,
                ...config.to,
                scrollTrigger: {
                    trigger: target,
                    scrub: config.scrub,
                    start: `top ${config.start}`,
                    end: `${config.end} 0%`,
                    markers: config.markers
                }
            });
        }

    });
}

export function fade() {
    gsap.registerEffect({
        name: 'fade',
        extendTimeline: true,
        defaults: {
            from: {opacity: 0},
            to: {opacity: 1},
            ease: Back.easeOut.config(1.7),
            start: "75%",
            end: "100%",
            scrub: false,
            markers: false,
            duration: 0.8
        },
        effect: (target, config) => {

            return gsap.fromTo(target, config.from,
                {
                    ...config.to,
                    willChange: "transform , opacity",

                    scrollTrigger: {
                        trigger: target,
                        scrub: config.scrub,
                        start: `top ${config.start}`,
                        end: `${config.end} 0%`,
                        markers: config.markers
                    }
                });
        }

    });
}


export function textAnimation() {
    gsap.registerEffect({
        name: 'textAnimation',
        extendTimeline: true,
        defaults: {
            from: {},
            to: {},
            ease: Back.easeOut.config(2),
            start: "75%",
            end: "100%",
            scrub: false,
            markers: false,
            duration: 0.8
        },
        effect: (target, config) => {
            return gsap.fromTo(dsnSplitting.Words(target[0]).words, config.from,
                {
                    ...config.to,
                    willChange: "transform , opacity",
                    transformOrigin: "top left",
                    ease: config.ease,
                    duration: config.duration,
                    scrollTrigger: {
                        trigger: target,
                        scrub: config.scrub,
                        start: `top ${config.start}`,
                        end: `${config.end} 0%`,
                        markers: config.markers
                    }
                });
        }

    });
}


const dsnEffect = {

    registerEffect: (...param) => {
        if (param)
            param.forEach(item => {
                if (typeof item === 'function')
                    item();
            })
    }

}


export default dsnEffect;