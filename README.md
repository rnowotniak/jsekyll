# Minimalistic SSG

Only subset of Jekyll is supported.  Sipmlified,
but due to simplicity allows to keep all processing under control.

## TODO

* load data from _data/*.yml
* fix 'serve' subcommand

* permalink / routing / URLs
* additional liquid tags:  { % link _posts/020302-fasd.md % } { % post_url % }
* files structure (other that Jekyll's _/post/YYYY-MM-DD-....) - what then?

Caveat: JSekyll is inspired with Jekyll and mimics large part of Jekyll,
but it is far from 100% compabitle.

## Not supported and not planned

Simply because I was never using these in Jekyll:
* SCSS

## Done

* MarkDown support with Marked lib
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
* layot _layouts/lay1(.html)  ?
* include _includes/inc1(.html)  ?


* structure:
/img
/404.html

/_posts
/_layout
/assets ???
_config.yml
_data/
_includes
/_site


### TODO perhaps some day in the future

* themes
* plugins

