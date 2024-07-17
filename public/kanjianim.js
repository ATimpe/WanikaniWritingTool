window.onload = function() {
    const kanjiSVGs = document.getElementsByClassName("kanjiVG");
    console.log(kanjiSVGs);

    for (i = 0; i < kanjiSVGs.length; i++) {
        var charCode = kanjiSVGs.item(i).id.charCodeAt(0).toString(16);
        console.log(charCode);

        // The char codes for the svg files are 5 characters long with leading zeros
        while (charCode.length < 5) charCode = "0" + charCode;
        displaySVG(kanjiSVGs.item(i), charCode);
    }
};

function displaySVG(kanjiSVG, charCode) {
    fetch(`/kanjivg/${charCode}.svg`)
        .then(response => response.text())
        .then(svgText => {
            kanjiSVG.innerHTML = svgText;

            new KanjivgAnimate('.kanjiVG');
        })
        .catch(error => {
            console.error('Error fetching SVG:', error);
        });
}