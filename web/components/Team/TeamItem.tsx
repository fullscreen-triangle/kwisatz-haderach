import {dsnCN} from "../../hooks/helper";
import Image from 'next/image';



function TeamItem({className , data}) {
    return (
        <div className={dsnCN("team-item" , className)}>
            <div className="team-item-inner">
                <div className="team-item-wrapper background-section">
                    <div className="item-content d-flex a-item-center">
                        <div className="box-img p-relative">
                            <Image className={"cover-bg-img"} src={data?.src} alt={data.name} width={260} height={278} sizes="(max-width: 768px) 100vw,(max-width: 1200px) 400px,100vw"/>
                        </div>
                        <div className="box-text">
                            <h4 className="sm-title-block mb-5">{data.name}</h4>
                            <h5 className="theme-color">{data.position}</h5>

                            <ul className="box-social mt-20">
                                {data.social && data.social.map(($item , $index) => <li key={$index} data-dsn="parallax"><a href={$item.url}>{$item.title}</a></li>)}
                            </ul>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}


export default TeamItem;