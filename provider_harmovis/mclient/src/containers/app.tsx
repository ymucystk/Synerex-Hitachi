import React from 'react'
import { ArcLayer, PathLayer, TextLayer, LineLayer } from 'deck.gl';
import { SimpleMeshLayer } from '@deck.gl/mesh-layers';
import Axios from 'axios';
import { xml2js } from 'xml-js';
import { Container, connectToHarmowareVis, HarmoVisLayers,
	MovesLayer, DepotsLayer, LineMapLayer,
	LoadingIcon, FpsDisplay, EventInfo, Movesbase } from 'harmoware-vis'
import Controller from '../components/controller'
import EvFleetSupplyChart from '../components/EvFleetSupplyChart'
import DeliveryPlanTimeline from '../components/deliveryPlanTimeline'
import { EvFleetSupply, VehicleList, DeliveryPlanningProvide, ChargingPlans,
	DeliveryPlanningRequest, DeliveryPlanAdoption, PackagePlan, ChargingPlan } from '../@types'

// for objMap.
import {registerLoaders} from '@loaders.gl/core';
import {OBJLoader} from '@loaders.gl/obj';
registerLoaders([OBJLoader]);
const busmesh = './bus.obj';
const busstopmesh = './busstop.obj';
const osmPath = './map.osm';
const transitionDuration = 500 //msec
const {PI:pi,min,max,abs,sin,cos,tan,atan2} = Math;
const radians = (degree: number) => degree * pi / 180;
const degrees = (radian: number) => radian * 180 / pi;

interface PathData { path:number[][], color?:number[], width?:number,
	vehicle_id:number, delivery_plan_id:number, message:string, charging_plans?: ChargingPlans[], }

interface LineData { vehicle_id:number, message:string,
	line_data:{sourcePosition:[number,number,number], targetPosition:[number,number,number], color?:number[], width?:number}[] }
	
const delivery_time_table:string[] = [
	'0 :','1 : 09:00 - 12:00','2 : 14:00 - 18:00','3 : 18:00 - 21:00'
]

export interface State {
	moveDataVisible: boolean,
	moveOptionVisible: boolean,
	controlVisible: boolean,
	fpsVisible:boolean,
	optionChange: boolean,
	mapbox_token: string,
	arcData: any[],
	popup: [number, number, string],
	osm_data: object,
	chartData: object,
};
  
class App extends Container<any,Partial<State>> {

	constructor (props: any) {
		super(props)
		const worker = new Worker('socketWorker.js'); // worker for socket-io communication.
		worker.onmessage = (e) => {
			const msg = e.data;
			if (msg.type === 'RECEIVED_POINT') {
				this.getPoint(msg.payload)
			} else if (msg.type === 'RECEIVED_DISABILITYINFO') {
				this.getDisabilityInfo(msg.payload)
			} else if (msg.type === 'RECEIVED_DISABILITYRESPONSE') {
				this.getDisabilityResponse(msg.payload)
			} else if (msg.type === 'RECEIVED_DISPATCHREQUEST') {
				this.getDispatchRequest(msg.payload)
			} else if (msg.type === 'RECEIVED_DISPATCHRESPONSE') {
				this.getDispatchResponse(msg.payload)
			} else if (msg.type === 'RECEIVED_ROUTEREQUEST') {
				this.getRouteRequest(msg.payload)
			} else if (msg.type === 'RECEIVED_ROUTERESPONSE') {
				this.getRouteResponse(msg.payload)
			} else if (msg.type === 'RECEIVED_VEHICLESTATUSREQUEST') {
				this.getVehicleStatusRequest(msg.payload)
			} else if (msg.type === 'RECEIVED_VEHICLESTATUSRESPONSE') {
				this.getVehicleStatusResponse(msg.payload)
			} else if (msg.type === 'RECEIVED_EVFLEETSUPPLY') {
				this.getEvFleetSupply(msg.payload)
			} else if (msg.type === 'RECEIVED_VEHICLELIST') {
				this.getVehicleList(msg.payload)
			} else if (msg.type === 'RECEIVED_EVFLEETRESPONSE') {
				this.getEvFleetResponse(msg.payload)
			} else if (msg.type === 'RECEIVED_DELIVERYPLANNINGPROVIDE') {
				this.getDeliveryPlanningProvide(msg.payload)
			} else if (msg.type === 'RECEIVED_DISPDISPATCHRESPONSE') {
				this.getDispDispatchResponse(msg.payload)
			} else if (msg.type === 'RECEIVED_DELIVERYPLANNINGREQUEST') {
				this.getDeliveryPlanningRequest(msg.payload)
			} else if (msg.type === 'RECEIVED_DELIVERYPLANADOPTION') {
				this.getDeliveryPlanAdoption(msg.payload)
			} else if (msg.type === 'RECEIVED_DELIVERYPLANNINGRESPONSE') {
				this.getDeliveryPlanningResponse(msg.payload)
			} else if(msg.type === 'RECEIVED_MAPBOX_TOKEN') {
				this.setState({ mapbox_token: msg.payload });
			} else if (msg.type === 'CONNECTED') {
				console.log('connected')
			}
		}

		props.actions.setSecPerHour(3600)
		props.actions.setLeading(5)
		props.actions.setTrailing(0)
		props.actions.setInitialViewChange(false)
		props.actions.setDepotsOptionFunc(()=>{return{}})
		props.actions.setNoLoop(true)
		props.actions.setTimeBegin(Date.now()/1000)
		props.actions.setTimeLength(60);
		props.actions.setExtractedDataFunc(this.getExtractedDataFunc.bind(this));

		this.state = {
			moveDataVisible: true,
			moveOptionVisible: false,
			controlVisible: true,
			fpsVisible:true,
			optionChange: false,
			mapbox_token: '',
			arcData: [],
			popup: [0, 0, ''],
			osm_data: {},
			chartData: undefined,
		}
		this.movesbase = []
		this.module_id = undefined
		this.provide_id = undefined
		this.vehicle_id = undefined
		this.delivery_plan_id = undefined
		this.charging_plan_id = undefined
		this.module_id_list = []
		this.provide_id_list = []
		this.vehicle_id_list = []
		this.delivery_plan_id_list = []
		this.packages_info_list = []
		this.charging_plan_id_list = []
		this.charging_plan_list = []
		this.evfleetsupply = []
		this.evfleetroute= []
		this.deliveryplanningrequest = undefined
		this.vehiclelist = []
		this.deliveryplanadoption = []
		this.deliveryplanningprovide = []
	}
	movesbase:any[]
	canvas: HTMLCanvasElement
	module_id:number
	provide_id:string
	vehicle_id: number
	delivery_plan_id: number
	charging_plan_id: number
	module_id_list: number[]
	provide_id_list: string[]
	vehicle_id_list: number[]
	delivery_plan_id_list: number[]
	packages_info_list: PackagePlan[]
	charging_plan_id_list: number[]
	charging_plan_list:ChargingPlan[]
	evfleetsupply: EvFleetSupply[]
	evfleetroute: LineData[]
	deliveryplanningrequest: DeliveryPlanningRequest
	vehiclelist: VehicleList[]
	deliveryplanadoption: DeliveryPlanAdoption[]
	deliveryplanningprovide: DeliveryPlanningProvide[]

