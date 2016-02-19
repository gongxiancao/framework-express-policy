var _ = require('lodash'),
  fs = require('fs'),
  async = require('async'),
  pathUtil = require('path');

module.exports = function (done) {
  var self = this;

  var policies = self.policies = {};
  var policiesPath = self.config.paths.policies = pathUtil.join(self.config.paths.root, 'api/policies');

  fs.readdir(policiesPath, function (err, fileNames) {
    async.each(fileNames, function (fileName, done) {
      var filePath = pathUtil.join(policiesPath, fileName);
      var extname = pathUtil.extname(filePath);
      if(extname !== '.js') {
        return done();
      }
      fs.stat(filePath, function (err, stat) {
        if(err) {
          return done();
        }

        if(stat.isFile()) {
          var moduleName = pathUtil.basename(fileName, extname);
          policies[moduleName] = require(filePath);
        }
        done();
      });
    }, function () {
      self.config.controllerActionPolicies = {};

      var defaultPolicies = self.config.policies['*'] || [];
      _.each(self.controllers, function (controller, controllerName) {
        var controllerPolicies = self.config.policies[controllerName] || {};
        var defaultControllerPolicies = controllerPolicies['*'] || defaultPolicies;
        _.each(controller, function (action, actionName) {
          if(_.isFunction(action)) {
            self.config.controllerActionPolicies[controllerName + '.' + actionName] = controllerPolicies[actionName] || defaultControllerPolicies;
          }
        });
      });

      var unknownPolicies = [];
      self.controllerActionPolicies = _.mapValues(self.config.controllerActionPolicies, function (policyNames) {
        return _.map(policyNames, function (policyName) {
          var policy = self.policies[policyName];
          if(!policy) {
            unknownPolicies.push(policyName);
          }
           return policy;
        });
      });

      if(unknownPolicies.length) {
        return done(new Error('Unknown policy:' + policyName));
      }
      done();
    });
  });
};