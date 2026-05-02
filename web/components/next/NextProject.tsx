import  {useEffect, useRef} from 'react';

import {useSelector, dsnMediaMatching} from '../../hooks/dsnHooks';
import {gsap} from 'gsap';

import {getPortfolioLink} from "../../data/portfolio";


//--> Component
import {dsnCN} from "../../hooks/helper";
import BgImage from "../Image/BgImage";
import MetaPost from "../meta/MetaPost";
import {useRouter} from "next/router";
import Link from "next/link";
import Image from "next/image";


function NextProject({height, number, attrContent, heroContent, className}) {
    const router = useRouter();
    const [$, ref] = useSelector();
    const {desktop, tablet, mobile} = dsnMediaMatching();
    const bg = useRef();
    const {title,category, src, video, overlay} = heroContent || {};


    useEffect(() => {

        const animate = gsap.timeline({
            scrollTrigger: {
                trigger: ref.current,
                end: 'top',
                scrub: true
            }
        });

        animate.fromTo($('.bg img'), {y: -100, scale: 1, filter: "blur(0px)"}, {y: 0, scale: 1.2, filter: "blur(10px)"})
            .fromTo($('.project-number , .metas'), {y: -100}, {y: 0}, 0);


        return () => {
            animate?.scrollTrigger?.kill();
            animate?.kill();
        }

    }, []);// eslint-disable-line react-hooks/exhaustive-deps


    useEffect(() => {

        if (tablet || mobile)
            return;


        const animate = gsap.timeline({
            scrollTrigger: {
                trigger: ref.current,
                scrub: true,
                start: 'top top',
                end: '+=2500',
                pin: true,
                onLeave: ({progress, direction, isActive}) => router.push(getPortfolioLink(heroContent))

                // markers: true
            }
        });
        animate.to($('.case img'), {rotation: 360}, 0)
            .to($('.bg img'), {scale: 1, filter: "blur(0px)"}, 0)
            .to($('.title-block.number'), {snap: {textContent: 1} ,textContent: "100%"}, 0)
            .to($("span.d-none"), {width: "100%"}, 0)

        return () => {
            animate?.scrollTrigger?.kill();
            animate?.kill();
        }

    }, [desktop, tablet, mobile]); // eslint-disable-line react-hooks/exhaustive-deps


    return (
        <>
            <div ref={ref}
                 className={dsnCN("next-project p-relative h-v-100 over-hidden", (src || video) && 'v-dark-head background-main', className)}>
                {/* @ts-ignore*/}
                {src && <BgImage className={"bg w-100 h-100 p-absolute over-hidden"} alt={title} src={src} height={height} style={{position:"absolute"}}
                                 overlay={overlay} video={video} ref={bg}/>}

                <div
                    className="next-project-inner dsn-container p-relative w-100 h-100 d-flex flex-column justify-content-center z-index-1" {...attrContent}>
                    <div className="project-number p-absolute d-flex">
                        <h6>Project</h6>
                        <span className="current">{number}</span>
                        <span className="full">6</span>
                    </div>
                    {category && <MetaPost className="mt-30 right-0 p-absolute top-0 dsn-container" category={category} />}

                    <Link href={getPortfolioLink(heroContent)} className="effect-ajax border-top border-bottom">

                            <h2 className="title section-padding p-relative ">
                                <span className="title-stroke">Yaren collection</span>
                                <span className="p-absolute section-padding d-none top-0 w-100 h-100 left-0">Yaren
                                        collection</span>
                            </h2>

                    </Link>

                    <div className="case">
                        <div className="p-absolute w-100 h-100 ">
                            <Image className="cover-bg-img" src="/img/case.svg" alt="" width={100} height={100} size="100vw"/>
                        </div>
                        <strong className="title-block heading-color number v-middle">100%</strong>
                    </div>
                </div>
            </div>

        </>

    );
};


NextProject.defaultProps = {
    height: "100%",
}


export default NextProject;
