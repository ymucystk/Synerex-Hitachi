import io from 'socket.io-client';
import { SocketMessage } from '../constants/workerMessageTypes';
const socket = io();

var wcounter = 0
console.log("Worker working!")

socket.on('disconnect', () => { console.log('Socket.IO disconnected!') })
const worker = self as any
self.addEventListener("message", (e: any) => {
    const type = e.data[0];
});
// start socket server

const getToken = () => {
    socket.emit('get_mapbox_token', {})
    console.log('Ask toGet mapbox token')
}

socket.on('connect', () => {
    console.log('Socket.IO connected!')
    worker.postMessage({ type: 'CONNECTED'} as SocketMessage<void>);
    setTimeout(getToken, 1500) // 500msec after send get=mapbox-token
})

socket.on('mapbox_token', (payload: string) => {
    console.log('token Got: ' + payload)
    worker.postMessage({
        type: 'RECEIVED_MAPBOX_TOKEN',
        payload
    } as SocketMessage<string> );
    // this
    if (wcounter === 0){
        setTimeout(startRecivedData, 500) // 500msec after send get=mapbox-token
        wcounter ++   // assign only once.
    }
})

function startRecivedData() {

    socket.on('point', (str: string) => {
        const payload: any = JSON.parse(str);
        worker.postMessage({
            type: 'RECEIVED_POINT',
            payload
        } as SocketMessage<any>)
    })

    socket.on('disabilityinfo', (str: string) => {
        const payload: any = JSON.parse(str);
        worker.postMessage({
            type: 'RECEIVED_DISABILITYINFO',
            payload
        } as SocketMessage<any>)
    })

    socket.on('disabilityresponse', (str: string) => {
        const payload: any = JSON.parse(str);
        worker.postMessage({
            type: 'RECEIVED_DISABILITYRESPONSE',
            payload
        } as SocketMessage<any>)
    })

    socket.on('dispatchrequest', (str: string) =>{
        let payload:any = JSON.parse(str)
        worker.postMessage({
            type: 'RECEIVED_DISPATCHREQUEST',
            payload
        } as SocketMessage<any> );
    })
    
    socket.on('dispatchresponse', (str: string) =>{
        let payload:any = JSON.parse(str)
        worker.postMessage({
            type: 'RECEIVED_DISPATCHRESPONSE',
            payload
        } as SocketMessage<any> );
    })

    socket.on('routerequest', (str: string) =>{
        let payload:any = JSON.parse(str)
        worker.postMessage({
            type: 'RECEIVED_ROUTEREQUEST',
            payload
        } as SocketMessage<string> );
    })

    socket.on('routeresponse', (str: string) =>{
        let payload:any = JSON.parse(str)
        worker.postMessage({
            type: 'RECEIVED_ROUTERESPONSE',
            payload
        } as SocketMessage<string> );
    })

    socket.on('vehiclestatusrequest', (str: string) =>{
        let payload:any = JSON.parse(str)
        worker.postMessage({
            type: 'RECEIVED_VEHICLESTATUSREQUEST',
            payload
        } as SocketMessage<string> );
    })

    socket.on('vehiclestatusresponse', (str: string) =>{
        let payload:any = JSON.parse(str)
        worker.postMessage({
            type: 'RECEIVED_VEHICLESTATUSRESPONSE',
            payload
        } as SocketMessage<string> );
    })

    socket.on('evfleetsupply', (str: string) =>{
        let payload:any = JSON.parse(str)
        worker.postMessage({
            type: 'RECEIVED_EVFLEETSUPPLY',
            payload
        } as SocketMessage<any> );
    })

    socket.on('vehiclelist', (str: string) =>{
        let payload:any = JSON.parse(str)
        worker.postMessage({
            type: 'RECEIVED_VEHICLELIST',
            payload
        } as SocketMessage<any> );
    })

    socket.on('evfleetresponse', (str: string) =>{
        let payload:any = JSON.parse(str)
        worker.postMessage({
            type: 'RECEIVED_EVFLEETRESPONSE',
            payload
        } as SocketMessage<any> );
    })

    socket.on('deliveryplanningprovide', (str: string) =>{
        let payload:any = JSON.parse(str)
        worker.postMessage({
            type: 'RECEIVED_DELIVERYPLANNINGPROVIDE',
            payload
        } as SocketMessage<any> );
    })

    socket.on('dispdispatchresponse', (str: string) =>{
        let payload:any = JSON.parse(str)
        worker.postMessage({
            type: 'RECEIVED_DISPDISPATCHRESPONSE',
            payload
        } as SocketMessage<any> );
    })

    socket.on('deliveryplanningrequest', (str: string) =>{
        let payload:any = JSON.parse(str)
        worker.postMessage({
            type: 'RECEIVED_DELIVERYPLANNINGREQUEST',
            payload
        } as SocketMessage<any> );
    })

    socket.on('deliveryplanadoption', (str: string) =>{
        let payload:any = JSON.parse(str)
        worker.postMessage({
            type: 'RECEIVED_DELIVERYPLANADOPTION',
            payload
        } as SocketMessage<any> );
    })

    socket.on('deliveryplanningresponse', (str: string) =>{
        let payload:any = JSON.parse(str)
        worker.postMessage({
            type: 'RECEIVED_DELIVERYPLANNINGRESPONSE',
            payload
        } as SocketMessage<any> );
    })
}
