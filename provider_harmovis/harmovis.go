package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"time"

	gosocketio "github.com/mtfelian/golang-socketio"
	delivery_planning "github.com/smart_dispatch/delivery_planning/proto"
	dispatch "github.com/smart_dispatch/dispatch/proto"
	evfleet "github.com/smart_dispatch/evfleet/proto"
	proto_alt_pt "github.com/synerex/proto_alt_pt"
	synerexapi "github.com/synerex/synerex_api"
	nodeapi "github.com/synerex/synerex_nodeapi"
	synerexsxutil "github.com/synerex/synerex_sxutil"
	"google.golang.org/protobuf/proto"
)

// Harmoware Vis-Synerex wiht Layer extension provider provides map information to Web Service through socket.io.

var (
	nodesrv                 *string     = flag.String("nodesrv", "127.0.0.1:9990", "Node ID Server")
	cluster_id              *int        = flag.Int("cluster_id", 0, "ClusterId for The Synerex Server")
	assetDir                *string     = flag.String("assetdir", "", "set Web client dir")
	mapbox                  *string     = flag.String("mapbox", "", "Set Mapbox access token")
	port                    *int        = flag.Int("port", 3030, "HarmoVis Ext Provider Listening Port")
	httpsport               *int        = flag.Int("httpsport", 443, "HarmoVis Ext Provider Listening httpsport")
	httplaunch              *bool       = flag.Bool("httplaunch", false, "httplaunch")
	sslcrt                  *string     = flag.String("sslcrt", "./key/debug.crt", "sslcrt")
	sslkey                  *string     = flag.String("sslkey", "./key/debug.key", "sslkey")
	channel                 *int        = flag.Int("channel", 1, "Channel")
	channelAlt              *int        = flag.Int("channelAlt", 1 /*int(pbase.ALT_PT_SVC)*/, "channelAlt")
	channelEvfleet          *int        = flag.Int("channelEvfleet", 20, "channelEvfleet")
	channelDp               *int        = flag.Int("channelDp", 21, "channelDp")
	name                    *string     = flag.String("name", "HarmoVis", "Provider Name")
	mu                      *sync.Mutex = new(sync.Mutex)
	version                 string      = "0.00"
	assetsDir               http.FileSystem
	ioserv                  *gosocketio.Server
	sxServerAddress         string
	mapboxToken             string
	DeliveryPlanningProvide []*dispatch.DeliveryPlanningProvide        = nil
	DeliveryPlanningRequest *delivery_planning.DeliveryPlanningRequest = nil
	DeliveryPlanAdoption    []*delivery_planning.DeliveryPlanAdoption  = nil
)

// assetsFileHandler for static Data
func assetsFileHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		return
	}

	file := r.URL.Path
	//	log.Printf("Open File '%s'",file)
	if file == "/" {
		file = "/index.html"
	}
	f, err := assetsDir.Open(file)
	if err != nil {
		log.Printf("can't open file %s: %v\n", file, err)
		return
	}
	defer f.Close()

	fi, err := f.Stat()
	if err != nil {
		log.Printf("can't open file %s: %v\n", file, err)
		return
	}
	http.ServeContent(w, r, file, fi.ModTime(), f)
}

