function InvokeObject(ozwDevice, serviceID, comClass, instance, index, argName, type, isRead) {
  var _this = this;
  this.ozwDevice = ozwDevice;
  this.ozw = ozwDevice.device;
  this.nodeid = ozwDevice.nodeid;
  this.serviceID = serviceID;
  this.comClass = comClass;
  this.instance = instance;
  this.index = index;
  this.argName = argName;
  this.type = type;
  if (!isRead) {
    this.invoke = function(args, callback) {
      var key = Object.keys(args)[0];
      var value = args[key];
      _this.ozw.setValue(_this.nodeid, _this.comClass, _this.instance, _this.index, value);
      callback(null); // no error defined by ozw js binding
    };
  } else {
    this.invoke = function(args, callback) {
      //there is no reliable read interface, so we get framework state instead
      _this.ozwDevice.getServiceStates(_this.serviceID, function(err, data) {
        if (err) {
          callback(err, null);
        } else {
          var output = {};
          // arg name is same as variable name here
          if (_this.type === 'number' || _this.type === 'integer') {
            data[_this.argName] = (data[_this.argName]) / 1; // convert to number type
          }
          output[_this.argName] = data[_this.argName];
          callback(null, output);
        }
      });
    };
  }
};

module.exports = InvokeObject;
