import { EvFleetSupply, VehicleList, DeliveryPlanningProvide, DeliveryPlan, VehicleAssignate, RouteInfo, ChargingPlans, PlanList,
	DeliveryPlanningRequest, TargetInfo, DeliveryInfo, PackageInfo, DeliveryPlanAdoption, PackagePlan, ChargingPlan } from '../@types'

export const route_line_color = [
	[0,255,0,255],[255,0,0,255],[255,255,0,255],[0,255,255,255],[255,0,255,255],[255,165,0,255],[255,255,255,255],
]

export const rgbStrChg = (rgb: number[]) => {
	const red = rgb[0] > 0xF ? rgb[0].toString(16) : `0${rgb[0].toString(16)}`
	const green = rgb[1] > 0xF ? rgb[1].toString(16) : `0${rgb[1].toString(16)}`
	const blue = rgb[2] > 0xF ? rgb[2].toString(16) : `0${rgb[2].toString(16)}`
	return `#${red}${green}${blue}`
}

export class Deliveryplanningrequest {
	constructor(){
		this.deliveryplanningrequest = undefined
        this.target_info = undefined
        this.delivery_info = undefined
        this.packages_info = []
	}
	private deliveryplanningrequest: DeliveryPlanningRequest
    target_info: TargetInfo
    delivery_info: DeliveryInfo
    packages_info: PackageInfo[]
    package_id_list: number[]

    set(setData: DeliveryPlanningRequest){
		if(setData.event_id === 1){
			this.deliveryplanningrequest = {...setData}
            this.target_info = this.deliveryplanningrequest.target_info
            this.delivery_info = this.deliveryplanningrequest.delivery_info
            if(this.delivery_info&&this.delivery_info.packages_info){
                this.packages_info = this.delivery_info.packages_info
                this.package_id_list = this.packages_info.map(x=>x.package_id)
            }else{
                this.packages_info = []
                this.package_id_list = []
            }
		}else{
			console.log(`Error! DeliveryPlanningRequest.event_id`)
		}
	}
}

export class Deliveryplanningprovide {
    constructor(){
        this.deliveryplanningprovide = []
    }
    private deliveryplanningprovide:DeliveryPlanningProvide[]
    set(setData: DeliveryPlanningProvide){
        if(setData.event_id === 2){
            const {module_id,provide_id} = setData
            if(module_id&&provide_id){
                let findIdx = this.deliveryplanningprovide.findIndex(x=>x.module_id===module_id&&x.provide_id===provide_id)
                if(findIdx < 0){
                    findIdx = this.deliveryplanningprovide.length
                    this.deliveryplanningprovide[findIdx] = {...setData}
                }else{
                    this.deliveryplanningprovide[findIdx] = {...this.deliveryplanningprovide[findIdx], ...setData}
                }
            }else{
                console.log(`Error! DeliveryPlanningProvide.module_id or provide_id`)
            }
        }else{
            console.log(`Error! DeliveryPlanningProvide.event_id`)
        }
    }
    reset(){
        this.deliveryplanningprovide = []
    }
    registered():boolean{
        return this.deliveryplanningprovide.length > 0
    }
    plan_list():PlanList[]{
		return this.deliveryplanningprovide.map((x,index)=>{
			return {name:`プラン ${String.fromCharCode(65+index)}`,index,module_id:x.module_id,provide_id:x.provide_id}
		})
    }
    module_id_list():number[]{
        return this.deliveryplanningprovide.map(x=>x.module_id).sort((a, b) => (a - b))
    }
    provide_id_list(module_id:number):string[]{
        if(module_id){
            return this.deliveryplanningprovide.filter(x=>x.module_id===module_id).map(x=>x.provide_id).sort()
        }
        return []
    }
    private Dpp_element(module_id:number,provide_id:string):DeliveryPlanningProvide{
        if(module_id&&provide_id){
            return this.deliveryplanningprovide.find(x=>x.module_id===module_id&&x.provide_id===provide_id)
        }
        return undefined
    }
    delivery_plan(module_id:number,provide_id:string):DeliveryPlan[]{
        const deliveryplanningprovide = this.Dpp_element(module_id,provide_id)
        if(deliveryplanningprovide){
            const delivery_plan = deliveryplanningprovide.delivery_plan
            if(delivery_plan){
                return delivery_plan
            }
        }
        return []
    }
    charging_plan(module_id:number,provide_id:string):ChargingPlan[]{
        const deliveryplanningprovide = this.Dpp_element(module_id,provide_id)
        if(deliveryplanningprovide){
            const charging_plan = deliveryplanningprovide.charging_plan
            if(charging_plan){
                return charging_plan
            }
        }
        return []
    }
    Vehicle_assignate(module_id:number,provide_id:string):VehicleAssignate[]{
        const deliveryplanningprovide = this.Dpp_element(module_id,provide_id)
        if(deliveryplanningprovide){
            const Vehicle_assignate = deliveryplanningprovide.Vehicle_assignate
            if(Vehicle_assignate){
                return Vehicle_assignate
            }
        }
        return []
    }
    vehicle_id_list(module_id:number,provide_id:string):number[]{
        const Vehicle_assignate = this.Vehicle_assignate(module_id,provide_id)
        if(Vehicle_assignate){
            return Array.from(new Set(Vehicle_assignate.map(x=>x.vehicle_id))).sort((a, b) => (a - b))
        }
        return []
    }
    private Va_element(module_id:number,provide_id:string,vehicle_id:number):VehicleAssignate{
        if(vehicle_id){
            const Vehicle_assignate = this.Vehicle_assignate(module_id,provide_id)
            if(Vehicle_assignate){
                return Vehicle_assignate.find(x=>x.vehicle_id===vehicle_id)
            }
        }
        return undefined
    }
    vehicle_index(module_id:number,provide_id:string,vehicle_id:number):number{
        if(vehicle_id){
            const Vehicle_assignate = this.Vehicle_assignate(module_id,provide_id)
            if(Vehicle_assignate){
                return Vehicle_assignate.findIndex(x=>x.vehicle_id===vehicle_id)
            }
        }
        return -1
    }
    delivery_plan_id(module_id:number,provide_id:string,vehicle_id:number):number{
        const element = this.Va_element(module_id,provide_id,vehicle_id)
        if(element&&element.delivery_plan_id){
            return element.delivery_plan_id
        }
        return undefined
    }
    charging_plan_id_list(module_id:number,provide_id:string,vehicle_id:number):number[]{
        const element = this.Va_element(module_id,provide_id,vehicle_id)
        if(element&&element.charging_plans){
            return Array.from(new Set(element.charging_plans.map(x=>x.charging_plan_id))).sort((a, b) => (a - b))
        }
        return []
    }
    route_info(module_id:number,provide_id:string,vehicle_id:number):RouteInfo[]{
        const element = this.Va_element(module_id,provide_id,vehicle_id)
        if(element&&element.route_info){
            return element.route_info
        }
        return []
    }
    packages_plan(module_id:number,provide_id:string,vehicle_id:number):PackagePlan[]{
        const delivery_plan = this.delivery_plan(module_id,provide_id)
        if(delivery_plan){
            const element = this.Va_element(module_id,provide_id,vehicle_id)
            if(element&&element.delivery_plan_id){
                const dp_element = delivery_plan.find(x=>x.delivery_plan_id===element.delivery_plan_id)
                if(dp_element&&dp_element.packages_plan){
                    return dp_element.packages_plan
                }
            }
        }
        return []
    }
    charger_count(module_id:number,provide_id:string):number{
        const charging_plan = this.charging_plan(module_id,provide_id)
        if(charging_plan){
            return Array.from(new Set(charging_plan.map(x=>`${x.charging_station_id}${x.charger_id}`))).length
        }
        return 0
    }
}

