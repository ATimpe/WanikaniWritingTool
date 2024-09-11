var characterElement = document.getElementById("character");
var meaningElement = document.getElementById("meaning");
var meaningAltElement = document.getElementById("meaningAlt");
var answerElement = document.getElementById("answer");
var onyomiElement = document.getElementById("onyomi");
var kunyomiElement = document.getElementById("kunyomi");
var diagramElement = document.getElementById("diagram");
var showAnsBTN = document.getElementById("showAnswer");
var correctBTN = document.getElementById("markCorrect");
var incorrectBTN = document.getElementById("markIncorrect");
var diagramElement = document.getElementById("diagram");
var kanjiAnimElement = document.getElementById("kanjiAnim");
var subjectKanjiElement = document.getElementById('subjectKanji');
var quizFormElement = document.getElementById('quizForm');
var correctElement = document.getElementById('correct');
var lastSubjectElement = document.getElementById('lastSubject');
showAnsBTN.addEventListener("click", showAnswer);
correctBTN.addEventListener("click", markCorrect);
incorrectBTN.addEventListener("click", markIncorrect);

// Tracks incorrect guesses
var wrongAnswers = [];

init();

function init() {
    subjectQueue = quizSubjects.data;
    setSubject(subjectQueue[0]);
}

function showAnswer() {
    correctBTN.style.display = 'inline-block';
    incorrectBTN.style.display = 'inline-block';
    showAnsBTN.style.display = 'none';
    answerElement.style.visibility = 'visible';
}

function markCorrect() {
    if (!wrongAnswers.includes(subjectQueue[0].id)) {   // Correct
        correctElement.value = 1;
    } else {                                            // Incorrect
        correctElement.value = 0;
    }

    // Takes the subject out of the queue
    subjectQueue.shift();

    if (subjectQueue.length > 0) {
        quizFormElement.submit();
        nextSubject();
    } else {
        lastSubjectElement.value = 1;
        quizFormElement.submit();
    }
}

function markIncorrect() {
    // Takes the subject out of the queue and puts it in the back of the queue
    if (!wrongAnswers.includes(subjectQueue[0].id)) {
        wrongAnswers.push(subjectQueue[0].id);
    }
    subjectQueue.push(subjectQueue.shift());
    nextSubject();
}

function nextSubject() {
    // Maybe do shift() here to be safer
    setSubject(subjectQueue[0]);
    correctBTN.style.display = 'none';
    incorrectBTN.style.display = 'none';
    showAnsBTN.style.display = 'inline-block';
    answerElement.style.visibility = 'hidden';
}

function setSubject(subject) {
    characterElement.innerHTML = subject.data.characters;
    meaningElement.innerHTML = getPrimaryMeaning(subject.data.meanings);
    meaningAltElement.innerHTML = getSecondaryMeanings(subject.data.meanings);
    onyomiElement.innerHTML = getOnyomiString(subject.data.readings);
    kunyomiElement.innerHTML = getKunyomiString(subject.data.readings);
    kanjiAnimElement.id = subject.data.characters;
    subjectKanjiElement.value = subject.data.characters;
    load();
}

function getOnyomiString(readings) {
    let onyomiArray = [];
    for (const reading of readings) {
        if (reading.type == "onyomi") onyomiArray.push(reading.reading);
    }

    return onyomiArray.join("、");
}

function getKunyomiString(readings) {
    let kunyomiArray = [];
    for (const reading of readings) {
        if (reading.type == "kunyomi") kunyomiArray.push(reading.reading);
    }

    return kunyomiArray.join("、");
}

function getPrimaryMeaning(meanings) {
    for (const meaning of meanings) {
        if (meaning.primary) return meaning.meaning;
    }

    return null;
}

function getSecondaryMeanings(meanings) {
    let meaningArray = [];
    for (const meaning of meanings) {
        if (!meaning.primary) meaningArray.push(meaning.meaning);
    }

    return meaningArray.join(", ");
}