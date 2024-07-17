const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const app = express();
app.set("view engine", "ejs");
// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/kanjivg', express.static(path.join(__dirname, 'kanjivg')));

const jsonParser = bodyParser.json();
var urlencodedParser = bodyParser.urlencoded({ extended: false })

const WKUrl = 'https://api.wanikani.com/v2/';

//routes
app.get('/', (req, res) => {
    res.render('index', { data: null, tokenwarn: true});
});

app.post('/', urlencodedParser, async (req, res) => {
    let data = await fetchWKData(req.body.token, "subjects", "types=kanji");
    res.render('index', {data: data, tokenwarn: false});
});

app.get('/kanji/:kanjichar', async (req, res) => {
    let kanji = req.params.kanjichar;
    res.render('kanji', { kanjichar: kanji });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

async function fetchWKData(token, endpointPath, params) {
    let data = [];
    var requestHeaders = 
        new Headers({
            Authorization: 'Bearer ' + token
        });;
    let apiEndpoint;
    let response;
    let i = 0;
    let URL = WKUrl + endpointPath + "?" + params;

    // Limits function to 5 api calls
    while (URL != null && i < 5)
    {
        response = await fetch(URL, { method: 'GET', headers: requestHeaders })
            .then(response => response.json());
        
        data = data.concat(response.data);
        
        if (typeof response.pages.next_url != 'undefined') {
            URL = response.pages.next_url;
        } else {
            break;
        }

        i++;
    }
    
    return data;
}