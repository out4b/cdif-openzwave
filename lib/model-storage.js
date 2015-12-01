var sqlite3 = require('sqlite3');

var db = null;

//TODO: in the future this code should be merged with the common device data store
function ModelStorage() {
  db = new sqlite3.Database('./device_model.db');
  //TODO: close db on framework exit
  db.serialize(function() {
    db.run("CREATE TABLE IF NOT EXISTS device_model(nodeid TEXT PRIMARY KEY, spec TEXT)");
  });
}

ModelStorage.prototype.getSpecForNode = function(nodeid, callback) {
  db.serialize(function() {
    db.get("SELECT spec FROM device_model WHERE nodeid = ?", nodeid, callback);
  });
};

ModelStorage.prototype.setSpecForNode = function(nodeid, spec) {
  db.serialize(function() {
    db.run("INSERT OR REPLACE INTO device_model(nodeid, spec) VALUES (?, ?)", nodeid, spec);
  });
};

ModelStorage.prototype.getSpecForAllNodes = function(callback) {
  db.parallelize(function() {
    db.all("SELECT * FROM device_model", callback);
  });
};

ModelStorage.prototype.deleteNodeInformation = function(nodeid, callback) {
  db.serialize(function() {
    db.run("DELETE FROM device_model WHERE nodeid = ?", nodeid, callback);
  });
};

module.exports = ModelStorage;
