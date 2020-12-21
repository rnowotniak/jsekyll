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
parser.add_argument('--destination', '-d', { metavar:'dst_dir', type:'string', help:'destination directory'});
parser.add_argument('--source', '-s', { metavar:'src_dir', type:'string', help:'Source directory'});

let subparsers = parser.add_subparsers()
let parser_s = subparsers.add_parser('s', { aliases:['server', 'serve'], help:'Serve your site locally'} )
// Bug:  argparse seems not to support subparser metavar
parser_s.add_argument('-P', { help: 'Port to listen'})
parser_s.add_argument('-l', { action: 'store_true', help: 'Use LiveReload to automatically refresh browsers'})
parser_s.add_argument('-H', { help: 'Host to bind to'})

let parser_b = subparsers.add_parser('b', { help:'Build your site'} )

let args = parser.parse_args();

console.log(args)

const PORT = parseInt(args.P) || 4000;
const SRC_DIR = args.source || __dirname + '/src';



let { Liquid } = require('liquidjs');
let liquid = new Liquid();
let template_variables = {name:'ro**be**rt _n_'}


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

app.get('/', (req,res) => {

	console.log(`Re-rendering file ${fname}`)
	let rawfile = fs.readFileSync(`${SRC_DIR}/${fname}`, {encoding: 'utf8'});

	// the order makes some difference here (liquid or marked first)
	let rendered = rawfile;
	rendered = liquid.parseAndRenderSync(rendered, template_variables);
	rendered = marked(rendered);

	res.send('<html><body>' +new Date(Date.now()).toLocaleString() +rendered
		+ LIVE_RELOAD + '</body></html>')
});


app.listen(PORT).on('error', (err) => {
		console.log('Error: ' + err)
		process.exit(1)
		})


