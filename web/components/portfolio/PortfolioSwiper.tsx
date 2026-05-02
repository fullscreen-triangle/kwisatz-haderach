import {Swiper, SwiperSlide} from 'swiper/react';

import {Pagination, Parallax, SwiperOptions} from "swiper";


import PortfolioItem from './PortfolioItem';
import {getPortfolioData} from "../../data/portfolio";
import {dsnCN} from "../../hooks/helper";
import {ParallaxOption} from "../../type/DsnSwiper";
import {styleBox, stylePortfolio} from "../../hooks/EremiaType";





export interface PortfolioSwiperProps extends SwiperOptions {
    desktop?: {} | SwiperOptions,
    mobile?: {} | SwiperOptions,
    tablet?: {} | SwiperOptions,
    className?: string,
    parallaxImage?: Object | ParallaxOption,
    parallaxContent?: Object | ParallaxOption,
    stylePortfolio?: stylePortfolio,
    blur?: boolean,
    styleBox?: styleBox

}


function PortfolioSwiper(
    {
        desktop,
        mobile,
        stylePortfolio,
        tablet,
        className,
        parallaxImage,
        styleBox ,
        parallaxContent,
        blur ,
        // @ts-ignore
        children,
        ...restProps
    }: PortfolioSwiperProps
) {
    const dataPortfolio = getPortfolioData();

    return (
        <Swiper
            modules={[Pagination, Parallax]}
            pagination={{clickable: true, el: '.swiper-pagination' , dynamicBullets:true}}
            spaceBetween={30}
            slidesPerView={1}
            breakpoints={{
                992: desktop,
                768: tablet,
                576: mobile
            }}

            className={dsnCN("work", className, stylePortfolio , blur && "has-blur")}

            {...restProps}


        >
            {
                dataPortfolio.map((item, index) =>
                    <SwiperSlide key={index}>
                        <PortfolioItem portoDetails={item} textButton="View Case" parallaxImage={parallaxImage}
                                       parallaxContent={parallaxContent} styleBox={styleBox}/>
                    </SwiperSlide>)
            }

            {children}

        </Swiper>

    );
}

PortfolioSwiper.defaultProps = {
    desktop: {
        slidesPerView: 3
    },
    tablet: {
        slidesPerView: 2

    },
    mobile: {
        slidesPerView: 2
    }
}

export default PortfolioSwiper