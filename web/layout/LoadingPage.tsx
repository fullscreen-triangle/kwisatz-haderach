import Logo from '../components/logo/Logo';
import {dsnCN, pageLoad} from "../hooks/helper";
import {useEffect, useMemo, useRef, useState} from "react";
import {gsap} from "gsap";

const Sibling = ({isSibling}: { isSibling?: boolean }) => {
    return (
        <span className={dsnCN("dsnload__row", isSibling && "dsnload__row--sibling")}>
                <span className="dsnload__img">
                    <Logo/>
                </span>
        </span>
    );
}


interface LoadingProps {
    className?: string,
    glitchLogo?: boolean
}

function LoadingPage({className, glitchLogo = true}: LoadingProps) {

    const preloader = useRef<HTMLDivElement>(null);
    const $ = useMemo(() => gsap.utils.selector(preloader), [preloader]);
    const [progressValue, setProgressValue] = useState(0);
    const [remove, setRemove] = useState(false);
    const present = {value: 0};

    useEffect(() => {
        const tl = gsap.timeline();

        document.body.style.overflow = "hidden";

        const handleLoad = () => {

            clearInterval(timer);
            tl.to(present, 1, {
                value: 100, onUpdate() {
                    setProgressValue(present.value);
                },
            })
                .to($("*:not(.bg-load , span , p,svg ,path) , .v-middle"), {autoAlpha: 0})
                .to($('.bg-load'), {
                    yPercent: -100,
                    ease: "Expo.easeInOut",
                    duration: 1.5
                })
                .to($('.bg-load .separator__path'), {
                    attr: {d: "M 0 0 C 40 0 55 0 100 0 L 0 0 Z"},
                    ease: "Power4.easeInOut",
                    duration: 1.5
                }, '-=1.5')
                .fromTo("#dsn-scrollbar", 1, {y: 400}, {y: 0, clearProps: "y", ease: "Expo.easeInOut"}, "-=1.2")
                .call(function () {
                    setRemove(true);
                    document.body.style.overflow = "";
                });


        }

        const timer = pageLoad(0, 100, 300, function (val) {
            setProgressValue(val);
            present.value = val;
            if (val >= 100)
                handleLoad();
        });


        return () => {
            document.body.style.overflow = "";
            clearInterval(timer);
            tl.kill();
        }

    }, [])// eslint-disable-line react-hooks/exhaustive-deps


    if(remove)
        return ;
    return (

        <div id="dsn_preloader" className={dsnCN("preloader", className)} ref={preloader}>


            {
                glitchLogo && <div className="dsnload p-absolute">
                    <Sibling/>
                    <Sibling isSibling/>
                    <Sibling isSibling/>
                    <Sibling isSibling/>
                </div>
            }


            <svg width="100%" height="100%" viewBox="0 0 100 100" className="v-middle"
                 preserveAspectRatio="xMinYMin meet" fill="none">
                <linearGradient id="linearColors" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--theme-color)"/>
                    <stop offset="50%" stopColor="var(--border-color)"/>
                    <stop offset="100%" stopColor="var(--assistant-color)"/>
                </linearGradient>
                <path className="dsn-progress-path" style={{strokeDashoffset: 300 - (progressValue * 3)}}
                      d="M50,1 a49,49 0 0,1 0,98 a49,49 0 0,1 0,-98"/>
            </svg>
            <div className="loading-circle v-middle">
                <p className="loading-count v-middle">{progressValue.toFixed(0)}</p>
            </div>

            <div className="loading-text text-uppercase mt-30 dsn-container"><span>Loading ...</span></div>
            <div className="bg-load background-section d-flex align-items-end">
                <svg className="dsn-separator-bottom dsn-icon-assistant-color" width="100%" height="100%"
                     viewBox="0 0 100 10"
                     preserveAspectRatio="none">
                    <path className="path-anim separator__path"
                          vectorEffect="non-scaling-stroke" d="M 0 0 C 40 16 75 10 100 0 L 0 0 Z"/>
                </svg>
            </div>

        </div>
    );
}


export default LoadingPage;