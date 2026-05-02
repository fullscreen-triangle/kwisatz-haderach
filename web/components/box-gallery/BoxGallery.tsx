import  {useEffect, useRef} from "react";
import {Fancybox as NativeFancybox} from "@fancyapps/ui";
import {dsnCN, generateString} from "../../hooks/helper";
import DsnGrid, {DsnGridProps} from "../../layout/DsnGrid";
import Image from "next/image";

interface boxGalleryProps extends DsnGridProps {
    images?: [],
    options: {
        infinite?: true | false;
        hideScrollbar?: true | false;
        animated?: true | false;
        startIndex?: 0;
    }

}

function BoxGallery({children, className, images, options, ...restProps}: boxGalleryProps) {
    const target = useRef();
    const generateId = generateString(5);

    useEffect(() => {
        NativeFancybox.bind("[data-fancybox]", options);

        return () => {
            NativeFancybox.destroy();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className={dsnCN("dsn-box-gallery", className)} ref={target}>
            <DsnGrid   {...restProps} >
                {images &&
                images.map(({src, alt, caption, groupPopup}, index) => (
                    // @ts-ignore
                    <BoxGalleryItem
                        src={src}
                        alt={alt}
                        caption={caption}
                        key={index}
                        groupPopup={groupPopup || generateId}
                    />
                ))}
                {children}
            </DsnGrid>
        </div>
    );
}

BoxGallery.defaultProps = {
    options: {
        infinite: false,
    },
};

export function BoxGalleryItem({src, caption, groupPopup, className, ...restProps}) {
    return (
        src && (
            <div
                className={`p-relative  ${className || ""}`}
                {...restProps}
                data-src={src}
                data-caption={caption}
                data-fancybox={groupPopup || ""}
            >
                <div className="p-relative over-hidden h-v-60">
                    <Image className="cover-bg-img" src={src} alt={dsnCN("" , caption)} fill
                           sizes="(max-width: 768px) 100vw,(max-width: 1200px) 75vw,100vw"/>
                </div>

                {caption && <div className="caption">{caption}</div>}
            </div>
        )
    );
}

BoxGallery.item = BoxGalleryItem;

export default BoxGallery;
