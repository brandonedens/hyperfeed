const tape = require('tape')
const Feed = require('feed')
const FeedParser = require('feedparser')
const toStream = require('string-to-stream')
const {createFeed, createFeedWithFixture} = require('./helpers')

tape('ready', function (t) {
  createFeed((err, f) => {
    t.error(err)
    t.ok(f.key)
    t.ok(f.discoveryKey)
    t.end()
  })
})

tape('update', function (t) {
  createFeedWithFixture((err, f) => {
    t.error(err)
    f.archive.readdir('/', function (err, entries) {
      t.error(err)
      t.same(entries, [ 'metadata.json', 'id-0', 'id-1', 'id-2', 'id-3', 'id-4', 'id-5', 'id-6', 'id-7', 'id-8', 'id-9' ])
      t.end()
    })
  })
})

tape('list', function (t) {
  createFeedWithFixture((err, f) => {
    t.error(err)
    f.list((err, entries) => {
      t.error(err)
      t.same(entries, [ 'id-0', 'id-1', 'id-2', 'id-3', 'id-4', 'id-5', 'id-6', 'id-7', 'id-8', 'id-9' ])
      t.end()
    })
  })
})

tape('update same items', function (t) {
  var feed2 = new Feed({
    title: 'test feed',
    description: 'http://example.com',
    link: 'http://example.com'
  })
  for (var i = 0; i < 10; i++) {
    var x = {
      title: `entry${i}`,
      description: `desc${i}`,
      url: 'example.com',
      guid: `id-${i}`,
      date: new Date()
    }
    feed2.addItem(x)
  }

  createFeedWithFixture((err, f) => {
    t.error(err)
    // update with the same feed
    f.update(toStream(feed2.render('rss-2.0')), (err, f) => {
      t.error(err)
      f.list((err, entries) => {
        t.error(err)
        t.same(entries.length, 10)
        t.end()
      })
    })
  })
})

tape('update with new item', function (t) {
  var feed2 = new Feed({
    title: 'test feed',
    description: 'http://example.com',
    link: 'http://example.com'
  })
  for (var i = 0; i < 10; i++) {
    var x = {
      title: `entry${i}`,
      description: `desc${i}`,
      url: 'example.com',
      guid: `id-${i}`,
      date: new Date()
    }
    feed2.addItem(x)
  }
  // add a new item
  feed2.addItem({
    title: `entry${10}`,
    description: `desc${10}`,
    url: 'example.com',
    guid: `id-${10}`,
    date: new Date()
  })

  createFeedWithFixture((err, f) => {
    t.error(err)
    f.update(toStream(feed2.render('rss-2.0')), (err, f) => {
      t.error(err)
      f.list((err, entries) => {
        t.error(err)
        t.same(entries.length, 11)
        t.end()
      })
    })
  })
})

tape('save', function (t) {
  createFeed((err, f) => {
    t.error(err)

    f.save({title: 'moo'}, err => {
      t.error(err)
      f.list((err, entries) => {
        t.error(err)
        f.get(entries[0], (err, item) => {
          t.error(err)

          t.ok(item) // should have default name(guid)
          t.end()
        })
      })
    })
  })
})

tape('get not found', function (t) {
  createFeed((err, f) => {
    t.error(err)
    f.get('non-exists', (err, item) => {
      t.ok(err)
      t.notok(item)
      t.end()
    })
  })
})

tape('save with pre-scrapped data', function (t) {
  createFeed((err, f) => {
    t.error(err)

    f.save({title: 'foo'}, 'abc', err => {
      t.error(err)

      f.list((err, files) => {
        t.error(err)
        t.ok(files[0])
        t.same(files.length, 1)
        f.get(files[0], (err, item) => {
          t.error(err)

          t.same(JSON.parse(item.toString()).title, 'foo')
          f.get(`scrapped/${files[0]}`, (err, data) => {
            t.error(err)
            t.same(data.toString(), 'abc')
            t.end()
          })
        })
      })
    })
  })
})

tape('export', function (t) {
  createFeedWithFixture((err, f) => {
    t.error(err)
    f.export(10, (err, xml) => {
      t.error(err)

      var parser = new FeedParser()
      toStream(xml).pipe(parser)

      var entries = []
      parser.on('error', e => t.error(e))
      parser.on('meta', meta => {
        t.same(meta.title, 'test feed')
        t.same(meta.link, 'http://example.com')
      })
      parser.on('data', entry => {
        entries.push(entry)
      })
      parser.on('end', () => {
        t.same(entries.map(x => x.title).sort(), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => `entry${i}`))
        t.end()
      })
    })
  })
})

tape('set meta', function (t) {
  createFeed((err, f) => {
    t.error(err)

    f.setMeta({
      title: 'foo',
      description: 'http://example2.com',
      link: 'http://example2.com'
    }, (err) => {
      t.error(err)

      f.export(10, (err, xml) => {
        t.error(err)

        var parser = new FeedParser()
        toStream(xml).pipe(parser)

        parser.on('error', e => t.error(e))
        parser.on('meta', meta => {
          t.same(meta.title, 'foo')
          t.same(meta.link, 'http://example2.com')
          t.same(meta.description, 'http://example2.com')
        })
        parser.on('data', entry => {
          // ignore entry, we still need this handler to consume the feed and trigger end event
        })
        parser.on('end', () => {
          t.end()
        })
      })
    })
  })
})
