const url = "http://127.0.0.1:8090/";

function onClick() {
    fetch(url + "r?max=100").then(response => console.log(response));
}

function onReady() {
    
}

document.addEventListener("DOMContentLoaded", onReady);
    