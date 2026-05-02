import {memo, MutableRefObject, useEffect, useState} from 'react';
import {dsnCN} from "../../hooks/helper";


const Circle = () => <svg className="circle" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <g className="circle-wrap" fill="none" strokeWidth="1" strokeLinejoin="round"
       strokeMiterlimit="10">
        <circle cx="12" cy="12" r="10.5"/>
    </g>
</svg>;


export interface ControlNavProps {
    className?: string,
    activeClass?: any,
    parent?: MutableRefObject<any>,
    timeline?: any
}


function ControlNav({className, timeline, activeClass, ...restProps}: ControlNavProps) {
    const [swiper, setSwiper] = useState(null);

    useEffect(() => {
        setSwiper(restProps.parent?.current.querySelector('.bg-container > .swiper')?.swiper);
    }, []);// eslint-disable-line react-hooks/exhaustive-deps


    return (
        <>
            <div
                className={dsnCN('control-nav control-nav dsn-container p-absolute w-100 d-flex', className)} {...restProps} >

                <div className="prev-container" onClick={() => !timeline.current?.isActive() && swiper?.slidePrev()} style={{marginRight:0}}>
                    <div className="container-inner">
                        <div className="triangle"/>
                        <Circle/>
                    </div>
                </div>

                <div className="slider-counter d-flex align-items-center">
                    <span
                        className="slider-current-index">{activeClass > 8 ? activeClass + 1 : `0${activeClass + 1}`}</span>
                    <span className="slider-counter-delimiter"/>
                    <span
                        className="slider-total-index">{swiper?.slides.length > 9 ? swiper?.slides.length : `0${swiper?.slides.length}`}</span>
                </div>

                <div className="next-container" onClick={() => !timeline.current?.isActive() && swiper?.slideNext()} style={{marginLeft:0}}>
                    <div className="container-inner">
                        <div className="triangle"/>
                        <Circle/>
                    </div>
                </div>

            </div>

        </>

    );
}

export default memo(ControlNav);