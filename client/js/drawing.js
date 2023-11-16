document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    
    const BACKGROUND_COLOR = "#cccccc";

    function clearScreen() {
        const { width, height } = canvas.getBoundingClientRect(); 

        ctx.fillStyle = BACKGROUND_COLOR;
        ctx.fillRect(0, 0, width, height);
    }

    function draw() {
        clearScreen();
    }

    // 60 fps
    window.setInterval(draw, 17);
});