import * as React from 'react'
import { PlayButton, PauseButton, ReverseButton, ForwardButton,
  ElapsedTimeRange, ElapsedTimeValue, SpeedRange, SpeedValue, SimulationDateTime,
  NavigationButton, 
  Movesbase} from 'harmoware-vis'
import { Icon } from 'react-icons-kit'
import { ic_delete as icDelete } from 'react-icons-kit/md'
import OsmInput from './xml-input'
import MovesInput from './moves-input'
import ChartComponent from './chartComponent'
import RadioButtons from './radiobuttons'
import {route_line_color,rgbStrChg} from '../containers/app'
import { DeliveryPlanningRequest, DeliveryPlanningProvide, DeliveryPlanAdoption, PlanList } from '../@types'

const stringToDate = (strDate:string)=>{
  if(strDate.length === 14){
    const year = parseInt(strDate.substring(0, 4))
    const month = parseInt(strDate.substring(4, 6))-1
    const date = parseInt(strDate.substring(6, 8))
    const hour = parseInt(strDate.substring(8, 10))
    const min = parseInt(strDate.substring(10, 12))
    const sec = parseInt(strDate.substring(12, 14))
    const dateObject = new Date(year, month, date, hour, min, sec)
    return dateObject.toLocaleString('ja-JP', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short'
    })
  }
  return ''
}

interface ControllerProps {
  deleteMovebase: any,
  actions : any,
  settime: any, 
  timeBegin: any, 
  leading: any, 
  timeLength: number, 
  secperhour: number, 
  animatePause: boolean, 
  animateReverse: boolean,
  getMoveDataChecked: any, 
  getMoveOptionChecked: any, 
  getOsmData: any, 
  inputFileName: any, 
  viewport: any ,
  ExtractedData: any,
  movesBaseLoad: Function,
  chartData: any,
  display_mode: string,
  display_mode_list: {value:string,caption:string}[],
  getDisplayModeSelected: any, 
  plan_index:number
  plan_list: PlanList[]
  getplanSelected: any,
  vehicle_id: number,
  getModuleIdSelected: any, 
  getProvideIdSelected: any, 
  getVehicleIdSelected: any,
  vehicle_id_list: number[],
  delivery_plan_id: number,
  charging_plan_id: number,
  delivery_plan_id_list: number[],
  charging_plan_id_list: number[],
  getDeliveryPlanIdSelected: any,
  getChargingPlanIdSelected: any,
  allVehicleMode: boolean,
  onChangeAllVehicleMode: any,
  deliveryplanningrequest: DeliveryPlanningRequest,
  deliveryplanningprovide: DeliveryPlanningProvide[],
  deliveryplanadoption: DeliveryPlanAdoption[]
}

export default class Controller extends React.Component<ControllerProps, {}> {
  constructor (props:ControllerProps) {
      super(props)
  }

  deleteMovebase () {
    this.props.deleteMovebase()
  }

  movesBaseSave(){
    const resultJson = JSON.stringify(this.props.ExtractedData.movesbase);
    const downLoadLink = document.createElement("a");
    downLoadLink.download = 'movesbase-' + Date.now() + '.json';
    downLoadLink.href = URL.createObjectURL(new Blob([resultJson], {type: "text.plain"}));
    downLoadLink.dataset.downloadurl = ["text/plain", downLoadLink.download, downLoadLink.href].join(":");
    downLoadLink.click();
  }

  movesBaseLoad(movesbase:Movesbase){
    this.props.movesBaseLoad(movesbase)
  }

