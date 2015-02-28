#!/usr/bin/env node
"use strict";

module.exports = SignalServer;

function SignalServer(port_number) {
    this._port = port_number;
    this._id_counter = 0;
    this._connection_id = 1;

    this._network_count = 0;
    this._connection_ids = [ ];
    this._connections_to_network = { };
    this._open_requests = { };
}

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

SignalServer.prototype._onMessage = function(connectionId, ws, message) { 
    console.log(message.message_type);
    if (message.message_type === 'request') {
        console.log(connectionId + ' ' + this._connection_ids);
        if (Object.size(this._connections_to_network) == 0) {
            message.message_type = 'accept';
            message.requesting_node_id = connectionId;
            message.first = true;
            ws.send(JSON.stringify(message));

            this._connections_to_network[connectionId] = ws;
            this._connection_ids.push(connectionId);
        } else {
            this._open_requests[connectionId] = ws;
            message.message_type = 'request';
            message.requesting_node_id = connectionId;

            var last_node = this._connection_ids.slice(-1)[0];
            console.log("sending request to " + last_node);
            this._connections_to_network[last_node].send(JSON.stringify(message));
        }
    } else if (message.message_type === 'accept') {
        var rq = message.requesting_node_id;
        var request_con = this._open_requests[rq];
        if (request_con === 'undefined' || request_con === null) {
            //nothing here...
            console.log("BAD!");
        }

        delete this._open_requests[rq];
        message.message_type = 'accept';
        message.requesting_node_id = rq;
        message.accepting_node = connectionId;
        message.first = false;

        this._connections_to_network[rq] = request_con;
        this._connection_ids.push(rq);

        request_con.send(JSON.stringify(message));
    } else if (message.message_type === 'heartbeat') {
        this._network_count = message.node_count;
    }
}


SignalServer.prototype.startServer = function() {
    var WebSocketServer = require('ws').Server
    this._server = new WebSocketServer({ port: this._port });
    this._server.on('connection', function(ws) {
        var my_connection_id = this._connection_id ++;

        ws.on('message', function(message) {
            this._onMessage(my_connection_id, ws, JSON.parse(message));
        }.bind(this));

        //garbage cleanup, close connection if not doing anything.
        var timeout = setTimeout(function() {
            if (!(my_connection_id in this._connections_to_network)) {
                ws.close();
            }
            delete this._open_requests[my_connection_id];
        }.bind(this), 5000);

        ws.on('close', function(message) {
            delete this._connections_to_network[my_connection_id];
            delete this._open_requests[my_connection_id];
            var index = this._connection_ids.indexOf(my_connection_id);
            if (index > -1)
                this._connection_ids.splice(index, 1);

            clearTimeout(timeout);
        }.bind(this));

    }.bind(this));
};

var server = new SignalServer(8080);
server.startServer();