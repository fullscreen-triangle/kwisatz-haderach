import {Fragment, useEffect, useRef} from 'react';
import  {gsap ,Back} from "gsap";


function TextTrigger({duration, ease, delay, start, end, scrub, markers, stagger, children}) {
    const ref = useRef();

    useEffect(() => {
        if (!ref.current)
            return;

        const animation = gsap.effects.textAnimation(ref.current, {
            from: {y: 30, rotation: 15, scale: 0.8, autoAlpha: 0},
            to: {
                y: 0, rotation: 0, scale: 1, autoAlpha: 1,
                stagger: stagger, delay: delay,
                onComplete: () => {
                    if (!scrub) {
                        animation.scrollTrigger.kill();
                        animation.kill();
                    }
                }
            },
            ease: ease,
            start: start,
            end: end,
            scrub: scrub,
            markers: markers,
            duration: duration
        });

        return () => {
            if (animation.scrollTrigger)
                animation.scrollTrigger.kill();
            animation.kill();
        };

    }, [ref, ease, start, end, scrub, markers, stagger , duration , delay]);
    return (
        <Fragment>
            {typeof children === 'function' ? children(ref) : children}
        </Fragment>
    );
}

TextTrigger.defaultProps = {
    ease: Back.easeOut.config(2),
    start: "75%",
    end: "100%",
    scrub: false,
    markers: false,
    duration: 0.5,
    stagger: 0.05,
    delay: 0
}


export default TextTrigger;