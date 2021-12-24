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
import TimelineComponent from './timelineComponent'
import EvFleetSupplyChart from './EvFleetSupplyChart'
import { EvFleetSupply } from '../@types'

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
  data: any,
  vehicle_id: number,
  evfleetsupply: EvFleetSupply[]
  getVehicleIdSelected: any, 
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
    const { settime, timeBegin, leading, timeLength, actions,
      secperhour, animatePause, animateReverse,
      getMoveDataChecked, getMoveOptionChecked, vehicle_id, evfleetsupply,
      inputFileName, viewport, getOsmData, chartData, data, getVehicleIdSelected } = this.props

    const { movesFileName, osmDataFileName } = inputFileName

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
            {evfleetsupply.length > 0?
            <li>
              <div className="form-select" title='車両(vehicle_id)選択'>
                <label htmlFor="VehicleIdSelect" className="form-select-label">車両(vehicle_id)選択</label>
                <select id="VehicleIdSelect" value={vehicle_id} onChange={getVehicleIdSelected} >
                {evfleetsupply.map(x=><option value={x.vehicle_id} key={x.vehicle_id}>{x.vehicle_id}</option>)}
                </select>
              </div>
            </li>:null}
          </ul>
        </div>
      </div>
      <div className='harmovis_gauge'>
        <div className='container'>
          <ul className='list-group'>
            <li>
              <EvFleetSupplyChart vehicle_id={vehicle_id} evfleetsupply={evfleetsupply} />
            </li>
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
      <div className='harmovis_schedule'>
        <div className='container'>
          <ul className='list-group'>
            <li>
              <TimelineComponent data={data} />
            </li>
          </ul>
        </div>
      </div>
      </>
    )
  }
}
