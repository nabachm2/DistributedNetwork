"use strict";

function RDBNode(web_server_url) {
	this._signalClient = new SignalClient(web_server_url);
	this._signalClient.onrequest = function(data) { this._handleRequestFromServer(data) }.bind(this);
	this._signalClient.onadd = function(data) { this._handleAddedNode(data) }.bind(this);
	this._signalClient.onremove = function(data) { this._handleRemoveNode(data) }.bind(this);

	this._messageListeners = { };

	//_states = { nodeId = { revision: num, data: {} }};
	this._states = { };
	this._peersConnections = { };
	this._nodeId = -1;
}

RDBNode.prototype._handleRequestFromServer = function(offer_data) {
	if (offer_data.request_type === 'rtc') {
		var peerClient = new RTCConnection({ server_signal: this._signalClient });
		peerClient.acceptRequest(offer_data, this._nodeId, function() {
			this._peersConnections[offer_data.requesting_node_id] = peerClient 
		}.bind(this));
		peerClient.attachMessageListener(function(data) { this._handleMessage(data); }.bind(this));
	}
}

RDBNode.prototype._handleRequestFromClient = function(msg) {
	var offer_data = JSON.parse(msg.extractArrayString());
	if (offer_data.request_type === 'rtc') {
		var peerClient = new RTCConnection({ node_obj: this, requested_id: msg.header.sender_node });
		peerClient.acceptRequest(offer_data, this._nodeId, function() { 
			this._peersConnections[msg.header.sender_node] = peerClient;
		}.bind(this));
		peerClient.attachMessageListener(function(data) { this._handleMessage(data); }.bind(this));
	}
}

RDBNode.prototype.getNewMessageID = function() {
	return -1;
}

RDBNode.prototype.updateState = function(state_data) {

}

RDBNode.prototype.requestConnection = function(node_id) {
	var peerClient = new RTCConnection({ node_obj: this, requested_id: node_id });
	peerClient.requestConnection(function(data) { 
		peerClient.attachMessageListener(function(data) { this._handleMessage(data); }.bind(this));
		this._peersConnections[node_id] = peerClient;

		console.log("Established extra connection to " + node_id);
	}.bind(this));
}

RDBNode.prototype.enterNetwork = function() {
	var timeout = setTimeout(function () { 
		alert('connection timeout exceeded');
	}, 5000);

	var peerClient = new RTCConnection({server_signal: this._signalClient});
	peerClient.requestConnection(function(data) { 
		peerClient.attachMessageListener(function(data) { this._handleMessage(data); }.bind(this));

		this._nodeId = data.requesting_node_id;
		this._states.push(this._nodeId);
		if (!data.first) {
			this._peersConnections[data.accepting_node_id] = peerClient;
			console.log(data);
		}

		if (this._nodeId == 3) {
			setTimeout(function() {
				console.log('sending request');
				this.requestConnection(1);
			}.bind(this), 2000);
		}

		console.log("GOT IT");
		clearTimeout(timeout);
	}.bind(this));
};

RDBNode.prototype._handleMessage = function(data) {
	var parsed_msg = Message.parseMessage(data.data);
	console.log(parsed_msg.header);
	var intended = parsed_msg.header.receiving_node;
	var sender = parsed_msg.header.sender_node;
	var msg_type = parsed_msg.header.msg_type;
	if (intended == this._nodeId || intended == 0) {
		if (msg_type == MSG_REQUEST_I_CONNECTION[TYPE_ID_IDX]) 
			this._handleRequestFromClient(parsed_msg);

		var handlers = this._messageListeners[msg_type + ',' + sender];
		if (typeof handlers !== 'undefined') {
			for(var i = handlers.length - 1; i >= 0 ; i --) {
				handlers[i].count --;
				handlers[i].funct(parsed_msg);

			    if(handlers[i].count == 0) 
			        elements.splice(i, 1);
			}
			if (handlers.length == 0) 
				delete this._messageListeners[msg_type + ',' + sender];
		}
	} 

	parsed_msg.decreaseTTL();
	if ((intended != this._nodeId || intended == 0) && parsed_msg.header.ttl > 0) {
		this.sendMessage(parsed_msg);
	}
};

RDBNode.prototype.addMessageHandler = function(funct, msg_type, sender_id, count) {
	if (typeof this._messageListeners[msg_type + ',' + sender_id] === 'undefined')
		this._messageListeners[msg_type + ',' + sender_id] = [];

	this._messageListeners[msg_type + ',' + sender_id].push({ 'count': count, 'funct': funct});
};

RDBNode.prototype.sendMessage = function(msg_obj) {
	var intented = msg_obj.header.receiving_node;
	var sending = (intented < this._nodeId) ? this._nodeId - 1 : this._nodeId + 1;
	this._peersConnections[sending].sendMessage(msg_obj.stream);
}