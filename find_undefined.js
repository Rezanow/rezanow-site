const fs = require('fs');
const html = fs.readFileSync('CourseOfTemptation.html', 'utf8');

const regex = /<tw-passagedata[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/tw-passagedata>/g;
let match;
while ((match = regex.exec(html)) !== null) {
    const name = match[1];
    let content = match[2];

    // Check where $proposeddate is set
    if (content.includes('$proposeddate')) {
         if (!content.includes('set $proposeddate to')) {
              console.log(name);
         }
    }
}
