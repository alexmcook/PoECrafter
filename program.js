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

var groupBy = function(xs, key) {
  return xs.reduce(function(rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
};

String.prototype.formatUnicorn = String.prototype.formatUnicorn ||
function () {
    "use strict";
    var str = this.toString();
    if (arguments.length) {
        var t = typeof arguments[0];
        var key;
        var args = ("string" === t || "number" === t) ?
            Array.prototype.slice.call(arguments)
            : arguments[0];

        for (key in args) {
            str = str.replace(new RegExp("\\{" + key + "\\}", "gi"), args[key]);
        }
    }

    return str;
};

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
    mod.stats.forEach(function(stat) {
      stat.value = Math.floor(Math.random() * (stat.valueMax - stat.valueMin)) + stat.valueMin;
    });
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
    if (mod.generationType === generationType.PREFIX)
      this.prefixCount--;
    else if (mod.generationType === generationType.SUFFIX)
      this.suffixCount--;
    mod.tags.forEach(function(tag) {
      if (this.tags.indexOf(tag) >= 0) {
        this.tags.splice(this.tags.indexOf(tag), 1);
      }
    }.bind(this));
    this.updateModPool();
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
    if (this.prefixCount >= 13) {
      newModPool = newModPool.filter(function(mod) {
        return mod.generationType !== generationType.PREFIX;
      });
    }
    if (this.suffixCount >= 13) {
      newModPool = newModPool.filter(function(mod) {
        return mod.generationType !== generationType.SUFFIX;
      });
    }
    this.modPool = newModPool;
  }
  this.getModsStrings = function() {
    var outputStrings = [];
    var allStats = [];
    this.mods.forEach(function(mod) {
      mod.stats.forEach(function(stat) {
        if (stat.key > 0) {
          allStats.push(stat);
        }
      });
    });
    allStats = groupBy(allStats, 'key');
    var combinedStats = [];
    Object.keys(allStats).forEach(function(key) {
      if (allStats[key].every(function(stat) {
        return stat.id === allStats[key][0].id;
      })) {      
        for (var i = 1; i < allStats[key].length; i++) {
          allStats[key][0].value += allStats[key][i].value;
          allStats[key].splice(1);
        }
      }
    });
    Object.keys(allStats).forEach(function(key) {
      combinedStats.push(allStats[key]);
    })
    combinedStats.forEach(function(stats) {
      var translation = getTranslation(stats);
      var values = [];
      stats.forEach(function(stat) {
        values.push(stat.value);
      });
      for (var i = 0; i < values.length; i++) {
        var indexHandler = translation.indexHandlers[i] === undefined ? translation.indexHandlers[0] : translation.indexHandlers[i];
        var format = translation.formats[i] === undefined ? translation.formats[0] : translation.formats[i];
        values[i] = transformAndFormatValue(values[i], indexHandler, format);
      }
      outputStrings.push(translation.text.formatUnicorn(values));
    });
    return outputStrings;
  }
  this.dbgMods = function() {
    this.addMod(masterModList[1218]);
    this.addMod(masterModList[989]);
    this.addMod(masterModList[1500]);
    this.addMod(masterModList[203]);
  }
}

function transformAndFormatValue(value, handler, format) {
  var final;
  switch (handler) {
    case "60%_of_value":
      value = value * 0.6;
      break;
    case "deciseconds_to_seconds":
      value = value * 10;
      break;
    case "divide_by_one_hundred":
      value = value / 100;
      break;
    case "divide_by_one_hundred_and_negate":
      value = -value / 100;
      break;
    case "divide_by_one_hundred_2dp":
      value = (value / 100).toFixed(2);
      break;
    case "milliseconds_to_seconds":
      value = value / 1000;
      break;
    case "milliseconds_to_seconds_0dp":
      value = (value / 1000).toFixed(0);
      break;
    case "milliseconds_to_Seconds_2dp":
      value = (value / 1000).toFixed(2);
      break;
    case "multiplicative_damage_modifier":
      value = value + 100;
      break;
    case "multiplicative_permyriad_damage_modifier":
      value = value / 100 + 100;
      break;
    case "negate":
      value = -value;
      break;
    case "old_leech_percent":
      value = value / 5;
      break;
    case "old_leech_permyriad":
      value = value / 500;
      break;
    case "per_minute_to_per_second":
      value = (value / 60).toFixed(1);
      break;
    case "per_minute_to_per_second_0dp":
      value = (value / 60).toFxied(0);
      break;
    case "per_minute_to_per_second_2dp":
      value = (value / 60).toFixed(2);
      break;
    case "per_minute_to_per_second_2dp_if_required":
      value = value % 60 != 0 ? (value / 60).toFixed(2) : value / 60;
      break;
    case "divide_by_ten_0dp":
      value = (value / 10).toFixed(0);
      break;
    case "divide_by_two_0dp":
      value = (value / 2).toFixed(0);
      break;
    case "divide_by_fifteen_0dp":
      value = (value / 15).toFixed(0);
      break;
    case "divide_by_twenty_then_double_0dp":
      value = ((value / 20) * 2).toFixed(0);
      break;
    case "canonical_line":
      break;
    case "weapon_crit":
      value = (value / 100).toFixed(2);
      break;
    case "weapon_speed":
      value = (1000 / value).toFixed(2);
      break;
    default:
      break;
  }
  switch (format) {
    case "#":
      break;
    case "+#":
      if (value > 0)
        final = "+" + value;
      break;
    case "#%":
      final = value + "%";
      break;
    case "+#%":
      if (value > 0)
        final = "+" + value + "%";
      else
        final = value + "%";
      break;
    case "2dp":
      final = parseFloat(value).ToFixed(2);
      break;
    case "2dp%":
      final = parseFloat(value).ToFixed(2);
      break;
    default:
      break;
  }
  return final;
}

function getTranslation(statArr) {
  var match;  
  statArr[0].description.translations.forEach(function(translation) {
    for (var i = 0; i < statArr.length; i++) {
      var min = translation.conditions[i].minValue === null ? -Infinity : translation.conditions[i].minValue;
      var max = translation.conditions[i].maxValue === null ? Infinity : translation.conditions[i].maxValue;
      if (statArr[i].valueMin >= min && statArr[i].valueMax <= max) {
        match = translation;
      }
    }
  });
  return match;
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
  currentItem.addMod(currentItem.modPool[rnd]);
  update();
}