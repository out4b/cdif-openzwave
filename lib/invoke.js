function InvokeObject(ozwDevice, serviceID, comClass, instance, index, argName, isRead) {
  var _this = this;
  this.ozw = ozwDevice.device;
  this.nodeid = ozwDevice.nodeid;
  this.serviceID = serviceID;
  this.comClass = comClass;
  this.instance = instance;
  this.index = index;
  this.argName = argName;
  if (!isRead) {
    this.invoke = function(args, callback) {
      var key = Object.keys(args)[0];
      var value = args[key];
      console.log('setValue: %s, %s, %s, %s, %s', _this.nodeid, _this.comClass, _this.instance, _this.index, value);
      _this.ozw.setValue(_this.nodeid, _this.comClass, _this.instance, _this.index, value);
      callback(null); // no error defined by ozw js binding
    };
  } else {
    this.invoke = function(args, callback) {
      //there is no reliable read interface, so we get framework state instead
      ozwDevice.getVariableState(_this.serviceID, _this.argName, function(err, data) {
        if (err) {
          callback(err, null);
        } else {
          var output = {};
          var key = Object.keys(data)[0];
          var value = data[key];
          output[_this.argName] = value;
          callback(null, output);
        }
      });
    };
  }
};

module.exports = InvokeObject;
