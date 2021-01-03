# JSekyll - minimalistic Static Site Generator in JavaScript

Contact: Robert Nowotniak <<rnowotniak@gmail.com>>

Only subset of Jekyll is supported.  Simplified,
but thants to its simplicity it allows to keep all processing under control.

## Implemented features

* Two modes: build / serve
* MarkDown support with Marked lib
* Liquid templates support (LiquidJS)
* Live Reload (browser-sync)
* load data from _data/*.yml
* process files selectively
* page variables:   {{ page.var }}
* _layouts
* _config.yml (to liquid vars  site.var)
* generate actual files (_site/....)
* multi-files support
* frontmatter - done
* include - PoC done
* liquid templates - POC done
* livereload - POC done

Conventions (similar to Jekyll):
* layout _layouts/lay1
* include _includes/inc1(.html)  ?


Structure:
* /img
* /404.html

* /_posts
* /_layout
* /assets ???
* _config.yml
* _data/
* _includes
* /_site

## TODO perhaps some day in the future
* themes
* plugins

## TODO

* fix 'serve' subcommand

* permalink / routing / URLs
* additional liquid tags:  { % link _posts/020302-fasd.md % } { % post_url % }
* files structure (other that Jekyll's _/post/YYYY-MM-DD-....) - what then?

Caveat: JSekyll is inspired with Jekyll and mimics large part of Jekyll,
but it is far from 100% compabitle.


## Not supported and not planned
Simply because I was never using these in Jekyll:
* SCSS

## References

* https://jekyllrb.com/  -  Jekyll SSG, which inspired this work
* https://nextjs.org/  - another SSG in JavaScript (React SSG)
* https://css-tricks.com/building-a-blog-with-next-js/ (Next.js tutorial)