  render () {
    const { settime, timeBegin, leading, timeLength, actions, secperhour, animatePause, animateReverse, vehicle_id_list,
      plan_index, plan_list, getMoveDataChecked, getMoveOptionChecked, display_mode, display_mode_list, getDisplayModeSelected,
      inputFileName, viewport, getOsmData, chartData,
      deliveryplanningrequest, deliveryplanningprovide:deliveryplanningprovideList, deliveryplanadoption } = this.props

    const { movesFileName, osmDataFileName } = inputFileName
    const { module_id, provide_id } = plan_list.length > 0?plan_list[plan_index]:{ module_id:undefined, provide_id:undefined }
    const module_id_list = plan_list.map(x=>x.module_id)
    const provide_id_list = plan_list.map(x=>x.provide_id)
    const deliveryplanningprovide = deliveryplanningprovideList.find((x=>x.module_id === module_id && x.provide_id === provide_id))

    return (<>
      <div className='harmovis_controller'>
        <div className='container'>
          <ul className='list-group'>
            {false?
            <li><span>ＯＳＭデータロード</span>
              <div className='harmovis_input_button_column'>
                <label htmlFor="OsmInput" className="btn btn-outline-light btn-sm w-100">
                  ＯＳＭデータ選択<OsmInput actions={actions} id="OsmInput" getOsmData={getOsmData}/>
                </label>
                <div>{osmDataFileName || '選択されていません'}</div>
              </div>
            </li>:null}
            {false?<>
              <li>
              <div className='form-check'>
                <input type='checkbox' id='MoveDataChecked' onChange={getMoveDataChecked} className='form-check-input' defaultChecked={true} />
                <label htmlFor='MoveDataChecked' className='form-check-label'>移動データ表示</label>
              </div>
            </li>
            <li>
              <div className='form-check'>
                <input type='checkbox' id='MoveOptionChecked' onChange={getMoveOptionChecked} className='form-check-input' />
                <label htmlFor='MoveOptionChecked' className='form-check-label'>移動データオプション表示</label>
              </div>
            </li>
            </>:null}
            {false?<>
            <li><span>移動データセーブ</span>
              <div className='btn-group d-flex' role='group'>
                <button className='btn btn-outline-light btn-sm w-100' onClick={this.movesBaseSave.bind(this)}>
                  <span className='button_span'>Data Save</span>
                </button>
              </div>
            </li>
            <li><span>移動データロード</span>
              <div className='harmovis_input_button_column'>
                <label htmlFor="MovesInput" className="btn btn-outline-light btn-sm w-100">
                  移動データ選択<MovesInput actions={actions} movesBaseLoad={this.movesBaseLoad.bind(this)} id="MovesInput" />
                </label>
                <div>{movesFileName || '選択されていません'}</div>
              </div>
            </li>            
            </>:null}
            <li><span>ナビゲーションパネル</span>
              <div className='btn-group d-flex' role='group'>
                <NavigationButton buttonType='zoom-in' actions={actions} viewport={viewport} className='btn btn-outline-light btn-sm w-100' />
                <NavigationButton buttonType='zoom-out' actions={actions} viewport={viewport} className='btn btn-outline-light btn-sm w-100' />
                <NavigationButton buttonType='compass' actions={actions} viewport={viewport} className='btn btn-outline-light btn-sm w-100' />
              </div>
            </li>            
            <li>ズームレベル：{viewport.zoom}</li>

            {false?
            <li>{/*<span>コントロールパネル</span>*/}
              <div className='btn-group d-flex' role='group'>
                {animatePause ?
                  <PlayButton actions={actions} className='btn btn-outline-light btn-sm w-100' /> :
                  <PauseButton actions={actions} className='btn btn-outline-light btn-sm w-100' />
                }
                {animateReverse ?
                  <ForwardButton actions={actions} className='btn btn-outline-light btn-sm w-100' /> :
                  <ReverseButton actions={actions} className='btn btn-outline-light btn-sm w-100' />
                }
              </div>
            </li>:null}
            <li>
              日時&nbsp;<SimulationDateTime settime={settime} />
            </li>
            <li>
              <div className="form-select" title='表示モード選択'>
                <label htmlFor="DisplayModeSelected" className="form-select-label">表示モード選択</label>
                <select id="DisplayModeSelected" value={display_mode} onChange={getDisplayModeSelected} >
                {display_mode_list.map(x=><option value={x.value} key={x.value}>{x.caption}</option>)}
                </select>
              </div>
            </li>
            {false?
            <li>
            <label htmlFor='ElapsedTimeRange'>経過時間<ElapsedTimeValue settime={settime} timeBegin={timeBegin} timeLength={Math.floor(timeLength)} actions={actions} />/&nbsp;{Math.floor(timeLength)}&nbsp;秒</label>
            <ElapsedTimeRange settime={settime} timeLength={Math.floor(timeLength)} timeBegin={timeBegin} min={-leading} actions={actions} id='ElapsedTimeRange' className='form-control-range' />
            </li>:null}
            {false?
            <li>
              <label htmlFor='SpeedRange'>スピード<SpeedValue secperhour={secperhour} actions={actions} />秒/時</label>
              <SpeedRange secperhour={secperhour} actions={actions} id='SpeedRange' className='form-control-range' />
            </li>:null}
            {false?
            <li>
              <div className='btn-group d-flex' role='group'>
                <button onClick={this.deleteMovebase.bind(this)} className='btn btn-outline-light btn-sm w-100'>
                  <span className='button_span'><Icon icon={icDelete} />Clear Data</span>
                </button>
              </div>
            </li>:null}
            {deliveryplanningrequest && deliveryplanningrequest.target_info ?<>
            <li>
              <p>最大車両:&nbsp;{deliveryplanningrequest.target_info.max_vehicle_unit}</p>
              <p>配送開始:&nbsp;{stringToDate(deliveryplanningrequest.target_info.start_delivery_time)}</p>
              <p>配送終了:&nbsp;{stringToDate(deliveryplanningrequest.target_info.end_delivery_time)}</p>
              {deliveryplanningrequest && deliveryplanningrequest.delivery_info ?<>
                <p>配送ID:&nbsp;{deliveryplanningrequest.delivery_info.delivery_id}</p>
                <p>配送パッケージ数:&nbsp;{deliveryplanningrequest.delivery_info.packages_info.length}</p>
              </>:null}
              {plan_list.length > 0 && deliveryplanningprovide !== undefined ?<>
                <p>{plan_list[plan_index].name}&nbsp;車両台数:&nbsp;{vehicle_id_list.length}</p>
                <p>{plan_list[plan_index].name}&nbsp;充電器数:&nbsp;
                  {Array.from(new Set(deliveryplanningprovide.charging_plan.map(x=>`${x.charging_station_id}${x.charger_id}`))).length}</p>
              </>:null}
              {plan_list.length > 0 && module_id_list.length > 0 && provide_id_list.length > 0?<>
                <p>{plan_list[plan_index].name}&nbsp;採用状況:&nbsp;{deliveryplanadoption.findIndex(x=>x.module_id === module_id && x.provide_id === provide_id) < 0?'未採用':'採用'}</p>
              </>:null}
            </li>
            </>:null}
            {display_mode==='vehicle' ? <VehicleMode {...this.props} /> : <><PlanMode {...this.props} /></>}
          </ul>
        </div>
      </div>
      <div className='harmovis_graph'>
        <div className='container'>
          <ul className='list-group'>
            <li>
              <ChartComponent chartData={chartData} />
            </li>
          </ul>
        </div>
      </div>
      </>
    )
  }
}