	setModuleId (module_id?:Readonly<number>):void {
		if(this.deliveryplanningprovide.length > 0){
			const module_id_list:number[] = []
			for (const element of this.deliveryplanningprovide){
				if(module_id_list.findIndex(x=>x === element.module_id) < 0){
					module_id_list.push(element.module_id)
				}
			}
			module_id_list.sort((a, b) => (a - b))
			this.module_id_list = module_id_list
			if(module_id === undefined){
				if(this.module_id === undefined){
					this.module_id = module_id_list[0]
				}else{
					if(module_id_list.findIndex(x=>x === this.module_id) < 0){
						this.module_id = module_id_list[0]
					}	
				}
			}else{
				if(module_id_list.findIndex(x=>x === module_id) < 0){
					if(this.module_id === undefined){
						this.module_id = module_id_list[0]
					}
				}else{
					this.module_id = module_id
				}
			}
			this.setProvideId()
		}
	}
	setProvideId (provide_id?:Readonly<string>):void {
		if(this.deliveryplanningprovide.length > 0){
			const filter_list = this.deliveryplanningprovide.filter(x=>x.module_id === this.module_id)
			if(filter_list.length > 0){
				const provide_id_list:string[] = []
				for (const element of filter_list){
					if(provide_id_list.findIndex(x=>x === element.provide_id) < 0){
						provide_id_list.push(element.provide_id)
					}
				}
				provide_id_list.sort()
				this.provide_id_list = provide_id_list
				if(provide_id === undefined){
					if(this.provide_id === undefined){
						this.provide_id = provide_id_list[0]
					}else{
						if(provide_id_list.findIndex(x=>x === this.provide_id) < 0){
							this.provide_id = provide_id_list[0]
						}
					}
				}else{
					if(provide_id_list.findIndex(x=>x === provide_id) < 0){
						if(this.provide_id === undefined){
							this.provide_id = provide_id_list[0]
						}
					}else{
						this.provide_id = provide_id
					}
				}
			}
			this.setVehicleId()
		}
	}
	setVehicleId (vehicle_id?:Readonly<number>):void {
		if(this.deliveryplanningprovide.length > 0){
			const filter_list = this.deliveryplanningprovide.filter(
				x=>x.module_id === this.module_id && x.provide_id === this.provide_id)
			if(filter_list.length > 0){
				const vehicle_id_list:number[] = []
				for (const element1 of filter_list){
					for (const element2 of element1.Vehicle_assignate){
						if(vehicle_id_list.findIndex(x=>x === element2.vehicle_id) < 0){
							vehicle_id_list.push(element2.vehicle_id)
						}
					}
				}
				this.mergeVehicleId(vehicle_id_list)
				if(vehicle_id === undefined){
					if(this.vehicle_id === undefined){
						this.vehicle_id = vehicle_id_list[0]
					}else{
						if(this.vehicle_id_list.findIndex(x=>x === this.vehicle_id) < 0){
							this.vehicle_id = vehicle_id_list[0]
						}
					}
				}else{
					if(this.vehicle_id_list.findIndex(x=>x === vehicle_id) < 0){
						if(this.vehicle_id === undefined){
							this.vehicle_id = vehicle_id_list[0]
						}
					}else{
						this.vehicle_id = vehicle_id
					}
				}
			}
			this.setDeliveryPlanId()
		}else{
			if(vehicle_id !== undefined){
				this.setVehicleId_Ev(vehicle_id)
			}
		}
	}
	setVehicleId_Ev (vehicle_id?:Readonly<number>):void {
		if(this.evfleetsupply.length > 0){
			const vehicle_id_list:number[] = []
			for (const element of this.evfleetsupply){
				if(vehicle_id_list.findIndex(x=>x === element.vehicle_id) < 0){
					vehicle_id_list.push(element.vehicle_id)
				}
			}
			this.mergeVehicleId(vehicle_id_list)
			if(vehicle_id === undefined){
				if(this.vehicle_id === undefined){
					this.vehicle_id = vehicle_id_list[0]
				}else{
					if(this.vehicle_id_list.findIndex(x=>x === this.vehicle_id) < 0){
						this.vehicle_id = vehicle_id_list[0]
					}
				}
			}else{
				if(this.vehicle_id_list.findIndex(x=>x === vehicle_id) < 0){
					if(this.vehicle_id === undefined){
						this.vehicle_id = vehicle_id_list[0]
					}
				}else{
					this.vehicle_id = vehicle_id
				}
			}
			this.setDeliveryPlanId()
		}
	}
	mergeVehicleId (vehicle_id_list:number[]):void {
		const set_vehicle_id_list:number[] = [...this.vehicle_id_list]
		for (const set_vehicle_id of vehicle_id_list){
			if(set_vehicle_id_list.findIndex(x=>x === set_vehicle_id) <0){
				set_vehicle_id_list.push(set_vehicle_id)
			}
		}
		set_vehicle_id_list.sort((a, b) => (a - b))
		this.vehicle_id_list = set_vehicle_id_list
	}
	setDeliveryPlanId (delivery_plan_id?:Readonly<number>):void {
		if(this.deliveryplanningprovide.length > 0){
			const filter_list = this.deliveryplanningprovide.filter(
				x=>x.module_id === this.module_id && x.provide_id === this.provide_id)
			if(filter_list.length > 0){
				const delivery_plan_id_list:number[] = []
				for (const element1 of filter_list){
					const { Vehicle_assignate } = element1
					const select_vehicle_id = Vehicle_assignate.filter(x=>x.vehicle_id === this.vehicle_id)
					for (const element2 of select_vehicle_id){
						if(delivery_plan_id_list.findIndex(x=>x === element2.delivery_plan_id) < 0){
							delivery_plan_id_list.push(element2.delivery_plan_id)
						}
					}
				}
				delivery_plan_id_list.sort((a, b) => (a - b))
				this.delivery_plan_id_list = delivery_plan_id_list
				if(delivery_plan_id === undefined){
					if(this.delivery_plan_id === undefined){
						this.delivery_plan_id = delivery_plan_id_list[0]
					}else{
						if(delivery_plan_id_list.findIndex(x=>x === this.delivery_plan_id) < 0){
							this.delivery_plan_id = delivery_plan_id_list[0]
						}	
					}
				}else{
					if(delivery_plan_id_list.findIndex(x=>x === delivery_plan_id) < 0){
						if(this.delivery_plan_id === undefined){
							this.delivery_plan_id = delivery_plan_id_list[0]
						}
					}else{
						this.delivery_plan_id = delivery_plan_id
					}
				}
				const packages_info_list:PackagePlan[] = []
				for (const element1 of filter_list){
					for (const element2 of element1.delivery_plan){
						if(element2.delivery_plan_id === this.delivery_plan_id){
							for (const element3 of element2.packages_plan){
								packages_info_list.push(element3)
							}
						}
					}
				}
				this.packages_info_list = packages_info_list
			}
			this.setChargingPlanId()
		}
	}
	setChargingPlanId (charging_plan_id?:Readonly<number>):void {
		if(this.deliveryplanningprovide.length > 0){
			const filter_list = this.deliveryplanningprovide.filter(
				x=>x.module_id === this.module_id && x.provide_id === this.provide_id)
			if(filter_list.length > 0){
				const charging_plan_id_list:number[] = []
				for (const element1 of filter_list){
					const { Vehicle_assignate } = element1
					const select_vehicle_id = Vehicle_assignate.filter(x=>x.vehicle_id === this.vehicle_id)
					for (const element2 of select_vehicle_id){
						for (const element3 of element2.charging_plans){
							if(charging_plan_id_list.findIndex(x=>x === element3.charging_plan_id) < 0){
								charging_plan_id_list.push(element3.charging_plan_id)
							}
						}
					}
				}
				charging_plan_id_list.sort((a, b) => (a - b))
				this.charging_plan_id_list = charging_plan_id_list
				if(charging_plan_id === undefined){
					if(this.charging_plan_id === undefined){
						this.charging_plan_id = charging_plan_id_list[0]
					}else{
						if(charging_plan_id_list.findIndex(x=>x === this.charging_plan_id) < 0){
							this.charging_plan_id = charging_plan_id_list[0]
						}	
					}
				}else{
					if(charging_plan_id_list.findIndex(x=>x === charging_plan_id) < 0){
						if(this.charging_plan_id === undefined){
							this.charging_plan_id = charging_plan_id_list[0]
						}
					}else{
						this.charging_plan_id = charging_plan_id
					}
				}
				const charging_plan_list:ChargingPlan[] = []
				for (const element1 of filter_list){
					const { charging_plan } = element1
					const select_vehicle_id = charging_plan.filter(x=>x.vehicle_id === this.vehicle_id)
					for (const element2 of select_vehicle_id){
						if(element2.charging_plan_id === this.charging_plan_id){
							charging_plan_list.push(element2)
						}
					}
				}
				this.charging_plan_list = charging_plan_list
			}
		}
	}

