var sqlite3 = require('sqlite3');

var db = null;

function ModelStorage() {
  db = new sqlite3.Database('./device_model.db');
  //TODO: close db on framework exit
  db.serialize(function() {
    db.run("CREATE TABLE IF NOT EXISTS device_model(nodeid TEXT PRIMARY KEY, doc TEXT)");
  });
}

ModelStorage.prototype.getModelForNode = function(nodeid, callback) {
  db.serialize(function() {
    db.get("SELECT doc FROM device_model WHERE nodeid = ?", nodeid, callback);
  });
};

ModelStorage.prototype.setModelForNode = function(nodeid, doc) {
  db.serialize(function() {
    db.run("INSERT INTO device_model(nodeid, doc) VALUES (?, ?)", nodeid, doc);
  });
};

ModelStorage.prototype.getModelForAllNodes = function(callback) {
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