class VehicleMode extends React.Component<ControllerProps, {}> {
  constructor (props:ControllerProps) {
      super(props)
  }

  render () {
    const { plan_index, plan_list, getplanSelected, vehicle_id, vehicle_id_list, getVehicleIdSelected, deliveryplanadoption,
      charging_plan_id, charging_plan_id_list, getChargingPlanIdSelected, allVehicleMode, onChangeAllVehicleMode } = this.props

    const adoptReceive = deliveryplanadoption.length > 0

    const list:any[] = vehicle_id_list.map((x,index)=>{
      const colorstr = rgbStrChg(route_line_color[index%route_line_color.length])
      return {
        value:x,
        caption:<><span style={{color:colorstr}}>◆</span>&nbsp;{`車両 ${x}`}</>,
        checked:(vehicle_id===x),
        disabled:false
      }
    })
    const RadioButtonProps = {
      name:'VehicleIds', list, onChange:getVehicleIdSelected
    }

    return (<>
        {plan_list.length > 0?
        <li>
          <div className="form-select" title='運行データ'>
            <label htmlFor="planSelected" className="form-select-label">運行データ</label>
            <select id="planSelected" value={plan_index} onChange={getplanSelected} >
            {plan_list.map(x=><option value={x.index} key={x.index}
              disabled={adoptReceive&&(deliveryplanadoption.find(y=>y.module_id===x.module_id&&y.provide_id===x.provide_id)===undefined)}>
                {x.name}{adoptReceive?(deliveryplanadoption.find(y=>y.module_id===x.module_id&&y.provide_id===x.provide_id)===undefined)?' <不採用>':' <採用>':''}</option>)}
            </select>
          </div>
        </li>:null}
        {/*{module_id_list.length > 0?
        <li>
          <div className="form-select" title='Dispatcher識別(module_id)選択'>
            <label htmlFor="ModuleIdSelect" className="form-select-label">Dispatcher識別(module_id)選択</label>
            <select id="ModuleIdSelect" value={module_id} onChange={getModuleIdSelected} >
            {module_id_list.map(x=><option value={x} key={x}>{x}</option>)}
            </select>
          </div>
        </li>:null}*/}
        {/*{provide_id_list.length > 0?
        <li>
          <div className="form-select" title='配送計画(provide_id)選択'>
            <label htmlFor="ProvideIdSelect" className="form-select-label">配送計画(provide_id)選択</label>
            <select id="ProvideIdSelect" value={provide_id} onChange={getProvideIdSelected} >
            {provide_id_list.map(x=><option value={x} key={x}>{x}</option>)}
            </select>
          </div>
        </li>:null}*/}
        {vehicle_id_list.length > 0?
          <><li>
              <input type="checkbox" onChange={onChangeAllVehicleMode}
              className="harmovis_input_checkbox" checked={allVehicleMode} />&nbsp;全車両モード
            </li>
            <li>
              {allVehicleMode?
                <div><span>車両ID一覧</span>
                  <RadioButtons {...RadioButtonProps} />
                </div>:
                <div className="form-select" title='車両ID選択'>
                  <label htmlFor="VehicleIdSelect" className="form-select-label">車両ID選択</label>
                  <select id="VehicleIdSelect" value={vehicle_id} onChange={getVehicleIdSelected} >
                  {vehicle_id_list.map(x=><option value={x} key={x}>{`車両 ${x}`}</option>)}
                  </select>
                </div>
              }
            </li>
          </>:null}
        {/*{delivery_plan_id_list.length > 0?
        <li>
          <div className="form-select" title='配送計画ID(delivery_plan_id)選択'>
            <label htmlFor="deliveryPlanIdSelect" className="form-select-label">配送計画ID(delivery_plan_id)選択</label>
            <select id="deliveryPlanIdSelect" value={delivery_plan_id} onChange={getDeliveryPlanIdSelected} >
            {delivery_plan_id_list.map(x=><option value={x} key={x}>{x}</option>)}
            </select>
          </div>
        </li>:null}*/}
        {/*{charging_plan_id_list.length > 0?
        <li>
          <div className="form-select" title='充電計画ID(charging_plan_id)選択'>
            <label htmlFor="chargingPlanIdSelect" className="form-select-label">充電計画ID(charging_plan_id)選択</label>
            <select id="chargingPlanIdSelect" value={charging_plan_id} onChange={getChargingPlanIdSelected} >
            {charging_plan_id_list.map(x=><option value={x} key={x}>{x}</option>)}
            </select>
          </div>
        </li>:null}*/}
      </>
    )
  }
}

