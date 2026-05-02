import {forwardRef} from "react";
import Image from 'next/image';
import styled from "styled-components";
import {dsnCN} from "../../hooks/helper";


const Bg = styled.div`
        height : ${props => props.theme.height};
        position: relative;
`;


interface bgImageProps {
    src?:string,
    video?: any,
    height?:string,
    overlay?:number,
    imageOnly?:boolean,
    alt:string,
    className:string,
}

// eslint-disable-next-line react/display-name
const BgImage = forwardRef(({src, video, height="80vh", overlay = 4, imageOnly, alt , className ="", ...restProps} : bgImageProps, ref) => {

    return (
        <Bg theme={{height: height}} data-overlay={overlay} className={dsnCN("image-bg" , className)} {...restProps} ref={ref}>
            {!video && <Image src={src} className="cover-bg-img" alt={alt} fill sizes="(max-width: 768px) 100vw,(max-width: 1200px) 70vw,100vw"/>}
            {(video && !imageOnly) && <video className="cover-bg-img" src={src} preload="none" autoPlay muted playsInline  {...video} /> }
            {(video && imageOnly) && <Image className="cover-bg-img" src={video.poster} fill alt={alt} sizes="(max-width: 768px) 100vw,(max-width: 1200px) 70vw,100vw"/>}
        </Bg>

    );
});



export default BgImage;
