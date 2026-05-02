import {dsnCN} from "../../hooks/helper";
import DsnGrid, {DsnGridProps} from "../../layout/DsnGrid";
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


function BrandClient({className, ...retsProps}: DsnGridProps) {

    return (
        <DsnGrid className={dsnCN("brand-client wrapper-client", className)} {...retsProps}>


                {data && data.map(($item, $index) =>
                    <div className="logo-box" key={$index}>
                        <div className="logo-box-inner p-relative">
                            <Image src={$item?.src} alt={""} width={180} height={54}/>
                        </div>
                    </div>
                )}


        </DsnGrid>
    );
}

export default BrandClient;