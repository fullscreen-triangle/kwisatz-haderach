import  {useEffect, useRef} from 'react';

import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/dist/ScrollTrigger';

//--> Component

import {dsnCN} from "../../hooks/helper";
import BgImage from "../Image/BgImage";
import MetaPost from "../meta/MetaPost";
import {justifyContent} from "../../hooks/EremiaType";


interface HeaderFullProps {
    height?: string,
    className?: string,
    separate?: string,
    overlay?: number,
    parallax?: Object,
    parallaxContent?: Object,
    heroContent: { category?: [], title?: string, src?: string, video?: string, subtitle?: string },
    children?: any,
    justifyContent?: justifyContent
    alignItems?: justifyContent,
    skin?: 'half-right' | 'half-left' | 'half-personal',
    fullWidth?:boolean

}


function HeaderFull({
                        height,
                        className,
                        separate,
                        overlay,
                        parallax,
                        heroContent,
                        parallaxContent,
                        justifyContent,
                        alignItems = "center",
                        skin,
                        fullWidth,
                        children
                    }: HeaderFullProps) {

    const header = useRef();
    const bg = useRef(null);
    const holder = useRef();
    const content = useRef();
    const animateText = useRef();
    const q = gsap.utils.selector(header);
    const {category, title, src, video, subtitle} = heroContent;


    useEffect(() => {
        gsap.fromTo(q('.post-info span'), {y: -15, autoAlpha: 0}, {y: 0, autoAlpha: 1, stagger: 0.1});
        gsap.fromTo(q('.text-head , .dsn-description'), {y: 15, autoAlpha: 0}, {y: 0, autoAlpha: 1, stagger: 0.1});

        const animate = gsap.timeline();
        (bg.current && parallax) && animate.to(bg.current.children, {...parallax, ease: "none"}, 0);
        (content.current && parallaxContent) && animate.to(content.current, {...parallaxContent, ease: "none"}, 0);
        (animateText.current) && animate.to(animateText.current, {clipPath: 'inset(-20% 0 -10px 0)', ease: "none"}, 0);
        animate.to(holder.current, {y: 70, autoAlpha: 0, ease: "none"}, 0);

        ScrollTrigger.create({
            animation: animate,
            trigger: header.current,
            start: "top top",
            scrub: true
        });

        return () => {
            if (animate.scrollTrigger)
                animate.scrollTrigger.kill();

            animate.kill();
        }

    }, []);// eslint-disable-line react-hooks/exhaustive-deps


    return (
        <header
            className={dsnCN("header-page overflow", ((src || video) && !skin ) && 'v-dark-head', skin, skin && "v-dark-head-mobile" , fullWidth && "full-width") }
            ref={header}>
            {/*@ts-ignore*/}
            {src && <BgImage src={src} height={height} alt={title?.replace(/<[^>]+>/g, '') ?? ""} overlay={overlay}
                             video={video} ref={bg}/>}

            {
                heroContent &&
                <div
                    className={dsnCN("hero-content d-flex", className, justifyContent && 'justify-content-' + justifyContent, alignItems && 'align-items-' + alignItems)}
                    ref={content}>
                    <div className="content p-relative">
                        {subtitle && <div className="subtitle mb-20" dangerouslySetInnerHTML={{__html: subtitle}}/>}
                        {category && <MetaPost category={category} separate={separate}/>}
                        {title && (
                            <div className="text-head">
                                <h1 className="title" dangerouslySetInnerHTML={{__html: title}}/>
                            </div>
                        )}
                        {children && <div className="dsn-description mt-30">{children}</div>}
                    </div>
                </div>
            }

        </header>
    );
}


HeaderFull.defaultProps = {
    height: "100%",
    parallax: {
        yPercent: 30,
    },
    parallaxContent: {
        yPercent: 50,
        autoAlpha: 0
    }
}


export default HeaderFull;
