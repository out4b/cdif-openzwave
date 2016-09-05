var fs = require('fs');
var util = require('util');
var events = require('events');
var CdifDevice = require('cdif-device');


function OZWDevice(ozw, nodeid) {
  this.device = ozw;
  this.nodeid = nodeid;
  this.nodeStatus = 'init';
  // TODO: load spec from persistent storage
  this.spec = JSON.parse(fs.readFileSync(__dirname + '/device-template.json').toString());
  // CdifDevice.call(this, spec);
  // this.setupDeviceCalls();
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

OZWDevice.prototype.setupDeviceCalls = function() {
};

OZWDevice.prototype.notifyValueUpdate = function(comClass, value) {
  if (this.nodeStatus !== 'ready') return;
  // var output = {};
  // output[value['label']] = value['value'];
  // var device = this.deviceList[nodeid];
  // device.sendEvent(output);
};

OZWDevice.prototype.nodeReady = function(nodeinfo) {
  var deviceSpec = this.spec.device;
  deviceSpec.manufacturer = nodeinfo.manufacturer;
  deviceSpec.manufacturerID = nodeinfo.manufacturerid;
  deviceSpec.productType = nodeinfo.producttype;
  deviceSpec.productID = nodeinfo.productid;
  deviceSpec.deviceType = 'urn:openzwave-com:device:' + nodeinfo.type + ':1';
  deviceSpec.friendlyName = nodeinfo.product;
  // TODO: location would be handled as a common service
  // deviceSpec.location = nodeinfo.loc;
  this.nodeStatus = 'ready';
  CdifDevice.call(this, this.spec);
  this.setupDeviceCalls();
};

module.exports = OZWDevice;