func run_server() *gosocketio.Server {

	currentRoot, err := os.Getwd()
	if err != nil {
		log.Fatal(err)
	}

	if *assetDir != "" {
		currentRoot = *assetDir
	}

	d := filepath.Join(currentRoot, "mclient", "build")

	assetsDir = http.Dir(d)
	log.Println("AssetDir:", assetsDir)

	assetsDir = http.Dir(d)
	server := gosocketio.NewServer()

	server.On(gosocketio.OnConnection, func(c *gosocketio.Channel) {
		// wait for a few milli seconds.
		log.Printf("Connected from %s as %s", c.IP(), c.Id())

	})

	server.On("get_mapbox_token", func(c *gosocketio.Channel) {
		log.Printf("Requested mapbox access token")
		log.Printf("mapbox %s ", *mapbox)
		mapboxToken = os.Getenv("MAPBOX_ACCESS_TOKEN")
		if *mapbox != "" {
			mapboxToken = *mapbox
		}
		c.Emit("mapbox_token", mapboxToken)
		log.Printf("mapbox-token transferred %s ", mapboxToken)
	})

	server.On("save_data_transmission_request", func(c *gosocketio.Channel) {
		log.Printf("save_data_transmission_request")
		{
			for _, x := range DeliveryPlanningProvide {
				DeliveryPlanningProvide_1 := &dispatch.DeliveryPlanningProvide{
					EventId:      x.EventId,
					TimeStamp:    x.TimeStamp,
					ModuleId:     x.ModuleId,
					ProvideId:    x.ProvideId,
					DeliveryPlan: x.DeliveryPlan,
					ChargingPlan: x.ChargingPlan,
				}
				jsonBytes_1, _ := json.Marshal(DeliveryPlanningProvide_1)
				c.Emit("deliveryplanningprovide", string(jsonBytes_1))

				DeliveryPlanningProvide_2 := &dispatch.DeliveryPlanningProvide{
					EventId:          x.EventId,
					ModuleId:         x.ModuleId,
					ProvideId:        x.ProvideId,
					VehicleAssignate: x.VehicleAssignate,
				}
				jsonBytes_2, _ := json.Marshal(DeliveryPlanningProvide_2)
				c.Emit("deliveryplanningprovide", string(jsonBytes_2))
				log.Printf("response DeliveryPlanningProvide ModuleId:%d, ProvideId:%s", x.ModuleId, x.ProvideId)
			}
		}
		if DeliveryPlanningRequest != nil {
			jsonBytes, _ := json.Marshal(DeliveryPlanningRequest)
			c.Emit("deliveryplanningrequest", string(jsonBytes))
			log.Printf("response DeliveryPlanningRequest")
		}
		{
			for _, x := range DeliveryPlanAdoption {
				jsonBytes, _ := json.Marshal(x)
				c.Emit("deliveryplanadoption", string(jsonBytes))
				log.Printf("response DeliveryPlanAdoption ModuleId:%d, ProvideId:%s", x.ModuleId, x.ProvideId)
			}
		}
	})

	server.On(gosocketio.OnDisconnection, func(c *gosocketio.Channel) {
		log.Printf("Disconnected from %s as %s", c.IP(), c.Id())
	})

	return server
}

func reconnectClient(client *synerexsxutil.SXServiceClient) {
	mu.Lock() // first make client into nil
	if client.SXClient != nil {
		client.SXClient = nil
		log.Printf("Client reset \n")
	}
	mu.Unlock()
	time.Sleep(5 * time.Second) // wait 5 seconds to reconnect
	mu.Lock()
	if client.SXClient == nil {
		newClt := synerexsxutil.GrpcConnectServer(sxServerAddress)
		if newClt != nil {
			log.Printf("Reconnect server [%s]\n", sxServerAddress)
			client.SXClient = newClt
		}
	} else { // someone may connect!
		log.Printf("Use reconnected server [%s]\n", sxServerAddress)
	}
	mu.Unlock()
}