	getPoint (json :any):void {
		console.log('getPoint json=' + JSON.stringify(json));
		if(!checkPoint(json)){return;}
		const { actions, depotsBase } = this.props;
		let push = true;
		for (const element of depotsBase){
			if(element.message === 'Point' &&
				element.position[0] === json.lon &&
				element.position[1] === json.lat){
				push = false;
				break;
			}
		}
		if(push){
			depotsBase.push({
				type:'Point',
				message:'Point',
				position:[json.lon, json.lat, 0]
			});
			actions.setDepotsBase(depotsBase);
		}
	}

	getDisabilityInfo (json :any):void {
		console.log('getDisabilityInfo json=' + JSON.stringify(json));
		if(!checkPoint(json.point)){return;}
		const timestamp = checkTimestamp(json.timestamp)?
			json.timestamp.seconds:0;
		const { actions, depotsBase } = this.props;
		const type = json.type === undefined ? 0 : json.type
		let push = true;
		for (const element of depotsBase){
			if(element.message === 'DisabilityInfo' &&
				element.position[0] === json.point.lon &&
				element.position[1] === json.point.lat &&
				element.timestamp === timestamp &&
				element.faultType === type){
				push = false;
				break;
			}
		}
		if(push){
			const infoCaption = '障害種別：' + (
				type===0?'故障':
				type===1?'事故':
				type===2?'自然災害':'その他');
			depotsBase.push({
				type:'DisabilityInfo',
				message:'DisabilityInfo',
				position:[json.point.lon, json.point.lat, 0],
				timestamp:timestamp,
				faultType:type,
				infoCaption
			});
			actions.setDepotsBase(depotsBase);
		}
	}

	getDisabilityResponse (json :any):void {
		console.log('getDisabilityResponse json=' + JSON.stringify(json));
		const { actions, depotsBase } = this.props;
		const result = json.result === undefined ? 0 : json.result
		let updateIdx = -1;
		for (let i = 0, lengthi = depotsBase.length; i < lengthi; i=(i+1)|0) {
			const element = depotsBase[i];
			if(element.message === 'DisabilityInfo' &&
				(element.result === undefined || element.result !== result)){
				updateIdx = i;
				break;
			}
		}
		if(updateIdx > -1){
			const responseCaption = '結果：' + (
				result===0?'成功':
				result===1?'失敗':'その他');
			depotsBase[updateIdx].result = result;
			depotsBase[updateIdx].responseCaption = responseCaption;
			actions.setDepotsBase(depotsBase);
		}else{
			console.log('getDisabilityResponse not find DisabilityInfo');
		}
	}

	getDispatchRequest (json :any):void {
		console.log('getDispatchRequest json=' + JSON.stringify(json));
		if(!checkPoint(json.departure)){return;}
		if(!checkPoint(json.arrival)){return;}
		const timestamp = checkTimestamp(json.timestamp)?
			json.timestamp.seconds:0;
		const target_time = checkTimestamp(json.target_time)?
			json.target_time.seconds:0;
		const { arcData } = this.state;
		const topic = json.topic === undefined ? "" : json.topic
		let push = true;
		for (const element of arcData){
			if(element.message === 'DispatchRequest' &&
				element.sourcePosition[0] === json.departure.lon &&
				element.sourcePosition[1] === json.departure.lat &&
				element.targetPosition[0] === json.arrival.lon &&
				element.targetPosition[1] === json.arrival.lat &&
				element.timestamp === timestamp &&
				element.target_time === target_time &&
				element.topic === topic){
				push = false;
				break;
			}
		}
		if(push){
			arcData.push({
				type:'Dispatch',
				message:'DispatchRequest',
				sourcePosition:[json.departure.lon, json.departure.lat, 0],
				targetPosition:[json.arrival.lon, json.arrival.lat, 0],
				timestamp:timestamp,
				target_time:target_time,
				topic:topic
			});
			this.setState({arcData});
		}
	}

	getDispatchResponse (json :any):void {
		console.log('getDispatchResponse json=' + JSON.stringify(json));
		const timestamp = checkTimestamp(json.timestamp)?json.timestamp.seconds:0;
		const departure_time = checkTimestamp(json.departure_time)?
			json.departure_time.seconds:0;
		const arrival_time = checkTimestamp(json.arrival_time)?
			json.arrival_time.seconds:0;
		const { arcData } = this.state;
		const result = json.result === undefined ? 0 : json.result
		const accept_no = json.accept_no === undefined ? 0 : json.accept_no
		const topic = json.topic === undefined ? "" : json.topic
		let set = false;
		for (const element of arcData){
			if(element.message === 'DispatchRequest' &&
				element.topic === topic){
				const responseCaption = '配車結果：' + (
					result===0?'配車完了':
					result===1?'配車失敗':'その他');
				element.message = 'DispatchResponse';
				element.timestamp = timestamp;
				element.result = result;
				element.accept_no = accept_no;
				element.departure_time = departure_time;
				element.arrival_time = arrival_time;
				element.responseCaption = responseCaption;
				set = true;
				break;
			}
		}
		if(set){
			this.setState({arcData});
		}else{
			console.log('DispatchResponse not find DispatchRequest :"' + topic + '"');
		}
	}

	getRouteRequest (json :any):void {
		console.log('getRouteRequest json=' + JSON.stringify(json));
		if(!checkPoint(json.current)){return;}
		const timestamp = checkTimestamp(json.timestamp)?json.timestamp.seconds:0;
		const { actions, depotsBase } = this.props;
		const task_id = json.task_id === undefined ? 'undefined' : json.task_id
		const vehicle_id = json.vehicle_id === undefined ? 0 : json.vehicle_id
		const lane_id = json.lane_id === undefined ? 0 : json.lane_id
		let push = true;
		for (const element of depotsBase){
			if(element.message === 'RouteRequest' &&
				element.position[0] === json.current.lon &&
				element.position[1] === json.current.lat &&
				element.timestamp === timestamp &&
				element.task_id === task_id &&
				element.vehicle_id === vehicle_id &&
				element.lane_id === lane_id){
				push = false;
				break;
			}
		}
		if(push){
			depotsBase.push({
				type:'Route',
				message:'RouteRequest',
				position:[json.current.lon, json.current.lat, 0],
				current: json.current,
				timestamp:timestamp,
				task_id:task_id,
				vehicle_id:vehicle_id,
				lane_id:lane_id,
			});
			actions.setDepotsBase(depotsBase);
		}
	}

