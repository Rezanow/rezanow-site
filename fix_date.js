const fs = require('fs');
let html = fs.readFileSync('CourseOfTemptation.html', 'utf8');

// For InPersonDialogueHangoutPlanningTime
html = html.replace(`<<gethangoutactivities>>
<<set _activityinfo to _activities[$proposeddate.activity]>>`,
`<<if !$proposeddate>>
    <<set $proposeddate to {type: "hangout", partner: $eventnpc}>>
<</if>>
<<gethangoutactivities>>
<<set _activityinfo to _activities[$proposeddate.activity]>>`);

// For InPersonDialogueHangoutPlanning
html = html.replace(`<<gethangoutactivities>>

<<for _choice range Object.keys(_activities)>>`,
`<<if !$proposeddate>>
    <<set $proposeddate to {type: "hangout", partner: $eventnpc}>>
<</if>>
<<gethangoutactivities>>

<<for _choice range Object.keys(_activities)>>`);

// For InPersonDialogueConfessCrushDate
html = html.replace(`<<gethangoutactivities>>
<<set _valid to []>>`,
`<<if !$proposeddate>>
    <<set $proposeddate to {type: "date", partner: $eventnpc}>>
<</if>>
<<gethangoutactivities>>
<<set _valid to []>>`);

fs.writeFileSync('CourseOfTemptation.html', html, 'utf8');
