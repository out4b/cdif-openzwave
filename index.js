var util = require('util');
var events = require('events');
var DeviceDB = require('device-db');
var OZW = require('openzwave');
var OZWDevice = require('./lib/ozw-device');

function OZWManager() {
  this.ozw = new OZW('/dev/ttyUSB0', { // FIXME: need to setup udev rules on system?
          logging: true,           // enable logging to OZW_Log.txt
          consoleoutput: false,     // copy logging to the console
          saveconfig: true,        // write an XML network layout
          driverattempts: 3,        // try this many times before giving up
          pollinterval: 500,        // interval between polls in milliseconds
          suppressrefresh: true     // do not send updates if nothing changed
  });
  this.ozw.on('connected', this.onConnected.bind(this));
  this.ozw.on('driver ready', this.onDriverReady.bind(this));
  this.ozw.on('driver failed', this.onDriverFailed.bind(this));
  this.ozw.on('node added', this.onNodeAdded.bind(this));
  this.ozw.on('value added', this.onValueAdded.bind(this));
  this.ozw.on('value changed', this.onValueChanged.bind(this));
  this.ozw.on('value removed', this.onValueRemoved.bind(this));
  this.ozw.on('node ready', this.onNodeReady.bind(this));
  this.ozw.on('scan complete', this.onScanComplete.bind(this));

  this.ccMap = require('./service-map.json');
  this.deviceList = {};
  this.discoverState = 'stopped';
}

util.inherits(OZWManager, events.EventEmitter);

OZWManager.prototype.discoverDevices = function() {
  if (this.discoverState === 'discovering') {
    return;
  }
  this.ozw.connect();
  this.discoverState = 'discovering';
};

OZWManager.prototype.stopDiscoverDevices = function() {
  this.discoverState = 'stopped';
};

OZWManager.prototype.onConnected = function() {
  // do nothing
};

OZWManager.prototype.onDriverReady = function(homeid) {
  this.homeid = homeid;
};

OZWManager.prototype.onDriverFailed = function() {
  console.error('OZW driver failed');
};

OZWManager.prototype.onNodeAdded = function(nodeid) {
  var device = new OZWDevice(this.ozw, nodeid);
  this.deviceList[nodeid] = device;
  // do not emit device online event until node ready
};

OZWManager.prototype.addDeviceStateVariable = function(nodeid, comClass, value) {
  var device = this.deviceList[nodeid];
  if (!device) {
    device = new OZWDevice(this.ozw, nodeid);
    this.deviceList[nodeid] = device;
  }
  var serviceID = this.ccMap[comClass];
  if (!serviceID) {
    serviceID = comClass;
  }
  var spec = device.spec;
  if (!spec.serviceList[serviceID]) {
    spec.serviceList[serviceID] = {};
    spec.serviceList[serviceID].serviceStateTable = {};
    var table = spec.serviceList[serviceID].serviceStateTable;
    // FIXME: handle multi instance value
    var stateVar = table[value['label']];
    if (!stateVar) {
      stateVar = {};
      stateVar.index = value.index;
      stateVar.sendEvents = true;
      stateVar.defaultValue = value['value'];
    }
  } else {
    spec.serviceList[serviceID].serviceStateTable[value['label']].defaultValue = value['value'];
  }
};

OZWManager.prototype.onValueAdded = function(nodeid, comClass, value) {
  this.addDeviceStateVariable(nodeid, comClass, value);
};

OZWManager.prototype.onValueChanged = function(nodeid, comClass, value) {
  this.addDeviceStateVariable(nodeid, comClass, value);
  var device = this.deviceList[nodeid];
  device.notifyValueUpdate(comClass, value);
};

OZWManager.prototype.onValueRemoved = function(nodeid, comClass, index) {
  // do nothing for now
};

OZWManager.prototype.onNodeReady = function(nodeid, nodeinfo) {
  var device = this.deviceList[nodeid];
  if (!device) {
    device = new OZWDevice(this.ozw, nodeid);
    this.deviceList[nodeid] = device;
  }
  device.nodeReady(nodeifo);
};

OZWManager.prototype.onScanComplete = function() {
  this.discoverState = 'stopped';
};


module.exports = OZWManager;
