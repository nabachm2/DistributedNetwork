#!/usr/bin/env node
"use strict";

module.exports = RDBCentralServer;

function RDBCentralServer(port_number, server_state) {
    this._port = port_number;
    this._connection_id = 1;

    this._dirty_states = { };
    this.states = { 'server' : server_state };

    this._connections_to_network = { };
}

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size ++;
    }
    return size;
};

RDBCentralServer.prototype._onMessage = function(connectionId, ws, message) { 
    if (message.message_type === 'request') {
        var initial_state = this.onrequest(message.name);
        if (initial_state !== 'none') {
            this._connections_to_network[connectionId] = ws;
            this.states[connectionId] = initial_state;
            this.states[connectionId].revision = 0;
            this._dirty_states[connectionId] = { u: initial_state };

            var senddata = { message_type: 'accept', node_id: connectionId, states: this.states };
            ws.send(JSON.stringify(senddata));
        }
    } else if (message.message_type === 'update') {
        if (typeof this.states[connectionId] === 'undefined')
            return;

        if (message.revision > this.states[connectionId].revision) {
            if (typeof this.verifyupdate !== 'undefined')
                if (!this.verifyupdate(message.data, this.states[connectionId].client_data, connectionId)) 
                    return;

            this.states[connectionId].revision = message.revision;
            this.states[connectionId].client_data = message.data;
            this.onupdate(connectionId, message.data);
        }
    }
}

RDBCentralServer.prototype.updateState = function(connectionId, state_change) {
    if (typeof this._dirty_states[connectionId] === 'undefined')
        this._dirty_states[connectionId] = { d : {}, u : {} };
    if (typeof this._dirty_states[connectionId].u === 'undefined')
        this._dirty_states[connectionId].u = { };
    if (typeof this._dirty_states[connectionId].d === 'undefined')
        this._dirty_states[connectionId].d = { };

    for (var attrib in state_change['u']) {
        this.states[connectionId][attrib] = state_change['u'][attrib];
        this._dirty_states[connectionId]['u'][attrib] = state_change['u'][attrib];
    }

    for (var attrib in state_change['d']) {
        delete this.states[connectionId][attrib];
        delete this._dirty_states[connectionId]['u'][attrib];
        this._dirty_states[connectionId]['d'][attrib] = false;
    }

    if (Object.size(this.states[connectionId]) == 0) 
        delete this.states[connectionId];
}

RDBCentralServer.prototype.purgeState = function(id) {
    var update = { 'd': this.states[id] }
    this.updateState(id, update);
}

RDBCentralServer.prototype.pushUpdate = function() {
    if (Object.size(this._dirty_states) == 0) return;

    for (var key in this._connections_to_network) {
        if (this._connections_to_network.hasOwnProperty(key) && key !== 'server') {
            this._connections_to_network[key].send(JSON.stringify({ message_type: 'update', states: this._dirty_states }));
        }
    }
    this._dirty_states = { };
}


RDBCentralServer.prototype.startServer = function() {
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
        }.bind(this), 5000);

        ws.on('close', function(message) {
            console.log("CLOSING");
            this.onclose(my_connection_id);
            this._dirty_states[my_connection_id] = { u: {}, d: {} };
            this._dirty_states[my_connection_id]['d'] = this.states[my_connection_id];

            delete this._connections_to_network[my_connection_id];
            delete this.states[my_connection_id];

            clearTimeout(timeout);
        }.bind(this));

    }.bind(this));
};