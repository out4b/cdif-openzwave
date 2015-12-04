var fs = require('fs');
var util = require('util');
var events = require('events');
var CdifDevice = require('cdif-device');
var InvokeObject = require('./invoke');
var serviceMap = require('./service-map.json');

function OZWDevice(ozw, nodeid) {
  this.device = ozw;
  this.nodeid = nodeid;
  var spec = JSON.parse(fs.readFileSync(__dirname + '/device-template.json').toString());
  CdifDevice.call(this, spec);
}

util.inherits(OZWDevice, CdifDevice);

OZWDevice.prototype._connect = function(user, pass, callback) {
  callback(null);
};

OZWDevice.prototype._disconnect = function(callback) {
  callback(null);
};

OZWDevice.prototype._getHWAddress = function(callback) {
  var addr = 'ozw_node_' + this.nodeid;
  callback(null, addr);
};

OZWDevice.prototype.notifyValueUpdate = function(comClass, value) {
  var serviceID = serviceMap[comClass].id;
  if (!serviceID) {
    serviceID = comClass; // raw id for non-standard classes
  }
  var spec = this.spec;
  var name = value.label + '_' + value.instance;
  if (!spec.device.serviceList[serviceID]) {
    console.error('cannot send value update from serviceID: ' + serviceID);
    return;
  }
  var table = spec.device.serviceList[serviceID].serviceStateTable;
  if (!table[name]) {
    console.error('cannot send value update from variable: ' + name);
    return;
  }
  this.emit('ozwvaluechange', serviceID, name, value.value);
};

OZWDevice.prototype.setNodeInfo = function(nodeinfo) {
  var deviceSpec = this.spec.device;
  deviceSpec.manufacturer = nodeinfo.manufacturer;
  deviceSpec.manufacturerID = nodeinfo.manufacturerid;
  deviceSpec.productType = nodeinfo.producttype;
  deviceSpec.productID = nodeinfo.productid;
  deviceSpec.deviceType = 'urn:openzwave-com:device:' + nodeinfo.type + ':1';
  deviceSpec.friendlyName = nodeinfo.product;
  // TODO: location would be handled as CDIF's common service
  this.deviceLocation = nodeinfo.loc;
};

OZWDevice.prototype.addValueToDeviceSpec = function(comClass, value) {
  var serviceID = serviceMap[comClass].id;
  if (!serviceID) {
    serviceID = comClass; // raw id for non-standard classes
  }
  var spec = this.spec;
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
  this.generateActionForValue(serviceID, name, value);
  return true;
};

OZWDevice.prototype.generateActionForValue = function(serviceID, name, value) {
  var spec = this.spec;
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

OZWDevice.prototype.convertValueType = function(ozwType) {
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

//this is bound to service object
var onValueChangeEvent = function(serviceID, name, value) {
  var output = {};
  output[name] = value;
  this.sendEvent(output);
};

OZWDevice.prototype.setupDeviceCalls = function() {
  var nodeid = this.nodeid;
  for (var i in this.spec.device.serviceList) {
    var serviceID = i;
    this.setupEventSubscription(serviceID, this.eventSubscribe, this.eventUnsubscribe, onValueChangeEvent);
    var service = this.spec.device.serviceList[i];
    var comClass = service.comClass;
    var actionList = this.spec.device.serviceList[i].actionList;
    for (var j in actionList) {
      var actionName = j;
      var action = actionList[j];
      var argName = Object.keys(action.argumentList)[0];
      var argument = action.argumentList[argName];
      var stateVarName = argument.relatedStateVariable;
      var stateVar = service.serviceStateTable[stateVarName];
      var pos = stateVarName.lastIndexOf('_');
      var instance = stateVarName.slice(pos + 1);
      var index = stateVar.index;

      var invokeObject = null;
      if (argument.direction === 'in') {
        invokeObject = new InvokeObject(this, serviceID, comClass, instance, index, argName, false);
      } else {
        invokeObject = new InvokeObject(this, serviceID, comClass, instance, index, argName, true);
      }
      // TODO: implement subscribe / unsubscribe calls and onEvent callback
      this.setAction(serviceID, actionName, invokeObject.invoke);
    }
  }
};

OZWDevice.prototype.setupEventSubscription = function(serviceID, subscribe, unsubscribe, onEvent) {
  this.setSubscriber(serviceID, subscribe, onEvent);
  this.setUnsubscriber(serviceID, unsubscribe);
};

OZWDevice.prototype.onValueChange = function(serviceID, name, value) {
  onValueChangeEvent(serviceID, name, value);
};

OZWDevice.prototype.eventSubscribe = function(onChange, onValueChangeEvent, callback) {
  this.addListener('ozwvaluechange', onValueChangeEvent);
  callback(null);
};

OZWDevice.prototype.eventUnsubscribe = function(callback) {
  this.removeListener('ozwvaluechange', onValueChangeEvent);
  callback(null);
};

module.exports = OZWDevice;
