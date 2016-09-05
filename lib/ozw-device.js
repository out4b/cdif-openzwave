var fs = require('fs');
var util = require('util');
var events = require('events');
var CdifDevice = require('cdif-device');
var InvokeObject = require('./invoke');

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
  // var output = {};
  // output[value['label']] = value['value'];
  // var device = this.deviceList[nodeid];
  // device.sendEvent(output);
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

OZWDevice.prototype.setupDeviceCalls = function() {
  var ozw = this.device;
  var nodeid = this.nodeid;
  for (var i in this.spec.device.serviceList) {
    var serviceID = i;
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

module.exports = OZWDevice;
