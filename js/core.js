// Pass in the string to a hex value of a unicode character and it will return the char for it
export function JUniChar(hex) { return String.fromCharCode(hexToDec(hex)); }

export function isHiragana(char) { return char >= hexToDec("3041") && char <= hexToDec("3096") }

export function isKatakana(char) { return char >= hexToDec("30A1") && char <= hexToDec("30FC") }

export function isKanji(char) {
    return (char >= hexToDec("3400") && char <= hexToDec("4DB5")) ||
        (char >= hexToDec("4E00") && char <= hexToDec("9FCB")) ||
        (char >= hexToDec("F900") && char <= hexToDec("FA6A"));
}

export function hexToDec(hex) { return parseInt(hex, 16); }