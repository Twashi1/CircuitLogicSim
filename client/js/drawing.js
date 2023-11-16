document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    
    const BACKGROUND_COLOR = "#cccccc";

    function clearScreen() {
        const { width, height } = canvas.getBoundingClientRect(); 

        ctx.fillStyle = BACKGROUND_COLOR;
        ctx.fillRect(0, 0, width, height);
    }

    /*
    Expecting following fields for each circuit:
    logicalRepresentation : CIRCUIT_REPRESENTATION,
    name : str,
    inputLabels : str,
    outputLabels : str,
    color : str,
    position : [num, num],
    links: [
        {"circuit": circuitIndex},
        {"input": inputIndex},
        {"output": outputIndex}
    ]
    */

    let circuits = [];
    function drawCircuits() {

    }

    function draw() {
        clearScreen();
    }

    // 60 fps
    window.setInterval(draw, 17);
});