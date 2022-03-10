import * as React from 'react';
import Chart from "react-google-charts";
import { route_line_color, rgbStrChg, Deliveryplanningrequest, Deliveryplanningprovide, Deliveryplanadoption } from '../library'
import { PlanList, DeliveryPlanningProvide, PackagePlan, ChargingPlan } from '../@types'
import { access } from 'fs';

interface Props {
  display_mode: string,
  plan_index:number,
  plan_list: PlanList[],
  vehicle_id: number,
  vehicle_id_list: number[],
  deliveryplanningrequest: Deliveryplanningrequest,
  deliveryplanningprovide: Deliveryplanningprovide,
  deliveryplanadoption: Deliveryplanadoption,
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
        const {deliveryplanadoption} = this.props
        const adoptReceive = deliveryplanadoption.adoptReceive()
        return (<li><table>{
          this.props.plan_list.map((x,idx)=>{
            if(adoptReceive&&(!deliveryplanadoption.adoption(x.module_id,x.provide_id))){
              return null;
            }else{
              return (<_DeliveryPlanTimeline {...{...this.props,plan_index:idx}} />);
            }
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
const default_options = { timeline:{ colorByRowLabel:false }, alternatingRowStyle:false, tooltip:{trigger:'focus'} }
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
  }
  setHeight: string
  sts_vehicle_id: number

  static defaultProps = {
    width: '1090px', //max1090px
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
    const {display_mode,plan_index,plan_list,vehicle_id, allVehicleMode, onChangeAllVehicleMode,
      deliveryplanningrequest,deliveryplanningprovide,width,height,columnDef,rows,options} = this.props
    const {module_id,provide_id} = plan_list[plan_index]
    const delivery_plan = deliveryplanningprovide.delivery_plan(module_id,provide_id)
    const charging_plan = deliveryplanningprovide.charging_plan(module_id,provide_id)
    const Vehicle_assignate = deliveryplanningprovide.Vehicle_assignate(module_id,provide_id)
    if(Vehicle_assignate===undefined){
      return (null);
    }

    let dsp_vehicle_id = vehicle_id
    const dsp_vehicle_id_list = Vehicle_assignate.map(x=>x.vehicle_id)
    if(display_mode==='plan'){
      if(this.sts_vehicle_id===undefined){
        this.sts_vehicle_id = dsp_vehicle_id_list[0]
      }
      dsp_vehicle_id = this.sts_vehicle_id
    }else{
      if(dsp_vehicle_id_list.find(x=>x===dsp_vehicle_id) === undefined){
        dsp_vehicle_id = dsp_vehicle_id_list[0]
      }
    }
    const allVehicle:number[] = []
    if(allVehicleMode){
      for(const id of dsp_vehicle_id_list){
        allVehicle.push(id)
      }
    }else{
      allVehicle.push(dsp_vehicle_id)
    }

    let timelineData:[string,string,Date,Date][] = []

    const info = {delivery_id:0,NumberOfPackages:0,DeliveryPeriod:'',charger_count:0}
    const { target_info, delivery_info, packages_info } = deliveryplanningrequest
    if(delivery_info && packages_info.length > 0){
      info.delivery_id = delivery_info.delivery_id
    }
    if(delivery_plan !== undefined){
      info.NumberOfPackages = delivery_plan.reduce((acc,x)=>(acc + x.packages_plan.length),0)
    }
    let overlap_counter = 0

    for(const for_vehicle_id of allVehicle){
      const timelineDataVehicle:typeof timelineData = []
      const va_find_data = Vehicle_assignate.find(x=>x.vehicle_id===for_vehicle_id)
      const dsp_delivery_plan_id = va_find_data.delivery_plan_id
      const dsp_charging_plan_id_list = deliveryplanningprovide.charging_plan_id_list(module_id,provide_id,for_vehicle_id)
      const packages_plan = deliveryplanningprovide.packages_plan(module_id,provide_id,for_vehicle_id)
      const dsp_packages_info_list = packages_plan.map(x=>x)
   
      const time_list:[Date,string][] = dsp_packages_info_list.map(x=>[stringToDate(x.estimated_time_of_arrival),x.estimated_time_of_arrival])
      time_list.sort((a,b) => a[0]>b[0]?1:a[0]<b[0]?-1:0)
      const delivery_start_time = time_list[0][0]
      const delivery_end_time = time_list[time_list.length-1][0]
      for(const cg_plan_id of dsp_charging_plan_id_list){
        timelineDataVehicle.push([
          `車-配-充ID : ${for_vehicle_id}-${dsp_delivery_plan_id}-${cg_plan_id}`,
          //`配送作業時間 : ${time_list[0][1].substring(8,12)}～${time_list[time_list.length-1][1].substring(8,12)}`,
          `作業時間`,
          delivery_start_time, delivery_end_time
        ])
        const dsp_charging_plan_list = charging_plan.filter(x=>x.vehicle_id===for_vehicle_id && x.charging_plan_id===cg_plan_id)
        let overlap_flg = false
        for(const charging_plan of dsp_charging_plan_list){
          const start_time = stringToDate(charging_plan.start_time)
          const end_time = stringToDate(charging_plan.end_time)
          timelineDataVehicle.push([
            `車-配-充ID : ${for_vehicle_id}-${dsp_delivery_plan_id}-${cg_plan_id}`,
            `充 ${charging_plan.charging_station_id}-${charging_plan.charger_id}-${charging_plan.charging_type === 2 ? '急':'通'}`,
            start_time, end_time
          ])
          if(!((start_time < delivery_start_time && end_time <= delivery_start_time) ||
            (delivery_end_time <= start_time && delivery_end_time < end_time))){
            overlap_flg = true
          }
        }
        overlap_counter += overlap_flg?1:0
      }
      timelineData = timelineData.concat(timelineDataVehicle)
    }
    if(target_info && target_info.start_delivery_time && target_info.end_delivery_time){
      const { start_delivery_time,end_delivery_time } = target_info
      info.DeliveryPeriod = editCaption(start_delivery_time,end_delivery_time)
      timelineData.unshift([
        `配送仕様`,info.DeliveryPeriod,
        stringToDate(start_delivery_time), stringToDate(end_delivery_time)
      ])
    }
    info.charger_count = Array.from(new Set(charging_plan.map(x=>`${x.charging_station_id}${x.charger_id}`))).length

    let setHeight = '0px'
    if(height === undefined){
      if(rows === undefined){
        const wk = timelineData.map((element)=>element[0])
        const result = wk.filter((element,index,self)=>{
          return self.indexOf(element) === index;
        })
        setHeight = `${((result.length)*41)+50+(overlap_counter*30)}px`
      }else{
        setHeight = `${(rows*41)+50+(overlap_counter*30)}px`
      }
    }else{
      setHeight = height
    }
    if(setHeight !== this.setHeight){
      this.setHeight = setHeight
      return (null);
    }
    if(timelineData.length > 0){
      const colorstr = rgbStrChg(route_line_color[plan_index%route_line_color.length])
      const data = [columnDef].concat(timelineData)
      const setOptions = Object.assign({},default_options,options)
      return (
        <tr><td>
        <span style={{margin:'0px 10px'}} >
          <button onClick={this.listExpansion.bind(this,`expand-${plan_index}`)}
          style={{cursor:'pointer',fontWeight:'bold',color:colorstr,background:'black'}} >運行データ：{plan_list[plan_index].name}</button>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;配送ID：{info.delivery_id}
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;配送先数：{info.NumberOfPackages}
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;配送仕様：{info.DeliveryPeriod}
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;車両台数：{dsp_vehicle_id_list.length}
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;充電器数：{info.charger_count}
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
                <div className="form-select" title='車両ID選択'>
                  <label htmlFor="VehicleIdSelect" className="form-select-label">車両ID選択</label>
                  <select id="VehicleIdSelect" value={dsp_vehicle_id} onChange={this.getVehicleIdSelected.bind(this)}>
                  {dsp_vehicle_id_list.map(x=><option value={x} key={x}>{`車両 ${x}`}</option>)}
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
