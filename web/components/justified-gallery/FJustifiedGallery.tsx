import  {useEffect, useRef} from 'react';
import {dsnCN} from "../../hooks/helper";
import {Fancybox as NativeFancybox} from "@fancyapps/ui";
import Image from "next/image";

export interface FJustifiedGalleryProps {
    gutter?: number | Object | { horizontal: 10, vertical: 10 },
    rowHeight?: number,
    rowHeightTolerance?: number,
    lastRow?: 'left' | 'center' | 'right' | 'hide',
    resizeDebounce?: number,
    className?: string,
    children?: any,
    images?: [{ src?: string, alt?: string, caption?: string, groupPopup?: string }],
    options?: {
        infinite: true | false,
        hideScrollbar: true | false,
        animated: true | false,
        startIndex: 0,
    }
}


function FJustifiedGallery({images, className, children, options, ...restProps}: FJustifiedGalleryProps) {
    const ref = useRef();
    const generateId = "_"+images.length;


    useEffect(() => {
        // @ts-ignore
        const gallery = fjGallery(ref.current, {
            itemSelector: '.fj-gallery-item',
            ...restProps
        });

        NativeFancybox.bind("[data-fancybox]", options);

        return () => {
            // @ts-ignore
            fjGallery(gallery, 'destroy');
            NativeFancybox.destroy();
        }

    }, []);// eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className={dsnCN('fj-gallery', className)} ref={ref}>
            {images && images.map(({src, alt, caption, groupPopup}, index) =>
                <FjgItem src={src} alt={alt}
                         caption={caption} key={index}
                         groupPopup={groupPopup || generateId}/>)}
            {children}
        </div>
    );
}

FJustifiedGallery.defaultProps = {
    gutter: 15,
}


export function FjgItem({src, alt, caption, groupPopup}) {
    return (
        <div className="fj-gallery-item"
             data-src={src}
             data-caption={caption}
             data-fancybox={groupPopup || ''}
        >
            <Image src={src} alt={alt || ''} width={730} height={411}/>
            {caption && <div className="cap"><span>{caption}</span></div>}
        </div>
    );
}

FJustifiedGallery.item = FjgItem;

export default FJustifiedGallery;