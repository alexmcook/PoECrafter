var masterBaseList;
$.getJSON("bases.json", function(data) {
  masterBaseList = data;
});
var masterModList;
$.getJSON("mods.json", function(data) {
  masterModList = data;
});
var masterEssenceList;
$.getJSON("essences.json", function(data) {
  masterEssenceList = data;
});

var domain = {
  "ITEM": 1,
  "FLASK": 2,
  "MONSTER": 3,
  "CHEST": 4,
  "AREA": 5,
  "UNKNOWN1": 6,
  "UNKNOWN2": 7,
  "UNKNOWN3": 8,
  "STANCE": 9,
  "MASTER": 10,
  "JEWEL": 11,
  "ATLAS": 12,
  "LEAGUESTONE": 13
};

var generationType = {
  "PREFIX": 1,
  "SUFFIX": 2,
  "UNIQUE": 3,
  "NEMESIS": 4,
  "CORRUPTED": 5,
  "BLOODLINES": 6,
  "TORMENT": 7,
  "TALISMAN": 8,
  "ENCHANTMENT": 9,
  "ESSENCE": 10
}

var currentBase;
var currentItem;

function Base(id, name, type, category, tags, requirement, defence, implicitMod, weapon) {
  this.id = id;
  this.name = name;
  this.type = type;
  this.category = category;
  this.tags = tags;
  this.requirement = requirement;
  this.defence = defence;
  this.implicitMod = implicitMod;
  this.weapon = weapon;
}

function Item(base) {
  Base.call(this, base.id, base.name, base.type, base.category, base.tags, base.requirement, base.defence, base.implicitMod, base.weapon);
  this.mods = [];
  this.modPool = [];
  this.prefixCount = 0;
  this.suffixCount = 0;
  this.addMod = function(mod) {
    this.mods.push(mod);
    if (mod.generationType === generationType.PREFIX)
      this.prefixCount++;
    else if (mod.generationType === generationType.SUFFIX)
      this.suffixCount++;
    mod.tags.forEach(function(tag) {
      this.tags.push(tag);
    }.bind(this));
    this.updateModPool();
  }
  this.removeMod = function(mod) {
    this.mods.splice(this.mods.indexOf(mod), 1);
    mod.tags.forEach(function(tag) {
      if (this.tags.indexOf(tag) >= 0) {
        this.tags.splice(this.tags.indexOf(tag), 1);
      }
    }.bind(this));
  }
  this.updateModPool = function() {
    var newModPool = masterModList.filter(function(mod) {
      return (mod.spawnWeightTags.some(function(tag) {
        return this.tags.indexOf(tag) >= 0 && mod.spawnWeight_Values[mod.spawnWeightTags.indexOf(tag)] > 0;
      }.bind(this), mod));
    }.bind(this)).filter(function(mod) {
      return mod.domain === domain.ITEM;
    }).filter(function(mod) {
      return (mod.generationType === generationType.PREFIX || mod.generationType === generationType.SUFFIX);
    }).filter(function(mod) {
      return !(this.mods.some(function(itemMod) {
        return itemMod.group === mod.group;
      }, mod))
    }.bind(this));
    if (this.prefixCount >= 3) {
      newModPool = newModPool.filter(function(mod) {
        return mod.generationType !== generationType.PREFIX;
      });
    }
    if (this.suffixCount >= 3) {
      newModPool = newModPool.filter(function(mod) {
        return mod.generationType !== generationType.SUFFIX;
      });
    }
    this.modPool = newModPool;
  }
}

function run() {
  currentBase = masterBaseList.filter(function(baseItem) {
    return baseItem.name === "Vaal Regalia";
  })[0];

  currentItem = new Item(currentBase);
  currentItem.updateModPool();
  update();
}

function update() {
  var output = currentItem.name + "<br>" + currentItem.mods.length + "<br>";
  for (var i = 0; i < currentItem.mods.length; i++) {
    output += currentItem.mods[i].id + "<br>";
  }
  
  $("#item").html(output);
}

function add() {
  var rnd = Math.floor(Math.random() * currentItem.modPool.length);
  console.log(rnd);
  currentItem.addMod(currentItem.modPool[rnd]);
  update();
}