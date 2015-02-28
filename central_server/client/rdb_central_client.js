"use strict";

function RDBClientConnection(server_address) {
	this._serverAddress = server_address;
	this._serverState = 'uninit';
	this._queuedData = [];
}

RDBClientConnection.prototype._handleServerMessage = function(data) {
	if (data.message_type === 'accept') {
		this.onaccept(data);
	} else if (data.message_type === 'update') {
		this.onupdate(data);
	}
};

RDBClientConnection.prototype.createServerConnection = function() {
	if (this._serverState === 'connecting') { return; }

	this._serverState = 'connecting';
	this._serverConnection = new WebSocket(this._serverAddress, 'echo-protocol');

    this._serverConnection.onopen = function (event) {
    	this._serverState = 'open';
    	for (var data in this._queuedData) {
    		this.sendServerData(this._queuedData[data]);
    	}
    	this._queuedData = [];
    }.bind(this);

    this._serverConnection.onmessage = function (msg) {
  		this._handleServerMessage(JSON.parse(msg.data));
	}.bind(this);

	this._serverConnection.onclose = function (event) {
		this._serverState = 'closed';
	}.bind(this);
}

RDBClientConnection.prototype.sendServerData = function(data) {
	if (this._serverState === 'open') {
		this._serverConnection.send(JSON.stringify(data));
	} else {
		this._queuedData.push(data);
		this.createServerConnection();
	}
};