/** @typedef { import("wechaty").Wechaty } Wechaty */
var fs = require('fs');
var path = require('path');
var express = require('express');
var importFresh = require('import-fresh');

/**
 * @param {Object} config
 * @param {number} config.port web api port
 * @param {string} config.dir working directory
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
			{
				var file = path.join(config.dir, 'plugin.json');
				let plugin = JSON.parse(fs.readFileSync(file, 'utf8'));
				plugin[req.params.name] = req.body;
				fs.writeFileSync(file, JSON.stringify(plugin, undefined, '\t'), 'utf8');
			}
			res.status(201).end();
		});
		app.delete('/plugin/:name', (req, res) => {
			var uninstaller = plugin[req.params.name].uninstaller;
			if (uninstaller) uninstaller();
			delete plugin[req.params.name];
			{
				var file = path.join(config.dir, 'plugin.json');
				let plugin = JSON.parse(fs.readFileSync(file, 'utf8'));
				delete plugin[req.params.name];
				fs.writeFileSync(file, JSON.stringify(plugin, undefined, '\t'), 'utf8');
			}
			res.status(204).end();
		});
		var server = app.listen(config.port);
		var _plugin = plugin;
		{
			var file = path.join(config.dir, 'plugin.json');
			let plugin = JSON.parse(fs.readFileSync(file, 'utf8'));
			for (var name in plugin) {
				var installer = importFresh(plugin[name].module);
				var uninstaller = installer(bot);
				_plugin[name] = {
					installer: installer,
					uninstaller: uninstaller
				};
			}
		}
		return () => {
			for (var name in plugin)
				if (plugin[name].uninstaller)
					plugin[name].uninstaller();
			server.close();
		};
	};
};
