import * as React from 'react';
import Chart from "react-google-charts";
import { route_line_color, rgbStrChg } from '../containers/app'
import { PlanList, DeliveryPlanningRequest, DeliveryPlanningProvide, PackagePlan, ChargingPlan } from '../@types'

interface Props {
  display_mode: string,
  plan_index:number,
  plan_list: PlanList[],
  vehicle_id: number,
  delivery_plan_id: number,
  charging_plan_id: number,
  vehicle_id_list: number[],
  charging_plan_id_list: number[],
  packages_info_list: PackagePlan[],
  deliveryplanningrequest: DeliveryPlanningRequest,
  deliveryplanningprovide: DeliveryPlanningProvide[],
  getVehicleIdSelected: any,
  allVehicleMode:boolean,
  onChangeAllVehicleMode: any,
  width?: string,
  height?: string,
  columnDef?: any[],
  rows?: number,
  options?: any,
}
export class DeliveryPlanTimeline extends React.Component<Props> {
  render() {
    if(this.props.plan_list.length > 0){
      if(this.props.display_mode === 'plan'){
        return (<li><table>{
          this.props.plan_list.map((x,idx)=>{
            return (<_DeliveryPlanTimeline {...{...this.props,plan_index:idx}} />);
          })
        }</table></li>)
      }else{
        return (<li><table><_DeliveryPlanTimeline {...this.props} /></table></li>);
      }
    }
    return (null);
  }
}

const default_style = { 'background': 'white', 'padding': '5px 10px 0px' };
const default_options = { timeline:{ colorByRowLabel:false }, alternatingRowStyle:false }
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
const editCaption = (startDate:string,endDate:string)=>{
  if(startDate.length === 14 && endDate.length === 14){
    return `${startDate.substring(8, 10)}:${startDate.substring(10, 12)} ～ ${endDate.substring(8, 10)}:${endDate.substring(10, 12)}`
  }
  return ''
}

class _DeliveryPlanTimeline extends React.Component<Props> {

  constructor (props: Props) {
		super(props)
    this.setHeight = '0px'
    this.sts_vehicle_id = undefined
    this.sts_charging_plan_id = undefined
  }
  setHeight: string
  sts_vehicle_id: number
  sts_charging_plan_id: number

  static defaultProps = {
    width: '1090px',
    columnDef: [
      { type: 'string', id: 'Category' },{ type: 'string', id: 'Subcategory' },
      { type: 'date', id: 'Start' },{ type: 'date', id: 'End' }],
    options: {}
  }

  listExpansion(id: string){
    let obj=document.getElementById(id).style;
    obj.display=(obj.display==='none')?'block':'none';
  }

  getVehicleIdSelected (e :any):void {
    this.props.getVehicleIdSelected(e)
    const vehicle_id = +e.target.value
    this.sts_vehicle_id = vehicle_id
	}

