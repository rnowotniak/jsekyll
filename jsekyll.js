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
 *
 * Warning: it updates 'site' array! (tags, categories)
 *    (TODO: remove this functionality. This would require a second run over all files anyway)
 */
function buildFile(fname, site) {
	console.log('-> Processing ' + fname);

	// TODO:  here distinsuish  .htm(l) / .md / others


	let rawfile = fs.readFileSync(`${SRC_DIR}/${fname}`, {encoding: 'utf8'});
	let rendered_page = rawfile;

	// process frontmatter
	let rawfile_arr = rendered_page.split('\n');
	let i = 0;
	let frontmatter_text = '';
	if (['---\r', '---'].includes(rawfile_arr[i++]) ) {
		// read frontmatter
		while (i < rawfile_arr.length) {
			if (['---\r', '---'].includes(rawfile_arr[i]) ) {
				break
			}
			frontmatter_text += rawfile_arr[i] + "\n";
			i += 1;
		}
		i += 1;
		//console.log("Frontmatter: " + frontmatter_text);
	}
	let frontmatter = yaml.safeLoad(frontmatter_text);
	if (!frontmatter) {
		i = 0;
	}
	// special handling for categories and tags
	if (frontmatter && frontmatter.tags && 'string' == typeof frontmatter.tags ) {
		frontmatter.tags = frontmatter.tags.trim().split(/ +/)
		site.tags.push(frontmatter.tags)
	}
	if (frontmatter && frontmatter.categories && 'string' == typeof frontmatter.categories ) {
		frontmatter.categories = frontmatter.categories.trim().split(/ +/)
		site.categories.push(frontmatter.categories)
	}
	process.stdout.write('Yaml: ');
	console.log(frontmatter);

	rawfile_arr = rawfile_arr.slice(i);
	rendered_page = rawfile_arr.join('\n'); // without front matter




	// 1) Interpreting Liquid expressions in the file
	rendered_page = liquid.parseAndRenderSync(rendered_page,
			{page:frontmatter,site});
	//console.log(rendered_page);

	// 2) Unleashing the converters (markdown)
	if (fname.endsWith('.md')) {
		rendered_page = marked(rendered_page);
	}

	// 3) Populating the layouts
	let output_text;
	const layout = site.layout;
	if (layout) {
		output_text = liquid.parseAndRenderSync(
				fs.readFileSync(`${SRC_DIR}/_layouts/${layout}.html`, {encoding: 'utf8'})
				, {page:frontmatter, site, content:rendered_page});
	} else {
		console.error("No layout specified");
		output_text = rendered_page;
	}

	// Generate the output destination path
	let dst_path;
	if (frontmatter && frontmatter.permalink) {
		// permalink was specified
		let bname = path.basename(frontmatter.permalink).toLowerCase();
		if (bname.endsWith('.html') || bname.endsWith('.htm')) {
			dst_path = DST_DIR + '/' + frontmatter.permalink;
		}
		else {
			let dir = `${DST_DIR}/${frontmatter.permalink}`;
			try {
				fs.mkdirSync(dir, {recursive:true});
			} catch (err) {
				if (err.code != 'EEXIST') {
					throw(err);
				}
			}
			dst_path = dir + '/index.html';
		}
	}
	else if (fname.match(/\.html?$/i)) {
		console.log('html file');
		dst_path = `${DST_DIR}/${fname}`; // TODO: This is disputable
	}
	else if (fname.match(/\.md$/)) {
		let dir = `${DST_DIR}/${fname.replace(/\.md$/i, '')}`;
		try {
			fs.mkdirSync(dir);
		} catch (err) {
			if (err.code != 'EEXIST') {
				throw(err);
			}
		}
		dst_path = dir + '/index.html';
	}

	console.log('Writing ' + dst_path);
	fs.writeFileSync(dst_path, output_text);
}


function build(args) {
	console.log(`building site ${SRC_DIR} -> ${DST_DIR}`);
	console.log(args);

	console.log('Loading _config.yml and _data/*.yml');

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

	console.log('---');

	let srcdir_fd = fs.opendirSync(SRC_DIR);
	let fname;
	while (true) {
		let dirent = srcdir_fd.readSync();
		if (!dirent) break;
		if (dirent.isFile() && dirent.name.match(INPUT_FILES_REGEXP)) {
			buildFile(dirent.name, site);
		}
	}
	srcdir_fd.closeSync();
	process.exit(0);
}




