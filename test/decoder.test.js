var Lab = require('lab');
var lab = exports.lab = Lab.script();

var describe = lab.describe;
var it = lab.it;
//var before = lab.before;
//var after = lab.after;
var Code = require('code');   // assertion library
var expect = Code.expect;


var debug = require('debug')('mdns:test:decoder');

var decoder = require('../lib/decoder');
var dns = require('mdns-js-packet');
var DNSPacket = dns.DNSPacket;
var path = require('path');
var fs = require('fs');

var Schemas = require('./schemas');

var fixtureFolder = path.join(__dirname, 'fixtures');
var fixturesFolderDecoded = path.join(fixtureFolder, 'decoded-sections');
var fixturesFolderMessages = path.join(fixtureFolder, 'decoded-messages');

//shamelessly borrow from mdns-js-packet
var fixturesPacket = path.join('.', 'node_modules',
  'mdns-js-packet', 'test', 'fixtures');

var path = require('path');

var helper = require('./helper');

function testDecodeSection (binFolder, jsFolder) {
  var files = fs.readdirSync(binFolder).filter(function (f) {
    return /\.bin$/.test(f);
  });

  files.forEach(function (file) {
    it('decode ' + file, function (done) {
      var djsFile = path.join(jsFolder,  file.replace('.bin', '.js'));
      var binFile = path.join(binFolder, file);
      var djsExists = fs.existsSync(djsFile);

      var b = helper.readBin(binFile);
      expect(b).to.exist(b);
      var packet = DNSPacket.parse(b);
      var obj = {
        question: {},
        answer: {},
        authority: {},
        additional: {}
      };
      var count = 0;
      var expected = 0;
      for (var key in obj) {
        expected++;
        if (!obj.hasOwnProperty(key)) {continue;}
        decoder.decodeSection(packet, key, obj[key]);
        if (Schemas.hasOwnProperty(key)) {
          Schemas.validate(obj[key], Schemas[key], validateSchema);
        }
        else {
          throw new Error('Missing schema ' + key);
        }
      }

      function validateSchema(err) {
        if (err) {
          console.log(key, obj[key]);
          console.log('packet', packet);
          if (!djsExists) {
            helper.writeJs(djsFile, obj);
          }
          throw err;
        }
        count++;
      }

      if (!djsExists) {
        helper.writeJs(djsFile, obj);
      }
      else {
        var dj = helper.readJs(djsFile);
        helper.equalDeep(dj, obj);
      }
      setTimeout(function () {
        if (count >= expected) {
          done();
        }
        else {
          done('all schemas not validated');
        }
      }, 50);


    });//--decode...
  });
}


function testDecodeMessage (binFolder, jsFolder) {
  var files = fs.readdirSync(binFolder).filter(function (f) {
    return /\.bin$/.test(f);
  });

  files.forEach(function (file) {
    it('decode ' + file, function (done) {
      var djsFile = path.join(jsFolder,  file.replace('.bin', '.js'));
      var binFile = path.join(binFolder, file);

      var b = helper.readBin(binFile);


      var obj = decoder.decodeMessage(b);

      if (!fs.existsSync(djsFile)) {
        helper.writeJs(djsFile, obj);
      }
      else {
        var dj = helper.readJs(djsFile);
        helper.equalDeep(dj, obj);
      }

      done();
    });//--decode...
  });
}

describe('decoder', function () {
  describe('decodeSection', function () {
    testDecodeSection(fixturesPacket, fixturesFolderDecoded);
  });

  describe('decodeMessage', function () {
    testDecodeMessage(fixturesPacket, fixturesFolderMessages);
  });

  describe('decodeMessage - workstation', function () {
    testDecodeMessage(fixtureFolder, fixtureFolder);
  });

  it('should decode', function (done) {
    var ret;
    var b = helper.readBin(path.join(
      __dirname,
      'fixtures',
      'mdns-readynas.bin'
    ));
    var packet = DNSPacket.parse(b);
    debug('packet', helper.createJs(packet));
    var obj = {};
    ret = decoder.decodeSection(packet, 'question', obj);
    expect(ret).to.be.equal(false);

    ret = decoder.decodeSection(packet, 'answer', obj);
    expect(ret).to.be.ok;
    expect(obj).to.include('type');
    expect(obj.type).to.have.length(13);
    obj.type.forEach(function (t) {
      expect(t).to.be.a.object(); //('object');
      expect(t).to.include(['name', 'protocol', 'subtypes']);
      expect(t.protocol).to.equal('tcp');

      //expect(t.subtypes).to.equal([]);
      expect(t.name.length).to.be.above(2);
    });
    debug('ret: %s, obj', ret, obj);
    done();
  });
});

