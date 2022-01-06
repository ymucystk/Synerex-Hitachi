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

	"github.com/golang/protobuf/proto"
	gosocketio "github.com/mtfelian/golang-socketio"
	delivery_planning "github.com/smart_dispatch/delivery_planning/proto"
	dispatch "github.com/smart_dispatch/dispatch/proto"
	evfleet "github.com/smart_dispatch/evfleet/proto"
	proto_alt_pt "github.com/synerex/proto_alt_pt"
	synerexapi "github.com/synerex/synerex_api"
	pbase "github.com/synerex/synerex_proto"
	synerexsxutil "github.com/synerex/synerex_sxutil"
)

// Harmoware Vis-Synerex wiht Layer extension provider provides map information to Web Service through socket.io.

var (
	nodesrv         = flag.String("nodesrv", "127.0.0.1:9990", "Node ID Server")
	assetDir        = flag.String("assetdir", "", "set Web client dir")
	mapbox          = flag.String("mapbox", "", "Set Mapbox access token")
	port            = flag.Int("port", 3030, "HarmoVis Ext Provider Listening Port")
	mu              = new(sync.Mutex)
	version         = "0.00"
	assetsDir       http.FileSystem
	ioserv          *gosocketio.Server
	sxServerAddress string
	mapboxToken     string
	channelAlt      = flag.Int("channelAlt", int(pbase.ALT_PT_SVC), "channelAlt")
	channelEvfleet  = flag.Int("channelEvfleet", 30, "channelEvfleet")
	channelDp       = flag.Int("channelDp", 31, "channelDp")
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
		log.Printf("Use reconnected server\n", sxServerAddress)
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
		evfleet := &evfleet.EvFleetSupply{}
		err := proto.Unmarshal(sp.Cdata.Entity, evfleet)
		if err == nil {
			jsonBytes, _ := json.Marshal(evfleet)
			log.Printf("EvFleetSupply: %v", string(jsonBytes))
			mu.Lock()
			ioserv.BroadcastToAll("evfleetsupply", string(jsonBytes))
			mu.Unlock()
		} else {
			log.Printf("proto.Unmarshal() failed: %s", err)
		}
	case "VehicleList":
		evfleet := &evfleet.VehicleList{}
		err := proto.Unmarshal(sp.Cdata.Entity, evfleet)
		if err == nil {
			jsonBytes, _ := json.Marshal(evfleet)
			log.Printf("VehicleList: %v", string(jsonBytes))
			mu.Lock()
			ioserv.BroadcastToAll("vehiclelist", string(jsonBytes))
			mu.Unlock()
		} else {
			log.Printf("proto.Unmarshal() failed: %s", err)
		}
	case "EvFleetResponse":
		evfleet := &evfleet.EvFleetResponse{}
		err := proto.Unmarshal(sp.Cdata.Entity, evfleet)
		if err == nil {
			jsonBytes, _ := json.Marshal(evfleet)
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
		dispatch := &dispatch.DeliveryPlanningProvide{}
		err := proto.Unmarshal(sp.Cdata.Entity, dispatch)
		if err == nil {
			jsonBytes, _ := json.Marshal(dispatch)
			log.Printf("DeliveryPlanningProvide: %v", string(jsonBytes))
			mu.Lock()
			ioserv.BroadcastToAll("deliveryplanningprovide", string(jsonBytes))
			mu.Unlock()
		} else {
			log.Printf("proto.Unmarshal() failed: %s", err)
		}
	case "DispatchResponse":
		dispatch := &dispatch.DispatchResponse{}
		err := proto.Unmarshal(sp.Cdata.Entity, dispatch)
		if err == nil {
			jsonBytes, _ := json.Marshal(dispatch)
			log.Printf("DispatchResponse: %v", string(jsonBytes))
			mu.Lock()
			ioserv.BroadcastToAll("dispdispatchresponse", string(jsonBytes))
			mu.Unlock()
		} else {
			log.Printf("proto.Unmarshal() failed: %s", err)
		}
	case "DeliveryPlanningRequest":
		delivery_planning := &delivery_planning.DeliveryPlanningRequest{}
		err := proto.Unmarshal(sp.Cdata.Entity, delivery_planning)
		if err == nil {
			jsonBytes, _ := json.Marshal(delivery_planning)
			log.Printf("DeliveryPlanningRequest: %v", string(jsonBytes))
			mu.Lock()
			ioserv.BroadcastToAll("deliveryplanningrequest", string(jsonBytes))
			mu.Unlock()
		} else {
			log.Printf("proto.Unmarshal() failed: %s", err)
		}
	case "DeliveryPlanAdoption":
		delivery_planning := &delivery_planning.DeliveryPlanAdoption{}
		err := proto.Unmarshal(sp.Cdata.Entity, delivery_planning)
		if err == nil {
			jsonBytes, _ := json.Marshal(delivery_planning)
			log.Printf("DeliveryPlanAdoption: %v", string(jsonBytes))
			mu.Lock()
			ioserv.BroadcastToAll("deliveryplanadoption", string(jsonBytes))
			mu.Unlock()
		} else {
			log.Printf("proto.Unmarshal() failed: %s", err)
		}
	case "DeliveryPlanningResponse":
		delivery_planning := &delivery_planning.DeliveryPlanningResponse{}
		err := proto.Unmarshal(sp.Cdata.Entity, delivery_planning)
		if err == nil {
			jsonBytes, _ := json.Marshal(delivery_planning)
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

func monitorStatus() {
	for {
		synerexsxutil.SetNodeStatus(int32(runtime.NumGoroutine()), "HV")
		time.Sleep(time.Second * 3)
	}
}

func main() {
	name := "HarmoVis"
	flag.Parse()

	channelAlt := uint32(*channelAlt)
	channelEvfleet := uint32(*channelEvfleet)
	channelDp := uint32(*channelDp)

	channelTypes := []uint32{channelAlt, channelEvfleet, channelDp} //チャンネルは借値
	var rerr error
	sxServerAddress, rerr = synerexsxutil.RegisterNode(*nodesrv, name, channelTypes, nil)
	if rerr != nil {
		log.Fatal("Can't register node ", rerr)
	}
	log.Printf("Connectin SynerexServer at [%s]\n", sxServerAddress)

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

	alt_client := synerexsxutil.NewSXServiceClient(client, channelAlt, name)
	evfleet_client := synerexsxutil.NewSXServiceClient(client, channelEvfleet, name) //チャンネルは借値
	dp_client := synerexsxutil.NewSXServiceClient(client, channelDp, name)           //チャンネルは借値

	wg.Add(1)

	go subscribeAltSupply(alt_client)
	go subscribeEvfleetSupply(evfleet_client)
	go subscribeDpSupply(dp_client)

	go monitorStatus() // keep status

	serveMux := http.NewServeMux()

	serveMux.Handle("/socket.io/", ioserv)
	serveMux.HandleFunc("/", assetsFileHandler)

	log.Printf("Starting Harmoware-VIS Provider %s  on port %d", version, *port)
	err := http.ListenAndServe(fmt.Sprintf("0.0.0.0:%d", *port), serveMux)
	if err != nil {
		log.Fatal(err)
	}

	wg.Wait()

}
