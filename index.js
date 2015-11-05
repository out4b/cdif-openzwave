var util = require('util');
var events = require('events');
var DeviceDB = require('device-db');
var OZW = require('openzwave');

function OZWManager() {
  this.ozw = new OZW('/dev/ttyUSB0', { // TODO: need to setup udev rules on system?
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
  this.ozw.on('node ready', this.onValueReady.bind(this));
  this.ozw.on('scan complete', this.onScanComplete.bind(this));
  this.discoverState = 'stopped';
}

util.inherits(OZWManager, events.EventEmitter);

OZWManager.prototype.discoverDevices = function() {
  if (this.discoverState === 'discovering') {
    return;
  }
  this.device.connect();
  this.discoverState = 'discovering';
};

OZWManager.prototype.stopDiscoverDevices = function() {
  this.discoverState = 'stopped';
};

OZWManager.prototype.onConnected = function() {
  // do nothing
};

OZWManager.prototype.onDriverReady = function(homeid) {
  this.homeid = homeid; // now assume only 1 homeid
};

OZWManager.prototype.onDriverFailed = function() {
  console.error('OZW driver failed');
};

OZWManager.prototype.onNodeAdded = function(nodeid) {

};

OZWManager.prototype.onValueAdded = function() {

};

OZWManager.prototype.onValueChanged = function() {

};

OZWManager.prototype.onValueRemoved = function() {

};

OZWManager.prototype.onValueReady = function() {

};

OZWManager.prototype.onScanComplete = function() {

};


module.exports = OZWManager;
