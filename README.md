# WaniKani Stroke Order

This is a local web application made to help with giving additional quizes for WaniKani users for writing kanji. At the moment, WaniKani has no services that assist in writing the kanji taught there. This app's goal is to provide writing tutorials and quizes alongside WaniKani using WaniKani's API

# Instalation

This app requires Node.JS which can be downloaded here: https://nodejs.org

Download the lastest version of the app. Run the `start.bat` script or type `npm start` into your console while in the directory.

To access a WaniKani API token, go to https://www.wanikani.com and then to Setting > API tokens. Click `Generate New Token` at the bottom. Add a description for the token (you can just call it WanikaniStrokeOrder or something like that). You don't need to select any of the permissions, this app should not make changes yo your WaniKani account. Then hit `Generate token` and it should give it to you. This is what you will use to access this app's features.

# Curent State

The app is, at the moment, in a very bare bones state. There is currently a very bare bones SRS system where you can learn the writings of Kanji and then be tested on them over time, similar to Wani Kani's SRS system

# Planned Features
- Static stroke order diagrams
- Clean and readable webpage design
- Alternate kanji writings
- Information on individual kanji writings

# Credits

This app makes use of stroke order diagrams provided by KanjiVG. You can find them here: https://kanjivg.tagaini.net/
Animated stroke diagrams use KanjiVGAnimate which can be found here: https://github.com/nihongodera/kanjivganimate
