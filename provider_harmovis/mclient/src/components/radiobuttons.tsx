import * as React from 'react';

interface Props {
    name:string,
    list:{
        value:any,
        caption:any,
        defaultChecked:boolean
    }[],
    onChange:React.FormEventHandler<HTMLDivElement>
}

const labelStyle = {'width':'90%','overflow':'hidden','white-space':'nowrap','text-overflow':'ellipsis'}

export default class RadioButtons extends React.Component<Props> {
    constructor(props:Props) {
        super(props);
    }

    render() {
        const {name,list,onChange} = this.props
        return (
            <div className="container">
                <div className="row"  onChange={onChange}>
                    {list.map((x,i)=>{
                        return (
                            <div className="w-100">
                                <input type="radio" id={`${name}-${i}`} value={x.value} name={name} defaultChecked={x.defaultChecked} />
                                <label htmlFor={`${name}-${i}`} style={labelStyle} className="form-check-label" title={x.caption}>&nbsp;{x.caption}</label>
                            </div>
                        )
                    })}
                </div>
            </div>
        );
    }
}
