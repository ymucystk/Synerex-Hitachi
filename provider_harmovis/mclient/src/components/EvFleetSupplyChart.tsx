import * as React from 'react';
import Chart from "react-google-charts";
import { EvFleetSupply } from '../@types'

interface Props {
  width?: string,
  height?: string,
  options?: any,
  vehicle_id: number,
  evfleetsupply: EvFleetSupply[]
  vehiclelist: any
}
export default class EvFleetSupplyChart extends React.Component<Props> {
  render() {
    if(this.props.vehicle_id !== undefined &&
      this.props.evfleetsupply.findIndex(x=>x.vehicle_id === this.props.vehicle_id) >= 0){
      return (<_EvFleetSupplyChart {...this.props} />);
    }else{
      return (null);
    }
  }
}

const default_style = { 'background': 'rgba(0,0,0,0)', 'padding': '10px 10px 0px' };
const default_options = {redFrom:0,redTo:25,yellowFrom:25,yellowTo:62.5,greenFrom:62.5,greenTo:100,
    animation:{duration:100}}

class _EvFleetSupplyChart extends React.Component<Props> {

  static defaultProps = {
    width: '100%',
    height: '100%',
    options: {}
  }

  render() {
    const {width,height,vehicle_id,evfleetsupply:_evfleetsupply,options,vehiclelist} = this.props
    const evfleetsupply = _evfleetsupply.map(x=>{return {...x}})
    let dspData:EvFleetSupply = undefined
    for (let i = 0, lengthi = evfleetsupply.length; i < lengthi; i=(i+1)|0) {
        if(vehicle_id === evfleetsupply[i].vehicle_id){
            dspData = evfleetsupply[i]
            break
        }
    }
    if(dspData !== undefined){
      if(vehiclelist!==undefined){
        const vehicle_list = vehiclelist.vehicle_list.find((x:any)=>x.vehicle_id===dspData.vehicle_id)
        if(vehicle_list!==undefined){
          if(dspData.soc === undefined){
            dspData.soc = vehicle_list.soc
          }
          if(dspData.soh === undefined){
            dspData.soh = vehicle_list.soh
          }
          if(dspData.air_conditioner === undefined){
            dspData.air_conditioner = vehicle_list.air_conditioner
          }
        }
      }
      if(dspData.soc === undefined){
        dspData.soc = 0
      }
      if(dspData.soh === undefined){
        dspData.soh = 0
      }
      if(dspData.air_conditioner === undefined){
        dspData.air_conditioner = 0
      }
      const gaugedata = [['Label', 'Value'],['SOC', dspData.soc],['SOH', dspData.soh]]
      const setOptions = Object.assign({},default_options,options)
      return (
          <div style={default_style}>
              <p>車両(vehicle_id)&nbsp;:&nbsp;{vehicle_id}</p>
              <p>エアコン(air_conditioner)&nbsp;:&nbsp;{dspData.air_conditioner >= 1 ? '使用(use)':'未使用(not use)'}</p>
              <p>バッテリー充電率(soc)&nbsp;:&nbsp;{dspData.soc}&nbsp;%</p>
              <p>バッテリー劣化率(soh)&nbsp;:&nbsp;{dspData.soh}&nbsp;%</p>
              <Chart width={width} height={height} data={gaugedata} options={setOptions} chartType="Gauge" />
          </div>
      )
    }else{
      return null
    }
  }
}