class PlanMode extends React.Component<ControllerProps, {}> {
  constructor (props:ControllerProps) {
      super(props)
  }

  render () {
    const { plan_index, plan_list, getplanSelected, allVehicleMode, onChangeAllVehicleMode, deliveryplanadoption} = this.props
    
    const adoptReceive = deliveryplanadoption.length > 0
    const list:any[] = plan_list.map((x,index)=>{
      const adoption = deliveryplanadoption.find(y=>y.module_id === x.module_id && y.provide_id === x.provide_id)
      const colorstr = rgbStrChg(route_line_color[index%route_line_color.length])
      return {
        value:index,
        caption:<><span style={{color:colorstr}}>◆</span>&nbsp;{x.name}{adoptReceive?adoption===undefined?' <不採用>':' <採用>':''}</>,
        checked:(plan_index===index),
        disabled:(adoptReceive&&adoption===undefined)
      }
    })
    const RadioButtonProps = {
      name:'Plans', list, onChange:getplanSelected
    }

    return (<>
      {plan_list.length > 0?<>
        <li><span>運行データ</span>
          <RadioButtons {...RadioButtonProps} />
        </li>
        <li>
          <input type="checkbox" onChange={onChangeAllVehicleMode}
            className="harmovis_input_checkbox" checked={allVehicleMode} />&nbsp;全車両モード
        </li></>
      :null}
      </>
    )
  }
}
