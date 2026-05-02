import DsnGrid, {DsnGridProps} from "../../layout/DsnGrid";
import {dsnCN} from "../../hooks/helper";
import {getTeamData} from "../../data/team";
import TeamItem from "./TeamItem";

interface TeamProps extends DsnGridProps {
    data?: [{
        id: Number,
        name: string,
        position: string,
        src: string,
        social: [{ title: string, url: string }]
    }]
}

function Team({className, data, ...restProps}: TeamProps) {
    const teamData = data || getTeamData();

    return (
        <DsnGrid className={dsnCN("team", className)}  {...restProps}>


            {
                teamData && teamData.map($item =>
                    // @ts-ignore
                    <TeamItem key={$item.id} data={$item}/>)
            }


        </DsnGrid>
    );
}


export default Team;