	getRouteResponse (json :any):void {
		console.log('getRouteResponse json=' + JSON.stringify(json));
		if(!checkPoint(json.destination)){return;}
		const timestamp = checkTimestamp(json.timestamp)?json.timestamp.seconds:0;
		const { actions, depotsBase, linemapData } = this.props;
		const task_id = json.task_id === undefined ? 'undefined' : json.task_id
		const vehicle_id = json.vehicle_id === undefined ? 0 : json.vehicle_id
		const altitude = json.altitude === undefined ? 0.0 : json.altitude
		let find = false;
		let origin = undefined;
		for (const element of depotsBase){
			if(element.message === 'RouteRequest' &&
				element.vehicle_id === vehicle_id){
				origin = element.current;
				find = true;
				break;
			}
		}
		if(find){
			let push = true;
			for (const element of linemapData){
				if(element.message === 'RouteResponse' &&
					element.vehicle_id === vehicle_id){
					push = false;
					break;
				}
			}
			if(push){
				const path = generateRoute(this.state.osm_data,json.lane_id,origin,json.destination);
				linemapData.push({
					type:'Route',
					message:'RouteResponse',
					path,	//経路変換データ
					timestamp:timestamp,
					altitude:altitude,
					task_id:task_id,
					vehicle_id:vehicle_id,
					lane_id:json.lane_id,
					link_id:json.link_id,
					velocity:json.velocity	//速度
				});
				actions.setLinemapData(linemapData);
			}
		}else{
			console.log('getRouteResponse not find RouteResponse :"' + vehicle_id + '"');
		}
	}

	getVehicleStatusRequest (json :any):void {
		console.log('getVehicleStatusRequest json=' + JSON.stringify(json));
		if(!checkPoint(json.current)){return;}
		const timestamp = checkTimestamp(json.timestamp)?
			json.timestamp.seconds:Math.trunc(Date.now()/1000);
		const status = json.status === undefined ? 0 : json.status
		const task_id = json.task_id === undefined ? 'undefined' : json.task_id
		const vehicle_id = json.vehicle_id === undefined ? 0 : json.vehicle_id
		const velocity = json.velocity === undefined ? 0.0 : json.velocity
		const lane_id = json.lane_id === undefined ? 0 : json.lane_id
		const angle = json.angle === undefined ? 0.0 : json.angle
		let push = true;
		let updateIdx = -1;
		for (let i = 0, lengthi = this.movesbase.length; i < lengthi; i=(i+1)|0) {
			const element = this.movesbase[i];
			if(element.message === 'VehicleStatusRequest' &&
				element.vehicle_id === vehicle_id){
				push = false;
				updateIdx = i;
				break;
			}
		}
		const path = generateRoute(this.state.osm_data,[lane_id]);
		const statusCaption = '状態：' + (status===0?'待機中 (経路未割当)':
			status===1?'走行中 (経路割当済)':'その他');
		if(push){
			this.movesbase.push({
				type:'VehicleStatus',
				message:'VehicleStatusRequest',
				departuretime: timestamp,
				arrivaltime: timestamp,
				operation:[{
					elapsedtime:timestamp,
					position:[json.current.lon, json.current.lat, 0],
					velocity:velocity,
					lane_id:lane_id,
					angle:angle,
					path
				}],
				status:status,
				statusCaption,
				task_id:task_id,
				vehicle_id:vehicle_id,
			});
		}else{
			this.movesbase[updateIdx].operation.push({
				elapsedtime:timestamp,
				position:[json.current.lon, json.current.lat, 0],
				velocity:velocity,
				lane_id:lane_id,
				angle:angle,
				path
			});
			if(this.movesbase[updateIdx].arrivaltime < timestamp){
				this.movesbase[updateIdx].arrivaltime = timestamp
			}else{
				this.movesbase[updateIdx].operation.sort((a:any,b:any)=>a.elapsedtime > b.elapsedtime?1:-1);
			}
			this.movesbase[updateIdx].statusCaption = statusCaption;
		}
	}

	getVehicleStatusResponse (json :any):void {
		console.log('getVehicleStatusResponse json=' + JSON.stringify(json));
		checkTimestamp(json.timestamp);
		const result = json.result === undefined ? 0 : json.result
		const vehicle_id = json.vehicle_id === undefined ? 0 : json.vehicle_id
		let find = false;
		let updateIdx = -1;
		for (let i = 0, lengthi = this.movesbase.length; i < lengthi; i=(i+1)|0) {
			const element = this.movesbase[i];
			if(element.message === 'VehicleStatusRequest' &&
				element.vehicle_id === vehicle_id){
				find = true;
				updateIdx = i;
				break;
			}
		}
		if(find){
			const resultCaption = '状態：' + (
				result===0?'待機中 (経路未割当)':
				result===1?'走行中 (経路割当済)':'その他');
			this.movesbase[updateIdx].result = result;
			this.movesbase[updateIdx].resultCaption = resultCaption;
		}else{
			console.log('getVehicleStatusResponse not find VehicleStatusRequest :"' + vehicle_id + '"');
		}
	}

	getEvFleetSupply (json :Readonly<EvFleetSupply>):void {
		console.log('getEvFleetSupply json=' + JSON.stringify(json));
		if(json.event_id !== 9){
			return
		}
		let findIdx = -1;
		for (let i = 0, lengthi = this.evfleetsupply.length; i < lengthi; i=(i+1)|0) {
			if(json.vehicle_id === this.evfleetsupply[i].vehicle_id){
				let direction = 0
				if(this.evfleetsupply[i].targetPosition[0] === json.longitude && this.evfleetsupply[i].targetPosition[1] === json.latitude){
					direction = this.evfleetsupply[i].direction
				}else{
					const x1 = radians(this.evfleetsupply[i].targetPosition[0])
					const y1 = radians(this.evfleetsupply[i].targetPosition[1])
					const x2 = radians(json.longitude)
					const y2 = radians(json.latitude)
					const deltax = x2 - x1
					direction = degrees(atan2(sin(deltax), 
						cos(y1) * tan(y2) - sin(y1) * cos(deltax))) % 360
				}
				this.evfleetsupply[i] = {...this.evfleetsupply[i], ...json}
				this.evfleetsupply[i].sourcePosition = [...this.evfleetsupply[i].targetPosition]
				this.evfleetsupply[i].targetPosition = [json.longitude, json.latitude,0]
				this.evfleetsupply[i].elapsedtime = Date.now()
				this.evfleetsupply[i].direction = direction
				this.evfleetsupply[i].air_conditioner = json.air_conditioner === undefined ? 0 : json.air_conditioner
				const air_conditioner = ((this.evfleetsupply[i].air_conditioner > 0) ? '1:use':'0:not use')
				this.evfleetsupply[i].text = 'vehicle_id:'+json.vehicle_id+'\nsoc:'+json.soc+'  soh:'+json.soh+'\nair_conditioner:'+air_conditioner
				findIdx = i
				break
			}
		}
		if(findIdx < 0){
			findIdx = this.evfleetsupply.length
			this.evfleetsupply[findIdx] = {...this.evfleetsupply[findIdx], ...json}
			this.evfleetsupply[findIdx].message = 'EvFleetSupply'
			this.evfleetsupply[findIdx].sourcePosition = [json.longitude, json.latitude,0]
			this.evfleetsupply[findIdx].targetPosition = [json.longitude, json.latitude,0]
			this.evfleetsupply[findIdx].elapsedtime = Date.now()
			this.evfleetsupply[findIdx].direction = 0
			this.evfleetsupply[findIdx].air_conditioner = json.air_conditioner === undefined ? 0 : json.air_conditioner
			const air_conditioner = ((this.evfleetsupply[findIdx].air_conditioner > 0) ? '1:use':'0:not use')
			this.evfleetsupply[findIdx].text = 'vehicle_id:'+json.vehicle_id+'\nsoc:'+json.soc+'  soh:'+json.soh+'\nair_conditioner:'+air_conditioner
		}
		
		findIdx = -1;
		for (let i = 0, lengthi = this.evfleetroute.length; i < lengthi; i=(i+1)|0) {
			if(json.vehicle_id === this.evfleetroute[i].vehicle_id){
				const dataLength = this.evfleetroute[i].line_data.length
				this.evfleetroute[i].line_data[dataLength-1].targetPosition = [json.longitude, json.latitude,0]
				this.evfleetroute[i].line_data[dataLength] = {
					sourcePosition: [json.longitude, json.latitude,0],
					targetPosition: [json.longitude, json.latitude,0],
					color: ratecolor(json.soc)
				}
				findIdx = i
				break
			}
		}
		if(findIdx < 0){
			findIdx = this.evfleetroute.length
			this.evfleetroute[findIdx] = {
				vehicle_id: json.vehicle_id,
				message: 'evfleetroute',
				line_data: []
			}
			this.evfleetroute[findIdx].line_data.push({
				sourcePosition: [json.longitude, json.latitude,0],
				targetPosition: [json.longitude, json.latitude,0],
				color: ratecolor(json.soc)
			})
		}
		this.setVehicleId_Ev()
	}