func supplyAltCallback(clt *synerexsxutil.SXServiceClient, sp *synerexapi.Supply) {
	switch sp.SupplyName {
	case "Point":
		proto_alt_pt := &proto_alt_pt.Point{}
		err := proto.Unmarshal(sp.Cdata.Entity, proto_alt_pt)
		if err == nil {
			jsonBytes, _ := json.Marshal(proto_alt_pt)
			log.Printf("Point: %v", string(jsonBytes))
			mu.Lock()
			ioserv.BroadcastToAll("point", string(jsonBytes))
			mu.Unlock()
		} else {
			log.Printf("proto.Unmarshal() failed: %s", err)
		}
	case "DisabilityInfo":
		proto_alt_pt := &proto_alt_pt.DisabilityInfo{}
		err := proto.Unmarshal(sp.Cdata.Entity, proto_alt_pt)
		if err == nil {
			jsonBytes, _ := json.Marshal(proto_alt_pt)
			log.Printf("DisabilityInfo: %v", string(jsonBytes))
			mu.Lock()
			ioserv.BroadcastToAll("disabilityinfo", string(jsonBytes))
			mu.Unlock()
		} else {
			log.Printf("proto.Unmarshal() failed: %s", err)
		}
	case "DisabilityResponse":
		proto_alt_pt := &proto_alt_pt.DisabilityResponse{}
		err := proto.Unmarshal(sp.Cdata.Entity, proto_alt_pt)
		if err == nil {
			jsonBytes, _ := json.Marshal(proto_alt_pt)
			log.Printf("DisabilityResponse: %v", string(jsonBytes))
			mu.Lock()
			ioserv.BroadcastToAll("disabilityresponse", string(jsonBytes))
			mu.Unlock()
		} else {
			log.Printf("proto.Unmarshal() failed: %s", err)
		}
	case "DispatchRequest":
		proto_alt_pt := &proto_alt_pt.DispatchRequest{}
		err := proto.Unmarshal(sp.Cdata.Entity, proto_alt_pt)
		if err == nil {
			jsonBytes, _ := json.Marshal(proto_alt_pt)
			log.Printf("DispatchRequest: %v", string(jsonBytes))
			mu.Lock()
			ioserv.BroadcastToAll("dispatchrequest", string(jsonBytes))
			mu.Unlock()
		} else {
			log.Printf("proto.Unmarshal() failed: %s", err)
		}
	case "DispatchResponse":
		proto_alt_pt := &proto_alt_pt.DispatchResponse{}
		err := proto.Unmarshal(sp.Cdata.Entity, proto_alt_pt)
		if err == nil {
			jsonBytes, _ := json.Marshal(proto_alt_pt)
			log.Printf("DispatchResponse: %v", string(jsonBytes))
			mu.Lock()
			ioserv.BroadcastToAll("dispatchresponse", string(jsonBytes))
			mu.Unlock()
		} else {
			log.Printf("proto.Unmarshal() failed: %s", err)
		}
	case "RouteRequest":
		proto_alt_pt := &proto_alt_pt.RouteRequest{}
		err := proto.Unmarshal(sp.Cdata.Entity, proto_alt_pt)
		if err == nil {
			jsonBytes, _ := json.Marshal(proto_alt_pt)
			log.Printf("RouteRequest: %v", string(jsonBytes))
			mu.Lock()
			ioserv.BroadcastToAll("routerequest", string(jsonBytes))
			mu.Unlock()
		} else {
			log.Printf("proto.Unmarshal() failed: %s", err)
		}
	case "RouteResponse":
		proto_alt_pt := &proto_alt_pt.RouteResponse{}
		err := proto.Unmarshal(sp.Cdata.Entity, proto_alt_pt)
		if err == nil {
			jsonBytes, _ := json.Marshal(proto_alt_pt)
			log.Printf("RouteResponse: %v", string(jsonBytes))
			mu.Lock()
			ioserv.BroadcastToAll("routeresponse", string(jsonBytes))
			mu.Unlock()
		} else {
			log.Printf("proto.Unmarshal() failed: %s", err)
		}
	case "VehicleStatusRequest":
		proto_alt_pt := &proto_alt_pt.VehicleStatusRequest{}
		err := proto.Unmarshal(sp.Cdata.Entity, proto_alt_pt)
		if err == nil {
			jsonBytes, _ := json.Marshal(proto_alt_pt)
			log.Printf("VehicleStatusRequest: %v", string(jsonBytes))
			mu.Lock()
			ioserv.BroadcastToAll("vehiclestatusrequest", string(jsonBytes))
			mu.Unlock()
		} else {
			log.Printf("proto.Unmarshal() failed: %s", err)
		}
	case "VehicleStatusResponse":
		proto_alt_pt := &proto_alt_pt.VehicleStatusResponse{}
		err := proto.Unmarshal(sp.Cdata.Entity, proto_alt_pt)
		if err == nil {
			jsonBytes, _ := json.Marshal(proto_alt_pt)
			log.Printf("VehicleStatusResponse: %v", string(jsonBytes))
			mu.Lock()
			ioserv.BroadcastToAll("vehiclestatusresponse", string(jsonBytes))
			mu.Unlock()
		} else {
			log.Printf("proto.Unmarshal() failed: %s", err)
		}
	default:
		log.Printf("supplyAltCallback receive Undefined SupplyName: %s", sp.SupplyName)
	}
}

