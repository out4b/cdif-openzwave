var util = require('util');
var events = require('events');
var DeviceDB = require('device-db');
var OZW = require('openzwave');
var ModelStorage = require('./lib/model-storage');
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
  this.ozw.on('notification', this.onNotification.bind(this));

  this.deviceList = {};
  this.modelStorage = new ModelStorage();
  this.serviceMap = require('./service-map.json');
  // device models load from persistent storage includes a history of avaiable device nodes
  // by doing this we do need to do device inclusion on every fromework startup
  this.loadDeviceModelFromStorage();
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
  // TODO: emit device online event for device models loaded from persistent storage
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
  var serviceID = this.serviceMap[comClass].id;
  if (!serviceID) {
    serviceID = comClass;
  }
  var spec = device.spec;
  var name = value.label + '_' + value.instance;

  if (!spec.device.serviceList[serviceID]) {
    spec.device.serviceList[serviceID] = {};
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
};

OZWManager.prototype.onValueAdded = function(nodeid, comClass, value) {
  // TODO: emit device online event for device models loaded from persistent storage
  this.addDeviceStateVariable(nodeid, comClass, value);
};

OZWManager.prototype.onValueChanged = function(nodeid, comClass, value) {
  // TODO: emit device online event for device models loaded from persistent storage
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
  device.nodeReady(nodeinfo);
  console.log(device.spec);
  this.modelStorage.setModelForNode(nodeid, JSON.stringify(device.spec));
  this.emit('deviceonline', device, this);
};

OZWManager.prototype.onScanComplete = function() {
  this.discoverState = 'stopped';
};

OZWManager.prototype.onNotification = function(nodeid, notif) {
  // TODO: emit device online event for device models loaded from persistent storage
};

OZWManager.prototype.loadDeviceModelFromStorage = function() {
  this.modelStorage.getModelForAllNodes(function(err, rows) {
    for (var i in rows) {
      var nodeid = rows[i].nodeid;
      var spec = rows[i].doc;
      var device = this.deviceList[nodeid];
      if (!device) {
        device = new OZWDevice(this.ozw, nodeid);
        this.deviceList[nodeid] = device;
      }
      device.spec = spec;
    }
  }.bind(this));
}

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
