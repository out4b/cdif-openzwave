var fs = require('fs');
var util = require('util');
var events = require('events');
var CdifDevice = require('cdif-device');


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
  // for (var i in this.spec.device.serviceList) {
  //   var serviceID = i;
  //   var service = spec.device.serviceList[i];
  //   var comClass = service.comClass;
  //   var actionList = spec.device.serviceList[i].actionList;
  //   for (var j in actionList) {
  //     var actionName = j;
  //     var action = actionList[j];
  //     var argName = Object.keys(action.argumentList)[0];
  //     var argument = action.argumentList[argName];
  //     var stateVarName = argument.relatedStateVariable;
  //     var stateVar = service.serviceStateTable[stateVarName];
  //
  //     var call = null;
  //     if (argument.direction === 'in') {
  //       call = new InvokeObject(this.device, comClass, false, argName, stateVar.dataType);
  //     } else {
  //       call = new InvokeObject(this.device, comClass, true, argName, stateVar.dataType);
  //     }
  //     // TODO: implement subscribe / unsubscribe calls and onEvent callback
  //     this.setAction(serviceID, actionName, call.invoke);
  //   }
  // }
};

module.exports = OZWDevice;
