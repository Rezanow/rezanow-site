const fs = require('fs');
const html = fs.readFileSync('CourseOfTemptation.html', 'utf8');

const regex = /<tw-passagedata[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/tw-passagedata>/g;
let match;
while ((match = regex.exec(html)) !== null) {
    const name = match[1];
    let content = match[2];

    // Find all accesses
    let accesses = [...content.matchAll(/\$proposeddate\.(time|daytime|endtime|type|location)/g)];

    if (accesses.length > 0) {
        // Find if it was assigned here
        let inits = [...content.matchAll(/<<set \$proposeddate to/g)];
        let maybeinits = [...content.matchAll(/<<set \$proposeddate /g)];

        let minAccess = Math.min(...accesses.map(a => a.index));
        let minInit = inits.length > 0 ? Math.min(...inits.map(i => i.index)) : Infinity;

        if (minInit > minAccess) {
             console.log(`Passage uses $proposeddate fields before init: ${name}`);
        }
    }
}
