import {dsnCN, pageLoad} from "../hooks/helper";
import {useEffect, useRef, useState} from "react";
import {gsap} from "gsap";
import {LOGO_PATH, LOGO_VIEWBOX} from "../lib/logo-path";

interface LoadingProps {
    className?: string;
}

function LoadingPage({className}: LoadingProps) {
    const preloader  = useRef<HTMLDivElement>(null);
    const pathRef    = useRef<SVGPathElement>(null);
    const pathLen    = useRef<number>(0);
    const [pct, setPct]       = useState(0);
    const [remove, setRemove] = useState(false);

    useEffect(() => {
        const path = pathRef.current;
        if (!path) return;

        const len = path.getTotalLength();
        pathLen.current = len;
        path.style.strokeDasharray  = `${len}`;
        path.style.strokeDashoffset = `${len}`;

        document.body.style.overflow = "hidden";

        const $ = gsap.utils.selector(preloader);
        const tl = gsap.timeline();
        const present = {value: 0};

        const setDraw = (v: number) => {
            if (path) path.style.strokeDashoffset = `${len * (1 - v / 100)}`;
        };

        const handleLoad = () => {
            clearInterval(timer);
            tl.to(present, 1, {
                value: 100,
                onUpdate() {
                    const v = Math.min(Math.round(present.value), 100);
                    setPct(v);
                    setDraw(v);
                },
            })
            .to($('.logo-sketch'), {opacity: 0, duration: 0.4}, "+=0.15")
            .to($('.bg-load'), {
                yPercent: -100,
                ease: "Expo.easeInOut",
                duration: 1.5,
            })
            .to($('.bg-load .separator__path'), {
                attr: {d: "M 0 0 C 40 0 55 0 100 0 L 0 0 Z"},
                ease: "Power4.easeInOut",
                duration: 1.5,
            }, '-=1.5')
            .fromTo("#dsn-scrollbar", 1, {y: 400}, {y: 0, clearProps: "y", ease: "Expo.easeInOut"}, "-=1.2")
            .call(() => {
                setRemove(true);
                document.body.style.overflow = "";
            });
        };

        const timer = pageLoad(0, 100, 300, (val: number) => {
            setPct(val);
            setDraw(val);
            present.value = val;
            if (val >= 100) handleLoad();
        });

        return () => {
            document.body.style.overflow = "";
            clearInterval(timer);
            tl.kill();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (remove) return null;

    return (
        <div id="dsn_preloader" className={dsnCN("preloader", className)} ref={preloader}
             style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>

            {/* Sketched logo */}
            <div className="logo-sketch" style={{width: 140, marginBottom: 40}}>
                <svg viewBox={LOGO_VIEWBOX} width="140" style={{display:'block', overflow:'visible'}}>
                    <path
                        ref={pathRef}
                        d={LOGO_PATH}
                        fill="none"
                        stroke="var(--theme-color, #14bfb5)"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>

            {/* Progress */}
            <div style={{textAlign:'center'}}>
                <p style={{
                    fontSize: 52, fontWeight: 700, lineHeight: 1,
                    color: 'var(--theme-color, #14bfb5)', margin: 0,
                    fontFamily: 'var(--heading-font, Poppins)',
                }}>
                    {pct}
                </p>
                <p style={{
                    fontSize: 10, letterSpacing: 5,
                    color: 'rgba(255,255,255,0.25)', marginTop: 10, marginBottom: 0,
                    textTransform: 'uppercase',
                }}>
                    Loading
                </p>
            </div>

            {/* bg-load panel — slides up on exit */}
            <div className="bg-load background-section d-flex align-items-end">
                <svg className="dsn-separator-bottom dsn-icon-assistant-color"
                     width="100%" height="100%" viewBox="0 0 100 10" preserveAspectRatio="none">
                    <path className="path-anim separator__path"
                          vectorEffect="non-scaling-stroke"
                          d="M 0 0 C 40 16 75 10 100 0 L 0 0 Z"/>
                </svg>
            </div>
        </div>
    );
}

export default LoadingPage;