	getVehicleList (json :VehicleList):void {
		console.log('getVehicleList json=' + JSON.stringify(json));
		if(json.event_id !== 7){
			return
		}
		let findIdx = -1;
		for (let i = 0, lengthi = this.vehiclelist.length; i < lengthi; i=(i+1)|0) {
			if(json.module_id === this.vehiclelist[i].module_id &&
				json.provide_id === this.vehiclelist[i].provide_id){
				this.vehiclelist[i] = {...json}
				findIdx = i
				break
			}
		}
		if(findIdx < 0){
			findIdx = this.vehiclelist.length
			this.vehiclelist[findIdx] = {...json}
		}
	}

	getEvFleetResponse (json :any):void {
		console.log('getEvFleetResponse json=' + JSON.stringify(json));
	}

	getDeliveryPlanningProvide (json :DeliveryPlanningProvide):void {
		console.log('getDeliveryPlanningProvide json=' + JSON.stringify(json));
		if(json.event_id !== 2){
			return
		}
		let findIdx = -1;
		for (let i = 0, lengthi = this.deliveryplanningprovide.length; i < lengthi; i=(i+1)|0) {
			if(json.module_id === this.deliveryplanningprovide[i].module_id &&
				json.provide_id === this.deliveryplanningprovide[i].provide_id){
					this.deliveryplanningprovide[i] = {...json}
				findIdx = i
				break
			}
		}
		if(findIdx < 0){
			findIdx = this.deliveryplanningprovide.length
			this.deliveryplanningprovide[findIdx] = {...json}
		}
		this.setModuleId()
	}

	getDispDispatchResponse (json :any):void {
		console.log('getDispDispatchResponse json=' + JSON.stringify(json));
	}

	getDeliveryPlanningRequest (json :DeliveryPlanningRequest):void {
		console.log('getDeliveryPlanningRequest json=' + JSON.stringify(json));
		if(json.event_id !== 1){
			return
		}
		this.deliveryplanningrequest = {...json}
	}

	getDeliveryPlanAdoption (json :DeliveryPlanAdoption):void {
		console.log('getDeliveryPlanAdoption json=' + JSON.stringify(json));
		if(json.event_id !== 3){
			return
		}
		let findIdx = -1;
		for (let i = 0, lengthi = this.deliveryplanadoption.length; i < lengthi; i=(i+1)|0) {
			if(json.module_id === this.deliveryplanadoption[i].module_id &&
				json.provide_id === this.deliveryplanadoption[i].provide_id){
				this.deliveryplanadoption[i] = {...json}
				findIdx = i
				break
			}
		}
		if(findIdx < 0){
			findIdx = this.deliveryplanadoption.length
			this.deliveryplanadoption[findIdx] = {...json}
		}
	}

	getDeliveryPlanningResponse (json :any):void {
		console.log('getDeliveryPlanningResponse json=' + JSON.stringify(json));
	}

	deleteMovebase ():void {
		const { actions, animatePause } = this.props
		if (!animatePause) {
			actions.setAnimatePause(true)
		}
		actions.updateMovesBase([])
		actions.setDepotsBase([])
		actions.setLinemapData([])
		this.setState({arcData:[]});
		if (!animatePause) {
			actions.setAnimatePause(false)
		}
	}

	getMoveDataChecked (e :any):void {
		this.setState({ moveDataVisible: e.target.checked })
	}

	getMoveOptionChecked (e :any):void {
		this.setState({ moveOptionVisible: e.target.checked })
	}

	getModuleIdSelected (e :any):void {
		if(this.module_id != +e.target.value){
			this.setModuleId(+e.target.value)
		}
	}
	getProvideIdSelected (e :any):void {
		if(this.provide_id != e.target.value){
			this.setProvideId(e.target.value);
		}
	}
	getVehicleIdSelected (e :any):void {
		if(this.vehicle_id != +e.target.value){
			this.setVehicleId(+e.target.value);
		}
	}
	getDeliveryPlanIdSelected (e :any):void {
		if(this.delivery_plan_id != +e.target.value){
			this.setDeliveryPlanId(+e.target.value);
		}
	}
	getChargingPlanIdSelected (e :any):void {
		if(this.charging_plan_id != +e.target.value){
			this.setChargingPlanId(+e.target.value);
		}
	}

	getOsmData (osm_data :any):void {
		this.setState({ osm_data: osm_data })
	}

	getExtractedDataFunc(props:any):any{
		if(this.movesbase.length > 0){
			const { settime, timeLength, iconGradation } = props;
			const movedData = this.movesbase.reduce((movedData,movesbaseElement,movesbaseidx)=>{
				const { departuretime, arrivaltime, operation, ...otherProps1 } = movesbaseElement;
				if(timeLength > 0 && departuretime <= settime && settime < arrivaltime){
					const nextidx = operation.findIndex((data:any)=>data.elapsedtime > settime);
					const idx = (nextidx-1)|0;
					if(typeof operation[idx].position === 'undefined' ||
					typeof operation[nextidx].position === 'undefined'){
						const {elapsedtime, ...otherProps2} = operation[idx];
						movedData.push(Object.assign({},
							otherProps1, otherProps2, { settime, movesbaseidx },
						));
					}else{
						const COLOR1 = [0, 255, 0];
						const { elapsedtime, position:sourcePosition,
							color:sourceColor=COLOR1, direction=0, ...otherProps2 } = operation[idx];
						const { elapsedtime:nextelapsedtime, position:targetPosition,
							color:targetColor=COLOR1 } = operation[nextidx];
						const rate = (settime - elapsedtime) / (nextelapsedtime - elapsedtime);
						const position = [
							sourcePosition[0] - (sourcePosition[0] - targetPosition[0]) * rate,
							sourcePosition[1] - (sourcePosition[1] - targetPosition[1]) * rate,
							sourcePosition[2] - (sourcePosition[2] - targetPosition[2]) * rate
						];
						const color = iconGradation ? [
							(sourceColor[0] + rate * (targetColor[0] - sourceColor[0]))|0,
							(sourceColor[1] + rate * (targetColor[1] - sourceColor[1]))|0,
							(sourceColor[2] + rate * (targetColor[2] - sourceColor[2]))|0
						] : sourceColor;
						movedData.push(Object.assign({}, otherProps1, otherProps2,
							{ settime,
							position, sourcePosition, targetPosition,
							color, direction, sourceColor, targetColor, movesbaseidx},
						));
					}
				}
				return movedData;
			},[]);
			return {movesbase:this.movesbase,movedData};
		}
		return {movesbase:this.movesbase};
	}

