export interface PackagePlan {
    package_id?: number,
    estimated_time_of_arrival?: string, //'YYYYMMDDHHMMSS'
}

export interface DeliveryPlan {
    delivery_plan_id?: number,
    packages_plan?: PackagePlan[],   //MAX 120
}

export interface ChargingPlan {
    charging_plan_id?: number,
    vehicle_id?: number,
    charging_station_id?: number,
    charger_id?: number,
    charging_type?: number, //1: Normal, 2: Fast
    start_time?: string,    //'YYYYMMDDHHMMSS'
    end_time?: string,  //'YYYYMMDDHHMMSS'
}

export interface ChargingPlans {
    charging_plan_id?: number,
}

export interface RouteInfo {
    latitude?: number,  //緯度
    longitude?: number, //経度
}

export interface VehicleAssignate {
    vehicle_id?: number,
    delivery_plan_id?: number,
    charging_plans?: ChargingPlans[],   //MAX 20
    route_info?: RouteInfo[]   //MAX 10000
}

export interface DeliveryPlanningProvide {
    message?: string,
    event_id?: number,  //2固定
    time_stamp?: string,    //'YYYYMMDDHHMMSS'
    module_id?: number,
    provide_id?: string,
    delivery_plan?: DeliveryPlan[],   //MAX 10
    charging_plan?: ChargingPlan[],
    Vehicle_assignate?: VehicleAssignate[],   //MAX 10
}


export interface TargetInfo {
    max_vehicle_unit?: number,
    start_delivery_time?: string,   //'YYYYMMDDHHMMSS'
    end_delivery_time?: string, //'YYYYMMDDHHMMSS'
}

export interface PackageInfo {
    package_id?: number,
    latitude?: number,  //緯度
    longitude?: number, //経度
    weight?: number,
    delivery_time?: number,   //1:09:00-12:00,2:14:00-18:00,3:18:00-21://
}

export interface DeliveryInfo {
    delivery_id?: number,
    packages_info?: PackageInfo[]   //MAX 1200
}

export interface DeliveryPlanningRequest {
    message?: string,
    event_id?: number, //1固定
    time_stamp?: string,    //'YYYYMMDDHHMMSS'
    target_info?: TargetInfo,
    delivery_info?: DeliveryInfo,
}

export interface DeliveryPlanAdoption {
    message?: string,
    event_id?: number,  //3固定
    time_stamp?: string,    //'YYYYMMDDHHMMSS'
    module_id?: number, //DeliveryPlanningProvideと連携
    provide_id?: string, //DeliveryPlanningProvideと連携
}

export interface EvFleetSupply {    //車両のリアル位置＆情報（1秒周期で更新）
    message?: string,
    event_id?: number,  //9固定
    time_stamp?: string,    //'YYYYMMDDHHMMSS'
    vehicle_id?: number,
    latitude?: number,  //緯度
    longitude?: number, //経度
    soc?: number,   //バッテリー充電率(%)
    soh?: number,   //バッテリー劣化率(%)
    air_conditioner?: number,   //0:not use,1:use
    position?: number[],
    sourcePosition?: [number,number,number],
    targetPosition?: [number,number,number],
    elapsedtime?: number,   //UNIX-TIME(msec)
    direction?: number,
    text?: string,
}

export interface Vehicle {
    vehicle_id?: number,
    soc?: number,   //バッテリー充電率(%)
    soh?: number,   //バッテリー劣化率(%)
    air_conditioner?: number,   //0:not use,1:use
}

export interface VehicleList {
    message?: string,
    event_id?: number,  //7固定
    time_stamp?: string,    //'YYYYMMDDHHMMSS'
    module_id?: number,
    provide_id?: string,
    vehicle_list?: Vehicle[],   //MAX 10
}

export interface PlanList {
    name:string,
    index:number,
    module_id:number,
    provide_id:string
}
