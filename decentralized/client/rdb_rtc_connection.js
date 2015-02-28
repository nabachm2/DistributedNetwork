"use strict";

var PeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
var IceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;
var SessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;

var isChrome = !!navigator.webkitGetUserMedia;
var STUN = {
    url: isChrome 
       ? 'stun:stun.l.google.com:19302' 
       : 'stun:23.21.150.121'
};

var iceServers = {
   iceServers: [STUN]
};

function RTCConnection(args) {
	this._peerState = ('server_signal' in args) ? 'uninit_server' : 'uninit_client';
	if ('server_signal' in args) {
		this._signalClient = args.server_signal;
	} else {
		this._nodeObj = args.node_obj;
		this._requestedId = args.requested_id;
	}
}

RTCConnection.prototype._createChannelCallbacks = function() {
    this._dataChannel.onopen = function () {
    	this._peerState = 'connected';
    	if (typeof this._messageHandlerHolder !== 'undefined') {
    		this._dataChannel.onmessage = this._messageHandlerHolder;
    		delete this._messageHandlerHolder;
    	}
    }.bind(this);
    this._dataChannel.onclose = function (e) {
        console.error(e);
    }.bind(this);
    this._dataChannel.onerror = function (e) {
        console.error(e);
    }.bind(this);
};

RTCConnection.prototype._createOffer = function(send_funct, accept_trigger, accept_callback) {
	this._peerState = 'connecting';

	accept_trigger(function(data) { 
		this._peerState = 'awaiting channel open'; //still need send postaccept
		if (typeof data.answer !== 'undefined') {
			this._peerConnection.addIceCandidate(new IceCandidate({
	            'sdpMLineIndex': data.candidate.sdpMLineIndex,
	            'candidate' : data.candidate.candidate
			}));
			this._peerConnection.setRemoteDescription(new SessionDescription(data.answer));
		}

		accept_callback(data);
	}.bind(this));

	this._peerConnection = new PeerConnection(iceServers);
	this._dataChannel = this._peerConnection.createDataChannel('RTCDataChannel', {});
	this._createChannelCallbacks();

	this._peerConnection.createOffer(function (sessionDescription) {
		this._peerState = 'awaiting accept';
	    this._peerConnection.setLocalDescription(sessionDescription);
	    this._peerConnection.onicecandidate = function(e) {
		    if(e.candidate !== null) {
		        send_funct({ requesting_node_id: -1, message_type: 'request', request_type : 'rtc', 
	    			offer: this._peerConnection.localDescription, candidate: e.candidate } );
		    }
		    this._peerConnection.onicecandidate = null;
		}.bind(this);
	}.bind(this), function(error) {
	    alert(error);
	}, {
		optional: [], mandatory: { OfferToReceiveAudio: false,  OfferToReceiveVideo: false }
	});
}

RTCConnection.prototype._createAccept = function(offer_data, accepting_node_id, send_funct, channel_opened_callback) {
	var request_node_id = offer_data.requesting_node_id;

	this._peerState = 'creating answer';
	this._peerConnection = new PeerConnection(iceServers);
	this._peerConnection.ondatachannel = function (e) {
		this._dataChannel = e.channel;
    	this._createChannelCallbacks();
    	channel_opened_callback();
	}.bind(this);

	this._peerConnection.setRemoteDescription(new SessionDescription(offer_data.offer));
	this._peerConnection.addIceCandidate(new IceCandidate({
            'sdpMLineIndex': offer_data.candidate.sdpMLineIndex,
            'candidate' : offer_data.candidate.candidate
    }));

	this._peerConnection.createAnswer(function (sessionDescription) {
		this._peerState = 'awaiting postaccept';
		this._peerConnection.setLocalDescription(sessionDescription);
		this._peerConnection.onicecandidate = function(e) {
			if(e.candidate !== null) {	
				send_funct({'message_type': 'accept', 'requesting_node_id' : request_node_id, 
								 'answer': this._peerConnection.localDescription, 'candidate' : e.candidate, 
								 'accepting_node_id': accepting_node_id});
			}
			this._peerConnection.onicecandidate = null;
		}.bind(this);
	}.bind(this), function(error) {
		alert(error);
	}, {
    	optional: [], mandatory: { OfferToReceiveAudio: false,  OfferToReceiveVideo: false }
	});	
};

RTCConnection.prototype.acceptRequest = function(offer_data, accepting_node_id, channel_opened_callback) {
	if (this._peerState === 'uninit_server') {
		this._createAccept(offer_data, accepting_node_id, function(msg) {
			this._signalClient.sendServerData(msg);
		}.bind(this), channel_opened_callback);
	} else if (this._peerState === 'uninit_client') {
		this._createAccept(offer_data, accepting_node_id, function(msg) {
			var byte_stream = Message.createByteStreamFromString(JSON.stringify(msg));
			var msg_obj = Message.createMessage(this._nodeObj, MSG_ACCEPT_I_CONNECTION, 
				{receiving_node: this._requestedId}, byte_stream);
			this._nodeObj.sendMessage(msg_obj);
		}.bind(this), channel_opened_callback);
	}
}

RTCConnection.prototype.requestConnection = function(accept_callback) {
	console.log(this._peerState);
	if (this._peerState === 'uninit_server') {
		this._createOffer(function(msg) {
			this._signalClient.sendServerData(msg);
		}.bind(this), function(funct) {
			this._signalClient.addServerAcceptCallback(funct);
		}.bind(this), accept_callback);
	} else if (this._peerState === 'uninit_client') {
		this._createOffer(function(msg) {
			var byte_stream = Message.createByteStreamFromString(JSON.stringify(msg));
			var msg_obj = Message.createMessage(this._nodeObj, MSG_REQUEST_I_CONNECTION, 
				{receiving_node: this._requestedId}, byte_stream);
			this._nodeObj.sendMessage(msg_obj);
		}.bind(this), function(funct) {
			this._nodeObj.addMessageHandler(function(msg) {
				console.log('hey there');
				var data = JSON.parse(msg.extractArrayString());
				funct(data);
			},  MSG_ACCEPT_I_CONNECTION[TYPE_ID_IDX], this._requestedId, 1);
		}.bind(this), accept_callback);
	}
};

RTCConnection.prototype.attachMessageListener = function(funct) {
	if (typeof this._dataChannel !== 'undefined') {
		this._dataChannel.onmessage = funct;
	} else {
		this._messageHandlerHolder = funct;
	}
}

RTCConnection.prototype.sendMessage = function(msg) {
	if (this._peerState === 'connected') {
		this._dataChannel.send(msg);
	}
};