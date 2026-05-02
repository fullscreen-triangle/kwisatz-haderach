import * as React from "react";
import {useEffect, useRef, useState} from "react";
import {Swiper, SwiperSlide} from 'swiper/react';
import {Controller, Parallax} from "swiper";
import {dsnCN} from "../../hooks/helper";
import {useArrayRef} from "../../hooks/dsnHooks";
import {getPortfolioData} from '../../data/portfolio';
import dsnSplitting from '../../hooks/spltting';
import {gsap} from 'gsap';

//--> Components
import BgImage from "../Image/BgImage";
import ContentSlider from "./ContentSlider";
import ControlNav from "./ControlNav";
import DsnWebgelDirction from './DsnWebgelDirction';
import {dataProjectProps, justifyContent} from "../../hooks/EremiaType";
import {SwiperProps} from "swiper/react/swiper-react";


export interface SliderPortfolioProps {
    typeBg?: string | 'full-image' | 'padding-image' | "half-image",
    className?: string,
    classNameSlider?: string,
    parallax?: Object,
    fullWidth?: boolean,
    parallaxSwiper?: Object | {
        'data-swiper-parallax'?: string,
        'data-swiper-parallax-x'?: string,
        'data-swiper-parallax-y'?: string,
        'data-swiper-parallax-scale'?: string,
        'data-swiper-parallax-opacity'?: string,
        'data-swiper-parallax-duration'?: string,
    },
    webgel?: boolean,
    webgelOptions?: {
        displacement?: "/img/displacement/1.jpg" | string,
        intensity?: number,
        onComplete?: any,
        speedIn?: number,
        easing?: any,
    },
    metaData: {
        hasSeparator?: boolean,
        hasCategory?: boolean,
        hasDescription?: boolean,
        separateCat?: string | null,
    },
    data?: [dataProjectProps],
    alignControlNav?: justifyContent,
    optionSlider?: SwiperProps,
    tag?: React.ElementType
}


function SliderPortfolio({
                             className,
                             classNameSlider = "",
                             typeBg,
                             tag: Tag = "div",
                             fullWidth,
                             parallax,
                             webgelOptions,
                             metaData,
                             alignControlNav = "between",
                             optionSlider = {},
                             data,
                             ...restProps
                         }: SliderPortfolioProps) {
    const rootSlider = useRef(),

        [contentRef, setContentRef] = useArrayRef(),

        dataProject = data || getPortfolioData(),
        [active, setActive] = useState(0),
        bg = useRef();



    const tl = useRef(gsap.timeline());

    useEffect(() => {
        const q = gsap.utils.selector(rootSlider);
        gsap.fromTo(q('.post-info span '), {y: -15, stagger: 0.1, autoAlpha: 0}, {autoAlpha: 1});
        gsap.from(q('.btn-default ,hr , .description'), {
            y: 15, autoAlpha: 0, stagger: 0.1, onComplete: () => {
                gsap.set(q('.btn-default ,hr , .description , .post-info span'), {clearProps: true})
            }
        });

        contentRef.current.forEach((item) => {
            const title = item.querySelector('.title');
            if (title)
                dsnSplitting.Char(title);
        });


        if (!parallax)
            return;

        gsap.to(bg.current, {
            ...parallax,
            ease: "none",
            scrollTrigger: {
                trigger: rootSlider.current,
                start: "top top",
                scrub: true
            }
        })


    }, []);// eslint-disable-line react-hooks/exhaustive-deps


    const init = (swiper) => {
        swiper.slides.forEach((item) => {
            const video = item.querySelectorAll('.swiper-slide:not(.swiper-slide-active) video');

            if (video)
                video.forEach(($item) => {
                    $item.pause();
                });
        });

    };

    const getContent = (swiper) => {
        const oldNum = swiper.slides[swiper.previousIndex].getAttribute("data-dsn-id");
        const newNum = swiper.slides[swiper.activeIndex].getAttribute("data-dsn-id");

        return [
            newNum,
            oldNum,
            gsap.utils.selector(contentRef.current[newNum]),
            gsap.utils.selector(contentRef.current[oldNum]),
        ]
    }

    const activeVideo = (swiper) => {
        const newVideo = swiper.slides[swiper.activeIndex].querySelector('video');
        const oldVideo = swiper.slides[swiper.previousIndex].querySelector('video');

        if (newVideo)
            newVideo.play();
        if (oldVideo)
            oldVideo.pause();
    }

    const swiperChange = (swiper) => {
        const [newNum, oldNum, newContent, oldContent] = getContent(swiper);
        const [newTitle, oldTitle] = [newContent('.title .char'), oldContent('.title .char')]
        const $isRight = oldNum < newNum;
        const animate = {
            show: {autoAlpha: 1, x: 0, stagger: 0.05, ease: "back.out(4)"},
            hide: {
                autoAlpha: 0,
                x: !$isRight ? "40%" : "-40%",
                stagger: 0.05,
                ease: "back.in(4)"
            }
        }
        activeVideo(swiper);


        if (swiper.dsnOnChange) swiper.dsnOnChange(newNum, oldNum, newContent, oldContent);

        tl.current.progress(1);
        tl.current = gsap.timeline();


        tl.current.fromTo(
            $isRight ? oldTitle : oldTitle.reverse(), 0.3, animate.show,
            {...animate.hide, onComplete: () => setActive(parseInt(newNum, 10))}
        );

        tl.current.fromTo($isRight ? newTitle.reverse() : newTitle, 0.8, animate.hide, animate.show, "-=.1");


    }

    const optionSwiper = {
        modules: [Parallax, Controller],
        spaceBetween: 50,
        slidesPerView: 1,
        speed: 1500,
        ...optionSlider,
        onInit: init,
        onSlideChange: swiperChange,
    }

    if (restProps.webgel) {
        optionSwiper["resistanceRatio"] = 0.65;
        optionSwiper["watchSlidesProgress"] = true;
    } else if (restProps.parallaxSwiper && Object.keys(restProps.parallaxSwiper).length)
        optionSwiper["parallax"] = true;


    return (

        <Tag
            className={dsnCN('main-slider half-content has-horizontal  background-main', fullWidth && "full-width"
                , typeBg === "padding-image" ? "demo-1 v-dark-head-mobile" : typeBg === "half-image" ? "demo-2 v-dark-head-mobile" : typeBg + " v-dark-head", classNameSlider
            )}
            ref={rootSlider}>
            <div className="content-slider">
                <div className="bg-container" ref={bg}>
                    <Swiper   {...optionSwiper} grabCursor>
                        {dataProject.map((item, key) =>
                            <SwiperSlide className="over-hidden" key={key} data-dsn-id={key}>
                                {/*// @ts-ignore*/}
                                <BgImage src={item.src} video={item.video}
                                         alt={item.title}
                                         overlay={item.overlay} height={"100%"} {...restProps.parallaxSwiper}/>
                            </SwiperSlide>
                        )}


                        {restProps.webgel &&
                        <DsnWebgelDirction parent={rootSlider} data={dataProject}
                                           direction={optionSlider.direction !== "vertical" ? "horizontal" : "vertical"}  {...webgelOptions}/>}


                    </Swiper>


                </div>

                <ControlNav className={dsnCN(alignControlNav && 'justify-content-' + alignControlNav)} timeline={tl}
                            activeClass={active} parent={rootSlider}/>

                <ContentSlider data={dataProject} activeClass={active} ref={setContentRef} {...metaData}
                               className={className}/>


            </div>
        </Tag>
    );
}


SliderPortfolio.defaultProps = {
    parallax: {
        yPercent: 30,
    },
}


export default SliderPortfolio;