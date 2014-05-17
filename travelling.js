// travelling test

// general functions

function randomInt(min, max) {
  return Math.floor((Math.random() * (max - min)) + min);
}

// Fisher-Yates shuffle
function shuffle(a) {
  for (var i = 0; i < a.length; i++){
    var r = randomInt(i, a.length);
    var t = a[r];
    a[r] = a[i];
    a[i] = t;
  }
  return a;
}

/* NODE */
var MIN_COORD = 0;
var MAX_COORD = 200;
var MARGIN = 10.5;
function Node(x, y) {
  this.x = x === undefined ? randomInt(MIN_COORD, MAX_COORD) : x;
  this.y = y === undefined ? randomInt(MIN_COORD, MAX_COORD) : y;
}

Node.prototype.distanceTo = function(node) {
  var xd = node.x - this.x;
  var yd = node.y - this.y;
  return Math.sqrt((xd*xd) + (yd*yd));
}

Node.prototype.toString = function() {
  return "[" + this.x + ", " + this.y + "]";
}

/* TOUR */
function Tour(nodes, randomize) {
  this.nodes = nodes.slice(0);
  if (randomize) shuffle(nodes);
}

Tour.prototype.totalDistance = function() {
  if (this._totalDistance) return this._totalDistance;
  return this._totalDistance = this.nodes.map(function(val, i, a) { return val.distanceTo(a[(i+1 === a.length ? 0 : i+1)]);})
                                          .reduce(function(a, b) { return a + b; });
}

Tour.prototype.fitness = function() {
  if (this._fitness) return this._fitness;
  return this._fitness = 1.0 / this.totalDistance();
}

Tour.prototype.toPointArray = function() {
  return this.nodes.reduce(function(a, b, i, ar){
    a.push(b.x);
    a.push(b.y);
    if (i === ar.length - 1) {
      a.push(ar[0].x);
      a.push(ar[0].y);
    }
    return a;
  }, []);
}

Tour.prototype.toGraph = function() {
  var layer = new Kinetic.Layer();
  var line = new Kinetic.Line({
    points: this.toPointArray().map(function(v) { return v + MARGIN; }),
    stroke: 'black',
    strokeWidth: 2,
  });
  var dots = this.nodes.map(function(v, i){
    return new Kinetic.Circle({
      x: v.x + MARGIN,
      y: v.y + MARGIN,
      radius: 4,
      fill: 'red'
    });
  });
  layer.add(line);
  dots.map(function(d) { layer.add(d); });
  return layer;
}

Tour.crossover = function(p1, p2) {
  var childNodes = p1.nodes.slice(0);
  var start = randomInt(0, p1.nodes.length);
  var end = randomInt(0, p1.nodes.length);

  // build list of elements 
  p1list = {};
  for (var i = start; i !== end; i++) {
    p1list[p1.nodes[i]] = true;
    if (i === (p1.nodes.length - 1)) i = -1;
  }

  // find all nodes in parent 2 not already in child, preserve ordering
  p2list = p2.nodes.filter(function(v) { return !(v in p1list); });

  for (var i = 0, q = 0; i !== childNodes.length && q < p2list.length; i++) {
    if ((start < end && (i < start || i >= end)) ||
        (start > end && (i < start && i >= end))) {
      childNodes[i] = p2list[q];
      q++;
    }
  }

  return (new Tour(childNodes, false));
}

function isUndefined(a) {
  return a.some(function(v) { return undefined === v; });
}

function Population(size, nodes) {
  this.tours = [];
  this.tours.length = size;
  if (nodes) {
    for (var i = 0; i < size; i++) {
      this.tours[i] = (new Tour(nodes, true));
    }
  }
}

Population.prototype.fittest = function() {
  var fittest = this.tours[0];
  for (var i = 1; i < this.tours.length; i++) {
    if (this.tours[i].fitness() > fittest.fitness())
      fittest = this.tours[i];
  }
  return fittest;
}

Population.evolve = function(p) {
  var evolvedTours = [];
  evolvedTours.length = p.tours.length;
  var offset = 0;

  //save elitism
  var fittestOffset = p.tours.indexOf(p.fittest());
  evolvedTours[offset++] = p.tours[fittestOffset];

  for (var i = offset; i < evolvedTours.length; i++) {
    var p1 = Population.tournament(p);
    var p2 = Population.tournament(p);
    var child = Tour.crossover(p1, p2);
    evolvedTours[i] = child;
  }

  for (var i = offset; i < evolvedTours.length; i++) {
    evolvedTours[i] = Tour.mutate(evolvedTours[i]);
  }
  var newPop = new Population(p.tours.length);
  newPop.tours = evolvedTours;
  return newPop;
}

var TOURNAMENT_SIZE = 5;
Population.tournament = function(p) {
  var newPop = new Population(TOURNAMENT_SIZE);
  for (var i = 0; i < TOURNAMENT_SIZE; i++) {
    var r = randomInt(0, p.tours.length);
    newPop.tours[i] = p.tours[r];
  }

  return newPop.fittest();
}

var MUTATION_RATE = 0.015;
Tour.mutate = function(t) {
  var mutatedNodes = t.nodes.slice(0);
  for (var i = 0; i < mutatedNodes.length; i++) {
    if (Math.random() < MUTATION_RATE) {
      var q = randomInt(0, mutatedNodes.length);
      var t = mutatedNodes[i];
      mutatedNodes[i] = mutatedNodes[q];
      mutatedNodes[q] = t;
    }
  }
  return (new Tour(mutatedNodes, false));
}

function nodes(n) {
  var a = [];
  for (var i = 0; i < n; i++) {
    a.push(new Node());
  }
  return a;
}

$(function() {
  var ns = new nodes(20);
  var population = new Population(50, ns);
  var stage = new Kinetic.Stage({
    container: 'container',
    width: MAX_COORD + 2*MARGIN,
    height: MAX_COORD + 2*MARGIN
  });

  var layer = new Kinetic.Layer();
  for (var i = 0.5; i < stage.width(); i += 5) {
      layer.add(new Kinetic.Line({
        points: [i, 0, i, stage.height()],
        stroke: 'grey',
        strokeWidth: 1
      }));
      layer.add(new Kinetic.Line({
        points: [0, i, stage.width(), i],
        stroke: 'grey',
        strokeWidth: 1
      }));
  }
  stage.add(layer);
  
  var initialDistance = population.fittest().totalDistance();
  console.log("initial distance: " + initialDistance);
  for (var i = 0; i < 1000; i++) {
    population = Population.evolve(population);
  }
  var finalDistance = population.fittest().totalDistance();
  console.log("final distance: " + finalDistance);
  console.log("percentage: " + initialDistance / finalDistance * 100);
  stage.add(population.fittest().toGraph());
})
