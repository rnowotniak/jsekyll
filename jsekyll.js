#!/usr/bin/env node
/**
 * Minimalistic Static-Site Generator (similar to Jekyll) but in JavaScript
 * 
 * @author Robert Nowotniak <rnowotniak@gmail.com> 2020
 * @file   This is the main program file
 */
'use strict';


const fs = require('fs')
const yaml = require('js-yaml');
const { ArgumentParser } = require('argparse');
const { Liquid } = require('liquidjs');
const marked = require('marked')
const express = require('express');
const app = express();

let template_variables = {name:'ro**be**rt _n_', posts:['post1', 'post2', 'PoST3']}


let fsTimeout = false;
function fsChangeFnGen(dir) {
	return (eventType, filename) => {
		if (!filename) { return; }
		if (fsTimeout) { return; }
		fsTimeout = setTimeout(function() { fsTimeout=null }, 2000);

		console.log(`event type is: ${eventType}`);
		console.log(`filename provided: ${dir} / ${filename}`);
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

let subparsers = parser.add_subparsers({title:'subcommands'})
let parser_s = subparsers.add_parser('server', { aliases:['serve', 's'], help:'Serve your site locally'} )
// Bug:  argparse seems not to support subparser metavar
parser_s.add_argument('-P', { help: 'Port to listen'})
parser_s.add_argument('-l', { action: 'store_true', help: 'Use LiveReload to automatically refresh browsers'})
parser_s.add_argument('-H', { help: 'Host to bind to'})
parser_s.set_defaults({func:serve})

const DEFAULT_DST_DIR = './_site'

function serve(args) {
	console.log('serving site')
	console.log(args)
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

	// read _config.yml
	let config_yml = yaml.safeLoad(fs.readFileSync(`${SRC_DIR}/_config.yml`, {encoding: 'utf8'}))
	console.log(config_yml);
	//process.exit(0)

	// 1) Interpreting Liquid expressions in the file
	rendered_page = liquid.parseAndRenderSync(rendered_page,
			{page:y,site:config_yml});

	// 2) Unleashing the converters (markdown)
	rendered_page = marked(rendered_page);

	// 3) Populating the layouts
	const layout = 'rn2020-default' // TODO: take from _config.yml -> layout
	let rendered_layout = liquid.parseAndRenderSync(
	fs.readFileSync(`${SRC_DIR}/_layouts/${layout}.html`, {encoding: 'utf8'})
	, {page:y, site:config_yml, content:rendered_page});

	let dst_fname = `${DST_DIR}/${fname.replace(/\.md$/i, '.html')}`;
	fs.writeFileSync(dst_fname, rendered_layout);
}

function build(args) {
	console.log(`building site ${SRC_DIR} -> ${DST_DIR}`)
	console.log(args)

	let dir = fs.opendirSync(SRC_DIR);
	let fname;
	while (true) {
		let dirent = dir.readSync();
		if (!dirent) break;
		if (dirent.isFile()) {
			buildFile(dirent.name);
		}
	}
	dir.closeSync()

	process.exit(0)
}

let parser_b = subparsers.add_parser('build', { aliases:['b'], help:'Build your site'} )
parser_b.set_defaults({func:build})

let args = parser.parse_args();
const PORT = parseInt(args.P) || 4000;
const SRC_DIR = args.source || __dirname + '/src';
const DST_DIR = args.destination || __dirname + '/_site';

const liquid = new Liquid({root:SRC_DIR+'/_includes/', dynamicPartials:false});

args.func(args)


const LIVE_RELOAD = `
<script id="__bs_script__">//<![CDATA[
    document.write("<script async src='http://HOST:3000/browser-sync/browser-sync-client.js?v=2.26.13'><\\/script>".replace("HOST", location.hostname));
//]]></script>
`.trim()


let dir = fs.opendirSync(SRC_DIR);
let fname;
while (true) {
	let dirent =dir.readSync();
	if (!dirent) break;
	if (dirent.isFile()) {
		fname = dirent.name;
	}
}
dir.closeSync()



app.get('/', (req,res) => {

	console.log(`Re-rendering file ${fname}`)

	/***** CUT THIS *******/  /* dont do any improvements here */
		let rawfile = fs.readFileSync(`${SRC_DIR}/${fname}`, {encoding: 'utf8'});

		// the order makes some difference here (liquid or marked first)
		let rendered = rawfile;
		let rawfile_arr = rendered.split('\n')
		let i = 0;
		let frontmatter = ''
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
			console.log("Frontmatter: " + frontmatter);
		}
		let y = yaml.safeLoad(frontmatter)

		// special handling for categories and tags
		if ('string' == typeof y.tags ) {
			y.tags = y.tags.trim().split(/ +/)
		}
		if ('string' == typeof y.categories ) {
			y.categories = y.categories.trim().split(/ +/)
		}

		process.stdout.write('Yaml: ')
		console.log(y)

		rawfile_arr = rawfile_arr.slice(i)
		rendered = rawfile_arr.join('\n')

		rendered = liquid.parseAndRenderSync(rendered, template_variables);
		rendered = marked(rendered);
	/***** UNTIL HERE  *******/

	res.send('<html><body>' +new Date(Date.now()).toLocaleString() +rendered
		+ LIVE_RELOAD + '</body></html>')
});


app.listen(PORT).on('error', (err) => {
		console.log('Error: ' + err)
		process.exit(1)
		})


