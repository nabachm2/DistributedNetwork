"use strict";


var TankMesh = null;
var GroundMesh = null;

function createGroundMesh(that) {
	var geometry = new THREE.PlaneGeometry( 500, 500, 1, 1 );
	var texture = THREE.ImageUtils.loadTexture('DistributedNetwork/games/tanks/texture/GroundTex.png');
	texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
texture.magFilter = THREE.NearestFilter;
texture.repeat.set( 1, 1 );
	var material = new THREE.MeshBasicMaterial({map: texture}),
	GroundMesh = new THREE.Mesh( geometry, material );
	that._scene.add(GroundMesh);
}

function createTankMesh(that) {
	var loader = new THREE.OBJLoader();
	loader.load(
		// resource URL
		'DistributedNetwork/games/tanks/models/tank.obj',
		// Function when resource is loaded
		function ( object ) {
			TankMesh = object;
			object.traverse( function ( child ) {
				if ( child instanceof THREE.Mesh ) {
					child.material = new THREE.MeshBasicMaterial( { color: 0xff0000} );

				}
			} );

			console.log(object);
			//that._scene.add(object);
		}
	);
}

function Tank(web_server_url, width, height) {
	this._client = new RDBCentralNode(web_server_url);
	this._client.onupdate = function (update) { }.bind(this);

	this._width = width;
	this._height = height;


	this._scene = new THREE.Scene();
	this._camera = new THREE.PerspectiveCamera( 75, width / height, 1, 100000);
	this._camera.position.z = 1000;

	this._renderer = new THREE.WebGLRenderer();
    this._renderer.setSize( width, height );
	document.body.appendChild( this._renderer.domElement );
	createTankMesh(this);
	createGroundMesh(this);
	this.animateScene();
}

Tank.prototype.startClient = function() {
	this._client.enterNetwork(function() { 
		var ss = this._client.states.server;

	}.bind(this));
};

Tank.prototype.setDirection = function(dxval, dyval) {
	this._client.updateState({dx: dxval, dy: dyval})
};

Tank.prototype.animateScene = function() {
	var that = this;
	function animate() {
		requestAnimationFrame(animate);

		if (GroundMesh != null) {
	        GroundMesh.rotation.x += 0.01;
	        GroundMesh.rotation.y += 0.02;
    	}

        that._renderer.render( that._scene, that._camera );
	};
	animate();
}