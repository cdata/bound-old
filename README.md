# Bound

Bound is a static-file blog management utility, similar to [Jekyll][1]. Bound aims to provide similar static-file blogging support, with a focus on simplicity and ease of deployment.

## How does it work?

On your web server, you make a bare clone of your blog's git repository. You tell Bound two things: 1) the bare repository to use as your input, and 2) the location for Bound where bound should publish the repository (typically this would be your web root). Bound creates a post-receive hook in your repository so that it can automatically update when you push to it from elsewhere.

## How about an example?

First, make a bare clone of your blog repository:

    cdata-410s tmp/ シ git clone --bare git@github.com:cdata/bound-sample-blog.git
    Cloning into bare repository bound-sample-blog.git...
    remote: Counting objects: 26, done.
    remote: Compressing objects: 100% (18/18), done.
    remote: Total 26 (delta 3), reused 26 (delta 3)
    Receiving objects: 100% (26/26), done.
    Resolving deltas: 100% (3/3), done.

Then, compile it down to a static website with Bound:

    cdata-410s tmp/ シ bound -r ./bound-sample-blog.git -o ./blog-www -h
    Binding ./bound-sample-blog.git
    Creating post-receive hook at bound-sample-blog.git/hooks/post-receive
    ./bound-sample-blog.git has been bound.

Note that a post-receive hook as been created in the bare repo. This hook will activate Bound and republish the blog per the options in the original command every time you push to the git repository. An ls on the current directory shows that the static output has already been created:

    cdata-410s tmp/ シ ls -r *
    bound-sample-blog.git:
    refs  packed-refs  objects  info  hooks  HEAD  description  config  branches

    blog-www:
    robots.txt  page  index.html  humans.txt  entry

## How do I build my blog?

This will be documented further soon. For now, only the critical details will be available, as Bound is still in weekend project status. If you are the curious type, please refer to [the sample blog][3].

### Entries

Presently, Markdown is the only supported dialect for Bound entries. Support for more dialects will probably be added eventually.

#### Metadata

When Bound parses the markdown of an entry, it looks to see if the first item is a code block. If it is, it will parse it as newline-seperated key-value field. Consider this markdown "code" block:

    Title: Remember, remember
    Date: November 5th, 2012
    Author: V

If this were to appear at the top of an entry, Bound will parse it as metadata, remove it from the entry, and feed it to the entry's template as it is being compiled. The metadata would is represented to the template as:

    {
        title: "Remember, remember",
        date: "November 5th, 2012",
        author: "V"
    }

### Templates

The current templating mechanism supported by Bound is [Swig][4]. Two templates, index.html and entry.html, are required. An optional 'partials' directory will be searched at build time, and any templates found there will also be compiled. Please refer to [Swig's documentation][4] if you have questions about how templating works.

## Why should I use this instead of WordPress?

The static blogging workflow provided by [Jekyll][1] is awesome. You author your content in a format like [Markdown][2] You push to a git repository, and a post-receive hook in your git repository causes your git repository to be compiled down to a static HTML website. You can write articles with any text editor on any platform, and publish from anywhere without any of the server-side overhead of a dynamic, database driven framework. Among other benefits, tools like this allow one to host a really rich, easily-managed website within very tight hardware constraints (like a cheap cloud server, for instance).

## Why should I use this instead of Tumblr / Posterous / Xanga?

You can hand over syndication and / or ownership of your content to whoever you deem worthy.

[1]: http://tom.preston-werner.com/jekyll/
[2]: http://daringfireball.net/projects/markdown/
[3]: http://github.com/cdata/bound-sample-blog/
[4]: http://paularmstrong.github.com/swig/
