import * as Core from './core.js';

// NOTE: Use "String.fromCharCode([unicode number])" instead of just putting the character in quotes, for some reason that messes things up and it doesn't recognize it
// You can find some of the unicode ranges and unicodes for important characters at the bottom of this file.

document.getElementById("searchBtn").addEventListener("click", Parse)

// Defining the Hex codes for special japanese characters commonly used, and the Wo hiragana character
var JCOMMA    = "3001";
var JPERIOD   = "3002";
var JEXCLAM   = "FF01";
var JQUESTION = "FF1F";
var JWO       = "3092";

function Parse() {
    // Query should always be an array, even if just with
    let query = document.getElementById("inputBox").value;

    // Splices base on values You can be certain will not be part of other words
    // Use the splice functions exclusivley with an array. If you only have one string, just pass it in as an array with one value.
    let blocks = splitQuery([query], Core.JUniChar(JPERIOD));
    blocks = splitQuery(blocks, Core.JUniChar(JCOMMA));
    blocks = splitQuery(blocks, Core.JUniChar(JEXCLAM));
    blocks = splitQuery(blocks, Core.JUniChar(JQUESTION));
    blocks = splitQuery(blocks, Core.JUniChar(JWO));

    console.log(blocks);
    //loadJMdictXML(blocks);
}

function searchJMdictXML(xml, query) {
    let xmlDoc = xml.responseXML;
}

function loadJMdictXML(query) {
    const xhttp = new XMLHttpRequest();
    xhttp.onload = function () { searchJMdictXML(this, query); }
    xhttp.open("GET", "data/JMdict_e.xml");
    xhttp.send();
}

// Pass in an array of strings and split them up into arrays based on a character
// Ex. query = ["Hello Everynyan!"] char = "y" result = ["Hello Ever", "y", "n", "y", "an!"]
function splitQuery(query, char) {
    // Returns itself if char isn't in it
    //if (!query.includes(char)) return query;
    let blocks = [];

    let index;

    for (const q in query) {
        index = query[q].search(char);

        // If char is still present in the string, it will loop, cutting the string into three pieces: Before the char, the char, and after the char.
        while (index != -1) {
            blocks.push(query[q].substr(0, index), char);
            query[q] = query[q].slice(index + 1);
            index = query[q].search(char);
        }

        // If the remaining string isn't empty, place the rest in the array
        if (query[q].length >= 1) blocks.push(query[q]);
    }

    return blocks;
}

/* Likely won't use this function
function splitKatakana(query) {
    if (!Array.isArray(query)) { console.log("ERROR: query should be an array"); return query; }

    let blocks = [];

    let k;
    for (let i = 0; i < query.length; i++) {
        for (let j = 0; j < query[i].length; j++) {
            k = j;
            // When it finds a katakana letter, it iterates through the rest of the string until the chunk of katakana ends
            if (core.isKatakana(query[i][j])) {
                while (j < query[i].length) {
                    if (!core.isKatakana(query[i][j])) {
                        // Spilts the string into characters before the katakana block, the katakana block and after the block
                        blocks.push(query[i].substr(0, k - 1), query[i].substr(k, j - 1));
                        query[i] = query[i].slice(j);
                        break;
                    }
                    else j++;
                }
                // The remaining part of the string is pushed if not empty
                if (query[i].length >= 1) blocks.push(query[i]);
            }
        }
    }

    return blocks;
}*/


/*
JAPANESE UNICODE REFERENCE

    Hiragana = 3041 - 3096
    Katakana = 30A1 - 30FC
    Kanji    = 3400 - 4DB5 or 4E00 - 9FCB or F900 - FA6A

*/