  render() {
    const {display_mode,plan_index,plan_list,vehicle_id,delivery_plan_id,charging_plan_id,
      vehicle_id_list,packages_info_list,charging_plan_id_list, allVehicleMode, onChangeAllVehicleMode,
      deliveryplanningrequest,deliveryplanningprovide,width,height,columnDef,rows,options} = this.props
    const {module_id,provide_id} = plan_list[plan_index]
    const {delivery_plan,charging_plan,Vehicle_assignate} = deliveryplanningprovide.find(x=>x.module_id===module_id && x.provide_id===provide_id)
    if(Vehicle_assignate===undefined){
      return (null);
    }

    let dsp_vehicle_id = vehicle_id
    let dsp_vehicle_id_list = vehicle_id_list
    if(display_mode==='plan'){
      dsp_vehicle_id_list = Vehicle_assignate.map(x=>x.vehicle_id)
      if(this.sts_vehicle_id===undefined){
        this.sts_vehicle_id = dsp_vehicle_id_list[0]
      }
      dsp_vehicle_id = this.sts_vehicle_id
    }
    const allVehicle:number[] = []
    if(allVehicleMode){
      for(const id of dsp_vehicle_id_list){
        allVehicle.push(id)
      }
    }else{
      allVehicle.push(dsp_vehicle_id)
    }

    const timelineData:[string,string,Date,Date][] = []
    for(const for_vehicle_id of allVehicle){
      let dsp_delivery_plan_id = delivery_plan_id
      let dsp_charging_plan_id = charging_plan_id
      let dsp_charging_plan_id_list = charging_plan_id_list
      let dsp_packages_info_list = packages_info_list
      if(allVehicle.length > 1){
  
        const va_find_data = Vehicle_assignate.find(x=>x.vehicle_id===for_vehicle_id)
        dsp_delivery_plan_id = va_find_data.delivery_plan_id
  
        dsp_charging_plan_id_list = va_find_data.charging_plans.map(x=>x.charging_plan_id)
        if(this.sts_charging_plan_id===undefined){
          this.sts_charging_plan_id = dsp_charging_plan_id_list[0]
        }
        dsp_charging_plan_id = this.sts_charging_plan_id
  
        const dp_find_data = delivery_plan.find(x=>x.delivery_plan_id===dsp_delivery_plan_id)
        dsp_packages_info_list = dp_find_data.packages_plan.map(x=>x)
      }
  
      const time_list:[Date,string][] = dsp_packages_info_list.map(x=>[stringToDate(x.estimated_time_of_arrival),x.estimated_time_of_arrival])
      time_list.sort((a,b) => a[0]>b[0]?1:a[0]<b[0]?-1:0)
      for(const cg_plan_id of dsp_charging_plan_id_list){
        const delivery_start_time = time_list[0][0]
        const delivery_end_time = time_list[time_list.length-1][0]
        timelineData.push([
          `車両-配送-充電ID : ${for_vehicle_id}-${dsp_delivery_plan_id}-${cg_plan_id}`,
          `配送作業時間 : ${time_list[0][1].substring(8,12)}～${time_list[time_list.length-1][1].substring(8,12)}`,
          delivery_start_time, delivery_end_time
        ])
        const dsp_charging_plan_list = charging_plan.filter(x=>x.vehicle_id===for_vehicle_id && x.charging_plan_id===cg_plan_id)
        for(const charging_plan of dsp_charging_plan_list){
          const start_time = stringToDate(charging_plan.start_time)
          const end_time = stringToDate(charging_plan.end_time)
          if((start_time < delivery_start_time && end_time <= delivery_start_time) ||
            (delivery_end_time <= start_time && delivery_end_time < end_time)){
            timelineData.push([
              `車両-配送-充電ID : ${for_vehicle_id}-${dsp_delivery_plan_id}-${cg_plan_id}`,
              `充電 ${charging_plan.charging_station_id}-${charging_plan.charger_id}-${charging_plan.charging_type === 2 ? '急':'通'}`,
              start_time, end_time
            ])
          }else{
            timelineData.push([
              `車両-配送-充電ID : ${for_vehicle_id}-${dsp_delivery_plan_id}-${cg_plan_id}-補`,
              `充電 ${charging_plan.charging_station_id}-${charging_plan.charger_id}-${charging_plan.charging_type === 2 ? '急':'通'}`,
              start_time, end_time
            ])
          }
        }
      }
    }

    const info = {NumberOfPackages:0,DeliveryPeriod:''}
    if(deliveryplanningrequest !== undefined && deliveryplanningrequest.delivery_info &&
      deliveryplanningrequest.delivery_info.packages_info &&deliveryplanningrequest.delivery_info.packages_info.length > 0){
      info.NumberOfPackages = deliveryplanningrequest.delivery_info.packages_info.length
    }
    if(deliveryplanningrequest !== undefined && deliveryplanningrequest.target_info &&
      deliveryplanningrequest.target_info.start_delivery_time && deliveryplanningrequest.target_info.end_delivery_time){
      const { start_delivery_time,end_delivery_time } = deliveryplanningrequest.target_info
      info.DeliveryPeriod = editCaption(start_delivery_time,end_delivery_time)
    }
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
      const colorstr = rgbStrChg(route_line_color[plan_index])
      const data = [columnDef].concat(timelineData)
      const setOptions = Object.assign({},default_options,options)
      return (
        <tr><td>
        <span style={{margin:'0px 10px'}} >
          <button onClick={this.listExpansion.bind(this,`expand-${plan_index}`)}
          style={{cursor:'pointer',fontWeight:'bold',color:colorstr}} >プラン：{plan_list[plan_index].name}</button>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;配送パッケージ数：{info.NumberOfPackages}
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;配送仕様：{info.DeliveryPeriod}
        </span>
        <span id={`expand-${plan_index}`} style={{display: 'block',clear: 'both'}}>
          <table>
            <tr>
              {/*display_mode==='plan'*/false?
                <td>
                  <input type="checkbox" onChange={onChangeAllVehicleMode}
                    className="harmovis_input_checkbox" checked={allVehicleMode} />全車両モード
                </td>
              :null}
              <td>
              {dsp_vehicle_id_list.length > 0 && !allVehicleMode?
                <div className="form-select" title='車両(vehicle_id)選択'>
                  <label htmlFor="VehicleIdSelect" className="form-select-label">車両(vehicle_id)選択</label>
                  <select id="VehicleIdSelect" value={dsp_vehicle_id} onChange={this.getVehicleIdSelected.bind(this)}>
                  {dsp_vehicle_id_list.map(x=><option value={x} key={x}>{x}</option>)}
                  </select>
                </div>:null}
              </td>
            </tr>
          </table>
          <div style={default_style}>
            <Chart width={width} height={setHeight} data={data} options={setOptions} chartType="Timeline" />
          </div>
        </span>
        </td></tr>
      );
    }else{
      return (null);
    }
  }
}
