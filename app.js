// ====================================== INITIALIZE ======================================

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const fs = require('fs');
const Cache = require('file-system-cache').default

const app = express();
app.set("view engine", "ejs");
// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/kanjivg', express.static(path.join(__dirname, 'kanjivg')));

const jsonParser = bodyParser.json();
var urlencodedParser = bodyParser.urlencoded({ extended: false })

const cache = Cache({
    basePath: "./.cache", // (optional) Path where cache files are stored (default).
    ttl: 100000,              // (optional) A time-to-live (in secs) on how long an item remains cached.
});

const WKUrl = 'https://api.wanikani.com/v2/';
var USER_TOKEN;
var subjectsSynced = false;                       // If the subjects in the cache are up to date

var userData;

var ERROR = "";




// ====================================== ROUTES ======================================

/*
    For routes, if the route has any sort of API calls made, please place all of the code
    In a try/catch block. An arror handling function will throw an exception if any of the 
    responses have an error. Every route with an API call should also load the token beforehand
    in case the user has changed it.
*/

app.get('/', async (req, res) => {
    try {
        let hasToken = loadToken();

        if (!hasToken) {
            res.redirect('/token');
        } else {
            await initUserData(USER_TOKEN);
            await initSubjects(USER_TOKEN);

            data = await loadSubjectCache();
            data = sortSubjectDataByLevel(data);

            res.render('index', { data: data });
        }
    }
    catch (e) {
        res.redirect(`/error?error=${encodeURIComponent(JSON.stringify(e))}`);
    }
});

// Updating the token
app.post('/', urlencodedParser, async (req, res) => {
    saveToken(req.body.token);
    res.redirect('/');
});

// Updating the token
app.get('/token', urlencodedParser, async (req, res) => {
    if (req.query.hasOwnProperty("error")) {
        if (req.query.error) {
            res.render('token', { error: "Current token is invalid, please enter a new one.", currentToken: USER_TOKEN });
        }
    }

    else {
        res.render('token', { currentToken: USER_TOKEN });
    }
});

// TODO: Imporve this code so it does pretty much the same thing as get('/')
app.get('/kanji/:kanjichar', async (req, res) => {
    try {
        let kanji = req.params.kanjichar;

        if (!subjectsSynced) {
            await initUserData(USER_TOKEN);
            await initSubjects(USER_TOKEN);
        }

        let kanjiData = await getSubjectByChar(kanji);

        // If the subject data isn't cached it will sync the subjects
        if (kanjiData == -1) {
            await syncSubjects();

            kanjiData = await getSubjectByChar(kanji);
        }

        // If the character data isn't found
        if (kanjiData == 0) res.render('kanji', { error: true });

        else res.render('kanji', { kanjiData: kanjiData.data });
    }
    catch (e) { 
        res.redirect(`/error?error=${encodeURIComponent(JSON.stringify(e))}`);
    }
});

// If not called from the main page, it redirects to '/'
app.get('/quiz', async (req, res) => {
    res.redirect("/");
});

app.post('/quiz', urlencodedParser, async (req, res) => {
    let quizSubjects = await getSubjectsByLevel(req.body.quizLevelNum);

    quizSubjects = JSON.stringify(quizSubjects);

    res.render('quiz', { quizSubjects: quizSubjects });
});

app.get('/error', urlencodedParser, async (req, res) => {
    let error = JSON.parse(decodeURIComponent(req.query.error));

    console.log(error);

    if (error.hasOwnProperty("code")) {
        switch (error.code) {
            // Token doesn't work
            case 401:
                res.redirect(`/token?error=${encodeURIComponent(true)}`);
                break;
            
            case 403:
                res.render('error', { errorMsg: "Access is Forbidden." });
                break;
            
            // API endpoint not found
            case 404:
                res.render('error', { errorMsg: "API Endpoint not found, please report this bug to the GitHub." });
                break;
            
            case 422:
                res.render('error', { errorMsg: "Unprocessable Entity. " + error.message });
                break;
            
            // Too many API requests
            case 429:
                res.render('error', { errorMsg: "API rate limit exceeded. Please try again in about 60 seconds. If you see this error pop up a lot, please report it to the GitHub." });
                break;
            
            // Internal service error
            case 500:
                res.render('error', { errorMsg: "Internal Service error. Please try again." });
                break;
            
            // Service is currently unavailable
            case 503:
                res.render('error', { errorMsg: "WaniKani is currently unavailable, please try again another time." });
                break;
        }
    }

    else console.log(error);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    initToken();
    console.log(`Server is running on http://localhost:${PORT}`);
});




