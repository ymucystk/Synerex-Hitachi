module harmovis

go 1.13

replace github.com/synerex/proto_alt_pt => ./proto/alt_pt

replace github.com/smart_dispatch/delivery_planning/proto => ./proto/delivery_planning

replace github.com/smart_dispatch/evfleet/proto => ./proto/evfleet

replace github.com/smart_dispatch/dispatch/proto => ./proto/dispatch

require (
	github.com/golang/protobuf v1.5.2
	github.com/gomodule/redigo v1.8.5 // indirect
	github.com/googollee/go-socket.io v1.6.0
	github.com/gorilla/websocket v1.4.2 // indirect
	github.com/mtfelian/golang-socketio v1.5.2
	github.com/shirou/gopsutil v3.21.5+incompatible // indirect
	github.com/shirou/gopsutil/v3 v3.21.5 // indirect
	github.com/sirupsen/logrus v1.6.0 // indirect
	github.com/smart_dispatch/delivery_planning/proto v0.0.0-00010101000000-000000000000
	github.com/smart_dispatch/dispatch/proto v0.0.0-00010101000000-000000000000
	github.com/smart_dispatch/evfleet/proto v0.0.0-00010101000000-000000000000
	github.com/synerex/proto_alt_pt v0.0.0-00010101000000-000000000000
	github.com/synerex/proto_fleet v0.1.0
	github.com/synerex/proto_geography v0.5.2
	github.com/synerex/proto_people_agent v0.0.1
	github.com/synerex/proto_ptransit v0.0.6
	github.com/synerex/synerex_api v0.4.3
	github.com/synerex/synerex_proto v0.1.12
	github.com/synerex/synerex_sxutil v0.6.7
	golang.org/x/lint v0.0.0-20210508222113-6edffad5e616 // indirect
	golang.org/x/net v0.0.0-20210614182718-04defd469f4e // indirect
	golang.org/x/sys v0.0.0-20210615035016-665e8c7367d1 // indirect
	golang.org/x/tools v0.1.3 // indirect
)