func supplyEvfleetCallback(clt *synerexsxutil.SXServiceClient, sp *synerexapi.Supply) {
	switch sp.SupplyName {
	case "EvFleetSupply":
		EvFleetSupply := &evfleet.EvFleetSupply{}
		err := proto.Unmarshal(sp.Cdata.Entity, EvFleetSupply)
		if err == nil {
			jsonBytes, _ := json.Marshal(EvFleetSupply)
			log.Printf("EvFleetSupply: %v", string(jsonBytes))
			mu.Lock()
			ioserv.BroadcastToAll("evfleetsupply", string(jsonBytes))
			mu.Unlock()
		} else {
			log.Printf("proto.Unmarshal() failed: %s", err)
		}
	case "VehicleList":
		VehicleList := &evfleet.VehicleList{}
		err := proto.Unmarshal(sp.Cdata.Entity, VehicleList)
		if err == nil {
			jsonBytes, _ := json.Marshal(VehicleList)
			log.Printf("VehicleList: %v", string(jsonBytes))
			mu.Lock()
			ioserv.BroadcastToAll("vehiclelist", string(jsonBytes))
			mu.Unlock()
		} else {
			log.Printf("proto.Unmarshal() failed: %s", err)
		}
	case "EvFleetResponse":
		EvFleetResponse := &evfleet.EvFleetResponse{}
		err := proto.Unmarshal(sp.Cdata.Entity, EvFleetResponse)
		if err == nil {
			jsonBytes, _ := json.Marshal(EvFleetResponse)
			log.Printf("EvFleetResponse: %v", string(jsonBytes))
			mu.Lock()
			ioserv.BroadcastToAll("evfleetresponse", string(jsonBytes))
			mu.Unlock()
		} else {
			log.Printf("proto.Unmarshal() failed: %s", err)
		}
	default:
		log.Printf("supplyEvfleetCallback receive Undefined SupplyName: %s", sp.SupplyName)
	}
}

