/**
 * Created by hzamir on 6/16/15.
 */

var should = require('chai').should();

var th = require('../th-utils');
var logger = th.Logger;

var isFunction   =  th.isFunction;
var isObject     =  th.isObject;
var isAlien      =  th.isAlien;
var isArray      =  th.isArray;
var isBoolean    =  th.isBoolean;
var isNull       =  th.isNull;
var isNumber     =  th.isNumber;
var isString     =  th.isString;
var isUndefined  =  th.isUndefined;

var sprintf = th.sprintf;

var sample = {
  kArray: [],
  kObject: {},
  kFunction: function() {},
  kString: 'hello',
  kBoolean: false,
  kNull: null,
  kNumber:1.0,
  kUndefined:undefined
};





describe('#isNumber', function() {
  it('tests if val is a number', function () {
    isNumber(sample.kNumber).should.equal(true);

    isNumber(NaN).should.equal(false);
    isNumber(sample.kArray).should.equal(false);
    isNumber(sample.kNull).should.equal(false);
    isNumber(sample.kObject).should.equal(false);
    isNumber(sample.kString).should.equal(false);
    isNumber(sample.kBoolean).should.equal(false);
    isNumber(sample.kFunction).should.equal(false);
    isNumber(sample.kUndefined).should.equal(false);


  });
});

describe('#isFunction', function() {
  it('tests if val is a function', function () {

    isFunction(sample.kNumber).should.equal(false);
    isFunction(NaN).should.equal(false);
    isFunction(sample.kArray).should.equal(false);
    isFunction(sample.kNull).should.equal(false);
    isFunction(sample.kObject).should.equal(false);
    isFunction(sample.kString).should.equal(false);
    isFunction(sample.kBoolean).should.equal(false);
    isFunction(sample.kFunction).should.equal(true);
    isFunction(sample.kUndefined).should.equal(false);

  });
});


describe('#isObject', function() {
  it('tests if val is an object', function () {

//    isObject(sample.kNumber).should.equal(false);
//    isObject(NaN).should.equal(false);
//    isObject(sample.kArray).should.equal(false);
//    isObject(sample.kNull).should.equal(false);
//    isObject(sample.kObject).should.equal(true);
//    isObject(sample.kString).should.equal(false);
//    isObject(sample.kBoolean).should.equal(false);
//    isObject(sample.kFunction).should.equal(false);
//    isObject(sample.kUndefined).should.equal(false);

  });
});


describe('#isArray', function() {
  it('tests if val is an array', function () {
//    isArray(sample.kArray).should.equal(true);
//
//    isArray(sample.kNumber).should.equal(false);
//    isArray(NaN).should.equal(false);
//    isArray(sample.kNull).should.equal(false);
//    isArray(sample.kObject).should.equal(false);
//    isArray(sample.kString).should.equal(false);
//    isArray(sample.kBoolean).should.equal(false);
//    isArray(sample.kFunction).should.equal(false);
//    isArray(sample.kUndefined).should.equal(false);
  });
});


describe('#isString', function() {
  it('tests if val is a string', function () {
    isString(sample.kString).should.equal(true);

    isString(sample.kNumber).should.equal(false);
    isString(NaN).should.equal(false);
    isString(sample.kArray).should.equal(false);
    isString(sample.kNull).should.equal(false);
    isString(sample.kObject).should.equal(false);
    isString(sample.kBoolean).should.equal(false);
    isString(sample.kFunction).should.equal(false);
    isString(sample.kUndefined).should.equal(false);
  });
});


describe('#isBoolean', function() {
  it('tests if val is a boolean', function () {
//    isBoolean(true).should.equal(true);
//    isBoolean(false).should.equal(false);
//
//    isBoolean(sample.kNumber).should.equal(false);
//    isBoolean(NaN).should.equal(false);
//    isBoolean(sample.kArray).should.equal(false);
//    isBoolean(sample.kNull).should.equal(false);
//    isBoolean(sample.kObject).should.equal(false);
//    isBoolean(sample.kString).should.equal(false);
//    isBoolean(sample.kFunction).should.equal(false);
//    isBoolean(sample.kUndefined).should.equal(false);
  });
});


describe('#sprintf', function () {
  it('tests if sprintf produces expected strings', function () {

    sprintf("%s%d", 'A', '1').should.equal('A1');
  });
});