// ====================================== DATA FETCHING ======================================

// Initializes the subject data, checking if the data in the cache is up to date and pulling new data and cacheing it if not
// Should run at the start of the app. If the token is invalid or some other error happens, it will keep running this code until a proper token is entered or the error is resolved
async function initSubjects(token) {
    // When both are already done, it will simply skip all the bellow code.
    if (subjectsSynced) return true;

    // If the token provided doesn't throw an error
    if (!subjectsSynced) {
        if (await subjectsNeedUpdate(token)) {
            let subjectsResponse = await syncSubjects(token);

            subjectsSynced = !responseHasError(subjectsResponse);
        } else {
            subjectsSynced = true;
        }
    }

    // Function should return bool based on if it was successful. If the token doesn't work or the subjects fail to sync, it will return false;
    return subjectsSynced;
}

// Returns true or false based on if fetching data was a success
async function initUserData(token) {
    let response = await fetchWK(token, 'user');

    userData = response.data;
}

async function fetchWK(token, endpointPath, params = []) {
    let data = [];
    let i = 0;
    let URL = WKUrl + endpointPath;

    // When using parameters, start with a question mark and then list each parameter sperated by an ampersand 
    for (let i = 0; i < params.length; i++) {
        if (i == 0) URL += "?";
        else URL += "&";
        URL += params[i];
    }

    let requestHeaders = 
        new Headers({
            Authorization: 'Bearer ' + token
        });;
    
    let response = await fetch(URL, { method: 'GET', headers: requestHeaders })
        .then(response => response.json());

    // If the first response has a pages property, that means that there's more information and another call should be made.
    // Limits function to 10 api calls
    for (let i = 0; response.hasOwnProperty('pages') && i < 9; i++) {
        // next_url contains the url for the next page of data. If it is null, there are no more pages and the loop breaks
        if (response.pages.next_url != null) {
            URL = response.pages.next_url;
        } else {
            break;
        }


        let responseNextPage = await fetch(URL, { method: 'GET', headers: requestHeaders })
            .then(responseNextPage => responseNextPage.json());
        
        // Adds the data together into the first response
        responseNextPage.data = response.data.concat(responseNextPage.data)
        response = responseNextPage;

        i++;
    }

    // Handles any errors by throwing the response
    if (responseHasError(response)) throw response;
    
    return response;
}

// Checks to see if there has been subjects updated since the last time it was cached
async function subjectsNeedUpdate(token) {
    //let data = await loadSubjectCache();
    //if (typeof data == "undefined") return true;

    let needUpdate = false;
    let lastDate = await cache.get("SUBJECT_LAST_UPDATE", 'Sat, 01 Jan 2000 00:00:00 GMT');

    var requestHeaders = new Headers();
    requestHeaders.append('Authorization', 'Bearer ' + token);
    requestHeaders.append('If-Modified-Since', lastDate);
    //var response = await fetchWK(token, 'subjects', "types=kanji", requestHeaders);
    let response;
    let RB;

    response = await fetch(WKUrl + "subjects?types=kanji", { method: 'GET', headers: requestHeaders });

    // If the response isn't empty
    needUpdate = response.status != 304;

    // If the subjects haven't been updated, check if the user's nax level granted has updated
    if (!needUpdate) {
        let maxLevel = await cache.get("SUBJECT_MAX_LEVEL", '3');

        needUpdate = maxLevel != userData.subscription.max_level_granted;
    }

    return needUpdate;
}

