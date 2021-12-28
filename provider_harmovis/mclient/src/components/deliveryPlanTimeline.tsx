import * as React from 'react';
import Chart from "react-google-charts";
import { DeliveryPlanningRequest, PackagePlan, ChargingPlan } from '../@types'

interface Props {
  delivery_plan_id: number,
  charging_plan_id: number,
  delivery_plan_id_list: number[],
  charging_plan_id_list: number[],
  packages_info_list: PackagePlan[],
  charging_plan_list: ChargingPlan[],
  deliveryplanningrequest: DeliveryPlanningRequest,
  width?: string,
  height?: string,
  columnDef?: any[],
  rows?: number,
  options?: any,
}
export default class DeliveryPlanTimeline extends React.Component<Props> {
  render() {
    if(this.props.delivery_plan_id !== undefined && this.props.charging_plan_id !== undefined &&
      this.props.delivery_plan_id_list.length > 0 && this.props.charging_plan_id_list.length > 0){
      return (<_DeliveryPlanTimeline {...this.props} />);
    }
    return (null);
  }
}

const default_style = { 'background': 'white', 'padding': '10px 10px 0px' };
const default_options = { timeline:{ colorByRowLabel:true }, alternatingRowStyle:false }
const stringToDate = (strDate:string)=>{
  if(strDate.length === 14){
    const year = parseInt(strDate.substring(0, 4))
    const month = parseInt(strDate.substring(4, 6))-1
    const date = parseInt(strDate.substring(6, 8))
    const hour = parseInt(strDate.substring(8, 10))
    const min = parseInt(strDate.substring(10, 12))
    const sec = parseInt(strDate.substring(12, 14))
    return new Date(year, month, date, hour, min, sec)
  }
  return new Date()
}

class _DeliveryPlanTimeline extends React.Component<Props> {

  constructor (props: any) {
		super(props)
    this.setHeight = '0px'
  }
  setHeight: string

  static defaultProps = {
    width: '100%',
    columnDef: [
      { type: 'string', id: 'charging_station_id' },{ type: 'string', id: 'charger_id' },
      { type: 'date', id: 'Start' },{ type: 'date', id: 'End' }],
    options: {}
  }

  render() {
    const {delivery_plan_id,packages_info_list,charging_plan_list,
      deliveryplanningrequest,width,height,columnDef,rows,options} = this.props
    const deliverytimelineData:any[] = []
    for (const packages_info of packages_info_list){
      const Date1 = stringToDate(packages_info.estimated_time_of_arrival)
      const Date2 = Date1
      Date2.setMinutes(Date2.getMinutes() + 5)
      deliverytimelineData.push([
        '配送計画ID : '+delivery_plan_id,
        'パッケージID : '+packages_info.package_id,
        Date1, Date2
      ])
    }
    if(deliveryplanningrequest !== undefined && deliveryplanningrequest.target_info &&
      deliveryplanningrequest.target_info.start_delivery_time && deliveryplanningrequest.target_info.end_delivery_time){
      const { start_delivery_time,end_delivery_time } = deliveryplanningrequest.target_info
      const Date1 = stringToDate(start_delivery_time)
      Date1.setMinutes(Date1.getMinutes() + 5)
      const Date2 = stringToDate(end_delivery_time)
      Date2.setMinutes(Date2.getMinutes() - 5)
      deliverytimelineData.unshift([
        '配送計画ID : '+delivery_plan_id,
        '配送開始',
        stringToDate(start_delivery_time), Date1
      ])
      deliverytimelineData.push([
        '配送計画ID : '+delivery_plan_id,
        '配送終了',
        Date2, stringToDate(end_delivery_time)
      ])
    }
    const chargingtimelineData:any[] = charging_plan_list.map((charging_plan)=>{
      return [
        '充電ステーションID : '+charging_plan.charging_station_id,
        'チャージャーID : '+charging_plan.charger_id + ' タイプ : '+ (charging_plan.charging_type === 2 ? '急速' : '通常'),
        stringToDate(charging_plan.start_time),
        stringToDate(charging_plan.end_time)
      ]
    })
    const timelineData = deliverytimelineData.concat(chargingtimelineData)
    let setHeight = '0px'
    if(height === undefined){
      if(rows === undefined){
        const wk = timelineData.map((element)=>element[0])
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
    if(setHeight !== this.setHeight){
      this.setHeight = setHeight
      return (null);
    }
    if(timelineData.length > 0){
      const data = [columnDef].concat(timelineData)
      const setOptions = Object.assign({},default_options,options)
      return (
        <>
        <div style={default_style}>
          <Chart width={width} height={setHeight} data={data} options={setOptions}  chartType="Timeline" />
        </div>
        </>
      );
    }else{
      return (null);
    }
  }
}
