import ParallaxImage, {ParallaxImageProps} from "../Image/ParallaxImage";
import {dsnCN} from "../../hooks/helper";


interface BoxRightProps extends ParallaxImageProps {

}


function BoxRight({className, children, ...restProps}: BoxRightProps) {
    return (
        <div className="box-seat box-seat-full">
            <div className="box-im h-100">
                <ParallaxImage height={"100%"} overlay={2} {...restProps}   />
            </div>
            <div className={dsnCN("pro-text ml-auto box-padding", className)}>
                {children}
            </div>
        </div>
    );
}

export default BoxRight;