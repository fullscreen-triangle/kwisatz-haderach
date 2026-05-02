import {dsnCN} from "../../hooks/helper";
import {ParallaxOption} from "../../type/DsnSwiper";
import {Swiper, SwiperSlide} from 'swiper/react';
import {Pagination, Parallax, SwiperOptions} from "swiper";
import Image from "next/image";


const data = [
    {src: "/img/logo/1.png"},
    {src: "/img/logo/2.png"},
    {src: "/img/logo/3.png"},
    {src: "/img/logo/4.png"},
    {src: "/img/logo/5.png"},
    {src: "/img/logo/6.png"},
    {src: "/img/logo/1.png"},
    {src: "/img/logo/3.png"},
];

export interface BrandClientProps extends SwiperOptions {
    desktop?: {} | SwiperOptions,
    mobile?: {} | SwiperOptions,
    tablet?: {} | SwiperOptions,
    className?: string,
    parallaxContent?: Object | ParallaxOption,
    blur?: boolean,

}


function BrandClient({className, desktop, mobile, tablet, ...retsProps}: BrandClientProps) {

    return (
        <Swiper
            modules={[Pagination, Parallax]}
            pagination={{clickable: true, el: '.swiper-pagination'}}
            spaceBetween={30}
            slidesPerView={1}
            breakpoints={{
                992: desktop,
                768: tablet,
                576: mobile
            }}

            className={dsnCN("brand-client wrapper-client", className)} {...retsProps}>


            {data && data.map(($item, $index) =>
                <SwiperSlide key={$index}>
                    <div className="logo-box">
                        <div className="logo-box-inner p-relative">
                            <Image src={$item?.src} alt={""} width={180} height={54}/>
                        </div>
                    </div>
                </SwiperSlide>
            )}


        </Swiper>
    );
}

BrandClient.defaultProps = {
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


export default BrandClient;