	initialize (gl :any):void {
		gl.enable(gl.DEPTH_TEST)
		gl.depthFunc(gl.LEQUAL)
		console.log('GL Initialized!')
	}

	componentDidMount():void{
		super.componentDidMount();
		this.props.actions.setDefaultViewport({defaultZoom: 14.0, defaultPitch: 45})
		this.props.actions.setViewport({longitude: 139.59955047063917, latitude: 35.44913331507205, zoom: 14.0, pitch: 45})
		Axios.get<string>(osmPath).then(res=>{
			const readdata = xml2js(res.data,{compact: true}) as {osm?:any};
			if(readdata.osm.way && readdata.osm.node){
				const {way,node} = readdata.osm;
				this.setState({ osm_data: Object.assign({},{way,node}) })
				this.props.actions.setInputFilename({ osmDataFileName: osmPath });
			}else{
				window.alert('OSM DATA FAIL');
				this.setState({ osm_data: {}})
				this.props.actions.setInputFilename({ osmDataFileName: null });
			}
	
		}).catch(err=>{
			console.log('OSM FILE READ ERR! : '+err.message)
		});
	}

	componentDidUpdate(prevProps:any){
		if(prevProps.loopEndPause !== this.props.loopEndPause && this.props.loopEndPause){
			const {actions,timeLength} = this.props
			actions.setTimeLength(timeLength+60);
			actions.setNoLoop(true)
			actions.setTime(Date.now()/1000)
		}
	}

	onHover(el: EventInfo):void{
		if (el && el.object) {
			const {message}:any = el.object
			let disptext = '';
			if(message === 'EvFleetSupply'){
				const objctlist:[string, any][] = Object.entries(el.object);
				for (let i = 0, lengthi = objctlist.length; i < lengthi; i=(i+1)|0) {
					let name:string = ''
					let value:string = ''
					if(objctlist[i][0] === 'vehicle_id'){
						name = '車両ID(vehicle_id)'
						value = objctlist[i][1].toString()
					}else
					if(objctlist[i][0] === 'soc'){
						name = 'バッテリー充電率(soc)'
						value = objctlist[i][1].toString()+'(%)'
					}else
					if(objctlist[i][0] === 'soh'){
						name = 'バッテリー劣化率(soh)'
						value = objctlist[i][1].toString()+'(%)'
					}else
					if(objctlist[i][0] === 'air_conditioner'){
						name = 'エアコン(air_conditioner)'
						value = objctlist[i][1] >= 1 ? '1 : 使用(use)':'0 : 未使用(not use)'
					}
					if(name.length > 0){
						disptext = disptext + (i > 0 ? '\n' : '');
						disptext = disptext + (`${name} : ${value}`);
					}
				}
			}else
			if(message === 'VehicleRouteLayer'){
				const objctlist:[string, any][] = Object.entries(el.object);
				for (let i = 0, lengthi = objctlist.length; i < lengthi; i=(i+1)|0) {
					let name:string = ''
					let value:string = ''
					if(objctlist[i][0] === 'vehicle_id'){
						name = '車両ID(vehicle_id)'
						value = objctlist[i][1].toString()
					}else
					if(objctlist[i][0] === 'delivery_plan_id'){
						name = '配送計画ID(delivery_plan_id)'
						value = objctlist[i][1].toString()
					}
					if(name.length > 0){
						disptext = disptext + (i > 0 ? '\n' : '');
						disptext = disptext + (`${name} : ${value}`);
					}
				}
			}else
			if(message === 'DeliveryPlanningRequest'){
				const objctlist:[string, any][] = Object.entries(el.object);
				for (let i = 0, lengthi = objctlist.length; i < lengthi; i=(i+1)|0) {
					let name:string = ''
					let value:string = ''
					if(objctlist[i][0] === 'package_id'){
						name = 'パッケージID'
						value = objctlist[i][1].toString()
					}else
					if(objctlist[i][0] === 'weight'){
						name = '重量'
						value = objctlist[i][1].toString()+'(kg)'
					}else
					if(objctlist[i][0] === 'delivery_time'){
						name = '配送希望時間'
						value = objctlist[i][1]
					}
					if(name.length > 0){
						disptext = disptext + (i > 0 ? '\n' : '');
						disptext = disptext + (`${name} : ${value}`);
					}
				}
			}else{
				const objctlist = Object.entries(el.object);
				for (let i = 0, lengthi = objctlist.length; i < lengthi; i=(i+1)|0) {
					const strvalue = objctlist[i][1].toString();
					disptext = disptext + (i > 0 ? '\n' : '');
					disptext = disptext + (`${objctlist[i][0]}: ${strvalue}`);
				}
			}
			this.setState({ popup: [el.x, el.y, disptext] });
		} else {
			this.setState({ popup: [0, 0, ''] });
		}
	}

	onClick(el: EventInfo):void{
		if (el && el.object) {
			console.log('onClick : ' + JSON.stringify(el.object))
			const {message}:any = el.object
			if(message === 'Point'){

			}else
			if(message === 'DisabilityInfo'){

			}else
			if(message === 'DispatchRequest'){

			}else
			if(message === 'DispatchResponse'){

			}else
			if(message === 'RouteRequest'){
/*				this.setState({chartData:{
					type: 'bar',
					data: {
					  labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
					  datasets: [{
						label: 'Red',
						data: [20, 35, 40, 30, 45, 35, 40],
						backgroundColor: '#f88',
						stack: 'stack-1',
					  }, {
						label: 'Blue',
						data: [30, 25, 10, 5, 25, 30, 20],
						backgroundColor: '#48f',
						stack: 'stack-1',
					  }],
					},
					options:{
						indexAxis: 'y',
					}
				}})	*/
			}else
			if(message === 'RouteResponse'){

			}else
			if(message === 'VehicleStatusRequest'){

			}else
			if(message === 'EvFleetSupply'){
				const {vehicle_id}:any = el.object
				if(this.vehicle_id !== vehicle_id){
					this.setVehicleId_Ev(vehicle_id)
				}
			}else
			if(message === 'VehicleRouteLayer'){
				const {vehicle_id}:any = el.object
				if(this.vehicle_id !== vehicle_id){
					this.setVehicleId(vehicle_id)
				}
			}else
			if(message === 'DeliveryPlanningRequest'){
			}
		}
	}

	movesBaseLoad(movesbase:Movesbase[]){
		this.movesbase = movesbase
	}

