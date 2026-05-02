import Image from "next/image";

interface AwardsItemProps {
    className?: string,
    data?: { number: number, src: string, title: "string" } | any
}

function AwardsItem({className, data, ...restProps}:AwardsItemProps) {
    return (
        <div className="award-item has-border" {...restProps}>
            <div className="award-number">{data.number}</div>
            <div className="award-logo">

                <Image
                    src={data.src} alt="" width={200} height={200}
                />
                <h4 className="sm-title-block">{data.title}</h4>
            </div>
        </div>
    );
}

export default AwardsItem;
