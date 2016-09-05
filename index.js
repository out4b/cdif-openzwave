var util = require('util');
var events = require('events');
var DeviceDB = require('device-db');
var OZW = require('openzwave-shared');
var OZWDevice = require('./lib/ozw-device');

//TODO: support OZW security API
function OZWManager() {
  this.ozw = new OZW({
          Logging: true,            // enable logging to OZW_Log.txt
          ConsoleOutput: true,      // copy logging to the console
  });
  this.ozw.on('connected', this.onConnected.bind(this));
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
  this.serviceMap = require('./service-map.json');
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

OZWManager.prototype.onConnected = function() {
  this.discoverState = 'connected';
  console.log('onConnected');
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
  this.addValueToDeviceSpec(device, comClass, value);
  console.log('onValueAdded, nodeid: %s, comClass: %s, value: %s', nodeid, comClass, value);
};

OZWManager.prototype.onValueChanged = function(nodeid, comClass, value) {
  var device = this.deviceList[nodeid];
  if (!device) {
    device = new OZWDevice(this.ozw, nodeid);
    this.deviceList[nodeid] = device;
  }
  //FIXME: is it a possible case that new value would be added here?
  this.addValueToDeviceSpec(device, comClass, value);
  if (!device.deviceID) {
    device.updateDeviceSpec(device.spec);
    device.setupDeviceCalls();
    this.emit('deviceonline', device, this);
  } else {
    device.notifyValueUpdate(comClass, value);
  }
  console.log('onValueChanged, nodeid: %s, comClass: %s, value: %s', nodeid, comClass, value);
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
  this.discoverState = 'stopped';
};

OZWManager.prototype.onNotification = function(nodeid, notif) {
  // TODO
  console.log('onNotification, nodeid: %s, notif: %s', nodeid, notif);
};

OZWManager.prototype.addValueToDeviceSpec = function(device, comClass, value) {
  var serviceID = this.serviceMap[comClass].id;
  if (!serviceID) {
    serviceID = comClass; // raw id for non-standard classes
  }
  var spec = device.spec;
  var name = value.label + '_' + value.instance;
  if (spec.device.serviceList[serviceID]) {
    if (spec.device.serviceList[serviceID].serviceStateTable[name]) {
      return false;
    }
  }
  if (!spec.device.serviceList[serviceID]) {
    spec.device.serviceList[serviceID] = {};
    spec.device.serviceList[serviceID].comClass = comClass;
    spec.device.serviceList[serviceID].serviceStateTable = {};
  }
  var table = spec.device.serviceList[serviceID].serviceStateTable;
  if (!table[name]) {
    table[name] = {};
  }
  var type = this.convertValueType(value.type);
  table[name].dataType = type;
  table[name].sendEvents = true;     // we can safely assume always true
  table[name].defaultValue = value.value;
  table[name].index = value.index;
  // TODO: process list type
  if (value.min != null && value.max != null && value.max > value.min) {
    if (!table[name].allowedValueRange) {
      table[name].allowedValueRange = {};
      table[name].allowedValueRange.minimum = value.min;
      table[name].allowedValueRange.maximum = value.max;
    }
  }
  if (!spec.device.serviceList[serviceID].actionList) {
    spec.device.serviceList[serviceID].actionList = {};
  }
  this.generateActionForValue(device, serviceID, name, value);
  return true;
};

OZWManager.prototype.generateActionForValue = function(device, serviceID, name, value) {
  var spec = device.spec;
  var actionList = spec.device.serviceList[serviceID].actionList;
  var actionNames = [];
  if (value.write_only === true) {
    actionNames.push('write ' + name);
  } else if (value.read_only === true) {
    actionNames.push('read ' + name);
  } else {
    actionNames.push('write ' + name);
    actionNames.push('read ' + name);
  }
  for (var i in actionNames) {
    var actionName = actionNames[i];

    if (!actionList[actionName]) {
      actionList[actionName] = {};
      actionList[actionName].argumentList = {};
      actionList[actionName].argumentList[name] = {};
      actionList[actionName].argumentList[name].relatedStateVariable = name;
      if (actionName.split(' ')[0] === 'read') {
        actionList[actionName].argumentList[name].direction = 'out';
      } else {
        actionList[actionName].argumentList[name].direction = 'in';
      }
    }
  }
};

OZWManager.prototype.convertValueType = function(ozwType) {
  // refer from https://github.com/OpenZWave/open-zwave/wiki/Adding-Devices#configuration-variable-types
  switch(ozwType) {
    case 'bool':
      return 'boolean';
    case 'byte':
    case 'decimal':
    case 'int':
    case 'short':
      return 'number';
    case 'list':
    case 'string':
      return 'string';
    default:
      return 'object';
  }
};


module.exports = OZWManager;
