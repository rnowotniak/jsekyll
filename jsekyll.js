#!/usr/bin/env node
/**
 * Minimalistic Static-Site Generator (similar to Jekyll) but in JavaScript
 * 
 * @author Robert Nowotniak <rnowotniak@gmail.com> 2020
 * @file   This is the main program file
 */
'use strict';


const fs = require('fs')
const { ArgumentParser } = require('argparse');


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
parser.add_argument('--source', '-s', { metavar:'src_dir', type:'string', help:'Source directory'});

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

function build(args) {
	console.log('building site to ' + DST_DIR)
	console.log(args)
	process.exit(0)
}

let parser_b = subparsers.add_parser('build', { aliases:['b'], help:'Build your site'} )
parser_b.set_defaults({func:build})

let args = parser.parse_args();
const PORT = parseInt(args.P) || 4000;
const SRC_DIR = args.source || __dirname + '/src';
const DST_DIR = args.destination || __dirname + '/_site';

args.func(args)



let { Liquid } = require('liquidjs');
let liquid = new Liquid();
let template_variables = {name:'ro**be**rt _n_', posts:['post1', 'post2', 'PoST3']}


const express = require('express');
const app = express();

const LIVE_RELOAD = `
<script id="__bs_script__">//<![CDATA[
    document.write("<script async src='http://HOST:3000/browser-sync/browser-sync-client.js?v=2.26.13'><\\/script>".replace("HOST", location.hostname));
//]]></script>
`.trim()

const marked = require('marked')

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


const yaml = require('js-yaml');

app.get('/', (req,res) => {

	console.log(`Re-rendering file ${fname}`)
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

	res.send('<html><body>' +new Date(Date.now()).toLocaleString() +rendered
		+ LIVE_RELOAD + '</body></html>')
});


app.listen(PORT).on('error', (err) => {
		console.log('Error: ' + err)
		process.exit(1)
		})