func supplyDpCallback(clt *synerexsxutil.SXServiceClient, sp *synerexapi.Supply) {
	switch sp.SupplyName {
	case "DeliveryPlanningProvide":
		//saveDeliveryPlanningProvide := &dispatch.DeliveryPlanningProvide{}
		work := &dispatch.DeliveryPlanningProvide{}
		err := proto.Unmarshal(sp.Cdata.Entity, work)
		if err == nil && work.EventId == 2 {
			findIdx := -1
			for i, x := range DeliveryPlanningProvide {
				if x.ModuleId == work.ModuleId && x.ProvideId == work.ProvideId {
					findIdx = i
					DeliveryPlanningProvide[findIdx] = work
					break
				}
			}
			if findIdx < 0 {
				DeliveryPlanningProvide = append(DeliveryPlanningProvide, work)
			}
			DeliveryPlanningProvide_1 := &dispatch.DeliveryPlanningProvide{
				EventId:      work.EventId,
				TimeStamp:    work.TimeStamp,
				ModuleId:     work.ModuleId,
				ProvideId:    work.ProvideId,
				DeliveryPlan: work.DeliveryPlan,
				ChargingPlan: work.ChargingPlan,
			}
			DeliveryPlanningProvide_2 := &dispatch.DeliveryPlanningProvide{
				EventId:          work.EventId,
				ModuleId:         work.ModuleId,
				ProvideId:        work.ProvideId,
				VehicleAssignate: work.VehicleAssignate,
			}
			jsonBytes_1, _ := json.Marshal(DeliveryPlanningProvide_1)
			jsonBytes_2, _ := json.Marshal(DeliveryPlanningProvide_2)
			log.Printf("DeliveryPlanningProvide: %v", string(jsonBytes_1))
			//log.Printf("DeliveryPlanningProvide: %v", string(jsonBytes_2))
			log.Printf("DeliveryPlanningProvide.length: %d", len(DeliveryPlanningProvide))
			mu.Lock()
			ioserv.BroadcastToAll("deliveryplanningprovide", string(jsonBytes_1))
			ioserv.BroadcastToAll("deliveryplanningprovide", string(jsonBytes_2))
			mu.Unlock()
		} else {
			log.Printf("proto.Unmarshal() failed: %s", err)
			log.Printf("DeliveryPlanningProvide EventId failed: %d", work.EventId)
		}
	case "DispatchResponse":
		DispatchResponse := &dispatch.DispatchResponse{}
		err := proto.Unmarshal(sp.Cdata.Entity, DispatchResponse)
		if err == nil {
			jsonBytes, _ := json.Marshal(DispatchResponse)
			log.Printf("DispatchResponse: %v", string(jsonBytes))
			mu.Lock()
			ioserv.BroadcastToAll("dispdispatchresponse", string(jsonBytes))
			mu.Unlock()
		} else {
			log.Printf("proto.Unmarshal() failed: %s", err)
		}
	case "DeliveryPlanAdoption":
		//DeliveryPlanAdoption := &delivery_planning.DeliveryPlanAdoption{}
		work := &delivery_planning.DeliveryPlanAdoption{}
		err := proto.Unmarshal(sp.Cdata.Entity, work)
		if err == nil && work.EventId == 3 {
			findIdx := -1
			for i, x := range DeliveryPlanAdoption {
				if x.ModuleId == work.ModuleId && x.ProvideId == work.ProvideId {
					findIdx = i
					DeliveryPlanAdoption[findIdx] = work
					break
				}
			}
			if findIdx < 0 {
				DeliveryPlanAdoption = append(DeliveryPlanAdoption, work)
			}
			jsonBytes, _ := json.Marshal(work)
			log.Printf("DeliveryPlanAdoption: %v", string(jsonBytes))
			log.Printf("DeliveryPlanAdoption.length: %d", len(DeliveryPlanAdoption))
			mu.Lock()
			ioserv.BroadcastToAll("deliveryplanadoption", string(jsonBytes))
			mu.Unlock()
		} else {
			log.Printf("proto.Unmarshal() failed: %s", err)
			log.Printf("DeliveryPlanAdoption EventId failed: %d", work.EventId)
		}
	case "DeliveryPlanningResponse":
		DeliveryPlanningResponse := &delivery_planning.DeliveryPlanningResponse{}
		err := proto.Unmarshal(sp.Cdata.Entity, DeliveryPlanningResponse)
		if err == nil {
			jsonBytes, _ := json.Marshal(DeliveryPlanningResponse)
			log.Printf("DeliveryPlanningResponse: %v", string(jsonBytes))
			mu.Lock()
			ioserv.BroadcastToAll("deliveryplanningresponse", string(jsonBytes))
			mu.Unlock()
		} else {
			log.Printf("proto.Unmarshal() failed: %s", err)
		}
	default:
		log.Printf("supplyDpCallback receive Undefined SupplyName: %s", sp.SupplyName)
	}
}

