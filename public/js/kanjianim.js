window.onload = function() {
    load();
};

function load() {
    const kanjiSVGs = document.getElementsByClassName("kanjiVG");
    //console.log(kanjiSVGs);
    let vgElement;

    for (i = 0; i < kanjiSVGs.length; i++) {
        var charCode = kanjiSVGs.item(i).id.charCodeAt(0).toString(16);

        // The char codes for the svg files are 5 characters long with leading zeros
        while (charCode.length < 5) charCode = "0" + charCode;
        displaySVG(kanjiSVGs.item(i), charCode);
        //console.log(charCode);
    }
}

function displaySVG(kanjiSVG, charCode) {
    fetch(`/kanjivg/${charCode}.svg`)
        .then(response => response.text())
        .then(svgText => {
            //const template = document.createElement('template');
            //template.innerHTML = svgText;
            let svgDOM = new DOMParser().parseFromString(svgText, "image/svg+xml");

            // Changes the styling of the SVG
            // TODO: Maybe find a way to put this into a css file
            let strokeElement = svgDOM.getElementById(`kvg:StrokePaths_${charCode}`);
            //strokeElement.style.stroke = "#FF0000";

            //console.log(svgDOM.documentElement);
            kanjiSVG.innerHTML = svgDOM.documentElement.innerHTML;

            new KanjivgAnimate('.kanjiVG');
        })
        .catch(error => {
            console.error('Error fetching SVG:', error);
        });
}