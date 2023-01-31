/** @typedef { import("wechaty").Wechaty } Wechaty */
var express = require('express');
var importFresh = require('import-fresh');

/**
 * @param {Object} config
 * @param {number} config.port web api port
 */
module.exports = function WechatyDynamicPlugin(config) {
	return function (/** @type {Wechaty} */bot) {
		var plugin = {};
		var app = express();
		app.use(express.json());
		app.put('/plugin/:name', (req, res) => {
			var installer = importFresh(req.body.module);
			var uninstaller = installer(bot);
			plugin[req.params.name] = {
				installer: installer,
				uninstaller: uninstaller
			};
			res.status(201).end();
		});
		app.delete('/plugin/:name', (req, res) => {
			var uninstaller = plugin[req.params.name].uninstaller;
			if (uninstaller) uninstaller();
			delete plugin[req.params.name];
			res.status(204).end();
		});
		var server = app.listen(config.port);
		return () => {
			for (var name in plugin)
				if (plugin[name].uninstaller)
					plugin[name].uninstaller();
			server.close();
		};
	};
};