	render ():JSX.Element {
		const props = this.props
		const { actions, clickedObject, viewport, routePaths,
			ExtractedData, depotsData, linemapData } = props
		const { movesbase, movedData } = ExtractedData || { movesbase:[], movedData:[] }
		let layers:any[] = []
		const onHover = this.onHover.bind(this);
		const onClick = this.onClick.bind(this);

		if (this.state.moveDataVisible && movedData && movedData.length > 0) {
			layers.push(
				new MovesLayer({
					routePaths, 
					movesbase, 
					movedData,
					clickedObject, 
					actions,
					optionVisible: this.state.moveOptionVisible,
					iconDesignations:[
						{type:'VehicleStatus', layer:'SimpleMesh', mesh:busmesh,
						getColor:(x:any)=>(x.color||[0,255,0])}
					],
					iconChange: false,
					optionChange: false, // this.state.optionChange,
					onHover,
					onClick
				} as any)
			)
		}
		if (this.state.moveDataVisible && depotsData.length > 0) {
			layers.push(
				new DepotsLayer({
					depotsData,
					optionVisible: this.state.moveOptionVisible,
					iconDesignations:[
						{type:'Point', layer:'Scatterplot', getColor:(x:any)=>(x.color||[0,255,0])},
						{type:'DisabilityInfo', layer:'SimpleMesh', mesh:busstopmesh,
							getColor:(x:any)=>{
								if(x.color){
									return x.color;
								}else
								if(x.faultType === 0){	//故障
									return [255,255,0];
								}else
								if(x.faultType === 1){	//事故
									return [255,0,0];
								}else{	//自然災害(2)その他
									return [255,0,255];
								}}},
						{type:'Route', layer:'Scatterplot', getColor:(x:any)=>(x.color||[0,0,255])},
					],
					iconChange: false,
					optionChange: false, // this.state.optionChange,
					onHover,
					onClick
				} as any)
			)
		}
		if (this.evfleetsupply.length > 0) {
			const data:EvFleetSupply[] = this.evfleetsupply.reduce((data:EvFleetSupply[],current:EvFleetSupply)=>{
				if(current.targetPosition[0] === current.sourcePosition[0] &&
					current.targetPosition[1] === current.sourcePosition[1] &&
					current.targetPosition[2] === current.sourcePosition[2]){
					current.position = [...current.targetPosition]
					data.push(current)
					return data
				}else{
					const now = Date.now()
					const difference = now - current.elapsedtime
					if(0 < transitionDuration && difference <= transitionDuration){
						const rate = difference / transitionDuration
						current.position = current.targetPosition.map((targetPosition,index)=>{
							return current.sourcePosition[index] - (current.sourcePosition[index] - targetPosition) * rate
						})
					}else{
						current.position = [...current.targetPosition]
					}
					data.push(current)
					return data
				}
			},[])
			layers.push(
				new SimpleMeshLayer({
					id: 'evfleetsupply-layer',
					data,
					mesh: busmesh,
					sizeScale: 10,
					getPosition: (x:EvFleetSupply)=>x.position,
					getColor: (x:EvFleetSupply)=>ratecolor(x.soc),
					getOrientation: (x:EvFleetSupply) => x.direction ? [0,-x.direction,90] : [0,0,90],
					getScale: (x:EvFleetSupply)=>x.vehicle_id === this.vehicle_id?[1.5,1.5,1.5]:[1,1,1],
					opacity: 0.5,
					pickable: true,
					onHover,
					onClick
				} as any)
			)
			layers.push(
				new TextLayer({
					id: 'evfleetsupply-text-layer',
					data,
					getPosition: (x:EvFleetSupply)=>x.position,
					getColor: (x:EvFleetSupply)=>ratecolor(x.soc),
					getTextAnchor: 'start',
					getSize: 15,
					fontWeight: 100,
					getPixelOffset: [20,-50]
				} as any)
			)
		}
		if (this.evfleetroute.length > 0) {
			const line_data = this.evfleetroute.find((x)=>x.vehicle_id === this.vehicle_id).line_data
			const data = line_data.filter((x)=>x.sourcePosition[0] !== x.targetPosition[0] && x.sourcePosition[1] !== x.targetPosition[1])
			if (data.length > 0) {
				layers.push(
					new LineLayer({
						id: 'evfleetroute-LineLayer',
						data,
						pickable: true,
						widthUnits: 'meters',
						widthMinPixels: 0.1,
						getSourcePosition: (x: any) => x.sourcePosition,
						getTargetPosition: (x: any) => x.targetPosition,
						getColor: (x: any) => x.color || [0,255,0,255],
						getWidth: (x:any) => x.width || 10,
						opacity: 0.8
					  })
				)
			}
		}
		if (this.deliveryplanningprovide.length > 0) {
			const {deliveryplanningprovide,module_id,provide_id,vehicle_id,delivery_plan_id} = this
			for (const element of deliveryplanningprovide){
				if(module_id !== undefined && element.module_id === module_id &&
					provide_id !== undefined && element.provide_id === provide_id && vehicle_id !== undefined){
	
					const findIndex = element.Vehicle_assignate.findIndex(x=>x.vehicle_id === vehicle_id && x.delivery_plan_id === delivery_plan_id)
					if(findIndex < 0){
						break
					}
					//delivery_plan_id_list
					const { route_info, charging_plans } = element.Vehicle_assignate[findIndex]
					const data:PathData[] = []
					const path:number[][] = []
					for (const {longitude,latitude} of route_info){
						path.push([longitude, latitude])
					}
					data.push({path:path, vehicle_id, delivery_plan_id, charging_plans, message:"VehicleRouteLayer"})
					layers.push( new PathLayer({
						id: 'VehicleRouteLayer',
						data,
						visible:true,
						opacity: 1.0,
						pickable:true,
						widthUnits: 'meters',
						widthMinPixels: 1,
						capRounded: true,
						jointRounded: true,
						getPath: (x:PathData) => x.path,
						getColor: (x:PathData) => x.color || [0,255,0,255],
						getWidth: (x:PathData) => x.width || 10,
						onHover,
						onClick
					} as any))
					if(element.delivery_plan && this.deliveryplanningrequest && this.deliveryplanningrequest.delivery_info &&
						this.deliveryplanningrequest.delivery_info.packages_info){

						const packages_info_list = this.deliveryplanningrequest.delivery_info.packages_info
						const delivery_point_data:any[] = []
						for (const delivery_plan of element.delivery_plan){
							if(delivery_plan.delivery_plan_id === delivery_plan_id){
								for (const delivery_packages_info of delivery_plan.packages_plan){
									const selectData = packages_info_list.filter(x=>x.package_id === delivery_packages_info.package_id)
									for(const package_info of selectData){
										const {longitude, latitude, delivery_time, ...other} = package_info
										delivery_point_data.push({
											...other,
											position:[longitude, latitude],
											delivery_time: delivery_time_table[delivery_time],
											estimated_time_of_arrival: delivery_packages_info.estimated_time_of_arrival,
											color: ratecolor(delivery_time*33),
											message: 'DeliveryPlanningRequest'
										})
									}
								}
							}
						}
						layers.push(
							new SimpleMeshLayer({
								id: 'delivery-point-layer',
								data: delivery_point_data,
								mesh: busstopmesh,
								sizeScale: 30,
								getPosition: (x:any)=>x.position,
								getColor: (x:any)=>x.color,
								getScale: (x:any)=>[1,1,x.weight],
								opacity: 0.5,
								pickable: true,
								onHover,
								onClick
							} as any)
						)
					}
					break
				}
			}
		}
		if (this.state.moveDataVisible && linemapData.length > 0) {
			layers.push(
				new LineMapLayer({
					data: linemapData,
					getWidth: 10,
					onHover,
					onClick
				} as any)
			)
		}
		if (this.state.moveDataVisible && this.state.arcData.length > 0) {
			layers.push(
				new ArcLayer({
					id:'Harmovis-ArcLayer',
					data: this.state.arcData,
					pickable: true,
					widthUnits: 'meters',
					widthMinPixels: 0.1,
					getSourcePosition: (x:any) => x.sourcePosition,
					getTargetPosition: (x:any) => x.targetPosition,
			        getSourceColor: (x:any) => x.sourceColor || [255,0,0],
			        getTargetColor: (x:any) => x.targetColor || [0,0,255],
					getWidth: 10,
					opacity: 0.75,
					onHover,
					onClick
				} as any)
			)
		}
		if (this.state.moveDataVisible && movedData && movedData.length > 0) {
			const pathData = movedData.filter((x:any)=>x.path);
			if (pathData.length > 0) {
				layers.push(
					new PathLayer({
						id:'Harmovis-PathLayer',
						data: pathData,
						pickable: true,
						widthUnits: 'meters',
						widthMinPixels: 0.1,
						getColor: (x:any) => x.color || [255,255,255],
						getWidth: 10,
						opacity: 0.75,
						onHover,
						onClick
					} as any)
				)
			}
		}

		// wait until mapbox_token is given from harmo-vis provider.
		const visLayer =
			(this.state.mapbox_token.length > 0) ?
				<HarmoVisLayers 
					viewport={viewport}
					mapboxApiAccessToken={this.state.mapbox_token}
					mapboxAddLayerValue={null}
					actions={actions}
					layers={layers}
				/>
				: <LoadingIcon loading={true} />
		const controller  = 
			(this.state.controlVisible?
				<>
					<Controller {...(props as any)}
					deleteMovebase={this.deleteMovebase.bind(this)}
					getMoveDataChecked={this.getMoveDataChecked.bind(this)}
					getMoveOptionChecked={this.getMoveOptionChecked.bind(this)}
					getOsmData={this.getOsmData.bind(this)}
					movesBaseLoad={this.movesBaseLoad.bind(this)}
					chartData={this.state.chartData}
					module_id={this.module_id}
					provide_id={this.provide_id}
					vehicle_id={this.vehicle_id}
					module_id_list={this.module_id_list}
					provide_id_list={this.provide_id_list}
					vehicle_id_list={this.vehicle_id_list}
					getModuleIdSelected={this.getModuleIdSelected.bind(this)}
					getProvideIdSelected={this.getProvideIdSelected.bind(this)}
					getVehicleIdSelected={this.getVehicleIdSelected.bind(this)}
					delivery_plan_id={this.delivery_plan_id}
					charging_plan_id={this.charging_plan_id}
					delivery_plan_id_list={this.delivery_plan_id_list}
					charging_plan_id_list={this.charging_plan_id_list}
					getDeliveryPlanIdSelected={this.getDeliveryPlanIdSelected.bind(this)}
					getChargingPlanIdSelected={this.getChargingPlanIdSelected.bind(this)}
					deliveryplanningrequest={this.deliveryplanningrequest}
					deliveryplanadoption={this.deliveryplanadoption}
					/>
					<div className='harmovis_gauge'>
						<div className='container'>
						<ul className='list-group'>
							<li>
							<EvFleetSupplyChart
							vehicle_id={this.vehicle_id}
							evfleetsupply={this.evfleetsupply}
							/>
							</li>
						</ul>
						</div>
					</div>
					<div className='harmovis_schedule'>
						<div className='container'>
						<ul className='list-group'>
							<li>
							<DeliveryPlanTimeline
							delivery_plan_id={this.delivery_plan_id}
							charging_plan_id={this.charging_plan_id}
							delivery_plan_id_list={this.delivery_plan_id_list}
							charging_plan_id_list={this.charging_plan_id_list}
							packages_info_list={this.packages_info_list}
							charging_plan_list={this.charging_plan_list}
							deliveryplanningrequest={this.deliveryplanningrequest}
							/>
							</li>
						</ul>
						</div>
					</div>
				</>
				:<></>
			)
		const fpsdisp =
				(this.state.fpsVisible?
					<FpsDisplay />
				 :<></>
				)
		return (
			<div>
				{controller}
				<div className='harmovis_area'>
					{visLayer}
				</div>
				<svg width={viewport.width} height={viewport.height} className="harmovis_overlay">
					<g fill="white" fontSize="12">
						{this.state.popup[2].length > 0 ?
						this.state.popup[2].split('\n').map((value:any, index:any) =>
							<text
							x={this.state.popup[0] + 10} y={this.state.popup[1] + (index * 12)}
							key={index.toString()}
							>{value}</text>) : null
						}
					</g>
				</svg>
				{fpsdisp}
				<div style={{
						width: '100%',
						position: 'absolute',
						bottom: 10
					}}>
				</div>
			</div>
		)
	}
}
export default connectToHarmowareVis(App)

