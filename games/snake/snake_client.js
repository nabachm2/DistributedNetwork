"use strict";


var CELL_SIZE = 6;
var BOARD_WIDTH = 0;
var BOARD_HEIGHT = 0;

function Snake(web_server_url, front_canvas) {
	this._client = new RDBCentralNode(web_server_url);
	this._client.onupdate = function (update) {
		if (typeof update.states.server !== 'undefined')
			this._redrawBackground(); 

		this._redraw();
	}.bind(this);

	this._frontCanvas = front_canvas;
	this._backCanvas = document.createElement('canvas');
}

Snake.prototype.startClient = function() {
	this._client.enterNetwork(function() { 
		var ss = this._client.states.server;
		BOARD_WIDTH = ss.size.width * CELL_SIZE; BOARD_HEIGHT = ss.size.height * CELL_SIZE;
		var cpw = BOARD_WIDTH / CELL_SIZE + 1; var cph = BOARD_HEIGHT / CELL_SIZE + 1;
		this._frontCanvas.width = BOARD_WIDTH + cpw; this._frontCanvas.height = BOARD_HEIGHT + cph;
		this._backCanvas.width = BOARD_WIDTH + cpw; this._backCanvas.height = BOARD_HEIGHT + cph;
		this._redrawBackground(); 
		this._redraw();
	}.bind(this));
};

Snake.prototype.setDirection = function(dxval, dyval) {
	this._client.updateState({dx: dxval, dy: dyval})
};

Snake.prototype._redrawBackground = function() {
	var ctx = this._backCanvas.getContext("2d");

	ctx.fillStyle="#000000";
	ctx.fillRect(0, 0, this._backCanvas.width, this._backCanvas.height);

	ctx.fillStyle="#FFFFFF";
	for (var wall_id in this._client.states['server']['walls']) {
		var wall = this._client.states['server']['walls'][wall_id];
		var x = wall.sx; var y = wall.sy;
		for (var count = 0;count < wall.count;count ++) {
			ctx.fillRect(x * (CELL_SIZE + 1) + 1, y * (CELL_SIZE + 1) + 1, CELL_SIZE, CELL_SIZE);
			x += wall.dx; y += wall.dy;
		}
	}

	ctx.strokeStyle="#505050";
	var cpw = BOARD_WIDTH / CELL_SIZE + 1;
	var cph = BOARD_HEIGHT / CELL_SIZE + 1;
	ctx.beginPath();
	for (var i = 0;i <= BOARD_WIDTH + cpw;i += CELL_SIZE + 1) {
		ctx.moveTo(i + 0.5, 0.5); ctx.lineTo(i + 0.5, BOARD_HEIGHT + cph + 0.5);
	}
	for (var i = 0;i <= BOARD_HEIGHT + cph;i += CELL_SIZE + 1) {
		ctx.moveTo(0.5, i + 0.5); ctx.lineTo(BOARD_WIDTH + cpw + 0.5, i + 0.5);
	}
	ctx.stroke();
}

Snake.prototype._redraw = function() {
	var ctx = this._frontCanvas.getContext("2d");

	ctx.fillStyle="#FFFFFF";
	ctx.fillRect(0, 0, this._frontCanvas.width, this._frontCanvas.height);
	ctx.drawImage(this._backCanvas, 0, 0);

	for (var node_id in this._client.states) {
		if (node_id === 'server') {
			ctx.fillStyle = '#FFD800'
			var pos = this._client.states[node_id]['-1'];
			ctx.fillRect(pos.x * (CELL_SIZE + 1) + 1, pos.y * (CELL_SIZE + 1) + 1, CELL_SIZE, CELL_SIZE);
			continue;
		}

		var state = this._client.states[node_id];
		ctx.fillStyle = state.color;
		for (var i = state.start;i >= state.end;i --) {
			var pos = state[i];
			ctx.fillRect(pos.x * (CELL_SIZE + 1) + 1, pos.y * (CELL_SIZE + 1) + 1, CELL_SIZE, CELL_SIZE);
		}
	}
}