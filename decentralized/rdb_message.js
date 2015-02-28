"use strict";

var MESSAGE_HEADER_SIZE = 4 + 4 + 4 + 4 + 4 + 4;

var TYPE_ID_IDX = 0;
var TYPE_TTL_IDX = 1;
var TYPE_RECEIVING_NODE_IDX = 2; 
var TYPE_CONTENT_TYPE_IDX = 3;
var TYPE_CONTENT_INDX = 4;

var NODE_REMOVED = [0, 10, 0, 'dict', {node_lost : 0}];
var EVICT_NODE = [1, 10, 0, 'dict', {node_lost : 0 }];
var MSG_REQUEST_I_CONNECTION = [2, 10, 1, 'arr', { } ];
var MSG_ACCEPT_I_CONNECTION = [3, 10, 1, 'arr', {}];

var TYPE_TO_MSG_OBJ = {0: NODE_REMOVED, 1: EVICT_NODE, 
				2: MSG_REQUEST_I_CONNECTION, 3: MSG_ACCEPT_I_CONNECTION};

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

function Message(header, original_stream) {
	this.header = header;
	this.stream = original_stream;
}

Message.parseMessage = function(byte_stream) {
	var header = { }; 
	var int_view = new Int32Array(byte_stream, 0, 6);
	header.msg_type = int_view[0];
	header.ttl = int_view[1];
	header.sender_node = int_view[2];
	header.message_id = int_view[3];
	header.receiving_node = int_view[4];
	header.payload_length = int_view[5];
	return new Message(header, byte_stream);
}

Message.createByteStreamFromString = function(msg) {
	return new TextEncoder('utf-8').encode(msg);
}

Message.createStringFromByteStream = function(byte_string) {
	return new TextDecoder('utf-8').decode(byte_string);
}

Message.createMessageStream = function(node, type, dict_args, arr_args) {
	var hasArrArg = type[TYPE_CONTENT_TYPE_IDX].indexOf('arr') > -1;
	var hasDictArg = type[TYPE_CONTENT_TYPE_IDX].indexOf('dict') > -1;
	var arr_length = (hasArrArg ? arr_args.length : 0);
	var dict_length = (hasDictArg ? Object.size(type[TYPE_CONTENT_INDX]) * 4 : 0);
	
	var buffer = new ArrayBuffer(arr_length + dict_length + MESSAGE_HEADER_SIZE);
	var h_int_view = new Int32Array(buffer, 0, 6); 

	h_int_view[0] = type[TYPE_ID_IDX];
	h_int_view[1] = type[TYPE_TTL_IDX];
	h_int_view[2] = node._nodeId;
	h_int_view[3] = node.getNewMessageID();
	h_int_view[4] = (type[TYPE_RECEIVING_NODE_IDX] == 0) ? 0 : dict_args['receiving_node'];
	h_int_view[5] = arr_length + dict_length;
	for (var key in type[TYPE_CONTENT_INDX]) 
 		if (type[TYPE_CONTENT_INDX].hasOwnProperty(key)) 
   			h_int_view[6 + type[TYPE_CONTENT_INDX][key]] = dict_args[key];
   	
   	//copy array
   	if (hasArrArg) 
   		 new Uint8Array(buffer, MESSAGE_HEADER_SIZE + dict_length).set(new Uint8Array(arr_args));

  	return buffer;
};

Message.createMessage = function(node, type, dict_args, arr_args) {
	return Message.parseMessage(Message.createMessageStream(node, type, dict_args, arr_args));
}

Message.prototype.extractPayload = function() {
	if (typeof this._arrPayload !== 'undefined' || typeof this._dictPayload != 'undefined')
		return;

	var msg_type_obj = TYPE_TO_MSG_OBJ[this.header.msg_type];
	var length = this.header.payload_length;

	this._dictPayload = {};
	var int_view = new Int32Array(this.stream, MESSAGE_HEADER_SIZE, length / 4);
	for (var key in msg_type_obj[TYPE_CONTENT_INDX]) 
 		if (type[TYPE_CONTENT_INDX].hasOwnProperty(key)) 
   			this._dictPayload[key] = int_view[msg_type_obj[TYPE_CONTENT_INDX][key]];

   	this._arrPayload = new Uint8Array(this.stream, MESSAGE_HEADER_SIZE + Object.size(this._dictPayload) * 4,
   												length - Object.size(this._dictPayload) * 4);
}

Message.prototype.extractArrayString = function() {
	this.extractPayload();
	return Message.createStringFromByteStream(this._arrPayload);
};

Message.prototype.decreaseTTL = function() {
	this.header.ttl --;
	var h_int_view = new Int32Array(this.stream, 0, 6); 
	h_int_view[1] = this.header.ttl;
};