// To limit the number of levels that get returned based on the user's max level granted, a parameter with all the levels wanted in an array must be
// passed into the API call as a parameter. This function returns that parameter.
function getMaxLevelParam() {
    let maxLevel = userData.subscription.max_level_granted;
    let array = [];
    for (let i = 1; i <= maxLevel; i++) {
        array.push(i);
    }

    return encodeURIComponent(array.join(','));
}

// Returning 0 means the character isn't found, returning -1 means no data is cached
async function getSubjectByChar(kanji) {
    let subjects = await loadSubjectCache();

    if (subjects == null) return -1; // No data cached

    for (const subject of subjects) {
        if (subject.data.characters == kanji) return subject;
    }

    return 0; // Couldn't find character
}






// ====================================== CACHING ======================================


async function loadSubjectCache() {
    // If the subject data is already cached
    let result = await cache.get("SUBJECT_DATA")
        .then(result => data = result)
        .catch(err => data = null);

    return result;
}

async function syncSubjects(token) {
    let maxLevelParam = getMaxLevelParam();
    let response = await fetchWK(token, 'subjects', ['types=kanji', `levels=${maxLevelParam}`]);

    // Looks at the data to see if there is an error in fetching the data
    if (!responseHasError(response)) {
        // Cache's the subject data
        await cache.save([{ key: "SUBJECT_DATA", value: response.data }, {key: "SUBJECT_LAST_UPDATE", value:new Date().toUTCString() }, {key: "SUBJECT_MAX_LEVEL", value:userData.subscription.max_level_granted}]);
    } 

    return response;
}




// ====================================== TOKEN HANDLING ======================================

function initToken() {
    if (!fs.existsSync('token.txt')) {
        fs.writeFile('token.txt', '', err => {
            if (err) throw err;
        });
        USER_TOKEN = "";
    } else {
        loadToken();
    }
}

// Returns if the token file is empty.
function loadToken() {
    fs.readFile('token.txt', { encoding: 'utf8' }, (err, data) => {
        if (err) throw err;
        USER_TOKEN = data;
    }); 
    return !USER_TOKEN == "";
}

function saveToken(token) {
    fs.writeFile('token.txt', token, err => {
        if (err) throw err;
    });
    USER_TOKEN = token;
}

// Makes an easy api call and returns the response. This function should be used for testing if a token is valid, use this function sparingly
async function tokenTest(token) {
    let requestHeaders = 
        new Headers({
            Authorization: 'Bearer ' + token
        });;
    
    let response = await fetch(WKUrl + "subjects/440", { method: 'GET', headers: requestHeaders })
        .then(response => response.json());
    
    return response;
}


// ====================================== DATA HANDLING ======================================

// Sorts returned subject data based on level into a 2D array (not please only use this with data that is just kanji subjects)
function sortSubjectDataByLevel(data) {
    let map = new Map();

    // Goes through each subjects, finds the assigned level then adds it to that array
    for (const kanji of data) {
        if (!map.has(kanji.data.level)) {
            map.set(kanji.data.level, []);
        }

        map.get(kanji.data.level).push(kanji);
    }
    
    return map;
}

// Takes in an array of ids for subject data and then returns an array of the subject data with those ids
async function getSubjectsById(ids) {
    let subjects = await loadSubjectCache();
    let subjectArray = [];

    // TODO: make process more efficient
    for (const subject of subjects) {
        if (ids.includes(subject.id)) {
            subjectArray.push(subject);
        }
    }

    return { "data": subjectArray };
}

// Takes in a level number for subject data and then returns an array of the subjects in that level
async function getSubjectsByLevel(level) {
    let subjects = await loadSubjectCache();
    let subjectArray = [];

    for (const subject of subjects) {
        if (subject.data.level == level) {
            subjectArray.push(subject);
        }
    }

    return { "data": subjectArray };
}




// ====================================== ERROR HANDLING ======================================

function responseHasError(response) {
    // All 200 response codes mean that the fetch was successful. If code is not present, it also means successful.
    if (response.hasOwnProperty('code')) {
        return response.code != 200;
    } else {
        return false;
    }

}