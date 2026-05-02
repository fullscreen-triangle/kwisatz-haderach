import {dsnCN} from "../../hooks/helper";
import {useEffect, useRef, useState} from "react";
import {gsap} from "gsap";
import {backgroundColor} from "../../hooks/EremiaType";


interface SkillProgressBarProps {
    number: number,
    className?: string,
    children?: any,
    bgColor?: backgroundColor | "pattern"


}

 function SPI({className, bgColor, children, number, ...restProps}: SkillProgressBarProps) {
    const ref = useRef();
    const [width, setWidth] = useState(0);

    useEffect(() => {
        if (number == null)
            return;

        const animate = gsap.to(ref.current, {
            width: number + "%",
            scrollTrigger: {
                trigger: ref.current,
                start: "top 95%",
            },
            onUpdate() {
                setWidth(Math.floor((this.progress() * number)));
            },
            onComplete: function () {
                if (!this.vars.scrollTrigger.scrub) {
                    this.scrollTrigger.kill();
                    this.kill();
                }
            }
        });


        return () => {
            animate?.scrollTrigger?.kill();
            animate?.kill();
        };
    }, []);// eslint-disable-line react-hooks/exhaustive-deps


    return (
        <div className={dsnCN("skills-item", className)} {...restProps}>
            <h4 className="sm-title-block mb-15">
                {children}
            </h4>
            <div className="bar">
                    <span className={dsnCN("fill", bgColor !== "pattern" && bgColor)}
                          style={bgColor == "pattern" ? {backgroundImage: 'url(/img/patterns.png'} : {}} ref={ref}>
                        <span className="number">{width}%</span>
                    </span>
            </div>
        </div>
    );
}


SPI.defaultProps = {
    bgColor: "background-theme"
}

export default SPI;
