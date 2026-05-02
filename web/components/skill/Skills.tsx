import DsnGrid, {DsnGridProps} from "../../layout/DsnGrid";
import {dsnCN} from "../../hooks/helper";

export {default as SkillProgressBar} from './SkillProgressBar';
export {default as SkillCircleBar} from './SkillCircleItem';


function Skills({className, children, ...restProps}: DsnGridProps) {

    return (

        <DsnGrid className={dsnCN("dsn-skills", className)} col={1} {...restProps}>
            {children}
        </DsnGrid>

    );
}

export default Skills;
