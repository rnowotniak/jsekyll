---
title: debug
---
# debug info

<h2>List of all pages</h2>

<ul>
{% for page in site.pages %}
	<li><a href="{{ page.url }}">{{ page.url }}</a></li>
{% endfor %}
</ul>

<hr/>

<pre>
    <b>{{ "tEsT test" | upcase }}</b>

    <b>{{ page.name }}</b>

    <b>{{ page.myval }}</b>

    {{ page | escape }}
</pre>

{% highlight python linenos %}
import blala
a = 'asf'.toupper()
for x in xrange(5):
	print(x)
{% endhighlight %}

<hr/>

<h2>All categories:</h2>

<ul>
{% for category in site.categories %}
<li>{{ category | first }}</li>
{% endfor %}
</ul>


<h2>All tags:</h2>

<ul>
{% for tag in site.tags %}
<li>{{ tag | first }}</li>
{% endfor %}
</ul>

<h2>All static files</h2>
<pre>
{% for f in site.static_files %}{{ f.path }}
{% endfor %}
</pre>
