import ServiceSwiper from "../ServiceSwiper";
import {getServiceData} from "../../../data/service";
import SwiperPagination from "../../swiper-pagination/SwiperPagination";

function ServiceSwiperOne({className , ...restProps}) {
    return <ServiceSwiper
        desktop={{slidesPerView: 3}}
        tablet={{slidesPerView: 1.5}}
        backgroundColor={"background-section"}
        styleBox={"corner"}
        grabCursor
        loop
        loopedSlides={2}
        speed={1000}
        parallaxContent={{"data-swiper-parallax-scale":0.88}}
        spaceBetween={0}
        parallax
        centeredSlides
        className={className} data={getServiceData()}
        {...restProps}
    >
        <SwiperPagination className={"mt-30 dsn-container justify-content-between"} />
    </ServiceSwiper>
}

export default ServiceSwiperOne;