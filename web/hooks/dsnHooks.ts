import {MutableRefObject, useEffect, useMemo, useRef, useState} from "react";
import {gsap} from 'gsap';
import SelectorFunc = gsap.utils.SelectorFunc;


/**
 *
 * @returns {(React.MutableRefObject<null>|React.RefObject<unknown>|React.MutableRefObject<undefined>|(function(*=)))[]}
 */
export function useArrayRef(): [MutableRefObject<[HTMLElement] | any | null>, any] {
    const refs = useRef(null);
    refs.current = [];
    return [refs, (ref) => ref && refs.current.push(ref)];
}


export function useSelector(): [SelectorFunc, MutableRefObject< HTMLDivElement | HTMLElement | any | null>] {
    const ref = useRef(null);
    const q = useMemo(() => gsap.utils.selector(ref), [ref]);
    return [q, ref];
}


export function gsapMediaMatching(contextFunc = null, element = null) {
    return gsap.matchMedia().add({
        desktop: "(min-width: 992px)",
        tablet: "(min-width: 768px) and (max-width: 991px)",
        mobile: "(max-width: 767px)"
    }, contextFunc, element);
}

export function dsnMediaMatching(contextFunc = null, element = null) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [media, setMedia] = useState({desktop: false, tablet: false, mobile: false});
    const Resize = () => {
        const width = window.innerWidth;
        setMedia({
            desktop: width >= 992,
            tablet: width < 992 && width >= 768,
            mobile: width < 768,
        });
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
        Resize();
        window.addEventListener('resize', Resize);
        return () => {
            window.removeEventListener('resize', Resize);
        }
    }, [])


    return media;
}

