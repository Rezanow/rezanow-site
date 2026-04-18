const fs = require('fs');
const text = fs.readFileSync('CourseOfTemptation.html', 'utf8').split('\n');

for (let i = 0; i < text.length; i++) {
    if (text[i].includes('set $proposeddate')) {
        console.log(`${i+1}: ${text[i].trim()}`);
    }
}
