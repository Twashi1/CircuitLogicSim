const app = require("./app")

const PORT = 8090;

app.app.listen(PORT, () => {
    console.log(`Started at 127.0.0.1:${PORT}`)
});