const generateRoute = (osm_data:any,lane_id:number[],origin?:{lon:number,lat:number},destination?:{lon:number,lat:number}):any[]=>{
	let path:any[] = [];
	if(origin){
		path = [[origin.lon, origin.lat, 0]];
	}
	const {way,node} = osm_data;
	if(way && node){
		const select_lane_id = lane_id.filter(element=>element < 4294967295);
		for(const way_id of select_lane_id){
			let target = undefined;
			if(Array.isArray(way)){
				target = way.find(element=>element._attributes && Number(element._attributes.id) === way_id);
			}else
			if(way._attributes && Number(way._attributes.id) === way_id){
				target = way;
			}
			if(target && target.nd){
				const {nd} = target;
				let ndList:any[] = undefined;
				if(Array.isArray(nd)){
					ndList = nd;
				}else{
					ndList = [nd];
				}
				for(const ndRef of ndList){
					const point = getLongLat(node,ndRef);
					if(point){
						path.push(point);
					}
				}
			}
		}
	}else{
		console.log('OSM DATA NOT FOUND!')
	}
	if(destination){
		path.push([destination.lon, destination.lat, 0]);
	}
	return path;
}

const getLongLat = (node:any,ndRef:{_attributes:any}):any=>{
	if(ndRef._attributes && ndRef._attributes.ref){
		const {ref} = ndRef._attributes;
		let target = undefined;
		if(Array.isArray(node)){
			target = node.find(element=>element._attributes && Number(element._attributes.id) === Number(ref));
		}else
		if(node._attributes && Number(node._attributes.id) === Number(ref)){
			target = node;
		}
		if(target){
			if(checkPoint(target._attributes)){
				return [Number(target._attributes.lon), Number(target._attributes.lat), 0];
			}
		}
	}
	return undefined;
}

const checkPoint = (point:{lon:number,lat:number}):boolean=>{
	if(!point.lon || !point.lat){
		console.log('Not in lon,lat! '+point)
		return false;
	}
	const {lon,lat} = point;
	if(lon < 122.8 || lon > 145.9 || lat > 45.6 || lat < 24.0){
		console.log('out of bounds Japan! '+point)
		return false;
	}
	return true;
}

const checkTimestamp = (timestamp:{seconds:number}):boolean=>{
	if(!timestamp.seconds){
		console.log('Not in seconds! '+timestamp)
		return false;
	}
	const {seconds} = timestamp;
	if(seconds > 2147483647 || seconds < -2147483648) {
		console.log('out of bounds seconds! '+timestamp)
		return false;
	}
	return true;
}

const hsvToRgb = (H: number, S: number, V: number) => {
	const C = V * S;
	const Hp = H / 60;
	const X = C * (1 - Math.abs((Hp % 2) - 1));

	let R: number, G: number, B: number;
	if (Hp >= 0 && Hp < 1) { [R, G, B] = [C, X, 0]; }
	if (Hp >= 1 && Hp < 2) { [R, G, B] = [X, C, 0]; }
	if (Hp >= 2 && Hp < 3) { [R, G, B] = [0, C, X]; }
	if (Hp >= 3 && Hp < 4) { [R, G, B] = [0, X, C]; }
	if (Hp >= 4 && Hp < 5) { [R, G, B] = [X, 0, C]; }
	if (Hp >= 5 && Hp < 6) { [R, G, B] = [C, 0, X]; }

	const m = V - C;
	[R, G, B] = [R + m, G + m, B + m];

	R = (R * 255)|0;
	G = (G * 255)|0;
	B = (B * 255)|0;

	return [R, G, B];
};

const ratecolor = (rate: number) => {
	let color = 0;
	if (rate < 0) {
		color = 0;
	}else
	if (rate > 100) {
		color = 120;
	}else{
		color = (rate * 1.2)|0;
	}
	return hsvToRgb(color, 1, 1);
};
