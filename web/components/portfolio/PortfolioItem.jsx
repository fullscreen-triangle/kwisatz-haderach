import React, {useEffect, useRef} from 'react'


import {getPortfolioLink} from "../../data/portfolio";
import {dsnCN} from "../../hooks/helper";
import BgImage from "../Image/BgImage";
import MetaPost from "../meta/MetaPost";
import DsnLink from "../../hooks/DsnLink";


function PortfolioItem({portoDetails , styleBox, height = "100%", imageOnly, className, parallaxContent, parallaxImage}) {

    const ref = useRef(null);

    const isLine = styleBox === "line";
    const isCorner = styleBox === "corner";


    useEffect(() => {

        const video = ref.current.querySelector('video');
        if (!video)
            return;

        video.pause();
        const portItem = ref.current,
            mouseEnter = () => video.play(),
            mouseLeve = () => video.pause();


        portItem.addEventListener('mouseenter', mouseEnter);
        portItem.addEventListener('mouseleave', mouseLeve);

        return () => {
            if (!video)
                return;
            portItem.removeEventListener('mouseenter', mouseEnter);
            portItem.removeEventListener('mouseleave', mouseLeve);
        }

    });// eslint-disable-line react-hooks/exhaustive-deps


    return (
        <div className={dsnCN('portfolio-item work-item', className)} ref={ref}>

            <div className='inner-img box-img' {...parallaxImage}>
                <DsnLink href={getPortfolioLink(portoDetails)} className="w-100 h-100 link-item" transitionPage={{title:portoDetails.title}}>


                        {
                            isLine && (<>
                                    <div className="line line-top"/>
                                    <div className="line line-bottom"/>
                                    <div className="line line-left"/>
                                    <div className="line line-right"/>
                                </>
                            )
                        }
                        {isCorner && (<>
                            <div className="corner corner-left-top"/>
                            <div className="corner corner-right-bottom"/>
                        </>)}
                        <BgImage className={"dsn-swiper-parallax-transform "} src={portoDetails.src}
                                 video={portoDetails.video}
                                 alt={portoDetails.title}
                                 overlay={portoDetails.overlay} height={height} imageOnly={imageOnly} />

                </DsnLink>
            </div>
            <div className="info-text box-content" {...parallaxContent}>
                {portoDetails.category && <MetaPost category={portoDetails.category}/>}

                {portoDetails.title &&
                <h4 className="title-block sec-title">
                    <DsnLink href={getPortfolioLink(portoDetails)} transitionPage={{title:portoDetails.title}}>{portoDetails.title}</DsnLink>
                </h4>}

            </div>

        </div>

    )
}


export default React.memo(PortfolioItem);