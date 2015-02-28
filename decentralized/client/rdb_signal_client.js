"use strict";

function SignalClient(server_address) {
	this._serverAddress = server_address;
	this._serverState = 'uninit';
	this._queuedData = [];
	this.nonaccept = {};
}

SignalClient.prototype._handleServerMessage = function(data) {
	console.log(data);
	if (data.message_type === 'request') {
		this.onrequest(data);
	} else if (data.message_type === 'accept') {
		this.onaccept(data);
	} else if (data.message_type === 'nonaccept') {
		this.nonaccept[data.node_id]();
	}
};

SignalClient.prototype.addServerAcceptCallback = function(callback) {
	console.assert(typeof this.onaccept === 'undefined', 'There is already an accept callback registered, how did this happen?');
	this.onaccept = callback;
};

SignalClient.prototype.addServerPostAcceptCallback = function(id, callback) {
	this.onpostaccept[id] = callback;
};

SignalClient.prototype.clearCallbacks = function(id) {
	delete this.onaccept;
	delete this.nonaccept[id];
};

SignalClient.prototype.createServerConnection = function() {
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

SignalClient.prototype.sendServerData = function(data) {
	if (this._serverState === 'open') {
		this._serverConnection.send(JSON.stringify(data));
	} else {
		this._queuedData.push(data);
		this.createServerConnection();
	}
};