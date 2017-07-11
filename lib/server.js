const WpDevServer = require("../lib/Server")
const webpack = require("webpack")
const chalk = require("chalk")
const Server = require("webpack-dev-server")
const path = require('path')
const fs = require('fs')
const _ = require('lodash')
const getEntries = require('./utils').getEntries
const wpConfig  = require('./conf/webpack.config')()
const SingleEntryPlugin = require('webpack/lib/SingleEntryPlugin')
const url = require("url")
const internalIp = require("internal-ip")
const open = require("opn")

// 保留webpack-dev-server配置
function createDomain(options) {
	const protocol = options.https ? "https" : "http"

	// the formatted domain (url without path) of the webpack server
	return options.public ? `${protocol}://${options.public}` : url.format({
		protocol: protocol,
		hostname: options.useLocalIp ? internalIp.v4() : options.host,
		port: options.socket ? 0 : options.port.toString()
	})
}


class Serve {
	constructor (ko) {
		this.ko = ko
		this.options = ko.options
	}

	start () {
		const prjPath = path.join(this.options.pagesDir, this.options.prjName)
	  if(!fs.existsSync(prjPath)) {
	    console.log(chalk.red(`${prjPath} not found`))
	    process.exit(1)
	  }
	  this.htmlWatcher = this.ko.watchHtml()
	  const entryGlob = path.join(prjPath, '*.js')
	  const entryGlobPlus = path.join(prjPath, this.options.jsDir ,'*.js')
	  wpConfig.entry = _.defaultsDeep(getEntries([entryGlob, entryGlobPlus]), wpConfig.entry)
	  if(_.values(wpConfig.entry).length == 0){
	    console.log(chalk.red(`Warn: Could not found any entries in ${this.options.prjName}`))
	    process.exit(1)
	  }
	  wpConfig.output.path = path.resolve(this.options.rootDir, this.options.distDir)
	  let compiler
	  try {
	  	compiler = webpack(wpConfig)
	  }catch(e) {
	  	if(e instanceof webpack.WebpackOptionsValidationError) {
				console.log(chalk.red(e.message))
				process.exit(1)
			}
			throw e
	  }
	  const ko = this.ko
		const devOptions = _.defaultsDeep(this.ko.options.devServer, {
			contentBase: this.options.pagesDir,
			host: 'localhost',
			port: 9000,
	    quiet: true,
	    inline: true,
	    noInfo: true,
	    historyApiFallback: false,
	    open: true
		})
		let _setup
		if(_.isFunction(devOptions.setup)) {
			_setup = devOptions.setup
		}
		devOptions.setup = (app) => {
			_setup && _setup(app)
			app.use((req, res, next) => {
        var targetPath = path.join('', req.path)
        const file = req.path
        if (!/\.(html|shtml)$/.test(file)) {
          return next()
        }
        const _dirPath = path.dirname(file)
				const _basename = path.basename(file)
	      const tarPath = path.join(ko.options.pagesDir, file)
	      const _content = ko.mfs.readFileSync(path.resolve(tarPath), 'utf-8')
	      let result = ko.sincludeHtml(_content, tarPath, compiler)
	      
	      return Promise.resolve(result)
	      	.then((result) => {
	      		if(_.isFunction(ko.options.parseHtmlAsDev)) {
			      	return ko.options.parseHtmlAsDev(result)
			      }else {
			      	return Promise.resolve(result)
			      }
	      	})
	      	.then((result) => {
	      		res.setHeader("Content-Type", "text/html")
		        res.write(result)
		        res.end('<script src="http://'+ devOptions.host +':'+ devOptions.port +'/webpack-dev-server.js"></script>')
	      	})
	      	.catch((err) => {
	      		console.log(err)
	      	})
      })
		}
		this.server = new Server(compiler, devOptions)
		this.server.listen(devOptions.port, devOptions.host, function(err) {
			if(err) throw err
			console.log(`Serving at: http:\/\/${devOptions.host}:${devOptions.port}`)
			const uri = createDomain(devOptions) + (devOptions.inline !== false || devOptions.lazy === true ? "/" : "/webpack-dev-server/")
			devOptions.open && open(uri + (devOptions.openPage || '')).catch(function() {
				console.log("Unable to open browser. If you are running in a headless environment, please do not use the open flag.")
			})
		})
		this.htmlWatcher.on('change', (file, stats) => {
			if(_.values(wpConfig.entry).length != _.values(getEntries([entryGlob, entryGlobPlus])).length){
				const old = wpConfig.entry
				const cur = getEntries([entryGlob, entryGlobPlus])
				let diff = {}
				for(const i in cur) {
					!old[i] && (diff[i] = cur[i])
				}
				for(const i in diff){
					compiler.apply(new SingleEntryPlugin(process.cwd(), diff[i], i))
				}
			}
		})
		return this
	}

	close (cb) {
		this.htmlWatcher.close()
		return this.server.close(cb)
	}
}


module.exports = Serve