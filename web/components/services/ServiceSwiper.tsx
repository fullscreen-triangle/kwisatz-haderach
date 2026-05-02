import {Swiper} from 'swiper/react';
import Service from "./Service";
import {Pagination, Parallax, SwiperOptions} from "swiper";
import {dataServiceProps} from "./ServiceItem";
import {dsnCN} from "../../hooks/helper";
import {backgroundColor, styleBox} from "../../hooks/EremiaType";
import {ParallaxOption} from "../../type/DsnSwiper";


interface ServiceSwiperProps extends SwiperOptions {
    className?: string,
    data?: [dataServiceProps],
    desktop?: {} | SwiperOptions,
    mobile?: {} | SwiperOptions,
    tablet?: {} | SwiperOptions,
    blur?: boolean,
    backgroundColor?: backgroundColor,
    parallaxContent?: Object | ParallaxOption,
    styleBox?: styleBox

}

function ServiceSwiper({className, desktop, mobile, tablet, blur,parallaxContent, data, ...props}: ServiceSwiperProps) {

    return <Service
        modules={[Pagination, Parallax]}
        pagination={{clickable: true, el: '.swiper-pagination'}}
        spaceBetween={30}
        slidesPerView={1}
        breakpoints={{
            992: desktop,
            768: tablet,
            576: mobile
        }}
        className={dsnCN(className, blur && "has-blur")}
        data={data}
        isSwiper
        {...props}
        parallaxContent={parallaxContent}
        tag={Swiper}
    />


}


export default ServiceSwiper;