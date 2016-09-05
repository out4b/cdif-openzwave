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
};

OZWManager.prototype.onDriverFailed = function() {
  // below call will block the framework if controller is not present
  // this.ozw.disconnect('/dev/ttyUSB0');
};

OZWManager.prototype.onNodeAdded = function(nodeid) {
  var device = this.deviceList[nodeid];
  if (!device) {
    device = new OZWDevice(this.ozw, nodeid);
    this.deviceList[nodeid] = device;
  }
};

OZWManager.prototype.onValueAdded = function(nodeid, comClass, value) {
  var device = this.deviceList[nodeid];
  if (!device) {
    device = new OZWDevice(this.ozw, nodeid);
    this.deviceList[nodeid] = device;
  }
  device.addValueToDeviceSpec(comClass, value);
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
};

OZWManager.prototype.onValueRemoved = function(nodeid, comClass, index) {
  //TODO
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
};

OZWManager.prototype.onNodeNaming = function(nodeid, nodeinfo) {
  var device = this.deviceList[nodeid];
  if (!device) {
    device = new OZWDevice(this.ozw, nodeid);
    this.deviceList[nodeid] = device;
  }
  device.setNodeInfo(nodeinfo);
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
};

OZWManager.prototype.onScanComplete = function() {
  this.discoverState = 'connected';
};

OZWManager.prototype.onNotification = function(nodeid, notif) {
  // TODO
};

module.exports = OZWManager;
