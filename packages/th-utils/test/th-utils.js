/**
 * Created by hzamir on 6/16/15.
 */

var expect = require('chai').expect;

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

    expect(isNumber(sample.kNumber)).true;

    expect(isNumber(sample.kObject)).false;
    expect(isNumber(NaN)).false;
    expect(isNumber(sample.kArray)).false;
    expect(isNumber(sample.kNull)).false;
    expect(isNumber(sample.kObject)).false;
    expect(isNumber(sample.kString)).false;
    expect(isNumber(true)).false;
    expect(isNumber(false)).false;
    expect(isNumber(sample.kFunction)).false;
    expect(isNumber(sample.kUndefined)).false;
  });
});

describe('#isFunction', function() {
  it('tests if val is a function', function () {

    expect(isFunction(sample.kFunction)).true;

    expect(isFunction(sample.kNumber)).false;
    expect(isFunction(sample.kObject)).false;
    expect(isFunction(NaN)).false;
    expect(isFunction(sample.kArray)).false;
    expect(isFunction(sample.kNull)).false;
    expect(isFunction(sample.kObject)).false;
    expect(isFunction(sample.kString)).false;
    expect(isFunction(true)).false;
    expect(isFunction(false)).false;
    expect(isFunction(sample.kUndefined)).false;


  });
});


describe('#isObject', function() {
  it('tests if val is an object', function () {
    expect(isObject(sample.kObject),'kObject').true;
    expect(isObject(sample.kFunction), 'kFunction').true;    // we should have an isObjectNotFunction test
    expect(isObject(sample.kArray),'kArray').true;


    expect(isObject(sample.kNumber), 'kNumber').false;
    expect(isObject(NaN),'NaN').false;
    expect(isObject(sample.kNull),'kNull').false;
    expect(isObject(sample.kString),'kString').false;
    expect(isObject(true), 'true').false;
    expect(isObject(false),'false').false;
    expect(isObject(sample.kUndefined),'kUndefined').false;
  });
});


describe('#isArray', function() {
  it('tests if val is an array', function () {
    expect(isArray(sample.kArray), 'kArray').true;
    expect(isArray(sample.kObject), 'kObject').false;
    expect(isArray(sample.kNumber), 'kNumber').false;
    expect(isArray(sample.kObject), 'kObject').false;
    expect(isArray(sample.kString), 'kString').false;
    expect(isArray(true),'true').false;
    expect(isArray(false), 'false').false;
    expect(isArray(sample.kFunction), 'kFunction').false;

    expect(isArray(sample.kUndefined), 'kUndefined').false;
    expect(isArray(NaN), 'NaN').false;     //??? why is this not false
    expect(isArray(sample.kNull), 'kNull').false;


  });
});


describe('#isString', function() {
  it('tests if val is a string', function () {

    expect(isString(sample.kString)).true;

    expect(isString(sample.kArray)).false;
    expect(isString(sample.kObject)).false;
    expect(isString(sample.kNumber)).false;
    expect(isString(NaN)).false;
    expect(isString(sample.kNull)).false;
    expect(isString(sample.kObject)).false;
    expect(isString(true)).false;
    expect(isString(false)).false;
    expect(isString(sample.kFunction)).false;
    expect(isString(sample.kUndefined)).false;

  });
});


describe('#isBoolean', function() {
  it('tests if val is a boolean', function () {
    expect(isBoolean(true)).true;
    expect(isBoolean(false)).true;

    expect(isBoolean(sample.kArray)).false;
    expect(isBoolean(sample.kObject)).false;
    expect(isBoolean(sample.kNumber)).false;
    expect(isBoolean(NaN)).false;
    expect(isBoolean(sample.kNull)).false;
    expect(isBoolean(sample.kObject)).false;
    expect(isBoolean(sample.kString)).false;
    expect(isBoolean(sample.kFunction)).false;
    expect(isBoolean(sample.kUndefined)).false;
  });
});


describe('#sprintf', function () {
  it('tests if sprintf produces expected strings', function () {
    expect(sprintf("%s%d", 'A', '1')).equal('A1');
  });
});





