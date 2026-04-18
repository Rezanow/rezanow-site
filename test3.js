const fs = require('fs');
let html = fs.readFileSync('CourseOfTemptation.html', 'utf8');

const regex = /<tw-passagedata[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/tw-passagedata>/g;
let match;
while ((match = regex.exec(html)) !== null) {
    const name = match[1];
    let content = match[2];

    if (name === "PhoneText") {
        console.log("found PhoneText");
    }
}
