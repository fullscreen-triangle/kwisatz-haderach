import {memo, useEffect, useRef} from 'react'


import {getBlogLink} from "../../data/blog";
import {dsnCN} from "../../hooks/helper";
import BgImage from "../Image/BgImage";
import MetaPost from "../meta/MetaPost";
import DsnLink from "../../hooks/DsnLink";


function BlogItem({portoDetails, textButton, imageOnly, className, parallaxContent = {}, metaData = [], parallaxImage = {}}) {

    const ref = useRef<HTMLDivElement>(null);

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

        <>
            <div className={dsnCN('blog-item p-relative d-flex align-items-center h-100 w-100', className)}
                 ref={ref} {...parallaxContent}>
                <div className="box-meta">
                    <div className="entry-date">
                        <span className="author">{portoDetails.author}</span>
                        <a href="#">{portoDetails.date}</a>
                    </div>
                </div>


                <div className='inner-img box-img over-hidden' {...parallaxImage}>
                    <BgImage className={"dsn-swiper-parallax-transform "} src={portoDetails.src}
                             video={portoDetails.video}
                             alt={portoDetails.title}
                             overlay={portoDetails.overlay} height={"100%"} imageOnly={imageOnly}/>

                </div>

                <div className="box-content p-relative">

                    <div className="box-content-body">
                        {portoDetails.category && <MetaPost category={portoDetails.category} separate={", "}/>}
                        {portoDetails.title &&
                        <h4 className={`title-block mb-10`}>
                            <DsnLink href={getBlogLink(portoDetails)} transitionPage={{title:portoDetails.title}}>{portoDetails.title}</DsnLink>
                        </h4>}

                        {
                            // @ts-ignore
                            (portoDetails.description && !metaData.includes("description")) &&
                            <p>{portoDetails.description}</p>
                        }

                        <DsnLink href={getBlogLink(portoDetails)} className={`link-visit p-relative mt-15`} transitionPage={{title:portoDetails.title}}>

                            <span className="link-visit-text">{textButton}</span>
                            <div className="link-visit-arrow">
                                <svg viewBox="0 0 80 80">
                                    <polyline points="19.89 15.25 64.03 15.25 64.03 59.33">
                                    </polyline>
                                    <line x1="64.03" y1="15.25" x2="14.03" y2="65.18">
                                    </line>
                                </svg>
                            </div>
                        </DsnLink>

                    </div>
                </div>
            </div>
        </>


    )
}

BlogItem.defaultProps = {
    className : "",
    imageOnly : true

}


export default memo(BlogItem);