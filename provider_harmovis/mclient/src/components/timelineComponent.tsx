import * as React from 'react';
import Chart from "react-google-charts";

interface Props {
  width?: string,
  height?: string,
  columnDef?: any[]
  data: any[]
  rows?: number
  options?: any
}
export default class TimelineComponent extends React.Component<Props> {
  render() {
    if(this.props.data !== undefined && this.props.data.length > 0){
      return (<_TimelineComponent {...this.props} />);
    }else{
      return (null);
    }
  }
}

const default_style = { 'background': 'white', 'padding': '10px 10px 0px' };
const default_options = { timeline:{ colorByRowLabel:true }, alternatingRowStyle:false }

class _TimelineComponent extends React.Component<Props> {

  static defaultProps = {
    width: '100%',
    columnDef: [
      { type: 'string', id: 'Vehicles' },{ type: 'string', id: 'Chargingtype' },
      { type: 'date', id: 'Start' },{ type: 'date', id: 'End' }],
    options: {}
  }

  render() {
    const {width,height,columnDef,data,rows,options} = this.props
    let setHeight = '0px'
    if(height === undefined){
      if(rows === undefined){
        const wk = data.map((element)=>element[0])
        const result = wk.filter((element,index,self)=>{
          return self.indexOf(element) === index;
        })
        setHeight = `${((result.length)*41)+50}px`
      }else{
        setHeight = `${(rows*41)+50}px`
      }
    }else{
      setHeight = height
    }
    const timelinedata = [columnDef].concat(data)
    const setOptions = Object.assign({},default_options,options)
    return (
    <div style={default_style}>
    <Chart width={width} height={setHeight} data={timelinedata} options={setOptions} chartType="Timeline" />
    </div>
    );
  }
}
