const fs = require('fs');
let html = fs.readFileSync('CourseOfTemptation.html', 'utf8');

html = html.replace(`    <<set _choice to setup.randomchoice(_valid)>>
    <<set _activityinfo to _activities[_choice]>>
    <<set $proposeddate.activity to _choice>>`,
`    <<set _choice to setup.randomchoice(_valid)>>
    <<set _activityinfo to _activities[_choice]>>
    <<if !$proposeddate>>
        <<set $proposeddate to {type: "hangout", partner: _p}>>
    <</if>>
    <<set $proposeddate.activity to _choice>>`);

fs.writeFileSync('CourseOfTemptation.html', html, 'utf8');
