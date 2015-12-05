var util = require('util');
var events = require('events');
var DeviceDB = require('device-db');
var OZW = require('openzwave-shared');
var OZWDevice = require('./lib/ozw-device');

//TODO: support OZW security API
function OZWManager() {
  this.ozw = new OZW({
          Logging: true,            // enable logging to OZW_Log.txt
          ConsoleOutput: false,     // copy logging to the console
  });
  this.ozw.on('driver ready', this.onDriverReady.bind(this));
  this.ozw.on('driver failed', this.onDriverFailed.bind(this));
  this.ozw.on('node added', this.onNodeAdded.bind(this));
  this.ozw.on('node ready', this.onNodeReady.bind(this));
  this.ozw.on('node naming', this.onNodeNaming.bind(this));
  this.ozw.on('node available', this.onNodeAvailable.bind(this));
  this.ozw.on('value added', this.onValueAdded.bind(this));
  this.ozw.on('value changed', this.onValueChanged.bind(this));
  this.ozw.on('value removed', this.onValueRemoved.bind(this));
  this.ozw.on('scan complete', this.onScanComplete.bind(this));
  this.ozw.on('notification', this.onNotification.bind(this));

  this.deviceList = {};
  this.discoverState = 'stopped';
}

util.inherits(OZWManager, events.EventEmitter);

OZWManager.prototype.discoverDevices = function() {
  if (this.discoverState === 'discovering' || this.discoverState === 'connected') {
    return;
  }
  this.ozw.connect('/dev/ttyUSB0');    // TODO: need to check udev?
  this.discoverState = 'discovering';
};

OZWManager.prototype.stopDiscoverDevices = function() {
  this.discoverState = 'stopped';
};

OZWManager.prototype.onDriverReady = function(homeid) {
  this.homeid = homeid;
  console.log('onDriverReady, home ID: ' + homeid);
};

OZWManager.prototype.onDriverFailed = function() {
  // below call will block the framework if controller is not present
  // this.ozw.disconnect('/dev/ttyUSB0');
  console.log('onDriverFailed');
};

OZWManager.prototype.onNodeAdded = function(nodeid) {
  var device = this.deviceList[nodeid];
  if (!device) {
    device = new OZWDevice(this.ozw, nodeid);
    this.deviceList[nodeid] = device;
  }
  console.log('onNodeAdded, nodeid: ' + nodeid);
};

OZWManager.prototype.onValueAdded = function(nodeid, comClass, value) {
  var device = this.deviceList[nodeid];
  if (!device) {
    device = new OZWDevice(this.ozw, nodeid);
    this.deviceList[nodeid] = device;
  }
  device.addValueToDeviceSpec(comClass, value);
  console.log('onValueAdded, nodeid: %s, comClass: %s, value: %s', nodeid, comClass, value);
};

OZWManager.prototype.onValueChanged = function(nodeid, comClass, value) {
  var device = this.deviceList[nodeid];
  if (!device) {
    device = new OZWDevice(this.ozw, nodeid);
    this.deviceList[nodeid] = device;
  }
  //FIXME: is it a possible case that new value would be added here?
  device.addValueToDeviceSpec(comClass, value);
  if (!device.deviceID) {
    device.updateDeviceSpec(device.spec);
    device.setupDeviceCalls();
    this.emit('deviceonline', device, this);
  } else {
    device.notifyValueUpdate(comClass, value);
  }
  console.log('onValueChanged, nodeid: %s, comClass: %s, value: %s', nodeid, comClass, JSON.stringify(value));
};

OZWManager.prototype.onValueRemoved = function(nodeid, comClass, index) {
  //TODO
  console.log('onValueRemoved, nodeid: %s, comClass: %s, index: %s', nodeid, comClass, index);
};

OZWManager.prototype.onNodeReady = function(nodeid, nodeinfo) {
  var device = this.deviceList[nodeid];
  if (!device) {
    device = new OZWDevice(this.ozw, nodeid);
    this.deviceList[nodeid] = device;
  }
  device.setNodeInfo(nodeinfo);
  device.updateDeviceSpec(device.spec);
  device.setupDeviceCalls();
  this.emit('deviceonline', device, this);
  console.log('onNodeReady, nodeid: %s, nodeInfo: %s', nodeid, nodeinfo);
};

OZWManager.prototype.onNodeNaming = function(nodeid, nodeinfo) {
  var device = this.deviceList[nodeid];
  if (!device) {
    device = new OZWDevice(this.ozw, nodeid);
    this.deviceList[nodeid] = device;
  }
  device.setNodeInfo(nodeinfo);
  console.log('onNodeNaming, nodeid: %s, nodeInfo: %s', nodeid, nodeinfo);
};

OZWManager.prototype.onNodeAvailable = function(nodeid, nodeinfo) {
  var device = this.deviceList[nodeid];
  if (!device) {
    device = new OZWDevice(this.ozw, nodeid);
    this.deviceList[nodeid] = device;
  }
  device.setNodeInfo(nodeinfo);
  device.updateDeviceSpec(device.spec);
  device.setupDeviceCalls();
  this.emit('deviceonline', device, this);
  console.log('onNodeAvailable, nodeid: %s, nodeInfo: %s', nodeid, nodeinfo);
};

OZWManager.prototype.onScanComplete = function() {
  this.discoverState = 'connected';
};

OZWManager.prototype.onNotification = function(nodeid, notif) {
  // TODO
  console.log('onNotification, nodeid: %s, notif: %s', nodeid, notif);
};

module.exports = OZWManager;