func demandDpCallback(clt *synerexsxutil.SXServiceClient, sp *synerexapi.Demand) {
	switch sp.DemandName {
	case "DispatchResponse":
		DispatchResponse := &dispatch.DispatchResponse{}
		err := proto.Unmarshal(sp.Cdata.Entity, DispatchResponse)
		if err == nil {
			jsonBytes, _ := json.Marshal(DispatchResponse)
			log.Printf("DispatchResponse: %v", string(jsonBytes))
			mu.Lock()
			ioserv.BroadcastToAll("dispdispatchresponse", string(jsonBytes))
			mu.Unlock()
		} else {
			log.Printf("proto.Unmarshal() failed: %s", err)
		}
	case "DeliveryPlanningRequest":
		//DeliveryPlanningRequest := &delivery_planning.DeliveryPlanningRequest{}
		work := &delivery_planning.DeliveryPlanningRequest{}
		err := proto.Unmarshal(sp.Cdata.Entity, work)
		if err == nil && work.EventId == 1 {
			DeliveryPlanningRequest = work
			jsonBytes, _ := json.Marshal(work)
			log.Printf("DeliveryPlanningRequest: %v", string(jsonBytes))
			mu.Lock()
			ioserv.BroadcastToAll("deliveryplanningrequest", string(jsonBytes))
			mu.Unlock()
		} else {
			log.Printf("proto.Unmarshal() failed: %s", err)
			log.Printf("DeliveryPlanningRequest ModuleId failed: %d", work.EventId)
		}
	case "DeliveryPlanAdoption":
		//DeliveryPlanAdoption := &delivery_planning.DeliveryPlanAdoption{}
		work := &delivery_planning.DeliveryPlanAdoption{}
		err := proto.Unmarshal(sp.Cdata.Entity, work)
		if err == nil && work.EventId == 3 {
			findIdx := -1
			for i, x := range DeliveryPlanAdoption {
				if x.ModuleId == work.ModuleId && x.ProvideId == work.ProvideId {
					findIdx = i
					DeliveryPlanAdoption[findIdx] = work
					break
				}
			}
			if findIdx < 0 {
				DeliveryPlanAdoption = append(DeliveryPlanAdoption, work)
			}
			jsonBytes, _ := json.Marshal(work)
			log.Printf("DeliveryPlanAdoption: %v", string(jsonBytes))
			log.Printf("DeliveryPlanAdoption.length: %d", len(DeliveryPlanAdoption))
			mu.Lock()
			ioserv.BroadcastToAll("deliveryplanadoption", string(jsonBytes))
			mu.Unlock()
		} else {
			log.Printf("proto.Unmarshal() failed: %s", err)
			log.Printf("DeliveryPlanAdoption EventId failed: %d", work.EventId)
		}
	case "DeliveryPlanningResponse":
		DeliveryPlanningResponse := &delivery_planning.DeliveryPlanningResponse{}
		err := proto.Unmarshal(sp.Cdata.Entity, DeliveryPlanningResponse)
		if err == nil {
			jsonBytes, _ := json.Marshal(DeliveryPlanningResponse)
			log.Printf("DeliveryPlanningResponse: %v", string(jsonBytes))
			mu.Lock()
			ioserv.BroadcastToAll("deliveryplanningresponse", string(jsonBytes))
			mu.Unlock()
		} else {
			log.Printf("proto.Unmarshal() failed: %s", err)
		}
	default:
		log.Printf("demandDpCallback receive Undefined DemandName: %s", sp.DemandName)
	}
}

func subscribeAltSupply(client *synerexsxutil.SXServiceClient) {
	for {
		log.Printf("subscribeAltSupply")
		ctx := context.Background() //
		err := client.SubscribeSupply(ctx, supplyAltCallback)
		log.Printf("Error:Supply %s\n", err.Error())
		// we need to restart
		reconnectClient(client)

	}
}

func subscribeEvfleetSupply(client *synerexsxutil.SXServiceClient) {
	for {
		log.Printf("subscribeEvfleetSupply")
		ctx := context.Background() //
		err := client.SubscribeSupply(ctx, supplyEvfleetCallback)
		log.Printf("Error:Supply %s\n", err.Error())
		// we need to restart
		reconnectClient(client)

	}
}