export class Deliveryplanadoption {
    constructor(){
        this.deliveryplanadoption = []
    }
    private deliveryplanadoption: DeliveryPlanAdoption[]
    set(setData:DeliveryPlanAdoption){
        if(setData.event_id === 3){
            const {module_id,provide_id} = setData
            if(module_id&&provide_id){
                let findIdx = this.deliveryplanadoption.findIndex(x=>x.module_id===module_id&&x.provide_id===provide_id)
                if(findIdx < 0){
                    findIdx = this.deliveryplanadoption.length
                }
                this.deliveryplanadoption[findIdx] = {...setData}
            }else{
                console.log(`Error! DeliveryPlanAdoption.module_id or provide_id`)
            }
        }else{
			console.log(`Error! DeliveryPlanAdoption.event_id`)
        }
    }
    reset(){
        this.deliveryplanadoption = []
    }
    adoption(module_id:number,provide_id:string){
        if(module_id&&provide_id){
            return this.deliveryplanadoption.find(x=>x.module_id===module_id&&x.provide_id===provide_id)?true:false
        }else{
            console.log(`Error! DeliveryPlanAdoption.module_id or provide_id`)
            return false
        }
    }
    adoptReceive(){
        return this.deliveryplanadoption.length>0?true:false
    }
}

export class Vehiclelist {
    constructor(){
        this.vehiclelist = []
    }
    vehiclelist: VehicleList[]
    set(setData:VehicleList){
        if(setData.event_id !== 7){
            const {module_id,provide_id} = setData
            if(module_id&&provide_id){
                let findIdx = this.vehiclelist.findIndex(x=>x.module_id===module_id&&x.provide_id===provide_id)
                if(findIdx < 0){
                    findIdx = this.vehiclelist.length
                }
                this.vehiclelist[findIdx] = {...setData}
            }else{
                console.log(`Error! VehicleList.module_id or provide_id`)
            }

        }else{
            console.log(`Error! VehicleList.event_id`)
        }
    }
    reset(){
        this.vehiclelist = []
    }
    find(module_id:number,provide_id:string){
        if(module_id&&provide_id){
            return this.vehiclelist.find(x=>x.module_id===module_id&&x.provide_id===provide_id)
        }else{
            return undefined
        }
    }
    vehicle_list(module_id:number,provide_id:string,vehicle_id:number){
        const vehiclelist = this.find(module_id,provide_id)
        if(vehiclelist&&vehicle_id){
            return vehiclelist.vehicle_list.find(x=>x.vehicle_id===vehicle_id)
        }else{
            return undefined
        }
    }

}