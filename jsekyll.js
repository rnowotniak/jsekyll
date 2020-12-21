#!/usr/bin/env node
/**
 * Minimalistic Static-Site Generator (similar to Jekyll) but in JavaScript
 * 
 * @author Robert Nowotniak <rnowotniak@gmail.com> 2020
 * @file   This is the main program file
 */
'use strict';


const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { ArgumentParser } = require('argparse');
const { Liquid } = require('liquidjs');
const marked = require('marked');
const express = require('express');


const INPUT_FILES_REGEXP = /\.(html|htm|md)$/i;
const DEFAULT_DST_DIR = './_site'



let _suppressNotifications = false;
function fsChangeFnGen(dir) {
	return (eventType, filename) => {
		if (!filename) { return; }
		if (_suppressNotifications) { return; }
		_suppressNotifications = setTimeout(function() {
				_suppressNotifications=null }, 2000);

		console.log(`file changed ${eventType}: ${dir} / ${filename}`);
	}
}
fs.watch('tests/page1/', fsChangeFnGen('tests/page1'));
fs.watch('tests/page1/a',fsChangeFnGen('tests/page1/a'));


if (require.main !== module) {
	// run as module (require()'d / import()'ed file)
	return "??"; // XXX
}


// Parse arguments
const parser = new ArgumentParser({description:"Minimalistic Static-Site Generator (similar to Jekyll) but in JavaScript"});
parser.add_argument('--destination', '-d', { type:'string', help:'destination directory'});
parser.add_argument('--source', '-s', { type:'string', help:'Source directory'});

// server / server /s   parser
let subparsers = parser.add_subparsers({title:'subcommands'})
let parser_s = subparsers.add_parser('server', { aliases:['serve', 's'], help:'Serve your site locally'} )
parser_s.add_argument('-P', { help: 'Port to listen'})
parser_s.add_argument('-l', { action: 'store_true', help: 'Use LiveReload to automatically refresh browsers'})
parser_s.add_argument('-H', { help: 'Host to bind to'})
parser_s.set_defaults({subcommand:serve})

// build /b   parser
let parser_b = subparsers.add_parser('build', { aliases:['b'], help:'Build your site'} )
parser_b.set_defaults({subcommand:build});

let args = parser.parse_args();
const PORT = parseInt(args.P) || 4000;
const SRC_DIR = args.source || __dirname + '/src';
const DST_DIR = args.destination || DEFAULT_DST_DIR;

const liquid = new Liquid({root:SRC_DIR+'/_includes/', dynamicPartials:false});

// Register Liquid custom tags
liquid.registerTag('highlight', {
    render: function(scope, hash) {
	return '<pre><code>';
    }
});
liquid.registerTag('endhighlight', {
    render: function(scope, hash) {
        return '</code></pre>';
    }
});


// run the subcommand, respectively
args.subcommand(args)






function serve(args) {
	console.log('serving site');
	console.log(args);

	const app = express();

	app.get('/', (req,res) => {res.sendFile('index.html', {root:DEFAULT_DST_DIR})});
	app.use(express.static(DEFAULT_DST_DIR));
	app.listen(PORT).on('error', (err) => {
			console.log('Error: ' + err)
			process.exit(1)
			});
}


/*
 * For comparison: https://jekyllrb.com/docs/rendering-process/
 */
function buildFile(fname) {
	console.log('Building ' + fname);
	let rawfile = fs.readFileSync(`${SRC_DIR}/${fname}`, {encoding: 'utf8'});

	let rendered_page = rawfile;

	// process frontmatter
	let rawfile_arr = rendered_page.split('\n');
	let i = 0;
	let frontmatter = '';
	if (['---\r', '---'].includes(rawfile_arr[i++]) ) {
		// read frontmatter
		while (i < rawfile_arr.length) {
			if (['---\r', '---'].includes(rawfile_arr[i]) ) {
				break
			}
			frontmatter += rawfile_arr[i] + "\n";
			i += 1;
		}
		i += 1;
		//console.log("Frontmatter: " + frontmatter);
	}
	let y = yaml.safeLoad(frontmatter);
	if (!y) {
		i = 0;
	}
	// special handling for categories and tags
	if (y && y.tags && 'string' == typeof y.tags ) {
		y.tags = y.tags.trim().split(/ +/)
	}
	if (y && y.categories && 'string' == typeof y.categories ) {
		y.categories = y.categories.trim().split(/ +/)
	}
	process.stdout.write('Yaml: ');
	console.log(y);

	rawfile_arr = rawfile_arr.slice(i);
	rendered_page = rawfile_arr.join('\n'); // without front matter


	// TODO:  reading these files is repetable, should be extracted outside of this function
	// read _config.yml and _data/*.yml
	let config_yml = yaml.safeLoad(fs.readFileSync(`${SRC_DIR}/_config.yml`, {encoding: 'utf8'}));
	console.log(config_yml);
	let site = {...config_yml, data:{}}

	let dir = fs.opendirSync(SRC_DIR+'/_data');
	while (true) {
		let dirent = dir.readSync();
		if (!dirent) break;
		if (dirent.isFile() && dirent.name.endsWith('.yml')) {
			let data_name = path.basename(dirent.name, '.yml');
			//console.log('-> ' + data_name);
			let data = yaml.safeLoad(fs.readFileSync(`${SRC_DIR}/_data/${dirent.name}`, {encoding: 'utf8'}));
			//console.log(data);
			site.data[data_name] = data;
		}
	}
	dir.closeSync();


	// 1) Interpreting Liquid expressions in the file
	rendered_page = liquid.parseAndRenderSync(rendered_page,
			{page:y,site});
	//console.log(rendered_page);

	// 2) Unleashing the converters (markdown)
	if (fname.endsWith('.md')) {
		rendered_page = marked(rendered_page);
	}

	// 3) Populating the layouts
	let rendered_layout;
	const layout = config_yml.layout;
	if (layout) {
		rendered_layout = liquid.parseAndRenderSync(
				fs.readFileSync(`${SRC_DIR}/_layouts/${layout}.html`, {encoding: 'utf8'})
				, {page:y, site, content:rendered_page});
	} else {
		console.error("No layout specified");
		rendered_layout = rendered_page;
	}

	let dst_fname = `${DST_DIR}/${fname.replace(/\.md$/i, '.html')}`;
	fs.writeFileSync(dst_fname, rendered_layout);
}


function build(args) {
	console.log(`building site ${SRC_DIR} -> ${DST_DIR}`);
	console.log(args);

	let dir = fs.opendirSync(SRC_DIR);
	let fname;
	while (true) {
		let dirent = dir.readSync();
		if (!dirent) break;
		if (dirent.isFile() && dirent.name.match(INPUT_FILES_REGEXP)) {
			buildFile(dirent.name);
		}
	}
	dir.closeSync();
}




