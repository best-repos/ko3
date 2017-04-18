#!/usr/bin/env node
var program = require('commander');
var shelljs = require('shelljs');
var npmview = require('npmview');
var fs = require('fs');
var path = require('path');
var chalk = require('chalk');
var processPath = process.cwd();
var initDir = require('./lib/initDir.js');
var inquirer = require('inquirer');
function findWebpackRoot(thePath){
	if(thePath == path.join(thePath, '../')){
		return null;
	}
	if(fs.existsSync(path.join(thePath, 'webpack.config.js'))){
		return thePath;
	}else{
		return findWebpackRoot(path.join(thePath, '../'));
	}
}

function getScriptParam(prj){
	if(prj){
		return ' -- --prj="' + prj + '"';
	}
	return '';
}

function getPkgVersion(){
	var info = {};
	try {
		info = JSON.parse(String(fs.readFileSync(path.join(__dirname, 'package.json'))));
	}catch(e){

	}
	return info.version;
}

function setPkgVersion(version){
	var info = {};
	try {
		info = JSON.parse(String(fs.readFileSync(path.join(__dirname, 'package.json'))));
	}catch(e){

	}
	info.version = version;
	fs.writeFileSync(path.join(__dirname, 'package.json'), JSON.stringify(info))
}
function versionToNum(version){
	var _r = version.split('.'),
		t = 0;

	for(var i=_r.length - 1; i >= 0; i--){
		t += _r[i] * Math.pow(10, _r.length - i - 1)
	}
	return t;
}

var conf,
	webpackRoot = findWebpackRoot(processPath);

program
	.command('init [app]')
	.description('create a new app with a template')
	.action(function(app){
		shelljs.exec( 'git clone ' + 'git@git.jd.com:ko-templates/' + 'default' + '.git ' + app );
		shelljs.exec( 'rm -rf ' + app + '/.git' );
		console.log(chalk.gray(app + ' was created! To run your app:'))
		console.log('    ' + ('cd ./' + app))
		console.log('    ' + ('npm install'))
		console.log('    ' + ('ko serve helloworld'))
	})


program
	.command('new [name]')
	.alias('n')
	.description('Create a new project or file')
	.option('-p, --page', 'create a new html file')
	.action(function(name, option){
		if(!option.page){
			var _dir = {};
				_dir[name] = conf.moduleInit.newPrj;
			if(fs.existsSync(path.join(webpackRoot, 'page', name))){
				console.log(chalk.red('    Warn: The project already exists.'));
			}else{
				initDir(_dir, path.join(webpackRoot, 'page'), webpackRoot);
				console.log(chalk.green(name + ' created!'))
			}
		}else{
			var _dir = {}
				_tarName = name + '.shtml';
				_dir[_tarName] = conf.moduleInit.newHtml;
			if(fs.existsSync(path.join(processPath, _tarName))){
				console.log(chalk.red('    Warn: The file already exists.'));
			}else{
				initDir(_dir, processPath, webpackRoot)
				console.log(chalk.green(_tarName + ' created!'))
			}
		}
	})

program
	.command('serve [project]')
	.alias('s')
	.description('Serve the project at localhost:9000')
	.action(function(project){
		shelljs.exec( 'cd ' + webpackRoot );
		shelljs.exec( 'npm run dev' + getScriptParam(project) );
	})

program
	.command('build [project]')
	.alias('b')
	.option('-p, --publish', 'publish the project after build')
	.description('Build the project')
	.action(function(project, option){
		shelljs.exec( 'npm run build' + getScriptParam(project) )
		if(option.publish){
			shelljs.exec( 'npm run pub' + getScriptParam(project) )
		}
	})

program
	.command('debug [project]')
	.alias('d')
	.description('The same as run webpack watch')
	.action(function(project){
		shelljs.exec( 'npm run debug' + getScriptParam(project) )
	})

program
	.command('load')
	.alias('l')
	.action(function(project){
		shelljs.exec( 'npm run load' )
	})

program
	.command('update')
	.alias('u')
	.action(function(project){
		shelljs.exec( 'npm update -g ko2' )
		shelljs.exec( 'npm update' )
	})

program
	.command('*')
	.action(function(){
		console.log("Invalid command. See 'ko --help'.")
	})

program
	.on('--help', function(){
		console.log('  Examples:');
	    console.log('');
	    console.log('    $ ko new projectName');
	    console.log('    $ ko new --page pageName');
	    console.log('    $ ko serve projectName');
	    console.log('    $ ko build --publish projectName');
	    console.log('');
	})

program
	.version(getPkgVersion())

var needConfCmd = {
	'new': true,
	'serve': true,
	'build': true,
	'load': true,
	'debug': true,
	'update': true
};

if(process.argv.slice(2)[0] && needConfCmd[process.argv.slice(2)] && !webpackRoot){
	console.log( chalk.red("    ERR: Invalid project. Check the path!") );
}else {
	npmview('ko2', function(err, version, moduleInfo) {
    	if (!err) {
	    	var currentPkgVersion = getPkgVersion();
		    if(versionToNum(currentPkgVersion) < versionToNum(version)){
		    	
		    	var prompt = [];
			      prompt.push({
			        type: 'confirm',
			        name: 'isUpdate',
			        message: 'The lastest version is ' + version + '. Do you want to update?',
			        default: true
			      });
			      inquirer.prompt(prompt).then(function (answers) {
			        if (answers.isUpdate) {
			          console.log();
			          console.log(chalk.green('  updating...'));
			          shelljs.exec( 'npm update -g ko2' );	
			          shelljs.exec( 'npm update' );	
		    				shelljs.exec('ko ' + process.argv.slice(2).join(' '))
			        } else {
			          setPkgVersion(version)
			          shelljs.exec('ko ' + process.argv.slice(2).join(' '))
			        }
			      });	

		    	return;
		    }
	    }

	  webpackRoot && (conf = require(path.join(webpackRoot, 'webpack.config.js')));
		program.parse(process.argv);
		if (!process.argv.slice(2).length) {
			program.outputHelp();
		}

	});
}