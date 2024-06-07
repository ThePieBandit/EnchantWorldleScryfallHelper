let debug = true;
let scryfallQuery = "game:paper -is:reprint order:released";

function isIterable(obj) {
  if (obj == null) {
    return false;
  }
  return typeof obj != "string" && typeof obj[Symbol.iterator] === "function";
}

function getComplexQuery(keyword, styleClassName, dataFunc, allData) {
  let impossibleGroups = new Set([]);
  let possibleGroups = new Map();
  const elements = document.getElementsByClassName(styleClassName);
  for (let guess of elements) {
    let data = dataFunc(guess);
    if (debug) {
      console.log(`data: ${data}`);
    }
    if (guess.classList.contains("correct")) {
      if (allData != undefined && allData != null && allData.length &&
        allData.length > 0) {
        allData.forEach((datum) => impossibleGroups.add(datum));
        data.forEach((datum) => impossibleGroups.delete(datum));
      }
      data.forEach((datum) => {
        if(datum != "") {
          possibleGroups.set(datum, 100);
        }
      });
    } else if (guess.firstChild.lastChild.style.background.startsWith(
        "linear-gradient")) {
      let percentCorrect = guess.firstChild.lastChild.style.background.matchAll(/0%, var\(--almost-correct-color\) ([0-9.]+)%, var/g).next().value[1];
      if(percentCorrect > 99) {
        data.forEach((datum) => {
          if(datum != "") {
            possibleGroups.set(datum, 100);
          }
        });
      } else {
        possibleGroups.set(data, percentCorrect);
      }
    } else {
      data.forEach((datum) => impossibleGroups.add(datum));
    }
  }
  console.log(possibleGroups);
  const op = (keyword === "id" ? ">=" : ":");
  let query = " ";
  for (let group of impossibleGroups) {
    if (isIterable(group)) {} else {
      if(group === "colourless") {
        query += ` ${keyword}>${group}`;
      } else {
        query += ` -${keyword}${op}${group}`;
      }
    }
  }
  query += " ";
  for (const group of possibleGroups) {
    if (isIterable(group[0])) {
      query += ` (`;
      group[0].forEach((data, negatedIndex) => {
        if (negatedIndex > 0) query += ` OR`;
        query += ` (`;
        group[0].forEach((datum, index) => {
          query +=
            ` ${(negatedIndex === index ^ group[1] < 50) ? '-' : ''}${keyword}${op}${datum}`;
        });
        query += " )";
      });
      query += ` )`;
    } else {
      query += ` ${keyword}${op}${group[0]}`;
    }
  }
  query += " ";
  if (debug) {
    console.log(`${styleClassName}: ${query}`);
  }
  return query;
}

function getMvQuery(styleClassName) {
  let minManaValue = -1;
  let maxManaValue = 30;
  for (let guess of document.getElementsByClassName(styleClassName)) {
    const mv = parseInt(guess.firstChild.textContent, 10);
    if (guess.classList.contains('correct')) {
      maxManaValue = mv + 1;
      minManaValue = mv - 1;
    } else if (guess.classList.contains('almost-correct')) {
      if (guess.classList.contains('down')) {
        maxManaValue = Math.min(maxManaValue, mv);
        minManaValue = Math.max(minManaValue, mv - 3);
      } else {
        maxManaValue = Math.min(maxManaValue, mv + 3);
        minManaValue = Math.max(minManaValue, mv);
      }
    } else if (guess.classList.contains('down')) {
      maxManaValue = Math.min(maxManaValue, mv - 2);
    } else {
      minManaValue = Math.max(minManaValue, mv + 2);
    }
  }
  let query = ` mv>${minManaValue} mv<${maxManaValue}`;
  if (debug) {
    console.log(`${styleClassName}: ${query}`);
  }
  return query;
}

function getSetYearQuery(styleClassName) {
  let minYear = 1900;
  let maxYear = 3000;
  for (const guess of document.getElementsByClassName(styleClassName)) {
    let year = parseInt(guess.textContent.replace("'", ''), 10);
    year = (year > 90) ? 1900 + year : 2000 + year;
    if (guess.classList.contains('correct') || guess.classList.contains(
        'almost-correct')) {
      minYear = year - 1;
      maxYear = year + 1;
    } else if (guess.classList.contains('down')) {
      maxYear = Math.min(maxYear, year);
    } else {
      minYear = Math.max(minYear, year);
    }
  }
  let query = ` year>${minYear} year<${maxYear}`;
  if (debug) {
    console.log(`${styleClassName}: ${query}`);
  }
  return query;
}

function getRarityQuery(styleClassName) {
  const impossibleRarities = new Set([]);
  for (const guess of document.getElementsByClassName(styleClassName)) {
    let rarity = [...guess.firstChild.classList].map((s) => s.substring(6))[1];
    if (guess.classList.contains("correct")) {
      impossibleRarities.add("C");
      impossibleRarities.add("U");
      impossibleRarities.add("R");
      impossibleRarities.add("M");
      impossibleRarities.delete(rarity);
    } else if (guess.lastChild.classList.contains("down")) {
      switch (rarity) {
      case "C":
        impossibleRarities.add("C");
      case "U":
        impossibleRarities.add("U");
      case "R":
        impossibleRarities.add("R");
      case "M":
        impossibleRarities.add("M");
      default:
        break;
      }
    } else {
      switch (rarity) {
      case "M":
        impossibleRarities.add("M");
      case "R":
        impossibleRarities.add("R");
      case "U":
        impossibleRarities.add("U");
      case "C":
        impossibleRarities.add("C");
      default:
        break;
      }
    }
  }
  let query = ` `;
  for (const notRarity of impossibleRarities) {
    query += ` -r:${notRarity}`;
  }
  if (debug) {
    console.log(`${styleClassName}: ${query}`);
  }
  return query;
}
scryfallQuery += getRarityQuery("guess-rarity");
scryfallQuery += getComplexQuery("id", "guess-colour", (guess) => [...guess
  .firstChild.firstChild.children
].map(span => span.classList[1]).map(s => s.substring(15)), ["W", "U", "B",
  "R", "G"
]);
scryfallQuery += getComplexQuery("t", "guess-type", (guess) => guess.textContent
  .toLowerCase().split(" "), ["artifact", "battle", "creature", "enchantment",
    "instant", "land", "planeswalker", "sorcery", "tribal", "kindred"
  ]);
scryfallQuery += getComplexQuery("t", "guess-subtype", (guess) => guess
  .textContent.toLowerCase().split(" "));
scryfallQuery += getMvQuery("guess-mv");
scryfallQuery += getSetYearQuery("guess-set");
if (debug) console.log("Query: " + scryfallQuery);
navigator.clipboard.writeText(scryfallQuery);
