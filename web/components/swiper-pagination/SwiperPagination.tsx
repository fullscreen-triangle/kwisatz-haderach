import {useSwiper} from "swiper/react";
import {dsnCN} from "../../hooks/helper";

function SwiperPagination({className, showNavigation = true, showPagination = true}) {
    const swiper = useSwiper();

    return (
        <div className={dsnCN("dsn-pagination d-flex align-items-center", className)}>
            {showNavigation && <div className="swiper-prev" onClick={() => swiper.slidePrev()}>
                <div className="prev-container">
                    <div className="container-inner">
                        <div className="triangle"/>
                        <svg className="circle" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <g className="circle-wrap" fill="none" strokeWidth="1"
                               strokeLinejoin="round" strokeMiterlimit="10">
                                <circle cx="12" cy="12" r="10.5"/>
                            </g>
                        </svg>
                    </div>
                </div>
            </div>}
            {showPagination && <div className="swiper-pagination"/>}
            {showNavigation && <div className="swiper-next" onClick={() => swiper.slideNext()}>
                <div className="next-container">
                    <div className="container-inner">
                        <div className="triangle"/>
                        <svg className="circle" xmlns="http://www.w3.org/2000/svg" width="24"
                             height="24" viewBox="0 0 24 24">
                            <g className="circle-wrap" fill="none" strokeWidth="1"
                               strokeLinejoin="round" strokeMiterlimit="10">
                                <circle cx="12" cy="12" r="10.5"/>
                            </g>
                        </svg>
                    </div>
                </div>
            </div>}
        </div>
    );
}

export default SwiperPagination;