func subscribeDpSupply(client *synerexsxutil.SXServiceClient) {
	for {
		log.Printf("subscribeDpSupply")
		ctx := context.Background() //
		err := client.SubscribeSupply(ctx, supplyDpCallback)
		log.Printf("Error:Supply %s\n", err.Error())
		// we need to restart
		reconnectClient(client)

	}
}

func subscribeDpDemand(client *synerexsxutil.SXServiceClient) {
	for {
		log.Printf("subscribeDpDemand")
		ctx := context.Background() //
		err := client.SubscribeDemand(ctx, demandDpCallback)
		log.Printf("Error:Demand %s\n", err.Error())
		// we need to restart
		reconnectClient(client)

	}
}

func monitorStatus() {
	for {
		synerexsxutil.SetNodeStatus(int32(runtime.NumGoroutine()), "HV")
		time.Sleep(time.Second * 3)
	}
}

func main() {
	flag.Parse()

	channelAlt := uint32(*channelAlt)
	channelEvfleet := uint32(*channelEvfleet)
	channelDp := uint32(*channelDp)

	channelTypes := []uint32{uint32(*channel)}
	sxo := &synerexsxutil.SxServerOpt{
		NodeType:  nodeapi.NodeType_PROVIDER,
		ClusterId: int32(*cluster_id),
		AreaId:    "Default",
	}
	var rerr error
	sxServerAddress, rerr = synerexsxutil.RegisterNode(*nodesrv, *name, channelTypes, sxo)
	if rerr != nil {
		log.Fatal("Can't register node ", rerr)
	}
	log.Printf("register SynerexServer at [%s]\n", sxServerAddress)

	go synerexsxutil.HandleSigInt()
	synerexsxutil.RegisterDeferFunction(synerexsxutil.UnRegisterNode)

	wg := sync.WaitGroup{} // for syncing other goroutines

	ioserv = run_server()
	fmt.Printf("Running HarmoVis Server.\n")
	if ioserv == nil {
		os.Exit(1)
	}

	client := synerexsxutil.GrpcConnectServer(sxServerAddress) // if there is server address change, we should do it!
	log.Printf("Connecting SynerexServer at [%s]\n", sxServerAddress)

	argJson := "{Client:Event}"
	alt_client := synerexsxutil.NewSXServiceClient(client, channelAlt, argJson)
	evfleet_client := synerexsxutil.NewSXServiceClient(client, channelEvfleet, argJson) //チャンネルは借値
	dp_client := synerexsxutil.NewSXServiceClient(client, channelDp, argJson)           //チャンネルは借値

	wg.Add(1)

	go subscribeAltSupply(alt_client)
	go subscribeEvfleetSupply(evfleet_client)
	go subscribeDpSupply(dp_client)
	go subscribeDpDemand(dp_client)

	go monitorStatus() // keep status

	serveMux := http.NewServeMux()

	serveMux.Handle("/socket.io/", ioserv)
	serveMux.HandleFunc("/", assetsFileHandler)

	httplaunch := *httplaunch
	fmt.Printf("httplaunch [%v] .\n", httplaunch)
	if !httplaunch {
		log.Printf("Starting Harmoware-VIS Provider https %s  on port %d", version, *httpsport)
		err := http.ListenAndServeTLS(fmt.Sprintf("0.0.0.0:%d", *httpsport), *sslcrt, *sslkey, serveMux)
		if err != nil {
			log.Fatal(err)
		}
	} else {
		log.Printf("Starting Harmoware-VIS Provider %s  on port %d", version, *port)
		err := http.ListenAndServe(fmt.Sprintf("0.0.0.0:%d", *port), serveMux)
		if err != nil {
			log.Fatal(err)
		}
	}

	wg.Wait()

}
