"use strict";

function RDBCentralNode(web_server_url) {
	this._serverConnection = new RDBClientConnection(web_server_url);
	this._serverConnection.onupdate = function(data) { this._handleServerUpdate(data) }.bind(this);
	this._revision = 0;
	this._nodeId = -1;

	this.states = { }; //states from server (including my own) 
	this._myState = { }; 
}

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
}

RDBCentralNode.prototype.getNewRevision = function() {
	this._revision ++;
	return this._revision;
}

RDBCentralNode.prototype._handleServerUpdate = function(data) {
	for (var id in data.states) {
        if (data.states.hasOwnProperty(id)) {
        	if (typeof this.states[id] === 'undefined') {
        		this.states[id] = data.states[id]['u'];
        	} else  {
        		for (var attrib in data.states[id]['u'])
        			this.states[id][attrib] = data.states[id]['u'][attrib];

        		for (var attrib in data.states[id]['d'])
        			delete this.states[id][attrib];

        		if (Object.size(this.states[id]) == 0)
       				delete this.states[id];
        	}
        }
    }
    this.onupdate(data);
}

RDBCentralNode.prototype.updateState = function(state_data) {
	this._myState = state_data;
	this._serverConnection.sendServerData({ message_type: 'update', 
		revision: this.getNewRevision(), data: this._myState });
}

RDBCentralNode.prototype.enterNetwork = function(callback) {
	var timeout = setTimeout(function () { 
		alert('connection timeout exceeded');
	}, 5000);

	this._serverConnection.onaccept = function(data) { 
		this._nodeId = data.node_id;
		this.states = data.states;
		clearTimeout(timeout);
		callback();
	}.bind(this);
	this._serverConnection.createServerConnection();
	this._serverConnection.sendServerData({ message_type: 'request' });
};