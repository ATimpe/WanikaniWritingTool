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
var tokenConfirm = false;                         // If the token prodived by the user works
var subjectsSynced = false;                       // If the subjects in the cache are up to date

var userData;

var ERROR = "";




// ====================================== ROUTES ======================================

app.get('/', async (req, res) => {
    // If either of these fail, the pull was not a success
    let success = await initUserData(USER_TOKEN);
    success = await initSubjects(USER_TOKEN) && success;

    if (success) {
        data = await loadSubjectCache(USER_TOKEN);

        res.render('index', { data: data });
    } else {
        res.render('token', { error: ERROR });
    }
});

// Updating the token
app.post('/', urlencodedParser, async (req, res) => {
    let success = await initUserData(req.body.token);
    success = await initSubjects(req.body.token) && success;

    if (success) {
        saveToken(req.body.token);
        data = await loadSubjectCache(USER_TOKEN);
        res.render('index', { data: data });
    } else {
        res.render('token', { error: ERROR });
    }
});

app.get('/kanji/:kanjichar', async (req, res) => {
    let kanji = req.params.kanjichar;
    res.render('kanji', { kanjichar: kanji });
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
    if (tokenConfirm && subjectsSynced) return true;

    if (!tokenConfirm) {
        let tokenResponse = await tokenTest(token);

        // TODO make the verification account for other errors not related to token
        tokenConfirm = !responseHasError(tokenResponse);
        if (responseHasError(tokenResponse)) ERROR = tokenResponse.error;
    }

    // If the token provided doesn't throw an error
    if (tokenConfirm) {
        if (!subjectsSynced) {
            let data = await loadSubjectCache();

            // If nothing is cached
            if (typeof data == "undefined") {
                let subjectsResponse = await syncSubjects(token);

                subjectsSynced = !responseHasError(subjectsResponse);
            } else { // If something is cached, check if up to date
                if (await subjectsNeedUpdate(token)) {
                    let subjectsResponse = await syncSubjects(token);
                    console.log(subjectsResponse);

                    subjectsSynced = !responseHasError(subjectsResponse);
                    if (responseHasError(subjectsResponse)) ERROR = subjectsResponse.error;
                    
                } else {
                    subjectsSynced = true;
                }
            } 
        }
    }

    // Function should return bool based on if it was successful. If the token doesn't work or the subjects fail to sync, it will return false;
    return tokenConfirm && subjectsSynced;
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
    // Limits function to 5 api calls
    for (let i = 0; response.hasOwnProperty('pages') && i < 4; i++) {
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
    
    return response;
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

// Checks to see if there has been subjects updated since the last time it was cached
async function subjectsNeedUpdate(token) {
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

async function loadSubjectCache(token) {
    // If the subject data is already cached
    let result = await cache.get("SUBJECT_DATA")
        .then(result => data = result)
        .catch(err => data = null);

    return result;
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

// Returns true or false based on if fetching data was a success
async function initUserData(token) {
    let response = await fetchWK(token, 'user');

    if (!responseHasError(response)) {
        userData = response.data;
        return true;
    } else {
        ERROR = response.error;
        return false;
    }
}




// ====================================== TOKEN HANDLING ======================================

function initToken() {
    if (!fs.existsSync('token.txt')) {
        fs.writeFile('token.txt', '', err => {
            if (err) throw err;
            console.log("It's saved!");
        });
        USER_TOKEN = "";
    } else {
        loadToken();
    }
}

function loadToken() {
    fs.readFile('token.txt', { encoding: 'utf8' }, (err, data) => {
        if (err) throw err;
        USER_TOKEN = data;
    }); 
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




// ====================================== ERROR HANDLING ======================================

function responseHasError(response) {
    // All 200 response codes mean that the fetch was successful. If code is not present, it also means successful.
    if (response.hasOwnProperty('code')) {
        return response.code != 200;
    } else {
        return false;
    }

}